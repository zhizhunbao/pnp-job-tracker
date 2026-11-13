/**
 * gate 桶子桶 work 的形状:工作经历一段与各函数入参。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,能搜索的就弹框搜索」:形状本桶自声明、只声明真读的格,不取父桶;
 * 与父桶同名的(WorkPick)同形。
 *
 * @author Frank
 * @time 2026-11-12 16:00:00
 */

/**
 * 工作经历一段(界面上的七格;形同父桶 WorkPick 与 lib/quiz CvWork)。
 */
export type WorkPick = {
  /**
   * 这一段对应的职业码(同一个职业可能有几个码);空列 = 没选。
   */
  nocs: string[]

  /**
   * 职位名称;空串 = 没填。
   */
  title: string

  /**
   * 公司;空串 = 没填。
   */
  org: string

  /**
   * 城市;空串 = 没填。
   */
  city: string

  /**
   * 开始年月(输入中可能还不合形);空串 = 没填。
   */
  from: string

  /**
   * 结束年月;空串 = 没填或至今。
   */
  to: string

  /**
   * 做了什么;空串 = 没填。
   */
  desc: string
}

/**
 * workFormRowsOf 的入参:档案里的工作经历与做过的工作(职业码)。
 */
export type WorkSeedIn = {
  /**
   * 档案里存过的几段;空列 = 还没存过。
   */
  list: WorkPick[]

  /**
   * 做过的工作(职业码);还没存过几段的人按它一码一段起头。
   */
  nocs: string[]
}

/**
 * 「改某段某格」的入参。
 */
export type WorkCellIn = {
  /**
   * 第几段。
   */
  i: number

  /**
   * 哪一格:title / org / city / from / to / desc。
   */
  f: string
}

/**
 * makeWorkCell 的入参。
 */
export type WorkCellPickIn = {
  /**
   * 第几段与哪一格。
   */
  cell: WorkCellIn

  /**
   * 现在的几段。
   */
  rows: WorkPick[]

  /**
   * 写几段。
   */
  setRows: (v: WorkPick[]) => void
}

/**
 * workCellSetOf 的入参。
 */
export type WorkCellSetIn = {
  /**
   * 这一段。
   */
  row: WorkPick

  /**
   * 哪一格。
   */
  f: string

  /**
   * 新值。
   */
  v: string
}

/**
 * 加一段 / 删一段的入参。
 */
export type WorkRowsIn = {
  /**
   * 现在的几段。
   */
  rows: WorkPick[]

  /**
   * 写几段。
   */
  setRows: (v: WorkPick[]) => void

  /**
   * 第几段(删用;加时给 0)。
   */
  i: number
}

/**
 * makeWorkOcc 的入参(选职业框里点了一个职业)。
 */
export type WorkOccIn = {
  /**
   * 现在的几段。
   */
  rows: WorkPick[]

  /**
   * 写几段。
   */
  setRows: (v: WorkPick[]) => void

  /**
   * 正在给第几段选;没在选 = WORK_AT_NONE。
   */
  at: number

  /**
   * 写「正在给第几段选」(选完关框)。
   */
  setAt: (v: number) => void
}

/**
 * makeWorkOccOpenOf 的入参(点某一段的「选职业」)。
 */
export type WorkOccOpenIn = {
  /**
   * 现在的几段。
   */
  rows: WorkPick[]

  /**
   * 写「正在给第几段选」(开框)。
   */
  setAt: (v: number) => void

  /**
   * 把选职业控件里已选的码整份换成这一段的。
   */
  onReplace: (codes: string[]) => void
}

/**
 * workMarkedOf 的入参。
 */
export type WorkMarkedIn = {
  /**
   * 这一段。
   */
  row: WorkPick

  /**
   * 来自简历的标记(「字段:值」串)。
   */
  marks: string[]
}

/**
 * workFilledOf 的入参(「从简历填写」)。
 */
export type WorkFillIn = {
  /**
   * 现在的几段。
   */
  rows: WorkPick[]

  /**
   * 从简历提取到的几段(职业码、职位名称、公司、城市、起止年月、做了什么);没提到 = 空列。
   */
  jobs: WorkPick[]

  /**
   * 从简历提取到的职业码(没提到几段时用它一码一段)。
   */
  codes: string[]
}

/**
 * workFilledOf 的返回。
 */
export type WorkFillOut = {
  /**
   * 填过之后的几段(没填就是原来那几段)。
   */
  rows: WorkPick[]

  /**
   * 填上了没有。
   */
  filled: boolean

  /**
   * 这一次从简历带进来的职业码(给它们挂「来自简历」)。
   */
  codes: string[]
}

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值;本桶自抄,types 不许 import)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 摘要里的一行(形同父桶 PickedLine)。
 */
export type WorkLine = {
  /**
   * 行键(第几段)。
   */
  key: string

  /**
   * 这一行的字。
   */
  name: string

  /**
   * 职业是不是从简历来的(挂「来自简历」胶囊)。
   */
  from: boolean
}

/**
 * workNamesOf 的入参。
 */
export type WorkNamesIn = {
  /**
   * 几段。
   */
  rows: WorkPick[]

  /**
   * 职业码 → 显示名(选职业控件的名字表)。
   */
  titles: Record<string, string>
}

/**
 * workLinesOf 的入参。
 */
export type WorkLinesIn = {
  /**
   * 几段。
   */
  rows: WorkPick[]

  /**
   * 各段职业那一格的字(与几段一一对应)。
   */
  names: string[]

  /**
   * 来自简历的标记。
   */
  marks: string[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * workSumOf 的入参。
 */
export type WorkSumIn = {
  /**
   * 这一段。
   */
  row: WorkPick

  /**
   * 这一段职业那一格的字;没选 = 空串。
   */
  name: string

  /**
   * 取词函数。
   */
  t: TFn
}
