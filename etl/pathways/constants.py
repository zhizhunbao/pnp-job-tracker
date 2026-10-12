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

ABS_STEP_WORK = {"step": "work", "who": "you", "none": False, "stuck": False,
                 "facts": [{"ref": "req", "factor": "experience"}]}
"""在这份工作上干够(旅游酒店通道):读门槛卡「工作经验」行(门槛表 experience:在现雇主连续全职满 6 个月 / 780 小时)。
2026-10-08 Frank「这个很多不是需要工作满 1 年 或者 3 个月 或者半年 才能投递么」「其他省也检查一下」:凡门槛是
「在这份工作 / 这家雇主干够 N 个月」(employerTenure)的通道都挂这一步,排第一步(照萨省 SKS_STEP_WORK、曼省
MBS_STEP_WORK 的位置);申请前的既往经验(近 N 年内满 M 个月)不是流程里的一步,留在门槛卡。
2026-10-11 Frank「应该是先拿 offer 然后 工作满 1 年」「这个顺序吧」:阿省这一步改排在拿 offer 之后(先有这份工作才谈得上在这份
工作上干满);旅游酒店官方原句「You must have 6 consecutive months (780 hours) of work experience with your current employer.」。"""

ABS_STEP_WORK_LOCAL = {"step": "workLocal", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "experience"}]}
"""在本省工作满(机会通道;2026-10-11 Frank「先把 AB 弄明白」后补):读门槛卡「工作经验」行 —— 递交时须在阿省现职全职满 12 个月
(近 18 个月内),或同职业在加拿大 / 国外累计满 24 个月(近 30 个月内),毕业工签满 6 个月。官方原句「At the time your
application is submitted you must have either: a minimum of 12 months full-time work experience in your current occupation in
Alberta within the last 18 months, or a minimum of 24 months ...」,且递交与审批时都须持工签在阿省做这份工作(「temporary
residents living or working in a province or territory of Canada other than Alberta」不能申请)—— 没有既往经验的人拿到 offer
得先在阿省干满,按 10-08 判据(拿到 offer 之后还要不要等)是一步;10-08 审计把它当既往经验留在门槛卡,判错。排在拿 offer 之后。"""

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
    "steps": [ABS_STEP_OFFER, ABS_STEP_WORK_LOCAL, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY, ABS_STEP_REVIEW_AOS,
              ABS_STEP_PR_AOS],
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
    "steps": [ABS_STEP_OFFER, ABS_STEP_WORK, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY, ABS_STEP_REVIEW_TOURISM,
              ABS_STEP_PR],
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

ONS_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False, "facts": []}
"""拿安省雇主 offer(2026-10-11 补;理由见 SKS_STEP_OFFER):Workforce Priority 要先有这份工作才谈得上在这家干满。"""

ONS_STEP_REGISTER = {"step": "employerRegister", "who": "employer", "none": False, "stuck": False,
                     "facts": [{"ref": "req", "factor": "empYears"}]}
"""雇主登记(在雇主门户登记公司、为你的职位递 job offer;劳动力优先页「Your employer must start the process by registering
their business and providing information about your position by submitting a job offer in the Employer Portal.」):经营年限
读门槛表 empYears 行(经营满 3 年等雇主条件)。"""

ONS_STEP_WORK = {"step": "work", "who": "you", "none": False, "stuck": False,
                 "facts": [{"ref": "req", "factor": "experience"}]}
"""在这份工作上干够(劳动力优先):读门槛卡「工作经验」行,按本岗 TEER 挑档(TEER 0-3 在这个岗位连续全职满 6 个月、
安省应届毕业生 3 个月,或同职业累计满 2 年、或持该职业执照;TEER 4-5 累计满 9 个月;门槛表 on-req 五行)。递 EOI 时就得
满足 —— 通道页原句「Remember that you must also make sure you meet all stream criteria at the time you register your
expression of interest.」。2026-10-08 Frank「这个很多不是需要工作满 1 年 或者 3 个月 或者半年 才能投递么」:原先只有
雇主登记 → 递 EOI,读起来像拿到 offer 马上能递。"""

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
                "dur": {"kind": "upto", "unit": "day", "min": 0, "max": 14, "quote": "Employer application for an approval of an employment position must be submitted within 14 calendar days from the date the invitation to apply was issued.", "url": "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp-application-process"},
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
    "steps": [ABS_STEP_OFFER, ABS_STEP_COMMUNITY, ABS_STEP_EOI, ABS_STEP_DRAW, ABS_STEP_APPLY,
              ABS_STEP_REVIEW_RURAL, ABS_STEP_PR_RURAL],
}
"""阿省乡村振兴(按指定社区判:岗位城市在社区名单、职业不在它的 17 个排除码里,社区表 ab-rural.json;2026-09-24 第三批)。
配额行与抽选组同名。英文界面现显示官方原名(stream.abRural = Rural Renewal Stream)。
2026-10-11(Frank「先把 AB 弄明白」):步骤改成先拿 offer 再拿社区推荐信 —— 资格页原句推荐信「must outline the following: …
details of the bona fide job offer」,先有 offer 社区才出得了推荐信(原先推荐信排第一,反了)。"""

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

SKS_STEP_OFFER = {"step": "offer", "who": "employer", "none": False, "stuck": False, "facts": []}
"""拿萨省雇主 offer(2026-10-11 Frank「不可能 没有拿 offer 这一步」「没拿 offer 怎么 工作满」):雇主递职位审批(EPA)要先有 offer,
定向三条 / 现有工签 / 留学生的「工作满」也得先有这份工作 —— 萨省六条要 offer 的通道补这一步、排第一(雇主条件在「雇主登记」那步
读门槛卡,这里不重复写)。同批全国扫一遍「工作满」排在 offer 前或没有 offer 的:萨省六条、曼省 SWM、安省 Workforce Priority、
NS 快速通道本省经验、NB 技术工人、NL 国际毕业生,一律改成先拿 offer 再干满(10-08 work-step 判据「一律排第一步」随之翻成排 offer 之后);
NB 远程法语(给外省雇主远程干活)不是本省雇主 offer,不补。"""

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
                              "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "There are no scheduled EOI draws at this time.", "url": "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-eoi-system"},
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

SKS_STEP_WORK_REQ = {"step": "work", "who": "you", "none": False, "stuck": False,
                     "facts": [{"ref": "req", "factor": "experience"}]}
"""在这份工作上干够(医疗 / 科技 / 农业三条定向通道):读门槛卡「工作经验」行 —— 官方是二选一:在担保雇主处全职满 6 个月
(780 小时;门槛表 experienceAlt employerTenure),或已有同职业 1 年全职经验(近 3 / 5 年内;门槛表 experience 主行)。
没有既往经验的人拿到 offer 后得先干够 6 个月才能递,所以是一步;前端 stepExpRowOf 把「干够」写第一行、既往经验写「或已有…」。
2026-10-08 Frank「弄明白 我们要是弄不明白 用户更不明白了」。"""

SKS_STEP_WORK_LOCAL = {"step": "workLocal", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "experience"}]}
"""在本省干够(国际学生通道):读门槛卡「工作经验」行(门槛表 experience:在本省 6 个月 / 780 小时与所学专业相关的有薪工作)。
不是「这份工作」,是毕业后在本省攒的工作,步骤词用 workLocal(2026-10-08 新词;NS 快速通道本省经验、NB 远程法语同日改用)。"""


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

SKS_STEP_REVIEW_NONE = {"step": "review", "who": "province", "none": False, "stuck": False,
                        "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 4, "quote": "Our goal is to process all International Skilled Worker and Saskatchewan Experience applications within 16 weeks", "url": "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/sinp-processing-statistics"}, "facts": []}
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
    "steps": [SKS_STEP_OFFER, SKS_STEP_REGISTER, SKS_STEP_EPA_CAPPED, SKS_STEP_DIRECT, SKS_STEP_CONFIRM, SKS_STEP_REVIEW_EO,
              SKS_STEP_PR],
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
    "steps": [SKS_STEP_OFFER, SKS_STEP_WORK_REQ, SKS_STEP_REGISTER, SKS_STEP_EPA_PRIORITY, SKS_STEP_DIRECT, SKS_STEP_CONFIRM,
              SKS_STEP_REVIEW_HEALTH, SKS_STEP_PR],
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
    "steps": [SKS_STEP_OFFER, SKS_STEP_WORK_REQ, SKS_STEP_REGISTER, SKS_STEP_EPA_PRIORITY, SKS_STEP_DIRECT, SKS_STEP_CONFIRM,
              SKS_STEP_REVIEW_TECH, SKS_STEP_PR],
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
    "steps": [SKS_STEP_OFFER, SKS_STEP_WORK_REQ, SKS_STEP_REGISTER, SKS_STEP_EPA_PRIORITY, SKS_STEP_DIRECT, SKS_STEP_CONFIRM,
              SKS_STEP_REVIEW_AGRI, SKS_STEP_PR],
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

MBS_STEP_APPLY = {"step": "apply", "who": "you", "none": False, "stuck": False,
                  "facts": [{"key": "inviteSubmitDays", "vars": {"n": 60},
                             "quote": "You will have 60 days from the date of your LAA to submit a full application.",
                             "url": "https://immigratemanitoba.com/immigrate/apply/laa/"}]}
"""收邀请(LAA)、递完整申请:官方流程页只写收到 LAA 后递完整申请,没写几天内递,不写。
2026-10-12 审理与递申请时长补全(Frank「不能每次补数据都 好几个小时」→ 三省分组并行查):MPNP 通用的 LAA 页写明收到 LAA 后
60 天内递完整申请(页面补进 crawl 缓存 mb-mpnp);四条通道都走 EOI → 抽选 → LAA,同一句适用。"""

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

NSS_STEP_WORK = {"step": "workLocal", "who": "you", "none": False, "stuck": False,
                 "facts": [{"key": "localWorkMonths", "vars": {"n": 12},
                            "quote": ("have at least one year of experience working in Nova Scotia in an occupation "
                                      "at TEER 0, 1, 2, or 3 of the National Occupational Classification"),
                            "url": NSS_EE_URL}]}
"""在本省干够(快速通道本省经验;2026-10-08 步骤词 work → workLocal,本省经验不是「这份工作」):在本省 TEER 0-3 职业工作满一年(原句「one year」,按 12 个月填;资格清单里的一条,
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

NSS_STEP_REVIEW_EE = {"step": "review", "who": "province", "none": False, "stuck": False,
                      "facts": [NSS_STEP_REVIEW["facts"][0], NSS_STEP_REVIEW["facts"][1],
                                {"key": "reviewMonthsMin", "vars": {"n": 3},
                                 "quote": "It can take 3 months or more to evaluate your submission for these reasons:",
                                 "url": ("https://liveinnovascotia.com/sites/default/files/2026-02/"
                                         "Guide-NSNP-Nova%20Scotia%20Express%20Entry-English.pdf")}]}
"""省里审批(新斯科舍快速通道两条;2026-10-12 审理与递申请时长补全):同上两行,另加快速通道申请指南(2026 年 9 月版,原件进
crawl 文件缓存)那句「审理要 3 个月或更久」—— 只说下限,时间线记「至少 3 个月」。技术工人 / 毕业生 / 建筑几条官方仍没写时长。"""

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
    "steps": [SKS_STEP_OFFER, SKS_STEP_WORK, SKS_STEP_REGISTER, SKS_STEP_EPA_CAPPED, SKS_STEP_NO_EOI, SKS_STEP_CONFIRM,
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
    "steps": [MBS_STEP_OFFER, MBS_STEP_WORK, MBS_STEP_EOI, MBS_STEP_DRAW, MBS_STEP_APPLY, MBS_STEP_REVIEW_SWM, MBS_STEP_PR],
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
    "steps": [ONS_STEP_OFFER, ONS_STEP_WORK, ONS_STEP_REGISTER, ONS_STEP_EOI, ONS_STEP_DRAW, ONS_STEP_EPA, ONS_STEP_APPLY,
              ONS_STEP_REVIEW, ONS_STEP_PR],
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

NBS_STEP_WORK = {"step": "work", "who": "you", "none": False, "stuck": False,
                 "facts": [{"ref": "req", "factor": "experience"}]}
"""在这份工作上干够(技术工人 Experience 路径):读门槛卡「工作经验」行(在担保雇主处全职满 6 个月;Graduates 路径本省院校
毕业不要求经验,门槛卡经验替代行「或本省院校毕业」一起出)。2026-10-08 Frank「其他省也检查一下」随安省同批挂上。"""

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

NBS_STEP_WORK_REMOTE = {"step": "workLocal", "who": "you", "none": False, "stuck": False,
                        "facts": [{"key": "liveMonths", "vars": {"n": 12},
                                   "quote": "have been living in New Brunswick for 12 months", "url": NBS_SI_URL},
                                  {"key": "remoteNonQc", "vars": {},
                                   "quote": ("have been working remotely for a Canadian employer located outside of "
                                             "Quebec during this entire period"),
                                   "url": NBS_SI_URL}]}
"""在本省干够(远程法语;2026-10-08 步骤词 work → workLocal):近 12 个月住在本省,期间一直远程为魁省外的加拿大雇主工作(资格清单相邻两条,一条一行,照抄不带
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
                      "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 12, "quote": "They remain valid for 365 days from the date of submission.", "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program.html"},
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

NBS_GUIDES_BASE = "https://www.gnb.ca/content/dam/GNB3/t/fhc-fmc/immigration/docs/"
"""新不伦瑞克各通道申请指南 PDF 的目录(原件进 crawl 文件缓存 files-www.gnb.ca)。"""

NBS_ITA_DAYS_QUOTE = ("If you receive an invitation to apply (ITA), you will have 20 calendar days to submit a complete app"
                      "lication to ImmigrationNB and pay the processing fee through the INB portal.")
"""各通道申请指南同一句:收到邀请后 20 个日历日内递完整申请并交费(2026-10-12 审理与递申请时长补全;关键工人试点另写 45 天)。"""

NBS_STEP_APPLY_SW = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 250}, "quote": NBS_APP_FEE_QUOTE, "url": NBS_SW_URL},
                               {"key": "inviteSubmitDays", "vars": {"n": 20}, "quote": NBS_ITA_DAYS_QUOTE, "url": NBS_GUIDES_BASE + "guide-new-brunswick-experience.pdf"}]}
"""收邀请、递申请(技术工人):递完整申请前交 250 加元申请费、不退。
2026-10-12 加:收到邀请后 20 天内递(技术工人三份指南同句,取 NB Experience 那份)。"""

NBS_STEP_APPLY_EE = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 250}, "quote": NBS_APP_FEE_QUOTE, "url": NBS_EE_URL},
                               {"key": "inviteSubmitDays", "vars": {"n": 20}, "quote": NBS_ITA_DAYS_QUOTE, "url": NBS_GUIDES_BASE + "guide-employment-in-nb.pdf"}]}
"""收邀请、递申请(快速通道两条):同上。2026-10-12 加 20 天(Employment in NB 指南;NB Interests 指南逐字同句)。"""

NBS_STEP_APPLY_SI = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 250}, "quote": NBS_APP_FEE_QUOTE, "url": NBS_SI_URL},
                               {"key": "inviteSubmitDays", "vars": {"n": 20}, "quote": NBS_ITA_DAYS_QUOTE, "url": NBS_GUIDES_BASE + "nbpnp-si-francophone-workers-in-nb.pdf"}]}
"""收邀请、递申请(法语战略三条):同上。2026-10-12 加 20 天(Francophone Workers 指南;另两份指南逐字同句)。"""

NBS_STEP_APPLY_PCCG = {"step": "apply", "who": "you", "none": False, "stuck": False,
                       "facts": [{"key": "appFee", "vars": {"n": 250},
                                  "quote": NBS_APP_FEE_QUOTE, "url": NBS_PCCG_URL},
                                 {"key": "inviteSubmitDays", "vars": {"n": 20}, "quote": NBS_ITA_DAYS_QUOTE, "url": NBS_GUIDES_BASE + "guide-nb-private-career-college-graduate-pilot.pdf"}]}
"""收邀请、递申请(私立学院试点):同上,原句出自试点页。2026-10-12 加 20 天(试点申请指南)。"""

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

NLS_STEP_WORK_LOCAL = {"step": "workLocal", "who": "you", "none": False, "stuck": False,
                       "facts": [{"ref": "req", "factor": "experience"}]}
"""在本省干够(国际毕业生通道):读门槛卡「工作经验」行 —— 本省院校毕业不要求经验,外省公立院校毕业的须先在本省工作满 1 年
(门槛表 experience:主行无下限 + grad-other-province 12 个月;前端 expRowOf 主行无值时改出「本省毕业不要求 / 外省毕业须满 N 个月」)。
2026-10-08 Frank「弄明白」批随萨省同挂。"""

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

PES_GUIDE_URL = "https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf"
"""劳工类申请指南(2026 年 1 月版,封面列全五条;原件在 crawl 文件缓存 files-www.princeedwardisland.ca)。"""

PES_ITA_DAYS = {"key": "inviteSubmitDays", "vars": {"n": 30},
                "quote": "You will have up to 30 days from the date of invitation to complete the online application form.",
                "url": PES_GUIDE_URL}
"""收到邀请后 30 天内填完网上申请(2026-10-12 审理与递申请时长补全;五条同一本指南)。"""

PES_STEP_APPLY_WF = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_WF_URL},
                               PES_ITA_DAYS]}
"""收邀请、递申请(劳工通道):受邀后递申请交 300 加元、不退;受邀后几天内递,各页没写,不写。"""

PES_STEP_APPLY_OID = {"step": "apply", "who": "you", "none": False, "stuck": False,
                      "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_OID_URL},
                                PES_ITA_DAYS]}
"""收邀请、递申请(在需职业):同上,出处换本流页。"""

PES_STEP_APPLY_IG = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_IG_URL},
                               PES_ITA_DAYS]}
"""收邀请、递申请(国际毕业生):同上,出处换本流页。"""

PES_STEP_APPLY_IE = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_IE_URL},
                               PES_ITA_DAYS]}
"""收邀请、递申请(中级经验):同上,出处换本流页。"""

PES_STEP_APPLY_EE = {"step": "apply", "who": "you", "none": False, "stuck": False,
                     "facts": [{"key": "appFee", "vars": {"n": 300}, "quote": PES_APP_FEE_QUOTE, "url": PES_EE_URL},
                               PES_ITA_DAYS]}
"""收邀请、递申请(PE 快速通道):同上,出处换本页。"""

PES_STEP_REVIEW = {"step": "review", "who": "province", "none": False, "stuck": False,
                   "facts": [{"key": "noPostedTime", "quote": "Please note, our office does not post or guarantee progressing times.",
                              "url": PES_GUIDE_URL}]}
"""省里审批:运营统计没有 PE 的时长行,各页也没写时长数,不写。
2026-10-12 审理与递申请时长补全:劳工类申请指南明写不公布、不保证处理时长(原文 progressing 照抄),登成「官方不公布」,
时间线这一步记 unpublished(不再算「本站未收录」)。"""

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
    "steps": [NBS_STEP_OFFER, NBS_STEP_WORK, NBS_STEP_EOI_SW, NBS_STEP_DRAW_SW, NBS_STEP_APPLY_SW, NBS_STEP_REVIEW,
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
    "steps": [SKS_STEP_OFFER, SKS_STEP_WORK_LOCAL, SKS_STEP_REGISTER, SKS_STEP_EPA_CAPPED, SKS_STEP_NO_EOI,
              SKS_STEP_CONFIRM, SKS_STEP_REVIEW_STUDENTS, SKS_STEP_PR],
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
    "reqStreams": ["Ontario Workforce Priority stream — self-employed physicians"],
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
"""安省唯一现行 stream 里给自雇医生的那条 pathway(CPSO 会员、有 OHIP 计费号),不要 offer。与 OWP 同一组抽选、同样还没抽过。
2026-10-04 Frank「你直接补 不行么」(资讯「通道」页本站未收录门槛):挂门槛流一条(pnp on-req 的自雇医生流:CPSO 执业证书、OHIP 计费号)。
官方原句满足这两项就不用满足页上其他申请人门槛、雇主门槛也不适用,所以不挂 OWP 主流。"""

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
    "steps": [NSS_STEP_OFFER, NSS_STEP_WORK, NSS_STEP_EE_PROFILE, NSS_STEP_EOI_EE, NSS_STEP_DRAW, NSS_STEP_REVIEW_EE,
              NSS_STEP_PR_EE],
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
    "steps": [NSS_STEP_OFFER, NSS_STEP_EE_PROFILE, NSS_STEP_LETTER, NSS_STEP_EOI_LETTER, NSS_STEP_DRAW, NSS_STEP_REVIEW_EE,
              NSS_STEP_PR_EE],
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
    "reqStreams": ["New Brunswick Express Entry stream (Employment in New Brunswick / New Brunswick Interest)"],
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
"""NB Express Entry stream 下的兴趣信路径:不要本省 offer,要省方发到 EE 档案的兴趣信。页面在列,2025–2026 抽选页没出现过。
2026-10-04 Frank「你直接补 不行么」:挂快速通道两条路径共同的门槛流(EE 池、CLB 7、近 10 年 1 年经验、打分表 67 分;09-30 就在表里,
当时没挂)。本路径自己的两条(兴趣信、联邦资金证明)门槛卡没有这类行,兴趣信由标签说。"""

PW_NB_FRANCOPHONE_PRIORITIES = {
    "key": "nb-francophone-priorities", "province": "NB", "program": "PNP",
    "plainZh": "NB 法语优先", "plainEn": "NB Francophone Priorities", "plainKo": "NB 프랑스어 우선",
    "officialName": "New Brunswick Francophone Priorities",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": ["NB Strategic Initiative"],
    "reqStreams": [("New Brunswick Strategic Initiative (Francophone Workers / Francophone Priorities / "
                    "Francophones Working Remotely)")],
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
"""Strategic Initiative 下的法语优先路径:不要 offer;本省法语院校毕业或收到省兴趣信(二选一,标签写兴趣信那一支)。在抽选。
2026-10-04 Frank「你直接补 不行么」:挂战略倡议三条路径共同的门槛流(近 5 年 1 年经验、本省院校毕业免经验、打分表 65 分)。本路径自己的
是二选一(法语院校毕业 / 兴趣信),拆不成单行门槛,不入表。"""

PW_NB_FRANCOPHONES_REMOTE = {
    "key": "nb-francophones-remote", "province": "NB", "program": "PNP",
    "plainZh": "NB 远程法语工作者", "plainEn": "NB Francophones working remotely", "plainKo": "NB 원격 근무 프랑스어 사용자",
    "officialName": "Francophones Working Remotely in New Brunswick",
    "boardLabel": None,
    "isDefault": False,
    "drawStreams": [],
    "reqStreams": ["New Brunswick Strategic Initiative — Francophones Working Remotely in New Brunswick pathway",
                   ("New Brunswick Strategic Initiative (Francophone Workers / Francophone Priorities / "
                    "Francophones Working Remotely)")],
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
"""Strategic Initiative 下的远程法语路径:在 NB 住满 12 个月、给魁省外的加拿大雇主远程工作,不要本省 offer。页面在列,2025–2026 抽选页没出现过。
2026-10-04 Frank「你直接补 不行么」:挂门槛流两条(pnp nb-req)—— 本路径自己的(在本省住满 12 个月)在前,三条路径共同的在后;
远程工作那一条门槛卡没有这类行,由标签说。"""

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
applications from interested candidates.」,资格条文写在「New Brunswick Critical Worker Pilot Guide」PDF 里,指南不在 crawl 缓存,不猜。
2026-10-04 Frank「你直接补 不行么」(资讯「通道」页本站未收录门槛)时复查:英文指南 /content/dam/gnb/Corporate/Promo/Immigration/
guide-to-nb-critical-worker-pilot.pdf 与法文页的 guide-du-projet-pilote-sur-les-travailleurs-critiques-nb.pdf 两个链接都 404,
官方现在查不到资格条文 → 门槛卡照旧「本站未收录门槛」(不写「官方不公布」);官网换上新链接再补。"""

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
    "steps": [NLS_STEP_OFFER, NLS_STEP_WORK_LOCAL, NLS_STEP_EOI, NLS_STEP_DRAW, NLS_STEP_APPLY, NLS_STEP_REVIEW,
              NLS_STEP_PR],
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


# =========================================================================
# 2b. 补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」):九省创业 / 商业类、育空 / 西北地区、魁北克、
#     联邦经济类、家庭团聚与难民。六组子代理并行调研,原句逐字核 crawl 缓存;一次性事实用 note(三语文本随数据走,同步骤事实自校)。
# =========================================================================

PW_AB_RURAL_ENTREPRENEUR = {
    "key": "ab-rural-entrepreneur", "province": "AB", "program": "PNP",
    "plainZh": "AB 乡村创业", "plainEn": "AB Rural Entrepreneur", "plainKo": "AB 농촌 창업",
    "officialName": "Rural Entrepreneur Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream",
    "quote": "Entrepreneurs who want to start a business or buy an existing business in a rural Alberta community can submit an Expression of Interest.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "community",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先到社区做考察访问",
                        "en": "Make an exploratory visit to the community first",
                        "ko": "먼저 지역사회를 사전 방문"
                    },
                    "quote": "Candidates must complete an exploratory visit.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-eligibility"
                },
                {
                    "key": "communityLetter",
                    "quote": "After receiving a copy of the Community Support Letter and endorsed Business Proposal Summary from the community, you can submit an Expression of Interest (EOI) to the AAIP.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-eligibility"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "eoiFee",
                    "vars": {
                        "n": 200
                    },
                    "quote": "A fee of $200 applies to all EOIs.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "EOIs are placed in the pool of qualified candidates for a period of 12 months from the date of their original submission.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "按积分从高到低邀请递商业申请",
                        "en": "Highest-ranking candidates are invited to submit a Business Application",
                        "ko": "점수 높은 순으로 사업 신청 초청"
                    },
                    "quote": "Candidates with the highest-ranking points will be contacted directly by AAIP and invited to submit a Business Application.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后 {n} 天内递商业申请",
                        "en": "Submit the Business Application within {n} days of the invitation",
                        "ko": "초청 후 {n}일 이내 사업 신청서 제출"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "A complete Business Application must be submitted within 90 days of receiving the email from AAIP requesting you to submit a Business Application.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 3500
                    },
                    "quote": "A $3,500 non-refundable fee applies to all Business Applications.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "Timelines for Entrepreneur stream applications vary as each file moves through several stages of review and require comprehensive documentation and verification.", "url": "https://www.alberta.ca/aaip-processing-information"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后 {n} 天内签商业履约协议",
                        "en": "Sign the Business Performance Agreement within {n} days of approval",
                        "ko": "승인 후 {n}일 이내 사업 이행 협약 서명"
                    },
                    "vars": {
                        "n": 14
                    },
                    "quote": "You must sign, scan, and email your Business Performance Agreement to AAIP within 14 days.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到支持信后 {n} 个月内递工签",
                        "en": "Apply for the work permit within {n} months of the support letter",
                        "ko": "지원서한 수령 후 {n}개월 이내 워크퍼밋 신청"
                    },
                    "vars": {
                        "n": 3
                    },
                    "quote": "You are required to submit your application for a work permit to IRCC along with your 205(a) Letter of Support within 3 months of receiving this letter, to facilitate your arrival in Alberta within 12 months of receiving your Business Application Approval Letter.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 12, "max": None, "quote": "actively own and operate an eligible business in a rural Alberta community for at least 12 months", "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "actively own and operate an eligible business in a rural Alberta community for at least 12 months with at least 51% ownership if establishing a new business or 100% ownership for business succession",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "工签签发后 {n} 天内交到达报告",
                        "en": "File an Arrival Report within {n} days of the work permit issue date",
                        "ko": "워크퍼밋 발급 후 {n}일 이내 도착 보고서 제출"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "Submit an Arrival Report to AAIP within 30 days of the date that appears as the “date issued” on your work permit issued by the Government of Canada.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "finalReport",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "Timelines for Entrepreneur stream applications vary as each file moves through several stages of review and require comprehensive documentation and verification.", "url": "https://www.alberta.ca/aaip-processing-information"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "履约后递终期报告申请提名",
                        "en": "After meeting the agreement, file the Final Report for Nomination",
                        "ko": "협약 이행 후 최종 보고서로 주정부 지명 신청"
                    },
                    "quote": "Once candidates satisfy all the conditions of the Business Performance Agreement, they can apply to be nominated by AAIP for permanent residency.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "Your nomination is only valid for 6 months; you must apply to IRCC before it expires.",
                    "url": "https://www.alberta.ca/aaip-rural-entrepreneur-stream-after-you-are-nominated"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:已在阿省经营的「established businesses in Alberta criteria」申请人免签履约协议、直接发提名(how-to-apply 页 Step 5),步骤按新开 / 收购的主路径登。EOI 费 200 加元是创业类专属(工人类 WEOI 135 加元),别混用 ABS_STEP_EOI。"""

PW_AB_GRADUATE_ENTREPRENEUR = {
    "key": "ab-graduate-entrepreneur", "province": "AB", "program": "PNP",
    "plainZh": "AB 毕业生创业", "plainEn": "AB Graduate Entrepreneur", "plainKo": "AB 졸업생 창업",
    "officialName": "Graduate Entrepreneur Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream",
    "quote": "The Graduate Entrepreneur Stream allows the AAIP to nominate qualified international graduates from Alberta post-secondary institutions who want to establish or operate a business in Alberta to apply for permanent residence.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "eoiFee",
                    "vars": {
                        "n": 200
                    },
                    "quote": "A fee of $200 applies to all EOIs.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "EOIs are placed in the pool of qualified candidates for a period of 12 months from the date of their original submission.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "按积分从高到低邀请递商业申请",
                        "en": "Highest-ranking candidates are invited to submit a Business Application",
                        "ko": "점수 높은 순으로 사업 신청 초청"
                    },
                    "quote": "Candidates with the highest-ranking points will be contacted directly by the AAIP and invited to submit a Business Application.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后 {n} 天内递商业申请",
                        "en": "Submit the Business Application within {n} days of the invitation",
                        "ko": "초청 후 {n}일 이내 사업 신청서 제출"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "A complete Business Application must be submitted within 90 days of receiving the email from the AAIP requesting you to submit a Business Application.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 3500
                    },
                    "quote": "A $3,500 non-refundable fee applies to all online Business Applications.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "Timelines for Entrepreneur stream applications vary as each file moves through several stages of review and require comprehensive documentation and verification.", "url": "https://www.alberta.ca/aaip-processing-information"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后 {n} 天内签商业履约协议",
                        "en": "Sign the Business Performance Agreement within {n} days of approval",
                        "ko": "승인 후 {n}일 이내 사업 이행 협약 서명"
                    },
                    "vars": {
                        "n": 14
                    },
                    "quote": "You must sign, scan and email your Business Performance Agreement to the AAIP within 14 days.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 12, "max": None, "quote": "actively own and operate an eligible business in Alberta with at least 34% ownership for at least 12 months", "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "actively own and operate an eligible business in Alberta with at least 34% ownership for at least 12 months",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "获批信签发后 {n} 天内交开业报告",
                        "en": "File a Start-up Report within {n} days of the approval letter",
                        "ko": "승인서 발급 후 {n}일 이내 창업 보고서 제출"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "Submit a Start-up Report to the AAIP within 30 days of the issued date stated on the Business Application Approval Letter.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "finalReport",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "Timelines for Entrepreneur stream applications vary as each file moves through several stages of review and require comprehensive documentation and verification.", "url": "https://www.alberta.ca/aaip-processing-information"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "履约后递终期报告申请提名",
                        "en": "After meeting the agreement, file the Final Report for Nomination",
                        "ko": "협약 이행 후 최종 보고서로 주정부 지명 신청"
                    },
                    "quote": "Once candidates satisfy the conditions of the Business Performance Agreement, they can apply to be nominated by the AAIP for permanent residency.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "Your nomination is only valid for 6 months; you must apply to IRCC before it expires.",
                    "url": "https://www.alberta.ca/aaip-graduate-entrepreneur-stream-after-you-are-nominated"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:门槛:阿省公立院校全日制满两年毕业 + 递 EOI 时持有效毕业工签(PGWP)+ CLB 7(eligibility 页 Table 1);凭毕业工签在阿省经营,所以没有「办工签」一步(与乡村创业 / 境外毕业生创业不同)。"""

PW_AB_FOREIGN_GRADUATE_ENTREPRENEUR = {
    "key": "ab-foreign-graduate-entrepreneur", "province": "AB", "program": "PNP",
    "plainZh": "AB 境外毕业生创业", "plainEn": "AB Foreign Graduate Entrepreneur", "plainKo": "AB 해외 졸업생 창업",
    "officialName": "Foreign Graduate Entrepreneur Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream",
    "quote": "The Foreign Graduate Entrepreneur Stream is an economic immigration program for qualified foreign educated graduates from outside of Canada who want to launch start-up enterprises and innovative businesses in Alberta.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "referral",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "递 EOI 时就要有指定机构的推荐信",
                        "en": "A designated agency’s recommendation letter is needed at EOI",
                        "ko": "EOI 제출 시 지정기관 추천서 필요"
                    },
                    "quote": "The foreign graduate must submit the letter of recommendation with their Expression of Interest (EOI) through the AAIP Portal.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-eligibility"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "eoiFee",
                    "vars": {
                        "n": 200
                    },
                    "quote": "A fee of $200 applies to all EOIs.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "EOIs are placed in the pool of qualified candidates for a period of 12 months from the date of their original submission.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "按积分从高到低邀请递商业申请",
                        "en": "Highest-ranking candidates are invited to submit a Business Application",
                        "ko": "점수 높은 순으로 사업 신청 초청"
                    },
                    "quote": "Highest-ranking candidates will be invited to submit a Business Application.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后 {n} 天内递商业申请",
                        "en": "Submit the Business Application within {n} days of the invitation",
                        "ko": "초청 후 {n}일 이내 사업 신청서 제출"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "A complete Business Application must be submitted within 90 days of receiving the email from the AAIP requesting you to submit a Business Application.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 3500
                    },
                    "quote": "A $3,500 non-refundable fee applies to all online Business Applications.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "Timelines for Entrepreneur stream applications vary as each file moves through several stages of review and require comprehensive documentation and verification.", "url": "https://www.alberta.ca/aaip-processing-information"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后 {n} 天内签商业履约协议",
                        "en": "Sign the Business Performance Agreement within {n} days of approval",
                        "ko": "승인 후 {n}일 이내 사업 이행 협약 서명"
                    },
                    "vars": {
                        "n": 14
                    },
                    "quote": "You must sign, scan, and email your Business Performance Agreement to the AAIP within 14 days.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到支持信后 {n} 个月内递工签",
                        "en": "Apply for the work permit within {n} months of the support letter",
                        "ko": "지원서한 수령 후 {n}개월 이내 워크퍼밋 신청"
                    },
                    "vars": {
                        "n": 3
                    },
                    "quote": "You are required to submit your application for a work permit to IRCC along with your 205(a) Letter of Support within 3 months of receiving this letter.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 12, "max": None, "quote": "actively own and operate an eligible business in Alberta with at least 34% ownership in an urban centre or 51% ownership in a regional area for at least 12 months", "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "actively own and operate an eligible business in Alberta with at least 34% ownership in an urban centre or 51% ownership in a regional area for at least 12 months",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "工签签发后 {n} 天内交到达报告",
                        "en": "File an Arrival Report within {n} days of the work permit issue date",
                        "ko": "워크퍼밋 발급 후 {n}일 이내 도착 보고서 제출"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "to the AAIP within 30 days of the date that appears as the “date issued” on your work permit issued by the Government of Canada.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "finalReport",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "Timelines for Entrepreneur stream applications vary as each file moves through several stages of review and require comprehensive documentation and verification.", "url": "https://www.alberta.ca/aaip-processing-information"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "履约后递终期报告申请提名",
                        "en": "After meeting the agreement, file the Final Report for Nomination",
                        "ko": "협약 이행 후 최종 보고서로 주정부 지명 신청"
                    },
                    "quote": "Once candidates satisfy the conditions of the Business Performance Agreement, they can apply to be nominated by the AAIP for permanent residency.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "Your nomination is only valid for 6 months; you must apply to IRCC before it expires.",
                    "url": "https://www.alberta.ca/aaip-foreign-graduate-entrepreneur-stream-after-you-are-nominated"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:到达报告原句页面上被链接切开(「Submit an」+ 链接「Arrival Report」+ 本句),quote 取链接后半句;若核对器按整句要求,可改用 RES 同形整句。指定机构名单在 eligibility 页(Elite Global Group Ltd. 等)。"""

PW_AB_FARM = {
    "key": "ab-farm", "province": "AB", "program": "PNP",
    "plainZh": "AB 农场主", "plainEn": "AB Farm", "plainKo": "AB 농장주",
    "officialName": "Farm Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-farm-stream",
    "quote": "This stream is for entrepreneurs who have the financial resources and farm management experience to establish a new or purchase an existing farm in Alberta.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "eoiOnlyOther",
                    "quote": "Candidates must submit their application, along with a proposed business plan, to the Alberta Advantage Immigration Program (AAIP) for assessment.",
                    "url": "https://www.alberta.ca/aaip-farm-stream"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 3500
                    },
                    "quote": "All Farm Stream applications paid for on or after April 1, 2024, are subject to a fee of $3,500.",
                    "url": "https://www.alberta.ca/aaip-farm-stream-how-to-apply"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "纸质申请挂号或快递寄送,不收邮件和传真",
                        "en": "Mail a paper application; email and fax are not accepted",
                        "ko": "서류 신청서를 우편 발송, 이메일·팩스 불가"
                    },
                    "quote": "Applications by email or fax are not accepted.",
                    "url": "https://www.alberta.ca/aaip-farm-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "Timelines for Entrepreneur stream applications vary as each file moves through several stages of review and require comprehensive documentation and verification.", "url": "https://www.alberta.ca/aaip-processing-information"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "商业计划转省农业厅审",
                        "en": "The business plan is reviewed by Alberta Agriculture and Irrigation",
                        "ko": "사업계획서는 주 농업부가 심사"
                    },
                    "quote": "The AAIP will forward your business plan to Alberta Agriculture and Irrigation for review.",
                    "url": "https://www.alberta.ca/aaip-farm-stream-how-to-apply"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "Your nomination is only valid for 6 months; you must apply to IRCC before it expires.",
                    "url": "https://www.alberta.ca/aaip-farm-stream-after-you-are-nominated"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:不走 EOI、直接寄纸质申请(唯一不在网上系统的 AAIP 通道)。官网没写「currently accepting」类原句,status 按 aaip-application-streams 页现行列表判 open。处理时长:aaip-processing-information 页只有「Entrepreneur Streams」合并行,没写农场;durations 留空。eoiOnlyOther 词条中文是「不需要:这一类不递 EOI」,挂的是「直接递申请附商业计划」原句,lead 可酌情换 new。"""

PW_BC_ENTREPRENEUR_BASE = {
    "key": "bc-entrepreneur-base", "province": "BC", "program": "PNP",
    "plainZh": "BC 企业家移民(基础类)", "plainEn": "BC Entrepreneur Base", "plainKo": "BC 기업가 이민(기본)",
    "officialName": "Entrepreneur Immigration – Base stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration",
    "quote": "Base stream is an immigration pathway for individuals who are looking to start a new business, or take over and grow an existing one.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "businessPlan",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先写商业计划书",
                        "en": "Start with a full business proposal",
                        "ko": "먼저 사업계획서 작성"
                    },
                    "quote": "The first step is to develop a comprehensive business proposal that showcases your unique knowledge and experience as an entrepreneur.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "register",
            "dur": {"kind": "about", "unit": "month", "min": 1, "max": 1, "quote": "Registration score notification 6 weeks", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "eoiFee",
                    "vars": {
                        "n": 300
                    },
                    "quote": "Registration $300 CAD",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "If your registration meets the BC PNP's eligibility and requirements criteria, it will be placed in a qualified pool where it will remain active for up to six months, or until you receive an invitation to apply.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "受邀后先由指定会计师事务所核查资产",
                        "en": "After the invitation, an authorized accounting firm verifies your net worth",
                        "ko": "초청 후 지정 회계법인이 순자산 검증"
                    },
                    "quote": "If you are invited to apply, a BC PNP-authorized accounting firm will review your personal net worth and verify your accumulation of funds.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后 {n} 个月内递申请",
                        "en": "Submit the application within {n} months of the invitation",
                        "ko": "초청 후 {n}개월 이내 신청서 제출"
                    },
                    "vars": {
                        "n": 4
                    },
                    "quote": "After you receive an invitation to apply, you will have up to four months from the date of invitation to submit a complete application using the BC PNP's User Portal.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 3500
                    },
                    "quote": "Application $3,500* CAD",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "about", "unit": "month", "min": 4, "max": 4, "quote": "Application decision notification (work permit stage) 4 months", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后与省政府签履约协议",
                        "en": "Once approved, sign a Performance Agreement with the province",
                        "ko": "승인 후 주정부와 이행 협약 서명"
                    },
                    "quote": "If your application is approved, you will sign a Performance Agreement with the Province of British Columbia.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到支持信后 {n} 天内递工签",
                        "en": "Apply for the work permit within {n} days of the support letter",
                        "ko": "지원서한 수령 후 {n}일 이내 워크퍼밋 신청"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "after receiving a Letter of Support, you have up to 90 days to submit your work permit application to IRCC, and must arrive in B.C. within 12 months of receiving your work permit.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 20, "quote": "Once you arrive in B.C., you will have up to 20 months to implement your plan, actively manage your business, and meet the performance expectations outlined in your signed Performance Agreement.", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "落地后最多 {n} 个月落实商业计划",
                        "en": "Up to {n} months after arrival to carry out the business plan",
                        "ko": "도착 후 최대 {n}개월 내 사업계획 이행"
                    },
                    "vars": {
                        "n": 20
                    },
                    "quote": "Once you arrive in B.C., you will have up to 20 months to implement your plan, actively manage your business, and meet the performance expectations outlined in your signed Performance Agreement.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "finalReport",
            "dur": {"kind": "about", "unit": "month", "min": 4, "max": 4, "quote": "Application decision notification (final report stage) 4 months", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "落地后第 {a}–{b} 个月递终期报告",
                        "en": "File the final report {a}–{b} months after arrival",
                        "ko": "도착 후 {a}~{b}개월 사이 최종 보고서 제출"
                    },
                    "vars": {
                        "a": 18,
                        "b": 20
                    },
                    "quote": "To do so, you will be asked to submit a final report to the BC PNP between 18 to 20 months after your arrival.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签提名条件声明后发提名",
                        "en": "The nomination is issued after signing the Conditions of Nomination Declaration",
                        "ko": "지명 조건 선언서 서명 후 지명 발급"
                    },
                    "quote": "After you sign the Declaration, you will be issued a Confirmation of Nomination as a provincial nominee.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:现行:invitations-to-apply 页 2026-01-13 至 2026-09-22 每月都有 Base 邀请(本次缓存 2026-10-09)。官方没有「暂停」原句,status 判 open,statusQuote 留空。费用 / 时长两处取自页面表格行(「Registration $300 CAD」「Application $3,500* CAD」等),逐字但不是整句;核对器若只认句子,改挂 Entrepreneur Immigration Program Guide PDF(未抓)。官方原名页内写法是「Base stream」,officialName 加了「Entrepreneur Immigration –」前缀以免与工人类混淆,lead 可改回。"""

PW_BC_ENTREPRENEUR_REGIONAL = {
    "key": "bc-entrepreneur-regional", "province": "BC", "program": "PNP",
    "plainZh": "BC 企业家移民(地区类)", "plainEn": "BC Entrepreneur Regional", "plainKo": "BC 기업가 이민(지역)",
    "officialName": "Entrepreneur Immigration – Regional stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration",
    "quote": "Regional stream is an immigration pathway for individuals who are looking to start a new business outside the Metro Vancouver Regional District, wishing to make a participating B.C. community their home.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "community",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先联系社区并做考察访问",
                        "en": "Contact the community and make an exploratory visit",
                        "ko": "지역사회 연락 후 사전 방문"
                    },
                    "quote": "To obtain one, you must contact your chosen community to express interest and conduct an exploratory visit.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "社区推荐自签发起 {n} 天内有效",
                        "en": "The community referral is valid for {n} days",
                        "ko": "지역사회 추천서는 발급일부터 {n}일간 유효"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "a community referral is only valid for 90 days from the date of issue.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "register",
            "dur": {"kind": "about", "unit": "month", "min": 1, "max": 1, "quote": "Registration score notification 6 weeks", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "eoiFee",
                    "vars": {
                        "n": 300
                    },
                    "quote": "Registration $300 CAD",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "If your registration meets the BC PNP's eligibility and requirements criteria, it will be placed in a qualified pool where it will remain active for up to six months, or until you receive an invitation to apply.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "受邀后先由指定会计师事务所核查资产",
                        "en": "After the invitation, an authorized accounting firm verifies your net worth",
                        "ko": "초청 후 지정 회계법인이 순자산 검증"
                    },
                    "quote": "If you are invited to apply, a BC PNP-authorized accounting firm will review your personal net worth and verify your accumulation of funds.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后 {n} 个月内递申请",
                        "en": "Submit the application within {n} months of the invitation",
                        "ko": "초청 후 {n}개월 이내 신청서 제출"
                    },
                    "vars": {
                        "n": 4
                    },
                    "quote": "After you receive an invitation to apply, you will have up to four months from the date of invitation to submit a complete application using the BC PNP's User Portal.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 3500
                    },
                    "quote": "Application $3,500* CAD",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "about", "unit": "month", "min": 4, "max": 4, "quote": "Application decision notification (work permit stage) 4 months", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后与省政府签履约协议",
                        "en": "Once approved, sign a Performance Agreement with the province",
                        "ko": "승인 후 주정부와 이행 협약 서명"
                    },
                    "quote": "If your application is approved, you will sign a Performance Agreement with the Province of British Columbia.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到支持信后 {n} 天内递工签",
                        "en": "Apply for the work permit within {n} days of the support letter",
                        "ko": "지원서한 수령 후 {n}일 이내 워크퍼밋 신청"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "after receiving a Letter of Support, you have up to 90 days to submit your work permit application to IRCC, and must arrive in B.C. within 12 months of receiving your work permit.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 20, "quote": "Once you arrive in B.C., you will have up to 20 months to implement your plan, actively manage your business, and meet the performance expectations outlined in your signed Performance Agreement.", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "落地后最多 {n} 个月落实商业计划",
                        "en": "Up to {n} months after arrival to carry out the business plan",
                        "ko": "도착 후 최대 {n}개월 내 사업계획 이행"
                    },
                    "vars": {
                        "n": 20
                    },
                    "quote": "Once you arrive in B.C., you will have up to 20 months to implement your plan, actively manage your business, and meet the performance expectations outlined in your signed Performance Agreement.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "finalReport",
            "dur": {"kind": "about", "unit": "month", "min": 4, "max": 4, "quote": "Application decision notification (final report stage) 4 months", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "落地后第 {a}–{b} 个月递终期报告",
                        "en": "File the final report {a}–{b} months after arrival",
                        "ko": "도착 후 {a}~{b}개월 사이 최종 보고서 제출"
                    },
                    "vars": {
                        "a": 18,
                        "b": 20
                    },
                    "quote": "To do so, you will be asked to submit a final report to the BC PNP between 18 to 20 months after your arrival.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签提名条件声明后发提名",
                        "en": "The nomination is issued after signing the Conditions of Nomination Declaration",
                        "ko": "지명 조건 선언서 서명 후 지명 발급"
                    },
                    "quote": "After you sign the Declaration, you will be issued a Confirmation of Nomination as a provincial nominee.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:派工写的「Regional pilot」官网现名是「Regional stream」(不再叫试点),现行有邀请。地区类先拿社区推荐再写计划书,所以第一步是 community;写计划书合进同一路径未单列。其余同 Base 备注。"""

PW_BC_STRATEGIC_PROJECTS = {
    "key": "bc-strategic-projects", "province": "BC", "program": "PNP",
    "plainZh": "BC 战略项目", "plainEn": "BC Strategic Projects", "plainKo": "BC 전략 프로젝트",
    "officialName": "Strategic Projects stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration",
    "quote": "The Strategic Projects stream offers a pathway to permanent residency for current employees of foreign corporations wishing to operate in British Columbia.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "visit",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "公司高管先约省里开说明会",
                        "en": "A senior company representative attends an information meeting first",
                        "ko": "회사 고위 임원이 먼저 설명회 참석"
                    },
                    "quote": "The first step is for a senior representative of your corporation to contact the BC PNP to attend an information meeting, where you can learn about the Strategic Projects stream.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "register",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "说明会后受邀才能登记项目",
                        "en": "The company registers its proposal only if invited after the meeting",
                        "ko": "설명회 후 초청받아야 프로젝트 등록 가능"
                    },
                    "quote": "Based on the outcome of your meeting, the BC PNP may invite the business to register your proposal as a way to express interest in the program.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "apply",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后 {n} 天内递申请",
                        "en": "Submit the application within {n} days of the invitation",
                        "ko": "초청 후 {n}일 이내 신청서 제출"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "your business must submit an application within 90 days from the date of invitation.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到支持信后 {n} 天内递工签",
                        "en": "Apply for the work permit within {n} days of the support letter",
                        "ko": "지원서한 수령 후 {n}일 이내 워크퍼밋 신청"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "after receiving a Letter of Support, you have up to 90 days to submit your work permit application to IRCC, and must arrive in B.C. within 6 months of receiving the Letter.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "落地后 {n} 个月内交到达报告",
                        "en": "File the Arrival Report within {n} months of arrival",
                        "ko": "도착 후 {n}개월 이내 도착 보고서 제출"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "Once you arrive in B.C., you will have up to 2 months to submit a completed Arrival Report Form to the BC PNP.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "finalReport",
            "dur": {"kind": "range", "unit": "month", "min": 12, "max": 24, "quote": "you will be asked to submit a final report to the BC PNP between 12 to 24 months after your arrival.", "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "落地后第 {a}–{b} 个月递终期报告",
                        "en": "File the final report {a}–{b} months after arrival",
                        "ko": "도착 후 {a}~{b}개월 사이 최종 보고서 제출"
                    },
                    "vars": {
                        "a": 12,
                        "b": 24
                    },
                    "quote": "To do so, you will be asked to submit a final report to the BC PNP between 12 to 24 months after your arrival.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签提名条件声明后发提名",
                        "en": "The nomination is issued after signing the Conditions of Nomination Declaration",
                        "ko": "지명 조건 선언서 서명 후 지명 발급"
                    },
                    "quote": "After you sign the Declaration, you will be issued a Confirmation of Nomination as a provincial nominee.",
                    "url": "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:派工清单外的第三条:外国公司派关键员工来卑诗开分支(公司投资 ≥50 万加元、每名关键员工配 3 个新岗位),申请人是公司的长期全职员工,needsOffer 判 true(本质是「现雇主外派」);是否登进本站请 lead 定。durations 那条无原句,只是说明,入库前删。"""

PW_SK_ENTREPRENEUR = {
    "key": "sk-entrepreneur", "province": "SK", "program": "PNP",
    "plainZh": "SK 企业家", "plainEn": "SK Entrepreneur", "plainKo": "SK 기업가",
    "officialName": "Entrepreneur Category",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "closed",
    "url": "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/entrepreneur/applicants-entrepreneurs",
    "quote": "Through the SINP Entrepreneur Program, you can live in Saskatchewan when you start, own or partner in a business here.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 closed 原句:Effective March 27, 2025, the Saskatchewan Immigrant Nominee Program has permanently closed all Entrepreneur and Farm immigration pathways.(https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/entrepreneur/applicants-entrepreneurs)
判读:2025-03-27 起永久关闭(同页紧接:No new applications will be accepted / No new expressions of interest will be considered / No further invitations to apply will be issued;在审的照审完)。关闭通道不登步骤;若要展示,只挂 closed 胶囊 + 原句。"""

PW_SK_INTERNATIONAL_GRADUATE_ENTREPRENEUR = {
    "key": "sk-international-graduate-entrepreneur", "province": "SK", "program": "PNP",
    "plainZh": "SK 国际毕业生创业", "plainEn": "SK International Graduate Entrepreneur", "plainKo": "SK 유학생 졸업자 창업",
    "officialName": "International Graduate Entrepreneur Category",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "closed",
    "url": "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/entrepreneur/international-graduate-entrepreneur-category",
    "quote": "You must be an international student graduating from a Saskatchewan institution who wants to become an entrepreneur.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 closed 原句:Effective March 27, 2025, the Saskatchewan Immigrant Nominee Program has permanently closed all Entrepreneur and Farm immigration pathways.(https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/entrepreneur/international-graduate-entrepreneur-category)
判读:2025-03-27 起永久关闭(同页紧接:No new applications will be accepted / No new expressions of interest will be considered / No further invitations to apply will be issued;在审的照审完)。关闭通道不登步骤;若要展示,只挂 closed 胶囊 + 原句。"""

PW_SK_FARM_OWNER_OPERATOR = {
    "key": "sk-farm-owner-operator", "province": "SK", "program": "PNP",
    "plainZh": "SK 农场主", "plainEn": "SK Farm Owner and Operator", "plainKo": "SK 농장주",
    "officialName": "Farm Owner and Operator",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "closed",
    "url": "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/farm-owner-and-operator/applicants-farm-owners-and-operators",
    "quote": "Plan to buy and run a farm in Saskatchewan.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 closed 原句:Effective March 27, 2025, the Saskatchewan Immigrant Nominee Program has permanently closed all Entrepreneur and Farm immigration pathways.(https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/farm-owner-and-operator/applicants-farm-owners-and-operators)
判读:2025-03-27 起永久关闭(同页紧接:No new applications will be accepted / No new expressions of interest will be considered / No further invitations to apply will be issued;在审的照审完)。关闭通道不登步骤;若要展示,只挂 closed 胶囊 + 原句。"""

PW_MB_ENTREPRENEUR = {
    "key": "mb-entrepreneur", "province": "MB", "program": "PNP",
    "plainZh": "MB 创业", "plainEn": "MB Entrepreneur", "plainKo": "MB 창업",
    "officialName": "Entrepreneur Pathway (EP)",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "paused",
    "url": "https://immigratemanitoba.com/mpnp/bis/ep",
    "quote": "The Entrepreneur Pathway (EP) allows Manitoba to recruit and nominate qualified business people from around the world who have the intent and ability to move to Manitoba and establish, purchase a business or become partners in an existing business after arrival in Canada on a temporary work permit.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "用邮件递 EOI,附商业构想表和自评表",
                        "en": "Email the EOI with the Business Concept and Self-Assessment forms",
                        "ko": "사업 구상서·자가평가서를 첨부해 이메일로 EOI 제출"
                    },
                    "quote": "Once you have completed Step 1, you can submit your Expression of Interest (EOI) by email to",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"
                }
            ]
        },
        {
            "step": "draw",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "EOI draws for the Business Investor Stream are not currently being conducted.", "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"},
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "noScheduledDraw",
                    "quote": "EOI draws for the Business Investor Stream are not currently being conducted.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 120
                    },
                    "quote": "A verification report, along with the application, must be submitted to the MPNP within 120 days of receiving your LAA.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/eligibility"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 2500
                    },
                    "quote": "You will be required to pay a processing fee by wire transfer in the amount of $2,500.00 CAD when submitting an application to the MPNP.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 6, "quote": "The MPNP’s targeted processing time is six (6) months or less after receipt of a complete application.", "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-Entrepreneur-Stream-Guidelines-final-July-2024.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "批准后签商业履约协议,省里再发工签支持信",
                        "en": "Sign the Business Performance Agreement after approval to get the work permit support letter",
                        "ko": "승인 후 사업이행협약(BPA)에 서명하면 취업허가 지원서한 발급"
                    },
                    "quote": "After an application is approved, a Business Performance Agreement (BPA) must be signed prior to the MPNP issuing you a work permit support letter.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"
                }
            ]
        },
        {
            "step": "workPermit",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 12, "quote": "You have up to 12 months from the date of your work permit support letter issuance to arrive in Canada with your valid work permit.", "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-Entrepreneur-Stream-Guidelines-final-July-2024.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到支持信后 {n} 个月内持工签入境",
                        "en": "Arrive in Canada on a work permit within {n} months of the support letter",
                        "ko": "지원서한 발급 후 {n}개월 이내 취업허가로 입국"
                    },
                    "vars": {
                        "n": 12
                    },
                    "quote": "You have up to 12 months from the date of your work permit support letter issuance to arrive in Canada with your valid work permit.",
                    "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-Entrepreneur-Stream-Guidelines-final-July-2024.pdf"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 20, "quote": "no later than twenty (20) months after the Date of Arrival, submit a Final Report to the Program", "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-Entrepreneur-Stream-Guidelines-final-July-2024.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "到本省 {n} 天内到省里报到",
                        "en": "Report to the province within {n} days of arrival",
                        "ko": "도착 후 {n}일 이내 주정부에 신고"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "As per the terms of the Business Performance Agreement (BPA), all approved applicants must report to the MPNP within 30 days of their arrival in Manitoba with a temporary work permit.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "到本省后 {n} 个月内交最终进度报告",
                        "en": "Submit the final progress report within {n} months of arrival",
                        "ko": "도착 후 {n}개월 이내 최종 진행 보고서 제출"
                    },
                    "vars": {
                        "n": 20
                    },
                    "quote": "Final Progress Report: no later than 20 months after the Date of Arrival",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"
                },
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "Please be advised that you should have been operating your business for no less than six (6) months immediately prior to submitting the Final Progress Report to the MPNP.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidDays",
                    "vars": {
                        "n": 180
                    },
                    "quote": "You must submit your Application for Permanent Residence within 180 days from the Date of Nomination.",
                    "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-Entrepreneur-Stream-Guidelines-final-July-2024.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 paused 原句:EOI draws for the Business Investor Stream are not currently being conducted.(https://immigratemanitoba.com/mpnp/bis/ep/apply)
判读:状态判 paused:申请页原句「EOI draws for the Business Investor Stream are not currently being conducted.」,但同页仍写「aims to review all EOI’s received within four weeks」并接收邮件 EOI —— 是「收 EOI 不抽」还是整条停,lead 定口径。现行是纸质临时流程(paper-based interim process)。指南 PDF 封面写 Version 1.0 / Effective December 18, 2019(文件名 July-2024),期限句与网页一致处优先取网页。"""

PW_MB_FARM_INVESTOR = {
    "key": "mb-farm-investor", "province": "MB", "program": "PNP",
    "plainZh": "MB 农场投资", "plainEn": "MB Farm Investor", "plainKo": "MB 농장 투자",
    "officialName": "Farm Investor Pathway (FIP)",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "paused",
    "url": "https://immigratemanitoba.com/mpnp/bis/fip",
    "quote": "The Farm Investor Pathway (FIP) is for individuals with proven farm business experience, sufficient available capital to invest, and who intend to establish and operate a farm operation in rural Manitoba.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "visit",
            "dur": {"kind": "atleast", "unit": "day", "min": 5, "max": None, "quote": "You must visit Manitoba for a period of not less than five business days (excluding the days of arrival and departure), to conduct extensive farm business and rural lifestyle-related research.", "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-FIP-Guidelines-Kit-072024.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "必须先来本省做农场商业考察",
                        "en": "A farm business research visit to Manitoba is required",
                        "ko": "매니토바 농장 사업 현지 답사 필수"
                    },
                    "quote": "You must conduct a farm business research visit to Manitoba.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/fip/eligibility"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "用邮件递意向表和农场商业构想表",
                        "en": "Email the Interest Guidelines and Farm Business Concept forms",
                        "ko": "관심 지침서·농장 사업 구상서를 이메일로 제출"
                    },
                    "quote": "Once you have completed your farm business research and determined that you are eligible for the FIP, you can submit your forms by email to the MPNP.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/fip/apply"
                }
            ]
        },
        {
            "step": "draw",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "EOI draws for the Business Investor Stream are not currently being conducted.", "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"},
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "noScheduledDraw",
                    "quote": "EOI draws for the Business Investor Stream are not currently being conducted.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/ep/apply"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 120
                    },
                    "quote": "All documents listed in the Instructions and Document Checklist and your net worth verification report must be submitted, and your application fee must be paid within 120 days of receiving your LAA for your application to be considered complete.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/fip/apply"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 2500
                    },
                    "quote": "All FIP nomination applications to the MPNP must include a CAD$2,500 application processing fee.",
                    "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-FIP-Guidelines-Kit-072024.pdf"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "审理可能要面试",
                        "en": "The assessment may include an interview",
                        "ko": "심사 중 면접이 있을 수 있음"
                    },
                    "quote": "Your complete application will be assessed by the MPNP. This may include an interview.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/fip/apply"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后签保证金协议、交 {n} 加元保证金",
                        "en": "After approval, sign a Deposit Agreement and pay a CAD {n} deposit",
                        "ko": "승인 후 예치금 협약 서명 및 {n}캐나다달러 예치"
                    },
                    "vars": {
                        "n": 75000
                    },
                    "quote": "If you are approved for nomination, you will be instructed to sign a Deposit Agreement and send a deposit of CAD$75,000.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/fip/apply"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": []
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 24, "quote": "An applicant must establish his/her farm business and fulfill the investment requirements as outlined in his/her Deposit Agreement within two years of landing.", "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-FIP-Guidelines-Kit-072024.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "落地 {n} 天内向省里报新联系方式",
                        "en": "Give the province your new contact details within {n} days of landing",
                        "ko": "영주권 랜딩 후 {n}일 이내 주정부에 연락처 신고"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "Provide your new contact information to the MPNP within 30 days of your landing as a Permanent Resident.",
                    "url": "https://immigratemanitoba.com/mpnp/bis/fip/apply"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "落地 {n} 年内建起农场、完成投资,保证金才退",
                        "en": "Set up the farm and complete the investment within {n} years of landing to get the deposit back",
                        "ko": "랜딩 후 {n}년 이내 농장 설립·투자 완료 시 예치금 반환"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "You have two years from the date of landing to fulfill the requirements of the Deposit Agreement.",
                    "url": "https://immigratemanitoba.com/wp-content/uploads/2024/07/BIS-FIP-Guidelines-Kit-072024.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 paused 原句:EOI draws for the Business Investor Stream are not currently being conducted.(https://immigratemanitoba.com/mpnp/bis/ep/apply)
判读:与 EP 不同:FIP 先提名、拿永居,落地后两年内建农场(保证金 7.5 万押着),没有工签履约那一段。状态原句「EOI draws for the Business Investor Stream are not currently being conducted.」在 EP 申请页,说的是整个 BIS(FIP 属 BIS),FIP 自己页上没写,lead 定要不要沿用。审理时长:FIP 页与指南均未见数字(查过 bis/fip、fip/apply、fip/eligibility、BIS-FIP-Guidelines-Kit-072024.pdf)。提名后递永居期限未见原句,pr 步不填。"""

PW_MB_INTERNATIONAL_STUDENT_ENTREPRENEUR = {
    "key": "mb-international-student-entrepreneur", "province": "MB", "program": "PNP",
    "plainZh": "MB 留学生创业", "plainEn": "MB Student Entrepreneur", "plainKo": "MB 유학생 창업",
    "officialName": "International Student Entrepreneur Pilot (ISEP)",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://immigratemanitoba.com/mpnp/ies/isep",
    "quote": "The International Student Entrepreneur Pilot (ISEP) provides up to 20 (per calendar year) international students who have graduated in Manitoba the opportunity to pursue entrepreneurship rather than employment.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "visit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "递任何表之前必须先参加说明会",
                        "en": "Attend an information session before submitting any forms",
                        "ko": "서류 제출 전 설명회 참석 필수"
                    },
                    "quote": "Attending an information session is required before you submit any forms to the MPNP.",
                    "url": "https://immigratemanitoba.com/mpnp/ies/isep"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "用邮件递意向表和商业构想表,不算申请",
                        "en": "Email the Interest Guideline and Business Concept forms; this is not an application",
                        "ko": "관심 지침서·사업 구상서를 이메일로 제출(신청 아님)"
                    },
                    "quote": "Please note that submitting an Interest Guideline and Business Concept form is not an application to the MPNP.",
                    "url": "https://immigratemanitoba.com/mpnp/ies/isep/apply"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 120
                    },
                    "quote": "A verification report, along with the application, must be submitted to the MPNP within 120 days of receiving your LAA.",
                    "url": "https://immigratemanitoba.com/mpnp/ies/isep/eligibility"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 2500
                    },
                    "quote": "All documents listed in the Instructions and Document Checklist and your net worth verification report (if required) must be submitted, and your application fee of $2,500 must be paid at the time of submitting your application to the MPNP.",
                    "url": "https://immigratemanitoba.com/mpnp/ies/isep/apply"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "审理包括当面面试",
                        "en": "The assessment includes an in-person interview",
                        "ko": "심사에 대면 면접 포함"
                    },
                    "quote": "The assessment process will include an in-person interview with the MPNP.",
                    "url": "https://immigratemanitoba.com/mpnp/ies/isep/apply"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "原则批准前签商业履约协议",
                        "en": "Sign the Business Performance Agreement before approval in principle",
                        "ko": "원칙 승인 전 사업이행협약(BPA) 서명"
                    },
                    "quote": "You must sign an ISEP-Business Performance Agreement (BPA) prior to the MPNP approving your application in principle so you can pursue your business plan.",
                    "url": "https://immigratemanitoba.com/mpnp/ies/isep/apply"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 6, "max": None, "quote": "You must operate the business as a senior manager on a daily basis from the place of business in Manitoba for at least 6 months prior to nomination, consistent with the requirements of your Business Performance Agreement (BPA).", "url": "https://immigratemanitoba.com/mpnp/ies/isep/eligibility"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "You must operate the business as a senior manager on a daily basis from the place of business in Manitoba for at least 6 months prior to nomination, consistent with the requirements of your Business Performance Agreement (BPA).",
                    "url": "https://immigratemanitoba.com/mpnp/ies/isep/eligibility"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": []
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:每年最多 20 人(原句在 quote)。LAA 后递交期限三处口径不一:eligibility 页 120 天(已登)、Process Map PDF 120 天、mpnp-isep-guideline-kit.pdf(2019)写 90 天;apply 页只写「within the time period outlined in the LAA」。ISEP 属国际教育流(IES)不属 BIS,BIS「不抽选」那句不套用,状态判 open。审理时长、提名后期限未见原句。"""

PW_ON_ENTREPRENEUR = {
    "key": "on-entrepreneur", "province": "ON", "program": "PNP",
    "plainZh": "ON 创业", "plainEn": "ON Entrepreneur", "plainKo": "ON 창업",
    "officialName": "Entrepreneur Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "closed",
    "url": "https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams",
    "quote": "The new Ontario Workforce Priority stream has now launched, and all previous streams are now closed.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 closed 原句:The new Ontario Workforce Priority stream has now launched, and all previous streams are now closed.(https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams)
判读:已关:ontario.ca/page/oinp-entrepreneur-stream 现在 302 到 archives.gov.on.ca(redirect_id=document/oinp-entrepreneur-stream&redirect_year=2026),该站被 Radware 拦(httpx 拿回的是验证页,缓存里这个 url 现存的是验证壳,别拿它核句)。OINP 通道总表(本身也已标 archived)只列 9 条工人类流,不含 Entrepreneur;状态原句取自该页。quote 留空:现行官网已无该通道介绍页可引。"""

PW_NS_ENTREPRENEUR = {
    "key": "ns-entrepreneur", "province": "NS", "program": "PNP",
    "plainZh": "NS 创业", "plainEn": "NS Entrepreneur", "plainKo": "NS 창업",
    "officialName": "Entrepreneur Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://liveinnovascotia.com/entrepreneur",
    "quote": "The Entrepreneur Stream is for experienced business owners or senior business managers who want to live in Nova Scotia.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "There is no fee to submit an EOI.",
                    "url": "https://liveinnovascotia.com/resources/nsnp-update-application-fees-effective-september-1-2026"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "We keep your EOI for one year from the date we received it.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "只凭省里邀请申请",
                        "en": "Apply by invitation only",
                        "ko": "주정부 초청을 받아야만 신청 가능"
                    },
                    "quote": "Application to the stream is by invitation only.",
                    "url": "https://liveinnovascotia.com/entrepreneur"
                }
            ]
        },
        {
            "step": "apply",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 6, "quote": "Within 180 calendar days of receiving your Invitation to Apply Submit the following:", "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "appFee",
                    "vars": {
                        "n": 2000
                    },
                    "quote": "$2,000 for the Entrepreneur stream.",
                    "url": "https://liveinnovascotia.com/resources/nsnp-update-application-fees-effective-september-1-2026"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后新开业 {n} 天内、买现成生意 {m} 天内交费",
                        "en": "Pay the fee within {n} days of the invitation for a new business, {m} days for buying one",
                        "ko": "초청 후 신규 창업 {n}일, 기존 사업 인수 {m}일 이내 수수료 납부"
                    },
                    "vars": {
                        "n": 90,
                        "m": 180
                    },
                    "quote": "If you are selected for assessment, you are responsible for paying the $2,000 application fee within 90 calendar days of receiving your Invitation to Apply if you are establishing a new business or within 180 calendar days if you are purchasing an existing business.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "We cannot tell you how long it will take to assess your application.", "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "通常在联系你后 {n} 天内面试",
                        "en": "Interview usually within {n} days of being contacted",
                        "ko": "연락 후 보통 {n}일 이내 면접"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "We usually interview you within 30 days of contacting you.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到省批准信 {n} 天内向联邦申请工签",
                        "en": "Apply to IRCC for a work permit within {n} days of the approval letter",
                        "ko": "주정부 승인서 수령 후 {n}일 이내 IRCC에 취업허가 신청"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You must apply to IRCC for your work permit within 60 calendar days of getting your Entrepreneur Approval Letter.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 12, "max": None, "quote": "You must operate your business for at least one full year before you can ask us to nominate you.", "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "联邦发入境介绍信后 {n} 个月内来本省",
                        "en": "Arrive in Nova Scotia within {n} months of the port of entry letter",
                        "ko": "입국 안내서 발급 후 {n}개월 이내 노바스코샤 도착"
                    },
                    "vars": {
                        "n": 6
                    },
                    "quote": "You must come to Nova Scotia no later than 6 months after the date that IRCC sent you your port of entry introduction letter.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "到达 {n} 天内与省里工作人员见面",
                        "en": "Meet provincial staff within {n} days of arrival",
                        "ko": "도착 후 {n}일 이내 주정부 직원 면담"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You must meet with our staff no later than 60 calendar days after the date you arrived in Nova Scotia.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                },
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "As an experienced business owner or senior business manager, you must operate a business in Nova Scotia on a work permit for at least one full year before you can ask us to nominate you for permanent residence.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        },
        {
            "step": "submit",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "按商业履约协议的完成情况审提名请求",
                        "en": "The nomination request is assessed against the Business Performance Agreement",
                        "ko": "사업이행협약 이행 여부로 지명 요청 심사"
                    },
                    "quote": "We will assess your request for nomination based on how well you comply with your Business Performance Agreement and the information you provided in your nomination request.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "Within twelve (12) months of receiving your nominee certificate, apply to Immigration, Refugees and Citizenship Canada (IRCC) for your permanent resident visa.",
                    "url": "https://liveinnovascotia.com/entrepreneur"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:2026-02-18 NSNP 十流并四流后 Entrepreneur 仍是四流之一;申请费自 2026-09-01 起收(此前不收)。审理总时长未见原句(查过 entrepreneur 页、Guide-NSNP-ENT-English.pdf、费用公告页)。指南 PDF 路径是 2026-02,正文页眉写 September 2026。"""

PW_NS_INTERNATIONAL_GRADUATE_ENTREPRENEUR = {
    "key": "ns-international-graduate-entrepreneur", "province": "NS", "program": "PNP",
    "plainZh": "NS 毕业生创业", "plainEn": "NS Graduate Entrepreneur", "plainKo": "NS 졸업생 창업",
    "officialName": "International Graduate Entrepreneur",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://liveinnovascotia.com/entrepreneur",
    "quote": "The International Graduate Entrepreneur sub-criteria is for recent graduates of a Nova Scotia university or the Nova Scotia Community College.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 12, "max": None, "quote": "have at least one year’s continuous experience actively managing and owning your current Nova Scotia business (33.33% ownership minimum);", "url": "https://liveinnovascotia.com/entrepreneur"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "have at least one year’s continuous experience actively managing and owning your current Nova Scotia business (33.33% ownership minimum);",
                    "url": "https://liveinnovascotia.com/entrepreneur"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "There is no fee to submit an EOI.",
                    "url": "https://liveinnovascotia.com/resources/nsnp-update-application-fees-effective-september-1-2026"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "We keep your EOI for one year from the date we received it.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "只凭省里邀请申请",
                        "en": "Apply by invitation only",
                        "ko": "주정부 초청을 받아야만 신청 가능"
                    },
                    "quote": "Application to the stream is by invitation only.",
                    "url": "https://liveinnovascotia.com/entrepreneur"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "appFee",
                    "vars": {
                        "n": 2000
                    },
                    "quote": "$2,000 for the Entrepreneur stream.",
                    "url": "https://liveinnovascotia.com/resources/nsnp-update-application-fees-effective-september-1-2026"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后 {n} 天内交费",
                        "en": "Pay the fee within {n} days of the invitation",
                        "ko": "초청 후 {n}일 이내 수수료 납부"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "Entrepreneur stream – International Graduates: The application fee must be paid within 90 calendar days of receiving an Invitation to Apply.",
                    "url": "https://liveinnovascotia.com/resources/nsnp-update-application-fees-effective-september-1-2026"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "We cannot tell you how long it will take to assess your application.", "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "通常在联系你后 {n} 个工作日内面试",
                        "en": "Interview usually within {n} business days of being contacted",
                        "ko": "연락 후 보통 {n}영업일 이내 면접"
                    },
                    "vars": {
                        "n": 15
                    },
                    "quote": "We usually interview you within 15 business days of contacting you.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "You must apply to IRCC for permanent residence no more than 12 months after you got your nomination certificate and you must pay the fees.",
                    "url": "https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-ENT-English.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:2026-02-18 合并后已不是独立通道,是 Entrepreneur Stream 的子类(公告原句「The International Graduate sub-criteria are the same eligibility requirements as the International Graduate Entrepreneur Stream.」,出处 https://liveinnovascotia.com/resources/nsnp-update-four-consolidated-streams);流程与 Entrepreneur 不同(先在本省用毕业工签经营满一年才递,没有工签 / 履约协议那一段),故单列一条,lead 定要不要并进 ns-entrepreneur。旧独立页 liveinnovascotia.com/international-graduate-entrepreneur 现 404。"""

PW_NB_BUSINESS_IMMIGRATION = {
    "key": "nb-business-immigration", "province": "NB", "program": "PNP",
    "plainZh": "NB 商业移民", "plainEn": "NB Business", "plainKo": "NB 비즈니스 이민",
    "officialName": "New Brunswick Business Immigration stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/business-immigration-stream.html",
    "quote": "The New Brunswick Business Immigration stream is for entrepreneurs who want to start or buy a business in New Brunswick.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "Submitting an expression of interest is free of charge.",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/business-immigration-stream.html"
                },
                {
                    "key": "eoiValidDays",
                    "vars": {
                        "n": 365
                    },
                    "quote": "They remain valid for 365 days from the date of submission.",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program.html"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "poolSelection",
                    "quote": "Immigration New Brunswick reviews submitted expressions of interest and issues invitations to apply only to selected individuals based on provincial labour market needs, available allocation and other priorities determined by the Government of New Brunswick.",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program.html"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 90
                    },
                    "quote": "You have up to 90 calendar days from the date of the ITA to submit a complete application in the INB portal.",
                    "url": "https://www.gnb.ca/content/dam/GNB3/t/fhc-fmc/immigration/docs/nb-business-immigration-stream-guide.pdf"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 2000
                    },
                    "quote": "However, before submitting a complete nomination application, you must pay a non-refundable application fee of $2,000.",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/business-immigration-stream.html"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "reviewSeveralMonths",
                    "quote": "Due to a high volume of applications, this may take several months to complete.",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "签好商业履约协议 {n} 天内交回",
                        "en": "Return the signed Business Performance Agreement within {n} days",
                        "ko": "사업이행협약 서명 후 {n}일 이내 제출"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "Prior to receiving such a letter, you will receive a notification in INB with instructions for submitting a signed and dated Business Performance Agreement (BPA) within 60 days of issuance.",
                    "url": "https://www.gnb.ca/content/dam/GNB3/t/fhc-fmc/immigration/docs/nb-business-immigration-stream-guide.pdf"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "申请获批后申请工签",
                        "en": "Apply for a work permit once approved",
                        "ko": "승인 후 취업허가 신청"
                    },
                    "quote": "If your application is approved, apply for a work permit",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/business-immigration-stream.html"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 6, "max": None, "quote": "After at least 6 months of business operation, ask for a nomination certificate.", "url": "https://www.gnb.ca/content/dam/GNB3/t/fhc-fmc/immigration/docs/nb-business-immigration-stream-guide.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "到达 {n} 个月内报到",
                        "en": "Report your arrival within {n} month",
                        "ko": "도착 후 {n}개월 이내 도착 신고"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "Within one month of arrival, report your arrival (NBBIS-004)",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/business-immigration-stream.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "到达 {n} 个月内开业并报告",
                        "en": "Open the business and report it within {n} months of arrival",
                        "ko": "도착 후 {n}개월 이내 개업 및 신고"
                    },
                    "vars": {
                        "n": 9
                    },
                    "quote": "Within nine months of arrival, report your business opening (NBBIS-005)",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/business-immigration-stream.html"
                },
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "After six months of business operations per the Business Performance Agreement, ask for a nomination (NBBIS-006)",
                    "url": "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/business-immigration-stream.html"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": []
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:旧 Entrepreneurial stream 已被本流取代(本页原句「The Entrepreneurial stream has been replaced by the New Brunswick Business Immigration stream.」)。NB 现行没有毕业生创业流(PNP 总页只列 Skilled Worker / Express Entry / Business Immigration 三流 + 两个试点)。「审理可能要几个月」是 NBPNP 总页对所有提名申请的通用句;抽选:总页列的定期抽选流里没有 Business(只有 Skilled Worker / Express Entry / Strategic Initiative)。提名后递永居期限未见数字。"""

PW_PE_WORK_PERMIT = {
    "key": "pe-work-permit", "province": "PE", "program": "PNP",
    "plainZh": "PE 工签创业", "plainEn": "PE Business Work Permit", "plainKo": "PE 취업허가 창업",
    "officialName": "Work Permit Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream",
    "quote": "This stream is for foreign nationals with business ownership or extensive management experience who would like to move to PEI to start their business, and eventually become a permanent resident.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "There is no fee to create an Expression of Interest.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "Your profile will remain active for a period of six months.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "省里可限额或把部分 EOI 排除在抽选外",
                        "en": "The province may limit intake or exclude EOIs from draws",
                        "ko": "주정부가 접수를 제한하거나 일부 EOI를 추첨에서 제외할 수 있음"
                    },
                    "quote": "The Office reserves the right to limit intake or make exclusions from Expressions of Interest draws.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                }
            ]
        },
        {
            "step": "apply",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 2, "quote": "Individuals who are invited to apply will be removed from the pool and have up to 60 days from the invitation date to submit an application.", "url": "https://www.princeedwardisland.ca/sites/default/files/publications/business_impact_application_guide.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "交 {n} 加元申请费",
                        "en": "Pay a CAD {n} application fee",
                        "ko": "신청 수수료 {n}캐나다달러 납부"
                    },
                    "vars": {
                        "n": 10000
                    },
                    "quote": "If you are selected for nomination by PEI, the application fee is $10,000 CAD which must be submitted with your application.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "面试后被拒或撤回,申请费全部不退",
                        "en": "The fee is not refunded if declined or withdrawn after the interview",
                        "ko": "면접 후 거절·철회 시 수수료 전액 환불 불가"
                    },
                    "quote": "If your file is declined or withdrawn after you have interviewed with our office, the entire fee is non-refundable.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "要和移民办工作人员面试",
                        "en": "Interview with Office of Immigration staff",
                        "ko": "이민청 직원과 면접"
                    },
                    "quote": "Attend an interview with staff from the Office of Immigration.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后省里发工签支持信,自己向联邦申请工签",
                        "en": "After approval the province issues a work permit support letter; you apply to IRCC",
                        "ko": "승인 후 주정부 취업허가 지원서한 발급, 본인이 IRCC에 신청"
                    },
                    "quote": "After you are approved you will receive a letter of support from the province for a work permit.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 12, "max": None, "quote": "The Work Permit Stream is for individuals interested in coming to PEI on a work permit and operating a business for a minimum of one year prior to receiving a nomination for permanent residency.", "url": "https://www.princeedwardisland.ca/sites/default/files/publications/business_impact_application_guide.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "工签获批后搬来本省开业",
                        "en": "Move to PEI and start the business once the work permit is approved",
                        "ko": "취업허가 승인 후 PEI로 이주해 창업"
                    },
                    "quote": "After you are approved for a work permit, you must move to PEI and start your business.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "履行完履约协议全部条款才发提名",
                        "en": "Nomination is issued only after all Performance Agreement terms are met",
                        "ko": "이행협약 조건을 모두 충족해야 지명서 발급"
                    },
                    "quote": "After you have fulfilled all of the terms and conditions of your Performance Agreement you will be issued a nomination certificate.",
                    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:princeedwardisland.ca 有 Radware 人机验证:work-permit-stream 页是 Frank 手动过验证后用浏览器渲染态存的缓存(2026-10-12)。Business Impact Category Guide PDF(/sites/default/files/publications/business_impact_application_guide.pdf)未取(not-collected,WAF),所以邀请后递交期限、履约期限、审理时长、提名后递永居期限都未登。页上写 2022-08-18 起须经指定资产核查机构核净资产。⚠ 缓存事故:本轮用 httpx 刷新 pe-imm 的 provincial-nominee-program 页时被 Radware 拦,缓存里该 url 现存的是验证壳(原缓存被覆盖),需要重抓。"""

PW_NL_INTERNATIONAL_ENTREPRENEUR = {
    "key": "nl-international-entrepreneur", "province": "NL", "program": "PNP",
    "plainZh": "NL 国际创业", "plainEn": "NL Entrepreneur", "plainKo": "NL 국제 창업",
    "officialName": "International Entrepreneur",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/entrepreneurs/international-entrepreneur/overview",
    "quote": "The International Entrepreneur category is for experienced business owners or senior managers who want to live in Newfoundland and Labrador permanently.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "visit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "从省外申请的要先来本省实地考察",
                        "en": "Applicants from outside the province must make an exploratory visit first",
                        "ko": "주 밖에서 신청하면 먼저 현지 답사 필수"
                    },
                    "quote": "All prospective International Entrepreneur applicants applying from outside the province must conduct an initial exploratory visit to Newfoundland and Labrador prior to submitting an official application to the Office of Immigration and Multiculturalism.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "There is no fee for submitting an EOI.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "EOIs can remain in the pool for twelve months from the date of receipt.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": []
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 90
                    },
                    "quote": "You will have 90 calendar days from the issuance date of the ITA letter to submit:",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                },
                {
                    "key": "noFee",
                    "quote": "No fee to apply under this category",
                    "url": "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/entrepreneurs/international-entrepreneur/overview"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "OIM does not currently have standard processing times for the NLPNP.", "url": "https://www.gov.nl.ca/immigration/faqs/nl-provincial-nominee-program-candidate-faqs"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "通常在省里要求后 {n} 天内面试",
                        "en": "Interview expected within {n} days of the request",
                        "ko": "요청 후 {n}일 이내 면접 예정"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "It is anticipated that the interview will take place within 60 calendar days of OIM’s request.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "签好商业履约协议 {n} 个工作日内交回",
                        "en": "Return the signed Business Performance Agreement within {n} business days",
                        "ko": "사업이행협약 서명 후 {n}영업일 이내 제출"
                    },
                    "vars": {
                        "n": 15
                    },
                    "quote": "You must review your signed and dated Business Performance Agreement and submit as instructed within 15 business days from the date the agreement was sent to you electronically by OIM.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到批准信 {n} 个月内向联邦申请工签",
                        "en": "Apply to IRCC for a work permit within {n} months of the approval letter",
                        "ko": "승인서 수령 후 {n}개월 이내 IRCC에 취업허가 신청"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "You must apply to IRCC for your work permit within two months of the date on the International Entrepreneur Approval Letter.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 12, "max": None, "quote": "You must operate and actively manage your business for a minimum of one year before you are eligible for nomination.", "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到批准信 {n} 个月内到本省,否则结案",
                        "en": "Arrive in the province within {n} months of the approval letter or the file closes",
                        "ko": "승인서 수령 후 {n}개월 이내 미도착 시 파일 종결"
                    },
                    "vars": {
                        "n": 6
                    },
                    "quote": "All approved applicants (and any associated partners, if applicable) that do not arrive in Newfoundland and Labrador within six (6) months of the date of receipt of the International Entrepreneur Approval Letter will be deemed to have failed to fulfill the terms of their Business Performance Agreement and their file will be closed.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "到达 {n} 天内与移民办见面",
                        "en": "Meet the immigration office within {n} days of arrival",
                        "ko": "도착 후 {n}일 이내 이민청 면담"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "All approved applicants (and any associated partners, if applicable) are required to meet with OIM staff within 30 calendar days of their arrival date.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                },
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "Note: You must operate and actively manage your business for a minimum of one year before you are eligible for nomination.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "This means you must apply for permanent residency within six (6) months.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Entrepreneur.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:申请费口径冲突:现行通道页写「No fee to apply under this category」(已登),指南 PDF(December 2020)写「There is a provincial application fee for the International Entrepreneur category」并让看网站 —— 以网页为准。通道页写「The Expression of Interest system is currently open.」(状态 open 的依据)。ITA 更新页未见创业类抽选记录,抽选步不挂事实。审理总时长未见原句。"""

PW_NL_INTERNATIONAL_GRADUATE_ENTREPRENEUR = {
    "key": "nl-international-graduate-entrepreneur", "province": "NL", "program": "PNP",
    "plainZh": "NL 毕业生创业", "plainEn": "NL Graduate Entrepreneur", "plainKo": "NL 졸업생 창업",
    "officialName": "International Graduate Entrepreneur",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/entrepreneurs/international-graduate-entrepreneur/eligibility-criteria",
    "quote": "This category is for graduates of Memorial University or College of the North Atlantic who want to live in Newfoundland and Labrador permanently and run a business.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 12, "max": None, "quote": "have started or acquired a business in Newfoundland and Labrador, including actively operating and managing it for at least one (1) year;", "url": "https://www.gov.nl.ca/immigration/files/International-Graduate-Entrepreneur-Guide-April-2022-1.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "Own and actively manage a local business (at least 33.3% ownership) for 1 full year",
                    "url": "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/entrepreneurs/international-graduate-entrepreneur/eligibility-criteria"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "There is no fee for submitting an EOI.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Graduate-Entrepreneur-Guide-April-2022-1.pdf"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "EOIs can remain in the pool for twelve months from the date of receipt.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Graduate-Entrepreneur-Guide-April-2022-1.pdf"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": []
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 90
                    },
                    "quote": "You will have 90 calendar days from the issuance date of the ITA letter to submit: a complete application form;",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Graduate-Entrepreneur-Guide-April-2022-1.pdf"
                },
                {
                    "key": "noFee",
                    "quote": "There is no provincial application fee for the International Graduate Entrepreneur category (for the principal applicant and associated partners).",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Graduate-Entrepreneur-Guide-April-2022-1.pdf"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "OIM does not currently have standard processing times for the NLPNP.", "url": "https://www.gov.nl.ca/immigration/faqs/nl-provincial-nominee-program-candidate-faqs"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "通常在省里要求后 {n} 个工作日内面试",
                        "en": "Interview expected within {n} business days of the request",
                        "ko": "요청 후 {n}영업일 이내 면접 예정"
                    },
                    "vars": {
                        "n": 15
                    },
                    "quote": "It is anticipated that the interview will take place within 15 business days of OIM’s request.",
                    "url": "https://www.gov.nl.ca/immigration/files/International-Graduate-Entrepreneur-Guide-April-2022-1.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": []
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:通道概览页(.../international-graduate-entrepreneur/overview)写「The Expression of Interest system is currently open.」;url 取资格页,因为一句话介绍原句在资格页。指南 PDF 是 April 2022 版(页眉 December 2020)。提名后递永居期限的句子在 PDF 里被分页截断,未登。"""

PW_YT_SKILLED_WORKER = {
    "key": "yt-skilled-worker", "province": "YT", "program": "PNP",
    "plainZh": "YT 技术工人", "plainEn": "YT Skilled Worker", "plainKo": "YT 숙련 근로자",
    "officialName": "Skilled Worker stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "paused",
    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker",
    "quote": "The Skilled Worker stream is for management positions or jobs that require more education in:",
    "checked": "2026-10-12",
    "jobLinked": True,
    "steps": [
        {
            "step": "offer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主先在加拿大境内登招聘广告满 {n} 周",
                        "en": "Employer advertises the job in Canada for at least {n} weeks first",
                        "ko": "고용주가 먼저 캐나다 내에서 {n}주 이상 채용 공고"
                    },
                    "vars": {
                        "n": 4
                    },
                    "quote": "You must advertise the position within Canada for at least 4 weeks before you apply to the program.",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主经营满 {n} 年",
                        "en": "Employer has operated for at least {n} year",
                        "ko": "고용주 영업 {n}년 이상"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "have a business that has been in operation for at least 1 year",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "由雇主递交,本人不能递",
                        "en": "Employer submits, not the worker",
                        "ko": "고용주가 제출, 본인은 제출 불가"
                    },
                    "quote": "The employer submits all forms and applications, not the foreign worker.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "每年只在两个收件窗口递(2026 年 1 月、7 月)",
                        "en": "Only during two intake windows a year (January and July in 2026)",
                        "ko": "연 2회 접수 기간에만 제출(2026년 1월, 7월)"
                    },
                    "quote": "The Expression of Interest intakes are open from January 19 to 30, 2026, and from July 6 to 17, 2026.",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "每个收件窗口都要重新递",
                        "en": "A new EOI is needed for each intake",
                        "ko": "접수 기간마다 새로 제출"
                    },
                    "quote": "You must submit a new expression of internet for each intake.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "按年度优先项打分,分高的发邀请",
                        "en": "Top-ranked EOIs against yearly priorities are invited",
                        "ko": "연간 우선순위 점수 상위자에게 초청"
                    },
                    "quote": "The highest-ranking expression of interest submissions will be invited to apply to the program.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "apply",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主要先参加递交说明会",
                        "en": "Employer must attend an information session first",
                        "ko": "고용주는 먼저 설명회 참석"
                    },
                    "quote": "Employers who receive an invitation to apply must attend an information session on submitting applications.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "在截止日前递齐全部材料",
                        "en": "Submit the complete application before the deadline",
                        "ko": "마감일 전 서류 일체 제출"
                    },
                    "quote": "Completed applications, including all required documents, must be submitted before the deadline.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "We do not have an estimated time for how long an application takes for processing.", "url": "https://yukon.ca/sites/default/files/ecdev-ynp-2026-operational-guidance-2026-07-03.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件即批准",
                        "en": "Approved if all requirements are met",
                        "ko": "모든 요건 충족 시 승인"
                    },
                    "quote": "If the application meets all eligibility requirements, the Government of Yukon approves the application.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "agreement",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "育空政府、本人、雇主三方签协议",
                        "en": "Yukon, nominee and employer sign a tripartite agreement",
                        "ko": "유콘 정부·본인·고용주 3자 협약 서명"
                    },
                    "quote": "Successful applicants will sign a Tripartite Agreement between the Government of Yukon, the nominee and the employer.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "The nominee must apply for permanent residency with IRCC within 6 months of approval.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 paused 原句:Intake 2: Closed Opens July 6, 2026, at 9 am Yukon Standard Time.(https://yukon.ca/en/yukon-nominee-program)
判读:TEER 0–3;既往经验 12 个月(门槛,不是步骤)。yukon.ca 整站 Cloudflare 人机验证,httpx 403;本地 yt-imm 缓存是 crawl 役浏览器兜底抓的真页(2026-10-09),manifest 却记 status 403 → 读门 get_cached_page 不认。本批经写门 put_cached_page 把其中 8 页原样重登成 200 行(文件名不变、内容不变),但 yt-imm 下轮爬会整份覆写 manifest、又记回 403 —— crawl 役浏览器兜底记状态码的毛病要 lead 另立批次修。2026 年两期 EOI 均已关(官网「Intake 1: Closed」「Intake 2: Closed」),2027 收件日期官网未公布;status 给 paused 供 lead 判。2026 配额原句「IRCC allocated a maximum of 282 nominations to the Yukon Nominee Program.」。审理时长:官网页未写,运营指南 / 手册 PDF 被 WAF 拦未入缓存(已记 blocked_urls.txt),未能核。"""

PW_YT_CRITICAL_IMPACT_WORKER = {
    "key": "yt-critical-impact-worker", "province": "YT", "program": "PNP",
    "plainZh": "YT 关键岗位工人", "plainEn": "YT Critical Impact Worker", "plainKo": "YT 핵심 인력",
    "officialName": "Critical Impact Worker stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "paused",
    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker",
    "quote": "The Critical Impact Worker stream is for entry-level jobs in:",
    "checked": "2026-10-12",
    "jobLinked": True,
    "steps": [
        {
            "step": "offer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主先在加拿大境内登招聘广告满 {n} 周",
                        "en": "Employer advertises the job in Canada for at least {n} weeks first",
                        "ko": "고용주가 먼저 캐나다 내에서 {n}주 이상 채용 공고"
                    },
                    "vars": {
                        "n": 4
                    },
                    "quote": "You must advertise the position within Canada for at least 4 weeks before you apply to the program.",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主经营满 {n} 年",
                        "en": "Employer has operated for at least {n} year",
                        "ko": "고용주 영업 {n}년 이상"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "have a business that has been in operation for at least 1 year",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "由雇主递交,本人不能递",
                        "en": "Employer submits, not the worker",
                        "ko": "고용주가 제출, 본인은 제출 불가"
                    },
                    "quote": "The employer submits all forms and applications, not the foreign worker.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "每年只在两个收件窗口递(2026 年 1 月、7 月)",
                        "en": "Only during two intake windows a year (January and July in 2026)",
                        "ko": "연 2회 접수 기간에만 제출(2026년 1월, 7월)"
                    },
                    "quote": "The Expression of Interest intakes are open from January 19 to 30, 2026, and from July 6 to 17, 2026.",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "每个收件窗口都要重新递",
                        "en": "A new EOI is needed for each intake",
                        "ko": "접수 기간마다 새로 제출"
                    },
                    "quote": "You must submit a new expression of internet for each intake.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "按年度优先项打分,分高的发邀请",
                        "en": "Top-ranked EOIs against yearly priorities are invited",
                        "ko": "연간 우선순위 점수 상위자에게 초청"
                    },
                    "quote": "The highest-ranking expression of interest submissions will be invited to apply to the program.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "apply",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主要先参加递交说明会",
                        "en": "Employer must attend an information session first",
                        "ko": "고용주는 먼저 설명회 참석"
                    },
                    "quote": "Employers who receive an invitation to apply must attend an information session on submitting applications.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "在截止日前递齐全部材料",
                        "en": "Submit the complete application before the deadline",
                        "ko": "마감일 전 서류 일체 제출"
                    },
                    "quote": "Completed applications, including all required documents, must be submitted before the deadline.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "We do not have an estimated time for how long an application takes for processing.", "url": "https://yukon.ca/sites/default/files/ecdev-ynp-2026-operational-guidance-2026-07-03.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件即批准",
                        "en": "Approved if all requirements are met",
                        "ko": "모든 요건 충족 시 승인"
                    },
                    "quote": "If the application meets all eligibility requirements, the Government of Yukon approves the application.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "agreement",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "育空政府、本人、雇主三方签协议",
                        "en": "Yukon, nominee and employer sign a tripartite agreement",
                        "ko": "유콘 정부·본인·고용주 3자 협약 서명"
                    },
                    "quote": "Successful applicants will sign a Tripartite Agreement between the Government of Yukon, the nominee and the employer.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "The nominee must apply for permanent residency with IRCC within 6 months of approval.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 paused 原句:Intake 2: Closed Opens July 6, 2026, at 9 am Yukon Standard Time.(https://yukon.ca/en/yukon-nominee-program)
判读:TEER 4–5;既往经验 6 个月、CLB 4(门槛)。yukon.ca 整站 Cloudflare 人机验证,httpx 403;本地 yt-imm 缓存是 crawl 役浏览器兜底抓的真页(2026-10-09),manifest 却记 status 403 → 读门 get_cached_page 不认。本批经写门 put_cached_page 把其中 8 页原样重登成 200 行(文件名不变、内容不变),但 yt-imm 下轮爬会整份覆写 manifest、又记回 403 —— crawl 役浏览器兜底记状态码的毛病要 lead 另立批次修。2026 年两期 EOI 均已关(官网「Intake 1: Closed」「Intake 2: Closed」),2027 收件日期官网未公布;status 给 paused 供 lead 判。2026 配额原句「IRCC allocated a maximum of 282 nominations to the Yukon Nominee Program.」。审理时长:官网页未写,运营指南 / 手册 PDF 被 WAF 拦未入缓存(已记 blocked_urls.txt),未能核。"""

PW_YT_EXPRESS_ENTRY = {
    "key": "yt-express-entry", "province": "YT", "program": "PNP",
    "plainZh": "YT 快速通道", "plainEn": "YT Express Entry", "plainKo": "YT 익스프레스 엔트리",
    "officialName": "Yukon Express Entry stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "paused",
    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-express-entry-stream-hire-foreign-worker",
    "quote": "The Yukon Express Entry stream allows employers to hire foreign nationals who are in IRCC’s Express Entry pool.",
    "checked": "2026-10-12",
    "jobLinked": True,
    "steps": [
        {
            "step": "eeProfile",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "递 EOI 时就要有有效的 EE 档案",
                        "en": "Need a valid Express Entry profile",
                        "ko": "유효한 EE 프로필 필요"
                    },
                    "quote": "have a valid Express Entry profile;",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-express-entry-stream-hire-foreign-worker"
                }
            ]
        },
        {
            "step": "offer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主先在加拿大境内登招聘广告满 {n} 周",
                        "en": "Employer advertises the job in Canada for at least {n} weeks first",
                        "ko": "고용주가 먼저 캐나다 내에서 {n}주 이상 채용 공고"
                    },
                    "vars": {
                        "n": 4
                    },
                    "quote": "You must advertise the position within Canada for at least 4 weeks before you apply to the program.",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-express-entry-stream-hire-foreign-worker"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主经营满 {n} 年",
                        "en": "Employer has operated for at least {n} year",
                        "ko": "고용주 영업 {n}년 이상"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "have been operating your business for at least 1 year",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-express-entry-stream-hire-foreign-worker"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "由雇主递交,本人不能递",
                        "en": "Employer submits, not the worker",
                        "ko": "고용주가 제출, 본인은 제출 불가"
                    },
                    "quote": "The employer submits all forms and applications, not the foreign worker.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "每年只在两个收件窗口递(2026 年 1 月、7 月)",
                        "en": "Only during two intake windows a year (January and July in 2026)",
                        "ko": "연 2회 접수 기간에만 제출(2026년 1월, 7월)"
                    },
                    "quote": "The Expression of Interest intakes are open from January 19 to 30, 2026, and from July 6 to 17, 2026.",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire-foreign-worker"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "每个收件窗口都要重新递",
                        "en": "A new EOI is needed for each intake",
                        "ko": "접수 기간마다 새로 제출"
                    },
                    "quote": "You must submit a new expression of internet for each intake.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "按年度优先项打分,分高的发邀请",
                        "en": "Top-ranked EOIs against yearly priorities are invited",
                        "ko": "연간 우선순위 점수 상위자에게 초청"
                    },
                    "quote": "The highest-ranking expression of interest submissions will be invited to apply to the program.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "apply",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主要先参加递交说明会",
                        "en": "Employer must attend an information session first",
                        "ko": "고용주는 먼저 설명회 참석"
                    },
                    "quote": "Employers who receive an invitation to apply must attend an information session on submitting applications.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "在截止日前递齐全部材料",
                        "en": "Submit the complete application before the deadline",
                        "ko": "마감일 전 서류 일체 제출"
                    },
                    "quote": "Completed applications, including all required documents, must be submitted before the deadline.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "We do not have an estimated time for how long an application takes for processing.", "url": "https://yukon.ca/sites/default/files/ecdev-ynp-2026-operational-guidance-2026-07-03.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件即批准",
                        "en": "Approved if all requirements are met",
                        "ko": "모든 요건 충족 시 승인"
                    },
                    "quote": "If the application meets all eligibility requirements, the Government of Yukon approves the application.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "agreement",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "育空政府、本人、雇主三方签协议",
                        "en": "Yukon, nominee and employer sign a tripartite agreement",
                        "ko": "유콘 정부·본인·고용주 3자 협약 서명"
                    },
                    "quote": "Successful applicants will sign a Tripartite Agreement between the Government of Yukon, the nominee and the employer.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后联邦发永居邀请",
                        "en": "Once approved, Canada invites you to apply for PR",
                        "ko": "승인 후 연방이 영주권 신청 초청"
                    },
                    "quote": "If we approve the application, the federal government invites the foreign worker to apply for permanent residence.",
                    "url": "https://yukon.ca/en/immigration/yukon-nominee-program/apply-express-entry-stream-hire-foreign-worker"
                },
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "The nominee must apply for permanent residency with IRCC within 6 months of approval.",
                    "url": "https://yukon.ca/en/yukon-nominee-program"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 paused 原句:Intake 2: Closed Opens July 6, 2026, at 9 am Yukon Standard Time.(https://yukon.ca/en/yukon-nominee-program)
判读:TEER 0–3;既往经验 6 个月;CLB 7(TEER 0/1)/ 5(TEER 2/3)。yukon.ca 整站 Cloudflare 人机验证,httpx 403;本地 yt-imm 缓存是 crawl 役浏览器兜底抓的真页(2026-10-09),manifest 却记 status 403 → 读门 get_cached_page 不认。本批经写门 put_cached_page 把其中 8 页原样重登成 200 行(文件名不变、内容不变),但 yt-imm 下轮爬会整份覆写 manifest、又记回 403 —— crawl 役浏览器兜底记状态码的毛病要 lead 另立批次修。2026 年两期 EOI 均已关(官网「Intake 1: Closed」「Intake 2: Closed」),2027 收件日期官网未公布;status 给 paused 供 lead 判。2026 配额原句「IRCC allocated a maximum of 282 nominations to the Yukon Nominee Program.」。审理时长:官网页未写,运营指南 / 手册 PDF 被 WAF 拦未入缓存(已记 blocked_urls.txt),未能核。"""

PW_YT_BUSINESS_NOMINEE = {
    "key": "yt-business-nominee", "province": "YT", "program": "PNP",
    "plainZh": "YT 商业移民", "plainEn": "YT Business", "plainKo": "YT 비즈니스 이민",
    "officialName": "Yukon Business Nominee Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/find-eligibility-requirements-apply-run-your-business-yukon-foreign-entrepreneurs",
    "quote": "Foreign business owners and entrepreneurs can apply to run their business in Yukon via the Yukon Business Nominee Program.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "评分表至少 {n} 分",
                        "en": "Score at least {n} points on the grid",
                        "ko": "평가표 {n}점 이상"
                    },
                    "vars": {
                        "n": 65
                    },
                    "quote": "Achieve a score of at least 65 points on the assessment grid.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/find-eligibility-requirements-apply-run-your-business-yukon-foreign-entrepreneurs"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "净资产至少 {n} 加元",
                        "en": "Net worth of at least CAD {n}",
                        "ko": "순자산 최소 {n} 캐나다 달러"
                    },
                    "vars": {
                        "n": 500000
                    },
                    "quote": "Have a net worth of at least CAD $500,000.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/find-eligibility-requirements-apply-run-your-business-yukon-foreign-entrepreneurs"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "递签字原件(现场或邮寄)",
                        "en": "Submit the signed original application",
                        "ko": "서명 원본 신청서 제출"
                    },
                    "quote": "Submit the complete and original signed application.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "about", "unit": "month", "min": 3, "max": 3, "quote": "We'll contact you within 12 to 14 weeks with the decision of your application.", "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "{min}–{max} 周内通知结果",
                        "en": "Decision within {min}–{max} weeks",
                        "ko": "{min}–{max}주 내 결과 통보"
                    },
                    "vars": {
                        "min": 12,
                        "max": 14
                    },
                    "quote": "We'll contact you within 12 to 14 weeks with the decision of your application.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "Applications that meet the eligibility requirements and have a minimum score of 65 points enter a pool of potential candidates for 6 months if your business concept is approved.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "从池里选人,补交证明材料和商业计划",
                        "en": "Selected candidates submit proof and a business plan",
                        "ko": "선발자는 증빙과 사업계획서 제출"
                    },
                    "quote": "We'll invite only candidates selected from the pool to submit documents to verify the information contained in the original application and assess your business plan.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"
                }
            ]
        },
        {
            "step": "visit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "到育空考察并当面面试",
                        "en": "Exploratory trip and in-person interview in Yukon",
                        "ko": "유콘 답사 및 대면 면접"
                    },
                    "quote": "We'll invite you for an exploratory trip and an in-person interview in the Yukon if you meet the requirements.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"
                }
            ]
        },
        {
            "step": "closedPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "面试通过后支持申请 {n} 年工签",
                        "en": "Support letter for a {n}-year work permit",
                        "ko": "{n}년 취업허가 지원"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "If we approve your application after the interview, we'll support you in getting a 2-year work permit from the federal government.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "exact", "unit": "month", "min": 24, "max": 24, "quote": "We'll support your permanent residency application to the federal government at the end of the 2-year work permit period if you meet the requirements.", "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "工签期间在育空安家并开起生意",
                        "en": "Settle and set up the business in Yukon during the permit",
                        "ko": "취업허가 기간에 정착하고 사업 개시"
                    },
                    "quote": "During this time, we expect you to establish yourself, your family and your business in the Yukon.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "头 {y} 年至少投资 {n} 加元",
                        "en": "Invest at least CAD {n} in the first {y} years",
                        "ko": "처음 {y}년간 최소 {n} 캐나다 달러 투자"
                    },
                    "vars": {
                        "n": 300000,
                        "y": 2
                    },
                    "quote": "Show how you will invest at least CAD $300,000 in capital investments for the business in the first 2 years.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/find-eligibility-requirements-apply-run-your-business-yukon-foreign-entrepreneurs"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "{n} 年工签期满、达标后支持递永居",
                        "en": "PR support at the end of the {n}-year permit if requirements are met",
                        "ko": "{n}년 취업허가 만료 시 요건 충족하면 영주권 지원"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "We'll support your permanent residency application to the federal government at the end of the 2-year work permit period if you meet the requirements.",
                    "url": "https://yukon.ca/en/immigration/yukon-business-nominee-program/apply-run-your-own-business-yukon-foreign-entrepreneurs"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:育空商业移民是独立项目(Yukon Business Nominee Program),官网未见 2026 暂停 / 配额满字样,给 open。审理 12–14 周后进 6 个月候选池,官网页的顺序是「递申请 → 审 → 进池 → 选中补材料 → 考察面试 → 2 年工签 → 永居」,照此排。申请费:官网页未写;政策 PDF 被 WAF 拦(已记 blocked_urls.txt)。Yukon Community Pilot:2026 总览页只列三条工人通道(原句「There are 3 program streams:」),缓存 52 页无「pilot」字样,未收录,不出行。缓存说明同其他 YT 行(403 重登)。"""

PW_NT_SKILLED_WORKER = {
    "key": "nt-skilled-worker", "province": "NT", "program": "PNP",
    "plainZh": "NT 技术工人", "plainEn": "NT Skilled Worker", "plainKo": "NT 숙련 근로자",
    "officialName": "Skilled Worker",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.immigratenwt.ca/skilled-worker",
    "quote": "This category is for occupations that fall under National Occupation Classification (NOC) TEER 0, 1, 2 or 3.",
    "checked": "2026-10-12",
    "jobLinked": True,
    "steps": [
        {
            "step": "offer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先要有西北地区雇主的 offer,由雇主替你申请",
                        "en": "Need a job offer from an NWT employer who applies for you",
                        "ko": "NWT 고용주 오퍼 필요, 고용주가 대신 신청"
                    },
                    "quote": "To participate in this stream, you first need a job offer from an NWT employer and this NWT Employer needs to apply on your behalf.",
                    "url": "https://www.immigratenwt.ca/employer-driven-stream"
                }
            ]
        },
        {
            "step": "employerRegister",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主在线上系统为每位申请人单独建号",
                        "en": "Employer creates a separate portal ID for each applicant",
                        "ko": "고용주가 신청자별로 포털 ID 생성"
                    },
                    "quote": "Employers register by creating a unique Employer User ID for each Nominee Applicant.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "noFee",
                    "quote": "Registration is free of charge.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主建号后由你本人填 EOI 问卷",
                        "en": "You fill in the EOI survey after the employer registers",
                        "ko": "고용주 등록 후 본인이 EOI 설문 작성"
                    },
                    "quote": "The EOI survey must be completed by the Nominee Applicant after the Employer registers in the NTNP online application portal found here: https://ntnp.immigratenwt.ca/.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "An EOI profile is valid for one year from the date of submission, after which it will expire.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "随时可递,不设截止",
                        "en": "Open year-round, no deadline",
                        "ko": "상시 제출 가능, 마감 없음"
                    },
                    "quote": "There is no limit to the number of applicants who can submit an Expression of Interest and there is no deadline.",
                    "url": "https://www.immigratenwt.ca/expression-interest"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "全年分几轮抽选,分高的雇主收邀请",
                        "en": "Several draws a year; top scores are invited",
                        "ko": "연중 여러 차례 추첨, 고득점자 초청"
                    },
                    "quote": "Employers whose Nominee Applicants have the highest-ranking scores will receive invitations to apply through draws held throughout the year.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "下一轮抽选在 {n} 年初",
                        "en": "Next draw in early {n}",
                        "ko": "다음 추첨은 {n}년 초"
                    },
                    "vars": {
                        "n": 2027
                    },
                    "quote": "The next Expression of Interest draw for the Northwest Territories Nominee Program will be held in early 2027.",
                    "url": "https://www.immigratenwt.ca/expression-interest"
                }
            ]
        },
        {
            "step": "apply",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 30
                    },
                    "quote": "Employers will have 30 calendar days to submit the full application, after which the EOI will expire.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "只收线上递交",
                        "en": "Online submission only",
                        "ko": "온라인 제출만 가능"
                    },
                    "quote": "All applications must be submitted electronically through the NTNP online application portal.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 3, "quote": "Aim to assess complete application packages (including all necessary forms and original/certified documentation) within twelve weeks of receipt; and,", "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "目标 {n} 周内审完",
                        "en": "Target review within {n} weeks",
                        "ko": "{n}주 내 심사 목표"
                    },
                    "vars": {
                        "n": 12
                    },
                    "quote": "Aim to assess complete application packages (including all necessary forms and original/certified documentation) within twelve weeks of receipt; and,",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "noTimeGuarantee",
                    "quote": "This includes a Nominee Applicant’s work permit as there is no guarantee that an application will be finalized before the expiry of the work permit, and it is the responsibility of the applicant to maintain their status in Canada for the duration of the application process.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "The validation period is six (6) months from the date the nomination is issued.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:既往经验「one (1) year of full-time experience within the last 10 years」+ 持有效工签,是门槛不是步骤。雇主直招(Employer-Driven Stream)下三个类别:Entry Level/Semi-Skilled、Skilled Worker、NWT Express Entry,2026-03-09 起改 EOI 打分抽选(指南 PDF「EFFECTIVE March 9, 2026」)。2026 配额先 197、8 月加到 300(新闻 https://www.immigratenwt.ca/newsroom/northwest-territories-nominee-program-allocations-increased-300)。EOI 随时可递、无截止,但官网写下一轮抽选 2027 年初,2026 年内不会再发邀请 —— status 仍给 open(收 EOI),lead 可酌情。"""

PW_NT_ENTRY_LEVEL_SEMI_SKILLED = {
    "key": "nt-entry-level-semi-skilled", "province": "NT", "program": "PNP",
    "plainZh": "NT 初级 / 半技术岗位", "plainEn": "NT Entry Level", "plainKo": "NT 초급·반숙련 직종",
    "officialName": "Entry Level/Semi-Skilled Occupations",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.immigratenwt.ca/entry-levelsemi-skilled-occupations",
    "quote": "This category is for occupations that fall under National Occupation Classification (NOC) TEER 4 or 5.",
    "checked": "2026-10-12",
    "jobLinked": True,
    "steps": [
        {
            "step": "offer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先要有西北地区雇主的 offer,由雇主替你申请",
                        "en": "Need a job offer from an NWT employer who applies for you",
                        "ko": "NWT 고용주 오퍼 필요, 고용주가 대신 신청"
                    },
                    "quote": "To participate in this stream, you first need a job offer from an NWT employer and this NWT Employer needs to apply on your behalf.",
                    "url": "https://www.immigratenwt.ca/employer-driven-stream"
                }
            ]
        },
        {
            "step": "work",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "workMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "To be eligible, foreign nationals must have worked fulltime in the same position with the employer for twelve (12) months and have a valid work permit.",
                    "url": "https://www.immigratenwt.ca/entry-levelsemi-skilled-occupations"
                }
            ]
        },
        {
            "step": "employerRegister",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主在线上系统为每位申请人单独建号",
                        "en": "Employer creates a separate portal ID for each applicant",
                        "ko": "고용주가 신청자별로 포털 ID 생성"
                    },
                    "quote": "Employers register by creating a unique Employer User ID for each Nominee Applicant.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "noFee",
                    "quote": "Registration is free of charge.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主建号后由你本人填 EOI 问卷",
                        "en": "You fill in the EOI survey after the employer registers",
                        "ko": "고용주 등록 후 본인이 EOI 설문 작성"
                    },
                    "quote": "The EOI survey must be completed by the Nominee Applicant after the Employer registers in the NTNP online application portal found here: https://ntnp.immigratenwt.ca/.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "An EOI profile is valid for one year from the date of submission, after which it will expire.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "随时可递,不设截止",
                        "en": "Open year-round, no deadline",
                        "ko": "상시 제출 가능, 마감 없음"
                    },
                    "quote": "There is no limit to the number of applicants who can submit an Expression of Interest and there is no deadline.",
                    "url": "https://www.immigratenwt.ca/expression-interest"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "全年分几轮抽选,分高的雇主收邀请",
                        "en": "Several draws a year; top scores are invited",
                        "ko": "연중 여러 차례 추첨, 고득점자 초청"
                    },
                    "quote": "Employers whose Nominee Applicants have the highest-ranking scores will receive invitations to apply through draws held throughout the year.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "下一轮抽选在 {n} 年初",
                        "en": "Next draw in early {n}",
                        "ko": "다음 추첨은 {n}년 초"
                    },
                    "vars": {
                        "n": 2027
                    },
                    "quote": "The next Expression of Interest draw for the Northwest Territories Nominee Program will be held in early 2027.",
                    "url": "https://www.immigratenwt.ca/expression-interest"
                }
            ]
        },
        {
            "step": "apply",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 30
                    },
                    "quote": "Employers will have 30 calendar days to submit the full application, after which the EOI will expire.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "只收线上递交",
                        "en": "Online submission only",
                        "ko": "온라인 제출만 가능"
                    },
                    "quote": "All applications must be submitted electronically through the NTNP online application portal.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 3, "quote": "Aim to assess complete application packages (including all necessary forms and original/certified documentation) within twelve weeks of receipt; and,", "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "目标 {n} 周内审完",
                        "en": "Target review within {n} weeks",
                        "ko": "{n}주 내 심사 목표"
                    },
                    "vars": {
                        "n": 12
                    },
                    "quote": "Aim to assess complete application packages (including all necessary forms and original/certified documentation) within twelve weeks of receipt; and,",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "noTimeGuarantee",
                    "quote": "This includes a Nominee Applicant’s work permit as there is no guarantee that an application will be finalized before the expiry of the work permit, and it is the responsibility of the applicant to maintain their status in Canada for the duration of the application process.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "The validation period is six (6) months from the date the nomination is issued.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:「在这家雇主同岗全职满 12 个月」须在递申请前满(指南原句「immediately prior to submitting an application」),排在 offer 之后。雇主直招(Employer-Driven Stream)下三个类别:Entry Level/Semi-Skilled、Skilled Worker、NWT Express Entry,2026-03-09 起改 EOI 打分抽选(指南 PDF「EFFECTIVE March 9, 2026」)。2026 配额先 197、8 月加到 300(新闻 https://www.immigratenwt.ca/newsroom/northwest-territories-nominee-program-allocations-increased-300)。EOI 随时可递、无截止,但官网写下一轮抽选 2027 年初,2026 年内不会再发邀请 —— status 仍给 open(收 EOI),lead 可酌情。"""

PW_NT_EXPRESS_ENTRY = {
    "key": "nt-express-entry", "province": "NT", "program": "PNP",
    "plainZh": "NT 快速通道", "plainEn": "NT Express Entry", "plainKo": "NT 익스프레스 엔트리",
    "officialName": "NWT Express Entry",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.immigratenwt.ca/nwt-express-entry",
    "quote": "The NWT Express Entry category is for Skilled Workers who have a profile in the Express Entry System, a federal program with expedited application times for skilled individuals who want to work and live in the NWT.",
    "checked": "2026-10-12",
    "jobLinked": True,
    "steps": [
        {
            "step": "eeProfile",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先进联邦 EE 池、拿到档案号",
                        "en": "Be in the Express Entry pool with a profile number first",
                        "ko": "먼저 EE 풀에 들어가 프로필 번호 발급"
                    },
                    "quote": "Only candidates accepted into IRCC’s Express Entry pool, and have been issued an Express Entry Profile Number, are eligible to be nominated by the NTNP as an Express Entry candidate.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "offer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先要有西北地区雇主的 offer,由雇主替你申请",
                        "en": "Need a job offer from an NWT employer who applies for you",
                        "ko": "NWT 고용주 오퍼 필요, 고용주가 대신 신청"
                    },
                    "quote": "To participate in this stream, you first need a job offer from an NWT employer and this NWT Employer needs to apply on your behalf.",
                    "url": "https://www.immigratenwt.ca/employer-driven-stream"
                }
            ]
        },
        {
            "step": "employerRegister",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主在线上系统为每位申请人单独建号",
                        "en": "Employer creates a separate portal ID for each applicant",
                        "ko": "고용주가 신청자별로 포털 ID 생성"
                    },
                    "quote": "Employers register by creating a unique Employer User ID for each Nominee Applicant.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "noFee",
                    "quote": "Registration is free of charge.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主建号后由你本人填 EOI 问卷",
                        "en": "You fill in the EOI survey after the employer registers",
                        "ko": "고용주 등록 후 본인이 EOI 설문 작성"
                    },
                    "quote": "The EOI survey must be completed by the Nominee Applicant after the Employer registers in the NTNP online application portal found here: https://ntnp.immigratenwt.ca/.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "An EOI profile is valid for one year from the date of submission, after which it will expire.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "随时可递,不设截止",
                        "en": "Open year-round, no deadline",
                        "ko": "상시 제출 가능, 마감 없음"
                    },
                    "quote": "There is no limit to the number of applicants who can submit an Expression of Interest and there is no deadline.",
                    "url": "https://www.immigratenwt.ca/expression-interest"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "全年分几轮抽选,分高的雇主收邀请",
                        "en": "Several draws a year; top scores are invited",
                        "ko": "연중 여러 차례 추첨, 고득점자 초청"
                    },
                    "quote": "Employers whose Nominee Applicants have the highest-ranking scores will receive invitations to apply through draws held throughout the year.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "下一轮抽选在 {n} 年初",
                        "en": "Next draw in early {n}",
                        "ko": "다음 추첨은 {n}년 초"
                    },
                    "vars": {
                        "n": 2027
                    },
                    "quote": "The next Expression of Interest draw for the Northwest Territories Nominee Program will be held in early 2027.",
                    "url": "https://www.immigratenwt.ca/expression-interest"
                }
            ]
        },
        {
            "step": "apply",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteSubmitDays",
                    "vars": {
                        "n": 30
                    },
                    "quote": "Employers will have 30 calendar days to submit the full application, after which the EOI will expire.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "只收线上递交",
                        "en": "Online submission only",
                        "ko": "온라인 제출만 가능"
                    },
                    "quote": "All applications must be submitted electronically through the NTNP online application portal.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 3, "quote": "Aim to assess complete application packages (including all necessary forms and original/certified documentation) within twelve weeks of receipt; and,", "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "目标 {n} 周内审完",
                        "en": "Target review within {n} weeks",
                        "ko": "{n}주 내 심사 목표"
                    },
                    "vars": {
                        "n": 12
                    },
                    "quote": "Aim to assess complete application packages (including all necessary forms and original/certified documentation) within twelve weeks of receipt; and,",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                },
                {
                    "key": "noTimeGuarantee",
                    "quote": "This includes a Nominee Applicant’s work permit as there is no guarantee that an application will be finalized before the expiry of the work permit, and it is the responsibility of the applicant to maintain their status in Canada for the duration of the application process.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后在 EE 池加 {n} 分",
                        "en": "{n} points added in the Express Entry pool once approved",
                        "ko": "승인 시 EE 풀에서 {n}점 가산"
                    },
                    "vars": {
                        "n": 600
                    },
                    "quote": "When approved by the NWT Nominee Program, the candidate will receive 600 points within the Express Entry pool.",
                    "url": "https://www.immigratenwt.ca/nwt-express-entry"
                },
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "The validation period is six (6) months from the date the nomination is issued.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:在 EE 系统里接受提名的天数官网未写(查过 nwt-express-entry 页与 EDS 指南 PDF)。雇主直招(Employer-Driven Stream)下三个类别:Entry Level/Semi-Skilled、Skilled Worker、NWT Express Entry,2026-03-09 起改 EOI 打分抽选(指南 PDF「EFFECTIVE March 9, 2026」)。2026 配额先 197、8 月加到 300(新闻 https://www.immigratenwt.ca/newsroom/northwest-territories-nominee-program-allocations-increased-300)。EOI 随时可递、无截止,但官网写下一轮抽选 2027 年初,2026 年内不会再发邀请 —— status 仍给 open(收 EOI),lead 可酌情。"""

PW_NT_FRANCOPHONE = {
    "key": "nt-francophone", "province": "NT", "program": "PNP",
    "plainZh": "NT 法语", "plainEn": "NT Francophone", "plainKo": "NT 프랑스어권",
    "officialName": "Francophone Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.immigratenwt.ca/francophone-stream",
    "quote": "The Francophone Stream allows qualified foreign nationals, who speak both French and English and have a valid job offer from an NWT Employer, to apply to the Northwest Territories Nominee Program (NTNP).",
    "checked": "2026-10-12",
    "jobLinked": True,
    "steps": [
        {
            "step": "offer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "要有西北地区雇主 offer,法英双语",
                        "en": "NWT job offer; French and English required",
                        "ko": "NWT 오퍼, 불어·영어 모두 필요"
                    },
                    "quote": "The Francophone Stream allows qualified foreign nationals, who speak both French and English and have a valid job offer from an NWT Employer, to apply to the Northwest Territories Nominee Program (NTNP).",
                    "url": "https://www.immigratenwt.ca/francophone-stream"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "不走 EOI,先到先审",
                        "en": "No EOI; first come, first served",
                        "ko": "EOI 없이 선착순"
                    },
                    "quote": "The Francophone and Business streams do not operate under the Expression of Interest System and continue to evaluate applications on a first-come-first-serve basis.",
                    "url": "https://www.immigratenwt.ca/newsroom/northwest-territories-nominee-program-allocations-increased-300"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "只收线上递交",
                        "en": "Online submission only",
                        "ko": "온라인 제출만 가능"
                    },
                    "quote": "Applications must be submitted electronically through the NTNP online application portal.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/2025_-_11_-_ntnp_program_guidelines_-_francophone_stream-_final.pdf"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 3, "quote": "original/certified documentation) within twelve (12) weeks of receipt; and", "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/2025_-_11_-_ntnp_program_guidelines_-_francophone_stream-_final.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "目标 {n} 周内审完",
                        "en": "Target review within {n} weeks",
                        "ko": "{n}주 내 심사 목표"
                    },
                    "vars": {
                        "n": 12
                    },
                    "quote": "original/certified documentation) within twelve (12) weeks of receipt; and",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/2025_-_11_-_ntnp_program_guidelines_-_francophone_stream-_final.pdf"
                },
                {
                    "key": "noTimeGuarantee",
                    "quote": "This includes a Nominee Applicant’s work permit as there is no guarantee that an application will be finalized before the expiry of the work permit, and it is the responsibility of the applicant to maintain their status in Canada for the duration of the application process.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_employer_driven_stream_0.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "For the Francophone Stream, the validation period is six (6) months from the date the nomination approval was issued.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/2025_-_11_-_ntnp_program_guidelines_-_francophone_stream-_final.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:任务清单没点这条,但它是西北地区现行三条之一(EDS 指南「There are three program streams within the NTNP」),补上。口径冲突:法语通道网页顶部仍挂旧横幅「The Northwest Territories Nominee Program has closed its 2025 intake.」,指南 PDF(2025-11)写的也是 2025 收件期;但 2026-02-18 新闻写「Employer-Driven and Francophone streams will open on March 9, 2026」、2026-08-07 新闻写先到先审 —— 按最新新闻判 open。既往经验 1 年(近 10 年)或在西北地区满 6 个月,是门槛不是步骤。"""

PW_NT_BUSINESS = {
    "key": "nt-business", "province": "NT", "program": "PNP",
    "plainZh": "NT 商业移民", "plainEn": "NT Business", "plainKo": "NT 비즈니스 이민",
    "officialName": "Business Stream",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.immigratenwt.ca/business-stream",
    "quote": "The Business Stream is for foreign nationals who want to start a business in the NWT, purchase an existing business based here, or invest in and operate an existing business based here.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "register",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "appFee",
                    "vars": {
                        "n": 2800
                    },
                    "quote": "To begin the Business Stream process, a foreign national, or their authorized representative, must create an online account at https://ntnp.immigratenwt.ca/and pay a $2,800 fee.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "建号、交费、填自评问卷",
                        "en": "Create an account, pay and complete a self-assessment",
                        "ko": "계정 생성·수수료 납부·자가평가 작성"
                    },
                    "quote": "Initial Registration includes creating an account, paying the fee and completing a self-assessment Questionnaire.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                }
            ]
        },
        {
            "step": "visit",
            "dur": {"kind": "atleast", "unit": "day", "min": 4, "max": None, "quote": "This step includes a minimum four-day business trip to the community where the business is proposed and participating in at least one (1) face-to-face interview with the NTNP.", "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "自费到拟开业社区考察至少 {n} 天,再当面面试",
                        "en": "At least a {n}-day business trip, then a face-to-face interview",
                        "ko": "예정 지역 {n}일 이상 답사 후 대면 면접"
                    },
                    "vars": {
                        "n": 4
                    },
                    "quote": "This step includes a minimum four-day business trip to the community where the business is proposed and participating in at least one (1) face-to-face interview with the NTNP.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                }
            ]
        },
        {
            "step": "apply",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 6, "quote": "The application has six (6) months from the date of the letter of invitation to apply.", "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请后 {n} 个月内递正式申请和商业计划",
                        "en": "Submit the application and business plan within {n} months of the invitation",
                        "ko": "초청 후 {n}개월 내 정식 신청·사업계획서 제출"
                    },
                    "vars": {
                        "n": 6
                    },
                    "quote": "The application has six (6) months from the date of the letter of invitation to apply.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 3, "quote": "Endeavour to process complete applications within twelve (12) weeks of receipt of all required information and documentation; and", "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "目标 {n} 周内审完",
                        "en": "Target review within {n} weeks",
                        "ko": "{n}주 내 심사 목표"
                    },
                    "vars": {
                        "n": 12
                    },
                    "quote": "Endeavour to process complete applications within twelve (12) weeks of receipt of all required information and documentation; and",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                }
            ]
        },
        {
            "step": "agreement",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "{n} 天内签回商业履约协议",
                        "en": "Sign the Business Performance Agreement within {n} days",
                        "ko": "{n}일 내 사업이행협약 서명"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "Unless otherwise agreed upon with Nominee Program staff, an applicant has thirty (30) days to review, sign and return the Business Performance Agreement.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                }
            ]
        },
        {
            "step": "closedPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签约后拿支持信申请 {n} 年工签",
                        "en": "Support letter for a {n}-year work permit after signing",
                        "ko": "서명 후 {n}년 취업허가 지원서"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "Once the Business Performance Agreement is signed, the Department of Education, Culture and Employment will provide the applicant with a letter of support for a two (2) year temporary work permit.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                }
            ]
        },
        {
            "step": "runBusiness",
            "dur": {"kind": "atleast", "unit": "month", "min": 18, "max": None, "quote": "The applicant will be eligible for nomination during the nineteenth (19th) month after the Commencement Date as defined in the Business Performance Agreement, unless otherwise agreed by the GNWT.", "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "落地 {n} 天内交到达报告",
                        "en": "File the arrival report within {n} days of arrival",
                        "ko": "입국 {n}일 내 도착 보고"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "Upon arrival in Canada, an applicant has sixty (60) days from the date that appears as the “date signed” on the Government of Canada temporary work permit to complete the “Arrival Report Submission” in their online NTNP account and meet with Nominee Program staff for their arrival interview.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                },
                {
                    "key": "empMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "Open and operate their business for at least 12 months;",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "工签期间至少 {n}% 的时间住在西北地区",
                        "en": "Live in the NWT at least {n}% of the permit period",
                        "ko": "취업허가 기간 {n}% 이상 NWT 거주"
                    },
                    "vars": {
                        "n": 75
                    },
                    "quote": "They have been resident in the Northwest Territories for at least 75% of the time while on a temporary work permit.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                }
            ]
        },
        {
            "step": "pr",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "开业起第 {n} 个月可获提名",
                        "en": "Eligible for nomination in month {n} after the start date",
                        "ko": "개업일로부터 {n}개월째 지명 가능"
                    },
                    "vars": {
                        "n": 19
                    },
                    "quote": "The applicant will be eligible for nomination during the nineteenth (19th) month after the Commencement Date as defined in the Business Performance Agreement, unless otherwise agreed by the GNWT.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                },
                {
                    "key": "nominationValidMonths",
                    "vars": {
                        "n": 6
                    },
                    "quote": "The validation period for the nomination is six (6) months from the date the nomination approval was issued.",
                    "url": "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_program_guidelines_-_business_stream.pdf"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:先到先审,不走 EOI(2026-08-07 新闻原句同法语通道)。指南 PDF「EFFECTIVE JANUARY 1, 2026」,与 2023 版链接内容一致(同字节)。投资门槛:耶洛奈夫市内 20 万 / 市外 10 万加元,净资产 50 万 / 25 万(门槛,不是步骤)。【努纳武特】canada.ca「How the Provincial Nominee Program works」页原句「Nunavut and Quebec do not have provincial nominee programs」(https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees/works.html,curl 取到;put_pages 用 httpx 抓 canada.ca 三次断连,未入缓存,已记 blocked_urls.txt;gov.nu.ca 被 Cloudflare 拦,nu-imm 缓存为空)。不出努纳武特行。"""

PW_FED_CEC = {
    "key": "fed-cec", "province": "FED", "program": "EE",
    "plainZh": "联邦经验类", "plainEn": "Canadian Experience Class", "plainKo": "캐나다 경력 이민",
    "officialName": "Canadian Experience Class",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/canadian-experience-class.html",
    "quote": "The Canadian Experience Class is for skilled workers who have Canadian work experience and want to become permanent residents.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "workCanada",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "近 {w} 年内在加拿大 TEER 0-3 职业工作满 {n} 年(1560 小时)",
                        "en": "At least {n} year (1,560 hours) of TEER 0-3 work in Canada in the last {w} years",
                        "ko": "최근 {w}년 안에 캐나다 TEER 0-3 직종 {n}년(1,560시간) 근무"
                    },
                    "vars": {
                        "n": 1,
                        "w": 3
                    },
                    "quote": "total at least 1 year of work or 1,560 hours total (30 hours per week) in the 3 years before you apply",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/canadian-experience-class.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "须持合法工作身份在加拿大境内工作",
                        "en": "Work must be done in Canada with authorization to work",
                        "ko": "캐나다 안에서 합법적인 취업 신분으로 근무"
                    },
                    "quote": "be gained by working in Canada (including the province of Quebec) while authorized to work under temporary resident status",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/canadian-experience-class.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "全日制读书期间的工作(含 co-op)不算",
                        "en": "Work while studying full-time (including co-op) does not count",
                        "ko": "풀타임 재학 중 근무(코업 포함)는 인정 안 됨"
                    },
                    "quote": "you were studying full-time while you worked (co-op work terms also don’t count)",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/canadian-experience-class.html"
                }
            ]
        },
        {
            "step": "eeProfile",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "建档后 {n} 天内填完并提交 EE 档案",
                        "en": "Complete and submit the Express Entry profile within {n} days",
                        "ko": "{n}일 안에 EE 프로필을 작성해 제출"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You have 60 days to complete and submit your Express Entry profile.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "If you’re not invited to apply within 12 months of submitting your Express Entry profile, it will automatically expire.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html"
                }
            ]
        },
        {
            "step": "draw",
            "who": "federal",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "联邦全年分轮从池里按分数发邀请",
                        "en": "Invitations are issued from the pool in rounds throughout the year",
                        "ko": "연중 여러 차례 점수 순으로 초청장 발송"
                    },
                    "quote": "We invite candidates from the pool to apply in rounds throughout the year.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "进池不保证收到邀请",
                        "en": "Entering the pool does not guarantee an invitation",
                        "ko": "풀에 들어가도 초청이 보장되지 않음"
                    },
                    "quote": "Completing an online Express Entry profile or entering the pool doesn’t guarantee that we’ll invite you to apply for permanent residence.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "prSubmitDays",
                    "vars": {
                        "n": 60
                    },
                    "quote": "Your invitation to apply is valid for 60 days only",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html"
                }
            ]
        },
        {
            "step": "fedReview",
            "ptime": "cec",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录生物信息",
                        "en": "Give biometrics within {n} days of the letter",
                        "ko": "안내 편지를 받은 뒤 {n}일 안에 생체 정보 등록"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "You have 30 days from the date on the letter to give your biometrics.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/after-apply.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:EE 三类共用步骤:建档(60 天内交、12 个月不邀请自动过期)、全年分轮抽选、邀请后 60 天内递、生物信息 30 天。同时符合多类时联邦按 CEC → FSW → FST 顺序邀请(submit-profile 页「we’ll invite you to apply for the first program you’re eligible for」),本人不能选。申请费在页上是动态加载(Error loading fee),缓存里没有费用数字,未登。时长取 IRCC 处理时长工具的数据文件 flpt-en.json(2026-09-03 更新),最后一步「联邦审理永居」用 step new 登,durations 的 step 也写 new。"""

PW_FED_FSW = {
    "key": "fed-fsw", "province": "FED", "program": "EE",
    "plainZh": "联邦技术移民", "plainEn": "Federal Skilled Worker", "plainKo": "연방 숙련 근로자",
    "officialName": "Federal Skilled Worker Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/federal-skilled-workers.html",
    "quote": "The Federal Skilled Worker Program is for skilled workers who have foreign work experience and want to become permanent residents.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eeProfile",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "选择因素满分 100,拿到 {n} 分才够格",
                        "en": "Score at least {n} of 100 on the selection factors",
                        "ko": "선발 요소 100점 중 {n}점 이상"
                    },
                    "vars": {
                        "n": 67
                    },
                    "quote": "If you score 67 points or higher",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/federal-skilled-workers.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "建档后 {n} 天内填完并提交 EE 档案",
                        "en": "Complete and submit the Express Entry profile within {n} days",
                        "ko": "{n}일 안에 EE 프로필을 작성해 제출"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You have 60 days to complete and submit your Express Entry profile.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "If you’re not invited to apply within 12 months of submitting your Express Entry profile, it will automatically expire.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html"
                }
            ]
        },
        {
            "step": "draw",
            "who": "federal",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "联邦全年分轮从池里按分数发邀请",
                        "en": "Invitations are issued from the pool in rounds throughout the year",
                        "ko": "연중 여러 차례 점수 순으로 초청장 발송"
                    },
                    "quote": "We invite candidates from the pool to apply in rounds throughout the year.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "进池不保证收到邀请",
                        "en": "Entering the pool does not guarantee an invitation",
                        "ko": "풀에 들어가도 초청이 보장되지 않음"
                    },
                    "quote": "Completing an online Express Entry profile or entering the pool doesn’t guarantee that we’ll invite you to apply for permanent residence.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "prSubmitDays",
                    "vars": {
                        "n": 60
                    },
                    "quote": "Your invitation to apply is valid for 60 days only",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html"
                }
            ]
        },
        {
            "step": "fedReview",
            "ptime": "fsw",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录生物信息",
                        "en": "Give biometrics within {n} days of the letter",
                        "ko": "안내 편지를 받은 뒤 {n}일 안에 생체 정보 등록"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "You have 30 days from the date on the letter to give your biometrics.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/after-apply.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:EE 三类共用步骤:建档(60 天内交、12 个月不邀请自动过期)、全年分轮抽选、邀请后 60 天内递、生物信息 30 天。同时符合多类时联邦按 CEC → FSW → FST 顺序邀请(submit-profile 页「we’ll invite you to apply for the first program you’re eligible for」),本人不能选。申请费在页上是动态加载(Error loading fee),缓存里没有费用数字,未登。时长取 IRCC 处理时长工具的数据文件 flpt-en.json(2026-09-03 更新),最后一步「联邦审理永居」用 step new 登,durations 的 step 也写 new。 FSW 的 offer 不是必须,只加选择因素分(works 页「Not required, but you can get selection criteria points for having a valid job offer.」)。"""

PW_FED_FST = {
    "key": "fed-fst", "province": "FED", "program": "EE",
    "plainZh": "联邦技工移民", "plainEn": "Federal Skilled Trades", "plainKo": "연방 숙련 기술직",
    "officialName": "Federal Skilled Trades Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/federal-skilled-trades.html",
    "quote": "The Federal Skilled Trades Program is for skilled workers who want to become permanent residents based on being qualified in a skilled trade.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "jobOffer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "要 {n} 年以上全职 offer,或加拿大省 / 联邦颁发的该工种资格证",
                        "en": "A full-time job offer of at least {n} year, or a Canadian certificate of qualification in the trade",
                        "ko": "{n}년 이상 풀타임 잡 오퍼 또는 캐나다 해당 직종 자격증"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "a valid job offer of full-time employment for a total period of at least 1 year, or a certificate of qualification in the above skilled trade issued by a Canadian provincial, territorial or federal authority",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/works.html"
                }
            ]
        },
        {
            "step": "eeProfile",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "建档后 {n} 天内填完并提交 EE 档案",
                        "en": "Complete and submit the Express Entry profile within {n} days",
                        "ko": "{n}일 안에 EE 프로필을 작성해 제출"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You have 60 days to complete and submit your Express Entry profile.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "If you’re not invited to apply within 12 months of submitting your Express Entry profile, it will automatically expire.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html"
                }
            ]
        },
        {
            "step": "draw",
            "who": "federal",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "联邦全年分轮从池里按分数发邀请",
                        "en": "Invitations are issued from the pool in rounds throughout the year",
                        "ko": "연중 여러 차례 점수 순으로 초청장 발송"
                    },
                    "quote": "We invite candidates from the pool to apply in rounds throughout the year.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "进池不保证收到邀请",
                        "en": "Entering the pool does not guarantee an invitation",
                        "ko": "풀에 들어가도 초청이 보장되지 않음"
                    },
                    "quote": "Completing an online Express Entry profile or entering the pool doesn’t guarantee that we’ll invite you to apply for permanent residence.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "prSubmitDays",
                    "vars": {
                        "n": 60
                    },
                    "quote": "Your invitation to apply is valid for 60 days only",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html"
                }
            ]
        },
        {
            "step": "fedReview",
            "dur": {"kind": "about", "unit": "month", "min": 92, "max": 92, "quote": "Skilled Trades (EE) 62 84 92", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/express-entry-year-end-report-2024.html"},
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {"key": "note", "text": {"zh": "IRCC 服务标准 6 个月(180 天),实际达标率 0%", "en": "IRCC service standard: 6 months (180 days); actual on-time rate: 0%", "ko": "IRCC 서비스 기준 6개월(180일), 실제 달성률 0%"}, "quote": "Federal Skilled Trades Program (via Express Entry) 180 days ( not including the processing that the province or territory does) 0%", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/service-declaration/service-standards.html"},
                {"key": "note", "text": {"zh": "2024 年审完的申请,80% 用了 92 个月(2023 年 84 个月,2022 年 62 个月)", "en": "Applications finalized in 2024: 80% took 92 months (84 in 2023, 62 in 2022)", "ko": "2024년 처리 완료 신청의 80%가 92개월 소요(2023년 84개월, 2022년 62개월)"}, "quote": "Skilled Trades (EE) 62 84 92", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/express-entry-year-end-report-2024.html"},
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录生物信息",
                        "en": "Give biometrics within {n} days of the letter",
                        "ko": "안내 편지를 받은 뒤 {n}일 안에 생체 정보 등록"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "You have 30 days from the date on the letter to give your biometrics.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/after-apply.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:EE 三类共用步骤:建档(60 天内交、12 个月不邀请自动过期)、全年分轮抽选、邀请后 60 天内递、生物信息 30 天。同时符合多类时联邦按 CEC → FSW → FST 顺序邀请(submit-profile 页「we’ll invite you to apply for the first program you’re eligible for」),本人不能选。申请费在页上是动态加载(Error loading fee),缓存里没有费用数字,未登。时长取 IRCC 处理时长工具的数据文件 flpt-en.json(2026-09-03 更新),最后一步「联邦审理永居」用 step new 登,durations 的 step 也写 new。 FST 要「offer 或资格证」二选一,needsOffer 记 false,offer 那步的事实写了二选一。IRCC 处理时长数据 flpt-en.json 只有 cec / fsw 两个 EE 键,没有 FST;data-ptime-en.json(临时居民类)也没有 —— FST 时长未找到。"""

PW_FED_AIP = {
    "key": "fed-aip", "province": "FED", "program": "AIP",
    "plainZh": "大西洋移民", "plainEn": "Atlantic Immigration Program", "plainKo": "대서양 이민 프로그램",
    "officialName": "Atlantic Immigration Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html",
    "quote": "The Atlantic Immigration Program is a pathway to permanent residence for skilled foreign workers and international graduates from a Canadian institution who want to work and live in 1 of Canada’s 4 Atlantic provinces—New Brunswick, Nova Scotia, Prince Edward Island or Newfoundland and Labrador",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "jobOffer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "offer 必须来自大西洋省份的指定雇主",
                        "en": "The job offer must come from a designated employer in Atlantic Canada",
                        "ko": "대서양 주의 지정 고용주에게서 잡 오퍼를 받아야 함"
                    },
                    "quote": "You must receive a job offer from a designated employer in Atlantic Canada to participate in the program.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "全职,每周至少 {n} 小时",
                        "en": "Full-time, at least {n} hours a week",
                        "ko": "주 {n}시간 이상 풀타임"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "full-time (at least 30 hours a week)",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate/job-offer.html"
                }
            ]
        },
        {
            "step": "settle",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "找本省安置服务机构做需求评估,拿安置计划",
                        "en": "Get a needs assessment and settlement plan from a settlement service provider",
                        "ko": "정착 지원 기관에서 필요 평가를 받고 정착 계획서 받기"
                    },
                    "quote": "These organizations can provide your candidate a needs and assets assessment, and then their settlement plan.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/hire-immigrant/job-offer.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "没有安置计划省里不背书",
                        "en": "The settlement plan is needed for endorsement",
                        "ko": "정착 계획서가 있어야 주 추천 가능"
                    },
                    "quote": "You’ll need the plan to get endorsed.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/hire-immigrant/job-offer.html"
                }
            ]
        },
        {
            "step": "endorse",
            "dur": {"kind": "unpublished", "unit": None, "min": None, "max": None, "quote": "OIM does not currently have standard processing times for the AIP.", "url": "https://www.gov.nl.ca/immigration/faqs/atlantic-immigration-program-candidate-faqs"},
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "省里背书 offer 后才能递永居",
                        "en": "The province must endorse the job offer before you can apply for PR",
                        "ko": "주 정부가 잡 오퍼를 추천해야 영주권 신청 가능"
                    },
                    "quote": "The province must endorse your job offer before the candidate can apply for permanent residence.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/hire-immigrant/endorsement.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "省里批准后寄背书证书给申请人",
                        "en": "The province sends a Certificate of Endorsement to the candidate",
                        "ko": "주 정부가 신청자에게 추천 증명서를 발송"
                    },
                    "quote": "If the province endorses the job offer, they’ll send a Certificate of Endorsement to the candidate.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/hire-immigrant/endorsement.html"
                }
            ]
        },
        {
            "step": "closedPermit",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 2, "quote": "Initial work permits from outside Canada: All programs (excluding International Experience Canada) Footnote * 60 days", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/service-declaration/service-standards.html"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "可选:工签有效 {n} 年,只能为发 offer 的雇主工作",
                        "en": "Optional: the permit is valid for {n} years and only for the employer who offered the job",
                        "ko": "선택: 워크퍼밋 유효기간 {n}년, 오퍼한 고용주에게서만 근무"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "This work permit is only for the Atlantic Immigration Program is valid for 2 years only allows you to work for the employer who offered you the job",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate/temporary-work-permit.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到背书证书后递永居",
                        "en": "Apply for PR once you have the endorsement certificate",
                        "ko": "추천 증명서를 받은 뒤 영주권 신청"
                    },
                    "quote": "Once the candidate gets their endorsement certificate, they can apply for permanent residence",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/hire-immigrant/endorsement.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "在 PR Portal 网上递",
                        "en": "Apply online through the PR Portal",
                        "ko": "PR 포털에서 온라인 신청"
                    },
                    "quote": "You must apply online using the PR Portal.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate/permanent-residence.html"
                }
            ]
        },
        {
            "step": "fedReview",
            "ptime": "aip",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录生物信息",
                        "en": "Give biometrics within {n} days of the letter",
                        "ko": "안내 편지를 받은 뒤 {n}일 안에 생체 정보 등록"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "You have 30 days from the date on the letter to get your biometrics done.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate/after-apply.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:「申请永居」页的费用、处理时长都是动态加载(Error loading fee / We couldn’t load the data),缓存里没有数字;时长改取 flpt-en.json 的 aip 键。closedPermit 一步是可选(只在要先来加拿大工作时才申请,主页原句要省里的 referral letter)。"""

PW_FED_RCIP = {
    "key": "fed-rcip", "province": "FED", "program": "RCIP",
    "plainZh": "乡村社区移民试点", "plainEn": "Rural Community Immigration Pilot", "plainKo": "농촌 커뮤니티 이민 시범",
    "officialName": "Rural Community Immigration Pilot",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration.html",
    "quote": "The Rural Community Immigration Pilot offers permanent residence (PR) to skilled workers who want to work and settle in rural and more remote communities.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "jobOffer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "递永居前必须先有指定雇主的 offer",
                        "en": "You need a job offer from a designated employer first",
                        "ko": "먼저 지정 고용주의 잡 오퍼가 필요"
                    },
                    "quote": "Before you apply for permanent residence through this pilot, you need a job offer.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "只有社区指定的雇主能发 offer",
                        "en": "Only employers designated by the community can make offers",
                        "ko": "커뮤니티가 지정한 고용주만 오퍼 가능"
                    },
                    "quote": "Each community will designate certain employers to make job offers.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html"
                }
            ]
        },
        {
            "step": "community",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主替你向社区递推荐申请",
                        "en": "The employer sends the recommendation application to the community",
                        "ko": "고용주가 커뮤니티에 추천 신청서를 제출"
                    },
                    "quote": "Once you have a valid job offer from a designated employer, they will send your community recommendation application directly to the community to review.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "社区核对岗位属优先行业或职业、offer 真实",
                        "en": "The community checks the job is in a priority sector or occupation and the offer is genuine",
                        "ko": "커뮤니티가 우선 업종·직종 여부와 오퍼의 진위를 확인"
                    },
                    "quote": "Communities will check to make sure your job is in a priority sector or occupation and the offer is real",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html"
                }
            ]
        },
        {
            "step": "closedPermit",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 2, "quote": "Initial work permits from outside Canada: All programs (excluding International Experience Canada) Footnote * 60 days", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/service-declaration/service-standards.html"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "可选:工签有效 {n} 年,只能为发 offer 的雇主工作",
                        "en": "Optional: the permit is valid for {n} years and only for the employer who offered the job",
                        "ko": "선택: 워크퍼밋 유효기간 {n}년, 오퍼한 고용주에게서만 근무"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "is only for the Rural Community Immigration Pilot is valid for 2 years only lets you work for the employer who offered you the job",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/work-permit.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到社区推荐后网上递永居",
                        "en": "Apply online for PR after receiving the community recommendation",
                        "ko": "커뮤니티 추천을 받은 뒤 온라인으로 영주권 신청"
                    },
                    "quote": "After you’ve received a community recommendation, you can apply online for permanent residence.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/permanent-residence.html"
                }
            ]
        },
        {
            "step": "fedReview",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录生物信息",
                        "en": "Give biometrics within {n} days of the letter",
                        "ko": "안내 편지를 받은 뒤 {n}일 안에 생체 정보 등록"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "You have 30 days from the date on the letter to get your biometrics done.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/after-apply.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:官网写 14 个参与社区(主页「We chose 14 communities」)。处理时长:flpt-en.json 没有本试点的键,永居页费用动态加载 —— 时长与费用均未找到。推荐证书有效期 IRCC 页没写(只在各社区站上,本次未查)。community 一步由雇主递(who=employer),社区批了把推荐证书寄给申请人(hire/submit-recommendation 页)。"""

PW_FED_FCIP = {
    "key": "fed-fcip", "province": "FED", "program": "FCIP",
    "plainZh": "法语社区移民试点", "plainEn": "Francophone Community Immigration Pilot", "plainKo": "프랑스어권 커뮤니티 이민 시범",
    "officialName": "Francophone Community Immigration Pilot",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration.html",
    "quote": "The Francophone Community Immigration Pilot offers permanent residence (PR) to skilled workers who want to work and settle in rural remote Francophone-minority communities.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "jobOffer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "递永居前必须先有指定雇主的 offer",
                        "en": "You need a job offer from a designated employer first",
                        "ko": "먼저 지정 고용주의 잡 오퍼가 필요"
                    },
                    "quote": "Before you apply for permanent residence through this pilot, you need a job offer.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/job-offer.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "只有社区指定的雇主能发 offer",
                        "en": "Only employers designated by the community can make offers",
                        "ko": "커뮤니티가 지정한 고용주만 오퍼 가능"
                    },
                    "quote": "Each community will designate certain employers to make job offers.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/job-offer.html"
                }
            ]
        },
        {
            "step": "community",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "雇主替你向社区递推荐申请",
                        "en": "The employer sends the recommendation application to the community",
                        "ko": "고용주가 커뮤니티에 추천 신청서를 제출"
                    },
                    "quote": "Once you have a valid job offer from a designated employer, they will send your community recommendation application directly to the community to review.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/job-offer.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "社区核对岗位属优先行业或职业、offer 真实",
                        "en": "The community checks the job is in a priority sector or occupation and the offer is genuine",
                        "ko": "커뮤니티가 우선 업종·직종 여부와 오퍼의 진위를 확인"
                    },
                    "quote": "Communities will check to make sure your job is in a priority sector or occupation and the offer is real",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/job-offer.html"
                }
            ]
        },
        {
            "step": "closedPermit",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 2, "quote": "Initial work permits from outside Canada: All programs (excluding International Experience Canada) Footnote * 60 days", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/service-declaration/service-standards.html"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "可选:工签有效 {n} 年,只能为发 offer 的雇主工作",
                        "en": "Optional: the permit is valid for {n} years and only for the employer who offered the job",
                        "ko": "선택: 워크퍼밋 유효기간 {n}년, 오퍼한 고용주에게서만 근무"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "is only for the Francophone Community Immigration Pilot is valid for 2 years only lets you work for the employer who offered you the job",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/work-permit.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到社区推荐后网上递永居",
                        "en": "Apply online for PR after receiving the community recommendation",
                        "ko": "커뮤니티 추천을 받은 뒤 온라인으로 영주권 신청"
                    },
                    "quote": "After you’ve received a community recommendation, you can apply online for permanent residence.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/permanent-residence.html"
                }
            ]
        },
        {
            "step": "fedReview",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录生物信息",
                        "en": "Give biometrics within {n} days of the letter",
                        "ko": "안내 편지를 받은 뒤 {n}일 안에 생체 정보 등록"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "You have 30 days from the date on the letter to get your biometrics done.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/after-apply.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:官网写 6 个参与社区(主页「We chose 6 communities」)。处理时长:flpt-en.json 没有本试点的键,永居页费用动态加载 —— 时长与费用均未找到。推荐证书有效期 IRCC 页没写(只在各社区站上,本次未查)。community 一步由雇主递(who=employer),社区批了把推荐证书寄给申请人(hire/submit-recommendation 页)。"""

PW_FED_HOME_CARE_WORKER = {
    "key": "fed-home-care-worker", "province": "FED", "program": "CAREGIVER",
    "plainZh": "护工移民试点", "plainEn": "Home Care Worker Pilots", "plainKo": "가정 돌봄 근로자 이민 시범",
    "officialName": "Home Care Worker Immigration pilots",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "closed",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/caregivers/home-care-worker-immigration-pilots.html",
    "quote": "help skilled workers who have a job offer in the field immigrate to Canada permanently.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "jobOffer",
            "who": "employer",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "要一份家庭护理的全职 offer",
                        "en": "A full-time job offer in home care",
                        "ko": "가정 돌봄 분야 풀타임 잡 오퍼"
                    },
                    "quote": "a full-time job offer in home care",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/caregivers/home-care-worker-immigration-pilots.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "目前不收新申请,先处理积压",
                        "en": "Closed to new applications while existing ones are processed",
                        "ko": "기존 신청 처리를 위해 신규 접수 중단"
                    },
                    "quote": "The pilots are closed while we focus on processing existing applications.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/caregivers/home-care-worker-immigration-pilots/child-care-home-support.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 closed 原句:The pilots are closed while we focus on processing existing applications.(https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/caregivers/home-care-worker-immigration-pilots/child-care-home-support.html)
判读:两个试点(Child Care / Home Support)各两条流(Workers in Canada / Applicants not working in Canada)全是 Closed(页面 2026-04-23)。quote 是主页句子的后半(前半「The Home Care Worker Immigration pilots for Child Care and Home Support」被链接拆开,归一后有多余空格,只截后半)。flpt-en.json 的 caregiver 键是护工类统称,不分新试点与旧项目,77 个月仅供参考。"""

PW_FED_SPOUSE_INLAND = {
    "key": "fed-spouse-inland", "province": "FED", "program": "FAMILY",
    "plainZh": "境内配偶担保", "plainEn": "Spouse sponsorship (inside Canada)", "plainKo": "캐나다 내 배우자 초청",
    "officialName": "Spouse or Common-Law Partner in Canada class",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children.html",
    "quote": "This is a program to sponsor your spouse, common-law partner, conjugal partner or dependent child to become a permanent resident of Canada.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "sponsorEligible",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保人年满 {n} 岁,是公民、永久居民或注册印第安人,住在加拿大",
                        "en": "Sponsor is {n} or older, a citizen, permanent resident or registered Indian, and lives in Canada",
                        "ko": "보증인은 {n}세 이상의 시민권자·영주권자·등록 원주민이며 캐나다에 거주"
                    },
                    "vars": {
                        "n": 18
                    },
                    "quote": "are at least 18 years old are a Canadian citizen, a permanent resident of Canada, or a person registered in Canada under the Canadian Indian Act live in Canada",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "住在境外的永久居民不能担保",
                        "en": "Permanent residents living outside Canada cannot sponsor",
                        "ko": "캐나다 밖에 사는 영주권자는 보증할 수 없음"
                    },
                    "quote": "If you’re a permanent resident living outside Canada, you can’t sponsor.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "多数情况下没有收入要求",
                        "en": "In most cases there is no income requirement",
                        "ko": "대부분 소득 요건 없음"
                    },
                    "quote": "In most cases, there isn’t an income requirement to sponsor your spouse, partner or dependent child.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "自己靠配偶担保拿永居未满 {n} 年的,可能不能担保",
                        "en": "You may be ineligible if you became a permanent resident through spousal sponsorship less than {n} years ago",
                        "ko": "배우자 초청으로 영주권을 받은 지 {n}년 미만이면 보증이 불가할 수 있음"
                    },
                    "vars": {
                        "n": 5
                    },
                    "quote": "you were sponsored by a spouse or partner and you became a permanent resident less than 5 years ago",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                }
            ]
        },
        {
            "step": "undertaking",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签担保承诺:对方拿到永居起负责其生活 {n} 年(魁省另算)",
                        "en": "Sign an undertaking to support them for {n} years from the day they become a permanent resident (Quebec differs)",
                        "ko": "영주권 취득일부터 {n}년간 부양하겠다는 서약서 서명(퀘벡 별도)"
                    },
                    "vars": {
                        "n": 3
                    },
                    "quote": "Spouse, common-law partner or conjugal partner 3 years",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/undertaking.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保申请与永居申请由被担保人一起在永居门户网上递交",
                        "en": "The sponsored person submits the sponsorship and PR applications together in the PR Portal",
                        "ko": "피보증인이 보증 신청서와 영주권 신청서를 영주권 포털에서 함께 제출"
                    },
                    "quote": "The principal applicant (the person you’re sponsoring) will submit both applications together online using the Permanent Residence (PR) Portal.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/apply.html"
                }
            ]
        },
        {
            "step": "biometrics",
            "dur": {"kind": "upto", "unit": "day", "min": 0, "max": 30, "quote": "They have 30 days from the date of the letter to go to a biometric collection site .", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录指纹,另按通知体检",
                        "en": "Give biometrics within {n} days of the letter, and do the medical exam when asked",
                        "ko": "통지서 받은 후 {n}일 안에 생체정보 등록, 안내에 따라 신체검사"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "They have 30 days from the date of the letter to go to a biometric collection site .",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        },
        {
            "step": "review",
            "ptime": "spousal-canada-roc",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先审担保人,通过后再审被担保人",
                        "en": "The sponsor is assessed first, then the person being sponsored",
                        "ko": "보증인을 먼저 심사한 뒤 피보증인을 심사"
                    },
                    "quote": "If we approve you as a sponsor We’ll send you a letter or email to tell you that you’ve been approved.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "等审期间可申开放工签:担保人已收到受理确认信,且两人同住",
                        "en": "While waiting, they can apply for an open work permit once the sponsor has the AOR and they live together",
                        "ko": "대기 중 보증인이 접수확인서를 받고 동거 중이면 오픈 워크퍼밋 신청 가능"
                    },
                    "quote": "they can apply for an OWP if you (the sponsor) received an AOR that confirms that their permanent residence application is in progress they’re living with you",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        },
        {
            "step": "prApply",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批后在永居门户网上确认永居身份",
                        "en": "Once approved, confirm PR status online in the PR Portal",
                        "ko": "승인 후 영주권 포털에서 온라인으로 영주권 확인"
                    },
                    "quote": "We’ll contact your family members with instructions on how to confirm their permanent residence status online through the Permanent Residence Portal.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "境内类被拒不能上诉",
                        "en": "No appeal if refused under the in-Canada class",
                        "ko": "캐나다 내 클래스로 거절되면 항소 불가"
                    },
                    "quote": "You can’t appeal our decision if you’re sponsoring them under the spouse or common-law partner in Canada class .",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:IRCC 现在把境内 / 境外配偶并成一个页面(Sponsor your spouse, partner or child),两类名字只在开放工签页出现:「Spouse or Common-Law Partner in Canada class (SCLPC)」「Family Class as a spouse, common-law or conjugal partner」;步骤页不分两类,所以前五步两条共用,差别在等待期能做什么、最后怎么落地、处理时长。who 写 "sponsor" 的步骤是担保人做的(步骤词表里没有担保人,employer 不合适),建议新增 who=sponsor。费用:canada.ca 页面费用是 JS 动态加载(缓存里只有「Error loading fee」),没登。时长原句取自 IRCC 处理时长工具的数据 json(flpt-en.json,2026-09-03 更新),quote 是 json 里那一格原文,ptimeKey 可对 data/raw/ircc/ptime.json。 境内类官方名逐字出自开放工签页 SCLPC 那句;配偶「住在加拿大」不是这类的原句条件,没登。"""

PW_FED_SPOUSE_OUTLAND = {
    "key": "fed-spouse-outland", "province": "FED", "program": "FAMILY",
    "plainZh": "境外配偶担保", "plainEn": "Spouse sponsorship (outside Canada)", "plainKo": "해외 배우자 초청",
    "officialName": "Family Class",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children.html",
    "quote": "This is a program to sponsor your spouse, common-law partner, conjugal partner or dependent child to become a permanent resident of Canada.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "sponsorEligible",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保人年满 {n} 岁,是公民、永久居民或注册印第安人,住在加拿大",
                        "en": "Sponsor is {n} or older, a citizen, permanent resident or registered Indian, and lives in Canada",
                        "ko": "보증인은 {n}세 이상의 시민권자·영주권자·등록 원주민이며 캐나다에 거주"
                    },
                    "vars": {
                        "n": 18
                    },
                    "quote": "are at least 18 years old are a Canadian citizen, a permanent resident of Canada, or a person registered in Canada under the Canadian Indian Act live in Canada",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "住在境外的永久居民不能担保",
                        "en": "Permanent residents living outside Canada cannot sponsor",
                        "ko": "캐나다 밖에 사는 영주권자는 보증할 수 없음"
                    },
                    "quote": "If you’re a permanent resident living outside Canada, you can’t sponsor.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "多数情况下没有收入要求",
                        "en": "In most cases there is no income requirement",
                        "ko": "대부분 소득 요건 없음"
                    },
                    "quote": "In most cases, there isn’t an income requirement to sponsor your spouse, partner or dependent child.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "自己靠配偶担保拿永居未满 {n} 年的,可能不能担保",
                        "en": "You may be ineligible if you became a permanent resident through spousal sponsorship less than {n} years ago",
                        "ko": "배우자 초청으로 영주권을 받은 지 {n}년 미만이면 보증이 불가할 수 있음"
                    },
                    "vars": {
                        "n": 5
                    },
                    "quote": "you were sponsored by a spouse or partner and you became a permanent resident less than 5 years ago",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                }
            ]
        },
        {
            "step": "undertaking",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签担保承诺:对方拿到永居起负责其生活 {n} 年(魁省另算)",
                        "en": "Sign an undertaking to support them for {n} years from the day they become a permanent resident (Quebec differs)",
                        "ko": "영주권 취득일부터 {n}년간 부양하겠다는 서약서 서명(퀘벡 별도)"
                    },
                    "vars": {
                        "n": 3
                    },
                    "quote": "Spouse, common-law partner or conjugal partner 3 years",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/undertaking.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保申请与永居申请由被担保人一起在永居门户网上递交",
                        "en": "The sponsored person submits the sponsorship and PR applications together in the PR Portal",
                        "ko": "피보증인이 보증 신청서와 영주권 신청서를 영주권 포털에서 함께 제출"
                    },
                    "quote": "The principal applicant (the person you’re sponsoring) will submit both applications together online using the Permanent Residence (PR) Portal.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/apply.html"
                }
            ]
        },
        {
            "step": "biometrics",
            "dur": {"kind": "upto", "unit": "day", "min": 0, "max": 30, "quote": "They have 30 days from the date of the letter to go to a biometric collection site .", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录指纹,另按通知体检",
                        "en": "Give biometrics within {n} days of the letter, and do the medical exam when asked",
                        "ko": "통지서 받은 후 {n}일 안에 생체정보 등록, 안내에 따라 신체검사"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "They have 30 days from the date of the letter to go to a biometric collection site .",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        },
        {
            "step": "review",
            "ptime": "spousal-abroad-roc",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先审担保人,通过后再审被担保人",
                        "en": "The sponsor is assessed first, then the person being sponsored",
                        "ko": "보증인을 먼저 심사한 뒤 피보증인을 심사"
                    },
                    "quote": "If we approve you as a sponsor We’ll send you a letter or email to tell you that you’ve been approved.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "等审期间可申访客签证,担保人有受理确认信可加快",
                        "en": "While waiting, they can apply for a visitor visa, processed faster once the sponsor has the AOR",
                        "ko": "대기 중 방문비자 신청 가능, 보증인이 접수확인서가 있으면 빠른 처리"
                    },
                    "quote": "Your spouse or partner may be eligible for faster processing for a visitor visa if you (the sponsor) received an acknowledgement of receipt (AOR) that confirms their permanent residence application is in progress.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        },
        {
            "step": "prApply",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿永居确认函(COPR)和永居签证,在到期前入境落地",
                        "en": "Receive the COPR (and PR visa if needed) and land in Canada before they expire",
                        "ko": "영주권 확인서(COPR)와 영주권 비자를 받고 만료 전에 입국"
                    },
                    "quote": "Your family members will have to show their COPR and permanent resident visa (if we gave them one) to the border services officer at a Canadian port of entry before their documents expire .",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:IRCC 现在把境内 / 境外配偶并成一个页面(Sponsor your spouse, partner or child),两类名字只在开放工签页出现:「Spouse or Common-Law Partner in Canada class (SCLPC)」「Family Class as a spouse, common-law or conjugal partner」;步骤页不分两类,所以前五步两条共用,差别在等待期能做什么、最后怎么落地、处理时长。who 写 "sponsor" 的步骤是担保人做的(步骤词表里没有担保人,employer 不合适),建议新增 who=sponsor。费用:canada.ca 页面费用是 JS 动态加载(缓存里只有「Error loading fee」),没登。时长原句取自 IRCC 处理时长工具的数据 json(flpt-en.json,2026-09-03 更新),quote 是 json 里那一格原文,ptimeKey 可对 data/raw/ircc/ptime.json。 境外类官方名逐字只有「Family Class」(开放工签页「the Family Class as a spouse, common-law or conjugal partner」)。"""

PW_FED_DEPENDENT_CHILD = {
    "key": "fed-dependent-child", "province": "FED", "program": "FAMILY",
    "plainZh": "担保受抚养子女", "plainEn": "Dependent child sponsorship", "plainKo": "부양 자녀 초청",
    "officialName": "Sponsor your spouse, partner or child",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children.html",
    "quote": "This is a program to sponsor your spouse, common-law partner, conjugal partner or dependent child to become a permanent resident of Canada.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "sponsorEligible",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保人年满 {n} 岁,是公民、永久居民或注册印第安人,住在加拿大",
                        "en": "Sponsor is {n} or older, a citizen, permanent resident or registered Indian, and lives in Canada",
                        "ko": "보증인은 {n}세 이상의 시민권자·영주권자·등록 원주민이며 캐나다에 거주"
                    },
                    "vars": {
                        "n": 18
                    },
                    "quote": "are at least 18 years old are a Canadian citizen, a permanent resident of Canada, or a person registered in Canada under the Canadian Indian Act live in Canada",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "住在境外的永久居民不能担保",
                        "en": "Permanent residents living outside Canada cannot sponsor",
                        "ko": "캐나다 밖에 사는 영주권자는 보증할 수 없음"
                    },
                    "quote": "If you’re a permanent resident living outside Canada, you can’t sponsor.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "多数情况下没有收入要求",
                        "en": "In most cases there is no income requirement",
                        "ko": "대부분 소득 요건 없음"
                    },
                    "quote": "In most cases, there isn’t an income requirement to sponsor your spouse, partner or dependent child.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "孩子未满 {n} 岁且未婚(超龄须因身心原因不能自立)",
                        "en": "The child is under {n} and has no spouse or partner (older only if unable to self-support due to a condition)",
                        "ko": "자녀는 {n}세 미만 미혼(초과 시 신체·정신 사유로 자립 불가해야 함)"
                    },
                    "vars": {
                        "n": 22
                    },
                    "quote": "they’re under 22 years old and they don’t have a spouse or common-law partner",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/who-you-can-sponsor.html"
                }
            ]
        },
        {
            "step": "undertaking",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签担保承诺:未满 22 岁的孩子负责 {n} 年或到 25 岁,以先到者为准",
                        "en": "Undertaking: {n} years or until the child turns 25, whichever comes first (child under 22)",
                        "ko": "서약: {n}년 또는 25세까지 중 먼저 오는 시점(22세 미만 자녀)"
                    },
                    "vars": {
                        "n": 10
                    },
                    "quote": "Dependent child under 22 years of age Footnote 2 10 years or until the child becomes 25 years of age, whichever comes first",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/undertaking.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保申请与永居申请由被担保人一起在永居门户网上递交",
                        "en": "The sponsored person submits the sponsorship and PR applications together in the PR Portal",
                        "ko": "피보증인이 보증 신청서와 영주권 신청서를 영주권 포털에서 함께 제출"
                    },
                    "quote": "The principal applicant (the person you’re sponsoring) will submit both applications together online using the Permanent Residence (PR) Portal.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/apply.html"
                }
            ]
        },
        {
            "step": "biometrics",
            "dur": {"kind": "upto", "unit": "day", "min": 0, "max": 30, "quote": "They have 30 days from the date of the letter to go to a biometric collection site .", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知信后 {n} 天内录指纹,另按通知体检",
                        "en": "Give biometrics within {n} days of the letter, and do the medical exam when asked",
                        "ko": "통지서 받은 후 {n}일 안에 생체정보 등록, 안내에 따라 신체검사"
                    },
                    "vars": {
                        "n": 30
                    },
                    "quote": "They have 30 days from the date of the letter to go to a biometric collection site .",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 12, "quote": "Family class priority (overseas – spouses, common-law partners, conjugal partners and dependent children) 12 months", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/service-declaration/service-standards.html"},
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先审担保人,通过后再审被担保人",
                        "en": "The sponsor is assessed first, then the person being sponsored",
                        "ko": "보증인을 먼저 심사한 뒤 피보증인을 심사"
                    },
                    "quote": "If we approve you as a sponsor We’ll send you a letter or email to tell you that you’ve been approved.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        },
        {
            "step": "prApply",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿永居确认函(COPR)和永居签证,在到期前入境落地",
                        "en": "Receive the COPR (and PR visa if needed) and land in Canada before they expire",
                        "ko": "영주권 확인서(COPR)와 영주권 비자를 받고 만료 전에 입국"
                    },
                    "quote": "Your family members will have to show their COPR and permanent resident visa (if we gave them one) to the border services officer at a Canadian port of entry before their documents expire .",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children/track-update-application.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:与配偶共一个官方页面(Sponsor your spouse, partner or child),没有单独的通道名,officialName 用页面标题。flpt json 里的 dependants-abroad-roc(约 41 个月)不是这一类(处理时长工具「Dependent child」一项按国家出数,走 ptime-manager-dependent-child),别拿来顶。孩子在境内时落地方式同境内配偶,这里按境外写。领养另走 adopt-child-abroad 页,不在范围。who=sponsor 同配偶条说明。"""

PW_FED_PGP = {
    "key": "fed-pgp", "province": "FED", "program": "FAMILY",
    "plainZh": "父母祖父母团聚", "plainEn": "Parents and grandparents sponsorship", "plainKo": "부모·조부모 초청",
    "officialName": "Parents and Grandparents Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "paused",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents.html",
    "quote": "This is a program to sponsor your parents and grandparents to become permanent residents of Canada.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "sponsorInterest",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保意向表目前关闭",
                        "en": "The interest to sponsor form is currently closed",
                        "ko": "초청 의향서 접수 현재 마감"
                    },
                    "quote": "The interest to sponsor form is currently closed.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/tell-us-you-want-sponsor-parent-grandparent.html"
                }
            ]
        },
        {
            "step": "draw",
            "who": "federal",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "从 2020 年递过意向表的人里随机抽人发邀请",
                        "en": "Invitations are drawn at random from people who submitted an interest form in 2020",
                        "ko": "2020년 의향서 제출자 중 무작위로 초청"
                    },
                    "quote": "We randomly select and invite potential sponsors who submitted an interest to sponsor form in 2020 to apply to sponsor their parents and grandparents.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/apply.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "2025 年一轮发了 {n} 份邀请",
                        "en": "The 2025 intake sent {n} invitations",
                        "ko": "2025년 회차에 {n}건 초청 발송"
                    },
                    "vars": {
                        "n": 17860
                    },
                    "quote": "We sent 17,860 invitations over approximately 2 weeks.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/apply.html"
                }
            ]
        },
        {
            "step": "undertaking",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保人年满 {n} 岁、住在加拿大",
                        "en": "Sponsor is {n} or older and lives in Canada",
                        "ko": "보증인은 {n}세 이상, 캐나다 거주"
                    },
                    "vars": {
                        "n": 18
                    },
                    "quote": "you’re at least 18 years old you live in Canada",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "要有收入证明,可与配偶合并收入",
                        "en": "Must prove enough income; a spouse or partner may co-sign",
                        "ko": "소득 증빙 필요, 배우자 공동서명 가능"
                    },
                    "quote": "you have enough money to support the people you want to sponsor to show that you have enough, you’ll have to provide your proof of income",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "签担保承诺 {n} 年(魁省 10 年)",
                        "en": "Sign a {n}-year undertaking (10 in Quebec)",
                        "ko": "{n}년 부양 서약(퀘벡 10년)"
                    },
                    "vars": {
                        "n": 20
                    },
                    "quote": "The undertaking period to sponsor your parents and grandparents is 20 years.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/undertaking.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到邀请才能递,未邀请递交会被退回",
                        "en": "You can apply only with an invitation",
                        "ko": "초청받은 경우에만 신청 가능"
                    },
                    "quote": "You can only apply if you get an invitation.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/apply.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "担保申请与永居申请由被担保人一起在永居门户递交",
                        "en": "The sponsored person submits both applications together in the PR Portal",
                        "ko": "피보증인이 두 신청서를 영주권 포털에서 함께 제출"
                    },
                    "quote": "The principal applicant (the person you’re sponsoring) will submit both applications together online using the Permanent Residence (PR) Portal.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/apply.html"
                }
            ]
        },
        {
            "step": "review",
            "ptime": "pgp-roc",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "2026 年计划批最多 {n} 人",
                        "en": "Up to {n} people planned for approval in 2026",
                        "ko": "2026년 최대 {n}명 승인 계획"
                    },
                    "vars": {
                        "n": 15000
                    },
                    "quote": "plan to approve up to 15,000 people for permanent residence through the PGP Program in 2026",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/responsibly-manage-parent-grandparent-program.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
状态 paused 原句:We will not accept new interest to sponsor forms or invite potential sponsors to apply until further notice.(https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/sponsor-parents-grandparents/apply.html)
判读:2026-07-15 IRCC 公告暂停收件(只处理在手申请);2025 年那轮从 2020 年意向表抽、10 月 9 日截止。意向表页写的是「Status: Closed」,项目页写「Paused」,status 取 paused。收入门槛具体数(连续 3 个税年、MNI+30%)在 income-requirements 子页,本轮没抓没登。"""

PW_FED_OTHER_RELATIVES = {
    "key": "fed-other-relatives", "province": "FED", "program": "FAMILY",
    "plainZh": "担保其他亲属", "plainEn": "Other relatives sponsorship", "plainKo": "기타 친척 초청",
    "officialName": "Sponsor your relatives",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/other-relatives.html",
    "quote": "This is a program to sponsor certain relatives to become permanent residents of Canada.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "sponsorEligible",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "只能担保父母双亡、未满 18 岁未婚的兄弟姐妹、侄甥、孙辈",
                        "en": "Only orphaned siblings, nephews, nieces or grandchildren under 18 and single",
                        "ko": "부모가 모두 사망한 18세 미만 미혼 형제·조카·손주만 가능"
                    },
                    "quote": "You can sponsor an orphaned brother, sister, nephew, niece or grandchild only if they meet all of these requirements:",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/other-relatives/who-you-can-sponsor.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "或担保 {n} 名任意年龄亲属,前提是自己没有更近的可担保亲属、在加也没有公民或永居亲属",
                        "en": "Or {n} relative of any age, only if you have no closer relative to sponsor and no relative who is a citizen or PR",
                        "ko": "또는 더 가까운 친척과 캐나다 내 시민·영주권자 친척이 없을 때만 나이 무관 {n}명"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "You may sponsor 1 relative of any age , if you meet all of these conditions:",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/other-relatives/who-you-can-sponsor.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "担保人年满 {n} 岁、住在加拿大,并达到收入标准",
                        "en": "Sponsor is {n}+, lives in Canada and meets income guidelines",
                        "ko": "보증인은 {n}세 이상, 캐나다 거주, 소득 기준 충족"
                    },
                    "vars": {
                        "n": 18
                    },
                    "quote": "are at least 18 years old are a Canadian citizen, a permanent resident of Canada, or a person registered in Canada under the Canadian Indian Act live in Canada",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/other-relatives/eligibility.html"
                }
            ]
        },
        {
            "step": "undertaking",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签担保承诺,最长 {n} 年",
                        "en": "Sign an undertaking of up to {n} years",
                        "ko": "최장 {n}년 부양 서약"
                    },
                    "vars": {
                        "n": 20
                    },
                    "quote": "for up to 20 years (depending on their age and how you’re related)",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/other-relatives/eligibility.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "担保申请与亲属的永居申请同时递交",
                        "en": "Send the sponsorship and the relative’s PR application at the same time",
                        "ko": "보증 신청서와 친척의 영주권 신청서를 동시에 제출"
                    },
                    "quote": "You must send both your sponsorship application and the permanent residence application for your relatives at the same time",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/other-relatives/apply.html"
                }
            ]
        },
        {
            "step": "review",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先审担保人;担保人被拒,亲属的永居申请仍可继续",
                        "en": "The sponsor is assessed first; if refused, the relative’s PR application can still proceed",
                        "ko": "보증인 먼저 심사, 거절돼도 친척의 영주권 신청은 계속 가능"
                    },
                    "quote": "If we refuse you as a sponsor Your relative can still apply for permanent residence.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/other-relatives/after-apply-next-steps.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:官方页面标题「Sponsor your relatives」即通道名;处理时长页按国家出数,未登具体月数。who=sponsor 同配偶条说明。"""

PW_FED_REFUGEE_CLAIM = {
    "key": "fed-refugee-claim", "province": "FED", "program": "REFUGEE",
    "plainZh": "境内申请难民保护", "plainEn": "Asylum claim in Canada", "plainKo": "캐나다 내 난민 신청",
    "officialName": "Claiming asylum from within Canada",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/asylum/in-canada.html",
    "quote": "Canada offers asylum (legally known as refugee protection) to people within Canada who can prove they meet the definition of a Convention refugee or person in need of protection.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eligibilityCheck",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "首次入境满 {n} 年后才提的申请不受理(2025-06-03 起的申请)",
                        "en": "Claims made more than {n} year after first entering Canada are ineligible (claims from June 3, 2025)",
                        "ko": "최초 입국 후 {n}년이 지나 한 신청은 접수 불가(2025-06-03 이후 신청)"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "more than 1 year after you first entered Canada",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/asylum/in-canada/eligibility.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "从美国陆路口岸入境的,按安全第三国协议一般不受理",
                        "en": "Entering from the US at a land border is generally ineligible under the Safe Third Country Agreement",
                        "ko": "미국 육로 입국자는 안전한 제3국 협정에 따라 대체로 불가"
                    },
                    "quote": "entered Canada from the United States (US) along the land border",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/asylum/in-canada/eligibility.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "在 IRCC 门户网上递交,每位家庭成员都填申请依据表(BOC)",
                        "en": "Submit online in the IRCC Portal; each family member completes a Basis of Claim form",
                        "ko": "IRCC 포털에서 온라인 제출, 가족 각자 BOC 양식 작성"
                    },
                    "quote": "If you are inside Canada, you need to use the IRCC Portal to submit an asylum claim online.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/asylum/in-canada/start-online.html"
                }
            ]
        },
        {
            "step": "biometrics",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "移民官面谈、录指纹,判断能否转交难民局",
                        "en": "An officer interviews you and takes biometrics to decide if the claim can be referred",
                        "ko": "심사관 면담·생체정보 등록 후 IRB 회부 여부 결정"
                    },
                    "quote": "An IRCC immigration officer will interview you to make sure your claim meets the eligibility requirements.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/asylum/in-canada/after-apply.html"
                }
            ]
        },
        {
            "step": "hearing",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "移民难民局(IRB)排听证并裁决",
                        "en": "The IRB holds a hearing and decides the claim",
                        "ko": "IRB가 청문회를 열어 결정"
                    },
                    "quote": "The IRB will schedule a hearing to make a decision on your claim and will decide if you meet the definition of a Convention refugee or a person in need of protection.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/asylum/in-canada/after-apply.html"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "protected-persons-in-canada-roc",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "获批即成「受保护人」,可申请永居",
                        "en": "If accepted, you become a protected person and can apply for PR",
                        "ko": "인정되면 보호대상자가 되어 영주권 신청 가능"
                    },
                    "quote": "If the Immigration and Refugee Board of Canada (IRB) accepts your claim, you get \"protected person\" status.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/asylum/in-canada/after.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "接到受保护人通知后随时可递永居",
                        "en": "Apply for PR any time after being notified",
                        "ko": "보호대상자 통지 후 언제든 영주권 신청"
                    },
                    "quote": "You can apply for permanent residence anytime after being notified by the Immigration and Refugee Board (IRB) or by IRCC that you are a Protected Person, unless you have been named as a Designated Foreign National (DFN).",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5205-applying-permanent-residence-within-canada-protected-persons-convention-refugees.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "免交永居身份费,只交处理费",
                        "en": "Exempt from the right of PR fee; only the processing fee applies",
                        "ko": "영주권 취득비 면제, 처리비만 납부"
                    },
                    "quote": "As a Protected Person, you are exempt from paying the Right of Permanent Residence Fee.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5205-applying-permanent-residence-within-canada-protected-persons-convention-refugees.html"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:IRB 听证等多久没查(IRB 站 irb-cisr.gc.ca 不在白名单),时长只登了受保护人递永居之后那段。2026-11-03 起门户问卷改版(start-online 页);口岸申请走 asylum/border.html,已缓存未单列。提申请、面谈是申请人做;听证裁决是 IRB(联邦),who 写 federal。"""

PW_FED_REFUGEE_GAR = {
    "key": "fed-refugee-gar", "province": "FED", "program": "REFUGEE",
    "plainZh": "政府资助难民", "plainEn": "Government-assisted refugees", "plainKo": "정부 지원 난민",
    "officialName": "Government-Assisted Refugees program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada/government-assisted-refugee-program.html",
    "quote": "Through the Government-Assisted Refugees (GAR) program, refugees are referred to Canada for resettlement by the United Nations Refugee Agency (UNHCR) or another referral organization",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "referral",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "本人不能自己申请,只能被推荐",
                        "en": "You cannot apply yourself; you must be referred",
                        "ko": "본인이 직접 신청할 수 없고 추천받아야 함"
                    },
                    "quote": "You cannot apply directly to us as a refugee.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "先在联合国难民署或所在国当局登记难民身份,再由其推荐",
                        "en": "Register refugee status with UNHCR or state authorities first; they refer you",
                        "ko": "먼저 UNHCR 또는 해당국에 난민 등록, 그쪽이 추천"
                    },
                    "quote": "To be considered by a referral organization, you must register for refugee status with the UNHCR or state authorities.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada/government-assisted-refugee-program.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "到加后政府资助最长 {n} 年",
                        "en": "Government support for up to {n} year after arrival",
                        "ko": "도착 후 최대 {n}년 정부 지원"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "You’ll receive support for up to 1 year from the date you arrive in Canada or until you’re able to support yourself (whichever happens first)",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada/government-assisted-refugee-program.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "被推荐后才填申请表",
                        "en": "Fill out the application package only after being referred",
                        "ko": "추천을 받은 뒤에만 신청서 작성"
                    },
                    "quote": "If you are referred, you will need to fill out the application package to apply as a Convention refugee or as a humanitarian-protected person abroad .",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada.html"
                }
            ]
        },
        {
            "step": "biometrics",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签证处面谈、录指纹,另做体检与安全背景审查",
                        "en": "Visa office interview and biometrics, plus medical and security checks",
                        "ko": "비자사무소 면접·생체정보, 신체검사·보안심사"
                    },
                    "quote": "Most applicants will be asked to attend a personal interview.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada/after-apply-next-steps.html"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "government-refugees-roc",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": []
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:申请人不能自己发起:GAR 只靠联合国难民署等推荐机构转介。魁省自选难民(government-refugees-quebec 约 9 个月)未单列。最后一步「入境落地」官方页无可引原句,留空 facts。"""

PW_FED_REFUGEE_PSR = {
    "key": "fed-refugee-psr", "province": "FED", "program": "REFUGEE",
    "plainZh": "民间担保难民", "plainEn": "Privately sponsored refugees", "plainKo": "민간 후원 난민",
    "officialName": "Private Sponsorship of Refugees Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/sponsor-refugee/private-sponsorship-program/refugees-information.html",
    "quote": "You become a privately sponsored refugee (PSR) when a group of people in Canada volunteers to help you adjust to life here.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "sponsorGroup",
            "who": "sponsor",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "本人不能自己申请,只能被推荐",
                        "en": "You cannot apply yourself; you must be referred",
                        "ko": "본인이 직접 신청할 수 없고 추천받아야 함"
                    },
                    "quote": "You cannot apply directly to us as a refugee.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "担保方须是担保协议持有机构(SAH)、五人小组或社区担保方,个人不能单独担保",
                        "en": "Sponsors must be a Sponsorship Agreement Holder, Group of Five or Community Sponsor, not an individual",
                        "ko": "후원자는 SAH·5인 그룹·지역 후원단체여야 하며 개인 단독 불가"
                    },
                    "quote": "You can’t sponsor a refugee on your own.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/sponsor-refugee/private-sponsorship-program.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "五人小组、社区担保方目前暂停新担保,五人小组只能走 BVOR",
                        "en": "Groups of Five and Community Sponsors are paused; Groups of Five can only use BVOR",
                        "ko": "5인 그룹·지역 후원단체 신규 후원 중단, 5인 그룹은 BVOR만 가능"
                    },
                    "quote": "Groups of five can only apply to sponsor refugees through the Blended Visa Office-Referred (BVOR) Program at this time.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/sponsor-refugee/private-sponsorship-program/groups-five.html"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "担保团体负责到加后 {n} 年生活,不收处理费",
                        "en": "The group supports you for {n} year after arrival; no processing fees",
                        "ko": "후원 단체가 도착 후 {n}년 지원, 처리비 없음"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "As a PSR, your sponsorship group must support you for 1 year after you arrive or until you can support yourself, whichever comes first.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/sponsor-refugee/private-sponsorship-program/refugees-information.html"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "被推荐后才填申请表",
                        "en": "Fill out the application package only after being referred",
                        "ko": "추천을 받은 뒤에만 신청서 작성"
                    },
                    "quote": "If you are referred, you will need to fill out the application package to apply as a Convention refugee or as a humanitarian-protected person abroad .",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada.html"
                }
            ]
        },
        {
            "step": "biometrics",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "签证处面谈、录指纹,另做体检与安全背景审查",
                        "en": "Visa office interview and biometrics, plus medical and security checks",
                        "ko": "비자사무소 면접·생체정보, 신체검사·보안심사"
                    },
                    "quote": "Most applicants will be asked to attend a personal interview.",
                    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/help-outside-canada/after-apply-next-steps.html"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "private-refugees-roc",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": []
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:申请人不能自己发起:须由加拿大境内担保团体担保(或联合国难民署推荐),官方原句「You cannot apply directly to us as a refugee.」。担保团体那一步 who 写 sponsor。只有 SAH 仍开放(private-sponsorship-program 页 SAH「Open」、五人小组 / 社区担保方「Paused」)。最后一步「入境落地」官方页无可引原句,留空 facts。魁省走 quebec.ca,不在范围。"""

PW_QC_PSTQ_STREAM_1 = {
    "key": "qc-pstq-stream-1", "province": "QC", "program": "PSTQ",
    "plainZh": "QC 高技能", "plainEn": "QC Highly Skilled", "plainKo": "QC 고숙련",
    "officialName": "Stream 1: Highly qualified and specialized skills",
    "boardLabel": None, "isDefault": False,
    "drawStreams": ["Stream 1: Highly qualified and specialized skills"], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program",
    "quote": "Your main occupation must be in the category FEER 0, 1 or 2.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "The expression of interest is filed online for free in",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "建档后 {n} 天内填完并递交",
                        "en": "Complete and submit within {n} days of creating it",
                        "ko": "작성 시작 후 {n}일 안에 완성해 제출"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "From the date you create your expression of interest, you have 90 days to complete and submit it.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "From the moment you file your expression of interest, it remains valid for one full year (12 months).",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "ref": "draws"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "按通道和目标人群筛选后,分数从高到低发邀请,发满名额为止",
                        "en": "Invites the highest scores in the targeted profile until the quota is filled",
                        "ko": "대상 프로필 안에서 점수 높은 순으로 정원이 찰 때까지 초청"
                    },
                    "quote": "Then, individuals with the highest scores are invited from among those selected in steps 1 and 2, until the target number of invites for that profile has been reached.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteAcceptDays",
                    "vars": {
                        "n": 30
                    },
                    "quote": "If you receive an invitation to apply and still wish to settle in Québec, you have 30 days from the date of the invitation to accept it through your Arrima account.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "接受邀请后 {n} 天内递申请、材料和费用",
                        "en": "Submit the application, documents and fees within {n} days of accepting",
                        "ko": "초청 수락 후 {n}일 안에 신청서·서류·수수료 제출"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You have 60 days from the date of acceptance to submit your application, along with the required documents and fees.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 940
                    },
                    "quote": "Main applicant : $940",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "about", "unit": "month", "min": 8, "max": 8, "quote": "We are currently reviewing applications for permanent selection under the Skilled Worker Selection Program (PSTQ) received in January 2026.", "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明",
                        "en": "Obtain the attestation of learning of democratic and Québec values within {n} days of the request",
                        "ko": "요청 후 {n}일 안에 민주·퀘벡 가치 학습 확인서 취득"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You and the members of your family concerned will have 60 days to obtain your attestation from the date you receive the communication from the Ministère.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/examination"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件且不需面试的,在 Arrima 收到 CSQ",
                        "en": "If all requirements are met and no interview is needed, the CSQ arrives in Arrima",
                        "ko": "모든 요건을 충족하고 면접이 필요 없으면 Arrima로 CSQ 수령"
                    },
                    "quote": "If you meet all the program requirements and an interview is not necessary, you will receive an email in your Arrima account:",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/examination"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "qsw",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "Once you have obtained your Certificat de sélection du Québec, you must apply for permanent residence with the federal government",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/after-selection-certificate"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:抽选步挂 data/raw/pnp/draws-qc.json 里 stream 名「Stream 1: Highly qualified and specialized skills」的轮次(该文件 stream 名与 officialName 逐字相同)。门槛(近 5 年主职业满 1 年、法语口语 7 / 书面 5)留门槛卡,不当步骤。"""

PW_QC_PSTQ_STREAM_2 = {
    "key": "qc-pstq-stream-2", "province": "QC", "program": "PSTQ",
    "plainZh": "QC 中级与手工技能", "plainEn": "QC Intermediate and Manual Skills", "plainKo": "QC 중급·기능직",
    "officialName": "Stream 2: Intermediate and manual skills",
    "boardLabel": None, "isDefault": False,
    "drawStreams": ["Stream 2: Intermediate and manual skills"], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program",
    "quote": "Your main occupation must be in the category FEER 3, 4 or 5.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "workLocal",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "近 5 年在主职业干满 2 年,魁北克以外的经验最多算 {n} 年",
                        "en": "2 years in the main occupation in the last 5; at most {n} year may be from outside Québec",
                        "ko": "최근 5년간 주 직업 경력 2년, 퀘벡 밖 경력은 최대 {n}년만 인정"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "Work experience acquired outside Québec is eligible for up to one year.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/requirements"
                }
            ]
        },
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "The expression of interest is filed online for free in",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "建档后 {n} 天内填完并递交",
                        "en": "Complete and submit within {n} days of creating it",
                        "ko": "작성 시작 후 {n}일 안에 완성해 제출"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "From the date you create your expression of interest, you have 90 days to complete and submit it.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "From the moment you file your expression of interest, it remains valid for one full year (12 months).",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "ref": "draws"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "按通道和目标人群筛选后,分数从高到低发邀请,发满名额为止",
                        "en": "Invites the highest scores in the targeted profile until the quota is filled",
                        "ko": "대상 프로필 안에서 점수 높은 순으로 정원이 찰 때까지 초청"
                    },
                    "quote": "Then, individuals with the highest scores are invited from among those selected in steps 1 and 2, until the target number of invites for that profile has been reached.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteAcceptDays",
                    "vars": {
                        "n": 30
                    },
                    "quote": "If you receive an invitation to apply and still wish to settle in Québec, you have 30 days from the date of the invitation to accept it through your Arrima account.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "接受邀请后 {n} 天内递申请、材料和费用",
                        "en": "Submit the application, documents and fees within {n} days of accepting",
                        "ko": "초청 수락 후 {n}일 안에 신청서·서류·수수료 제출"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You have 60 days from the date of acceptance to submit your application, along with the required documents and fees.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 940
                    },
                    "quote": "Main applicant : $940",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "about", "unit": "month", "min": 8, "max": 8, "quote": "We are currently reviewing applications for permanent selection under the Skilled Worker Selection Program (PSTQ) received in January 2026.", "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明",
                        "en": "Obtain the attestation of learning of democratic and Québec values within {n} days of the request",
                        "ko": "요청 후 {n}일 안에 민주·퀘벡 가치 학습 확인서 취득"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You and the members of your family concerned will have 60 days to obtain your attestation from the date you receive the communication from the Ministère.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/examination"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件且不需面试的,在 Arrima 收到 CSQ",
                        "en": "If all requirements are met and no interview is needed, the CSQ arrives in Arrima",
                        "ko": "모든 요건을 충족하고 면접이 필요 없으면 Arrima로 CSQ 수령"
                    },
                    "quote": "If you meet all the program requirements and an interview is not necessary, you will receive an email in your Arrima account:",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/examination"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "qsw",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "Once you have obtained your Certificat de sélection du Québec, you must apply for permanent residence with the federal government",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/after-selection-certificate"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:抽选步挂 data/raw/pnp/draws-qc.json 里 stream 名「Stream 2: Intermediate and manual skills」的轮次(该文件 stream 名与 officialName 逐字相同)。要求 2 年经验里至少 1 年在魁北克(没有魁北克经验的人得先来干满),按 AB 机会通道的判据登成 workLocal 第一步;官网这句原文被页面标签拆成「i ncluding at least one year in Québec」,逐字核对过不了,改挂「境外经验最多算一年」那句。"""

PW_QC_PSTQ_STREAM_3 = {
    "key": "qc-pstq-stream-3", "province": "QC", "program": "PSTQ",
    "plainZh": "QC 受监管职业", "plainEn": "QC Regulated Professions", "plainKo": "QC 규제 직업",
    "officialName": "Stream 3: Regulated professions",
    "boardLabel": None, "isDefault": False,
    "drawStreams": ["Stream 3: Regulated professions"], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program",
    "quote": "Your main profession must be included in the Liste des professions réglementées du Ministère",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "The expression of interest is filed online for free in",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "建档后 {n} 天内填完并递交",
                        "en": "Complete and submit within {n} days of creating it",
                        "ko": "작성 시작 후 {n}일 안에 완성해 제출"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "From the date you create your expression of interest, you have 90 days to complete and submit it.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "From the moment you file your expression of interest, it remains valid for one full year (12 months).",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "ref": "draws"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "按通道和目标人群筛选后,分数从高到低发邀请,发满名额为止",
                        "en": "Invites the highest scores in the targeted profile until the quota is filled",
                        "ko": "대상 프로필 안에서 점수 높은 순으로 정원이 찰 때까지 초청"
                    },
                    "quote": "Then, individuals with the highest scores are invited from among those selected in steps 1 and 2, until the target number of invites for that profile has been reached.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"
                }
            ]
        },
        {
            "step": "acceptInvite",
            "dur": {"kind": "upto", "unit": "day", "min": 0, "max": 30, "quote": "If you receive an invitation to apply and still wish to settle in Québec, you have 30 days from the date of the invitation to accept it through your Arrima account.", "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteAcceptDays",
                    "vars": {
                        "n": 30
                    },
                    "quote": "If you receive an invitation to apply and still wish to settle in Québec, you have 30 days from the date of the invitation to accept it through your Arrima account.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"
                }
            ]
        },
        {
            "step": "licence",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "官方建议收到邀请后再找魁北克职业监管机构办认可",
                        "en": "Start recognition with the Québec regulatory body only after the invitation",
                        "ko": "초청을 받은 뒤 퀘벡 직업 규제 기관에 인정 절차 시작 권장"
                    },
                    "quote": "We recommend that you do not begin the process with the regulatory authority for your profession in Québec until you have received an invitation to apply for permanent selection under the PSTQ.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/requirements"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "还没拿到监管机构认可的,接受邀请后 {n} 个月内递",
                        "en": "Without recognition yet: submit within {n} months of accepting",
                        "ko": "규제 기관 인정이 아직 없으면 초청 수락 후 {n}개월 안에 제출"
                    },
                    "vars": {
                        "n": 12
                    },
                    "quote": "You have one year from the date of acceptance to submit your application, along with the required documents and fees.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "已有监管机构认可的,接受邀请后 {n} 天内递",
                        "en": "With recognition already: submit within {n} days of accepting",
                        "ko": "규제 기관 인정이 이미 있으면 초청 수락 후 {n}일 안에 제출"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You have 60 days from the date of acceptance to submit your application, along with the required documents and fees.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 940
                    },
                    "quote": "Main applicant : $940",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "about", "unit": "month", "min": 8, "max": 8, "quote": "We are currently reviewing applications for permanent selection under the Skilled Worker Selection Program (PSTQ) received in January 2026.", "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明",
                        "en": "Obtain the attestation of learning of democratic and Québec values within {n} days of the request",
                        "ko": "요청 후 {n}일 안에 민주·퀘벡 가치 학습 확인서 취득"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You and the members of your family concerned will have 60 days to obtain your attestation from the date you receive the communication from the Ministère.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/examination"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件且不需面试的,在 Arrima 收到 CSQ",
                        "en": "If all requirements are met and no interview is needed, the CSQ arrives in Arrima",
                        "ko": "모든 요건을 충족하고 면접이 필요 없으면 Arrima로 CSQ 수령"
                    },
                    "quote": "If you meet all the program requirements and an interview is not necessary, you will receive an email in your Arrima account:",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/examination"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "qsw",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "Once you have obtained your Certificat de sélection du Québec, you must apply for permanent residence with the federal government",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/after-selection-certificate"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:抽选步挂 data/raw/pnp/draws-qc.json 里 stream 名「Stream 3: Regulated professions」的轮次(该文件 stream 名与 officialName 逐字相同)。Stream 3 接受邀请与递申请之间隔着「办职业资格认可」(最长一年),所以拆成 收邀请、接受 → 办职业资格认可 → submit 三步,不用合并的 apply。"""

PW_QC_PSTQ_STREAM_4 = {
    "key": "qc-pstq-stream-4", "province": "QC", "program": "PSTQ",
    "plainZh": "QC 杰出人才", "plainEn": "QC Exceptional Talent", "plainKo": "QC 특별 인재",
    "officialName": "Stream 4: Exceptional talent",
    "boardLabel": None, "isDefault": False,
    "drawStreams": ["Stream 4: Exceptional talent"], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program",
    "quote": "Distinguish yourself clearly in your main occupation through exceptional expertise likely to contribute to Québec's prosperity;",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "eoi",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "noFee",
                    "quote": "The expression of interest is filed online for free in",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "建档后 {n} 天内填完并递交",
                        "en": "Complete and submit within {n} days of creating it",
                        "ko": "작성 시작 후 {n}일 안에 완성해 제출"
                    },
                    "vars": {
                        "n": 90
                    },
                    "quote": "From the date you create your expression of interest, you have 90 days to complete and submit it.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                },
                {
                    "key": "eoiValidMonths",
                    "vars": {
                        "n": 12
                    },
                    "quote": "From the moment you file your expression of interest, it remains valid for one full year (12 months).",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/expression-of-interest"
                }
            ]
        },
        {
            "step": "draw",
            "who": "province",
            "none": False,
            "stuck": True,
            "facts": [
                {
                    "ref": "draws"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "按通道和目标人群筛选后,分数从高到低发邀请,发满名额为止",
                        "en": "Invites the highest scores in the targeted profile until the quota is filled",
                        "ko": "대상 프로필 안에서 점수 높은 순으로 정원이 찰 때까지 초청"
                    },
                    "quote": "Then, individuals with the highest scores are invited from among those selected in steps 1 and 2, until the target number of invites for that profile has been reached.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"
                }
            ]
        },
        {
            "step": "apply",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "inviteAcceptDays",
                    "vars": {
                        "n": 30
                    },
                    "quote": "If you receive an invitation to apply and still wish to settle in Québec, you have 30 days from the date of the invitation to accept it through your Arrima account.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "接受邀请后 {n} 天内递申请、材料和费用",
                        "en": "Submit the application, documents and fees within {n} days of accepting",
                        "ko": "초청 수락 후 {n}일 안에 신청서·서류·수수료 제출"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You have 60 days from the date of acceptance to submit your application, along with the required documents and fees.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 940
                    },
                    "quote": "Main applicant : $940",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"
                }
            ]
        },
        {
            "step": "review",
            "dur": {"kind": "about", "unit": "month", "min": 8, "max": 8, "quote": "We are currently reviewing applications for permanent selection under the Skilled Worker Selection Program (PSTQ) received in January 2026.", "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/applying"},
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明",
                        "en": "Obtain the attestation of learning of democratic and Québec values within {n} days of the request",
                        "ko": "요청 후 {n}일 안에 민주·퀘벡 가치 학습 확인서 취득"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You and the members of your family concerned will have 60 days to obtain your attestation from the date you receive the communication from the Ministère.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/examination"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件且不需面试的,在 Arrima 收到 CSQ",
                        "en": "If all requirements are met and no interview is needed, the CSQ arrives in Arrima",
                        "ko": "모든 요건을 충족하고 면접이 필요 없으면 Arrima로 CSQ 수령"
                    },
                    "quote": "If you meet all the program requirements and an interview is not necessary, you will receive an email in your Arrima account:",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/examination"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "qsw",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "Once you have obtained your Certificat de sélection du Québec, you must apply for permanent residence with the federal government",
                    "url": "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/after-selection-certificate"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:抽选步挂 data/raw/pnp/draws-qc.json 里 stream 名「Stream 4: Exceptional talent」的轮次(该文件 stream 名与 officialName 逐字相同)。门槛 = 近 5 年主职业满 3 年 + 在部里成就清单上或拿到合作方(MEIE / FRQ / CALQ / INS)意见,无法语门槛;都是门槛不是步骤。"""

PW_QC_PEQ_GRADUATES = {
    "key": "qc-peq-graduates", "province": "QC", "program": "PEQ",
    "plainZh": "QC 魁北克毕业生", "plainEn": "QC Québec Graduates", "plainKo": "QC 퀘벡 졸업생",
    "officialName": "Diplômés du Québec",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise",
    "quote": "Pour le volet Diplômés du Québec : avoir obtenu, au Québec, un baccalauréat, une maîtrise ou un doctorat, un diplôme d’études collégiales techniques, un diplôme d’études professionnelles, seul ou suivi d’une attestation de spécialisation professionnelle, d’au moins 1 800 heures, en date du 19 novembre 2025",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "只在 2026 年 7 月 2 日到 10 月 31 日之间在 Arrima 递",
                        "en": "Apply in Arrima only between July 2 and October 31, 2026",
                        "ko": "2026년 7월 2일~10월 31일 사이에만 Arrima로 신청"
                    },
                    "quote": "Vous devez présenter votre demande dans l’un ou l’autre des deux volets du programme du 2 juillet au 31 octobre 2026",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/presenter-demande"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 940
                    },
                    "quote": "Requérante ou requérant principal : 940 $",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/presenter-demande"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明,否则拒收",
                        "en": "Obtain the values attestation within {n} days of the request or the application is rejected",
                        "ko": "요청 후 {n}일 안에 가치 학습 확인서를 받지 않으면 신청 반려"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "aurez alors 60 jours pour obtenir l’attestation. Sinon, votre demande sera rejetée.",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/presenter-demande"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件且不需面试的,收到 CSQ",
                        "en": "If all conditions are met and no interview is needed, you receive the CSQ",
                        "ko": "모든 조건을 충족하고 면접이 필요 없으면 CSQ 수령"
                    },
                    "quote": "Si vous remplissez toutes les conditions du programme et qu’une entrevue n’est pas nécessaire, vous recevrez",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/presenter-demande"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "qsw",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "Après avoir obtenu votre Certificat de sélection du Québec, vous devez faire une demande de résidence permanente auprès du gouvernement fédéral",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/apres-certificat-selection"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:派工说的「暂停」已过时:官网 2026-06-17 起挂「Réouverture temporaire」—— PEQ 2026-07-02 至 2028-07-02 重开两年,但收件窗口只到 2026-10-31(距今 19 天),且收件标准卡在 2025-11-19 当天已具备的学历 / 经验;窗口过后状态要复查(官网未说 11 月后是否再收)。PEQ 不走 Arrima 意向池,没有 eoi / draw。处理时长:PEQ 各页未找到(查过 PEQ 主页、a-propos、presenter-demande、conditions 两页、apres-certificat-selection)。毕业须在递交前 36 个月内、法语口语 7 / 书面 5,留门槛卡。"""

PW_QC_PEQ_TEMPORARY_WORKERS = {
    "key": "qc-peq-temporary-workers", "province": "QC", "program": "PEQ",
    "plainZh": "QC 临时外劳", "plainEn": "QC Temporary Foreign Workers", "plainKo": "QC 임시 외국인 근로자",
    "officialName": "Travailleurs étrangers temporaires",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise",
    "quote": "Pour le volet Travailleurs étrangers temporaires : avoir une expérience de travail au Québec de catégorie « Formation, études, expérience, responsabilités » 0, 1, 2 ou 3 au sens de la CNP d’une durée d’au moins deux ans, en date du 19 novembre 2025",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "workLocal",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "递申请时在职,且递申请前 {w} 个月里在魁北克全职工作满 {n} 个月",
                        "en": "Be employed when you apply, with at least {n} of the last {w} months of full-time work in Québec",
                        "ko": "신청 시 재직 중이며 신청 전 {w}개월 중 {n}개월 이상 퀘벡에서 전일제 근무"
                    },
                    "vars": {
                        "n": 24,
                        "w": 36
                    },
                    "quote": "Vous devez aussi occuper un emploi qui répond à ces critères au moment où vous présentez votre demande et pendant au moins 24 des 36 mois qui précèdent la présentation de votre demande.",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/conditions-selection/travailleurs-temporaires"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "只在 2026 年 7 月 2 日到 10 月 31 日之间在 Arrima 递",
                        "en": "Apply in Arrima only between July 2 and October 31, 2026",
                        "ko": "2026년 7월 2일~10월 31일 사이에만 Arrima로 신청"
                    },
                    "quote": "Vous devez présenter votre demande dans l’un ou l’autre des deux volets du programme du 2 juillet au 31 octobre 2026",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/presenter-demande"
                },
                {
                    "key": "appFee",
                    "vars": {
                        "n": 940
                    },
                    "quote": "Requérante ou requérant principal : 940 $",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/presenter-demande"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明,否则拒收",
                        "en": "Obtain the values attestation within {n} days of the request or the application is rejected",
                        "ko": "요청 후 {n}일 안에 가치 학습 확인서를 받지 않으면 신청 반려"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "aurez alors 60 jours pour obtenir l’attestation. Sinon, votre demande sera rejetée.",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/presenter-demande"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "符合全部条件且不需面试的,收到 CSQ",
                        "en": "If all conditions are met and no interview is needed, you receive the CSQ",
                        "ko": "모든 조건을 충족하고 면접이 필요 없으면 CSQ 수령"
                    },
                    "quote": "Si vous remplissez toutes les conditions du programme et qu’une entrevue n’est pas nécessaire, vous recevrez",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/presenter-demande"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "qsw",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "Après avoir obtenu votre Certificat de sélection du Québec, vous devez faire une demande de résidence permanente auprès du gouvernement fédéral",
                    "url": "https://www.quebec.ca/immigration/permanente/travailleurs-qualifies/programme-experience-quebecoise/apres-certificat-selection"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:派工说的「暂停」已过时:官网 2026-06-17 起挂「Réouverture temporaire」—— PEQ 2026-07-02 至 2028-07-02 重开两年,但收件窗口只到 2026-10-31(距今 19 天),且收件标准卡在 2025-11-19 当天已具备的学历 / 经验;窗口过后状态要复查(官网未说 11 月后是否再收)。PEQ 不走 Arrima 意向池,没有 eoi / draw。处理时长:PEQ 各页未找到(查过 PEQ 主页、a-propos、presenter-demande、conditions 两页、apres-certificat-selection)。workLocal 一步:收件标准要求 2025-11-19 当天已满两年魁北克 FEER 0-3 经验,现在才开始干的人这一轮赶不上;needsOffer 记 false(要求递交时在职,但不是「拿 offer」这类步骤)。"""

PW_QC_INVESTOR = {
    "key": "qc-investor", "province": "QC", "program": "INVESTOR",
    "plainZh": "QC 投资移民", "plainEn": "QC Investor", "plainKo": "QC 투자 이민",
    "officialName": "Investor Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors",
    "quote": "Settle in Québec and invest in Québec.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "agreement",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "先和指定金融中介签投资协议",
                        "en": "First sign an investment agreement with an approved financial intermediary",
                        "ko": "먼저 지정 금융 중개기관과 투자 계약 체결"
                    },
                    "quote": "First, you must enter into an investment agreement with a financial intermediary that has signed a participation agreement with the Ministère and with Investissement Québec Immigrants Investisseurs Inc.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors/conditions"
                }
            ]
        },
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "appFee",
                    "vars": {
                        "n": 18241
                    },
                    "quote": "Principal applicant : $18,241",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors/applying"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明",
                        "en": "Obtain the attestation of learning of democratic and Québec values within {n} days of the request",
                        "ko": "요청 후 {n}일 안에 민주·퀘벡 가치 학습 확인서 취득"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You will have a maximum of 60 days after receiving this request to obtain your attestation.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors/conditions"
                }
            ]
        },
        {
            "step": "invest",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 4, "quote": "No later than 120 days following the date on which the Ministère requests this, your financial intermediary must make a five-year term investment of CDN $1,000,000 and make a financial contribution of CDN $200,000 to Investissement Québec Immigrants Investisseurs inc.", "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors/conditions"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "部里要求后 {n} 天内由金融中介投 100 万加元(5 年期)并缴 20 万加元",
                        "en": "Within {n} days of the request, the intermediary invests CAD 1,000,000 for 5 years and contributes CAD 200,000",
                        "ko": "요청 후 {n}일 안에 중개기관이 100만 달러(5년 만기) 투자 및 20만 달러 출연"
                    },
                    "vars": {
                        "n": 120
                    },
                    "quote": "No later than 120 days following the date on which the Ministère requests this, your financial intermediary must make a five-year term investment of CDN $1,000,000 and make a financial contribution of CDN $200,000 to Investissement Québec Immigrants Investisseurs inc.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors/conditions"
                }
            ]
        },
        {
            "step": "workPermit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到拟甄选通知后 {n} 个月内申请工签",
                        "en": "Apply for the work permit within {n} months of the notice of intention to select",
                        "ko": "선발 예정 통지 후 {n}개월 안에 취업 허가 신청"
                    },
                    "vars": {
                        "n": 6
                    },
                    "quote": "The application for a work permit must be made within six months following the date of the notice of intention to select.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors/conditions"
                }
            ]
        },
        {
            "step": "residence",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到工签后 {w} 年内在魁北克住满 {n} 个月",
                        "en": "Live in Québec at least {n} months within {w} years of the work permit",
                        "ko": "취업 허가 후 {w}년 안에 퀘벡 체류 {n}개월"
                    },
                    "vars": {
                        "n": 12,
                        "w": 2
                    },
                    "quote": "Within two years following issuance of the work permit, you must complete a stay in Québec of at least 12 months.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors/conditions"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": []
        },
        {
            "step": "prApply",
            "ptime": "quebec-business",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "After obtaining your Québec Selection Certificate, you must submit an application for permanent residence to the Government of Canada",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/investors/after-selection-certificate"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:门槛:近 5 年管理经验满 2 年、净资产 200 万加元、法语口语 7。官网写随时可递、不设名额(英法两版一致,法文 investisseurs/presenter-demande 2026-08-26 更新)。「拿 CSQ」那步条件页只说住满后寄材料,没有一句明写何时发 CSQ,故不登事实。处理时长:未找到(review-application 页无时长,联邦部分官网只指去 IRCC)。"""

PW_QC_ENTREPRENEUR_STARTUP = {
    "key": "qc-entrepreneur-startup", "province": "QC", "program": "ENTREPRENEUR",
    "plainZh": "QC 创业移民(创办企业)", "plainEn": "QC Entrepreneur (Business Start-up)", "plainKo": "QC 창업 이민(창업)",
    "officialName": "Entrepreneur Program - Stream 2: Business startup",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/entrepreneurs/start-acquire-business",
    "quote": "You can submit an application for the Start-up profile if you wish to settle in Québec to start a business here.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "appFee",
                    "vars": {
                        "n": 1272
                    },
                    "quote": "Principal applicant : $1,272",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/entrepreneurs/start-acquire-business/applying"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明",
                        "en": "Obtain the attestation of learning of democratic and Québec values within {n} days of the request",
                        "ko": "요청 후 {n}일 안에 민주·퀘벡 가치 학습 확인서 취득"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You must obtain your attestation within a maximum of 60 days after receiving this request.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/entrepreneurs/start-acquire-business/conditions"
                }
            ]
        },
        {
            "step": "workPermit",
            "dur": {"kind": "upto", "unit": "month", "min": 0, "max": 2, "quote": "Initial work permits from outside Canada: All programs (excluding International Experience Canada) Footnote * 60 days", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/service-declaration/service-standards.html"},
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "凭拟甄选通知向联邦申请工签",
                        "en": "Use the notice of intention to select to apply for a federal work permit",
                        "ko": "선발 예정 통지로 연방 취업 허가 신청"
                    },
                    "quote": "This notice will enable you to apply for a work permit from the Government of Canada to continue the stat up process of your company in Québec, if necessary.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/entrepreneurs/start-acquire-business/conditions"
                }
            ]
        },
        {
            "step": "runBusiness",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到工签后 {n} 年内在魁北克办起企业",
                        "en": "Start the business in Québec within {n} years of the work permit",
                        "ko": "취업 허가 후 {n}년 안에 퀘벡에서 창업"
                    },
                    "vars": {
                        "n": 2
                    },
                    "quote": "You must have started a business in Québec no later than two years after the issuance of the work permit obtained with the notice of intent to be selected.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/entrepreneurs/start-acquire-business/conditions"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "寄证明材料时企业已注册满 {n} 年",
                        "en": "The business must be registered at least {n} year when you send proof",
                        "ko": "증빙 제출 시 사업자 등록 {n}년 이상"
                    },
                    "vars": {
                        "n": 1
                    },
                    "quote": "This business must have been registered for at least one year at the time you send the documentation justifying its start-up.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/entrepreneurs/start-acquire-business/conditions"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": []
        },
        {
            "step": "prApply",
            "ptime": "quebec-business",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "After obtaining your Québec Selection Certificate, you must submit an application for permanent residence to the Government of Canada",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/entrepreneurs/start-acquire-business/after-selection-certificate"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:Entrepreneur Program 分三个 volet:Stream 1 Innovative business / Stream 2 Business start-up / Stream 3 Business takeover,三页 applying 都写「You can submit an application at any time.」「There is no maximum number of applications to be received.」(英法两版一致,法文页 2026-01-01 更新),缓存已存;只细登了 Stream 2 的「创办企业」profile(净资产 60 万),Stream 2 另有「已在魁北克开业」profile(住满 2 年、净资产 30 万),Stream 1 / 3 未细登步骤。处理时长未找到。"""

PW_QC_SELF_EMPLOYED = {
    "key": "qc-self-employed", "province": "QC", "program": "SELF-EMPLOYED",
    "plainZh": "QC 自雇移民", "plainEn": "QC Self-Employed", "plainKo": "QC 자영업 이민",
    "officialName": "Self-Employed Worker Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "open",
    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/self-employed-workers",
    "quote": "You must practise your profession in Québec, alone or with others, with or without paid help.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [
        {
            "step": "submit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "appFee",
                    "vars": {
                        "n": 1272
                    },
                    "quote": "Principal applicant : $1,272",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/self-employed-workers/applying"
                }
            ]
        },
        {
            "step": "deposit",
            "who": "you",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "蒙特利尔都会区以外存 {n} 加元启动保证金",
                        "en": "Start-up deposit of CAD {n} outside the Montréal metropolitan area",
                        "ko": "몬트리올 광역권 밖은 시작 예치금 {n}달러"
                    },
                    "vars": {
                        "n": 25000
                    },
                    "quote": "Outside the Communauté métropolitaine de Montréal (CMM), the start-up deposit is CDN$25,000.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/self-employed-workers/conditions"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "蒙特利尔都会区以内存 {n} 加元启动保证金",
                        "en": "Start-up deposit of CAD {n} inside the Montréal metropolitan area",
                        "ko": "몬트리올 광역권 안은 시작 예치금 {n}달러"
                    },
                    "vars": {
                        "n": 50000
                    },
                    "quote": "On the territory of the CMM, the start-up deposit is CDN$50,000.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/self-employed-workers/conditions"
                },
                {
                    "key": "note",
                    "text": {
                        "zh": "保证金在部里通知后才存",
                        "en": "Make the deposit when the Ministère asks",
                        "ko": "부처 요청 시 예치"
                    },
                    "quote": "You will be required to make the initial deposit at the request of the Ministère.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/self-employed-workers/conditions"
                }
            ]
        },
        {
            "step": "review",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "收到通知后 {n} 天内拿到民主与魁北克价值观学习证明",
                        "en": "Obtain the attestation of learning of democratic and Québec values within {n} days of the request",
                        "ko": "요청 후 {n}일 안에 민주·퀘벡 가치 학습 확인서 취득"
                    },
                    "vars": {
                        "n": 60
                    },
                    "quote": "You must obtain your attestation within a maximum of 60 days after receiving this request.",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/self-employed-workers/conditions"
                }
            ]
        },
        {
            "step": "csq",
            "who": "province",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "申请获批即收到 CSQ",
                        "en": "An accepted application comes with the CSQ",
                        "ko": "승인 시 CSQ 수령"
                    },
                    "quote": "Your Certificat de sélection du Québec (CSQ - Québec selection certificate) for you and for your accompanying family members",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/self-employed-workers/review-application"
                }
            ]
        },
        {
            "step": "prApply",
            "ptime": "quebec-business",
            "who": "federal",
            "none": False,
            "stuck": False,
            "facts": [
                {
                    "key": "note",
                    "text": {
                        "zh": "拿到 CSQ 后向联邦递永居申请",
                        "en": "After the CSQ, apply to the federal government for permanent residence",
                        "ko": "CSQ 취득 후 연방 정부에 영주권 신청"
                    },
                    "quote": "After obtaining your Québec Selection Certificate, you must submit an application for permanent residence to the Government of Canada",
                    "url": "https://www.quebec.ca/en/immigration/permanent/immigrate-business/self-employed-workers/after-selection-certificate"
                }
            ]
        }
    ],
}
"""补全通道(2026-10-12 Frank「还缺多少条通道 都补上」→「全部都补」;六组并行调研,原句逐字核 crawl 缓存)。
判读:官网写随时可递、不设名额(英法两版一致,法文 travailleurs-autonomes/presenter-demande 2026-01-01 更新)。门槛:近 5 年本人名义自雇满 2 年、净资产 10 万、法语口语 7。处理时长未找到。"""


PW_FED_START_UP_VISA = {
    "key": "fed-start-up-visa", "province": "FED", "program": "SUV",
    "plainZh": "联邦创业签证", "plainEn": "Start-up Visa", "plainKo": "창업 비자",
    "officialName": "Start-up Visa Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "closed",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/start-visa.html",
    "quote": "The program is closed to all other applications.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [],
}
"""补全通道(2026-10-12):只剩持 2025 年承诺证书、2026-06-30 前递的;其余一律不收。调研时 canada.ca 读超时,当日去掉 Accept-Language 头补抓进缓存 fed-business / fed-agri。"""

PW_FED_SELF_EMPLOYED = {
    "key": "fed-self-employed", "province": "FED", "program": "SELF",
    "plainZh": "联邦自雇移民", "plainEn": "Self-employed Persons", "plainKo": "자영업자 이민",
    "officialName": "Self-Employed Persons Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "paused",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/self-employed.html",
    "quote": "This permanent residence program is for people who:",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [],
}
"""补全通道(2026-10-12):官网状态栏标 Paused(状态栏是标签不是整句,原句挂项目介绍);处理时长工具写 More than 10 years。调研时 canada.ca 读超时,当日去掉 Accept-Language 头补抓进缓存 fed-business / fed-agri。"""

PW_FED_AGRI_FOOD = {
    "key": "fed-agri-food", "province": "FED", "program": "AGRI",
    "plainZh": "联邦农业食品试点", "plainEn": "Agri-Food Pilot", "plainKo": "농식품 시범사업",
    "officialName": "Agri-Food Pilot",
    "boardLabel": None, "isDefault": False,
    "drawStreams": [], "reqStreams": [], "quotaScope": None, "occLabels": [],
    "status": "closed",
    "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/agri-food-pilot.html",
    "quote": "The Agri-Food Pilot ended on May 14, 2025.",
    "checked": "2026-10-12",
    "jobLinked": False,
    "steps": [],
}
"""补全通道(2026-10-12):2025-05-14 结束,不再收新申请。调研时 canada.ca 读超时,当日去掉 Accept-Language 头补抓进缓存 fed-business / fed-agri。"""

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
    # 2026-10-12 补全通道(段 2b)
    PW_AB_RURAL_ENTREPRENEUR, PW_AB_GRADUATE_ENTREPRENEUR, PW_AB_FOREIGN_GRADUATE_ENTREPRENEUR, PW_AB_FARM,
    PW_BC_ENTREPRENEUR_BASE, PW_BC_ENTREPRENEUR_REGIONAL, PW_BC_STRATEGIC_PROJECTS, PW_SK_ENTREPRENEUR,
    PW_SK_INTERNATIONAL_GRADUATE_ENTREPRENEUR, PW_SK_FARM_OWNER_OPERATOR, PW_MB_ENTREPRENEUR, PW_MB_FARM_INVESTOR,
    PW_MB_INTERNATIONAL_STUDENT_ENTREPRENEUR, PW_ON_ENTREPRENEUR, PW_NS_ENTREPRENEUR,
    PW_NS_INTERNATIONAL_GRADUATE_ENTREPRENEUR, PW_NB_BUSINESS_IMMIGRATION, PW_PE_WORK_PERMIT,
    PW_NL_INTERNATIONAL_ENTREPRENEUR, PW_NL_INTERNATIONAL_GRADUATE_ENTREPRENEUR, PW_YT_SKILLED_WORKER,
    PW_YT_CRITICAL_IMPACT_WORKER, PW_YT_EXPRESS_ENTRY, PW_YT_BUSINESS_NOMINEE, PW_NT_SKILLED_WORKER,
    PW_NT_ENTRY_LEVEL_SEMI_SKILLED, PW_NT_EXPRESS_ENTRY, PW_NT_FRANCOPHONE, PW_NT_BUSINESS, PW_FED_CEC, PW_FED_FSW,
    PW_FED_FST, PW_FED_AIP, PW_FED_RCIP, PW_FED_FCIP, PW_FED_HOME_CARE_WORKER, PW_FED_SPOUSE_INLAND,
    PW_FED_SPOUSE_OUTLAND, PW_FED_DEPENDENT_CHILD, PW_FED_PGP, PW_FED_OTHER_RELATIVES, PW_FED_REFUGEE_CLAIM,
    PW_FED_REFUGEE_GAR, PW_FED_REFUGEE_PSR, PW_QC_PSTQ_STREAM_1, PW_QC_PSTQ_STREAM_2, PW_QC_PSTQ_STREAM_3,
    PW_QC_PSTQ_STREAM_4, PW_QC_PEQ_GRADUATES, PW_QC_PEQ_TEMPORARY_WORKERS, PW_QC_INVESTOR, PW_QC_ENTREPRENEUR_STARTUP,
    PW_QC_SELF_EMPLOYED,
    PW_FED_START_UP_VISA, PW_FED_SELF_EMPLOYED, PW_FED_AGRI_FOOD,
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

STEP_KEYS = ["employerRegister", "offer", "work", "workLocal", "epa", "eeProfile", "eoi", "draw", "confirm", "apply", "review", "settle",
             "endorse", "pr", "community", "register", "submit", "interestLetter", "closedPermit",
             "csq", "finalReport", "fedReview", "workPermit", "runBusiness", "sponsorEligible", "undertaking",
             "sponsorInterest", "agreement", "biometrics", "visit", "referral", "sponsorGroup", "businessPlan",
             "workCanada", "eligibilityCheck", "hearing", "acceptInvite", "licence", "invest", "residence", "deposit",
             "prApply", "jobOffer"]
"""步骤词表(三语文案在 cms i18n pnp.step.*):雇主登记 / 拿雇主 offer / 在这份工作上干够 / 在本省干够(2026-10-08) / 雇主递职位审批 / 建 EE 档案 / 递 EOI /
进池与抽选 / 确认职位、递申请 / 收邀请、递申请 / 省里审批 / 做安置计划 / 雇主递省背书 / 拿提名,递永居 /
拿社区推荐信(community,2026-10-02 批 2 阿省乡村振兴加)/ 网上注册打分(register,2026-10-03 批 2 卑诗加:卑诗叫 registration,
注册后按打分进池)/ 递申请(submit,同日卑诗卫生局:持 offer 直接递、不经邀请)/ 收到省兴趣信(interestLetter,同日新不伦瑞克)/
申请封闭工签(closedPermit,同日新不伦瑞克私立学院试点)。"""

WHO_KEYS = ["you", "employer", "province", "federal", "sponsor"]
"""谁做的词表。"""

REF_KEYS = ["req", "processing", "intake", "draws"]
"""引用词表:req = 门槛表一行(带 factor)、processing = 运营统计处理时长(带 scope)、intake = 萨省收件窗口、draws = 抽选表。"""

FACT_KEYS = ["eoiFee", "eoiValidMonths", "inviteAcceptDays", "appSubmitDays", "nominationValidMonths", "communityLetter",
             "cappedEmployees", "windowCapped", "directApply", "eoiOnlyOther", "confirmSubmit", "noScheduledDraw", "inviteSubmitDays",
             "eeAcceptDays", "prSubmitDays", "workMonths", "employerDeclaration", "offerEoiDays", "noFee", "eoiValidDays", "appFee", "reviewSeveralMonths", "noTimeGuarantee", "poolSelection", "inviteSectors", "letterOrGrad", "employerOnly", "empMonths", "closedPermitDays", "liveMonths", "remoteNonQc", "movedToSwm", "nominationValidDays", "teer45EmployerMonths", "localWorkMonths", "eoiIsApplication", "afsPaused", "letterSubmitDays", "selectedPayDays", "noPermitOnly", "abroadOnly", "noStandardTime", "salesServiceLow",
             "reviewMonthsMin", "noPostedTime", "note"]
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

K_DUR = "dur"
"""步骤键:这一步的时长(2026-10-12 补全通道:官方原句直接给了时长的步骤登它,mart 时间线优先读;带原句与出处,自校逐字核)。"""

K_DUR_KIND = "kind"
"""时长键:形。"""

K_DUR_UNIT = "unit"
"""时长键:单位。"""

DUR_KINDS = ["exact", "range", "upto", "about", "atleast", "unpublished"]
"""时长形词表(与 mart 段 25 的 TL_* 同名;unpublished = 官方原句明说不公布 / 不保证 / 因案而异,单位写 None)。"""

DUR_UNITS = ["month", "day", None]
"""时长单位词表。"""

BAD_DUR_TPL = "{key} 的第 {i} 步时长写法不认得:{dur}"
"""自校:时长的形 / 单位不在词表里。"""

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

# =========================================================================
# 6. 身份对照(2026-10-11 申请步骤分区筛选批 1;Frank「可以,开始做第一批」,设计 docs/design/资讯/申请步骤-分区筛选-20261011.md,
#    判读稿 docs/design/资讯/申请步骤-身份对照-AB-20261011.md、申请步骤-身份对照-留学生-20261011.md)
# =========================================================================
# 一条通道一段:身份 → 能不能走(yes 能 / after 毕业后能 / no 不能)+ 院校条件(schools,任一段教育经历合上任一条即可)。
# 没登的身份 = 本站未核,前端不拿它筛(宁可多出不瞎藏)。no 与带院校条件的格必须挂官方原句 + 出处页,自校逐字对 crawl 缓存
# (同步骤事实的核法);yes / after 不挂原句。职业限制不在这里 —— 走通道行已有的 teers / nocs。
# 判读口径:「在读留学生」= 毕业后照毕业工签那格判(after),官网点名排除学签的才写 no。
# 待定未登:NB 关键工人试点(申请指南 PDF 下载 522)、MB SWO(海外通道,官网没写不收 PGWP)、两省医生通道(职业限死,交给职业筛)。

FIT_IDS = ["student", "pgwp", "lmia", "open", "abroad", "ee"]
"""身份词表(三语文案在 cms i18n):在读留学生 / 毕业工签 / 雇主工签(LMIA)/ 开放工签 / 人在国外 / 已有 EE 档案。"""

FIT_CANS = ["yes", "after", "no"]
"""能不能走的词表:能 / 毕业后能 / 不能。"""

FIT_CAN_NO = "no"
"""不能(必须挂原句)。"""

SCHOOL_PROVS = ["own", "other", "canada", "any"]
"""院校条件的地点词:本省 / 外省 / 加拿大任一省 / 不限(含国外)。本省外省按通道所在省算。"""

SCHOOL_KINDS = ["public", "private"]
"""院校条件的性质词:公立 / 私立(不写 = 不限)。"""

SCHOOL_MINS = ["y1", "y2", "y3", "master"]
"""院校条件的课程时长下限词(由短到长;不写 = 不限):一年制 / 两年制 / 三年以上 / 硕士及以上。"""

K_FITS = "fits"
"""产物行键:身份对照(没登的通道 None)。"""

K_CAN = "can"
"""身份格键:能不能走。"""

K_SCHOOLS = "schools"
"""身份格键:院校条件清单。"""

K_SCHOOL_PROV = "prov"
"""院校条件键:地点。"""

K_SCHOOL_KIND = "kind"
"""院校条件键:性质。"""

K_SCHOOL_MIN = "min"
"""院校条件键:课程时长下限。"""

FIT_UNKNOWN_KEY_TPL = "身份对照登了不存在的通道「{key}」"
"""自校:身份对照的通道编号不在通道表里。"""

FIT_BAD_ID_TPL = "{key} 的身份对照有不认得的身份「{id}」"
"""自校:身份词不认得。"""

FIT_BAD_CAN_TPL = "{key} 的身份「{id}」能不能走写成了「{can}」"
"""自校:能不能走不在词表里。"""

FIT_BAD_SCHOOL_TPL = "{key} 的身份「{id}」院校条件不认得:{school}"
"""自校:院校条件的词不认得。"""

FIT_QUOTE_EMPTY_TPL = "{key} 的身份「{id}」写了不能走或院校条件,却没挂原句或出处页"
"""自校:该挂原句的格没挂。"""

FIT_PAGE_MISSING_TPL = "{key} 的身份「{id}」的出处页不在 crawl 缓存里:{url}"
"""自校:出处页没爬到(先补 crawl,不现抓)。"""

FIT_QUOTE_MISSING_TPL = "{key} 的身份「{id}」的原句在 crawl 缓存那一页里找不到(官网改字?):{url}"
"""自校:原句核不上。"""

FIT_YES = {"can": "yes"}
"""能走(不挂原句)。"""

FIT_AFTER = {"can": "after"}
"""毕业后能走:先毕业拿毕业工签,再照毕业工签那格。"""

FITS_GRAD = {"student": FIT_AFTER, "pgwp": FIT_YES}
"""通用留学生两格:在读的毕业后能走、毕业工签能走,不挑院校(各省大多数持 offer 的通道)。"""

FITS_OPEN_ALL = {"student": FIT_AFTER, "pgwp": FIT_YES, "lmia": FIT_YES, "open": FIT_YES, "abroad": FIT_YES, "ee": FIT_YES}
"""六种身份都能走(在读的毕业后):阿省快速通道两条与医疗(只看 EE 档案 / 执业资格与 offer,不挑工签)。"""

AB_AOS_ELIG_URL = "https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility"
"""阿省机会通道资格页(2026-10-11 补进 crawl 缓存 ab-aaip)。"""

AB_AOS_SCHOOLS = [{"prov": "own", "kind": "public"}]
"""阿省机会通道的毕业工签只认阿省公立院校的学历(资格页 Approved Alberta institutions 段)。"""

AB_AOS_SCHOOL_QUOTE = "Your credential must be issued by an Alberta Advanced Education publicly funded post-secondary institution."
"""同上的原句。"""

AB_THS_ELIG_URL = "https://www.alberta.ca/tourism-and-hospitality-stream-eligibility"
"""阿省旅游酒店资格页。"""

AB_THS_LMIA_ONLY = {"can": "no", "quote": "Other types of work permits are not eligible at the time of application submission.",
                    "url": AB_THS_ELIG_URL}
"""阿省旅游酒店:只认 LMIA 工签(或山火特别措施),其他工签一律不收。"""

SK_EWP_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
              "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-with-saskatchewan-experience/"
              "applicants-with-existing-work-permit")
"""萨省现有工签类资格页。"""

SK_STUDENTS_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
                   "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-with-saskatchewan-experience/students")
"""萨省毕业生类资格页。"""

SK_STUDENTS_SCHOOL = {
    "can": "yes", "schools": [{"prov": "own"}],
    "quote": "Have graduated from a recognized post-secondary institution in Saskatchewan.", "url": SK_STUDENTS_URL,
}
"""萨省毕业生类:只收萨省院校毕业的(在读的读完即可申请,offer 须在优先行业)。"""

SK_TECH_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
               "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/"
               "sinp-innovation-tech-talent-pathway")
"""萨省科技人才资格页。"""

SK_TECH_SCHOOLS = [{"prov": "any", "min": "y2"}]
"""萨省科技人才:学历至少两年制(硕士 / 学士 / 三年制学位 / 两年制文凭,与 offer 相关)。"""

SK_TECH_QUOTE = ("or a diploma that requires two years at a university, college, trade or technical school, or other "
                 "post-secondary institution).")
"""同上的原句(列举学历那一句的末段)。"""

MB_CEP_URL = "https://immigratemanitoba.com/mpnp/ies/cep"
"""曼省 CEP 介绍页(外省毕业的改走 SWM 那句在这)。"""

MB_GIP_URL = "https://immigratemanitoba.com/mpnp/ies/gip"
"""曼省 GIP 介绍页(同一句)。"""

MB_OTHER_PROV_QUOTE = ("If you are an international student who graduated in another province of Canada and/or are not working "
                       "in an in-demand occupation, you may be eligible to apply under the Skilled Worker in Manitoba Pathway.")
"""曼省 CEP / GIP 页同一句:外省毕业的去走 SWM —— 这两条只收马省院校。(GIP 的硕博要求官网缓存页没找到原句,不登时长下限。)"""

NS_GRAD_URL = "https://liveinnovascotia.com/nova-scotia-graduate"
"""新斯省毕业生通道页。"""

NS_GRAD_QUOTE = ("have met requirements for completing a program of study at an eligible Nova Scotia designated learning "
                 "institution within three years of your application.")
"""新斯省毕业生通道:只收新斯省院校。"""

NS_EE_URL = "https://liveinnovascotia.com/express-entry"
"""新斯省快速通道页。"""

NS_EE_QUOTE = ("Applicants who are claiming work experience that was gained on a Post Graduate Work permit must have "
               "graduated from an educational institution located in Nova Scotia.")
"""新斯省快速通道本省经验:持 PGWP 攒经验的只收新斯省院校。"""

NB_SI_URL = "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/strategic-initiative.html"
"""新不伦瑞克法语战略倡议页。"""

NB_FP_QUOTE = ("have completed an in-person program of study of at least 1-year long at either the Université de Moncton or "
               "the Collège communautaire du Nouveau-Brunswick (CCNB)")
"""新不伦瑞克法语优先:只收蒙克顿大学 / CCNB 面授 1 年以上(两校都是本省公立)。"""

NB_PCCG_URL = "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/pccg-pilot-program.html"
"""新不伦瑞克私立学院试点页。"""

NL_SW_URL = "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/skilled-worker"
"""纽芬兰与拉布拉多技术工人类资格页。"""

NL_SW_NO = {"can": "no", "quote": "Cannot hold a Post-Graduation Work Permit.", "url": NL_SW_URL}
"""纽芬兰与拉布拉多技术工人类:不收 PGWP(须走国际毕业生类或快速通道)。"""

NL_IG_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/"
             "applicants/international-graduate/")
"""纽芬兰与拉布拉多国际毕业生类资格页。"""

NL_IG_SCHOOLS = [{"prov": "own"}, {"prov": "other", "kind": "public"}]
"""纽芬兰与拉布拉多国际毕业生类:本省院校不限;外省只收公立(外省私立不能)。"""

NL_IG_QUOTE = ("Graduates from recognized public institutions outside NL must have a job or offer directly related to their "
               "field and work in NL for at least one year before applying to the NLPNP.")
"""同上的原句。"""

PE_IG_URL = "https://www.princeedwardisland.ca/en/information/office-of-immigration/international-graduates"
"""爱德华王子岛国际毕业生页。"""

PE_IG_QUOTE = "have graduated from a publicly-funded Prince Edward Island institution;"
"""爱德华王子岛国际毕业生:只收本省公立院校。"""

PE_IE_NO = {
    "can": "no", "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/intermediate-experience-stream",
    "quote": ("have a minimum of six months full‐time Canadian work experience that was gained while on a Labour Market Impact "
              "Assessment (LMIA) based work permit, and be relevant to the current position the individual is offered in PEI;"),
}
"""爱德华王子岛中级经验:经验只认 LMIA 工签下的(留学生毕业也走不了)。"""

FITS = {
    # 阿省六条(六种身份全登;已有 EE 档案在机会通道 / 旅游酒店 / 乡村振兴「跟 EE 无关」,不登 = 不拿它筛)
    "ab-opportunity": {
        "student": {"can": "after", "schools": AB_AOS_SCHOOLS, "quote": AB_AOS_SCHOOL_QUOTE, "url": AB_AOS_ELIG_URL},
        "pgwp": {"can": "yes", "schools": AB_AOS_SCHOOLS, "quote": AB_AOS_SCHOOL_QUOTE, "url": AB_AOS_ELIG_URL},
        "lmia": FIT_YES,
        "open": {"can": "no", "quote": "If your work permit type is not included in the list above, you are not eligible to apply.",
                 "url": AB_AOS_ELIG_URL},
        "abroad": {"can": "no", "quote": ("At the time your application is submitted, and at the time AAIP assesses your "
                                          "application, you must have a valid temporary resident status in Canada that "
                                          "authorizes you to work in Canada, that is, a temporary foreign worker permit."),
                   "url": AB_AOS_ELIG_URL},
    },
    "ab-accelerated-tech": FITS_OPEN_ALL,
    "ab-dedicated-health-care": FITS_OPEN_ALL,
    "ab-law-enforcement": FITS_OPEN_ALL,
    "ab-tourism-hospitality": {
        "student": AB_THS_LMIA_ONLY, "pgwp": AB_THS_LMIA_ONLY, "lmia": FIT_YES, "open": AB_THS_LMIA_ONLY,
        "abroad": {"can": "no", "quote": ("be living and working in Alberta in an eligible occupation for an approved Tourism "
                                          "and Hospitality employer;"), "url": AB_THS_ELIG_URL},
    },
    "ab-rural-renewal": {"student": FIT_AFTER, "pgwp": FIT_YES, "lmia": FIT_YES, "open": FIT_YES, "abroad": FIT_YES},
    # 卑诗七条:学签期间的工不算经验,毕业工签能走
    "bc-skilled-worker": FITS_GRAD, "bc-health-authority": FITS_GRAD, "bc-healthcare": FITS_GRAD, "bc-childcare": FITS_GRAD,
    "bc-veterinary": FITS_GRAD, "bc-construction-trades": FITS_GRAD, "bc-french-teachers": FITS_GRAD,
    # 萨省
    "sk-employment-offer": FITS_GRAD, "sk-health-talent": FITS_GRAD, "sk-agriculture-talent": FITS_GRAD,
    "sk-tech-talent": {
        "student": {"can": "after", "schools": SK_TECH_SCHOOLS, "quote": SK_TECH_QUOTE, "url": SK_TECH_URL},
        "pgwp": {"can": "yes", "schools": SK_TECH_SCHOOLS, "quote": SK_TECH_QUOTE, "url": SK_TECH_URL},
    },
    "sk-existing-work-permit": {
        "student": {"can": "no", "quote": "Study permit holders are not eligible to apply under the Existing Work Permit category.",
                    "url": SK_EWP_URL},
        "pgwp": {"can": "no", "quote": ("Post-Graduation Work Permit (PGWP) and Spousal Open Work Permit holders are not "
                                        "eligible to apply under this sub-category."), "url": SK_EWP_URL},
    },
    "sk-students": {"student": SK_STUDENTS_SCHOOL, "pgwp": SK_STUDENTS_SCHOOL},
    "sk-occupation-in-demand": FITS_GRAD, "sk-express-entry": FITS_GRAD,
    # 曼省(SWO 待定未登)
    "mb-skilled-worker-in-manitoba": FITS_GRAD,
    "mb-career-employment": {
        "student": {"can": "after", "schools": [{"prov": "own"}], "quote": MB_OTHER_PROV_QUOTE, "url": MB_CEP_URL},
        "pgwp": {"can": "yes", "schools": [{"prov": "own"}], "quote": MB_OTHER_PROV_QUOTE, "url": MB_CEP_URL},
    },
    "mb-graduate-internship": {
        "student": {"can": "after", "schools": [{"prov": "own"}], "quote": MB_OTHER_PROV_QUOTE, "url": MB_GIP_URL},
        "pgwp": {"can": "yes", "schools": [{"prov": "own"}], "quote": MB_OTHER_PROV_QUOTE, "url": MB_GIP_URL},
    },
    # 安省(自雇医生交给职业筛)
    "on-workforce-priority": FITS_GRAD,
    # 新斯省(两条医生通道交给职业筛)
    "ns-skilled-worker": FITS_GRAD, "ns-construction": FITS_GRAD,
    "ns-graduate": {
        "student": {"can": "after", "schools": [{"prov": "own"}], "quote": NS_GRAD_QUOTE, "url": NS_GRAD_URL},
        "pgwp": {"can": "yes", "schools": [{"prov": "own"}], "quote": NS_GRAD_QUOTE, "url": NS_GRAD_URL},
    },
    "ns-express-entry-experience": {
        "student": {"can": "after", "schools": [{"prov": "own"}], "quote": NS_EE_QUOTE, "url": NS_EE_URL},
        "pgwp": {"can": "yes", "schools": [{"prov": "own"}], "quote": NS_EE_QUOTE, "url": NS_EE_URL},
    },
    # 新不伦瑞克(关键工人试点待定未登)
    "nb-skilled-worker": FITS_GRAD, "nb-express-entry-employment": FITS_GRAD, "nb-francophone-workers": FITS_GRAD,
    "nb-express-entry-interest": FITS_GRAD, "nb-francophones-remote": FITS_GRAD,
    "nb-francophone-priorities": {
        "student": {"can": "after", "schools": [{"prov": "own", "kind": "public"}], "quote": NB_FP_QUOTE, "url": NB_SI_URL},
        "pgwp": {"can": "yes", "schools": [{"prov": "own", "kind": "public"}], "quote": NB_FP_QUOTE, "url": NB_SI_URL},
    },
    "nb-private-college-pilot": {
        "student": {"can": "yes", "schools": [{"prov": "own", "kind": "private"}], "url": NB_PCCG_URL,
                    "quote": ("have successfully completed an eligible program of study at a participating private career "
                              "college located in New Brunswick")},
        "pgwp": {"can": "no", "url": NB_PCCG_URL,
                 "quote": "This program is for students that are not eligible for the federal post-graduation work permit (PGWP) program."},
    },
    # 纽芬兰与拉布拉多
    "nl-skilled-worker": {"student": NL_SW_NO, "pgwp": NL_SW_NO},
    "nl-international-graduate": {
        "student": {"can": "after", "schools": NL_IG_SCHOOLS, "quote": NL_IG_QUOTE, "url": NL_IG_URL},
        "pgwp": {"can": "yes", "schools": NL_IG_SCHOOLS, "quote": NL_IG_QUOTE, "url": NL_IG_URL},
    },
    "nl-express-entry-skilled-worker": FITS_GRAD,
    # 爱德华王子岛
    "pe-workforce": FITS_GRAD, "pe-occupations-in-demand": FITS_GRAD, "pe-express-entry": FITS_GRAD,
    "pe-international-graduate": {
        "student": {"can": "after", "schools": [{"prov": "own", "kind": "public"}], "quote": PE_IG_QUOTE, "url": PE_IG_URL},
        "pgwp": {"can": "yes", "schools": [{"prov": "own", "kind": "public"}], "quote": PE_IG_QUOTE, "url": PE_IG_URL},
    },
    "pe-intermediate-experience": {"student": PE_IE_NO, "pgwp": PE_IE_NO},
}
"""身份对照表(通道编号 → 身份 → 格)。2026-10-11 首批:阿省六条六种身份全登,其余八省登在读留学生与毕业工签两种。"""
