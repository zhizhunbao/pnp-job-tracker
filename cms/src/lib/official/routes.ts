/**
 * 官方资料域的 HTTP 芯:GET /api/rules?prov=XX —— 某省门槛条文(把脉页抽选表「门槛」弹框懒查;
 * 2026-09-13 Frank「点门槛 应该弹框吧 不应该跳页面吧」)。壳在 app/api/rules/route.ts。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { getDb } from '../db/server'
import { BAD_REQUEST, HDR_CACHE_CONTROL } from '../http'
import { P_PROV, PROV_CODE_RE, RULES_CACHE_CONTROL } from './constants'
import { emptyRuleRows, loadRuleRows } from './functions'

/**
 * GET /api/rules:省码不合形 400;查询挂了给空清单,本路由永不 500。
 *
 * @param req 请求(读 prov 参数)。
 * @returns { rows } json(带 SWR 缓存头)。
 */
export async function rulesRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  const prov = sp.get(P_PROV)
  if (prov == null || PROV_CODE_RE.test(prov) === false) {
    return new Response(null, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const rows = await loadRuleRows({ db, province: prov }).catch(emptyRuleRows)
  return Response.json({ rows }, { headers: { [HDR_CACHE_CONTROL]: RULES_CACHE_CONTROL } })
}
