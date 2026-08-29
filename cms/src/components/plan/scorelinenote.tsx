'use client'
/**
 * plan 域的小件:估分卡的提示框。两个色档各说各的一件事 ——
 * 绿 = 这条线你真够得着;素色 = 其余全部(够不着、取决于加分项、这一刻还没有分可摆)。
 * 「够不着」刻意不染红:加分项还没勾满时那个数随时会变,染红等于替用户下结论。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 的 Box 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP, TONE_OK } from './constants'
import type { ScoreLineNoteIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一个估分卡提示框。
 *
 * @param props 色档与框里那句话。
 * @returns 提示框。
 */
export function ScoreLineNote({ tone, children }: ScoreLineNoteIn) {
  let skin = css.lineNoteMute
  if (tone === TONE_OK) {
    skin = css.lineNoteOk
  }
  return <div className={cssOf(css.lineNote) + CLS_SEP + cssOf(skin)}>{children}</div>
}
