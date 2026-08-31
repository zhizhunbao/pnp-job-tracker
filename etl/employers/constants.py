"""employers.constants — 雇主池词表(三源列键 / 入门档 / 星级权重 / 归一后缀表 / IN·OUT)。

2026-08-30 立域(雇主板重构批一,设计稿 docs/design/雇主板重构-20260829.md):
一行 = 一雇主(全局表)+ 雇主×大类分桶表;零新抓取,纯三源聚合(jobs/designated/LMIA)。
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
"""产出:雇主×大类分桶表(星级住这)。"""

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
"""本站大类桶键(jobs 已算好;LMIA 侧经 noc.broad_of 归桶)。"""

K_PROVINCE = "province"
"""省码。"""

K_CITY = "city"
"""市。"""

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
