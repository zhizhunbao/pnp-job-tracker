/**
 * GET /api/stats/pulse — 把脉页按段取数的壳(2026-11-05 Frank「用户看到哪就加载哪部分」:SSR 只出首屏,
 * 各段滚到附近才拉自己那一份)。芯在 components/start 的 server 门(聚合的组装住那个桶,照 og 先例)。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */

export { statsPulseRoute as GET } from '@/components/start/server'

/**
 * 请求时现取(进程内缓存 10 分钟,不吃构建期缓存)。
 */
export const dynamic = 'force-dynamic'
