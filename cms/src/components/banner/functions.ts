/**
 * banner 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import type { BannerModule, DotPickFn, DotPickIn } from './types'
import css from './banner.module.css'

/**
 * 模块 → 配色档类(查表,键完整性由 Record<BannerModule, string> 管)。
 * home 复用 jobs 档:主品牌蓝,与 jobs 同档不发明新色(L1-01 landing 拍板)——
 * 映射收在这一处,css 里不用抄第二份渐变值。
 *
 * @param module 模块名。
 * @returns 配色档 className。
 */
export function moduleClsOf(module: BannerModule): string {
  const moduleCls: Record<BannerModule, string> = {
    home: cssOf(css.jobs),
    jobs: cssOf(css.jobs),
    pathways: cssOf(css.pathways),
    rank: cssOf(css.rank),
    stats: cssOf(css.stats),
    news: cssOf(css.news),
  }
  return moduleCls[module]
}

/**
 * 造一颗圆点的点击手柄(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 自 BannerDots 的循环体内迁出)。逐项手柄要闭包住自己那一格图序,走工厂形态。
 *
 * @param x 切图回调与这一颗点的图序。
 * @returns 挂到这颗点上的 onClick。
 */
export function makeDotPick(x: DotPickIn): DotPickFn {
  function pickThis() {
    x.pick(x.i)
  }

  return pickThis
}
