'use client'
/**
 * 榜单导航里的一格。#210(第 26 轮):当前榜原来也是链到自己的 `<a>`(点不动的链接,
 * 同 #205 页签)→ 当前榜渲成不可点的粗黑字。与页头同名不算废话:这是「你在哪一榜」的
 * 定位,删了反而不知道站在哪。
 * 2026-08-28 换装批自 Ranking.tsx 的导航循环体提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import type { RankTabIn } from './types'
import css from './rankings.module.css'

/**
 * 导航一格。
 *
 * @param props 这一格(榜名、地址与当前态)。
 * @returns 当前榜的粗黑字,或去别的榜的链接。
 */
export function RankTab({ r }: RankTabIn) {
  if (r.current) {
    return <span className={css.tabNow}>{r.label}</span>
  }
  return <LinkButton href={r.href} className={cssOf(css.tabLink)}>{r.label}</LinkButton>
}
