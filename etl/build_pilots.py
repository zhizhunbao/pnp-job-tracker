"""build_pilots — RCIP/FCIP 试点社区名单(E6-11 3.1/3.2,2026-08-15)。

社区名单从 fed-rcip 周更 crawl 的 IRCC 官方名单页缓存解析(URL→数据铁律,不发新请求);
社区 → Job Bank 城市映射是**人工核对表**(CITY_MAP,3.2 红线:宁漏勿错):
  · 单城社区:社区名即城市名(IRCC 官方表原文),对照 jobs.city 实测存在才映射
  · 区域型社区(West Kootenay/Peace Liard 等 6 个):界线未逐社区举证 → cities=[] 不参与打标,
    种子已进 crawl(sources-canada.md 试点社区行),界线页举证后补
口径:试点=社区推荐制且雇主须先被社区指定;本表只回答「岗在不在试点社区」这一层。

  IN : data/crawl/fed-rcip/manifest.json + html_cache(rural-franco-pilots.html 官方名单)
  OUT: raw/pilot/pilot-communities.json

Usage:  uv run python etl/build_pilots.py
"""
import io
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

if os.name == "nt":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

IN_MANIFEST = _paths.CRAWL / "fed-rcip" / "manifest.json"
OUT = _paths.PILOT / "pilot-communities.json"
print(f"IN_MANIFEST={IN_MANIFEST}\nOUT={OUT}", flush=True)

# 社区 → Job Bank 城市(2026-08-15 生产库实测城市名;Sudbury 库里双写名并存都收)
CITY_MAP: dict[str, list[str]] = {
    "North Bay and Area": ["North Bay"],
    "Sudbury, ON": ["Sudbury", "Greater Sudbury"],
    "Timmins, ON": ["Timmins"],
    "Sault Ste. Marie, ON": ["Sault Ste. Marie"],
    "Thunder Bay, ON": ["Thunder Bay"],
    "Steinbach, MB": ["Steinbach"],
    "Altona/Rhineland, MB": ["Altona"],
    "Brandon, MB": ["Brandon"],
    "Moose Jaw, SK": ["Moose Jaw"],
    "Claresholm, AB": ["Claresholm"],
    "St. Pierre Jolys, MB": ["St-Pierre-Jolys"],
    "Kelowna, BC": ["Kelowna"],
    # 区域型社区界线未举证 → 不映射(Pictou County/West Kootenay/North Okanagan Shuswap/
    # Peace Liard/Acadian Peninsula/Superior East Region)
}
PROV_RE = re.compile(r",\s*(ON|MB|SK|AB|BC|NS|NB)\s*$")
PROV_HINT = {"North Bay and Area": "ON", "Pictou County, NS": "NS", "Acadian Peninsula, NB": "NB",
             "West Kootenay, BC": "BC", "North Okanagan Shuswap, BC": "BC", "Peace Liard, BC": "BC",
             "Superior East Region, ON": "ON"}


def main() -> None:
    _paths.PILOT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(IN_MANIFEST.read_text(encoding="utf-8"))
    page = next(p for p in manifest["pages"] if p["url"].endswith("rural-franco-pilots.html"))
    html = (IN_MANIFEST.parent / "html_cache" / page["html"]).read_text(encoding="utf-8", errors="replace")
    # 名单在「Participating communities」节:h3「Rural communities」→ RCIP,
    # h3「Francophone communities」→ FCIP(页顶导语也含 Francophone 字样,只认 h3 标题锚)
    rural = re.search(r"<h3[^>]*>\s*Rural communities\s*</h3>", html)
    franco = re.search(r"<h3[^>]*>\s*Francophone communities\s*</h3>", html)
    if not rural or not franco:
        print("  ✗ 找不到 Rural/Francophone communities 标题 —— 疑似 IRCC 页改版,保留旧表(不拦役)")
        return
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for seg, typ in ((html[rural.end():franco.start()], "RCIP"), (html[franco.end():], "FCIP")):
        for u, name in re.findall(r'<a[^>]+href="(https?://[^"]+)"[^>]*>\s*([^<]{3,60})\s*</a>', seg):
            name = " ".join(name.split())
            if "canada.ca" in u or "gc.ca" in u or not (PROV_RE.search(name) or name in PROV_HINT):
                continue
            if (name, typ) in seen:
                continue
            seen.add((name, typ))
            prov = PROV_HINT.get(name) or PROV_RE.search(name).group(1)  # type: ignore[union-attr]
            rows.append({"name": name, "province": prov, "type": typ,
                         "cities": CITY_MAP.get(name, []), "url": u})
    # 哨兵:官方名单 14 RCIP + 6 FCIP;解析塌方(改版)就报错退出,保旧不覆盖
    n_rcip = sum(1 for r in rows if r["type"] == "RCIP")
    n_fcip = sum(1 for r in rows if r["type"] == "FCIP")
    if n_rcip < 10 or n_fcip < 4:
        print(f"  ✗ 解析塌方:RCIP {n_rcip}/14 · FCIP {n_fcip}/6 —— 疑似 IRCC 页改版,保留旧表(不拦役)")
        return
    mapped = sum(1 for r in rows if r["cities"])
    OUT.write_text(json.dumps({
        "fetched": date.today().isoformat(),
        "source": page["url"],
        "note": ("IRCC 官方参与社区名单(fed-rcip crawl 缓存解析)。cities=人工核对的 Job Bank 城市映射,"
                 "空=区域型社区界线未举证不打标(宁漏勿错);试点须雇主被社区指定,城市命中只是粗筛信号。"),
        "rows": rows,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  ✓ 社区 {len(rows)}(RCIP {n_rcip} + FCIP {n_fcip})· 已映射城市 {mapped} 个社区 → {OUT.name}", flush=True)


if __name__ == "__main__":
    main()
