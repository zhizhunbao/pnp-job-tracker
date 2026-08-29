'use client'
/**
 * plan 域的结构:分值卡的常驻容器。分值卡的答案与结果都在它的本地 state —— 基础段答题时
 * 只藏不卸载,收框后它就地变回卡内的「各省估分」结果区。搬容器 = React 重挂 = 答案清零,
 * 所以这里只换类不搬树。
 * 2026-08-28 换装批自 Decision.tsx 的分值卡容器提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { PnpScoreCard } from './pnpscorecard'
import { scoreHolderClsOf, scoreShownOf, streamsOf } from './functions'
import type { ScoreHolderIn } from './types'

/**
 * 渲染分值卡容器。
 *
 * @param props 决策页整机与弹框的两个开关。
 * @returns 容器(基础卷没答满或所选省一张表都没有时,里面是空的)。
 */
export function ScoreHolder({ d, open, scoreStep }: ScoreHolderIn) {
  const card = d.view.scoreCard
  return (
    <div className={scoreHolderClsOf({ open, scoreStep, me: d.auth.me })}>
      {scoreShownOf({ progress: d.progress, prov: d.view.prov }) && (
        <PnpScoreCard key={card.key} t={d.t} lang={d.lang}
          ctx={card.ctx} factors={d.view.prov.targetFactors} draws={d.view.prov.scoreDraws}
          streams={streamsOf({ tvJob: d.tvJob, province: card.contextProvince })}
          initial={card.initial} hiddenProfileInputs={card.hidden} limits={card.limits} targetMode
          questionnaireActive={open && d.auth.me === true && scoreStep}
          focusQuestion={d.score.focus}
          onQuestionnaireProgress={d.acts.onScoreProgress}
          onQuestionnaireAnswers={d.acts.onScoreAnswers}
          onQuestionnaireComplete={d.acts.onScoreComplete}
          onQuestionnaireBack={d.acts.onScoreBack} />
      )}
    </div>
  )
}
