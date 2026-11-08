'use client'
/**
 * me 桶子桶 settings 的一行:左名字、中值、右钮(照效果图 docs/design/我的/账户设置-20261107.md 2.1)。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */
import { cssOf } from '@/components/css'
import type { SettingsRowIn } from './types'
import css from './settings.module.css'

/**
 * 渲染一行。
 *
 * @param props 名字、值与钮。
 * @returns 一行。
 */
export function SettingsRow({ label, value, act }: SettingsRowIn) {
  return (
    <div className={cssOf(css.row)}>
      <span className={cssOf(css.label)}>{label}</span>
      <span className={cssOf(css.value)}>{value}</span>
      {act}
    </div>
  )
}
