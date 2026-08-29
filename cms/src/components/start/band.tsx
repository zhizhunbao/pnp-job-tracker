'use client'
/**
 * 域内小件:全宽色带 + Shell 内轨(全站统一 1320 正文轨)。一区一事、色带交替
 * (设计 §4 的 S1-S7);二级导航的锚点就落在这一层 div 上,滚动跟随也是按它量位置。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Shell } from '@/components/shell'
import { SHELL_BOTTOM, SHELL_TOP } from './constants'
import { bandClsOf } from './functions'
import type { BandIn } from './types'

/**
 * 渲染一条色带。
 *
 * @param props 锚点 id、三个档位开关与内容。
 * @returns 色带。
 */
export function Band({ id, white = false, hero = false, cta = false, children }: BandIn) {
  return (
    <div id={id} className={bandClsOf({ white, hero, cta })}>
      <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM}>{children}</Shell>
    </div>
  )
}
