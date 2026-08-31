# -*- coding: utf-8 -*-
"""prairie — 草原区法语社区(St. Pierre Jolys, MB)指定雇主+优先职业抽取(E6-11 批C,2026-08-15)。

社区与源(批B 实测口径;基线 雇主 6,职业 25):
  St. Pierre Jolys, MB 雇主=官方 PDF(FCIP 主页发现链接,▪ 分条) 职业=priority 页 <li>

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):本文件自
etl/pilot/extractors/prairie.py 拆出 —— _SP_HOME / _SP_OCC_URL 两常量与 st_pierre_jolys()
**函数体一字未改**;共用私件 UA / TIMEOUT / _DASH / _aia_context / _get / _pdf / _tidy /
_clean / _find_pdf_url / _require 是与 etl/rcip/extractors/prairie.py 的**镜像**
(常量各域自抄先例:同一段代码两域各留一份,改一边记得改另一边);草原区另外五个社区
(Moose Jaw / Claresholm / Steinbach / Altona-Rhineland / Brandon)是乡村试点,留在 rcip 域。

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


# ------------------------------------------------------- St. Pierre Jolys, MB
_SP_HOME = "https://villagestpierrejolys.ca/p/francophone-communities-immigration-pilot-program"
_SP_OCC_URL = "https://villagestpierrejolys.ca/p/priority-sectors-and-occupations"


def st_pierre_jolys() -> dict:
    pdf_url = _find_pdf_url(_get(_SP_HOME).text, _SP_HOME, r"fileName=Designated[^\"]*\.pdf")
    employers = []
    with _pdf(pdf_url) as doc:
        # pyrefly: ignore[no-matching-overload] — pymupdf get_text() 无参档位恒返回 str,存根把三档位并成 str|list|dict
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
    "St. Pierre Jolys, MB": st_pierre_jolys,
}
