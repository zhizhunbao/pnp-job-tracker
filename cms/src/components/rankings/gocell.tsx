'use client'
/**
 * 公司榜表格末列的单元格:一枚指向职位板按这家公司名搜索的站内链接。
 * 列名留空 —— 「在职位板查看」这句话本身就是列名,再起一个列名是同一件事说两遍。
 * 2026-08-28 换装批自 Ranking.tsx 的公司榜列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import type { RankCompanyCellRow } from './types'
import css from './rankings.module.css'

/**
 * 渲染公司榜「在职位板查看」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 指向职位板搜索结果的链接。
 */
export function GoCell(r: RankCompanyCellRow) {
  return (
    <LinkButton href={r.goHref} className={cssOf(css.goLink)}>
      {r.goLabel}
    </LinkButton>
  )
}
