/**
 * review 子桶 pick 的死值(与 review 的同名常量同值,各自抄一份)。
 *
 * @author Frank
 * @time 2026-11-11 23:30:00
 */

/**
 * 没选中(也是无依据句子那种没有序号的高亮的序号)。
 */
export const NUM_NONE = 0

/**
 * 按序号找这一条的任意一块高亮的选择器头(每一块都带 data-q;data-n 只有句头那块带)。
 */
export const SEL_Q_HEAD = '[data-q="'

/**
 * 属性选择器的尾。
 */
export const SEL_N_TAIL = '"]'
