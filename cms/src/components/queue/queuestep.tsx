'use client'
/**
 * 设置清单里的一行:左边打勾(齐了)或空圈(缺),中间项名,右边补的入口(齐了不出)。
 *
 * @author Frank
 * @time 2026-10-08 20:00:00
 */
import { IconCheck } from '@/components/icons'
import type { QueueStepIn } from './types'
import css from './queue.module.css'

/**
 * 渲染一行。
 *
 * @param props 齐了没有、项名与补的入口。
 * @returns 一行。
 */
export function QueueStep({ done, label, action }: QueueStepIn) {
  return (
    <div className={css.step}>
      {done && <span className={css.stepDone}><IconCheck /></span>}
      {done === false && <span className={css.stepTodo} />}
      <span className={css.stepLabel}>{label}</span>
      {done === false && <span className={css.stepAct}>{action}</span>}
    </div>
  )
}
