"""
fcip 域:法语社区移民试点(Francophone Community Immigration Pilot)—— 6 个法语社区的
官方名单、指定雇主/优先职业清单、名额状态。

沿革:2026-08-31 批E 从 pilot 拆出(Frank 拍板「拆成三个 很少有人有法语」——
法语是**极少数用户**的信号,单拎出来让 RCIP 那条主流路径干净;落地细则见
docs/design/etl分域-20260829.md §7 拍板点 8)。本域的社区名单有 6 行,
但**只抽取纯法语四社区**(Kelowna, BC / Acadian Peninsula, NB / St. Pierre Jolys, MB /
Superior East Region, ON);另两行 Sudbury, ON 与 Timmins, ON 是**双身份社区**,
IRCC 名单页两节都列它俩,抽取器住 rcip 域只抽一次(拍板点 8-②),本域不重复抽取。

社区名单(communities)仍作为 build 管线步骤跑(05f 旗标读两域并集),本域不重复调度。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/fcip/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "pnp",
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-31 Frank「都改成小时更新也不费劲」;原周更,理由同 rcip)
    "seed": False,
    "ping": False,  # ping 权在本角色的指定单元(2026-08-31 批D 起 = pnp 域,链尾 freshness),防遮蔽
}
