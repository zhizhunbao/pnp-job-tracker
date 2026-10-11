'use client'
/**
 * 回信框(2026-10-10 批 3「回复」):通用 modal 桶的窗口形,叠在收件箱 / 阅读框上(关只关这一层)。标题栏「回复」+ 信的标题;
 * 一张分区卡:收件人一行、正文文字区,底下「取消」「发送」。经平台发出(回复地址 = 本人专属投递邮箱,接上那一串);
 * 没发出去出一句,字不丢。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { Button } from '@/components/button'
import { Modal, ModalHead } from '@/components/modal'
import { Row } from '@/components/row'
import {
  CARD_MD_CLS, MODAL_H, MODAL_PREF, MODAL_W, REPLY_KIND, REPLY_MAX, REPLY_ROWS, SUB_KIND, TEXT_NONE,
} from './constants'
import { senderLineOf, subjectOf } from './functions'
import type { InboxModalIn } from './types'
import css from './inbox.module.css'

/**
 * 回信框。
 *
 * @param props 整机面板、回的那一封与取词函数。
 * @returns 窗口形弹框。
 */
export function ReplyBox({ p, m, t }: InboxModalIn) {
  const head = <ModalHead kicker={t('ib.reply')} title={subjectOf({ m, t })} sub={TEXT_NONE} ctl={null} />
  return (
    <Modal onClose={p.onReplyClose} win={{ head, memo: MODAL_PREF, w: MODAL_W, h: MODAL_H, jd: false }}>
      <div className={CARD_MD_CLS}>
        <Row k={t('ap.to')}>{senderLineOf(m)}</Row>
        <textarea className={css.compose} value={p.replyText} onChange={p.onReplyText} rows={REPLY_ROWS}
          maxLength={REPLY_MAX} aria-label={t('ib.reply')} />
        {p.replyNote !== TEXT_NONE && <div className={css.replyNote}>{p.replyNote}</div>}
        <div className={css.composeActs}>
          <Button kind={SUB_KIND} sm onClick={p.onReplyClose}>{t('ib.cancel')}</Button>
          <Button kind={REPLY_KIND} sm onClick={p.onReplySend} disabled={p.replyText.trim() === TEXT_NONE}
            busy={p.replyBusy}>{t('ib.send')}</Button>
        </div>
      </div>
    </Modal>
  )
}
