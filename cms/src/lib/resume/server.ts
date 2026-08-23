/**
 * 简历域的**服务端**门：HTTP 芯（要连库/调模型，浏览器不该拿到）。
 * 门里只有转发（闸 door-forward-only）。
 *
 * @author Frank
 * @time 2026-08-23 10:30:00
 */

export { resumeExtractRoute, resumeMatchRoute, resumeRoute } from './routes'
