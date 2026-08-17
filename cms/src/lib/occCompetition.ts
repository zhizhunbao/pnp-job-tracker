// 该职业分省竞争面的取数(2026-08-15 #307 排序单源化时从 /api/occ-competition 抽出):
// 路由与 profile-pathways 的服务端排序共用同一份数,口径不许分叉。
// 🔴 职业级「几人抢一个」算不出来,本站不编 —— 这里只给三类实数(在招/新增/平均在招天数)
// 与省级名额竞争比,合成分数即替用户拿主意(原路由文件头的完整口径注释仍在那边)。
import { getPayload } from 'payload'

import config from '@/payload.config'
import * as SQL from './db/sql'   // SQL 文本全在那儿,本文件只管取数与映射

export type OccCompetitionRow = {
  province: string
  openJobs: number
  new30d: number | null
  /** 平均在招天数(本站库内该省该职业);null = 样本不足未算 */
  avgDaysOpen: number | null
  /** 该省名额竞争(省级,与职业无关) */
  ratio: number | null
  /** 该省 AIP 指定雇主在招的本职业岗数 */
  aipJobs: number
  /** 该省 RCIP 试点社区在招的本职业岗数(LIKE 口径同列表页 pilot=RCIP) */
  rcipJobs: number
  /** FCIP 试点社区 ∩ 本职业(与 rcipJobs 同口径,别混) */
  fcipJobs: number
}

const num = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * 2026-08-16 Frank「在招是显示多少就查多少」「要支持多个职位类别」:
 *   ① openJobs 改**实时 jobs 表**查(与「查岗位」落地页同一条谓词),不再取 stats_occupation 日快照 ——
 *      快照与实时差 1-3 岗,点进去数字对不上就是「跑偏」;new30d/平均在招天数仍走快照(它们本就是统计口径)。
 *   ② 档案里选了几个职业就算几个:nocs 全量参与,岗位按 noc = ANY(...) 去重计数。
 */
export async function fetchOccCompetition(nocInput: string | string[]): Promise<OccCompetitionRow[]> {
  const nocs = (Array.isArray(nocInput) ? nocInput : [nocInput]).filter((n) => /^\d{5}$/.test(n))
  if (!nocs.length) return []
  const noc = nocs[0]
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } }).pool
  if (!pool) return []

  const [occ, comp, aip, rcip, fcip] = await Promise.all([
    // 实时在招(与落地页同一条谓词:status=open ∧ 省 ∧ noc ∈ 档案职业);统计列另取快照
    pool.query(
      SQL.OCC_COMPETITION_BY_PROV, [nocs],
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    pool.query(
      SQL.PROV_DIFFICULTY,
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    pool.query(
      SQL.PROV_OPEN_COUNT, [nocs],
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    pool.query(
      SQL.PROV_OPEN_COUNT_NOC4, [nocs],
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    pool.query(
      SQL.PROV_OPEN_COUNT_BROAD, [nocs],
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
  ])

  const ratioOf: Record<string, number> = {}
  for (const r of comp.rows) {
    let d: { factors?: { key?: string; value?: number }[] } | null = null
    try { d = typeof r.difficulty === 'string' ? JSON.parse(r.difficulty as string) : (r.difficulty as typeof d) } catch { d = null }
    const v = Number(d?.factors?.find((x) => x?.key === 'comp')?.value)
    if (Number.isFinite(v)) ratioOf[String(r.province)] = v
  }

  const byProv = (rows: Record<string, unknown>[]): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const r of rows) out[String(r.province ?? '')] = num(r.n) ?? 0
    return out
  }
  const aipOf = byProv(aip.rows)
  const rcipOf = byProv(rcip.rows)
  const fcipOf = byProv(fcip.rows)

  return occ.rows.map((r) => ({
    province: String(r.province ?? ''),
    openJobs: num(r.open_jobs) ?? 0,
    new30d: num(r.new30d),
    avgDaysOpen: num(r.avg_days_open),
    ratio: ratioOf[String(r.province ?? '')] ?? null,
    aipJobs: aipOf[String(r.province ?? '')] ?? 0,
    rcipJobs: rcipOf[String(r.province ?? '')] ?? 0,
    fcipJobs: fcipOf[String(r.province ?? '')] ?? 0,
  }))
}
