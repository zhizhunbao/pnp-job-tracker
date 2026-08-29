'use client'
/**
 * 域内小件:条数下拉(抽选表与政策动态共用一把)。数据 SSR 已多取,前端只切片;
 * 数据撑不住两档就整只不出(只剩一档 = 没得选)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { TOPN_LABEL_HEAD, TOPN_MIN_OPTS } from './constants'
import { makeTopNChange, topnOptsOf, topnSelClsOf } from './functions'
import type { TopNIn } from './types'

/**
 * 渲染条数下拉。
 *
 * @param props 当前档位、换档手柄与数据条数。
 * @returns 下拉;档位不足两档时给 null。
 */
export function TopN({ v, on, max }: TopNIn) {
  const opts = topnOptsOf(max)
  if (opts.length < TOPN_MIN_OPTS) {
    return null
  }
  const items = []
  for (const n of opts) {
    items.push(<option key={n} value={n}>{TOPN_LABEL_HEAD}{n}</option>)
  }
  return (
    <select className={topnSelClsOf()} value={v} onChange={makeTopNChange({ set: on })}>
      {items}
    </select>
  )
}
