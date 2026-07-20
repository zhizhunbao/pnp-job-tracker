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
        # 抓取只存原始 HTML 快照;解析下沉 clean → processed(源框架 v2)
        # #118:max-pages 默认 15 在周末积压+周一补抓时截断 ON/QC(3 天量>15 页)→ 显式放大;
        # 翻页由 cutoff 日期自然停,上限只当失控保险(60 页×25≈1500 帖/省 头部空间)
        ["python", "etl/05_scrape_jobbank.py", "--all-occupations", "--prov", "ALL", "--since-days", SINCE_DAYS, "--max-pages", "60"],
        ["python", "etl/clean/05_parse_jobbank.py", "--since-days", SINCE_DAYS],
        ["python", "etl/05b_scrape_jobbank_details.py"],
        ["python", "etl/clean/05b_parse_details.py"],
    ],
}
