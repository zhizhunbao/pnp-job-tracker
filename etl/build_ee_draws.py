"""build_ee_draws — 联邦 Express Entry「抽选轮次」(IRCC 开放 JSON,httpx 直取,无 Akamai/无需抓页)。
源:https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json
产出 raw/ee/draws.json 三块:
  byCategory  每类别**最近一次**抽选 → 09 join 进 ee_categories(EE 节头「近期抽选」)
  history     每类别**历次**抽选(#135 Frank「点开按时间线看每一轮」)→ 09 灌进 pnp_draws(province=FED,零新表)
  recent      全类别混合最近 20 轮(参考)

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
HIST_PER_CAT = 12          # 每类别保留轮次上限(展示够看趋势,不灌爆维度表)
HIST_MONTHS = 24           # 同时限最近 24 个月(更早的轮次分数线已无参考意义)

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

    cutoff = (datetime.date.today() - datetime.timedelta(days=HIST_MONTHS * 31)).isoformat()
    by_cat: dict[str, dict] = {}
    history: dict[str, list] = {}
    for rd in rounds:                  # 源已按 drawNumber 降序(最新在前)
        key = cat_key(rd.get("drawName"))
        if not key:
            continue
        row = {
            "date": rd.get("drawDate"), "crs": _int(rd.get("drawCRS")),
            "size": _int(rd.get("drawSize")), "drawName": rd.get("drawName"),
            "drawNumber": _int(rd.get("drawNumber")),
        }
        if key not in by_cat:          # 每类别首次出现 = 最近一次
            by_cat[key] = row
        h = history.setdefault(key, [])
        if len(h) < HIST_PER_CAT and (row["date"] or "") >= cutoff:
            h.append(row)
    recent = [{
        "date": rd.get("drawDate"), "crs": _int(rd.get("drawCRS")),
        "size": _int(rd.get("drawSize")), "name": rd.get("drawName"),
        "number": _int(rd.get("drawNumber")),
    } for rd in rounds[:20]]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "Express Entry rounds of invitations", "url": URL,
        "fetched": datetime.date.today().isoformat(),
        "byCategory": by_cat, "history": history, "recent": recent,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  ({len(by_cat)} 类别有最近抽选 / {sum(len(v) for v in history.values())} 条历史 / {len(rounds)} 轮总计)")
    for k, v in by_cat.items():
        print(f"  {k:16} CRS {v['crs']} · {v['date']} · {v['size']} ITAs · 历史 {len(history.get(k, []))} 轮")


if __name__ == "__main__":
    main()
