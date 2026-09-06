"""
ircc 域:联邦开放数据(学签/工签存量、PGWP 规则、官方规费、省移民难度指数)。
只刷 raw+processed 不灌库 —— build 角色每轮 11_build_stats 读 processed/difficulty.json 挂进 mart。
配额表 raw/ircc/pnp_allocations.json = 人工核对维护表(年度公告后手改,Frank 抽查制),本域不动它。
⚠ 2026-09-06:「NPR 刻度」与「分省临时居民」两段搬去 statcan 域(那是 StatCan 的表,不是 IRCC
开放数据)。**产物路径不动**:npr_share.json / statcan_tr_prov.json 仍落在 raw/ircc/ 下,
本域段7 的难度指数照旧读后者;它们的保鲜条目改由 statcan 域 META 按文件声明
(file 行压过本域的 glob 行,见 sched.fresh_rows),本域不再替它们担新鲜度。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/ircc/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "ircc",
    "method": "httpx",
    "interval": 86400,         # 日更当兜底(#128:官方月度发布,小时抓纯空转;批2 误写月更,2026-08-31 批F 修回)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
    "fresh": [      # 保鲜契约(2026-08-31 批O:source_manifest 退役,行原样搬入;语义见 sched.K_FRESH)
        {"glob": "raw/ircc/*.json", "cadence_days": 4},
        {"file": "raw/ircc/pnp_allocations.json", "cadence_days": 60, "key": "checkedAt",
         "note": "人工核对表(配额)"},
    ],
}
