/** 类名 + 状态修饰:`cx('shNavLink', isActive)` → "shNavLink on"。
 *  样式迁进 main.css 之后,tsx 里剩下的只有「当前态开不开」这一个布尔,
 *  不再逐属性写 `color: on ? A : B, fontWeight: on ? 700 : 400`(2026-08-17 CSS 迁移)。 */
export const cx = (base: string, on?: boolean): string => (on ? `${base} on` : base)
