"""scrape_bc_pnp_news — BC PNP 官方 News 页(welcomebc.ca)。

P0 2026-07-18 从 PNP hub 页发现真实路径 /about-the-bc-provincial-nominee-program/news
(此前猜测路径全 404)。单页日期段落式:main 下 h2=裸日期,段落跟在后面直到下一 h2;
无逐条 URL → 锚点合成(#日期-标题slug),bodyEn 就地取自本页(母不再抓详情)。
标题:首段内嵌粗体(strong)优先,否则取首句。
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _scrape_base import iso_date, section_body, slugify  # noqa: E402

LIST_URL = "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/news"


def parse_bc(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup.body
    items = []
    for h2 in main.find_all("h2"):
        date = iso_date(h2.get_text(" ", strip=True))
        if not date or DATE_ONLY.fullmatch(h2.get_text(" ", strip=True).strip()) is None:
            continue                                     # 只认「整个标题就是日期」的 h2
        body = section_body(h2, stop_names=("h2",))
        first_p = h2.find_next_sibling(lambda t: t.name == "p")
        strong = first_p.find(["strong", "b"]) if first_p else None
        title = re.sub(r"\s+", " ", strong.get_text(" ", strip=True)) if strong else \
            (body.split("\n\n")[0][:120] if body else "")
        if not (title and body):
            continue                                     # 缺件不收不猜
        items.append({"title": title, "date": date, "url": f"{LIST_URL}#{date}-{slugify(title)}",
                      "bodyEn": body})
    return items


DATE_ONLY = re.compile(r"(January|February|March|April|May|June|July|August|September|October|"
                       r"November|December)\s+\d{1,2},?\s+20\d\d", re.I)

SOURCE = {
    "region": "BC",
    "list_url": LIST_URL,
    "kind": "html",
    "parse": parse_bc,
    "citation": LIST_URL,
}
