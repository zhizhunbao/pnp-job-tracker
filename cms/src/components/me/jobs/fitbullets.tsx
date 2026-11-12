'use client'
/**
 * me 桶子桶 jobs 的哑单元格:推荐指数的几条要点(网页端在这一行下面的细行里(fitdetail.tsx),手机一条在公司与薪资那一行下面;
 * 2026-11-11 Frank「直接那一列,列 bullets」;同日改成点胶囊才展开,默认收着)。
 *
 * @author Frank
 * @time 2026-11-11 23:59:00
 */
import { cssOf } from '@/components/css'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染要点。
 *
 * @param r 这一行的展示行。
 * @returns 一列要点;没有推荐指数、收着或一条都没有不渲。
 */
export function FitBullets(r: ListRow) {
  if (r.fit == null || r.fit.open === false || r.fit.bullets.length === 0) {
    return null
  }
  const out = []
  for (const b of r.fit.bullets) {
    out.push(<li key={b}>{b}</li>)
  }
  return <ul className={cssOf(css.fitBullets)}>{out}</ul>
}
