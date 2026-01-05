import json
import os
import requests
import time
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
            "label": "实体类型(如: 药物名称, 化学成分, 实验试剂与材料, 中药药性, 经络, 疾病, 功效等)",
            "attributes": {
                "描述": "实体的固有属性键值对。例如：{'颜色': '黄色', '用量': '0.15-0.35g', '味道': '苦'}"
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
1. **主实体**：药名标题（如：一枝黄花、丁香、人参）。无需提取植物来源作为node。
2. **属性提取**：
   - 将“性状”（如颜色、形状）、“用法用量”（数值）、“理化常数”（如熔点、水分限制）作为主实体的 `attributes`。
3. **关系提取**：
   - [药物] -> 含有 -> [化学成分]
   - [药物] -> 治疗 -> [疾病/症状]
   - [药物] -> 归属于 -> [经络]
   - [药物/成分] -> 检测使用 -> [试剂] (如薄层色谱法中用到的试剂)
   - 等等

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

# 5. 运行主程序
# if __name__ == "__main__":
#     result = extract_knowledge_graph(input_text_full)
    
#     if result:
#         # 为了方便查看，打印格式化的 JSON
#         print("\n" + "="*20 + " 抽取结果 " + "="*20)
#         print(json.dumps(result, ensure_ascii=False, indent=2))
        
#         # 简单统计
#         node_count = len(result.get('nodes', []))
#         edge_count = len(result.get('edges', []))
#         print(f"\n抽取统计: 节点数 {node_count}, 关系数 {edge_count}")
        
#         # 演示如何访问属性
#         print("\n--- 属性访问示例 ---")
#         for node in result['nodes']:
#             if "attributes" in node and node["attributes"]:
#                 print(f"实体: {node['id']} | 属性: {node['attributes']}")

if __name__ == "__main__":
    INPUT_JSON = "./assets/all_herbs_data.json"
    OUTPUT_FILE = "./assets/final_knowledge_graph_results.json"

    if not os.path.exists(INPUT_JSON):
        print(f"找不到输入文件: {INPUT_JSON}")
        exit()

    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        herbs_data = json.load(f)

    print(f"✅ 加载成功，共 {len(herbs_data)} 条药材。")

    # 如果输出文件不存在，先初始化一个空列表的开头
    if not os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write("[\n") 
    
    # 获取已经处理过的药材数量（简单的断点续传逻辑）
    processed_count = 0
    
    # 遍历处理
    for index, herb in enumerate(herbs_data):
        name = herb['name']
        
        # 打印进度
        print(f"[{index + 1}/{len(herbs_data)}] 正在抽取: {name} ...")
        
        result = extract_knowledge_graph(herb['content'])
        
        if result:
            result['source_name'] = name
            
            # 实时写入文件
            with open(OUTPUT_FILE, 'a', encoding='utf-8') as f:
                # 转换成格式化的字符串
                json_str = json.dumps(result, ensure_ascii=False, indent=2)
                # 如果不是第一条，加个逗号
                if index > 0:
                    f.write(",\n")
                f.write(json_str)
            
            print(f"  ✅ 已保存: {name}")
        
        # 频率限制保护
        time.sleep(1)

    # 最后闭合 JSON 数组
    with open(OUTPUT_FILE, 'a', encoding='utf-8') as f:
        f.write("\n]")

    print("-" * 30)
    print(f"🚀 全部任务完成！结果已存入: {OUTPUT_FILE}")