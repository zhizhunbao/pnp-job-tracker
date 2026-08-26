/**
 * table 域的纯函数:排序、类名拼装与单元格取值(零 DOM 零 hook,node 里可测)。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
import { CLS_SEP, EMPTY_MARK } from './constants'
import type { CellIn, SortRowsIn } from './types'

/**
 * 客户端排序(简单表数据全量在手):null 恒沉底,方向乘 dir。
 * 不改原数组(消费端可能还握着原引用)。
 *
 * @param x 原行、排序列与方向。
 * @returns 新数组。
 */
export function sortRows<T>(x: SortRowsIn<T>): T[] {
  const maybeTake = x.col.sort
  if (maybeTake == null) {
    return x.rows
  }
  // 收成局部常量再给内层比较器用:TS 的窄化不跨函数边界,不这么收就得写 take!(禁令)。
  const take: (r: T) => string | number | null = maybeTake
  const dir = x.dir

  // 比较器的两参一返由 Array.prototype.sort 定死(宪法钦定的豁免形态)。
  // eslint-disable-next-line local/one-parameter -- 库定死的比较器签名
  function cmp(a: T, b: T): number {
    const va = take(a)
    const vb = take(b)
    if (va == null && vb == null) {
      return 0
    }
    if (va == null) {
      return 1
    }
    if (vb == null) {
      return -1
    }
    if (va < vb) {
      return -dir
    }
    if (va > vb) {
      return dir
    }
    return 0
  }

  return [...x.rows].sort(cmp)
}

/**
 * 类名拼装:基类 + 一串开关修饰类(空值滤掉)。
 * 变参签名是这件事本身的形状(拼几个类调用方说了算),一个参数一个 type 那条
 * 在这里会把每个调用点变成造对象 —— 逐行特批。
 *
 * @param base 基类。
 * @param mods 修饰类(null/false 不拼)。
 * @returns 空格连接的类串。
 */
// eslint-disable-next-line local/one-parameter -- 变参拼类是本函数的形状,收成对象反而每处都要造壳
export function cls(base: string, ...mods: (string | false | null | undefined)[]): string {
  const out = [base]
  for (const m of mods) {
    if (m != null && m !== false && m !== '') {
      out.push(m)
    }
  }
  return out.join(CLS_SEP)
}

/**
 * 单元格内容:有 render 走 render,否则取 r[key](取不到给空值符)。
 * 行是调用方的任意形状,按 key 取值必然跨类型边界 —— 断言收在这一处。
 *
 * @param x 行与列。
 * @returns 单元格内容。
 */
export function cellOf<T>(x: CellIn<T>): React.ReactNode {
  if (x.col.render != null) {
    return x.col.render(x.row)
  }
  const bag = x.row as Record<string, unknown>
  const v = bag[x.col.key]
  if (v == null) {
    return EMPTY_MARK
  }
  return String(v)
}
