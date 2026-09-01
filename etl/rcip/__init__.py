"""
rcip 域:乡村社区移民试点(Rural Community Immigration Pilot)—— 14 个乡村社区的
官方名单、指定雇主/优先职业清单、名额状态。

沿革:2026-08-31 批E 从 pilot 拆出(Frank 拍板「拆成三个 很少有人有法语」——
法语是极少数用户的信号,FCIP 单拎让 RCIP 这条主流路径干净;落地细则见
docs/design/etl分域-20260829.md §7 拍板点 8)。**双身份社区 Sudbury, ON 与 Timmins, ON
的抽取器住本域**(拍板点 8-②):IRCC 名单页 Rural 与 Francophone 两节都列它俩,
抽取只做一次,产出行照旧逐行带 RCIP / FCIP / RCIP+FCIP 的 type,fcip 域不重复抽取。

社区名单(communities)仍作为 build 管线步骤跑(05f 旗标依赖它;sources/build 经本域门
`main.py --only communities` 调),本域不重复调度。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/rcip/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "rcip",     # 2026-08-31 批N Frank「一域一容器」:原挂 pnp 角色,拆出自役
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-31 Frank「都改成小时更新也不费劲」;原周更 —— 名单/配额极少变,
                               # 小时更代价只是空转请求,换「满额/新社区 1 小时内上站」)
    "seed": False,
    "ping": False,  # 报警走 pnp 链尾 freshness 哨兵(盯的是产物文件,跨容器仍有效;批O 重排)
}
