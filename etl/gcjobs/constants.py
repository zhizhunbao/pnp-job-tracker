"""
gcjobs 域常量 —— 域词汇表(会话式搜索分页枚举 → 岗位页抓取 → 字段解析 → postings 仓;
照 careerbeacon 三件套样张,段横幅三行框 + N. 编号,与 functions.py / scheme.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役。
零字符串令:functions 里除空串与语法位外,一切字面量住这;JSON/行键一律 K_ 词族、
岗位页字段标签一律 F_ 词族、文案模板一律 *_TPL。

@author Frank
@time 2026-09-13
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(四段共用:crawl slug、raw/processed 路径、编码、站址)
# =========================================================================

SLUG_CRAWL = "board-gcjobs"
"""crawl 层目录名(data/crawl/board-gcjobs/):调研期(2026-09-06)探过一页壳的 slug,立域沿用。"""

OUT_ROWS = paths.RAW_GCJOBS / "rows.json"
"""搜索分页枚举产物:帖号 → 列表行(标题 / 机构 / 地点 / 语言要求 / 薪资 / 截止;当前态,只收本轮在列的帖)。"""

IN_ROWS = OUT_ROWS
"""岗位页抓取 / 解析 / 建仓三段都读这份行表。"""

OUT_JOBS = paths.RAW_GCJOBS / "jobs.json"
"""岗位页解析产物:帖号 → JobFact 字典(增量累积)。"""

IN_JOBS = OUT_JOBS
"""建仓段读它;解析段读它做增量(已解析的帖号不重解)。"""

OUT_POSTINGS = paths.PROCESSED_GCJOBS / "postings.json"
"""归一后的 postings 仓(与 Job Bank 仓同键;mart 用 to_jb_job_fields 同一把尺子汇装)。"""

ENC_UTF8 = "utf-8"
"""全部读写的统一编码。"""

JSON_INDENT = 1
"""落盘缩进(照 paths 说明的大表惯例用 1)。"""

CLIENT_TIMEOUT_S = 60.0
"""httpx 单请求超时(壳页 150KB,服务端慢)。"""

SPACE = " "
"""单空格(剥标签后的替身与折空白的目标)。"""

ERRORS_REPLACE = "replace"
"""读缓存原文的解码策略(坏字节不炸整页)。"""

SITE_BASE = "https://emploisfp-psjobs.cfp-psc.gc.ca"
"""站根。"""

SEARCH_PATH = "/psrs-srfp/applicant/page2440"
"""公开岗位搜索页(壳 + 正文两拉)。"""

POSTER_PATH = "/psrs-srfp/applicant/page1800"
"""岗位页(壳 + 正文两拉)。"""

SESSION_PATH_TPL = "{base}{path};jsessionid={sid}"
"""会话绑定的路径写法(站内脚本 getUrlWithSession 的形:会话 id 嵌在路径里,不是查询串)。"""

SID_RE = re.compile(r"jsessionid=([A-F0-9]+)")
"""壳页里的会话 id(首个即当前会话)。"""

HDR_ACCEPT_LANGUAGE = "Accept-Language"
"""语言头名。"""

ACCEPT_LANGUAGE = "en-CA,en;q=0.9"
"""只要英文版(toggleLanguage=en 之外再钉一道)。"""

HDR_REQUESTED_WITH = "X-Requested-With"
"""页内脚本拉正文时带的头(照抄,服务端按它判 ajax)。"""

XHR = "XMLHttpRequest"
"""X-Requested-With 的值。"""

# =========================================================================
# 2. 搜索分页枚举(壳 → 会话 id → 首页正文 → 逐页翻 → 列表行)
# =========================================================================

SHELL_QS = "?fromMenu=true&toggleLanguage=en"
"""搜索壳页的查询串(GET 一次拿 JSESSIONID 与会话路径)。"""

FIRST_PAGE_QS = "?fromMenu=true&toggleLanguage=en&isSecondPartOfPage=1&isInitialNetworkCheck=1"
"""搜索首页正文(页内脚本 setJobSearchResults 的形:同 URL + isSecondPartOfPage=1,首拉再带 isInitialNetworkCheck=1)。"""

PAGE_QS_TPL = "?requestedPage={n}&fromPage={prev}&tab=1&log=false&isSecondPartOfPage=1"
"""翻到第 n 页并直接要正文(2026-09-13 实测:翻页参数与正文标分两次发拿到的还是上一页,合一次发才对)。"""

PAGES_RE = re.compile(r"of (\d+) \[")
"""正文里的总页数(「Page 1 … of 20 [Next / Last]」)。"""

PAGE_ONE = 1
"""首页页号。"""

ROW_RE = re.compile(r"<li class=\"searchResult\">(.*?)</li>", re.S)
"""列表里的一帖。"""

ROW_LINK_RE = re.compile(r"poster=(\d+)\"[^>]*>(.*?)</a>", re.S)
"""帖内标题链:组 1 帖号,组 2 标题 HTML。"""

ROW_CELL_RE = re.compile(r"<div class=\"tableCell\">(.*?)</div>", re.S)
"""帖内两格:格 1 = 截止 / 机构 / 地点(<br> 分行),格 2 = 语言要求 / 薪资(<br> 分行)。"""

BR_RE = re.compile(r"<br\s*/?>")
"""格内分行。"""

LINES_PER_CELL = 3
"""一格最多用到几行(格 1:截止 / 机构 / 地点;格 2:语言 / 薪资),不足补空串。"""

CLOSING_PREFIX = "Closing date:"
"""格 1 首行的前缀(剥掉留日期)。"""

LIST_SLEEP_S = 0.5
"""列表页逐页间隔。"""

PRINT_PAGE_TPL = "  第 {n}/{last} 页,累计 {rows} 帖"
"""翻页心跳。"""

PRINT_ROWS_DONE_TPL = "[OK] 枚举 {ids} 帖({pages} 页)→ {out}"
"""枚举收尾。"""

ERR_NO_SESSION = "搜索壳页里没找到 jsessionid(站改版?)"
"""拿不到会话 id 时抛出的话。"""

# =========================================================================
# 3. 岗位页抓取(未缓存的帖号 → 壳 + 正文 → crawl 层,每轮封顶)
# =========================================================================

POSTER_URL_TPL = "{base}{path}?poster={pid}"
"""岗位页的公开地址(crawl 层键 + 仓里的 url;不带会话)。"""

POSTER_SHELL_QS_TPL = "?toggleLanguage=en&poster={pid}"
"""岗位壳页查询串(GET 一次让会话记住当前帖)。"""

POSTER_PART_QS_TPL = "?toggleLanguage=en&poster={pid}&isSecondPartOfPage=1"
"""岗位正文查询串(会话路径 + 正文标)。"""

DETAIL_MARK_INTERNAL = "Reference number"
"""站内全文帖的判词。"""

DETAIL_MARK_EXTERNAL = "You will leave"
"""站外跳转帖的判词(页上只给雇主自家站的外链)。"""

DETAIL_SLEEP_S = 0.4
"""逐帖间隔(两次请求一帖,自律档)。"""

DETAIL_TICK = 50
"""心跳间隔(每 N 帖报一行)。"""

FLUSH_EVERY = 50
"""每 N 帖把攒下的原文批量落 crawl 层一次。"""

RATE_FLOOR_S = 0.001
"""速率分母下限(防首帖除零)。"""

PERCENT = 100
"""百分比换算。"""

PRINT_DETAIL_HEAD_TPL = "[details] 待抓 {todo} / 在列 {total}(本轮上限 {cap},已缓存 {have})"
"""抓取起手。"""

PRINT_DETAIL_TICK_TPL = "  [{done}/{todo}] {pct}%  {rate:.1f} 帖/秒  {pid}"
"""抓取心跳。"""

PRINT_DETAIL_BAD_TPL = "  ✗ {pid}:正文既无站内判词也无站外判词,跳过"
"""单帖失败留痕。"""

PRINT_DETAIL_DONE_TPL = "[OK] 岗位页 {done} 张入 crawl/{slug}(失败 {failed},已缓存跳过 {skipped})"
"""抓取收尾。"""

# =========================================================================
# 4. 岗位页解析(缓存原文 → 标题 / 机构 / 字段格 / 各节 → raw jobs.json)
# =========================================================================

TITLE_RE = re.compile(r"<h1>\s*<span[^>]*>(.*?)</span>", re.S)
"""岗位标题。"""

ORG_RE = re.compile(r"<h2 class=\"pst-h2\">(.*?)</h2>", re.S)
"""机构行(「Transport Canada - National Airport Operations」:机构 - 部门)。"""

ORG_SEP = " - "
"""机构与部门的分隔。"""

CLOSING_RE = re.compile(r"Closing date:\s*(.*?)</h3>", re.S)
"""截止行(「September 14, 2026 - 23:59, Pacific Time」)。"""

CLOSING_CUT = " - "
"""截止行日期与时刻的分隔(只留日期)。"""

CLOSING_FMTS = ["%B %d, %Y", "%Y-%m-%d"]
"""截止日的可能写法(岗位页英文全月名;列表行 ISO)。"""

FIELD_RE = re.compile(r"<b>([^<]+)</b><br>\s*(.*?)</div>", re.S)
"""岗位页左栏的字段格:<b>标签</b><br> 值。"""

F_REFERENCE = "Reference number"
"""参考编号。"""

F_PROCESS = "Selection process number"
"""甄选流程编号。"""

F_LOCATION = "Location"
"""地点(「Wabush (Newfoundland and Labrador)」;多地点逗号连;「Various Locations」)。"""

F_SALARY = "Salary"
"""薪资(「$96,235 to $104,044」年薪;「$17.75 to $38.38 per hour」时薪;尾接备注)。"""

F_LEVEL = "Level"
"""职级(PM-05 一类)。"""

F_WHO = "Who can apply"
"""谁能投(「Persons residing in Canada, and Canadian citizens and Permanent residents abroad.」)。"""

F_TENURE = "Employment tenure"
"""雇佣期(学生岗才有,如「This is a student position of 37 hours per week …」)。"""

SECTION_START = "id=\"aboutPosition\""
"""正文各节起点(About the position)。"""

SECTION_ENDS = ["id=\"ourCommitment\"", "id=\"howToApply\"", "id=\"hiringOrgContact\""]
"""正文截止点(按先出现的用;承诺 / 投递方式 / 联系人不进描述)。"""

EXTERNAL_LINK_RE = re.compile(r"href=\"(https?://[^\"]+)\"")
"""站外跳转帖的外链(页上第一条 http 链)。"""

LOC_RE = re.compile(r"^(.*?)\s*\((.*?)\)\s*$")
"""「City (Province)」拆城与省名。"""

LOC_SEP = ","
"""多地点的分隔(取第一处)。"""

VARIOUS_MARK = "various"
"""「Various Locations」判词(小写含即多地不定,城省留空)。"""

PROV_CODE_OF_NAME = {
    "Alberta": "AB",
    "British Columbia": "BC",
    "Colombie-Britannique": "BC",
    "Manitoba": "MB",
    "New Brunswick": "NB",
    "Nouveau-Brunswick": "NB",
    "Newfoundland and Labrador": "NL",
    "Terre-Neuve-et-Labrador": "NL",
    "Nova Scotia": "NS",
    "Nouvelle-Écosse": "NS",
    "Northwest Territories": "NT",
    "Territoires du Nord-Ouest": "NT",
    "Nunavut": "NU",
    "Ontario": "ON",
    "Prince Edward Island": "PE",
    "Île-du-Prince-Édouard": "PE",
    "Quebec": "QC",
    "Québec": "QC",
    "Saskatchewan": "SK",
    "Yukon": "YT",
}
"""省名(英法两写)→ 省码;不在表里(如「National Capital Region」)留空省。"""

TAG_RE = re.compile(r"<[^>]+>")
"""HTML → 纯文本:剥标签。"""

SCRIPT_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S)
"""脚本 / 样式块整段剥掉。"""

BLOCK_END_RE = re.compile(r"</(?:p|div|li|h[1-6]|section)>|<br\s*/?>")
"""块级尾巴 → 换行(描述保留段落感)。"""

WS_RE = re.compile(r"[ \t\r\xa0]+")
"""行内连续空白折一个。"""

NL_RE = re.compile(r"\n\s*\n+")
"""连续空行折一个。"""

NEWLINE = "\n"
"""换行。"""

PRINT_PARSE_DONE_TPL = "[OK] 解析 {parsed} 张(跳过已解析 {skipped},无缓存 {missing})→ {out}"
"""解析收尾。"""

# =========================================================================
# 5. postings 仓(raw 事实 → Job Bank 仓同形的行;当前态)
# =========================================================================

K_POSTING_ID = "posting_id"
"""帖号(mart externalId 的料)。"""

K_TITLE = "title"
"""标题。"""

K_TITLE_ORIG = "title_orig"
"""原标题(三板同形保留;本板英文,恒空串)。"""

K_EMPLOYER = "employer"
"""雇主名(机构)。"""

K_CITY = "city"
"""城市。"""

K_PROVINCE = "province"
"""省码。"""

K_SALARY = "salary"
"""薪资原文(Job Bank 写法「$96,235.00 to $104,044.00 annually」;抽不出留空串)。"""

K_DATE = "date"
"""发布日(ISO;站上不给发布日,取本站首见日)。"""

K_SOURCE = "source"
"""来源板名。"""

K_DIRECT = "direct"
"""是否雇主直招帖(联邦机构自发,恒 True)。"""

K_URL = "url"
"""申请落点(站内帖 = 公开岗位页;站外帖 = 雇主自家站外链)。"""

K_ADDRESS = "address"
"""地址文本(地点原文,多地点全留)。"""

K_NOC = "noc"
"""官方 NOC(站上没有,恒空串 → mart 按标题分类)。"""

K_LAST_SEEN = "last_seen"
"""本轮建仓时刻(ISO Z)。"""

K_EMPLOYMENT_TERM = "employment_term"
"""雇佣期限(学生岗 term;其余空 —— 公务员岗不定期 / 长期站上不分栏,宁空不猜)。"""

K_EMPLOYMENT_HOURS = "employment_hours"
"""工时(站上不分栏,恒空串)。"""

K_DESCRIPTION = "description"
"""描述纯文本(语言要求 + 职级 + 谁能投 + 正文各节)。"""

K_VALID_THROUGH = "valid_through"
"""截止日(ISO;过截止即出仓)。"""

K_LANG = "lang"
"""详情页语言(本板抓英文版,恒 en)。"""

K_INDUSTRY = "industry"
"""行业文本(站上没有,恒空串)。"""

K_EMPLOYER_URL = "employer_url"
"""雇主官网(站上不给,恒空串)。"""

K_WHO_CAN_APPLY = "who_can_apply"
"""谁能投(Job Bank 同键;mart to_jb_job_fields 照收)。"""

SOURCE_LABEL = "GC Jobs"
"""来源板名(jobs.source;显示标签由 mart 的 source_label 决定)。"""

LANG_EN = "en"
"""行的语言值。"""

SALARY_RE = re.compile(r"\$\s?([\d,]+(?:\.\d+)?)(?:\s*to\s*\$\s?([\d,]+(?:\.\d+)?))?")
"""薪资格里的金额(区间 to 连)。"""

HOURLY_MARK = "per hour"
"""时薪判词(没有即年薪 —— 公务员薪资表按年)。"""

UNIT_HOURLY = "hourly"
"""Job Bank 时薪单位词。"""

UNIT_ANNUAL = "annually"
"""Job Bank 年薪单位词。"""

SALARY_TPL = "${lo} {unit}"
"""单值薪资写法。"""

SALARY_RANGE_TPL = "${lo} to ${hi} {unit}"
"""区间薪资写法。"""

STUDENT_MARK = "student"
"""雇佣期文本里的学生岗判词(→ employment_term = term)。"""

TERM_WORD = "term"
"""Job Bank 雇佣期限词:定期。"""

DESC_LANG_TPL = "Language requirements: {lang}"
"""描述首行:语言要求(列表行给的)。"""

DESC_LEVEL_TPL = "Level: {level}"
"""描述第二行:职级。"""

DESC_WHO_TPL = "Who can apply: {who}"
"""描述第三行:谁能投。"""

UTC_Z = "Z"
"""ISO 串的 UTC 标记。"""

SECONDS_FMT = "%Y-%m-%dT%H:%M:%S"
"""last_seen 的时刻格式(秒级,尾接 UTC_Z)。"""

PRINT_STORE_DONE_TPL = "[OK] postings 仓 {rows} 行(剔:不在本轮列表 {gone} / 已过截止日 {expired} / 无标题 {blank})→ {out}"
"""建仓收尾。"""
