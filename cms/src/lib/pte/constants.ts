/**
 * pte lib 域(PTE 刷题的两个 HTTP 芯:题目音频 / 练过档)的死值:路径切分、缓存头、档形上限、错误码。
 * 2026-09-03 批三新立(设计稿 docs/design/PTE刷题-20260903.md 批三)。
 *
 * @author Frank
 * @time 2026-09-03 16:00:00
 */

/**
 * 路径段分隔(从 req.url 取最后一段当 qid)。
 */
export const PATH_SEP = '/'

/**
 * 缓存头名。
 */
export const HDR_CACHE_CONTROL = 'Cache-Control'

/**
 * 内容类型头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 音频的缓存口径:一年 + immutable(同一 qid 的音频换声音时整表重灌,浏览器缓存靠换 URL 不靠过期)。
 */
export const AUDIO_CACHE = 'public, max-age=31536000, immutable'

/**
 * base64 编码名(Buffer.from 的第二参)。
 */
export const B64 = 'base64'

/**
 * 练过档最多记多少题(全库四型 1,047 题;上限防灌)。
 */
export const DONE_MAX = 5000

/**
 * 练过档请求体最大字节(题键 ~20 字节 × 上限)。
 */
export const DONE_LEN_MAX = 200000

/**
 * 错误码:未登录。
 */
export const E_AUTH = 'auth'

/**
 * 错误码:请求体形状不对。
 */
export const E_BAD = 'bad_request'

/**
 * 错误码:查无此音频。
 */
export const E_NOT_FOUND = 'not_found'

/**
 * 错误码:档太大。
 */
export const E_TOO_BIG = 'too_big'

/**
 * 空串(没有段 / 空题键)。
 */
export const TEXT_NONE = ''
