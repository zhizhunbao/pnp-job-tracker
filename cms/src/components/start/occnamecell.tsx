'use client'
/**
 * 职业榜「职业」列的单元格:蓝字职业名链接(点开落到按该 NOC 筛过的职位板 —— 每行可溯源),
 * 名字下面挂一行官方英文名灰注(#309 主次对调:人话名主文案 + 官方名灰注,站规)。
 * Frank 2026-08-06「职业名字要显示完整,右面有很多空间」:不截断不省略,长名自然折行
 * (数字列全 nowrap,表格仍不会横滚;折行只发生在主列自己的宽度里)。
 * 2026-08-28 换装批自 Pulse.tsx 的 occ 列 render 提出成文件。
 * 2026-11-05 Frank「是不是 英文在上,中文灰字在下啊。然后超链接加到 英文上」:改走全站名字两行 Name(英文链接在上、界面语言名灰字在下);
 * 点击埋点挂外层,接链接冒上来的点击。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Name } from '@/components/name'
import type { OccCellRow } from './types'

/**
 * 渲染职业榜「职业」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 英文职业名链接,以及有灰注时的界面语言名。
 */
export function OccNameCell(r: OccCellRow) {
  return (
    <div onClick={r.onView}>
      <Name en={r.main} sub={r.note} href={r.href} />
    </div>
  )
}
