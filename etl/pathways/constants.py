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
    "reqStreams": ["AAIP Alberta Opportunity Stream", "AAIP (job offer & employer requirements, all streams)"],
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
    "reqStreams": ["AAIP Rural Renewal Stream", "AAIP (job offer & employer requirements, all streams)"],
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
    "reqStreams": ["BC PNP Skills Immigration (all streams)", "BC PNP Skilled Worker stream"],
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
}
"""卑诗法语教师定向(Care 类的教育组只收讲法语的中小学教师,清单 bc-education.json)。清单码带雇主行业条件:看得出雇主是学校
才挂这条通道名(2026-09-27 Frank 拍板「看得出才改判」),所以 09-28 板上暂时 0 岗 —— 通道照收,名字要在。
英文界面现显示官方原名(stream.bcEdu = Care: Education)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):门槛流同技术工人(判据见 bc-healthcare 段)。官方另写的定向邀请条件
「To receive a targeted invitation to apply, French-speaking teachers (NOC 41220 or 41221) must be employed in B.C.’s
public K-12 system and have a CLB 5 or higher in French.」没入表:法语 CLB 5 记成语言行,门槛卡会写成「英语或法语每项 CLB 5」
(把法语专项说成英法任一);门槛量尺按省全量挑职业码点名的语言行,还会把 41220 / 41221(TEER 1)的判定从「注册时不要求
语言成绩」改成 CLB 5 —— 写法待定。公立 K-12 雇主那半句由清单的雇主行业条件管(上一段)。"""

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
}
"""萨省农业人才通道(清单 sk-agri.json;带星号的码要看得出雇主在农业食品行业才挂,2026-09-27「看得出才改判」)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流 —— 本通道那条(语言 CLB 4、近 3 年内 12 个月经验;在担保雇主处
6 个月的替代路径记 experienceAlt;资格清单没有执照条款)+ 持 offer 直接申请那条。"""

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
officialName 照抄通道页标题(assess 页写作「Skilled-Worker with Existing Work Permit」,见 quote)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):同批先挂过本通道自己那条门槛流(在担保雇主处全职满 6 个月、TEER 4 / 5 的
CLB 4、执照),同日 lead 决定这批先不接,门槛流撤回、这格恢复为空(不出门槛卡)。官方原句(applicants-with-existing-work-permit
页)「Have worked for at least six-months (780 hours) of full-time (30+ hours per week) work experience in the job with the
employer that has supported you with the Employer Position Assessment, with a valid work permit.」—— cms 的门槛量尺与 TEER
粗筛按全省读门槛行、不分通道,这几行入表会给每个萨省岗多一行「在职时长 6 个月 · 判不了」、把 TEER 0-3 说成仅受理 4-5;
待量尺与引擎按通道读行之后再接(pnp 的 OUT_SK_REQ 注同记)。持 offer 直接申请那条流本来就不挂:那句原句说的是
International Skilled Worker 类,本通道属 Saskatchewan Experience 类。
2026-09-30 通道补全批一 1b 复查(立项稿第四节第 3 条「现有工签类一行门槛都没有」):cms 判定卡「个人关」的门槛量尺(tenureResult)
与「职业关」的 TEER 粗筛(teerScopes)仍按全省读门槛行,上面「待量尺与引擎按通道读行之后再接」的前提没变,本批照旧不接,报 lead。"""

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
}
"""新斯科舍默认通道。抽选:官方只按月公布 EOI 池的总选取人数(liveinnovascotia.com/eoi-selection「Nova Scotia selected the following
number of candidates from the Expression of Interest (EOI) pool」),NSNP 各流与 AIP 同一个池,这一组覆盖本省全部通道;
组名「Monthly EOI selections」是 etl 给按月行起的名字、不是官方原名(2026-09-27 Frank「NS 这个省 弹框怎么都是汇总数据」,
GEN_DRAW_STREAM 原注)。NS 紧缺空缺 / 毕业生两张表只作信号、不当通道(2026-09-24 九省通道审计)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流两条 = pnp ns-req 的全流(A 技术工人 / B 建筑 / D 在需三类共用的行:
语言两档、近 5 年 12 个月经验、执照、雇主经营 2 年)+ A 类流(高中文凭);流名照抄 ns-req。TEER 4-5 在本雇主 6 个月、工资区间
两行同日抽过又撤,这批没入表(原句与理由见 pnp OUT_NS_REQ「没抓的」)。"""

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
}
"""新斯科舍建筑(Skilled Worker 流下的子条件,清单 ns-construction.json,限建筑业雇主)。与通用岗同一组按月选取
(2026-09-27 九省体检:官方 eoi-process 页 2025-11-28 条 NSNP 各流与 AIP 同一个 EOI 池,NAMED_DRAW_STREAMS 原注)。
officialName 取官方原句里的子条件名(Construction Worker sub-criteria)。
2026-09-29 Frank「都接上,开工吧」(七省门槛卡):挂门槛流两条 = pnp ns-req 的全流 + B 类流(Critical Construction Worker
category:高中文凭或建筑业培训)。指南 B 段的语言两档与经验和全流同值(ns-req 每轮逐项对校,对不上报自校问题)。
A 类的「TEER 4-5 在本雇主 6 个月」B 段不要求 —— 这批没入表;以后加回全流时,卡片出并列经验行得排除建筑通道。"""

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

# =========================================================================
# 5. 产出行(列对齐库表 pathways;camelCase 键,mart 直通,cms 的 lib/mart 映射成 snake_case 列)
# =========================================================================

SEQ_START = 1
"""seq 从 1 起(= PATHWAYS 顺序)。"""
