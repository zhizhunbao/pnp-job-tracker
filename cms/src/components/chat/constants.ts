/**
 * chat 域(全站悬浮顾问)的死值:错误码表、SSE 记号、接口地址、埋点事件名、
 * 挂件几何与定时档、localStorage 键、示例句表。2026-08-27 换装批自
 * ChatBox/ChatAnswer/ChatLauncher/chatExamples 四件收拢挂注释。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */

/**
 * 引导码 → 文案键。引导不是报错:「再多说两句,你做什么工作」是助手在接着聊,
 * 渲成助手气泡;分类不是文案问题是**观感问题**(一律红框的观感是「我做错了什么」)。
 */
export const GUIDE_KEY: Record<string, string> = {
  /**
   * 问句太短,请他多说两句。
   */
  tooShort: 'chat.err.tooShort',

  /**
   * 没认出职业,请他说说做什么工作。
   */
  noOcc: 'chat.err.noOcc',
}

/**
 * 故障码 → 文案键(低调行内提示)。错误码各说各话(2026-08-03 简历对照实撞:
 * noJd 被笼统报成「稍后再试」,用户重试也没用)。白名单只此一份。
 */
export const FAULT_KEY = {
  /**
   * 今日额度用完。
   */
  limit: 'chat.err.limit',

  /**
   * 模型侧出岔。
   */
  llm: 'chat.err.llm',

  /**
   * 答复没对上出处被出口校验拦下。
   */
  guard: 'chat.err.guard',

  /**
   * 没连上服务。
   */
  net: 'chat.err.net',

  /**
   * 模型冷启/排队中。
   */
  busy: 'chat.err.busy',
} as const

/**
 * 重试有意义的故障码才给重试钮:limit(额度用完)重试只会再撞一次,guard(答复
 * 没对上出处)重试也是同一份事实;busy 恰恰相反 —— 模型那头刚在冷启/排队,
 * 过一会儿再问多半就答上了(实测热身后 4-11s)。
 */
export const RETRYABLE = ['llm', 'net', 'busy'] as const

/**
 * 输入上限,对齐服务端 lib 编排层的同名值(超了是**静默截断**,不拦用户看不出
 * 后半截没被读)。常量不 import:那模块是服务端的(带 pg pool),拖进客户端包不值。
 */
export const TEXT_LEN_MAX = 1200

/**
 * 字数提示的出场余量:离上限 200 字以内才显示计数(平时只显示圆形发送钮)。
 */
export const NUM_WARN_SLACK = 200

/**
 * 多轮上下文最多带几条消息(4 轮问答;长会话不把上下文顶爆)。
 */
export const HISTORY_MAX = 8

/**
 * 输入框自适应长高的封顶(px)。
 */
export const TA_H_MAX = 160

/**
 * 等待秒数的 tick 间隔。
 */
export const SECS_TICK_MS = 1000

/**
 * 会话 ID 复制反馈的回弹时长。
 */
export const TH_COPIED_MS = 1500

/**
 * 答复复制反馈的回弹时长。
 */
export const COPIED_MS = 1800

/**
 * 贴底判定的余量(px):离底不足这个数算贴底,新内容来了跟着滚;
 * 用户往回翻看旧答复时别把他甩到底。
 */
export const STICK_SLACK = 48

/**
 * 当前登录人接口(Payload 自带,已含 profile;复用账户页同款端点,不新开接口)。
 */
export const URL_ME = '/api/users/me'

/**
 * 对话接口(SSE 或 JSON;流式分支按 content-type 判)。
 */
export const URL_CHAT = '/api/consult/chat'

/**
 * fetch 的凭据档:同源带 cookie。与 account 域同名同义,各家一份。
 */
export const CRED_INCLUDE = 'include'

/**
 * POST 方法字。
 */
export const METHOD_POST = 'POST'

/**
 * JSON 请求体的头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 响应头的小写形态(Headers.get 用)。
 */
export const HDR_CONTENT_TYPE_LOW = 'content-type'

/**
 * JSON 请求体的媒体类型。
 */
export const MIME_JSON = 'application/json'

/**
 * SSE 的媒体类型(响应头含它才走流式分支)。
 */
export const MIME_SSE = 'text/event-stream'

/**
 * SSE 一行数据的前缀。
 */
export const SSE_DATA_HEAD = 'data:'

/**
 * SSE 事件块的分隔(两个换行)。
 */
export const SSE_BLOCK_SEP = '\n\n'

/**
 * SSE 块内行分隔。
 */
export const SSE_LINE_SEP = '\n'

/**
 * SSE 收尾记号。
 */
export const SSE_DONE = '[DONE]'

/**
 * 提交埋点。
 */
export const EV_SUBMIT = 'chat-submit'

/**
 * 答复落地埋点。
 */
export const EV_ANSWER = 'chat-answer'

/**
 * 首次聚焦输入框埋点(只打第一次 —— 每次点回输入框都算会把口径撑爆)。
 */
export const EV_OPEN = 'chat-open'

/**
 * 点示例句埋点(kind = 键最后一段)。
 */
export const EV_EXAMPLE = 'chat-example'

/**
 * 点选项卡埋点(pick = 第几枚;自己说 = OPT_SELF_PICK)。
 */
export const EV_OPTION = 'chat-option'

/**
 * 赞/踩埋点(kind = good/bad)。**通用聊天的点赞是训练信号,我们的点踩是
 * 数据缺口报警器**:每一个踩都是用户在替我们标注「这里答不好」。
 */
export const EV_FEEDBACK = 'chat-feedback'

/**
 * 「自己说」那一枚的 pick 值(与 0 起的选项序号区分)。
 */
export const OPT_SELF_PICK = -1

/**
 * 每轮选项卡最多几枚。
 */
export const OPTIONS_MAX = 4

/**
 * 空态示例句几条。
 */
export const EXAMPLES_MAX = 3

/**
 * 记忆面板最多列几条职业。
 */
export const MEM_NOC_MAX = 3

/**
 * 记忆面板最多列几个目标省。
 */
export const MEM_PROV_MAX = 5

/**
 * 触屏判定的媒体查询(触屏上 Enter 是换行不是发送 —— 手机上写三句话被 Enter
 * 截断很恼人;autoFocus 也跳过 —— 一展开就顶起键盘)。
 */
export const COARSE_MQ = '(pointer: coarse)'

/**
 * Enter 键名。
 */
export const KEY_ENTER = 'Enter'

/**
 * Esc 键名(manual popover 不自带 Esc,自己挂)。
 */
export const KEY_ESC = 'Escape'

/**
 * Activity 面板「管理记忆」的去处(登录态)。
 */
export const URL_MEM_MANAGE = '/account?sec=profile'

/**
 * Activity 面板「登录」的去处(匿名态;全站唯一登录入口 = /jobs 顶栏弹框)。
 */
export const URL_MEM_LOGIN = '/?login=1'

/**
 * 站内出处的显示名(链接文字用官方站点名;站内页用品牌名 —— 语言中立不必翻译,
 * 也不会把工具层的中文 label 漏进英文界面)。
 */
export const BRAND_NAME = 'Offer2PR'

/**
 * 域名开头的 www 前缀(显示站点名时摘掉)。
 */
export const WWW_RE = /^www\./

/**
 * 外链判定(http/https 才开新窗并挂 noreferrer)。
 */
export const HTTP_RE = /^https?:/i

/**
 * 行首项目符号记号(自家约定,不是 markdown;只认它和空行两个记号)。
 */
export const BULLET_RE = /^-\s+(?<body>.+)$/

/**
 * 匿名档写死三句(句句自带具体职业 —— 保证不撞编排层 noOcc 闸,D1 撞过一次)。
 */
export const EXAMPLES_ANON = [{ key: 'chat.ex1' }, { key: 'chat.ex2' }, { key: 'chat.ex3' }] as const

/**
 * 注册未建档写死三句(携带槽值示范 —— 句子本身就是「边问边建档」的样本,
 * 用户照着改一改发出去,编排层就能从文本里抽到槽)。
 */
export const EXAMPLES_REG = [{ key: 'chat.ex.reg1' }, { key: 'chat.ex.reg2' }, { key: 'chat.ex.reg3' }] as const

/**
 * 记忆面板认的分型 slug(档案里存了别的值不冒充人话)。
 */
export const STATUS_SLUGS = ['overseas', 'studying', 'working', 'jobhunting', 'pr'] as const

/**
 * 分型标签的键头(`prof.st.<slug>`)。
 */
export const PROF_ST_HEAD = 'prof.st.'

/**
 * 省全名的键头(`pr.<两字码>`)。
 */
export const PR_HEAD = 'pr.'

/**
 * NOC 五位码的形状(档案里存了脏码的整条跳过,不瞎猜职业名)。
 */
export const NOC5_RE = /^\d{5}$/

/**
 * 职业标签里「中文名 / 英文缩写」的分隔(如 prof.job.psw)—— 塞进整句会撞站规
 * 禁「/」杂糅,取斜杠前半截。
 */
export const TITLE_SLASH_SEP = ' / '

/**
 * 记忆句里职业码的前缀(「Cook (NOC 63200)」那个 NOC 字样)。
 */
export const NOC_LABEL_HEAD = 'NOC '

/**
 * i18n 键的分段点(埋点短标签取最后一段:'chat.ex.occProv' → 'occProv')。
 */
export const KEY_DOT = '.'

/**
 * 轻提示的 localStorage 键(记出场次数;点开过写成 HINT_MAX = 永久不再出)。
 */
export const HINT_KEY = 'jt.chat.hint.v1'

/**
 * 桌面全屏偏好的 localStorage 键(全屏是个人偏好不是一次性动作 —— 愿意在小窗里
 * 读长答复的人每次都愿意,不愿意的每次都得再点一遍)。
 */
export const MAX_LS_KEY = 'jt.chat.max.v1'

/**
 * 桌面自定义位置+尺寸的 localStorage 键(2026-08-05 Frank 要拖动与四向缩放)。
 */
export const BOX_LS_KEY = 'jt.chat.box.v1'

/**
 * 启动器自定义位置的 localStorage 键(2026-08-06 Frank「图标可自由拖动,防挡内容」;
 * 拖过 = 用户显式选的位置,避让测量不再插手)。
 */
export const DOCK_LS_KEY = 'jt.chat.dock.v1'

/**
 * localStorage 布尔的「真」。
 */
export const LS_ON = '1'

/**
 * localStorage 布尔的「假」。
 */
export const LS_OFF = '0'

/**
 * 面板最小宽:再窄正文就开始逐字折行(composer 加发送钮本身要 ~300)。
 */
export const PANEL_W_MIN = 320

/**
 * 面板最小高:头部 54 + composer ~96 + 至少两三行答复。
 */
export const PANEL_H_MIN = 360

/**
 * 八个缩放方向:四边 + 四角(字母出现在方向里就动那条边)。
 */
export const GRIPS = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'] as const

/**
 * 整体拖动的方向档(抓标题栏)。
 */
export const GRAB_MOVE = 'move'

/**
 * 点按与拖动的分界:指针位移超过这个数才算拖(松手后抑制那次 click)。
 */
export const DRAG_SLOP = 6

/**
 * 常规离底距离(px;挂件与视口底/右缘)。
 */
export const DOCK_GAP = 16

/**
 * 启动器圆钮的边长(px;拖动钳制按它算,不按带提示条的整条 dock)。
 */
export const DOCK_BTN = 56

/**
 * 动作图标的标准边长(px;答复动作条的复制/点赞与窗控的最小化/最大化都用它)。
 */
export const ICON_PX = 16

/**
 * 重置钮图标边长(px;比标准档小一号 —— 它在标题栏与窗控同排但危险度更高,压半档)。
 */
export const RESET_ICON_PX = 15

/**
 * 发送钮箭头边长(px;比标准档大一号 —— 主动作钮要在动作条里立得住)。
 */
export const SEND_ICON_PX = 19

/**
 * 启动器圆钮里对话图标的边长(px;56px 圆钮配 24px 图标)。
 */
export const DOCK_ICON_PX = 24

/**
 * 拖动钳制的屏缘安全边(px)。
 */
export const EDGE_GAP = 8

/**
 * 轻提示最多出几次:挂件是全站唯一对话入口 → 提示出到用户真的点开为止,
 * 但再多就是牛皮癣;点开过一次永久不再出。
 */
export const HINT_MAX = 3

/**
 * 轻提示的出场延迟(别跟首屏抢注意力)。
 */
export const HINT_DELAY_MS = 1600

/**
 * 轻提示自己消失的时刻(出场 + 8 秒)。
 */
export const HINT_HIDE_MS = 9600

/**
 * 看门狗一级:开了这么久还量不到高度 → 强制退普通 fixed 层(popover/CSS 没兑现)。
 */
export const WATCHDOG_MS = 300

/**
 * 看门狗二级:强制后仍不可见 → 收起面板把启动器还回去(遇到没预料到的引擎;
 * 用户至少还看得见那个钮,而不是对着一张什么都没有的页面)。
 */
export const WATCHDOG2_MS = 900

/**
 * 重置二次确认的自撤时长(问了没人确认 = 误点,不留一个随时会清掉对话的活钮)。
 */
export const RESET_ASK_MS = 4000

/**
 * 桌面档的媒体查询(>640;拖拽/缩放/box 全挂它下面)。
 */
export const WIDE_MQ = '(min-width:641px)'

/**
 * 页面任意处拉起挂件的自定义事件名(C6 通道卡 CTA dispatch 它并带 prefill)。
 */
export const OPEN_EVT = 'o2p:chat-open'

/**
 * 预填问句的长度帽(detail 是我们自己 dispatch 的,仍设帽防手滑)。
 */
export const PREFILL_MAX = 300

/**
 * 职位详情页路由(有吸底 ApplyBar → 开避让测量)。
 */
export const JOBS_DETAIL_RE = /^\/jobs\/[^/]+$/

/**
 * 评估页路由前缀(.quizBar 手机上 fixed,同一套测量覆盖)。
 */
export const PLAN_HEAD = '/plan'

/**
 * 手机端连圆球也不出的路由(走查 #298:56×56 fixed 在 375 视口永久盖住右下角内容,
 * 而顾问在评估/处境两条新动线上本就不导流;职位页照旧)。
 */
export const NARROW_OFF_RE = /^\/(cases|plan)(\/|$)/

/**
 * 吸底动作条的最小高(比它矮的块不算条)。
 */
export const BAR_H_MIN = 24

/**
 * 找吸底条的扫描范围:只扫 main 内的 div —— 挂件自己挂在 main 外(layout),
 * 天然不会把自己认成底栏。按**特征**找不按 class 找(别的组件的内联样式,
 * 写死选择器等着被改坏)。
 */
export const BAR_SCAN_SEL = 'main div'

/**
 * MutationObserver 的观察根(条子异步渲出 —— JD 整理完才挂 → 补测)。
 */
export const MAIN_SEL = 'main'

/**
 * sticky/fixed 贴底的判据值。
 */
export const BOTTOM_ZERO = '0px'

/**
 * position 的两种贴底形态。
 */
export const POS_STICKY = 'sticky'

/**
 * position 的另一种贴底形态。
 */
export const POS_FIXED = 'fixed'

/**
 * popover 开着的选择器(老引擎解析不了要 try 住)。
 */
export const POPOVER_OPEN_SEL = ':popover-open'

/**
 * 面板的 popover 档:manual —— auto 的 light-dismiss 会「点一下页面就收起」,
 * 与 Intercom/Crisp 手感不符;Esc 自己挂。
 */
export const POPOVER_MANUAL = 'manual'

/**
 * 面板的 ARIA 角色。
 */
export const ROLE_DIALOG = 'dialog'

/**
 * 标题栏按下时要放过的目标(按在钮上不拖 —— 不然点「收起」会先被当成一次
 * 0 像素的拖动)。
 */
export const BTN_SEL = 'button'

/**
 * 鼠标指针型(只认左键起拖)。
 */
export const POINTER_MOUSE = 'mouse'

/**
 * 拖动中禁全局选字的值。
 */
export const SELECT_NONE = 'none'

/**
 * 看门狗强制显示用的 display 值。
 */
export const DISPLAY_FLEX = 'flex'

/**
 * 自定义框生效时把锚定边让开的值。
 */
export const POS_AUTO = 'auto'

/**
 * 输入框高度重算前的复位值。
 */
export const H_AUTO = 'auto'

/**
 * px 单位尾巴(拼行内高度/避让距离用)。
 */
export const PX = 'px'

/**
 * 切不出东西时的空文本。与 account 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 挂件打开埋点。
 */
export const EV_W_OPEN = 'widget-open'

/**
 * 挂件关闭埋点。
 */
export const EV_W_CLOSE = 'widget-close'

/**
 * 挂件最小化埋点。
 */
export const EV_W_MIN = 'widget-minimize'

/**
 * 桌面全屏埋点。
 */
export const EV_W_MAX = 'widget-max'

/**
 * 退出全屏埋点。
 */
export const EV_W_RESTORE = 'widget-restore'

/**
 * 会话重置埋点。
 */
export const EV_W_RESET = 'widget-reset'

/**
 * 面板拖动埋点。
 */
export const EV_W_DRAG = 'widget-drag'

/**
 * 面板缩放埋点。
 */
export const EV_W_RESIZE = 'widget-resize'

/**
 * 启动器拖动埋点。
 */
export const EV_W_DOCK_DRAG = 'widget-dock-drag'

/**
 * 看门狗一级触发埋点(强制普通层;下次出问题有据可查)。
 */
export const EV_W_FALLBACK = 'widget-fallback'

/**
 * 看门狗二级触发埋点(收面板还启动器)。
 */
export const EV_W_STUCK = 'widget-stuck'

/**
 * 面板内容 chunk 取不到埋点(2026-08-04 生产事故的正主)。
 */
export const EV_W_LOAD_FAIL = 'widget-load-fail'

/**
 * chunk 取不到时的留痕话术(console;弱网/跨部署的旧标签页)。
 */
export const WARN_CHUNK = '[chat] 面板内容加载失败(多半是 chunk 取不到)'

/**
 * popover 不可用时的留痕话术(老引擎静默降级)。
 */
export const WARN_POPOVER = '[chat] popover 不可用,退普通 fixed 层'

/**
 * 看门狗一级的留痕话术。
 */
export const WARN_WATCHDOG = '[chat] 面板开了 300ms 仍不可见 —— 强制退普通 fixed 层'

/**
 * 看门狗二级的留痕话术。
 */
export const WARN_STUCK = '[chat] 强制普通层后仍不可见 —— 收起面板,把启动器还回去'

/**
 * 挂件离底距离的 CSS 变量名(避让测量把实测值写进它;css 里 bottom 按它算)。
 */
export const CLB_VAR = '--clB'

/**
 * 关闭钮的字符(与 ActModal 同款文字 ×;图标是内容不是样式)。
 */
export const CLOSE_MARK = '×'

/**
 * 新窗口打开的 target 值(官方来源在新页开,不打断读答复的动线)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 定制样式钮的统一底座(裸 <button> 禁令的出口):ghost 底最素,视觉全由本域
 * 加倍类定形。与 account 域同名同义,各家一份。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 排版块的项目符号档记号(与 Block.type 的字面量对表)。
 */
export const BLOCK_UL = 'ul'

/**
 * 秒数后缀(「8s」的 s;计量记号不是文案,三语一样不进 i18n)。
 */
export const SECS_SUFFIX = 's'

/**
 * 赞的枚举值(funnel 白名单同名)。
 */
export const VOTE_GOOD = 'good'

/**
 * 踩的枚举值。
 */
export const VOTE_BAD = 'bad'

/**
 * 认不得的流内错误码的兜底故障档(模型侧出岔当模型故障报)。
 */
export const FAULT_LLM = 'llm'

/**
 * 认不得的 JSON 错误码的兜底故障档(连不上/解析不了当网络故障报)。
 */
export const FAULT_NET = 'net'

/**
 * 指针移动事件名(拖动跟随)。
 */
export const EVT_POINTERMOVE = 'pointermove'

/**
 * 指针抬起事件名(拖动收尾)。
 */
export const EVT_POINTERUP = 'pointerup'

/**
 * 指针取消事件名(系统抢走指针时也要收尾)。
 */
export const EVT_POINTERCANCEL = 'pointercancel'

/**
 * 窗口尺寸变化事件名(钳位与避让重算)。
 */
export const EVT_RESIZE = 'resize'

/**
 * 滚动事件名(避让重算)。
 */
export const EVT_SCROLL = 'scroll'

/**
 * 键盘按下事件名(Esc 关闭)。
 */
export const EVT_KEYDOWN = 'keydown'

/**
 * 媒体查询变化事件名(桌面档跟踪)。
 */
export const EVT_MQ_CHANGE = 'change'

/**
 * 排版块的段落档记号(与 Block.type 的字面量对表)。
 */
export const BLOCK_P = 'p'

/**
 * 故障行行首的警示记号(内容不是样式)。
 */
export const WARN_MARK = '!'

/**
 * 折叠条里「一句话 · 秒数」的间隔号(枚举分隔是站规里唯一许它上场的位置)。
 */
export const SECS_DOT = '· '

/**
 * 根路径(usePathname 空值时的兜底;职位板在根路径)。
 */
export const PATH_ROOT = '/'

/**
 * 复制钮的常态文案键。
 */
export const K_COPY = 'chat.copy'

/**
 * 复制钮的已复制文案键(1.8s 回弹)。
 */
export const K_COPIED = 'chat.copied'

/**
 * 记忆节匿名态的行动键(去登录)。
 */
export const K_MEM_SIGNIN = 'chat.memorySignIn'

/**
 * 记忆节登录态的行动键(管理记忆)。
 */
export const K_MEM_MANAGE = 'chat.memoryManage'

/**
 * 重置钮常态的话术键。
 */
export const K_RESET = 'cw.reset'

/**
 * 重置钮二次确认态的话术键。
 */
export const K_RESET_OK = 'cw.resetOk'

/**
 * 全屏钮常态的话术键。
 */
export const K_MAX = 'cw.max'

/**
 * 全屏钮还原态的话术键。
 */
export const K_RESTORE = 'cw.restore'

/**
 * 多轮消息里用户角色的枚举值(后端契约)。
 */
export const ROLE_USER = 'user'

/**
 * 多轮消息里助手角色的枚举值。
 */
export const ROLE_ASSISTANT = 'assistant'

/**
 * 数字千分位的地区档(加拿大英文格式)。
 */
export const LOCALE_NUM = 'en-CA'

/**
 * 百分号单位(与数字之间不留空格)。
 */
export const UNIT_PCT = '%'

/**
 * 数字与普通单位之间的空格。
 */
export const UNIT_SEP = ' '

/**
 * 记忆句里职业码括注的开括号(「Cook (NOC 63200)」)。
 */
export const NOC_WRAP_OPEN = ' ('

/**
 * 记忆句里职业码括注的闭括号。
 */
export const NOC_WRAP_CLOSE = ')'

/**
 * 已建档候选:PGWP 倒计时句的键。
 */
export const K_EX_PGWP = 'chat.ex.pgwp'

/**
 * 已建档候选:职业×两省比对句的键。
 */
export const K_EX_OCC_CMP = 'chat.ex.occCmp'

/**
 * 已建档候选:职业×单省有没有戏句的键。
 */
export const K_EX_OCC_PROV = 'chat.ex.occProv'

/**
 * 已建档候选:语言×目标省缺口句的键。
 */
export const K_EX_CLB_PROV = 'chat.ex.clbProv'

/**
 * 字数计的分隔杠(「123/1200」;计量记号不进 i18n)。
 */
export const COUNT_SEP = '/'

/**
 * 缩放方向:东边(右)。
 */
export const DIR_E = 'e'

/**
 * 缩放方向:南边(下)。
 */
export const DIR_S = 's'

/**
 * 缩放方向:西边(左;拉它时对边钉住)。
 */
export const DIR_W = 'w'

/**
 * 缩放方向:北边(上;拉它时对边钉住)。
 */
export const DIR_N = 'n'
