"""
pathways 域常量 —— 全国通道对照表(本域的全部判读)+ 全部字面量(零字符串令:functions 体内不写字面量)。
分段镜像 functions:1 入口 → 2 通道对照表(只有数据,functions 没有这一段)→ 3 读 pnp 产物 → 4 自校 → 5 产出行。
判据照 citations / indexing 样张:常量只装 JSON 装得下的(标量 / 字符串表 / 正则 / 配置 dict)+ IN / OUT 路径;
唯一特批 import = `re` 与 `paths`。每个常量用赋值后的裸字符串 docstring。

对照表的两套名字(2026-09-28 Frank「一个是官方的,一个是我们基于需求整理的直白的」):
- **官方的**:officialName 照抄这条通道自己那一页;drawStreams / reqStreams / quotaScope / occLabels 照抄 pnp 产物里各页的写法
  (同一条通道各页写法不一,一处写法一格,原样存,程序拿它们去对官方数据 —— 本域每轮自校就是对这几格)。
- **我们的**:key 与 plainZh / plainEn / plainKo,直白、按用户需求起,全站只用这一套;官网改名只改官方那几格,编号与显示名不动。
  plainZh / plainKo = 职位板 PNP 格现在的写法(i18n stream.* / pnp.gen.*);plainEn 是 09-28「界面显示直白名,官方原名放灰字」
  立的新名,英文界面换它要到批二、先出效果图(现英文界面有几条还显示官方原名,见各段注)。
编号规则(Frank「肯定换直白的啊?你怎么老偷懒?」):全小写、连字符;省码开头,后接官方通道名里的实词,去掉 AAIP / SINP /
BC PNP 这类项目前缀;联邦与跨省试点不带省码。

批一收录判据(一批只做一种变换 = 立表 + 搬现有对照,不起新名):前端现有对照里出现过的通道 + 九省各自的省默认通道 + AIP。
安省另 6 条旧通道(Employer Job Offer: In-Demand Skills、Masters / PhD Graduate、EE 三条)现页面只显英文、没有中韩名,
收它们等于起新名,留到批二看效果图时一起定;抽选表里不属于任何本站通道的组(阿省 EE 定向行业、曼省 GIP、NB 快速通道等)
照旧只在 lib/jobs 的 DRAW_STREAM_L10N 里。

@author Frank
@time 2026-09-28 14:52:58
"""
import re

import paths

# =========================================================================
# 1. 入口:读 pnp 产物 → 自校 → 对得上才写产物
# =========================================================================

OUT_PATHWAYS = paths.PROCESSED / "pathways" / "pathways.json"
"""输出:通道对照表(每轮自校过了才重写;mart 直通进 data/mart/pathways.json → 库表 pathways)。"""

OUT_INDENT = 2
"""落盘缩进(processed 惯例 2)。"""

BUILT_TIMESPEC = "seconds"
"""产物 built 时刻只到秒(datetime.isoformat 的 timespec)。"""

IN_TPL = ("通道对照表 {n} 条;raw/pnp 现值:抽选组 {draws}、门槛流 {reqs}、配额行 {quotas}、清单 {lists}"
          "(其中会给岗位挂通道名的 {boards})")
"""开轮报数:表多大、拿来对的 pnp 事实各多少。"""

OUT_TPL = "→ {path}"
"""产物路径行。"""

CHECK_FAIL_TPL = "✗ 通道对照表自校没过 {n} 处(不写产物,mart 照旧用上一版):"
"""自校红的总行(之后逐条列)。"""

CHECK_ROW_TPL = "  ✗ {msg}"
"""自校红的逐条行。"""

DONE_TPL = "✓ 通道对照表 {n} 条写出(省默认 {defaults}、挂岗位通道名 {named}、已关停 {closed})"
"""收口行。"""

# 2026-10-02 申请步骤批 2(阿省样张;Frank「做吧,批 2 开始」,设计 docs/design/申请步骤-20261002.md):阿省六条工人类通道共用的步骤件,
# 形照萨省 SKS_STEP_*(批 1 样张)。阿省全部工人类通道都走 Worker EOI → 抽选邀请 → 递申请(官方 how-to-apply 页一页写全),
# 抽选一步引用抽选表(ref:draws,卡点);审理一步引用阿省「已审到哪天收到的申请」游标(ref:processing + metric assessing_up_to_date,
# 按归一键 streamKey 认通道 —— 科技通道原名带一长串括号说明,写死原名官网改一个字就静默不出)。
ABS_HOWTO_URL = "https://www.alberta.ca/how-to-apply-to-aaip-worker-streams"
"""阿省工人类通道申请流程页(WEOI 费与有效期、邀请 15 天、申请 30 天、乡村振兴推荐信在这页)。"""

ABS_AOS_AFTER_URL = "https://www.alberta.ca/aaip-alberta-opportunity-stream-after-you-are-nominated"
"""机会通道拿到提名之后那页(提名有效 6 个月)。"""

ABS_RR_AFTER_URL = "https://www.alberta.ca/aaip-rural-renewal-stream-after-you-are-nominated"
"""乡村振兴通道拿到提名之后那页(提名有效 6 个月,同句)。"""

ABS_EE_AFTER_URL = "https://www.alberta.ca/aaip-alberta-express-entry-stream-after-you-are-nominated"
"""阿省快速通道拿到提名之后那页(30 天内在 EE 接受提名、联邦邀请后 60 天内递永居)。"""

ABS_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                  "facts": [{"ref": "req", "factor": "empYears"}]}
"""拿阿省雇主 offer:雇主条件读门槛卡「雇主条件」行(经营年限 / 年收入 / 员工数,门槛表 empYears 等三行)。"""

ABS_STEP_COMMUNITY = {"step": "community", "who": "you", "none": False, "stuck": False,
                      "facts": [{"key": "communityLetter", "vars": {},
                                 "quote": ("To qualify for selection and receive WEOI points, an endorsement letter from a "
                                           "designated community is required at the time of WEOI submission."),
                                 "url": ABS_HOWTO_URL}]}
"""拿社区推荐信(乡村振兴通道):递 WEOI 时就要有指定社区的推荐信。"""

ABS_STEP_EE_PROFILE = {"step": "eeProfile", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "eeProfile"}]}
"""建 EE 档案(科技、警务两条 EE 版):读门槛卡「EE」行。"""

ABS_STEP_EOI = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                "facts": [{"key": "eoiFee", "vars": {"n": 135},
                           "quote": "Effective April 7, 2026, a $135 fee applies.", "url": ABS_HOWTO_URL},
                          {"key": "eoiValidMonths", "vars": {"n": 12},
                           "quote": "Your WEOI will remain valid in the pool for 12 months.", "url": ABS_HOWTO_URL}]}
"""递 Worker EOI:135 加元,在池里有效 12 个月。"""

ABS_STEP_DRAW = {"step": "draw", "who": "province", "none": False, "stuck": True,
                 "facts": [{"ref": "draws"}]}
"""进池与抽选:挂这条通道的抽选表(卡点 —— 要被抽中才能递申请)。"""

ABS_STEP_APPLY = {"step": "apply", "who": "you", "none": False, "stuck": False,
                  "facts": [{"key": "inviteAcceptDays", "vars": {"n": 15},
                             "quote": "You have 15 days to accept this invitation.", "url": ABS_HOWTO_URL},
                            {"key": "appSubmitDays", "vars": {"n": 30},
                             "quote": ("Once you create an application, you have 30 days to complete, submit, and pay the "
                                       "application fee."),
                             "url": ABS_HOWTO_URL}]}
"""收邀请、递申请:15 天内接受邀请,建好申请后 30 天内递交并付费。"""

ABS_STEP_REVIEW_AOS = {"step": "review", "who": "province", "none": False, "stuck": False,
                       "facts": [{"ref": "processing", "metric": "assessing_up_to_date",
                                  "streamKey": "alberta opportunity stream"}]}
"""省里审批(机会通道):已审到哪天收到的申请。"""

ABS_STEP_REVIEW_TECH = {"step": "review", "who": "province", "none": False, "stuck": False,
                        "facts": [{"ref": "processing", "metric": "assessing_up_to_date",
                                   "streamKey": "accelerated tech pathway"}]}
"""省里审批(科技通道)。"""

ABS_STEP_REVIEW_HEALTH = {"step": "review", "who": "province", "none": False, "stuck": False,
                          "facts": [{"ref": "processing", "metric": "assessing_up_to_date",
                                     "streamKey": "dedicated health care pathways"}]}
"""省里审批(医疗专线,EE 与非 EE 两版合一行)。"""

ABS_STEP_REVIEW_LAW = {"step": "review", "who": "province", "none": False, "stuck": False,
                       "facts": [{"ref": "processing", "metric": "assessing_up_to_date",
                                  "streamKey": "law enforcement pathway"}]}
"""省里审批(警务通道;官方游标写 Not applicable,汇装不出日期行 → 这一步现在不出字,官方哪天写了日期自然出)。"""

ABS_STEP_REVIEW_TOURISM = {"step": "review", "who": "province", "none": False, "stuck": False,
                           "facts": [{"ref": "processing", "metric": "assessing_up_to_date",
                                      "streamKey": "tourism and hospitality stream"}]}
"""省里审批(旅游酒店通道)。"""

ABS_STEP_REVIEW_RURAL = {"step": "review", "who": "province", "none": False, "stuck": False,
                         "facts": [{"ref": "processing", "metric": "assessing_up_to_date",
                                    "streamKey": "rural renewal stream"}]}
"""省里审批(乡村振兴通道)。"""

ABS_NOM_VALID_QUOTE = "Your nomination is only valid for 6 months; you must apply to IRCC before it expires."
"""非 EE 版提名有效期原句(机会通道、乡村振兴两页同句)。"""

ABS_STEP_PR_AOS = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                   "facts": [{"key": "nominationValidMonths", "vars": {"n": 6}, "quote": ABS_NOM_VALID_QUOTE,
                              "url": ABS_AOS_AFTER_URL}]}
"""拿提名,递永居(机会通道):提名有效 6 个月,过期前向联邦递。"""

ABS_STEP_PR_RURAL = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                     "facts": [{"key": "nominationValidMonths", "vars": {"n": 6}, "quote": ABS_NOM_VALID_QUOTE,
                                "url": ABS_RR_AFTER_URL}]}
"""拿提名,递永居(乡村振兴通道)。"""

ABS_STEP_PR_EE = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                  "facts": [{"key": "eeAcceptDays", "vars": {"n": 30},
                             "quote": "You have 30 days to accept the nomination in your online IRCC Express Entry profile.",
                             "url": ABS_EE_AFTER_URL},
                            {"key": "prSubmitDays", "vars": {"n": 60},
                             "quote": ("You will have 60 days after receiving the Invitation to Apply to submit your "
                                       "application for permanent residence online."),
                             "url": ABS_EE_AFTER_URL}]}
"""拿提名,递永居(阿省快速通道:科技、警务):30 天内在 EE 接受提名,联邦邀请后 60 天内递永居。"""

ABS_STEP_PR = {"step": "pr", "who": "federal", "none": False, "stuck": False, "facts": []}
"""拿提名,递永居(医疗专线 EE / 非 EE 两版合一张卡、旅游酒店没有提名之后那页:不写期限,不拿别的通道的原句顶)。"""

# =========================================================================
# 2. 通道对照表(一条通道一段;注释挂官方原句出处与判读理由)
# =========================================================================

PW_AB_OPPORTUNITY = {
    "key": "ab-opportunity", "province": "AB", "program": "PNP",
    "plainZh": "AB 机会通道", "plainEn": "AB Opportunity", "plainKo": "AB 오퍼튜니티 스트림",
    "officialName": "Alberta Opportunity Stream",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Alberta Opportunity Stream"],
    "reqStreams": ["AAIP Alberta Opportunity Stream", "AAIP (job offer & employer requirements, all streams)"],
    "quotaScope": "Alberta Opportunity Stream",
    "occLabels": [],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-alberta-opportunity-stream",
    "quote": ("The Alberta Opportunity Stream is for temporary foreign workers who are already working full-time in Alberta "
              "and have a full-time job offer from an Alberta employer in an eligible occupation."),
    "checked": "2026-09-28",
    "steps": [ABS_STEP_OFFER, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY, ABS_STEP_REVIEW_AOS, ABS_STEP_PR_AOS],
}
"""阿省默认通道:可提名但没挂具名清单的阿省岗落这里(排除式,不在 AAIP 不符合清单上即可)。
抽选组同名(components/pnp GEN_DRAW_STREAM 原注「AB 机会通道(官网 Alberta Opportunity Stream,抽选组同名)」);
门槛流照 GEN_REQ_STREAMS 的 AB 行(2026-09-27 门槛卡批一,Frank「用本岗通道的门槛,开工」);配额行 = aaip-processing-information
页的通道行(抽选组名小写与配额键逐字相等,前端原先靠这条隐式规则配上;这里写明,不再靠碰巧同名)。
英文界面现显示官方原名(pnp.gen.AB = Alberta Opportunity Stream),plainEn 是批二要换上的直白名。
2026-09-30 通道补全批二:抽选组加认领「Alberta Opportunity Stream – Priority Sectors」(轮次名写明属机会通道,批一清点时是无主组;
阿省默认岗的抽选卡本岗高亮随之多这一组)。
同日撤回(Frank「这种基本属于没有通道啊」):那组今年只在 2 月 20 日抽过一轮,标成本岗那组等于说这是一条现行的路;不再认领,
它照旧作为本省一组列在抽选卡里。"""

# 2026-09-29 七省门槛卡合并(Frank「都接上,开工吧」):阿省六条通道的 reqStreams 都在末尾挂上雇主门槛所在的
# 「AAIP (job offer & employer requirements, all streams)」—— 门槛卡雇主行改读本通道登记的流(原读全省,曼省唯一的雇主行属
# 雇主直招 EDI、会串到 SWM 卡上);挂在末尾,来源钮按登记顺序取出处,仍指向通道自己的资格页。
PW_AB_ACCELERATED_TECH = {
    "key": "ab-accelerated-tech", "province": "AB", "program": "PNP",
    "plainZh": "AB 科技", "plainEn": "AB Tech", "plainKo": "AB 테크",
    "officialName": "Accelerated Tech Pathway",
    "boardLabel": "AB 科技", "isDefault": False,
    "drawStreams": ["Alberta Express Entry Stream – Accelerated Tech Pathway"],
    "reqStreams": ["AAIP Alberta Express Entry Stream", "AAIP Alberta Express Entry Stream — Accelerated Tech Pathway",
                   "AAIP (job offer & employer requirements, all streams)"],
    "quotaScope": "Accelerated Tech Pathway (eligible list of occupations includes jobs that support data centre needs in Alberta)",
    "occLabels": ["AB 科技"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-alberta-express-entry-stream",
    "quote": ("a job offer for an eligible tech occupation from an Alberta employer in an eligible tech industry "
              "under the Accelerated Tech Pathway."),
    "checked": "2026-09-28",
    "steps": [ABS_STEP_EE_PROFILE, ABS_STEP_OFFER, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY,
              ABS_STEP_REVIEW_TECH, ABS_STEP_PR_EE],
}
"""阿省加速科技通道(EE 流的一支,清单 ab-tech.json)。
门槛流两条 = EE 流最低要求 + 专线本身(components/pnp NAMED_REQ_STREAMS 原注「阿省科技加速专线:EE 流最低要求 + 专线两条」)。
配额行:官方 Table 7 这一行带括号补充说明,原样照抄(括号里的话官网一改,本域当轮就红 —— 这正是要的);
抽选组名与配额名不同字,前端原先靠人工对照表 QUOTA_STREAM_KEYS 配(2026-09-27 九省体检,Frank「问题太多了」)。
英文界面现显示官方原名(stream.abTech = Accelerated Tech Pathway)。"""

PW_AB_DEDICATED_HEALTH_CARE = {
    "key": "ab-dedicated-health-care", "province": "AB", "program": "PNP",
    "plainZh": "AB 医疗", "plainEn": "AB Health", "plainKo": "AB 보건",
    "officialName": "Dedicated Health Care Pathway",
    "boardLabel": "AB 医疗", "isDefault": False,
    "drawStreams": ["Dedicated Health Care Pathway – Express Entry", "Dedicated Health Care Pathway – non-Express Entry"],
    "reqStreams": ["AAIP Dedicated Health Care Pathway — Non-Express Entry", "AAIP (job offer & employer requirements, all streams)"],
    "quotaScope": "Dedicated Health Care Pathways",
    "occLabels": ["AB 医疗"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-application-streams",
    "quote": ("Dedicated Health Care Pathway – Qualified individuals with job offers in eligible health care professions "
              "can apply to be nominated for permanent residence in Alberta."),
    "checked": "2026-09-28",
    "steps": [ABS_STEP_OFFER, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY, ABS_STEP_REVIEW_HEALTH, ABS_STEP_PR],
}
"""阿省医护专项(9 类受监管医护职业,清单 ab-health.json)。
抽选:EE 与非 EE 两版分开抽,两组都算(NAMED_DRAW_STREAMS 原注;另一组 Priority Sectors (Health Care) 是 EE 的医疗行业定向,
范围比 9 个受监管职业宽,不算)。门槛流登非 EE 版(持 offer 在阿省工作、没有 EE 档案也能走的那一版;2026-09-27 门槛卡批一)。
配额行:官方 Table 6 写复数「Dedicated Health Care Pathways」,与抽选组名单复数不同字(QUOTA_STREAM_KEYS 原注)。
⚠ 抽选卡现把两组分别叫「AB 医疗(EE)」「AB 医疗(非 EE)」(lib/jobs DRAW_STREAM_L10N),表里只有通道名一个 —— 两组怎么区分归批二效果图。
英文界面现显示官方原名(stream.abHealth = Dedicated Health Care Pathway)。"""

PW_AB_LAW_ENFORCEMENT = {
    "key": "ab-law-enforcement", "province": "AB", "program": "PNP",
    "plainZh": "AB 警务", "plainEn": "AB Law Enforcement", "plainKo": "AB 경찰",
    "officialName": "Law Enforcement Pathway",
    "boardLabel": "AB 警务", "isDefault": False,
    "drawStreams": ["Alberta Express Entry Stream – Law Enforcement Pathway"],
    "reqStreams": ["AAIP Alberta Express Entry Stream", "AAIP (job offer & employer requirements, all streams)"],
    "quotaScope": "Law Enforcement Pathway",
    "occLabels": ["AB 警务"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-alberta-express-entry-stream",
    "quote": ("a job offer from an Alberta Association of Chiefs of Police member in one of the eligible police services "
              "occupations under the Law Enforcement Pathway."),
    "checked": "2026-09-28",
    "steps": [ABS_STEP_EE_PROFILE, ABS_STEP_OFFER, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY,
              ABS_STEP_REVIEW_LAW, ABS_STEP_PR_EE],
}
"""阿省警务专项(EE 流的一支,清单 ab-law.json,官方列出 3 个职业码)。
门槛流只有 EE 流最低要求(官方资格页只写了 EE 流的,NAMED_REQ_STREAMS 原注)。配额行 = 官方 Table 7 同名行(QUOTA_STREAM_KEYS 原注)。
英文界面现显示官方原名(stream.abLaw = Law Enforcement Pathway)。"""

PW_AB_TOURISM_HOSPITALITY = {
    "key": "ab-tourism-hospitality", "province": "AB", "program": "PNP",
    "plainZh": "AB 旅游酒店", "plainEn": "AB Tourism & Hospitality", "plainKo": "AB 관광 숙박",
    "officialName": "Tourism and Hospitality Stream",
    "boardLabel": "AB 旅游酒店", "isDefault": False,
    "drawStreams": ["Tourism and Hospitality Stream"],
    "reqStreams": ["AAIP Tourism and Hospitality Stream", "AAIP (job offer & employer requirements, all streams)"],
    "quotaScope": "Tourism and Hospitality Stream",
    "occLabels": ["AB 旅游酒店"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-application-streams",
    "quote": ("Tourism and Hospitality Stream – Qualified candidates who live and work in Alberta and have a full-time job offer "
              "to continue working with an Alberta tourism and hospitality sector employer."),
    "checked": "2026-09-28",
    "steps": [ABS_STEP_OFFER, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY, ABS_STEP_REVIEW_TOURISM, ABS_STEP_PR],
}
"""阿省旅游酒店通道(清单 ab-tourism.json;雇主须属合格旅游酒店行业)。
门槛流 = 2026-09-27 同批从官方资格页补抓的五条所在的流。配额行与抽选组同名(前端原先靠隐式同名配上)。
英文界面现显示官方原名(stream.abTourism = Tourism and Hospitality Stream)。"""

# 2026-10-03 申请步骤批 2(卑诗;Frank「做吧,批 2 开始」,设计 docs/design/申请步骤-20261002.md):卑诗七条通道共用的步骤件,
# 形照阿省 ABS_STEP_*。技术工人与 Care / Build 五条定向都走 雇主 offer → 网上注册打分 → 抽选邀请 → 递申请(skills-immigration
# 页 Process 段一页写全六步:Choose your stream / Register online / Wait for an invitation to apply / Submit your BC PNP
# application / Wait for your nomination decision / Submit your IRCC application);定向五条是同一个注册池里按职业挑人的轮
# (指南 7.3(a)),步骤与技术工人同一套,抽选一步各挂各的 drawStreams。审理一步引用处理时长(processing_months 的 Application 行,
# 约八成申请 3 个月)。卫生局流不注册、不抽选,原句只在指南 PDF 7.1(「If you meet the requirements for the Health Authority stream,
# you can apply directly to the stream; you do not need to submit a registration.」)—— 指南在 crawl 的 file_cache、不在 html
# 缓存,自校核不上,「进池与抽选 —— 不需要」一步先不登,只登网页核得上的几步;递申请一步照设计 3.1 用无抽选的叫法 confirm。
# 2026-10-03 Frank「都修一下」:自校改为网页缓存没有的再读 file_cache 的 PDF 原件(crawl get_cached_file),这一步补登
# (BCS_STEP_DIRECT_HA)。
BCS_SI_URL = "https://www.welcomebc.ca/immigrate-to-b-c/skills-immigration"
"""卑诗技术移民页(雇主声明表、注册在池 12 个月、邀请后 30 天递申请、处理时长表都在这页;For workers 页同文)。"""

BCS_GUIDE_URL = "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf"
"""卑诗技术移民项目指南 PDF(crawl 的 files-www.welcomebc.ca 原件;卫生局流「不用注册、直接递」只写在这份,7.1 节)。"""

BCS_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                  "facts": [{"ref": "req", "factor": "empYears"},
                            {"key": "employerDeclaration", "vars": {},
                             "quote": ("Must have the support of your employer before registering and submit a "
                                       "completed Employer Declaration Form"),
                             "url": BCS_SI_URL}]}
"""拿卑诗雇主 offer(技术工人与五条定向):雇主条件读门槛卡「雇主条件」行(经营年限 / 员工数,门槛表 empYears 等行);注册前要
雇主签雇主声明表(资格表 Employer support 那一格的技术工人列,格里没有句号,照抄)。"""

BCS_STEP_OFFER_HA = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                     "facts": [{"ref": "req", "factor": "empYears"},
                               {"key": "employerDeclaration", "vars": {},
                                "quote": ("Must have the support of an authorized personnel from your health authority "
                                          "employer before applying and submit a completed Employer Declaration Form"),
                                "url": BCS_SI_URL}]}
"""拿卫生局 offer(卫生局流):递申请前要卫生局授权人员签雇主声明表(同一格的卫生局列)。雇主条件行照挂(门槛流登了 all
streams;指南 4.2(g) 卫生局流同样要满足 Part 6 雇主条件)。"""

BCS_STEP_REGISTER = {"step": "register", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "eoiValidMonths", "vars": {"n": 12},
                                "quote": ("Your registration will remain active in the pool for up to 12 months, or "
                                          "until you receive an invitation to apply."),
                                "url": BCS_SI_URL}]}
"""网上注册打分(卑诗叫 registration、不叫 EOI;同页「After registering, you will receive a score based on the information you
provided.」):在池里最多 12 个月。"""

BCS_STEP_DRAW = {"step": "draw", "who": "province", "none": False, "stuck": True,
                 "facts": [{"ref": "draws"}]}
"""进池与抽选:挂这条通道的抽选表(卡点 —— 要被邀请才能递申请;技术工人挂 Innovate 轮,定向五条挂各自的 Care / Build 轮)。"""

BCS_STEP_APPLY = {"step": "apply", "who": "you", "none": False, "stuck": False,
                  "facts": [{"key": "inviteSubmitDays", "vars": {"n": 30},
                             "quote": ("If you are invited to apply after registering, you will have up to 30 calendar "
                                       "days from the date of invitation to submit a complete application using the BC "
                                       "PNP Online User Portal."),
                             "url": BCS_SI_URL}]}
"""收邀请、递申请:邀请发出后 30 天内递齐申请(过期邀请作废、注册移出池)。"""

BCS_STEP_DIRECT_HA = {"step": "draw", "who": "province", "none": True, "stuck": False,
                      "facts": [{"key": "directApply", "vars": {},
                                 "quote": ("If you meet the requirements for the Health Authority stream, you can apply "
                                           "directly to the stream; you do not need to submit a registration."),
                                 "url": BCS_GUIDE_URL}]}
"""进池与抽选 —— 不需要(卫生局通道,2026-10-03 补登):持卫生局 offer 直接递,不注册、不进池(指南 7.1)。事实词复用萨省的
directApply(「不需要:持 offer 直接申请」—— 卫生局流本就要卫生局 offer,同义,不另立词)。"""

BCS_STEP_SUBMIT_HA = {"step": "submit", "who": "you", "none": False, "stuck": False, "facts": []}
"""递申请(卫生局通道:持卫生局 offer 直接递,不注册不抽选;递件期限网页没写,不写)。2026-10-03 lead 合并时由 confirm 改 submit ——
卫生局没有「确认职位」这一步,借萨省 EPA 的「确认职位、递申请」会读错。"""

BCS_STEP_REVIEW = {"step": "review", "who": "province", "none": False, "stuck": False,
                   "facts": [{"ref": "processing", "metric": "processing_months", "scope": "Application"}]}
"""省里审批:处理时长读运营统计 processing_months 的 Application 行(skills-immigration 页处理时长表,约八成申请 3 个月)。"""

BCS_STEP_PR = {"step": "pr", "who": "federal", "none": False, "stuck": False, "facts": []}
"""拿提名,递永居:网页只写在提名确认信到期前递(「before your Confirmation of Nomination document expires」),没写月数,
不写。"""

# 2026-10-03 申请步骤批 2(安省):两条现行通道(劳动力优先、自雇医生)共用的步骤件,形照萨省 SKS_STEP_* 与阿省 ABS_STEP_*。
# 持 offer 的走 雇主登记并递 job offer → 你递 EOI → 抽选邀请 → 雇主递职位审批(14 天)→ 你递申请(17 天)(劳动力优先页
# Steps to apply with a job offer 三步 + application-process 页 Deadlines 段;页上「you cannot submit your application until
# your employer submits their application for approval of an employment position」,所以雇主那步排在前);自雇医生不要 offer:
# EOI → 抽选 → 递申请(17 天)。两条同一组抽选、08-04 开放 EOI 后还没抽过(drawsPending),抽选一步照样挂抽选表、标卡点。
# 审理一步运营统计里没有安省处理时长行,不写。经快速通道提名是选项(TEER 0-3 与自雇医生),拿提名一步只写非 EE 版的提名证书
# 有效期,EE 版两句(30 天内接受、60 天内递永居)不混进来。已关停的两条 Employer Job Offer 不登。
ONS_PROCESS_URL = "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp-application-process"
"""安省申请流程页(offer 递出后 30 天内递 EOI、EOI 有效 12 个月、雇主 14 天与申请人 17 天两个期限、提名证书有效 6 个月都在
这页)。"""

ONS_ITA_URL = "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp-invitations-apply"
"""安省抽选结果页(自雇医生收到邀请后 17 天内递那句在 Overview 段)。"""

ONS_STEP_REGISTER = {"step": "employerRegister", "who": "employer", "none": False, "stuck": False,
                     "facts": [{"ref": "req", "factor": "empYears"}]}
"""雇主登记(在雇主门户登记公司、为你的职位递 job offer;劳动力优先页「Your employer must start the process by registering
their business and providing information about your position by submitting a job offer in the Employer Portal.」):经营年限
读门槛表 empYears 行(经营满 3 年等雇主条件)。"""

ONS_STEP_EOI = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                "facts": [{"key": "offerEoiDays", "vars": {"n": 30},
                           "quote": ("You will have 30 calendar days from the date the job offer was submitted to "
                                     "register your EOI."),
                           "url": ONS_PROCESS_URL},
                          {"key": "eoiValidMonths", "vars": {"n": 12},
                           "quote": ("Your EOI registration will remain valid for 12 months until you receive an "
                                     "invitation to apply."),
                           "url": ONS_PROCESS_URL}]}
"""递 EOI(劳动力优先):雇主递 job offer 后 30 天内递(过期 offer 作废、雇主要重递),在池里有效 12 个月。"""

ONS_STEP_EOI_PHYSICIAN = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                          "facts": [{"key": "eoiValidMonths", "vars": {"n": 12},
                                     "quote": ("Your EOI registration will remain valid for 12 months until you "
                                               "receive an invitation to apply."),
                                     "url": ONS_PROCESS_URL}]}
"""递 EOI(自雇医生:先递网上表单、由省里开始注册,同页「please submit a Webform to begin the process of registering an
EOI」,怎么递不写成事实):在池里有效 12 个月。"""

ONS_STEP_DRAW = {"step": "draw", "who": "province", "none": False, "stuck": True,
                 "facts": [{"ref": "draws"}]}
"""进池与抽选:挂抽选表(卡点;两条同一组「Ontario Workforce Priority Stream」,还没抽过,表里那一行写暂无邀请)。"""

ONS_STEP_EPA = {"step": "epa", "who": "employer", "none": False, "stuck": False,
                "facts": [{"key": "inviteSubmitDays", "vars": {"n": 14},
                           "quote": ("Employer application for an approval of an employment position must be "
                                     "submitted within 14 calendar days from the date the invitation to apply was "
                                     "issued."),
                           "url": ONS_PROCESS_URL}]}
"""雇主递职位审批(劳动力优先):邀请发出后 14 天内,雇主先递,你才能递申请。"""

ONS_STEP_APPLY = {"step": "apply", "who": "you", "none": False, "stuck": False,
                  "facts": [{"key": "inviteSubmitDays", "vars": {"n": 17},
                             "quote": ("Application for a nomination certificate (applicant) must be submitted with "
                                       "the application fee paid within 17 calendar days from the date the invitation "
                                       "to apply was issued to you."),
                             "url": ONS_PROCESS_URL}]}
"""收邀请、递申请(劳动力优先):邀请发出后 17 天内递并付费。"""

ONS_STEP_APPLY_PHYSICIAN = {"step": "apply", "who": "you", "none": False, "stuck": False,
                            "facts": [{"key": "inviteSubmitDays", "vars": {"n": 17},
                                       "quote": ("If you are applying as a self-employed physician, you must "
                                                 "submit your application within 17 calendar days of receiving the "
                                                 "invitation to apply."),
                                       "url": ONS_ITA_URL}]}
"""收邀请、递申请(自雇医生):收到邀请后 17 天内递。"""

ONS_STEP_REVIEW = {"step": "review", "who": "province", "none": False, "stuck": False, "facts": []}
"""省里审批:运营统计里没有安省处理时长行,不写。"""

ONS_STEP_PR = {"step": "pr", "who": "federal", "none": False, "stuck": False,
               "facts": [{"key": "nominationValidMonths", "vars": {"n": 6},
                          "quote": ("Your Confirmation of Nomination (nomination certificate) is valid for 6 months "
                                    "from the date of your nomination."),
                          "url": ONS_PROCESS_URL}]}
"""拿提名,递永居(非 EE 版):提名证书自提名日起有效 6 个月,到期前向联邦递(同页下一句「You must apply for permanent
residence before your nomination certificate expires.」)。"""

PW_AB_RURAL_RENEWAL = {
    "key": "ab-rural-renewal", "province": "AB", "program": "PNP",
    "plainZh": "AB 乡村振兴", "plainEn": "AB Rural Renewal", "plainKo": "AB 농촌 재생",
    "officialName": "Rural Renewal Stream",
    "boardLabel": "AB 乡村振兴", "isDefault": False,
    "drawStreams": ["Rural Renewal Stream"],
    "reqStreams": ["AAIP Rural Renewal Stream", "AAIP (job offer & employer requirements, all streams)"],
    "quotaScope": "Rural Renewal Stream",
    "occLabels": ["AB 乡村振兴"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-rural-renewal-stream",
    "quote": ("The Rural Renewal Stream empowers rural communities to recruit and retain foreign nationals to live, work and "
              "settle in their communities."),
    "checked": "2026-09-28",
    "steps": [ABS_STEP_COMMUNITY, ABS_STEP_OFFER, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY,
              ABS_STEP_REVIEW_RURAL, ABS_STEP_PR_RURAL],
}
"""阿省乡村振兴(按指定社区判:岗位城市在社区名单、职业不在它的 17 个排除码里,社区表 ab-rural.json;2026-09-24 第三批)。
配额行与抽选组同名。英文界面现显示官方原名(stream.abRural = Rural Renewal Stream)。"""

PW_BC_SKILLED_WORKER = {
    "key": "bc-skilled-worker", "province": "BC", "program": "PNP",
    "plainZh": "BC 技术工人", "plainEn": "BC Skilled Worker", "plainKo": "BC 숙련 노동자",
    "officialName": "Skilled Worker stream",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Innovate: High Economic Impact"],
    "reqStreams": ["BC PNP Skills Immigration (all streams)", "BC PNP Skilled Worker stream"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/skills-immigration",
    "quote": ("Through Skills Immigration, workers who meet specific eligibility criteria based on their job offer can choose "
              "to apply to the Skilled Worker or Health Authority stream."),
    "checked": "2026-09-28",
    "steps": [BCS_STEP_OFFER, BCS_STEP_REGISTER, BCS_STEP_DRAW, BCS_STEP_APPLY, BCS_STEP_REVIEW, BCS_STEP_PR],
}
"""卑诗默认通道:可提名(只收 TEER 0-3,2026-09-24 九省通道审计)但不在定向清单上的卑诗岗落这里。
抽选组:BC 现行抽选只剩定向类别轮与 Innovate 这一种不限职业的轮 —— 不在定向清单上的岗只能从这一轮进,门槛是薪资或分数
(GEN_DRAW_STREAM 原注,2026-09-24 第三批 Frank「能都改完吗」)。官方原句(about-the-bc-provincial-nominee-program 页):
「The BC PNP issues High Economic Impact invitations to apply to attract top talent across all sectors, including experienced
entrepreneurs.」这一组不是本通道自己的名字(是 Innovate 类别的轮),所以抽选卡给它写通道名灰字、三语都出。
门槛卡没接(2026-09-27 只先上 AB,其余八省逐省补原句;接之前这格空 = 不出卡,与现状一致)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流两条(pnp bc-req 的流名)= 指南 Part 3 通用要求「BC PNP Skills
Immigration (all streams)」(语言、3.7 执业资格;雇主侧三条门槛卡按省取)+ 4.1 技术工人专条「BC PNP Skilled Worker stream」
(近 10 年内 24 个月经验)。"""

PW_BC_HEALTH_AUTHORITY = {
    "key": "bc-health-authority", "province": "BC", "program": "PNP",
    "plainZh": "BC 卫生局", "plainEn": "BC Health Authority", "plainKo": "BC 보건 당국",
    "officialName": "Health Authority stream",
    "boardLabel": "BC 卫生局", "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["BC PNP Skills Immigration (all streams)", "BC PNP Health Authority stream"],
    "quotaScope": None,
    "occLabels": ["BC 卫生局"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/news",
    "quote": ("The BC PNP Health Authority stream will continue to nominate qualified healthcare professionals who work in the "
              "public sector directly delivering healthcare services."),
    "checked": "2026-09-28",
    "steps": [BCS_STEP_OFFER_HA, BCS_STEP_DIRECT_HA, BCS_STEP_SUBMIT_HA, BCS_STEP_REVIEW, BCS_STEP_PR],
}
"""卑诗卫生局通道(雇主须是省卫生局,清单 bc-health-authority.json)。抽选卡没有这条通道自己的组,不登记 = 不高亮(与现状一致)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流两条 = 指南 Part 3 通用要求「BC PNP Skills Immigration (all streams)」+
4.2 卫生局流专条「BC PNP Health Authority stream」(4.2(f) 卫生局要求的执照)。不挂技术工人流:卫生局流没有 24 个月经验门槛
(skills-immigration 页原句「Must meet the work experience required by the BC PNP and your B.C. health authority employer」),
门槛卡这条通道不出经验一行。"""

PW_BC_HEALTHCARE = {
    "key": "bc-healthcare", "province": "BC", "program": "PNP",
    "plainZh": "BC 医疗", "plainEn": "BC Health", "plainKo": "BC 보건",
    "officialName": "Care: Health",
    "boardLabel": "BC 医疗", "isDefault": False,
    "drawStreams": ["Care: Health"],
    "reqStreams": ["BC PNP Skills Immigration (all streams)", "BC PNP Skilled Worker stream"],
    "quotaScope": None,
    "occLabels": ["BC 医疗"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("British Columbia has a critical need for workers in key sectors of the care economy, particularly in healthcare, "
              "education, childcare, and veterinary care."),
    "checked": "2026-09-28",
    "steps": [BCS_STEP_OFFER, BCS_STEP_REGISTER, BCS_STEP_DRAW, BCS_STEP_APPLY, BCS_STEP_REVIEW, BCS_STEP_PR],
}
"""卑诗医疗定向(2026 新政 Care 类的医疗组,清单 bc-health.json)。officialName 照抄邀请页的类别名(BC 的定向是类别轮,不是单独的 stream)。
英文界面现显示官方原名(stream.bcHealth = Care: Health)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):定向邀请是 Skills Immigration 注册池里按职业挑人的抽选轮(指南 7.3(a)
「Invitations may be targeted to support B.C. government priorities, such as supporting specific business sectors」;
卫生局流不用注册、不进池),资格门槛就是技术工人那一套 —— 挂同一组门槛流,不复制行(Care / Build 另四条同判)。
官方另写的定向邀请条件「To receive a targeted invitation to apply, individuals with a job offer that is classified under
NOC 33102 must be registered with the BC Care Aide & Community Health Worker Registry.」
(about-the-bc-provincial-nominee-program 页)没单起一行:指南 3.7 对 33102 本就写了这条,门槛卡「其他」行的
「职业所需执照或注册」已涵盖。"""

PW_BC_CHILDCARE = {
    "key": "bc-childcare", "province": "BC", "program": "PNP",
    "plainZh": "BC 幼教", "plainEn": "BC Childcare", "plainKo": "BC 보육",
    "officialName": "Care: Childcare",
    "boardLabel": "BC 幼教", "isDefault": False,
    "drawStreams": ["Care: Childcare"],
    "reqStreams": ["BC PNP Skills Immigration (all streams)", "BC PNP Skilled Worker stream"],
    "quotaScope": None,
    "occLabels": ["BC 幼教"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("Certified early childhood educators, French-speaking elementary and secondary school teachers, and veterinarians and "
              "veterinary technologists who are working toward Canadian certification will be prioritized."),
    "checked": "2026-09-28",
    "steps": [BCS_STEP_OFFER, BCS_STEP_REGISTER, BCS_STEP_DRAW, BCS_STEP_APPLY, BCS_STEP_REVIEW, BCS_STEP_PR],
}
"""卑诗幼教定向(清单 bc-childcare.json)。英文界面现显示官方原名(stream.bcChildcare = Care: Childcare)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):门槛流同技术工人(判据见 bc-healthcare 段)。官方另写的定向邀请条件
「To receive a targeted invitation to apply, early childhood educators (ECEs) must have a one-year or five-year ECE
certificate issued by the ECE Registry.」没单起一行:门槛卡「其他」行的「职业所需执照或注册」已涵盖;
要写明「ECE 证书」得门槛卡加写法。"""

PW_BC_VETERINARY = {
    "key": "bc-veterinary", "province": "BC", "program": "PNP",
    "plainZh": "BC 兽医", "plainEn": "BC Veterinary", "plainKo": "BC 수의",
    "officialName": "Care: Veterinary Care",
    "boardLabel": "BC 兽医", "isDefault": False,
    "drawStreams": ["Care: Veterinary Care"],
    "reqStreams": ["BC PNP Skills Immigration (all streams)", "BC PNP Skilled Worker stream"],
    "quotaScope": None,
    "occLabels": ["BC 兽医"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("Certified early childhood educators, French-speaking elementary and secondary school teachers, and veterinarians and "
              "veterinary technologists who are working toward Canadian certification will be prioritized."),
    "checked": "2026-09-28",
    "steps": [BCS_STEP_OFFER, BCS_STEP_REGISTER, BCS_STEP_DRAW, BCS_STEP_APPLY, BCS_STEP_REVIEW, BCS_STEP_PR],
}
"""卑诗兽医定向(清单 bc-vet.json,2 个码)。英文界面现显示官方原名(stream.bcVet = Care: Veterinary Care)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):门槛流同技术工人(判据见 bc-healthcare 段)。官方另写的定向邀请条件(抽选页
Veterinary Care 轮的选人条件「Animal health technologists and veterinary technicians (NOC 32104) with valid professional
designation」)没单起一行:门槛卡「其他」行的「职业所需执照或注册」已涵盖。"""

PW_BC_CONSTRUCTION_TRADES = {
    "key": "bc-construction-trades", "province": "BC", "program": "PNP",
    "plainZh": "BC 建筑技工", "plainEn": "BC Construction Trades", "plainKo": "BC 건설 기능직",
    "officialName": "Build: Construction Trades",
    "boardLabel": "BC 建筑技工", "isDefault": False,
    "drawStreams": ["Build: Construction Trades"],
    "reqStreams": ["BC PNP Skills Immigration (all streams)", "BC PNP Skilled Worker stream"],
    "quotaScope": None,
    "occLabels": ["BC 建筑技工"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("To see which workers may benefit from targeted invitations to apply, see the Build section of the BC PNP's "
              "selection of workers list."),
    "checked": "2026-09-28",
    "steps": [BCS_STEP_OFFER, BCS_STEP_REGISTER, BCS_STEP_DRAW, BCS_STEP_APPLY, BCS_STEP_REVIEW, BCS_STEP_PR],
}
"""卑诗建筑技工定向(2026 新政 Build 类,清单 bc-construction.json)。英文界面现显示官方原名(stream.bcConstr = Build: Construction Trades)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):门槛流同技术工人(判据见 bc-healthcare 段;判定引擎 BC-build 早按同一套挑行,
cms lib/pathways「Build 是 Skills Immigration 池里的定向抽选,资格门槛与 Skilled Worker 同一套」)。官方另写的定向邀请条件
「To receive a targeted invitation to apply, workers in construction trades must have a valid trade certificate issued
by, or have a trades apprenticeship registered with, SkilledTradesBC which corresponds with the job they have been
offered.」没单起一行:门槛卡「其他」行的「职业所需执照或注册」已涵盖。"""

PW_BC_FRENCH_TEACHERS = {
    "key": "bc-french-teachers", "province": "BC", "program": "PNP",
    "plainZh": "BC 法语教师", "plainEn": "BC French Teachers", "plainKo": "BC 프랑스어 교사",
    "officialName": "Care: Education",
    "boardLabel": "BC 法语教师", "isDefault": False,
    "drawStreams": ["Care: Education"],
    "reqStreams": ["BC PNP Skills Immigration (all streams)", "BC PNP Skilled Worker stream"],
    "quotaScope": None,
    "occLabels": ["BC 法语教师"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("Certified early childhood educators, French-speaking elementary and secondary school teachers, and veterinarians and "
              "veterinary technologists who are working toward Canadian certification will be prioritized."),
    "checked": "2026-09-28",
    "steps": [BCS_STEP_OFFER, BCS_STEP_REGISTER, BCS_STEP_DRAW, BCS_STEP_APPLY, BCS_STEP_REVIEW, BCS_STEP_PR],
}
"""卑诗法语教师定向(Care 类的教育组只收讲法语的中小学教师,清单 bc-education.json)。清单码带雇主行业条件:看得出雇主是学校
才挂这条通道名(2026-09-27 Frank 拍板「看得出才改判」),所以 09-28 板上暂时 0 岗 —— 通道照收,名字要在。
英文界面现显示官方原名(stream.bcEdu = Care: Education)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):门槛流同技术工人(判据见 bc-healthcare 段)。官方另写的定向邀请条件
「To receive a targeted invitation to apply, French-speaking teachers (NOC 41220 or 41221) must be employed in B.C.’s
public K-12 system and have a CLB 5 or higher in French.」没入表:法语 CLB 5 记成语言行,门槛卡会写成「英语或法语每项 CLB 5」
(把法语专项说成英法任一);门槛量尺按省全量挑职业码点名的语言行,还会把 41220 / 41221(TEER 1)的判定从「注册时不要求
语言成绩」改成 CLB 5 —— 写法待定。公立 K-12 雇主那半句由清单的雇主行业条件管(上一段)。"""

# 2026-10-02 申请步骤批 1(萨省样张;Frank「每个省 每个通道 EE PNP AIP 都要有吧」,设计 docs/design/申请步骤-20261002.md 第 3.1 节):
# 萨省各通道共用的步骤件。一步一个 dict:step 步骤词 / who 谁做 / none 这一步不需要 / stuck 卡点(只给数据说得出的:官方明写没有排定抽选)/
# facts 事实行 —— 别的表里已有的事实只写引用(ref:req 门槛行、processing 处理时长、intake 收件窗口、draws 抽选表),
# 别处没有的才存官方原句(quote + url,自校逐句对 crawl 缓存)。限额行业那行不标 stuck:本岗属于哪个行业不判(公司表没有行业字段),
# 卡上写成「限额行业:…」条件句。
SKS_FAQ_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
               "saskatchewan-immigrant-nominee-program/immigration-faqs")
"""萨省移民 FAQ 页(EPA 通过后 10 天确认、60 天递申请那句在这页)。"""

SKS_STATS_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
                 "saskatchewan-immigrant-nominee-program/sinp-processing-statistics")
"""萨省处理统计页(限额行业只在六个收件窗口递那句、窗口表都在这页)。"""

SKS_ISW_BASE = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
                "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/")
"""萨省国际技术工人类页面前缀。"""

SKS_EXP_BASE = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
                "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-with-saskatchewan-experience/")
"""萨省本省经验类页面前缀。"""

SKS_STEP_REGISTER = {"step": "employerRegister", "who": "employer", "none": False, "stuck": False,
                     "facts": [{"ref": "req", "factor": "empYears"}]}
"""雇主登记:经营年限读门槛表 empYears 行(雇主登记页不在 crawl 缓存,原句随门槛行走,这里不另存)。"""

SKS_STEP_EPA_PRIORITY = {"step": "epa", "who": "employer", "none": False, "stuck": False,
                         "facts": [{"ref": "processing", "scope": "Employer Position Assessments"}]}
"""雇主递职位审批(三条 Talent Pathway:医疗 / 科技 / 农业都是优先行业,不设收件窗口):审批时长读处理统计。"""

SKS_STEP_EPA_CAPPED = {"step": "epa", "who": "employer", "none": False, "stuck": False,
                       "facts": [{"ref": "processing", "scope": "Employer Position Assessments"},
                                 {"key": "cappedEmployees", "vars": {},
                                  "quote": ("Capped sectors are limited to supporting current employees with valid temporary "
                                            "residency status"),
                                  "url": SKS_STATS_URL},
                                 {"key": "windowCapped", "vars": {"months": 6},
                                  "quote": ("Employers in capped sectors can only submit applications during one of the six "
                                            "intake windows in 2026, and if their candidate has 6 months or less remaining on "
                                            "their work permit."),
                                  "url": SKS_STATS_URL},
                                 {"ref": "intake"}]}
"""雇主递职位审批(雇主 offer / 现有工签 / 学生三条:收限额行业的岗):审批时长 + 限额行业只收现有员工 + 只在收件窗口递且工签剩
6 个月以内 + 最近窗口表。「只收现有员工」原定进门槛卡身份行(设计 3.4),门槛卡身份行要新编码,同日改挂在这一步(两句原句同页)。"""

SKS_STEP_DIRECT = {"step": "draw", "who": "province", "none": True, "stuck": False,
                   "facts": [{"key": "directApply", "vars": {},
                              "quote": "An employment offer provides applicants with the ability to apply directly to the SINP.",
                              "url": SKS_ISW_BASE + "connecting-family-members-to-saskatchewans-labour-market"}]}
"""进池与抽选 —— 不需要:持萨省雇主 offer 直接申请(国际技术工人类持 offer 的四条:雇主 offer、医疗、科技、农业)。"""

SKS_STEP_NO_EOI = {"step": "draw", "who": "province", "none": True, "stuck": False,
                   "facts": [{"key": "eoiOnlyOther", "vars": {},
                              "quote": ("If you are eligible under the Occupations In-Demand or Express Entry , you will be able "
                                        "to submit an Expression of Interest (EOI)."),
                              "url": SKS_ISW_BASE + "international-skilled-worker-eoi-system"}]}
"""进池与抽选 —— 不需要(本省经验类两条:现有工签、学生):官方写明只有 Occupations In-Demand 与 Express Entry 递 EOI。
原句里「Express Entry ,」逗号前那个空格是页面链接断开留下的,照抄(自校去掉全部空白再比)。"""

SKS_STEP_CONFIRM = {"step": "confirm", "who": "you", "none": False, "stuck": False,
                    "facts": [{"key": "confirmSubmit", "vars": {"confirm": 10, "submit": 60},
                               "quote": ("The candidate has 10 calendar days to review and confirm the EPA details, and 60 "
                                         "calendar days from the date they were identified on the conditionally approved EPA "
                                         "to submit their SINP application."),
                               "url": SKS_FAQ_URL}]}
"""确认职位、递申请(凡走 EPA 的六条):审批有条件通过后 10 天内确认、60 天内递申请。"""

SKS_STEP_PR = {"step": "pr", "who": "federal", "none": False, "stuck": False, "facts": []}
"""拿提名,递永居(非 EE 版:向 IRCC 递纸面 / 在线永居申请;联邦处理时长不在省页,先不写)。"""

SKS_STEP_EOI = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                "facts": [{"ref": "req", "factor": "pointsMin"}]}
"""递 EOI(无 offer 的两条):本省打分表门槛读门槛表 pointsMin 行。"""

SKS_STEP_NO_DRAW_SCHEDULED = {"step": "draw", "who": "province", "none": False, "stuck": True,
                              "facts": [{"key": "noScheduledDraw", "vars": {},
                                         "quote": "There are no scheduled EOI draws at this time.",
                                         "url": SKS_ISW_BASE + "international-skilled-worker-eoi-system"}]}
"""进池与抽选(无 offer 的两条):官方原话「目前没有排定的抽选」—— 卡点(stuck)。抽选结果 PDF 最后一轮 2024-09-12,
不进抽选表(弹框只看近 12 个月);要不要另挂一行等 Frank 看样张。"""

SKS_STEP_INVITED = {"step": "apply", "who": "you", "none": False, "stuck": False,
                    "facts": [{"key": "inviteSubmitDays", "vars": {"n": 60},
                               "quote": ("You will have 60 days to submit a complete online application to the SINP and "
                                         "provide documents."),
                               "url": SKS_ISW_BASE + "international-skilled-worker-eoi-system"}]}
"""收邀请、递申请(无 offer 的两条):60 天内递。"""

SKS_STEP_EE_PROFILE = {"step": "eeProfile", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "eeProfile"}]}
"""建 EE 档案(萨省快速通道):读门槛表 eeProfile 行。"""

SKS_STEP_PR_EE = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                  "facts": [{"key": "eeAcceptDays", "vars": {"n": 30},
                             "quote": "You have 30 days to accept the SINP nomination in the Express Entry system.",
                             "url": SKS_ISW_BASE + "procedures-and-guidelines"},
                            {"key": "prSubmitDays", "vars": {"n": 60},
                             "quote": "You have 60 days to submit this application.",
                             "url": SKS_ISW_BASE + "procedures-and-guidelines"}]}
"""拿提名,递永居(萨省快速通道):30 天内在 EE 系统接受提名,IRCC 发邀请后 60 天内递永居。"""

SKS_STEP_WORK = {"step": "work", "who": "you", "none": False, "stuck": False,
                 "facts": [{"key": "workMonths", "vars": {"n": 6},
                            "quote": ("Have worked for at least six-months (780 hours) of full-time (30+ hours per week) work "
                                      "experience in the job with the employer that has supported you with the Employer "
                                      "Position Assessment, with a valid work permit."),
                            "url": SKS_EXP_BASE + "applicants-with-existing-work-permit"}]}
"""在这份工作上干够(现有工签通道):持有效工签在支持你的雇主处全职满 6 个月(780 小时)。"""


SKS_STEP_REVIEW_EO = {"step": "review", "who": "province", "none": False, "stuck": False,
                      "facts": [{"ref": "processing", "scope": "Employment Offer"}]}
"""省里审批(雇主 offer):处理时长读处理统计「Employment Offer」那一行。"""

SKS_STEP_REVIEW_HEALTH = {"step": "review", "who": "province", "none": False, "stuck": False,
                          "facts": [{"ref": "processing", "scope": "Health Talent Pathway"}]}
"""省里审批(医疗):处理时长读处理统计「Health Talent Pathway」那一行。"""

SKS_STEP_REVIEW_TECH = {"step": "review", "who": "province", "none": False, "stuck": False,
                        "facts": [{"ref": "processing", "scope": "Innovation and Tech Talent Pathway"}]}
"""省里审批(科技):处理时长读处理统计「Innovation and Tech Talent Pathway」那一行。"""

SKS_STEP_REVIEW_AGRI = {"step": "review", "who": "province", "none": False, "stuck": False,
                        "facts": [{"ref": "processing", "scope": "Agriculture Talent Pathway"}]}
"""省里审批(农业):处理时长读处理统计「Agriculture Talent Pathway」那一行。"""

SKS_STEP_REVIEW_EWP = {"step": "review", "who": "province", "none": False, "stuck": False,
                       "facts": [{"ref": "processing", "scope": "Existing Work Permit"}]}
"""省里审批(现有工签):处理时长读处理统计「Existing Work Permit」那一行。"""

SKS_STEP_REVIEW_STUDENTS = {"step": "review", "who": "province", "none": False, "stuck": False,
                            "facts": [{"ref": "processing", "scope": "International Students"}]}
"""省里审批(学生):处理时长读处理统计「International Students」那一行。"""

SKS_STEP_REVIEW_NONE = {"step": "review", "who": "province", "none": False, "stuck": False, "facts": []}
"""省里审批(无 offer 的两条):处理统计没有这两类的时长行,不写。"""

# 2026-09-29 七省门槛卡合并:萨省四条通道(EO 与三条定向)、NL 技术工人在 reqStreams 末尾挂上本省雇主门槛所在的「all streams」流 ——
# 门槛卡雇主行改读本通道登记的流(原读全省;曼省唯一的雇主行属 EDI,不挂),挂在末尾,来源钮仍按登记顺序指向通道自己的页。
PW_SK_EMPLOYMENT_OFFER = {
    "key": "sk-employment-offer", "province": "SK", "program": "PNP",
    "plainZh": "SK 雇主 offer", "plainEn": "SK Employment Offer", "plainKo": "SK 고용 오퍼",
    "officialName": "International Skilled Worker: Employment Offer",
    "boardLabel": None, "isDefault": True,
    "drawStreams": [],
    "reqStreams": ["SINP International Skilled Worker (Employment Offer / Occupations In-Demand)",
                   "SINP International Skilled Worker: Employment Offer",
                   "SINP International Skilled Worker (with an employment offer)", "SINP — Employer Certificate of Registration (all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": ("International Skilled Worker: Employment Offer: For high-skilled workers (occupations that typically require "
              "post-secondary education) who are not working in Saskatchewan."),
    "checked": "2026-09-28",
    "steps": [SKS_STEP_REGISTER, SKS_STEP_EPA_CAPPED, SKS_STEP_DIRECT, SKS_STEP_CONFIRM, SKS_STEP_REVIEW_EO, SKS_STEP_PR],
}
"""萨省默认通道:持萨省雇主 offer 的高技能岗(排除式,不在 Job Offer 不合格清单上即可)。
萨省这条不经 EOI 抽选(2026-09-27 bb38b884「持 offer 直接申请、不经 EOI」),没有抽选组;门槛卡没接。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流三条(pnp sk-req 的流名)—— 与 OID / EE 共用的那条(语言 CLB 4、
近 10 年内 12 个月经验、打分表 ≥ 60 分)、Employment Offer 自己那条(执照条款)、持 offer 直接申请那条(不经 EOI 抽选,门槛卡暂不读)。
走不了省提名而有原因的萨省岗(兼职、合同工……)也按这条出门槛卡(cms gateChannelOf)。
2026-09-30 通道补全批一 1b:共用流改名「SINP International Skilled Worker (Employment Offer / Occupations In-Demand)」(去掉 Express
Entry;立项稿第四节第 3 条,pnp SKR_STREAM 注),三行照旧(EO / OID 两页交叉核对)。"""

PW_SK_HEALTH_TALENT = {
    "key": "sk-health-talent", "province": "SK", "program": "PNP",
    "plainZh": "SK 医疗", "plainEn": "SK Health", "plainKo": "SK 보건",
    "officialName": "Health Talent Pathway",
    "boardLabel": "SK 医疗", "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["SINP Health Talent Pathway — Non-Express Entry",
                   "SINP International Skilled Worker (with an employment offer)", "SINP — Employer Certificate of Registration (all streams)"],
    "quotaScope": None,
    "occLabels": ["SK 医疗"],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": "Health Talent Pathway: For physicians, nurses and other health workers.",
    "checked": "2026-09-28",
    "steps": [SKS_STEP_REGISTER, SKS_STEP_EPA_PRIORITY, SKS_STEP_DIRECT, SKS_STEP_CONFIRM, SKS_STEP_REVIEW_HEALTH,
              SKS_STEP_PR],
}
"""萨省医疗人才通道(清单 sk-health.json)。萨省 Talent Pathway 不公布抽选,没有抽选组。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流 —— 本通道非 EE 版那条(语言 CLB 5、近 5 年内 12 个月经验、执照;
在担保雇主处 6 个月的替代路径记 experienceAlt)+ 持 offer 直接申请那条。只登非 EE 版,照 AB 医疗专线的先例:EE 版要联邦 EE 档案、
CLB 7,登进来门槛卡会把 EE 档案写成必备。
2026-09-30 通道补全批一 1b:EE 版门槛入表(pnp sk-req 流「SINP Health Talent Pathway — Express Entry」:EE 池、CLB 7、近 5 年 1 年
经验、执照;立项稿第四节第 3 条「快速通道选项门槛没收」),本行照旧不挂 —— 理由即上句,等门槛卡按版本分张再挂。"""

PW_SK_TECH_TALENT = {
    "key": "sk-tech-talent", "province": "SK", "program": "PNP",
    "plainZh": "SK 科技", "plainEn": "SK Tech", "plainKo": "SK 테크",
    "officialName": "Innovation and Tech Talent Pathway",
    "boardLabel": "SK 科技", "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["SINP Innovation and Tech Talent Pathway — Non-Express Entry",
                   "SINP International Skilled Worker (with an employment offer)", "SINP — Employer Certificate of Registration (all streams)"],
    "quotaScope": None,
    "occLabels": ["SK 科技"],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": "Innovation and Tech Talent Pathway: For innovation and tech sector workers in 32 high-skilled occupations.",
    "checked": "2026-09-28",
    "steps": [SKS_STEP_REGISTER, SKS_STEP_EPA_PRIORITY, SKS_STEP_DIRECT, SKS_STEP_CONFIRM, SKS_STEP_REVIEW_TECH,
              SKS_STEP_PR],
}
"""萨省创新与科技人才通道(清单 sk-tech.json,32 个职业)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流 —— 本通道非 EE 版那条(语言 CLB 5、近 5 年内 12 个月经验、执照;
在担保雇主处 6 个月的替代路径记 experienceAlt)+ 持 offer 直接申请那条。只登非 EE 版(理由同医疗那条)。
2026-09-30 通道补全批一 1b:EE 版门槛入表(流「SINP Innovation and Tech Talent Pathway — Express Entry」:EE 池、近 5 年 1 年经验 +
在萨省担保雇主处 6 个月的替代路径、执照;语言写的是联邦 EE 标准、没有本省数,不收),本行照旧不挂(理由同医疗那条)。"""

PW_SK_AGRICULTURE_TALENT = {
    "key": "sk-agriculture-talent", "province": "SK", "program": "PNP",
    "plainZh": "SK 农业", "plainEn": "SK Agriculture", "plainKo": "SK 농업",
    "officialName": "Agriculture Talent Pathway",
    "boardLabel": "SK 农业", "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["SINP Agriculture Talent Pathway",
                   "SINP International Skilled Worker (with an employment offer)", "SINP — Employer Certificate of Registration (all streams)"],
    "quotaScope": None,
    "occLabels": ["SK 农业"],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": ("Agriculture Talent Pathway: For general farm workers, nursery/greenhouse workers and workers in select food and "
              "beverage processing occupations."),
    "checked": "2026-09-28",
    "steps": [SKS_STEP_REGISTER, SKS_STEP_EPA_PRIORITY, SKS_STEP_DIRECT, SKS_STEP_CONFIRM, SKS_STEP_REVIEW_AGRI,
              SKS_STEP_PR],
}
"""萨省农业人才通道(清单 sk-agri.json;带星号的码要看得出雇主在农业食品行业才挂,2026-09-27「看得出才改判」)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流 —— 本通道那条(语言 CLB 4、近 3 年内 12 个月经验;在担保雇主处
6 个月的替代路径记 experienceAlt;资格清单没有执照条款)+ 持 offer 直接申请那条。"""

# 2026-10-03 申请步骤批 2(曼省;设计 docs/design/申请步骤-20261002.md):曼省四条通道共用的步骤件,形照萨省 SKS_STEP_*
# (批 1 样张)与阿省 ABS_STEP_*。四条通道页的「Apply」钮都指向同一页 How to Apply(原句「This process applies to the pathways
# under the Skilled Worker Stream and the International Education Stream」):递 EOI → 收到 LAA 递完整申请 → 审理 → 提名 →
# 提名后 180 天内向联邦递永居。抽选一步引用抽选表(ref:draws,卡点);毕业生就业通道(CEP)没登抽选组,改挂 2026-06-11 官方
# 通告原句。审理一步引用年报平均处理天数(ref:processing + metric processing_days,按 scope 原名认)。收到 LAA 后几天内递、
# 申请费,这四条的页面都没写(120 天期限与 2,500 加元申请费只写在商业移民类、国际学生创业试点的页上),不写。安置计划
# (Settlement Plan)是在线申请里的一部分(supporting documents 页「The Settlement Plan is part of MPNP Online」),流程页
# 不单列,不用 settle 步。
MBS_APPLY_URL = "https://immigratemanitoba.com/mpnp/apply"
"""曼省申请流程页(五步流程、提名后 180 天内向联邦递永居在这页)。"""

MBS_EOI_URL = "https://immigratemanitoba.com/mpnp/apply/eoi"
"""曼省 EOI 页(档案有效一年在这页)。"""

MBS_EOI_FAQ_URL = "https://immigratemanitoba.com/resources/faq/eoi"
"""曼省 EOI 常见问题页(递 EOI 不收费在这页)。"""

MBS_SWM_URL = "https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility"
"""曼省技术工人通道(SWM)资格页(持有效工签在这家公司连续全职满 6 个月在这页)。"""

MBS_CEP_NEWS_URL = ("https://immigratemanitoba.com/2026/06/important-update-for-manitoba-provincial-nominee-program-"
                    "international-education-stream-ies-career-employment-pathway-cep-candidates")
"""曼省 2026-06-11 毕业生就业通道(CEP)通告页(在池 EOI 转技术工人通道抽选在这页)。"""

MBS_STEP_WORK = {"step": "work", "who": "you", "none": False, "stuck": False,
                 "facts": [{"key": "workMonths", "vars": {"n": 6},
                            "quote": ("Ongoing Manitoba employment means that you possess a valid work permit and a "
                                      "Manitoba company has offered you a full-time, long-term job after you have "
                                      "completed six months or more of continuous full-time employment with that "
                                      "company"),
                            "url": MBS_SWM_URL}]}
"""在这份工作上干够(技术工人通道 SWM):持有效工签在这家公司连续全职满 6 个月。原句截到逗号前 —— 后半句是外省毕业生满
一年的另一款,在门槛卡(门槛表 SWM 外省毕业生流 12 个月那行)。门槛表也有 6 个月那行(factor experience),步骤引用不认
experience,照萨省 SKS_STEP_WORK 存原句。"""

MBS_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False, "facts": []}
"""拿曼省雇主 offer(SWM:工作满 6 个月后的长期全职 offer;CEP:至少一年合同、职业在在需职业表上)。曼省门槛表唯一的
雇主行属雇主直招 EDI,这两条的门槛流里没有 empYears 行,不写。"""

MBS_STEP_EOI = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                "facts": [{"key": "noFee", "vars": {}, "quote": "There is no fee to submit an EOI.",
                           "url": MBS_EOI_FAQ_URL},
                          {"key": "eoiValidMonths", "vars": {"n": 12},
                           "quote": "Your profile will be valid for one year from the day you submit it.",
                           "url": MBS_EOI_URL}]}
"""递 EOI(曼省四条):不收费(事实词 noFee,与新不伦瑞克 EOI 免费同词);在池里有效一年(原句「one year」,按 12 个月填
eoiValidMonths)。"""

MBS_STEP_DRAW = {"step": "draw", "who": "province", "none": False, "stuck": True,
                 "facts": [{"ref": "draws"}]}
"""进池与抽选:挂这条通道的抽选表(卡点 —— 要收到 LAA 才能递申请)。"""

MBS_STEP_DRAWS_MOVED = {"step": "draw", "who": "province", "none": False, "stuck": True,
                        "facts": [{"key": "movedToSwm", "vars": {"n": 6},
                                   "quote": ("Candidates with active Expression of Interest (EOI) profiles under the "
                                             "CEP and who have gained at least six months of work experience in "
                                             "Manitoba are invited to transition into the Skilled Worker in Manitoba "
                                             "pathway, where they can be considered in future EOI draws alongside "
                                             "other skilled workers on a priority basis."),
                                   "url": MBS_CEP_NEWS_URL}]}
"""进池与抽选(毕业生就业通道 CEP):官方请本省工作满 6 个月的在池 EOI 转技术工人通道参加抽选 —— 卡点(stuck)。通道表
标签 drawsStopped(6 月起没再抽选)的出处即这句;CEP 没登抽选组,不挂抽选表。"""

MBS_STEP_APPLY = {"step": "apply", "who": "you", "none": False, "stuck": False, "facts": []}
"""收邀请(LAA)、递完整申请:官方流程页只写收到 LAA 后递完整申请,没写几天内递,不写。"""

MBS_STEP_REVIEW_SWM = {"step": "review", "who": "province", "none": False, "stuck": False,
                       "facts": [{"ref": "processing", "metric": "processing_days",
                                  "scope": "Skilled Worker in Manitoba"}]}
"""省里审批(技术工人通道 SWM):年报平均处理天数「Skilled Worker in Manitoba」那一行。"""

MBS_STEP_REVIEW_SWO = {"step": "review", "who": "province", "none": False, "stuck": False,
                       "facts": [{"ref": "processing", "metric": "processing_days",
                                  "scope": "Skilled Worker Overseas"}]}
"""省里审批(海外技工通道 SWO):年报平均处理天数「Skilled Worker Overseas」那一行。"""

MBS_STEP_REVIEW_IES = {"step": "review", "who": "province", "none": False, "stuck": False,
                       "facts": [{"ref": "processing", "metric": "processing_days",
                                  "scope": "International Education"}]}
"""省里审批(国际教育类 CEP、GIP 两条):年报平均处理天数「International Education」那一行(年报按大类,不分两条)。"""

MBS_STEP_PR = {"step": "pr", "who": "federal", "none": False, "stuck": False,
               "facts": [{"key": "nominationValidDays", "vars": {"n": 180},
                          "quote": ("Within 180 days from the date of nomination, make a separate application to the "
                                    "Government of Canada for permanent residence for you and your family."),
                          "url": MBS_APPLY_URL}]}
"""拿提名,递永居(曼省四条):提名后 180 天内向联邦另递永居申请(原句是天数,不折成月,另立 nominationValidDays)。"""

# 2026-10-03 申请步骤批 2(新斯科舍;设计同上):新斯科舍六条通道共用的步骤件,形同上。EOI 即完整申请(官方 eoi-process
# 页「Candidates (NSNP) and employers (AIP) will continue to submit full applications. These submissions are treated as
# EOIs and entered into an EOI pool.」),没有单独「收邀请、递申请」一步;按月从 EOI 池选取(NSNP 各流与 AIP 同一个池,
# ref:draws,卡点);2026-09-01 起选中后 7 天内更新材料并交 1,000 加元申请费才进审理(省提名总页 How it works);提名后
# 12 个月内向联邦递永居(三个流页同句)。官方没有处理时长统计,不写。
NSS_EOI_PROCESS_URL = "https://liveinnovascotia.com/eoi-process"
"""新斯科舍 EOI 流程页(EOI 即完整申请、按期选取在这页)。"""

NSS_NSNP_URL = "https://liveinnovascotia.com/nova-scotia-nominee-program"
"""新斯科舍省提名总页(How it works 四段:递 EOI → 抽选 → 选中后 7 天内更新材料并交费 → 审理,在这页)。"""

NSS_FEES_URL = "https://liveinnovascotia.com/resources/nsnp-update-application-fees-effective-september-1-2026"
"""新斯科舍申请费通告页(递 EOI 不收费、工人类各流 1,000 加元在这页)。"""

NSS_EOI_VALID_URL = ("https://liveinnovascotia.com/resources/"
                     "expression-interest-eoi-validity-period-and-transition-measures")
"""新斯科舍 EOI 有效期通告页(2026-05-01 起递的 EOI 12 个月没被选中即过期在这页)。"""

NSS_SW_URL = "https://liveinnovascotia.com/skilled-worker"
"""新斯科舍 Skilled Worker 流页(技术工人 / 建筑 / 医生三个 tab;TEER 4-5 在本雇主 6 个月、餐饮住宿业暂停收件、
提名后 12 个月内递永居在这页)。"""

NSS_GRAD_URL = "https://liveinnovascotia.com/nova-scotia-graduate"
"""新斯科舍本省毕业生流页(提名后 12 个月内递永居在这页)。"""

NSS_EE_URL = "https://liveinnovascotia.com/express-entry"
"""新斯科舍快速通道页(本省经验 / 医生两个 tab;本省经验满一年、餐饮住宿业暂停收件、兴趣信后 30 天内递、提名后
12 个月内递永居在这页)。"""

NSS_EOI_APP_QUOTE = "Candidates (NSNP) and employers (AIP) will continue to submit full applications."
"""EOI 即完整申请的原句(eoi-process 页「Submit your expression of interest:」一条)。"""

NSS_EOI_FREE_QUOTE = "There is no fee to submit an EOI."
"""递 EOI 不收费的原句(申请费通告页;事实词 noFee,与新不伦瑞克 EOI 免费同词)。"""

NSS_EOI_VALID_QUOTE = "EOIs not selected within 12 months will expire and be removed from the pool."
"""EOI 有效期原句(有效期通告页;2026-05-01 前递的按过渡安排另有到期日,不写)。"""

NSS_AFS_QUOTE = ("As of 12 noon ADT, April 17, 2024, the Nova Scotia Provincial Nominee Program has a significant "
                 "volume of submissions for candidates in the Accommodation and Food Services sector awaiting a "
                 "decision and must stop accepting submissions in this sector while processing current inventory.")
"""餐饮住宿业暂停收件的原句(Skilled Worker 流页、快速通道页同句;建筑 / 本省毕业生 / 医生不涉及这个行业,不挂)。"""

NSS_NOM_VALID_QUOTE = ("Within twelve (12) months of receiving your nominee certificate, apply to Immigration, "
                       "Refugees and Citizenship Canada (IRCC) for your permanent resident visa.")
"""提名后 12 个月内递永居的原句(Skilled Worker、本省毕业生、快速通道三个流页同句)。"""

NSS_STEP_OFFER_SW = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                     "facts": [{"ref": "req", "factor": "empYears"},
                               {"key": "teer45EmployerMonths", "vars": {"n": 6},
                                "quote": ("Workers in TEER 4 or 5 of the National Occupational Classification must "
                                          "already have six months’ experience with the employer."),
                                "url": NSS_SW_URL}]}
"""拿新斯科舍雇主 offer(技术工人):雇主条件读门槛卡「雇主条件」行(门槛表全流 empYears,在本省经营满 2 年)+ TEER 4-5
须已在这家雇主工作满 6 个月(条件句,本岗 TEER 由卡上自己对;这一款门槛表 09-29 抽过又撤,理由是判定引擎会误读,
步骤卡只陈列不判定)。原句在页上括号里,months’ 的撇号是 U+2019,照抄。"""

NSS_STEP_OFFER_EMP = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                      "facts": [{"ref": "req", "factor": "empYears"}]}
"""拿新斯科舍雇主 offer(建筑):雇主条件读门槛卡「雇主条件」行;建筑 tab 没有 TEER 4-5 在本雇主 6 个月那一款。"""

NSS_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False, "facts": []}
"""拿 offer(本省毕业生:页上四个职业、与所学对口;医生两条:NS Health / IWK 批准的职位)。这三条的门槛流里没有
empYears 行,不写。"""

NSS_STEP_WORK = {"step": "work", "who": "you", "none": False, "stuck": False,
                 "facts": [{"key": "localWorkMonths", "vars": {"n": 12},
                            "quote": ("have at least one year of experience working in Nova Scotia in an occupation "
                                      "at TEER 0, 1, 2, or 3 of the National Occupational Classification"),
                            "url": NSS_EE_URL}]}
"""在这份工作上干够(快速通道本省经验):在本省 TEER 0-3 职业工作满一年(原句「one year」,按 12 个月填;资格清单里的一条,
截到分号前)。门槛表也有这一行(factor experience),步骤引用不认 experience,照萨省 SKS_STEP_WORK 存原句。"""

NSS_STEP_EE_PROFILE = {"step": "eeProfile", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "eeProfile"}]}
"""建 EE 档案(快速通道两条):读门槛卡「EE」行。"""

NSS_STEP_LETTER = {"step": "interestLetter", "who": "province", "none": False, "stuck": False, "facts": []}
"""收到省兴趣信(快速通道医生):资格条件「receive a Letter of Interest from the Nova Scotia Nominee Program within the Express
Entry system」;官方写省里收到 EE 档案号与 NS Health / IWK 批准职位后就发,不是竞争性抽选 —— 不写事实,也不标卡点。形照新不伦瑞克
NBS_STEP_LETTER;兴趣信发到联邦 EE 档案里,排在建 EE 档案之后。"""

NSS_STEP_EOI = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                "facts": [{"key": "eoiIsApplication", "vars": {}, "quote": NSS_EOI_APP_QUOTE,
                           "url": NSS_EOI_PROCESS_URL},
                          {"key": "noFee", "vars": {}, "quote": NSS_EOI_FREE_QUOTE, "url": NSS_FEES_URL},
                          {"key": "eoiValidMonths", "vars": {"n": 12}, "quote": NSS_EOI_VALID_QUOTE,
                           "url": NSS_EOI_VALID_URL}]}
"""递 EOI(建筑、本省毕业生、医生):EOI 即完整申请,不收费,12 个月没被选中即过期。"""

NSS_STEP_EOI_SW = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"key": "eoiIsApplication", "vars": {}, "quote": NSS_EOI_APP_QUOTE,
                              "url": NSS_EOI_PROCESS_URL},
                             {"key": "noFee", "vars": {}, "quote": NSS_EOI_FREE_QUOTE, "url": NSS_FEES_URL},
                             {"key": "eoiValidMonths", "vars": {"n": 12}, "quote": NSS_EOI_VALID_QUOTE,
                              "url": NSS_EOI_VALID_URL},
                             {"key": "afsPaused", "vars": {}, "quote": NSS_AFS_QUOTE, "url": NSS_SW_URL}]}
"""递 EOI(技术工人):同上三行 + 餐饮住宿业暂停收件(本岗属于哪个行业不判,公司表没有行业字段;不标 stuck,卡上是
条件句,同萨省限额行业那行)。"""

NSS_STEP_EOI_EE = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"key": "eoiIsApplication", "vars": {}, "quote": NSS_EOI_APP_QUOTE,
                              "url": NSS_EOI_PROCESS_URL},
                             {"key": "noFee", "vars": {}, "quote": NSS_EOI_FREE_QUOTE, "url": NSS_FEES_URL},
                             {"key": "eoiValidMonths", "vars": {"n": 12}, "quote": NSS_EOI_VALID_QUOTE,
                              "url": NSS_EOI_VALID_URL},
                             {"key": "afsPaused", "vars": {}, "quote": NSS_AFS_QUOTE, "url": NSS_EE_URL}]}
"""递 EOI(快速通道本省经验):同技术工人那步,暂停收件原句挂快速通道页(同句)。"""

NSS_STEP_EOI_LETTER = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                       "facts": [{"key": "letterSubmitDays", "vars": {"n": 30},
                                  "quote": ("submit your EOI within 30 calendar days of the date on which your "
                                            "Letter of Interest was issued"),
                                  "url": NSS_EE_URL},
                                 {"key": "eoiIsApplication", "vars": {}, "quote": NSS_EOI_APP_QUOTE,
                                  "url": NSS_EOI_PROCESS_URL},
                                 {"key": "noFee", "vars": {}, "quote": NSS_EOI_FREE_QUOTE, "url": NSS_FEES_URL},
                                 {"key": "eoiValidMonths", "vars": {"n": 12}, "quote": NSS_EOI_VALID_QUOTE,
                                  "url": NSS_EOI_VALID_URL}]}
"""递 EOI(快速通道医生):收到省兴趣信后 30 天内递(资格清单里的一条,截到分号前)+ 同上三行。"""

NSS_STEP_DRAW = {"step": "draw", "who": "province", "none": False, "stuck": True,
                 "facts": [{"ref": "draws"}]}
"""进池与抽选:挂按月选取那一组(六条同池;卡点 —— 要被选中才进审理)。"""

NSS_STEP_REVIEW = {"step": "review", "who": "province", "none": False, "stuck": False,
                   "facts": [{"key": "eoiFee", "vars": {"n": 1000},
                              "quote": ("$1,000 for the NSNP worker streams (Skilled Worker, Nova Scotia Graduate, "
                                        "Nova Scotia: Express Entry)"),
                              "url": NSS_FEES_URL},
                             {"key": "selectedPayDays", "vars": {"n": 7},
                              "quote": ("If your submission is selected, you will receive a notification with "
                                        "instructions and have 7 calendar days to review your application, upload any "
                                        "updated documents and pay the application fee."),
                              "url": NSS_NSNP_URL}]}
"""省里审批(新斯科舍六条):2026-09-01 起交 1,000 加元申请费;选中后 7 天内更新材料并交费,才进审理(省提名总页 How it works
「If You Are Selected」一段;申请费通告页另有只讲交费的同义句)。费额复用 eoiFee(三语文案「交 N 加元申请费」同义;键名带 eoi
是阿省先例,新斯科舍这笔费在选中后交,通告页原句「There is no fee to submit an EOI.」)。官方没有处理时长统计,不写。
选中后这 7 天是更新已递的申请、不是另递一份,不另立「收邀请、递申请」一步。"""

NSS_STEP_PR_SW = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                  "facts": [{"key": "nominationValidMonths", "vars": {"n": 12}, "quote": NSS_NOM_VALID_QUOTE,
                             "url": NSS_SW_URL}]}
"""拿提名,递永居(Skilled Worker 流:技术工人、建筑、医生):提名后 12 个月内向联邦递永居。"""

NSS_STEP_PR_GRAD = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                    "facts": [{"key": "nominationValidMonths", "vars": {"n": 12}, "quote": NSS_NOM_VALID_QUOTE,
                               "url": NSS_GRAD_URL}]}
"""拿提名,递永居(本省毕业生)。"""

IRCC_EE_APPLY_URL = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/"
                     "apply-permanent-residence.html")
"""联邦 EE「Apply for permanent residence」页(crawl 的 fed-ee 种子;邀请有效 60 天写在这页)。"""

EE_PR_SUBMIT_FACT = {"key": "prSubmitDays", "vars": {"n": 60},
                     "quote": "Your invitation to apply is valid for 60 days only.",
                     "url": IRCC_EE_APPLY_URL}
"""收到联邦邀请后 60 天内递永居(2026-10-03 申请步骤批 2 收尾,Frank「都修一下」):联邦规定、各省同一条,省页没写的快速通道
(新斯科舍两条、新不伦瑞克两条、纽芬兰、爱德华王子岛)引 IRCC 原句;阿省、萨省省页自己写了,照旧引省页。"""

NSS_STEP_PR_EE = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                  "facts": [{"key": "nominationValidMonths", "vars": {"n": 12}, "quote": NSS_NOM_VALID_QUOTE,
                             "url": NSS_EE_URL},
                            EE_PR_SUBMIT_FACT]}
"""拿提名,递永居(快速通道两条):快速通道页写的也是提名后 12 个月内递永居;EE 系统里几天内接受提名、几天内递永居,
新斯科舍页没写,不拿别省的原句顶。
2026-10-03:联邦邀请后 60 天内递永居是联邦规定,改引 IRCC 原句(EE_PR_SUBMIT_FACT);接受提名的天数仍没有出处,不写。"""

PW_SK_EXISTING_WORK_PERMIT = {
    "key": "sk-existing-work-permit", "province": "SK", "program": "PNP",
    "plainZh": "SK 现有工签", "plainEn": "SK Existing Work Permit", "plainKo": "SK 기존 취업허가",
    "officialName": "Skilled Worker With Existing Work Permit",
    "boardLabel": "SK 现有工签", "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["SINP — Employer Certificate of Registration (all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": ("Skilled-Worker with Existing Work Permit: For high-skilled foreign workers (with post-secondary education) with "
              "a valid work permit."),
    "checked": "2026-09-28",
    "steps": [SKS_STEP_WORK, SKS_STEP_REGISTER, SKS_STEP_EPA_CAPPED, SKS_STEP_NO_EOI, SKS_STEP_CONFIRM,
              SKS_STEP_REVIEW_EWP, SKS_STEP_PR],
}
"""萨省现有工签通道:不靠清单,是 mart 的规则判(具名清单都没命中、可提名的 TEER 4-5 与卡车司机岗给它;2026-09-24 九省通道审计,
Frank 批)。岗位通道名写在 mart 的 SK_EWP_LABEL,不在任何 raw/pnp 清单里 —— 自校靠 RULE_BOARD_LABELS 认它。
officialName 照抄通道页标题(assess 页写作「Skilled-Worker with Existing Work Permit」,见 quote)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):同批先挂过本通道自己那条门槛流(在担保雇主处全职满 6 个月、TEER 4 / 5 的
CLB 4、执照),同日 lead 决定这批先不接,门槛流撤回、这格恢复为空(不出门槛卡)。官方原句(applicants-with-existing-work-permit
页)「Have worked for at least six-months (780 hours) of full-time (30+ hours per week) work experience in the job with the
employer that has supported you with the Employer Position Assessment, with a valid work permit.」—— cms 的门槛量尺与 TEER
粗筛按全省读门槛行、不分通道,这几行入表会给每个萨省岗多一行「在职时长 6 个月 · 判不了」、把 TEER 0-3 说成仅受理 4-5;
待量尺与引擎按通道读行之后再接(pnp 的 OUT_SK_REQ 注同记)。持 offer 直接申请那条流本来就不挂:那句原句说的是
International Skilled Worker 类,本通道属 Saskatchewan Experience 类。
2026-09-30 通道补全批一 1b 复查(立项稿第四节第 3 条「现有工签类一行门槛都没有」):cms 判定卡「个人关」的门槛量尺(tenureResult)
与「职业关」的 TEER 粗筛(teerScopes)仍按全省读门槛行,上面「待量尺与引擎按通道读行之后再接」的前提没变,本批照旧不接,报 lead。
2026-10-03 申请步骤批 2 收尾(Frank「都修一下」):挂上全省雇主登记那条流(同萨省其余四条通道)—— 「申请步骤」卡「雇主登记」
一步读它出「在萨省经营满 24 个月」(原先没字)。只挂雇主侧这一条,申请人侧仍一行不挂:弹框门槛卡照旧不出(cms applicantRowsOf
数申请人侧 = 0),资讯页门槛卡照旧写「本站未收录门槛」、来源照旧是通道页;判定卡的量尺与 TEER 粗筛按全省读门槛行、不读本格,
不受影响。"""

PW_MB_SKILLED_WORKER_IN_MANITOBA = {
    "key": "mb-skilled-worker-in-manitoba", "province": "MB", "program": "PNP",
    "plainZh": "MB 技术工人", "plainEn": "MB Skilled Worker", "plainKo": "MB 숙련 노동자",
    "officialName": "Skilled Worker in Manitoba",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Skilled Worker in Manitoba"],
    "reqStreams": [
        "MPNP Skilled Worker Stream — Skilled Worker in Manitoba (SWM) Pathway",
        ("MPNP Skilled Worker Stream — Skilled Worker in Manitoba (SWM) Pathway "
         "(graduated in another Canadian province/territory)"),
        "MPNP In-Demand Occupations List",
        "MPNP (language proficiency, all streams)",
    ],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://immigratemanitoba.com/mpnp/skilled-worker/swm",
    "quote": ("The Skilled Worker in Manitoba (SWM) Pathway nominates applicants who have a strong connection to our province "
              "through ongoing employment and sufficient skills, education and training, work experience and official language "
              "proficiency to make an immediate and ongoing contribution to the Manitoba economy and our community at large."),
    "checked": "2026-09-28",
    "steps": [MBS_STEP_WORK, MBS_STEP_OFFER, MBS_STEP_EOI, MBS_STEP_DRAW, MBS_STEP_APPLY, MBS_STEP_REVIEW_SWM, MBS_STEP_PR],
}
"""曼省默认通道(SWM,下面三种选取)。抽选组:etl 已把 Skilled Worker in Manitoba 那一层留作组名(2026-09-24 第三批,GEN_DRAW_STREAM 原注)。
曼省在需职业两张表只作信号、不当通道(2026-09-24 九省通道审计),不挂这里。配额:曼省只按大流(Skilled Worker)公布,
通道级只有处理天数,没有配额卡用的指标 —— 不登配额行(前端原先按组名小写配到处理天数行,卡上也不出数,效果相同)。
英文界面现显示官方原名(pnp.gen.MB = Skilled Worker in Manitoba)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流四条(pnp mb-req 的流名)—— SWM 本流(同雇主在职 6 个月、不计入时段、
职业资质)与外省毕业生款(12 个月);在需职业表逐职业的最低 CLB(官方 IDOL 页原句「The CLB levels listed in the In-Demand
Occupations List are the minimum levels across all Skilled Worker pathways」—— 挂的是它的语言门槛行,在需表仍不当通道、不挂 occLabels);
全项目语言政策的 TEER 4 / 5 下限 CLB 4(语言政策页,各流通用)。SWO、国际教育流、EDI 的行不挂:别的通道或雇主项目的门槛。
登记顺序本通道自己的流在前;⚠ 门槛卡标题右端的出处页现取「库表按流名排序后第一条带网址的行」,那样取到的是语言政策页或在需表那页
(看库的排序规则),不是 SWM 资格页 —— 要出 SWM 页得前端改按这里的登记顺序取,另议。
2026-09-30 通道补全批二(立项稿第三节「只认领抽选、不加通道」):抽选组加认领省方直接邀请组「Skilled Worker Stream」—— 官方那组是
SWM 或 SWO 里持省方邀请的档案,海外技工行批一已认领,本行同认(一组两行都认,本岗高亮随之多这一组)。
2026-10-02 撤回这一组(Frank「这个为什么有两个高亮」「逻辑应该是什么样的」「改吧,其他省也按这个过一遍」):判据 = 本岗高亮只给
「凭本通道自己的条件就能进被选池」的组。官方抽选页那组原句「Profiles submitted under the Skilled Worker in Manitoba pathway or the
Skilled Worker Overseas pathway that declared being directly invited by the MPNP under a strategic recruitment initiative.」——
要先收到省方定向招募的直接邀请;SWM 资格里没有这一条(一份曼省 offer 给不了),是额外前提,不算本通道的组。SWO 那行照留:
SWO 的资格本身就列了这一种联系(「an Invitation to Apply received directly from the MPNP as part of a Strategic Recruitment Initiative」)。
同批九省过了一遍,其余各行认领的组都只用本通道条件(工资 / 分数 / 职业 / 语言 / 快速通道档案)选人,不动;阿省机会通道(定向行业)那组 09-30 已拍不认领。"""

PW_ON_WORKFORCE_PRIORITY = {
    "key": "on-workforce-priority", "province": "ON", "program": "PNP",
    "plainZh": "ON 劳动力优先", "plainEn": "ON Workforce Priority", "plainKo": "ON 인력 우선",
    "officialName": "Ontario Workforce Priority stream",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Ontario Workforce Priority Stream"],
    "drawsPending": True,
    "reqStreams": ["Ontario Workforce Priority stream"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.ontario.ca/page/ontario-workforce-priority-stream",
    "quote": ("The Ontario Workforce Priority stream offers eligible skilled foreign workers with a qualifying job offer and work "
              "experience in any National Occupational Classification (NOC) occupation a pathway to apply to permanently live and "
              "work in Ontario."),
    "checked": "2026-09-28",
    "steps": [ONS_STEP_REGISTER, ONS_STEP_EOI, ONS_STEP_DRAW, ONS_STEP_EPA, ONS_STEP_APPLY, ONS_STEP_REVIEW, ONS_STEP_PR],
}
"""安省默认通道(2026-06 改制后只剩这一条,生效日按官方原句定为 2026-06-25)。
2026-09-30 注:旧三条 Employer Job Offer 流是 2026-05-30 关的(各自页面关闭通告原句「closed as of May 30, 2026」),与本条生效日
不是同一天(立项稿第四节第 9 条)。
抽选组键照 GEN_DRAW_STREAM 的 ON 行(抽选卡那一行的组键;2026-09-27 Frank 勾「安省改一行组头」)。官方 08-04 公告
「portal now open to Ontario Workforce Priority Stream expressions of interest」之后还没抽过 —— drawsPending:自校不要求它已出现在
抽选表里,出现了就提示摘掉这一格。
2026-09-29 Frank「照这个做」(安省门槛卡):挂门槛流(pnp on-req 的流名,小写 stream;与抽选组名大小写不同是两页各自的写法)。
前端按本岗挑档的门槛卡先换版(58f6d187)再挂,免得线上先出一张照阿省挑档的半成品卡。"""

PW_ON_EMPLOYER_JOB_OFFER_FOREIGN_WORKER = {
    "key": "on-employer-job-offer-foreign-worker", "province": "ON", "program": "PNP",
    "plainZh": "雇主 offer:海外工人", "plainEn": "Employer Offer: Foreign Worker", "plainKo": "고용주 오퍼: 해외 근로자",
    "officialName": "Employer Job Offer: Foreign Worker stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": ["Employer Job Offer: Foreign Worker stream"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "closed",
    "url": "https://www.ontario.ca/page/oinp-employer-job-offer-foreign-worker-stream",
    "quote": ("The Employer Job Offer: Foreign Worker stream gives foreign workers with a job offer in a skilled occupation, or "
              "eligible physicians, the opportunity to apply to permanently live and work in Ontario."),
    "checked": "2026-09-28",
}
"""安省旧通道(已关停:官网此页标题前缀「Archived -」,2026-06-25 改制并入 Ontario Workforce Priority)。
2026-09-30 更正日期口径(立项稿第四节第 9 条):本页关闭通告原句是「closed as of May 30, 2026」(门槛表 ONR_CLOSED_RE 取的就是它),
6 月 25 日是新通道 Ontario Workforce Priority 的生效日 —— 旧通道 5 月 30 日关、新通道 6 月 25 日开,是两件事。
抽选表里还有它的历史轮次;抽选卡现把组名显示成「雇主 offer:海外工人(已关停)」—— 名字存不带「(已关停)」,状态另一格管。"""

PW_ON_EMPLOYER_JOB_OFFER_INTERNATIONAL_STUDENT = {
    "key": "on-employer-job-offer-international-student", "province": "ON", "program": "PNP",
    "plainZh": "雇主 offer:国际学生", "plainEn": "Employer Offer: International Student", "plainKo": "고용주 오퍼: 유학생",
    "officialName": "Employer Job Offer: International Student stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": ["Employer Job Offer: International Student stream"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "closed",
    "url": "https://www.ontario.ca/page/oinp-employer-job-offer-international-student-stream",
    "quote": ("The Employer Job Offer: International Student stream gives international students with a job offer in a skilled "
              "occupation the opportunity to apply to permanently live and work in Ontario."),
    "checked": "2026-09-28",
}
"""安省旧通道(已关停,同上一段)。抽选卡现显示「雇主 offer:国际学生(已关停)」。"""

PW_NS_SKILLED_WORKER = {
    "key": "ns-skilled-worker", "province": "NS", "program": "PNP",
    "plainZh": "NS 技术工人", "plainEn": "NS Skilled Worker", "plainKo": "NS 숙련 노동자",
    "officialName": "Skilled Worker stream",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Monthly EOI selections"],
    "reqStreams": ["Nova Scotia Nominee Program — Skilled Worker stream",
                   "Nova Scotia Nominee Program — Skilled Worker stream — Skilled Worker category"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://liveinnovascotia.com/skilled-worker",
    "quote": ("The Skilled Worker stream helps employers recruit foreign workers and recently graduated international students "
              "whose skills are needed in Nova Scotia."),
    "checked": "2026-09-28",
    "steps": [NSS_STEP_OFFER_SW, NSS_STEP_EOI_SW, NSS_STEP_DRAW, NSS_STEP_REVIEW, NSS_STEP_PR_SW],
}
"""新斯科舍默认通道。抽选:官方只按月公布 EOI 池的总选取人数(liveinnovascotia.com/eoi-selection「Nova Scotia selected the following
number of candidates from the Expression of Interest (EOI) pool」),NSNP 各流与 AIP 同一个池,这一组覆盖本省全部通道;
组名「Monthly EOI selections」是 etl 给按月行起的名字、不是官方原名(2026-09-27 Frank「NS 这个省 弹框怎么都是汇总数据」,
GEN_DRAW_STREAM 原注)。NS 紧缺空缺 / 毕业生两张表只作信号、不当通道(2026-09-24 九省通道审计)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流两条 = pnp ns-req 的全流(A 技术工人 / B 建筑 / D 在需三类共用的行:
语言两档、近 5 年 12 个月经验、执照、雇主经营 2 年)+ A 类流(高中文凭);流名照抄 ns-req。TEER 4-5 在本雇主 6 个月、工资区间
两行同日抽过又撤,这批没入表(原句与理由见 pnp OUT_NS_REQ「没抓的」)。"""

# 2026-10-03 申请步骤批 2(新不伦瑞克;Frank「做吧,批 2 开始」,设计 docs/design/申请步骤-20261002.md):NB 八条通道的步骤件,
# 形照萨省 SKS_STEP_*(批 1 样张)与阿省 ABS_STEP_*。NB 省提名总页一页写全通用流程(递 EOI → 进池 → 收邀请、按邀请信写明的期限
# 递完整申请 → 完整性检查与审理 → 拿提名后向联邦递永居),三个流页的「Apply」段都指回总页,各自只多写一句 EOI 免费、递完整申请前
# 交 250 加元申请费;两个试点页各写一套流程。运营统计没有 NB 处理时长 —— 重要通知页明写不提供单个申请的处理时长,原句挂在审批一步。
# 抽选一步:登了抽选组的四条引用抽选表(ref:draws,卡点);没登的四条(兴趣信、远程法语、两个试点)挂各自页面「按配额与用工需要
# 选人发邀请」那句原句,同样标卡点。
NBS_PNP_URL = "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program.html"
"""NB 省提名总页(EOI 在池有效 365 天、只给选中的人发邀请、按邀请信期限递完整申请、审理可能要几个月在这页)。"""

NBS_SW_URL = ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/"
              "skilled-worker-stream.html")
"""技术工人流页(EOI 免费、250 加元申请费)。"""

NBS_EE_URL = ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/"
              "express-entry-stream.html")
"""快速通道流页(EOI 免费、250 加元申请费,同句)。"""

NBS_SI_URL = ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/"
              "strategic-initiative.html")
"""法语战略流页(EOI 免费、250 加元申请费同句;法语工人雇主经营 12 个月、法语优先二选一、远程法语住满 12 个月也在这页)。"""

NBS_PCCG_URL = ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/"
                "pccg-pilot-program.html")
"""私立学院毕业生试点页(EOI、邀请、递申请、审理、提名后申请封闭工签 90 天一页写全)。"""

NBS_CWP_URL = ("https://www.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/"
               "nb-immigration-program-streams/nb-critical-workers-pilot.html")
"""关键工人试点页(旧版路径,现行总页仍链到它;七步流程图、邀请后 45 天递、提名有效 6 个月在这页)。"""

NBS_NOTICES_URL = "https://www.gnb.ca/en/topic/family-home-community/immigration/important-notices.html"
"""NB 重要通知页(不提供处理时长、工作经验路径新邀请只限三个行业在这页)。"""

NBS_EOI_FREE_QUOTE = "Submitting an expression of interest is free of charge."
"""EOI 免费原句(三个流页与私立学院试点页同句;事实词 noFee,与 PE 建 EOI 档不收费同词)。"""

NBS_EOI_VALID_QUOTE = "They remain valid for 365 days from the date of submission."
"""EOI 在池里有效 365 天(总页「Invitations to apply」段;三个流页都指回总页)。官方写天数,不折成月 —— 词表另立 eoiValidDays,
同门槛卡经营年限按官方单位分「年 / 个月 / 个财年」三个词条的先例。"""

NBS_APP_FEE_QUOTE = ("However, before submitting a complete nomination application, you must pay a non-refundable "
                     "application fee of $250.")
"""递完整申请前交 250 加元申请费、不退(三个流页与私立学院试点页同句)。"""


NBS_MONTHS_QUOTE = "Due to a high volume of applications, this may take several months to complete."
"""审理可能要几个月(总页与私立学院试点页「Assessment」同句)。"""

NBS_NO_TIMES_QUOTE = ("Immigration New Brunswick is unable to provide processing times for individual applications "
                      "and cannot guarantee that an application will be evaluated or approved before a work permit "
                      "expires.")
"""官方不提供单个申请的处理时长、不保证在工签到期前审完(重要通知页 General 段,对 NB 全部项目;运营统计没有 NB 处理时长,
这句就是举证)。"""

NBS_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                  "facts": [{"ref": "req", "factor": "empYears"}]}
"""拿 NB 雇主 offer(技术工人、快速通道本省就业、私立学院试点):雇主条件读门槛卡「雇主条件」行(三条门槛流都是经营满 24 个月)。"""

NBS_STEP_OFFER_FR = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                     "facts": [{"key": "empMonths", "vars": {"n": 12},
                                "quote": ("be working in, or have accepted, a permanent, full-time, and non-seasonal "
                                          "(year-round) position for an eligible employer who has been actively "
                                          "operating in New Brunswick for the past 12 months, providing goods or "
                                          "services"),
                                "url": NBS_SI_URL}]}
"""拿 NB 雇主 offer(法语工人):雇主在本省经营满 12 个月。这条没进门槛表(PW_NB_FRANCOPHONE_WORKERS 注:雇主板按省取第一条经营
年限行,NB 会同时有 24 与 12),这里存原句;原句是资格清单的一条,照抄不带句号。"""

NBS_STEP_OFFER_CWP = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                      "facts": [{"key": "employerOnly", "vars": {},
                                 "quote": ("The New Brunswick Critical Worker Pilot is an employer-driven stream, "
                                           "based on targeted recruitment for skilled workers and therefore candidate "
                                           "applications to the pilot program are made through the participating "
                                           "employer."),
                                 "url": NBS_CWP_URL}]}
"""拿参与雇主的 offer(关键工人试点,流程图第 1 步「Accept an offer from a participating employer.」):只经参与试点的雇主申请
(六家雇主名单在通道表 employers 格)。"""

NBS_STEP_EE_PROFILE = {"step": "eeProfile", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "eeProfile"}]}
"""建 EE 档案(快速通道本省就业):读门槛卡「EE」行。"""

NBS_STEP_EE_PROFILE_NONE = {"step": "eeProfile", "who": "you", "none": False, "stuck": False, "facts": []}
"""建 EE 档案(快速通道兴趣信):这条通道没登门槛流,不引用门槛行;兴趣信发到联邦 EE 档案里,所以排在兴趣信前。"""

NBS_STEP_LETTER = {"step": "interestLetter", "who": "province", "none": False, "stuck": False, "facts": []}
"""收到省兴趣信(快速通道兴趣信):资格条件「have received a letter of interest in your federal Express Entry profile」。省里
怎么挑人发兴趣信、多久,页面没写 —— 不写事实,也不标卡点(stuck 只给数据说得出的)。"""

NBS_STEP_LETTER_FR = {"step": "interestLetter", "who": "province", "none": False, "stuck": False,
                      "facts": [{"key": "letterOrGrad", "vars": {},
                                 "quote": ("To be eligible under this pathway, you must meet the definition of one of "
                                           "the two priorities:"),
                                 "url": NBS_SI_URL}]}
"""收到省兴趣信(法语优先):与「法语毕业生」那一项(住本省、在蒙克顿大学或 CCNB 全程在省读完一年以上面授课程)二选一,不是人人
必经,不标卡点。通道表这条的标签写兴趣信那一支(PW_NB_FRANCOPHONE_PRIORITIES 注)。"""

NBS_STEP_WORK_REMOTE = {"step": "work", "who": "you", "none": False, "stuck": False,
                        "facts": [{"key": "liveMonths", "vars": {"n": 12},
                                   "quote": "have been living in New Brunswick for 12 months", "url": NBS_SI_URL},
                                  {"key": "remoteNonQc", "vars": {},
                                   "quote": ("have been working remotely for a Canadian employer located outside of "
                                             "Quebec during this entire period"),
                                   "url": NBS_SI_URL}]}
"""在这份工作上干够(远程法语):近 12 个月住在本省,期间一直远程为魁省外的加拿大雇主工作(资格清单相邻两条,一条一行,照抄不带
句号)。这条通道没登门槛流,照萨省现有工签 SKS_STEP_WORK 的先例把定义它的那条门槛写在这一步。"""

NBS_STEP_EOI_SW = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"key": "noFee", "vars": {}, "quote": NBS_EOI_FREE_QUOTE, "url": NBS_SW_URL},
                             {"key": "eoiValidDays", "vars": {"n": 365},
                              "quote": NBS_EOI_VALID_QUOTE, "url": NBS_PNP_URL}]}
"""递 EOI(技术工人):免费,在池里有效 365 天。"""

NBS_STEP_EOI_EE = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"ref": "req", "factor": "pointsMin"},
                             {"key": "noFee", "vars": {}, "quote": NBS_EOI_FREE_QUOTE, "url": NBS_EE_URL},
                             {"key": "eoiValidDays", "vars": {"n": 365},
                              "quote": NBS_EOI_VALID_QUOTE, "url": NBS_PNP_URL}]}
"""递 EOI(快速通道本省就业):本省打分表门槛读门槛卡「积分」行(67 分),免费,在池里有效 365 天。"""

NBS_STEP_EOI_EE_LETTER = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                          "facts": [{"key": "noFee", "vars": {}, "quote": NBS_EOI_FREE_QUOTE, "url": NBS_EE_URL},
                                    {"key": "eoiValidDays", "vars": {"n": 365},
                                     "quote": NBS_EOI_VALID_QUOTE, "url": NBS_PNP_URL}]}
"""递 EOI(快速通道兴趣信):免费,在池里有效 365 天;这条通道没登门槛流,67 分那行不引用。"""

NBS_STEP_EOI_FR = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"ref": "req", "factor": "pointsMin"},
                             {"key": "noFee", "vars": {}, "quote": NBS_EOI_FREE_QUOTE, "url": NBS_SI_URL},
                             {"key": "eoiValidDays", "vars": {"n": 365},
                              "quote": NBS_EOI_VALID_QUOTE, "url": NBS_PNP_URL}]}
"""递 EOI(法语工人):本省打分表门槛读门槛卡「积分」行(65 分),免费,在池里有效 365 天。"""

NBS_STEP_EOI_SI = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"key": "noFee", "vars": {}, "quote": NBS_EOI_FREE_QUOTE, "url": NBS_SI_URL},
                             {"key": "eoiValidDays", "vars": {"n": 365},
                              "quote": NBS_EOI_VALID_QUOTE, "url": NBS_PNP_URL}]}
"""递 EOI(法语优先、远程法语):免费,在池里有效 365 天;两条没登门槛流,65 分那行不引用。"""

NBS_STEP_EOI_PCCG = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "noFee", "vars": {}, "quote": NBS_EOI_FREE_QUOTE, "url": NBS_PCCG_URL}]}
"""递 EOI(私立学院试点):免费;试点页自己的 EOI 段没写有效期,不拿总页那句顶。"""

NBS_STEP_EOI_CWP = {"step": "eoi", "who": "you", "none": False, "stuck": False, "facts": []}
"""递 EOI(关键工人试点,流程图第 2 步):试点页没写费用与有效期,不写。"""

NBS_STEP_DRAW_SW = {"step": "draw", "who": "province", "none": False, "stuck": True,
                    "facts": [{"ref": "draws"},
                              {"key": "inviteSectors", "vars": {},
                               "quote": ("Effective May 4, 2026, and until further notice, all new invitations to "
                                         "apply under the New Brunswick Experience pathway of the New Brunswick "
                                         "Skilled Worker stream will be limited to occupations in the following "
                                         "sectors:"),
                               "url": NBS_NOTICES_URL}]}
"""进池与抽选(技术工人):挂这条通道的抽选表(卡点)+ 重要通知「工作经验路径的新邀请只限医疗、教育、建筑三个行业」(2026-05-04
起、另行通知前;三个行业名是原句冒号后的列表,写在词条里)。只管工作经验路径,毕业生路径不限;本岗属于哪个行业不判(公司表没有
行业字段),卡上写成「NB 工作经验路径…」条件句,同萨省限额行业的写法。"""

NBS_STEP_DRAW = {"step": "draw", "who": "province", "none": False, "stuck": True, "facts": [{"ref": "draws"}]}
"""进池与抽选(快速通道本省就业、法语工人、法语优先):挂这条通道的抽选表(卡点 —— 要被抽中才能递申请)。"""

NBS_STEP_POOL = {"step": "draw", "who": "province", "none": False, "stuck": True,
                 "facts": [{"key": "poolSelection", "vars": {},
                            "quote": ("Immigration New Brunswick reviews submitted expressions of interest and issues "
                                      "invitations to apply only to selected individuals based on provincial labour "
                                      "market needs, available allocation and other priorities determined by the "
                                      "Government of New Brunswick."),
                            "url": NBS_PNP_URL}]}
"""进池与抽选(快速通道兴趣信、远程法语):总页原话只给选中的人发邀请、按本省用工需要与配额定 —— 卡点。两条路径 2025–2026 抽选页
都没出现过,没登抽选组,不挂抽选表。"""

NBS_STEP_POOL_PCCG = {"step": "draw", "who": "province", "none": False, "stuck": True,
                      "facts": [{"key": "poolSelection", "vars": {},
                                 "quote": ("Immigration New Brunswick reviews them and issues invitations to apply "
                                           "only to selected individuals based on provincial labour market needs, "
                                           "available allocation and other priorities determined by the Government of "
                                           "New Brunswick."),
                                 "url": NBS_PCCG_URL}]}
"""进池与抽选(私立学院试点):试点页同义句(EOI 进 NBPNP 候选池,只给选中的人发邀请)—— 卡点;抽选页上没有这个试点,不挂抽选表。"""

NBS_STEP_POOL_CWP = {"step": "draw", "who": "province", "none": False, "stuck": True,
                     "facts": [{"key": "poolSelection", "vars": {},
                                "quote": ("Candidates will be selected from this pool and invited to apply based on "
                                          "immigration allocations, application volumes, and New Brunswick labour "
                                          "market needs."),
                                "url": NBS_CWP_URL}]}
"""进池与抽选(关键工人试点):按移民配额、申请量与本省用工需要从池里选人发邀请 —— 卡点。邀请由雇主发到你的 INB 账户(试点页原话
「receive an Invitation to Apply (ITA) from your employer」),选人按的是配额,谁做仍记省里。"""

NBS_STEP_APPLY_SW = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 250}, "quote": NBS_APP_FEE_QUOTE, "url": NBS_SW_URL}]}
"""收邀请、递申请(技术工人):递完整申请前交 250 加元申请费、不退。"""

NBS_STEP_APPLY_EE = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 250}, "quote": NBS_APP_FEE_QUOTE, "url": NBS_EE_URL}]}
"""收邀请、递申请(快速通道两条):同上。"""

NBS_STEP_APPLY_SI = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 250}, "quote": NBS_APP_FEE_QUOTE, "url": NBS_SI_URL}]}
"""收邀请、递申请(法语战略三条):同上。"""

NBS_STEP_APPLY_PCCG = {"step": "apply", "who": "you", "none": False, "stuck": False,
                       "facts": [{"key": "appFee", "vars": {"n": 250},
                                  "quote": NBS_APP_FEE_QUOTE, "url": NBS_PCCG_URL}]}
"""收邀请、递申请(私立学院试点):同上,原句出自试点页。"""

NBS_STEP_APPLY_CWP = {"step": "apply", "who": "you", "none": False, "stuck": False,
                      "facts": [{"key": "inviteSubmitDays", "vars": {"n": 45},
                                 "quote": ("You are required to submit a complete electronic application within 45 "
                                           "calendar days of being issued an ITA."),
                                 "url": NBS_CWP_URL}]}
"""收邀请、递申请(关键工人试点,流程图第 3、4 步):收到邀请后 45 天内递完整电子申请;试点页没写申请费,不写。"""

NBS_STEP_SETTLE_CWP = {"step": "settle", "who": "you", "none": False, "stuck": False, "facts": []}
"""做安置计划(关键工人试点,流程图第 5 步「Settlement plan.」,法文页「Préparer le plan d'établissement.」):页面只有这一行,
多久、递给谁没写,不写事实。谁做记「你」(法文页动词是「准备」;NB 战略流的安置计划表 PCNB-IS 002 也是申请人随申请上传的表);
排在递申请之后、省里审批之前(流程图顺序;审批一步流程图没列,按「Wait for a Decision」段放在递永居前)。"""

NBS_STEP_REVIEW = {"step": "review", "who": "province", "none": False, "stuck": False,
                   "facts": [{"key": "reviewSeveralMonths", "vars": {},
                              "quote": NBS_MONTHS_QUOTE, "url": NBS_PNP_URL},
                             {"key": "noTimeGuarantee", "vars": {},
                              "quote": NBS_NO_TIMES_QUOTE, "url": NBS_NOTICES_URL}]}
"""省里审批(三个流的六条通道):先查完整性再审理,审理可能要几个月;官方不提供单个申请的处理时长,也不保证在工签到期前审完。"""

NBS_STEP_REVIEW_PCCG = {"step": "review", "who": "province", "none": False, "stuck": False,
                        "facts": [{"key": "reviewSeveralMonths", "vars": {},
                                   "quote": NBS_MONTHS_QUOTE, "url": NBS_PCCG_URL},
                                  {"key": "noTimeGuarantee", "vars": {},
                                   "quote": NBS_NO_TIMES_QUOTE, "url": NBS_NOTICES_URL}]}
"""省里审批(私立学院试点):同上,「几个月」那句出自试点页。"""

NBS_STEP_REVIEW_CWP = {"step": "review", "who": "province", "none": False, "stuck": False,
                       "facts": [{"key": "noTimeGuarantee", "vars": {},
                                  "quote": NBS_NO_TIMES_QUOTE, "url": NBS_NOTICES_URL}]}
"""省里审批(关键工人试点,试点页「Wait for a Decision」段):试点页没写多久;通知页 General 段那句对 NB 全部项目,照挂。"""

NBS_STEP_CLOSED_PERMIT = {"step": "closedPermit", "who": "federal", "none": False, "stuck": False,
                          "facts": [{"key": "closedPermitDays", "vars": {"n": 90},
                                     "quote": ("Under this pilot, you must be nominated and apply for a closed work "
                                               "permit with the employer support before the expiry date of your study "
                                               "permit and within 90 days of the program completion date shown on "
                                               "your final transcript."),
                                     "url": NBS_PCCG_URL}]}
"""申请封闭工签(私立学院试点,提名之后第一件事):课程结束(成绩单上的结业日)90 天内、学签到期前拿到提名并递交。这批学生拿不到
PGWP,封闭工签是试点规定的必经一步(其他 NB 通道提名后申请工签是可选的,不列)。谁做记联邦(同「拿提名,递永居」:向 IRCC 递)。"""

NBS_STEP_PR = {"step": "pr", "who": "federal", "none": False, "stuck": False, "facts": []}
"""拿提名,递永居(三个流与私立学院试点):页面只说在提名证书到期前向联邦递永居、证书写明走 EE 还是非 EE,没写有效期与递交期限 ——
不写,不拿关键工人试点的 6 个月顶。"""

NBS_STEP_PR_EE = {"step": "pr", "who": "federal", "none": False, "stuck": False, "facts": [EE_PR_SUBMIT_FACT]}
"""拿提名,递永居(快速通道两条:就业、意向;2026-10-03 补):联邦邀请后 60 天内递永居引 IRCC 原句(EE_PR_SUBMIT_FACT);
提名有效期 NB 页没写,照旧不写。"""

NBS_STEP_PR_CWP = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                   "facts": [{"key": "nominationValidMonths", "vars": {"n": 6},
                              "quote": ("The nomination certificate will be valid for six months from the date of "
                                        "issuance and is considered valid if you submit a complete application for PR "
                                        "before the expiry date on the nomination certificate."),
                              "url": NBS_CWP_URL}]}
"""拿提名,递永居(关键工人试点,流程图第 6、7 步):提名证书自签发起有效 6 个月,到期前递完整永居申请即算有效。"""

PW_NS_CONSTRUCTION = {
    "key": "ns-construction", "province": "NS", "program": "PNP",
    "plainZh": "NS 建筑", "plainEn": "NS Construction", "plainKo": "NS 건설",
    "officialName": "Construction Worker",
    "boardLabel": "NS 建筑", "isDefault": False,
    "drawStreams": ["Monthly EOI selections"],
    "reqStreams": ["Nova Scotia Nominee Program — Skilled Worker stream",
                   "Nova Scotia Nominee Program — Skilled Worker stream — Critical Construction Worker category"],
    "quotaScope": None,
    "occLabels": ["NS 建筑"],
    "status": "open",
    "url": "https://liveinnovascotia.com/resources/nsnp-update-four-consolidated-streams",
    "quote": ("Skilled Worker: The Construction Worker sub-criteria are the same eligibility requirements as the former Critical "
              "Construction Worker Pilot."),
    "checked": "2026-09-28",
    "steps": [NSS_STEP_OFFER_EMP, NSS_STEP_EOI, NSS_STEP_DRAW, NSS_STEP_REVIEW, NSS_STEP_PR_SW],
}
"""新斯科舍建筑(Skilled Worker 流下的子条件,清单 ns-construction.json,限建筑业雇主)。与通用岗同一组按月选取
(2026-09-27 九省体检:官方 eoi-process 页 2025-11-28 条 NSNP 各流与 AIP 同一个 EOI 池,NAMED_DRAW_STREAMS 原注)。
officialName 取官方原句里的子条件名(Construction Worker sub-criteria)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流两条 = pnp ns-req 的全流 + B 类流(Critical Construction Worker
category:高中文凭或建筑业培训)。指南 B 段的语言两档与经验和全流同值(ns-req 每轮逐项对校,对不上报自校问题)。
A 类的「TEER 4-5 在本雇主 6 个月」B 段不要求 —— 这批没入表;以后加回全流时,卡片出并列经验行得排除建筑通道。"""

# 2026-10-03 申请步骤批 2(纽芬兰;形照萨省 SKS_STEP_* / 阿省 ABS_STEP_*,设计 docs/design/申请步骤-20261002.md):NL 三条通道
# (技术工人、国际毕业生、快速通道技术工人)共用的步骤件。三类申请人页「General Steps」同一套:递 EOI → 省里分批发邀请 →
# 收到邀请后递申请 → 审理 → 结果(EOI 总览页同写);抽选一步引用抽选表(ref:draws,卡点;NLPNP 各类同一组批次)。
# NL 运营统计没有处理时长,审批一步写候选人 FAQ 原话「目前没有标准处理时长」。
NLS_EOI_URL = "https://www.gov.nl.ca/immigration/expression-of-interest-model-overview"
"""NL EOI 模式总览页(EOI 12 个月过期、分批发邀请、受邀后 30 天递申请在这页)。"""

NLS_FAQ_URL = "https://www.gov.nl.ca/immigration/faqs/nl-provincial-nominee-program-candidate-faqs"
"""NL 省提名候选人 FAQ 页(没有标准处理时长、提名证书有效 6 个月在这页)。"""

NLS_SUBMIT_URL = "https://www.gov.nl.ca/immigration/5-submission-of-nlpnp-application"
"""NL 省提名政策手册「5. Submission of NLPNP Application」页(不收申请费那句;三类手册目录的第 5 节都链到这一页)。"""

NLS_APPLICANTS_BASE = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
                       "provincial-nominee-program/applicants/")
"""NL 省提名申请人页前缀。"""

NLS_JVA_QUOTE = ("With an employer that has a valid JVA (only required if the applicant does not have a valid "
                 "work permit or alternate federal authorization to work in the identified position).")
"""雇主职位空缺评估(JVA)原句(技术工人、快速通道技术工人两页同句;国际毕业生页没有这一句)。"""

NLS_STEP_JVA_SW = {"step": "epa", "who": "employer", "none": False, "stuck": False,
                   "facts": [{"key": "noPermitOnly", "vars": {}, "quote": NLS_JVA_QUOTE,
                              "url": NLS_APPLICANTS_BASE + "skilled-worker"}]}
"""雇主递职位审批(技术工人):雇主过职位空缺评估(JVA),你没有这份工作的有效工签时才需要。排在拿 offer、递 EOI 前面:JVA 获批后
雇主才能用 NLPNP 雇佣 offer 表出 offer(JVA 政策 7.3),要占 JVA 名额的人递 EOI 须填雇主给的邀请码(EOI FAQ 第 7 问)。
JVA 有效期政策 7.3 写两年、9.0 与 JVA FAQ 写一年,官方前后不一,不写。"""

NLS_STEP_JVA_EE = {"step": "epa", "who": "employer", "none": False, "stuck": False,
                   "facts": [{"key": "noPermitOnly", "vars": {}, "quote": NLS_JVA_QUOTE,
                              "url": NLS_APPLICANTS_BASE + "express-entry-skilled-worker"}]}
"""雇主递职位审批(快速通道技术工人):同技术工人那步,出处换本类申请人页(资格政策第 4 节写作 JVA、LMIA、持这份工作的有效工签
三者有一)。国际毕业生持 PGWP,申请人页与资格政策页都没有 JVA 这一句,不登这一步。"""

NLS_STEP_EE_PROFILE = {"step": "eeProfile", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "eeProfile"}]}
"""建 EE 档案(快速通道技术工人):读门槛卡「EE」行(须先进联邦 EE 池)。"""

NLS_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                  "facts": [{"ref": "req", "factor": "empYears"}]}
"""拿 NL 雇主 offer:雇主条件读门槛卡「雇主条件」行(门槛流 NLPNP (employer criteria, all streams):经营满 2 年、本地全职员工)。
排在递 EOI 前面:EOI 里没填 offer 的不会被考虑发邀请(EOI FAQ 第 5 问)。"""

NLS_STEP_EOI = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                "facts": [{"key": "eoiValidMonths", "vars": {"n": 12},
                           "quote": "EOIs expire automatically after 12 months.", "url": NLS_EOI_URL}]}
"""递 EOI:在池里有效 12 个月(过期要重递)。"""

NLS_STEP_DRAW = {"step": "draw", "who": "province", "none": False, "stuck": True,
                 "facts": [{"ref": "draws"}]}
"""进池与抽选:挂这条通道的抽选表(卡点 —— 要被选中才能递申请;官方分批发邀请,按公布的优先条件挑,EOI FAQ 写明不是随机抽)。"""

NLS_ITA_QUOTE = "If invited, you have 30 days to submit a full NLPNP or AIP application."
"""受邀后递申请期限原句(EOI 总览页)。"""

NLS_NO_FEE_QUOTE = "There is no application fee when applying to the NLPNP."
"""不收申请费原句(政策手册第 5 节)。"""

NLS_STEP_APPLY = {"step": "apply", "who": "you", "none": False, "stuck": False,
                  "facts": [{"key": "inviteSubmitDays", "vars": {"n": 30}, "quote": NLS_ITA_QUOTE, "url": NLS_EOI_URL},
                            {"key": "noFee", "vars": {}, "quote": NLS_NO_FEE_QUOTE, "url": NLS_SUBMIT_URL}]}
"""收邀请、递申请(技术工人、国际毕业生):30 天内递,不收申请费。30 天是官方注明的年底临时缩短(各页星号注「temporarily reduced
from 60 to 30 days」),改回 60 天时这句核不上、自校当轮就红。"""

NLS_STEP_APPLY_EE = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "inviteSubmitDays", "vars": {"n": 30}, "quote": NLS_ITA_QUOTE,
                                "url": NLS_EOI_URL},
                               {"ref": "req", "factor": "pointsMin"},
                               {"key": "noFee", "vars": {}, "quote": NLS_NO_FEE_QUOTE, "url": NLS_SUBMIT_URL}]}
"""收邀请、递申请(快速通道技术工人):同上,另读门槛卡「积分」行(NLPNP 打分表 ≥ 67 分)。打分是本类的申请资格,NL 的 EOI 按优先
条件挑、不按分排,所以挂在递申请这一步(萨省 EOI 按分排才挂在递 EOI)。"""

NLS_STEP_REVIEW = {"step": "review", "who": "province", "none": False, "stuck": False,
                   "facts": [{"key": "noStandardTime", "vars": {},
                              "quote": "OIM does not currently have standard processing times for the NLPNP.",
                              "url": NLS_FAQ_URL}]}
"""省里审批:官方原话「目前没有标准处理时长」(运营统计也没有 NL 的时长行)。"""

NLS_STEP_PR = {"step": "pr", "who": "federal", "none": False, "stuck": False,
               "facts": [{"key": "nominationValidMonths", "vars": {"n": 6},
                          "quote": "Your nomination certificate is valid for 6 months before it expires.",
                          "url": NLS_FAQ_URL}]}
"""拿提名,递永居(三类同):提名证书有效 6 个月,过期前向联邦递。快速通道版提名后由联邦 EE 发邀请,NL 页面没写在 EE 里接受提名、
递永居的天数,不拿阿省、萨省的原句顶。"""

NLS_STEP_PR_EE = {"step": "pr", "who": "federal", "none": False, "stuck": False,
                  "facts": [{"key": "nominationValidMonths", "vars": {"n": 6},
                             "quote": "Your nomination certificate is valid for 6 months before it expires.",
                             "url": NLS_FAQ_URL},
                            EE_PR_SUBMIT_FACT]}
"""拿提名,递永居(快速通道技术工人;2026-10-03 补):提名证书 6 个月同上,另加联邦邀请后 60 天内递永居(引 IRCC 原句,
EE_PR_SUBMIT_FACT);接受提名的天数仍没有出处,不写。"""

# 2026-10-03 申请步骤批 2(爱德华王子岛;形同上):PE 五条通道(劳工通道、在需职业、国际毕业生、中级经验、快速通道)的步骤件。
# 各流页「How do I apply?」同一套:在 PEI EOI 系统建档 → 受邀 → 填申请表、雇主填 PEIW-02 → 审理 → 提名后自己向联邦递永居;
# EOI 池按月抽选(邀请日程页列全年 12 个日期),抽选一步引用抽选表(ref:draws,卡点;Workforce 各流与 PEI EE 同一组
# 「Labour & Express Entry」)。EOI 免费、档案有效 6 个月、300 加元申请费三句各流页同句,各通道取自己那页(同阿省提名有效期两页
# 同句的做法)。PE 运营统计没有处理时长,各页也没写递申请期限、提名有效期,这几格空着。官网有防爬,原句全取自 crawl 缓存。
PES_BASE = "https://www.princeedwardisland.ca/en/information/office-of-immigration/"
"""PE 移民局页面前缀。"""

PES_WF_URL = PES_BASE + "skilled-workers-in-pei"
"""Skilled Worker 流页(劳工通道取这页:EOI 免费、档案有效 6 个月、300 加元申请费)。"""

PES_OID_URL = PES_BASE + "occupations-in-demand"
"""在需职业流页(境外招聘先拿授权;EOI 免费、档案有效期、申请费三句同句)。"""

PES_IG_URL = PES_BASE + "international-graduates"
"""国际毕业生流页(EOI 免费、档案有效期、申请费三句同句)。"""

PES_IE_URL = PES_BASE + "intermediate-experience-stream"
"""中级经验流页(境外招聘先拿授权;EOI 免费、档案有效期、申请费三句同句)。"""

PES_EE_URL = PES_BASE + "pei-express-entry"
"""PEI 快速通道页(EOI 免费、档案有效期、申请费三句同句;在线接受提名、联邦邀请后递永居也在这页,没写天数)。"""

PES_NO_FEE_QUOTE = "There is no fee to create an Expression of Interest profile."
"""EOI 免费原句(各流页同句)。"""

PES_PROFILE_QUOTE = "Your profile will remain active for a period of six months."
"""EOI 档案有效 6 个月原句(各流页同句;邀请日程页另写「EOI profiles remain valid in the system for 6 months」)。"""

PES_APP_FEE_QUOTE = "If you are selected to apply for nomination by PEI, there is a non-refundable fee of $300 CAD."
"""申请费原句(各流页同句)。"""

PES_STEP_ABROAD_WF = {"step": "epa", "who": "employer", "none": False, "stuck": False,
                      "facts": [{"key": "abroadOnly", "vars": {},
                                 "quote": ("The Skilled Worker Stream may be utilized for talent recruitment "
                                           "outside of Canada, if the Prince Edward Island Employer has "
                                           "received authorization from the Office of Immigration prior to "
                                           "issuing a job offer."),
                                 "url": PES_BASE + "skilled-workers-outside-canada"}]}
"""雇主递职位审批(劳工通道的 Skilled Worker 流):从加拿大境外招聘时,雇主出 offer 前先拿省移民局授权(同页另一句「your employer
must receive authorization from our office prior to submitting an expression of interest profile」)。人在本省的不经这一步;
Critical Worker、国际毕业生两流页没有这一句。"""

PES_STEP_ABROAD_OID = {"step": "epa", "who": "employer", "none": False, "stuck": False,
                       "facts": [{"key": "abroadOnly", "vars": {},
                                  "quote": ("The Occupations in Demand stream may be utilized for talent recruitment "
                                            "outside of Canada, if the Prince Edward Island Employer has "
                                            "received authorization from the Office of Immigration prior to "
                                            "issuing a job offer."),
                                  "url": PES_OID_URL}]}
"""雇主递职位审批(在需职业):同上,出处换本流页(官方写明逐案审)。"""

PES_STEP_ABROAD_IE = {"step": "epa", "who": "employer", "none": False, "stuck": False,
                      "facts": [{"key": "abroadOnly", "vars": {},
                                 "quote": ("The Intermediate Experience Stream may be utilized for talent recruitment "
                                           "outside of Canada, if the Prince Edward Island Employer has "
                                           "received authorization from the Office of Immigration prior to "
                                           "issuing a job offer."),
                                 "url": PES_IE_URL}]}
"""雇主递职位审批(中级经验):同上,出处换本流页(同页注:只批给本省指定的优先行业)。"""

PES_STEP_EE_PROFILE = {"step": "eeProfile", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "eeProfile"}]}
"""建 EE 档案(PE 快速通道):读门槛卡「EE」行。"""

PES_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False,
                  "facts": [{"ref": "req", "factor": "empYears"}]}
"""拿 PE 雇主 offer:雇主条件读门槛卡「雇主条件」行(门槛流 PEI PNP Workforce — Employer Requirements (all streams):本省连续
经营满 2 年)。快速通道资格条文不要求 offer、表格段又要雇主填 PEIW-02(通道段注「官方前后矛盾」),照该段挂雇主门槛流的判法登这一步。"""

PES_STEP_EOI_WF = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"key": "noFee", "vars": {}, "quote": PES_NO_FEE_QUOTE, "url": PES_WF_URL},
                             {"key": "eoiValidMonths", "vars": {"n": 6}, "quote": PES_PROFILE_QUOTE,
                              "url": PES_WF_URL}]}
"""在 PEI EOI 系统建档(劳工通道):不收费,档案有效 6 个月。"""

PES_STEP_EOI_OID = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                    "facts": [{"key": "noFee", "vars": {}, "quote": PES_NO_FEE_QUOTE, "url": PES_OID_URL},
                              {"key": "eoiValidMonths", "vars": {"n": 6}, "quote": PES_PROFILE_QUOTE,
                               "url": PES_OID_URL}]}
"""在 PEI EOI 系统建档(在需职业):同上,出处换本流页。"""

PES_STEP_EOI_IG = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"key": "noFee", "vars": {}, "quote": PES_NO_FEE_QUOTE, "url": PES_IG_URL},
                             {"key": "eoiValidMonths", "vars": {"n": 6}, "quote": PES_PROFILE_QUOTE,
                              "url": PES_IG_URL}]}
"""在 PEI EOI 系统建档(国际毕业生):同上,出处换本流页。"""

PES_STEP_EOI_IE = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"key": "noFee", "vars": {}, "quote": PES_NO_FEE_QUOTE, "url": PES_IE_URL},
                             {"key": "eoiValidMonths", "vars": {"n": 6}, "quote": PES_PROFILE_QUOTE,
                              "url": PES_IE_URL}]}
"""在 PEI EOI 系统建档(中级经验):同上,出处换本流页。"""

PES_STEP_EOI_EE = {"step": "eoi", "who": "you", "none": False, "stuck": False,
                   "facts": [{"key": "noFee", "vars": {}, "quote": PES_NO_FEE_QUOTE, "url": PES_EE_URL},
                             {"key": "eoiValidMonths", "vars": {"n": 6}, "quote": PES_PROFILE_QUOTE,
                              "url": PES_EE_URL}]}
"""在 PEI EOI 系统建档(PE 快速通道):同上,出处换本页(省里这套 EOI,与联邦 EE 档案是两回事)。"""

PES_STEP_DRAW = {"step": "draw", "who": "province", "none": False, "stuck": True,
                 "facts": [{"ref": "draws"},
                           {"key": "salesServiceLow", "vars": {},
                            "quote": ("Individuals working in the sales and service sector may not receive an "
                                      "invitation to apply at this time."),
                            "url": PES_BASE + "expression-of-interest-draws"}]}
"""进池与抽选:挂抽选表(卡点 —— 按月抽选,受邀才能递申请)+ 官方原话「销售服务类目前可能收不到邀请」(各流页与抽选页同句,
取抽选页)。卡上写成条件句,不按本岗职业判(同萨省限额行业的写法)。"""

PES_STEP_APPLY_WF = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_WF_URL}]}
"""收邀请、递申请(劳工通道):受邀后递申请交 300 加元、不退;受邀后几天内递,各页没写,不写。"""

PES_STEP_APPLY_OID = {"step": "apply", "who": "you", "none": False, "stuck": False,
                      "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_OID_URL}]}
"""收邀请、递申请(在需职业):同上,出处换本流页。"""

PES_STEP_APPLY_IG = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_IG_URL}]}
"""收邀请、递申请(国际毕业生):同上,出处换本流页。"""

PES_STEP_APPLY_IE = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_IE_URL}]}
"""收邀请、递申请(中级经验):同上,出处换本流页。"""

PES_STEP_APPLY_EE = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_EE_URL}]}
"""收邀请、递申请(PE 快速通道):同上,出处换本页。"""

PES_STEP_REVIEW = {"step": "review", "who": "province", "none": False, "stuck": False, "facts": []}
"""省里审批:运营统计没有 PE 的时长行,各页也没写时长数,不写。"""

PES_STEP_PR = {"step": "pr", "who": "federal", "none": False, "stuck": False, "facts": []}
"""拿提名,递永居(五条同):各流页只写提名后自己向 IRCC 递永居,快速通道页只写在线接受提名、联邦邀请后递永居,都没写期限,不写。"""

PES_STEP_PR_EE = {"step": "pr", "who": "federal", "none": False, "stuck": False, "facts": [EE_PR_SUBMIT_FACT]}
"""拿提名,递永居(快速通道;2026-10-03 补):联邦邀请后 60 天内递永居引 IRCC 原句(EE_PR_SUBMIT_FACT)。"""

PW_NB_SKILLED_WORKER = {
    "key": "nb-skilled-worker", "province": "NB", "program": "PNP",
    "plainZh": "NB 技术工人", "plainEn": "NB Skilled Worker", "plainKo": "NB 숙련 노동자",
    "officialName": "New Brunswick Skilled Worker stream",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["NB Skilled Worker"],
    "reqStreams": ["New Brunswick Skilled Worker stream (Experience / Graduates / Priority Occupations)",
                   "New Brunswick Skilled Worker stream — New Brunswick Experience pathway",
                   "New Brunswick Skilled Worker stream — New Brunswick Graduates pathway"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/"
            "skilled-worker-stream.html"),
    "quote": "A pathway for foreign workers with a full-time, non-seasonal job or job offer in New Brunswick.",
    "checked": "2026-09-28",
    "steps": [NBS_STEP_OFFER, NBS_STEP_EOI_SW, NBS_STEP_DRAW_SW, NBS_STEP_APPLY_SW, NBS_STEP_REVIEW,
              NBS_STEP_PR],
}
"""新不伦瑞克默认通道。抽选组:2026-09-23 Frank「所以这个 NB 技术工人点进去应该哪个高亮」立(GEN_DRAW_STREAM 原注);
NB 抽选页按官方四个 stream 分组(09-23 59a808ec 跟上官网 08-31 改版)。NB 优先职业表只作信号(只认省政府招聘团直接招来的 offer)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流三条(pnp nb-req 的流名)= 三条路径共同的资格(语言 / 年龄 / 雇主经营 /
职业要求)+ Experience 路径(同雇主在职 6 个月,门槛卡工作经验行的主档)+ Graduates 路径(本省院校毕业不要求经验,经验替代行)。
Priority Occupations 路径不挂:offer 必须出自省政府招聘团,职位板上的岗走不到这条(同 NB 优先职业表只作信号的判法)。"""

PW_NL_SKILLED_WORKER = {
    "key": "nl-skilled-worker", "province": "NL", "program": "PNP",
    "plainZh": "NL 技术工人", "plainEn": "NL Skilled Worker", "plainKo": "NL 숙련 노동자",
    "officialName": "NLPNP Skilled Worker Category",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["NLPNP (ITA batch)"],
    "reqStreams": ["NLPNP Skilled Worker Category", "NLPNP (employer criteria, all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.gov.nl.ca/immigration/skilled-workers-category",
    "quote": ("The NLPNP Skilled Worker Category is a permanent residence pathway for international workers and prospective "
              "immigrants who have skills that are beneficial to the Newfoundland and Labrador labour market."),
    "checked": "2026-09-28",
    "tags": ["noPgwp"],
    "steps": [NLS_STEP_JVA_SW, NLS_STEP_OFFER, NLS_STEP_EOI, NLS_STEP_DRAW, NLS_STEP_APPLY, NLS_STEP_REVIEW,
              NLS_STEP_PR],
}
"""纽芬兰与拉布拉多默认通道。抽选:NL 抽选卡只有一组、该组覆盖本省全部通道(NLPNP 各类与 AIP 同一 EOI 池、同一组批次;
2026-09-24 九省通道审计改判,GEN_DRAW_STREAM 原注)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流(pnp nl-req 的 Skilled Worker 流名:语言两档、资格 / 执照条文);
雇主侧三条在「NLPNP (employer criteria, all streams)」流,门槛卡按全省取,不必登记(同阿省);International Graduate 是另一类别
(持 PGWP 者只能走它或 EE 类别),不挂这里。
2026-09-29 抽选卡重排(Frank「AIP 是不是应该单独的卡」「按你建议」):pnp 域把每批 ITA 按 Notes 拆成省提名、AIP 两行,抽选组由
「NLPNP + AIP (ITA batch)」改成「NLPNP (ITA batch)」(只剩省提名);AIP 那行归 AIP 段。
2026-09-30 通道补全批一:加标签「不收持 PGWP 的人」—— 申请人页原句「Cannot hold a Post-Graduation Work Permit.」(09-25 更新);
持 PGWP 的人在 NL 走国际毕业生(PW_NL_INTERNATIONAL_GRADUATE)或快速通道技术工人。
2026-10-01 Frank「别写不收 PGWP 要写需要什么」「持配偶开放工签、持 LMIA 工签等 不行吗」:标签键不变,三语文案改正面举例
「持配偶开放工签、LMIA 工签等」;不带「需」—— 同页 JVA 一节写明没有工签的(人在海外)也能走。"""

PW_PE_WORKFORCE = {
    "key": "pe-workforce", "province": "PE", "program": "PNP",
    "plainZh": "PE 劳工通道", "plainEn": "PE Workforce", "plainKo": "PE 인력 스트림",
    "officialName": "Workforce Category",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Labour & Express Entry"],
    "reqStreams": ["PEI PNP Workforce streams (Skilled Worker / Critical Worker / International Graduate / Occupations in Demand)",
                   "PEI PNP Workforce — Skilled Worker stream", "PEI PNP Workforce — Critical Worker stream",
                   "PEI PNP Workforce — Employer Requirements (all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/supporting-a-worker-for-immigration",
    "quote": ("The Workforce Category is an employer-driven category, designed to help you fill permanent labour shortages and "
              "skill gaps in your business by supporting foreign nationals for permanent residency."),
    "checked": "2026-09-28",
    "steps": [PES_STEP_ABROAD_WF, PES_STEP_OFFER, PES_STEP_EOI_WF, PES_STEP_DRAW, PES_STEP_APPLY_WF, PES_STEP_REVIEW,
              PES_STEP_PR],
}
"""爱德华王子岛默认通道(Workforce 类:Skilled Worker / Critical Worker / International Graduate / Occupations in Demand 各流)。
抽选:PE 抽选卡只有一组「Labour & Express Entry」= Workforce 各流 + PEI EE(2026-09-24 九省通道审计改判,GEN_DRAW_STREAM 原注)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流四条(pnp pe-req 的流名)—— 全体流的语言、Skilled Worker(TEER 0-3,
24 个月近 5 年内)、Critical Worker(TEER 4 / 5,与本省雇主在职 6 个月;门槛卡按本岗 TEER 挑其一)、雇主段(工资中位、执照;
经营年限一行门槛卡按省取,不靠这里)。International Graduate / Intermediate Experience 两条替代路没有门槛卡认得的写法,没收。
同日 lead 定 pe-req 里在职 6 个月与工资中位两行本批先不收(要和判定引擎改动一起排期 / 待 Frank 定):门槛卡 TEER 4 / 5 的岗暂无
经验一行、暂无工资一行;Critical Worker 这条流照挂(现只有学历一行,卡片不取),在职行收回来即生效,这里不用再动。
2026-09-30 通道补全批一 1b(立项稿第四节第 4 条):门槛流登记不变;语言行改按流落 —— Skilled Worker 流 TEER 0-3 考试或雇主在 PEIW-02
上确认二选一(op=none,门槛卡不出语言行)、Critical Worker 流 TEER 4 / 5 要考 CLB 4;原先挂在四流合称那条流上的「都要考 CLB 4」撤掉。"""

PW_PE_OCCUPATIONS_IN_DEMAND = {
    "key": "pe-occupations-in-demand", "province": "PE", "program": "PNP",
    "plainZh": "PE 在需职业", "plainEn": "PE in-demand", "plainKo": "PE 수요 직종",
    "officialName": "Occupations in Demand Stream",
    "boardLabel": "PE 在需职业", "isDefault": False,
    "drawStreams": ["Labour & Express Entry"],
    "reqStreams": ["PEI PNP Workforce streams (Skilled Worker / Critical Worker / International Graduate / Occupations in Demand)",
                   "PEI PNP — Occupations in Demand", "PEI PNP Workforce — Employer Requirements (all streams)"],
    "quotaScope": None,
    "occLabels": ["PE 在需职业"],
    "status": "open",
    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/occupations-in-demand",
    "quote": "Occupations in Demand Stream under the PEI PNP Workforce Category",
    "checked": "2026-09-28",
    "steps": [PES_STEP_ABROAD_OID, PES_STEP_OFFER, PES_STEP_EOI_OID, PES_STEP_DRAW, PES_STEP_APPLY_OID, PES_STEP_REVIEW,
              PES_STEP_PR],
}
"""爱德华王子岛在需职业(Workforce 类的一条流,清单 pe-oid.json)。与 Workforce 各流同一组抽选(2026-09-24 九省通道审计登记,
NAMED_DRAW_STREAMS 原注)。quote 是官方页的副标题(这条流属于 Workforce 类的原话)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流三条 —— 全体流的语言、本流自己那条(与在需职业表同名,现只有学历一行)、
雇主段(工资中位、执照)。本流的 1 年相关经验没入门槛表(判定卡「个人关」按省全量挑经验行、不认职业码,会漏到非清单岗),
门槛卡本流暂无经验一行。同日 lead 定工资中位一行本批先不收(待 Frank 定),雇主段眼下只出执照与经营年限。
2026-09-30 通道补全批一 1b:门槛流登记不变;语言行改落本流(CLB 4,官方各职业都要考 —— 清单里的 33102 / 73300 是 TEER 3,不按 TEER
挂),四流合称那条流不再有语言行。"""

PW_AIP = {
    "key": "aip", "province": "FED", "program": "AIP",
    "plainZh": "AIP", "plainEn": "AIP", "plainKo": "AIP",
    "officialName": "Atlantic Immigration Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": ["AIP", "AIP (ITA batch)", "Monthly EOI selections"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html",
    "quote": ("The Atlantic Immigration Program is a pathway to permanent residence for skilled foreign workers and international "
              "graduates from a Canadian institution who want to work and live in 1 of Canada’s 4 Atlantic provinces—New "
              "Brunswick, Nova Scotia, Prince Edward Island or Newfoundland and Labrador."),
    "checked": "2026-09-28",
}
"""大西洋移民计划(联邦项目,四省背书;职位板另有 AIP 一列,不走 PNP 格)。
抽选:NB 把 AIP 选取与省提名邀请发在同一张抽选页(组名「AIP」,数字是选中进入审理的申请、不是邀请);NL 批次与 NS 按月那一组
都与省提名同一个池(见 NL / NS 两段)。
⚠ 名字:抽选卡现把 NB 那组叫「AIP 大西洋移民计划」,而 NL / NS 两组的灰字里写「AIP」—— 同一个项目两个写法;表里取「AIP」
(与职位板 AIP 列同名),统一归批二效果图。
2026-09-29 抽选卡重排:NL 每批拆出来的 AIP 那行组名「AIP (ITA batch)」(发出的邀请,与 NB「AIP」组数申请不同),替掉原来的
整批组「NLPNP + AIP (ITA batch)」;NS 按月那一组照旧同池、仍挂这里。"""

PW_AB_EXPRESS_ENTRY_PRIORITY_SECTORS = {
    "key": "ab-express-entry-priority-sectors", "province": "AB", "program": "PNP",
    "plainZh": "AB 快速通道(定向行业)", "plainEn": "AB Express Entry (priority sectors)", "plainKo": "AB 익스프레스 엔트리(우선 산업)",
    "officialName": "Alberta Express Entry Stream",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Alberta Express Entry Stream – Priority Sectors (Agriculture)",
                    "Alberta Express Entry Stream – Priority Sectors (Aviation and skilled trade)",
                    "Alberta Express Entry Stream – Priority Sectors (Construction and skilled trade)",
                    "Alberta Express Entry Stream – Priority Sectors (Construction)",
                    "Alberta Express Entry Stream – Priority Sectors (Health Care)",
                    "Alberta Express Entry Stream – Priority Sectors (Manufacturing)"],
    "reqStreams": ["AAIP Alberta Express Entry Stream",
                   "AAIP Alberta Express Entry Stream — Priority Sectors",
                   "AAIP (job offer & employer requirements, all streams)"],
    "quotaScope": ("Priority sector draws and other initiatives (construction, manufacturing, agriculture, "
                   "aviation, and including skilled trades linked to each sector, etc.)"),
    "occLabels": [],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-alberta-express-entry-stream-eligibility",
    "quote": ("if you are invited based on having an Alberta job offer, your job offer occupation must be "
              "an eligible construction, agriculture or aviation occupation"),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["ee"],
    "teers": [],
    "nocs": [],
    "employers": [],
}
"""阿省快速通道不经三条专门 pathway 的通用抽选(官方抽选表写作 Priority Sectors,按行业分六个组名,2026 年 23 轮)。要联邦 EE 档案(CRS ≥ 300),
持 AB offer 的按行业邀请 → 看工作、标「需先有 EE 档案」(Frank 09-30「列进来,标需先有 EE 档案」)。资格页只写建筑 / 农业 / 航空,2026 抽选另有制造、
医疗,官方口径不一,不按职业码筛。
2026-09-30 撤出对照表(Frank「这种基本属于没有通道啊」「这个部分只显示能走的通道」「这种也删了」):定向行业按 EE 档案里的主职业邀请,
官网没列哪些职业算建筑 / 农业 / 航空(页上只有警务专线的三个职业码),判不了本岗能不能走 —— 通道卡只列能走的,本条不进 PATHWAYS。
常量留着记当初为什么收、为什么撤;官方出了职业清单,挂 nocs 再收。它认领的六个定向行业抽选组随之无主,照旧作为本省各组列在抽选卡里。"""

PW_BC_RURAL_REMOTE_HEALTH = {
    "key": "bc-rural-remote-health", "province": "BC", "program": "PNP",
    "plainZh": "BC 偏远地区医疗支持", "plainEn": "BC rural/remote health support", "plainKo": "BC 외딴 지역 보건 지원",
    "officialName": "Temporary Rural/Remote Health Support Initiative",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Temporary Rural/Remote Health Support Initiative"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/news",
    "quote": "Registrations for this initiative will now be accepted until 11:59 pm on October 7, 2026.",
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["employers", "timeLimited"],
    "teers": [],
    "nocs": ["64410", "65310", "65312"],
    "employers": [],
}
"""BC 限时通道:只收偏远地区卫生局在职的保洁、保安(NOC 64410 / 65310 / 65312),登记到 2026-10-07,上限 250 人(Frank 09-30 「收,标限时」
)。🔴 10-07 之后改 closed。雇主是不是卫生局本站判不了,不设雇主名筛,标签写「限指定雇主」。
2026-09-30 撤出对照表(Frank「只列能走的」):BC 技术移民指南 4.3(e)「Immediately prior to registering with the BC PNP, you must
have been working full-time, year-round, for at least nine (9) consecutive months, in an eligible occupation with the same health
authority employer」,登记 10 月 7 日截止 —— 看岗位的人(新招的岗)来不及走,不进 PATHWAYS。指南 4.3(b)(c)(d) 另点名八家公立
卫生局、只收直接雇员、大温 / 首府区(几个外岛除外)/ 中奥卡纳根区不算偏远,记在这里备查。常量留着记收与撤的理由;它认领的抽选组
随之无主,照旧作为 BC 一组列在抽选卡里。"""

PW_SK_STUDENTS = {
    "key": "sk-students", "province": "SK", "program": "PNP",
    "plainZh": "SK 本省毕业生", "plainEn": "SK graduates", "plainKo": "SK 주내 졸업생",
    "officialName": "Students",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["SINP Saskatchewan Experience — Students", "SINP — Employer Certificate of Registration (all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-with-saskatchewan-experience/students"),
    "quote": ("You have a permanent, full-time job offer in your field of study from an approved "
              "Saskatchewan employer"),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["localGrad"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [SKS_STEP_REGISTER, SKS_STEP_EPA_CAPPED, SKS_STEP_NO_EOI, SKS_STEP_CONFIRM, SKS_STEP_REVIEW_STUDENTS,
              SKS_STEP_PR],
}
"""Saskatchewan Experience 类的学生子类:本省专上毕业、专业对口的 SK offer(2026 年给优先行业的本省毕业生留 750 个名额)。不抽选。原句末尾页面里嵌了链接,
抽出的正文句号前多一个空格,quote 截到句号前。
2026-09-30 批一 1b:挂门槛流两条 —— pnp sk-req 的学生子类流(在萨省带薪工作 6 个月、萨省指定院校毕业)+ 雇主注册那条(「all streams」,
官方要 approved Saskatchewan employer 与 EPA)。TEER 4 / 5 指定工种的 CLB 4 没入表(判定卡按省汇总 TEER 档,理由见 pnp
SKR_STUDENTS_RULES),门槛卡暂无语言一行。"""

PW_SK_OCCUPATION_IN_DEMAND = {
    "key": "sk-occupation-in-demand", "province": "SK", "program": "PNP",
    "plainZh": "SK 紧缺职业(无 offer)", "plainEn": "SK in-demand occupation (no offer)", "plainKo": "SK 수요 직종(오퍼 없음)",
    "officialName": "International Skilled Worker: Occupation In-Demand",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["SINP International Skilled Worker (Employment Offer / Occupations In-Demand)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-occupations-in-demand"),
    "quote": "Don't have a job offer in Saskatchewan but are highly skilled in an in-demand occupation.",
    "checked": "2026-09-30",
    "jobLinked": False,
    "tags": ["noDraws"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [SKS_STEP_EOI, SKS_STEP_NO_DRAW_SCHEDULED, SKS_STEP_INVITED, SKS_STEP_REVIEW_NONE, SKS_STEP_PR],
}
"""不要 offer 的 EOI 子类;EOI 页写「There are no scheduled EOI draws at this time.」→ 标「目前没有抽选排期」。不看工作(Frank 
09-30「不看工作的也收」,通道卡下段)。三合一门槛组的 60 分、CLB 4、近 10 年 1 年经验正是本子类口径,挂上。
2026-09-30 批一 1b:那组改名去掉 Express Entry(三行出自 EO / OID 两页交叉核对,OID 页原句「Score a minimum of 60 points out of 110」
「CLB 4」「a minimum of one year … over the past 10 years」),本行跟着改名,门槛照旧。"""

PW_SK_EXPRESS_ENTRY = {
    "key": "sk-express-entry", "province": "SK", "program": "PNP",
    "plainZh": "SK 快速通道", "plainEn": "SK Express Entry", "plainKo": "SK 익스프레스 엔트리",
    "officialName": "International Skilled Worker: Saskatchewan Express Entry",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["SINP Saskatchewan Express Entry"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-saskatchewan-express-entry"),
    "quote": "Have a language test result that meets the federal Express Entry language requirements",
    "checked": "2026-09-30",
    "jobLinked": False,
    "tags": ["ee", "noDraws"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [SKS_STEP_EE_PROFILE, SKS_STEP_EOI, SKS_STEP_NO_DRAW_SCHEDULED, SKS_STEP_INVITED, SKS_STEP_REVIEW_NONE,
              SKS_STEP_PR_EE],
}
"""不要 offer 的 EOI 子类(须在联邦 EE 池);同样没有抽选排期。三合一门槛组的 CLB 4 / 近 10 年 1 年经验不是本子类口径(它按联邦 EE 语言标准),不挂,门槛待批一 
1b 拆出。quote 截到句号前(同 SK 学生那条的理由)。
2026-09-30 批一 1b:拆出本子类自己的流「SINP Saskatchewan Express Entry」(EE 池、SINP 打分表 60 分);语言(联邦 EE 标准)与按三种人
分三档的经验门槛卡写不对,没收(原句见 pnp SKR_EE_RULES)。"""

PW_MB_SKILLED_WORKER_OVERSEAS = {
    "key": "mb-skilled-worker-overseas", "province": "MB", "program": "PNP",
    "plainZh": "MB 海外技工", "plainEn": "MB Skilled Worker Overseas", "plainKo": "MB 해외 숙련 노동자",
    "officialName": "Skilled Worker Overseas (SWO) Pathway",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Skilled Worker Stream"],
    "reqStreams": ["MPNP Skilled Worker Overseas"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://immigratemanitoba.com/mpnp/skilled-worker/swo/eligibility",
    "quote": ("If you do not have a connection to Manitoba, you are not eligible to apply under SWO, "
              "regardless of your points total."),
    "checked": "2026-09-30",
    "jobLinked": False,
    "tags": ["connection"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [MBS_STEP_EOI, MBS_STEP_DRAW, MBS_STEP_APPLY, MBS_STEP_REVIEW_SWO, MBS_STEP_PR],
}
"""不要 offer,要与本省有联系(亲友 / 本省旧学历或经历 / 省方直接邀请);2026 年各轮只抽持省方邀请的 → 抽选组挂省方直接邀请那组「Skilled Worker Stream」
(官方:SWM 或 SWO 里持邀请的档案;SWM 那行认领这组归批二,会动高亮)。不看工作,通道卡下段。
2026-10-02 SWM 那行撤回这一组(要先收到直接邀请,是 SWM 资格外的前提);本行照留 —— 直接邀请是 SWO 资格自己列的三种联系之一。"""

PW_MB_CAREER_EMPLOYMENT = {
    "key": "mb-career-employment", "province": "MB", "program": "PNP",
    "plainZh": "MB 毕业生就业", "plainEn": "MB Career Employment", "plainKo": "MB 졸업생 취업",
    "officialName": "Career Employment Pathway (CEP)",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["MPNP International Education Stream — Career Employment Pathway (CEP)"],
    "quotaScope": None,
    "occLabels": ["MB 在需职业"],
    "status": "open",
    "url": "https://immigratemanitoba.com/mpnp/ies/cep/eligibility",
    "quote": ("You must have a full-time job offer from an eligible Manitoba employer with a minimum "
              "1-year contract in an occupation on Manitoba’s In-Demand Occupations List that is "
              "consistent with your completed program of studies in Manitoba."),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["localGrad", "drawsStopped"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [MBS_STEP_OFFER, MBS_STEP_EOI, MBS_STEP_DRAWS_MOVED, MBS_STEP_APPLY, MBS_STEP_REVIEW_IES, MBS_STEP_PR],
}
"""本省毕业 + offer 职业在在需职业表(IDOL)上且与所学对口。状态存疑:2026-06-11 官方请在池 CEP 档案转 SWM,之后抽选里再没出现,页面还在、没有关闭原句 → Frank 
09-30「都收,标状态」:status 照页面写 open,标签「6 月起没再抽选」。"""

PW_MB_GRADUATE_INTERNSHIP = {
    "key": "mb-graduate-internship", "province": "MB", "program": "PNP",
    "plainZh": "MB 研究生实习", "plainEn": "MB Graduate Internship", "plainKo": "MB 대학원 인턴십",
    "officialName": "Graduate Internship Pathway (GIP)",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["International Education Stream (IES) – Graduate Internship Pathway (GIP)"],
    "reqStreams": ["MPNP International Education Stream — Graduate Internship Pathway (GIP)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://immigratemanitoba.com/mpnp/ies/gip/eligibility",
    "quote": "You are not required to have a job offer at the time of application.",
    "checked": "2026-09-30",
    "jobLinked": False,
    "tags": ["localGrad", "mitacs"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [MBS_STEP_EOI, MBS_STEP_DRAW, MBS_STEP_APPLY, MBS_STEP_REVIEW_IES, MBS_STEP_PR],
}
"""本省硕博毕业、做过 Mitacs 实习,不要 offer;2026-07-16 还抽过一轮(78 份)。不看工作,通道卡下段。"""

PW_ON_SELF_EMPLOYED_PHYSICIANS = {
    "key": "on-self-employed-physicians", "province": "ON", "program": "PNP",
    "plainZh": "ON 自雇医生", "plainEn": "ON self-employed physicians", "plainKo": "ON 자영업 의사",
    "officialName": "Ontario Workforce Priority stream (self-employed physicians)",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Ontario Workforce Priority Stream"],
    "drawsPending": True,
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.ontario.ca/page/ontario-workforce-priority-stream",
    "quote": "If you are a self-employed physician, you may apply without having a job offer.",
    "checked": "2026-09-30",
    "jobLinked": False,
    "tags": ["physician"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [ONS_STEP_EOI_PHYSICIAN, ONS_STEP_DRAW, ONS_STEP_APPLY_PHYSICIAN, ONS_STEP_REVIEW, ONS_STEP_PR],
}
"""安省唯一现行 stream 里给自雇医生的那条 pathway(CPSO 会员、有 OHIP 计费号),不要 offer。与 OWP 同一组抽选、同样还没抽过。"""

PW_NS_GRADUATE = {
    "key": "ns-graduate", "province": "NS", "program": "PNP",
    "plainZh": "NS 本省毕业生", "plainEn": "NS graduates", "plainKo": "NS 주내 졸업생",
    "officialName": "Nova Scotia Graduate",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Monthly EOI selections"],
    "reqStreams": ["Nova Scotia Graduate stream"],
    "quotaScope": None,
    "occLabels": ["NS 毕业生"],
    "status": "open",
    "url": "https://liveinnovascotia.com/nova-scotia-graduate",
    "quote": ("have a full-time permanent job offer from a Nova Scotia employer in a job category listed "
              "above that corresponds with your recent field of study;"),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["localGrad"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [NSS_STEP_OFFER, NSS_STEP_EOI, NSS_STEP_DRAW, NSS_STEP_REVIEW, NSS_STEP_PR_GRAD],
}
"""2026-02-18 十流并四流后的独立 stream(旧 International Graduates in Demand 并入),限 4 个职业(站上「NS 毕业生」清单同 4 码)。09-24 
审计当它是参考信号 —— 官方它就是现行通道(「This stream is currently open to workers in these job categories」)。
2026-09-30 批一 1b:挂门槛流「Nova Scotia Graduate stream」(pnp ns-req:CLB 5、本省监管机构执照 / 证书、近 3 年内读完本省指定院校课程;
语言行带页上四个职业码的 appliesNoc)。"""

PW_NS_PHYSICIANS = {
    "key": "ns-physicians", "province": "NS", "program": "PNP",
    "plainZh": "NS 医生", "plainEn": "NS physicians", "plainKo": "NS 의사",
    "officialName": "Physician (Skilled Worker stream)",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Monthly EOI selections"],
    "reqStreams": ["NSNP Skilled Worker stream — Physician sub-criteria"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://liveinnovascotia.com/skilled-worker",
    "quote": ("The Physician sub-criteria is only open to general practitioners and family physicians (NOC "
              "31102) and specialist physicians (NOC 31100 and NOC 31101) with signed approved "
              "opportunities with the Nova Scotia Health Authority or the IWK Health Centre."),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["employers"],
    "teers": [],
    "nocs": ["31100", "31101", "31102"],
    "employers": ["nova scotia health", "iwk health"],
    "steps": [NSS_STEP_OFFER, NSS_STEP_EOI, NSS_STEP_DRAW, NSS_STEP_REVIEW, NSS_STEP_PR_SW],
}
"""Skilled Worker 下的医生子类:只认 NS Health / IWK 两家的 approved opportunity。09-24 审计因判不了雇主身份没做 —— 现按雇主名命中(归一后比对,
同 AIP 指定雇主)。
2026-09-30 批一 1b:挂门槛流「NSNP Skilled Worker stream — Physician sub-criteria」(pnp ns-req,指南 C 段:NSH / IWK 批准的 offer、
在本省住满 2 年的承诺、MCC 学历认证或省医师学会执照资格)。不挂全流:全流的语言两档与 12 个月经验只管 A / B / D 三类。"""

PW_NS_EXPRESS_ENTRY_EXPERIENCE = {
    "key": "ns-express-entry-experience", "province": "NS", "program": "PNP",
    "plainZh": "NS 快速通道(本省经验)", "plainEn": "NS Express Entry (NS experience)", "plainKo": "NS 익스프레스 엔트리(주내 경력)",
    "officialName": "Nova Scotia: Express Entry — Skilled Work Experience in Nova Scotia",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Monthly EOI selections"],
    "reqStreams": ["Nova Scotia: Express Entry — Skilled Work Experience in Nova Scotia"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://liveinnovascotia.com/express-entry",
    "quote": ("have at least one year of experience working in Nova Scotia in an occupation at TEER 0, 1, "
              "2, or 3 of the National Occupational Classification;"),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["ee", "localExperience"],
    "teers": [0, 1, 2, 3],
    "nocs": [],
    "employers": [],
    "steps": [NSS_STEP_WORK, NSS_STEP_EE_PROFILE, NSS_STEP_EOI_EE, NSS_STEP_DRAW, NSS_STEP_REVIEW, NSS_STEP_PR_EE],
}
"""不要 offer,但要本省 TEER 0–3 满 1 年经验 + EE 档案 → 看工作(这岗攒的就是它要的经验),标「需先有 EE 档案」「需本省工作满 1 年」。旧 Nova Scotia 
Experience: Express Entry 与 Labour Market Priorities 并入。
2026-09-30 批一 1b:挂门槛流(同 officialName;pnp ns-req:本省 TEER 0-3 经验满 1 年、语言 TEER 0 / 1 CLB 7 与 TEER 2 / 3 CLB 5、
EE 档案)。"""

PW_NS_EXPRESS_ENTRY_PHYSICIANS = {
    "key": "ns-express-entry-physicians", "province": "NS", "program": "PNP",
    "plainZh": "NS 快速通道(医生)", "plainEn": "NS Express Entry (physicians)", "plainKo": "NS 익스프레스 엔트리(의사)",
    "officialName": "Nova Scotia: Express Entry — Physicians",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Monthly EOI selections"],
    "reqStreams": ["Nova Scotia: Express Entry — Physicians"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://liveinnovascotia.com/express-entry",
    "quote": ("Only candidates with an approved offer from the Nova Scotia Health Authority or the IWK "
              "Health Centre who receive a Letter of Interest from Labour, Skills and Immigration (LSI) "
              "may apply."),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["ee", "employers", "letter"],
    "teers": [],
    "nocs": ["31100", "31101", "31102"],
    "employers": ["nova scotia health", "iwk health"],
    "steps": [NSS_STEP_OFFER, NSS_STEP_EE_PROFILE, NSS_STEP_LETTER, NSS_STEP_EOI_LETTER, NSS_STEP_DRAW, NSS_STEP_REVIEW, NSS_STEP_PR_EE],
}
"""快速通道下的医生子类:NS Health / IWK 的 approved offer + 省方意向信 + EE 档案(旧 Labour Market Priorities for Physicians)
。
2026-09-30 批一 1b:挂门槛流(同 officialName;pnp ns-req:批准职位、服务协议、EE 系统内的省意向信、所走联邦项目的最低经验)。"""

PW_NB_EXPRESS_ENTRY_EMPLOYMENT = {
    "key": "nb-express-entry-employment", "province": "NB", "program": "PNP",
    "plainZh": "NB 快速通道(本省就业)", "plainEn": "NB Express Entry (employment)", "plainKo": "NB 익스프레스 엔트리(주내 취업)",
    "officialName": "Employment in New Brunswick",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["NB Express Entry"],
    "reqStreams": ["New Brunswick Express Entry stream — Employment in New Brunswick pathway",
                   "New Brunswick Express Entry stream (Employment in New Brunswick / New Brunswick Interest)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/express-entry-stream.html"),
    "quote": "score at least 67/100 points based on the selection factor grid",
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["ee"],
    "teers": [0, 1, 2, 3],
    "nocs": [],
    "employers": [],
    "steps": [NBS_STEP_EE_PROFILE, NBS_STEP_OFFER, NBS_STEP_EOI_EE, NBS_STEP_DRAW, NBS_STEP_APPLY_EE,
              NBS_STEP_REVIEW, NBS_STEP_PR_EE],
}
"""NB Express Entry stream 下的本省就业路径:已在 NB 全职在职(TEER 0–3)+ EE 档案 + 67 分。抽选组「NB Express Entry」原先无人认领(2025–2026 
共 11 轮)。
2026-09-30 批一 1b:挂门槛流两条(pnp nb-req)—— 本路径自己的(雇主经营 24 个月、岗位要求、近 12 个月在本省居住并全职工作)在前,
两条路径共同的(EE 池、CLB 7、近 10 年 1 年经验、打分表 67 分)在后。"""

PW_NB_FRANCOPHONE_WORKERS = {
    "key": "nb-francophone-workers", "province": "NB", "program": "PNP",
    "plainZh": "NB 法语工人", "plainEn": "NB Francophone Workers", "plainKo": "NB 프랑스어 사용 노동자",
    "officialName": "Francophone Workers in New Brunswick",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["NB Strategic Initiative"],
    "reqStreams": ["New Brunswick Strategic Initiative — Francophone Workers in New Brunswick pathway",
                   ("New Brunswick Strategic Initiative (Francophone Workers / Francophone Priorities / "
                    "Francophones Working Remotely)")],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/strategic-initiative.html"),
    "quote": "have at least a level 5 in all four French language skills",
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["french"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [NBS_STEP_OFFER_FR, NBS_STEP_EOI_FR, NBS_STEP_DRAW, NBS_STEP_APPLY_SI, NBS_STEP_REVIEW,
              NBS_STEP_PR],
}
"""Strategic Initiative 下的法语工人路径:本省 offer 或在职 + NCLC 5。抽选组「NB Strategic Initiative」原先无人认领(2026 年 8 
轮,与法语优先合抽)。
2026-09-30 批一 1b:挂门槛流两条(pnp nb-req)—— 本路径自己的(岗位要求、近 6 个月住在本省)在前,三条路径共同的(近 5 年 1 年经验、
本省院校毕业免经验、打分表 65 分)在后。法语 NCLC 5 没入表(门槛卡语言行写「英语或法语」,会说成英法任一;本行标签已写),雇主经营
12 个月没入表(雇主板按省取第一条经营年限行、查询不排序,NB 会同时有 24 与 12 两个数)。"""

PW_NB_EXPRESS_ENTRY_INTEREST = {
    "key": "nb-express-entry-interest", "province": "NB", "program": "PNP",
    "plainZh": "NB 快速通道(兴趣信)", "plainEn": "NB Express Entry (interest)", "plainKo": "NB 익스프레스 엔트리(관심 서한)",
    "officialName": "New Brunswick Interest",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/express-entry-stream.html"),
    "quote": "have received a letter of interest in your federal Express Entry profile",
    "checked": "2026-09-30",
    "jobLinked": False,
    "tags": ["ee", "letter"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [NBS_STEP_EE_PROFILE_NONE, NBS_STEP_LETTER, NBS_STEP_EOI_EE_LETTER, NBS_STEP_POOL,
              NBS_STEP_APPLY_EE, NBS_STEP_REVIEW, NBS_STEP_PR_EE],
}
"""NB Express Entry stream 下的兴趣信路径:不要本省 offer,要省方发到 EE 档案的兴趣信。页面在列,2025–2026 抽选页没出现过。"""

PW_NB_FRANCOPHONE_PRIORITIES = {
    "key": "nb-francophone-priorities", "province": "NB", "program": "PNP",
    "plainZh": "NB 法语优先", "plainEn": "NB Francophone Priorities", "plainKo": "NB 프랑스어 우선",
    "officialName": "New Brunswick Francophone Priorities",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["NB Strategic Initiative"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/strategic-initiative.html"),
    "quote": "You must have received a letter of interest from Immigration New Brunswick",
    "checked": "2026-09-30",
    "jobLinked": False,
    "tags": ["french", "letter"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [NBS_STEP_LETTER_FR, NBS_STEP_EOI_SI, NBS_STEP_DRAW, NBS_STEP_APPLY_SI, NBS_STEP_REVIEW,
              NBS_STEP_PR],
}
"""Strategic Initiative 下的法语优先路径:不要 offer;本省法语院校毕业或收到省兴趣信(二选一,标签写兴趣信那一支)。在抽选。"""

PW_NB_FRANCOPHONES_REMOTE = {
    "key": "nb-francophones-remote", "province": "NB", "program": "PNP",
    "plainZh": "NB 远程法语工作者", "plainEn": "NB Francophones working remotely", "plainKo": "NB 원격 근무 프랑스어 사용자",
    "officialName": "Francophones Working Remotely in New Brunswick",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/strategic-initiative.html"),
    "quote": ("have been working remotely for a Canadian employer located outside of Quebec during this "
              "entire period"),
    "checked": "2026-09-30",
    "jobLinked": False,
    "tags": ["french", "remoteWork"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [NBS_STEP_WORK_REMOTE, NBS_STEP_EOI_SI, NBS_STEP_POOL, NBS_STEP_APPLY_SI, NBS_STEP_REVIEW,
              NBS_STEP_PR],
}
"""Strategic Initiative 下的远程法语路径:在 NB 住满 12 个月、给魁省外的加拿大雇主远程工作,不要本省 offer。页面在列,2025–2026 抽选页没出现过。"""

PW_NB_CRITICAL_WORKER_PILOT = {
    "key": "nb-critical-worker-pilot", "province": "NB", "program": "PNP",
    "plainZh": "NB 关键工人试点", "plainEn": "NB Critical Worker Pilot", "plainKo": "NB 핵심 인력 시범",
    "officialName": "New Brunswick Critical Worker Pilot",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams/nb-critical-workers-pilot.html"),
    "quote": "The program does not accept direct applications from interested candidates.",
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["employers"],
    "teers": [],
    "nocs": [],
    "employers": ["cooke aquaculture",
                  "j d irving",
                  "groupe savoie",
                  "groupe westco",
                  "imperial manufacturing",
                  "mccain foods"],
    "steps": [NBS_STEP_OFFER_CWP, NBS_STEP_EOI_CWP, NBS_STEP_POOL_CWP, NBS_STEP_APPLY_CWP,
              NBS_STEP_SETTLE_CWP, NBS_STEP_REVIEW_CWP, NBS_STEP_PR_CWP],
}
"""五年期试点,只走 6 家参与雇主(Cooke Aquaculture、J.D. Irving、Groupe Savoie、Groupe Westco、Imperial Manufacturing 
Group、McCain Foods),个人不能直接申请 → 按雇主名命中才列(Frank 09-30「都收,标状态」)。页面走旧版路径,现行总览页仍链到它;该页缓存在但不在 crawl manifest 
里。
2026-09-30 批一 1b:门槛不收 —— 该页(现已在 crawl 清单 nb-imm 里)只有流程、参与雇主与「The program does not accept direct
applications from interested candidates.」,资格条文写在「New Brunswick Critical Worker Pilot Guide」PDF 里,指南不在 crawl 缓存,不猜。"""

PW_NB_PRIVATE_COLLEGE_PILOT = {
    "key": "nb-private-college-pilot", "province": "NB", "program": "PNP",
    "plainZh": "NB 私立学院毕业生试点", "plainEn": "NB Private Career College Graduate Pilot", "plainKo": "NB 사립 직업학교 졸업생 시범",
    "officialName": "Private Career College Graduate Pilot Program",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["New Brunswick Private Career College Graduate Pilot Program"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/pccg-pilot-program.html"),
    "quote": ("This program is for students that are not eligible for the federal post-graduation work "
              "permit (PGWP) program."),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["privateCollege"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [NBS_STEP_OFFER, NBS_STEP_EOI_PCCG, NBS_STEP_POOL_PCCG, NBS_STEP_APPLY_PCCG,
              NBS_STEP_REVIEW_PCCG, NBS_STEP_CLOSED_PERMIT, NBS_STEP_PR],
}
"""本省参与项目的私立职业学院读指定专业、拿不到 PGWP 的学生,要对口的全职 offer;有限开放至 2027 年底(Frank 09-30「都收,标状态」)。
2026-09-30 批一 1b:挂门槛流(pnp nb-req,试点页资格段:CLB 5、本省参与试点的私立学院课程、雇主经营 24 个月)。"""

PW_PE_INTERNATIONAL_GRADUATE = {
    "key": "pe-international-graduate", "province": "PE", "program": "PNP",
    "plainZh": "PE 国际毕业生", "plainEn": "PE International Graduate", "plainKo": "PE 국제 졸업생",
    "officialName": "International Graduate Stream",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Labour & Express Entry"],
    "reqStreams": ["PEI PNP — International Graduate stream",
                   ("PEI PNP Workforce streams (Skilled Worker / Critical Worker / International Graduate / "
                    "Occupations in Demand)"),
                   "PEI PNP Workforce — Employer Requirements (all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/international-graduates",
    "quote": "have graduated from a publicly-funded Prince Edward Island institution;",
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["localGrad", "pgwp"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [PES_STEP_OFFER, PES_STEP_EOI_IG, PES_STEP_DRAW, PES_STEP_APPLY_IG, PES_STEP_REVIEW, PES_STEP_PR],
}
"""Workforce 类的国际毕业生流:本省公立院校毕业 + PGWP + PEI offer。共用门槛组的语言行写「全体 Workforce 流都要考 CLB 4」,对本流 TEER 0–3 
不对(官方由雇主在 PEIW-02 上确认),批一 1b 改对之前不挂。
2026-09-30 批一 1b:语言行已按流改对(pnp PER_LANG_ROWS),挂门槛流三条 —— 本流自己的(本省公立院校毕业、TEER 0-3 雇主在 PEIW-02 上确认 /
TEER 4-5 要考 CLB 4)、四流合称那条(眼下只剩年龄)、雇主段(执照、经营年限)。"""

PW_PE_INTERMEDIATE_EXPERIENCE = {
    "key": "pe-intermediate-experience", "province": "PE", "program": "PNP",
    "plainZh": "PE 中级经验", "plainEn": "PE Intermediate Experience", "plainKo": "PE 중급 경력",
    "officialName": "Intermediate Experience Stream",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Labour & Express Entry"],
    "reqStreams": ["PEI PNP — Intermediate Experience stream", "PEI PNP Workforce — Employer Requirements (all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.princeedwardisland.ca/en/information/office-of-immigration/intermediate-experience-stream"),
    "quote": "gained while on a Labour Market Impact Assessment (LMIA) based work permit",
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["lmiaPermit"],
    "teers": [4],
    "nocs": [],
    "employers": [],
    "steps": [PES_STEP_ABROAD_IE, PES_STEP_OFFER, PES_STEP_EOI_IE, PES_STEP_DRAW, PES_STEP_APPLY_IE, PES_STEP_REVIEW,
              PES_STEP_PR],
}
"""Workforce 类的中级经验流:TEER 4 的 PEI offer + 持 LMIA 工签在加满 6 个月、与现职相关。
2026-09-30 批一 1b:挂门槛流两条 —— 本流自己的(高中、CLB 4)与雇主段。经验两条(LMIA 工签期间 6 个月、近 5 年 2 年经验或相关学历)
没入表:门槛量尺按省挑经验行,会漏到全体 PE TEER 4 岗上(理由见 pnp PER_IE_RULES),门槛卡本流暂无经验一行。"""

PW_PE_EXPRESS_ENTRY = {
    "key": "pe-express-entry", "province": "PE", "program": "PNP",
    "plainZh": "PE 快速通道", "plainEn": "PE Express Entry", "plainKo": "PE 익스프레스 엔트리",
    "officialName": "PEI Express Entry",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["Labour & Express Entry"],
    "reqStreams": ["PEI PNP — PEI Express Entry", "PEI PNP Workforce — Employer Requirements (all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-express-entry",
    "quote": ("Prince Edward Island prioritizes invitations issued through Express Entry for applicants "
              "working and living in the province with an eligible PEI employer."),
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["ee"],
    "teers": [],
    "nocs": [],
    "employers": [],
    "steps": [PES_STEP_EE_PROFILE, PES_STEP_OFFER, PES_STEP_EOI_EE, PES_STEP_DRAW, PES_STEP_APPLY_EE, PES_STEP_REVIEW,
              PES_STEP_PR_EE],
}
"""要不要 offer 官方前后矛盾(资格条文不要求,表格段又要雇主填 PEIW-02);优先在本省为合格雇主工作的人 → 看工作,标「需先有 EE 档案」。
2026-09-30 批一 1b:挂门槛流两条 —— 本流自己的(满足联邦三项目之一、在联邦 EE 池建档;网页原句)与雇主段(网页「Your employer must
complete the following form: PEIW-02」,指南雇主段写明雇主填 PEIW-02 即确认那几条)。外省毕业持 PGWP 者须同雇主在职 9 个月那条没入表
(同雇主在职行会被门槛量尺挂到全体 PE 岗上,理由见 pnp PER_EE_RULES)。"""

PW_NL_INTERNATIONAL_GRADUATE = {
    "key": "nl-international-graduate", "province": "NL", "program": "PNP",
    "plainZh": "NL 国际毕业生", "plainEn": "NL International Graduate", "plainKo": "NL 국제 졸업생",
    "officialName": "NLPNP International Graduate Category",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["NLPNP (ITA batch)"],
    "reqStreams": ["NLPNP International Graduate Category", "NLPNP (employer criteria, all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/international-graduate/"),
    "quote": "Must hold a valid post-graduation work permit (PGWP).",
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["pgwp", "fieldOfStudy"],
    "teers": [0, 1, 2, 3],
    "nocs": [],
    "employers": [],
    "steps": [NLS_STEP_OFFER, NLS_STEP_EOI, NLS_STEP_DRAW, NLS_STEP_APPLY, NLS_STEP_REVIEW, NLS_STEP_PR],
}
"""NL 持 PGWP 的人只能走本类或 EE 类(技术工人类明文「Cannot hold a Post-Graduation Work Permit.」)—— Frank「nl 之前不说有个毕业生通道吗?」
立的这一批就从它起。TEER 0–3,TEER 4 限在需职业;外省院校毕业的须先在 NL 工作满 1 年(门槛行漏了这一条,批一 1b 改)。ITA 批次不分类别,与技术工人同一组。
2026-09-30 批一 1b:门槛表补上外省毕业那条(条件行 grad-other-province,12 个月),本类各行 pageUrl 改指本类申请人页。
2026-10-01 Frank「都做吧」(TEER 4 多列、专业对口两条):① teers 由 0–4 收成 0–3 —— 官方 TEER 4 只收「in-demand」职业(资格页原句
「or a TEER 4 (in-demand) occupation, as established by OIM」),政策第 30 条把这份名单链到 excluded-positions(= pnp 域抓的 nl-priority);
35 个职位名逐个对 StatCan NOC 2021 例名(data/raw/noc/noc-elements.csv)没有一个落在 TEER 4(水产技术工 22110 TEER 2、管理 TEER 0、
Personal Care Attendant 可对 33102 / 44101,而第 30 条明写 44101 不在名单上),所以 TEER 4 实际一个都不收。名单日后加了 TEER 4 职位要回来重判。
② 加标签「工作需与所学专业对口」(fieldOfStudy):申请人页原句「Job related to field of study (with some exceptions for local graduates).」。"""

PW_NL_EXPRESS_ENTRY_SKILLED_WORKER = {
    "key": "nl-express-entry-skilled-worker", "province": "NL", "program": "PNP",
    "plainZh": "NL 快速通道技术工人", "plainEn": "NL Express Entry Skilled Worker", "plainKo": "NL 익스프레스 엔트리 숙련 노동자",
    "officialName": "NLPNP Express Entry Skilled Worker Category",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["NLPNP (ITA batch)"],
    "reqStreams": ["NLPNP Express Entry Skilled Worker Category", "NLPNP (employer criteria, all streams)"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/express-entry-skilled-worker/"),
    "quote": "Accepted into IRCC’s Express Entry pool.",
    "checked": "2026-09-30",
    "jobLinked": True,
    "tags": ["ee"],
    "teers": [0, 1, 2, 3],
    "nocs": [],
    "employers": [],
    "steps": [NLS_STEP_EE_PROFILE, NLS_STEP_JVA_EE, NLS_STEP_OFFER, NLS_STEP_EOI, NLS_STEP_DRAW, NLS_STEP_APPLY_EE,
              NLS_STEP_REVIEW, NLS_STEP_PR_EE],
}
"""TEER 0–3 的 NL offer + 联邦 EE 池 + NLPNP 打分 ≥ 67;PGWP 持有人可以走。门槛(67 分那条原句在 nl-req 注里,本类门槛未入表)待批一 1b。
2026-09-30 批一 1b:门槛入表(etl/pnp NLR_EE_RULES:EE 池、打分表 67 分、资格 / 执照条文三条),挂上本类流与 NL 雇主流。"""

PATHWAYS = [
    PW_AB_OPPORTUNITY, PW_AB_ACCELERATED_TECH, PW_AB_DEDICATED_HEALTH_CARE, PW_AB_LAW_ENFORCEMENT,
    PW_AB_TOURISM_HOSPITALITY, PW_AB_RURAL_RENEWAL,
    PW_BC_SKILLED_WORKER, PW_BC_HEALTH_AUTHORITY, PW_BC_HEALTHCARE, PW_BC_CHILDCARE, PW_BC_VETERINARY,
    PW_BC_CONSTRUCTION_TRADES, PW_BC_FRENCH_TEACHERS,
    PW_SK_EMPLOYMENT_OFFER, PW_SK_HEALTH_TALENT, PW_SK_TECH_TALENT, PW_SK_AGRICULTURE_TALENT, PW_SK_EXISTING_WORK_PERMIT,
    PW_SK_STUDENTS, PW_SK_OCCUPATION_IN_DEMAND, PW_SK_EXPRESS_ENTRY,
    PW_MB_SKILLED_WORKER_IN_MANITOBA, PW_MB_SKILLED_WORKER_OVERSEAS, PW_MB_CAREER_EMPLOYMENT, PW_MB_GRADUATE_INTERNSHIP,
    PW_ON_WORKFORCE_PRIORITY, PW_ON_EMPLOYER_JOB_OFFER_FOREIGN_WORKER, PW_ON_EMPLOYER_JOB_OFFER_INTERNATIONAL_STUDENT,
    PW_ON_SELF_EMPLOYED_PHYSICIANS,
    PW_NS_SKILLED_WORKER, PW_NS_CONSTRUCTION, PW_NS_GRADUATE, PW_NS_PHYSICIANS, PW_NS_EXPRESS_ENTRY_EXPERIENCE,
    PW_NS_EXPRESS_ENTRY_PHYSICIANS,
    PW_NB_SKILLED_WORKER, PW_NB_EXPRESS_ENTRY_EMPLOYMENT, PW_NB_FRANCOPHONE_WORKERS, PW_NB_EXPRESS_ENTRY_INTEREST,
    PW_NB_FRANCOPHONE_PRIORITIES, PW_NB_FRANCOPHONES_REMOTE, PW_NB_CRITICAL_WORKER_PILOT, PW_NB_PRIVATE_COLLEGE_PILOT,
    PW_NL_SKILLED_WORKER, PW_NL_INTERNATIONAL_GRADUATE, PW_NL_EXPRESS_ENTRY_SKILLED_WORKER,
    PW_PE_WORKFORCE, PW_PE_OCCUPATIONS_IN_DEMAND, PW_PE_INTERNATIONAL_GRADUATE, PW_PE_INTERMEDIATE_EXPERIENCE,
    PW_PE_EXPRESS_ENTRY,
    PW_AIP,
]
"""全表(顺序 = 产物 seq 序)。⚠ 顺序有意义:一组抽选覆盖几条通道时,通道名按这里的先后拼(PE 劳工通道在 PE 在需职业前;
NS 两条在 AIP 前、NL 在 AIP 前 —— AIP 放最后)。省内一律省默认通道打头。
2026-09-28 通道表批二:前端 components/pnp 的六张对照常量退役、改读本表进库的那份,各张原注里的决策记录搬到这里(逐段的已并进上面各 PW_ 段):
- GEN_CHANNEL_PROVS(有省默认通道的九省):2026-09-23 Frank「改 全改」—— PNP 格写这条通道的名字(词条 `pnp.gen.` + 省码),不再写
  「{省} 可提名」;出处逐省在 etl 的 PNP 资格表与 mart 常量 UNIVERSAL_*_PROVS。BC 原叫 Skills Immigration,2026-09-24 九省通道审计改名
  BC Skilled Worker(Skills Immigration 是项目名,持 offer 的通道是它下面的 Skilled Worker stream)。2026-09-28 自 jobs 迁入 pnp 桶时,
  原先职位板格子按这张表判、弹框通道卡按「英文词条查不查得到」判,两种判法同一个事实并成一张;批二起改读本表 isDefault 行。
- GEN_DRAW_STREAM(省默认通道 → 抽选组,点进来那一组高亮、排最前):2026-09-23 Frank「所以这个 NB 技术工人点进去应该哪个高亮」立;
  当时其余省对不上一一对应不登记 = 不高亮(BC 整卡都是 Skills Immigration 的类别轮,MB / PE 组名与通道不同名,SK / NS 没有抽选,
  ON 改制卡暂撤),之后 09-24 审计、第三批与 09-27 陆续补登 PE / NL / MB / BC / NS / ON(见各省默认通道那段)。
- NAMED_DRAW_STREAMS(具名通道 → 抽选组):2026-09-24 Frank「AB 医疗也走机会通道?」「点进去应该哪个高亮」引出 —— 阿省医护专项清单
  进库,同批把与抽选组一一对得上的具名清单登记进来;SK / MB / NS / PE 的具名清单当时对不上抽选组,不登记 = 不高亮(之后 PE 在需职业、
  NS 建筑按「同一组覆盖本省全部通道」补登)。
- QUOTA_STREAM_KEYS / NAMED_REQ_STREAMS / GEN_REQ_STREAMS:见阿省六段(2026-09-27 九省体检与门槛卡批一)。
2026-09-30 通道补全批一(Frank「nl 之前不说有个毕业生通道吗?」「所以我漏通道了吗?」;立项稿 docs/design/通道补全-20260930.md):
九省清点后补 25 行,各省接在原有行之后、AIP 仍最后。新行都不是省默认、不挂岗位通道名 —— 前端现在只认省默认行与挂岗位通道名的行
(pnpChannelOf / genDrawOf / pnpDefaultProvsOf / gatedKeysOf),加行页面一个字不变,弹框读新行归批二。旧行里会动页面的三处(阿省
机会通道认领「Alberta Opportunity Stream – Priority Sectors」、曼省默认认领省方邀请组「Skilled Worker Stream」、阿省医疗专项挂
快速通道版门槛)也归批二。"""

# =========================================================================
# 3. 读 pnp 产物(自校只认 raw/pnp 的现值:pathways → pnp 产物单向依赖,不读 mart)
# =========================================================================

IN_PNP_DIR = paths.PNP
"""输入:raw/pnp(抽选、门槛、配额统计、职业清单全在这一个目录)。"""

DRAWS_GLOB = "draws-*.json"
"""抽选表:一省一份(2026-09-26 晚按省拆)。"""

REQ_GLOB = "*-req.json"
"""门槛表:一省一份。"""

STATS_GLOB = "*-stats.json"
"""运营统计表:一省一份(通道级配额行目前只有阿省的 streams 表)。"""

LIST_GLOB = "*.json"
"""职业清单:目录下带 label 的表(抽选 / 门槛 / 统计表没有 label,自然跳过)。"""

ENC_UTF8 = "utf-8"
"""raw/pnp 的文件编码。"""

K_PROVINCES = "provinces"
"""抽选表键:省 → 块。"""

K_DRAWS = "draws"
"""抽选块键:轮次清单。"""

K_STREAM = "stream"
"""抽选行 / 门槛行 / 配额行共用的通道名键(官方原名,照抄)。"""

K_REQUIREMENTS = "requirements"
"""门槛表键:条文清单。"""

K_STREAMS = "streams"
"""统计表键:通道级配额行(阿省 aaip-processing-information 页的通道表)。"""

K_LABEL = "label"
"""清单表键:清单短名(= 岗位通道名的来源)。"""

K_TYPE = "type"
"""清单表键:indemand / ineligible / community / priority / policy。"""

K_SIGNAL = "signal"
"""清单表键:只作参考信号的表(不当通道;2026-09-24 九省通道审计)。"""

K_OCCUPATIONS = "occupations"
"""清单表键:职业行。"""

K_COMMUNITIES = "communities"
"""社区表键:指定社区名单。"""

TYPE_INELIGIBLE = "ineligible"
"""清单类型:排除式(清单上的职业不能走),不给岗位挂通道名。"""

TYPE_COMMUNITY = "community"
"""清单类型:按社区名单判的通道(AB 乡村振兴),没有职业行也挂通道名。"""

PROGRAM_PNP = "PNP"
"""项目码:省提名(清单表不写 program = 省提名)。"""

RULE_BOARD_LABELS = ["SK 现有工签"]
"""不来自任何清单、由 mart 规则判出来的岗位通道名(mart constants 的 SK_EWP_LABEL;具名清单都没命中、可提名的 TEER 4-5 与卡车司机岗)。
与 mart 的判法同源于 2026-09-24 九省通道审计;mart 那边改名这里跟着改,自校会把漏改的报红。"""

# =========================================================================
# 4. 自校(对不上就停,不写产物)
# =========================================================================

KEY_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
"""编号规则:全小写、连字符。"""

STATUSES = ["open", "paused", "closed"]
"""状态词表(立项稿第四节):开着 / 暂停受理 / 已关停。"""

STATUS_CLOSED = "closed"
"""已关停:不许再挂岗位通道名。"""

REQUIRED_TEXT = ["key", "province", "program", "plainZh", "plainEn", "plainKo", "officialName", "status", "url", "quote",
                 "checked"]
"""必填的文字格(空串 / None 都算缺):库表只在编号上设非空,其余靠这里在源头挡 —— 一行缺格让整轮 seed 回滚的代价是职位停更。"""

K_KEY = "key"
"""对照表键:我们的编号。"""

K_PROVINCE = "province"
"""对照表键:省码(联邦项目写 FED)。"""

K_PROGRAM = "program"
"""对照表键 / 清单表键:项目码。"""

K_BOARD_LABEL = "boardLabel"
"""对照表键:岗位上挂的通道名(= 汇装 pnp_stream 的取值;省默认通道为 None)。"""

K_IS_DEFAULT = "isDefault"
"""对照表键:省默认通道(本省可提名但没挂具名通道的岗落它)。"""

K_DRAW_STREAMS = "drawStreams"
"""对照表键:官方用来邀请它的抽选组(抽选行 stream 原值)。"""

K_DRAWS_PENDING = "drawsPending"
"""对照表键(只在对照表里,不进产物):官方已开 EOI、还没抽过 —— 抽选组暂不要求已出现在抽选表里。"""

K_REQ_STREAMS = "reqStreams"
"""对照表键:门槛表里的流(门槛行 stream 原值)。"""

K_QUOTA_SCOPE = "quotaScope"
"""对照表键:配额表里这条通道那一行的官方写法(统计表 streams 行 stream 原值;没有通道级配额为 None)。"""

K_OCC_LABELS = "occLabels"
"""对照表键:职业清单的 label(具名清单通道才有)。"""

K_STATUS = "status"
"""对照表键:open / paused / closed。"""

K_JOB_LINKED = "jobLinked"
"""对照表键(2026-09-30 通道补全批一):这个岗跟这条通道有没有关系 —— 要本省 offer 或本省工作经验 = True(弹框通道卡上段,按岗位筛);
不看工作 = False(下段「不要 offer 的通道」,按省列;Frank 09-30「不看工作的也收」)。旧行不写按 True。"""

K_TAGS = "tags"
"""对照表键:条件标签键(TAG_KEYS 词表;三语文案在 cms i18n)。旧行不写按 []。"""

K_TEERS = "teers"
"""对照表键:本岗 TEER 在内才列通道卡上段;[] = 不限。"""

K_NOCS = "nocs"
"""对照表键:本岗职业码在内才列通道卡上段;[] = 不限(有现成职业清单的照旧用 occLabels)。"""

K_EMPLOYERS = "employers"
"""对照表键:雇主名(归一后小写)命中才列通道卡上段;[] = 不限(NS 医生限 NS Health / IWK、NB 关键工人试点限 6 家)。"""

JOB_LINKED_DEFAULT = True
"""jobLinked 没写时按看工作算(09-30 前的 29 行全是看工作的通道)。"""

TAG_KEYS = ["ee", "localGrad", "pgwp", "noPgwp", "french", "employers", "timeLimited", "lmiaPermit", "noDraws",
            "drawsStopped", "letter", "connection", "mitacs", "localExperience", "privateCollege", "remoteWork",
            "physician", "fieldOfStudy"]
"""条件标签词表(2026-09-30 通道补全批一;人的条件与通道状态,不拿来挡着不列,弹框写成标签):需先有 EE 档案 / 需本省毕业 / 需持 PGWP /
不收持 PGWP 的人 / 需说法语 / 限指定雇主 / 限时 / 需持 LMIA 工签 / 目前没有抽选排期 / 近期没再抽选 / 需收到省兴趣信 / 需与本省有联系 /
需做过 Mitacs 实习 / 需本省工作满 1 年 / 限本省私立学院指定专业 / 需远程为魁省外雇主工作 / 限执业医生 /
工作需与所学专业对口(2026-10-01 加,NL 国际毕业生)。"""

TEER_VALUES = [0, 1, 2, 3, 4, 5]
"""teers 只许这六档。"""

NOC_RE = re.compile(r"^\d{5}$")
"""nocs 只许五位职业码(NOC 2021)。"""

BAD_TAG_TPL = "{key} 的标签「{tag}」不在词表里(TAG_KEYS)"
"""自校:标签写错。"""

BAD_TEER_TPL = "{key} 的 teers 里有「{teer}」(只许 0–5)"
"""自校:TEER 写错。"""

BAD_NOC_TPL = "{key} 的 nocs 里有「{noc}」(只许五位职业码)"
"""自校:职业码写错。"""

BAD_EMPLOYER_TPL = "{key} 的 employers 里有「{name}」(只许归一后的小写名,不许空)"
"""自校:雇主名没归一。"""

UNLINKED_BOARD_TPL = "{key} 不看工作(jobLinked = False),却挂着岗位通道名或是省默认"
"""自校:岗位不会落到不看工作的通道上。"""

MISSING_FIELD_TPL = "第 {seq} 条({key})缺「{field}」"
"""自校:必填格空着。"""

DUP_KEY_TPL = "编号重复:{key}"
"""自校:两条通道同一个编号。"""

BAD_KEY_TPL = "编号不合规则(全小写、连字符):{key}"
"""自校:编号写法不对。"""

BAD_STATUS_TPL = "{key} 的状态「{status}」不在词表里(open / paused / closed)"
"""自校:状态写错。"""

DUP_BOARD_TPL = "岗位通道名「{label}」被两条通道认领"
"""自校:一个岗位通道名只能对一条通道。"""

MULTI_DEFAULT_TPL = "{prov} 有 {n} 条省默认通道(至多一条)"
"""自校:省默认通道多于一条。"""

CLOSED_BOARD_TPL = "{key} 已关停,却还挂着岗位通道名「{label}」"
"""自校:关停的通道不许再挂在岗位上。"""

DRAW_MISSING_TPL = "{key} 的抽选组「{stream}」不在 raw/pnp 抽选表里(官网改名?)"
"""自校:抽选组对不上。"""

PENDING_SEEN_TPL = "  ℹ {key} 的抽选组「{stream}」已出现在抽选表里,对照表可以摘掉 drawsPending"
"""提示(不算红):等开抽的通道开抽了。"""

REQ_MISSING_TPL = "{key} 的门槛流「{stream}」不在 raw/pnp 门槛表里(官网改名?)"
"""自校:门槛流对不上。"""

QUOTA_MISSING_TPL = "{key} 的配额行「{scope}」不在 raw/pnp 统计表的通道行里(官网改名?)"
"""自校:配额行对不上。"""

OCC_MISSING_TPL = "{key} 的职业清单「{label}」不在 raw/pnp 清单里"
"""自校:清单名对不上。"""

BOARD_MISSING_TPL = "{key} 的岗位通道名「{label}」不是 pnp 清单(或 RULE_BOARD_LABELS)会给岗位挂的名字"
"""自校:对照表认领了一个岗位上不会出现的名字。"""

BOARD_UNMAPPED_TPL = "pnp 清单会给岗位挂「{label}」,对照表里没有这条通道(新清单?)"
"""自校:汇装新出一个通道名、对照表里没有。"""

K_STEPS = "steps"
"""对照表键:申请步骤(2026-10-02 申请步骤批 1;没登的通道 = [],弹框照旧出抽选卡)。一步的格见下面几个键,设计
docs/design/申请步骤-20261002.md 第 3.1 节。"""

K_STEP = "step"
"""步骤键:步骤词(STEP_KEYS 之一)。"""

K_WHO = "who"
"""步骤键:谁做(WHO_KEYS 之一)。"""

K_FACTS = "facts"
"""步骤键:事实行清单。"""

K_REF = "ref"
"""事实行键:引用别的表(REF_KEYS 之一);有它就不存原句。"""

K_QUOTE = "quote"
"""事实行键:官方原句(静态事实才有;自校逐句对 crawl 缓存)。"""

K_URL = "url"
"""事实行键:原句出处页。"""

STEP_KEYS = ["employerRegister", "offer", "work", "epa", "eeProfile", "eoi", "draw", "confirm", "apply", "review", "settle",
             "endorse", "pr", "community", "register", "submit", "interestLetter", "closedPermit"]
"""步骤词表(三语文案在 cms i18n pnp.step.*):雇主登记 / 拿雇主 offer / 在这份工作上干够 / 雇主递职位审批 / 建 EE 档案 / 递 EOI /
进池与抽选 / 确认职位、递申请 / 收邀请、递申请 / 省里审批 / 做安置计划 / 雇主递省背书 / 拿提名,递永居 /
拿社区推荐信(community,2026-10-02 批 2 阿省乡村振兴加)/ 网上注册打分(register,2026-10-03 批 2 卑诗加:卑诗叫 registration,
注册后按打分进池)/ 递申请(submit,同日卑诗卫生局:持 offer 直接递、不经邀请)/ 收到省兴趣信(interestLetter,同日新不伦瑞克)/
申请封闭工签(closedPermit,同日新不伦瑞克私立学院试点)。"""

WHO_KEYS = ["you", "employer", "province", "federal"]
"""谁做的词表。"""

REF_KEYS = ["req", "processing", "intake", "draws"]
"""引用词表:req = 门槛表一行(带 factor)、processing = 运营统计处理时长(带 scope)、intake = 萨省收件窗口、draws = 抽选表。"""

FACT_KEYS = ["eoiFee", "eoiValidMonths", "inviteAcceptDays", "appSubmitDays", "nominationValidMonths", "communityLetter",
             "cappedEmployees", "windowCapped", "directApply", "eoiOnlyOther", "confirmSubmit", "noScheduledDraw", "inviteSubmitDays",
             "eeAcceptDays", "prSubmitDays", "workMonths", "employerDeclaration", "offerEoiDays", "noFee", "eoiValidDays", "appFee", "reviewSeveralMonths", "noTimeGuarantee", "poolSelection", "inviteSectors", "letterOrGrad", "employerOnly", "empMonths", "closedPermitDays", "liveMonths", "remoteNonQc", "movedToSwm", "nominationValidDays", "teer45EmployerMonths", "localWorkMonths", "eoiIsApplication", "afsPaused", "letterSubmitDays", "selectedPayDays", "noPermitOnly", "abroadOnly", "noStandardTime", "salesServiceLow"]
"""静态事实词表(三语文案在 cms i18n pnp.stepFact.*,数字从 vars 填)。"""

BAD_STEP_TPL = "{key} 的第 {i} 步「{step}」不在步骤词表里"
"""自校:步骤词不认得。"""

BAD_WHO_TPL = "{key} 的第 {i} 步谁做「{who}」不在词表里"
"""自校:谁做不认得。"""

BAD_FACT_TPL = "{key} 的第 {i} 步有一行事实既不是认得的引用、也不是认得的事实词:{fact}"
"""自校:事实行认不出。"""

QUOTE_EMPTY_TPL = "{key} 的第 {i} 步「{fact}」没挂原句或出处页"
"""自校:静态事实缺原句。"""

QUOTE_MISSING_TPL = "{key} 的第 {i} 步「{fact}」的原句在 crawl 缓存那一页里找不到(官网改字?):{url}"
"""自校:原句核不上 —— 官网改一个词就红,须人工重读,不放宽成关键词命中。"""

PAGE_MISSING_TPL = "{key} 的第 {i} 步「{fact}」的出处页不在 crawl 缓存里:{url}"
"""自校:出处页没爬到(先补 crawl 种子,不现抓)。"""

WS_RE = re.compile(r"\s+")
"""核原句时去掉全部空白(页面链接断开会在标点前留空格,两边都去掉再比)。"""

HTML_PARSER = "html.parser"
"""核原句取正文用的解析器(标准库,不加依赖)。"""

DROP_TAGS = ["script", "style", "noscript"]
"""核原句前剥掉的标签。"""

FILETYPE_PDF = "pdf"
"""核原句读 PDF 原件时 pymupdf.open 的 filetype(从内存流开 PDF 必须显式给;2026-10-03)。"""

EMPTY = ""
"""空串(去空白的替换值、缺格的默认值)。"""

# =========================================================================
# 5. 产出行(列对齐库表 pathways;camelCase 键,mart 直通,cms 的 lib/mart 映射成 snake_case 列)
# =========================================================================

SEQ_START = 1
"""seq 从 1 起(= PATHWAYS 顺序)。"""
