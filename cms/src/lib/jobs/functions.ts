/**
 * 职位域的行为:来源标签、档案匹配引擎(付费墙头牌,规则只住这一处)、筛选/排序 → SQL、
 * 列表与匹配视图、详情/公司/相关、入口三问聚合、JD 正文取数与懒抓。
 * 🔴 本文件**不 import payload**(宪法:取数函数收一个能 query 的东西当参数,池由调用方注进来)——
 * 只吃浏览器也安全的 `../db` 桶,于是 index 门可以放心转发匹配引擎给 'use client' 组件。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

import { FRIEND_INPUT_MAX, friendChat } from '../llm'
import { HDR_ACCEPT, HDR_CONTENT_TYPE, HDR_COOKIE, HDR_REFERER, HDR_USER_AGENT, METHOD_POST } from '../http'
import { queryRows, queryRowsOrEmpty, SQL, count, firstOf, firstOr, jsonOrNull, numOrNull, text, textOrNull } from '../db'
import type { Db } from '../db'
import { JOBS_LOG, log } from '../log'
import { fill } from '../template'
import {
  ACCEPT_ANY, ACCEPT_HTML, AMP, AMP_ENT_RE, APPLY_SLICE_LEN, APPLY_TIMEOUT_MS, BLOCKED_SRC, BLOCKED_SRC_NONE,
  BROAD_NOCS_MAX, CAND_CAP, CAT_LEVEL, CELL_NONE, CK, CNT_SEP, COLON_END_RE, COL_PROVINCE, COMMA, COMPANY_SLUG_COND,
  COMP_KEY, COOKIE_CUT, COOKIE_JOIN, COUNT_CACHE_MAX, COUNT_TTL_MS, COV, CURRENT_STATUSES, DIGIT_PICK_RE,
  DIMS_TTL_MS, DIR_ASC, DIR_DESC, DOLLAR, DRAW_STREAM_L10N, EE_KEY_L10N, EE_L10N, EE_SPLIT, EMAIL_RE, ENT_PAIRS,
  FACES_REQUEST_HDR, FACES_REQUEST_VAL, FK, FORM_CONTENT_TYPE, FV, HAS_DIGIT_RE, HAS_SUFFIX, HOW_APPLY_RE,
  HREF_ENT_PAIRS, HTML_NONE, ISO_NONE, JB_APPLY_ANCHOR, JB_DESC_RE, JB_EXT_LINK_RE, JB_INNER_ENT_PAIRS, JB_LINK_NONE,
  JB_ORIGIN, JB_REQ_ANCHOR, JB_SECTION_CAP, JB_URL_RE, JD_BAD_HOST_172_RE, JD_BAD_HOST_RE, JD_BLOCK_BREAK_RE,
  JD_BUDGET_MARGIN, JD_DIGITS_RE, JD_FAILED_MAX, JD_FETCH_TIMEOUT_MS, JD_FIELD_NONE, JD_GEN_TIMEOUT_MS,
  JD_HEAD_JUNK_RE, JD_HEAD_MAX_LINES, JD_HOURS_VALUES, JD_HRS_RE, JD_HTML_CAP, JD_LINE_MIN, JD_MAX_LEN, JD_MIN_LEN,
  JD_NEG_TTL_MS, JD_NONE, JD_ORPHAN_LEN, JD_OUT_MAX_BASE, JD_OUT_MAX_RATIO, JD_OUT_MIN_LEN, JD_PARA_LEN, JD_PROTO_RE,
  JD_SECTION_MARKS, JD_STRIP_BLOCK_RE, JD_TAG_RE, JD_TAIL_STRIP_RE, JD_TERM_RE, JD_TERM_VALUES, JD_UA, JSF_FORM_BASE,
  JSF_KEY_JOBID, JSF_KEY_JSJOBID, LANG_EN, LANG_KO, LEVEL_RANK, LINE_SPACES_RE, LMIA_SOURCE, LV, MAIL_AT,
  MAIL_DOMAIN_NONE, MAIL_NONE, MAIL_RE, MAIL_SKIP_SUFFIXES, MAIL_SKIP_WORD, MAIN_LIST_COVERAGE, MARK_HEAD, MARK_TAIL,
  MED_SELECT, NL, NOC_JOIN_SLASH, NOC_LEN, NOC_MINOR_LEN, NOC_NONE, NOC_RE, NOC_SEARCH_MIN, NOC_SUBMAJOR_LEN,
  NORM_DASH, NORM_DASH_RE, NORM_WS_RE, NO_LIST_PROVINCES, OCC_TITLE_NONE, OPEN_COND, ORDER_DATE_TAIL,
  ORDER_DEFAULT_COL, ORDER_FRESH, ORIGIN_TITLE_HEAD, PARAM_NONE, PCT, PG_CODE_NONE, PG_UNDEFINED_COLUMN,
  PG_UNDEFINED_TABLE, PHONE_RE, PII_MASK, PREV_LINE_NONE, PROGRAM_PNP, PROOF_TTL_MS, PROV_CODE, PROV_CODE_NONE,
  PROV_MAX_WORDS, PROV_PREFIX_TRIM_RE, PRO_SORTS, Q_MAX_TERMS, Q_SHORT_LEN, REDIRECT_FOLLOW, REQ_STREAM_L10N, RK,
  RULE, SCORE_HIGH, SCORE_MID, SEARCH_COLS, SEEKER_ACTION_RE, SEEKER_JOBID_RE, SEP_KEY, SORT_COLUMNS, SORT_MATCH_KEY,
  SORT_NONE, SPACE, SPACES_RE, SQL_SEG_NONE, SRC_DASH, SRC_JOB_BANK, STAMP_NONE, STREAM_L10N, STREAM_NOTE_NONE,
  STRIP_REPL, T45_COND_PROVS, T45_NL, TITLE_DOMAIN_RE, TITLE_ENT_PAIRS, TITLE_JUNK_RE, TITLE_NONE, TITLE_RE,
  TITLE_SEG_MIN, TITLE_SPLIT_RE, TITLE_TAIL_RE, TOP_NOCS_MAX, TOP_NOCS_TTL_MS, TOP_NOCS_WITH_MED, TYPE_INELIGIBLE,
  UNCAT, VD, W
} from './constants'
import { JD_FORMAT_PROMPT_HEAD, REASON_EN, STATUS_EN } from './prompts'
import { CACHE } from './variables'
import type {
  AlertHitsIn, AlertHitsOut, ApplyMailOut, ApplyUrlIn, BigDimsIn, BigDimsOut, BroadNocsIn, BroadNocsOut,
  BuildWhereIn, CaughtError, Cell, CheckedAtOut, CityAgg, CityCardIn, CityCardOut, CompanyByJobIn, CompanyBySlugIn,
  CompanyDetail, CompanyOut, CompanyWhereIn, CountMap, CountOfIn, CoverageIn, DistrictCard, DrawStreamNoteIn,
  DropProvPrefixIn, EeDisplayIn, EeKeyDisplayIn, GenerateJdIn, GenerateJdOut, HtmlOut, JdFormattedIn, JdIn, JdOut,
  JdStateOut, JobByIdIn, JobByIdOut, JobDbRow, JobRow, JobRowsIn, JobRowsOut, JobsFilters, JobsPageIn, JobsPageOut,
  JobsWhere, JsonCell, JsonObj, LmiaNocRow, LmiaNocsIn, LmiaNocsOut, MatchDims, MatchDimsOut, MatchIn, MatchLevel,
  MatchPageIn, MatchPageOut, MatchProfile, MatchReason, MatchResult, MaybeLevel, MaybeNum, MaybeProfile, MaybeStr,
  MaybeStrOut, NameOption, NocCountsIn, NocCountsOut, NocOpenCount, NocRuleOut, NocSearchIn, NocSearchOut, NumCell,
  OccCompetitionIn, OccCompetitionOut, OccCompetitionRows, OccDiffFacts, OrderByIn, PgFailure, PnpOcc, PnpOccs,
  ProfileJsonCell, ProfileJsonOrNull, ProofOut, ProvCounts, ProvListCoverage, ProvOption, ProvinceCardIn,
  ProvinceCardOut, QuizFactsIn, QuizFactsOut, QuizProvCount, QuizStreamCount, RankedHit, RatioMap, RatioOfIn,
  RelatedIn, RelatedOut, ReqStreamDisplayIn, ResolveQIn, ResolveQOut, Row, RowMatchIn, RuleIn, RuleScoreOut,
  SimilarEmployer, SimilarIn, SimilarList, SimilarOut, SortValIn, SsrDimsOut, StrCell, StrList,
  StreamDisplayIn, StripTitleIn, TopNocsIn, TopNocsOut, UrlHandle, WhereParam, AlertHit, BroadCount, BroadNoc,
  CityDim, CompanyJobRow, DesigDim, DistrictDim, DistrictEmployerRow, DliTop, EeCatDim, EeOcc, FieldSource,
  JdStateRow, JsonRow, MatchJob, MaybeOccDiff, NewsSlim, NocCat, NocDescDim, NocHit, OccDiffDbRow, OccDiffFact,
  OccOpen, PnpDraw, PnpOccDim, ProvCount, RelatedJob, TimeLike, ToJobRowIn, TopNoc,
} from './types'
// =========================================================================
// 1. 来源与 PII
// =========================================================================

/**
 * 原站是否实测拦截本站抓取(命中给站名,文案陈述「该站拒绝本站自动读取」)。
 *
 * @param j 板上一行。
 * @returns 拦截站名;没拦截空串。
 */
export function blockedSrc(j: JobRow): string {
  const hit = BLOCKED_SRC[j.source.toLowerCase()]
  if (hit == null) {
    return BLOCKED_SRC_NONE
  }
  return hit
}

/**
 * 来源显示标签(数据层 etl/09_build_mart 洗好存 sourceLabel,前端只读;空给破折号)。
 *
 * @param j 板上一行。
 * @returns 显示标签。
 */
export function sourceLabel(j: JobRow): string {
  if (j.sourceLabel === '') {
    return SRC_DASH
  }
  return j.sourceLabel
}

/**
 * 直接雇主:ATS 第一方=直接;Job Bank 渠道仅 source=='Job Bank'(雇主直发)算直接,其余是聚合转贴。
 *
 * @param j 板上一行。
 * @returns 是否直接雇主。
 */
export function isDirect(j: JobRow): boolean {
  if (JB_URL_RE.test(j.applyUrl)) {
    return j.source === SRC_JOB_BANK
  }
  return true
}

/**
 * PII 脱敏(E4-03 D6):JB 帖常带邮箱/电话 —— 雇主联系方式不出前台,出口统一在这里脱敏。
 *
 * @param text 原文。
 * @returns 脱敏后的文本。
 */
export function scrubPii(text: string): string {
  return text.replace(EMAIL_RE, PII_MASK).replace(PHONE_RE, PII_MASK)
}

// =========================================================================
// 2. 匹配引擎(E5-00;措辞红线:只陈述可核验事实,永不说「你能/不能移民」)
// =========================================================================

/**
 * 档案是否可用于匹配(全空档案不算建档)。
 *
 * @param p 规范化档案;null = 未建档。
 * @returns 可否匹配。
 */
export function hasProfile(p: MaybeProfile): boolean {
  if (p == null) {
    return false
  }
  if (p.nocCodes.length > 0) {
    return true
  }
  if (p.crs != null) {
    return true
  }
  return p.targetProvinces.length > 0
}

/**
 * Users.profile(json 字段,形状不可信)→ 规范化 MatchProfile(唯一入口,逐格收窄)。
 *
 * @param raw 原始 JSON;null = 未建档。
 * @returns 规范化档案(缺格落空,不瞎猜)。
 */
export function normalizeProfile(raw: ProfileJsonOrNull): MatchProfile {
  if (raw == null) {
    return { nocCodes: [], clb: null, crs: null, targetProvinces: [], pgwpMonthsLeft: null, currentStatus: null }
  }
  let status: MatchProfile['currentStatus'] = null
  const rawStatus = raw.currentStatus
  if (typeof rawStatus === 'string' && (CURRENT_STATUSES as readonly string[]).includes(rawStatus)) {
    for (const s of CURRENT_STATUSES) {
      if (s === rawStatus) {
        status = s
      }
    }
  }
  const targets: string[] = []
  for (const s of strListOf(raw.targetProvinces)) {
    targets.push(s.toUpperCase())
  }
  return {
    nocCodes: strListOf(raw.nocCodes),
    clb: maybeNumOf(raw.clb),
    crs: maybeNumOf(raw.crs),
    targetProvinces: targets,
    pgwpMonthsLeft: maybeNumOf(raw.pgwpMonthsLeft),
    currentStatus: status,
  }
}

/**
 * 原始 JSON 的一格 → 有限数或 null。
 * 入参含 undefined:同 strListOf,本函数是消化点(开灯批 2026-08-26)。
 *
 * @param v 原始格;键缺席时 undefined。
 * @returns 数;不是像样的数则 null。
 */
// eslint-disable-next-line local/no-undefined-type, local/typed-signature -- 消化点:json 袋索引缺席就是 undefined,照实收(开灯批)
function maybeNumOf(v: ProfileJsonCell | undefined): MaybeNum {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v
  }
  return null
}

/**
 * 原始 JSON 的一格 → 干净字符串数组(非数组/非字符串元素全丢)。
 * 入参含 undefined:json 袋按键取值,键缺席就是 undefined —— 消化点照实收
 * (开灯批 2026-08-26:undefined 只许被消化,不许被传递;本函数就是消化点)。
 *
 * @param v 原始格;键缺席时 undefined。
 * @returns 干净数组。
 */
// eslint-disable-next-line local/no-undefined-type, local/typed-signature -- 消化点:json 袋索引缺席就是 undefined,照实收(开灯批)
function strListOf(v: ProfileJsonCell | undefined): StrList {
  if (Array.isArray(v) === false) {
    return []
  }
  const out: string[] = []
  for (const x of v) {
    if (typeof x === 'string' && x.trim() !== '') {
      out.push(x.trim())
    }
  }
  return out
}

/**
 * 匹配档 → 序值(null 档 -1,排序沉底)。
 *
 * @param l 档;null = 未算。
 * @returns 序值。
 */
export function matchRank(l: MaybeLevel): number {
  if (l == null) {
    return -1
  }
  const r = LEVEL_RANK[l]
  if (r == null) {
    return -1
  }
  return r
}

/**
 * 匹配 = 档案 × 现有维度的运行时 join,零新增抓取(纯函数、无 IO、前后端同构)。
 * 职业不对口封顶(2026-07-21 Frank「医疗/服务怎么也匹配进来了」):填了 NOC 却全不沾边的岗,
 * 省清单+TEER 撑出的分不算「与我的匹配」—— 封顶 low;没填 NOC 的档案照旧按分数分档。
 *
 * @param input 档案、岗位与维度。
 * @returns 档、内部分与理由链。
 */
export function match(input: MatchIn): MatchResult {
  if (input.job.noc === '') {
    return { level: LV.na, score: 0, reasons: [{ rule: RULE.noc, verdict: VD.na, key: RK.nocJobUncat, params: {}, source: null }] }
  }
  const noc = nocRule(input)
  const prov = provRule(input)
  const ee = eeRule(input)
  const teer = teerRule(input)
  const wage = wageRule(input)
  const lmia = lmiaRule(input)
  const score = noc.score + prov.score + ee.score + teer.score + wage.score + lmia.score
  const reasons: MatchReason[] = []
  for (const part of [noc.reasons, prov.reasons, ee.reasons, teer.reasons, wage.reasons, lmia.reasons]) {
    for (const r of part) {
      reasons.push(r)
    }
  }
  let level: MatchLevel = LV.low
  if (noc.nocMiss) {
    level = LV.low
  } else if (score >= SCORE_HIGH) {
    level = LV.high
  } else if (score >= SCORE_MID) {
    level = LV.mid
  }
  return { level: level, score: score, reasons: reasons }
}

/**
 * 规则 6:雇主外劳雇佣记录(E6-02)。B4-02 起只认技能股 +5 —— Frank「有 LMIA 但没法移民」:
 * 农业/低薪股是季节性用工,给果园 +5 绿勾=误导技能类求职者;skilled==null(列未回填)回退旧口径。
 *
 * @param input 档案、岗位与维度。
 * @returns 该规则的加分与理由。
 */
function lmiaRule(input: RuleIn): RuleScoreOut {
  const job = input.job
  const skilled = job.lmiaPositionsSkilled
  if (job.lmiaPositions == null || job.lmiaPositions <= 0) {
    return { score: 0, reasons: [{ rule: RULE.lmia, verdict: VD.na, key: RK.lmiaNa, params: {}, source: null }] }
  }
  if (skilled == null) {
    return {
      score: 5,
      reasons: [{ rule: RULE.lmia, verdict: VD.pass, key: RK.lmiaHas, params: { n: job.lmiaPositions, q: job.lmiaLastQuarter }, source: LMIA_SOURCE }],
    }
  }
  if (skilled > 0) {
    return {
      score: 5,
      reasons: [{ rule: RULE.lmia, verdict: VD.pass, key: RK.lmiaSkilled, params: { n: skilled, total: job.lmiaPositions, q: job.lmiaLastQuarter }, source: LMIA_SOURCE }],
    }
  }
  return {
    score: 0,
    reasons: [{ rule: RULE.lmia, verdict: VD.na, key: RK.lmiaLowOnly, params: { n: job.lmiaPositions, q: job.lmiaLastQuarter }, source: LMIA_SOURCE }],
  }
}

/**
 * 规则 5:工资信用(offer 可信度提示;低于当地中位太多在省提名工资要求上有风险)。
 *
 * @param input 档案、岗位与维度。
 * @returns 该规则的加分与理由。
 */
function wageRule(input: RuleIn): RuleScoreOut {
  const job = input.job
  if (job.salaryAnnual == null || job.wageMedAnnual == null || job.wageMedAnnual === 0) {
    return { score: 0, reasons: [{ rule: RULE.wage, verdict: VD.na, key: RK.wageNa, params: {}, source: null }] }
  }
  const pct = Math.round((job.salaryAnnual / job.wageMedAnnual - 1) * 100)
  if (pct >= 0) {
    return { score: 5, reasons: [{ rule: RULE.wage, verdict: VD.pass, key: RK.wageAbove, params: { pct: pct }, source: null }] }
  }
  if (pct >= -20) {
    return { score: 0, reasons: [{ rule: RULE.wage, verdict: VD.warn, key: RK.wageNear, params: { pct: -pct }, source: null }] }
  }
  return { score: -5, reasons: [{ rule: RULE.wage, verdict: VD.warn, key: RK.wageBelow, params: { pct: -pct }, source: null }] }
}

/**
 * 规则 4:TEER 可达(≤3 通用;4/5 须命中具名低 TEER 通道)。
 *
 * @param input 档案、岗位与维度。
 * @returns 该规则的加分与理由。
 */
function teerRule(input: RuleIn): RuleScoreOut {
  const job = input.job
  if (job.teer == null) {
    return { score: 0, reasons: [] }
  }
  if (job.teer <= 3) {
    return { score: 10, reasons: [{ rule: RULE.teer, verdict: VD.pass, key: RK.teerOk, params: { teer: job.teer }, source: null }] }
  }
  if (job.pnpStream !== '') {
    return { score: 10, reasons: [{ rule: RULE.teer, verdict: VD.pass, key: RK.teerChannel, params: { teer: job.teer, stream: job.pnpStream }, source: null }] }
  }
  return { score: -15, reasons: [{ rule: RULE.teer, verdict: VD.fail, key: RK.teerLow, params: { teer: job.teer }, source: null }] }
}

/**
 * 规则 3:EE 类别距离(上次类别抽选 CRS vs 自报 CRS)。
 *
 * @param input 档案、岗位与维度。
 * @returns 该规则的加分与理由。
 */
function eeRule(input: RuleIn): RuleScoreOut {
  const p = input.profile
  const job = input.job
  if (job.eeCategory === '') {
    return { score: 0, reasons: [{ rule: RULE.ee, verdict: VD.na, key: RK.eeNone, params: {}, source: null }] }
  }
  let row: RuleIn['dims']['eeCategories'][number] | null = null
  for (const r of input.dims.eeCategories) {
    if (r.noc === job.noc && r.drawCrs != null) {
      row = r
      break
    }
  }
  if (row == null) {
    for (const r of input.dims.eeCategories) {
      if (r.label === job.eeCategory && r.drawCrs != null) {
        row = r
        break
      }
    }
  }
  if (row == null || row.drawCrs == null) {
    return { score: 0, reasons: [{ rule: RULE.ee, verdict: VD.na, key: RK.eeNoDraw, params: { cat: job.eeCategory }, source: null }] }
  }
  const src = { label: row.label, url: row.url, fetched: row.fetched }
  if (p.crs == null) {
    return {
      score: 0,
      reasons: [{ rule: RULE.ee, verdict: VD.warn, key: RK.eeNoCrs, params: { cat: row.label, draw: row.drawCrs, date: row.drawDate.slice(0, 10) }, source: src }],
    }
  }
  const diff = p.crs - row.drawCrs
  if (diff >= 0) {
    return {
      score: 20,
      reasons: [{ rule: RULE.ee, verdict: VD.pass, key: RK.eeAbove, params: { cat: row.label, crs: p.crs, draw: row.drawCrs, date: row.drawDate.slice(0, 10), diff: diff }, source: src }],
    }
  }
  return {
    score: 0,
    reasons: [{ rule: RULE.ee, verdict: VD.warn, key: RK.eeBelow, params: { cat: row.label, crs: p.crs, draw: row.drawCrs, date: row.drawDate.slice(0, 10), gap: -diff }, source: src }],
  }
}

/**
 * 规则 2:省通道(inclusion/exclusion 公开清单 × 目标省)。目标省是偏好不是资格,不一致只提示不扣分。
 * 本站没有该省清单数据时不给「查过没有」的假结论 —— 分数走 TEER 粗筛同档,理由说实话(uncovered)。
 * E13-09:TEER4-5 的通过理由分三类(NL=offer 即可;MB/NS/NB/PE=先同雇主 6 个月;其余开放),
 * 翻案岗不再拿假理由;省集合镜像 etl/08_score。
 *
 * @param input 档案、岗位与维度。
 * @returns 该规则的加分与理由。
 */
function provRule(input: RuleIn): RuleScoreOut {
  const p = input.profile
  const job = input.job
  const reasons: MatchReason[] = []
  let score = 0
  const prov = job.province.toUpperCase()
  if (prov === FV.qc) {
    return { score: 0, reasons: [{ rule: RULE.prov, verdict: VD.na, key: RK.provQc, params: {}, source: null }] }
  }
  if (prov === '') {
    return { score: 0, reasons: [] }
  }
  if (p.targetProvinces.length > 0 && p.targetProvinces.includes(prov) === false) {
    reasons.push({ rule: RULE.prov, verdict: VD.warn, key: RK.provNotTarget, params: { prov: prov, targets: p.targetProvinces.join(NOC_JOIN_SLASH) }, source: null })
  }
  let named: RuleIn['dims']['pnpOccupations'][number] | null = null
  let excluded: RuleIn['dims']['pnpOccupations'][number] | null = null
  for (const r of input.dims.pnpOccupations) {
    if (r.province !== prov || r.noc !== job.noc) {
      continue
    }
    if (r.type !== TYPE_INELIGIBLE && named == null) {
      named = r
    }
    if (r.type === TYPE_INELIGIBLE && excluded == null) {
      excluded = r
    }
  }
  if (named != null) {
    score += 30
    reasons.push({
      rule: RULE.prov, verdict: VD.pass, key: RK.provNamed, params: { prov: prov, label: named.label, noc: job.noc },
      source: { label: named.label, url: named.url, fetched: named.fetched },
    })
  } else if (excluded != null) {
    score -= 20
    reasons.push({
      rule: RULE.prov, verdict: VD.fail, key: RK.provExcluded, params: { prov: prov, label: excluded.label, noc: job.noc },
      source: { label: excluded.label, url: excluded.url, fetched: excluded.fetched },
    })
  } else if (provListCoverage({ prov: prov, dims: input.dims }) === COV.uncovered) {
    if (job.pnpEligible) {
      score += 15
    }
    reasons.push({ rule: RULE.prov, verdict: VD.na, key: RK.provUncovered, params: { prov: prov }, source: null })
  } else if (job.pnpEligible) {
    score += 15
    const t45 = job.teer != null && job.teer >= 4
    let key: string = RK.provGeneric
    if (t45) {
      if (prov === T45_NL) {
        key = RK.provNl
      } else if ((T45_COND_PROVS as readonly string[]).includes(prov)) {
        key = RK.provCond
      } else {
        key = RK.provOpen
      }
    }
    reasons.push({ rule: RULE.prov, verdict: VD.pass, key: key, params: { prov: prov }, source: null })
  } else {
    score -= 10
    reasons.push({ rule: RULE.prov, verdict: VD.fail, key: RK.provNone, params: { prov: prov }, source: null })
  }
  return { score: score, reasons: reasons }
}

/**
 * 省清单覆盖判定(单一来源;没核对过的省一律保守:有清单数据也只算 partial,绝不冒充「查全了」)。
 *
 * @param input 省码与维度包。
 * @returns 覆盖档。
 */
export function provListCoverage(input: CoverageIn): ProvListCoverage {
  const declared = MAIN_LIST_COVERAGE[input.prov]
  if (declared === COV.qc) {
    return COV.qc
  }
  const rows: number[] = []
  let hasNamed = false
  for (const r of input.dims.pnpOccupations) {
    if (r.province === input.prov) {
      rows.push(1)
      if (r.type !== TYPE_INELIGIBLE) {
        hasNamed = true
      }
    }
  }
  if (declared == null) {
    if (rows.length === 0) {
      return COV.uncovered
    }
    return COV.partial
  }
  if (rows.length === 0 && declared !== COV.exclusion) {
    return COV.uncovered
  }
  if (declared === COV.listed) {
    if (hasNamed) {
      return COV.listed
    }
    return COV.exclusion
  }
  if (declared === COV.partial) {
    return COV.partial
  }
  return COV.exclusion
}

/**
 * 规则 1:NOC 对口。2026-07-21 Frank 拍板「我干 IT 不一定非得软件开发」:同族分三档 ——
 * 精确 40 / 同小类(前 4 位)30 / 同族(前 3 位)20,跨小类的同领域岗不再拿 0 分。
 *
 * @param input 档案、岗位与维度。
 * @returns 该规则的加分、理由与「全不沾边」旗。
 */
function nocRule(input: RuleIn): NocRuleOut {
  const p = input.profile
  const job = input.job
  if (p.nocCodes.length === 0) {
    return { score: 0, reasons: [{ rule: RULE.noc, verdict: VD.na, key: RK.nocNoProfile, params: {}, source: null }], nocMiss: false }
  }
  if (p.nocCodes.includes(job.noc)) {
    return { score: 40, reasons: [{ rule: RULE.noc, verdict: VD.pass, key: RK.nocExact, params: { noc: job.noc }, source: null }], nocMiss: false }
  }
  let minor = NOC_NONE
  let submajor = NOC_NONE
  for (const c of p.nocCodes) {
    if (c.length === NOC_LEN && c.slice(0, NOC_MINOR_LEN) === job.noc.slice(0, NOC_MINOR_LEN) && minor === '') {
      minor = c
    }
    if (c.length === NOC_LEN && c.slice(0, NOC_SUBMAJOR_LEN) === job.noc.slice(0, NOC_SUBMAJOR_LEN) && submajor === '') {
      submajor = c
    }
  }
  if (minor !== '') {
    return { score: 30, reasons: [{ rule: RULE.noc, verdict: VD.pass, key: RK.nocMinor, params: { noc: job.noc, yours: minor }, source: null }], nocMiss: false }
  }
  if (submajor !== '') {
    return { score: 20, reasons: [{ rule: RULE.noc, verdict: VD.pass, key: RK.nocSubmajor, params: { noc: job.noc, yours: submajor }, source: null }], nocMiss: false }
  }
  return {
    score: 0, nocMiss: true,
    reasons: [{ rule: RULE.noc, verdict: VD.fail, key: RK.nocNone, params: { noc: job.noc, yours: p.nocCodes.join(SPACE + NOC_JOIN_SLASH + SPACE) }, source: null }],
  }
}

/**
 * 理由 → advisor 用的英文事实行(与 UI 三语同源同数字;未知键回退键名)。
 *
 * @param r 一条理由。
 * @returns 英文事实行。
 */
export function reasonEn(r: MatchReason): string {
  const tpl = REASON_EN[r.key]
  if (tpl == null) {
    return r.key
  }
  return fill({ tpl: tpl, params: r.params })
}

/**
 * 分型 → 英文路径语境(喂 advisor grounding)。
 *
 * @param s 分型 slug;null/未知 = 没有语境。
 * @returns 语境行;没有则 null。
 */
export function statusEn(s: MaybeStr): MaybeStr {
  if (s == null) {
    return null
  }
  const hit = STATUS_EN[s]
  if (hit == null) {
    return null
  }
  return hit
}

// =========================================================================
// 3. 筛选/排序 → SQL(E5-03 提醒 + E10-01 列表共用的单一 WHERE 真相)
// =========================================================================

/**
 * q 搜索公司名分支预解析(不限 LIMIT 保语义等价;多词逐词各查一组,下标与 splitQ 对齐)。
 * companies trgm 索引 ms 级;`= ANY(数组)` 才能与 trgm 分支一起进位图 OR。
 *
 * @param input 连接与筛选。
 * @returns 原筛选 + qCompanyIds。
 */
async function resolveQCompanyIds(input: ResolveQIn): ResolveQOut {
  let q = PARAM_NONE
  const rawQ = input.filters[FK.q]
  if (typeof rawQ === 'string') {
    q = rawQ
  }
  const terms = splitQ(q)
  if (terms.length === 0) {
    return input.filters
  }
  const ids: number[][] = []
  for (const t of terms) {
    const rows = await queryRows({ db: input.db, sql: SQL.COMPANY_IDS_BY_NAME, params: [PCT + t + PCT], map: passRow })
    const one: number[] = []
    for (const r of rows) {
      one.push(Number(r.id))
    }
    ids.push(one)
  }
  const out: JobsFilters = {}
  for (const [k, v] of Object.entries(input.filters)) {
    out[k] = v
  }
  out[FK.qCompanyIds] = ids
  return out
}

/**
 * 搜索词拆分(2026-08-16「用空格隔开」):按空格拆词、词间 AND(每词自己跨列 OR),封顶 4 词。
 * 省全名先粘回去 —— 「nova scotia」拆成两个词后哪个都不是省,只能靠公司名瞎撞。
 *
 * @param q 原始搜索串。
 * @returns 词表(≤4)。
 */
export function splitQ(q: string): StrList {
  const raw: string[] = []
  for (const piece of q.trim().split(SPACES_RE)) {
    if (piece !== '') {
      raw.push(piece)
    }
  }
  const out: string[] = []
  let i = 0
  while (i < raw.length) {
    let take = 1
    for (let n = Math.min(PROV_MAX_WORDS, raw.length - i); n >= 2; n--) {
      if (provCodeOfLower(raw.slice(i, i + n).join(SPACE).toLowerCase()) !== '') {
        take = n
        break
      }
    }
    out.push(raw.slice(i, i + take).join(SPACE))
    i += take
  }
  return out.slice(0, Q_MAX_TERMS)
}

/**
 * 省全名(小写)→ 省码;不是省名则空串。
 *
 * @param nameLower 小写词组。
 * @returns 省码;不是省名空串。
 */
function provCodeOfLower(nameLower: string): string {
  for (const [name, code] of Object.entries(PROV_CODE)) {
    if (name.toLowerCase() === nameLower) {
      return code
    }
  }
  return PROV_CODE_NONE
}

/**
 * 筛选 → WHERE 条件串(无 WHERE 前缀,空=TRUE)。阈值逐字对齐旧前端谓词;
 * 未知键静默跳过并进 skipped(提醒邮件里给用户交代)。
 * 搜索词每词一组「跨列 OR」、词与词之间 AND(见 splitQ),单词时与旧写法逐字等价;
 * 状态筛默认排除已下架(#136 批A),显式选「已下架」仍可看。
 *
 * @param input 筛选与占位符起始。
 * @returns 条件串、绑定参数与被跳过的键。
 */
// eslint-disable-next-line local/function-length -- 二十几个筛选键各有各的谓词,拆开每支都要透传 param 计数器闭包
export function buildJobsWhere(input: BuildWhereIn): JobsWhere {
  const filters = input.filters
  const conds: string[] = []
  const params: WhereParam[] = []
  const skipped: string[] = []
  const param = function param(v: WhereParam): string {
    params.push(v)
    return DOLLAR + String(input.startIndex + params.length - 1)
  }
  const s = function s(k: string): string {
    const v = filters[k]
    if (typeof v === 'string') {
      return v.trim()
    }
    return PARAM_NONE
  }
  const isOn = function isOn(k: string): boolean {
    const v = filters[k]
    return v === true || v === FV.trueStr || v === FV.oneStr
  }
  const terms = splitQ(s(FK.q))
  for (const [i, term] of terms.entries()) {
    const ph = param(PCT + term + PCT)
    const branches: string[] = []
    for (const c of SEARCH_COLS) {
      branches.push(c + W.ilike + ph)
    }
    if (term.length <= Q_SHORT_LEN) {
      branches.push(COL_PROVINCE + W.ilike + ph)
    }
    const pc = provCodeOfLower(term.toLowerCase())
    if (pc !== '') {
      branches.push(W.provEq + param(pc))
    }
    const pre = filters[FK.qCompanyIds]
    if (Array.isArray(pre)) {
      const one = pre[i]
      if (Array.isArray(one) && one.length > 0) {
        branches.push(W.companyIdAnyOpen + param(one) + W.close)
      }
    } else {
      branches.push(SQL.companyIdInByName(ph))
    }
    conds.push(W.open + branches.join(W.or) + W.close)
  }
  if (s(FK.company) !== '') {
    conds.push(W.companyEq + param(s(FK.company)))
  }
  if (s(FK.country) !== '') {
    conds.push(W.countryEq + param(s(FK.country)))
  }
  if (s(FK.prov) !== '') {
    let code = PROV_CODE[s(FK.prov)]
    if (code == null) {
      code = s(FK.prov)
    }
    conds.push(W.provEq + param(code))
  }
  if (s(FK.city) !== '') {
    conds.push(W.cityEq + param(s(FK.city)))
  }
  if (s(FK.district) !== '') {
    conds.push(W.districtEq + param(s(FK.district)))
  }
  if (s(FK.noc) !== '') {
    const codes: string[] = []
    for (const x of s(FK.noc).split(COMMA)) {
      if (NOC_RE.test(x.trim())) {
        codes.push(x.trim())
      }
    }
    if (codes.length > 0) {
      conds.push(W.nocAnyOpen + param(codes) + W.close)
    }
  }
  if (s(FK.broad) !== '') {
    conds.push(W.broadEq + param(s(FK.broad)))
  }
  if (s(FK.mid) !== '') {
    conds.push(W.midEq + param(s(FK.mid)))
  }
  if (s(FK.fine) !== '') {
    conds.push(W.fineEq + param(s(FK.fine)))
  }
  if (s(FK.teer) !== '') {
    if (s(FK.teer) === UNCAT) {
      conds.push(W.teerNull)
    } else {
      const m = DIGIT_PICK_RE.exec(s(FK.teer))
      if (m != null) {
        conds.push(W.teerEq + param(Number(m[1])))
      }
    }
  }
  if (s(FK.source) !== '') {
    conds.push(W.sourceEq + param(s(FK.source)))
  }
  if (s(FK.acc) !== '') {
    conds.push(W.accEq + param(s(FK.acc)))
  }
  if (s(FK.pnp) === FV.yes) {
    conds.push(W.pnpYes)
  } else if (s(FK.pnp) === FV.no) {
    conds.push(W.pnpNo)
  }
  if (s(FK.aip) === FV.yes) {
    conds.push(W.aipYes)
  } else if (s(FK.aip) === FV.no) {
    conds.push(W.aipNo)
  }
  if (s(FK.pilot) === FV.yes) {
    conds.push(W.pilotAny)
  } else if (s(FK.pilot) === FV.no) {
    conds.push(W.pilotNone)
  } else if (s(FK.pilot) === FV.rcip || s(FK.pilot) === FV.fcip) {
    conds.push(W.pilotLike + param(PCT + s(FK.pilot) + PCT))
  }
  if (s(FK.status) !== '') {
    conds.push(W.statusEq + param(s(FK.status)))
  } else {
    conds.push(OPEN_COND)
  }
  if (s(FK.origin) !== '') {
    conds.push(W.originEq + param(s(FK.origin)))
  }
  if (s(FK.score) === FV.high) {
    conds.push(W.scoreHigh)
  } else if (s(FK.score) === FV.mid) {
    conds.push(W.scoreMid)
  } else if (s(FK.score) === FV.low) {
    conds.push(W.scoreLow)
  }
  if (s(FK.sal) === FV.ge100) {
    conds.push(W.salGe100)
  } else if (s(FK.sal) === FV.s80) {
    conds.push(W.sal80)
  } else if (s(FK.sal) === FV.s60) {
    conds.push(W.sal60)
  } else if (s(FK.sal) === FV.u60) {
    conds.push(W.salU60)
  }
  if (s(FK.vs) === FV.above || s(FK.vs) === FV.above20 || s(FK.vs) === FV.below) {
    let cmp: string = W.vsBelow
    if (s(FK.vs) === FV.above) {
      cmp = W.vsAbove
    } else if (s(FK.vs) === FV.above20) {
      cmp = W.vsAbove20
    }
    conds.push(W.open + W.vsGuard + W.and + cmp + W.close)
  }
  if (s(FK.emp) === FV.full || s(FK.emp) === FV.part) {
    conds.push(W.empEq + param(s(FK.emp)))
  } else if (s(FK.emp) === FV.gig) {
    conds.push(W.empGig)
  }
  if (isOn(FK.directOnly)) {
    conds.push(W.direct)
  }
  if (s(FK.elig) === FV.ok) {
    conds.push(W.eligOk)
  }
  if (conds.length === 0) {
    return { sql: W.alwaysTrue, params: params, skipped: skipped }
  }
  return { sql: conds.join(W.and), params: params, skipped: skipped }
}

/**
 * 排序指令 → ORDER BY 子句(白名单防注入;#159:同日兜底 first_seen DESC 让榜单随抓取滚动)。
 *
 * @param input 排序指令与付费态。
 * @returns ORDER BY 子句。
 */
function orderByClause(input: OrderByIn): string {
  let key = SORT_NONE
  let dir = SORT_NONE
  if (input.sort != null) {
    key = input.sort.key
    dir = input.sort.dir
  }
  if (key !== '' && input.pro === false && PRO_SORTS.has(key)) {
    key = SORT_NONE
  }
  let col = ORDER_DEFAULT_COL
  const sortCol = SORT_COLUMNS[key]
  if (key !== '' && sortCol != null) {
    col = sortCol
  }
  let d = DIR_DESC
  if (dir === FV.asc) {
    d = DIR_ASC
  }
  let tail = ORDER_FRESH
  if (col !== ORDER_DEFAULT_COL) {
    tail = ORDER_DATE_TAIL + ORDER_FRESH
  }
  return SQL.orderBy(col, d, tail)
}

// =========================================================================
// 4. 维度(首屏 + 匹配维度)
// =========================================================================

/**
 * 首屏维度(2026-08-18 从 page.tsx 搬下来:同一份数据两条路两套映射,口径迟早分叉)。
 * SSR 瘦身照旧(2026-07-17):cities/districts/designatedEmployers/nocDescriptions 四张大表
 * 首屏不带(约 1.25MB),客户端从 /api/jobs/dims 后台拉了再并进来。查挂回空(宁可留空)。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 首屏维度包。
 */
export async function loadSsrDims(db: Db): SsrDimsOut {
  const [prov, noc, src, exp, pnp, draws, ee, fieldSrc, news] = await Promise.all([
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_PROVINCES, params: [], map: passRow }),
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_NOC_CATEGORIES, params: [], map: toNocCat }),
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_SOURCES, params: [], map: passRow }),
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_EXPERIENCE_LEVELS, params: [], map: passRow }),
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_PNP_OCCUPATIONS, params: [], map: mapPnpOcc }),
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_PNP_DRAWS, params: [], map: toPnpDraw }),
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_EE_CATEGORIES, params: [], map: mapEeCat }),
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_FIELD_SOURCES, params: [], map: toFieldSource }),
    queryRowsOrEmpty({ db: db, sql: SQL.NEWS_SLIM_60, params: [], map: toNewsSlim }),
  ])
  const provinces: ProvOption[] = []
  for (const r of prov) {
    provinces.push({ code: String(r.code), name: String(r.name) })
  }
  const sources: NameOption[] = []
  for (const r of src) {
    sources.push({ name: String(r.name) })
  }
  const experienceLevels: NameOption[] = []
  for (const r of exp) {
    experienceLevels.push({ name: String(r.name) })
  }
  return {
    provinces: provinces,
    cities: [],
    districts: [],
    nocCategories: noc,
    sources: sources,
    experienceLevels: experienceLevels,
    pnpOccupations: pnp,
    pnpDraws: draws,
    eeCategories: ee,
    designatedEmployers: [],
    nocDescriptions: [],
    fieldSources: fieldSrc,
    news: news,
  }
}

/**
 * 省提名匹配只吃 program=PNP 的清单:AIP 背书是另一条路,混进来会让「命中/被排除」判在错的项目上(E6-09)。
 *
 * @param rows 维度行。
 * @returns 只剩 PNP 的行。
 */
export function pnpOnly(rows: PnpOccs): PnpOccs {
  const out: PnpOcc[] = []
  for (const r of rows) {
    if (r.program === PROGRAM_PNP) {
      out.push(r)
    }
  }
  return out
}

/**
 * 匹配维度包(1h 进程缓存;改 `CACHE.dims`)。2026-08-18 改走 db 层:此前自己 payload.find,
 * 口径与职位板分叉(那条路滤 AIP 这条没滤)—— 现在滤在 SQL 的 WHERE 里,两条路口径合一。
 * 池由调用方注进来(拍板③:db 只在边缘 —— 原「getDb 单件」的理由被注入式取代)。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 维度包。
 */
export async function loadMatchDims(db: Db): MatchDimsOut {
  const hot = CACHE.dims
  if (hot != null && Date.now() - hot.at < DIMS_TTL_MS) {
    return hot.dims
  }
  const [pnp, ee] = await Promise.all([
    queryRows({ db: db, sql: SQL.MATCH_PNP_OCCUPATIONS, params: [], map: toPnpOccDim }),
    queryRows({ db: db, sql: SQL.MATCH_EE_CATEGORIES, params: [], map: toEeCatDim }),
  ])
  const dims: MatchDims = { pnpOccupations: pnp, eeCategories: ee }
  CACHE.dims = { at: Date.now(), dims: dims }
  return dims
}

// =========================================================================
// 5. 列表与匹配视图
// =========================================================================

/**
 * SSR 首屏前 limit 行(筛选/翻页走 /api/jobs 分页)。
 *
 * @param input 连接、分层态与维度。
 * @returns 行、最近核对时刻与 FOMO 计数。
 */
export async function loadJobRows(input: JobRowsIn): JobRowsOut {
  const rows = await queryRows({ db: input.db, sql: SQL.JOB_ROWS_LATEST, params: [input.limit], map: passJobRow })
  let high = 0
  let mid = 0
  const jobs: JobRow[] = []
  for (const j of rows) {
    const level = rowMatchLevel({ row: j, profileOk: input.profileOk, profile: input.profile, dims: input.matchDims })
    if (level === LV.high) {
      high += 1
    } else if (level === LV.mid) {
      mid += 1
    }
    jobs.push(toJobRow({ row: j, matchLevel: level, pro: input.pro }))
  }
  const updatedAt = await checkedAt(input.db)
  return { jobs: jobs, updatedAt: updatedAt, matchHigh: high, matchMid: mid }
}

/**
 * 最近核对时刻(etl_heartbeat 最近一轮 seed 完成;表未落地退回 max(last_seen);30s 缓存,改 `CACHE.checked`)。
 * 2026-07-26 Frank「前端数据时间怎么没更新」:旧口径 max(last_seen) 在 Job Bank 当天没发岗时
 * 冻在昨晚,读起来像站死了。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 时刻(ISO)。
 */
export async function checkedAt(db: Db): CheckedAtOut {
  const now = Date.now()
  const hot = CACHE.checked
  if (hot != null && now - hot.ts < COUNT_TTL_MS) {
    return hot.v
  }
  let v = STAMP_NONE
  try {
    const rows = await queryRows({ db: db, sql: SQL.ETL_HEARTBEAT, params: [], map: passRow })
    const first = rows[0]
    if (first != null) {
      v = iso(first.last_seed)
    }
  } catch (e) {
    if (e instanceof Error && pgCodeOf(e) === PG_UNDEFINED_TABLE) {
      v = STAMP_NONE
    } else {
      throw e
    }
  }
  if (v === '') {
    const rows = await queryRows({ db: db, sql: SQL.JOBS_MAX_LAST_SEEN, params: [], map: passRow })
    const first = rows[0]
    if (first != null) {
      v = iso(first.upd)
    }
  }
  CACHE.checked = { v: v, ts: now }
  return v
}

/**
 * pg 错误码(pg 的错误对象带 code;不是它的错空串)。体内那一步 `as PgFailure` 是跨边界断言:
 * code 是 pg 挂上去的,TS 看不见 —— 形状声明在 types.PgFailure。
 *
 * @param e 已收窄成 Error 的异常。
 * @returns 错误码;没有空串。
 */
function pgCodeOf(e: CaughtError): string {
  const withCode = e as PgFailure
  if (typeof withCode.code === 'string') {
    return withCode.code
  }
  return PG_CODE_NONE
}

/**
 * 一行的匹配档(未建档直接 null;规则在 match 一处)。
 *
 * @param input 原始行、档案与维度。
 * @returns 档;未建档 null。
 */
function rowMatchLevel(input: RowMatchIn): MaybeLevel {
  if (input.profileOk === false) {
    return null
  }
  return match({ profile: input.profile, job: toMatchJob(input.row), dims: input.dims }).level
}

/**
 * E10-01:服务端筛选+排序+分页(#125 去重布尔过滤;is_dup 列未落地 42703 降级不去重)。
 *
 * @param input 连接、分层态、筛选、排序与页。
 * @returns 当前页行、同 WHERE 总数与最近核对时刻。
 */
export async function loadJobsPage(input: JobsPageIn): JobsPageOut {
  const w = buildJobsWhere({ filters: await resolveQCompanyIds({ db: input.db, filters: input.filters }), startIndex: 1 })
  const order = orderByClause({ sort: input.sort, pro: input.pro })
  const limPh = DOLLAR + String(w.params.length + 1)
  const offPh = DOLLAR + String(w.params.length + 2)
  const now = Date.now()
  const cntKey = w.sql + CNT_SEP + JSON.stringify(w.params)
  const hot = CACHE.counts.get(cntKey)
  let cachedN: MaybeNum = null
  if (hot != null && now - hot.ts < COUNT_TTL_MS) {
    cachedN = hot.n
  }
  const listParams: WhereParam[] = []
  for (const p of w.params) {
    listParams.push(p)
  }
  listParams.push(input.pageSize)
  listParams.push(input.page * input.pageSize)
  const run = async function run(cond: string): Promise<[JobDbRow[], Row[] | null, string]> {
    const list = queryRows({ db: input.db, sql: SQL.jobsPage(w.sql, cond, order, limPh, offPh), params: listParams, map: passJobRow })
    let cnt: Promise<Row[] | null> = Promise.resolve(null)
    if (cachedN == null) {
      cnt = queryRows({ db: input.db, sql: SQL.jobsPageCount(w.sql, cond), params: w.params, map: passRow })
    }
    return Promise.all([list, cnt, checkedAt(input.db)])
  }
  let listRows: JobDbRow[]
  let cntRows: Row[] | null
  let updatedAt: string
  try {
    ;[listRows, cntRows, updatedAt] = await run(SQL.DEDUPE_COND)
  } catch (e) {
    if (e instanceof Error && pgCodeOf(e) === PG_UNDEFINED_COLUMN) {
      ;[listRows, cntRows, updatedAt] = await run(W.alwaysTrue)
    } else {
      throw e
    }
  }
  let total = 0
  if (cntRows != null) {
    const cntFirst = cntRows[0]
    if (cntFirst != null) {
      total = Number(cntFirst.n)
    }
    if (CACHE.counts.size > COUNT_CACHE_MAX) {
      CACHE.counts.clear()
    }
    CACHE.counts.set(cntKey, { n: total, ts: now })
  } else if (cachedN != null) {
    total = cachedN
  }
  const jobs: JobRow[] = []
  for (const j of listRows) {
    const level = rowMatchLevel({ row: j, profileOk: input.profileOk, profile: input.profile, dims: input.matchDims })
    jobs.push(toJobRow({ row: j, matchLevel: level, pro: input.pro }))
  }
  return { jobs: jobs, total: total, updatedAt: updatedAt }
}

/**
 * 「我的匹配」视图(E10-01 P3):SQL 候选预筛(并集从宽,宁可多算不漏)→ TS 跑 match 留 high/mid
 * → 默认按档位降序(候选已按日期↓,stable sort 保同档内日期序)分页;表头点击在可见集内重排
 * (空值恒沉底)。匹配全放开(2026-07-21 拍板)。
 *
 * @param input 连接、分层态、维度与页。
 * @returns 当前页行、命中总数、FOMO 计数与最近核对时刻。
 */
export async function loadMatchPage(input: MatchPageIn): MatchPageOut {
  const nocs = input.profile.nocCodes
  const noc4 = new Set<string>()
  const noc3 = new Set<string>()
  for (const c of nocs) {
    if (c.length === NOC_LEN) {
      noc4.add(c.slice(0, NOC_MINOR_LEN))
      noc3.add(c.slice(0, NOC_SUBMAJOR_LEN))
    }
  }
  const [cand, updRows] = await Promise.all([
    queryRows({ db: input.db, sql: SQL.MATCH_PAGE, params: [nocs, Array.from(noc4), Array.from(noc3), CAND_CAP], map: passJobRow }),
    queryRows({ db: input.db, sql: SQL.JOBS_MAX_LAST_SEEN, params: [], map: passRow }),
  ])
  let matchHigh = 0
  let matchMid = 0
  const hits: RankedHit[] = []
  for (const j of cand) {
    const level = match({ profile: input.profile, job: toMatchJob(j), dims: input.matchDims }).level
    if (level === LV.high) {
      matchHigh += 1
    } else if (level === LV.mid) {
      matchMid += 1
    } else {
      continue
    }
    hits.push({ j: j, level: level, rank: matchRank(level), v: null })
  }
  hits.sort(byLevelDesc)
  let sortKey = SORT_NONE
  let sortDir = SORT_NONE
  if (input.sort != null) {
    sortKey = input.sort.key
    sortDir = input.sort.dir
  }
  const sortable = sortKey !== '' && sortKey !== SORT_MATCH_KEY && SORT_COLUMNS[sortKey] != null
    && (input.pro || PRO_SORTS.has(sortKey) === false)
  if (sortable) {
    for (const h of hits) {
      h.v = matchSortVal({ key: sortKey, j: h.j })
    }
    if (sortDir === FV.asc) {
      hits.sort(byHitValAsc)
    } else {
      hits.sort(byHitValDesc)
    }
  }
  const pageItems = hits.slice(input.page * input.pageSize, input.page * input.pageSize + input.pageSize)
  const jobs: JobRow[] = []
  for (const h of pageItems) {
    jobs.push(toJobRow({ row: h.j, matchLevel: h.level, pro: input.pro }))
  }
  let updatedAt = STAMP_NONE
  const updFirst = updRows[0]
  if (updFirst != null) {
    updatedAt = iso(updFirst.upd)
  }
  return { jobs: jobs, total: hits.length, matchHigh: matchHigh, matchMid: matchMid, updatedAt: updatedAt }
}

/**
 * 匹配视图列排序的取值(命中集在 TS 内存里,按列取原始行值;白名单外 null)。
 *
 * @param input 列 key 与原始行。
 * @returns 可比较的值;取不了 null。
 */
function matchSortVal(input: SortValIn): Cell {
  const j = input.j
  switch (input.key) {
    case CK.datePosted: return iso(j.date_posted)
    case CK.score: return numOf(j.grade_channel)
    case CK.salary: return numOf(j.salary_annual)
    case CK.salaryYr: return numOf(j.salary_annual)
    case CK.lastSeen: return iso(j.last_seen)
    case CK.title: return strOf(j.title)
    case CK.company: return strOf(j.company_name)
    case CK.province: return strOf(j.province)
    case CK.city: return strOf(j.city)
    case CK.broad: return strOf(j.broad)
    case CK.mid: return strOf(j.mid)
    case CK.fine: return strOf(j.fine)
    case CK.teer: return numOf(j.teer)
    case CK.noc: return strOf(j.noc)
    case CK.accessibility: return strOf(j.accessibility)
    case CK.country: return strOf(j.country)
    case CK.district: return strOf(j.district)
    case CK.address: return strOf(j.address)
    case CK.source: return strOf(j.source_label)
    case CK.origin: return strOf(j.origin)
    case CK.pnp: {
      if (j.pnp_eligible === true) {
        return 1
      }
      return 0
    }
    case CK.ee: return strOf(j.ee_category)
    case CK.aip: {
      if (j.aip === true) {
        return 1
      }
      return 0
    }
    case CK.pilot: return strOf(j.pilot)
    case CK.lmia: return numOf(j.lmia_positions)
    case CK.status: return strOf(j.status)
    case CK.closedAt: return iso(j.closed_at)
    case CK.wageMedHr: return numOf(j.wage_med_hourly)
    case CK.wageMedYr: return numOf(j.wage_med_annual)
    case CK.vsMedian: {
      const sVal = numOf(j.salary_annual)
      const m = numOf(j.wage_med_annual)
      if (sVal != null && m != null && m !== 0) {
        return sVal / m
      }
      return null
    }
    default: return null
  }
}

/**
 * 字符串格词汇的本地短名。
 *
 * @param v 库格。
 * @returns 串;没有空串。
 */
function strOf(v: StrCell): string {
  if (v == null) {
    return CELL_NONE
  }
  return v
}

/**
 * 数字格词汇的本地短名(matchSortVal 里一列一次)。
 *
 * @param v 库格。
 * @returns 数;没有 null。
 */
function numOf(v: NumCell): MaybeNum {
  if (v == null) {
    return null
  }
  return Number(v)
}

// =========================================================================
// 6. 详情、相关、证言
// =========================================================================

/**
 * E8-07 详情页:按 id 取单岗(与列表同一列集/映射;closed 岗也返回 —— 详情页保留可访问)。
 *
 * @param input 连接、岗位号与分层态。
 * @returns 板上一行;查无/id 不像样 null。
 */
export async function loadJobById(input: JobByIdIn): JobByIdOut {
  if (Number.isFinite(input.id) === false) {
    return null
  }
  const rows = await queryRows({ db: input.db, sql: SQL.JOB_BY_ID, params: [input.id], map: passJobRow })
  const first = rows[0]
  if (first == null) {
    return null
  }
  const level = rowMatchLevel({ row: first, profileOk: input.profileOk, profile: input.profile, dims: input.matchDims })
  return toJobRow({ row: first, matchLevel: level, pro: input.pro })
}

/**
 * E8-07「相关职位」:同公司 ≤3 + 同省同 NOC 小类 ≤3(都排除本岗)。
 * 2026-08-11:两组都空时兜底探测三级分类「本省该级有没有在招岗」(EXISTS 命中即停),
 * 返回能筛出东西的最细一级 —— 下架页不能是死路。
 *
 * @param input 连接与本岗。
 * @returns 两组瘦行与兜底级。
 */
export async function loadRelatedJobs(input: RelatedIn): RelatedOut {
  const job = input.job
  let coRows: Row[] = []
  if (job.company !== '') {
    coRows = await queryRows({ db: input.db, sql: SQL.RELATED_SAME_COMPANY, params: [job.company, job.id], map: passRow })
  }
  let occRows: Row[] = []
  if (job.noc !== '' && job.province !== '') {
    occRows = await queryRows({ db: input.db, sql: SQL.RELATED_SAME_OCC, params: [job.province, job.noc, job.id, job.company], map: passRow })
  }
  const sameCompany = coRows.map(toRelated)
  const sameOcc = occRows.map(toRelated)
  if (sameCompany.length > 0 || sameOcc.length > 0 || job.province === '') {
    return { sameCompany: sameCompany, sameOcc: sameOcc, fallbackLevel: null }
  }
  const levels: ['fine' | 'mid' | 'broad', string][] = []
  if (job.fine !== '' && job.fine !== UNCAT) {
    levels.push([CAT_LEVEL.fine, job.fine])
  }
  if (job.mid !== '' && job.mid !== UNCAT) {
    levels.push([CAT_LEVEL.mid, job.mid])
  }
  if (job.broad !== '' && job.broad !== UNCAT) {
    levels.push([CAT_LEVEL.broad, job.broad])
  }
  if (levels.length === 0) {
    return { sameCompany: sameCompany, sameOcc: sameOcc, fallbackLevel: null }
  }
  const lvNames: string[] = []
  const lvValues: string[] = []
  for (const [lv, v] of levels) {
    lvNames.push(lv)
    lvValues.push(v)
  }
  const params: WhereParam[] = [job.province]
  for (const v of lvValues) {
    params.push(v)
  }
  const probe = await queryRows({ db: input.db, sql: SQL.levelHasJobs(lvNames), params: params, map: passRow })
  let fallbackLevel: 'fine' | 'mid' | 'broad' | null = null
  const probeFirst = probe[0]
  if (probeFirst != null) {
    for (const [lv] of levels) {
      if (probeFirst[lv + HAS_SUFFIX] === true && fallbackLevel == null) {
        fallbackLevel = lv
      }
    }
  }
  return { sameCompany: sameCompany, sameOcc: sameOcc, fallbackLevel: fallbackLevel }
}

/**
 * 头条总数 + 差异化证言数字(60s 缓存,改 `CACHE.proof`;2026-08-03 生产僵死事故的保险)。
 * 口径与列表一致(#125 去重 + 排除下架);is_dup 未落地 42703 降级不去重。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 三连数。
 */
export async function loadTotalAndProof(db: Db): ProofOut {
  const hot = CACHE.proof
  if (hot != null && Date.now() - hot.ts < PROOF_TTL_MS) {
    return hot.v
  }
  let rows: Row[]
  try {
    rows = await queryRows({ db: db, sql: SQL.totalAndProof(SQL.DEDUPE_COND + W.and + OPEN_COND), params: [], map: passRow })
  } catch (e) {
    if (e instanceof Error && pgCodeOf(e) === PG_UNDEFINED_COLUMN) {
      rows = await queryRows({ db: db, sql: SQL.totalAndProof(OPEN_COND), params: [], map: passRow })
    } else {
      throw e
    }
  }
  let v = { total: 0, named: 0, lmia: 0 }
  const first = rows[0]
  if (first != null) {
    v = { total: Number(first.n), named: Number(first.named), lmia: Number(first.lmia) }
  }
  CACHE.proof = { v: v, ts: Date.now() }
  return v
}

// =========================================================================
// 7. 公司详情(E8-09;零新抓取)
// =========================================================================

/**
 * slug → 公司详情(查无 null,页面走 Notice 不 404;全事实层免费,不走额度闸)。
 *
 * @param input 连接与 slug。
 * @returns 公司详情;查无 null。
 */
export async function loadCompanyBySlug(input: CompanyBySlugIn): CompanyOut {
  if (input.slug === '') {
    return null
  }
  return fetchCompanyWhere({ db: input.db, where: COMPANY_SLUG_COND, param: input.slug })
}

/**
 * job id → 同一份公司详情(E8-11 B1 公司弹框同源;按 jobs.company_id 解析,同名公司也不串)。
 * #199:公司表 address 常空 —— 从点进来的这条职位取精确地址兜底。
 *
 * @param input 连接与岗位号。
 * @returns 公司详情;查无 null。
 */
export async function loadCompanyByJobId(input: CompanyByJobIn): CompanyOut {
  const detail = await fetchCompanyWhere({ db: input.db, where: SQL.COMPANY_BY_JOB_ID_COND, param: input.jobId })
  if (detail != null && detail.address === '') {
    try {
      const rows = await queryRows({ db: input.db, sql: SQL.JOB_ADDRESS_BY_ID, params: [input.jobId], map: passRow })
      const first = rows[0]
      if (first != null && first.address != null && first.address !== '') {
        detail.address = String(first.address)
      }
    } catch (e) {
      let why = String(e)
      if (e instanceof Error) {
        why = e.message
      }
      log({ tag: JOBS_LOG.tag, text: JOBS_LOG.addressProbeFailed + why })
    }
  }
  return detail
}

/**
 * 公司详情主体(slug 与 jobId 两个入口共用)。score_detail 那一步 `as` 是跨边界单断言:
 * json 列的四维明细由数据层写入方保证形状,TS 只看得到 JsonObj。
 *
 * @param input 连接、WHERE 与绑定值。
 * @returns 公司详情;查无 null。
 */
async function fetchCompanyWhere(input: CompanyWhereIn): CompanyOut {
  const rows = await queryRows({ db: input.db, sql: SQL.companyDetail(input.where), params: [input.param], map: passJsonRow })
  const c = rows[0]
  if (c == null) {
    return null
  }
  const companyId = Number(c.id)
  const [jr, cntRows, lmiaNocs] = await Promise.all([
    queryRows({ db: input.db, sql: SQL.COMPANY_OPEN_JOBS, params: [companyId], map: toCompanyJob }),
    queryRows({ db: input.db, sql: SQL.COMPANY_OPEN_COUNT, params: [companyId], map: passRow }),
    lmiaNocsOf({ db: input.db, companyId: companyId }),
  ])
  let sources: string[] = []
  if (typeof c.ai_sources === 'string' && c.ai_sources !== '') {
    try {
      const parsed = JSON.parse(c.ai_sources)
      if (Array.isArray(parsed)) {
        sources = parsed
      }
    } catch {
      log({ tag: JOBS_LOG.tag, text: JOBS_LOG.sourcesParseFailed + String(c.slug) })
    }
  }
  let openCount = jr.length
  const cnt = cntRows[0]
  if (cnt != null && cnt.n != null) {
    openCount = Number(cnt.n)
  }
  let scoreDetail: CompanyDetail['scoreDetail'] = null
  if (c.score_detail != null && typeof c.score_detail === 'object' && Array.isArray(c.score_detail) === false) {
    scoreDetail = c.score_detail as CompanyDetail['scoreDetail']
  }
  // eslint-disable-next-line local/no-undefined-type -- 消化点:json 行索引缺席就是 undefined,照实收(开灯批)
  const strCell = function strCell(v: JsonCell | undefined): string {
    if (v == null) {
      return CELL_NONE
    }
    return String(v)
  }
  // eslint-disable-next-line local/no-undefined-type -- 消化点:同上(开灯批)
  const numCell = function numCell(v: JsonCell | undefined): MaybeNum {
    if (v == null) {
      return null
    }
    return Number(v)
  }
  let website = strCell(c.website)
  if (website === '') {
    website = strCell(c.ai_website)
  }
  return {
    name: strCell(c.name), slug: strCell(c.slug), website: website, websiteSource: strCell(c.website_source),
    industry: strCell(c.industry), sectors: strCell(c.sectors), aliasZh: strCell(c.alias_zh), aliasKo: strCell(c.alias_ko),
    wikiUrl: strCell(c.wiki_url), sponsorGrade: numCell(c.sponsor_grade),
    scoreDetail: scoreDetail, aiBrief: strCell(c.ai_brief), aiWebsite: strCell(c.ai_website),
    aiSources: sources, aiFetched: iso(strCell(c.ai_fetched)).slice(0, 10),
    description: strCell(c.description), address: strCell(c.address), province: strCell(c.region),
    lmiaPositions: numCell(c.lmia_positions), lmiaLmias: numCell(c.lmia_lmias),
    lmiaLastQuarter: strCell(c.lmia_last_quarter),
    lmiaStreams: strCell(c.lmia_streams), lmiaSkilled: numCell(c.lmia_positions_skilled), lmiaNocs: lmiaNocs,
    openCount: openCount,
    jobs: jr,
  }
}

/**
 * 公司 LMIA 获批职业拆分(#286;近两年,与 lmiaPositions 同窗口)。
 * 单独容缺查询:列没建/没灌 → 空数组弹框整块不渲,不并主 SELECT 防 42703 掀整个弹框。
 *
 * @param input 连接与公司主键。
 * @returns 获批职业行;容缺空数组。
 */
async function lmiaNocsOf(input: LmiaNocsIn): LmiaNocsOut {
  try {
    const rows = await queryRows({ db: input.db, sql: SQL.COMPANY_LMIA_NOCS, params: [input.companyId], map: passJsonRow })
    const firstRow = rows[0]
    if (firstRow == null) {
      return []
    }
    const raw = firstRow.lmia_nocs
    let dict: JsonObj | null = null
    if (typeof raw === 'string') {
      dict = JSON.parse(raw)
    } else if (raw != null && typeof raw === 'object' && Array.isArray(raw) === false) {
      dict = raw
    }
    if (dict == null) {
      return []
    }
    const entries: [string, number][] = []
    for (const noc of Object.keys(dict)) {
      const n = Number(dict[noc])
      if (NOC_RE.test(noc) && n > 0) {
        entries.push([noc, n])
      }
    }
    entries.sort(byEntryCountDesc)
    if (entries.length === 0) {
      return []
    }
    const codes: string[] = []
    for (const [noc] of entries) {
      codes.push(noc)
    }
    const nameRows = await queryRowsOrEmpty({ db: input.db, sql: SQL.NOC_TITLES_BY_CODES, params: [codes], map: passRow })
    const names = new Map<string, Row>()
    for (const r of nameRows) {
      names.set(String(r.noc), r)
    }
    const out: LmiaNocRow[] = []
    for (const [noc, positions] of entries) {
      const r = names.get(noc)
      let title = OCC_TITLE_NONE
      let titleZh = OCC_TITLE_NONE
      let titleKo = OCC_TITLE_NONE
      if (r != null) {
        title = String(r.title)
        titleZh = String(r.title_zh)
        titleKo = String(r.title_ko)
      }
      out.push({ noc: noc, positions: positions, title: title, titleZh: titleZh, titleKo: titleKo })
    }
    return out
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: JOBS_LOG.tag, text: JOBS_LOG.lmiaNocsProbeFailed + why })
    return []
  }
}

/**
 * 相似雇主(E8-09:同省同行业、有在招岗,按担保档降序 ≤6;SEO 内链 + 横向比较)。
 *
 * @param input 连接、省、行业与排除 slug。
 * @returns 相似雇主行。
 */
export async function loadSimilarEmployers(input: SimilarIn): SimilarOut {
  if (input.province === '' || input.industry === '') {
    return []
  }
  return queryRows({ db: input.db, sql: SQL.SIMILAR_EMPLOYERS, params: [input.province, input.industry, input.excludeSlug], map: toSimilar })
}

/**
 * 邮件提醒命中(E5-03):某条保存筛选自 since 起的新岗($1 留给 since,WHERE 从 $2 起)。
 *
 * @param input 连接、保存筛选与时间下限。
 * @returns 命中行与被跳过的筛选键。
 */
export async function loadAlertHits(input: AlertHitsIn): AlertHitsOut {
  const w = buildJobsWhere({ filters: await resolveQCompanyIds({ db: input.db, filters: input.filters }), startIndex: 2 })
  const params: WhereParam[] = [input.since]
  for (const p of w.params) {
    params.push(p)
  }
  const rows = await queryRows({ db: input.db, sql: SQL.alertHits(w.sql), params: params, map: toAlertHit })
  return { rows: rows, skipped: w.skipped }
}

// =========================================================================
// 8. 入口三问(免费结果;铁律:毫秒级、纯库内聚合、不碰 AI)
// =========================================================================

/**
 * 三问事实包(口径与列表一致;雇主家数 WHERE 与报告名单口径逐字一致 —— 2026-08-01 数不准撞过一次)。
 *
 * @param input 连接与职业码。
 * @returns 事实包;码不像样/无在招 null。
 */
export async function loadQuizFacts(input: QuizFactsIn): QuizFactsOut {
  if (NOC_RE.test(input.noc) === false) {
    return null
  }
  const [tot, prov, stream, desc, spon] = await Promise.all([
    queryRows({ db: input.db, sql: SQL.QUIZ_FACTS_TOTALS, params: [input.noc], map: passRow }),
    queryRows({ db: input.db, sql: SQL.QUIZ_FACTS_BY_PROV, params: [input.noc], map: passRow }),
    queryRows({ db: input.db, sql: SQL.QUIZ_FACTS_STREAMS, params: [input.noc], map: passRow }),
    queryRows({ db: input.db, sql: SQL.NOC_TITLE_ONE, params: [input.noc], map: passRow }),
    queryRowsOrEmpty({ db: input.db, sql: SQL.NOC_EMPLOYER_COUNT, params: [input.noc, Array.from(NO_LIST_PROVINCES)], map: passRow }),
  ])
  const t = tot[0]
  if (t == null || t.open == null || Number(t.open) === 0) {
    return null
  }
  let d: Row = {}
  const descFirst = desc[0]
  if (descFirst != null) {
    d = descFirst
  }
  // eslint-disable-next-line local/no-undefined-type -- 消化点:行索引缺席就是 undefined,照实收(开灯批)
  const strCell = function strCell(v: Cell | undefined): string {
    if (v == null) {
      return CELL_NONE
    }
    return String(v)
  }
  let title = strCell(d.title)
  if (title === '') {
    title = input.noc
  }
  const streams: QuizStreamCount[] = []
  for (const r of stream) {
    streams.push({ stream: strCell(r.stream), n: Number(r.n) })
  }
  const byProv: QuizProvCount[] = []
  for (const r of prov) {
    byProv.push({ province: strCell(r.province), n: Number(r.n), eligible: Number(r.eligible) })
  }
  let sponsors = 0
  const sponFirst = spon[0]
  if (sponFirst != null && sponFirst.n != null) {
    sponsors = Number(sponFirst.n)
  }
  let teer: MaybeNum = null
  if (t.teer != null) {
    teer = Number(t.teer)
  }
  let med: MaybeNum = null
  if (t.med != null) {
    med = Number(t.med)
  }
  let eligible = 0
  if (t.eligible != null) {
    eligible = Number(t.eligible)
  }
  let named = 0
  if (t.named != null) {
    named = Number(t.named)
  }
  return {
    noc: input.noc, teer: teer, title: title, titleZh: strCell(d.title_zh), titleZhShort: strCell(d.title_zh_short),
    titleKoShort: strCell(d.title_ko_short), titleEnShort: strCell(d.title_en_short),
    open: Number(t.open), eligible: eligible, named: named,
    streams: streams, byProv: byProv, medianSalary: med, sponsors: sponsors,
  }
}

/**
 * 热门职业在招数(第 2 题弹框):一条 GROUP BY 出全部,不逐个查(懒查规矩针对公司级数据,这里是聚合数)。
 *
 * @param input 连接与职业码清单。
 * @returns 码 → 在招/可提名。
 */
export async function loadNocOpenCounts(input: NocCountsIn): NocCountsOut {
  const list: string[] = []
  for (const n of input.nocs) {
    if (NOC_RE.test(n)) {
      list.push(n)
    }
  }
  if (list.length === 0) {
    return {}
  }
  const rows = await queryRows({ db: input.db, sql: SQL.NOC_OPEN_COUNTS, params: [list], map: passRow })
  const out: Record<string, NocOpenCount> = {}
  for (const r of rows) {
    out[String(r.noc)] = { open: Number(r.n), eligible: Number(r.eligible) }
  }
  return out
}

/**
 * `loadTopNocs` 的 TTL 缓存壳(/plan/pr 决策页用;2026-08-22 自 lib/score 的表包缓存拆来)。
 * 聚合表日更,10 分钟 TTL 只是挡「Google 落地页每请求一查」(prod-pool-wedge 口径)。
 * ⚠️ lib/quiz/quizTop.ts 还有一份同职缓存 —— quiz 域重构批收拢到这儿(2026-08-22 记账)。
 * 空榜不灌缓存:多半是查挂了,不把一次抖动钉死 10 分钟。
 *
 * @param input 连接与取几。
 * @returns 热门职业行(TTL 内直接给缓存那一份)。
 */
export async function getTopNocs(input: TopNocsIn): TopNocsOut {
  const hit = CACHE.topNocs.get(input.limit)
  if (hit != null && Date.now() - hit.at <= TOP_NOCS_TTL_MS) {
    return hit.rows
  }
  const rows = await loadTopNocs(input)
  if (rows.length > 0) {
    CACHE.topNocs.set(input.limit, { at: Date.now(), rows: rows })
  }
  return rows
}

/**
 * 热门职业清单(不手写,按库里在招量取前 N,自己随市场变)。主路读 ETL 聚合好的 noc_openings
 * (2026-08-12「把这个数据聚合好」:旧现算 200 行实测 3.2s);表没建/没灌回退现算,慢但不瞎 ——
 * 且大清单回退时不算中位薪资(percentile_cont 是查询大头,控件里也用不到)。
 *
 * @param input 连接与取几。
 * @returns 热门职业行。
 */
export async function loadTopNocs(input: TopNocsIn): TopNocsOut {
  const n = Math.min(Math.max(input.limit, 1), TOP_NOCS_MAX)
  try {
    const hit = await queryRows({ db: input.db, sql: SQL.BROAD_NOCS, params: [n], map: toTopNoc })
    if (hit.length > 0) {
      return hit
    }
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: JOBS_LOG.tag, text: JOBS_LOG.topNocsMainFailed + why })
  }
  let medSel = SQL_SEG_NONE
  if (n <= TOP_NOCS_WITH_MED) {
    medSel = MED_SELECT
  }
  return queryRows({ db: input.db, sql: SQL.searchNocByTitle(medSel), params: [n], map: toTopNoc })
}

/**
 * 按大类浏览(只在用户点中某类后查,避免打开问卷就扫 top=200)。
 *
 * @param input 连接、大类与取几。
 * @returns 该类职业行。
 */
export async function loadBroadNocs(input: BroadNocsIn): BroadNocsOut {
  const n = Math.min(Math.max(input.limit, 1), BROAD_NOCS_MAX)
  return queryRows({ db: input.db, sql: SQL.NOC_SEARCH_FALLBACK, params: [input.broad, n], map: toBroadNoc })
}

/**
 * 职业搜索:按中/英职业名模糊找 NOC(noc_descriptions 维度表,≤8 条)。
 *
 * @param input 连接与检索词。
 * @returns 命中行;词太短空数组。
 */
export async function searchNocByTitle(input: NocSearchIn): NocSearchOut {
  const s = input.q.trim()
  if (s.length < NOC_SEARCH_MIN) {
    return []
  }
  return queryRows({ db: input.db, sql: SQL.NOC_BY_TITLE_LIKE, params: [PCT + s + PCT], map: toNocHit })
}

// =========================================================================
// 9. JD 正文(取数 + #123 懒抓;lazy-first 铁律)
// =========================================================================

/**
 * 按 applyUrl 取 JD 正文(DB jobs.description,mart 灌入;空则懒抓)。出口统一脱敏 ——
 * jobtext/advisor 都干净。
 *
 * @param input 连接与投递 URL。
 * @returns 脱敏正文;没有空串。
 */
export async function jobDescription(input: JdIn): JdOut {
  if (input.applyUrl === '') {
    return JD_NONE
  }
  const rows = await queryRows({ db: input.db, sql: SQL.JD_BY_APPLY_URL, params: [input.applyUrl], map: passRow })
  const first = rows[0]
  if (first != null && first.description != null && first.description !== '') {
    return scrubPii(String(first.description))
  }
  return scrubPii(await lazyFetchJd(input))
}

/**
 * 懒抓入口(#123):抓到即写库永久缓存;抓不到负缓存 10 分钟防连点;单飞防并发重复抓
 * (改 `CACHE.jdInflight` / `CACHE.jdFailed`)。
 *
 * @param input 连接与投递 URL。
 * @returns 正文;抓不到空串(前端空态照旧引导官方原帖)。
 */
function lazyFetchJd(input: JdIn): JdOut {
  const neg = CACHE.jdFailed.get(input.applyUrl)
  if (neg != null && Date.now() - neg < JD_NEG_TTL_MS) {
    return Promise.resolve(JD_NONE)
  }
  const flying = CACHE.jdInflight.get(input.applyUrl)
  if (flying != null) {
    return flying
  }
  const p = fetchAndStore(input).finally(function clearInflight() {
    CACHE.jdInflight.delete(input.applyUrl)
  })
  CACHE.jdInflight.set(input.applyUrl, p)
  return p
}

/**
 * 抓 + 写回(lazyFetchJd 的单飞体)。写库失败留痕不拦文本(下次点开重写)。
 *
 * @param input 连接与投递 URL。
 * @returns 正文;抓不到空串。
 */
async function fetchAndStore(input: JdIn): JdOut {
  const text = await doFetch(input.applyUrl)
  if (text !== '') {
    try {
      await input.db.query(SQL.JD_UPDATE_BY_APPLY_URL, [text, input.applyUrl])
    } catch (e) {
      let why = String(e)
      if (e instanceof Error) {
        why = e.message
      }
      log({ tag: JOBS_LOG.tag, text: JOBS_LOG.jdWriteFailed + why })
    }
  } else {
    CACHE.jdFailed.set(input.applyUrl, Date.now())
    if (CACHE.jdFailed.size > JD_FAILED_MAX) {
      CACHE.jdFailed.clear()
    }
  }
  return text
}

/**
 * 真正的抓取:JB 帖先试自有正文,空则抽外链抓原站;非 JB 直接通用抽取(≥300 字符才算抓到)。
 *
 * @param applyUrl 投递 URL。
 * @returns 正文;抓不到空串。
 */
async function doFetch(applyUrl: string): JdOut {
  const isJb = JB_URL_RE.test(applyUrl)
  const first = await fetchHtml(applyUrl)
  if (first === '') {
    return JD_NONE
  }
  if (isJb === false) {
    const t = stripTitleLine({ text: extractText(first), html: first })
    if (t.length >= JD_MIN_LEN) {
      return t
    }
    return JD_NONE
  }
  const own = jbOwnText(first)
  if (own.length >= JD_MIN_LEN) {
    return own
  }
  const ext = jbExternalLink(first)
  if (ext === '') {
    return JD_NONE
  }
  const originHtml = await fetchHtml(ext)
  const t = stripTitleLine({ text: extractText(originHtml), html: originHtml })
  if (t.length < JD_MIN_LEN) {
    return JD_NONE
  }
  const ot = originTitle(originHtml)
  if (ot !== '') {
    return (ORIGIN_TITLE_HEAD + ot + NL + NL + t).slice(0, JD_MAX_LEN)
  }
  return t
}

/**
 * 原站 <title> → 岗名标注(JB 会把聚合帖标题标准化成职业名,差异自解释不掩盖;
 * 取最长的非通用段近似岗名,挑错也只是标注行,正文不受影响)。
 *
 * @param html 原站 HTML。
 * @returns 岗名;取不出空串。
 */
function originTitle(html: string): string {
  const m = TITLE_RE.exec(html)
  if (m == null) {
    return TITLE_NONE
  }
  let t = m[1]
  if (t == null) {
    return TITLE_NONE
  }
  for (const [re, to] of TITLE_ENT_PAIRS) {
    t = t.replace(re, to)
  }
  const segs: string[] = []
  for (const raw of t.split(TITLE_SPLIT_RE)) {
    const seg = raw.trim()
    if (seg.length >= TITLE_SEG_MIN && TITLE_JUNK_RE.test(seg) === false && TITLE_DOMAIN_RE.test(seg) === false) {
      segs.push(seg)
    }
  }
  let best = TITLE_NONE
  for (const seg of segs) {
    if (seg.length > best.length) {
      best = seg
    }
  }
  return best.replace(TITLE_TAIL_RE, STRIP_REPL).trim()
}

/**
 * JB 官方页的外链(#140:href 是实体编码的,不解码带 query 的外链一律抓错页)。
 *
 * @param html JB 页 HTML。
 * @returns 外链;没有空串。
 */
function jbExternalLink(html: string): string {
  const m = JB_EXT_LINK_RE.exec(html)
  if (m == null) {
    return JB_LINK_NONE
  }
  let href = m[1]
  if (href == null) {
    return JB_LINK_NONE
  }
  for (const [re, to] of HREF_ENT_PAIRS) {
    href = href.replace(re, to)
  }
  return href
}

/**
 * 通用正文抽取(readability 极简版,零依赖):剥非内容块 → 块级转行 → 剥标签 → 反转义 → 压行 → 裁头部。
 *
 * @param html 原始 HTML。
 * @returns 正文(≤15000 字符)。
 */
function extractText(html: string): string {
  let t = html.replace(JD_STRIP_BLOCK_RE, SPACE)
  t = t.replace(JD_BLOCK_BREAK_RE, NL)
  t = t.replace(JD_TAG_RE, SPACE)
  for (const [re, to] of ENT_PAIRS) {
    t = t.replace(re, to)
  }
  const lines: string[] = []
  for (const raw of t.split(NL)) {
    const l = raw.replace(LINE_SPACES_RE, SPACE).trim()
    if (l.length > JD_LINE_MIN) {
      lines.push(l)
    }
  }
  return trimHeadJunk(lines).join(NL).slice(0, JD_MAX_LEN)
}

/**
 * 头部残渣裁剪(#126 央行帖实证):黑名单行丢;<30 字符且无数字的孤行丢,但紧跟「xxx:」标签行的保留。
 * 正文区一行不动;裁没了一半以上视为误杀,整体回退不裁(宁脏勿缺)。
 *
 * @param lines 抽取后的行。
 * @returns 裁剪后的行。
 */
function trimHeadJunk(lines: StrList): StrList {
  let bound = -1
  for (const [i, line] of lines.entries()) {
    if (line.length >= JD_PARA_LEN) {
      bound = i
      break
    }
  }
  if (bound < 0) {
    bound = Math.min(lines.length, JD_HEAD_MAX_LINES)
  } else {
    bound = Math.min(bound, JD_HEAD_MAX_LINES)
  }
  const head: string[] = []
  for (const [i, l] of lines.entries()) {
    if (i >= bound) {
      break
    }
    if (JD_HEAD_JUNK_RE.test(l)) {
      continue
    }
    let prevKept = PREV_LINE_NONE
    const lastKept = head[head.length - 1]
    if (lastKept != null) {
      prevKept = lastKept
    }
    if (l.length < JD_ORPHAN_LEN && HAS_DIGIT_RE.test(l) === false && COLON_END_RE.test(l) === false && COLON_END_RE.test(prevKept) === false) {
      continue
    }
    head.push(l)
  }
  const out: string[] = []
  for (const l of head) {
    out.push(l)
  }
  for (const l of lines.slice(bound)) {
    out.push(l)
  }
  if (out.length * 2 < lines.length) {
    return lines
  }
  return out
}

/**
 * JB 详情页自有正文,两处都看(#141 实证:聚合帖没有结构区,但 property="description" 里有雇主原文)。
 *
 * @param html JB 页 HTML。
 * @returns 正文;两处都没有空串。
 */
function jbOwnText(html: string): string {
  const i = html.indexOf(JB_REQ_ANCHOR)
  if (i >= 0) {
    const end = html.indexOf(JB_APPLY_ANCHOR, i)
    let slice = html.slice(i, i + JB_SECTION_CAP)
    if (end > i) {
      slice = html.slice(i, end)
    }
    const t = extractText(slice)
    if (t.length >= JD_MIN_LEN) {
      return t
    }
  }
  const m = JB_DESC_RE.exec(html)
  if (m == null) {
    return JD_NONE
  }
  let inner = m[1]
  if (inner == null) {
    return JD_NONE
  }
  for (const [re, to] of JB_INNER_ENT_PAIRS) {
    inner = inner.replace(re, to)
  }
  return extractText(inner)
}

/**
 * 正文首行剥 <title> 原文残留(#130;与 <title> 全等才剥 —— 宁缺勿滥,不误伤正文)。
 *
 * @param input 正文与原始 HTML。
 * @returns 剥后的正文。
 */
function stripTitleLine(input: StripTitleIn): string {
  const m = TITLE_RE.exec(input.html)
  if (m == null) {
    return input.text
  }
  let raw = m[1]
  if (raw == null) {
    return input.text
  }
  for (const [re, to] of TITLE_ENT_PAIRS) {
    raw = raw.replace(re, to)
  }
  raw = raw.replace(LINE_SPACES_RE, SPACE).trim()
  if (raw === '') {
    return input.text
  }
  const nl = input.text.indexOf(NL)
  let firstLine = input.text
  if (nl >= 0) {
    firstLine = input.text.slice(0, nl)
  }
  if (firstLine.trim() === raw) {
    return input.text.slice(nl + 1)
  }
  return input.text
}

/**
 * 拉一页 HTML(8s 超时、80 万字符封顶;任何失败回空串 —— 懒抓失败走负缓存,不值得抛)。
 *
 * @param url 目标页。
 * @returns HTML;拉不到空串。
 */
async function fetchHtml(url: string): HtmlOut {
  const u = new URL(url)
  if (badHost(u)) {
    return HTML_NONE
  }
  const ctrl = new AbortController()
  const timer = setTimeout(function abortJd() {
    ctrl.abort()
  }, JD_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { [HDR_USER_AGENT]: JD_UA, Accept: ACCEPT_HTML }, redirect: REDIRECT_FOLLOW, signal: ctrl.signal,
    })
    if (res.ok === false) {
      return HTML_NONE
    }
    return (await res.text()).slice(0, JD_HTML_CAP)
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: JOBS_LOG.tag, text: JOBS_LOG.jdFetchFailed + why })
    return HTML_NONE
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 内网/环回地址挡板(SSRF:applyUrl 来自库,但外链是原站页里抽的)。
 *
 * @param u 解析后的 URL。
 * @returns 是否该拒抓。
 */
function badHost(u: UrlHandle): boolean {
  if (JD_PROTO_RE.test(u.protocol) === false) {
    return true
  }
  if (JD_BAD_HOST_RE.test(u.hostname)) {
    return true
  }
  return JD_BAD_HOST_172_RE.test(u.hostname)
}

// =========================================================================
// 10. 职业竞争面(该职业各省在招;2026-08-22 自 lib/score 并入)
// =========================================================================

/**
 * 该职业分省竞争面(2026-08-15 #307 排序单源化时自路由抽出;2026-08-22 自 lib/score 并入本域。
 * `/api/jobs/competition` 与 profile-pathways 的服务端排序共用这一份,口径不许分叉 ——
 * 并入时顺手收掉路由里残留的单 noc 快照版:那份还在读 stats_occupation 日快照,
 * 与下面 ① 的实时口径已经岔开)。
 *
 * 🔴 职业级「几人抢一个」算不出来,本站不编 —— 只给三类实数(在招/新增/平均在招天数)
 * 与省级名额竞争比,不合成分数(完整口径注释见 `/api/jobs/competition` 路由头)。
 *
 * 2026-08-16 Frank「在招是显示多少就查多少」「要支持多个职位类别」:
 * ① openJobs 走**实时 jobs 表**(与「查岗位」落地页同一条谓词),不取日快照 ——
 *    快照与实时差 1-3 岗,点进去数字对不上就是「跑偏」;new30d/平均在招天数仍走快照(本就是统计口径);
 * ② 档案里选了几个职业就算几个:nocs 全量参与,岗位按 noc = ANY(...) 去重计数。
 *
 * @param input 连接与职业码清单。
 * @returns 各省竞争面(按在招量降序,序在 SQL 里)。
 */
export async function loadOccCompetition(input: OccCompetitionIn): OccCompetitionOut {
  const nocs: StrList = []
  for (const n of input.nocs) {
    if (NOC_RE.test(n)) {
      nocs.push(n)
    }
  }
  if (nocs.length === 0) {
    return []
  }
  const [occ, diff, aip, rcip, fcip] = await Promise.all([
    queryRowsOrEmpty({ db: input.db, sql: SQL.OCC_COMPETITION_BY_PROV, params: [nocs], map: toOccOpen }),
    queryRowsOrEmpty({ db: input.db, sql: SQL.PROV_DIFFICULTY, params: [], map: toOccDiffFact }),
    queryRowsOrEmpty({ db: input.db, sql: SQL.PROV_OPEN_COUNT, params: [nocs], map: toProvCount }),
    queryRowsOrEmpty({ db: input.db, sql: SQL.PROV_OPEN_COUNT_NOC4, params: [nocs], map: toProvCount }),
    queryRowsOrEmpty({ db: input.db, sql: SQL.PROV_OPEN_COUNT_BROAD, params: [nocs], map: toProvCount }),
  ])
  const ratios = ratioMapOf(diff)
  const aips = countMapOf(aip)
  const rcips = countMapOf(rcip)
  const fcips = countMapOf(fcip)
  const out: OccCompetitionRows = []
  for (const o of occ) {
    out.push({
      province: o.province, openJobs: o.openJobs, new30d: o.new30d, avgDaysOpen: o.avgDaysOpen,
      ratio: ratioOf({ map: ratios, key: o.province }),
      aipJobs: countOf({ map: aips, key: o.province }),
      rcipJobs: countOf({ map: rcips, key: o.province }),
      fcipJobs: countOf({ map: fcips, key: o.province }),
    })
  }
  return out
}

/**
 * 计数查表:没有这省是 0(GROUP BY 没出这省 = 一个都没有,「一个都没有」本身就是答案)。
 *
 * @param input 表与省码。
 * @returns 数;没有则 0。
 */
function countOf(input: CountOfIn): number {
  const v = input.map[input.key]
  if (v == null) {
    return 0
  }
  return v
}

/**
 * 比值查表:没有这省保 null(名额竞争比官方可缺,不折 0)。
 *
 * @param input 表与省码。
 * @returns 比值;没有则 null。
 */
function ratioOf(input: RatioOfIn): MaybeNum {
  const v = input.map[input.key]
  if (v == null) {
    return null
  }
  return v
}

/**
 * 计数行 → 省码 → 数。
 *
 * @param rows 按省计数行。
 * @returns 省码 → 数。
 */
function countMapOf(rows: ProvCounts): CountMap {
  const out: CountMap = {}
  for (const r of rows) {
    out[r.province] = r.n
  }
  return out
}

/**
 * 各省难度事实 → 省码 → 名额竞争比(省级,与职业无关;比值缺位的省不出键)。
 *
 * @param rows 难度事实行。
 * @returns 省码 → 比值。
 */
function ratioMapOf(rows: OccDiffFacts): RatioMap {
  const out: RatioMap = {}
  for (const r of rows) {
    if (r.ratio != null) {
      out[r.province] = r.ratio
    }
  }
  return out
}

// =========================================================================
// 11. 界面显示(数据层值 → 界面词;2026-08-22 Frank「所有都按域来管理」自 i18n 迁回)
// =========================================================================

/**
 * 官方通道名 → 界面语言的译名;英文界面与表里没有的一律返回空(只显官方英文名)。
 *
 * @param input 官方通道名与界面语言。
 * @returns 译名;不出译名则空串。
 */
export function drawStreamNote(input: DrawStreamNoteIn): string {
  if (input.lang === LANG_EN) {
    return STREAM_NOTE_NONE
  }
  const hit = DRAW_STREAM_L10N[(input.stream || PARAM_NONE).trim()]
  if (hit == null) {
    return STREAM_NOTE_NONE
  }
  if (input.lang === LANG_KO) {
    return hit.ko
  }
  return hit.zh
}

/**
 * 具名通道 chip 的三语显示(未知值原样回退)。
 *
 * @param input 取词函数与数据层 label。
 * @returns 界面词。
 */
export function streamDisplay(input: StreamDisplayIn): string {
  const key = STREAM_L10N[input.label]
  if (key == null) {
    return input.label
  }
  return input.t(key)
}

/**
 * 官方通道名 → 显示短名(表里没有原样返回;语言缺省由调用端 `?? 'zh'` 兜,与 makeT 同)。
 *
 * @param input 官方通道名与界面语言。
 * @returns 显示短名。
 */
export function reqStreamDisplay(input: ReqStreamDisplayIn): string {
  const hit = REQ_STREAM_L10N[normReqStream(input.stream)]
  if (hit == null) {
    return input.stream
  }
  if (input.lang === LANG_EN) {
    return hit.en
  }
  if (input.lang === LANG_KO) {
    return hit.ko
  }
  return hit.zh
}

/**
 * 官方通道名归一(小写、破折号统一、连空白折一)—— mart 里的破折号是 em dash,
 * 写死全串等于把编码问题埋进代码(pathVerdict 同款告诫)。
 *
 * @param s 官方通道名。
 * @returns 归一后的键。
 */
function normReqStream(s: string): string {
  return (s || PARAM_NONE).toLowerCase().replace(NORM_DASH_RE, NORM_DASH).replace(NORM_WS_RE, SPACE).trim()
}

/**
 * EE 类别 label 的三语显示。#209(第 26 轮体检):数据层用「/」拼接,
 * 显示层改顿号枚举(no-dot-separator 硬规矩:禁「·」「/」杂糅多信息)。
 *
 * @param input 取词函数与数据层 label(可含「/」多段)。
 * @returns 界面词(顿号枚举)。
 */
export function eeDisplay(input: EeDisplayIn): string {
  const out: StrList = []
  for (const raw of input.label.split(EE_SPLIT)) {
    const s = raw.trim()
    const key = EE_L10N[s]
    if (key == null) {
      out.push(s)
    } else {
      out.push(input.t(key))
    }
  }
  return out.join(input.t(SEP_KEY))
}

/**
 * 联邦轮次 cat_key 的三语显示(未知键原样回退)。
 *
 * @param input 取词函数与数据层英文 cat_key。
 * @returns 界面词。
 */
export function eeKeyDisplay(input: EeKeyDisplayIn): string {
  const hit = EE_KEY_L10N[input.key]
  if (hit == null) {
    return input.key
  }
  return input.t(hit)
}

/**
 * 通道名以省名开头时把省名摘掉 —— 旁边那行灰字已经写着省名了(走查 #293)。
 * 「Saskatchewan Employment Offer」+ 灰字「Saskatchewan」→ 主文案只留「Employment Offer」。
 * 摘完为空(整条名字就是个省名)则原样返回:宁可重复一次,不给一个空标题。
 *
 * @param input 通道名与省名(全称)。
 * @returns 摘掉省名前缀后的通道名。
 */
export function dropProvPrefix(input: DropProvPrefixIn): string {
  const p = (input.prov || PARAM_NONE).trim()
  const n = (input.name || PARAM_NONE).trim()
  if (p === '' || n.startsWith(p) === false) {
    return n
  }
  const rest = n.slice(p.length).replace(PROV_PREFIX_TRIM_RE, STRIP_REPL).trim()
  if (rest === '') {
    return n
  }
  return rest
}

/**
 * 省情报卡(/api/jobs/province 的取数):provinces.info + stats 的 difficulty,零 AI 零额度。
 *
 * @param input 连接与省码。
 * @returns 两格透传;查无该省 null。
 */
export async function loadProvinceCard(input: ProvinceCardIn): ProvinceCardOut {
  const infoRows = await queryRows({ db: input.db, sql: SQL.PROVINCE_INFO_ONE, params: [input.code], map: toInfoCell })
  const infoFirst = infoRows[0]
  if (infoFirst == null) {
    return null
  }
  const diffRows = await queryRows({ db: input.db, sql: SQL.PROV_DIFFICULTY_ONE, params: [input.code], map: toDiffCell })
  const difficulty: JsonCell = firstOr(diffRows, null)
  return { info: infoFirst, difficulty: difficulty }
}

/**
 * 市/区情报卡(/api/jobs/city 的取数,E8-12b):全部现算自库内既有表 ——
 * jobs 聚合 + dli(PGWP 可申院校)+ designated_employers(AIP)。district 非空另附整套
 * 区级统计(「点区看区」,Frank 2026-07-23)。市级 2,346 城不预计算(懒化透镜)。
 *
 * @param input 连接、市、省与可空的区。
 * @returns 市情报卡(区级没数据时 district 落 null)。
 */
export async function loadCityCard(input: CityCardIn): CityCardOut {
  const [aggRows, broads, dliTop, aipRows, dliCountRows] = await Promise.all([
    queryRows({ db: input.db, sql: SQL.cityTotals(SQL.OPEN_COND), params: [input.city, input.prov], map: toCityAgg }),
    queryRows({ db: input.db, sql: SQL.cityByBroad(SQL.OPEN_COND), params: [input.city, input.prov], map: toBroadCount }),
    queryRows({ db: input.db, sql: SQL.CITY_DLI, params: [input.city, input.prov], map: toDliTop }),
    queryRows({ db: input.db, sql: SQL.CITY_DESIGNATED_COUNT, params: [input.city, input.prov], map: toCountN }),
    queryRows({ db: input.db, sql: SQL.CITY_DLI_COUNT, params: [input.city, input.prov], map: toCountN }),
  ])
  const base = firstOr(aggRows, { openJobs: 0, new7d: 0, medSalary: null })
  const aipEmployers = firstOr(aipRows, 0)
  const dliCount = firstOr(dliCountRows, 0)
  let district: DistrictCard | null = null
  if (input.district !== '') {
    const [dAggRows, dBroads, dEmps] = await Promise.all([
      queryRows({ db: input.db, sql: SQL.districtTotals(SQL.OPEN_COND), params: [input.city, input.prov, input.district], map: toCityAgg }),
      queryRows({ db: input.db, sql: SQL.districtByBroad(SQL.OPEN_COND), params: [input.city, input.prov, input.district], map: toBroadCount }),
      queryRows({ db: input.db, sql: SQL.districtEmployers(SQL.OPEN_COND), params: [input.city, input.prov, input.district], map: toDistrictEmployer }),
    ])
    const dAggFirst = dAggRows[0]
    if (dAggFirst != null) {
      district = {
        openJobs: dAggFirst.openJobs, new7d: dAggFirst.new7d, medSalary: dAggFirst.medSalary,
        topBroads: dBroads, topEmployers: dEmps,
      }
    }
  }
  return {
    openJobs: base.openJobs, new7d: base.new7d, medSalary: base.medSalary,
    topBroads: broads, dli: { count: dliCount, top: dliTop }, aipEmployers: aipEmployers,
    district: district,
  }
}

/**
 * 大维度包(/api/jobs/dims 的取数,E10-01 P3):城市/区/AIP 雇主/NOC 描述四张维度表。
 * 上限沿原 payload.find 的 5000/2000(写死在 SQL 里)。
 *
 * @param input 连接。
 * @returns 四张维度表。
 */
export async function loadBigDims(input: BigDimsIn): BigDimsOut {
  const [cities, districts, designatedEmployers, nocDescriptions] = await Promise.all([
    queryRows({ db: input.db, sql: SQL.DIMS_CITIES, params: [], map: toCityDim }),
    queryRows({ db: input.db, sql: SQL.DIMS_DISTRICTS, params: [], map: toDistrictDim }),
    queryRows({ db: input.db, sql: SQL.DIMS_DESIGNATED, params: [], map: toDesigDim }),
    queryRows({ db: input.db, sql: SQL.DIMS_NOC_DESCRIPTIONS, params: [], map: toNocDescDim }),
  ])
  return { cities: cities, districts: districts, designatedEmployers: designatedEmployers, nocDescriptions: nocDescriptions }
}

/**
 * Job Bank 投递邮箱现抓(E9-04 B11):初始 HTML 和 ETL 存的 description 里都没有 ——
 * 邮箱藏在「Show how to apply」的 JSF 局部提交后面。两跳:GET 取 seekeractivity 表单 →
 * 复刻 JSF partial POST(render=@all)→ 从 How to apply 块附近抽邮箱。
 * 白名单与限额在路由;本函数只管抓。
 *
 * @param postingUrl 规范化后的 Job Bank 职位页 url。
 * @returns 邮箱;空串 = 确认无(页面在但没表单/没邮箱);null = 抓取失败(负缓存到期重试)。
 */
export async function loadApplyEmail(postingUrl: string): ApplyMailOut {
  const first = await fetch(postingUrl, {
    headers: { [HDR_USER_AGENT]: JD_UA, [HDR_ACCEPT]: ACCEPT_HTML },
    redirect: REDIRECT_FOLLOW, signal: AbortSignal.timeout(APPLY_TIMEOUT_MS),
  }).catch(nullFetch)
  if (first == null || first.ok === false) {
    return null
  }
  const cookieParts: string[] = []
  for (const c of first.headers.getSetCookie()) {
    const head = c.split(COOKIE_CUT)[0]
    if (head != null) {
      cookieParts.push(head)
    }
  }
  const cookies = cookieParts.join(COOKIE_JOIN)
  const html = await first.text()
  const actionM = SEEKER_ACTION_RE.exec(html)
  const jidM = SEEKER_JOBID_RE.exec(html)
  if (actionM == null || jidM == null) {
    return MAIL_NONE
  }
  const jid = jidM[1]
  const action = actionM[1]
  if (jid == null || action == null) {
    return MAIL_NONE
  }
  const form = new URLSearchParams(JSF_FORM_BASE)
  form.set(JSF_KEY_JSJOBID, jid)
  form.set(JSF_KEY_JOBID, jid)
  const h: Record<string, string> = {
    [HDR_USER_AGENT]: JD_UA, [HDR_ACCEPT]: ACCEPT_ANY, [HDR_REFERER]: postingUrl,
    [HDR_CONTENT_TYPE]: FORM_CONTENT_TYPE, [FACES_REQUEST_HDR]: FACES_REQUEST_VAL,
  }
  if (cookies !== '') {
    h[HDR_COOKIE] = cookies
  }
  const second = await fetch(JB_ORIGIN + action.replace(AMP_ENT_RE, AMP), {
    method: METHOD_POST, headers: h, body: form.toString(), signal: AbortSignal.timeout(APPLY_TIMEOUT_MS),
  }).catch(nullFetch)
  if (second == null || second.ok === false) {
    return null
  }
  const out = await second.text()
  const i = out.search(HOW_APPLY_RE)
  if (i >= 0) {
    return pickMail(out.slice(i, i + APPLY_SLICE_LEN))
  }
  return pickMail(out)
}

/**
 * 抓取单跳失败的兜底(catch 传具名函数;失败语义交回 null 由缓存层负缓存)。
 *
 * @param _e 捕到的错(超时/网络层)。
 * @returns null。
 */
function nullFetch(_e: Error): null {
  return null
}

/**
 * 文本里挑第一枚**雇主侧**邮箱:Job Bank 自家与政府域的地址不算(那是客服不是投递)。
 *
 * @param s 待扫文本。
 * @returns 邮箱;没有是空串。
 */
function pickMail(s: string): string {
  const matches = s.match(MAIL_RE)
  if (matches == null) {
    return MAIL_NONE
  }
  for (const m of matches) {
    const at = m.split(MAIL_AT)
    let d = MAIL_DOMAIN_NONE
    if (at[1] != null) {
      d = at[1].toLowerCase()
    }
    if (d === '' || d.includes(MAIL_SKIP_WORD)) {
      continue
    }
    let skip = false
    for (const suf of MAIL_SKIP_SUFFIXES) {
      if (d.endsWith(suf)) {
        skip = true
      }
    }
    if (skip) {
      continue
    }
    return m
  }
  return MAIL_NONE
}

/**
 * 相似雇主查挂时的空表兜底(catch 传具名函数;弹框主体照常给,不 500)。
 *
 * @param _e 捕到的错(查询层已留痕)。
 * @returns 空表。
 */
export function emptySimilar(_e: Error): SimilarList {
  return []
}

/**
 * 已有的 JD 五节整理版（jd-translate 只翻整理版就绪的，不收任意文本防开放代理）。
 *
 * @param input 连接与职位链接。
 * @returns 整理版全文；没生过/查无这岗是 null。
 */
export async function loadJdFormatted(input: JdFormattedIn): MaybeStrOut {
  const rows = await queryRows({ db: input.db, sql: SQL.JD_FORMATTED_BY_URL, params: [input.url], map: toJdFormattedCell })
  return firstOf(rows)
}

/**
 * jdformat 的岗态（id、两个只补空字段、已有整理版）。
 *
 * @param input 连接与职位链接。
 * @returns 岗态行；查无这岗是 null。
 */
export async function loadJdState(input: JdFormattedIn): JdStateOut {
  const rows = await queryRows({ db: input.db, sql: SQL.JD_STATE_BY_URL, params: [input.url], map: toJdStateRow })
  return firstOf(rows)
}

/**
 * JD 五节整理生成（J2）：friendChat 按提示头整理 → 校验 → 存列 = 永久缓存；
 * 顺带抽 [TERM]/[HRS] 补空字段（只补空不覆盖官方标注，622 缺失岗兜底）。
 * 红线：只搬运不发挥 —— 输出里的多位数字必须在原文出现，否则整条拒收；
 * 原文永不覆盖。正文预算 = FRIEND_INPUT_MAX - 提示头 - 边距（#123d：上游硬上限
 * 6000，超长帖截前段，尾部缺节由 (not stated) + 前端兜底）。
 *
 * @param input 连接、岗态与原文。
 * @returns 整理版；生成/校验失败是 null。
 */
export async function generateJdFormatted(input: GenerateJdIn): GenerateJdOut {
  const src = input.description
  const budget = FRIEND_INPUT_MAX - JD_FORMAT_PROMPT_HEAD.length - JD_BUDGET_MARGIN
  const r = await friendChat({ prompt: JD_FORMAT_PROMPT_HEAD + src.slice(0, budget), timeoutMs: JD_GEN_TIMEOUT_MS })
  if (r == null) {
    return null
  }
  let out = r.answer
  let term = JD_FIELD_NONE
  const termM = JD_TERM_RE.exec(out)
  if (termM != null && termM[1] != null) {
    term = termM[1].toLowerCase()
  }
  let hrs = JD_FIELD_NONE
  const hrsM = JD_HRS_RE.exec(out)
  if (hrsM != null && hrsM[1] != null) {
    hrs = hrsM[1].toLowerCase()
  }
  out = out.replace(JD_TAIL_STRIP_RE, STRIP_REPL).trim()
  const ok = validateJdFormatted(out, src)
  log({ tag: JOBS_LOG.tag, text: JOBS_LOG.jdformatLine + input.state.id + JOBS_LOG.jdformatSrc + src.length + JOBS_LOG.jdformatCh + JOBS_LOG.jdformatCached + r.cached + JOBS_LOG.jdformatValid + ok })
  if (ok === false) {
    return null
  }
  out = scrubPii(out)
  await input.db.query(SQL.JD_SET_FORMATTED, [out, input.state.id])
  if (term !== '' && JD_TERM_VALUES.includes(term) && input.state.term == null) {
    await input.db.query(SQL.JD_SET_EMP_TERM, [term, input.state.id])
  }
  if (hrs !== '' && JD_HOURS_VALUES.includes(hrs) && input.state.hours == null) {
    await input.db.query(SQL.JD_SET_EMP_HOURS, [hrs, input.state.id])
  }
  return out
}

/**
 * 整理版校验：五节标记齐 + 输出多位数字必须来自原文（防幻觉）+ 长度合理。
 * 库定两参（输出与原文必须分开比）—— 入参不走 In 型是因为两格同型同命，
 * 包成对象反而容易传反。
 *
 * @param out 模型输出（已剥尾部字段行）。
 * @param src 岗位原文。
 * @returns 过没过。
 */
// eslint-disable-next-line local/one-parameter -- 输出/原文两格同型同命，包成 In 对象反而易传反；校验函数的两列对比是它的本业
function validateJdFormatted(out: string, src: string): boolean {
  for (const mark of JD_SECTION_MARKS) {
    if (out.includes(MARK_HEAD + mark + MARK_TAIL) === false) {
      return false
    }
  }
  if (out.length < JD_OUT_MIN_LEN || out.length > Math.max(JD_OUT_MAX_BASE, src.length * JD_OUT_MAX_RATIO)) {
    return false
  }
  const srcDigits = new Set<string>()
  const srcM = src.match(JD_DIGITS_RE)
  if (srcM != null) {
    for (const d of srcM) {
      srcDigits.add(d)
    }
  }
  const outM = out.replace(JD_TAIL_STRIP_RE, STRIP_REPL).match(JD_DIGITS_RE)
  if (outM != null) {
    for (const d of outM) {
      if (srcDigits.has(d) === false) {
        return false
      }
    }
  }
  return true
}

/**
 * 按岗 id 取投递链接（resume-match 的 jd 兜底链：前端没带 JD 时服务端按 jobId
 * 走 jobDescription 统一入口兜一次）。
 *
 * @param input 连接与岗 id。
 * @returns 投递链接；查无这岗/没链接是 null。
 */
export async function loadApplyUrlById(input: ApplyUrlIn): MaybeStrOut {
  const rows = await queryRows({ db: input.db, sql: SQL.JOB_APPLY_URL_BY_ID, params: [input.jobId], map: toApplyUrlCell })
  return firstOf(rows)
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * 时间格词汇:pg timestamp 回来是 Date、文本列是字符串、可空 —— 归一成 ISO 串(空落空串)。
 * 入参放宽到库标量:窄行(Row)的时间格在类型上是 Cell,运行时才是 Date,这里一网收干净。
 *
 * @param v 库回的时间格;行索引缺席时 undefined(消化点,开灯批 2026-08-26)。
 * @returns ISO 串;没有则空串。
 */
// eslint-disable-next-line local/no-undefined-type, local/typed-signature -- 消化点:行索引缺席就是 undefined,照实收(开灯批)
export function iso(v: TimeLike | undefined): string {
  if (v instanceof Date) {
    return v.toISOString()
  }
  if (v == null) {
    return ISO_NONE
  }
  return String(v)
}

/**
 * jobs 主表一行 → 板上一行(不含 match;match 由调用方按人/序算好传入)。
 * Pro 数据列 2026-07-25「先都显示出来」后暂不剥值(pro 参数保留,收费面回收时改回)。
 *
 * @param input 原始行、匹配档与付费态。
 * @returns 板上一行。
 */
// eslint-disable-next-line local/function-length -- 61 列的一次性拼装,拆开只会把一行搬成两处
export function toJobRow(input: ToJobRowIn): JobRow {
  const j = input.row
  let broad = text(j.broad)
  if (broad === '') {
    broad = UNCAT
  }
  let mid = text(j.mid)
  if (mid === '') {
    mid = UNCAT
  }
  let fine = text(j.fine)
  if (fine === '') {
    fine = UNCAT
  }
  let address = text(j.address)
  if (address === '') {
    address = text(j.company_address)
  }
  let officialUrl = text(j.official_url)
  if (officialUrl === '') {
    officialUrl = text(j.company_website)
  }
  let status = text(j.status)
  if (status === '') {
    status = 'open'
  }
  let certificates: string[] = []
  if (Array.isArray(j.certificates)) {
    certificates = j.certificates
  }
  return {
    match: input.matchLevel,
    id: j.id,
    title: text(j.title),
    company: text(j.company_name),
    companySlug: text(j.company_slug),
    companyDescription: text(j.company_description),
    companySectors: text(j.company_sectors),
    companyWebsiteSrc: text(j.website_source),
    lmiaPositions: numOrNull(j.lmia_positions),
    lmiaPositionsSkilled: numOrNull(j.lmia_positions_skilled),
    lmiaLastQuarter: text(j.lmia_last_quarter),
    lmiaStreams: text(j.lmia_streams),
    address: address,
    source: text(j.source),
    sourceLabel: text(j.source_label),
    origin: text(j.origin),
    country: text(j.country),
    province: text(j.province),
    city: text(j.city),
    district: text(j.district),
    noc: text(j.noc),
    category: text(j.category),
    teer: numOrNull(j.teer),
    broad: broad,
    mid: mid,
    fine: fine,
    accessibility: text(j.accessibility),
    score: numOrNull(j.score),
    gradeChannel: numOrNull(j.grade_channel),
    sponsorGrade: numOrNull(j.sponsor_grade),
    pnpEligible: j.pnp_eligible === true,
    pnpStream: text(j.pnp_stream),
    eeCategory: text(j.ee_category),
    aip: j.aip === true,
    pilot: text(j.pilot), pilotCommunity: text(j.pilot_community),
    pilotEmployer: j.pilot_employer === true, pilotOcc: text(j.pilot_occ),
    employmentTerm: text(j.employment_term),
    employmentHours: text(j.employment_hours),
    eligibilityFlag: text(j.eligibility_flag),
    eligibilityQuote: text(j.eligibility_quote),
    certificates: certificates,
    education: text(j.education),
    salary: text(j.salary),
    salaryAnnual: numOrNull(j.salary_annual),
    salaryText: text(j.salary_text),
    wageMedHourly: numOrNull(j.wage_med_hourly),
    wageMedAnnual: numOrNull(j.wage_med_annual),
    wageLowHourly: numOrNull(j.wage_low_hourly),
    wageLowAnnual: numOrNull(j.wage_low_annual),
    wageHighHourly: numOrNull(j.wage_high_hourly),
    wageHighAnnual: numOrNull(j.wage_high_annual),
    wageYear: text(j.wage_year),
    officialUrl: officialUrl,
    applyUrl: text(j.apply_url),
    datePosted: iso(j.date_posted),
    firstSeen: iso(j.first_seen),
    lastSeen: iso(j.last_seen),
    status: status,
    closedAt: iso(j.closed_at),
  }
}

/**
 * jobs 主表一行 → 匹配引擎只读的那几格(rowMatchLevel 与两个视图共用一份收窄)。
 *
 * @param j 原始行。
 * @returns 匹配侧字段。
 */
export function toMatchJob(j: JobDbRow): MatchJob {
  return {
    noc: text(j.noc), teer: numOrNull(j.teer), province: text(j.province), pnpEligible: j.pnp_eligible === true,
    pnpStream: text(j.pnp_stream), eeCategory: text(j.ee_category),
    salaryAnnual: numOrNull(j.salary_annual), wageMedAnnual: numOrNull(j.wage_med_annual),
    lmiaPositions: numOrNull(j.lmia_positions), lmiaPositionsSkilled: numOrNull(j.lmia_positions_skilled),
    lmiaLastQuarter: text(j.lmia_last_quarter),
  }
}

/**
 * 维度行 → 匹配引擎口径的省清单行(/api/jobs-data 自取维度时与 page.tsx 同一把尺;
 * program 空档落 'PNP')。
 *
 * @param r 原始行(SQL 别名 camelCase)。
 * @returns 省清单行。
 */
export function mapPnpOcc(r: Row): PnpOcc {
  let program = text(r.program)
  if (program === '') {
    program = PROGRAM_PNP
  }
  return {
    province: text(r.province), stream: text(r.stream), label: text(r.label), type: text(r.type),
    program: program, noc: text(r.noc), name: text(r.name),
    gtaRestricted: r.gtaRestricted === true, url: text(r.url), fetched: text(r.fetched),
  }
}

/**
 * 维度行 → 联邦 EE 类别行(numeric 三列走词汇,两条路都对)。
 *
 * @param r 原始行(SQL 别名 camelCase)。
 * @returns EE 类别行。
 */
export function mapEeCat(r: Row): EeOcc {
  return {
    category: text(r.category), label: text(r.label), noc: text(r.noc), teer: numOrNull(r.teer),
    title: text(r.title), url: text(r.url), fetched: text(r.fetched),
    drawCrs: numOrNull(r.drawCrs), drawDate: text(r.drawDate), drawSize: numOrNull(r.drawSize),
  }
}

/**
 * MATCH_PNP_OCCUPATIONS 一行 → 匹配维度省清单行(时间列是 timestamp,过 iso)。
 *
 * @param r 原始行。
 * @returns 匹配维度行。
 */
export function toPnpOccDim(r: Row): PnpOccDim {
  return {
    province: text(r.province), label: text(r.label), type: text(r.type), noc: text(r.noc),
    url: text(r.url), fetched: iso(r.fetched),
  }
}

/**
 * MATCH_EE_CATEGORIES 一行 → 匹配维度 EE 行(列名 snake_case —— 换路必须跟着换,
 * 否则 drawCrs/drawDate 静默变 undefined,match 只会少给一条理由不报错)。
 *
 * @param r 原始行。
 * @returns 匹配维度行。
 */
export function toEeCatDim(r: Row): EeCatDim {
  return {
    category: text(r.category), label: text(r.label), noc: text(r.noc),
    drawCrs: numOrNull(r.draw_crs), drawDate: iso(r.draw_date), url: text(r.url), fetched: iso(r.fetched),
  }
}

/**
 * DIMS_PNP_DRAWS 一行 → 省抽选事实行。
 *
 * @param r 原始行。
 * @returns 抽选行。
 */
export function toPnpDraw(r: Row): PnpDraw {
  return {
    province: text(r.province), kind: text(r.kind), drawDate: text(r.drawDate), stream: text(r.stream),
    streamZh: text(r.streamZh), score: numOrNull(r.score), scale: text(r.scale),
    invitations: numOrNull(r.invitations), note: text(r.note), label: text(r.label),
    url: text(r.url), fetched: text(r.fetched),
  }
}

/**
 * DIMS_NOC_CATEGORIES 一行 → 分类树行。
 *
 * @param r 原始行。
 * @returns 分类树行。
 */
export function toNocCat(r: Row): NocCat {
  return {
    broad: text(r.broad), mid: text(r.mid), fine: text(r.fine), teer: numOrNull(r.teer),
    broadEn: text(r.broadEn), broadKo: text(r.broadKo),
    midEn: text(r.midEn), midKo: text(r.midKo), fineEn: text(r.fineEn), fineKo: text(r.fineKo),
  }
}

/**
 * DIMS_FIELD_SOURCES 一行 → 字段出处行。
 *
 * @param r 原始行。
 * @returns 字段出处行。
 */
export function toFieldSource(r: Row): FieldSource {
  return {
    field: text(r.field), kind: text(r.kind), publisher: text(r.publisher), url: text(r.url),
    title: text(r.title), description: text(r.description), status: text(r.status),
    fetched: text(r.fetched), note: text(r.note),
  }
}

/**
 * NEWS_SLIM_60 一行 → 新闻瘦行。
 *
 * @param r 原始行。
 * @returns 新闻瘦行。
 */
export function toNewsSlim(r: Row): NewsSlim {
  return { region: text(r.region), title: text(r.title), date: text(r.date), slug: text(r.slug) }
}

/**
 * 相关职位一行 → 瘦行(salary_text 空时用 salary 兜底)。
 *
 * @param r 原始行。
 * @returns 瘦行。
 */
export function toRelated(r: Row): RelatedJob {
  let salaryText = text(r.salary_text)
  if (salaryText === '') {
    salaryText = text(r.salary)
  }
  return {
    id: count(r.id), title: text(r.title), company: text(r.company_name),
    city: text(r.city), province: text(r.province), salaryText: salaryText,
  }
}

/**
 * 公司详情页在招岗一行 → 干净行(salary_text 空时用 salary 兜底;时间过 iso)。
 *
 * @param j 原始行。
 * @returns 在招岗行。
 */
export function toCompanyJob(j: Row): CompanyJobRow {
  let salaryText = text(j.salary_text)
  if (salaryText === '') {
    salaryText = text(j.salary)
  }
  const datePosted = iso(j.date_posted)
  return {
    id: count(j.id), title: text(j.title), city: text(j.city), province: text(j.province),
    gradeChannel: numOrNull(j.grade_channel), noc: text(j.noc), nocTitle: text(j.noc_title),
    nocTitleZh: text(j.noc_title_zh), nocTitleKo: text(j.noc_title_ko),
    teer: numOrNull(j.teer), salaryText: salaryText, datePosted: datePosted,
  }
}

/**
 * SIMILAR_EMPLOYERS 一行 → 相似雇主行。
 *
 * @param r 原始行。
 * @returns 相似雇主行。
 */
export function toSimilar(r: Row): SimilarEmployer {
  return {
    slug: text(r.slug), name: text(r.name), industry: text(r.industry),
    sponsorGrade: numOrNull(r.sponsor_grade), openCount: count(r.open_count),
  }
}

/**
 * 提醒命中一行 → AlertHit(列名保持 snake_case,邮件模板按它渲)。
 *
 * @param r 原始行。
 * @returns 命中行。
 */
export function toAlertHit(r: Row): AlertHit {
  return {
    id: count(r.id), title: text(r.title), city: text(r.city), province: text(r.province),
    salary_text: text(r.salary_text), company_name: text(r.company_name),
  }
}

/**
 * 热门职业一行 → TopNoc(主路 noc_openings 与回退现算两条路同一映射;med 列名两路各异由 SQL 对齐)。
 *
 * @param r 原始行。
 * @returns 热门职业行。
 */
export function toTopNoc(r: Row): TopNoc {
  let median: number | null = numOrNull(r.median_salary)
  if (median == null) {
    median = numOrNull(r.med)
  }
  return {
    noc: text(r.noc), title: text(r.title), titleZh: text(r.title_zh), titleZhShort: text(r.title_zh_short),
    titleKoShort: text(r.title_ko_short), titleEnShort: text(r.title_en_short), broad: text(r.broad),
    open: count(r.open), eligible: count(r.eligible), medianSalary: median,
  }
}

/**
 * 按大类浏览一行 → BroadNoc。
 *
 * @param r 原始行。
 * @returns 大类浏览行。
 */
export function toBroadNoc(r: Row): BroadNoc {
  return {
    noc: text(r.noc), title: text(r.title), titleZh: text(r.title_zh), titleZhShort: text(r.title_zh_short),
    titleKoShort: text(r.title_ko_short), titleEnShort: text(r.title_en_short), broad: text(r.broad),
    open: count(r.open), eligible: count(r.eligible),
  }
}

/**
 * 职业名搜索一行 → NocHit。
 *
 * @param r 原始行。
 * @returns 命中行。
 */
export function toNocHit(r: Row): NocHit {
  return {
    noc: text(r.noc), title: text(r.title), titleZh: text(r.title_zh), titleZhShort: text(r.title_zh_short),
    titleKoShort: text(r.title_ko_short), titleEnShort: text(r.title_en_short),
  }
}

/**
 * jobs 主表原始行的原样透传(match 计算与 toJobRow 要吃整行;照 ruling `passRow` 先例)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passJobRow(r: JobDbRow): JobDbRow {
  return r
}

/**
 * 窄行原样透传(count/heartbeat/探测这类单格行,取值在调用处收窄)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passRow(r: Row): Row {
  return r
}

/**
 * 带 JSON 列的行原样透传(公司详情 score_detail / lmia_nocs 这类 json 列,取值在调用处收窄)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passJsonRow(r: JsonRow): JsonRow {
  return r
}

/**
 * 一行实时在招聚合(SQL.OCC_COMPETITION_BY_PROV)→ `OccOpen`。
 * avg_days_open 是 ROUND 过的 numeric,pg 交回字符串 —— numOrNull 一网收。
 *
 * @param r 原始行。
 * @returns 洗净的一行。
 */
export function toOccOpen(r: Row): OccOpen {
  return {
    province: text(r.province), openJobs: count(r.open_jobs),
    new30d: numOrNull(r.new30d), avgDaysOpen: numOrNull(r.avg_days_open),
  }
}

/**
 * 一行按省计数(AIP/RCIP/FCIP 三条 COUNT 共用)→ `ProvCount`。
 *
 * @param r 原始行。
 * @returns 洗净的一行。
 */
export function toProvCount(r: Row): ProvCount {
  return { province: text(r.province), n: count(r.n) }
}

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY)→ 难度事实。json 解析(词汇 `jsonOrNull`)与
 * comp 因子提取都在这里做完 —— functions 拿到的 ratio 即有效(2026-08-22 Frank:
 * 值级清洗不进 functions)。
 *
 * @param r 原始行。
 * @returns 洗净的一行。
 */
export function toOccDiffFact(r: OccDiffDbRow): OccDiffFact {
  return { province: text(r.province), ratio: compRatioOf(jsonOrNull(r.difficulty)) }
}

/**
 * 词汇:解析好的难度 json → key='comp' 因子的比值;没有保 null。
 *
 * @param d 解析好的难度 json。
 * @returns 比值;没有则 null。
 */
function compRatioOf(d: MaybeOccDiff): MaybeNum {
  if (d == null || d.factors == null) {
    return null
  }
  for (const f of d.factors) {
    if (f != null && f.key === COMP_KEY) {
      return numOrNull(f.value)
    }
  }
  return null
}

/**
 * 一行市/区聚合(SQL.cityTotals / districtTotals)→ 三件套。
 *
 * @param r 库里的一行。
 * @returns 洗净的聚合。
 */
export function toCityAgg(r: Row): CityAgg {
  return { openJobs: count(r.open_jobs), new7d: count(r.new7d), medSalary: roundOrNull(r.med_salary) }
}

/**
 * 词汇:数字格 → 取整;缺位 null(市/区帖面中位年薪的口径,并入前就是 Math.round)。
 *
 * @param x 库里的数字格。
 * @returns 取整后的数;缺位 null。
 */
// eslint-disable-next-line local/no-undefined-type, local/typed-signature -- 消化点:行索引缺席就是 undefined,照实收(开灯批)
function roundOrNull(x: Cell | undefined): MaybeNum {
  const n = numOrNull(x)
  if (n == null) {
    return null
  }
  return Math.round(n)
}

/**
 * 一行大类计数(SQL.cityByBroad / districtByBroad)。
 *
 * @param r 库里的一行。
 * @returns 大类 + 计数。
 */
export function toBroadCount(r: Row): BroadCount {
  return { broad: text(r.broad), n: count(r.n) }
}

/**
 * 一行院校(SQL.CITY_DLI)。
 *
 * @param r 库里的一行。
 * @returns 院校名 + 公立与否。
 */
export function toDliTop(r: Row): DliTop {
  return { name: text(r.name), isPublic: r.is_public === true }
}

/**
 * 一行计数(SQL.CITY_DLI_COUNT / CITY_DESIGNATED_COUNT 这类单数查询)。
 *
 * @param r 库里的一行。
 * @returns 计数(缺位 0)。
 */
export function toCountN(r: Row): number {
  return count(r.n)
}

/**
 * 一行区主要雇主(SQL.districtEmployers)。
 *
 * @param r 库里的一行。
 * @returns 雇主名 + slug + 在招数。
 */
export function toDistrictEmployer(r: Row): DistrictEmployerRow {
  return { name: text(r.name), slug: text(r.slug), n: count(r.n) }
}

/**
 * 单列 json 透传(SQL.PROVINCE_INFO_ONE 的 info 格):jsonb 驱动给对象、文本列绕行给
 * 字符串,消费端自己认 —— 与 stats 的 StatDifficulty 同一口径,这里只把缺位收成 null。
 *
 * @param r 库里的一行。
 * @returns 格值;缺位 null。
 */
export function toInfoCell(r: JsonRow): JsonCell {
  if (r.info == null) {
    return null
  }
  return r.info
}

/**
 * 单列 json 透传(SQL.PROV_DIFFICULTY_ONE 的 difficulty 格;口径同上)。
 *
 * @param r 库里的一行。
 * @returns 格值;缺位 null。
 */
export function toDiffCell(r: JsonRow): JsonCell {
  if (r.difficulty == null) {
    return null
  }
  return r.difficulty
}

/**
 * 一行城市维度(SQL.DIMS_CITIES)。
 *
 * @param r 库里的一行。
 * @returns 维度行。
 */
export function toCityDim(r: Row): CityDim {
  return { name: text(r.name), province: text(r.province) }
}

/**
 * 一行区维度(SQL.DIMS_DISTRICTS)。
 *
 * @param r 库里的一行。
 * @returns 维度行。
 */
export function toDistrictDim(r: Row): DistrictDim {
  return { name: text(r.name), city: text(r.city), province: text(r.province) }
}

/**
 * 一行 AIP 指定雇主维度(SQL.DIMS_DESIGNATED)。
 *
 * @param r 库里的一行。
 * @returns 维度行。
 */
export function toDesigDim(r: Row): DesigDim {
  return { name: text(r.name), province: text(r.province), location: text(r.location), isTech: r.is_tech === true }
}

/**
 * 一行 NOC 描述维度(SQL.DIMS_NOC_DESCRIPTIONS)。
 *
 * @param r 库里的一行。
 * @returns 维度行。
 */
export function toNocDescDim(r: Row): NocDescDim {
  return {
    noc: text(r.noc), title: text(r.title), titleZh: text(r.title_zh), titleKo: text(r.title_ko),
    duties: text(r.duties), requirements: text(r.requirements), fetched: text(r.fetched),
  }
}

/**
 * 单列整理版（SQL.JD_FORMATTED_BY_URL）→ 文本；没生过是 null。
 *
 * @param r 库里的一行。
 * @returns 整理版全文；没有是 null。
 */
export function toJdFormattedCell(r: Row): MaybeStr {
  return textOrNull(r.jd_formatted)
}

/**
 * 一行 jdformat 岗态（SQL.JD_STATE_BY_URL）。
 *
 * @param r 库里的一行。
 * @returns 岗 id、两个只补空字段与已有整理版。
 */
export function toJdStateRow(r: Row): JdStateRow {
  return {
    id: count(r.id), term: textOrNull(r.employment_term),
    hours: textOrNull(r.employment_hours), formatted: textOrNull(r.jd_formatted),
  }
}

/**
 * 单列投递链接（SQL.JOB_APPLY_URL_BY_ID）→ 链接；缺位 null。
 *
 * @param r 库里的一行。
 * @returns 投递链接；没有是 null。
 */
export function toApplyUrlCell(r: Row): MaybeStr {
  return textOrNull(r.apply_url)
}

// =========================================================================
// 回调(callbacks 抽屉 2026-08-23 撤编后的固定尾段;签名由外部库/语言定死,逐行特批)
// =========================================================================

/**
 * 匹配视图默认序:档位降序(stable sort 保同档内候选的日期序)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byLevelDesc(a: RankedHit, b: RankedHit): number {
  return b.rank - a.rank
}

/**
 * 匹配视图列排序·升序:空值恒沉底,同值按档位序兜底。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byHitValAsc(a: RankedHit, b: RankedHit): number {
  const av = a.v
  const bv = b.v
  if (av == null || av === '') {
    if (bv == null || bv === '') {
      return 0
    }
    return 1
  }
  if (bv == null || bv === '') {
    return -1
  }
  if (av < bv) {
    return -1
  }
  if (av > bv) {
    return 1
  }
  return b.rank - a.rank
}

/**
 * 匹配视图列排序·降序:空值恒沉底(不随方向翻),同值按档位序兜底。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byHitValDesc(a: RankedHit, b: RankedHit): number {
  const av = a.v
  const bv = b.v
  if (av == null || av === '') {
    if (bv == null || bv === '') {
      return 0
    }
    return 1
  }
  if (bv == null || bv === '') {
    return -1
  }
  if (av < bv) {
    return 1
  }
  if (av > bv) {
    return -1
  }
  return b.rank - a.rank
}

/**
 * [码, 数] 元组按数降序(公司 LMIA 获批职业拆分的展示序)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter, local/typed-signature -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byEntryCountDesc(a: [string, number], b: [string, number]): number {
  return b[1] - a[1]
}
