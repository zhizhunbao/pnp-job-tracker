'use client'
/**
 * 域内小件:匹配视图状态条(E5-05)。只报「高」(第 6 轮 #23):中匹配门槛宽、数字动辄数千,
 * 报出来像灌水,反而稀释高匹配的可信度。匹配全放开(Frank 2026-07-21):不再报「免费仅前 N」
 * 封顶 —— 只留「今日 N 个高匹配」纯信息。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, EXIT_CROSS } from './constants'
import { IconTarget } from '@/components/icons'
import type { MatchBarIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染匹配视图状态条。
 *
 * @param props 口径说明、退出钮文案与退出手柄。
 * @returns 一条蓝底状态条。
 */
export function MatchBar({ text, exit, onExit }: MatchBarIn) {
  return (
    <div className={cssOf(css.mvBar)}>
      <span className={cssOf(css.mvText)}><IconTarget />{text}</span>
      <Button kind={BTN_GHOST} onClick={onExit} className={cssOf(css.mvExit)}>{exit}{EXIT_CROSS}</Button>
    </div>
  )
}
