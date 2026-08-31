"""bc — BC 三社区指定雇主/优先职业抽取(E6-11 批C,2026-08-15)。

社区与源(批B 2026-08-15 实测基线:雇主 263/450/0,职业各 25):
  West Kootenay, BC          雇主=官方公示页 html(accordion 表格,剔 De-designated 段);职业=priorities 页表格
  North Okanagan Shuswap, BC 雇主=官方 PDF(Resources and Policies 页动态发现链接,每月更新);职业=priority-sectors-nocs 页表格
  Peace Liard, BC            雇主=candidates 页链接的官方 PDF(批B 时官方待公示,2026-08 已公示 280 家);
                             职业=priority-occupations 页 Wix Table Master 组件挂接的官方 CSV(组件配置不在页 html 里,URL 只能照抄)

批E 拆分改动(2026-08-31,pilot 拆三域):第四个社区 Kelowna, BC 是**纯法语试点**,
连同它的 KEL_URL 常量与 kelowna() 整体搬去 etl/fcip/extractors/bc.py(函数体一字未改);
本文件共用私件 _get/_text/_dedupe 两域各留一份(常量各域自抄先例,改一边记得改另一边)。

约定:剔 de-designated;not-hiring 保留(『指定』≠『在招』);宁缺勿猜 —— 结构对不上就抛异常,总控保旧。
"""
import csv
import io
import re
import unicodedata
from html import unescape

import fitz
import httpx

UA = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")}
TIMEOUT = 60

WK_EMP_URL = "https://westkootenayimmigration.ca/designated-employers/"
WK_OCC_URL = "https://westkootenayimmigration.ca/priorities/"
NOS_RES_URL = "https://rcipnorthokanaganshuswap.com/resources-and-policies/"
NOS_OCC_URL = "https://rcipnorthokanaganshuswap.com/priority-sectors-nocs/"
NEBC_CAND_URL = "https://www.nebcimmigration.ca/candidates"
NEBC_OCC_URL = "https://www.nebcimmigration.ca/priority-occupations"
NEBC_OCC_CSV = ("https://docs.google.com/spreadsheets/d/e/2PACX-1vQhjYZovjoLZlxWckFJpgPTCpbQeuC2PXew"
                "0SS71Oxil218Y8T0SOxIAOAT5MrtFhFQh5lDRLl9lV-8/pub?output=csv")


def _get(url: str) -> httpx.Response:
    r = httpx.get(url, headers=UA, follow_redirects=True, timeout=TIMEOUT)
    r.raise_for_status()
    return r


def _text(html_fragment: str) -> str:
    """去标签 + 实体解码 + 空白归一。"""
    return " ".join(unescape(re.sub(r"<[^>]+>", " ", html_fragment)).split())


def _pdf_norm(s: str) -> str:
    """PDF 文本归一:合字还原(ﬂ→fl 等)+ 空白归一。"""
    return " ".join(unicodedata.normalize("NFKC", s).split())


def _dedupe(rows: list[dict]) -> list[dict]:
    """按 name 去重保首条(与批B 合并口径一致)。"""
    seen: set[str] = set()
    out = []
    for r in rows:
        if r["name"] and r["name"] not in seen:
            seen.add(r["name"])
            out.append(r)
    return out


# ---------------------------------------------------------------- West Kootenay
def west_kootenay() -> dict:
    html = _get(WK_EMP_URL).text
    # 名单区间:h2 标题 → De-designated 段之前;标记缺失=改版,抛
    start = html.find("Designated Employer List")
    end = html.find("De-designated Employers")
    if start < 0 or end < 0 or end <= start:
        raise ValueError("WK 雇主页结构变了:找不到名单/De-designated 分界")
    employers = []
    for cell in re.findall(r"<td>(.*?)</td>", html[start:end], re.S):
        if "<strong>" in cell:  # 表头「Employer Name」
            continue
        t = _text(cell)
        if not t:
            continue
        name, _, loc = t.partition(",")
        employers.append({"name": name.strip(), "location": loc.strip()})
    employers = _dedupe(employers)

    occ_html = _get(WK_OCC_URL).text
    occupations = []
    for tr in re.findall(r"<tr>(.*?)</tr>", occ_html, re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(tds) >= 2 and re.fullmatch(r"\d{5}", _text(tds[1])):
            title = _text(tds[0]).replace("(new)", "").strip()
            occupations.append({"noc": _text(tds[1]), "title": title, "sectorOnly": False})
    return {"employers": employers, "occupations": occupations,
            "employersUrl": WK_EMP_URL, "occupationsUrl": WK_OCC_URL}


# ------------------------------------------------------- North Okanagan Shuswap
# 行业名(=行业列里每个雇主行的首行;Education 一条在 PDF 里固定折成两行,首行如下)
NOS_SECTOR_STARTS = {
    "Business, Finance and Administration",
    "Health",
    "Education, Law and Social, Community",
    "Sales and Services",
    "Trades and Transport",
    "Manufacturing and Utilities",
}
NOS_NAMECOL_SKIP = {"rcip nos", "designated employer list", "business legal name"}  # 全小写比对


def north_okanagan_shuswap() -> dict:
    res_html = _get(NOS_RES_URL).text
    pdf_urls = [u for u in re.findall(r'href="([^"]+\.pdf)"', res_html)
                if "Designated-Employer-List" in u]
    if not pdf_urls:
        raise ValueError("NOS Resources 页找不到 Designated-Employer-List PDF 链接")
    pdf_url = pdf_urls[0]
    doc = fitz.open(stream=_get(pdf_url).content, filetype="pdf")
    # 两列表格:行业列 x≈78、雇主名列 x≈290,单元格折行时两列逐行对齐。
    # 名列行的同 y 行业列若是行业名首行 → 新雇主;否则(行业续行/无)= 上一名字的折行,拼接。
    parts: list[list[str]] = []
    starts = 0
    for page in doc:
        cells = sorted(
            (round(ln["bbox"][1]), round(ln["bbox"][0]),
             _pdf_norm("".join(s["text"] for s in ln["spans"])))
            # pyrefly: ignore[bad-index] — pymupdf get_text("dict") 档位返回 dict,存根把三档位并成 str|list|dict
            for b in page.get_text("dict")["blocks"] for ln in b.get("lines", []))
        sector_ys = {y: t for y, x, t in cells if t and x < 260}
        starts += sum(1 for t in sector_ys.values() if t in NOS_SECTOR_STARTS)
        # 名列同一视觉行会被拆成多个同 y 碎片(如 'Aslan|Electrical,|…')→ 先按 y 拼回整行
        name_lines: list[tuple[int, str]] = []
        for y, x, t in cells:
            if x < 260 or not t or t.lower() in NOS_NAMECOL_SKIP \
                    or re.fullmatch(r"[A-Z][a-z]+ \d{1,2}, \d{4}", t):
                continue
            if name_lines and abs(name_lines[-1][0] - y) <= 1:
                name_lines[-1] = (name_lines[-1][0], name_lines[-1][1] + " " + t)
            else:
                name_lines.append((y, t))
        for y, t in name_lines:
            sector = next((s for dy in (0, -1, 1) if (s := sector_ys.get(y + dy))), None)
            if sector in NOS_SECTOR_STARTS:
                parts.append([t])
            elif parts:  # 名字折行(行业列是续行或空)
                parts[-1].append(t)
    if len(parts) != starts:
        raise ValueError(f"NOS PDF 对不齐:行业行 {starts} vs 雇主名 {len(parts)}")
    # 带 * 的=快餐/加油站子行业暂停受理,官方仍列入指定 → 原样保留(* 是官方标注,与批B一致)
    employers = _dedupe([{"name": " ".join(p).strip(), "location": ""} for p in parts])

    occ_html = _get(NOS_OCC_URL).text
    # 表格单元:<a ...>12200</a> – Accounting technicians and bookkeepers
    occupations = [{"noc": noc, "title": _text(title), "sectorOnly": False}
                   for noc, title in re.findall(
                       r">(\d{5})</a>\s*(?:–|-|&#8211;)\s*(.*?)</td>", occ_html, re.S)]
    return {"employers": employers, "occupations": occupations,
            "employersUrl": pdf_url, "occupationsUrl": NOS_OCC_URL}


# ----------------------------------------------------- Peace Liard (Northeast BC)
def peace_liard() -> dict:
    cand_html = _get(NEBC_CAND_URL).text
    # 官方名单 PDF:锚文本含 Designated Employer 的 .pdf 链接(2026-08 起已公示)
    pdf_urls = [href for href, atext in
                re.findall(r'<a[^>]+href="([^"]+)"[^>]*>((?:(?!</a>).)*)</a>', cand_html, re.S)
                if ".pdf" in href and "Designated Employer" in _text(atext)]
    if pdf_urls:
        employers, emp_url = _nebc_parse_pdf(pdf_urls[0]), pdf_urls[0]
    elif re.search(r"will be posted|when available", cand_html):
        employers, emp_url = [], NEBC_CAND_URL  # 官方回到「待公示」状态 → 空名单(基线 0 放行)
    else:
        raise ValueError("NEBC candidates 页既无名单 PDF 也无『待公示』字样 —— 疑似改版")

    csv_text = _get(NEBC_OCC_CSV).text.lstrip("﻿")
    occupations = []
    for row in csv.reader(io.StringIO(csv_text)):
        if len(row) >= 2 and re.fullmatch(r"\d{5}", row[0].strip()):
            occupations.append({"noc": row[0].strip(), "title": " ".join(row[1].split()),
                                "sectorOnly": False})
    return {"employers": employers, "occupations": occupations,
            "employersUrl": emp_url, "occupationsUrl": NEBC_OCC_URL}


def _nebc_parse_pdf(url: str) -> list[dict]:
    """NEBC 名单 PDF:三列(# / Legal Name / Operating As),按行号锚定,折行拼接。"""
    doc = fitz.open(stream=_get(url).content, filetype="pdf")
    rows: list[dict[str, list[str]]] = []
    current = None
    for page in doc:
        current = None  # 跨页折行极少且页首必有行号,按页重置防串行
        cells = sorted(
            (round(ln["bbox"][1]), round(ln["bbox"][0]),
             _pdf_norm("".join(s["text"] for s in ln["spans"])))
            # pyrefly: ignore[bad-index] — pymupdf get_text("dict") 档位返回 dict,存根把三档位并成 str|list|dict
            for b in page.get_text("dict")["blocks"] for ln in b.get("lines", []))
        for _y, x, t in cells:
            if not t or re.fullmatch(r"Page \d+", t):
                continue
            if x < 70:  # 行号列;非纯数字(如页尾说明段)略过
                if t.isdigit():
                    current = {"legal": [], "oa": []}
                    rows.append(current)
                continue
            if current is None:  # 页眉/表头/标题
                continue
            current["legal" if x < 300 else "oa"].append(t)
    employers = []
    for r in rows:
        legal, oa = " ".join(r["legal"]), " ".join(r["oa"])
        if not legal:
            continue
        norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())  # noqa: E731
        name = f"{legal} ({oa})" if oa and norm(oa) != norm(legal) else legal
        employers.append({"name": name, "location": ""})
    # PDF 自带总数(As of ... • N Designated Employers)对账,对不上=解析漏行,抛
    # pyrefly: ignore[no-matching-overload] — pymupdf get_text() 无参档位恒返回 str,存根把三档位并成 str|list|dict
    full = "\n".join(p.get_text() for p in doc)
    m = re.search(r"(\d+)\s+Designated Employers", full)
    if m and int(m.group(1)) != len(employers):
        raise ValueError(f"NEBC PDF 自称 {m.group(1)} 家,实际解析 {len(employers)} 家")
    return employers


EXTRACTORS = {
    "West Kootenay, BC": west_kootenay,
    "North Okanagan Shuswap, BC": north_okanagan_shuswap,
    "Peace Liard, BC": peace_liard,
}
