'use client'
/**
 * me 桶子桶 inbox 的结构:站内回信框(全站窗口形弹框:收件人一行、正文框、失败说明、取消 / 发送)。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Modal, ModalHead } from '@/components/modal'
import { Row } from '@/components/row'
import {
  CARD_MD_CLS, IB_MODAL_H, IB_MODAL_PREF, IB_MODAL_W, PRIMARY_KIND, REPLY_MAX, REPLY_ROWS, SECONDARY_KIND, TEXT_NONE,
} from './constants'
import { senderLineOf, subjectOf } from './functions'
import type { InboxReadIn } from './types'
import css from './inbox.module.css'

/**
 * 回信框。
 *
 * @param props 收件箱状态、回的那一封与取词。
 * @returns 弹框。
 */
export function InboxReply({ p, m, t }: InboxReadIn) {
  const head = <ModalHead kicker={t('ib.reply')} title={subjectOf({ m, t })} sub={TEXT_NONE} ctl={null} />
  return (
    <Modal onClose={p.onReplyClose} win={{ head, memo: IB_MODAL_PREF, w: IB_MODAL_W, h: IB_MODAL_H, jd: false }}>
      <div className={CARD_MD_CLS}>
        <Row k={t('ap.to')}>{senderLineOf(m)}</Row>
        <textarea className={cssOf(css.ibCompose)} value={p.replyText} onChange={p.onReplyText} rows={REPLY_ROWS}
          maxLength={REPLY_MAX} aria-label={t('ib.reply')} />
        {p.replyNote !== TEXT_NONE && <div className={cssOf(css.ibNote)}>{p.replyNote}</div>}
        <div className={cssOf(css.ibActs)}>
          <Button kind={SECONDARY_KIND} onClick={p.onReplyClose}>{t('ib.cancel')}</Button>
          <Button kind={PRIMARY_KIND} onClick={p.onReplySend} disabled={p.replyText.trim() === TEXT_NONE}
            busy={p.replyBusy}>{t('ib.send')}</Button>
        </div>
      </div>
    </Modal>
  )
}
