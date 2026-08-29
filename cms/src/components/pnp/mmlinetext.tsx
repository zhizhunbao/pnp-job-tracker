'use client'
/**
 * 域内小件:依据链一格里的一行(主文案 + 灰注 + 行尾灰注)。
 * #175(Frank「这种还是不要用括号了」):译名不再括号包,改灰注跟在主文案后;
 * #147:NOC 官方英文名做主文案、界面语言译名与 NOC 码做灰注 —— 代码不裸奔。
 * 2026-08-28 换装批自 Pnp.tsx 的 MeansForMe 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { NOTE_GAP, SPACE, TEXT_NONE } from './constants'
import type { MmLineTextIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一行。
 *
 * @param props 洗好的这一行。
 * @returns 主文案与两条灰注。
 */
export function MmLineText({ line }: MmLineTextIn) {
  return (
    <>
      {line.main}
      {line.note !== TEXT_NONE && <span className={css.note}>{NOTE_GAP}{line.note}</span>}
      {line.tail !== TEXT_NONE && <span className={css.note}>{SPACE}{line.tail}</span>}
    </>
  )
}
