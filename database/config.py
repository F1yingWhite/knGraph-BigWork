from pydantic import BaseModel


class Neo4jSettings(BaseModel):
    """
    Neo4j 数据库连接配置模型
    """

    uri: str = "bolt://10.130.128.54:7688"
    user: str = "neo4j"
    password: str = "12345678"

    @staticmethod
    def read_config(file_path: str = "./config.toml") -> "Neo4jSettings":
        from toml import load

        config_data = load(file_path)
        neo4j_config = config_data.get("neo4j", {})
        return Neo4jSettings(**neo4j_config)


config = Neo4jSettings.read_config()
