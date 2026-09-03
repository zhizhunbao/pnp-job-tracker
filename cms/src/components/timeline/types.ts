/**
 * timeline 域(政策时间线页)的自足形状:三路数据的展示行、各件的 props 契约、
 * 派生函数与手柄工厂的入参。
 * 三个展示行(EventRow / CadenceRow / EeCadenceRow)**本域自己声明**,不从 lib/plan 取
 * (宪法 08-25「types 自声明」):只声明这一页真读的那几格,结构相同即兼容,
 * 下层多一格不必跟着改,真读不到会当场 tsc 红。
 * 整页外框不在这里:那层容器 2026-08-27 已收拢成 shell 域的通用件 Frame,本域不留克隆。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值;真参数是 lib/i18n 那个带
 * 附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 无参无返的点击手柄(药丸与节奏卡的 onClick 都是这一形)。
 */
export type ClickFn = () => void

/**
 * 时间线上的一件事(三路混排:省抽选 / 省通告 / 政策公告)。
 */
export type EventRow = {
  /**
   * 日期(YYYY-MM-DD,服务端已排好序)。
   */
  date: string

  /**
   * 两字省码;'' = 联邦发的。
   */
  prov: string

  /**
   * 这件事是哪一路:抽选 / 省通告 / 政策公告。
   */
  kind: 'draw' | 'notice' | 'policy'

  /**
   * 抽选给流名,政策公告给新闻标题;省通告的标题走 i18n 的固定说法,不读这一格。
   */
  title: string

  /**
   * 抽选的最低分;null = 官方这期没公布(不是零分)。
   */
  score: number | null

  /**
   * 抽选的分制标注(SIRS/WEOI/…;'' = 无)。诚实红线:省分不是 CRS,分制要跟着分数出。
   */
  scale: string

  /**
   * 抽选发出的邀请数;null = 官方这期没公布。
   */
  invitations: number | null

  /**
   * 省通告的正文摘要(通告那一路真正的内容在这里)。
   */
  note: string

  /**
   * 政策公告的 AI 重要度 1-5;null = 没评过。
   */
  importance: number | null

  /**
   * 政策公告在站内的 slug(拼成 /news/[slug] 的详情页地址)。
   */
  slug: string
}

/**
 * 一个省一条流的抽选节奏(只报历史统计,不预测下一次 —— 伪权威红线)。
 */
export type CadenceRow = {
  /**
   * 省码;'' = 联邦。
   */
  prov: string

  /**
   * 流名(与事件的 title 同源,所以点卡片能按它筛出这条流的历次抽选)。
   */
  stream: string

  /**
   * 分制标注('' = 无)。
   */
  scale: string

  /**
   * 最近一期的日期。
   */
  last: string

  /**
   * 最近一期距今多少天(服务端按 UTC 日算好)。
   */
  daysSince: number

  /**
   * 近几期的平均间隔;null = 在库不足两期,算不出间隔(不是「间隔为零」)。
   */
  avgGapDays: number | null

  /**
   * 在库期数(平均间隔是几期算出来的,一并说清)。
   */
  draws: number
}

/**
 * 联邦 EE 一个类别的「距今」(历史未入库,只报距今;二期历史入库后并进上面那张表)。
 */
export type EeCadenceRow = {
  /**
   * 类别 key(也当列表的身份键)。
   */
  category: string

  /**
   * 类别的人话名(点卡片时按它筛事件流,所以与事件的 title 同源)。
   */
  label: string

  /**
   * 最近一期的日期。
   */
  last: string

  /**
   * 最近一期距今多少天。
   */
  daysSince: number
}

/**
 * Timeline(整块视图)的 props。
 */
export type TimelineIn = {
  /**
   * 三路混排好的事件流(新在前)。
   */
  events: EventRow[]

  /**
   * 省×流的抽选节奏。
   */
  cadence: CadenceRow[]

  /**
   * 联邦 EE 各类别的距今。
   */
  eeCadence: EeCadenceRow[]

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   */
  updatedAt: string
}

/**
 * useTimeline(筛选状态机器)交回的机器面板。
 */
export type TimelinePanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前省筛:'' = 全部,'FED' = 联邦,两字码 = 那个省。
   */
  prov: string

  /**
   * 当前类型筛:'' = 全部,draw = 抽选(含省通告),policy = 政策公告。
   */
  kind: string

  /**
   * 当前流筛:'' = 不按流筛;非空 = 节奏卡带进来的流名。
   */
  stream: string

  /**
   * 造省筛手柄的工厂(给它省码,换一只切到那个省的手柄)。
   */
  provPickOf: (code: string) => ClickFn

  /**
   * 「全部类型」的手柄。
   */
  onKindAll: ClickFn

  /**
   * 「抽选」的手柄(唯一不清流筛的一只,理由见 makeKindDraw)。
   */
  onKindDraw: ClickFn

  /**
   * 「政策」的手柄。
   */
  onKindPolicy: ClickFn

  /**
   * 撤掉流筛的手柄(流筛药丸上那枚记号)。
   */
  onStreamClear: ClickFn

  /**
   * 造节奏卡点击手柄的工厂(给它省与流,换一只筛过去并滚过去的手柄)。
   */
  drillOf: (x: DrillIn) => ClickFn
}

/**
 * CadenceGrid(节奏卡网格)的 props。
 */
export type CadenceGridIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省×流的抽选节奏。
   */
  cadence: CadenceRow[]

  /**
   * 联邦 EE 各类别的距今。
   */
  eeCadence: EeCadenceRow[]

  /**
   * 造节奏卡点击手柄的工厂。
   */
  drillOf: (x: DrillIn) => ClickFn
}

/**
 * CadenceCard(省×流节奏卡)的 props。
 */
export type CadenceCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这张卡的节奏数据。
   */
  row: CadenceRow

  /**
   * 点这张卡的手柄。
   */
  onClick: ClickFn
}

/**
 * EeCard(联邦 EE 节奏卡)的 props。
 */
export type EeCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这张卡的类别距今数据。
   */
  row: EeCadenceRow

  /**
   * 点这张卡的手柄。
   */
  onClick: ClickFn
}

/**
 * ProvTag(省/联邦标)的 props。
 */
export type ProvTagIn = {
  /**
   * 取词函数(联邦档的字走 i18n)。
   */
  t: TFn

  /**
   * 两字省码;'' = 联邦。
   */
  prov: string
}

/**
 * FilterChips(筛选药丸行)的 props。
 */
export type FilterChipsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本页事件里真出现过的省码(筛出来是空结果的省不给药丸)。
   */
  provs: string[]

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   * 药丸行就是时间轴正上方那一行,更新时间挂在它的右端。
   */
  updatedAt: string

  /**
   * 当前省筛。
   */
  prov: string

  /**
   * 当前类型筛。
   */
  kind: string

  /**
   * 当前流筛。
   */
  stream: string

  /**
   * 造省筛手柄的工厂。
   */
  provPickOf: (code: string) => ClickFn

  /**
   * 「全部类型」的手柄。
   */
  onKindAll: ClickFn

  /**
   * 「抽选」的手柄。
   */
  onKindDraw: ClickFn

  /**
   * 「政策」的手柄。
   */
  onKindPolicy: ClickFn

  /**
   * 撤掉流筛的手柄。
   */
  onStreamClear: ClickFn
}

/**
 * EventList(时间轴)的 props。
 */
export type EventListIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 筛过之后要渲的事件(空 = 出空态那句话)。
   */
  events: EventRow[]
}

/**
 * EventCard(时间轴上的一条)的 props。
 */
export type EventCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一条事件。
   */
  row: EventRow
}

/**
 * PolicyLine(政策公告那一行)的 props。
 */
export type PolicyLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一条事件。
   */
  row: EventRow
}

/**
 * DrawLine(抽选那一行)的 props。
 */
export type DrawLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一条事件。
   */
  row: EventRow
}

/**
 * provsOf 的入参:整条事件流。
 */
export type EventsIn = {
  /**
   * 全部事件(未筛)。
   */
  events: EventRow[]
}

/**
 * shownOf 的入参:整条事件流与三个筛选的现值。
 */
export type ShownOfIn = {
  /**
   * 全部事件(未筛)。
   */
  events: EventRow[]

  /**
   * 当前省筛。
   */
  prov: string

  /**
   * 当前类型筛。
   */
  kind: string

  /**
   * 当前流筛。
   */
  stream: string
}

/**
 * isProvMatch 的入参:一条事件的省码与当前省筛。
 */
export type ProvMatchIn = {
  /**
   * 这条事件的省码;'' = 联邦。
   */
  rowProv: string

  /**
   * 当前省筛。
   */
  prov: string
}

/**
 * isKindMatch 的入参:一条事件的类型与当前类型筛。
 */
export type KindMatchIn = {
  /**
   * 这条事件的类型。
   */
  rowKind: string

  /**
   * 当前类型筛。
   */
  kind: string
}

/**
 * isStreamMatch 的入参:一条事件的标题与当前流筛。
 */
export type StreamMatchIn = {
  /**
   * 这条事件的标题(抽选事件的标题就是流名)。
   */
  title: string

  /**
   * 当前流筛。
   */
  stream: string
}

/**
 * provLabelOf 的入参:取词函数与省码。
 */
export type ProvLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两字省码。
   */
  code: string
}

/**
 * daysClsOf 的入参:一张节奏卡的距今与平均间隔。
 */
export type DaysClsIn = {
  /**
   * 距今多少天。
   */
  daysSince: number

  /**
   * 平均间隔;null = 算不出(那就没有「拖长了」这一说)。
   */
  avgGapDays: number | null
}

/**
 * isPolicy / dotClsOf 的入参:一条事件的类型。
 */
export type KindIn = {
  /**
   * 这条事件的类型。
   */
  kind: string
}

/**
 * isImportant 的入参:AI 重要度。
 */
export type ImportanceIn = {
  /**
   * AI 重要度 1-5;null = 没评过。
   */
  importance: number | null
}

/**
 * eventTitleOf 的入参:取词函数与一条事件的类型、标题。
 */
export type EventTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这条事件的类型。
   */
  kind: string

  /**
   * 这条事件的标题。
   */
  title: string
}

/**
 * isScaleShown 的入参:一条抽选的分制标注。
 */
export type ScaleIn = {
  /**
   * 分制标注('' = 无)。
   */
  scale: string
}

/**
 * newsHrefOf 的入参:站内 slug。
 */
export type SlugIn = {
  /**
   * 政策公告在站内的 slug。
   */
  slug: string
}

/**
 * makeProvPickOf 的入参:省筛与流筛的落格。
 */
export type ProvPickIn = {
  /**
   * 省筛落格。
   */
  setProv: (v: string) => void

  /**
   * 流筛落格(切省时要顺手清掉)。
   */
  setStream: (v: string) => void
}

/**
 * makeKindPick 的入参:类型筛与流筛的落格,以及这只手柄切到哪一档。
 */
export type KindPickIn = {
  /**
   * 类型筛落格。
   */
  setKind: (v: string) => void

  /**
   * 流筛落格(切类型时要顺手清掉)。
   */
  setStream: (v: string) => void

  /**
   * 这只手柄切到的类型档。
   */
  kind: string
}

/**
 * makeKindDraw 的入参:类型筛的落格。
 */
export type KindDrawIn = {
  /**
   * 类型筛落格。
   */
  setKind: (v: string) => void
}

/**
 * makeStreamClear 的入参:流筛的落格。
 */
export type StreamClearIn = {
  /**
   * 流筛落格。
   */
  setStream: (v: string) => void
}

/**
 * makeDrillOf 的入参:三个筛选的落格(节奏卡一点要同时落三格)。
 */
export type DrillOfIn = {
  /**
   * 省筛落格。
   */
  setProv: (v: string) => void

  /**
   * 类型筛落格。
   */
  setKind: (v: string) => void

  /**
   * 流筛落格。
   */
  setStream: (v: string) => void
}

/**
 * 节奏卡点击手柄工厂的入参:这张卡代表的省与流。
 */
export type DrillIn = {
  /**
   * 这张卡的省码;'' = 联邦(筛选里要换成联邦那一档的词)。
   */
  prov: string

  /**
   * 这张卡的流名(= 事件的标题,分组键同源)。
   */
  stream: string
}
