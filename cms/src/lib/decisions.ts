// 每个决定要哪些字段(设计:docs/design/统一题库与付费面-20260731.md §3)。
// 加一张卡 = 加一行声明,渲染层与存储层零改动 —— 七套题库不存在,只有一套字段库 + 各决定的取用清单。
// 只声明**已经有 builder 能出报告的决定**(没报告的卡先别占位,YAGNI)。
import { FIELDS } from './fields'
import type { Answers } from './answers'

export type Stage = 'basic' | 'explore'
export type Decision = {
  basic: string[]          // 答满即出报告(粗版,confidence 低)
  explore: string[][]      // 探索题按批推进,一批一屏组
}

export const DECISIONS: Record<string, Decision> = {
  pr: { basic: ['status', 'clbBand', 'expBand', 'provBand'], explore: [['crsBand', 'pgwpBand']] },
}

export const fieldsOf = (decision: string, stage: Stage, batch = 0): string[] => {
  const d = DECISIONS[decision]
  if (!d) return []
  return stage === 'basic' ? d.basic : (d.explore[batch] ?? [])
}

// 只问缺的(字段属于用户,不属于页面)
export const missingFields = (names: string[], a: Answers): string[] =>
  names.filter((n) => !(a as any)[n])

// 规则:每批探索题第一道必须是 free 题 —— 先兑现一次再谈钱,一整批全是 pro 题
// = 用户答完什么都没多看到。新加批次必须守;PR 批 1 是历史偏差(见下),不许再加第二个。
export const batchLeadsFree = (names: string[]): boolean => FIELDS[names[0]]?.tier === 'free'
// 例外:拿 PR 探索批 1(crs/pgwp 两题都进锁区)。探索层现在没有能立刻给免费结论的字段
// —— 省级语言与工资门槛未建模、hasJobOffer 还没规则。这两样任一落地,就把它挪到批首并删掉这行。
export const KNOWN_NO_FREE_LEAD = new Set(['pr:0'])
