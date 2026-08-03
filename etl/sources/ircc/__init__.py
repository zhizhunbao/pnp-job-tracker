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
        # StatCan 非永久居民占比(2026-08-03 接入,Frank「政府说要降到 5% 以下,现在是多少了」):
        # 联邦「临时人口降到 5%」目标的唯一可核验刻度,也是各省配额被砍的上游原因。
        # 不在 IRCC 口径里(IRCC 不发分母),故单独一步走 StatCan WDS(免密钥,季度发布 + 会修订前序季度)。
        ["python", "etl/scrape_statcan_npr.py"],
        ["python", "etl/clean/04e_difficulty.py"],
    ],
}
