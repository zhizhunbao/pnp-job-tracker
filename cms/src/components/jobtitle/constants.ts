/**
 * jobtitle 域的死值:职位名懒翻接口、批量分批与拼键、界面语言三码。
 * 2026-09-23 随本域立起从 companies 桶(批量那一半)与 advisor 桶(按岗那一半)搬来,值一个没改。
 *
 * @author Frank
 * @time 2026-09-23 01:45:57
 */

/**
 * 职位名懒翻接口(批量传 titles、按岗传 title + id 两种体;2026-09-14)。
 */
export const URL_API_JOBS_TITLE = '/api/jobs/title'

/**
 * 批量懒翻职位名一次发的条数(与接口那头的 TITLE_BATCH_MAX 同值:超了的接口不收,所以这头按它分批发;
 * 2026-09-19 在招岗放开 50 条上限后,大公司展开会超)。
 */
export const TITLES_CHUNK = 60

/**
 * 批量键的分隔(一组职位名拼成一个串当 effect 依赖)。
 */
export const TITLES_KEY_SEP = '\u0001'

/**
 * POST 方法名。
 */
export const METHOD_POST = 'POST'

/**
 * 请求体类型的头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 的媒体类型。
 */
export const MIME_JSON = 'application/json'

/**
 * 中文界面码。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面码。
 */
export const LANG_KO = 'ko'

/**
 * 英文界面码(英文界面不出灰字、不懒翻)。
 */
export const LANG_EN = 'en'

/**
 * 空串(没有译名 / 不出灰字)。
 */
export const TEXT_NONE = ''
