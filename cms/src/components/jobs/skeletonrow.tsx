'use client'
/**
 * 域内小件:换血中的骨架行。#99(走查):进「我的匹配」换血期,别把上一屏的默认(全「低」)行
 * 透出来压在「只显示高/中」横幅下 —— 自相矛盾。换血中改渲骨架行,数据回来再出真行。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import type { SkeletonRowIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染一条骨架行。
 *
 * @param props 这一行要铺几格。
 * @returns 一行灰条。
 */
export function SkeletonRow({ cols }: SkeletonRowIn) {
  const tds = []
  for (const c of cols) {
    tds.push(
      <td key={c.key} className={cssOf(css.skelTd)}>
        <span className={cssOf(css.skelBar)} />
      </td>,
    )
  }
  return (
    <tr>{tds}</tr>
  )
}
