/**
 * funnel 域(/funnel 转化漏斗内部看板)的函数:整块看板的洗行(事实行 → 展示行)、
 * 三条并行链各自的相邻转化率、漏斗表的列组与逐列取值、分组行的类名预算、返回钮手柄工厂,
 * 末尾是两条查询的行构造器(库原始行 → 事实行)。
 * 零 JSX 零 hook —— 排版归 funnel.tsx 与两枚小件,死值归 constants.ts。
 * 本文件**不 import payload**:取数由页面门把连接注进 `queryRowsOrEmpty`,这里只收已经
 * 洗净的事实行,于是整块逻辑浏览器也打得进包。
 * 2026-09-03 上面这句里的「返回钮手柄工厂」撤编(Frank「所有主页面都不应该有返回按钮」),
 * 理由压在 propLineClsOf 的 JSDoc 里。
 *
 * @author Frank
 * @time 2026-08-27 03:00:00
 */
import { count, text } from '@/lib/db'
import {
  CHAT_STEPS, DECISION_STEPS, FUNNEL_STEPS, LEGACY_STEPS, chatRates, decisionRates, stepRates,
} from '@/lib/funnel'
import { cssOf } from '@/components/css'
import {
  ALIGN_RIGHT, CLS_SEP, COL_D1_KEY, COL_D1_TEXT, COL_D30_KEY, COL_D30_TEXT, COL_D7_KEY, COL_D7_TEXT,
  COL_RATE_KEY, COL_RATE_TEXT, COL_STEP_KEY, COL_STEP_TEXT, PAY_NONE, PAY_NOTE_HEAD, PAY_NOTE_TAIL,
  PROP_GAP, RATE_NONE, RATE_SUFFIX, STEP_LABEL, STEP_LOCK_SEEN, STEP_PRICING_OPEN, STEP_REPORT_OPEN,
  TEXT_NONE,
} from './constants'
import type {
  ChainEntriesIn, ChainRateIn, FunnelBoard, FunnelBoardIn, FunnelCellRow, FunnelCol, FunnelEventDbRow,
  FunnelEventFact, FunnelPayCellRow, FunnelPayDbRow, FunnelPayFact, FunnelPropCellRow, FunnelPropRowsIn,
  PropLineClsIn, RateEntry, RateMap, RateTextIn, StepCounts, StepCountsIn, SumStepIn,
} from './types'
import css from './funnel.module.css'

/**
 * 把两条查询的事实行洗成整块看板:漏斗表的十五行、尾行的真实付费两个数、
 * 两条分组行,以及「一条计数都没有」那面旗。
 *
 * @param x 两条查询各自洗好的事实行。
 * @returns 看板展示数据。
 */
export function toFunnelBoard(x: FunnelBoardIn): FunnelBoard {
  const counts = stepCountsOf({ events: x.events })
  const legacyRates = stepRates(counts)
  const chainRate = chainRateOf({ counts })
  const rows: FunnelCellRow[] = []
  let index = 0
  for (const event of FUNNEL_STEPS) {
    rows.push({
      key: event,
      label: stepLabelOf(event),
      d30Text: String(sumStepOf({ events: x.events, event, window: COL_D30_KEY })),
      d7Text: String(sumStepOf({ events: x.events, event, window: COL_D7_KEY })),
      d1Text: String(sumStepOf({ events: x.events, event, window: COL_D1_KEY })),
      rateText: rateTextOf({ chainRate, legacyRates, event, index }),
    })
    index = index + 1
  }
  return {
    rows,
    pay: toFunnelPayCellRow(x.pays),
    byEntry: toFunnelPropRows({ events: x.events, event: STEP_LOCK_SEEN }),
    byPricing: toFunnelPropRows({ events: x.events, event: STEP_PRICING_OPEN }),
    empty: isEmptyCounts(counts),
  }
}

/**
 * 各步近 30 天的合计(转化率函数的入料)。
 *
 * @param x 按天计数的事实行。
 * @returns 步骤名 → 近 30 天计数。
 */
export function stepCountsOf(x: StepCountsIn): StepCounts {
  const counts: StepCounts = {}
  for (const step of FUNNEL_STEPS) {
    counts[step] = sumStepOf({ events: x.events, event: step, window: COL_D30_KEY })
  }
  return counts
}

/**
 * 某一步在某个时间窗上的合计。同一个埋点按维度串分成多行(入口/来路),
 * 这里把它们加回一个数 —— 漏斗那一列问的是「这一步发生了多少次」,不分来路。
 *
 * @param x 事实行、埋点名与时间窗。
 * @returns 合计次数。
 */
export function sumStepOf(x: SumStepIn): number {
  let total = 0
  for (const fact of x.events) {
    if (fact.event === x.event) {
      total = total + fact[x.window]
    }
  }
  return total
}

/**
 * 三条链并行,各算各的相邻转化率(混算会算出「报告 → 打开评估页」这种没有因果的比值)。
 * 旧形态那条链另走 `stepRates` 按序号取,所以这张表里只有对话链与 PR 评估链两条。
 *
 * @param x 各步近 30 天计数。
 * @returns 步骤名 → 相对上一步的转化率。
 */
export function chainRateOf(x: ChainRateIn): RateMap {
  const map: RateMap = new Map()
  const chat = chainEntriesOf({ steps: CHAT_STEPS, rates: chatRates(x.counts) })
  const decision = chainEntriesOf({ steps: DECISION_STEPS, rates: decisionRates(x.counts) })
  for (const entry of chat) {
    map.set(entry.step, entry.rate)
  }
  for (const entry of decision) {
    map.set(entry.step, entry.rate)
  }
  return map
}

/**
 * 一条链的步骤序列 × 它算好的相邻转化率 → 逐步条目。第一步没有「上一步」,不产条目。
 *
 * @param x 链的步骤序列与相邻转化率。
 * @returns 从第二步起,每步一条。
 */
export function chainEntriesOf(x: ChainEntriesIn): RateEntry[] {
  const out: RateEntry[] = []
  let index = 0
  for (const step of x.steps) {
    if (index > 0) {
      let rate: number | null = null
      const value = x.rates[index - 1]
      if (value != null) {
        rate = value
      }
      out.push({ step, rate })
    }
    index = index + 1
  }
  return out
}

/**
 * 步骤的显示名;表里没起名的照原样出埋点名(不掩盖「新埋点还没起名」这件事)。
 *
 * @param event 埋点名。
 * @returns 显示名。
 */
export function stepLabelOf(event: string): string {
  const label = STEP_LABEL[event]
  if (label == null) {
    return event
  }
  return label
}

/**
 * 「比上一步」那一格的字;这一步不给转化率时出横杠。
 *
 * @param x 两套转化率与这一步的身份。
 * @returns 显示串。
 */
export function rateTextOf(x: RateTextIn): string {
  const rate = rateOf(x)
  if (rate == null) {
    return RATE_NONE
  }
  return String(rate) + RATE_SUFFIX
}

/**
 * 这一步该不该给「比上一步」,给的话是多少。
 * 并行链(对话 / PR 评估)有自己的相邻转化率,查表即得;
 * 旧形态那条链按序号取 `stepRates` 的第 index-1 格;链外的步骤一律不给。
 * ② 不给「比上一步」(2026-08-03 第一次读这张表就撞到:① 8 次、② 16 次 = 200%)——
 * 职位详情页**不是**报告的唯一来路,首页 CTA 直接进 /plan/pr 的占了绝大多数
 * (实测 16 里 12 条是 pr 卡),拿 ① 当 ② 的分母算出来的百分比没有意义。
 * ③④⑤ 是真父子关系,照旧给。
 *
 * @param x 两套转化率与这一步的身份。
 * @returns 转化率;不给时是 null。
 */
function rateOf(x: RateTextIn): number | null {
  if (x.chainRate.has(x.event)) {
    const chained = x.chainRate.get(x.event)
    if (chained == null) {
      return null
    }
    return chained
  }
  if (x.index === 0 || x.event === STEP_REPORT_OPEN || x.index >= LEGACY_STEPS.length) {
    return null
  }
  const legacy = x.legacyRates[x.index - 1]
  if (legacy == null) {
    return null
  }
  return legacy
}

/**
 * 尾行「⑥ 真实付费」的展示行。查不到行(表还没建)时两个数都是 0 —— 计数类的 0 无害。
 *
 * @param pays 真实付费的事实行(至多一行)。
 * @returns 尾行展示行。
 */
export function toFunnelPayCellRow(pays: FunnelPayFact[]): FunnelPayCellRow {
  let pay: FunnelPayFact = PAY_NONE
  const first = pays[0]
  if (first != null) {
    pay = first
  }
  return { proText: String(pay.pro), noteText: PAY_NOTE_HEAD + String(pay.stripe) + PAY_NOTE_TAIL }
}

/**
 * 某个埋点按维度串分组的展示行,按近 30 天次数从多到少排。没有维度串的行不入选
 * (那是「这一步的总计」,不是一条来路)。
 *
 * @param x 事实行与要分组的埋点名。
 * @returns 分组条目。
 */
export function toFunnelPropRows(x: FunnelPropRowsIn): FunnelPropCellRow[] {
  const picked: FunnelEventFact[] = []
  for (const fact of x.events) {
    if (fact.event === x.event && fact.prop !== TEXT_NONE) {
      picked.push(fact)
    }
  }
  picked.sort(byD30Desc)
  const out: FunnelPropCellRow[] = []
  for (const fact of picked) {
    out.push({ key: fact.prop, text: fact.prop + PROP_GAP + String(fact.d30) })
  }
  return out
}

/**
 * 分组条目的排序:近 30 天次数多的在前(读表的人先看大头)。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(Array.prototype.sort 的比较器,宪法钦定逐行特批形态)
function byD30Desc(a: FunnelEventFact, b: FunnelEventFact): number {
  return b.d30 - a.d30
}

/**
 * 30 天一条计数都没有(表刚建好,或事件还没打到生产)。
 *
 * @param counts 各步近 30 天计数。
 * @returns 一条都没有是 true。
 */
function isEmptyCounts(counts: StepCounts): boolean {
  for (const step of FUNNEL_STEPS) {
    const n = counts[step]
    if (n != null && n > 0) {
      return false
    }
  }
  return true
}

/**
 * 漏斗表的列组。五列都是纯文本,视觉差别(粗体/淡色/窄屏藏列)全由列级类承担,
 * 没有一列需要单独的单元格组件。
 * 2026-08-11(Frank「都改成一套」):这张表原是自造的裸 `<table>`,换成公共 Table;
 * 尾行「⑥ 真实付费」带 colSpan,走 Table 的 foot 槽。
 *
 * @returns 五列。
 */
export function funnelColsOf(): FunnelCol[] {
  return [
    { key: COL_STEP_KEY, label: COL_STEP_TEXT, nowrap: true, render: funnelStepOf },
    { key: COL_D30_KEY, label: COL_D30_TEXT, align: ALIGN_RIGHT, className: cssOf(css.strong), render: funnelD30Of },
    { key: COL_D7_KEY, label: COL_D7_TEXT, align: ALIGN_RIGHT, className: cssOf(css.narrowHide), render: funnelD7Of },
    { key: COL_D1_KEY, label: COL_D1_TEXT, align: ALIGN_RIGHT, className: cssOf(css.narrowHide), render: funnelD1Of },
    { key: COL_RATE_KEY, label: COL_RATE_TEXT, align: ALIGN_RIGHT, className: cssOf(css.rate), render: funnelRateOf },
  ]
}

/**
 * 漏斗表「步骤」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 步骤显示名。
 */
export function funnelStepOf(r: FunnelCellRow): string {
  return r.label
}

/**
 * 漏斗表「30 天」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 近 30 天计数。
 */
export function funnelD30Of(r: FunnelCellRow): string {
  return r.d30Text
}

/**
 * 漏斗表「7 天」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 近 7 天计数。
 */
export function funnelD7Of(r: FunnelCellRow): string {
  return r.d7Text
}

/**
 * 漏斗表「昨天」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 昨天计数。
 */
export function funnelD1Of(r: FunnelCellRow): string {
  return r.d1Text
}

/**
 * 漏斗表「比上一步」列的取值。
 *
 * @param r 这一行展示行。
 * @returns 转化率或横杠。
 */
export function funnelRateOf(r: FunnelCellRow): string {
  return r.rateText
}

/**
 * 漏斗表的行身份。
 *
 * @param r 这一行展示行。
 * @returns 行键。
 */
export function funnelRowKeyOf(r: FunnelCellRow): string {
  return r.key
}

/**
 * 尾行第一格「⑥ 真实付费」的类名(表体单元格 token + 不折行)。
 *
 * @returns 类名。
 */
export function footLabelClsOf(): string {
  return cssOf(css.footTd) + CLS_SEP + cssOf(css.footLabel)
}

/**
 * 尾行第二格(proUntil 有值的人数)的类名(表体单元格 token + 右对齐粗体)。
 *
 * @returns 类名。
 */
export function footCountClsOf(): string {
  return cssOf(css.footTd) + CLS_SEP + cssOf(css.footCount)
}

/**
 * 尾行第三格(走过 Checkout 的人数说明)的类名(表体单元格 token + 灰字小注)。
 *
 * @returns 类名。
 */
export function footNoteClsOf(): string {
  return cssOf(css.footTd) + CLS_SEP + cssOf(css.footNote)
}

/**
 * 分组行的类名:紧跟在另一条分组行下面的那一条间距收窄。
 * 旁边原有返回钮的手柄工厂 makeGoBack(走 goBackOr 而不是裸 history.back():新标签页里
 * `history.length === 1`,裸 back 是空操作),2026-09-03 撤编:Frank「所有主页面都不应该
 * 有返回按钮」;goBackOr 那条教训归 components/button,别处还用得着。
 *
 * @param x 是不是紧跟在另一条下面。
 * @returns 类名。
 */
export function propLineClsOf(x: PropLineClsIn): string {
  if (x.tight === true) {
    return cssOf(css.propLine) + CLS_SEP + cssOf(css.propLineTight)
  }
  return cssOf(css.propLine)
}

/**
 * `SQL.FUNNEL_EVENTS` 的行构造器:计数列在 pg 里是 bigint,驱动可能按串交回来,
 * 所以逐格过词汇表;维度串缺席落空串(**这一步的总计**那一行本来就没有维度)。
 *
 * @param row 库原始行。
 * @returns 事实行。
 */
export function toFunnelEventFact(row: FunnelEventDbRow): FunnelEventFact {
  return {
    event: text(row.event),
    prop: text(row.prop),
    d30: count(row.d30),
    d7: count(row.d7),
    d1: count(row.d1),
  }
}

/**
 * `SQL.FUNNEL_USERS` 的行构造器。两个数都是**计数**,空值折 0 无害
 * (「一个都没有」本身就是答案,不是替谁编数)。
 *
 * @param row 库原始行。
 * @returns 事实行。
 */
export function toFunnelPayFact(row: FunnelPayDbRow): FunnelPayFact {
  return { pro: count(row.pro), stripe: count(row.stripe) }
}
