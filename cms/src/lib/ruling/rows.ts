/**
 * 行构造器:SQL 原始行 → 本域形状,一条 SQL 一个(十件套第十抽屉,2026-08-21 Frank 立)。
 * 体内只许词汇表 + 纯拼装,不许业务判断 —— 每格空值决策用词的选择说话
 * (text 落空串 / count 落 0 / numOrNull 保 null / textOrNull 保 null),
 * 见 docs/implementation/默认值架构-20260821.md。
 *
 * @author Frank
 * @time 2026-08-21 21:15:00
 */

import { count, numOrNull, text, textOrNull } from '../db'
import { DATE_LEN, DATE_LEN_DAY, FACTOR_ROW, SUBJECT } from './constants'
import type {
  DirectoryRowIn,
  DirectoryRowOut,
  EmployerFactsOfIn,
  EmployerFactsOfOut,
  LmiaNocsCellOfIn,
  LmiaNocsCellOfOut,
  PassRowIn,
  PassRowOut,
  SubjectOfIn,
  SubjectOfOut,
  ToDesignatedOut,
  ToDrawOut,
  ToEeGridOut,
  ToOccupationOut,
  ToRequirementOut,
  ToRowIn,
  ToScoreFactorOut,
  TripleJobOfIn,
  TripleJobOfOut,
  ToOpsStatOut,
  ToProvCountOut,
} from './types'

/**
 * 门槛行的 subject 列 → 两个合法主语之一。不是 employer 的一律按 applicant 读 ——
 * 搞混这两个,句子本身就是假的(「你要开满一年」vs「雇主要开满一年」)。
 *
 * @param v 库里的 subject 列。
 * @returns applicant 或 employer。
 */
export function subjectOf(v: SubjectOfIn): SubjectOfOut {
  if (text(v) === SUBJECT.employer) {
    return SUBJECT.employer
  }
  return SUBJECT.applicant
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
export function toRequirement(r: ToRowIn): ToRequirementOut {
  return {
    province: text(r.province), program: text(r.program), stream: text(r.stream),
    subject: subjectOf(r.subject),
    factor: text(r.factor), op: text(r.op), value: numOrNull(r.value), valueText: text(r.value_text),
    unit: text(r.unit), appliesTeer: text(r.applies_teer), appliesNoc: text(r.applies_noc),
    excludesNoc: text(r.excludes_noc), appliesArea: text(r.applies_area),
    appliesCondition: text(r.applies_condition), familySize: numOrNull(r.applies_family_size),
    basis: text(r.basis), label: text(r.label), section: text(r.section), effective: text(r.effective),
    url: text(r.url), pageUrl: text(r.page_url), fetched: text(r.fetched),
  }
}

/**
 * 一行省提名职业清单 → `OccupationRow`。
 *
 * @param r 库里的一行。
 * @returns 判定核认的形状。
 */
export function toOccupation(r: ToRowIn): ToOccupationOut {
  return {
    province: text(r.province), stream: text(r.stream), label: text(r.label), program: text(r.program),
    type: text(r.type), url: text(r.url), fetched: text(r.fetched), appliesTo: text(r.applies_to),
    noc: text(r.noc), name: text(r.name), gtaRestricted: Boolean(r.gta_restricted),
  }
}

/**
 * 一行抽选记录 → `VerdictDrawRow`。日期只取前十位(库里可能带时分秒)。
 *
 * @param r 库里的一行。
 * @returns 判定核认的形状。
 */
export function toDraw(r: ToRowIn): ToDrawOut {
  return {
    province: text(r.province), label: text(r.label), scale: textOrNull(r.scale),
    url: text(r.url), fetched: text(r.fetched), kind: text(r.kind),
    drawDate: text(r.draw_date).slice(0, DATE_LEN), stream: text(r.stream),
    score: numOrNull(r.score), invitations: numOrNull(r.invitations), note: text(r.note),
  }
}

/**
 * 一行省提名打分因素 → `ScoreFactor`。
 *
 * @param r 库里的一行。
 * @returns 评分域认的形状。
 */
export function toScoreFactor(r: ToRowIn): ToScoreFactorOut {
  return {
    province: text(r.province), system: text(r.system), factor: text(r.factor),
    kind: text(r.kind) || FACTOR_ROW, seq: count(r.seq), label: text(r.label),
    points: numOrNull(r.points), xorPrev: Boolean(r.xor_prev), rule: text(r.rule),
    factorMax: numOrNull(r.factor_max), factorGroup: text(r.factor_group), groupMax: numOrNull(r.group_max),
    passMark: numOrNull(r.pass_mark), maxTotal: numOrNull(r.max_total),
    guideEffective: text(r.guide_effective), fetched: text(r.fetched), url: text(r.url),
  }
}

/**
 * 一行 EE 分表 → `EeGridRow`。`points` 可空:官方的 n/a 原样留在 `pointsText`,不拿 0 冒充。
 *
 * @param r 库里的一行。
 * @returns 评分域认的形状。
 */
export function toEeGrid(r: ToRowIn): ToEeGridOut {
  return {
    grid: text(r.grid), section: text(r.section), sectionLabel: text(r.section_label),
    kind: text(r.kind), tableNo: numOrNull(r.table_no), heading: text(r.heading), factor: text(r.factor),
    criterion: text(r.criterion), columnLabel: text(r.column_label), points: numOrNull(r.points),
    pointsText: text(r.points_text), seq: numOrNull(r.seq), url: text(r.url), fetched: text(r.fetched),
  }
}

/**
 * 一行指定雇主名录 → `DesignatedEmployerRow`。
 *
 * @param r 库里的一行。
 * @returns 判定核认的形状。
 */
export function toDesignated(r: ToRowIn): ToDesignatedOut {
  return {
    name: text(r.name), province: text(r.province), location: text(r.location),
    isTech: Boolean(r.is_tech), source: text(r.source), nocs: text(r.nocs),
    url: text(r.url), fetched: text(r.fetched),
  }
}

/**
 * 库里一行岗位 → 判定卡认的岗位。
 *
 * @param input 库里那一行。
 * @returns 判定卡认的岗位。
 */
export function tripleJobOf(input: TripleJobOfIn): TripleJobOfOut {
  const r = input.row
  return {
    id: Number(r.id), title: text(r.title), noc: text(r.noc), nocName: text(r.noc_title),
    teer: numOrNull(r.teer), province: text(r.province), city: text(r.city),
    pnpEligible: Boolean(r.pnp_eligible), pnpStream: text(r.pnp_stream),
    eeCategory: text(r.ee_category), aip: Boolean(r.aip),
    employmentTerm: text(r.employment_term), employmentHours: text(r.employment_hours),
  }
}

/**
 * 库里一行公司登记事实 → 雇主判定认的事实(纯映射;查不到那一行时由调用方给全 null 的空份,
 * `employerVerdict` 落 unknown,**不编**)。
 *
 * @param f 库里那一行。
 * @returns 雇主判定认的事实。
 */
export function employerFactsOf(f: EmployerFactsOfIn): EmployerFactsOfOut {
  return {
    foundedYear: numOrNull(f.founded_year),
    registryStatus: text(f.registry_status),
    staffEst: numOrNull(f.staff_est),
    staffEstSrc: text(f.staff_est_src),
    sector: text(f.sector),
  }
}

/**
 * `COMPANY_LMIA_NOCS` 的行映射:整行只有一格,取成字符串(空值落空串,由 `lmiaNocsOf` 判空)。
 *
 * @param row 库里那一行。
 * @returns 那一格的文本。
 */
export function lmiaNocsCellOf(row: LmiaNocsCellOfIn): LmiaNocsCellOfOut {
  return text(row.lmia_nocs)
}

/**
 * 原样通过的行映射 —— 只给「一行多用、还没配完整行形状」的查询当占位(见 `oneRow` 的 JSDoc)。
 *
 * @param row 原始行。
 * @returns 原样的那一行。
 */
export function passRow(row: PassRowIn): PassRowOut {
  return row
}

/**
 * 库里一行名录 → 判定认的那一行。url/fetched 空串折 undefined:两格在形状里是「有才挂」,
 * JSON.stringify 丢 undefined 值。
 *
 * @param input 库里那一行。
 * @returns 判定认的那一行。
 */
export function directoryRow(input: DirectoryRowIn): DirectoryRowOut {
  const d = input.row
  const url = text(d.url) || undefined
  const fetched = text(d.fetched).slice(0, DATE_LEN_DAY) || undefined
  return {
    name: text(d.name),
    province: text(d.province),
    location: text(d.location),
    isTech: Boolean(d.is_tech),
    source: text(d.source),
    nocs: text(d.nocs),
    url: url,
    fetched: fetched,
  }
}

/**
 * `CASE_PROV_COUNTS` 的一行 → 每省在招计数。两列都是个数,`count` 落 0 无害。
 *
 * @param row 库里的一行。
 * @returns 每省一行的计数。
 */
export function toProvCount(row: ToRowIn): ToProvCountOut {
  return { province: text(row.province), n: count(row.n), t: count(row.t) }
}

/**
 * `PNP_OPS_STATS` 的一行 → 官方运营统计行。`value` 走 `numOrNull` —— 隐私抑制值折 0 就是替官方编数。
 *
 * @param row 库里的一行。
 * @returns 干净的统计行。
 */
export function toOpsStat(row: ToRowIn): ToOpsStatOut {
  return {
    value: numOrNull(row.value), province: text(row.province), metric: text(row.metric),
    period: text(row.period), asOf: text(row.as_of), url: text(row.url),
  }
}
