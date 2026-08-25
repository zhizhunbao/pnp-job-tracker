/**
 * 榜单域的 HTTP 芯(第十一抽屉):/api/rankings/data。
 * E8-02 弹窗化:/jobs 站内榜单弹窗按需拉;页面版 /rankings/[slug] 保留给 SEO/直链,
 * 两边走同一查询(loadRankingRows)。公开只读,零计算。
 *
 * @author Frank
 * @time 2026-08-23 03:30:00
 */
import { getDb } from '../db/server'
import { BAD_REQUEST } from '../http'
import { P_SLUG, RANKING_SLUGS, SLUG_NONE } from './constants'
import { loadRankingRows } from './functions'

/**
 * GET /api/rankings/data?slug=:一个榜的全部行。
 *
 * @param req 请求。
 * @returns { items };slug 不在白名单 400。
 */
export async function rankingsDataRoute(req: Request): Promise<Response> {
  let slug = SLUG_NONE
  const slugParam = new URL(req.url).searchParams.get(P_SLUG)
  if (slugParam != null) {
    slug = slugParam
  }
  if (RANKING_SLUGS.has(slug) === false) {
    return new Response(null, { status: BAD_REQUEST })
  }
  const items = await loadRankingRows({ db: await getDb(), slug: slug })
  return Response.json({ items })
}
