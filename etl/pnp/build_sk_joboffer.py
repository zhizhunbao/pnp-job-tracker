"""
build_sk_joboffer — SK(萨斯喀彻温)SINP Employment Offer 子类别的排除清单。

背景(2026-08-05 核实,原句见 data/crawl/sk-sinp/ 缓存的 occupation-restrictions-and-requirements 页):
sk-excluded.json(build_sk.py 产出)那张 152 条清单只管 Occupations In-Demand(OID)和
Express Entry(EE)两个子类别;Employment Offer 是雇主 offer 制,不受它约束,管它的是另一张表——
"Excluded Business Types and Occupations for SINP Job Offer Categories"(官方 PDF,产品号 123540)。

URL 已从缓存页原文抽取(不是猜的),两个 PDF:
  a) 102709/113851 — Excluded Occupation List(OID/EE 那张,build_sk.py 已经在抓这份)
  b) 123540/149130 — Excluded Business Types and Occupations for SINP Job Offer Categories(本脚本要的)
本脚本两份都下载留痕（同目录 data/crawl/sk-sinp/），但只解析 (b) 产出 sk-joboffer-excluded.json。

Usage:  uv run python etl/pnp/build_sk_joboffer.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))  # etl/ → _paths
import _paths  # noqa: E402

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

PROVINCE = "SK"
EXCL_PAGE = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/"
             "by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/"
             "applicants-international-skilled-workers/occupation-restrictions-and-requirements")
CRAWL_DIR = _paths.CRAWL / "sk-sinp"

# 两个 PDF,URL 从已抓页面(data/crawl/sk-sinp/)原文提取,不是猜的
PDFS = [
    {"product": 102709, "fmt": 113851, "out": "sinp-102709-excluded-occupations.pdf",
     "desc": "Excluded Occupation List (OID/EE)"},
    {"product": 123540, "fmt": 149130, "out": "sinp-123540-joboffer-excluded.pdf",
     "desc": "Excluded Business Types and Occupations for SINP Job Offer Categories"},
]
DL = "https://publications.saskatchewan.ca/api/v1/products/{p}/formats/{f}/download"

APPLIES_TO = "Employment Offer"
JOBOFFER_OUT = "sk-joboffer-excluded.json"

# 两列表格,pymupdf 常把 NOC 与职业名拆成相邻两行,同 build_sk.py 的口径;
# 本表个别行带脚注星号前缀(如「*Massage therapist…」),名称起始允许 * 或字母
EXCL_ROW = re.compile(r"^\s*(\d{5})\s+(\*?[A-Za-z].*?)\s*$")
EXCL_CODE = re.compile(r"^\s*(\d{5})\s*$")


def download_pdfs() -> dict[str, bytes]:
    """下载两份 PDF 到 data/crawl/sk-sinp/,打印大小与前几字节确认是 PDF。返回 {out文件名: bytes}。"""
    CRAWL_DIR.mkdir(parents=True, exist_ok=True)
    content: dict[str, bytes] = {}
    for p in PDFS:
        url = DL.format(p=p["product"], f=p["fmt"])
        try:
            resp = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=60)
            resp.raise_for_status()
            data = resp.content
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ 下载失败 {p['out']}: {type(e).__name__} {e}")
            continue
        out_path = CRAWL_DIR / p["out"]
        out_path.write_bytes(data)
        head = data[:8]
        is_pdf = head.startswith(b"%PDF-")
        print(f"  {'✓' if is_pdf else '✗'} {p['desc']}: {len(data):,} bytes, "
              f"头字节 {head!r} → {out_path}")
        content[p["out"]] = data
    return content


def parse_joboffer_pdf(pdf_bytes: bytes) -> list[dict]:
    """解析 Job Offer 排除清单 PDF → [{noc, name}]。没有可用解析库时由调用方兜底跳过。"""
    import fitz  # pymupdf,已确认已装(build_sk.py 同款依赖)

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        text = "\n".join(page.get_text() for page in doc)
    lines = [ln.strip() for ln in text.splitlines()]
    occ: dict[str, str] = {}
    for i, ln in enumerate(lines):
        if (m := EXCL_ROW.match(ln)):
            noc, name = m.group(1), m.group(2)
        elif EXCL_CODE.match(ln):
            nxt = next((x for x in lines[i + 1:i + 3] if x), "")
            if not nxt or not (nxt[0].isalpha() or nxt[0] == "*"):
                continue
            noc, name = ln.strip(), nxt
        else:
            continue
        name = re.sub(r"^\*+\s*", "", name)  # 脚注星号前缀非职业名一部分,去掉
        name = re.sub(r"\s+", " ", name).strip(" .")
        if name.upper() in ("NOC", "OCCUPATION", "OCCUPATION TITLE"):
            continue
        occ.setdefault(noc, name)
    return [{"noc": n, "name": nm} for n, nm in sorted(occ.items())]


def main() -> None:
    files = download_pdfs()
    joboffer_pdf = files.get("sinp-123540-joboffer-excluded.pdf")
    if not joboffer_pdf:
        print("  ✗ Job Offer 排除清单 PDF 没下到,跳过解析")
        return

    occs = parse_joboffer_pdf(joboffer_pdf)
    if not occs:
        print("  ✗ Job Offer 排除清单没解析到 NOC(not-collected,保留旧表/不产出)")
        return

    table = {
        "stream": "SINP Employment Offer", "label": "SK Job Offer 不合格清单",
        "province": PROVINCE, "program": "PNP", "type": "ineligible",
        "appliesTo": APPLIES_TO,
        "note": ("SINP International Skilled Worker: With an Employment Offer 子类别的排除清单——"
                 "与 sk-excluded.json(OID/EE 排除清单)是两张不同的表,互不通用。"
                 "官方原句(PDF):「The following occupations are not eligible for the SINP "
                 "sub-categories requiring a job offer and JAL from a Saskatchewan employer "
                 "unless certain requirements, listed below, are met.」即多数行是**条件性排除**"
                 "(如持有效 LMIA/CUAET 工签在萨省该职业已在职则不受限);"
                 "本表 name 字段为 PDF 逐行解析,长条件文本可能截到第一行,完整条件请查 PDF 原文。"),
        "url": EXCL_PAGE, "fetched": date.today().isoformat(),
        "occupations": occs,
    }
    (_paths.PNP / JOBOFFER_OUT).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ SK Job Offer 排除 {len(occs):>3} 个职业 → pnp/{JOBOFFER_OUT}  (实时 {table['fetched']})")

    carpenter = next((o for o in occs if o["noc"] == "72310"), None)
    if carpenter:
        print(f"  → 72310 carpenter 在 Job Offer 排除清单内: {carpenter['name']}")
    else:
        print("  → 72310 carpenter 不在 Job Offer 排除清单内")


if __name__ == "__main__":
    main()
