'use client'
/**
 * me 桶子桶 jobs 的结构:网页端推荐表里一行下面的细行 —— 推荐指数的几条要点竖着列(一行一条;原先横排,2026-11-12 Frank「这个竖着列呢」)(通用 Table 的 detailOf)。
 * 2026-11-11 Frank「感觉 table 宽度不够啊」:要点原先列在「推荐指数」格里,那一列占了 176px 把别的列挤窄;
 * 改成那一列只留胶囊,点了胶囊要点在这一行下面跨全列展开,不占列宽。收着或没有推荐指数回 null(不出细行)。
 *
 * @author Frank
 * @time 2026-11-12 00:30:00
 */
import { cssOf } from '@/components/css'
import { FitBullets } from './fitbullets'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染一行下面的要点细行。
 *
 * @param r 这一行的展示行。
 * @returns 竖着列的要点;不出细行给 null。
 */
export function FitDetail(r: ListRow) {
  if (r.fit == null || r.fit.open === false || r.fit.bullets.length === 0) {
    return null
  }
  return <div className={cssOf(css.fitDetail)}>{FitBullets(r)}</div>
}
