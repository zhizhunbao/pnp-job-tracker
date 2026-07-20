"""ircc 源(E12-07 #116,2026-07-20 Frank:「单独 docker 定时做,不要临时抓」):
IRCC 开放数据月更役——学签/工签年末存量 + PNP 登陆数(open.canada.ca 官方 XLSX,无爬虫对抗)
→ raw/ircc/*.json → 04e 重算难度因子 → processed/difficulty.json。
**只刷 raw+processed,不灌库** —— build 角色每轮 11_build_stats 读 processed/difficulty.json 挂进 mart/stats。
配额表 raw/ircc/pnp_allocations.json = 人工核对维护表(年度公告后手改,Frank 抽查制),本役不动它。
"""
META = {
    "method": "httpx",         # 轻镜像(需 openpyxl,ee 同镜像已含)
    "interval": 2592000,       # 月更:IRCC 开放数据月度发布
    "seed": False,             # 只刷 raw/processed,build 角色统一进 mart
    "steps": [
        ["python", "etl/scrape_ircc_stats.py"],
        ["python", "etl/clean/04e_difficulty.py"],
    ],
}
