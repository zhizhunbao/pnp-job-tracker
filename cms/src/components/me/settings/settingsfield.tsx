'use client'
/**
 * me 桶子桶 settings 的表单格:格名一行、输入框、格下灰字提示。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */
import { cssOf } from '@/components/css'
import type { SettingsFieldIn } from './types'
import css from './settings.module.css'

/**
 * 渲染一个表单格。
 *
 * @param props 格名、提示与输入框。
 * @returns 一格。
 */
export function SettingsField({ label, hint, children }: SettingsFieldIn) {
  return (
    <label className={cssOf(css.field)}>
      <span className={cssOf(css.fieldName)}>{label}</span>
      {children}
      {hint !== '' && <span className={cssOf(css.hint)}>{hint}</span>}
    </label>
  )
}
