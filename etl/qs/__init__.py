"""
qs 域:QS 世界大学排名·加拿大子集(2026-09-12 Frank「再加上 qs 排名」;官方 topuniversities
排名端点 JSON 直取,专供 dli 表装配 qs_rank 列)。

META = 域即役的调度声明:挂 dli 角色容器(挂车举证:同「学校数据」旗舰②、产出专供 dli 表、
年更小数据不值一容器 —— dli 域原挂 pnp 角色的同款先例);周更足够(QS 一年一版,
nid 每轮从着陆页现探,不写死)。
"""
META = {
    "role": "dli",
    "method": "httpx",
    "interval": 604800,        # 周更(QS 年更,周探为了换榜当周跟上)
    "seed": False,
    "ping": False,
}
