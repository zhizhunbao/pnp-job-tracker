/**
 * 签名归外部定死的函数:`Array.prototype.sort` 的比较器。比较器体内只读行上现成的值 ——
 * 匹配视图的列值(v)与档位序(rank)由构建方先算好挂在 `RankedHit` 上,这里不查表不判业务。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

import type { RankedHit } from './types'

/**
 * 匹配视图默认序:档位降序(stable sort 保同档内候选的日期序)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
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
export function byEntryCountDesc(a: [string, number], b: [string, number]): number {
  return b[1] - a[1]
}
