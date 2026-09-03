'use client'
/**
 * 域内小件:事实卡(最近考过 / 考过次数 / 押题 / 题号 四行 + 免责一句;不标来源 ——
 * Frank 2026-09-03「没必要加来源」)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { NUM_HEAD } from './constants'
import { agoTextOf } from './functions'
import type { PteFactsIn } from './types'
import css from './pte.module.css'

/**
 * 渲染事实卡。
 *
 * @param props 取词函数与题。
 * @returns 一张卡。
 */
export function PteFacts({ t, q }: PteFactsIn) {
  let hot = t('pte.no')
  if (q.predicted) {
    hot = t('pte.yes')
  }
  return (
    <div className={css.card}>
      <div className={css.fact}>
        <span>{t('pte.f.seen')}</span>
        <span className={css.factV}>{agoTextOf({ t, iso: q.seen })}</span>
      </div>
      <div className={css.fact}>
        <span>{t('pte.f.n')}</span>
        <span className={css.factV}>{t('pte.times', { n: q.times })}</span>
      </div>
      <div className={css.fact}><span>{t('pte.f.hot')}</span><span className={css.factV}>{hot}</span></div>
      <div className={css.fact}><span>{t('pte.f.num')}</span><span className={css.factV}>{NUM_HEAD}{q.num}</span></div>
      <div className={css.factNote}>{t('pte.disclaimer')}</div>
    </div>
  )
}
