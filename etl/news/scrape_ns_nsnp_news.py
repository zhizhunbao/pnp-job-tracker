"""scrape_ns_nsnp_news — 新斯科舍 NSNP/AIP「Program Updates」(liveinnovascotia.com)。

旧域 novascotiaimmigration.com 已 301 到新站(P0 2026-07-18 发现);新站 Drupal,
Program Updates 分类页 = /taxonomy/term/3。列表结构:div.views-row > h2>a(标题+链接)
+ body 字段开头「July 14, 2026 |」带日期。详情页由母脚本抓(og:image+正文)。
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上两级)有 fetch
from fetch.functions import iso_date


def parse_ns(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for row in soup.select("div.views-row"):
        a = row.select_one("h2 a[href]")
        if not a:
            continue
        title = re.sub(r"\s+", " ", a.get_text(" ", strip=True))
        url = a["href"]
        for h2 in row.select("h2"):  # 标题自带生效日(如「…Effective September 1, 2026」)会抢在发布日前被匹配,先摘掉
            h2.extract()
        date = iso_date(row.get_text(" ", strip=True))   # 日期在 body 字段「July 14, 2026 |」
        if title and date:
            items.append({"title": title, "date": date, "url": url})
    return items


SOURCE = {
    "region": "NS",
    "list_url": "https://liveinnovascotia.com/taxonomy/term/3",
    "kind": "html",
    "parse": parse_ns,
    "citation": "https://liveinnovascotia.com/resources",
}
