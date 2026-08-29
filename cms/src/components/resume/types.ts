/**
 * resume 域(简历对照 JD)的形状。三段律走全:三条接口的**线格式**(XxxJson,
 * 缺席是协议语义所以留 `?:`)→ 行构造器洗出的**事实**(MatchRowFact / MatchFact,
 * 每一格都已经算成文本与色档类)→ 单元格组件只读算好的那一格。
 * 取词函数、语言码、列声明本域自己声明(宪法 08-25「types 自声明」,结构相同即兼容)。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */

/**
 * 界面语言码 —— 本域自抄(全站三门语言)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * `t(key, vars)` 的插值表({n} → 值)。
 */
export type TVars = Record<string, string | number>

/**
 * 取词函数。本域只用它的调用形态(i18n 域那份还挂着一个只读 lang 字段,我们一格都不读)。
 */
export type TFn = (key: string, vars?: TVars) => string

/**
 * 无参无返的点击手柄(上传钮、对照钮、升级钮都是这一形)。
 */
export type ClickFn = () => void

/**
 * 粘贴框的改值手柄。
 */
export type TextChangeFn = (e: React.ChangeEvent<HTMLTextAreaElement>) => void

/**
 * 存档勾选框的改值手柄。
 */
export type CheckChangeFn = (e: React.ChangeEvent<HTMLInputElement>) => void

/**
 * 文件选择框的改值手柄(选完一个文件就触发)。
 */
export type FilePickFn = (e: React.ChangeEvent<HTMLInputElement>) => void

/**
 * effect 的清理函数(离场时把「还在场」的旗子放倒)。
 */
export type CleanupFn = () => void

/**
 * 预填 effect 的体(装上就跑,返回清理)。
 */
export type PrefillFn = () => CleanupFn

/**
 * 「组件还在场吗」的旗子。异步回来时组件可能已经关了,那时不许再拨 state。
 * 写成一个容器对象而不是布尔:闭包里要能读到**后来**被改成 false 的那一份。
 */
export type LiveFlag = {
  /**
   * 还在场就是 true;清理函数把它放倒。
   */
  on: boolean
}

/**
 * 「用户自己动过手没有」的旗子(ref 的形状)。动过手就别拿存档盖掉他的输入。
 */
export type TouchedRef = {
  /**
   * 用户已经自己贴过或传过文件。
   */
  current: boolean
}

/**
 * 文件选择框的 ref 形状(上传钮借它去开系统的选文件窗)。
 */
export type FileRef = {
  /**
   * 挂上的那个输入框;还没上屏时是 null。
   */
  current: HTMLInputElement | null
}

/**
 * 关闭弹框的回调。
 */
export type CloseFn = () => void

/**
 * `/api/users/me` 档案里本域真读的两格(线格式:两格都可能压根没存过)。
 */
export type ProfileJson = {
  /**
   * 上次存下的简历正文。
   */
  resumeText?: string | null

  /**
   * 存下的时刻(ISO 串;显示成日期挂在预填小注里)。
   */
  resumeSavedAt?: string | null
}

/**
 * `/api/users/me` 里本域真读的那一层(线格式)。
 */
export type MeUserJson = {
  /**
   * 这个人的档案;没建过档就缺席。
   */
  profile?: ProfileJson | null
}

/**
 * `/api/users/me` 的响应体(线格式:未登录时 user 缺席)。
 */
export type MeRespJson = {
  /**
   * 登录人。
   */
  user?: MeUserJson | null
}

/**
 * `/api/resume/extract` 的响应体(线格式)。
 */
export type ExtractRespJson = {
  /**
   * 抽出来的纯文本;失败时缺席。
   */
  text?: string | null

  /**
   * 错误码(size / scan / 其余);成功时缺席。
   */
  error?: string | null
}

/**
 * 对照结果里的一条要求(线格式)。
 */
export type MatchRowJson = {
  /**
   * 这条工作要求的原文。
   */
  req?: string | null

  /**
   * 简历里找到了没有。
   */
  hit?: boolean | null

  /**
   * 判定备注(命中说在哪、缺失说缺什么)。
   */
  note?: string | null
}

/**
 * `/api/resume/match` 的响应体(线格式:免费档不下发 rewrite,所以它是缺席不是空串)。
 */
export type MatchRespJson = {
  /**
   * 免费档看得见的那几条。
   */
  visible?: MatchRowJson[] | null

  /**
   * 打码区还剩几条(数字真、纹理假 —— 正文服务端根本不下发)。
   */
  lockedN?: number | null

  /**
   * 命中条数。
   */
  hitN?: number | null

  /**
   * 要求总条数。
   */
  total?: number | null

  /**
   * 付费档的简历重写建议;免费档缺席。
   */
  rewrite?: string | null

  /**
   * 今天还剩几次;付费档不限次,给 null。
   */
  left?: number | null

  /**
   * 这次有没有把简历存进档案(用户勾了才会是 true)。
   */
  saved?: boolean | null

  /**
   * 错误码;成功时缺席。
   */
  error?: string | null
}

/**
 * 对照结果的一条**展示行**:每一格都已经算成能直接渲的东西。
 */
export type MatchRowFact = {
  /**
   * 行身份(按名次编,要求原文可能重复所以不拿它当键)。
   */
  key: string

  /**
   * 左列:这条工作要求的原文。
   */
  req: string

  /**
   * 右列的整句:记号 + 判定备注。
   */
  text: string

  /**
   * 右列的色档类名(命中绿、缺失红)。
   */
  cls: string
}

/**
 * 洗净的整份对照结果。
 */
export type MatchFact = {
  /**
   * 看得见的那几条(缺的排前、命中在后 —— 顺序由服务端定,本域不重排)。
   */
  rows: MatchRowFact[]

  /**
   * 打码区行数。
   */
  lockedN: number

  /**
   * 命中条数。
   */
  hitN: number

  /**
   * 要求总条数。
   */
  total: number

  /**
   * 简历重写建议;空串 = 这一档没有(免费档不生成)。
   */
  rewrite: string

  /**
   * 今天还剩几次;null = 不限次(付费档),那一行整个不出。
   */
  left: number | null

  /**
   * 这次存没存进档案。
   */
  saved: boolean
}

/**
 * 单元格渲染器的形状 —— 与 table 域列声明的 render 位逐字对齐
 * (一个参数收这一行,哑组件的签名天然就是它)。
 */
export type CellFn<T> = (r: T) => React.ReactNode

/**
 * 一列的声明 —— 本域自声明真正用到的四项(table 域那份还有排序、对齐等,本域不用)。
 */
export type MatchCol<T> = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头文案。
   */
  label: React.ReactNode

  /**
   * 单元格渲染器。
   */
  render: CellFn<T>

  /**
   * 显式列宽(百分比);不给就交给自动量宽。
   */
  width?: string
}

/**
 * ResumeMatchModal 的 props(桶门契约,消费者是职位详情页的投递栏)。
 */
export type ResumeMatchIn = {
  /**
   * 这个岗的库内 id(JD 没随手传下来时,服务端按它兜一次全文)。
   */
  jobId: string | number

  /**
   * 职位描述全文(页面已经拿到的那份)。
   */
  jd: string

  /**
   * 登录了没有(没登录只出登录墙 —— 匿名不给,同时喂注册漏斗)。
   */
  loggedIn: boolean

  /**
   * 关闭弹框。
   */
  onClose: CloseFn
}

/**
 * useResumeMatch 的入参。
 */
export type ResumeMatchHookIn = {
  /**
   * 这个岗的库内 id。
   */
  jobId: string | number

  /**
   * 职位描述全文。
   */
  jd: string

  /**
   * 登录了没有(登录了才去拉存档预填)。
   */
  loggedIn: boolean
}

/**
 * useResumeMatch 交回的整机面板:一台机器管取存档、贴文本、传文件、发对照四件事
 * —— 它们互相咬合(传文件回填粘贴框、贴文本要撤掉存档小注),拆开就得互相穿参数。
 */
export type ResumeMatchPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 粘贴框现值。
   */
  resume: string

  /**
   * 对照请求在飞。
   */
  busy: boolean

  /**
   * 文件正在读/解析。
   */
  reading: boolean

  /**
   * 当前错误文案;空串 = 没错误。
   */
  err: string

  /**
   * 预填那份存档的存入时刻;空串 = 现在框里的不是存档那份。
   */
  archAt: string

  /**
   * 勾了「存进档案」没有(默认不勾 —— E11-08 的隐私红线)。
   */
  save: boolean

  /**
   * 对照结果;null = 还没对照过,出的是输入表单。
   */
  res: MatchFact | null

  /**
   * 挂到文件选择框上的 ref(上传钮借它开系统窗)。
   */
  fileRef: FileRef

  /**
   * 粘贴框改值。
   */
  onResumeChange: TextChangeFn

  /**
   * 选完文件。
   */
  onPickFile: FilePickFn

  /**
   * 点上传钮(去开系统的选文件窗)。
   */
  onUpload: ClickFn

  /**
   * 切换「存进档案」。
   */
  onSaveToggle: CheckChangeFn

  /**
   * 点对照钮。
   */
  onRun: ClickFn
}

/**
 * MatchLoginWall 的 props。
 */
export type MatchLoginWallIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * MatchResult 的 props。
 */
export type MatchResultIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 洗净的整份对照结果。
   */
  res: MatchFact
}

/**
 * MatchForm 的 props(输入这一屏要的全部状态与手柄;逐格说明见 ResumeMatchPanel)。
 */
export type MatchFormIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 粘贴框现值。
   */
  resume: string

  /**
   * 对照请求在飞。
   */
  busy: boolean

  /**
   * 文件正在读/解析。
   */
  reading: boolean

  /**
   * 当前错误文案;空串 = 不出错误行。
   */
  err: string

  /**
   * 预填那份存档的存入时刻;空串 = 不出小注。
   */
  archAt: string

  /**
   * 勾了「存进档案」没有。
   */
  save: boolean

  /**
   * 文件选择框的 ref。
   */
  fileRef: FileRef

  /**
   * 粘贴框改值。
   */
  onResumeChange: TextChangeFn

  /**
   * 选完文件。
   */
  onPickFile: FilePickFn

  /**
   * 点上传钮。
   */
  onUpload: ClickFn

  /**
   * 切换「存进档案」。
   */
  onSaveToggle: CheckChangeFn

  /**
   * 点对照钮。
   */
  onRun: ClickFn
}

/**
 * matchColsOf 的入参。
 */
export type MatchColsIn = {
  /**
   * 取词函数(两列的表头文案)。
   */
  t: TFn
}

/**
 * toMatchRow 的入参。
 */
export type ToMatchRowIn = {
  /**
   * 线上那一条。
   */
  row: MatchRowJson

  /**
   * 它排第几(行身份按名次编)。
   */
  index: number
}

/**
 * toMatchFact 的入参。
 */
export type ToMatchFactIn = {
  /**
   * 对照接口的响应体。
   */
  json: MatchRespJson
}

/**
 * busyMarkOf 的入参。
 */
export type BusyMarkIn = {
  /**
   * 正忙着(忙才在钮文字前挂记号)。
   */
  on: boolean
}

/**
 * uploadClsOf 的入参。
 */
export type UploadClsIn = {
  /**
   * 文件正在读(读的时候钮变浅)。
   */
  reading: boolean
}

/**
 * runClsOf 的入参。
 */
export type RunClsIn = {
  /**
   * 对照请求在飞(在飞的时候钮变浅)。
   */
  busy: boolean
}

/**
 * extOf 的入参。
 */
export type ExtOfIn = {
  /**
   * 文件名。
   */
  name: string
}

/**
 * isTextFile 的入参。
 */
export type IsTextFileIn = {
  /**
   * 小写后缀(不带点)。
   */
  ext: string
}

/**
 * matchErrKeyOf / fileErrKeyOf 的入参。
 */
export type ErrKeyIn = {
  /**
   * 接口给的错误码;拿不到时是空串(走兜底键)。
   */
  code: string
}

/**
 * makePrefill 的入参。
 */
export type PrefillIn = {
  /**
   * 用户动过手没有(动过就不拿存档盖他的输入)。
   */
  touched: TouchedRef

  /**
   * 粘贴框的落格。
   */
  setResume: (v: string) => void

  /**
   * 存档时刻的落格。
   */
  setArchAt: (v: string) => void
}

/**
 * loadArchive 的入参。
 */
export type LoadArchiveIn = {
  /**
   * 组件还在不在场。
   */
  live: LiveFlag

  /**
   * 用户动过手没有。
   */
  touched: TouchedRef

  /**
   * 粘贴框的落格。
   */
  setResume: (v: string) => void

  /**
   * 存档时刻的落格。
   */
  setArchAt: (v: string) => void
}

/**
 * useResumeChange 的入参。
 */
export type ResumeChangeIn = {
  /**
   * 用户动过手没有(敲一个字就算动过)。
   */
  touched: TouchedRef

  /**
   * 粘贴框的落格。
   */
  setResume: (v: string) => void

  /**
   * 存档时刻的落格(一动手就撤掉小注 —— 框里的已经不是存档那份)。
   */
  setArchAt: (v: string) => void
}

/**
 * makeSaveToggle 的入参。
 */
export type SaveToggleIn = {
  /**
   * 勾选态的落格。
   */
  setSave: (v: boolean) => void
}

/**
 * useUploadClick 的入参。
 */
export type UploadClickIn = {
  /**
   * 文件选择框的 ref(点它才会弹系统窗)。
   */
  fileRef: FileRef
}

/**
 * usePickFile 的入参。
 */
export type PickFileIn = {
  /**
   * 取词函数(失败文案就地取)。
   */
  t: TFn

  /**
   * 用户动过手没有。
   */
  touched: TouchedRef

  /**
   * 文件选择框的 ref(读完清空它,同一个文件才能再选一次)。
   */
  fileRef: FileRef

  /**
   * 粘贴框的落格(读出来的文本回填,用户看得见也能改)。
   */
  setResume: (v: string) => void

  /**
   * 存档时刻的落格。
   */
  setArchAt: (v: string) => void

  /**
   * 错误文案的落格。
   */
  setErr: (v: string) => void

  /**
   * 读取中的落格。
   */
  setReading: (v: boolean) => void
}

/**
 * pickFile 的入参(usePickFile 交出去的手柄从事件里取到文件后,整摊交给它)。
 */
export type PickFileNowIn = {
  /**
   * 选中的文件。
   */
  file: File

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 用户动过手没有。
   */
  touched: TouchedRef

  /**
   * 文件选择框的 ref(读完清空它,同一个文件才能再选一次)。
   */
  fileRef: FileRef

  /**
   * 粘贴框的落格。
   */
  setResume: (v: string) => void

  /**
   * 存档时刻的落格。
   */
  setArchAt: (v: string) => void

  /**
   * 错误文案的落格。
   */
  setErr: (v: string) => void

  /**
   * 读取中的落格。
   */
  setReading: (v: boolean) => void
}

/**
 * readPickedFile 的入参。
 */
export type ReadPickedFileIn = {
  /**
   * 选中的文件。
   */
  file: File

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 粘贴框的落格。
   */
  setResume: (v: string) => void

  /**
   * 错误文案的落格。
   */
  setErr: (v: string) => void
}

/**
 * extractFile 的入参。
 */
export type ExtractFileIn = {
  /**
   * 要送去服务端解析的文件(pdf/docx)。
   */
  file: File

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 粘贴框的落格。
   */
  setResume: (v: string) => void

  /**
   * 错误文案的落格。
   */
  setErr: (v: string) => void
}

/**
 * makeRun 的入参。
 */
export type RunIn = {
  /**
   * 取词函数(失败文案就地取)。
   */
  t: TFn

  /**
   * 这个岗的库内 id。
   */
  jobId: string | number

  /**
   * 职位描述全文。
   */
  jd: string

  /**
   * 粘贴框现值(就是要对照的简历正文)。
   */
  resume: string

  /**
   * 界面语言(结果按它出中/英/韩)。
   */
  lang: Lang

  /**
   * 勾没勾「存进档案」(服务端只认 true 才写库)。
   */
  save: boolean

  /**
   * 忙碌位的落格。
   */
  setBusy: (v: boolean) => void

  /**
   * 错误文案的落格。
   */
  setErr: (v: string) => void

  /**
   * 结果的落格。
   */
  setRes: (v: MatchFact) => void
}

/**
 * matchBodyOf 的入参(拼对照请求的 JSON 体)。
 */
export type MatchBodyIn = {
  /**
   * 这个岗的库内 id。
   */
  jobId: string | number

  /**
   * 职位描述全文。
   */
  jd: string

  /**
   * 简历正文。
   */
  resume: string

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 存不存进档案。
   */
  save: boolean
}
