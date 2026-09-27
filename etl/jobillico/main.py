"""
jobillico 域唯一入口(一域一门;门直调 functions.py 的段函数 —— 全溶域的门形,样张 etl/ats/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**:
站点地图枚举 → 详情原文抓取(每轮封顶)→ 详情解析 → 标题英译(仅法文帖)→ postings 仓。
「一步失败中止本轮」由段函数抛出的异常兑现(main 的 except 捕获后 return 1)。
2026-09-27 门循环改走 door 叶 run_steps(五个招聘板门同批;door 叶 09-26 晚已定 fail-fast):一步失败即中止本轮,与原门同义,
SystemExit 也在门里接住。迁前先补上枚举的破口 —— 索引或子图取不到、回 200 却是空壳、比上一轮板仓漏两成以上,枚举步一律抛错、
枚举表不落盘,门不跑建仓(原先单张子图取不到留痕跳过,那一截帖会被当成下架;索引取不到则写出空表、建仓把整板清空)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/jobillico/main.py                  # 默认链(5 步)
    python etl/jobillico/main.py --only store     # 单步调试(见 TOOLS)
    DETAILS_PER_RUN=200 python etl/jobillico/main.py   # 本地验收压小每轮抓取量
    python etl/jobillico/main.py --only test      # 「枚举失败 → 不出快照 / 不下架」自测(不联网、不写仓内文件;2026-09-27 立)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from jobillico.functions import (
    build_jobillico_postings, parse_jobillico_details, reparse_jobillico_details, scrape_jobillico_details, scrape_jobillico_sitemap,
    translate_jobillico_titles, run_tests,
)

SCHEDULED = [
    ("sitemap", scrape_jobillico_sitemap),
    ("details", scrape_jobillico_details),
    ("parse", parse_jobillico_details),
    ("titles", translate_jobillico_titles),
    ("store", build_jobillico_postings),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。

  sitemap  索引 → sitemap_job_postings_N.xml → raw/jobillico/urls.json(帖号 → 英文版优先的详情 URL)
  details  枚举表里未缓存的帖 → 详情原文进 crawl/board-jobillico/(每轮 DETAILS_PER_RUN 张)
  parse    缓存原文 → ld+json JobPosting → raw/jobillico/jobs.json(增量,已解析不重解)
  titles   仅法文帖的标题 → 英文职位名(noc 域本地 qwen 批译,20 条一批编号行协议)→ raw/jobillico/titles_en.json(增量)
  store    事实 × 枚举 → processed/jobillico/postings.json(当前态,Job Bank 仓同形)
2026-09-27 门循环改走 door 叶 run_steps:一步失败即中止本轮(与原门同义);sitemap 枚举不全先抛错不落盘,store 就不跑。
"""

TOOLS = {
    "sitemap": scrape_jobillico_sitemap,
    "details": scrape_jobillico_details,
    "parse": parse_jobillico_details,
    "reparse": reparse_jobillico_details,
    "titles": translate_jobillico_titles,
    "store": build_jobillico_postings,
    "test": run_tests,
}
"""全部可 --only 点名的步(与默认链同一份五步,本域没有不进链的手动件)。
2026-09-27 起多一个不进链的手动件 test:「枚举失败 → 不出快照 / 不下架」自测(门迁 door 叶同批立;用例住 scheme §7,
有失败退出码 1;子串匹配:test 与其余六键互不包含)。"""


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
