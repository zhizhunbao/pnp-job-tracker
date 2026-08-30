"""
build_sk — SK(萨斯喀彻温)SINP 三条 Talent Pathway 的职业清单(每省一个 build 脚本,完全自包含)。

**实时抓**:httpx 直取省政府页 → 复用 crawl 的 HTML→md 转换器(原始 HTML 里 NOC 混在脚本哈希里,
必须经转换器抽干净)→ 同一套 NOC 正则解析。saskatchewan.ca 用浏览器 UA 直连 200(无真挑战,
那个 cloudflare email-decode 脚本是误报)。抓不到/解析空 → 跳过、保留旧表(宁可留旧也不留空)。
产出 raw/pnp/sk-health.json · sk-tech.json · sk-agri.json;08_score 目录驱动读 → SK 具名通道。

Usage:  uv run python etl/pnp/build_sk.py   (需 httpx+bs4,系统 python 没装 → 用 .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))          # etl/ → _paths
import _paths
from crawl.functions import convert_md
from crawl.scheme import ConvertIn

PROVINCE = "SK"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
_SK = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
       "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/")
# 每条 = 一个 inclusion 具名通道(实时 URL / 输出文件 / 通道英文名 / 前端短标签)
# E6-09 全省核查(2026-07-25):三张清单与官方逐条吻合,但语义比「in-demand」窄——这三条都是
# Talent Pathway,除了 NOC 在清单内,还要**萨省雇主的长期全职 offer + 雇主先拿 EPA**;
# 2026 起另有行业配额封顶(住宿餐饮 15%、零售 5%、卡车运输 5%)未建模。清单本身仍是 inclusion
# (type 不改,08_score 语义就是 inclusion/exclusion 二选一),条件写在这里作数据层事实。
SK_NOTE = ("SINP Talent Pathway:除职业在清单内,还需萨省雇主长期全职 offer 且雇主已获 EPA;"
           "2026 起住宿餐饮/零售/卡车运输三行业另有配额封顶(15%/5%/5%)。")
STREAMS = [
    {"url": _SK + "health-talent-pathway", "out": "sk-health.json",
     "stream": "SINP Health Talent Pathway", "label": "SK 医疗"},
    {"url": _SK + "sinp-innovation-tech-talent-pathway", "out": "sk-tech.json",
     "stream": "SINP Innovation & Tech Talent Pathway", "label": "SK 科技"},
    {"url": _SK + "agriculture-talent-pathway", "out": "sk-agri.json",
     "stream": "SINP Agriculture Talent Pathway", "label": "SK 农业"},
]
NOC_PATTERNS = [
    re.compile(r"^[-*]\s*(\d{5})\s*[—–-]\s*(.+?)\s*$"),   # - 21211 — Data scientists
    re.compile(r"^\|\s*(\d{5})\s*\|\s*([^|]+?)\s*\|"),     # | 21211 | Data scientists |
]

# ── SINP 主线(OID / Express Entry):官方**不发在需清单,发的是排除清单** ────────────
# 2026-08-03 补:此前本站只抓了上面三条 Talent Pathway(行业专项),于是「SK 主线」在库里是空的,
# 而 provListCoverage 见到有行就判 listed → 报告对用户说「查过萨省清单,你不在上面」。
# 我们从没查过那张表 —— 主线在这里,而且是排除式:不在清单上 = 可以申请(还要 TEER 0-3)。
# 清单是 PDF(publications.saskatchewan.ca 产品号 102709),格式 id 从产品 API 现取,不写死。
EXCL_PRODUCT = 102709
EXCL_API = f"https://publications.saskatchewan.ca/api/v1/products/{EXCL_PRODUCT}"
EXCL_DL = "https://publications.saskatchewan.ca/api/v1/products/{p}/formats/{f}/download"
EXCL_PAGE = _SK + "occupation-restrictions-and-requirements"
EXCL_NOTE = ("SINP 主线(Occupations In-Demand / Express Entry)是**排除式**:不在本清单上即可申请;"
             "官方同页明示 NOC TEER 4/5 不合格(即需 TEER 0-3)。"
             "在清单上的职业仍可能走 Employment Offer 或萨省经验类——但需萨省雇主注册并获 EPA 批准。")
# 2026-08-05 补:此清单只管 OID/EE 两个子类别,不管 Employment Offer(雇主 offer 制,走另一张
# Job Offer Exclusion List,见 build_sk_joboffer.py)。原句抄自 occupation-restrictions-and-requirements
# 页(data/crawl/sk-sinp/ 缓存),quote-anchored,禁转述。
EXCL_APPLIES_TO = "OID/EE"
EXCL_APPLIES_TO_QUOTE = (
    "People with the following occupations are excluded from applying to the Occupations "
    "In-Demand (OID) and Express Entry (EE) program sub-categories. This is a list of "
    "occupations that are not eligible for these program sub-categories. Note that these "
    "occupations may be eligible through the International Skilled Worker Employment Offer "
    "subcategory and the Saskatchewan Work Experience category if your employer has "
    "registered with the Government of Saskatchewan and received approval for the job offer."
)
# PDF 是两列表格,pymupdf 把 NOC 与职业名拆成相邻两行(「11100」\n「Financial auditors…」);
# 少数导出会并成一行,两种都认。
EXCL_ROW = re.compile(r"^\s*(\d{5})\s+([A-Za-z].*?)\s*$")
EXCL_CODE = re.compile(r"^\s*(\d{5})\s*$")
EXCL_UPDATED = re.compile(r"Updated:\s*([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})")
_MONTHS = ("january", "february", "march", "april", "may", "june",
           "july", "august", "september", "october", "november", "december")


def build_excluded() -> None:
    """SINP 排除清单(主线口径)→ raw/pnp/sk-excluded.json。抓不到/解析空 → 保留旧表。"""
    import fitz  # pymupdf(已在 pyproject 依赖里;只有这一步用得上,按需导入)

    try:
        meta = httpx.get(EXCL_API, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).json()
        fmt = (meta.get("productFormats") or [{}])[0].get("productFormatId")
        if not fmt:
            print("  ✗ SK 排除清单:产品 API 没给格式 id(保留旧表)")
            return
        pdf = httpx.get(EXCL_DL.format(p=EXCL_PRODUCT, f=fmt), headers={"User-Agent": UA},
                        follow_redirects=True, timeout=60).content
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ SK 排除清单抓取失败: {type(e).__name__} {e}(保留旧表)")
        return
    with fitz.open(stream=pdf, filetype="pdf") as doc:
        text = "\n".join(page.get_text() for page in doc)
    lines = [ln.strip() for ln in text.splitlines()]
    occ: dict[str, str] = {}
    for i, ln in enumerate(lines):
        if (m := EXCL_ROW.match(ln)):
            noc, name = m.group(1), m.group(2)
        elif EXCL_CODE.match(ln):
            nxt = next((x for x in lines[i + 1:i + 3] if x), "")     # 紧邻的下一行非空 = 职业名
            if not nxt or not nxt[0].isalpha():
                continue
            noc, name = ln.strip(), nxt
        else:
            continue
        name = re.sub(r"\s+", " ", name).strip(" .")
        if name.upper() in ("NOC", "OCCUPATION", "OCCUPATION TITLE"):
            continue
        occ.setdefault(noc, name)
    if not occ:
        print("  ✗ SK 排除清单没解析到 NOC(保留旧表)")
        return
    # 官方在 PDF 首页自己标的更新日期 —— 比我们的 fetched 更该给用户看(这份表可能几年不动)
    effective = ""
    if (u := EXCL_UPDATED.search(text)):
        mon = _MONTHS.index(u.group(1).lower()) + 1 if u.group(1).lower() in _MONTHS else 0
        if mon:
            effective = f"{u.group(3)}-{mon:02d}-{int(u.group(2)):02d}"
    table = {
        "stream": "SINP Occupations In-Demand / Express Entry", "label": "SK 主线不合格清单",
        "province": PROVINCE, "program": "PNP", "type": "ineligible", "note": EXCL_NOTE,
        "appliesTo": EXCL_APPLIES_TO, "appliesToQuote": EXCL_APPLIES_TO_QUOTE,
        "url": EXCL_PAGE, "fetched": date.today().isoformat(), "effective": effective,
        "occupations": [{"noc": n, "name": nm} for n, nm in sorted(occ.items())],
    }
    (_paths.PNP / "sk-excluded.json").write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ {'SK 主线排除':<10} {len(occ):>3} 个职业 → pnp/sk-excluded.json  "
          f"(实时 {table['fetched']};官方标注更新 {effective or '未标'})")


def fetch_md(url: str) -> str:
    html = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    md = convert_md(ConvertIn(html=html, url=url, selector=None, removes=()))
    return md


def parse_occupations(md: str) -> list[dict]:
    occ: dict[str, str] = {}  # noc → name(去重,首见为准)
    for ln in md.splitlines():
        m = next((p.match(ln) for p in NOC_PATTERNS if p.match(ln)), None)
        if not m:
            continue
        noc, name = m.group(1), re.sub(r"\s+", " ", m.group(2)).strip(" .*")
        if name.upper() in ("NOC", "OCCUPATION", "OCCUPATION TITLE"):  # 跳表头
            continue
        occ.setdefault(noc, name)
    return [{"noc": n, "name": nm} for n, nm in sorted(occ.items())]


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    for s in STREAMS:
        try:
            md = fetch_md(s["url"])
        except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表,不留空
            print(f"  ✗ 抓取失败 {s['out']}: {type(e).__name__} {e}(保留旧表)")
            continue
        occs = parse_occupations(md)
        if not occs:
            print(f"  ✗ 没解析到 NOC: {s['out']}(保留旧表)")
            continue
        table = {
            "stream": s["stream"], "label": s["label"], "province": PROVINCE,
            "type": "indemand", "note": SK_NOTE,
            "url": s["url"], "fetched": date.today().isoformat(),
            "occupations": occs,
        }
        (_paths.PNP / s["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {s['label']:<10} {len(occs):>3} 个职业 → pnp/{s['out']}  (实时 {table['fetched']})")
    build_excluded()   # 主线口径(排除式);三条专项通道之外单独一张表


if __name__ == "__main__":
    main()
