/**
 * points 域的子桶 provinces 的桶门 —— 省级打分机制,一省一个省码目录。
 * 规矩(2026-11-12 Frank 定):通用省表(core 的 scoreProvince)装不下、要手写时才开 provinces/<省码>/;
 * 艾伯塔、不列颠哥伦比亚、纽芬兰与拉布拉多、安大略、萨斯喀彻温全走通用表,没有目录。门里只有转发。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

export { estimateMbEoi } from './mb'
export type { MbEduKey, MbEoiScore, MbProfile } from './mb'
