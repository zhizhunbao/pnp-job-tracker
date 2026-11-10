'use client'
/**
 * 基础简历投递屏(2026-11-09 Frank「直接投基础简历:附基础简历原件;求职信用固定模板填职位名、公司名、用户姓名,
 * 不调模型,可改;不耗额度」):两张分区卡(简历原件预览、求职信),下面一张邮件卡,框底发送。
 *
 * @author Frank
 * @time 2026-11-09 23:30:00
 */
import { Button } from '@/components/button'
import { Row } from '@/components/row'
import { isSenderName } from '@/lib/apply'
import { ApplyShow } from './applyshow'
import {
  AUTOCOMPLETE_NAME, CARD_HEAD_CLS, CARD_MD_CLS, CHAR_SEP, CHECK_TO, ERR_NONE, MIME_PDF, NAME_MAX_LEN, SUBJECT_KEY,
  TEXT_NONE,
} from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 基础简历投递屏。
 *
 * @param props 整机面板。
 * @returns 简历原件、求职信、邮件三张卡与发送钮。
 */
export function ApplyBase({ p }: ApplyStepIn) {
  const nameBad = p.askName && isSenderName(p.name.trim()) === false
  return (
    <>
      <div className={css.baseGrid}>
        <div className={CARD_MD_CLS}>
          <div className={CARD_HEAD_CLS}>{p.t('ap.baseResume')}</div>
          <div className={css.note}>{p.resumeName}</div>
          {p.resumeSrc !== TEXT_NONE && p.resumeMime === MIME_PDF && (
            <div className={css.basePv}><ApplyShow key={p.resumeSrc} src={p.resumeSrc} t={p.t} /></div>
          )}
          {p.resumeSrc !== TEXT_NONE && p.resumeMime !== MIME_PDF && <div className={css.note}>{p.t('ap.noPv')}</div>}
        </div>
        <div className={CARD_MD_CLS}>
          <div className={CARD_HEAD_CLS}>{p.t('ap.letter')}</div>
          <textarea className={`${css.letter} ${css.baseLetter}`}
            value={p.letter}
            onChange={p.onLetter}
            onBlur={p.onBaseBlur}
            aria-label={p.t('ap.letter')}
            spellCheck />
          {p.badChars.length > 0 && <div className={css.bad}>{p.t('ap.badChars')} {p.badChars.join(CHAR_SEP)}</div>}
        </div>
      </div>
      <div className={CARD_MD_CLS}>
        <div className={CARD_HEAD_CLS}>{p.t('ap.mailPv')}</div>
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
      </div>
      {p.err !== ERR_NONE && <div className={css.err}>{p.t(p.err)}</div>}
      <div className={css.foot}>
        {p.tailored === false && <span className={css.saved}>{p.t('ap.autoSaved')}</span>}
        <Button onClick={p.onBaseSend} busy={p.busy} disabled={nameBad || p.badChars.length > 0}>
          {p.t('tr.send')}
        </Button>
      </div>
    </>
  )
}
