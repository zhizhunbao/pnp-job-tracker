/**
 * 埋点域的死值:第一方上报端点与 MIME。
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

/**
 * 第一方漏斗计数端点(站内路由,广告拦截器挡不住)。
 */
export const TRACK_URL = '/api/funnel/track'

/**
 * JSON 请求体的 MIME。
 */
export const JSON_MIME = 'application/json'

/**
 * 上报请求的 HTTP 方法。
 */
export const METHOD_POST = 'POST'

/**
 * 「挑不出低基数分组值」时 `pickProp` 返回的空串。埋点的 prop 只收 plan/kind/card
 * 这几格枚举,一条事件可能一格都没有 —— 这时给空串,调用方随即把它折成 null 再上报,
 * 也就是「这条事件不分组」。
 * 🔴 空串代表**没有可用的分组值**,不是「分组值是空的」:后者会在日聚合表里多出一行
 * 空 prop 的分组;折成 null 才是不分组。
 */
export const PROP_NONE = ''
