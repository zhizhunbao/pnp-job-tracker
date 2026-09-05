"""
mart 域函数 —— 全部行为住这(照 pnp/company 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

原六个文件 2026-08-31 批I 溶入本文件:四个步骤件(score / mart / rankings / stats)一步一段,
两个私件库(grades 档位 / visa_flag 身份预筛)各成一段;大件 build_mart 按其内部关注点拆成
七段(公司装配 / 岗位装配 / 维度表 / pnp 五表 / ee 三表 / 试点三表 / 新闻与直通表 + 落盘),
段横幅三行框 + N. 编号,与 constants.py 同名同序镜像。
**零字符串令**:字面量全住 constants(文案 *_TPL 模板、正则 *_RE、词表);JSON 边界的键
只许住 `to_*` 行构造器(方言律⑩)—— mart 一表一形共 27 张,列名即 DB 列名,**逐格顺序即
文件契约**,故行构造一律收成 to_* 一族,别处不碰键名。
**显式循环令**:禁推导/genexp/lambda;**内嵌禁令**:原 build() 里的 add_company/add_job、
build_pnp_ops_stats 里的 add、stats 里的 sponsor_of/agg/flow_of 等内嵌函数全部出户成顶层
具名函数,闭包变量收 scheme 的 XxxIn / XxxCtx;**一参令**:至多一参且禁默认值。
日志口径:域内不裸 print,报数走 log.functions.say;原来静默 pass/continue 的 catch 一律
补 err() 留痕(永不吞异常令)—— **兜底口径一格未改**:原本有 try 的软依赖照旧「坏了跳过」,
原本没 try 的硬依赖(postings/all-scored/mart 自产表)照旧直接抛,不新增静默降级。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / noc)。NOC 分类法是单一来源
(2026-08-31 Frank「noc 就叫 noc」,根上两库并成 noc/ 域):teer/broad/mid/fine 与三语名一律
`from noc.functions import …`,本域一个字不重算。
公司名归一 = names 基建叶的 norm_name(2026-08-31 收拢批:此前「aip 的 norm_name 按路径拉」
的缝拆除,连同只剩这一个消费者的 load_module_by_path 装载器与本域复制品 norm_pilot_name
——56,909 名探针证得与 aip 零差异 —— 一并退役)。
2026-08-31 **批J**(clean/ 目录退役,「谁的数据谁清洗」归户):三件**跨源**清洗溶进本文件
成第 17/18/19 段 —— clean/04c 地点(clean_job_locations)、clean/04d 薪资(clean_job_salary)、
clean/05f 试点打标(flag_job_pilot)。判据:它们对 ATS 与 JB 两源过同一套尺子,不归任何
单源域,归跨源汇装的 mart。三段**不进本域默认链**(只在 TOOLS 里),跟的是 load 域 build 链
的节奏 —— 那条链在评分/汇装之前 `--only locations` / `--only salary` / `--only pilot_flag`
逐步点名,顺序与溶解前的 04c → 04d → …→ 05f 逐位相同。
副作用一处:第 8 段的薪资兜底原来「按路径拉 clean/04d 取 apply_to」,现在直调本域第 18 段的
apply_salary_to,`MartCtx.apply_salary` 随之换成 `salary_guards`(SalaryModuleLike 退役)。
"""
import json
import re
import statistics
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import paths
from log.functions import err, say
from names.functions import norm_name
from noc.constants import SLUGS as NOC_BROAD_SLUG
from noc.functions import broad_of, classify, teer_of
from mart.constants import (
    AB_SPOT_METRICS, AB_SUMMARY_METRICS, ACC_POINTS, ACC_POINTS_DEFAULT, ACC_RULES, ACC_UNKNOWN,
    ACTIVE_BUSY, ACTIVE_MID, AGENCY_NOTE, AGENCY_RE, AGG_NEW_DAYS, AIP_PROVS, AIP_TEERS, ALL,
    AND_ABOVE_RE, ATS_EXT_TPL, ATS_LOC_TPL, AVG_DAYS_MIN_N, BC_PROC_LABEL_TPL, CITIES,
    CITIES_DONE_TPL, CITIES_OUT_TPL,
    BC_PROC_METRIC_TPL, BC_PROC_PLAIN_TPL, BC_PROC_SECTION, BENEFIT_RE, BENEFIT_WINDOW,
    BLANK_RUN_RE, BROAD_TRADES, CAREGIVER_NOCS, CATEGORY_UNCLASSIFIED, CELPIP_TAIL_RE,
    CITY_I18N_KEY_TPL, CITY_ROWS_TPL, COLON, COMMA, COMMA_SPACE_RE, COUNTRY_CANADA, COUNT_WIDTH,
    COVERAGE_COMPLETE, CO_SALARY_CUTS, DAILY_DAYS, DAILY_DONE_TPL, DAILY_MIN, DAILY_N,
    DAILY_ROWS_TPL, DAILY_SCORE_GATE, DAILY_SLUG_TPL, DATE_FMTS, DATE_FMT_ISO, DATE_FMT_LONG,
    DATE_LEN, DEDUP_KEY_TPL, DESIGNATED_DEDUP_TPL, DIGIT_RE, DRAW_KIND_DRAW, DRAW_KIND_NOTICE,
    DRAW_MAX, DRAW_MAX_WIDE, DRAW_WIDE_PROVS, EDGE_PUNCT_RE, EE_ROUNDS_URL, EMPTY_VALUES,
    EMP_DIRECT, EMP_FULL, EMP_HITS_GRADE, EMP_PERMANENT, EM_DASH, ENC_UTF8, ENRICH_KEYS, ENRICH_OK,
    EN_DASH, ERRORS_REPLACE, ESCAPE_WINDOW, FAME_BIG_OPEN, FAME_MULTI_PROV, FAME_TINY_OPEN,
    FLAG_NO_SPONSORSHIP, FLAG_PR_REQUIRED, FLOW_14D, FLOW_28D, FLOW_30D, FLOW_60D, FLOW_BLANK,
    FLOW_COUNT_TPL, FLOW_IN_TPL, FLOW_NO_POSTINGS_TPL, FLOW_SERIES_YEARS, FRONTMATTER_RE,
    FRONT_URL_RE, FSA_DISTRICT, FSA_PREFIX_LEN, GLOB_JSON, GLOB_MD, GRADE_1, GRADE_2, GRADE_3,
    GRADE_4, GRADE_5, GRID_CRS, GRID_FSW67, HYPHEN, I18N_BLANK, I18N_CITY_FILE, I18N_NOC_FILE,
    INDEMAND2, INDENT_2, IN_AIP, IN_ATS_COMPANIES, IN_COMPANY_FACTS, IN_DIFFICULTY,
    IN_DLI, IN_DRAW_STREAM_ZH, IN_EE_CATEGORIES, IN_EE_CRS, IN_EE_DRAWS, IN_EE_ELIG, IN_EE_LANG,
    IN_ENRICH, IN_EXPIRED, IN_FIELD_SOURCES, IN_FSA_TABLE, IN_IRCC_ALLOC, IN_IRCC_FLOW, IN_IRCC_PR,
    IN_IRCC_TR, IN_JD_ROOTS, IN_JOBBANK, IN_JVWS_RAW, IN_LMIA, IN_LMIA_XLSX_DIR, IN_MART_CLOSED,
    IN_MART_COMPANIES, IN_MART_JOBS, IN_MART_NOC_DESC, IN_NEWS, IN_NL_EMPLOYERS, IN_NOC_DESC,
    IN_PILOT, IN_PILOT_EMP, IN_PILOT_OCC, IN_PILOT_QUOTA, IN_PNP_DIR, IN_PNP_DRAWS, IN_PNP_STATS,
    IN_REQ_TABLES, IN_SCORED, IN_SCORE_TABLES, IN_STATCAN, IN_WAGES, ISO_PREFIX_RE, JB_EXT_PREFIX,
    JB_EXT_TPL, JB_LOC_TPL, JD_DEDUP_MIN, JD_HEAD_LEN, JD_MATCH_TPL, JD_NOISE, JOBBANK_HOST,
    JOBS_FILE, JVWS_NATIONAL, JVWS_SOURCE_NOTE, K_ACCESSIBILITY, K_ADDRESS, K_AIP, K_ALLOC,
    K_ALLOCATION, K_ANNUAL, K_ANY_TRADE, K_APPLY_URL, K_ASSESSING_UP_TO, K_AS_OF, K_ATS, K_BLOCKED,
    K_BODY_EN, K_BROAD, K_BROAD_EN, K_BROAD_KO, K_BY_CATEGORY, K_BY_NOC, K_BY_PROV, K_BY_SLUG,
    K_CAPPED_SECTORS, K_CATEGORIES, K_CATEGORY, K_CELLS, K_CITIES, K_CITY, K_CITY_RAW, K_CLOSED30D,
    K_CLOSED_AT, K_COMMITMENT_LABEL, K_COMMITMENT_MONTHS, K_COMMUNITIES, K_COMMUNITY,
    K_COMPANY_NAME, K_COMPANY_SLUG, K_COUNT, K_COUNTRY, K_DATE, K_DATE_POSTED, K_DEAD,
    K_DESCRIPTION, K_DISTRICT, K_DRAWS, K_ELIGIBILITY_FLAG, K_ELIGIBILITY_QUOTE, K_ELIGIBLE,
    K_EMPLOYER, K_EMPLOYERS, K_EMPLOYMENT_HOURS, K_EMPLOYMENT_TERM, K_ENHANCED_YTD, K_EOI_POOL,
    K_EXTERNAL_ID, K_FACTORS, K_FETCHED, K_FETCHED_AT, K_FINE, K_FINE_EN, K_FINE_KO, K_FLOW_SERIES,
    K_FOUND, K_G, K_GENERATED, K_GROUP, K_GROUP_MAX, K_HISTORY, K_HOOD, K_INVENTORY, K_ITEMS,
    K_JOBS, K_KEY, K_LABEL, K_LABEL_YEAR, K_LEVEL_TEXT, K_LMIA_LAST_QUARTER, K_LMIA_POSITIONS,
    K_LMIA_POSITIONS_SKILLED, K_LOCATION, K_MAIN, K_MEDIAN_SALARY_ANNUAL, K_MEDIAN_WAGE_ANNUAL,
    K_METRIC, K_MID, K_MID_EN, K_MID_KO, K_MOM14D, K_MOM30D, K_MONTH, K_MONTHLY, K_NAME,
    K_NAMED_JOBS, K_NET30D, K_NEW14D, K_NEW14D_PREV, K_NEW30D, K_NEW30D_PREV, K_NOC, K_NOCS,
    K_NOTICE, K_OCCUPATIONS, K_OFFICIAL_URL, K_OPEN, K_OPEN_JOBS, K_OVERLAY, K_PERCENTILE_LABEL,
    K_PER_INTAKE, K_PILOT, K_PILOT_COMMUNITY, K_PILOT_EMPLOYER, K_PILOT_OCC, K_PNP_ELIGIBLE,
    K_PNP_PR, K_PNP_STREAM, K_POOL, K_POSTING_ID, K_PRIORITY_SECTORS, K_PROCESSING, K_PROGRAM,
    K_PROV, K_PROVINCE, K_PROVINCES, K_PULSE_SCORE, K_QUARTER, K_QUARTERS, K_QUARTERS_LIST,
    K_QUOTE, K_RAW, K_REGION, K_REGISTRATIONS, K_REMAINING, K_REQUIREMENTS, K_ROWS, K_RULE, K_SAL,
    K_SALARY, K_SALARY_ANNUAL, K_SALARY_TEXT, K_SCOPE, K_SCORE, K_SCORE_RANGE, K_SEARCH_OCCUPATION,
    K_SECTION, K_SECTOR, K_SECTORS, K_SEEN_IDS, K_SELECTION_FACTORS, K_SLUG, K_SOURCE,
    K_SOURCE_LABEL, K_STAGE, K_STATUS, K_STREAM, K_STREAMS, K_STREAM_KEY, K_STUDY_FLOW, K_SUMMARY,
    K_TABLES, K_TEER, K_THROUGH_MONTH, K_TITLE, K_TR_SERIES, K_TYPE, K_UNIT, K_URL, K_VALUE,
    K_WAGE_HIGH_ANNUAL, K_WAGE_LOW_ANNUAL, K_WAGE_MED_ANNUAL, K_WEBSITE, K_WEBSITE_SOURCE, K_WEEKS,
    BRIEF_OK, FOUND_PLACES, IN_BRIEF, IN_PLACES, K_AI_BRIEF, K_AI_BRIEF_KO, K_AI_BRIEF_ZH, K_AI_FETCHED,
    K_AI_SOURCES, K_BRIEF, K_BRIEF_KO, K_BRIEF_ZH, K_SOURCES, PLACES_HIT,
    K_WIKI, K_YEAR, K_ZH, LANG_ABILITIES, LANG_PER_ABILITY, LANG_POINTS_PER_ABILITY,
    LANG_POINTS_TOTAL, LANG_POINTS_WORD, LANG_TOTAL_WORD, LMIA_HEADER_WORD, LMIA_HIT_TPL,
    LMIA_MIN_COLS, LMIA_SOURCE_NOTE, LMIA_STREAM_SEP, LMIA_STREAM_TOP, LMIA_STREAM_TPL,
    LMIA_XLSX_GLOB, LMIA_XLSX_TPL, MART_AGENCY_RE, MART_DONE_TPL, MART_EXPIRED_TPL,
    MART_LATE_SALARY_TPL, MART_SEEN_TPL, MB_ANNUAL_PROC_METRICS, MB_EOI_SECTION_TPL,
    MB_GROUP_LABEL_TPL, MB_INVENTORY_METRICS, MB_PROC_LABEL_TPL, MB_SECTION_TPL, MB_YTD_GROUPS,
    MB_YTD_TPL, METRIC_ALLOCATION, METRIC_ASSESSING, METRIC_EOI_POOL, METRIC_EOI_POOL_TOTAL,
    METRIC_NOM_ENHANCED_YTD, METRIC_PRIORITY_SECTOR, METRIC_PROCESSING_WEEKS,
    METRIC_PROC_COMMITMENT, METRIC_SIRS_POOL, MOM_MIN_PREV, MONTHS_PER_QUARTER,
    MONTH_ABBR_LEN, MONTH_LEN, MV_ADJ_MAX, MV_ADJ_MIN, MV_ADJ_SCALE, NEWS_EXCERPT_MAX,
    NEWS_FROM_PREFIX, NEWS_MAX, NEWS_NOISE, NEWS_SLUG_N_TPL, NEWS_SLUG_TPL, NL, NOC_LEN,
    NOC_MAJOR_LEN, NOC_RE, NOC_RULES, NON_CITY_PREFIXES, NON_PNP_PROV, NON_WORD_RE, NORM_RE,
    NUM_EXACT_RE, NUM_MIN_RE, NUM_RANGE_MIN_RE, NUM_RANGE_RE, OCC_ROWS_TPL, ON_RE, ON_YEAR_METRICS,
    OP_GTE, ORIGIN_ATS, ORIGIN_JOBBANK, OTTAWA_CITY, OTTAWA_CITY_LOWER, OTTAWA_CITY_NAMES,
    OTTAWA_COMMUNITIES, OTTAWA_DISTRICTS, OTTAWA_DISTRICT_KEYS, OTTAWA_JB_FSA, OUT_CITY, OUT_DAILY,
    OUT_CITY_I18N, OUT_JOBBANK, OUT_MART, OUT_MART_OPEN_IDS, OUT_OCC, OUT_RANKINGS, OUT_SCORED,
    OUT_STATS,
    PARA_SEP, PAREN_CLOSE, PAREN_OPEN, PAREN_RE, PCT_SCALE, PERCENT_SIGN, PE_DESIGNATED_URL,
    PILOT_OA_TAIL_RE, PILOT_OCC_NO, PILOT_OCC_YES,
    PILOT_TYPES, PLUS, PNP_PROV_ORDER, PNP_TYPE_INDEMAND, PNP_TYPE_INELIGIBLE,
    POSTAL_FSA_RE, POSTING_URL_RE, PRINT_INOUT_COMPANIES_TPL, PRINT_INOUT_JOBBANK_TPL,
    PRINT_LOC_ATS_TPL, PRINT_LOC_BACKFILL_TPL, PRINT_LOC_DONE_TPL, PRINT_PILOT_DONE_TPL,
    PRINT_PILOT_IN_TPL, PRINT_PILOT_MAP_TPL, PRINT_SAL_DONE_TPL, PRINT_SAL_GUARD_TPL, PROFILE_FILE,
    PROGRAM_PNP, PROVS, PROV_AB, PROV_BC, PROV_FED, PROV_FULL, PROV_MB, PROV_MISSING_MARK,
    PROV_MODE_COND, PROV_MODE_DEAD, PROV_MODE_DIRECT, PROV_NL, PROV_ON, PROV_PE, PROV_SK,
    PR_ESCAPE_RE, PULSE_ROUND, PULSE_W_MOM, PULSE_W_NAMED, PULSE_W_WAGE, QUARTERS_PER_YEAR,
    QUARTER_FILE_RE, QUARTER_MARK, QUARTER_MIN_LEN, QUOTA_BLANK, QUOTA_EMPTY_MSG, QUOTA_INT_TPL,
    QUOTA_OCC_TPL, QUOTA_PAIR_TPL, QUOTA_QUOTE_TPL, QUOTA_REQUIRED_TPL, QUOTA_URL_TPL,
    QUOTA_VALUE_KEYS, QUOTE_MAX, QUOTE_PAD, RANGE_EXACT, RANGE_MINIMUM, RANGE_RANGE, RANGE_TEXT,
    RANK_DONE_TPL, RANK_IN_TPL, RANK_KIND_COMPANY, RANK_KIND_JOB, REQ_BASIS_SEP,
    REQ_NO_PROVINCE_TPL, REQ_ROW_OVERRIDES, REQ_VALUE_CODE_TPL, SAFE_RE, SALARY_CUTS,
    SAL_ANNUAL_MAX, SAL_BIWEEK_RE, SAL_DAILY_RE, SAL_DOLLAR_TPL, SAL_EXTRA_RE, SAL_GIG_HI_MAX,
    SAL_HOURLY_FOLD_MAX, SAL_HOURLY_YR_MIN, SAL_HOUR_RE, SAL_K_DIV, SAL_K_TPL, SAL_MONEY_RE,
    SAL_MONTHLY_YR_MIN, SAL_MONTH_WORD, SAL_MULT, SAL_NUM_RE, SAL_ONE_TPL, SAL_PAREN_MONEY_RE,
    SAL_PER_UNIT_RE, SAL_PLAIN_OK, SAL_RANGE_TPL, SAL_RATIO_MAX, SAL_SUB, SAL_UNIT_BIWK,
    SAL_UNIT_DAY, SAL_UNIT_HR, SAL_UNIT_MO, SAL_UNIT_WK, SAL_UNIT_YR, SAL_WEEK_WORD, SAL_WORD_RE,
    SCALE_CRS, SCOPE_CATEGORY, SCOPE_SCORE_RANGE, SCOPE_SECTOR, SCOPE_STAGE, SCOPE_STREAM,
    SCORE_DONE_TPL, SCORE_FACTOR_KINDS, SCORE_INDEMAND, SCORE_KIND_ROW, SCORE_KIND_RULE, SCORE_MAX,
    SCORE_NAMED_STREAM, SCORE_NOT_AGENCY, SCORE_OUTSIDE_ON, SCORE_RULE_KEYS, SCORE_TEER_TPL,
    SCORE_UNCLASSIFIED, SEARCH_NOC_RE, SEP_ZH, SKIP_SLUGS, SK_ALLOCATION_METRICS,
    SK_CAPPED_METRICS, SK_PROC_LABEL_TPL, SLASH, SLUG_DAILY_TOP, SLUG_DASH, SLUG_FALLBACK,
    SLUG_MAX, SLUG_RE, SLUG_SPONSOR_LIKELY, SLUG_UNKNOWN, SLUG_WEEKLY_TOP, SNAKE_RE, SOURCE_AIP,
    SOURCE_JOB_BANK, SOURCE_PRETTY, SOURCE_RCIP, SPACE, SPONSOR_COUNT_TPL, SPONSOR_DONE_TPL,
    SPONSOR_IN_TPL, SPONSOR_N, SPONSOR_NO_QUARTER, SPONSOR_RATE_ROUND, SPONSOR_RECENT_Q,
    SPONSOR_SKILLED_HIGH, SPONSOR_STALE_Q, STATS_IN_TPL, STATS_NEW_DAYS, STATS_ROWS_TPL,
    STATUS_CLOSED, STATUS_OPEN, STREAM_CLASH_TPL, STREAM_KEY_FIX, SUBJECT_APPLICANT,
    TABLE_COUNT_TPL, TABLE_FILE_TPL, TABLE_NAME_WIDTH, TEER_BASE, TEER_LABEL_TPL, TEER_NONE_SORT,
    TEER_SKILLED, TEER_SKILLED_MAX, TIER_BOTH, TIER_EE, TIER_EMPLOYER, TIER_FED, TIER_PROV,
    TOP_CITIES_N, TOTAL_WORD, TRIM_SPACE_COMMA, TR_SERIES_YEARS, TR_STOCK_KEYS, UNDERSCORE,
    UNIT_APPLICATIONS, UNIT_DAYS, UNIT_FLAG, UNIT_MONTHS, UNIT_NOMINATIONS, UNIT_PEOPLE,
    UNIT_SPOTS, UNIT_TEXT, UNIT_WEEKS, UNIVERSAL_DIRECT_PROVS, UNIVERSAL_PROVS, UTC_OFFSET, UTC_Z,
    VISA_RULES, WAGE_NATIONAL, WEEKLY_DAYS, WEEKLY_DONE_TPL, WEEKLY_N, WORD_BOUND_TPL, WP_TAIL_RE,
    WS_RE, YEAR_END_TPL, YEAR_LEN, YEAR_START_TPL,
)
from mart.scheme import (
    AddJobIn, ApplyLocIn, ApplySalaryIn, AtsExtIn, AtsJobIn, AvgDaysIn, BasisIn, CatI18nIn,
    ChannelTierIn, CityBuildIn, CityRowIn, CityStatsIn, CityStatsRowIn, ClosedDaysIn, ClosedJobIn,
    CollectedJob, ColumnIn, CompanyAgg, CompanyDetailIn, CompanyExtraIn, CompanyGradesIn,
    CompanyGradesOut, CompanyRowIn, CutsIn, DailyRowIn, DifficultyIn, DirectOfIn, DistrictRowIn,
    DliRowIn, DrawBaseIn, DrawRowIn, DrawsBuildIn, EeCategoryIn, EeDrawIn, EeDrawsOut, EePointsIn,
    EePointsRowIn, ExpandAppliesIn, FactorBaseIn, FieldValuesIn, FillSalaryIn, FlowAddIn,
    FlowFinishIn, FlowOfIn, FlowRec, FlowStatsOut, FlowWindows, GradeActiveIn, GradeCellIn,
    GradeChannelIn, GradeEmpIn, GradeFameIn, GradeSalaryIn, GradeSponsorIn, JbExtIn, JbLocIn,
    JdFlagIn, JobDetailIn, JobGradesIn, JobGradesOut, JobRowIn, LangCellIn, LmiaFillIn,
    LmiaWindows, LocKeptOut, MartCtx, MbAnnualIn, MbBlockIn, MomIn, MoneyIn,
    MoneyTextIn, MvScoreIn, NewsExcerptIn, NewsRowIn, NewsSlugIn, NlEmployerIn, NocDescIn,
    NocDescRowIn, NocOpeningIn, NocOpeningsIn, NoticeRowIn, NumericRangeOut,
    OccBaseIn, OccBuildIn, OccNationalIn, OccRowIn, OpsCtx, OpsProvIn, OpsRowIn, OpsRowOut,
    OttawaLocIn, PilotEmployerIn, PilotFlagIn, PilotOccIn, PilotQuotaIn, PilotRowIn, PilotTally,
    PilotVerdictOut, PnpJudgeIn, PnpMergeIn, PnpOccIn, PnpStreamBucketIn, PnpStreamIn, PnpTables,
    ProvFillIn, ProvListIn, ProvinceRowIn, QuarterSumIn, QuotaRowIn, RankJobRowIn, RankNamesIn,
    ReqRowIn, SalaryGuards, SalaryOut, SalaryParseIn, SalaryTally, SalaryTickIn, SalaryUnitIn,
    SayCountsIn, ScoreFactorIn, ScoreIn, ScoreRuleIn, ScoredRowIn, SourceLabelIn, SponsorAgg,
    SponsorAggIn, SponsorBuildIn, SponsorBumpIn, SponsorCellIn, SponsorOfIn, SponsorRowIn,
    SponsorSourcesOut, SponsorValueIn, StatValIn, StatValOut, StatsAggIn, StatsBuildIn,
    StatsCountsIn, StatsRowIn, StockCellIn, StudyFlowIn, SubBaseIn, TableWriteIn, TrRefIn,
    TrRefOut, TrSeriesCellIn, UnitFixIn, VisaEscapeIn, VisaFlagOut, VisaQuoteIn, WageOfIn,
)


# =========================================================================
# 1. 共享词汇(≥2 段消费:读盘 / 归一 / 落盘 / 报数的公共件)
# =========================================================================


def read_table(path: Path) -> dict:
    """读一份 JSON 表(顶层是对象)。

    **硬依赖档**:读不动就抛 —— all-scored / wages / postings 台账 / mart 自产表这类源坏了,
    本轮就该当场炸,不许静默出一张空表把生产数据洗掉(空灌事故防线,同 build_pilot_quota)。
    """
    return json.loads(path.read_text(encoding=ENC_UTF8))


def read_rows(path: Path) -> list:
    """读一份 JSON 清单(顶层是数组);硬依赖档,口径同 read_table。"""
    return json.loads(path.read_text(encoding=ENC_UTF8))


def read_table_soft(path: Path) -> dict:
    """读一份 JSON 表;读不动/解析不了 → 空 dict + err 留痕。

    **软依赖档**:「单省表坏了不拖垮整个 mart」的那一族(原各处 `except: continue` /
    `except: d = {}`)。全溶前各调用点的兜底写法有三种(跳过本文件 / 空 dict / 空清单),
    对同一份坏表的**产出完全一致**(空表读下去自然出 0 行),批I 收敛成这一种:
    空 dict 让调用方照常往下走,该 0 行的地方还是 0 行,不必在每处重写一遍 try。
    """
    try:
        return json.loads(path.read_text(encoding=ENC_UTF8))
    except Exception as e:  # noqa: BLE001 — 软依赖档:哪种解析错都只该跳过本表,不拖垮整轮
        err(path, e)
        return {}


def slugify(s: str) -> str:
    """任意文本 → URL 段(小写、非字母数字压连字符、去首尾连字符、≤60 字;空则兜底 'company')。"""
    cut = SLUG_RE.sub(SLUG_DASH, (s or "").lower()).strip(SLUG_DASH)[:SLUG_MAX]
    if cut:
        return cut
    return SLUG_FALLBACK


def norm_title(t: str) -> str:
    """标题归一(只留小写字母数字)—— `company-slug|title` 展示去重的键。"""
    return NORM_RE.sub("", (t or "").lower())


def guess_prov(loc: str) -> str:
    """地点文本明写 Ontario/ON → 'ON';否则空串(宁可留空不猜)。"""
    if ON_RE.search(loc or ""):
        return PROV_ON
    return ""


def iso_date(v: object) -> str | None:
    """日期串归一 ISO(YYYY-MM-DD)。

    认:ISO(原样截十位)/「June 26, 2026」(Job Bank 展示格式);认不出=原样保留(宁可不猜)。
    """
    s = ""
    if v is not None:
        s = str(v).strip()
    if not s:
        return None
    if ISO_PREFIX_RE.match(s):
        return s[:DATE_LEN]
    try:
        return datetime.strptime(s, DATE_FMT_LONG).date().isoformat()
    except ValueError:
        return s


def parse_posted(s: str | None) -> date | None:
    """postings.json 的 date 字段:「August 06, 2026」或已是「YYYY-MM-DD」;缺格/认不出都给 None。

    (与 jobbank/verify_jobbank_expired.py 同一套解法 —— 两域各自声明,不跨域借函数。)
    """
    text = (s or "").strip()
    for fmt in DATE_FMTS:
        raw = text
        if fmt == DATE_FMT_ISO:
            raw = text[:DATE_LEN]
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def parse_iso_date(s: str | None) -> date | None:
    """last_seen(「2026-08-06T17:34:52Z」)/ closedAt(ISO 带时区)都只取日期部分;
    缺格/认不出都给 None(源是外来 JSON,这两格可能压根没有)。"""
    head = (s or "")[:DATE_LEN]
    try:
        return date.fromisoformat(head)
    except ValueError:
        return None


def median_or_none(vals: list) -> int | None:
    """一列数的中位(四舍五入);全空/无数值样本 = None(不折 0)。"""
    xs = []
    for v in vals:
        if isinstance(v, (int, float)):
            xs.append(v)
    if not xs:
        return None
    return round(statistics.median(xs))


def write_mart_table(x: TableWriteIn) -> None:
    """一张 mart 表原子落盘(tmp + replace,paths.write_json 代劳 —— Errno 22 有界重试同款)。

    原 09 自己拼 `.<表>.json.tmp` 再 replace:直写遇并发跑汇装(手动 exec × 每小时例行轮)
    会截断失败留尾部垃圾 —— 2026-07-18 news.json 实撞;load 域上传前验 JSON 是**下游**防线,
    这里断根。收编进 paths 的原子写后语义不变,只是临时名换成 paths 那套(`<表>.json.tmp`)。
    """
    for table, rows in x.tables.items():
        paths.write_json(paths.WriteJsonIn(path=x.out_dir / TABLE_FILE_TPL.format(table=table),
                                           payload=rows, indent=INDENT_2))


def say_table_counts(x: SayCountsIn) -> None:
    """收尾逐表报行数(etl 版四道闸地基:行数异常当场看得见,不静默入库)。"""
    for table, rows in x.tables.items():
        say(TABLE_COUNT_TPL.format(table=table.ljust(x.width), n=str(len(rows)).rjust(COUNT_WIDTH)))


# =========================================================================
# 2. 档位库:职位三维档(E12-08,2026-07-20 Frank 拍板)
# =========================================================================


def grade_channel(x: GradeChannelIn) -> dict:
    """移民通道:5=省具名清单命中 · 4=TEER0-3 且紧缺段 · 3=TEER0-3 · 2=低 TEER 但在紧缺通道清单 · 1=其余/未分类。"""
    if x.pnp_stream:
        return to_grade(GradeCellIn(g=GRADE_5, v=x.pnp_stream))
    if x.teer is not None and x.teer <= TEER_SKILLED_MAX:
        if x.noc and x.noc[:NOC_MAJOR_LEN] in INDEMAND2:
            return to_grade(GradeCellIn(g=GRADE_4, v=TEER_LABEL_TPL.format(teer=x.teer)))
        return to_grade(GradeCellIn(g=GRADE_3, v=TEER_LABEL_TPL.format(teer=x.teer)))
    label = ""
    if x.teer is not None:
        label = TEER_LABEL_TPL.format(teer=x.teer)
    if x.pnp_eligible:
        return to_grade(GradeCellIn(g=GRADE_2, v=label))
    return to_grade(GradeCellIn(g=GRADE_1, v=label))


def grade_salary(x: GradeSalaryIn) -> dict | None:
    """薪资质量(vs 官方中位 %):≥+20→5 · +5~20→4 · ±5→3 · -15~-5→2 · <-15→1;无中位/无薪资=None 不评。"""
    if not x.salary_annual or not x.wage_med_annual:
        return None
    pct = round((x.salary_annual / x.wage_med_annual - 1) * PCT_SCALE)
    return to_grade(GradeCellIn(g=grade_of_cuts(CutsIn(pct=pct, cuts=SALARY_CUTS)), v=pct))


def grade_of_cuts(x: CutsIn) -> int:
    """按「从高到低的 (割点, 档) 表」取第一个够得着的档;全够不着落最低档(原五连三目退役)。"""
    for cut, g in x.cuts:
        if x.pct >= cut:
            return g
    return GRADE_1


def grade_emp(x: GradeEmpIn) -> dict:
    """雇佣质量:永久/全职/直发 三命中→5 · 两→4 · 一→2 · 零→1(跳 3 档;未标注项不计入命中)。"""
    hits = []
    if x.term == EMP_PERMANENT:
        hits.append(EMP_PERMANENT)
    if x.hours == EMP_FULL:
        hits.append(EMP_FULL)
    if x.direct:
        hits.append(EMP_DIRECT)
    return to_grade(GradeCellIn(g=EMP_HITS_GRADE[len(hits)], v=hits))


def job_grades(x: JobGradesIn) -> JobGradesOut:
    """返回 (通道档, score_detail jsonb)。通道档单列下发主表「通道」列;明细走额度 API。"""
    ch = grade_channel(GradeChannelIn(noc=x.noc, teer=x.teer, pnp_stream=x.pnp_stream,
                                      pnp_eligible=x.pnp_eligible))
    sal = grade_salary(GradeSalaryIn(salary_annual=x.salary_annual, wage_med_annual=x.wage_med_annual))
    emp = grade_emp(GradeEmpIn(term=x.term, hours=x.hours, direct=x.direct))
    return JobGradesOut(channel=ch[K_G], detail=to_job_grade_detail(
        JobDetailIn(channel=ch, salary=sal, emp=emp)))


# =========================================================================
# 3. 档位库:公司四维档(E12-08)
# =========================================================================


def quarters_ago(q: str | None) -> int | None:
    """'2025Q4' → 距今几个季度;解析失败 None。"""
    text = ""
    if q:
        text = str(q)
    if not text or len(text) < QUARTER_MIN_LEN or QUARTER_MARK not in text.upper():
        return None
    try:
        y, qn = text.upper().split(QUARTER_MARK)
        today = date.today()
        cur = today.year * QUARTERS_PER_YEAR + (today.month - 1) // MONTHS_PER_QUARTER
        return cur - (int(y) * QUARTERS_PER_YEAR + int(qn) - 1)
    except Exception:  # noqa: BLE001 — 季度串是外来文本,任何解析错都只该退成「判不出」
        return None


def grade_sponsor(x: GradeSponsorIn) -> dict | None:
    """担保记录:5=技能类≥5 且近 4 季 · 4=技能类 1-4 且近 · 3=有记录但仅低薪/较旧(或 AIP 指定无 LMIA)· 2=仅很旧;
    全无记录且非 AIP=None 不评(无记录≠不担保,语义红线)。"""
    skilled = 0
    if x.skilled:
        skilled = x.skilled
    total = 0
    if x.total:
        total = x.total
    qa = quarters_ago(x.last_quarter)
    recent = qa is not None and qa <= SPONSOR_RECENT_Q
    if total <= 0:
        if x.aip:
            return to_grade(GradeCellIn(g=GRADE_3, v=to_sponsor_aip_value()))
        return None
    v = to_sponsor_value(SponsorValueIn(skilled=skilled, total=total,
                                        quarter=x.last_quarter, aip=x.aip))
    if skilled >= SPONSOR_SKILLED_HIGH and recent:
        return to_grade(GradeCellIn(g=GRADE_5, v=v))
    if skilled >= 1 and recent:
        return to_grade(GradeCellIn(g=GRADE_4, v=v))
    if recent or (qa is not None and qa <= SPONSOR_STALE_Q):
        return to_grade(GradeCellIn(g=GRADE_3, v=v))
    return to_grade(GradeCellIn(g=GRADE_2, v=v))


def grade_active(x: GradeActiveIn) -> dict:
    """在库活跃度:5=≥20 且近 30 天有新 · 4=≥20 或 5-19+新 · 3=5-19 · 2=1-4 · 1=0。"""
    if x.open_jobs >= ACTIVE_BUSY and x.new30 > 0:
        g = GRADE_5
    elif x.open_jobs >= ACTIVE_BUSY or (x.open_jobs >= ACTIVE_MID and x.new30 > 0):
        g = GRADE_4
    elif x.open_jobs >= ACTIVE_MID:
        g = GRADE_3
    elif x.open_jobs >= 1:
        g = GRADE_2
    else:
        g = GRADE_1
    return to_grade(GradeCellIn(g=g, v=to_active_value(x)))


def grade_co_salary(avg_pct: float | None) -> dict | None:
    """薪资水平(该司帖面 vs 同 NOC 中位的均值 %):≥+10→5 · +3~10→4 · ±3→3 · -10~-3→2 · <-10→1;无样本=None。"""
    if avg_pct is None:
        return None
    pct = round(avg_pct)
    return to_grade(GradeCellIn(g=grade_of_cuts(CutsIn(pct=pct, cuts=CO_SALARY_CUTS)), v=pct))


def grade_fame(x: GradeFameIn) -> dict:
    """规模知名度:5=维基+多省 · 4=维基 · 3=多省或在库 ≥50 · 2=常规 · 1=极小(在库 ≤1 且单省)。

    (割点表「累计岗」以在库岗数为代理 —— mart 无历史累计,注记于此。)
    """
    multi = x.provinces >= FAME_MULTI_PROV
    if x.wiki and multi:
        g = GRADE_5
    elif x.wiki:
        g = GRADE_4
    elif multi or x.open_jobs >= FAME_BIG_OPEN:
        g = GRADE_3
    elif x.open_jobs <= FAME_TINY_OPEN:
        g = GRADE_1
    else:
        g = GRADE_2
    return to_grade(GradeCellIn(g=g, v=to_fame_value(x)))


def company_grades(x: CompanyGradesIn) -> CompanyGradesOut:
    """返回 (担保档(药丸用,可 None), score_detail jsonb 四维)。"""
    sp = grade_sponsor(GradeSponsorIn(skilled=x.skilled, total=x.total,
                                      last_quarter=x.last_quarter, aip=x.aip))
    detail = to_company_grade_detail(CompanyDetailIn(
        sponsor=sp,
        active=grade_active(GradeActiveIn(open_jobs=x.open_jobs, new30=x.new30)),
        salary=grade_co_salary(x.avg_pct),
        fame=grade_fame(GradeFameIn(wiki=x.wiki, provinces=x.provinces, open_jobs=x.open_jobs))))
    grade = None
    if sp:
        grade = sp[K_G]
    return CompanyGradesOut(sponsor=grade, detail=detail)


def to_grade(x: GradeCellIn) -> dict:
    """一格档位的落盘形:jsonb 只存 {g: 档, v: 原始值}(依据句由前端按 维度×档 走 i18n 三语生成,
    数据层不存文案)。"""
    return {"g": x.g, "v": x.v}


def to_job_grade_detail(x: JobDetailIn) -> dict:
    """职位三维 score_detail jsonb(键序即前端拆解层的读取契约)。"""
    return {"channel": x.channel, "salary": x.salary, "emp": x.emp}


def to_company_grade_detail(x: CompanyDetailIn) -> dict:
    """公司四维 score_detail jsonb。"""
    return {"sponsor": x.sponsor, "active": x.active, "salary": x.salary, "fame": x.fame}


def to_sponsor_value(x: SponsorValueIn) -> dict:
    """担保维的 v 格(有 LMIA 记录档;AIP 位只在为真时多一格 —— 键在不在都是契约)。"""
    quarter = ""
    if x.quarter:
        quarter = x.quarter
    v = {"skilled": x.skilled, "total": x.total, "q": quarter}
    if x.aip:
        v["aip"] = True
    return v


def to_sponsor_aip_value() -> dict:
    """担保维的 v 格(AIP 指定但无 LMIA 记录档)。"""
    return {"aip": True}


def to_active_value(x: GradeActiveIn) -> dict:
    """活跃维的 v 格。"""
    return {"open": x.open_jobs, "new30": x.new30}


def to_fame_value(x: GradeFameIn) -> dict:
    """知名维的 v 格。"""
    return {"wiki": x.wiki, "provs": x.provinces, "open": x.open_jobs}


# =========================================================================
# 4. 身份预筛(GAP1③,痛点 C14/C15:JD 正文 → 红旗 + 命中原句)
# =========================================================================


def visa_quote(x: VisaQuoteIn) -> str:
    """命中处所在句(粗切),两端各扩 ~80 字,压平空白,≤180 字。"""
    a = max(0, x.start - QUOTE_PAD)
    b = min(len(x.text), x.end + QUOTE_PAD)
    return WS_RE.sub(SPACE, x.text[a:b]).strip()[:QUOTE_MAX]


def visa_escaped(x: VisaEscapeIn) -> bool:
    """PR 规则的两道假阳性护栏:后随 or 逃逸句(「…或持有效工签」)/ 前文是福利条款。"""
    if PR_ESCAPE_RE.search(x.text[x.end:x.end + ESCAPE_WINDOW]):
        return True
    return bool(BENEFIT_RE.search(x.text[max(0, x.start - BENEFIT_WINDOW):x.start]))


def detect_visa_flag(text: str) -> VisaFlagOut:
    """JD 正文 → ('no_sponsorship'|'pr_required', 命中原句) 或 (None, None)。

    精确优先宁可漏(误伤=帮雇主赶走本可投的人);「legally eligible to work in Canada」是任何
    有效工签都满足的样板句,不是排斥信号,明确不匹配 —— 命中片段本身是「合法可工作」样板句时
    跳过(SAFE_RE);PR 档再过两道护栏:后随 or 逃逸句(工签也行)、前文是福利条款不是岗位资格。
    输出带 quote=命中原句(citation 惯例,可核验)。
    """
    if not text:
        return VisaFlagOut(flag=None, quote=None)
    for pats, flag in VISA_RULES:
        for p in pats:
            m = p.search(text)
            if not m:
                continue
            if SAFE_RE.search(m.group(0)):
                continue
            if flag == FLAG_PR_REQUIRED and visa_escaped(
                    VisaEscapeIn(text=text, start=m.start(), end=m.end())):
                continue
            return VisaFlagOut(flag=flag, quote=visa_quote(
                VisaQuoteIn(text=text, start=m.start(), end=m.end())))
    return VisaFlagOut(flag=None, quote=None)


# =========================================================================
# 5. 评分:省表装载与资格判定(原 08_score 上半)
# =========================================================================


def merge_pnp_table(x: PnpMergeIn) -> None:
    """把一份省 PNP 维护表并进该省的累计桶(三种语义见 constants.PNP_TABLE_SEMANTICS)。"""
    if x.kind == PNP_TYPE_INELIGIBLE and x.overlay:
        x.bucket[K_BLOCKED].update(x.nocs)
    elif x.kind == PNP_TYPE_INELIGIBLE:
        x.bucket[K_TYPE] = PNP_TYPE_INELIGIBLE
        x.bucket[K_NOCS] = set(x.nocs)
    else:
        x.bucket[K_STREAMS].append(to_pnp_stream_bucket(PnpStreamBucketIn(
            label=x.label, nocs=x.nocs)))
        if x.bucket[K_TYPE] != PNP_TYPE_INELIGIBLE:
            x.bucket[K_NOCS].update(x.nocs)


def load_pnp_by_prov() -> dict:
    """扫 raw/pnp/*.json 按 province 归省 → {"type","nocs","blocked","streams"}(目录驱动,加省=丢一个 json)。"""
    out: dict = {}
    if not IN_PNP_DIR.exists():
        return out
    for f in sorted(IN_PNP_DIR.glob(GLOB_JSON)):
        data = read_table_soft(f)
        if data.get(K_PROGRAM, PROGRAM_PNP) != PROGRAM_PNP:
            continue
        prov = data.get(K_PROVINCE)
        nocs = set()
        for o in data.get(K_OCCUPATIONS, []):
            if o.get(K_NOC):
                nocs.add(o[K_NOC])
        if not prov or (not nocs and data.get(K_TYPE) != PNP_TYPE_INELIGIBLE):
            continue
        bucket = out.setdefault(prov, to_pnp_prov_bucket())
        merge_pnp_table(PnpMergeIn(bucket=bucket, kind=data.get(K_TYPE, PNP_TYPE_INDEMAND),
                                   overlay=bool(data.get(K_OVERLAY)), nocs=nocs,
                                   label=pnp_label_of(data)))
    return out


def pnp_label_of(data: dict) -> str:
    """一份 inclusion 表的具名通道标签(label 优先 stream,都没有=空串不挂标签)。"""
    label = data.get(K_LABEL)
    if label:
        return label
    stream = data.get(K_STREAM)
    if stream:
        return stream
    return ""


def load_named_stream_nocs(by_prov: dict) -> dict:
    """province → 具名通道 NOC 并集(score() 的 +12「省点名招」按**具名通道命中**算,与资格解耦)。"""
    out: dict = {}
    for prov, tbl in by_prov.items():
        acc: set = set()
        for st in tbl[K_STREAMS]:
            acc.update(st[K_NOCS])
        if acc:
            out[prov] = acc
    return out


def load_ee_by_noc() -> dict:
    """联邦 EE「类别抽选」清单(全国单一源)→ NOC → 类别中文标签(多类别罕见,出现则 / 连接)。"""
    acc: dict = {}
    if not IN_EE_CATEGORIES.exists():
        return {}
    data = read_table_soft(IN_EE_CATEGORIES)
    for c in data.get(K_CATEGORIES, []):
        lab = c.get(K_LABEL)
        if not lab:
            lab = c.get(K_KEY)
        for o in c.get(K_OCCUPATIONS, []):
            noc = o.get(K_NOC)
            if noc and lab and lab not in acc.setdefault(noc, []):
                acc[noc].append(lab)
    out: dict = {}
    for noc, labs in acc.items():
        out[noc] = SLASH.join(labs)
    return out


def load_pnp_tables() -> PnpTables:
    """三张表一次装载(原 08_score 三个模块级全局的收编;值与旧全局逐字同源)。"""
    by_prov = load_pnp_by_prov()
    return PnpTables(by_prov=by_prov, named_by_prov=load_named_stream_nocs(by_prov),
                     ee_by_noc=load_ee_by_noc())


def classify_title(title: str) -> str:
    """标题关键词 → NOC(用于推断 TEER 和职业紧缺度);没命中=空串。"""
    t = title.lower()
    for pat, noc in NOC_RULES:
        if re.search(pat, t):
            return noc
    return ""


def teer_of_noc(noc: str) -> int | None:
    """NOC 五位码的第 2 位 = TEER;不是五位数字码 → None。"""
    if noc and len(noc) == NOC_LEN and noc[1].isdigit():
        return int(noc[1])
    return None


def pnp_eligible(x: PnpJudgeIn) -> bool:
    """能否走雇主 offer 省提名,按省精准(不跨省套用)。魁省不属 PNP,直接排除。

    · 命中该省叠加式排除清单(NB 不受理职业)→ 一律不可,先于一切判。
    · 有 exclusion 表的省(AB/AAIP;BC/SK;ON 2026-06 改制后空排除集=全职业可):
      TEER0-5 默认都可走,清单内 NOC 不可。
    · 其余(inclusion 表省 MB/NS/NB/PE/NL):TEER0-3 粗筛通用,TEER4-5 清单命中可,
      **清单没命中也有五省普通通道兜底**(E13-09:direct=NL 拿 offer 即可;
      cond=MB/NS/NB/PE 先省内同雇主 6 个月)—— 直可/需前置的区分由 pnp_direct 承担。
    """
    if x.prov in NON_PNP_PROV:
        return False
    tbl = x.tables.by_prov.get(x.prov)
    if tbl and x.noc in tbl[K_BLOCKED]:
        return False
    if tbl and tbl[K_TYPE] == PNP_TYPE_INELIGIBLE:
        return x.teer is not None and x.noc not in tbl[K_NOCS]
    nocs = prov_nocs_of(tbl)
    if x.teer in TEER_SKILLED or x.noc in nocs:
        return True
    return x.teer is not None and x.prov in UNIVERSAL_PROVS


def prov_nocs_of(tbl: dict | None) -> set:
    """该省资格 NOC 集(没这个省的表 = 空集)。"""
    if tbl:
        return tbl[K_NOCS]
    return set()


def pnp_direct(x: PnpJudgeIn) -> bool:
    """在 pnp_eligible 之内再分档:**拿 offer 即可入池**(不需先省内工作)。

    榜A「雇主担保可提名省份」直陈行用它;eligible−direct = 「先省内工作 6 个月」灰行。
    TEER0-3 通用、排除式省默认、具名清单命中、NL 普通通道 → direct;
    仅靠 MB/NS/NB/PE 普通通道兜底的 TEER4-5 → 非 direct(cond)。
    """
    if not pnp_eligible(x):
        return False
    if x.teer in TEER_SKILLED:
        return True
    tbl = x.tables.by_prov.get(x.prov)
    if tbl and tbl[K_TYPE] == PNP_TYPE_INELIGIBLE:
        return True
    if x.noc in prov_nocs_of(tbl):
        return True
    return x.prov in UNIVERSAL_DIRECT_PROVS


def pnp_stream(x: PnpStreamIn) -> str | None:
    """命中某省 inclusion 清单时,返回该具名通道的短标签(如「OINP 紧缺技能」)。

    泛 TEER0-3 技能岗、exclusion 型省(无具名 in-demand 通道)、未命中 → None,
    前端对 None 退回泛标签/留空(宁可不具名,也不瞎贴通道名)。
    """
    tbl = x.tables.by_prov.get(x.prov)
    if not tbl:
        return None
    for s in tbl[K_STREAMS]:
        if x.noc in s[K_NOCS] and s[K_LABEL]:
            return s[K_LABEL]
    return None


def any_pr_path(x: PnpJudgeIn) -> bool:
    """该省对该职业**原则上**是否存在任一通用 PR 通道(E13-08;粗筛信号,非资格认定)。

    口径 v2(2026-08-07 深夜 Frank 拍板「排除清单口径」,v1 的 inclusion 模型被官方原句证伪):
    **九省全部存在雇主/经验锚定的普通提名通道,不看紧缺清单、不限 TEER** —— 逐省锚句见
    constants.ANY_PR_PATH_NOTE。因此判死只剩一种情形:**该省明文排除/不受理清单命中**
    (AAIP/BC/SK 排除集、NB 不受理 overlay),且联邦三路(EE / AIP / 保育专项)也救不回来。
    sector 级暂停(NS 餐饮住宿 2024-04 起)与保育专项闭门同属「暂停≠无路」,不判死只留痕。
    RCIP 社区级不进省判(站级脚注);QC 走自身体系不判死;teer=None 由调用方留空不硬判。
    """
    tbl = x.tables.by_prov.get(x.prov)
    blocked = bool(tbl) and (x.noc in tbl[K_BLOCKED]
                             or (tbl[K_TYPE] == PNP_TYPE_INELIGIBLE and x.noc in tbl[K_NOCS]))
    if not blocked:
        return True
    if x.teer in TEER_SKILLED or x.noc in x.tables.ee_by_noc:
        return True
    if x.prov in AIP_PROVS and x.teer in AIP_TEERS:
        return True
    return x.noc in CAREGIVER_NOCS


def to_pnp_prov_bucket() -> dict:
    """一个省的累计桶初值(type/nocs/blocked/streams 四格)。"""
    return {"type": PNP_TYPE_INDEMAND, "nocs": set(), "blocked": set(), "streams": []}


def to_pnp_stream_bucket(x: PnpStreamBucketIn) -> dict:
    """一条具名通道的桶(标签 + 该通道的 NOC 集)。"""
    return {"label": x.label, "nocs": x.nocs}


# =========================================================================
# 6. 评分:打分与产出(原 08_score 下半;NOC → TEER → 每 TEER 自己的评分表)
# =========================================================================


def accessibility(title: str) -> str:
    """标题 → 可及性档(co-op / junior / senior / intermediate / unknown)。"""
    t = title.lower()
    for pat, level in ACC_RULES:
        if re.search(pat, t):
            return level
    return ACC_UNKNOWN


def score(x: ScoreIn) -> int:
    """每 TEER 自己的基线 + 紧缺段 + 省点名 + 非中介 + 可及性 − 非 ON,夹到 0-100。"""
    s = SCORE_UNCLASSIFIED
    if x.teer is not None:
        s = TEER_BASE.get(x.teer, SCORE_UNCLASSIFIED)
    if x.noc[:NOC_MAJOR_LEN] in INDEMAND2:
        s += SCORE_INDEMAND
    if x.noc in x.tables.named_by_prov.get(x.prov, set()):
        s += SCORE_NAMED_STREAM
    if not x.agency:
        s += SCORE_NOT_AGENCY
    s += ACC_POINTS.get(x.acc, ACC_POINTS_DEFAULT)
    if x.prov != PROV_ON:
        s -= SCORE_OUTSIDE_ON
    return max(0, min(SCORE_MAX, s))


def collect_ats_jobs() -> list:
    """ATS 公司档(processed/<region>/companies/<slug>/)里的岗 → 待评分清单。"""
    out: list = []
    if not IN_ATS_COMPANIES.exists():
        return out
    for folder in IN_ATS_COMPANIES.iterdir():
        if not folder.is_dir() or not (folder / JOBS_FILE).exists():
            continue
        prof: dict = {}
        if (folder / PROFILE_FILE).exists():
            prof = read_table(folder / PROFILE_FILE)
        ag = bool(AGENCY_RE.search(agency_probe_of(prof)))
        for j in read_table(folder / JOBS_FILE).get(K_JOBS, []):
            out.append(CollectedJob(ext=ats_ext_of(AtsExtIn(job=j, folder=folder.name)),
                                    title=j.get(K_TITLE, ""), agency=ag,
                                    prov=guess_prov(j.get(K_LOCATION, "")), hint=""))
    return out


def agency_probe_of(prof: dict) -> str:
    """公司档里参与中介判定的两格拼一串(行业 + 公司名)。"""
    return prof.get(K_SECTORS, "") + SPACE + prof.get(K_NAME, "")


def ats_ext_of(x: AtsExtIn) -> str:
    """ATS 岗的 externalId:优先岗位 URL,没有就 `<公司目录名>:<标题>`。"""
    url = x.job.get(K_URL)
    if url:
        return url
    return ATS_EXT_TPL.format(folder=x.folder, title=x.job.get(K_TITLE, ""))


def collect_jobbank_jobs() -> list:
    """Job Bank 累积当前态里的岗 → 待评分清单(官方 NOC 优先于标题猜)。"""
    out: list = []
    if not IN_JOBBANK.exists():
        return out
    for j in read_rows(IN_JOBBANK):
        out.append(CollectedJob(ext=jobbank_ext_of(j), title=j.get(K_TITLE, ""),
                                agency=bool(AGENCY_RE.search(j.get(K_EMPLOYER, ""))),
                                prov=j.get(K_PROVINCE, ""), hint=jobbank_hint_of(j)))
    return out


def jobbank_hint_of(j: dict) -> str:
    """源自带的 NOC:详情页抽的官方 NOC 优先,退回搜索关键词里的「NOC 12345」(旧关键词模式)。"""
    noc = j.get(K_NOC)
    if noc:
        return noc
    m = SEARCH_NOC_RE.search(j.get(K_SEARCH_OCCUPATION, ""))
    if m:
        return m.group(1)
    return ""


def jobbank_posting_id(j: dict) -> str:
    """稳定 ID:posting_id 字段优先,否则从 URL 的 /jobposting/<id> 取(与 mart 汇装同一把尺子)。"""
    pid = j.get(K_POSTING_ID)
    if pid:
        return str(pid)
    m = POSTING_URL_RE.search(j.get(K_URL, ""))
    if m:
        return m.group(1)
    return ""


def jobbank_ext_of(j: dict) -> str:
    """Job Bank 岗的 externalId(`jb:<posting_id>`;取不到帖号才退回 URL)。"""
    pid = jobbank_posting_id(j)
    if pid:
        return JB_EXT_TPL.format(pid=pid)
    url = j.get(K_URL)
    if url:
        return url
    return JB_EXT_TPL.format(pid=j.get(K_POSTING_ID, ""))


def to_scored_row(x: ScoredRowIn) -> dict:
    """一条岗的评分行(externalId 为键,给 09 汇装 join)。"""
    noc = x.job.hint
    if not noc:
        noc = classify_title(x.job.title)
    teer = teer_of_noc(noc)
    acc = accessibility(x.job.title)
    judge = PnpJudgeIn(tables=x.tables, noc=noc, teer=teer, prov=x.job.prov)
    category = CATEGORY_UNCLASSIFIED
    if teer is not None:
        category = TEER_LABEL_TPL.format(teer=teer)
    return {
        "externalId": x.job.ext, "noc": noc, "category": category, "accessibility": acc,
        "score": score(ScoreIn(tables=x.tables, noc=noc, teer=teer, prov=x.job.prov,
                               acc=acc, agency=x.job.agency)),
        "pnpEligible": pnp_eligible(judge),
        "pnpStream": pnp_stream(PnpStreamIn(tables=x.tables, noc=noc, prov=x.job.prov)),
        "eeCategory": x.tables.ee_by_noc.get(noc) or None,
    }


def score_mart_jobs() -> None:
    """步骤①:NOC → TEER → 每 TEER 自己的评分表 + pnpEligible/pnpStream(processed/all-scored.json)。"""
    tables = load_pnp_tables()
    out = []
    for job in collect_ats_jobs() + collect_jobbank_jobs():
        out.append(to_scored_row(ScoredRowIn(tables=tables, job=job)))
    OUT_SCORED.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_SCORED, payload=out, indent=INDENT_2))
    say(SCORE_DONE_TPL.format(n=len(out)))
    counted = Counter()
    for o in out:
        counted[o[K_CATEGORY]] += 1
    say(SCORE_TEER_TPL.format(dist=dict(sorted(counted.items()))))


# =========================================================================
# 7. mart:公司装配(ATS/JB 公司行 + 官网富化 + LMIA 雇佣记录 + 四维档)
# =========================================================================


def load_enrich() -> dict:
    """公司官网富化(E8-04):slug → 简介/行业/官网。

    取:抓到简介的(ok)+ 找官网阶梯命中但简介待抓/抓失败的(found 带 website ——
    官网本身就有展示价值)。
    """
    out: dict = {}
    if not IN_ENRICH.exists():
        return out
    for slug, c in read_table(IN_ENRICH).items():
        if c.get(K_STATUS) == ENRICH_OK or (c.get(K_FOUND) and c.get(K_WEBSITE)):
            out[slug] = c
    return out


def load_places() -> dict:
    """Google Places 命中行:slug → 记录(官网/地址;缺文件 = 空表,历史轮次没这份也照常汇装)。"""
    out: dict = {}
    if not IN_PLACES.exists():
        return out
    for slug, c in read_table(IN_PLACES).items():
        if c.get(K_STATUS) == PLACES_HIT:
            out[slug] = c
    return out


def load_briefs() -> dict:
    """qwen 五节简介:slug → 记录(只取 ok;缺文件 = 空表)。"""
    out: dict = {}
    if not IN_BRIEF.exists():
        return out
    for slug, c in read_table(IN_BRIEF).items():
        if c.get(K_STATUS) == BRIEF_OK:
            out[slug] = c
    return out


def strip_wp_tail(s: str) -> str:
    """剥 WordPress 摘要尾巴「[…]/[...]」(源站自动截断标记,66/3492 家;Frank 2026-07-19 报障)。"""
    return WP_TAIL_RE.sub("", s)


def add_company(x: CompanyExtraIn) -> None:
    """一家公司进 companies(首次见到才建行;富化只填空,来源侧已有的不覆盖)。

    Job Bank 公司无 profile;ATS 已自带 profile 的 description/sectors 优先。
    """
    if x.slug in x.ctx.companies:
        return
    en = x.ctx.enrich.get(x.slug, {})
    for k in ENRICH_KEYS:
        if not x.extra.get(k) and en.get(k):
            x.extra[k] = en[k]
            if k == K_DESCRIPTION:
                x.extra[k] = strip_wp_tail(x.extra[k])
            if k == K_WEBSITE and en.get(K_FOUND):
                x.extra[K_WEBSITE_SOURCE] = en[K_FOUND]
    fill_places(x)
    fill_brief(x)
    x.ctx.companies[x.slug] = to_company_row(CompanyRowIn(name=x.name, slug=x.slug, extra=x.extra))


def fill_places(x: CompanyExtraIn) -> None:
    """Places 命中行只填空:官网(记来路 places)与地址;来源侧与富化已有的不覆盖。"""
    pl = x.ctx.places.get(x.slug)
    if pl is None:
        return
    if not x.extra.get(K_WEBSITE) and pl.get(K_WEBSITE):
        x.extra[K_WEBSITE] = pl[K_WEBSITE]
        x.extra[K_WEBSITE_SOURCE] = FOUND_PLACES
    if not x.extra.get(K_ADDRESS) and pl.get(K_ADDRESS):
        x.extra[K_ADDRESS] = pl[K_ADDRESS]


def fill_brief(x: CompanyExtraIn) -> None:
    """qwen 五节简介进 aiBrief 四列(有就给,库里懒检索版让位;中文缺格不落列)。"""
    br = x.ctx.briefs.get(x.slug)
    if br is None or not br.get(K_BRIEF):
        return
    x.extra[K_AI_BRIEF] = br[K_BRIEF]
    if br.get(K_BRIEF_ZH):
        x.extra[K_AI_BRIEF_ZH] = br[K_BRIEF_ZH]
    if br.get(K_BRIEF_KO):
        x.extra[K_AI_BRIEF_KO] = br[K_BRIEF_KO]
    x.extra[K_AI_SOURCES] = json.dumps(br.get(K_SOURCES, []), ensure_ascii=False)
    x.extra[K_AI_FETCHED] = br.get(K_FETCHED)


def nonempty_of(d: dict) -> dict:
    """滤掉空值的浅拷贝(键序原样保留 —— 落盘列序即契约)。"""
    out: dict = {}
    for k, v in d.items():
        if v:
            out[k] = v
    return out


def present_of(d: dict) -> dict:
    """滤掉 None 与空串的浅拷贝(岗位行的口径:False/0 是事实,要留)。"""
    out: dict = {}
    for k, v in d.items():
        if v not in EMPTY_VALUES:
            out[k] = v
    return out


def lmia_windows_of(lmia: dict) -> LmiaWindows:
    """B4 时间窗(Frank 08-08「最近一年/6个月/3个月也有价值」):官方粒度=季度,
    窗=全表最新季往回 4/2/1 季(≈近一年/近半年/最近一季);逐季明细维护表里现成,零新抓。"""
    qs: set = set()
    for e in lmia.values():
        for q in e.get(K_QUARTERS, {}):
            qs.add(q)
    ordered = sorted(qs)
    return LmiaWindows(w4=set(ordered[-4:]), w2=set(ordered[-2:]), w1=set(ordered[-1:]))


def stream_count_key(pair: tuple) -> int:
    """LMIA 项目股别按岗位数降序(原 lambda 退役)。"""
    return -pair[1]


def quarter_positions(x: QuarterSumIn) -> int:
    """窗口内各季 LMIA 获批岗位数求和。"""
    n = 0
    for q, v in x.quarters.items():
        if q in x.window:
            n += v[1]
    return n


def fill_companies_lmia(ctx: MartCtx) -> None:
    """LMIA 外劳雇佣记录(E6-02)挂进 companies。

    按 norm_name 精确匹配(3.2 统计:公司命中 18.2%,抽检零误报)。只挂 companies
    (列表 SQL 已 join companies,jobs 零改动);语义=历史事实,展示层必须带股别/季度。
    公司名归一 = names 基建叶的 norm_name(LMIA 匹配与 AIP 打标同一把尺子;2026-08-31
    收拢批抽叶,此前按路径拉 aip 文件的缝随之拆除)。
    """
    if not IN_LMIA.exists():
        return
    lmia = read_table(IN_LMIA).get(K_EMPLOYERS, {})
    windows = lmia_windows_of(lmia)
    hit = 0
    for c in ctx.companies.values():
        e = lmia.get(norm_name(c.get(K_NAME, "")))
        if not e:
            continue
        c.update(to_lmia_columns(LmiaFillIn(company=c, entry=e, windows=windows)))
        hit += 1
    say(LMIA_HIT_TPL.format(hit=hit, total=len(ctx.companies), window=sorted(windows.w4)))


def load_facts_wiki() -> set:
    """知名依据 = processed/company_facts.json 的 wiki(D 批产物)。

    K 懒探索回填的 wiki 在 DB 侧,mart 不可见 —— 代理可接受:facts 文件覆盖批量查过的存量,
    懒回填增量待下轮 facts 重导;fame 档差最多 1 档。
    """
    out: set = set()
    if not IN_COMPANY_FACTS.exists():
        return out
    for slug, c in read_table_soft(IN_COMPANY_FACTS).get(K_BY_SLUG, {}).items():
        if c.get(K_WIKI):
            out.add(slug)
    return out


def aggregate_company_jobs(jobs: list) -> dict:
    """在库岗按公司聚合(公司四维档的分母:在招数/近 30 天新发/薪资分位样本/覆盖省/AIP 位)。"""
    cutoff30 = (datetime.now(timezone.utc) - timedelta(days=AGG_NEW_DAYS)).date().isoformat()
    agg: dict = {}
    for j in jobs:
        a = agg.get(j[K_COMPANY_SLUG])
        if a is None:
            a = CompanyAgg(open_jobs=0, new30=0, pcts=[], provs=set(), aip=False)
            agg[j[K_COMPANY_SLUG]] = a
        a.open_jobs += 1
        if (j.get(K_DATE_POSTED) or "") >= cutoff30:
            a.new30 += 1
        if j.get(K_SALARY_ANNUAL) and j.get(K_WAGE_MED_ANNUAL):
            a.pcts.append((j[K_SALARY_ANNUAL] / j[K_WAGE_MED_ANNUAL] - 1) * PCT_SCALE)
        if j.get(K_PROVINCE):
            a.provs.add(j[K_PROVINCE])
        if j.get(K_AIP):
            a.aip = True
    return agg


def avg_pct_of(a: CompanyAgg) -> float | None:
    """该司帖面 vs 同 NOC 中位的均值 %(无样本 = None,不折 0)。"""
    if not a.pcts:
        return None
    return sum(a.pcts) / len(a.pcts)


def fill_company_grades(ctx: MartCtx) -> None:
    """E12-08 公司四维档(1-5):担保/活跃/薪资/知名 —— 全部从在库聚合 + LMIA 列现算,零新抓取。"""
    facts_wiki = load_facts_wiki()
    agg = aggregate_company_jobs(ctx.jobs)
    for slug, c in ctx.companies.items():
        a = agg.get(slug)
        if a is None:
            a = CompanyAgg(open_jobs=0, new30=0, pcts=[], provs=set(), aip=False)
        graded = company_grades(CompanyGradesIn(
            skilled=c.get(K_LMIA_POSITIONS_SKILLED), total=c.get(K_LMIA_POSITIONS),
            last_quarter=c.get(K_LMIA_LAST_QUARTER), aip=a.aip,
            open_jobs=a.open_jobs, new30=a.new30, avg_pct=avg_pct_of(a),
            wiki=slug in facts_wiki, provinces=len(a.provs)))
        c.update(to_company_grade_columns(graded))


def to_company_row(x: CompanyRowIn) -> dict:
    """companies 表的一行(slug/name 打头,其余按来源侧给的键序,空值不落列)。"""
    row = {"slug": x.slug, "name": x.name}
    row.update(nonempty_of(x.extra))
    return row


def to_ats_company_extra(prof: dict) -> dict:
    """ATS 公司档 → companies 行的补充列(键序即落盘列序)。"""
    return {"website": prof.get("website"), "email": prof.get("email"),
            "address": prof.get("address"), "sectors": prof.get("sectors"),
            "description": prof.get("description"), "region": prof.get("region"),
            "source": ORIGIN_ATS}


def to_jb_company_extra(j: dict) -> dict:
    """Job Bank 帖 → companies 行的补充列(JB 无 profile,只有这四格)。"""
    return {"website": j.get("website"), "address": j.get("address"),
            "region": j.get("province"), "source": ORIGIN_JOBBANK}


def to_lmia_columns(x: LmiaFillIn) -> dict:
    """一家公司的 LMIA 列(键序即落盘列序;lmiaPositionsSkilled = 非农业/季节股,仅榜单口径用,
    不进 DB)。

    lmiaNocs 的沿革 —— #286 职业拆分(raw nocs 字典即近两年窗口聚合,与 positions 同口径):
    JSON 串直下沉,排序归消费端。
    """
    streams = []
    for s, n in x.entry["streams"].items():
        streams.append((s.strip(), n))
    streams.sort(key=stream_count_key)
    top = []
    for s, n in streams[:LMIA_STREAM_TOP]:
        top.append(LMIA_STREAM_TPL.format(stream=s, n=n))
    qmap = x.entry.get("quarters", {})
    nocs = None
    if x.entry.get("nocs"):
        nocs = json.dumps(x.entry["nocs"], ensure_ascii=False)
    return {
        "lmiaPositions": x.entry["positions"], "lmiaLmias": x.entry["lmias"],
        "lmiaLastQuarter": x.entry["lastQuarter"],
        "lmiaStreams": LMIA_STREAM_SEP.join(top),
        "lmiaPositionsSkilled": x.entry.get("positionsSkilled", 0),
        "lmiaPositions4q": quarter_positions(QuarterSumIn(quarters=qmap, window=x.windows.w4)),
        "lmiaPositions2q": quarter_positions(QuarterSumIn(quarters=qmap, window=x.windows.w2)),
        "lmiaPositions1q": quarter_positions(QuarterSumIn(quarters=qmap, window=x.windows.w1)),
        "lmiaNocs": nocs,
    }


def to_company_grade_columns(x: CompanyGradesOut) -> dict:
    """公司四维档落进 companies 行的两列。"""
    return {"sponsorGrade": x.sponsor, "scoreDetail": x.detail}


# =========================================================================
# 8. mart:岗位装配(ATS/JB 两源 → jobs 行;JD 正文下沉 + 身份预筛同一循环)
# =========================================================================


def source_label(x: SourceLabelIn) -> str:
    """来源显示标签:JB 聚合的各原始板统一显示「Job Bank」;ATS 板美化。原始 source 仍保留。"""
    if x.apply_url and JOBBANK_HOST in x.apply_url.lower():
        return SOURCE_JOB_BANK
    fallback = x.source
    if not fallback:
        fallback = EM_DASH
    return SOURCE_PRETTY.get((x.source or "").lower(), fallback)


def fill_salary(x: FillSalaryIn) -> None:
    """薪资兜底:有原文却没归一产物 → 当场补(apply_salary_to 幂等,已有值一律不动)。

    为什么需要:抓取(jobbank 容器)与建表(build 容器)并行,jobbank 整文件重写
    postings.json,落在「薪资清洗跑完 → 建表」之间的新帖就没人给它算过薪资(2026-08-05
    实撞,详见 constants.MART_LATE_SALARY_NOTE)。**mart 是最终表,它不该依赖谁先跑。**
    ⚠ 2026-08-31 批J:薪资清洗件溶进本域第 18 段后,这里从「按路径拉 clean/04d 的模块」
    改成域内直调 apply_salary_to —— 同一把尺子的字面兑现,判定一格未改。
    """
    if x.job.get(K_SALARY) and x.job.get(K_SALARY_TEXT) is None and apply_salary_to(
            ApplySalaryIn(job=x.job, guards=x.ctx.salary_guards)):
        x.ctx.late_salary += 1


def pilot_occ_of(x: PilotOccIn) -> str:
    """试点职业交叉(批C 尾巴):yes=NOC 在所在社区在收清单;no=不在(RCIP 要求 offer 职业在
    清单内,官方清单为据的负判定);''=非试点岗/该社区清单无 NOC/岗位无 NOC(判不了不硬判)。"""
    if not x.community or not x.occ_set or not x.noc:
        return ""
    if x.noc in x.occ_set:
        return PILOT_OCC_YES
    return PILOT_OCC_NO


def wage_of(x: WageOfIn) -> dict:
    """该 NOC 当地中位工资:优先省级,无则国家级(ESDC 开放数据);都没有 = 空格。"""
    wnoc = x.wages.get(x.noc, {})
    return wnoc.get(x.province) or wnoc.get(WAGE_NATIONAL) or {}


def mv_score_of(x: MvScoreIn) -> int | None:
    """#100(Frank「移民价值分一片 87」):08 基分是 5 项粗加合、**无薪资项** → TEER0/1 首发
    紧缺岗全落 87。此处补一项「薪资相对该 NOC 当地中位的分位」拉开区分度 —— 薪资是连续信号
    又直接挂钩 PNP 工资门槛/EE 分数。高于中位加分(≤+15)、低于中位减分(≥−12);
    缺薪资或缺中位则不动(宁可留空不瞎猜,与全站口径一致)。"""
    if x.base is None or not x.salary_annual or not x.wage_med_annual:
        return x.base
    adj = round(max(MV_ADJ_MIN, min(MV_ADJ_MAX, (x.salary_annual / x.wage_med_annual - 1.0) * MV_ADJ_SCALE)))
    return max(0, min(SCORE_MAX, x.base + adj))


def direct_of(x: DirectOfIn) -> bool:
    """第一方直发判定(镜像前端 isDirect):JB 渠道仅 source=='Job Bank' 算直发;ATS 天然第一方。"""
    return (JOBBANK_HOST not in x.apply_url) or (x.source == SOURCE_JOB_BANK)


def add_job(x: AddJobIn) -> None:
    """一条岗进 jobs(验尸判死的先剔、externalId 重复的丢;评分/分类/工资/档位在此层齐活)。

    datePosted 归一 ISO(2026-07-07 全站走查):Job Bank 原样是「June 26, 2026」英文串 ——
    DB date 列灌入时被 Postgres 悄悄解析所以列表没炸,但榜单/统计拿它和 ISO 做字符串比较永真
    (weekly-top 全库入池、stats 7 天新增=在招总数),前端 slice(0,10) 还截出「June 26, 2」。
    单点断根:进 jobs 之前就归一。
    """
    if x.external_id in x.ctx.expired:
        x.ctx.dropped_expired += 1
        return
    if x.external_id in x.ctx.seen_ext:
        return
    x.ctx.seen_ext.add(x.external_id)
    x.fields[K_DATE_POSTED] = iso_date(x.fields.get(K_DATE_POSTED))
    sc = x.ctx.scored.get(x.external_id, {})
    cls = classify(sc.get(K_NOC))
    community = x.fields.get(K_PILOT_COMMUNITY) or ""
    x.fields[K_PILOT_OCC] = pilot_occ_of(PilotOccIn(
        community=community, occ_set=x.ctx.pilot_occ_sets.get(community),
        noc=sc.get(K_NOC) or ""))
    w = wage_of(WageOfIn(wages=x.ctx.wages, noc=sc.get(K_NOC) or "",
                         province=x.fields.get(K_PROVINCE, "")))
    grades = job_grades(JobGradesIn(
        noc=sc.get(K_NOC) or "", teer=cls[K_TEER], pnp_stream=sc.get(K_PNP_STREAM),
        pnp_eligible=bool(sc.get(K_PNP_ELIGIBLE)),
        salary_annual=x.fields.get(K_SALARY_ANNUAL), wage_med_annual=w.get(K_ANNUAL),
        term=x.fields.get(K_EMPLOYMENT_TERM), hours=x.fields.get(K_EMPLOYMENT_HOURS),
        direct=direct_of(DirectOfIn(apply_url=x.fields.get(K_APPLY_URL, ""),
                                    source=x.fields.get(K_SOURCE)))))
    x.ctx.jobs.append(to_job_row(JobRowIn(
        external_id=x.external_id, company_slug=x.company_slug, fields=x.fields,
        scored=sc, cls=cls, wage=w, grades=grades,
        score=mv_score_of(MvScoreIn(base=sc.get(K_SCORE),
                                    salary_annual=x.fields.get(K_SALARY_ANNUAL),
                                    wage_med_annual=w.get(K_ANNUAL))))))


def collect_ats_rows(ctx: MartCtx) -> None:
    """① ATS 公司岗(processed/ats/.../companies/<slug>/)→ companies + jobs。

    循环里的顺序是硬的:**先记「见过」,再做展示去重(顺序不能倒)** —— 见过集与展示集是两件事
    (2026-08-04 数据销毁修,详见 new_mart_ctx)。
    """
    if not IN_ATS_COMPANIES.exists():
        return
    for cdir in sorted(IN_ATS_COMPANIES.iterdir()):
        if not cdir.is_dir() or cdir.name in SKIP_SLUGS:
            continue
        pf = cdir / PROFILE_FILE
        jf = cdir / JOBS_FILE
        if not (pf.exists() and jf.exists()):
            continue
        prof = read_table(pf)
        jd = read_table(jf)
        if not jd.get(K_JOBS):
            continue
        slug = prof.get(K_SLUG) or cdir.name
        add_company(CompanyExtraIn(ctx=ctx, name=prof.get(K_NAME) or slug, slug=slug,
                                   extra=to_ats_company_extra(prof)))
        ats = jd.get(K_ATS) or ORIGIN_ATS
        seen_at = datetime.fromtimestamp(jf.stat().st_mtime, tz=timezone.utc).isoformat().replace(
            UTC_OFFSET, UTC_Z)
        for j in jd[K_JOBS]:
            key = DEDUP_KEY_TPL.format(slug=slug, title=norm_title(j.get(K_TITLE, "")))
            ext = j.get(K_URL) or key
            if ext not in ctx.expired:
                ctx.seen_ids.add(ext)
            if key in ctx.seen:
                continue
            ctx.seen.add(key)
            fill_salary(FillSalaryIn(ctx=ctx, job=j))
            add_job(AddJobIn(ctx=ctx, external_id=ext, company_slug=slug,
                             fields=to_ats_job_fields(AtsJobIn(job=j, ats=ats,
                                                               website=prof.get(K_WEBSITE),
                                                               seen_at=seen_at))))


def collect_jobbank_rows(ctx: MartCtx) -> None:
    """② Job Bank(全国全职业)→ companies + jobs;中介两道过滤在此层落定。

    「见过」= 本轮源数据里还在、且没被验尸判死;与展示去重无关(顺序同 collect_ats_rows)。
    """
    if not IN_JOBBANK.exists():
        return
    for j in read_rows(IN_JOBBANK):
        if MART_AGENCY_RE.search(j.get(K_EMPLOYER, "")):
            continue
        if AGENCY_NOTE in (j.get(K_TITLE) or "").lower():
            continue
        cslug = slugify(j.get(K_EMPLOYER) or SLUG_UNKNOWN)
        key = DEDUP_KEY_TPL.format(slug=cslug, title=norm_title(j.get(K_TITLE, "")))
        ext = mart_jb_ext_of(JbExtIn(job=j, key=key))
        if ext not in ctx.expired:
            ctx.seen_ids.add(ext)
        if key in ctx.seen:
            continue
        ctx.seen.add(key)
        add_company(CompanyExtraIn(ctx=ctx, name=j.get(K_EMPLOYER) or EM_DASH, slug=cslug,
                                   extra=to_jb_company_extra(j)))
        fill_salary(FillSalaryIn(ctx=ctx, job=j))
        add_job(AddJobIn(ctx=ctx, external_id=ext, company_slug=cslug,
                         fields=to_jb_job_fields(j)))


def mart_jb_ext_of(x: JbExtIn) -> str:
    """汇装层的 Job Bank externalId(`jb:<帖号>`;取不到帖号退回帖 URL,再退回展示去重键
    —— ⚠ 与评分层 jobbank_ext_of 的最末一档不同,两处各自的历史口径,不合并)。"""
    pid = jobbank_posting_id(x.job)
    if pid:
        return JB_EXT_TPL.format(pid=pid)
    return x.job.get(K_URL) or x.key


def build_jd_index() -> dict:
    """扫已抓的 JD .md(processed/jobbank/details + processed/ats),按 frontmatter `url` 建 url→路径 索引。"""
    idx: dict = {}
    for root in IN_JD_ROOTS:
        if not root.exists():
            continue
        for p in root.rglob(GLOB_MD):
            try:
                head = p.read_text(encoding=ENC_UTF8, errors=ERRORS_REPLACE)[:JD_HEAD_LEN]
            except Exception as e:  # noqa: BLE001 — 单个 md 读不动只跳过它,不拖垮 43k 文件的索引
                err(p, e)
                continue
            m = FRONT_URL_RE.search(head)
            if m:
                idx.setdefault(m.group(1).strip(), p)
    return idx


def is_jd_noise(s: str) -> bool:
    """这一行是不是 Job Bank 页面样板噪音(帮助浮层/通用解释/免责腿;原 any(genexp) 退役)。"""
    for p in JD_NOISE:
        if p.search(s):
            return True
    return False


def clean_jd(text: str) -> str:
    """剔样板行 + 去重复长行(同一行在正文出现多次=抓取浮层伪影,首现保留)。"""
    seen: set = set()
    out: list = []
    for line in text.split(NL):
        s = line.strip()
        if s and is_jd_noise(s):
            continue
        if len(s) > JD_DEDUP_MIN:
            if s in seen:
                continue
            seen.add(s)
        out.append(line)
    return BLANK_RUN_RE.sub(PARA_SEP, NL.join(out)).strip()


def jd_body(path: Path) -> str | None:
    """读 .md → 去 frontmatter → 清样板噪音 → 正文(与 jobtext/advisor 同口径)。"""
    try:
        raw = path.read_text(encoding=ENC_UTF8, errors=ERRORS_REPLACE)
    except Exception as e:  # noqa: BLE001 — 单个 md 读不动 = 该岗没正文,不拖垮整轮
        err(path, e)
        return None
    body = FRONTMATTER_RE.sub("", raw, count=1).strip()
    return clean_jd(body) or None


def fill_jd_bodies(ctx: MartCtx) -> None:
    """JD 正文下沉到 DB:按 applyUrl 匹配已抓的 .md → job.description(seed 自动透传;列表 SQL 不读它)。

    GAP1③ 身份预筛在**同一循环**里跑(不另起脚本重扫 43k 文件 ——「拆成每字段一个脚本 =
    重复解析同一原料」反模式):「明确不担保/须 PR」红旗 + 命中原句(quote=可核验出处)。
    """
    idx = build_jd_index()
    tally = JdFlagIn(matched=0, no_sponsorship=0, pr_required=0)
    for j in ctx.jobs:
        p = idx.get(j.get(K_APPLY_URL, ""))
        if not p:
            continue
        body = jd_body(p)
        if not body:
            continue
        j[K_DESCRIPTION] = body
        tally.matched += 1
        found = detect_visa_flag(body)
        if found.flag:
            j[K_ELIGIBILITY_FLAG] = found.flag
            j[K_ELIGIBILITY_QUOTE] = found.quote
            if found.flag == FLAG_NO_SPONSORSHIP:
                tally.no_sponsorship += 1
            else:
                tally.pr_required += 1
    say(JD_MATCH_TPL.format(matched=tally.matched, total=len(ctx.jobs),
                            no_sponsorship=tally.no_sponsorship, pr_required=tally.pr_required))


def to_ats_job_fields(x: AtsJobIn) -> dict:
    """ATS 岗 → jobs 行的来源侧字段(键序即落盘列序)。"""
    return {
        "title": x.job.get("title"), "source": x.ats, "origin": ORIGIN_ATS,
        "country": x.job.get("country"),
        "province": x.job.get("province") or guess_prov(x.job.get("location", "")),
        "city": x.job.get("city"), "district": x.job.get("district"),
        "address": x.job.get("address"),
        "applyUrl": x.job.get("url"), "officialUrl": x.website,
        "salary": x.job.get("salary"), "salaryAnnual": x.job.get("salaryAnnual"),
        "salaryText": x.job.get("salaryText"),
        "aip": bool(x.job.get("aip")), "pilot": x.job.get("pilot") or "",
        "pilotCommunity": x.job.get("pilotCommunity") or "",
        "pilotEmployer": bool(x.job.get("pilotEmployer")),
        "apprenticeFriendly": False, "datePosted": x.job.get("posted"), "lastSeen": x.seen_at,
    }


def to_jb_job_fields(j: dict) -> dict:
    """Job Bank 帖 → jobs 行的来源侧字段(比 ATS 多雇佣形态 + 入职要求四格,E6-06/E6-07A)。"""
    return {
        "title": j.get("title"), "source": j.get("source") or SOURCE_JOB_BANK,
        "origin": ORIGIN_JOBBANK, "country": j.get("country"),
        "province": j.get("province") or guess_prov(j.get("city", "")),
        "city": j.get("city"), "district": j.get("district"), "address": j.get("address"),
        "applyUrl": j.get("url"), "officialUrl": j.get("website"),
        "salary": j.get("salary"), "salaryAnnual": j.get("salaryAnnual"),
        "salaryText": j.get("salaryText"),
        "aip": bool(j.get("aip")), "pilot": j.get("pilot") or "",
        "pilotCommunity": j.get("pilotCommunity") or "",
        "pilotEmployer": bool(j.get("pilotEmployer")),
        "apprenticeFriendly": bool(j.get("apprentice_friendly")),
        "datePosted": j.get("date"), "lastSeen": j.get("last_seen"),
        "employmentTerm": j.get("employment_term"), "employmentHours": j.get("employment_hours"),
        "certificates": j.get("certificates") or None, "education": j.get("education"),
    }


def to_job_row(x: JobRowIn) -> dict:
    """jobs 表的一行:externalId/companySlug 打头 → 来源侧字段(空值不落列)→ 汇装层派生列。"""
    row: dict = {"externalId": x.external_id, "companySlug": x.company_slug}
    row.update(present_of(x.fields))
    row.update({
        "sourceLabel": source_label(SourceLabelIn(apply_url=x.fields.get("applyUrl", ""),
                                                  source=x.fields.get("source", ""))),
        "wageMedHourly": x.wage.get("hourly"), "wageMedAnnual": x.wage.get("annual"),
        "wageLowHourly": x.wage.get("lowHourly"), "wageLowAnnual": x.wage.get("lowAnnual"),
        "wageHighHourly": x.wage.get("highHourly"), "wageHighAnnual": x.wage.get("highAnnual"),
        "wageYear": x.wage.get("year"),
        "noc": x.scored.get("noc") or None, "category": x.cls["teerLabel"],
        "teer": x.cls["teer"], "broad": x.cls["broad"], "mid": x.cls["mid"], "fine": x.cls["fine"],
        "accessibility": x.scored.get("accessibility") or None, "score": x.score,
        "gradeChannel": x.grades.channel, "scoreDetail": x.grades.detail,
        "pnpEligible": bool(x.scored.get("pnpEligible")),
        "pnpStream": x.scored.get("pnpStream") or None,
        "eeCategory": x.scored.get("eeCategory") or None, "status": STATUS_OPEN,
    })
    return row


# =========================================================================
# 9. mart:维度表(省/市/区/职业分类/来源/经验档/指定雇主)
# =========================================================================


def load_i18n(fname: str) -> dict:
    """#147/#151:NOC 职业名与城市名的中/韩译名(clean/04f、04g 产;**固定参考集翻一次永久用**)。

    缺文件/缺条目 = 留空,前端回退只显英文(宁可留空也不瞎猜;小镇本来就没有通行译名,不硬音译)。
    """
    p = paths.PROCESSED / fname
    if not p.exists():
        return {}
    return read_table_soft(p)


def fill_tr_stock(x: ProvFillIn) -> None:
    """E8-12 省弹框体量卡:IRCC 学签/工签/IMP 年末存量按省挂进 info。"""
    for key, out in TR_STOCK_KEYS:
        blk = x.data.get(key) or {}
        for c, v in (blk.get(K_BY_PROV) or {}).items():
            if c in x.info:
                x.info[c][out] = to_stock_cell(StockCellIn(n=v, year=blk.get(K_YEAR, "")))


def tr_ref_of(x: TrRefIn) -> TrRefOut:
    """某年的参考日与标签:年末=次年 1/1 参考日(≈12/31,asOf 标 Y-12);
    进行年=年内最新参考日(asOf 标到季度月);两者都没有 = 该年不出行。"""
    nxt = YEAR_START_TPL.format(year=int(x.year) + 1)
    if nxt in x.quarters:
        return TrRefOut(ref=nxt, label=YEAR_END_TPL.format(year=x.year))
    inyear = []
    for q in x.quarters:
        if q.startswith(x.year):
            inyear.append(q)
    if inyear:
        return TrRefOut(ref=inyear[-1], label=inyear[-1][:MONTH_LEN])
    return TrRefOut(ref=None, label=None)


def fill_tr_series(info: dict) -> None:
    """年份序列(2026-08-15 方案C):竞争卡存量整体换 StatCan 常住估算(IRCC 年末表停在 2024)。

    学签=仅学签+学工双持,工签=仅工签+学工双持(与 04e 同口径,公式=两列相加)。
    """
    if not IN_STATCAN.exists():
        return
    sc_prov = read_table(IN_STATCAN).get(K_BY_PROV) or {}
    qs: set = set()
    for pv in sc_prov.values():
        for q in pv:
            qs.add(q)
    quarters = sorted(qs)
    years: set = set()
    for q in quarters:
        years.add(q[:YEAR_LEN])
    for y in sorted(years)[-TR_SERIES_YEARS:]:
        found = tr_ref_of(TrRefIn(year=y, quarters=quarters))
        if not found.ref:
            continue
        for c in info:
            v = (sc_prov.get(c) or {}).get(found.ref)
            if not v:
                continue
            info[c].setdefault(K_TR_SERIES, {})[y] = to_tr_series_cell(
                TrSeriesCellIn(cell=v, label=found.label))


def fill_pnp_pr(info: dict) -> None:
    """PNP 类别 PR 登陆数按省挂进 info。"""
    if not IN_IRCC_PR.exists():
        return
    pr = read_table(IN_IRCC_PR)
    for c, v in (pr.get(K_BY_PROV) or {}).items():
        if c in info:
            info[c][K_PNP_PR] = to_stock_cell(StockCellIn(n=v, year=pr.get(K_YEAR, "")))


def fill_study_flow(info: dict) -> None:
    """新发学签流量(2026-08-03):存量表官方停在 2024,这条是唯一能反映当期的官方学签数字。

    **口径独立不混用** —— 存量=在库人数(竞争比分母),流量=当期新增;各带自己的年份与「至几月」。
    """
    if not IN_IRCC_FLOW.exists():
        return
    for c, years in (read_table(IN_IRCC_FLOW).get(K_BY_PROV) or {}).items():
        if c not in info or not years:
            continue
        latest = max(years)
        info[c][K_STUDY_FLOW] = to_study_flow_cell(StudyFlowIn(latest=latest, years=years))
        series: dict = {}
        for y in sorted(years)[-FLOW_SERIES_YEARS:]:
            series[y] = years[y]
        info[c][K_FLOW_SERIES] = series


def fill_alloc(info: dict) -> None:
    """PNP 年度提名配额(人工核对维护表)按省挂进 info。"""
    if not IN_IRCC_ALLOC.exists():
        return
    for r in read_table(IN_IRCC_ALLOC).get(K_ROWS, []):
        c = r.get(K_PROV)
        if c in info:
            info[c][K_ALLOC] = to_alloc_cell(r)


def prov_info() -> dict:
    """每省挂 info(IRCC 学签/工签存量、PR 登陆、提名配额、StatCan 常住序列)。

    全读既有 raw(零新抓取);任一文件缺失 → 对应键留空不瞎猜(宁缺毋假)。
    """
    info: dict = {}
    for c in PROV_FULL:
        info[c] = {}
    if IN_IRCC_TR.exists():
        fill_tr_stock(ProvFillIn(info=info, data=read_table(IN_IRCC_TR)))
        fill_tr_series(info)
    fill_pnp_pr(info)
    fill_study_flow(info)
    fill_alloc(info)
    return info


def city_key_of(t: tuple) -> tuple:
    """城市维度排序键(None 当空串,排序稳定;原 lambda 退役)。"""
    return (t[0] or "", t[1] or "")


def district_key_of(t: tuple) -> tuple:
    """区维度排序键(区、市、省;原 lambda 退役)。"""
    return (t[0] or "", t[1] or "", t[2] or "")


def build_provinces(info: dict) -> list:
    """省维度(十省固定,info 挂体量卡 jsonb)。"""
    rows = []
    for code, name in PROV_FULL.items():
        rows.append(to_province_row(ProvinceRowIn(code=code, name=name,
                                                  info=info.get(code) or None)))
    return rows


def build_cities(x: CityBuildIn) -> list:
    """市维度:只列实际有岗的市(译名缺条目留空,前端回退只显英文)。"""
    keys: set = set()
    for j in x.jobs:
        if j.get(K_CITY):
            keys.add((j.get(K_CITY), j.get(K_PROVINCE)))
    rows = []
    for c, p in sorted(keys, key=city_key_of):
        rows.append(to_city_row(CityRowIn(name=c, province=p or "", i18n=x.i18n)))
    return rows


def build_districts(jobs: list) -> list:
    """区维度也从 job 数据洗(district 由 04c 从地址/邮编归一);只列实际有岗的区。"""
    keys: set = set()
    for j in jobs:
        if j.get(K_DISTRICT):
            keys.add((j.get(K_DISTRICT), j.get(K_CITY), j.get(K_PROVINCE)))
    rows = []
    for d, c, p in sorted(keys, key=district_key_of):
        rows.append(to_district_row(DistrictRowIn(name=d, city=c or "", province=p or "")))
    return rows


def build_cat_i18n(jobs: list) -> dict:
    """维度行带上中/小类的英韩名(2026-08-03):名字跟着分类走同一条管线,前端只读维度表。

    先前显示层靠 i18n 里人肉维护的 cat.*,分类一变就漏成「中文混进英文界面」。
    sorted 是 2026-08-31 批I 收口**唯一一处有意的行为修正**(i2 金标逮到的既有缺陷):
    80010/80020/80021/80022 同映射中文「农林渔牧经理」却带两套官方英韩名,set 迭代序
    按进程哈希随机 → 188 行维度表里 2 行(农业管理/矿业管理)每轮 ETL 随机换名进 DB。
    排序定死「码最小者胜」,产出从此确定;两套名都是官方名,选谁是口径不是对错。
    """
    nocs: set = set()
    for j in jobs:
        if j.get(K_NOC):
            nocs.add(j.get(K_NOC))
    out: dict = {}
    for n in sorted(nocs):
        c = classify(n)
        out.setdefault(c[K_BROAD], (c[K_BROAD_EN], c[K_BROAD_KO]))
        out.setdefault(c[K_MID], (c[K_MID_EN], c[K_MID_KO]))
        out.setdefault(c[K_FINE], (c[K_FINE_EN], c[K_FINE_KO]))
    return out


def build_noc_categories(jobs: list) -> list:
    """NOC 分类维度(大/中/小 + TEER,数据集出现的层级组合)。"""
    i18n = build_cat_i18n(jobs)
    keys: set = set()
    for j in jobs:
        teer = j[K_TEER]
        if teer is None:
            teer = TEER_NONE_SORT
        keys.add((j[K_BROAD], j[K_MID], j[K_FINE], teer))
    rows = []
    for k in sorted(keys):
        rows.append(to_noc_category_row(CatI18nIn(keys=k, i18n=i18n)))
    return rows


def build_name_rows(names: set) -> list:
    """一列名字 → [{name}] 维度行(sources / experience_levels 共用)。"""
    rows = []
    for s in sorted(names):
        rows.append(to_name_row(s))
    return rows


def field_values_of(x: FieldValuesIn) -> set:
    """某一列的非空取值集(sources/experience_levels 的原 set 推导退役)。"""
    out: set = set()
    for j in x.jobs:
        if j.get(x.key):
            out.add(j.get(x.key))
    return out


def build_designated() -> list:
    """指定雇主维度:NL 官网名录 + 旧 AIP 聚合源 + RCIP/FCIP 社区指定雇主,末尾全同去重。

    NL 官网指定雇主名录(C4-W4,pnp/build_nl_employers 产,639 家)就是 NL 的 AIP 指定雇主
    官方全量名录(与旧聚合源同一体系,Strobel TEK 两边都在)—— 旧源只收到 94 家,官方名录
    639 家且带申报 NOC → **有官方名录时旧源的 NL 行整省让位**,否则同一雇主出两行。
    """
    nl_official: list = []
    if IN_NL_EMPLOYERS.exists():
        nle = read_table_soft(IN_NL_EMPLOYERS)
        for e in nle.get(K_EMPLOYERS, []):
            nl_official.append(to_nl_employer_row(NlEmployerIn(
                employer=e, fetched=nle.get(K_FETCHED, ""))))
    rows: list = []
    if IN_AIP.exists():
        for e in read_rows(IN_AIP):
            if nl_official and e.get(K_PROVINCE) == PROV_NL:
                continue
            rows.append(to_aip_employer_row(e))
    rows += nl_official
    for pf in IN_PILOT_EMP:
        if not pf.exists():
            continue
        pe = read_table(pf)
        for r in pe.get(K_ROWS, []):
            rows.append(to_pilot_employer_row(PilotEmployerIn(
                row=r, fetched=pe.get(K_FETCHED, ""))))
    return dedupe_designated(rows)


def dedupe_designated(rows: list) -> list:
    """指定雇主全同去重(2026-08-30 Frank 实拍:在招雇主板 Tim Hortons 同名同地连出五行 ——
    FCIP 官方 PDF 按分店列同名雇主,抽取层分店名/镇名没抽出来,五行落成逐字节全同;
    全字段相同的行对用户是零信息复读,汇装点收敛成一行)。

    ⚠️ 只去**全同**行:名同址不同/源不同的照留 —— 那是真事实;抽取层补分店维度另立台账。
    """
    seen: set = set()
    out: list = []
    for r in rows:
        key = (r[K_NAME], r.get(K_PROVINCE, ""), r.get(K_LOCATION, ""),
               r.get(K_SOURCE, ""), r.get(K_NOCS, ""))
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    if len(out) != len(rows):
        say(DESIGNATED_DEDUP_TPL.format(before=len(rows), after=len(out)))
    return out


def to_stock_cell(x: StockCellIn) -> dict:
    """体量卡的一格存量(人数 + 年份)。"""
    return {"n": x.n, "year": x.year}


def to_tr_series_cell(x: TrSeriesCellIn) -> dict:
    """常住估算序列的一年(学签=仅学签+学工双持,工签=仅工签+学工双持)。"""
    return {"study": (x.cell.get("studyOnly") or 0) + (x.cell.get("workStudy") or 0),
            "work": (x.cell.get("workOnly") or 0) + (x.cell.get("workStudy") or 0),
            "asOf": x.label}


def to_study_flow_cell(x: StudyFlowIn) -> dict:
    """新发学签流量的最新一年(年份 + 官方该年各格 + 上一年对照)。"""
    cell: dict = {"year": x.latest}
    cell.update(x.years[x.latest])
    cell["prev"] = (x.years.get(str(int(x.latest) - 1)) or {}).get("n")
    return cell


def to_alloc_cell(r: dict) -> dict:
    """PNP 年度提名配额三年格。"""
    return {"y2026": r.get("y2026"), "y2025": r.get("y2025"), "y2024": r.get("y2024")}


def to_province_row(x: ProvinceRowIn) -> dict:
    """provinces 表的一行。"""
    return {"code": x.code, "name": x.name, "info": x.info}


def to_city_row(x: CityRowIn) -> dict:
    """cities 表的一行(译名按 `<市>|<省>` 查表)。"""
    tr = x.i18n.get(CITY_I18N_KEY_TPL.format(city=x.name, province=x.province), {})
    return {"name": x.name, "province": x.province,
            "nameZh": tr.get("zh", ""), "nameKo": tr.get("ko", "")}


def to_district_row(x: DistrictRowIn) -> dict:
    """districts 表的一行。"""
    return {"name": x.name, "city": x.city, "province": x.province}


def to_noc_category_row(x: CatI18nIn) -> dict:
    """noc_categories 表的一行(大/中/小 + TEER + 三级英韩名)。"""
    b, m, f, t = x.keys
    teer = t
    if t < 0:
        teer = None
    return {"broad": b, "mid": m, "fine": f, "teer": teer,
            "broadEn": x.i18n.get(b, I18N_BLANK)[0], "broadKo": x.i18n.get(b, I18N_BLANK)[1],
            "midEn": x.i18n.get(m, I18N_BLANK)[0], "midKo": x.i18n.get(m, I18N_BLANK)[1],
            "fineEn": x.i18n.get(f, I18N_BLANK)[0], "fineKo": x.i18n.get(f, I18N_BLANK)[1]}


def to_name_row(name: str) -> dict:
    """只有一格名字的维度行(sources / experience_levels)。"""
    return {"name": name}


def to_nl_employer_row(x: NlEmployerIn) -> dict:
    """NL 官网指定雇主的一行。

    nocs = 雇主页「NOC's Requested」明文的码(逗号连接,去重);只有职位名没有码的不反推,宁缺毋滥。
    出处随行(C5b 发现):判定层要引「639 家里 3 家申报过 72310」,没有 url/fetched 这条
    supporting fact 挂不上 evidence,只能闭嘴。
    """
    codes: set = set()
    for n in x.employer.get("nocs", []):
        if n.get("noc"):
            codes.add(n["noc"])
    return {"name": x.employer.get("name"), "province": PROV_NL,
            "location": x.employer.get("location") or "", "isTech": False,
            "source": SOURCE_AIP, "nocs": COMMA.join(sorted(codes)),
            "url": x.employer.get("url") or "", "fetched": x.fetched}


def to_aip_employer_row(e: dict) -> dict:
    """旧 AIP 聚合源的一行(不含申报职位/逐家页 —— 空串是「来源没有」,不是「没申报」)。

    PE(B4):出处=官方名单页(经 Wayback 存档取),fetched=快照日期 —— 引证惯例出处随行。
    """
    url = ""
    if e.get("province") == PROV_PE:
        url = PE_DESIGNATED_URL
    return {"name": e.get("employer"), "province": e.get("province"),
            "location": e.get("location"), "isTech": bool(e.get("tech")),
            "source": SOURCE_AIP, "nocs": "", "url": url, "fetched": e.get("asOf", "")}


def to_pilot_employer_row(x: PilotEmployerIn) -> dict:
    """RCIP/FCIP 社区指定雇主的一行(source=RCIP/FCIP,location=社区名,判定层按 source 显示制度名)。"""
    return {"name": x.row["name"], "province": x.row.get("province", ""),
            "location": x.row.get("community", ""), "isTech": False,
            "source": x.row.get("type", SOURCE_RCIP), "nocs": "",
            "url": x.row.get("url", ""), "fetched": x.fetched}


# =========================================================================
# 10. mart:pnp 五表(通道清单 / 抽选事实 / 分值表 / 门槛 / 运营统计)
# =========================================================================


def build_pnp_occupations() -> list:
    """省提名通道维度(每行=某通道内一个职业;前端按 province+label 分组渲染清单/高亮)。"""
    rows: list = []
    if not IN_PNP_DIR.exists():
        return rows
    for f in sorted(IN_PNP_DIR.glob(GLOB_JSON)):
        d = read_table_soft(f)
        prov = d.get(K_PROVINCE)
        label = d.get(K_LABEL) or d.get(K_STREAM)
        if not (prov and label):
            continue
        for o in d.get(K_OCCUPATIONS, []):
            if o.get(K_NOC):
                rows.append(to_pnp_occupation_row(PnpOccIn(table=d, label=label, occupation=o)))
    return rows


def load_draw_stream_zh() -> dict:
    """#280:抽选流名中文灰注(本地 qwen 批译缓存,pnp/translate_draw_streams 产)。

    缓存没有的 stream(还没翻/翻译校验没过)streamZh 留 None,前端回退纯英文,不是报错。
    """
    out: dict = {}
    if not IN_DRAW_STREAM_ZH.exists():
        return out
    for k, v in read_table_soft(IN_DRAW_STREAM_ZH).items():
        out[k] = v.get(K_ZH)
    return out


def draw_limit_of(prov: str) -> int:
    """截断放宽(C4):普通省 8→12;NB 按类别定向邀请、一轮拆多行,判定层要数「某职业类别
    2026 年被选中几轮」→ 给一年的量(48,与 build_draws 的 NB 上限一致)。
    MB 2026-08-31 并入同档:同为一轮拆 4-5 行(总行+分流细分行),12 行只装两三轮,
    08-27 新轮落地把 #275 的 825 细分行挤出窗口 —— c01 金标当场红,判据与 NB 全同。"""
    if prov in DRAW_WIDE_PROVS:
        return DRAW_MAX_WIDE
    return DRAW_MAX


def build_pnp_draws(x: DrawsBuildIn) -> list:
    """省 PNP 抽选事实维度(E6-04):每行=一省一次抽选(kind=draw)或改制通告(kind=notice)。

    各省分制互不相通且都非 CRS(scale 标注),纯事实展示层,不进评分/匹配。每省 ≤8 条,
    全量历史在 raw。#135(Frank「点开按时间线看每一轮」):联邦 EE 历次抽选并进本表
    (province="FED")—— 该表列型完全够用,**零新表零 DDL**;省块按 province 过滤天然不串味。
    """
    rows: list = []
    if IN_PNP_DRAWS.exists():
        pd = read_table_soft(IN_PNP_DRAWS)
        for prov, v in pd.get(K_PROVINCES, {}).items():
            base = to_draw_base(DrawBaseIn(province=prov, table=v, fetched=pd.get(K_FETCHED, "")))
            for dr in v.get(K_DRAWS, [])[:draw_limit_of(prov)]:
                rows.append(to_pnp_draw_row(DrawRowIn(base=base, draw=dr,
                                                      stream_zh=x.stream_zh)))
            if v.get(K_NOTICE):
                rows.append(to_pnp_notice_row(NoticeRowIn(base=base, notice=v[K_NOTICE])))
    for cat_key, rounds in (x.ee_history or {}).items():
        for dr in rounds:
            rows.append(to_ee_draw_row(EeDrawIn(category=cat_key, draw=dr,
                                                fetched=x.ee_fetched)))
    return rows


def load_noc_universe() -> list:
    """展开「任何技工工种」要一份 NOC 全集:用官方名录而不是「库里出现过的岗位」——
    后者随每日抓取涨落,同一份分值表今天问、明天不问,用户会以为我们在乱改规则。

    名录读不到就只留官方那 10 个 NOC,不猜技工。
    """
    if not IN_NOC_DESC.exists():
        return []
    return list((read_table_soft(IN_NOC_DESC).get(K_BY_NOC) or {}).keys())


def expand_applies(x: ExpandAppliesIn) -> dict:
    """行级适用范围 → 前端能直接判的 NOC 清单。

    官方那条「Any Trade」不给 NOC,只说「持 SkilledTradesBC 证书的技工」。把它展开成
    **本站分类树的「技工」大类**(noc.broad_of)—— 注意这是决定「问不问」,不是断言资格:
    问了用户还得自己勾,过度包含只会多问一句,漏掉才会让人白丢 5 分。
    """
    nocs = dict(x.applies.get(K_NOCS) or {})
    trade = (x.applies.get(K_ANY_TRADE) or "").strip()
    if trade:
        for code in x.universe:
            if code not in nocs and broad_of(code) == BROAD_TRADES:
                nocs[code] = trade
    return to_applies_rule(nocs)


def build_pnp_score_factors(universe: list) -> list:
    """省提名打分表维度(E12-09):一行一档 —— province/factor/kind(row|bonus)/label/points/xor
    + 该节上限。摊平存,前端算分只做加法;wage 那类「规则不穷举」的存 rule 行(points 为空,
    rule 里写公式)。

    factorGroup/groupMax 是 SK 那种「官方分了 FACTOR I/II 且各有上限」的省才有(BC 无分组 →
    留空);passMark 是官方硬门槛(SK 60 分才能申请),BC 没有这种门槛 → 留空,
    前端改对照真实抽选线。
    """
    rows: list = []
    for src in IN_SCORE_TABLES:
        if not src.exists():
            continue
        tbl = read_table_soft(src)
        gmax = tbl.get(K_GROUP_MAX) or {}
        base = to_score_table_base(tbl)
        for fname, f in (tbl.get(K_FACTORS) or {}).items():
            fbase = to_score_factor_base(FactorBaseIn(base=base, name=fname, factor=f, gmax=gmax))
            for kind in SCORE_FACTOR_KINDS:
                for i, item in enumerate(f.get(kind, [])):
                    rows.append(to_pnp_score_factor_row(ScoreFactorIn(
                        fbase=fbase, kind=kind, seq=i, item=item, universe=universe)))
            if f.get(K_RULE):
                rows.append(to_pnp_score_rule_row(ScoreRuleIn(fbase=fbase, factor=f)))
    return rows


def build_pnp_requirements(files: list) -> list:
    """省提名官方门槛维度(规则引擎):一行一条可核验的官方门槛,列对齐 DB。

    与 pnp_occupations(在不在清单)、pnp_score_factors(能打几分)并列,三张表各答一个问题。
    applies*(Teer/Area/Condition/familySize)是**适用条件**(该条只对某些 TEER / 某个区域 /
    某个非地域条件 / 某个家庭人数生效),引擎按它挑行;挑不到就是 unknown —— 不拿别省别档的
    门槛套(设计 §3)。抽成函数是为了能单独重算这张表:改了某个省的门槛件之后不必跑全量汇装。
    """
    rows: list = []
    for src in files:
        if not src.exists():
            continue
        tbl = read_table_soft(src)
        base = to_req_table_base(tbl)
        if not base[K_PROVINCE] and tbl.get(K_REQUIREMENTS):
            say(REQ_NO_PROVINCE_TPL.format(name=src.name, n=len(tbl[K_REQUIREMENTS])))
        for i, r in enumerate(tbl.get(K_REQUIREMENTS, [])):
            rows.append(to_pnp_requirement_row(ReqRowIn(base=base, rule=r, seq=i)))
    return rows


def stat_val(x: StatValIn) -> StatValOut:
    """整数才进 value;官方隐私抑制/不适用值(AB「Less than 10」「Not applicable」、BC「<5」、
    SK「N/A」/null)→ value=None + valueText=原文,**绝不折成 0**。

    这张表存在的全部意义就是让「0」「本站没有」「官方不公布」三件事分得开 —— 折成 0 等于自毁。
    """
    if isinstance(x.raw, int) and not isinstance(x.raw, bool):
        return StatValOut(value=x.raw, text="")
    if x.text:
        return StatValOut(value=None, text=x.text)
    if x.raw is None:
        return StatValOut(value=None, text="")
    return StatValOut(value=None, text=str(x.raw))


def stream_key(scope: str) -> str:
    """通道名归一(streamKey):跨指标 join 的键,**不展示给用户**。

    病根:官网两张表对同一条通道措辞不同 —— streams[] 写「Accelerated Tech Pathway
    (eligible list of occupations includes jobs that support data centre needs…)」,
    eoiPool[] 只写「Accelerated Tech Pathway」;「Dedicated Health Care Pathways (Express Entry
    and Non-Express Entry)」同理。编排层要把「配额 + 池内人数 + 积压游标」拼成一条通道的全貌,
    靠 scope 字符串等值就会**静默漏配**(join 不上=当没有)。
    规则而不是映射表(官网改个字映射表就失效):括号里一律是补充说明不是通道身份 → 去括号;
    再小写、压空白、去首尾标点。scope 原样保留(官方措辞,报告要引用);streamKey 只做键。
    """
    k = PAREN_RE.sub("", scope or "")
    k = WS_RE.sub(SPACE, k).strip().lower()
    k = EDGE_PUNCT_RE.sub("", k)
    return STREAM_KEY_FIX.get(k, k)


def add_ops_row(x: OpsRowIn) -> None:
    """一条运营统计指标行进表(每 (province, metric) 组内稳定序号,重跑顺序一致)。"""
    got = stat_val(StatValIn(raw=x.raw, text=x.text))
    k = (x.base[K_PROVINCE], x.metric)
    x.ctx.seqs[k] = x.ctx.seqs.get(k, -1) + 1
    x.ctx.rows.append(to_ops_row(OpsRowOut(base=x.base, metric=x.metric, scope=x.scope,
                                           kind=x.kind, label=x.label, got=got, unit=x.unit,
                                           section=x.section, seq=x.ctx.seqs[k],
                                           period=x.period)))


def fill_ab_ops(x: OpsProvIn) -> None:
    """AB:省级汇总 + 逐通道的配额/已发/剩余/待处理,积压游标(自由文本永远 value=None),EOI 池。"""
    for m, key in AB_SUMMARY_METRICS:
        unit = UNIT_PEOPLE
        if m in AB_SPOT_METRICS:
            unit = UNIT_SPOTS
        add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=m, scope="", kind="", label="",
                             raw=(x.data.get(K_SUMMARY) or {}).get(key), unit=unit, text="",
                             section="", period=None))
        for s in x.data.get(K_STREAMS, []):
            add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=m, scope=s.get(K_STREAM, ""),
                                 kind=SCOPE_STREAM, label=s.get(K_STREAM, ""), raw=s.get(key),
                                 unit=unit, text="", section="", period=None))
    for s in x.data.get(K_STREAMS, []):
        add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=METRIC_ASSESSING,
                             scope=s.get(K_STREAM, ""), kind=SCOPE_STREAM,
                             label=s.get(K_STREAM, ""), raw=None, unit=UNIT_TEXT,
                             text=str(s.get(K_ASSESSING_UP_TO) or ""), section="", period=None))
    for e in x.data.get(K_EOI_POOL, []):
        st = e.get(K_STREAM, "")
        total = st.strip().rstrip(COLON).lower() == TOTAL_WORD
        metric = METRIC_EOI_POOL
        scope = st
        kind = SCOPE_STREAM
        if total:
            metric = METRIC_EOI_POOL_TOTAL
            scope = ""
            kind = ""
        add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=metric, scope=scope, kind=kind,
                             label=st, raw=e.get(K_COUNT), unit=UNIT_PEOPLE, text="",
                             section="", period=None))


def fill_sk_ops(x: OpsProvIn) -> None:
    """SK:处理时长(weeks=null → 原文 raw「N/A」)、配额/年内已发、封顶行业、优先行业标记行。"""
    for p in x.data.get(K_PROCESSING, []):
        add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=METRIC_PROCESSING_WEEKS,
                             scope=p.get(K_CATEGORY, ""), kind=SCOPE_CATEGORY,
                             label=SK_PROC_LABEL_TPL.format(group=p.get(K_GROUP, ""),
                                                            category=p.get(K_CATEGORY, "")),
                             raw=p.get(K_WEEKS), unit=UNIT_WEEKS,
                             text=str(p.get(K_RAW) or ""), section="", period=None))
    for a in x.data.get(K_ALLOCATION, []):
        sec = a.get(K_SECTOR, "")
        total = sec.strip().lower() == TOTAL_WORD
        for m, key, unit in SK_ALLOCATION_METRICS:
            scope = sec
            kind = SCOPE_SECTOR
            if total:
                scope = ""
                kind = ""
            add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=m, scope=scope, kind=kind,
                                 label=sec, raw=a.get(key), unit=unit, text="", section="",
                                 period=None))
    for c in x.data.get(K_CAPPED_SECTORS, []):
        for m, key, unit in SK_CAPPED_METRICS:
            add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=m, scope=c.get(K_SECTOR, ""),
                                 kind=SCOPE_SECTOR, label=c.get(K_SECTOR, ""), raw=c.get(key),
                                 unit=unit, text="", section="", period=None))
    for s in x.data.get(K_PRIORITY_SECTORS, []):
        add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=METRIC_PRIORITY_SECTOR, scope=s,
                             kind=SCOPE_SECTOR, label=s, raw=1, unit=UNIT_FLAG, text="",
                             section="", period=None))


def fill_bc_ops(x: OpsProvIn) -> None:
    """BC:SIRS 池分数段分布(「<5」= 官方隐私抑制 → None + 原文)+ 处理时长。

    处理时长与池分布**不同源、不同口径日**(池子那页印 as-of,时长这页不印)→ 用自己那一节的
    出处,别让报告拿池子的 as-of 去给时长背书。「约 80% 的案子」这句进每一行 label:
    它就是这三个数的全部意义,分开存迟早会有人把它读成「所有案子」。
    """
    for p in x.data.get(K_POOL, []):
        add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=METRIC_SIRS_POOL,
                             scope=p.get(K_SCORE_RANGE, ""), kind=SCOPE_SCORE_RANGE,
                             label=p.get(K_SCORE_RANGE, ""), raw=p.get(K_REGISTRATIONS),
                             unit=UNIT_PEOPLE, text="", section="", period=None))
    pr = x.data.get(K_PROCESSING) or {}
    pbase = to_ops_sub_base(SubBaseIn(base=x.base, block=pr, as_of=pr.get(K_AS_OF, "")))
    pctl = pr.get(K_PERCENTILE_LABEL, "")
    for p in pr.get(K_ROWS, []):
        stage = p.get(K_STAGE, "")
        raw_txt = p.get(K_RAW, "")
        label = BC_PROC_PLAIN_TPL.format(stage=stage, raw=raw_txt)
        if pctl:
            label = BC_PROC_LABEL_TPL.format(pctl=pctl, stage=stage, raw=raw_txt)
        add_ops_row(OpsRowIn(ctx=x.ctx, base=pbase,
                             metric=BC_PROC_METRIC_TPL.format(unit=p.get(K_UNIT) or UNIT_MONTHS),
                             scope=stage, kind=SCOPE_STAGE, label=label, raw=p.get(K_VALUE),
                             unit=p.get(K_UNIT, ""), text="", section=BC_PROC_SECTION,
                             period=None))


def fill_mb_monthly_ops(x: MbBlockIn) -> None:
    """MB 月度数据页:配额、Enhanced 年内已发、四组年内累计、库存快照。"""
    add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=METRIC_ALLOCATION, scope="", kind="",
                         label=(x.monthly.get(K_ALLOCATION) or {}).get(K_LABEL, ""),
                         raw=(x.monthly.get(K_ALLOCATION) or {}).get(K_VALUE), unit=UNIT_SPOTS,
                         text="",
                         section=MB_SECTION_TPL.format(
                             page=x.page, section=(x.monthly.get(K_ALLOCATION) or {}).get(K_SECTION, "")),
                         period=x.year))
    add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=METRIC_NOM_ENHANCED_YTD, scope="",
                         kind="", label=(x.monthly.get(K_ENHANCED_YTD) or {}).get(K_LABEL, ""),
                         raw=(x.monthly.get(K_ENHANCED_YTD) or {}).get(K_VALUE),
                         unit=UNIT_NOMINATIONS, text="",
                         section=MB_SECTION_TPL.format(
                             page=x.page, section=(x.monthly.get(K_ENHANCED_YTD) or {}).get(K_SECTION, "")),
                         period=x.ytd))
    for key, metric, unit in MB_YTD_GROUPS:
        g = x.monthly.get(key) or {}
        for r in g.get(K_ROWS, []):
            scope = r.get(K_SCOPE, "")
            kind = ""
            if scope:
                kind = SCOPE_STREAM
            add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=metric, scope=scope, kind=kind,
                                 label=MB_GROUP_LABEL_TPL.format(section=g.get(K_SECTION, ""),
                                                                 label=r.get(K_LABEL, "")),
                                 raw=r.get(K_VALUE), unit=unit, text="",
                                 section=MB_SECTION_TPL.format(page=x.page,
                                                               section=g.get(K_SECTION, "")),
                                 period=x.ytd))
    inv = x.monthly.get(K_INVENTORY) or {}
    for metric, key, lab in MB_INVENTORY_METRICS:
        add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=metric, scope="", kind="",
                             label=MB_GROUP_LABEL_TPL.format(section=inv.get(K_SECTION, ""),
                                                             label=lab),
                             raw=inv.get(key), unit=UNIT_APPLICATIONS, text="",
                             section=MB_SECTION_TPL.format(page=x.page,
                                                           section=inv.get(K_SECTION, "")),
                             period=inv.get(K_MONTH, "")))


def fill_mb_annual_ops(x: MbAnnualIn) -> None:
    """MB 年报:处理承诺、EOI 池在册人数(period 取官方标签里写的那一年,不按报告年推)、逐通道处理天数。

    2024 年报把 EOI 池标成「end of 2023」而 2023 年报同年份给 20,392,官方自相矛盾;
    我们只做两件事:取最新一份年报、把官方原句原样放进 label。谁要纠这个错去找 MPNP。
    口径是**年度快照**,与 AB 的实时池不可混用(显示层分别标注)。
    """
    add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=METRIC_PROC_COMMITMENT, scope="",
                         kind="", label=x.annual.get(K_COMMITMENT_LABEL, ""),
                         raw=x.annual.get(K_COMMITMENT_MONTHS), unit=UNIT_MONTHS, text="",
                         section=x.section, period=x.year))
    ep = x.annual.get(K_EOI_POOL) or {}
    add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=METRIC_EOI_POOL_TOTAL, scope="", kind="",
                         label=ep.get(K_LABEL, ""), raw=ep.get(K_VALUE), unit=UNIT_PEOPLE,
                         text="", section=MB_EOI_SECTION_TPL.format(year=x.year),
                         period=str(ep.get(K_LABEL_YEAR) or "")))
    for p in x.annual.get(K_PROCESSING, []):
        st = p.get(K_STREAM, "")
        for metric, key, lab in MB_ANNUAL_PROC_METRICS:
            add_ops_row(OpsRowIn(ctx=x.ctx, base=x.base, metric=metric, scope=st,
                                 kind=SCOPE_STREAM,
                                 label=MB_PROC_LABEL_TPL.format(stream=st, kind=lab,
                                                                days=p.get(key)),
                                 raw=p.get(key), unit=UNIT_DAYS, text="", section=x.section,
                                 period=x.year))


def fill_mb_ops(x: OpsProvIn) -> None:
    """MB 有**两个**官方源(月度数据页 + 年报),各自的 url/fetched/统计期都不一样 ——
    一行的出处必须指向那个数字真正的来源页,别拿月度页给年报的处理天数背书。"""
    m = x.data.get(K_MONTHLY) or {}
    year = str(m.get(K_YEAR) or "")
    thru = str(m.get(K_THROUGH_MONTH) or "")
    ytd = year
    if thru:
        ytd = MB_YTD_TPL.format(year=year, month=thru[:MONTH_ABBR_LEN])
    fill_mb_monthly_ops(MbBlockIn(
        ctx=x.ctx, base=to_ops_sub_base(SubBaseIn(base=x.base, block=m, as_of="")),
        monthly=m, page=m.get(K_SECTION, ""), year=year, ytd=ytd))
    an = x.data.get(K_ANNUAL) or {}
    fill_mb_annual_ops(MbAnnualIn(
        ctx=x.ctx, base=to_ops_sub_base(SubBaseIn(base=x.base, block=an, as_of="")),
        annual=an, year=str(an.get(K_YEAR) or ""), section=an.get(K_SECTION, "")))


def fill_on_ops(x: OpsProvIn) -> None:
    """ON(C4-W5):官方「审理时长与提名数」专页 2026 改制后已 302 下线(raw 的 pageRedirect
    存了官方注册的 redirect 证据)→ 审理时长无行可出,这是举证过的「本站未收录」。

    配额/历年提名数出自逐年 Program Updates 页 —— 每条自带出处页,用自己的 url/fetched,
    别拿顶层(已下线那页)给数字背书。label = 官方原句(quote-anchored)。
    """
    for m, key in ON_YEAR_METRICS:
        for e in x.data.get(key, []):
            add_ops_row(OpsRowIn(
                ctx=x.ctx, base=to_ops_sub_base(SubBaseIn(base=x.base, block=e, as_of="")),
                metric=m, scope="", kind="", label=e.get(K_LABEL, ""), raw=e.get(K_VALUE),
                unit=e.get(K_UNIT, UNIT_NOMINATIONS), text="", section=e.get(K_SECTION, ""),
                period=str(e.get(K_YEAR) or "")))


def warn_stream_key_clash(rows: list) -> None:
    """撞车检测:**同一个 (province, metric) 内**两个不同的官方通道名压出同一个 key = 归一切过头了
    (跨 metric 同键正是要的效果,不算撞)。撞了就报出来 —— 静默合并两条通道比漏配更毒。"""
    seen: dict = {}
    for r in rows:
        if not r.get(K_STREAM_KEY):
            continue
        k = (r[K_PROVINCE], r[K_METRIC], r[K_STREAM_KEY])
        if seen.setdefault(k, r[K_SCOPE]) != r[K_SCOPE]:
            say(STREAM_CLASH_TPL.format(province=r[K_PROVINCE], metric=r[K_METRIC],
                                        first=seen[k], second=r[K_SCOPE],
                                        key=r[K_STREAM_KEY]))


def build_pnp_ops_stats(files: list) -> list:
    """省级官方运营统计 → 一行一指标(metric 固定词表;scope=通道/行业/分数段/阶段,省级留空)。

    label 一律官方措辞原文(不翻译不改写);AB/SK/BC 池分布三份 raw 没有节号 → section 留空
    不编,BC 处理时长与 MB(月度页/年报)自带官方小标题,照原文写进 section。
    streamKey:scope 的归一键,只对 scopeKind='stream' 算,供跨指标拼装用。

    ⚠️ 单位不换算:官方发 months 就 processing_months、发 weeks 就 processing_weeks、发 days
    就 processing_days。3 个月折成 13 周 = 替官方编了个它没给的精度(BC 只说「约 80% 的案子在
    3 个月内」)。metric 名带单位后缀,消费端一眼看得出官方到底给的是什么。
    """
    ctx = OpsCtx(rows=[], seqs={})
    for src in files:
        if not src.exists():
            continue
        d = read_table_soft(src)
        prov = d.get(K_PROVINCE, "")
        arg = OpsProvIn(ctx=ctx, base=to_ops_base(d), data=d)
        if prov == PROV_AB:
            fill_ab_ops(arg)
        elif prov == PROV_SK:
            fill_sk_ops(arg)
        elif prov == PROV_BC:
            fill_bc_ops(arg)
        elif prov == PROV_MB:
            fill_mb_ops(arg)
        elif prov == PROV_ON:
            fill_on_ops(arg)
    warn_stream_key_clash(ctx.rows)
    return ctx.rows


def to_pnp_occupation_row(x: PnpOccIn) -> dict:
    """pnp_occupations 表的一行。

    program:PNP(默认)/AIP —— 前端按项目分开判(AIP 与省提名是两条路,E6-09)。
    appliesTo:清单管哪几条子通道(空=全项目)。SK 排除清单只管 OID/EE,Employment Offer
    不受约束 —— 少这一列判定层会把「SK 走不通」判给不该判的人(C4)。
    """
    return {"province": x.table.get("province"), "stream": x.table.get("stream", ""),
            "label": x.label, "program": x.table.get("program", PROGRAM_PNP),
            "type": x.table.get("type", PNP_TYPE_INDEMAND), "url": x.table.get("url", ""),
            "fetched": x.table.get("fetched", ""), "appliesTo": x.table.get("appliesTo", ""),
            "noc": x.occupation["noc"], "name": x.occupation.get("name", ""),
            "gtaRestricted": bool(x.occupation.get("gtaRestricted"))}


def to_draw_base(x: DrawBaseIn) -> dict:
    """一省抽选行的共同底座。"""
    return {"province": x.province, "label": x.table.get("label", ""),
            "scale": x.table.get("scale"), "url": x.table.get("url", ""), "fetched": x.fetched}


def to_pnp_draw_row(x: DrawRowIn) -> dict:
    """pnp_draws 表的一行抽选。"""
    row = dict(x.base)
    stream = x.draw.get("stream", "")
    row.update({"kind": DRAW_KIND_DRAW, "drawDate": x.draw.get("date"), "stream": stream,
                "streamZh": x.stream_zh.get(stream), "score": x.draw.get("score"),
                "invitations": x.draw.get("invitations"), "note": x.draw.get("note", "")})
    return row


def to_pnp_notice_row(x: NoticeRowIn) -> dict:
    """pnp_draws 表的一行改制通告。"""
    row = dict(x.base)
    row.update({"kind": DRAW_KIND_NOTICE, "drawDate": x.notice.get("date"), "stream": "",
                "streamZh": None, "score": None, "invitations": None,
                "note": x.notice.get("note", "")})
    return row


def to_ee_draw_row(x: EeDrawIn) -> dict:
    """联邦 EE 历次抽选并进 pnp_draws(province='FED';#135 时间线页读这里的 FED 行)。"""
    return {"province": PROV_FED, "label": x.category, "scale": SCALE_CRS,
            "url": EE_ROUNDS_URL, "fetched": x.fetched, "kind": DRAW_KIND_DRAW,
            "drawDate": x.draw.get("date"), "stream": x.draw.get("drawName", ""),
            "score": x.draw.get("crs"), "invitations": x.draw.get("size"), "note": ""}


def to_applies_rule(nocs: dict) -> dict:
    """appliesTo 展开后的规则串形。"""
    return {"appliesNoc": nocs}


def to_score_table_base(tbl: dict) -> dict:
    """一份省分值表的表级底座。"""
    return {"province": tbl.get("province", ""), "system": tbl.get("system", ""),
            "maxTotal": tbl.get("maxTotal"), "passMark": tbl.get("passMark"),
            "url": tbl.get("url", ""), "guideEffective": tbl.get("guideEffective", ""),
            "fetched": tbl.get("fetched", "")}


def to_score_factor_base(x: FactorBaseIn) -> dict:
    """一个因素的底座(表级 + factor/factorMax/factorGroup/groupMax)。"""
    row = dict(x.base)
    row.update({"factor": x.name, "factorMax": x.factor.get("max"),
                "factorGroup": x.factor.get("group", ""),
                "groupMax": x.gmax.get(x.factor.get("group", ""))})
    return row


def to_pnp_score_factor_row(x: ScoreFactorIn) -> dict:
    """pnp_score_factors 表的一行档位。

    appliesTo:这一行的**适用范围**(现在只有 BC「执业资格 +5」有 —— 官方写明只对表内 11 类
    职业成立)。搭 rule 这个既有的规则串走,不为 11 行另起一张表;「任何技工工种」在数据层就
    展开成 NOC 清单,前端只做集合判断,不在 UI 里分类。
    """
    applies = x.item.get("appliesTo")
    rule = ""
    if applies:
        rule = json.dumps(expand_applies(ExpandAppliesIn(applies=applies, universe=x.universe)),
                          ensure_ascii=False)
    kind = x.kind
    if kind == K_ROWS:
        kind = SCORE_KIND_ROW
    row = dict(x.fbase)
    row.update({"kind": kind, "seq": x.seq, "label": x.item.get("label", ""),
                "points": x.item.get("points"), "xorPrev": bool(x.item.get("xorWithPrev")),
                "rule": rule})
    return row


def to_pnp_score_rule_row(x: ScoreRuleIn) -> dict:
    """pnp_score_factors 表的一行规则(wage 那类「规则不穷举」的:points 为空,rule 里写公式)。"""
    payload: dict = {}
    for k in SCORE_RULE_KEYS:
        payload[k] = x.factor.get(k)
    row = dict(x.fbase)
    row.update({"kind": SCORE_KIND_RULE, "seq": 0, "label": x.factor.get("rule", ""),
                "points": None, "xorPrev": False,
                "rule": json.dumps(payload, ensure_ascii=False)})
    return row


def to_req_table_base(tbl: dict) -> dict:
    """一份省门槛表的表级底座。"""
    return {"province": tbl.get("province", ""), "program": tbl.get("program", PROGRAM_PNP),
            "url": tbl.get("url", ""), "pageUrl": tbl.get("pageUrl", ""),
            "effective": tbl.get("guideEffective", ""), "fetched": tbl.get("fetched", "")}


def to_pnp_requirement_row(x: ReqRowIn) -> dict:
    """pnp_requirements 表的一行门槛。

    value 列是 **integer**。G9 的 EE 规则里 13/23 条的 value 是编码字符串('0,1,2,3' /
    'outside-QC' / 'eca-required' …),直灌 → 22P02 → 整个 seed 事务回滚。照 pgwp 的 rule 行
    先例:value 留空,机器可读的编码折进 basis 那个 `k=v;k=v` 包(它已经装着
    windowYears=3;minYears=1 这类口径)。valueText=官方原文,一个字不动。
    为什么不塞 appliesNoc/appliesTeer:那两列是**适用范围**(不在范围内=本条不适用),而这里
    是**门槛**(不在名单内=不合格),两者对同一个人给出相反结论。
    appliesNoc(NOC 适用范围,E13-02):ON 的技工低档语言门槛靠它区分;存 NOC 码前缀,引擎按前缀匹配。
    appliesCondition(非地域的适用条件,G6:MB SWM「在加拿大其他省/地区读的书」那一档 =
    grad-other-province):空 = 该条对谁都适用。**为什么不塞进 appliesArea** —— 那一列存的是
    官方枚举的行政区(rules.areaOfPlace 按岗位地点算出来的键),混进一个非地理值,按区域挑行的
    那几处(收入表 / 雇主雇员数)迟早挑到不该挑的行。
    """
    val = x.rule.get("value")
    basis = x.rule.get("basis", "")
    if isinstance(val, str):
        basis = REQ_BASIS_SEP.join(basis_parts_of(BasisIn(basis=basis, code=val)))
        val = None
    row = dict(x.base)
    row["seq"] = x.seq
    for key in REQ_ROW_OVERRIDES:
        if x.rule.get(key):
            row[key] = x.rule[key]
    row.update({
        "stream": x.rule.get("stream", ""), "subject": x.rule.get("subject", SUBJECT_APPLICANT),
        "factor": x.rule.get("factor", ""), "op": x.rule.get("op", OP_GTE),
        "value": val, "valueText": x.rule.get("valueText", ""), "unit": x.rule.get("unit", ""),
        "appliesTeer": teer_list_of(x.rule.get("appliesTeer")),
        "appliesNoc": x.rule.get("appliesNoc", ""), "excludesNoc": x.rule.get("excludesNoc", ""),
        "appliesArea": x.rule.get("appliesArea", ""),
        "appliesCondition": x.rule.get("appliesCondition", ""),
        "familySize": x.rule.get("familySize"),
        "basis": basis, "label": x.rule.get("label", ""), "section": x.rule.get("section", ""),
    })
    return row


def basis_parts_of(x: BasisIn) -> list:
    """把编码字符串折进 basis 包(原 genexp 退役;空 basis 不留空段)。"""
    out = []
    if x.basis:
        out.append(x.basis)
    out.append(REQ_VALUE_CODE_TPL.format(code=x.code))
    return out


def teer_list_of(raw: object) -> str:
    """TEER 列表存成 "2,3,4,5" 文本(Payload 没有整型数组列;前端 split 即可)。

    ⚠️ 源里既有 list[int](BC 及本轮七省)也有现成字符串(ON):对字符串 join 会逐字符插逗号,
    ON 那几行一直是 "0,,,1,,,2,,,3",引擎 split(',') 按 TEER 挑行永远挑空(2026-08-03 修)。
    两种形态都归一到同一串。
    """
    if isinstance(raw, str):
        return raw
    parts = []
    if isinstance(raw, list):
        for v in raw:
            parts.append(str(v))
    return COMMA.join(parts)


def to_ops_base(d: dict) -> dict:
    """一份省运营统计表的表级底座。

    SK 官方没有 asOf,只有季度口径 → asOf 留空、period 放 quarter(其余省 period 留空)。
    """
    return {"province": d.get("province", ""), "program": d.get("program", PROGRAM_PNP),
            "asOf": d.get("asOf", ""), "period": d.get("quarter", ""),
            "url": d.get("url", ""), "fetched": d.get("fetched", "")}


def to_ops_sub_base(x: SubBaseIn) -> dict:
    """某一节自带出处时的底座覆写(BC 处理时长 / MB 月度与年报 / ON 逐年页)。"""
    row = dict(x.base)
    row.update({"url": x.block.get("url", ""), "fetched": x.block.get("fetched", ""),
                "asOf": x.as_of})
    return row


def to_ops_row(x: OpsRowOut) -> dict:
    """pnp_ops_stats 表的一行(period 为 None 时不落该键 —— 键在不在都是契约)。"""
    key = ""
    if x.kind == SCOPE_STREAM:
        key = stream_key(x.scope)
    row = dict(x.base)
    row.update({"metric": x.metric, "scope": x.scope, "scopeKind": x.kind, "label": x.label,
                "streamKey": key, "value": x.got.value, "valueText": x.got.text,
                "unit": x.unit, "section": x.section, "seq": x.seq})
    if x.period is not None:
        row["period"] = x.period
    return row


# =========================================================================
# 11. mart:ee 三表(类别抽选 / 官方计分表 / 语言换算表)
# =========================================================================


def load_ee_draws() -> EeDrawsOut:
    """各类别最近抽选(CRS/日期/邀请数)+ 历次抽选 + 表级取回日。"""
    if not IN_EE_DRAWS.exists():
        return EeDrawsOut(by_category={}, history={}, fetched="")
    d = read_table_soft(IN_EE_DRAWS)
    return EeDrawsOut(by_category=d.get(K_BY_CATEGORY, {}), history=d.get(K_HISTORY, {}),
                      fetched=d.get(K_FETCHED, ""))


def build_ee_categories(by_category: dict) -> list:
    """联邦 EE 类别维度(每行=某类别内一个职业,带该类别最近一次抽选)。"""
    rows: list = []
    if not IN_EE_CATEGORIES.exists():
        return rows
    d = read_table_soft(IN_EE_CATEGORIES)
    for c in d.get(K_CATEGORIES, []):
        dr = by_category.get(c.get(K_KEY, ""), {})
        for o in c.get(K_OCCUPATIONS, []):
            if o.get(K_NOC):
                rows.append(to_ee_category_row(EeCategoryIn(table=d, category=c,
                                                            occupation=o, draw=dr)))
    return rows


def numeric_range(text: str) -> NumericRangeOut:
    """官方分数格的保守数值化;识别不了就双空并保留 valueText,绝不替官方补 0。

    CELPIP 的部分 CLB 单元格含无障碍隐藏后缀(如「7 CELPIP-G」);原文仍在 *Text,数值边界
    只移除这个页面真实存在且已由 table.test 另列保存的测试名。
    官方有「226-371+」这类「某分起及以上」写法;下界可证,上界不可封死。
    """
    value = WS_RE.sub("", (text or "").replace(EN_DASH, HYPHEN).replace(EM_DASH, HYPHEN))
    value = CELPIP_TAIL_RE.sub("", value)
    value = AND_ABOVE_RE.sub(PLUS, value)
    m = NUM_EXACT_RE.fullmatch(value)
    if m:
        n = float(m.group(1))
        return NumericRangeOut(low=n, high=n, kind=RANGE_EXACT)
    m = NUM_MIN_RE.fullmatch(value)
    if m:
        return NumericRangeOut(low=float(m.group(1)), high=None, kind=RANGE_MINIMUM)
    m = NUM_RANGE_RE.fullmatch(value)
    if m:
        return NumericRangeOut(low=float(m.group(1)), high=float(m.group(2)), kind=RANGE_RANGE)
    m = NUM_RANGE_MIN_RE.fullmatch(value)
    if m:
        return NumericRangeOut(low=float(m.group(1)), high=None, kind=RANGE_MINIMUM)
    return NumericRangeOut(low=None, high=None, kind=RANGE_TEXT)


def language_metric(column: str) -> str:
    """语言表列头 → 指标名(四项能力直取;分值列分「总分」与「每项」;其余压成 snake)。"""
    label = (column or "").lower()
    for ability in LANG_ABILITIES:
        if label.startswith(ability):
            return ability
    if LANG_POINTS_WORD in label and LANG_TOTAL_WORD in label:
        return LANG_POINTS_TOTAL
    if LANG_POINTS_WORD in label and LANG_PER_ABILITY in label.replace(
            PAREN_OPEN, "").replace(PAREN_CLOSE, ""):
        return LANG_POINTS_PER_ABILITY
    return SNAKE_RE.sub(UNDERSCORE, label).strip(UNDERSCORE)


def build_ee_points_grid(x: EePointsIn) -> list:
    """联邦官方计分表 → 窄表:一行 = 一个 criterion × 一个列表头(上游已解析成这个形状,这里直通+加列)。

    **两套分,一张表**:CRS 排名分(池子里排队用)与 FSW 67 分选择因素(够不够格进池子用)是
    官方明确写明的两回事,但表格形状完全一样(段/小标题/因素/档位/列表头/分值)→ 同一张窄表用
    `grid` 列区分('CRS' / 'FSW67')。拆两张表只会逼消费端把同一套查表逻辑写两遍,还得记住哪张
    表叫什么。消费端一律先按 grid 过滤,再按 section/factor/criterion 挑行 —— 不过滤就会把两套
    分加在一起。

    🔴 points 可空:官方非数字格(「n/a」「Not eligible to apply」)一律 None + 原文留
    pointsText,绝不折成 0 —— 折了就等于替官方说「这档 0 分」,而官方说的是「这档根本不能申」。
    与 pnp_* 四表的分工:那四张答省提名的四个问题,本表答联邦段「这一格官方给几分」。
    """
    rows: list = []
    for grid, src, key in ((GRID_CRS, x.crs_src, K_ROWS), (GRID_FSW67, x.elig_src,
                                                           K_SELECTION_FACTORS)):
        if not src.exists():
            continue
        d = read_table_soft(src)
        for i, r in enumerate(d.get(key, [])):
            rows.append(to_ee_points_row(EePointsRowIn(grid=grid, row=r, seq=i)))
    return rows


def build_ee_language_grid(src: Path) -> list:
    """语言成绩换算单独成表,不复用 ee_points_grid:换算区间不是 CRS/FSW 分,不能被求和。"""
    if not src.exists():
        return []
    data = read_table_soft(src)
    out: list = []
    seq = 0
    for table in data.get(K_TABLES, []):
        for row in table.get(K_ROWS, []):
            level = numeric_range(row.get(K_LEVEL_TEXT, ""))
            for cell in row.get(K_CELLS, []):
                out.append(to_ee_language_row(LangCellIn(table=table, row=row, cell=cell,
                                                         level=level, seq=seq)))
                seq += 1
    return out


def to_ee_category_row(x: EeCategoryIn) -> dict:
    """ee_categories 表的一行。"""
    return {"category": x.category.get("key", ""), "label": x.category.get("label", ""),
            "url": x.table.get("url", ""), "fetched": x.table.get("fetched", ""),
            "noc": x.occupation["noc"], "teer": x.occupation.get("teer"),
            "title": x.occupation.get("title", ""),
            "drawCrs": x.draw.get("crs"), "drawDate": x.draw.get("date"),
            "drawSize": x.draw.get("size")}


def to_ee_points_row(x: EePointsRowIn) -> dict:
    """ee_points_grid 表的一行。

    kind:summary=各段封顶速览表 / detail=逐档明细表,两者的分值不能相加(明细是速览的展开)。
    tableNo / columnLabel 换名的原因是 table 与 column 都是 SQL 保留字。
    seq = 官方页内原序,重跑稳定(报告要按官方顺序摆)。
    """
    return {"grid": x.grid, "section": x.row.get("section", ""),
            "sectionLabel": x.row.get("sectionLabel", ""), "kind": x.row.get("kind", ""),
            "tableNo": x.row.get("table"), "heading": x.row.get("heading", ""),
            "factor": x.row.get("factor", ""), "criterion": x.row.get("criterion", ""),
            "columnLabel": x.row.get("column", ""), "points": x.row.get("points"),
            "pointsText": x.row.get("pointsText", ""), "seq": x.seq,
            "url": x.row.get("url", ""), "fetched": x.row.get("fetched", "")}


def to_ee_language_row(x: LangCellIn) -> dict:
    """ee_language_grid 表的一行(一格成绩 ↔ 一个 CLB/NCLC 档)。"""
    score = numeric_range(x.cell.get("valueText", ""))
    return {"program": x.table.get("program", ""), "test": x.table.get("test", ""),
            "tableNo": x.table.get("tableNo"), "rowNo": x.row.get("rowNo"),
            "benchmark": x.table.get("benchmark", ""), "levelText": x.row.get("levelText", ""),
            "levelMin": x.level.low, "levelMax": x.level.high, "levelRangeKind": x.level.kind,
            "nocTeer": x.row.get("nocTeer", ""),
            "metric": language_metric(x.cell.get("column", "")),
            "scoreText": x.cell.get("valueText", ""),
            "scoreMin": score.low, "scoreMax": score.high, "rangeKind": score.kind,
            "seq": x.seq, "url": x.table.get("url", ""), "fetched": x.table.get("fetched", "")}


# =========================================================================
# 12. mart:试点三表(RCIP/FCIP 社区 / 社区×职业 / 名额状态)
# =========================================================================


def load_pilot_occ_sets() -> dict:
    """E6-11 批C 尾巴:社区在收职业集合(岗位 NOC × 社区清单交叉 → jobs.pilotOcc;
    判定在汇装层做 —— NOC 要等评分步定了才有)。"""
    out: dict = {}
    for pf in IN_PILOT_OCC:
        if not pf.exists():
            continue
        for r in read_table(pf).get(K_ROWS, []):
            if r.get(K_NOC):
                out.setdefault(r[K_COMMUNITY], set()).add(str(r[K_NOC]))
    return out


def build_pilot_communities() -> list:
    """RCIP/FCIP 试点社区维度(E6-11):cities 顿号连接,空=界线未举证不打标。"""
    rows: list = []
    for pf in IN_PILOT:
        if not pf.exists():
            continue
        pl = read_table(pf)
        for r in pl.get(K_ROWS, []):
            rows.append(to_pilot_community_row(PilotRowIn(row=r, fetched=pl.get(K_FETCHED, ""))))
    return rows


def build_pilot_occupations() -> list:
    """社区 × 职业清单(sector_only 行留痕不硬编码)。"""
    rows: list = []
    for pf in IN_PILOT_OCC:
        if not pf.exists():
            continue
        po = read_table(pf)
        for r in po.get(K_ROWS, []):
            rows.append(to_pilot_occupation_row(PilotRowIn(row=r,
                                                           fetched=po.get(K_FETCHED, ""))))
    return rows


def pilot_types_of(srcs: list) -> dict:
    """社区名 → 'RCIP' / 'FCIP' / 'RCIP+FCIP'(从两份 communities 读**并集**)。

    身兼两制 → 'RCIP+FCIP'(同 jobs.pilot 口径;Sudbury/Timmins 的 quota 行住 rcip 文件,
    type 仍须并集才判得出双身份)。
    """
    types: dict = {}
    for src in srcs:
        if not src.exists():
            continue
        for r in read_table(src).get(K_ROWS, []):
            types.setdefault(r[K_NAME], set()).add(r.get(K_TYPE, ""))
    out: dict = {}
    for n, s in types.items():
        got = []
        for t in PILOT_TYPES:
            if t in s:
                got.append(t)
        out[n] = PLUS.join(got)
    return out


def check_pilot_quota(rows: list) -> None:
    """脚本级自检(抽取器契约,坏一行整步失败,别带病入库)。

    宁缺勿猜:数值只透传官网原句里的数,缺 = None(官网没写 ≠ 0,firstCome 同理只有 True/None)。
    """
    assert rows, QUOTA_EMPTY_MSG
    for r in rows:
        assert r[K_COMMUNITY] and r[K_PROVINCE] and r[K_AS_OF], QUOTA_REQUIRED_TPL.format(row=r)
        for k in QUOTA_VALUE_KEYS:
            has = r[k] is not None
            assert has == bool(r[QUOTA_QUOTE_TPL.format(key=k)]) == bool(
                r[QUOTA_URL_TPL.format(key=k)]), QUOTA_PAIR_TPL.format(key=k,
                                                                       community=r[K_COMMUNITY])
        assert r[K_PER_INTAKE] is None or isinstance(r[K_PER_INTAKE], int), \
            QUOTA_INT_TPL.format(key=K_PER_INTAKE, row=r)
        assert r[K_REMAINING] is None or isinstance(r[K_REMAINING], int), \
            QUOTA_INT_TPL.format(key=K_REMAINING, row=r)
        if r[K_NOC]:
            assert r[K_STATUS] and r[K_QUOTE] and r[K_URL], QUOTA_OCC_TPL.format(row=r)


def build_pilot_quota(x: PilotQuotaIn) -> list:
    """RCIP/FCIP 社区名额状态(两域 quota 步产,批E 起两文件读并集)→ pilot_quota 表。

    一行 = 一社区(noc 空,社区级名额状态)或官网给的更细粒度(社区 × NOC 满额行,noc 非空)。
    文件全缺 → [](seed 侧 -1 跳过保留旧行);文件在但**并集** 0 行 → 抛错断整个 mart,
    不许「清空+重灌 0 行」把生产表静默抹掉(22c8d6a 空灌事故同款防线;
    ⚠ 断言在并集不在单文件 —— fcip 四站官网全文不提名额,fcip-quota 0 行是举证过的事实)。
    """
    live = []
    for s in x.srcs:
        if s.exists():
            live.append(s)
    if not live:
        return []
    type_of = pilot_types_of(x.communities_srcs)
    out: list = []
    for src in live:
        data = read_table(src)
        for r in data.get(K_COMMUNITIES, []):
            out.append(to_pilot_quota_row(QuotaRowIn(row=r, type_of=type_of, occupation=False)))
        for r in data.get(K_OCCUPATIONS, []):
            out.append(to_pilot_quota_row(QuotaRowIn(row=r, type_of=type_of, occupation=True)))
    check_pilot_quota(out)
    return out


def to_pilot_community_row(x: PilotRowIn) -> dict:
    """pilot_communities 表的一行。"""
    return {"name": x.row["name"], "province": x.row["province"], "type": x.row["type"],
            "cities": SEP_ZH.join(x.row.get("cities") or []), "url": x.row.get("url", ""),
            "fetched": x.fetched}


def to_pilot_occupation_row(x: PilotRowIn) -> dict:
    """pilot_occupations 表的一行。"""
    return {"community": x.row["community"], "province": x.row.get("province", ""),
            "type": x.row.get("type", ""), "noc": x.row.get("noc", "") or "",
            "title": x.row.get("title", ""), "sectorOnly": bool(x.row.get("sectorOnly")),
            "url": x.row.get("url", ""), "fetched": x.fetched}


def to_pilot_quota_row(x: QuotaRowIn) -> dict:
    """pilot_quota 表的一行(社区级名额状态 / 社区×NOC 满额行两形共用一套列)。"""
    row = {"community": x.row["community"], "province": x.row.get("province", ""),
           "type": x.type_of.get(x.row["community"], ""), "noc": "", "status": ""}
    if x.occupation:
        row["noc"] = x.row.get("noc", "")
        row["status"] = x.row.get("status", "")
        row.update(QUOTA_BLANK)
        row.update({"quote": x.row.get("quote", ""), "url": x.row.get("url", ""),
                    "asOf": x.row.get("asOf", "")})
        return row
    for k, v in QUOTA_BLANK.items():
        row[k] = x.row.get(k, v)
    row.update({"quote": "", "url": "", "asOf": x.row.get("asOf", "")})
    return row


# =========================================================================
# 13. mart:新闻与直通表(news / dli / field_sources / noc 两表 / 判死名单)
# =========================================================================


def news_excerpt(x: NewsExcerptIn) -> str:
    """P1c①:excerpt 在汇装层清洗(剥「From:/Media advisory/News release/标题复读」样板行,前端只显)。"""
    tnorm = NON_WORD_RE.sub("", x.title).lower()
    for para in x.body.split(PARA_SEP):
        p = SPACE.join(para.split())
        low = p.lower()
        if not p or low.startswith(NEWS_FROM_PREFIX) or low.rstrip(COLON) in NEWS_NOISE:
            continue
        if NON_WORD_RE.sub("", p).lower() == tnorm:
            continue
        return p[:NEWS_EXCERPT_MAX]
    return ""


def news_sort_key(r: dict) -> tuple:
    """新闻按发布日 + 抓取时刻倒序(原 lambda 退役)。"""
    return (r.get(K_DATE) or "", r.get(K_FETCHED_AT) or "")


def news_slug_of(x: NewsSlugIn) -> str:
    """稳定 slug = date + 标题 slug 化;撞车加序号(可读、进 URL)。"""
    head = (x.item.get(K_DATE) or "")[:DATE_LEN]
    slug = NEWS_SLUG_TPL.format(date=head, title=slugify(x.item[K_TITLE]))
    n = 2
    while slug in x.seen:
        slug = NEWS_SLUG_N_TPL.format(date=head, title=slugify(x.item[K_TITLE]), n=n)
        n += 1
    return slug


def build_news() -> list:
    """官方移民新闻(E12-06):raw 全量累积,mart 只带近 60 条(老的留 raw 不进站)。

    bodyZh/summaryZh 照灌(v3 拍板前端暂不渲,DB 留列开关式恢复)。
    P1c②:同稿去重(同 region+标题多 URL 只留最新,federal feed 会同稿两条)。
    """
    rows: list = []
    if not IN_NEWS.exists():
        return rows
    nd = read_table_soft(IN_NEWS)
    seen_slug: set = set()
    seen_story: set = set()
    for r in sorted(nd.get(K_ITEMS, []), key=news_sort_key, reverse=True):
        if len(rows) >= NEWS_MAX:
            break
        if not (r.get(K_TITLE) and r.get(K_URL) and r.get(K_BODY_EN)):
            continue
        story = (r.get(K_REGION, ""), NON_WORD_RE.sub("", r[K_TITLE]).lower())
        if story in seen_story:
            continue
        seen_story.add(story)
        slug = news_slug_of(NewsSlugIn(item=r, seen=seen_slug))
        seen_slug.add(slug)
        rows.append(to_news_row(NewsRowIn(item=r, slug=slug,
                                          fallback_fetched=nd.get(K_FETCHED, ""))))
    return rows


def build_dli() -> list:
    """PGWP 可申 DLI 子集(E12-03):上游已过滤去重,这里直通并带上着陆页 url+抓取日期(逐行出处)。"""
    if not IN_DLI.exists():
        return []
    dd = read_table_soft(IN_DLI)
    rows: list = []
    for r in dd.get(K_ROWS, []):
        rows.append(to_dli_row(DliRowIn(row=r, url=dd.get(K_URL, ""),
                                        fetched=dd.get(K_FETCHED, ""))))
    return rows


def build_field_sources() -> list:
    """字段级来源维度(E4-04):citations 域已抓取验证,这里直通(缺文件→空表,宁可留空)。"""
    if not IN_FIELD_SOURCES.exists():
        return []
    return read_table_soft(IN_FIELD_SOURCES).get(K_ROWS, [])


def build_noc_descriptions(x: NocDescIn) -> list:
    """NOC 官方名+主要职责维度(只收数据集出现过的 NOC,控制前端 payload;
    duties/requirements 存换行拼接文本)。"""
    rows: list = []
    if not IN_NOC_DESC.exists():
        return rows
    nd = read_table_soft(IN_NOC_DESC)
    fetched = nd.get(K_FETCHED, "")
    used: set = set()
    for j in x.jobs:
        if j.get(K_NOC):
            used.add(j.get(K_NOC))
    for n, v in nd.get(K_BY_NOC, {}).items():
        if n in used:
            rows.append(to_noc_description_row(NocDescRowIn(noc=n, entry=v, fetched=fetched,
                                                            i18n=x.i18n.get(n, {}))))
    return rows


def broad_count_key(kv: tuple) -> int:
    """大类取该职业岗位里出现最多的那个(与 SQL 的 mode() 同口径;原 lambda 退役)。"""
    return kv[1]


def openings_sort_key(r: dict) -> tuple:
    """在招量降序、同量按 NOC 升序 —— 落盘即有序,消费端不用再排(原 lambda 退役)。"""
    return (-r[K_OPEN], r[K_NOC])


def build_noc_openings(x: NocOpeningsIn) -> list:
    """职业在招量聚合(2026-08-12 Frank「把这个数据现在数据库里聚合好」)。

    先前选职业控件的热门榜是**每次请求现算**一个 GROUP BY(还带 percentile_cont 求中位),
    慢到要靠进程内缓存 + 前端分两次拉(先内置 14 个兜底、再换真榜)—— 用户看到的就是
    「一点一点刷出来」。脏活归 ETL:这里一次算完落 mart,库里按 open 建索引,
    前端(甚至 SSR)一次读出直接画。
    """
    by_noc: dict = {}
    for j in x.jobs:
        n = j.get(K_NOC)
        if not n or j.get(K_STATUS) != STATUS_OPEN:
            continue
        b = by_noc.get(n)
        if b is None:
            b = to_openings_bucket()
            by_noc[n] = b
        b[K_OPEN] += 1
        if j.get(K_PNP_ELIGIBLE):
            b[K_ELIGIBLE] += 1
        if isinstance(j.get(K_SALARY_ANNUAL), (int, float)):
            b[K_SAL].append(float(j[K_SALARY_ANNUAL]))
        if j.get(K_BROAD):
            b[K_BROAD][j[K_BROAD]] = b[K_BROAD].get(j[K_BROAD], 0) + 1
    desc_by_noc: dict = {}
    for d in x.descriptions:
        desc_by_noc[d[K_NOC]] = d
    rows: list = []
    for n, b in by_noc.items():
        rows.append(to_noc_opening_row(NocOpeningIn(noc=n, bucket=b,
                                                    desc=desc_by_noc.get(n, {}))))
    rows.sort(key=openings_sort_key)
    return rows


def sql_median_of(sal: list) -> float | None:
    """中位数与 SQL 的 percentile_cont(0.5) 同口径(偶数取两数均值);空样本 = None。"""
    if not sal:
        return None
    ordered = sorted(sal)
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2


def build_closed_jobs() -> list:
    """判死名单显式下发(2026-08-03)。

    光把死帖剔出 mart 不够 —— seed 的下架规则还要求「发布>30 天」,于是 28 天前就死掉的岗一直
    挂着「在招」(Fort Qu'Appelle 用户点两次申请撞过期页的那一单)。验尸拿到的 410/过期页是
    **事实**,不是「本次没抓到」的推断,不该受那条防误杀规则约束 → 单独出一张 closed_jobs,
    seed 见名单即置 closed,closedAt 用判死时刻(喂 JSON-LD 的 validThrough)。
    """
    rows: list = []
    if not IN_EXPIRED.exists():
        return rows
    for pid, ts in read_table(IN_EXPIRED).get(K_DEAD, {}).items():
        rows.append(to_closed_job_row(ClosedJobIn(pid=pid, closed_at=ts)))
    return rows


def load_expired_ids() -> set:
    """#124 批C:验尸判死帖不进 mart → 退出 seed 的 seen 集 → 既有「不在 seen 且发布>30天」
    规则自然置 closed。

    首跑教训:mart externalId 是 `jb:<posting_id>` 前缀形,验尸文件存裸 posting_id ——
    比对必须加前缀(0 剔除实锤)。
    """
    out: set = set()
    if not IN_EXPIRED.exists():
        return out
    for pid in read_table(IN_EXPIRED).get(K_DEAD, {}):
        out.add(JB_EXT_TPL.format(pid=pid))
    return out


def to_news_row(x: NewsRowIn) -> dict:
    """news 表的一行(importance = AI 重要度 1-5,展示=「重要」徽标,非资格判定)。"""
    return {"region": x.item.get("region", ""), "title": x.item["title"],
            "titleZh": x.item.get("titleZh") or None,
            "date": (x.item.get("date") or "")[:DATE_LEN], "slug": x.slug, "url": x.item["url"],
            "ogImage": x.item.get("ogImage") or None,
            "excerpt": news_excerpt(NewsExcerptIn(title=x.item["title"],
                                                  body=x.item["bodyEn"])) or None,
            "bodyEn": x.item["bodyEn"], "bodyZh": x.item.get("bodyZh") or None,
            "summaryZh": x.item.get("summaryZh") or None,
            "bodyKo": x.item.get("bodyKo") or None,
            "summaryKo": x.item.get("summaryKo") or None,
            "importance": x.item.get("importance"),
            "importanceNote": x.item.get("importanceNote") or None,
            "citation": x.item.get("citation") or "",
            "fetched": x.item.get("fetchedAt") or x.fallback_fetched}


def to_dli_row(x: DliRowIn) -> dict:
    """dli 表的一行(上游行直通 + 逐行出处)。"""
    row = dict(x.row)
    row.update({"url": x.url, "fetched": x.fetched})
    return row


def to_noc_description_row(x: NocDescRowIn) -> dict:
    """noc_descriptions 表的一行。

    窄位(图表横轴/chip/报告 H1)用的短名(04g 产,2026-08-02 起三语);没有就留空,前端回退
    完整译名 —— 官方英文 title 一个字不动,短名是**另一列**。
    """
    return {"noc": x.noc, "title": x.entry.get("title", ""),
            "titleZhShort": x.i18n.get("zhShort", ""), "titleKoShort": x.i18n.get("koShort", ""),
            "titleEnShort": x.i18n.get("enShort", ""),
            "titleZh": x.i18n.get("zh", ""), "titleKo": x.i18n.get("ko", ""),
            "duties": NL.join(x.entry.get("duties", [])),
            "requirements": NL.join(x.entry.get("requirements", [])),
            "fetched": x.fetched}


def to_openings_bucket() -> dict:
    """一个 NOC 的在招聚合桶初值。"""
    return {"open": 0, "eligible": 0, "sal": [], "broad": {}}


def to_noc_opening_row(x: NocOpeningIn) -> dict:
    """noc_openings 表的一行。"""
    med = sql_median_of(x.bucket["sal"])
    median = None
    if med is not None:
        median = round(med)
    broad = ""
    if x.bucket["broad"]:
        broad = max(x.bucket["broad"].items(), key=broad_count_key)[0]
    return {"noc": x.noc, "open": x.bucket["open"], "eligible": x.bucket["eligible"],
            "medianSalary": median, "broad": broad,
            "title": x.desc.get("title", ""), "titleZh": x.desc.get("titleZh", ""),
            "titleZhShort": x.desc.get("titleZhShort", ""),
            "titleKoShort": x.desc.get("titleKoShort", ""),
            "titleEnShort": x.desc.get("titleEnShort", "")}


def to_closed_job_row(x: ClosedJobIn) -> dict:
    """closed_jobs 表的一行。"""
    return {"externalId": JB_EXT_TPL.format(pid=x.pid), "closedAt": x.closed_at}


# =========================================================================
# 14. mart:装配与落盘(27 张表一次算齐;跨源汇装的收口点)
# =========================================================================


def new_mart_ctx() -> MartCtx:
    """装配累加器初值(读齐四份输入 + 三个去重集 + 两个计数器)。

    2026-08-04 数据销毁修:seen_ids = 本轮**真实见到**的全部 posting(不受展示去重那把尺子
    影响)。病根 —— 被 `company|title` 去重丢掉的帖同时退出了 seed 的「本次见过」集,满 30 天
    被静默 closed,而 DB 侧的重复判定带城市(company×title×city),两套口径打架 → 实测 5.4k 个
    「不在本轮 mart」的在招岗里抽样 60% 官方仍在招。展示去重与「我们这轮见过什么」是两件事。
    """
    scored: dict = {}
    if IN_SCORED.exists():
        for s in read_rows(IN_SCORED):
            scored[s[K_EXTERNAL_ID]] = s
    wages: dict = {}
    if IN_WAGES.exists():
        wages = read_table(IN_WAGES)
    guards = SalaryGuards(absurd=0, ratio=0, cap=0, gig=0, hifold=0)
    return MartCtx(scored=scored, wages=wages, enrich=load_enrich(), places=load_places(), briefs=load_briefs(),
                   pilot_occ_sets=load_pilot_occ_sets(), expired=load_expired_ids(),
                   salary_guards=guards, companies={}, jobs=[], seen=set(),
                   seen_ext=set(), seen_ids=set(), dropped_expired=0, late_salary=0)


def say_mart_tallies(ctx: MartCtx) -> None:
    """本轮汇装的三个留痕数(验尸剔除 / 薪资兜底 / 见过但不进 mart)。

    薪资兜底恒为 0 说明抓取与建表的窗口已关;持续偏大 = 撞得厉害,该去看编排顺序而不是加大兜底。
    「本轮见过」名单(2026-08-04):seed 的下架对账**只**认它,不再拿去重后的 mart.jobs 当见过集。
    一个岗被下架从此只剩两条路:① 命中 closed_jobs 判死名单(410/过期页=事实);
    ② 真的不在这张表里 且 发布已超 30 天(推断,保守兜底)。展示去重不再有下架副作用。
    """
    if ctx.dropped_expired:
        say(MART_EXPIRED_TPL.format(n=ctx.dropped_expired))
    if ctx.late_salary:
        say(MART_LATE_SALARY_TPL.format(n=ctx.late_salary))
    say(MART_SEEN_TPL.format(seen=len(ctx.seen_ids), jobs=len(ctx.jobs),
                             gap=len(ctx.seen_ids) - len(ctx.jobs)))


def to_mart_tables() -> dict:
    """跨源汇装:27 张表一次算齐 → {表名: 行清单}。

    名字带 to_ 前缀是方言律⑩的直接后果:这个 dict 的**键就是落盘文件名 = DB 表名**,
    是 json 边界的键,只许住行构造器 —— 它构造的「行」正好是一整轮 mart 的清单。

    产出 data/mart/(每个文件 = 一张 Payload 表):
      事实表  companies.json  jobs.json
      维度表  provinces.json  cities.json  districts.json  designated_employers.json …
      对账表  closed_jobs.json(实测判死名单)· seen_ids.json(本轮**真实见过**的全部 posting id,
              含被展示去重丢掉的 —— seed 的下架对账只认它,展示去重不许有下架副作用)
    seed 从此只读 mart 直接灌库,不再在加载器里东拼西凑(中介过滤/去重/评分关联都下沉到这)。
    """
    ctx = new_mart_ctx()
    collect_ats_rows(ctx)
    collect_jobbank_rows(ctx)
    fill_companies_lmia(ctx)
    fill_company_grades(ctx)
    fill_jd_bodies(ctx)
    say_mart_tallies(ctx)
    noc_i18n = load_i18n(I18N_NOC_FILE)
    city_i18n = load_i18n(I18N_CITY_FILE)
    ee_draws = load_ee_draws()
    descriptions = build_noc_descriptions(NocDescIn(jobs=ctx.jobs, i18n=noc_i18n))
    universe = load_noc_universe()
    return {
        "companies": list(ctx.companies.values()), "jobs": ctx.jobs,
        "closed_jobs": build_closed_jobs(), "seen_ids": sorted(ctx.seen_ids),
        "provinces": build_provinces(prov_info()),
        "cities": build_cities(CityBuildIn(jobs=ctx.jobs, i18n=city_i18n)),
        "districts": build_districts(ctx.jobs),
        "designated_employers": build_designated(),
        "pilot_communities": build_pilot_communities(),
        "pilot_occupations": build_pilot_occupations(),
        "pilot_quota": build_pilot_quota(PilotQuotaIn(srcs=IN_PILOT_QUOTA,
                                                      communities_srcs=IN_PILOT)),
        "noc_categories": build_noc_categories(ctx.jobs),
        "sources": build_name_rows(field_values_of(FieldValuesIn(jobs=ctx.jobs,
                                                                 key=K_SOURCE_LABEL))),
        "experience_levels": build_name_rows(field_values_of(
            FieldValuesIn(jobs=ctx.jobs, key=K_ACCESSIBILITY))),
        "pnp_occupations": build_pnp_occupations(),
        "pnp_draws": build_pnp_draws(DrawsBuildIn(stream_zh=load_draw_stream_zh(),
                                                  ee_history=ee_draws.history,
                                                  ee_fetched=ee_draws.fetched)),
        "pnp_score_factors": build_pnp_score_factors(universe),
        "pnp_requirements": build_pnp_requirements(IN_REQ_TABLES),
        "pnp_ops_stats": build_pnp_ops_stats(IN_PNP_STATS),
        "ee_categories": build_ee_categories(ee_draws.by_category),
        "ee_points_grid": build_ee_points_grid(EePointsIn(crs_src=IN_EE_CRS,
                                                          elig_src=IN_EE_ELIG)),
        "ee_language_grid": build_ee_language_grid(IN_EE_LANG),
        "noc_descriptions": descriptions,
        "noc_openings": build_noc_openings(NocOpeningsIn(jobs=ctx.jobs,
                                                         descriptions=descriptions)),
        "field_sources": build_field_sources(),
        "dli": build_dli(),
        "news": build_news(),
    }


def write_open_ids(seen_ids: list) -> None:
    """验尸用的「还在板上」名单(2026-08-03;2026-08-04 改口径)。

    verify 的预算只该花在用户看得见的岗上。**改用 seen_ids 而不是去重后的 jobs** —— 修完去重
    副作用后,被展示去重丢掉的帖仍以 open 留在库里、用户仍点得到(DB 的重复判定带城市),
    它们必须继续被验尸,否则永不判死。剩下被筛掉的仍是库里早已 closed / 中介过滤掉的帖。
    写 processed/ 不写 mart/:mart 目录整个会被 upload 传去 cms,这张表纯属 ETL 内部协作。
    """
    ids = []
    for e in seen_ids:
        if e.startswith(JB_EXT_PREFIX):
            ids.append(e[len(JB_EXT_PREFIX):])
    paths.write_json(paths.WriteJsonIn(path=OUT_MART_OPEN_IDS, payload=sorted(ids),
                                       indent=INDENT_2, compact=True))


def build_mart() -> None:
    """步骤②:跨源汇装 data/mart/(一文件 = 一张 DB 表;中介过滤/去重/评分关联全在这层落定)。"""
    OUT_MART.mkdir(parents=True, exist_ok=True)
    mart = to_mart_tables()
    write_open_ids(mart[K_SEEN_IDS])
    write_mart_table(TableWriteIn(tables=mart, out_dir=OUT_MART))
    say(MART_DONE_TPL.format(dir=OUT_MART))
    say_table_counts(SayCountsIn(tables=mart, width=TABLE_NAME_WIDTH))


# =========================================================================
# 15. 榜单(E5-02,PRD F8:计算全部下沉数据层,前端只 SELECT rankings 渲染)
# =========================================================================


def is_direct(j: dict) -> bool:
    """第一方判定(镜像前端 isDirect):JB 渠道仅 source=='Job Bank' 算直发;ATS 天然第一方。"""
    if JOBBANK_HOST in (j.get(K_APPLY_URL) or ""):
        return j.get(K_SOURCE) == SOURCE_JOB_BANK
    return True


def rank_job_key(j: dict) -> tuple:
    """榜内排序:评分降序,同分薪资高优先(原 lambda 退役)。"""
    return (-(j.get(K_SCORE) or 0), -(j.get(K_SALARY_ANNUAL) or 0))


def sponsor_rank_key(kv: tuple) -> tuple:
    """最可能担保雇主排序键(E6-02:LMIA 雇佣史=最硬证据,第一排序键)。"""
    a = kv[1]
    return (-a.lmia, -a.named, -a.open_jobs, -avg_score_of(a.scores))


def avg_score_of(scores: list) -> float:
    """一组评分的均值(空样本 = 0,只用于排序不落盘)。"""
    if not scores:
        return 0
    return sum(scores) / len(scores)


def fill_company_names(x: RankNamesIn) -> None:
    """公司名冗余进 job 行(展示用;E4-03:页面零 join 零计算)。"""
    for j in x.jobs:
        j[K_COMPANY_NAME] = (x.companies.get(j.get(K_COMPANY_SLUG)) or {}).get(K_NAME, "")


def build_weekly_top(jobs: list) -> list:
    """榜 1:本周新增 TOP 50 —— datePosted 7 天内、在招,按评分降序(同分薪资高优先)。

    口径注:mart 无 firstSeen(它是 DB 侧种入时间戳),用 datePosted 表达「本周新增」,偏离文档已记档。
    """
    cut = (date.today() - timedelta(days=WEEKLY_DAYS)).isoformat()
    pool = []
    for j in jobs:
        if j.get(K_STATUS) != STATUS_CLOSED and (j.get(K_DATE_POSTED) or "") >= cut:
            pool.append(j)
    pool.sort(key=rank_job_key)
    rows = []
    for i, j in enumerate(pool[:WEEKLY_N], 1):
        rows.append(to_rank_job_row(RankJobRowIn(slug=SLUG_WEEKLY_TOP, rank=i, job=j)))
    say(WEEKLY_DONE_TPL.format(pool=len(pool), n=min(WEEKLY_N, len(pool))))
    return rows


def build_daily_top(jobs: list) -> list:
    """榜 3:每日精选(全国 + 按职业大类;2026-07-16 用户拍板「榜单可以有不同类别」)。

    口径:近 48h 新发布(帖面日期,给东部时区/晚发帖留余量)× 评分≥60,按评分精选;
    大类榜岗不够(<DAILY_MIN)当天不出榜 —— 宁缺,不凑数。slug ascii 化(URL 段)。
    """
    dcut = (date.today() - timedelta(days=DAILY_DAYS)).isoformat()
    daily = []
    for j in jobs:
        if (j.get(K_STATUS) != STATUS_CLOSED and (j.get(K_DATE_POSTED) or "") >= dcut
                and (j.get(K_SCORE) or 0) >= DAILY_SCORE_GATE):
            daily.append(j)
    daily.sort(key=rank_job_key)
    rows = []
    for i, j in enumerate(daily[:DAILY_N], 1):
        rows.append(to_rank_job_row(RankJobRowIn(slug=SLUG_DAILY_TOP, rank=i, job=j)))
    made = 1
    for zh, key in NOC_BROAD_SLUG.items():
        sub = []
        for j in daily:
            if j.get(K_BROAD) == zh:
                sub.append(j)
        if len(sub) < DAILY_MIN:
            continue
        for i, j in enumerate(sub[:DAILY_N], 1):
            rows.append(to_rank_job_row(RankJobRowIn(slug=DAILY_SLUG_TPL.format(key=key),
                                                     rank=i, job=j)))
        made += 1
    say(DAILY_DONE_TPL.format(pool=len(daily), gate=DAILY_SCORE_GATE, made=made))
    return rows


def aggregate_sponsor_jobs(x: SponsorBuildIn) -> dict:
    """榜 2 的公司聚合:只收在招、有公司、公司名非中介、第一方直发的岗。"""
    agg: dict = {}
    for j in x.jobs:
        if j.get(K_STATUS) == STATUS_CLOSED or not j.get(K_COMPANY_SLUG):
            continue
        name = j.get(K_COMPANY_NAME, "")
        if not name or MART_AGENCY_RE.search(name):
            continue
        if not is_direct(j):
            continue
        a = agg.get(j[K_COMPANY_SLUG])
        if a is None:
            a = to_sponsor_agg(SponsorAggIn(name=name,
                                            company=x.companies.get(j[K_COMPANY_SLUG]) or {}))
            agg[j[K_COMPANY_SLUG]] = a
        bump_sponsor_agg(SponsorBumpIn(agg=a, job=j))
    return agg


def bump_sponsor_agg(x: SponsorBumpIn) -> None:
    """把一条岗记进它公司的榜单聚合桶。"""
    x.agg.open_jobs += 1
    if x.job.get(K_PNP_STREAM):
        x.agg.named += 1
    if x.job.get(K_SCORE) is not None:
        x.agg.scores.append(x.job[K_SCORE])
    if x.job.get(K_PROVINCE):
        x.agg.provs.add(x.job[K_PROVINCE])
    if not x.agg.official:
        x.agg.official = x.job.get(K_OFFICIAL_URL) or ""


def build_sponsor_likely(x: SponsorBuildIn) -> list:
    """榜 2:最可能担保雇主 TOP 30 —— 公司聚合:第一方直发 + 省具名通道命中岗数,
    按 (LMIA 获批职位数, 具名通道岗数, 在招岗数, 平均分) 降序。

    入榜门槛(E6-02 升级):LMIA 雇佣史(实证)或 具名通道命中(省点名),二者其一。
    """
    agg = aggregate_sponsor_jobs(x)
    ranked = []
    for slug, a in sorted(agg.items(), key=sponsor_rank_key):
        if a.lmia > 0 or a.named > 0:
            ranked.append((slug, a))
    rows = []
    for i, pair in enumerate(ranked[:SPONSOR_N], 1):
        rows.append(to_sponsor_row(SponsorRowIn(slug=pair[0], rank=i, agg=pair[1])))
    say(SPONSOR_DONE_TPL.format(total=len(agg), n=len(rows)))
    return rows


def build_mart_rankings() -> None:
    """步骤③:E5-02 榜单(读 mart 纯聚合,跑在汇装之后)。

    行遵守 E4-03 约束:只含事实字段 + 官方链接(applyUrl/officialUrl);展示字段冗余进行。
    """
    say(RANK_IN_TPL.format(jobs=IN_MART_JOBS, companies=IN_MART_COMPANIES, out=OUT_RANKINGS))
    jobs = read_rows(IN_MART_JOBS)
    companies: dict = {}
    for c in read_rows(IN_MART_COMPANIES):
        companies[c.get(K_SLUG)] = c
    fill_company_names(RankNamesIn(jobs=jobs, companies=companies))
    rows: list = []
    rows += build_weekly_top(jobs)
    rows += build_daily_top(jobs)
    rows += build_sponsor_likely(SponsorBuildIn(jobs=jobs, companies=companies))
    paths.write_json(paths.WriteJsonIn(path=OUT_RANKINGS, payload=rows, indent=INDENT_2))
    say(RANK_DONE_TPL.format(n=len(rows), out=OUT_RANKINGS))


def to_rank_job_row(x: RankJobRowIn) -> dict:
    """rankings 表的一行岗位(公司行专属的四列此处恒空,列型两形共用)。"""
    return {"slug": x.slug, "rank": x.rank, "kind": RANK_KIND_JOB,
            "externalId": x.job.get("externalId", ""),
            "title": x.job.get("title", ""), "company": x.job.get("companyName", ""),
            "city": x.job.get("city", ""), "province": x.job.get("province", ""),
            "noc": x.job.get("noc", ""), "teer": x.job.get("teer"),
            "score": x.job.get("score"), "salaryText": x.job.get("salaryText", ""),
            "salaryAnnual": x.job.get("salaryAnnual"),
            "pnpStream": x.job.get("pnpStream", ""), "eeCategory": x.job.get("eeCategory", ""),
            "datePosted": x.job.get("datePosted", ""), "applyUrl": x.job.get("applyUrl", ""),
            "openJobs": None, "namedJobs": None, "avgScore": None, "officialUrl": ""}


def to_sponsor_agg(x: SponsorAggIn) -> SponsorAgg:
    """一家公司的榜单聚合桶初值。

    lmia 取 lmiaPositionsSkilled(榜单口径:剔除农业/季节股 —— 温室/渔场百人季节工会淹没
    技能类榜);第 17 轮 #21:第一排序键上榜可见,带最近季度。
    """
    return SponsorAgg(name=x.name, open_jobs=0, named=0, scores=[], provs=set(), official="",
                      lmia=x.company.get("lmiaPositionsSkilled") or 0,
                      lmia_quarter=x.company.get("lmiaLastQuarter") or "")


def to_sponsor_row(x: SponsorRowIn) -> dict:
    """rankings 表的一行公司(岗位行专属的列此处恒空;#21:榜单显示第一排序键)。"""
    avg = None
    if x.agg.scores:
        avg = round(sum(x.agg.scores) / len(x.agg.scores), 1)
    return {"slug": SLUG_SPONSOR_LIKELY, "rank": x.rank, "kind": RANK_KIND_COMPANY,
            "externalId": "", "title": "", "company": x.agg.name,
            "city": "", "province": SLASH.join(sorted(x.agg.provs)),
            "noc": "", "teer": None, "score": None, "salaryText": "", "salaryAnnual": None,
            "pnpStream": "", "eeCategory": "", "datePosted": "", "applyUrl": "",
            "openJobs": x.agg.open_jobs, "namedJobs": x.agg.named, "avgScore": avg,
            "officialUrl": x.agg.official, "companySlug": x.slug,
            "lmiaPositions": x.agg.lmia or None, "lmiaQuarter": x.agg.lmia_quarter or None}


# =========================================================================
# 16. 地区统计(E5-04 省×大类×中类 + E8-14 日/职业/城市 + E13 派生 + E14 担保率)
# =========================================================================


def comparable_quarter() -> str | None:
    """E14-02:LMIA 季度源文件名集合 ∩ JVWS raw 表 quarters[] 的**最近共同季度**
    ('YYYYQN' 字符串可直接比大小排序)。

    同季对同季;若 LMIA 最新季晚于 JVWS 最新季(或反过来),退到两者都有的最近季。
    任一侧没有交集(如某侧数据完全没跑过)→ None,调用方把 sponsor_* 四列整列写 None,不硬凑。
    """
    lmia_qs: set = set()
    for p in IN_LMIA_XLSX_DIR.glob(LMIA_XLSX_GLOB):
        m = QUARTER_FILE_RE.match(p.name)
        if m:
            lmia_qs.add(m.group(1).upper())
    if not lmia_qs or not IN_JVWS_RAW.exists():
        return None
    jvws_qs = set(read_table(IN_JVWS_RAW).get(K_QUARTERS_LIST, []))
    common = lmia_qs & jvws_qs
    if not common:
        return None
    return max(common)


def lmia_positions_by_noc(quarter: str) -> dict:
    """单季度 xlsx(lmia 域已缓存的同一份季度源,原地复用不重下)→ {noc: approved positions}。

    全国口径 —— ESDC 表本没有省份维度上限,但 JVWS 分母本轮只取全国 NAT,省级担保率留后续批次。
    ESDC LMIA 是穷举的行政记录,不是抽样调查:某 NOC 当季没出现 = 确实 0 件获批,不是官方抑制
    (与 JVWS 分母的 None 抑制语义不同,数字 0 在这里就是真 0,可以直接用)。
    解析逻辑(表头定位/跳过尾注行/列位)照抄 lmia 域的季度解析,但只按 NOC 聚合 positions,
    不建雇主维护表(那张表把 8 个季度累加到一起,丢了单季颗粒度,做不了本表要的「同季对同季」)。
    openpyxl 延迟 import,同 lmia 域惯例(镜像 Dockerfile 需装 openpyxl)。
    """
    import openpyxl
    path = IN_LMIA_XLSX_DIR / LMIA_XLSX_TPL.format(quarter=quarter.lower())
    if not path.exists():
        return {}
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    out: dict = defaultdict(int)
    header: list | None = None
    # pyrefly: ignore[missing-attribute] — openpyxl 存根把 wb.active 标成可空(空工作簿档);这里是官方 xlsx,拿不到就该炸
    for row in ws.iter_rows(values_only=True):
        cells = []
        for c in row:
            if c is None:
                cells.append("")
            else:
                cells.append(str(c).strip())
        if header is None:
            if cells and cells[0].startswith(LMIA_HEADER_WORD):
                header = cells
            continue
        if len(cells) < LMIA_MIN_COLS or not cells[2]:
            continue
        m = NOC_RE.match(cells[4])
        if not m:
            continue
        try:
            out[m.group(1).zfill(NOC_LEN)] += int(float(cells[7] or 0))
        except ValueError:
            continue
    wb.close()
    return dict(out)


def to_flow_bucket() -> dict:
    """一个 (noc, province) 流量桶的初值(原 defaultdict(lambda: {...}) 退役)。"""
    return {"new30d": 0, "new30d_prev": 0, "new14d": 0, "new14d_prev": 0, "closed30d": 0}


def flow_windows_of() -> FlowWindows:
    """五条时间线 + 爬坡期闸门。

    E13-02 v3(2026-08-06 晚,再修订):mom30d 的分母窗口 (T−60d,T−30d] 撞上本站抓取从局部
    覆盖扩到全 10 省全职业的爬坡期(实测:2026-06-18~06-25 那周从 94 条跳到 3608 条,此后才
    稳定在 1.1~1.3 万/周)—— 60 天窗口只要还咬到爬坡期,mom30d 就是「跟当年数据本来就少的
    自己比」,不是真实环比(v2 实测中位数 +169%)。分母窗起点早于 COVERAGE_COMPLETE 就整列
    写 null(8-31 起 T−60d 滑过 07-02,自然解禁,不用改代码)。
    """
    today = date.today()
    cut60 = today - timedelta(days=FLOW_60D)
    return FlowWindows(today=today, cut14=today - timedelta(days=FLOW_14D),
                       cut28=today - timedelta(days=FLOW_28D),
                       cut30=today - timedelta(days=FLOW_30D), cut60=cut60,
                       mom30_gated=cut60 < COVERAGE_COMPLETE)


def load_dead_dates() -> dict:
    """expired_ids.json 的判死台账:posting_id → 判死日。"""
    out: dict = {}
    if not IN_EXPIRED.exists():
        return out
    for pid, ts in read_table(IN_EXPIRED).get(K_DEAD, {}).items():
        d = parse_iso_date(ts)
        if d:
            out[pid] = d
    return out


def flow_recs_of(postings: list) -> list:
    """参与流量统计的帖(有 posting_id 且 NOC 判得出 TEER 的)。"""
    out: list = []
    for p in postings:
        noc = p.get(K_NOC) or ""
        pid = p.get(K_POSTING_ID)
        if not pid or teer_of(noc) is None:
            continue
        out.append(FlowRec(noc=noc, prov=(p.get(K_PROVINCE) or "").upper(),
                           posted=parse_posted(p.get(K_DATE)), pid=pid))
    return out


def bump_flow(x: FlowAddIn) -> None:
    """把一条帖记进它所属的各个流量桶(新增/上期新增/两周窗/上两周窗/近 30 天下架)。"""
    w = x.windows
    posted = x.rec.posted
    for k in x.keys:
        bucket = x.flow[k]
        if posted is not None and posted >= w.cut30:
            bucket[K_NEW30D] += 1
        if posted is not None and w.cut60 < posted <= w.cut30:
            bucket[K_NEW30D_PREV] += 1
        if posted is not None and posted >= w.cut14:
            bucket[K_NEW14D] += 1
        if posted is not None and w.cut28 < posted <= w.cut14:
            bucket[K_NEW14D_PREV] += 1
        if x.closed_date is not None and w.cut30 < x.closed_date <= w.today:
            bucket[K_CLOSED30D] += 1


def finish_flow(x: FlowFinishIn) -> None:
    """收尾派生:净增、两个环比(分母样本 <5 不给比值;mom30d 撞爬坡期整列 null)。"""
    for d in x.flow.values():
        d[K_NET30D] = d[K_NEW30D] - d[K_CLOSED30D]
        d[K_MOM30D] = None
        if not x.gated:
            d[K_MOM30D] = mom_of(MomIn(now=d[K_NEW30D], prev=d[K_NEW30D_PREV]))
        d[K_MOM14D] = mom_of(MomIn(now=d[K_NEW14D], prev=d[K_NEW14D_PREV]))


def mom_of(x: MomIn) -> float | None:
    """环比涨跌(上期样本 <5 = 判不出,写 null 不硬算)。"""
    if x.prev >= MOM_MIN_PREV:
        return x.now / x.prev - 1
    return None


def closed_days_of(x: ClosedDaysIn) -> int | None:
    """一条判死记录的在招天数;NOC 判不出 TEER / 发布日或判死日认不出 / 判死早于发布 → None 不计。"""
    if teer_of(x.posting.get(K_NOC) or "") is None:
        return None
    posted = parse_posted(x.posting.get(K_DATE))
    closed_at = parse_iso_date(x.closed.get(K_CLOSED_AT))
    if not posted or not closed_at or closed_at < posted:
        return None
    return (closed_at - posted).days


def avg_days_open_of(x: AvgDaysIn) -> dict:
    """avg_days_open:只认 closed_jobs.json(实测判死);postings.json 只用来查回 noc/province/发布日。"""
    pmap: dict = {}
    for p in x.postings:
        if p.get(K_POSTING_ID):
            pmap[p[K_POSTING_ID]] = p
    days: dict = defaultdict(list)
    if IN_MART_CLOSED.exists():
        for c in read_rows(IN_MART_CLOSED):
            pp = pmap.get((c.get(K_EXTERNAL_ID) or "").split(COLON, 1)[-1])
            if not pp:
                continue
            n = closed_days_of(ClosedDaysIn(closed=c, posting=pp))
            if n is None:
                continue
            noc = pp.get(K_NOC) or ""
            days[(noc, ALL)].append(n)
            prov = (pp.get(K_PROVINCE) or "").upper()
            if prov in PROVS:
                days[(noc, prov)].append(n)
    out: dict = {}
    for k, v in days.items():
        out[k] = None
        if len(v) >= AVG_DAYS_MIN_N:
            out[k] = round(statistics.mean(v), 1)
    return out


def build_flow_stats() -> FlowStatsOut:
    """E13-02 v3(设计文档 §3 修订):从 postings.json(累积当前态,不是时序)推
    new30d/new30d_prev/mom30d + new14d_prev/mom14d,从 expired_ids.json 的判死台账推 closed30d
    + stats_daily 的 closed,从 closed_jobs.json(实测判死,mart)推 avg_days_open。

    v1→v2 变更(如实记录):v1 拿 postings.last_seen「停更」当下架信号,实测证伪 —— 增量抓取
    不复核老帖,发布 >7 天的帖当天 last_seen 命中率≈0%,把 closed30d 撑高了约六成。v2 换成
    验尸件的判死台账(expired_ids.json.dead:posting_id→判死时刻,7-25 起累积,27k 条)。
    ⚠️ closed30d/stats_daily.closed 仍有局限,未上前端(见设计文档 §3「上前端?」列):
    **判死日≠真实下架日** —— 台账是「哪天
    被本站的验尸脚本抽中并确认 410」,不是「哪天真的从 Job Bank 下架」,排水期会显得虚高、扎堆
    (实测:8-03 单天判死 7364 条、8-05 判死 6858 条,对比稳态几百条/天)。因此只入库不进
    S1-S3 展示,等台账进入稳态(E13-04)再校准启用。
    v2→v3 变更:mom30d 加 COVERAGE_COMPLETE 闸门,另加 mom14d,pulse_score 动量分量改用它;
    avg_days_open 不受这两轮修订影响,仍只认 closed_jobs.json。
    """
    if not IN_JOBBANK.exists():
        say(FLOW_NO_POSTINGS_TPL.format(path=IN_JOBBANK))
        return FlowStatsOut(flow={}, avg_open={}, daily_closed={})
    postings = read_rows(IN_JOBBANK)
    w = flow_windows_of()
    dead = load_dead_dates()
    flow: dict = defaultdict(to_flow_bucket)
    daily_closed: dict = defaultdict(int)
    for rec in flow_recs_of(postings):
        keys = [(rec.noc, ALL)]
        if rec.prov in PROVS:
            keys.append((rec.noc, rec.prov))
        closed_date = dead.get(rec.pid)
        bump_flow(FlowAddIn(flow=flow, keys=keys, rec=rec, closed_date=closed_date, windows=w))
        if closed_date == w.today and rec.prov in PROVS:
            daily_closed[(rec.prov, broad_of(rec.noc))] += 1
            daily_closed[(rec.prov, ALL)] += 1
    finish_flow(FlowFinishIn(flow=flow, gated=w.mom30_gated))
    return FlowStatsOut(flow=dict(flow),
                        avg_open=avg_days_open_of(AvgDaysIn(postings=postings)),
                        daily_closed=dict(daily_closed))


def zscores(vals: list) -> list:
    """组内 z-score。None(算不出的项)记 0 —— 中性,不拉不拽那一项的分;
    样本<2 或全同值一并归 0(防除零)。"""
    xs = []
    for v in vals:
        if v is not None:
            xs.append(v)
    if len(xs) < 2:
        return [0.0] * len(vals)
    m = statistics.mean(xs)
    sd = statistics.pstdev(xs)
    if not sd:
        return [0.0] * len(vals)
    out = []
    for v in vals:
        if v is None:
            out.append(0.0)
        else:
            out.append((v - m) / sd)
    return out


def channel_tier(x: ChannelTierIn) -> str | None:
    """E13-07 通道档(Frank 08-06 深夜四档拍板)。

    省具名紧缺 ∪ 联邦 EE 类别 = 点名(双头/单头);都没点名时 TEER 0-3 还有 EE 泛池,
    TEER 4-5 只剩雇主担保(最难);TEER 未分类不硬塞档。
    """
    prov_named = x.noc in x.named_any
    fed_named = x.noc in x.ee_by_noc
    if prov_named and fed_named:
        return TIER_BOTH
    if prov_named:
        return TIER_PROV
    if fed_named:
        return TIER_FED
    if x.teer in TEER_SKILLED:
        return TIER_EE
    if x.teer is not None:
        return TIER_EMPLOYER
    return None


def named_any_of(tables: PnpTables) -> set:
    """全国任一省具名通道命中的 NOC 并集。"""
    out: set = set()
    for nocs in tables.named_by_prov.values():
        out.update(nocs)
    return out


def sponsor_of(x: SponsorOfIn) -> dict:
    """E14-02 担保率 = LMIA 同季获批岗位数(分子,担保侧)÷ JVWS 同季全国空缺数(分母,全市场)。

    只在 stats_occupation 的 province='all' 全国行落值(与 pnpProvs/channelTier 同款做法 ——
    省级担保率需要省级 LMIA×NOC 拆分,本轮不做,YAGNI)。
    口径详见 docs/implementation/E14-全市场数据三角/02_担保率.md。
    """
    if not x.quarter:
        return to_sponsor_blank()
    pos = x.lmia.get(x.noc, 0)
    v = x.jvws.get(x.noc)
    return to_sponsor_cell(SponsorCellIn(quarter=x.quarter, pos=pos, jvws=v, teer=x.teer))


def to_agg_columns(x: StatsAggIn) -> dict:
    """职业/城市两张表共用的聚合块(两个薪资口径并存,2026-07-28 Frank 放行)。

      medianWageAnnual  = **ESDC 官方**中位年薪(每个岗按其 NOC×省 查官方表,再取中位)——
                          权威基线,不随我们抓到多少帖子而漂;与省级 stats 表同一口径。
      medianSalaryAnnual= 帖面中位(本站折算)—— 当下行情,样本薄时会失真。
      salaryN           = 有帖面薪资的岗位数 = 帖面中位的**样本量**。实核:全国 17 个职业、
                          分省 723 行是「1 个岗 + 一个中位」—— 样本量落表,前端才有依据决定
                          报不报,而不是前端瞎定阈值。
      wageLow/HighAnnual= ESDC 低/高位年薪(2026-07-31 Frank「改成范围」):与中位同口径,
                          不是全省极值,也不发明全国聚合。
    """
    sal = []
    for j in x.jobs:
        if j.get(K_SALARY_ANNUAL):
            sal.append(j.get(K_SALARY_ANNUAL))
    return {"openJobs": len(x.jobs),
            "new7d": count_new7d(StatsAggIn(jobs=x.jobs, cut7=x.cut7)),
            "medianWageAnnual": median_or_none(column_of(ColumnIn(jobs=x.jobs,
                                                                  key=K_WAGE_MED_ANNUAL))),
            "wageLowAnnual": median_or_none(column_of(ColumnIn(jobs=x.jobs,
                                                               key=K_WAGE_LOW_ANNUAL))),
            "wageHighAnnual": median_or_none(column_of(ColumnIn(jobs=x.jobs,
                                                                key=K_WAGE_HIGH_ANNUAL))),
            "medianSalaryAnnual": median_or_none(column_of(ColumnIn(jobs=x.jobs,
                                                                    key=K_SALARY_ANNUAL))),
            "salaryN": len(sal),
            "namedJobs": count_named(x.jobs)}


def column_of(x: ColumnIn) -> list:
    """取某一列的全部取值(含 None;中位函数自己滤)。"""
    out = []
    for j in x.jobs:
        out.append(j.get(x.key))
    return out


def count_new7d(x: StatsAggIn) -> int:
    """桶内 7 天新增(datePosted 近 7 天)。"""
    n = 0
    for j in x.jobs:
        if (j.get(K_DATE_POSTED) or "") >= x.cut7:
            n += 1
    return n


def count_named(jobs: list) -> int:
    """桶内省具名通道命中岗数。"""
    n = 0
    for j in jobs:
        if j.get(K_PNP_STREAM):
            n += 1
    return n


def to_flow_columns(x: FlowOfIn) -> dict:
    """某 (noc, province) 的流量派生列。

    找不到 = 该 noc×province 在本轮 postings.json 里没有可归属的样本,真实 0(不是没算)。
    new14d 入库(契约缝隙修补:S1「近14天新发」主数字要直读它,不能只当 mom14d 中间量)。
    """
    f = x.flow.get(x.key, FLOW_BLANK)
    return {"new30d": f["new30d"], "new30dPrev": f["new30d_prev"],
            "new14d": f.get("new14d", 0), "new14dPrev": f["new14d_prev"],
            "closed30d": f["closed30d"], "net30d": f["net30d"],
            "mom30d": f.get("mom30d"), "mom14d": f.get("mom14d"),
            "avgDaysOpen": x.avg_open.get(x.key)}


def prov_list_of(x: ProvListIn) -> str:
    """按官方省序连成顿号串(E13-05 榜A「可提名省份」列的省序;QC 由 pnp_eligible 内部排除)。

    E13-05:全国 occ 行的 pnpProvs **复用本域的 pnp_eligible / pnp_direct / any_pr_path**
    (禁复制判定逻辑)—— 全溶前它们住 08_score,统计件靠 importlib 按路径拉;批I 同域后直调。
    """
    got = []
    for p in PNP_PROV_ORDER:
        judge = PnpJudgeIn(tables=x.tables, noc=x.noc, teer=x.teer, prov=p)
        if x.mode == PROV_MODE_DIRECT and pnp_direct(judge):
            got.append(p)
        elif x.mode == PROV_MODE_COND and pnp_eligible(judge) and not pnp_direct(judge):
            got.append(p)
        elif x.mode == PROV_MODE_DEAD and not any_pr_path(judge):
            got.append(p)
    return SEP_ZH.join(got)


def build_stats_rows(x: StatsBuildIn) -> list:
    """省 × 大类 × 中类 预聚合(mid='all'=大类汇总;broad='all'=省级汇总)。"""
    buckets: dict = defaultdict(list)
    for j in x.jobs:
        prov = (j.get(K_PROVINCE) or "").upper()
        if prov not in PROVS:
            continue
        broad = j.get(K_BROAD) or CATEGORY_UNCLASSIFIED
        mid = j.get(K_MID) or CATEGORY_UNCLASSIFIED
        buckets[(prov, broad, mid)].append(j)
        buckets[(prov, broad, ALL)].append(j)
        buckets[(prov, ALL, ALL)].append(j)
    rows = []
    for key, js in sorted(buckets.items()):
        rows.append(to_stats_row(StatsRowIn(key=key, jobs=js, cut7=x.cut7, today=x.today,
                                            difficulty=x.difficulty)))
    return rows


def load_difficulty() -> dict:
    """E12-07:省难度指数(缺文件=不挂,列留空)。"""
    out: dict = {}
    if not IN_DIFFICULTY.exists():
        return out
    d = read_table(IN_DIFFICULTY)
    for r in d.get(K_ROWS, []):
        out[r[K_PROVINCE]] = json.dumps(to_difficulty_cell(
            DifficultyIn(row=r, generated=d.get(K_GENERATED))), ensure_ascii=False)
    return out


def build_occupation_rows(x: OccBuildIn) -> list:
    """职业 × 省(province='all' 为全国行)。"""
    by_noc: dict = defaultdict(list)
    for j in x.jobs:
        if j.get(K_NOC):
            by_noc[j[K_NOC]].append(j)
    named_any = named_any_of(x.tables)
    rows: list = []
    for noc, js in by_noc.items():
        base = to_occupation_base(OccBaseIn(noc=noc, jobs=js, names=x.names, today=x.today))
        teer = base[K_TEER]
        national = OccNationalIn(
            tables=x.tables, noc=noc, teer=teer,
            channel=ChannelTierIn(named_any=named_any, ee_by_noc=x.tables.ee_by_noc,
                                  noc=noc, teer=teer),
            sponsor=SponsorOfIn(quarter=x.sponsor_quarter, lmia=x.sponsor_lmia,
                                jvws=x.sponsor_jvws, noc=noc, teer=teer))
        rows.append(to_occupation_row(OccRowIn(
            base=base, province=ALL, jobs=js, cut7=x.cut7,
            flow=FlowOfIn(flow=x.flow, avg_open=x.avg_open, key=(noc, ALL)),
            national=national)))
        by_p: dict = defaultdict(list)
        for j in js:
            if j.get(K_PROVINCE):
                by_p[j[K_PROVINCE]].append(j)
        for prov, pjs in by_p.items():
            rows.append(to_occupation_row(OccRowIn(
                base=base, province=prov, jobs=pjs, cut7=x.cut7,
                flow=FlowOfIn(flow=x.flow, avg_open=x.avg_open, key=(noc, prov)),
                national=None)))
    return rows


def fill_pulse_scores(occ_rows: list) -> None:
    """pulse_score(设计文档 §3 v3):province 相同的行分一组做 z-score(全国行 'all' 自成一组,
    不跟单省混算)—— 组内 z 是「这个职业比同组里其他职业强/弱多少个标准差」,跨组比较没意义。

    样本门槛不在这里裁(§8.2 前端裁)。动量分量改用 mom14d(mom30d 撞抓取爬坡期,眼下整列
    null);mom14d=None(new14d_prev<5)的行该分量按组内均值计(zscores 对 None 记 0)。
    """
    by_prov: dict = defaultdict(list)
    for r in occ_rows:
        by_prov[str(r[K_PROVINCE])].append(r)
    for rs in by_prov.values():
        mom = []
        named_ratio = []
        wage_dev = []
        for r in rs:
            mom.append(r.get(K_MOM14D))
            named_ratio.append(named_ratio_of(r))
            wage_dev.append(wage_dev_of(r))
        for r, zm, zj, zw in zip(rs, zscores(mom), zscores(named_ratio), zscores(wage_dev)):
            r[K_PULSE_SCORE] = round(PULSE_W_MOM * zm + PULSE_W_NAMED * zj + PULSE_W_WAGE * zw,
                                     PULSE_ROUND)


def named_ratio_of(r: dict) -> float | None:
    """具名通道占比(空桶 = None,由 zscores 记 0)。"""
    if r[K_OPEN_JOBS]:
        return r[K_NAMED_JOBS] / r[K_OPEN_JOBS]
    return None


def wage_dev_of(r: dict) -> float | None:
    """帖面中位相对 ESDC 中位的偏离(任一侧缺 = None)。"""
    if r.get(K_MEDIAN_SALARY_ANNUAL) and r.get(K_MEDIAN_WAGE_ANNUAL):
        return (r[K_MEDIAN_SALARY_ANNUAL] - r[K_MEDIAN_WAGE_ANNUAL]) / r[K_MEDIAN_WAGE_ANNUAL]
    return None


def build_city_rows(x: CityStatsIn) -> list:
    """城市粒度(E8-14 主图数据源之一;「当下状态」维度表,走 dims 的清空+重灌)。"""
    by_city: dict = defaultdict(list)
    for j in x.jobs:
        if j.get(K_CITY):
            by_city[(j[K_CITY], j.get(K_PROVINCE, ""))].append(j)
    rows = []
    for key, js in by_city.items():
        rows.append(to_city_stats_row(CityStatsRowIn(city=key[0], province=key[1], jobs=js,
                                                     cut7=x.cut7, today=x.today)))
    rows.sort(key=city_open_key)
    return rows


def city_open_key(r: dict) -> int:
    """城市表按在招量降序(原 lambda 退役)。"""
    return -r[K_OPEN_JOBS]


def load_noc_names() -> dict:
    """职业名取 noc_descriptions 的官方名 —— 不在这里造名字,拿不到就留空(宁可留空不瞎猜)。"""
    out: dict = {}
    if not IN_MART_NOC_DESC.exists():
        return out
    for d in read_rows(IN_MART_NOC_DESC):
        out[d.get(K_NOC, "")] = d
    return out


def load_sponsor_sources() -> SponsorSourcesOut:
    """E14-02 担保率的分子分母源(同季对同季;无共同季度 → 四列整列写 None)。"""
    quarter = comparable_quarter()
    if not quarter:
        say(SPONSOR_NO_QUARTER)
        return SponsorSourcesOut(quarter=None, lmia={}, jvws={})
    say(SPONSOR_IN_TPL.format(xlsx=IN_LMIA_XLSX_DIR / LMIA_XLSX_TPL.format(
        quarter=quarter.lower()), jvws=IN_JVWS_RAW, quarter=quarter))
    lmia = lmia_positions_by_noc(quarter)
    jvws: dict = {}
    for r in read_table(IN_JVWS_RAW)[K_ROWS]:
        if r[K_PROVINCE] == JVWS_NATIONAL and r[K_QUARTER] == quarter:
            jvws[r[K_NOC]] = r
    say(SPONSOR_COUNT_TPL.format(quarter=quarter, lmia=len(lmia), jvws=len(jvws)))
    return SponsorSourcesOut(quarter=quarter, lmia=lmia, jvws=jvws)


def build_mart_stats() -> None:
    """步骤④:E5-04 省 × 大类 × 中类 预聚合 + 职业/城市/日表(读 mart 纯聚合,跑在汇装之后)。

    E13-02(把脉首页,00_总设计与口径.md §3,v2 2026-08-06 晚修订)派生指标输入见各 IN_ 常量。
    **ETL 只读写 data/,不碰 DB。**
    """
    say(STATS_IN_TPL.format(jobs=IN_MART_JOBS, out=OUT_STATS))
    jobs = []
    for j in read_rows(IN_MART_JOBS):
        if j.get(K_STATUS) != STATUS_CLOSED:
            jobs.append(j)
    today = date.today().isoformat()
    cut7 = (date.today() - timedelta(days=STATS_NEW_DAYS)).isoformat()
    say(FLOW_IN_TPL.format(postings=IN_JOBBANK, expired=IN_EXPIRED, closed=IN_MART_CLOSED))
    flow = build_flow_stats()
    say(FLOW_COUNT_TPL.format(flow=len(flow.flow), avg=len(flow.avg_open),
                              daily=len(flow.daily_closed)))
    sponsor = load_sponsor_sources()
    tables = load_pnp_tables()
    rows = build_stats_rows(StatsBuildIn(jobs=jobs, cut7=cut7, today=today,
                                         difficulty=load_difficulty()))
    paths.write_json(paths.WriteJsonIn(path=OUT_STATS, payload=rows, indent=INDENT_2))
    daily = []
    for r in rows:
        if r[K_MID] == ALL:
            daily.append(to_stats_daily_row(DailyRowIn(row=r, today=today,
                                                       daily_closed=flow.daily_closed)))
    paths.write_json(paths.WriteJsonIn(path=OUT_DAILY, payload=daily, indent=INDENT_2))
    say(DAILY_ROWS_TPL.format(n=len(daily), today=today, out=OUT_DAILY))
    occ_rows = build_occupation_rows(OccBuildIn(
        jobs=jobs, cut7=cut7, today=today, names=load_noc_names(), tables=tables,
        flow=flow.flow, avg_open=flow.avg_open, sponsor_quarter=sponsor.quarter,
        sponsor_lmia=sponsor.lmia, sponsor_jvws=sponsor.jvws))
    fill_pulse_scores(occ_rows)
    paths.write_json(paths.WriteJsonIn(path=OUT_OCC, payload=occ_rows, indent=INDENT_2))
    city_rows = build_city_rows(CityStatsIn(jobs=jobs, cut7=cut7, today=today))
    paths.write_json(paths.WriteJsonIn(path=OUT_CITY, payload=city_rows, indent=INDENT_2))
    say_stats_counts(StatsCountsIn(rows=rows, occ_rows=occ_rows, city_rows=city_rows))


def say_stats_counts(x: StatsCountsIn) -> None:
    """收尾报数(职业/城市/省级三张表的行数与构成)。"""
    nocs: set = set()
    provs: set = set()
    base = 0
    for r in x.occ_rows:
        nocs.add(r[K_NOC])
    for r in x.rows:
        provs.add(r[K_PROVINCE])
        if r[K_MID] == ALL:
            base += 1
    say(OCC_ROWS_TPL.format(n=len(x.occ_rows), nocs=len(nocs), out=OUT_OCC))
    say(CITY_ROWS_TPL.format(n=len(x.city_rows), out=OUT_CITY))
    say(STATS_ROWS_TPL.format(n=len(x.rows), provs=len(provs), base=base,
                              mid=len(x.rows) - base, out=OUT_STATS))


def to_sponsor_blank() -> dict:
    """担保率四列的空档(无共同季度 → 整列 None,不硬凑)。"""
    return {"sponsorPosQ": None, "sponsorPosSkilledQ": None, "jvwsVacQ": None,
            "sponsorRate": None, "sponsorEvidence": None}


def to_sponsor_cell(x: SponsorCellIn) -> dict:
    """担保率四列 + 证据串。

    🔴 StatCan 抑制/未采集本就是 None,原样传,不折 0(e14-01 红线同款);
    vac 是 None 或 0 → rate=None(分母缺失/为零都不算);
    副指标口径=本 NOC 的 TEER,不是 LMIA 项目股别。
    """
    vac = None
    quality = None
    if x.jvws:
        vac = x.jvws["vacancies"]
        quality = x.jvws["quality"]
    skilled = 0
    if x.teer in TEER_SKILLED:
        skilled = x.pos
    rate = None
    if vac:
        rate = round(x.pos / vac, SPONSOR_RATE_ROUND)
    evidence = json.dumps({"quarter": x.quarter, "jvwsQuality": quality,
                           "lmiaSource": LMIA_SOURCE_NOTE, "jvwsSource": JVWS_SOURCE_NOTE},
                          ensure_ascii=False)
    return {"sponsorPosQ": x.pos, "sponsorPosSkilledQ": skilled, "jvwsVacQ": vac,
            "sponsorRate": rate, "sponsorEvidence": evidence}


def to_difficulty_cell(x: DifficultyIn) -> dict:
    """省难度指数 jsonb(官方行 + 本轮生成时刻)。"""
    cell = dict(x.row)
    cell["generated"] = x.generated
    return cell


def to_stats_row(x: StatsRowIn) -> dict:
    """stats 表的一行(topCities = 桶内在招量前 5 的城市;difficulty 只挂省级汇总行)。"""
    prov, broad, mid = x.key
    streams: set = set()
    for j in x.jobs:
        if j.get("pnpStream"):
            streams.add(j["pnpStream"])
    cities = Counter()
    for j in x.jobs:
        if j.get("city"):
            cities[j.get("city")] += 1
    top = []
    for c, n in cities.most_common(TOP_CITIES_N):
        top.append({"city": c, "n": n})
    aip = 0
    for j in x.jobs:
        if j.get("aip"):
            aip += 1
    difficulty = None
    if broad == ALL and mid == ALL:
        difficulty = x.difficulty.get(prov)
    return {"province": prov, "broad": broad, "mid": mid, "openJobs": len(x.jobs),
            "new7d": count_new7d(StatsAggIn(jobs=x.jobs, cut7=x.cut7)),
            "medianWageAnnual": median_or_none(column_of(ColumnIn(jobs=x.jobs,
                                                                  key=K_WAGE_MED_ANNUAL))),
            "medianSalaryAnnual": median_or_none(column_of(ColumnIn(jobs=x.jobs,
                                                                    key=K_SALARY_ANNUAL))),
            "namedJobs": count_named(x.jobs), "streamLabels": SEP_ZH.join(sorted(streams)),
            "aipJobs": aip,
            "topCities": json.dumps(top, ensure_ascii=False),
            "fetched": x.today, "difficulty": difficulty}


def to_stats_daily_row(x: DailyRowIn) -> dict:
    """stats_daily 表的一行。

    E8-14 每日快照:只产出**今天这一天**的行,seed 按 (date,province,broad) UPSERT 追加,
    永不 DELETE —— 趋势图的唯一数据来源;历史补不回来,落地那天才是第一个点。
    粒度 = 日 × 省 × 大类(含 all 汇总行),取 stats 的大类层直接投影 —— 不重算,口径与主表
    天生一致。一天多跑几轮 ETL 也只会 UPSERT 同一批行(date 是主键的一部分)。
    closed = 当日下架计数 —— 台账判死日恰好是今天(**不是推导,是台账写入日,不存在 1 天滞后**);
    口径局限见 build_flow_stats;同一 province×broad 桶合并。
    """
    return {"date": x.today, "province": x.row["province"], "broad": x.row["broad"],
            "openJobs": x.row["openJobs"], "new7d": x.row["new7d"],
            "medianSalaryAnnual": x.row["medianSalaryAnnual"], "namedJobs": x.row["namedJobs"],
            "closed": x.daily_closed.get((x.row["province"], x.row["broad"]), 0)}


def to_occupation_base(x: OccBaseIn) -> dict:
    """一个 NOC 的三级分类与译名底座。

    大/中/小三级都带上(2026-07-28 Frank:「过滤需要加 职业 大类 种类 小类吧」)—— 三者对同一个
    NOC 是常量(noc 域单一来源),取任一岗即可,不另算。
    """
    nd = x.names.get(x.noc, {})
    return {"noc": x.noc, "teer": x.jobs[0].get("teer"), "broad": x.jobs[0].get("broad", ""),
            "mid": x.jobs[0].get("mid", ""), "fine": x.jobs[0].get("fine", ""),
            "titleZh": nd.get("titleZh", ""), "titleZhShort": nd.get("titleZhShort", ""),
            "titleEn": nd.get("title", ""), "fetched": x.today}


def to_occupation_row(x: OccRowIn) -> dict:
    """stats_occupation 表的一行(全国行多带四组派生列:可提名省份两档 / 死路省 / 通道档 / 担保率)。

    E13-05/09:可提名省份拆两档(逐省判,非省具名清单命中);teer=None → 空串(宁可留空)。
      pnpProvs      = 拿 offer 即可(direct);
      pnpProvsCond  = 先省内同雇主 6 个月(eligible−direct:MB/NS/NB/PE 普通通道兜底的 TEER4-5)
    E13-08:deadProvs = 完全无路可走的省(9 省内 any_pr_path=False 的补集;空串=处处有路)。
    teer 未分类判不了 → None(强负断言不硬判,前端该行不出死路)。
    """
    row = dict(x.base)
    row["province"] = x.province
    if x.national is not None:
        n = x.national
        dead = None
        if n.teer is not None:
            dead = prov_list_of(ProvListIn(tables=n.tables, noc=n.noc, teer=n.teer,
                                           mode=PROV_MODE_DEAD))
        row["pnpProvs"] = prov_list_of(ProvListIn(tables=n.tables, noc=n.noc, teer=n.teer,
                                                  mode=PROV_MODE_DIRECT))
        row["pnpProvsCond"] = prov_list_of(ProvListIn(tables=n.tables, noc=n.noc, teer=n.teer,
                                                      mode=PROV_MODE_COND))
        row["deadProvs"] = dead
        row["channelTier"] = channel_tier(n.channel)
    row.update(to_agg_columns(StatsAggIn(jobs=x.jobs, cut7=x.cut7)))
    row.update(to_flow_columns(x.flow))
    if x.national is not None:
        row.update(sponsor_of(x.national.sponsor))
    return row


def to_city_stats_row(x: CityStatsRowIn) -> dict:
    """stats_city 表的一行。"""
    row = {"city": x.city, "province": x.province, "fetched": x.today}
    row.update(to_agg_columns(StatsAggIn(jobs=x.jobs, cut7=x.cut7)))
    return row


# =========================================================================
# 17. 跨源清洗:地点(ATS + JB 同一套 country/province/city/district/address)
# =========================================================================


def clean_job_locations() -> None:
    """本域步骤入口:把两源的地点洗成结构化五格,并把 ATS 岗筛到焦点区(Ottawa,严)。

    原 clean/04c(2026-08-31 批J 归户:跨源清洗不归任何单源域,归 mart)。两源同一套尺子
    —— 数据层(而不是前端)持有干净的地理:
      · ATS 公司源:全球乱七八糟的地点 → 只留 Ottawa,其余丢弃;
      · Job Bank:保留帖子省/市,靠邮编查全国 FSA 维度表补区。
    社区(区)判定:① 文本里的社区名优先;② 文本没写但地址带加拿大邮编时,用高置信度的
    渥太华郊区 FSA(邮编前3位)兜底。central Ottawa 的 FSA 不猜,留空。
    """
    say(PRINT_INOUT_COMPANIES_TPL.format(dir=IN_ATS_COMPANIES))
    say(PRINT_INOUT_JOBBANK_TPL.format(out=OUT_JOBBANK))
    kept = 0
    dropped = 0
    for jobs_json in IN_ATS_COMPANIES.rglob(JOBS_FILE):
        out = clean_ats_file(jobs_json)
        kept += out.kept
        dropped += out.dropped
    say(PRINT_LOC_ATS_TPL.format(kept=kept, dropped=dropped))
    if not IN_JOBBANK.exists():
        return
    fsa_table: dict = {}
    if IN_FSA_TABLE.exists():
        fsa_table = read_table(IN_FSA_TABLE)
    posts = read_rows(IN_JOBBANK)
    for job in posts:
        if not job.get(K_CITY_RAW):
            job[K_CITY_RAW] = job.get(K_CITY, "")
        apply_location(ApplyLocIn(job=job, loc=normalize_jobbank_location(
            JbLocIn(prov=job.get(K_PROVINCE, ""), city=job.get(K_CITY_RAW, ""),
                    addr=job.get(K_ADDRESS, ""), fsa_table=fsa_table))))
    backfilled = backfill_provinces(posts)
    if backfilled:
        say(PRINT_LOC_BACKFILL_TPL.format(n=backfilled))
    paths.write_json(paths.WriteJsonIn(path=OUT_JOBBANK, payload=posts, indent=INDENT_2))
    dist: Counter = Counter()
    for job in posts:
        dist[job.get(K_PROVINCE, PROV_MISSING_MARK)] += 1
    say(PRINT_LOC_DONE_TPL.format(n=len(posts), provs=len(dist), dist=dict(dist)))


def clean_ats_file(jobs_json: Path) -> LocKeptOut:
    """一份 ATS jobs.json:焦点区外的岗整行丢弃,留下的洗五格并回写 count。"""
    data = read_table(jobs_json)
    jobs = data.get(K_JOBS, [])
    clean_jobs: list = []
    kept = 0
    dropped = 0
    for job in jobs:
        loc = normalize_ottawa(OttawaLocIn(raw_city=job.get(K_LOCATION, ""),
                                           raw_addr=job.get(K_ADDRESS, "")))
        if loc is None:
            dropped += 1
            continue
        apply_location(ApplyLocIn(job=job, loc=loc))
        clean_jobs.append(job)
        kept += 1
    if jobs:
        data[K_JOBS] = clean_jobs
        data[K_COUNT] = len(clean_jobs)
        paths.write_json(paths.WriteJsonIn(path=jobs_json, payload=data, indent=INDENT_2))
    return LocKeptOut(kept=kept, dropped=dropped)


def normalize_ottawa(x: OttawaLocIn) -> dict | None:
    """ATS 岗 → 五格;判不出是渥太华就返回 None(调用方丢弃这一行)。"""
    raw = ATS_LOC_TPL.format(city=x.raw_city or "", addr=x.raw_addr or "")
    text = raw.lower()
    district = ottawa_district_of(text)
    if district == "":
        district = FSA_DISTRICT.get(fsa_of(raw), "")
    if district == "" and OTTAWA_CITY_LOWER not in text:
        return None
    return {K_COUNTRY: COUNTRY_CANADA, K_PROVINCE: PROV_ON, K_CITY: OTTAWA_CITY,
            K_DISTRICT: district, K_ADDRESS: clean_address(x.raw_addr)}


def ottawa_district_of(text: str) -> str:
    """文本里整词命中的社区规范名(长名先试);没命中给空串。"""
    for key in OTTAWA_DISTRICT_KEYS:
        if re.search(WORD_BOUND_TPL.format(key=re.escape(key)), text):
            return OTTAWA_DISTRICTS[key]
    return ""


def fsa_of(s: str) -> str:
    """从含邮编的文本取 FSA(前3位,大写);无邮编返回空串。"""
    m = POSTAL_FSA_RE.search(s or "")
    if m is None:
        return ""
    return m.group(1).upper()


def clean_address(addr: str) -> str:
    """统一格式;只有「City, ON」无街号/邮编的不算精确地址 → 空。"""
    one = COMMA_SPACE_RE.sub(COMMA, (addr or "").strip())
    one = WS_RE.sub(SPACE, one).strip(TRIM_SPACE_COMMA)
    if DIGIT_RE.search(one):
        return one
    return ""


def apply_location(x: ApplyLocIn) -> None:
    """把清洗结果的五格写回岗位行。"""
    x.job[K_COUNTRY] = x.loc[K_COUNTRY]
    x.job[K_PROVINCE] = x.loc[K_PROVINCE]
    x.job[K_CITY] = x.loc[K_CITY]
    x.job[K_DISTRICT] = x.loc[K_DISTRICT]
    x.job[K_ADDRESS] = x.loc[K_ADDRESS]


def normalize_jobbank_location(x: JbLocIn) -> dict:
    """Job Bank 多省:保留帖子省/市;区由**邮编 FSA 查全国维度表**(GeoNames)得到。

    · 大渥太华社区(Kanata/Gloucester…,K1*/K2*/K4*)→ 折叠成 city=Ottawa + district=社区;
    · 其余城市:表里 main≠城市 → district=main(如 Richmond Hill Southwest);
      main=城市 → 用更细的 hood。
    """
    prov = (x.prov or "").strip().upper()
    city_c = WS_RE.sub(SPACE, (x.city or "").strip())
    if city_c.lower().startswith(NON_CITY_PREFIXES):
        city_c = ""
    fsa = fsa_of(JB_LOC_TPL.format(city=x.city or "", addr=x.addr or ""))
    district = ""
    entry = x.fsa_table.get(fsa)
    if entry:
        main = entry.get(K_MAIN, "")
        hood = entry.get(K_HOOD, "")
        if prov == PROV_ON and fsa[:FSA_PREFIX_LEN] in OTTAWA_JB_FSA and main in OTTAWA_COMMUNITIES:
            city_c = OTTAWA_CITY
            district = main
        elif main and main.lower() != city_c.lower():
            district = main
        else:
            district = hood
    elif fsa and prov == PROV_ON and city_c.lower() in OTTAWA_CITY_NAMES:
        district = OTTAWA_DISTRICTS.get(city_c.lower(), "")
        if district:
            city_c = OTTAWA_CITY
    return {K_COUNTRY: COUNTRY_CANADA, K_PROVINCE: prov, K_CITY: city_c,
            K_DISTRICT: district, K_ADDRESS: clean_address(x.addr)}


def backfill_provinces(posts: list) -> int:
    """省份兜底:Job Bank 偶尔漏填某帖的省。

    若同一 city_raw 在别处出现且全数据集只映射到唯一省,用那个省补空(同名同源,非臆测);
    名字跨省(London/Windsor…)则留空,不猜。返回补上的帖数。
    """
    city_provs: dict = defaultdict(set)
    for job in posts:
        key = (job.get(K_CITY_RAW) or "").strip().lower()
        prov = (job.get(K_PROVINCE) or "").strip()
        if key and prov:
            city_provs[key].add(prov)
    backfilled = 0
    for job in posts:
        if (job.get(K_PROVINCE) or "").strip():
            continue
        cands = city_provs.get((job.get(K_CITY_RAW) or "").strip().lower())
        if cands and len(cands) == 1:
            job[K_PROVINCE] = next(iter(cands))
            backfilled += 1
    return backfilled


# =========================================================================
# 18. 跨源清洗:薪资(raw salary 串 → salaryAnnual / salaryText)
# =========================================================================


def clean_job_salary() -> None:
    """本域步骤入口:两源同一套尺子,把 salary 原文洗成 salaryAnnual + salaryText。

    原 clean/04d(2026-08-31 批J 归户;更早住前端 parseSalary,按宪法「清洗归数据层」下沉)。
    原地清洗:读哪个文件就写回哪个。
    """
    say(PRINT_INOUT_COMPANIES_TPL.format(dir=IN_ATS_COMPANIES))
    say(PRINT_INOUT_JOBBANK_TPL.format(out=OUT_JOBBANK))
    tally = SalaryTally(total=0, priced=0, updated=0)
    guards = SalaryGuards(absurd=0, ratio=0, cap=0, gig=0, hifold=0)
    for jobs_json in IN_ATS_COMPANIES.rglob(JOBS_FILE):
        data = read_table(jobs_json)
        changed = False
        for job in data.get(K_JOBS, []):
            if salary_tick(SalaryTickIn(job=job, tally=tally, guards=guards)):
                changed = True
        if changed:
            paths.write_json(paths.WriteJsonIn(path=jobs_json, payload=data, indent=INDENT_2))
    if IN_JOBBANK.exists():
        postings = read_rows(IN_JOBBANK)
        changed = False
        for job in postings:
            if salary_tick(SalaryTickIn(job=job, tally=tally, guards=guards)):
                changed = True
        if changed:
            paths.write_json(paths.WriteJsonIn(path=OUT_JOBBANK, payload=postings,
                                               indent=INDENT_2))
    guarded = guards.absurd + guards.ratio + guards.cap + guards.gig + guards.hifold
    say(PRINT_SAL_DONE_TPL.format(updated=tally.updated, priced=tally.priced, total=tally.total))
    say(PRINT_SAL_GUARD_TPL.format(guarded=guarded, absurd=guards.absurd,
                                   ratio_max=SAL_RATIO_MAX, ratio=guards.ratio,
                                   cap_max=SAL_ANNUAL_MAX, cap=guards.cap, gig=guards.gig,
                                   fold_max=SAL_HOURLY_FOLD_MAX, hifold=guards.hifold))


def salary_tick(x: SalaryTickIn) -> bool:
    """一个岗过一遍:累加报数,返回「这一行被改写了没有」。"""
    x.tally.total += 1
    if x.job.get(K_SALARY):
        x.tally.priced += 1
    if not apply_salary_to(ApplySalaryIn(job=x.job, guards=x.guards)):
        return False
    x.tally.updated += 1
    return True


def apply_salary_to(x: ApplySalaryIn) -> bool:
    """读 raw salary → 写回 salaryAnnual/salaryText;有变化返回 True(幂等)。"""
    out = parse_salary(SalaryParseIn(raw=x.job.get(K_SALARY) or "", guards=x.guards))
    new_text = None
    if x.job.get(K_SALARY):
        new_text = out.text
    if x.job.get(K_SALARY_ANNUAL) == out.annual and x.job.get(K_SALARY_TEXT) == new_text:
        return False
    x.job[K_SALARY_ANNUAL] = out.annual
    x.job[K_SALARY_TEXT] = new_text
    return True


def parse_salary(x: SalaryParseIn) -> SalaryOut:
    """任意格式 → (年薪数值, 规范文本)。

    解析不出 → (None, 原文):「Salary to be negotiated」「$0.55 per km」这类**是真信息**,
    原样给用户看。
    源头自相矛盾 → (None, None):金额离谱 / 区间比离谱 / 年化超顶三类,**一个字都不显示**
    (2026-08-05 Frank 拍板)。理由:这 6+111+2 条全是雇主填错栏 ——「$295,000.00 daily」是把
    年薪填进了日薪格、「$500.00 hourly」是洁牙师标了十倍。原样透出去,用户会当成我们的数;
    美化成「$500/hr」更糟 —— 那等于替源头的错误背书。**判不了就不说,别替官方/雇主圆场。**
    """
    if not x.raw:
        return SalaryOut(annual=None, text=EM_DASH)
    base = SAL_EXTRA_RE.split(x.raw, maxsplit=1)[0] or x.raw
    stripped = SAL_PAREN_MONEY_RE.sub(SPACE, base)
    text_src = base
    if SAL_MONEY_RE.search(stripped):
        text_src = stripped
    amounts = salary_amounts(text_src)
    nums = salary_nums_of(amounts)
    if len(nums) == 0:
        if has_absurd_amount(amounts):
            x.guards.absurd += 1
            return SalaryOut(annual=None, text=None)
        return SalaryOut(annual=None, text=x.raw)
    lo = min(nums)
    hi = max(nums)
    if hi / lo > SAL_RATIO_MAX:
        x.guards.ratio += 1
        return SalaryOut(annual=None, text=None)
    got = salary_unit_of(SalaryUnitIn(low=text_src.lower(), raw=x.raw, hi=hi, guards=x.guards))
    if got == "":
        return SalaryOut(annual=None, text=x.raw)
    unit = unit_fixed_of(UnitFixIn(unit=got, lo=lo))
    annual = round(((lo + hi) / 2) * SAL_MULT[unit])
    if annual > SAL_ANNUAL_MAX:
        x.guards.cap += 1
        return SalaryOut(annual=None, text=None)
    text = money_text(MoneyTextIn(lo=lo, hi=hi, unit=unit, sub=SAL_SUB[unit]))
    if unit == SAL_UNIT_HR and (lo + hi) / 2 > SAL_HOURLY_FOLD_MAX:
        x.guards.hifold += 1
        return SalaryOut(annual=None, text=text)
    return SalaryOut(annual=annual, text=text)


def salary_nums_of(amounts: list) -> list:
    """只留落在合法区间里的金额(0 < n < 年薪上限)。"""
    nums: list = []
    for n in amounts:
        if 0 < n < SAL_ANNUAL_MAX:
            nums.append(n)
    return nums


def has_absurd_amount(amounts: list) -> bool:
    """一个合法金额都没有时:里面是不是有离谱数(如 -$4,972,171,264)—— 是就整条不显示。"""
    for n in amounts:
        if n >= SAL_ANNUAL_MAX:
            return True
    return False


def unit_fixed_of(x: UnitFixIn) -> str:
    """源误标纠正:时薪值 ≥$1000、月薪 ≥$2万 —— 填错栏了,实为年薪。"""
    if x.unit == SAL_UNIT_HR and x.lo >= SAL_HOURLY_YR_MIN:
        return SAL_UNIT_YR
    if x.unit == SAL_UNIT_MO and x.lo >= SAL_MONTHLY_YR_MIN:
        return SAL_UNIT_YR
    return x.unit


def salary_amounts(text: str) -> list:
    """优先取 $ 锚定金额;没有 $ 时回退全部数字,但仅限「纯薪资表达」(白名单词 + 无 %)。"""
    vals: list = []
    for a, b in SAL_MONEY_RE.findall(text):
        if a:
            vals.append(float(a.replace(COMMA, "")))
        if b:
            vals.append(float(b.replace(COMMA, "")))
    if len(vals) > 0:
        return vals
    if PERCENT_SIGN in text:
        return []
    for word in SAL_WORD_RE.findall(text.lower()):
        if word not in SAL_PLAIN_OK:
            return []
    out: list = []
    for m in SAL_NUM_RE.findall(text):
        out.append(float(m.replace(COMMA, "")))
    return out


def salary_unit_of(x: SalaryUnitIn) -> str:
    """判周期单位(biweekly 必须在 week 之前;daily 单列)+ 常识兜底。

    返回空串 = E6-12 计次/计程价那一条:基数不是时间,整条不年化(调用方原样给出原文)。
    """
    if SAL_BIWEEK_RE.search(x.low):
        return SAL_UNIT_BIWK
    if SAL_MONTH_WORD in x.low:
        return SAL_UNIT_MO
    if SAL_WEEK_WORD in x.low:
        return SAL_UNIT_WK
    if SAL_DAILY_RE.search(x.low):
        return SAL_UNIT_DAY
    if SAL_HOUR_RE.search(x.low):
        return SAL_UNIT_HR
    if x.hi < SAL_GIG_HI_MAX and SAL_PER_UNIT_RE.search(x.raw):
        x.guards.gig += 1
        return ""
    if x.hi < SAL_GIG_HI_MAX:
        return SAL_UNIT_HR
    return SAL_UNIT_YR


def money_text(x: MoneyTextIn) -> str:
    """区间两端 → 规范显示文本(单值只显示一个数)。"""
    lo_text = money_of(MoneyIn(n=x.lo, unit=x.unit))
    if x.lo == x.hi:
        return SAL_ONE_TPL.format(money=lo_text, sub=x.sub)
    return SAL_RANGE_TPL.format(lo=lo_text, hi=money_of(MoneyIn(n=x.hi, unit=x.unit)), sub=x.sub)


def money_of(x: MoneyIn) -> str:
    """一个金额的说法:年薪档按千元折(「$96K」),其余取整(「$35」)。"""
    if x.unit == SAL_UNIT_YR:
        return SAL_K_TPL.format(n=round(x.n / SAL_K_DIV))
    return SAL_DOLLAR_TPL.format(n=round(x.n))


# =========================================================================
# 19. 跨源清洗:试点打标(城市×省 → pilot / pilotCommunity / pilotEmployer)
# =========================================================================


def flag_job_pilot() -> None:
    """本域步骤入口:岗在不在 RCIP/FCIP 试点社区(pilot / pilotCommunity / pilotEmployer)。

    原 clean/05f(2026-08-31 批J 归户)。城市 × 省 精确匹配人工核对过的社区城市映射
    (rcip/fcip 两域的 communities 步产,宁漏勿错:区域型社区 cities=[] 不参与)。
    口径红线(E6-11 §5):试点是社区推荐制且雇主须先被社区指定,命中≠能走试点 —— 粗筛信号。
    同城双试点(Sudbury/Timmins 同时在 RCIP 与 FCIP)→ pilot='RCIP+FCIP'。
    批E(2026-08-31 pilot 拆三域):社区名单与雇主名单一分为二,本段读**并集**(打标口径不变)。
    """
    say(PRINT_PILOT_IN_TPL.format(srcs=IN_PILOT))
    say(PRINT_INOUT_JOBBANK_TPL.format(out=OUT_JOBBANK))
    cmap = load_pilot_city_map()
    emp = load_pilot_employer_names()
    say(PRINT_PILOT_MAP_TPL.format(keys=len(cmap), emps=len(emp)))
    tally = PilotTally(flagged=0, total=0, emp_hits=0)
    if IN_JOBBANK.exists():
        posts = read_rows(IN_JOBBANK)
        for job in posts:
            flag_pilot_row(PilotFlagIn(job=job, cmap=cmap, emp=emp, tally=tally))
        paths.write_json(paths.WriteJsonIn(path=OUT_JOBBANK, payload=posts, indent=INDENT_2))
    blank_ats_pilot(tally)
    say(PRINT_PILOT_DONE_TPL.format(flagged=tally.flagged, total=tally.total,
                                    emp_hits=tally.emp_hits))


def load_pilot_city_map() -> dict:
    """(province, city) → 命中的社区行列表(同城可命中 RCIP+FCIP 两行)。"""
    out: dict = {}
    for src in IN_PILOT:
        for row in read_table(src)[K_ROWS]:
            for city in row.get(K_CITIES) or []:
                out.setdefault((row[K_PROVINCE], city), []).append(row)
    return out


def load_pilot_employer_names() -> dict:
    """社区名 → 该社区指定雇主的归一名集合(legal 名与 o/a 别名都入);文件可缺(批B 渐进覆盖)。"""
    out: dict = {}
    for src in IN_PILOT_EMP:
        if not src.exists():
            continue
        for row in read_table(src).get(K_ROWS, []):
            names = out.setdefault(row.get(K_COMMUNITY, ""), set())
            raw = row.get(K_NAME, "")
            names.add(norm_name(raw))
            m = PILOT_OA_TAIL_RE.search(raw)
            if m is not None:
                names.add(norm_name(m.group(1)))
            names.discard("")
    return out


def flag_pilot_row(x: PilotFlagIn) -> None:
    """一个 Job Bank 帖:命中社区就写三格,没命中一律写空。"""
    x.tally.total += 1
    hits = x.cmap.get((x.job.get(K_PROVINCE, ""), x.job.get(K_CITY, "")))
    if not hits:
        x.job[K_PILOT] = ""
        x.job[K_PILOT_COMMUNITY] = ""
        x.job[K_PILOT_EMPLOYER] = False
        return
    got = pilot_verdict(hits)
    x.job[K_PILOT] = got.pilot
    x.job[K_PILOT_COMMUNITY] = got.community
    x.tally.flagged += 1
    hit_emp = norm_name(x.job.get(K_EMPLOYER, "")) in x.emp.get(got.community, set())
    x.job[K_PILOT_EMPLOYER] = hit_emp
    if hit_emp:
        x.tally.emp_hits += 1


def pilot_verdict(hits: list) -> PilotVerdictOut:
    """命中行 → (pilot, pilotCommunity)。类型去重排序保证 'RCIP+FCIP' 顺序稳定。

    社区名:同城多命中时取 RCIP 行的名(社区名本就相同或同城,逗号连接会破一行一条铁律)。
    """
    uniq: list = []
    for h in hits:
        if h[K_TYPE] not in uniq:
            uniq.append(h[K_TYPE])
    name = hits[0][K_NAME]
    for h in hits:
        if h[K_TYPE] == SOURCE_RCIP:
            name = h[K_NAME]
            break
    return PilotVerdictOut(pilot=PLUS.join(sorted(uniq, reverse=True)), community=name)


def blank_ats_pilot(tally: PilotTally) -> None:
    """ATS 公司岗在 Ottawa(非试点社区)→ 三格一律空(保持字段一致);已经空的不重写。"""
    for jobs_json in IN_ATS_COMPANIES.rglob(JOBS_FILE):
        data = read_table(jobs_json)
        changed = False
        for job in data.get(K_JOBS, []):
            tally.total += 1
            if (job.get(K_PILOT) != "" or job.get(K_PILOT_COMMUNITY) != ""
                    or job.get(K_PILOT_EMPLOYER) is not False):
                job[K_PILOT] = ""
                job[K_PILOT_COMMUNITY] = ""
                job[K_PILOT_EMPLOYER] = False
                changed = True
        if changed:
            paths.write_json(paths.WriteJsonIn(path=jobs_json, payload=data, indent=INDENT_2))

# =========================================================================
# 20. cities 步(城市名的中/韩通行译名;#151,人工核定表不用模型)
# =========================================================================


def build_city_names() -> None:
    """人工核定的城市中/韩译名表 → processed/city_names_i18n.json(入口,门直调)。

    IN : 无外部输入(表就在 constants.CITIES 里)
    OUT: processed/city_names_i18n.json(name|prov → {zh, ko};本域段 9 维度装配自己读)
    沿革:clean/04g → 批H2 noc 域 → 批I3 溶段(产物 byte-identical 金标已验)→
    2026-08-31 Frank 拍板迁本域(城市是 DB 维度,译名是维度装配的料),逻辑一字未动。
    """
    say(CITIES_OUT_TPL.format(path=OUT_CITY_I18N))
    out = to_city_i18n(CITIES)
    OUT_CITY_I18N.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_CITY_I18N, payload=out, indent=1))
    say(CITIES_DONE_TPL.format(n=len(out)))


def to_city_i18n(table: dict) -> dict:
    """人工核定表 → 落盘形({名字|省: {zh, ko}};顺序即表序,不排序)。"""
    out: dict = {}
    for key, names in table.items():
        out[key] = {"zh": names[0], "ko": names[1]}
    return out
