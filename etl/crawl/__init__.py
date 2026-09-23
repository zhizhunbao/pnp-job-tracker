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
import os

BROWSER_CHANNEL = os.environ.get("BROWSER_CHANNEL", "")
"""get_browser_page 起哪个浏览器:空串 = playwright 自带 chromium(容器);"chrome" = 系统 Chrome(本机)。
2026-09-13 实撞:共享 profile 被 Chrome 151/152 打开过(09-09 Frank 亲手点验证 + hireac 探路),
自带 chromium(1234 版)再开报 profile 降级 exit 33 —— 本机跑登录源(hireac)必须 BROWSER_CHANNEL=chrome;
容器里 Linux 无 Chrome 仍走自带 chromium。真解法(升 playwright 或本机也改系统 Chrome)待 Frank 拍。"""

BROWSER_COOKIES = os.environ.get("BROWSER_COOKIES", "")
"""get_browser_page 的 cookie 模式开关:空串 = 照旧开持久 profile;非空 = PROFILE_DIR 下的 cookie 文件名 ——
不开持久 profile,起一个干净浏览器,把文件里的明文 cookie 加载进去。
2026-09-15 hireac 进容器(Frank「docker 本身不是能装浏览器吗 有头的 把凭证复制进去不就行了么」):共享 profile 里的
cookie 是 Windows Chrome 用本机账户密钥加密的,容器里 Linux chromium 读得到文件解不开;改由 Windows 端登录后
导出明文 cookie(hireac --only export),容器加载。实测容器加载后 3.2 秒进到 HireAC 岗位列表页。"""

BROWSER_UNATTENDED = os.environ.get("BROWSER_UNATTENDED", "") == "1"
"""无人值守开关(= 1 才开;2026-09-22 Frank「专门弄个本地服务 我来处理这些问题」):容器里的有头浏览器画在
Xvfb 虚拟屏上,没有人点得到验证框,原先照本机口径干等 120 秒必然超时(findsite 容器 48 小时撞 30 次、白等近 1 小时)。
开着时验证页只等 CHALLENGE_UNATTENDED_MS(留给不用点、自己会放行的那种),过不去就交还调用方(fetch_browser 的
challenged),由调用方记进待放行清单、Frank 在本机放行台统一过;本机不设,照旧等人点。"""

META = {
    "role": "crawl",
    "method": "httpx",
    "interval": 3600,          # 1h(2026-08-03 Frank 拍板)
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
}
