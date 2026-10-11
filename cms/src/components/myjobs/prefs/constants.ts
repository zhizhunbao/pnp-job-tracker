/**
 * myjobs 子桶 prefs 的常量(2026-10-10 批 2「新岗推送」卡:拉 / 存「把推荐和收藏动态发到邮箱」的频率与收件邮箱)。
 * 父桶 functions.ts 逼近 1000 行闸,按关注点切出这一族(照 apply/letter 子桶首例);依赖只许父桶 → 子桶(经本目录 index.ts),
 * 子桶不取父桶任何东西,要用的常量各自抄、形状本桶自声明。卡本身(push.tsx)仍住父桶(拼父桶的分区卡与样式)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */

/**
 * 新岗推送设置接口(GET 读 / POST 存)。
 */
export const URL_PUSH = '/api/alerts/prefs'

/**
 * 存设置的请求方法。
 */
export const METHOD_POST = 'POST'

/**
 * 请求头名:请求体的媒体类型。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * json 请求体的媒体类型。
 */
export const MIME_JSON = 'application/json'

/**
 * 存推送设置的统计事件名:沿用原周报开关的 'weekly-optin'(E5-07 §3.4 漏斗第 3 步;第一方漏斗白名单里已有这个名),
 * on = 存的频率是不是「不发」以外的档(2026-10-10 批 2:周报开关 WeeklyOptin 由「新岗推送」卡接替)。
 */
export const EV_PUSH = 'weekly-optin'

/**
 * 推送频率:不发(接口里的值;下拉里是空串)。
 */
export const FREQ_OFF = 'off'

/**
 * 推送频率 → 词条。
 */
export const FREQ_KEYS: Record<string, string> = {
  /**
   * 每天。
   */
  daily: 'mj.freqDaily',

  /**
   * 每周。
   */
  weekly: 'mj.freqWeekly',
}

/**
 * 存设置的结果:新邮箱待确认。
 */
export const PUT_PENDING = 'pending'

/**
 * 存设置的结果:确认信没发出去。
 */
export const PUT_MAIL = 'mail'

/**
 * 存设置的错误码:邮箱格式不对。
 */
export const E_EMAIL = 'email'

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 邮箱框最长多少字。
 */
export const EMAIL_MAX = 254

/**
 * 空串(没有链接 / 没有字样)。
 */
export const TEXT_NONE = ''
