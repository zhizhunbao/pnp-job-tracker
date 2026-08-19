/**
 * GET /api/score-factors?provs=BC,ON —— 官方分值表按省懒取(决策页「各省估分」用)。
 *
 * 先前这两张表是随 /plan/pr 的 props 整份下发的:每个访客都背 192 行 ≈ 88KB,
 * 而只有答完题、且目标省有表的人才看得到。改成点开估分那一刻再要,按省过滤。
 * 数据走 getScoreTables 的进程内单件缓存,不新增每请求查询。
 */
import { getScoreTables } from '@/lib/score/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const provs = (sp.get('provs') || '').split(',').map((p) => p.trim().toUpperCase()).filter((p) => /^[A-Z]{2}$/.test(p))
  const { factors, draws, factorProvinces } = await getScoreTables()
  if (!provs.length) return Response.json({ factorProvinces, factors: [], draws: [] })
  const want = new Set(provs)
  return Response.json({
    factorProvinces,
    factors: factors.filter((f) => want.has(f.province)),
    // 抽选只给这几个省:分值卡拿它做对照锚点时也只按 s.province 取
    draws: draws.filter((d) => want.has(d.province)),
  })
}
