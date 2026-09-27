'use client'
/**
 * 域内小件:本省抽选卡的横排格子(标签在上、值在下;值可以是新开页链接)。
 * 2026-09-26 晚 Frank「这个要所有省和通道的格式保持一致吧」「所有通道不是用的一个组件吗」立:三种抽选卡
 * (分组卡本岗那一组 / 安省现状 / 新斯科舍按月)原先各排各的 —— 本岗那组用通用 Grid 三格、另两种是「项 | 值」两列竖排加底部链接 ——
 * 收成这一件;一行放不下自动折行(手机上新斯科舍八格)。末格「来源」是官方页链接。
 * 同晚 Frank「上面这个高亮是不是格式改成和下面的一样的」:分组卡本岗那一组改成组头行,这一件只剩安省现状与新斯科舍按月两种卡在用;
 * 「来源」挪到卡片标题那一行右端(DrawsHead),链接格随之撤,格子只剩纯文字。
 *
 * @author Frank
 * @time 2026-09-26 23:07:35
 */
import type { FeatCellsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一排格子。
 *
 * @param props 各格。
 * @returns 格子行。
 */
export function FeatCells({ cells }: FeatCellsIn) {
  const items = []
  for (const c of cells) {
    items.push(
      <span key={c.k} className={css.featCell}>
        <span className={css.featK} title={c.tip}>{c.k}</span>
        <span className={css.featV}>{c.v}</span>
      </span>,
    )
  }
  return <div className={css.featCells}>{items}</div>
}
