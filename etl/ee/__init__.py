"""
ee 域:联邦 Express Entry「类别抽选」清单 + 抽选轮次(全国单一源,与 PNP 两条路)。
只刷 raw 不灌库 —— build 角色每轮 08→09→seed 目录驱动消费(08 读 raw/ee)。
回退:源站若重新上 Akamai(解析空保留旧表打 ⚠)→ 换回 crawl 域回退工具(python etl/crawl/main.py --only ee_categories)。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/ee/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "ee",
    "method": "httpx",
    "interval": 2592000,       # 月更:EE 类别定义极少变
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
}
