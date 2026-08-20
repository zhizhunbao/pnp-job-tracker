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

import * as SQL from '../db/sql'
import { evaluateRequirements, teerHit } from '../rules'
import type { Requirement, RuleProfile, RuleResult } from '../rules'
import { DEFAULT_PROFILE, EDU_KEYS, estimateCrs, estimateMbEoi, gridStreamOf, scoreProvince, streamMatches, systemShort } from '../score'
import type { CrsEstimateProfile, EduKey, EeGridRow, MbEduKey, MbProfile, ScoreFactor, SelfProfile } from '../score'
import type { GateKey, StatusAsk } from '../gateManifest'
import { askLabels, gateLabels } from '../i18n'
import { fieldMatchExemptionOf, gateOf, PATHWAYS } from '../pathways'
import type { PathwayStrategy } from '../pathways'
import {

  AB_LOCAL_EXP, AMP, AND_WORD, BASIS, BLOCK_COST, CONDITION, EMP_FACTOR, EMP_KEY, EMP_STATE, EMP_UNIT,
  EVIDENCE_KIND, FACTOR, FACTOR_ROW, FED, GATE_KEYS, GRID, INDEMAND, ITEM, MONTHS, MONTHS_PER_YEAR,
  NAME_KEEP, NO_BLOCK_COST, OA_SPLIT, OPT_IN_GATES, PERMIT, PV_KEY, REASON, SECTOR_PUBLIC, SPACE, SUBJECT,
  TIER_BASIS, UNKNOWN_BLOCK_COST, VERDICT,
} from './constants'
import type {

  Availability, BlockCostIn, BlockCostOut, CaseTier, Cell, EmpAcc, EmpRowsOfIn, EmpRowsOfOut,
  EmployerNameSegmentsIn, EmployerNameSegmentsOut, EmployerVerdictIn, EmployerVerdictItem,
  EmployerVerdictOut, Evidence, GateEval, ItemVerdict, JobPathwayRow, LeverGain, LoadVerdictTablesIn,
  LoadVerdictTablesOut, MatchDesignationIn, MatchDesignationOut, NameRow, NamedList,
  NormalizeEmployerNameIn, NormalizeEmployerNameOut, NumOfIn, NumOfOut, OccupationRow, OpeningCount,
  PathwayScore, PathwaySpec, PathwayVerdict, PushItemIn, PushItemOut, Queryable, Row, RowsOfIn, RowsOfOut,
  SqlResult, StrOfIn, StrOfOut, SwallowOut, TeerScope, ToDesignatedOut, ToDrawOut, ToEeGridOut,
  ToOccupationOut, ToRequirementOut, ToRowIn, ToScoreFactorOut, TrainableRow, UniversalValueIn,
  UniversalValueOut, VerdictData, VerdictDrawRow, VerdictLever, VerdictProfile, VerdictReason,
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
    drawDate: strOf(r.draw_date).slice(0, 10), stream: strOf(r.stream),
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
function normalizeEmployerName(name: NormalizeEmployerNameIn): NormalizeEmployerNameOut {
  return (name || '').toLowerCase().replace(AMP, AND_WORD).replace(NAME_KEEP, SPACE).trim()
}

/**
 * 名录名 → 可比的名段:整名 + `o/a` 前后各段(法定名 / 营业名)。无 `o/a` 时就是整名一段。
 *
 * @param name 名录上那个名字。
 * @returns 可比的名段。
 */
function employerNameSegments(name: EmployerNameSegmentsIn): EmployerNameSegmentsOut {
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
 * @returns 命中行、命中家数、名录名。
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
  // 多配 → 不点名法人(row=null),只留家数与名录名
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
  const out: Requirement[] = []
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
 * 🔵 **不复用 `lib/rules` 的 `employerBar()`**:那个是按**单一已知地点**分档取值的(GTA 内外 / 大温内外…),
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

  // 经营年限:本库各省 empYears 都不分区(appliesArea 全空),取第一行即可;单位不统一先换算成年
  const yearsRow = empRowsOf({ reqs: input.reqs, province: input.province, factor: EMP_FACTOR.years })[0]
  if (yearsRow) {
    const needYears = yearsRow.value == null
      ? null
      : yearsRow.unit === MONTHS ? yearsRow.value / MONTHS_PER_YEAR : yearsRow.value
    const haveYears = input.facts.foundedYear != null ? input.nowYear - input.facts.foundedYear : null
    pushItem({ acc, factor: EMP_KEY.years, need: needYears, have: haveYears, unit: EMP_UNIT.years, evidence: EVIDENCE_KIND.official })
  }

  // 雇员数:只吃不分区的通用门槛;分档省份这里查不到 → 判 unknown,不瞎猜档
  const staffRows = empRowsOf({ reqs: input.reqs, province: input.province, factor: EMP_FACTOR.staff })
  if (staffRows.length) {
    pushItem({
      acc, factor: EMP_KEY.staff, need: universalValue(staffRows), have: input.facts.staffEst,
      unit: EMP_UNIT.employees, evidence: EVIDENCE_KIND.estimate,
    })
  }

  // 营业额(红线②):facts 没有这个字段 → have 恒 null、verdict 恒 unknown,且不进 failed / missing / state
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
function blockCost(block: BlockCostIn): BlockCostOut {
  return block ? BLOCK_COST[block] ?? UNKNOWN_BLOCK_COST : NO_BLOCK_COST
}

// =========================================================================
// 4. 通道判定(一套档案进,13 条通道的裁决出)
// =========================================================================
//
// 契约照抄 docs/implementation/C5-判定层pathVerdict-20260805.md §三(定稿,不许改形状);
// 通道知识的人肉核对版见 docs/design/案例C01-马龙木匠路径-路径分析-20260805.md §二/§三/§九。
// 🔵 形状全部住 types.ts;`Availability` / `Evidence` 用**本域自己那份**,不再从对话域借。
// ── 小工具 ──────────────────────────────────────────────────────────────────

const evOfReq = (r: Requirement): Evidence => ({
  url: r.url, fetched: r.fetched, label: r.label, section: r.section, effective: r.effective,
})
/** quote 的唯一来源:官方原文优先取 valueText(联邦页),PNP 页的原文落在 label。 */
const quoteOfReq = (r: Requirement): string => (r.valueText || r.label || '').trim()

const evOfOcc = (r: OccupationRow): Evidence => ({ url: r.url, fetched: r.fetched, label: `${r.stream} — ${r.noc} ${r.name}` })
const evOfDraw = (d: VerdictDrawRow): Evidence => ({
  url: d.url, fetched: d.fetched, label: `${d.stream}(${d.drawDate}${d.note ? ' · ' + d.note : ''})`,
})
const evOfFactor = (f: ScoreFactor): Evidence => ({ url: f.url, fetched: f.fetched, label: f.system, effective: f.guideEffective })

/** `windowYears=3;minYears=1;hoursPerWeek=30` → 取一个键的值 */
const basisParam = (basis: string, key: string): string | null => {
  for (const kv of (basis || '').split(';')) {
    const i = kv.indexOf('=')
    if (i > 0 && kv.slice(0, i).trim() === key) return kv.slice(i + 1).trim()
  }
  return null
}

/** 门槛行 → 月数。op=PERMIT.none = 官方明说这条通道不设门槛 → 0 个月(**不是**「没查到」)。 */
const monthsOfReq = (r: Requirement): number | null => {
  if (r.op === PERMIT.none) return 0
  if (r.value == null) return null
  if (r.unit === 'months') return r.value
  if (r.unit === 'years') return r.value * 12
  if (r.unit === 'hours') {
    const y = basisParam(r.basis, 'minYears')          // 1,560 小时 = 官方自己写的「1 年」,不拿小时数除工时猜
    return y ? Number(y) * 12 : null
  }
  return null
}

/** offer 到手后还要等多久:0=Day0 / 1=3-6 月 / 2=12 月 / 3=24 月 */
const tierOfMonths = (m: number): 0 | 1 | 2 | 3 => (m <= 0 ? 0 : m <= 6 ? 1 : m <= 12 ? 2 : 3)

/** 标签里的最高 CLB 档(天花板估分用;档位从官方标签自己解析,不写死) */
const maxClbIn = (labels: string[]): number | null => {
  let max: number | null = null
  for (const l of labels) {
    const m = /clb\s*(?:level\s*)?(\d+)/i.exec(l || '')
    if (m) { const v = Number(m[1]); if (max == null || v > max) max = v }
  }
  return max
}

/**
 * 非地域适用条件是否成立。返回 null = 判不了(缺槽)——**不猜**。
 * 官方口径:带条件的那一行是通用条款的**例外**,条件成立时它覆盖通用行(同 rules.ts nocScore 的「最具体优先」)。
 */
const conditionHolds = (cond: string, p: VerdictProfile, province: string): boolean | null => {
  if (!cond) return true
  // 🔴 与学历无关的条件必须**在** canadaStudy 守卫之前分发:AB 那条量的是「经验攒在哪个省」,
  //    卡在学历守卫后面会让「没答有没有加拿大学历」的档案连它都判不了(2026-08-15 数据侧实测点名)。
  if (cond === AB_LOCAL_EXP) {
    // 官方原句:「24 个月境内外经验(或**近 18 个月内在阿省 12 个月**)」——条件是「这段经验发生在阿省」。
    // 本站档案**没有「经验所在省」这一槽**,只有现居省 + 加拿大经验月数,所以这里是**近似**:
    //   现居阿省 ⇒ 认他的加拿大经验攒在阿省(在阿省生活的人,加拿大受雇经历多半也在阿省);
    //   现居别省 ⇒ false(保守:不拿别省经验去够阿省那 12 个月,退回通用 24 个月那行);
    //   没答现居省 ⇒ null(判不了,退回 24 那行 + 摆一条「另有一档判不了」)。
    // 近似的代价压在**只对现居阿省的人放宽**这一侧:放宽错了他还有 24 个月那条兜底,不会因此被判死。
    // 口径配套见 pickGate 的 PROVINCE_LOCAL_EXP:挑中这行时可计月数换成加拿大经验(境外经验不算阿省经验)。
    if (p.province == null) return null
    return p.province === province
  }
  if (p.canadaStudy == null) return null
  if (cond === 'recent-on-graduate') {
    // 官方:近 3 年安省院校毕业 + 2 年制以上文凭/研究生证书/硕博。本站档案没有毕业日期槽,
    // 只用「加拿大学历 + 学习省 + 学制年数」判 —— 判不了就返回 null(缺槽),不按「大概是」放行。
    if (p.canadaStudy !== true) return false
    if (p.studyProvince == null || p.eduYears == null) return null
    return p.studyProvince === province && p.eduYears >= 2
  }
  if (cond === CONDITION.gradOtherProvince) {
    if (p.canadaStudy !== true) return false
    if (p.studyProvince == null) return null
    return p.studyProvince !== province
  }
  return null                                          // 不认识的条件 → 判不了
}

// ── 通道注册表 ────────────────────────────────────────────────────────────
// 13 条通道的声明 2026-08-15 搬进 `lib/pathways/`(一条通道一个文件,Frank「每个通道一个策略文件吧?
// 不要混在一起吧」)。这里只留别名:判定核读 PATHWAYS,不再自己攒表。
// PathwaySpec 这个名字在下文的函数签名里用得到处都是,保留成类型别名,免得为改名动一遍全文件。


const REGISTRY: PathwaySpec[] = PATHWAYS

// ── 每条通道的评估 ──────────────────────────────────────────────────────────

const reqsOf = (spec: PathwaySpec, all: Requirement[]): Requirement[] =>
  all.filter((r) => r.province === spec.reqProvince
    && (spec.reqPrograms ? spec.reqPrograms.includes(r.program) : true)
    && (spec.reqStream ? spec.reqStream.test(r.stream) : true))

/** 把可计经验限制在**本省攒的**那些条件(挑中这类行时,境外经验不进分子)。
 *  与 conditionHolds 里对应分支成对出现:那边判「这行适不适用」,这边定「用哪把尺子量」。 */
const PROVINCE_LOCAL_EXP = new Set<string>([AB_LOCAL_EXP])

/** 该通道认可的可计经验月数(null=判不了)。employerTenure 口径另算,见 pickGate。 */
function countableMonths(spec: PathwaySpec, p: VerdictProfile, selfEmpExcluded: boolean): number | null {
  const can = p.expCanadaMonths
  if (!spec.countsForeign) return can
  const foreign = selfEmpExcluded && p.foreignExpSelfEmployed === true ? 0 : p.expForeignMonths
  if (can == null || foreign == null) return null
  return can + foreign
}


function pickGate(spec: PathwaySpec, rows: Requirement[], p: VerdictProfile, selfEmpExcluded: boolean): GateEval {
  const expRows = rows.filter((r) => (r.factor === 'experience' || r.factor === 'workHours') && r.subject === SUBJECT.applicant)
  const gateRows = expRows.filter((r) => teerHit(r, p.teer))
  if (!gateRows.length) {
    return { rows: [], picked: null, need: null, have: null, gap: null, tenure: false, unknownCond: [],
      teerUnknown: expRows.length > 0 && p.teer == null }
  }

  const unknownCond: Requirement[] = []
  const applicable: Requirement[] = []
  for (const r of gateRows) {
    const ok = conditionHolds(r.appliesCondition || '', p, spec.reqProvince)
    if (ok === null) { unknownCond.push(r); continue }
    if (ok) applicable.push(r)
  }
  // 最具体优先:条件行成立时覆盖通用行(ON 毕业生 3 月覆盖通用 6 月;MB 外省毕业 12 月覆盖通用 6 月)
  const conditional = applicable.filter((r) => (r.appliesCondition || '') !== '')
  const pool = conditional.length ? conditional : applicable
  // 联邦三子通道并列(CEC/FSW/FST 任一达标即可入池)→ 取门槛最低的那条当 picked
  const withMonths = pool.map((r) => ({ r, m: monthsOfReq(r) })).filter((x): x is { r: Requirement; m: number } => x.m != null)
  const picked = withMonths.length ? withMonths.reduce((a, b) => (b.m < a.m ? b : a)).r : (pool[0] ?? null)
  const need = picked ? monthsOfReq(picked) : null

  const tenure = picked?.basis === BASIS.employerTenure
  let have: number | null
  if (picked && PROVINCE_LOCAL_EXP.has(picked.appliesCondition || '')) {
    // 「近 18 个月内在阿省满 12 个月」这类条件行量的是**本省攒的**经验 —— 境外经验不许进这把尺子
    //(通用 24 个月那行才认境内外)。省内/省外的近似口径与 conditionHolds 同一条,见那里的注释。
    have = p.expCanadaMonths == null ? null : p.province === spec.reqProvince ? p.expCanadaMonths : 0
  } else if (tenure) {
    // 口径隔离(rules.ts 同款):这类行量的是「在**这家**雇主连续全职干了多久」,不是同职业总经验。
    // 加拿大经验为 0 时可以确定在职时长也是 0(没在加拿大受雇过);>0 且现居就是本省时,
    // 用它作**上界**(可能分散在几家雇主 → 措辞层要点明);在别省攒的经验对本省雇主在职时长记 0。
    if (p.expCanadaMonths == null) have = null
    else if (p.expCanadaMonths === 0) have = 0
    else have = p.province === spec.reqProvince ? p.expCanadaMonths : 0
  } else {
    have = countableMonths(spec, p, selfEmpExcluded)
  }
  // 🔴 need=0(op=PERMIT.none:官方明说不设门槛)时 gap 恒 0,**不看 have**:一道不存在的闸不许因为
  //    「缺经验月数」把通道拖成 needs-info(2026-08-06 §4.5:NL 正是这么被挤出第一轮答复的)。
  const gap = need == null ? null : need === 0 ? 0 : have == null ? null : Math.max(0, need - have)
  return { rows: pool, picked, need, have, gap, tenure, unknownCond, teerUnknown: false }
}

/** 居住门槛(NB 的「过去 6 个月住在 NB」)。现居省不是本省 → 0 个月,是本省 → 判不了时长(缺槽)。 */
function residenceGap(spec: PathwaySpec, rows: Requirement[], p: VerdictProfile): { row: Requirement; need: number; gap: number | null } | null {
  const row = rows.find((r) => r.factor === FACTOR.residence && r.subject === SUBJECT.applicant)
  if (!row) return null
  const need = monthsOfReq(row)
  if (need == null) return null
  if (p.province == null) return { row, need, gap: null }
  return { row, need, gap: p.province === spec.reqProvince ? null : need }
}

/** 抽选参照线:先按通道名匹配;匹配不上且该省允许(MB 单池单分制)才退回全省最近一轮有分线的抽选。 */
function refDraw(spec: PathwaySpec, draws: VerdictDrawRow[]): VerdictDrawRow | null {
  const scored = draws
    .filter((d) => d.province === (spec.province === FED ? FED : spec.reqProvince) && d.kind === FACTOR.draw && d.score != null)
    .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
  if (spec.drawStream) {
    const hit = scored.find((d) => streamMatches(d.stream, spec.drawStream as string))
    if (hit) return hit
  }
  return spec.drawFallbackProvinceWide ? (scored[0] ?? null) : null
}

// ── 通用省估分(#301,2026-08-15)────────────────────────────────────────────
//
// CRS(联邦)与 MPNP(曼省)各有专用估分器;其余省的官方分值表 pnp_score_factors 里也躺着
// (AB/BC/NL/ON/SK 六省 222 行),`/pathways` 打分卡早就在用 —— 但那张卡是**人肉勾**出来的:
// 时薪、岗位地区、亲属在本省这些格子由用户自己填。判定层手上只有一份档案,填不出那些格子。
//
// 🔴 所以这里的门槛定得很硬:**该省官方表里每一条 `kind=FACTOR_ROW`(必答档位)的因素都要能从档案
//    无损映射出来**,少一条就整省不接 —— 缺的那块不是「按 0 算」能糊过去的,它会把分算成假的。
//    加分项(`kind=FACTOR.bonus`,用户自己勾的那些)按已上线打分卡的默认口径记 0,并把 `partial` 打上:
//    value 是**下界**,ceiling 才是把加分项全按满分算出来的**真上界**(下界不许拿去判「够不着线」,
//    上界才准 —— scoreGulf 这条硬伤判据靠的正是上界)。
// 🔴 分值一分不许编:全部来自 scoreProvince 挑中的官方行,本文件只负责「档案怎么喂进去」。
//
// 眼下真接得上的只有 AB(AAIP Worker EOI):
//   ON 的必答档位有 岗位 TEER/职业类别/时薪/安省经验/年收入/身份/加拿大学历/地区 八块,档案答不出;
//   BC 的 SIRS 200 分里时薪 55 + 地区 25 来自**岗位**,判定层没有岗位;
//   SK/NL 把经验拆成「近 5 年 / 6-10 年前」两档,本站只问了总月数,拆出来就是编;
//   NL 那张表还自报是 Express Entry Skilled Worker 那条线的,与本站注册的国际毕业生不是同一条。
// 这几条如实不接,不拿半张表凑一个数出来。

/** 能从 VerdictProfile 无损喂出来的官方因素(值仍由 pnpSelfScore 按官方标签解析) */
const GRID_AUTO_FACTORS = new Set([FACTOR.education, FACTOR.language, 'language1', FACTOR.age, 'work', FACTOR.workMonths])

/** 「档案推不出、但用户可以自己答」的因素 → 它要的那一槽。
 *  答了就交给 AUTO_PICK 按官方档位匹配;没答仍整省不接 —— 拆分经验/第二语言由档案推就是编数
 *  (SK/NL 的 work5+work610、ON/SK 的 language2 卡的都是这一条)。 */
const ASKABLE_FACTORS: Record<string, keyof SelfProfile> = {
  work5: 'expRecent', work610: 'expOlder', language2: 'clb2',
}

/** 通用省估分。接不上(库里没表 / 表不是这条线的 / 有必答档位映射不出 / 档案缺必需槽)一律 undefined。 */
function provinceGridScore(
  spec: PathwaySpec, p: VerdictProfile, factors: ScoreFactor[], draw: VerdictDrawRow | null,
): PathwayVerdict['score'] | undefined {
  const all = factors.filter((f) => f.province === spec.reqProvince)
  if (!all.length) return undefined
  const head = all[0]
  // 表自报了通道名就得对得上这条线(NL 那张是 EE Skilled Worker 的表,不许挂到国际毕业生上)
  const gridStream = gridStreamOf(head.system)
  if (gridStream && !streamMatches(gridStream, spec.stream)) return undefined

  const names = Array.from(new Set(all.map((f) => f.factor)))
  const only = new Set<string>()
  // 用户直选的官方档位 → override(2026-08-16「先解决 BC」):与分值卡客户端同一套口径。
  // 先前这里是「喂不出就整省不接」,可用户在页面上明明答了 —— 只是从没上行过。
  const picked: Record<string, { pts: number; matched: string; source: 'job' }> = {}
  const pickRow = (factor: string) => {
    const seq = p.scoreRows?.[`${spec.reqProvince}:${factor}`]
    if (seq == null) return null
    return all.find((f) => f.factor === factor && f.kind === FACTOR_ROW && f.seq === seq) ?? null
  }
  let partial = false
  for (const name of names) {
    const hasRows = all.some((f) => f.factor === name && f.kind === FACTOR_ROW)
    // 纯规则因素(BC 时薪:每整元 1 分)—— 用户填了就按官方规则算,没填才当 0 并标下界
    if (!hasRows) {
      const rule = all.find((f) => f.factor === name && f.kind === 'rule')
      if (name === 'wage' && rule && p.wage != null) {
        let cfg: { floorAt?: number; capAt?: number } = {}
        try { cfg = JSON.parse(rule.rule || '{}') } catch { /* 规则串坏了就按官方默认 */ }
        const floorAt = cfg.floorAt ?? 16, capAt = cfg.capAt ?? 70
        const pts = p.wage < floorAt ? 0 : Math.min(Math.floor(Math.min(p.wage, capAt)) - 15, rule.factorMax ?? 55)
        picked[name] = { pts, matched: `$${p.wage}/hr`, source: FACTOR.job }
        continue
      }
      partial = true; continue                              // 纯加分项 → 不勾=0(与打分卡默认同口径)
    }
    if (name === 'offer') { if (p.hasOffer == null) return undefined; continue }
    // 用户自己答过的那几样:交给 AUTO_PICK 按官方档位匹配(值在下面并进 self)
    const slot = ASKABLE_FACTORS[name]
    if (slot && p.scoreProfile?.[slot] != null) { only.add(name); continue }
    if (!GRID_AUTO_FACTORS.has(name)) {
      // BC 工作地区单列:它由 areaI 直接给下标(分值卡同款),其余因素认 scoreRows 里的 seq
      const row = name === 'area' && spec.reqProvince === 'BC' && p.areaI != null
        ? all.filter((f) => f.factor === 'area' && f.kind === FACTOR_ROW)[p.areaI] ?? null
        : pickRow(name)
      if (!row) return undefined                            // 用户也没答 → 整省仍不接,不猜
      picked[name] = { pts: row.points ?? 0, matched: row.label, source: FACTOR.job }
      continue
    }
    only.add(name)
  }
  if (!only.size) return undefined
  if (all.some((f) => f.kind === FACTOR.bonus)) partial = true

  // 必需槽:缺一个就不给分(宁缺不编 —— 未答项在 pickByThreshold 那里会被兜到最低档白捡分)
  if (only.has(FACTOR.education) && p.edu == null) return undefined
  if (only.has(FACTOR.language) && p.clb == null) return undefined
  if (only.has(FACTOR.age) && p.age == null) return undefined
  const wantsExp = only.has('work') || only.has(FACTOR.workMonths)
  if (wantsExp && (p.expCanadaMonths == null || p.expForeignMonths == null)) return undefined

  // 档案 → SelfProfile。经验只喂**总量**(近 5 年 / 6-10 年前那种拆分本站没问,拆了就是编;
  // 需要拆分的省在上面就被 GRID_AUTO_FACTORS 挡掉了)。第二官方语言同理:没有这一槽 → 按不加分算。
  const months = (p.expCanadaMonths ?? 0) + (p.expForeignMonths ?? 0)
  const self: SelfProfile = {
    edu: (p.edu ?? 'highschool') as EduKey, expRecent: months / 12, expOlder: 0,
    clb1: p.clb ?? 0, clb2: 0, age: p.age ?? 0,
    // 用户在分值卡上真答过的覆盖档案推导值(拆分经验、第二语言这类档案给不出的)
    ...(p.scoreProfile ?? {}),
  }
  const offerRow = all.find((f) => f.factor === 'offer' && f.kind === FACTOR_ROW)
  type Override = { pts: number; matched: string; source: 'profile' | 'job' | 'tick' }
  const ovOf = (has: boolean): Record<string, Override> => (offerRow
    ? { offer: { pts: has ? (offerRow.points ?? 0) : 0, matched: offerRow.label, source: 'profile' } }
    : {})

  // 勾选只取**本省**的键:别省的勾进来会被 scoreProvince 忽略,但先滤一道免得越界
  const ownTicks: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(p.scoreTicks ?? {})) if (v && k.startsWith(`${spec.reqProvince}:`)) ownTicks[k] = true
  const now = scoreProvince(factors, spec.reqProvince, self, { ...ovOf(p.hasOffer === true), ...picked }, ownTicks, only)
  if (!now) return undefined
  // 上界:语言拉到官方最高档 + 加分项**全部按满分**(官方档位自己封顶)。
  // 少算加分项的「上界」是假上界,拿它判分数鸿沟会把够得着的人判死 —— 那正是四态口径最忌的那种错。
  const maxClb = maxClbIn(all.filter((f) => f.factor === FACTOR.language && f.kind === FACTOR_ROW).map((f) => f.label))
  const ticks: Record<string, boolean> = {}
  const seen = new Map<string, number>()
  for (const f of all) {
    if (f.kind !== FACTOR.bonus) continue
    const i = seen.get(f.factor) ?? 0
    ticks[`${spec.reqProvince}:${f.factor}:${i}`] = true
    seen.set(f.factor, i + 1)
  }
  const top = scoreProvince(factors, spec.reqProvince, { ...self, clb1: maxClb ?? self.clb1 }, { ...ovOf(true), ...picked }, ticks, only)

  return {
    system: head.system, value: now.total, ceiling: top ? top.total : null,
    refLine: draw?.score ?? null,
    // 挑中的那一轮是哪条通道(2026-08-16 Frank「我的职业是 it 有必要 对比 其他通道的 分数吗」):
    // BC 现行按通道分别设线,拿 Care 的线去比一个 IT 的分是错的对照 —— 展示层据此只列同通道的轮次
    refStream: draw?.stream ?? null,
    refLabel: draw
      ? `本站问得到的因子算出的估分(加分项未计);对照最近一轮 ${draw.stream}(${draw.drawDate})`
      : '本站问得到的因子算出的估分(加分项未计);本站未收录可对照的抽选线',
    evidence: evOfFactor(head),
    ...(partial ? { partial: true } : {}),
  }
}

const EDU_TO_MB: Record<EduKey, MbEduKey> = {
  doctorate: 'masterOrDoctorate', master: 'masterOrDoctorate', bachelor: 'oneProgram3yPlus',
  tradeCert: 'tradeCert', diploma2y: 'oneProgram2y', cert1y: 'oneYearProgram', highschool: PERMIT.none,
}
const mbEduOf = (edu: EduKey, years: number | null): MbEduKey => {
  if (edu === 'diploma2y' || edu === 'bachelor') {
    if (years == null) return EDU_TO_MB[edu]
    return years >= 3 ? 'oneProgram3yPlus' : years >= 2 ? 'oneProgram2y' : 'oneYearProgram'
  }
  return EDU_TO_MB[edu]
}

/** MPNP EOI 档案映射。workMonths 传的是「门槛达成态」(见调用处注释),不是今天的月数。 */
function mbProfileOf(p: VerdictProfile, workMonths: number, clb: number): MbProfile {
  return {
    clb,
    secondLangClb5Plus: false,                        // 档案无「第二官方语言」槽 → 不猜,按不加分算
    age: p.age as number,
    workMonthsSameOcc: workMonths,
    employerLicenseRecognized: false,                 // 同上,不猜
    edu: mbEduOf(p.edu as EduKey, p.eduYears),
    adapt: {
      demand: true,                                   // SWM 的门槛本身就是「曼省持续就业 + 长期 offer」,达标即触发该档
      closeRelative: false, priorMbWork6moPlus: false,
      mbEduYears: p.canadaStudy === true && p.studyProvince === 'MB' ? ((p.eduYears ?? 0) >= 2 ? 2 : 1) : 0,
      closeFriendOrDistantRelative: false, regionalOutsideWinnipeg: false,
    },
    riskForeignWork: (p.expCanadaMonths ?? 0) > 0 && p.province !== 'MB',
    riskForeignStudy: p.canadaStudy === true && p.studyProvince != null && p.studyProvince !== 'MB',
  }
}

const ruleProfileOf = (p: VerdictProfile, total: number | null): RuleProfile => ({
  noc: p.noc ?? undefined,
  teer: p.teer,
  clb: p.clb,
  canadianExpMonths: p.expCanadaMonths,
  totalExpMonths: total,
  familySize: null,
  annualIncome: null,
  incomeIsOccMedian: false,
  area: null,
})

/**
 * 联邦三子通道的语言行:appliesTeer 是空的,TEER 档写在 stream 键里(teer-0-1 / teer-2-3 / teer-0-3 / teer-4)。
 *
 * 🔴 `teer-a-b` 是**闭区间**,不是两个端点的枚举(2026-08-09 批C 实证的 bug):
 *    CEC/FSW 的 teer-0-1 / teer-2-3 恰好端点=全集,当枚举读从没炸过;批B 灌进 AIP 的
 *    teer-0-3(CLB 5)/ teer-2-4 后,TEER 1 与 TEER 2 的 job offer **一条语言门槛行都挑不到**,
 *    上游 langRowsSeen=0 于是输出「本站尚未收录 AIP 的语言门槛条文」—— 库里明明有,这是一句假话。
 *    改法:恰好两个数字 = 闭区间展开(两元枚举形态天然兼容,既有判定零变化);
 *    三个及以上数字仍按枚举读(库里目前没有这种写法,不为它猜区间语义)。
 */
const fedLangApplies = (r: Requirement, teer: number | null): boolean => {
  const m = /^teer-([\d-]+)$/.exec(r.stream || '')
  if (!m) return true                                  // first-official / speaking-listening / reading-writing:该子通道通用
  if (teer == null) return false
  const parts = m[1].split('-').map(Number)
  if (parts.length === 2) {
    const [lo, hi] = parts[0] <= parts[1] ? parts : [parts[1], parts[0]]
    return teer >= lo && teer <= hi
  }
  return parts.includes(teer)
}

// ── 主函数 ──────────────────────────────────────────────────────────────────

function evaluateOne(spec: PathwaySpec, p: VerdictProfile, data: VerdictData): PathwayVerdict {
  const rows = reqsOf(spec, data.requirements)
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []

  // ── 库里根本没有这条通道的行 → needs-info + not-collected(**不拿文档记忆当库**)
  if (!rows.length) {
    reasons.push({
      kind: REASON.needsInfo,
      text: `本站尚未收录 ${spec.stream} 的门槛条文`,
      key: PV_KEY.noReq, params: { stream: spec.stream },
    })
    return { key: spec.key, province: spec.province, stream: spec.stream, verdict: REASON.needsInfo, tier: null, tierBasis: TIER_BASIS.now, reasons, availability: 'not-collected' }
  }

  const selfEmpRows = rows.filter((r) => r.factor === 'workSelfEmployed' || r.factor === 'experienceExcluded')
  const selfEmpExcluded = selfEmpRows.length > 0
  const gate = pickGate(spec, rows, p, selfEmpExcluded)

  // ── ① 职业清单 ────────────────────────────────────────────────────────────
  // 排除清单命中 = 硬伤;定向/在需清单只是信号(**不在清单 ≠ 不合格**),除非该通道明文要求在清单(PE OID)。
  let listExcluded = false
  if (p.noc) {
    const ineligible = data.occupations.filter((o) => o.province === spec.reqProvince && o.type === 'ineligible' && o.noc === p.noc)
      // appliesTo 先过滤:SK 那 152 条只服务 OID/EE 子类,管不着 Employment Offer
      .filter((o) => !o.appliesTo || o.appliesTo.toLowerCase().includes('employment offer') === /employment offer/i.test(spec.stream))
    for (const o of ineligible) {
      listExcluded = true
      reasons.push({
        kind: REASON.excluded,
        text: `${p.noc} 在「${o.stream}」这张不合格清单上`,
        key: PV_KEY.occIneligible, params: { noc: p.noc, stream: o.stream },
        quote: `${o.stream} — ${o.noc} ${o.name}`,   // 全部来自数据行字段(stream/noc/name),没有一个字是手写的
        evidence: evOfOcc(o),
      })
    }
    const indemand = data.occupations.filter((o) => o.province === spec.reqProvince && o.type === INDEMAND && o.noc === p.noc)
    for (const o of indemand) {
      reasons.push({
        kind: REASON.met, text: `${p.noc} ${o.name} 在「${o.stream}」清单上`,
        key: PV_KEY.occListed, params: { noc: p.noc, name: o.name, stream: o.stream }, evidence: evOfOcc(o),
      })
    }
    // 明文要求「必须在清单上」的通道(PE 的 Occupations in Demand 子通道)。
    // 🔴 **只关这个子通道,不关整条线**:PE-sw 装的是「Skilled Worker / Occupations in Demand」两个子通道,
    //    官方原句写得很清楚 ——「the Occupations in Demand stream requires only 12 months, but is limited to
    //    its named NOC list」。Skilled Worker 那条走的是 TEER 0-3 + 24 个月,与清单无关。
    //    先前不分档:一个 TEER 3 的 PE 岗、三类闸全达标、经验也够,只因为不在那 8 个 NOC 里就整条判 excluded。
    //    判据用**门槛行自己的 appliesTeer**(不写死 0-3):清单外的 TEER 有别的子通道收,就不许拿清单判死。
    const listTeerCovered = spec.listRequired
      ? rows.some((r) => r.subject === SUBJECT.applicant && r.factor === FACTOR.experience && !!r.appliesTeer && teerHit(r, p.teer))
      : false
    if (spec.listRequired && !listTeerCovered) {
      const list = data.occupations.filter((o) => o.province === spec.listRequired!.province && o.type === INDEMAND
        && spec.listRequired!.streamRe.test(o.stream))
      const onList = list.some((o) => o.noc === p.noc)
      if (list.length && !onList) {
        listExcluded = true
        const anchor = rows.find((r) => r.factor === FACTOR.experience) ?? rows[0]
        reasons.push({
          kind: REASON.excluded,
          text: `${p.noc} 不在 ${list[0].stream} 清单上,12 个月子通道对本职业关闭`,
          key: PV_KEY.occNotOnList, params: { noc: p.noc, stream: list[0].stream },
          quote: quoteOfReq(anchor),               // 官方原文自己写明 OID 子通道「limited to its named NOC list」
          evidence: evOfReq(anchor),
        })
      }
    }
  } else {
    missingSlots.push('noc')
  }

  // ── ② 语言 ───────────────────────────────────────────────────────────────
  let blockedBy: PathwayVerdict['blockedBy']
  let langRowsSeen = 0
  if (spec.reqPrograms) {
    // 联邦:三子通道各自一套语言行,逐条摆
    for (const prog of spec.reqPrograms) {
      for (const r of rows.filter((x) => x.program === prog && x.factor === FACTOR.language && fedLangApplies(x, p.teer))) {
        langRowsSeen += 1
        if (p.clb == null) { missingSlots.push('clb'); continue }
        const ok = r.value == null || p.clb >= r.value
        if (!ok) blockedBy = blockedBy ?? FACTOR.language
        reasons.push({
          kind: ok ? REASON.met : REASON.gap,
          text: `${prog} 语言门槛 CLB ${r.value}${ok ? ' 达标' : `,差 ${(r.value as number) - (p.clb as number)} 档`}`,
          key: ok ? PV_KEY.fedLangOk : PV_KEY.fedLangGap,
          params: { prog, clb: r.value ?? 0, short: ok ? 0 : (r.value as number) - (p.clb as number) },
          quote: quoteOfReq(r), evidence: evOfReq(r),
        })
      }
    }
    if (!langRowsSeen) {
      reasons.push({ kind: REASON.needsInfo, text: `本站尚未收录 ${spec.stream} 的语言门槛条文`,
        key: PV_KEY.noLangReq, params: { stream: spec.stream } })
    }
  } else {
    const langRows = rows.filter((r) => r.subject === SUBJECT.applicant)
    const results: RuleResult[] = evaluateRequirements(langRows, ruleProfileOf(p, countableMonths(spec, p, selfEmpExcluded)))
    const lang = results.find((r) => r.factor === FACTOR.language)
    if (lang) {
      if (lang.verdict === 'unknown') {
        missingSlots.push('clb')
        reasons.push({ kind: REASON.needsInfo, text: '语言门槛判不了,档案缺 CLB 成绩', key: PV_KEY.langUnknown, evidence: lang.evidence })
      } else if (lang.verdict === ITEM.pass) {
        reasons.push({
          kind: REASON.met,
          // 「不要语言成绩」而不是「官方明说这一档不要求语言成绩」(2026-08-11 Frank 定的口径):
          // 官方原句就挂在这条下面,前缀与解释是说给自己听的。同理下面那条经验门槛。
          text: lang.need == null ? '不要语言成绩' : `语言门槛 CLB ${lang.need} 达标`,
          key: lang.need == null ? PV_KEY.langNone : PV_KEY.langOk, params: { clb: lang.need ?? 0 },
          quote: lang.evidence.label, evidence: lang.evidence,
        })
      } else {
        blockedBy = blockedBy ?? FACTOR.language
        reasons.push({
          kind: REASON.gap, text: `语言门槛 CLB ${lang.need},差 ${lang.short} 档`,
          key: PV_KEY.langGap, params: { clb: lang.need ?? 0, short: lang.short ?? 0 },
          quote: lang.evidence.label, evidence: lang.evidence,
        })
      }
    } else {
      reasons.push({ kind: REASON.needsInfo, text: `本站尚未收录 ${spec.stream} 的语言门槛条文 —— 不等于这条通道不要求语言`,
        key: PV_KEY.noLangReqSoft, params: { stream: spec.stream } })
    }
  }

  // ── ③ 经验 / 居住(可积累项,决定 tier)────────────────────────────────────
  // 缺槽判不出 gap 时,把 need 记进 gaps —— needs-info 的 tier 因此是「最坏情况的上界」
  // (按 0 经验 / 0 居住算)。这就是 §4.5 说的 **tier 潜力**:NL(need=0)最坏也是 tier0,
  // ON(3-6 月)最坏 tier1 —— 排序按它,缺槽的通道才不会全挤成一堆无差别的 0。
  // 每个缺口记下**它是哪一类**:经验/在职类的等待要等到「毕业拿到工签之后」才开始走(tierBasis,#319),
  // 居住类不用 —— 搬过去当天就在计时。只记一个 max 数字时这个区别丢了,前端只能一律读成「从今天起算」。
  const gaps: { months: number; kind: 'work' | 'residence' }[] = []
  if (!gate.picked && !gate.teerUnknown) {
    reasons.push({ kind: REASON.needsInfo, text: `本站尚未收录 ${spec.stream} 的工作经验门槛条文`,
      key: PV_KEY.noExpReq, params: { stream: spec.stream } })
  }
  // 行在库里、只是不知道他哪一档 TEER → 点名让他补职业,**不许说成本站没收录**
  if (gate.teerUnknown) missingSlots.push('noc')
  if (gate.gap != null) gaps.push({ months: gate.gap, kind: 'work' })
  else if (gate.need != null) gaps.push({ months: gate.need, kind: 'work' })
  if (gate.have == null && gate.picked && gate.need !== 0) missingSlots.push('expCanadaMonths')
  const res = residenceGap(spec, rows, p)
  if (res) {
    if (res.gap != null) gaps.push({ months: res.gap, kind: FACTOR.residence })
    else { gaps.push({ months: res.need, kind: FACTOR.residence }); missingSlots.push('province') }
  }

  // ── ③b 省外院校毕业生的额外在职门槛(#317)────────────────────────────────────
  // 官方并列条款:本省院校毕业生走 op=PERMIT.none(不设经验门槛),**省外**院校毕业生要先在本省干满 N 个月。
  // 条件判不了(没答学历省/有没有加拿大学历)→ 判不了,不猜;条件不成立(本省毕业)→ 这条不适用。
  const oop = spec.outOfProvinceGrad
  const oopHolds = oop ? conditionHolds(CONDITION.gradOtherProvince, p, spec.reqProvince) : false
  let oopHave: number | null = null
  if (oop && oopHolds) {
    // 量的是「在本省全职在职多久」,与 employerTenure 同一把尺子:别省攒的经验对本省记 0
    oopHave = p.expCanadaMonths == null ? null
      : p.expCanadaMonths === 0 ? 0
        : p.province === spec.reqProvince ? p.expCanadaMonths : 0
    gaps.push({ months: oopHave == null ? oop.months : Math.max(0, oop.months - oopHave), kind: 'work' })
    if (oopHave == null) missingSlots.push('expCanadaMonths')
  }
  if (oop && oopHolds === null) missingSlots.push('studyProvince')

  // ── ④ 估分 + 参照线 ──────────────────────────────────────────────────────
  const draw = refDraw(spec, data.draws)
  let score: PathwayVerdict['score'] | undefined
  try {
  // 没有专用估分器的省:能无损映射就走官方分值表(#301),接不上一律 undefined(不编)
  if (!spec.scorer) score = provinceGridScore(spec, p, data.scoreFactors, draw)
  if (spec.scorer === GRID.crs && p.age != null && p.clb != null && p.edu != null) {
    const crsProfile: CrsEstimateProfile = {
      age: p.age, married: p.married, clb: p.clb, edu: p.edu, eduYears: p.eduYears,
      canadaStudy: p.canadaStudy,
      expCanadaMonths: p.expCanadaMonths,
      // 自雇经验多数通道不计 → 上游把 expForeignMonths 折成 0 的口径在这里也照用
      expForeignMonths: selfEmpExcluded && p.foreignExpSelfEmployed === true ? 0 : p.expForeignMonths,
    }
    const now = estimateCrs(crsProfile, data.eeGrid)
    const maxClb = maxClbIn(data.eeGrid.filter((r) => r.grid === GRID.crs && /first official language/i.test(r.heading)).map((r) => r.criterion))
    const ceil = maxClb == null ? null : estimateCrs({ ...crsProfile, clb: maxClb }, data.eeGrid).total
    const head = data.eeGrid.find((r) => r.grid === GRID.crs)
    score = {
      system: GRID.crs, value: now.total, ceiling: ceil,
      refLine: draw?.score ?? null,
      refLabel: draw ? `最近一轮 ${draw.stream}(${draw.drawDate},${draw.invitations ?? '—'} 人)` : '本站未收录可对照的抽选线',
      evidence: head ? { url: head.url, fetched: head.fetched, label: 'Comprehensive Ranking System(官方分值表)' } : { url: '', fetched: '' },
    }
  }
  if (spec.scorer === 'MB' && p.age != null && p.clb != null && p.edu != null && data.scoreFactors.some((f) => f.province === 'MB')) {
    // 估的是**门槛达成态**:MPNP SWM 的门槛本身就是「在曼省同一雇主连续全职 N 个月 + 长期 offer」,
    // 所以按「攒够那 N 个月」算分才是这条路走通时的分 —— refLabel/reasons 里点明这一点,不装成今天的分。
    const workMonths = Math.max(gate.have ?? 0, gate.need ?? 0)
    const mbNow = estimateMbEoi(data.scoreFactors, mbProfileOf(p, workMonths, p.clb))
    const maxClb = maxClbIn(data.scoreFactors.filter((f) => f.province === 'MB' && f.factor === FACTOR.language && f.kind === FACTOR_ROW).map((f) => f.label))
    const ceil = maxClb == null ? null : estimateMbEoi(data.scoreFactors, mbProfileOf(p, workMonths, maxClb)).total
    const head = data.scoreFactors.find((f) => f.province === 'MB') as ScoreFactor
    score = {
      system: mbNow.system, value: mbNow.total, ceiling: ceil,
      refLine: draw?.score ?? null,
      refLabel: draw
        ? `攒够门槛后的估分;对照最近一轮有分线的抽选 ${draw.stream}(${draw.drawDate}${draw.note ? ' · ' + draw.note : ''})`
        : '攒够门槛后的估分;本站未收录可对照的抽选线',
      evidence: evOfFactor(head),
    }
    // 三条 warning(C01 §二曼省节):外省学习 −100 / 再叠外省工作 −100 / 天花板与抽选线对照
    const riskRows = data.scoreFactors.filter((f) => f.province === 'MB' && f.factor === 'risk' && f.kind === FACTOR.bonus)
    const studyRow = riskRows.find((f) => /studies in another province/i.test(f.label))
    const workRow = riskRows.find((f) => /work experience in another province/i.test(f.label))
    const base = mbProfileOf(p, workMonths, p.clb)
    if (base.riskForeignStudy && studyRow) {
      reasons.push({
        kind: REASON.gap,
        text: `外省学习倒扣 ${Math.abs(studyRow.points ?? 0)} 分,全国唯一,已计入 ${mbNow.total} 分`,
        key: PV_KEY.mbStudyDeduct, params: { pts: Math.abs(studyRow.points ?? 0), total: mbNow.total },
        quote: studyRow.label, evidence: evOfFactor(studyRow),
      })
    }
    if (!base.riskForeignWork && workRow) {
      const worse = estimateMbEoi(data.scoreFactors, { ...base, riskForeignWork: true }).total
      reasons.push({
        kind: REASON.gap,
        text: `外省工作经历再扣 ${Math.abs(workRow.points ?? 0)} 分,降至 ${worse} 分`,
        key: PV_KEY.mbWorkDeduct, params: { pts: Math.abs(workRow.points ?? 0), total: worse },
        quote: workRow.label, evidence: evOfFactor(workRow),
      })
    }
    const mbScored = data.draws.filter((d) => d.province === 'MB' && d.kind === FACTOR.draw && d.score != null)
      .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
    if (mbScored.length) {
      // 这串会当参数进三语句子 → 分隔符必须是语言中立的半角符号。原来用「、」和「·」,
      // 英文态就成了「632(2026-07-30 · Draw #276)、825(…)」这种半中半英(2026-08-11 生产实拍)。
      const lines = mbScored.map((d) => `${d.score} ${d.drawDate}${d.note ? ' ' + d.note : ''}`).join(', ')
      reasons.push({
        kind: REASON.gap,
        text: `估分 ${mbNow.total},语言拉满上界 ${ceil ?? '—'},最近抽选 ${lines}`,
        key: PV_KEY.mbScore, params: { score: mbNow.total, ceiling: ceil ?? '—', lines },
        evidence: evOfDraw(mbScored[0]),
      })
    }
  }
  } catch (e) {
    // 估分器挑不出行(档案落在官方表的档位之外)→ 如实说判不了,不给一个编出来的分
    score = undefined
    reasons.push({ kind: REASON.needsInfo, text: '本站估分器挑不出官方档位,不给估分', key: PV_KEY.noScoreBand })
  }
  // 没有自评估分器、但有该通道的抽选线时,把线摆出来(不冒充成「你的分」)
  if (!score && draw && draw.score != null) {
    reasons.push({
      kind: REASON.met,
      text: `${draw.drawDate} 最近一轮最低邀请分 ${draw.score}${draw.scale ? ` ${draw.scale} 分制` : ''}`,
      key: draw.scale ? PV_KEY.drawLineScaled : PV_KEY.drawLine,
      params: { date: draw.drawDate, score: draw.score ?? 0, scale: draw.scale ?? '' },
      evidence: evOfDraw(draw),
    })
  }

  // ── ⑤ 裁决 ───────────────────────────────────────────────────────────────
  // 分数鸿沟:语言拉满后的上界仍够不着最近一轮抽选线 = 攒时间也补不齐(≠ 差一点点)
  const scoreGulf = !!(score && score.ceiling != null && score.refLine != null && score.ceiling < score.refLine)
  const excluded = listExcluded || scoreGulf
  if (scoreGulf && score) {
    reasons.push({
      kind: REASON.gap,
      // 对照的是**哪一轮抽选**:这里拿 draw 的官方通道名与日期,不用 score.refLabel ——
      // refLabel 是中文拼的展示串(lib/chat/facts 那边也是 zhOnly 包着用),塞进英文句子就成了半中半英。
      text: `估分 ${score.value},语言拉满上界 ${score.ceiling},对照 ${draw?.stream ?? score.refLabel} ${draw?.drawDate ?? ''} 的 ${score.refLine} 分`,
      key: PV_KEY.scoreGulf,
      params: {
        score: score.value, ceiling: score.ceiling ?? 0, line: score.refLine ?? 0,
        stream: draw?.stream ?? score.refLabel, date: draw?.drawDate ?? '',
      },
      evidence: draw ? evOfDraw(draw) : score.evidence,
    })
  }

  // 经验的差距句。
  //   · 分数鸿沟型排除(FED-EE):「现在连池都进不去」本身就是官方门槛判出来的排除 → kind=REASON.excluded(带官方 quote);
  //   · 清单型排除(PE):经验差距是**另一件事**,仍按可积累的 gap 摆(C01 金标「24 月另列 gap」)。
  const hardKind: VerdictReason['kind'] = scoreGulf ? REASON.excluded : REASON.gap
  for (const r of gate.rows) {
    const need = monthsOfReq(r)
    if (need == null) continue
    // need=0 = 官方明说无门槛 → 恒达标(缺经验月数也一样:一道不存在的闸没有「判不了」)
    const met = need === 0 || (gate.have != null && gate.have >= need)
    const gateName = r.basis === BASIS.employerTenure ? '同雇主在职门槛' : '工作经验门槛'
    reasons.push({
      kind: met ? REASON.met : gate.have == null ? REASON.needsInfo : hardKind,
      text: r.op === PERMIT.none
        ? '不要工作经验'
        : gate.have == null
          ? `${gateName} ${need} 个月,档案缺经验月数`
          : met
            ? `${gateName} ${need} 个月 达标`
            // 差额只在**已经攒了一部分**时才说:0 经验时「差 N 个月」与门槛本身是同一个数,
            // 加上档位徽标就成了同一个数字说三遍(2026-08-11 Frank 点名)
            : gate.have === 0
              ? `${gateName} ${need} 个月`
              : `${gateName} ${need} 个月,差 ${need - gate.have} 个月`,
      // 门槛名(同雇主在职 / 工作经验)进键名而不是进参数 —— 它本身要翻译,参数只放数
      key: r.op === PERMIT.none ? PV_KEY.expNone : `pv.exp.${r.basis === BASIS.employerTenure ? 'tenure' : 'work'}.${
        gate.have == null ? 'unknown' : met ? 'ok' : gate.have === 0 ? 'need' : 'short'}`,
      params: { n: need, short: gate.have == null || met ? 0 : need - gate.have },
      quote: quoteOfReq(r), evidence: evOfReq(r),
    })
  }
  for (const r of gate.unknownCond) {
    reasons.push({
      kind: REASON.needsInfo,
      text: '另有一档门槛判不了,档案缺判定所需信息',
      key: PV_KEY.condUnknown,
      quote: quoteOfReq(r), evidence: evOfReq(r),
    })
  }
  if (res) {
    reasons.push({
      kind: res.gap == null ? REASON.needsInfo : res.gap > 0 ? hardKind : REASON.met,
      text: res.gap == null
        ? `居住门槛 ${res.need} 个月,档案缺居住时长`
        : res.gap === res.need
          ? `居住门槛 ${res.need} 个月`
          : `居住门槛 ${res.need} 个月,差 ${res.gap} 个月`,
      key: res.gap == null ? PV_KEY.resUnknown : res.gap === res.need ? PV_KEY.resNeed : PV_KEY.resShort,
      params: { n: res.need, short: res.gap ?? 0 },
      quote: quoteOfReq(res.row), evidence: evOfReq(res.row),
    })
  }
  // 省外院校毕业生的额外在职门槛(#317)。条文出处在策略文件里(gates 的 quote 例外同一条口子:
  // 官方原句 + url + 生效日三样齐全才准声明),不是代码里手写的官方口径。
  if (oop && oopHolds !== false) {
    const state = oopHolds === null ? 'condUnknown'
      : oopHave == null ? 'unknown'
        : oopHave >= oop.months ? 'ok'
          : oopHave === 0 ? 'need' : 'short'
    const ev: Evidence = { url: oop.url, fetched: oop.fetched, label: spec.stream, ...(oop.effective ? { effective: oop.effective } : {}) }
    reasons.push({
      kind: state === 'ok' ? REASON.met : state === 'need' || state === 'short' ? REASON.gap : REASON.needsInfo,
      text: state === 'condUnknown'
        ? '省外院校毕业生另有一档在职门槛,档案缺学习省份'
        : state === 'unknown'
          ? `省外院校毕业:先在本省全职工作满 ${oop.months} 个月,档案缺本省在职月数`
          : state === 'ok'
            ? `省外院校毕业:先在本省全职工作满 ${oop.months} 个月 达标`
            : state === 'need'
              ? `省外院校毕业:先在本省全职工作满 ${oop.months} 个月`
              : `省外院校毕业:先在本省全职工作满 ${oop.months} 个月,差 ${oop.months - (oopHave as number)} 个月`,
      key: `pv.oopGrad.${state}`,
      params: { n: oop.months, short: state === 'short' ? oop.months - (oopHave as number) : 0 },
      quote: oop.quote, evidence: ev,
    })
  }

  for (const r of selfEmpRows) {
    if (p.foreignExpSelfEmployed !== true) continue
    blockedBy = blockedBy ?? 'selfEmployed'
    reasons.push({ kind: REASON.gap, text: '自雇经历不计入工作经验', key: PV_KEY.selfEmp, quote: quoteOfReq(r), evidence: evOfReq(r) })
  }

  // NL:指定雇主名录里申报过这个 NOC 的雇主数(supporting fact)
  if (spec.reqProvince === 'NL' && p.noc) {
    const hits = data.designatedEmployers.filter((e) => e.province === 'NL' && (e.nocs || '').split(',').map((s) => s.trim()).includes(p.noc as string))
    const src = hits.find((e) => e.url && e.fetched)
    reasons.push({
      kind: hits.length ? REASON.met : REASON.gap,
      text: `${data.designatedEmployers.filter((e) => e.province === 'NL').length} 家 NL 指定雇主中 ${hits.length} 家申报过 ${p.noc}`,
      key: PV_KEY.nlDesignated,
      params: { total: data.designatedEmployers.filter((e) => e.province === 'NL').length, hits: hits.length, noc: p.noc },
      // mart 的 designated_employers 行不带 url/fetched(见类型注释的数据缺口)→ 挂不上就不挂,不借别的页的出处充数
      ...(src ? { evidence: { url: src.url as string, fetched: src.fetched as string, label: 'NLPNP designated employers' } } : {}),
    })
  }

  // ── ⑥ 门槛清单:这条通道有哪几类闸(gateManifest)────────────────────────────
  // 病灶原话:`pnp_requirements` 是开放世界的表,这里却做封闭世界推理 ——「库里这几条你都满足 → 能走」。
  // 抽不到的门槛不是不存在的门槛。清单把「有哪几类闸」独立记一份,于是「我没这类数据 / 你没答这题」
  // 第一次变得**可被发现**;发现不了的时候一律不许说「能走」。
  let manifestGap = false          // 明确不满足(有闸、答案是「没有」)→ 现在走不了,但可解决
  let manifestUnknown = false      // 判不了(条文缺 **或** 答案缺,两者都进 needs-info)
  // 🔴 但这两者对用户意思相反,**只有条文缺才是 availability='not-collected'**:
  //    「本站没收录这条通道的门槛」是我们的窟窿;「你还没答有没有 offer」是他一步就能补的。
  //    合并成一句「判不了」等于把我们的窟窿说成他的问题(与库里缺门槛行的老规矩同源)。
  let manifestNoSource = false
  // 专业对口:答「对口」即达标;答「不对口」时看该通道给不给本省院校的例外
  //(NL:Memorial/CNA 毕业生 + 岗位 TEER 0-3 可不对口;TEER 4/5 要对紧缺清单 → 判不了)
  const fieldMatchAnswer = (): boolean | null => {
    if (p.fieldMatch !== false) return p.fieldMatch          // true=达标;null=没答→判不了
    const ex = fieldMatchExemptionOf(spec.key)
    if (!ex) return false                                     // 没有例外条款 → 不对口就是缺口
    if (p.studyProvince == null) return null                  // 不知道在哪读的书 → 判不了
    if (p.studyProvince !== ex.studyProvince) return false    // 省外院校:官方明写要**直接**相关
    return p.teer == null ? null : (ex.teers.includes(p.teer) ? true : null)
  }
  const answerOf: Record<GateKey, boolean | null> = {
    offer: p.hasOffer, statusInCanada: p.inCanada, credentialCanada: p.canadaStudy,
    fieldMatch: fieldMatchAnswer(),
    french: p.frenchOk,
  }
  // statusInCanada 按 asks 取答案(2026-08-15 拆闸):「境内身份」底下其实是三种官方要求,
  // inCanada 只答得了「人在不在加拿大」—— 拿它过工签闸,学签在读全被 AB/PE 放行;
  // 拿它过 NB/MB 的「住在/受雇于该省」,安省居民照样被放行。境外(inCanada=false)四种问法都是「没有」。
  const statusGateAnswer = (asks: StatusAsk | undefined): boolean | null => {
    if (!asks) return p.inCanada                                 // 未标注 = 旧口径兜底
    if (p.inCanada === false) return false
    // 2026-08-16 Frank「这个上面的问题也没问,你是否有工签啊?」:**许可只认许可题的答案**。
    // 先前由处境推(在读→学签、在工作→有工签),推出来的却是「差工签/已达标」这种结论性判定 ——
    // 两个方向都是没问就替他认定。境内一律问那道题(fields.permitBand 同日改成 inCanada),没答=判不了。
    const permit = p.permit
    switch (asks) {
      case 'workPermit':
        return permit ? permit === PERMIT.pgwp || permit === 'work' : null
      case PERMIT.pgwp:
        return permit ? permit === PERMIT.pgwp : null                 // 封闭/开放工签都不是 PGWP,不许充数
      case 'provResidence':
        return p.province == null ? null : p.province === spec.reqProvince
      case 'provEmployment': {
        if (p.province == null) return null
        if (p.province !== spec.reqProvince) return false
        if (p.status === 'worker') return true                   // 处境明说在工作
        if (p.status === PERMIT.study || p.status === 'other') return false  // 读书/找工作=明说不在职
        // pgwp/没答说明不了在不在职 → 看本省在职月数(tenure 口径本来就只认本省攒的):
        // 攒过 = 在职过这家雇主;0 = 没在本省受雇过;没答 = 判不了
        return p.expCanadaMonths == null ? null : p.expCanadaMonths > 0
      }
    }
  }
  for (const g of GATE_KEYS) {
    const rule = gateOf(spec.key, g)
    if (rule.need === 'notRequired') continue                    // 没这道闸
    if (rule.need === 'unknown') {                               // 本站未收录 ≠ 官方不要求
      if (OPT_IN_GATES.has(g)) continue                          // 选配闸没声明 = 没扫过这类条款,跳过
      manifestUnknown = true
      manifestNoSource = true
      reasons.push({ kind: REASON.needsInfo, text: `本站尚未收录 ${spec.stream} 的${gateLabels[g].zh}门槛条文`,
        key: `pv.gate.${g}.notCollected`, params: { stream: spec.stream },
        ...(rule.url ? { evidence: { url: rule.url, fetched: rule.fetched ?? '', label: spec.stream } } : {}) })
      continue
    }
    const asks = g === 'statusInCanada' ? rule.asks : undefined
    const have = asks ? statusGateAnswer(asks) : answerOf[g]
    // 文案与 i18n key 按 asks 细分:判的是工签就说工签,不再统称「境内身份」(文案跟判据必须对得上)
    const what = asks ? askLabels[asks].zh : gateLabels[g].zh
    const keyOf = (state: string) => `pv.gate.${g}${asks ? `.${asks}` : ''}.${state}`
    const ev = { url: rule.url, fetched: rule.fetched, label: spec.stream }
    if (have == null) {                                          // 有闸,但用户没答 → 判不了
      manifestUnknown = true
      missingSlots.push(g)
      reasons.push({ kind: REASON.needsInfo, text: `${what}判不了,档案缺这一项`,
        key: keyOf('unknown'), evidence: ev })
      continue
    }
    if (have) { reasons.push({ kind: REASON.met, text: `${what} 达标`, key: keyOf(REASON.met), evidence: ev }); continue }
    manifestGap = true                                           // 明确没有 → 现在走不了
    // 标签报**最难拆的**那道闸:一个从没来过加拿大、也没有 offer 的人,写「要先有 offer」
    // 会让他以为找份工作就行,而真正挡路的是那张加拿大学历(2026-08-12 实拍)
    if (blockCost(g) > blockCost(blockedBy)) blockedBy = g
    reasons.push({ kind: REASON.gap, text: `这条通道要求${what},你现在没有`,
      key: keyOf(REASON.gap), evidence: ev })
  }

  // 最大的那个缺口定 tier;并列时**经验类优先**当代表(它决定 tierBasis,居住类没有起算点问题)
  const worst = gaps.reduce<{ months: number; kind: 'work' | 'residence' } | null>(
    (a, b) => (a == null || b.months > a.months || (b.months === a.months && b.kind === 'work') ? b : a), null)
  const tier: PathwayVerdict['tier'] = excluded ? null : tierOfMonths(worst?.months ?? 0)
  // 三值折叠:清单里每一类闸都 met 才是 open;有 unknown 就是「判不了」;有明确不满足的闸 → blockedBy 兜住
  //(rank 里 blockedBy 排在无阻碍的 open 之后,标签另写 —— 与语言差档同一套语义)。
  const needsInfo = !excluded && (!gate.picked || gate.gap == null || missingSlots.length > 0 || manifestUnknown)
  const verdict: PathwayVerdict['verdict'] = excluded ? REASON.excluded : needsInfo ? REASON.needsInfo : VERDICT.viable
  // 清单缺条文 = 本站未收录,与「查不到门槛行」同属 not-collected(对用户是「规则待核对」不是「你不行」)。
  // **excluded 时不改 availability**:硬伤是判出来的结论,不是「我们没数据」——两者混在一起就成了
  // 「因为没数据所以排除你」,那是拿缺口当判据(四态不合并的老规矩)。
  // 🔴 「他没答职业」不算本站未收录:gate.teerUnknown 时行是有的,缺的是他那一格答案 →
  //    availability 仍是 ok,判不了走 needs-info + missingSlots 点名(三值折叠:条文缺 ≠ 答案缺)。
  const availability: Availability = (!gate.picked && !gate.teerUnknown) || (!excluded && manifestNoSource) ? 'not-collected' : 'ok'
  void manifestGap

  // #319 起算点:在读学生的「再攒 N 个月」不是从今天算,是**毕业拿到工签之后**才开始 ——
  // 学签在读不许全职上班,这 N 个月一天都攒不了。判据四件:处境=在读 + 许可不是已经在工作的那两种
  // + 真的有等待期(下发的 tier > 0,库缺行被抹成 null 的那种不谈起算点)
  // + 这段等待来自经验/在职门槛(居住门槛不吃这条:人搬过去当天就在计时)。
  const outTier: PathwayVerdict['tier'] = verdict === REASON.needsInfo && !gate.picked ? null : tier
  const studying = p.status === PERMIT.study && (p.permit == null || p.permit === PERMIT.study)
  const tierBasis: PathwayVerdict['tierBasis'] =
    studying && !excluded && outTier != null && outTier > 0 && worst?.kind === 'work' && worst.months > 0
      ? TIER_BASIS.afterStudy : TIER_BASIS.now
  // 这段等待要的是不是**全职**(2026-08-16 Frank「而且需要全职的吗?」):判据取选中那一行的官方原文,
  // 代码里不写死 —— AB/ON/SK/MB 的行都明写 full-time,NS 写的是「paid work + 1,560 小时」不含全职字样。
  // 只对经验/在职类等待有意义(居住类不谈全职)。
  const tierFullTime = worst?.kind === 'work' && /full[\s-]?time/i.test(gate.picked?.label ?? '')

  return {
    key: spec.key, province: spec.province, stream: spec.stream,
    verdict, tier: outTier, tierBasis, ...(tierFullTime ? { tierFullTime: true } : {}),
    ...(blockedBy && !excluded ? { blockedBy } : {}),
    ...(missingSlots.length && !excluded ? { missingSlots: Array.from(new Set(missingSlots)) } : {}),
    reasons, ...(score ? { score } : {}), availability,
  }
}

/**
 * 档案 → 13 条通道的裁决。
 * 排序:open 在前(按 tier 升序)→ needs-info(按 **tier 潜力**升序:缺槽的门槛按 0 经验/0 居住的
 * 上界记档,tier0 潜力浮顶、库缺行的 null 沉底 —— §4.5 的 NL 掉桶修复,C6 选项卡推荐位同一套序)
 * → excluded 沉底(tier 恒 null → 注册表原序)。
 * **同 tier 不再排序**(v1 没有配额/竞争度入参,按注册表原序保持稳定 —— 编个次序出来等于替用户拿主意)。
 */
export function pathVerdict(profile: VerdictProfile, data: VerdictData): PathwayVerdict[] {
  const out = REGISTRY.map((spec, i) => ({ v: evaluateOne(spec, profile, data), i }))
  // 四档:现在就能走 → 被硬门槛卡住(考试能补,但**现在**走不了) → 缺档案判不了 → 排除。
  // 先前只有三档,「差 3 档语言」和「全部达标」并列 tier0,谁在注册表里靠前谁第一。
  // 2026-08-12 二拍(Frank 实拍:「纽芬兰那个需要学历,为什么还排在前面?」):
  // 先前按**判定桶**排(能走 → 被卡住 → 判不了 → 排除),于是「被卡住」整桶压在「判不了」前面 ——
  // 结果是**要读几年书才拿得到的加拿大学历**排在**几周就能拿到的 offer** 前面。桶不是难度。
  // 改成一把尺:**最难拆的那道障碍**。能说出具体障碍的(blockedBy)按它排,说不出的(needs-info)
  // 落在「境内身份」与「重考语言」之间 —— 我们连判都判不了,不该压过一条已知只差 offer 的路。
  const RANK = { none: 0, offer: 1, statusInCanada: 2, selfEmployed: 3, fieldMatch: 3.5, unknown: 4, language: 5, french: 5.5, credentialCanada: 6, excluded: 9 }
  // 工签闸对「本省在读学生」降本(2026-08-15 Frank「这个推荐科学吗」实拍:人在阿省、阿省学历,
  // 阿省机会通道因为「差工签」被排到差 offer 的路之后,而他毕业拿 PGWP 基本是既定事实,
  // offer 才是真要去抢的那一样)。**只降到与 offer 同级、不越过它**:PGWP 仍需毕业+申请,
  // 不是今天就有。判据要三件同时成立 —— 在本省读书 + 学历在本省 + 这条路要的是工签(不是 PGWP 本身)。
  const pgwpExpected = profile.status === PERMIT.study && profile.canadaStudy === true
  const workPermitSoon = (v: PathwayVerdict): boolean =>
    pgwpExpected && v.blockedBy === 'statusInCanada'
    && profile.studyProvince != null && profile.studyProvince === v.province
    && gateOf(v.key, 'statusInCanada').need === 'required'
    && (gateOf(v.key, 'statusInCanada') as { asks?: string }).asks === 'workPermit'
  const obstacle = (v: PathwayVerdict): number =>
    v.verdict === REASON.excluded ? RANK.excluded
      : workPermitSoon(v) ? RANK.offer
        : v.blockedBy ? (RANK as Record<string, number>)[v.blockedBy] ?? RANK.unknown
          : v.verdict === REASON.needsInfo ? RANK.unknown
            : RANK.none
  out.sort((a, b) => {
    if (obstacle(a.v) !== obstacle(b.v)) return obstacle(a.v) - obstacle(b.v)
    const ta = a.v.tier ?? 9, tb = b.v.tier ?? 9
    if (ta !== tb) return ta - tb
    return a.i - b.i
  })
  return out.map((x) => x.v)
}

// ── 职业级通道行(C6 职位详情页通道卡的无档案态)────────────────────────────
//
// 一个 NOC+TEER 进,13 条通道的**职业级**事实出(不含任何个人档案):
// 经验门槛月数(排序键)、门槛口径(同雇主在职时长另标)、清单点名/排除、availability。
// 有档案时详情卡不走这条 —— 直接用上面 pathVerdict 的序(设计 §五「双态」)。


const EMPTY_PROFILE: VerdictProfile = {
  age: null, married: null, clb: null, edu: null, eduYears: null, canadaStudy: null,
  studyProvince: null, noc: null, teer: null, expCanadaMonths: null, expForeignMonths: null,
  foreignExpSelfEmployed: null, hasOffer: null, inCanada: null, status: null, province: null, permit: null, fieldMatch: null, frenchOk: null,
}

/** 排序:可判的按经验门槛升序 → 门槛未收录 → 清单排除沉底;同档按注册表原序(与卡片效果图一致)。 */
export function jobPathways(noc: string | null, teer: number | null, data: VerdictData): JobPathwayRow[] {
  const p: VerdictProfile = { ...EMPTY_PROFILE, noc, teer }
  const out = REGISTRY.map((spec, i) => {
    const rows = reqsOf(spec, data.requirements)
    // 清单判定与 evaluateOne ① 同口径(那边还要造 quote/evidence,这里只要布尔,不共函数)
    let listedIn = false
    let excludedByList = false
    if (noc) {
      excludedByList = data.occupations.some((o) => o.province === spec.reqProvince && o.type === 'ineligible' && o.noc === noc
        && (!o.appliesTo || o.appliesTo.toLowerCase().includes('employment offer') === /employment offer/i.test(spec.stream)))
      listedIn = data.occupations.some((o) => o.province === spec.reqProvince && o.type === INDEMAND && o.noc === noc)
      if (spec.listRequired) {
        const list = data.occupations.filter((o) => o.province === spec.listRequired!.province && o.type === INDEMAND
          && spec.listRequired!.streamRe.test(o.stream))
        if (list.length && !list.some((o) => o.noc === noc)) excludedByList = true
      }
    }
    if (!rows.length) {
      return { row: { key: spec.key, province: spec.province, stream: spec.stream, months: null, tenure: false, listedIn, excludedByList, availability: 'not-collected' as Availability }, i }
    }
    const selfEmpExcluded = rows.some((r) => r.factor === 'workSelfEmployed' || r.factor === 'experienceExcluded')
    const gate = pickGate(spec, rows, p, selfEmpExcluded)
    return {
      row: {
        key: spec.key, province: spec.province, stream: spec.stream,
        months: gate.picked ? gate.need : null, tenure: gate.tenure, listedIn, excludedByList,
        availability: (gate.picked ? 'ok' : 'not-collected') as Availability,
      },
      i,
    }
  })
  const rank = (r: JobPathwayRow) => (r.excludedByList ? 2 : r.availability !== 'ok' || r.months == null ? 1 : 0)
  out.sort((a, b) => rank(a.row) - rank(b.row) || (a.row.months ?? 99) - (b.row.months ?? 99) || a.i - b.i)
  return out.map((x) => x.row)
}

/**
 * 杠杆:哪一个动作最值钱、哪一个动作最毁事。
 * @param clbTarget 语言目标档(默认 8:雅思一次提两档是最常见的可行目标)。**分值仍全部查表**,
 *                  这里给的只是「问哪一档」的场景参数,不是官方数字。
 */
export function pathLevers(profile: VerdictProfile, data: VerdictData, opts: { clbTarget?: number; teerDowngradeNoc?: string } = {}): VerdictLever[] {
  const levers: VerdictLever[] = []

  // ① 接低 TEER 的岗(如 75110 construction trades helpers and labourers,TEER 5)会毁掉哪些通道 ——
  //    不写死结论:拿改过 TEER 的同一份档案重跑一遍注册表,看哪几条从 open 掉出来。
  const downNoc = opts.teerDowngradeNoc ?? '75110'
  if (profile.teer != null && profile.teer < 5 && profile.noc) {
    const before = pathVerdict(profile, data)
    const after = pathVerdict({ ...profile, noc: downNoc, teer: 5 }, data)
    const byKey = new Map(after.map((v) => [v.key, v]))
    // 「接 TEER 5 岗会掉档」问的是**职业等级**这一件事,与「你今天够不够格」无关 ——
    // 原来只看 verdict===VERDICT.viable,门槛清单上线后大量通道落 needs-info(缺 offer 答案),
    // 这条杠杆会整条消失(2026-08-12 实撞)。改成**前后对比谁变差了**:
    // 档次 open(无阻碍) < open(被卡住) < needs-info < excluded,同档再比 tier。
    // 前后两次跑的是同一份档案,清单那三类闸的贡献一样,差出来的只会是 TEER 带来的。
    const vRank = (v?: PathwayVerdict) =>
      v == null ? 9 : v.verdict === VERDICT.viable ? (v.blockedBy ? 1 : 0) : v.verdict === REASON.needsInfo ? 2 : 3
    const worse = (b: PathwayVerdict) => {
      const a = byKey.get(b.key)
      if (vRank(a) !== vRank(b)) return vRank(a) > vRank(b)
      return (a?.tier ?? 9) > (b.tier ?? 9)
    }
    const affected = before.filter((v) => v.verdict !== REASON.excluded && worse(v)).map((v) => v.key)
    const teerRows = data.requirements.filter((r) => r.factor === FACTOR.experience && r.appliesTeer && !teerHit(r, 5))
    if (affected.length) {
      levers.push({
        key: 'teer-downgrade',
        text: `换成 ${downNoc} TEER 5 的岗位后,${affected.length} 条通道掉档:${affected.join('、')}`,
        affected,
        reasons: teerRows.slice(0, 4).map((r) => ({
          kind: REASON.excluded,
          text: `${r.province} ${r.stream}:该门槛只认 TEER ${r.appliesTeer}`,
          quote: quoteOfReq(r), evidence: evOfReq(r),
        })),
      })
    }
  }

  // ② 语言提档:同一套官方分值表查两次,报差值(ON 单行=总分;MB 四项各查一次,走 mbEoiEstimate)
  const target = opts.clbTarget ?? 8
  if (profile.clb != null && profile.clb < target) {
    const gains: NonNullable<VerdictLever['gains']>[number][] = []
    const onRows = data.scoreFactors.filter((f) => f.province === 'ON' && f.factor === FACTOR.language && f.kind === FACTOR_ROW)
    const pickOn = (clb: number): ScoreFactor | null => {
      const scored = onRows.map((f) => ({ f, th: maxClbIn([f.label]) })).filter((x): x is { f: ScoreFactor; th: number } => x.th != null)
      const ok = scored.filter((x) => x.th <= clb)
      return ok.length ? ok.reduce((a, b) => (b.th > a.th ? b : a)).f : null
    }
    const onFrom = pickOn(profile.clb), onTo = pickOn(target)
    if (onFrom && onTo) {
      gains.push({
        province: 'ON', system: onFrom.system, from: onFrom.points ?? 0, to: onTo.points ?? 0,
        delta: (onTo.points ?? 0) - (onFrom.points ?? 0), evidence: evOfFactor(onTo),
      })
    }
    if (data.scoreFactors.some((f) => f.province === 'MB') && profile.age != null && profile.edu != null) {
      const mbGate = data.requirements.filter((r) => r.province === 'MB' && /skilled worker in manitoba/i.test(r.stream) && r.factor === FACTOR.experience)
      const need = Math.max(...mbGate.map((r) => monthsOfReq(r) ?? 0), 0)
      const work = Math.max(profile.expCanadaMonths ?? 0, need)
      const from = estimateMbEoi(data.scoreFactors, mbProfileOf(profile, work, profile.clb))
      const to = estimateMbEoi(data.scoreFactors, mbProfileOf(profile, work, target))
      const head = data.scoreFactors.find((f) => f.province === 'MB') as ScoreFactor
      gains.push({ province: 'MB', system: from.system, from: from.total, to: to.total, delta: to.total - from.total, evidence: evOfFactor(head) })
    }
    if (gains.length) {
      levers.push({
        key: 'clb-boost',
        text: `语言从 CLB ${profile.clb} 提到 CLB ${target}:${gains.map((g) => `${g.province} +${g.delta}`).join('、')}`,
        gains,
      })
    }
  }

  return levers
}
