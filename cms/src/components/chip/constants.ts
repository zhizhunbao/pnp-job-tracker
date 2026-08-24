/**
 * chip 域的死值(全部是 chipStyle 过渡导出的镜像值 —— 与 chip.module.css 的类逐格相等,
 * 消费页类化、chipStyle 退役时本文件一起删)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 药丸全圆角(999 = 足够大就是全圆;镜像 .chip 的 border-radius)。
 */
export const CHIP_RADIUS = 999

/**
 * 药丸字号(镜像 .chip 的 font-size)。
 */
export const CHIP_FONT_SIZE = 12.5

/**
 * 未选中字重(镜像 .chip 的 font-weight)。
 */
export const FONT_WEIGHT_OFF = 400

/**
 * 选中字重(镜像 .active 的 font-weight)。
 */
export const FONT_WEIGHT_ON = 600
