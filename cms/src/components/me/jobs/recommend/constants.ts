/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的死值(与父桶同值的各自抄)。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:推荐原因、通道名、显示更多 / 打码行、推荐取数是「今日推荐」这一节,
 * 并成一个子桶(判据:页面上的一节)。2026-11-07 随「我的求职」在新域重写(父桶 functions 过 1000 行闸,照旧切出这一族)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 推荐理由码 → 胶囊词条(顺序由服务端定;认不得的码不出)。
 * 2026-10-12 Frank「职业对口 也是废话」:职业对口 / 和收藏的同类 / 和投过的同类三码不进表(服务端照算,这里不出)。
 * 同日 Frank「能走 AAIP 雇主担保,这个是 通道名吗」:项目总名不是通道名、又和通道列重复,省提名那码也不进表。
 * 2026-11-07 Frank「现在都按 Azure 的来」:每条推荐都要看得到为什么推 —— 职业对口 / 和收藏的同类 / 和投过的同类 / 能走省提名
 * 四码进表(只有这几码的推荐原先一枚胶囊都不出)。
 */
export const WHY_KEYS: Record<string, string> = {
  /**
   * 能走省提名(本省 offer 类通道近 90 天抽过;2026-11-07 进表)。
   */
  pnp: 'mj.why.pnp',

  /**
   * 薪资高于本省同职业中位(带百分比)。
   */
  wage: 'mj.why.wage',

  /**
   * 雇主办过 LMIA 外劳名额(2026-10-12 Frank「整点有吸引力的 bullets」)。
   */
  lmia: 'mj.why.lmia',

  /**
   * 符合 EE 定向类别。
   */
  ee: 'mj.why.ee',

  /**
   * AIP 指定雇主。
   */
  aip: 'mj.why.aip',

  /**
   * 社区试点指定雇主(2026-10-12 Frank「现在有数据能知道 这个雇主愿不愿意帮忙 弄 pr 吗」「知名公司 也算 一个吧」)。
   */
  pilot: 'mj.why.pilot',

  /**
   * 知名公司(有维基词条)。
   */
  known: 'mj.why.known',

  /**
   * 档案「想做的工作」同组(2026-11-07 进表)。
   */
  occ: 'mj.why.occ',

  /**
   * 和收藏过的岗同组(2026-11-07 进表)。
   */
  saved: 'mj.why.saved',

  /**
   * 和真发出去的投递同组(2026-11-07 进表)。
   */
  applied: 'mj.why.applied',
}

/**
 * 理由码:薪资高于中位(这一条带百分比,没有百分比时换不带数的词条)。
 */
export const WHY_WAGE = 'wage'

/**
 * 薪资高于中位、但没有百分比时的词条。
 */
export const WHY_WAGE_PLAIN_KEY = 'mj.why.wagePlain'

/**
 * 推荐原因胶囊的档(tag 桶 ok:绿;2026-10-12「bullets 都改成 简洁的胶囊」)。
 */
export const WHY_TAG = 'ok'

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
