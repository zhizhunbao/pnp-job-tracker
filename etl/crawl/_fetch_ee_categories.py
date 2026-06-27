"""
fetch_ee_categories — 抓联邦 Express Entry「类别抽选」页,展开 DataTables 分页 → 产出
raw/ee/federal-categories.json(全国单一源,按类别分组的 {noc, teer, title})。

canada.ca 走 Akamai 反爬,httpx/WebFetch 吃 403 → 复用 browser_fetch 的 headed 持久浏览器。
表是 WET/DataTables 分页(默认每页 10) → 先把每表设「显示全部」再抽,否则只拿到首页 10 行。

注意:browser_fetch 需要 playwright(系统 Python 有,uv venv 没装)→ 用系统 python 跑:
  PYTHONUTF8=1 python etl/crawl/_fetch_ee_categories.py
"""
import asyncio
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import browser_fetch as bf  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

URL = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/"
       "express-entry/rounds-invitations/category-based-selection.html")
OUT = _paths.EE / "federal-categories.json"

# 类别英文标题关键词 → (短 key, 中文标签)
CAT_MAP = [
    ("healthcare", "healthcare", "医疗社服"), ("Science", "stem", "STEM"), ("trade", "trade", "技工"),
    ("education", "education", "教育"), ("transport", "transport", "运输"), ("physicians", "physicians", "医生"),
    ("senior managers", "senior-managers", "高管"), ("researchers", "researchers", "研究"),
    ("military", "military", "军职"),
]

EXPAND_JS = """() => {
  document.querySelectorAll('select[name$="_length"]').forEach(s => {
    const all = [...s.options].find(o => o.value === '-1') || s.options[s.options.length - 1];
    s.value = all.value; s.dispatchEvent(new Event('change', { bubbles: true }));
  });
}"""
EXTRACT_JS = """() => {
  const nodes = document.querySelectorAll('h2, h3, table');
  let cat = '', out = [];
  nodes.forEach(n => {
    if (n.tagName === 'TABLE') {
      const rows = [...n.querySelectorAll('tr')]
        .map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim()))
        .filter(r => r.length >= 3);
      if (rows.length) out.push({ cat, rows });
    } else { cat = n.innerText.trim(); }
  });
  return out;
}"""


def classify(heading: str):
    for kw, key, lab in CAT_MAP:
        if kw.lower() in heading.lower():
            return key, lab
    return None, None


async def main() -> None:
    page = await bf._ensure_page()
    if page is None:
        print("浏览器不可用(playwright 未装?用系统 python 跑)"); return
    await page.goto(URL, wait_until="domcontentloaded", timeout=45000)
    try:
        await page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass
    await page.evaluate(EXPAND_JS)
    await page.wait_for_timeout(2000)
    blocks = await page.evaluate(EXTRACT_JS)
    await bf.close()

    cats: dict[str, dict] = {}
    for b in blocks:
        key, lab = classify(b["cat"])
        if not key:
            continue
        bucket = cats.setdefault(key, {"key": key, "label": lab, "occupations": [], "_seen": set()})
        for r in b["rows"]:
            noc = next((c for c in r if re.fullmatch(r"\d{5}", c)), None)
            if not noc or noc in bucket["_seen"]:
                continue
            title = max((c for c in r if not re.fullmatch(r"\d{1,5}", c)), key=len, default="")
            teer = next((int(c) for c in r if re.fullmatch(r"[0-5]", c)), None)
            bucket["_seen"].add(noc)
            bucket["occupations"].append({"noc": noc, "teer": teer, "title": title})

    out_cats = [{"key": c["key"], "label": c["label"],
                 "occupations": sorted(c["occupations"], key=lambda x: x["noc"])}
                for c in cats.values()]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "Express Entry category-based selection", "url": URL,
        "fetched": __import__("datetime").date.today().isoformat(), "categories": out_cats,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(c["occupations"]) for c in out_cats)
    print(f"✓ {OUT}  ({len(out_cats)} 类 · {total} 职业)")
    for c in out_cats:
        print(f"  {len(c['occupations']):>3}  {c['label']}")


if __name__ == "__main__":
    asyncio.run(main())
