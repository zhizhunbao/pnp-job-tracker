"""
dli 域:PGWP 可申 DLI 子集(E12-03,旗舰②学校数据;IRCC 官方 JSON)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/dli/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "pnp",
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-31 Frank「都改成小时更新也不费劲」;原周更)
    "seed": False,
    "ping": False,  # ping 权在本角色的指定单元(2026-08-31 批D 起 = pnp 域,链尾 freshness),防遮蔽
}
