/**
 * pager 域的形状:翻页行的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * Pager 的 props。
 */
export type PagerIn = {
  /**
   * 当前页(0 起)。
   */
  page: number

  /**
   * 总页数(≤1 时不渲染导航)。
   */
  max: number

  /**
   * 左侧说明(如「共 N 条」;可省)。
   */
  note?: React.ReactNode

  /**
   * 翻页回调(参数是目标页,0 起)。
   */
  onPage: (p: number) => void
}

/**
 * 无参无返的钮点击手柄形状(前后两枚翻页钮都是这一形)。
 */
export type ClickFn = () => void

/**
 * makePagerHandles 的入参(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 原 Pager 体内的 prev/next 迁出,闭包的页码与总页数改走显式入参)。
 */
export type PagerHandlesIn = {
  /**
   * 当前页(0 起)。
   */
  page: number

  /**
   * 总页数(下一页的上界)。
   */
  max: number

  /**
   * 翻页回调(参数是目标页,0 起)。
   */
  onPage: (p: number) => void
}

/**
 * makePagerHandles 交回的两枚手柄(同一格页码,一个工厂发齐)。
 */
export type PagerHandlesOut = {
  /**
   * 上一页(不低于第 0 页)。
   */
  prev: ClickFn

  /**
   * 下一页(不高于末页)。
   */
  next: ClickFn
}

/**
 * MoreLine(「显示更多」那一行)的 props。本域不携词,两句文案由调用方取好词传进来。
 */
export type MoreLineIn = {
  /**
   * 已经显示出来的行数(0 = 空表,整行不出字)。
   */
  shown: number

  /**
   * 筛选后的总行数。
   */
  total: number

  /**
   * 下一批在途没(在途时钮禁用、钮面换占位)。
   */
  loading: boolean

  /**
   * 钮面文案(如「显示更多(还有 N 条)」)。
   */
  moreText: string

  /**
   * 全部显示完时的那句(如「已全部显示 N 个」)。
   */
  allText: string

  /**
   * 点「显示更多」。
   */
  onMore: ClickFn
}

/**
 * moreLabelOf 的入参。
 */
export type MoreLabelIn = {
  /**
   * 在途没。
   */
  loading: boolean

  /**
   * 平时的钮面文案。
   */
  label: string
}

/**
 * PageLinks 的 props(2026-09-20 站内链接批三:「显示更多」式的板没有任何指向第 2 页之后的链接,
 * 爬虫顺着页面走不到后面的行;板底补一行页码真链接,服务端按 ?page= 渲那一页)。
 */
export type PageLinksIn = {
  /**
   * 当前页(0 起;「显示更多」接过几批就是最后接上的那一页)。
   */
  page: number

  /**
   * 总页数(≤1 时整行不渲染)。
   */
  max: number

  /**
   * 列表页路径(如 `/`、`/employers`)。
   */
  path: string

  /**
   * 当前筛选的查询串(不带 `?`、不带页号;没有筛选给空串)。
   */
  query: string
}

/**
 * 页码链接行的一格。
 */
export type PageLinkItem = {
  /**
   * React key。
   */
  k: string

  /**
   * 格面文字(页码从 1 数;省略格是省略记号)。
   */
  text: string

  /**
   * 去处;'' = 不是链接(当前页与省略格)。
   */
  href: string

  /**
   * 是不是当前页。
   */
  cur: boolean
}

/**
 * pageHrefOf 的入参。
 */
export type PageHrefIn = {
  /**
   * 目标页(0 起)。
   */
  n: number

  /**
   * 列表页路径。
   */
  path: string

  /**
   * 当前筛选的查询串(不带页号)。
   */
  query: string
}
