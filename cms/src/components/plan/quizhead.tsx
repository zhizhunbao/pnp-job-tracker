'use client'
/**
 * plan 域的结构:问卷弹框头(标题 + 省名 + 计数 + 进度条)。
 * 头随**当前段**走(2026-08-16 Frank「这个回答的是估分的问题,应该不是你的条件的问题了」):
 * 基础段 = 申请人条件,估分段 = 估分与抽选线 + 省名;计数与进度条也各算各的,
 * 不再拿两段合计的 23/36 去描述用户眼前这一段。
 * 2026-08-28 换装批自 Decision.tsx 的弹框头提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { CountPill } from './countpill'
import { TEXT_NONE } from './constants'
import { barLabelOf, barStyleOf, provDispOf, quizTitleKeyOf } from './functions'
import type { QuizHeadIn } from './types'
import css from './plan.module.css'

/**
 * 渲染弹框头与进度条。
 *
 * @param props 决策页整机。
 * @returns 弹框头。
 */
export function QuizHead({ d }: QuizHeadIn) {
  const onScore = d.flow.scoreStep
  return (
    <>
      <div className={css.quizHead}>
        <h2 className={css.h2Flat}>{d.t(quizTitleKeyOf({ scoreStep: onScore }))}</h2>
        {onScore && d.score.prov !== TEXT_NONE && (
          <span className={css.quizProv}>{provDispOf({ t: d.t, code: d.score.prov })}</span>
        )}
        {onScore && <CountPill t={d.t} done={d.progress.scoreDone} total={d.progress.scoreTotal} />}
        {onScore === false && d.answers.ready && (
          <CountPill t={d.t} done={d.progress.stepDone} total={d.progress.stepTotal} />
        )}
      </div>
      <div aria-label={barLabelOf({ progress: d.progress, scoreStep: onScore })} className={css.quizBar}>
        {/* eslint-disable-next-line react/forbid-dom-props -- 运行时数据:进度百分比逐帧变,类是有限枚举装不下 */}
        <div className={css.quizBarFill} style={barStyleOf({ progress: d.progress, scoreStep: onScore })} />
      </div>
    </>
  )
}
