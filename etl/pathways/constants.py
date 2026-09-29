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

# =========================================================================
# 2. 通道对照表(一条通道一段;注释挂官方原句出处与判读理由)
# =========================================================================

PW_AB_OPPORTUNITY = {
    "key": "ab-opportunity", "province": "AB", "program": "PNP",
    "plainZh": "AB 机会通道", "plainEn": "AB Opportunity", "plainKo": "AB 오퍼튜니티 스트림",
    "officialName": "Alberta Opportunity Stream",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Alberta Opportunity Stream"],
    "reqStreams": ["AAIP Alberta Opportunity Stream"],
    "quotaScope": "Alberta Opportunity Stream",
    "occLabels": [],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-alberta-opportunity-stream",
    "quote": ("The Alberta Opportunity Stream is for temporary foreign workers who are already working full-time in Alberta "
              "and have a full-time job offer from an Alberta employer in an eligible occupation."),
    "checked": "2026-09-28",
}
"""阿省默认通道:可提名但没挂具名清单的阿省岗落这里(排除式,不在 AAIP 不符合清单上即可)。
抽选组同名(components/pnp GEN_DRAW_STREAM 原注「AB 机会通道(官网 Alberta Opportunity Stream,抽选组同名)」);
门槛流照 GEN_REQ_STREAMS 的 AB 行(2026-09-27 门槛卡批一,Frank「用本岗通道的门槛,开工」);配额行 = aaip-processing-information
页的通道行(抽选组名小写与配额键逐字相等,前端原先靠这条隐式规则配上;这里写明,不再靠碰巧同名)。
英文界面现显示官方原名(pnp.gen.AB = Alberta Opportunity Stream),plainEn 是批二要换上的直白名。"""

PW_AB_ACCELERATED_TECH = {
    "key": "ab-accelerated-tech", "province": "AB", "program": "PNP",
    "plainZh": "AB 科技", "plainEn": "AB Tech", "plainKo": "AB 테크",
    "officialName": "Accelerated Tech Pathway",
    "boardLabel": "AB 科技", "isDefault": False,
    "drawStreams": ["Alberta Express Entry Stream – Accelerated Tech Pathway"],
    "reqStreams": ["AAIP Alberta Express Entry Stream", "AAIP Alberta Express Entry Stream — Accelerated Tech Pathway"],
    "quotaScope": "Accelerated Tech Pathway (eligible list of occupations includes jobs that support data centre needs in Alberta)",
    "occLabels": ["AB 科技"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-alberta-express-entry-stream",
    "quote": ("a job offer for an eligible tech occupation from an Alberta employer in an eligible tech industry "
              "under the Accelerated Tech Pathway."),
    "checked": "2026-09-28",
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
    "reqStreams": ["AAIP Dedicated Health Care Pathway — Non-Express Entry"],
    "quotaScope": "Dedicated Health Care Pathways",
    "occLabels": ["AB 医疗"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-application-streams",
    "quote": ("Dedicated Health Care Pathway – Qualified individuals with job offers in eligible health care professions "
              "can apply to be nominated for permanent residence in Alberta."),
    "checked": "2026-09-28",
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
    "reqStreams": ["AAIP Alberta Express Entry Stream"],
    "quotaScope": "Law Enforcement Pathway",
    "occLabels": ["AB 警务"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-alberta-express-entry-stream",
    "quote": ("a job offer from an Alberta Association of Chiefs of Police member in one of the eligible police services "
              "occupations under the Law Enforcement Pathway."),
    "checked": "2026-09-28",
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
    "reqStreams": ["AAIP Tourism and Hospitality Stream"],
    "quotaScope": "Tourism and Hospitality Stream",
    "occLabels": ["AB 旅游酒店"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-application-streams",
    "quote": ("Tourism and Hospitality Stream – Qualified candidates who live and work in Alberta and have a full-time job offer "
              "to continue working with an Alberta tourism and hospitality sector employer."),
    "checked": "2026-09-28",
}
"""阿省旅游酒店通道(清单 ab-tourism.json;雇主须属合格旅游酒店行业)。
门槛流 = 2026-09-27 同批从官方资格页补抓的五条所在的流。配额行与抽选组同名(前端原先靠隐式同名配上)。
英文界面现显示官方原名(stream.abTourism = Tourism and Hospitality Stream)。"""

PW_AB_RURAL_RENEWAL = {
    "key": "ab-rural-renewal", "province": "AB", "program": "PNP",
    "plainZh": "AB 乡村振兴", "plainEn": "AB Rural Renewal", "plainKo": "AB 농촌 재생",
    "officialName": "Rural Renewal Stream",
    "boardLabel": "AB 乡村振兴", "isDefault": False,
    "drawStreams": ["Rural Renewal Stream"],
    "reqStreams": ["AAIP Rural Renewal Stream"],
    "quotaScope": "Rural Renewal Stream",
    "occLabels": ["AB 乡村振兴"],
    "status": "open",
    "url": "https://www.alberta.ca/aaip-rural-renewal-stream",
    "quote": ("The Rural Renewal Stream empowers rural communities to recruit and retain foreign nationals to live, work and "
              "settle in their communities."),
    "checked": "2026-09-28",
}
"""阿省乡村振兴(按指定社区判:岗位城市在社区名单、职业不在它的 17 个排除码里,社区表 ab-rural.json;2026-09-24 第三批)。
配额行与抽选组同名。英文界面现显示官方原名(stream.abRural = Rural Renewal Stream)。"""

PW_BC_SKILLED_WORKER = {
    "key": "bc-skilled-worker", "province": "BC", "program": "PNP",
    "plainZh": "BC 技术工人", "plainEn": "BC Skilled Worker", "plainKo": "BC 숙련 노동자",
    "officialName": "Skilled Worker stream",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Innovate: High Economic Impact"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/skills-immigration",
    "quote": ("Through Skills Immigration, workers who meet specific eligibility criteria based on their job offer can choose "
              "to apply to the Skilled Worker or Health Authority stream."),
    "checked": "2026-09-28",
}
"""卑诗默认通道:可提名(只收 TEER 0-3,2026-09-24 九省通道审计)但不在定向清单上的卑诗岗落这里。
抽选组:BC 现行抽选只剩定向类别轮与 Innovate 这一种不限职业的轮 —— 不在定向清单上的岗只能从这一轮进,门槛是薪资或分数
(GEN_DRAW_STREAM 原注,2026-09-24 第三批 Frank「能都改完吗」)。官方原句(about-the-bc-provincial-nominee-program 页):
「The BC PNP issues High Economic Impact invitations to apply to attract top talent across all sectors, including experienced
entrepreneurs.」这一组不是本通道自己的名字(是 Innovate 类别的轮),所以抽选卡给它写通道名灰字、三语都出。
门槛卡没接(2026-09-27 只先上 AB,其余八省逐省补原句;接之前这格空 = 不出卡,与现状一致)。"""

PW_BC_HEALTH_AUTHORITY = {
    "key": "bc-health-authority", "province": "BC", "program": "PNP",
    "plainZh": "BC 卫生局", "plainEn": "BC Health Authority", "plainKo": "BC 보건 당국",
    "officialName": "Health Authority stream",
    "boardLabel": "BC 卫生局", "isDefault": False,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["BC 卫生局"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/news",
    "quote": ("The BC PNP Health Authority stream will continue to nominate qualified healthcare professionals who work in the "
              "public sector directly delivering healthcare services."),
    "checked": "2026-09-28",
}
"""卑诗卫生局通道(雇主须是省卫生局,清单 bc-health-authority.json)。抽选卡没有这条通道自己的组,不登记 = 不高亮(与现状一致)。"""

PW_BC_HEALTHCARE = {
    "key": "bc-healthcare", "province": "BC", "program": "PNP",
    "plainZh": "BC 医疗", "plainEn": "BC Health", "plainKo": "BC 보건",
    "officialName": "Care: Health",
    "boardLabel": "BC 医疗", "isDefault": False,
    "drawStreams": ["Care: Health"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["BC 医疗"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("British Columbia has a critical need for workers in key sectors of the care economy, particularly in healthcare, "
              "education, childcare, and veterinary care."),
    "checked": "2026-09-28",
}
"""卑诗医疗定向(2026 新政 Care 类的医疗组,清单 bc-health.json)。officialName 照抄邀请页的类别名(BC 的定向是类别轮,不是单独的 stream)。
英文界面现显示官方原名(stream.bcHealth = Care: Health)。"""

PW_BC_CHILDCARE = {
    "key": "bc-childcare", "province": "BC", "program": "PNP",
    "plainZh": "BC 幼教", "plainEn": "BC Childcare", "plainKo": "BC 보육",
    "officialName": "Care: Childcare",
    "boardLabel": "BC 幼教", "isDefault": False,
    "drawStreams": ["Care: Childcare"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["BC 幼教"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("Certified early childhood educators, French-speaking elementary and secondary school teachers, and veterinarians and "
              "veterinary technologists who are working toward Canadian certification will be prioritized."),
    "checked": "2026-09-28",
}
"""卑诗幼教定向(清单 bc-childcare.json)。英文界面现显示官方原名(stream.bcChildcare = Care: Childcare)。"""

PW_BC_VETERINARY = {
    "key": "bc-veterinary", "province": "BC", "program": "PNP",
    "plainZh": "BC 兽医", "plainEn": "BC Veterinary", "plainKo": "BC 수의",
    "officialName": "Care: Veterinary Care",
    "boardLabel": "BC 兽医", "isDefault": False,
    "drawStreams": ["Care: Veterinary Care"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["BC 兽医"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("Certified early childhood educators, French-speaking elementary and secondary school teachers, and veterinarians and "
              "veterinary technologists who are working toward Canadian certification will be prioritized."),
    "checked": "2026-09-28",
}
"""卑诗兽医定向(清单 bc-vet.json,2 个码)。英文界面现显示官方原名(stream.bcVet = Care: Veterinary Care)。"""

PW_BC_CONSTRUCTION_TRADES = {
    "key": "bc-construction-trades", "province": "BC", "program": "PNP",
    "plainZh": "BC 建筑技工", "plainEn": "BC Construction Trades", "plainKo": "BC 건설 기능직",
    "officialName": "Build: Construction Trades",
    "boardLabel": "BC 建筑技工", "isDefault": False,
    "drawStreams": ["Build: Construction Trades"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["BC 建筑技工"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("To see which workers may benefit from targeted invitations to apply, see the Build section of the BC PNP's "
              "selection of workers list."),
    "checked": "2026-09-28",
}
"""卑诗建筑技工定向(2026 新政 Build 类,清单 bc-construction.json)。英文界面现显示官方原名(stream.bcConstr = Build: Construction Trades)。"""

PW_BC_FRENCH_TEACHERS = {
    "key": "bc-french-teachers", "province": "BC", "program": "PNP",
    "plainZh": "BC 法语教师", "plainEn": "BC French Teachers", "plainKo": "BC 프랑스어 교사",
    "officialName": "Care: Education",
    "boardLabel": "BC 法语教师", "isDefault": False,
    "drawStreams": ["Care: Education"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["BC 法语教师"],
    "status": "open",
    "url": "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    "quote": ("Certified early childhood educators, French-speaking elementary and secondary school teachers, and veterinarians and "
              "veterinary technologists who are working toward Canadian certification will be prioritized."),
    "checked": "2026-09-28",
}
"""卑诗法语教师定向(Care 类的教育组只收讲法语的中小学教师,清单 bc-education.json)。清单码带雇主行业条件:看得出雇主是学校
才挂这条通道名(2026-09-27 Frank 拍板「看得出才改判」),所以 09-28 板上暂时 0 岗 —— 通道照收,名字要在。
英文界面现显示官方原名(stream.bcEdu = Care: Education)。"""

PW_SK_EMPLOYMENT_OFFER = {
    "key": "sk-employment-offer", "province": "SK", "program": "PNP",
    "plainZh": "SK 雇主 offer", "plainEn": "SK Employment Offer", "plainKo": "SK 고용 오퍼",
    "officialName": "International Skilled Worker: Employment Offer",
    "boardLabel": None, "isDefault": True,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": ("International Skilled Worker: Employment Offer: For high-skilled workers (occupations that typically require "
              "post-secondary education) who are not working in Saskatchewan."),
    "checked": "2026-09-28",
}
"""萨省默认通道:持萨省雇主 offer 的高技能岗(排除式,不在 Job Offer 不合格清单上即可)。
萨省这条不经 EOI 抽选(2026-09-27 bb38b884「持 offer 直接申请、不经 EOI」),没有抽选组;门槛卡没接。"""

PW_SK_HEALTH_TALENT = {
    "key": "sk-health-talent", "province": "SK", "program": "PNP",
    "plainZh": "SK 医疗", "plainEn": "SK Health", "plainKo": "SK 보건",
    "officialName": "Health Talent Pathway",
    "boardLabel": "SK 医疗", "isDefault": False,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["SK 医疗"],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": "Health Talent Pathway: For physicians, nurses and other health workers.",
    "checked": "2026-09-28",
}
"""萨省医疗人才通道(清单 sk-health.json)。萨省 Talent Pathway 不公布抽选,没有抽选组。"""

PW_SK_TECH_TALENT = {
    "key": "sk-tech-talent", "province": "SK", "program": "PNP",
    "plainZh": "SK 科技", "plainEn": "SK Tech", "plainKo": "SK 테크",
    "officialName": "Innovation and Tech Talent Pathway",
    "boardLabel": "SK 科技", "isDefault": False,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["SK 科技"],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": "Innovation and Tech Talent Pathway: For innovation and tech sector workers in 32 high-skilled occupations.",
    "checked": "2026-09-28",
}
"""萨省创新与科技人才通道(清单 sk-tech.json,32 个职业)。"""

PW_SK_AGRICULTURE_TALENT = {
    "key": "sk-agriculture-talent", "province": "SK", "program": "PNP",
    "plainZh": "SK 农业", "plainEn": "SK Agriculture", "plainKo": "SK 농업",
    "officialName": "Agriculture Talent Pathway",
    "boardLabel": "SK 农业", "isDefault": False,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["SK 农业"],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": ("Agriculture Talent Pathway: For general farm workers, nursery/greenhouse workers and workers in select food and "
              "beverage processing occupations."),
    "checked": "2026-09-28",
}
"""萨省农业人才通道(清单 sk-agri.json;带星号的码要看得出雇主在农业食品行业才挂,2026-09-27「看得出才改判」)。"""

PW_SK_EXISTING_WORK_PERMIT = {
    "key": "sk-existing-work-permit", "province": "SK", "program": "PNP",
    "plainZh": "SK 现有工签", "plainEn": "SK Existing Work Permit", "plainKo": "SK 기존 취업허가",
    "officialName": "Skilled Worker With Existing Work Permit",
    "boardLabel": "SK 现有工签", "isDefault": False,
    "drawStreams": [],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility"),
    "quote": ("Skilled-Worker with Existing Work Permit: For high-skilled foreign workers (with post-secondary education) with "
              "a valid work permit."),
    "checked": "2026-09-28",
}
"""萨省现有工签通道:不靠清单,是 mart 的规则判(具名清单都没命中、可提名的 TEER 4-5 与卡车司机岗给它;2026-09-24 九省通道审计,
Frank 批)。岗位通道名写在 mart 的 SK_EWP_LABEL,不在任何 raw/pnp 清单里 —— 自校靠 RULE_BOARD_LABELS 认它。
officialName 照抄通道页标题(assess 页写作「Skilled-Worker with Existing Work Permit」,见 quote)。"""

PW_MB_SKILLED_WORKER_IN_MANITOBA = {
    "key": "mb-skilled-worker-in-manitoba", "province": "MB", "program": "PNP",
    "plainZh": "MB 技术工人", "plainEn": "MB Skilled Worker", "plainKo": "MB 숙련 노동자",
    "officialName": "Skilled Worker in Manitoba",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Skilled Worker in Manitoba"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://immigratemanitoba.com/mpnp/skilled-worker/swm",
    "quote": ("The Skilled Worker in Manitoba (SWM) Pathway nominates applicants who have a strong connection to our province "
              "through ongoing employment and sufficient skills, education and training, work experience and official language "
              "proficiency to make an immediate and ongoing contribution to the Manitoba economy and our community at large."),
    "checked": "2026-09-28",
}
"""曼省默认通道(SWM,下面三种选取)。抽选组:etl 已把 Skilled Worker in Manitoba 那一层留作组名(2026-09-24 第三批,GEN_DRAW_STREAM 原注)。
曼省在需职业两张表只作信号、不当通道(2026-09-24 九省通道审计),不挂这里。配额:曼省只按大流(Skilled Worker)公布,
通道级只有处理天数,没有配额卡用的指标 —— 不登配额行(前端原先按组名小写配到处理天数行,卡上也不出数,效果相同)。
英文界面现显示官方原名(pnp.gen.MB = Skilled Worker in Manitoba)。"""

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
}
"""安省默认通道(2026-06 改制后只剩这一条,生效日按官方原句定为 2026-06-25)。
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
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://liveinnovascotia.com/skilled-worker",
    "quote": ("The Skilled Worker stream helps employers recruit foreign workers and recently graduated international students "
              "whose skills are needed in Nova Scotia."),
    "checked": "2026-09-28",
}
"""新斯科舍默认通道。抽选:官方只按月公布 EOI 池的总选取人数(liveinnovascotia.com/eoi-selection「Nova Scotia selected the following
number of candidates from the Expression of Interest (EOI) pool」),NSNP 各流与 AIP 同一个池,这一组覆盖本省全部通道;
组名「Monthly EOI selections」是 etl 给按月行起的名字、不是官方原名(2026-09-27 Frank「NS 这个省 弹框怎么都是汇总数据」,
GEN_DRAW_STREAM 原注)。NS 紧缺空缺 / 毕业生两张表只作信号、不当通道(2026-09-24 九省通道审计)。"""

PW_NS_CONSTRUCTION = {
    "key": "ns-construction", "province": "NS", "program": "PNP",
    "plainZh": "NS 建筑", "plainEn": "NS Construction", "plainKo": "NS 건설",
    "officialName": "Construction Worker",
    "boardLabel": "NS 建筑", "isDefault": False,
    "drawStreams": ["Monthly EOI selections"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["NS 建筑"],
    "status": "open",
    "url": "https://liveinnovascotia.com/resources/nsnp-update-four-consolidated-streams",
    "quote": ("Skilled Worker: The Construction Worker sub-criteria are the same eligibility requirements as the former Critical "
              "Construction Worker Pilot."),
    "checked": "2026-09-28",
}
"""新斯科舍建筑(Skilled Worker 流下的子条件,清单 ns-construction.json,限建筑业雇主)。与通用岗同一组按月选取
(2026-09-27 九省体检:官方 eoi-process 页 2025-11-28 条 NSNP 各流与 AIP 同一个 EOI 池,NAMED_DRAW_STREAMS 原注)。
officialName 取官方原句里的子条件名(Construction Worker sub-criteria)。"""

PW_NB_SKILLED_WORKER = {
    "key": "nb-skilled-worker", "province": "NB", "program": "PNP",
    "plainZh": "NB 技术工人", "plainEn": "NB Skilled Worker", "plainKo": "NB 숙련 노동자",
    "officialName": "New Brunswick Skilled Worker stream",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["NB Skilled Worker"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": ("https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/"
            "skilled-worker-stream.html"),
    "quote": "A pathway for foreign workers with a full-time, non-seasonal job or job offer in New Brunswick.",
    "checked": "2026-09-28",
}
"""新不伦瑞克默认通道。抽选组:2026-09-23 Frank「所以这个 NB 技术工人点进去应该哪个高亮」立(GEN_DRAW_STREAM 原注);
NB 抽选页按官方四个 stream 分组(09-23 59a808ec 跟上官网 08-31 改版)。NB 优先职业表只作信号(只认省政府招聘团直接招来的 offer)。"""

PW_NL_SKILLED_WORKER = {
    "key": "nl-skilled-worker", "province": "NL", "program": "PNP",
    "plainZh": "NL 技术工人", "plainEn": "NL Skilled Worker", "plainKo": "NL 숙련 노동자",
    "officialName": "NLPNP Skilled Worker Category",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["NLPNP + AIP (ITA batch)"],
    "reqStreams": ["NLPNP Skilled Worker Category"],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.gov.nl.ca/immigration/skilled-workers-category",
    "quote": ("The NLPNP Skilled Worker Category is a permanent residence pathway for international workers and prospective "
              "immigrants who have skills that are beneficial to the Newfoundland and Labrador labour market."),
    "checked": "2026-09-28",
}
"""纽芬兰与拉布拉多默认通道。抽选:NL 抽选卡只有一组、该组覆盖本省全部通道(NLPNP 各类与 AIP 同一 EOI 池、同一组批次;
2026-09-24 九省通道审计改判,GEN_DRAW_STREAM 原注)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流(pnp nl-req 的 Skilled Worker 流名:语言两档、资格 / 执照条文);
雇主侧三条在「NLPNP (employer criteria, all streams)」流,门槛卡按全省取,不必登记(同阿省);International Graduate 是另一类别
(持 PGWP 者只能走它或 EE 类别),不挂这里。"""

PW_PE_WORKFORCE = {
    "key": "pe-workforce", "province": "PE", "program": "PNP",
    "plainZh": "PE 劳工通道", "plainEn": "PE Workforce", "plainKo": "PE 인력 스트림",
    "officialName": "Workforce Category",
    "boardLabel": None, "isDefault": True,
    "drawStreams": ["Labour & Express Entry"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": [],
    "status": "open",
    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/supporting-a-worker-for-immigration",
    "quote": ("The Workforce Category is an employer-driven category, designed to help you fill permanent labour shortages and "
              "skill gaps in your business by supporting foreign nationals for permanent residency."),
    "checked": "2026-09-28",
}
"""爱德华王子岛默认通道(Workforce 类:Skilled Worker / Critical Worker / International Graduate / Occupations in Demand 各流)。
抽选:PE 抽选卡只有一组「Labour & Express Entry」= Workforce 各流 + PEI EE(2026-09-24 九省通道审计改判,GEN_DRAW_STREAM 原注)。"""

PW_PE_OCCUPATIONS_IN_DEMAND = {
    "key": "pe-occupations-in-demand", "province": "PE", "program": "PNP",
    "plainZh": "PE 在需职业", "plainEn": "PE in-demand", "plainKo": "PE 수요 직종",
    "officialName": "Occupations in Demand Stream",
    "boardLabel": "PE 在需职业", "isDefault": False,
    "drawStreams": ["Labour & Express Entry"],
    "reqStreams": [],
    "quotaScope": None,
    "occLabels": ["PE 在需职业"],
    "status": "open",
    "url": "https://www.princeedwardisland.ca/en/information/office-of-immigration/occupations-in-demand",
    "quote": "Occupations in Demand Stream under the PEI PNP Workforce Category",
    "checked": "2026-09-28",
}
"""爱德华王子岛在需职业(Workforce 类的一条流,清单 pe-oid.json)。与 Workforce 各流同一组抽选(2026-09-24 九省通道审计登记,
NAMED_DRAW_STREAMS 原注)。quote 是官方页的副标题(这条流属于 Workforce 类的原话)。"""

PW_AIP = {
    "key": "aip", "province": "FED", "program": "AIP",
    "plainZh": "AIP", "plainEn": "AIP", "plainKo": "AIP",
    "officialName": "Atlantic Immigration Program",
    "boardLabel": None, "isDefault": False,
    "drawStreams": ["AIP", "NLPNP + AIP (ITA batch)", "Monthly EOI selections"],
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
(与职位板 AIP 列同名),统一归批二效果图。"""

PATHWAYS = [
    PW_AB_OPPORTUNITY, PW_AB_ACCELERATED_TECH, PW_AB_DEDICATED_HEALTH_CARE, PW_AB_LAW_ENFORCEMENT,
    PW_AB_TOURISM_HOSPITALITY, PW_AB_RURAL_RENEWAL,
    PW_BC_SKILLED_WORKER, PW_BC_HEALTH_AUTHORITY, PW_BC_HEALTHCARE, PW_BC_CHILDCARE, PW_BC_VETERINARY,
    PW_BC_CONSTRUCTION_TRADES, PW_BC_FRENCH_TEACHERS,
    PW_SK_EMPLOYMENT_OFFER, PW_SK_HEALTH_TALENT, PW_SK_TECH_TALENT, PW_SK_AGRICULTURE_TALENT, PW_SK_EXISTING_WORK_PERMIT,
    PW_MB_SKILLED_WORKER_IN_MANITOBA,
    PW_ON_WORKFORCE_PRIORITY, PW_ON_EMPLOYER_JOB_OFFER_FOREIGN_WORKER, PW_ON_EMPLOYER_JOB_OFFER_INTERNATIONAL_STUDENT,
    PW_NS_SKILLED_WORKER, PW_NS_CONSTRUCTION,
    PW_NB_SKILLED_WORKER,
    PW_NL_SKILLED_WORKER,
    PW_PE_WORKFORCE, PW_PE_OCCUPATIONS_IN_DEMAND,
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
- QUOTA_STREAM_KEYS / NAMED_REQ_STREAMS / GEN_REQ_STREAMS:见阿省六段(2026-09-27 九省体检与门槛卡批一)。"""

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

# =========================================================================
# 5. 产出行(列对齐库表 pathways;camelCase 键,mart 直通,cms 的 lib/mart 映射成 snake_case 列)
# =========================================================================

SEQ_START = 1
"""seq 从 1 起(= PATHWAYS 顺序)。"""
