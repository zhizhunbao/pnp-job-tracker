"""
build_bc — BC PNP 具名通道职业清单(每省一个 build 脚本,完全自包含)。

**实时抓**:httpx 直取 WelcomeBC「About the BC PNP」单页(浏览器 UA 直连 200)→ 复用 crawl 的
HTML→md 转换器 → 按节标题分桶解析。2026 新政(Care/Build/Innovate)恢复了职业清单
(旧 tech 定向 2024-12 关停后曾无清单可抓,故 build_bc 一度下架;本脚本按新页面重写):
  · Care/Health care 定向邀请 ∪ Health Authority 通道职业(同为医疗信号,粗筛不分雇主)→ bc-health.json「BC 医疗」
  · Care/Childcare(ECE)→ bc-childcare.json「BC 幼教」
  · Care/Education(仅限法语教师)→ bc-education.json「BC 法语教师」
  · Care/Veterinary care → bc-vet.json「BC 兽医」
  · Build/Construction trades → bc-construction.json「BC 建筑技工」
Innovate 无清单(High Economic Impact 全行业)→ 不产出。
抓不到/解析空 → 跳过、保留旧表(宁可留旧也不留空)。08_score 目录驱动读 → BC 具名通道。

Usage:  uv run python etl/pnp/build_bc.py   (需 httpx+bs4,系统 python 没装 → 用 .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))          # etl/ → paths
import paths
from crawl.functions import convert_md
from crawl.scheme import ConvertIn

PROVINCE = "BC"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
URL = ("https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/"
       "about-the-bc-provincial-nominee-program")
# md 节标题(#### 小节 / ### Health Authority 大节)→ 桶;同桶多节取并集
SECTION_BUCKET = {
    "health care": "health",
    "health authority-eligible occupations": "health",
    "childcare": "childcare",
    "education": "education",
    "veterinary care": "vet",
    "construction trades": "construction",
}
BUCKETS = {
    "health": {"out": "bc-health.json", "label": "BC 医疗",
               "stream": "BC PNP Care: health targeted ITA / Health Authority stream"},
    "childcare": {"out": "bc-childcare.json", "label": "BC 幼教",
                  "stream": "BC PNP Care: childcare targeted ITA"},
    "education": {"out": "bc-education.json", "label": "BC 法语教师",
                  "stream": "BC PNP Care: education targeted ITA (French-speaking)"},
    "vet": {"out": "bc-vet.json", "label": "BC 兽医",
            "stream": "BC PNP Care: veterinary targeted ITA"},
    "construction": {"out": "bc-construction.json", "label": "BC 建筑技工",
                     "stream": "BC PNP Build: construction trades targeted ITA"},
}
NOC_LINE = re.compile(r"^(\d{5})\s+(.+?)\s*$")   # 页面职业行:"31301 Registered nurses …"(无列表符号)


def fetch_md() -> str:
    html = httpx.get(URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    md = convert_md(ConvertIn(html=html, url=URL, selector=None, removes=()))
    return md


def parse_buckets(md: str) -> dict[str, dict[str, str]]:
    """按节标题分桶抽 NOC 行;名字去掉尾部脚注记号(*/¹²³ 由转换器落成裸 * 或数字)。"""
    out: dict[str, dict[str, str]] = {k: {} for k in BUCKETS}
    bucket = None
    for ln in md.splitlines():
        h = re.match(r"^#{2,4}\s+(.+?)\s*:?\s*$", ln)
        if h:
            bucket = SECTION_BUCKET.get(h.group(1).strip().lower())
            continue
        m = NOC_LINE.match(ln.strip())
        if not (bucket and m):
            continue
        noc = m.group(1)
        name = re.sub(r"[\s*\d]+$", "", re.sub(r"\s+", " ", m.group(2))).strip(" .")
        if name:
            out[bucket].setdefault(noc, name)
    return out


# ── BC 主线排除清单(2026-08-03 接入)──────────────────────────────────────────
# 上面那些是**专项**定向邀请清单;BC 的**主线** Skills Immigration 从 2026-06-13 起新增了一张
# 「对**任何** Skills Immigration 通道都不合格」的职业表(官方指南 §3.11,2026-06-10 版新引入)——
# 官方原话:Some NOCs are not eligible for nomination under any Skills Immigration stream.
# 这张表只在**指南 PDF** 里(网页版是 JS 渲染,httpx 拿到空壳),所以走 build_bc_req 同一份 PDF。
# 有了它,BC 才从「只有专项清单、主线未知」变成排除式 —— 报告能对未命中的职业给粗筛结论,
# 而不是含糊地说「本站只覆盖了 N 条专项」。
GUIDE_URL = "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf"
INELIG_SECTION = re.compile(r"3\.11\s+Ineligible Occupations", re.I)
INELIG_END = re.compile(r"3\.12\s+Eligible Employment", re.I)
INELIG_ROW = re.compile(r"(\d{5})\s+([A-Za-z][^\n•]*)")
INELIG_EFFECTIVE = re.compile(r"in effect for applications submitted after\s+([A-Z][a-z]+ \d{1,2}, \d{4})")
INELIG_MIN = 5          # 2026-08-03 实见 12 个;低于此数视为解析异常
INELIG_NOTE = ("BC 主线排除清单:该 NOC 下**全部**职业对任何 Skills Immigration 通道都不合格,"
               "job offer 落在这些 NOC 上会被拒。出自 BC PNP Skills Immigration Program Guide §3.11。")


def build_ineligible() -> None:
    """BC 指南 §3.11 排除清单 → raw/pnp/bc-ineligible.json。抓不到/条数异常 → 保留旧表。"""
    try:
        import fitz  # pymupdf(已在 pyproject 依赖里)
        pdf = httpx.get(GUIDE_URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=60).content
        with fitz.open(stream=pdf, filetype="pdf") as doc:
            text = "\n".join(p.get_text() for p in doc)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ BC 指南 PDF 抓取失败: {type(e).__name__} {e}(保留旧表)")
        return
    # 目录页也有「3.11 Ineligible Occupations」→ 取最后一处(正文)并切到 3.12 为止
    hits = [m.end() for m in INELIG_SECTION.finditer(text)]
    if not hits:
        print("  ✗ BC 指南里没找到 §3.11(改版?保留旧表,请人工复核)")
        return
    body = text[hits[-1]:]
    if (end := INELIG_END.search(body)):
        body = body[:end.start()]
    occ = {n: re.sub(r"\s+", " ", nm).strip(" .,") for n, nm in INELIG_ROW.findall(body)}
    if len(occ) < INELIG_MIN:
        print(f"  ✗ BC §3.11 只解析到 {len(occ)} 个 NOC(<{INELIG_MIN},疑似改版)—— 保留旧表,请人工复核")
        return
    table = {
        "stream": "BC PNP Skills Immigration — ineligible occupations (all streams)",
        "label": "BC 不合格职业", "province": PROVINCE, "program": "PNP",
        "type": "ineligible", "note": INELIG_NOTE,
        "url": GUIDE_URL, "fetched": date.today().isoformat(),
        "effective": (m.group(1) if (m := INELIG_EFFECTIVE.search(text)) else ""),
        "occupations": [{"noc": n, "name": nm} for n, nm in sorted(occ.items())],
    }
    (paths.PNP / "bc-ineligible.json").write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ {'BC 不合格职业':<8} {len(occ):>3} 个职业 → pnp/bc-ineligible.json  "
          f"(实时 {table['fetched']};生效 {table['effective'] or '未标'})")


def main() -> None:
    paths.PNP.mkdir(parents=True, exist_ok=True)
    build_ineligible()   # 主线排除清单(PDF);专项清单在下面
    try:
        md = fetch_md()
    except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表,不留空
        print(f"  ✗ 抓取失败 {URL}: {type(e).__name__} {e}(保留旧表)")
        return
    buckets = parse_buckets(md)
    for key, cfg in BUCKETS.items():
        occs = [{"noc": n, "name": nm} for n, nm in sorted(buckets[key].items())]
        if not occs:
            print(f"  ✗ 没解析到 NOC: {cfg['out']}(保留旧表)")
            continue
        table = {
            "stream": cfg["stream"], "label": cfg["label"], "province": PROVINCE,
            "type": "indemand",
            "url": URL, "fetched": date.today().isoformat(),
            "occupations": occs,
        }
        (paths.PNP / cfg["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {cfg['label']:<8} {len(occs):>3} 个职业 → pnp/{cfg['out']}  (实时 {table['fetched']})")


if __name__ == "__main__":
    main()
