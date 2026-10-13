/**
 * timeline 域(政策时间线页)的自足形状:三路数据的展示行、各件的 props 契约、
 * 派生函数与手柄工厂的入参。
 * 三个展示行(EventRow / CadenceRow / EeCadenceRow)**本域自己声明**,不从 lib/plan 取
 * (宪法 08-25「types 自声明」):只声明这一页真读的那几格,结构相同即兼容,
 * 下层多一格不必跟着改,真读不到会当场 tsc 红。
 * 整页外框不在这里:那层容器 2026-08-27 已收拢成 shell 域的通用件 Frame,本域不留克隆。
 * 2026-10-03 资讯页签四分(页签改叫「抽选」):政策公告那一路撤出时间线,事件剩抽选 / 省通告两路;类型筛与政策公告那一半的形状随之撤。
 * 2026-10-12 抽选页三段式(docs/design/资讯/抽选-三段式-20261012.md):CadenceRow / EeCadenceRow 两形撤,
 * 换成一形 RankCard(配额卡与抽选节奏卡共用,数据层 draw_rank 一行);流筛从「流名串」改成「点中的卡」(按卡的流名清单筛)。
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
 * 界面语(本域自抄三字面量,types 叶不 import)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 时间线上的一件事(两路混排:省抽选 / 省通告;政策公告 2026-10-03 撤出)。
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
   * 抽选给流名;省通告的标题走 i18n 的固定说法,不读这一格。
   */
  title: string

  /**
   * 流名中文灰注(中文界面读;'' = 没有)。
   */
  titleZh: string

  /**
   * 联邦类别键(查 ee.* 词条出中 / 韩灰字);省行 ''。
   */
  label: string

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
   * 抽选的人数口径(selection = 从 EOI 池选中的人,写「人入选」;新闻给 '';2026-09-30 Frank「把脉页那几处 NS 也改成读数据吧」)。
   */
  unit: string
}

/**
 * 合卡覆盖的一条通道(三语名)。
 */
export type CoverRow = {
  /**
   * 官方英文名。
   */
  en: string

  /**
   * 中文名。
   */
  zh: string

  /**
   * 韩文名。
   */
  ko: string
}

/**
 * 一张排名卡(配额卡 / 抽选节奏卡共用;数据层 draw_rank 一行,名次与状态在数据层算好 —— 只报历史统计,不预测下一次)。
 */
export type RankCard = {
  /**
   * 卡片稳定键。
   */
  key: string

  /**
   * 卡种。
   */
  kind: 'quota' | 'cadence'

  /**
   * 名次(1 起)。
   */
  rank: number

  /**
   * 省码;'' = 联邦。
   */
  prov: string

  /**
   * 联邦类别键(查 ee.* 词条);省卡 ''。
   */
  label: string

  /**
   * 英文名(配额卡 '',按省码出省名)。
   */
  nameEn: string

  /**
   * 中文名('' = 没有)。
   */
  nameZh: string

  /**
   * 韩文名('' = 没有)。
   */
  nameKo: string

  /**
   * 合卡覆盖的通道。
   */
  covers: CoverRow[]

  /**
   * 这张卡统计的抽选流名(点卡片按它筛事件流)。
   */
  streams: string[]

  /**
   * 最近一期抽选日期(到日;NS 只到月)。
   */
  lastDate: string

  /**
   * 距今天数;null = 日期只到月。
   */
  daysSince: number | null

  /**
   * 平均间隔天数;null = 算不出。
   */
  avgGapDays: number | null

  /**
   * 节奏状态。
   */
  status: 'ok' | 'late' | 'idle'

  /**
   * 今年抽选次数。
   */
  drawsYtd: number

  /**
   * 今年邀请人数;null = 没公布。
   */
  invitationsYtd: number | null

  /**
   * 人数口径(invitation / selection / application)。
   */
  inviteUnit: string

  /**
   * 今年已发提名;null = 没有这一步或本站未收录。
   */
  nominationsYtd: number | null

  /**
   * 配额卡:今年配额 / 联邦永居目标;null = 本站未收录。
   */
  allocation: number | null

  /**
   * 配额口径(quota / prTarget)。
   */
  allocationKind: string
}

/**
 * 卡上的一格(格名黑字 + 数字灰字;2026-10-12 Frank「key 不要是灰字,数字应该是灰字吧」)。
 */
export type StatCellRow = {
  /**
   * 格名。
   */
  k: string

  /**
   * 数字(已拼好单位;缺数是「-」)。
   */
  v: string

  /**
   * 数字那一行的类名(底类;距今另带状态色)。
   */
  cls: string
}

/**
 * Timeline(整块视图)的 props。
 */
export type TimelineIn = {
  /**
   * 混排好的事件流(抽选 / 省通告两路,新在前)。
   */
  events: EventRow[]

  /**
   * 配额卡(联邦 + 各省,按名次)。
   */
  quota: RankCard[]

  /**
   * 抽选节奏卡(一条通道一张,按名次)。
   */
  cadence: RankCard[]

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   */
  updatedAt: string
}

/**
 * useTimeline 的入参。
 */
export type TimelineHookIn = {
  /**
   * 节奏卡折起来的张数(总数减去先出的那几张;不足则 0)。
   */
  hidden: number
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
   * 界面语(灰字译名按它取)。
   */
  lang: Lang

  /**
   * 当前省筛:'' = 全部,'FED' = 联邦,两字码 = 那个省。
   */
  prov: string

  /**
   * 当前点中的节奏卡键:'' = 不按卡筛;非空 = 点过的那张卡(按它的流名清单筛)。
   */
  pick: string

  /**
   * 节奏卡折起来时多展开了几张(全站折叠件 FoldLine 的状态)。
   */
  extra: number

  /**
   * 展开一批节奏卡。
   */
  onMore: ClickFn

  /**
   * 收起节奏卡。
   */
  onFold: ClickFn

  /**
   * 造省筛手柄的工厂(给它省码,换一只切到那个省的手柄)。
   */
  provPickOf: (code: string) => ClickFn

  /**
   * 撤掉卡筛的手柄(卡筛药丸上那枚记号)。
   */
  onStreamClear: ClickFn

  /**
   * 造节奏卡点击手柄的工厂(给它一张卡,换一只筛过去并滚过去的手柄)。
   */
  drillOf: (x: RankCard) => ClickFn
}

/**
 * QuotaSection(配额分区卡)的 props。
 */
export type QuotaSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 配额卡(按名次)。
   */
  cards: RankCard[]
}

/**
 * QuotaCard(一张配额卡)的 props。
 */
export type QuotaCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 这张卡。
   */
  card: RankCard
}

/**
 * CadenceSection(抽选节奏分区卡)的 props。
 */
export type CadenceSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 节奏卡(按名次)。
   */
  cards: RankCard[]

  /**
   * 折起来时多展开了几张。
   */
  extra: number

  /**
   * 展开一批。
   */
  onMore: ClickFn

  /**
   * 收起。
   */
  onFold: ClickFn

  /**
   * 造节奏卡点击手柄的工厂。
   */
  drillOf: (x: RankCard) => ClickFn
}

/**
 * CadenceCard(一张节奏卡)的 props。
 */
export type CadenceCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 这张卡。
   */
  card: RankCard

  /**
   * 点击手柄(筛事件流并滚过去)。
   */
  onClick: ClickFn
}

/**
 * NameLines(英文黑字 + 译名灰字两行)的 props。
 */
export type NameLinesIn = {
  /**
   * 英文名。
   */
  en: string

  /**
   * 译名('' = 不出第二行)。
   */
  gray: string
}

/**
 * StatGrid(卡上的数字格)的 props。
 */
export type StatGridIn = {
  /**
   * 各格(按出现顺序)。
   */
  cells: StatCellRow[]
}

/**
 * StatusTag(节奏状态胶囊)的 props。
 */
export type StatusTagIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 节奏状态(正常不出胶囊)。
   */
  status: RankCard['status']
}

/**
 * EventSection(事件流分区卡)的 props。
 */
export type EventSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 全部事件(筛选在本件里做)。
   */
  events: EventRow[]

  /**
   * 节奏卡(点中的那张按键找回来,取流名清单与药丸字)。
   */
  cadence: RankCard[]

  /**
   * 当前省筛。
   */
  prov: string

  /**
   * 当前点中的节奏卡键。
   */
  pick: string

  /**
   * 造省筛手柄的工厂。
   */
  provPickOf: (code: string) => ClickFn

  /**
   * 撤掉卡筛的手柄。
   */
  onStreamClear: ClickFn
}

/**
 * ProvTag(省标)的 props。
 */
export type ProvTagIn = {
  /**
   * 取词函数(联邦那一档要出「联邦」二字)。
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
   * 事件流里出现过的省码(已排好序;联邦那一档单独出,不在这里)。
   */
  provs: string[]

  /**
   * 当前省筛。
   */
  prov: string

  /**
   * 点中的节奏卡在药丸上的字('' = 没点卡,不出这枚药丸)。
   */
  pickLabel: string

  /**
   * 造省筛手柄的工厂。
   */
  provPickOf: (code: string) => ClickFn

  /**
   * 撤掉卡筛的手柄。
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
   * 界面语。
   */
  lang: Lang

  /**
   * 筛过的事件(新在前)。
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
   * 界面语。
   */
  lang: Lang

  /**
   * 这件事。
   */
  row: EventRow
}

/**
 * DrawLine(抽选那一行的后半截)的 props。
 */
export type DrawLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 这件事。
   */
  row: EventRow
}

/**
 * provsOf 的入参。
 */
export type EventsIn = {
  /**
   * 全部事件。
   */
  events: EventRow[]
}

/**
 * shownOf 的入参:全部事件 + 两格筛选。
 */
export type ShownOfIn = {
  /**
   * 全部事件。
   */
  events: EventRow[]

  /**
   * 当前省筛。
   */
  prov: string

  /**
   * 点中那张卡的流名清单(null = 没点卡,不按流筛)。
   */
  streams: string[] | null
}

/**
 * isProvMatch 的入参。
 */
export type ProvMatchIn = {
  /**
   * 这条事件的省码('' = 联邦)。
   */
  rowProv: string

  /**
   * 当前省筛。
   */
  prov: string
}

/**
 * isStreamMatch 的入参。
 */
export type StreamMatchIn = {
  /**
   * 这条事件的标题(= 流名)。
   */
  title: string

  /**
   * 点中那张卡的流名清单(null = 不按流筛)。
   */
  streams: string[] | null
}

/**
 * pickedOf 的入参:按键找回点中的卡。
 */
export type PickedOfIn = {
  /**
   * 全部节奏卡。
   */
  cards: RankCard[]

  /**
   * 点中的卡键('' = 没点)。
   */
  pick: string
}

/**
 * provLabelOf 的入参。
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
 * 卡片译名 / 药丸字 / 格子拼装的通用入参(取词函数 + 界面语 + 一张卡)。
 */
export type CardTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 这张卡。
   */
  card: RankCard
}

/**
 * 事件标题灰字的入参。
 */
export type EventGrayIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 这件事。
   */
  row: EventRow
}

/**
 * eeNameOf 的入参:联邦类别键查词。
 */
export type EeNameIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 类别键('' = 不是联邦类别)。
   */
  label: string
}

/**
 * 人数格名 / 人数串的入参。
 */
export type UnitTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 人数口径。
   */
  unit: string
}

/**
 * 带单位的数字格的入参。
 */
export type NumTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 词条键(插值 {n})。
   */
  key: string

  /**
   * 数字(null / 0 写「-」看 zeroDash)。
   */
  n: number | null

  /**
   * 0 是否也写「-」(今年抽选 0 次写「-」;人数 0 照写)。
   */
  zeroDash: boolean
}

/**
 * isScaleShown 的入参。
 */
export type ScaleIn = {
  /**
   * 分制标注。
   */
  scale: string
}

/**
 * invTextOf 的入参。
 */
export type InvTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这件事。
   */
  row: EventRow
}

/**
 * makeProvPickOf 的入参:两格筛选的落格。
 */
export type ProvPickIn = {
  /**
   * 省筛落格。
   */
  setProv: (v: string) => void

  /**
   * 卡筛落格(换省时清掉)。
   */
  setPick: (v: string) => void
}

/**
 * makeStreamClear 的入参。
 */
export type StreamClearIn = {
  /**
   * 卡筛落格。
   */
  setPick: (v: string) => void
}

/**
 * makeDrillOf 的入参:省筛与卡筛的落格(节奏卡一点要同时落两格)。
 */
export type DrillOfIn = {
  /**
   * 省筛落格。
   */
  setProv: (v: string) => void

  /**
   * 卡筛落格。
   */
  setPick: (v: string) => void
}
