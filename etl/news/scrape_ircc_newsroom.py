"""scrape_ircc_newsroom — IRCC 联邦移民新闻(E12-06 P1 锚点)。

金源 = 加拿大政府新闻 API 的 Atom feed(api.io.canada.ca io-server news v2,机器可读,
P0 2026-07-18 实测 200/50 entries)。feed 类子源零 parse:母脚本 parse_feed 直接消化,
条目 URL 指向 canada.ca 新闻稿页(httpx 可直取,母抓详情补 og:image+正文)。
"""
SOURCE = {
    "region": "federal",
    "list_url": ("https://api.io.canada.ca/io-server/gc/news/en/v2"
                 "?dept=departmentofcitizenshipandimmigration"
                 "&sort=publishedDate&orderBy=desc&pick=30&format=atom&atomtitle=IRCC"),
    "kind": "atom",
    "citation": "https://www.canada.ca/en/immigration-refugees-citizenship/news.html",
}
