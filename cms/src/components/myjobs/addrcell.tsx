'use client'
/**
 * 域内哑单元格:「地址」格 —— 照 Indeed 一行完整地址(整行一个 Google 地图链)+ 「市译名,省译名」灰字
 * (2026-10-10 批 2,三张清单网页端表格形;手机卡 MjCard 也摆它)。
 * 2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」:打码行(r.locked)出模糊假街址 + 省码。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { Name } from '@/components/name'
import { TEXT_NONE } from './constants'
import type { ListRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染地址格。
 *
 * @param r 这一行的展示行。
 * @returns 一行地址(+ 灰字);没有地点是空格。
 */
export function AddrCell(r: ListRow) {
  if (r.locked) {
    return <span aria-hidden className={css.blur}>{r.address}</span>
  }
  if (r.addressHref === TEXT_NONE) {
    return null
  }
  return <Name en={r.address} sub={r.addressSub} href={r.addressHref} />
}
