"""
citations 域:字段级来源注册表(E4-04)—— 逐 URL 验证 citation 落地页存活 + 抽 title/meta 原文,
产 raw/sources/field-sources.json(09 直通进 mart)。

沿革:2026-08-31 批D 从 ops 拆出(Frank 拍板「ops 不算域,拆散归各域」;对照表见
docs/design/etl分域-20260829.md §8)。判据 §7-6「域 = 抓数据」:本件逐个官方着陆页
抓 title/meta 原文落 raw,是抓取域,不是开发工具。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/citations/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "pnp",
    "method": "httpx",
    "interval": 604800,        # 周更(原 ops 役同频,着陆页 title/meta 极少变)
    "seed": False,             # 只刷 raw 注册表,build 角色统一灌库
    "ping": False,  # ping 权在 pnp 角色链尾的 freshness 哨兵(lead 批D 收口拍板),防遮蔽
}
