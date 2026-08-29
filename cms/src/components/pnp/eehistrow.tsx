'use client'
/**
 * 域内小件:一个类别的一条历史轮次(日期 / 分数线 / 邀请数)。
 * #135(Frank「应该有个下拉箭头,点开按时间线看每一轮」)。
 * 2026-08-28 换装批自 Pnp.tsx 的 EeCategorySection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { TimeText } from '@/components/time'
import type { HistRowViewIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一条历史轮次。
 *
 * @param props 洗好的这一行。
 * @returns 历史轮次行。
 */
export function EeHistRow({ r }: HistRowViewIn) {
  return (
    <div className={css.histRow}>
      <TimeText iso={r.iso} />
      <span className={css.fedCrs}>{r.crs}</span>
      <span className={css.histIta}>{r.ita}</span>
    </div>
  )
}
