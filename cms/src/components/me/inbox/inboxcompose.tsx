'use client'
/**
 * me 桶子桶 inbox 的结构:会话底部的回信区(2026-11-07 照 Outlook 网页版:平时只一颗「回复」;点了在原地展开写信框,
 * 「发送」「取消」在框下;发失败说明在框下一行。原先的回信弹框撤)。
 * 2026-11-13 Frank「我的这个排版和 outlook 不一样啊」:平时那颗「回复」挪到来信卡头右上角(见 InboxRead),这里平时不出东西,
 * 点了「回复」才出写信框。
 * 同日 Frank「是不是像 outlook 一样 放到最下面呢?」:改回来 —— 平时会话最下面一颗「回复」,点了原地展开写信框。
 *
 * @author Frank
 * @time 2026-11-07 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMail } from '@/components/icons'
import { PRIMARY_KIND, REPLY_MAX, REPLY_ROWS, SECONDARY_KIND, TEXT_NONE } from './constants'
import { senderOf } from './functions'
import type { InboxReadIn } from './types'
import css from './inbox.module.css'

/**
 * 回信区。
 *
 * @param props 收件箱状态、回的那一封与取词。
 * @returns 「回复」钮或展开的写信框。
 */
export function InboxCompose({ p, m, t }: InboxReadIn) {
  if (p.replying === false) {
    return (
      <div className={cssOf(css.ibReplyRow)}>
        <Button kind={SECONDARY_KIND} onClick={p.onReply} className={cssOf(css.ibReplyBtn)}>
          <IconMail />{t('ib.reply')}
        </Button>
      </div>
    )
  }
  return (
    <div className={cssOf(css.ibCompose)}>
      <textarea className={cssOf(css.ibComposeText)} value={p.replyText} onChange={p.onReplyText} rows={REPLY_ROWS}
        maxLength={REPLY_MAX} aria-label={t('ib.reply')} placeholder={t('ib.replyPh', { name: senderOf(m) })} />
      {p.replyNote !== TEXT_NONE && <div className={cssOf(css.ibNote)}>{p.replyNote}</div>}
      <div className={cssOf(css.ibComposeActs)}>
        <Button kind={PRIMARY_KIND} onClick={p.onReplySend} disabled={p.replyText.trim() === TEXT_NONE}
          busy={p.replyBusy}>{t('ib.send')}</Button>
        <Button kind={SECONDARY_KIND} onClick={p.onReplyClose}>{t('ib.cancel')}</Button>
      </div>
    </div>
  )
}
