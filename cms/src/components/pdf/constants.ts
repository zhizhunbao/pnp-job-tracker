/**
 * pdf 桶的死值:pdf.js 逐页画原件(2026-11-07 自 account 桶在新域重写,值逐个照抄)。
 * 与「我的简历」同值的几条各自抄(2026-11-07 先写成 me 桶 resume 的子桶,投递框也要用,为破 apply 与 me 互取的环提成顶层通用桶)。
 * 2026-11-12 撤掉翻页、缩放、拖动一族的值(Frank「全站的简历都应该是默认铺满当前的吧」「这个不嵌入一个框呢?」「也别翻页」)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 空串(原件地址为空 = 不画)。
 */
export const TEXT_NONE = ''

/**
 * 一页一张画布的标签名。
 */
export const CANVAS_TAG = 'canvas'

/**
 * 量 PDF 原始宽度用的缩放(1 = 原尺寸,再按容器宽度算真缩放)。
 */
export const PAGE_BASE_SCALE = 1

/**
 * 画布最长边的像素上限(宽栏 × 高清屏会到四五千像素,手机内存吃不消)。
 */
export const PAGE_PX_MAX = 4096

/**
 * 容器变宽多少才重画:要的像素宽超过已有画布像素宽的这个倍数才画(变窄、只宽一点都不画,浏览器拉伸已有画面就够清楚)。
 */
export const REDRAW_RATIO = 1.1

/**
 * 容器宽度停下多久后按新宽度重画(毫秒;拉窗口途中只拉伸已有画面,停了再画清楚)。
 */
export const REDRAW_SETTLE_MS = 200

/**
 * 头一次画不用等(毫秒)。
 */
export const DRAW_NOW_MS = 0
