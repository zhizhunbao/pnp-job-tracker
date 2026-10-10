'use client'
/**
 * 编辑模式最后一题「英文姓名」(2026-10-09「我的档案」批):投递署名,与今日待投设置清单、投递流同一格(apply_prefs.sender_name)。
 * 选填;填了不合规(只许英文字母、空格、点、撇号、连字符,2~60 字)输入框下面出一行原因、「保存」点不动。
 *
 * @author Frank
 * @time 2026-10-09 22:30:00
 */
import { cssOf } from '@/components/css'
import { Input } from '@/components/input'
import { GATE_NAME_BAD_KEY, GATE_NAME_PH, GATE_NAME_Q_KEY } from './constants'
import type { GatePartIn } from './types'
import css from './gate.module.css'

/**
 * 英文姓名那一屏。
 *
 * @param props 整机面板与取词函数。
 * @returns 输入框(不合规时带一行原因)。
 */
export function GateName({ g, t }: GatePartIn) {
  return (
    <div className={cssOf(css.nameBox)}>
      <Input value={g.edit.name} onChange={g.edit.onName} placeholder={GATE_NAME_PH} ariaLabel={t(GATE_NAME_Q_KEY)} />
      {g.edit.nameBad && <div className={cssOf(css.fail)}>{t(GATE_NAME_BAD_KEY)}</div>}
    </div>
  )
}
