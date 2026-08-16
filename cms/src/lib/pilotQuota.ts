// RCIP/FCIP 社区名额状态取数(旧账立项 2026-08-15):
// build_pilot_quota.py 周更 raw → mart/pilot_quota → 本文件聚合,供 profile-pathways 给区域线行附名额状态。
// 🔴 空 = 官网没写,不是没有限额:quotaSum 只对官网写了数的社区求和,一个都没有 = null(禁 `?? 0`)。
// SQL 走 payload.db.pool 直查(照 lib/occCompetition.ts 的形态);聚合本体是纯函数,单测不连库。
import { getPayload } from 'payload'

import config from '@/payload.config'

/** 社区级行(pilot_quota 表 noc 为空的行);每个值锚定官网原句 quote+url */
export type PilotQuotaCommunityRow = {
  community: string
  province: string
  /** RCIP | FCIP | RCIP+FCIP(pilot-communities 按社区名关联,同 jobs.pilot 口径) */
  type: string
  /** true = 官网明说先到先得;null = 官网没写(数据里没有 false) */
  firstCome: boolean | null
  firstComeQuote: string
  firstComeUrl: string
  /** 每轮(intake period)最多发几个推荐;null = 官网没写 */
  perIntake: number | null
  perIntakeQuote: string
  perIntakeUrl: string
  /** 官网自报剩余名额;null = 官网没写 */
  remaining: number | null
  remainingQuote: string
  remainingUrl: string
  asOf: string
}

/** 社区 × NOC 满额行(noc 非空;官网明文才有) */
export type PilotQuotaOccRow = {
  community: string
  province: string
  type: string
  noc: string
  /** 'full' = 官网明文该职业满额/不再收 */
  status: string
  quote: string
  url: string
  asOf: string
}

export type PilotQuotaAgg = {
  province: string
  /** RCIP | FCIP(身兼两制的社区计入两组 —— 名额状态出自同一社区官方页) */
  type: string
  /** 官网写了名额状态的社区数(≠该省试点社区总数,没写的社区不在本表) */
  communities: number
  /** 其中官网明说先到先得的社区数 */
  firstComeN: number
  /** 有数的社区求和(一社区取 remaining,没有才取 perIntake;两者都没写不计入);一个都没有 = null */
  quotaSum: number | null
  /** 只汇总官网自报「剩余名额」的社区(语义单一,展示层用它;混着每轮上限的 quotaSum 不上屏) */
  remainingSum: number | null
  /** 只汇总官网自报「每轮上限」的社区(同上,语义单一) */
  perIntakeSum: number | null
  /** 各社区 as_of 取最大(ISO 日期字符串比较) */
  asOf: string
}

const num = (v: unknown): number | null => {
  // 🔴 先挡 null/undefined:Number(null)=0,不挡就把「官网没写」洗成 0(「禁 ?? 0」的同族雷)
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** 聚合本体(纯函数,tests/int 直接喂 fixture 行) */
export function aggregatePilotQuota(rows: PilotQuotaCommunityRow[]): PilotQuotaAgg[] {
  const groups = new Map<string, PilotQuotaAgg>()
  for (const r of rows) {
    // type 里没有 RCIP/FCIP(社区名没接上 pilot-communities)的行不进聚合 —— 明细取法仍能看到它
    for (const t of ['RCIP', 'FCIP'].filter((t) => r.type.includes(t))) {
      const key = `${r.province}|${t}`
      const g = groups.get(key) ?? { province: r.province, type: t, communities: 0, firstComeN: 0, quotaSum: null, remainingSum: null, perIntakeSum: null, asOf: '' }
      g.communities += 1
      if (r.firstCome === true) g.firstComeN += 1
      const q = r.remaining ?? r.perIntake
      if (q !== null) g.quotaSum = (g.quotaSum ?? 0) + q
      if (r.remaining !== null) g.remainingSum = (g.remainingSum ?? 0) + r.remaining
      if (r.perIntake !== null) g.perIntakeSum = (g.perIntakeSum ?? 0) + r.perIntake
      if (r.asOf > g.asOf) g.asOf = r.asOf
      groups.set(key, g)
    }
  }
  return [...groups.values()].sort((a, b) => a.province.localeCompare(b.province) || a.type.localeCompare(b.type))
}

type Pool = { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }

const communityRow = (r: Record<string, unknown>): PilotQuotaCommunityRow => ({
  community: String(r.community ?? ''),
  province: String(r.province ?? ''),
  type: String(r.type ?? ''),
  firstCome: typeof r.first_come === 'boolean' ? r.first_come : null,
  firstComeQuote: String(r.first_come_quote ?? ''),
  firstComeUrl: String(r.first_come_url ?? ''),
  perIntake: num(r.per_intake),
  perIntakeQuote: String(r.per_intake_quote ?? ''),
  perIntakeUrl: String(r.per_intake_url ?? ''),
  remaining: num(r.remaining),
  remainingQuote: String(r.remaining_quote ?? ''),
  remainingUrl: String(r.remaining_url ?? ''),
  asOf: String(r.as_of ?? ''),
})

async function pool(): Promise<Pool | null> {
  const payload = await getPayload({ config: await config })
  return (payload.db as { pool?: Pool }).pool ?? null
}

/** 省 × 制度 聚合(profile-pathways 区域线行用);表没建/查询失败 = [](上游按「没数据」处理,不编) */
export async function fetchPilotQuota(): Promise<PilotQuotaAgg[]> {
  const p = await pool()
  if (!p) return []
  const res = await p.query(
    `SELECT community, province, type, first_come, first_come_quote, first_come_url,
            per_intake, per_intake_quote, per_intake_url,
            remaining, remaining_quote, remaining_url, as_of
       FROM pilot_quota
      WHERE COALESCE(noc, '') = ''`,
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
  return aggregatePilotQuota(res.rows.map(communityRow))
}

/** 逐社区明细(后续详情用):社区级名额状态 + 该社区官网明文满额的 NOC 行 */
export async function fetchPilotQuotaDetail(community?: string): Promise<{
  communities: PilotQuotaCommunityRow[]
  occupations: PilotQuotaOccRow[]
}> {
  const p = await pool()
  if (!p) return { communities: [], occupations: [] }
  const cond = community ? ' AND community = $1' : ''
  const params = community ? [community] : []
  const [comm, occ] = await Promise.all([
    p.query(
      `SELECT community, province, type, first_come, first_come_quote, first_come_url,
              per_intake, per_intake_quote, per_intake_url,
              remaining, remaining_quote, remaining_url, as_of
         FROM pilot_quota WHERE COALESCE(noc, '') = ''${cond} ORDER BY community`, params,
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    p.query(
      `SELECT community, province, type, noc, status, quote, url, as_of
         FROM pilot_quota WHERE COALESCE(noc, '') <> ''${cond} ORDER BY community, noc`, params,
    ).catch(() => ({ rows: [] as Record<string, unknown>[] })),
  ])
  return {
    communities: comm.rows.map(communityRow),
    occupations: occ.rows.map((r) => ({
      community: String(r.community ?? ''),
      province: String(r.province ?? ''),
      type: String(r.type ?? ''),
      noc: String(r.noc ?? ''),
      status: String(r.status ?? ''),
      quote: String(r.quote ?? ''),
      url: String(r.url ?? ''),
      asOf: String(r.as_of ?? ''),
    })),
  }
}
