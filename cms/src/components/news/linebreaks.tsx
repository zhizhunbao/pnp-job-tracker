'use client'
/**
 * 域内小件:段内换行保真(P1c)—— 官方公文的联系人块那类靠单个换行排版,
 * 直接丢进 `<p>` 会被折成一行。段与段的分隔在 parasOf 里已经切好,这里只管段内。
 * 2026-08-27 换装批自 News.tsx 的 withBreaks 提出成件(它产 JSX,本来就是个组件)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LINE_SEP } from './constants'
import type { LineBreaksIn } from './types'

/**
 * 把一段正文按单个换行渲成多行。
 *
 * @param props 一段正文。
 * @returns 逐行的片段(行与行之间一个 `<br>`)。
 */
export function LineBreaks({ text }: LineBreaksIn) {
  const out = []
  const lines = text.split(LINE_SEP)
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line != null) {
      out.push(<span key={i}>{line}{i < lines.length - 1 && <br />}</span>)
    }
  }
  return (
    <>{out}</>
  )
}
