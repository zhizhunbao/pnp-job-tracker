/**
 * 分值域的 HTTP 芯(第十一抽屉):/api/points/factors。
 * 官方分值表按省懒取(决策页「各省估分」用)—— 先前整份随 /plan/pr props 下发,
 * 每个访客背 192 行 ≈ 88KB,而只有答完题且目标省有表的人才看得到;改成点开那一刻再要。
 * 数据走 getScoreTables 的进程内单件缓存,不新增每请求查询。
 *
 * @author Frank
 * @time 2026-08-23 03:30:00
 */
import { getDb } from '../db/server'
import { P_PROVS, PROV_CODE_RE, PROV_SEP } from './constants'
import { getScoreTables, makeProvHit } from './functions'

/**
 * GET /api/points/factors?provs=BC,ON:这些省的官方分值表与抽选锚点。
 * 不带 provs = 只回有表的省清单(前端据此决定亮哪些省)。
 *
 * @param req 请求。
 * @returns factorProvinces + 按省过滤的 factors/draws。
 */
export async function pointsFactorsRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  let raw = ''
  const provsParam = sp.get(P_PROVS)
  if (provsParam != null) {
    raw = provsParam
  }
  const provs: string[] = []
  for (const piece of raw.split(PROV_SEP)) {
    const p = piece.trim().toUpperCase()
    if (PROV_CODE_RE.test(p)) {
      provs.push(p)
    }
  }
  const { factors, draws, factorProvinces } = await getScoreTables(await getDb())
  if (provs.length === 0) {
    return Response.json({ factorProvinces, factors: [], draws: [] })
  }
  const want = new Set(provs)
  return Response.json({
    factorProvinces,
    factors: factors.filter(makeProvHit(want)),
    draws: draws.filter(makeProvHit(want)),
  })
}
