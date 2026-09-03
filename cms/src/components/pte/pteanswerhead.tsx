'use client'
/**
 * 域内小件:答题卡头(英文题型名 + 缩写灰注 | 「考过 (N)」钮 + 位置;下一行官方一句指令;
 * RA 准备段再一行倒计时 | 跳过准备(描边小钮 —— Frank 2026-09-04「不要有这种只有文字的按钮」))。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { KIND_SECONDARY, PHASE_READY } from './constants'
import { clockOf, instKeyOf } from './functions'
import type { PteAnswerPartIn } from './types'
import css from './pte.module.css'

/**
 * 渲染答题卡头。
 *
 * @param props 同答题卡。
 * @returns 头两三行。
 */
export function PteAnswerHead({ t, q, type, pos, a, seen }: PteAnswerPartIn) {
  const inPrep = a.phase === PHASE_READY && a.prepLeft > 0
  return (
    <>
      <div className={css.qHead}>
        <div>
          {type.nameEn}
          <span className={css.code}>{q.type}</span>
        </div>
        <div className={css.headRight}>
          {seen}
          <span className={css.pos}>{pos}</span>
        </div>
      </div>
      <div className={css.inst}>{t(instKeyOf({ type: q.type }))}</div>
      {inPrep && (
        <div className={css.prepRow}>
          <span>{t('pte.prep')} <span className={css.prepNum}>{clockOf({ seconds: a.prepLeft })}</span></span>
          <Button kind={KIND_SECONDARY} sm onClick={a.onSkipPrep}>{t('pte.skipPrep')}</Button>
        </div>
      )}
    </>
  )
}
