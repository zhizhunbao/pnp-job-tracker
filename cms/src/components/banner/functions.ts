/**
 * banner 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { BannerModule } from './types'
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
    home: css.jobs,
    jobs: css.jobs,
    pathways: css.pathways,
    rank: css.rank,
    stats: css.stats,
    news: css.news,
  }
  return moduleCls[module]
}
