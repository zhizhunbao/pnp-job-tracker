/**
 * chat 域(全站悬浮顾问)的死值:错误码表、SSE 记号、接口地址、埋点事件名、
 * 挂件几何与定时档、localStorage 键、示例句表。2026-08-27 换装批自
 * ChatBox/ChatAnswer/ChatLauncher/chatExamples 四件收拢挂注释。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */

/**
 * 触屏判定的媒体查询(触屏上 Enter 是换行不是发送 —— 手机上写三句话被 Enter
 * 截断很恼人;autoFocus 也跳过 —— 一展开就顶起键盘)。
 */
export const COARSE_MQ = '(pointer: coarse)'

/**
 * Esc 键名(manual popover 不自带 Esc,自己挂)。
 */
export const KEY_ESC = 'Escape'

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
 * 定制样式钮的统一底座(裸 <button> 禁令的出口):ghost 底最素,视觉全由本域
 * 加倍类定形。与 account 域同名同义,各家一份。
 */
export const PLAIN_BTN_KIND = 'ghost'

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
 * 根路径(usePathname 空值时的兜底;职位板在根路径)。
 */
export const PATH_ROOT = '/'

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
