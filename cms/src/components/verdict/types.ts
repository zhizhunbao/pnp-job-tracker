/**
 * verdict 域的自足形状:与 `/api/ruling/verdict` 一一对应的线上形状、三件对外组件
 * 与域内小件的 props 契约、派生函数与手柄工厂的入参。
 * 形状本域自己声明,不从别的域取(宪法 08-25「types 自声明」)—— 取词函数与语言码
 * 各域自抄一份,判定引擎那边多一格不必跟着改,真读不到当场 tsc 红。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */

/**
 * 界面语言(三字面量各域自抄;NOC 职业名译名跟着它取列)。
 */
export type VerdictLang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 结构兼容:键 + 可选插值)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 无参无返的点击手柄(建档 / 改答案 / 打开判定这类钮的 onClick)。
 */
export type ClickFn = () => void

/**
 * 点某一格条件时的手柄(带题 key 直达那道题)。
 */
export type TileFn = (key: string) => void

/**
 * 省码 → 省显示名。
 */
export type ProvLabelFn = (code: string) => string

/**
 * effect 的收尾函数(标记本次加载作废,回来的响应不再落 state)。
 */
export type StopFn = () => void

/**
 * 落判定结果的 setter。
 */
export type SetWireFn = (wire: VerdictWire) => void

/**
 * 落错误旗标的 setter。
 */
export type SetFlagFn = (on: boolean) => void

/**
 * 落省页签选中项的 setter。
 */
export type SetTextFn = (v: string) => void

/**
 * 判定行的参数值(引擎按行下发的插值,类型由 §6.1 行清单定)。
 */
export type VerdictParamValue = string | number | boolean | string[]

/**
 * 判定行的参数包(键 = 插值名)。
 */
export type VerdictParams = Record<string, VerdictParamValue>

/**
 * 官方举证(quote-anchored 的出处;2026-08-13 Frank「这部分没有必要显示吧」后不再渲染,
 * 数据仍随接口下发给判定引擎与顾问消费)。
 */
export type VerdictEvidence = {
  /**
   * 官方页地址;可省 —— 旧缓存响应里没有这一项。
   */
  url?: string

  /**
   * 抓取日期;可省。
   */
  fetched?: string

  /**
   * 出处显示名;可省。
   */
  label?: string
}

/**
 * 一条判定行(与 `/api/ruling/verdict` 的 rows 一一对应)。
 */
export type VerdictWireRow = {
  /**
   * 属于三关的哪一关。
   */
  gate: 'occupation' | 'employer' | 'person'

  /**
   * 免费还是付费(付费闸在服务端:非 Pro 只下发 gate/tier/key,locked 行天然没有 params)。
   */
  tier: 'free' | 'paid'

  /**
   * 行身份键(决定渲成哪句话)。
   */
  key: string

  /**
   * 锁着没下发内容;可省 = 没锁。
   */
  locked?: boolean

  /**
   * 判定态;可省 —— 锁行与纯事实行不带态。
   */
  state?: 'pass' | 'gap' | 'excluded' | 'unknown' | 'info'

  /**
   * 插值参数;可省 —— 锁行没有 params。
   */
  params?: VerdictParams

  /**
   * 官方英文原句;可省。
   */
  quote?: string

  /**
   * 出处;可省。
   */
  evidence?: VerdictEvidence

  /**
   * 追问建议;可省。
   */
  followups?: string[]
}

/**
 * 一句可复述的结论(服务端 `tripleVerdict.conclude` 拼好;前端只取词,不合成)。
 * 「判定结论」头条卡 2026-08-14 Frank 拍板删(「这个先删了吧 没有用」)——
 * 服务端照发(埋点与顾问仍消费),前端不再渲染。
 */
export type VerdictConclusion = {
  /**
   * 结论档。
   */
  kind: 'ok' | 'blocked' | 'needs-info' | 'excluded' | 'not-collected'

  /**
   * 结论句的文案键。
   */
  key: string

  /**
   * 结论句的插值;可省。
   */
  params?: VerdictParams

  /**
   * 落在哪条通道;可省。
   */
  pathway?: string

  /**
   * 卡在哪一关;可省。
   */
  gate?: string
}

/**
 * `/api/ruling/verdict` 的整份响应。
 */
export type VerdictWire = {
  /**
   * 判定算成了没有(false = 前端只渲错误留痕行)。
   */
  ok: boolean

  /**
   * 这份岗的 NOC 码;null = 没匹配上职业(不硬塞)。
   */
  noc: string | null

  /**
   * NOC 官方职业名(英文);null = 没匹配上。
   */
  nocName: string | null

  /**
   * NOC 职业名中译(#326 服务端 tripleWire 带下);可省 —— 旧缓存响应里没有这一项。
   */
  nocTitleZh?: string | null

  /**
   * NOC 职业名韩译;可省,同上。
   */
  nocTitleKo?: string | null

  /**
   * TEER 层级;null = 没匹配上职业。
   */
  teer: number | null

  /**
   * 这份岗所在省的省码。
   */
  province: string

  /**
   * 一句可复述的结论;可省 —— 旧缓存响应里没有这一项。
   */
  conclusion?: VerdictConclusion

  /**
   * 名额可得性文案。
   */
  availability: string

  /**
   * 这次请求带没带上登录态。
   */
  loggedIn: boolean

  /**
   * 是不是 Pro(决定付费行锁不锁)。
   */
  pro: boolean

  /**
   * 服务端有没有落档的档案。
   */
  hasProfile: boolean

  /**
   * 逐条判定行。
   */
  rows: VerdictWireRow[]
}

/**
 * 判定结果或还没有(首屏没 SSR 那份时的初值;请求失败也停在这一格)。
 */
export type MaybeVerdictWire = VerdictWire | null

/**
 * 一条判定行渲出来的文字。
 */
export type RowText = {
  /**
   * 主文案(带状态色的那一行结论)。
   */
  main: string

  /**
   * 灰字小注;可省 = 不出小注。
   */
  sub?: string

  /**
   * 覆盖状态符号用的态(设计 §跨步规矩 B1:本站粗筛的行不给对错符号,
   * 绿勾是「官方门槛行判出来」才配有的东西);可省 = 吃引擎给的 state。
   */
  icon?: string
}

/**
 * 这条行有话说,或者判不了就不渲(引擎给了本域没排版的行键时也是它)。
 */
export type MaybeRowText = RowText | null

/**
 * 这份岗的身份四格(判的是哪一份工作)。
 */
export type VerdictJob = {
  /**
   * 岗位 id(拼职位详情页地址、当判定请求的入参)。
   */
  id: string | number

  /**
   * 帖面职位名。
   */
  title: string

  /**
   * 雇主名。
   */
  company: string

  /**
   * 城市;'' = 库里没记。
   */
  city: string

  /**
   * 两位省码。
   */
  province: string
}

/**
 * 申请人条件格的一行。
 */
export type ConditionRow = {
  /**
   * 点这格该落到哪道题(带 key 直达)。
   */
  key: string

  /**
   * 这道题属于哪个省;'' = 全省共用。
   */
  prov: string

  /**
   * 题面。
   */
  label: string

  /**
   * 答案;没答时由调用方填「待填写」。
   */
  value: string

  /**
   * 答过没有(决定实线格还是虚线格)。
   */
  filled: boolean

  /**
   * 小类别(2026-08-16):十几个格子平铺看不出结构,同组的挨在一起,
   * 组序 = 调用方给的顺序;可省 = 不进分组(分值题)。
   */
  group?: string

  /**
   * 与当前岗位不匹配的小标(2026-08-14 Frank「加个图标标一下」):琥珀 ⚠ 胶囊,
   * 不带长句;可省 = 不挂标。
   */
  warn?: string
}

/**
 * 省页签的一项(与 tabs 域的 TabItem 结构兼容)。
 */
export type VerdictTabItem = {
  /**
   * 省码(也进 aria id)。
   */
  key: string

  /**
   * 省显示名。
   */
  label: string

  /**
   * 该省还没答几题;可省 = 全答完了不挂角标。
   */
  badge?: number
}

/**
 * 「本职位」卡首格瓦片的两行文字(#326:界面语的职业名做主文案,帖面英文原名降灰注)。
 */
export type TitleTile = {
  /**
   * 主文案。
   */
  value: string

  /**
   * 灰字小注;'' = 不出小注。
   */
  sub: string
}

/**
 * TvEntryCard(入口卡)的 props。
 */
export type TvEntryCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 大一号档(详情页版式:标题更大、钮更胖);可省 = 弹框里的小档。
   */
  lg?: boolean

  /**
   * 点主按钮的手柄。
   */
  onOpen: ClickFn
}

/**
 * TripleVerdictPanel(三关判定面板)的 props。
 */
export type TripleVerdictPanelIn = {
  /**
   * 判的是哪一份岗。
   */
  job: VerdictJob

  /**
   * 界面语言。
   */
  lang: VerdictLang

  /**
   * 页面已知档案答全了(与服务端的 hasProfile 取或);可省 = 交给服务端那格说了算。
   */
  profileComplete?: boolean

  /**
   * 改一次答案加一,面板据此重算;可省 = 不重算。
   */
  refreshKey?: number

  /**
   * 服务端先算好的那份 wire(/plan/pr SSR):首屏直接有内容,不再盯骨架。
   * 它按「无本地答案」算 —— 客户端读到本地答案后再 POST 刷一次,刷不出新东西就是原样。
   * 🔴 形状是 `unknown`:这一格由消费者 plan 桶的契约定死(它自己也收 unknown),
   * 本域在 initialWireOf 那一处收窄,收窄点只此一个。
   */
  initial?: unknown

  /**
   * 卡②标题旁的计数胶囊(已答 n/N · 估分 n/N,两段各报各的)—— 与无岗态摘要卡同一份,
   * 页面给什么摆什么;可省 = 不挂胶囊。
   */
  countPills?: React.ReactNode

  /**
   * 全部条件全传(答过的与没答的都要,Frank:「不然用户怎么对比?如果要修改答案呢?」)。
   * 可省 = 不摆条件格。
   */
  answerList?: ConditionRow[]

  /**
   * 第三张卡的位置留给页面的「你的初步方案」(Frank 2026-08-12 定的卡序:
   * ① 这份工作 ② 你的条件 ③ 你的初步方案 ④⑤⑥ 三关 ⑦ 付费)。
   * 页面给什么就摆什么,面板不管它怎么算;可省 = 不摆。
   */
  planSlot?: React.ReactNode

  /**
   * 各省估分整段(入口/题目/结果)并进卡②「你的条件」尾部(2026-08-13 Frank:
   * 「合并到申请人条件模块,不需要单独一个框」)。它内部有本地答题 state,
   * 别包在会重挂的容器里;可省 = 不摆。
   */
  scoreSlot?: React.ReactNode

  /**
   * 去建档;可省 = 退回顾问弹窗预填问句。
   */
  onBuildProfile?: ClickFn

  /**
   * 打开问卷:不带 key 落第一道没答的题,带 key(点了条件格)直达那道题;
   * 可省 = 退回 onBuildProfile。
   */
  onEditAnswers?: TileFn
}

/**
 * ConditionGrid(申请人条件格)的 props。
 */
export type ConditionGridIn = {
  /**
   * 全部条件行(答过的与没答的都要)。
   */
  rows: ConditionRow[]

  /**
   * 省码 → 省显示名。
   */
  provLabel: ProvLabelFn

  /**
   * 点哪格进哪题(带 key 直达)。
   */
  onTile: TileFn

  /**
   * 这组省页签的无障碍名。
   */
  ariaLabel: string

  /**
   * 页签与面板对 aria-controls 用的前缀(同页多组各给各的)。
   */
  idPrefix: string

  /**
   * 只渲哪半张(2026-08-16 Frank「这两部分应该合到一个 section」):省专属题就是估分题,
   * 它该跟估分结论同处一卡,而不是留在「申请人条件」里;可省 = 两半都渲。
   */
  only?: 'shared' | 'prov'

  /**
   * 指定省时不出自己的省页签(调用方已经有一排了,嵌两层 tabs 是重);可省 = 自己出页签。
   */
  province?: string

  /**
   * 平铺:给什么就渲什么,一个网格到底(2026-08-16 Frank「布局也不对」——
   * 共用题与省专属题先前各起一个网格,两段之间断行、列也对不齐);可省 = 分组渲染。
   */
  flat?: boolean
}

/**
 * VerdictCard(域内小件:一段一张自包含的白卡)的 props。
 * 卡内自带标题与出处,读到哪一张都不必回头看上一张(Frank 2026-08-12:
 * 「section 分多个卡片,每个卡片都是自包含的」)。
 */
export type VerdictCardIn = {
  /**
   * 卡标题;可省 = 无头卡。
   */
  title?: React.ReactNode

  /**
   * 卡头右上角的动作件(全站按钮同一款,不再是行内蓝链接);可省 = 没动作。
   */
  action?: React.ReactNode

  /**
   * 卡内容。
   */
  children: React.ReactNode
}

/**
 * VerdictRow(域内小件:判定瓦片)的 props。
 */
export type VerdictRowIn = {
  /**
   * 判定态(决定文字配色与要不要出符号)。
   */
  state: string

  /**
   * 灰标签(这一格判的是什么)。
   */
  label: string

  /**
   * 加粗结论。
   */
  main: string

  /**
   * 灰字小注;'' = 不出。
   */
  sub: string
}

/**
 * VerdictRows(域内小件:一串判定瓦片)的 props。
 */
export type VerdictRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(官方通道名按它取显示短名)。
   */
  lang: VerdictLang

  /**
   * 要渲的判定行。
   */
  rows: VerdictWireRow[]
}

/**
 * FactTile(域内小件:事实瓦片)的 props。
 * 解剖与判定瓦片**逐值相同**(2026-08-14 Frank「英文和中文一行也没对齐」——
 * 先前内边距/字号/行高各差一点,同一行里两族瓦片基线错位),区别只有状态色。
 */
export type FactTileIn = {
  /**
   * 灰标签。
   */
  label: string

  /**
   * 事实值。
   */
  value: string

  /**
   * 灰字小注;'' = 不出。
   */
  sub: string
}

/**
 * JobFacts(域内小件:「本职位」卡)的 props。
 */
export type JobFactsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: VerdictLang

  /**
   * 判的是哪一份岗。
   */
  job: VerdictJob

  /**
   * 判定结果;null = 还没回来(NOC 与 TEER 两格渲横杠)。
   */
  wire: MaybeVerdictWire
}

/**
 * EmployerFacts(域内小件:「雇主资质」卡)的 props。
 */
export type EmployerFactsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: VerdictLang

  /**
   * 判的是哪一份岗(雇主与地点两格出自这里)。
   */
  job: VerdictJob

  /**
   * 判定结果;null = 还没回来(只渲事实瓦片)。
   */
  wire: MaybeVerdictWire
}

/**
 * AnswerCard(域内小件:「你的条件」卡)的 props。
 */
export type AnswerCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 有没有档案(决定右上角是「改答案」还是「去建档」)。
   */
  hasProfile: boolean

  /**
   * 标题旁的计数胶囊;可省 = 只出标题。
   */
  countPills?: React.ReactNode

  /**
   * 全部条件行。
   */
  answerList: ConditionRow[]

  /**
   * 省码 → 省显示名。
   */
  provLabel: ProvLabelFn

  /**
   * 估分整段;可省 = 不摆。
   */
  scoreSlot?: React.ReactNode

  /**
   * 去建档;可省。
   */
  onBuildProfile?: ClickFn

  /**
   * 打开问卷;可省。
   */
  onEditAnswers?: TileFn

  /**
   * 没有 onBuildProfile 时退回顾问弹窗的预填问句。
   */
  prefill: string
}

/**
 * AnswerTitle(域内小件:「你的条件」卡标题)的 props。
 */
export type AnswerTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 标题旁的计数胶囊;可省 = 只出标题。
   */
  countPills?: React.ReactNode
}

/**
 * AnswerAction(域内小件:「你的条件」卡右上角的钮)的 props。
 */
export type AnswerActionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 有没有档案(有就是「改答案」,没有就是「去建档」)。
   */
  hasProfile: boolean

  /**
   * 改答案。
   */
  onEdit: ClickFn

  /**
   * 去建档。
   */
  onBuild: ClickFn
}

/**
 * ConditionTile(域内小件:一格条件)的 props。
 */
export type ConditionTileIn = {
  /**
   * 这一格。
   */
  row: ConditionRow

  /**
   * 点这格进哪题。
   */
  onTile: TileFn
}

/**
 * ConditionTiles(域内小件:一个条件网格)的 props。
 */
export type ConditionTilesIn = {
  /**
   * 这个网格里的格子。
   */
  rows: ConditionRow[]

  /**
   * 点格子进哪题。
   */
  onTile: TileFn
}

/**
 * ConditionGroups(域内小件:按小类别分块的共用题)的 props。
 */
export type ConditionGroupsIn = {
  /**
   * 组名(组序固定,组内保持题序 —— 两者都不许随答案变动而跳)。
   */
  groups: string[]

  /**
   * 共用题(prov 为空的那些)。
   */
  rows: ConditionRow[]

  /**
   * 点格子进哪题。
   */
  onTile: TileFn
}

/**
 * ConditionProvs(域内小件:省页签 + 各省面板)的 props。
 */
export type ConditionProvsIn = {
  /**
   * 出现过的省码。
   */
  provs: string[]

  /**
   * 全部条件行(各面板自己按省筛)。
   */
  rows: ConditionRow[]

  /**
   * 省码 → 省显示名。
   */
  provLabel: ProvLabelFn

  /**
   * 这组省页签的无障碍名。
   */
  ariaLabel: string

  /**
   * aria-controls 前缀。
   */
  idPrefix: string

  /**
   * 当前选中的省码。
   */
  active: string

  /**
   * 切页签的手柄。
   */
  onChange: TileFn

  /**
   * 点格子进哪题。
   */
  onTile: TileFn
}

/**
 * useVerdict(判定面板状态机器)的入参。
 */
export type UseVerdictIn = {
  /**
   * 判哪份岗。
   */
  jobId: string | number

  /**
   * 改一次答案加一,据此重算。
   */
  refreshKey: number

  /**
   * SSR 先算好的那份(未收窄的线上值)。
   */
  initial?: unknown
}

/**
 * useVerdict 交回来的一台机器。
 */
export type VerdictPanel = {
  /**
   * 现有的判定结果;null = 还在路上。
   */
  wire: MaybeVerdictWire

  /**
   * 判定取不回来(出错不静默:面板渲一行错误留痕)。
   */
  err: boolean
}

/**
 * useConditionTabs(省页签状态机器)的入参。
 */
export type UseConditionTabsIn = {
  /**
   * 出现过的省码。
   */
  provs: string[]
}

/**
 * useConditionTabs 交回来的一台机器。
 */
export type ConditionTabsPanel = {
  /**
   * 当前选中的省码(选过的那个还在就用它,否则落第一个)。
   */
  active: string

  /**
   * 切页签的手柄。
   */
  onChange: TileFn
}

/**
 * tOf 的入参。
 */
export type TOfIn = {
  /**
   * 界面语言。
   */
  lang: VerdictLang
}

/**
 * provDispOf 的入参。
 */
export type ProvDispIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两位省码。
   */
  code: string
}

/**
 * paramTextOf 的入参。
 */
export type ParamTextIn = {
  /**
   * 引擎给的插值;缺席 = 这行没带这一项。
   */
  v?: VerdictParamValue
}

/**
 * teerRangeOf 的入参。
 */
export type TeerRangeIn = {
  /**
   * TEER 档位表(引擎给的字符串数组)。
   */
  list: string[]
}

/**
 * teerTextAt 与 isNextTeer 的入参。
 */
export type TeerAtIn = {
  /**
   * 排好序的档位表。
   */
  list: number[]

  /**
   * 取第几个。
   */
  at: number
}

/**
 * teerPartOf 的入参。
 */
export type TeerPartIn = {
  /**
   * 排好序的档位表。
   */
  list: number[]

  /**
   * 这一段从第几个开始。
   */
  from: number

  /**
   * 这一段到第几个为止。
   */
  to: number
}

/**
 * 各条判定行取文字的入参。
 */
export type RowTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: VerdictLang

  /**
   * 这条判定行。
   */
  row: VerdictWireRow
}

/**
 * rowSubOf 的入参。
 */
export type RowSubIn = {
  /**
   * 这条行渲出来的文字。
   */
  text: RowText
}

/**
 * pathwayNamesOf 的入参。
 */
export type PathwayNamesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 通道键清单。
   */
  keys: string[]
}

/**
 * lockLabelOf 与 rowLabelOf 的入参。
 */
export type RowLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 行身份键。
   */
  key: string
}

/**
 * rowSignOf、rowMainClsOf 的入参。
 */
export type RowStateIn = {
  /**
   * 判定态。
   */
  state: string
}

/**
 * rowTileStateOf 的入参。
 */
export type RowTileStateIn = {
  /**
   * 这条判定行。
   */
  row: VerdictWireRow

  /**
   * 这条行渲出来的文字(icon 覆盖 state)。
   */
  text: RowText
}

/**
 * 按关别挑判定行的入参。
 */
export type GateRowsIn = {
  /**
   * 判定结果;null = 还没回来(挑出来是空表)。
   */
  wire: MaybeVerdictWire
}

/**
 * hasProfileOf 的入参。
 */
export type HasProfileIn = {
  /**
   * 判定结果;null = 只看页面那格。
   */
  wire: MaybeVerdictWire

  /**
   * 页面已知档案答全了。
   */
  profileComplete: boolean
}

/**
 * nocTextOf 与 teerTextOf 的入参。
 */
export type WireFactIn = {
  /**
   * 判定结果;null = 渲横杠。
   */
  wire: MaybeVerdictWire
}

/**
 * titleTileOf 与 nocAliasOf 的入参。
 */
export type TitleTileIn = {
  /**
   * 界面语言。
   */
  lang: VerdictLang

  /**
   * 判定结果(职业名译名出自它);null = 只用帖面原名。
   */
  wire: MaybeVerdictWire

  /**
   * 帖面职位名。
   */
  title: string
}

/**
 * cityTextOf 的入参。
 */
export type CityTextIn = {
  /**
   * 城市名;'' = 库里没记(渲横杠)。
   */
  city: string
}

/**
 * makeProvDisp 的入参。
 */
export type MakeProvDispIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * jobHrefOf 的入参。
 */
export type JobHrefIn = {
  /**
   * 岗位 id。
   */
  id: string | number
}

/**
 * companyJobsHrefOf 的入参。
 */
export type CompanyJobsHrefIn = {
  /**
   * 雇主名(拼进职位板搜索前先编码)。
   */
  company: string
}

/**
 * makeTrackClick 的入参。
 */
export type TrackClickIn = {
  /**
   * 埋点事件名。
   */
  event: string
}

/**
 * makeBuildProfile 的入参。
 */
export type BuildProfileIn = {
  /**
   * 页面给的建档手柄;可省 = 退回顾问弹窗。
   */
  onBuildProfile?: ClickFn

  /**
   * 退回顾问弹窗时的预填问句。
   */
  prefill: string
}

/**
 * makeEditAnswers 的入参。
 */
export type EditAnswersIn = {
  /**
   * 打开问卷;可省 = 退回建档。
   */
  onEditAnswers?: TileFn

  /**
   * 去建档;可省。
   */
  onBuildProfile?: ClickFn
}

/**
 * makeTileEdit 的入参。
 */
export type TileEditIn = {
  /**
   * 打开问卷(带 key 直达);可省 = 退回建档。
   */
  onEditAnswers?: TileFn

  /**
   * 去建档;可省。
   */
  onBuildProfile?: ClickFn
}

/**
 * makeTileClick 的入参。
 */
export type TileClickIn = {
  /**
   * 点这格进哪题。
   */
  onTile: TileFn

  /**
   * 这一格对应的题 key。
   */
  tileKey: string
}

/**
 * makeTabChange 的入参。
 */
export type TabChangeIn = {
  /**
   * 落选中省码的 setter。
   */
  setTab: SetTextFn
}

/**
 * 入口卡按档取类名与文案键的入参。
 */
export type EntryLgIn = {
  /**
   * 大一号档。
   */
  lg: boolean
}

/**
 * sharedRowsOf 与 provCodesOf 的入参。
 */
export type RowsIn = {
  /**
   * 全部条件行。
   */
  rows: ConditionRow[]
}

/**
 * groupNamesOf 的入参。
 */
export type GroupNamesIn = {
  /**
   * 共用题。
   */
  rows: ConditionRow[]

  /**
   * 只渲哪半张;可省 = 两半都渲。
   */
  only?: string
}

/**
 * groupRowsOf 的入参。
 */
export type GroupRowsIn = {
  /**
   * 共用题。
   */
  rows: ConditionRow[]

  /**
   * 这一组的名字。
   */
  group: string
}

/**
 * provRowsOf 与 unfilledCountOf 的入参。
 */
export type ProvRowsIn = {
  /**
   * 全部条件行。
   */
  rows: ConditionRow[]

  /**
   * 省码。
   */
  prov: string
}

/**
 * tabItemsOf 的入参。
 */
export type TabItemsIn = {
  /**
   * 出现过的省码。
   */
  provs: string[]

  /**
   * 全部条件行(角标数没答几题)。
   */
  rows: ConditionRow[]

  /**
   * 省码 → 省显示名。
   */
  provLabel: ProvLabelFn
}

/**
 * activeProvOf 的入参。
 */
export type ActiveProvIn = {
  /**
   * 出现过的省码。
   */
  provs: string[]

  /**
   * 用户选过的省码;'' = 没选过。
   */
  tab: string
}

/**
 * groupClsOf 的入参。
 */
export type GroupClsIn = {
  /**
   * 第几组(第一组不留上间距)。
   */
  index: number
}

/**
 * 条件格按答没答取类名的入参。
 */
export type FilledClsIn = {
  /**
   * 答过没有。
   */
  filled: boolean
}

/**
 * initialWireOf 的入参。
 */
export type InitialWireIn = {
  /**
   * SSR 先算好的那份(未收窄的线上值);可省 = 没有。
   */
  initial?: unknown
}

/**
 * startVerdictLoad 的入参。
 */
export type VerdictLoadIn = {
  /**
   * 判哪份岗。
   */
  jobId: string | number

  /**
   * 改一次答案加一。
   */
  refreshKey: number

  /**
   * SSR 那份在不在。
   */
  hasInitial: boolean

  /**
   * 落判定结果。
   */
  setWire: SetWireFn

  /**
   * 落错误旗标。
   */
  setErr: SetFlagFn
}

/**
 * 本次加载还算不算数(effect 收尾后回来的响应一律丢掉)。
 */
export type LoadBox = {
  /**
   * 已经收尾了。
   */
  dead: boolean
}

/**
 * makeLoadStop 的入参。
 */
export type LoadStopIn = {
  /**
   * 这次加载的作废旗标。
   */
  box: LoadBox
}

/**
 * needsVerdictFetch 的入参。
 */
export type NeedsFetchIn = {
  /**
   * SSR 那份在不在。
   */
  hasInitial: boolean

  /**
   * 改一次答案加一。
   */
  refreshKey: number

  /**
   * 本地读到的答案。
   */
  answers: VerdictParams
}

/**
 * hasLocalAnswers 的入参。
 */
export type HasLocalAnswersIn = {
  /**
   * 本地读到的答案。
   */
  answers: VerdictParams
}

/**
 * fetchVerdict 的入参。
 */
export type FetchVerdictIn = {
  /**
   * 判哪份岗。
   */
  jobId: string | number

  /**
   * 带上去的本地答案。
   */
  answers: VerdictParams

  /**
   * 这次加载的作废旗标。
   */
  box: LoadBox

  /**
   * 落判定结果。
   */
  setWire: SetWireFn

  /**
   * 落错误旗标。
   */
  setErr: SetFlagFn
}
