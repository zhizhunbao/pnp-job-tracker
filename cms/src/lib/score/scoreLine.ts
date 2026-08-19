// 估分 × 最近抽选线的三态判定(2026-08-16 Frank「如果用户分数达标 就等着被捞
// 不需要换省份找工作了」)。纯函数,单测锁行为;路由只负责把它挂到行上。
//
// 病灶(改之前):`belowLine` 两头都拿 value 判,又把 partial 整个排除掉 —— 于是
//   · AB 的官方表带 12 条加分项 → 恒 partial → 沉底**永不触发**;
//   · 「够得着」这一侧压根没写过。
// 结果是估分入库、上页、却对排序与结论**零影响**。
//
// 纠正后的口径:partial 的含义是 value=下界(问不到的加分项按 0 记)、ceiling=上界
// (加分项全按满分)。两个方向各取各的那一侧,才都是**不会翻案的硬结论**:
//   · above  下界 ≥ 线 → 够得着。加分项只会让分更高,partial 与否都成立。
//   · below  上界 < 线 → 够不着。全按满分也摸不到线。
//   · unknown 下界 < 线 ≤ 上界 → 如实留白,由展示层说「取决于加分项」,**不许**归到任何一头。
// 分与线都是官方事实(分=官方分值表,线=官方抽选史),比较它们不碰禁概率红线;
// 但也只到「够不够线」为止 —— 不许延伸成「多久能被捞」「概率多大」。

export type ScoreVsLine = {
  /** 本站问得到的因子算出的分;partial 时是**下界** */
  value?: number | null
  /** 加分项全按满分的**上界**;算不出给 null */
  ceiling?: number | null
  /** 对照的最近一轮抽选线;本站没收录给 null */
  refLine?: number | null
  /** value 是不是下界(有加分项没勾) */
  partial?: boolean
}

export type LineState = 'above' | 'below' | 'unknown'

/**
 * 三态判定。没分 / 没线 一律 'unknown' —— 缺一边就不比,不拿空当 0。
 * ceiling 缺失(上界算不出)时退回 value:宁可不沉,也不误判「够不着」。
 */
export function lineStateOf(score: ScoreVsLine | null | undefined): LineState {
  const line = score?.refLine
  if (line == null || !Number.isFinite(line)) return 'unknown'
  const low = score?.value
  if (low != null && Number.isFinite(low) && low >= line) return 'above'
  const top = score?.ceiling ?? score?.value ?? null
  if (top != null && Number.isFinite(top) && top < line) return 'below'
  return 'unknown'
}

export const isAboveLine = (score: ScoreVsLine | null | undefined): boolean => lineStateOf(score) === 'above'
export const isBelowLine = (score: ScoreVsLine | null | undefined): boolean => lineStateOf(score) === 'below'

/** 够得着时高出线多少分;不够得着 / 无从比较给 null(展示层据此决定出不出这个数) */
export function marginOf(score: ScoreVsLine | null | undefined): number | null {
  if (lineStateOf(score) !== 'above') return null
  return (score?.value as number) - (score?.refLine as number)
}
