"""
pilot 域:试点家族(AIP/RCIP/FCIP)—— 指定雇主名单、社区清单细节、名额状态。
社区名单 build_pilot_communities 仍作为 build 管线步骤跑(05f 旗标依赖它),本域不重复调度。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/pilot/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "pnp",
    "method": "httpx",
    "interval": 604800,        # 周更:名单/配额极少变
    "seed": False,
    "ping": False,  # ping 权在本角色的指定单元(pnp 角色=ops 哨兵),防遮蔽
}
