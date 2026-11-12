'use client'
/**
 * apply 桶子桶 review 的分块:修改邮件正文的右侧栏(2026-11-11 Frank「应该是用户可以编辑吧」)。
 * 一个文本框(纯文本,上限 MAIL_MAX 个字符),底下「保存」「恢复默认」「取消」;恢复默认 = 不再用改过的那一份,照默认正文发。
 * 改过的正文只跟着这一封投递,换职位不带过去。
 *
 * @author Frank
 * @time 2026-11-12 01:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Drawer } from '@/components/drawer'
import { Notice } from '@/components/notice'
import { BTN_SECONDARY, MAIL_MAX, MAIL_ROWS, NOTICE_ERR, TEXT_NONE } from './constants'
import type { ReviewDrawerIn } from './types'
import css from './review.module.css'

/**
 * 修改邮件正文的右侧栏。
 *
 * @param props 整机与取词。
 * @returns 开着时的右侧栏,否则空。
 */
export function ReviewMailEdit({ p, t }: ReviewDrawerIn) {
  if (p.mailDraft == null) {
    return null
  }
  return (
    <Drawer title={t('tr.editMail')}
      onClose={p.onMailClose}
      foot={(
        <>
          <Button onClick={p.onMailSave} disabled={p.mailDraft.trim() === TEXT_NONE}>{t('gate.save')}</Button>
          <Button kind={BTN_SECONDARY} onClick={p.onMailReset}>{t('tr.mailReset')}</Button>
          <Button kind={BTN_SECONDARY} onClick={p.onMailClose}>{t('pf.cancel')}</Button>
        </>
      )}>
      {p.err !== TEXT_NONE && <Notice kind={NOTICE_ERR}>{t(p.err)}</Notice>}
      <textarea className={cssOf(css.area)}
        rows={MAIL_ROWS}
        maxLength={MAIL_MAX}
        value={p.mailDraft}
        onChange={p.onMailText}
        aria-label={t('tr.editMail')} />
    </Drawer>
  )
}
