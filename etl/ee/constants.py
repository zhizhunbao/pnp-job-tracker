"""
ee 域常量 —— 域词汇表(联邦 Express Entry:类别清单 / 抽选轮次 / 官方口径规则;
照 company 三件套样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/规则表)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
零字符串令:functions 里除字典键(K_ 词族)、空串、语法位外,一切字面量住这;
文案模板一律 *_TPL,官方原句一律 *_QUOTE(quote-anchored,禁转述)。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费:取文 / 落盘 / JSON 键词表 K_*)
# =========================================================================

TEXT_JOIN_SEP = " "
"""get_text 的单空格分隔(压平文本的统一口径;三段共用)。"""

COMMA = ","
"""千分位逗号(转数字前去掉;draws 的 int_or_none 与 rules 的 as_points 共用)。"""

INDENT_2 = 2
"""类别清单 / 抽选轮次两表的 JSON 缩进(raw 惯例 2)。"""

INDENT_1 = 1
"""CRS / 资格 / 语言换算三张大表的缩进(省体积,原值照搬)。"""

TAG_TABLE = "table"
"""表格标签名。"""

TAG_TR = "tr"
"""表行标签名。"""

K_SOURCE = "source"
"""表键:来源名。"""

K_URL = "url"
"""表/行键:出处地址。"""

K_FETCHED = "fetched"
"""表/行键:该页真正被取回那天(不是脚本跑的今天)。"""

K_LABEL = "label"
"""表/行键:人可读标签(类别中文名 / 规则一句话)。"""

K_NAME = "name"
"""行键:名称(抽选名 / 项目全名)。"""

K_NOTE = "note"
"""表键:口径注(消费端读得到的免责与语义说明)。"""


# =========================================================================
# 2. 类别抽选职业清单(build_ircc_ee_categories;httpx 直取,替代 crawl 浏览器版)
# =========================================================================

CAT_URL = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/"
           "express-entry/rounds-invitations/category-based-selection.html")
"""类别抽选官方页。canada.ca 该页 2026-07 实测 httpx 200 无 Akamai;DataTables 只是前端分页,
原始 HTML 表格行全量 → bs4 直接解析,无需浏览器。"""

OUT_CATEGORIES = paths.EE / "federal-categories.json"
"""段2 输出:raw/ee/federal-categories.json。产出与旧 etl/crawl/_fetch_ee_categories.py
完全同构:{source,url,fetched,categories:[{key,label,occupations:[{noc,teer,title}]}]}。"""

CAT_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
          "Chrome/120 Safari/537.36")
"""本段的伪装 UA(原脚本原值 Chrome/120)。⚠ 与 fetch.constants.BROWSER_UA(Chrome/131)
不是一份 —— 2026-08-30 批C 全溶是「行为逐字不变」的溶解批,抓取头不在本批变换范围内,
要不要并进 fetch 单一来源留给收口批判。"""

CAT_TIMEOUT_S = 30
"""类别页抓取超时。"""

CAT_MAP = (
    ("healthcare", "healthcare", "医疗社服"), ("science", "stem", "STEM"), ("trade", "trade", "技工"),
    ("education", "education", "教育"), ("transport", "transport", "运输"),
    ("physicians", "physicians", "医生"), ("senior managers", "senior-managers", "高管"),
    ("researchers", "researchers", "研究"), ("military", "military", "军职"),
)
"""类别英文标题关键词 → (短 key, 中文标签)。与旧 crawl 版 CAT_MAP 一致(join 键不变)。"""

CAT_HEAD_TAGS = ["h2", "h3", "h4"]
"""表格上方回溯的标题标签(类别名住这三档里)。"""

TAG_TD = "td"
"""数据格标签名(类别表只读 td)。"""

CAT_MIN_CELLS = 2
"""一行至少要有几格才当数据行(不足=表头/装饰行)。"""

NOC5_RE = re.compile(r"\d{5}")
"""五位 NOC 码(整格 fullmatch)。"""

NUM_1_5_RE = re.compile(r"\d{1,5}")
"""纯数字格(1~5 位;职业名取最长的**非**数字格)。"""

TEER_RE = re.compile(r"[0-5]")
"""单个 TEER 档格(0~5)。"""

K_KEY = "key"
"""类别行键:短 key(join 键)。"""

K_OCCUPATIONS = "occupations"
"""类别行键:职业清单。"""

K_NOC = "noc"
"""职业行键:五位 NOC 码。"""

K_TEER = "teer"
"""职业行键:TEER 档(解析不到=None,不猜)。"""

K_TITLE = "title"
"""职业行键:职业名。"""

K_CATEGORIES = "categories"
"""表键:类别清单。"""

CAT_SOURCE = "Express Entry category-based selection"
"""段2 表级来源名。"""

CAT_PRINT_EMPTY_TPL = "⚠ 解析为空,保留旧表 {out}(源站可能改版,需人工核查)"
"""失败安全:抓不到 / 解析出的类别为空 → 跳过写盘、保留旧表(源站改版时不丢数据)。
旧浏览器版保留作硬墙回退(源站若重新上 Akamai,把 ee 源 steps 换回去即可)。"""

CAT_PRINT_DONE_TPL = "✓ {out}  ({n} 类 · {total} 职业)"
"""段2 收尾报数。"""

CAT_PRINT_ROW_TPL = "  {n:>3}  {label}"
"""段2 收尾逐类别报数。"""


# =========================================================================
# 3. 抽选轮次(build_ircc_ee_draws;IRCC 开放 JSON,无 Akamai/无需抓页)
# =========================================================================

DRAWS_URL = "https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json"
"""IRCC 官方抽选轮次 JSON(httpx 直取)。"""

OUT_DRAWS = paths.EE / "draws.json"
"""段3 输出:raw/ee/draws.json 三块 ——
byCategory  每类别**最近一次**抽选 → 09 join 进 ee_categories(EE 节头「近期抽选」)
history     每类别**历次**抽选(#135 Frank「点开按时间线看每一轮」)→ 09 灌进 pnp_draws
            (province=FED,零新表)
recent      全类别混合最近 20 轮(参考)。"""

DRAWS_UA = "Mozilla/5.0"
"""段3 的最简 UA(原脚本原值;开放 JSON 端点不挑 UA)。"""

DRAWS_TIMEOUT_S = 30
"""抽选 JSON 抓取超时。"""

HIST_PER_CAT = 12
"""每类别保留轮次上限(展示够看趋势,不灌爆维度表)。"""

HIST_MONTHS = 24
"""同时限最近 24 个月(更早的轮次分数线已无参考意义)。"""

HIST_DAYS_PER_MONTH = 31
"""月→天的换算(cutoff = 今天 - HIST_MONTHS × 本值,原脚本原式)。"""

RECENT_N = 20
"""recent 块保留的混合轮次数。"""

DRAWS_CAT_MAP = (
    ("health", "healthcare"), ("stem", "stem"), ("science", "stem"), ("trade", "trade"),
    ("education", "education"), ("transport", "transport"), ("physician", "physicians"),
    ("senior manager", "senior-managers"), ("research", "researchers"), ("military", "military"),
    ("agricul", "agriculture"), ("french", "french"), ("canadian experience", "cec"),
    ("provincial nominee", "pnp"),
    ("federal skilled trades", "fst"), ("federal skilled", "fsw"), ("general", "general"),
)
"""drawName 关键词 → 类别 key。前 9 个与 _fetch_ee_categories 的 CAT_MAP 对齐
(能 join 进 ee_categories);其余(agriculture/french/cec/pnp/general 等)无 NOC 清单不 join,
仅留作 recent 参考。
⚠ E6-10:「Federal Skilled Trades」含「federal skilled」,必须排在 fsw 前面,
否则技工类被并进 FSW —— 本表顺序即语义,别按字母序整理。"""

K_ROUNDS = "rounds"
"""源 JSON 顶层键:轮次清单(已按 drawNumber 降序,最新在前)。"""

K_DRAW_NAME = "drawName"
"""源轮次键:抽选名(类别判据)。"""

K_DRAW_DATE = "drawDate"
"""源轮次键:抽选日。"""

K_DRAW_CRS = "drawCRS"
"""源轮次键:CRS 分数线。"""

K_DRAW_SIZE = "drawSize"
"""源轮次键:发出的 ITA 数。"""

K_DRAW_NUMBER = "drawNumber"
"""源轮次键:轮次号。"""

K_DATE = "date"
"""产出行键:抽选日。"""

K_CRS = "crs"
"""产出行键:CRS 分数线。"""

K_SIZE = "size"
"""产出行键:ITA 数。"""

K_NUMBER = "number"
"""recent 行键:轮次号(byCategory/history 行用源名 drawNumber,两块键名不同是既有契约)。"""

K_BY_CATEGORY = "byCategory"
"""表键:每类别最近一次抽选。"""

K_HISTORY = "history"
"""表键:每类别历次抽选。"""

K_RECENT = "recent"
"""表键:全类别混合最近 N 轮。"""

DRAWS_SOURCE = "Express Entry rounds of invitations"
"""段3 表级来源名。"""

DRAWS_PRINT_DONE_TPL = "✓ {out}  ({cats} 类别有最近抽选 / {hist} 条历史 / {rounds} 轮总计)"
"""段3 收尾报数。"""

DRAWS_PRINT_ROW_TPL = "  {key:16} CRS {crs} · {date} · {size} ITAs · 历史 {n} 轮"
"""段3 收尾逐类别报数。"""


# =========================================================================
# 4. 官方口径:CRS/FSW 计分 + 语言换算 + 资格规则(build_ircc_ee_rules;只读 crawl 缓存)
# =========================================================================

IN_CRAWL_EE = paths.CRAWL / "fed-ee"
"""段4 输入根:crawl 役产物(manifest.json + html_cache/)。
铁律「URL → 数据 → SQL」:先 grep `data/crawl/*/manifest.json` 确认 canada.ca 的 EE 区
从未被覆盖(2026-08-05 实测:只有 fed-pgwp / fed-rcip 两个联邦 slug)→ 在
`etl/crawl/discover_sources.py` 加 `fed-ee` 种子实爬(97 页)→ 本段只**读 crawl 缓存**
(crawl.functions.get_cached_page),不自己猜 URL、不重复发请求。"""

EE_URL_BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/"
               "immigrate-canada/express-entry/")
"""Express Entry 官方页前缀(本段各页 URL 由它拼)。"""

IN_URL_CRS = EE_URL_BASE + "check-score/crs-criteria.html"
"""CRS 计分表(A/B/C/D 四段 20 张表)。"""

IN_URL_CEC = EE_URL_BASE + "who-can-apply/canadian-experience-class.html"
"""CEC 资格页。"""

IN_URL_FSW = EE_URL_BASE + "who-can-apply/federal-skilled-workers.html"
"""FSW 资格页(含 67 分 selection factors)。"""

IN_URL_FST = EE_URL_BASE + "who-can-apply/federal-skilled-trades.html"
"""FST 资格页。"""

RCIP_URL_BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                 "immigrate-canada/rural-franco-pilots/")
"""RCIP/FCIP 两条社区试点的官方页前缀。
RCIP(Rural / Francophone Community Immigration Pilots)不是 Express Entry 项目,不挂在
EE_URL_BASE 前缀下,但门槛表同样落 province='FED'、同一份 fed-eligibility.json
(C5b-0,2026-08-05)。"""

IN_URL_RCIP_RURAL = RCIP_URL_BASE + "rural-immigration/eligibility/work-experience.html"
"""RCIP(Rural)工作经验页 —— 两条 pilot 的「Work experience」页文案逐字相同
(已用 fed-rcip crawl 缓存核对),Rural 页作为 quote 出处。"""

IN_URL_RCIP_FRANCO = RCIP_URL_BASE + "franco-immigration/eligibility/work-experience.html"
"""RCIP(Franco)工作经验页 —— 只做交叉核验(见 build_ircc_ee_rules 里的 missing_franco 检查),
不重复落两条一样的行。"""

IN_URL_RCIP_LANG = RCIP_URL_BASE + "rural-immigration/eligibility/language-test.html"
"""RCIP(Rural)语言门槛页(2026-08-14 L2-09 用例横测暴露:库里没有语言行 → 引擎把「没收录」
当成「不要求」,语言没考的人也看到「即可申请」)。Franco 试点语言规则不同(NCLC 5 一刀切,
纯法语),不共享这批行 —— 交叉核验只对经验行。"""

IN_URL_FCIP_ELIG = RCIP_URL_BASE + "franco-immigration/eligibility.html"
"""FCIP(法语社区试点)资格页。2026-08-15 立成独立通道(Frank「还有法语区,都拆成不同的
策略文件吧」)。**不与 RCIP 共享语言行**:官方 NCLC 5 一刀切、且是法语;经验页文案与 Rural 页
逐字相同,但落成 program='FCIP' 自己的行 —— 两条 pilot 的社区名单、名额、语言尺子都不是一回事。"""

IN_URL_FCIP_LANG = RCIP_URL_BASE + "franco-immigration/eligibility/language-test.html"
"""FCIP 语言门槛页。"""

IN_URL_LANG = EE_URL_BASE + "documents/language-test.html"
"""三个项目的最低 CLB/NCLC 门槛表 + T4–T26 成绩换算表。"""

IN_URL_ECA = EE_URL_BASE + "documents/education-assessment.html"
"""ECA 结果 → FSW 教育 selection factor 分。"""

OUT_CRS = paths.EE / "crs-grid.json"
"""段4 输出:CRS 计分窄表。"""

OUT_ELIG = paths.EE / "fed-eligibility.json"
"""段4 输出:资格规则 + FSW selection factors。"""

OUT_LANG = paths.EE / "language-grid.json"
"""段4 输出:语言成绩 ↔ CLB/NCLC 换算表。"""

SECTION_RE = re.compile(r"^([A-D])\.\s+(.+?)\s*$")
"""CRS 页的段标题「A. Core / human capital factors」→ (字母, 段名)。"""

QUOTE_CURLY_RIGHT = "’"
"""右弯单引号(归一成直引号再比对)。"""

QUOTE_CURLY_LEFT = "‘"
"""左弯单引号。"""

QUOTE_STRAIGHT = "'"
"""直单引号(归一目标)。"""

DQUOTE_CURLY_LEFT = "“"
"""左弯双引号。"""

DQUOTE_CURLY_RIGHT = "”"
"""右弯双引号。"""

DQUOTE_STRAIGHT = '"'
"""直双引号(归一目标)。"""

TAG_MAIN = "main"
"""正文容器标签名(缓存页只取 <main>)。"""

CELL_TAGS = ["th", "td"]
"""表格单元格标签(表头行与数据行同一把尺子)。"""

HEAD_TAGS_234 = ["h2", "h3", "h4"]
"""回溯标题链的标签(nearest_heading)。"""

HEAD_TAGS_23 = ["h2", "h3"]
"""CRS 段标题的标签(crs_sections 只认 h2/h3)。"""

TAG_H3 = "h3"
"""语言表上方的项目标题标签。"""

TAG_H4 = "h4"
"""语言表上方的考试标题标签。"""

GCDS_DATE_TAG = "gcds-date-modified"
"""canada.ca「Page details」的官方改版日期节点(GCDS web component,不是 <time>)。"""

POINTS_RE = re.compile(r"([\d,]+)")
"""整格纯数字(带千分位)→ 分数;非数字格(n/a、Not eligible to apply)不匹配。"""

BREAKDOWN_WORD = "breakdown"
"""标题里含这个词 = 逐档明细表(kind=detail)。"""

KIND_DETAIL = "detail"
"""窄表行 kind:逐档明细表。"""

KIND_SUMMARY = "summary"
"""窄表行 kind:各段封顶速览表。"""

K_SECTION = "section"
"""窄表行键:段字母。"""

K_SECTION_LABEL = "sectionLabel"
"""窄表行键:段名。"""

K_KIND = "kind"
"""窄表行键:summary / detail。"""

K_TABLE = "table"
"""窄表行键:表序号。"""

K_HEADING = "heading"
"""窄表行键:本表小标题。"""

K_FACTOR = "factor"
"""窄表/规则行键:因子(第一列表头 / 规则因子名)。"""

K_CRITERION = "criterion"
"""窄表行键:criterion(数据行第一格)。"""

K_COLUMN = "column"
"""窄表行/语言格键:列表头。"""

K_POINTS = "points"
"""窄表行键:官方原格数字(非数字格 = None)。"""

K_POINTS_TEXT = "pointsText"
"""窄表行键:原格文本(数字解析不出时的原文留痕)。"""

K_LETTER = "letter"
"""CRS 段键:段字母。"""

K_MAX_QUOTES = "maxQuotes"
"""CRS 段键:该段官方 Maximum 原句(不替官方求和)。"""

K_SECTIONS = "sections"
"""CRS 表键:四段速览。"""

K_ROWS = "rows"
"""表键:数据行(CRS 窄表 / 语言表行)。"""

K_PAGE_UPDATED = "pageUpdated"
"""表/项目键:官方页面的改版日期。"""

MAX_QUOTE_RE = re.compile(r"Maximum [\d,]+ points(?: total)?")
"""各段的官方 Maximum 原句(页面上没写的 CRS 总分 1200 不替官方求和)。"""

CRS_LETTERS = {"A", "B", "C", "D"}
"""CRS 页必须解析出的四段字母(缺一 = 页面改版)。"""

CRS_MIN_ROWS = 150
"""CRS 窄表行数防线(2026-08-05 实测 186 行,留裕量)。"""

CRS_SOURCE = "Express Entry: Comprehensive Ranking System (CRS) criteria"
"""CRS 表级来源名。"""

CRS_NOTE = ("窄表:一行 = 一个 criterion × 一个列表头(各表列数 2~5,不定宽)。points 为官方原格数字,"
            "非数字格(n/a、Not eligible to apply)points=None、原文留在 pointsText。"
            "kind=summary 是各段封顶速览表,detail 是逐档明细表。"
            "官方页面并未写出 CRS 总分上限,本表只收各段原文 Maximum 句(sections[].maxQuotes),不替官方求和。")
"""CRS 表级口径注。"""

CRS_PROBLEM_TPL = "✗ CRS 页结构变了(段={letters}, 行={n})—— 保留旧表,人工重核"
"""CRS 自校未过:保留旧表 + exit 1。"""

CRS_PRINT_DONE_TPL = "✓ CRS 计分表 {n} 行 / {sections} 段 → {out}"
"""段4 第 1 小步收尾报数。"""

PROGRAM_HEADINGS = {
    "Federal Skilled Worker Program": "FSW",
    "Federal Skilled Trades Program": "FST",
    "Canadian Experience Class": "CEC",
}
"""语言表上方的项目标题白名单 → 项目码(页面里的说明性 h3 不会误当 program)。"""

TEST_NAMES = {
    "CELPIP": "CELPIP-G",
    "IELTS": "IELTS General Training",
    "PTE Core": "PTE Core",
    "TEF Canada": "TEF Canada",
    "TCF Canada": "TCF Canada",
}
"""考试标题前缀 → 官方考试全名。"""

LANG_TABLE_START = 4
"""语言换算表从第几张表起(T4)。"""

LANG_TABLE_N = 23
"""语言换算表张数(T4–T26 共 23 张;对不上 = 保留旧表)。"""

BENCHMARK_HEADERS = {"CLB Level", "NCLC Level"}
"""语言表的档位列表头(二选一)。"""

BENCHMARK_CLB_PREFIX = "CLB"
"""档位列表头以此开头 = CLB 尺子,否则 NCLC。"""

BENCHMARK_CLB = "CLB"
"""benchmark 值:英语尺子。"""

BENCHMARK_NCLC = "NCLC"
"""benchmark 值:法语尺子。"""

NOC_TEER_HEADER = "NOC TEER"
"""语言表里的 TEER 列表头(有才取,没有留空)。"""

K_TABLE_NO = "tableNo"
"""语言表键:官方表号(T4–T26)。"""

K_PROGRAM = "program"
"""语言表/规则行/项目键:项目码。"""

K_TEST = "test"
"""语言表键:考试全名。"""

K_BENCHMARK = "benchmark"
"""语言表键:CLB 还是 NCLC。"""

K_HEADERS = "headers"
"""语言表键:原表头。"""

K_ROW_NO = "rowNo"
"""语言行键:行号。"""

K_LEVEL_TEXT = "levelText"
"""语言行键:档位原文。"""

K_NOC_TEER = "nocTeer"
"""语言行键:TEER 列原文(没有该列 = 空串)。"""

K_CELLS = "cells"
"""语言行键:各成绩列的格。"""

K_VALUE_TEXT = "valueText"
"""语言格/规则行键:官方原文(分数区间只存原文,不在 raw 层擅自补边界)。"""

K_TABLES = "tables"
"""语言表文件键:23 张表。"""

LANG_PROBLEM_COUNT_TPL = "✗ 语言换算表预期 T4–T26 共 23 张,实际 {n} 张——保留旧表"
"""语言表张数自校未过。"""

LANG_PROBLEM_COLS_TPL = "✗ 语言表 T{no} 列数不齐——保留旧表"
"""语言表列数自校未过。"""

LANG_PROBLEM_CTX_TPL = ("✗ 语言表 T{no} 上下文识别失败"
                        "(program={program!r}, test={test!r}, benchmark={benchmark!r})——保留旧表")
"""语言表上下文(项目/考试/档位列)识别失败。"""

LANG_SOURCE = "Express Entry: Language test results"
"""语言表级来源名。"""

LANG_NOTE = ("language-test.html 的 T4–T26 共 23 张官方表。原始分数区间只存 valueText,"
             "不在 raw 层擅自补边界;表号、行号、原表头与项目上下文全部保留。"
             "该数据不是 CRS/FSW points,09 单独产出 ee_language_grid,禁止参与分数求和。")
"""语言表级口径注。"""

LANG_PRINT_DONE_TPL = "✓ 语言换算 {tables} 张表 / {levels} 个档位 → {out}"
"""段4 第 3 小步收尾报数。"""

ECA_EXPECTED = [
    "Assessment result (Canadian equivalency)",
    "Level of education for Express Entry profile",
    "Federal Skilled Workers Program selection factor points",
]
"""ECA 报告解读页上 FSW 教育表的表头三列(逐字比对定位,不靠表序号)。
FSW 页教育段只给去 ECA 页的链接,真正的 25 分档在 ECA 报告解读页第三张官方表。
URL 来自 fed-ee manifest 的真实命中,不是凭印象拼接;每个 ECA result 别名都保留,
供报告原文精确匹配。"""

ECA_MIN_ROWS = 100
"""ECA 教育表行数防线。"""

ECA_PROBLEM_NO_TABLE = "✗ ECA 页找不到 FSW 教育 selection factor 官方表——保留旧表"
"""ECA 表定位失败。"""

ECA_PROBLEM_ROWS_TPL = "✗ ECA 页 FSW 教育表只解析出 {n} 行——保留旧表"
"""ECA 表行数不足。"""

ECA_FACTOR = "Education"
"""ECA 行的 factor 固定值 —— 保持可被消费端稳定筛出的 Education。
这张表同时有 ECA 原结果与 EE profile 档位;现有窄表无额外列:
profile 档位放 heading、ECA 原结果放 criterion。"""

FSW_SECTION_LETTER = "FSW"
"""FSW selection factors 窄表行的 section 固定值(section 恒 FSW)。"""

FSW_SECTION_LABEL = "Selection factors"
"""FSW selection factors 窄表行的 sectionLabel 固定值。"""

FSW_SEL_MIN_ROWS = 30
"""FSW selection factors 表行数防线。"""

FSW_SEL_PROBLEM_TPL = "✗ FSW selection factors 表只解析出 {n} 行 —— 页面结构变了,保留旧表"
"""FSW selection factors 自校未过。"""

PAGE_CEC = "cec"
"""页键:CEC 资格页。"""

PAGE_FSW = "fsw"
"""页键:FSW 资格页。"""

PAGE_FST = "fst"
"""页键:FST 资格页。"""

PAGE_LANG = "lang"
"""页键:语言门槛页。"""

PAGE_RCIP_RURAL = "rcip_rural"
"""页键:RCIP(Rural)工作经验页。"""

PAGE_RCIP_FRANCO = "rcip_franco"
"""页键:RCIP(Franco)工作经验页(交叉核验用)。"""

PAGE_RCIP_LANG = "rcip_lang"
"""页键:RCIP 语言门槛页。"""

PAGE_FCIP_ELIG = "fcip_elig"
"""页键:FCIP 资格页。"""

PAGE_FCIP_LANG = "fcip_lang"
"""页键:FCIP 语言门槛页。"""

RULE_PAGES = (
    (PAGE_CEC, IN_URL_CEC), (PAGE_FSW, IN_URL_FSW), (PAGE_FST, IN_URL_FST), (PAGE_LANG, IN_URL_LANG),
    (PAGE_RCIP_RURAL, IN_URL_RCIP_RURAL), (PAGE_RCIP_FRANCO, IN_URL_RCIP_FRANCO),
    (PAGE_RCIP_LANG, IN_URL_RCIP_LANG),
    (PAGE_FCIP_ELIG, IN_URL_FCIP_ELIG), (PAGE_FCIP_LANG, IN_URL_FCIP_LANG),
)
"""规则核验要载入的页(页键 → URL;顺序即原脚本的加载序)。"""

IN_URL_PRINTED = (IN_URL_CRS, IN_URL_CEC, IN_URL_FSW, IN_URL_FST, IN_URL_LANG, IN_URL_ECA,
                  IN_URL_RCIP_RURAL, IN_URL_RCIP_FRANCO)
"""开工时逐行打印的输入页清单(原脚本原序原样)。"""

PROGRAM_RCIP = "RCIP"
"""项目码:两条社区试点(共享经验行)。"""

SUBJECT_APPLICANT = "applicant"
"""规则行的 subject 固定值(本段规则全是申请人侧)。"""

PROVINCE_FED = "FED"
"""表级 province:联邦源统一 FED(同 raw/ircc/pgwp_rules.json、fees.json)—— 09 的
build_pnp_requirements 从这里取,少了它 23 条会静默落成 province=''(引擎按省挑行永远挑不到)。
program 不在表级:这一个文件装四个项目(含 RCIP),逐行写在 requirements[].program 上。"""

K_PROVINCE = "province"
"""表键:省码(联邦源恒 FED)。"""

K_STREAM = "stream"
"""规则行键:通道/档位。"""

K_SUBJECT = "subject"
"""规则行键:约束对象(applicant/employer)。"""

K_OP = "op"
"""规则行键:比较算子。"""

K_VALUE = "value"
"""规则行键:阈值。"""

K_UNIT = "unit"
"""规则行键:单位。"""

K_BASIS = "basis"
"""规则行键:字段语义(人读)。"""

K_QUOTE = "quote"
"""RULES 表内键:官方原句(核验对象;落盘时改名 valueText)。"""

K_PAGE = "page"
"""RULES 表内键:该引用出自哪一页。"""

K_CODE = "code"
"""项目行键:项目码。"""

K_PROGRAMS = "programs"
"""表键:本文件覆盖的项目清单。"""

K_REQUIREMENTS = "requirements"
"""表键:门槛规则行。"""

K_SELECTION_FACTORS = "selectionFactors"
"""表键:FSW 67 分制官方表(与 CRS 排名分是两套分)。"""

ELIG_PROGRAMS = (
    ("CEC", "Canadian Experience Class", PAGE_CEC),
    ("FSW", "Federal Skilled Worker Program", PAGE_FSW),
    ("FST", "Federal Skilled Trades Program", PAGE_FST),
    ("RCIP", "Rural and Francophone Community Immigration Pilots", PAGE_RCIP_RURAL),
    ("FCIP", "Francophone Community Immigration Pilot", PAGE_FCIP_ELIG),
)
"""programs 块:(项目码, 项目全名, 出处页键)。"""

ELIG_SOURCE = ("Express Entry: Who can apply (CEC / FSW / FST) + Rural and Francophone Community "
               "Immigration Pilots (RCIP): Work experience")
"""资格表级来源名。"""

ELIG_NOTE = ("quote-anchored:valueText=官方原文,本脚本每轮验证其仍逐字在页面上;字段语义见 basis。"
             "requirements 形状对齐 raw/ircc/pgwp_rules.json(09 IN_REQ_TABLES 可直接消费)。"
             "selectionFactors = FSW 67 分制的官方表格(与 CRS 排名分是两套分,官方明确写明不同)。"
             "其中教育档来自 fed-ee 缓存命中的 ECA 报告解读页;criterion=ECA assessment result、"
             "heading=EE profile 教育档、points=FSW 教育分(最高 25),没有把 CRS 教育分混入。"
             "RCIP(program=RCIP)不是 Express Entry 项目、不参与 CRS,只是同表落 province='FED' 的"
             "经验门槛;来源是 Rural/Franco 两条 pilot 各自的 Work experience 官方页(文案逐字相同,"
             "已交叉核验),不是 fed-ee 那 97 页种子(RCIP 走 fed-rcip crawl slug)。")
"""资格表级口径注。"""

ELIG_PRINT_DONE_TPL = ("✓ 资格规则 {reqs} 条(引用全部核验通过)+ FSW selection factors {sel} 行"
                       "(其中 ECA 教育 {eca} 行) → {out}")
"""段4 第 2 小步收尾报数。"""

CACHE_MISS_TPL = "✗ crawl 缓存里没有这一页(先跑 etl/crawl/discover_sources.py fed-ee):{url}"
"""只走 crawl 缓存:没爬到就报错,不偷偷 httpx 补(那正是「猜 URL」的老病根)。"""

PRINT_IN_TPL = "IN  : {path}  (crawl 缓存,不重复发请求)"
"""段4 开工报输入根。"""

PRINT_IN_URL_TPL = "      {url}"
"""段4 开工逐行报输入页。"""

PRINT_OUT_TPL = "OUT : {path}"
"""段4 开工报输出。"""

QUOTE_MISSING_TPL = "✗ {n}/{total} 条官方引用在页面上消失(改版?)—— 保留旧表,人工重核:"
"""引用核验未过的抬头。"""

QUOTE_MISSING_ROW_TPL = "✗   [{program}/{factor}] {quote}"
"""引用核验未过的逐条明细(quote 截前 90 字)。"""

QUOTE_CLIP = 90
"""未过引用在日志里的截断长度。"""

FRANCO_MISSING_HEADER = ("✗ RCIP 引用在 Franco pilot 页上对不上(Rural/Franco 文案已经不一致?)"
                         "—— 保留旧表,人工重核:")
"""RCIP 两条 pilot 共享**经验**文案:Rural 页(上面已核验)之外,交叉核验 Franco 页也逐字命中,
否则「两条 pilot 都是 1,560 小时」这个结论只验证了一半就写进了库。
语言行不进这道闸:Franco 是 NCLC 5 一刀切(纯法语),与 Rural 的 TEER 分档不同源。"""

RULES = (
    {"program": "CEC", "page": "cec", "factor": "workTeer", "op": "in", "value": "0,1,2,3", "unit": "TEER",
     "label": "CEC: skilled work experience must be TEER 0/1/2/3",
     "quote": "be in 1 or more of these NOC categories: training, education, experience and responsibilities (TEER) 0, 1, 2, or 3"},
    {"program": "CEC", "page": "cec", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=3;minYears=1;hoursPerWeek=30",
     "label": "CEC: 1 year (1,560 hours) of Canadian skilled work in the 3 years before applying",
     "quote": "be at least 1 year of work or 1,560 hours total (30 hours per week) in the 3 years before you apply"},
    {"program": "CEC", "page": "cec", "factor": "workLocation", "op": "rule", "value": "canada", "unit": "",
     "label": "CEC: experience must be gained in Canada while authorized to work",
     "quote": "be gained by working in Canada while authorized to work under temporary resident status"},
    {"program": "CEC", "page": "cec", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "CEC: self-employment and full-time-student work experience do not count",
     "quote": "Self-employment and work experience gained while you were a full-time student"},
    {"program": "CEC", "page": "cec", "factor": "education", "op": "rule", "value": "none", "unit": "",
     "label": "CEC: no education requirement",
     "quote": "There is no education requirement for the Canadian Experience Class"},
    {"program": "CEC", "page": "cec", "factor": "residence", "op": "rule", "value": "outside-QC", "unit": "",
     "label": "CEC: must plan to live outside Quebec",
     "quote": "You must plan to live outside the province of Quebec"},
    {"program": "CEC", "page": "lang", "factor": "language", "stream": "teer-0-1", "op": ">=", "value": 7, "unit": "CLB",
     "label": "CEC (TEER 0 or 1): CLB/NCLC 7 in all 4 abilities",
     "quote": "TEER 0 or 1 CLB 7 NCLC 7"},
    {"program": "CEC", "page": "lang", "factor": "language", "stream": "teer-2-3", "op": ">=", "value": 5, "unit": "CLB",
     "label": "CEC (TEER 2 or 3): CLB/NCLC 5 in all 4 abilities",
     "quote": "TEER 2 or 3 CLB 5 NCLC 5"},

    {"program": "FSW", "page": "fsw", "factor": "workTeer", "op": "in", "value": "0,1,2,3", "unit": "TEER",
     "label": "FSW: skilled work experience must be TEER 0/1/2/3",
     "quote": "be in 1 of these TEER categories: 0, 1, 2, or 3"},
    {"program": "FSW", "page": "fsw", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "minYears=1;continuous=true;hoursPerWeek=30",
     "label": "FSW: 1 year of continuous work (1,560 hours)",
     "quote": "be at least 1 year of continuous work or 1,560 hours total (30 hours per week)"},
    {"program": "FSW", "page": "fsw", "factor": "workRecency", "op": "<=", "value": 10, "unit": "years",
     "label": "FSW: experience obtained within the last 10 years, in Canada or abroad",
     "quote": "have been obtained within the last 10 years, in Canada or abroad"},
    {"program": "FSW", "page": "fsw", "factor": "passMark", "op": ">=", "value": 67, "unit": "points",
     "basis": "outOf=100;separateFromCRS=true",
     "label": "FSW: 67 of 100 selection-factor points to qualify",
     "quote": "If you score 67 points or higher , you may qualify for the Federal Skilled Worker Program"},
    {"program": "FSW", "page": "fsw", "factor": "education", "op": "rule", "value": "eca-required", "unit": "",
     "label": "FSW: foreign education needs a completed credential + ECA",
     "quote": "a completed educational credential and an Educational Credential Assessment for immigration purposes"},
    {"program": "FSW", "page": "fsw", "factor": "proofOfFunds", "op": "rule", "value": "required-unless-jobofer", "unit": "",
     "basis": "waivedIf=legallyWorkInCanada+validJobOffer",
     "label": "FSW: proof of funds required unless legally able to work in Canada with a valid job offer",
     "quote": "You don't need proof of funds if you: are currently able to legally work in Canada, and have a valid job offer from an employer in Canada"},
    {"program": "FSW", "page": "fsw", "factor": "residence", "op": "rule", "value": "outside-QC", "unit": "",
     "label": "FSW: must plan to live outside Quebec",
     "quote": "You must plan to live outside the province of Quebec"},
    {"program": "FSW", "page": "lang", "factor": "language", "stream": "first-official", "op": ">=", "value": 7, "unit": "CLB",
     "label": "FSW: CLB 7 (NCLC 7) minimum in all 4 abilities, first official language",
     "quote": "Language Minimum level for all 4 abilities English CLB 7 French NCLC7"},

    {"program": "FST", "page": "fst", "factor": "workNocGroups", "op": "in",
     "value": "72(-726),73,82,83,92,93(-932),6320,62200", "unit": "NOC",
     "label": "FST: experience must be in the listed NOC major/minor/unit groups",
     "quote": "Major Groups 72 (excluding Sub-Major Group 726), 73 , 82 , 83 , 92 , or 93 (excluding Sub-Major Group 932) Minor Group 6320 Unit Group 62200"},
    {"program": "FST", "page": "fst", "factor": "workHours", "op": ">=", "value": 3120, "unit": "hours",
     "basis": "windowYears=5;minYears=2",
     "label": "FST: 2 years (3,120 hours) of full-time skilled-trade work in the 5 years before applying",
     "quote": "be at least 2 years of full-time work experience (or 3,120 hours total) in a skilled trade within the 5 years before you apply"},
    {"program": "FST", "page": "fst", "factor": "jobOfferOrCertificate", "op": "rule", "value": "required", "unit": "",
     "label": "FST: needs a >=1-year full-time job offer OR a Canadian certificate of qualification",
     "quote": "a valid job offer of full-time employment for a total period of at least 1 year, or a certificate of qualification in your skilled trade issued by a Canadian provincial, territorial or federal authority"},
    {"program": "FST", "page": "fst", "factor": "education", "op": "rule", "value": "none", "unit": "",
     "label": "FST: no education requirement",
     "quote": "There is no education requirement for the Federal Skilled Trades Program"},
    {"program": "FST", "page": "fst", "factor": "residence", "op": "rule", "value": "outside-QC", "unit": "",
     "label": "FST: must plan to live outside Quebec",
     "quote": "You must plan to live outside the province of Quebec"},
    {"program": "FST", "page": "lang", "factor": "language", "stream": "speaking-listening", "op": ">=", "value": 5, "unit": "CLB",
     "label": "FST: CLB/NCLC 5 for speaking and listening",
     "quote": "English Speaking and listening CLB 5"},
    {"program": "FST", "page": "lang", "factor": "language", "stream": "reading-writing", "op": ">=", "value": 4, "unit": "CLB",
     "label": "FST: CLB/NCLC 4 for reading and writing",
     "quote": "English Reading and writing CLB 4"},

    {"program": "RCIP", "page": "rcip_rural", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=3;minYears=1",
     "label": "RCIP: 1 year (1,560 hours) of related work experience in the past 3 years",
     "quote": "you need at least 1 year (1,560 hours) of related work experience in the past 3 years"},
    {"program": "RCIP", "page": "rcip_rural", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "RCIP: self-employed work does not count toward the experience requirement",
     "quote": "not be from a self-employed job"},
    {"program": "RCIP", "page": "rcip_lang", "factor": "language", "stream": "teer-0-1", "op": ">=", "value": 6, "unit": "CLB",
     "label": "RCIP: TEER 0 or 1 job offer needs CLB 6",
     "quote": "TEER 0 or 1: CLB 6"},
    {"program": "RCIP", "page": "rcip_lang", "factor": "language", "stream": "teer-2-3", "op": ">=", "value": 5, "unit": "CLB",
     "label": "RCIP: TEER 2 or 3 job offer needs CLB 5",
     "quote": "TEER 2 or 3: CLB 5"},
    {"program": "RCIP", "page": "rcip_lang", "factor": "language", "stream": "teer-4-5", "op": ">=", "value": 4, "unit": "CLB",
     "label": "RCIP: TEER 4 or 5 job offer needs CLB 4",
     "quote": "TEER 4 or 5: CLB 4"},

    {"program": "FCIP", "page": "fcip_elig", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=3;minYears=1",
     "label": "FCIP: 1 year (1,560 hours) of related work experience in the past 3 years",
     "quote": "have at least 1 year (1,560 hours) of related work experience in the past 3 years"},
    {"program": "FCIP", "page": "fcip_elig", "factor": "offerDesignatedEmployer", "op": "rule", "value": "required", "unit": "",
     "label": "FCIP: job offer must come from a designated employer in the community",
     "quote": "have a valid job offer from a designated employer in the community"},
    {"program": "FCIP", "page": "fcip_lang", "factor": "language", "op": ">=", "value": 5, "unit": "NCLC",
     "label": "FCIP: NCLC 5 in all 4 abilities (French)",
     "quote": "You need a minimum score of NCLC 5 in all 4 abilities to apply for the Francophone Community Immigration Pilot (FCIP)."},
)
"""资格规则:人从官方原文抄的结构化行,机器只管「原文没变」(照 build_pgwp)。
page: cec/fsw/fst/lang/rcip_rural/rcip_lang/fcip_elig/fcip_lang · quote 必须逐字(归一化后)
出现在该页上,否则整表不更新。缺 stream/basis 的行落盘时补空串(原脚本 `.get(...,"")` 同义)。

分组沿革(原表内分隔注释 2026-08-30 批C 逐字折进本 docstring —— 方言律「注释只许 docstring」):
  ---- Canadian Experience Class ----(前 8 条)
  ---- Federal Skilled Worker ----(接着 8 条)
  ---- Federal Skilled Trades ----(接着 7 条)
  ---- Rural and Francophone Community Immigration Pilots (RCIP) ----(接着 5 条)
    C5b-0:引擎缺的工作经验门槛行。Rural/Franco 两条 pilot 的 Work experience 页文案逐字相同
    (fed-rcip crawl 缓存 2025-08-13 版核对过),quote 出自 Rural 页,入口函数里另外核验 Franco 页同款。
    RCIP 语言门槛按 offer 的 TEER 分档(2026-08-14 补;stream=teer-a-b 闭区间,引擎 fedLangApplies 消费)。
  ---- Francophone Community Immigration Pilot (FCIP) ----(末 3 条)
    2026-08-15:FCIP 立成第 14 条通道,门槛行**自己一份**(先前 program='FCIP' 一行都没有,
    判定层只能如实落「本站未收录」)。语言是它与 RCIP 最大的区别:NCLC 5 一刀切、且是**法语**。"""
