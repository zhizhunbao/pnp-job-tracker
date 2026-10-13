/**
 * myjobs 桶的子桶 recommend —— 「我的求职」今日推荐这一节:常量(与父桶同值的各自抄)。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:原先按函数长相切的 cos / why / ask / today 四个子桶撤掉 ——
 * 删除确认、公司名懒翻三张表都用,回父桶;推荐原因、通道名、显示更多 / 打码行、推荐取数与「删除」(不再推)是「今日推荐」这一节,
 * 并成本子桶(判据同 prefs / thread:页面上的一节)。依赖只许父桶 → 子桶,子桶不取父桶,常量各自抄、形状本桶自声明。
 *
 * @author Frank
 * @time 2026-10-12 22:00:00
 */

/**
 * 推荐理由码 → bullet 词条(2026-10-12 Frank「还是需要一个 推荐原因的列 然后 bullets 显示 好处」:理由胶囊当天撤、改「通道」列,看了实拍又要回「推荐原因」列,
 * 改一行一条 bullet、按好处写;顺序由服务端定;认不得的码不出)。
 * 同日 Frank「职业对口 也是废话」:职业对口 / 和收藏的同类 / 和投过的同类三码不进表(服务端照算,这里不出)。
 * 同日 Frank「能走 AAIP 雇主担保,这个是 通道名吗」:项目总名不是通道名、又和通道列重复,省提名那码也不进表。
 */
export const WHY_KEYS: Record<string, string> = {
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
 * 打码行职位格上的标记选择器(量第一条打码行上沿用;2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」)。
 */
export const LOCK_SEL = '[data-lock]'

/**
 * 一行的外框选择器(网页表格行 / 手机卡)。
 */
export const ROW_SEL = 'tr, [data-row]'

/**
 * 今日推荐接口(2026-10-10 批 2;后接 `?prov=` 浏览器按时区预选的省码)。
 */
export const URL_PICKS = '/api/myjobs/picks?prov='

/**
 * 今日推荐接口「不用当天缓存、现算一份」的尾巴(2026-10-11「进我的求职先弹五题」:答完档案重拉要按新答案推)。
 */
export const URL_PICKS_FRESH = '&fresh=1'

/**
 * 今日推荐「删除」接口(2026-10-12 操作列加「删除」;后接职位 id;这一岗以后不再推)。
 */
export const URL_PICKS_DEL = '/api/myjobs/picks?id='

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 取消收藏的请求方法。
 */
export const METHOD_DELETE = 'DELETE'
