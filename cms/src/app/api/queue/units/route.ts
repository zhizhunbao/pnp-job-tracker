/**
 * POST /api/queue/units —— 调度器上报单元现状(2026-11-05 管理员队列页)。芯在 lib/ops/routes.ts(2026-11-08 老 queue 域退役,61 个容器的地址沿用)。
 *
 * @author Frank
 * @time 2026-11-05 23:10:00
 */

export { queueUnitsRoute as POST } from '@/lib/ops/server'
