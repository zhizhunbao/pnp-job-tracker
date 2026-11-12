'use client'
/**
 * me 桶子桶 jobs 的哑单元格:推荐指数那一枚胶囊(网页端在「推荐指数」格里,手机一条在标题行右端;2026-11-11)。
 * 同日 Frank「bullets 要不点击 high 那个按钮时候才显示」:胶囊可点,点了展开 / 收起这一行的要点(网页端在行下面的细行里,手机在卡片里),档字后面带一个箭头。
 *
 * @author Frank
 * @time 2026-11-11 23:59:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Tag } from '@/components/tag'
import { PLAIN_BTN_KIND } from './constants'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染推荐指数胶囊。
 *
 * @param r 这一行的展示行。
 * @returns 可点的一枚胶囊;没有推荐指数不渲。
 */
export function FitTag(r: ListRow) {
  if (r.fit == null || r.fitToggle == null) {
    return null
  }
  return (
    <Button kind={PLAIN_BTN_KIND} onClick={r.fitToggle} expanded={r.fit.open} ariaLabel={r.fit.aria}
      className={cssOf(css.fitBtn)}>
      <Tag variant={r.fit.variant}>{r.fit.levelText}{r.fit.mark}</Tag>
    </Button>
  )
}
