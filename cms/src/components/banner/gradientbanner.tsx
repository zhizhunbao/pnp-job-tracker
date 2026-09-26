'use client'
/**
 * banner 域的渐变带形态:不传图/图挂时的兜底(原形态,发布零风险)——
 * 浅色模块渐变 + 模块色标题一行排开。
 * 2026-08-24 自 ui/Banner.tsx 拆出(一个 tsx 一个组件)。
 * 2026-09-26 /fe 首页:外框随 compact 挂窄屏紧凑档类 —— 图挂了回落到这里时,窄屏照样是那一行(见 banner.module.css 末段)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import { boxClsOf } from './functions'
import type { GradientBannerIn } from './types'
import css from './banner.module.css'

/**
 * 渐变带。
 *
 * @param props 模块/图标/标题/副题/右槽/紧凑档。
 * @returns 渐变带页头。
 */
export function GradientBanner({ module, icon, title, sub, right, compact }: GradientBannerIn) {
  return (
    <div className={boxClsOf({ base: cssOf(css.band), module, compact })}>
      <h1 className={css.h1}>{icon}{title}</h1>
      {sub != null && <span className={css.bandSub}>{sub}</span>}
      {right != null && <span className={css.bandRight}>{right}</span>}
    </div>
  )
}
