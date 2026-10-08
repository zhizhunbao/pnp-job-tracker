'use client'
/**
 * 「今日待投」的标题行:左「今日待投 N」,右「智能投递」开关(开着才出;没开的在清单底下用「开启智能投递」一颗钮,不用小开关)。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { Switch } from '@/components/button'
import type { QueueHeadIn } from './types'
import css from './queue.module.css'

/**
 * 渲染标题行。
 *
 * @param props 整机面板与取词函数。
 * @returns 标题 + 开关。
 */
export function QueueHead({ p, t }: QueueHeadIn) {
  return (
    <div className={css.head}>
      <div className={css.title}>
        {t('qu.title')}
        {p.state.auto && p.state.items.length > 0 && <span className={css.count}>{p.state.items.length}</span>}
      </div>
      {p.state.auto && <Switch on label={t('qu.auto')} disabled={p.busy} onClick={p.onToggle} />}
    </div>
  )
}
