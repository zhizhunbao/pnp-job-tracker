'use client'
/**
 * 域内小件:判定药丸 —— 直判行的统一件(ok 绿=能走 / warn 琥珀 / fail 红=排除 / na 灰=走不了)。
 * 三处消费它:本域的省提名判定卡、字段顾问的 AIP 与试点直判行、薪资对比行。
 * 措辞红线在调用方落地,这里只管长相。
 * 2026-08-28 换装批自 Pnp.tsx 提出成文件(色档 → 类改走查表)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { verdictPillClsOf } from './functions'
import type { VerdictPillIn } from './types'

/**
 * 渲染一枚判定药丸。
 *
 * @param props 色档与药丸里的话。
 * @returns 药丸。
 */
export function VerdictPill({ tone, children }: VerdictPillIn) {
  return <span className={verdictPillClsOf(tone)}>{children}</span>
}
