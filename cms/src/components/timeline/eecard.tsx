'use client'
/**
 * 域内小件:一张联邦 EE 类别的节奏卡。它比省卡少一格 —— EE 的历次抽选还没入库,
 * 只报得出「最近一期距今多少天」,平均间隔那一格没有就不编(二期历史入库后并进省卡那张表)。
 * 2026-08-28 换装批自 Timeline.tsx 的 EE 节奏卡提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Tag } from '@/components/tag'
import { CARD_BTN_KIND, META_SEP, SCALE_CRS, TAG_EE, TAG_FEDERAL } from './constants'
import type { EeCardIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染一张联邦 EE 节奏卡。
 *
 * @param props 取词函数、这张卡的类别距今数据与点击手柄。
 * @returns 整卡钮。
 */
export function EeCard({ t, row, onClick }: EeCardIn) {
  return (
    <Button kind={CARD_BTN_KIND} onClick={onClick} className={cssOf(css.card)}>
      <span className={css.cardHead}>
        <Tag variant={TAG_FEDERAL}>{TAG_EE}</Tag>
        <span className={css.stream}>{row.label}</span>
        <span className={css.scale}>{SCALE_CRS}</span>
        <span className={css.hist}>{t('tl.hist')}</span>
      </span>
      <span className={css.cardBody}>
        {t('tl.last', { d: row.last })}{META_SEP}
        <b className={cssOf(css.days)}>{t('tl.daysSince', { n: row.daysSince })}</b>
      </span>
    </Button>
  )
}
