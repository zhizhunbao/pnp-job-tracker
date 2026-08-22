/**
 * **签名不是我们说了算**的那几个函数 —— 交给外部库或语言运行时回调用的。
 *
 * 🔴 收进来的门槛只有一条:**签名由外部库或语言定死**。「我懒得改」不算 ——
 * 这里关掉的只有 `one-parameter` 与 `typed-signature`,注释、命名、不许匿名函数照旧管着。
 * 摆成一个文件,这个域「有几处签名不归我们管」一眼数得清,
 * 而 `functions.ts` 里「一个函数一个参数」就是**零例外**(一条规矩没有例外,人才会信它)。
 *
 * @author Frank
 * @time 2026-08-20 20:50:00
 */

import type { JobsRow } from './types'

/**
 * 在招数从多到少。并列时按省码排,保证同一次查询连查两遍结果一模一样。
 *
 * 两个参数是 `Array.prototype.sort` 定死的签名(外部规定)。
 *
 * @param a 左边那行。
 * @param b 右边那行。
 * @returns 排序比较值。
 */
export function byOpenDesc(a: JobsRow, b: JobsRow): number {
  return b.open - a.open || a.prov.localeCompare(b.prov)
}
