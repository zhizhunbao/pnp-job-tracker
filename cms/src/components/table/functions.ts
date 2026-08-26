/**
 * table 域的纯函数:排序、类名拼装与单元格取值(零 DOM 零 hook,node 里可测),
 * 外加表头那几枚事件手柄的工厂(2026-08-26「tsx 组件体内不许声明内嵌函数」自 TableHead 迁入)。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
import { CLS_SEP, EMPTY_MARK } from './constants'
import type { CellIn, ClickFn, GripFn, GripIn, HeadClickIn, SortRowsIn, WidthStyleIn } from './types'

/**
 * 客户端排序(简单表数据全量在手):null 恒沉底,方向乘 dir。
 * 不改原数组(消费端可能还握着原引用)。
 * 体内先把 sort 收成局部常量再给内层比较器用:TS 的窄化不跨函数边界,
 * 不这么收就得写 take!(禁令)。
 * 比较器 cmp 的两参一返由 Array.prototype.sort 定死(宪法钦定的豁免形态)。
 *
 * @param x 原行、排序列与方向。
 * @returns 新数组。
 */
export function sortRows<T>(x: SortRowsIn<T>): T[] {
  const maybeTake = x.col.sort
  if (maybeTake == null) {
    return x.rows
  }
  const take: (r: T) => string | number | null = maybeTake
  const dir = x.dir

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

/**
 * 造一列表头的排序点击手柄(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 自 TableHead 的循环体内迁出)。逐列手柄要闭包住自己那一格列身份,走工厂形态;
 * 不可排序的列照样发一枚,点了不动 —— 省掉调用处的分支。
 *
 * @param x 可排序位、列 key 与切排序回调。
 * @returns 挂到 th 上的 onClick。
 */
export function makeHeadClick(x: HeadClickIn): ClickFn {
  function clickHead() {
    if (x.sortable) {
      x.toggleSort(x.key)
    }
  }

  return clickHead
}

/**
 * 造一列的列宽拖手手柄(2026-08-26 同批,自 TableHead 的循环体内迁出)。
 *
 * @param x 起手拖回调与被拖的列 key。
 * @returns 挂到列分隔线上的 onPointerDown。
 */
export function makeGrip(x: GripIn): GripFn {
  function grip(e: React.PointerEvent) {
    x.startResize({ e, key: x.key })
  }

  return grip
}

/**
 * 吃掉列分隔线上的点击冒泡(拖列宽不该顺手把这一列排了序)。
 * 2026-08-26 同批,自 TableHead 体内的 stopGripClick 迁出 —— 零闭包,不必造工厂。
 * 签名由 React 的事件手柄定死。
 *
 * @param e 点击事件。
 * @returns 无。
 */
export function stopGripClick(e: React.MouseEvent) {
  e.stopPropagation()
}

/**
 * 一列的行内宽样式(2026-08-26 同批,自 TableHead 体内的 widthStyle 迁出)。
 * 列宽是拖出来/量出来的运行时数据,经 style 进是正当通道(白名单见 tablehead 头注)。
 *
 * @param x 取宽函数与本列声明。
 * @returns 带 width 的样式对象;取不到宽给空对象(交给浏览器)。
 */
export function widthStyleOf<T>(x: WidthStyleIn<T>): React.CSSProperties {
  const w = x.widthOf(x.col)
  if (w == null) {
    return {}
  }
  return { width: w }
}
