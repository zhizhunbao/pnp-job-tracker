/**
 * 路径规划域的全部形状:排序(RankableRow × RankCtx)、方案计算器(C3 的 Plan 家族)、
 * 政策时间线(TlEvent/TlCadence)。
 *
 * 🔴 别和 `lib/quota` 搞混:那个装的是**配额**(免费/Pro 上限),这个才是 plan 的本义 ——
 *    路径怎么排、几步能到、多久(2026-08-19 改名就是为了断掉这层歧义)。
 *
 * 方案计算器的输入形状(ThresholdRow/DrawsResult/OpsResult…)2026-08-21 自 chat/tools.ts
 * 原样搬入:lookup 本体已随旧链删除,新链的 lookup_plan 适配批会按同样的形状喂 buildPlan
 * (喂错一张表它照样算得出数 —— 形状即契约,别顺手精简字段)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

import type { Db } from '../db'

// =========================================================================
// 1. 排序(#307 唯一排序尺)
// =========================================================================

/**
 * 参与排序的一行(引擎输出的通道行,区域线已拆省、竞争比已挂)。
 */
export type RankableRow = {
  /**
   * 通道 key。
   */
  key: string

  /**
   * 省码('FED' 或两字码)。
   */
  province: string

  /**
   * 判定档。
   */
  verdict: string

  /**
   * 障碍档;null = 无档。
   */
  tier: number | null

  /**
   * 该省门槛数据的可得性('ok' 之外沉底 —— 本省也救不了缺数据)。
   */
  availability: string

  /**
   * 最难的那道闸;没有则 null。
   */
  blockedBy: string | null

  /**
   * 估分够不着最近抽选线(沉底段)。
   */
  belowLine: boolean

  /**
   * 估分下界已 ≥ 最近抽选线(2026-08-16 Frank「分数达标就等着被捞」)—— 同档内提前。
   */
  aboveLine: boolean

  /**
   * 竞争比;null = 无数据。
   */
  competition: {
    /**
     * 池子人数 / 上轮邀请数(联邦一个源,九省同口径,所以可排序)。
     */
    ratio: number
  } | null
}

/**
 * 排序上下文。
 */
export type RankCtx = {
  /**
   * 该省该职业在招岗数(按通道的 jobsSource 口径);非省级行 / 无数据 = null。
   */
  jobsOf: (row: RankableRow) => number | null

  /**
   * 本省 = 现居省 ∪ 学历省(地理成本判据,#302)。
   */
  homeProvs: ReadonlySet<string>
}

/**
 * 装饰行:比较器只读现成值,判据全部由 decorate 先算好挂上(宪法:比较器体内不查表)。
 */
export type DecoratedRow<T extends RankableRow> = {
  /**
   * 原行。
   */
  row: T

  /**
   * 引擎原序(兜底键)。
   */
  i: number

  /**
   * 档位序(band 首现定档:引擎输出本身按障碍难度排,首现即档位次序)。
   */
  band: number

  /**
   * 在招岗数;null = 无数据。
   */
  n: number | null

  /**
   * 是否本省(现居省 ∪ 学历省;仅省级行参与)。
   */
  home: boolean

  /**
   * 竞争比(无数据按正无穷 —— 足量组按竞争比松→紧时沉最后)。
   */
  ratio: number

  /**
   * 沉降段:availability≠ok / belowLine(估分够不着线)。
   */
  sunk: boolean

  /**
   * 0 岗(「0 不是少,是没有」—— 跨档沉底)。
   */
  zero: boolean

  /**
   * 薄盘:在招 <10 或无数(沉同档尾;null 不逃降档)。
   */
  thin: boolean
}

/**
 * `rankRows` 的入参。
 */
export type RankIn<T extends RankableRow> = {
  /**
   * 引擎序的行(pathVerdict 原样)。
   */
  rows: T[]

  /**
   * 排序上下文。
   */
  ctx: RankCtx
}

/**
 * `pickOutside` 的入参。
 */
export type OutsideIn<T extends RankableRow> = {
  /**
   * 全量行(含目标省外)。
   */
  rows: T[]

  /**
   * 用户的目标省。
   */
  targets: string[]

  /**
   * 排序上下文。
   */
  ctx: RankCtx
}

/**
 * 省外提示的返回(#302/#303):候选行 + 场内第一名(给措辞层摆对照 —— 两边的竞争比与档位
 * 都要如实说,不许再用裸「更优」二字)。
 */
export type OutsidePick<T extends RankableRow> = {
  /**
   * 省外候选行。
   */
  row: T

  /**
   * 场内第一名;目标省里一行都没有则 null。
   */
  insideBest: T | null
}

// =========================================================================
// 2. 方案计算器的输入形状(C1 三个 lookup 的返回值;形状即契约)
// =========================================================================

/**
 * 四态,一步都不许合并(not-published=官方的问题;not-collected=本站的问题)。
 */
export type Availability = 'ok' | 'not-published' | 'not-collected' | 'not-applicable'

/**
 * 出处。fetched 是本站抓取日,不是「今天」。
 */
export type Evidence = {
  /**
   * 出处页。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 出处名;没有则 null。
   */
  label: string | null

  /**
   * 章节号;没有则 null。
   */
  section: string | null

  /**
   * 官方生效日;没有则 null。
   */
  effective: string | null
}

/**
 * 一条门槛行的判定结果(判定出自门槛引擎,本层不改)。
 */
export type ThresholdRow = {
  /**
   * 门槛因素名。
   */
  factor: string

  /**
   * 门槛落在谁身上。
   */
  subject: 'applicant' | 'employer'

  /**
   * 官方通道原名;没有则 null。一个省的规则可能来自多条互不等价的通道,
   * 消费端必须据此避免把门槛硬拼成一条路。
   */
  stream: string | null

  /**
   * 阈值口径;没有则 null。basis='employerTenure' 量的是「在这家雇主连续全职多久」,
   * 用错话术句子本身就是假的。
   */
  basis: string | null

  /**
   * 三态判定。
   */
  verdict: 'pass' | 'fail' | 'unknown'

  /**
   * 官方阈值;null = 无数。
   */
  need: number | null

  /**
   * 阈值下界;null = 无。
   */
  needLow: number | null

  /**
   * 你已有的;null = 不知道。
   */
  have: number | null

  /**
   * 差多少;null = 算不出。
   */
  short: number | null

  /**
   * 单位,官方原样。
   */
  unit: string

  /**
   * 分档因素的完整档位,每档挂自己那一行的官方原文;非分档因素 null。
   */
  tiers: {
    /**
     * 档的地区。
     */
    area: string

    /**
     * 该档阈值;null = 无数。
     */
    value: number | null

    /**
     * 该档出处。
     */
    evidence: Evidence
  }[] | null

  /**
   * 这一行的出处。
   */
  evidence: Evidence
}

/**
 * 一个省的门槛判定。
 */
export type ProvThresholds = {
  /**
   * 省码。
   */
  province: string

  /**
   * 可得性。
   */
  availability: Availability

  /**
   * 门槛行。
   */
  rows: ThresholdRow[]

  /**
   * 备注;没有则 null。
   */
  note: string | null
}

/**
 * 门槛查询结果。
 */
export type ThresholdsResult = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  title: string

  /**
   * TEER;null=未分类。
   */
  teer: number | null

  /**
   * 各省判定。
   */
  provinces: ProvThresholds[]
}

/**
 * 一轮抽选。
 */
export type DrawRow = {
  /**
   * 省码。
   */
  province: string

  /**
   * 抽选日期。
   */
  drawDate: string

  /**
   * 通道。
   */
  stream: string

  /**
   * 分数线;null = 该轮未公布。
   */
  score: number | null

  /**
   * 分制标注。
   */
  scale: string

  /**
   * 邀请数;null = 未公布。
   */
  invitations: number | null

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 本站收录的抽选窗口(计时终点用 to,不是「今天」)。
 */
export type DrawWindow = {
  /**
   * 窗口起。
   */
  from: string

  /**
   * 窗口止。
   */
  to: string

  /**
   * 在库轮数。
   */
  rounds: number
}

/**
 * 一类轮次的小结(空数组与「这类轮次停了」是两件事)。
 */
export type DrawStreamStat = {
  /**
   * 轮次键。
   */
  key: string

  /**
   * 通道名。
   */
  stream: string

  /**
   * 分制标注。
   */
  scale: string

  /**
   * 在库轮数。
   */
  rounds: number

  /**
   * 最近一轮日期。
   */
  lastDrawDate: string

  /**
   * 计时起点。
   */
  since: string

  /**
   * 计时起点是不是窗口起点。
   */
  sinceIsWindowStart: boolean

  /**
   * 距今月数;null = 算不出。
   */
  monthsSince: number | null

  /**
   * 分数线低点;null = 无。
   */
  scoreLow: number | null

  /**
   * 分数线高点;null = 无。
   */
  scoreHigh: number | null

  /**
   * 可得性。
   */
  availability: Availability

  /**
   * 备注。
   */
  note: string

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 抽选查询结果。
 */
export type DrawsResult = {
  /**
   * 省码。
   */
  province: string

  /**
   * 可得性。
   */
  availability: Availability

  /**
   * 各轮。
   */
  rows: DrawRow[]

  /**
   * 备注;没有则 null。
   */
  note: string | null

  /**
   * 分制标注;没有则 null。
   */
  scale: string | null

  /**
   * 收录窗口;没有则 null。
   */
  window: DrawWindow | null

  /**
   * 分类小结;没有则 null。
   */
  streams: DrawStreamStat[] | null
}

/**
 * 一条官方运营统计。value=null 是官方的隐私抑制/不适用,不是 0。
 */
export type OpsMetric = {
  /**
   * 指标键。
   */
  key: string

  /**
   * 官方口径原文(哪条通道)。
   */
  scope: string

  /**
   * 口径类别。
   */
  scopeKind: string

  /**
   * 通道键。
   */
  streamKey: string

  /**
   * 指标名。
   */
  label: string

  /**
   * 数值;null = 官方隐私抑制/不适用。
   */
  value: number | null

  /**
   * 官方原文(如 "N/A")。
   */
  valueText: string

  /**
   * 单位。
   */
  unit: string

  /**
   * 口径日。
   */
  asOf: string

  /**
   * 口径期。
   */
  period: string

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 运营统计查询结果。
 */
export type OpsResult = {
  /**
   * 省码。
   */
  province: string

  /**
   * 可得性。
   */
  availability: Availability

  /**
   * 官方页。
   */
  officialUrl: string

  /**
   * 备注。
   */
  note: string

  /**
   * 各指标。
   */
  metrics: OpsMetric[]
}

// =========================================================================
// 3. 方案计算器的输出形状(C3;四条红线见 functions.ts 的 buildPlan 头)
// =========================================================================

/**
 * 一段的性质:gap=还缺什么(补齐要多久) / draw=然后要等多久(官方开一轮的间隔) /
 * processing=递交后官方处理多久。
 */
export type PlanStepKind = 'gap' | 'draw' | 'processing'

/**
 * 计划的一段。
 */
export type PlanStep = {
  /**
   * 段的性质。
   */
  kind: PlanStepKind

  /**
   * gap:门槛因素名;draw:'cadence';processing:官方通道口径(scope)。
   */
  factor: string

  /**
   * 🔴 null = 本层算不出。**永远不要折 0** —— 红线①:折 0 就是替官方编数,整条路凭空快几个月。
   */
  months: number | null

  /**
   * 这个数字**从哪来**:算术原文;months=null 时空串。
   */
  basis: string

  /**
   * 四态原样沿用 C1,不重新发明。
   */
  availability: Availability

  /**
   * months=null 时**必须**说清为什么算不出;能算出时可为空。
   */
  why: string

  /**
   * 🔴 每一段都必须挂出处。数字段(months≠null)的 evidence.url 恒非空,否则这一段判不可用。
   */
  evidence: Evidence | null
}

/**
 * 判不了的门槛(缺你的信息、或缺雇主材料)。**不是时间线的一段**,不计月数,但要摆出来。
 */
export type PlanBlocker = {
  /**
   * 因素名。
   */
  factor: string

  /**
   * 落在谁身上。
   */
  subject: string

  /**
   * 官方阈值;null = 无数。
   */
  need: number | null

  /**
   * 单位。
   */
  unit: string

  /**
   * 为什么判不了。
   */
  why: string

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 一条路径的推演。
 */
export type PlanPath = {
  /**
   * 省码。
   */
  province: string

  /**
   * 通道名。
   */
  stream: string

  /**
   * 各段。
   */
  steps: PlanStep[]

  /**
   * 已确定各段之和 = 这条路的**下界**(还有 unknown 段时真实值只会更大,不会更小)。
   */
  determinedMonths: number

  /**
   * 🔴 只有全段确定时才是数;含 unknown 段时恒 null —— **下界不许冒充总数**。
   */
  totalMonths: number | null

  /**
   * 时间线确定性。
   */
  timelineCertainty: 'complete' | 'partial'

  /**
   * partial 的原因:哪几段算不出(steps 的子集,引用同一批对象)。
   */
  unknownSteps: PlanStep[]

  /**
   * 门槛判不了的项(不影响 timelineCertainty:时间线的确定性 ≠ 资格的确定性,两件事别混)。
   */
  unresolved: PlanBlocker[]

  /**
   * 该省门槛本身的可得性(not-collected = 连门槛都没收录)。
   */
  availability: Availability

  /**
   * 备注。
   */
  note: string
}

/**
 * 两条路的快慢差。**只在算术站得住时才生成**:exact = 两条都全段确定;
 * atLeast = 快的那条全段确定(总数即上界),慢的那条只有下界且下界已大于快的总数。
 * 其余情况一律不生成 —— 含 unknown 段的两条路互相比大小没有意义(红线①)。
 */
export type PlanComparison = {
  /**
   * 快的省。
   */
  fasterProvince: string

  /**
   * 慢的省。
   */
  slowerProvince: string

  /**
   * 差几个月。
   */
  monthsDelta: number

  /**
   * 差值的性质。
   */
  kind: 'exact' | 'atLeast'

  /**
   * 算术原文。
   */
  basis: string
}

/**
 * 官方规费(IRCC PR-fees 等,带出处)。
 */
export type PlanCost = {
  /**
   * 项目名。
   */
  label: string

  /**
   * 金额。
   */
  amount: number

  /**
   * 币种/单位。
   */
  unit: string

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 别人报的价(中介/朋友)。**原样带回,不核实、不换算、永不与 officialCosts 相减**(红线③)。
 */
export type QuotedCost = {
  /**
   * 项目名。
   */
  label: string

  /**
   * 金额;null = 对方没给数。
   */
  amount: number | null

  /**
   * 币种/单位。
   */
  unit: string

  /**
   * 原话。
   */
  text: string

  /**
   * 谁说的。
   */
  source: string
}

/**
 * 整份方案。
 */
export type Plan = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  title: string

  /**
   * TEER;null=未分类。
   */
  teer: number | null

  /**
   * 全段确定的路径,按总月数升序。
   */
  ranked: PlanPath[]

  /**
   * 含 unknown 段的路径,**单独成组**,按下界升序 —— 不与 ranked 混排(红线①)。
   */
  partial: PlanPath[]

  /**
   * 快慢差。
   */
  comparisons: PlanComparison[]

  /**
   * 官方规费。
   */
  officialCosts: PlanCost[]

  /**
   * 他人报价(并列摆出,绝不相减)。
   */
  quotedCosts: QuotedCost[]

  /**
   * 给上层复述用的口径说明(不是成品文案)。
   */
  notes: string[]
}

/**
 * 一条候选路径的输入 = C1 三个工具对同一个省的返回值。
 */
export type PlanPathInput = {
  /**
   * 省码。
   */
  province: string

  /**
   * 通道名;没有则 null。
   */
  stream: string | null

  /**
   * 该省门槛判定;null = 用 thresholds.provinces 里找。
   */
  thresholds: ProvThresholds | null

  /**
   * 该省抽选;null = 未查。
   */
  draws: DrawsResult | null

  /**
   * 该省运营统计;null = 未查。
   */
  ops: OpsResult | null

  /**
   * 该通道**制度上就没有抽选这一步**(如 SINP Employment Offer 子类不递 EOI、不进池,官方页明示)。
   * **必须带官方出处** —— 没有 evidence.url 的一律按 unknown 处理,绝不拿「库里没抽选记录」
   * 推成「不用抽选」(那正是红线①说的编数字)。没有则 null。
   */
  noDrawStep: {
    /**
     * 官方出处。
     */
    evidence: Evidence
  } | null

  /**
   * ops 里挑哪一条处理时长(官方 scope 原文)。省内有多条又不指明 = 不替你挑;null = 不指明。
   */
  processingScope: string | null
}

/**
 * `buildPlan` 的入参。
 */
export type PlanIn = {
  /**
   * 职业/TEER/各省门槛(lookupThresholds)。
   */
  thresholds: ThresholdsResult

  /**
   * 候选路径。
   */
  paths: PlanPathInput[]

  /**
   * 官方规费;没有则空数组。
   */
  officialCosts: PlanCost[]

  /**
   * 他人报价;没有则空数组。
   */
  quotedCosts: QuotedCost[]
}

// =========================================================================
// 4. 政策时间线(C6-01)
// =========================================================================

/**
 * 时间线一件事。
 */
export type TlEvent = {
  /**
   * 日期(YYYY-MM-DD)。
   */
  date: string

  /**
   * 两字省码;'' = 联邦。
   */
  prov: string

  /**
   * 抽选 / 省通告 / 政策公告(news)。
   */
  kind: 'draw' | 'notice' | 'policy'

  /**
   * draw=流名;policy=新闻标题。
   */
  title: string

  /**
   * draw:最低分;null = 未公布。
   */
  score: number | null

  /**
   * draw:分制标注(SIRS/WEOI/…,'' = 无)。
   */
  scale: string

  /**
   * draw:邀请数;null = 未公布。
   */
  invitations: number | null

  /**
   * notice/policy 摘要。
   */
  note: string

  /**
   * policy:AI 重要度 1-5;null = 未评。
   */
  importance: number | null

  /**
   * 外链(官方来源)或 ''。
   */
  url: string

  /**
   * policy:站内 /news/[slug]。
   */
  slug: string
}

/**
 * 抽选节奏(省×项目;只报历史统计不预测下一次 —— 伪权威红线)。
 */
export type TlCadence = {
  /**
   * 省码。
   */
  prov: string

  /**
   * 项目名。
   */
  stream: string

  /**
   * 分制标注。
   */
  scale: string

  /**
   * 最近抽选日期。
   */
  last: string

  /**
   * 距今天数(服务端算,当天口径 UTC 日)。
   */
  daysSince: number

  /**
   * 近几期平均间隔;<2 期 = null。
   */
  avgGapDays: number | null

  /**
   * 在库期数。
   */
  draws: number
}

/**
 * 联邦 EE 各类别「距今」(历史未入库,只报距今;二期历史入库后并入 cadence)。
 */
export type EeCadence = {
  /**
   * 类别 key。
   */
  category: string

  /**
   * 类别人话名。
   */
  label: string

  /**
   * 最近一期日期。
   */
  last: string

  /**
   * 距今天数。
   */
  daysSince: number
}

/**
 * `fetchTimeline` 的返回。
 */
export type TimelineOut = Promise<{
  /**
   * 事件流(新在前)。
   */
  events: TlEvent[]

  /**
   * 省级抽选节奏。
   */
  cadence: TlCadence[]

  /**
   * 联邦 EE 距今。
   */
  eeCadence: EeCadence[]
}>

/**
 * `fetchTimeline` 的入参形状(能打 SQL 的东西;由调用方注入 —— 拍板③)。
 */
export type TimelineDb = Db

/**
 * 数或没有。
 */
export type MaybeNum = number | null

/**
 * `DecoratedRow` 的复数(装饰后的行组)。
 */
export type DecoratedRows<T extends RankableRow> = DecoratedRow<T>[]

/**
 * 行组(rankRows 的返回)。
 */
export type RankedRows<T extends RankableRow> = T[]

/**
 * 省外提示或没有。
 */
export type MaybeOutside<T extends RankableRow> = OutsidePick<T> | null

/**
 * `monthsFromUnit` 的入参。
 */
export type MonthsIn = {
  /**
   * 差值。
   */
  value: number

  /**
   * 官方单位原文。
   */
  unit: string
}

/**
 * `ThresholdRow` 的复数。
 */
export type ThresholdRows = ThresholdRow[]

/**
 * `PlanStep` 的复数。
 */
export type PlanSteps = PlanStep[]

/**
 * `PlanBlocker` 的复数。
 */
export type PlanBlockers = PlanBlocker[]

/**
 * `comparisonsOf` 的入参。
 */
export type ComparisonsIn = {
  /**
   * 全段确定组。
   */
  ranked: PlanPath[]

  /**
   * 含未知段组。
   */
  partial: PlanPath[]
}

/**
 * `PlanComparison` 的复数。
 */
export type PlanComparisons = PlanComparison[]

/**
 * `daysBetween` 的入参。
 */
export type DaysIn = {
  /**
   * 起(十位日期)。
   */
  from: string

  /**
   * 止(十位日期)。
   */
  to: string
}

/**
 * 库标量(与 ruling 同一声明法)。
 */
export type Cell = string | number | boolean | null

/**
 * 库里的一行(时间线三条 SQL 的行都窄,词汇收窄在 rows.ts)。
 */
export type Row = Record<string, Cell>

/**
 * `Date` 的本地名(库类型先起本地名;pg timestamp 回来是 Date)。
 */
export type PgDate = Date

/**
 * 时间格。
 */
export type TimeLike = Cell | PgDate

/**
 * 节奏分组的累积格(byStream 聚合用)。
 */
export type CadenceGroup = {
  /**
   * 省码。
   */
  prov: string

  /**
   * 项目名。
   */
  stream: string

  /**
   * 分制标注。
   */
  scale: string

  /**
   * 各期日期。
   */
  dates: string[]
}
