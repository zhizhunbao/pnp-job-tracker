"""scrape_mb_mpnp_news — 曼尼托巴 MPNP 官方新闻(immigratemanitoba.com)。

站点是 WordPress,自带 RSS(P0 2026-07-18 实测 200/10 items)——feed 类子源零 parse。
RSS description 是截断摘要,母脚本抓条目详情页补全文(entry-content)+ og:image。
"""
SOURCE = {
    "region": "MB",
    "list_url": "https://immigratemanitoba.com/feed/",
    "kind": "rss",
    "citation": "https://immigratemanitoba.com/news/",
    "body_selector": "div.entry-content",   # WordPress 正文容器(默认 main 会混入侧栏)
}
