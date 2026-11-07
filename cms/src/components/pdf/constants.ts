/**
 * pdf 桶的死值:pdf.js 逐页画原件、预览缩放(2026-11-07 自 account 桶在新域重写,值逐个照抄)。
 * 与「我的简历」同值的几条各自抄(2026-11-07 先写成 me 桶 resume 的子桶,投递框也要用,为破 apply 与 me 互取的环提成顶层通用桶)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 空串(原件地址为空 = 不画)。
 */
export const TEXT_NONE = ''

/**
 * 类名之间的空格。
 */
export const CLS_SEP = ' '

/**
 * 预览弹框里一页一张画布的标签名。
 */
export const CANVAS_TAG = 'canvas'

/**
 * 开框先露第几页(第一页就够认出是哪份)。
 */
export const THUMB_PAGE = 1

/**
 * 量 PDF 原始宽度用的缩放(1 = 原尺寸,再按画布宽度算真缩放)。
 */
export const THUMB_BASE_SCALE = 1

/**
 * 预览缩放下限(1 = 整页放得下的大小;2026-10-06 Frank「这个可以鼠标滚动放大缩小吧」「可以,做吧」)。
 */
export const ZOOM_MIN = 1

/**
 * 预览缩放上限(3 倍看得清小字)。
 */
export const ZOOM_MAX = 3

/**
 * 「+ / −」钮点一下的倍率。
 */
export const ZOOM_STEP = 1.25

/**
 * 鼠标滚轮换算缩放的系数:倍率 = e^(−deltaY × 系数);滚一格 deltaY 约 100,约放大 1.2 倍。
 */
export const ZOOM_WHEEL_K = 0.002

/**
 * 触控板双指捏合的系数(浏览器把它报成带 ctrlKey 的滚轮,deltaY 只有个位数,系数要大些)。
 */
export const ZOOM_PINCH_K = 0.01

/**
 * 缩放停下多久后按新倍数重画当前页(毫秒;缩放进行中只拉伸已有画面,停了再画清楚)。
 */
export const ZOOM_SETTLE_MS = 200

/**
 * 重画时画布最长边的像素上限(3 倍 × 高清屏会到四五千像素,手机内存吃不消)。
 */
export const ZOOM_PX_MAX = 4096

/**
 * 倍数换百分比。
 */
export const ZOOM_PCT = 100

/**
 * 百分号。
 */
export const PCT_SIGN = '%'

/**
 * 整页视图(倍数 1、不平移):开框、翻页、双击、点百分比都回到它。
 */
export const ZOOM_HOME = {
  /**
   * 倍数 1。
   */
  zoom: 1,

  /**
   * 不横移。
   */
  x: 0,

  /**
   * 不竖移。
   */
  y: 0,
}

/**
 * 滚轮事件名(要拦掉浏览器默认的滚动 / 整页缩放,只能原生挂、且不能是被动监听)。
 */
export const EV_WHEEL = 'wheel'

/**
 * 滚轮监听的选项:非被动,才能 preventDefault。
 */
export const WHEEL_OPTS = {
  /**
   * 非被动。
   */
  passive: false,
}

/**
 * 求中心用的除数(尺寸 / 2 = 中心;平移上限 = 放大多出来的一半)。
 */
export const CENTER_DIV = 2

/**
 * CSS 像素单位。
 */
export const PX = 'px'

/**
 * transform 串:平移开头。
 */
export const TF_HEAD = 'translate('

/**
 * transform 串:平移两个分量之间。
 */
export const TF_MID = 'px, '

/**
 * transform 串:平移收尾、缩放开头。
 */
export const TF_SCALE = 'px) scale('

/**
 * transform 串:收尾。
 */
export const TF_TAIL = ')'

/**
 * 缩放钮的钮档(白底描边,同弹框里的次钮)。
 */
export const ZOOM_KIND = 'secondary'
