/**
 * points 域的子桶 federal 的函数 —— 联邦两套表(CRS 与联邦技工 67 分)共用的部分:联邦区间解析、学历档、needsInfoOf / pickEduRow / sumPoints。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

import { MATCHED_NONE, MONTHS_PER_YEAR, SEP, oneGroupOf, rangeGroupOf } from '../core'
import type { LabelIn } from '../core'
import {
  EE_AGE_AND_OLDER, EE_AGE_BARE, EE_AGE_EXACT, EE_AGE_MAX, EE_AGE_OR_LESS, EE_AGE_OR_MORE, EE_AGE_RANGE, EE_AGE_UNDER,
  EE_CLB_AT_LEAST, EE_CLB_BELOW, EE_CLB_MAX, EE_CLB_ONE, EE_CLB_OR_LESS, EE_CLB_OR_MORE, EE_CLB_RANGE, EE_YEARS_MAX,
  EE_YEARS_NONE, EE_YEARS_ONE, EE_YEARS_OR, EE_YEARS_OR_MORE, EE_YEARS_RANGE, ITEM_STATUS,
} from './constants'
import type {
  EeEvidenceOfIn, EeEvidenceOfOut, EstimateItem, EstimateItemIn, EstimateItemOut, HitItemIn, MonthsToYearsIn,
  MonthsToYearsOut, NeedsInfoItemIn, NeedsInfoOfIn, NeedsInfoOfOut, PickBestTierIn, PickBestTierOut, PickByRangeIn,
  PickByRangeOut, PickEduRowIn, RangeOut, SumPointsIn, SumPointsOut, TierRow,
} from './types'

// =========================================================================
// 1. 联邦表:从官方标签解析区间
// =========================================================================

/**
 * 年龄区间。
 *
 * 兼容 CRS 的「40 years of age」「45 years of age or more」「20 to 29 years of age」
 * 与 FSW67 的「Under 18」「18-35」「47 and older」「36」这几种写法。
 *
 * @param label 官方原文。
 * @returns 闭区间;读不出则 null。
 */
export function eeAgeRangeOf(label: LabelIn): RangeOut {
  const s = label.trim()
  const under = oneGroupOf({ re: EE_AGE_UNDER, text: s })
  if (under) {
    return { from: 0, to: Number(under.n) - 1 }
  }
  const orLess = oneGroupOf({ re: EE_AGE_OR_LESS, text: s })
  if (orLess) {
    return { from: 0, to: Number(orLess.n) }
  }
  const orMore = oneGroupOf({ re: EE_AGE_OR_MORE, text: s })
  if (orMore) {
    return { from: Number(orMore.n), to: EE_AGE_MAX }
  }
  const older = oneGroupOf({ re: EE_AGE_AND_OLDER, text: s })
  if (older) {
    return { from: Number(older.n), to: EE_AGE_MAX }
  }
  const span = rangeGroupOf({ re: EE_AGE_RANGE, text: s })
  if (span) {
    return { from: Number(span.low), to: Number(span.high) }
  }
  const exact = oneGroupOf({ re: EE_AGE_EXACT, text: s })
  if (exact) {
    return { from: Number(exact.n), to: Number(exact.n) }
  }
  const bare = oneGroupOf({ re: EE_AGE_BARE, text: s })
  if (bare) {
    return { from: Number(bare.n), to: Number(bare.n) }
  }
  return null
}

/**
 * CLB 区间。
 *
 * 兼容 CRS 的「CLB 6」「CLB 4 or 5」「Less than CLB 4」「CLB 10 or more」
 * 与 FSW67 的「CLB level 9 or higher」「Below CLB level 7」
 * 「At least CLB 5 in all of the 4 abilities」。
 *
 * @param label 官方原文。
 * @returns 闭区间;读不出则 null。
 */
export function eeClbRangeOf(label: LabelIn): RangeOut {
  const s = label.trim()
  const below = oneGroupOf({ re: EE_CLB_BELOW, text: s })
  if (below) {
    return { from: 0, to: Number(below.n) - 1 }
  }
  const orMore = oneGroupOf({ re: EE_CLB_OR_MORE, text: s })
  if (orMore) {
    return { from: Number(orMore.n), to: EE_CLB_MAX }
  }
  const atLeast = oneGroupOf({ re: EE_CLB_AT_LEAST, text: s })
  if (atLeast) {
    return { from: Number(atLeast.n), to: EE_CLB_MAX }
  }
  const orLess = oneGroupOf({ re: EE_CLB_OR_LESS, text: s })
  if (orLess) {
    return { from: 0, to: Number(orLess.n) }
  }
  const span = rangeGroupOf({ re: EE_CLB_RANGE, text: s })
  if (span) {
    return { from: Number(span.low), to: Number(span.high) }
  }
  const exact = oneGroupOf({ re: EE_CLB_ONE, text: s })
  if (exact) {
    return { from: Number(exact.n), to: Number(exact.n) }
  }
  return null
}

/**
 * 年数区间(整年档)。
 *
 * CRS 用「None or less than a year」「1 year」「5 years or more」;
 * FSW67 用「1 year」「2-3 years」「6 or more years」。
 *
 * @param label 官方原文。
 * @returns 闭区间;读不出则 null。
 */
export function eeYearsRangeOf(label: LabelIn): RangeOut {
  const s = label.trim()
  if (EE_YEARS_NONE.test(s)) {
    return { from: 0, to: 0 }
  }
  const span = rangeGroupOf({ re: EE_YEARS_RANGE, text: s })
  if (span) {
    return { from: Number(span.low), to: Number(span.high) }
  }
  const either = rangeGroupOf({ re: EE_YEARS_OR, text: s })
  if (either) {
    return { from: Number(either.low), to: Number(either.high) }
  }
  const orMore = oneGroupOf({ re: EE_YEARS_OR_MORE, text: s })
  if (orMore) {
    return { from: Number(orMore.n), to: EE_YEARS_MAX }
  }
  const exact = oneGroupOf({ re: EE_YEARS_ONE, text: s })
  if (exact) {
    return { from: Number(exact.n), to: Number(exact.n) }
  }
  return null
}

/**
 * 月 → 整年(向下取整)。
 *
 * @param months 月数;没答则 null。
 * @returns 整年数;没答则 null。
 */
export function monthsToYears(months: MonthsToYearsIn): MonthsToYearsOut {
  if (months == null) {
    return null
  }
  return Math.floor(months / MONTHS_PER_YEAR)
}

/**
 * 在候选行里挑「区间包含他的值」的**第一条**;找不到返回 null(**不猜**)。
 *
 * @param input 候选行、他的值与读区间的那把尺。
 * @returns 那一行;没有则 null。
 */
export function pickByRange(input: PickByRangeIn): PickByRangeOut {
  for (const r of input.rows) {
    const rg = input.rangeOf(r.criterion)
    if (rg && input.want >= rg.from && input.want <= rg.to) {
      return r
    }
  }
  return null
}

/**
 * 一项「判不了」。
 *
 * 缺输入、或查不到能用的行 —— **不猜**,让上游去反问。
 *
 * @param input 内部键与短名。
 * @returns 那一项。
 */
export function needsInfoItem(input: NeedsInfoItemIn): EstimateItemOut {
  return estimateItem({
    factor: input.factor, label: input.label, points: 0, matched: MATCHED_NONE, evidence: null,
    status: ITEM_STATUS.needsInfo,
  })
}

/**
 * 命中官方行之后攒一项 —— 分从官方行抄,**大于 0 才算命中**,等于 0 是硬结论。
 *
 * @param input 内部键、短名、命中的行、分与命中原文。
 * @returns 那一项。
 */
export function hitItem(input: HitItemIn): EstimateItemOut {
  let status: EstimateItem['status'] = ITEM_STATUS.zero
  if (input.points > 0) {
    status = ITEM_STATUS.matched
  }
  return estimateItem({
    factor: input.factor, label: input.label, points: input.points, matched: input.matched,
    evidence: eeEvidenceOf({ r: input.r }),
    status: status,
  })
}

/**
 * 攒一项估分。
 *
 * @param input 内部键、短名、分、命中原文、出处与判定态。
 * @returns 那一项。
 */
export function estimateItem(input: EstimateItemIn): EstimateItemOut {
  return {
    factor: input.factor, label: input.label, points: input.points, matched: input.matched,
    evidence: input.evidence, status: input.status,
  }
}

/**
 * 命中那一行的出处。
 *
 * @param input 命中的那一行。
 * @returns 出处。
 */
export function eeEvidenceOf(input: EeEvidenceOfIn): EeEvidenceOfOut {
  return {
    url: input.r.url, fetched: input.r.fetched,
    label: `${input.r.criterion}${SEP.dash}${input.r.pointsText}`,
  }
}

/**
 * 门槛不超过他的值里**最高**的那一行;一档都够不到则 null。
 *
 * 并列时保留先出现的那一条(官方表的行序即优先序)。
 *
 * @param input 带门槛的候选行与他的值。
 * @returns 那一行;没有则 null。
 */
export function pickBestTier(input: PickBestTierIn): PickBestTierOut {
  let best: TierRow | null = null
  for (const x of input.scored) {
    if (x.th > input.want) {
      continue
    }
    if (best == null || x.th > best.th) {
      best = x
    }
  }
  if (best == null) {
    return null
  }
  return best.r
}

// =========================================================================
// 2. CRS(排名分)
// =========================================================================

/**
 * 学历挑行:两张联邦表同一套办法,只是匹配式与要不要去空白不同。
 *
 * @param input 候选行、学历档、学制年数与两把尺。
 * @returns 那一行;挑不出则 null。
 */
export function pickEduRow(input: PickEduRowIn): PickByRangeOut {
  const special = input.specialOf({ edu: input.edu })
  if (special) {
    for (const r of input.cand) {
      let crit = r.criterion
      if (input.trimCriterion) {
        crit = r.criterion.trim()
      }
      if (special.test(crit)) {
        return r
      }
    }
    return null
  }
  if (input.eduYears == null) {
    return null
  }
  const scored: TierRow[] = []
  for (const r of input.cand) {
    const y = input.yearsOf(r.criterion)
    if (y != null) {
      scored.push({ r: r, th: y })
    }
  }
  return pickBestTier({ scored: scored, want: input.eduYears })
}

/**
 * 逐项 → 判不了的那几项的内部键,**按逐项的次序**。
 *
 * 🔴 从 `breakdown` 派生,不靠一个在参数里被就地改的数组传出来 ——
 * 每一项判不了都对应 `breakdown` 里判定态为「判不了」的一条,次序也一致。
 *
 * @param input 逐项。
 * @returns 那几个内部键。
 */
export function needsInfoOf(input: NeedsInfoOfIn): NeedsInfoOfOut {
  const out: string[] = []
  for (const b of input.breakdown) {
    if (b.status === ITEM_STATUS.needsInfo) {
      out.push(b.factor)
    }
  }
  return out
}

/**
 * 逐项 → 合计。
 *
 * @param input 逐项。
 * @returns 合计。
 */
export function sumPoints(input: SumPointsIn): SumPointsOut {
  let total = 0
  for (const b of input.breakdown) {
    total += b.points
  }
  return total
}
