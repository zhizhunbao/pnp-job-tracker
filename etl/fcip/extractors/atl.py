# -*- coding: utf-8 -*-
"""批C(E6-11):Atlantic 法语社区名单抽取器。

社区(键=raw/fcip/fcip-communities.json 的官方名):
  - "Acadian Peninsula, NB"    — FCIP/PPICF,站 inspirepeninsuleacadienne.ca(法语;
                                 雇主=官方 PDF,职业=项目页手风琴列表)

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):本文件自
etl/pilot/extractors/atl.py 拆出 —— ACAD_PAGE_URL / _ACAD_HEADER_PREFIXES 两常量与
acadian_peninsula() **函数体一字未改**;共用私件 UA_HEADERS / _fetch / _pdf_lines / _clean
是与 etl/rcip/extractors/atl.py 的**镜像**(常量各域自抄先例:同一段代码两域各留一份,
改一边记得改另一边);Atlantic 的另一个社区 Pictou County, NS 是乡村试点,留在 rcip 域。

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

ACAD_PAGE_URL = (
    "https://inspirepeninsuleacadienne.ca/"
    "programme-pilote-immigration-communautes-francophones/"
)


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


# ------------------------------------------------------------ Acadian Peninsula

# PDF 页眉/页脚固定句(比对前先做 ’→' 归一)
_ACAD_HEADER_PREFIXES = (
    "commission de services",
    "liste des employeurs",
    "programme pilote",
    "les employeurs suivants",
    "pour la péninsule acadienne",
    "nb :",
    "nb:",
)


def acadian_peninsula() -> dict:
    """Péninsule acadienne PPICF:雇主 PDF(法语,「Nom - Lieu」行)+ 项目页职业手风琴。"""
    page_html = _fetch(ACAD_PAGE_URL).text

    # 1) 雇主 PDF:文件名带日期(Liste-des-employeurs-designes-PPICF-<date>.pdf),动态发现
    pdf_match = re.search(
        r'href="(https?://[^"]*[Ll]iste-des-employeurs[^"]*\.pdf)"', page_html
    )
    if not pdf_match:
        raise ValueError("Acadian: 项目页找不到 Liste des employeurs PDF 链接")
    employers_url = _html.unescape(pdf_match.group(1))

    note_re = re.compile(r"\(\s*ne recrute pas[^)]*\)", re.IGNORECASE)
    employers: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for page_lines in _pdf_lines(employers_url):
        for line in page_lines:
            norm = _clean(line)
            key_text = norm.replace("’", "'").casefold()
            if any(key_text.startswith(p) for p in _ACAD_HEADER_PREFIXES):
                continue
            norm = _clean(note_re.sub("", norm))  # 「(ne recrute pas …)」行保留,仅去括注
            if not norm:
                continue
            # 「Nom - Lieu」以空格夹连字符分隔(地名内部连字符如 St-Isidore 不受影响);
            # 个别行无地点(如 Résidence St Isidore),location 留空,宁缺勿猜
            parts = re.split(r"\s+[–—-]\s+", norm, maxsplit=1)
            name = parts[0].strip()
            location = parts[1].strip() if len(parts) == 2 else ""
            if not name:
                continue
            key = (name.casefold(), location.casefold())
            if key in seen:  # PDF 原样抽取,仅完全重复行去重
                continue
            seen.add(key)
            employers.append({"name": name, "location": location})

    # 2) 职业:手风琴 icon-list,「12345 – Titre」;<br> 后为限额备注,不入 title。
    #    同页其他 icon-list 是资格条文,靠行首 5 位码过滤
    occupations: list[dict] = []
    seen_occ: set[str] = set()
    for raw in re.findall(
        r'<span class="elementor-icon-list-text">(.*?)</span>', page_html, re.S
    ):
        first_part = re.split(r"<br\s*/?>", raw, maxsplit=1)[0]
        text = _clean(re.sub(r"<[^>]+>", " ", first_part))
        m = re.match(r"^(?P<noc>\d{5})\s*[–—-]\s*(?P<title>.+)$", text)
        if m and m.group("noc") not in seen_occ:
            seen_occ.add(m.group("noc"))
            occupations.append(
                {"noc": m.group("noc"), "title": m.group("title"), "sectorOnly": False}
            )

    if len(employers) < 20:
        raise ValueError(f"Acadian: 雇主仅解析出 {len(employers)} 家,疑似 PDF 版式变更")
    if len(occupations) < 10:
        raise ValueError(f"Acadian: 职业仅解析出 {len(occupations)} 条,疑似页面改版")

    return {
        "employers": employers,
        "occupations": occupations,
        "employersUrl": employers_url,
        "occupationsUrl": ACAD_PAGE_URL,
    }


EXTRACTORS = {
    "Acadian Peninsula, NB": acadian_peninsula,
}
