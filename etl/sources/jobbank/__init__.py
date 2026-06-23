"""jobbank 源:httpx 抓 Job Bank 全国全职业。

现有 05/05b 脚本暂不动,这里只声明「跑哪些步 + method + 频率」。
后续按框架迁移时,把抓取拆进本目录 scrape.py、解析拆进 clean.py(见 docs/source-framework.md)。
"""
import os

SINCE_DAYS = os.environ.get("SINCE_DAYS", "3")

META = {
    "method": "httpx",       # 对应 docker/etl/httpx/ 镜像
    "interval": 7200,        # 2h 默认(SCRAPE_INTERVAL 可覆盖)
    "seed": False,           # 抓取源只刷 raw,不灌库
    "steps": [
        ["python", "etl/05_scrape_jobbank.py", "--all-occupations", "--prov", "ALL", "--since-days", SINCE_DAYS],
        ["python", "etl/05b_scrape_jobbank_details.py"],
    ],
}
