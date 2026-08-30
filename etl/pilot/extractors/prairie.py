# -*- coding: utf-8 -*-
"""prairie — 草原区 6 社区(SK/AB/MB)指定雇主+优先职业抽取(E6-11 批C,2026-08-15)。

社区与源(批B 实测口径;基线 雇主 147/23/42/23/39/6,职业 25~27):
  Moose Jaw, SK        雇主=官方 PDF(/candidates/ 页发现链接,原件重复段去重) 职业=/employers/ 页表格
  Claresholm, AB       单页站:雇主 <li>(HIRING/NOT HIRING 状态行一律保留) 职业=行业绑定行(同 NOC 可多行)
  Steinbach, MB        雇主=官方 PDF(/rcip/ 页发现链接) 职业=/rcip/ 页 <p> 行(移动/桌面双份渲染,去重)
  Altona/Rhineland, MB 雇主/职业=两张 eael 数据表(td-content 单元格)
  Brandon, MB          雇主=两列名单表(逐家备注列忽略) 职业=优先表 NOC 链接锚文本
  St. Pierre Jolys, MB 雇主=官方 PDF(FCIP 主页发现链接,▪ 分条) 职业=priority 页 <li>

红线:宁缺勿猜 —— NOC 必须 5 位数字;解析为 0 行直接抛异常,总控(build_pilot_details)保旧。
"""
import html as _htmllib
import re
import socket
import ssl
from urllib.parse import urljoin, urlsplit

import fitz
import httpx

UA = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")}
TIMEOUT = 60
_DASH = r"[–—-]"  # 官方页 en/em dash 与连字符混用


def _aia_context(url: str) -> ssl.SSLContext:
    """AIA 补链:服务器漏发中间证书时(Brandon 官网实况),按叶证书里的
    CA Issuers URL 下载中间证书补进校验上下文 —— 链条仍必须锚定到 certifi
    受信根,校验不打折(等价浏览器的 AIA chasing,绝不 verify=False)。"""
    host = urlsplit(url).hostname or ""
    port = urlsplit(url).port or 443
    probe = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    probe.check_hostname = False
    probe.verify_mode = ssl.CERT_NONE  # 仅取叶证书原文,不作为信任依据
    with socket.create_connection((host, port), TIMEOUT) as sock:
        with probe.wrap_socket(sock, server_hostname=host) as tls:
            leaf_der = tls.getpeercert(binary_form=True) or b""
    pems = []
    for u in re.findall(rb"http://[\x21-\x7e]+?\.(?:crt|cer|der|pem)", leaf_der):
        body = httpx.get(u.decode("ascii"), timeout=TIMEOUT, follow_redirects=True).content
        pems.append(body.decode("ascii") if b"BEGIN CERTIFICATE" in body
                    else ssl.DER_cert_to_PEM_cert(body))
    if not pems:
        raise ssl.SSLCertVerificationError(f"{host}: 叶证书无可用 CA Issuers URL,无法补链")
    ctx = ssl.create_default_context()
    ctx.load_verify_locations(cadata="\n".join(pems))
    return ctx


def _get(url: str) -> httpx.Response:
    try:
        r = httpx.get(url, headers=UA, timeout=TIMEOUT, follow_redirects=True)
    except httpx.ConnectError as e:
        if "CERTIFICATE_VERIFY_FAILED" not in str(e):
            raise
        r = httpx.get(url, headers=UA, timeout=TIMEOUT, follow_redirects=True,
                      verify=_aia_context(url))
    r.raise_for_status()
    return r


def _pdf(url: str) -> fitz.Document:
    return fitz.open(stream=_get(url).content, filetype="pdf")


def _tidy(text: str) -> str:
    """并空白 + 弯引号归直引号(批B 底本口径,避免刷新时全量行churn)。"""
    return re.sub(r"\s+", " ", text).replace("’", "'").strip()


def _clean(fragment: str) -> str:
    """HTML 片段 → 纯文本单行(去标签、解实体、并空白)。"""
    return _tidy(_htmllib.unescape(re.sub(r"<[^>]+>", " ", fragment)))


def _html_lines(page_html: str) -> list[str]:
    """整页 HTML → 文本行(每个标签断行),供逐行状态机解析。"""
    h = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", page_html, flags=re.S | re.I)
    h = _htmllib.unescape(re.sub(r"<[^>]+>", "\n", h))
    return [re.sub(r"\s+", " ", ln).strip() for ln in h.splitlines() if ln.strip()]


def _find_pdf_url(page_html: str, base_url: str, pattern: str) -> str:
    m = re.search(r'href="([^"]*(?:%s)[^"]*)"' % pattern, page_html, re.I)
    if not m:
        raise ValueError(f"官方页找不到 PDF 链接(pattern={pattern})")
    # 只还原 &amp; —— 整串 unescape 会把查询串里的 &curren… 吃成 ¤(St. Pierre 实撞)
    return urljoin(base_url, m.group(1).replace("&amp;", "&"))


def _require(rows: list, what: str) -> list:
    if not rows:
        raise ValueError(f"{what} 解析 0 行 —— 源疑似改版")
    return rows


# ---------------------------------------------------------------- Moose Jaw, SK
_MJ_CANDIDATES = "https://rcip.mjchamber.com/candidates/"
_MJ_OCC_URL = "https://rcip.mjchamber.com/employers/"
# PDF 顶部的告示段(勿群发邮件等),按关键词剔行;雇主名最长 5~6 词,≥8 词的行必是正文句
_MJ_NOTICE = re.compile(
    r"important notice|use the rcip|already employed|accepting new application|mass email"
    r"|best way to participate|actively advertised|match your skills|successful applicants"
    r"|secure local employment|supported for designation", re.I)


def moose_jaw() -> dict:
    pdf_url = _find_pdf_url(_get(_MJ_CANDIDATES).text, _MJ_CANDIDATES,
                            r"designated[^\"]*\.pdf")
    employers, seen = [], set()
    with _pdf(pdf_url) as doc:
        for page in doc:
            for raw in page.get_text().splitlines():
                line = _tidy(raw)
                if (not line or line.startswith("**") or len(line.split()) >= 8
                        or _MJ_NOTICE.search(line)):
                    continue
                if line.lower() in seen:  # 原件 Briercrest College / Capilano Court 各重复一次
                    continue
                seen.add(line.lower())
                employers.append({"name": line, "location": ""})

    h = _get(_MJ_OCC_URL).text
    i = h.find("Priority Occupations")
    table = h[i:h.find("</table>", i)] if i >= 0 else ""
    occupations = [
        {"noc": noc, "title": _clean(title), "sectorOnly": False}
        for noc, title in re.findall(
            r"<td[^>]*>\s*(\d{5})\s*</td>\s*<td[^>]*>(.*?)</td>", table, re.S)
    ]
    return {"employers": _require(employers, "Moose Jaw 雇主"),
            "occupations": _require(occupations, "Moose Jaw 职业"),
            "employersUrl": pdf_url, "occupationsUrl": _MJ_OCC_URL}


# -------------------------------------------------------------- Claresholm, AB
_CL_URL = "https://claresholm-rcip.ca/"
# 雇主行形如「Name – 6, Sales & Services – NOT HIRING」;状态行一律保留(不因 NOT HIRING 剔除)
_CL_EMP = re.compile(
    r"^(?P<name>.+?)\s*%s\s*\d\s*,\s*.+?\s*%s\s*(?:NOT\s+HIRING|HIRING)$" % (_DASH, _DASH), re.I)


def claresholm() -> dict:
    h = _get(_CL_URL).text
    employers = []
    for li in re.findall(r"<li[^>]*>(.*?)</li>", h, re.S):
        m = _CL_EMP.match(_clean(li))
        if m:
            employers.append({"name": m.group("name"), "location": ""})

    # 职业:行业绑定(同 NOC 可多行);「To be used by X:」限定语并入随后各行标题
    occupations, qualifier = [], ""
    for line in _html_lines(h):
        if re.match(r"^\d\s*%s\s*\D" % _DASH, line):  # 行业标题(单位数编号)→ 限定语失效
            qualifier = ""
            continue
        m = re.match(r"^To be used by\s+(.+?)\s*:$", line, re.I)
        if m:
            qualifier = m.group(1)
            continue
        m = re.match(r"^(\d{5})\s*%s\s*(.+)$" % _DASH, line)
        if m:
            title = m.group(2) + (f" ({qualifier})" if qualifier else "")
            occupations.append({"noc": m.group(1), "title": title, "sectorOnly": False})
    return {"employers": _require(employers, "Claresholm 雇主"),
            "occupations": _require(occupations, "Claresholm 职业"),
            "employersUrl": _CL_URL, "occupationsUrl": _CL_URL}


# --------------------------------------------------------------- Steinbach, MB
_SB_URL = "https://steinbachedc.com/rcip/"
_SB_SKIP = re.compile(r"steinbachedc\.com|list of designated employers|reimer ave", re.I)


def steinbach() -> dict:
    h = _get(_SB_URL).text
    pdf_url = _find_pdf_url(h, _SB_URL, r"designated[-_ ]?employers[^\"]*\.pdf")
    employers = []
    with _pdf(pdf_url) as doc:
        for page in doc:
            for raw in page.get_text().splitlines():
                # PDF 排版伪影「Manitoba Health -Health…」→ 连字号两侧补齐空格
                line = re.sub(r" -(?=[A-Za-z])", " - ", _tidy(raw))
                if line and not _SB_SKIP.search(line):
                    employers.append({"name": line, "location": ""})

    # 职业清单在 /rcip/ 页移动/桌面两个 tab 各渲染一次 → 按 (noc,title) 有序去重
    occupations, seen = [], set()
    i = h.find("Priority Occupations")
    for noc, title in re.findall(
            r"<p>\s*(\d{5})\s*(?:&#8211;|%s)\s*(.*?)\s*</p>" % _DASH, h[max(i, 0):], re.S):
        key = (noc, _clean(title))
        if key not in seen:
            seen.add(key)
            occupations.append({"noc": noc, "title": _clean(title), "sectorOnly": False})
    return {"employers": _require(employers, "Steinbach 雇主"),
            "occupations": _require(occupations, "Steinbach 职业"),
            "employersUrl": pdf_url, "occupationsUrl": _SB_URL + "#priority"}


# -------------------------------------------------------- Altona/Rhineland, MB
_AL_EMP_URL = "https://ared-rpga.com/immigration/rcip-employers/"
_AL_OCC_URL = "https://ared-rpga.com/immigration/rcip-sector/"


def _td_cells(page_html: str) -> list[str]:
    return [_clean(c) for c in
            re.findall(r'<div class="td-content">(.*?)</div>', page_html, re.S)]


def altona_rhineland() -> dict:
    employers = [{"name": c, "location": ""} for c in _td_cells(_get(_AL_EMP_URL).text) if c]

    # 三列表(NOC / 职业名 / 行业)拍平成单元格流:5 位数字起一行,取其后一格为标题
    cells = _td_cells(_get(_AL_OCC_URL).text)
    occupations = [
        {"noc": cells[i], "title": cells[i + 1], "sectorOnly": False}
        for i in range(len(cells) - 1) if re.fullmatch(r"\d{5}", cells[i])
    ]
    return {"employers": _require(employers, "Altona/Rhineland 雇主"),
            "occupations": _require(occupations, "Altona/Rhineland 职业"),
            "employersUrl": _AL_EMP_URL, "occupationsUrl": _AL_OCC_URL}


# ----------------------------------------------------------------- Brandon, MB
_BR_EMP_URL = "https://economicdevelopmentbrandon.com/rcip/rcip-list-of-designated-employers"
_BR_OCC_URL = "https://economicdevelopmentbrandon.com/rcip/rcip-sector-labour-market-priorities-list"


def brandon() -> dict:
    h = _get(_BR_EMP_URL).text
    employers = []
    for table in re.findall(r"<table[^>]*>(.*?)</table>", h, re.S):
        if "Designated Employers" not in table:
            continue
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table, re.S):
            tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            name = _clean(tds[0]) if tds else ""
            # 首列=雇主名;次列逐家备注(在招状态等)按拍板忽略,行保留
            if name and name.lower() != "designated employers":
                employers.append({"name": name, "location": ""})
        break

    occupations = [
        {"noc": noc, "title": _clean(title), "sectorOnly": False}
        for noc, title in re.findall(
            r"NOCProfile\?code=\d+[^>]*>\s*(\d{5})\s*%s\s*([^<]+)</a>" % _DASH,
            _get(_BR_OCC_URL).text)
    ]
    return {"employers": _require(employers, "Brandon 雇主"),
            "occupations": _require(occupations, "Brandon 职业"),
            "employersUrl": _BR_EMP_URL, "occupationsUrl": _BR_OCC_URL}


# ------------------------------------------------------- St. Pierre Jolys, MB
_SP_HOME = "https://villagestpierrejolys.ca/p/francophone-communities-immigration-pilot-program"
_SP_OCC_URL = "https://villagestpierrejolys.ca/p/priority-sectors-and-occupations"


def st_pierre_jolys() -> dict:
    pdf_url = _find_pdf_url(_get(_SP_HOME).text, _SP_HOME, r"fileName=Designated[^\"]*\.pdf")
    employers = []
    with _pdf(pdf_url) as doc:
        text = "\n".join(page.get_text() for page in doc)
    for chunk in text.split("▪")[1:]:  # PDF 按 ▪ 分条,每条首个非空行=雇主名
        name = next((_tidy(ln) for ln in chunk.splitlines() if ln.strip()), "")
        name = re.sub(r"\s*%s?\s*\[not\s*hiring\]\s*$" % _DASH, "", name, flags=re.I)  # 状态剥离,行保留
        name = re.sub(r"(\w)-\s+(\w)", r"\1-\2", name)  # PDF 断行伪影「Franco- manitobaine」
        if name:
            employers.append({"name": name, "location": ""})

    h = _get(_SP_OCC_URL).text
    i = h.find("Priority Occupations")
    occupations = [
        {"noc": noc, "title": _clean(title), "sectorOnly": False}
        for noc, title in re.findall(
            r"<li>\s*(\d{5})\s*%s\s*(.*?)\s*</li>" % _DASH, h[max(i, 0):], re.S)
    ]
    return {"employers": _require(employers, "St. Pierre Jolys 雇主"),
            "occupations": _require(occupations, "St. Pierre Jolys 职业"),
            "employersUrl": pdf_url, "occupationsUrl": _SP_OCC_URL}


EXTRACTORS = {
    "Moose Jaw, SK": moose_jaw,
    "Claresholm, AB": claresholm,
    "Steinbach, MB": steinbach,
    "Altona/Rhineland, MB": altona_rhineland,
    "Brandon, MB": brandon,
    "St. Pierre Jolys, MB": st_pierre_jolys,
}
