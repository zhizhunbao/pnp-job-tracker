'use client'
/**
 * 域内小件:卡片名字两行 —— 英文黑字主文案 + 界面语译名灰字(2026-10-08 名字一律英文在上、译名灰字在下;
 * 英文界面只出一行)。
 *
 * @author Frank
 * @time 2026-10-12 17:30:00
 */
import { TEXT_NONE } from './constants'
import type { NameLinesIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染名字两行。
 *
 * @param props 英文名与译名。
 * @returns 名字块。
 */
export function NameLines({ en, gray }: NameLinesIn) {
  return (
    <span className={css.names}>
      <span className={css.nameEn}>{en}</span>
      {gray !== TEXT_NONE && <span className={css.nameGray}>{gray}</span>}
    </span>
  )
}
