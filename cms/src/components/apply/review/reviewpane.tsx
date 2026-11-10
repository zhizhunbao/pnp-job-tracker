'use client'
/**
 * apply 桶子桶 review 的分块:一块面板。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, BTN_SECONDARY, CLS_CARD_MD, CLS_MCARD_HEAD, ONE_SPACE, PANE_JD, TEXT_NONE } from './constants'
import { clsIf } from './functions'
import type { ReviewPaneIn } from './types'
import css from './review.module.css'

/**
 * 一块面板。
 *
 * @param props 面板名、标题、整机、修改手柄与内容。
 * @returns 分区卡。
 */
export function ReviewPane({ pane, head, p, t, onEdit, children }: ReviewPaneIn) {
  const hidden = p.focus !== TEXT_NONE && p.focus !== pane && pane !== PANE_JD
  const isPdf = pane !== PANE_JD
  const gone = clsIf({ on: hidden, cls: cssOf(css.gone) })
  return (
    <section className={[CLS_CARD_MD, cssOf(css.pane), gone].join(ONE_SPACE)}>
      <div className={CLS_MCARD_HEAD + ONE_SPACE + cssOf(css.paneHead)}>
        <span>{head}</span>
        {isPdf && (
          <span className={cssOf(css.acts)}>
            <Button kind={BTN_SECONDARY} sm onClick={p.regenOf(pane)} disabled={p.stage !== TEXT_NONE}>
              {t('tr.regen')}
            </Button>
            {onEdit != null && <Button kind={BTN_GHOST} sm onClick={onEdit}>{t('pf.edit')}</Button>}
          </span>
        )}
      </div>
      {isPdf && <div className={cssOf(css.zoomHint)}>{t('tr.tapZoom')}</div>}
      {isPdf && (
        <div className={[cssOf(css.paper), cssOf(css.zoomable)].join(ONE_SPACE)}
          onClick={p.focusOf(pane)}
          title={t('tr.tapZoom')}>
          {children}
        </div>
      )}
      {isPdf === false && <div className={cssOf(css.paper)}>{children}</div>}
    </section>
  )
}
