"""
gcjobs 域唯一入口(一域一门;门直调 functions.py 的段函数 —— 全溶域的门形,样张 etl/careerbeacon/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**:
搜索分页枚举 → 岗位页抓取(每轮封顶)→ 岗位页解析 → postings 仓。
「一步失败中止本轮」由段函数抛出的异常兑现(main 的 except 捕获后 return 1)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/gcjobs/main.py                  # 默认链(4 步)
    python etl/gcjobs/main.py --only store     # 单步调试(见 TOOLS)
    DETAILS_PER_RUN=50 python etl/gcjobs/main.py   # 本地验收压小每轮抓取量

@author Frank
@time 2026-09-13
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from gcjobs.functions import build_gcjobs_postings, parse_gcjobs_details, scrape_gcjobs_details, scrape_gcjobs_pages

SCHEDULED = [
    ("pages", scrape_gcjobs_pages),
    ("details", scrape_gcjobs_details),
    ("parse", parse_gcjobs_details),
    ("store", build_gcjobs_postings),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。

  pages    公开搜索逐页翻(会话式两拉,页数从首页正文现取)→ raw/gcjobs/rows.json(帖号 → 列表行)
  details  列表里未缓存的帖 → 岗位页正文进 crawl/board-gcjobs/(每轮 DETAILS_PER_RUN 张)
  parse    缓存原文 → 标题 / 机构 / 字段格 / 各节 → raw/gcjobs/jobs.json(增量,已解析不重解)
  store    事实 × 列表行 → processed/gcjobs/postings.json(当前态,Job Bank 仓同形)
"""

TOOLS = {
    "pages": scrape_gcjobs_pages,
    "details": scrape_gcjobs_details,
    "parse": parse_gcjobs_details,
    "store": build_gcjobs_postings,
}
"""全部可 --only 点名的步(与默认链同一份四步,本域没有不进链的手动件)。"""


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
