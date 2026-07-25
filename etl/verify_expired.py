"""死岗验尸(第25轮 #124,批C)。

背景:发布>30 天仍 open 的桶抽样 63% 已在 Job Bank 过期(第25轮三组对照实测),用户点开撞
「Job posting expired」;而下架老逻辑刻意保守(「本次未见 且 >30 天」,805 误杀教训)拦不住它们
——postings.json 全量累积,帖永远「在见」。

做法:主动逐帖验尸,不动老逻辑。
- 候选:postings.json 里 jobbank 帖 且 发布>EXPIRE_DAYS 天,未判死过,距上次检查>RECHECK_DAYS;
- 判死:GET 帖页 <title> 含 "Job posting expired"(服务端渲染裸抓可判;过期横幅是 JS 注入判不了,
  第25轮判死正则误报的教训:判据必须过对照组)+ HTTP 404;网络错误=保留(宁可留活);
- 结果累积 expired_ids.json;09_build_mart 组装时剔除 → 帖退出 mart/seen →
  seed 既有下架规则(不在 seen 且 >30 天)自然置 closed,不改任何灌库语义;
- 节奏:每轮小批(MAX_CHECKS)连续排水,不做周聚合——一次 2.5k 帖 ≈20 分钟会拖垮那轮 seed 时效
  (enrich 拆独立角色的同一教训);积压几轮排完,稳态=每轮只验新过 30 天线的+到复检期的,分钟级。
"""
import json
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

IN_POSTINGS = _paths.PROCESSED_JOBBANK / "postings.json"
OUT_STATE = _paths.PROCESSED_JOBBANK / "expired_ids.json"

EXPIRE_DAYS = 30          # 与 seed 下架规则同口径
RECHECK_DAYS = 7          # 活帖复检间隔(上次活着,7 天后可再验)
MAX_CHECKS = 600          # 单轮请求上限(0.4s 节流 ≈4 分钟,不拖垮本轮 seed 时效)
SLEEP_S = 0.4             # 节流:官方站,温柔点
TIMEOUT_S = 15
HEAD_BYTES = 6000         # <title> 在页头,读这么多足够
MARKER = "Job posting expired"
UA = {"User-Agent": "offer2pr-expiry-check/1.0"}


def parse_date(s: str) -> datetime | None:
    s = (s or "").strip()
    for fmt in ("%B %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s[:10] if fmt == "%Y-%m-%d" else s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def main() -> None:
    now = datetime.now(timezone.utc)
    state = {"dead": {}, "checked": {}}
    if OUT_STATE.exists():
        state = json.loads(OUT_STATE.read_text(encoding="utf-8"))

    postings = json.loads(IN_POSTINGS.read_text(encoding="utf-8"))
    cutoff = now - timedelta(days=EXPIRE_DAYS)
    recheck_before = (now - timedelta(days=RECHECK_DAYS)).isoformat()
    cands = []
    for p in postings:
        pid, url = p.get("posting_id", ""), p.get("url", "")
        if not pid or "jobbank.gc.ca" not in url or pid in state["dead"]:
            continue
        d = parse_date(p.get("date", ""))
        if d is None or d > cutoff:
            continue
        if state["checked"].get(pid, "") > recheck_before:
            continue
        cands.append((pid, url))
    print(f"verify_expired: 候选 {len(cands)}(发布>{EXPIRE_DAYS}天的 jobbank 帖),本轮验 {min(len(cands), MAX_CHECKS)}")
    if not cands:
        return

    dead_new = alive = errs = 0
    with httpx.Client(headers=UA, timeout=TIMEOUT_S, follow_redirects=True) as c:
        for pid, url in cands[:MAX_CHECKS]:
            try:
                r = c.get(url)
                if r.status_code == 404 or MARKER in r.text[:HEAD_BYTES]:
                    state["dead"][pid] = now.isoformat()
                    dead_new += 1
                else:
                    state["checked"][pid] = now.isoformat()
                    alive += 1
            except Exception:  # noqa: BLE001  # 网络抖动=保留活口,下轮再验
                errs += 1
            time.sleep(SLEEP_S)

    tmp = OUT_STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    tmp.replace(OUT_STATE)
    print(f"verify_expired: 新判死 {dead_new} · 仍在招 {alive} · 网络错误跳过 {errs} · 累计死帖 {len(state['dead'])}")


if __name__ == "__main__":
    main()
