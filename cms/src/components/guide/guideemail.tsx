'use client'
/**
 * 留邮箱的一行:邮箱框 + 发送钮;失败在下面一行说。邮箱只在用户主动填时才发。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconArrowUp } from '@/components/icons'
import { EMAIL, EMAIL_MAX, INPUT_EMAIL, PLAIN_BTN_KIND, SEND_ICON_PX, TEXT_NONE } from './constants'
import { makeEmailInput, makeEmailSendClick } from './functions'
import type { GuideEmailIn } from './types'
import css from './guide.module.css'

/**
 * 邮箱框一行。
 *
 * @param props 面板、这一轮与轮位。
 * @returns 邮箱框整块。
 */
export function GuideEmail({ p, turn, i }: GuideEmailIn) {
  const sending = turn.email === EMAIL.sending
  return (
    <div className={css.cbOpts}>
      <div className={css.cbEmailRow}>
        <input className={css.cbEmailIn}
          type={INPUT_EMAIL}
          value={turn.emailDraft}
          maxLength={EMAIL_MAX}
          placeholder={p.t('chat.emailPh')}
          disabled={sending}
          onChange={makeEmailInput({ p, i })} />
        <Button kind={PLAIN_BTN_KIND}
          className={cssOf(css.cbSend)}
          disabled={sending || turn.emailDraft.trim() === TEXT_NONE}
          onClick={makeEmailSendClick({ p, i })}
          ariaLabel={p.t('chat.send')}
          title={p.t('chat.send')}>
          <IconArrowUp size={SEND_ICON_PX} />
        </Button>
      </div>
      {turn.email === EMAIL.fail && <div className={css.cbOptWhy}>{p.t('chat.emailFail')}</div>}
    </div>
  )
}
