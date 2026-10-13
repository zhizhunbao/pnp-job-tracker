'use client'
/**
 * 域内小件:「抽选节奏」分区卡(2026-10-12 抽选页三段式,页面三段的第二段;取代原先的节奏卡网格 cadencegrid 与联邦 EE 卡 eecard)——
 * 一条通道一张节奏卡,按数据层的综合名次排(今年邀请 40% / 今年抽选次数 20% / 抽选频率 20% / 还在不在抽 20%),
 * 联邦 EE 各类别与各省通道同排(联邦「省提名专场」数据层不出卡)。先出 10 张,其余走全站折叠件「展开 N 条 / 收起」。
 *
 * @author Frank
 * @time 2026-10-12 17:30:00
 */
import { FoldLine } from '@/components/pager'
import { CadenceCard } from './cadencecard'
import { CADENCE_FOLD, CARD_HEAD_CLS, CARD_MD_CLS, K_FOLD_UNIT } from './constants'
import type { CadenceSectionIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染抽选节奏分区卡。
 *
 * @param props 取词函数、界面语、节奏卡、折叠状态与点击手柄工厂。
 * @returns 分区卡;没有节奏卡时不渲。
 */
export function CadenceSection({ t, lang, cards, extra, onMore, onFold, drillOf }: CadenceSectionIn) {
  if (cards.length === 0) {
    return null
  }
  const head = []
  for (const [i, card] of cards.entries()) {
    if (i >= CADENCE_FOLD + extra) {
      break
    }
    head.push(<CadenceCard key={card.key} t={t} lang={lang} card={card} onClick={drillOf(card)} />)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('tl.cadence')}</div>
      <div className={css.cardGrid}>{head}</div>
      <FoldLine t={t}
        unit={t(K_FOLD_UNIT)}
        hidden={Math.max(cards.length - CADENCE_FOLD, 0)}
        extra={extra}
        busy={false}
        onMore={onMore}
        onFold={onFold} />
    </div>
  )
}
