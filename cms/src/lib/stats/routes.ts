/**
 * 统计域的 HTTP 芯(第十一抽屉):/api/stats/data、/api/stats/fine、/api/stats/market。
 * 顶层只有 handler(闸 routes-shape);取数与缓存判断在 functions/variables。
 *
 * @author Frank
 * @time 2026-08-23 03:30:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { BAD_REQUEST, HDR_CACHE_CONTROL } from '../http'
import { normalizeProfile } from '../jobs'
import type { ProfileJson } from '../jobs'
import { getUser, isPro } from '../quota/server'
import {
  CITY_ALL_LIMIT, CITY_CACHE_CONTROL, CITY_LIMIT, CITY_TTL_MS,
  MACRO_CACHE_CONTROL, MACRO_TTL_MS, MARKET_CACHE_CONTROL, MARKET_TTL_MS, PARAM_LEN_MAX, PARAM_NONE,
  P_BROAD, P_MID, P_PROV,
} from './constants'
import {
  emptyChannels, emptyRows, loadBroadLabels, loadChannelNocs, loadCityIndustry, loadCityPilots, loadCityStats,
  loadDliCities, loadFineCounts, loadMacroRows, loadOccStats,
  loadPnpOpsRows, loadStats, loadStatSources,
} from './functions'
import { CACHE } from './variables'

/**
 * GET /api/stats/data:地区统计全量行 + 用户分层态(E8-02 弹窗化:/jobs 统计弹窗一次拉全;
 * /stats/* 页面保留给 SEO/直链,同一查询层)。isPro/myNocs 给「跨省对比」段用 ——
 * gate 只在展示层,数据行本就全量公开聚合。
 * 体内 `user.profile as ProfileJson` 是跨边界断言:quota 的档案格是递归 json,
 * jobs 的 normalizeProfile 只读扁平几格并自带兜底。
 *
 * @param _req 请求(不读参数;身份从 cookie 头取)。
 * @returns rows/srcs + isPro/loggedIn/myNocs。
 */
export async function statsDataRoute(_req: Request): Promise<Response> {
  const user = await getUser(await headers())
  let profileRaw: ProfileJson | null = null
  if (user != null) {
    profileRaw = user.profile as ProfileJson
  }
  const profile = normalizeProfile(profileRaw)
  const db = await getDb()
  const [rows, srcs] = await Promise.all([loadStats({ db: db, withMid: false }), loadStatSources(db)])
  return Response.json({ rows, srcs, isPro: isPro(user), loggedIn: user != null, myNocs: profile.nocCodes })
}

/**
 * GET /api/stats/fine?prov&broad&mid:统计下钻 L3(#127 批A)—— 单省×大类×中类的在招岗
 * 按小类计数。小类级不进 stats 表(行数爆炸),现查现算;只支持计数。
 *
 * @param req 请求。
 * @returns { rows };三参缺一或超长 400。
 */
export async function statsFineRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  let prov = PARAM_NONE
  const provParam = sp.get(P_PROV)
  if (provParam != null) {
    prov = provParam.trim()
  }
  let broad = PARAM_NONE
  const broadParam = sp.get(P_BROAD)
  if (broadParam != null) {
    broad = broadParam.trim()
  }
  let mid = PARAM_NONE
  const midParam = sp.get(P_MID)
  if (midParam != null) {
    mid = midParam.trim()
  }
  if (prov === '' || broad === '' || mid === ''
    || prov.length > PARAM_LEN_MAX || broad.length > PARAM_LEN_MAX || mid.length > PARAM_LEN_MAX) {
    return new Response(null, { status: BAD_REQUEST })
  }
  const rows = await loadFineCounts({ db: await getDb(), prov: prov, broad: broad, mid: mid })
  return Response.json({ rows })
}

/**
 * GET /api/stats/market:统计主图(MarketChart)四份数据 occ/city/rows/channels。
 * 从 /start、/stats 的 SSR 拆出来:occ ~3400 行是 HTML 里最大一坨(实测 /start 直出 1.85MB),
 * 与用户无关、mart 日更 —— 改挂载后后台拉。进程内 10 分钟缓存 + 浏览器侧 SWR 头。
 * 每份独立吞错空值(同 start 页红线):一张表缺只丢它自己,前端整节不渲,本路由永不 500。
 * E13-03 派生指标(pulse 契约 v3)在 loadOccStats 单一真相源里,这里纯透传。
 *
 * @param _req 请求(不读参数)。
 * @returns 四件套 json(带 SWR 缓存头)。
 */
export async function statsMarketRoute(_req: Request): Promise<Response> {
  if (CACHE.market == null || Date.now() - CACHE.market.ts >= MARKET_TTL_MS) {
    const db = await getDb()
    const [occ, city, rows, channels] = await Promise.all([
      loadOccStats(db).catch(emptyRows),
      loadCityStats({ db: db, limit: CITY_LIMIT }).catch(emptyRows),
      loadStats({ db: db, withMid: true }).catch(emptyRows),
      loadChannelNocs(db).catch(emptyChannels),
    ])
    CACHE.market = { v: { occ, city, rows, channels }, ts: Date.now() }
  }
  return Response.json(CACHE.market.v, { headers: { [HDR_CACHE_CONTROL]: MARKET_CACHE_CONTROL } })
}

/**
 * GET /api/stats/macro:把脉页省份 / PR 两段的宏观两份 macro/ops(macro_series + pnp_ops_stats 原样行)。
 * 2026-09-10 SSR 瘦身:通道树批后 macro_series 到 ~7,400 行(SQL 收窄后仍 ~5,000 行进 HTML),
 * /start 直出 5MB+、水合把主线程卡死(Frank「点 pr 也不跳啊 而且很卡」)—— 照 market 的形
 * 拆出 SSR 挂载后拉。进程内 10 分钟缓存 + 浏览器侧 SWR 头;两份各自吞错空值,本路由永不 500。
 *
 * @param _req 请求(不读参数)。
 * @returns 两份 json(带 SWR 缓存头)。
 */
export async function statsMacroRoute(_req: Request): Promise<Response> {
  if (CACHE.macroStats == null || Date.now() - CACHE.macroStats.ts >= MACRO_TTL_MS) {
    const db = await getDb()
    const [macro, ops] = await Promise.all([
      loadMacroRows(db).catch(emptyRows),
      loadPnpOpsRows(db).catch(emptyRows),
    ])
    CACHE.macroStats = { v: { macro, ops }, ts: Date.now() }
  }
  return Response.json(CACHE.macroStats.v, { headers: { [HDR_CACHE_CONTROL]: MACRO_CACHE_CONTROL } })
}

/**
 * GET /api/stats/city:把脉页城市段五份(2026-09-11 城市段重设计批,设计稿
 * docs/design/把脉页城市段-20260911.md)—— 城市全量榜(表 1 + 搜索)/ 城 × 大类(表 2)/
 * 大类三语名(表 2 列头)/ 试点社区(表 3)/ 城市 DLI(表 4)。全部 jobs/dli 现查聚合,
 * 口径与职位板同一份 WHERE(快照口径差 18~22% 的根因见 SQL.CITY_STATS);
 * 照 market 的形:进程内 10 分钟缓存 + 浏览器侧 SWR 头,每份独立吞错空值,本路由永不 500。
 *
 * @param _req 请求(不读参数)。
 * @returns 五份 json(带 SWR 缓存头)。
 */
export async function statsCityRoute(_req: Request): Promise<Response> {
  if (CACHE.cityStats == null || Date.now() - CACHE.cityStats.ts >= CITY_TTL_MS) {
    const db = await getDb()
    const [cities, industry, broads, pilots, dli] = await Promise.all([
      loadCityStats({ db: db, limit: CITY_ALL_LIMIT }).catch(emptyRows),
      loadCityIndustry(db).catch(emptyRows),
      loadBroadLabels(db).catch(emptyRows),
      loadCityPilots(db).catch(emptyRows),
      loadDliCities(db).catch(emptyRows),
    ])
    CACHE.cityStats = { v: { cities, industry, broads, pilots, dli }, ts: Date.now() }
  }
  return Response.json(CACHE.cityStats.v, { headers: { [HDR_CACHE_CONTROL]: CITY_CACHE_CONTROL } })
}
