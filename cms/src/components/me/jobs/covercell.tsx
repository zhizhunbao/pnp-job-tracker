'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「求职信」格(发出去的那封求职信,一颗「查看」就地开弹框)。
 * 2026-11-11 Frank「要包含我投递出去的简历 和 介绍信 列,用户可以随时查看」。
 *
 * @author Frank
 * @time 2026-11-11 15:00:00
 */
import { Button } from '@/components/button'
import { FILE_KIND } from './constants'
import type { ListRow } from './types'

/**
 * 渲染求职信格。
 *
 * @param r 这一行的展示行。
 * @returns 「查看」钮;没附求职信是空格。
 */
export function CoverCell(r: ListRow) {
  if (r.cover == null) {
    return null
  }
  return <Button kind={FILE_KIND} sm onClick={r.cover.onClick}>{r.cover.text}</Button>
}
