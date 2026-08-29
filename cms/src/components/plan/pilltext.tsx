'use client'
/**
 * plan 域的小件:一枚推荐原因胶囊。四个色档各说各的一件事 ——
 * 绿 = 真达标、蓝 = 信息态(「拿到 offer 即可申请」不抢绿)、琥珀 = 明确缺口、
 * 灰 = 本站没收录条文(那是我们的窟窿,不许染成「你不行」)。
 * 2026-08-28 换装批自 Decision.tsx 的 pillSpan 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP, TONE_INFO, TONE_OK, TONE_WARN } from './constants'
import type { PillTextIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一枚推荐原因胶囊。
 *
 * @param props 这枚胶囊。
 * @returns 胶囊。
 */
export function PillText({ p }: PillTextIn) {
  let tone = css.toneMute
  if (p.tone === TONE_OK) {
    tone = css.toneOk
  }
  if (p.tone === TONE_INFO) {
    tone = css.toneInfo
  }
  if (p.tone === TONE_WARN) {
    tone = css.toneWarn
  }
  return <span className={cssOf(css.tonePill) + CLS_SEP + cssOf(tone)}>{p.text}</span>
}
