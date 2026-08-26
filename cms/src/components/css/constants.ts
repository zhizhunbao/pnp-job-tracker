/**
 * css 消化点的常量:造错的身份与话术(造错走 lib/error 的 fail,字面量按站规住 constants)。
 *
 * @author Frank
 * @time 2026-08-26 06:30:00
 */

/**
 * 缺类名错误的身份(挂在 Error.name 上,greppable)。
 */
export const CSS_ERR_NAME = 'CssClassMissing'

/**
 * 缺类名错误的话术:css 键是编译期写死的,查不到只有拼写错一种可能。
 */
export const CSS_ERR_MSG = 'css module 里没有这个类名(拼写错了)'
