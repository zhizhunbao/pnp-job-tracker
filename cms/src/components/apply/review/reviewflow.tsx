'use client'
/**
 * apply 桶子桶 review 的本体(2026-11-09 Frank 高质量投递):打开就按职位写好简历和求职信,三屏对照、同号同色、打分。
 * 宽屏并排,手机竖排;简历和求职信显示的是将发出的原样 PDF。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import {
  BTN_SECONDARY, CLS_CARD_MD, NOTICE_ERR,
  ONE_SPACE, PANE_COVER, PANE_JD, PANE_MAIL, PANE_RESUME, ROLE_STATUS, STAGE_KEYS,
  TEXT_NONE, URL_FILE, URL_GEN, URL_KIND,
} from './constants'
import { coverQuotesOf, resumeQuotesOf } from './functions'
import { useReview } from './hooks'
import { ReviewDrawers } from './reviewdrawers'
import { ReviewFoot } from './reviewfoot'
import { ReviewMail } from './reviewmail'
import { ReviewJd } from './reviewjd'
import { ReviewPane } from './reviewpane'
import { ReviewPdf } from './reviewpdf'
import { ReviewScore } from './reviewscore'
import { ReviewWait } from './reviewwait'
import type { ReviewFlowIn } from './types'
import css from './review.module.css'

/**
 * 三屏本体。
 *
 * @param props 职位、收发信息、取词与回调。
 * @returns 进度或三屏。
 */
export function ReviewFlow(props: ReviewFlowIn) {
  const p = useReview(props)
  const t = props.t
  const stageKey = STAGE_KEYS[p.stage]
  if (p.opening && p.err === TEXT_NONE) {
    return null
  }
  if (p.opening || p.review == null || p.review.score == null) {
    return (
      <div className={CLS_CARD_MD + ONE_SPACE + cssOf(css.wait)} role={ROLE_STATUS}>
        {p.err === TEXT_NONE && p.opening === false && <ReviewWait stage={p.stage} t={t} />}
        {p.err !== TEXT_NONE && <Notice kind={NOTICE_ERR}>{t(p.err)}</Notice>}
        {p.err !== TEXT_NONE && (
          <div className={cssOf(css.failAct)}>
            <span>{t('tr.failBase')}</span>
            <Button kind={BTN_SECONDARY} sm onClick={props.onBase}>{t('ap.chBase')}</Button>
          </div>
        )}
      </div>
    )
  }
  const base = URL_FILE + String(props.jobId) + URL_KIND
  const tail = URL_GEN + String(p.gen)
  let columns = cssOf(css.grid)
  if (p.focus !== TEXT_NONE) {
    columns = cssOf(css.grid) + ONE_SPACE + cssOf(css.gridFocus)
  }
  return (
    <>
      <ReviewScore p={p} review={p.review} t={t} />
      {stageKey != null && <div role={ROLE_STATUS} className={cssOf(css.stage)}><Loading text={t(stageKey)} /></div>}
      <div className={columns}>
        <ReviewPane pane={PANE_RESUME} head={t('tr.resume')} p={p} t={t} onEdit={p.onResumeEdit}>
          <ReviewPdf key={p.focus}
            url={base + PANE_RESUME + tail}
            quotes={resumeQuotesOf(p.review)}
            active={p.active}
            zoomed={p.focus === PANE_RESUME}
            setActive={p.setActive}
            t={t} />
        </ReviewPane>
        <ReviewPane pane={PANE_COVER} head={t('tr.cover')} p={p} t={t} onEdit={p.onCoverEdit}>
          <ReviewPdf key={p.focus}
            url={base + PANE_COVER + tail}
            quotes={coverQuotesOf(p.review)}
            active={p.active}
            zoomed={p.focus === PANE_COVER}
            setActive={p.setActive}
            t={t} />
        </ReviewPane>
        <div className={cssOf(css.side)}>
          <ReviewPane pane={PANE_JD} head={t('tr.jd')} p={p} t={t} onEdit={null}>
            <ReviewJd p={p} review={p.review} t={t} />
          </ReviewPane>
          <ReviewPane pane={PANE_MAIL} head={t('tr.mailHead')} p={p} t={t} onEdit={p.onMailEdit}>
            <ReviewMail p={p} x={props} />
          </ReviewPane>
        </div>
      </div>
      <ReviewFoot p={p} x={props} />
      <ReviewDrawers p={p} t={t} />
    </>
  )
}
