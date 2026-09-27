"""
door.scheme — 门叶的形状件 + 门循环自测(unittest 要求以 TestCase 子类交付用例 ——「不用 class」的外部库例外,
先例 gate.scheme / indexing.scheme;跑法 `python etl/door/main.py --only test`)。
被测的 door.functions 在用例体内现取 —— functions 反过来 import 本文件,顶部 import 会成环。
2026-09-26 ChainKeepGoingTest 随 run_steps 自 pnp.scheme 整类搬来(用例一字未改,被测对象从 pnp 门换成本叶)。
同日晚门改判回 fail-fast(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):类改名 ChainFailFastTest,
三例断言随之改成「坏步之后一步不跑」。
2026-09-27 加 §2 当前态换版闸的入参 ShrinkIn 与自测 ShrinkGuardTest(五个招聘板门迁进本叶同批;原「2. 自测」顺延为 3)。

@author Frank
@time 2026-09-26 16:09:33
"""
import unittest
from dataclasses import dataclass

# =========================================================================
# 1. 跑一串步(门循环)—— 本叶零形状:run_steps 收的是 (步名, 函数) 清单,库级 list 即可
# =========================================================================

# =========================================================================
# 2. 当前态换版闸(一步要写出「当前在册」清单前,先比上一版漏了多少)
# =========================================================================


@dataclass
class ShrinkIn:
    """guard_shrink() 入参(2026-09-27 立):上一版此刻仍该在册的项 + 本轮新清单 + 报错时的名字。"""

    live: set
    """上一版里此刻仍该在册的项(调用方按自家口径先剔掉该走的,板域 = 过了截止日的帖;空集 = 没有上一版,只查新清单空不空)。"""

    fresh: set
    """本轮新清单的项(板域 = 本轮枚举到的帖号)。"""

    label: str
    """报错时说是哪一份清单(板域给自己的域名)。"""


# =========================================================================
# 3. 自测(门的「一步失败即中止」;2026-09-26 午后曾是「一步失败其余照跑」;2026-09-27 加换版闸)
# =========================================================================


class ChainFailFastTest(unittest.TestCase):
    """门循环 run_steps 自测(2026-09-26 晚 Frank「其中一个失败,其余照跑?那我怎么知道这个失败」同批):
    一步抛异常或走自校硬闸 sys.exit(1),后面的步一个不跑,返回码 1;全过返回 0;sys.exit(0) 不算失败、接着跑。
    午后版(类名 ChainKeepGoingTest)原文:「门循环 run_steps 自测(2026-09-26 Frank「一步失败不再拖停整轮」同批):
    中间一步抛异常、一步走自校硬闸 sys.exit(1),后面的步照跑,返回码 1;全过返回 0;sys.exit(0) 不算失败;
    失败的步不管排在哪都不影响别的步。」
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

    def test_failure_stops_round(self) -> None:
        """金标:异常步排第二,后面的硬闸步与正常步都不跑,返回码 1;硬闸步排第二同理。
        (午后版 test_failure_keeps_going 断言的是四步全跑。)"""
        from door import functions as door
        code = door.run_steps([("a", self.step_ok), ("b", self.step_raise), ("c", self.step_exit),
                               ("d", self.step_ok)])
        self.assertEqual(code, 1)
        self.assertEqual(self.ran, ["ok", "raise"])
        self.ran = []
        self.assertEqual(door.run_steps([("a", self.step_ok), ("b", self.step_exit), ("c", self.step_ok)]), 1)
        self.assertEqual(self.ran, ["ok", "exit"])

    def test_all_pass(self) -> None:
        """全过 → 返回 0;sys.exit(0) 的步算过。"""
        from door import functions as door
        self.assertEqual(door.run_steps([("a", self.step_ok), ("b", self.step_exit_zero), ("c", self.step_ok)]), 0)
        self.assertEqual(self.ran, ["ok", "exit0", "ok"])
        self.assertEqual(door.run_steps([]), 0)

    def test_failure_anywhere(self) -> None:
        """性质:四步里坏步放在任一位置(异常 / 硬闸两种坏法),跑到坏步为止(pos + 1 步),返回码恒为 1。
        (午后版断言的是每一步都跑到。)"""
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
                    self.assertEqual(len(self.ran), pos + 1)


class ShrinkGuardTest(unittest.TestCase):
    """当前态换版闸 guard_shrink 自测(2026-09-27 立,五个招聘板门迁进本叶同批):手写金标(阈值两成钉死,改阈值要连金标一起改)
    + 穷举性质(上一版大小 × 漏几项 × 新帖几项,抛错当且仅当「新清单空」或「漏的 > 上一版 × 阈值」)
    + 接进门循环(闸抛错 = 这一步失败,后面的步不跑)。只喂集合,不联网不读写文件。
    假步照 ChainFailFastTest 的形做成本类的方法(记下自己跑过)。"""

    def setUp(self) -> None:
        """每条用例一份干净的跑步记录。"""
        self.ran: list[str] = []

    def ids_of(self, n: int, prefix: str) -> set:
        """造 n 个项(prefix + 序号)。"""
        out: set = set()
        for i in range(n):
            out.add(prefix + str(i))
        return out

    def step_enum_half(self) -> None:
        """枚举步:上一版 10 项,本轮只枚举到一半,落盘前过闸(应当抛)。"""
        from door import functions as door
        door.guard_shrink(ShrinkIn(live=self.ids_of(10, "p"), fresh=self.ids_of(5, "p"), label="t"))
        self.ran.append("enum")

    def step_enum_full(self) -> None:
        """枚举步:本轮枚举齐全,落盘前过闸(放行)。"""
        from door import functions as door
        door.guard_shrink(ShrinkIn(live=self.ids_of(10, "p"), fresh=self.ids_of(10, "p"), label="t"))
        self.ran.append("enum")

    def step_store(self) -> None:
        """建仓步:只记一笔跑过。"""
        self.ran.append("store")

    def test_golden(self) -> None:
        """金标:上一版 10 项漏 2 项(整两成)放行、漏 3 项拦;新清单只有新帖(上一版全漏)拦;新清单为空,有没有上一版都拦;
        没有上一版、新清单非空放行;新清单多出上一版没有的项不算漏。"""
        from door import functions as door
        live = self.ids_of(10, "p")
        door.guard_shrink(ShrinkIn(live=live, fresh=live - {"p0", "p1"}, label="t"))
        with self.assertRaises(RuntimeError):
            door.guard_shrink(ShrinkIn(live=live, fresh=live - {"p0", "p1", "p2"}, label="t"))
        with self.assertRaises(RuntimeError):
            door.guard_shrink(ShrinkIn(live=live, fresh=self.ids_of(10, "q"), label="t"))
        with self.assertRaises(RuntimeError):
            door.guard_shrink(ShrinkIn(live=live, fresh=set(), label="t"))
        with self.assertRaises(RuntimeError):
            door.guard_shrink(ShrinkIn(live=set(), fresh=set(), label="t"))
        door.guard_shrink(ShrinkIn(live=set(), fresh={"q0"}, label="t"))
        door.guard_shrink(ShrinkIn(live=live, fresh=live | self.ids_of(50, "q"), label="t"))

    def test_exhaustive(self) -> None:
        """穷举性质:上一版 0~40 项 × 漏 0~全部 × 新清单另有 0~2 项新帖 —— 抛错当且仅当新清单为空,
        或漏的项数 > 上一版项数 × GONE_RATIO_MAX;报错行带上报错名。"""
        from door import constants as dc
        from door import functions as door
        for n in range(41):
            live = self.ids_of(n, "p")
            for gone in range(n + 1):
                for extra in range(3):
                    fresh = self.ids_of(extra, "q")
                    for i in range(gone, n):
                        fresh.add("p" + str(i))
                    want = len(fresh) == 0 or gone > n * dc.GONE_RATIO_MAX
                    with self.subTest(n=n, gone=gone, extra=extra):
                        try:
                            door.guard_shrink(ShrinkIn(live=live, fresh=fresh, label="board-x"))
                            raised = False
                        except RuntimeError as e:
                            raised = True
                            self.assertIn("board-x", str(e))
                        self.assertEqual(raised, want)

    def test_guard_stops_round(self) -> None:
        """接进门循环:闸抛错的那一步算失败,后面的「建仓」步一个不跑,返回码 1;闸放行时两步都跑、返回码 0。"""
        from door import functions as door
        self.assertEqual(door.run_steps([("enum", self.step_enum_half), ("store", self.step_store)]), 1)
        self.assertEqual(self.ran, [])
        self.assertEqual(door.run_steps([("enum", self.step_enum_full), ("store", self.step_store)]), 0)
        self.assertEqual(self.ran, ["enum", "store"])
