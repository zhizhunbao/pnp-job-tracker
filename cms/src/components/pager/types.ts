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
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」 随
 * FoldLine 立)。
 */
export type FoldT = (key: string, vars?: Record<string, string | number>) => string

/**
 * FoldLine(清单末尾的展开 / 收起两只钮)的 props。
 */
export type FoldLineIn = {
  /**
   * 取词函数(文案词条住本域常量,取词由调用方给 —— 本域不携词)。
   */
  t: FoldT

  /**
   * 量词(界面语言已取好的词,如「家」「个」「组」;英文界面给 '')。
   */
  unit: string

  /**
   * 折起来的总数(默认露的那几行之外还有几个)。
   */
  hidden: number

  /**
   * 已展开了几个(0 = 收着)。
   */
  extra: number

  /**
   * 取数中(服务器分页的清单;钮面换加载中、点了不响应)。
   */
  busy: boolean

  /**
   * 「展开」钮的手柄。
   */
  onMore: () => void

  /**
   * 「收起」钮的手柄。
   */
  onFold: () => void
}

/**
 * foldViewOf 的入参。
 */
export type FoldViewIn = {
  /**
   * 折起来的总数。
   */
  hidden: number

  /**
   * 已展开了几个。
   */
  extra: number
}

/**
 * foldViewOf 的出参:「展开」钮出哪一档、写几个,「收起」钮出不出。
 */
export type FoldView = {
  /**
   * 「展开」钮的档(FOLD_MORE_*;'' = 不出)。
   */
  more: string

  /**
   * 「展开」钮上写的个数。
   */
  n: number

  /**
   * 「收起」钮出不出(展开着才出)。
   */
  up: boolean
}

/**
 * foldMoreLabelOf 的入参。
 */
export type FoldLabelIn = {
  /**
   * 取词函数。
   */
  t: FoldT

  /**
   * 量词。
   */
  unit: string

  /**
   * 这一刻的展开态。
   */
  view: FoldView

  /**
   * 取数中。
   */
  busy: boolean
}

/**
 * useFold(浏览器端已有全量的清单)的入参。
 */
export type FoldHookIn = {
  /**
   * 折起来的总数。
   */
  hidden: number
}

/**
 * useFold 交回的面板。
 */
export type FoldPanel = {
  /**
   * 已展开了几个(调用方按它切片:默认露的行 + 前 extra 个折起来的)。
   */
  extra: number

  /**
   * 「展开」手柄(一次加 FOLD_STEP 个,封顶 hidden)。
   */
  onMore: () => void

  /**
   * 「收起」手柄(归零)。
   */
  onFold: () => void
}

/**
 * makeFoldMore 的入参。
 */
export type FoldMoreIn = {
  /**
   * 折起来的总数。
   */
  hidden: number

  /**
   * 已展开个数的写口(React setState 的更新函数形)。
   */
  setExtra: (f: (prev: number) => number) => void
}
