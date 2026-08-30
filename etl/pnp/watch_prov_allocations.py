"""watch_allocations — 省提名名额公告哨兵(2026-08-14 立项,竞争卡缺口探索的落地件之一)。

盯的问题:pnp_allocations.json(人工核对维护表)里还空着的 (省, 年) 名额,官方页什么时候公布。
crawl 役每小时抓九省官网原文进 data/crawl/<slug>/html_cache,news 役 12h 聚合官方公告 ——
但雷达只报「URL 变了」,没人盯「名额数字出现了」。本哨兵每轮把两处原文 grep 一遍:
「allocat*」±窗口内同时出现目标年份 + 合理量级数字 → 疑似公告,打「!」日志行
(auto_update 把 !/✗ 开头行记 ERROR 级,容器日志里一眼可见)。

**只提醒不写表**:配额表是人工核对制(Frank 抽查),自动写入违背其设计;state 文件只做去重,
同一条命中不月月重复喊。哨兵自身任何失败都不拦役(exit 0),命中与否不算失败。

  IN : raw/ircc/pnp_allocations.json      (哪些 (省,年) 还空着 → 监视目标)
       data/crawl/<slug>/html_cache/*.html (crawl 役产出,只扫目标省的 slug)
       raw/news/news.json                  (news 役产出)
  OUT: raw/ircc/allocation_watch.json      (state:已见命中,去重用)

Usage:  uv run python etl/watch_allocations.py
"""
import io
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

if os.name == "nt":  # 本机控制台 cp1252 打不了 !/✗ 行里的中文;容器由 auto_update 设 PYTHONIOENCODING
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import _paths  # noqa: E402

IN_ALLOC = _paths.IRCC / "pnp_allocations.json"
IN_NS = _paths.IRCC / "ns_allocations.json"      # NS 官方开放数据(scrape_ns_allocations 产)→ 对账
IN_CRAWL = _paths.CRAWL
IN_NEWS = _paths.NEWS / "news.json"
OUT_STATE = _paths.IRCC / "allocation_watch.json"
print(f"IN_ALLOC={IN_ALLOC}\nIN_CRAWL={IN_CRAWL}\nIN_NEWS={IN_NEWS}\nOUT_STATE={OUT_STATE}", flush=True)

# crawl slug → 省码(只扫有监视目标的省;联邦种子不扫 —— 名额公告发在省官网/省新闻)
SLUG_PROV = {
    "ns-root": "NS", "nb-imm": "NB", "nl-imm": "NL", "pe-imm": "PE",
    "mb-mpnp": "MB", "mb-root": "MB", "sk-sinp": "SK", "ab-aaip": "AB",
    "bc-immigrate": "BC", "on-oinp": "ON", "oinp-times": "ON",
}
PROV_NAMES = {
    "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE", "Nova Scotia": "NS",
    "New Brunswick": "NB", "Ontario": "ON", "Manitoba": "MB",
    "Saskatchewan": "SK", "Alberta": "AB", "British Columbia": "BC",
}
WINDOW = 220          # 「allocat」两侧各取多少字符作上下文
N_MIN, N_MAX = 200, 30000   # 名额量级(历年区间 1,025–21,500;出界=年份/电话号等噪声)
MAX_ALERTS = 20       # 单轮最多喊多少条新命中(首轮防刷屏;state 照记全量)

RE_ALLOC = re.compile(r"allocat", re.I)
RE_NOM = re.compile(r"nominat|spaces|spots", re.I)
RE_NUM = re.compile(r"\b(\d{1,2},\d{3}|[1-9]\d{2,4})\b")
RE_TAG = re.compile(r"<(?:script|style)\b.*?</(?:script|style)>|<[^>]+>", re.S | re.I)


def targets() -> dict[str, set[str]]:
    """{省: {监视年份}}:配额表里为 null 的 y 字段年份;外加下一年(公告常提前一个年底发)全省都盯。"""
    alloc = json.loads(IN_ALLOC.read_text(encoding="utf-8"))
    out: dict[str, set[str]] = {}
    for r in alloc.get("rows", []):
        missing = {k[1:] for k, v in r.items() if re.fullmatch(r"y20\d\d", k) and v is None}
        missing.add(str(date.today().year + 1))
        out[r["prov"]] = missing
    return out


def hits_in_text(text: str, src_prov: str, want: dict[str, set[str]]) -> list[dict]:
    """一段纯文本里的疑似名额句:allocat* 窗口内 (目标年份 + 量级合理的数字)。
    省归属:窗口里点名的省名优先(同页可能列多省),没点名才用来源省。"""
    found = []
    for m in RE_ALLOC.finditer(text):
        win = text[max(0, m.start() - WINDOW): m.end() + WINDOW]
        if not RE_NOM.search(win):        # 光有 allocat 不够:窗口里得真在说提名名额
            continue
        provs = {c for name, c in PROV_NAMES.items() if name in win} or ({src_prov} if src_prov else set())
        for prov in provs:
            for year in want.get(prov, ()):  # noqa: B905
                if year not in win:
                    continue
                for nm in RE_NUM.finditer(win):
                    n = int(nm.group(1).replace(",", ""))
                    # 2000–2100 一律当年份剔掉:「2,025」这种带逗号的年份是首轮实测的头号假命中
                    if N_MIN <= n <= N_MAX and not 2000 <= n <= 2100:
                        found.append({"prov": prov, "year": year, "n": n,
                                      "quote": " ".join(win.split())[:180]})
    return found


def main() -> None:
    if not IN_ALLOC.exists():
        print("✗ 配额表不存在,哨兵空转")
        return
    alloc_rows = {r["prov"]: r for r in json.loads(IN_ALLOC.read_text(encoding="utf-8"))["rows"]}
    # NS 对账:人工表 NS 行 vs 省官方开放数据(NSNP 口径)。不一致或官方有数我们空着 → 喊人。
    # 每轮都喊(不进 state 去重)—— 对不上就该一直响,修对了自然静音
    if IN_NS.exists():
        try:
            nsnp = (json.loads(IN_NS.read_text(encoding="utf-8")).get("byProgram") or {}).get("nsnp") or {}
            ns_row = alloc_rows.get("NS") or {}
            for y, official in sorted(nsnp.items()):
                field = f"y{y}"
                if field not in ns_row:
                    continue
                ours = ns_row.get(field)
                if ours is None:
                    print(f"! NS {y} 名额官方有数({official:,})而人工表空着 —— 去补 pnp_allocations.json", flush=True)
                elif int(ours) != int(official):
                    print(f"! NS {y} 名额对账不一致:人工表 {ours:,} vs 官方 {official:,}({IN_NS.name})", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"✗ NS 对账失败({type(e).__name__}),跳过")
    want = targets()
    watch_provs = {p for p, ys in want.items() if ys}
    state = {"seen": {}}
    if OUT_STATE.exists():
        try:
            state = json.loads(OUT_STATE.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001  state 坏了当首轮,顶多重复喊一遍
            pass
    seen: dict = state.get("seen") or {}

    hits: list[dict] = []
    scanned = 0
    # 1) crawl html_cache(只扫目标省的 slug)
    for slug, prov in SLUG_PROV.items():
        if prov not in watch_provs:
            continue
        cache = IN_CRAWL / slug / "html_cache"
        if not cache.is_dir():
            continue
        for f in cache.glob("*.html"):
            scanned += 1
            try:
                text = RE_TAG.sub(" ", f.read_text(encoding="utf-8", errors="replace"))
            except OSError:
                continue
            for h in hits_in_text(text, prov, want):
                hits.append({**h, "src": f"{slug}/{f.name}"})
    # 2) news.json(官方公告聚合;region 即省码)
    if IN_NEWS.exists():
        try:
            news = json.loads(IN_NEWS.read_text(encoding="utf-8"))
            for it in news.get("items") or []:
                scanned += 1
                text = f"{it.get('title') or ''}\n{it.get('bodyEn') or ''}"
                for h in hits_in_text(text, str(it.get("region") or ""), want):
                    hits.append({**h, "src": it.get("url") or "news"})
        except Exception as e:  # noqa: BLE001
            print(f"✗ news.json 读取失败({type(e).__name__}),跳过该源")

    today = date.today().isoformat()
    fresh = []
    for h in hits:
        key = f"{h['prov']}:{h['year']}:{h['n']}"
        if key in seen:
            continue
        seen[key] = {**h, "first": today}
        fresh.append(h)
    for h in fresh[:MAX_ALERTS]:
        print(f"! {h['prov']} {h['year']} 名额疑似公告:{h['n']:,} —— “{h['quote']}” ({h['src']})", flush=True)
    if len(fresh) > MAX_ALERTS:
        print(f"! …另有 {len(fresh) - MAX_ALERTS} 条新命中,详见 {OUT_STATE.name}", flush=True)

    OUT_STATE.write_text(json.dumps({
        "fetched": today,
        "note": "名额公告哨兵 state(去重用)。命中≠核实:数字进 pnp_allocations.json 前必须人工回官方页核对原句。",
        "watch": {p: sorted(ys) for p, ys in want.items()},
        "seen": seen,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ 哨兵扫 {scanned} 份文本 · 监视 {len(watch_provs)} 省 · 新命中 {len(fresh)} · 累计 {len(seen)}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001  哨兵挂了不拦役:报错但 exit 0
        print(f"✗ 哨兵异常退出({type(e).__name__}: {e})—— 不拦役,下轮重试")
