'use client'
/**
 * 域内哑单元格:政策动态表「操作」格 —— 一枚「官方页」钮开这条新闻的官方来源页
 * (2026-09-13 Frank「政策动态 也加一个操作列」;标题主文案仍落站内详情页,形照抽选表 DrawActCell)。
 * 钮的类随行带来(actBtnCls),哑单元格不 import functions,免循环依赖。
 *
 * @author Frank
 * @time 2026-09-13 16:00:00
 */
import { LinkButton } from '@/components/button'
import { NEW_TAB } from './constants'
import type { NewsCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染政策动态表的操作格。
 *
 * @param r 一条。
 * @returns 一枚钮。
 */
export function NewsActCell(r: NewsCellRow) {
  return (
    <span className={css.acts}>
      <LinkButton href={r.officialHref} className={r.actBtnCls} target={NEW_TAB}>{r.actLinkText}</LinkButton>
    </span>
  )
}
