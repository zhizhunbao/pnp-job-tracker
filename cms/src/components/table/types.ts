/**
 * table 域的形状:列声明与 Table 的 props(Col 被 table.tsx 与 functions.ts 跨文件共用,
 * 按判据进本抽屉;2026-08-24 样张)。
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
