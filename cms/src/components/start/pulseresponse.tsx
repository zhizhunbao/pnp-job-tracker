/**
 * start 域的服务端芯:按段接口 GET /api/stats/pulse(2026-11-05 Frank「用户看到哪就加载哪部分」:
 * SSR 只出首屏四格,其余各段滚到视口附近才拉自己那一份)。
 * 住组件桶不住 lib/stats:聚合的组装是本桶的纯函数(homeCoreOf 一族),lib 不许反取组件桶;形照 og 首例
 * (HTTP 芯住组件桶,只从 ./server 门出)。与页面门共用 homecore 那一份缓存。
 * 背景:原 SSR 契约 4.9MB(其中担保雇主三语简介 2.6MB)进每次 HTML,渲一次堆涨 25~50MB,
 * 本机同版构建 + 250MB 堆上限 16 路并发打 /start 当场 heap out of memory,与生产 502 同一句。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import { getDb } from '@/lib/db/server'
import {
  E_BAD_PART, HDR_CACHE_CONTROL, HTTP_BAD_REQUEST, LANG_EN, P_LANG, P_PART, PULSE_CACHE_CONTROL, TEXT_NONE,
} from './constants'
import { pulsePartOf } from './functions'
import { getHomeCore } from './homecore'

/**
 * GET /api/stats/pulse?part=occ|emp|prov|draws|news&lang=zh|en|ko:把脉页一段的数据(只切那一段;emp 段的简介按语言挑)。
 *
 * @param req 请求(part 与 lang 两个参数)。
 * @returns 那一段的 json(带 SWR 缓存头);段名不认识回 400。
 */
export async function statsPulseRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  let part = sp.get(P_PART)
  if (part == null) {
    part = TEXT_NONE
  }
  let lang = sp.get(P_LANG)
  if (lang == null) {
    lang = LANG_EN
  }
  const body = pulsePartOf({ core: await getHomeCore(await getDb()), part, lang })
  if (body == null) {
    return Response.json({ error: E_BAD_PART }, { status: HTTP_BAD_REQUEST })
  }
  return Response.json(body, { headers: { [HDR_CACHE_CONTROL]: PULSE_CACHE_CONTROL } })
}
