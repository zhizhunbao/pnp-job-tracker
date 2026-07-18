"""news 源:官方移民新闻聚合(E12-06,#55 母/子脚本框架首个原生样板)。

母脚本 etl/_scrape_base.py 驱动子源(IRCC Atom + BC/AB/MB/NS/ON 官方页,P0 2026-07-18
逐源实测清单见 implementation/E12/06 §4)→ raw/news/news.json 按 URL 累积去重;
新增条目直调 Anthropic(haiku)产出中文全文翻译+速读随行存 = 幂等缓存
(ANTHROPIC_API_KEY 未设只抓原文,key 到位后下轮自动补翻)。
**只刷 raw 不灌库**(同 pnp 源惯例)—— build 角色每轮 09→seed 消费(P1b 接 mart/news)。
逐子源 try/except 隔离:一省源改版只丢该省,抓挂了旧数据还在。
"""
META = {
    "method": "httpx",
    "interval": 43200,         # 12h:官方公告频率低,再快也只是空转(SCRAPE_INTERVAL 可覆盖)
    "seed": False,             # 只刷 raw,build 角色统一灌库(避免抢 mart/seed)
    "steps": [
        ["python", "etl/news/scrape_immigration_news.py"],
    ],
}
