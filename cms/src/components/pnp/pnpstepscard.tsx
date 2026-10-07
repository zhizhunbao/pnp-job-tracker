'use client'
/**
 * 域内小件:省提名弹框的「申请步骤」卡 —— 标题行(左标题、右来源)+ 编号竖排的各步(StepItem)。
 * 2026-10-02 申请步骤批 1(Frank「选拔方式 应该 step by step 吧」「每个省 每个通道 EE PNP AIP 都要有吧」「还是别改小版本了」;
 * 效果图 docs/design/申请步骤效果图-20261002.html):10-01 统一骨架第 ⑤ 张由「抽选」换成它,本岗通道登了步骤才出(stepsCardOf)。
 * 2026-10-02 申请步骤批 2:收抽选表与开合,递给引用 draws 的那一步(StepItem 挂 DrawGroupsBody);资讯页每条通道也用这一件(ProvStepsCard)。
 * 2026-10-03 资讯页签四分:标题下可有一行灰字(spec.sub,资讯页「申请步骤」页签写通道的界面语言名,同门槛卡那一行);弹框这格为空,样子不变。
 * 2026-10-04 多收一格 mark(抽选表本通道那组标不标浅蓝底),原样递给各步:弹框传 true,资讯页「申请步骤」页签传 false。
 *
 * @author Frank
 * @time 2026-10-02 22:30:00
 */
import { TEXT_NONE } from './constants'
import { DrawsHead } from './drawshead'
import { StepItem } from './stepitem'
import type { PnpStepsCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「申请步骤」卡。
 *
 * @param props 洗好的卡、取词函数、抽选表、它的开合与蓝底开关。
 * @returns 步骤卡。
 */
export function PnpStepsCard({ spec, t, draws, open, toggleOf, mark }: PnpStepsCardIn) {
  const items = []
  for (const step of spec.steps) {
    items.push(<StepItem key={step.key} step={step} t={t} draws={draws} open={open} toggleOf={toggleOf} mark={mark} />)
  }
  return (
    <div className={css.card}>
      <DrawsHead title={spec.title} source={spec.source} jump={spec.jump} />
      {spec.sub !== TEXT_NONE && <div className={css.drawsBasis}>{spec.sub}</div>}
      <ol className={css.steps}>{items}</ol>
    </div>
  )
}
