'use client'
/**
 * 域内小件:省提名弹框的「申请步骤」卡 —— 标题行(左标题、右来源)+ 编号竖排的各步(StepItem)。
 * 2026-10-02 申请步骤批 1(Frank「选拔方式 应该 step by step 吧」「每个省 每个通道 EE PNP AIP 都要有吧」「还是别改小版本了」;
 * 效果图 docs/design/申请步骤效果图-20261002.html):10-01 统一骨架第 ⑤ 张由「抽选」换成它,本岗通道登了步骤才出(stepsCardOf)。
 * 2026-10-02 申请步骤批 2:收抽选表与开合,递给引用 draws 的那一步(StepItem 挂 DrawGroupsBody);资讯页每条通道也用这一件(ProvStepsCard)。
 *
 * @author Frank
 * @time 2026-10-02 22:30:00
 */
import { DrawsHead } from './drawshead'
import { StepItem } from './stepitem'
import type { PnpStepsCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「申请步骤」卡。
 *
 * @param props 洗好的卡、取词函数、抽选表与它的开合。
 * @returns 步骤卡。
 */
export function PnpStepsCard({ spec, t, draws, open, toggleOf }: PnpStepsCardIn) {
  const items = []
  for (const step of spec.steps) {
    items.push(<StepItem key={step.key} step={step} t={t} draws={draws} open={open} toggleOf={toggleOf} />)
  }
  return (
    <div className={css.card}>
      <DrawsHead title={spec.title} source={spec.source} />
      <ol className={css.steps}>{items}</ol>
    </div>
  )
}
