'use client'
/**
 * 域内小件:本省最新公告的一行(日期 + 官方原标题,整条链到 /news/[slug])。
 * 名字不截断 —— 窄位才靠省略号收尾,悬停给全名。
 * 2026-08-28 换装批自 Pnp.tsx 的 NewsLatestBlock 拆出成文件(裸 <a> 改经 button 族的 LinkButton)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import type { NewsRowViewIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一条公告。
 *
 * @param props 洗好的这一行。
 * @returns 公告行。
 */
export function NewsRow({ r }: NewsRowViewIn) {
  return (
    <div className={css.newsRow}>
      <span className={css.newsDate}>{r.date}</span>
      <LinkButton href={r.href} className={cssOf(css.newsLink)} title={r.title}>{r.title}</LinkButton>
    </div>
  )
}
