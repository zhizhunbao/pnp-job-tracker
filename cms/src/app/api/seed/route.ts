/**
 * GET /api/seed — 纯加载器的壳(?reset=1 清库重建;token 必带)。芯在 lib/mart/routes.ts
 * (第十一抽屉)。2026-08-30 三族进 api 批自 /seed 迁入;旧壳留一行转发当过渡
 * (docker 无人值守栈重建前,夜里 cron 打旧址不断),容器换代后删旧壳与 middleware
 * matcher 里的 seed 排除项。robots 不为它开洞 —— 灌库端点本就该禁抓。
 *
 * @author Frank
 * @time 2026-08-30 02:00:00
 */

export { seedRoute as GET } from '@/lib/mart/server'

/**
 * 请求时现渲(分享图/地图/灌库都要现算,不吃构建期缓存)。
 */
export const dynamic = 'force-dynamic'
/**
 * 灌库要 node 运行时(pg 连接池不跑 edge)。
 */
export const runtime = 'nodejs'
