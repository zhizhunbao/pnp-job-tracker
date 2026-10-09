/**
 * queue 组件桶(「今日待投」)的形状:线格式 → 面板 → 各件 props。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
// eslint-disable-next-line local/no-import-in-leaf -- 分层态与职位整行原样透传给升级框 / 职位描述弹框,本域只读 isPro 一格(先例 myjobs/types.ts)
import type { JobRow, Plan } from '@/lib/jobs'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形;形状本桶自己声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 分层态(外域形状,逐行特批):页面门递来,本域只读 isPro。
 */
export type QueuePlan = Plan

/**
 * 设一格状态的函数(React 的 setState 形)。
 */
export type SetFn<T> = (v: T) => void

/**
 * 队列一行(/api/queue 的线格式;只声明真读的格)。
 */
export type QueueItem = {
  /**
   * 投递行 id。
   */
  id: number

  /**
   * 职位 id;null = 职位已删(发不了)。
   */
  jobId: number | null

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 写好的信。
   */
  cover: string

  /**
   * 附哪份简历(null = 那份已删)。
   */
  resumeId: number | null

  /**
   * 城市英文名。
   */
  city: string

  /**
   * 城市中文译名。
   */
  cityZh: string

  /**
   * 城市韩文译名。
   */
  cityKo: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资显示串(没有 = 空串)。
   */
  salary: string

  /**
   * 职位已下架。
   */
  closed: boolean

  /**
   * 附的那份简历的文件名(那份已删 = 空串)。
   */
  resumeName: string
}

/**
 * 队列接口的回包。
 */
export type QueueRespJson = {
  /**
   * 开关;缺席按关读。
   */
  auto?: boolean

  /**
   * 答没答想做的工作;缺席按没答读。
   */
  hasNocs?: boolean

  /**
   * 有没有署名;缺席按没有读。
   */
  hasName?: boolean

  /**
   * 有没有简历;缺席按没有读。
   */
  hasResume?: boolean

  /**
   * 答没答所在省;缺席按没答读(2026-10-08 第三轮小白走查:候选只取本省)。
   */
  hasProv?: boolean

  /**
   * 队列;缺席按零条读。
   */
  items?: QueueItem[]

  /**
   * 上一轮跑完的时刻(ISO;从没跑过 = 空 / 缺席)。
   */
  lastQueueAt?: string | null

  /**
   * 英文署名;缺席 / 空按没有读。
   */
  senderName?: string | null
}

/**
 * 队列状态(洗净)。
 */
export type QueueState = {
  /**
   * 「智能投递」开着没有。
   */
  auto: boolean

  /**
   * 答过想做的工作。
   */
  hasNocs: boolean

  /**
   * 有英文署名。
   */
  hasName: boolean

  /**
   * 有简历。
   */
  hasResume: boolean

  /**
   * 答过所在省。
   */
  hasProv: boolean

  /**
   * 队列(第一条就是当前这一岗)。
   */
  items: QueueItem[]

  /**
   * 上一轮跑完的时刻(ISO;从没跑过 = 空串)。开启后拿它变没变判「这一轮跑完了」。
   */
  lastQueueAt: string

  /**
   * 英文署名(逐项检查的「署名」一行;没有 = 空串)。
   */
  senderName: string
}

/**
 * 「开启后正在找岗」的记号:点开启的时刻与那时的上一轮时刻(变了 = 这一轮跑完了)。
 */
export type FindMark = {
  /**
   * 点开启的时刻(ms)。
   */
  at: number

  /**
   * 点开启时的 lastQueueAt。
   */
  since: string
}

/**
 * `useQueueFinding` 的入参:队列状态与两个落格(首拉与轮询都往这里写)。
 */
export type QueueFindingIn = {
  /**
   * 队列状态。
   */
  state: QueueState

  /**
   * 改取数状态。
   */
  setLoad: SetFn<string>

  /**
   * 改队列状态。
   */
  setState: SetFn<QueueState>
}

/**
 * `useQueueFinding` 的出参。
 */
export type QueueFindingOut = {
  /**
   * 开启后这一轮还在跑。
   */
  finding: boolean

  /**
   * 记「开启了,正在找岗」。
   */
  setFind: SetFn<FindMark | null>
}

/**
 * `isFinding` 的入参。
 */
export type FindingIn = {
  /**
   * 记号;没点过开启 = null。
   */
  find: FindMark | null

  /**
   * 队列状态。
   */
  state: QueueState

  /**
   * 现在(ms;由轮询的 tick 推着变)。
   */
  now: number
}

/**
 * 发出去了交给外面的那一份(「我的」页拿它刷新表、出成功条)。
 */
export type QueueSentOut = {
  /**
   * 发给了哪家。
   */
  company: string
}

/**
 * QueueReview 的 props。
 */
export type QueueReviewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 分层态(判 Pro)。
   */
  plan: QueuePlan

  /**
   * 发出去了(由「我的」页拿去刷新投递记录表)。
   */
  onSent: (x: QueueSentOut) => void
}

/**
 * 整机的可变格(工厂们共用一份落格)。
 */
export type QueueCells = {
  /**
   * 队列状态。
   */
  state: QueueState

  /**
   * 改队列状态。
   */
  setState: SetFn<QueueState>

  /**
   * 改在途。
   */
  setBusy: SetFn<boolean>

  /**
   * 改错误词条键。
   */
  setErr: SetFn<string>

  /**
   * 当前翻到第几条(已夹在队列长度内)。
   */
  pos: number

  /**
   * 改逐项检查已勾的项(发出 / 改信 / 翻页后清空)。
   */
  setTicks: SetFn<string[]>

  /**
   * 发出去了的回调。
   */
  onSent: (x: QueueSentOut) => void

  /**
   * 设置清单里的英文姓名(文本框里的)。
   */
  name: string

  /**
   * 设置清单里选中的所在省码(下拉里的;按时区预选)。
   */
  prov: string

  /**
   * 改「正在上传」。
   */
  setUploading: SetFn<boolean>

  /**
   * 隐藏的文件框。
   */
  input: HTMLInputElement | null

  /**
   * 改「改信」弹框开合。
   */
  setEditing: SetFn<boolean>

  /**
   * 弹框里正在改的信。
   */
  editText: string

  /**
   * 记「开启了,正在找岗」。
   */
  setFind: SetFn<FindMark | null>
}

/**
 * 弹框栈的职位层(与 myjobs 桶同形,本桶自抄)。
 */
export type PeekJobLayer = {
  /**
   * 层的种类。
   */
  kind: 'job'

  /**
   * 这一岗(整行;外域形状,本桶一格不读)。
   */
  job: QueueJob
}

/**
 * 弹框栈的公司层(职位描述弹框里点公司名叠开;本桶不主动叠,形状要与 advisor 的栈同形,自抄)。
 */
export type PeekCoLayer = {
  /**
   * 层的种类。
   */
  kind: 'company'

  /**
   * 这一家。
   */
  co: CoPeek
}

/**
 * 公司弹框要的那一家(slug 与名)。
 */
export type CoPeek = {
  /**
   * 公司页 slug(弹框按它取数)。
   */
  slug: string

  /**
   * 公司名(弹框页眉标题)。
   */
  name: string
}

/**
 * 弹框栈的一层。
 */
export type PeekLayer = PeekJobLayer | PeekCoLayer

/**
 * 弹框栈(modal 域 useLayerStack 的出参;形状本桶自抄)。
 */
export type PeekStackRef = {
  /**
   * 从下到上的各层。
   */
  layers: PeekLayer[]

  /**
   * 叠上一层。
   */
  push: (layer: PeekLayer) => void

  /**
   * 换掉最上面一层。
   */
  swapTop: (layer: PeekLayer) => void

  /**
   * 关掉最上面一层。
   */
  pop: () => void
}

/**
 * 职位板整行(外域形状,逐行特批):公司桶现取回来、原样喂给职位描述弹框,本桶一格不读。
 */
export type QueueJob = JobRow

/**
 * 开职位描述弹框(收整行)。
 */
export type OpenJobFn = (job: QueueJob) => void

/**
 * 链接的点击手柄(普通左键拦下开弹框,Ctrl / ⌘ 点照旧开新标签)。
 */
export type PeekClickFn = (e: React.MouseEvent) => void

/**
 * 文本框改动事件。
 */
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>

/**
 * 多行框改动事件。
 */
export type AreaChangeEvent = React.ChangeEvent<HTMLTextAreaElement>

/**
 * `makeNameSave` 的入参。
 */
export type NameSaveIn = {
  /**
   * 整机的可变格。
   */
  cells: QueueCells

  /**
   * 重拉队列状态(存完让「英文姓名 ✓」亮起)。
   */
  reload: () => Promise<void>
}

/**
 * `makeProvSave`(存所在省)的入参。
 */
export type ProvSaveIn = {
  /**
   * 整机的可变格。
   */
  cells: QueueCells

  /**
   * 重拉队列状态(存完让「所在省 ✓」亮起)。
   */
  reload: () => Promise<void>
}

/**
 * `makeUpload` 的入参。
 */
export type UploadIn = {
  /**
   * 整机的可变格。
   */
  cells: QueueCells

  /**
   * 重拉队列状态(传完让「简历 ✓」亮起)。
   */
  reload: () => Promise<void>
}

/**
 * `makeEnable`(开启智能投递)的入参。
 */
export type EnableIn = {
  /**
   * 整机的可变格。
   */
  cells: QueueCells
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
 * QueueSetup(设置清单)的 props。
 */
export type QueueSetupIn = {
  /**
   * 整机面板。
   */
  p: QueuePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * QueueEdit(改信弹框)的 props。
 */
export type QueueEditIn = {
  /**
   * 整机面板。
   */
  p: QueuePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * QueueInput(隐藏文件框)的 props。
 */
export type QueueInputIn = {
  /**
   * 文件框挂上 / 卸下的回调(签名由 React 的 ref 属性定死)。
   */
  onMount: (el: HTMLInputElement | null) => void

  /**
   * 选好文件。
   */
  onPick: (e: InputChangeEvent) => void
}

/**
 * QueueStep(清单里的一行)的 props。
 */
export type QueueStepIn = {
  /**
   * 这一项齐了没有。
   */
  done: boolean

  /**
   * 项名。
   */
  label: string

  /**
   * 没齐时右边放什么(钮 / 输入框)。
   */
  action: React.ReactNode
}

/**
 * 整机面板(各件只读它)。
 */
export type QueuePanel = {
  /**
   * 取数状态(busy / fail / ok)。
   */
  load: string

  /**
   * 四样条件都齐了(简历、想做的工作、所在省、英文姓名)。
   */
  ready: boolean

  /**
   * 设置清单里的英文姓名(文本框里的)。
   */
  name: string

  /**
   * 设置清单里选中的所在省码(下拉里的;按时区预选)。
   */
  prov: string

  /**
   * 改所在省下拉。
   */
  onProv: (v: string) => void

  /**
   * 存所在省(写进四题答案档,存完让「所在省 ✓」亮起)。
   */
  onProvSave: () => void

  /**
   * 正在上传简历。
   */
  uploading: boolean

  /**
   * 「改信」弹框开着没有。
   */
  editing: boolean

  /**
   * 弹框里正在改的信。
   */
  editText: string

  /**
   * 弹框栈(职位描述弹框)。
   */
  stack: PeekStackRef

  /**
   * 分层态(职位描述弹框要它)。
   */
  plan: QueuePlan

  /**
   * 点当前这一岗的职位名(叠开职位描述弹框)。
   */
  onTitle: PeekClickFn

  /**
   * 改英文姓名。
   */
  onName: (e: InputChangeEvent) => void

  /**
   * 存英文姓名。
   */
  onNameSave: () => void

  /**
   * 隐藏的文件框挂上 / 卸下。
   */
  onInputMount: (el: HTMLInputElement | null) => void

  /**
   * 点「上传」(弹文件框)。
   */
  onAdd: () => void

  /**
   * 文件框选好了文件(上传)。
   */
  onFile: (e: InputChangeEvent) => void

  /**
   * 「开启智能投递」。
   */
  onEnable: () => void

  /**
   * 开「改信」弹框。
   */
  onEdit: () => void

  /**
   * 弹框里改信。
   */
  onEditText: (e: AreaChangeEvent) => void

  /**
   * 弹框里「保存」。
   */
  onEditSave: () => void

  /**
   * 关「改信」弹框。
   */
  onEditClose: () => void

  /**
   * 队列状态。
   */
  state: QueueState

  /**
   * 当前这一岗(翻到的那一条;空队列 = null)。
   */
  item: QueueItem | null

  /**
   * 当前翻到第几条(从 0 起)。
   */
  pos: number

  /**
   * 逐项检查四行(当前这一岗;职位已删 = 空清单)。
   */
  checkRows: QueueCheckRow[]

  /**
   * 逐项检查已勾的项。
   */
  ticks: string[]

  /**
   * 按项造勾选手柄。
   */
  onTick: (key: string) => () => void

  /**
   * 翻到第几条(通用 Pager 的回调,0 起)。
   */
  onPage: (to: number) => void

  /**
   * 界面语(城市译名按它)。
   */
  lang: Lang

  /**
   * 在途(发 / 跳过 / 拨开关)。
   */
  busy: boolean

  /**
   * 错误词条键(没有 = 空串)。
   */
  err: string

  /**
   * 开启后这一轮还在跑(轮询中;有岗了 / 跑完了 / 超时就不是了)。
   */
  finding: boolean

  /**
   * 拨开关。
   */
  onToggle: () => void

  /**
   * 投出当前这一岗。
   */
  onSend: () => void

}

/**
 * `makeLoad` 的入参。
 */
export type LoadIn = {
  /**
   * 取数状态落格。
   */
  setLoad: SetFn<string>

  /**
   * 队列状态落格。
   */
  setState: SetFn<QueueState>
}

/**
 * 只收整机可变格的工厂的入参。
 */
export type CellsIn = {
  /**
   * 整机的可变格。
   */
  cells: QueueCells
}

/**
 * `sendOne` 的入参。
 */
export type SendOneIn = {
  /**
   * 整机的可变格。
   */
  cells: QueueCells

  /**
   * 这一岗。
   */
  item: QueueItem
}

/**
 * `dropItems` 的入参。
 */
export type DropIn = {
  /**
   * 整机的可变格。
   */
  cells: QueueCells

  /**
   * 去掉哪些行(投递行 id)。
   */
  ids: number[]
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
 * `withAuto`(队列状态换一个开关值)的入参。
 */
export type WithAutoIn = {
  /**
   * 原状态。
   */
  state: QueueState

  /**
   * 新开关。
   */
  on: boolean
}

/**
 * `postJson` 的入参。
 */
export type PostIn = {
  /**
   * 地址。
   */
  url: string

  /**
   * 请求体(JSON 化后发)。
   */
  body: object

  /**
   * 方法;缺席 = POST。
   */
  method?: string
}

/**
 * `makeEditOpen` 的入参。
 */
export type EditOpenIn = {
  /**
   * 整机的可变格。
   */
  cells: QueueCells

  /**
   * 改信落格。
   */
  setEditText: (v: string) => void
}

/**
 * `withCover` 的入参。
 */
export type WithCoverIn = {
  /**
   * 原状态。
   */
  state: QueueState

  /**
   * 哪一行(投递行 id)。
   */
  id: number

  /**
   * 新信。
   */
  cover: string
}

/**
 * `titleOpenOf` 的入参。
 */
export type TitleOpenIn = {
  /**
   * 当前这一岗(空队列 = null)。
   */
  item: QueueItem | null

  /**
   * 开职位描述弹框。
   */
  onOpenJob: OpenJobFn
}

/**
 * `uploadResume` 的入参。
 */
export type UploadFileIn = {
  /**
   * 上传入参(整机的可变格与重拉)。
   */
  x: UploadIn

  /**
   * 选好的文件。
   */
  file: File
}

/**
 * `makeFlip` 的入参(开合类布尔的翻转)。
 */
export type FlipIn = {
  /**
   * 现值。
   */
  v: boolean

  /**
   * 落格。
   */
  set: SetFn<boolean>
}

/**
 * QueueCard 的 props。
 */
export type QueueCardIn = {
  /**
   * 整机面板。
   */
  p: QueuePanel

  /**
   * 这一岗。
   */
  item: QueueItem

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * QueueHead(标题 + 开关)的 props。
 */
export type QueueHeadIn = {
  /**
   * 整机面板。
   */
  p: QueuePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * QueueFoot(计数 + 钮组)的 props。
 */
export type QueueFootIn = {
  /**
   * 整机面板。
   */
  p: QueuePanel

  /**
   * 这一岗。
   */
  item: QueueItem

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `makePage` 的入参。
 */
export type PageIn = {
  /**
   * 翻页落格。
   */
  setPos: SetFn<number>

  /**
   * 逐项检查落格(翻页清空)。
   */
  setTicks: SetFn<string[]>
}

/**
 * `posOf` 的入参。
 */
export type PosIn = {
  /**
   * 记着的位置。
   */
  pos: number

  /**
   * 队列条数。
   */
  n: number
}

/**
 * `checksOf` 的入参。
 */
export type ChecksIn = {
  /**
   * 当前这一岗(空队列 = null)。
   */
  item: QueueItem | null

  /**
   * 英文署名。
   */
  sender: string
}

/**
 * 逐项检查的一行(与 apply 桶 CheckRow 同形,本桶自抄)。
 */
export type QueueCheckRow = {
  /**
   * 项名词条键(也是勾选记号)。
   */
  key: string

  /**
   * 这一项的值。
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
}

/**
 * `locationOf` 的入参。
 */
export type LocationIn = {
  /**
   * 这一岗。
   */
  item: QueueItem

  /**
   * 界面语。
   */
  lang: Lang
}
