"""
gcjobs 域唯一入口(一域一门;门直调 functions.py 的段函数 —— 全溶域的门形,样张 etl/careerbeacon/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**:
搜索分页枚举 → 岗位页抓取(每轮封顶)→ 岗位页解析 → 站外正文(2026-09-14 加)→ postings 仓。
「一步失败中止本轮」由段函数抛出的异常兑现(main 的 except 捕获后 return 1)。
2026-09-27 门循环改走 door 叶 run_steps(五个招聘板门同批;door 叶 09-26 晚已定 fail-fast):一步失败即中止本轮,与原门同义,
SystemExit 也在门里接住(test 步的 sys.exit(1) 原先穿门成进程退出码 1,现在由门记本步失败、同样返回 1)。
迁前先补上枚举的破口 —— 某页回 200 却零帖、比上一轮板仓漏两成以上,枚举步一律抛错、列表行表不落盘,门不跑建仓
(翻页取不到本来就抛错停轮)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/gcjobs/main.py                  # 默认链(5 步)
    python etl/gcjobs/main.py --only store     # 单步调试(见 TOOLS)
    DETAILS_PER_RUN=50 python etl/gcjobs/main.py   # 本地验收压小每轮抓取量
    python etl/gcjobs/main.py --only test      # 地点归一自测(不联网、不写仓内文件;2026-09-27 立)
                                               # 同日起连「枚举失败 → 不出快照 / 不下架」一起测

@author Frank
@time 2026-09-13
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from gcjobs.functions import (
    build_gcjobs_postings, parse_gcjobs_details, scrape_gcjobs_details, scrape_gcjobs_external, scrape_gcjobs_pages,
    run_tests,
)

SCHEDULED = [
    ("pages", scrape_gcjobs_pages),
    ("details", scrape_gcjobs_details),
    ("parse", parse_gcjobs_details),
    ("external", scrape_gcjobs_external),
    ("store", build_gcjobs_postings),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。

  pages    公开搜索逐页翻(会话式两拉,页数从首页正文现取)→ raw/gcjobs/rows.json(帖号 → 列表行)
  details  列表里未缓存的帖 → 岗位页正文进 crawl/board-gcjobs/(每轮 DETAILS_PER_RUN 张)
  parse    缓存原文 → 标题 / 机构 / 字段格 / 各节 → raw/gcjobs/jobs.json(增量,已解析不重解)
  external 带外链的帖 → 外站页面进 crawl/board-gcjobs-external/ → 抽正文 → raw/gcjobs/external.json(2026-09-14 加,增量)
  store    事实 × 列表行 → processed/gcjobs/postings.json(当前态,Job Bank 仓同形)
2026-09-27 门循环改走 door 叶 run_steps:一步失败即中止本轮(与原门同义);pages 枚举不全先抛错不落盘,store 就不跑。
"""

TOOLS = {
    "pages": scrape_gcjobs_pages,
    "details": scrape_gcjobs_details,
    "parse": parse_gcjobs_details,
    "external": scrape_gcjobs_external,
    "store": build_gcjobs_postings,
    "test": run_tests,
}
"""全部可 --only 点名的步(与默认链同一份五步,本域没有不进链的手动件)。
2026-09-27 起多一个不进链的手动件 test:地点归一自测(Frank 勾「ATS 工时、雇佣期、薪资和小修」随地点小修立;
用例住 scheme §7,有失败退出码 1;子串匹配:test 与五步的键互不包含)。"""


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
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())
