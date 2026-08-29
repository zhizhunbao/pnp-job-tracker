/**
 * jobs 页面域的形状:职位板与职位详情两块视图的 props 契约、单元格三段律
 * (库行 JobRow → 展示行 CellView → 哑单元格)、列宽机器的量宽与分宽形状、
 * 状态机器交回的面板。
 *
 * 🔴 本文件**不带 `'use client'`**:服务端 page.tsx(读 cookie、解析筛选)与客户端视图
 * 共用这几张形状,标了指令就把服务端那半也拖进客户端边界(news 域踩过的老坑 6)。
 *
 * 跨域 import 只有一条 —— `@/lib/jobs` 的库行与分层态。它们**不是本域的事实**:
 * JobRow 是取数层洗好的整行、Plan 是配额层的分层态,本域从头到尾只是接过来原样喂给
 * 单元格与外域弹框(顾问/公司/简历)。重抄一份当天就会脱节(同 companies/types 的判据)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
// eslint-disable-next-line local/no-import-in-leaf -- 只 import type,理由见文件头(原样透传的外域整份行)
import type { ColKey, Dims, FieldGroup, JobRow, MatchProfile, NocDesc, Plan } from '@/lib/jobs'
// eslint-disable-next-line local/no-import-in-leaf -- 只 import type,理由见文件头(相似职位行原样透传)
import type { RelatedJob } from '@/lib/jobs/server'

/**
 * 界面语言(三字面量各域自抄)。译名、中文对照开关都按它取。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」;
 * 真参数是 lib/i18n 那个带附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 库行(外域形状,见文件头):本域只是把它一路传给单元格与弹框。
 */
export type JobFact = JobRow

/**
 * 分层态(外域形状,见文件头):Pro 列打码、匹配视图闸、投递注册闸都按它走。
 */
export type JobPlan = Plan

/**
 * 列键(外域形状):列表、列宽、排序、弹框路由四处共用同一套键。
 */
export type JobColKey = ColKey

/**
 * 维度表(外域形状):下拉选项、EE 抽选日、官方排除清单都从它取。
 */
export type JobDims = Dims

/**
 * 无参无返的点击手柄(钮、开关、关闭)。
 */
export type ClickFn = () => void

/**
 * 收一个字符串的手柄(下拉换值、搜索改词)。
 */
export type TextFn = (v: string) => void

/**
 * 收一个布尔的手柄(勾选型筛选)。
 */
export type BoolFn = (v: boolean) => void

/**
 * 筛选对象:键 = 筛选键,值 = 非空字符串;directOnly 为 true 时才在。
 * 全默认 = 空对象(没参数就是干净板)。
 */
export type JobFilters = Record<string, string | boolean>

/**
 * 一格筛选的读写口(值 + 它的 setter)。fState 一张表喂五处 —— URL 写、URL 读(兜底)、
 * 快照写、快照回放、请求参数。
 */
export type FilterSlot = {
  /**
   * 当前值('' = 未选)。
   */
  v: string

  /**
   * 换值。
   */
  set: TextFn
}

/**
 * 全部筛选格的表(键 = 筛选键 = buildJobsWhere 的键 = /api/jobs 参数名)。
 */
export type FilterState = Record<string, FilterSlot>

/**
 * 联动下拉的选项集(省/市/区、大/中/小类)。
 */
export type FilterOpts = {
  /**
   * 省全名清单(筛选值就是它)。
   */
  prov: string[]

  /**
   * 市清单(跟着省联动)。
   */
  city: string[]

  /**
   * 区清单(跟着省/市联动)。
   */
  district: string[]

  /**
   * 大分类清单(按行业顺序,不用字母序)。
   */
  broad: string[]

  /**
   * 中分类清单(跟着大类联动)。
   */
  mid: string[]

  /**
   * 小分类清单(跟着大/中类联动)。
   */
  fine: string[]
}

/**
 * 一列的明细:列键 + 备注名 + 是否固定列(固定列不能取消勾选)。
 */
export type ColSpec = {
  /**
   * 列键。
   */
  key: ColKey

  /**
   * 备注名(渲染走 `t('col.' + key)`,这一格只是给读代码的人看的)。
   */
  label: string

  /**
   * 固定列:字段面板里灰着不可取消(职位与操作两列)。
   */
  always?: boolean
}

/**
 * 点这一格去哪:三个弹框之一 / 直连地图 / 什么都不做。
 */
export type Disposition = FieldGroup | 'map' | 'none'

/**
 * 单元格的色档 —— 色是**判定结果**不是排版(薪资有值才绿、走不了才灰),
 * 先算成档再由 CELL_TONE_CLS 换成类。
 */
export type CellTone =
  | 'plain' | 'link' | 'cat' | 'slate' | 'slateSm' | 'ink'
  | 'muted' | 'mutedSm' | 'faintSm' | 'graySm'
  | 'money' | 'moneySm' | 'moneyMd' | 'vsUp' | 'vsDown'
  | 'purpleSm' | 'redSm' | 'redBoldSm' | 'amberSm' | 'cyanSm' | 'tealSm' | 'blueSm'

/**
 * 这一格由哪个哑组件渲。
 */
export type CellKind = 'text' | 'stream' | 'match' | 'needProfile' | 'lock' | 'actions'

/**
 * 单元格展示行:每一格都已经算成文本 + 色档 + 链接,单元格组件只读它,不再碰库行。
 */
export type CellView = {
  /**
   * 渲哪一种。
   */
  kind: CellKind

  /**
   * 显示文本(lock 档给假占位数,actions 档不用)。
   */
  text: string

  /**
   * 色档。
   */
  tone: CellTone

  /**
   * 悬停说明;'' = 不挂。
   */
  title: string

  /**
   * 文字点出去的地图链接;'' = 不是链接。
   */
  href: string

  /**
   * 动态色值(只有大分类列有:色跟着 NOC 分类走,17 类各一色);'' = 不挂。
   */
  color: string

  /**
   * 匹配档(match 档才有:high/mid/low/na)。
   */
  level: string

  /**
   * 点开弹框时的大标题。默认 = 显示文本;元素类的格(TEER 徽章、EE 徽章、chip、锁位)给空串 ——
   * 页眉已有字段名,别拿别列的值凑(旧实现里那几格的 node 是元素,取不出字符串,行为逐字保留)。
   */
  pop: string
}

/**
 * 算一格展示行要的上下文:每格都要、但每格算不出来的东西(译文、分层态、维度表、排除清单)。
 */
export type CellCtx = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 分层态(Pro 列打码看它)。
   */
  plan: JobPlan

  /**
   * 官方具名排除清单,键 `省码|NOC`。
   */
  blocked: BlockedKeys

  /**
   * 维度表里的 EE 类别(算「休眠」要看最近抽选日)。
   */
  eeCats: JobDims['eeCategories']
}

/**
 * 官方具名排除清单的两套键集(整表算一次,逐行 O(1) 查)。
 */
export type BlockedKeys = {
  /**
   * 省提名不受理的 `省码|NOC` 集。
   */
  pnp: Set<string>

  /**
   * 大西洋试点不受理的 `省码|NOC` 集。
   */
  aip: Set<string>
}

/**
 * cellViewOf 一族的入参(列键 + 库行 + 上下文)。
 */
export type CellIn = {
  /**
   * 列键。
   */
  k: ColKey

  /**
   * 库行。
   */
  j: JobFact

  /**
   * 上下文。
   */
  cx: CellCtx
}

/**
 * cookie 里存的「上次算出来的列宽比例」:keys 对得上才敢用(列集变了就作废)。
 */
export type ColWidthSeed = {
  /**
   * 这份比例对应的列集(逗号分隔)。
   */
  keys: string

  /**
   * 各列百分比。
   */
  pct: number[]
}

/**
 * 一列量到的宽度(含单元格内边距)。
 */
export type ColMeasure = {
  /**
   * 表头单行宽(列的第一优先级:表头永不折行、永不截断)。
   */
  head: number

  /**
   * 最长的那个词 —— 列再窄也不能把词拦腰断开(「Newfoundlan / d」)。
   */
  word: number

  /**
   * 九成的值不折行需要的宽。
   */
  p90: number

  /**
   * 最长值需要的宽。
   */
  max: number
}

/**
 * 分宽时一列的输入:量到的四个数 + 钉死的宽(手动拖过或调用方写死)。
 */
export type Alloc = {
  /**
   * 列键。
   */
  key: string

  /**
   * 表头宽。
   */
  head: number

  /**
   * 最长词宽。
   */
  word: number

  /**
   * 九成位宽。
   */
  p90: number

  /**
   * 最长值宽。
   */
  max: number

  /**
   * 钉死的宽;缺席 = 参与瓜分。
   */
  pinned?: number
}

/**
 * 拖列纯算法的入参(Excel 式:总宽恒定不变)。
 */
export type ResizeIn = {
  /**
   * 拖之前各列的实宽。
   */
  base: number[]

  /**
   * 被拖的是第几列。
   */
  idx: number

  /**
   * 想把它拉到多宽。
   */
  want: number

  /**
   * 各列下限(表头不折行)。
   */
  floors: number[]

  /**
   * 各列内容自然宽(缩窄时按它决定谁接手);缺席 = 退回最右一列。
   */
  maxes?: number[]
}

/**
 * 一列离目标宽还差多少(分宽第二步的中间量)。
 */
export type ColWant = {
  /**
   * 列键。
   */
  key: string

  /**
   * 还差多少像素。
   */
  want: number
}

/**
 * 列宽 cookie 解出来的东西(归一前形状:两格都可能压根不在,或类型不对)。
 */
export type SeedJson = {
  /**
   * 这份比例对应的列集(逗号分隔);不是串就整份作废。
   */
  keys?: unknown

  /**
   * 各列百分比;不是同长度的百分比数组就整份作废。
   */
  pct?: unknown
}

/**
 * useColWidths 的入参。
 */
export type ColWidthsIn = {
  /**
   * 当前可见列(顺序即渲染顺序)。
   */
  keys: string[]

  /**
   * 表头 `<tr>`(量宽的锚点,同时用于定位 table / 容器)。
   */
  headRowRef: React.RefObject<HTMLTableRowElement | null>

  /**
   * 数据指纹:列集/语言/当前这批行 —— 变了就重量。
   */
  dataKey: string

  /**
   * 单元格左右内边距之和(量到的是纯内容宽,分宽时要加上)。
   */
  pad: number

  /**
   * 服务端从 cookie 读到的上次比例:首屏就按它定版式,免得水合后抻一下。
   */
  seed: ColWidthSeed | null
}

/**
 * 列宽机器交回的面板。
 */
export type ColWidthsPanel = {
  /**
   * 有宽度可下没:量到了 or 有 cookie 种子。没有就先让浏览器 auto 布局顶一帧。
   */
  ready: boolean

  /**
   * colgroup 用:量到了给像素,只有种子时给百分比(服务端渲染就能定版式,水合不再抻一下)。
   */
  width: (key: string) => number | string | undefined

  /**
   * table 的 width:不溢出时 '100%',溢出时总像素。
   */
  tableWidth: string | number

  /**
   * 总宽超容器(表头都放不下 / 手动拖宽)→ 需要横滚,此时才有必要固定左列。
   */
  overflow: boolean

  /**
   * 按下列右缘竖线:钉死本列宽,其余列照规则重分。
   */
  startResize: (i: ColResizeStartIn) => void

  /**
   * 双击竖线:该列回归自动。
   */
  autoFit: (key: string) => void

  /**
   * 有没有手动拖过的列(有才出「恢复列宽」)。
   */
  hasManual: boolean

  /**
   * 全部手动宽作废。
   */
  reset: ClickFn
}

/**
 * 通道胶囊的一枚(先在 functions 里算成规格,再由哑组件渲)。
 */
export type ChipSpec = {
  /**
   * 语义色档(见 CHIP_TONE_CLS)。
   */
  tone: string

  /**
   * 显示文本。
   */
  text: string

  /**
   * 这枚胶囊代表哪一列(点它开对应字段的弹框)。
   */
  k: ColKey

  /**
   * 悬停说明;'' = 不挂。
   */
  tip: string

  /**
   * 点得开不(不可点的连 onClick 也摘 —— #175:stopPropagation 会吞整卡点击)。
   */
  act: boolean
}

/**
 * chipSpecsOf 的入参。
 */
export type ChipSpecsIn = {
  /**
   * 库行。
   */
  j: JobFact

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 官方具名排除清单。
   */
  blocked: BlockedKeys

  /**
   * 维度表里的 EE 类别。
   */
  eeCats: JobDims['eeCategories']
}

/**
 * 「我的匹配」三态闸的面板:入口点一下要么进视图、要么先建档、要么先登录。
 */
export type MatchGatePanel = {
  /**
   * 点入口(进出匹配视图 / 去建档 / 弹登录)。
   */
  onToggle: ClickFn

  /**
   * 要不要弹注册引导(已登录但没档案)。
   */
  wizard: boolean

  /**
   * 要不要弹登录框(未登录但手里有职业答案)。
   */
  login: boolean

  /**
   * 关掉引导/登录框。
   */
  onClose: ClickFn

  /**
   * 注册引导的初始档案(没有就给 null)。
   */
  profile: MatchProfile | null

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录成功:把本地答案落成档案,再直接落匹配视图(E9-04b)。
   */
  onDone: () => Promise<void>
}

/**
 * 顶栏账户区的面板(身份四件 + 弹框态)。
 */
export type AccountAreaPanel = {
  /**
   * 邮箱;null = 还没拿到。
   */
  email: string | null

  /**
   * 昵称;null = 未设。
   */
  displayName: string | null

  /**
   * 头像 URL;null = 无(下拉头用首字母块)。
   */
  avatar: string | null

  /**
   * Pro 到期日('' = 免费号)。
   */
  proUntil: string

  /**
   * 当前要开哪个登录框;false = 不开。
   */
  auth: false | 'login' | 'register' | 'reset'

  /**
   * 重置密码的 token(邮件链接落地);'' = 不是重置流程。
   */
  resetTok: string

  /**
   * 定价弹窗开着没。
   */
  pricing: boolean

  /**
   * 开登录框。
   */
  onLogin: ClickFn

  /**
   * 开注册框。
   */
  onRegister: ClickFn

  /**
   * 关登录框。
   */
  onAuthClose: ClickFn

  /**
   * 登录成功:洗掉地址栏参数并整页刷新(让 SSR 分层态生效)。
   */
  onAuthDone: ClickFn

  /**
   * 开定价弹窗。
   */
  onPricing: ClickFn

  /**
   * 关定价弹窗。
   */
  onPricingClose: ClickFn
}

/**
 * 弹框态:点一格开哪个弹框、开的是哪一岗。
 */
export type PopupState = {
  /**
   * 开哪一组事实(E8-10:存**分组**不再存字段,24 → 3)。
   */
  group: FieldGroup

  /**
   * 从哪一格点进来的(只用于锚到哪一节,不参与内容分支)。
   */
  srcField: ColKey

  /**
   * 哪一岗。
   */
  job: JobFact

  /**
   * 弹框大标题。
   */
  title: string
}

/**
 * 升级/登录弹框的由头。
 */
export type UpsellKind = false | 'lock' | 'ss' | 'login' | 'match' | 'quiz'

/**
 * 排序方向。
 */
export type SortDir = 'asc' | 'desc'

/**
 * 排序态。
 */
export type SortState = {
  /**
   * 按哪一列。
   */
  key: ColKey

  /**
   * 升还是降。
   */
  dir: SortDir
}

/**
 * 已收藏的一条(收藏行的号 + 状态)。
 */
export type SavedEntry = {
  /**
   * saved-jobs 行的号。
   */
  id: number | string

  /**
   * 状态(wish / applied)。
   */
  status: string
}

/**
 * 全量匹配计数(FOMO「你今日共 X 个高匹配」)。
 */
export type MatchTotals = {
  /**
   * 高匹配数。
   */
  high: number

  /**
   * 中匹配数。
   */
  mid: number
}

/**
 * 数据面板:当前这批行与它们的取数态。
 */
export type BoardDataPanel = {
  /**
   * 当前这批行(SSR 首屏 50 起,翻页累加)。
   */
  rows: JobFact[]

  /**
   * 同 WHERE 的总数。
   */
  total: number

  /**
   * 数据更新时间('' = 还没拿到)。
   */
  updatedAt: string

  /**
   * 维度表。
   */
  dims: JobDims

  /**
   * 在途(整表换血或翻页)。
   */
  loading: boolean

  /**
   * 第 0 页在拉 = 整表换血:表格/卡片半透明 + 顶部「更新中」条(#83)。
   */
  swapping: boolean

  /**
   * 全量匹配计数(FOMO「你今日共 X 个高匹配」);null = 不在匹配视图或还没拿到。
   */
  matchTotals: MatchTotals | null

  /**
   * 再翻一页。
   */
  onMore: ClickFn
}

/**
 * 筛选面板:筛选各格与对这套条件的操作。
 */
export type BoardFiltersPanel = {
  /**
   * 筛选各格的读写口。
   */
  fState: FilterState

  /**
   * 联动下拉选项。
   */
  opts: FilterOpts

  /**
   * 有没有任何筛选在生效。
   */
  anyFilter: boolean

  /**
   * 折叠区里有几项被选中(徽标计数)。
   */
  foldActive: number

  /**
   * 折叠区展开着没。
   */
  fold: boolean

  /**
   * 开合折叠区。
   */
  onFold: ClickFn

  /**
   * 只看直发岗。
   */
  directOnly: boolean

  /**
   * 换「只看直发」。
   */
  onDirect: BoolFn

  /**
   * 职业(NOC)多值的显示名;'' = 没选职业。
   */
  nocLabel: string

  /**
   * 撤掉职业条件。
   */
  onNocClear: ClickFn

  /**
   * 清除全部筛选。
   */
  onClear: ClickFn

  /**
   * 保存这套筛选(登录才出)。
   */
  onSaveSearch: ClickFn
}

/**
 * 列面板:显示哪几列、多宽、固定哪几列。
 */
export type BoardColsPanel = {
  /**
   * 当前可见列(顺序即列序)。
   */
  shown: ColSpec[]

  /**
   * 勾选的列键。
   */
  visible: JobColKey[]

  /**
   * 字段面板开着没。
   */
  open: boolean

  /**
   * 开合字段面板。
   */
  onOpen: ClickFn

  /**
   * 字段面板的外框(点它之外就关)。
   */
  boxRef: React.RefObject<HTMLDivElement | null>

  /**
   * 勾/取消一列。
   */
  onCol: (k: JobColKey) => void

  /**
   * 只显示默认核心列。
   */
  onMain: ClickFn

  /**
   * 全选。
   */
  onAll: ClickFn

  /**
   * 反选。
   */
  onInvert: ClickFn

  /**
   * 列宽机器。
   */
  cw: ColWidthsPanel

  /**
   * 表头 `<tr>`(量宽锚点)。
   */
  headRowRef: React.RefObject<HTMLTableRowElement | null>

  /**
   * 固定左列的累计偏移(键 = 列键,值 = 左偏移像素)。
   */
  stickyLeft: Record<string, number>

  /**
   * 最左连续固定列的集合。
   */
  frozenSet: Set<JobColKey>

  /**
   * 最后一枚固定列(它右边加一道投影);'' = 没有固定列。
   */
  lastFrozen: string
}

/**
 * 弹框层面板:这一屏上开着哪些浮层。
 */
export type BoardModalsPanel = {
  /**
   * 字段弹框态;null = 没开。
   */
  popup: PopupState | null

  /**
   * 关字段弹框。
   */
  onPopupClose: ClickFn

  /**
   * 职位描述弹框的那一岗;null = 没开。
   */
  descJob: JobFact | null

  /**
   * 关职位描述弹框。
   */
  onDescClose: ClickFn

  /**
   * 首访引导开着没。
   */
  wizard: boolean

  /**
   * 关首访引导(置「弹过了」)。
   */
  onWizardClose: ClickFn

  /**
   * 升级/登录弹框的由头;false = 没开。
   */
  upsell: UpsellKind

  /**
   * 关升级/登录弹框。
   */
  onUpsellClose: ClickFn

  /**
   * 匿名注册成功后:把本地答案落成档案再回原处。
   */
  onUpsellDone: () => Promise<void>
}

/**
 * 职位板整台状态机交回的面板。视图各件只读它,不自己持有状态。
 */
export type JobsBoardPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 分层态。
   */
  plan: JobPlan

  /**
   * 数据面板。
   */
  data: BoardDataPanel

  /**
   * 筛选面板。
   */
  filters: BoardFiltersPanel

  /**
   * 列面板。
   */
  cols: BoardColsPanel

  /**
   * 弹框层面板。
   */
  modals: BoardModalsPanel

  /**
   * 排序态。
   */
  sort: SortState

  /**
   * 点表头换排序(新列降序 → 升序 → 回本视图默认)。
   */
  onSort: (k: JobColKey) => void

  /**
   * 匹配视图开着没。
   */
  matchView: boolean

  /**
   * 匹配视图三态闸。
   */
  gate: MatchGatePanel

  /**
   * 已收藏映射(岗位号 → 收藏行)。
   */
  saved: Record<string, SavedEntry>

  /**
   * 收/取消收藏一岗。
   */
  onSave: (j: JobFact) => void

  /**
   * 点一格:开对应弹框 / 跳地图 / 什么都不做。
   */
  onField: (k: JobColKey, j: JobFact, title: string) => void

  /**
   * 开职位描述弹框(职位名格与手机卡职位名)。
   */
  onDesc: (j: JobFact) => void

  /**
   * 开升级弹框(Pro 锁标点击)。
   */
  onUpsellLock: ClickFn

  /**
   * 官方具名排除清单。
   */
  blocked: BlockedKeys

  /**
   * 单元格上下文。
   */
  cellCtx: CellCtx

  /**
   * 搜索框的受控值(它要跟手,所以不走 fState 的防抖那一份)。
   */
  q: string

  /**
   * 换关键词。
   */
  onQ: TextFn

  /**
   * 更新时间那句话;'' = 还没拿到。
   */
  updatedText: string

  /**
   * 一行都没有时的正文(匹配视图与普通视图两句)。
   */
  emptyText: string

  /**
   * 空态里「去改档案」的链接文案;'' = 不出(普通视图)。
   */
  emptyLink: string

  /**
   * 「已全部显示」那句话。
   */
  allShownText: string

  /**
   * 「显示更多(还剩 N)」那句话。
   */
  moreText: string

  /**
   * 差异化证言数字(第 5 轮 #14)。
   */
  proof: ProofCount
}

/**
 * Jobs(职位板)的 props —— 全部由服务端门算好传进来。
 */
export type JobsIn = {
  /**
   * SSR 首屏行。
   */
  jobs: JobFact[]

  /**
   * 数据更新时间。
   */
  updatedAt?: string

  /**
   * 维度表(可省 = 空维度,由客户端补拉)。
   */
  dims?: JobDims

  /**
   * cookie 里的列集(可省 = 默认列)。
   */
  initialCols?: string[]

  /**
   * cookie 里的列宽比例;null = 没有。
   */
  initialColW?: ColWidthSeed | null

  /**
   * 分层态(可省 = 匿名免费)。
   */
  plan?: JobPlan

  /**
   * 库内真实总数(第 15 轮 #34);筛选态由服务端给命中数(第 17 轮 #42)。
   */
  totalCount?: number

  /**
   * 差异化证言数字(第 5 轮 #14)。
   */
  proof?: ProofCount

  /**
   * URL 解析出的初始筛选(SSR 已按它查过库 → 首帧即终态,水合零差异)。
   */
  initialFilters?: JobFilters

  /**
   * 直链进「我的匹配」视图(?view=match)。
   */
  initialMatchView?: boolean
}

/**
 * 证言数字:省提名清单命中岗 + 有外劳记录的雇主数。
 */
export type ProofCount = {
  /**
   * 命中省提名具名清单的岗位数。
   */
  named: number

  /**
   * 有外劳(LMIA)记录的雇主数。
   */
  lmia: number
}

/**
 * 收整台状态机的件(筛选区、表格、卡片流、弹框层……)共用的 props。
 */
export type BoardPanelIn = {
  /**
   * 职位板整台状态机。
   */
  b: JobsBoardPanel
}

/**
 * JobsHeader(职位板顶栏)的 props。
 */
export type JobsHeaderIn = {
  /**
   * 分层态(顶栏账户区与匹配闸都要)。
   */
  plan: JobPlan

  /**
   * 是不是直链进的匹配视图(顶栏那颗钮的亮/灭)。
   */
  matchView: boolean
}

/**
 * AccountArea(顶栏账户区)的 props。
 */
export type AccountAreaIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 分层态。
   */
  plan: JobPlan
}

/**
 * BoardSub(横幅副标)的 props。
 */
export type BoardSubIn = {
  /**
   * 主句:库内总数 / 筛选命中数。
   */
  text: string

  /**
   * 证言句;'' = 不渲(数字全为 0 时)。
   */
  proof: string
}

/**
 * MatchEntry(窄屏「我的匹配」入口条)的 props。
 */
export type MatchEntryIn = {
  /**
   * 钮面文案。
   */
  label: string

  /**
   * 点它走匹配三态闸。
   */
  onClick: ClickFn
}

/**
 * MatchBar(匹配视图状态条)的 props。
 */
export type MatchBarIn = {
  /**
   * 口径说明(带「今日 N 个高匹配」)。
   */
  text: string

  /**
   * 退出钮文案。
   */
  exit: string

  /**
   * 退出匹配视图。
   */
  onExit: ClickFn
}

/**
 * BoardLoading(整表换血条)的 props。
 */
export type BoardLoadingIn = {
  /**
   * 「更新中」文案。
   */
  text: string
}

/**
 * MatchGate(匹配三态闸的弹框层)的 props。
 */
export type MatchGateIn = {
  /**
   * 三态闸面板。
   */
  g: MatchGatePanel
}

/**
 * HeadCell(表头一格)的 props。
 */
export type HeadCellIn = {
  /**
   * 这一格的展示行。
   */
  h: HeadCellView
}


/**
 * SkeletonRow(换血中的骨架行)的 props。
 */
export type SkeletonRowIn = {
  /**
   * 这一行要铺几格。
   */
  cols: ColSpec[]
}

/**
 * BoardRow(表格一行)的 props。
 */
export type BoardRowIn = {
  /**
   * 职位板整台状态机。
   */
  b: JobsBoardPanel

  /**
   * 这一行的库行。
   */
  job: JobFact

  /**
   * 斑马纹的另一档。
   */
  alt: boolean
}

/**
 * BoardCell(表格一格)的 props。
 */
export type BoardCellIn = {
  /**
   * 职位板整台状态机。
   */
  b: JobsBoardPanel

  /**
   * 这一格的库行。
   */
  job: JobFact

  /**
   * 列键。
   */
  k: ColKey

  /**
   * 斑马纹的另一档(固定列要拿它当不透明底色)。
   */
  alt: boolean
}

/**
 * CellText(哑文本格)的 props。
 */
export type CellTextIn = {
  /**
   * 展示行。
   */
  view: CellView
}

/**
 * MatchCell(匹配档 chip)的 props。
 */
export type MatchCellIn = {
  /**
   * 档名文案。
   */
  text: string

  /**
   * 档(high/mid/low/na —— 决定配色)。
   */
  level: string

  /**
   * 悬停说明(#207:裸字「高/中/低」无口径,挂 title 说清是什么的高低)。
   */
  title: string
}

/**
 * NeedProfileCell(未建档引导格)的 props。
 */
export type NeedProfileCellIn = {
  /**
   * 引导文案。
   */
  text: string
}

/**
 * StreamCell(具名紧缺通道徽章)的 props。
 */
export type StreamCellIn = {
  /**
   * 通道名。
   */
  text: string
}

/**
 * LockCell(Pro 锁位)的 props。
 */
export type LockCellIn = {
  /**
   * 打码占位数(假的,真值免费态压根没出服务端)。
   */
  mask: string

  /**
   * 按列说人话的悬停说明。
   */
  title: string

  /**
   * 点它开升级弹框。
   */
  onUpsell: ClickFn
}

/**
 * ActionsCell(操作列)的 props。
 */
export type ActionsCellIn = {
  /**
   * 钮面文案(已收藏 / 收藏)。
   */
  label: string

  /**
   * 已收藏态。
   */
  on: boolean

  /**
   * 收/取消收藏。
   */
  onToggle: ClickFn
}

/**
 * EmptyNote(一条都没有时的那句话)的 props。
 */
export type EmptyNoteIn = {
  /**
   * 空态正文。
   */
  text: string

  /**
   * 去建档的链接文案;'' = 不出链接(普通视图的空态)。
   */
  link: string
}

/**
 * BoardCard(手机卡片一张)的 props。
 */
export type BoardCardIn = {
  /**
   * 职位板整台状态机。
   */
  b: JobsBoardPanel

  /**
   * 这一张的库行。
   */
  job: JobFact
}

/**
 * BoardChip(卡片上的一枚通道胶囊)的 props。
 */
export type BoardChipIn = {
  /**
   * 胶囊规格。
   */
  spec: ChipSpec

  /**
   * 点它开对应字段的弹框(不可点时给 null)。
   */
  onOpen: ClickFn | null
}

/**
 * CardLocation(卡片上的市/省两段链接)的 props。
 */
export type CardLocationIn = {
  /**
   * 市名。
   */
  city: string

  /**
   * 省码;'' = 只出市。
   */
  prov: string

  /**
   * 市名的地图链接。
   */
  cityHref: string

  /**
   * 省的地图链接。
   */
  provHref: string

  /**
   * 点市名开地点弹框(拦住本段的默认外链与整卡的跳转)。
   */
  onCity: (e: React.MouseEvent) => void

  /**
   * 点省码开地点弹框。
   */
  onProv: (e: React.MouseEvent) => void
}

/**
 * 详情页维度:B2 后页面只用 NOC 职业名与分类译名(其余维度随移民卡砍一并不用)。
 */
export type JobPageDims = {
  /**
   * 本岗 NOC 的官方职业名与职责。
   */
  nocDesc: NocDesc[]

  /**
   * 本岗分类的英韩名(详情页直入时渲面包屑要它)。
   */
  nocCategories: CatLabel[]
}

/**
 * 分类维表里本页真读的那几格(三级分类码与它们的英韩名,全格可空)。
 */
export type CatLabel = {
  /**
   * 大分类码。
   */
  broad?: string

  /**
   * 中分类码。
   */
  mid?: string

  /**
   * 小分类码。
   */
  fine?: string

  /**
   * 大分类英文名。
   */
  broadEn?: string

  /**
   * 大分类韩文名。
   */
  broadKo?: string

  /**
   * 中分类英文名。
   */
  midEn?: string

  /**
   * 中分类韩文名。
   */
  midKo?: string

  /**
   * 小分类英文名。
   */
  fineEn?: string

  /**
   * 小分类韩文名。
   */
  fineKo?: string
}

/**
 * 相似职位(2026-08-11 Frank「下架了应该下面列出其他相似职位」):只在 closed 岗查。
 */
export type RelatedJobs = {
  /**
   * 同公司的在招岗。
   */
  sameCompany: RelatedJob[]

  /**
   * 同省同职业的在招岗。
   */
  sameOcc: RelatedJob[]

  /**
   * 兜底链按哪一级筛(服务端探过本省该级确实还有在招岗);null = 只按省。
   */
  fallbackLevel: 'fine' | 'mid' | 'broad' | null
}

/**
 * Job(职位详情正文)的 props。
 */
export type JobIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 分层态。
   */
  plan: JobPlan

  /**
   * 页面维度。
   */
  dims: JobPageDims

  /**
   * 相似职位(在招岗恒空)。
   */
  related: RelatedJobs
}

/**
 * 面包屑的一段(职业分类路径)。
 */
export type CrumbSeg = {
  /**
   * 显示名。
   */
  txt: string

  /**
   * 去处。
   */
  href: string
}

/**
 * JobCrumbs(面包屑)的 props。
 */
export type JobCrumbsIn = {
  /**
   * 首段「职位板」的文案。
   */
  home: string

  /**
   * 省段显示名;'' = 本岗没省,不渲这一段。
   */
  prov: string

  /**
   * 省段去处。
   */
  provHref: string

  /**
   * 职业分类路径段(同名相邻已跳过)。
   */
  segs: CrumbSeg[]
}

/**
 * JobRelated(相似职位卡)的 props。
 */
export type JobRelatedIn = {
  /**
   * 卡标题。
   */
  head: string

  /**
   * 同公司组的小标题。
   */
  sameCoLabel: string

  /**
   * 同职业组的小标题。
   */
  sameOccLabel: string

  /**
   * 相似职位。
   */
  related: RelatedJobs

  /**
   * 兜底链去处;'' = 不出兜底链。
   */
  fallbackHref: string

  /**
   * 兜底链文案。
   */
  fallbackText: string
}

/**
 * RelatedGroup(相似职位的一组)的 props。
 */
export type RelatedGroupIn = {
  /**
   * 组小标题。
   */
  label: string

  /**
   * 这一组的行。
   */
  rows: RelatedJob[]

  /**
   * 行内灰字小注要不要写公司名(同公司组不写 —— 组标题已经说了)。
   */
  withCompany: boolean
}

/**
 * JobBody(JD 正文身体:详情页与弹框同一棵树)的 props。
 */
export type JobBodyIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 分层态。
   */
  plan: JobPlan

  /**
   * 在弹框里(出「打开完整页」;整页版自己就是完整页)。
   */
  inModal?: boolean

  /**
   * 额度可见化回传(弹框页眉用;页面不挂)。
   */
  onFreeLeft?: (n: number) => void
}

/**
 * JD 正文的取数态:在途 / 拿到了 / 这一岗没正文 / 被防滥用闸挡下。
 */
export type JdStatus = 'loading' | 'done' | 'empty' | 'limited'

/**
 * 整理版失败的三种由头 —— quota = 额度用完(重试无用不给钮)/ fail = 生成失败(可重试)/
 * notext = 无正文(不显示失败行,空态自己解释)。
 */
export type FmtWhy = 'quota' | 'fail' | 'notext'

/**
 * 中文对照的取数态。
 */
export type TransStatus = 'idle' | 'loading' | 'error'

/**
 * JD 正文取数的结果档。三态分明:402 = 额度、429 = 限流、其它非 2xx = 取数失败,
 * 不把限流谎报成缺数据 —— #134 那类最恶的静默失败。
 */
export type JobTextStatus = 'ok' | 'gated' | 'limited' | 'error' | 'empty'

/**
 * JD 正文取数的结果。
 */
export type JobTextOut = {
  /**
   * 结果档。
   */
  status: JobTextStatus

  /**
   * 正文('' = 没拿到)。
   */
  text: string

  /**
   * 剩余免费次数;null = 命中缓存(没消耗,额度行不刷新)。
   */
  freeLeft: number | null
}

/**
 * JobBody 状态机交回的面板。
 */
export type JobBodyPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 正文。
   */
  text: string

  /**
   * 正文取数态。
   */
  status: JdStatus

  /**
   * AI 五节整理版;undefined = 整理中,null = 没有(降级原文)。
   */
  fmt: string | null | undefined

  /**
   * 整理版失败的由头。
   */
  fmtWhy: FmtWhy

  /**
   * 在看原文(整理版一键切换)。
   */
  showOrig: boolean

  /**
   * 切换原文/整理版。
   */
  onToggleOrig: ClickFn

  /**
   * 重试生成整理版。
   */
  onRetryFmt: ClickFn

  /**
   * AI 速读展开着没。
   */
  aiOn: boolean

  /**
   * 开合 AI 速读。
   */
  onToggleAi: ClickFn

  /**
   * 中文对照在屏没。
   */
  showTrans: boolean

  /**
   * 对照译文;null = 还没拉。
   */
  trans: string | null

  /**
   * 对照的取数态。
   */
  transStatus: TransStatus

  /**
   * 开合中文对照(首次点会去拉)。
   */
  onToggleTrans: ClickFn

  /**
   * 投递邮箱('' = 外跳原帖)。
   */
  applyEmail: string

  /**
   * 投递方式查完了没(OAuth 回跳续投要等它,别把邮箱岗投成外跳)。
   */
  applyDone: boolean
}

/**
 * JdActs(顶部钮行)的 props。
 */
export type JdActsIn = {
  /**
   * JobBody 状态机。
   */
  d: JobBodyPanel

  /**
   * 界面语言(英文界面不出中文对照)。
   */
  lang: Lang

  /**
   * 「打开完整页」的去处;'' = 不出这颗钮(整页版)。
   */
  fullHref: string
}

/**
 * JdAiNote(整理版状态行)的 props。
 */
export type JdAiNoteIn = {
  /**
   * JobBody 状态机。
   */
  d: JobBodyPanel

  /**
   * 未登录(额度用完时补一句登录提额说明)。
   */
  anon: boolean
}

/**
 * JdTextView(原文保真轨)的 props。
 */
export type JdTextViewIn = {
  /**
   * 抓到的正文。
   */
  text: string

  /**
   * 截断长度(可省 = 4000)。
   */
  max?: number
}

/**
 * JD 正文一行的渲染档:空行 / 列表项 / 大节头 / 子节头 / 「Label: 值」/ 普通正文行。
 */
export type JdLineKind = 'gap' | 'bullet' | 'h1' | 'h2' | 'label' | 'text'

/**
 * JD 正文的一行(先算成档再渲)。
 */
export type JdLineView = {
  /**
   * 渲哪一档。
   */
  kind: JdLineKind

  /**
   * 正文(label 档时是冒号右边那半)。
   */
  text: string

  /**
   * 「Label:」那半;'' = 不是标签行。
   */
  label: string
}

/**
 * JdLine(JD 正文一行)的 props。
 */
export type JdLineIn = {
  /**
   * 这一行的展示行。
   */
  view: JdLineView
}

/**
 * JdFormattedView(五节整理版)的 props。
 */
export type JdFormattedViewIn = {
  /**
   * 整理版标记文本。
   */
  text: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 帖面薪资(#123c:原帖正文没写薪资时兜底);'' = 没有。
   */
  fallbackPay: string

  /**
   * 官方原帖链接('' = 没有)。
   */
  applyUrl: string

  /**
   * 投递邮箱('' = 没抽到)。
   */
  applyEmail: string

  /**
   * 紧跟大标题(详情页):首节省略小标题(#155/#161)。
   */
  underTitle: boolean

  /**
   * 同结构译文(行位保真);'' = 不出对照。
   */
  trans: string
}

/**
 * 整理版一节里的一行(原文 + 对齐的译文)。
 */
export type JdPair = {
  /**
   * 原文行。
   */
  en: string

  /**
   * 对齐的译文行;'' = 这一行不出对照。
   */
  zh: string
}


/**
 * ApplyBar(投递栏)的 props。
 */
export type ApplyBarIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 投递邮箱('' = 外跳原帖)。
   */
  email: string

  /**
   * 投递方式查完了没。
   */
  emailDone: boolean

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 分层态。
   */
  plan: JobPlan

  /**
   * 在整页里(窄屏改 fixed 常驻视口底;弹框里维持 sticky)。
   */
  onPage: boolean
}

/**
 * 投递流程的三段:闲置 → 注册闸 → 求职意向。
 */
export type ApplyStage = 'idle' | 'auth' | 'intent'

/**
 * ApplyBar 状态机交回的面板。
 */
export type ApplyBarPanel = {
  /**
   * 当前段。
   */
  stage: ApplyStage

  /**
   * 窄屏整页版:投递栏改 fixed 贴屏底(sticky 只在父容器盒内吸底,整页版父级是白卡)。
   */
  fixedBar: boolean

  /**
   * 简历对照要用的 JD 正文;null = 未开,'' = 拿不到全文。
   */
  matchJd: string | null

  /**
   * 开简历对照。
   */
  onMatch: ClickFn

  /**
   * 关简历对照。
   */
  onMatchClose: ClickFn

  /**
   * 点投递(按注册闸/建档闸分流)。
   */
  onApply: ClickFn

  /**
   * 流程内已登录(不整页 reload,SSR plan 下次导航自然更新)。
   */
  authed: boolean

  /**
   * 关注册框。
   */
  onAuthClose: ClickFn

  /**
   * 注册成功:有档案直接投,没档案才进向导。
   */
  onAuthDone: () => Promise<void>

  /**
   * 求职意向表单的初始档案。
   */
  intentProfile: MatchProfile | null

  /**
   * 关/完成意向表单:都继续投递(投递必须丝滑)。
   */
  onIntentDone: ClickFn
}

/**
 * JdSource(底部来源行)的 props。
 */
export type JdSourceIn = {
  /**
   * 「来源」标签。
   */
  label: string

  /**
   * 官方原帖链接。
   */
  url: string

  /**
   * 只报域名不铺整条链接(#239)。
   */
  host: string
}

/**
 * JdEmpty(这一岗没正文)的 props。
 */
export type JdEmptyIn = {
  /**
   * 空态说明(原站拦抓取时说清是谁拦的)。
   */
  note: string

  /**
   * 官方原帖链接('' = 不出钮)。
   */
  url: string

  /**
   * 钮面文案。
   */
  label: string
}

/**
 * JdClosed(已下架横幅)的 props。
 */
export type JdClosedIn = {
  /**
   * 横幅正文。
   */
  text: string
}

/**
 * NocDutiesView(NOC 官方职责/要求)的 props。
 */
export type NocDutiesViewIn = {
  /**
   * 本岗 NOC 的官方描述;null = 维度表里没有,整块不渲。
   */
  noc: NocDesc | null

  /**
   * 界面语言。
   */
  lang: Lang
}

/**
 * NocDutiesBlock(职责或要求的一块)的 props。
 */
export type NocDutiesBlockIn = {
  /**
   * 小标题(带抓取日期)。
   */
  label: string

  /**
   * 正文(换行分隔的条目)。
   */
  text: string
}

/**
 * makeAgeText 的入参。
 */
export type AgeTextIn = {
  /**
   * 取词函数(界面语言)。
   */
  t: TFn
}

/**
 * 挂帖时长的文案函数:天数 → 括号里那句话。
 */
export type AgeTextFn = (days: number) => string

/**
 * 分类显示名的入参。
 */
export type CatLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 分类值;缺席或「未分类」都走「未分类」文案。
   */
  v: string
}

/**
 * cookieStringOf 的入参。
 */
export type CookieIn = {
  /**
   * cookie 名。
   */
  name: string

  /**
   * 已编码的值。
   */
  value: string

  /**
   * 存活秒数。
   */
  maxAge: number
}

/**
 * frozenStyleOf 的入参(固定列的贴边样式)。
 */
export type FrozenStyleIn = {
  /**
   * 列键。
   */
  k: ColKey

  /**
   * 真的横滚了没(不滚就不必固定)。
   */
  overflow: boolean

  /**
   * 最左连续固定列的集合。
   */
  frozenSet: Set<ColKey>

  /**
   * 累计左偏移表。
   */
  stickyLeft: Record<string, number>

  /**
   * 最后一枚固定列(它右边加一道投影)。
   */
  lastFrozen: string

  /**
   * 不透明底色(挡住滚动内容)。
   */
  bg: string

  /**
   * 竖线颜色。
   */
  line: string
}

/**
 * 取词 + 库行的通用入参(算 chip 文案、算兜底句这类)。
 */
export type JobTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 库行。
   */
  j: JobFact
}

/**
 * filterValueOf 的入参:一格 URL 参数的筛选键与原始值。
 */
export type FilterValueIn = {
  /**
   * 筛选键(省那一格要翻成全名)。
   */
  fKey: string

  /**
   * URL 上的原始值(已去首尾空白)。
   */
  raw: string
}

/**
 * curFiltersOf 的入参。
 */
export type CurFiltersIn = {
  /**
   * 筛选各格的读写口。
   */
  fState: FilterState

  /**
   * 关键词(可传防抖后的词)。
   */
  q: string

  /**
   * 只看直发岗。
   */
  directOnly: boolean
}

/**
 * headTitleOf 的入参。
 */
export type HeadTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 列键。
   */
  k: JobColKey
}

/**
 * sortMarkOf 的入参。
 */
export type SortMarkIn = {
  /**
   * 当前是不是按这一列排。
   */
  active: boolean

  /**
   * 排序方向。
   */
  dir: string
}

/**
 * nextSortOf 的入参。
 */
export type NextSortIn = {
  /**
   * 当前排序态。
   */
  sort: SortState

  /**
   * 点的哪一列。
   */
  key: JobColKey

  /**
   * 本视图的默认排序列(第三下取消时回到它)。
   */
  fallback: JobColKey
}

/**
 * 官方具名清单维表里本域真读的那几格。
 */
export type PnpOccRow = {
  /**
   * 清单类型;只有 'ineligible' 那一档进排除集。
   */
  type: string

  /**
   * 所属项目(PNP / AIP);空串按 PNP 算。
   */
  program: string

  /**
   * 省码。
   */
  province: string

  /**
   * NOC 码。
   */
  noc: string
}

/**
 * kMoneyOf 的入参。
 */
export type KMoneyIn = {
  /**
   * 年薪;null = 没有。
   */
  v: number | null

  /**
   * 有值时的色档。
   */
  tone: CellTone
}

/**
 * mapHrefOf 的入参。
 */
export type MapHrefIn = {
  /**
   * 列键(决定查哪一级)。
   */
  k: JobColKey

  /**
   * 库行。
   */
  j: JobFact

  /**
   * 这一级的显示值;'' = 没值,不给链接。
   */
  has: string
}

/**
 * chipOf 的入参。
 */
export type ChipIn = {
  /**
   * 语义色档。
   */
  tone: string

  /**
   * 显示文本。
   */
  text: string

  /**
   * 代表哪一列(点它开对应字段的弹框)。
   */
  k: JobColKey

  /**
   * 悬停说明;'' = 不挂。
   */
  tip: string
}

/**
 * anyRouteOf 的入参。
 */
export type AnyRouteIn = {
  /**
   * 库行。
   */
  j: JobFact

  /**
   * 是不是魁省岗。
   */
  isQc: boolean

  /**
   * 命中省提名排除清单。
   */
  pnpExcl: boolean

  /**
   * 命中大西洋试点排除清单。
   */
  aipBlocked: boolean
}

/**
 * 胶囊收集器的入参(往 out 里推)。
 */
export type ChipPushIn = {
  /**
   * 收集器。
   */
  out: ChipSpec[]

  /**
   * 库行、取词函数、排除清单与 EE 维度。
   */
  x: ChipSpecsIn
}

/**
 * 带两条排除判定的胶囊收集器入参。
 */
export type ChipPushBlockIn = {
  /**
   * 收集器。
   */
  out: ChipSpec[]

  /**
   * 库行、取词函数、排除清单与 EE 维度。
   */
  x: ChipSpecsIn

  /**
   * 命中省提名排除清单。
   */
  pnpExcl: boolean

  /**
   * 命中大西洋试点排除清单。
   */
  aipBlocked: boolean
}

/**
 * 带魁省判定的胶囊收集器入参。
 */
export type ChipPushQcIn = {
  /**
   * 收集器。
   */
  out: ChipSpec[]

  /**
   * 库行、取词函数、排除清单与 EE 维度。
   */
  x: ChipSpecsIn

  /**
   * 是不是魁省岗。
   */
  isQc: boolean
}

/**
 * nocLabelOf 的入参。
 */
export type NocLabelIn = {
  /**
   * 逗号分隔的 NOC 多值。
   */
  fNoc: string

  /**
   * NOC 码 → 译名;查不到给空串。
   */
  nameOf: (code: string) => string

  /**
   * 界面语言(决定用顿号还是逗号连接)。
   */
  lang: string
}

/**
 * nOf 的入参:数组格的读值与兜底。
 */
export type NumOrIn = {
  /**
   * 读到的值;缺席 = undefined。
   */
  v: number | undefined

  /**
   * 兜底值。
   */
  or: number
}

/**
 * donorsOf 的入参。
 */
export type DonorsIn = {
  /**
   * 被拖的是第几列。
   */
  idx: number

  /**
   * 总列数。
   */
  len: number
}

/**
 * takerOf 的入参。
 */
export type TakerIn = {
  /**
   * 让宽列的下标序列。
   */
  donors: number[]

  /**
   * 当前各列宽。
   */
  w: number[]

  /**
   * 各列内容自然宽;缺席 = 退回最右一列。
   */
  maxes: number[] | undefined
}

/**
 * gapOf 的入参。
 */
export type GapIn = {
  /**
   * 各列内容自然宽。
   */
  maxes: number[]

  /**
   * 当前各列宽。
   */
  w: number[]

  /**
   * 第几列。
   */
  i: number
}

/**
 * allocateColWidths 的入参。
 */
export type AllocateIn = {
  /**
   * 各列的量宽结果。
   */
  cols: Alloc[]

  /**
   * 可分宽度(容器宽)。
   */
  avail: number
}

/**
 * 分宽第二步的目标:九成位或最长值。
 */
export type FillTarget = 'p90' | 'max'

/**
 * fillTo 的入参。
 */
export type FillIn = {
  /**
   * 分宽表(就地改)。
   */
  out: Record<string, number>

  /**
   * 参与瓜分的列。
   */
  flex: Alloc[]

  /**
   * 还剩多少可分。
   */
  extra: number

  /**
   * 这一趟补到哪。
   */
  target: FillTarget
}

/**
 * wantsOf 的入参。
 */
export type WantsIn = {
  /**
   * 分宽表。
   */
  out: Record<string, number>

  /**
   * 参与瓜分的列。
   */
  flex: Alloc[]

  /**
   * 目标。
   */
  target: FillTarget
}

/**
 * roundOut 的入参。
 */
export type RoundIn = {
  /**
   * 分宽表(就地改)。
   */
  out: Record<string, number>

  /**
   * 参与瓜分的列。
   */
  flex: Alloc[]

  /**
   * 可分宽度(舍入后总和要等于它)。
   */
  room: number
}

/**
 * jdRe 的入参:按模板造一枚标签正则。
 */
export type JdReIn = {
  /**
   * 正则模板(带填充位)。
   */
  tpl: string

  /**
   * 正则标志;'' = 无。
   */
  flags: string
}

/**
 * jdLinesOf 的入参。
 */
export type JdLinesIn = {
  /**
   * 抓到的正文。
   */
  text: string

  /**
   * 截断长度。
   */
  max: number
}

/**
 * jdPairsOf 的入参。
 */
export type JdPairsIn = {
  /**
   * 这一节的原文。
   */
  body: string

  /**
   * 这一节的译文;'' = 不出对照。
   */
  trans: string
}

/**
 * jdPayFallbackOf 的入参。
 */
export type JdPayIn = {
  /**
   * 这一节的行。
   */
  pairs: JdPair[]

  /**
   * 帖面薪资;'' = 没有。
   */
  fallbackPay: string
}

/**
 * mailtoOf 的入参。
 */
export type MailtoIn = {
  /**
   * 收件邮箱。
   */
  email: string

  /**
   * 本岗。
   */
  job: JobFact
}

/**
 * mailBodyOf 的入参。
 */
export type MailBodyIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 岗名。
   */
  title: string

  /**
   * 公司名;'' = 没有。
   */
  company: string
}

/**
 * extractSug 交回的两半。
 */
export type SugOut = {
  /**
   * 正文(已摘掉建议行)。
   */
  body: string

  /**
   * 建议问题;'' = 没摘到(chip 走罐头池)。
   */
  sug: string
}

/**
 * capSug / scrubCompany 的入参。
 */
export type CapSugIn = {
  /**
   * 原句。
   */
  q: string

  /**
   * 雇主名;'' = 不替换。
   */
  company: string

  /**
   * 界面语言;缺席按中文取指代词。
   */
  lang: string | undefined
}

/**
 * catSegsOf 的入参。
 */
export type CatSegsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 大分类。
   */
  broad: string

  /**
   * 中分类。
   */
  mid: string

  /**
   * 小分类。
   */
  fine: string
}

/**
 * fallbackHrefOf 的入参。
 */
export type FallbackHrefIn = {
  /**
   * 省码;'' = 不出兜底链。
   */
  province: string

  /**
   * 按哪一级筛(fine/mid/broad)。
   */
  level: string

  /**
   * 那一级的值;'' = 只按省。
   */
  value: string
}

/**
 * provWordOf 的入参。
 */
export type ProvWordIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省码。
   */
  province: string

  /**
   * 省全名(字典缺键时退它)。
   */
  full: string
}

/**
 * provFullOf 的入参。
 */
export type ProvFullIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省码;'' = 那一格整个不渲。
   */
  province: string
}

/**
 * measureColWidths 的入参。
 */
export type MeasureIn = {
  /**
   * 当前可见列(顺序即渲染顺序)。
   */
  keys: string[]

  /**
   * 表头 `<tr>`;null = 还没挂上,这一帧不量。
   */
  head: HTMLTableRowElement | null

  /**
   * 单元格左右内边距之和。
   */
  pad: number
}

/**
 * 量宽的结果。
 */
export type MeasureOut = {
  /**
   * 每列量到的四个数。
   */
  measured: Record<string, ColMeasure>

  /**
   * 容器可分宽度。
   */
  wrapW: number
}

/**
 * makeColResize 的入参:拖列要用的活引用(列集与量宽结果都会变,不能闭包在首帧)。
 */
export type ColResizeIn = {
  /**
   * 当前列集的活引用。
   */
  keysRef: React.RefObject<string[]>

  /**
   * 量宽结果的活引用。
   */
  measuredRef: React.RefObject<Record<string, ColMeasure>>

  /**
   * 把算出来的手动宽写回去。
   */
  setManual: (w: Record<string, number>) => void
}

/**
 * 按下列右缘竖线时交进来的东西。
 */
export type ColResizeStartIn = {
  /**
   * 鼠标按下事件。
   */
  e: React.MouseEvent

  /**
   * 被拖的列键。
   */
  key: string
}

/**
 * 开一格字段弹框的手柄工厂入参。
 */
export type FieldOpenIn = {
  /**
   * 单一路由:查 FIELD_GROUP 决定开哪个弹框 / 跳地图 / 什么都不做。
   */
  onField: (k: JobColKey, j: JobFact, title: string) => void

  /**
   * 这一格所在的库行。
   */
  job: JobFact

  /**
   * 列键。
   */
  k: JobColKey

  /**
   * 弹框大标题。
   */
  title: string
}

/**
 * 收/取消收藏的手柄工厂入参。
 */
export type SaveToggleIn = {
  /**
   * 收藏开关。
   */
  onSave: (j: JobFact) => void

  /**
   * 这一岗。
   */
  job: JobFact
}

/**
 * 开职位描述弹框的手柄工厂入参。
 */
export type DescOpenIn = {
  /**
   * 开职位描述弹框。
   */
  onDesc: (j: JobFact) => void

  /**
   * 这一岗。
   */
  job: JobFact
}

/**
 * 收一个列键的手柄工厂入参(勾列、点表头排序、拖列、双击回自动)。
 */
export type ColActionIn = {
  /**
   * 收列键的动作。
   */
  act: (k: JobColKey) => void

  /**
   * 列键。
   */
  k: JobColKey
}

/**
 * 拖列手柄工厂的入参。
 */
export type ResizeBindIn = {
  /**
   * 列宽机器。
   */
  cw: ColWidthsPanel

  /**
   * 列键。
   */
  k: string
}

/**
 * 一格表格单元格的展示行(把这一格的展示行、可点态、贴边样式与手柄一次算好)。
 */
export type BoardCellView = {
  /**
   * 单元格展示行。
   */
  view: CellView

  /**
   * 这一格现在可不可点。
   */
  active: boolean

  /**
   * 这一岗已收藏没(操作列要它)。
   */
  saved: boolean

  /**
   * 收藏钮的钮面文案。
   */
  saveLabel: string

  /**
   * 收/取消收藏。
   */
  onSave: ClickFn

  /**
   * 格内链接的点击(只跳地图,不连带开整格的弹框)。
   */
  onLink: (e: React.MouseEvent) => void

  /**
   * 是数据格(操作列不是:它装的是按钮,不挂裁剪与断词)。
   */
  isCell: boolean

  /**
   * 格子的悬停说明;'' = 不挂。
   */
  title: string

  /**
   * 固定列的贴边样式;null = 不固定。
   */
  frozen: React.CSSProperties | null

  /**
   * 内容不折行(原子值列)。
   */
  nowrap: boolean

  /**
   * 点这一格开什么(不可点时给 null)。
   */
  onClick: ClickFn | null
}

/**
 * 量宽两趟共用的入参。
 */
export type MeasurePassIn = {
  /**
   * 列集。
   */
  keys: string[]

  /**
   * 表头行。
   */
  head: HTMLTableRowElement

  /**
   * 表格。
   */
  table: HTMLTableElement

  /**
   * 格内边距。
   */
  pad: number
}

/**
 * 量宽第二趟的入参(第一趟的结果就地补 word 那一格)。
 */
export type MeasureWordIn = {
  /**
   * 列集。
   */
  keys: string[]

  /**
   * 表格。
   */
  table: HTMLTableElement

  /**
   * 格内边距。
   */
  pad: number

  /**
   * 第一趟的结果。
   */
  measured: Record<string, ColMeasure>
}

/**
 * 拖动期间要用的全部量。
 */
export type DragIn = {
  /**
   * 拖之前各列的实宽。
   */
  base: number[]

  /**
   * 被拖的是第几列。
   */
  idx: number

  /**
   * 各列下限。
   */
  floors: number[]

  /**
   * 各列内容自然宽。
   */
  maxes: number[]

  /**
   * 列集(顺序即列序)。
   */
  order: string[]

  /**
   * 按下时的横坐标。
   */
  startX: number

  /**
   * 把算出来的手动宽写回去。
   */
  setManual: (w: Record<string, number>) => void
}

/**
 * headCell 的入参:取表头的第几格。
 */
export type HeadCellAtIn = {
  /**
   * 表头行。
   */
  head: HTMLTableRowElement

  /**
   * 第几格。
   */
  i: number
}

/**
 * thWidth 的入参。
 */
export type ThWidthIn = {
  /**
   * 表头格;null = 量不到。
   */
  th: HTMLElement | null

  /**
   * 格内边距。
   */
  pad: number
}

/**
 * cellWidths 的入参。
 */
export type CellWidthsIn = {
  /**
   * 参与量宽的行。
   */
  rows: Element[]

  /**
   * 第几列。
   */
  i: number
}

/**
 * floorsOf / maxesOf 的入参。
 */
export type ColStatsIn = {
  /**
   * 列集(顺序即列序)。
   */
  order: string[]

  /**
   * 量宽结果。
   */
  measured: Record<string, ColMeasure>
}

/**
 * stickyOffsetsOf 的入参。
 */
export type StickyOffsetsIn = {
  /**
   * 表头行;null = 还没挂上。
   */
  head: HTMLTableRowElement | null

  /**
   * 要冻结的列键(顺序即列序)。
   */
  frozenKeys: string[]
}

/**
 * useMatchGate 的入参。
 */
export type MatchGateHookIn = {
  /**
   * 分层态(未登录 / 未建档 / 可进,三态分流)。
   */
  plan: JobPlan

  /**
   * 当前在不在匹配视图(决定这一下是进还是出)。
   */
  matchView: boolean

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * useBoardFilters 的入参。
 */
export type BoardFiltersHookIn = {
  /**
   * URL 解析出的初始筛选(SSR 已按它查过库)。
   */
  initialFilters: JobFilters

  /**
   * 维度表(联动下拉选项从它取)。
   */
  dims: JobDims

  /**
   * 界面语言(职业胶囊的连接符与译名按它取)。
   */
  lang: Lang

  /**
   * 取词函数(存筛选的三句提示)。
   */
  t: TFn

  /**
   * 分层态(免费触上限才弹升级)。
   */
  plan: JobPlan

  /**
   * 存筛选触上限时的去处。
   */
  onLimit: ClickFn
}

/**
 * 筛选状态机交回的东西(面板 + 内部要用的两样)。
 */
export type BoardFiltersHookOut = {
  /**
   * 交给视图的筛选面板。
   */
  panel: BoardFiltersPanel

  /**
   * 关键词(搜索框受控值)。
   */
  q: string

  /**
   * 换关键词。
   */
  setQ: TextFn

  /**
   * 当前非默认筛选(关键词已防抖 —— 取数按它走)。
   */
  cur: JobFilters

  /**
   * 当前非默认筛选(关键词未防抖 —— URL 与快照按它走)。
   */
  snap: JobFilters

  /**
   * 只看直发的写口(快照回放要用)。
   */
  setDirect: BoolFn
}

/**
 * useBoardCols 的入参。
 */
export type BoardColsHookIn = {
  /**
   * cookie 里的列集;缺席 = 默认列。
   */
  initialCols: string[] | undefined

  /**
   * cookie 里的列宽比例;null = 没有。
   */
  initialColW: ColWidthSeed | null

  /**
   * 界面语言(换语言要重量宽)。
   */
  lang: Lang

  /**
   * 当前这批行(数据指纹的一部分)。
   */
  rows: JobFact[]
}

/**
 * useBoardData 的入参。
 */
export type BoardDataHookIn = {
  /**
   * 组件收到的全部 props。
   */
  props: JobsIn

  /**
   * 当前非默认筛选。
   */
  cur: JobFilters

  /**
   * 排序态。
   */
  sort: SortState

  /**
   * 匹配视图开着没。
   */
  matchView: boolean
}

/**
 * 分类维表里本域真读的那几格。
 */
export type NocCatRow = {
  /**
   * 大分类。
   */
  broad: string

  /**
   * 中分类。
   */
  mid: string

  /**
   * 小分类。
   */
  fine: string
}

/**
 * seedFilter 的入参。
 */
export type SeedFilterIn = {
  /**
   * 初始筛选。
   */
  f: JobFilters

  /**
   * 要取哪一格。
   */
  k: string
}

/**
 * applyFiltersTo 的入参。
 */
export type ApplyFiltersIn = {
  /**
   * 筛选各格的读写口。
   */
  fState: FilterState

  /**
   * 要落地的筛选。
   */
  f: JobFilters

  /**
   * 只看直发的写口。
   */
  setDirect: BoolFn
}

/**
 * foldActiveOf / anyFilterOf 的入参。
 */
export type FilterCountIn = {
  /**
   * 筛选各格。
   */
  fState: FilterState

  /**
   * 只看直发岗。
   */
  directOnly: boolean
}

/**
 * clearFiltersIn 的入参。
 */
export type ClearFiltersIn = {
  /**
   * 筛选各格。
   */
  fState: FilterState

  /**
   * 只看直发的写口。
   */
  setDirect: BoolFn
}

/**
 * filterOptsOf 的入参。
 */
export type FilterOptsIn = {
  /**
   * 维度表。
   */
  dims: JobDims

  /**
   * 当前省(全名);'' = 全部。
   */
  prov: string

  /**
   * 当前市;'' = 全部。
   */
  city: string

  /**
   * 当前大分类;'' = 全部。
   */
  broad: string

  /**
   * 当前中分类;'' = 全部。
   */
  mid: string
}

/**
 * cityOptsOf 的入参。
 */
export type CityOptsIn = {
  /**
   * 维度表。
   */
  dims: JobDims

  /**
   * 当前省码;'' = 全部。
   */
  code: string
}

/**
 * distOptsOf 的入参。
 */
export type DistOptsIn = {
  /**
   * 维度表。
   */
  dims: JobDims

  /**
   * 当前省码;'' = 全部。
   */
  code: string

  /**
   * 当前市;'' = 全部。
   */
  city: string
}

/**
 * rankOf 的入参。
 */
export type RankOfIn = {
  /**
   * 大类 → 行业序号。
   */
  order: Map<string, number>

  /**
   * 大类值。
   */
  v: string
}

/**
 * midOptsOf 的入参。
 */
export type MidOptsIn = {
  /**
   * 分类维度行。
   */
  nc: NocCatRow[]

  /**
   * 当前大分类;'' = 全部。
   */
  broad: string
}

/**
 * fineOptsOf 的入参。
 */
export type FineOptsIn = {
  /**
   * 分类维度行。
   */
  nc: NocCatRow[]

  /**
   * 当前大分类;'' = 全部。
   */
  broad: string

  /**
   * 当前中分类;'' = 全部。
   */
  mid: string
}

/**
 * pageSigOf 的入参。
 */
export type PageSigIn = {
  /**
   * 当前非默认筛选。
   */
  cur: JobFilters

  /**
   * 排序态。
   */
  sort: SortState

  /**
   * 匹配视图开着没。
   */
  matchView: boolean
}

/**
 * dataKeyOf 的入参。
 */
export type DataKeyIn = {
  /**
   * 列集签名。
   */
  shownKey: string

  /**
   * 界面语言。
   */
  lang: string

  /**
   * 当前这批行。
   */
  rows: JobFact[]
}

/**
 * makeNocName 的入参。
 */
export type NocNameIn = {
  /**
   * 维度表。
   */
  dims: JobDims

  /**
   * 界面语言。
   */
  lang: Lang
}

/**
 * makeColWidth 的入参。
 */
export type ColWidthFnIn = {
  /**
   * 量到了没。
   */
  measuredReady: boolean

  /**
   * 各列像素。
   */
  px: Record<string, number>

  /**
   * 还没量到但种子对得上 → 用百分比顶班。
   */
  useSeed: boolean

  /**
   * cookie 种子;null = 没有。
   */
  seed: ColWidthSeed | null

  /**
   * 列集(顺序即列序)。
   */
  keys: string[]
}

/**
 * colWidthSeedValue 的入参。
 */
export type SeedValueIn = {
  /**
   * 列集签名。
   */
  keysKey: string

  /**
   * 各列像素。
   */
  px: Record<string, number>

  /**
   * 总宽。
   */
  total: number

  /**
   * 列集(顺序即列序)。
   */
  keys: string[]
}

/**
 * `/api/users/me` 的响应形状(只声明本域读的那几格;Payload 的字段可空)。
 */
export type MeJson = {
  /**
   * 用户;匿名给 null / 缺席。
   */
  user?: {
    /**
     * 邮箱。
     */
    email?: string | null

    /**
     * 昵称。
     */
    displayName?: string | null

    /**
     * 头像 URL。
     */
    avatar?: string | null

    /**
     * Pro 到期日(ISO 串);免费号缺席。
     */
    proUntil?: string | null

    /**
     * 移民档案(投递前的注册闸要看它)。
     */
    profile?: ProfileJsonFact | null
  } | null
}

/**
 * 档案 JSON(外域形状,原样喂给 lib/jobs 的 normalizeProfile;本域一格都不读)。
 */
export type ProfileJsonFact = object

/**
 * 本人档案(外域形状:注册引导的初值与匹配依据链都吃它)。
 */
export type MatchProfileFact = MatchProfile

/**
 * 收藏列表接口的响应形状。
 */
export type SavedListJson = {
  /**
   * 收藏行;缺席按空算。
   */
  docs?: SavedDocJson[] | null
}

/**
 * 一条收藏行(只声明本域读的那三格)。
 */
export type SavedDocJson = {
  /**
   * 收藏行的号。
   */
  id?: number | string | null

  /**
   * 岗位号;null = 岗已删,跳过这一行。
   */
  job?: number | string | null

  /**
   * 状态;缺席按心愿单算。
   */
  status?: string | null
}

/**
 * 新建收藏的响应形状。
 */
export type SavedPostJson = {
  /**
   * 新建出来的行。
   */
  doc?: {
    /**
     * 行号。
     */
    id?: number | string | null
  } | null
}

/**
 * 大维度接口的响应形状。
 */
export type DimsJson = {
  /**
   * 独立加载的那几张维度表(只补这几格,其余不动)。
   */
  dims?: Partial<JobDims> | null
}

/**
 * 职位分页接口的响应形状。
 */
export type JobsPageJson = {
  /**
   * 同 WHERE 的总数。
   */
  total?: number | null

  /**
   * 这一页的行。
   */
  rows?: JobFact[] | null

  /**
   * 数据更新时间。
   */
  updatedAt?: string | null

  /**
   * 高匹配总数(匹配视图才有)。
   */
  matchHigh?: number | null

  /**
   * 中匹配总数。
   */
  matchMid?: number | null
}

/**
 * 中文对照接口的响应形状。
 */
export type TransJson = {
  /**
   * 成没成。
   */
  ok?: boolean | null

  /**
   * 同结构译文(行位保真)。
   */
  text?: string | null
}

/**
 * 投递方式接口的响应形状。
 */
export type ApplyHowJson = {
  /**
   * 投递邮箱;缺席 = 没抽到。
   */
  email?: string | null
}

/**
 * useSavedJobs 的入参。
 */
export type SavedHookIn = {
  /**
   * 分层态。
   */
  plan: JobPlan

  /**
   * 匿名点收藏时的去处(开注册框)。
   */
  onAnon: ClickFn
}

/**
 * useBoardModals 的入参。
 */
export type ModalsHookIn = {
  /**
   * 分层态。
   */
  plan: JobPlan
}

/**
 * 弹框层状态机交回的东西(面板 + 三个开口)。
 */
export type ModalsHookOut = {
  /**
   * 交给视图的弹框层面板。
   */
  panel: BoardModalsPanel

  /**
   * 开字段弹框。
   */
  setPopup: (p: PopupState | null) => void

  /**
   * 开职位描述弹框。
   */
  setDescJob: (j: JobFact | null) => void

  /**
   * 开升级/登录弹框。
   */
  setUpsell: (u: UpsellKind) => void
}

/**
 * useColWidthsPanel 的入参。
 */
export type ColWidthsPanelIn = {
  /**
   * 列集(顺序即列序)。
   */
  keys: string[]

  /**
   * 列集签名。
   */
  keysKey: string

  /**
   * cookie 种子;null = 没有。
   */
  seed: ColWidthSeed | null

  /**
   * 量宽结果。
   */
  measured: Record<string, ColMeasure>

  /**
   * 容器可分宽度。
   */
  wrapW: number

  /**
   * 手动拖出来的宽。
   */
  manual: Record<string, number>

  /**
   * 手动宽的写口。
   */
  setManual: (w: Record<string, number>) => void

  /**
   * 列集的活引用(拖列要用)。
   */
  keysRef: React.RefObject<string[]>

  /**
   * 量宽结果的活引用(拖列要用)。
   */
  measuredRef: React.RefObject<Record<string, ColMeasure>>
}

/**
 * useSeedCookie 的入参。
 */
export type SeedCookieIn = {
  /**
   * 量到了没(没量到就别写)。
   */
  measuredReady: boolean

  /**
   * 列集签名。
   */
  keysKey: string

  /**
   * 各列像素。
   */
  px: Record<string, number>

  /**
   * 总宽。
   */
  total: number

  /**
   * 列集。
   */
  keys: string[]
}

/**
 * useWrapWidth 的入参。
 */
export type WrapWidthIn = {
  /**
   * 表头锚点。
   */
  headRowRef: React.RefObject<HTMLTableRowElement | null>

  /**
   * 列集签名(换列要重挂)。
   */
  keysKey: string

  /**
   * 容器宽的写口。
   */
  setWrapW: (w: number) => void
}

/**
 * useFrozenCols 的入参。
 */
export type FrozenHookIn = {
  /**
   * 当前列。
   */
  shown: ColSpec[]

  /**
   * 表头锚点。
   */
  headRowRef: React.RefObject<HTMLTableRowElement | null>

  /**
   * 列宽机器。
   */
  cw: ColWidthsPanel

  /**
   * 列集签名。
   */
  shownKey: string
}

/**
 * 固定左列的三样。
 */
export type FrozenPanel = {
  /**
   * 累计左偏移。
   */
  stickyLeft: Record<string, number>

  /**
   * 最左连续固定列的集合。
   */
  frozenSet: Set<JobColKey>

  /**
   * 最后一枚固定列;'' = 没有。
   */
  lastFrozen: string
}

/**
 * useOutsideClose 的入参。
 */
export type OutsideCloseIn = {
  /**
   * 浮层外框(点它之外就关)。
   */
  boxRef: React.RefObject<HTMLDivElement | null>

  /**
   * 开着没。
   */
  open: boolean

  /**
   * 关的动作。
   */
  onClose: ClickFn
}

/**
 * useEscClose 的入参。
 */
export type EscCloseIn = {
  /**
   * 开着没。
   */
  open: boolean

  /**
   * 关的动作。
   */
  onClose: ClickFn
}

/**
 * jobsQueryOf 的入参。
 */
export type JobsQueryIn = {
  /**
   * 当前非默认筛选。
   */
  cur: JobFilters

  /**
   * 排序态。
   */
  sort: SortState

  /**
   * 匹配视图开着没。
   */
  matchView: boolean

  /**
   * 已翻到第几页。
   */
  page: number
}

/**
 * authFromUrl 交回的东西。
 */
export type AuthFromUrlOut = {
  /**
   * 要开哪个框;false = 不开。
   */
  mode: false | 'login' | 'register' | 'reset'

  /**
   * 重置密码的 token;'' = 不是重置流程。
   */
  token: string
}

/**
 * widthsKeyOf 的入参。
 */
export type WidthsKeyIn = {
  /**
   * 当前列。
   */
  shown: ColSpec[]

  /**
   * 列宽机器。
   */
  cw: ColWidthsPanel
}

/**
 * slotOf / setterOf 的入参。
 */
export type SlotIn = {
  /**
   * 筛选各格。
   */
  fState: FilterState

  /**
   * 要取哪一格。
   */
  k: string
}

/**
 * allocOf 的入参。
 */
export type AllocOfIn = {
  /**
   * 列键。
   */
  k: string

  /**
   * 这一列量到的四个数;缺席 = 还没量到。
   */
  m: ColMeasure | undefined

  /**
   * 钉死的宽;缺席 = 参与瓜分。
   */
  pinned: number | undefined
}

/**
 * tableWidthOf 的入参。
 */
export type TableWidthIn = {
  /**
   * 量到了没。
   */
  measuredReady: boolean

  /**
   * 溢出了没。
   */
  overflow: boolean

  /**
   * 总宽。
   */
  total: number
}

/**
 * 收藏面板。
 */
export type SavedPanel = {
  /**
   * 已收藏映射(岗位号 → 收藏行)。
   */
  saved: Record<string, SavedEntry>

  /**
   * 收/取消收藏一岗。
   */
  onSave: (j: JobFact) => void
}

/**
 * dropped 的入参。
 */
export type SavedEditIn = {
  /**
   * 当前映射。
   */
  saved: Record<string, SavedEntry>

  /**
   * 要摘的键。
   */
  key: string
}

/**
 * added 的入参。
 */
export type SavedAddIn = {
  /**
   * 当前映射。
   */
  saved: Record<string, SavedEntry>

  /**
   * 岗位号。
   */
  key: string

  /**
   * 新建出来的收藏行号。
   */
  id: string | number
}

/**
 * postSavedSearch 的入参。
 */
export type SaveSearchIn = {
  /**
   * 用户起的名字。
   */
  name: string

  /**
   * 这套条件。
   */
  filters: Record<string, string | boolean>

  /**
   * 界面语言(邮件提醒按它发)。
   */
  lang: Lang
}

/**
 * 带统计对象的 window(归一前形状:统计脚本由环境注入,没注入时这一格压根不存在)。
 * 只声明本域真用的那一格 —— 形状本域自己声明,不从别的域取。
 */
export type UmamiWindow = {
  /**
   * 环境注入的统计对象;没有就不发。
   */
  umami?: {
    /**
     * 上报一个事件(E9-04:投递)。
     */
    track: (event: string, data: Record<string, string>) => void
  }
}

/**
 * colsAfterToggle 的入参。
 */
export type ColsToggleIn = {
  /**
   * 当前勾选。
   */
  visible: JobColKey[]

  /**
   * 点的那一列。
   */
  k: JobColKey
}

/**
 * appendedRows 的入参。
 */
export type AppendRowsIn = {
  /**
   * 这一页的响应。
   */
  d: JobsPageJson

  /**
   * 是不是第 0 页(整表换血)。
   */
  fresh: boolean
}

/**
 * makeFieldRouter 的入参。
 */
export type FieldRouterIn = {
  /**
   * 字段弹框的开口。
   */
  setPopup: (p: PopupState | null) => void
}

/**
 * useBoardHydrate 的入参。
 */
export type HydrateIn = {
  /**
   * 筛选各格。
   */
  fState: FilterState

  /**
   * 只看直发的写口。
   */
  setDirect: BoolFn

  /**
   * 组件收到的 props。
   */
  props: JobsIn

  /**
   * 分层态。
   */
  plan: JobPlan

  /**
   * 匹配视图的写口。
   */
  setMatchView: (v: boolean) => void

  /**
   * 排序态的写口。
   */
  setSort: (s: SortState) => void
}

/**
 * useJdText 的入参。
 */
export type JdTextHookIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 额度可见化回传;缺席 = 不回传(整页版)。
   */
  onFreeLeft?: (n: number) => void
}

/**
 * JD 正文取数交回的两样。
 */
export type JdTextPanel = {
  /**
   * 正文。
   */
  text: string

  /**
   * 取数态。
   */
  status: JdStatus
}

/**
 * 整理版交回的四样。
 */
export type JdFormatPanel = {
  /**
   * 整理版;undefined = 整理中,null = 没有。
   */
  fmt: string | null | undefined

  /**
   * 失败的由头。
   */
  fmtWhy: FmtWhy

  /**
   * 换岗/重试的信号(下游的开关状态跟着它复位)。
   */
  resetKey: string

  /**
   * 重试生成。
   */
  onRetry: ClickFn
}

/**
 * useJdTrans 的入参。
 */
export type JdTransHookIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 换岗/重试的信号。
   */
  resetKey: string
}

/**
 * 中文对照交回的四样。
 */
export type JdTransPanel = {
  /**
   * 在屏没。
   */
  showTrans: boolean

  /**
   * 译文;null = 还没拉。
   */
  trans: string | null

  /**
   * 取数态。
   */
  transStatus: TransStatus

  /**
   * 开合(首次点会去拉)。
   */
  onToggle: () => Promise<void>
}

/**
 * 投递方式交回的两样。
 */
export type ApplyHowPanel = {
  /**
   * 懒查来的投递邮箱;'' = 没抽到。
   */
  email: string

  /**
   * 出结果了没(成败都算)。
   */
  done: boolean
}

/**
 * applyEmailPick 的入参。
 */
export type ApplyEmailPickIn = {
  /**
   * 懒查来的邮箱。
   */
  jb: string

  /**
   * JD 正文(正则兜底从它抽)。
   */
  text: string
}

/**
 * postTranslate 的入参。
 */
export type TranslateIn = {
  /**
   * 原帖链接。
   */
  url: string

  /**
   * 界面语言。
   */
  lang: Lang
}

/**
 * needIntent 的入参。
 */
export type NeedIntentIn = {
  /**
   * 分层态。
   */
  plan: JobPlan

  /**
   * 流程内刚注册完(onDone 已走过 intent)。
   */
  authed: boolean
}

/**
 * makeOpenMatch 的入参。
 */
export type OpenMatchIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 对照文本的写口。
   */
  setMatchJd: (s: string | null) => void
}

/**
 * makeAuthDone 的入参。
 */
export type AuthDoneIn = {
  /**
   * 流程内登录态的写口。
   */
  setAuthed: (v: boolean) => void

  /**
   * 流程内档案的写口。
   */
  setFreshProfile: (p: MatchProfileFact | null) => void

  /**
   * 投递段的写口。
   */
  setStage: (s: ApplyStage) => void

  /**
   * 投递动作。
   */
  launch: () => Promise<void>
}

/**
 * intentProfileOf 的入参。
 */
export type IntentProfileIn = {
  /**
   * 流程内拉到的档案;null = 没拉到。
   */
  fresh: MatchProfileFact | null

  /**
   * 分层态(SSR 那份档案)。
   */
  plan: JobPlan
}

/**
 * useApplyResume 的入参。
 */
export type ApplyResumeIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 分层态。
   */
  plan: JobPlan

  /**
   * 投递方式查完没。
   */
  emailDone: boolean

  /**
   * 投递段的写口。
   */
  setStage: (s: ApplyStage) => void

  /**
   * 投递动作。
   */
  launch: () => Promise<void>
}

/**
 * openApply 的入参。
 */
export type OpenApplyIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 投递邮箱;'' = 外跳原帖。
   */
  email: string
}

/**
 * 带字体加载信号的 document(归一前形状:老浏览器没有这一格)。
 */
export type FontsDoc = {
  /**
   * 字体集;老浏览器没有。
   */
  fonts?: {
    /**
     * 全部字体加载完成的承诺;个别实现没有这一格。
     */
    ready?: Promise<unknown>
  }
}

/**
 * nocBlockHeadOf 的入参。
 */
export type NocHeadIn = {
  /**
   * 小标题。
   */
  head: string

  /**
   * 抓取日期;'' = 没有。
   */
  fetched: string
}

/**
 * 整理版一节的渲染档。
 */
export type JdSectionMode =
  | 'applyEmail' | 'applyLink' | 'applyLines' | 'payFallback' | 'none' | 'lines'

/**
 * 整理版一节的展示行(逐节先算好,组件只渲)。
 */
export type JdSectionView = {
  /**
   * 节键(ROLE/REQS/PAY/WORKHOURS/APPLY),同时当 key。
   */
  m: string

  /**
   * 小标题;'' = 不出(首节紧贴大标题那一档)。
   */
  head: string

  /**
   * 渲哪一档。
   */
  mode: JdSectionMode

  /**
   * 这一节的行(已丢掉 (not stated) 变体)。
   */
  pairs: JdPair[]

  /**
   * 这一节是列表(「- 」开头)。
   */
  bullets: boolean

  /**
   * 要在节首顶的帖面薪资;'' = 不顶。
   */
  payFallback: string

  /**
   * 官方原帖链接;'' = 没有。
   */
  applyUrl: string

  /**
   * 投递邮箱;'' = 没抽到。
   */
  applyEmail: string

  /**
   * 「原帖未提及」文案。
   */
  noneText: string

  /**
   * 官方原帖的短链文案。
   */
  officialText: string
}

/**
 * jdSectionViewsOf 的入参。
 */
export type JdSectionsIn = {
  /**
   * 整理版标记文本。
   */
  text: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 同结构译文(行位保真);'' = 不出对照。
   */
  trans: string

  /**
   * 帖面薪资;'' = 没有。
   */
  fallbackPay: string

  /**
   * 官方原帖链接;'' = 没有。
   */
  applyUrl: string

  /**
   * 投递邮箱;'' = 没抽到。
   */
  applyEmail: string

  /**
   * 紧跟大标题(详情页):首节省略小标题。
   */
  underTitle: boolean
}

/**
 * JdSection 的 props。
 */
export type JdSectionIn = {
  /**
   * 这一节的展示行。
   */
  sec: JdSectionView
}

/**
 * JdSecLines(一节的正文行)的 props。
 */
export type JdSecLinesIn = {
  /**
   * 这一节的行。
   */
  pairs: JdPair[]

  /**
   * 渲成列表还是逐行。
   */
  bullets: boolean
}

/**
 * JdApplyLines(「怎么投」的正文行)的 props。
 */
export type JdApplyLinesIn = {
  /**
   * 这一节的行。
   */
  pairs: JdPair[]

  /**
   * 官方原帖链接。
   */
  applyUrl: string

  /**
   * 投递邮箱;'' = 没抽到。
   */
  applyEmail: string
}

/**
 * jdSecHeadOf 的入参。
 */
export type JdSecHeadIn = {
  /**
   * 节键。
   */
  m: string

  /**
   * 小标题的取词键。
   */
  key: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 紧跟大标题(详情页)。
   */
  underTitle: boolean
}

/**
 * jdSecModeOf 的入参。
 */
export type JdSecModeIn = {
  /**
   * 节键。
   */
  m: string

  /**
   * 整节缺没。
   */
  none: boolean

  /**
   * 官方原帖链接;'' = 没有。
   */
  applyUrl: string

  /**
   * 投递邮箱;'' = 没抽到。
   */
  applyEmail: string

  /**
   * 帖面薪资;'' = 没有。
   */
  fallbackPay: string
}

/**
 * payFallbackFor 的入参。
 */
export type PayFallbackForIn = {
  /**
   * 节键。
   */
  m: string

  /**
   * 帖面薪资。
   */
  fallbackPay: string
}

/**
 * JdZhLine 的 props。
 */
export type JdZhLineIn = {
  /**
   * 对照译文;'' = 这一行不出对照。
   */
  zh: string
}

/**
 * transLabelOf 的入参。
 */
export type TransLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 对照的取数态。
   */
  status: TransStatus

  /**
   * 在屏没。
   */
  shown: boolean
}

/**
 * aiNoteTextOf 的入参。
 */
export type AiNoteTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 整理版;undefined = 整理中,null = 没有。
   */
  fmt: string | null | undefined

  /**
   * 失败的由头。
   */
  why: FmtWhy
}

/**
 * origLabelOf 的入参。
 */
export type OrigLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 在看原文没。
   */
  showOrig: boolean
}

/**
 * JdContent 的 props。
 */
export type JdContentIn = {
  /**
   * JD 身体状态机。
   */
  d: JobBodyPanel

  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 紧跟大标题(详情页):整理版首节省略小标题。
   */
  underTitle: boolean

  /**
   * 登录态(额度用完时给匿名用户补一句登录提额说明)。
   */
  loggedIn: boolean
}

/**
 * noTextOf 的入参。
 */
export type NoTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 拦抓取的来源;'' = 不是被拦的。
   */
  src: string
}

/**
 * showFormattedOf 的入参。
 */
export type ShowFormattedIn = {
  /**
   * 整理版;undefined = 整理中,null = 没有。
   */
  fmt: string | null | undefined

  /**
   * 在看原文没。
   */
  showOrig: boolean
}

/**
 * transShownOf 的入参。
 */
export type TransShownIn = {
  /**
   * 对照在屏没。
   */
  shown: boolean

  /**
   * 译文;null = 还没拉。
   */
  trans: string | null
}

/**
 * showSourceOf 的入参。
 */
export type ShowSourceIn = {
  /**
   * 官方原帖链接;'' = 没有。
   */
  applyUrl: string

  /**
   * 取数态。
   */
  status: JdStatus

  /**
   * 整理版。
   */
  fmt: string | null | undefined

  /**
   * 在看原文没。
   */
  showOrig: boolean
}

/**
 * fullHrefOf 的入参。
 */
export type FullHrefIn = {
  /**
   * 在不在弹框里。
   */
  inModal: boolean

  /**
   * 这一岗的号。
   */
  id: string | number
}

/**
 * applyLabelOf 的入参。
 */
export type ApplyLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 投递邮箱;'' = 外跳原帖。
   */
  email: string

  /**
   * 投递方式查完没。
   */
  emailDone: boolean
}

/**
 * subOf 的入参。
 */
export type SubOfIn = {
  /**
   * 要不要写公司名。
   */
  withCompany: boolean

  /**
   * 公司名。
   */
  company: string
}

/**
 * NOC 维表行(外域形状,原样透传给译名函数)。
 */
export type NocDescFact = NocDesc

/**
 * jobDetailViewOf 的入参。
 */
export type JobDetailIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 页面维度。
   */
  dims: JobPageDims

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 相似职位(兜底链按它的 fallbackLevel 分级)。
   */
  related: RelatedJobs
}

/**
 * 职位详情页的展示行。
 */
export type JobDetailView = {
  /**
   * 面包屑省段的显示名;'' = 本岗没省,那一段不渲。
   */
  provFull: string

  /**
   * 省段的去处。
   */
  provHref: string

  /**
   * 职业分类路径段。
   */
  segs: CrumbSeg[]

  /**
   * 职位名底下的译名;'' = 不出。
   */
  alias: string

  /**
   * 相似职位的兜底链;'' = 不出。
   */
  fallbackHref: string

  /**
   * 兜底链的文案。
   */
  fallbackText: string
}

/**
 * fallbackValueOf 的入参。
 */
export type FallbackValueIn = {
  /**
   * 本岗。
   */
  job: JobFact

  /**
   * 按哪一级筛;'' = 只按省。
   */
  level: string
}

/**
 * fallbackTextOf 的入参。
 */
export type FallbackTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 那一级的值;'' = 只按省。
   */
  value: string

  /**
   * 省的单名。
   */
  prov: string
}

/**
 * nocRowOf 的入参。
 */
export type NocRowIn = {
  /**
   * 页面维度。
   */
  dims: JobPageDims

  /**
   * NOC 码。
   */
  noc: string
}

/**
 * aliasOf 的入参。
 */
export type AliasOfIn = {
  /**
   * NOC 维表行;null = 没有。
   */
  row: NocDescFact | null

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 岗名(译名与它一样就不出)。
   */
  title: string
}

/**
 * showRelatedOf 的入参。
 */
export type ShowRelatedIn = {
  /**
   * 本岗状态。
   */
  status: string

  /**
   * 相似职位。
   */
  related: RelatedJobs

  /**
   * 兜底链;'' = 没有。
   */
  fallbackHref: string
}

/**
 * showFallbackOf 的入参。
 */
export type ShowFallbackIn = {
  /**
   * 相似职位。
   */
  related: RelatedJobs

  /**
   * 兜底链;'' = 没有。
   */
  fallbackHref: string
}

/**
 * 职位详情页交回的面板。
 */
export type JobDetailPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 返回在途没(按下即置忙态,导航期间可感)。
   */
  leaving: boolean

  /**
   * 现算好的那几样(面包屑、译名、兜底链)。
   */
  view: JobDetailView

  /**
   * 返回:走浏览器返回,无处可回时落职位板。
   */
  onBack: ClickFn
}

/**
 * headClsOf 的入参。
 */
export type HeadClsIn = {
  /**
   * 当前按它排没。
   */
  active: boolean

  /**
   * 可不可排序(操作列不排)。
   */
  sortable: boolean
}

/**
 * 表头一格的展示行。
 */
export type HeadCellView = {
  /**
   * 列键(同时当 key)。
   */
  k: JobColKey

  /**
   * 列名。
   */
  label: string

  /**
   * 悬停说明。
   */
  title: string

  /**
   * 当前按它排没。
   */
  active: boolean

  /**
   * 排序提示符。
   */
  mark: string

  /**
   * 可不可排序。
   */
  sortable: boolean

  /**
   * 固定列的贴边样式;null = 不固定。
   */
  frozen: React.CSSProperties | null

  /**
   * 点表头换排序。
   */
  onSort: ClickFn

  /**
   * 按下右缘竖线开拖。
   */
  onResize: (e: React.MouseEvent) => void

  /**
   * 双击竖线:本列回归自动。
   */
  onAutoFit: ClickFn

  /**
   * 竖线的悬停说明。
   */
  resizeTip: string
}

/**
 * saveLabelOf 的入参。
 */
export type SaveLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 已收藏没。
   */
  saved: boolean
}

/**
 * cellClickOf 的入参。
 */
export type CellClickIn = {
  /**
   * 职位板整台状态机。
   */
  b: JobsBoardPanel

  /**
   * 这一行。
   */
  job: JobFact

  /**
   * 列键。
   */
  k: JobColKey

  /**
   * 这一格的展示行。
   */
  view: CellView

  /**
   * 可点态。
   */
  active: boolean
}

/**
 * proMatchOpenOf 的入参。
 */
export type ProMatchIn = {
  /**
   * 列键。
   */
  k: JobColKey

  /**
   * 这一行。
   */
  j: JobFact
}

/**
 * moreLabelOf 的入参。
 */
export type MoreLabelIn = {
  /**
   * 在途没。
   */
  loading: boolean

  /**
   * 钮面文案。
   */
  label: string

  /**
   * 在途占位。
   */
  busy: string
}

/**
 * 手机卡一张的展示行。
 */
export type BoardCardView = {
  /**
   * 整卡去处(爬虫 / 长按新开页也靠它)。
   */
  href: string

  /**
   * 职位名下的译名灰注;'' = 不出。
   */
  note: string

  /**
   * 公司名的真 href(该公司的筛选页)。
   */
  companyHref: string

  /**
   * 薪资(只认清洗产物);'' = 不出。
   */
  salary: string

  /**
   * 市名;'' = 整段地点不出。
   */
  city: string

  /**
   * 省码;'' = 只出市。
   */
  prov: string

  /**
   * 市名的地图链接。
   */
  cityHref: string

  /**
   * 省的地图链接。
   */
  provHref: string

  /**
   * 市名的显示值(弹框大标题也用它)。
   */
  cityText: string

  /**
   * 省的显示值。
   */
  provText: string

  /**
   * 通道胶囊排;空 = 整排不出。
   */
  chips: ChipSpec[]

  /**
   * 已收藏没。
   */
  saved: boolean

  /**
   * 星标的无障碍名。
   */
  starLabel: string

  /**
   * 星标的字形。
   */
  star: string

  /**
   * 还在招(决定发布时间要不要按「躺了多久」变色)。
   */
  aging: boolean

  /**
   * 挂帖时长的文案函数。
   */
  ageText: AgeTextFn

  /**
   * NOC 码 → 译名。
   */
  nameOf: (code: string) => string
}

/**
 * makeChipClick 的入参。
 */
export type ChipClickIn = {
  /**
   * 单一路由。
   */
  onField: (k: JobColKey, j: JobFact, title: string) => void

  /**
   * 这一岗。
   */
  job: JobFact

  /**
   * 胶囊规格。
   */
  spec: ChipSpec
}

/**
 * makePrefixLabel 的入参。
 */
export type PrefixLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 键前缀。
   */
  prefix: string
}

/**
 * foldBtnClsOf 的入参。
 */
export type FoldBtnClsIn = {
  /**
   * 折叠区展开着没。
   */
  fold: boolean

  /**
   * 折叠区里有几项被选中。
   */
  foldActive: number
}

/**
 * matchLabelOf 的入参。
 */
export type MatchLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 匹配视图开着没。
   */
  matchView: boolean
}

/**
 * 字段面板里一列的展示行。
 */
export type ColOptionView = {
  /**
   * 列键(同时当 key)。
   */
  k: JobColKey

  /**
   * 列名。
   */
  label: string

  /**
   * 勾上没。
   */
  checked: boolean

  /**
   * 固定列(灰着不可取消)。
   */
  always: boolean

  /**
   * 固定列后面那句小注;'' = 不出。
   */
  fixedNote: string

  /**
   * 勾/取消。
   */
  onToggle: ClickFn
}

/**
 * ColOption 的 props。
 */
export type ColOptionIn = {
  /**
   * 列名。
   */
  label: string

  /**
   * 勾上没。
   */
  checked: boolean

  /**
   * 固定列。
   */
  always: boolean

  /**
   * 固定列后面那句小注。
   */
  fixedNote: string

  /**
   * 勾/取消。
   */
  onToggle: ClickFn
}

/**
 * fixedNoteOf 的入参。
 */
export type FixedNoteIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 是不是固定列。
   */
  always: boolean
}

/**
 * CardStar(卡右上角的收藏星标)的 props。
 */
export type CardStarIn = {
  /**
   * 无障碍名(纯图形钮必须给 —— 读屏只能靠它说出这个钮是干什么的)。
   */
  label: string

  /**
   * 星标字形。
   */
  star: string

  /**
   * 已收藏没。
   */
  saved: boolean

  /**
   * 收/取消收藏。
   */
  onToggle: ClickFn
}

/**
 * updatedTextOf 的入参。
 */
export type UpdatedTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 更新时间;'' = 还没拿到。
   */
  updatedAt: string
}

/**
 * subTextOf 的入参。
 */
export type SubTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 有没有任何筛选在生效。
   */
  anyFilter: boolean

  /**
   * 匹配视图开着没。
   */
  matchView: boolean

  /**
   * 总数。
   */
  total: number
}

/**
 * proofTextOf 的入参。
 */
export type ProofTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中省提名具名清单的岗位数。
   */
  named: number

  /**
   * 有外劳记录的雇主数。
   */
  lmia: number
}

/**
 * mvBarTextOf 的入参。
 */
export type MvBarTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 全量匹配计数;null = 还没拿到。
   */
  totals: MatchTotals | null
}

/**
 * upsellReasonOf 的入参。
 */
export type UpsellReasonIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 由头。
   */
  upsell: UpsellKind

  /**
   * 全量匹配计数;null = 还没拿到。
   */
  totals: MatchTotals | null

  /**
   * 免费匹配额度。
   */
  cap: number
}

/**
 * 顶栏高亮键(本域自抄:职位板与它的匹配视图两档)。
 */
export type HeaderKey = 'jobs' | 'match'

/**
 * 登录框开哪一档(本域自抄)。
 */
export type AuthMode = 'login' | 'register' | 'reset'

/**
 * 职位板 SEO 头里本域真给的那两格。
 */
export type BoardMeta = {
  /**
   * 标题。
   */
  title: string

  /**
   * 描述。
   */
  description: string
}

/**
 * 会话用户身上本域真读的那几格。`displayName` / `avatar` 两格可能压根不存在
 * (Users collection 有,会话形状只留了鉴权那几格)。
 */
export type SessionUser = {
  /**
   * 邮箱。
   */
  email?: string | null

  /**
   * 昵称;没设过就没有这格。
   */
  displayName?: string | null

  /**
   * 头像 URL;没设过就没有这格。
   */
  avatar?: string | null

  /**
   * Pro 到期日(ISO 串);免费号没有。
   */
  proUntil?: string | null
}

/**
 * toJobPlan 的入参。
 */
export type JobPlanIn = {
  /**
   * 会话用户;null = 匿名。
   */
  user: SessionUser | null

  /**
   * Pro 态。
   */
  pro: boolean

  /**
   * 档案(已归一)。
   */
  profile: MatchProfileFact

  /**
   * 建档了没。
   */
  profileOk: boolean
}

/**
 * planProfileOf 的入参。
 */
export type PlanProfileIn = {
  /**
   * 建档了没。
   */
  profileOk: boolean

  /**
   * 档案。
   */
  profile: MatchProfileFact
}

/**
 * noc-descriptions 文档里本页真读的那几格。`noc` 写成必填是本页原本就在的假设
 * (它是这张维表的业务主键,库里不会空),其余各格照实可空、取值处逐格兜空串。
 */
export type NocDescDoc = {
  /**
   * NOC 2021 五位码。
   */
  noc: string

  /**
   * 官方英文职业名。
   */
  title: string | null

  /**
   * 中文译名(本站译,非官方)。
   */
  titleZh: string | null

  /**
   * 韩文译名(本站译,非官方)。
   */
  titleKo: string | null

  /**
   * 主要职责(换行分隔)。
   */
  duties: string | null

  /**
   * 入职要求。
   */
  requirements: string | null

  /**
   * 抓取日期。
   */
  fetched: string | null
}

/**
 * noc-categories 文档里本页真读的那几格 —— 三级分类码与它们的英韩名,全格可空
 * (维表按级填,DDL 后加的译名列可能还没灌)。
 */
export type NocCategoryDoc = {
  /**
   * 大分类码。
   */
  broad?: string | null

  /**
   * 中分类码。
   */
  mid?: string | null

  /**
   * 小分类码。
   */
  fine?: string | null

  /**
   * 大分类英文名。
   */
  broadEn?: string | null

  /**
   * 大分类韩文名。
   */
  broadKo?: string | null

  /**
   * 中分类英文名。
   */
  midEn?: string | null

  /**
   * 中分类韩文名。
   */
  midKo?: string | null

  /**
   * 小分类英文名。
   */
  fineEn?: string | null

  /**
   * 小分类韩文名。
   */
  fineKo?: string | null
}

/**
 * JobJsonLd 的 props。
 */
export type JobJsonLdIn = {
  /**
   * 已序列化并转义过 `<` 的 JSON 串。
   */
  json: string
}
