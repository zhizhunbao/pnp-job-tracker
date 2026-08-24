/**
 * tag 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { TagVariant } from './types'
import css from './tag.module.css'

/**
 * 标签的类名预算:基座 + 变体类。变体 → 类是查表不是比较分支:变体名只在表里
 * 出现一次,键的完整性由 Record<TagVariant, string> 管着(types 加一个变体、
 * 这表漏配,当场 tsc 红)。
 *
 * @param variant 六种变体之一。
 * @returns 拼好的 className。
 */
export function tagClsOf(variant: TagVariant): string {
  const variantCls: Record<TagVariant, string> = {
    region: css.region,
    federal: css.federal,
    imp: css.imp,
    warn: css.warn,
    ok: css.ok,
    pro: css.pro,
  }
  return `${css.tag} ${variantCls[variant]}`
}
