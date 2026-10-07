'use client'
/**
 * 域内小件:本省抽选卡标题那一行 —— 左边卡标题,右端「来源」灰字 + 站名链接(新开页)。
 * 2026-09-26 晚 Frank「上面这个高亮是不是格式改成和下面的一样的」立:分组卡本岗那一组改成组头行,原先挂在它格子末格的「来源」
 * 没了去处;Frank「来源是不是也放到条上」→ 选「标题那一行右端」(三种卡都有标题,对不上本岗那一组的省也放得下);
 * 又问「每个通道 link 不一样吧」—— 抽选数据每省只来自一个官方页,各通道同一个链接,一张卡一条就够。
 * 安省现状、新斯科舍按月两种卡同走这一件。
 * 2026-09-27 Frank「这个来源看着很突兀 按钮」→ 选「描边小钮」:「来源」灰字 + 蓝色站名换成一颗描边小钮「来源 ↗」(button 桶 secondary + sm,
 * 站名长短不一、蓝字抢标题);配额卡、门槛卡同走这一件,三张卡同一个样子。
 * 2026-10-04 资讯页门槛卡 ↔ 步骤卡互跳(Frank「通道和申请步骤 之前 互相 是不是应该有个按钮能切来切去」→ 勾「卡上加钮 + 页签带省份」):
 * 来源钮左边可多一颗同款站内互跳钮(jump,不新开页);两颗钮包成一组靠右,来源钮照旧在最右端。弹框各卡 jump 为 null,样子不变。
 *
 * @author Frank
 * @time 2026-09-27 00:05:00
 */
import { Button } from '@/components/button'
import { SRC_BTN_KIND, TARGET_BLANK } from './constants'
import type { DrawsHeadIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染抽选卡标题那一行。
 *
 * @param props 卡标题、官方来源与站内互跳钮。
 * @returns 标题行。
 */
export function DrawsHead({ title, source, jump }: DrawsHeadIn) {
  return (
    <div className={css.headRow}>
      <div className={css.cardHead}>{title}</div>
      {(jump != null || source != null) && (
        <span className={css.headBtns}>
          {jump != null && <Button kind={SRC_BTN_KIND} sm href={jump.href}>{jump.text}</Button>}
          {source != null && (
            <Button kind={SRC_BTN_KIND} sm href={source.href} target={TARGET_BLANK}>{source.text}</Button>
          )}
        </span>
      )}
    </div>
  )
}
