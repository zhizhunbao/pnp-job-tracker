'use client'
/**
 * 域内小件:留言表单(输入框 + 发送 + 结果提示;发出去落 pending,过审才显示 —— 提示说的就是这件事)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { KIND_SECONDARY, NOTE_MAX, NOTE_ROWS, STATE_BUSY, TEXT_NONE } from './constants'
import { noteHintOf } from './functions'
import type { PteNoteFormIn } from './types'
import css from './pte.module.css'

/**
 * 渲染留言表单。
 *
 * @param props 取词函数与评论面板。
 * @returns 表单 + 提示。
 */
export function PteNoteForm({ t, c }: PteNoteFormIn) {
  const hint = noteHintOf({ t, s: c.noteState })
  return (
    <>
      <div className={css.noteForm}>
        <textarea className={css.noteBox}
          rows={NOTE_ROWS}
          maxLength={NOTE_MAX}
          value={c.note}
          onChange={c.onNote}
          placeholder={t('pte.c.ph')} />
        <Button kind={KIND_SECONDARY} onClick={c.onNoteSubmit} disabled={c.noteState === STATE_BUSY}>
          {t('pte.c.send')}
        </Button>
      </div>
      {hint !== TEXT_NONE && <div className={css.hint}>{hint}</div>}
    </>
  )
}
