'use client'
/**
 * 域内小件:答题卡钮排 —— 一排、两种形(Frank 2026-09-03「按钮样式保持一致,不要有重复」):
 * 主钮一颗(作答段 = 提交,对照段 = 下一题)+ 次钮同形(再听一遍 / 重做·重录 / 上一题 / 下一题)。
 * 上一题 / 下一题三段常在(Frank 2026-09-03「上一题 下一题按钮呢」),没有邻题就禁用不隐藏。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { KIND_PRIMARY, KIND_SECONDARY, PHASE_ANSWERING, PHASE_CHECKED, T_WFD } from './constants'
import { hrefOrNone } from './functions'
import type { ButtonKind } from '@/components/button'
import type { PteAnswerPartIn } from './types'
import css from './pte.module.css'

/**
 * 渲染钮排。
 *
 * @param props 同答题卡。
 * @returns 一排钮。
 */
export function PteAnswerBtns({ t, q, type, a, prevHref, nextHref }: PteAnswerPartIn) {
  const wfd = q.type === T_WFD
  const answering = a.phase === PHASE_ANSWERING
  const checked = a.phase === PHASE_CHECKED
  let redoLabel = t('pte.rerec')
  if (wfd) {
    redoLabel = t('pte.redo')
  }
  let nextKind: ButtonKind = KIND_SECONDARY
  if (checked) {
    nextKind = KIND_PRIMARY
  }
  return (
    <div className={css.btns}>
      {answering && <Button kind={KIND_PRIMARY} onClick={a.onSubmit}>{t('pte.submit')}</Button>}
      {answering && wfd && type.audio && a.canPlay && (
        <Button kind={KIND_SECONDARY} onClick={a.onPlay}>{t('pte.replay')}</Button>
      )}
      {checked && <Button kind={KIND_SECONDARY} onClick={a.onRedo}>{redoLabel}</Button>}
      <Button kind={KIND_SECONDARY} href={hrefOrNone(prevHref)} disabled={prevHref == null}>{t('pte.prev')}</Button>
      <Button kind={nextKind} href={hrefOrNone(nextHref)} disabled={nextHref == null}>{t('pte.next')}</Button>
    </div>
  )
}
