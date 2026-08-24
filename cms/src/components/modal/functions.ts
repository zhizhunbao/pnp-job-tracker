/**
 * modal 域的纯函数(零 JSX 零 hook,node 可测)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

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
