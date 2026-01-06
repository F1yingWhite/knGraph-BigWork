import json
import pathlib

from neo4j import GraphDatabase

from database.config import config


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


if __name__ == "__main__":
    db = Neo4jDriver()
    file_path = pathlib.Path("../assets/1.jsonl")

    try:
        db.execute_query("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE")
        print("✅ 约束已创建")
    except Exception as e:
        print(f"⚠️ 创建约束时警告 (可能已存在): {e}")

    with open(file_path, "r", encoding="utf-8") as file:
        for line_num, line in enumerate(file, 1):
            try:
                data = json.loads(line.strip())
                node_query = """
                UNWIND $nodes AS row
                MERGE (n:Entity {id: row.id})
                SET n.name = row.id,
                    n.label = row.label
                WITH n, row
                CALL apoc.create.addLabels(n, [row.label]) YIELD node
                SET n += row.attributes
                RETURN count(n) AS cnt
                """
                db.execute_query(node_query, {"nodes": data.get("nodes", [])})

                # --- 步骤 2: 处理关系 ---
                rel_query = """
                UNWIND $edges AS row
                MATCH (from:Entity {id: row.source})
                MATCH (to:Entity {id: row.target})
                MERGE (from)-[rel:REL {type: row.relation}]->(to)
                RETURN count(rel) AS cnt
                """
                db.execute_query(rel_query, {"edges": data.get("edges", [])})

                print(f"✅ 第 {line_num} 行数据导入成功")

            except Exception as e:
                print(f"❌ 第 {line_num} 行数据导入失败: {e}")
                continue

    db.close()
    print("🎉 全部数据导入完成")
