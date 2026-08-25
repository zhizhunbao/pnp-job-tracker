'use client'
/**
 * pager 域的结构:翻页行(总数说明 + ‹ x/y ›)—— Table 内置页脚用,
 * OccBoard 手机卡片列表也复用同一个。
 * 禁用态走 CSS 的 :disabled(原来有个返回样式对象的 btn(disabled) 函数,
 * 做的事 CSS 一条选择器就够)。2026-08-24 自 ui/Pager.tsx 按组件域形制迁入。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { IconChevronLeft, IconChevronRight } from '@/components/icons'
import { NEXT_ARIA, PAGE_SEP, PREV_ARIA } from './constants'
import type { PagerIn } from './types'
import css from './pager.module.css'

/**
 * 翻页行;只有一页时不渲染导航组。
 *
 * @param props 页码/总页数/说明/回调。
 * @returns 翻页行。
 */
export function Pager({ page, max, note, onPage }: PagerIn) {
  function prev() {
    onPage(Math.max(0, page - 1))
  }

  function next() {
    onPage(Math.min(max - 1, page + 1))
  }

  return (
    <div className={css.pager}>
      {note != null && <span>{note}</span>}
      {max > 1 && (
        <span className={css.nav}>
          <button aria-label={PREV_ARIA} className={css.btn} disabled={page === 0} onClick={prev}>
            <IconChevronLeft />
          </button>
          <span className={css.num}>{page + 1}{PAGE_SEP}{max}</span>
          <button aria-label={NEXT_ARIA} className={css.btn} disabled={page >= max - 1} onClick={next}>
            <IconChevronRight />
          </button>
        </span>
      )}
    </div>
  )
}
