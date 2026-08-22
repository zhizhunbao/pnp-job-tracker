/**
 * 通道域的行为:按 key 查策略的四个取值函数 + RCIP/FCIP 社区名额状态的聚合与取数。
 * 🔴 本文件**不 import payload**(宪法:取数函数收一个能 query 的东西当参数,池由调用方注进来)——
 * 于是 index 门可以放心把 gateOf / uiOf 转发给 'use client' 组件(plan/pr/Decision.tsx 取的是值)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

import { queryRowsOrEmpty, SQL } from '../db'
import type { Db } from '../db'
import { GROUP_SEP, NEED_UNKNOWN, PILOT_TYPES, UI_JOBS_DEFAULT, UI_PROGRAM_DEFAULT, WHY_NO_SOURCE } from './constants'
import { PATHWAYS } from './constants'
import { toPilotCommunity } from './rows'
import { byProvThenType } from './callbacks'
import type {
  GateOfIn, GateRule, MaybeExemption, MaybeRegionProvinces, MaybeStrategy, PathwayStrategy, PilotCommunityRows,
  PilotQuotaAgg, PilotQuotaAggs, PilotQuotaOut, ResolvedUi,
} from './types'

/**
 * 按 key 找策略;没有则 null(通道 key 全集在 PathwayKey,正常打不到 null)。
 *
 * @param key 通道 key。
 * @returns 策略;没登记 null。
 */
function strategyOf(key: string): MaybeStrategy {
  for (const p of PATHWAYS) {
    if (p.key === key) {
      return p
    }
  }
  return null
}

/**
 * 某条通道的某一类闸。**没登记 = 本站未收录**(unknown),与「官方不要求」意思相反,不许混
 * —— 举证责任在我们:notRequired 也要么带官方原句、要么带「读过这一页、页上没有」的 basis。
 *
 * @param input 通道 key 与闸类。
 * @returns 该闸的声明;没登记落 unknown。
 */
export function gateOf(input: GateOfIn): GateRule {
  const spec = strategyOf(input.key)
  if (spec != null) {
    const rule = spec.gates[input.gate]
    if (rule != null) {
      return rule
    }
  }
  return { need: NEED_UNKNOWN, why: WHY_NO_SOURCE, url: null, fetched: null, note: null }
}

/**
 * 专业对口闸的例外(null = 这条通道不给例外)。
 *
 * @param key 通道 key。
 * @returns 例外;没有 null。
 */
export function fieldMatchExemptionOf(key: string): MaybeExemption {
  const spec = strategyOf(key)
  if (spec == null) {
    return null
  }
  return spec.fieldMatchExemption
}

/**
 * 联邦区域线覆盖的省(AIP/RCIP/FCIP);非区域线返回 null —— 调用方据此判断「要不要拆省」。
 *
 * @param key 通道 key。
 * @returns 省清单;非区域线 null。
 */
export function regionProvincesOf(key: string): MaybeRegionProvinces {
  const spec = strategyOf(key)
  if (spec == null) {
    return null
  }
  return spec.regionProvinces
}

/**
 * 展示层特性(带默认值,前端不必逐格判空)。默认那套 = 普通省提名通道。
 *
 * @param key 通道 key。
 * @returns 兜完默认值的展示特性。
 */
export function uiOf(key: string): ResolvedUi {
  const spec = strategyOf(key)
  let ui: PathwayStrategy['ui'] = null
  if (spec != null) {
    ui = spec.ui
  }
  if (ui == null) {
    return {
      program: UI_PROGRAM_DEFAULT, jobsSource: UI_JOBS_DEFAULT,
      regionLabelKey: null, afterOfferOkKey: null, offerGapKey: null, jobsQuery: null, seeJobsKey: null,
    }
  }
  let program: ResolvedUi['program'] = UI_PROGRAM_DEFAULT
  if (ui.program != null) {
    program = ui.program
  }
  let jobsSource: ResolvedUi['jobsSource'] = UI_JOBS_DEFAULT
  if (ui.jobsSource != null) {
    jobsSource = ui.jobsSource
  }
  return {
    program: program, jobsSource: jobsSource,
    regionLabelKey: ui.regionLabelKey, afterOfferOkKey: ui.afterOfferOkKey, offerGapKey: ui.offerGapKey,
    jobsQuery: ui.jobsQuery, seeJobsKey: ui.seeJobsKey,
  }
}

/**
 * 名额状态聚合本体(纯函数,tests/int 直接喂 fixture 行)。
 * 🔴 空 = 官网没写,不是没有限额:各和只对官网写了数的社区求,一个都没有 = null(禁折 0)。
 * type 里没有 RCIP/FCIP(社区名没接上 pilot-communities)的行不进聚合 —— 明细取法仍能看到它。
 *
 * @param rows 社区级行。
 * @returns 省 × 制度 的聚合,按省与制度排序。
 */
export function aggregatePilotQuota(rows: PilotCommunityRows): PilotQuotaAggs {
  const groups = new Map<string, PilotQuotaAgg>()
  for (const r of rows) {
    for (const t of PILOT_TYPES) {
      if (r.type.includes(t) === false) {
        continue
      }
      const key = r.province + GROUP_SEP + t
      let g = groups.get(key)
      if (g == null) {
        g = { province: r.province, type: t, communities: 0, firstComeN: 0, quotaSum: null, remainingSum: null, perIntakeSum: null, asOf: '' }
        groups.set(key, g)
      }
      g.communities += 1
      if (r.firstCome === true) {
        g.firstComeN += 1
      }
      let q = r.perIntake
      if (r.remaining != null) {
        q = r.remaining
      }
      if (q != null) {
        let base = 0
        if (g.quotaSum != null) {
          base = g.quotaSum
        }
        g.quotaSum = base + q
      }
      if (r.remaining != null) {
        let base = 0
        if (g.remainingSum != null) {
          base = g.remainingSum
        }
        g.remainingSum = base + r.remaining
      }
      if (r.perIntake != null) {
        let base = 0
        if (g.perIntakeSum != null) {
          base = g.perIntakeSum
        }
        g.perIntakeSum = base + r.perIntake
      }
      if (r.asOf > g.asOf) {
        g.asOf = r.asOf
      }
    }
  }
  const out = Array.from(groups.values())
  out.sort(byProvThenType)
  return out
}

/**
 * 省 × 制度 聚合(profile-pathways 区域线行用)。表没建/查询失败 = [](queryRowsOrEmpty 留痕回空,
 * 上游按「没数据」处理,不编)。池由调用方注进来(拍板③:db 只在边缘)。
 *
 * @param db 能打 SQL 的东西。
 * @returns 聚合行;拉不到空数组。
 */
export async function fetchPilotQuota(db: Db): PilotQuotaOut {
  const rows = await queryRowsOrEmpty({ db: db, sql: SQL.PILOT_QUOTA_COMMUNITIES, params: [], map: toPilotCommunity })
  return aggregatePilotQuota(rows)
}
