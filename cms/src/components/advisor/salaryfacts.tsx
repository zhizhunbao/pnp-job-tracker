'use client'
/**
 * 薪资组的事实块分叉(批A #134,Frank「就显示一个中位数,下面把 ESDC 的列表列出来」):
 * 帖面卡 = 原文 + 折算 / vs 中位卡 = ESDC 中位一行 + 直判药丸 / ESDC 表卡 = 低中高一行一条
 * (横杠串退役)。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位(三张卡各成一件)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { FIELD_SALARY, FIELD_VS_MEDIAN } from './constants'
import { EsdcWages } from './esdcwages'
import { PostedSalary } from './postedsalary'
import { VsMedian } from './vsmedian'
import type { FieldFactsIn } from './types'

/**
 * 渲染薪资字段的事实块。
 *
 * @param props 点开的是哪一格与取数包。
 * @returns 三张卡里的那一张(其余薪资字段都归 ESDC 表卡)。
 */
export function SalaryFacts({ field, f }: FieldFactsIn) {
  if (field === FIELD_SALARY) {
    return <PostedSalary f={f} />
  }
  if (field === FIELD_VS_MEDIAN) {
    return <VsMedian f={f} />
  }
  return <EsdcWages f={f} />
}
