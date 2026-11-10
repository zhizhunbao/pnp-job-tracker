/**
 * apply 桶子桶 review 的形状(2026-11-09;线格式形同 lib/tailor 的 TailorReview,本桶自声明)。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */

/**
 * 取词函数。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 一条职位要求。
 */
export type ReviewReq = {
  /**
   * 编号。
   */
  id: number

  /**
   * 英文短名。
   */
  label: string

  /**
   * 职位描述原文。
   */
  jd: string

  /**
   * 有没有依据。
   */
  basis: boolean

  /**
   * 简历里的原文。
   */
  resume: string

  /**
   * 求职信里的原文。
   */
  cover: string
}

/**
 * 核对结果。
 */
export type Review = {
  /**
   * 要求。
   */
  reqs: ReviewReq[]

  /**
   * 无依据的句子。
   */
  unsupported: string[]

  /**
   * 分数;还没核对 = null。
   */
  score: number | null
}

/**
 * 现状接口回包。
 */
export type StateJson = {
  /**
   * 核对结果。
   */
  review: Review | null

  /**
   * 有没有本岗简历。
   */
  hasResume: boolean

  /**
   * 有没有求职信。
   */
  hasCover: boolean

  /**
   * 求职信全文。
   */
  cover: string

  /**
   * 职位描述全文。
   */
  jd: string

  /**
   * 本人补充的经历(存在基础简历上)。
   */
  extra: string

  /**
   * 本岗简历能手改的部分;还没写 = null。
   */
  cv: ReviewCv | null
}

/**
 * 本岗简历里能手改的部分(只声明真读的格)。
 */
export type ReviewCv = {
  /**
   * 简介。
   */
  summary: string

  /**
   * 技能。
   */
  skills: string

  /**
   * 各段工作。
   */
  work: ReviewCvWork[]
}

/**
 * 本岗简历的一段工作(职位、公司和年份只显示不能改)。
 */
export type ReviewCvWork = {
  /**
   * 职位。
   */
  title: string

  /**
   * 公司。
   */
  org: string

  /**
   * 起始年。
   */
  fromY: string

  /**
   * 结束年;至今 = 空串。
   */
  toY: string

  /**
   * 要点,一行一条。
   */
  desc: string
}

/**
 * 步骤接口回包。
 */
export type StepJson = {
  /**
   * 错误码。
   */
  error?: string

  /**
   * 下一步。
   */
  next?: string

  /**
   * 核对结果。
   */
  review?: Review | null
}

/**
 * 一次运行的起点。
 */
export type RunStart = {
  /**
   * 从哪一步开始。
   */
  step: string

  /**
   * 补充经历全文;这一轮不带 = 空串。
   */
  extra: string

  /**
   * 简历写完也重写求职信。
   */
  both: boolean

  /**
   * 手动重新生成。
   */
  regen: boolean

  /**
   * 用户补了真实经历后的重写。
   */
  fill: boolean
}

/**
 * 面板要的落格。
 */
export type ReviewCells = {
  /**
   * 开框这一轮结束。
   */
  setOpening: (v: boolean) => void

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 落进度。
   */
  setStage: (v: string) => void

  /**
   * 落错误词条。
   */
  setErr: (v: string) => void

  /**
   * 落核对结果。
   */
  setReview: (v: Review) => void

  /**
   * 落求职信全文。
   */
  setCover: (v: string) => void

  /**
   * 落职位描述。
   */
  setJd: (v: string) => void

  /**
   * 落已存的补充经历。
   */
  setSaved: (v: string) => void

  /**
   * 落本岗简历能手改的部分。
   */
  setCv: (v: ReviewCv | null) => void

  /**
   * 文件换了一份。
   */
  bumpGen: () => void

  /**
   * 试用用完,弹升级框。
   */
  onUpsell: () => void
}

/**
 * 跑一轮的入参。
 */
export type RunIn = {
  /**
   * 落格。
   */
  c: ReviewCells

  /**
   * 起点。
   */
  start: RunStart
}

/**
 * ReviewFlow 的 props。
 */
export type ReviewFlowIn = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 职位名(英文)。
   */
  title: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 公司英文名。
   */
  company: string

  /**
   * 收件人(显示用)。
   */
  to: string

  /**
   * 档案里的英文姓名。
   */
  name: string

  /**
   * 要不要现填姓名。
   */
  askName: boolean

  /**
   * 现填姓名的改动手柄。
   */
  onName: React.ChangeEventHandler<HTMLInputElement>

  /**
   * 取词。
   */
  t: TFn

  /**
   * 发出去了。
   */
  onSent: () => void

  /**
   * 试用用完,弹升级框。
   */
  onUpsell: () => void

  /**
   * 改投基础简历(页脚的小入口;没写成时的那颗钮也是它)。
   */
  onBase: () => void

  /**
   * 页脚那一句「还剩几个额度」(父桶取好词递进来)。
   */
  leftText: string
}

/**
 * useReview 交出的面板。
 */
export type ReviewPanel = {
  /**
   * 开框这一轮还没走完(第一次生成连同自动重试都走完才亮三屏,不露半成品)。
   */
  opening: boolean

  /**
   * 进度步;空闲 = 空串。
   */
  stage: string

  /**
   * 错误词条。
   */
  err: string

  /**
   * 核对结果。
   */
  review: Review | null

  /**
   * 求职信全文。
   */
  cover: string

  /**
   * 职位描述全文。
   */
  jd: string

  /**
   * 文件版本。
   */
  gen: number

  /**
   * 选中的要求;0 = 没选。
   */
  active: number

  /**
   * 放大的面板;空串 = 没放大。
   */
  focus: string

  /**
   * 补充经历的右侧栏开着吗。
   */
  fillOpen: boolean

  /**
   * 补充经历的草稿(关了右侧栏也留着)。
   */
  extra: string

  /**
   * 已存在基础简历上的补充经历。
   */
  saved: string

  /**
   * 刚才那次重新生成后没覆盖的要求一条没少。
   */
  same: boolean

  /**
   * 求职信的修改草稿;没在改 = null。
   */
  editing: string | null

  /**
   * 本岗简历能手改的部分;还没写 = null。
   */
  cv: ReviewCv | null

  /**
   * 简历的修改草稿(关了右侧栏也留着);没改过 = null。
   */
  cvDraft: ReviewCv | null

  /**
   * 修改简历的右侧栏开着吗。
   */
  cvOpen: boolean

  /**
   * 打开简历修改。
   */
  onResumeEdit: () => void

  /**
   * 关闭简历修改。
   */
  onResumeClose: () => void

  /**
   * 保存简历。
   */
  onResumeSave: () => void

  /**
   * 改简介。
   */
  onCvSummary: React.ChangeEventHandler<HTMLTextAreaElement>

  /**
   * 改技能。
   */
  onCvSkills: React.ChangeEventHandler<HTMLTextAreaElement>

  /**
   * 改某一段工作的要点。
   */
  cvDescOf: (i: number) => React.ChangeEventHandler<HTMLTextAreaElement>

  /**
   * 正在发。
   */
  sending: boolean

  /**
   * 选中要求。
   */
  pickOf: (n: number) => () => void

  /**
   * 点高亮。
   */
  setActive: (n: number) => void

  /**
   * 点放大。
   */
  focusOf: (pane: string) => () => void

  /**
   * 重新生成。
   */
  regenOf: (pane: string) => () => void

  /**
   * 打开补充。
   */
  onFillOpen: () => void

  /**
   * 改补充文字。
   */
  onExtraText: React.ChangeEventHandler<HTMLTextAreaElement>

  /**
   * 关闭补充。
   */
  onFillClose: () => void

  /**
   * 保存补充。
   */
  onFillSave: () => void

  /**
   * 打开求职信修改。
   */
  onCoverEdit: () => void

  /**
   * 改求职信草稿。
   */
  onCoverText: React.ChangeEventHandler<HTMLTextAreaElement>

  /**
   * 关闭求职信修改。
   */
  onCoverClose: () => void

  /**
   * 保存求职信。
   */
  onCoverSave: () => void

  /**
   * 发送。
   */
  onSend: () => void
}

/**
 * 一条要高亮的引文。
 */
export type Quote = {
  /**
   * 原文。
   */
  q: string

  /**
   * 序号;无依据的句子 = 0。
   */
  n: number
}

/**
 * 画在 PDF 上的一块高亮。
 */
export type HlRect = {
  /**
   * 左。
   */
  x: number

  /**
   * 上。
   */
  y: number

  /**
   * 宽。
   */
  w: number

  /**
   * 高。
   */
  h: number

  /**
   * 序号。
   */
  n: number

  /**
   * 是这句的第一块。
   */
  first: boolean
}

/**
 * PDF 面板的尺寸。
 */
export type SheetSize = {
  /**
   * 宽。
   */
  w: number

  /**
   * 高。
   */
  h: number

  /**
   * 裁掉的左边。
   */
  left: number

  /**
   * 裁掉的上边。
   */
  top: number

  /**
   * 画的时候容器的宽(给序号让位后比它宽的,预览整体缩一点,不出横向滚动条)。
   */
  fit: number
}

/**
 * 算预览整体缩放的入参。
 */
export type SheetZoomIn = {
  /**
   * 尺寸。
   */
  size: SheetSize

  /**
   * 放大了吗(放大时不缩,照旧横向滚)。
   */
  zoomed: boolean
}

/**
 * 画一份 PDF 的入参。
 */
export type DrawIn = {
  /**
   * 文件地址。
   */
  url: string

  /**
   * 容器。
   */
  host: HTMLDivElement

  /**
   * 引文。
   */
  quotes: Quote[]

  /**
   * 放大了吗。
   */
  zoomed: boolean

  /**
   * 落高亮。
   */
  setRects: (r: HlRect[]) => void

  /**
   * 落尺寸。
   */
  setSize: (s: SheetSize) => void

  /**
   * 落失败。
   */
  setFailed: (v: boolean) => void

  /**
   * 还活着吗。
   */
  alive: () => boolean
}

/**
 * ReviewPdf 的 props。
 */
export type ReviewPdfIn = {
  /**
   * 文件地址。
   */
  url: string

  /**
   * 引文。
   */
  quotes: Quote[]

  /**
   * 选中的要求。
   */
  active: number

  /**
   * 放大了吗。
   */
  zoomed: boolean

  /**
   * 点高亮。
   */
  setActive: (n: number) => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 一块高亮的 props。
 */
export type ReviewHlIn = {
  /**
   * 这一块。
   */
  r: HlRect

  /**
   * 选中的要求。
   */
  active: number

  /**
   * 点高亮。
   */
  setActive: (n: number) => void
}

/**
 * 分数卡的 props。
 */
export type ReviewScoreIn = {
  /**
   * 面板。
   */
  p: ReviewPanel

  /**
   * 核对结果。
   */
  review: Review

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 一块面板的 props。
 */
export type ReviewPaneIn = {
  /**
   * 面板名。
   */
  pane: string

  /**
   * 标题。
   */
  head: string

  /**
   * 面板。
   */
  p: ReviewPanel

  /**
   * 取词。
   */
  t: TFn

  /**
   * 点「修改」;没有 = null。
   */
  onEdit: (() => void) | null

  /**
   * 里面的东西。
   */
  children: React.ReactNode
}

/**
 * 职位描述面板的 props。
 */
export type ReviewJdIn = {
  /**
   * 面板。
   */
  p: ReviewPanel

  /**
   * 核对结果。
   */
  review: Review

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 一行职位描述的 props。
 */
export type JdLineIn = {
  /**
   * 这一行。
   */
  line: string

  /**
   * 是小标题(加粗)。
   */
  head: boolean

  /**
   * 前面补一个圆点。
   */
  bullet: boolean

  /**
   * 要求。
   */
  reqs: ReviewReq[]

  /**
   * 选中的要求。
   */
  active: number

  /**
   * 点高亮。
   */
  setActive: (n: number) => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 右侧栏的 props。
 */
export type ReviewDrawerIn = {
  /**
   * 面板。
   */
  p: ReviewPanel

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 底部一行的 props。
 */
export type ReviewFootIn = {
  /**
   * 面板。
   */
  p: ReviewPanel

  /**
   * 收发信息。
   */
  x: ReviewFlowIn
}

/**
 * 发送的入参。
 */
export type SendIn = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 要不要先存姓名。
   */
  askName: boolean

  /**
   * 姓名。
   */
  name: string

  /**
   * 落正在发。
   */
  setSending: (v: boolean) => void

  /**
   * 落错误词条。
   */
  setErr: (v: string) => void

  /**
   * 发出去了。
   */
  onSent: () => void
}

/**
 * 存求职信的入参。
 */
export type CoverSaveIn = {
  /**
   * 落格。
   */
  c: ReviewCells

  /**
   * 求职信。
   */
  text: string

  /**
   * 收起修改栏。
   */
  close: () => void
}

/**
 * 接口错误回包。
 */
export type ErrJson = {
  /**
   * 错误码。
   */
  error?: string
}

/**
 * 面板手柄工厂的入参(useReview 里拼)。
 */
export type HooksIn = {
  /**
   * 收发信息。
   */
  x: ReviewFlowIn
}

/**
 * 一段职位描述的切分结果。
 */
export type JdSeg = {
  /**
   * 文字。
   */
  text: string

  /**
   * 命中的要求;没命中 = null。
   */
  req: ReviewReq | null
}

/**
 * 算高亮的结果。
 */
export type DrawOut = Promise<void>

/**
 * 按条件取一个类名的入参。
 */
export type ClsIfIn = {
  /**
   * 要不要这个类。
   */
  on: boolean

  /**
   * 类名。
   */
  cls: string
}

/**
 * 点选要求的入参。
 */
export type PickActiveIn = {
  /**
   * 选中的要求。
   */
  active: number

  /**
   * 点的这一条。
   */
  n: number

  /**
   * 点高亮。
   */
  setActive: (n: number) => void
}

/**
 * 点高亮的手柄。
 */
export type HlPickFn = (e: React.MouseEvent) => void

/**
 * 一段职位描述的 props。
 */
export type JdSegIn = {
  /**
   * 文字。
   */
  text: string

  /**
   * 命中的要求;没命中 = null。
   */
  req: ReviewReq | null

  /**
   * 选中的要求。
   */
  active: number

  /**
   * 点高亮。
   */
  setActive: (n: number) => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 切一行职位描述的入参。
 */
export type JdSegsIn = {
  /**
   * 这一行。
   */
  line: string

  /**
   * 要求。
   */
  reqs: ReviewReq[]
}

/**
 * 一行职位描述里命中的一条要求。
 */
export type JdHit = {
  /**
   * 出现的位置。
   */
  at: number

  /**
   * 命中的要求。
   */
  req: ReviewReq
}

/**
 * 步骤请求体的入参。
 */
export type StepBodyIn = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 这一步。
   */
  step: string

  /**
   * 跑一轮的入参。
   */
  x: RunIn

  /**
   * 是不是第一步。
   */
  first: boolean
}

/**
 * 一轮失败的入参。
 */
export type FailRunIn = {
  /**
   * 落格。
   */
  c: ReviewCells

  /**
   * 错误码;回包没有 = null。
   */
  code: string | null
}

/**
 * pdf.js 文字层的一项(只声明真读的格)。
 */
export type PdfItem = {
  /**
   * 文字。
   */
  str: string

  /**
   * 宽。
   */
  width: number

  /**
   * 变换矩阵。
   */
  transform: number[]
}

/**
 * 两个变换矩阵相乘(pdf.js 的 Util.transform)。
 */
export type MatrixFn = (a: number[], b: number[]) => number[]

/**
 * 缩放的入参。
 */
export type ScaleOfIn = {
  /**
   * 贴合宽度的缩放。
   */
  fit: number

  /**
   * 放大了吗。
   */
  zoomed: boolean
}

/**
 * 量内容边界的入参。
 */
export type ContentBoxIn = {
  /**
   * 文字项。
   */
  items: PdfItem[]

  /**
   * 矩阵相乘。
   */
  tr: MatrixFn

  /**
   * 页面变换矩阵。
   */
  vt: number[]
}

/**
 * 内容的边界。
 */
export type ContentBox = {
  /**
   * 最左。
   */
  minX: number

  /**
   * 最右。
   */
  maxX: number

  /**
   * 最上。
   */
  minY: number

  /**
   * 最下。
   */
  maxY: number
}

/**
 * 算高亮块的入参。
 */
export type RectsIn = {
  /**
   * 文字项。
   */
  items: PdfItem[]

  /**
   * 引文。
   */
  quotes: Quote[]

  /**
   * 矩阵相乘。
   */
  tr: MatrixFn

  /**
   * 页面变换矩阵。
   */
  vt: number[]

  /**
   * 缩放。
   */
  scale: number
}

/**
 * 拼接全文里一个字对应的位置。
 */
export type CharAt = {
  /**
   * 第几个文字项;补的空格 = -1。
   */
  i: number

  /**
   * 文字项里的第几个字。
   */
  o: number
}

/**
 * 给序号让位的入参。
 */
export type ShiftedIn = {
  /**
   * 原画布。
   */
  cv: HTMLCanvasElement

  /**
   * 视口(只读宽)。
   */
  vp: ViewportWidth

  /**
   * 高亮块。
   */
  rects: HlRect[]

  /**
   * 留白。
   */
  gap: number

  /**
   * 像素比。
   */
  dpr: number
}

/**
 * 视口的宽(只声明真读的格)。
 */
export type ViewportWidth = {
  /**
   * 宽。
   */
  width: number
}

/**
 * 让位后的画布。
 */
export type ShiftedOut = {
  /**
   * 新画布。
   */
  canvas: HTMLCanvasElement

  /**
   * 多出的宽。
   */
  extra: number
}

/**
 * 重画一行的入参。
 */
export type PaintLineIn = {
  /**
   * 画笔。
   */
  g: CanvasRenderingContext2D

  /**
   * 原画布。
   */
  cv: HTMLCanvasElement

  /**
   * 这一行的句头。
   */
  list: HlRect[]

  /**
   * 留白。
   */
  gap: number

  /**
   * 像素比。
   */
  dpr: number

  /**
   * 总宽。
   */
  width: number
}

/**
 * 挪高亮块的入参。
 */
export type MoveRectsIn = {
  /**
   * 高亮块。
   */
  rects: HlRect[]

  /**
   * 按行分组的句头。
   */
  byLine: Map<number, HlRect[]>

  /**
   * 留白。
   */
  gap: number
}

/**
 * 点同一条取消选中的入参。
 */
export type ToggledIn = {
  /**
   * 现值。
   */
  now: number

  /**
   * 点的那条。
   */
  n: number
}

/**
 * useReviewPdf 交出的东西。
 */
export type ReviewPdfPanel = {
  /**
   * 容器挂载口。
   */
  box: React.RefObject<HTMLDivElement | null>

  /**
   * 高亮块。
   */
  rects: HlRect[]

  /**
   * 尺寸。
   */
  size: SheetSize

  /**
   * 失败了吗。
   */
  failed: boolean
}

/**
 * 重新生成并看有没有变化的入参。
 */
export type RegenRunIn = RunIn & {
  /**
   * 重新生成之前没覆盖的要求数。
   */
  before: number

  /**
   * 落「内容没变」。
   */
  setSame: (v: boolean) => void
}

/**
 * 一轮跑完的核对结果;失败 = null。
 */
export type MaybeReview = Review | null

/**
 * 算高亮的结果。
 */
export type RectsOut = {
  /**
   * 高亮块。
   */
  rects: HlRect[]

  /**
   * 这一页没找到的引文。
   */
  rest: Quote[]
}

/**
 * 一页的全文与逐字位置。
 */
export type TextMap = {
  /**
   * 拼接全文。
   */
  full: string

  /**
   * 全文里每个字的位置。
   */
  map: CharAt[]
}

/**
 * 算一句引文高亮块的入参。
 */
export type QuoteRectsIn = {
  /**
   * 这一页的入参。
   */
  y: RectsIn

  /**
   * 全文与逐字位置。
   */
  tm: TextMap

  /**
   * 量字宽的画笔。
   */
  ctx: CanvasRenderingContext2D

  /**
   * 全文里已被别的引文占了的字。
   */
  claimed: boolean[]

  /**
   * 这一页里只放序号的块(整句被占的引文各一块;每多一块往左多让一档,序号不叠)。
   */
  ghosts: HlRect[]

  /**
   * 这句引文。
   */
  q: Quote

  /**
   * 引文在全文里的起点。
   */
  at: number
}

/**
 * 算一块高亮的入参。
 */
export type RunRectIn = {
  /**
   * 这句引文的入参。
   */
  z: QuoteRectsIn

  /**
   * 起点(全文下标)。
   */
  from: number

  /**
   * 终点(全文下标,含)。
   */
  to: number

  /**
   * 是这句的第一块。
   */
  first: boolean
}

/**
 * 画整份 PDF 时的累计。
 */
export type DrawSum = {
  /**
   * 缩放;还没定 = 0。
   */
  scale: number

  /**
   * 裁掉的左边。
   */
  left: number

  /**
   * 各页内容最右(页面坐标)。
   */
  maxX: number

  /**
   * 下一页的上边在整份里的位置。
   */
  top: number

  /**
   * 给序号让位多出的宽。
   */
  extra: number

  /**
   * 高亮块。
   */
  rects: HlRect[]

  /**
   * 各页画布。
   */
  canvases: HTMLCanvasElement[]

  /**
   * 还没找到的引文。
   */
  rest: Quote[]
}

/**
 * 把一页并进整份的入参。
 */
export type AddPageIn = {
  /**
   * 整份的累计。
   */
  sum: DrawSum

  /**
   * 这一页的文字项。
   */
  items: PdfItem[]

  /**
   * 矩阵相乘。
   */
  tr: MatrixFn

  /**
   * 页面变换矩阵。
   */
  vt: number[]

  /**
   * 画好的画布。
   */
  cv: HTMLCanvasElement

  /**
   * 视口(只读宽)。
   */
  vp: ViewportWidth

  /**
   * 像素比。
   */
  dpr: number

  /**
   * 内容的边界。
   */
  box: ContentBox
}

/**
 * 裁画布的入参。
 */
export type CropIn = {
  /**
   * 画布。
   */
  canvas: HTMLCanvasElement

  /**
   * 上界(屏幕像素)。
   */
  y0: number

  /**
   * 下界(屏幕像素)。
   */
  y1: number

  /**
   * 像素比。
   */
  dpr: number
}

/**
 * 存手改简历的入参。
 */
export type ResumeSaveIn = {
  /**
   * 落格。
   */
  c: ReviewCells

  /**
   * 改好的简历。
   */
  cv: ReviewCv

  /**
   * 收起修改栏并丢掉草稿。
   */
  close: () => void
}

/**
 * 职位描述排好的一行。
 */
export type JdRow = {
  /**
   * 这一行的字(小标题已去掉标记)。
   */
  text: string

  /**
   * 是小标题。
   */
  head: boolean

  /**
   * 前面补一个圆点。
   */
  bullet: boolean
}

/**
 * 排职位描述各行的入参。
 */
export type JdRowsIn = {
  /**
   * 职位描述全文(小标题行首带标记)。
   */
  jd: string

  /**
   * 要求。
   */
  reqs: ReviewReq[]
}

/**
 * 拆一行里各句的入参。
 */
export type JdSentsIn = {
  /**
   * 这一行。
   */
  line: string

  /**
   * 要求。
   */
  reqs: ReviewReq[]
}
