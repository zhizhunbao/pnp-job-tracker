/**
 * review 子桶 pick 的行为:点一条要求、点一块高亮时选中与取消(序号标记、点击手柄、叠在一起时的取消)。
 * 2026-11-11 按「大于 1000 就拆子桶」(样张 apply/letter):review 的 functions.ts 过线,切出选中这一族。
 * 依赖只许 review → 本子桶(经 index.ts);本子桶不取 review 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-11 23:30:00
 */
import { NUM_NONE, SEL_N_TAIL, SEL_Q_HEAD } from './constants'
import type { ActiveUnderIn, HlMark, HlPickFn, PickActiveIn } from './types'

/**
 * 高亮块上的序号标记:只有句头那块带。
 *
 * @param r 这一块。
 * @returns 序号;不是句头给 null(React 不写这个属性)。
 */
export function hlDataOf(r: HlMark): number | null {
  if (r.first) {
    return r.n
  }
  return null
}

/**
 * 造「点一条要求」手柄:点同一条取消选中。
 *
 * @param x 选中项、这一条与手柄。
 * @returns 点击手柄。
 */
export function makePickActive(x: PickActiveIn): () => void {
  return function onPick(): void {
    if (x.active === x.n) {
      x.setActive(NUM_NONE)
    } else {
      x.setActive(x.n)
    }
  }
}

/**
 * 造「点高亮」手柄:不冒泡给面板(面板点击是放大)。
 *
 * @param x 选中项、这一条与手柄。
 * @returns 点击手柄。
 */
export function makeHlPick(x: PickActiveIn): HlPickFn {
  return function onHlPick(e: React.MouseEvent): void {
    e.stopPropagation()
    if (x.active === x.n || isActiveUnder({ x: e.clientX, y: e.clientY, active: x.active })) {
      x.setActive(NUM_NONE)
    } else {
      x.setActive(x.n)
    }
  }
}

/**
 * 点下去的位置上有没有选中着的那一条高亮(2026-11-11 Frank「这个高亮点完就取消不了了,其他都不亮了」:同一句话对上两条要求时
 * 两块高亮叠在一起,点到的是盖在上面、已经变淡的另一条,结果换成选它,选中着的那条永远点不掉)。
 *
 * @param p 点击位置与选中项。
 * @returns 有 true。
 */
function isActiveUnder(p: ActiveUnderIn): boolean {
  if (p.active === NUM_NONE) {
    return false
  }
  for (const el of document.elementsFromPoint(p.x, p.y)) {
    if (el.matches(SEL_Q_HEAD + String(p.active) + SEL_N_TAIL)) {
      return true
    }
  }
  return false
}
