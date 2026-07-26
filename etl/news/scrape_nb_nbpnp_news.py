"""scrape_nb_nbpnp_news — 新不伦瑞克 NBPNP 官方「Important notices」页(gnb.ca)。

E6-09:项目此前无 NB 新闻源(独缺),导致 NB 岗弹框「本省最新公告」空。
结构(与 ontario.ca 不同):H2「Current notices」→ 多个 H3「Notice/Important」(标题是通用词),
**日期在正文里**(如「Effective May 4, 2026」),故标题从正文首句取、日期正文正则提;
无可提取日期的通告跳过(news 需 date)。bodyEn 就地取本页;bodyZh 由母脚本 AI 翻译。
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _scrape_base import iso_date, section_body, slugify  # noqa: E402

LIST_URL = "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/notice.html"

_MONTHS = ("January|February|March|April|May|June|July|August|September|October|November|December")
_DATE_RE = re.compile(rf"\b({_MONTHS})\s+\d{{1,2}},\s+\d{{4}}\b")


def _date_from(body: str) -> str | None:
    m = _DATE_RE.search(body)
    return iso_date(m.group(0)) if m else None


def _title_from(body: str) -> str:
    # 去掉开头「Effective <Month> <day>, <year>」(及可选的 "and until further notice," 从句)前缀噪声,
    # 再取首句(到第一个句号)或前 72 字。月份 alternation 必须分组 (?:...) 否则破坏锚定。
    t = re.sub(r"\s+", " ", body.strip())
    t = re.sub(rf"^Effective\s+(?:{_MONTHS})\s+\d{{1,2}},\s+\d{{4}}\b[,\s]*(?:and until further notice,?\s*)?",
               "", t, flags=re.I).strip()
    first = re.split(r"(?<=[.。])\s", t, maxsplit=1)[0].strip()
    return (first[:72].rstrip() + "…") if len(first) > 72 else first


def parse_nb(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup.body
    cur = next((h for h in main.find_all("h2")
                if "current notices" in h.get_text(" ", strip=True).lower()), None)
    if not cur:
        return []
    items, seen = [], set()
    for node in cur.find_all_next(re.compile(r"^h[23]$")):
        if node.name == "h2":          # 到下一个 H2(Past notices/Get in touch)即止
            break
        body = section_body(node, stop_names=("h3", "h2"))
        if not body:
            continue
        date = _date_from(body)
        if not date:                   # 无可提取日期的通告跳过(news 需 date)
            continue
        title = _title_from(body)
        if not title or title in seen:
            continue
        seen.add(title)
        anchor = node.get("id") or f"{date}-{slugify(title)}"
        items.append({"title": title, "date": date, "url": f"{LIST_URL}#{anchor}", "bodyEn": body})
    return items


SOURCE = {
    "region": "NB",
    "list_url": LIST_URL,
    "kind": "html",
    "parse": parse_nb,
    "citation": LIST_URL,
}
