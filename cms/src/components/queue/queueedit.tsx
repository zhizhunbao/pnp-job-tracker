'use client'
/**
 * 「改信」弹框(2026-10-08 UX 批:原「改信」跳去投递区,整块页面换掉):多行框就地改,保存回队列,信还在队列里,改完直接投出。
 *
 * @author Frank
 * @time 2026-10-08 20:00:00
 */
import { Button } from '@/components/button'
import { Modal } from '@/components/modal'
import { BTN_PRIMARY, BTN_SECONDARY, ERR_NONE } from './constants'
import type { QueueEditIn } from './types'
import css from './queue.module.css'

/**
 * 渲染改信弹框。
 *
 * @param props 整机面板与取词函数。
 * @returns 弹框。
 */
export function QueueEdit({ p, t }: QueueEditIn) {
  return (
    <Modal onClose={p.onEditClose}>
      <div className={css.editTitle}>{t('qu.edit')}</div>
      <textarea className={css.editArea}
        value={p.editText}
        onChange={p.onEditText}
        aria-label={t('qu.edit')}
        spellCheck />
      {p.err !== ERR_NONE && <div className={css.err}>{t(p.err)}</div>}
      <div className={css.editFoot}>
        <Button kind={BTN_SECONDARY} sm onClick={p.onEditClose}>{t('rf.cancel')}</Button>
        <Button kind={BTN_PRIMARY} sm onClick={p.onEditSave} disabled={p.busy} busy={p.busy}>{t('qu.save')}</Button>
      </div>
    </Modal>
  )
}
