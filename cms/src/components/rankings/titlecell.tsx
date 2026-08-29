'use client'
/**
 * 职位榜表格「职位」列的单元格:半粗的职位名,直链官方原帖(新开页 —— 原帖不该顶掉
 * 本站这一页)。没有原帖链接的那一行渲纯文字,不做点不动的链接。
 * 列宽有上限而**名字不截断**:长岗名在这一格里折行(站规 no-tooltips-copy-rules)。
 * 2026-08-28 换装批自 Ranking.tsx 的职位榜列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import type { RankJobCellRow } from './types'
import css from './rankings.module.css'

/**
 * 渲染职位榜「职位」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 职位名(有原帖时是链接)。
 */
export function TitleCell(r: RankJobCellRow) {
  if (r.applyUrl === TEXT_NONE) {
    return <span className={css.title}>{r.title}</span>
  }
  return (
    <span className={css.title}>
      <LinkButton href={r.applyUrl} target={TARGET_BLANK} className={cssOf(css.titleLink)}>
        {r.title}
      </LinkButton>
    </span>
  )
}
