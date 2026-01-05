import os
import re
import json

def is_chinese(text):
    return bool(re.match(r"^[\u4e00-\u9fa5]{2,15}$", text.strip()))

def is_pinyin(text):
    # 允许包含空格，但主要是字母
    return bool(re.match(r"^[a-zA-Z\s]{2,50}$", text.strip()))

def is_latin(text):
    # 【关键修改】允许大写字母、空格、希腊字母(如Μ, μ)、以及常见的标点
    # \u0370-\u03FF 是希腊字母的编码范围
    return bool(re.match(r"^[A-Z\s\u0370-\u03FF\.,·]{2,100}$", text.strip()))

def process_and_save_json(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"找不到文件: {input_path}")
        return

    with open(input_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = [line.strip() for line in f.readlines()]

    herbs = []
    current_herb = None
    
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line:
            i += 1
            continue

        # 核心逻辑：探测连续三行标题块
        # 检查当前行及后两行是否存在
        if i + 2 < len(lines):
            line1, line2, line3 = lines[i], lines[i+1], lines[i+2]
            
            # 匹配：中文 + 拼音 + 拉丁名
            if is_chinese(line1) and is_pinyin(line2) and is_latin(line3):
                # 如果当前已经有正在记录的药材，先保存它
                if current_herb:
                    herbs.append(current_herb)
                
                # 创建新药材对象
                current_herb = {
                    "name": line1,
                    "pinyin": line2,
                    "latin": line3,
                    "content": line1 + "\n" + line2 + "\n" + line3 + "\n"
                }
                print(f"发现药材: {line1}")
                i += 3 # 跳过这三行标题
                continue
        
        # 如果不是标题块，则属于当前药材的内容
        if current_herb:
            current_herb["content"] += line + "\n"
        
        i += 1

    # 保存最后一个
    if current_herb:
        herbs.append(current_herb)

    # 写入 JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(herbs, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 处理完成！共提取 {len(herbs)} 条药材。")
    print(f"数据已保存至: {output_path}")

if __name__ == "__main__":
    FILE_PATH = r"./assets/2022年中药药典.txt"
    SAVE_PATH = r"./assets/all_herbs_data.json"
    process_and_save_json(FILE_PATH, SAVE_PATH)