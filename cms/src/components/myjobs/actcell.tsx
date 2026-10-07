'use client'
/**
 * 域内哑单元格:操作格 —— 「打开」进职位页(职位删了不出);我的收藏多一颗「取消收藏」。小框钮,同职位板「☆ 收藏」。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { Button, LinkButton } from '@/components/button'
import { ACT_KIND, TEXT_NONE } from './constants'
import type { MyJobCellRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染操作格。
 *
 * @param r 展示行。
 * @returns 零到两颗钮。
 */
export function ActCell(r: MyJobCellRow) {
  return (
    <span className={css.acts}>
      {r.href !== TEXT_NONE && <LinkButton href={r.href} className={css.act}>{r.openText}</LinkButton>}
      {r.onUnsave != null && (
        <Button kind={ACT_KIND} className={css.act} onClick={r.onUnsave}>{r.unsaveText}</Button>
      )}
    </span>
  )
}
