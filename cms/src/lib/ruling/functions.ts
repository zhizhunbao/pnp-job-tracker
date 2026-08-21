/**
 * 判定层六张底表的加载器 —— **判定域自己的数据,自己取**。
 *
 * 🔴 为什么新写一个:同一件事此前住在 `lib/chat/tools.ts`,于是 `lib/verdict` 反过来 import 对话域,
 * 把「幸存的域依赖将死的域」焊死了(宪法「新建域 / 替换域」那条)。对话域要换掉,这条边必须先断。
 * 断法照 2026-08-20 定的办法:**旁边写新的,跑通再替换,最后删旧** —— 不原地改老的。
 *
 * 🔵 这里只做「取数 + 列名映射」,判定一行都没有 —— 判定在 `pathVerdict` 与 `lib/rules`。
 * SQL 文本全在 `lib/db/sql`,本文件不自己写 SQL。
 *
 * @author Frank
 * @time 2026-08-20 01:12:40
 */

import { log, RULING_LOG } from '../log'
import { headers } from 'next/headers'

import { getDb } from '../db/server'
import { SQL } from '../db'
import { getUser, isPro } from '../quota/server'
import {
  byCostAsc, byCountDesc, byDrawDateDesc, byListRankThenMonths, byNumberAsc, byObstacleThenTier, byOpeningsDesc, byTierAsc,
} from './callbacks'
import { CACHE } from './variables'
import { evaluateRequirements, teerHit } from '../gauge'
import { estimateCrs, estimateMbEoi, gridStreamOf, scoreProvince, streamMatches } from '../points'
import { askLabels, gateLabels } from '../i18n'
import { fieldMatchExemptionOf, gateOf, PATHWAYS } from '../pathways'
import {
  AB_LOCAL_EXP, AIP_PROVINCES, AIP_SOURCE, AMP, AND_WORD, APPLIES_OFFER, ASKABLE_FACTORS, AVAIL, BASIS,
  BASIS_MIN_YEARS, BLOCKED_BY, BLOCK_COST, CARD_SLOT, CARD_STATE, CASES, CASE_C01, CASE_ID, CASE_TIERS,
  CLB_IN_LABEL, CLB_TARGET_DEFAULT, COMPARE_ROLE, CONDITION, CRS_GRID_LABEL, DATE_LEN, DATE_LEN_DAY,
  DESIGNATION_MULTI, EDU, EDU_TO_MB, EMPLOYMENT_OFFER_STREAM, EMPTY_JSON, EMP_FACTOR, EMP_KEY, EMP_STATE, EMP_UNIT,
  EVIDENCE_KIND, EXP_BASIS, FACTOR, FACTOR_ROW, FED, FIRST_OFFICIAL_LANGUAGE, FULL_TIME_IN_LABEL, GATE_ASK,
  GATE_KEYS, GATE_NEED, GATE_OF, GRID, GRID_AUTO_FACTORS, HTTP, INDEMAND, ITEM, JOB_ROW_RANK, KEY_PREFIX,
  KEY_SUFFIX_NOT_COLLECTED, KIND_RULE, LEVER, MB_ADAPT_EDU_YEARS, MB_EDU, MB_EDU_YEARS, MB_RISK_STUDY, MB_RISK_WORK,
  MB_SWM_STREAM, MONTHS, MONTHS_PER_YEAR, NAME_KEEP, NL_DESIGNATED_LABEL, NOC_CODE, NO_BLOCK_COST, NO_PROVINCE_RANK,
  OA_SPLIT, OCC_INELIGIBLE, OCC_LIST_NONE, ON_GRAD_MIN_YEARS, OPS_METRIC, OPT_IN_GATES, PERMIT, PERMIT_KINDS, PROV,
  PROVINCE_CODE, PROVINCE_LOCAL_EXP, PV_KEY, PV_KEY_LANG_GAP, PV_TEXT, RANK, REASON, RECENT_ON_GRADUATE, REQ_FACTOR,
  REQ_UNIT, SCORE_FACTOR, SECTOR_PUBLIC, SEP, SINK, SLOT, SLOTS_OF_FACTOR, SOURCE_PROFILE, SPACE, STATE,
  STATE_OF_RULE, STATUS, STATUS_OF, STATUS_OVERSEAS, SUBJECT, SUM_KIND, TEER5_NOC, TEER_DIGIT, TEER_LOWEST,
  TEER_RANGE_PARTS, TEER_REASONS_SHOWN, TEER_STREAM, TIER, TIER_BASIS, TIER_BOUND, TIER_OF, TTL, TV_EMP,
  TV_EMP_PREFIX, TV_LABEL, TV_NEXT, TV_OCC, TV_PERSON, TV_PERSON_PREFIX, TV_SUM, TV_YOU, UNKNOWN_BLOCK_COST,
  VERDICT, VERDICT_RANK, WAGE_RULE_DEFAULT, WIRE_ERR,
} from './constants'
import type {
  AnswerBoolIn, AnswerBoolOut, AnswerNumIn, AnswerNumOut, AnswerTextIn, AnswerTextOut, ApplyOpsPeriodIn,
  ApplyOpsPeriodOut, ApplyOpsRowIn, ApplyOpsRowOut, AskableSlotIn, AskableSlotOut, AvailabilityOfIn,
  AvailabilityOfOut, BasisParamIn, BasisParamOut, BlockCostIn, BlockCostOut, BlockedBy, BoolOfIn, BoolOfOut,
  BuildTripleWireIn, BuildTripleWireOut, CardFollowupsIn, CardFollowupsOut, CardRuleProfileIn, CardRuleProfileOut,
  CaseAnswerIn, CaseAnswerOut, CasePagesOut, CaseProfilesOut, CaseTier, Cell, ClbBoostLeverIn, ClbBoostLeverOut,
  CompareRowsIn, CompareRowsOut, ConcludeBlockedIn, ConcludeBlockedOut, ConcludeIn, ConcludeNeedsInfoIn,
  ConcludeNeedsInfoOut, ConcludeOpenIn, ConcludeOpenOut, ConcludeOut, ConditionHoldsIn, ConditionHoldsOut,
  CountableMonthsIn, CountableMonthsOut, CrossProvinceRowsIn, CrossProvinceRowsOut, CrsProfile, CrsScoreIn,
  CrsScoreOut, DesignatedEmployerRow, DesignatedRowIn, DesignatedRowOut, DirectoryRowIn, DirectoryRowOut, EduBand,
  EeRow, EmpAcc, EmpDesignationRowIn, EmpDesignationRowOut, EmpNextStepRowIn, EmpNextStepRowOut,
  EmpPublicSectorRowIn, EmpPublicSectorRowOut, EmpReqOfIn, EmpReqOfOut, EmpRevenueRowIn, EmpRevenueRowOut,
  EmpRowsOfIn, EmpRowsOfOut, EmpStaffFactRowIn, EmpStaffFactRowOut, EmpThresholdRowsIn, EmpThresholdRowsOut,
  EmployerFactsOfIn, EmployerFactsOfOut, EmployerNameSegmentsIn, EmployerNameSegmentsOut, EmployerRowsIn,
  EmployerRowsOut, EmployerVerdictIn, EmployerVerdictItem, EmployerVerdictOut, EmptyRowsOut, EngineResult,
  EvOfDrawIn, EvOfDrawOut, EvOfFactorIn, EvOfFactorOut, EvOfOccIn, EvOfOccOut, EvOfReqIn, EvOfReqOut, EvaluateOneIn,
  EvaluateOneOut, Evidence, ExcludedRowIn, ExcludedRowOut, ExperienceGapsIn, ExperienceGapsOut, ExperienceReasonsIn,
  ExperienceReasonsOut, FactorNamesIn, FactorNamesOut, FactorThreshold, FastestRowIn, FastestRowOut,
  FedLangAppliesIn, FedLangAppliesOut, FedLanguageReasonsIn, FedLanguageReasonsOut, FieldMatchAnswerIn,
  FieldMatchAnswerOut, FirstNocIn, FirstNocOut, FoldTriStateIn, FoldTriStateOut, FoldVerdictIn, FoldVerdictOut,
  GateAnswersIn, GateAnswersOut, GateAsks, GateKeyOfIn, GateKeyOfOut, GateManifestIn, GateManifestOut,
  GetDesignatedEmployersIn, GetDesignatedEmployersOut, GetVerdictDataOut, GotWorseIn, GotWorseOut, GridCeilingIn,
  GridCeilingOut, GridMatchesStreamIn, GridMatchesStreamOut, GridProfile, GridRowForIn, GridRowForOut,
  GridSelfProfileIn, GridSelfProfileOut, HarderBlockIn, HarderBlockOut, HasEnoughProfileIn, HasEnoughProfileOut,
  HasRequiredSlotsIn, HasRequiredSlotsOut, HaveMonthsOfIn, HaveMonthsOfOut, ItemVerdict, JobPathwayRow,
  JobPathwaysIn, JobPathwaysOut, JobRowRankIn, JobRowRankOut, JudgeableRowIn, JudgeableRowOut, LanguageReasonsIn,
  LanguageReasonsOut, LeverGain, ListRequiredReasonIn, ListRequiredReasonOut, LmiaNocsOfIn, LmiaNocsOfOut,
  LoadVerdictTablesIn, LoadVerdictTablesOut, LocalExperienceHoldsIn, LocalExperienceHoldsOut, LowestMonthsRowIn,
  LowestMonthsRowOut, MatchDesignationIn, MatchDesignationOut, MaxClbInIn, MaxClbInOut, MaybeScore, MbEduOfIn,
  MbEduOfOut, MbEoiProfile, MbProfileOfIn, MbProfileOfOut, MbScoreIn, MbScoreOut, MbWarningsIn, MbWarningsOut,
  MergeOverridesIn, MergeOverridesOut, MonthsOfReqIn, MonthsOfReqOut, MostSpecificRowsIn, MostSpecificRowsOut,
  MyPathway, MyPathwaysIn, MyPathwaysOut, NameRow, NamedList, NamedListsIn, NamedListsOut, NlDesignatedReasonIn,
  NlDesignatedReasonOut, NormalizeEmployerNameIn, NormalizeEmployerNameOut, NotCollectedRowIn, NotCollectedRowOut,
  NotCollectedVerdictIn, NotCollectedVerdictOut, NullResultOut, NullUserOut, NumOfIn, NumOfOut, ObstacleRankIn,
  ObstacleRankOut, OccExcludedRowsIn, OccExcludedRowsOut, OccListNoneForIn, OccListNoneForOut, OccListedRowsIn,
  OccListedRowsOut, OccNoListRowIn, OccNoListRowOut, OccTeerRowIn, OccTeerRowOut, OccupationListReasonsIn,
  OccupationListReasonsOut, OccupationRow, OccupationRowsIn, OccupationRowsOut, OfferOverrideIn, OfferOverrideOut,
  OneRowIn, OneRowOut, OopGradReasonIn, OopGradReasonOut, OpeningCount, OpsByProvinceIn, OpsByProvinceOut, OpsFacts,
  OtherProvinceGraduateHoldsIn, OtherProvinceGraduateHoldsOut, OutOfProvinceGradGapIn, OutOfProvinceGradGapOut,
  OwnTicksOfIn, OwnTicksOfOut, ParseNocDictIn, ParseNocDictOut, ParseWageRuleIn, ParseWageRuleOut, PathLeversIn,
  PathLeversOut, PathVerdictIn, PathVerdictOut, PathwayFactsIn, PathwayFactsOut, PathwayScore, PathwayVerdict,
  PermitOfIn, PermitOfOut, PersonRowsIn, PersonRowsOut, PickGateIn, PickGateOut, PickGridFactorsIn,
  PickGridFactorsOut, PickOnLangRowIn, PickOnLangRowOut, PickScoreRowIn, PickScoreRowOut, PickedFactor,
  PnpLanguageReasonsIn, PnpLanguageReasonsOut, ProfileOfOccupationIn, ProfileOfOccupationOut, ProfileSlotsIn,
  ProfileSlotsOut, ProfileWithNocIn, ProfileWithNocOut, ProfileWithOfferIn, ProfileWithOfferOut, ProvCountRow,
  ProvCountsIn, ProvCountsOut, ProvinceGridScoreIn, ProvinceGridScoreOut, ProvinceOfIn, ProvinceOfOut, PushItemIn,
  PushItemOut, QuoteOfOccIn, QuoteOfOccOut, QuoteOfReqIn, QuoteOfReqOut, RankedBlock, RankedJobRow, RankedPathway,
  RankedVerdict, RecentGraduateHoldsIn, RecentGraduateHoldsOut, RefDrawIn, RefDrawOut, ReqMonths, ReqRow, ReqsOfIn,
  ReqsOfOut, ResidenceGapIn, ResidenceGapOut, ResidenceReasonIn, ResidenceReasonOut, RowsOfIn, RowsOfOut,
  RuleProfileOfIn, RuleProfileOfOut, ScoreAndRefLineIn, ScoreAndRefLineOut, ScoreGulfReasonIn, ScoreGulfReasonOut,
  ScoreOverride, ScoreRow, SelfEmpExcludedInIn, SelfEmpExcludedInOut, SessionOfIn, SessionOfOut, SessionUser,
  StatusGateAnswerIn, StatusGateAnswerOut, StrOfIn, StrOfOut, SwallowOut, TargetProvincesOfIn, TargetProvincesOfOut,
  TeerDowngradeLeverIn, TeerDowngradeLeverOut, TeerScope, TeerScopeAcc, TeerScopesIn, TeerScopesOut, Tier,
  TierBasisOfIn, TierBasisOfOut, TierFullTimeOfIn, TierFullTimeOfOut, TierGap, TierOfMonthsIn, TierOfMonthsOut,
  TierRowsIn, TierRowsOut, TimeRowIn, TimeRowOut, ToDesignatedOut, ToDrawOut, ToEeGridOut, ToOccupationOut,
  ToRequirementOut, ToRowIn, ToScoreFactorOut, TotalExpMonthsIn, TotalExpMonthsOut, TrainableRow, TrainableRowsIn,
  TrainableRowsOut, TripleCompanyOfIn, TripleCompanyOfOut, TripleCompareRole, TripleCompareRow, TripleJobOfIn,
  TripleJobOfOut, TripleProfileOfIn, TripleProfileOfOut, TripleRow, TripleVerdictIn, TripleVerdictOut,
  TripleWireOfIn, TripleWireOfOut, TripleWireRow, UniversalValueIn, UniversalValueOut, VerdictDrawRow, VerdictLever,
  VerdictProfile, VerdictRankIn, VerdictRankOut, VerdictReason, VerdictReasonsIn, VerdictReasonsOut, WagePointsIn,
  WagePointsOut, WireRowsIn, WireRowsOut, WorkPermitSoonIn, WorkPermitSoonOut, WorstGapIn, WorstGapOut,
} from './types'

/**
 * 取一列数字。空、空串、非数字一律回 null —— **不折成 0**:
 * 官方的 n/a 与「0 分」是两回事,折了就分不出来了。
 *
 * @param v 库里那一格。
 * @returns 数字或 null。
 */
function numOf(v: NumOfIn): NumOfOut {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * 取一列字符串,空回空串。
 *
 * @param v 库里那一格。
 * @returns 字符串。
 */
function strOf(v: StrOfIn): StrOfOut {
  return v == null ? '' : String(v)
}

/**
 * 查不动时把错吞掉 —— 提成具名函数,`.catch()` 里不写匿名回调。
 *
 * @returns 恒为 null,调用方据此落空数组。
 */
function swallow(): SwallowOut {
  return null
}

/**
 * 打一条 SQL 拿行。**查不动回空数组,不抛** —— 判定层缺一张表要落成「本站未收录」,
 * 而不是整页 500;哪张表缺了,`pathVerdict` 自己会说。
 *
 * @param input 能查的东西与 SQL。
 * @returns 行;查不动是空数组。
 */
async function rowsOf(input: RowsOfIn): RowsOfOut {
  const res = await input.db.query(input.sql).catch(swallow)
  return res?.rows ?? []
}

/**
 * 一行门槛条文 → `Requirement`。
 *
 * ⚠️ `applies_condition` 在 SQL 那头走 `to_jsonb` 取:列还没建时返回 NULL 而不是 42703,
 * 让 DDL 与 push 谁先谁后不至于变成线上开关。
 *
 * @param r 库里的一行。
 * @returns 判定引擎认的形状。
 */
function toRequirement(r: ToRowIn): ToRequirementOut {
  return {
    province: strOf(r.province), program: strOf(r.program), stream: strOf(r.stream),
    subject: strOf(r.subject) === SUBJECT.employer ? SUBJECT.employer : SUBJECT.applicant,
    factor: strOf(r.factor), op: strOf(r.op), value: numOf(r.value), valueText: strOf(r.value_text),
    unit: strOf(r.unit), appliesTeer: strOf(r.applies_teer), appliesNoc: strOf(r.applies_noc),
    excludesNoc: strOf(r.excludes_noc), appliesArea: strOf(r.applies_area),
    appliesCondition: strOf(r.applies_condition), familySize: numOf(r.applies_family_size),
    basis: strOf(r.basis), label: strOf(r.label), section: strOf(r.section), effective: strOf(r.effective),
    url: strOf(r.url), pageUrl: strOf(r.page_url), fetched: strOf(r.fetched),
  }
}

/**
 * 一行省提名职业清单 → `OccupationRow`。
 *
 * @param r 库里的一行。
 * @returns 判定核认的形状。
 */
function toOccupation(r: ToRowIn): ToOccupationOut {
  return {
    province: strOf(r.province), stream: strOf(r.stream), label: strOf(r.label), program: strOf(r.program),
    type: strOf(r.type), url: strOf(r.url), fetched: strOf(r.fetched), appliesTo: strOf(r.applies_to),
    noc: strOf(r.noc), name: strOf(r.name), gtaRestricted: Boolean(r.gta_restricted),
  }
}

/**
 * 一行抽选记录 → `VerdictDrawRow`。日期只取前十位(库里可能带时分秒)。
 *
 * @param r 库里的一行。
 * @returns 判定核认的形状。
 */
function toDraw(r: ToRowIn): ToDrawOut {
  return {
    province: strOf(r.province), label: strOf(r.label), scale: r.scale == null ? null : strOf(r.scale),
    url: strOf(r.url), fetched: strOf(r.fetched), kind: strOf(r.kind),
    drawDate: strOf(r.draw_date).slice(0, DATE_LEN), stream: strOf(r.stream),
    score: numOf(r.score), invitations: numOf(r.invitations), note: strOf(r.note),
  }
}

/**
 * 一行省提名打分因素 → `ScoreFactor`。
 *
 * @param r 库里的一行。
 * @returns 评分域认的形状。
 */
function toScoreFactor(r: ToRowIn): ToScoreFactorOut {
  return {
    province: strOf(r.province), system: strOf(r.system), factor: strOf(r.factor),
    kind: strOf(r.kind) || FACTOR_ROW, seq: Number(r.seq ?? 0), label: strOf(r.label),
    points: numOf(r.points), xorPrev: Boolean(r.xor_prev), rule: strOf(r.rule),
    factorMax: numOf(r.factor_max), factorGroup: strOf(r.factor_group), groupMax: numOf(r.group_max),
    passMark: numOf(r.pass_mark), maxTotal: numOf(r.max_total),
    guideEffective: strOf(r.guide_effective), fetched: strOf(r.fetched), url: strOf(r.url),
  }
}

/**
 * 一行 EE 分表 → `EeGridRow`。`points` 可空:官方的 n/a 原样留在 `pointsText`,不拿 0 冒充。
 *
 * @param r 库里的一行。
 * @returns 评分域认的形状。
 */
function toEeGrid(r: ToRowIn): ToEeGridOut {
  return {
    grid: strOf(r.grid), section: strOf(r.section), sectionLabel: strOf(r.section_label),
    kind: strOf(r.kind), tableNo: numOf(r.table_no), heading: strOf(r.heading), factor: strOf(r.factor),
    criterion: strOf(r.criterion), columnLabel: strOf(r.column_label), points: numOf(r.points),
    pointsText: strOf(r.points_text), seq: numOf(r.seq), url: strOf(r.url), fetched: strOf(r.fetched),
  }
}

/**
 * 一行指定雇主名录 → `DesignatedEmployerRow`。
 *
 * @param r 库里的一行。
 * @returns 判定核认的形状。
 */
function toDesignated(r: ToRowIn): ToDesignatedOut {
  return {
    name: strOf(r.name), province: strOf(r.province), location: strOf(r.location),
    isTech: Boolean(r.is_tech), source: strOf(r.source), nocs: strOf(r.nocs),
    url: strOf(r.url), fetched: strOf(r.fetched),
  }
}

/**
 * 把六张底表一次拉全。
 *
 * 六条查询**并发**发出去:它们互不依赖,串行等于把详情页的首屏时间乘以六。
 *
 * ⚠️ 指定雇主名录只拉 NL 那一段 —— `pathVerdict` 只把它当「NL 名录里有几家申报过这个 NOC」的分母,
 * 整表 3476 行拉回来纯属浪费带宽(另有 `getDesignatedEmployers` 按省拉,那是雇主名字匹配用的,别混)。
 *
 * @param db 能查的东西。
 * @returns 判定层六张底表。
 */
export async function loadVerdictTables(db: LoadVerdictTablesIn): LoadVerdictTablesOut {
  const [reqs, occs, draws, factors, grid, employers] = await Promise.all([
    rowsOf({ db, sql: SQL.PNP_REQUIREMENTS_ALL }),
    rowsOf({ db, sql: SQL.PNP_OCCUPATIONS_FULL }),
    rowsOf({ db, sql: SQL.PNP_DRAWS_FULL }),
    rowsOf({ db, sql: SQL.PNP_SCORE_FACTORS }),
    rowsOf({ db, sql: SQL.EE_POINTS_GRID_2 }),
    rowsOf({ db, sql: SQL.DESIGNATED_BY_PROV_2 }),
  ])
  return {
    requirements: reqs.map(toRequirement),
    occupations: occs.map(toOccupation),
    draws: draws.map(toDraw),
    scoreFactors: factors.map(toScoreFactor),
    eeGrid: grid.map(toEeGrid),
    designatedEmployers: employers.map(toDesignated),
  }
}

// =========================================================================
// 2. 名录匹配(AIP 指定雇主名录的名字口径)
// =========================================================================

/**
 * 名字归一:大小写、`&`↔`and`、标点与多空格。
 *
 * **只归一书写形式,不动词** —— 法人后缀(Inc / Ltd)一律保留:
 * `Foo Inc` 与 `Foo Ltd` 是两家公司,归一到一起就是认错公司。
 *
 * @param name 待归一的名字。
 * @returns 归一后的名字。
 */
export function normalizeEmployerName(name: NormalizeEmployerNameIn): NormalizeEmployerNameOut {
  return (name || '').toLowerCase().replace(AMP, AND_WORD).replace(NAME_KEEP, SPACE).trim()
}

/**
 * 名录名 → 可比的名段:整名 + `o/a` 前后各段(法定名 / 营业名)。无 `o/a` 时就是整名一段。
 *
 * @param name 名录上那个名字。
 * @returns 可比的名段。
 */
export function employerNameSegments(name: EmployerNameSegmentsIn): EmployerNameSegmentsOut {
  const parts: string[] = []
  for (const raw of (name || '').split(OA_SPLIT)) {
    const part = raw.trim()
    if (part) parts.push(part)
  }
  return parts.length ? parts : [name || '']
}

/**
 * 公司名 × 该省名录行 → **完全匹配**结果。命中 = 规范化后公司名等于名录名的某一个名段。
 *
 * 🔴 **为什么从「包含」收到「完全相等」**(Frank 2026-08-10 拍板):
 * 旧口径是双向大小写不敏感**子串包含**,子串落在单词内部照样算命中 ——
 * `Esso` → `Wheeler Acc·esso·ries`(配件店)、`ARMS Ltd` → `Wohlgemuth F·arms Ltd`(农场)。
 * 全量审计坐实(docs/evaluation/名录匹配审计-20260809.md)。三分表是付费信任的地基,
 * 表里认错公司比慢几秒严重得多 —— 用户发现「这家根本不是这家」,整张表的数字都不可信了。
 *
 * 🔴 **但「完全相等」不能按字面比**:官方名录 1,459/3,867(38%)的行是「法定全称 o/a 营业名」,
 * 而岗位上挂的是**营业名**。字面完全相等会把真命中一起砍掉 —— 实测四省 389 → 81(砍 79%),
 * 连本站判定卡的基准 fixture(Grand View Manor)都会当场变成「名录里没认出这家」。
 * 所以比的是**名录名的任一名段**。
 *
 * 🔴 **完全匹配治不了连锁多配**:加盟法人的 `o/a` 段本来就精确等于品牌名 ——
 * `12345 NB Inc o/a Tim Hortons` 的营业名段就是 `Tim Hortons`,同省 20 家全是合法的完全匹配,
 * 一家都不算错配。谁是你这份岗的雇主不可证 → 多配时 `row=null`,**只报家数不点名法人**
 * (「这条链在名录里」为真,「这家法人=你雇主」不编)。
 *
 * 口径实测(四省去重 2,218 对公司名;标定脚本一次性,未入库):
 * 旧的双向裸包含 389 命中 / 52 多配 / 最大 55 配;字面完全相等 81 命中(砍 79%,不可用);
 * 规范化相等 125 命中;**本文实现 = 规范化 + `o/a` 段展开,281 命中 / 17 多配 / 最大 20 配**;
 * 再剥法人后缀能到 335 命中,但会把 `Foo Inc` 与 `Foo Ltd` 当成一家,不采用。
 *
 * @param input 公司名与**已按省筛过**的名录行。
 * @returns 命中行、命中家数、名录名 ——
 *   多配时**不点名法人**(row=null),只留家数与名录名:名录里同名连锁有好几家,
 *   随便挑一家写上去等于替他认定是哪一家。
 */
export function matchDesignation(input: MatchDesignationIn): MatchDesignationOut {
  const target = normalizeEmployerName(input.companyName)
  if (!target) return { row: null, count: 0, source: '' }

  const hits: NameRow[] = []
  for (const row of input.rows) {
    for (const seg of employerNameSegments(row.name)) {
      if (normalizeEmployerName(seg) === target) {
        hits.push(row)
        break
      }
    }
  }
  if (!hits.length) return { row: null, count: 0, source: '' }

  const sources = new Set<string>()
  for (const row of hits) {
    const one = (row.source ?? '').trim()
    if (one) sources.add(one)
  }
  const source = sources.size === 1 ? Array.from(sources)[0] : ''
  return { row: hits.length === 1 ? hits[0] : null, count: hits.length, source }
}

// =========================================================================
// 3. 雇主侧判定(公司事实 × 官方雇主侧门槛 → 三态)
// =========================================================================

/**
 * 挑出该省该因素的雇主侧门槛行。
 *
 * @param input 全部门槛行、省码、因素。
 * @returns 命中的那些行。
 */
function empRowsOf(input: EmpRowsOfIn): EmpRowsOfOut {
  const out: ReqRow[] = []
  for (const r of input.reqs) {
    if (r.province === input.province && r.subject === SUBJECT.employer && r.factor === input.factor) out.push(r)
  }
  return out
}

/**
 * 判一项,并把结果写进收集器。
 *
 * 判不了就是判不了:`need` 或 `have` 缺一个 → `unknown`,**不许当成不满足** ——
 * 「我们查不到这家公司的雇员数」和「这家公司雇员数不够」是两句完全不同的话。
 *
 * @param input 收集器、因素、门槛、公司侧的值、单位、证据性质。
 * @returns 没有返回值。
 */
function pushItem(input: PushItemIn): PushItemOut {
  let verdict: ItemVerdict = ITEM.unknown
  let short: number | null = null
  if (input.need != null && input.have != null) {
    verdict = input.have >= input.need ? ITEM.pass : ITEM.fail
    if (verdict === ITEM.fail) short = input.need - input.have
  }
  if (verdict === ITEM.fail) input.acc.failed.push(input.factor)
  if (verdict === ITEM.unknown) input.acc.missing.push(input.factor)
  input.acc.items.push({
    factor: input.factor, verdict, need: input.need, have: input.have, short,
    unit: input.unit, evidence: input.have == null ? EVIDENCE_KIND.missing : input.evidence,
  })
}

/**
 * 公司事实 × 该省官方雇主侧门槛 → 三态判定。
 *
 * 🔴 四条红线(设计 `docs/design/雇主省提名门槛判定-20260808.md` §1,照抄照守):
 * ① **三态**:达标 / 差某项(点名哪项)/「缺 X 判不了」—— 不下第四种模糊结论;
 * ② **营业额恒旁证**:本站从无私企财务来源,facts 里压根不收这个字段 → 该项恒 `unknown`
 *    且**不参与整体判定**(有无这项门槛只影响这一行怎么显示,不该拖累年限/雇员数已经判出来的结果);
 * ③ 判定 = **对照官方公布门槛**,不是省官方认证;
 * ④ **公共部门雇主**(卫生局/市政/学区)不在企业注册库里 → 整体旁路成 `public`,不硬判。
 *
 * 🔵 **不复用 `lib/gauge` 的 `employerBar()`**:那个是按**单一已知地点**分档取值的(GTA 内外 / 大温内外…),
 * 而本函数服务的雇主一行可能横跨多市、没有单一地址,判不出该按哪档 —— 所以只吃**不分区**的通用门槛
 * (`appliesArea` 全空,如 AB 三项);分档省份(BC / ON / NL)雇员数天然留空,**不瞎猜该套哪个档**。
 *
 * @param input 公司事实、省码、门槛行、当前年份。
 * @returns 三态判定,含逐项与点名。
 */
export function employerVerdict(input: EmployerVerdictIn): EmployerVerdictOut {
  if (input.facts.sector === SECTOR_PUBLIC) {
    return { state: EMP_STATE.public, items: [], revenue: null, failed: [], missing: [] }
  }
  const acc: EmpAcc = { items: [], failed: [], missing: [] }

  const yearsRow = empRowsOf({ reqs: input.reqs, province: input.province, factor: EMP_FACTOR.years })[0]
  if (yearsRow) {
    const needYears = yearsRow.value == null
      ? null
      : yearsRow.unit === MONTHS ? yearsRow.value / MONTHS_PER_YEAR : yearsRow.value
    const haveYears = input.facts.foundedYear != null ? input.nowYear - input.facts.foundedYear : null
    pushItem({ acc, factor: EMP_KEY.years, need: needYears, have: haveYears, unit: EMP_UNIT.years, evidence: EVIDENCE_KIND.official })
  }

  const staffRows = empRowsOf({ reqs: input.reqs, province: input.province, factor: EMP_FACTOR.staff })
  if (staffRows.length) {
    pushItem({
      acc, factor: EMP_KEY.staff, need: universalValue(staffRows), have: input.facts.staffEst,
      unit: EMP_UNIT.employees, evidence: EVIDENCE_KIND.estimate,
    })
  }

  const revenueRows = empRowsOf({ reqs: input.reqs, province: input.province, factor: EMP_FACTOR.revenue })
  const revenue: EmployerVerdictItem | null = revenueRows.length
    ? {
      factor: EMP_KEY.revenue, verdict: ITEM.unknown, need: universalValue(revenueRows), have: null,
      short: null, unit: EMP_UNIT.revenue, evidence: EVIDENCE_KIND.missing,
    }
    : null

  const state = acc.items.length === 0
    ? EMP_STATE.unknown
    : acc.failed.length ? EMP_STATE.short : acc.missing.length ? EMP_STATE.unknown : EMP_STATE.met
  return { state, items: acc.items, revenue, failed: acc.failed, missing: acc.missing }
}

/**
 * 从一组门槛行里取**不分区**那一档的阈值。分档省份没有这一档 → null,判定落 unknown。
 *
 * @param rows 同一因素的门槛行。
 * @returns 通用档的阈值;没有就是 null。
 */
function universalValue(rows: UniversalValueIn): UniversalValueOut {
  for (const r of rows) if (r.appliesArea === '') return r.value
  return null
}

/**
 * 一道闸有多难拆。**排序与标签共用这一份口径** —— 各算各的迟早两处不一致。
 *
 * @param block 闸的名字;没有闸就是 undefined。
 * @returns 代价;没有闸回 -1(排在最前),不认识的闸回 9(排在最后)。
 */
export function blockCost(block: BlockCostIn): BlockCostOut {
  return block ? BLOCK_COST[block] ?? UNKNOWN_BLOCK_COST : NO_BLOCK_COST
}

// =========================================================================
// 4. 通道判定(一套档案进,13 条通道的裁决出)
// =========================================================================

/**
 * 一行门槛条文 → 一条理由的出处。
 *
 * @param input 那一行门槛条文。
 * @returns 出处:官网 url、抓取日、标签、节号、生效日。
 */
function evOfReq(input: EvOfReqIn): EvOfReqOut {
  return {
    url: input.r.url, fetched: input.r.fetched, label: input.r.label, section: input.r.section, effective: input.r.effective,
  }
}
/**
 * quote 的唯一来源:官方原文优先取 valueText(联邦页),PNP 页的原文落在 label。
 *
 * @param input 一行门槛条文。
 * @returns 官方原句;两处都空则空串。
 */
function quoteOfReq(input: QuoteOfReqIn): QuoteOfReqOut {
  return (input.r.valueText || input.r.label || '').trim()
}

/**
 * 一行职业清单 → 出处。标签里带上通道名与 NOC,免得只看见一个光秃秃的码。
 *
 * @param input 那一行职业清单。
 * @returns 出处。
 */
function evOfOcc(input: EvOfOccIn): EvOfOccOut {
  return { url: input.r.url, fetched: input.r.fetched, label: `${input.r.stream}${SEP.spacedDash}${input.r.noc} ${input.r.name}` }
}
/**
 * 一轮抽选 → 出处。标签里带上通道名与日期 —— **报「和哪一轮比」,不报「你差几分」**。
 *
 * @param input 那一轮抽选。
 * @returns 出处。
 */
function evOfDraw(input: EvOfDrawIn): EvOfDrawOut {
  return {
    url: input.d.url, fetched: input.d.fetched, label: `${input.d.stream}${SEP.parenL}${input.d.drawDate}${input.d.note ? SEP.midDot + input.d.note : ''}${SEP.parenR}`,
  }
}
/**
 * 一行官方分值行 → 出处。标签取它自报的分制名,生效日取指南的生效日。
 *
 * @param input 那一行官方分值行。
 * @returns 出处。
 */
function evOfFactor(input: EvOfFactorIn): EvOfFactorOut {
  return { url: input.f.url, fetched: input.f.fetched, label: input.f.system, effective: input.f.guideEffective }
}

/**
 * `windowYears=3;minYears=1;hoursPerWeek=30` → 取一个键的值。
 *
 * @param input 口径串与要取的键。
 * @returns 该键的值;串里没有这个键则 null。
 */
function basisParam(input: BasisParamIn): BasisParamOut {
  for (const kv of (input.basis || '').split(SEP.semicolon)) {
    const i = kv.indexOf(SEP.eq)
    if (i > 0 && kv.slice(0, i).trim() === input.key) return kv.slice(i + 1).trim()
  }
  return null
}

/**
 * 门槛行 → 月数。op=PERMIT.none = 官方明说这条通道不设门槛 → 0 个月(**不是**「没查到」)。
 *
 * @param input 一行门槛条文。
 * @returns 门槛月数;单位认不出或库里没值则 null。
 */
function monthsOfReq(input: MonthsOfReqIn): MonthsOfReqOut {
  if (input.r.op === PERMIT.none) return 0
  if (input.r.value == null) return null
  if (input.r.unit === MONTHS) return input.r.value
  if (input.r.unit === REQ_UNIT.years) return input.r.value * MONTHS_PER_YEAR
  if (input.r.unit === REQ_UNIT.hours) {
    const y = basisParam({ basis: input.r.basis, key: BASIS_MIN_YEARS })
    return y ? Number(y) * MONTHS_PER_YEAR : null
  }
  return null
}

/**
 * offer 到手后还要等多久:0=Day0 / 1=3-6 月 / 2=12 月 / 3=24 月。
 *
 * @param input 还差多少个月。
 * @returns 四档中的一档。
 */
function tierOfMonths(input: TierOfMonthsIn): TierOfMonthsOut {
  if (input.m <= 0) return TIER.now
  if (input.m <= TIER_BOUND.months6) return TIER.months6
  return input.m <= TIER_BOUND.months12 ? TIER.months12 : TIER.beyond
}

/**
 * 标签里的最高 CLB 档(天花板估分用;档位从官方标签自己解析,不写死)。
 *
 * @param input 官方分值行的标签们。
 * @returns 最高的那一档;一个都解析不出则 null。
 */
function maxClbIn(input: MaxClbInIn): MaxClbInOut {
  let max: number | null = null
  for (const l of input.labels) {
    const m = CLB_IN_LABEL.exec(l || '')
    if (m) {
      const [, clb] = m
      const v = Number(clb)
      if (max == null || v > max) max = v
    }
  }
  return max
}

/**
 * 「这段经验攒在本省」这个条件成不成立(AB 那条)。
 *
 * 官方原句:「24 个月境内外经验(或**近 18 个月内在阿省 12 个月**)」—— 条件是「这段经验发生在阿省」。
 * 本站档案**没有「经验所在省」这一槽**,只有现居省 + 加拿大经验月数,所以这里是**近似**:
 * 现居本省 ⇒ 认他的加拿大经验攒在本省(在阿省生活的人,加拿大受雇经历多半也在阿省);
 * 现居别省 ⇒ false(保守:不拿别省经验去够那 12 个月,退回通用 24 个月那行);
 * 没答现居省 ⇒ null(判不了,退回 24 那行 + 摆一条「另有一档判不了」)。
 * 近似的代价压在**只对现居本省的人放宽**这一侧:放宽错了他还有 24 个月那条兜底,不会因此被判死。
 * 口径配套见 `PROVINCE_LOCAL_EXP`:挑中这行时可计月数换成加拿大经验(境外经验不算本省经验)。
 *
 * @param input 判定档案与本省省码。
 * @returns 成立 / 不成立;没答现居省则 null。
 */
function localExperienceHolds(input: LocalExperienceHoldsIn): LocalExperienceHoldsOut {
  if (input.p.province == null) return null
  return input.p.province === input.province
}

/**
 * 「近期本省院校毕业生」这个条件成不成立(ON 那条)。
 *
 * 官方:近 3 年安省院校毕业 + 2 年制以上文凭/研究生证书/硕博。本站档案没有毕业日期槽,
 * 只用「加拿大学历 + 学习省 + 学制年数」判 —— 判不了就返回 null(缺槽),不按「大概是」放行。
 *
 * @param input 判定档案与本省省码。
 * @returns 成立 / 不成立;缺学习省或学制年数则 null。
 */
function recentGraduateHolds(input: RecentGraduateHoldsIn): RecentGraduateHoldsOut {
  if (input.p.canadaStudy !== true) return false
  if (input.p.studyProvince == null || input.p.eduYears == null) return null
  return input.p.studyProvince === input.province && input.p.eduYears >= ON_GRAD_MIN_YEARS
}

/**
 * 「省外院校毕业生」这个条件成不成立。
 *
 * @param input 判定档案与本省省码。
 * @returns 成立 / 不成立;没答学习省则 null。
 */
function otherProvinceGraduateHolds(input: OtherProvinceGraduateHoldsIn): OtherProvinceGraduateHoldsOut {
  if (input.p.canadaStudy !== true) return false
  if (input.p.studyProvince == null) return null
  return input.p.studyProvince !== input.province
}

/**
 * 非地域适用条件是否成立。返回 null = 判不了(缺槽)——**不猜**;不认识的条件也返回 null。
 * 官方口径:带条件的那一行是通用条款的**例外**,条件成立时它覆盖通用行(同 rules.ts nocScore 的「最具体优先」)。
 *
 * 🔴 分发次序有讲究:**与学历无关的条件必须排在 `canadaStudy` 守卫之前** —— AB 那条量的是
 * 「经验攒在哪个省」,卡在学历守卫后面会让「没答有没有加拿大学历」的档案连它都判不了
 * (2026-08-15 数据侧实测点名)。
 *
 * @param input 条件名、档案与本省省码。
 * @returns 成立 / 不成立;缺槽或不认识这个条件则 null。
 */
function conditionHolds(input: ConditionHoldsIn): ConditionHoldsOut {
  if (!input.cond) return true
  if (input.cond === AB_LOCAL_EXP) return localExperienceHolds({ p: input.p, province: input.province })
  if (input.p.canadaStudy == null) return null
  if (input.cond === RECENT_ON_GRADUATE) return recentGraduateHolds({ p: input.p, province: input.province })
  if (input.cond === CONDITION.gradOtherProvince) {
    return otherProvinceGraduateHolds({ p: input.p, province: input.province })
  }
  return null
}

/**
 * 两份 override 合成一份:后来的(用户直选的官方档位)盖住前面的(offer 那一格)。
 *
 * @param input 底一份与盖在上面的一份。
 * @returns 合并后的 override 表。
 */
function mergeOverrides(input: MergeOverridesIn): MergeOverridesOut {
  const out: Record<string, ScoreOverride> = {}
  for (const [k, v] of Object.entries(input.base)) out[k] = v
  for (const [k, v] of Object.entries(input.extra)) out[k] = v
  return out
}

/**
 * 换一个职业再判一遍时用的档案:除 noc / teer 外一格不动。
 *
 * @param input 原档案与要换上的 NOC / TEER。
 * @returns 换过职业的档案。
 */
function profileWithNoc(input: ProfileWithNocIn): ProfileWithNocOut {
  return {
    age: input.p.age, married: input.p.married, clb: input.p.clb, edu: input.p.edu,
    eduYears: input.p.eduYears, canadaStudy: input.p.canadaStudy, studyProvince: input.p.studyProvince,
    noc: input.noc, teer: input.teer,
    expCanadaMonths: input.p.expCanadaMonths, expForeignMonths: input.p.expForeignMonths,
    foreignExpSelfEmployed: input.p.foreignExpSelfEmployed, status: input.p.status,
    province: input.p.province, hasOffer: input.p.hasOffer, inCanada: input.p.inCanada,
    fieldMatch: input.p.fieldMatch, frenchOk: input.p.frenchOk, permit: input.p.permit,
    scoreProfile: input.p.scoreProfile, scoreRows: input.p.scoreRows, wage: input.p.wage,
    areaI: input.p.areaI, scoreTicks: input.p.scoreTicks,
  }
}

/**
 * 挑出属于这条通道的门槛行:省份先对上,再按 program / stream 收窄。
 *
 * @param input 通道声明与全量门槛行。
 * @returns 这条通道自己的门槛行(保持底表原序)。
 */
function reqsOf(input: ReqsOfIn): ReqsOfOut {
  const out: ReqRow[] = []
  for (const r of input.all) {
    if (r.province !== input.spec.reqProvince) continue
    if (input.spec.reqPrograms && !input.spec.reqPrograms.includes(r.program)) continue
    if (input.spec.reqStream && !input.spec.reqStream.test(r.stream)) continue
    out.push(r)
  }
  return out
}

/**
 * 该通道认可的可计经验月数(null=判不了)。employerTenure 口径另算,见 pickGate。
 *
 * @param input 通道声明、档案、自雇是否被排除。
 * @returns 可计月数;缺槽判不了则 null。
 */
function countableMonths(input: CountableMonthsIn): CountableMonthsOut {
  const can = input.p.expCanadaMonths
  if (!input.spec.countsForeign) return can
  const foreign = input.selfEmpExcluded && input.p.foreignExpSelfEmployed === true ? 0 : input.p.expForeignMonths
  if (can == null || foreign == null) return null
  return can + foreign
}


/**
 * 最具体优先:条件行成立时**覆盖**通用行。
 *
 * ON 毕业生 3 个月覆盖通用 6 个月;MB 外省毕业 12 个月覆盖通用 6 个月。
 * 一条带条件的都没成立时,退回通用行那一池。
 *
 * @param input 条件已经判过、确定适用的那些门槛行。
 * @returns 带条件的那些;一条都没有则原样回。
 */
function mostSpecificRows(input: MostSpecificRowsIn): MostSpecificRowsOut {
  const conditional: ReqRow[] = []
  for (const r of input.applicable) if ((r.appliesCondition || '') !== '') conditional.push(r)
  return conditional.length ? conditional : input.applicable
}

/**
 * 池子里门槛最低的那一行 —— 联邦三子通道并列(CEC/FSW/FST 任一达标即可入池)时靠它挑。
 *
 * 并列时取**先出现**的那条(严格小于才换人)。算不出月数的行不参与,一行都算不出就回池子第一行。
 *
 * @param input 入池的那些门槛行。
 * @returns 门槛最低的那一行;池子空则 null。
 */
function lowestMonthsRow(input: LowestMonthsRowIn): LowestMonthsRowOut {
  let lowest: ReqMonths | null = null
  for (const r of input.pool) {
    const m = monthsOfReq({ r: r })
    if (m == null) continue
    if (lowest == null || m < lowest.m) lowest = { r: r, m: m }
  }
  return lowest ? lowest.r : (input.pool[0] ?? null)
}

/**
 * 他手上已经攒了多少个月 —— **量哪一把尺子由挑中的那一行决定**,三种口径互不通用。
 *
 * · 本省经验条件行(「近 18 个月内在阿省满 12 个月」这类):量的是**本省攒的**经验,境外经验不许
 *   进这把尺子(通用 24 个月那行才认境内外)。省内/省外的近似口径与 `conditionHolds` 同一条。
 * · 同雇主在职行(口径隔离,`lib/rules` 同款):量的是「在**这家**雇主连续全职干了多久」,不是同职业
 *   总经验。加拿大经验为 0 时可以确定在职时长也是 0(没在加拿大受雇过);>0 且现居就是本省时,用它作
 *   **上界**(可能分散在几家雇主 → 措辞层要点明);在别省攒的经验对本省雇主在职时长记 0。
 * · 其余:走 `countableMonths`(该通道认不认境外经验由它定)。
 *
 * @param input 通道声明、档案、挑中的那一行、是不是在职门槛,与「自雇是否被排除」。
 * @returns 已攒月数;缺槽判不了则 null。
 */
function haveMonthsOf(input: HaveMonthsOfIn): HaveMonthsOfOut {
  const local = input.p.province === input.spec.reqProvince
  if (input.picked && PROVINCE_LOCAL_EXP.has(input.picked.appliesCondition || '')) {
    return input.p.expCanadaMonths == null ? null : local ? input.p.expCanadaMonths : 0
  }
  if (input.tenure) {
    if (input.p.expCanadaMonths == null) return null
    if (input.p.expCanadaMonths === 0) return 0
    return local ? input.p.expCanadaMonths : 0
  }
  return countableMonths({ spec: input.spec, p: input.p, selfEmpExcluded: input.selfEmpExcluded })
}

/**
 * 经验闸:从该通道的门槛行里挑出**量他的那一行**,并算出还差多少。
 *
 * 三件事按顺序办:① 只留申请人自己的经验/工时行,再按 TEER 收窄;
 * ② 条件行成立时覆盖通用行(最具体优先);③ 联邦三子通道并列时取门槛最低的那条。
 * 量哪一把尺子由挑中的行决定 —— 同雇主在职、本省攒的经验、境内外总经验,三种口径互不通用
 * (见 `haveMonthsOf`)。
 *
 * 🔴 need=0(op=PERMIT.none:官方明说不设门槛)时 gap 恒 0,**不看 have**:一道不存在的闸
 * 不许因为「缺经验月数」把通道拖成 needs-info(2026-08-06 §4.5:NL 正是这么被挤出第一轮答复的)。
 *
 * @param input 通道声明、该通道的门槛行、档案与「自雇是否被排除」。
 * @returns 入池的行、挑中的那一行、要求月数、已攒月数、缺口,与两个说不清的旗标。
 */
function pickGate(input: PickGateIn): PickGateOut {
  const expRows: ReqRow[] = []
  for (const r of input.rows) {
    if (r.factor !== FACTOR.experience && r.factor !== REQ_FACTOR.workHours) continue
    if (r.subject !== SUBJECT.applicant) continue
    expRows.push(r)
  }
  const gateRows: ReqRow[] = []
  for (const r of expRows) if (teerHit({ r: r, teer: input.p.teer })) gateRows.push(r)
  if (!gateRows.length) {
    return { rows: [], picked: null, need: null, have: null, gap: null, tenure: false, unknownCond: [],
      teerUnknown: expRows.length > 0 && input.p.teer == null }
  }

  const unknownCond: ReqRow[] = []
  const applicable: ReqRow[] = []
  for (const r of gateRows) {
    const ok = conditionHolds({ cond: r.appliesCondition || '', p: input.p, province: input.spec.reqProvince })
    if (ok === null) { unknownCond.push(r); continue }
    if (ok) applicable.push(r)
  }
  const pool = mostSpecificRows({ applicable: applicable })
  const picked = lowestMonthsRow({ pool: pool })
  const need = picked ? monthsOfReq({ r: picked }) : null
  const tenure = picked?.basis === BASIS.employerTenure
  const have = haveMonthsOf({
    spec: input.spec, p: input.p, picked: picked, tenure: tenure, selfEmpExcluded: input.selfEmpExcluded,
  })
  const gap = need == null ? null : need === 0 ? 0 : have == null ? null : Math.max(0, need - have)
  return { rows: pool, picked, need, have, gap, tenure, unknownCond, teerUnknown: false }
}

/**
 * 居住门槛(NB 的「过去 6 个月住在 NB」)。现居省不是本省 → 0 个月,是本省 → 判不了时长(缺槽)。
 *
 * @param input 该通道的门槛行与档案。
 * @returns 命中的居住门槛行、要求月数与缺口;没有这类门槛则 null。
 */
function residenceGap(input: ResidenceGapIn): ResidenceGapOut {
  let row: ReqRow | null = null
  for (const r of input.rows) {
    if (r.factor === FACTOR.residence && r.subject === SUBJECT.applicant) { row = r; break }
  }
  if (!row) return null
  const need = monthsOfReq({ r: row })
  if (need == null) return null
  if (input.p.province == null) return { row, need, gap: null }
  return { row, need, gap: input.p.province === input.spec.reqProvince ? null : need }
}

/**
 * 抽选参照线:先按通道名匹配;匹配不上且该省允许(MB 单池单分制)才退回全省最近一轮有分线的抽选。
 *
 * @param input 通道声明与全量抽选行。
 * @returns 拿来当参照的那一轮;找不到可对照的轮次则 null。
 */
function refDraw(input: RefDrawIn): RefDrawOut {
  const wantProvince = input.spec.province === FED ? FED : input.spec.reqProvince
  const scored: VerdictDrawRow[] = []
  for (const d of input.draws) {
    if (d.province === wantProvince && d.kind === FACTOR.draw && d.score != null) scored.push(d)
  }
  scored.sort(byDrawDateDesc)
  const stream = input.spec.drawStream
  if (stream) {
    for (const d of scored) if (streamMatches({ drawStream: d.stream, gridStream: stream })) return d
  }
  return input.spec.drawFallbackProvinceWide ? (scored[0] ?? null) : null
}

/**
 * 用户在分值卡上直选的那一行官方档位(按 seq 认行)。
 *
 * @param input 该省全量分值行、档案、省码与因素名。
 * @returns 直选中的那一行;没直选或认不出则 null。
 */
function pickScoreRow(input: PickScoreRowIn): PickScoreRowOut {
  const seq = input.p.scoreRows?.[`${input.province}${SEP.colon}${input.factor}`]
  if (seq == null) return null
  for (const f of input.all) {
    if (f.factor === input.factor && f.kind === FACTOR_ROW && f.seq === seq) return f
  }
  return null
}

/**
 * offer 那一格的 override:官方表里没有 offer 行就一格都不给。
 *
 * @param input 官方的 offer 行与「他有没有 offer」。
 * @returns 只含 offer 一格的 override 表;没有 offer 行则空表。
 */
function offerOverride(input: OfferOverrideIn): OfferOverrideOut {
  if (!input.row) return {}
  return { offer: { pts: input.has ? (input.row.points ?? 0) : 0, matched: input.row.label, source: SOURCE_PROFILE } }
}

/**
 * 这张表里出现过的因素名,按表里的原序去重。
 *
 * @param input 该省的全量官方分值行。
 * @returns 因素名,原序、不重复。
 */
function factorNames(input: FactorNamesIn): FactorNamesOut {
  const names: string[] = []
  const seen = new Set<string>()
  for (const f of input.all) {
    if (seen.has(f.factor)) continue
    seen.add(f.factor)
    names.push(f.factor)
  }
  return names
}

/**
 * 官方把规则写成 JSON 串放在分值行里,解出来。
 *
 * ⚠️ 欠账(照搬老行为,这一轮不改):串坏了这里**静默**回空对象、由调用方按官方默认取值,
 * 没有留痕。按宪法 `catch` 该留痕(`lib/log`),改它会动到运行时输出,另立一批。
 *
 * @param input 那一行的规则串。
 * @returns 解出来的参数;串坏了或没有则空对象。
 */
function parseWageRule(input: ParseWageRuleIn): ParseWageRuleOut {
  try {
    return JSON.parse(input.rule || EMPTY_JSON)
  } catch {
    return {}
  }
}

/**
 * 纯规则因素的得分(BC 时薪:每整元 1 分)。
 *
 * 用户填了时薪就按官方规则算,没填才当 0 并标下界 —— 门槛与封顶都取官方那一行自己写的数,
 * 代码里只留「低于门槛不给分、高于封顶不再加」这条形状。
 *
 * @param input 那一行规则行与他填的时薪。
 * @returns 这一格记多少分。
 */
function wagePoints(input: WagePointsIn): WagePointsOut {
  const cfg = parseWageRule({ rule: input.rule.rule })
  const floorAt = cfg.floorAt ?? WAGE_RULE_DEFAULT.floorAt
  const capAt = cfg.capAt ?? WAGE_RULE_DEFAULT.capAt
  if (input.wage < floorAt) return 0
  const pts = Math.floor(Math.min(input.wage, capAt)) - WAGE_RULE_DEFAULT.base
  return Math.min(pts, input.rule.factorMax ?? WAGE_RULE_DEFAULT.factorMax)
}

/**
 * 一个因素该认哪一行官方档位。
 *
 * BC 工作地区单列:它由 `areaI` 直接给下标(分值卡同款);其余因素认 `scoreRows` 里的 seq。
 *
 * @param input 该省的全量分值行、地区行、档案、通道声明与因素名。
 * @returns 认中的那一行;他也没答则 null。
 */
function gridRowFor(input: GridRowForIn): GridRowForOut {
  if (input.name === SCORE_FACTOR.area && input.spec.reqProvince === PROV.BC && input.p.areaI != null) {
    return input.areaRows[input.p.areaI] ?? null
  }
  return pickScoreRow({ all: input.all, p: input.p, province: input.spec.reqProvince, factor: input.name })
}

/**
 * 「档案推不出、但用户可以自己答」的因素 → 它在分值卡档案里的那一槽。
 *
 * 答了就交给 AUTO_PICK 按官方档位匹配;没答仍整省不接 —— 拆分经验/第二语言由档案推就是编数
 * (SK/NL 的 work5+work610、ON/SK 的 language2 卡的都是这一条)。
 *
 * @param input 因素名。
 * @returns 那一槽的名字;这个因素不在可答清单里则 null。
 */
function askableSlot(input: AskableSlotIn): AskableSlotOut {
  for (const [factor, slot] of Object.entries(ASKABLE_FACTORS)) {
    if (factor === input.name) return slot
  }
  return null
}

/**
 * 挑出这一省能喂出来的因素,并把「用户直选的档位」定死成 override。
 *
 * 用户直选的官方档位 → override(2026-08-16「先解决 BC」):与分值卡客户端同一套口径。
 * 先前这里是「喂不出就整省不接」,可用户在页面上明明答了 —— 只是从没上行过。
 *
 * 一个因素四种下场:官方表里没有档位行 ⇒ 纯规则的(时薪)按规则算,其余是纯加分项 ⇒ 不勾=0
 * 并标下界(与打分卡默认同口径);offer ⇒ 他没答就整省不接;他自己答过的 ⇒ 交给 AUTO_PICK
 * 按官方档位匹配;档案推得出的 ⇒ 同上;都不是 ⇒ 认他直选的那一行,他也没答就整省不接(**不猜**)。
 *
 * @param input 该省的全量分值行、档案与通道声明。
 * @returns 定死的那几格、要交给官方档位匹配的那几个,与「是不是下界」;整省不接则 undefined。
 */
function pickGridFactors(input: PickGridFactorsIn): PickGridFactorsOut {
  const only = new Set<string>()
  const picked: Record<string, PickedFactor> = {}
  const areaRows: ScoreRow[] = []
  for (const f of input.all) if (f.factor === SCORE_FACTOR.area && f.kind === FACTOR_ROW) areaRows.push(f)
  let partial = false
  for (const name of factorNames({ all: input.all })) {
    let hasRows = false
    for (const f of input.all) if (f.factor === name && f.kind === FACTOR_ROW) { hasRows = true; break }
    if (!hasRows) {
      let rule: ScoreRow | null = null
      for (const f of input.all) if (f.factor === name && f.kind === KIND_RULE) { rule = f; break }
      if (name === SCORE_FACTOR.wage && rule && input.p.wage != null) {
        const pts = wagePoints({ rule: rule, wage: input.p.wage })
        picked[name] = { pts, matched: `${SEP.dollar}${input.p.wage}${SEP.perHour}`, source: FACTOR.job }
        continue
      }
      partial = true
      continue
    }
    if (name === SCORE_FACTOR.offer) { if (input.p.hasOffer == null) return undefined; continue }
    const slot = askableSlot({ name: name })
    if (slot && input.p.scoreProfile?.[slot] != null) { only.add(name); continue }
    if (!GRID_AUTO_FACTORS.has(name)) {
      const row = gridRowFor({ all: input.all, areaRows: areaRows, p: input.p, spec: input.spec, name: name })
      if (!row) return undefined
      picked[name] = { pts: row.points ?? 0, matched: row.label, source: FACTOR.job }
      continue
    }
    only.add(name)
  }
  if (!only.size) return undefined
  for (const f of input.all) {
    if (f.kind !== FACTOR.bonus) continue
    partial = true
    break
  }
  return { picked: picked, only: only, partial: partial }
}

/**
 * 上界:语言拉到官方最高档 + 加分项**全部按满分**(官方档位自己封顶)。
 *
 * 少算加分项的「上界」是假上界,拿它判分数鸿沟会把够得着的人判死 —— 那正是四态口径最忌的那种错。
 *
 * @param input 该省的全量分值行、通道声明、下界那份档案,与定死的那几格。
 * @returns 上界分;算不出则 null。
 */
function gridCeiling(input: GridCeilingIn): GridCeilingOut {
  const langLabels: string[] = []
  for (const f of input.all) if (f.factor === FACTOR.language && f.kind === FACTOR_ROW) langLabels.push(f.label)
  const maxClb = maxClbIn({ labels: langLabels })
  const ticks: Record<string, boolean> = {}
  const seen = new Map<string, number>()
  for (const f of input.all) {
    if (f.kind !== FACTOR.bonus) continue
    const i = seen.get(f.factor) ?? 0
    ticks[`${input.spec.reqProvince}${SEP.colon}${f.factor}${SEP.colon}${i}`] = true
    seen.set(f.factor, i + 1)
  }
  const topSelf: GridProfile = {
    edu: input.self.edu, expRecent: input.self.expRecent, expOlder: input.self.expOlder,
    clb1: maxClb ?? input.self.clb1, clb2: input.self.clb2, age: input.self.age,
  }
  const top = scoreProvince({
    factors: input.factors, province: input.spec.reqProvince, profile: topSelf,
    overrides: mergeOverrides({
      base: offerOverride({ row: input.offerRow, has: true }), extra: input.picked,
    }),
    ticks: ticks, only: input.only,
  })
  return top ? top.total : null
}

/**
 * 档案 → `SelfProfile`(官方分值表那头认的形状)。
 *
 * 经验只喂**总量**(近 5 年 / 6-10 年前那种拆分本站没问,拆了就是编;需要拆分的省在
 * `GRID_AUTO_FACTORS` 那里就被挡掉了)。第二官方语言同理:没有这一槽 → 按不加分算。
 *
 * 用户在分值卡上**真答过**的那几格盖住档案推导值 —— 拆分经验、第二语言这类档案给不出的,
 * 他自己答了就该算数。
 *
 * @param input 判定档案。
 * @returns 喂给 scoreProvince 的那份档案。
 */
function gridSelfProfile(input: GridSelfProfileIn): GridSelfProfileOut {
  const months = (input.p.expCanadaMonths ?? 0) + (input.p.expForeignMonths ?? 0)
  const answered = input.p.scoreProfile
  const self: GridProfile = {
    edu: answered?.edu ?? ((input.p.edu ?? 'highschool') as EduBand),
    expRecent: answered?.expRecent ?? months / MONTHS_PER_YEAR,
    expOlder: answered?.expOlder ?? 0,
    clb1: answered?.clb1 ?? (input.p.clb ?? 0),
    clb2: answered?.clb2 ?? 0,
    age: answered?.age ?? (input.p.age ?? 0),
  }
  return self
}

/**
 * 这张官方分值表是不是**这条线**的。
 *
 * 表自报了通道名就得对得上:NL 那张自报是 EE Skilled Worker 的表,不许挂到国际毕业生上。
 * 没自报通道名的表一律认(多数省的表就一张,不分线)。
 *
 * @param input 表头那一行与要判的通道。
 * @returns 对得上则 true。
 */
function gridMatchesStream(input: GridMatchesStreamIn): GridMatchesStreamOut {
  const gridStream = gridStreamOf(input.head.system)
  return !gridStream || streamMatches({ drawStream: gridStream, gridStream: input.spec.stream })
}

/**
 * 官方表要的必需槽,他答齐了没有。
 *
 * 缺一个就不给分(**宁缺不编**)—— 未答项在 `pickByThreshold` 那里会被兜到最低档白捡分,
 * 那样算出来的是假分。
 *
 * @param input 要交给官方档位匹配的那几个因素名,与判定档案。
 * @returns 答齐了则 true。
 */
function hasRequiredSlots(input: HasRequiredSlotsIn): HasRequiredSlotsOut {
  if (input.only.has(FACTOR.education) && input.p.edu == null) return false
  if (input.only.has(FACTOR.language) && input.p.clb == null) return false
  if (input.only.has(FACTOR.age) && input.p.age == null) return false
  const wantsExp = input.only.has(FACTOR.work) || input.only.has(FACTOR.workMonths)
  return !(wantsExp && (input.p.expCanadaMonths == null || input.p.expForeignMonths == null))
}

/**
 * 用户勾过的加分项里,只取**本省**的那些键。
 *
 * 别省的勾进来会被 `scoreProvince` 忽略,但先滤一道免得越界。
 *
 * @param input 判定档案与本省省码。
 * @returns 本省的勾选表。
 */
function ownTicksOf(input: OwnTicksOfIn): OwnTicksOfOut {
  const ownTicks: Record<string, boolean> = {}
  const prefix = `${input.province}${SEP.colon}`
  for (const [k, v] of Object.entries(input.p.scoreTicks ?? {})) if (v && k.startsWith(prefix)) ownTicks[k] = true
  return ownTicks
}

/**
 * 通用省估分。接不上(库里没表 / 表不是这条线的 / 有必答档位映射不出 / 档案缺必需槽)一律 undefined。
 *
 * CRS(联邦)与 MPNP(曼省)各有专用估分器;其余省的官方分值表 pnp_score_factors 里也躺着
 * (AB/BC/NL/ON/SK 六省 222 行),`/pathways` 打分卡早就在用 —— 但那张卡是**人肉勾**出来的:
 * 时薪、岗位地区、亲属在本省这些格子由用户自己填。判定层手上只有一份档案,填不出那些格子。
 *
 * 🔴 所以这里的门槛定得很硬:**该省官方表里每一条 `kind=FACTOR_ROW`(必答档位)的因素都要能从档案
 *    无损映射出来**,少一条就整省不接 —— 缺的那块不是「按 0 算」能糊过去的,它会把分算成假的。
 *    加分项(`kind=FACTOR.bonus`,用户自己勾的那些)按已上线打分卡的默认口径记 0,并把 `partial` 打上:
 *    value 是**下界**,ceiling 才是把加分项全按满分算出来的**真上界**(下界不许拿去判「够不着线」,
 *    上界才准 —— scoreGulf 这条硬伤判据靠的正是上界)。
 * 🔴 分值一分不许编:全部来自 scoreProvince 挑中的官方行,本文件只负责「档案怎么喂进去」。
 *
 * 眼下真接得上的只有 AB(AAIP Worker EOI):
 *   ON 的必答档位有 岗位 TEER/职业类别/时薪/安省经验/年收入/身份/加拿大学历/地区 八块,档案答不出;
 *   BC 的 SIRS 200 分里时薪 55 + 地区 25 来自**岗位**,判定层没有岗位;
 *   SK/NL 把经验拆成「近 5 年 / 6-10 年前」两档,本站只问了总月数,拆出来就是编;
 *   NL 那张表还自报是 Express Entry Skilled Worker 那条线的,与本站注册的国际毕业生不是同一条。
 * 这几条如实不接,不拿半张表凑一个数出来。
 *
 * 🔵 `refStream` 报的是**挑中的那一轮属于哪条通道**(2026-08-16 Frank「我的职业是 it 有必要
 * 对比 其他通道的 分数吗」):BC 现行按通道分别设线,拿 Care 的线去比一个 IT 的分是错的对照 ——
 * 展示层据此只列同通道的轮次。
 *
 * @param input 通道声明、档案、全量分值行与参照抽选。
 * @returns 估分(含上界与参照线);接不上则 undefined。
 */
function provinceGridScore(input: ProvinceGridScoreIn): ProvinceGridScoreOut {
  const all: ScoreRow[] = []
  for (const f of input.factors) if (f.province === input.spec.reqProvince) all.push(f)
  if (!all.length) return undefined
  const head = all[0]
  if (!gridMatchesStream({ head: head, spec: input.spec })) return undefined

  const grid = pickGridFactors({ all: all, p: input.p, spec: input.spec })
  if (!grid) return undefined
  const picked = grid.picked
  const only = grid.only
  const partial = grid.partial

  if (!hasRequiredSlots({ only: only, p: input.p })) return undefined

  const self = gridSelfProfile({ p: input.p })
  let offerRow: ScoreRow | null = null
  for (const f of all) if (f.factor === SCORE_FACTOR.offer && f.kind === FACTOR_ROW) { offerRow = f; break }

  const ownTicks = ownTicksOf({ p: input.p, province: input.spec.reqProvince })
  const now = scoreProvince({
    factors: input.factors, province: input.spec.reqProvince, profile: self,
    overrides: mergeOverrides({
      base: offerOverride({ row: offerRow, has: input.p.hasOffer === true }), extra: picked,
    }),
    ticks: ownTicks, only: only,
  })
  if (!now) return undefined
  const ceiling = gridCeiling({
    all: all, factors: input.factors, spec: input.spec, self: self, offerRow: offerRow,
    picked: picked, only: only,
  })

  return {
    system: head.system, value: now.total, ceiling: ceiling,
    refLine: input.draw?.score ?? null,
    refStream: input.draw?.stream ?? null,
    refLabel: input.draw
      ? `${PV_TEXT.gridRefHead}${input.draw.stream}${SEP.parenL}${input.draw.drawDate}${SEP.parenR}`
      : PV_TEXT.gridRefNone,
    evidence: evOfFactor({ f: head }),
    partial: partial ? true : undefined,
  }
}

/**
 * 本站学历档 → MPNP EOI 的学历档。
 *
 * 2/3 年制那两档还要看年数:问得到就按年数重挑,问不到才落 `EDU_TO_MB` 给的默认。
 *
 * @param input 学历档与学制年数。
 * @returns MPNP 认的学历档。
 */
function mbEduOf(input: MbEduOfIn): MbEduOfOut {
  if (input.edu === EDU.diploma2y || input.edu === EDU.bachelor) {
    if (input.years == null) return EDU_TO_MB[input.edu]
    if (input.years >= MB_EDU_YEARS.threeYear) return MB_EDU.oneProgram3yPlus
    return input.years >= MB_EDU_YEARS.twoYear ? MB_EDU.oneProgram2y : MB_EDU.oneYearProgram
  }
  return EDU_TO_MB[input.edu]
}

/**
 * MPNP EOI 档案映射。workMonths 传的是「门槛达成态」(见 `mbScore`),不是今天的月数。
 *
 * 三格写死,各有各的理由:`secondLangClb5Plus` 与 `employerLicenseRecognized` 档案里**没有这一槽**
 * —— 不猜,按不加分算;`adapt.demand` 恒 true 是因为 SWM 的门槛本身就是「曼省持续就业 + 长期 offer」,
 * 达标即触发该档。
 *
 * @param input 判定档案、语言档与门槛达成态。
 * @returns MPNP EOI 估分器要的那份档案。
 */
function mbProfileOf(input: MbProfileOfIn): MbProfileOfOut {
  return {
    clb: input.clb,
    secondLangClb5Plus: false,
    age: input.p.age as number,
    workMonthsSameOcc: input.workMonths,
    employerLicenseRecognized: false,
    edu: mbEduOf({ edu: input.p.edu as EduBand, years: input.p.eduYears }),
    adapt: {
      demand: true,
      closeRelative: false, priorMbWork6moPlus: false,
      mbEduYears: input.p.canadaStudy === true && input.p.studyProvince === PROV.MB ? ((input.p.eduYears ?? 0) >= MB_ADAPT_EDU_YEARS ? MB_ADAPT_EDU_YEARS : 1) : 0,
      closeFriendOrDistantRelative: false, regionalOutsideWinnipeg: false,
    },
    riskForeignWork: (input.p.expCanadaMonths ?? 0) > 0 && input.p.province !== PROV.MB,
    riskForeignStudy: input.p.canadaStudy === true && input.p.studyProvince != null && input.p.studyProvince !== PROV.MB,
  }
}

/**
 * 判定档案 → `lib/rules` 的判定引擎认的那份档案。
 *
 * 只做字段映射,一个判定都不做 —— 判定是 `evaluateRequirements` 的活,本域不重写它。
 *
 * @param input 判定档案与已经算好的可计经验月数。
 * @returns 判定引擎认的档案。
 */
function ruleProfileOf(input: RuleProfileOfIn): RuleProfileOfOut {
  return {
    noc: input.p.noc ?? undefined,
    teer: input.p.teer,
    clb: input.p.clb,
    canadianExpMonths: input.p.expCanadaMonths,
    totalExpMonths: input.total,
    familySize: null,
    annualIncome: null,
    incomeIsOccMedian: false,
    area: null,
  }
}

/**
 * 联邦三子通道的语言行:appliesTeer 是空的,TEER 档写在 stream 键里(teer-0-1 / teer-2-3 / teer-0-3 / teer-4)。
 *
 * 🔴 `teer-a-b` 是**闭区间**,不是两个端点的枚举(2026-08-09 批C 实证的 bug):
 *    CEC/FSW 的 teer-0-1 / teer-2-3 恰好端点=全集,当枚举读从没炸过;批B 灌进 AIP 的
 *    teer-0-3(CLB 5)/ teer-2-4 后,TEER 1 与 TEER 2 的 job offer **一条语言门槛行都挑不到**,
 *    上游 langRowsSeen=0 于是输出「本站尚未收录 AIP 的语言门槛条文」—— 库里明明有,这是一句假话。
 *    改法:恰好两个数字 = 闭区间展开(两元枚举形态天然兼容,既有判定零变化);
 *    三个及以上数字仍按枚举读(库里目前没有这种写法,不为它猜区间语义)。
 *
 * @param input 一行联邦语言门槛条文与档案的 TEER。
 * @returns 这一行适不适用于该 TEER ——
 *   认不出 `teer-x-y` 这个形状的行(first-official / speaking-listening / reading-writing)
 *   是**该子通道通用**,一律适用。
 */
function fedLangApplies(input: FedLangAppliesIn): FedLangAppliesOut {
  const m = TEER_STREAM.exec(input.r.stream || '')
  if (!m) return true
  if (input.teer == null) return false
  const [, spec] = m
  const parts = spec.split(SEP.hyphen).map(Number)
  if (parts.length === TEER_RANGE_PARTS) {
    const [first, second] = parts
    return input.teer >= Math.min(first, second) && input.teer <= Math.max(first, second)
  }
  return parts.includes(input.teer)
}

/**
 * 专业对口这道闸的答案。
 *
 * 答「对口」即达标;答「不对口」时看该通道给不给本省院校的例外
 * (NL:Memorial/CNA 毕业生 + 岗位 TEER 0-3 可不对口;TEER 4/5 要对紧缺清单 → 判不了)。
 *
 * @param input 判定档案与通道 key。
 * @returns 达标 / 不达标;判不了则 null ——
 *   答了对口(或压根没答)⇒ 原样回;答不对口时:没有例外条款 ⇒ 不对口就是缺口;
 *   不知道在哪读的书、或不知道 TEER ⇒ 判不了;省外院校 ⇒ 不达标(官方明写要**直接**相关)。
 */
function fieldMatchAnswer(input: FieldMatchAnswerIn): FieldMatchAnswerOut {
  if (input.p.fieldMatch !== false) return input.p.fieldMatch
  const ex = fieldMatchExemptionOf(input.specKey)
  if (!ex) return false
  if (input.p.studyProvince == null) return null
  if (input.p.studyProvince !== ex.studyProvince) return false
  return input.p.teer == null ? null : (ex.teers.includes(input.p.teer) ? true : null)
}

/**
 * 「境内身份」这道闸按 asks 取答案(2026-08-15 拆闸)。
 *
 * 「境内身份」底下其实是三种官方要求,inCanada 只答得了「人在不在加拿大」—— 拿它过工签闸,
 * 学签在读全被 AB/PE 放行;拿它过 NB/MB 的「住在/受雇于该省」,安省居民照样被放行。
 * 境外(inCanada=false)四种问法都是「没有」。
 *
 * 🔴 **许可只认许可题的答案**(2026-08-16 Frank「这个上面的问题也没问,你是否有工签啊?」):
 * 先前由处境推(在读→学签、在工作→有工签),推出来的却是「差工签/已达标」这种结论性判定 ——
 * 两个方向都是没问就替他认定。境内一律问那道题(fields.permitBand 同日改成 inCanada),没答 = 判不了。
 *
 * @param input 这道闸问哪一样、判定档案、本省省码。
 * @returns 有 / 没有;判不了则 null ——
 *   没标注 asks ⇒ 走旧口径看 inCanada;要 PGWP 时封闭/开放工签都不许充数;
 *   要「受雇于本省」时,处境明说在工作 ⇒ 有,明说读书/找工作 ⇒ 没有,
 *   说不清(pgwp / 没答)⇒ 看本省在职月数(tenure 口径本来就只认本省攒的):
 *   攒过 = 在职过、0 = 没受雇过、没答 = 判不了。
 */
function statusGateAnswer(input: StatusGateAnswerIn): StatusGateAnswerOut {
  const asks = input.asks
  if (!asks) return input.p.inCanada
  if (input.p.inCanada === false) return false
  const permit = input.p.permit
  switch (asks) {
    case GATE_ASK.workPermit:
      return permit ? permit === PERMIT.pgwp || permit === PERMIT.work : null
    case PERMIT.pgwp:
      return permit ? permit === PERMIT.pgwp : null
    case GATE_ASK.provResidence:
      return input.p.province == null ? null : input.p.province === input.reqProvince
    case GATE_ASK.provEmployment: {
      if (input.p.province == null) return null
      if (input.p.province !== input.reqProvince) return false
      if (input.p.status === STATUS.worker) return true
      if (input.p.status === PERMIT.study || input.p.status === STATUS.other) return false
      return input.p.expCanadaMonths == null ? null : input.p.expCanadaMonths > 0
    }
  }
}

/**
 * 一道闸某个状态的 i18n key —— 判的是工签就说工签,不再统称「境内身份」(文案跟判据必须对得上)。
 *
 * @param input 闸名、问哪一样、状态。
 * @returns 那一句的 i18n key。
 */
function gateKeyOf(input: GateKeyOfIn): GateKeyOfOut {
  return `${KEY_PREFIX.gate}${input.gate}${input.asks ? `${SEP.dot}${input.asks}` : ''}${SEP.dot}${input.state}`
}

/**
 * 明文要求「必须在清单上」的通道(PE 的 Occupations in Demand 子通道)。
 *
 * 🔴 **只关这个子通道,不关整条线**:PE-sw 装的是「Skilled Worker / Occupations in Demand」两个
 * 子通道,官方原句写得很清楚 ——「the Occupations in Demand stream requires only 12 months,
 * but is limited to its named NOC list」。Skilled Worker 那条走的是 TEER 0-3 + 24 个月,与清单无关。
 * 先前不分档:一个 TEER 3 的 PE 岗、三类闸全达标、经验也够,只因为不在那 8 个 NOC 里就整条判
 * excluded。判据用**门槛行自己的 appliesTeer**(不写死 0-3):清单外的 TEER 有别的子通道收,
 * 就不许拿清单判死。
 *
 * @param input 通道声明、档案、六张底表与该通道的门槛行。
 * @returns 判死时的那一条理由与 `listExcluded`;不适用则空。
 *   没答职业时也走「不适用」—— 这条**判不了**,不拿它判死。
 */
function listRequiredReason(input: ListRequiredReasonIn): ListRequiredReasonOut {
  const reasons: VerdictReason[] = []
  let listExcluded = false
  const noc = input.p.noc
  if (!noc) return { reasons: reasons, listExcluded: listExcluded }
  let listTeerCovered = false
  if (input.spec.listRequired) {
    for (const r of input.rows) {
      if (r.subject !== SUBJECT.applicant || r.factor !== FACTOR.experience) continue
      if (!r.appliesTeer || !teerHit({ r: r, teer: input.p.teer })) continue
      listTeerCovered = true
      break
    }
  }
  if (input.spec.listRequired && !listTeerCovered) {
    const required = input.spec.listRequired
    const list: OccupationRow[] = []
    for (const o of input.data.occupations) {
      if (o.province !== required.province || o.type !== INDEMAND) continue
      if (!required.streamRe.test(o.stream)) continue
      list.push(o)
    }
    let onList = false
    for (const o of list) if (o.noc === noc) { onList = true; break }
    if (list.length && !onList) {
      listExcluded = true
      let anchor: ReqRow = input.rows[0]
      for (const r of input.rows) if (r.factor === FACTOR.experience) { anchor = r; break }
      reasons.push({
        kind: REASON.excluded,
        text: `${noc}${PV_TEXT.notOnListMid}${list[0].stream}${PV_TEXT.oidClosedTail}`,
        key: PV_KEY.occNotOnList, params: { noc: noc, stream: list[0].stream },
        quote: quoteOfReq({ r: anchor }),
        evidence: evOfReq({ r: anchor }),
      })
    }
  }
  return { reasons: reasons, listExcluded: listExcluded }
}

/**
 * ① 职业清单:排除清单命中 = 硬伤;定向/在需清单只是信号(**不在清单 ≠ 不合格**),
 * 除非该通道明文要求在清单(PE OID)。
 *
 * `appliesTo` 先过滤:SK 那 152 条只服务 OID/EE 子类,管不着 Employment Offer。
 * 引的 quote 全部来自数据行字段(stream / noc / name),**没有一个字是手写的**。
 *
 * @param input 通道声明、档案、六张底表与该通道的门槛行。
 * @returns 清单类的理由、缺的槽,以及「有没有被清单判死」。
 */
function occupationListReasons(input: OccupationListReasonsIn): OccupationListReasonsOut {
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []
  let listExcluded = false
  if (input.p.noc) {
    const ineligible: OccupationRow[] = []
    for (const o of input.data.occupations) {
      if (o.province !== input.spec.reqProvince || o.type !== OCC_INELIGIBLE || o.noc !== input.p.noc) continue
      if (o.appliesTo && o.appliesTo.toLowerCase().includes(APPLIES_OFFER)
        !== EMPLOYMENT_OFFER_STREAM.test(input.spec.stream)) continue
      ineligible.push(o)
    }
    for (const o of ineligible) {
      listExcluded = true
      reasons.push({
        kind: REASON.excluded,
        text: `${input.p.noc}${PV_TEXT.onListMid}${o.stream}${PV_TEXT.ineligibleTail}`,
        key: PV_KEY.occIneligible, params: { noc: input.p.noc, stream: o.stream },
        quote: `${o.stream}${SEP.spacedDash}${o.noc} ${o.name}`,
        evidence: evOfOcc({ r: o }),
      })
    }
    const indemand: OccupationRow[] = []
    for (const o of input.data.occupations) {
      if (o.province !== input.spec.reqProvince || o.type !== INDEMAND || o.noc !== input.p.noc) continue
      indemand.push(o)
    }
    for (const o of indemand) {
      reasons.push({
        kind: REASON.met, text: `${input.p.noc} ${o.name}${PV_TEXT.onListMid}${o.stream}${PV_TEXT.listedTail}`,
        key: PV_KEY.occListed, params: { noc: input.p.noc, name: o.name, stream: o.stream }, evidence: evOfOcc({ r: o }),
      })
    }
    const must = listRequiredReason({
      spec: input.spec, p: input.p, data: input.data, rows: input.rows,
    })
    for (const one of must.reasons) reasons.push(one)
    if (must.listExcluded) listExcluded = true
  } else {
    missingSlots.push(SLOT.noc)
  }
  return { reasons: reasons, missingSlots: missingSlots, listExcluded: listExcluded }
}

/**
 * 联邦三子通道(CEC/FSW/FST)各自一套语言行,逐条摆。
 *
 * 一条都没摆出来 = 本站还没收录这条线的语言门槛条文。
 *
 * @param input 通道声明、档案与该通道的门槛行。
 * @returns 语言类的理由、缺的槽,以及被语言卡住时的 blockedBy。
 */
function fedLanguageReasons(input: FedLanguageReasonsIn): FedLanguageReasonsOut {
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []
  let blockedBy: BlockedBy
  let langRowsSeen = 0
  for (const prog of input.spec.reqPrograms ?? []) {
    for (const r of input.rows) {
      if (r.program !== prog || r.factor !== FACTOR.language) continue
      if (!fedLangApplies({ r: r, teer: input.p.teer })) continue
      langRowsSeen += 1
      if (input.p.clb == null) { missingSlots.push(SLOT.clb); continue }
      const ok = r.value == null || input.p.clb >= r.value
      if (!ok) blockedBy = blockedBy ?? FACTOR.language
      reasons.push({
        kind: ok ? REASON.met : REASON.gap,
        text: `${prog}${PV_TEXT.fedLangMid}${r.value}${ok ? PV_TEXT.metTail : `${PV_TEXT.shortBy}${(r.value as number) - (input.p.clb as number)}${PV_TEXT.bands}`}`,
        key: ok ? PV_KEY.fedLangOk : PV_KEY.fedLangGap,
        params: { prog, clb: r.value ?? 0, short: ok ? 0 : (r.value as number) - (input.p.clb as number) },
        quote: quoteOfReq({ r: r }), evidence: evOfReq({ r: r }),
      })
    }
  }
  if (!langRowsSeen) {
    reasons.push({ kind: REASON.needsInfo, text: `${PV_TEXT.notCollectedHead}${input.spec.stream}${PV_TEXT.langReqTail}`,
      key: PV_KEY.noLangReq, params: { stream: input.spec.stream } })
  }
  return { reasons: reasons, missingSlots: missingSlots, blockedBy: blockedBy }
}

/**
 * 省提名的语言门槛:整条交给 `lib/rules` 的判定引擎,本域只负责摆句子。
 *
 * 措辞口径(2026-08-11 Frank 定):说「不要语言成绩」,**不说**「官方明说这一档不要求语言成绩」——
 * 官方原句就挂在这条下面,前缀与解释是说给自己听的。经验门槛那条同理。
 *
 * @param input 通道声明、档案、该通道的门槛行与「自雇是否被排除」。
 * @returns 语言类的理由、缺的槽,以及被语言卡住时的 blockedBy。
 */
function pnpLanguageReasons(input: PnpLanguageReasonsIn): PnpLanguageReasonsOut {
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []
  let blockedBy: BlockedBy
  const langRows: ReqRow[] = []
  for (const r of input.rows) if (r.subject === SUBJECT.applicant) langRows.push(r)
  const results: EngineResult[] = evaluateRequirements({
    reqs: langRows,
    profile: ruleProfileOf({
      p: input.p,
      total: countableMonths({ spec: input.spec, p: input.p, selfEmpExcluded: input.selfEmpExcluded }),
    }),
  })
  let lang: EngineResult | null = null
  for (const r of results) if (r.factor === FACTOR.language) { lang = r; break }
  if (lang) {
    if (lang.verdict === ITEM.unknown) {
      missingSlots.push(SLOT.clb)
      reasons.push({ kind: REASON.needsInfo, text: PV_TEXT.langUnknown, key: PV_KEY.langUnknown, evidence: lang.evidence })
    } else if (lang.verdict === ITEM.pass) {
      reasons.push({
        kind: REASON.met,
        text: lang.need == null ? PV_TEXT.noLangScore : `${PV_TEXT.langReqHead}${lang.need}${PV_TEXT.metTail}`,
        key: lang.need == null ? PV_KEY.langNone : PV_KEY.langOk, params: { clb: lang.need ?? 0 },
        quote: lang.evidence.label, evidence: lang.evidence,
      })
    } else {
      blockedBy = blockedBy ?? FACTOR.language
      reasons.push({
        kind: REASON.gap, text: `${PV_TEXT.langReqHead}${lang.need}${PV_TEXT.shortBy}${lang.short}${PV_TEXT.bands}`,
        key: PV_KEY.langGap, params: { clb: lang.need ?? 0, short: lang.short ?? 0 },
        quote: lang.evidence.label, evidence: lang.evidence,
      })
    }
  } else {
    reasons.push({ kind: REASON.needsInfo, text: `${PV_TEXT.notCollectedHead}${input.spec.stream}${PV_TEXT.langReqSoftTail}`,
      key: PV_KEY.noLangReqSoft, params: { stream: input.spec.stream } })
  }
  return { reasons: reasons, missingSlots: missingSlots, blockedBy: blockedBy }
}

/**
 * ② 语言门槛:联邦逐条摆子通道的行,省提名走判定引擎 —— 两边各自成句,这里只分流。
 *
 * @param input 通道声明、档案、该通道的门槛行与「自雇是否被排除」。
 * @returns 语言类的理由、缺的槽,以及被语言卡住时的 blockedBy。
 */
function languageReasons(input: LanguageReasonsIn): LanguageReasonsOut {
  if (input.spec.reqPrograms) {
    return fedLanguageReasons({ spec: input.spec, p: input.p, rows: input.rows })
  }
  return pnpLanguageReasons({
    spec: input.spec, p: input.p, rows: input.rows, selfEmpExcluded: input.selfEmpExcluded,
  })
}

/**
 * ③ 经验 / 居住(可积累项,决定 tier)。
 *
 * 缺槽判不出 gap 时,把 need 记进 gaps —— needs-info 的 tier 因此是「最坏情况的上界」
 * (按 0 经验 / 0 居住算)。这就是 §4.5 说的 **tier 潜力**:NL(need=0)最坏也是 tier0,
 * ON(3-6 月)最坏 tier1 —— 排序按它,缺槽的通道才不会全挤成一堆无差别的 0。
 * 每个缺口记下**它是哪一类**:经验/在职类的等待要等到「毕业拿到工签之后」才开始走(tierBasis,#319),
 * 居住类不用 —— 搬过去当天就在计时。只记一个 max 数字时这个区别丢了,前端只能一律读成「从今天起算」。
 *
 * @param input 通道声明、档案、该通道的门槛行与经验闸的评估。
 * @returns 缺口清单、缺的槽、命中的居住门槛行,以及「本站尚未收录经验门槛」那条理由 ——
 *   行在库里、只是不知道他哪一档 TEER 时,点名让他补职业,**不许说成本站没收录**。
 */
function experienceGaps(input: ExperienceGapsIn): ExperienceGapsOut {
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []
  const gaps: TierGap[] = []
  if (!input.gate.picked && !input.gate.teerUnknown) {
    reasons.push({ kind: REASON.needsInfo, text: `${PV_TEXT.notCollectedHead}${input.spec.stream}${PV_TEXT.expReqTail}`,
      key: PV_KEY.noExpReq, params: { stream: input.spec.stream } })
  }
  if (input.gate.teerUnknown) missingSlots.push(SLOT.noc)
  if (input.gate.gap != null) gaps.push({ months: input.gate.gap, kind: FACTOR.work })
  else if (input.gate.need != null) gaps.push({ months: input.gate.need, kind: FACTOR.work })
  if (input.gate.have == null && input.gate.picked && input.gate.need !== 0) missingSlots.push(SLOT.expCanadaMonths)
  const res = residenceGap({ spec: input.spec, rows: input.rows, p: input.p })
  if (res) {
    if (res.gap != null) gaps.push({ months: res.gap, kind: FACTOR.residence })
    else { gaps.push({ months: res.need, kind: FACTOR.residence }); missingSlots.push(SLOT.province) }
  }
  return { reasons: reasons, missingSlots: missingSlots, gaps: gaps, res: res }
}

/**
 * ③b 省外院校毕业生的额外在职门槛(#317)。
 *
 * 官方并列条款:本省院校毕业生走 op=PERMIT.none(不设经验门槛),**省外**院校毕业生要先在本省
 * 干满 N 个月。条件判不了(没答学历省/有没有加拿大学历)→ 判不了,不猜;条件不成立(本省毕业)
 * → 这条不适用。
 *
 * 已攒月数量的是「在本省全职在职多久」,与 `employerTenure` 同一把尺子:别省攒的经验对本省记 0。
 *
 * @param input 通道声明与档案。
 * @returns 这一档的缺口、缺的槽,以及 ⑤ 摆句子要用的三样(条款、条件成立与否、已攒月数)。
 */
function outOfProvinceGradGap(input: OutOfProvinceGradGapIn): OutOfProvinceGradGapOut {
  const missingSlots: string[] = []
  const gaps: TierGap[] = []
  let oopHave: number | null = null
  const oop = input.spec.outOfProvinceGrad
  const oopHolds = oop ? conditionHolds({ cond: CONDITION.gradOtherProvince, p: input.p, province: input.spec.reqProvince }) : false
  if (oop && oopHolds) {
    oopHave = input.p.expCanadaMonths == null ? null
      : input.p.expCanadaMonths === 0 ? 0
        : input.p.province === input.spec.reqProvince ? input.p.expCanadaMonths : 0
    gaps.push({ months: oopHave == null ? oop.months : Math.max(0, oop.months - oopHave), kind: FACTOR.work })
    if (oopHave == null) missingSlots.push(SLOT.expCanadaMonths)
  }
  if (oop && oopHolds === null) missingSlots.push(SLOT.studyProvince)
  return { missingSlots: missingSlots, gaps: gaps, oop: oop, oopHolds: oopHolds, oopHave: oopHave }
}

/**
 * 联邦 CRS 估分:档案齐了才算,缺一格一律 undefined(不编)。
 *
 * 自雇经验多数通道不计 —— 上游把 `expForeignMonths` 折成 0 的那套口径,这里照用。
 *
 * @param input 通道声明、档案、六张底表、参照的那一轮,与「自雇是否被排除」。
 * @returns CRS 估分;不是这条线或档案缺格则 undefined。
 */
function crsScore(input: CrsScoreIn): CrsScoreOut {
  if (input.spec.scorer !== GRID.crs) return undefined
  if (input.p.age == null || input.p.clb == null || input.p.edu == null) return undefined
  const crsProfile: CrsProfile = {
    age: input.p.age, married: input.p.married, clb: input.p.clb, edu: input.p.edu, eduYears: input.p.eduYears,
    canadaStudy: input.p.canadaStudy,
    expCanadaMonths: input.p.expCanadaMonths,
    expForeignMonths: input.selfEmpExcluded && input.p.foreignExpSelfEmployed === true ? 0 : input.p.expForeignMonths,
  }
  const now = estimateCrs({ profile: crsProfile, rows: input.data.eeGrid })
  const crsLangLabels: string[] = []
  for (const r of input.data.eeGrid) {
    if (r.grid !== GRID.crs || !FIRST_OFFICIAL_LANGUAGE.test(r.heading)) continue
    crsLangLabels.push(r.criterion)
  }
  const maxClb = maxClbIn({ labels: crsLangLabels })
  const ceilProfile: CrsProfile | null = maxClb == null ? null : {
    age: crsProfile.age, married: crsProfile.married, clb: maxClb, edu: crsProfile.edu,
    eduYears: crsProfile.eduYears, canadaStudy: crsProfile.canadaStudy,
    expCanadaMonths: crsProfile.expCanadaMonths, expForeignMonths: crsProfile.expForeignMonths,
  }
  const ceil = ceilProfile == null ? null
    : estimateCrs({ profile: ceilProfile, rows: input.data.eeGrid }).total
  let head: EeRow | null = null
  for (const r of input.data.eeGrid) if (r.grid === GRID.crs) { head = r; break }
  const score: PathwayScore = {
    system: GRID.crs, value: now.total, ceiling: ceil,
    refLine: input.draw?.score ?? null,
    refLabel: input.draw ? `${PV_TEXT.latestDrawHead}${input.draw.stream}${SEP.parenL}${input.draw.drawDate}${SEP.comma}${input.draw.invitations ?? SEP.emDash}${PV_TEXT.peopleTail}` : PV_TEXT.noRefLine,
    evidence: head ? { url: head.url, fetched: head.fetched, label: CRS_GRID_LABEL } : { url: '', fetched: '' },
  }
  return score
}

/**
 * MPNP 的三条 warning(C01 §二曼省节):外省学习 −100 / 再叠外省工作 −100 / 天花板与抽选线对照。
 *
 * 🔴 抽选那串会当**参数**进三语句子,分隔符必须是语言中立的半角符号:原来用「、」和「·」,
 * 英文态就成了「632(2026-07-30 · Draw #276)、825(…)」这种半中半英(2026-08-11 生产实拍)。
 *
 * @param input 档案、六张底表、门槛达成态的月数,与已经算出的估分与上界。
 * @returns 这三条里成立的那几条。
 */
function mbWarnings(input: MbWarningsIn): MbWarningsOut {
  const reasons: VerdictReason[] = []
  let studyRow: ScoreRow | null = null
  let workRow: ScoreRow | null = null
  for (const f of input.data.scoreFactors) {
    if (f.province !== PROV.MB || f.factor !== SCORE_FACTOR.risk || f.kind !== FACTOR.bonus) continue
    if (studyRow == null && MB_RISK_STUDY.test(f.label)) studyRow = f
    if (workRow == null && MB_RISK_WORK.test(f.label)) workRow = f
  }
  const base = mbProfileOf({ p: input.p, workMonths: input.workMonths, clb: input.clb })
  if (base.riskForeignStudy && studyRow) {
    reasons.push({
      kind: REASON.gap,
      text: `${PV_TEXT.mbStudyDeductHead}${Math.abs(studyRow.points ?? 0)}${PV_TEXT.mbStudyDeductMid}${input.mbTotal}${PV_TEXT.points}`,
      key: PV_KEY.mbStudyDeduct, params: { pts: Math.abs(studyRow.points ?? 0), total: input.mbTotal },
      quote: studyRow.label, evidence: evOfFactor({ f: studyRow }),
    })
  }
  if (!base.riskForeignWork && workRow) {
    const worseProfile: MbEoiProfile = {
      clb: base.clb, secondLangClb5Plus: base.secondLangClb5Plus, age: base.age,
      workMonthsSameOcc: base.workMonthsSameOcc, employerLicenseRecognized: base.employerLicenseRecognized,
      edu: base.edu, adapt: base.adapt, riskForeignWork: true, riskForeignStudy: base.riskForeignStudy,
    }
    const worse = estimateMbEoi({ factors: input.data.scoreFactors, profile: worseProfile }).total
    reasons.push({
      kind: REASON.gap,
      text: `${PV_TEXT.mbWorkDeductHead}${Math.abs(workRow.points ?? 0)}${PV_TEXT.mbWorkDeductMid}${worse}${PV_TEXT.points}`,
      key: PV_KEY.mbWorkDeduct, params: { pts: Math.abs(workRow.points ?? 0), total: worse },
      quote: workRow.label, evidence: evOfFactor({ f: workRow }),
    })
  }
  const mbScored: VerdictDrawRow[] = []
  for (const d of input.data.draws) {
    if (d.province === PROV.MB && d.kind === FACTOR.draw && d.score != null) mbScored.push(d)
  }
  mbScored.sort(byDrawDateDesc)
  if (mbScored.length) {
    const drawParts: string[] = []
    for (const d of mbScored) drawParts.push(`${d.score} ${d.drawDate}${d.note ? SPACE + d.note : ''}`)
    const lines = drawParts.join(SEP.commaSpace)
    reasons.push({
      kind: REASON.gap,
      text: `${PV_TEXT.scoreHead}${input.mbTotal}${PV_TEXT.ceilingMid}${input.ceil ?? SEP.emDash}${PV_TEXT.recentDraws}${lines}`,
      key: PV_KEY.mbScore, params: { score: input.mbTotal, ceiling: input.ceil ?? SEP.emDash, lines },
      evidence: evOfDraw({ d: mbScored[0] }),
    })
  }
  return reasons
}

/**
 * MPNP EOI 估分 + 三条 warning(C01 §二曼省节:外省学习 −100 / 再叠外省工作 −100 / 天花板对照抽选线)。
 *
 * 估的是**门槛达成态**:MPNP SWM 的门槛本身就是「在曼省同一雇主连续全职 N 个月 + 长期 offer」,
 * 所以按「攒够那 N 个月」算分才是这条路走通时的分 —— refLabel/reasons 里点明这一点,不装成今天的分。
 *
 * @param input 通道声明、档案、六张底表、经验闸的评估与参照的那一轮。
 * @returns MPNP 估分与那三条 warning;不是这条线或档案缺格则 score=undefined。
 */
function mbScore(input: MbScoreIn): MbScoreOut {
  const reasons: VerdictReason[] = []
  let mbHead: ScoreRow | null = null
  for (const f of input.data.scoreFactors) if (f.province === PROV.MB) { mbHead = f; break }
  if (input.spec.scorer !== PROV.MB || !mbHead) return { score: undefined, reasons: reasons }
  if (input.p.age == null || input.p.clb == null || input.p.edu == null) {
    return { score: undefined, reasons: reasons }
  }
  const workMonths = Math.max(input.gate.have ?? 0, input.gate.need ?? 0)
  const mbNow = estimateMbEoi({
    factors: input.data.scoreFactors,
    profile: mbProfileOf({ p: input.p, workMonths: workMonths, clb: input.p.clb }),
  })
  const mbLangLabels: string[] = []
  for (const f of input.data.scoreFactors) {
    if (f.province !== PROV.MB || f.factor !== FACTOR.language || f.kind !== FACTOR_ROW) continue
    mbLangLabels.push(f.label)
  }
  const maxClb = maxClbIn({ labels: mbLangLabels })
  const ceil = maxClb == null ? null : estimateMbEoi({
    factors: input.data.scoreFactors,
    profile: mbProfileOf({ p: input.p, workMonths: workMonths, clb: maxClb }),
  }).total
  const score: PathwayScore = {
    system: mbNow.system, value: mbNow.total, ceiling: ceil,
    refLine: input.draw?.score ?? null,
    refLabel: input.draw
      ? `${PV_TEXT.mbRefHead}${input.draw.stream}${SEP.parenL}${input.draw.drawDate}${input.draw.note ? SEP.midDot + input.draw.note : ''}${SEP.parenR}`
      : PV_TEXT.mbRefNone,
    evidence: evOfFactor({ f: mbHead }),
  }
  for (const one of mbWarnings({
    p: input.p, data: input.data, workMonths: workMonths, clb: input.p.clb, mbTotal: mbNow.total, ceil: ceil,
  })) reasons.push(one)
  return { score: score, reasons: reasons }
}

/**
 * ④ 估分 + 参照线。
 *
 * 没有专用估分器的省走官方分值表(#301),接不上一律 undefined(不编);
 * 估分器挑不出行(档案落在官方表的档位之外)→ 如实说判不了,不给一个编出来的分。
 *
 * 一个估分器都接不上、但有该通道的抽选线时,把**线**摆出来 —— 但不冒充成「你的分」。
 *
 * @param input 通道声明、档案、六张底表、经验闸的评估与「自雇是否被排除」。
 * @returns 估分、参照的那一轮抽选,以及估分类的理由(MPNP 那三条 warning 在内)。
 */
function scoreAndRefLine(input: ScoreAndRefLineIn): ScoreAndRefLineOut {
  const reasons: VerdictReason[] = []
  const draw = refDraw({ spec: input.spec, draws: input.data.draws })
  let score: MaybeScore
  try {
    if (!input.spec.scorer) score = provinceGridScore({ spec: input.spec, p: input.p, factors: input.data.scoreFactors, draw: draw })
    const crs = crsScore({
      spec: input.spec, p: input.p, data: input.data, draw: draw, selfEmpExcluded: input.selfEmpExcluded,
    })
    if (crs) score = crs
    const mb = mbScore({ spec: input.spec, p: input.p, data: input.data, gate: input.gate, draw: draw })
    if (mb.score) score = mb.score
    for (const one of mb.reasons) reasons.push(one)
  } catch {
    score = undefined
    reasons.push({ kind: REASON.needsInfo, text: PV_TEXT.noScoreBand, key: PV_KEY.noScoreBand })
  }
  if (!score && draw && draw.score != null) {
    reasons.push({
      kind: REASON.met,
      text: `${draw.drawDate}${PV_TEXT.drawLineMid}${draw.score}${draw.scale ? ` ${draw.scale}${PV_TEXT.scaleTail}` : ''}`,
      key: draw.scale ? PV_KEY.drawLineScaled : PV_KEY.drawLine,
      params: { date: draw.drawDate, score: draw.score ?? 0, scale: draw.scale ?? '' },
      evidence: evOfDraw({ d: draw }),
    })
  }
  return { reasons: reasons, score: score, draw: draw }
}

/**
 * 分数鸿沟那一条:语言拉满后的上界仍够不着最近一轮抽选线 = 攒时间也补不齐(≠ 差一点点)。
 *
 * 对照的是**哪一轮抽选**:句子里拿 `draw` 的官方通道名与日期,**不用** `score.refLabel` ——
 * 后者是中文拼的展示串(`lib/chat/facts` 那边也是 zhOnly 包着用),塞进英文句子就成了半中半英。
 *
 * @param input 估分、参照的那一轮,与「鸿沟成不成立」。
 * @returns 鸿沟成立时的那一条理由;否则空。
 */
function scoreGulfReason(input: ScoreGulfReasonIn): ScoreGulfReasonOut {
  const reasons: VerdictReason[] = []
  if (input.scoreGulf && input.score) {
    reasons.push({
      kind: REASON.gap,
      text: `${PV_TEXT.scoreHead}${input.score.value}${PV_TEXT.ceilingMid}${input.score.ceiling}${PV_TEXT.comparedWith}${input.draw?.stream ?? input.score.refLabel} ${input.draw?.drawDate ?? ''}${PV_TEXT.ofSpaced}${input.score.refLine}${PV_TEXT.points}`,
      key: PV_KEY.scoreGulf,
      params: {
        score: input.score.value, ceiling: input.score.ceiling ?? 0, line: input.score.refLine ?? 0,
        stream: input.draw?.stream ?? input.score.refLabel, date: input.draw?.drawDate ?? '',
      },
      evidence: input.draw ? evOfDraw({ d: input.draw }) : input.score.evidence,
    })
  }
  return reasons
}

/**
 * 经验的差距句 —— 逐行摆经验闸挑中的门槛行,再摆判不了的条件行。
 *
 * · 分数鸿沟型排除(FED-EE):「现在连池都进不去」本身就是官方门槛判出来的排除
 *   → kind=REASON.excluded(带官方 quote);
 * · 清单型排除(PE):经验差距是**另一件事**,仍按可积累的 gap 摆(C01 金标「24 月另列 gap」)。
 *
 * 三条措辞口径:
 * · need=0(官方明说无门槛)⇒ 恒达标 —— 缺经验月数也一样,一道不存在的闸没有「判不了」;
 * · 差额**只在已经攒了一部分时才说**:0 经验时「差 N 个月」与门槛本身是同一个数,加上档位徽标
 *   就成了同一个数字说三遍(2026-08-11 Frank 点名);
 * · 门槛名(同雇主在职 / 工作经验)进**键名**而不是进参数 —— 它本身要翻译,参数只放数。
 *
 * @param input 经验闸的评估与「没达标时算硬伤还是缺口」。
 * @returns 经验类的理由,按门槛行的原序。
 */
function experienceReasons(input: ExperienceReasonsIn): ExperienceReasonsOut {
  const reasons: VerdictReason[] = []
  for (const r of input.gate.rows) {
    const need = monthsOfReq({ r: r })
    if (need == null) continue
    const met = need === 0 || (input.gate.have != null && input.gate.have >= need)
    const gateName = r.basis === BASIS.employerTenure ? PV_TEXT.tenureGate : PV_TEXT.expGate
    reasons.push({
      kind: met ? REASON.met : input.gate.have == null ? REASON.needsInfo : input.hardKind,
      text: r.op === PERMIT.none
        ? PV_TEXT.noExpReq
        : input.gate.have == null
          ? `${gateName} ${need}${PV_TEXT.monthsNoExp}`
          : met
            ? `${gateName} ${need}${PV_TEXT.monthsMet}`
            : input.gate.have === 0
              ? `${gateName} ${need}${PV_TEXT.months}`
              : `${gateName} ${need}${PV_TEXT.monthsShort}${need - input.gate.have}${PV_TEXT.months}`,
      key: r.op === PERMIT.none ? PV_KEY.expNone : `${KEY_PREFIX.exp}${r.basis === BASIS.employerTenure ? EXP_BASIS.tenure : EXP_BASIS.work}${SEP.dot}${
        input.gate.have == null ? STATE.unknown : met ? STATE.ok : input.gate.have === 0 ? STATE.need : STATE.short}`,
      params: { n: need, short: input.gate.have == null || met ? 0 : need - input.gate.have },
      quote: quoteOfReq({ r: r }), evidence: evOfReq({ r: r }),
    })
  }
  for (const r of input.gate.unknownCond) {
    reasons.push({
      kind: REASON.needsInfo,
      text: PV_TEXT.condUnknown,
      key: PV_KEY.condUnknown,
      quote: quoteOfReq({ r: r }), evidence: evOfReq({ r: r }),
    })
  }
  return reasons
}

/**
 * 居住门槛那一条(NB 的「过去 6 个月住在 NB」)。
 *
 * @param input 命中的居住门槛与「没达标时算硬伤还是缺口」。
 * @returns 有这类门槛时的那一条理由;否则空。
 */
function residenceReason(input: ResidenceReasonIn): ResidenceReasonOut {
  const reasons: VerdictReason[] = []
  if (input.res) {
    reasons.push({
      kind: input.res.gap == null ? REASON.needsInfo : input.res.gap > 0 ? input.hardKind : REASON.met,
      text: input.res.gap == null
        ? `${PV_TEXT.residenceHead}${input.res.need}${PV_TEXT.monthsNoResidence}`
        : input.res.gap === input.res.need
          ? `${PV_TEXT.residenceHead}${input.res.need}${PV_TEXT.months}`
          : `${PV_TEXT.residenceHead}${input.res.need}${PV_TEXT.monthsShort}${input.res.gap}${PV_TEXT.months}`,
      key: input.res.gap == null ? PV_KEY.resUnknown : input.res.gap === input.res.need ? PV_KEY.resNeed : PV_KEY.resShort,
      params: { n: input.res.need, short: input.res.gap ?? 0 },
      quote: quoteOfReq({ r: input.res.row }), evidence: evOfReq({ r: input.res.row }),
    })
  }
  return reasons
}

/**
 * 省外院校毕业生的额外在职门槛那一条(#317)。
 *
 * 条文出处在策略文件里(gates 的 quote 例外同一条口子:官方原句 + url + 生效日三样齐全才准声明),
 * 不是代码里手写的官方口径。
 *
 * @param input 通道声明,与 ③b 判出的条款、条件、已攒月数。
 * @returns 这一档适用时的那一条理由;条件不成立则空。
 */
function oopGradReason(input: OopGradReasonIn): OopGradReasonOut {
  const reasons: VerdictReason[] = []
  if (input.oop && input.oopHolds !== false) {
    const state = input.oopHolds === null ? STATE.condUnknown
      : input.oopHave == null ? STATE.unknown
        : input.oopHave >= input.oop.months ? STATE.ok
          : input.oopHave === 0 ? STATE.need : STATE.short
    const ev: Evidence = {
      url: input.oop.url, fetched: input.oop.fetched, label: input.spec.stream, effective: input.oop.effective || undefined,
    }
    reasons.push({
      kind: state === STATE.ok ? REASON.met : state === STATE.need || state === STATE.short ? REASON.gap : REASON.needsInfo,
      text: state === STATE.condUnknown
        ? PV_TEXT.oopCondUnknown
        : state === STATE.unknown
          ? `${PV_TEXT.oopGradHead}${input.oop.months}${PV_TEXT.monthsNoLocalTenure}`
          : state === STATE.ok
            ? `${PV_TEXT.oopGradHead}${input.oop.months}${PV_TEXT.monthsMet}`
            : state === STATE.need
              ? `${PV_TEXT.oopGradHead}${input.oop.months}${PV_TEXT.months}`
              : `${PV_TEXT.oopGradHead}${input.oop.months}${PV_TEXT.monthsShort}${input.oop.months - (input.oopHave as number)}${PV_TEXT.months}`,
      key: `${KEY_PREFIX.oopGrad}${state}`,
      params: { n: input.oop.months, short: state === STATE.short ? input.oop.months - (input.oopHave as number) : 0 },
      quote: input.oop.quote, evidence: ev,
    })
  }

  return reasons
}

/**
 * NL 指定雇主名录里申报过这个 NOC 的雇主数(supporting fact)。
 *
 * mart 的 `designated_employers` 行**不带 url / fetched**(数据缺口见类型注释)→ 挂不上就不挂,
 * 不借别的页的出处充数。
 *
 * @param input 通道声明、档案与六张底表。
 * @returns NL 且答了职业时的那一条理由;否则空。
 */
function nlDesignatedReason(input: NlDesignatedReasonIn): NlDesignatedReasonOut {
  const reasons: VerdictReason[] = []
  if (input.spec.reqProvince === PROV.NL && input.p.noc) {
    const noc = input.p.noc
    let nlTotal = 0
    let nlHits = 0
    let src: DesignatedEmployerRow | null = null
    for (const e of input.data.designatedEmployers) {
      if (e.province !== PROV.NL) continue
      nlTotal += 1
      let declared = false
      for (const one of (e.nocs || '').split(SEP.comma)) if (one.trim() === noc) { declared = true; break }
      if (!declared) continue
      nlHits += 1
      if (src == null && e.url && e.fetched) src = e
    }
    reasons.push({
      kind: nlHits ? REASON.met : REASON.gap,
      text: `${nlTotal}${PV_TEXT.nlDesignatedMid}${nlHits}${PV_TEXT.nlDeclaredMid}${noc}`,
      key: PV_KEY.nlDesignated,
      params: { total: nlTotal, hits: nlHits, noc: noc },
      evidence: src
        ? { url: src.url as string, fetched: src.fetched as string, label: NL_DESIGNATED_LABEL }
        : undefined,
    })
  }
  return reasons
}

/**
 * ⑤ 裁决:把经验、居住、省外院校、自雇、NL 名录这几件摆成句子,并判分数鸿沟。
 *
 * 分数鸿沟 = 语言拉满后的上界仍够不着最近一轮抽选线,那是攒时间也补不齐的(≠ 差一点点)。
 *
 * @param input 前四段攒下的全部中间态。
 * @returns 裁决类的理由、有没有硬伤,以及可能被自雇顶上的 blockedBy。
 */
function verdictReasons(input: VerdictReasonsIn): VerdictReasonsOut {
  const reasons: VerdictReason[] = []
  let blockedBy = input.blockedBy
  const scoreGulf = !!(input.score && input.score.ceiling != null && input.score.refLine != null && input.score.ceiling < input.score.refLine)
  const excluded = input.listExcluded || scoreGulf
  for (const one of scoreGulfReason({ score: input.score, draw: input.draw, scoreGulf: scoreGulf })) {
    reasons.push(one)
  }

  const hardKind: VerdictReason['kind'] = scoreGulf ? REASON.excluded : REASON.gap
  for (const one of experienceReasons({ gate: input.gate, hardKind: hardKind })) reasons.push(one)
  for (const one of residenceReason({ res: input.res, hardKind: hardKind })) reasons.push(one)
  for (const one of oopGradReason({
    spec: input.spec, oop: input.oop, oopHolds: input.oopHolds, oopHave: input.oopHave,
  })) reasons.push(one)

  for (const r of input.selfEmpRows) {
    if (input.p.foreignExpSelfEmployed !== true) continue
    blockedBy = blockedBy ?? BLOCKED_BY.selfEmployed
    reasons.push({ kind: REASON.gap, text: PV_TEXT.selfEmpExcluded, key: PV_KEY.selfEmp, quote: quoteOfReq({ r: r }), evidence: evOfReq({ r: r }) })
  }

  for (const one of nlDesignatedReason({ spec: input.spec, p: input.p, data: input.data })) {
    reasons.push(one)
  }

  return { reasons: reasons, excluded: excluded, blockedBy: blockedBy }
}

/**
 * 四类闸各自的答案(境内身份那道另有 asks 细分,见 `statusGateAnswer`)。
 *
 * 专业对口:答「对口」即达标;答「不对口」时看该通道给不给本省院校的例外
 * (NL:Memorial/CNA 毕业生 + 岗位 TEER 0-3 可不对口;TEER 4/5 要对紧缺清单 → 判不了)。
 *
 * @param input 通道声明与档案。
 * @returns 每道闸一个答案:有 / 没有 / 判不了。
 */
function gateAnswers(input: GateAnswersIn): GateAnswersOut {
  return {
    offer: input.p.hasOffer, statusInCanada: input.p.inCanada, credentialCanada: input.p.canadaStudy,
    fieldMatch: fieldMatchAnswer({ p: input.p, specKey: input.spec.key }),
    french: input.p.frenchOk,
  }
}

/**
 * 库里根本没有这条通道的行 → needs-info + not-collected(**不拿文档记忆当库**)。
 *
 * @param input 要判的那条通道。
 * @returns 一条「本站尚未收录」的裁决。
 */
function notCollectedVerdict(input: NotCollectedVerdictIn): NotCollectedVerdictOut {
  const reasons: VerdictReason[] = []
  reasons.push({
    kind: REASON.needsInfo,
    text: `${PV_TEXT.notCollectedHead}${input.spec.stream}${PV_TEXT.reqTail}`,
    key: PV_KEY.noReq, params: { stream: input.spec.stream },
  })
  return { key: input.spec.key, province: input.spec.province, stream: input.spec.stream, verdict: REASON.needsInfo, tier: null, tierBasis: TIER_BASIS.now, reasons, availability: AVAIL.notCollected }
}

/**
 * 最大的那个缺口 —— 它定 tier。
 *
 * 并列时**经验类优先**当代表:它决定 tierBasis(居住类没有起算点问题,搬过去当天就在计时)。
 *
 * @param input 这条通道攒下的全部缺口。
 * @returns 最大的那个;一个缺口都没有则 null。
 */
function worstGap(input: WorstGapIn): WorstGapOut {
  let worst: TierGap | null = null
  for (const one of input.gaps) {
    if (worst == null || one.months > worst.months || (one.months === worst.months && one.kind === FACTOR.work)) {
      worst = one
    }
  }
  return worst
}

/**
 * 三值折叠:清单里每一类闸都 met 才是 open;有 unknown 就是「判不了」;有明确不满足的闸 → blockedBy 兜住。
 *
 * (rank 里 blockedBy 排在无阻碍的 open 之后,标签另写 —— 与语言差档同一套语义。)
 *
 * @param input 有没有硬伤、经验闸的评估、缺的槽、门槛清单判不判得了。
 * @returns 三态之一:排除 / 判不了 / 能走。
 */
function foldTriState(input: FoldTriStateIn): FoldTriStateOut {
  if (input.excluded) return REASON.excluded
  const needsInfo = !input.gate.picked || input.gate.gap == null
    || input.missingSlots.length > 0 || input.manifestUnknown
  return needsInfo ? REASON.needsInfo : VERDICT.viable
}

/**
 * 这条通道的数据到位没有(四态里的 `ok` / `not-collected`)。
 *
 * 清单缺条文 = 本站未收录,与「查不到门槛行」同属 not-collected(对用户是「规则待核对」不是「你不行」)。
 * **excluded 时不改 availability**:硬伤是判出来的结论,不是「我们没数据」—— 两者混在一起就成了
 * 「因为没数据所以排除你」,那是拿缺口当判据(四态不合并的老规矩)。
 * 🔴 「他没答职业」不算本站未收录:`gate.teerUnknown` 时行是有的,缺的是他那一格答案 →
 * availability 仍是 ok,判不了走 needs-info + missingSlots 点名(三值折叠:条文缺 ≠ 答案缺)。
 *
 * @param input 有没有硬伤、经验闸的评估、门槛清单缺不缺条文。
 * @returns `ok` 或 `not-collected`。
 */
function availabilityOf(input: AvailabilityOfIn): AvailabilityOfOut {
  if (!input.gate.picked && !input.gate.teerUnknown) return AVAIL.notCollected
  if (!input.excluded && input.manifestNoSource) return AVAIL.notCollected
  return AVAIL.ok
}

/**
 * tier 的起算点:从今天算,还是**毕业拿到工签之后**才开始算(#319)。
 *
 * 在读学生的「再攒 N 个月」不是从今天算 —— 学签在读不许全职上班,这 N 个月一天都攒不了。
 * 判据四件同时成立:处境=在读 + 许可不是已经在工作的那两种 + 真的有等待期(下发的 tier > 0,
 * 库缺行被抹成 null 的那种不谈起算点)+ 这段等待来自经验/在职门槛(居住门槛不吃这条:
 * 人搬过去当天就在计时)。
 *
 * @param input 档案、有没有硬伤、下发的 tier 与最大的那个缺口。
 * @returns 从今天算,还是毕业之后算。
 */
function tierBasisOf(input: TierBasisOfIn): TierBasisOfOut {
  const studying = input.p.status === PERMIT.study
    && (input.p.permit == null || input.p.permit === PERMIT.study)
  if (!studying || input.excluded) return TIER_BASIS.now
  if (input.outTier == null || input.outTier <= 0) return TIER_BASIS.now
  if (input.worst?.kind !== FACTOR.work || input.worst.months <= 0) return TIER_BASIS.now
  return TIER_BASIS.afterStudy
}

/**
 * 这段等待要的是不是**全职**(2026-08-16 Frank「而且需要全职的吗?」)。
 *
 * 判据取选中那一行的官方原文,代码里不写死 —— AB/ON/SK/MB 的行都明写 full-time,
 * NS 写的是「paid work + 1,560 小时」不含全职字样。只对经验/在职类等待有意义(居住类不谈全职)。
 *
 * @param input 最大的那个缺口与经验闸挑中的那一行。
 * @returns 官方原文里写了全职则 true。
 */
function tierFullTimeOf(input: TierFullTimeOfIn): TierFullTimeOfOut {
  if (input.worst?.kind !== FACTOR.work) return false
  return FULL_TIME_IN_LABEL.test(input.gate.picked?.label ?? '')
}

/**
 * 三值折叠:把七段攒下的中间态收成一条通道的裁决。
 *
 * 清单里每一类闸都 met 才是 open;有 unknown 就是「判不了」;有明确不满足的闸 → blockedBy 兜住
 * (rank 里 blockedBy 排在无阻碍的 open 之后,标签另写 —— 与语言差档同一套语义)。
 *
 * @param input 通道声明、档案与前面七段的产出。
 * @returns 这条通道的裁决。
 */
function foldVerdict(input: FoldVerdictIn): FoldVerdictOut {
  const worst = worstGap({ gaps: input.gaps })
  const tier: Tier = input.excluded ? null : tierOfMonths({ m: worst?.months ?? 0 })
  const verdict = foldTriState({
    excluded: input.excluded, gate: input.gate,
    missingSlots: input.missingSlots, manifestUnknown: input.manifestUnknown,
  })
  const availability = availabilityOf({
    excluded: input.excluded, gate: input.gate, manifestNoSource: input.manifestNoSource,
  })
  const outTier: Tier = verdict === REASON.needsInfo && !input.gate.picked ? null : tier
  const tierBasis = tierBasisOf({ p: input.p, excluded: input.excluded, outTier: outTier, worst: worst })
  const tierFullTime = tierFullTimeOf({ worst: worst, gate: input.gate })

  return {
    key: input.spec.key, province: input.spec.province, stream: input.spec.stream,
    verdict, tier: outTier, tierBasis, tierFullTime: tierFullTime ? true : undefined,
    blockedBy: input.blockedBy && !input.excluded ? input.blockedBy : undefined,
    missingSlots: input.missingSlots.length && !input.excluded ? Array.from(new Set(input.missingSlots)) : undefined,
    reasons: input.reasons, score: input.score, availability: availability,
  }
}

/**
 * 先把这条通道的**事实**摆齐:职业清单、语言、经验/居住、省外院校、估分。
 *
 * 这一半只摆事实,一个裁决都不下 —— 裁决在 `verdictReasons` 与 `foldVerdict`。
 * 各段自己攒 reasons/missingSlots,这里按 ①②③③b④ 的原序并回去(次序进 JSON,一格不能动)。
 *
 * @param input 通道声明、档案、六张底表,与前面算好的门槛行、经验闸、自雇行。
 * @returns 五段的理由、缺的槽、缺口,以及裁决那一半还要用的中间态。
 */
function pathwayFacts(input: PathwayFactsIn): PathwayFactsOut {
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []
  const rows = input.rows
  const gate = input.gate
  const selfEmpExcluded = input.selfEmpExcluded
  const lists = occupationListReasons({ spec: input.spec, p: input.p, data: input.data, rows: rows })
  for (const one of lists.reasons) reasons.push(one)
  for (const one of lists.missingSlots) missingSlots.push(one)
  const listExcluded = lists.listExcluded

  const lang = languageReasons({ spec: input.spec, p: input.p, rows: rows, selfEmpExcluded: selfEmpExcluded })
  for (const one of lang.reasons) reasons.push(one)
  for (const one of lang.missingSlots) missingSlots.push(one)
  const blockedBy = lang.blockedBy

  const exp = experienceGaps({ spec: input.spec, p: input.p, rows: rows, gate: gate })
  for (const one of exp.reasons) reasons.push(one)
  for (const one of exp.missingSlots) missingSlots.push(one)
  const gaps: TierGap[] = []
  for (const one of exp.gaps) gaps.push(one)
  const res = exp.res

  const oopGap = outOfProvinceGradGap({ spec: input.spec, p: input.p })
  for (const one of oopGap.missingSlots) missingSlots.push(one)
  for (const one of oopGap.gaps) gaps.push(one)
  const oop = oopGap.oop
  const oopHolds = oopGap.oopHolds
  const oopHave = oopGap.oopHave

  const scored = scoreAndRefLine({
    spec: input.spec, p: input.p, data: input.data, gate: gate, selfEmpExcluded: selfEmpExcluded,
  })
  for (const one of scored.reasons) reasons.push(one)
  const score = scored.score
  const draw = scored.draw
  return {
    reasons: reasons, missingSlots: missingSlots, listExcluded: listExcluded, blockedBy: blockedBy,
    gaps: gaps, res: res, oop: oop, oopHolds: oopHolds, oopHave: oopHave, score: score, draw: draw,
  }
}

/**
 * 两道闸里**更难拆的**那一道。
 *
 * 标签要报最难拆的:一个从没来过加拿大、也没有 offer 的人,写「要先有 offer」会让他以为
 * 找份工作就行,而真正挡路的是那张加拿大学历(2026-08-12 实拍)。难度的口径只有 `BLOCK_COST` 一份。
 *
 * @param input 新来的那道闸,与目前记着的那道。
 * @returns 更难拆的那一道。
 */
function harderBlock(input: HarderBlockIn): HarderBlockOut {
  return blockCost(input.gate) > blockCost(input.blockedBy) ? input.gate : input.blockedBy
}

/**
 * ⑥ 门槛清单:这条通道有哪几类闸(gateManifest)。
 *
 * 病灶原话:`pnp_requirements` 是开放世界的表,这里却做封闭世界推理 ——「库里这几条你都满足 → 能走」。
 * 抽不到的门槛不是不存在的门槛。清单把「有哪几类闸」独立记一份,于是「我没这类数据 / 你没答这题」
 * 第一次变得**可被发现**;发现不了的时候一律不许说「能走」。
 *
 * 一道闸走四档:官方明写不要 ⇒ 跳过(没这道闸);本站未收录 ⇒ 判不了 + 条文缺(选配闸例外,跳过);
 * 有闸但他没答 ⇒ 判不了 + 点名让他补这一格;答了没有 ⇒ 现在走不了,并拿它去顶 blockedBy。
 *
 * @param input 通道声明、档案,与前面几段攒下的 blockedBy。
 * @returns 闸类的理由、缺的槽、可能被更难拆的闸顶上的 blockedBy,以及三个清单标志。
 */
function gateManifest(input: GateManifestIn): GateManifestOut {
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []
  let blockedBy = input.blockedBy
  let manifestUnknown = false
  let manifestNoSource = false
  const answerOf = gateAnswers({ spec: input.spec, p: input.p })
  for (const g of GATE_KEYS) {
    const rule = gateOf(input.spec.key, g)
    if (rule.need === GATE_NEED.notRequired) continue
    if (rule.need === GATE_NEED.unknown) {
      if (OPT_IN_GATES.has(g)) continue
      manifestUnknown = true
      manifestNoSource = true
      reasons.push({ kind: REASON.needsInfo, text: `${PV_TEXT.notCollectedHead}${input.spec.stream}${PV_TEXT.of}${gateLabels[g].zh}${PV_TEXT.reqDoc}`,
        key: `${KEY_PREFIX.gate}${g}${KEY_SUFFIX_NOT_COLLECTED}`, params: { stream: input.spec.stream },
        evidence: rule.url ? { url: rule.url, fetched: rule.fetched ?? '', label: input.spec.stream } : undefined })
      continue
    }
    const asks = g === BLOCKED_BY.statusInCanada ? rule.asks : undefined
    const have = asks
      ? statusGateAnswer({ asks: asks, p: input.p, reqProvince: input.spec.reqProvince })
      : answerOf[g]
    const what = asks ? askLabels[asks].zh : gateLabels[g].zh
    const ev = { url: rule.url, fetched: rule.fetched, label: input.spec.stream }
    if (have == null) {
      manifestUnknown = true
      missingSlots.push(g)
      reasons.push({ kind: REASON.needsInfo, text: `${what}${PV_TEXT.gateUnknownTail}`,
        key: gateKeyOf({ gate: g, asks: asks, state: STATE.unknown }), evidence: ev })
      continue
    }
    if (have) {
      reasons.push({ kind: REASON.met, text: `${what}${PV_TEXT.metTail}`,
        key: gateKeyOf({ gate: g, asks: asks, state: REASON.met }), evidence: ev })
      continue
    }
    blockedBy = harderBlock({ gate: g, blockedBy: blockedBy })
    reasons.push({ kind: REASON.gap, text: `${PV_TEXT.gateGapHead}${what}${PV_TEXT.gateGapTail}`,
      key: gateKeyOf({ gate: g, asks: asks, state: REASON.gap }), evidence: ev })
  }
  return {
    reasons: reasons, missingSlots: missingSlots, blockedBy: blockedBy,
    manifestUnknown: manifestUnknown, manifestNoSource: manifestNoSource,
  }
}

/**
 * 一条通道的裁决 —— 本域的主流水线。
 *
 * 七步,前四步只摆事实、后三步才裁决:
 * `reqsOf` 取本通道的门槛行 → `pickGate` 挑量他的那一行 → `pathwayFacts`(①职业清单 ②语言
 * ③经验/居住 ③b省外院校 ④估分)→ `verdictReasons`(⑤ 摆成句子、判分数鸿沟)
 * → `gateManifest`(⑥ 门槛清单)→ `foldVerdict`(三值折叠成一条裁决)。
 *
 * 🔴 库里一行门槛条文都没有 → `not-collected`(**不拿文档记忆当库**),不往下走。
 *
 * @param input 通道声明、判定档案与六张底表。
 * @returns 这条通道的裁决。
 */
function evaluateOne(input: EvaluateOneIn): EvaluateOneOut {
  const rows = reqsOf({ spec: input.spec, all: input.data.requirements })
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []

  if (!rows.length) return notCollectedVerdict({ spec: input.spec })

  const selfEmpRows: ReqRow[] = []
  for (const r of rows) {
    if (r.factor === REQ_FACTOR.workSelfEmployed || r.factor === REQ_FACTOR.experienceExcluded) selfEmpRows.push(r)
  }
  const selfEmpExcluded = selfEmpRows.length > 0
  const gate = pickGate({ spec: input.spec, rows: rows, p: input.p, selfEmpExcluded: selfEmpExcluded })

  const facts = pathwayFacts({
    spec: input.spec, p: input.p, data: input.data, rows: rows, gate: gate,
    selfEmpExcluded: selfEmpExcluded,
  })
  for (const one of facts.reasons) reasons.push(one)
  for (const one of facts.missingSlots) missingSlots.push(one)
  let blockedBy = facts.blockedBy

  const verdicts = verdictReasons({
    spec: input.spec, p: input.p, data: input.data, gate: gate, selfEmpRows: selfEmpRows,
    score: facts.score, draw: facts.draw, res: facts.res,
    oop: facts.oop, oopHolds: facts.oopHolds, oopHave: facts.oopHave,
    listExcluded: facts.listExcluded, blockedBy: blockedBy,
  })
  for (const one of verdicts.reasons) reasons.push(one)
  const excluded = verdicts.excluded
  blockedBy = verdicts.blockedBy

  const manifest = gateManifest({ spec: input.spec, p: input.p, blockedBy: blockedBy })
  for (const one of manifest.reasons) reasons.push(one)
  for (const one of manifest.missingSlots) missingSlots.push(one)
  blockedBy = manifest.blockedBy
  const manifestUnknown = manifest.manifestUnknown
  const manifestNoSource = manifest.manifestNoSource

  return foldVerdict({
    spec: input.spec, p: input.p, gaps: facts.gaps, excluded: excluded, gate: gate,
    missingSlots: missingSlots, manifestUnknown: manifestUnknown, manifestNoSource: manifestNoSource,
    blockedBy: blockedBy, reasons: reasons, score: facts.score,
  })
}

/**
 * 这条通道排第几档 —— **最难拆的那道障碍**定次序。
 *
 * 四档:现在就能走 → 被硬门槛卡住(考试能补,但**现在**走不了) → 缺档案判不了 → 排除。
 * 先前只有三档,「差 3 档语言」和「全部达标」并列 tier0,谁在注册表里靠前谁第一。
 * 2026-08-12 二拍(Frank 实拍:「纽芬兰那个需要学历,为什么还排在前面?」):
 * 先前按**判定桶**排(能走 → 被卡住 → 判不了 → 排除),于是「被卡住」整桶压在「判不了」前面 ——
 * 结果是**要读几年书才拿得到的加拿大学历**排在**几周就能拿到的 offer** 前面。桶不是难度。
 * 能说出具体障碍的(blockedBy)按它排,说不出的(needs-info)落在「境内身份」与「重考语言」之间
 * —— 我们连判都判不了,不该压过一条已知只差 offer 的路。
 *
 * @param input 一条通道的裁决与判定档案。
 * @returns 名次(越小越靠前)。
 */
function obstacleRank(input: ObstacleRankIn): ObstacleRankOut {
  if (input.v.verdict === REASON.excluded) return RANK.excluded
  if (workPermitSoon({ v: input.v, profile: input.profile })) return RANK.offer
  if (input.v.blockedBy) return RANK[input.v.blockedBy] ?? RANK.unknown
  if (input.v.verdict === REASON.needsInfo) return RANK.unknown
  return RANK.none
}

/**
 * 工签闸对「本省在读学生」降本(2026-08-15 Frank「这个推荐科学吗」实拍)。
 *
 * 人在阿省、阿省学历,阿省机会通道因为「差工签」被排到差 offer 的路之后,而他毕业拿 PGWP
 * 基本是既定事实,offer 才是真要去抢的那一样。**只降到与 offer 同级、不越过它**:PGWP 仍需
 * 毕业+申请,不是今天就有。判据要三件同时成立 —— 在本省读书 + 学历在本省 + 这条路要的是工签
 * (不是 PGWP 本身)。
 *
 * @param input 一条通道的裁决与判定档案。
 * @returns 这条通道的工签闸算不算「快到手了」。
 */
function workPermitSoon(input: WorkPermitSoonIn): WorkPermitSoonOut {
  const pgwpExpected = input.profile.status === PERMIT.study && input.profile.canadaStudy === true
  if (!pgwpExpected || input.v.blockedBy !== BLOCKED_BY.statusInCanada) return false
  if (input.profile.studyProvince == null || input.profile.studyProvince !== input.v.province) return false
  if (gateOf(input.v.key, BLOCKED_BY.statusInCanada).need !== GATE_NEED.required) return false
  return (gateOf(input.v.key, 'statusInCanada') as GateAsks).asks === GATE_ASK.workPermit
}

/**
 * 这条通道有没有「自雇不计入经验」那类门槛行。
 *
 * @param input 该通道的门槛行。
 * @returns 有则 true。
 */
function selfEmpExcludedIn(input: SelfEmpExcludedInIn): SelfEmpExcludedInOut {
  for (const r of input.rows) {
    if (r.factor === REQ_FACTOR.workSelfEmployed || r.factor === REQ_FACTOR.experienceExcluded) return true
  }
  return false
}

/**
 * 职业级通道行排第几档:清单排除沉底 → 门槛未收录 → 可判的。
 *
 * @param input 一行职业级事实。
 * @returns 名次(越小越靠前)。
 */
function jobRowRank(input: JobRowRankIn): JobRowRankOut {
  if (input.row.excludedByList) return JOB_ROW_RANK.excludedByList
  if (input.row.availability !== AVAIL.ok || input.row.months == null) return JOB_ROW_RANK.notCollected
  return JOB_ROW_RANK.ok
}

/**
 * 一行职业清单 → 引它的官方原句。
 *
 * 全部来自数据行字段(stream / noc / name),**没有一个字是手写的**。
 *
 * @param input 那一行职业清单。
 * @returns 官方原句。
 */
function quoteOfOcc(input: QuoteOfOccIn): QuoteOfOccOut {
  return `${input.o.stream}${SEP.spacedDash}${input.o.noc} ${input.o.name}`
}

/**
 * 官方 `experience` 的口径 = **同职业总经验**(境内外都算)。
 *
 * 与判定引擎那头喂 `totalExpMonths` 同源;两格缺一格就判不了,**不折成 0**。
 *
 * @param input 判定档案。
 * @returns 总经验月数;缺一格则 null。
 */
function totalExpMonths(input: TotalExpMonthsIn): TotalExpMonthsOut {
  if (input.p.expCanadaMonths == null || input.p.expForeignMonths == null) return null
  return input.p.expCanadaMonths + input.p.expForeignMonths
}

/**
 * 一条通道**本站收录的门槛行**覆盖了哪几档 TEER(按 `appliesTeer` 聚合)。
 *
 * 🔴 这是**收录范围的下界**,不是官方受理范围的全集 —— 所以它只有一个用途:
 * 否掉粗筛的对错符号(「我们有行的那条通道并不收这一档」),**永不**拿来下「你不行」的结论。
 * (开放世界的表做封闭世界推理,正是 2026-08-12 判定口径根治要根治的那个病。)
 *
 * 引哪一行的原句:**覆盖面最宽的那行**最能代表这条通道的档位表(PE 只有一行,NS/ON 取 0-3 那行)。
 *
 * @param input 该省的全量门槛行。
 * @returns 一条通道一项,TEER 升序。
 */
function teerScopes(input: TeerScopesIn): TeerScopesOut {
  const by = new Map<string, TeerScopeAcc>()
  for (const r of input.provReqs) {
    if (r.subject !== SUBJECT.applicant || !r.appliesTeer) continue
    const teers: number[] = []
    for (const one of r.appliesTeer.split(SEP.comma)) {
      const n = Number(one.trim())
      if (Number.isInteger(n)) teers.push(n)
    }
    if (!teers.length) continue
    const cur = by.get(r.stream) ?? { teers: new Set<number>(), row: r, span: 0 }
    for (const n of teers) cur.teers.add(n)
    if (teers.length > cur.span) { cur.row = r; cur.span = teers.length }
    by.set(r.stream, cur)
  }
  const out: TeerScope[] = []
  for (const [stream, v] of by) {
    out.push({ stream: stream, teers: [...v.teers].sort(byNumberAsc), row: v.row })
  }
  return out
}

/**
 * 该省的**具名(定向)清单**:一张清单一条,带它绑的官方通道名与清单里的职业数。
 *
 * @param input 省码与全量职业清单行。
 * @returns 每张清单一项。
 */
function namedLists(input: NamedListsIn): NamedListsOut {
  const by = new Map<string, NamedList>()
  for (const o of input.occs) {
    if (o.province !== input.province || o.type !== INDEMAND) continue
    const cur = by.get(o.label)
    if (cur) {
      cur.count += 1
      continue
    }
    by.set(o.label, { label: o.label, stream: o.stream, count: 1, url: o.url, fetched: o.fetched })
  }
  return [...by.values()]
}

/**
 * 职业在该省的**不合格清单**上 —— 命中就是硬伤。
 *
 * @param input 岗位、该职业在本省命中的清单行。
 * @returns 每命中一张清单一行;没命中则空。
 */
function occExcludedRows(input: OccExcludedRowsIn): OccExcludedRowsOut {
  const out: TripleRow[] = []
  for (const o of input.mine) {
    if (o.type !== OCC_INELIGIBLE) continue
    out.push({
      gate: GATE_OF.occupation, tier: TIER_OF.free, key: TV_OCC.excluded, state: CARD_STATE.excluded,
      params: {
        noc: o.noc, nocName: input.nocName || o.name, prov: input.job.province,
        stream: o.stream, list: o.label,
      },
      label: `${TV_LABEL.occHead}${o.noc}${TV_LABEL.occIneligibleMid}${o.stream}`,
      quote: quoteOfOcc({ o: o }), evidence: evOfOcc({ r: o }),
    })
  }
  return out
}

/**
 * 职业在某张**具名(定向)清单**上。
 *
 * `matchesJobStream` 说的是「这一行是不是职位板 pnp 列显示的那张清单」—— 两处口径一致,
 * 才敢对用户说「就是你在列表看到的那个」。
 *
 * @param input 岗位、该职业在本省命中的清单行。
 * @returns 每命中一张清单一行。
 */
function occListedRows(input: OccListedRowsIn): OccListedRowsOut {
  const out: TripleRow[] = []
  for (const o of input.listed) {
    out.push({
      gate: GATE_OF.occupation, tier: TIER_OF.free, key: TV_OCC.listed, state: CARD_STATE.pass,
      params: {
        noc: o.noc, nocName: input.nocName || o.name, prov: input.job.province,
        stream: o.stream, list: o.label, matchesJobStream: o.label === input.job.pnpStream,
      },
      label: `${TV_LABEL.occHead}${o.noc}${TV_LABEL.occListedMid}${o.stream}`,
      quote: quoteOfOcc({ o: o }), evidence: evOfOcc({ r: o }),
    })
  }
  return out
}

/**
 * 该省**官方就没有**定向清单的举证;举不出来则 null(那就只能说「本站未收录」)。
 *
 * @param input 省码。
 * @returns 那一条举证;这个省举不出来则 null。
 */
function occListNoneFor(input: OccListNoneForIn): OccListNoneForOut {
  for (const [prov, src] of Object.entries(OCC_LIST_NONE)) {
    if (prov === input.province) return src
  }
  return null
}

/**
 * 一张具名清单都没命中时那一行 —— **必须带适用范围,不是判死**。
 *
 * 「未命中该省任何具名清单」事实无误,但**读起来像判死**:定向清单只绑它自己那条通道
 * (PE 的 OID 就 8 个职业,该省另有技术工人/关键工人/国际毕业生几条不看清单的通道)。
 * 所以这一行要说清哪张清单、多少个职业、绑哪条通道;一张都没收录时说「未收录」而不是「未命中」。
 *
 * 🔴 「官方不设清单」是**要举证的断言**(见 `OCC_LIST_NONE`),举不出来只能落「本站未收录」。
 *
 * @param input 岗位与全量职业清单行。
 * @returns 那一行。
 */
function occNoListRow(input: OccNoListRowIn): OccNoListRowOut {
  const lists = namedLists({ province: input.job.province, occs: input.occs })
  const none = lists.length ? null : occListNoneFor({ province: input.job.province })
  if (none) {
    return {
      gate: GATE_OF.occupation, tier: TIER_OF.free, key: TV_OCC.noList, state: CARD_STATE.info,
      params: { noc: input.job.noc ?? '', nocName: input.nocName, prov: input.job.province },
      label: `${input.job.province}${TV_LABEL.occNoListTail}`,
      evidence: { url: none.url, fetched: none.fetched, label: input.job.province },
    }
  }
  const only = lists.length === 1 ? lists[0] : null
  const labels: string[] = []
  for (const l of lists) labels.push(l.label)
  return {
    gate: GATE_OF.occupation, tier: TIER_OF.free, key: TV_OCC.notListed,
    state: lists.length ? CARD_STATE.info : CARD_STATE.unknown,
    params: {
      noc: input.job.noc ?? '', nocName: input.nocName, prov: input.job.province,
      lists: labels, listCount: lists.length,
      list: only?.label ?? '', stream: only?.stream ?? '', count: only?.count ?? 0,
    },
    label: lists.length
      ? `${TV_LABEL.occHead}${input.job.noc ?? TV_LABEL.unknownValue}${TV_LABEL.occNotOnMid}`
        + `${lists.length}${TV_LABEL.occNamedListsMid}${input.job.province}${TV_LABEL.occBindTail}`
      : `${TV_LABEL.occNoListOnFileHead}${input.job.province}`,
    evidence: only?.url && only.fetched
      ? { url: only.url, fetched: only.fetched, label: only.stream }
      : undefined,
  }
}

/**
 * TEER 粗筛那一行。
 *
 * 2026-08-14 Frank 拍板「满足的显示绿色对勾 不满足的就差红色」—— state 按 `pnpEligible` 分
 * pass/excluded(原「永不 pass、中性圆点」作废)。防「拿粗筛冒充官方结论」的担子挪到**措辞**上:
 * 文案只说「初筛通过/未过」(本站的筛),**不说**「在该省受理范围内」(那是官方口径,PE 反例:
 * 技术工人通道 appliesTeer=0-3,而 TEER 5 的岗靠同雇主 6 个月那条通道照样 pnpEligible=true)。
 *
 * `scopeStream` 指向真门槛:本站收录的门槛行里有哪条通道**不收**这一档 —— 没有这样的通道就不指,
 * 更不编;该省一条按 TEER 分档的行都没收录时,`scoped=false` 走三态里的「库里没有」。
 *
 * @param input 岗位与该省的全量门槛行。
 * @returns 那一行。
 */
function occTeerRow(input: OccTeerRowIn): OccTeerRowOut {
  const scopes = teerScopes({ provReqs: input.provReqs })
  let outScope: TeerScope | null = null
  if (input.job.teer != null) {
    for (const s of scopes) {
      if (s.teers.includes(input.job.teer)) continue
      outScope = s
      break
    }
  }
  const teerText: string[] = []
  if (outScope) for (const n of outScope.teers) teerText.push(String(n))
  const coarse = input.job.pnpEligible ? TV_LABEL.coarsePass : TV_LABEL.coarseFail
  const tail = outScope
    ? `${TV_LABEL.onFileMid}${outScope.stream}${TV_LABEL.coversMid}${outScope.teers.join(SEP.comma)}`
    : ''
  return {
    gate: GATE_OF.occupation, tier: TIER_OF.free, key: TV_OCC.teer,
    state: input.job.teer == null
      ? CARD_STATE.unknown
      : input.job.pnpEligible ? CARD_STATE.pass : CARD_STATE.excluded,
    params: {
      teer: input.job.teer ?? '', prov: input.job.province, noc: input.job.noc ?? '',
      nocName: input.nocName, coarsePass: input.job.pnpEligible,
      scopeStream: outScope?.stream ?? '', scopeTeers: teerText, scoped: scopes.length > 0,
    },
    label: `${TV_LABEL.teerHead}${input.job.teer ?? TV_LABEL.unknownValue}${SEP.spacedDash}`
      + `${input.job.province}${TV_LABEL.coarseMid}${coarse}${tail}`,
    quote: outScope ? quoteOfReq({ r: outScope.row }) : undefined,
    evidence: outScope ? evOfReq({ r: outScope.row }) : undefined,
  }
}

/**
 * 职业关(全免费):具名清单命中 / 排除清单命中 / TEER 粗筛档。**零新判定,全是查表**。
 *
 * 举证标准三态(设计 `docs/design/PR评估页三步重设计-20260812.md` §2「跨步规矩」,与门槛清单同一套):
 * 官方门槛行判出来 → 对错符号 + 官方原句 + 出处;
 * **本站粗筛** → **不给对错符号**,明写是粗筛,并指向本站收录的真门槛;
 * 库里没有 → 「本站未收录」,不拿「页上没写」当「官方不要求」。
 *
 * @param input 岗位、全量职业清单行、该省的全量门槛行。
 * @returns 职业关的那几行,按「排除 → 命中 → 未命中 → 粗筛」的次序。
 */
function occupationRows(input: OccupationRowsIn): OccupationRowsOut {
  const nocName = input.job.nocName || ''
  const mine: OccupationRow[] = []
  if (input.job.noc) {
    for (const o of input.occs) {
      if (o.noc === input.job.noc && o.province === input.job.province) mine.push(o)
    }
  }
  const listed: OccupationRow[] = []
  for (const o of mine) if (o.type === INDEMAND) listed.push(o)

  const out: TripleRow[] = []
  for (const one of occExcludedRows({ job: input.job, mine: mine, nocName: nocName })) out.push(one)
  for (const one of occListedRows({ job: input.job, listed: listed, nocName: nocName })) out.push(one)
  if (!listed.length) {
    out.push(occNoListRow({ job: input.job, occs: input.occs, nocName: nocName }))
  }
  out.push(occTeerRow({ job: input.job, provReqs: input.provReqs, nocName: nocName }))
  return out
}

/**
 * 该省雇主侧某一项门槛的官方行 —— 引原句与出处用。
 *
 * @param input 全量门槛行、省码与因素名。
 * @returns 那一行;该省没收录则 null。
 */
function empReqOf(input: EmpReqOfIn): EmpReqOfOut {
  for (const r of input.reqs) {
    if (r.province !== input.province || r.subject !== SUBJECT.employer) continue
    if (r.factor === input.factor) return r
  }
  return null
}

/**
 * 指定雇主名录那一行。
 *
 * 🔴 「未匹配 / 多配」两种默认行**只在 AIP 四省发**(2026-08-13 Frank:「曼省还有指定雇主这一说吗?」
 * —— 指定雇主是 AIP 的制度,名录行先前对全国岗都发,MB 岗上一句「非指定雇主」是拿别省的制度
 * 说这家雇主的不是)。命中行不设省门:真命中名录就是事实,行里自带 program 与省。
 *
 * 多配时 state 是 `info` 而不是 `pass`:「这条链在名录里」为真,「这家法人 = 你这份岗的雇主」不可证。
 * 下游比路靠 `designation` 非空才把 AIP 当已确证通道,多配时它是 null —— AIP 线自然不进比路、
 * 不会被标「最快」(付费结论不冒险)。
 *
 * @param input 岗位与公司。
 * @returns 那一行;非 AIP 省且没命中则 null。
 */
function empDesignationRow(input: EmpDesignationRowIn): EmpDesignationRowOut {
  const d = input.company.designation
  if (d) {
    return {
      gate: GATE_OF.employer, tier: TIER_OF.free, key: TV_EMP.designated, state: CARD_STATE.pass,
      params: { name: d.name, prov: d.province, program: d.source },
      label: `${d.name}${TV_LABEL.empDesignatedMid}${d.source}${TV_LABEL.empDesignatedTail}`
        + `${SEP.parenL}${d.province}${SEP.parenR}`,
      evidence: d.url && d.fetched
        ? { url: d.url, fetched: d.fetched, label: `${d.source}${TV_LABEL.empDesignatedSuffix}` }
        : undefined,
    }
  }
  if (!AIP_PROVINCES.has(input.job.province)) return null
  if (input.company.designationMatches >= DESIGNATION_MULTI) {
    return {
      gate: GATE_OF.employer, tier: TIER_OF.free, key: TV_EMP.designatedMulti, state: CARD_STATE.info,
      params: {
        name: input.company.name, prov: input.job.province,
        count: input.company.designationMatches, program: input.company.designationSource,
      },
      label: `${input.company.designationMatches}${TV_LABEL.empMultiMid}${input.job.province}`
        + `${TV_LABEL.empMultiName}${input.company.name}${TV_LABEL.empMultiTail}`,
    }
  }
  return {
    gate: GATE_OF.employer, tier: TIER_OF.free, key: TV_EMP.designationUnknown, state: CARD_STATE.unknown,
    params: { name: input.company.name, prov: input.job.province },
    label: `${input.company.name}${TV_LABEL.empUnmatchedTail}`,
  }
}

/**
 * 雇主侧逐项门槛(经营年限 / 雇员数)判出来的那几行。
 *
 * @param input 岗位、公司、雇主判定与全量门槛行。
 * @returns 每一项一行。
 */
function empThresholdRows(input: EmpThresholdRowsIn): EmpThresholdRowsOut {
  const out: TripleRow[] = []
  for (const item of input.ev.items) {
    const factor = item.factor === EMP_KEY.years ? EMP_FACTOR.years : EMP_FACTOR.staff
    const src = empReqOf({ reqs: input.reqs, province: input.job.province, factor: factor })
    out.push({
      gate: GATE_OF.employer, tier: TIER_OF.free, key: `${TV_EMP_PREFIX}${item.factor}`,
      state: STATE_OF_RULE[item.verdict],
      params: {
        need: item.need ?? '', have: item.have ?? '', short: item.short ?? '',
        unit: item.unit, evidence: item.evidence, name: input.company.name, prov: input.job.province,
      },
      label: `${TV_LABEL.empHead}${item.factor}${TV_LABEL.empNeedMid}${item.need ?? TV_LABEL.unknownValue} `
        + `${item.unit}${TV_LABEL.empHasMid}${item.have ?? TV_LABEL.unknownValue}`
        + `${TV_LABEL.empArrow}${item.verdict}`,
      quote: src ? quoteOfReq({ r: src }) : undefined,
      evidence: src ? evOfReq({ r: src }) : undefined,
    })
  }
  return out
}

/**
 * 年营业额那一行 —— **恒 unknown**。
 *
 * 2026-08-14 Frank「需要加一个年收入的卡片」;2026-08-16「这个缺一个营业额吧」→ 改成**恒显**,
 * 不再只在门槛行在库的省出(同一张卡格子集不齐会被读成漏渲)。
 * 公司营业额无源(2026-08-10 拍板永久结案,不重启抓数)→ 恒 unknown,前端按「未收录」渲染。
 *
 * @param input 岗位、公司、雇主判定与全量门槛行。
 * @returns 那一行。
 */
function empRevenueRow(input: EmpRevenueRowIn): EmpRevenueRowOut {
  const src = empReqOf({ reqs: input.reqs, province: input.job.province, factor: EMP_FACTOR.revenue })
  return {
    gate: GATE_OF.employer, tier: TIER_OF.free, key: TV_EMP.revenue, state: CARD_STATE.unknown,
    params: { need: input.ev.revenue?.need ?? '', name: input.company.name, prov: input.job.province },
    label: `${TV_LABEL.empRevenueHead}${input.ev.revenue?.need ?? TV_LABEL.unknownValue}`
      + `${TV_LABEL.empRevenueTail}`,
    quote: src ? quoteOfReq({ r: src }) : undefined,
    evidence: src ? evOfReq({ r: src }) : undefined,
  }
}

/**
 * 该省没收录雇员数门槛(NS 就是)但本站有估算 → 摆成**旁证事实行**,不冒充判定。
 *
 * @param input 岗位、公司与雇主判定。
 * @returns 那一行;该省有门槛或本站没估算则 null。
 */
function empStaffFactRow(input: EmpStaffFactRowIn): EmpStaffFactRowOut {
  for (const i of input.ev.items) if (i.factor === EMP_KEY.staff) return null
  if (input.company.facts.staffEst == null) return null
  return {
    gate: GATE_OF.employer, tier: TIER_OF.free, key: TV_EMP.staffFact, state: CARD_STATE.info,
    params: {
      staff: input.company.facts.staffEst, src: input.company.facts.staffEstSrc ?? '',
      name: input.company.name,
    },
    label: `${TV_LABEL.empStaffHead}${input.company.facts.staffEst}${TV_LABEL.empStaffMid}`
      + `${input.job.province}${TV_LABEL.empStaffTail}`,
  }
}

/**
 * 公营部门那一行 —— 私企门槛整段旁路。
 *
 * @param input 公司与雇主判定。
 * @returns 那一行;不是公营则 null。
 */
function empPublicSectorRow(input: EmpPublicSectorRowIn): EmpPublicSectorRowOut {
  if (input.ev.state !== EMP_STATE.public) return null
  return {
    gate: GATE_OF.employer, tier: TIER_OF.free, key: TV_EMP.publicSector, state: CARD_STATE.info,
    params: { name: input.company.name },
    label: `${input.company.name}${TV_LABEL.empPublicTail}`,
  }
}

/**
 * 「对这家怎么谈」那一行(付费位)—— **全部由数据在不在决定,不写任何劝说**。
 *
 * @param input 岗位与公司。
 * @returns 那一行。
 */
function empNextStepRow(input: EmpNextStepRowIn): EmpNextStepRowOut {
  const d = input.company.designation
  const sameNoc = input.job.noc && input.company.lmiaNocs ? input.company.lmiaNocs[input.job.noc] ?? 0 : 0
  const lmiaText = input.company.lmiaNocs == null ? AVAIL.notCollected : String(sameNoc)
  return {
    gate: GATE_OF.employer, tier: TIER_OF.paid, key: TV_NEXT.employer,
    state: d || sameNoc > 0 ? CARD_STATE.info : CARD_STATE.unknown,
    params: {
      name: input.company.name, noc: input.job.noc ?? '', nocName: input.job.nocName ?? '',
      program: d?.source ?? '', lmiaSameNoc: sameNoc, lmiaKnown: input.company.lmiaNocs != null,
    },
    label: `${TV_LABEL.nextHead}${input.company.name}${TV_LABEL.nextDesignation}`
      + `${d?.source ?? CARD_STATE.unknown}${TV_LABEL.nextLmiaMid}`
      + `${input.job.noc ?? TV_LABEL.unknownValue}${TV_LABEL.nextEq}${lmiaText}`,
  }
}

/**
 * 雇主关(事实全免费,「怎么谈」那行付费):指定名录 + 年限/雇员数 + 营业额 + LMIA 职业拆分。
 *
 * @param input 岗位、公司、雇主判定与全量门槛行。
 * @returns 雇主关的那几行,按原次序。
 */
function employerRows(input: EmployerRowsIn): EmployerRowsOut {
  const out: TripleRow[] = []
  const designation = empDesignationRow({ job: input.job, company: input.company })
  if (designation) out.push(designation)
  for (const one of empThresholdRows(input)) out.push(one)
  out.push(empRevenueRow(input))
  const staff = empStaffFactRow({ job: input.job, company: input.company, ev: input.ev })
  if (staff) out.push(staff)
  const publicSector = empPublicSectorRow({ company: input.company, ev: input.ev })
  if (publicSector) out.push(publicSector)
  out.push(empNextStepRow({ job: input.job, company: input.company }))
  return out
}

/**
 * 判定引擎认的那份档案 —— 语言/经验挑行按**这份 offer** 的职业与 TEER。
 *
 * 卡片判的就是手上这份岗,不按档案自报的职业:两者不一致时,按档案挑行会拿另一个职业的门槛
 * 去量这份 offer。
 *
 * @param input 岗位与判定档案。
 * @returns 判定引擎认的档案。
 */
function cardRuleProfile(input: CardRuleProfileIn): CardRuleProfileOut {
  return {
    noc: input.job.noc ?? undefined,
    teer: input.job.teer,
    clb: input.profile.clb,
    canadianExpMonths: input.profile.expCanadaMonths,
    totalExpMonths: totalExpMonths({ p: input.profile }),
    familySize: input.profile.familySize,
    annualIncome: null,
    incomeIsOccMedian: false,
    area: null,
  }
}

/**
 * 个人关(全付费):该省门槛行 × 档案 → 判定引擎的结构化结果,逐条摆。
 *
 * 雇主侧那几行判定引擎恒 unknown(它手上没有公司事实)—— 雇主关由 `employerVerdict` 判,这里不重复摆。
 * 判不了时才挂 `followups` 点名要哪一槽:达标 / 差多少都已经判出来了,再问一遍是骚扰。
 *
 * ⚠️ `evidence` 的键序照抄判定引擎那头(`label` 在前)—— 这张卡的返回是拿 JSON 比对的,
 * 挪一格就不是同一份输出了(2026-08-20 搬这段时对拍当场抓到)。
 *
 * @param input 岗位、判定档案与该省的全量门槛行。
 * @returns 个人关的那几行。
 */
function personRows(input: PersonRowsIn): PersonRowsOut {
  const rp = cardRuleProfile({ job: input.job, profile: input.profile })
  const out: TripleRow[] = []
  for (const r of evaluateRequirements({ reqs: input.provReqs, profile: rp })) {
    if (r.subject !== SUBJECT.applicant) continue
    const slots = r.verdict === ITEM.unknown ? SLOTS_OF_FACTOR[r.factor] : undefined
    out.push({
      gate: GATE_OF.person, tier: TIER_OF.paid, key: `${TV_PERSON_PREFIX}${r.factor}`,
      state: STATE_OF_RULE[r.verdict],
      params: {
        need: r.need ?? '', needLow: r.needLow ?? '', have: r.have ?? '', short: r.short ?? '',
        unit: r.unit, prov: input.job.province, basis: r.basis ? r.basis : undefined,
      },
      label: `${r.factor}${TV_LABEL.personNeedMid}${r.need ?? TV_LABEL.unknownValue} ${r.unit}`
        + `${TV_LABEL.personYouMid}${r.have ?? TV_LABEL.unanswered}${TV_LABEL.empArrow}${r.verdict}`,
      followups: slots?.length ? slots : undefined,
      quote: r.evidence.label,
      evidence: {
        label: r.evidence.label, url: r.evidence.url, fetched: r.evidence.fetched,
        section: r.evidence.section, effective: r.evidence.effective,
      },
    })
  }
  return out
}

/**
 * 时间窗那一行:许可还剩多久。
 *
 * @param input 判定档案。
 * @returns 那一行;没答就挂 followups 点名要这一格。
 */
function timeRow(input: TimeRowIn): TimeRowOut {
  const m = input.profile.permitMonthsLeft
  const left = m == null ? TV_LABEL.unanswered : `${m}${TV_LABEL.permitMonthsTail}`
  return {
    gate: GATE_OF.person, tier: TIER_OF.paid, key: TV_PERSON.permit,
    state: m == null ? CARD_STATE.unknown : CARD_STATE.info,
    params: { months: m ?? '', status: input.profile.status ?? '' },
    label: `${TV_LABEL.permitHead}${left}${TV_LABEL.permitStatusMid}`
      + `${input.profile.status ?? TV_LABEL.unknownValue}${TV_LABEL.parenRight}`,
    followups: m == null ? [CARD_SLOT.permitMonthsLeft] : undefined,
  }
}

/**
 * 换省对照:目标省有没有这个职业的具名清单。
 *
 * 🔴 **只摆事实作对照,判定仍按手上这份岗算** —— 他手上的 offer 在这份岗的省,
 * 拿目标省的清单去改判这份 offer,是替他换了一个他还没有的处境。
 *
 * @param input 岗位、判定档案与全量职业清单行。
 * @returns 对照的那几行;一个目标省都没答时是「没得对照」那一行。
 */
function crossProvinceRows(input: CrossProvinceRowsIn): CrossProvinceRowsOut {
  const out: TripleRow[] = []
  if (!input.profile.targetProvinces.length) {
    out.push({
      gate: GATE_OF.person, tier: TIER_OF.paid, key: TV_PERSON.noTarget, state: CARD_STATE.unknown,
      params: { basisProv: input.job.province }, followups: [CARD_SLOT.targetProvinces],
      label: TV_LABEL.compareNoTarget,
    })
    return out
  }
  for (const prov of input.profile.targetProvinces) {
    if (prov === input.job.province) continue
    const hits: OccupationRow[] = []
    if (input.job.noc) {
      for (const o of input.occs) {
        if (o.noc === input.job.noc && o.province === prov && o.type === INDEMAND) hits.push(o)
      }
    }
    if (!hits.length) {
      out.push({
        gate: GATE_OF.person, tier: TIER_OF.paid, key: TV_PERSON.compareNotListed, state: CARD_STATE.info,
        params: {
          prov: prov, basisProv: input.job.province,
          noc: input.job.noc ?? '', nocName: input.job.nocName ?? '',
        },
        label: `${TV_LABEL.targetHead}${prov}${SEP.colon} ${input.job.noc ?? TV_LABEL.unknownValue}`
          + `${TV_LABEL.targetNotListedMid}`,
      })
      continue
    }
    for (const o of hits) {
      out.push({
        gate: GATE_OF.person, tier: TIER_OF.paid, key: TV_PERSON.compareListed, state: CARD_STATE.info,
        params: {
          prov: prov, basisProv: input.job.province, noc: o.noc,
          nocName: input.job.nocName || o.name, stream: o.stream, list: o.label,
        },
        label: `${TV_LABEL.targetHead}${prov}${SEP.colon} ${o.noc}${TV_LABEL.targetListedMid}${o.stream}`
          + `${TV_LABEL.targetOfferTail}${input.job.province}${TV_LABEL.targetVerdictTail}`,
        quote: quoteOfOcc({ o: o }), evidence: evOfOcc({ r: o }),
      })
    }
  }
  return out
}

/**
 * 比路:哪几条线值得摆 + 谁最快。
 *
 * 名次与 tier **全部来自 `pathVerdict`**(排序语义原样复用);本层只做入选与并列标记:
 * 入选 = 手上这份岗所在省的通道 ∪(雇主已被 AIP 名录指定时的 AIP 线)∪ 目标省的通道;
 * 最快 = tier 最小的**可判**通道(availability=ok 且非排除)。并列就都标 true。
 *
 * 🔴 库里没有那条通道的门槛行 → `pathVerdict` 给 `not-collected`,这里永远选不上它当最快 ——
 * 这就是「AIP 行抽掉后必须退化成缺口」的实现点,不是靠文案兜。
 * 🔴 目标省的线**不参与「最快」评比**:tier 的语义是「offer 到手后还要等多久」,而他手上的 offer
 * 在这份岗的省 —— 拿一份他没有的 offer 去跟手上这份比谁快,是替他排队。
 *
 * @param input 岗位、公司、判定档案与 13 条通道的裁决。
 * @returns 入选的那几条,带名次与「是不是最快」。
 */
function compareRows(input: CompareRowsIn): CompareRowsOut {
  const targets = new Set<string>()
  for (const p of input.profile.targetProvinces) if (p !== input.job.province) targets.add(p)
  const aipDesignated = input.company.designation?.source === AIP_SOURCE
  const rows: TripleCompareRow[] = []
  let rank = 0
  for (const v of input.paths) {
    let role: TripleCompareRole | null = null
    if (v.key === AIP_SOURCE) role = aipDesignated ? COMPARE_ROLE.aip : null
    else if (v.province === input.job.province) role = COMPARE_ROLE.current
    else if (targets.has(v.province)) role = COMPARE_ROLE.target
    if (role) {
      rows.push({
        key: v.key, province: v.province, stream: v.stream, role: role,
        verdict: v.verdict, tier: v.tier, availability: v.availability, rank: rank, fastest: false,
      })
    }
    rank += 1
  }
  let min: number | null = null
  for (const r of rows) {
    if (!judgeableRow({ row: r })) continue
    if (min == null || (r.tier as number) < min) min = r.tier as number
  }
  if (min != null) {
    for (const r of rows) if (judgeableRow({ row: r }) && r.tier === min) r.fastest = true
  }
  return rows
}

/**
 * 这一条线**够得着「最快」的评比**吗 —— 目标省的不算,判不了的不算,排除的不算。
 *
 * @param input 比路里的一行。
 * @returns 够得着则 true。
 */
function judgeableRow(input: JudgeableRowIn): JudgeableRowOut {
  if (input.row.role === COMPARE_ROLE.target) return false
  if (input.row.availability !== AVAIL.ok) return false
  return input.row.verdict !== REASON.excluded && input.row.tier != null
}

/**
 * 结论句挑通道 = 这份岗所在省的通道 ∪(雇主已被 AIP 指定时的 AIP 线),**目标省的不参与**。
 *
 * @param input 比路的那几行与 13 条通道的裁决。
 * @returns 可判的那几条,比路行与裁决配成对。
 */
function myPathways(input: MyPathwaysIn): MyPathwaysOut {
  const byKey = new Map<string, PathwayVerdict>()
  for (const p of input.paths) byKey.set(p.key, p)
  const out: MyPathway[] = []
  for (const c of input.compare) {
    if (c.role === COMPARE_ROLE.target || c.availability !== AVAIL.ok) continue
    const v = byKey.get(c.key)
    if (v) out.push({ c: c, v: v })
  }
  return out
}

/**
 * 结论句:一句话说清「这份岗现在行不行、卡在哪」。
 *
 * 取舍次序:职业被官方排除 → 有能走的 → 被闸卡住 → 判不了 → 本站未收录该省门槛。
 * 「有能走的」优先于「被卡住」:同省多条通道时,**能走一条就是能走**,不拿最差那条吓人。
 *
 * 被卡住时报**最好拆的那道闸**(它就是「下一步该干什么」),次序共用 `BLOCK_COST`。
 * 语言差档要报**官方门槛值**:他答过 CLB,一句「你还缺语言成绩」会读成「我们没收到你的答案」;
 * `need` 取自 `pathVerdict` 已经算好的那条理由(官方门槛,免费事实),**差多少不进这里**(那是付费位)。
 *
 * 判不了时**只取 `pathVerdict` 自己记的 missingSlots**(他一步能补的那几样),不拿整卡的 followups
 * 凑数:工签剩余月数 / 家庭人数 / 目标省是时间窗、资金档、换省对照要的,它们缺不缺都不决定
 * 「这份岗能不能走」,写进结论句就是拿无关项挡人。一个槽都点不出来 = 缺的是条文不是答案 → 落
 * `not-collected`(谁的窟窿说清楚)。
 *
 * @param input 岗位、整卡的行、比路的行与 13 条通道的裁决。
 * @returns 那一句结论。
 */
function conclude(input: ConcludeIn): ConcludeOut {
  const excluded = excludedRow({ rows: input.rows })
  if (excluded) {
    const list = String(excluded.params.list ?? '')
    return {
      kind: SUM_KIND.excluded, key: TV_SUM.excluded,
      params: {
        prov: input.job.province, list: list,
        noc: input.job.noc ?? '', nocName: input.job.nocName ?? '',
      },
      label: `${TV_LABEL.sumExcludedHead}${input.job.noc ?? TV_LABEL.unknownValue}`
        + `${TV_LABEL.sumOnMid}${list}${TV_LABEL.sumInMid}${input.job.province}`,
    }
  }
  const mine = myPathways({ compare: input.compare, paths: input.paths })
  return concludeOpen({ job: input.job, mine: mine })
    ?? concludeBlocked({ job: input.job, mine: mine })
    ?? concludeNeedsInfo({ job: input.job, mine: mine })
    ?? {
      kind: SUM_KIND.notCollected, key: TV_SUM.notCollected,
      params: { prov: input.job.province, considered: input.compare.length },
      label: `${TV_LABEL.sumNotCollectedHead}${input.job.province}${SPACE}${SEP.parenL}`
        + `${input.compare.length}${TV_LABEL.sumComparedTail}`,
    }
}

/**
 * 整卡里有没有「职业被官方排除」那一行。
 *
 * @param input 整卡的行。
 * @returns 那一行;没有则 null。
 */
function excludedRow(input: ExcludedRowIn): ExcludedRowOut {
  for (const r of input.rows) if (r.key === TV_OCC.excluded) return r
  return null
}

/**
 * ① 能走的:open 且没被闸卡住。并列时取 tier 最小(`pathVerdict` 的排序语义,本层不重排)。
 *
 * @param input 岗位与可判的那几条。
 * @returns 那一句结论;一条能走的都没有则 null。
 */
function concludeOpen(input: ConcludeOpenIn): ConcludeOpenOut {
  const open: MyPathway[] = []
  for (const x of input.mine) if (x.v.verdict === VERDICT.viable && !x.v.blockedBy) open.push(x)
  if (!open.length) return null
  open.sort(byTierAsc)
  const top = open[0]
  return {
    kind: SUM_KIND.ok, key: TV_SUM.ok, pathway: top.c.key,
    params: {
      route: top.c.key, prov: input.job.province, tier: top.c.tier ?? '', count: open.length,
    },
    label: `${TV_LABEL.sumOkHead}${top.c.key}${TV_LABEL.sumOpenMid}`
      + `${top.c.tier ?? TV_LABEL.unknownValue}${SEP.parenR}${SEP.commaSpace}${open.length}`
      + `${TV_LABEL.sumClearTail}`,
  }
}

/**
 * ② 被卡住的:报最好拆的那道闸。
 *
 * @param input 岗位与可判的那几条。
 * @returns 那一句结论;没有被卡住的则 null。
 */
function concludeBlocked(input: ConcludeBlockedIn): ConcludeBlockedOut {
  const blocked: RankedBlock[] = []
  for (const x of input.mine) if (x.v.blockedBy) blocked.push({ x: x, cost: blockCost(x.v.blockedBy) })
  if (!blocked.length) return null
  blocked.sort(byCostAsc)
  const top = blocked[0].x
  let need = 0
  if (top.v.blockedBy === FACTOR.language) {
    for (const r of top.v.reasons) {
      if (r.key !== PV_KEY_LANG_GAP) continue
      need = Number(r.params?.clb ?? 0)
      break
    }
  }
  return {
    kind: SUM_KIND.blocked, key: TV_SUM.blocked, pathway: top.c.key, gate: top.v.blockedBy,
    params: {
      gate: top.v.blockedBy ?? '', route: top.c.key, prov: input.job.province,
      count: blocked.length, need: need > 0 ? need : undefined,
    },
    label: `${TV_LABEL.sumBlockedHead}${top.c.key}${TV_LABEL.sumNeedsMid}${top.v.blockedBy}`
      + (need > 0 ? `${TV_LABEL.sumClbHead}${need}${SEP.parenR}` : ''),
  }
}

/**
 * ③ 判不了:点名缺哪个档案槽。
 *
 * 点名是**哪条通道**判不了:这张卡挂在一份 PE 的岗上,结论却可能说的是 AIP(PE 自己那条本站没收录
 * 资格页,压根进不了这一批)—— 不写通道名,用户读到的就是「爱德华王子岛判不了」。
 *
 * @param input 岗位与可判的那几条。
 * @returns 那一句结论;点不出槽则 null(那说明缺的是条文不是答案)。
 */
function concludeNeedsInfo(input: ConcludeNeedsInfoIn): ConcludeNeedsInfoOut {
  const needs: MyPathway[] = []
  for (const x of input.mine) if (x.v.verdict === REASON.needsInfo) needs.push(x)
  if (!needs.length) return null
  const seen = new Set<string>()
  const slots: string[] = []
  for (const x of needs) {
    for (const s of x.v.missingSlots ?? []) {
      if (seen.has(s)) continue
      seen.add(s)
      slots.push(s)
    }
  }
  if (!slots.length) return null
  return {
    kind: SUM_KIND.needsInfo, key: TV_SUM.needsInfo, pathway: needs[0].c.key,
    params: { slots: slots, route: needs[0].c.key, prov: input.job.province, count: needs.length },
    label: `${TV_LABEL.sumNeedsInfoHead}${needs[0].c.key}${TV_LABEL.sumUndecidableMid}`
      + `${slots.join(SEP.comma)}`,
  }
}

/**
 * 判定核用的那份档案 —— **offer 闸在这张卡恒视为已满足**。
 *
 * 带岗判定的前提就是「拿这份岗当目标」(2026-08-13 Frank:「缺 job offer 还用你判定啊?来这个网站
 * 不都是缺 job offer 的吗」)。这张卡回答的是「**拿下这份 offer 之后**还卡在哪」——比路行的语义
 * 本来就是 fastest after offer,拿「你现在没 offer」当拦路结论是对每个访客说同一句废话。
 *
 * 🔴 只改这张带岗卡:无岗初评(`/api/profile-pathways`)仍按真实答案判 offer 闸。
 *
 * @param input 卡片用的判定档案。
 * @returns 判定核认的档案,`hasOffer` 恒 true。
 */
function profileWithOffer(input: ProfileWithOfferIn): ProfileWithOfferOut {
  return {
    age: input.p.age, married: input.p.married, clb: input.p.clb, edu: input.p.edu,
    eduYears: input.p.eduYears, canadaStudy: input.p.canadaStudy, studyProvince: input.p.studyProvince,
    noc: input.p.noc, teer: input.p.teer,
    expCanadaMonths: input.p.expCanadaMonths, expForeignMonths: input.p.expForeignMonths,
    foreignExpSelfEmployed: input.p.foreignExpSelfEmployed, status: input.p.status,
    province: input.p.province, hasOffer: true, inCanada: input.p.inCanada,
    fieldMatch: input.p.fieldMatch, frenchOk: input.p.frenchOk, permit: input.p.permit,
    scoreProfile: input.p.scoreProfile, scoreRows: input.p.scoreRows, wage: input.p.wage,
    areaI: input.p.areaI, scoreTicks: input.p.scoreTicks,
  }
}

/**
 * 「offer 到手后哪条线最快」那一行。
 *
 * @param input 比路的那几行。
 * @returns 那一行;一条可判的都没有时说清是**门槛没收录**,不给结论。
 */
function fastestRow(input: FastestRowIn): FastestRowOut {
  const keys: string[] = []
  let tier: number | null = null
  for (const c of input.compare) {
    if (!c.fastest) continue
    if (!keys.length) tier = c.tier
    keys.push(c.key)
  }
  const tied = keys.length > 1
  return {
    gate: GATE_OF.person, tier: TIER_OF.paid, key: TV_YOU.fastest,
    state: keys.length ? CARD_STATE.info : CARD_STATE.unknown,
    params: {
      keys: keys, tier: tier ?? '', tied: tied, considered: input.compare.length,
    },
    label: keys.length
      ? `${TV_LABEL.fastestHead}${keys.join(SEP.commaSpace)}${TV_LABEL.fastestTierMid}${tier}`
        + `${tied ? TV_LABEL.fastestTied : ''}${SEP.parenR}`
      : `${TV_LABEL.fastestNoneHead}${input.compare.length}${TV_LABEL.fastestNoneTail}`,
  }
}

/**
 * 这份岗所在省**本站没收录门槛**的通道 —— 说出来,不许静默丢掉。
 *
 * 🔴 CLAUDE.md:未收录是我们的问题,得让用户知道该去官网看。先前它们只是进不了比路,页面上一个字
 * 都没有 —— 于是一张 PE 的岗上写着「判不了」,而判不了的其实是 AIP,PEI 那条压根没露过面。
 *
 * @param input 岗位与比路的那几行。
 * @returns 那一行;没有这种通道则 null。
 */
function notCollectedRow(input: NotCollectedRowIn): NotCollectedRowOut {
  const routes: string[] = []
  for (const c of input.compare) {
    if (c.role === COMPARE_ROLE.target || c.availability === AVAIL.ok) continue
    routes.push(c.key)
  }
  if (!routes.length) return null
  return {
    gate: GATE_OF.person, tier: TIER_OF.free, key: TV_YOU.notCollected, state: CARD_STATE.unknown,
    params: { routes: routes, prov: input.job.province },
    label: `${TV_LABEL.notOnFileHead}${routes.join(SEP.commaSpace)}${TV_LABEL.notOnFileTail}`,
  }
}

/**
 * 整卡去重后的缺槽点名。
 *
 * @param input 整卡的行。
 * @returns 每个槽只出现一次,按第一次出现的次序。
 */
function cardFollowups(input: CardFollowupsIn): CardFollowupsOut {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of input.rows) {
    for (const s of r.followups ?? []) {
      if (seen.has(s)) continue
      seen.add(s)
      out.push(s)
    }
  }
  return out
}

/**
 * 岗 × 雇主 × 档案 → 一张判定卡的结构化行。
 *
 * **纯函数** —— 门槛/清单/名录行与公司事实由调用方查好传进来,本域不另起数据面。
 *
 * 「你这边」那一行是**免费**裁决行(被卡住的那道闸,与结论句同源,也与本页免费的方案卡同源);
 * 逐项数值差(差几分 / 差几个月)仍在付费行,免费/付费口径没动。
 *
 * @param input 岗位、公司、判定档案、六张底表与「今年是哪年」。
 * @returns 一张判定卡。
 */
export function tripleVerdict(input: TripleVerdictIn): TripleVerdictOut {
  const nowYear = input.nowYear ?? new Date().getFullYear()
  const provReqs: ReqRow[] = []
  for (const r of input.data.requirements) if (r.province === input.job.province) provReqs.push(r)
  const emp = employerVerdict({
    facts: input.company.facts, province: input.job.province,
    reqs: input.data.requirements, nowYear: nowYear,
  })
  const paths = pathVerdict({ profile: profileWithOffer({ p: input.profile }), data: input.data })

  const rows: TripleRow[] = []
  for (const one of occupationRows({ job: input.job, occs: input.data.occupations, provReqs: provReqs })) {
    rows.push(one)
  }
  for (const one of employerRows({
    job: input.job, company: input.company, ev: emp, reqs: input.data.requirements,
  })) rows.push(one)
  for (const one of personRows({ job: input.job, profile: input.profile, provReqs: provReqs })) {
    rows.push(one)
  }
  rows.push(timeRow({ profile: input.profile }))
  for (const one of crossProvinceRows({
    job: input.job, profile: input.profile, occs: input.data.occupations,
  })) rows.push(one)

  const compare = compareRows({
    job: input.job, company: input.company, profile: input.profile, paths: paths,
  })
  rows.push(fastestRow({ compare: compare }))

  const conclusion = conclude({ job: input.job, rows: rows, compare: compare, paths: paths })
  if (conclusion.gate) {
    rows.push({
      gate: GATE_OF.person, tier: TIER_OF.free, key: TV_YOU.gate, state: CARD_STATE.gap,
      params: {
        gate: conclusion.gate, route: conclusion.params.route ?? '', prov: input.job.province,
      },
      label: `${TV_LABEL.youHead}${conclusion.pathway}${TV_LABEL.youBlockedMid}${conclusion.gate}`,
    })
  }
  const notCollected = notCollectedRow({ job: input.job, compare: compare })
  if (notCollected) rows.push(notCollected)

  return {
    jobId: input.job.id, conclusion: conclusion,
    noc: input.job.noc, nocName: input.job.nocName, teer: input.job.teer, province: input.job.province,
    rows: rows, compare: compare, employer: emp, pathways: paths,
    followups: cardFollowups({ rows: rows }),
    availability: provReqs.length ? AVAIL.ok : AVAIL.notCollected,
  }
}

/**
 * 档案/答案里的数字槽:**非有限数一律当没答**(null),不拿 0 冒充「答过是 0」。
 *
 * ⚠️ 与取库那格的 `numOf` 不是一回事:那个把空串当 null,这个交给 `Number('')` 会得到 0 ——
 * 两处口径混用会把「没答」读成「答了 0」。
 *
 * @param input 那一格的原值。
 * @returns 数字;没答或不是数则 null。
 */
function answerNum(input: AnswerNumIn): AnswerNumOut {
  if (input.v == null) return null
  const n = Number(input.v)
  return Number.isFinite(n) ? n : null
}

/**
 * 库里一行岗位 → 判定卡认的岗位。
 *
 * @param input 库里那一行。
 * @returns 判定卡认的岗位。
 */
function tripleJobOf(input: TripleJobOfIn): TripleJobOfOut {
  const r = input.row
  return {
    id: Number(r.id), title: strOf(r.title) ?? '', noc: strOf(r.noc), nocName: strOf(r.noc_title),
    teer: numOf(r.teer), province: strOf(r.province) ?? '', city: strOf(r.city) ?? '',
    pnpEligible: !!r.pnp_eligible, pnpStream: strOf(r.pnp_stream) ?? '',
    eeCategory: strOf(r.ee_category) ?? '', aip: !!r.aip,
    employmentTerm: strOf(r.employment_term) ?? '', employmentHours: strOf(r.employment_hours) ?? '',
  }
}

/**
 * 库里一行公司登记事实 → 雇主判定认的事实。
 *
 * 查不到就整份留 null —— `employerVerdict` 落 unknown,**不编**。
 *
 * @param input 库里那一行;查不到则 null。
 * @returns 雇主判定认的事实。
 */
function employerFactsOf(input: EmployerFactsOfIn): EmployerFactsOfOut {
  const f = input.row
  if (!f) return { foundedYear: null, registryStatus: null, staffEst: null, staffEstSrc: null, sector: null }
  return {
    foundedYear: numOf(f.founded_year),
    registryStatus: strOf(f.registry_status),
    staffEst: numOf(f.staff_est),
    staffEstSrc: strOf(f.staff_est_src),
    sector: strOf(f.sector),
  }
}

/**
 * 库里那一格 `lmia_nocs` → 「这家给哪几个 NOC 批过多少次」。
 *
 * 只认五位 NOC 码且次数大于 0 的格子。列值坏或没回填一律 null ——
 * 🔴 渲染层必须分得清「0 次」与「没数据」,所以这里**不折成空对象**。
 *
 * @param input 库里那一格的原值。
 * @returns 那张表;没数据则 null。
 */
function lmiaNocsOf(input: LmiaNocsOfIn): LmiaNocsOfOut {
  if (!input.raw) return null
  const dict = parseNocDict({ text: input.raw })
  if (!dict) return null
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(dict)) {
    if (NOC_CODE.test(k) && Number(v) > 0) out[k] = Number(v)
  }
  return out
}

/**
 * 把那一格文本读成一张表。
 *
 * 🔴 `try` 与 `typeof` 都留在这里,因为这是**信任边界**:这一格是抓取回填的,
 * 文本坏掉、或者根本不是一个对象(数字、数组)都是真会发生的,而 `JSON.parse` 的产物
 * 编译器一个字都担保不了。**整个域里只有这一处做这件事**,别的函数拿到的已经是一张表。
 *
 * 读不出来回 null 不算兜底成假事实 —— null 的意思就是「没数据」,
 * 与「0 次」在渲染层是两回事。
 *
 * @param input 那一格的文本。
 * @returns 那张表;读不出来则 null。
 */
function parseNocDict(input: ParseNocDictIn): ParseNocDictOut {
  try {
    const parsed: Record<string, Cell> = JSON.parse(input.text)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/**
 * 服务端档案 + 本地答案 → 判定卡认的那份档案。
 *
 * 🔴 **逐槽合并,服务端档案优先**,本地答案只补它缺的那几样 —— 落过档的不该被本地旧答案覆盖。
 * 匿名用户没有服务端档案,整份就用本地答案(2026-08-12 Frank「匿名也可以访问」)。
 *
 * TEER 由 NOC 第二位推(全站同一条口径)。先前硬写 null → 挑经验门槛行时**凡是分 TEER 的行一条
 * 都挑不到** → 恒报「本站未收录」,把用户没答说成我们没数据。
 *
 * @param input 服务端档案与本地答案。
 * @returns 判定卡认的档案。
 */
function tripleProfileOf(input: TripleProfileOfIn): TripleProfileOfOut {
  const up = input.up
  const a = input.answers ?? {}
  const noc0 = firstNoc({ up: up, answers: a })
  const permitLeft = answerNum({ v: up.pgwpMonthsLeft }) ?? answerNum({ v: a.pgwpMonthsLeft })
  const statusRaw = String(up.currentStatus ?? '') || String(a.currentStatus ?? '')
  const totalExp = answerNum({ v: a.totalExpMonths })
  const canExpA = answerNum({ v: a.canadianExpMonths })
  const foreign = answerNum({ v: up.expForeignMonths })
  return {
    age: null, married: null,
    clb: answerNum({ v: up.clb }) ?? answerNum({ v: a.clb }),
    edu: null, eduYears: null,
    canadaStudy: boolOf({ fromProfile: up.canadaStudy, fromAnswers: a.canadaStudy }),
    studyProvince: provinceOf({ v: a.studyProvince }),
    fieldMatch: answerBool({ v: a.fieldMatch }),
    frenchOk: answerBool({ v: a.frenchOk }),
    noc: noc0, teer: noc0 && NOC_CODE.test(noc0) ? Number(noc0[TEER_DIGIT]) : null,
    expCanadaMonths: answerNum({ v: up.expCanadaMonths }) ?? canExpA,
    expForeignMonths: foreign ?? (totalExp == null ? null : Math.max(0, totalExp - (canExpA ?? 0))),
    foreignExpSelfEmployed: null,
    hasOffer: boolOf({ fromProfile: up.hasOffer, fromAnswers: a.hasJobOffer }),
    inCanada: statusRaw ? statusRaw !== STATUS_OVERSEAS : null,
    status: permitLeft != null && permitLeft > 0 ? STATUS_OF.pgwp : (STATUS_OF[statusRaw] ?? null),
    province: provinceOf({ v: a.residenceProvince }),
    permit: permitOf({ v: a.permit }),
    permitMonthsLeft: permitLeft,
    targetProvinces: targetProvincesOf({ up: up, answers: a }),
    familySize: answerNum({ v: up.familySize }) ?? answerNum({ v: a.familySize }),
  }
}

/**
 * 布尔槽的逐槽合并:服务端档案优先,两边都不是布尔就当没答。
 *
 * @param input 服务端档案那一格与答案那一格。
 * @returns 布尔;没答则 null。
 */
function boolOf(input: BoolOfIn): BoolOfOut {
  return answerBool({ v: input.fromProfile }) ?? answerBool({ v: input.fromAnswers })
}

/**
 * 档案/答案里的布尔槽:**不是布尔就当没答**(null)。
 *
 * 不拿 `!!v` 收 —— 那会把「没答」和「答了否」压成同一个 false,而这两件事在判定里
 * 一个是 needs-info、一个是硬否定。
 *
 * @param input 那一格的原值。
 * @returns 布尔;没答则 null。
 */
function answerBool(input: AnswerBoolIn): AnswerBoolOut {
  return typeof input.v === 'boolean' ? input.v : null
}

/**
 * 档案/答案里的文本槽:**空串也当没答**。
 *
 * @param input 那一格的原值。
 * @returns 文本;没答则 null。
 */
function answerText(input: AnswerTextIn): AnswerTextOut {
  return typeof input.v === 'string' && input.v ? input.v : null
}

/**
 * 省码那一格 —— 对不上形状就当没答。
 *
 * @param input 那一格的原值。
 * @returns 省码;没答则 null。
 */
function provinceOf(input: ProvinceOfIn): ProvinceOfOut {
  const s = String(input.v ?? '')
  return PROVINCE_CODE.test(s) ? s : null
}

/**
 * 许可那一格 —— 对不上四个取值就当没答。
 *
 * @param input 那一格的原值。
 * @returns 许可;没答则 null。
 */
function permitOf(input: PermitOfIn): PermitOfOut {
  const s = String(input.v ?? '')
  for (const k of PERMIT_KINDS) if (k === s) return k
  return null
}

/**
 * 他的第一个 NOC —— 服务端档案的清单优先,再看答案的清单,最后看答案里单填的那一个。
 *
 * @param input 服务端档案与答案。
 * @returns NOC 码;没答则 null。
 */
function firstNoc(input: FirstNocIn): FirstNocOut {
  const fromProfile = input.up.nocCodes
  if (Array.isArray(fromProfile) && fromProfile.length) return String(fromProfile[0])
  const fromAnswers = input.answers.nocs
  if (Array.isArray(fromAnswers) && fromAnswers.length) return String(fromAnswers[0])
  return answerText({ v: input.answers.noc })
}

/**
 * 他想去哪几个省 —— 服务端档案优先。
 *
 * @param input 服务端档案与答案。
 * @returns 省码清单;没答则空。
 */
function targetProvincesOf(input: TargetProvincesOfIn): TargetProvincesOfOut {
  const fromProfile = input.up.targetProvinces
  const fromAnswers = input.answers.targetProvinces
  const list = Array.isArray(fromProfile) && fromProfile.length
    ? fromProfile
    : Array.isArray(fromAnswers) ? fromAnswers : []
  const out: string[] = []
  for (const p of list) out.push(String(p))
  return out
}

/**
 * 付费闸:付费行对非 Pro **只留 gate / tier / key**。
 *
 * 🔴 锁合成不锁事实 —— `params` / `quote` / `evidence` **根本不出服务器**,不许先发再用 CSS 遮。
 * 行数与关别可见,是为了让用户看见锁了几行什么结论。
 *
 * @param input 整卡的行与「他是不是 Pro」。
 * @returns 下行的那几行。
 */
function wireRows(input: WireRowsIn): WireRowsOut {
  const out: TripleWireRow[] = []
  for (const row of input.rows) {
    if (row.tier !== TIER_OF.free && !input.pro) {
      out.push({ gate: row.gate, tier: row.tier, key: row.key, locked: true })
      continue
    }
    out.push({
      gate: row.gate, tier: row.tier, key: row.key, state: row.state, params: row.params,
      quote: row.quote ? row.quote : undefined,
      evidence: row.evidence ? row.evidence : undefined,
      followups: row.followups ? row.followups : undefined,
    })
  }
  return out
}

/**
 * 判定卡的**下行数据**(wire)—— 同一份,给两处用:实时判定的接口,与 `/plan/pr?job=` 的 SSR 首屏。
 *
 * 🔴 **付费闸在服务端**:非 Pro 的付费行只下发 gate/tier/key —— 锁合成不锁事实,
 * `params` / `quote` / `evidence` 根本不出服务器,不许先发再用 CSS 遮。
 *
 * 🔴 本函数**不碰 `payload`**:连接池、登录态、六张底表、名录缓存全部由调用方注进来
 * (宪法「取数函数收一个能 query 的东西当参数」)。TTL 缓存是路由层的基建,不属于本域。
 *
 * 匿名可用(2026-08-12 Frank「匿名也可以访问」)。
 *
 * @param input 连接池、岗位号、两份答案、登录与付费态、六张底表与名录取数函数。
 * @returns 整张卡;岗位号不成立或库里没有这份岗时是一句错误加 HTTP 码。
 */
export async function buildTripleWire(input: BuildTripleWireIn): BuildTripleWireOut {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { error: WIRE_ERR.jobRequired, status: HTTP.badRequest }
  }
  const found = await oneRow({ db: input.db, sql: SQL.TRIPLE_WIRE_JOB, params: [input.id] })
  if (!found) return { error: WIRE_ERR.notFound, status: HTTP.notFound }

  const job = tripleJobOf({ row: found })
  const company = await tripleCompanyOf({
    db: input.db, row: found, province: job.province, designatedOf: input.designatedOf,
  })
  const profile = tripleProfileOf({ up: input.profile, answers: input.answers })
  const card = tripleVerdict({ job: job, company: company, profile: profile, data: input.data })

  return {
    ok: true,
    jobId: card.jobId, noc: card.noc, nocName: card.nocName, teer: card.teer, province: card.province,
    nocTitleZh: strOf(found.noc_title_zh), nocTitleKo: strOf(found.noc_title_ko),
    conclusion: card.conclusion,
    availability: card.availability,
    loggedIn: input.loggedIn, pro: input.pro,
    hasProfile: hasEnoughProfile({ profile: profile }),
    rows: wireRows({ rows: card.rows, pro: input.pro }),
  }
}

/**
 * 库里那一行岗位 + 公司侧两查 + 名录匹配 → 判定卡认的那家公司。
 *
 * 名录匹配的口径 = **完全匹配**(规范化后公司名 == 名录名的任一 o/a 名段)。
 * 老口径的双向子串包含会把 `Esso` 匹进 `Wheeler Accessories`(2026-08-09 全量审计坐实)。
 * 认不出 = designation 为 null 且 matches 为 0(本站的缺口,**不写「未被指定」**);
 * 多配 = designation 为 null 且 matches 为 N(只报家数,不点名加盟法人)。
 *
 * @param input 连接池、库里那一行岗位、省码与名录取数函数。
 * @returns 判定卡认的那家公司。
 */
async function tripleCompanyOf(input: TripleCompanyOfIn): TripleCompanyOfOut {
  const name = strOf(input.row.company_name) ?? ''
  const cid = numOf(input.row.company_id)
  const factsRow = cid == null
    ? null
    : await oneRow({ db: input.db, sql: SQL.COMPANY_REGISTRY_FACTS, params: [cid] })
  const nocsRow = cid == null
    ? null
    : await oneRow({ db: input.db, sql: SQL.COMPANY_LMIA_NOCS, params: [cid] })
  const dir = name && input.province ? await input.designatedOf({ province: input.province }) : []
  const hit = matchDesignation({ companyName: name, rows: dir })
  return {
    id: cid ?? 0,
    name: name,
    facts: employerFactsOf({ row: factsRow }),
    lmiaNocs: nocsRow ? lmiaNocsOf({ raw: strOf(nocsRow.lmia_nocs) }) : null,
    designation: designatedRow({ rows: dir, hit: hit.row }),
    designationMatches: hit.count, designationSource: hit.source,
  }
}

/**
 * 把 `matchDesignation` 认出的那一行,在候选里认回**带全部列**的原行。
 *
 * `matchDesignation` 只声明它需要 `name` / `source` 两格(好让任何名录都能喂给它),
 * 于是返回的那一行也只剩这两格;而判定卡还要用 `province` / `url` / `fetched`。
 * 认回来靠**对象同一性**(命中行本来就是候选数组里的那一个),不做第二次名字比对 ——
 * 再比一次就等于把匹配口径写了两份,迟早对不上。
 *
 * @param input 候选行与认出的那一行。
 * @returns 带全部列的原行;认不出或多配则 null。
 */
function designatedRow(input: DesignatedRowIn): DesignatedRowOut {
  if (!input.hit) return null
  for (const row of input.rows) if (row === input.hit) return row
  return null
}

/**
 * 打一条只取第一行的查询。
 *
 * 查挂了**留痕后**回 null,不让公司侧的补充查询拖垮主体(B3 那几列可能还没建)——
 * 但不许静默:「这家没数据」和「这条 SQL 一直在报错」在日志里必须分得开。
 *
 * @param input 连接池、SQL 与绑定参数。
 * @returns 第一行;查不到或查挂了则 null。
 */
async function oneRow(input: OneRowIn): OneRowOut {
  try {
    const res = await input.db.query(input.sql, input.params)
    return res.rows[0] ?? null
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    log({ tag: RULING_LOG.tag, text: `${RULING_LOG.companyQueryFailed}${why}` })
    return null
  }
}

/**
 * 他的档案够不够格跑个人关 —— 任一核心槽答过就算。
 *
 * **不以登录为前提**:本地答案带上来同样算,否则匿名带了答案面板还在劝他建档。
 * 全空档案跑个人关只会满屏「判不了」,不如引导他建档。
 *
 * @param input 判定卡认的那份档案。
 * @returns 够格则 true。
 */
function hasEnoughProfile(input: HasEnoughProfileIn): HasEnoughProfileOut {
  return input.profile.clb != null || input.profile.status != null || input.profile.noc != null
}

/**
 * 事实层:每条处境已核过的完整画像。
 *
 * 数字与字面量全在 `CASE_C01`(那是 JSON 装得下的),这里只把它拼成判定核认的形状 ——
 * 宪法「`constants.ts` 最多到 JSON,带库类型的结构拆成标量常量 + 一个构建函数」。
 *
 * @returns 案例编号 → 事实层。
 */
function caseProfiles(): CaseProfilesOut {
  return {
    [CASE_ID.c01]: {
      askedKey: CASE_C01.askedKey,
      profile: {
        age: CASE_C01.age, married: CASE_C01.married, clb: CASE_C01.clb,
        edu: CASE_C01.edu, eduYears: CASE_C01.eduYears,
        canadaStudy: CASE_C01.canadaStudy, studyProvince: CASE_C01.studyProvince,
        noc: CASE_C01.noc, teer: CASE_C01.teer,
        expCanadaMonths: CASE_C01.expCanadaMonths, expForeignMonths: CASE_C01.expForeignMonths,
        foreignExpSelfEmployed: CASE_C01.foreignExpSelfEmployed,
        status: CASE_C01.status, province: CASE_C01.province, permit: CASE_C01.permit,
        hasOffer: CASE_C01.hasOffer, inCanada: CASE_C01.inCanada,
        fieldMatch: CASE_C01.fieldMatch, frenchOk: CASE_C01.frenchOk,
      },
    },
  }
}

/**
 * 出页白名单 = **既写了 slug 又有事实层**的处境。
 *
 * 🔴 slug 的唯一来源是 `CASES` 的 `page` 字段,决策页的「看完整答案」读同一个字段 ——
 * 两边各写一份就会出死链。剩下那些只有问题、没有事实的处境不出页(摆一页空事实不如不出)。
 *
 * @returns slug → 出页处境。
 */
export function casePages(): CasePagesOut {
  const profiles = caseProfiles()
  const out: CasePagesOut = {}
  for (const c of CASES) {
    const spec = profiles[c.id]
    if (!c.page || !spec) continue
    out[c.page] = { caseId: c.id, askedKey: spec.askedKey, profile: spec.profile }
  }
  return out
}

/**
 * 处境页的答案层。
 *
 * 页面结构由 Frank 2026-08-11 定死:**先回答他问的那个省 → 说清为什么 → 再按由易到难给替代
 * → 最后给第一步**。上一版做成了「四块无主的事实」,被点名「列一堆信息,用户看了有什么用」——
 * 摆事实不等于给答案。
 *
 * 🔴 红线照旧:**一句结论都不是手写的**。排序、档位、理由、官方原句全部来自判定核,
 * 本层只负责挑出「他问的那条」、按档分组、把带训岗位数查出来当第一步。
 *
 * @param input 页面 slug、六张底表与能打 SQL 的东西。
 * @returns 整份答案;没有事实层的 slug 则 null。
 */
export async function caseAnswer(input: CaseAnswerIn): CaseAnswerOut {
  const spec = casePages()[input.slug]
  if (!spec) return null

  const byProv = await provCounts({ db: input.db, noc: spec.profile.noc ?? '' })
  const openings: Record<string, OpeningCount> = {}
  for (const r of byProv) openings[r.province] = { n: r.n, t: r.t }

  const all = pathVerdict({ profile: spec.profile, data: input.data })
  const rest: PathwayVerdict[] = []
  const excluded: PathwayVerdict[] = []
  let asked: PathwayVerdict | null = null
  for (const v of all) {
    if (v.key === spec.askedKey) asked = v
    if (v.verdict === REASON.excluded) excluded.push(v)
    else if (v.key !== spec.askedKey) rest.push(v)
  }

  const tiers: CaseTier[] = []
  for (const t of CASE_TIERS) {
    const rows = tierRows({ rest: rest, tier: t, openings: openings })
    if (rows.length) tiers.push({ tier: t, rows: rows })
  }

  const trainable = trainableRows({ rows: byProv })
  let trainableTotal = 0
  for (const x of trainable) trainableTotal += x.n

  return {
    asked: asked, tiers: tiers, excluded: excluded,
    trainable: trainable, trainableTotal: trainableTotal,
    openings: openings,
    ops: await opsByProvince({ db: input.db }),
  }
}

/**
 * 一次查两列:该职业各省在招岗数 `n`,其中官方标了带训 / 不要经验的 `t`。
 *
 * @param input 能打 SQL 的东西与职业码。
 * @returns 每省一行;查挂了则空(页面照出,只是第一步那块没数)。
 */
async function provCounts(input: ProvCountsIn): ProvCountsOut {
  const res = await input.db.query(SQL.CASE_PROV_COUNTS, [input.noc]).catch(emptyRows)
  const out: ProvCountRow[] = []
  for (const r of res.rows) {
    out.push({ province: strOf(r.province) ?? '', n: numOf(r.n) ?? 0, t: numOf(r.t) ?? 0 })
  }
  return out
}

/**
 * 查挂了时交回来的空结果 —— 给 `.catch()` 用的具名函数。
 *
 * @returns 一份空结果。
 */
function emptyRows(): EmptyRowsOut {
  return { rows: [] }
}

/**
 * 挑出某一档的通道,按**本省该职业在招岗数**降序。
 *
 * 同样是「无需积累」,一个省有 300 个岗、另一个省 3 个,对一个还没有 offer 的人来说
 * 这两条路根本不是一回事。跨省通道(AIP / RCIP / 联邦)没有单一省份 → 排到最后面。
 *
 * @param input 候选通道、要哪一档与各省在招计数。
 * @returns 这一档的通道,已排序。
 */
function tierRows(input: TierRowsIn): TierRowsOut {
  const ranked: RankedPathway[] = []
  for (const v of input.rest) {
    if (v.tier !== input.tier) continue
    ranked.push({ v: v, n: input.openings[v.province]?.n ?? NO_PROVINCE_RANK })
  }
  ranked.sort(byOpeningsDesc)
  const out: PathwayVerdict[] = []
  for (const x of ranked) out.push(x.v)
  return out
}

/**
 * 第一步:这个职业「提供带训 / 不要经验」的在招岗按省分布,多的在前。
 *
 * 零经验的人先要的是「谁肯带」,不是选省。
 *
 * @param input 每省的在招计数。
 * @returns 有带训岗的省;一个都没有则空(空本身也是答案)。
 */
function trainableRows(input: TrainableRowsIn): TrainableRowsOut {
  const out: TrainableRow[] = []
  for (const r of input.rows) if (r.t > 0) out.push({ province: r.province, n: r.t })
  out.sort(byCountDesc)
  return out
}

/**
 * 各省官方运营数字。
 *
 * 🔴 **省级口径不统一是事实**:AB 两头都有(池子 + 剩余名额),BC 只给池子分数段、不给名额,
 * SK / MB / ON 只给名额与提名量。硬算一个「几人抢一个」要么少一头、要么把不同口径混成一个数
 * —— 那是编。这里谁公布什么就取什么,显示层分别标注。
 *
 * 取每省最近一期的**全省合计**行(scope 为空 = 不分通道的总数)。
 *
 * @param input 能打 SQL 的东西。
 * @returns 省码 → 官方运营数字;查挂了则空。
 */
async function opsByProvince(input: OpsByProvinceIn): OpsByProvinceOut {
  const res = await input.db.query(SQL.PNP_OPS_STATS).catch(emptyRows)
  const out: Record<string, OpsFacts> = {}
  for (const r of res.rows) {
    const value = numOf(r.value)
    const prov = strOf(r.province) ?? ''
    const metric = strOf(r.metric) ?? ''
    if (value == null || !prov) continue
    const cur = out[prov] ?? {}
    out[prov] = cur
    applyOpsRow({ facts: cur, metric: metric, value: value })
    applyOpsPeriod({ facts: cur, metric: metric, period: strOf(r.period) || strOf(r.as_of) || '' })
    if (!cur.url) cur.url = strOf(r.url) ?? undefined
  }
  return out
}

/**
 * 把一行指标记到那个省的数字上。
 *
 * 不认识的指标名**直接丢掉**,不塞进任何一格 —— 记错一格比少记一格严重。
 *
 * @param input 那个省的数字、指标名与指标值。
 * @returns 没有返回值。
 */
function applyOpsRow(input: ApplyOpsRowIn): ApplyOpsRowOut {
  const f = input.facts
  if (input.metric === OPS_METRIC.allocation) f.allocation = input.value
  else if (input.metric === OPS_METRIC.nominated) f.nominated = input.value
  else if (input.metric === OPS_METRIC.refused) f.refused = input.value
  else if (input.metric === OPS_METRIC.invited) f.invited = input.value
  else if (input.metric === OPS_METRIC.received) f.received = input.value
  else if (input.metric === OPS_METRIC.poolTotal) f.poolTotal = input.value
}

/**
 * 把一行的期次记到那个省的数字上。
 *
 * 🔴 **按指标各记各的**:名额是全年,提名 / 拒签是年内至今,池子是它自己那一期 ——
 * 共用一个 period 会把上半年的数标成全年的(2026-08-11 实撞)。
 * 池子那格尤其要标:AB 是实时的、MB 是年报里的年末快照,不标期次就会被读成一样新鲜。
 *
 * @param input 那个省的数字、指标名与这一行的期次。
 * @returns 没有返回值。
 */
function applyOpsPeriod(input: ApplyOpsPeriodIn): ApplyOpsPeriodOut {
  const f = input.facts
  if (!input.period) return
  if (input.metric === OPS_METRIC.poolTotal) f.poolPeriod = input.period
  else if (input.metric === OPS_METRIC.allocation) f.allocPeriod = f.allocPeriod || input.period
  else f.ytdPeriod = f.ytdPeriod || input.period
}

/**
 * 档案 → 13 条通道的裁决。
 *
 * 契约照抄 docs/implementation/C5-判定层pathVerdict-20260805.md §三(定稿,不许改形状);
 * 通道知识的人肉核对版见 docs/design/案例C01-马龙木匠路径-路径分析-20260805.md §二/§三/§九。
 * 🔵 形状全部住 types.ts;`Availability` / `Evidence` 用**本域自己那份**,不再从对话域借。
 *
 * 13 条通道的声明 2026-08-15 搬进 `lib/pathways/`(一条通道一个文件,Frank「每个通道一个策略文件吧?
 * 不要混在一起吧」)。判定核直接读 `PATHWAYS`,不再自己攒表 —— 2026-08-20 连别名也不留了。
 *
 * 排序:open 在前(按 tier 升序)→ needs-info(按 **tier 潜力**升序:缺槽的门槛按 0 经验/0 居住的
 * 上界记档,tier0 潜力浮顶、库缺行的 null 沉底 —— §4.5 的 NL 掉桶修复,C6 选项卡推荐位同一套序)
 * → excluded 沉底(tier 恒 null → 注册表原序)。
 * **同 tier 不再排序**(v1 没有配额/竞争度入参,按注册表原序保持稳定 —— 编个次序出来等于替用户拿主意)。
 *
 * @param input 判定档案与六张底表。
 * @returns 13 条通道的裁决,已按上面这把尺子排好序。
 */
export function pathVerdict(input: PathVerdictIn): PathVerdictOut {
  const ranked: RankedVerdict[] = []
  let i = 0
  for (const spec of PATHWAYS) {
    const v = evaluateOne({ spec: spec, p: input.profile, data: input.data })
    ranked.push({ v: v, i: i, obstacle: obstacleRank({ v: v, profile: input.profile }), tier: v.tier ?? SINK.tier })
    i += 1
  }
  ranked.sort(byObstacleThenTier)
  const out: PathwayVerdict[] = []
  for (const one of ranked) out.push(one.v)
  return out
}

/**
 * 职业级档案:只填 NOC 与 TEER,其余槽位一律 null —— 判定核看不见任何个人事实。
 *
 * @param input 职业的 NOC 与 TEER。
 * @returns 只填了职业两格的判定档案。
 */
function profileOfOccupation(input: ProfileOfOccupationIn): ProfileOfOccupationOut {
  return {
    age: null, married: null, clb: null, edu: null, eduYears: null, canadaStudy: null,
    studyProvince: null, noc: input.noc, teer: input.teer, expCanadaMonths: null, expForeignMonths: null,
    foreignExpSelfEmployed: null, hasOffer: null, inCanada: null, status: null, province: null,
    permit: null, fieldMatch: null, frenchOk: null,
  }
}

/**
 * 职业级通道行(C6 职位详情页通道卡的无档案态)。
 *
 * 一个 NOC+TEER 进,13 条通道的**职业级**事实出(不含任何个人档案):
 * 经验门槛月数(排序键)、门槛口径(同雇主在职时长另标)、清单点名/排除、availability。
 * 有档案时详情卡不走这条 —— 直接用上面 pathVerdict 的序(设计 §五「双态」)。
 *
 * 排序:可判的按经验门槛升序 → 门槛未收录 → 清单排除沉底;同档按注册表原序(与卡片效果图一致)。
 *
 * 清单判定与 `occupationListReasons` 同口径,但**不共函数**:那边还要造 quote / evidence,
 * 这里只要两个布尔。
 *
 * @param input 职业的 NOC / TEER 与六张底表。
 * @returns 13 条通道的职业级事实行,已排好序。
 */
export function jobPathways(input: JobPathwaysIn): JobPathwaysOut {
  const p: VerdictProfile = profileOfOccupation({ noc: input.noc, teer: input.teer })
  const ranked: RankedJobRow[] = []
  let i = 0
  for (const spec of PATHWAYS) {
    const rows = reqsOf({ spec: spec, all: input.data.requirements })
    let listedIn = false
    let excludedByList = false
    if (input.noc) {
      for (const o of input.data.occupations) {
        if (o.province !== spec.reqProvince || o.noc !== input.noc) continue
        if (o.type === OCC_INELIGIBLE
          && (!o.appliesTo
            || o.appliesTo.toLowerCase().includes(APPLIES_OFFER) === EMPLOYMENT_OFFER_STREAM.test(spec.stream))) {
          excludedByList = true
        }
        if (o.type === INDEMAND) listedIn = true
      }
      const required = spec.listRequired
      if (required) {
        let listed = 0
        let onList = false
        for (const o of input.data.occupations) {
          if (o.province !== required.province || o.type !== INDEMAND) continue
          if (!required.streamRe.test(o.stream)) continue
          listed += 1
          if (o.noc === input.noc) onList = true
        }
        if (listed && !onList) excludedByList = true
      }
    }
    const gate = rows.length
      ? pickGate({ spec: spec, rows: rows, p: p, selfEmpExcluded: selfEmpExcludedIn({ rows: rows }) })
      : null
    const row: JobPathwayRow = {
      key: spec.key, province: spec.province, stream: spec.stream,
      months: gate?.picked ? gate.need : null, tenure: gate ? gate.tenure : false,
      listedIn: listedIn, excludedByList: excludedByList,
      availability: gate?.picked ? AVAIL.ok : AVAIL.notCollected,
    }
    ranked.push({ row: row, i: i, rank: jobRowRank({ row: row }), months: row.months ?? SINK.months })
    i += 1
  }
  ranked.sort(byListRankThenMonths)
  const out: JobPathwayRow[] = []
  for (const one of ranked) out.push(one.row)
  return out
}

/**
 * 一条通道的裁决排第几档:open(无阻碍)0 < open(被卡住)1 < needs-info 2 < excluded 3;没有这条 9。
 *
 * @param input 一条通道的裁决;前后对比时那一头可能压根没这条通道。
 * @returns 档次(越小越好)。
 */
function verdictRank(input: VerdictRankIn): VerdictRankOut {
  if (input.v == null) return VERDICT_RANK.absent
  if (input.v.verdict === VERDICT.viable) {
    return input.v.blockedBy ? VERDICT_RANK.blocked : VERDICT_RANK.open
  }
  return input.v.verdict === REASON.needsInfo ? VERDICT_RANK.needsInfo : VERDICT_RANK.excluded
}

/**
 * 换过职业之后这条通道有没有变差。
 *
 * 「接 TEER 5 岗会掉档」问的是**职业等级**这一件事,与「你今天够不够格」无关 ——
 * 原来只看 verdict===VERDICT.viable,门槛清单上线后大量通道落 needs-info(缺 offer 答案),
 * 这条杠杆会整条消失(2026-08-12 实撞)。改成**前后对比谁变差了**:先比档次,同档再比 tier。
 * 前后两次跑的是同一份档案,清单那三类闸的贡献一样,差出来的只会是 TEER 带来的。
 *
 * @param input 换职业前后的同一条通道的裁决。
 * @returns 变差了则 true。
 */
function gotWorse(input: GotWorseIn): GotWorseOut {
  const rankBefore = verdictRank({ v: input.before })
  const rankAfter = verdictRank({ v: input.after })
  if (rankAfter !== rankBefore) return rankAfter > rankBefore
  return (input.after?.tier ?? SINK.tier) > (input.before.tier ?? SINK.tier)
}

/**
 * ON 语言分:这个 CLB 够得着的最高那一档官方行(档位从官方标签自己解析,不写死)。
 *
 * @param input ON 的语言分值行与要问的 CLB 档。
 * @returns 够得着的最高那一行;一行都够不着则 null。
 */
function pickOnLangRow(input: PickOnLangRowIn): PickOnLangRowOut {
  let best: FactorThreshold | null = null
  for (const f of input.rows) {
    const th = maxClbIn({ labels: [f.label] })
    if (th == null || th > input.clb) continue
    if (best == null || th > best.th) best = { f: f, th: th }
  }
  return best ? best.f : null
}

/**
 * ① 接低 TEER 的岗(如 75110 construction trades helpers and labourers,TEER 5)会毁掉哪些通道。
 *
 * 不写死结论:拿改过 TEER 的同一份档案重跑一遍注册表,看哪几条从 open 掉出来。
 *
 * @param input 判定档案、六张底表与场景参数。
 * @returns 有通道掉档时的那一根杠杆;否则空。
 */
function teerDowngradeLever(input: TeerDowngradeLeverIn): TeerDowngradeLeverOut {
  const levers: VerdictLever[] = []
  const downNoc = input.opts.teerDowngradeNoc ?? TEER5_NOC
  if (input.profile.teer != null && input.profile.teer < TEER_LOWEST && input.profile.noc) {
    const before = pathVerdict({ profile: input.profile, data: input.data })
    const after = pathVerdict({ profile: profileWithNoc({ p: input.profile, noc: downNoc, teer: TEER_LOWEST }), data: input.data })
    const byKey = new Map<string, PathwayVerdict>()
    for (const v of after) byKey.set(v.key, v)
    const affected: string[] = []
    for (const v of before) {
      if (v.verdict === REASON.excluded) continue
      if (!gotWorse({ before: v, after: byKey.get(v.key) })) continue
      affected.push(v.key)
    }
    const teerRows: ReqRow[] = []
    for (const r of input.data.requirements) {
      if (r.factor !== FACTOR.experience || !r.appliesTeer || teerHit({ r: r, teer: TEER_LOWEST })) continue
      teerRows.push(r)
    }
    if (affected.length) {
      const teerReasons: VerdictReason[] = []
      for (const r of teerRows.slice(0, TEER_REASONS_SHOWN)) {
        teerReasons.push({
          kind: REASON.excluded,
          text: `${r.province} ${r.stream}${PV_TEXT.teerOnlyMid}${r.appliesTeer}`,
          quote: quoteOfReq({ r: r }), evidence: evOfReq({ r: r }),
        })
      }
      levers.push({
        key: LEVER.teerDowngrade,
        text: `${PV_TEXT.switchToHead}${downNoc}${PV_TEXT.teerDownMid}${affected.length}${PV_TEXT.pathsDroppedMid}${affected.join(SEP.enumComma)}`,
        affected: affected,
        reasons: teerReasons,
      })
    }
  }
  return levers
}

/**
 * ② 语言提档:同一套官方分值表查两次,报差值(ON 单行=总分;MB 四项各查一次,走 mbEoiEstimate)。
 *
 * @param input 判定档案、六张底表与场景参数。
 * @returns 查得出增量时的那一根杠杆;否则空。
 */
function clbBoostLever(input: ClbBoostLeverIn): ClbBoostLeverOut {
  const levers: VerdictLever[] = []
  const target = input.opts.clbTarget ?? CLB_TARGET_DEFAULT
  if (input.profile.clb != null && input.profile.clb < target) {
    const gains: LeverGain[] = []
    const onRows: ScoreRow[] = []
    for (const f of input.data.scoreFactors) {
      if (f.province === PROV.ON && f.factor === FACTOR.language && f.kind === FACTOR_ROW) onRows.push(f)
    }
    const onFrom = pickOnLangRow({ rows: onRows, clb: input.profile.clb })
    const onTo = pickOnLangRow({ rows: onRows, clb: target })
    if (onFrom && onTo) {
      gains.push({
        province: PROV.ON, system: onFrom.system, from: onFrom.points ?? 0, to: onTo.points ?? 0,
        delta: (onTo.points ?? 0) - (onFrom.points ?? 0), evidence: evOfFactor({ f: onTo }),
      })
    }
    let mbHead: ScoreRow | null = null
    for (const f of input.data.scoreFactors) if (f.province === PROV.MB) { mbHead = f; break }
    if (mbHead && input.profile.age != null && input.profile.edu != null) {
      let need = 0
      for (const r of input.data.requirements) {
        if (r.province !== PROV.MB || r.factor !== FACTOR.experience) continue
        if (!MB_SWM_STREAM.test(r.stream)) continue
        const m = monthsOfReq({ r: r }) ?? 0
        if (m > need) need = m
      }
      const work = Math.max(input.profile.expCanadaMonths ?? 0, need)
      const from = estimateMbEoi({
        factors: input.data.scoreFactors,
        profile: mbProfileOf({ p: input.profile, workMonths: work, clb: input.profile.clb }),
      })
      const to = estimateMbEoi({
        factors: input.data.scoreFactors,
        profile: mbProfileOf({ p: input.profile, workMonths: work, clb: target }),
      })
      gains.push({
        province: PROV.MB, system: from.system, from: from.total, to: to.total,
        delta: to.total - from.total, evidence: evOfFactor({ f: mbHead }),
      })
    }
    if (gains.length) {
      const parts: string[] = []
      for (const g of gains) parts.push(`${g.province}${SEP.plus}${g.delta}`)
      levers.push({
        key: LEVER.clbBoost,
        text: `${PV_TEXT.clbFromHead}${input.profile.clb}${PV_TEXT.clbToMid}${target}${SEP.colon}${parts.join(SEP.enumComma)}`,
        gains: gains,
      })
    }
  }
  return levers
}

/**
 * 杠杆:哪一个动作最值钱、哪一个动作最毁事。
 *
 * @param input 判定档案、六张底表,与「问哪一档」的场景参数。
 * @returns 按值排好的杠杆清单。
 */
export function pathLevers(input: PathLeversIn): PathLeversOut {
  const levers: VerdictLever[] = []

  for (const one of teerDowngradeLever({ profile: input.profile, data: input.data, opts: input.opts })) {
    levers.push(one)
  }
  for (const one of clbBoostLever({ profile: input.profile, data: input.data, opts: input.opts })) {
    levers.push(one)
  }
  return levers
}

// =========================================================================
// 5. 自己去连库的那几支
// =========================================================================

/**
 * 六张判定底表。TTL 内直接给缓存那一份。
 *
 * @returns 六张底表。
 */
export async function getVerdictData(): GetVerdictDataOut {
  if (!CACHE.tables || Date.now() - CACHE.tables.at > TTL) {
    CACHE.tables = { at: Date.now(), data: await loadVerdictTables(await getDb()) }
  }
  return CACHE.tables.data
}

/**
 * 指定雇主名录**按省**的全量行(判定卡的雇主名字匹配用;`matchDesignation` 是纯函数,候选由这里喂)。
 *
 * 🔴 不能改用 `VerdictData.designatedEmployers` —— 那一份是 **NL 专用**(判定核拿它当
 * 「NL 名录里有几家申报过这个 NOC」的分母),扩成四省会把那个分母一起改掉。
 *
 * 单省最大 NS 1,574 行约 60KB,四省全热也就约 200KB。查失败返回空 →
 * 判定落「名录没认出」= **本站的缺口**,不写「未被指定」。
 *
 * @param input 两位省码。
 * @returns 该省的名录行;省码为空或查失败则空。
 */
export async function getDesignatedEmployers(input: GetDesignatedEmployersIn): GetDesignatedEmployersOut {
  const prov = (input.province || '').trim()
  if (!prov) return []
  const hit = CACHE.byProvince.get(prov)
  if (hit && Date.now() - hit.at <= TTL) return hit.rows

  const db = await getDb()
  const res = await db.query(SQL.DESIGNATED_BY_PROV, [prov]).catch(nullResult)
  if (!res) return []

  const rows: DesignatedEmployerRow[] = []
  for (const d of res.rows) rows.push(directoryRow({ row: d }))
  CACHE.byProvince.set(prov, { at: Date.now(), rows })
  return rows
}

/**
 * 查挂了交回 null —— 给 `.catch()` 用的具名函数。**不缓存失败**。
 *
 * @returns null。
 */
function nullResult(): NullResultOut {
  return null
}

/**
 * 库里一行名录 → 判定认的那一行。
 *
 * @param input 库里那一行。
 * @returns 判定认的那一行。
 */
function directoryRow(input: DirectoryRowIn): DirectoryRowOut {
  const d = input.row
  return {
    name: String(d.name ?? ''),
    province: String(d.province ?? ''),
    location: String(d.location ?? ''),
    isTech: !!d.is_tech,
    source: String(d.source ?? ''),
    nocs: String(d.nocs ?? ''),
    url: d.url ? String(d.url) : undefined,
    fetched: d.fetched ? String(d.fetched).slice(0, DATE_LEN_DAY) : undefined,
  }
}

/**
 * 判定卡的下行数据 —— `/api/triple-verdict` 与 `/plan/pr?job=` 的 SSR 首屏共用这一条口径。
 *
 * 本函数只负责把 `buildTripleWire` 要的东西凑齐:连接池、六张底表、按省取名录的函数,
 * 以及**当前这个人**(登录态与 Pro 与否)。付费闸在 `buildTripleWire` 里,
 * 两处调用都走同一道闸,SSR 不会多漏一行。
 *
 * 它存在的唯一理由是**两个调用点要抄同样八行**,不是为了好看。
 *
 * @param input 岗位号与浏览器本地那份答案。
 * @returns 整张卡,或一句错误加 HTTP 码。
 */
export async function tripleWireOf(input: TripleWireOfIn): TripleWireOfOut {
  const user = await getUser(await headers()).catch(nullUser)
  return buildTripleWire({
    db: await getDb(),
    id: input.id,
    answers: input.answers,
    profile: profileSlots({ user: sessionOf({ user: user }) }),
    loggedIn: !!user,
    pro: isPro(user),
    data: await getVerdictData(),
    designatedOf: getDesignatedEmployers,
  })
}

/**
 * 这个人身上那组档案槽;没登录或没建过档则空袋。
 *
 * 🔴 这里有一个**跨边界的断言**,原因说清楚:`Users` 集合上确实挂着 `profile` 组,
 * 但鉴权那层(`getUser`)的返回类型只声明了它自己要的那几格(id / email / 到期日),
 * 没声明 `profile`。两个类型没有交集,TS 的弱类型检查会直接拦下来 —— 所以断言留着,
 * 而且**只留在这一个函数里**:调用方拿到的已经是一袋档案槽,不必再认识鉴权那层的形状。
 *
 * @param input 当前这个人。
 * @returns 那组档案槽;没有则空袋。
 */
function profileSlots(input: ProfileSlotsIn): ProfileSlotsOut {
  return input.user?.profile ?? {}
}

/**
 * 鉴权那层交回来的人 → 本域自己声明的那个形状。
 *
 * 🔴 **跨边界的断言,原因说清楚**:`Users` 集合上确实挂着 `profile` 组,但鉴权那层
 * (`getUser`)的返回类型只声明了它自己要的那几格(id / email / 到期日),没声明 `profile`。
 * 两个类型没有共同属性,TS 的弱类型检查会直接拦下来 —— 所以断言留着,
 * 而且**只留在这一个函数里**:别处拿到的已经是本域的形状。
 *
 * @param input 鉴权那层交回来的人。
 * @returns 本域认的那个人。
 */
function sessionOf(input: SessionOfIn): SessionOfOut {
  return input.user as SessionUser
}

/**
 * 解不出登录态时当没登录 —— 给 `.catch()` 用的具名函数。
 *
 * @returns null。
 */
function nullUser(): NullUserOut {
  return null
}
