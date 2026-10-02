/**
 * tag 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import type { TagsShownIn, TagVariant } from './types'
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
    region: cssOf(css.region),
    federal: cssOf(css.federal),
    imp: cssOf(css.imp),
    warn: cssOf(css.warn),
    ok: cssOf(css.ok),
    pro: cssOf(css.pro),
    gray: cssOf(css.gray),
  }
  return `${css.tag} ${variantCls[variant]}`
}

/**
 * 可折叠的一排标签这一刻渲哪几枚:收着只出前几枚,展开出全部(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:改成默认几枚 + 已展开几枚,一次展开 20 枚)。
 *
 * @param x 全部标签、默认露几枚与已展开几枚。
 * @returns 要渲的标签文字。
 */
export function tagsShownOf(x: TagsShownIn): string[] {
  return x.items.slice(0, x.first + x.extra)
}

