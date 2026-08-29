'use client'
/**
 * ③ 现在走不通的:整块收起 —— 它回答的是「哪些别去试」,不是他此刻要做的事。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { CaseLead } from './caselead'
import { CasePath } from './casepath'
import type { CaseBlockedIn } from './types'
import css from './cases.module.css'

/**
 * 「现在走不通的」卡。
 *
 * @param props 整份答案与取词函数(逐格注释见 CaseBlockedIn)。
 * @returns 卡;没有被排除的通道 = null。
 */
export function CaseBlocked({ answer, t }: CaseBlockedIn) {
  if (answer.excluded.length === 0) {
    return null
  }
  const rows = []
  for (const v of answer.excluded) {
    rows.push(<CasePath key={v.key} v={v} rank={null} t={t} answer={answer} />)
  }
  return (
    <div className={css.card}>
      <h2 className={`${css.h2} ${css.h2Tight}`}>{t('case.blockedTitle')}</h2>
      <details>
        <summary className={css.moreSummary}>{t('case.showMore', { n: answer.excluded.length })}</summary>
        <CaseLead lines={[t('case.blockedLead')]} />
        {rows}
      </details>
    </div>
  )
}
