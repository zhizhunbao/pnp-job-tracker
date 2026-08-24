'use client'
/**
 * title 域的页面二级标题:文字 + 右延细线(右槽可挂「更多 →」链接)。
 * 2026-08-24 自 ui/Title.tsx 按组件域形制迁入,成为 title 通用域的第二个住户
 * (第一个是弹框标题 modaltitle.tsx)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { TitleIn } from './types'
import css from './title.module.css'

/**
 * 二级标题行。
 *
 * @param props 右槽与标题文字。
 * @returns 标题行。
 */
export function Title({ right, children }: TitleIn) {
  return (
    <div className={css.titleRow}>
      {children}{right}<span className={css.titleLine} />
    </div>
  )
}
