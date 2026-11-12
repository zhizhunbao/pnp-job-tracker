'use client'
/**
 * apply 桶子桶 review 的结构:三栏外框,不带核对(2026-11-11 Frank「这个基础简历的投递弹框,是不是跟非基础的保持一致啊?风格和样式」
 * 「这两个能共用一个样式和弹框吗」)。排法、卡片、底部按钮行都用三屏对照的那一套样式:左简历、中求职信、右栏上职位描述下邮件;
 * 没有匹配分、高亮和点一下放大。内容由用它的一屏递进来,职位描述这里自己取。
 *
 * @author Frank
 * @time 2026-11-12 03:00:00
 */
import { cssOf } from '@/components/css'
import { CLS_CARD_MD, CLS_MCARD_HEAD, NUM_NONE, ONE_SPACE, TEXT_NONE } from './constants'
import { jdRowsOf } from './functions'
import { useJdOnly } from './hooks'
import { noopFixOf, noopPick } from './jdonly'
import { ReviewJdLine } from './reviewjdline'
import type { ReviewFrameIn } from './types'
import css from './review.module.css'

/**
 * 三栏外框(不带核对)。
 *
 * @param props 取词、职位 id、各栏的卡头与内容、底部按钮行的内容。
 * @returns 三栏与底部按钮行。
 */
export function ReviewFrame(props: ReviewFrameIn) {
  const { t, jobId, resumeHead, resumeNote, resume, coverHead, cover, mailHead, mail, bar } = props
  const jd = useJdOnly(jobId)
  const pane = [CLS_CARD_MD, cssOf(css.pane)].join(ONE_SPACE)
  const head = CLS_MCARD_HEAD + ONE_SPACE + cssOf(css.paneHead)
  const rows = []
  for (const [i, row] of jdRowsOf({ jd, reqs: [] }).entries()) {
    rows.push(
      <ReviewJdLine key={i}
        line={row.text}
        head={row.head}
        bullet={row.bullet}
        reqs={[]}
        active={NUM_NONE}
        setActive={noopPick}
        fixOf={noopFixOf}
        t={t} />,
    )
  }
  return (
    <>
      <div className={cssOf(css.grid) + ONE_SPACE + cssOf(css.frame)}>
        <section className={pane}>
          <div className={head}><span>{resumeHead}</span></div>
          {resumeNote !== TEXT_NONE && <div className={cssOf(css.frameNote)}>{resumeNote}</div>}
          <div className={cssOf(css.paper)}>{resume}</div>
        </section>
        <section className={pane}>
          <div className={head}><span>{coverHead}</span></div>
          <div className={cssOf(css.paper)}>{cover}</div>
        </section>
        <div className={cssOf(css.side)}>
          <section className={pane}>
            <div className={head}><span>{t('tr.jd')}</span></div>
            <div className={cssOf(css.paper)}>{rows}</div>
          </section>
          <section className={pane}>
            <div className={head}><span>{mailHead}</span></div>
            {mail}
          </section>
        </div>
      </div>
      <div className={cssOf(css.bar)}>
        <div className={cssOf(css.footRow)}>{bar}</div>
      </div>
    </>
  )
}
