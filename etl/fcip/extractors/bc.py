"""bc — BC 法语社区(Kelowna)指定雇主/优先职业抽取(E6-11 批C,2026-08-15)。

社区与源(批B 2026-08-15 实测基线:雇主 52,职业 25):
  Kelowna, BC                雇主=官方页 designated-employers__list 全量名单;职业=官方页「Priority occupation 2026」链接的 Google Doc

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):本文件自
etl/pilot/extractors/bc.py 拆出 —— KEL_URL 常量与 kelowna() **函数体一字未改**;
共用私件 UA / TIMEOUT / _get / _text / _dedupe 是与 etl/rcip/extractors/bc.py 的**镜像**
(常量各域自抄先例:同一段代码两域各留一份,改一边记得改另一边);
BC 的另外三个社区(West Kootenay / North Okanagan Shuswap / Peace Liard)是乡村试点,留在 rcip 域。

约定:剔 de-designated;not-hiring 保留(『指定』≠『在招』);宁缺勿猜 —— 结构对不上就抛异常,总控保旧。
"""
import re
from html import unescape

import httpx

UA = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")}
TIMEOUT = 60

KEL_URL = "https://www.sdecb.com/en/pilot-program/"


def _get(url: str) -> httpx.Response:
    r = httpx.get(url, headers=UA, follow_redirects=True, timeout=TIMEOUT)
    r.raise_for_status()
    return r


def _text(html_fragment: str) -> str:
    """去标签 + 实体解码 + 空白归一。"""
    return " ".join(unescape(re.sub(r"<[^>]+>", " ", html_fragment)).split())


def _dedupe(rows: list[dict]) -> list[dict]:
    """按 name 去重保首条(与批B 合并口径一致)。"""
    seen: set[str] = set()
    out = []
    for r in rows:
        if r["name"] and r["name"] not in seen:
            seen.add(r["name"])
            out.append(r)
    return out


# ---------------------------------------------------------------------- Kelowna
def kelowna() -> dict:
    html = _get(KEL_URL).text
    m = re.search(r"designated-employers__list.*?<ul>(.*?)</ul>", html, re.S)
    if not m:
        raise ValueError("Kelowna 页找不到 designated-employers__list 全量名单")
    employers = _dedupe([
        {"name": re.sub(r"\s*\(not hiring[^)]*\)\s*$", "", _text(li), flags=re.I),
         "location": "Kelowna"}
        for li in re.findall(r"<li>(.*?)</li>", m.group(1), re.S) if _text(li)])

    # 「Priority occupation 2026」按钮 → 官方 Google Doc(export?format=txt 可取)
    m = re.search(r'<a[^>]+href="(https://docs\.google\.com/document/d/[A-Za-z0-9_-]+)'
                  r'[^"]*"[^>]*>(?:(?!</a>).)*?Priority occupation', html, re.S)
    if not m:
        raise ValueError("Kelowna 页找不到 Priority occupation 的 Google Doc 链接")
    doc_text = _get(m.group(1) + "/export?format=txt").text
    # 「List of 25 Priority Occupations」段起:NOC 行(5位数字独占一行)→ 下一非空行=职业名
    start = doc_text.find("Priority Occupations")
    lines = [ln.strip() for ln in doc_text[max(start, 0):].splitlines()]
    occupations = []
    for i, ln in enumerate(lines):
        if re.fullmatch(r"\d{5}", ln):
            title = next((x for x in lines[i + 1:] if x), "")
            if title:
                occupations.append({"noc": ln, "title": " ".join(title.split()),
                                    "sectorOnly": False})
    return {"employers": employers, "occupations": occupations,
            "employersUrl": KEL_URL, "occupationsUrl": KEL_URL}


EXTRACTORS = {
    "Kelowna, BC": kelowna,
}
