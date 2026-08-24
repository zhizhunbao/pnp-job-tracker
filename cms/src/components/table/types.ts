/**
 * table 域的形状:列声明、Table 与表头件的 props、三台机器的进出口
 * (Col 被多个文件跨文件共用,按判据进本抽屉;2026-08-24 样张,同日二筛补机器契约)。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */

/**
 * 一列的声明(width/className 是 2026-08-11「全站表格并成一套」补的通用能力 ——
 * 原先五张裸 table 各自实现)。
 */
export type Col<T> = {
  /**
   * 列身份(排序态与列宽都按它记)。
   */
  key: string

  /**
   * 表头文案。
   */
  label: React.ReactNode

  /**
   * 单元格渲染;缺省取 r[key]。
   */
  render?: (r: T) => React.ReactNode

  /**
   * 排序取值器;提供才可排序。
   */
  sort?: (r: T) => string | number | null

  /**
   * 单元格不换行。
   */
  nowrap?: boolean

  /**
   * 表头 hover 提示(如「技能类获批」口径)。
   */
  thTip?: string

  /**
   * 显式列宽(百分比):给了就不进自动量宽锁列(抽选表这类固定版式)。
   */
  width?: string

  /**
   * 列级 class:窄屏藏列等交给全局层(漏斗表 .fnCol)。
   */
  className?: string

  /**
   * 数字列右对齐(漏斗/抽选表);缺省左。
   */
  align?: 'left' | 'right'
}

/**
 * Table 的 props。
 */
export type TableIn<T> = {
  /**
   * 列声明。
   */
  cols: Col<T>[]

  /**
   * 数据行(全量在手,排序/分页都在客户端)。
   */
  rows: T[]

  /**
   * 行身份取值器。
   */
  rowKey: (r: T, i: number) => string

  /**
   * 空态内容。
   */
  empty?: React.ReactNode

  /**
   * 卡内表格上方的头行(如 occupations 的通道标题行)。
   */
  header?: React.ReactNode

  /**
   * 窄屏横滚而非挤成竖排(stats 第 2 轮 #10)。
   */
  minWidth?: number

  /**
   * 传了才分页:先全量排序再切页,页脚出总数+翻页。
   */
  pageSize?: number

  /**
   * 页脚左侧总数文案(i18n 在调用方,组件不携词)。
   */
  footerNote?: React.ReactNode

  /**
   * 表体末尾的自定义行(tr,可 colSpan):漏斗表的「真实付费」尾行。
   */
  foot?: React.ReactNode

  /**
   * 表已经嵌在调用方的白卡里 → 不再套自己的卡壳(否则双层描边)。
   */
  bare?: boolean
}

/**
 * 排序态:按哪一列、什么方向;null = 未排序(回落入库序)。
 */
export type SortState = {
  /**
   * 排序列的 key。
   */
  key: string

  /**
   * 方向:1 升、-1 降。
   */
  dir: 1 | -1
} | null

/**
 * useRows 的入参。
 */
export type RowsIn<T> = {
  /**
   * 列声明(找排序取值器用)。
   */
  cols: Col<T>[]

  /**
   * 全量数据行。
   */
  rows: T[]

  /**
   * 每页行数;null = 不分页。
   */
  pageSize: number | null
}

/**
 * useRows 交回的机器面板(排序 + 分页一台机器:数据换了要回第一页)。
 */
export type RowsOut<T> = {
  /**
   * 当前页要渲的行。
   */
  paged: T[]

  /**
   * 当前排序态。
   */
  sort: SortState

  /**
   * 点表头切排序(降 → 升 → 取消 三态循环)。
   */
  toggleSort: (key: string) => void

  /**
   * 当前页码(0 起,已收在合法区间内)。
   */
  page: number

  /**
   * 总页数(≥1)。
   */
  maxPage: number

  /**
   * 翻页。
   */
  setPage: (p: number) => void
}

/**
 * useColWidths 的入参。
 */
export type ColWidthsIn<T> = {
  /**
   * 列声明(显式 width 的列不参与量宽)。
   */
  cols: Col<T>[]

  /**
   * 行数(进量宽签名:数据换了要重量)。
   */
  rowCount: number
}

/**
 * useColWidths 交回的机器面板(量宽锁列 + 拖列宽一台机器:两者都在写同一格列宽)。
 */
export type ColWidthsOut<T> = {
  /**
   * 表元素 ref(量总宽用)。
   */
  tableRef: React.RefObject<HTMLTableElement | null>

  /**
   * 收表头元素的回调 ref 工厂(量各列真实宽用)。
   */
  thRefOf: (key: string) => (el: HTMLTableCellElement | null) => void

  /**
   * 布局模式:量宽完成后锁 fixed,之前是 auto。
   */
  layout: 'auto' | 'fixed'

  /**
   * 某列此刻该用的宽(拖出来的像素 > 量出来的百分比 > 调用方显式值);null = 交给浏览器。
   */
  widthOf: (col: Col<T>) => string | number | null

  /**
   * 起手拖列宽(挂在列分隔线上)。
   */
  startResize: (x: ResizeIn) => void
}

/**
 * TableHead(表头行)的 props。
 */
export type TableHeadIn<T> = {
  /**
   * 列声明。
   */
  cols: Col<T>[]

  /**
   * 当前排序态(定箭头)。
   */
  sort: SortState

  /**
   * 点表头切排序。
   */
  toggleSort: (key: string) => void

  /**
   * 列宽机器面板(表头要挂 ref、宽、分隔线)。
   */
  widths: ColWidthsOut<T>
}

/**
 * SortMark(表头排序标记)的 props。
 */
export type SortMarkIn = {
  /**
   * 本列是否是当前排序列。
   */
  active: boolean

  /**
   * 当前方向(active=false 时不看)。
   */
  dir: 1 | -1

  /**
   * 本列可不可排序(不可排序不渲任何标记)。
   */
  sortable: boolean
}

/**
 * cellOf 的入参。
 */
export type CellIn<T> = {
  /**
   * 本行数据。
   */
  row: T

  /**
   * 本列声明。
   */
  col: Col<T>
}

/**
 * sortRows 的入参。
 */
export type SortRowsIn<T> = {
  /**
   * 原行(不改,返回新数组 —— 消费端可能还握着原引用)。
   */
  rows: T[]

  /**
   * 排序列(带 sort 取值器;没有取值器原样返回)。
   */
  col: Col<T>

  /**
   * 方向:1 升、-1 降。
   */
  dir: 1 | -1
}

/**
 * startResize 的入参。
 */
export type ResizeIn = {
  /**
   * 指针按下事件(起手位置与阻止默认行为)。
   */
  e: React.PointerEvent

  /**
   * 被拖的列 key。
   */
  key: string
}

/**
 * runResize 的入参。
 */
export type RunResizeIn = {
  /**
   * 指针按下事件。
   */
  e: React.PointerEvent

  /**
   * 被拖的列 key。
   */
  key: string

  /**
   * 起手时这一列的宽(px)。
   */
  from: number

  /**
   * 写列宽的 setter(React 的 setState 形状)。
   */
  setWidths: (f: (w: Record<string, number>) => Record<string, number>) => void
}

/**
 * measureCols 的入参。
 */
export type MeasureIn<T> = {
  /**
   * 列声明。
   */
  cols: Col<T>[]

  /**
   * 表元素(量总宽);null = 还没上屏。
   */
  table: HTMLTableElement | null

  /**
   * 表头元素表(量各列真实宽)。
   */
  ths: Record<string, HTMLTableCellElement | null>
}
