"""
build_on_stats — ON(OINP)官方**审理时长 + 已发提名数 + 年度配额**。「我要等多久 / 官方今年发了多少」。

⚠️ 这个脚本一上来就撞见一个「页面没了」:官方原本有一页专门叫「OINP Application
processing times and nominations issued」(data/crawl/oinp-times/manifest.json 那颗种子的
seed_url),但站内到处链它的旧页(如 expression-interest-system-streams、register-expression-
interest…)现在点进去会 302 到泛用总览页 ontario-immigrant-nominee-program-oinp,带
`?redirect_id=page%2Foinp-application-processing-times-and-nominations-issued&redirect_year=2025`
——**官方自己登记的重定向**,不是抓取偶发失败(本脚本运行时用 httpx 实测同一 URL 复核,见
`check_redirect()`)。总览页正文只剩一句「OINP is changing... all other streams are now
closed」(2026 年改制成单一的 Ontario Workforce Priority stream),没有任何处理时长/提名数表格。
全站翻遍 on-oinp 种子(见 data/crawl/on-oinp/manifest.json)也找不到第二处发布**逐 stream 审理
时长**的页面——`processing` 数组按硬规矩留空,不拿「非官方博客写的 60-120 天」充数。

**已发提名数**没有消失,只是搬了家:官方每年一页「<年> Ontario Immigrant Nominee Program
Updates」年底会发一句「issued a total of N nominations to successful applicants across all
streams in <年>」(或早期措辞「reached its <年> nomination allocation, a total of N
nominations」)——本脚本逐年扫这批页面(同一 on-oinp 种子已缓存,部分年份如 2020/2022-2024
被 Radware 反爬挡住,缓存与实抓都拿不到,原样跳过不硬凑)。取每页**文档序最靠前**的一条
(页面新→旧排列,最靠前=年末最终数,例如 2018 年 11 月 9 日先报 6,600、12 月 20 日追加到
6,850 的最终版——只取后者)。

**2026 年度配额**:同一批年度页里,2026 那页 2026-02-06 更新写着官方原句「The province's 2026
allocation is 14,119 nominations.」——quote-anchored,照抄不改写。

产出 raw/pnp/on-stats.json。年份不写死:从今年往前探(见 YEARS),缓存优先(cache.get,同一
on-oinp 种子已抓),缓存没有再 httpx 实抓兜底;两边都拿不到(Radware 拦截/网络失败)就跳过
该年,不拖垮整体。

自校是硬闸(照 build_bc_req):allocation 与 nominationsIssued 两块**都**空 —— 才判定这轮
抓取本身出了问题,保留旧表不覆盖并 exit 1(两块有一块有数据就算抓取本身是好的,`processing`
天生允许空,不计入这道闸)。

Usage:  uv run python etl/pnp/build_on_stats.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))            # etl/ → _paths
sys.path.insert(0, str(_HERE.parent / "crawl"))  # etl/crawl/ → cache
import _paths  # noqa: E402
import cache  # noqa: E402

# 官方原本发布处理时长+提名数的页(现 302 重定向 —— 见模块 docstring),仍记录原样 URL 供溯源
SEED_URL = "https://www.ontario.ca/page/oinp-application-processing-times-and-nominations-issued"
UPDATES_URL_TPL = "https://www.ontario.ca/page/{year}-ontario-immigrant-nominee-program-updates"
OUT = _paths.PNP / "on-stats.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "ON"
NOTE = ("OINP 官方专页「Application processing times and nominations issued」已 302 重定向到"
        "总览页(官方自己登记的 redirect_id,非抓取失败),全站翻遍也找不到第二处仍在发布**逐"
        "stream 审理时长**的页面 —— processing 留空是举证过的「本站未收录」,不是「官方不公布」"
        "的猜测(2026 年 OINP 改制为单一 Ontario Workforce Priority stream 后,旧的多 stream 时长"
        "表随旧页一起下线)。已发提名数改从每年一页的「OINP Program Updates」年末公告句摘取"
        "(部分年份被 Radware 反爬拦截,拿不到就跳过,不补数)。2026 配额 14,119 出自"
        "2026-02-06 那条更新,官方原句 quote-anchored。")

# 「issued a total of N nominations to successful applicants across all streams in <年>」
# ——2018/2019/2025 三年样本共用同一措辞,新旧年份都能命中
RE_ISSUED = re.compile(
    r"issued a total of ([\d,]+) nominations to successful applicants "
    r"across all streams in (\d{4})", re.I)
# 早期措辞退而求其次:「reached its <年> nomination allocation, a total of N nominations」
RE_REACHED = re.compile(
    r"reached its (?:increased )?(\d{4}) nomination allocation,? a total of ([\d,]+) nominations", re.I)
# 「The province's <年> allocation is N nominations.」——目前只见 2026 那页,但不写死年份
RE_ALLOC = re.compile(r"The province.s (\d{4}) allocation is ([\d,]+) nominations\.", re.I)

THIS_YEAR = date.today().year
YEARS = range(THIS_YEAR, THIS_YEAR - 12, -1)  # 官方逐年更新页约从 2015 起开始独立成页,探到底不写死


def num(s: str) -> int:
    return int(s.replace(",", ""))


def clean_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "nav", "header", "footer"]):
        t.decompose()
    main = soup.find("main") or soup
    return re.sub(r"\s+", " ", main.get_text(" ", strip=True))


def is_blocked(text: str) -> bool:
    return "radware" in text.lower() or "captcha" in text.lower()


def fetch_year_page(year: int) -> tuple:
    """(text, url, fetched) —— 缓存优先(on-oinp 种子已抓),缓存没有再 httpx 兜底;
    两边都拿不到或被反爬拦截 → (None, url, "")。"""
    url = UPDATES_URL_TPL.format(year=year)
    html, fetched = cache.get(url)
    if not html:
        try:
            r = httpx.get(url, headers=UA, follow_redirects=True, timeout=45)
            if r.status_code == 200:
                html, fetched = r.text, date.today().isoformat()
        except httpx.HTTPError:
            pass
    if not html:
        return None, url, ""
    text = clean_text(html)
    if is_blocked(text):
        return None, url, ""
    return text, url, fetched


def check_redirect() -> dict:
    """实测 SEED_URL 现在指向哪 —— 官方登记的重定向 vs 抓取偶发失败,眼见为实。"""
    try:
        r = httpx.get(SEED_URL, headers=UA, follow_redirects=True, timeout=45)
        return {"requestedUrl": SEED_URL, "status": r.status_code, "resolvedUrl": str(r.url),
                "isRedirected": str(r.url) != SEED_URL, "checked": date.today().isoformat()}
    except httpx.HTTPError as e:
        return {"requestedUrl": SEED_URL, "status": None, "resolvedUrl": "",
                "isRedirected": None, "checked": date.today().isoformat(), "error": str(e)}


def main() -> None:
    print(f"OUT: {OUT}")
    problems: list = []

    redirect = check_redirect()
    print(f"  SEED_URL 现状:{redirect.get('status')} → {redirect.get('resolvedUrl') or '(实抓失败)'}")

    allocation: list = []
    nominations_issued: list = []
    skipped_years: list = []

    for year in YEARS:
        text, url, fetched = fetch_year_page(year)
        if text is None:
            skipped_years.append(year)
            continue

        for m in RE_ALLOC.finditer(text):
            y, v = int(m.group(1)), num(m.group(2))
            allocation.append({"year": y, "label": re.sub(r"\s+", " ", m.group(0)).strip(),
                               "value": v, "unit": "nominations",
                               "section": f"{year} Ontario Immigrant Nominee Program Updates",
                               "url": url, "fetched": fetched})

        # 页面新→旧排列:取文档序最靠前的一条 = 该年最终(年末追加后)的数字
        cands = [(m.start(), num(m.group(1)), int(m.group(2)), m.group(0)) for m in RE_ISSUED.finditer(text)]
        cands += [(m.start(), num(m.group(2)), int(m.group(1)), m.group(0)) for m in RE_REACHED.finditer(text)]
        if cands:
            cands.sort(key=lambda c: c[0])
            _, value, y, label = cands[0]
            nominations_issued.append({"year": y, "label": re.sub(r"\s+", " ", label).strip(),
                                       "value": value, "unit": "nominations",
                                       "section": f"{year} Ontario Immigrant Nominee Program Updates",
                                       "url": url, "fetched": fetched})

    if skipped_years:
        print(f"  跳过(缓存与实抓都拿不到,含 Radware 拦截):{sorted(skipped_years, reverse=True)}")

    if not allocation and not nominations_issued:
        problems.append("配额与已发提名数两块都没抓到任何一条(抓取本身可能出了问题)")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": "PNP",
        "source": "OINP Program Updates(逐年页)+ 官方重定向复核", "url": SEED_URL, "note": NOTE,
        "asOf": "", "fetched": date.today().isoformat(),
        "pageRedirect": redirect,
        "processing": [],   # 举证过的空:见 docstring/note,不是「没抓到」
        "allocation": allocation,
        "nominationsIssued": sorted(nominations_issued, key=lambda r: -r["year"]),
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ {OUT}")
    print(f"  配额 {len(allocation)} 条:" + "; ".join(f"{a['year']}={a['value']:,}" for a in allocation))
    print(f"  已发提名数 {len(nominations_issued)} 条:" +
          "; ".join(f"{n['year']}={n['value']:,}" for n in sorted(nominations_issued, key=lambda r: -r["year"])))
    print("  审理时长 0 条(官方已下线该页,全站没有替代来源 —— 见 note)")


if __name__ == "__main__":
    main()
