"""ee 源:联邦 Express Entry「类别抽选」清单 + 抽选轮次刷新(全国单一源,与 PNP 是两条不同路)。

2026-07-03 起改 **httpx**(实测 canada.ca 类别页无 Akamai、表格行在原始 HTML 全量,DataTables 只是
前端分页)→ `build_ee_categories.py` 直取解析 9 类 ~94 NOC → `raw/ee/federal-categories.json`;
`build_ee_draws.py` 取 IRCC 开放 JSON → `raw/ee/draws.json`(每类别最近抽选 CRS/日期)。
**只刷 raw,不灌库** —— build 角色每轮 08→09→seed 目录驱动消费(08 读 raw/ee)。
回退:源站若重新上 Akamai(解析空会保留旧表并打 ⚠)→ method 换回 crawl、steps 换回
`etl/crawl/_fetch_ee_categories.py`(浏览器版保留未删)。
"""
META = {
    "method": "httpx",         # 轻镜像(docker/etl/httpx/),无需 playwright/chromium
    "interval": 2592000,       # 月更:EE 类别定义极少变(SCRAPE_INTERVAL 可覆盖)
    "seed": False,             # 只刷 raw,build 角色统一灌库
    "steps": [
        ["python", "etl/build_ee_categories.py"],
        ["python", "etl/build_ee_draws.py"],
        ["python", "etl/build_lmia.py"],   # E6-02:ESDC LMIA 季度数据(月检查,已缓存季度不重下;需镜像含 openpyxl)
    ],
}
