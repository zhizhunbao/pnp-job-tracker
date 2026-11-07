'use client'
/**
 * me 桶子桶 jobs 的哑单元格:操作格 —— 一行唯一那颗钮(2026-11-07 效果图:推荐 / 收藏「投递」、投递「打开」、草稿「继续」;
 * 收藏里投过的「打开」是去职位页的链接钮)。手机一条底行右边也摆它。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import type { ListRow } from './types'

/**
 * 渲染操作格。
 *
 * @param r 这一行的展示行。
 * @returns 一颗钮;没有钮是空格。
 */
export function ActCell(r: ListRow) {
  const a = r.act
  if (a == null) {
    return null
  }
  if (a.onClick != null) {
    return <Button kind={a.kind} sm onClick={a.onClick}>{a.text}</Button>
  }
  return <Button kind={a.kind} sm href={a.href}>{a.text}</Button>
}
