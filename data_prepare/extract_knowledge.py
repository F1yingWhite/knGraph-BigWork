import concurrent.futures
import json
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from openai import APIError, OpenAI
from tqdm import tqdm

# 1. 加载环境变量
load_dotenv()
API_KEY = os.getenv("DS_API")
if not API_KEY:
    raise EnvironmentError("请在 .env 文件中设置 DS_API")

# 初始化 OpenAI 客户端，指向 DeepSeek API
client = OpenAI(api_key=API_KEY, base_url="https://api.deepseek.com/v1")
MODEL_NAME = "deepseek-chat"

# 2. 定义目标数据结构 (Schema)
# 我们要求模型返回一个包含 "nodes" 和 "edges" 的 JSON
GRAPH_SCHEMA = {
    "nodes": [
        {
            "id": "实体唯一标识(通常是名称)",
            "label": "实体类型(如: 药物名称, 化学成分, 实验试剂与材料, 中药药性, 经络, 疾病, 功效等)",
            "attributes": {"描述": "实体的固有属性键值对。例如：{'颜色': '黄色', '用量': '0.15-0.35g', '味道': '苦'}"},
        }
    ],
    "edges": [
        {"source": "起点实体ID", "target": "终点实体ID", "relation": "关系名称(如: 含有成分, 治疗, 归属于, 检测使用)"}
    ],
}


# 3. 核心提取函数 (带重试逻辑)
def extract_knowledge_graph(text, max_retries=3):
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
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                temperature=0.0,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except APIError as e:
            print(f"请求失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(3)  # 等待3秒后重试
        except json.JSONDecodeError:
            print(f"JSON 解析失败 (尝试 {attempt + 1}/{max_retries})，模型可能输出了非 JSON 格式。")
            # content 在这种情况下可能未定义，所以不打印
            if attempt < max_retries - 1:
                time.sleep(3)

    print("达到最大重试次数，提取失败。")
    return None


def process_herb(herb, output_file, lock):
    name = herb["name"]
    # print(f"正在抽取: {name} ...")

    result = extract_knowledge_graph(herb["content"])

    if result:
        result["source_name"] = name
        # 使用锁确保线程安全地写入文件
        with lock:
            with open(output_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(result, ensure_ascii=False) + "\n")
        return name, True
    return name, False


if __name__ == "__main__":
    INPUT_JSON = "./assets/all_herbs_data.json"
    OUTPUT_FILE = "./assets/final_knowledge_graph_results.jsonl"
    NUM_THREADS = 32

    if not os.path.exists(INPUT_JSON):
        print(f"找不到输入文件: {INPUT_JSON}")
        exit()

    with open(INPUT_JSON, "r", encoding="utf-8") as f:
        herbs_data = json.load(f)
    print(f"✅ 加载成功，共 {len(herbs_data)} 条药材。")

    # --- 断点续传逻辑 ---
    processed_herbs = set()
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    data = json.loads(line)
                    if "source_name" in data:
                        processed_herbs.add(data["source_name"])
                except json.JSONDecodeError:
                    print(f"警告: 发现无法解析的行: {line.strip()}")
        print(f"✅ 已找到 {len(processed_herbs)} 条已处理的记录，将跳过它们。")

    # 过滤掉已经处理过的药材
    herbs_to_process = [herb for herb in herbs_data if herb["name"] not in processed_herbs]
    if not herbs_to_process:
        print("✅ 所有药材都已处理完毕！")
        exit()

    print(f"⏳ 剩余 {len(herbs_to_process)} 条药材待处理。开始多线程抽取...")

    # --- 多线程处理 ---
    file_lock = threading.Lock()
    success_count = 0
    fail_count = 0

    with ThreadPoolExecutor(max_workers=NUM_THREADS) as executor:
        # 使用 futures 字典来跟踪每个 future 对应的 herb
        futures = {executor.submit(process_herb, herb, OUTPUT_FILE, file_lock): herb for herb in herbs_to_process}

        for future in tqdm(concurrent.futures.as_completed(futures), total=len(herbs_to_process), desc="抽取进度"):
            name, success = future.result()
            if success:
                success_count += 1
            else:
                fail_count += 1
                herb = futures[future]
                print(f"❌ 提取失败: {herb['name']}")

    print("-" * 30)
    print("🚀 全部任务完成！")
    print(f"  - 成功: {success_count} 条")
    print(f"  - 失败: {fail_count} 条")
    print(f"  - 总计: {len(processed_herbs) + success_count} 条记录已存入: {OUTPUT_FILE}")
