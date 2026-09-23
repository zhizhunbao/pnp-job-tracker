'use client'
/**
 * 窄屏卡片列表(E8-03 续,2026-07-07 用户拍板):≤640px 表格 → 卡片,CSS 双渲染零水合差异。
 * 2026-08-02(Frank「卡片也用 jobtable 的卡片」「以后这个定死」):版式抽到全站共用的 JobCard,
 * 这里只负责喂数据与交互 —— 长相由组件定,landing 职位榜吃的是同一张卡。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 2026-09-23 Frank「统一成标题译名」「应该优先使用详情下的翻译 更准吧」:卡上职位名下那条改成标题译名,库里还没有的这一页一次批量懒翻;
 * 只在窄屏(卡片真出来的那一档)打接口 —— 桌面卡片是 display:none,别白翻。
 * 2026-09-23「我的匹配」整拆:空态里的「去改档案」出口随之撤,空态只剩一句话。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { useTitleMap } from '@/components/jobtitle'
import { useIsNarrow } from '@/components/modal'
import { cardTitlesOf, cardsClsOf } from './functions'
import { BoardCard } from './boardcard'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染窄屏卡片流。
 *
 * @param props 职位板整台状态机。
 * @returns 卡片流(一行都没有出空态)。
 */
export function BoardCards({ b }: BoardPanelIn) {
  const narrow = useIsNarrow()
  const titleMap = useTitleMap({ titles: cardTitlesOf({ rows: b.data.rows, lang: b.lang, narrow }), lang: b.lang })
  const cards = []
  for (const j of b.data.rows) {
    cards.push(<BoardCard key={j.id} b={b} job={j} titleMap={titleMap} />)
  }
  return (
    <div className={cardsClsOf(b.data.swapping)}>
      {cards}
      {b.data.rows.length === 0 && (
        <div className={cssOf(css.emptyCards)}>
          {b.t('empty')}
        </div>
      )}
    </div>
  )
}
