"""
classify 域唯一入口(一域一门;全溶域的门形,样张 etl/jdformat/main.py)。

SCHEDULED = 本域步骤真相 —— 顺序即语义,一步失败中止本轮。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/classify/main.py                 # 默认链(jobs 一步)
    python etl/classify/main.py --only pilot    # 试点:抽样判一批,产人工核对表
本地验收把量压小:CLASSIFY_LIMIT=5 python etl/classify/main.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from classify.functions import classify_jobs, pilot_jobs
from log.functions import err, say

SCHEDULED = [
    ("jobs", classify_jobs),
]
"""默认链(调度真相):
  jobs  未分类的在招岗 → bge-m3 候选检索 → qwen 只在候选里选码 → processed/classify/jobs.json。
        公司段(NAICS)待公司资料补齐后加进来,设计稿 docs/design/分类清洗-20260915.md。"""

TOOLS = {
    "jobs": classify_jobs,
    "pilot": pilot_jobs,
}
"""全部可 --only 点名的步。
  pilot  试点件(不进默认链):按渠道分层抽 PILOT_N 条判一遍,产 pilot_jobs.tsv 给人工核对准确率。
         判定链与 jobs 步逐字同一条 —— 验的就是要上线的那套。"""


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
