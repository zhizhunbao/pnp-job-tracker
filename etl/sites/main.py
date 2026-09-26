"""
sites 域唯一入口:公司官网定期抓取(一域一门;门直调函数 —— 全溶域的门形,样张 etl/explore/main.py)。
SCHEDULED = 本域步骤真相(两步:fetch → facts);调度声明(role/interval)在本域 __init__.py 的 META,
auto_update 按 role 自动发现。

一律从仓库根执行:
    python etl/sites/main.py                                    # 默认链(sites 角色 1 小时一轮)
    SITES_FETCH_LIMIT=5 python etl/sites/main.py --only fetch   # 本地验收压小:只抓 5 家
    SITES_FACTS_LIMIT=5 python etl/sites/main.py --only facts   # 本地验收压小:只整理 5 家
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
    sys.stdout.reconfigure(encoding="utf-8")

from log.functions import say
from door.functions import run_steps
from sites.functions import build_site_facts, fetch_site_pages, visit_queue

SCHEDULED = [("fetch", fetch_site_pages), ("facts", build_site_facts)]
"""默认链(调度真相):先抓原文进 crawl 层,再读缓存整理;抛错即中止本轮。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "fetch": fetch_site_pages,
    "facts": build_site_facts,
    "visit": visit_queue,
}
"""全部可 --only 点名的步(⚠ --only 是子串匹配:两个键互不包含)。"""


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
