/**
 * modal 域的纯函数(零 JSX 零 hook):DOM 断言接缝、事件停传、
 * 类名与运行时样式的预算。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { MAX_KEY, RESTORE_KEY } from './constants'
import type { CardStyleIn, ClsIn, ClsOut } from './types'
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
  const card = [css.card]
  const scrim = [css.scrim]
  if (x.narrow) {
    if (x.size === 'sm') {
      card.push(css.narrowSm)
      scrim.push(css.scrimNarrowSm)
    } else {
      card.push(css.narrowFull)
      scrim.push(css.scrimNarrowFull)
    }
  } else if (x.maximized) {
    card.push(css.max)
  } else {
    card.push(css.center)
    if (x.size === 'sm') {
      card.push(css.sm)
    } else if (x.size === 'lg') {
      card.push(css.lg)
    } else {
      card.push(css.md)
    }
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
  return { card: card.join(' '), scrim: scrim.join(' ') }
}

/**
 * eyebrow 的类名预算(默认靛蓝,深档叠 .eyebrowDeep)。
 *
 * @param deep 是否深靛蓝档。
 * @returns 拼好的 className。
 */
export function eyebrowClsOf(deep: boolean): string {
  if (deep) {
    return `${css.eyebrow} ${css.eyebrowDeep}`
  }
  return css.eyebrow
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
 *
 * @param x 形态与位移。
 * @returns 白卡的 style。
 */
export function cardStyleOf(x: CardStyleIn): React.CSSProperties {
  if (x.narrow || x.maximized) {
    return {}
  }
  let transform = ''
  if (x.pos.x !== 0 || x.pos.y !== 0) {
    transform = `translate3d(${x.pos.x}px, ${x.pos.y}px, 0)`
  }
  return { transform }
}
