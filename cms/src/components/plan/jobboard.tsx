'use client'
/**
 * plan 域的结构:带岗态的主干。带岗进入后,三项判定就是本页结果,不再自动套一层弹窗;
 * 条件在上、结果在下,修改后原地重算。
 * **必须等本地答案读完**:不等就渲的话,新用户首帧先看到判定面板、水合后又被答题卡顶掉 ——
 * 闪一下不说,还白打一次 tv-open + 一次判定请求,把「有多少人真看了判定」这个数顶虚
 * (2026-08-11 umami session 实录)。服务端已经把判定算好了就**不必等** ——
 * 那道闸是为了防闪烁,而带岗态如今根本不摆答题卡,顶不掉。
 * 面板**常驻不卸载**(问卷弹框壳与分值卡如今都并在判定卡②里):开弹框时不藏面板 ——
 * 藏了连弹框一起看不见,遮罩本来就盖在它上面。
 * 名额竞争留在事实区(判定卡流里插九省大表会把结论挤走);#321 那条「带岗态补渲竞争卡」
 * 2026-08-16 Frank「这个怎么显示两次」撤销 —— 它们本来就在这儿渲。
 * 2026-08-28 换装批自 Decision.tsx 的带岗态分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { TripleVerdictPanel } from '@/components/verdict'
import { CompetitionCard } from './competitioncard'
import { CountPill } from './countpill'
import { OccCompCard } from './occcompcard'
import { PlanCard } from './plancard'
import { QuizSection } from './quizsection'
import type { JobBoardIn } from './types'

/**
 * 渲染带岗态主干。
 *
 * @param props 决策页整机、热门职业榜与服务端先算好的判定。
 * @returns 带岗态的判定面板与两张竞争卡。
 */
export function JobBoard({ d, topNocs, initialVerdict }: JobBoardIn) {
  return (
    <>
      {(d.answers.ready || initialVerdict != null) && d.tvJob != null && (
        <div>
          <TripleVerdictPanel job={d.tvJob} lang={d.lang}
            profileComplete={d.progress.quizComplete}
            refreshKey={d.flow.verdictNonce}
            initial={initialVerdict}
            countPills={d.answers.ready && <CountPill t={d.t} done={d.progress.doneAll} total={d.progress.totalAll} />}
            answerList={d.view.cond.summaryRows}
            planSlot={<PlanCard d={d} />}
            scoreSlot={<QuizSection d={d} topNocs={topNocs} />}
            onBuildProfile={d.acts.onBuildProfile}
            onEditAnswers={d.acts.startQuiz} />
        </div>
      )}
      <OccCompCard d={d} />
      <CompetitionCard d={d} />
    </>
  )
}
