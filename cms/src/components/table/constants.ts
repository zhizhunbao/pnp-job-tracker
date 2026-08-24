/**
 * table 域的死值:拖列与量宽的几个门槛数。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */

/**
 * 拖列宽下限(px)—— 再窄列头字都挤没了。
 */
export const COL_W_MIN = 60

/**
 * 拖列起点兜底宽(px):th 还没量到宽时用。
 */
export const COL_W_FALLBACK = 100

/**
 * 量宽百分比小数位(锁列用:auto 量真实宽 → 换算百分比锁 fixed 布局)。
 */
export const PCT_DECIMALS = 3

/**
 * 量宽签名的列间分隔符(列 key 拼串比对;数据换了才重量)。
 */
export const SIG_SEP = '|'

/**
 * 量宽签名里列串与行数的分界。
 */
export const SIG_TAIL = '#'

/**
 * 排序标记:降序。
 */
export const MARK_DESC = ' ▼'

/**
 * 排序标记:升序。
 */
export const MARK_ASC = ' ▲'

/**
 * 排序标记:本列可排但未排(灰提示)。
 */
export const MARK_HINT = ' ⇅'

/**
 * 单元格空值兜底(取不到值时显示,同 row 域口径)。
 */
export const EMPTY_MARK = '—'

/**
 * 指针移动事件名(拖列宽:按下后在窗口级跟手,平台定值)。
 */
export const EV_POINTERMOVE = 'pointermove'

/**
 * 指针松开事件名(拖列宽收尾)。
 */
export const EV_POINTERUP = 'pointerup'

/**
 * 对齐档:右(数字列;缺省左)。
 */
export const ALIGN_RIGHT = 'right'
