/**
 * notify 组件桶的常量:顶栏通知铃铛(2026-10-11 批 5「提示统一 + 顶栏铃铛」,Frank「所有的消息 是不是应该统一放到一个地方显示」,
 * 照 Azure 门户的 Notifications:铃铛带红色未读数,点开一张挂在钮下的面板,新的在前,一条一行 + 时刻)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */

/**
 * 通知清单接口头(后接预选省码;今日推荐按它算,同「我的求职」)。
 */
export const URL_NOTIFY = '/api/notify?prov='

/**
 * 「看过了」接口。
 */
export const URL_SEEN = '/api/notify/seen'

/**
 * 带上会话 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * 写接口的方法。
 */
export const METHOD_POST = 'POST'

/**
 * 通知种类:雇主回信。
 */
export const KIND_REPLY = 'reply'

/**
 * 通知种类:退信。
 */
export const KIND_BOUNCED = 'bounced'

/**
 * 通知种类:已发出。
 */
export const KIND_SENT = 'sent'

/**
 * 通知种类:今日推荐更新了。
 */
export const KIND_PICKS = 'picks'

/**
 * 每种通知的一句(i18n 键;回信 / 退信 / 已发出带公司名 {co},今日推荐带条数 {n})。
 */
export const KIND_TEXT_KEY: Record<string, string> = {
  /**
   * 雇主回信。
   */
  reply: 'nt.reply',

  /**
   * 退信。
   */
  bounced: 'nt.bounced',

  /**
   * 已发出。
   */
  sent: 'nt.sent',

  /**
   * 今日推荐。
   */
  picks: 'nt.picks',
}

/**
 * 雇主回信去处:收件箱选中那一封(后接信 id)。
 */
export const HREF_MSG_HEAD = '/account?sec=inbox&msg='

/**
 * 退信 / 已发出去处:「我的」页弹只读投递框(后接投递行 id)。
 */
export const HREF_APP_HEAD = '/account?app='

/**
 * 今日推荐去处:「我的」页(默认落「我的求职」,推荐在最上面)。
 */
export const HREF_PICKS = '/account'

/**
 * 红色数字最多显示到几,再多写「9+」。
 */
export const BADGE_MAX = 9

/**
 * 红色数字不出(空串)。
 */
export const BADGE_NONE = ''

/**
 * 红色数字超了的写法后缀。
 */
export const BADGE_OVER = '+'

/**
 * 铃铛钮与面板里每一条用最素的钮底(视觉全由本域的类定形;与 modal 的 PLAIN_BTN_KIND 同值)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 时刻显示到分(time 桶的粒度档)。
 */
export const GRAIN_MINUTE = 'minute'

/**
 * 面板的读屏角色:对话区(非模态)。
 */
export const ROLE_DIALOG = 'dialog'

/**
 * 拼类名的分隔符。
 */
export const CLS_SEP = ' '
