'use client'
/**
 * 域内小件:答题卡(头 / 体 / 钮三件拼装;三段动线的样子全在三件里)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { PteAnswerBody } from './pteanswerbody'
import { PteAnswerBtns } from './pteanswerbtns'
import { PteAnswerHead } from './pteanswerhead'
import type { PteAnswerIn } from './types'
import css from './pte.module.css'

/**
 * 渲染答题卡。
 *
 * @param props 题、题型、位置、面板与前后邻(逐格注释见 PteAnswerIn)。
 * @returns 一张卡。
 */
export function PteAnswer({ t, q, type, pos, a, r, seen, pro, prevHref, nextHref, tiers, onHoverWord }: PteAnswerIn) {
  return (
    <div className={css.card}>
      <PteAnswerHead t={t} q={q} type={type} pos={pos} a={a} r={r} seen={seen} pro={pro}
        prevHref={prevHref} nextHref={nextHref} tiers={tiers} onHoverWord={onHoverWord} />
      <PteAnswerBody t={t} q={q} type={type} pos={pos} a={a} r={r} seen={seen} pro={pro}
        prevHref={prevHref} nextHref={nextHref} tiers={tiers} onHoverWord={onHoverWord} />
      <PteAnswerBtns t={t} q={q} type={type} pos={pos} a={a} r={r} seen={seen} pro={pro}
        prevHref={prevHref} nextHref={nextHref} tiers={tiers} onHoverWord={onHoverWord} />
    </div>
  )
}
