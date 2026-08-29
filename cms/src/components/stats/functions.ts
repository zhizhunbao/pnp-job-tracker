/**
 * stats 域(就业把脉统计主图)的函数:四种横轴形态各自的取数与排序、echarts option 的
 * 逐段拼装、三只库回调的工厂,以及控件手柄与副作用体。零 JSX 零 hook —— 排版归各 tsx,
 * 状态机归 hooks.ts,死值归 constants.ts。
 *
 * 红线(E8-06 起不变):计数类可跨省求和,**中位数不做跨省合并**;
 * 一张图回答「在招的是什么工作、在哪、值多少钱」(Frank「这个大图要做全,作为页面
 * 最主要的统计图之一」),簇状柱 / 缩放 / 双轴**全用 echarts 原生**(Frank「不要自己实现」),
 * 不手搓柱子与滑块。
 *
 * 2026-08-28 换装批自 charts.tsx 迁入。同批把「没挂点击回调的图把系列光标归 default」
 * 从 EChart 壳里的 option 后处理移到这里的系列构造函数 —— 后处理靠对象展开逐条改写 series,
 * 而展开一律禁(字段写全);铁律本身没变,理由挂在 constants 的 CURSOR_DEFAULT 上。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
import { BROAD_SLUGS, PROVS, PROV_NAME } from '@/lib/stats'
import { cssOf } from '@/components/css'
import {
  AXIS_LINE_STYLE, AXIS_MAX, AXIS_TICK_HIDDEN, AXIS_TYPE_CATEGORY, AXIS_TYPE_VALUE, BAR_CATEGORY_GAP,
  BAR_GAP_OVERLAP, CARD_CLS, CELL_GAP, CHAN_ALL, CHAN_EE, CHAN_PNP, CHART_CLICK_EVENT, CHART_H, CLS_SEP,
  CURSOR_DEFAULT, KEY_CAT_ALL, KEY_FS, KEY_FS_EXIT, MKT_CTL_CLS, OVERFLOW_HIDDEN,
  DIR_ASC, DIR_DESC, FIRST_SCREEN_CITY, FS_EVENT, FS_H_MIN, FS_H_PAD, G_BROAD, G_NONE, G_PROV, G_TEER,
  G_TEER_LABEL, GRID_BOTTOM_MULTI, GRID_BOTTOM_ONE, GRID_LEFT, GRID_RIGHT_MED, GRID_RIGHT_PLAIN, GRID_TOP,
  KEY_BROAD_HEAD, KEY_PROV_HEAD, LABEL_GAP, LABEL_W_MIN, LANG_KO, LANG_ZH, LEGEND_BOTTOM, LEGEND_ITEM_H,
  LEGEND_ITEM_W, LEGEND_TEXT_STYLE, LEGEND_TYPE, MARKET_API, MC_PAL, MED_AXIS_INDEX, MED_ITEM_STYLE,
  MED_LINE_STYLE, MED_SYMBOL, MED_SYMBOL_SIZE, MED_Z, MIN_JOBS_DEFAULT, MIN_JOBS_OPTS, MIN_SAMPLE_N,
  MONEY_SIGN, MONEY_SUFFIX, MONEY_UNIT, ORIENT_LANDSCAPE, PCT_FULL, PROV_MED_LINE_STYLE,
  PROV_MED_SYMBOL_SIZE, PROV_MED_Z, ROW_ALL, SERIES_BAR, SERIES_LINE, SORT_JOBS, SORT_MED, TEXT_NONE,
  TIP_B_CLOSE, TIP_B_OPEN, TIP_BR, TIP_POINTER, TIP_TEXT_STYLE, TIP_TRIGGER, VW_FALLBACK, VW_MAX, VW_PAD,
  WINDOW_RESIZE_EVENT, X_CITY, X_LABEL_COLOR, X_LABEL_FONT, X_LABEL_H, X_LABEL_LINE_H, X_LABEL_LINE_OVERFLOW,
  X_LABEL_MARGIN, X_LABEL_OVERFLOW, X_LABEL_ROTATE, X_OCC, X_PROV, Y2_OFF, Y2_POSTED, Y2_SPLIT_LINE, Y2_WAGE,
  Y_LABEL_STYLE, Y_MIN_INTERVAL, Y_SPLIT_LINE, ZOOM_BG, ZOOM_BORDER, ZOOM_BOTTOM, ZOOM_FILLER, ZOOM_H,
  ZOOM_HANDLE_STYLE, ZOOM_INSIDE, ZOOM_SLIDER, ZOOM_START, ZOOM_TEXT_STYLE,
} from './constants'
import type { CityRow, OccRow, StatRow } from '@/lib/stats'
import type {
  AliveToken, BarIn, BodyIn, BodySpanIn, BroadSelectOptsIn, BroadSetIn, CellLabelIn, ChanHitIn, ChanKey,
  ChanSetIn, ChannelsIn, ChartClickEvent, ChartDisposeIn, ChartDrawIn, CityHitIn, CityNameIn, CitySortKeyIn,
  CleanupEffectFn, CleanupFn, ClickFn, ClickSyncIn, DataZoomOfIn, DrawIntoIn, EffectFn, EnterFsIn,
  FetchMarketIn, FilterCountIn, FineOptsIn, FineSetIn, FsElIn, FsToggleAtIn, FsWatchIn, GridOfIn, GroupKey,
  GroupOfIn, GroupSetIn, LabelIntervalFn, LabelIntervalIn, LabelWidthIn, LegendOfIn, MarketBody, MarketData,
  MarketLoadIn, MarketOptionIn, MedLineIn, MedList, MedNameIn, MedPickIn, MidOptsIn, MidSetIn, MinJobsSetIn,
  MoneyAxisLabelFn, MoneyIn, MoreToggleIn, NatlOccIn, NullLastIn, NumListIn, NumOrZeroIn, OccHitIn, OccListIn,
  OccNameIn, OccSortKeyIn, OccSortedIn, OrientLock, PalAtIn, ProvAtIn, ProvCell, ProvCellAtIn, ProvCellIn,
  ChartHeightIn, ChartOption, ClickableIn, EmptyOfIn, FsKeyIn, GroupOptsIn, LabelOptsIn, MarketPanel,
  MarketPanelOfIn,
  OnIn, PseudoIn, PseudoSetIn, WithAllIn, ProvCellMap,
  ProvCellMapIn, ProvCells, ProvCellsIn, ProvLabelIn, ProvSeriesIn, ProvSortKeyIn, PushRowIn, SelectChangeFn,
  SelectOpt, SeriesOfIn, SortBy, SortBySetIn, SortDir, SortDirSetIn, SortOptsIn, StatCellIn, StatJobsIn,
  StatRowIn, TextListIn, TipFormatterFn, TipFormatterIn, TipHeadIn, TipItem, TipItemsIn, TipJobsIn, TipMedIn,
  ToMarketDataIn, TooltipOfIn, WindowEndIn, WordHitIn, XAxisOfIn, XKey, XKeySetIn, Y2Key, Y2SetIn, YAxisOfIn,
} from './types'
import css from './stats.module.css'

/**
 * 一张图的完整 echarts option。横轴三切换(职业 / 省份 / 城市)× 簇内四选 × 右轴叠中位年薪,
 * 由 marketBodyOf 先算出画什么,这里只把每一段拼起来。
 *
 * @param x 画什么、取词函数、出不出右轴与中位线的名字。
 * @returns 交给 echarts 的 option。
 */
export function marketOptionOf(x: MarketOptionIn): ChartOption {
  const multi = x.body.series.length > 1
  let span = 1
  if (x.body.provMed.length > 0) {
    span = PROVS.length + 1
  }
  const labelW = labelWidthOf({ axisLen: x.body.axis.length, span, end: x.body.end })
  return {
    tooltip: tooltipOf({ formatter: tipFormatterOf(x) }),
    legend: legendOf({ multi }),
    grid: gridOf({ multi, showMed: x.showMed }),
    xAxis: xAxisOf({ axis: x.body.axis, labelW, interval: intervalOf({ body: x.body, span }) }),
    yAxis: yAxisOf({ showMed: x.showMed }),
    dataZoom: dataZoomOf({ end: x.body.end }),
    series: seriesOf({ body: x.body, showMed: x.showMed, medName: x.medName }),
  }
}

/**
 * 分省形态才要的 tooltip 合成函数(其余形态用 echarts 默认的逐行铺法)。
 *
 * @param x 画什么、取词函数与中位线的名字。
 * @returns 合成函数;null = 这一形态不需要。
 */
function tipFormatterOf(x: MarketOptionIn): TipFormatterFn | null {
  if (x.body.provMed.length === 0) {
    return null
  }
  return makeTipFormatter({
    cellTitles: x.body.cellTitles,
    jobsLabel: x.t('stats.openJobs'),
    medName: x.medName,
  })
}

/**
 * 分省形态才要的横轴标签出没判定:只在每组中间那格出标签,其余格**根本不渲染**。
 * 空串会占满 width 的盒子 → 与相邻盒子相交 → hideOverlap 连真名字一起隐掉
 * (2026-07-28 两次实拍教训)。
 *
 * @param x 画什么与一个组占几格。
 * @returns 判定函数;null = 每格都出。
 */
function intervalOf(x: BodySpanIn): LabelIntervalFn | null {
  if (x.body.provMed.length === 0) {
    return null
  }
  return makeLabelInterval({ span: x.span, at: PROVS.length >> 1 })
}

/**
 * tooltip 那一段。分省时同一个省有柱也有线 → 合成一行「省名 岗数 中位年薪」,不铺成 20 行。
 *
 * @param x 分省形态的合成函数;null = 用默认铺法。
 * @returns tooltip 配置。
 */
function tooltipOf(x: TooltipOfIn): object {
  if (x.formatter == null) {
    return {
      trigger: TIP_TRIGGER,
      axisPointer: TIP_POINTER,
      confine: true,
      textStyle: TIP_TEXT_STYLE,
    }
  }
  return {
    trigger: TIP_TRIGGER,
    axisPointer: TIP_POINTER,
    confine: true,
    textStyle: TIP_TEXT_STYLE,
    formatter: x.formatter,
  }
}

/**
 * 图例那一段(单系列不出 —— 一条线的图例是废话)。
 *
 * @param x 是不是多系列。
 * @returns 图例配置。
 */
function legendOf(x: LegendOfIn): object {
  return {
    show: x.multi,
    type: LEGEND_TYPE,
    bottom: LEGEND_BOTTOM,
    itemWidth: LEGEND_ITEM_W,
    itemHeight: LEGEND_ITEM_H,
    textStyle: LEGEND_TEXT_STYLE,
  }
}

/**
 * 绘图区那一段(containLabel 让 echarts 自己按标签实际占位留边距)。
 *
 * @param x 是不是多系列、出不出右轴。
 * @returns grid 配置。
 */
function gridOf(x: GridOfIn): object {
  let right = GRID_RIGHT_PLAIN
  if (x.showMed) {
    right = GRID_RIGHT_MED
  }
  let bottom = GRID_BOTTOM_ONE
  if (x.multi) {
    bottom = GRID_BOTTOM_MULTI
  }
  return {
    left: GRID_LEFT,
    right,
    top: GRID_TOP,
    bottom,
    containLabel: true,
  }
}

/**
 * 横轴那一段。折行 / 截断 / 留白全走 echarts 原生(Frank「echart 本身就有这个功能」):
 * overflow:'break' 折行、height + lineOverflow:'truncate' 封顶三行、grid.containLabel 自动留边距;
 * 挤不下的由 hideOverlap 隐掉,拉 dataZoom 放大就全出来。
 *
 * @param x 各格标签、标签盒宽与出没判定。
 * @returns 横轴配置(echarts 收数组)。
 */
function xAxisOf(x: XAxisOfIn): object[] {
  let interval: LabelIntervalFn | number = 0
  if (x.interval != null) {
    interval = x.interval
  }
  return [{
    type: AXIS_TYPE_CATEGORY,
    data: x.axis,
    axisTick: AXIS_TICK_HIDDEN,
    axisLine: AXIS_LINE_STYLE,
    axisLabel: {
      fontSize: X_LABEL_FONT,
      color: X_LABEL_COLOR,
      rotate: X_LABEL_ROTATE,
      hideOverlap: true,
      interval,
      width: x.labelW,
      overflow: X_LABEL_OVERFLOW,
      height: X_LABEL_H,
      lineOverflow: X_LABEL_LINE_OVERFLOW,
      lineHeight: X_LABEL_LINE_H,
      margin: X_LABEL_MARGIN,
    },
  }]
}

/**
 * 两根纵轴那一段:左=岗数(柱)、右=中位年薪(线)。量纲差两个数量级,
 * 同轴会把薪资线压成一条平线。
 *
 * @param x 出不出右轴。
 * @returns 纵轴配置(echarts 收数组)。
 */
function yAxisOf(x: YAxisOfIn): object[] {
  return [
    {
      type: AXIS_TYPE_VALUE,
      minInterval: Y_MIN_INTERVAL,
      splitLine: Y_SPLIT_LINE,
      axisLabel: Y_LABEL_STYLE,
    },
    {
      type: AXIS_TYPE_VALUE,
      show: x.showMed,
      splitLine: Y2_SPLIT_LINE,
      axisLabel: {
        fontSize: Y_LABEL_STYLE.fontSize,
        color: Y_LABEL_STYLE.color,
        formatter: makeMoneyAxisLabel(),
      },
    },
  ]
}

/**
 * 缩放那一段:图内滚轮 + 图底滑块两件,初窗右端由各形态自己算。
 *
 * @param x 初窗的右端。
 * @returns dataZoom 配置(echarts 收数组)。
 */
function dataZoomOf(x: DataZoomOfIn): object[] {
  return [
    { type: ZOOM_INSIDE, start: ZOOM_START, end: x.end },
    {
      type: ZOOM_SLIDER,
      start: ZOOM_START,
      end: x.end,
      height: ZOOM_H,
      bottom: ZOOM_BOTTOM,
      borderColor: ZOOM_BORDER,
      backgroundColor: ZOOM_BG,
      fillerColor: ZOOM_FILLER,
      handleStyle: ZOOM_HANDLE_STYLE,
      textStyle: ZOOM_TEXT_STYLE,
    },
  ]
}

/**
 * 系列那一段:柱在前,中位线(分省的那根细线或整图那根粗线)追在后面。
 *
 * @param x 画什么、出不出中位线与它的名字。
 * @returns 系列清单。
 */
function seriesOf(x: SeriesOfIn): object[] {
  if (x.showMed === false) {
    return x.body.series
  }
  if (x.body.provMed.length > 0) {
    return x.body.series.concat(x.body.provMed)
  }
  return x.body.series.concat([medLineOf({ name: x.medName, data: x.body.med })])
}

/**
 * 按当前横轴档算出这张图画什么(轴、系列、中位线、首屏窗)。
 *
 * @param x 四份数据与全部筛选、排序、语言现值。
 * @returns 画什么。
 */
export function marketBodyOf(x: BodyIn): MarketBody {
  if (x.xKey === X_OCC) {
    if (x.group === G_PROV) {
      return occProvBodyOf(x)
    }
    return occBodyOf(x)
  }
  if (x.xKey === X_CITY) {
    return cityBodyOf(x)
  }
  return provBodyOf(x)
}

/**
 * 横轴=职业、不分组:一根柱一个职业。
 *
 * @param x 四份数据与全部筛选、排序、语言现值。
 * @returns 画什么。
 */
function occBodyOf(x: BodyIn): MarketBody {
  const ks = occSortedOf({ natl: natlOccOf({ occ: x.occ }), body: x })
  const axis: string[] = []
  const med: MedList = []
  const jobs: MedList = []
  for (const o of ks) {
    axis.push(occNameOf({ occ: o, lang: x.lang }))
    med.push(medPickOf({
      y2: x.y2,
      medWage: o.medianWageAnnual,
      medPost: o.medianSalaryAnnual,
      sampleN: o.salaryN,
    }))
    jobs.push(o.openJobs)
  }
  return {
    axis,
    series: [barOf({ name: x.t('stats.openJobs'), data: jobs, index: 0 })],
    med,
    provMed: [],
    cellTitles: [],
    end: windowEndOf({ visible: x.firstScreen, total: ks.length }),
  }
}

/**
 * 横轴=职业、簇内=省份。岗数与中位年薪**都按省取**(Frank「每个省的中位薪资还不一样」),
 * 中位连成**一根线穿过每一根柱**(Frank「簇内的柱子要画薪资线,整个是一根线」)。
 *
 * 关键是**数据形状**,不是画法(Frank「echart 没有对应的图表,我们直接填数就完事了吗」——对)。
 * 前两版拿「一个类目=一个职业」的形状,再手算「簇内第 j 根柱」的小数偏移去摆点:
 * 类目轴不做插值 → 点全归到格心叠成竖线;改挂隐藏数值轴后又与 dataZoom 的取窗对不齐 → 跑偏。
 * 定稿改成 **一个类目 = 一根柱**(职业×省,每组末尾插一个空类目当簇间距):
 * 线与柱共用同一根类目轴,对齐是天生的,零偏移计算、零第二轴。
 *
 * @param x 四份数据与全部筛选、排序、语言现值。
 * @returns 画什么。
 */
function occProvBodyOf(x: BodyIn): MarketBody {
  const ks = occSortedOf({ natl: natlOccOf({ occ: x.occ }), body: x })
  const cells = provCellMapOf({ occ: x.occ, y2: x.y2 })
  const laid = provCellsOf({ ks, cells, t: x.t, lang: x.lang })
  const series: object[] = []
  for (let pi = 0; pi < PROVS.length; pi += 1) {
    const data = laid.data[pi]
    if (data != null) {
      const name = provLabelOf({ t: x.t, prov: provAtOf({ index: pi }) })
      series.push(provBarOf({ name, data, index: pi }))
    }
  }
  return {
    axis: laid.axis,
    series,
    med: laid.med,
    provMed: [provMedLineOf({ name: x.medName, data: laid.med })],
    cellTitles: laid.cellTitles,
    end: windowEndOf({ visible: x.firstScreen * (PROVS.length + 1), total: laid.axis.length }),
  }
}

/**
 * 横轴=省份:一根柱一个省,簇内可再按职业大类拆(城市 × 大类要再切一层聚合,
 * 数据层没有 → 那一档只给不分组)。
 *
 * @param x 四份数据与全部筛选、排序、语言现值。
 * @returns 画什么。
 */
function provBodyOf(x: BodyIn): MarketBody {
  const ps = provSortedOf(x)
  const axis: string[] = []
  const med: MedList = []
  for (const p of ps) {
    axis.push(provLabelOf({ t: x.t, prov: p }))
    med.push(provMedOf({ cell: statCellOf({ rows: x.rows, prov: p, broad: ROW_ALL }), y2: x.y2 }))
  }
  return {
    axis,
    series: provSeriesOf({ body: x, ps }),
    med,
    provMed: [],
    cellTitles: [],
    end: PCT_FULL,
  }
}

/**
 * 横轴=城市:一根柱一个城市(城市没有大类维度,恒不分组)。
 *
 * @param x 四份数据与全部筛选、排序、语言现值。
 * @returns 画什么。
 */
function cityBodyOf(x: BodyIn): MarketBody {
  const cs = citySortedOf(x)
  const axis: string[] = []
  const med: MedList = []
  const jobs: MedList = []
  for (const c of cs) {
    axis.push(cityNameOf({ city: c, lang: x.lang }))
    med.push(medPickOf({
      y2: x.y2,
      medWage: c.medianWageAnnual,
      medPost: c.medianSalaryAnnual,
      sampleN: c.salaryN,
    }))
    jobs.push(c.openJobs)
  }
  return {
    axis,
    series: [barOf({ name: x.t('stats.openJobs'), data: jobs, index: 0 })],
    med,
    provMed: [],
    cellTitles: [],
    end: windowEndOf({ visible: FIRST_SCREEN_CITY, total: cs.length }),
  }
}

/**
 * 横轴=省份时的柱系列:不分组一条,按大类分组则一个大类一条。
 *
 * @param x 全部现值与已排好的省序。
 * @returns 系列清单。
 */
function provSeriesOf(x: ProvSeriesIn): object[] {
  if (x.body.group !== G_BROAD) {
    const jobs: MedList = []
    for (const p of x.ps) {
      jobs.push(provJobsOf({ rows: x.body.rows, prov: p, broad: ROW_ALL }))
    }
    return [barOf({ name: x.body.t('stats.openJobs'), data: jobs, index: 0 })]
  }
  const series: object[] = []
  const cats = broadNamesOf()
  for (let i = 0; i < cats.length; i += 1) {
    const b = cats[i]
    if (b != null) {
      const jobs: MedList = []
      for (const p of x.ps) {
        jobs.push(provJobsOf({ rows: x.body.rows, prov: p, broad: b }))
      }
      series.push(barOf({ name: x.body.t(KEY_BROAD_HEAD + b), data: jobs, index: i }))
    }
  }
  return series
}

/**
 * 一格「某省某大类」的在招岗数(查不到当 0 —— 这一格是柱高,没这个组合就是没有柱)。
 *
 * @param x 统计行、省码与大类名。
 * @returns 在招岗数。
 */
function provJobsOf(x: StatCellIn): number {
  return numOrZeroOf({ value: statJobsOf({ cell: statCellOf(x) }) })
}

/**
 * 一行统计的在招岗数(行本身可能查不到)。
 *
 * @param x 一行统计;null = 没这一行。
 * @returns 在招岗数;null = 没这一行或库里这一格没数。
 */
function statJobsOf(x: StatJobsIn): number | null {
  if (x.cell == null) {
    return null
  }
  return x.cell.openJobs
}

/**
 * 横轴=省份时那一格的中位年薪。样本量这里用**在招岗数**(省级行没有单列的薪资样本量),
 * 这是 2026-07-28 起的既有口径,原样保留。
 *
 * @param x 该省全大类那一行与当前右轴档。
 * @returns 中位年薪;null = 这一格没有可信的中位数。
 */
function provMedOf(x: StatRowIn): number | null {
  if (x.cell == null) {
    return medPickOf({ y2: x.y2, medWage: null, medPost: null, sampleN: null })
  }
  return medPickOf({
    y2: x.y2,
    medWage: x.cell.medianWageAnnual,
    medPost: x.cell.medianSalaryAnnual,
    sampleN: x.cell.openJobs,
  })
}

/**
 * 分省形态下按格摊平的四列。**一个类目 = 一根柱**(职业×省),每组末尾插一格簇间距;
 * 职业名只标在本组中间那格,簇间距那格全空 —— connectNulls 让中位线跨过去,全图仍是连续一根。
 *
 * @param x 已筛好排好的职业行、省份查表、取词函数与界面语言。
 * @returns 摊平后的四列。
 */
function provCellsOf(x: ProvCellsIn): ProvCells {
  const axis: string[] = []
  const med: MedList = []
  const cellTitles: (string | null)[] = []
  const data: MedList[] = []
  for (const _prov of PROVS) {
    data.push([])
  }
  const mid = PROVS.length >> 1
  for (const o of x.ks) {
    const occName = occNameOf({ occ: o, lang: x.lang })
    for (let pi = 0; pi < PROVS.length; pi += 1) {
      const prov = provAtOf({ index: pi })
      const cell = provCellAtOf({ cells: x.cells, noc: o.noc, prov })
      axis.push(cellLabelOf({ name: occName, at: pi, mid }))
      med.push(cellMedOf({ cell }))
      cellTitles.push(occName + CELL_GAP + provLabelOf({ t: x.t, prov }))
      pushRowOf({ data, at: pi, value: cellJobsOf({ cell }) })
    }
    axis.push(TEXT_NONE)
    med.push(null)
    cellTitles.push(null)
    pushRowOf({ data, at: -1, value: 0 })
  }
  return { axis, med, cellTitles, data }
}

/**
 * 往每个省那一列里各推一格:只有第 at 个省推真值,其余推 null(每个省只在自己那格有柱)。
 * at = -1 时全推 null,那是簇间距那一格。
 *
 * @param x 各省的列、这一格属于第几个省、这一格的柱高。
 * @returns 无。
 */
function pushRowOf(x: PushRowIn): void {
  for (let qi = 0; qi < x.data.length; qi += 1) {
    const col = x.data[qi]
    if (col != null) {
      if (qi === x.at) {
        col.push(x.value)
      } else {
        col.push(null)
      }
    }
  }
}

/**
 * 这一格的横轴标签:职业名只标在本组中间那格,其余格是空串。
 *
 * @param x 职业名、这一格属于第几个省、本组中间是第几个。
 * @returns 标签文本。
 */
function cellLabelOf(x: CellLabelIn): string {
  if (x.at === x.mid) {
    return x.name
  }
  return TEXT_NONE
}

/**
 * 查一格「某职业某省」的两个数。
 *
 * @param x 查表、NOC 码与省码。
 * @returns 那一格;null = 这个组合没有数据。
 */
function provCellAtOf(x: ProvCellAtIn): ProvCell | null {
  const byProv = x.cells.get(x.noc)
  if (byProv == null) {
    return null
  }
  const cell = byProv.get(x.prov)
  if (cell == null) {
    return null
  }
  return cell
}

/**
 * 一格的柱高(这个组合没有数据就是 0 —— 该省这个职业没在招)。
 *
 * @param x 那一格;null = 没有数据。
 * @returns 柱高。
 */
function cellJobsOf(x: ProvCellIn): number {
  if (x.cell == null) {
    return 0
  }
  return x.cell.jobs
}

/**
 * 一格的中位年薪。
 *
 * @param x 那一格;null = 没有数据。
 * @returns 中位年薪;null = 这一格没有可信的中位数。
 */
function cellMedOf(x: ProvCellIn): number | null {
  if (x.cell == null) {
    return null
  }
  return x.cell.med
}

/**
 * 职业 → 省 → 两个数的查表(只收各省行,全国行不进表)。
 *
 * @param x 按职业的统计行与当前右轴档。
 * @returns 查表。
 */
function provCellMapOf(x: ProvCellMapIn): ProvCellMap {
  const map: ProvCellMap = new Map()
  for (const o of x.occ) {
    if (o.province !== ROW_ALL) {
      let byProv = map.get(o.noc)
      if (byProv == null) {
        byProv = new Map()
        map.set(o.noc, byProv)
      }
      byProv.set(o.province, {
        jobs: numOrZeroOf({ value: o.openJobs }),
        med: medPickOf({
          y2: x.y2,
          medWage: o.medianWageAnnual,
          medPost: o.medianSalaryAnnual,
          sampleN: o.salaryN,
        }),
      })
    }
  }
  return map
}

/**
 * 过完筛选、排好序、截到上限的职业行。
 *
 * @param x 全国职业行与全部筛选、排序现值。
 * @returns 要画的职业行。
 */
function occSortedOf(x: OccSortedIn): OccRow[] {
  const b = x.body
  const keyword = b.query.trim().toLowerCase()
  const picked: OccRow[] = []
  for (const o of x.natl) {
    const hit = occHitOf({
      occ: o,
      lang: b.lang,
      keyword,
      minJobs: b.minJobs,
      broad: b.fBroad,
      mid: b.fMid,
      fine: b.fFine,
      chan: b.chan,
      pnpSet: b.pnpSet,
      eeSet: b.eeSet,
    })
    if (hit) {
      picked.push(o)
    }
  }
  picked.sort(function cmpOcc(l: OccRow, r: OccRow): number {
    return nullLastOf({
      left: occSortKeyOf({ occ: l, sortBy: b.sortBy, y2: b.y2 }),
      right: occSortKeyOf({ occ: r, sortBy: b.sortBy, y2: b.y2 }),
      dir: b.sortDir,
    })
  })
  return picked.slice(0, AXIS_MAX)
}

/**
 * 过完筛选、排好序、截到上限的城市行。
 *
 * @param x 全部数据与筛选、排序现值。
 * @returns 要画的城市行。
 */
function citySortedOf(x: BodyIn): CityRow[] {
  const raw = x.query.trim()
  const keyword = raw.toLowerCase()
  const picked: CityRow[] = []
  for (const c of x.city) {
    if (cityHitOf({ city: c, raw, keyword, minJobs: x.minJobs })) {
      picked.push(c)
    }
  }
  picked.sort(function cmpCity(l: CityRow, r: CityRow): number {
    return nullLastOf({
      left: citySortKeyOf({ city: l, sortBy: x.sortBy, y2: x.y2 }),
      right: citySortKeyOf({ city: r, sortBy: x.sortBy, y2: x.y2 }),
      dir: x.sortDir,
    })
  })
  return picked.slice(0, AXIS_MAX)
}

/**
 * 排好序的省码(展示序被排序按钮盖过)。
 *
 * @param x 全部数据与排序现值。
 * @returns 省码序。
 */
function provSortedOf(x: BodyIn): string[] {
  const ps = [...PROVS]
  ps.sort(function cmpProv(l: string, r: string): number {
    return nullLastOf({
      left: provSortKeyOf({ rows: x.rows, prov: l, sortBy: x.sortBy, y2: x.y2 }),
      right: provSortKeyOf({ rows: x.rows, prov: r, sortBy: x.sortBy, y2: x.y2 }),
      dir: x.sortDir,
    })
  })
  return ps
}

/**
 * 一行职业过不过当前那套筛选(搜索词按显示名 / 英文名 / NOC 码三路命中)。
 *
 * @param x 一行职业与全部筛选现值。
 * @returns 过不过。
 */
function occHitOf(x: OccHitIn): boolean {
  if (numOrZeroOf({ value: x.occ.openJobs }) < x.minJobs) {
    return false
  }
  if (x.broad !== TEXT_NONE && x.occ.broad !== x.broad) {
    return false
  }
  if (x.mid !== TEXT_NONE && x.occ.mid !== x.mid) {
    return false
  }
  if (x.fine !== TEXT_NONE && x.occ.fine !== x.fine) {
    return false
  }
  if (chanHitOf({ occ: x.occ, chan: x.chan, pnpSet: x.pnpSet, eeSet: x.eeSet }) === false) {
    return false
  }
  return wordHitOf({ occ: x.occ, lang: x.lang, keyword: x.keyword })
}

/**
 * 一行职业在不在选中的那条通道里。通道只放**职业粒度判得了**的两条:省提名具名清单、
 * 联邦 EE 类别(Frank 2026-07-28「哪些能走 ee pnp aip qc 的单独通道也需要筛选」)——
 * AIP 是雇主级、QC 数据层没清单,不假装能筛。
 *
 * @param x 一行职业、通道档与两条通道的 NOC 集。
 * @returns 在不在。
 */
function chanHitOf(x: ChanHitIn): boolean {
  if (x.chan === CHAN_ALL) {
    return true
  }
  if (x.chan === CHAN_PNP) {
    return x.pnpSet.has(x.occ.noc)
  }
  return x.eeSet.has(x.occ.noc)
}

/**
 * 一行职业命不命中搜索词(显示名 / NOC 官方英文名 / NOC 码三路)。
 *
 * @param x 一行职业、界面语言与已转小写的搜索词。
 * @returns 命不命中。
 */
function wordHitOf(x: WordHitIn): boolean {
  if (x.keyword === TEXT_NONE) {
    return true
  }
  if (occNameOf({ occ: x.occ, lang: x.lang }).toLowerCase().includes(x.keyword)) {
    return true
  }
  if (x.occ.titleEn.toLowerCase().includes(x.keyword)) {
    return true
  }
  return x.occ.noc.includes(x.keyword)
}

/**
 * 一行城市过不过当前那套筛选(英文名按小写含判,中韩文名按原样含判)。
 *
 * @param x 一行城市、两种大小写的搜索词与最低在招岗数。
 * @returns 过不过。
 */
function cityHitOf(x: CityHitIn): boolean {
  if (numOrZeroOf({ value: x.city.openJobs }) < x.minJobs) {
    return false
  }
  if (x.keyword === TEXT_NONE) {
    return true
  }
  if (x.city.city.toLowerCase().includes(x.keyword)) {
    return true
  }
  if (x.city.cityZh.includes(x.raw)) {
    return true
  }
  return x.city.cityKo.includes(x.raw)
}

/**
 * 一行职业的排序键。
 *
 * @param x 一行职业、排序主键与当前右轴档。
 * @returns 排序键;null = 这一行没有可比的数(恒排最后)。
 */
function occSortKeyOf(x: OccSortKeyIn): number | null {
  if (x.sortBy === SORT_MED) {
    return medPickOf({
      y2: x.y2,
      medWage: x.occ.medianWageAnnual,
      medPost: x.occ.medianSalaryAnnual,
      sampleN: x.occ.salaryN,
    })
  }
  return x.occ.openJobs
}

/**
 * 一行城市的排序键。
 *
 * @param x 一行城市、排序主键与当前右轴档。
 * @returns 排序键;null = 这一行没有可比的数。
 */
function citySortKeyOf(x: CitySortKeyIn): number | null {
  if (x.sortBy === SORT_MED) {
    return medPickOf({
      y2: x.y2,
      medWage: x.city.medianWageAnnual,
      medPost: x.city.medianSalaryAnnual,
      sampleN: x.city.salaryN,
    })
  }
  return x.city.openJobs
}

/**
 * 一个省的排序键。**2026-08-28 Frank 判 bug 并修**:这条轴自 2026-07-28 起按中位排序
 * 取的一直是**帖面中位**写死那一档,而职业轴与城市轴取的是右轴当前选的档 ——
 * 同一个「按中位年薪排序」按钮在三条轴上排的不是同一个数,用户切到省份轴就发现
 * 排序与线上画的那根中位线对不上。修法:三条轴同一语义,统一走 medPickOf 按右轴档取,
 * 于是排序键与这条轴画出来的那一格中位数**逐格相等**(样本量沿用省级行的在招岗数,
 * 见 provMedOf —— 省级行没有单列的薪资样本量)。
 *
 * @param x 统计行、省码、排序主键与当前右轴档。
 * @returns 排序键;null = 这个省没有可比的数。
 */
function provSortKeyOf(x: ProvSortKeyIn): number | null {
  const cell = statCellOf({ rows: x.rows, prov: x.prov, broad: ROW_ALL })
  if (cell == null) {
    return null
  }
  if (x.sortBy === SORT_MED) {
    return provMedOf({ cell, y2: x.y2 })
  }
  return cell.openJobs
}

/**
 * 排序比较器的本体:空值永远垫底(不管升降),否则「低到高」会被一堆没薪资的职业占满头部
 * (Frank 2026-07-28「加上排序按钮」时定的口径)。
 *
 * @param x 左右两个排序键与方向。
 * @returns 负数 = 左在前,正数 = 右在前。
 */
function nullLastOf(x: NullLastIn): number {
  if (x.left == null && x.right == null) {
    return 0
  }
  if (x.left == null) {
    return 1
  }
  if (x.right == null) {
    return -1
  }
  if (x.dir === DIR_DESC) {
    return x.right - x.left
  }
  return x.left - x.right
}

/**
 * 一格「某省某大类」的统计行。
 *
 * @param x 统计行、省码与大类名。
 * @returns 那一行;null = 没这个组合。
 */
function statCellOf(x: StatCellIn): StatRow | null {
  for (const r of x.rows) {
    if (r.province === x.prov && r.broad === x.broad && r.mid === ROW_ALL) {
      return r
    }
  }
  return null
}

/**
 * 全国那一档的职业行(各省行不进主图的类目轴)。
 *
 * @param x 按职业的统计行。
 * @returns 全国职业行。
 */
export function natlOccOf(x: OccListIn): OccRow[] {
  const out: OccRow[] = []
  for (const o of x.occ) {
    if (o.province === ROW_ALL) {
      out.push(o)
    }
  }
  return out
}

/**
 * 大类选项。职业分类三级(Frank 2026-07-28「过滤需要加 职业 大类 种类 小类吧」)——
 * 大→中→小逐级收窄,选项从**当前数据**里长出来,不写死清单。
 *
 * @param x 全国职业行。
 * @returns 去重排序后的大类名。
 */
export function broadOptsOf(x: NatlOccIn): string[] {
  const list: string[] = []
  for (const o of x.natl) {
    list.push(o.broad)
  }
  return uniqOf({ list })
}

/**
 * 中类选项:选了大类,只列该大类下有职业的中类。
 *
 * @param x 全国职业行与已选大类。
 * @returns 去重排序后的中类名。
 */
export function midOptsOf(x: MidOptsIn): string[] {
  const list: string[] = []
  for (const o of x.natl) {
    if (x.broad === TEXT_NONE || o.broad === x.broad) {
      list.push(o.mid)
    }
  }
  return uniqOf({ list })
}

/**
 * 小类选项:随已选大类与中类逐级收窄。
 *
 * @param x 全国职业行与已选大类、中类。
 * @returns 去重排序后的小类名。
 */
export function fineOptsOf(x: FineOptsIn): string[] {
  const list: string[] = []
  for (const o of x.natl) {
    const inBroad = x.broad === TEXT_NONE || o.broad === x.broad
    const inMid = x.mid === TEXT_NONE || o.mid === x.mid
    if (inBroad && inMid) {
      list.push(o.fine)
    }
  }
  return uniqOf({ list })
}

/**
 * 去空、去重、排序。
 *
 * @param x 文本清单。
 * @returns 去重排序后的清单。
 */
function uniqOf(x: TextListIn): string[] {
  const kept: string[] = []
  for (const s of x.list) {
    if (s !== TEXT_NONE) {
      kept.push(s)
    }
  }
  return [...new Set(kept)].sort()
}

/**
 * 职业大类的固定清单。BROAD_SLUGS 是 [slug, 大类名] 对,而库里的 broad 列存的是**大类名**,
 * 所以取的是第二项(横轴=省份、簇内=大类时按它拆系列)。
 *
 * @returns 大类名清单(剔掉空值与「不分」那一档)。
 */
function broadNamesOf(): string[] {
  const out: string[] = []
  for (const [, name] of BROAD_SLUGS) {
    if (name !== TEXT_NONE && name !== ROW_ALL) {
      out.push(name)
    }
  }
  return out
}

/**
 * 职业名按界面语言取(Frank 实拍:韩文界面轴上全是中文)。中文=本站短名,
 * 英文=NOC 官方名,韩文=noc_descriptions 的译名,缺则回退官方英文 —— 不拿中文名冒充国际化。
 *
 * @param x 一行职业与界面语言。
 * @returns 职业显示名。
 */
function occNameOf(x: OccNameIn): string {
  if (x.lang === LANG_ZH) {
    return x.occ.titleZhShort || x.occ.titleZh || x.occ.titleEn
  }
  if (x.lang === LANG_KO) {
    return x.occ.titleKo || x.occ.titleEn
  }
  return x.occ.titleEn || x.occ.titleZh
}

/**
 * 城市名按界面语言取(缺译名回退英文原名)。
 *
 * @param x 一行城市与界面语言。
 * @returns 城市显示名。
 */
function cityNameOf(x: CityNameIn): string {
  if (x.lang === LANG_ZH) {
    return x.city.cityZh || x.city.city
  }
  if (x.lang === LANG_KO) {
    return x.city.cityKo || x.city.city
  }
  return x.city.city
}

/**
 * 省名走三语键(#58 口径:界面显示全名,两字码只在幕后;译名缺了回退英文全名,再缺才出省码)。
 *
 * @param x 取词函数与省码。
 * @returns 省显示名。
 */
function provLabelOf(x: ProvLabelIn): string {
  return x.t(KEY_PROV_HEAD + x.prov) || PROV_NAME[x.prov] || x.prov
}

/**
 * 第几个省的省码(展示序由 lib/stats 的 PROVS 定)。
 *
 * @param x 第几个。
 * @returns 两位省码;'' = 越界(排不到这一格)。
 */
function provAtOf(x: ProvAtIn): string {
  const p = PROVS[x.index]
  if (p == null) {
    return TEXT_NONE
  }
  return p
}

/**
 * 配色轮盘上的第几色(超过轮盘长度取模绕回)。
 *
 * @param x 第几条系列。
 * @returns 色值。
 */
function palAtOf(x: PalAtIn): string {
  const c = MC_PAL[x.index % MC_PAL.length]
  if (c == null) {
    return TEXT_NONE
  }
  return c
}

/**
 * 右轴那一格取哪个中位数。官方档直接给;帖面档要**样本量够**才给
 * (1 个帖的「中位」不是中位),不够就留空 —— 但官方档照常有数。
 *
 * @param x 右轴档、两个中位数与帖面样本量。
 * @returns 中位年薪;null = 这一格不该出点。
 */
function medPickOf(x: MedPickIn): number | null {
  if (x.y2 === Y2_WAGE) {
    return x.medWage
  }
  if (numOrZeroOf({ value: x.sampleN }) >= MIN_SAMPLE_N) {
    return x.medPost
  }
  return null
}

/**
 * 中位线那条线的名字随右轴档走。
 *
 * @param x 取词函数与右轴档。
 * @returns 线名。
 */
export function medNameOf(x: MedNameIn): string {
  if (x.y2 === Y2_WAGE) {
    return x.t('stats.medWage')
  }
  return x.t('stats.medSalary')
}

/**
 * 年薪的显示文本(进位到千元 —— 轴上与 tooltip 里都不摆完整数字,读不动)。
 *
 * @param x 年薪。
 * @returns 「$123K」这样的文本。
 */
function moneyTextOf(x: MoneyIn): string {
  return MONEY_SIGN + Math.round(x.value / MONEY_UNIT) + MONEY_SUFFIX
}

/**
 * 库里可空的计数读成一个数(柱高与阈值比较都要一个数)。
 *
 * @param x 库里那一格。
 * @returns 计数;库里没数按 0 算。
 */
function numOrZeroOf(x: NumOrZeroIn): number {
  if (x.value == null) {
    return 0
  }
  return x.value
}

/**
 * dataZoom 初窗的右端(百分比):首屏要露几格 ÷ 一共几格,封顶百分之百。
 *
 * @param x 首屏要露几格与一共几格。
 * @returns 初窗右端。
 */
function windowEndOf(x: WindowEndIn): number {
  return Math.min(PCT_FULL, (x.visible / Math.max(x.total, 1)) * PCT_FULL)
}

/**
 * 标签盒的宽:可见类目数 → 每格宽度 → 减掉留沟。窄屏与宽屏都按实际容器算;
 * 分省时一个职业占(省数+1)个类目,所以标签宽按**组**算,不按格算。
 *
 * @param x 横轴几格、一组几格与初窗右端。
 * @returns 标签盒宽(px)。
 */
function labelWidthOf(x: LabelWidthIn): number {
  const visible = Math.max(1, Math.round(x.axisLen * (x.end / PCT_FULL) / x.span))
  return Math.max(LABEL_W_MIN, Math.floor(viewWidthOf() / visible) - LABEL_GAP)
}

/**
 * 量标签宽用的容器宽:窗口宽减掉页面留白再封顶;服务端渲染拿不到 window 时给兜底值。
 *
 * @returns 容器宽(px)。
 */
function viewWidthOf(): number {
  if (typeof window === 'undefined') {
    return VW_FALLBACK
  }
  return Math.min(window.innerWidth - VW_PAD, VW_MAX)
}

/**
 * 一条柱系列。
 *
 * @param x 系列名、每格柱高与第几条系列。
 * @returns 柱系列配置。
 */
function barOf(x: BarIn): object {
  return {
    name: x.name,
    type: SERIES_BAR,
    data: x.data,
    itemStyle: { color: palAtOf({ index: x.index }) },
    cursor: CURSOR_DEFAULT,
  }
}

/**
 * 分省形态下的一条柱系列:barGap:'-100%' = 各省系列叠在同一格里 → 每格只有一根柱,占满该格。
 *
 * @param x 系列名、每格柱高与第几条系列。
 * @returns 柱系列配置。
 */
function provBarOf(x: BarIn): object {
  return {
    name: x.name,
    type: SERIES_BAR,
    data: x.data,
    itemStyle: { color: palAtOf({ index: x.index }) },
    cursor: CURSOR_DEFAULT,
    barGap: BAR_GAP_OVERLAP,
    barCategoryGap: BAR_CATEGORY_GAP,
  }
}

/**
 * 整图那一根中位年薪线(不分省的形态用它)。
 *
 * @param x 线名与每格的中位年薪。
 * @returns 线系列配置。
 */
function medLineOf(x: MedLineIn): object {
  return {
    name: x.name,
    type: SERIES_LINE,
    yAxisIndex: MED_AXIS_INDEX,
    data: x.data,
    symbol: MED_SYMBOL,
    symbolSize: MED_SYMBOL_SIZE,
    connectNulls: true,
    z: MED_Z,
    lineStyle: MED_LINE_STYLE,
    itemStyle: MED_ITEM_STYLE,
    cursor: CURSOR_DEFAULT,
  }
}

/**
 * 分省形态那一根中位年薪线:簇间距那格没数 → connectNulls 让线跨过去,全图仍是连续一根。
 *
 * @param x 线名与每格的中位年薪。
 * @returns 线系列配置。
 */
function provMedLineOf(x: MedLineIn): object {
  return {
    name: x.name,
    type: SERIES_LINE,
    yAxisIndex: MED_AXIS_INDEX,
    data: x.data,
    symbol: MED_SYMBOL,
    symbolSize: PROV_MED_SYMBOL_SIZE,
    connectNulls: true,
    z: PROV_MED_Z,
    lineStyle: PROV_MED_LINE_STYLE,
    itemStyle: MED_ITEM_STYLE,
    cursor: CURSOR_DEFAULT,
  }
}

/**
 * 造 tooltip 的合成函数(签名由 echarts 定死:收整条类目的各项,回一段 HTML)。
 *
 * @param x 每格抬头、岗位数那一段的词与中位线的名字。
 * @returns 合成函数。
 */
function makeTipFormatter(x: TipFormatterIn): TipFormatterFn {
  return function formatTip(items: TipItem[]): string {
    const bar = firstBarOf({ items })
    const line = firstLineOf({ items })
    const head = tipHeadOf({ cellTitles: x.cellTitles, bar, line })
    if (head == null) {
      return TEXT_NONE
    }
    return TIP_B_OPEN + head + TIP_B_CLOSE + TIP_BR
      + tipJobsOf({ bar, label: x.jobsLabel })
      + tipMedOf({ line, medName: x.medName })
  }
}

/**
 * 整条类目里第一项有值的柱。
 *
 * @param x tooltip 收到的各项。
 * @returns 那一项;null = 这一格没有柱。
 */
function firstBarOf(x: TipItemsIn): TipItem | null {
  for (const it of x.items) {
    if (it.seriesType === SERIES_BAR && it.value != null) {
      return it
    }
  }
  return null
}

/**
 * 整条类目里的那一项线。
 *
 * @param x tooltip 收到的各项。
 * @returns 那一项;null = 这一格没有线。
 */
function firstLineOf(x: TipItemsIn): TipItem | null {
  for (const it of x.items) {
    if (it.seriesType === SERIES_LINE) {
      return it
    }
  }
  return null
}

/**
 * tooltip 的抬头(「职业　省」)。
 *
 * @param x 每格抬头与柱、线两项。
 * @returns 抬头;null = 这一格不出 tooltip(簇间距那格)。
 */
function tipHeadOf(x: TipHeadIn): string | null {
  let at = 0
  if (x.bar != null) {
    at = x.bar.dataIndex
  } else if (x.line != null) {
    at = x.line.dataIndex
  }
  const head = x.cellTitles[at]
  if (head == null || head === TEXT_NONE) {
    return null
  }
  return head
}

/**
 * tooltip 里岗位数那一段。
 *
 * @param x 柱那一项与岗位数的词。
 * @returns 那一段;这一格没有柱时给空串。
 */
function tipJobsOf(x: TipJobsIn): string {
  if (x.bar == null) {
    return TEXT_NONE
  }
  return x.label + CELL_GAP + x.bar.value
}

/**
 * tooltip 里中位年薪那一段(自带换行)。
 *
 * @param x 线那一项与中位线的名字。
 * @returns 那一段;这一格没有中位数时给空串。
 */
function tipMedOf(x: TipMedIn): string {
  if (x.line == null || x.line.value == null) {
    return TEXT_NONE
  }
  return TIP_BR + x.medName + CELL_GAP + moneyTextOf({ value: x.line.value })
}

/**
 * 造横轴标签的出没判定(签名由 echarts 的 axisLabel.interval 定死)。
 *
 * @param x 一个组占几格与组内第几格出标签。
 * @returns 判定函数。
 */
function makeLabelInterval(x: LabelIntervalIn): LabelIntervalFn {
  return function showLabelAt(index: number): boolean {
    return index % x.span === x.at
  }
}

/**
 * 造右轴刻度的格式化(签名由 echarts 的 axisLabel.formatter 定死)。
 *
 * @returns 格式化函数。
 */
function makeMoneyAxisLabel(): MoneyAxisLabelFn {
  return function formatMoney(v: number): string {
    return moneyTextOf({ value: v })
  }
}

/**
 * 组合合法性:一个职业只对应一个大类与一个 TEER → 横轴=职业时按它们分簇是退化图
 * (每组一根柱);城市 × 大类需再切一层聚合,数据层没有 → 只给不分组。
 * **宁可禁用,不画退化图。**
 *
 * @param x 横轴档与待判定的分组档。
 * @returns 这个组合成不成立。
 */
export function legalGroupOf(x: GroupOfIn): boolean {
  if (x.xKey === X_OCC) {
    return x.group === G_NONE || x.group === G_PROV
  }
  if (x.xKey === X_CITY) {
    return x.group === G_NONE
  }
  return true
}

/**
 * 生效的分组档:退化组合收成不分组(选择器里那一档仍然列着,只是置灰)。
 *
 * @param x 横轴档与用户选的分组档。
 * @returns 生效的分组档。
 */
export function groupOf(x: GroupOfIn): GroupKey {
  if (legalGroupOf(x)) {
    return x.group
  }
  return G_NONE
}

/**
 * 「更多筛选」里改过几格(徽标上那个数;0 = 一格没改,不出徽标)。
 *
 * @param x 六格筛选的现值。
 * @returns 改过的格数。
 */
export function filterCountOf(x: FilterCountIn): number {
  let n = 0
  if (x.chan !== CHAN_ALL) {
    n += 1
  }
  if (x.y2 !== Y2_WAGE) {
    n += 1
  }
  if (x.minJobs !== MIN_JOBS_DEFAULT) {
    n += 1
  }
  if (x.fBroad !== TEXT_NONE) {
    n += 1
  }
  if (x.fMid !== TEXT_NONE) {
    n += 1
  }
  if (x.fFine !== TEXT_NONE) {
    n += 1
  }
  return n
}

/**
 * 统计主图的整机:把现值、派生值、选项表与全部手柄摊成一件,三块视图共读。
 *
 * @param x 取词函数、十四格现值、全国职业行、生效分组档、中位线名、算好的 option 与空态。
 * @returns 整机。
 */
export function marketPanelOf(x: MarketPanelOfIn): MarketPanel {
  const s = x.state
  const catDisabled = s.xKey !== X_OCC
  return {
    t: x.t,
    empty: x.empty,
    query: s.query,
    xKey: s.xKey,
    group: x.group,
    sortBy: s.sortBy,
    sortDir: s.sortDir,
    y2: s.y2,
    chan: s.chan,
    minJobs: String(s.minJobs),
    fBroad: s.fBroad,
    fMid: s.fMid,
    fFine: s.fFine,
    more: s.more,
    filterCount: filterCountOf({
      chan: s.chan,
      y2: s.y2,
      minJobs: s.minJobs,
      fBroad: s.fBroad,
      fMid: s.fMid,
      fFine: s.fFine,
    }),
    catDisabled,
    medName: x.medName,
    xOpts: xOptsOf({ t: x.t }),
    groupOpts: groupOptsOf({ t: x.t, xKey: s.xKey }),
    sortOpts: sortOptsOf({ t: x.t, medName: x.medName }),
    dirOpts: dirOptsOf({ t: x.t }),
    y2Opts: y2OptsOf({ t: x.t }),
    chanOpts: chanOptsOf({ t: x.t }),
    broadOpts: withAllOf({
      all: x.t(KEY_CAT_ALL),
      opts: broadSelectOptsOf({ t: x.t, list: broadOptsOf({ natl: x.natl }) }),
    }),
    midOpts: withAllOf({
      all: x.t(KEY_CAT_ALL),
      opts: textOptsOf({ list: midOptsOf({ natl: x.natl, broad: s.fBroad }) }),
    }),
    fineOpts: withAllOf({
      all: x.t(KEY_CAT_ALL),
      opts: textOptsOf({ list: fineOptsOf({ natl: x.natl, broad: s.fBroad, mid: s.fMid }) }),
    }),
    minJobsOpts: numOptsOf({ list: MIN_JOBS_OPTS }),
    option: x.option,
    onQuery: s.setQuery,
    onXKey: makeXKeyChange({ setXKey: s.setXKey }),
    onGroup: makeGroupChange({ setGroup: s.setGroup }),
    onSortBy: makeSortByChange({ setSortBy: s.setSortBy }),
    dirPickOf: makeSortDirPick({ setSortDir: s.setSortDir }),
    onY2: makeY2Change({ setY2: s.setY2 }),
    onChan: makeChanChange({ setChan: s.setChan }),
    onBroad: makeBroadChange({ setFBroad: s.setFBroad, setFMid: s.setFMid, setFFine: s.setFFine }),
    onMid: makeMidChange({ setFMid: s.setFMid, setFFine: s.setFFine }),
    onFine: makeFineChange({ setFFine: s.setFFine }),
    onMinJobs: makeMinJobsChange({ setMinJobs: s.setMinJobs }),
    onMore: makeMoreToggle({ more: s.more, setMore: s.setMore }),
  }
}

/**
 * 横轴档的选项表。
 *
 * @param x 取词函数。
 * @returns 三档选项。
 */
function xOptsOf(x: LabelOptsIn): SelectOpt[] {
  return [
    { value: X_OCC, label: x.t('mkt.x.occ') },
    { value: X_PROV, label: x.t('mkt.x.prov') },
    { value: X_CITY, label: x.t('mkt.x.city') },
  ]
}

/**
 * 分组档的选项表(退化组合仍然列出来但置灰,不画退化图)。
 *
 * @param x 取词函数与当前横轴档。
 * @returns 四档选项。
 */
function groupOptsOf(x: GroupOptsIn): SelectOpt[] {
  return [
    { value: G_NONE, label: x.t('mkt.g.none'), disabled: legalGroupOf({ xKey: x.xKey, group: G_NONE }) === false },
    { value: G_PROV, label: x.t('mkt.g.prov'), disabled: legalGroupOf({ xKey: x.xKey, group: G_PROV }) === false },
    {
      value: G_BROAD,
      label: x.t('mkt.g.broad'),
      disabled: legalGroupOf({ xKey: x.xKey, group: G_BROAD }) === false,
    },
    { value: G_TEER, label: G_TEER_LABEL, disabled: legalGroupOf({ xKey: x.xKey, group: G_TEER }) === false },
  ]
}

/**
 * 排序主键的选项表。
 *
 * @param x 取词函数与中位线的名字。
 * @returns 两档选项。
 */
function sortOptsOf(x: SortOptsIn): SelectOpt[] {
  return [
    { value: SORT_JOBS, label: x.t('stats.openJobs') },
    { value: SORT_MED, label: x.medName },
  ]
}

/**
 * 排序方向的两档(挤成一组的分段钮,不是下拉)。
 *
 * @param x 取词函数。
 * @returns 两档选项。
 */
function dirOptsOf(x: LabelOptsIn): SelectOpt[] {
  return [
    { value: DIR_DESC, label: x.t('mkt.sort.desc') },
    { value: DIR_ASC, label: x.t('mkt.sort.asc') },
  ]
}

/**
 * 右轴档的选项表。
 *
 * @param x 取词函数。
 * @returns 三档选项。
 */
function y2OptsOf(x: LabelOptsIn): SelectOpt[] {
  return [
    { value: Y2_WAGE, label: x.t('stats.medWage') },
    { value: Y2_POSTED, label: x.t('stats.medSalary') },
    { value: Y2_OFF, label: x.t('mkt.y2.off') },
  ]
}

/**
 * 通道筛选的选项表。
 *
 * @param x 取词函数。
 * @returns 三档选项。
 */
function chanOptsOf(x: LabelOptsIn): SelectOpt[] {
  return [
    { value: CHAN_ALL, label: x.t('mkt.chan.all') },
    { value: CHAN_PNP, label: x.t('mkt.chan.pnp') },
    { value: CHAN_EE, label: x.t('mkt.chan.ee') },
  ]
}

/**
 * 图的高度:全屏时撑满视口高(留一线余量、不低于下限),退出自动还原常规档。
 *
 * @param x 全屏态与视口高度。
 * @returns 图高(px)。
 */
export function chartHeightOf(x: ChartHeightIn): number {
  if (x.fs) {
    return Math.max(FS_H_MIN, x.vh - FS_H_PAD)
  }
  return CHART_H
}

/**
 * 数据层没落地 → 整块不渲(红线:查不到不出空壳)。
 *
 * @param x 职业行与城市行。
 * @returns 是不是一份数据都没有。
 */
export function emptyOf(x: EmptyOfIn): boolean {
  return x.occ.length === 0 && x.city.length === 0
}

/**
 * 在一串选项前面插一个「全部」空值档(三级分类三只下拉都要)。
 *
 * @param x 「全部」的文案与原本那串选项。
 * @returns 带空值档的选项。
 */
function withAllOf(x: WithAllIn): SelectOpt[] {
  return [{ value: TEXT_NONE, label: x.all }, ...x.opts]
}

/**
 * 白卡壳的类:全局 .card(描边+圆角+白底,main.css 第 9 段的单一来源)+ 本域的密度档。
 *
 * @returns 类名。
 */
export function cardClsOf(): string {
  return CARD_CLS + CLS_SEP + cssOf(css.chartCard)
}

/**
 * 原生下拉的类:全局 .mktCtl(手机 44 触控靶的跨页规范,单一来源在 main.css 的 640 块)
 * + 本域的长相。
 *
 * @returns 类名。
 */
export function selClsOf(): string {
  return MKT_CTL_CLS + CLS_SEP + cssOf(css.sel)
}

/**
 * 排序方向那一组的类。
 *
 * @returns 类名。
 */
export function segGroupClsOf(): string {
  return MKT_CTL_CLS + CLS_SEP + cssOf(css.segGroup)
}

/**
 * 分段钮的类(选中态多加一层加倍类)。
 *
 * @param x 这一档是不是当前选中的那一个。
 * @returns 类名。
 */
export function segClsOf(x: OnIn): string {
  if (x.on) {
    return cssOf(css.segBtn) + CLS_SEP + cssOf(css.segBtnOn)
  }
  return cssOf(css.segBtn)
}

/**
 * 「更多筛选」钮的类。
 *
 * @returns 类名。
 */
export function moreClsOf(): string {
  return MKT_CTL_CLS + CLS_SEP + cssOf(css.moreBtn)
}

/**
 * 全屏钮的类。
 *
 * @returns 类名。
 */
export function fsClsOf(): string {
  return cssOf(css.fsBtn)
}

/**
 * 画布容器的类(可点的图才出小手)。
 *
 * @param x 这张图点不点得动。
 * @returns 类名。
 */
export function chartClsOf(x: ClickableIn): string {
  if (x.clickable) {
    return cssOf(css.chart) + CLS_SEP + cssOf(css.clickable)
  }
  return cssOf(css.chart)
}

/**
 * 全屏钮的文案键(全屏态说「退出」,非全屏态说「全屏」)。
 *
 * @param x 现在是不是全屏态。
 * @returns 文案键。
 */
export function fsKeyOf(x: FsKeyIn): string {
  if (x.fs) {
    return KEY_FS_EXIT
  }
  return KEY_FS
}

/**
 * 省提名具名清单的 NOC 集。
 *
 * @param x 两条通道的职业清单;缺席 = 空集。
 * @returns NOC 集。
 */
export function pnpSetOf(x: ChannelsIn): Set<string> {
  if (x.channels == null) {
    return new Set()
  }
  return new Set(x.channels.pnp)
}

/**
 * 联邦 EE 类别的 NOC 集。
 *
 * @param x 两条通道的职业清单;缺席 = 空集。
 * @returns NOC 集。
 */
export function eeSetOf(x: ChannelsIn): Set<string> {
  if (x.channels == null) {
    return new Set()
  }
  return new Set(x.channels.ee)
}

/**
 * 文本清单变成下拉选项(值即显示名)。
 *
 * @param x 文本清单。
 * @returns 下拉选项。
 */
export function textOptsOf(x: TextListIn): SelectOpt[] {
  const out: SelectOpt[] = []
  for (const s of x.list) {
    out.push({ value: s, label: s })
  }
  return out
}

/**
 * 大类清单变成下拉选项(显示名过 i18n,缺词就出原名)。
 *
 * @param x 取词函数与大类名清单。
 * @returns 下拉选项。
 */
export function broadSelectOptsOf(x: BroadSelectOptsIn): SelectOpt[] {
  const out: SelectOpt[] = []
  for (const b of x.list) {
    out.push({ value: b, label: x.t(KEY_BROAD_HEAD + b) || b })
  }
  return out
}

/**
 * 数字清单变成下拉选项(下拉的值只能是串,回填时由手柄转回数)。
 *
 * @param x 数字清单。
 * @returns 下拉选项。
 */
export function numOptsOf(x: NumListIn): SelectOpt[] {
  const out: SelectOpt[] = []
  for (const n of x.list) {
    out.push({ value: String(n), label: String(n) })
  }
  return out
}

/**
 * 造横轴档的换值手柄。
 *
 * @param x 横轴档的落格。
 * @returns 换值手柄。
 */
export function makeXKeyChange(x: XKeySetIn): SelectChangeFn {
  return function pickXKey(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setXKey(e.target.value as XKey)
  }
}

/**
 * 造分组档的换值手柄。
 *
 * @param x 分组档的落格。
 * @returns 换值手柄。
 */
export function makeGroupChange(x: GroupSetIn): SelectChangeFn {
  return function pickGroup(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setGroup(e.target.value as GroupKey)
  }
}

/**
 * 造右轴档的换值手柄。
 *
 * @param x 右轴档的落格。
 * @returns 换值手柄。
 */
export function makeY2Change(x: Y2SetIn): SelectChangeFn {
  return function pickY2(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setY2(e.target.value as Y2Key)
  }
}

/**
 * 造排序主键的换值手柄。
 *
 * @param x 排序主键的落格。
 * @returns 换值手柄。
 */
export function makeSortByChange(x: SortBySetIn): SelectChangeFn {
  return function pickSortBy(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setSortBy(e.target.value as SortBy)
  }
}

/**
 * 造排序方向手柄的工厂:给它方向,换一只只管切到那个方向的手柄
 * (Frank 2026-07-28「加上排序按钮」:按岗位数 / 按中位年薪,各含高低两向)。
 *
 * @param x 排序方向的落格。
 * @returns 逐档的手柄工厂。
 */
export function makeSortDirPick(x: SortDirSetIn): (dir: string) => ClickFn {
  return function pickOf(dir: string): ClickFn {
    return function pickDir(): void {
      x.setSortDir(dir as SortDir)
    }
  }
}

/**
 * 造通道筛选的换值手柄。
 *
 * @param x 通道筛选档的落格。
 * @returns 换值手柄。
 */
export function makeChanChange(x: ChanSetIn): SelectChangeFn {
  return function pickChan(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setChan(e.target.value as ChanKey)
  }
}

/**
 * 造大类的换值手柄:大→中→小逐级收窄,换了大类就把中小类一起清空。
 *
 * @param x 三级分类的落格。
 * @returns 换值手柄。
 */
export function makeBroadChange(x: BroadSetIn): SelectChangeFn {
  return function pickBroad(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setFBroad(e.target.value)
    x.setFMid(TEXT_NONE)
    x.setFFine(TEXT_NONE)
  }
}

/**
 * 造中类的换值手柄:换了中类就把小类清空。
 *
 * @param x 中小类的落格。
 * @returns 换值手柄。
 */
export function makeMidChange(x: MidSetIn): SelectChangeFn {
  return function pickMid(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setFMid(e.target.value)
    x.setFFine(TEXT_NONE)
  }
}

/**
 * 造小类的换值手柄。
 *
 * @param x 小类的落格。
 * @returns 换值手柄。
 */
export function makeFineChange(x: FineSetIn): SelectChangeFn {
  return function pickFine(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setFFine(e.target.value)
  }
}

/**
 * 造最低在招岗数的换值手柄(下拉交回的是串,转回数再落格)。
 *
 * @param x 最低在招岗数的落格。
 * @returns 换值手柄。
 */
export function makeMinJobsChange(x: MinJobsSetIn): SelectChangeFn {
  return function pickMinJobs(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setMinJobs(Number(e.target.value))
  }
}

/**
 * 造「更多筛选」的开合手柄。控件区重设计(Frank 2026-07-28「这个地方是不是需要重新设计一下,
 * 并且加一些搜索和过滤条件」):四行药丸 → **常用一行 + 更多筛选折叠**,与职位板筛选区
 * 同一套语言(#59 拍板的形态)。
 *
 * @param x 折叠态的现值与落格。
 * @returns 开合手柄。
 */
export function makeMoreToggle(x: MoreToggleIn): ClickFn {
  return function toggleMore(): void {
    x.setMore(x.more === false)
  }
}

/**
 * 全屏开合(2026-08-01 Frank 队列⑥「主图手机端加全屏按钮」:375 上图挤成一团,
 * 横过来看才读得动)。两条路一个钮:能用原生 Fullscreen API 就走它(退出由 ESC /
 * 返回手势管,不自己造关闭态),用不了就走**伪全屏**(见 fsSupportedOf 的判定)。
 * 退出时按当前走的是哪条路各回各家。桌面不出这个钮(用不上)。
 *
 * @param x 要全屏的那个元素、当前是不是伪全屏,以及进 / 退伪全屏两只手柄。
 * @returns 无。
 */
export function toggleFsAt(x: FsToggleAtIn): void {
  if (x.el == null) {
    return
  }
  if (x.pseudo) {
    x.exitPseudo()
    return
  }
  if (document.fullscreenElement != null) {
    exitFs()
    return
  }
  if (fsSupportedOf({ el: x.el }) === false) {
    x.enterPseudo()
    return
  }
  enterFs({ el: x.el, onFallback: x.enterPseudo })
}

/**
 * 这台浏览器能不能把**一个元素**变全屏。2026-08-28 Frank 实机反馈「手机端展示全屏不生效」
 * 的病根:**iOS WebKit 至今没有 Element.requestFullscreen**(只有 `<video>` 有它自家的
 * webkitEnterFullscreen),iPhone 上 Safari 与 Chrome 都跑 WebKit —— 原来那版
 * `el.requestFullscreen?.()` 于是**静默什么都不做**,钮按下去毫无反应。
 * 这是外部事实(平台 API 缺口),不是我们的调用错,所以判定写在这:
 * 两条都成立才算能用 —— 文档层面允许(fullscreenEnabled;iframe 没给权限时它是 false)
 * 且元素身上真有这个方法。
 *
 * @param x 要全屏的那个元素。
 * @returns 能不能走原生全屏。
 */
function fsSupportedOf(x: FsElIn): boolean {
  if (document.fullscreenEnabled !== true) {
    return false
  }
  return typeof x.el.requestFullscreen === 'function'
}

/**
 * 造「进伪全屏」手柄:容器铺满视口 + body 锁滚动 + 记下这一刻的视口高(图按它撑满)。
 *
 * @param x 伪全屏态、全屏态与视口高度三只落格。
 * @returns 进伪全屏的手柄。
 */
export function makeFsEnterPseudo(x: PseudoSetIn): ClickFn {
  return function enterPseudo(): void {
    lockBodyScroll()
    x.setPseudo(true)
    x.setFs(true)
    x.setVh(window.innerHeight)
    void lockLandscape()
  }
}

/**
 * 造「退伪全屏」手柄:还原 body 滚动与容器长相(图高随 fs 落回常规档)。
 *
 * @param x 伪全屏态、全屏态与视口高度三只落格。
 * @returns 退伪全屏的手柄。
 */
export function makeFsExitPseudo(x: PseudoSetIn): ClickFn {
  return function exitPseudo(): void {
    unlockBodyScroll()
    x.setPseudo(false)
    x.setFs(false)
  }
}

/**
 * 伪全屏期间锁住身后那页的滚动(不锁的话手指划的是页面不是图)。
 *
 * @returns 无。
 */
export function lockBodyScroll(): void {
  document.body.style.overflow = OVERFLOW_HIDDEN
}

/**
 * 还原身后那页的滚动。退伪全屏与本域卸载各调一次(重复调是无害的写空串)。
 *
 * @returns 无。
 */
export function unlockBodyScroll(): void {
  document.body.style.overflow = TEXT_NONE
}

/**
 * 全屏容器的类:伪全屏时多挂一层铺满视口的加倍类(原生全屏那条路由浏览器自己铺,
 * 容器的类不变)。
 *
 * @param x 现在是不是伪全屏态。
 * @returns 类名。
 */
export function fsBoxClsOf(x: PseudoIn): string {
  if (x.pseudo) {
    return cssOf(css.fsBox) + CLS_SEP + cssOf(css.fsFallback)
  }
  return cssOf(css.fsBox)
}

/**
 * 退出全屏:先解锁朝向再退全屏(顺序反了 unlock 会因为已不在全屏而报错)。
 *
 * @returns 无。
 */
function exitFs(): void {
  unlockOrient()
  void document.exitFullscreen()
}

/**
 * 解锁屏幕朝向。不支持这个能力的浏览器上调用会抛,这里当场吃掉 —— 它只是「转不回去」,
 * 不是失败的操作(用户自己转手机即可)。
 *
 * @returns 无。
 */
function unlockOrient(): void {
  try {
    screen.orientation.unlock()
  } catch {
    return
  }
}

/**
 * 进入原生全屏。被浏览器拒了(不是用户手势触发、iframe 没给权限这类)就**改走伪全屏**,
 * 不静默吞掉 —— 2026-08-28 之前那版把这里 catch 成空操作,于是钮按下去毫无反应。
 * 全屏后自动转横屏(Frank 2026-08-02「变成横屏的全屏」):只有全屏态下才允许 lock,
 * Android Chrome 生效,iOS 没有 orientation.lock —— 失败就留竖屏,用户自己转手机。
 *
 * @param x 要全屏的那个元素与走不通时的兜底。
 * @returns 无。
 */
function enterFs(x: EnterFsIn): void {
  void x.el.requestFullscreen().then(lockLandscape).catch(x.onFallback)
}

/**
 * 锁横屏(全屏成功之后那一步)。
 *
 * @returns 锁定的结果;这个浏览器没有 lock 时不做事。
 */
function lockLandscape(): Promise<void> | void {
  const orient = orientLockOf()
  if (orient.lock == null) {
    return
  }
  return orient.lock(ORIENT_LANDSCAPE).catch(ignoreFsFailure)
}

/**
 * 取屏幕朝向的锁定接口。TS 的 lib.dom 里 ScreenOrientation 只声明了 unlock,没有 lock
 * (它还没进标准)—— 这里单断言成本域自己声明的那一格,Android Chrome 有它、iOS Safari 没有。
 *
 * @returns 带 lock 的屏幕朝向。
 */
function orientLockOf(): OrientLock {
  return screen.orientation as OrientLock
}

/**
 * 锁横屏失败时什么都不做。**这是显式的静默豁免,不是漏掉的留痕**:朝向锁定是锦上添花,
 * iOS 压根没有 ScreenOrientation.lock,失败的后果只是「图还是竖着的」,用户自己转手机即可;
 * 真正会让人以为「钮坏了」的那一路(全屏进不去)已经改成回落伪全屏,不再吞。
 *
 * @returns 无。
 */
function ignoreFsFailure(): void {
  return
}

/**
 * 造全屏态的监听效果:全屏态跟着浏览器的 fullscreenchange 走(用户按 ESC / 返回手势
 * 退出时也要还原图高),顺带记下视口高度给全屏态的图用。视口高度同时听 window 的 resize ——
 * 伪全屏那条路没有 fullscreenchange 可听,手机转屏全靠它把图高对回来(非全屏态下
 * 图高是固定档,记下来也不引起重画)。卸载时顺手还原 body 滚动:伪全屏中途被卸载
 * (路由切走)不能把锁留在页面上。
 *
 * @param x 全屏容器、全屏态与视口高度的落格。
 * @returns 效果体(返回清理)。
 */
export function makeFsWatch(x: FsWatchIn): CleanupEffectFn {
  return function watchFs(): CleanupFn {
    function onFs(): void {
      x.setFs(document.fullscreenElement === x.boxRef.current)
      x.setVh(window.innerHeight)
    }
    function onViewport(): void {
      x.setVh(window.innerHeight)
    }
    document.addEventListener(FS_EVENT, onFs)
    window.addEventListener(WINDOW_RESIZE_EVENT, onViewport)
    return function stopWatchFs(): void {
      document.removeEventListener(FS_EVENT, onFs)
      window.removeEventListener(WINDOW_RESIZE_EVENT, onViewport)
      unlockBodyScroll()
    }
  }
}

/**
 * 造主图四份数据的拉取效果。失败 / 缺表回空数组 → 调用侧整节不渲(红线:查不到不出空壳)。
 *
 * @param x 四份数据的落格。
 * @returns 效果体(返回清理)。
 */
export function makeMarketLoad(x: MarketLoadIn): CleanupEffectFn {
  return function loadMarket(): CleanupFn {
    const ctrl = new AbortController()
    void fetchMarket({ setData: x.setData, ctrl })
    return function stopLoadMarket(): void {
      ctrl.abort()
    }
  }
}

/**
 * makeMarketLoad 的真身(async;外壳只把 Promise 收掉)。
 *
 * @param x 四份数据的落格与取消器。
 * @returns 无。
 */
async function fetchMarket(x: FetchMarketIn): Promise<void> {
  try {
    const res = await fetch(MARKET_API, { signal: x.ctrl.signal })
    if (res.ok === false) {
      x.setData(emptyMarketOf())
      return
    }
    x.setData(toMarketData({ json: await res.json() }))
  } catch {
    if (x.ctrl.signal.aborted === false) {
      x.setData(emptyMarketOf())
    }
  }
}

/**
 * 空的四份数据(接口挂了 / 缺表 / 回了非预期形状时的那一份)。
 *
 * @returns 四份空数据。
 */
function emptyMarketOf(): MarketData {
  return { occ: [], city: [], rows: [], channels: { pnp: [], ee: [] } }
}

/**
 * 接口回的 json 洗成四份数据(缺哪一份就补空,不让缺席往下传)。
 *
 * @param x 接口回的 json。
 * @returns 四份数据。
 */
function toMarketData(x: ToMarketDataIn): MarketData {
  const out = emptyMarketOf()
  if (x.json == null) {
    return out
  }
  if (x.json.occ != null) {
    out.occ = x.json.occ
  }
  if (x.json.city != null) {
    out.city = x.json.city
  }
  if (x.json.rows != null) {
    out.rows = x.json.rows
  }
  if (x.json.channels != null) {
    out.channels = x.json.channels
  }
  return out
}

/**
 * 造点击回调的转发效果:init 只绑一次,回调随渲染更新,靠这只 ref 转发。
 *
 * @param x 点击回调的 ref 与这一渲染的回调。
 * @returns 效果体。
 */
export function makeClickSync(x: ClickSyncIn): EffectFn {
  return function syncClick(): void {
    if (x.onBarClick == null) {
      x.clickRef.current = null
      return
    }
    x.clickRef.current = x.onBarClick
  }
}

/**
 * 造画图效果。#128(批A):下钻条数变化 → 容器高度变,canvas 尺寸不跟 → 残影透叠进相邻卡;
 * clear 掉旧帧 + notMerge 全量换 option + resize 对齐新高度,三连根治。
 *
 * @param x 画布容器、实例与点击回调的 ref,以及这一次的 option。
 * @returns 效果体(返回清理)。
 */
export function makeChartDraw(x: ChartDrawIn): CleanupEffectFn {
  return function drawChart(): CleanupFn {
    const token: AliveToken = { alive: true }
    void drawInto({
      boxRef: x.boxRef,
      instRef: x.instRef,
      clickRef: x.clickRef,
      option: x.option,
      token,
    })
    function onResize(): void {
      const inst = x.instRef.current
      if (inst != null) {
        inst.resize()
      }
    }
    window.addEventListener(WINDOW_RESIZE_EVENT, onResize)
    return function stopDrawChart(): void {
      token.alive = false
      window.removeEventListener(WINDOW_RESIZE_EVENT, onResize)
    }
  }
}

/**
 * makeChartDraw 的真身(async;echarts 动态 import 懒加载 —— 展开图才拉,首屏不背体积)。
 *
 * @param x 三只 ref、这一次的 option 与取消令牌。
 * @returns 无。
 */
async function drawInto(x: DrawIntoIn): Promise<void> {
  const lib = await import('echarts')
  const el = x.boxRef.current
  if (x.token.alive === false || el == null) {
    return
  }
  let inst = x.instRef.current
  if (inst == null) {
    inst = lib.init(el)
    inst.on(CHART_CLICK_EVENT, function onChartClick(ev: ChartClickEvent): void {
      const cb = x.clickRef.current
      if (cb != null) {
        cb(ev.dataIndex)
      }
    })
    x.instRef.current = inst
  }
  inst.clear()
  inst.setOption(x.option, true)
  inst.resize()
}

/**
 * 造卸载时销毁实例的效果(canvas 与监听都归 echarts 自己收)。
 *
 * @param x 实例的 ref。
 * @returns 效果体(返回清理)。
 */
export function makeChartDispose(x: ChartDisposeIn): CleanupEffectFn {
  return function watchDispose(): CleanupFn {
    return function disposeChart(): void {
      const inst = x.instRef.current
      if (inst != null) {
        inst.dispose()
      }
      x.instRef.current = null
    }
  }
}
