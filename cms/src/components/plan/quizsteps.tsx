'use client'
/**
 * plan 域的结构:基础段三页的分派(选职业 / 选目标省 / 一屏一题)。
 * 还没选职业时无条件停在第一页 —— 后面的题都以「选了什么职业」为前提。
 * 2026-08-28 换装批自 Decision.tsx 的三页三目分派提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { FormStep } from './formstep'
import { OccStep } from './occstep'
import { ProvStep } from './provstep'
import { TEXT_NONE } from './constants'
import type { QuizStepsIn } from './types'

/**
 * 分派到基础段的某一页。
 *
 * @param props 决策页整机与热门职业榜。
 * @returns 当前这一页。
 */
export function QuizSteps({ d, topNocs }: QuizStepsIn) {
  if (d.answers.occStep || d.answers.noc === TEXT_NONE) {
    return <OccStep d={d} topNocs={topNocs} />
  }
  if (d.answers.provinceStep) {
    return <ProvStep d={d} topNocs={topNocs} />
  }
  return <FormStep d={d} topNocs={topNocs} />
}
