/**
 * 签名归外部定死的函数:`Array.prototype.sort` 的比较器(两参一返是语言规定)。
 * 比较器体内只读行上现成的值 —— named 表的派生序(rank/rec)由构建方先算好挂在
 * `RankedSponsor` 上,这里不查表不判业务。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

import type { RankedSponsor, SponsorEmployerRow } from './types'

/**
 * LMIA 表的序:按新近度(Frank 08-08「按最近 LMIA 数排前面」),同值再看在招数。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byLmiaRecency(a: SponsorEmployerRow, b: SponsorEmployerRow): number {
  if (b.lmia1q !== a.lmia1q) {
    return b.lmia1q - a.lmia1q
  }
  if (b.lmia2q !== a.lmia2q) {
    return b.lmia2q - a.lmia2q
  }
  if (b.lmia4q !== a.lmia4q) {
    return b.lmia4q - a.lmia4q
  }
  return b.openJobs - a.openJobs
}

/**
 * named 表的序(#285 三灯默认序):灯①雇主资格(达标→待核/公共→差项)→ 灯②担保行为记录 → 在招数。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byNamedRank(a: RankedSponsor, b: RankedSponsor): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank
  }
  if (b.rec !== a.rec) {
    return b.rec - a.rec
  }
  return b.row.openJobs - a.row.openJobs
}

/**
 * 技能股排序:技能股获批数降序(列未回填的 null 当 0 参战),同值看在招数。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function bySkilledDesc(a: SponsorEmployerRow, b: SponsorEmployerRow): number {
  let av = 0
  if (a.lmiaPositionsSkilled != null) {
    av = a.lmiaPositionsSkilled
  }
  let bv = 0
  if (b.lmiaPositionsSkilled != null) {
    bv = b.lmiaPositionsSkilled
  }
  if (bv !== av) {
    return bv - av
  }
  return b.openJobs - a.openJobs
}

/**
 * 数字升序(对照页年薪中位数取中点前的排序)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byNumAsc(a: number, b: number): number {
  return a - b
}
