"""build_ee_categories — 联邦 Express Entry「类别抽选」职业清单(httpx 直取,替代 crawl 浏览器版)。

canada.ca 该页 2026-07 实测 httpx 200 无 Akamai;DataTables 只是前端分页,原始 HTML 表格行全量
→ bs4 直接解析,无需浏览器。产出与旧 etl/crawl/_fetch_ee_categories.py 完全同构:
raw/ee/federal-categories.json  {source,url,fetched,categories:[{key,label,occupations:[{noc,teer,title}]}]}

失败安全:抓不到 / 解析出的类别为空 → 跳过写盘、保留旧表(源站改版时不丢数据)。
旧浏览器版保留作硬墙回退(源站若重新上 Akamai,把 ee 源 steps 换回去即可)。

Usage:  uv run python etl/build_ee_categories.py
"""
import datetime
import json
import re
import sys
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

URL = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/"
       "express-entry/rounds-invitations/category-based-selection.html")
OUT = _paths.EE / "federal-categories.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# 类别英文标题关键词 → (短 key, 中文标签)。与旧 crawl 版 CAT_MAP 一致(join 键不变)。
CAT_MAP = [
    ("healthcare", "healthcare", "医疗社服"), ("science", "stem", "STEM"), ("trade", "trade", "技工"),
    ("education", "education", "教育"), ("transport", "transport", "运输"), ("physicians", "physicians", "医生"),
    ("senior managers", "senior-managers", "高管"), ("researchers", "researchers", "研究"),
    ("military", "military", "军职"),
]


def classify(heading: str):
    h = (heading or "").lower()
    for kw, key, lab in CAT_MAP:
        if kw in h:
            return key, lab
    return None, None


def main() -> None:
    r = httpx.get(URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    cats: dict[str, dict] = {}
    for table in soup.find_all("table"):
        prev = table.find_previous(["h2", "h3", "h4"])
        key, lab = classify(prev.get_text(" ", strip=True) if prev else "")
        if not key:
            continue  # 非类别表(抽选历史/汇总)按标题自动跳过
        bucket = cats.setdefault(key, {"key": key, "label": lab, "occupations": [], "_seen": set()})
        for tr in table.find_all("tr"):
            cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
            if len(cells) < 2:
                continue
            noc = next((c for c in cells if re.fullmatch(r"\d{5}", c)), None)
            if not noc or noc in bucket["_seen"]:
                continue
            title = max((c for c in cells if not re.fullmatch(r"\d{1,5}", c)), key=len, default="")
            teer = next((int(c) for c in cells if re.fullmatch(r"[0-5]", c)), None)
            bucket["_seen"].add(noc)
            bucket["occupations"].append({"noc": noc, "teer": teer, "title": title})

    out_cats = [{"key": c["key"], "label": c["label"],
                 "occupations": sorted(c["occupations"], key=lambda x: x["noc"])}
                for c in cats.values() if c["occupations"]]
    total = sum(len(c["occupations"]) for c in out_cats)
    if not out_cats:  # 源站改版/解析失败 → 保留旧表
        print(f"⚠ 解析为空,保留旧表 {OUT}(源站可能改版,需人工核查)"); return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "Express Entry category-based selection", "url": URL,
        "fetched": datetime.date.today().isoformat(), "categories": out_cats,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  ({len(out_cats)} 类 · {total} 职业)")
    for c in out_cats:
        print(f"  {len(c['occupations']):>3}  {c['label']}")


if __name__ == "__main__":
    main()
