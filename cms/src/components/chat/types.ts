/**
 * chat 域(全站悬浮顾问)的形状:后端契约(POST /api/consult/chat 的 Answer/Fact,
 * 由 api 路由定,这里只照抄不扩展)、SSE 帧、一轮对话的状态、挂件的窗口几何,
 * 与两台状态机器(useChatBox / useChatLauncher)的面板契约。
 * 2026-08-27 换装批自 ChatBox/ChatAnswer/ChatLauncher/chatExamples 四件收拢。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,
 * 结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言(三字面量各域自抄;发请求时带上,服务端按它写轨迹与答复)。
 */
export type ChatLang = 'zh' | 'en' | 'ko'

/**
 * 多轮上下文里的一条消息(带回服务端让模型读语义)。
 */
export type Msg = {
  /**
   * 谁说的。
   */
  role: 'user' | 'assistant'

  /**
   * 那句话的原文。
   */
  content: string
}

/**
 * 故障码(与引导码相对:引导是助手接着聊,故障是低调行内提示 + 可重试)。
 * 白名单只此一份 —— 漏一个码 = 把「系统繁忙」说成「没连上服务」。
 */
export type Fault = 'limit' | 'llm' | 'guard' | 'net' | 'busy'

/**
 * 一轮的故障格:空串 = 没故障(状态初值与清空态)。
 */
export type FaultOrNone = Fault | ''

/**
 * 一条出处事实(后端契约:lib 工具层查到的数字与官方原页)。
 */
export type Fact = {
  /**
   * 查它的工具名(排查用)。
   */
  tool: string

  /**
   * 人话标签(服务端按用户语言写好)。
   */
  label: string

  /**
   * 数值;null = 官方隐私抑制(如 "Less than 10")—— 渲 valueText 原文,
   * **永不折成 0 或「暂无」**(折了就是替官方编数,总红线)。
   */
  value: number | null

  /**
   * 官方原文的数值文本(value 为 null 时渲它)。
   */
  valueText: string

  /**
   * 单位(% 与数字不留空格,其余留)。
   */
  unit: string

  /**
   * 官方原页取证。
   */
  evidence: FactEvidence

  /**
   * 服务端回读答复打的标(citeFacts):这条答复真用到了吗 —— 出处清单只列 cited。
   */
  cited?: boolean
}

/**
 * 一条事实的取证格(线格式:label/section 服务端可能不发)。
 */
export type FactEvidence = {
  /**
   * 官方原页地址。
   */
  url: string

  /**
   * 抓取时刻(ISO;链接 title 里给「数据取自 …」)。
   */
  fetched: string

  /**
   * 页面标签;可能不发。
   */
  label?: string

  /**
   * 页内段落;可能不发。
   */
  section?: string
}

/**
 * C6 选项卡的一枚选项(服务端 ChatOption;第 4 张「自己说」由前端固定给)。
 */
export type AnswerOption = {
  /**
   * 钮面标签。
   */
  label: string

  /**
   * 选它的后果一句话;可能不发。
   */
  consequence?: string

  /**
   * 点了以用户身份发出去的原句。
   */
  sendText: string

  /**
   * 推荐项(蓝框浅蓝底 + 绿徽标);可能不发。
   */
  recommended?: boolean
}

/**
 * 服务端识别出的会话槽位(职业/身份等的稳定记忆)。整包原样带回下一轮请求;
 * 前端只读 noc 一格(判「按我的情况判一判」那条补位能不能出 —— 没职业必撞 noOcc)。
 */
export type ChatSlots = {
  /**
   * 认出的职业码;没认出 = 缺席。
   */
  noc?: string
}

/**
 * 选项卡整块(reason 一句 + 至多 4 枚选项)。
 */
export type AnswerOptions = {
  /**
   * 为什么给这几枚(卡头小字)。
   */
  reason: string

  /**
   * 选项清单。
   */
  items: AnswerOption[]
}

/**
 * 一条答复(POST /api/consult/chat 200 体;由 api 路由定,这里只照抄形状)。
 */
export type Answer = {
  /**
   * 结论正文(出口校验过的整段)。
   */
  answer: string

  /**
   * 会话槽位(带回下一轮当稳定记忆)。
   */
  slots?: ChatSlots

  /**
   * 本轮工具层查到的事实(出处清单的原料)。
   */
  facts?: Fact[]

  /**
   * 服务端生成的真追问。
   */
  followups?: string[]

  /**
   * 快速 JSON 路径里随定稿返回的真实工具轨迹;SSE 路径仍逐条收 step。
   */
  activity?: string[]

  /**
   * C6 选项卡;需要决定才有。
   */
  options?: AnswerOptions

  /**
   * chat_logs 同名串 ID(首轮提问哈希,不指向人):面板显示 + 复制,排查用。
   */
  thread?: string

  /**
   * 出口校验两次没过的降级档:answer 其实是一句说明 + 原始事实清单 ——
   * 不许假装成正常答复,也不许当报错(它是真查到的东西,只是没组织成一段话)。
   */
  degraded?: boolean
}

/**
 * SSE 一帧 `data:` 解出来的形状(线格式:一帧只带其中一格,每格都可能不在;
 * 带 answer 的那帧整体就是定稿 Answer,取值处照旧逐格判)。
 */
export type SseFrame = {
  /**
   * 轨迹行(服务端已按用户语言写好,前端不拼字)。
   */
  step?: string

  /**
   * 撤回信号:前面发过的正文作废,清屏重等。
   */
  reset?: boolean

  /**
   * 正文增量,按句发,拼在已有的后面。
   */
  delta?: string

  /**
   * 定稿正文;这一格是字符串就说明整帧是 Answer。
   */
  answer?: string

  /**
   * 开流后才出的故障码(前置错误仍走 JSON + 状态码)。
   */
  error?: string
}

/**
 * readSse 的入参(SSE 流与四个回调 —— 流帧五种,DONE 之外每种一个去处)。
 */
export type ReadSseIn = {
  /**
   * 响应体流。
   */
  body: ReadableStream<Uint8Array>

  /**
   * 正文增量(按句,拼在已有后面)。
   */
  onDelta: (s: string) => void

  /**
   * 收尾定稿(facts 是出口校验的产物,只能整段给)。
   */
  onFinal: (a: Answer) => void

  /**
   * 追加一条轨迹。
   */
  onStep: (s: string) => void

  /**
   * 撤回:前面发的正文作废,清屏重等。
   */
  onReset: () => void
}

/**
 * 一轮 = 用户那句 + 其中**恰好一种**结果:引导(接着聊)/ 故障 / 答复 / 还在等。
 */
export type Turn = {
  /**
   * 用户那句原文。
   */
  q: string

  /**
   * 落地的答复;还没落 / 落成引导或故障 = null。
   */
  a: Answer | null

  /**
   * 工具轨迹(SSE 逐条收;JSON 路径随定稿整批来)。
   */
  steps: string[]

  /**
   * 逐句流式的半截正文(定稿后清空 —— 最终以 answer 为准,不拿它当定稿)。
   */
  stream: string

  /**
   * 引导语(tooShort/noOcc:助手接着聊,不是表单报错);空串 = 无。
   */
  guide: string

  /**
   * 故障码;空串 = 无。
   */
  fault: FaultOrNone

  /**
   * 轨迹折叠条:null = 跟默认走(收起);用户手点过才写成布尔。
   * 落地时归 null 重新收起 —— 展开是他**等待期**的选择,答复才是现在要读的。
   */
  stepsOpen: boolean | null

  /**
   * 发出时刻(结算真实耗时用 —— 折叠条上的秒数必须是量出来的,不是编的)。
   */
  t0: number

  /**
   * 落地时结算的耗时秒数(至少 1:显示 0s 像没查过,而每一轮都真的打了后端)。
   */
  secs: number
}

/**
 * 正文排版块(不是 markdown:只认空行分段与行首 `- ` 两个自家记号,
 * 产出永远是纯文本节点,注入面为零)。
 */
export type Block = {
  /**
   * p = 段落,ul = 项目符号组。
   */
  type: 'p' | 'ul'

  /**
   * 段落文本(type = p 时有内容;ul 时空串)。
   */
  text: string

  /**
   * 项目符号条目(type = ul 时有内容;p 时空表)。
   */
  items: string[]
}

/**
 * 档案槽位(users.profile 里例句/记忆要读的那几格;归一前形状,键可能缺席
 * 也可能存 null)。
 */
export type ChatProfile = {
  /**
   * 分型;未填 = null。
   */
  currentStatus?: string | null

  /**
   * 职业码清单;未填 = null。
   */
  nocCodes?: string[] | null

  /**
   * 英语 CLB;未填 = null。
   */
  clb?: number | null

  /**
   * EE 分;未填 = null。
   */
  crs?: number | null

  /**
   * 目标省;未填 = null。
   */
  targetProvinces?: string[] | null

  /**
   * 工签剩余月数;未填 = null。
   */
  pgwpMonthsLeft?: number | null
}

/**
 * 登录态 + 档案(/api/users/me 下发;匿名/取数失败一律 loggedIn=false ——
 * 绝不因为这一步网络失败就让空态开天窗)。
 */
export type ChatMe = {
  /**
   * 登录着 = true。
   */
  loggedIn: boolean

  /**
   * 档案;匿名或没建档 = null。
   */
  profile: ChatProfile | null
}

/**
 * 空态示例句的一条(i18n key + 插值;由渲染处 t(key, params) 成句)。
 */
export type ExampleItem = {
  /**
   * 句模板的 i18n 键。
   */
  key: string

  /**
   * 槽值插参(已建档的候选带;写死档不带)。
   */
  params?: Record<string, string | number>
}

/**
 * pickExamples / profileMemories 的入参(D4:空态示例句三态动态化)。
 */
export type ExamplesIn = {
  /**
   * 登录着 = true(匿名走写死三句)。
   */
  loggedIn: boolean

  /**
   * 档案;没有 = null(注册未建档走示范三句)。
   */
  profile: ChatProfile | null

  /**
   * 取词函数(把省码/职业码译成人话织进句里)。
   */
  t: TFn
}

/**
 * 桌面面板的自定义位置 + 尺寸(2026-08-05 Frank 要拖动与四向缩放)。
 */
export type Box = {
  /**
   * 左上角横坐标(视口 px)。
   */
  x: number

  /**
   * 左上角纵坐标。
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
}

/**
 * 启动器的自定义位置(2026-08-06 Frank「图标可自由拖动到任意位置,防挡内容」)。
 */
export type DockPos = {
  /**
   * 左上角横坐标(视口 px)。
   */
  x: number

  /**
   * 左上角纵坐标。
   */
  y: number
}

/**
 * clampDock 的入参(钳制口径按那颗 56px 的钮,不按带提示条的整条 dock)。
 */
export type ClampDockIn = {
  /**
   * 要钳的位置。
   */
  p: DockPos

  /**
   * 钮宽。
   */
  w: number

  /**
   * 钮高。
   */
  h: number
}

/**
 * 缩放把手的方向(n/s/e/w 四边 + 四角;字母出现在方向里就动那条边)。
 */
export type GripDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

/**
 * 拖拽/缩放的方向档:move = 抓标题栏整体拖动,其余是八个把手。
 */
export type GrabDir = GripDir | 'move'

/**
 * ChatBox 的 props(挂件壳只传这三个,**不覆盖它的任何类名**)。
 */
export type ChatBoxIn = {
  /**
   * 嵌在挂件面板里:卸掉自己的卡壳,历史区改撑满父级剩余高度 ——
   * 这两件事必须由本组件自己声明(靠父级覆盖类名会静默退化成卡中卡)。
   */
  compact?: boolean

  /**
   * 变成 true 时聚焦输入框(挂件每次展开翻一次)。触屏上是 no-op ——
   * 一展开就顶起键盘、把示例问题挤出屏幕。
   */
  autoFocus?: boolean

  /**
   * C6 通道卡 CTA 带来的预填问句:只进输入框不自动发送(以用户身份发话
   * 必须由用户按发送)。
   */
  prefill?: string
}

/**
 * ChatText(助手正文唯一渲染出口)的 props。
 */
export type ChatTextIn = {
  /**
   * 正文(答复 / 降级清单 / 引导语 / 逐句流式的半截共用同一套排版)。
   */
  text: string

  /**
   * 降级清单档:左细线示意「这是原始事实,不是组织好的答复」。
   */
  sheet?: boolean

  /**
   * 还在写(光标跟在最后一个块尾巴上)。
   */
  caret?: boolean
}

/**
 * ChatAnswer(一条答复的三段结构)的 props。
 */
export type ChatAnswerIn = {
  /**
   * 那条答复。
   */
  a: Answer
}

/**
 * 发一句话的入参:at = null 是新一轮;数字 = 重试那一轮(原地重开)。
 */
export type SendIn = {
  /**
   * 要发的原句。
   */
  q: string

  /**
   * 重试哪一轮;新一轮给 null。
   */
  at: number | null
}

/**
 * 发话机器的依赖包(useSend 的入参,sendNow 与两条分支的真身共用同一包)。
 * 2026-08-29 自 useSend 的内联形状提出来:真身住 functions、机器住 hooks,
 * 两边要指同一个形状,就不能再用 `Parameters<typeof …>` 反着取(那要跨文件取值)。
 */
export type UseSendIn = {
  /**
   * 当前轮次表(取历史与稳定记忆)。
   */
  turns: Turn[]

  /**
   * 有一轮在跑(闸:同时只可能有一轮)。
   */
  busy: boolean

  /**
   * 界面语言(服务端按它写轨迹与答复)。
   */
  lang: ChatLang

  /**
   * 取词函数(引导话术)。
   */
  t: TFn

  /**
   * 轮次表落格。
   */
  setTurns: SetTurns

  /**
   * 输入框落格(发出即清)。
   */
  setInput: (v: string) => void

  /**
   * 秒数落格(新一轮清零重计)。
   */
  setSecs: (v: number) => void

  /**
   * 忙态落格。
   */
  setBusy: (v: boolean) => void

  /**
   * 贴底引用(发话即回贴底)。
   */
  stick: MutBool

  /**
   * 输入框引用(清高度、引导轮还光标)。
   */
  taEl: React.RefObject<HTMLTextAreaElement | null>

  /**
   * 答复落地后重查登录档案(空态例句跟着换)。
   */
  refreshMe: () => void
}

/**
 * 对话面板(useChatBox 出,chatbox 与子件拼装用)。
 */
export type ChatBoxPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 输入框现值。
   */
  input: string

  /**
   * 拨输入框。
   */
  setInput: (v: string) => void

  /**
   * 全部轮次。
   */
  turns: Turn[]

  /**
   * 有一轮在跑(ask 头上的闸:同时只可能有一轮)。
   */
  busy: boolean

  /**
   * 等待秒数(每秒 tick;落地轮读它自己结算的 secs)。
   */
  secs: number

  /**
   * 还没有任何轮次(空态)。
   */
  empty: boolean

  /**
   * 空态示例句(三态动态化)。
   */
  examples: ExampleItem[]

  /**
   * Activity 面板的长期记忆句子。
   */
  memories: string[]

  /**
   * 登录态 + 档案。
   */
  me: ChatMe

  /**
   * 会话 ID 刚复制过(1.5s 回弹)。
   */
  thCopied: boolean

  /**
   * 最近一轮答复带的会话 ID;一轮都没落 = null。
   */
  thread: string | null

  /**
   * 聚焦输入框(「自己说」把光标还回输入框用;引用留在机器里,面板本身不带 ref)。
   */
  focusInput: () => void

  /**
   * 发一句话(新一轮或重试)。
   */
  send: (x: SendIn) => void

  /**
   * 轨迹折叠条开合落格。
   */
  onToggleSteps: (x: StepsToggleIn) => void

  /**
   * 历史区滚动(维护贴底判定)。
   */
  onScroll: (e: ThreadScrollEvent) => void

  /**
   * 输入框键盘出口(Enter 发送 / Shift+Enter 换行 / IME 组合中不发)。
   */
  onKeyDown: (e: ComposerKeyEvent) => void

  /**
   * 输入框改值(随内容长高到封顶)。
   */
  onChange: (e: ComposerChangeEvent) => void

  /**
   * 输入框首次聚焦(chat-open 只打第一次)。
   */
  onFocus: () => void

  /**
   * 复制会话 ID。
   */
  onCopyThread: () => void
}

/**
 * 对话面板整机的出参(useChatBox 出):面板与两枚 DOM 引用分开交出 ——
 * ref 只用来写 `ref={}`,不进面板对象。2026-08-29 摘 ref 那批立:
 * 渲染期从装着 ref 的对象上取任何一格,react-hooks/refs 都判成「渲染中读 ref」,
 * 于是整个 p 沿途的读全部中招(实测 chatbox/chatcomposer 两件 23 条)。
 */
export type ChatBoxOut = {
  /**
   * 对话面板(状态 + 手柄)。
   */
  p: ChatBoxPanel

  /**
   * 历史区 DOM 引用(贴底跟随)。
   */
  threadEl: React.RefObject<HTMLDivElement | null>

  /**
   * 输入框 DOM 引用(聚焦/量高)。
   */
  taEl: React.RefObject<HTMLTextAreaElement | null>
}

/**
 * 轨迹折叠条开合的入参。
 */
export type StepsToggleIn = {
  /**
   * 哪一轮。
   */
  i: number

  /**
   * 开着 = true。
   */
  open: boolean
}

/**
 * 历史区滚动事件(只读滚动几何三格;实参是 React.UIEvent,结构上兜得住)。
 */
export type ThreadScrollEvent = {
  /**
   * 事件源(历史区本体)。
   */
  currentTarget: {
    /**
     * 内容总高。
     */
    scrollHeight: number

    /**
     * 已滚过的高。
     */
    scrollTop: number

    /**
     * 视窗高。
     */
    clientHeight: number
  }
}

/**
 * 输入框键盘事件(只读判发送要的那几格;实参是 React.KeyboardEvent,结构上兜得住)。
 */
export type ComposerKeyEvent = {
  /**
   * 键名。
   */
  key: string

  /**
   * Shift 按着(= 换行)。
   */
  shiftKey: boolean

  /**
   * Meta 按着(触屏上 ⌘Enter 强制发送)。
   */
  metaKey: boolean

  /**
   * Ctrl 按着(同上)。
   */
  ctrlKey: boolean

  /**
   * 原生事件(读 IME 组合态 —— 中/韩选词中别抢 Enter)。
   */
  nativeEvent: {
    /**
     * IME 组合中 = true;老引擎可能没有这格。
     */
    isComposing?: boolean
  }

  /**
   * 拦掉默认换行(要发送时)。
   */
  preventDefault: () => void
}

/**
 * 输入框改值事件(只读 target 一格;实参是 React.ChangeEvent,结构上兜得住)。
 */
export type ComposerChangeEvent = {
  /**
   * 事件源(textarea 本体;量 scrollHeight 自适应高)。
   */
  target: {
    /**
     * 现值。
     */
    value: string

    /**
     * 内容实高(自适应高的依据)。
     */
    scrollHeight: number

    /**
     * 行内样式(写 height)。
     */
    style: {
      /**
       * 高度。
       */
      height: string
    }
  }
}

/**
 * 挂件面板(useChatLauncher 出,chatlauncher 与子件拼装用)。
 */
export type LauncherPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 面板开着(可见性单一真相 —— popover 只是增强)。
   */
  open: boolean

  /**
   * 打开过一次(内容懒加载后不再卸载,最小化不丢会话)。
   */
  mounted: boolean

  /**
   * 轻提示亮着。
   */
  hint: boolean

  /**
   * 桌面全屏档。
   */
  max: boolean

  /**
   * 桌面档(>640);拖拽/缩放/box 全挂它下面。
   */
  wide: boolean

  /**
   * 就地二次确认亮着(误清一整轮问答不可逆)。
   */
  askReset: boolean

  /**
   * 换一次 = ChatBox 整个重挂 = 会话清空回空态。
   */
  resetN: number

  /**
   * 预填问句(o2p:chat-open 事件带来)。
   */
  prefill: string

  /**
   * 启动器自定义位置;null = 右下角默认档(带避让)。
   */
  dockPos: DockPos | null

  /**
   * 面板的内联样式(避让距离 + 强制显示 + 自定义框三样合成)。
   */
  panelStyle: React.CSSProperties

  /**
   * 启动器的内联样式(自定义位或避让距离)。
   */
  dockStyle: React.CSSProperties

  /**
   * 打开面板(点开过 = 轻提示永久不再出)。
   */
  show: () => void

  /**
   * 关闭面板。
   */
  hide: () => void

  /**
   * 最小化(与 hide 同效,埋点不同)。
   */
  minimize: () => void

  /**
   * 桌面全屏开合。
   */
  toggleMax: () => void

  /**
   * 重置钮:第一下亮二次确认,第二下真清。
   */
  onResetClick: () => void

  /**
   * 启动器按下(拖动起点;位移超过阈值才算拖)。
   */
  onDockDown: (e: React.PointerEvent) => void

  /**
   * 启动器点击(拖完那一下要压掉)。
   */
  onDockClick: () => void

  /**
   * 标题栏按下(桌面非全屏 = 拖动把手;按在钮上不拖)。
   */
  onHeadDown: (e: React.PointerEvent) => void

  /**
   * 造一枚缩放把手的按下手柄。
   */
  gripDownOf: (d: GripDir) => (e: React.PointerEvent) => void
}

/**
 * 挂件壳整机的出参(useChatLauncher 出):壳面板与两枚 DOM 引用分开交出,
 * 理由同 ChatBoxOut(ref 只用来写 `ref={}`,不进面板对象)。
 */
export type LauncherOut = {
  /**
   * 挂件面板(状态 + 手柄)。
   */
  p: LauncherPanel

  /**
   * 面板 DOM 引用(popover 调度与看门狗量高)。
   */
  panelEl: React.RefObject<HTMLDivElement | null>

  /**
   * 启动器 DOM 引用(避让测量与拖动)。
   */
  dockEl: React.RefObject<HTMLDivElement | null>
}

/**
 * 一轮的定点补丁:带哪格改哪格(用 `in` 判在不在,不靠 undefined 探测)。
 */
export type TurnPatch = {
  /**
   * 落地答复。
   */
  a?: Answer | null

  /**
   * 轨迹整表替换。
   */
  steps?: string[]

  /**
   * 半截流式正文。
   */
  stream?: string

  /**
   * 引导语。
   */
  guide?: string

  /**
   * 故障码。
   */
  fault?: FaultOrNone

  /**
   * 折叠条开合。
   */
  stepsOpen?: boolean | null
}

/**
 * 轮次表的函数式落格(React setState 的更新器形态;库定的形状,只声明用到的那半)。
 */
export type SetTurns = (f: (prev: Turn[]) => Turn[]) => void

/**
 * 可变布尔引用(useRef 的形状,本域自声明:贴底/触屏/拖动判定这些不驱动渲染的量)。
 */
export type MutBool = {
  /**
   * 现值。
   */
  current: boolean
}

/**
 * 可变盒引用(拖拽过程中的最新框;pointerup 时落盘,不靠 setState 回调)。
 */
export type MutBox = {
  /**
   * 现框;还没拖过 = null。
   */
  current: Box | null
}

/**
 * Activity 面板官方来源胶囊的一枚(cited 外链去重后)。
 */
export type WebSource = {
  /**
   * 官方原页地址。
   */
  url: string

  /**
   * 站点显示名(域名去 www)。
   */
  name: string
}

/**
 * JSON 错误体里只读的那一格(归一前:错误码可能不在)。
 */
export type ErrBody = {
  /**
   * 服务端回的错误码;正常答复没有这格。
   */
  error?: string
}

/**
 * 职业码 + 人话名(热门表解析出的那一对;与 profile 域同名同义,各家一份)。
 */
export type NocOpt = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 人话职业名(斜杠杂糅已裁)。
   */
  title: string
}

/**
 * 受控 details 的 onToggle 事件(只读 currentTarget.open 一格;实参是 React 的
 * ToggleEvent,结构上兜得住)。
 */
export type StepsToggleEvent = {
  /**
   * 事件源(details 本体)。
   */
  currentTarget: {
    /**
     * 开合现值。
     */
    open: boolean
  }
}

/**
 * /api/users/me 响应体里本域真读的两格(归一前)。
 */
export type MeBody = {
  /**
   * 登录人;匿名 = 缺席或 null。
   */
  user?: {
    /**
     * 档案;没建 = 缺席或 null。
     */
    profile?: ChatProfile | null
  } | null
} | null

/**
 * o2p:chat-open 事件的 detail(我们自己 dispatch 的,仍只读声明格)。
 */
export type PrefillDetail = {
  /**
   * 预填问句;可以不带。
   */
  prefill?: string
} | null

/**
 * 拖动/缩放按下时的起始几何(指针位 + 面板框)。
 */
export type GrabStart = {
  /**
   * 按下时指针横坐标。
   */
  px: number

  /**
   * 按下时指针纵坐标。
   */
  py: number

  /**
   * 起始左沿。
   */
  x: number

  /**
   * 起始上沿。
   */
  y: number

  /**
   * 起始宽。
   */
  w: number

  /**
   * 起始高。
   */
  h: number
}

/**
 * ChatSources(出处清单)的 props。
 */
export type ChatSourcesIn = {
  /**
   * 答复真用到的事实(citedFactsOf 滤过)。
   */
  facts: Fact[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ChatOptions(每轮唯一交互块)的 props。
 */
export type ChatOptionsIn = {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 这一轮。
   */
  turn: Turn
}

/**
 * ChatExamples(空态示例块)的 props。
 */
export type ChatExamplesIn = {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel
}

/**
 * ChatActivity(轨迹/记忆/来源三节面板)的 props。
 */
export type ChatActivityIn = {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 这一轮。
   */
  turn: Turn

  /**
   * 这一轮还在跑。
   */
  live: boolean
}

/**
 * ChatTurn(一轮)的 props。
 */
export type ChatTurnIn = {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 这一轮。
   */
  turn: Turn

  /**
   * 第几轮(选项卡只挂最后一轮)。
   */
  i: number
}

/**
 * ChatTurnBody(一轮的结果体)的 props。
 */
export type ChatTurnBodyIn = {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 这一轮。
   */
  turn: Turn

  /**
   * 第几轮。
   */
  i: number

  /**
   * 是最后一轮(选项卡只挂它)。
   */
  isLast: boolean
}

/**
 * ChatComposer(输入条)的 props。
 */
export type ChatComposerIn = {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 输入框 DOM 引用(单独一格交进来:ref 不进面板对象,见 ChatBoxOut)。
   */
  taEl: React.RefObject<HTMLTextAreaElement | null>
}

/**
 * ChatDisclaimer(免责行)的 props。
 */
export type ChatDisclaimerIn = {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel
}

/**
 * ChatDock(启动器)的 props。
 */
export type ChatDockIn = {
  /**
   * 挂件面板。
   */
  p: LauncherPanel

  /**
   * 启动器 DOM 引用(单独一格交进来:ref 不进面板对象,见 LauncherOut)。
   */
  dockEl: React.RefObject<HTMLDivElement | null>

  /**
   * 本路由的手机端连圆球也不出(走查 #298)。
   */
  narrowOff: boolean
}

/**
 * ChatHead(面板标题栏)的 props。
 */
export type ChatHeadIn = {
  /**
   * 挂件面板。
   */
  p: LauncherPanel
}

/**
 * PanelGuard(面板内容错误边界)的 props。
 */
export type PanelGuardIn = {
  /**
   * 兜底渲染(chunk 取不到时给「重载」出口)。
   */
  fallback: React.ReactNode

  /**
   * 面板内容。
   */
  children: React.ReactNode
}

/**
 * PanelGuard 的 state。
 */
export type PanelGuardState = {
  /**
   * 内容已挂(渲兜底)。
   */
  dead: boolean
}

/**
 * 懒加载取件时 chatbox 模块里真取的那一格。
 */
export type LazyBoxModule = {
  /**
   * 对话框组件本体。
   */
  ChatBox: (x: ChatBoxIn) => React.ReactNode
}
