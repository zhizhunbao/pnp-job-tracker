'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「简历」格(发出去的那份简历,一颗「查看」就地开弹框)。
 * 2026-11-11 Frank「要包含我投递出去的简历 和 介绍信 列,用户可以随时查看」。
 *
 * @author Frank
 * @time 2026-11-11 15:00:00
 */
import { Button } from '@/components/button'
import { FILE_KIND } from './constants'
import type { ListRow } from './types'

/**
 * 渲染简历格。
 *
 * @param r 这一行的展示行。
 * @returns 「查看」钮;没有文件是空格。
 */
export function ResumeCell(r: ListRow) {
  if (r.resume == null) {
    return null
  }
  return <Button kind={FILE_KIND} sm onClick={r.resume.onClick}>{r.resume.text}</Button>
}
