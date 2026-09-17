'use client'
/**
 * button 族的分段钮组外框 SegGroup:把几颗 kind="seg" 的 Button 挤成一组共用描边圆角。
 * 2026-09-16 Frank 拍板职位正文「整理版 | 原文」切换时立件;页头语言切换(header 的 langWrap)是同形存量,换装批再收。
 *
 * @author Frank
 * @time 2026-09-16 20:30:00
 */
import { cssOf } from '@/components/css'
import { GROUP_ROLE } from './constants'
import type { SegGroupIn } from './types'
import css from './button.module.css'

/**
 * 分段钮组。
 *
 * @param props 组内的分段钮。
 * @returns 一组分段钮。
 */
export function SegGroup({ children }: SegGroupIn) {
  return <span role={GROUP_ROLE} className={cssOf(css.segGroup)}>{children}</span>
}
