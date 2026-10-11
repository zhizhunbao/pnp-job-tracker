/**
 * inbox 组件桶的常量(2026-10-10 批 3「收件箱」,docs/design/我的/我的求职-20261009.md 1.5 / 2.5):
 * 接口地址、事件名、钮档与分区卡类名。对应 lib 域:inbox。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

/**
 * 收件箱接口(专属地址、转发开关、收到的信)。
 */
export const URL_INBOX = '/api/inbox'

/**
 * 转发开关接口(PATCH)。
 */
export const URL_PREFS = '/api/inbox/prefs'

/**
 * 读了一封(POST)。
 */
export const URL_READ = '/api/inbox/read'

/**
 * 站内回信(POST)。
 */
export const URL_REPLY = '/api/inbox/reply'

/**
 * 收件箱某一封的深链参数(`?sec=inbox&msg=<信 id>`;转发信里的「Open in Offer2PR」走这个)。
 */
export const P_MSG = 'msg'

/**
 * 未读数变了(读了一封):页签红点重拉(account 桶听这个名,值各域自抄)。
 */
export const EV_UNREAD = 'inbox:unread'

/**
 * fetch 的凭据档:同源带 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * POST 方法字。
 */
export const METHOD_POST = 'POST'

/**
 * PATCH 方法字。
 */
export const METHOD_PATCH = 'PATCH'

/**
 * 请求体类型头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * json 请求体的媒体类型。
 */
export const MIME_JSON = 'application/json'

/**
 * 发信没配置的状态码(回信接口 503 = 发信还没开通)。
 */
export const ST_UNAVAILABLE = 503

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 白卡分区的全局类名(main.css 第 9 段;myjobs / apply 同值,各域自抄)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 分区小标题的全局类名(main.css 第 9 段;同上)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 「回复」钮档(主钮)。
 */
export const REPLY_KIND = 'primary'

/**
 * 「打开这次投递」「取消」钮档(带框次钮)。
 */
export const SUB_KIND = 'secondary'

/**
 * 复选框的 input 类型。
 */
export const INPUT_CHECKBOX = 'checkbox'

/**
 * 首字母块最多几个字母。
 */
export const INITIALS_MAX = 2

/**
 * 名字切词(空白、点、下划线、连字符)。
 */
export const WORD_SPLIT_RE = /[\s._-]+/

/**
 * 地址里的 @。
 */
export const AT = '@'

/**
 * 清单日期:'YYYY-MM-DD HH:mm' 里月-日那一段的起点。
 */
export const MD_FROM = 5

/**
 * 清单日期:月-日那一段的终点。
 */
export const MD_TO = 10

/**
 * 发件人名与地址之间(阅读区那一行)。
 */
export const ADDR_L = ' <'

/**
 * 地址的右尖括号。
 */
export const ADDR_R = '>'

/**
 * 回信框文字区的行数。
 */
export const REPLY_ROWS = 8

/**
 * 回信正文上限(同 lib/inbox 的 REPLY_MAX,各域自抄)。
 */
export const REPLY_MAX = 10000

/**
 * 阅读框 / 回信框的尺寸记忆键(10-09 Frank「所有弹框 都能放大缩小 拖动,保持一致」:与投递框、职位 / 公司弹框共用一份;各域自抄)。
 */
export const MODAL_PREF = 'adv_modal_pref'

/**
 * 弹框没有记忆时的宽(px)。
 */
export const MODAL_W = 900

/**
 * 弹框没有记忆时的高(px)。
 */
export const MODAL_H = 760

/**
 * 清单一行(整行一颗钮)的钮档:ghost 素底,视觉全由本桶的加倍类定形(样板 account/PLAIN_BTN_KIND)。
 */
export const PLAIN_KIND = 'ghost'
