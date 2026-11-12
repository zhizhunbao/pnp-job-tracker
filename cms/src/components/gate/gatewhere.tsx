'use client'
/**
 * gate 域的结构:所在地弹框的正文 —— 省下拉 + 城市区(搜索框与城市胶囊)。
 * 2026-11-12 Frank「这个也需要弹框吧」:一页表单的所在地一格改成摘要加「修改」,原先直接摆在面板里的这两样挪进叠开的弹框。
 *
 * @author Frank
 * @time 2026-11-12 16:30:00
 */
import { Select } from '@/components/select'
import { FORM_NONE_KEY } from './constants'
import { formProvOptsOf, makeProvLabel } from './functions'
import { GateCities } from './gatecities'
import type { GatePartIn } from './types'

/**
 * 所在地弹框的正文。
 *
 * @param props 整机面板与取词函数。
 * @returns 省下拉与城市区。
 */
export function GateWhere({ g, t }: GatePartIn) {
  return (
    <>
      <Select value={g.provActive} onChange={g.onProv} opts={formProvOptsOf()} all={t(FORM_NONE_KEY)}
        labelOf={makeProvLabel({ t })} />
      <GateCities g={g} t={t} />
    </>
  )
}
