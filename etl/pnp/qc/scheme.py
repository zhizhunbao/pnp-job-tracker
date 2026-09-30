"""
pnp/qc 子域行形状(一参令 XxxIn / 单返回值 XxxOut;同 pnp/scheme.py 的方言)。

只放魁省自己的形状;跨省共用的形状(CachedDrawsIn / PutDrawsIn …)住 pnp/scheme.py,functions 直接从那里取。

@author Frank
@time 2026-09-29 20:01:04
"""
import re
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
# 2. PSTQ 门槛(2026-09-29 立)
# =========================================================================


@dataclass
class QcFindIn:
    """qc_find() 入参:在一段里找一句官方原句(PSTQ / PEQ 两段共用)。"""

    text: str
    """段文(已折空白)。"""

    rx: re.Pattern
    """锚定原句的正则(住 constants)。"""

    problems: list
    """找不到时往这里记一条问题。"""

    problem: str
    """要记的那条问题(调用处拼好:页名 / 段名 + 条目名)。"""


@dataclass
class QcrSectionIn:
    """qcr_section_of() 入参:从切段结果里取一段。"""

    secs: dict
    """qc_sections_of 的产出 {段标题: 段文}。"""

    name: str
    """要取的段标题(h2 原文)。"""

    problems: list
    """缺段时往这里记一条问题。"""


@dataclass
class QcrTextIn:
    """一段门槛原文:段名(h2 原文;四个通道段即通道名)+ 段文。"""

    section: str
    """段名。"""

    text: str
    """段文(已折空白;缺段 → 空串)。"""


@dataclass
class QcrUpdatedIn:
    """qcr_updated_of() 入参:页尾段 → 官方更新日。"""

    tail: str
    """页尾段文(含「Last update: …」)。"""

    problems: list
    """认不出时往这里记一条问题。"""


@dataclass
class QcrTeerIn:
    """qcr_teer_rows() / qcr_spouse_rows() 入参:一段 + 往里追加的行与问题。"""

    sec: QcrTextIn
    """本段。"""

    rows: list
    """门槛行(就地追加)。"""

    problems: list
    """问题行(就地追加)。"""


@dataclass
class QcrLangIn:
    """qcr_lang_high_rows() 入参:TEER 0-2 那档的法语两行。"""

    sec: QcrTextIn
    """本段。"""

    teer: list
    """这两行挂的 appliesTeer。"""

    rows: list
    """门槛行(就地追加)。"""

    problems: list
    """问题行(就地追加)。"""


# =========================================================================
# 3. PEQ 门槛(2026-09-29 立)
# =========================================================================


@dataclass
class QcpPageIn:
    """qcp_page_of() 入参:取一个 PEQ 分支页。"""

    url: str
    """分支页 URL(crawl 缓存键)。"""

    page: str
    """页名(问题行里用)。"""

    problems: list
    """缓存没有时往这里记一条问题。"""


@dataclass
class QcpPageOut:
    """一个 PEQ 分支页:页名 + URL + 全文。"""

    page: str
    """页名。"""

    url: str
    """页 URL(门槛行的出处)。"""

    text: str
    """全文(已折空白;缓存没有 → 空串)。"""


@dataclass
class QcpIntakeIn:
    """qcp_intake_of() 入参:从分支页的重开公告取收件窗口。"""

    page: QcpPageOut
    """分支页。"""

    problems: list
    """问题行(就地追加)。"""


@dataclass
class QcpReqsIn:
    """qcp_tfw_reqs() / qcp_grad_reqs() 入参:一个分支页 + 收件资格截点日。"""

    page: QcpPageOut
    """分支页。"""

    as_of: str
    """收件资格截点日(ISO;收件条件行的 basis 用)。"""


@dataclass
class QcpRowsIn:
    """qcp_common_rows() 入参:两个分支共有三行往哪追加。"""

    page: QcpPageOut
    """分支页。"""

    stream: str
    """本分支的通道名。"""

    rows: list
    """门槛行(就地追加)。"""

    problems: list
    """问题行(就地追加)。"""


@dataclass
class QcFrDateIn:
    """qc_fr_date_of() 入参:法文日期原句的匹配(日 / 月名 / 年三组)。"""

    m: re.Match | None
    """原句匹配;None = 没找到。"""

    what: str
    """条目名(问题行里用)。"""

    page: str
    """页名(问题行里用)。"""

    problems: list
    """认不出时往这里记一条问题。"""


@dataclass
class QcFrPartsIn:
    """qc_fr_iso_of() 入参:拆好的法文日期三格。"""

    day: str
    """日。"""

    month: str
    """法文月名。"""

    year: str
    """年。"""

    page: str
    """页名(问题行里用)。"""

    problems: list
    """月名认不出时往这里记一条问题。"""


# =========================================================================
# 4. 年度移民计划(2026-09-29 立)
# =========================================================================


@dataclass
class QcsPlanOut:
    """qcs_plan_of() 产出:计划年 + 两张清单 + 问题(有问题时两张清单为空)。"""

    year: int
    """封面计划年(有问题时为 0)。"""

    selections: list
    """甄选数行(表 3)。"""

    admissions: list
    """入境数行(表 4)。"""

    problems: list
    """自校问题行。"""


@dataclass
class QcsTableIn:
    """qcs_table_of() 入参:一张表的标题 / 表头 / 应有的数的个数。"""

    text: str
    """PDF 全文。"""

    head: re.Pattern
    """表标题(只在它之后找)。"""

    years: re.Pattern
    """表头年份。"""

    n: int
    """「技术工人」行应有几个数。"""

    what: str
    """条目名(问题行里用)。"""

    problems: list
    """问题行(就地追加)。"""


@dataclass
class QcsTableOut:
    """qcs_table_of() 产出:表头年份 + 「技术工人」行的数。"""

    years: list
    """表头年份(表 3:实际 × 2、预测;表 4:上年计划、预测、本年计划、实际 × 2)。"""

    nums: list
    """行里的数(按列序)。"""


@dataclass
class QcsCrossIn:
    """qcs_cross_check() 入参:表里的数与正文要点句的数。"""

    what: str
    """条目名(问题行里用)。"""

    table: list
    """表里的数。"""

    text: list
    """正文要点句里的数。"""

    problems: list
    """对不上时往这里记一条问题。"""


@dataclass
class QcsRowIn:
    """qcs_row_of() 入参:一行统计。"""

    year: int
    """年。"""

    kind: str
    """行类(actual / forecast / plan)。"""

    value: int
    """数(区间时为下限)。"""

    value_max: int | None
    """区间上限;单值为 None。"""

    section: str
    """出处表名。"""


# =========================================================================
# 5. 自测(unittest 要求以 TestCase 子类交付用例 —— 「不用 class」的外部库例外,同 pnp/scheme.py;
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


class QcPlanTest(unittest.TestCase):
    """年度移民计划解析(2026-09-29):手写金标(2026 计划 PDF 表 3 / 表 4 技术工人行的真排版,千分位两种空格都有)+
    变异探针(表里计划数改一个 → 与正文要点句对不上即拦;表 3 少一个数 → 个数不对即拦)。纯函数用例,不联网不读仓。"""

    T3 = ("Tableau 3 - Le nombre de personnes résidentes permanentes sélectionnées par le Québec \n \nPRÉVISIONS8 \n"
          "PLAN 2026 8, 9 \nRÉSIDENTS PERMANENTS \n2023 \n2024 \n2025 \nMIN. \nMAX. \nTravailleurs qualifiés 10 \n"
          "35 843 \n42 695 \n39 000 \n32 600 \n35 600 \nGens d’affaires \n1 113 \n")
    """表 3 原排版(千分位是普通空格)。"""

    T4 = ("Tableau 4 - Le nombre personnes immigrantes admises 15 \nRÉSULTAT \nPLAN 2025 \nPRÉVISION 2025  16 \n"
          "PLAN 2026 \n \n \n2023 \n2024  17 \nMIN. \nMAX. \nMIN. \nMAX. \nMIN. \nMAX. \nTravailleurs qualifiés 18 \n"
          "29 826 \n31 481 \n30 600 32 350 \n29 300 \n31 300 \n27 050 29 500 \n"
          "Gens d’affaires \n")
    """表 4 原排版(千分位是细空格,一行两个数)。"""

    BULLETS = ("• Travailleuses et travailleurs qualifiés : de 32 600 à 35 600 ; \n"
               "‒ le nombre prévu de personnes admises comme travailleuses et travailleurs qualifiés est de \n"
               "27 050 à 29 500 personnes, \n")
    """正文 5.2.1 / 5.2.2 要点句。"""

    COVER = "PLAN ANNUEL  \nD’IMMIGRATION  \n2026 \n"
    """封面标题。"""

    def test_gold(self) -> None:
        """金标:甄选 2023 / 2024 实际、2025 预测、2026 计划区间;入境 2023 / 2024 实际、2025 计划与预测、2026 计划。"""
        from pnp.qc.functions import qcs_plan_of
        plan = qcs_plan_of(self.COVER + self.BULLETS + self.T3 + self.T4)
        self.assertEqual(plan.problems, [])
        self.assertEqual(plan.year, 2026)
        sel = []
        for r in plan.selections:
            sel.append((r["year"], r["kind"], r["value"], r["valueMax"]))
        self.assertEqual(sel, [(2023, "actual", 35843, None), (2024, "actual", 42695, None),
                               (2025, "forecast", 39000, None), (2026, "plan", 32600, 35600)])
        adm = []
        for r in plan.admissions:
            adm.append((r["year"], r["kind"], r["value"], r["valueMax"]))
        self.assertEqual(adm, [(2023, "actual", 29826, None), (2024, "actual", 31481, None),
                               (2025, "plan", 30600, 32350), (2025, "forecast", 29300, 31300),
                               (2026, "plan", 27050, 29500)])

    def test_cross_check_catches_mismatch(self) -> None:
        """变异探针:表 3 的计划上限 35 600 改成 35 700 → 与正文 5.2.1 对不上,记问题、不出行。"""
        from pnp.qc.functions import qcs_plan_of
        plan = qcs_plan_of(self.COVER + self.BULLETS + self.T3.replace("35 600", "35 700") + self.T4)
        self.assertEqual(len(plan.problems), 1)
        self.assertEqual(plan.selections, [])

    def test_missing_number_caught(self) -> None:
        """变异探针:表 3 技术工人行少一个数 → 个数不对,记问题、不出行。"""
        from pnp.qc.functions import qcs_plan_of
        plan = qcs_plan_of(self.COVER + self.BULLETS + self.T3.replace("39 000 \n", "") + self.T4)
        self.assertNotEqual(plan.problems, [])
        self.assertEqual(plan.admissions, [])


class QcReqTest(unittest.TestCase):
    """门槛页工具件(2026-09-29):按 h2 切段、TEER 列举、法文日期。纯函数用例。"""

    def test_sections(self) -> None:
        """切段:认得的段按 h2 原文收,正文里重复出现的通道名(「To qualify for Stream 1: …」)不另起一段。"""
        from pnp.qc.functions import qc_sections_of
        html = ("<h2>General requirements</h2><p>Be 18 years of age or older.</p>"
                "<h2>Stream 1: Highly qualified and specialized skills</h2><p>To qualify for Stream 1: Highly qualified "
                "and specialized skills, you must comply.</p><h2>Contact</h2><p>Last update: June 25, 2026</p>")
        secs = qc_sections_of(html)
        self.assertIn("Be 18 years", secs["General requirements"])
        self.assertIn("you must comply", secs["Stream 1: Highly qualified and specialized skills"])
        self.assertIn("June 25, 2026", secs["Last update"])

    def test_teer_listing(self) -> None:
        """TEER 列举:英文「0,1 or 2」与法文「0, 1, 2 ou 3」。"""
        from pnp.qc.functions import qc_teer_of
        self.assertEqual(qc_teer_of("0,1 or 2"), [0, 1, 2])
        self.assertEqual(qc_teer_of("0, 1, 2 ou 3"), [0, 1, 2, 3])

    def test_fr_date(self) -> None:
        """法文日期:「19 novembre 2025」→ 2025-11-19;月名认不出 → 空串 + 一条问题(不猜)。"""
        from pnp.qc.functions import qc_fr_iso_of
        problems: list = []
        self.assertEqual(qc_fr_iso_of(QcFrPartsIn(day="19", month="novembre", year="2025", page="p",
                                                  problems=problems)), "2025-11-19")
        self.assertEqual(qc_fr_iso_of(QcFrPartsIn(day="19", month="brumaire", year="2025", page="p",
                                                  problems=problems)), "")
        self.assertEqual(len(problems), 1)
