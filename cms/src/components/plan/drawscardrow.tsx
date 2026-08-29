'use client'
/**
 * plan 域的结构:一张各省最近抽选手机卡(08-10 Frank 拍板手机走卡片式)。
 * 2026-08-28 换装批自 Decision.tsx 的 dpDrawCards 行提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { DrawsCardRowIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一张抽选手机卡。
 *
 * @param props 这一行展示行。
 * @returns 一张卡。
 */
export function DrawsCardRow({ r }: DrawsCardRowIn) {
  return (
    <div className={css.drawRow}>
      <div className={css.rowHead}>
        <b className={css.rowProv}>{r.provName}</b>
        <span className={css.rowCode}>{r.provCode}</span>
        <span className={css.rowNum}>{r.score}</span>
      </div>
      <div className={css.drawInv}>
        <span>{r.invLabel}</span>
        <span className={css.drawInvNum}>{r.inv}</span>
      </div>
      <div className={css.drawWhen}>
        <span className={css.drawDate}>{r.date}</span>
        <span className={css.drawStream}>{r.stream}</span>
      </div>
    </div>
  )
}
