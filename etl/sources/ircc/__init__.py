"""ircc 源(E12-07 #116,2026-07-20 Frank:「单独 docker 定时做,不要临时抓」):
IRCC 开放数据月更役——学签/工签年末存量 + PNP 登陆数(open.canada.ca 官方 XLSX,无爬虫对抗)
→ raw/ircc/*.json → 04e 重算难度因子 → processed/difficulty.json。
**只刷 raw+processed,不灌库** —— build 角色每轮 11_build_stats 读 processed/difficulty.json 挂进 mart/stats。
配额表 raw/ircc/pnp_allocations.json = 人工核对维护表(年度公告后手改,Frank 抽查制),本役不动它 ——
但 NS 有省官方开放数据(唯一把配额上开放平台的省)→ scrape_ns_allocations 自动跟新,哨兵与人工表对账。
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
        # 分省季度存量(2026-08-14 竞争卡缺口探索):IRCC 年末停在 2024 后唯一官方分省刻度。
        # 只落 raw 不进 mart(与 IRCC 口径不可混列,消费端待拍);失败自兜底保留旧表,不拦役
        ["python", "etl/scrape_statcan_tr_prov.py"],
        # NS 官方年度配额(Socrata 开放数据,NSNP/AIP 分列):人工配额表 NS 行的对账源
        ["python", "etl/scrape_ns_allocations.py"],
        ["python", "etl/clean/04e_difficulty.py"],
        # B1-4 PGWP 规则库(2026-08-03):quote-anchored 自校(官方引用消失→保留旧表 exit 1)。
        # 硬闸步骤照役规矩钉最末尾,红了拖不到别人;raw/ircc/*.json 的 glob 已让它自动进新鲜度哨兵
        ["python", "etl/build_pgwp.py"],
        ["python", "etl/build_fees.py"],   # G8:联邦段官方规费(段落定位+交叉自校硬闸;拆中介报价的原料)
        # 名额公告哨兵(2026-08-14):grep crawl/news 原文里空缺 (省,年) 的名额句 → 「!」日志提醒。
        # 只提醒不写表(配额表人工核对制);自身任何失败 exit 0 不拦役 → 排最末也拖不到别人
        ["python", "etl/watch_allocations.py"],
    ],
}
