"""
aip 域:大西洋移民计划(AIP)—— 四省官方指定雇主名录 + 申请人门槛库(quote-anchored)。

沿革:2026-08-31 批E 从 pilot 拆出(Frank 拍板「拆成三个 很少有人有法语」,
落地细则见 docs/design/etl分域-20260829.md §7 拍板点 8-④「aip = employers + aip_rules
整体搬,产物路径不动」)。AIP 与 RCIP/FCIP 本就零共享:它是**省指定雇主制**的联邦框架,
社区推荐制那两个域的社区名单/名额状态与它无关 —— 所以本域是整段搬,一个常量没拆。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/aip/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "aip",     # 2026-08-31 批N Frank「一域一容器」:原挂 pnp 角色,拆出自役
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-31 Frank「都改成小时更新也不费劲」;原随 pilot 周更)
    "seed": False,
    "ping": False,  # 报警走 pnp 链尾 freshness 哨兵(盯的是产物文件,跨容器仍有效;批O 重排)
    "fresh": [      # 保鲜契约(2026-08-31 批O:source_manifest 退役,行原样搬入;语义见 sched.K_FRESH)
        {"file": "raw/aip/aip-designated-employers.json", "cadence_days": 7, "key": "mtime",
         "note": "名录是 list 无 fetched(B3-3 未销),先看文件 mtime"},
    ],
}
