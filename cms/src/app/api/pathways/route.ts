/**
 * GET /api/pathways?noc=72310&teer=2 — 职位详情页通道卡(C6)的只读数据。
 * 返回 13 条通道的**职业级**事实(jobPathways:经验门槛月数/口径/清单点名/清单排除),
 * 不含任何个人档案 —— 个性化排序在对话里(pathVerdict),卡片无档案态只做通用序。
 *
 * 🔴 详情页是全站流量最大的页(入口=出口),判定层六张表**禁每请求现算**(prod-pool-wedge 教训)
 *    → VerdictData 进程内缓存 10 分钟(同 /api/quiz topCache 手法;Render 单实例,重启即失效)。
 *    卡片端另有「进视口才请求」的懒取(同 OccReportCard),两道一起把 DB 压力钉死。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { loadVerdictData } from '@/lib/chatTools'
import { jobPathways } from '@/lib/pathVerdict'
import type { VerdictData } from '@/lib/pathVerdict'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let cache: { at: number; data: VerdictData } | null = null
const TTL = 10 * 60_000

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const noc = (sp.get('noc') || '').trim()
  if (!/^\d{5}$/.test(noc)) return Response.json({ error: 'noc required' }, { status: 400 })
  const teerRaw = Number(sp.get('teer'))
  const teer = Number.isInteger(teerRaw) && teerRaw >= 0 && teerRaw <= 5 ? teerRaw : null

  if (!cache || Date.now() - cache.at > TTL) {
    const payload = await getPayload({ config: await config })
    cache = { at: Date.now(), data: await loadVerdictData((payload.db as any).pool) }
  }
  // 门槛表空(库还没灌)= 本站缺口 → 空名单,卡片整卡不渲,不出空壳
  if (!cache.data.requirements.length) return Response.json({ rows: [] })
  return Response.json({ rows: jobPathways(noc, teer, cache.data) })
}
