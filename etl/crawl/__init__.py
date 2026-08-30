"""
crawl 域:官方移民站定时 URL 探索 + 站点地图 diff(政策雷达)+ 页面缓存正门。

只产 data/crawl/(manifest + changes + html_cache),不进 raw/mart 不灌库;
想要什么数据先 grep data/crawl/<slug>/manifest.json,禁止手搓 httpx 猜路径(2026-08-03 铁律)。
17 种子 = 九省 + QC + 三地区 + 联邦五案;PE/NU 已知盲区(墙硬),留种子每轮试。
2026-08-30 全溶五件(Frank:「crawl 也照 fetch 这样溶了」):正门 = crawl.functions 的
get_cached_page(读缓存)与 convert_md(HTML→md 现转);与 fetch 的分工 —— fetch 拿
已知 URL,crawl 探未知 URL。基础设施双重身份:域可引(INFRA),自身也进形制闸扫描。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/crawl/main.py。
"""
META = {
    "role": "crawl",
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-03 Frank 拍板)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
}
