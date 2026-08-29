'use client'
/**
 * plan 域的结构:「你的初步方案」整张卡。带岗态它是判定卡的**第三张卡**
 * (Frank 2026-08-12 定的卡序:① 这份工作 ② 你的条件 ③ 你的初步方案 ④⑤⑥ 三关 ⑦ 付费),
 * 无岗态原地摆在答题卡下面。
 * 省份消歧(审计 A4 / 设计 B3):这张表按**档案里的目标省**算,带岗时岗位省未必在里面 ——
 * 一张 PE 的岗上摆着 NS/NL 的通道,不说一句就是让人自己去猜(Frank 实拍:
 * 「爱德华王子岛还走 RCIP 还走 EE?」)。**不是警告是消歧**:说清主语,并给一键对齐;
 * 不替他改答案。
 * 职业档粗筛(2026-08-15 Frank「立即出」):只答了职业也出初评 —— 同一引擎、同一张卡,
 * 答满 8 题原地升级成个人档,不是两张卡。
 * 2026-08-28 换装批自 Decision.tsx 的 planCard 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { cssOf } from '@/components/css'
import { PlanBoard } from './planboard'
import { PlanHead } from './planhead'
import { CLS_SEP, TEXT_NONE } from './constants'
import { occTextOf } from './functions'
import type { PlanCardIn } from './types'
import css from './plan.module.css'

/**
 * 渲染「你的初步方案」卡。
 *
 * @param props 决策页整机。
 * @returns 初评卡;初评还没回来时出占位条,一条通道都判不出来时出空态文案。
 */
export function PlanCard({ d }: PlanCardIn) {
  const rows = d.view.plan.rows
  if (d.answers.noc === TEXT_NONE || d.flow.open) {
    return null
  }
  return (
    <div className={cssOf(css.card) + CLS_SEP + cssOf(css.cardWide)}>
      <PlanHead d={d} />
      {d.view.plan.coarse && (
        <div className={css.planCoarseSub}>
          {d.t('dp.planCoarseSub', {
            occ: occTextOf({ t: d.t, lang: d.lang, nocs: d.answers.bands.nocs, titles: d.titles.titles }),
          })}
        </div>
      )}
      {rows == null && <div className={css.planSkeleton} />}
      {rows != null && rows.length === 0 && <div className={css.planEmpty}>{d.t('dp.planEmpty')}</div>}
      {rows != null && rows.length > 0 && <PlanBoard d={d} rows={rows} />}
    </div>
  )
}
