'use client'
/**
 * me 桶子桶 profile 的结构:「我的通道」表的通道格(2026-10-13):官方英文名蓝字 + 界面语名灰字(name 桶 Name),点了叠门槛与步骤弹框。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { Name } from '@/components/name'
import type { MyStreamCellRow } from './types'

/**
 * 渲染通道格。
 *
 * @param r 这一行。
 * @returns 两行名。
 */
export function MyStreamNameCell(r: MyStreamCellRow) {
  return <Name en={r.title} sub={r.sub} onOpen={r.onOpen} />
}
