# -*- coding: utf-8 -*-
"""批C(E6-11):Atlantic 社区名单抽取器。

社区(键=raw/rcip/rcip-communities.json 的官方名):
  - "Pictou County, NS"        — RCIP,站 pcrcip.ca(雇主=官方 PDF,职业=首页列表)

批E 拆分改动(2026-08-31,pilot 拆三域):第二个社区 "Acadian Peninsula, NB" 是
**纯法语试点(FCIP/PPICF)**,连同 ACAD_PAGE_URL / _ACAD_HEADER_PREFIXES 两常量与
acadian_peninsula() 整体搬去 etl/fcip/extractors/atl.py(函数体一字未改);
共用私件 _fetch/_pdf_lines/_clean 两域各留一份(常量各域自抄先例,改一边记得改另一边)。
社区名单文件同批一分为二:rcip-communities.json / fcip-communities.json。

红线:宁缺勿猜 —— 解析不到的行直接丢;数量掉出下限抛异常,总控保旧。
PDF 链接不写死文件名(官方按日期换版),每次从页面重新发现最新版。
"""
from __future__ import annotations

import html as _html
import re

import fitz  # pymupdf
import httpx

UA_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8",
}

PICTOU_HOME_URL = "https://pcrcip.ca/"
PICTOU_EMPLOYERS_PAGE_URL = "https://pcrcip.ca/employers/"


def _fetch(url: str) -> httpx.Response:
    with httpx.Client(headers=UA_HEADERS, follow_redirects=True, timeout=60) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp


def _pdf_lines(url: str) -> list[list[str]]:
    """下载 PDF,按页返回去首尾空白后的非空文本行。"""
    resp = _fetch(url)
    pages: list[list[str]] = []
    with fitz.open(stream=resp.content, filetype="pdf") as doc:
        for page in doc:
            # pyrefly: ignore[missing-attribute] — pymupdf get_text() 无参档位恒返回 str,存根把三档位并成 str|list|dict
            lines = [ln.strip() for ln in page.get_text().splitlines()]
            pages.append([ln for ln in lines if ln])
    return pages


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", _html.unescape(text)).strip()


# ---------------------------------------------------------------- Pictou County


def pictou_county() -> dict:
    """Pictou County RCIP:雇主 PDF(带 recruiting 状态行,全保留)+ 首页职业列表。"""
    # 1) 雇主:从 /employers/ 页发现当期 PDF(文件名含日期,官方换版即换名)
    emp_page = _fetch(PICTOU_EMPLOYERS_PAGE_URL).text
    pdf_match = re.search(
        r'href="(https?://[^"]*Designated[_-]Employers[^"]*\.pdf)"',
        emp_page,
        re.IGNORECASE,
    )
    if not pdf_match:
        raise ValueError("Pictou: employers 页找不到 Designated Employers PDF 链接")
    employers_url = _html.unescape(pdf_match.group(1))

    status_values = {"recruiting", "not currently recruiting"}
    employers: list[dict] = []
    for page_lines in _pdf_lines(employers_url):
        prev = ""
        for line in page_lines:
            norm = _clean(line)
            if norm.lower() in status_values:
                # 状态行的前一非空行 = 雇主名(表头/脚注后面不会紧跟状态行)
                if prev and prev.lower() not in status_values and prev != "Status":
                    employers.append({"name": prev, "location": ""})
                prev = ""
            else:
                prev = norm

    # 2) 职业:首页 repeater 的 dmach-acf-value,「Title – 12345」;
    #    同款元素还装了 6 条 Priority Sectors(无码),按尾码过滤即分离
    home = _fetch(PICTOU_HOME_URL).text
    occupations: list[dict] = []
    for raw in re.findall(r'<p class="dmach-acf-value\s*">(.*?)</p>', home, re.S):
        text = _clean(re.sub(r"<[^>]+>", " ", raw))
        m = re.match(r"^(?P<title>.+?)\s*[–—-]\s*(?P<noc>\d{5})$", text)
        if m:
            occupations.append(
                {"noc": m.group("noc"), "title": m.group("title"), "sectorOnly": False}
            )

    if len(employers) < 30:
        raise ValueError(f"Pictou: 雇主仅解析出 {len(employers)} 家,疑似 PDF 版式变更")
    if len(occupations) < 10:
        raise ValueError(f"Pictou: 职业仅解析出 {len(occupations)} 条,疑似首页改版")

    return {
        "employers": employers,
        "occupations": occupations,
        "employersUrl": employers_url,
        "occupationsUrl": PICTOU_HOME_URL,
    }


EXTRACTORS = {
    "Pictou County, NS": pictou_county,
}
