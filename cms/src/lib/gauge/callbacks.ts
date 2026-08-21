/**
 * **签名不是我们说了算**的那几个函数 —— 交给外部库或语言运行时回调用的。
 *
 * 🔴 收进来的门槛只有一条:**签名由外部库或语言定死**。这里全是比较器,
 * 两参一返由 `Array.prototype.sort` 规定。关掉的只有 `one-parameter` 与 `typed-signature`,
 * 注释、命名、不许匿名函数照旧管着。
 *
 * 🔴 **不许 import `functions.ts`**(会成环)。比较器要用到的派生值由调用方先算好挂在行上。
 *
 * @author Frank
 * @time 2026-08-20 21:45:00
 */

import type { Requirement, ScoredRow } from './types'

/**
 * 按字符串长度降序 —— NOC 前缀里最长的那个最具体。
 *
 * @param a 前一个。
 * @param b 后一个。
 * @returns 负数 = a 排在前面。
 */
export function byLengthDesc(a: string, b: string): number {
  return b.length - a.length
}

/**
 * 按「有多具体」降序 —— 最具体的那一行排最前。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 = a 排在前面。
 */
export function byScoreDesc(a: ScoredRow, b: ScoredRow): number {
  return b.s - a.s
}

/**
 * 按阈值升序。调用方已滤掉 `value` 为空的行,所以这里的 `?? 0` 永远走不到。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 = a 排在前面。
 */
export function byValueAsc(a: Requirement, b: Requirement): number {
  let av = 0
  if (a.value != null) {
    av = a.value
  }
  let bv = 0
  if (b.value != null) {
    bv = b.value
  }
  return av - bv
}

/**
 * 按阈值降序。调用方已滤掉 `value` 为空的行,所以这里的 `?? 0` 永远走不到。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 = a 排在前面。
 */
export function byValueDesc(a: Requirement, b: Requirement): number {
  let av = 0
  if (a.value != null) {
    av = a.value
  }
  let bv = 0
  if (b.value != null) {
    bv = b.value
  }
  return bv - av
}
