/**
 * 几行字:要点行带记号缩进,普通行顶格(分区卡、条目、预览纸面共用)。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import type { CvLinesIn } from './types'
import css from './cv.module.css'

/**
 * 几行字。
 *
 * @param props 各行。
 * @returns 各行;没有给空。
 */
export function CvLines({ lines }: CvLinesIn) {
  if (lines.length === 0) {
    return null
  }
  const rows = []
  for (const [i, l] of lines.entries()) {
    if (l.bullet) {
      rows.push(<div key={i} className={css.bullet}>{l.text}</div>)
    } else {
      rows.push(<div key={i} className={css.line}>{l.text}</div>)
    }
  }
  return <div>{rows}</div>
}
