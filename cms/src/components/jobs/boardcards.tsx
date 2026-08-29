'use client'
/**
 * 窄屏卡片列表(E8-03 续,2026-07-07 用户拍板):≤640px 表格 → 卡片,CSS 双渲染零水合差异。
 * 2026-08-02(Frank「卡片也用 jobtable 的卡片」「以后这个定死」):版式抽到全站共用的 JobCard,
 * 这里只负责喂数据与交互 —— 长相由组件定,landing 职位榜吃的是同一张卡。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { cardsClsOf } from './functions'
import { BoardCard } from './boardcard'
import { EmptyNote } from './emptynote'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染窄屏卡片流。
 *
 * @param props 职位板整台状态机。
 * @returns 卡片流(一行都没有出空态)。
 */
export function BoardCards({ b }: BoardPanelIn) {
  const cards = []
  for (const j of b.data.rows) {
    cards.push(<BoardCard key={j.id} b={b} job={j} />)
  }
  return (
    <div className={cardsClsOf(b.data.swapping)}>
      {cards}
      {b.data.rows.length === 0 && (
        <div className={cssOf(css.emptyCards)}>
          <EmptyNote text={b.emptyText} link={b.emptyLink} />
        </div>
      )}
    </div>
  )
}
