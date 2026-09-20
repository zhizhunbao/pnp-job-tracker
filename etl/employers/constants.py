"""employers.constants — 雇主池词表(三源列键 / 入门档 / 星级权重 / 归一后缀表 / IN·OUT)。

2026-08-30 立域(雇主板重构批一,设计稿 docs/design/雇主板重构-20260829.md):
一行 = 一雇主(全局表)+ 雇主×行业组分桶表;零新抓取,纯三源聚合(jobs/designated/LMIA)。
2026-09-13 Frank「八组」:桶键由本站 27 大类改为 8 行业组(noc.group_of,与把脉页同一份分组),
桶表列 broad → indGroup(DDL docs/sql/employer-pool-groups-20260913.sql);星级/水位/LMIA 归桶口径不变,只是桶更粗。
🔴 口径红线(Frank 拍死):裸 LMIA 总量永不入星不入排序(技能类才是证据);
星级权重 指定雇主 >> 在招活跃+入门可及 > 技能类 LMIA(旁证);机会参考 ≠ 资格认定。
"""
import re

import paths

IN_JOBS = paths.MART / "jobs.json"
"""在招岗事实(broad 桶/accessibility/工资列已在数据层算好)。"""

IN_COMPANIES = paths.MART / "companies.json"
"""公司维表(slug 主键、行业 sectors、region)。"""

IN_DESIGNATED = paths.MART / "designated_employers.json"
"""指定雇主名单(AIP/RCIP/FCIP,省级事实)。"""

IN_LMIA = paths.LMIA / "lmia-employers.json"
"""ESDC 正面 LMIA 雇主事实(逐 NOC 份数 + 季度;键=归一名)。"""

IN_POSTINGS = paths.PROCESSED_JOBBANK / "postings.json"
"""全史岗贴(含已下架;规模代理的历史累计岗数源)。"""

OUT_POOL = paths.MART / "employer_pool.json"
"""产出:雇主池全局表(一行=一雇主)。"""

OUT_BUCKETS = paths.MART / "employer_pool_buckets.json"
"""产出:雇主×行业组分桶表(星级住这;2026-09-13 起桶键 = 8 行业组)。"""

K_SLUG = "slug"
"""companies 主键 / jobs 外键(companySlug)。"""

K_COMPANY_SLUG = "companySlug"
"""jobs 行的公司外键。"""

K_NAME = "name"
"""雇主名。"""

K_SECTORS = "sectors"
"""companies 行业串。"""

K_REGION = "region"
"""companies 省码。"""

K_WEBSITE = "website"
"""companies 官网(规模代理:官网命中)。"""

K_BROAD = "broad"
"""jobs 行的本站大类(jobs 已算好);桶键 = noc.group_of(大类) 的行业组,LMIA/指定侧 NOC 经
noc.broad_of → group_of 同一条路归桶(2026-09-13 改切八组)。"""

GROUP_OTHER = "other"
"""未分类岗位的桶键:大类查不到行业组(NOC 未匹配)的在招/LMIA/指定线索归此桶 ——
板不提供这一组,但雇主的事实不丢(指定雇主只有未分类岗时靠它拿顶档星)。"""

GROUP_NONE = ""
"""无线索通用桶键:指定雇主既无在招、无技能 LMIA、名单也没申报 NOC 时的唯一桶(中档保底住这)。"""

K_PROVINCE = "province"
"""省码。"""

K_CITY = "city"
"""市。"""

K_DISTRICT = "district"
"""区(mart 地点段给的市内分区;近半数在招岗有)。"""

PLACE_SEP = "|"
"""指定资格所在地一条的分隔:「项目|地点」(AIP|NB、RCIP|Sudbury, ON)。"""

K_EE_CATEGORY = "eeCategory"
"""在招岗的联邦 EE 类别(mart 评分段给的中文标签;一岗属多类时「A/B」斜杠连;不属任何类 = 空)。"""

EE_SPLIT = "/"
"""一岗多个 EE 类别的分隔。"""

BROAD_UNCAT = "未分类"
"""在招岗的大类占位:职业没归进本站大类(不进雇主的在招大类清单 —— 「未分类」不是一个能筛的类)。"""

BROAD_CATEGORY = {
    "IT": "tech", "医疗": "health", "教育": "education", "金融": "finance", "会计": "professional", "法律": "professional",
    "建筑": "construction", "制造": "manufacturing", "零售": "retail", "餐饮": "hospitality", "住宿": "hospitality",
    "运输": "transport", "物流": "transport", "矿业": "energy", "农业": "agriculture", "艺术": "media", "体育": "media",
    "生活服务": "services",
}
"""在招岗大类 → 本站公司行业(私营雇主的公司分类兜底反推;2026-09-19,对照表出自设计稿
docs/design/雇主分类与搜索-20260918.md「本站公司行业」段)。**故意不全**:技工 / 工程 / 科学是工种,管理层 / 商务 / 行政 /
文员 / 销售是职能,社会服务多是非营利 —— 都说明不了「这家公司做什么生意」,不进表;一家雇主的在招大类从多到少逐个查,
第一个查得到的算数,一个都查不到 = 留空(宁可留空不瞎猜)。公司行业里的地产物业没有对应的职位大类,反推不出,只能等模型判。"""

K_STATUS = "status"
"""岗状态(池只数 open)。"""

K_ACCESSIBILITY = "accessibility"
"""经验可及档(junior/co-op/intermediate/senior/unknown)。"""

K_APPRENTICE = "apprenticeFriendly"
"""学徒/带训友好旗(入门信号之一)。"""

K_DATE_POSTED = "datePosted"
"""发布日。"""

K_TITLE = "title"
"""岗名(桶内主要职业名取频次 top)。"""

K_WAGE_MED = "wageMedAnnual"
"""年薪中位列(08 评分既有口径)。"""

K_NOCS = "nocs"
"""designated/LMIA 行的 NOC 清单/份数表。"""

K_SOURCE = "source"
"""designated 行的项目名(AIP/RCIP/FCIP)。"""

K_LOCATION = "location"
"""designated 行的地点。"""

K_QUARTERS = "quarters"
"""LMIA 行的季度表。"""

K_LAST_QUARTER = "lastQuarter"
"""LMIA 行的最近获批季。"""

K_POSITIONS_SKILLED = "positionsSkilled"
"""LMIA 行的技能类岗位数(TEER 0-3;build_lmia 已算)。"""

K_EMPLOYER = "employer"
"""postings 行的雇主名。"""

STATUS_OPEN = "open"
"""在招判词。"""

ENTRY_LEVELS = ("junior", "co-op")
"""入门可及的经验档(加 apprenticeFriendly 旗)。"""

EXP_RANK = {"junior": 1, "co-op": 1, "intermediate": 2, "senior": 3}
"""经验档位序(取桶内已知最低档;unknown 不表态不参与)。"""

SKILLED_TEER_MAX = 3
"""技能类 LMIA 判据:NOC 的 TEER ≤ 3 才算证据(裸总量永不入)。"""

LEGAL_SUFFIX_RE = re.compile(
    r"\b(ltd|ltee|ltée|limited|inc|incorporated|corp|corporation|co|llc|llp|lp|plc|ulc|gmbh)\b\.?",
    re.I)
"""公司名归一:剥法务后缀(三源同名不同写;残差留空不硬合 —— 设计稿红线)。"""

NAME_JUNK_RE = re.compile(r"[^a-z0-9一-鿿]+")
"""公司名归一:非字母数字折空格。"""

NORM_KEY_PREFIX = "n:"
"""无 slug 雇主(指定/LMIA 独有)的池键前缀(键=前缀+归一名,与 slug 空间不撞)。"""

STAR_TOP = 5
"""指定雇主 + 桶内在招(有资格又真缺人,全板最该投)。"""

STAR_ENTRY = 4
"""非指定:桶内在招 + 入门可及(应届/无经验的现实机会)。"""

STAR_MID = 3
"""指定但桶内无岗(中档保底,主动出击对象);或 在招 + 桶内技能类 LMIA 旁证。"""

STAR_LOW = 2
"""仅在招;或仅桶内技能类 LMIA 记录(做过的雇主才可能做第二次)。"""

STAR_TRACE = 1
"""其余(仅历史痕迹)。"""

TOP_TITLES_N = 2
"""桶内主要职业名取频次前 N。"""

WAGE_INDEX_BASE = 100
"""工资水位基准(=同桶同省中位;百分比整数)。"""

K_FETCHED = "fetched"
"""产出信封键:构建日。"""

PRINT_POOL_DONE_TPL = "✓ 雇主池:{pool} 雇主 · {buckets} 桶行 → {out}"
"""收口报数行。"""

PRINT_SOURCES_TPL = "装载:jobs {jobs} · companies {companies} · designated {designated} · lmia {lmia} · postings {postings}"
"""三源装载报数。"""

GUARD_MIN_POOL = 1000
"""防线:池行少于此 = 上游表缺损,不写盘(当前在招雇主 ~1.5 万)。"""

GUARD_FEW_TPL = "雇主池仅 {n} 行(< {floor})—— 上游缺损,拒绝写盘"
"""防线文案。"""

ENC_UTF8 = "utf-8"
"""读盘编码。"""

K_EMPLOYERS_TABLE = "employers"
"""LMIA 文件信封键:雇主表本体(信封另有 fetched/source 元数据)。"""

NAME_SEP = " "
"""归一名的词间分隔(折叠目标)。"""

LOCATIONS_N = 3
"""(2026-09-20 起数据层不再按它截:池行 locations 存全部在招地点,板上先出前三枚、其余格内展开 —— 截断归展示层。
Frank「那你如果隐藏了 如果用户按城市搜索,你不就收不到了吗」「在招城市,必须显示才能 搜索吧。那么就加个收起展开不就行了吗」:
原先只存前三处,Sienna 在 Ottawa / Kingston 有岗,筛这两个市却搜不到它。本常量留着只为保这段沿革,代码不再读。)
池行 locations 取在招岗最多的前几处(2026-09-13 Frank「多个地址用胶囊」;板上一行放得下三枚,其余归公司页)。"""

LOC_PROV_SEP = ", "
"""designated 行地点里「市, 省码」的分隔(2026-09-13 批二生产实拍 "Peace Liard, BC, BC":名单地点自带省码,
主场市取它时要剥掉尾巴,省码由 province 格单独给)。"""
