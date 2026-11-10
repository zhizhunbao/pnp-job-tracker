/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的死值(与父桶同值的各自抄)。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:推荐原因、通道名、显示更多 / 打码行、推荐取数是「今日推荐」这一节,
 * 并成一个子桶(判据:页面上的一节)。2026-11-07 随「我的求职」在新域重写(父桶 functions 过 1000 行闸,照旧切出这一族)。
 * 2026-11-09 Frank「推荐原因删掉」:理由码词条表与胶囊档撤。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 今日推荐先列几条,其余点「显示更多」再列(同父桶 PICKS_FIRST)。
 */
export const PICKS_FIRST = 3

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 英文界面语(通道名英文行取词用)。
 */
export const LANG_EN = 'en'

/**
 * 今日推荐接口(2026-10-10 批 2;后接 `?prov=` 浏览器按时区预选的省码)。
 */
export const URL_PICKS = '/api/myjobs/picks?prov='

/**
 * 今日推荐接口「不用当天缓存、现算一份」的尾巴(2026-10-11「进我的求职先弹五题」:答完档案重拉要按新答案推)。
 */
export const URL_PICKS_FRESH = '&fresh=1'

/**
 * 今日推荐接口「换到第几批」的尾巴(后接批号;2026-10-13 换一批)。
 */
export const URL_PICKS_BATCH = '&batch='

/**
 * 免费号一天能换几批(同服务端 lib/myjobs 的 PICKS_SWAP_FREE;换满再点弹定价框;
 * 2026-10-13 Frank「比如可以换 三次 然后 再点就弹付费呢」)。
 */
export const PICKS_SWAP_FREE = 3

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 中位时薪显示串的头(货币号;2026-11-09 Frank「这部分加进 table 吧」「这个地方都显示 时薪吧」)。
 */
export const MED_HEAD = '$'

/**
 * 中位时薪显示串的尾(每小时,同职位板「中位时薪」列)。
 */
export const MED_TAIL = '/hr'

/**
 * vs 中位高于或持平时的加号。
 */
export const VS_PLUS = '+'

/**
 * vs 中位的百分号。
 */
export const VS_PCT = '%'
