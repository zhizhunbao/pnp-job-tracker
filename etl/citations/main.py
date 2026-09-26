"""
citations 域唯一入口(一域一门;2026-08-31 批D 立域,门直调函数 —— 全溶域的门形,
样张 etl/dli/main.py)。

默认链只有一步(字段级来源注册表验证,挂 pnp 角色周更),语义与原 ops 役里的
field_sources 步完全一致。调度声明(role/interval/ping)在本域 __init__.py 的 META;
auto_update 按 role 自动发现。
控制台强制 UTF-8(照 news/main.py 门形):Windows 本地控制台 cp1252 打不出中文。
一律从仓库根执行:
    python etl/citations/main.py                        # 默认链
    python etl/citations/main.py --only field_sources   # 点名单步
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
    sys.stdout.reconfigure(encoding="utf-8")

from log.functions import say
from door.functions import run_steps
from citations.functions import verify_field_source_pages

SCHEDULED = [("field_sources", verify_field_source_pages)]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(_steps 同款语义)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "field_sources": verify_field_source_pages,
}
"""全部可 --only 点名的步:
  field_sources  逐 URL 验证 citation 落地页 + 抽 title/meta 原文 → raw/sources/field-sources.json
"""


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
