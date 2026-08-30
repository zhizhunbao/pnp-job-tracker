/**
 * GET /seed — 过渡壳(2026-08-30 三族进 api 批:正门已迁 /api/seed)。留这一行是给
 * 还没重建的 docker 无人值守栈兜夜车(cron 打旧址;curl 不带 -L,301 兜不住,只能双壳);
 * 容器换代、etl/docker 调用点全指新址后,删本文件并同步删 middleware matcher 的 seed 项。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

export { seedRoute as GET } from '@/lib/mart/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
