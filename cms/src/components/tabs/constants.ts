/**
 * tabs 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 页签/面板 id 前缀默认(aria-controls 靠它对上;同页多组选项卡时调用方各给各的前缀)。
 */
export const ID_PREFIX_DEFAULT = 'tab'

/**
 * 键盘导航:右箭头键的平台键名(KeyboardEvent.key 的定值 —— 打错是静默失效,
 * 所以起名进常量,下同)。
 */
export const KEY_RIGHT = 'ArrowRight'

/**
 * 键盘导航:左箭头键的平台键名。
 */
export const KEY_LEFT = 'ArrowLeft'

/**
 * 键盘导航:Home 键的平台键名(跳第一个页签)。
 */
export const KEY_HOME = 'Home'

/**
 * 键盘导航:End 键的平台键名(跳最后一个页签)。
 */
export const KEY_END = 'End'

/**
 * 整条选项卡的 ARIA 角色名(WAI-ARIA tabs 模式定死的词)。读屏靠这三个角色把
 * 「同一块内容的多个面」讲成「第 2 项,共 4 项」—— 与上面的键名同一个理由:
 * 打错不报错,只是读屏当场失能,所以起名让它打错就红。
 */
export const ROLE_TABLIST = 'tablist'

/**
 * 单个页签的 ARIA 角色名(tablist 的直接子项),挂在 Tabs 里那枚 button 上 ——
 * 与 aria-selected、aria-controls 三样齐了,读屏才把它念成「第 2 项,共 4 项」的页签,
 * 少一样就退化成一枚普通按钮。
 */
export const ROLE_TAB = 'tab'

/**
 * 面板的 ARIA 角色名,挂在 TabPanel 的外层 div 上。它与页签靠 aria-controls /
 * aria-labelledby 双向指认,而两边的 id 是 ID_SEP 与 ID_PANEL_SEG 拼出来的 ——
 * 角色写对而 id 拼错,读屏照样连不起这两半。
 */
export const ROLE_TABPANEL = 'tabpanel'

/**
 * id 各段的分隔符。选 `-` 是因为它在 HTML id 里最安全 —— CSS 选择器与
 * querySelector 都不必转义(`_` 也行,但全站 id 一向连字符)。
 */
export const ID_SEP = '-'

/**
 * 面板 id 的中段。同一个页签键要生成两个不重名的 id:页签是「前缀-键」、
 * 面板是「前缀-panel-键」,靠这一段把两半分开,aria-controls 与 aria-labelledby
 * 才对得上而不撞车。
 */
export const ID_PANEL_SEG = 'panel'

/**
 * 手机触控靶的全局规范类名(定义在 main.css 的 `@media (max-width: 640px)` 段:
 * `.tapPad::after` 伪元素向外撑到 min 40×40 —— 只扩可点范围,不占布局、不改一个像素的
 * 视觉,这是 #212 那轮 Frank「别换行」「钮怎么这么大」换来的姿势)。
 * 它是跨域共用的全局类,不进本域 module.css —— 多消费者的留全局(同 footer)。
 */
export const CLS_TAP_PAD = 'tapPad'

/**
 * className 位置的空串 = **不追加任何修饰类**(当前面照常显示,只有非当前面才叠
 * `.off`)。本域里空串只有这一种含义,别拿它表示「还没算出来」。
 */
export const CLS_NONE = ''
