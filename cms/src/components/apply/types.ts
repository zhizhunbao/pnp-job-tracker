/**
 * 投递区组件桶的形状:起始态(与 lib/apply 的 ApplyStart 同形,本桶自声明)、整机面板与各件 props、工厂入参、接口回包。
 * 2026-10-07 二改:信由模型按 JD 每岗写一封(填入位置与「我的模板」撤),第 1 步按岗选简历、就地添加简历。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形;形状本桶自己声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 设一格状态的函数(React 的 setState 形)。
 */
export type SetFn<T> = (v: T) => void

/**
 * 本岗(下发给投递区的那一份;不带雇主邮箱)。
 */
export type ApplyJobView = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名(没有 = 空串)。
   */
  company: string

  /**
   * 城市(没有 = 空串)。
   */
  city: string

  /**
   * 省码(没有 = 空串)。
   */
  province: string

  /**
   * 已下架。
   */
  closed: boolean

  /**
   * 库里有投递邮箱。
   */
  hasEmail: boolean
}

/**
 * 一份简历(选用哪一份)。
 */
export type ApplyResumeView = {
  /**
   * 简历 id。
   */
  id: number

  /**
   * 文件名。
   */
  fileName: string

  /**
   * MIME。
   */
  mime: string

  /**
   * 上传时刻(ISO)。
   */
  uploadedAt: string

  /**
   * 是不是默认那份。
   */
  isDefault: boolean
}

/**
 * 投递区的起始态(/api/apply/start 回的)。
 */
export type ApplyStartView = {
  /**
   * 本岗。
   */
  job: ApplyJobView

  /**
   * 本人的简历清单(默认那份在最前)。
   */
  resumes: ApplyResumeView[]

  /**
   * 英文署名(没填 = 空串)。
   */
  senderName: string

  /**
   * 求职信兜底模板(服务端写信挂了才用;本桶不读)。
   */
  template: string

  /**
   * 这一岗的投递状态(空串 = 还没开始)。
   */
  status: string

  /**
   * 草稿里这一岗的信(没草稿 = 空串)。
   */
  cover: string

  /**
   * 选用哪一份简历(一份都没有 = null)。
   */
  resumeId: number | null

  /**
   * 发出时刻(ISO;没发 = 空串)。
   */
  sentAt: string

  /**
   * AI 按 JD 写信还剩几个职位的试用(Pro 不限 = null;2026-10-07 批 C)。
   */
  trialLeft: number | null

  /**
   * 本岗用过 AI 写信没有(用过的再写不扣)。
   */
  trialHere: boolean
}

/**
 * 试用那几格(2026-10-07 批 C):整机写信时要改。
 */
export type TrialCells = {
  /**
   * 还剩几个职位的试用(Pro = null)。
   */
  left: number | null

  /**
   * 本岗用过 AI 写信没有。
   */
  here: boolean

  /**
   * 改剩几个。
   */
  setLeft: SetFn<number | null>

  /**
   * 改本岗用过没有。
   */
  setHere: SetFn<boolean>

  /**
   * 开 / 关升级框。
   */
  setUpsell: SetFn<boolean>
}

/**
 * 第 2 步读的试用面板。
 */
export type TrialPanel = {
  /**
   * 还剩几个职位的试用(Pro = null,不出余量)。
   */
  left: number | null

  /**
   * 试用用完、本岗也没用过:信框上出升级条,「按职位重写」改成开升级框。
   */
  locked: boolean

  /**
   * 升级框开着没有。
   */
  upsell: boolean

  /**
   * 付完回哪儿(回到本岗投递区)。
   */
  back: string

  /**
   * 开升级框。
   */
  onUpsell: () => void

  /**
   * 关升级框。
   */
  onUpsellClose: () => void
}

/**
 * useTrial 交回的两半:整机用的格、第 2 步读的面板。
 */
export type TrialHook = {
  /**
   * 整机用的格。
   */
  cells: TrialCells

  /**
   * 第 2 步读的面板。
   */
  panel: TrialPanel
}

/**
 * `trialAfterWrite` 的入参。
 */
export type TrialWriteIn = {
  /**
   * 整机的可变格。
   */
  cells: ApplyCells

  /**
   * 写信回包。
   */
  got: LetterJson
}

/**
 * `isAiOpenOf` 的入参。
 */
export type AiOpenIn = {
  /**
   * 还剩几个职位的试用(Pro = null)。
   */
  left: number | null

  /**
   * 本岗用过 AI 写信没有。
   */
  here: boolean
}

/**
 * 发出去了交给外面的那一份(「我的」页拿它出成功条;2026-10-08)。
 */
export type ApplySentOut = {
  /**
   * 发给了哪家(公司名)。
   */
  company: string
}

/**
 * 发出去了的回调。
 */
export type SentFn = (x: ApplySentOut) => void

/**
 * ApplyFlow(四步本体)的 props;useApply 同收这一份。
 */
export type ApplyPageIn = {
  /**
   * 起始态。
   */
  start: ApplyStartView

  /**
   * 发出去了(投递区收起、投递记录表刷新)。
   */
  onSent: SentFn
}

/**
 * ApplySection 的 props。
 */
export type ApplySectionIn = {
  /**
   * 发出去了(由「我的」页拿去刷新投递记录表、出成功条)。
   */
  onSent: SentFn
}

/**
 * `makeSent` 的入参。
 */
export type SentIn = {
  /**
   * 「发出去了」落格(投递区收起)。
   */
  setSent: SetFn<boolean>

  /**
   * 外面的回调(刷新表、出成功条)。
   */
  onSent: SentFn
}

/**
 * 整机面板(`useApply` 交出;各件只读它)。
 */
export type ApplyPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗。
   */
  job: ApplyJobView

  /**
   * 当前步。
   */
  step: string

  /**
   * 当前步在前三步里的序号。
   */
  stepIndex: number

  /**
   * 文本框里的英文姓名。
   */
  name: string

  /**
   * 本人的简历清单。
   */
  resumes: ApplyResumeView[]

  /**
   * 选用的简历 id(还没选 = null)。
   */
  resumeId: number | null

  /**
   * 求职信。
   */
  letter: string

  /**
   * 正在按 JD 写信。
   */
  writing: boolean

  /**
   * 正在上传简历。
   */
  uploading: boolean

  /**
   * 信里写不进 PDF 的字。
   */
  badChars: string[]

  /**
   * 选用那一份的文件名(预览一步列附件;还没选 = 空串)。
   */
  resumeName: string

  /**
   * 求职信 PDF 的地址(本人预览)。
   */
  coverHref: string

  /**
   * 求职信附件名。
   */
  coverFile: string

  /**
   * 错误 / 提示词条键(没有 = 空串)。
   */
  err: string

  /**
   * 在途(存草稿 / 发信)。
   */
  busy: boolean

  /**
   * 主钮的词条键(已投递 = 空串)。
   */
  nextKey: string

  /**
   * 主钮能不能点。
   */
  canNext: boolean

  /**
   * 改英文姓名。
   */
  onName: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 选用某一份简历的手柄(按 id 造)。
   */
  pickOf: PickOfFn

  /**
   * 隐藏的文件框挂上 / 卸下。
   */
  onInputMount: (el: HTMLInputElement | null) => void

  /**
   * 点「添加简历」(弹文件框)。
   */
  onAdd: () => void

  /**
   * 文件框选好了文件(上传)。
   */
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 改信。
   */
  onLetter: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

  /**
   * 信框失焦(存草稿)。
   */
  onLetterBlur: () => void

  /**
   * 点「按职位重写」。
   */
  onRewrite: () => void

  /**
   * 试用面板(2026-10-07 批 C)。
   */
  trial: TrialPanel

  /**
   * 主钮(下一步 / 预览 / 发送)。
   */
  onNext: () => void

  /**
   * 上一步。
   */
  onBack: () => void
}

/**
 * 各步小件的 props。
 */
export type ApplyStepIn = {
  /**
   * 整机面板。
   */
  p: ApplyPanel
}

/**
 * ApplyJob 的 props。
 */
export type ApplyJobIn = {
  /**
   * 本岗。
   */
  job: ApplyJobView
}

/**
 * `startStepOf` 的入参。
 */
export type StartStepIn = {
  /**
   * 这一岗的投递状态。
   */
  status: string

  /**
   * 草稿里的信。
   */
  cover: string

  /**
   * 选用哪一份简历。
   */
  resumeId: number | null

  /**
   * 英文署名。
   */
  name: string
}

/**
 * 存草稿的请求体素材。
 */
export type DraftIn = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 英文署名。
   */
  name: string

  /**
   * 信。
   */
  letter: string

  /**
   * 选用的简历 id。
   */
  resumeId: number | null

  /**
   * 离页时发(fetch keepalive)。
   */
  keepalive: boolean
}

/**
 * 写请求的结果(错误词条键;成功 = 空串)。
 */
export type ErrOut = Promise<string>

/**
 * 接口错误体(只读 error 一格)。
 */
export type ErrJson = {
  /**
   * 错误码。
   */
  error?: string
}

/**
 * 写信接口的回包。
 */
export type LetterJson = {
  /**
   * 信。
   */
  text?: string

  /**
   * 是不是模型按 JD 写的(false = 写不成,给的兜底模板信)。
   */
  ai?: boolean

  /**
   * 写完还剩几个职位的试用(Pro = null);缺席 = 接口没给。
   */
  left?: number | null

  /**
   * 错误码。
   */
  error?: string
}

/**
 * 简历清单接口的回包。
 */
export type ResumeFilesJson = {
  /**
   * 清单。
   */
  items?: ApplyResumeView[]
}

/**
 * 上传接口的回包(只读新那份的 id)。
 */
export type UploadJson = {
  /**
   * 新那份的元信息。
   */
  meta?: UploadMetaJson
}

/**
 * 上传回包里的元信息(只读 id)。
 */
export type UploadMetaJson = {
  /**
   * 简历 id。
   */
  id?: number
}

/**
 * 整机的可变格(工厂们共用一份落格)。
 */
export type ApplyCells = {
  /**
   * 本岗。
   */
  job: ApplyJobView

  /**
   * 当前步。
   */
  step: string

  /**
   * 文本框里的英文姓名。
   */
  name: string

  /**
   * 信。
   */
  letter: string

  /**
   * 现在这封信是按哪一份简历写的(还没写 = null)。
   */
  letterFor: number | null

  /**
   * 选用的简历 id。
   */
  resumeId: number | null

  /**
   * 隐藏的文件框。
   */
  input: HTMLInputElement | null

  /**
   * 改步。
   */
  setStep: SetFn<string>

  /**
   * 改信。
   */
  setLetter: SetFn<string>

  /**
   * 改「这封信按哪份简历写的」。
   */
  setLetterFor: SetFn<number | null>

  /**
   * 改简历清单。
   */
  setResumes: SetFn<ApplyResumeView[]>

  /**
   * 改选用的简历。
   */
  setResumeId: SetFn<number | null>

  /**
   * 改错误。
   */
  setErr: SetFn<string>

  /**
   * 改在途。
   */
  setBusy: SetFn<boolean>

  /**
   * 改「在写信」。
   */
  setWriting: SetFn<boolean>

  /**
   * 改「在上传」。
   */
  setUploading: SetFn<boolean>

  /**
   * 发出去了的回调。
   */
  onSent: SentFn

  /**
   * 试用那几格(2026-10-07 批 C)。
   */
  trial: TrialCells
}

/**
 * `resumeNameOf` 的入参。
 */
export type ResumeNameIn = {
  /**
   * 简历清单。
   */
  resumes: ApplyResumeView[]

  /**
   * 选用的简历 id。
   */
  resumeId: number | null
}

/**
 * `canNextOf` 的入参。
 */
export type CanNextIn = {
  /**
   * 当前步。
   */
  step: string

  /**
   * 坏字。
   */
  badChars: string[]

  /**
   * 信。
   */
  letter: string

  /**
   * 正在写信。
   */
  writing: boolean

  /**
   * 正在上传。
   */
  uploading: boolean
}

/**
 * 只收整机可变格的工厂 / 动作的入参。
 */
export type PageHideIn = {
  /**
   * 整机的可变格。
   */
  cells: ApplyCells
}

/**
 * `locationOf` 的入参。
 */
export type LocationIn = {
  /**
   * 城市。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 分隔。
   */
  sep: string
}

/**
 * 投递区的取数面板(useApplyStart 交出)。
 */
export type ApplyStartPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 取数状态(none / busy / fail / ok)。
   */
  load: string

  /**
   * 起始态(没到 = null)。
   */
  start: ApplyStartView | null
}

/**
 * `loadStart` 的入参。
 */
export type LoadStartIn = {
  /**
   * 职位 id(地址栏没带 = null)。
   */
  jobId: number | null

  /**
   * 取数状态落格。
   */
  setLoad: SetFn<string>

  /**
   * 起始态落格。
   */
  setStart: SetFn<ApplyStartView | null>
}

/**
 * `makePickOf` 的入参。
 */
export type PickIn = {
  /**
   * 选用的简历落格。
   */
  setResumeId: SetFn<number | null>

  /**
   * 错误落格(选了就清掉提示)。
   */
  setErr: SetFn<string>
}

/**
 * 按 id 造手柄的工厂。
 */
export type PickOfFn = (id: number) => () => void

/**
 * `uploadedTextOf` 的入参。
 */
export type UploadedTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 上传时刻(ISO)。
   */
  at: string
}

/**
 * `upload` 的入参。
 */
export type UploadIn = {
  /**
   * 整机的可变格。
   */
  cells: ApplyCells

  /**
   * 选好的文件。
   */
  file: File
}

/**
 * ApplyPick(一份简历一行)的 props。
 */
export type ApplyPickIn = {
  /**
   * 这一份。
   */
  r: ApplyResumeView

  /**
   * 选中了没有。
   */
  checked: boolean

  /**
   * 选它。
   */
  onPick: () => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ApplyFileInput(隐藏文件框)的 props。
 */
export type ApplyFileInputIn = {
  /**
   * 挂上 / 卸下回调(把节点交给整机,由「添加简历」钮代点)。
   */
  onMount: (el: HTMLInputElement | null) => void

  /**
   * 选好文件。
   */
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void
}

