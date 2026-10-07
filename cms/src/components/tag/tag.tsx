'use client'
/**
 * tag 域的结构:状态标签(不可点)—— 省/联邦/重要/关注/通过/Pro 六变体。
 * 与 Chip 的分界:Tag 说「这是什么状态」,Chip 是可点的筛选。
 * 2026-08-24 自 ui/Tag.tsx 按组件域形制迁入(变体样式表迁 module.css)。
 * 2026-10-05 多一格 del:文字后面带一颗 × 摘除钮(可点的只有那颗钮,标签本身照旧不可点)—— 带删钮的标签原住 profile 桶的
 * OnboardingTags(已选职业),访客第 2 题的已选专业要同一枚,收进通用桶一处出(通用形态单一出口)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { DEL_MARK, PLAIN_BTN_KIND, VARIANT_DEFAULT } from './constants'
import { tagClsOf } from './functions'
import type { TagIn } from './types'
import css from './tag.module.css'

/**
 * 状态标签。
 *
 * @param props 变体/悬停提示/× 摘除钮/文字。
 * @returns 标签。
 */
export function Tag({ variant = VARIANT_DEFAULT, title, del, children }: TagIn) {
  return (
    <span title={title} className={tagClsOf(variant)}>
      {children}
      {del != null && (
        <Button kind={PLAIN_BTN_KIND} onClick={del.onClick} ariaLabel={del.aria} className={cssOf(css.tagDel)}>
          {DEL_MARK}
        </Button>
      )}
    </span>
  )
}
