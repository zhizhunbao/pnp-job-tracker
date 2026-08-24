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
