"""
build_nb — NB 省提名「优先行业」政策表(每省一个 build 脚本,完全自包含)。

NB 与 BC/SK 不同:官方**不公布 NOC 职业清单**,只公布**行业**。核实(2026-07-25 httpx 直取
gnb.ca notice 页):NB 省提名**开放**(旧「2026-02 暂停」记忆已作废),但
**NB Skilled Worker 的 New Brunswick Experience pathway 自 2026-05-04 起 until further notice,
新 ITA 只限 Healthcare / Education / Construction Trades 三行业**(官方原因:该流剩余配额有限)。

因此走 ON `on-workforce-priority.json` 同款**人工政策表**路子(非 crawl 具名 NOC),
用「行业 → 本站 broad 大类」映射,08_score 按 job.broad 判定:
  · 岗在三优先行业(broad ∈ 医疗/教育/技工) → 「NB 优先行业」强信号(能走 NB Experience)
  · 岗不在 → **不再一律绿「能走通用通道」**,如实显示「NB Experience 当前限医疗/教育/建筑」行业限制态。
构建/建筑映射到 broad「技工」为近似(技工含非建筑工种);nocMajor 72/73 供 08_score 需要更细时收紧。

政策表**人工维护**(NB 改政策才改本表,同 ON 惯例);httpx 抓 notice 页仅用于**校验政策是否变**
(不改表,只 WARN 提示复核),抓不到不影响产表。

Usage:  python etl/pnp/build_nb.py            (纯 policy 表,系统 python 即可)
        uv run python etl/pnp/build_nb.py     (含 httpx 政策校验则用 .venv/docker)
"""
import json
import sys
from datetime import date
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))          # etl/ → _paths
import _paths  # noqa: E402

PROVINCE = "NB"
NOTICE_URL = "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/notice.html"
AS_OF = "2026-05-04"   # 官方生效日:限三行业 until further notice

# 行业 → 本站 broad 大类(broad 值见 etl/noc.py:管理/商务/科技/医疗/教育/文体/服务/技工/资源/制造)
SECTORS = [
    {"name": "Healthcare", "nameZh": "医疗", "broads": ["医疗"]},
    {"name": "Education", "nameZh": "教育", "broads": ["教育"]},
    # Construction Trades 近似映射 broad「技工」;nocMajor 供需要更细时按建筑工种收紧
    {"name": "Construction Trades", "nameZh": "建筑技工", "broads": ["技工"], "nocMajor": ["72", "73"]},
]

TABLE = {
    "stream": "NB Skilled Worker – New Brunswick Experience pathway",
    "label": "NB 优先行业",
    "province": PROVINCE,
    "type": "sector-priority",   # 新类型:08_score 按 broad 判优先行业(区别于 indemand/ineligible 的 NOC 清单)
    "url": NOTICE_URL,
    "asOf": AS_OF,
    "note": ("人工维护的政策事实表(非抓取)。NB 省提名开放,但 NB Skilled Worker 的 New Brunswick "
             "Experience pathway 自 2026-05-04 起 until further notice 新 ITA 只限 Healthcare/Education/"
             "Construction Trades 三行业(剩余配额有限)。非这三行业的 NB 岗不应显示无条件「能走通用通道」,"
             "应如实显示行业限制。NB 改政策才改本表(同 ON 惯例);另雇主指定申请暂停受理重评。"),
    "sectors": SECTORS,
}


def verify_notice() -> None:
    """可选:httpx 抓 notice 页,校验「限三行业」政策是否仍在(变了就 WARN 提示复核,不改表)。"""
    try:
        import httpx
    except ImportError:
        print("  · 跳过政策校验(无 httpx;纯表已产出)")
        return
    ua = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")
    try:
        html = httpx.get(NOTICE_URL, headers={"User-Agent": ua}, follow_redirects=True, timeout=30).text
    except Exception as e:  # noqa: BLE001
        print(f"  · 政策校验抓取失败({type(e).__name__});表按人工维护版产出,建议手动复核 {NOTICE_URL}")
        return
    low = html.lower()
    keys = ("healthcare", "education", "construction")
    if all(k in low for k in keys) and "may 4, 2026" in low:
        print("  ✓ 政策校验:notice 页仍含「限医疗/教育/建筑 · 2026-05-04」,政策表与官方一致")
    else:
        print(f"  ⚠ 政策校验:notice 页未命中预期关键词 → NB 政策可能已变,**请人工复核并更新本表**:{NOTICE_URL}")


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    TABLE["fetched"] = date.today().isoformat()
    out = _paths.PNP / "nb-priority.json"
    out.write_text(json.dumps(TABLE, ensure_ascii=False, indent=2), encoding="utf-8")
    sect = "、".join(s["nameZh"] for s in SECTORS)
    print(f"  ✓ NB 优先行业政策表({sect}) → pnp/nb-priority.json  ({TABLE['fetched']})")
    verify_notice()


if __name__ == "__main__":
    main()
