/**
 * 模型域的**服务端**门：HTTP 芯（借 jobs/employers 的 server 门取数，浏览器不该拿到）。
 * 门里只有转发（闸 door-forward-only）。
 *
 * @author Frank
 * @time 2026-08-23 09:40:00
 */

export { coTranslateRoute, jdTranslateRoute, newsSummarizeRoute, newsTranslateRoute, nocTranslateRoute } from './routes'
