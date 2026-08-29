'use client'
/**
 * plan 域的结构:一个省展开后的明细。省名、制度、合计分都在面板头上,这里只渲明细:
 * 分项 → 适用范围说明 → 对照结论 → 换省这一步怎么走 → 该省同职业在招数。
 * 「换省」与在招数都是事实,**不评价「更容易」**。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的 ProvinceResult 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { ProvinceLine } from './provinceline'
import { ProvinceParts } from './provinceparts'
import { PROV_NL } from './constants'
import { offerGainOf, scoreAnchorOf, scoreTargetProvOf, streamOfProv, switchTextOf } from './functions'
import type { ProvinceResultIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一个省的明细。
 *
 * @param props 分值卡整机与这个省的估分。
 * @returns 明细。
 */
export function ProvinceResult({ d, s }: ProvinceResultIn) {
  const anchor = scoreAnchorOf({
    score: s, draws: d.draws, matchedStream: streamOfProv({ streams: d.streams, prov: s.province }),
  })
  const gain = offerGainOf({ score: s, factors: d.factors, switchable: s.province !== scoreTargetProvOf(d.ctx) })
  const jobs = d.byProv[s.province]
  return (
    <div>
      <ProvinceParts t={d.t} lang={d.lang} s={s} />
      {s.province === PROV_NL && <div className={cssOf(css.psScopeNote)}>{d.t('ps.nlScope')}</div>}
      <ProvinceLine t={d.t} s={s} anchor={anchor} />
      {gain > 0 && <div className={cssOf(css.psSwitch)}>{switchTextOf({ t: d.t, score: s, gain })}</div>}
      {jobs != null && (
        <div className={cssOf(css.psJobs)}>{d.t('ps.openJobs', { n: jobs.n, e: jobs.eligible })}</div>
      )}
    </div>
  )
}
