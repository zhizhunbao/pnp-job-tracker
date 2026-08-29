/**
 * legal 域(法务四页正文)的死值:支持邮箱与它在正文里的占位记号、邮件地址前缀、
 * 标题图标与标题之间的间隔。2026-08-27 换装批自 Legal.tsx 的散值收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-27 23:08:05
 */

/**
 * 公开支持邮箱的兜底地址(删号 / 异议下架 / 退款申请都走它):
 * 正式域名定了换 env(NEXT_PUBLIC_SUPPORT_EMAIL)即可,取值走 functions 的 supportEmailOf。
 */
export const SUPPORT_EMAIL_FALLBACK = 'wangsansi9527@gmail.com'

/**
 * 法务正文里的支持邮箱占位记号:三语文档(lib/legal)把邮箱写成这个记号,
 * 渲染时才换成真地址 —— 换邮箱不必动三份文案。
 */
export const EMAIL_SLOT = '{email}'

/**
 * 邮件地址的协议前缀(拼在支持邮箱前面成 href)。
 */
export const MAILTO_HEAD = 'mailto:'

/**
 * 标题图标与标题文字之间的间隔(半角空格;/about 不带图标,那一格整个不出)。
 */
export const ICON_GAP = ' '
