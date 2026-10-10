/**
 * modal 域的死值:弹框规范(2026-07-05 用户拍板:全站弹框格式布局一致,遮罩不带毛玻璃;
 * 规范:遮罩 rgba(17,24,39,.5) · 圆角 14 · 阴影/关闭钮/内边距统一 · 普通层 z=50、叠加层 z=60)。
 *
 * SCRIM/CARD/iconBtnS 三个 style 对象是**跨弹框族的过渡导出**(as const 免库类型注解):
 * 39 处消费端(Advisor/Decision/Case…)还在 spread 它们拼运行时样式 —— 各消费域
 * 形制化批里逐个类化,届时这三个常量退役(2026-08-24 modal 域刀 A 记)。
 *
 * SCRIM 2026-08-24 撤编:自带壳的重弹框改用 functions 的 overlayCls() 拿类,
 * 值的单一来源回到 modal.module.css 的 .overlay;同日 scrim 这个舞台术语
 * 按 Frank 拍板统一改叫 overlay。(2026-08-29 从 MODAL_SHADOW 与 CARD 之间的
 * 悬空块注释挪进文件头 —— 它解释的是一个已经不存在的声明,挂不上任何一格。)
 *
 * 2026-09-28 弹框外壳并成一套(Frank「别并存啊」「你都重构了 还并存什么」):advisor 的浮层壳(FloatPanel)并进本域的 Modal,
 * 拖动 / 拉伸 / 尺寸记忆 / 关闭钮各只剩一份。CARD / iconBtnS / MODAL_RADIUS / MODAL_SHADOW 四个过渡导出查实全站零消费者,
 * 与 .card / .iconBtn 是同一份样式的第二份写法,随之退役;TRANSFORM_NONE / POS_ABSOLUTE / HALF / RESIZE_MAX_VW / RESIZE_MAX_VH
 * 随旧拖动(transform 位移)与旧拉伸上限退役。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 窄屏断点(E8-03 单一来源:≤640px 弹窗一律全屏)。
 */
export const NARROW_BP = 640

/**
 * Esc 键的平台键名(KeyboardEvent.key 的定值,打错是静默失效所以起名)。
 */
export const KEY_ESC = 'Escape'

/**
 * 普通弹框层级。
 */
export const Z_MODAL = 50

/**
 * 没指定层级的弹框按打开先后往上叠,每多一个开着的弹框高这么多(2026-10-09 N 批:投递框、职位框、公司框都挂在全站骨架上,
 * 谁叠在谁上面由打开先后定 —— 投递框里点公司,公司框在上;职位框里点投递,投递框在上)。
 */
export const Z_STEP = 2

/**
 * 拖拽豁免目标(闭包选择器):按在这些交互件上不算抓 header ——
 * 否则点按钮/选字/选 occ 药丸都会把整框拖走。
 * 2026-09-28 并壳:加 `[data-nodrag]` —— 标题栏里的窗口钮排与译名行整块不起拖动
 * (原浮层壳靠 makeActsDown 逐块拦,两个弹框还拦得不一样,见 advisor 旧注「本来就不一致」;并壳后一律拦)。
 */
export const DRAG_IGNORE_SEL = 'button, input, select, textarea, a, label, .occPill, .occSelectedChip, [data-nodrag]'

/**
 * 白卡的记号选择器:拖动 / 拉伸起手时从按下的那块(标题栏、把手、白卡本身)往上找白卡量位置 ——
 * 不挂 ref:机器交回的面板在渲染里要读,面板里混一个 ref 就整块读不得(react-hooks/refs)。
 */
export const FRAME_SEL = '[data-frame]'

/**
 * 三档宽默认档。
 */
export const SIZE_DEFAULT = 'md'

/**
 * 换屏键缺席时的值(没给 fitKey 的弹框 = 内容从不换屏,拉过的高一直留着)。2026-10-05 立。
 */
export const FIT_NONE = ''

/**
 * 关闭钮的 aria-label(上线以来就是英文死值;要不要走 i18n 待 Frank 拍,先归位常量)。
 */
export const CLOSE_ARIA = 'close'

/**
 * keydown 事件名(平台定值,打错是静默失效所以起名,下同)。
 */
export const EV_KEYDOWN = 'keydown'

/**
 * 媒体查询变化的事件名。
 */
export const EV_CHANGE = 'change'

/**
 * className 之间的分隔符。DOM 的 class 属性按**空白**切词,拼多个类只能用空格 ——
 * 换成逗号或加号会被浏览器当成一整个类名,整条样式静默失效。
 */
export const CLS_SEP = ' '

/**
 * 空串(没有译名 / 没有记忆键这类「这一格没有值」)。
 */
export const TEXT_NONE = ''

/**
 * 窄屏媒体查询的前半段(后面接断点像素与右括号)。
 * 用 max-width 而不是 min-width:弹框的默认形态是桌面的居中白卡,
 * 窄屏是**例外**分支 —— 查询写成「小于某宽度」才与这个默认一致。
 */
export const MQ_MAX_WIDTH_HEAD = '(max-width: '

/**
 * 窄屏媒体查询的后半段。
 */
export const MQ_MAX_WIDTH_TAIL = 'px)'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形,
 * Button 只出统一的语义与可达性(disabled/aria)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 拖拽缩放:最小宽(px;普通弹框)。
 */
export const RESIZE_MIN_W = 240

/**
 * 拖拽缩放:最小高(px;普通弹框)。
 */
export const RESIZE_MIN_H = 120

/**
 * 拖拽缩放:最小宽(px;带标题栏的窗口形 —— 职位描述 / 公司 / 字段弹框,2026-09-28 自 advisor 的 PANEL_W_MIN 并入)。
 */
export const WIN_MIN_W = 360

/**
 * 拖拽缩放:最小高(px;窗口形,自 advisor 的 PANEL_H_MIN 并入)。
 */
export const WIN_MIN_H = 280

/**
 * 视口边缘留白(px):拉伸的上限是视口减去它、窗口形首帧居中也先扣掉它(2026-09-28 并壳:
 * 普通弹框原上限 92vw × 85vh、浮层原先不设上限,并成一条「不许比屏幕大」)。
 */
export const VIEWPORT_GAP = 24

/**
 * 窗口形首帧居中后左上角的最小坐标(px):窗口比浮层还小时标题栏不许被顶出屏外,拖都拖不回来。
 */
export const POS_MIN = 12

/**
 * 服务端渲染时窗口形的横坐标初值(px;弹框只在浏览器里开,这一格只是兜底)。
 */
export const POS_X0 = 80

/**
 * 服务端渲染时窗口形的纵坐标初值(px)。
 */
export const POS_Y0 = 60

/**
 * 居中:剩余空间对半分。
 */
export const CENTER_DIV = 2

/**
 * 拖动 / 拉伸之后弹框的定位方式(钉在视口坐标上,不再随遮罩居中)。
 */
export const POS_FIXED = 'fixed'

/**
 * 边码:北(上)。
 */
export const EDGE_N = 'n'

/**
 * 边码:南(下)。
 */
export const EDGE_S = 's'

/**
 * 边码:东(右)。
 */
export const EDGE_E = 'e'

/**
 * 边码:西(左)。
 */
export const EDGE_W = 'w'

/**
 * 边码:东北角。
 */
export const EDGE_NE = 'ne'

/**
 * 边码:西北角。
 */
export const EDGE_NW = 'nw'

/**
 * 边码:东南角。
 */
export const EDGE_SE = 'se'

/**
 * 边码:西南角。
 */
export const EDGE_SW = 'sw'

/**
 * 八个把手的渲染顺序:四条边在前、四个角在后 —— 角块要盖在边条上,不然角上只能拉一个方向。
 * 字面量窄化(as const)是为了让每一项都认作边码的联合类型。
 */
export const EDGES = [EDGE_N, EDGE_S, EDGE_W, EDGE_E, EDGE_NW, EDGE_NE, EDGE_SW, EDGE_SE] as const

/**
 * 窗口级指针事件名:移动。
 */
export const EV_POINTERMOVE = 'pointermove'

/**
 * 窗口级指针事件名:松开。
 */
export const EV_POINTERUP = 'pointerup'

/**
 * 弹框总线:各页往全站弹框宿主发「栈操作」的站内事件名(2026-10-09 N 批,Frank「一个全站宿主,并掉各页那 5 套」:
 * 职位框 / 公司框的栈只有挂在全站骨架上的那一个,各页只发消息不持栈)。
 */
export const EV_PEEK = 'offer2pr:peek'

/**
 * 弹框总线:各页把本页的分层态与职业名表报给宿主的站内事件名(卸载时报 null 撤回)。
 */
export const EV_PEEK_CTX = 'offer2pr:peek-ctx'

/**
 * 栈操作:叠上一层。
 */
export const PEEK_PUSH = 'push'

/**
 * 栈操作:换掉最上面一层。
 */
export const PEEK_SWAP = 'swap'

/**
 * 栈操作:关掉最上面一层。
 */
export const PEEK_POP = 'pop'

/**
 * 栈操作:按职位号叠开职位框(手上没有整行的地方用,宿主现取一行)。
 */
export const PEEK_JOB_ID = 'jobId'

/**
 * 栈操作:全关。
 */
export const PEEK_CLEAR = 'clear'
