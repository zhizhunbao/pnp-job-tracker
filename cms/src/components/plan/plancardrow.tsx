'use client'
/**
 * plan 域的结构:一张初评手机卡。手机卡 = 全站唯一那套 JobCard(2026-08-16 Frank
 * 「后面的卡片改成前面的风格」;与 jobtable-is-the-standard 同一条:卡片形态别处不自造)。
 * 槽位对齐职位卡的骨:左列身份(省份/在招)、右列数字(名额竞争)、胶囊排、底部动作。
 * 竞争/名额状态是中性事实,压掉职位卡薪资位的绿色(那绿是「钱多是好事」的语义)。
 * 三个可空插槽由 functions 的 slotOf 决定给不给 —— 给个空壳会让职位卡多渲一层空 span。
 * 2026-08-28 换装批自 Decision.tsx 的手机卡分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { JobCard } from '@/components/card'
import { PlanCompCell } from './plancompcell'
import { planActsSlotOf, planChipsSlotOf, planDateSlotOf } from './functions'
import type { PlanCardRowIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一张初评手机卡。
 *
 * @param props 这一行展示行与粗筛态。
 * @returns 职位卡形态的一张卡。
 */
export function PlanCardRow({ r, coarse }: PlanCardRowIn) {
  return (
    <JobCard title={{ text: r.text.cardTitle }}
      company={{ text: r.province }}
      salary={<span className={css.cardSalary}>{PlanCompCell(r)}</span>}
      location={<span className={css.cardLoc}>{r.text.openLine}</span>}
      date={planDateSlotOf(r)}
      chips={planChipsSlotOf({ r, coarse })}
      footer={planActsSlotOf(r)} />
  )
}
