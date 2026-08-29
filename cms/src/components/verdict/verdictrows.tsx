'use client'
/**
 * verdict 域的结构:一串判定瓦片(裸瓦片,不自带栅格 —— 它要跟事实瓦片挤同一副
 * 四列栅格流式续排:2026-08-14 Frank「为什么这个三个卡片一行」,先前两组各自起行 3+2,
 * 并进一个栅格后 4+1)。引擎给了本域没排版的行键就整块跳过,不硬拼一句话出来。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的 rowTiles 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { rowLabelOf, rowSubOf, rowTextOf, rowTileStateOf } from './functions'
import { VerdictRow } from './verdictrow'
import type { VerdictRowsIn } from './types'

/**
 * 渲染一串判定瓦片。
 *
 * @param props 取词函数、界面语言与要渲的判定行(逐格注释见 VerdictRowsIn)。
 * @returns 判定瓦片们。
 */
export function VerdictRows({ t, lang, rows }: VerdictRowsIn) {
  const tiles = []
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    if (row == null) {
      continue
    }
    const text = rowTextOf({ t, lang, row })
    if (text == null) {
      continue
    }
    tiles.push(
      <VerdictRow key={row.key + String(i)}
        state={rowTileStateOf({ row, text })}
        label={rowLabelOf({ t, key: row.key })}
        main={text.main}
        sub={rowSubOf({ text })} />,
    )
  }
  return <>{tiles}</>
}
