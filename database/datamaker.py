import json
import pathlib

from config import config
from neo4j import GraphDatabase


class Neo4jDriver:
    """
    Neo4j 数据库驱动封装
    """

    def __init__(self):
        self._driver = GraphDatabase.driver(config.uri, auth=(config.user, config.password))

    def close(self):
        if self._driver:
            self._driver.close()

    def execute_query(self, query: str, parameters: dict[str, any] = None) -> list[dict[str, any]]:
        """
        执行 Cypher 查询并返回字典列表

        :param query: Cypher 查询语句
        :param parameters: 查询参数 (可选)
        :return: 包含查询结果的字典列表
        """

        if not self._driver:
            raise Exception("Driver not initialized")

        with self._driver.session() as session:
            result = session.run(query, parameters)
            return [record.data() for record in result]


def validate_and_clean_nodes(nodes):
    """
    验证并清理节点数据，确保每个节点都有有效的 id、label 和 attributes 字段
    """
    cleaned_nodes = []
    for node in nodes:
        # 检查是否是有效的节点对象
        if not isinstance(node, dict):
            print(f"⚠️ 跳过非字典类型的节点: {node}")
            continue

        # 检查是否缺少必要的字段
        if 'id' not in node or node.get('id') is None or node.get('id') == '':
            print(f"⚠️ 跳过缺少有效 id 的节点: {node}")
            continue

        # 确保所有必要字段都存在
        if 'label' not in node:
            node['label'] = 'Unknown'
        if 'attributes' not in node:
            node['attributes'] = {}

        # 确保 attributes 是字典类型
        if not isinstance(node['attributes'], dict):
            node['attributes'] = {}

        cleaned_nodes.append(node)

    return cleaned_nodes


def validate_and_clean_edges(edges):
    """
    验证并清理边数据，确保每个边都有有效的 source、target 和 relation 字段
    """
    cleaned_edges = []
    for edge in edges:
        # 检查是否是有效的边对象
        if not isinstance(edge, dict):
            print(f"⚠️ 跳过非字典类型的边: {edge}")
            continue

        # 检查是否缺少必要的字段
        if 'source' not in edge or edge.get('source') is None or edge.get('source') == '':
            print(f"⚠️ 跳过缺少有效 source 的边: {edge}")
            continue

        if 'target' not in edge or edge.get('target') is None or edge.get('target') == '':
            print(f"⚠️ 跳过缺少有效 target 的边: {edge}")
            continue

        if 'relation' not in edge or edge.get('relation') is None or edge.get('relation') == '':
            print(f"⚠️ 跳过缺少有效 relation 的边: {edge}")
            continue

        cleaned_edges.append(edge)

    return cleaned_edges


def remove_isolated_nodes(db):
    """
    删除没有关系连接的孤立节点
    """
    query = """
    MATCH (n:Entity)
    WHERE NOT (n)--()
    DETACH DELETE n
    RETURN count(n) AS deleted_count
    """
    result = db.execute_query(query)
    deleted_count = result[0]['deleted_count'] if result else 0
    print(f"🗑️ 删除了 {deleted_count} 个孤立节点")
    return deleted_count


if __name__ == "__main__":
    db = Neo4jDriver()
    file_path = pathlib.Path("./assets/final_knowledge_graph_results.jsonl")

    try:
        db.execute_query("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE")
        print("✅ 约束已创建")
    except Exception as e:
        print(f"⚠️ 创建约束时警告 (可能已存在): {e}")

    with open(file_path, "r", encoding="utf-8") as file:
        for line_num, line in enumerate(file, 1):
            try:
                data = json.loads(line.strip())

                # 验证并清理节点数据
                nodes = data.get("nodes", [])
                cleaned_nodes = validate_and_clean_nodes(nodes)

                node_query = """
                UNWIND $nodes AS row
                MERGE (n:Entity {id: row.id})
                SET n.name = row.id,
                    n.label = row.label
                WITH n, row
                CALL apoc.create.addLabels(n, [row.label]) YIELD node
                SET n += coalesce(row.attributes, {})
                RETURN count(n) AS cnt
                """
                db.execute_query(node_query, {"nodes": cleaned_nodes})

                # --- 步骤 2: 处理关系 ---
                edges = data.get("edges", [])
                cleaned_edges = validate_and_clean_edges(edges)

                rel_query = """
                UNWIND $edges AS row
                MATCH (from:Entity {id: row.source})
                MATCH (to:Entity {id: row.target})
                MERGE (from)-[rel:REL {type: row.relation}]->(to)
                RETURN count(rel) AS cnt
                """
                db.execute_query(rel_query, {"edges": cleaned_edges})

                print(f"✅ 第 {line_num} 行数据导入成功 (处理了 {len(cleaned_nodes)} 个节点, {len(cleaned_edges)} 个关系)")

            except Exception as e:
                print(f"❌ 第 {line_num} 行数据导入失败: {e}")
                continue

    # 删除孤立节点
    print("正在删除孤立节点...")
    remove_isolated_nodes(db)

    db.close()
    print("🎉 全部数据导入完成")
