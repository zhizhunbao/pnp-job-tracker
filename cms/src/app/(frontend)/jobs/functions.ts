/**
 * 职位板(/jobs)从组件体里迁出来的函数。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」:闭包变量改 XxxIn 显式入参,
 * 逐项手柄用 makeXxx 工厂(样张 select 的 optionLabelOf / makeSelectChange)。
 * 眼下只有一个函数两个类型,契约就近声明在本文件,不另开 types.ts。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */
import type { TFn } from '@/lib/i18n'

/**
 * makeAgeText 的入参(原 Jobs.tsx 卡片回调体内 ageText 闭包的唯一一样东西)。
 */
export type AgeTextIn = {
  /**
   * 取词函数(界面语言)。
   */
  t: TFn
}

/**
 * 挂帖时长的文案函数:天数 → 括号里那句话。
 */
export type AgeTextFn = (days: number) => string

/**
 * 造一枚挂帖时长的文案函数(Frank 走查过的本地午夜解析坑,现已收在 lib/time 的 daysSince):
 * 「今天」与「N 天」两句文案归调用方,组件只管版式。
 *
 * @param x 取词函数。
 * @returns 交给 DateAge 的 ageText 手柄。
 */
export function makeAgeText(x: AgeTextIn): AgeTextFn {
  return function ageText(days: number): string {
    if (days === 0) {
      return `(${x.t('cell.today')})`
    }
    return `(${x.t('fact.daysUpVal', { n: days })})`
  }
}
