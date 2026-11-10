'use client'
/**
 * apply 桶子桶 review 的分块:底部一行。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { isSenderName, mailSubjectOf, mailTextOf } from '@/lib/apply'
import { Notice } from '@/components/notice'
import { BTN_GHOST, COLON_SEP, NOTICE_ERR, ONE_SPACE, TEXT_NONE } from './constants'
import type { ReviewFootIn } from './types'
import css from './review.module.css'

/**
 * 底部一行:收件信息、错误与发送钮。
 * 2026-11-09 Frank 定的投递动线:多一行「已自动保存,可在我的投递里继续」和小入口「改投基础简历」;
 * 要现填姓名而姓名还不合规时发送钮禁用(邮件主题里的姓名不能为空)。
 *
 * @param props 整机与收发信息。
 * @returns 一行。
 */
export function ReviewFoot({ p, x }: ReviewFootIn) {
  const parts = { title: x.title, city: x.city, province: x.province, name: x.name }
  const mailText = mailTextOf({ title: x.title, city: x.city, province: x.province, name: x.name, cover: true })
  const nameBad = x.askName && isSenderName(x.name.trim()) === false
  return (
    <>
      {p.err !== TEXT_NONE && <Notice kind={NOTICE_ERR}>{x.t(p.err)}</Notice>}
      <div className={cssOf(css.foot)}>
        <div className={cssOf(css.sendTo)}>
          <div>{x.t('tr.to')}{ONE_SPACE}{x.to}</div>
          <div>{x.t('tr.subject')}{COLON_SEP}{mailSubjectOf(parts)}</div>
          <details className={cssOf(css.mailMore)}>
            <summary>{x.t('tr.mailBody')}</summary>
            <div className={cssOf(css.mailBody)}>{mailText}</div>
          </details>
          {x.askName && (
            <input className={cssOf(css.nameInput)}
              value={x.name}
              onChange={x.onName}
              aria-label={x.t('ap.name')}
              placeholder={x.t('ap.name')} />
          )}
          <div className={cssOf(css.saved)}>
            <span>{x.leftText}</span>
            <span>{x.t('ap.autoSaved')}</span>
            <Button kind={BTN_GHOST} sm onClick={x.onBase} disabled={p.stage !== TEXT_NONE}>{x.t('ap.toBase')}</Button>
          </div>
        </div>
        <Button onClick={p.onSend} busy={p.sending} disabled={p.stage !== TEXT_NONE || p.review == null || nameBad}>
          {x.t('tr.send')}
        </Button>
      </div>
    </>
  )
}
