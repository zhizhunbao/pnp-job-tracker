"""雇主省提名门槛判定 B3 · 事实端③ AI 懒查批量化(设计 §2c)。

复用 cms/src/lib/companyResearch.ts 定义的 [FOUNDED]/[SIZE] 字段(该文件只读,不改)——
同一套 SYSTEM 提示词 + 朋友的 qwen3.6 联网端点(legacy /api/chat,webSearch=true,与 K 懒探索同源),
批量跑 named 集合(data/processed/named_employers.json),结构化落列到
data/processed/employer_facts.json(与 _enrich_employer_facts.py 共用同一份缓存,按 slug 增量合并)。

红线:
- 只吃 companyResearch.ts SYSTEM 已定义的 [SIZE]/[FOUNDED] 两节,不额外要求模型输出别的字段;
  查不到=原样保留 "(not stated)"→ 不落列(不编数据)。
- 数字校验:年份需 1800-2026;员工数取文本里第一个整数(允许 "500-1,000"/"~200"/"200+" 等区间/约数
  记法,统一记「区间起点或约数」+ staff_est_src 标注原文,供 B4 UI 层判定时显「估算」。
- 跳过已 sector=public(公共部门不进企业事实判定,见 _enrich_employer_facts.py)、
  已有 ai_checked=1(懒查铁律:一家公司一生一次,查不到也不重查,除非显式 --refresh)。
- --limit 控制单轮跑量(收口人全量批走后台,别在交互 session 里跑几千家);断点续跑靠 ai_checked 标记。

env: 复用 cms/.env 的 TRANSLATE_API_BASE / TRANSLATE_API_KEY(与 news 懒翻译同源,见 friendLlm.ts)。
"""
import argparse
import json
import re
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths

IN_NAMED = _paths.PROCESSED / "named_employers.json"
OUT = _paths.PROCESSED / "employer_facts.json"
ENV_FILE = _paths.ROOT / "cms" / ".env"

# 与 cms/src/lib/companyResearch.ts SYSTEM 提示词保持字面一致(只读该文件,没有改它;这里是 ETL 侧独立
# 调用同一朋友端点的必要复刻——两处各自维护,改动需同步,已在两文件顶部互相点名)。
SYSTEM = """You are a factual company researcher. Use ONLY the web search results.
Output plain text with EXACTLY these section markers, each on its own line: [WHAT] [BASE] [SIZE] [FOUNDED] [NOTE]
- [WHAT]: 1-2 sentences on what the company does / what it sells.
- [BASE]: where it is based (city, province) — one short line.
- [SIZE]: employee count or scale ONLY if the results state it.
- [FOUNDED]: founding year ONLY if the results state it — one short line.
- [NOTE]: ONE fact a job seeker would care about that the results state (parent company, stock listing, major brands/products, main clients) — one short line.
If a section is not supported by the results, write exactly: (not stated)
If the results are unclear or about a different company, reply exactly: NOT_FOUND
Finally on its own line output [SITE]=<official website url or NONE>. No other commentary."""


def load_friend_env() -> tuple[str, str]:
    if not ENV_FILE.exists():
        return "", ""
    base = key = ""
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if line.startswith("TRANSLATE_API_BASE="):
            base = line.split("=", 1)[1].strip()
        elif line.startswith("TRANSLATE_API_KEY="):
            key = line.split("=", 1)[1].strip()
    return base.rstrip("/"), key


# 2026-08-09 修两个 bug(协调方点名 + 自查追加,都是「宁缺勿猜」红线):
# ① 原 FOUNDED_RE/SIZE_RE 用 \s* 接 (.+),\s 吃换行——[SIZE] 一节模型答空白(留一个空格,没照 SYSTEM
#    要求写 "(not stated)")时,正则会越过换行把下一节 [FOUNDED] 的整行吃进来当 SIZE 内容,
#    实测 bell-canada 落 staff_est=1983(其实是 FOUNDED 年份)、cdc-computers 落 staff_est=30
#    (其实是 "Over 30 years" 司龄,不是员工数)。改按行严格切,一节只在它自己那一行里找。
# ② 原「一行里第一个数字就当员工数」对 [SIZE] 写「地点数/车辆数」时一样会取错——
#    实测 englobe-corp "Over 60 locations across Canada" 落 staff_est=60(那是分部数,不是人数)、
#    winstar-transport-ltd "12 trucks and 16 drivers" 落 12(卡车数,人数其实是 16)。
#    改成:数字必须**紧邻人数关键词**(employees/staff/workers/professionals/people/personnel/
#    team members/associates/workforce)才收,地点数/车辆数/门店数等无人数词伴随的数字一律不当员工数
#    ——查不到可靠人数就留空,好过给一个语义错的整数。
FOUNDED_RE = re.compile(r"^\[FOUNDED\]\s*:?\s*(.*)$", re.M)
SIZE_RE = re.compile(r"^\[SIZE\]\s*:?\s*(.*)$", re.M)
YEAR_RE = re.compile(r"\b(1[89]\d{2}|20[0-2]\d)\b")
PEOPLE_WORDS = r"employees?|staff(?:\s+members?)?|workers?|professionals?|people|personnel|team\s+members?|associates?|workforce|headcount"
SIZE_FWD_RE = re.compile(r"([\d,]{1,7})\+?\s*(?:" + PEOPLE_WORDS + r")", re.I)
SIZE_BACK_RE = re.compile(r"(?:" + PEOPLE_WORDS + r")\D{0,15}?([\d,]{1,7})", re.I)


def parse_founded(text: str) -> int | None:
    """一行文本取年份,信任边界:1800-2026 才收(companyResearch.ts SYSTEM 没做数值校验,ETL 侧补)。"""
    m = YEAR_RE.search(text)
    if not m:
        return None
    y = int(m.group(1))
    return y if 1800 <= y <= 2026 else None


def parse_size(text: str) -> tuple[int, str] | None:
    """员工数估算:数字必须紧邻人数关键词才收(见文件头 2026-08-09 修②),地点/车辆/门店数不当人数。"""
    m = SIZE_FWD_RE.search(text) or SIZE_BACK_RE.search(text)
    if not m:
        return None
    raw = (m.group(1) or "").replace(",", "").strip()
    if not raw.isdigit():  # 正则可选组可匹空串(2026-08-09 实撞 int('') 崩批),空/非数字一律不收
        return None
    n = int(raw)
    if n <= 0 or n > 5_000_000:  # 正整数,信任边界粗校验
        return None
    return n, text.strip()[:120]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=30, help="本轮最多查多少家(默认 30 = 验收样本量)")
    ap.add_argument("--refresh", action="store_true", help="连已查过的(ai_checked=1)一起重查")
    args = ap.parse_args()

    base, key = load_friend_env()
    if not base or not key:
        print("TRANSLATE_API_BASE/KEY 未配置(cms/.env)— 无法调用朋友端点,退出", flush=True)
        return

    named = json.loads(IN_NAMED.read_text(encoding="utf-8"))
    cache: dict[str, dict] = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}

    todo = []
    for row in named:
        sl = row["slug"]
        rec = cache.get(sl, {})
        if rec.get("sector") == "public":
            continue  # 公共部门不进 AI 事实判定
        if rec.get("ai_checked") and not args.refresh:
            continue
        todo.append(row)
    todo = todo[: args.limit]
    print(f"named {len(named)} 家 · 待查(未 ai_checked,非公共部门) {len([r for r in named if not cache.get(r['slug'], {}).get('ai_checked') and cache.get(r['slug'], {}).get('sector') != 'public'])} · 本轮跑 {len(todo)}(limit {args.limit})", flush=True)

    n_founded = n_size = n_notfound = n_fail = 0
    with httpx.Client(timeout=70) as cl:
        for i, row in enumerate(todo):
            sl, name = row["slug"], row["name"]
            rec = cache.setdefault(sl, {"name": name})
            try:
                r = cl.post(
                    f"{base}/api/chat",
                    headers={"X-API-Key": key, "Content-Type": "application/json"},
                    json={
                        "prompt": f"Company: {name} (Canada). What does this company do?",
                        "system": SYSTEM,
                        "web_search": True,
                        "search_query": f"{name} company Canada",
                    },
                )
                if not r.is_success:
                    rec["ai_checked"] = 1
                    rec["ai_note"] = f"http {r.status_code}"
                    n_fail += 1
                    continue
                answer = (r.json().get("answer") or "").strip()
            except Exception as e:  # noqa: BLE001
                rec["ai_checked"] = 1
                rec["ai_note"] = f"err {type(e).__name__}"
                n_fail += 1
                continue

            rec["ai_checked"] = 1
            if not answer or "NOT_FOUND" in answer:
                n_notfound += 1
                continue

            fm = FOUNDED_RE.search(answer)
            if fm and "(not stated)" not in fm.group(1):
                y = parse_founded(fm.group(1))
                if y and "founded_year" not in rec:  # AI 是三路里最弱证据,不覆盖已有的注册库硬数据
                    rec["founded_year"] = y
                    rec["founded_src"] = "ai"
                    n_founded += 1
            sm = SIZE_RE.search(answer)
            if sm and "(not stated)" not in sm.group(1):
                sz = parse_size(sm.group(1))
                if sz:
                    rec["staff_est"], rec["staff_est_src"] = sz
                    n_size += 1
            if (i + 1) % 5 == 0:
                OUT.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
                print(f"  {i + 1}/{len(todo)} · founded {n_founded} · size {n_size} · not_found {n_notfound} · fail {n_fail}", flush=True)
            time.sleep(0.3)

    OUT.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"done → {OUT} · 本轮 founded +{n_founded} · size +{n_size} · not_found {n_notfound} · fail {n_fail}", flush=True)


if __name__ == "__main__":
    main()
