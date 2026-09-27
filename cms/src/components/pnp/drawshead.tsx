'use client'
/**
 * 域内小件:本省抽选卡标题那一行 —— 左边卡标题,右端「来源」灰字 + 站名链接(新开页)。
 * 2026-09-26 晚 Frank「上面这个高亮是不是格式改成和下面的一样的」立:分组卡本岗那一组改成组头行,原先挂在它格子末格的「来源」
 * 没了去处;Frank「来源是不是也放到条上」→ 选「标题那一行右端」(三种卡都有标题,对不上本岗那一组的省也放得下);
 * 又问「每个通道 link 不一样吧」—— 抽选数据每省只来自一个官方页,各通道同一个链接,一张卡一条就够。
 * 安省现状、新斯科舍按月两种卡同走这一件。
 *
 * @author Frank
 * @time 2026-09-27 00:05:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK } from './constants'
import type { DrawsHeadIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染抽选卡标题那一行。
 *
 * @param props 卡标题与官方来源。
 * @returns 标题行。
 */
export function DrawsHead({ title, source }: DrawsHeadIn) {
  return (
    <div className={css.headRow}>
      <div className={css.cardHead}>{title}</div>
      {source != null && (
        <span className={css.srcRow}>
          <span className={css.srcK}>{source.label}</span>
          <LinkButton href={source.href} target={TARGET_BLANK} className={cssOf(css.srcLink)}>{source.text}</LinkButton>
        </span>
      )}
    </div>
  )
}
