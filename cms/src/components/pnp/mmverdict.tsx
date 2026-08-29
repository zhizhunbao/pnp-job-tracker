'use client'
/**
 * 域内小件:依据链的判定药丸。底色随判定 —— 裸色字浮在白底上没有归属感。
 * #106:依据链的官方来源 ↗ 外链撤(归拢到 /resources),所以药丸外面只剩这一层壳。
 * 措辞红线在洗行时落地:只说「符合/不符合公开清单条件」「高于/低于抽选线」,永不说「你能/不能移民」。
 * 2026-08-28 换装批自 Pnp.tsx 的 MeansForMe 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { DASH, TEXT_NONE } from './constants'
import { mmPillClsOf, tipMarkOf } from './functions'
import type { MmVerdictIn } from './types'
import { VerdictIcon } from './verdicticon'
import css from './pnp.module.css'

/**
 * 渲染依据链的判定药丸。
 *
 * @param props 判定档、话术与悬停提示。
 * @returns 药丸;这条不给判定时渲空值符。
 */
export function MmVerdict({ tone, text, tip }: MmVerdictIn) {
  if (text === TEXT_NONE || text === DASH) {
    return <span className={css.dash}>{DASH}</span>
  }
  return (
    <span className={css.vWrap}>
      <span title={tip} className={mmPillClsOf(tone)}>
        <VerdictIcon tone={tone} /> {text}{tipMarkOf(tip)}
      </span>
    </span>
  )
}
