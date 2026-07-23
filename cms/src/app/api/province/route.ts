/**
 * GET /api/province?code=ON — E8-12 地点弹框省情报(懒查询:弹框打开才拉,不进首屏)。
 * 返回 { info, difficulty }:info=provinces.info(IRCC 体量数,mart 挂列);
 * difficulty=stats 表 broad='all' 行(E12-07,与 /stats DifficultyCard 同源)。零 AI 零额度。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get('code') || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return Response.json({ ok: false }, { status: 400 })
  const payload = await getPayload({ config: await config })
  const prov = await payload.find({ collection: 'provinces', where: { code: { equals: code } }, limit: 1, depth: 0 })
  const doc = prov.docs[0] as { info?: unknown } | undefined
  if (!doc) return Response.json({ ok: false }, { status: 404 })
  const { rows } = await (payload.db as any).pool.query(
    `SELECT difficulty FROM stats WHERE province = $1 AND broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL LIMIT 1`, [code])
  return Response.json({ ok: true, info: doc.info ?? null, difficulty: rows[0]?.difficulty ?? null })
}
