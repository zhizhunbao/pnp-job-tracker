"""
ircc 域:联邦开放数据(学签/工签存量、NPR 刻度、分省临时居民、PGWP 规则、官方规费)。
只刷 raw+processed 不灌库 —— build 角色每轮 11_build_stats 读 processed/difficulty.json 挂进 mart。
配额表 raw/ircc/pnp_allocations.json = 人工核对维护表(年度公告后手改,Frank 抽查制),本域不动它。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/ircc/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "ircc",
    "method": "httpx",
    "interval": 86400,         # 日更当兜底(#128:官方月度发布,小时抓纯空转;批2 误写月更,2026-08-31 批F 修回)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
}
