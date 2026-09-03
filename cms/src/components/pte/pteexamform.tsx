'use client'
/**
 * 域内小件:「我考到了」表单一行(考试日默认今天、城市选填、发送 / 取消 + 结果提示)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { CITY_MAX, INPUT_DATE, INPUT_TEXT, KIND_PRIMARY, KIND_SECONDARY, STATE_BUSY, TEXT_NONE } from './constants'
import { examHintOf } from './functions'
import type { PteExamFormIn } from './types'
import css from './pte.module.css'

/**
 * 渲染「我考到了」表单。
 *
 * @param props 取词函数与评论面板。
 * @returns 表单一行 + 提示。
 */
export function PteExamForm({ t, c }: PteExamFormIn) {
  const hint = examHintOf({ t, s: c.examState })
  return (
    <>
      <div className={css.examForm}>
        <input type={INPUT_DATE}
          className={css.input}
          value={c.examDate}
          onChange={c.onExamDate}
          aria-label={t('pte.c.date')} />
        <input type={INPUT_TEXT}
          className={css.input}
          value={c.examCity}
          onChange={c.onExamCity}
          maxLength={CITY_MAX}
          placeholder={t('pte.c.city')}
          aria-label={t('pte.c.city')} />
        <Button kind={KIND_PRIMARY} onClick={c.onExamSubmit} disabled={c.examState === STATE_BUSY}>
          {t('pte.c.send')}
        </Button>
        <Button kind={KIND_SECONDARY} onClick={c.onExamToggle}>{t('pte.c.cancel')}</Button>
      </div>
      {hint !== TEXT_NONE && <div className={css.hint}>{hint}</div>}
    </>
  )
}
