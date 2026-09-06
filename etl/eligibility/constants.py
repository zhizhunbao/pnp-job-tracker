"""
eligibility 域常量 —— 联邦试点申请人门槛库的词汇表(quote-anchored 规则引擎 + 三个试点各自的规则表;
照 aip 三件套样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

沿革:2026-09-06 立域(Frank「这种不同省的规则也需要一个单独模块维护吧」)。段 2 AIP 是 aip 域
第 3 段 **整段搬入**:常量值、正则、模板、每条规则的原句与 docstring 逐字未改,产物路径 raw/ircc/aip_rules.json
一字不动;只做三处形式项 —— ① 引擎共用的常量(引号归一表、页键、模板)抽到本文件第 1 段,② 名字加 AIP_ 前缀
(一个域装三个试点,裸名 RULES / PAGE_URLS 会撞),③ RULES_NO_CACHE_TPL 的 crawl 种子名从写死 fed-aip 改成 {slug} 占位。
段 3 RCIP、段 4 FCIP 新写:原句全部出自 data/crawl/fed-rcip 缓存页(2026-09-06 抓),照 AIP 行形。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/配置 dict)+ IN/OUT 路径。
唯一特批 import = `paths`(本域常量没有正则,re 不进)。注释方言:每个常量用赋值后的裸字符串 docstring,行内 # 退役。
零字符串令:functions 里除空串/数值/to_* 体内字典键外,一切字面量住这;文案模板一律 *_TPL,
JSON/wire 键一律 K_ 词族,官方原句一律进规则表的 quote 格(quote-anchored,禁转述)。
"""
import paths

# =========================================================================
# 1. 引擎词汇(三段共用:引用归一、页键、产出模板)
# =========================================================================

INDENT_1 = 1
"""规则表落盘缩进(原 aip 段3 写死的 indent=1,原值)。"""

QUOTE_FIXES = (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'))
"""归一化替换表:弯引号 → 直引号 —— 引用核对不被排版噪音干扰(同 build_pgwp/build_ee_rules)。"""

MAIN_TAG = "main"
"""正文容器标签(官方页的正文全在 <main> 里)。"""

HTML_PARSER = "html.parser"
"""bs4 解析器:标准库自带,免装 lxml。"""

MISSING_QUOTE_LEN = 90
"""引用消失报告里原句的截断长度。"""

SUBJECT_APPLICANT = "applicant"
"""本表全部规则的主体:申请人(与雇主侧门槛表分开)。"""

K_PAGE = "page"
"""RULES 行键:这条规则的官方页(PAGE_URLS 的键)。"""

K_QUOTE = "quote"
"""RULES 行键:官方原句(逐字,核验用)。"""

K_FACTOR = "factor"
"""RULES 行键:门槛因子名。"""

K_STREAM = "stream"
"""RULES 行键:适用分流(teer-0-3 等;缺省空串)。"""

K_FAMILY_SIZE = "familySize"
"""RULES 行键:家庭人数档(只有安家资金分档规则才有,条件加键)。"""

K_TEXT = "text"
"""pages 表的记录键:归一化后的官方正文(引用核对的底本)。"""

RULES_PROVINCE_FED = "FED"
"""产出表的省码:联邦项目。"""

RULES_IN_TPL = "IN  : {url}  (crawl 缓存 {fetched})"
"""逐页报出处的一行。"""

RULES_OUT_TPL = "OUT : {path}"
"""开跑时报落盘口的一行。"""

RULES_NO_CACHE_TPL = "✗ crawl 缓存里没有这一页(先跑 etl/crawl 的 discover_sources {slug}):{url}"
"""缓存缺页时的 SystemExit 文案(**报错退出,不偷偷 httpx 补** —— 那正是「猜 URL」的老病根)。"""

RULES_MISSING_TPL = "✗ {n}/{total} 条官方引用在页面上消失(改版?)—— 保留旧表,人工重核:"
"""引用核验失败的抬头行(其后逐条列出,再 exit 1)。"""

RULES_MISSING_ROW_TPL = "✗   [{factor}/{stream}] {quote}"
"""引用核验失败时的逐条明细行。"""

RULES_DONE_TPL = "✓ {n} 条规则全部引用核验通过 → {name}"
"""收尾报数行。"""


# =========================================================================
# 2. aip 步(AIP 申请人门槛库,quote-anchored;aip 域第 3 段整段搬入,2026-09-06)
# =========================================================================

AIP_CRAWL_SLUG = "fed-aip"
"""crawl 种子名(缓存缺页时提示先跑哪个种子;原写死在 RULES_NO_CACHE_TPL 里)。"""

AIP_RULES_DOC = """build_aip_rules — 联邦大西洋移民计划(AIP)申请人门槛库(G-AIP,2026-08-09;
设计 docs/design/一键三合一判定-20260809.md §4:#287 的硬前置,AIP 申请人侧生产 0 行)。

**quote-anchored**(照 build_pgwp / build_ee_rules 惯例):每条规则由人从官方原文抄成
结构化行,本步每轮实抓核对,**逐条验证引用仍逐字存在于对应页面**——页面改版引用消失
→ 保留旧表 + exit 1,绝不拿半份数据盖好数据。

只读 crawl 缓存(URL 铁律:先 grep manifest,再谈抓不到,禁猜 URL、禁现场上网抓)。
`data/crawl/fed-aip/` 首轮只到 depth 2(17 页),**申请人门槛细节页(work-experience /
proof-funds / settlement-service-provider-organizations 等)全挂在 how-to-immigrate/
eligibility.html 之下一跳、是 depth 3**,depth=2 探不到 —— 本批把 etl/crawl 的
discover_sources 的 fed-aip 种子深度 2→3 重跑过一次(照 fed-ee depth=4 同款先例),
缺失页已在缓存里,本步不再自己发请求。

产出 raw/ircc/aip_rules.json,形状对齐 raw/ircc/pgwp_rules.json / raw/ee/fed-eligibility.json
(province='FED' program='AIP',09 IN_REQ_TABLES 直接消费 → mart pnp_requirements →
引擎 facts.requirements 免费拿到)。

收的门槛:工作经验(小时数/时间窗/TEER 匹配/国际毕业生豁免)、语言(CLB 按 TEER 分档)、
学历(境内/境外 + ECA)、job offer 条款(全职/非季节性/时长/雇主指定/健康照护职业互认)、
安家资金(按家庭人数档)。页面上没写的一律不编(如「官方不公布」需要举证,举不出来落
not-collected —— 本表目前每条都有官方原句,不存在这种行)。"""
"""本步的判据与产出形状(原 build_aip_rules.py 文件头,逐字折进)。"""

AIP_BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/"
            "immigrate-canada/atlantic-immigration")
"""AIP 官方页的公共前缀(原 `_BASE`,2026-08-31 下划线名退役)。"""

AIP_URL_ELIG = AIP_BASE + "/how-to-immigrate/eligibility.html"
"""Who can apply(索引页)。"""

AIP_URL_WORK = AIP_BASE + "/how-to-immigrate/work-experience.html"
"""工作经验门槛 + 国际毕业生豁免。"""

AIP_URL_FUNDS = AIP_BASE + "/proof-funds.html"
"""安家资金(按家庭人数档)。"""

AIP_URL_JOBOFFER = AIP_BASE + "/how-to-immigrate/job-offer.html"
"""job offer 条款。"""

AIP_URL_LANG = AIP_BASE + "/language-testing.html"
"""语言 CLB 门槛(按 TEER 分档)。"""

AIP_URL_EDU = AIP_BASE + "/education-assessment.html"
"""学历要求 + ECA。"""

OUT_AIP_RULES = paths.IRCC / "aip_rules.json"
"""AIP 申请人门槛表(09 IN_REQ_TABLES 直接消费)。"""

AIP_PAGE_URLS = {"elig": AIP_URL_ELIG, "work": AIP_URL_WORK, "funds": AIP_URL_FUNDS,
             "joboffer": AIP_URL_JOBOFFER, "lang": AIP_URL_LANG, "edu": AIP_URL_EDU}
"""页键 → 官方 URL(RULES 每条的 page 指的就是这里的键)。"""

AIP_RULES_NOTE = ("quote-anchored:valueText=官方原文,本脚本每轮验证其仍逐字在页面上;字段语义见 basis。"
                  "覆盖工作经验(小时数/时间窗/TEER 匹配/国际毕业生豁免)、job offer 条款(全职/非季节性/"
                  "时长/雇主指定/健康照护职业互认)、语言(CLB 按 TEER 分档)、学历(境内/境外+ECA)、"
                  "安家资金(fundsMinimum 按 familySize 分档,fundsPerAdditionalMember 是超 7 人后的"
                  "每人递增,value=None 编码进 basis,照 22P02 教训)。"
                  "AIP 只是三个大西洋省(NB/NS/PE/NL)共用的联邦项目框架——省一级各自的紧缺职业清单/"
                  "雇主指定名单不在本表,那是各省 <省>-req.json 的事。")
"""aip_rules.json 的口径说明(产物字段,逐字不改)。"""

AIP_PROGRAM = "AIP"
"""产出表的项目码。"""

AIP_RULES = [
    {"page": "work", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=5;hoursPerWeek=30;minYears=1",
     "label": "At least 1,560 hours (30 hrs/week for 1 year) of related work experience in the past 5 years",
     "quote": "You need at least 1,560 hours of related work experience over the past 5 years."},
    {"page": "work", "factor": "workPeriodMin", "op": ">=", "value": 1, "unit": "years",
     "basis": "windowYears=5",
     "label": "The 1,560 hours must be worked over a period of at least 1 year",
     "quote": "You must have worked these hours over a period of at least 1 year."},
    {"page": "work", "factor": "workTeerMatch", "op": "rule", "value": "same-or-higher", "unit": "",
     "basis": "jobOfferTeer0->workTeer0,1,2,3,4;jobOfferTeer1->workTeer1,2,3,4;"
              "jobOfferTeer2->workTeer2,3,4;jobOfferTeer3->workTeer3,4;jobOfferTeer4->workTeer4",
     "label": "Work experience must be in the same TEER category as the job offer, or higher",
     "quote": "be in the same TEER category as your job offer or higher"},
    {"page": "work", "factor": "workPaid", "op": "rule", "value": "paid-only", "unit": "",
     "label": "Work experience must be from a paid job; volunteer work and unpaid internships don't count",
     "quote": "have been for a paid job"},
    {"page": "work", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "Self-employment does not count toward the work experience requirement",
     "quote": "not be from a self-employed job"},
    {"page": "work", "factor": "workExemptGrad", "op": "rule", "value": "exempt-if-atlantic-grad", "unit": "",
     "label": "International graduates of a recognized Atlantic Canada post-secondary institution "
              "are exempt from the work experience requirement",
     "quote": "You do not need to meet the work experience requirements if you're an international "
              "graduate and you:"},
    {"page": "work", "factor": "workExemptGradCredentialYears", "op": ">=", "value": 2, "unit": "years",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential (degree/diploma/certificate/trade or apprenticeship) must have taken at least 2 years",
     "quote": "took at least 2 years"},
    {"page": "work", "factor": "workExemptGradRecency", "op": "<=", "value": 2, "unit": "years",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential must have been received less than 2 years before applying for PR",
     "quote": "you received less than 2 years before you applied for permanent residence"},
    {"page": "work", "factor": "workExemptGradResidencyMonths", "op": ">=", "value": 16, "unit": "months",
     "basis": "appliesTo=workExemptGrad;windowYears=2",
     "label": "Must have lived in 1 of the 4 Atlantic provinces for at least 16 months during the last "
              "2 years before graduating",
     "quote": "lived in 1 of the 4 Atlantic provinces for at least 16 months during the last 2 years "
              "before you graduated"},

    {"page": "joboffer", "factor": "offerFullTime", "op": ">=", "value": 30, "unit": "hoursPerWeek",
     "label": "Job offer must be full-time: at least 30 hours a week",
     "quote": "full-time (at least 30 hours a week)"},
    {"page": "joboffer", "factor": "offerNonSeasonal", "op": "rule", "value": "non-seasonal", "unit": "",
     "label": "Job offer must be non-seasonal (consistent and paid all year)",
     "quote": "non-seasonal (consistent and paid all year)"},
    {"page": "joboffer", "factor": "offerDuration", "stream": "teer-0-3", "op": ">=", "value": 1, "unit": "years",
     "label": "TEER 0/1/2/3 job offers: at least 1 year of employment from the date of becoming a permanent resident",
     "quote": "for at least 1 year from the time you become a permanent resident for TEER 0, 1, 2 or 3 job offers"},
    {"page": "joboffer", "factor": "offerDuration", "stream": "teer-4", "op": "rule", "value": "indefinite", "unit": "",
     "label": "TEER 4 job offers: permanent employment with no set end date",
     "quote": "for permanent employment with no set end date for TEER 4 job offers"},
    {"page": "joboffer", "factor": "offerSkillLevel", "op": "rule", "value": "same-or-higher", "unit": "",
     "label": "Job offer must be at the same or higher skill level as the qualifying work experience",
     "quote": "at the same or higher skill level as your qualifying work experience"},
    {"page": "joboffer", "factor": "offerDesignatedEmployer", "op": "rule", "value": "required", "unit": "",
     "label": "The job offer must come from a provincially designated employer",
     "quote": "Each province designates employers who can offer jobs under this program."},
    {"page": "joboffer", "factor": "offerOwnershipExclusion", "op": "rule", "value": "excluded", "unit": "",
     "label": "The job offer can't come from a company where you (or your spouse/common-law partner) "
              "are a majority owner",
     "quote": "The job offer can't come from a company in which you, your spouse or common-law partner "
              "are a majority owner."},
    {"page": "joboffer", "factor": "workHealthcareCrossQualify", "op": "rule",
     "value": "NOC31201/31301-experience->NOC33102/44101-offer", "unit": "",
     "label": "Work experience as a licensed practical nurse (NOC 31201) or registered nurse (NOC 31301) "
              "can be used for a job offer in NOC 33102 or NOC 44101",
     "quote": "Work experience in NOC 31201 (licensed practical nurses) and NOC 31301 (registered nurses) "
              "can be used for a job offer in"},

    {"page": "lang", "factor": "language", "stream": "teer-0-3", "op": ">=", "value": 5, "unit": "CLB",
     "label": "CLB 5 minimum for a job offer in TEER 0, 1, 2 or 3",
     "quote": "CLB 5 for job offer in TEER 0, 1, 2 or 3"},
    {"page": "lang", "factor": "language", "stream": "teer-4", "op": ">=", "value": 4, "unit": "CLB",
     "label": "CLB 4 minimum for a job offer in TEER 4",
     "quote": "CLB 4 for job offer in TEER 4"},
    {"page": "lang", "factor": "languageTestRecency", "op": "<=", "value": 2, "unit": "years",
     "label": "Language test results must be less than 2 years old when you apply",
     "quote": "These results must be less than 2 years old when you apply."},

    {"page": "edu", "factor": "education", "stream": "teer-0-1", "op": "rule",
     "value": "canadian-1yr-postsecondary", "unit": "",
     "label": "Education in Canada, TEER 0/1: a Canadian one-year post-secondary (or higher) credential",
     "quote": "a Canadian one-year post-secondary (or higher) educational credential"},
    {"page": "edu", "factor": "education", "stream": "teer-2-4", "op": "rule",
     "value": "canadian-high-school", "unit": "",
     "label": "Education in Canada, TEER 2/3/4: a Canadian high school diploma (or higher)",
     "quote": "a Canadian high school diploma (or higher)"},
    {"page": "edu", "factor": "educationForeign", "stream": "teer-0-1", "op": "rule",
     "value": "foreign-equivalent-1yr-postsecondary", "unit": "",
     "label": "Education outside Canada, TEER 0/1: the foreign equivalent of a Canadian one-year "
              "post-secondary (or higher) credential",
     "quote": "the foreign equivalent of a Canadian one-year post-secondary (or higher) educational credential"},
    {"page": "edu", "factor": "educationForeign", "stream": "teer-2-4", "op": "rule",
     "value": "foreign-equivalent-high-school", "unit": "",
     "label": "Education outside Canada, TEER 2/3/4: the foreign equivalent of a Canadian high school diploma (or higher)",
     "quote": "the foreign equivalent of a Canadian high school diploma (or higher)"},
    {"page": "edu", "factor": "educationEcaRequired", "op": "rule", "value": "eca-required", "unit": "",
     "label": "Foreign education needs an Educational Credential Assessment (ECA) for immigration",
     "quote": "You must get an educational credential assessment (ECA) for immigration."},
    {"page": "edu", "factor": "educationEcaValidity", "op": "<=", "value": 5, "unit": "years",
     "label": "An ECA is only valid for 5 years",
     "quote": "ECAs are only valid for 5 years."},

    {"page": "funds", "factor": "fundsRequired", "op": "rule", "value": "required", "unit": "",
     "label": "Must prove enough money to support yourself and your family after arriving in Canada",
     "quote": "You must prove to us that you have enough money to support yourself and your family "
              "after you get to Canada."},
    {"page": "funds", "factor": "fundsWaivedIfWorking", "op": "rule", "value": "waived-if-authorized-worker", "unit": "",
     "label": "Proof of funds is waived if already working in Canada with a valid work permit",
     "quote": "You do not need to show proof of funds if you're already working in Canada with a valid work permit."},
    {"page": "funds", "factor": "fundsPerAdditionalMember", "op": "rule", "value": None, "unit": "CAD",
     "basis": "perAdditionalMemberCAD=1028;baseFamilySize=7",
     "label": "For each additional family member beyond 7, add $1,028",
     "quote": "If more than 7 people, for each additional family member, add $1,028"},

    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 3815, "unit": "CAD",
     "familySize": 1, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 1: $3,815 CAD",
     "quote": "1 $3,815"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 4750, "unit": "CAD",
     "familySize": 2, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 2: $4,750 CAD",
     "quote": "2 $4,750"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 5840, "unit": "CAD",
     "familySize": 3, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 3: $5,840 CAD",
     "quote": "3 $5,840"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 7090, "unit": "CAD",
     "familySize": 4, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 4: $7,090 CAD",
     "quote": "4 $7,090"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 8042, "unit": "CAD",
     "familySize": 5, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 5: $8,042 CAD",
     "quote": "5 $8,042"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 9070, "unit": "CAD",
     "familySize": 6, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 6: $9,070 CAD",
     "quote": "6 $9,070"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 10098, "unit": "CAD",
     "familySize": 7, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 7: $10,098 CAD",
     "quote": "7 $10,098"},
]
"""AIP 申请人门槛的全部规则:一条规则一条官方原文。`page` 指 AIP_PAGE_URLS 的键,
`quote` 必须逐字(归一化后)出现在该页上,否则整表不更新(照 build_pgwp/build_ee_rules)。

分组:工作经验(work-experience.html)含国际毕业生豁免(「Exemption if you studied and
graduated in Atlantic Canada」段);Job offer 条款(how-to-immigrate/job-offer.html)含
健康照护职业互认(直接命中 #287 完美案例 NOC 33102 continuing care assistant 的路径:
LPN/RN 工作经验可用来满足 NOC 33102/44101 岗位的 job offer 门槛);语言
(language-testing.html);学历(education-assessment.html);安家资金(proof-funds.html)。

末 7 条 fundsMinimum 是安家资金表(proof-funds.html,「Minimum amount of money you need
to immigrate to Canada based on the size of your family」,Updated July 29, 2025):
一行一个家庭规模档,用 familySize 列(schema 已有,ON/其余省份门槛表同款用法)而不是
塞进 basis 编码。**2026-08-31 批C 全溶时把原来的 `FUNDS_TABLE` 推导式展开成 7 条字面量**
(推导式在方言律④下退役;FUNDS_TABLE 常量随之退役),展开结果与旧脚本逐条比对相等。"""


# =========================================================================
# 3. rcip 步(RCIP 偏远社区试点申请人门槛库,quote-anchored)
# =========================================================================

RCIP_RULES_DOC = """build_rcip_rules — 联邦偏远社区移民试点(RCIP)申请人门槛库(2026-09-06,Frank
「那就把 rcip 规则抓取步补上」:此前 RCIP 的申请人门槛只有人的记忆,仓库里只抓了社区/雇主/职业清单,
把脉页答「TEER 5 能不能走 RCIP」时没有可核的原句)。

判据与产出形状同 AIP 段(quote-anchored;只读 crawl 缓存 data/crawl/fed-rcip/,种子 etl/crawl SEED_FED_RCIP
depth 3 已含 eligibility 下一跳的 work-experience / language-test / proof-funds / education-assessment 四页)。
产出 raw/ircc/rcip_rules.json(province='FED' program='RCIP',mart IN_REQ_TABLES 直接消费 → pnp_requirements)。

收的门槛:job offer(社区指定雇主 + 社区推荐 + 优先行业/职业)、工作经验(1 年 1,560 小时 / 3 年窗 /
TEER 相近表 / TEER 5 同码 / 社区毕业生豁免)、语言(CLB 按 TEER 三档)、学历(境内高中或以上 / 境外 ECA 5 年内)、
安家资金(按家庭人数 1-7 档 + 超 7 人递增;有效工签在加工作免)。页面没写的一律不编。"""
"""本步的判据与产出形状。"""

RCIP_BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/"
             "immigrate-canada/rural-franco-pilots/rural-immigration")
"""RCIP 官方页的公共前缀(canada.ca 扁平路径 rural-franco-pilots/rural-immigration)。"""

RCIP_URL_ELIG = RCIP_BASE + "/eligibility.html"
"""Who can apply(索引页:五条 must 清单)。"""

RCIP_URL_JOBOFFER = RCIP_BASE + "/job-offer.html"
"""job offer 与社区推荐。"""

RCIP_URL_WORK = RCIP_BASE + "/eligibility/work-experience.html"
"""工作经验门槛 + TEER 相近表 + 社区毕业生豁免。"""

RCIP_URL_LANG = RCIP_BASE + "/eligibility/language-test.html"
"""语言 CLB 门槛(按 job offer TEER 三档)。"""

RCIP_URL_FUNDS = RCIP_BASE + "/eligibility/proof-funds.html"
"""安家资金(按家庭人数档,Updated July 29, 2025)。"""

RCIP_URL_EDU = RCIP_BASE + "/eligibility/education-assessment.html"
"""学历要求 + ECA。"""

OUT_RCIP_RULES = paths.IRCC / "rcip_rules.json"
"""RCIP 申请人门槛表(mart IN_REQ_TABLES 直接消费)。"""

RCIP_CRAWL_SLUG = "fed-rcip"
"""crawl 种子名(缓存缺页时提示先跑哪个种子)。"""

RCIP_PAGE_URLS = {"elig": RCIP_URL_ELIG, "joboffer": RCIP_URL_JOBOFFER, "work": RCIP_URL_WORK,
                  "lang": RCIP_URL_LANG, "funds": RCIP_URL_FUNDS, "edu": RCIP_URL_EDU}
"""页键 → 官方 URL(RCIP_RULES 每条的 page 指的就是这里的键)。"""

RCIP_PROGRAM = "RCIP"
"""产出文档的 program 字段。"""

RCIP_RULES_NOTE = ("quote-anchored:valueText=官方原文,本步每轮验证其仍逐字在页面上;字段语义见 basis。"
                   "覆盖 job offer(社区指定雇主/社区推荐/优先行业或职业)、工作经验(1,560 小时/3 年窗/"
                   "TEER 相近表/TEER 5 同码/社区毕业生豁免)、语言(CLB 按 TEER 三档)、学历(境内高中或以上/境外 ECA)、"
                   "安家资金(fundsMinimum 按 familySize 分档,fundsPerAdditionalMember 是超 7 人后的每人递增)。"
                   "RCIP 是社区推荐制:哪个社区、优先职业、指定雇主名单不在本表,那是 rcip 域三份清单的事。")
"""产出文档的 note 字段(给读 json 的人看的一句话)。"""

RCIP_RULES = [
    {"page": "elig", "factor": "offerDesignatedEmployer", "op": "rule", "value": "designated-in-community", "unit": "",
     "label": "Job offer must come from an employer designated by the recommending community",
     "quote": "have a valid job offer from a designated employer in the community"},
    {"page": "joboffer", "factor": "offerCommunityRecommendation", "op": "rule", "value": "community-recommendation",
     "unit": "",
     "label": "The designated employer sends the community recommendation application to the community for review",
     "quote": "Once you have a valid job offer from a designated employer, they will send your community "
              "recommendation application directly to the community to review."},
    {"page": "joboffer", "factor": "offerPriorityOccupation", "op": "rule", "value": "priority-sector-or-occupation",
     "unit": "",
     "label": "The community checks that the job is in a priority sector or occupation and the offer is real",
     "quote": "your job is in a priority sector or occupation and the offer is real"},

    {"page": "work", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=3;minYears=1",
     "label": "At least 1 year (1,560 hours) of related work experience in the past 3 years",
     "quote": "you need at least 1 year (1,560 hours) of related work experience in the past 3 years"},
    {"page": "work", "factor": "workPaid", "op": "rule", "value": "paid-only", "unit": "",
     "label": "Work experience must be paid; volunteer work and unpaid internships don't count",
     "quote": "Volunteer work and unpaid internships don't count."},
    {"page": "work", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "Self-employment does not count toward the work experience requirement",
     "quote": "not be from a self-employed job"},
    {"page": "work", "factor": "workTeerMatch", "op": "rule", "value": "similar-teer", "unit": "",
     "basis": "jobOfferTeer0,1->workTeer0,1,2,3;jobOfferTeer2->workTeer1,2,3,4;"
              "jobOfferTeer3,4->workTeer2,3,4;jobOfferTeer5->sameNoc5",
     "label": "Work experience must be in a similar TEER to the job offer (official table; TEER 5 offers need the same 5-digit NOC)",
     "quote": "be in a similar TEER as your job offer"},
    {"page": "work", "factor": "workTeer5SameNoc", "op": "rule", "value": "same-noc", "unit": "",
     "basis": "appliesTo=jobOfferTeer5",
     "label": "For a TEER 5 job offer the work experience must be in the same 5-digit NOC code",
     "quote": "Same 5-digit NOC code"},
    {"page": "work", "factor": "workExemptGrad", "op": "rule", "value": "exempt-if-community-grad", "unit": "",
     "label": "International students who graduated from a public post-secondary school in the community "
              "are exempt from the work experience requirement",
     "quote": "You don't need to meet the work experience requirement if you're an international student who "
              "graduated from a public post-secondary school in the community with:"},
    {"page": "work", "factor": "workExemptGradCredentialYears", "op": ">=", "value": 2, "unit": "years",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential must be from a program of 2 years or longer (or a master's or higher of 2 years or less)",
     "quote": "an eligible credential in a program of 2 years or longer"},
    {"page": "work", "factor": "workExemptGradRecency", "op": "<=", "value": 18, "unit": "months",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential must have been received no more than 18 months before applying for PR",
     "quote": "got your credential no more than 18 months before applying for permanent residence"},
    {"page": "work", "factor": "workExemptGradResidencyMonths", "op": ">=", "value": 16, "unit": "months",
     "basis": "appliesTo=workExemptGrad;windowMonths=24",
     "label": "Must have been in the community for at least 16 of the last 24 months while studying",
     "quote": "were in the community for at least 16 of the last 24 months while studying"},

    {"stream": "teer-0-1", "page": "lang", "factor": "language", "op": ">=", "value": 6, "unit": "CLB",
     "label": "CLB 6 minimum for a job offer in TEER 0 or 1",
     "quote": "TEER 0 or 1: CLB 6"},
    {"stream": "teer-2-3", "page": "lang", "factor": "language", "op": ">=", "value": 5, "unit": "CLB",
     "label": "CLB 5 minimum for a job offer in TEER 2 or 3",
     "quote": "TEER 2 or 3: CLB 5"},
    {"stream": "teer-4-5", "page": "lang", "factor": "language", "op": ">=", "value": 4, "unit": "CLB",
     "label": "CLB 4 minimum for a job offer in TEER 4 or 5",
     "quote": "TEER 4 or 5: CLB 4"},
    {"page": "lang", "factor": "languageTestAge", "op": "<", "value": 2, "unit": "years",
     "label": "Language test results must be less than 2 years old when you apply",
     "quote": "These results must be less than 2 years old when you apply."},

    {"page": "edu", "factor": "educationCanada", "op": "rule", "value": "canadian-high-school-or-higher", "unit": "",
     "label": "Education in Canada: a Canadian secondary school (high school) diploma or a recognized post-secondary credential",
     "quote": "Canadian secondary school (high school) diploma"},
    {"page": "edu", "factor": "educationForeignEca", "op": "rule", "value": "eca-required", "unit": "",
     "label": "Education outside Canada: an educational credential assessment (ECA) from a designated organization",
     "quote": "An educational credential assessment (ECA) report from a designated organization or professional body that:"},
    {"page": "edu", "factor": "ecaAge", "op": "<", "value": 5, "unit": "years",
     "basis": "appliesTo=educationForeignEca",
     "label": "The ECA must be less than 5 years old on the date you apply",
     "quote": "is less than 5 years old on the date you apply"},

    {"page": "funds", "factor": "fundsExemptWorkPermit", "op": "rule", "value": "exempt-if-working-in-canada", "unit": "",
     "label": "No proof of funds needed if already working in Canada with a valid work permit",
     "quote": "You do not need to show proof of funds if you're already working in Canada with a valid work permit."},
    {"page": "funds", "factor": "fundsPerAdditionalMember", "op": ">=", "value": 2831, "unit": "CAD",
     "basis": "beyondFamilySize=7;asOf=2025-07-29",
     "label": "For each family member beyond 7, add $2,831 CAD",
     "quote": "If more than 7 people, for each additional family member, add $2,831"},

    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 10507, "unit": "CAD",
     "familySize": 1, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 1: $10,507 CAD",
     "quote": "1 $10,507"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 13080, "unit": "CAD",
     "familySize": 2, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 2: $13,080 CAD",
     "quote": "2 $13,080"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 16080, "unit": "CAD",
     "familySize": 3, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 3: $16,080 CAD",
     "quote": "3 $16,080"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 19524, "unit": "CAD",
     "familySize": 4, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 4: $19,524 CAD",
     "quote": "4 $19,524"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 22143, "unit": "CAD",
     "familySize": 5, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 5: $22,143 CAD",
     "quote": "5 $22,143"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 24975, "unit": "CAD",
     "familySize": 6, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 6: $24,975 CAD",
     "quote": "6 $24,975"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 27806, "unit": "CAD",
     "familySize": 7, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 7: $27,806 CAD",
     "quote": "7 $27,806"},
]
"""RCIP 申请人门槛表(人从官方原文抄的结构化行;quote 必须逐字存在于 page 所指页面,否则本步 exit 1)。
TEER 5 job offer 在 RCIP 里能走(语言表明写 TEER 4 or 5,经验表要求同一 5 位 NOC)—— 与 AIP 只认 TEER 0-4 不同,
2026-09-06 Frank「teer 5 是不能走的是吧」的答案就在这两行。"""


# =========================================================================
# 4. fcip 步(FCIP 法语社区试点申请人门槛库,quote-anchored)
# =========================================================================

FCIP_RULES_DOC = """build_fcip_rules — 联邦法语少数族裔社区移民试点(FCIP)申请人门槛库(2026-09-06,随 RCIP 同批;
两个试点共用 canada.ca rural-franco-pilots 一族页面,结构逐页同形,只差语言页:FCIP 只认法语、NCLC 5 四项全达)。
产出 raw/ircc/fcip_rules.json(province='FED' program='FCIP')。收的门槛与 RCIP 段一致,语言一条按 FCIP 页面改。"""
"""本步的判据与产出形状。"""

FCIP_BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/"
             "immigrate-canada/rural-franco-pilots/franco-immigration")
"""FCIP 官方页的公共前缀。"""

FCIP_URL_ELIG = FCIP_BASE + "/eligibility.html"
"""Who can apply(索引页)。"""

FCIP_URL_JOBOFFER = FCIP_BASE + "/job-offer.html"
"""job offer 与社区推荐。"""

FCIP_URL_WORK = FCIP_BASE + "/eligibility/work-experience.html"
"""工作经验门槛 + TEER 相近表 + 社区毕业生豁免。"""

FCIP_URL_LANG = FCIP_BASE + "/eligibility/language-test.html"
"""法语门槛(NCLC 5 四项)。"""

FCIP_URL_FUNDS = FCIP_BASE + "/eligibility/proof-funds.html"
"""安家资金。"""

FCIP_URL_EDU = FCIP_BASE + "/eligibility/education-assessment.html"
"""学历要求 + ECA。"""

OUT_FCIP_RULES = paths.IRCC / "fcip_rules.json"
"""FCIP 申请人门槛表(mart IN_REQ_TABLES 直接消费)。"""

FCIP_CRAWL_SLUG = "fed-rcip"
"""crawl 种子名(FCIP 页与 RCIP 同一个种子 fed-rcip)。"""

FCIP_PAGE_URLS = {"elig": FCIP_URL_ELIG, "joboffer": FCIP_URL_JOBOFFER, "work": FCIP_URL_WORK,
                  "lang": FCIP_URL_LANG, "funds": FCIP_URL_FUNDS, "edu": FCIP_URL_EDU}
"""页键 → 官方 URL。"""

FCIP_PROGRAM = "FCIP"
"""产出文档的 program 字段。"""

FCIP_RULES_NOTE = ("quote-anchored:valueText=官方原文,本步每轮验证其仍逐字在页面上;字段语义见 basis。"
                   "门槛与 RCIP 同形,语言一条不同:只认法语测试(TEF/TCF Canada),NCLC 5 四项全达,不按 TEER 分档。"
                   "社区、优先职业、指定雇主名单不在本表,那是 fcip 域清单的事。")
"""产出文档的 note 字段。"""

FCIP_RULES = [
    {"page": "elig", "factor": "offerDesignatedEmployer", "op": "rule", "value": "designated-in-community", "unit": "",
     "label": "Job offer must come from an employer designated by the recommending community",
     "quote": "have a valid job offer from a designated employer in the community"},
    {"page": "joboffer", "factor": "offerCommunityRecommendation", "op": "rule", "value": "community-recommendation",
     "unit": "",
     "label": "The designated employer sends the community recommendation application to the community for review",
     "quote": "Once you have a valid job offer from a designated employer, they will send your community "
              "recommendation application directly to the community to review."},
    {"page": "joboffer", "factor": "offerPriorityOccupation", "op": "rule", "value": "priority-sector-or-occupation",
     "unit": "",
     "label": "The community checks that the job is in a priority sector or occupation and the offer is real",
     "quote": "your job is in a priority sector or occupation and the offer is real"},

    {"page": "work", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=3;minYears=1",
     "label": "At least 1 year (1,560 hours) of related work experience in the past 3 years",
     "quote": "you need at least 1 year (1,560 hours) of related work experience in the past 3 years"},
    {"page": "work", "factor": "workPaid", "op": "rule", "value": "paid-only", "unit": "",
     "label": "Work experience must be paid; volunteer work and unpaid internships don't count",
     "quote": "Volunteer work and unpaid internships don't count."},
    {"page": "work", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "Self-employment does not count toward the work experience requirement",
     "quote": "not be from a self-employed job"},
    {"page": "work", "factor": "workTeerMatch", "op": "rule", "value": "similar-teer", "unit": "",
     "basis": "jobOfferTeer0,1->workTeer0,1,2,3;jobOfferTeer2->workTeer1,2,3,4;"
              "jobOfferTeer3,4->workTeer2,3,4;jobOfferTeer5->sameNoc5",
     "label": "Work experience must be in a similar TEER to the job offer (official table; TEER 5 offers need the same 5-digit NOC)",
     "quote": "be in a similar TEER as your job offer"},
    {"page": "work", "factor": "workTeer5SameNoc", "op": "rule", "value": "same-noc", "unit": "",
     "basis": "appliesTo=jobOfferTeer5",
     "label": "For a TEER 5 job offer the work experience must be in the same 5-digit NOC code",
     "quote": "Same 5-digit NOC code"},
    {"page": "work", "factor": "workExemptGrad", "op": "rule", "value": "exempt-if-community-grad", "unit": "",
     "label": "International students who graduated from a public post-secondary school in the community "
              "are exempt from the work experience requirement",
     "quote": "You don't need to meet the work experience requirement if you're an international student who "
              "graduated from a public post-secondary school in the community with:"},
    {"page": "work", "factor": "workExemptGradCredentialYears", "op": ">=", "value": 2, "unit": "years",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential must be from a program of 2 years or longer (or a master's or higher of 2 years or less)",
     "quote": "an eligible credential in a program of 2 years or longer"},
    {"page": "work", "factor": "workExemptGradRecency", "op": "<=", "value": 18, "unit": "months",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential must have been received no more than 18 months before applying for PR",
     "quote": "got your credential no more than 18 months before applying for permanent residence"},
    {"page": "work", "factor": "workExemptGradResidencyMonths", "op": ">=", "value": 16, "unit": "months",
     "basis": "appliesTo=workExemptGrad;windowMonths=24",
     "label": "Must have been in the community for at least 16 of the last 24 months while studying",
     "quote": "were in the community for at least 16 of the last 24 months while studying"},

    {"page": "lang", "factor": "languageFrench", "op": ">=", "value": 5, "unit": "NCLC",
     "basis": "allFourAbilities=true;testsAccepted=TEF Canada,TCF Canada",
     "label": "French only: NCLC 5 minimum in all 4 abilities",
     "quote": "You need a minimum score of NCLC 5 in all 4 abilities to apply for the Francophone Community "
              "Immigration Pilot (FCIP)."},

    {"page": "edu", "factor": "educationCanada", "op": "rule", "value": "canadian-high-school-or-higher", "unit": "",
     "label": "Education in Canada: a Canadian secondary school (high school) diploma or a recognized post-secondary credential",
     "quote": "Canadian secondary school (high school) diploma"},
    {"page": "edu", "factor": "educationForeignEca", "op": "rule", "value": "eca-required", "unit": "",
     "label": "Education outside Canada: an educational credential assessment (ECA) from a designated organization",
     "quote": "An educational credential assessment (ECA) report from a designated organization or professional body that:"},
    {"page": "edu", "factor": "ecaAge", "op": "<", "value": 5, "unit": "years",
     "basis": "appliesTo=educationForeignEca",
     "label": "The ECA must be less than 5 years old on the date you apply",
     "quote": "is less than 5 years old on the date you apply"},

    {"page": "funds", "factor": "fundsExemptWorkPermit", "op": "rule", "value": "exempt-if-working-in-canada", "unit": "",
     "label": "No proof of funds needed if already working in Canada with a valid work permit",
     "quote": "You do not need to show proof of funds if you're already working in Canada with a valid work permit."},
    {"page": "funds", "factor": "fundsPerAdditionalMember", "op": ">=", "value": 2831, "unit": "CAD",
     "basis": "beyondFamilySize=7;asOf=2025-07-29",
     "label": "For each family member beyond 7, add $2,831 CAD",
     "quote": "If more than 7 people, for each additional family member, add $2,831"},

    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 10507, "unit": "CAD",
     "familySize": 1, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 1: $10,507 CAD",
     "quote": "1 $10,507"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 13080, "unit": "CAD",
     "familySize": 2, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 2: $13,080 CAD",
     "quote": "2 $13,080"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 16080, "unit": "CAD",
     "familySize": 3, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 3: $16,080 CAD",
     "quote": "3 $16,080"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 19524, "unit": "CAD",
     "familySize": 4, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 4: $19,524 CAD",
     "quote": "4 $19,524"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 22143, "unit": "CAD",
     "familySize": 5, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 5: $22,143 CAD",
     "quote": "5 $22,143"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 24975, "unit": "CAD",
     "familySize": 6, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 6: $24,975 CAD",
     "quote": "6 $24,975"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 27806, "unit": "CAD",
     "familySize": 7, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 7: $27,806 CAD",
     "quote": "7 $27,806"},
]
"""FCIP 申请人门槛表(与 RCIP 表同形,语言一条按 FCIP 页面;quote 逐字核验不过即 exit 1)。"""
