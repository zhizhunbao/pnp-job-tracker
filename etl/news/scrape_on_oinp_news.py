"""scrape_on_oinp_news — 安大略 OINP「Updates」页(ontario.ca,年度页)。

E6-04 抽选抓取已用同页;结构:h2=月 → h3=日期 → h4=条目标题(多数带锚点 id)→ 段落
(内含 h5/h6 小节)。以 h4 为条目粒度(同一天可有多条),日期取前置最近的 h3;
锚点用 h4 自带 id(#april30-0),缺 id 才合成。bodyEn 就地取自本页。
⚠️ 年度页:2027 年 URL 会换(…/2027-ontario-…),届时只改 LIST_URL 一行。
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _scrape_base import iso_date, section_body, slugify  # noqa: E402

LIST_URL = "https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates"


def parse_on(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup.body
    items = []
    for h4 in main.find_all("h4"):
        title = re.sub(r"\s+", " ", h4.get_text(" ", strip=True))
        prev_h3 = h4.find_previous("h3")
        date = iso_date(prev_h3.get_text(" ", strip=True)) if prev_h3 else None
        body = section_body(h4, stop_names=("h4", "h3", "h2"))
        if not (title and date and body):
            continue
        anchor = h4.get("id") or f"{date}-{slugify(title)}"
        items.append({"title": title, "date": date, "url": f"{LIST_URL}#{anchor}",
                      "bodyEn": body})
    return items


SOURCE = {
    "region": "ON",
    "list_url": LIST_URL,
    "kind": "html",
    "parse": parse_on,
    "citation": LIST_URL,
}
