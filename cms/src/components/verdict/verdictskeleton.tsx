'use client'
/**
 * verdict 域的结构:判定面板的加载占位(铁律:加载区必占位)。
 * SSR 进来时判定已经有值,这块根本不出 —— 它只在纯客户端入口(职位板弹窗)露面。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的占位块提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { SKEL_ROWS } from './constants'
import css from './verdict.module.css'

/**
 * 渲染加载占位。
 *
 * @returns 三根灰横条的一张卡。
 */
export function VerdictSkeleton() {
  const bars = []
  for (let i = 0; i < SKEL_ROWS; i += 1) {
    bars.push(<div key={i} className={css.skelBar} />)
  }
  return <div className={css.skelCard} aria-hidden>{bars}</div>
}
