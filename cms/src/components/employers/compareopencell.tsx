'use client'
/**
 * 对比表「在招岗」行的单元格:有岗时把岗数渲成链接(点进首页按这家雇主名搜),
 * 零岗时只渲数字不做链接 —— 点进去一条都没有的链接是空承诺。
 * 2026-08-27 换装批自 Compare.tsx 的 open 维度 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { CompareCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染对比表「在招岗」行里属于这家雇主的那一个单元格。
 *
 * @param r 这家雇主的展示行。
 * @returns 岗数;有岗时是一枚指向首页搜索的链接。
 */
export function CompareOpenCell(r: CompareCellRow) {
  if (r.openHref === TEXT_NONE) {
    return <>{r.openText}</>
  }
  return (
    <LinkButton href={r.openHref} className={cssOf(css.link)}>
      {r.openText}
    </LinkButton>
  )
}
