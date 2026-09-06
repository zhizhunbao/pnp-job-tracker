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

  /**
   * 列是时间点时传它:表壳内长出「表 / 趋势」与「近 N 期 / 全部」两个开关
   * (2026-09-06 把脉页省份段契约 §4)。缺席 = 普通表,一切照旧。
   */
  series?: TableSeriesIn<T>
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

  /**
   * 表元素 ref(量总宽用):由挂 table 的组件持有并传进来 —— 混装在返回面板里
   * 会被 react-hooks/refs 把整个面板判成「渲染期读 ref」(2026-08-26 搬家)。
   */
  tableRef: React.RefObject<HTMLTableElement | null>
}

/**
 * useColWidths 交回的机器面板(量宽锁列 + 拖列宽一台机器:两者都在写同一格列宽)。
 */
export type ColWidthsOut<T> = {
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
   * 列 key 按表序(定哪些在竖线左边、哪些在右边)。
   */
  keys: string[]

  /**
   * 起手时各列的宽(px)快照。
   */
  snap: Record<string, number>

  /**
   * 写列宽的 setter(React 的 setState 形状)。
   */
  setWidths: (f: (w: Record<string, number>) => Record<string, number>) => void
}

/**
 * allExplicitOf(列宽是否全显式)的入参。
 */
export type AllExplicitIn<T> = {
  /**
   * 列声明。
   */
  cols: Col<T>[]
}

/**
 * snapOf(起手列宽快照)的入参。
 */
export type SnapIn<T> = {
  /**
   * 列声明(按表序)。
   */
  cols: Col<T>[]

  /**
   * 已拖出的像素宽。
   */
  widths: Record<string, number>

  /**
   * 表头元素表(实测宽)。
   */
  ths: Record<string, HTMLTableCellElement | null>
}

/**
 * widthsAfterDrag 的入参(拖到某处时全表列宽的算法输入)。
 */
export type DragWidthsIn = {
  /**
   * 列 key 按表序。
   */
  keys: string[]

  /**
   * 起手时各列的宽(px)快照。
   */
  snap: Record<string, number>

  /**
   * 被拖的列 key(竖线在它右边)。
   */
  key: string

  /**
   * 指针相对起手点的水平位移(px)。
   */
  delta: number
}

/**
 * pxAt(快照取宽)的入参。
 */
export type PxAtIn = {
  /**
   * 起手宽快照。
   */
  snap: Record<string, number>

  /**
   * 列 key。
   */
  key: string
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

/**
 * 无参无返的钮点击手柄形状(表头点击是这一形)。
 */
export type ClickFn = () => void

/**
 * 列宽拖手的手柄形状(指针按下即起手拖)。
 */
export type GripFn = (e: React.PointerEvent) => void

/**
 * makeHeadClick 的入参(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 原 TableHead 循环体内的 clickHead 迁出,闭包的列身份与可排序位改走显式入参)。
 */
export type HeadClickIn = {
  /**
   * 本列可不可排序(不可排序的表头点了不动)。
   */
  sortable: boolean

  /**
   * 本列的 key。
   */
  key: string

  /**
   * 点表头切排序。
   */
  toggleSort: (key: string) => void
}

/**
 * makeGrip 的入参(2026-08-26 同批:原 TableHead 循环体内的 grip 迁出)。
 */
export type GripIn = {
  /**
   * 起手拖列宽(列宽机器面板上的那一枚)。
   */
  startResize: (x: ResizeIn) => void

  /**
   * 被拖的列 key。
   */
  key: string
}

/**
 * widthStyleOf 的入参(2026-08-26 同批:原 TableHead 循环体内的 widthStyle 迁出)。
 */
export type WidthStyleIn<T> = {
  /**
   * 取本列此刻该用的宽;null = 交给浏览器。
   */
  widthOf: (col: Col<T>) => string | number | null

  /**
   * 本列声明。
   */
  col: Col<T>
}

/**
 * 序列表的声明(2026-09-06 把脉页省份段契约 §4):列是时间点的表自带
 * 「表 / 趋势」与「近 N 期 / 全部」两个开关。传了这一格,Table 才长出工具条。
 */
export type TableSeriesIn<T> = {
  /**
   * 时间点列的 key,升序;不在这张清单里的列(指标名这类)固定显示。
   */
  pointKeys: string[]

  /**
   * 取某行某个时间点的原值;null = 官方这一点没有值(不折 0)。
   */
  valueOf: (r: T, key: string) => number | null

  /**
   * 图例名(趋势态每条线的名字)。
   */
  labelOf: (r: T) => string

  /**
   * 「近 N 期」这一档显示末几列。
   */
  recent: number

  /**
   * 工具条与图上的字(桶不携词,全部由调用方经这一格给)。
   */
  words: SeriesWords
}

/**
 * 序列表要用到的字。契约 §4 把它写成 `words` 的内联对象,这里起个名字
 * 只为让每一格有地方挂注释,格与格逐字相同。
 */
export type SeriesWords = {
  /**
   * 「表」态图标钮的无障碍名(图标钮没有可读文本,读屏只能靠它)。
   */
  table: string

  /**
   * 「趋势」态图标钮的无障碍名。
   */
  chart: string

  /**
   * 「近 N 期」那一档的文字(N 由调用方填好,如「近 5 年」)。
   */
  recent: string

  /**
   * 「全部」那一档的文字。
   */
  all: string

  /**
   * 图上方那行小字(如「指数:首个有值年份 = 100」)。
   */
  indexNote: string
}

/**
 * 视图两态:表 / 趋势。
 */
export type SeriesView = 'table' | 'chart'

/**
 * 时间窗两态:近 N 期 / 全部。
 */
export type SeriesRange = 'recent' | 'all'

/**
 * useSeriesView 交回的机器面板(两个开关一台机器:都在决定「这张表现在给你看哪一段」)。
 */
export type UseSeriesViewOut = {
  /**
   * 当前视图。
   */
  view: SeriesView

  /**
   * 当前时间窗。
   */
  range: SeriesRange

  /**
   * 切到表态。
   */
  onTable: ClickFn

  /**
   * 切到趋势态。
   */
  onChart: ClickFn

  /**
   * 切到「近 N 期」。
   */
  onRecent: ClickFn

  /**
   * 切到「全部」。
   */
  onAll: ClickFn
}

/**
 * SeriesToolbar 的 props。
 */
export type SeriesToolbarIn = {
  /**
   * 当前视图(定两枚图标钮谁亮)。
   */
  view: SeriesView

  /**
   * 当前时间窗(定两档文字谁深)。
   */
  range: SeriesRange

  /**
   * 四枚钮的字。
   */
  words: SeriesWords

  /**
   * 只出两枚视图图标、不出时间窗两档(手机卡头:一行里只放得下两枚图标)。
   * 缺席 = 出全套。
   */
  rangeless?: boolean

  /**
   * 切到表态。
   */
  onTable: ClickFn

  /**
   * 切到趋势态。
   */
  onChart: ClickFn

  /**
   * 切到「近 N 期」。
   */
  onRecent: ClickFn

  /**
   * 切到「全部」。
   */
  onAll: ClickFn
}

/**
 * SeriesChart 的 props。
 */
export type SeriesChartIn<T> = {
  /**
   * 时间点列的 key,升序。
   */
  pointKeys: string[]

  /**
   * x 轴刻度文本,与 pointKeys 同序(桌面表取点列的 label,手机卡直接给期名)。
   */
  pointLabels: string[]

  /**
   * 数据行(一行一条线)。
   */
  rows: T[]

  /**
   * 取某行某点的原值;null = 没有这一点。
   */
  valueOf: (r: T, key: string) => number | null

  /**
   * 图例名。
   */
  labelOf: (r: T) => string

  /**
   * 图上要用的字(这里只读 indexNote —— 图上方那行小字)。
   */
  words: SeriesWords
}

/**
 * 一条线上的一个点(算好指数、还没落到画布上)。
 */
export type SeriesRawPoint = {
  /**
   * 点身份 = 时间点列的 key。
   */
  key: string

  /**
   * 它是第几个时间点(x 轴位置按这个数算,缺点不占位会把线画歪)。
   */
  at: number

  /**
   * 官方原值(悬停显示的就是它)。
   */
  value: number

  /**
   * 指数 = 原值 / 本行首个有值点 × 100。
   */
  index: number
}

/**
 * 一行洗成的线(有值点不足 SERIES_MIN_POINTS 的行不出线)。
 */
export type SeriesRawLine = {
  /**
   * 图例名。
   */
  label: string

  /**
   * 这一行的有值点(按时间升序)。
   */
  points: SeriesRawPoint[]
}

/**
 * y 轴的指数上下界(取到 SERIES_GRID_STEP 的整倍数)。
 */
export type SeriesBounds = {
  /**
   * 下界。
   */
  lo: number

  /**
   * 上界(恒 > lo)。
   */
  hi: number
}

/**
 * 落到画布上的一个点。
 */
export type SeriesDot = {
  /**
   * 点身份(拼 React key 用)。
   */
  key: string

  /**
   * 画布 x。
   */
  cx: number

  /**
   * 画布 y。
   */
  cy: number

  /**
   * 悬停显示的原值(千分位)。
   */
  title: string
}

/**
 * 落到画布上的一条线。
 */
export type SeriesLine = {
  /**
   * 图例名。
   */
  label: string

  /**
   * 线色(按行序自配色表取)。
   */
  color: string

  /**
   * 折线的 path d 串。
   */
  path: string

  /**
   * 线上的点。
   */
  dots: SeriesDot[]

  /**
   * 图例上跟在名字后面的最新原值(千分位)。
   */
  lastText: string
}

/**
 * 一条 y 轴网格线。
 */
export type SeriesGrid = {
  /**
   * 画布 y。
   */
  y: number

  /**
   * 刻度文本(指数值)。
   */
  text: string
}

/**
 * 一个 x 轴刻度。
 */
export type SeriesTick = {
  /**
   * 画布 x。
   */
  x: number

  /**
   * 刻度文本(点列的 label)。
   */
  text: string
}

/**
 * 一张画好的图(seriesPlotOf 的产物:tsx 只负责把它摆成 JSX)。
 */
export type SeriesPlot = {
  /**
   * 画布 viewBox。
   */
  viewBox: string

  /**
   * 各条线。
   */
  lines: SeriesLine[]

  /**
   * y 轴网格。
   */
  grid: SeriesGrid[]

  /**
   * x 轴刻度。
   */
  ticks: SeriesTick[]

  /**
   * 折线区左边界的画布 x(y 轴网格线自这里起画)。
   */
  left: number

  /**
   * 折线区右边界的画布 x。
   */
  right: number
}

/**
 * seriesPlotOf 的入参。
 */
export type SeriesPlotIn<T> = {
  /**
   * x 轴刻度文本,与 pointKeys 同序。
   */
  pointLabels: string[]

  /**
   * 时间点列的 key,升序。
   */
  pointKeys: string[]

  /**
   * 数据行。
   */
  rows: T[]

  /**
   * 取某行某点的原值;null = 没有这一点。
   */
  valueOf: (r: T, key: string) => number | null

  /**
   * 图例名。
   */
  labelOf: (r: T) => string
}

/**
 * seriesLinesOf 的入参。
 */
export type SeriesLinesIn<T> = {
  /**
   * 时间点列的 key,升序。
   */
  pointKeys: string[]

  /**
   * 数据行。
   */
  rows: T[]

  /**
   * 取某行某点的原值。
   */
  valueOf: (r: T, key: string) => number | null

  /**
   * 图例名。
   */
  labelOf: (r: T) => string
}

/**
 * rawPointsOf 的入参。
 */
export type RawPointsIn<T> = {
  /**
   * 本行。
   */
  row: T

  /**
   * 时间点列的 key,升序。
   */
  pointKeys: string[]

  /**
   * 取某行某点的原值。
   */
  valueOf: (r: T, key: string) => number | null
}

/**
 * boundsOf 的入参。
 */
export type BoundsIn = {
  /**
   * 全部线(取所有点的指数算上下界)。
   */
  lines: SeriesRawLine[]
}

/**
 * plotLineOf 的入参。
 */
export type PlotLineIn = {
  /**
   * 要落到画布上的那条线。
   */
  line: SeriesRawLine

  /**
   * 它是第几条(定颜色)。
   */
  at: number

  /**
   * y 轴上下界。
   */
  bounds: SeriesBounds

  /**
   * 一共几个时间点(定 x 步长)。
   */
  count: number
}

/**
 * xAtOf 的入参。
 */
export type XAtIn = {
  /**
   * 第几个时间点。
   */
  at: number

  /**
   * 一共几个时间点。
   */
  count: number
}

/**
 * yAtOf 的入参。
 */
export type YAtIn = {
  /**
   * 指数值。
   */
  index: number

  /**
   * y 轴上下界。
   */
  bounds: SeriesBounds
}

/**
 * seriesPathOf 的入参。
 */
export type SeriesPathIn = {
  /**
   * 按序落好坐标的点。
   */
  dots: SeriesDot[]
}

/**
 * gridOf 的入参。
 */
export type GridIn = {
  /**
   * y 轴上下界。
   */
  bounds: SeriesBounds
}

/**
 * ticksOf 的入参。
 */
export type TicksIn = {
  /**
   * x 轴刻度文本,按时间升序。
   */
  pointLabels: string[]
}

/**
 * shownColsOf 的入参。
 */
export type ShownColsIn<T> = {
  /**
   * 全部列声明。
   */
  cols: Col<T>[]

  /**
   * 序列声明;缺席 = 这张表不是序列表,列原样全显。
   */
  series?: TableSeriesIn<T>

  /**
   * 当前时间窗。
   */
  range: SeriesRange
}

/**
 * pointLabelsOf 的入参。
 */
export type PointLabelsIn<T> = {
  /**
   * 全部列声明(自里面挑点列)。
   */
  cols: Col<T>[]

  /**
   * 时间点列的 key,升序。
   */
  pointKeys: string[]
}
