"""
pnp/qc 子域行形状(一参令 XxxIn / 单返回值 XxxOut;同 pnp/scheme.py 的方言)。

只放魁省自己的形状;跨省共用的形状(CachedDrawsIn / PutDrawsIn …)住 pnp/scheme.py,functions 直接从那里取。

@author Frank
@time 2026-09-29 20:01:04
"""
import unittest
from dataclasses import dataclass

# =========================================================================
# 1. PSTQ 邀请轮次(2026-09-29 自 pnp/scheme.py 原样搬来;同日加逐档解析)
# =========================================================================


@dataclass
class QcDrawIn:
    """qc_draw_of() 入参:QC 一轮一个 stream 的折叠块 → 一行抽选(2026-09-26)。"""

    date: str
    """ISO 邀请日(两天一轮取后一天)。"""

    stream: str
    """所在 stream 段的标题原文(「Stream 1: Highly qualified and specialized skills」)。"""

    body: str
    """折叠块正文(已折空白;不换行空格的千分位已折成普通空格)。"""


@dataclass
class QcSumIn:
    """check_qc_exercise_sum() 入参:一轮一个 stream 的各档人数对总数(2026-09-29 立)。"""

    date: str
    """ISO 邀请日(报错定位用)。"""

    stream: str
    """stream 段标题原文(报错定位用)。"""

    inv: int | None
    """本轮该 stream 的邀请总数;None = 官方占位,不校。"""

    exercises: list
    """本轮各邀请档(qc_exercise_of 的产出)。"""


# =========================================================================
# 9. 自测(unittest 要求以 TestCase 子类交付用例 —— 「不用 class」的外部库例外,同 pnp/scheme.py;
#    跑法 `python etl/pnp/main.py --only test_qc`,`--only test` 连 pnp 共用段一起跑)
# =========================================================================


class QcExerciseTest(unittest.TestCase):
    """PSTQ 逐档解析(2026-09-29):手写金标(官方 2026-09-24 那轮通道 1 原句,人数 / 分数线 / 点名职业逐档对)+ 拒猜
    (范围人数不进确数、学历对等不算魁省学历)+ 变异探针(小写 these 不是切点、人数改一个就触发加总自校)。
    被测函数在用例体内现取 —— functions 反过来 import 本文件,顶部 import 会成环。纯函数用例,不联网不读仓。"""

    HEAD = ("Number of invitations: the Ministère de l'Immigration, de la Francisation et de l'Intégration invited 86 "
            "people to apply for permanent selection. Date and time of extraction from the Arrima bank: September 21, "
            "2026, at 1:10 p.m. ")
    """2026-09-24 通道 1 那轮的段首(总数 86 + 提取时刻;不是邀请档)。"""

    EX1 = ("Exercise 1 37 of these invitations were sent to individuals who met the following criteria: They had a "
           "primary occupation in category \"training, education, experience and responsibilities\" (TEER) 0, 1 or 2. "
           "They were staying in Québec; They had completed at least one year of full-time study and obtained one of "
           "the following diplomas in Québec: vocational diploma, college diploma, bachelor's degree; Their main "
           "occupation was related to priority sectors and appeared on the list from the National Occupational "
           "Classification (NOC 2021): 21100 Physicists and astronomers 21110 Biologists and related scientists "
           "They obtained a score (PDF 299 Kb) of at least 634 points. ")
    """第一档原句(点名职业只留两条,够验去重保序)。"""

    EX2 = ("Exercise 2 8 of these invitations were also sent to individuals who met the following criteria: They were "
           "staying in Québec; Their main occupation was related to priority sectors and appeared on the list from the "
           "National Occupational Classification (NOC 2021): 62020 Food service supervisors 62200 Chefs They obtained a "
           "score (PDF 299 Kb) of at least 706 points. ")
    """第二档原句。"""

    EX3 = ("Exercise 3 41 of these invitations were also sent to individuals who met the following criteria: They were "
           "staying in Québec; (NOC 2021): 72106 Welders and related machine operators 72106 Welders and related "
           "machine operators They obtained a score (PDF 299 Kb) of at least 696 points.")
    """第三档原句(同码重复两次,验去重)。"""

    def test_gold_three_exercises(self) -> None:
        """金标:三档,人数 37 / 8 / 41、分数线 634 / 706 / 696、点名职业逐档对,加总 86 过自校。"""
        from pnp.qc.functions import qc_draw_of
        row = qc_draw_of(QcDrawIn(date="2026-09-24", stream="Stream 1", body=self.HEAD + self.EX1 + self.EX2 + self.EX3))
        ex = row["exercises"]
        self.assertEqual([e["invitations"] for e in ex], [37, 8, 41])
        self.assertEqual([e["score"] for e in ex], [634, 706, 696])
        self.assertEqual([e["nocs"] for e in ex], [["21100", "21110"], ["62020", "62200"], ["72106"]])
        self.assertEqual([e["quebecDiploma"] for e in ex], [True, False, False])
        self.assertEqual([e["inQuebec"] for e in ex], [True, True, True])
        self.assertEqual(row["invitations"], 86)
        self.assertEqual(row["score"], 634)

    def test_sum_mismatch_raises(self) -> None:
        """变异探针:第二档人数 8 改成 9,加总 87 ≠ 86 → 抛错(整份保留旧数据)。"""
        from pnp.qc.functions import qc_draw_of
        body = self.HEAD + self.EX1 + self.EX2.replace("Exercise 2 8 of", "Exercise 2 9 of") + self.EX3
        with self.assertRaises(RuntimeError):
            qc_draw_of(QcDrawIn(date="2026-09-24", stream="Stream 1", body=body))

    def test_range_count_not_summed(self) -> None:
        """拒猜:「From 10 to 15」只进原文格,不进确数,也不参与加总(本轮不校、不抛错)。"""
        from pnp.qc.functions import qc_draw_of
        body = self.HEAD + self.EX1 + self.EX2.replace("Exercise 2 8 of", "Exercise 2 From 10 to 15 of") + self.EX3
        ex = qc_draw_of(QcDrawIn(date="2026-09-24", stream="Stream 1", body=body))["exercises"]
        self.assertIsNone(ex[1]["invitations"])
        self.assertEqual(ex[1]["invitationsText"], "From 10 to 15")

    def test_lowercase_these_not_split(self) -> None:
        """变异探针:「37 of these invitations were sent」里的小写 these 不是切点 —— 一档,人数 37 留在本档。"""
        from pnp.qc.functions import qc_exercises_of
        ex = qc_exercises_of(self.HEAD + self.EX1)
        self.assertEqual(len(ex), 1)
        self.assertEqual(ex[0]["invitations"], 37)

    def test_old_wording_segments(self) -> None:
        """旧写法(2025 至 2026-01):「These invitations were (also) issued / addressed」切档,人数不分档 → None。"""
        from pnp.qc.functions import qc_exercises_of
        body = ("invited 605 people. These invitations were issued to individuals who met the following criteria: They "
                "were staying in Québec; They had a score (PDF 299 Kb) of 781 points or higher. These invitations were "
                "also issued to individuals who met the following criteria: They had a score (PDF 299 Kb) of 644 "
                "points or higher.")
        ex = qc_exercises_of(body)
        self.assertEqual([e["score"] for e in ex], [781, 644])
        self.assertEqual([e["invitations"] for e in ex], [None, None])

    def test_equivalence_is_not_quebec_diploma(self) -> None:
        """拒猜:通道 2 的「schooling equivalent to a high school diploma in Québec」是学历对等,不算魁省学历。"""
        from pnp.qc.functions import qc_exercise_of
        e = qc_exercise_of("Exercise 1 48 of these invitations were sent to individuals who met the following "
                           "criteria: They had completed schooling equivalent to a high school diploma in Québec or a "
                           "two-year full-time general postsecondary program.")
        self.assertFalse(e["quebecDiploma"])

    def test_outside_montreal(self) -> None:
        """2025-07-31 通道 2 原句:「resided in Québec outside the Communauté métropolitaine de Montréal」→ 在魁 + 大蒙以外。"""
        from pnp.qc.functions import qc_exercise_of
        e = qc_exercise_of("These invitations were addressed to persons meeting the following criteria: They resided "
                           "in Québec outside the Communauté métropolitaine de Montréal (Montreal Metropolitan "
                           "Community);")
        self.assertTrue(e["inQuebec"])
        self.assertTrue(e["outsideMontreal"])
