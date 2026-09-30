"""
pnp/qc 子域常量 —— 魁省词汇表(与 functions.py 同名同序镜像;方言同 pnp/constants.py:
每个常量赋值后裸字符串 docstring,决策记录连人带日期原样折进所属常量)。

唯一特批 import = `re` 与 `paths`(同 pnp/constants.py)。跨省共用的 K_ 键词表与共用件不在这里抄,
functions 直接从 pnp.constants 取(依赖单向:子域 → pnp 共用段)。

@author Frank
@time 2026-09-29 20:01:04
"""
import re

import paths

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

# =========================================================================
# 2. PSTQ 门槛(2026-09-29 立,Frank「魁省数据也要抓一下吧」「不属于省提名 也算是省的吧」)
# =========================================================================

QCR_URL = "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/requirements"
"""PSTQ 门槛页(Requirements that need to be met):一般条件 + 四个通道各一个 h2 段。只读 crawl 缓存(qc-imm 种子已收;
URL 取自该种子 manifest,不是猜的),不另发请求。"""

OUT_QC_REQ = paths.PNP / "qc-req.json"
"""PSTQ 门槛表落盘处(形同九省 <省>-req.json;program 写 PSTQ)。暂不进 mart 的 IN_REQ_TABLES —— 接进去就进库,
等魁省展示拍板再接。"""

QCR_SOURCE = "Ministère de l'Immigration, de la Francisation et de l'Intégration (quebec.ca)"
"""来源名(魁省移民部)。"""

QCR_PROGRAM = "PSTQ"
"""项目名(Programme de sélection des travailleurs qualifiés)。QC 不属 PNP,不写 PNP。"""

QCR_H2_MARK = "⁣H2⁣"
"""切段标记:每个 h2 前插一个(不可见分隔符包住,正文里不会出现),整页取文本后按它切成「标题 → 段文」。"""

QCR_HEAD_TAG = "h2"
"""段标题标签(一般条件、四个通道各一个 h2)。"""

QCR_SECTION_GENERAL = "General requirements"
"""一般条件段的 h2 原文。"""

QCR_STREAM_1 = "Stream 1: Highly qualified and specialized skills"
"""通道 1 段的 h2 原文 —— 与邀请页的 stream 段标题逐字相同(门槛行的 stream 就写它,日后与抽选行按 stream 对得上)。"""

QCR_STREAM_2 = "Stream 2: Intermediate and manual skills"
"""通道 2 段的 h2 原文(同上)。"""

QCR_STREAM_3 = "Stream 3: Regulated professions"
"""通道 3 段的 h2 原文(同上)。"""

QCR_STREAM_4 = "Stream 4: Exceptional talent"
"""通道 4 段的 h2 原文(同上)。"""

QCR_ALL_STREAMS = "PSTQ (all streams)"
"""一般条件行的 stream(四个通道都适用)。"""

QCR_H2_OPEN_RE = re.compile(r"<h2\b", re.I)
"""原文里每个 h2 的开标签(切段前在它前面插 QCR_H2_MARK)。"""

QCR_H2_SUB = QCR_H2_MARK + "<h2"
"""QCR_H2_OPEN_RE 的替换串:标记 + 原开标签。"""

QCR_TAIL_KEY = "Last update"
"""切段结果里页尾那段的键(含「Last update: …」的那段;问题行里也拿它当段名)。"""

QCR_SECTION_NAMES = (QCR_SECTION_GENERAL, QCR_STREAM_1, QCR_STREAM_2, QCR_STREAM_3, QCR_STREAM_4)
"""切段时认的段名(一般条件 + 四个通道)。"""

QCR_UPDATED_RE = re.compile(r"Last update:\s*([A-Z][a-z]+ \d{1,2}, \d{4})")
"""页尾「Last update: June 25, 2026」→ guideEffective(官方自标的更新日)。"""

QCR_DIGIT_RE = re.compile(r"\d")
"""TEER 列举里的单个数字(「FEER 0,1 or 2」→ 0 / 1 / 2)。"""

QCR_UNIT_FR = "EQFR"
"""法语门槛的单位:魁省法语能力等级量表(Échelle québécoise des niveaux de compétence en français,1–12 级)。
官方写「或其等值」,本表照录魁省量表的级数,不折成 CLB。"""

QCR_SUBJECT_SPOUSE = "spouse"
"""判定对象:随行配偶(魁省对配偶有口语门槛,九省没有这一格的先例)。"""

QCR_BASIS_ORAL = "oral"
"""法语门槛口径:口语(理解 + 表达两项)。"""

QCR_BASIS_WRITTEN = "written"
"""法语门槛口径:书面(理解 + 表达两项)。"""

QCR_BASIS_WINDOW_TPL = "windowYears={n}"
"""经验时间窗(同 BC / SK 的 windowYears 写法)。"""

QCR_BASIS_IN_QC_TPL = "inQuebec;windowYears={n}"
"""口径:这段经验必须在魁省取得(通道 2 的「其中至少一年在魁省」)。"""

QCR_FACTOR_EXCEPTIONAL = "exceptionalAchievement"
"""通道 4 的杰出成就条件(部定成就清单或合作机构意见;九省没有这一因素)。"""

QCR_AGE_RE = re.compile(r"Be (\d+) years of age or older")
"""一般条件:年龄。"""

QCR_FUNDS_RE = re.compile(r"capacity to provide for yourself[^.]*? for the (\w+) months after becoming a permanent "
                          r"resident")
"""一般条件:签自给合同,证明成为永久居民后头几个月能养活自己(与随行家属)。"""

QCR_TEER_RE = re.compile(r"Your main occupation must be in the category FEER ([0-9][0-9, or]*[0-9])")
"""通道 1 / 2:主职业的 TEER 档(官方写 FEER,即 TEER 的法文缩写)。"""

QCR_EXP_S1_RE = re.compile(r"at least (\d+) years? of full-time or equivalent paid work experience in your main "
                           r"occupation.{0,60}?during the (\d+) years")
"""通道 1 经验:近 N 年内主职业至少 M 年全职(或等量)带薪经验。"""

QCR_EXP_S2_RE = re.compile(r"at least (\w+) years' paid work experience in your main occupation, i\s?ncluding at least "
                           r"(\w+) years? in Québec.{0,80}?in the (\w+) years")
"""通道 2 经验:近 N 年内至少 M 年,其中至少 K 年在魁省(官方把 including 拆成两个标签,折空白后成「i ncluding」)。"""

QCR_EXP_S4_RE = re.compile(r"practiced your main occupation for at least (\w+) years during the (\w+) years")
"""通道 4 经验:近 N 年内主职业至少 M 年。"""

QCR_LANG_HIGH_RE = re.compile(r"oral knowledge of French of level (\d+) or higher and a written knowledge of level "
                              r"(\d+) or higher")
"""TEER 0-2 那档的法语:口语 ≥ M、书面 ≥ K(通道 1 与通道 3 的 TEER 0-2 同句)。"""

QCR_LANG_S2_RE = re.compile(r"You must have a spoken knowledge of French at level (\d+) or higher")
"""通道 2 的法语:只有口语门槛。"""

QCR_LANG_S3_LOW_RE = re.compile(r"FEER 3, 4 or 5\s*, you must have a level (\d+) or higher in spoken French")
"""通道 3 的 TEER 3-5 那档:只有口语门槛。"""

QCR_SPOUSE_RE = re.compile(r"spouse must have a spoken knowledge of French at level (\d+) or higher")
"""随行配偶的口语门槛(通道 1-3 各写一遍)。"""

QCR_EDU_S1_RE = re.compile(r"diploma leading directly to a profession, earned through a program of study of at least "
                           r"(\w+) year full-time")
"""通道 1 学历:至少一年全日制、直通职业的文凭。"""

QCR_EDU_S2_RE = re.compile(r"Diploma corresponding to a secondary school diploma")
"""通道 2 学历:至少相当于魁省高中毕业(DES)。"""

QCR_LICENSING_RE = re.compile(r"Your main profession must be included in the Liste des professions réglementées")
"""通道 3:主职业在魁省受监管职业清单上(还要有监管机构的执照或学历等同认定)。"""

QCR_EXCEPTIONAL_RE = re.compile(r"Distinguish yourself clearly in your main occupation through exceptional expertise")
"""通道 4:主职业上有杰出专长。"""

QCR_TEER_LOW = [3, 4, 5]
"""通道 3 法语分档的低档 TEER(官方原句「FEER 3, 4 or 5」,由 QCR_LANG_S3_LOW_RE 锚定)。"""

QCR_TEER_HIGH = [0, 1, 2]
"""通道 3 法语分档的高档 TEER(官方原句「FEER 0, 1 or 2」)。"""

QCR_PROBLEM_TPL = "PSTQ 门槛页「{section}」段认不出:{what}"
"""自校问题行(任一条认不出 → 整份保留旧表)。"""

QCR_PROBLEM_NO_PAGE = "PSTQ 门槛页不在 crawl 缓存(qc-imm 种子没抓到)"
"""缓存没有这一页。"""

QCR_PROBLEM_NO_SECTION_TPL = "PSTQ 门槛页缺「{section}」段(官网改版?)"
"""页上没有这个 h2 段。"""

QCR_WHAT_AGE = "年龄"
"""问题行里的条目名:年龄。"""

QCR_WHAT_FUNDS = "自给合同月数"
"""问题行里的条目名:自给合同。"""

QCR_WHAT_TEER = "TEER 档"
"""问题行里的条目名:TEER。"""

QCR_WHAT_EXP = "经验"
"""问题行里的条目名:经验。"""

QCR_WHAT_LANG = "法语"
"""问题行里的条目名:法语。"""

QCR_WHAT_SPOUSE = "配偶法语"
"""问题行里的条目名:配偶法语。"""

QCR_WHAT_EDU = "学历"
"""问题行里的条目名:学历。"""

QCR_WHAT_LICENSING = "受监管职业"
"""问题行里的条目名:受监管职业。"""

QCR_WHAT_EXCEPTIONAL = "杰出专长"
"""问题行里的条目名:杰出专长。"""

QCR_WHAT_UPDATED = "页尾更新日"
"""问题行里的条目名:页尾更新日。"""

QCR_MONTHS_PER_YEAR = 12
"""年 → 月(经验门槛一律按月落,同九省)。"""

QCR_PRINT_DONE_TPL = "✓ {path}  更新日 {version}  {n} 条门槛"
"""落盘报数。"""

QCR_FACTOR_ORDER = ("age", "fundsMinimum", "occupationPathway", "experience", "language", "education", "licensing",
                    "exceptionalAchievement", "intakeWindow")
"""收尾按因素报条数的顺序(2026-09-29 加 intakeWindow:PEQ 收件期行)。"""

K_TEF_COMP = "tefComp"
"""法语行 basis 键:TEF 理解(听 / 读)那一档下限。"""

K_TEF_EXPR = "tefExpr"
"""法语行 basis 键:TEF 表达(说 / 写)那一档下限。"""

K_TCF_COMP = "tcfComp"
"""法语行 basis 键:TCF 理解那一档下限(699 分制)。"""

K_TCF_EXPR = "tcfExpr"
"""法语行 basis 键:TCF 表达那一档下限(20 分制)。"""

QCR_FR_TESTS = {
    "oral": (("TEF-Canada (à partir du 11 décembre 2023)", "Compréhension orale et écrite", K_TEF_COMP),
             ("TEF-Canada (à partir du 11 décembre 2023)", "Expression orale", K_TEF_EXPR),
             ("TCF-Canada", "Compréhension orale", K_TCF_COMP),
             ("TCF-Canada", "Expression orale et écrite", K_TCF_EXPR)),
    "written": (("TEF-Canada (à partir du 11 décembre 2023)", "Compréhension orale et écrite", K_TEF_COMP),
                ("TEF-Canada (à partir du 11 décembre 2023)", "Expression écrite", K_TEF_EXPR),
                ("TCF-Canada", "Compréhension écrite", K_TCF_COMP),
                ("TCF-Canada", "Expression orale et écrite", K_TCF_EXPR)),
}
"""法语门槛行挂考试分数线(2026-09-29 Frank「要不都用 TEF 呢?」):口径(oral / written)→ 四个 (考试, 技能, 键)。
魁省级数门槛的「口语 N 级」= 听、说两项都到 N 级,「书面 N 级」= 读、写两项都到 N 级,所以每个考试取理解 + 表达两格。
TEF 取现行 TEF Canada(2023-12-11 起那版);魁省对照表里 TEF / TEFAQ / TEF Canada 三版在 4 / 5 / 7 级的分数线逐格相同(当日核过)。
TCF 取 TCF Canada:理解按 699 分制、表达按 20 分制,所以「口语 7 级」在 TCF 是听 400、说 10,不能只写一个数。"""

QCR_FR_BASIS_TPL = "{basis};tefComp={tefComp};tefExpr={tefExpr};tcfComp={tcfComp};tcfExpr={tcfExpr}"
"""法语门槛行的 basis:原口径(oral / written)后接四个分数线(各考试该级那一档的下限;前端按它出「TEF 400 分起」)。"""

QCR_FR_PROBLEM_TPL = "法语分数线挂不上:{what}"
"""自校问题行(对照表缺考试 / 技能 / 这一级 → 整份保留旧表)。"""

QCR_FR_WHAT_FILE = "qc-french-levels.json 不在(qc_french_levels 步要排在门槛步之前)"
"""问题行条目:对照表产物缺。"""

QCR_FR_WHAT_BAND_TPL = "{test} / {skill} 找不到魁省 {level} 级那一档"
"""问题行条目:对照表里没有这一档。"""

QCR_FR_WHAT_BASIS_TPL = "法语行口径「{basis}」认不出"
"""问题行条目:basis 不是 oral / written。"""

# =========================================================================
# 3. PEQ 门槛(2026-09-29 立;PEQ 2026-07-02 起临时重开两年,只有法文页)
# =========================================================================

QCP_URL = "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise"
"""PEQ 总页(重开公告;crawl 域 qc-peq 种子)。"""

QCP_TFW_URL = ("https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/"
               "conditions-selection/travailleurs-temporaires")
"""PEQ 临时工分支的甄选条件页(qc-peq 种子深度 2)。"""

QCP_GRAD_URL = ("https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/"
                "conditions-selection/diplomes-quebec")
"""PEQ 魁省毕业生分支的甄选条件页(同上)。"""

OUT_QC_PEQ_REQ = paths.PNP / "qc-peq-req.json"
"""PEQ 门槛表落盘处(program 写 PEQ;另带 intake 收件窗口块)。同 qc-req.json,暂不进 mart。"""

QCP_PROGRAM = "PEQ"
"""项目名(Programme de l'expérience québécoise)。"""

QCP_STREAM_TFW = "PEQ – Travailleurs étrangers temporaires"
"""临时工分支的通道名(官方法文原名)。"""

QCP_STREAM_GRAD = "PEQ – Diplômés du Québec"
"""魁省毕业生分支的通道名(官方法文原名)。"""

QCP_WINDOW_RE = re.compile(r"rouvert pour une période de (\w+) ans, du (\d{1,2}) (\w+) (\d{4}) au (\d{1,2}) (\w+) "
                           r"(\d{4})")
"""重开期:「rouvert pour une période de deux ans, du 2 juillet 2026 au 2 juillet 2028」。"""

QCP_INTAKE_RE = re.compile(r"reçue dans l’un ou l’autre des deux volets de ce programme du (\d{1,2}) (\w+) au "
                           r"(\d{1,2}) (\w+) (\d{4})")
"""本轮收件窗口:「… de ce programme du 2 juillet au 31 octobre 2026」(起日与止日同年)。"""

QCP_CUTOFF_RE = re.compile(r"en date du (\d{1,2}) (\w+) (\d{4})")
"""收件资格的截点日:「en date du 19 novembre 2025」(两个分支同一天;取第一处)。"""

QCP_RECEPT_TFW_RE = re.compile(r"Pour le volet Travailleurs étrangers temporaires : avoir une expérience de travail "
                               r"au Québec de catégorie « Formation, études, expérience, responsabilités » "
                               r"([0-9][0-9, ou]*[0-9]) au sens de la CNP d’une durée d’au moins (\w+) ans")
"""临时工分支的收件条件:截点日前在魁省做满 N 年 TEER 0-3 的工作。"""

QCP_RECEPT_GRAD_RE = re.compile(r"Pour le volet Diplômés du Québec : avoir obtenu, au Québec,[^;]*?d’au moins "
                                r"(\d[\d ]*) heures")
"""毕业生分支的收件条件:截点日前在魁省拿到学士 / 硕士 / 博士、技术类 DEC 或至少 N 小时的 DEP(+ ASP)。"""

QCP_AGE_RE = re.compile(r"Avoir (\d+) ans ou plus")
"""一般条件:年龄。"""

QCP_ORAL_RE = re.compile(r"Avoir une connaissance du français oral de niveau (\d+) ou plus")
"""申请人口语门槛(两个分支都是这句)。"""

QCP_WRITTEN_RE = re.compile(r"connaissance du français écrit de niveau (\d+) ou plus")
"""书面门槛(只有毕业生分支有)。"""

QCP_SPOUSE_RE = re.compile(r"(?:Il ou elle|Votre conjointe ou conjoint, épouse ou époux) doit avoir une connaissance "
                           r"du français oral (?:de niveau|qui équivaut au niveau) (\d+)")
"""随行配偶的口语门槛(两个分支措辞不同)。"""

QCP_TEER_RE = re.compile(r"FÉER ([0-9][0-9, ou]*[0-9]) de la Classification nationale des professions")
"""临时工分支:在魁省的工作须属 TEER 0-3。"""

QCP_EXP_RE = re.compile(r"pendant au moins (\d+) des (\d+) mois qui précèdent la présentation de votre demande")
"""临时工分支经验:申请前 36 个月里至少 24 个月。"""

QCP_FULLTIME_RE = re.compile(r"un minimum de (\d+) heures payées par semaine")
"""临时工分支:全职的定义(每周至少 N 小时带薪)。"""

QCP_GRAD_WINDOW_RE = re.compile(r"Avoir obtenu votre diplôme au cours des (\d+) mois qui précèdent")
"""毕业生分支:申请前 N 个月内毕业。"""

QCP_DEP_HOURS_RE = re.compile(r"Le diplôme d’études professionnelles \(DEP\) d’une durée de formation de (\d[\d ]*) "
                              r"heures ou plus")
"""毕业生分支合格学历里 DEP 的最低学时。"""

QCP_UPDATED_RE = re.compile(r"Dernière mise à jour :\s*(\d{1,2}) (\w+) (\d{4})")
"""页尾「Dernière mise à jour : 17 juin 2026」→ guideEffective。"""

QCP_BASIS_WINDOW_TPL = "windowMonths={n}"
"""经验 / 毕业时间窗(同 AB 的 windowMonths 写法)。"""

QCP_BASIS_EXP_TPL = "inQuebec;windowMonths={n};fullTimeHoursPerWeek={h}"
"""临时工分支经验口径:在魁省、时间窗、全职(每周至少 N 小时带薪)。"""

QCP_BASIS_CUTOFF_TPL = "asOf={date}"
"""收件条件的截点日口径(PEQ 本轮只收截点日前已满足条件的人)。"""

QCP_FACTOR_INTAKE = "intakeWindow"
"""PEQ 收件期行的因素名(2026-09-29 立:门槛卡「收件期」行读它;九省没有这一因素)。"""

QCP_INTAKE_TEXT_TPL = "{opens}..{closes}"
"""收件期行的 valueText(ISO 起止)。"""

QCP_INTAKE_BASIS_TPL = "opens={opens};closes={closes};programCloses={pclose}"
"""收件期行的 basis:本轮收件起止 + 重开期止日(前端按它出「2026-07-02 至 2026-10-31」)。"""

QCP_UNIT_HOURS = "hours"
"""学时单位(DEP 至少 1 800 小时)。"""

FR_MONTHS = {"janvier": 1, "février": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6, "juillet": 7, "août": 8,
             "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12}
"""法文月份 → 月数(PEQ 页日期全是法文)。"""

FR_WORD_N = {"un": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5}
"""法文数词 → 数字(「deux ans」)。"""

ISO_DATE_TPL = "{y:04d}-{m:02d}-{d:02d}"
"""ISO 日期。"""

K_INTAKE = "intake"
"""PEQ 表里的收件窗口块。"""

K_PROGRAM_OPENS = "programOpens"
"""重开期起日。"""

K_PROGRAM_CLOSES = "programCloses"
"""重开期止日。"""

K_INTAKE_OPENS = "intakeOpens"
"""本轮收件起日。"""

K_INTAKE_CLOSES = "intakeCloses"
"""本轮收件止日。"""

K_ELIGIBLE_AS_OF = "eligibleAsOf"
"""收件资格截点日(截点日前已满足收件条件才收)。"""

K_QUOTE = "quote"
"""官方原句。"""

QCP_PROBLEM_TPL = "PEQ「{page}」页认不出:{what}"
"""自校问题行(任一条认不出 → 整份保留旧表)。"""

QCP_PROBLEM_NO_PAGE_TPL = "PEQ 页不在 crawl 缓存:{url}(qc-peq 种子没抓到)"
"""缓存没有这一页。"""

QCP_PAGE_TFW = "临时工分支"
"""问题行里的页名。"""

QCP_PAGE_GRAD = "毕业生分支"
"""问题行里的页名。"""

QCP_WHAT_WINDOW = "重开期"
"""问题行条目名。"""

QCP_WHAT_INTAKE = "收件窗口"
"""问题行条目名。"""

QCP_WHAT_CUTOFF = "收件截点日"
"""问题行条目名。"""

QCP_WHAT_RECEPT = "收件条件"
"""问题行条目名。"""

QCP_WHAT_FULLTIME = "全职口径"
"""问题行条目名。"""

QCP_WHAT_DEP = "DEP 学时"
"""问题行条目名。"""

QCP_WHAT_DATE = "法文日期"
"""问题行条目名。"""

QCP_PRINT_DONE_TPL = "✓ {path}  更新日 {version}  {n} 条门槛  收件 {opens} → {closes}(资格截点 {asof})"
"""落盘报数。"""

# =========================================================================
# 4. 年度移民计划(2026-09-29 立:技术工人的甄选数与入境数,实际 / 预测 / 计划)
# =========================================================================

QCS_PLAN_URL = ("https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/immigration/publications-adm/plan-immigration/"
                "PL_immigration_2026_MIFI.pdf")
"""魁省《Plan annuel d'immigration 2026》(移民部 MIFI,省议会提交件)。URL 不是猜的:quebec.ca 站内检索
「Plan d'immigration du Québec 2026」命中的官方 PDF(2026-09-29 核过 200、14 页)。原件经 fetch_bytes 先落 crawl 层
(files-cdn-contenu.quebec.ca/file_cache/)再解析。⚠ 每年秋季出下一年的计划、文件名带年份 —— 新一年的 URL 出来时
照同样方式检索举证后改这里(不按年份拼、不猜);本页的计划年由 QCS_TITLE_RE 读出,落盘时照录。"""

OUT_QC_STATS = paths.PNP / "qc-stats.json"
"""魁省年度统计落盘处(甄选数 / 入境数两张清单)。同门槛表,暂不进 mart。"""

QCS_SOURCE = "Plan annuel d'immigration (MIFI)"
"""来源名。"""

QCS_CATEGORY = "Travailleurs qualifiés"
"""统计口径:计划表里的「技术工人」一行 —— 官方脚注:含 PEQ、PRTQ(已被 PSTQ 取代)与各永久移民试点项目
(PSTQ 单列的数官方没给)。写进 program 格,不写 PSTQ,免得读的人以为是 PSTQ 单独的配额。"""

QCS_NOTE = ("魁省年度移民计划表 3(甄选数,即发出的魁省甄选证书 CSQ)与表 4(入境数,即成为永久居民的人数)的「技术工人」行。"
            "官方口径:含 PEQ、PRTQ 与永久移民试点项目,PSTQ 单独的数没有公布。计划数是区间(最少 / 最多),预测数是当年未完时的估计。")
"""口径注(给读表的人看;官方原句在 PDF 表 3 / 表 4 的脚注 10 / 18)。"""

QCS_TIMEOUT_S = 60
"""PDF 下载超时。"""

QCS_TITLE_RE = re.compile(r"PLAN ANNUEL\s+D’IMMIGRATION\s+(\d{4})")
"""封面标题里的计划年。"""

QCS_T3_HEAD_RE = re.compile(r"Tableau 3 - Le nombre de personnes résidentes permanentes sélectionnées par le Québec")
"""表 3(甄选数)标题;解析只在它之后找。"""

QCS_T4_HEAD_RE = re.compile(r"Tableau 4 - Le nombre personnes immigrantes admises")
"""表 4(入境数)标题(官方原文漏了「de」,照录)。"""

QCS_T3_YEARS_RE = re.compile(r"RÉSIDENTS PERMANENTS\s+(\d{4})\s+(\d{4})\s+(\d{4})")
"""表 3 表头:两个实际年 + 一个预测年(之后是计划年的最少 / 最多两列)。"""

QCS_T4_YEARS_RE = re.compile(r"RÉSULTAT\s+PLAN (\d{4})\s+PRÉVISION (\d{4})[\s\d]*?PLAN (\d{4})\s+(\d{4})\s+(\d{4})")
"""表 4 表头:计划年(上一年)、预测年、计划年(本年)、两个实际年(列序:实际 × 2、上年计划 min / max、
上年预测 min / max、本年计划 min / max;「2024」后跟脚注号 17,[\\s\\d]*? 吃掉)。"""

QCS_ROW_RE = re.compile(r"^Travailleurs qualifiés\s*\d*\s*$", re.M)
"""两张表里「技术工人」那一行的行名(行名后跟脚注号 10 / 18)。"""

QCS_NUM_PAT = r"\d{1,3}(?:[ \u2009\u202f\xa0]\d{3})*"
"""表里的数:千分位三种写法都有 —— 表 3 是普通空格(「35 843」),表 4 与合计行是细空格 U+2009(「30 600 32 350」一行两个数,
数与数之间才是普通空格),另认不换行空格。千分位后必须正好三位,所以「30 600 32 350」切成 30600 / 32350 两个;
真并错了会被「数的个数」与「正文交叉核对」两道自校拦住(原型只见过细空格,表 3 实撞)。"""

QCS_NUM_RE = re.compile(QCS_NUM_PAT)
"""QCS_NUM_PAT 编好的正则(逐行取数用)。"""

QCS_LETTER_RE = re.compile(r"[A-Za-zÀ-ÿ]")
"""行里有字母 = 到了下一行名,本行的数取完。"""

QCS_T3_NUMS = 5
"""表 3 技术工人行的数:实际 × 2、预测 × 1、本年计划 min / max。"""

QCS_T4_NUMS = 8
"""表 4 技术工人行的数:实际 × 2、上年计划 min / max、上年预测 min / max、本年计划 min / max。"""

QCS_SEL_RE = re.compile(r"Travailleuses et travailleurs qualifiés : de (" + QCS_NUM_PAT + r") à (" + QCS_NUM_PAT + r")")
"""正文 5.2.1 要点句:本年计划甄选数区间(与表 3 末两列交叉核对)。"""

QCS_ADM_RE = re.compile(r"personnes admises comme travailleuses et travailleurs qualifiés est de\s+(" + QCS_NUM_PAT
                        + r") à (" + QCS_NUM_PAT + r") personnes")
"""正文 5.2.2 要点句:本年计划入境数区间(与表 4 末两列交叉核对)。"""

QCS_KIND_ACTUAL = "actual"
"""行类:实际数。"""

QCS_KIND_FORECAST = "forecast"
"""行类:预测数(当年未完时的估计)。"""

QCS_KIND_PLAN = "plan"
"""行类:计划数(区间)。"""

QCS_UNIT_PEOPLE = "people"
"""单位:人(甄选数是获发 CSQ 的人数,含随行家属)。"""

QCS_SECTION_T3 = "Tableau 3 - Le nombre de personnes résidentes permanentes sélectionnées par le Québec"
"""表 3 出处节名。"""

QCS_SECTION_T4 = "Tableau 4 - Le nombre personnes immigrantes admises"
"""表 4 出处节名。"""

QCS_LABEL_TPL = "{table}, {row}, {year} ({kind})"
"""行 label:表名 + 行名 + 年 + 行类。"""

K_SELECTIONS = "selections"
"""甄选数清单(表 3)。"""

K_ADMISSIONS = "admissions"
"""入境数清单(表 4)。"""

K_KIND = "kind"
"""行类(actual / forecast / plan)。"""

K_VALUE_MAX = "valueMax"
"""区间上限(计划 / 区间预测;单值行为 None)。"""

K_PLAN_YEAR = "planYear"
"""本份计划的计划年。"""

QCS_PROBLEM_TPL = "魁省年度计划 PDF 认不出:{what}"
"""自校问题行(任一条认不出 → 整份保留旧表)。"""

QCS_PROBLEM_FETCH_TPL = "魁省年度计划 PDF 取不到:{name} {detail}"
"""下载失败。"""

QCS_PROBLEM_CROSS_TPL = "魁省年度计划 {what}:表里 {table} ≠ 正文 {text}(官方改版或解析错,整份保留旧表)"
"""交叉核对不一致。"""

QCS_WHAT_TITLE = "封面计划年"
"""问题行条目名。"""

QCS_WHAT_T3 = "表 3 技术工人行"
"""问题行条目名。"""

QCS_WHAT_T4 = "表 4 技术工人行"
"""问题行条目名。"""

QCS_WHAT_SEL = "5.2.1 计划甄选数"
"""问题行条目名。"""

QCS_WHAT_ADM = "5.2.2 计划入境数"
"""问题行条目名。"""

QCS_PRINT_DONE_TPL = "✓ {path}  计划年 {year}  甄选 {sel} 行  入境 {adm} 行(本年计划甄选 {smin}–{smax},入境 {amin}–{amax})"
"""落盘报数。"""

# =========================================================================
# 5. PSTQ 职业 → 通道对照(2026-09-29 立,Frank「开工」:焊工能走几个通道要按官方对照,不按 TEER 推)
# =========================================================================

QCN_XLSX_URL = "https://cdn-contenu.quebec.ca/cdn-contenu/immigration/progTQ/anglais/Outil_ProgTQ_WebCNP_MIFI_version_anglais.xlsx"
"""官方「按 NOC 查 PSTQ 通道」工具的数据表(英文版)。URL 不是猜的:取自 quebec.ca「Find the NOC code for your primary
occupation and the corresponding stream」页里查询组件的配置 xlsRelativePath(页上工具就读这份)。原件经 fetch_bytes
先落 crawl 层。全部 516 个 NOC 逐个写明可进哪个通道(1 / 2 / 3,带「只限某些工作」「要公民 / 永居身份」「要魁省学历」
等细分码),比按 TEER 推准:受监管职业、部分受监管职业只有这份表说得清。
⚠ 表的首页是联系人信息(官方标「内部工作文档」),只读对照两页,联系人一格不收。"""

QCN_REGULATED_PDF_URL = "https://cdn-contenu.quebec.ca/cdn-contenu/immigration/formulaires/fr/PSTQ/LIS_PSTQ_PTA_Professions_reglementees.pdf"
"""《受监管职业清单》(Liste des professions réglementées,每年 1 月 31 日更新、年中可调)。URL 取自 PSTQ 门槛页通道 3 段的链接。
读两样:开头的三个总数(共几个 NOC、整类受监管几个、部分受监管几个),与对照表通道 3 的码数交叉核对;
2026-09-29 同日加读逐条目表格(Frank「读」:门槛卡「执照」行要写哪家机构管、哪几种工作受监管),挂到对照表通道 3 那一项。"""

OUT_QC_NOC_STREAMS = paths.PNP / "qc-noc-streams.json"
"""职业 → 通道对照落盘处(暂不进 mart;岗位对通道、门槛卡选哪几张,等展示拍板再接)。
⚠ 顶层不许有 occupations 键 —— mart 评分段目录驱动扫 raw/pnp/*.json,带这个键会被当成清单表读(pnp 常量
OUT_DRAWS_FILE_TPL 的同款提醒),本表用 nocs。"""

QCN_SHEET_ROWS = "3Contenu"
"""对照表里逐 NOC 那一页。"""

QCN_SHEET_CODES = "4Configuration"
"""对照表里「通道细分码 → 官方说明」那一页。"""

QCN_ROWS_SKIP = 4
"""逐 NOC 那一页前几行是标题 / 表头(官方排版:标题、空行、列名、Streams 小标)。"""

QCN_CODES_SKIP = 3
"""细分码那一页前几行是标题 / 表头。"""

QCN_CODE_SEP = ","
"""一格里多个细分码的分隔(「1, 3-PNER16」)。"""

QCN_STREAM_SEP = "-"
"""细分码的通道号在第一个「-」之前(「3-PNER16」→ 3)。"""

QCN_NOC_RE = re.compile(r"^\d{5}$")
"""NOC 五位码。"""

QCN_KIND_BASE = "all"
"""细分码的类:该职业的工作都进这个通道(码只有通道号,如「1」)。"""

QCN_KINDS = {"CC": "citizenOnly", "RP": "residentOnly", "PER": "regulated", "PER-DQ": "regulatedQcDiploma",
             "PNER": "partlyRegulated"}
"""细分码后缀 → 类:CC 要加拿大公民才能做(不发邀请)、RP 要永久居民才能做(不发邀请)、PER 整类受监管、
PER-DQ 整类受监管且要魁省学历、PNER 部分受监管(只有码说明里点名的工作受监管;码后带编号,取前缀判类)。
官方原文在细分码那一页的说明列,落盘时照录 label。"""

QCN_PNER_RE = re.compile(r"^PNER\d+(?:-DQ)?$")
"""部分受监管码(PNER + 编号;PNER5-DQ 那条另带魁省学历要求,类仍按部分受监管,说明照录)。"""

QCN_PNER_KEY = "PNER"
"""QCN_KINDS 里部分受监管那一类的键(PNER + 编号的码统一按它判类)。"""

QCN_FULL_KINDS = ("regulated", "regulatedQcDiploma")
"""整类受监管的两类(与清单开头「entièrement réglementées」的数核对)。"""

QCN_PARTIAL_KINDS = ("partlyRegulated",)
"""部分受监管的类(与清单开头「non entièrement réglementées」的数核对)。"""

QCN_TABLE_START = "Le tableau suivant présente"
"""《受监管职业清单》表格从这句之后开始(之前的说明段里也有「31111 — Optométristes」这种举例行,不能当条目读)。"""

QCN_HEAD_LINES = ("Professions CNP", "Emplois réglementés au Québec associés aux", "professions CNP",
                  "Autorités de réglementation encadrant les emplois", "réglementés au Québec")
"""每页顶上重印的三列表头(pymupdf 拆成五行),逐行跳过。"""

QCN_ENTRY_RE = re.compile(r"^(\d{5}) [—–-] (.+)$")
"""条目行:NOC + 分隔 + 职业名(官方三种分隔都有:长破折号、短破折号、连字符)。"""

QCN_FOOTNOTE_RE = re.compile(r"^\d{1,2} [A-ZÉÀ]")
"""脚注行(「1 Diplôme du Québec obligatoire pour …」),跳过。"""

QCN_FOOTMARK_RE = re.compile(r"(?<=[^\d\s])\d$")
"""行尾脚注号(「Régie du bâtiment du Québec1」的 1),剥掉。"""

QCN_BULLET = "•"
"""受监管工作的列项符(「• Soudeur/soudeuse dans l’industrie de la construction」)。"""

QCN_BULLET_STRIP = "• "
"""剥列项符时去掉的字符。"""

QCN_ALL_JOBS = "Tous les emplois"
"""整类受监管的写法(也有「Tous les emplois dans l’industrie de la construction」「… hors de l’industrie …」按行业分组)。"""

QCN_CONNECT = ("de", "du", "des", "en", "et", "la", "le", "les", "dans", "à", "aux", "ou", "sur", "pour", "par")
"""行尾是这些虚词 = 这一行没写完,下一行接着拼(「Ordre des comptables professionnels agréés du」+「Québec」)。"""

QCN_WRAP_TAILS = ("’", "'", "-", "/")
"""行尾是这些字符同样没写完(「d’」「arpenteuses-」)。"""

QCN_JOIN_SEP = " "
"""折行拼接符。"""

K_REGULATED = "regulated"
"""通道 3 那一项的受监管明细:[{jobs, authorities}](按行业分组时多组,如 73402 建筑业内归 CCQ、业外归就业部)。"""

K_JOBS = "jobs"
"""受监管的工作(法文原文;「Tous les emplois」= 整类)。"""

K_AUTHORITIES = "authorities"
"""监管机构(法文原文)。"""

K_GROUPS = "groups"
"""条目解析的中间键:一组组「工作 + 机构」。"""

QCN_WHAT_SET_TPL = "受监管职业清单与对照表通道 3 的 NOC 不一致:{diff}"
"""问题行条目:两份官方文件的 NOC 集合对不上。"""

QCN_WHAT_EMPTY_TPL = "受监管职业清单 {noc} 解析不出「工作 + 机构」"
"""问题行条目:某条目没有完整的一组。"""

QCN_MODE_NAME = "name"
"""条目状态机:在职业名(可能折行)里。"""

QCN_MODE_JOBS = "jobs"
"""条目状态机:在受监管工作区。"""

QCN_MODE_AUTH = "auth"
"""条目状态机:在监管机构区。"""

QCN_TOTALS_RE = re.compile(r"Cette liste comprend (\d+) professions")
"""《受监管职业清单》开头:共几个 NOC。"""

QCN_FULL_RE = re.compile(r"(\d+) professions CNP « entièrement réglementées »")
"""《受监管职业清单》开头:整类受监管几个。"""

QCN_PARTIAL_RE = re.compile(r"(\d+) professions CNP « non entièrement réglementées »")
"""《受监管职业清单》开头:部分受监管几个。"""

QCN_VERSION_RE = re.compile(r"version du (\d{1,2}) (\w+) (\d{4})")
"""《受监管职业清单》版本日(「version du 28 août 2026」)。"""

QCN_TIMEOUT_S = 60
"""两份原件的下载超时。"""

K_CODE = "code"
"""官方细分码原文(「3-PNER16」)。"""

K_REGULATED_LIST = "regulatedList"
"""《受监管职业清单》的三个总数与版本日(交叉核对用,照录)。"""

K_FULL = "full"
"""整类受监管几个。"""

K_VERSION = "version"
"""版本日(ISO)。"""

QCN_STREAM3 = 3
"""受监管职业通道号(交叉核对只数这个通道)。"""

QCN_PROBLEM_TPL = "PSTQ 职业对照认不出:{what}"
"""自校问题行(任一条认不出或对不上 → 整份保留旧表)。"""

QCN_PROBLEM_FETCH_TPL = "PSTQ 职业对照原件取不到:{name} {detail}"
"""下载 / 解析失败。"""

QCN_PROBLEM_CROSS_TPL = "PSTQ 职业对照:对照表通道 3 {what} {table} ≠ 受监管职业清单 {pdf}(两份官方文件没同步或解析错,整份保留旧表)"
"""交叉核对不一致。"""

QCN_WHAT_CODE_TPL = "细分码「{code}」不在说明页(NOC {noc})"
"""问题行条目:码查不到说明。"""

QCN_WHAT_KIND_TPL = "细分码「{code}」认不出类(NOC {noc})"
"""问题行条目:码后缀认不出。"""

QCN_WHAT_ROWS = "逐 NOC 页行数"
"""问题行条目:行数不对。"""

QCN_WHAT_TOTALS = "受监管职业清单开头的总数句"
"""问题行条目:清单总数句。"""

QCN_WHAT_TOTAL = "受监管 NOC 总数"
"""交叉核对条目。"""

QCN_WHAT_FULL = "整类受监管数"
"""交叉核对条目。"""

QCN_WHAT_PARTIAL = "部分受监管数"
"""交叉核对条目。"""

QCN_NOC_COUNT = 516
"""NOC 2021 的职业总数(对照页原句「In total, it list 516 occupations」);逐 NOC 页行数必须等于它。"""

QCN_PRINT_DONE_TPL = "✓ {path}  {n} 个 NOC(通道 1 {s1} / 2 {s2} / 3 {s3};受监管清单 {ver} 版 {total} = {full} + {partial})"
"""落盘报数。"""

# =========================================================================
# 6. 魁省法语等级对照(2026-09-29 立,Frank「语言等级是不是统一用 CLB」:核下来统一不了,照录魁省官方对照表)
# =========================================================================

QCF_PDF_URL = "https://cdn-contenu.quebec.ca/cdn-contenu/immigration/formulaires/fr/PSTQ/TAB_PSTQ_Correspondance_niveaux_francais.pdf"
"""《考试分数 ↔ 魁省法语等级对照表》(Tableaux de correspondance)。URL 取自 PSTQ「Demonstrate your knowledge of French」页的
「result correspondence tables」链接。原件经 fetch_bytes 先落 crawl 层。
为什么不折成 CLB / NCLC:魁省按考试分数粗分档(7、8 级共用一档),同一档在联邦 NCLC 表里跨好几级、且因考试而异 ——
TEF Canada 口语表达 400 分起算魁省 7 级,联邦表里 400 分是 NCLC 5(387–421),NCLC 7 要 456 分;TCF Canada 口语 10 分起
算魁省 7 级,联邦表里 10–11 分正是 NCLC 7(联邦表见 canada.ca PGWP「language-results」页,2026-09-29 核)。
所以门槛照录魁省级数,显示时灰字挂各考试的分数线,不写成 CLB。"""

OUT_QC_FRENCH_LEVELS = paths.PNP / "qc-french-levels.json"
"""法语等级对照落盘处(暂不进 mart)。"""

QCF_VERSION_RE = re.compile(r"\(Version du (\d{1,2}) (\w+) (\d{4})\)")
"""对照表版本日(「(Version du 29 novembre 2024)」)。"""

QCF_LEVELS_HEAD = "Niveaux de l’Échelle québécoise"
"""魁省等级那一行的行名(其后 7 格是等级档:1-2 / 3 / 4 / 5-6 / 7-8 / 9-10 / 11-12)。"""

QCF_CEFR_HEAD = "Niveaux du Cadre européen commun de référence pour les langues"
"""欧框那一行的行名(其后 7 格是欧框级:A1 / A2 / A2 / B1 / B2 / C1 / C2)。"""

QCF_BODY_HEAD = "Pointages obtenus aux tests"
"""分数表正文从这一行之后开始。"""

QCF_BANDS = 7
"""等级档数(每个考试每项技能 7 格分数)。"""

QCF_SKILL_RE = re.compile(r"^(?:Compréhension|Expression|Épreuve) ")
"""技能行(「Compréhension orale et écrite」「Expression orale」…;DALF C2 写「Épreuve synthèse orale / écrite」,
首跑漏认、整组静默丢,补上并加「有考试名没出行」的自校)。"""

QCF_WHAT_RISING_TPL = "「{test}」{skill} 的七格分数不是逐档递增(少了一格、吞了别处的数?)"
"""问题行条目:分数不递增。"""

QCF_WHAT_ORPHAN_TPL = "「{test}」读到了考试名却没解析出一行分数(技能行写法变了?)"
"""问题行条目:考试名后面没有任何技能组。"""

QCF_SCORE_RE = re.compile(r"^(?:-|(\d{1,3}(?:,\d)?)(?:-(\d{1,3}(?:,\d)?))?)$")
"""分数格:「400-499」;TCF 表达只写一个数「1」;第 2 页 DELF / DALF 表带小数逗号「12,5-25」,不适用的档写「-」(上下限都记空)。"""

QCF_DECIMAL_COMMA = ","
"""法文小数逗号(「12,5」)。"""

QCF_DECIMAL_POINT = "."
"""换成小数点再转数。"""

QCF_LEVEL_RE = re.compile(r"^(\d{1,2})(?:-(\d{1,2}))?$")
"""等级档(「7-8」「3」)。"""

QCF_MIN_TESTS = 5
"""至少认出几个考试(对照表现有 TEF / TEFAQ、TEF Canada 两版、TCF / TCF-Québec、TCF Canada 五组)。"""

K_TESTS = "tests"
"""考试清单。"""

K_TEST = "test"
"""考试名(原文,含「avant / à partir du 11 décembre 2023」版本注)。"""

K_SKILL = "skill"
"""技能名(原文)。"""

K_BANDS = "bands"
"""七档:{levelMin, levelMax, cefr, scoreMin, scoreMax}。"""

K_LEVEL_MIN = "levelMin"
"""这一档的魁省等级下限。"""

K_LEVEL_MAX = "levelMax"
"""这一档的魁省等级上限。"""

K_CEFR = "cefr"
"""这一档的欧框级。"""

K_SCORE_MIN = "scoreMin"
"""这一档的分数下限。"""

K_SCORE_MAX = "scoreMax"
"""这一档的分数上限(只写一个数的档,上下限相同)。"""

QCF_PROBLEM_TPL = "魁省法语对照表认不出:{what}"
"""自校问题行(任一条认不出 → 整份保留旧表)。"""

QCF_PROBLEM_FETCH_TPL = "魁省法语对照表取不到:{name} {detail}"
"""下载 / 解析失败。"""

QCF_WHAT_VERSION = "版本日"
"""问题行条目。"""

QCF_WHAT_LEVELS = "魁省等级行"
"""问题行条目。"""

QCF_WHAT_CEFR = "欧框行"
"""问题行条目。"""

QCF_WHAT_BODY = "分数表正文"
"""问题行条目。"""

QCF_WHAT_SKILL_TPL = "「{test}」{skill} 的分数格不是 7 格"
"""问题行条目。"""

QCF_WHAT_TESTS_TPL = "只认出 {n} 个考试"
"""问题行条目。"""

QCF_PRINT_DONE_TPL = "✓ {path}  {ver} 版  {tests} 个考试 {rows} 行"
"""落盘报数。"""
