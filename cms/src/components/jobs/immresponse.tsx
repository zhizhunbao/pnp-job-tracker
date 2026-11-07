/**
 * jobs 桶的服务端芯:GET /api/jobs/imm,职位弹框「移民相关」卡的原料(2026-11-07 Frank 看效果图「可以,开做」:
 * 弹框与职位页同一副卡组,职位页由门 SSR 递,弹框走客户端取这一份)。
 * 住组件桶不住 lib/jobs:省提名事实与维度子集由本桶纯函数压(boardPnpOf / jobImmDimsOf),lib 不许反取组件桶;
 * 形照 start 桶 pulseresponse(HTTP 芯住组件桶,只从 ./server 门出)。取数走首屏维度与门槛表两层 10 分钟单件缓存,与职位页门同一份。
 *
 * @author Frank
 * @time 2026-11-07 14:00:00
 */
import { getDb } from '@/lib/db/server'
import { getPnpReqs, getSsrDims } from '@/lib/jobs/server'
import { HDR_CACHE_CONTROL, IMM_CACHE_CONTROL } from './constants'
import { boardPnpOf, jobImmDimsOf } from './functions'
import type { ImmJson } from './types'

/**
 * GET /api/jobs/imm:移民相关卡的原料(全站一份不分岗;本岗的低位门槛由客户端拿门槛行现判)。
 *
 * @param _req 请求(不读参数)。
 * @returns 省提名事实、两个字段弹框的维度与全国门槛行(带 SWR 缓存头)。
 */
export async function jobsImmRoute(_req: Request): Promise<Response> {
  const db = await getDb()
  const dims = await getSsrDims(db)
  const body: ImmJson = { pnp: boardPnpOf(dims), dims: jobImmDimsOf(dims), reqs: await getPnpReqs(db) }
  return Response.json(body, { headers: { [HDR_CACHE_CONTROL]: IMM_CACHE_CONTROL } })
}
