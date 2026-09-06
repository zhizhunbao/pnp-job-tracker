"""
jobillico 域唯一入口(一域一门;门直调 functions.py 的段函数 —— 全溶域的门形,样张 etl/ats/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**:
站点地图枚举 → 详情原文抓取(每轮封顶)→ 详情解析 → postings 仓。
「一步失败中止本轮」由段函数抛出的异常兑现(main 的 except 捕获后 return 1)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/jobillico/main.py                  # 默认链(4 步)
    python etl/jobillico/main.py --only store     # 单步调试(见 TOOLS)
    DETAILS_PER_RUN=200 python etl/jobillico/main.py   # 本地验收压小每轮抓取量
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from jobillico.functions import (
    build_jobillico_postings, parse_jobillico_details, scrape_jobillico_details, scrape_jobillico_sitemap,
)

SCHEDULED = [
    ("sitemap", scrape_jobillico_sitemap),
    ("details", scrape_jobillico_details),
    ("parse", parse_jobillico_details),
    ("store", build_jobillico_postings),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。

  sitemap  索引 → sitemap_job_postings_N.xml → raw/jobillico/urls.json(帖号 → 英文版优先的详情 URL)
  details  枚举表里未缓存的帖 → 详情原文进 crawl/board-jobillico/(每轮 DETAILS_PER_RUN 张)
  parse    缓存原文 → ld+json JobPosting → raw/jobillico/jobs.json(增量,已解析不重解)
  store    事实 × 枚举 → processed/jobillico/postings.json(当前态,Job Bank 仓同形)
"""

TOOLS = {
    "sitemap": scrape_jobillico_sitemap,
    "details": scrape_jobillico_details,
    "parse": parse_jobillico_details,
    "store": build_jobillico_postings,
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
