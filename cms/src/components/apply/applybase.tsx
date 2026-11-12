'use client'
/**
 * 基础简历投递屏(2026-11-09 Frank「直接投基础简历:附基础简历原件;求职信用固定模板填职位名、公司名、用户姓名,
 * 不调模型,可改;不耗额度」):两张分区卡(简历原件预览、求职信),下面一张邮件卡,框底发送。
 * 2026-11-11 Frank「这两个能共用一个样式和弹框吗」:改用三屏对照的那套外框(review 子桶的 ReviewFrame)—— 左简历原件、
 * 中求职信、右栏上职位描述下邮件、底部按钮行;行为(信失焦自动存、发送)照旧在本桶的整机里。11-10「基础简历屏用小窗口」随之作废,
 * 和三屏对照一样开大窗。
 *
 * @author Frank
 * @time 2026-11-09 23:30:00
 */
import { Button } from '@/components/button'
import { Row } from '@/components/row'
import { isSenderName } from '@/lib/apply'
import { ApplyShow } from './applyshow'
import { ReviewFrame } from './review'
import {
  AUTOCOMPLETE_NAME, CHAR_SEP, CHECK_TO, ERR_NONE, MIME_PDF, NAME_MAX_LEN, SUBJECT_KEY, TEXT_NONE,
} from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 基础简历投递屏。
 *
 * @param props 整机面板。
 * @returns 三栏外框:简历原件、求职信、职位描述与邮件,底部发送钮。
 */
export function ApplyBase({ p }: ApplyStepIn) {
  const nameBad = p.askName && isSenderName(p.name.trim()) === false
  const resume = (
    <>
      {p.resumeSrc !== TEXT_NONE && p.resumeMime === MIME_PDF && (
        <div className={css.baseShow}><ApplyShow key={p.resumeSrc} src={p.resumeSrc} t={p.t} /></div>
      )}
      {p.resumeSrc !== TEXT_NONE && p.resumeMime !== MIME_PDF && <div className={css.note}>{p.t('ap.noPv')}</div>}
    </>
  )
  const cover = (
    <>
      <textarea className={`${css.letter} ${css.baseLetter}`}
        value={p.letter}
        onChange={p.onLetter}
        onBlur={p.onBaseBlur}
        aria-label={p.t('ap.letter')}
        spellCheck />
      {p.badChars.length > 0 && <div className={css.bad}>{p.t('ap.badChars')} {p.badChars.join(CHAR_SEP)}</div>}
    </>
  )
  const mail = (
    <>
      <Row k={p.t('ap.name')}>
        {p.askName && (
          <input className={css.input}
            value={p.name}
            onChange={p.onName}
            autoComplete={AUTOCOMPLETE_NAME}
            maxLength={NAME_MAX_LEN}
            aria-label={p.t('ap.name')} />
        )}
        {p.askName === false && p.name}
      </Row>
      <Row k={p.t(CHECK_TO)}>{p.mail.to}</Row>
      <Row k={p.t(SUBJECT_KEY)}>{p.mail.subject}</Row>
    </>
  )
  const bar = (
    <>
      <span className={css.saved}>
        {p.err !== ERR_NONE && <span className={css.barErr}>{p.t(p.err)}</span>}
        {p.err === ERR_NONE && p.tailored === false && p.t('ap.autoSaved')}
      </span>
      <Button onClick={p.onBaseSend} busy={p.busy} disabled={nameBad || p.badChars.length > 0}>
        {p.t('tr.send')}
      </Button>
    </>
  )
  return (
    <ReviewFrame t={p.t}
      jobId={p.job.id}
      resumeHead={p.t('ap.baseResume')}
      resumeNote={p.resumeName}
      resume={resume}
      coverHead={p.t('ap.letter')}
      cover={cover}
      mailHead={p.t('ap.mailPv')}
      mail={mail}
      bar={bar} />
  )
}
