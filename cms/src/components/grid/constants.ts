/**
 * grid 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 21:40:00
 */

/**
 * 列数传给 CSS 的自定义属性名。`--gc` = grid columns。
 * 走 CSS 变量而不是直接写 `gridTemplateColumns`:列宽策略(前 N-1 列 max-content、
 * 末列吃剩余)整条留在 `grid.module.css` 里,这里只递一个数字进去。
 * ⚠️ 改名要同步改 css —— 两边靠这个字符串对上,拼错不会报错,只会静默失去列宽。
 */
export const CSS_VAR_COLS = '--gc'
