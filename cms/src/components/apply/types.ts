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
   * 是不是 Pro(2026-10-10 投递框三步:AI 写信试用撤,原 trialLeft / trialHere 两格退役;不是 Pro 点「按职位改写」弹升级框)。
   */
  pro: boolean

  /**
   * 回复邮箱(用户注册邮箱;「确认」页摆)。
   */
  replyTo: string
}

/**
 * 求职信单选的一项(2026-10-10 投递框三步:这一岗的草稿、按职位改写出来的、刚上传的、写过的信;「不附求职信」也是一项)。
 * 原 AI 写信试用那几格的形状(TrialCells / TrialPanel / TrialHook / TrialWriteIn / AiOpenIn)随试用撤。
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
   * 小注的词条键(写于 / 上传于 / 这一岗的草稿 / 按职位改写;没有 = 空串)。
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
 * 三栏对照框(「按职位改写」Pro 才开;原来的 / 职位要求 / 改写后)。
 */
export type RewriteView = {
  /**
   * 正在写。
   */
  busy: boolean

  /**
   * 原来的信(点改写那一刻选中的那封;没附 = 空串)。
   */
  before: string

  /**
   * 这一岗的 JD 全文(写信接口一并回的)。
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
 * 「确认」页的邮件预览与附件名。
 */
export type MailView = {
  /**
   * 收件人(公司名;雇主邮箱不出服务端)。
   */
  to: string

  /**
   * 邮件主题(与真发出去的同一个模板)。
   */
  subject: string

  /**
   * 邮件正文(短的那一段,不是求职信全文)。
   */
  body: string

  /**
   * 求职信附件名(不附 = 空串)。
   */
  cover: string
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
 * 2026-10-10 投递框三步:步数行换页签、求职信改单选 + 预览、AI 试用撤、第 3 步改「确认」。
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
   * 到过的最远一步的序号(这一步及之前的页签能点)。
   */
  reached: number

  /**
   * 英文姓名(档案里的,或「确认」页现填的)。
   */
  name: string

  /**
   * 档案里没有合规的英文姓名:「确认」页出输入框。
   */
  askName: boolean

  /**
   * 回复邮箱。
   */
  replyTo: string

  /**
   * 本人的简历清单。
   */
  resumes: ApplyResumeView[]

  /**
   * 选用的简历 id(还没选 = null)。
   */
  resumeId: number | null

  /**
   * 选中那份简历的原件地址(没选 = 空串)。
   */
  resumeSrc: string

  /**
   * 选中那份简历的 MIME(PDF 才在旁边画首页)。
   */
  resumeMime: string

  /**
   * 选中那份简历的文件名。
   */
  resumeName: string

  /**
   * 求职信单选的各项(这一岗的、改写的、上传的;「不附」另给。10-10 Frank「两处都改吧」:写过的信不再列)。
   */
  opts: LetterOpt[]

  /**
   * 「不附求职信」那一项。
   */
  noneOpt: LetterOpt

  /**
   * 选中哪一项(选项键)。
   */
  pick: string

  /**
   * 求职信(选中那一项的正文,可改)。
   */
  letter: string

  /**
   * 正在就地改信(预览换成多行框)。
   */
  editing: boolean

  /**
   * 信里写不进 PDF 的字。
   */
  badChars: string[]

  /**
   * 正在上传简历。
   */
  uploading: boolean

  /**
   * 正在上传求职信(抽字)。
   */
  letterBusy: boolean

  /**
   * 简历「按职位改写」Pro 点了:出「即将上线」一句。
   */
  soon: boolean

  /**
   * 升级框开着没有。
   */
  upsell: boolean

  /**
   * 付完回哪儿(回到本岗投递框)。
   */
  back: string

  /**
   * 三栏对照框(没开 = null)。
   */
  rw: MaybeRewrite

  /**
   * 「确认」页的邮件预览与附件名。
   */
  mail: MailView

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
   * 点页签(到过的才走)。
   */
  onTab: (key: string) => void

  /**
   * 改英文姓名。
   */
  onName: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 选用某一份简历的手柄(按 id 造)。
   */
  pickOf: PickOfFn

  /**
   * 简历的隐藏文件框挂上 / 卸下。
   */
  onInputMount: (el: HTMLInputElement | null) => void

  /**
   * 点「上传新简历」(弹文件框)。
   */
  onAdd: () => void

  /**
   * 简历文件框选好了文件(上传)。
   */
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 求职信的隐藏文件框挂上 / 卸下。
   */
  onLetterInputMount: (el: HTMLInputElement | null) => void

  /**
   * 点「上传求职信」(弹文件框)。
   */
  onLetterAdd: () => void

  /**
   * 求职信文件框选好了文件(抽字,成新的一项)。
   */
  onLetterFile: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 选求职信某一项的手柄(按项造)。
   */
  letterPickOf: LetterPickOfFn

  /**
   * 点预览右上「修改」。
   */
  onEdit: () => void

  /**
   * 改信。
   */
  onLetter: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

  /**
   * 信框失焦(存草稿)。
   */
  onLetterBlur: () => void

  /**
   * 求职信卡头「按职位改写」。
   */
  onLetterRewrite: () => void

  /**
   * 简历卡头「按职位改写」。
   */
  onResumeRewrite: () => void

  /**
   * 关升级框。
   */
  onUpsellClose: () => void

  /**
   * 对照框「再写一次」。
   */
  onRwAgain: () => void

  /**
   * 对照框「用这一版」。
   */
  onRwUse: () => void

  /**
   * 关对照框。
   */
  onRwClose: () => void

  /**
   * 主钮(下一步 / 投出)。
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
 * (ApplyJob 的 props ApplyJobIn 2026-10-10 随「职位信息」分区撤。)
 */

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
 * 2026-10-10 投递框三步:写信 / 试用几格撤,加页签、求职信单选、上传求职信、升级框与对照框几格。
 */
export type ApplyCells = {
  /**
   * 本岗。
   */
  job: ApplyJobView

  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 当前步。
   */
  step: string

  /**
   * 到过的最远一步的序号。
   */
  reached: number

  /**
   * 英文姓名。
   */
  name: string

  /**
   * 档案里没有合规的英文姓名(「确认」页现填,投出前存回档案)。
   */
  askName: boolean

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
   * 选用的简历 id。
   */
  resumeId: number | null

  /**
   * 三栏对照框。
   */
  rw: MaybeRewrite

  /**
   * 简历的隐藏文件框。
   */
  input: HTMLInputElement | null

  /**
   * 求职信的隐藏文件框。
   */
  letterInput: HTMLInputElement | null

  /**
   * 改步。
   */
  setStep: SetFn<string>

  /**
   * 改到过的最远一步。
   */
  setReached: SetFn<number>

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
   * 改「在上传简历」。
   */
  setUploading: SetFn<boolean>

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

  /**
   * 发出去了的回调。
   */
  onSent: SentFn
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
   * 信(可以是空串 = 不附)。
   */
  letter: string

  /**
   * 正在上传简历。
   */
  uploading: boolean

  /**
   * 正在上传求职信。
   */
  letterBusy: boolean
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
 * ApplyPick(单选一行)的 props(2026-10-10 起简历与求职信共用:文件名、默认小标、灰字小注)。
 */
export type ApplyPickIn = {
  /**
   * 单选组的名字(简历一组、求职信一组)。
   */
  group: string

  /**
   * 文件名(或「不附求职信」)。
   */
  label: string

  /**
   * 灰字小注(上传于 / 写于 / 只发简历)。
   */
  sub: string

  /**
   * 默认小标(没有 = 空串)。
   */
  tag: string

  /**
   * 选中了没有。
   */
  checked: boolean

  /**
   * 选它。
   */
  onPick: () => void
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

  /**
   * 收哪些文件(简历与求职信都是 PDF / Word)。
   */
  accept: string
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
 * 选求职信某一项的手柄工厂(按项造)。
 */
export type LetterPickOfFn = (o: LetterOpt) => () => void

/**
 * `makeSetTo` 的入参。
 */
export type SetToIn<T> = {
  /**
   * 落格。
   */
  set: SetFn<T>

  /**
   * 要设的值。
   */
  v: T
}

/**
 * `makeFile` 的入参。
 */
export type FileMakeIn = {
  /**
   * 整机的可变格。
   */
  cells: ApplyCells

  /**
   * 是求职信(抽字成一项);false = 简历(传到「我的简历」)。
   */
  letter: boolean
}

/**
 * `draftOf` 的入参。
 */
export type DraftOfIn = {
  /**
   * 整机的可变格。
   */
  cells: ApplyCells

  /**
   * 离页时发(fetch keepalive)。
   */
  keepalive: boolean
}

/**
 * `goStep` / `reach` 的入参。
 */
export type GoStepIn = {
  /**
   * 整机的可变格。
   */
  cells: ApplyCells

  /**
   * 去哪一步。
   */
  step: string
}

/**
 * `mailOf` 的入参。
 */
export type MailIn = {
  /**
   * 本岗。
   */
  job: ApplyJobView

  /**
   * 英文姓名。
   */
  name: string

  /**
   * 信(空串 = 不附)。
   */
  letter: string
}

/**
 * ApplyCard(一步一张分区卡:标题 + 卡头右侧钮 + 页签)的 props。
 */
export type ApplyCardIn = {
  /**
   * 整机面板。
   */
  p: ApplyPanel

  /**
   * 卡头右侧的钮(没有给 null)。
   */
  acts: React.ReactNode

  /**
   * 卡里的正文。
   */
  children: React.ReactNode
}

/**
 * ApplyShow(选中那份简历的首页预览)的 props。
 */
export type ApplyShowIn = {
  /**
   * 原件地址。
   */
  src: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * (2026-10-10 Frank「大于 1000 就 拆 子桶」:写信 / 信清单 / 抽字三个回包与求职信页几个函数的入参 —— LetterJson、LettersJson、
 * LetterItemJson、ExtractJson、LettersLoadIn、PastOptsIn、OptsTextIn、PickOptIn —— 随行为搬进子桶 letter/types.ts。)
 */
