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
 * 遮罩规范(fixed 全屏 + 半透黑;不带毛玻璃是拍板)。镜像 .scrim 类。
 */
export const SCRIM = {
  /**
   * 钉死在视口上。
   */
  position: 'fixed',

  /**
   * 四边贴 0 = 盖满全屏。
   */
  inset: 0,

  /**
   * 半透黑(50% 透明度的深灰蓝)。
   */
  background: 'rgba(17,24,39,.5)',
} as const

/**
 * 白卡规范(圆角/投影/内滚动收敛)。镜像 .card 类。
 */
export const CARD = {
  /**
   * 给卡内绝对定位的动作排当参照系。
   */
  position: 'relative',

  /**
   * 白底。
   */
  background: '#fff',

  /**
   * 规范圆角(值见 MODAL_RADIUS)。
   */
  borderRadius: MODAL_RADIUS,

  /**
   * 规范投影(值见 MODAL_SHADOW)。
   */
  boxShadow: MODAL_SHADOW,

  /**
   * 卡内滚到头不把滚动传给遮罩后面的页面。
   */
  overscrollBehavior: 'contain',
} as const

/**
 * 窗口图标钮规范(全屏/关闭/自定义动作三颗一样大才叫一排)。镜像 .iconBtn 类。
 */
export const iconBtnS = {
  /**
   * 无描边。
   */
  border: 'none',

  /**
   * 浅灰底。
   */
  background: '#f3f4f6',

  /**
   * 小圆角。
   */
  borderRadius: 8,

  /**
   * 钮宽(三颗一样大)。
   */
  width: 30,

  /**
   * 钮高。
   */
  height: 30,

  /**
   * 钮内字号(× 号)。
   */
  fontSize: 16,

  /**
   * 图标灰。
   */
  color: '#6b7280',

  /**
   * 可点手型。
   */
  cursor: 'pointer',

  /**
   * 行高压到 1,× 号才竖直居中。
   */
  lineHeight: 1,

  /**
   * 动作排挤的时候钮不许被压扁。
   */
  flexShrink: 0,

  /**
   * 行内弹性盒:图标居中用。
   */
  display: 'inline-flex',

  /**
   * 图标竖直居中。
   */
  alignItems: 'center',

  /**
   * 图标水平居中。
   */
  justifyContent: 'center',
} as const

/**
 * 窄屏断点(E8-03 单一来源:≤640px 弹窗一律全屏)。
 */
export const NARROW_BP = 640

/**
 * Esc 键的平台键名(KeyboardEvent.key 的定值,打错是静默失效所以起名)。
 */
export const KEY_ESC = 'Escape'

/**
 * 普通弹框层级。
 */
export const Z_MODAL = 50

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

/**
 * keydown 事件名(平台定值,打错是静默失效所以起名,下同)。
 */
export const EV_KEYDOWN = 'keydown'

/**
 * 媒体查询变化的事件名。
 */
export const EV_CHANGE = 'change'
