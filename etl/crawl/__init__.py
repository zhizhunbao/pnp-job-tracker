"""
crawl 域:九省官方移民站定时 URL 探索 + 站点地图 diff(政策雷达)。
只产 data/crawl/(manifest + changes + html_cache),不进 raw/mart 不灌库;
想要什么数据先 grep data/crawl/<slug>/manifest.json,禁止手搓 httpx 猜路径(2026-08-03 铁律)。
14 种子 = 九省 + QC + 三地区 + 联邦 RCIP;PE/NU 已知盲区(墙硬),留种子每天试。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/crawl/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "crawl",
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-03 Frank 拍板)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
}
