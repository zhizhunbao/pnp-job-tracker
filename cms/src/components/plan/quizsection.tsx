'use client'
/**
 * plan 域的结构:问卷 = **一个弹框、两段**(2026-08-13 Frank:「开始估分不应该和申请人条件
 * 合并到一起吗?为什么单独一个弹框」)——基础段(职业/8 项/省份)答完直接翻进估分段,
 * 不关框、不换框。
 * 弹框壳**不能用 Modal**:分值卡的答案与结果都在它的本地 state,同一个实例既要在框里出题、
 * 又要在收框后于结论卡内出结果 —— 搬容器 = React 重挂 = 答案清零。所以这里不搬树,
 * 只**就地换皮**:同一对 div,开框时套统一壳的遮罩/白卡,收框时退回普通块。
 * 注册闸(2026-08-14 Frank「答题之前还是需要用户先注册」;二改「怎么把登录内嵌到答题弹框了」):
 * 未登录点任何答题入口 → 答题壳不换皮,弹**标准 AuthModal**(与顶栏同一个,08-09「别跳页」拍板)。
 * 无岗态本段长在估分卡尾部;带岗态经 scoreSlot 长在判定卡②尾部 —— 两态互斥。
 * 2026-08-28 换装批自 Decision.tsx 的 quizSection 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { AuthModal } from '@/components/auth'
import { QuizStyle } from '@/components/quiz'
import { QuizHead } from './quizhead'
import { QuizSteps } from './quizsteps'
import { QuizTools } from './quiztools'
import { ScoreHolder } from './scoreholder'
import { AUTH_MODE_REGISTER } from './constants'
import { cardClsOf, overlayClickOf, overlayClsOf, quizSectionClsOf, stopClickOf, tablesPendingOf } from './functions'
import type { QuizSectionIn } from './types'
import css from './plan.module.css'

/**
 * 渲染问卷整段(遮罩 + 白卡 + 两段内容 + 常驻的分值卡)。
 *
 * @param props 决策页整机与热门职业榜。
 * @returns 问卷整段。
 */
export function QuizSection({ d, topNocs }: QuizSectionIn) {
  const shown = d.flow.open && d.auth.me === true
  const scoreStep = d.flow.scoreStep
  return (
    <div className={quizSectionClsOf({ shown, progress: d.progress, score: d.score })}>
      <QuizStyle />
      {d.flow.open && d.auth.me === false && (
        <AuthModal t={d.t} mode={AUTH_MODE_REGISTER} hero={d.t('dp.authGate')}
          onClose={d.acts.onAuthClose} onDone={d.acts.onAuthDone} />
      )}
      <div onClick={overlayClickOf({ shown, close: d.acts.closeQuiz })} className={overlayClsOf({ shown })}>
        <div onClick={stopClickOf({ shown })} className={cardClsOf({ shown })}>
          {shown && <QuizTools d={d} />}
          {shown && <QuizHead d={d} />}
          {shown && scoreStep === false && (
            <div ref={d.pad.padRef}><QuizSteps d={d} topNocs={topNocs} /></div>
          )}
          {shown && scoreStep && tablesPendingOf(d) && <div aria-hidden className={css.quizSkeleton} />}
          <ScoreHolder d={d} open={d.flow.open} scoreStep={scoreStep} />
        </div>
      </div>
    </div>
  )
}
