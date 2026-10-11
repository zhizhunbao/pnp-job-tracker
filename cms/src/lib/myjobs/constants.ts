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

/**
 * 空串(推荐行里没有的格;不知道预选省)。
 */
export const TEXT_NONE = ''

/**
 * 今日推荐:免费号每天看得见几条(2026-10-10 批 2;Pro 无上限,10-10 Frank「每天推荐 无上限」)。
 */
export const PICKS_FREE = 3

/**
 * 今日推荐:一次最多算多少条(Pro「无上限」的实际封顶;免费号「更多推荐 N」的 N 也按这个数)。
 */
export const PICKS_MAX = 50

/**
 * 「更多推荐」卡里锁住给看的几条(只给职位名与理由,公司 / 地址 / 薪资不下发)。
 */
export const PICKS_LOCKED_SHOW = 2

/**
 * 推荐缓存最多记多少人(到了整个清空重来;一人一天一份)。
 */
export const PICKS_CACHE_MAX = 5000

/**
 * 推荐接口的查询参数:浏览器按时区预选的省码。
 */
export const P_PROV = 'prov'

/**
 * 省码长度(查询参数只认两位大写字母,别的当没给)。
 */
export const PROV_RE = /^[A-Z]{2}$/

/**
 * 「今天」按哪个时区切(推荐一人一天一份;同站点其余日界)。
 */
export const DAY_ZONE = 'America/Toronto'

/**
 * 切「今天」用的区域格式(en-CA 出 YYYY-MM-DD)。
 */
export const DAY_LOCALE = 'en-CA'

/**
 * 地点一行里市与省码之间的分隔(照 Indeed「Concord, ON」)。
 */
export const ADDR_SEP = ', '

/**
 * 推荐理由码:能走省提名雇主担保(胶囊写「能走 OINP 雇主担保」)。
 */
export const WHY_PNP = 'pnp'

/**
 * 推荐理由码:薪资高于本省同职业中位。
 */
export const WHY_WAGE = 'wage'

/**
 * 推荐理由码:和他投过的岗同一职业单元组。
 */
export const WHY_OCC = 'occ'

/**
 * 推荐理由码:和他收藏的岗同一职业单元组(投过的同组已写「职业对口」时不重复)。
 */
export const WHY_SAVED = 'saved'

/**
 * 省码 → 省提名项目的通行简称(胶囊「能走 {简称} 雇主担保」;魁北克不属 PNP,不出)。
 */
export const PROV_PNP: Record<string, string> = {
  /**
   * 安大略。
   */
  ON: 'OINP',

  /**
   * 不列颠哥伦比亚。
   */
  BC: 'BC PNP',

  /**
   * 阿尔伯塔。
   */
  AB: 'AAIP',

  /**
   * 萨斯喀彻温。
   */
  SK: 'SINP',

  /**
   * 曼尼托巴。
   */
  MB: 'MPNP',

  /**
   * 新斯科舍。
   */
  NS: 'NSNP',

  /**
   * 新不伦瑞克。
   */
  NB: 'NBPNP',

  /**
   * 爱德华王子岛。
   */
  PE: 'PEI PNP',

  /**
   * 纽芬兰与拉布拉多。
   */
  NL: 'NLPNP',
}
