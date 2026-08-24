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
