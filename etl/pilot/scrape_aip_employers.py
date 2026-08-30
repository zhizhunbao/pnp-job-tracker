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

B4 判定留痕(2026-08-08,docs/implementation/在招担保雇主/04_B4 §3c):
  NS/NB 官方名录 PDF **不带 NOC 维度**(列=雇主名/地点;本脚本 parse 实核)——职业级精筛
  只能走岗位侧(jobs.noc × aip),别在名录侧造字段。NL 的 NOC 维度在 nl-imm crawl(C4 已入库)。
  保鲜=本脚本在 pnp 源容器时更(docker-compose SOURCE=pnp,SCRAPE_INTERVAL 3600)。

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

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _paths 等共享库
import _paths
PROJECT_ROOT = _paths.ROOT
OUT_DIR = _paths.AIP
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


# ── PE(B4 §3b,2026-08-08):官方只发网页不发文件,页面在 Radware WAF 后(不绕验证码)。
# 数据经 web.archive.org 存档快照 httpx 直取(存档站公开;快照 1-3 月一存)——staleness 以快照里
# 页面自带的 Published date 为准。2026-04-19 快照实核 391 家(A-Z <li> 列表,首条 100066 PEI Inc.)。
PE_PAGE = ("https://www.princeedwardisland.ca/en/information/office-of-immigration/"
           "atlantic-immigration-program-designated-employers")
PE_MIN_ROWS = 300   # 解析量 sanity 下限:低于它=解析坏了/快照残缺 → 保旧不清空(宁可留旧)


def load_pe() -> list[dict]:
    try:
        cdx = httpx.get("http://web.archive.org/cdx/search/cdx",
                        params={"url": PE_PAGE, "output": "json", "filter": "statuscode:200", "limit": "-5"},
                        headers={"User-Agent": USER_AGENT}, timeout=90).json()
        ts = max(row[1] for row in cdx[1:])   # 首行是表头
        html = httpx.get(f"http://web.archive.org/web/{ts}/{PE_PAGE}",
                         headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=60).text
    except Exception as e:
        print(f"  PE: Wayback 取档失败({e}),本轮保旧")
        return _pe_previous()
    # 名单区= <li> 纯文本项(快照实核干净无导航混入);去 tag、HTML 实体还原
    items = re.findall(r"<li[^>]*>\s*([^<]+?)\s*</li>", html)
    import html as _html
    names = []
    for it in items:
        name = _html.unescape(it).strip()
        # 导航/页脚 li 的典型词剔除;真雇主名不含这些
        if not name or len(name) > 120 or re.search(r"(?i)(home|contact|privacy|feedback|government|service|about pei|français)$", name):
            continue
        names.append(name)
    if len(names) < PE_MIN_ROWS:
        print(f"  PE: 解析仅 {len(names)} 行(<{PE_MIN_ROWS}),疑残缺,本轮保旧")
        return _pe_previous()
    print(f"  PE: Wayback {ts[:8]} 快照 {len(names)} 家")
    return [{"province": "PE", "employer": n, "location": "",
             "tech": bool(TECH_NAME.search(n)), "asOf": ts[:8]} for n in names]


def _pe_previous() -> list[dict]:
    return _previous("PE")


# ── 解析量护栏(2026-08-12 实撞):NB 官方 PDF 换版 → bullet 切不出来,**1263 家被 29 家静默覆盖**,
#    一路灌进 mart(3322→2088)与判定层,没有任何报错。PE 早就有这道闸(PE_MIN_ROWS),
#    只是没推广到别的省 —— 一个省栽过的坑,别的省照样能栽。
#    规矩:解析量低于下限 = 解析坏了,**保旧不清空**并大声喊;宁可数据旧,不可数据没。
# NL 在**本文件**里是旧聚合源(94 家);官方全量 639 家走 raw/pnp/nl-employers.json,
# 由 09_build_mart 整省让位替换 —— 所以这里的 NL 下限按 94 定,别拿 639 当基线。
MIN_ROWS = {"NL": 80, "NB": 800, "NS": 1000, "PE": PE_MIN_ROWS}


def _previous(prov: str) -> list[dict]:
    """上一轮落盘里该省的行(解析塌方时的兜底)。"""
    f = OUT_DIR / "aip-designated-employers.json"
    if f.exists():
        try:
            return [r for r in json.loads(f.read_text(encoding="utf-8")) if r.get("province") == prov]
        except Exception:  # noqa: BLE001 — 读不出旧档就只能返回空,但仍不覆盖(见 main 的判断)
            pass
    return []


def guard(prov: str, parsed: list[dict]) -> list[dict]:
    """解析量塌方 → 退回上一轮该省的行;上一轮也没有才认这次的结果。"""
    floor = MIN_ROWS.get(prov, 0)
    if len(parsed) >= floor:
        return parsed
    old = _previous(prov)
    print(f"  [WARN] {prov}: 解析仅 {len(parsed)} 行(下限 {floor})—— 疑似官方页/PDF 换版,"
          f"{'保旧 ' + str(len(old)) + ' 行不清空' if old else '且无旧档可退,按解析结果落盘'}")
    return old or parsed


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # 每一路都过 guard:任何一省解析塌方都不许把上一轮的行冲掉(见 MIN_ROWS 注释的 NB 实撞)
    rows = guard("NL", load_nl())
    for prov, url in PDFS.items():
        try:
            parsed = parse_pdf_bullets(prov, url)
        except Exception as e:  # noqa: BLE001 — 单省取档失败不该拖垮整份名录
            print(f"  [WARN] {prov}: 取 PDF 失败({e})")
            parsed = []
        rows += guard(prov, parsed)
    rows += load_pe()   # PE 自带同款闸(load_pe 内部判 PE_MIN_ROWS)

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
