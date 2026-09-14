"""
hireac 域常量 —— 域词汇表(登录态浏览器抓取:列表翻页 + 详情页内回放 → 详情表格解析 → postings 仓;
照 careerbeacon 三件套样张,段横幅三行框 + N. 编号,与 functions.py / scheme.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役。
零字符串令:functions 里除空串与语法位外,一切字面量住这;JSON/行键一律 K_ 词族、
详情页表格的标签一律 F_ 词族、页内脚本一律 *_JS、文案模板一律 *_TPL。

@author Frank
@time 2026-09-13
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(三段共用:crawl slug、raw/processed 路径、编码)
# =========================================================================

SLUG_CRAWL = "board-hireac"
"""crawl 层目录名(data/crawl/board-hireac/):探路期(2026-09-13)落的 604 张详情 + 7 张列表页沿用,
与其余板 board-* 同名式。"""

OUT_ROWS = paths.RAW_HIREAC / "rows.json"
"""列表翻页产物:行号 → 详情表单参数(action 加密串 + postingId 等;action 是会话级,每轮现取)。
行号 = 列表页 tr id 里的帖号(本地帖纯数字,联播帖 CC- 前缀),也是 mart externalId 的料。"""

IN_ROWS = OUT_ROWS
"""详情回放 / 解析 / 建仓三段都读这份行表(当前态:本轮列表页在列的帖)。"""

OUT_JOBS = paths.RAW_HIREAC / "jobs.json"
"""详情解析产物:行号 → JobFact 字典(详情页「标签: 值」表格抽出的原始事实,增量累积)。"""

IN_JOBS = OUT_JOBS
"""建仓段读它;解析段读它做增量(已解析的行号不重解)。"""

OUT_POSTINGS = paths.PROCESSED_HIREAC / "postings.json"
"""归一后的 postings 仓(与 Job Bank 仓同键;mart 用 to_jb_job_fields 同一把尺子汇装)。"""

ENC_UTF8 = "utf-8"
"""全部读写的统一编码。"""

JSON_INDENT = 1
"""落盘缩进(照 paths 说明的大表惯例用 1)。"""

SPACE = " "
"""单空格(剥标签后的替身与折空白的目标)。"""

ERRORS_REPLACE = "replace"
"""读缓存原文的解码策略(坏字节不炸整页)。"""

# =========================================================================
# 2. 抓取(登录态浏览器一次会话:列表翻页 → 行表;未缓存详情页内回放 → crawl 层)
# =========================================================================

POSTINGS_URL = "https://hireac.algonquincollege.com/myAccount/careerEmployment/postings.htm"
"""岗位板正门(列表、翻页 AJAX、详情表单 POST 全打这一个地址;Orbis 用加密 action 区分动作)。"""

LOGIN_HOST = "login.microsoftonline.com"
"""登录态过期时跳去的学院 SSO 主机(2026-09-13 实测:约一个多小时闲置即过期)。"""

NOT_LOGGED_PATH = "/notLoggedIn.htm"
"""登录态过期的另一种落点(站内提示页)。"""

WAIT_DOM = "domcontentloaded"
"""导航等待档(列表由页内 AJAX 填,不等 load)。"""

NAV_TIMEOUT_MS = 45000
"""导航超时。"""

SETTLE_MS = 4000
"""进板后等页内脚本就绪。"""

LIST_SETTLE_MS = 1500
"""翻页到位后再等表格重绘。"""

VIEW_ALL_SETTLE_MS = 8000
"""点「全部在招」后等首页表格(AJAX 回填 604 行分页首屏)。"""

CLICK_VIEW_ALL_JS = (
    "() => { const a = [...document.querySelectorAll('a')]"
    ".find(e => e.textContent.trim() === 'View all available postings');"
    " if (!a) { return false; } a.click(); return true; }"
)
"""点开「View all available postings」(概览页的钮,javascript:void 链,只能页内点)。"""

LOAD_PAGE_JS_TPL = "loadPostingTable('', 'ID',  'Forward', '{n}','advanced','', null)"
"""页内翻页函数(2026-09-13 实测自分页器 onclick 抄形:排序列空 / 按 ID / 正序 / 页号 / advanced)。"""

CURRENT_PAGE_JS = "() => { const e = document.querySelector('input[id^=currentPage]'); return e ? e.value : ''; }"
"""分页器隐藏格里的当前页号(翻页到位的判据)。"""

PAGE_WAIT_STEP_MS = 500
"""轮询当前页号的步长。"""

PAGE_WAIT_TRIES = 60
"""轮询上限(30 秒没到位 = 翻页失败,抛错停轮)。"""

PAGE_NUM_RE = re.compile(r"loadPostingTable\('[^']*', '[^']*',\s+'[^']*', '(\d+)','advanced'")
"""分页器里的页号(取最大值 = 总页数;排序状态随会话变,列名与方向不写死)。"""

PAGE_ONE = 1
"""首页页号。"""

ROW_RE = re.compile(r"<tr id=\"posting(?P<k>[^\"]+)\" class=\"searchResult.*?</tr>", re.S)
"""列表行:组 k = 行号(帖号,本地纯数字 / 联播 CC-数字)。"""

FORM_RE = re.compile(r"orbisAppSr\.buildForm\((\{.*?\}), ''", re.S)
"""行内标题链的 onclick:组 1 = 详情表单参数(JS 对象字面量,单引号)。"""

GROUP_KEY = "k"
"""正则命名组:键 / 行号。"""

GROUP_VALUE = "v"
"""正则命名组:值。"""

QUOTE_SINGLE = "'"
"""JS 对象字面量的引号(换成双引号后即合法 JSON)。"""

QUOTE_DOUBLE = "\""
"""JSON 引号。"""

K_POSTING_ID_FORM = "postingId"
"""表单参数里的帖号键(本地帖 = 行号;联播帖 = 去掉 CC- 前缀的数字)。"""

LIST_KEY_TPL = "{base}?list=all&page={n}"
"""列表页在 crawl 层的键(AJAX 无独立 URL,自拟查询串;探路期同键)。"""

DETAIL_KEY_TPL = "{base}?postingId={pid}&row={row}"
"""详情页在 crawl 层的键(POST 无独立 URL,自拟查询串;探路期同键,604 张缓存直接复用)。"""

FETCH_JS = (
    "async ([url, form]) => { const fd = new URLSearchParams(form);"
    " const r = await fetch(url, {method: 'POST', body: fd, credentials: 'include',"
    " headers: {'Content-Type': 'application/x-www-form-urlencoded'}});"
    " const buf = await r.arrayBuffer(); let text;"
    " try { text = new TextDecoder('utf-8', {fatal: true}).decode(buf); }"
    " catch (e) { text = new TextDecoder('windows-1252').decode(buf); }"
    " return [r.status, text]; }"
)
"""页内回放详情表单:同源 fetch 带会话 cookie 走浏览器网络栈,过得了 Cloudflare;
page.request / httpx 从页外发同一请求一律 403(2026-09-13 实撞)。
解码走「UTF-8 严格,失败退 windows-1252」:Orbis 详情响应是 cp1252 字节且不带 charset,
r.text() 硬按 UTF-8 解把 é / ’ 全变 U+FFFD(2026-09-13 探路期 604 张里 170 张正文中招,已剔删重抓)。"""

HTTP_OK = 200
"""回放成功的状态码。"""

DETAIL_MARK = "Job Posting Information"
"""详情页正文的判词(本地帖与联播帖详情都带这一块;没有 = 回的是错误页或登录页)。"""

DETAIL_SLEEP_MS = 400
"""逐张回放的间隔(每秒两三张;与其余板同一自律档)。"""

DETAIL_TICK = 50
"""心跳间隔(每 N 张报一行)。"""

FLUSH_EVERY = 50
"""每 N 张把攒下的原文批量落 crawl 层一次。"""

FAIL_MAX = 20
"""连续失败上限(超过 = 会话坏了,抛错停轮而不是空跑到底)。"""

RATE_FLOOR_S = 0.001
"""速率分母下限(防首张除零)。"""

PERCENT = 100
"""百分比换算。"""

ERR_BROWSER_DOWN = "浏览器起不来(本机需 BROWSER_CHANNEL=chrome + uv sync --extra browser)"
"""get_browser_page 给 None 时抛出的话。"""

ERR_LOGIN_TPL = "登录态过期,停在 {url};请 Frank 在共享 profile 里重登 HireAC 后再跑"
"""进板落到登录页 / 未登录页时抛出的话(不静默降级)。"""

ERR_NO_VIEW_ALL = "概览页没找到「View all available postings」钮(页面改版?)"
"""点不到入口钮时抛出的话。"""

ERR_PAGE_WAIT_TPL = "翻到第 {n} 页超时"
"""翻页轮询超时抛出的话。"""

ERR_TOO_MANY_FAILS_TPL = "详情回放连续失败 {n} 张,判会话失效,停轮"
"""失败超限抛出的话。"""

PRINT_PAGE_TPL = "  第 {n}/{last} 页,累计 {rows} 行"
"""翻页心跳。"""

PRINT_ROWS_DONE_TPL = "[OK] 列表 {ids} 行 → {out}"
"""翻页收尾。"""

PRINT_DETAIL_HEAD_TPL = "[details] 待抓 {todo} / 在列 {total}(本轮上限 {cap},已缓存 {have})"
"""回放起手。"""

PRINT_DETAIL_TICK_TPL = "  [{done}/{todo}] {pct}%  {rate:.1f} 张/秒  {row}"
"""回放心跳。"""

PRINT_DETAIL_BAD_TPL = "  ✗ {row}:状态 {status},正文无判词,跳过"
"""单张回放失败留痕。"""

PRINT_DETAIL_DONE_TPL = "[OK] 详情 {done} 张入 crawl/{slug}(失败 {failed},已缓存跳过 {skipped})"
"""回放收尾。"""

# =========================================================================
# 3. 详情解析(缓存原文 → 「标签: 值」表格 → raw jobs.json)
# =========================================================================

FIELD_RE = re.compile(
    r"<tr>\s*<td[^>]*>\s*<strong>\s*(?P<k>[^<]+?)\s*</strong>\s*</td>\s*<td[^>]*>(?P<v>.*?)</td>\s*</tr>",
    re.S,
)
"""详情页 Job Posting Information / Application Information / Company Info 三块表格的一行:
组 k = 标签(带冒号),组 v = 值的 HTML。联播帖(CC-)与本地帖标签集不同,见 F_ 词族。"""

SCRIPT_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S)
"""值里的脚本/样式块整段剥掉(Tag Cloud 等 AJAX 占位带内联脚本)。"""

TAG_RE = re.compile(r"<[^>]+>")
"""HTML → 纯文本:剥标签。"""

WS_RE = re.compile(r"\s+")
"""连续空白折一个。"""

COLON = ":"
"""标签尾的冒号(剥掉后再当键)。"""

F_TITLE = "Job Title"
"""职位标题(两类帖同名)。"""

F_ORG = "Organization"
"""雇主名(两类帖同名)。"""

F_DIVISION = "Division"
"""雇主部门(本地帖)。"""

F_POSITION_TYPE = "Position Type"
"""岗位类型(本地帖:Full-time Permanent / Full-time Contract / Part-Time Employment / Summer Employment)。"""

F_JOB_TYPE = "Job Type"
"""岗位类型(联播帖:Full-Time Job / Part-Time Job / Contract)。"""

F_TERM = "Term"
"""学年(本地帖,如 2025-2026)。"""

F_LOCATION = "Job Location"
"""地点(本地帖:城市名 / 省名 / 「Eastern Ontario」类区域 / 「Barrie, ON」)。"""

F_LOCATION_CC = "Location"
"""地点(联播帖:「City, Province」;另有 City / Province 拆格,优先拆格)。"""

F_CITY = "City"
"""城市(联播帖)。"""

F_PROVINCE = "Province"
"""省全名(联播帖,如 Ontario;约一成空)。"""

F_POSTAL = "Postal Code"
"""邮编(联播帖)。"""

F_ADDRESS = "Address"
"""街道地址(联播帖)。"""

F_SALARY = "Salary"
"""薪资类型(本地帖:Hourly / Salary / Salary plus commission —— 只有类型没有金额,不进薪资列)。"""

F_HOURS = "Hours per week"
"""周工时(本地帖,自由文本)。"""

F_CATEGORY = "Employment Category"
"""岗位类别(本地帖,学院自家分类,如 Nursing / Computer Programming)。"""

F_DESCRIPTION = "Job Description"
"""描述(本地帖)。"""

F_DESCRIPTION_CC = "Description"
"""描述(联播帖)。"""

F_REQUIREMENTS = "Job Requirements"
"""要求(本地帖)。"""

F_QUALIFICATIONS = "Qualifications"
"""要求(联播帖)。"""

F_DEADLINE = "Application Deadline"
"""截止(两类帖同名;本地帖「December 31, 2026 11:59 PM」,联播帖「Dec 03, 2026 04:59 AM」)。"""

F_PROCEDURE = "Application Procedure"
"""投递方式(本地帖:Employer Email / Employer Website / Online via HireAC)。"""

F_PREFERRED = "Preferred Response"
"""投递方式(联播帖:Through Company Website 等)。"""

F_APPLY_WEB = "If by Website, go to"
"""投递网址(本地帖)。"""

F_APPLY_EMAIL = "If by email, send to"
"""投递邮箱(本地帖)。"""

F_APPLY_CC = "Click Here to Apply"
"""投递网址(联播帖,outcomecampusconnect.ca 跳转链)。"""

F_WEBSITE = "Website"
"""雇主官网(联播帖)。"""

F_LANGUAGE = "Job Language"
"""岗位语言(联播帖:English / English and French)。"""

F_COUNTRY = "Country"
"""国家(联播帖;Canada 之外的帖不进仓 —— 2026-09-13 实测有 Malmo / Scottsdale 等海外帖混在联播里)。"""

COUNTRY_CA = "Canada"
"""进仓的国家值(空串 = 页上没给,按本地帖对待也进仓)。"""

COMMA_SP = ", "
"""「City, ON」的分隔。"""

PROV_CODES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]
"""两位省码全集(「Barrie, ON」尾段认码用)。"""

PROV_CODE_OF_NAME = {
    "Alberta": "AB",
    "British Columbia": "BC",
    "BC": "BC",
    "Manitoba": "MB",
    "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL",
    "Nova Scotia": "NS",
    "Ontario": "ON",
    "Prince Edward Island": "PE",
    "Quebec": "QC",
    "Québec": "QC",
    "Saskatchewan": "SK",
    "Eastern Ontario": "ON",
    "Southwestern Ontario": "ON",
    "Northern Ontario": "ON",
    "National Capital Region": "ON",
}
"""省名 / 板上的区域名 → 省码(2026-09-13 实测本地帖 Job Location 的省级与区域级写法;
联播帖 Province 是全名)。区域级只给省不给城(宁空不猜)。"""

PROV_OF_CITY = {
    "Ottawa": "ON",
    "Toronto": "ON",
    "Kingston": "ON",
    "Milton": "ON",
    "Carleton Place": "ON",
    "Perth": "ON",
    "Pembroke": "ON",
    "Brockville": "ON",
    "Cornwall": "ON",
    "Barrie": "ON",
    "Kanata": "ON",
    "Nepean": "ON",
    "Orleans": "ON",
    "Orléans": "ON",
    "Mississauga": "ON",
    "Scarborough": "ON",
    "Markham": "ON",
    "Thornhill": "ON",
    "Richmond Hill": "ON",
    "Hamilton": "ON",
    "London": "ON",
    "Guelph": "ON",
    "Sudbury": "ON",
    "Thunder Bay": "ON",
    "Atikokan": "ON",
    "Fort Frances": "ON",
    "Napanee": "ON",
    "Barry's Bay": "ON",
    "Vernon": "BC",
    "Gatineau": "QC",
    "Montreal": "QC",
    "Montréal": "QC",
    "Winnipeg": "MB",
    "Vancouver": "BC",
    "Calgary": "AB",
    "Edmonton": "AB",
}
"""裸城市名 → 省码(板上不带省的写法;2026-09-13 按 604 帖实测高频城人工核定;表外裸城留空省,
mart 地点段能认再补)。"""

DEADLINE_FMTS = ["%B %d, %Y %I:%M %p", "%b %d, %Y %I:%M %p", "%B %d, %Y", "%b %d, %Y"]
"""截止文本的可能写法(折空白后依次试;全不中留空串)。"""

PRINT_PARSE_DONE_TPL = "[OK] 解析 {parsed} 张(跳过已解析 {skipped},无缓存 {missing})→ {out}"
"""解析收尾。"""

# =========================================================================
# 4. postings 仓(raw 事实 → Job Bank 仓同形的行;当前态)
# =========================================================================

SALARY_SNIPPET_RE = re.compile(
    r"\$\s?(\d[\d,]*(?:\.\d+)?)(?:\s?(?:-|–|to)\s?\$?\s?(\d[\d,]*(?:\.\d+)?))?"
    r"(?:\s?(?:/|per|an|a)?\s?(hour|hr|h|year|yr|annum|annually|week|wk|month|mo))?",
    re.I,
)
"""正文里的薪资片段:组 1 低值 / 组 2 高值(区间才有)/ 组 3 单位词(可无)。2026-09-13 Frank「这个详情页面是有薪职的啊」:
板上 Salary 格只给「Hourly / Salary」类型,金额只在正文里(本地帖 64/153、联播帖 115/281 提到金额),
这里抽第一处成 Job Bank 写法交 mart 薪资尺子归一;单位缺席时按类型格与金额量级补(见 salary_text_of)。"""

SALARY_UNIT_WORD = {
    "hour": "hourly", "hr": "hourly", "h": "hourly",
    "year": "annually", "yr": "annually", "annum": "annually", "annually": "annually",
    "week": "weekly", "wk": "weekly",
    "month": "monthly", "mo": "monthly",
}
"""正文单位词 → Job Bank 单位词(mart 薪资段认这些词)。"""

KIND_UNIT_WORD = {
    "Hourly": "hourly",
    "Salary": "annually",
    "Salary plus commission": "annually",
}
"""板上 Salary 类型格 → 单位词(正文金额没带单位时按类型补)。"""

KIND_HOURLY_KEY = "Hourly"
"""KIND_UNIT_WORD 里时薪档的键(量级校验按档取词)。"""

KIND_SALARY_KEY = "Salary"
"""KIND_UNIT_WORD 里年薪档的键。"""

HOURLY_MIN = 15.0
"""无单位金额按时薪补单位的下限(低于安省最低工资的不是时薪)。"""

HOURLY_MAX = 150.0
"""无单位金额按时薪补单位的上限(再高就是年薪或奖金)。"""

ANNUAL_MIN = 20000.0
"""无单位金额按年薪补单位的下限(低于它的是签约奖金一类)。"""

SALARY_TPL = "${lo} {unit}"
"""单值薪资写法(照 Job Bank「$21.00 hourly」)。"""

SALARY_RANGE_TPL = "${lo} to ${hi} {unit}"
"""区间薪资写法(照 Job Bank「$18.00 to $24.00 hourly」)。"""

COMMA = ","
"""金额里的千分位(去掉再转数)。"""

K_POSTING_ID = "posting_id"
"""帖号(mart externalId 的料;本地帖数字 / 联播帖 CC-数字)。"""

K_TITLE = "title"
"""标题。"""

K_TITLE_ORIG = "title_orig"
"""原标题(三板同形保留;本板英文为主,恒空串)。"""

K_EMPLOYER = "employer"
"""雇主名。"""

K_CITY = "city"
"""城市。"""

K_PROVINCE = "province"
"""省码。"""

K_SALARY = "salary"
"""薪资原文(Job Bank 写法;板上 Salary 格只给类型,金额自正文抽,抽不到留空串 —— 宁空不猜)。"""

K_DATE = "date"
"""发布日(ISO;板上不给发布日,取本站首见日)。"""

K_SOURCE = "source"
"""来源板名。"""

K_DIRECT = "direct"
"""是否雇主直招帖(Job Bank 语义;本板投递经邮件/官网/HireAC 转,恒 False)。"""

K_URL = "url"
"""详情 URL(applyUrl 的料:雇主投递网址 > 雇主官网 > 板正门)。"""

K_ADDRESS = "address"
"""地址文本(街道 + 城市 + 省 + 邮编;联播帖有街道邮编,本地帖只有城市)。"""

K_NOC = "noc"
"""官方 NOC(板上没有,恒空串 → mart 按标题分类)。"""

K_LAST_SEEN = "last_seen"
"""本轮建仓时刻(ISO Z)。"""

K_EMPLOYMENT_TERM = "employment_term"
"""雇佣期限(permanent / term / seasonal,Job Bank 词汇)。"""

K_EMPLOYMENT_HOURS = "employment_hours"
"""工时(full / part,Job Bank 词汇)。"""

K_DESCRIPTION = "description"
"""描述纯文本(描述 + 要求)。"""

K_VALID_THROUGH = "valid_through"
"""截止日(ISO;过截止即出仓)。"""

K_LANG = "lang"
"""详情页语言(本板恒 en)。"""

K_INDUSTRY = "industry"
"""行业文本(本地帖 Employment Category 原样;联播帖空串)。"""

K_EMPLOYER_URL = "employer_url"
"""雇主官网(联播帖 Website;本地帖空串)。"""

SOURCE_LABEL = "HireAC"
"""来源板名(jobs.source;显示标签由 mart 的 source_label 决定)。"""

LANG_EN = "en"
"""行的语言值。"""

HTTP_PREFIX = "http"
"""投递网址 / 官网的判词(不是 http 开头的当作没给)。"""

TERM_OF_KIND = {
    "Full-time Permanent": "permanent",
    "Full-time Contract": "term",
    "Contract": "term",
    "Summer Employment": "seasonal",
}
"""板上岗位类型 → Job Bank 雇佣期限词(Part-Time Employment / Full-Time Job / Part-Time Job 不表期限,不在表里)。"""

HOURS_OF_KIND = {
    "Full-time Permanent": "full",
    "Full-time Contract": "full",
    "Full-Time Job": "full",
    "Part-Time Employment": "part",
    "Part-Time Job": "part",
}
"""板上岗位类型 → Job Bank 工时词(Contract / Summer Employment 不表工时,不在表里)。"""

UTC_Z = "Z"
"""ISO 串的 UTC 标记(Job Bank 仓 last_seen 同款)。"""

SECONDS_FMT = "%Y-%m-%dT%H:%M:%S"
"""last_seen 的时刻格式(秒级,尾接 UTC_Z)。"""

ADDRESS_SEP = ", "
"""地址各段的连接符。"""

DESC_SEP = " "
"""描述与要求两段的连接(纯文本单段,与其余板同形)。"""

PRINT_STORE_DONE_TPL = ("[OK] postings 仓 {rows} 行(剔:不在本轮列表 {gone} / 已过截止日 {expired} / 无标题 {blank}"
                        " / 海外 {foreign})→ {out}")
"""建仓收尾。"""
