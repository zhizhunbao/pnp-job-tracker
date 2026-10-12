'use client'
/**
 * 域内小件:一张配额卡(2026-10-12 抽选页三段式)—— 联邦或一个省:英文名 + 译名灰字,右上角名次,
 * 下面三格「今年配额 / 今年邀请 / 今年提名」(联邦写「永居目标」、不出提名格;NS 的人数格写「今年入选」;缺数写「-」)。
 * 名字已说清是哪个省,不再挂省码胶囊(Frank「这个胶囊没有必要吧」)。
 *
 * @author Frank
 * @time 2026-10-12 17:30:00
 */
import { cardGrayOf, cardNameEnOf, quotaCellsOf } from './functions'
import { NameLines } from './namelines'
import { RankMark } from './rankmark'
import { StatGrid } from './statgrid'
import type { QuotaCardIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染一张配额卡。
 *
 * @param props 取词函数、界面语与这张卡。
 * @returns 卡片。
 */
export function QuotaCard({ t, lang, card }: QuotaCardIn) {
  return (
    <div className={css.mini}>
      <RankMark rank={card.rank} />
      <div className={css.miniBody}>
        <NameLines en={cardNameEnOf({ t, lang, card })} gray={cardGrayOf({ t, lang, card })} />
        <StatGrid cells={quotaCellsOf({ t, lang, card })} />
      </div>
    </div>
  )
}
