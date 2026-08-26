/**
 * i18n 组件域的死值:默认语言与 cookie 读写的零件。
 *
 * @author Frank
 * @time 2026-08-24 23:10:00
 */

/**
 * 没读到偏好时的默认语言。选中文而不是英文:站点的自然流量以中文用户为主,
 * 英文用户改一次语言的成本,低于中文用户开局看到一屏英文的成本。
 */
export const LANG_DEFAULT = 'zh'

/**
 * cookie 的名值分隔符。
 */
export const LANG_COOKIE_EQ = '='

/**
 * 语言 cookie 的属性串(跟在 `名=值` 之后)。
 * `path=/` 让整站共用一份;`max-age=31536000` 是一年(语言偏好不该每次会话重问);
 * `samesite=lax` 允许从外链跳回时仍带着它,同时挡住跨站 POST 携带。
 */
export const LANG_COOKIE_ATTRS = '; path=/; max-age=31536000; samesite=lax'

/**
 * 从 document.cookie 里取某个 cookie 的正则前半段(拼在 cookie 名之前)。
 * `(?:^|;\s*)` = 串首或分号之后 —— 少了它,`xlang` 会被当成 `lang` 匹配上。
 */
export const COOKIE_RE_HEAD = '(?:^|;\\s*)'

/**
 * 正则后半段(拼在 cookie 名之后):取到下一个分号为止。
 * 用 `+` 不是 `*` —— 空值的 cookie 视同没有。
 * 组名 `v` = 这个 cookie 的值;取值走 `m.groups.v`,不按位置数括号。
 */
export const COOKIE_RE_TAIL = '=(?<v>[^;]+)'

/**
 * cookie 名里要转义的字符 —— 正则源码里 `.` 是通配符,不转义会匹配到别的名字。
 */
export const DOT_RE = /\./g

/**
 * 转义后的点(正则源码里的两个字符:反斜杠加点)。
 */
export const DOT_ESCAPED = '\\.'
