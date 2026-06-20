"""
AIP designated-employer list — the OFFICIAL per-province "sponsoring employer"
list for the Atlantic Immigration Program (the only PNP route that publishes one).
For a tech grad, this is the authoritative sponsor pool for Atlantic Canada; but as
the data shows, it is overwhelmingly food/retail/care, so the tech-relevant subset
is tiny (this script highlights it).

Sources (official):
  NL — already crawled to data/crawl/nl-immigration/md/employer/*.md (has NAICS + NOC)
  NB — https://www2.gnb.ca/.../designated-employers-employeurs-designes.pdf
  NS — https://liveinnovascotia.com/.../Designated_AIP_employers.pdf
  PE — list source not yet located on princeedwardisland.ca (TODO)

Usage:
  uv run python scripts/jobs/aip_designated_employers.py

Output (data/companies/):
  aip-designated-employers.json / .md   (per province; tech-relevant subset flagged)
"""
import json
import re
from pathlib import Path

import fitz  # PyMuPDF
import httpx

import _paths
PROJECT_ROOT = _paths.ROOT
OUT_DIR = _paths.DESIGNATED
NL_EMP_DIR = _paths.POLICY / "nl-immigration" / "md" / "employer"
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
PDFS = {
    "NB": "https://www2.gnb.ca/content/dam/gnb/Corporate/Promo/Immigration/designated-employers-employeurs-designes.pdf",
    "NS": "https://liveinnovascotia.com/sites/default/files/2024-07/Designated_AIP_employers.pdf",
}
# Name-based tech signal (NB/NS lists give no sector); weak but all we have there.
TECH_NAME = re.compile(
    r"\b(tech|software|systems?|solutions?|digital|data|cyber|network|fibre?net|robotic|"
    r"analytic|computer|electronic|semiconductor|wireless|innovation|labs?|\.io|telecom|"
    r"informatics?|automation|aerospace|engineering|consult)\b", re.I)
# Core tech NOCs (for NL, which carries NOC codes — precise).
TECH_NOC = {"20012", "21211", "21221", "21222", "21223", "21230", "21231", "21232",
            "21233", "21234", "21311", "22220", "22221", "22222"}


_SKIP = ("designated", "employeurs", "current as", "the following", "voici une",
         "this list", "cette liste", "p a g e", "atlantic immigration", "programme",
         "positions with", "if you are", "les postes", "si vous")


def parse_pdf_bullets(prov: str, url: str) -> list[dict]:
    data = httpx.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=40).content
    doc = fitz.open(stream=data, filetype="pdf")
    full = "\n".join(p.get_text() for p in doc)
    rows, seen = [], set()
    # Each employer is introduced by a "•" bullet; the name is the first non-empty
    # line after it (handles both "• name" and "•\nname"). Split on the bullet char.
    for chunk in full.split("•")[1:]:
        first = next((ln.strip() for ln in chunk.splitlines() if ln.strip()), "")
        if not first:
            continue
        name = re.sub(r"\s+", " ", first).strip(" .")
        low = name.lower()
        if len(name) < 3 or any(s in low for s in _SKIP) or re.fullmatch(r"[\d()/\-, ]+", name):
            continue
        loc = ""
        tail = re.search(r"\s[-–]\s([A-Za-z .'/]+)$", name)  # NS appends " - City"
        if tail and prov == "NS":
            loc, name = tail.group(1).strip(), name[:tail.start()].strip()
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        rows.append({"province": prov, "employer": name, "location": loc,
                     "tech": bool(TECH_NAME.search(name))})
    return rows


def load_nl() -> list[dict]:
    rows = []
    title_re = re.compile(r'^title:\s*"?(.+?)"?\s*$', re.M)
    for f in sorted(NL_EMP_DIR.glob("*.md")):
        t = f.read_text(encoding="utf-8", errors="ignore")
        if "NOC's Requested" not in t:
            continue
        tm = title_re.search(t)
        name = tm.group(1).strip() if tm else f.stem
        name = re.split(r"\s+-\s+Office", name)[0].strip()  # drop site suffix
        loc_m = re.search(r"\*\*Location\*\*\s*\n\s*(.+)", t)
        nocs = re.findall(r"\b\d{5}\b", t)
        rows.append({"province": "NL", "employer": name,
                     "location": loc_m.group(1).strip() if loc_m else "",
                     "tech": any(n in TECH_NOC for n in nocs) or bool(TECH_NAME.search(name))})
    return rows


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = load_nl()
    for prov, url in PDFS.items():
        rows += parse_pdf_bullets(prov, url)

    by_prov: dict = {}
    for r in rows:
        by_prov.setdefault(r["province"], []).append(r)

    (OUT_DIR / "aip-designated-employers.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    NAME = {"NL": "纽芬兰与拉布拉多（NL）", "NB": "新不伦瑞克（NB）",
            "NS": "新斯科舍（NS）", "PE": "爱德华王子岛（PE）"}
    L = ["# 大西洋四省 · AIP 官方指定（担保）雇主名单\n",
         "> AIP 是唯一公布官方指定雇主名单的路线。下表是各省**全量**雇主数与**科技相关**子集。",
         "> 现实：名单 90%+ 是餐饮/零售/护理，科技雇主极少——印证了'大西洋雇主路对科技背景太窄'。\n",
         "| 省 | 指定雇主总数 | 科技相关 | 占比 |", "|---|---:|---:|---:|"]
    for prov in ["NL", "NB", "NS", "PE"]:
        rs = by_prov.get(prov, [])
        if not rs:
            L.append(f"| {NAME[prov]} | （未抓到/无源）| — | — |")
            continue
        techn = sum(1 for r in rs if r["tech"])
        L.append(f"| {NAME[prov]} | {len(rs)} | {techn} | {techn/len(rs)*100:.0f}% |")

    for prov in ["NL", "NB", "NS"]:
        rs = [r for r in by_prov.get(prov, []) if r["tech"]]
        if not rs:
            continue
        L.append(f"\n## {NAME[prov]} — 科技相关指定雇主（{len(rs)} 家）\n")
        L.append("| 雇主 | 地点 |")
        L.append("|---|---|")
        for r in sorted(rs, key=lambda r: r["employer"].lower()):
            L.append(f"| {r['employer']} | {r['location']} |")

    L.append("\n> 注：NB/NS 名单无行业字段，科技判定靠公司名关键词（偏宽，含工程/咨询）；NL 用 NOC（精确）。")
    L.append("> PE（爱德华王子岛）官方名单源未在 topic 页找到，待定位后补入。")
    L.append("\n*由 `scripts/jobs/aip_designated_employers.py` 生成。*")
    (OUT_DIR / "aip-designated-employers.md").write_text("\n".join(L), encoding="utf-8")

    print("Province | total | tech")
    for prov in ["NL", "NB", "NS"]:
        rs = by_prov.get(prov, [])
        print(f"  {prov}: {len(rs):4} | {sum(1 for r in rs if r['tech'])}")
    print(f"\n→ {OUT_DIR / 'aip-designated-employers.md'}")


if __name__ == "__main__":
    main()
