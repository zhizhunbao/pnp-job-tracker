"""ats 源:httpx 抓 Kanata 公司第一方 ATS(04 抓岗 + 04b 抽薪资)。

现有脚本暂不动,这里只声明步骤。频率低(名录变动少)。
"""
META = {
    "method": "httpx",       # 对应 docker/etl/httpx/ 镜像
    "interval": 86400,       # 每天
    "seed": False,
    "steps": [
        ["python", "etl/04_scrape_ats_jobs.py"],
        ["python", "etl/clean/04b_extract_ats_salary.py"],
    ],
}
