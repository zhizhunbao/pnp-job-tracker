"""
dli 域:PGWP 可申 DLI 子集(E12-03,旗舰②学校数据;IRCC 官方 JSON)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/dli/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "dli",     # 2026-08-31 批N Frank「一域一容器」:原挂 pnp 角色,拆出自役
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-31 Frank「都改成小时更新也不费劲」;原周更)
    "seed": False,
    "ping": False,  # 报警走 pnp 链尾 freshness 哨兵(盯的是产物文件,跨容器仍有效;批O 重排)
}
