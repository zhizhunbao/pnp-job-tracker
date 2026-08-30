"""死岗验尸(第25轮 #124,批C;2026-08-03 拆掉 30 天门槛)。

背景:发布>30 天仍 open 的桶抽样 63% 已在 Job Bank 过期(第25轮三组对照实测),用户点开撞
「Job posting expired」;而下架老逻辑刻意保守(「本次未见 且 >30 天」,805 误杀教训)拦不住它们
——postings.json 全量累积,帖永远「在见」。

2026-08-03 实测(Fort Qu'Appelle 用户从 Google 招聘富结果进来、注册、点两次申请,撞的正是过期页):
岗位远在 30 天前就死了,而验尸和下架两道闸门都卡在 30 天,于是**第 0-30 天完全没人验**。
随机 100 个「在招」实测死亡率:≤7天 8% · 8-14天 24% · **15-30天 48%** · 31-60天 32%(本脚本已排水)。
加权全库约 1/3 的「在招」是死链——而它们正带着无 validThrough 的 JobPosting 结构化数据喂给 Google。

做法:主动逐帖验尸,不动「本次未见」那条老逻辑。
- 候选:postings.json 里全部 jobbank 帖(不再限发布龄),未判死过,距上次检查>RECHECK_DAYS;
- 排序:按死亡风险,不按发布龄。预测器 = last_seen 陈旧度(实测:陈旧>14天 52% 死 / ≤3天 9% 死),
  越久没在增量抓取里露面的越先验;预算 MAX_CHECKS 花在最可能死的那一头;
- 判死:GET 帖页 <title> 含 "Job posting expired"(服务端渲染裸抓可判;过期横幅是 JS 注入判不了,
  第25轮判死正则误报的教训:判据必须过对照组)+ HTTP 404/410 —— 实测死帖全部返 **410** 不是 404,
  老判据靠 marker 兜住了,410 这半条一直是摆设;网络错误=保留(宁可留活);
- 结果累积 expired_ids.json;09_build_mart 一手剔出 mart,一手写 closed_jobs.json 显式下发 →
  seed 见判死名单**立即置 closed(不等 30 天)**:410 是实锤事实,不该受「防误杀」的保守规则约束;
- 节奏:每轮小批(MAX_CHECKS)连续排水,不做周聚合——一次 2.5k 帖 ≈20 分钟会拖垮那轮 seed 时效
  (enrich 拆独立角色的同一教训);积压几轮排完,稳态=每轮只验到复检期的,分钟级。
  一次性排水(补历史欠账)走环境变量:VERIFY_MAX=5000 VERIFY_SLEEP=0.25 python etl/verify_expired.py
"""
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import paths

IN_POSTINGS = paths.PROCESSED_JOBBANK / "postings.json"
IN_MART_OPEN_IDS = paths.PROCESSED_JOBBANK / "mart_open_ids.json"   # 09 上一轮落的「还在板上」帖号
OUT_STATE = paths.PROCESSED_JOBBANK / "expired_ids.json"

RECHECK_DAYS = 7          # 活帖复检间隔(上次活着,7 天后可再验)
# 单轮请求上限:候选 ≈5.5 万,7 天复检周期要求 ≈8k/天;900/轮 × 每轮约 2h ≈ 1万/天,刚够且不拖垮 seed
MAX_CHECKS = int(os.environ.get("VERIFY_MAX", "900"))
SLEEP_S = float(os.environ.get("VERIFY_SLEEP", "0.25"))   # 节流:官方站,温柔点
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
    recheck_before = (now - timedelta(days=RECHECK_DAYS)).isoformat()
    # 只验「还在板上」的帖(09 上一轮落的名单;文件缺=首跑,退回全验)。不在板上的两种帖——库里早已
    # closed、或被 09 的同名去重丢掉——用户根本点不到,验它们等于把预算和 Job Bank 的带宽一起烧掉。
    # 实测:不筛的话候选里 26% 是这种,队头 900 个中 216 个白验。名单晚一轮无妨:新帖最不可能是死的。
    on_board = set(json.loads(IN_MART_OPEN_IDS.read_text(encoding="utf-8"))) if IN_MART_OPEN_IDS.exists() else None
    off_board = 0
    cands = []
    for p in postings:
        pid, url = p.get("posting_id", ""), p.get("url", "")
        if not pid or "jobbank.gc.ca" not in url or pid in state["dead"]:
            continue
        if state["checked"].get(pid, "") > recheck_before:
            continue
        if on_board is not None and pid not in on_board:
            off_board += 1
            continue
        # 风险键:last_seen 越旧越先验(缺 last_seen 的是早期帖,一并排最前);同龄按发布日老的先
        d = parse_date(p.get("date", ""))
        cands.append(((p.get("last_seen") or "", d.isoformat() if d else ""), pid, url))
    cands.sort()
    fresh = sum(1 for k, _, _ in cands if k[0] > (now - timedelta(days=3)).isoformat())
    print(f"verify_expired: 候选 {len(cands)} 帖(已跳过不在板上的 {off_board} 个;"
          f"last_seen 近 3 天内的 {fresh} 个排在队尾),本轮验 {min(len(cands), MAX_CHECKS)}")
    if not cands:
        return

    dead_new = alive = errs = 0
    with httpx.Client(headers=UA, timeout=TIMEOUT_S, follow_redirects=True) as c:
        for _key, pid, url in cands[:MAX_CHECKS]:
            try:
                r = c.get(url)
                # 410 = Job Bank 对过期帖的实际返回码(2026-08-03 抽样 28/28 全是 410,没有一个 404)
                if r.status_code in (404, 410) or MARKER in r.text[:HEAD_BYTES]:
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
