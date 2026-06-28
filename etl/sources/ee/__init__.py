"""ee 源:联邦 Express Entry「类别抽选」清单刷新(全国单一源,与 PNP 是两条不同路)。

`_fetch_ee_categories.py` 走 **chromium**(canada.ca/Akamai 反爬,httpx 吃 403)→ 展开 DataTables
全部分页 → 抽 9 类 ~94 NOC → `raw/ee/federal-categories.json`。**只刷 raw,不灌库** —— build 角色每轮
08→09→seed 目录驱动消费(08 读 raw/ee)。
**镜像 = crawl(playwright chromium)**,不是 httpx。`BROWSER_HEADLESS=1` 走**无头**(实测 canada.ca
无头+stealth 直接通,无需显示器)。真过不去的挑战:browser_fetch 轮询等 120s 超时跳过、保留旧表。
"""
META = {
    "method": "crawl",         # 对应 docker/etl/crawl/ 重镜像(playwright + xvfb 有头浏览器)
    "interval": 2592000,       # 月更:EE 类别定义极少变(SCRAPE_INTERVAL 可覆盖)
    "seed": False,             # 只刷 raw,build 角色统一灌库
    "steps": [
        ["python", "etl/crawl/_fetch_ee_categories.py"],
    ],
}
