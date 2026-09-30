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
# 1. PSTQ 邀请轮次(2026-09-29 自 pnp/constants.py 段10 原样搬来,一字未改)
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
