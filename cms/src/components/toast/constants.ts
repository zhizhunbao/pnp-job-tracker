/**
 * toast 组件桶的常量:右上角提示(2026-10-11 批 5「提示统一 + 顶栏铃铛」,Frank「所有的消息 是不是应该统一放到一个地方显示」,
 * 照 Azure 门户:操作结果先在右上角弹一张卡、几秒后自己收,留底归顶栏铃铛)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */

/**
 * 提示总线的事件名(全站任何地方 toast() 发,骨架上的 ToastHost 收)。
 */
export const EV_TOAST = 'offer2pr:toast'

/**
 * 同时最多叠几张(再来一张挤掉最早那张)。
 */
export const TOAST_MAX = 3

/**
 * 一张提示停留多久自己收(毫秒)。
 */
export const TOAST_TTL_MS = 5000

/**
 * 成功一档。
 */
export const TOAST_OK = 'ok'

/**
 * 提醒一档(做成了一半,比如存上了但确认信没发出)。
 */
export const TOAST_WARN = 'warn'

/**
 * 出错一档(只给不用改哪一格的错;要改某一格的错照旧贴在那一格旁边)。
 */
export const TOAST_ERR = 'err'

/**
 * 没有副行(空串)。
 */
export const DETAIL_NONE = ''

/**
 * 提示区的读屏角色:状态播报(不抢焦点)。
 */
export const ROLE_STATUS = 'status'

/**
 * 提示区的播报档:等读屏读完手上的再报。
 */
export const ARIA_POLITE = 'polite'

/**
 * 关闭钮的读屏名(与 modal 桶的 CLOSE_ARIA 同值,各域自抄)。
 */
export const CLOSE_ARIA = 'close'

/**
 * 关闭钮用最素的钮底(视觉全由本域的类定形;与 modal 的 PLAIN_BTN_KIND 同值)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 拼类名的分隔符(class 属性按空白切词)。
 */
export const CLS_SEP = ' '
