/**
 * 官网那条工种的进度行(2026-09-20 Frank「就是 AI 探索的时候,显示 抓取官网,然后才是生成内容 和 翻译。如果没有官网先 探索官网和 wiki」
 * 「这些思考过程都放到一行呢」):全部步骤一行横排 —— 做完的打勾变灰,正在做的转圈(通用 Loading 件),没到的灰字不带记号。
 * 效果图与状态词见 docs/design/点开优先抓取与纠错-20260920.md。
 *
 * @author Frank
 * @time 2026-09-20 21:30:00
 */
import { cssOf } from '@/components/css'
import { Loading } from '@/components/loading'
import { STEP_CHECK, STEP_DONE, STEP_NOW } from './constants'
import { siteStepsOf } from './functions'
import type { CompanyStepsIn } from './types'
import css from './companies.module.css'

/**
 * 进度行。
 *
 * @param props 办到哪一步、有没有官网、界面语言与取词函数(逐格注释见 CompanyStepsIn)。
 * @returns 一行步骤。
 */
export function CompanySteps({ stage, hasSite, lang, t }: CompanyStepsIn) {
  const steps = siteStepsOf({ stage, hasSite, lang })
  return (
    <div className={cssOf(css.steps)}>
      {steps.map(function renderStep(s) {
        if (s.state === STEP_NOW) {
          return <Loading key={s.key} text={t(s.label)} />
        }
        return (
          <span key={s.key} className={cssOf(css.step)}>
            {s.state === STEP_DONE && <span>{STEP_CHECK}</span>}
            {t(s.label)}
          </span>
        )
      })}
    </div>
  )
}
