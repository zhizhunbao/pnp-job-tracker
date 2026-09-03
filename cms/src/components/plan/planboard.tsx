'use client'
/**
 * plan 域的结构:初评的两份视图(手机卡 / 桌面表)加三段脚注。
 * 共有缺项行与「不含排队与审批」脚注 2026-08-16 Frank 拍板删(「都删掉」
 * 「解释类的文字都删了」)—— 列里只剩行间差异,空就空着;四段时长的正解是
 * 建模成数据,不是配解说词。#318 的排除组前端也不渲(服务端照发,「为什么没有 EE」由顾问答)。
 * 粗筛态只留一句说明,不再摆第二颗「继续作答」(2026-08-15 Frank「未登录左下角还有
 * 一个继续作答按钮」):上面那张卡右上角就有同一颗钮,同屏两颗同名钮 = 一件事说两遍。
 * 2026-08-28 换装批自 Decision.tsx 的初评表分支提出成件。
 * 2026-09-03 Frank「所有的 table 右上角都应该有一个更新时间」:表正上方单起一行靠右
 * (卡的标题行 PlanHead 右上角已被两颗动作钮占着,不挤同一行)。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Updated } from '@/components/time'
import { OutsideNote } from './outsidenote'
import { PlanCards } from './plancards'
import { PlanTable } from './plantable'
import type { PlanBoardIn } from './types'
import css from './plan.module.css'

/**
 * 渲染初评的两份视图与脚注。
 *
 * @param props 决策页整机与展示行。
 * @returns 两份视图与脚注。
 */
export function PlanBoard({ d, rows }: PlanBoardIn) {
  const coarse = d.view.plan.coarse
  return (
    <>
      <Updated iso={d.updatedAt} t={d.t} />
      <PlanCards t={d.t} rows={rows} coarse={coarse} />
      <PlanTable t={d.t} rows={rows} coarse={coarse} />
      {d.view.plan.topEmpty && <div className={css.topEmpty}>{d.t('dp.planTopEmpty')}</div>}
      {d.paths.outside != null && <OutsideNote d={d} outside={d.paths.outside} />}
      {coarse && <div className={css.coarseNote}>{d.t('dp.planCoarseNote')}</div>}
    </>
  )
}
