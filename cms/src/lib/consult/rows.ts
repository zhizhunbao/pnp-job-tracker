/**
 * 行构造器:SQL 原始行 → 本域形状,一条 SQL 一个(十件套第十抽屉,2026-08-21 Frank 立)。
 * 体内只许词汇表 + 纯拼装,不许业务判断 —— 每格空值决策用词的选择说话
 * (text 落空串 / count 落 0 / numOrNull 保 null),见 docs/implementation/默认值架构-20260821.md。
 *
 * @author Frank
 * @time 2026-08-21 21:02:00
 */

import { count, numOrNull, text } from '../db'
import type { Requirement } from '../gauge'
import { DATE_LEN, SUBJECT } from './constants'
import type {
  SubjectOfIn, SubjectOfOut, DrawDbRow, DrawRow, EeDbRow, EeRow, NocSearchRow, NocHit, OccFlatRow, OccFlat,
  OpsDbRow, OpsRow, PermitDbRow, PermitRow, PointsDbRow, PointsRow, ProvOpenRow, JobsRow, ReqRow,
  ToTitleTeerIn, TitleTeer,
} from './types'

/**
 * 检索行 → 干净命中。每格空值决策见 `lib/db` 的词汇表(text/count/numOrNull),
 * 下面九个映射函数同此 —— 收窄只在映射里做一次,循环与调用处不再出现 `??`。
 *
 * @param r 原始行。
 * @returns 收窄后的命中。
 */
export function toNocHit(r: NocSearchRow): NocHit {
  return { noc: text(r.noc), title: text(r.title), n: count(r.n) }
}

/**
 * 各省在招数行 → `JobsRow`。open/named 是计数,0 无害。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toProvOpen(r: ProvOpenRow): JobsRow {
  return { prov: text(r.province), open: count(r.open), named: count(r.named) }
}

/**
 * 职业名与 TEER 结果集 → 干净对象。零行在这儿显式落空(''/null),数组越界的 undefined
 * 不进契约。TEER 走 `numOrNull` —— 不知道就是 null,分 TEER 的条款那时一条都挑不出来,那是实话。
 *
 * @param rows 查询结果集,可能为空。
 * @returns 收窄后的对象。
 */
export function toTitleTeer(rows: ToTitleTeerIn): TitleTeer {
  if (rows.length === 0) {
    return { title: '', teer: null }
  }
  return { title: text(rows[0].title), teer: numOrNull(rows[0].teer) }
}

/**
 * 清单收录行 → 干净记录。通道名官方缺失时落到本站短名。
 *
 * @param r 原始行。
 * @returns 收窄后的记录。
 */
export function toOccFlat(r: OccFlatRow): OccFlat {
  return {
    province: text(r.province),
    noc: text(r.noc),
    stream: text(r.stream) || text(r.label),
    type: text(r.type),
    url: text(r.url),
    fetched: text(r.fetched),
  }
}

/**
 * 抽选行 → `DrawRow`。分数线与邀请数走 `numOrNull` —— 官方没公布就是 null,不折 0。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toDrawRow(r: DrawDbRow): DrawRow {
  return {
    prov: text(r.province),
    date: text(r.draw_date).slice(0, DATE_LEN),
    stream: text(r.stream),
    scale: text(r.scale),
    score: numOrNull(r.score),
    invitations: numOrNull(r.invitations),
    evidence: { url: text(r.url), fetched: text(r.fetched) },
  }
}

/**
 * 运营统计行 → `OpsRow`。value 走 `numOrNull` —— 隐私抑制值折成 0 就是替官方编数。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toOpsRow(r: OpsDbRow): OpsRow {
  return {
    key: text(r.metric),
    scope: text(r.scope),
    label: text(r.label),
    value: numOrNull(r.value),
    valueText: text(r.value_text),
    unit: text(r.unit),
    asOf: text(r.as_of),
    period: text(r.period),
    evidence: { url: text(r.url), fetched: text(r.fetched) },
  }
}

/**
 * EE 类别行 → `EeRow`。分数线与邀请数走 `numOrNull`。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toEeRow(r: EeDbRow): EeRow {
  return {
    category: text(r.category),
    label: text(r.label),
    drawCrs: numOrNull(r.draw_crs),
    drawDate: text(r.draw_date).slice(0, DATE_LEN),
    drawSize: numOrNull(r.draw_size),
    evidence: { url: text(r.url), fetched: text(r.fetched) },
  }
}

/**
 * 联邦规则行 → `PermitRow`。value 走 `numOrNull`(`rule` 行本来就没有阈值);
 * 出处页 url 缺失时落到所属页面 page_url。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toPermitRow(r: PermitDbRow): PermitRow {
  return {
    program: text(r.program),
    stream: text(r.stream),
    factor: text(r.factor),
    op: text(r.op),
    value: numOrNull(r.value),
    valueText: text(r.value_text),
    unit: text(r.unit),
    basis: text(r.basis),
    label: text(r.label),
    evidence: { url: text(r.url) || text(r.page_url), fetched: text(r.fetched) },
  }
}

/**
 * 计分表行 → `PointsRow`。points 走 `numOrNull` —— 官方写 n/a 就是 null,原文在 pointsText。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toPointsRow(r: PointsDbRow): PointsRow {
  return {
    grid: text(r.grid),
    section: text(r.section),
    sectionLabel: text(r.section_label),
    kind: text(r.kind),
    heading: text(r.heading),
    factor: text(r.factor),
    criterion: text(r.criterion),
    columnLabel: text(r.column_label),
    points: numOrNull(r.points),
    pointsText: text(r.points_text),
    evidence: { url: text(r.url), fetched: text(r.fetched) },
  }
}

/**
 * 门槛行的 subject 列 → 两个合法值之一。不是 employer 的一律按 applicant 读 ——
 * 这两个搞混,句子本身就是假的(「你要开满一年」vs「雇主要开满一年」)。
 *
 * @param raw 库里的 subject 列。
 * @returns applicant 或 employer。
 */
export function subjectOf(raw: SubjectOfIn): SubjectOfOut {
  if (text(raw) === SUBJECT.employer) {
    return SUBJECT.employer
  }
  return SUBJECT.applicant
}

/**
 * 库里一行门槛条文 → `lib/rules` 认的 `Requirement`。
 *
 * 只做列名映射,一个判定都不做 —— 判定是 `evaluateRequirements` 的活,本域不重写它。
 *
 * @param row 库里的一行。
 * @returns 判定引擎认的形状。
 */
export function toRequirement(row: ReqRow): Requirement {
  return {
    province: text(row.province),
    program: text(row.program),
    stream: text(row.stream),
    subject: subjectOf(row.subject),
    factor: text(row.factor),
    op: text(row.op),
    value: numOrNull(row.value),
    valueText: text(row.value_text),
    unit: text(row.unit),
    appliesTeer: text(row.applies_teer),
    appliesNoc: text(row.applies_noc),
    excludesNoc: text(row.excludes_noc),
    appliesArea: text(row.applies_area),
    appliesCondition: text(row.applies_condition),
    familySize: numOrNull(row.applies_family_size),
    basis: text(row.basis),
    label: text(row.label),
    section: text(row.section),
    effective: text(row.effective),
    url: text(row.url),
    pageUrl: text(row.page_url),
    fetched: text(row.fetched),
  }
}
