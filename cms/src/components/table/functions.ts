/**
 * table 域的纯函数:排序与类名拼装(零 DOM 零 hook,node 里可测)。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
import type { Col } from './types'

/**
 * 客户端排序(简单表数据全量在手):null 恒沉底,方向乘 dir。
 * 不改原数组(消费端可能还握着原引用)。
 *
 * @param rows 原行。
 * @param col 排序列(带 sort 取值器)。
 * @param dir 方向(1 升 -1 降)。
 * @returns 新数组。
 */
export function sortRows<T>(rows: T[], col: Col<T>, dir: 1 | -1): T[] {
  const take = col.sort
  if (!take) return rows
  return [...rows].sort((a, b) => {
    const va = take(a), vb = take(b)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return (va < vb ? -1 : va > vb ? 1 : 0) * dir
  })
}

/**
 * 类名拼装:基类 + 一串开关修饰类(假值滤掉)。
 *
 * @param base 基类。
 * @param mods 修饰类(false/undefined 不拼)。
 * @returns 空格连接的类串。
 */
export function cls(base: string, ...mods: (string | false | undefined)[]): string {
  return [base, ...mods.filter(Boolean)].join(' ')
}
