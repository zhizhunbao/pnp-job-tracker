'use client'
/**
 * verdict 域的结构:「你的条件」卡 —— 判定拿什么算的 + 全部条件列齐,每格可点进答题。
 * 带岗态**不再重复摆问卷卡**(设计 §5「输入面只留一个,多一个就又是两套主语」):
 * 答过几项收成这张卡,右上角一枚钮就是改答案的入口。
 * 各省估分整段并在卡尾(2026-08-13 Frank:「合并到申请人条件模块,不需要单独一个框」)——
 * 它内部有本地答题 state,所以整张卡不许包在会重挂的容器里。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的卡②提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { AnswerAction } from './answeraction'
import { AnswerTitle } from './answertitle'
import { ConditionGrid } from './conditiongrid'
import { GRID_ID_COND } from './constants'
import { VerdictCard } from './verdictcard'
import { makeBuildProfile, makeEditAnswers, makeTileEdit } from './functions'
import type { AnswerCardIn } from './types'

/**
 * 渲染「你的条件」卡。
 *
 * @param props 取词函数、档案态、条件行与三只手柄(逐格注释见 AnswerCardIn)。
 * @returns 条件格与估分整段的一张卡。
 */
export function AnswerCard({
  t, hasProfile, countPills, answerList, provLabel, scoreSlot, onBuildProfile, onEditAnswers, prefill,
}: AnswerCardIn) {
  return (
    <VerdictCard title={<AnswerTitle t={t} countPills={countPills} />}
      action={
        <AnswerAction t={t}
          hasProfile={hasProfile}
          onEdit={makeEditAnswers({ onEditAnswers, onBuildProfile })}
          onBuild={makeBuildProfile({ onBuildProfile, prefill })} />
      }>
      {answerList.length > 0 && (
        <ConditionGrid rows={answerList}
          provLabel={provLabel}
          ariaLabel={t('dp.prov')}
          idPrefix={GRID_ID_COND}
          onTile={makeTileEdit({ onEditAnswers, onBuildProfile })} />
      )}
      {scoreSlot}
    </VerdictCard>
  )
}
