"""
pte 域唯一入口(一域一门,门直调 functions;company/crawl 全溶门形)。

手动研究域(无 META,不进调度):
    python etl/pte/main.py                 # 默认链(ynwac 对照库抽取)
    python etl/pte/main.py --only ynwac    # 同上(单步点名)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from pte.functions import (run, run_assets, run_index, run_pb_audio, run_ptebank, run_timeline,
                           run_votes, run_words)

SCHEDULED = [
    ("ynwac", run),
    ("assets", run_assets),
    ("votes", run_votes),
    ("ptebank", run_ptebank),
    ("pb-audio", run_pb_audio),
    ("index", run_index),
    ("timeline", run_timeline),
    ("words", run_words),
]
"""默认链:整库抽取 → DI 图片 → 考过投票+评论 → ptebank 第二源 → ptebank 音频(私有研究,不灌库不上线)。
votes 步:配了 YNWAC_TOKEN 才抓(空则跳过不报错),你部署的容器自动跑;ynwac 听力 mp3 付费墙后不抓。
ptebank 步(2026-09-01):WP REST 整库,音频重补 ynwac 文本重;raw 快照先落 data/raw/pte/ptebank/。
pb-audio 步:ptebank 公开 mp3 落盘(幂等;链接会腐,趁开放抓)。"""

TOOLS = {
    "ynwac": run,
    "assets": run_assets,
    "votes": run_votes,
    "ptebank": run_ptebank,
    "pb-audio": run_pb_audio,
    "index": run_index,
    "timeline": run_timeline,
    "words": run_words,
}
"""全部可 --only 点名的步。"""


def main() -> int:
    """跑默认链或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
        todo = picked
    else:
        todo = SCHEDULED
    for name, fn in todo:
        say(f"→ {name}")
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            err(name, e)
            return 1
    say(f"✓ 本域 {len(todo)} 步全过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
