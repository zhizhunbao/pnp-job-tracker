'use client'
/**
 * plan 域的结构:估分卡的一行结论 —— 走 lib/points 的三态:
 * 够得着 / 够不着 / 取决于加分项。三态各说各的,**不混着说**。
 * 🔴 只到「够不够线」为止:不许延伸成「多久能被捞」「概率多大」(禁概率红线)。
 * 分是服务端与排序同源下发的 row.score,客户端不算分。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 的 banner 三态提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { ScoreLineNote } from './scorelinenote'
import { lineSubClsOf, lineSubTextOf, lineToneOf, lineVerdictOf, lineYoursClsOf } from './functions'
import type { ScoreLineVerdictIn } from './types'

/**
 * 渲染够不够线的结论行。
 *
 * @param props 取词函数、当前页签省、省名取名函数、这个省的估分与要摆的那几轮。
 * @returns 结论行。
 */
export function ScoreLineVerdict({ t, prov, provDisp, score, list }: ScoreLineVerdictIn) {
  const state = lineVerdictOf(score)
  return (
    <ScoreLineNote tone={lineToneOf({ state })}>
      <b className={lineYoursClsOf({ state })}>{t('sl.yours', { prov: provDisp(prov), v: score.value })}</b>
      <div className={lineSubClsOf({ state })}>{lineSubTextOf({ t, state, score, list })}</div>
    </ScoreLineNote>
  )
}
