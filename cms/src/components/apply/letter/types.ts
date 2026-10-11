/**
 * apply 子桶 letter 的形状:求职信单选项、对照框、子桶读的那几格整机状态(父桶 ApplyCells 的子集,本桶自声明)、
 * 接口回包与各函数入参。
 * 2026-10-10 Frank「大于 1000 就 拆 子桶」:apply 桶首个子桶;形状本桶自声明、只声明真读的格,不取父桶。
 * 同日 Frank「两处都改吧」:单选项不再列给别的岗写过的信(信里是别家公司名),只列这一岗的草稿、本次在框里上传 / 改写的、
 * 不附求职信 —— 拉写过的信那一族(loadLetters / pastOptsOf、信清单接口地址、「写于」小注与键头、两格 past 状态)撤回。
 *
 * @author Frank
 * @time 2026-10-10 18:00:00
 */

/**
 * 设一格状态的函数(React 的 setState 形)。
 */
export type SetFn<T> = (v: T) => void

/**
 * 求职信单选的一项(这一岗的草稿、按职位改写出来的、刚上传的、写过的信;「不附求职信」也是一项)。形同父桶 LetterOpt。
 */
export type LetterOpt = {
  /**
   * 选项身份键(none / draft / ai / up<上传时刻>)。
   */
  key: string

  /**
   * 文件名(「不附求职信」为空串,界面取词)。
   */
  name: string

  /**
   * 小注的词条键(写于 / 上传于 / 这一岗的草稿 / 按职位改写)。
   */
  subKey: string

  /**
   * 小注里的日期(ISO;不带日期 = 空串)。
   */
  subAt: string

  /**
   * 信的全文(「不附求职信」= 空串)。
   */
  text: string
}

/**
 * 三栏对照框(原来的 / 职位要求 / 改写后)。形同父桶 RewriteView。
 */
export type RewriteView = {
  /**
   * 正在写。
   */
  busy: boolean

  /**
   * 原来的信。
   */
  before: string

  /**
   * 这一岗的 JD 全文。
   */
  jd: string

  /**
   * 改写后的信(没写成 = 空串)。
   */
  after: string

  /**
   * 没写成的词条键(没有 = 空串)。
   */
  err: string
}

/**
 * 三栏对照框,或没开。
 */
export type MaybeRewrite = RewriteView | null

/**
 * 本岗里子桶读的两格。
 */
export type LetterJob = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 公司名(附件名按它起)。
   */
  company: string
}

/**
 * 起始态里子桶读的两格(`draftOptsOf` 的入参)。
 */
export type LetterStart = {
  /**
   * 本岗。
   */
  job: LetterJob

  /**
   * 草稿里这一岗的信(没草稿 = 空串)。
   */
  cover: string
}

/**
 * 子桶读写的那几格整机状态(父桶 ApplyCells 的子集;父桶把整份递进来)。
 */
export type LetterCells = {
  /**
   * 本岗。
   */
  job: LetterJob

  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 英文姓名(写信接口要署名)。
   */
  name: string

  /**
   * 信。
   */
  letter: string

  /**
   * 选中的求职信项。
   */
  pick: string

  /**
   * 这一岗的、改写的、上传的那几项。
   */
  mine: LetterOpt[]

  /**
   * 选用的简历 id(写信按它)。
   */
  resumeId: number | null

  /**
   * 三栏对照框。
   */
  rw: MaybeRewrite

  /**
   * 改信。
   */
  setLetter: SetFn<string>

  /**
   * 改选中的求职信项。
   */
  setPick: SetFn<string>

  /**
   * 改「这一岗的、改写的、上传的」那几项。
   */
  setMine: SetFn<LetterOpt[]>

  /**
   * 开 / 关就地改信。
   */
  setEditing: SetFn<boolean>

  /**
   * 改错误。
   */
  setErr: SetFn<string>

  /**
   * 改「在上传求职信」。
   */
  setLetterBusy: SetFn<boolean>

  /**
   * 开 / 关升级框。
   */
  setUpsell: SetFn<boolean>

  /**
   * 出「即将上线」。
   */
  setSoon: SetFn<boolean>

  /**
   * 改对照框。
   */
  setRw: SetFn<MaybeRewrite>
}

/**
 * 选求职信某一项的手柄工厂(按项造)。
 */
export type LetterPickOfFn = (o: LetterOpt) => () => void

/**
 * 写信接口的回包。
 */
export type LetterJson = {
  /**
   * 信。
   */
  text?: string

  /**
   * 是不是模型按 JD 写的(false = 写不成)。
   */
  ai?: boolean

  /**
   * 这一岗的 JD 全文(对照框「职位要求」栏);缺席 = 接口没给。
   */
  jd?: string

  /**
   * 错误码。
   */
  error?: string
}

/**
 * 抽字接口的回包(上传求职信)。
 */
export type ExtractJson = {
  /**
   * 抽出来的字;缺席 = 没抽成。
   */
  text?: string
}

/**
 * `optsWithTextOf` 的入参。
 */
export type OptsTextIn = {
  /**
   * 几项。
   */
  opts: LetterOpt[]

  /**
   * 改哪一项。
   */
  key: string

  /**
   * 新正文。
   */
  text: string
}

/**
 * `pickOpt` 的入参。
 */
export type PickOptIn = {
  /**
   * 整机的可变格。
   */
  cells: LetterCells

  /**
   * 选哪一项。
   */
  opt: LetterOpt

  /**
   * 顺带放进「这一岗的、改写的、上传的」那几项(新写的、新传的)。
   */
  put: boolean
}

/**
 * `uploadLetter` 的入参。
 */
export type LetterUploadIn = {
  /**
   * 整机的可变格。
   */
  cells: LetterCells

  /**
   * 选好的文件。
   */
  file: File
}
