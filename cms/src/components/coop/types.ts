/**
 * coop 组件域的形状(校内板页:SSR 行 → 展示行 → 列;一参令 XxxIn)。
 * 形状本域自声明(CoopJobRow 是 lib/coop 对外行的全格照抄:亲手构造喂表格,零跨域 import)。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */

/**
 * 界面语翻译函数(与 i18n 桶 useLang 给的 t 同形,各域自抄)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * lib/coop 给的一行(全格照抄)。
 */
export type CoopJobRow = {
  /**
   * jobs.id。
   */
  id: number

  /**
   * 职位标题。
   */
  title: string

  /**
   * 雇主名。
   */
  company: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 工时词(full / part / 空串)。
   */
  empHours: string

  /**
   * 雇佣期限词(permanent / term / seasonal / 空串)。
   */
  empTerm: string

  /**
   * 发布日 YYYY-MM-DD(空串 = 没记)。
   */
  datePosted: string
}

/**
 * 校内板正文的 props(页面门 SSR 取好)。
 */
export type CoopIn = {
  /**
   * 在招帖(发布日新→旧)。
   */
  rows: CoopJobRow[]

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   */
  updatedAt: string
}

/**
 * 展示行(单元格只读算好的那一项)。
 */
export type CoopCellRow = {
  /**
   * 行身份(jobs.id 串)。
   */
  key: string

  /**
   * 详情页去处。
   */
  href: string

  /**
   * 职位标题。
   */
  title: string

  /**
   * 雇主名(空串 = 没给)。
   */
  company: string

  /**
   * 省名(界面语言,lib/location provName;没有给空串)。
   */
  provText: string

  /**
   * 城市(空串 = 没有)。
   */
  cityText: string

  /**
   * 手机卡地点文案(城市 + 「, 」+ 省名;缺哪段省哪段)。
   */
  locText: string

  /**
   * 类型文案(工时词优先译 全职 / 兼职,没有再译雇佣期限 合同 / 季节;都没有给空串)。
   */
  kindText: string

  /**
   * 发布日文案(YYYY-MM-DD)。
   */
  dateText: string

  /**
   * 操作钮的类串(mini 档,洗行时算好)。
   */
  actBtnCls: string

  /**
   * 操作钮文案(看详情)。
   */
  actText: string
}

/**
 * toCoopCellRows() 入参。
 */
export type CoopCellRowsIn = {
  /**
   * SSR 行。
   */
  rows: CoopJobRow[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * kindTextOf() / provTextOf() 入参(取词 + 一行)。
 */
export type RowTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * SSR 行。
   */
  row: CoopJobRow
}

/**
 * coopColsOf() 入参。
 */
export type CoopColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * coopSubOf() 入参(副题:学校 + 系统 + 在招数)。
 */
export type CoopSubIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 在招数。
   */
  n: number
}

/**
 * useCoop() 出参:视图要的整块面板。
 */
export type CoopPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 展示行。
   */
  rows: CoopCellRow[]

  /**
   * 副题文案。
   */
  sub: string

  /**
   * 空态文案。
   */
  empty: string

  /**
   * 数据更新时刻(ISO;'' 不渲)。
   */
  updatedAt: string
}

/**
 * CoopCards 的 props。
 */
export type CoopCardsIn = {
  /**
   * 展示行。
   */
  rows: CoopCellRow[]

  /**
   * 空态文案。
   */
  empty: string
}

/**
 * CoopCard 的 props。
 */
export type CoopCardIn = {
  /**
   * 这一行。
   */
  r: CoopCellRow
}
