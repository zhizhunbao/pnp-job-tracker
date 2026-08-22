/**
 * 签名归外部定死的函数:`Array.prototype.sort` 的比较器。排序判据全部由 decorate 先算好
 * 挂在 `DecoratedRow` 上,这里只读不查表(#307 的八键次序,全部 Frank 逐条拍板 —— 见 types 的
 * RankableRow/DecoratedRow 注)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

import type { DecoratedRow, EeCadence, PlanPath, RankableRow, TlCadence, TlEvent } from './types'

/**
 * 初评主排序(#307 唯一的尺):① 0 岗跨档沉底 ② 沉降段(缺数据/够不着线)③ 本省优先跨档
 * ④ 档位 band ⑤ 档内够得着优先 ⑥ thin 沉同档尾 ⑦ thin 组内岗数多→少、足量组竞争比松→紧
 * ⑧ 引擎原序兜底。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byPlanOrder<T extends RankableRow>(a: DecoratedRow<T>, b: DecoratedRow<T>): number {
  if (a.zero !== b.zero) {
    if (a.zero) {
      return 1
    }
    return -1
  }
  if (a.sunk !== b.sunk) {
    if (a.sunk) {
      return 1
    }
    return -1
  }
  if (a.home !== b.home) {
    if (a.home) {
      return -1
    }
    return 1
  }
  if (a.band !== b.band) {
    return a.band - b.band
  }
  if (a.row.aboveLine !== b.row.aboveLine) {
    if (a.row.aboveLine) {
      return -1
    }
    return 1
  }
  if (a.thin !== b.thin) {
    if (a.thin) {
      return 1
    }
    return -1
  }
  if (a.thin && b.thin && a.n !== b.n) {
    let an = -1
    if (a.n != null) {
      an = a.n
    }
    let bn = -1
    if (b.n != null) {
      bn = b.n
    }
    return bn - an
  }
  if (a.ratio !== b.ratio) {
    return a.ratio - b.ratio
  }
  return a.i - b.i
}

/**
 * 时间线事件:日期新在前。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byDateDesc(a: TlEvent, b: TlEvent): number {
  if (a.date < b.date) {
    return 1
  }
  if (a.date > b.date) {
    return -1
  }
  return 0
}

/**
 * 省级节奏:省码字典序,同省内项目字典序。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byProvStream(a: TlCadence, b: TlCadence): number {
  const prov = a.prov.localeCompare(b.prov)
  if (prov !== 0) {
    return prov
  }
  return a.stream.localeCompare(b.stream)
}

/**
 * 联邦 EE 距今:近在前。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byDaysSince(a: EeCadence, b: EeCadence): number {
  return a.daysSince - b.daysSince
}

/**
 * 全段确定的路径:总月数升序,同数按省码(totalMonths 在 complete 组恒非 null)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byTotalMonths(a: PlanPath, b: PlanPath): number {
  let at = 0
  if (a.totalMonths != null) {
    at = a.totalMonths
  }
  let bt = 0
  if (b.totalMonths != null) {
    bt = b.totalMonths
  }
  if (at !== bt) {
    return at - bt
  }
  return a.province.localeCompare(b.province)
}

/**
 * 含 unknown 段的路径:下界升序,同数按省码。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byDeterminedMonths(a: PlanPath, b: PlanPath): number {
  if (a.determinedMonths !== b.determinedMonths) {
    return a.determinedMonths - b.determinedMonths
  }
  return a.province.localeCompare(b.province)
}

/**
 * 日期字符串升序(节奏分组内排期)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byDateAsc(a: string, b: string): number {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}
