/**
 * pnp 子桶 fit 的判定:资讯页「申请步骤」按身份与教育经历留哪几条通道(2026-10-11 申请步骤分区筛选批 1)。
 * 口径(Frank「如果啥也没选,就显示所有」「就是根据筛选,显示可走」):没选身份、通道没登对照、对照里没这身份 —— 一律留(本站未核,
 * 不替官方藏);写了不能走的藏;带院校条件的,只在填了院校所在地的那几段里找,有一段合上任一条就留,一段都没填也留。
 * 教育经历里没选的格(性质、时长)不拿来刷掉 —— 只有填了、且和条件对不上才算不合。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */
import { CAN_NO, EDU_ABROAD, LEN_ORDER, SP_CANADA, SP_OTHER, SP_OWN, TEXT_NONE } from './constants'
import type { AnySchoolIn, EduRow, KeepIn, SchoolHitIn } from './types'

/**
 * 这条通道在当前筛选下留不留。
 *
 * @param x 通道的身份对照、所在省与筛选条件。
 * @returns true = 留。
 */
export function keepStreamOf(x: KeepIn): boolean {
  if (x.filter.who === TEXT_NONE || x.fits == null) {
    return true
  }
  const cell = x.fits[x.filter.who]
  if (cell == null) {
    return true
  }
  if (cell.can === CAN_NO) {
    return false
  }
  if (cell.schools == null || cell.schools.length === 0) {
    return true
  }
  const rows = filledRowsOf(x.filter.edu)
  if (rows.length === 0) {
    return true
  }
  return anySchoolHitOf({ rows, schools: cell.schools, province: x.province })
}

/**
 * 填了院校所在地的那几段教育经历。
 *
 * @param rows 教育经历。
 * @returns 填了地点的段。
 */
function filledRowsOf(rows: EduRow[]): EduRow[] {
  const out: EduRow[] = []
  for (const r of rows) {
    if (r.prov !== TEXT_NONE) {
      out.push(r)
    }
  }
  return out
}

/**
 * 有没有一段教育经历合上任一条院校条件。
 *
 * @param x 填了地点的段、院校条件与通道所在省。
 * @returns true = 合上。
 */
function anySchoolHitOf(x: AnySchoolIn): boolean {
  for (const row of x.rows) {
    for (const school of x.schools) {
      if (schoolHitOf({ row, school, province: x.province })) {
        return true
      }
    }
  }
  return false
}

/**
 * 一段教育经历合不合一条院校条件:地点、性质、时长三格都不冲突。
 *
 * @param x 一段、一条条件与通道所在省。
 * @returns true = 合。
 */
function schoolHitOf(x: SchoolHitIn): boolean {
  if (provHitOf(x) === false) {
    return false
  }
  if (x.school.kind != null && x.row.kind !== TEXT_NONE && x.row.kind !== x.school.kind) {
    return false
  }
  if (x.school.min != null && x.row.len !== TEXT_NONE
    && LEN_ORDER.indexOf(x.row.len) < LEN_ORDER.indexOf(x.school.min)) {
    return false
  }
  return true
}

/**
 * 地点合不合:本省 = 院校在通道所在省;外省 = 加拿大别的省;加拿大 = 不是国外;不限 = 都行。
 *
 * @param x 一段、一条条件与通道所在省。
 * @returns true = 合。
 */
function provHitOf(x: SchoolHitIn): boolean {
  if (x.school.prov === SP_OWN) {
    return x.row.prov === x.province
  }
  if (x.school.prov === SP_OTHER) {
    return x.row.prov !== x.province && x.row.prov !== EDU_ABROAD
  }
  if (x.school.prov === SP_CANADA) {
    return x.row.prov !== EDU_ABROAD
  }
  return true
}
