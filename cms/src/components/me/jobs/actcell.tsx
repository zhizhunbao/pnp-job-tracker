'use client'
/**
 * me 桶子桶 jobs 的哑单元格:操作格 —— 一行唯一那颗钮(2026-11-07 效果图:推荐 / 收藏「投递」、投递「打开」、草稿「继续」;
 * 收藏里投过的「打开」是去职位页的链接钮)。手机一条底行右边也摆它。
 * 2026-11-07 Frank「先做 5 条必备」:钮右边挂行末「⋯」(menu 桶),里面是「删除」;一行仍只有一颗主钮。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Menu } from '@/components/menu'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染操作格。
 *
 * @param r 这一行的展示行。
 * @returns 主钮 + 「⋯」;都没有是空格。
 */
export function ActCell(r: ListRow) {
  const a = r.act
  return (
    <div className={cssOf(css.acts)}>
      {a != null && a.onClick != null && <Button kind={a.kind} sm onClick={a.onClick}>{a.text}</Button>}
      {a != null && a.onClick == null && <Button kind={a.kind} sm href={a.href}>{a.text}</Button>}
      {r.menu.length > 0 && <Menu label={r.more} items={r.menu} />}
    </div>
  )
}
