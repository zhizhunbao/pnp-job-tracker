/**
 * 根域直出职位板(2026-07-17 用户拍板「offer2pr.com 不需要 /jobs 后缀」):
 * `/` 直接渲染职位板;旧 `/jobs` 由 middleware 301 回根(查询串保留,分享/回流/邮件链接不断)。
 * 组件与 SEO 头的单一来源在 jobs/page.tsx,这里只转发 —— 避免两份维护。
 * 2026-08-28 换装批:那边的静态 metadata 收成了 generateMetadata 转发形,这里跟着改名。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
export { default, generateMetadata } from './jobs/page'
export const dynamic = 'force-dynamic'
