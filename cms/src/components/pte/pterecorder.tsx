'use client'
/**
 * 域内小件:录音件(红点 + 录音中秒数 + 上限提示 + 停止)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { KIND_LINK, REC_MARK, SPACE } from './constants'
import { clockOf } from './functions'
import type { PteRecorderIn } from './types'
import css from './pte.module.css'

/**
 * 渲染录音件。
 *
 * @param props 取词函数、已录秒数、上限与停止。
 * @returns 录音件。
 */
export function PteRecorder({ t, seconds, cap, onStop }: PteRecorderIn) {
  return (
    <div className={css.rec}>
      <span className={css.recDot}>{REC_MARK}</span>
      <div className={css.recMain}>
        <div className={css.recLine}>{t('pte.recording')}{SPACE}{clockOf({ seconds })}</div>
        <div className={css.recHint}>{t('pte.recCap', { s: cap })}</div>
      </div>
      <Button kind={KIND_LINK} onClick={onStop}>{t('pte.stop')}</Button>
    </div>
  )
}
