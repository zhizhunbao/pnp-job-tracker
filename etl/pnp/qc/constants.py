"""
pnp/qc 子域常量 —— 魁省词汇表(与 functions.py 同名同序镜像;方言同 pnp/constants.py:
每个常量赋值后裸字符串 docstring,决策记录连人带日期原样折进所属常量)。

唯一特批 import = `re` 与 `paths`(同 pnp/constants.py)。跨省共用的 K_ 键词表与共用件不在这里抄,
functions 直接从 pnp.constants 取(依赖单向:子域 → pnp 共用段)。

@author Frank
@time 2026-09-29 20:01:04
"""
import re

# =========================================================================
# 1. PSTQ 邀请轮次(2026-09-29 自 pnp/constants.py 段10 原样搬来;同日加逐档解析)
# =========================================================================

DRAWS_QC_URL_TPL = ("https://www.quebec.ca/en/immigration/permanent/skilled-workers/"
                    "skilled-worker-selection-program/invitation/{year}")
"""QC PSTQ 逐年邀请记录页(2026-09-26 lead 派工接入;邀请总页链出,crawl 域同日为它立窄种子 qc-pstq)。
页形:h2「Stream N: …」分四段,每段一轮一个折叠块(h2「Invitations for <日期>」+ 其后的 panel-body),
块内有本轮该 stream 的邀请总数与各邀请档的最低分。只读 crawl 缓存,不另发请求。
⚠ QC 自成体系,不属 PNP:label / scale 一律写项目名 PSTQ,不标 PNP。"""

DRAWS_QC_YEARS_BACK = 2
"""QC 逐年页往前读几年(今年 + 去年,缓存里有几年收几年;不写死年份,明年不静默过期)。"""

DRAWS_QC_LABEL = "PSTQ"
"""QC 抽选块的前端族名(2026-09-26):Programme de sélection des travailleurs qualifiés。魁省自有体系,不属 PNP ——
不许写成 PNP;只写项目名,三语卡标题原样显示。"""

DRAWS_QC_SCALE = "PSTQ"
"""QC 的邀请计分制名(Arrima 意向库按 PSTQ 计分表排序;与 CRS、各省 EOI 分互不可比,前端必须带标注)。"""

QC_DRAW_HEAD_RE = re.compile(r"^Invitations?\s+(?:for|of)\s+(.+\d{4})$", re.I)
"""QC 逐轮折叠块标题(「Invitations for June 4, 2026」「Invitations for March 19 and 20, 2026」;
两天一轮取后一天,同 NB 区间日期的取法 iso_nb_of)。"""

QC_STREAM_PREFIX = "Stream "
"""QC 的 stream 段标题前缀(「Stream 1: Highly qualified and specialized skills」原文整句进 stream);
其余 h2(汇总表、Other invitations …)一律清空当前 stream,其下的折叠块不收。"""

QC_HEAD_TAG = "h2"
"""QC 页 stream 段标题与逐轮折叠块标题共用的标签。"""

QC_BODY_TAG = "div"
"""逐轮折叠块正文的标签。"""

QC_BODY_CLASS = "panel-body"
"""逐轮折叠块正文的 class(标题之后文档序第一个)。"""

QC_DRAW_INV_RE = re.compile(r"invited\s+(\d{1,3}(?:[ ,]\d{3})+|\d+)\s+(?:people|persons|individuals)", re.I)
"""本轮该 stream 的邀请总数(千分位是不换行空格,折空白后如「invited 1 094 people」);
官方占位「invited XXX people」认不出 → invitations=None,不拿各档人数加总去猜。"""

QC_DRAW_SCORE_RE = re.compile(r"score\s*(?:\(PDF[^)]*\))?\s*"
                              r"(?:of\s+(?:at\s+least\s+)?|equal\s+to\s+or\s+greater\s+than\s+)"
                              r"(\d{1,3}(?:[ ,]\d{3})*)\s*points", re.I)
"""各邀请档的最低分,官方三种写法:「score (PDF 299 Kb) of 782 points or higher」「of at least 741 points」
「equal to or greater than 800 points」。Stream 4(杰出人才)不计分,一档都没有 → score=None。"""

QC_DRAW_NOTE_TPL = "Minimum score by invitation profile: {scores}"
"""QC 行的 note:本轮各邀请档的最低分按页面顺序列出(score 列取其中最小 = 本轮被邀请者的最低分;只一档不写)。"""

QC_EXERCISE_SPLIT_RE = re.compile(r"(?=\bExercise \d+ )|(?=\bThese invitations were (?:also )?(?:issued|addressed|sent)\b)")
"""一轮正文切成邀请档(2026-09-29 立,Frank「魁省要先抓数据分析」:官方逐档点名职业、分数线、在魁 / 魁省学历条件,
原先只取了各档最低分)。两种写法:2026-02 起「Exercise N <人数> of these invitations …」,更早「These invitations were
(also) issued / addressed …」。⚠ **区分大小写**:「37 of these invitations were sent」里的小写 these 不是切点
(忽略大小写时人数会被切进上一段,原型实撞)。"""

QC_CRITERIA_RE = re.compile(r"following criteri", re.I)
"""切出来的段里带「following criteria / criterion」的才是邀请档(段首的总数与提取时刻那段不是)。"""

QC_EXERCISE_COUNT_RE = re.compile(r"^Exercise \d+ (.+?) of these invitations")
"""邀请档人数原文(「37」「From 10 to 15」「Less than 5」);旧写法不分档报数 → 空串。"""

QC_NOC_RE = re.compile(r"\b(\d{5})\s+[A-Z]")
"""点名职业:官方逐行「21211 Data scientists」(NOC 2021 五位码 + 职业名);只收码,名以 NOC 表为准。"""

QC_IN_QC_RE = re.compile(r"\b(?:staying|living|residing|resided) in Qu[eé]bec", re.I)
"""邀请档要求人在魁省(官方四种写法:were staying / living / residing in Québec、resided in Québec outside …)。"""

QC_OUTSIDE_CMM_RE = re.compile(r"outside (?:the )?(?:Communaut[eé] m[eé]tropolitaine de Montr[eé]al|"
                               r"Montr[eé]al Metropolitan)", re.I)
"""邀请档要求人在大蒙特利尔以外(「resided in Québec outside the Communauté métropolitaine de Montréal」)。"""

QC_QC_DIPLOMA_RE = re.compile(r"obtained one of the following diplomas in Qu[eé]bec|"
                              r"(?:had|hold|held) a Qu[eé]bec (?:university|college|secondary|vocational)", re.I)
"""邀请档要求魁省学历(「obtained one of the following diplomas in Québec」「had / hold a Québec university, college …」)。
⚠ 通道 2 的「schooling equivalent to a high school diploma in Québec」是学历对等、不是魁省学历,本式不认它。"""

QC_EXERCISE_SUM_TPL = ("PSTQ {date} {stream}:各档人数加总 {total} ≠ 本轮总数 {inv}(官方页改了写法或切档切错,"
                       "整份保留旧数据)")
"""自校:各档人数全是整数时,加总必须等于本轮总数;有「From 10 to 15」「Less than 5」这类范围写法的档,不参与加总。"""

K_EXERCISES = "exercises"
"""抽选行里的邀请档清单(按页面顺序)。"""

K_INVITATIONS_TEXT = "invitationsText"
"""邀请档人数的官方原文(范围写法照录;确数时与 invitations 同值)。"""

K_IN_QUEBEC = "inQuebec"
"""邀请档要求人在魁省。"""

K_OUTSIDE_MONTREAL = "outsideMontreal"
"""邀请档要求人在大蒙特利尔以外。"""

K_QUEBEC_DIPLOMA = "quebecDiploma"
"""邀请档要求魁省学历。"""
