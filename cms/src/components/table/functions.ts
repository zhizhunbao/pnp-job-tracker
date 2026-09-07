/**
 * table 域的纯函数:排序、类名拼装与单元格取值(零 DOM 零 hook,node 里可测),
 * 外加表头那几枚事件手柄的工厂(2026-08-26「tsx 组件体内不许声明内嵌函数」自 TableHead 迁入)。
 * 2026-09-06 序列表批补尾段:列过滤与折线图的几何(指数换算、上下界、坐标与路径)——
 * tsx 只摆 JSX,算数全在这里,测试直接照着算。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
import {
  CLS_SEP, EMPTY_MARK, SERIES_BOX_SEP, SERIES_CHART_H, SERIES_CHART_W, SERIES_COLOR_FALLBACK, SERIES_COLORS,
  SERIES_GRID_MAX_LINES, SERIES_GRID_STEP, SERIES_GRID_STEPS, SERIES_INDEX_BASE, SERIES_LOCALE, SERIES_MIN_POINTS,
  SERIES_PAD_B, SERIES_PAD_L, SERIES_PAD_R,
  SERIES_PAD_T, SERIES_PATH_GAP, SERIES_PATH_LINE, SERIES_PATH_MOVE, SERIES_RANGE_ALL, SERIES_RANGE_MORE, SERIES_ROUND,
} from './constants'
import type {
  BoundsIn, CellIn, ClickFn, Col, GridIn, GripFn, GripIn, HeadClickIn, PlotLineIn, PointLabelsIn, RawPointsIn,
  SeriesBounds, SeriesDot, SeriesGrid, SeriesLine, SeriesLinesIn, SeriesPathIn, SeriesPlot, SeriesPlotIn,
  SeriesRawLine, SeriesRawPoint, SeriesTick, ShownColsIn, SortRowsIn, TicksIn, WidthStyleIn, XAtIn, YAtIn,
} from './types'

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

/**
 * 表态该显哪些列(2026-09-06 序列表):不是时间点的列(指标名这类)一律留下,
 * 时间点列按时间窗切 —— 「近 N 期」只留末 N 个,「全部」全留。
 * 不是序列表(没传 series)原样返回,连数组身份都不换:换了 useRows 会当成数据变了回第一页。
 *
 * @param x 全部列、序列声明与当前时间窗。
 * @returns 要渲的列。
 */
export function shownColsOf<T>(x: ShownColsIn<T>): Col<T>[] {
  if (x.series == null) {
    return x.cols
  }
  let count = x.series.recent
  if (x.range === SERIES_RANGE_MORE || x.range === SERIES_RANGE_ALL) {
    count = x.series.more
  }
  const keep = x.series.pointKeys.slice(-count)
  const out: Col<T>[] = []
  for (const c of x.cols) {
    if (x.series.pointKeys.includes(c.key) === false || keep.includes(c.key)) {
      out.push(c)
    }
  }
  return out
}

/**
 * 趋势态的 x 轴刻度文本:按 pointKeys 取各点列的 label。
 * label 是 ReactNode(调用方可能塞了两行 JSX),取不到纯文本就退回列 key ——
 * x 轴一格只放得下一个词,拿 key 也比渲一坨节点强。
 *
 * @param x 全部列与时间点列的 key。
 * @returns 与 pointKeys 同序的刻度文本。
 */
export function pointLabelsOf<T>(x: PointLabelsIn<T>): string[] {
  const out: string[] = []
  for (const key of x.pointKeys) {
    let text = key
    for (const c of x.cols) {
      if (c.key === key && typeof c.label === 'string') {
        text = c.label
      }
    }
    out.push(text)
  }
  return out
}

/**
 * 把一批行画成一张图:先洗成指数线,再按上下界落到画布坐标上。
 * 指数而不是原值 —— 理由见 SERIES_INDEX_BASE 的注释。
 *
 * @param x 刻度文本、时间点 key、行与两枚取值器。
 * @returns 画布数据(tsx 只负责摆成 JSX)。
 */
export function seriesPlotOf<T>(x: SeriesPlotIn<T>): SeriesPlot {
  const lines = seriesLinesOf({ pointKeys: x.pointKeys, rows: x.rows, valueOf: x.valueOf, labelOf: x.labelOf })
  const bounds = boundsOf({ lines })
  const count = x.pointKeys.length
  const plotted: SeriesLine[] = []
  let at = 0
  for (const line of lines) {
    plotted.push(plotLineOf({ line, at, bounds, count }))
    at = at + 1
  }
  const viewBox = [0, 0, SERIES_CHART_W, SERIES_CHART_H].join(SERIES_BOX_SEP)
  return {
    viewBox,
    lines: plotted,
    grid: gridOf({ bounds }),
    ticks: ticksOf({ pointLabels: x.pointLabels }),
    left: SERIES_PAD_L,
    right: SERIES_CHART_W - SERIES_PAD_R,
  }
}

/**
 * 行 → 指数线:每行取各时间点的原值,首个有值点记作 100,其余按比例换算。
 * 有值点不足两个的行不出线(一个点连不成线);首个有值点是 0 的行也不出线
 * —— 除以 0 只会得出一排 Infinity,那不是「涨了很多」,是没法算。
 *
 * @param x 时间点 key、行与两枚取值器。
 * @returns 各条线(顺序同 rows,不出线的行跳过)。
 */
export function seriesLinesOf<T>(x: SeriesLinesIn<T>): SeriesRawLine[] {
  const out: SeriesRawLine[] = []
  for (const row of x.rows) {
    const raw = rawPointsOf({ row, pointKeys: x.pointKeys, valueOf: x.valueOf })
    if (raw.length < SERIES_MIN_POINTS) {
      continue
    }
    const base = raw[0]
    if (base == null || base.value === 0) {
      continue
    }
    const points: SeriesRawPoint[] = []
    for (const p of raw) {
      points.push({ key: p.key, at: p.at, value: p.value, index: p.value / base.value * SERIES_INDEX_BASE })
    }
    out.push({ label: x.labelOf(row), points })
  }
  return out
}

/**
 * 一行的有值点(按时间升序);官方没有的点不占位,只记它原本是第几个时间点。
 * 指数这一格先留 0,由 seriesLinesOf 拿首个有值点算完再填 —— 单点自己算不出指数。
 *
 * @param x 本行、时间点 key 与取值器。
 * @returns 有值点。
 */
export function rawPointsOf<T>(x: RawPointsIn<T>): SeriesRawPoint[] {
  const out: SeriesRawPoint[] = []
  let at = 0
  for (const key of x.pointKeys) {
    const v = x.valueOf(x.row, key)
    if (v != null) {
      out.push({ key, at, value: v, index: 0 })
    }
    at = at + 1
  }
  return out
}

/**
 * y 轴上下界:取所有点指数的最小最大,各自扩到 20 的整倍数。
 * 一条线都没有(或所有线都平在基准上)时给基准上下各一格 —— 空图也得有刻度,
 * 否则除以 0 的高度会把所有点画到同一行。
 *
 * @param x 全部线。
 * @returns 上下界。
 */
export function boundsOf(x: BoundsIn): SeriesBounds {
  let lo = Number.POSITIVE_INFINITY
  let hi = Number.NEGATIVE_INFINITY
  for (const line of x.lines) {
    for (const p of line.points) {
      lo = Math.min(lo, p.index)
      hi = Math.max(hi, p.index)
    }
  }
  if (Number.isFinite(lo) === false || Number.isFinite(hi) === false) {
    return {
      lo: SERIES_INDEX_BASE - SERIES_GRID_STEP, hi: SERIES_INDEX_BASE + SERIES_GRID_STEP, step: SERIES_GRID_STEP,
    }
  }
  const step = gridStepOf(hi - lo)
  const down = Math.floor(lo / step) * step
  const up = Math.ceil(hi / step) * step
  if (up === down) {
    return { lo: down - step, hi: up + step, step }
  }
  return { lo: down, hi: up, step }
}

/**
 * 按跨度挑网格步长:阶梯里第一个让网格线不超过上限的档;都超就取最大档。
 *
 * @param span 上下界跨度(指数点)。
 * @returns 步长。
 */
function gridStepOf(span: number): number {
  for (const step of SERIES_GRID_STEPS) {
    if (span / step <= SERIES_GRID_MAX_LINES - 1) {
      return step
    }
  }
  const last = SERIES_GRID_STEPS[SERIES_GRID_STEPS.length - 1]
  if (last == null) {
    return SERIES_GRID_STEP
  }
  return last
}

/**
 * 一条指数线落到画布上:逐点算坐标、拼折线路径、备好图例上的最新原值。
 *
 * @param x 线、它是第几条、上下界与时间点总数。
 * @returns 画布上的线。
 */
export function plotLineOf(x: PlotLineIn): SeriesLine {
  const dots: SeriesDot[] = []
  let last = 0
  for (const p of x.line.points) {
    dots.push({
      key: p.key,
      cx: xAtOf({ at: p.at, count: x.count }),
      cy: yAtOf({ index: p.index, bounds: x.bounds }),
      title: numTextOf(p.value),
    })
    last = p.value
  }
  return {
    label: x.line.label,
    color: colorAtOf(x.at),
    path: seriesPathOf({ dots }),
    dots,
    lastText: numTextOf(last),
  }
}

/**
 * 折线的 path d 串:第一个点抬笔移过去,其余点直线相连。
 *
 * @param x 按序落好坐标的点。
 * @returns d 串。
 */
export function seriesPathOf(x: SeriesPathIn): string {
  const parts: string[] = []
  for (const d of x.dots) {
    let cmd = SERIES_PATH_LINE
    if (parts.length === 0) {
      cmd = SERIES_PATH_MOVE
    }
    parts.push(cmd + d.cx + SERIES_PATH_GAP + d.cy)
  }
  return parts.join(SERIES_PATH_GAP)
}

/**
 * 第几个时间点 → 画布 x:折线区按时间点数等分,第一个点贴左边界、最后一个贴右边界。
 * 只有一个时间点时不分格(除以 0 会得出 NaN),直接落在左边界。
 *
 * @param x 第几个点与点总数。
 * @returns 画布 x。
 */
export function xAtOf(x: XAtIn): number {
  const span = SERIES_CHART_W - SERIES_PAD_L - SERIES_PAD_R
  const step = span / Math.max(1, x.count - 1)
  return roundOf(SERIES_PAD_L + x.at * step)
}

/**
 * 指数 → 画布 y:上界贴折线区顶、下界贴底(svg 的 y 向下增,所以是倒过来的)。
 *
 * @param x 指数与上下界。
 * @returns 画布 y。
 */
export function yAtOf(x: YAtIn): number {
  const span = SERIES_CHART_H - SERIES_PAD_T - SERIES_PAD_B
  const ratio = (x.bounds.hi - x.index) / (x.bounds.hi - x.bounds.lo)
  return roundOf(SERIES_PAD_T + ratio * span)
}

/**
 * y 轴网格:自下界到上界每 20 一根,带刻度文字。
 *
 * @param x 上下界。
 * @returns 网格线。
 */
export function gridOf(x: GridIn): SeriesGrid[] {
  const out: SeriesGrid[] = []
  let at = x.bounds.lo
  while (at <= x.bounds.hi) {
    out.push({ y: yAtOf({ index: at, bounds: x.bounds }), text: String(at) })
    at = at + x.bounds.step
  }
  return out
}

/**
 * x 轴刻度:每个时间点一格,文字取点列的 label。
 *
 * @param x 刻度文本。
 * @returns 刻度。
 */
export function ticksOf(x: TicksIn): SeriesTick[] {
  const out: SeriesTick[] = []
  let at = 0
  for (const text of x.pointLabels) {
    out.push({ x: xAtOf({ at, count: x.pointLabels.length }), text })
    at = at + 1
  }
  return out
}

/**
 * 第几条线 → 线色(配色表循环取)。
 *
 * @param at 第几条线。
 * @returns 色值。
 */
export function colorAtOf(at: number): string {
  const c = SERIES_COLORS[at % SERIES_COLORS.length]
  if (c == null) {
    return SERIES_COLOR_FALLBACK
  }
  return c
}

/**
 * 数字 → 千分位文本(图例与悬停显示的原值)。
 *
 * @param n 原值。
 * @returns 千分位文本。
 */
export function numTextOf(n: number): string {
  return n.toLocaleString(SERIES_LOCALE)
}

/**
 * 画布坐标取整到 1/10 格:不取整时一条线的 d 串里全是十几位小数(理由见 SERIES_ROUND)。
 *
 * @param v 原坐标。
 * @returns 规整后的坐标。
 */
export function roundOf(v: number): number {
  return Math.round(v * SERIES_ROUND) / SERIES_ROUND
}
