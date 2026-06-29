"""build_ee_draws — 联邦 Express Entry「抽选轮次」(IRCC 开放 JSON,httpx 直取,无 Akamai/无需抓页)。
源:https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json
每个**类别**取最近一次抽选(日期 / CRS 分数线 / 发出邀请数)→ raw/ee/draws.json,
供 09_build_mart join 进 ee_categories(EE 弹框显示「近期抽选:CRS XXX · 日期」)。

Usage:  uv run python etl/build_ee_draws.py
"""
import datetime
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

URL = "https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json"
OUT = _paths.EE / "draws.json"

# drawName 关键词 → 类别 key。前 9 个与 _fetch_ee_categories 的 CAT_MAP 对齐(能 join 进 ee_categories);
# 其余(agriculture/french/cec/pnp/general 等)无 NOC 清单不 join,仅留作 recent 参考。
CAT_MAP = [
    ("health", "healthcare"), ("stem", "stem"), ("science", "stem"), ("trade", "trade"),
    ("education", "education"), ("transport", "transport"), ("physician", "physicians"),
    ("senior manager", "senior-managers"), ("research", "researchers"), ("military", "military"),
    ("agricul", "agriculture"), ("french", "french"), ("canadian experience", "cec"),
    ("provincial nominee", "pnp"), ("federal skilled", "fsw"), ("general", "general"),
]


def cat_key(name: str):
    n = (name or "").lower()
    for kw, key in CAT_MAP:
        if kw in n:
            return key
    return None


def _int(s):
    try:
        return int((s or "").replace(",", "").strip())
    except (ValueError, AttributeError):
        return None


def main() -> None:
    r = httpx.get(URL, timeout=30, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    rounds = r.json().get("rounds", [])  # 已按 drawNumber 降序(最新在前)

    by_cat: dict[str, dict] = {}
    for rd in rounds:
        key = cat_key(rd.get("drawName"))
        if not key or key in by_cat:   # 每类别首次出现 = 最近一次
            continue
        by_cat[key] = {
            "date": rd.get("drawDate"), "crs": _int(rd.get("drawCRS")),
            "size": _int(rd.get("drawSize")), "drawName": rd.get("drawName"),
            "drawNumber": _int(rd.get("drawNumber")),
        }
    recent = [{
        "date": rd.get("drawDate"), "crs": _int(rd.get("drawCRS")),
        "size": _int(rd.get("drawSize")), "name": rd.get("drawName"),
        "number": _int(rd.get("drawNumber")),
    } for rd in rounds[:20]]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "Express Entry rounds of invitations", "url": URL,
        "fetched": datetime.date.today().isoformat(),
        "byCategory": by_cat, "recent": recent,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  ({len(by_cat)} 类别有最近抽选 / {len(rounds)} 轮总计)")
    for k, v in by_cat.items():
        print(f"  {k:16} CRS {v['crs']} · {v['date']} · {v['size']} ITAs · {v['drawName']}")


if __name__ == "__main__":
    main()
