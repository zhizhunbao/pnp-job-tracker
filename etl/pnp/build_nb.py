"""
build_nb — NB 省提名(NBPNP)不受理职业清单(每省一个 build 脚本,完全自包含)。

**实时抓** gnb.ca「Important notices」页(httpx 直连 200)。E6-09 全省核查纠正了两条旧假设:
① 旧记忆「NB 2026-02 暂停省提名」错误——NB 在办,只是层层收窄;
② 首版曾想把 2026-05-04「NB Experience pathway 限 Healthcare/Education/Construction Trades」
   做成「行业→本站 broad 大类」判定 —— **已放弃**:官方只给行业名不给 NOC,broad 映射会硬猜
  (NOC 大类 4 含教师也含警察律师社工、护理员 44101 落在「教育」大类而非「医疗」),
   踩「宁可留空也不瞎猜」。该行业限制**只对 NB Experience 一条 pathway**,通过 NB 新闻
  (scrape_nb_nbpnp_news)在弹框「本省最新公告」如实呈现,不做逐岗判定。

本脚本只落**官方逐条列了 NOC 码的硬限制**(2026-02-03 起,针对 NB Skilled Worker + NB Express
Entry 两个流的 EOI/ITA):
  · nb-ineligible.json       「NB 不符合清单」   —— regardless of sectors,14 个 NOC,无条件
  · nb-ineligible-food.json  「NB 餐饮住宿不符合」—— 住宿餐饮业(NAICS 72),13 个 NOC
    **条件性**:官方原文「雇主本身不属住宿餐饮业(NAICS 72)的同款岗仍可提交 EOI」。本站没有雇主
    NAICS 行业字段(不猜),按多数情形(此类岗绝大多数就在餐饮住宿业)判不符合,条件写进 label 与
    note,由用户对自己雇主行业做最后判断 —— 粗筛信号,非资格认定(同 CLAUDE.md 口径)。

两表都是 `type=ineligible`(命中=不符合)+ **`overlay=true`**:与 AAIP 那种「本省无 TEER 门槛、
除清单外全可」不同,NB 的排除是**叠加**在默认 TEER 规则上的(NB Skilled Worker 仍要技能岗 offer)
—— 08_score 见 overlay 只做「命中即不可」,不把该省 TEER4-5 默认放开。

抓不到/解析空 → 跳过、保留旧表(宁可留旧也不留空)。

Usage:  uv run python etl/pnp/build_nb.py   (需 httpx,系统 python 没装 → 用 .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))            # etl/ → _paths
sys.path.insert(0, str(_HERE.parent / "crawl"))  # etl/crawl/ → converters(HTML→md)
import _paths  # noqa: E402
from converters import get_converter  # noqa: E402

PROVINCE = "NB"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
_PROFILE = {"content_selector": None, "remove_selectors": [], "css_file": None, "direct_suffix": None, "converter": None}
URL = "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/notice.html"
STREAM = "NB Skilled Worker stream / NB Express Entry stream — occupations not being considered (EOI/ITA)"
SPLIT = "regardless of sectors"     # 官方原文的分界句:此句之前=NAICS 72 条件性,之后=无条件
BUCKETS = {
    "any": {"out": "nb-ineligible.json", "label": "NB 不符合清单",
            "note": "自 2026-02-03 起,NB 不受理这些职业的 EOI/ITA(不论雇主属什么行业)。"},
    "food": {"out": "nb-ineligible-food.json", "label": "NB 餐饮住宿不符合",
             "note": ("自 2026-02-03 起,NB 不受理住宿餐饮业(NAICS 72)这些职业的 EOI/ITA。"
                      "官方留了口子:雇主本身不属住宿餐饮业的同款岗仍可提交——本站无雇主行业字段,"
                      "按多数情形判不符合,请按自己雇主的实际行业核对。")}
}
# 官方写法:**NOC 63200** – Cooks(粗体记号与破折号形式不稳定,宽松匹配)
NOC_LINE = re.compile(r"NOC\s*(\d{5})\s*\*{0,2}\s*[–—-]\s*\*{0,2}\s*(.+?)\s*"
                      r"(?=\*{0,2}\s*NOC\s*\d{5}|$)", re.S)
# 清单末条会粘上后文正文(官方一段到底,无列表标签)→ 名字在这些词处截断
TAIL = re.compile(r"\s+(?:However\b|Additionally\b|In addition\b|This restriction\b|>).*$", re.S)
SECTOR_NOTICE = "2026-05-04 起 NB Experience pathway 新 ITA 只限 Healthcare/Education/Construction Trades"


def fetch_md() -> str:
    html = httpx.get(URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    md, _ = get_converter().convert(html, URL, _PROFILE)
    return md


def pnp_notice(md: str) -> str:
    """取「不受理 EOI/ITA」那条通告(同页另有一条同款 AIP 背书限制,列表略有不同——本脚本只要 PNP 那条)。"""
    for b in md.split("### Notice"):
        if "expressions of interest" in b and "Skilled Worker stream" in b:
            return b
    return ""


def parse_nocs(seg: str) -> list[dict]:
    out: dict[str, str] = {}
    for m in NOC_LINE.finditer(seg):
        name = TAIL.sub("", re.sub(r"\s+", " ", m.group(2))).strip(" *–—-.,")
        if name:
            out.setdefault(m.group(1), name[:80])
    return [{"noc": n, "name": nm} for n, nm in sorted(out.items())]


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    try:
        md = fetch_md()
    except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表,不留空
        print(f"  ✗ 抓取失败 {URL}: {type(e).__name__} {e}(保留旧表)")
        return
    notice = pnp_notice(md)
    if not notice:
        print("  ✗ 没找到「不受理 EOI/ITA」通告 → NB 可能已改政策,请人工复核(保留旧表)")
        return
    i = notice.find(SPLIT)
    segs = {"food": notice[:i], "any": notice[i:]} if i > 0 else {"any": notice}
    for key, cfg in BUCKETS.items():
        occs = parse_nocs(segs.get(key, ""))
        if not occs:
            print(f"  ✗ 没解析到 NOC: {cfg['out']}(保留旧表)")
            continue
        table = {
            "stream": STREAM, "label": cfg["label"], "province": PROVINCE,
            "type": "ineligible", "overlay": True, "note": cfg["note"],
            "url": URL, "fetched": date.today().isoformat(),
            "occupations": occs,
        }
        (_paths.PNP / cfg["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {cfg['label']:<10} {len(occs):>3} 个职业 → pnp/{cfg['out']}  (实时 {table['fetched']})")
    # 行业限制不做逐岗判定(见模块注释),但政策还在不在得盯着——变了要人工复核新闻文案
    low = md.lower()
    if all(k in low for k in ("healthcare", "construction trades")) and "may 4, 2026" in low:
        print(f"  · 政策校验:{SECTOR_NOTICE}(仍在;逐岗判定不做,由 NB 新闻呈现)")
    else:
        print(f"  ⚠ 政策校验:未命中「限三行业」原文 → NB 行业限制可能已变,请人工复核 {URL}")


if __name__ == "__main__":
    main()
