/**
 * me 桶子桶 sub 的死值(「我的订阅」;2026-11-07 自 account 桶的订阅节与 myjobs 桶的新岗推送卡在新域重写,
 * 接口、事件名、词条照旧;要用的常量各自抄一份,不取父桶也不取旧桶)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 空串(判空、清空、免费态没有到期日)。
 */
export const TEXT_NONE = ''

/**
 * 拼 className 时各类之间的分隔符(HTML 的 class 按空白切词)。
 */
export const CLS_SEP = ' '

/**
 * fetch 带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 全站分区卡的全局类(main.css 的 .cardMd)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 分区卡卡头标题的全局类(main.css 的 .mcardHead)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 「我的订阅」Pro 档的标(本桶自抄,与 components/auth 的 PRO_LABEL 同字:产品名不翻)。
 */
export const PRO_LABEL = 'Pro'

/**
 * 免费档页标题右边那颗「升级 Pro」的钮档(这一页唯一的主行动,蓝底)。
 */
export const UPGRADE_BTN_KIND = 'primary'

/**
 * Pro 档页标题右边那颗「续买」的钮档(已付费,续买不抢眼:白底描边;沿用 2026-10-08 方案卡的口径)。
 */
export const RENEW_BTN_KIND = 'secondary'

/**
 * 「当前方案」里「还剩 N 天」胶囊的档(tag 桶 ok:绿)。
 */
export const LEFT_TAG = 'ok'

/**
 * 「Pro 包含」五条(2026-10-08;与定价框 PRO_PERKS 同一套词条,各域各抄一份;只出名字不出说明句 ——
 * Frank 10-07「不需要解释性文字」)。
 * 2026-11-09 Frank 权益清单按额度规则重写:旧五条撤,换成两条(与定价框 PRO_PERKS 同步)。
 */
export const PERK_KEYS = ['price.perk.tailor', 'price.perk.regen']

/**
 * 付款记录接口(按本人的 Stripe 客户 id 懒查,不落库;2026-10-08)。
 */
export const URL_PAYMENTS = '/api/stripe/payments'

/**
 * 按职位改写额度的接口(2026-11-09 Frank「我的订阅 显示剩余额度」)。
 */
export const URL_CREDIT = '/api/apply/credit'

/**
 * 额度档:会员(与 lib/apply/credit 的 PLAN_PRO 同值,各域自抄)。
 */
export const PLAN_PRO = 'pro'

/**
 * 付款记录表:日期列键。
 */
export const PAY_COL_DATE = 'date'

/**
 * 付款记录表:内容列键。
 */
export const PAY_COL_ITEM = 'item'

/**
 * 付款记录表:金额列键。
 */
export const PAY_COL_AMOUNT = 'amount'

/**
 * 付款记录表:操作列键(收据)。
 */
export const PAY_COL_ACT = 'act'

/**
 * 金额保留的小数位。
 */
export const AMOUNT_DIGITS = 2

/**
 * 货币码 → 显示前缀(Stripe 给小写码;表里没有的用大写码加空格)。
 */
export const CUR_SIGN: Record<string, string> = {
  /**
   * 加元(2026-11-09 Frank:站内会员价格金额只写 $,不出现 CA$)。
   */
  cad: '$',

  /**
   * 美元。
   */
  usd: 'US$',
}

/**
 * 表里没有的货币码,码与数之间的空格。
 */
export const CUR_GAP = ' '

/**
 * 「收据」钮的钮档(白底描边)。
 */
export const RECEIPT_BTN_KIND = 'secondary'

/**
 * 收据新标签页打开(外站链接)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 没有收据时操作格的横杠(同职位板空格)。
 */
export const DASH = '—'

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
 * 推送频率下拉的两档(「不发」是下拉的空值档)。
 */
export const PUSH_FREQS = ['daily', 'weekly'] as const

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
 * 邮箱框最长多少字。
 */
export const EMAIL_MAX = 254

/**
 * 「保存」的钮档(2026-10-12 Frank「这部分是不是太靠左了。是不是调大一些放中间,参考一下 indeed」:主钮蓝底,照 Indeed 订阅钮)。
 */
export const SAVE_KIND = 'primary'

/**
 * 右上角提示:成功档(与 toast 桶同值,各域自抄;2026-10-11 批 5:存设置后的那一句从卡里挪到右上角)。
 */
export const TOAST_OK = 'ok'

/**
 * 右上角提示:提醒档(存上了、确认信没发出)。
 */
export const TOAST_WARN = 'warn'

/**
 * 右上角提示:出错档(没存上;邮箱格式不对那句照旧贴在邮箱框下面)。
 */
export const TOAST_ERR = 'err'
