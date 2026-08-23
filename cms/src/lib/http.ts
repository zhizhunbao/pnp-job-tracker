/**
 * HTTP 词汇的共享叶子:状态码、头名、MIME、通用响应话术。
 * 为什么单独成叶(2026-08-23 Frank「还有状态码、异常、和一些头部常量啊」):
 * 这些是 40 个 api 路由共用的协议词,住任何一个域都串味;域专属的响应话术
 * (如 auth 的「未配置」)仍归各域 constants,这里只放跨路由同义的那部分。
 *
 * @author Frank
 * @time 2026-08-23 00:55:00
 */

/**
 * 204:成功且无响应体(埋点这类「永不报错」端点的统一应答)。
 */
export const NO_CONTENT = 204

/**
 * 302:跳转(OAuth 两跳、登录失败回落都用它)。
 */
export const FOUND = 302

/**
 * 400:请求不合法(参数缺失/白名单外)。
 */
export const BAD_REQUEST = 400

/**
 * 401:没带对凭证(seed-token 闸、会话失效)。
 */
export const UNAUTHORIZED = 401

/**
 * 402:免费池用尽(前端升级卡)。
 */
export const PAYMENT_REQUIRED = 402

/**
 * 413：请求体超长（答案档 64KB 顶天那类限长闸）。
 */
export const TOO_LARGE = 413

/**
 * 404:不存在(含「功能未配置」的兜底门)。
 */
export const NOT_FOUND = 404

/**
 * 429:匿名限流。
 */
export const TOO_MANY = 429

/**
 * 500:内部错误。
 */
export const SERVER_ERROR = 500

/**
 * 502：上游（朋友盒子/翻译网关）没给出东西。
 */
export const BAD_GATEWAY = 502

/**
 * 503:依赖未配置/不可用(如 Stripe 无密钥)。
 */
export const UNAVAILABLE = 503

/**
 * Location 响应头名。
 */
export const HDR_LOCATION = 'Location'

/**
 * Set-Cookie 响应头名。
 */
export const HDR_SET_COOKIE = 'Set-Cookie'

/**
 * Content-Type 头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 小写 content-type(fetch 请求侧惯用小写;HTTP 头名不区分大小写,但别混着换 ——
 * 响应侧沿用首字母大写、请求侧沿用小写,与存量一致)。
 */
export const HDR_CONTENT_TYPE_LC = 'content-type'

/**
 * JSON 的 MIME。
 */
export const MIME_JSON = 'application/json'

/**
 * HTML 响应的 MIME(带字符集;preview 类端点用)。
 */
export const MIME_HTML = 'text/html; charset=utf-8'

/**
 * 纯文本响应(JD 摘录这类)。
 */
export const MIME_TEXT = 'text/plain; charset=utf-8'

/**
 * 请求方 UA 头名(对外抓取用)。
 */
export const HDR_USER_AGENT = 'User-Agent'

/**
 * Accept 头名。
 */
export const HDR_ACCEPT = 'Accept'

/**
 * Referer 头名。
 */
export const HDR_REFERER = 'Referer'

/**
 * Cookie 头名(对外抓取回带会话)。
 */
export const HDR_COOKIE = 'Cookie'

/**
 * fetch 的 POST 方法名。
 */
export const METHOD_POST = 'POST'

/**
 * 401 的统一响应体(token 闸路由共用)。
 */
export const TEXT_UNAUTHORIZED = 'unauthorized'

/**
 * Origin 请求头名。
 */
export const HDR_ORIGIN = 'origin'

/**
 * Host 请求头名。
 */
export const HDR_HOST = 'host'

/**
 * x-seed-token 触发闸头名（auto_update 与运维脚本共用）。
 */
export const HDR_SEED_TOKEN = 'x-seed-token'

/**
 * Cache-Control 响应头名。
 */
export const HDR_CACHE_CONTROL = 'Cache-Control'

/**
 * 下载文件名头(CSV 导出这类附件响应用)。
 */
export const HDR_CONTENT_DISPOSITION = 'Content-Disposition'
