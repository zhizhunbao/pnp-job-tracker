"""crawl 源:九省官方移民站的**定时 URL 探索 + 站点地图 diff(政策雷达)**。

2026-08-03 Frank 拍板:bfs 探索定时跑,想要什么数据先查 data/crawl/<slug>/manifest.json,
不再手搓 httpx 猜路径(当天教训见《未结问题清单》B4-5)。
新增/消失的 URL 打进日志 + changes.json —— 新页面出现 = 政策可能变了
(BC 2026-06-13 新排除清单静默上线那类事故的第一道网)。

只产 data/crawl/(manifest + changes + html_cache 页面原文缓存),不进 raw/mart,不灌库 ——
数据抽取仍归各役的定向脚本;雷达报新页时先读 html_cache,不用再发请求。
14 种子 = 九省 + QC + 三地区(YT/NT/NU)+ 联邦 RCIP;PE/NU 是已知盲区(墙硬,详见种子注释),
留种子每天试。种子清单与限域说明见 discover_sources.py 文件头。
"""
META = {
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-03 Frank 拍板;compose 同步 3600)
    "seed": False,             # 只产站点地图,不灌库
    "steps": [
        ["python", "etl/crawl/discover_sources.py"],   # 单省失败不拖垮全轮;全挂才 exit 1
    ],
}
