'use client'
/**
 * 域内小件:Pro 列的锁位。#152 锁位统一打码(Frank「应该给他打上马赛克那种」;#130 详情页
 * 先例推广到表格):每列一个**写死的假占位数**,blur 掉 ——「这儿有个数」比一把锁更能说明
 * 值多少。真值免费态压根不出服务端,占位数是假的,扒开也没用;悬停按列说人话(hover 就知道
 * 锁着什么)。
 * 2026-08-28 换装批自 Table.tsx 的 cellOf 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST } from './constants'
import { IconLock } from '@/components/icons'
import type { LockCellIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染 Pro 锁位。
 *
 * @param props 打码占位数、悬停说明与点开升级弹框。
 * @returns 一枚打码占位 + 锁。
 */
export function LockCell({ mask, title, onUpsell }: LockCellIn) {
  return (
    <Button kind={BTN_GHOST} title={title} onClick={onUpsell} className={cssOf(css.lock)}>
      <span aria-hidden className={cssOf(css.lockMask)}>{mask}</span>
      <IconLock />
    </Button>
  )
}
