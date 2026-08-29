'use client'
/**
 * quiz 域的结构:目标省的一颗药丸(十省与「还不确定」同一副长相)。
 * 2026-08-28 换装批自 ProvincePicker.tsx 的循环体提出成件;内联样式迁 quiz.module.css。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { Button } from '@/components/button'
import { BTN_TYPE, PLAIN_BTN_KIND } from './constants'
import { provPillClsOf } from './functions'
import type { ProvPillIn } from './types'

/**
 * 渲染一颗省药丸。
 *
 * @param props 药丸上的字、选中态与点击手柄。
 * @returns 一颗药丸。
 */
export function ProvPill({ label, on, onPick }: ProvPillIn) {
  return (
    <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE} className={provPillClsOf({ on })} pressed={on} onClick={onPick}>
      {label}
    </Button>
  )
}
