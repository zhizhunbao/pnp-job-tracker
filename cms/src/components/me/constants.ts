/**
 * me 域的死值(「我的」页框架;2026-11-07 照 Fluent 2 / Azure 重做,docs/design/我的/我的框架-20261107.md)。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */

/**
 * 左侧导航的五项,按显示顺序:节键 + 文字词条(词条沿用各节原有的标题词,一语一处)。
 */
export const ME_SECS = [
  {
    /**
     * 我的求职。
     */
    sec: 'sjobs',

    /**
     * 「我的求职」。
     */
    labelKey: 'sj.title',
  },
  {
    /**
     * 收件箱。
     */
    sec: 'inbox',

    /**
     * 「收件箱」。
     */
    labelKey: 'ib.title',
  },
  {
    /**
     * 我的简历。
     */
    sec: 'resume',

    /**
     * 「我的简历」。
     */
    labelKey: 'rm.arch.title',
  },
  {
    /**
     * 我的档案。
     */
    sec: 'profile',

    /**
     * 「我的档案」。
     */
    labelKey: 'pf.title',
  },
  {
    /**
     * 我的订阅。
     */
    sec: 'sub',

    /**
     * 「我的订阅」。
     */
    labelKey: 'sub.title',
  },
] as const

/**
 * 带红色未读数的那一项(收件箱:雇主回信没读的封数)。
 */
export const SEC_COUNTED = 'inbox'

/**
 * 「我的」二字的词条:抽屉标题与整块导航的无障碍名(顶栏「我的」同一个词)。
 */
export const ME_TITLE_KEY = 'nav.mine'

/**
 * 认不出的节的文字(空;五节之外的键走不到这里,留一格兜住类型)。
 */
export const LABEL_NONE = ''

/**
 * 不带红点的项的计数值。
 */
export const COUNT_NONE = 0

/**
 * 定制样式钮的统一底座:ghost 底最素,视觉全由本域的加倍类定形(与 nav / tag 桶同名同义,各家一份)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 收件箱那一节的键(收件箱一页自己出页标题,带转发开关)。
 */
export const SEC_INBOX = 'inbox'

/**
 * 默认落在哪一节(2026-10-08 照 AIApply 重设计:默认「我的求职」)。
 */
export const SEC_DEFAULT = 'sjobs'

/**
 * 旧深链里「我的收藏」的节键:收藏表已并进「我的求职」,带它来的落「我的求职」。
 */
export const SEC_FAVS_OLD = 'favs'

/**
 * 深链查询参数:`?sec=` 直落对应节(账户下拉、通知邮件)。
 */
export const QP_SEC = 'sec'

/**
 * Stripe 付款回跳带的参数名(`?ok=1`)。
 */
export const QP_OK = 'ok'

/**
 * Stripe 付款回跳「成功」的值。
 */
export const QP_OK_ON = '1'

/**
 * 当前登录用户接口。
 */
export const URL_ME = '/api/users/me'

/**
 * 收件箱未读数接口。
 */
export const URL_INBOX_COUNT = '/api/inbox/count'

/**
 * 收件箱读了一封后抛的事件名(子桶 inbox 抛,这里听着重拉未读数)。
 */
export const EV_INBOX_UNREAD = 'inbox:unread'

/**
 * fetch 带 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * 没登录时去的登录入口(全站登录只有一个:首页弹框)。
 */
export const LOGIN_URL = '/?login=1'

/**
 * 登录入口后接的回跳参数头。
 */
export const NEXT_SEP = '&next='

/**
 * 右上角提示:成功档(付款成功、投递发出)。
 */
export const TOAST_OK = 'ok'

/**
 * 付款成功那句的词条。
 */
export const PAY_OK_KEY = 'acct.payOk'

/**
 * 「已发给 <公司>」那句的词条。
 */
export const SENT_NOTICE_KEY = 'mj.sentTo'

/**
 * 空串(判空、清地址栏参数时 replaceState 的标题位)。
 */
export const TEXT_NONE = ''

/**
 * 未读数拉不到时按 0 读(数字不出,不冒充)。
 */
export const UNREAD_NONE = 0

/**
 * 「我的求职」那一节的键。
 */
export const SEC_SJOBS = 'sjobs'

/**
 * 「我的简历」那一节的键。
 */
export const SEC_RESUME = 'resume'

/**
 * 「我的档案」那一节的键。
 */
export const SEC_PROFILE = 'profile'

/**
 * 「我的订阅」那一节的键。
 */
export const SEC_SUB = 'sub'
