/**
 * search 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */

/**
 * 清除钮的无障碍名(纯图标钮必须有名字,读屏才报得出来)。
 */
export const CLEAR_ARIA = 'clear'

/**
 * 搜索框默认尺寸档:lg(搜索框通常独占一行,视觉更重;筛选行里的传 md)。
 */
export const SIZE_LG = 'lg'

/**
 * 点清除钮后回给上层的值:空查询。
 * 输入框是**受控**的,value 必须始终是字符串 —— 回一个 null 会让 React 把它当成
 * 非受控框接管,此后用户敲的字就不再经过 onChange 传回上层了。
 */
export const QUERY_NONE = ''

/**
 * 手机软键盘上回车键的形态:搜。
 * 不声明的话安卓默认给「换行」,而单行输入框上按换行什么也不会发生 ——
 * 用户会以为搜索坏了。iOS 上同理(默认是「前往」)。
 */
export const ENTER_HINT_SEARCH = 'search'

/**
 * 清除钮的 type。
 * HTML 里 <button> 不写 type 默认就是 submit —— 搜索框一旦被放进 <form>,
 * 点清除会连带提交整张表单(页面刷新、刚输入的条件全丢)。
 */
export const TYPE_BUTTON = 'button'
