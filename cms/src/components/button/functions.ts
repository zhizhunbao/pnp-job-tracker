/**
 * button 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { BtnClsIn, ButtonKind } from './types'
import css from './button.module.css'

/**
 * 按钮的类名预算:基座 + 尺寸档 + 变体 + 调用方追加类。
 * 变体 → 类是查表(键完整性由 Record<ButtonKind, string> 管);sm/lg 都传按 sm 算。
 *
 * @param x 变体与尺寸档。
 * @returns 拼好的 className。
 */
export function btnClsOf(x: BtnClsIn): string {
  const kindCls: Record<ButtonKind, string> = {
    primary: css.primary,
    pro: css.pro,
    secondary: css.secondary,
    ai: css.ai,
    ghost: css.ghost,
    danger: css.danger,
  }
  const cls = [css.btn]
  if (x.sm) {
    cls.push(css.sm)
  } else if (x.lg) {
    cls.push(css.lg)
  }
  cls.push(kindCls[x.kind])
  if (x.className != null) {
    cls.push(x.className)
  }
  return cls.join(' ')
}
