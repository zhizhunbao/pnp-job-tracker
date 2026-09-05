/**
 * button 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 15:00:00
 */

/**
 * 六个**行动钮**变体(有颜色语义、吃基座与三档尺寸)。其余十二个是控件钮 ——
 * 形状由所在控件定,不吃基座(判据见 types 的 ButtonKind 注释)。
 */
export const ACTION_KINDS = ['primary', 'pro', 'secondary', 'ai', 'ghost', 'danger', 'mini']

/**
 * 不传 kind 时落的变体:主行动钮。
 * 默认给最重的那一档而不是 ghost —— 漏传时长成主钮一眼就看得出来,
 * 长成幽灵钮则会悄悄混进背景里,没人发现这里少写了一个参数。
 */
export const KIND_DEFAULT = 'primary'

/**
 * className 里类与类之间的分隔符。
 * DOM 的 class 属性就是**空格分隔**的类名清单 —— 换成逗号或加号,
 * 浏览器会把整串当成一个类名,基座、尺寸、变体的样式一起失效。
 */
export const CLS_SEP = ' '

/**
 * 返回钮走的变体:弱操作幽灵钮(返回不是页面主行动;形由 .backButton 盖在幽灵底上)。
 */
export const KIND_BACK = 'ghost'

/**
 * 新标签页链接必带的 rel 值(只有 target 传了才加)。
 * noreferrer 一次关掉两件事:目标页拿不到 `window.opener`(不能反手把本页导去钓鱼站),
 * 也拿不到 Referer 头(不把用户在本站看的是哪一页泄给外站)。
 */
export const REL_NOREFERRER = 'noreferrer'
