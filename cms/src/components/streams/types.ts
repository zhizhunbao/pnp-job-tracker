/**
 * streams 域(资讯 →「通道与门槛」页)的自足形状:整机面板、省份胶囊行的 props 与手柄工厂的入参。
 * 门槛卡的形状不在这里:卡住 pnp 桶(PnpProvStreams),本域只递界面语言与省码两格。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言(三字面量本域自抄)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 无参无返的点击手柄(省份胶囊的 onClick)。
 */
export type ClickFn = () => void

/**
 * 逐省的手柄工厂:给省码,换一只切到那个省的手柄。
 */
export type ProvPickOfFn = (code: string) => ClickFn

/**
 * useStreams 交回的面板。
 */
export type StreamsPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(门槛卡的灰字直白名挑哪一语)。
   */
  lang: Lang

  /**
   * 当前省码;'' = 还没选(首帧)。
   */
  prov: string

  /**
   * 逐省的手柄工厂。
   */
  provPickOf: ProvPickOfFn
}

/**
 * ProvChips 的 props。
 */
export type ProvChipsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前省码。
   */
  prov: string

  /**
   * 逐省的手柄工厂。
   */
  provPickOf: ProvPickOfFn
}

/**
 * provHrefOf 的入参(2026-10-04 页签带省份)。
 */
export type ProvHrefIn = {
  /**
   * 页签地址(站内路径)。
   */
  base: string

  /**
   * 当前省码;'' = 还没选。
   */
  prov: string
}

/**
 * makeProvPickOf 与 applyStartProv 的入参。
 */
export type ProvPickIn = {
  /**
   * 省份落格。
   */
  setProv: (v: string) => void
}

/**
 * 教育经历一段(「申请步骤」页教育经历卡一行;'' = 这一格没选;2026-10-11 申请步骤分区筛选批 1)。
 */
export type EduRow = {
  /**
   * 院校所在地:省码或 abroad。
   */
  prov: string

  /**
   * 性质:public / private。
   */
  kind: string

  /**
   * 课程时长:y1 / y2 / y3 / master。
   */
  len: string
}

/**
 * 教育经历一段里的哪一格。
 */
export type EduField = 'prov' | 'kind' | 'len'

/**
 * 「申请步骤」页的筛选状态(整份跟着地址走)。
 */
export type StepsState = {
  /**
   * 省码,或 all = 全部省份;'' = 首帧还没定。
   */
  prov: string

  /**
   * 身份词;'' = 没选。
   */
  who: string

  /**
   * 教育经历(至少一段,至多 EDU_ROWS_MAX 段;没填的段三格都是 '')。
   */
  edu: EduRow[]
}

/**
 * 递给 pnp 桶步骤正文的筛选条件(与 pnp PnpStepsFilter 同形)。
 */
export type StepsFilter = {
  /**
   * 身份词;'' = 没选。
   */
  who: string

  /**
   * 教育经历。
   */
  edu: EduRow[]
}

/**
 * 换值回调(下拉 onChange 的形)。
 */
export type PickFn = (v: string) => void

/**
 * 下拉值 → 显示名。
 */
export type LabelFn = (v: string) => string

/**
 * 筛选手柄工厂与 applyStartSteps 的入参:当前状态与落格。
 */
export type StepsStateIn = {
  /**
   * 当前状态。
   */
  s: StepsState

  /**
   * 状态落格。
   */
  setS: (v: StepsState) => void
}

/**
 * makeEduPickOf 交回的工厂:给第几段、哪一格,换一只换值回调。
 */
export type EduPickOfFn = (i: number, field: EduField) => PickFn

/**
 * 逐段的删除手柄工厂。
 */
export type EduRemoveOfFn = (i: number) => ClickFn

/**
 * 逐身份的胶囊手柄工厂(再点一次已选的 = 取消)。
 */
export type WhoPickOfFn = (who: string) => ClickFn

/**
 * useSteps 交回的面板。
 */
export type StepsPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 当前状态。
   */
  s: StepsState

  /**
   * 递给步骤正文的筛选条件。
   */
  filter: StepsFilter

  /**
   * 逐省手柄工厂(含 all)。
   */
  provPickOf: ProvPickOfFn

  /**
   * 逐身份手柄工厂。
   */
  whoPickOf: WhoPickOfFn

  /**
   * 清空身份。
   */
  clearWho: ClickFn

  /**
   * 逐段逐格换值工厂。
   */
  eduPickOf: EduPickOfFn

  /**
   * 再加一段。
   */
  addEdu: ClickFn

  /**
   * 逐段删除工厂。
   */
  eduRemoveOf: EduRemoveOfFn

  /**
   * 清空教育经历。
   */
  clearEdu: ClickFn

  /**
   * 院校所在地下拉的显示名。
   */
  eduProvLabel: LabelFn

  /**
   * 公立或私立下拉的显示名。
   */
  eduKindLabel: LabelFn

  /**
   * 课程时长下拉的显示名。
   */
  eduLenLabel: LabelFn
}

/**
 * 筛选卡三件的 props(整机面板原样递进)。
 */
export type StepsCardIn = {
  /**
   * useSteps 的面板。
   */
  p: StepsPanel
}

/**
 * 教育经历一行的 props。
 */
export type EduLineIn = {
  /**
   * useSteps 的面板。
   */
  p: StepsPanel

  /**
   * 第几段(从 0 起)。
   */
  i: number

  /**
   * 这一段。
   */
  row: EduRow
}

/**
 * 造显示名函数的入参。
 */
export type LabelOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 词条键头(拼选项值)。
   */
  head: string
}

/**
 * 解析地址里一段教育经历的入参。
 */
export type EduCellsIn = {
  /**
   * 段内三格(地点.性质.时长 拆开后)。
   */
  cells: string[]
}

/**
 * 把一格的值认进词表的入参。
 */
export type PickValidIn = {
  /**
   * 地址里的原值(可能缺席)。
   */
  v: string | null

  /**
   * 词表。
   */
  allowed: readonly string[]
}

/**
 * 换一段一格的入参。
 */
export type EduWithIn = {
  /**
   * 原教育经历。
   */
  edu: EduRow[]

  /**
   * 第几段。
   */
  i: number

  /**
   * 哪一格。
   */
  field: EduField

  /**
   * 新值。
   */
  v: string
}

/**
 * cellAtOf 的入参。
 */
export type CellAtIn = {
  /**
   * 段内各格。
   */
  cells: string[]

  /**
   * 第几格(从 0 起)。
   */
  i: number
}

/**
 * applyStartSteps 的入参:只要状态落格(挂载时认地址,不读旧状态)。
 */
export type StepsSetIn = {
  /**
   * 状态落格。
   */
  setS: (v: StepsState) => void
}
