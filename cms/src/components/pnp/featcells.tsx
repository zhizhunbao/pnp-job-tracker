'use client'
/**
 * 域内小件:本省抽选卡的横排格子(标签在上、值在下;值可以是新开页链接)。
 * 2026-09-26 晚 Frank「这个要所有省和通道的格式保持一致吧」「所有通道不是用的一个组件吗」立:三种抽选卡
 * (分组卡本岗那一组 / 安省现状 / 新斯科舍按月)原先各排各的 —— 本岗那组用通用 Grid 三格、另两种是「项 | 值」两列竖排加底部链接 ——
 * 收成这一件;一行放不下自动折行(手机上新斯科舍八格)。末格「来源」是官方页链接。
 *
 * @author Frank
 * @time 2026-09-26 23:07:35
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK, TEXT_NONE } from './constants'
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
        {c.href === TEXT_NONE && <span className={css.featV}>{c.v}</span>}
        {c.href !== TEXT_NONE && (
          <LinkButton href={c.href} target={TARGET_BLANK} className={cssOf(css.featLink)}>{c.v}</LinkButton>
        )}
      </span>,
    )
  }
  return <div className={css.featCells}>{items}</div>
}
