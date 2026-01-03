import json
import os
import requests
from dotenv import load_dotenv

# 1. 加载环境变量
load_dotenv()
API_KEY = os.getenv("DS_API")
if not API_KEY:
    raise EnvironmentError("请在 .env 文件中设置 DS_API")

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
MODEL_NAME = "deepseek-chat"

# 2. 定义目标数据结构 (Schema)
# 我们要求模型返回一个包含 "nodes" 和 "edges" 的 JSON
GRAPH_SCHEMA = {
    "nodes": [
        {
            "id": "实体唯一标识(通常是名称)",
            "label": "实体类型(如: 药物, 化学成分, 疾病, 经络, 药用部位)",
            "attributes": {
                "描述": "实体的固有属性键值对。例如：{'颜色': '黄色', '熔点': '140℃', '用量': '0.15-0.35g', '味道': '苦'}"
            }
        }
    ],
    "edges": [
        {
            "source": "起点实体ID",
            "target": "终点实体ID",
            "relation": "关系名称(如: 含有成分, 治疗, 归属于, 检测使用)"
        }
    ]
}

# 3. 核心提取函数
def extract_knowledge_graph(text):
    system_prompt = (
        "你是一个中药知识图谱构建专家。请从文本中提取实体(Nodes)、属性(Attributes)和关系(Edges)。"
        "严格区分【属性】和【关系】："
        "1. 属性(Attributes)：描述实体自身的特征值（如颜色、性状、数值、产地、具体的理化指标）。"
        "2. 关系(Edges)：连接两个独立实体的动作（如'治疗'连接药物与疾病，'含有'连接药物与成分）。"
        "请直接输出合法的 JSON，不要包含 Markdown 代码块。"
    )

    user_prompt = f"""
### 任务目标
分析以下中药药典文本，构建知识图谱结构。

### 目标 Schema
{json.dumps(GRAPH_SCHEMA, ensure_ascii=False, indent=2)}

### 提取规则
1. **主实体**：如果是复方或药物，将其作为核心节点（如"人工牛黄"）。
2. **属性提取**：
   - 将“性状”（如颜色、形状）、“用法用量”（数值）、“理化常数”（如熔点、水分限制）作为主实体的 `attributes`。
3. **关系提取**：
   - [药物] -> 含有 -> [化学成分]
   - [药物] -> 治疗 -> [疾病/症状]
   - [药物] -> 归属于 -> [经络]
   - [药物/成分] -> 检测使用 -> [试剂] (如薄层色谱法中用到的试剂)
4. **附录处理**：文本中包含附录（如胆红素、胆酸），请也将它们提取为独立的 Node，并提取它们各自的属性（如熔点）。

### 待处理文本
{text}
"""

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.0,  # 设为0以保证结果确定性
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    try:
        print("正在请求 DeepSeek API 进行知识抽取...")
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)
        
    except requests.exceptions.RequestException as e:
        print(f"请求失败: {e}")
        return None
    except json.JSONDecodeError:
        print("JSON 解析失败，模型可能输出了非 JSON 格式。")
        print("原始内容:", content)
        return None

# 4. 测试数据 (人工牛黄及其附录)
input_text_full = """
人工牛黄
本品由牛胆粉、胆酸、猪去氧胆酸、牛磺酸、胆红素、胆固醇、微量元素等加工制成。
【性状】本品为黄色疏松粉末。味苦，微甘。
【检查】水分不得过5.0%。
【性味与归经】甘，凉。归心、肝经。
【功能与主治】清热解毒，化痰定惊。用于痰热谵狂，神昏不语，小儿急惊风，咽喉肿痛，口舌生疮，痈肿疔疮。
【用法与用量】一次0.15～0.35g，多作配方用。外用适量敷患处。
【贮藏】密封，防潮，避光，置阴凉处。

附：1．胆红素
[性状]本品为橙色至红棕色结晶性粉末。
[鉴别]最大吸收为453nm。
[检查]干燥失重...减失重量不得过1.0%。
2．胆固醇
[性状]本品为白色、类白色结晶或结晶性粉末。
熔点本品的熔点不得低于140℃。
"""

# 5. 运行主程序
if __name__ == "__main__":
    result = extract_knowledge_graph(input_text_full)
    
    if result:
        # 为了方便查看，打印格式化的 JSON
        print("\n" + "="*20 + " 抽取结果 " + "="*20)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
        # 简单统计
        node_count = len(result.get('nodes', []))
        edge_count = len(result.get('edges', []))
        print(f"\n抽取统计: 节点数 {node_count}, 关系数 {edge_count}")
        
        # 演示如何访问属性
        print("\n--- 属性访问示例 ---")
        for node in result['nodes']:
            if "attributes" in node and node["attributes"]:
                print(f"实体: {node['id']} | 属性: {node['attributes']}")