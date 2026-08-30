/**
 * GET /api/og/[file] — 分享图的壳(2026-08-30 三族进 api 批)。芯在 components/og 的
 * server 门(首例:HTTP 芯住组件桶,ImageResponse 版式即 JSX,lib 装不下)。
 * robots 为本前缀开了 Allow 洞 —— 分享图唯一读者是爬虫,禁抓区里必须点名放行。
 *
 * @author Frank
 * @time 2026-08-30 02:00:00
 */

export { ogFileRoute as GET } from '@/components/og/server'

/**
 * 请求时现渲(分享图/地图/灌库都要现算,不吃构建期缓存)。
 */
export const dynamic = 'force-dynamic'
