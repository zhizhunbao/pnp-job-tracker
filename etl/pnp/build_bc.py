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
sys.path.insert(0, str(_HERE.parent))          # etl/ → _paths
sys.path.insert(0, str(_HERE.parent / "crawl"))  # etl/crawl/ → converters(HTML→md)
import _paths  # noqa: E402
from converters import get_converter  # noqa: E402

PROVINCE = "BC"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
_PROFILE = {"content_selector": None, "remove_selectors": [], "css_file": None, "direct_suffix": None, "converter": None}
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
    md, _ = get_converter().convert(html, URL, _PROFILE)
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


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
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
        (_paths.PNP / cfg["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {cfg['label']:<8} {len(occs):>3} 个职业 → pnp/{cfg['out']}  (实时 {table['fetched']})")


if __name__ == "__main__":
    main()
