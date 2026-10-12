'use client'
/**
 * 域内小件:「配额」分区卡(2026-10-12 抽选页三段式,页面三段的第一段)—— 联邦 + 各省一张配额卡,按数据层的综合名次排
 * (今年邀请 40% / 今年配额 40% / 最近一次抽选距今 20%)。网页一行四张,手机一行一张(Frank「这个一行放一个卡片?」)。
 *
 * @author Frank
 * @time 2026-10-12 17:30:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS } from './constants'
import { QuotaCard } from './quotacard'
import type { QuotaSectionIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染配额分区卡。
 *
 * @param props 取词函数、界面语与配额卡。
 * @returns 分区卡;没有配额卡时不渲。
 */
export function QuotaSection({ t, lang, cards }: QuotaSectionIn) {
  if (cards.length === 0) {
    return null
  }
  const items = []
  for (const card of cards) {
    items.push(<QuotaCard key={card.key} t={t} lang={lang} card={card} />)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('tl.quota')}</div>
      <div className={css.cardGrid}>{items}</div>
    </div>
  )
}
