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

/**
 * 未选中白底(镜像 .chip 的 background)。
 */
export const CHIP_BG_OFF = '#fff'

/**
 * 选中白字(镜像 .active 的 color;和上面同值不同格 —— 各镜像各的 css 声明)。
 */
export const CHIP_C_ON = '#fff'

/**
 * 强调红描边(镜像 .hot 的 border)。
 */
export const CHIP_BORDER_HOT = '1px solid #fecaca'

/**
 * 强调红字(镜像 .hot 的 color)。
 */
export const CHIP_C_HOT = '#b91c1c'

/**
 * 未选中描边(镜像 .chip 的 border)。颜色走 `var(--border)` 而不写死灰值:
 * 边框色的真值在 main.css 的 `:root`,那边一改这里跟着变,不必回来对第二遍。
 */
export const CHIP_BORDER_OFF = '1px solid var(--border)'

/**
 * 未选中字色(镜像 .chip 的 color)。`--text2` 是次级文字色 ——
 * 未选中的药丸说的是「可以选」不是「当前是」,比正文淡一档才不跟内容抢眼。
 */
export const CHIP_C_OFF = 'var(--text2)'

/**
 * 选中描边(镜像 .active 的 border-color,补全成 border 简写:
 * 行内样式没有基座类打底,宽度与线型得自己带上)。
 * 与底色同取主色 —— 选中态是一整块实心主色,描边只把边缘补齐,不另起第二个颜色。
 */
export const CHIP_BORDER_ON = '1px solid var(--primary)'

/**
 * 选中底色(镜像 .active 的 background)。主色实底 ——
 * 选中靠**面积**说话,一排药丸里扫一眼就挑得出当前选的那个;
 * 只换描边的话在手机上几乎看不出来。
 */
export const CHIP_BG_ON = 'var(--primary)'

/**
 * 药丸内衬(镜像 .chip 的 padding):上下 4px、左右 12px。
 * 横向是纵向的三倍,是全圆角(见 CHIP_RADIUS)要的:横竖一样宽,999 的圆角会把它啃成一个圆坨;
 * 只有横向留足,两端的半圆之间才留得下一段直边 —— 那才是药丸形。
 */
export const CHIP_PADDING = '4px 12px'

/**
 * 悬停光标(镜像 .chip 的 cursor)。Chip 与 Tag 的分界就是「可不可点」(见 chip.tsx 头注),
 * 而药丸本身没有按钮长相 —— 手型是它唯一的可点提示。
 */
export const CHIP_CURSOR = 'pointer'

/**
 * 药丸文字永不折行(镜像 .chip 的 white-space)。一折行药丸就撑成两行高,
 * 同排的其他药丸跟着高低不齐;宁可横向溢出交给容器滚,也不许一颗把整条筛选带顶开。
 */
export const CHIP_WHITE_SPACE = 'nowrap'

/**
 * className 之间的分隔符。DOM 的 class 属性按**空白**切词,拼多个类只能用空格 ——
 * 换成逗号或加号会被浏览器当成一整个类名,整条样式静默失效。
 */
export const CLS_SEP = ' '
