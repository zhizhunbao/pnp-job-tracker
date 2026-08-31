# -*- coding: utf-8 -*-
"""on.py — ON 五社区指定雇主/优先职业抽取器(E6-11 批C,2026-08-15)。

社区(键=rcip-communities.json 官方名)与源:
  North Bay and Area       雇主=admin-ajax load_monday_data 实时源;职业=nbrcip.ca/employers/ NOC 表
  Sudbury, ON              雇主+职业同页 vc_tta 面板,RCIP/FCIP 逐行 type
  Timmins, ON              雇主=immigration 页内链的 Designated-Employer-List PDF(pilot 列逐行归 type,
                           空白= RCIP+FCIP);职业=同页 elementor RCIP/FCIP 两栏
  Sault Ste. Marie, ON     雇主=designated-employers 页 <p> 列表;职业=rcip_employer 页分 sector 表
                           (Sales and Services 官方空栏 → sectorOnly)
  Thunder Bay, ON          雇主=页内「List of Designated Employers」PDF,y 聚簇双列;
                           「Business Designated, but currently excluded from 2026」段剔除,红字 not-hiring 保留

批E 拆分改动(2026-08-31,pilot 拆三域):第六个社区 "Superior East Region, ON" 是**纯法语试点**,
连同 SE_EMP_URL / SE_OCC_URL 两常量与 superior_east() 整体搬去 etl/fcip/extractors/on.py
(函数体一字未改);共用私件 _get/_clean/_cut_note 两域各留一份(常量各域自抄先例,
改一边记得改另一边)。**Sudbury/Timmins 两个双身份社区的抽取器留在本域**(拍板点 8-②:
IRCC 名单页两节都列它俩,抽取只做一次,产出行照旧带 RCIP / FCIP / RCIP+FCIP 逐行 type)。

红线:宁缺勿猜(excluded/de-designated 剔,拿不准的行不要);解析不到就抛异常,总控保旧。
"""
from __future__ import annotations

import html as ihtml
import re

import fitz
import httpx

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
TIMEOUT = 60


def _get(url: str, **kw) -> httpx.Response:
    with httpx.Client(headers={"User-Agent": UA}, timeout=TIMEOUT, follow_redirects=True) as c:
        r = c.get(url, **kw)
        r.raise_for_status()
        return r


def _clean(s: str) -> str:
    """HTML 片段 → 单行纯文本(去标签/实体/多余空白)。"""
    return re.sub(r"\s+", " ", ihtml.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def _ul_block(h: str, start: int) -> str:
    """从 start 起第一个 <ul> 到与之配对的 </ul>(嵌套计深;TB 64100 行内嵌套过子列表)。"""
    m0 = re.search(r"<ul[\s>]", h[start:])
    if not m0:
        return ""
    i0 = start + m0.start()
    depth = 0
    for m in re.finditer(r"<(/?)ul[\s>]", h[i0:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return h[i0:i0 + m.start()]
    return h[i0:]


def _cut_note(title: str) -> str:
    """剪掉职业名后接的大写附注从句(「 – Limit of 1 …」);官方 NOC 名内部的破折段是
    小写延续(如 representatives – financial institutions),保留。尾注星号一并剥掉。"""
    parts = re.split(r"\s[–—-]\s", title)
    keep = [parts[0]]
    for p in parts[1:]:
        if p[:1].isupper():
            break
        keep.append(p)
    return " - ".join(keep).rstrip("*").strip()


# ---------------------------------------------------------------- North Bay
NB_EMP_URL = "https://nbrcip.ca/designated-employers/"
NB_AJAX = "https://nbrcip.ca/wp-admin/admin-ajax.php"
NB_OCC_URL = "https://nbrcip.ca/employers/"


def north_bay() -> dict:
    feed = _get(NB_AJAX, params={"action": "load_monday_data"}).json()
    employers = [{"name": " ".join(str(e["name"]).split()), "location": ""}
                 for e in feed if str(e.get("name", "")).strip()]

    h = _get(NB_OCC_URL).text
    i = h.find('id="occupation-table"')
    if i < 0:
        raise ValueError("North Bay: occupation-table 不见了")
    seg = h[i:]
    seg = seg[:seg.find("</table>")]
    occupations = [{"noc": n, "title": _clean(t), "sectorOnly": False}
                   for n, t in re.findall(r"<tr>\s*<td>(\d{5})</td>\s*<td>(.*?)</td>", seg, re.S)]
    if not employers or not occupations:
        raise ValueError(f"North Bay: employers={len(employers)} occupations={len(occupations)}")
    return {"employers": employers, "occupations": occupations,
            "employersUrl": NB_EMP_URL, "occupationsUrl": NB_OCC_URL}


# ---------------------------------------------------------------- Sudbury
SUD_URL = "https://investsudbury.ca/why-sudbury/newcomers/rcipfcip/"
_PANEL = re.compile(r'<span class="vc_tta-title-text">(RCIP|FCIP)</span>')


def sudbury() -> dict:
    h = _get(SUD_URL).text

    # 职业:RCIP/FCIP 面板内 Priority Occupations 段的 <p>NNNNN – Title</p> 行
    occupations = []
    panels = _PANEL.split(h)
    for i in range(1, len(panels), 2):
        prog, body = panels[i], panels[i + 1]
        j = body.find("Priority Occupations")
        if j < 0:
            continue
        sub = body[j:]
        k = sub.find("</div>")
        if k > 0:
            sub = sub[:k]
        for n, t in re.findall(r"<p>(\d{5})\s*(?:&#8211;|&#8212;|[–—-])\s*(.*?)</p>", sub, re.S):
            occupations.append({"noc": n, "title": _cut_note(_clean(t)),
                                "sectorOnly": False, "type": prog})

    # 雇主:id="employers" 段(到 Find a job 止)内 RCIP/FCIP 面板的 employer_box
    i0, i1 = h.find('id="employers"'), h.find("Find a job")
    if i0 < 0 or i1 < 0 or i1 < i0:
        raise ValueError("Sudbury: employers 段边界不见了")
    employers = []
    epanels = _PANEL.split(h[i0:i1])
    for i in range(1, len(epanels), 2):
        prog, body = epanels[i], epanels[i + 1]
        for box in re.findall(r'<div class="employer_box_content">(.*?)</div></div>', body, re.S):
            nm = re.search(r"<h5[^>]*>(.*?)</h5>", box, re.S)
            ad = re.search(r"<p[^>]*>(.*?)</p>", box, re.S)
            name = _clean(nm.group(1)) if nm else ""
            if name:
                employers.append({"name": name, "location": _clean(ad.group(1)) if ad else "",
                                  "type": prog})
    if not employers or not occupations:
        raise ValueError(f"Sudbury: employers={len(employers)} occupations={len(occupations)}")
    return {"employers": employers, "occupations": occupations,
            "employersUrl": SUD_URL, "occupationsUrl": SUD_URL}


# ---------------------------------------------------------------- Timmins
TM_PAGE = "https://timminsedc.com/immigration/"
_TM_HDR = re.compile(r"List of Designated|Timmins Regional Rural|following employers|"
                     r"Immigration Pilot \(|Timmins and surrounding|Priority Sector|"
                     r"Employer.s Legal|Pilot Designated|^Under$|Updated as of", re.I)
_TAB_TITLE = re.compile(r"elementor-tab-title[^>]*>(?:<a[^>]*>)?\s*(RCIP|FCIP)\s*<")


def _timmins_pdf(data: bytes) -> list[dict]:
    """PDF 三列:sector(x<170)不需要 / 雇主名(170–440)/ pilot(x>=440)。
    同 y(±3)的 pilot 值归到该雇主;空白 = 两试点均可 → RCIP+FCIP。"""
    doc = fitz.open(stream=data, filetype="pdf")
    lines = []
    for pi, page in enumerate(doc):
        # pyrefly: ignore[bad-index] — pymupdf get_text("dict") 档位返回 dict,存根把三档位并成 str|list|dict
        for b in page.get_text("dict")["blocks"]:
            for ln in b.get("lines", []):
                for s in ln["spans"]:
                    t = s["text"].strip()
                    if t:
                        lines.append((pi, round(s["bbox"][1]), s["bbox"][0], t))
    lines.sort(key=lambda r: (r[0], r[1], r[2]))
    pilots = {(pi, y): t for pi, y, x, t in lines if x >= 440 and not _TM_HDR.search(t)}
    rows: list[dict] = []
    for pi, y, x, t in lines:
        if x < 170 or x >= 440 or _TM_HDR.search(t):
            continue
        p = next((v for (ppi, py), v in pilots.items() if ppi == pi and abs(py - y) <= 3), None)
        if p is None and t == "Residence" and rows:   # 换行续名(批B 实测仅此一例)
            rows[-1]["name"] += " " + t
        else:
            rows.append({"name": t, "pilot": p})
    out = []
    for r in rows:
        name = re.sub(r"\s*\[not hiring\]", "", re.sub(r"\s+", " ", r["name"]).strip(),
                      flags=re.I).strip()
        pv = re.sub(r"[^A-Z]", "", (r["pilot"] or "").upper())
        ptype = pv if pv in ("RCIP", "FCIP") else "RCIP+FCIP"
        if name:
            out.append({"name": name, "location": "", "type": ptype})
    return out


def timmins() -> dict:
    h = _get(TM_PAGE).text
    m = re.search(r'href="(https?://[^"]*Designated-Employer-List[^"]*\.pdf)"', h)
    if not m:
        raise ValueError("Timmins: 页内找不到 Designated-Employer-List PDF 链接")
    pdf_url = ihtml.unescape(m.group(1))
    employers = _timmins_pdf(_get(pdf_url).content)

    occupations = []
    for blk in re.finditer(r"Priority Occupations:?</strong></p>\s*<ul>(.*?)</ul>", h, re.S):
        progs = _TAB_TITLE.findall(h[:blk.start()])
        if not progs:
            raise ValueError("Timmins: 职业块前找不到 RCIP/FCIP 标签")
        for li in re.findall(r"<li>(.*?)</li>", blk.group(1), re.S):
            t = _clean(li)
            m2 = re.match(r"(\d{5})\s+(.+)", t)
            if m2:
                occupations.append({"noc": m2.group(1), "title": _cut_note(m2.group(2)),
                                    "sectorOnly": False, "type": progs[-1]})
    if not employers or not occupations:
        raise ValueError(f"Timmins: employers={len(employers)} occupations={len(occupations)}")
    return {"employers": employers, "occupations": occupations,
            "employersUrl": pdf_url, "occupationsUrl": TM_PAGE}


# ---------------------------------------------------------------- Sault Ste. Marie
SSM_EMP_URL = "https://welcometossm.com/designated-employers/"
SSM_OCC_URL = "https://welcometossm.com/rcip_employer/"


def sault_ste_marie() -> dict:
    h = _get(SSM_EMP_URL).text
    blocks = re.findall(r'<div class="fl-rich-text">(.*?)</div>', h, re.S)
    if not blocks:
        raise ValueError("SSM: fl-rich-text 块不见了")
    block = max(blocks, key=lambda b: len(re.findall(r"<p>", b)))   # 名单=最长的 <p> 列表块
    employers = []
    for p in re.findall(r"<p>(.*?)</p>", block, re.S):
        t = _clean(p)
        if not t or len(t) > 120 or re.search(r"designation of employers|please note", t, re.I):
            continue   # 空行 / 免责说明段
        t = re.sub(r"\s*\(not currently hiring\)", "", t, flags=re.I)   # 指定状态保留,在招与否不影响
        t = re.sub(r"\s*\(2025\)\s*$", "", t).strip()                   # 「(2025)」=指定年份注记
        if t:
            employers.append({"name": t, "location": ""})
    if len(employers) < 50:
        raise ValueError(f"SSM: 雇主仅 {len(employers)} 行,疑似页面改版")

    ho = _get(SSM_OCC_URL).text
    occupations, seen = [], set()
    secs = re.split(r'<h2 class="sector-title">([^<]+)</h2>', ho)
    for i in range(1, len(secs), 2):
        sector, body = _clean(secs[i]), secs[i + 1]
        pairs = re.findall(r'>(\d{5})</a>\s*</td>\s*<td class="occupation">([^<]+)<', body)
        if pairs:
            for n, t in pairs:
                if (n, _clean(t)) not in seen:   # 页面含同表两份副本,去重
                    seen.add((n, _clean(t)))
                    occupations.append({"noc": n, "title": _clean(t), "sectorOnly": False})
        elif "No occupations currently listed" in body or "empty-sector-note" in body:
            if ("", sector) not in seen:         # 官方只给行业名 → sectorOnly
                seen.add(("", sector))
                occupations.append({"noc": "", "title": sector, "sectorOnly": True})
    if not occupations:
        raise ValueError("SSM: 职业表不见了")
    return {"employers": employers, "occupations": occupations,
            "employersUrl": SSM_EMP_URL, "occupationsUrl": SSM_OCC_URL}


# ---------------------------------------------------------------- Thunder Bay
TB_PAGE = "https://gotothunderbay.ca/rural-community-immigration-pilot-rcip/"
_TB_SKIP = re.compile(r"Designated Employer|updated on an ongoing|listed in red|AS OF|"
                      r"check back regularly|currently.?\s*not hiring|^not hiring\.$", re.I)
_TB_EXCL = re.compile(r"Business Designated, but currently excluded|^RCIP$", re.I)
# 双列版式错位的手工校正(对照 As-of-August-13-2026.pdf 逐条核过;换版后名字对不上则自动跳过)
_TB_PATCH = {
    "Baywood Dental": "131 East Avenue, Thunder Bay",
    "Bennett's Bakery": "899 Tungsten St, Thunder Bay; 400 Balmoral St, Thunder Bay; "
                        "801 Red River Road, Thunder Bay",
    "DELTA HOTELS": "2240 Sleeping Giant Parkway, Thunder Bay",
    "Denkymax": "59 Court Street N, Thunder Bay & 220 May Street N, Thunder Bay",
    "Equipment World Inc.": "988 Alloy Drive, Thunder Bay",
    "Fat Panda": "1100 Memorial Ave.#3, Thunder Bay, Arthur St W, Thunder Bay / "
                 "843 Red River Road unit 11 Thunder Bay",
    "RUGGEDAIR": "710 NORAH CRES THUNDER BAY",
    "RUNA PACHA": "1000 Fort William Rd, Unit 46C Intercity Shopping Centre, Thunder Bay",
    "Guac Mexi Grill": "445 Hodder Ave, Thunder Bay",
    "Hodder Avenue Confectionary": "1. 2013 Arthur St. E, Thunder Bay 2. 825 Red River Road "
                                   "3. 319 Cumberland St. 4. 931 Ft. William Rd",
    "KFC / Taco Bell": "588 Arthur St West, Thunder Bay, On, P7E5R7 / "
                       "843 Red River Road, Thunder Bay",
}


def _thunder_bay_pdf(data: bytes) -> list[dict]:
    """y 聚簇双列(名 x<290 / 地址 x>=290),跨行名前向拼接;
    「excluded from 2026」段起整段剔除;红字(not hiring)行保留。"""
    doc = fitz.open(stream=data, filetype="pdf")
    raw: list[dict] = []
    pending, excluded = "", False
    for page in doc:
        spans = []
        # pyrefly: ignore[bad-index] — pymupdf get_text("dict") 档位返回 dict,存根把三档位并成 str|list|dict
        for b in page.get_text("dict")["blocks"]:
            for ln in b.get("lines", []):
                for s in ln["spans"]:
                    t = s["text"].strip()
                    if t:
                        spans.append((s["bbox"][1], s["bbox"][0], t))
        spans.sort()
        clusters: list[dict] = []
        for y, x, t in spans:
            if clusters and abs(y - clusters[-1]["y"]) <= 3:
                clusters[-1]["items"].append((x, t))
            else:
                clusters.append({"y": y, "items": [(x, t)]})
        for cl in clusters:
            left = " ".join(t for x, t in sorted(cl["items"]) if x < 290)
            right = " ".join(t for x, t in sorted(cl["items"]) if x >= 290)
            if _TB_SKIP.search(left) or _TB_SKIP.search(right):
                continue
            if _TB_EXCL.search(left):
                excluded = True
                continue
            if left and right:
                raw.append({"name": (pending + " " + left).strip(), "location": right,
                            "_ex": excluded})
                pending = ""
            elif left:
                pending = (pending + " " + left).strip()
            elif right:
                if pending:
                    raw.append({"name": pending, "location": right, "_ex": excluded})
                    pending = ""
                elif raw:
                    raw[-1]["location"] = (raw[-1]["location"] + " " + right).strip()
    rows = [{"name": re.sub(r"\s+", " ", r["name"]).strip(),
             "location": re.sub(r"\s+", " ", r["location"]).strip()}
            for r in raw if not r["_ex"]]
    for r in rows:                      # 版式错位校正(名字对不上=换版,跳过)
        for key, loc in _TB_PATCH.items():
            if key in r["name"]:
                r["location"] = loc
                break
    for i, r in enumerate(rows):        # 两行被并成一行:名列里印了 Allen 的地址
        if r["name"].startswith("Allen Equipment Contracting") and "Allstate" in r["name"]:
            loc = r["location"]
            rows[i:i + 1] = [
                {"name": "Allen Equipment Contracting Corporation- Allen Contracting Corp",
                 "location": "36 Rubin Dr, Murillo"},
                {"name": "Allstate Insurance Company of Canada", "location": loc}]
            break
    sd = [r for r in rows if r["name"] == "Sovereign Dental"]
    if len(sd) == 2:                    # 第二家 Sovereign Dental 的地址印在名行上方
        sd[0]["location"] = "2& 3-1101 Arthur St W, Thunder Bay"
        sd[1]["location"] = "911 Fort William Rd #3, Thunder Bay, & 1101 Arthur St W Thunder Bay"
    return rows


def thunder_bay() -> dict:
    h = _get(TB_PAGE).text
    pdf_url = None
    for m in re.finditer(r'href="([^"]+\.pdf)"', h):
        if "List of Designated Employers" in h[m.end():m.end() + 400]:
            pdf_url = ihtml.unescape(m.group(1))
            break
    if not pdf_url:
        raise ValueError("Thunder Bay: 页内找不到 List of Designated Employers PDF 链接")
    employers = _thunder_bay_pdf(_get(pdf_url).content)

    j = h.find("Priority Occupations")
    if j < 0:
        raise ValueError("Thunder Bay: Priority Occupations 段不见了")
    ul = _ul_block(h, j)
    occupations = []
    for li in re.findall(r"<li>(.*?)</li>", ul, re.S):
        t = _clean(li)
        m2 = re.match(r"(\d{5})\s+(.+)", t)
        if m2:   # 破折号后全是限制条件附注(TB 清单无带内嵌破折号的职业名)
            occupations.append({"noc": m2.group(1),
                                "title": re.split(r"\s[–—-]\s", m2.group(2))[0].strip(),
                                "sectorOnly": False})
    if not employers or not occupations:
        raise ValueError(f"Thunder Bay: employers={len(employers)} occupations={len(occupations)}")
    return {"employers": employers, "occupations": occupations,
            "employersUrl": pdf_url, "occupationsUrl": TB_PAGE}


EXTRACTORS = {
    "North Bay and Area": north_bay,
    "Sudbury, ON": sudbury,
    "Timmins, ON": timmins,
    "Sault Ste. Marie, ON": sault_ste_marie,
    "Thunder Bay, ON": thunder_bay,
}
