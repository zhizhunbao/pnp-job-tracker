"""
door.functions — 门循环:各域 main.py 跑一串 (步名, 函数) 的唯一实现(2026-09-26 立叶)。

2026-09-26 /fe Frank「一步失败不再拖停整轮」先在 pnp、statcan 两门各写一份 run_steps;同日 Frank「推广」→ 搬进本叶
(纯移动:哪些步跑、返回码怎么算一字不改,只把提示行的字面量收进 constants),各域门改为 `return run_steps(todo)`。
同日晚改判回「一步失败即中止」(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」,见 run_steps):
各门照旧 `return run_steps(todo)` 不用改,互不相干的步拆成各自的调度单元(各域 __init__ 的 METAS)。
依赖单边:本文件 → constants / scheme + log 叶(报行)。门叶不 import 任何业务域。

@author Frank
@time 2026-09-26 16:09:33
"""
import sys
import unittest

from log.functions import err, say
from door.constants import (
    CHAIN_FAIL_TPL, CHAIN_OK_TPL, EXIT_OK_CODES, STEP_EXIT_TPL, STEP_START_TPL, TEST_VERBOSITY,
)
from door.scheme import ChainFailFastTest

# =========================================================================
# 1. 跑一串步(门循环)
# =========================================================================


def run_steps(todo: list) -> int:
    """按序跑一串 (步名, 函数),**一步失败即中止本轮**:失败那步打 ✗ 留痕,后面的步不跑,返回 1(调度器扣 ping、
    按失败轮短重试);全过返回 0。sys.exit(0) 不算失败,接着跑下一步。
    SystemExit 在这里接住:各域自校硬闸走 sys.exit(1),接住后同样打一行中止、返回 1。
    2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):撤回同日午后的「一步失败其余照跑」——
    一条链只配一个 ping,照跑把「哪一步坏了」藏进了日志;互不相干的步改拆成各自的调度单元(各自容器、各自 ping),
    单元内的步同生共死。午后版原文:「按序跑一串 (步名, 函数),**一步失败不拖停其余步**:失败那步打 ✗ 留痕、
    记进失败清单,后面的照跑;有一步失败本轮就返回 1(调度器扣 ping、按失败轮短重试,告警照常),全过返回 0。
    sys.exit(0) 不算失败。SystemExit 在这里接住:各域自校硬闸走 sys.exit(1),`except Exception` 接不到它,
    不接住就还是一步炸全轮。」
    自测见 scheme 的 ChainFailFastTest。"""
    for i, (name, fn) in enumerate(todo):
        say(STEP_START_TPL.format(name=name))
        try:
            fn()
        except SystemExit as e:
            if e.code in EXIT_OK_CODES:
                continue
            say(STEP_EXIT_TPL.format(name=name, code=e.code))
            say(CHAIN_FAIL_TPL.format(name=name, left=len(todo) - i - 1))
            return 1
        except Exception as e:  # noqa: BLE001 — 门是最外层:任一步炸了留痕、中止本轮(同 2026-09-26 午前各门的原循环)
            err(name, e)
            say(CHAIN_FAIL_TPL.format(name=name, left=len(todo) - i - 1))
            return 1
    say(CHAIN_OK_TPL.format(n=len(todo)))
    return 0


# =========================================================================
# 2. 自测(用例住 scheme)
# =========================================================================


def run_tests() -> None:
    """test 步入口:跑门循环自测(用例集住 scheme 的 ChainFailFastTest,库垫片先例 indexing / gate;
    2026-09-26 晚随 fail-fast 改判由 ChainKeepGoingTest 改名);
    有失败 sys.exit(1) —— 门接住后记本步失败、返回码 1。"""
    suite = unittest.TestLoader().loadTestsFromTestCase(ChainFailFastTest)
    if unittest.TextTestRunner(verbosity=TEST_VERBOSITY).run(suite).wasSuccessful() is False:
        sys.exit(1)
