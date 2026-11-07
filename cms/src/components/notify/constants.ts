/**
 * notify 桶 的死值:顶栏通知铃铛(2026-10-11 批 5「提示统一 + 顶栏铃铛」,Frank「所有的消息 是不是应该统一放到一个地方显示」,
 * 照 Azure 门户的 Notifications:铃铛带红色未读数,点开一张挂在钮下的面板,新的在前)。
 * 2026-11-07 自 notify 桶在新域重写(Frank「全部在新域重写」,docs/design/我的/我的框架-20261107.md 1.7 / 2.6):
 * 接口、种类、红色数字照旧;每条改成「种类图标 + 一句 + 灰字『去<哪一页>,<时刻>』」,去处落到「我的」对应那一节。
 *
 * @author Frank
 * @time 2026-11-07 17:00:00
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
 * 每条第二行灰字的词条:「去{page},{at}」(page = 去处那一页的页名,at = 时刻)。
 */
export const GO_KEY = 'nt.go'

/**
 * 去处页名的词条:收件箱(雇主回信去这里;与左侧导航同一个词)。
 */
export const DEST_INBOX_KEY = 'ib.title'

/**
 * 去处页名的词条:我的求职(今日推荐、退信、已发出去这里;与左侧导航同一个词)。
 */
export const DEST_SJOBS_KEY = 'sj.title'

/**
 * 雇主回信去处:「我的」收件箱一节选中那一封(后接信 id;收件箱读 `?msg=` 深链)。
 */
export const HREF_MSG_HEAD = '/account?sec=inbox&msg='

/**
 * 退信 / 已发出去处:「我的求职」一节弹只读投递框(后接投递行 id;投递记录读 `?app=` 深链)。
 */
export const HREF_APP_HEAD = '/account?sec=sjobs&app='

/**
 * 今日推荐去处:「我的求职」一节(推荐在最上面)。
 */
export const HREF_PICKS = '/account?sec=sjobs'

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
 * 铃铛钮与面板里每一条用最素的钮底(视觉全由本子桶的类定形;与 modal 的 PLAIN_BTN_KIND 同值,各家一份)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 面板的读屏角色:对话区(非模态)。
 */
export const ROLE_DIALOG = 'dialog'

/**
 * 拼类名的分隔符。
 */
export const CLS_SEP = ' '
