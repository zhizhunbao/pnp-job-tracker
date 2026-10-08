/**
 * GET /api/queue/run —— 跑一轮智能投递(seed 成功后由 ETL load 役触发,x-seed-token 鉴权;2026-10-08)。芯在 lib/queue/routes.ts。
 *
 * @author Frank
 * @time 2026-10-08 14:00:00
 */

export { queueRunRoute as GET } from '@/lib/queue/server'

/**
 * 一轮要给很多人写信,放开到 5 分钟(段配置;standalone 自托管不限,留作上限声明)。
 */
export const maxDuration = 300
