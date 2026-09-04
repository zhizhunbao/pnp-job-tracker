'use client'
/**
 * 域内小件:「考过」弹框 —— 考试日(必填,默认今天)+ 考试回忆(选填),确认即记一条考试记录
 * (免审;有回忆文字的显示在留言区)。Frank 2026-09-04「点考过应该显示这样一个弹框」「功能保持一致样式可以不一样」。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { Button } from '@/components/button'
import { Modal } from '@/components/modal'
import {
  INPUT_DATE, KIND_PRIMARY, KIND_SECONDARY, MODAL_SM, RECALL_MAX, RECALL_ROWS, STATE_BUSY, TEXT_NONE,
} from './constants'
import type { PteExamModalIn } from './types'
import css from './pte.module.css'

/**
 * 渲染「考过」弹框。
 *
 * @param props 取词函数与评论面板。
 * @returns 弹框。
 */
export function PteExamModal({ t, c }: PteExamModalIn) {
  return (
    <Modal onClose={c.onExamCancel} size={MODAL_SM} resizable={false}>
      <div className={css.examBox}>
        <div className={css.examTitle}>{t('pte.c.examTitle')}</div>
        <label className={css.label}>{t('pte.c.date')}</label>
        <input type={INPUT_DATE} className={css.examInput} value={c.examDate} onChange={c.onExamDate} />
        <label className={css.label}>{t('pte.c.recall')}</label>
        <textarea className={css.noteBox}
          rows={RECALL_ROWS}
          maxLength={RECALL_MAX}
          value={c.examRecall}
          onChange={c.onExamRecall} />
        <div className={css.btns}>
          <Button kind={KIND_SECONDARY} onClick={c.onExamCancel}>{t('pte.c.cancel')}</Button>
          <Button kind={KIND_PRIMARY}
            onClick={c.onExamSubmit}
            disabled={c.examState === STATE_BUSY || c.examDate === TEXT_NONE}>
            {t('pte.c.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
