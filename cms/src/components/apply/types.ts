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

  /**
   * 职位名中文译名(没有 / 过期 = 空串;2026-10-09 投递弹框换 section 形,英文在上、译名灰字在下)。
   */
  titleZh: string

  /**
   * 职位名韩文译名(没有 / 过期 = 空串)。
   */
  titleKo: string

  /**
   * 公司中文译名(没有 = 空串)。
   */
  companyZh: string

  /**
   * 公司韩文译名(没有 = 空串)。
   */
  companyKo: string

  /**
   * 城市中文译名(没有 = 空串)。
   */
  cityZh: string

  /**
   * 城市韩文译名(没有 = 空串)。
   */
  cityKo: string

  /**
   * 公司页 slug(没有 = 空串;2026-10-09 N 批点公司名开公司框)。
   */
  companySlug: string
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
   * 职位名底下那行灰字(取数面板算好的,见 ApplyStartPanel.titleSub)。
   */
  titleSub: string

  /**
   * 发出去了(投递区收起、投递记录表刷新)。
   * 2026-10-09 A 批:投递框切到已投递一步,并广播给「我的」页刷新投递表、出成功条。
   */
  onSent: SentFn
}

/**
 * ApplySection 的 props(2026-10-09 A 批:取数挪到投递框外壳,标题栏要用岗名;本件只按取数结果摆正文)。
 * 原 `makeSent` 的入参 SentIn 随「发出后收起投递区」退役。
 */
export type ApplySectionIn = {
  /**
   * 投递区取数面板。
   */
  s: ApplyStartPanel
}

/**
 * `applyIdOf` 的入参:地址栏的查询串与路径。
 */
export type ApplyIdIn = {
  /**
   * 查询串(`?apply=…` 或旧深链 `?sec=sjobs&job=…`)。
   */
  search: string

  /**
   * 路径(旧深链只在「我的」页认)。
   */
  path: string
}

/**
 * ApplySentSync 的 props。
 */
export type ApplySentSyncIn = {
  /**
   * 收到「发出去了」后的回调(「我的」页刷新投递表、写成功条)。
   */
  onSent: SentFn
}

/**
 * 「要投这一岗」事件带的那一份(职位桶广播,宿主收)。
 */
export type ApplyOpenDetail = {
  /**
   * 职位 id。
   */
  jobId: number
}

/**
 * `noteOpened` 的入参。
 */
export type OpenedIn = {
  /**
   * 宿主是不是刚挂上(第一次读地址栏)。
   */
  first: boolean

  /**
   * 上一次读到的职位 id(没有 = null)。
   */
  prev: number | null

  /**
   * 这一次读到的职位 id(没有 = null)。
   */
  id: number | null
}

/**
 * 投递框宿主面板(`useApplyHost` 交出)。
 */
export type ApplyHostPanel = {
  /**
   * 要投的职位 id(地址栏没带 = null,不弹框)。
   */
  jobId: number | null

  /**
   * 关框。
   */
  onClose: () => void
}

/**
 * ApplyModal 的 props。
 */
export type ApplyModalIn = {
  /**
   * 要投的职位 id。
   */
  jobId: number

  /**
   * 关框。
   */
  onClose: () => void
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

  /**
   * 第 3 步的逐项检查面板。
   */
  check: CheckPanel
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

  /**
   * 职位名底下那行灰字。
   */
  titleSub: string
}

/**
 * 界面语三字面量(各域自抄)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 交给 jobtitle 桶的那一份职位名(职位名与库里存好的两种译名;起始态没到 = 三格空串)。形同 jobtitle 的 TitledFact,本域自声明。
 */
export type ApplyTitled = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 库里存好的中文译名;'' = 没有。
   */
  titleZh: string

  /**
   * 库里存好的韩文译名;'' = 没有。
   */
  titleKo: string
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
 * 投递区的取数面板(useApplyStart 交出)。
 */
export type ApplyStartPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语(标题栏译名行按它取中文或韩文;英文界面不出)。
   */
  lang: Lang

  /**
   * 职位名底下那行灰字(jobtitle 桶全站口径:库里存好的 → 当场按岗现翻的;英文界面 / 都没有 = 空串)。
   * 标题栏与「职位信息」那一行共用这一份,只翻一次。
   */
  titleSub: string

  /**
   * 取数状态(none / busy / fail / ok / auth)。
   */
  load: string

  /**
   * 起始态(没到 = null)。
   */
  start: ApplyStartView | null

  /**
   * 没登录时叠的登录框登录完了:重取起始态并软刷顶栏。
   */
  onAuthDone: () => void
}

/**
 * `makeAuthRetry` 的入参。
 */
export type AuthRetryIn = {
  /**
   * 当前代数(取数副作用按它重跑)。
   */
  gen: number

  /**
   * 代数落格。
   */
  setGen: SetFn<number>

  /**
   * 取数状态落格。
   */
  setLoad: SetFn<string>

  /**
   * 软刷(Next 路由的 refresh;顶栏按新会话重画)。
   */
  refresh: () => void
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

/**
 * 逐项检查的一行(2026-10-08:发出前逐项打勾)。
 */
export type CheckRow = {
  /**
   * 项名词条键(也是勾选记号)。
   */
  key: string

  /**
   * 这一项的值(公司名 / 文件名 / 署名)。
   */
  value: string

  /**
   * 打开看的地址(没有 = 空串)。
   */
  href: string

  /**
   * 打开看那颗钮的词条键(没有 = 空串)。
   */
  linkKey: string

  /**
   * 能不能站内弹框预览(PDF 才能;.docx 简历仍新开标签页)。
   */
  previewable: boolean
}

/**
 * `checkRowsOf` 的入参。
 */
export type CheckRowsIn = {
  /**
   * 收件公司。
   */
  company: string

  /**
   * 附的简历文件名。
   */
  resumeName: string

  /**
   * 附的简历 id(没有 = null,不出打开钮)。
   */
  resumeId: number | null

  /**
   * 附的简历 MIME(PDF 才弹框预览;没简历给空串)。
   */
  resumeMime: string

  /**
   * 求职信附件名。
   */
  coverFile: string

  /**
   * 职位 id(求职信 PDF 按它取)。
   */
  jobId: number

  /**
   * 英文署名。
   */
  sender: string
}

/**
 * ApplyChip(附件胶囊里的文件名)的 props。
 */
export type ApplyChipIn = {
  /**
   * 文件名。
   */
  name: string
}

/**
 * ApplyMail(邮件形预览)的 props。
 */
export type ApplyCheckIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 逐项检查面板(投递区与今日待投各自装一份)。
   */
  p: CheckPanel
}

/**
 * 逐项检查面板:四行 + 勾 + 弹框预览 + 换简历 + 改信(2026-10-08 Frank「这两个应该都是可以弹框,并且可以替换吧」)。
 * 今日待投那边按同形自声明(queue 的 QueueCheckPanel),ApplyCheck 只认这个形。
 */
export type CheckPanel = {
  /**
   * 四行(收件人 / 简历 / 求职信 / 署名的值与 PDF 地址;邮件形按键取)。
   */
  rows: CheckRow[]

  /**
   * 邮件主题(与真发出去的同一个模板)。
   */
  subject: string

  /**
   * 邮件正文(信全文)。
   */
  body: string

  /**
   * 正在弹框预览的那一份;null = 没开。
   */
  preview: MaybeCheckPreview

  /**
   * 按行造「打开预览」手柄。
   */
  openOf: OpenOfFn

  /**
   * 关预览弹框。
   */
  onPreviewClose: () => void

  /**
   * 换简历下拉的选项(简历 id 串;少于两份不出下拉)。
   */
  resumeOpts: string[]

  /**
   * 下拉当前值(选中的简历 id 串;没选 = 空串)。
   */
  resumeValue: string

  /**
   * 下拉取名(id 串 → 文件名)。
   */
  resumeLabel: (v: string) => string

  /**
   * 换简历(下拉选中的 id 串)。
   */
  onResume: (v: string) => void

  /**
   * 「改信」(投递区回第 2 步;今日待投开改信弹框)。
   */
  onLetter: () => void
}

/**
 * 四行里的一行,或没有。
 */
export type MaybeCheckRow = CheckRow | null

/**
 * `rowOf`(按键取一行)的入参。
 */
export type RowOfIn = {
  /**
   * 四行。
   */
  rows: CheckRow[]

  /**
   * 要哪一行(项名词条键)。
   */
  key: string
}

/**
 * 弹框预览的那一份。
 */
export type CheckPreview = {
  /**
   * PDF 地址。
   */
  src: string

  /**
   * 标题(文件名)。
   */
  title: string
}

/**
 * 弹框预览的那一份,或没开。
 */
export type MaybeCheckPreview = CheckPreview | null

/**
 * 按行造「打开预览」手柄的函数。
 */
export type OpenOfFn = (row: CheckRow) => () => void

/**
 * `useCheckPreview` 交回的三格。
 */
export type CheckPreviewHook = {
  /**
   * 正在预览的那一份;null = 没开。
   */
  preview: MaybeCheckPreview

  /**
   * 按行造「打开预览」手柄。
   */
  openOf: OpenOfFn

  /**
   * 关弹框。
   */
  onPreviewClose: () => void
}

/**
 * `applyCheckOf`(装第 3 步逐项检查面板)的入参。
 */
export type ApplyCheckPanelIn = {
  /**
   * 本岗。
   */
  job: ApplyJobView

  /**
   * 简历清单。
   */
  resumes: ApplyResumeView[]

  /**
   * 选中的简历 id。
   */
  resumeId: number | null

  /**
   * 英文姓名。
   */
  name: string

  /**
   * 信全文(邮件正文)。
   */
  letter: string

  /**
   * 预览三格。
   */
  pv: CheckPreviewHook

  /**
   * 改选中的简历 id。
   */
  setResumeId: SetFn<number | null>

  /**
   * 改错误词条键。
   */
  setErr: SetFn<string>

  /**
   * 整机的可变格(「改信」= 回第 2 步)。
   */
  cells: ApplyCells
}

/**
 * 换简历下拉的一项。
 */
export type ResumePickItem = {
  /**
   * 简历 id。
   */
  id: number

  /**
   * 文件名。
   */
  name: string
}

/**
 * `applyChecksOf` 的入参。
 */
export type ApplyChecksIn = {
  /**
   * 本岗。
   */
  job: ApplyJobView

  /**
   * 简历清单。
   */
  resumes: ApplyResumeView[]

  /**
   * 选用的简历 id(还没选 = null)。
   */
  resumeId: number | null

  /**
   * 英文姓名(文本框里的,未去空白)。
   */
  name: string
}
