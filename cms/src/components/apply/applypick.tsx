'use client'
/**
 * 第 1 步里一份简历一行:单选框、文件名、默认小标、上传日期(2026-10-07 按岗选简历)。
 *
 * @author Frank
 * @time 2026-10-07 07:00:00
 */
import { DEFAULT_KEY, INPUT_RADIO, RADIO_NAME } from './constants'
import { uploadedTextOf } from './functions'
import type { ApplyPickIn } from './types'
import css from './apply.module.css'

/**
 * 一份简历一行。
 *
 * @param props 这一份、选中没有、选用手柄与取词函数。
 * @returns 一行。
 */
export function ApplyPick({ r, checked, onPick, t }: ApplyPickIn) {
  return (
    <label className={css.pick}>
      <input type={INPUT_RADIO} name={RADIO_NAME} checked={checked} onChange={onPick} />
      <span className={css.pickName}>{r.fileName}</span>
      {r.isDefault && <span className={css.pickTag}>{t(DEFAULT_KEY)}</span>}
      <span className={css.pickNote}>{uploadedTextOf({ t, at: r.uploadedAt })}</span>
    </label>
  )
}
