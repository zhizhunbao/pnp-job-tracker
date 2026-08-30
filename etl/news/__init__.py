"""
news 域:官方移民新闻聚合(E12-06,母/子脚本框架首个原生样板)。
母脚本 _scrape_base 驱动子源(IRCC Atom + 省官方页)→ raw/news/news.json 按 URL 累积去重;
新增条目直调 Anthropic(haiku)中文翻译+速读随行存(key 未设只抓原文,下轮自动补翻)。
只刷 raw 不灌库;逐子源 try/except 隔离:一省源改版只丢该省。

META = 域即役的调度声明(2026-08-29 批2):role=挂哪个角色容器(SOURCE 环境变量),
interval=本域一轮的间隔秒;入口固定 etl/news/main.py,步骤清单在 main.py 里。
"""
META = {
    "role": "news",
    "method": "httpx",
    "interval": 43200,         # 12h:官方公告频率低,再快也只是空转
    "seed": False,
    "ping": True,   # 本角色的 healthchecks 心跳由本域发
}
