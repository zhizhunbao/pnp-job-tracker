"""
indexing 域唯一入口:Google Indexing API 主动通知(一域一门;门直调函数 —— 全溶域的门形,样张 etl/explore/main.py)。

SCHEDULED = 本域步骤真相(只有一步:notify);调度声明(role/interval)在本域 __init__.py 的 META,
auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/indexing/main.py                  # 默认链(indexing 角色每小时一轮;没配密钥一行警告跳过)
    python etl/indexing/main.py --only dry       # 干跑:读线上 sitemap 算「会推多少、会撤多少」,不调 Google、不落盘
    python etl/indexing/main.py --only test      # 决策逻辑自测(撤回判定 / 额度切分 / 排序 / 太平洋日期 / RS256 签名)

@author Frank
@time 2026-09-26 02:45:06
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
    sys.stdout.reconfigure(encoding="utf-8")

from log.functions import say
from door.functions import run_steps
from indexing.functions import dry_round, notify_round, run_tests

SCHEDULED = [("notify", notify_round)]
"""默认链(调度真相):一步 notify —— 先撤回、再推新;抛错即中止本轮(403 不是资源所有者 / 网络断 / 换 token 失败都算)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "notify": notify_round,
    "dry": dry_round,
    "test": run_tests,
}
"""全部可 --only 点名的步(子串匹配:三个键两两无包含关系,点名任一只命中它自己)。"""


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
