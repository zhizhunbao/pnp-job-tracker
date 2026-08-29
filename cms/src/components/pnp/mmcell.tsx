'use client'
/**
 * 域内小件:依据链的一格(本岗 / 我的各一格)。
 * 一行的格就地铺开;多行的格(自报的几个职业码、几个目标省)一行一块 —— 值一行放全,
 * 长值窄屏悬挂缩进折行,永不截断省略。
 * 2026-08-28 换装批自 Pnp.tsx 的 MeansForMe 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { CELL_MULTI_MIN } from './constants'
import { MmLineText } from './mmlinetext'
import type { MmCellIn } from './types'

/**
 * 渲染依据链的一格。
 *
 * @param props 洗好的这一格。
 * @returns 一行或几块。
 */
export function MmCell({ cell }: MmCellIn) {
  const multi = cell.lines.length >= CELL_MULTI_MIN
  const out = []
  for (const line of cell.lines) {
    if (multi) {
      out.push(<div key={line.key}><MmLineText line={line} /></div>)
    } else {
      out.push(<MmLineText key={line.key} line={line} />)
    }
  }
  return <>{out}</>
}
