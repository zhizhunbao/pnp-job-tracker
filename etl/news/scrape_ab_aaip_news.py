"""scrape_ab_aaip_news — 阿尔伯塔 AAIP「Updates」页(alberta.ca/aaip-updates)。

P0 2026-07-18 实测 200。单页日期段落式,条目自述性最好:h3.goa-title = 「日期: 标题」
(class 选择器天然避开页面里混着的全政府新闻挂件 goa-news listings);正文=后续兄弟
节点(goa-text 容器)直到下一 h3/h2。无逐条 URL → 锚点合成;bodyEn 就地取自本页。
页面带 2020-2025 陈年更新,母脚本 MAX_AGE_DAYS 窗口自动滤掉。
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _scrape_base import iso_date, section_body, slugify  # noqa: E402

LIST_URL = "https://www.alberta.ca/aaip-updates"


def parse_ab(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for h3 in soup.select("h3.goa-title"):
        head = re.sub(r"\s+", " ", h3.get_text(" ", strip=True))
        date = iso_date(head)
        title = head.split(":", 1)[1].strip() if ":" in head else head
        body = section_body(h3, stop_names=("h3", "h2"))
        if not (date and title and body):
            continue
        items.append({"title": title, "date": date, "url": f"{LIST_URL}#{date}-{slugify(title)}",
                      "bodyEn": body})
    return items


SOURCE = {
    "region": "AB",
    "list_url": LIST_URL,
    "kind": "html",
    "parse": parse_ab,
    "citation": LIST_URL,
}
