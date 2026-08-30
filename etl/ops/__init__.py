"""
ops 域:自查哨兵(定时单元只收「跟着周更节奏」的三只;verify_expired/audit_* 是
build 管线步骤或手动役,不在此重复调度)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/ops/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "pnp",
    "method": "httpx",
    "interval": 604800,        # 周更(哨兵与来源验证;check_freshness 语义=红了不挡人只报警)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
}
