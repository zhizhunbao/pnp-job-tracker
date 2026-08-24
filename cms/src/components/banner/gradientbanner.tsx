'use client'
/**
 * banner 域的渐变带形态:不传图/图挂时的兜底(原形态,发布零风险)——
 * 浅色模块渐变 + 模块色标题一行排开。
 * 2026-08-24 自 ui/Banner.tsx 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { moduleClsOf } from './functions'
import type { GradientBannerIn } from './types'
import css from './banner.module.css'

/**
 * 渐变带。
 *
 * @param props 模块/图标/标题/副题/右槽。
 * @returns 渐变带页头。
 */
export function GradientBanner({ module, icon, title, sub, right }: GradientBannerIn) {
  return (
    <div className={`${css.band} ${moduleClsOf(module)}`}>
      <h1 className={css.h1}>{icon}{title}</h1>
      {sub != null && <span className={css.bandSub}>{sub}</span>}
      {right != null && <span className={css.bandRight}>{right}</span>}
    </div>
  )
}
