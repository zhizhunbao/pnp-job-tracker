// 根域直出职位板(2026-07-17 用户拍板「offer2pr.com 不需要 /jobs 后缀」):
// / 直接渲染职位板组件;旧 /jobs 由 middleware 301 回根(查询串保留,分享/回流/邮件链接不断)。
// 组件与 metadata 单一来源在 jobs/page.tsx,这里只转发——避免两份维护。
export { default, metadata } from './jobs/page'
export const dynamic = 'force-dynamic'
