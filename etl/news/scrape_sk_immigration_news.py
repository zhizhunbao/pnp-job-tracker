"""scrape_sk_immigration_news — 萨省移民部委新闻(saskatchewan.ca 全政府新闻 hub 按部委筛选)。

SK 无 SINP 专属新闻页(P0 结论);2026-07-18 浏览器复测破局:新闻 hub 的「Filter news
releases」是 Sitecore **POST-only** 筛选(GET 参数被忽略,RSS 也不认参数)——带上
scController/scAction token 后 httpx 直接可用,按部委「Immigration and Career Training」
筛出移民类官方新闻(移民欺诈保护/Immigration Services Act 赔付等)。
结果区容器 = section.search-results ul.results(页顶轮播是全政府新闻,天然排除);
日期从条目 URL 路径取(/2026/july/16/…)。⚠️ MinistryId 是 Sitecore item GUID,站点重构才会变。
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

URL_DATE = re.compile(r"/news-and-media/(20\d\d)/([a-z]+)/(\d{1,2})/", re.I)
MONTH_NUM = {m: i + 1 for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june",
     "july", "august", "september", "october", "november", "december"])}


def parse_sk(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for a in soup.select("section.search-results ul.results li a[href]"):
        m = URL_DATE.search(a["href"])
        month = MONTH_NUM.get(m.group(2).lower()) if m else None
        if not month:
            continue
        title = re.sub(r"\s+", " ", a.get_text(" ", strip=True))
        if not title:
            continue
        items.append({"title": title, "url": a["href"],
                      "date": f"{m.group(1)}-{month:02d}-{int(m.group(3)):02d}"})
    return items


SOURCE = {
    "region": "SK",
    "list_url": "https://www.saskatchewan.ca/government/news-and-media",
    "kind": "html",
    "parse": parse_sk,
    "citation": "https://www.saskatchewan.ca/government/news-and-media",
    "post_data": {
        "scController": "GoS.Website.Controllers.GoS.NewsSearchController, GoS.Website",
        "scAction": "Search",
        "Text": "", "Year": "", "Month": "",
        "MinistryId": "9F26CB0C18864C70B873E0E8D77FF3B7",   # Immigration and Career Training
    },
}
