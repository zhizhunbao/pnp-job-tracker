/**
 * modal 域的纯函数(零 JSX 零 hook):DOM 断言接缝、事件停传、
 * 类名与运行时样式的预算。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import {
  CLS_SEP, MAX_KEY, RESTORE_KEY, TRANSFORM_NONE,
} from './constants'
import type { CardStyleIn, ClsIn, ClsOut, ModalSize } from './types'
import css from './modal.module.css'

/**
 * DOM 事件目标 → 元素(EventTarget 是 DOM 的宽类型,capture/closest 要元素 ——
 * 跨边界断言收在这一个接缝里,组件体内不再散落 as)。
 *
 * @param t 事件目标。
 * @returns 元素。
 */
export function elOf(t: EventTarget | null): HTMLElement {
  return t as HTMLElement
}

/**
 * 事件停传(卡内点击不许冒到遮罩,否则点哪都算点外面关框)。
 *
 * @param e 鼠标事件。
 * @returns 无。
 */
export function stopClick(e: React.MouseEvent) {
  e.stopPropagation()
}

/**
 * 遮罩与白卡的类名预算:窄屏(sm 档留衬、其余全屏贴边)→ 全屏态 → 居中态(三档宽 +
 * 加高档 + 可拖给手势光标 + 拖中关过渡),pad=false 再叠免内衬。
 *
 * @param x 形态开关。
 * @returns 两条拼好的 className。
 */
export function clsOf(x: ClsIn): ClsOut {
  const narrowCard: Record<ModalSize, string> = {
    sm: cssOf(css.narrowSm),
    md: cssOf(css.narrowFull),
    lg: cssOf(css.narrowFull),
  }
  const narrowOverlay: Record<ModalSize, string> = {
    sm: cssOf(css.overlayNarrowSm),
    md: cssOf(css.overlayNarrowFull),
    lg: cssOf(css.overlayNarrowFull),
  }
  const sizeCls: Record<ModalSize, string> = {
    sm: cssOf(css.sm),
    md: cssOf(css.md),
    lg: cssOf(css.lg),
  }
  const card = [css.card]
  const overlay = [css.overlay]
  if (x.narrow) {
    card.push(narrowCard[x.size])
    overlay.push(narrowOverlay[x.size])
  } else if (x.maximized) {
    card.push(css.max)
  } else {
    card.push(css.center)
    card.push(sizeCls[x.size])
    if (x.tall) {
      card.push(css.tall)
    }
    if (x.draggable) {
      card.push(css.grab)
    }
    if (x.dragging) {
      card.push(css.dragging)
    }
  }
  if (x.pad === false) {
    card.push(css.noPad)
  }
  return { card: card.join(CLS_SEP), overlay: overlay.join(CLS_SEP) }
}

/**
 * 全屏钮标签的 i18n 键选择(全屏中显示「还原」)。
 *
 * @param maximized 是否全屏态。
 * @returns i18n 键。
 */
export function maxKeyOf(maximized: boolean): string {
  if (maximized) {
    return RESTORE_KEY
  }
  return MAX_KEY
}

/**
 * 居中态白卡的运行时样式预算:只剩拖拽位移进 transform —— 每帧连续变化的像素,
 * 类是有限枚举装不下它(三档宽/高上限/过渡开关全类化进 module.css 了)。
 * 窄屏与全屏态样式全在类里,返回空对象。
 * CSS 值整条留在体内:拆成 HEAD/MID/TAIL 三截之后就再没人看得出这是一条 translate3d,
 * 与「抽常量是为了看懂」正好相反。用 3d 而非 translate 是为了吃 GPU 合成层(拖动不触发重排)。
 *
 * @param x 形态与位移。
 * @returns 白卡的 style。
 */
export function cardStyleOf(x: CardStyleIn): React.CSSProperties {
  if (x.narrow || x.maximized) {
    return {}
  }
  let transform = TRANSFORM_NONE
  if (x.pos.x !== 0 || x.pos.y !== 0) {
    // eslint-disable-next-line local/no-bare-strings -- 见本函数 JSDoc:CSS 值不拆片
    transform = `translate3d(${x.pos.x}px, ${x.pos.y}px, 0)`
  }
  return { transform }
}

/**
 * 遮罩层类名(交给**自带壳**的重弹框用:Advisor / Decision 这类带拖拽全屏的面板
 * 不套 Modal 组件,但遮罩必须与全站同一份 —— 2026-08-24 弹框族批把它们从
 * `style={SCRIM}` 换成这个类,SCRIM 常量随之退役)。
 *
 * @returns 遮罩 className(半透黑全屏底;z-index 由调用方按层级给)。
 */
export function overlayCls(): string {
  return cssOf(css.overlay)
}
