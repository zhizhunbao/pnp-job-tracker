/**
 * modal 域的死值:弹框规范(2026-07-05 用户拍板:全站弹框格式布局一致,遮罩不带毛玻璃;
 * 规范:遮罩 rgba(17,24,39,.5) · 圆角 14 · 阴影/关闭钮/内边距统一 · 普通层 z=50、叠加层 z=60)。
 *
 * SCRIM/CARD/iconBtnS 三个 style 对象是**跨弹框族的过渡导出**(as const 免库类型注解):
 * 39 处消费端(Advisor/Decision/Case…)还在 spread 它们拼运行时样式 —— 各消费域
 * 形制化批里逐个类化,届时这三个常量退役(2026-08-24 modal 域刀 A 记)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 弹框圆角(规范值)。
 */
export const MODAL_RADIUS = 14

/**
 * 弹框投影(规范值)。
 */
export const MODAL_SHADOW = '0 24px 60px rgba(0,0,0,.3)'

/**
 * 遮罩规范(fixed 全屏 + 半透黑;不带毛玻璃是拍板)。
 */
export const SCRIM = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(17,24,39,.5)',
} as const

/**
 * 白卡规范(圆角/投影/内滚动收敛)。
 */
export const CARD = {
  position: 'relative',
  background: '#fff',
  borderRadius: MODAL_RADIUS,
  boxShadow: MODAL_SHADOW,
  overscrollBehavior: 'contain',
} as const

/**
 * 窗口图标钮规范(全屏/关闭/自定义动作三颗一样大才叫一排)。
 */
export const iconBtnS = {
  border: 'none',
  background: '#f3f4f6',
  borderRadius: 8,
  width: 30,
  height: 30,
  fontSize: 16,
  color: '#6b7280',
  cursor: 'pointer',
  lineHeight: 1,
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

/**
 * 窄屏断点(E8-03 单一来源:≤640px 弹窗一律全屏)。
 */
export const NARROW_BP = 640

/**
 * 普通弹框层级。
 */
export const Z_MODAL = 50

/**
 * eyebrow 场景色默认(靛蓝;JS 读的默认参数,按 css/constants 分界归这边 ——
 * 具体场景色由调用方 prop 传,经 --eyebrow-c 变量进 css)。
 */
export const EYEBROW_C_DEFAULT = '#6366f1'

/**
 * 拖拽豁免目标(闭包选择器):按在这些交互件上不算抓 header ——
 * 否则点按钮/选字/选 occ 药丸都会把整框拖走。
 */
export const DRAG_IGNORE_SEL = 'button, input, select, textarea, a, label, .occPill, .occSelectedChip'

/**
 * 三档宽默认档。
 */
export const SIZE_DEFAULT = 'md'

/**
 * 全屏钮两态的 i18n 键:放大。
 */
export const MAX_KEY = 'cw.max'

/**
 * 全屏钮两态的 i18n 键:还原。
 */
export const RESTORE_KEY = 'cw.restore'

/**
 * 关闭钮的 aria-label(上线以来就是英文死值;要不要走 i18n 待 Frank 拍,先归位常量)。
 */
export const CLOSE_ARIA = 'close'
