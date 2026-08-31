# -*- coding: utf-8 -*-
"""on.py — ON 法语社区(Superior East Region)指定雇主/优先职业抽取器(E6-11 批C,2026-08-15)。

社区(键=fcip-communities.json 官方名)与源:
  Superior East Region, ON 雇主=fcip-employers 页 ul;职业=fcip 页文本块 NOC 行

批E 拆分改动(2026-08-31,pilot 拆三域;Frank「拆成三个 很少有人有法语」):本文件自
etl/pilot/extractors/on.py 拆出 —— SE_EMP_URL / SE_OCC_URL 两常量与 superior_east()
**函数体一字未改**;共用私件 UA / TIMEOUT / _get / _clean / _cut_note 是与
etl/rcip/extractors/on.py 的**镜像**(常量各域自抄先例:同一段代码两域各留一份,
改一边记得改另一边)。ON 的其余五个社区留在 rcip 域,**其中 Sudbury/Timmins 是双身份社区**:
IRCC 名单页 Rural 与 Francophone 两节都列它俩,抽取只在 rcip 做一次(拍板点 8-②),
本域不重复抽取 —— 所以本文件只有 Superior East 一个键。

红线:宁缺勿猜(excluded/de-designated 剔,拿不准的行不要);解析不到就抛异常,总控保旧。
"""
from __future__ import annotations

import html as ihtml
import re

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


# ---------------------------------------------------------------- Superior East
SE_EMP_URL = "https://superioreastcfdc.ca/superioreastcfdc.ca/index.php/en-ca/fcip/fcip-employers"
SE_OCC_URL = "https://superioreastcfdc.ca/superioreastcfdc.ca/index.php/en-ca/fcip"


def superior_east() -> dict:
    h = _get(SE_EMP_URL).text
    m = re.search(r"Designated Employers</h3>.*?<ul>(.*?)</ul>", h, re.S)
    if not m:
        raise ValueError("Superior East: Designated Employers 列表不见了")
    employers = [{"name": _clean(li), "location": ""}
                 for li in re.findall(r"<li>(.*?)</li>", m.group(1), re.S) if _clean(li)]

    ho = _get(SE_OCC_URL).text
    occupations, seen = [], set()
    # 职业散在 sppb 文本块里,<p>/<br> 断行后逐行收 NOC 行
    txt = re.sub(r"<[^>]+>", "\n", re.sub(r"<(?:br[^>]*|/p|/h6)>", "\n", ho))
    for line in txt.splitlines():
        t = re.sub(r"\s+", " ", ihtml.unescape(line)).strip()
        m2 = re.match(r"(\d{5})\s*(?:[–—-]\s*)?([A-Za-z].+)", t)
        if m2 and m2.group(1) not in seen:
            seen.add(m2.group(1))
            occupations.append({"noc": m2.group(1), "title": _cut_note(m2.group(2)),
                                "sectorOnly": False})
    if not employers or not occupations:
        raise ValueError(f"Superior East: employers={len(employers)} occupations={len(occupations)}")
    return {"employers": employers, "occupations": occupations,
            "employersUrl": SE_EMP_URL, "occupationsUrl": SE_OCC_URL}


EXTRACTORS = {
    "Superior East Region, ON": superior_east,
}
