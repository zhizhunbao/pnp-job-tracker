'use client'
/**
 * 域内哑单元格:「雇佣期」格 —— Permanent / Fixed-term / Seasonal / Casual 英文 + 界面语灰字(数据层归一值;2026-10-10 批 2,16d)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { Name } from '@/components/name'
import { TEXT_NONE } from './constants'
import type { ListRow } from './types'

/**
 * 渲染雇佣期格。
 *
 * @param r 这一行的展示行。
 * @returns 两行名;没标是空格。
 */
export function TermCell(r: ListRow) {
  if (r.termEn === TEXT_NONE) {
    return null
  }
  return <Name en={r.termEn} sub={r.termSub} />
}
