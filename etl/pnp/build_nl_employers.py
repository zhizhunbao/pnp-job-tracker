"""
build_nl_employers — NL(纽芬兰与拉布拉多)AIP/PNP 指定雇主名录。

**纯本地缓存读取,不联网**(W4 拍板):数据源是 crawl 役已经抓好的
`data/crawl/nl-imm/manifest.json` + `html_cache/`,本脚本只解析,不发一个 HTTP 请求。

产出 raw/pnp/nl-employers.json ——雇主名 + 所在地 + 申报的 NOC 职位。

页面结构(2026-08-05 抽 8 页人肉核对,639 页全一致):
    <h1 class="entry-title">雇主名</h1>
    <dl>
      <dt>Location</dt><dd>...</dd>
      <dt>Date Designated</dt><dd>...</dd>
      <dt>NAICS Code</dt><dd>...</dd>
      <dt>NOC's Requested</dt><dd>72310, 94219</dd>
    </dl>
一家(1342205 Ontario Ltd.)连 <dl> 都是空的——照收,location/nocs 留空,
「639 家里这家什么都没申报」本身就是分母的一部分,不能因为字段空就整条丢弃。

⚠️ **NOC 口径**:`NOC's Requested` 这一格官方只给**裸码**(4 位 NOC 2016 或 5 位 NOC 2021,
两种版本混着来,同一年份内都有),从没写过职位名文本。所以本站不替它拼职位名——
`title` 一律 `null`,禁止拿 etl/noc.py 的官方名表去反查再塞回来:那是「查表填空」不是
「照抄页面」,一旦裸码是旧版 NOC 2016(结构表只收 2021 五位),查出来的名字就会张冠李戴。
真出现「有职位名没码」的情况(本次抽查 639 页一次没见过)才会落 {"noc": null, "title": ...}。

用法:PYTHONIOENCODING=utf-8 python etl/pnp/build_nl_employers.py
"""
import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths

PROVINCE = "NL"
LABEL = "NL 官网指定雇主名录"
SOURCE = "NLPNP designated employers"
# 名录入口页(Atlantic Immigration Program Designated Employers)——639 个 /immigration/employer/<slug>
# 子页都是从这张表点进去的(crawl 役按 depth 抓到,页面本身另有一份同源的 <table> 汇总,未采用:
# 铁律要求逐雇主页原文核对,汇总表只用来交叉验证条数)。
ENTRY_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
             "atlantic-immigration-program/designated-employers")
EMPLOYER_PREFIX = "https://www.gov.nl.ca/immigration/employer/"

IN_MANIFEST = _paths.CRAWL / "nl-imm" / "manifest.json"
IN_HTML_CACHE = _paths.CRAWL / "nl-imm" / "html_cache"
OUT = _paths.PNP / "nl-employers.json"

NOC_CODE = re.compile(r"\d{3,5}")   # 裸码 3-5 位数字(4 位=NOC2016,5 位=NOC2021;3 位偶见,原样收)


def parse_employer(html: str, url: str) -> dict | None:
    """单个雇主页 → {name, location, nocs, url};解不出雇主名 → None(页面异常,跳过不硬凑)。"""
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1", class_="entry-title")
    if not h1:
        return None
    name = re.sub(r"\s+", " ", h1.get_text(" ", strip=True)).strip()
    if not name:
        return None

    dl = soup.find("dl")
    field = {}
    if dl:
        dts = dl.find_all("dt")
        dds = dl.find_all("dd")
        for dt, dd in zip(dts, dds):
            key = re.sub(r"\s+", " ", dt.get_text(" ", strip=True)).strip()
            val = re.sub(r"\s+", " ", dd.get_text(" ", strip=True)).strip()
            field[key] = val

    location = field.get("Location", "")
    noc_raw = field.get("NOC's Requested", "")
    nocs = [{"noc": code, "title": None} for code in NOC_CODE.findall(noc_raw)]

    return {"name": name, "location": location, "nocs": nocs, "url": url}


def main() -> None:
    print(f"IN_MANIFEST: {IN_MANIFEST}")
    print(f"IN_HTML_CACHE: {IN_HTML_CACHE}")
    print(f"OUT: {OUT}")

    if not IN_MANIFEST.exists():
        print(f"  ✗ 找不到 {IN_MANIFEST}(crawl 役没跑过这个种子?)")
        sys.exit(1)

    manifest = json.loads(IN_MANIFEST.read_text(encoding="utf-8"))
    fetched = str(manifest.get("crawled_at") or "")[:10]
    pages = manifest.get("pages", [])
    emp_pages = [p for p in pages
                 if p.get("status") == 200 and p.get("html")
                 and p.get("url", "").startswith(EMPLOYER_PREFIX)]

    employers: list[dict] = []
    skipped: list[str] = []
    for p in emp_pages:
        f = IN_HTML_CACHE / p["html"]
        if not f.exists():
            skipped.append(p["url"])
            continue
        html = f.read_text(encoding="utf-8", errors="replace")
        row = parse_employer(html, p["url"])
        if row is None:
            skipped.append(p["url"])
            continue
        employers.append(row)

    employers.sort(key=lambda r: r["name"].lower())

    table = {
        "province": PROVINCE, "label": LABEL, "source": SOURCE,
        "url": ENTRY_URL, "fetched": fetched,
        "employers": employers,
    }
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── 报告 ──────────────────────────────────────────────────────────
    with_noc = sum(1 for e in employers if any(n["noc"] for n in e["nocs"]))
    no_noc = sum(1 for e in employers if not e["nocs"])
    codeless = sum(1 for e in employers if e["nocs"] and not any(n["noc"] for n in e["nocs"]))
    total_codes = sum(len(e["nocs"]) for e in employers)
    noc_72310 = [e["name"] for e in employers if any(n["noc"] == "72310" for n in e["nocs"])]

    print(f"✓ 雇主 {len(employers)} 家(缓存子页 {len(emp_pages)} 个,跳过 {len(skipped)} 个)→ {OUT}")
    print(f"  fetched={fetched}")
    print(f"  申报 ≥1 个 NOC 码的雇主: {with_noc} 家 / 完全没申报(nocs=[]): {no_noc} 家 / "
          f"只有职位名无码(title-only): {codeless} 家")
    print(f"  NOC 码总数(含重复): {total_codes}")
    print(f"  NOC 72310 命中: {len(noc_72310)} 家 → {noc_72310}")
    if skipped:
        print(f"  跳过(缓存文件缺失或解不出雇主名): {skipped[:10]}{' ...' if len(skipped) > 10 else ''}")


if __name__ == "__main__":
    main()
