'use client'
/**
 * quiz 域的结构:选职业的搜索结果区(计数行 + 命中胶囊,一条都没搜到时出空态框)。
 * 搜索口径与三问同源、不新写端点:`/api/quiz?q=`(≥2 字、防抖),chip 上挂真在招数。
 * 计数行挂 aria-live:结果条数变了要念出来。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { ARIA_LIVE_POLITE, CLS_OCC_PILLS, CLS_OCC_RESULTS_HEAD, LEN_ZERO, MARK_ELLIPSIS } from './constants'
import { OccCandPill } from './occcandpill'
import { occLabelOf } from './functions'
import type { OccResultsIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染搜索结果区。
 *
 * @param props 取词函数、界面语言码、在途标、命中候选、已选码与逐候选手柄工厂。
 * @returns 搜索结果区。
 */
export function OccResults({ t, lang, searching, cands, nocs, pickOf }: OccResultsIn) {
  const pills = []
  for (const c of cands) {
    const label = occLabelOf({ row: c, lang })
    pills.push(
      <OccCandPill key={c.noc}
        noc={c.noc}
        label={label}
        on={nocs.includes(c.noc)}
        onPick={pickOf({ noc: c.noc, name: label })} />,
    )
  }
  return (
    <div className={css.results} aria-live={ARIA_LIVE_POLITE}>
      {searching && <div className={CLS_OCC_RESULTS_HEAD}>{MARK_ELLIPSIS}</div>}
      {searching === false && (
        <div className={CLS_OCC_RESULTS_HEAD}>{t('occ.resultN', { n: cands.length })}</div>
      )}
      {searching === false && cands.length === LEN_ZERO && (
        <div className={css.noResult}>{t('occ.noResult')}</div>
      )}
      {(searching || cands.length > LEN_ZERO) && <div className={CLS_OCC_PILLS}>{pills}</div>}
    </div>
  )
}
