'use client'
/**
 * 对比表雇主列的表头:渲染雇主名(有官网就做成外链)以及下面一行灰色别名。
 * 对比表是**转置**的 —— 一家雇主 = 一列,所以这一块是列头,不是行首。
 * 2026-08-27 换装批自 Compare.tsx 里那段内联 label 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import type { CompareHeadLabelIn } from './types'
import css from './employers.module.css'

/**
 * 渲染对比表里一家雇主那一列的表头。
 *
 * @param props 这一列代表的雇主(展示行)。
 * @returns 雇主名(有官网时是外链)与别名。
 */
export function CompareHeadLabel({ r }: CompareHeadLabelIn) {
  let name = <>{r.name}</>
  if (r.website !== TEXT_NONE) {
    name = (
      <LinkButton href={r.website} target={TARGET_BLANK} className={cssOf(css.link)}>
        {r.name}
      </LinkButton>
    )
  }
  return (
    <span className={css.headLabel}>
      {name}
      {r.alias !== TEXT_NONE && <span className={css.headAlias}>{r.alias}</span>}
    </span>
  )
}
