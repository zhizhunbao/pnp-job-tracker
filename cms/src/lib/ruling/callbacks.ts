/**
 * **签名不是我们说了算**的那几个函数 —— 交给外部库或语言运行时回调用的。
 *
 * 🔴 **为什么单独一格**:本域的铁律是「一个函数一个参数,入参与返回值都用自己的 type」,
 * 而比较器的两参一返由 `Array.prototype.sort` 定死。摊在 `functions.ts` 里,这一条例外
 * 就得靠 8 份逐字相同的 `eslint-disable` 撑着 —— **一个决定抄了八遍**,改一次要改八处,
 * 而且看不出这个域到底有多少处受制于外部。
 *
 * 收成一个文件之后:闸对这个文件关一次,`functions.ts` 里**零例外**(一条规矩没有例外,
 * 人才会信它),这个域「有几处签名不归我们管」也一眼数得清。
 *
 * 🔴 **收进来的门槛只有一条:签名由外部库或语言定死。**「我懒得改」不算 ——
 * 这里关掉的只有 `one-parameter` 与 `typed-signature`,注释、命名、不许匿名函数照旧管着。
 *
 * @author Frank
 * @time 2026-08-20 20:40:00
 */

import { SINK } from './constants'

import type {
  MyPathway, RankedBlock, RankedJobRow, RankedPathway, RankedVerdict, TrainableRow, VerdictDrawRow,
} from './types'

/**
 * 抽选行按日期倒序 —— 最近一轮排在最前。
 *
 * 两个参数是 `Array.prototype.sort` 定死的签名(外部规定,不是本域「一个函数一个参数」的例外)。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 = a 排在前面。
 */
export function byDrawDateDesc(a: VerdictDrawRow, b: VerdictDrawRow): number {
  return a.drawDate < b.drawDate ? 1 : -1
}

/**
 * 通道裁决按「障碍 → tier → 注册表原序」排。
 *
 * 两个参数是 `Array.prototype.sort` 定死的签名(外部规定)。名次在入表时就算好了,
 * 比较器只比数 —— 它不再认识档案,也就不必把档案闭包进来。
 *
 * @param a 前一条。
 * @param b 后一条。
 * @returns 负数 = a 排在前面。
 */
export function byObstacleThenTier(a: RankedVerdict, b: RankedVerdict): number {
  if (a.obstacle !== b.obstacle) {
return a.obstacle - b.obstacle
}
  if (a.tier !== b.tier) {
return a.tier - b.tier
}
  return a.i - b.i
}

/**
 * 职业级通道行按「档 → 门槛月数 → 注册表原序」排。
 *
 * 两个参数是 `Array.prototype.sort` 定死的签名(外部规定)。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 = a 排在前面。
 */
export function byListRankThenMonths(a: RankedJobRow, b: RankedJobRow): number {
  if (a.rank !== b.rank) {
return a.rank - b.rank
}
  if (a.months !== b.months) {
return a.months - b.months
}
  return a.i - b.i
}

/**
 * 数字升序 —— 两个参数是 `Array.prototype.sort` 定死的签名(外部规定)。
 *
 * @param a 前一个。
 * @param b 后一个。
 * @returns 负数 = a 排在前面。
 */
export function byNumberAsc(a: number, b: number): number {
  return a - b
}

/**
 * 按 tier 升序 —— 两个参数是 `Array.prototype.sort` 定死的签名(外部规定)。
 *
 * @param a 前一条。
 * @param b 后一条。
 * @returns 负数 = a 排在前面。
 */
export function byTierAsc(a: MyPathway, b: MyPathway): number {
  return (a.c.tier ?? SINK.tier) - (b.c.tier ?? SINK.tier)
}

/**
 * 按「这道闸多难拆」升序 —— 最好拆的排最前(它就是「下一步该干什么」)。
 *
 * 难度**由调用方先算好挂在行上**,不在这里查表:比较器会被调用 O(n log n) 次,
 * 更要紧的是这样它就不必认识 `functions.ts`(否则两个文件互相 import)。
 *
 * @param a 前一条。
 * @param b 后一条。
 * @returns 负数 = a 排在前面。
 */
export function byCostAsc(a: RankedBlock, b: RankedBlock): number {
  return a.cost - b.cost
}

/**
 * 按在招岗数降序 —— 两个参数是 `Array.prototype.sort` 定死的签名(外部规定)。
 *
 * @param a 前一条。
 * @param b 后一条。
 * @returns 负数 = a 排在前面。
 */
export function byOpeningsDesc(a: RankedPathway, b: RankedPathway): number {
  return b.n - a.n
}

/**
 * 按数量降序 —— 两个参数是 `Array.prototype.sort` 定死的签名(外部规定)。
 *
 * @param a 前一条。
 * @param b 后一条。
 * @returns 负数 = a 排在前面。
 */
export function byCountDesc(a: TrainableRow, b: TrainableRow): number {
  return b.n - a.n
}
