"""
door.scheme — 门叶的形状件 + 门循环自测(unittest 要求以 TestCase 子类交付用例 ——「不用 class」的外部库例外,
先例 gate.scheme / indexing.scheme;跑法 `python etl/door/main.py --only test`)。
被测的 door.functions 在用例体内现取 —— functions 反过来 import 本文件,顶部 import 会成环。
2026-09-26 ChainKeepGoingTest 随 run_steps 自 pnp.scheme 整类搬来(用例一字未改,被测对象从 pnp 门换成本叶)。

@author Frank
@time 2026-09-26 16:09:33
"""
import unittest

# =========================================================================
# 1. 跑一串步(门循环)—— 本叶零形状:run_steps 收的是 (步名, 函数) 清单,库级 list 即可
# =========================================================================

# =========================================================================
# 2. 自测(门的「一步失败其余照跑」)
# =========================================================================


class ChainKeepGoingTest(unittest.TestCase):
    """门循环 run_steps 自测(2026-09-26 Frank「一步失败不再拖停整轮」同批):中间一步抛异常、一步走自校硬闸
    sys.exit(1),后面的步照跑,返回码 1;全过返回 0;sys.exit(0) 不算失败;失败的步不管排在哪都不影响别的步。
    假步是本类的方法(记下自己跑过),不联网不写仓;门的进度行照打。"""

    def setUp(self) -> None:
        """每条用例一份干净的跑步记录。"""
        self.ran: list[str] = []

    def step_ok(self) -> None:
        """正常步:记一笔。"""
        self.ran.append("ok")

    def step_raise(self) -> None:
        """抓取 / 解析塌方的步:抛普通异常。"""
        self.ran.append("raise")
        raise RuntimeError("fake step crash")

    def step_exit(self) -> None:
        """走自校硬闸的步(fail_keep_old / fail_zh 的 sys.exit(1))。"""
        self.ran.append("exit")
        raise SystemExit(1)

    def step_exit_zero(self) -> None:
        """sys.exit(0) 收尾的步(成功,不算失败)。"""
        self.ran.append("exit0")
        raise SystemExit(0)

    def test_failure_keeps_going(self) -> None:
        """金标:异常步与硬闸步都在中间,后面的步照跑、一个不少,返回码 1。"""
        from door import functions as door
        code = door.run_steps([("a", self.step_ok), ("b", self.step_raise), ("c", self.step_exit),
                               ("d", self.step_ok)])
        self.assertEqual(code, 1)
        self.assertEqual(self.ran, ["ok", "raise", "exit", "ok"])

    def test_all_pass(self) -> None:
        """全过 → 返回 0;sys.exit(0) 的步算过。"""
        from door import functions as door
        self.assertEqual(door.run_steps([("a", self.step_ok), ("b", self.step_exit_zero), ("c", self.step_ok)]), 0)
        self.assertEqual(self.ran, ["ok", "exit0", "ok"])
        self.assertEqual(door.run_steps([]), 0)

    def test_failure_anywhere(self) -> None:
        """性质:四步里坏步放在任一位置(异常 / 硬闸两种坏法),每一步都跑到,返回码恒为 1。"""
        from door import functions as door
        for bad in (self.step_raise, self.step_exit):
            for pos in range(4):
                with self.subTest(bad=bad.__name__, pos=pos):
                    self.ran = []
                    steps: list = []
                    for i in range(4):
                        fn = self.step_ok
                        if i == pos:
                            fn = bad
                        steps.append((str(i), fn))
                    self.assertEqual(door.run_steps(steps), 1)
                    self.assertEqual(len(self.ran), 4)
