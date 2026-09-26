/**
 * 埋点域的死值:第一方上报端点与 MIME。
 * 2026-09-26 /fe Frank 添自排除开关那几格(Umami 官方键 + 网址参数)。
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

/**
 * Umami 官方的自排除键(2026-09-26 /fe Frank:本人两台设备占近 30 天全站浏览 47%)。
 * Umami 脚本每次上报前读这一格,有值就不发;第一方那条腿看到它同样不发 —— 两套口径一起剔。
 * 🔴 Umami 按真值判(值非空即关),写 '0' 也等于关 —— 恢复计数要删键,不能写 0。
 */
export const UMAMI_OFF_KEY = 'umami.disabled'

/**
 * 自排除键写进去的值(Umami 只看有没有,'1' 是它文档里的写法)。
 */
export const UMAMI_OFF_VAL = '1'

/**
 * 读出来的自排除键「等于没设」的那个值:空串 —— Umami 按真值判,空串算没关,第一方跟它同口径。
 */
export const UMAMI_OFF_NONE = ''

/**
 * 自排除开关的网址参数名:任意页带 `?notrack=1` 打开 = 这台设备从此不计,`?notrack=0` = 恢复计数。
 * 为什么走网址:iOS Chrome 没有控制台,手机上没别的办法写 localStorage(Frank 两台设备各点一次)。
 */
export const P_NOTRACK = 'notrack'

/**
 * 开关参数的「开」值:这台设备不计。
 */
export const NOTRACK_ON = '1'

/**
 * 开关参数的「关」值:恢复计数。
 */
export const NOTRACK_OFF = '0'

