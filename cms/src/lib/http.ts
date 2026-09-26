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
 * 403:登录了但不是这活的人(管理员工具,2026-09-14)。
 */
export const FORBIDDEN = 403

/**
 * 402:免费池用尽(前端升级卡)。
 */
export const PAYMENT_REQUIRED = 402

/**
 * 413：请求体超长（答案档 64KB 顶天那类限长闸）。
 */
export const TOO_LARGE = 413

/**
 * 422：收到了但处理不了（扫描件无文本层这类）。
 */
export const UNPROCESSABLE = 422

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
 * 504：上游超时（重试有用的那种）。
 */
export const GATEWAY_TIMEOUT = 504

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

/**
 * `textResponseOf` 的入参(状态码 + 文本正文)。
 */
export type TextResponseIn = {
  /**
   * HTTP 状态码。
   */
  status: number

  /**
   * 响应正文。
   */
  text: string
}

/**
 * `textResponseOf` 的返回(fetch 标准的 Response 起本地名 —— HTTP 层的母语)。
 */
export type TextResponseOut = Response

/**
 * 纯文本响应(路由层拼拦截响应用;2026-08-23 收牌批 —— functions 不造 Response,
 * 判定素材由域给,壳在本叶一处拼)。
 *
 * @param input 状态码与正文。
 * @returns Response。
 */
export function textResponseOf(input: TextResponseIn): TextResponseOut {
  return new Response(input.text, { status: input.status })
}

/**
 * 机器人 UA 判定(全站一份;2026-09-26 两份并成一份住本叶 —— 判的是请求头,换掉它业务一个字不用改)。
 * 原判一(2026-09-23 lib/employers 的 CRAWLER_UA_RE,Frank「两个都做吧」):公司卡的「点开」上报被爬虫灌满,
 * 「等待调查」排到第 58 位 —— 09-21 职位页挂上公司卡后,会跑 JS 的爬虫刷职位页,页面自己一滚就触发「真人动作」事件,
 * 带着真人标记报上来;09-22 被点开的公司 413 家,同期真人一天四五个。
 * 原判二(2026-09-26 /fe Frank,lib/funnel):近 30 天第一方 jd-open 32,722 次、同期 Umami 173 次,
 * 09-13 一天灌进 5,004 次,同期 Googlebot 日抓才 200~400 —— 表被非人流量灌爆,路由原先只挡本机。
 * 平台现成的 Next `userAgent().isBot` 只认搜索与社交预览那几十家,不含无头浏览器、AhrefsBot、SemrushBot、
 * ClaudeBot 与脚本客户端;已声明依赖里也没有判定库 —— 所以自带一条,是原判一那条的超集。逐项:
 * - `bot|crawl|spider|slurp`:自报家门的爬虫(Googlebot、bingbot、GPTBot、ClaudeBot、AhrefsBot、SemrushBot、
 *   Bytespider、Baiduspider、Yahoo Slurp……)。已知误伤:Cubot 牌手机的机型名带 CUBOT,加国量可忽略,
 *   与原判一同口径不另开例外。
 * - `headless|phantomjs|lighthouse`:无头浏览器与测速探针(Puppeteer / Playwright 默认 UA 带 HeadlessChrome)。
 * - `compatible;`:「(compatible; …)」尾巴 —— 抓取器惯用的自报格式,现代真浏览器不带(同原判一)。
 * - `google-|-google`:Google 名下不带 bot 字样的抓取器(Mediapartners-Google、FeedFetcher-Google、
 *   Google-InspectionTool)。
 * - `facebookexternalhit|bingpreview|whatsapp`:链接预览。
 * - `python|curl|wget|go-http-client|okhttp|axios|node-fetch|undici|^node$|java\/|java-http-client|libwww|scrapy|postman`:
 *   脚本与命令行客户端(不开页面、直接往端点 POST 的就是它们)。
 * - `https?:\/\/`:UA 里带网址 = 程序在留联系方式;真浏览器的 UA 从不带网址。
 * 空 UA 不在正则里,由 isBotUa 另判(同样按机器人算)。
 */
export const BOT_UA_RE = /bot|crawl|spider|slurp|headless|phantomjs|lighthouse|compatible;|google-|-google|facebookexternalhit|bingpreview|whatsapp|python|curl|wget|go-http-client|okhttp|axios|node-fetch|undici|^node$|java\/|java-http-client|libwww|scrapy|postman|https?:\/\//i

/**
 * `isBotUa` 的入参(UA 头原文;路由层取好传进来,纯行为层不碰 Request)。
 */
export type UaHeaderIn = {
  /**
   * User-Agent 头原文;没有这个头是 null。
   */
  ua: string | null
}

/**
 * 这一笔是不是机器人发的:没有 UA / 空 UA,或 UA 自报是爬虫、无头浏览器、脚本客户端(逐项见 BOT_UA_RE)。
 * 真浏览器每个请求都带 UA,空的只可能是脚本 —— 按机器人算(2026-09-26 /fe Frank:漏斗表被机器人灌爆)。
 * 缺头时的方向与 lib/funnel 的 isLocalHost 相反是故意的:host 缺席说明不了来源,宁可多记;UA 缺席本身就是脚本的特征。
 * 消费方:漏斗上报(命中回 204 不落库)、公司卡「点开」上报与公司现查(lib/employers 的 isCrawlerHeaders)。
 *
 * @param input UA 头原文(没有是 null)。
 * @returns 机器人 true。
 */
export function isBotUa(input: UaHeaderIn): boolean {
  if (input.ua == null || input.ua.trim() === '') {
    return true
  }
  return BOT_UA_RE.test(input.ua)
}
