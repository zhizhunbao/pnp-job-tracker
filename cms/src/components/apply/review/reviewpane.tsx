'use client'
/**
 * apply 桶子桶 review 的分块:一块面板。
 * 2026-11-11 Frank「这个按钮应该去掉吧」「可以删吧」:卡头的「重新生成」撤(整份重写、缺的经历补不上;
 * 要补走分数卡的「补充经历」,要改字走「修改」),卡头只剩「修改」。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, CLS_CARD_MD, CLS_MCARD_HEAD, ONE_SPACE, PANE_JD, PANE_MAIL, TEXT_NONE } from './constants'
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
  const isPdf = pane !== PANE_JD && pane !== PANE_MAIL
  const gone = clsIf({ on: hidden, cls: cssOf(css.gone) })
  return (
    <section className={[CLS_CARD_MD, cssOf(css.pane), gone].join(ONE_SPACE)}>
      <div className={CLS_MCARD_HEAD + ONE_SPACE + cssOf(css.paneHead)}>
        <span>{head}</span>
        {onEdit != null && (
          <span className={cssOf(css.acts)}>
            <Button kind={BTN_GHOST} sm onClick={onEdit}>{t('pf.edit')}</Button>
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
      {pane === PANE_JD && <div className={cssOf(css.paper)}>{children}</div>}
      {pane === PANE_MAIL && children}
    </section>
  )
}
