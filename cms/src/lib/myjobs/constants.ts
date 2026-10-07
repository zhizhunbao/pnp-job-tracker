/**
 * 我的岗位域(lib/myjobs)的常量:「我的」页两张岗位表的数据口 —— /api/myjobs/applied(我的求职)与
 * /api/myjobs/saved(我的收藏)。2026-10-06 Frank「先做我的求职」「也重新改一下」(我的收藏)。
 * 现在都读收藏表 saved_jobs(点「邮箱投递」会把那一岗记成已投);B2 站内投递上线后,我的求职改读 applications 表,
 * 线格式不变(设计稿 docs/design/我的模块v2-20261005.md「定稿」、docs/design/投递页-B2-实施方案-20261005.md)。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */

/**
 * 错误体:要登录。
 */
export const E_AUTH = 'auth'

/**
 * 清单响应的缓存头:只给本人,哪一层都不许存。
 */
export const CACHE_PRIVATE = 'private, no-store'

/**
 * 一次最多列多少条(同原收藏接口的上限 200)。
 */
export const MYJOBS_LIMIT = 200

/**
 * 职位已下架的状态值(jobs.status)。
 */
export const JOB_CLOSED = 'closed'

/**
 * 时刻缺席时的空串。
 */
export const TIME_NONE = ''
