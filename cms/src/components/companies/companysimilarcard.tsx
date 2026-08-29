'use client'
/**
 * 相似雇主卡(同省同行业按担保档取;公司弹框里是白赚的一格 —— 同一次取数带回来的)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanySimilarRow } from './companysimilarrow'
import { CARD_HEAD_CLS, CARD_MD_CLS } from './constants'
import type { CompanySimilarCardIn } from './types'
import css from './companies.module.css'

/**
 * 相似雇主卡。
 *
 * @param props 相似雇主、取词函数与新开页(逐格注释见 CompanySimilarCardIn)。
 * @returns 一张卡;一家都没有时整卡不渲。
 */
export function CompanySimilarCard({ similar, t, newTab }: CompanySimilarCardIn) {
  if (similar.length === 0) {
    return null
  }
  const rows = []
  for (const employer of similar) {
    rows.push(<CompanySimilarRow key={employer.slug} employer={employer} t={t} newTab={newTab} />)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        {t('co.similar')}
        <span className={css.simSub}>{t('co.similarSub')}</span>
      </div>
      <div>{rows}</div>
    </div>
  )
}
