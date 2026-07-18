"""scrape_qc_mifi_news — 魁省移民部(MIFI)官方新闻(quebec.ca 政府新闻 hub 按部委筛选)。

2026-07-18 复核(Frank 点名核实 QC):quebec.ca 新闻搜索是 TYPO3 Solr,**GET facet 参数
httpx 直接可用**(`tx_solr[filter][]=mo_cabinets:28` = Immigration, Francisation et
Intégration 部委)。旧站 immigration-quebec/mifi.gouv.qc.ca 新闻页均 404 已弃。
内容高度对口:PSTQ 邀请/国际学生项目/家庭团聚配额/年度移民计划。
条目=li.article(首个 <p> 是日期「June 23, 2026 …」,h3>a 是标题+链接);详情页走母脚本通用抽取。
⚠️ 展示口径:QC 走自己的移民体系(非 PNP)——前端 P1b 的 QC 卡片带该声明(同 match 口径)。
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _scrape_base import iso_date  # noqa: E402


def parse_qc(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for li in soup.select("li.article"):
        a = li.select_one("h3 a[href]")
        p = li.find("p")
        date = iso_date(p.get_text(" ", strip=True)) if p else None
        if not (a and date):
            continue
        title = re.sub(r"\s+", " ", a.get_text(" ", strip=True))
        if title:
            items.append({"title": title, "date": date, "url": a["href"]})
    return items


SOURCE = {
    "region": "QC",
    "list_url": ("https://www.quebec.ca/en/news/search"
                 "?tx_solr%5Bfilter%5D%5B%5D=mo_cabinets%3A28"),
    "kind": "html",
    "parse": parse_qc,
    "citation": "https://www.quebec.ca/en/news/search?tx_solr%5Bfilter%5D%5B%5D=mo_cabinets%3A28",
    "body_selector": "[itemprop=articleBody]",   # 默认 main 抽取会混入面包屑导航(实测)
}
