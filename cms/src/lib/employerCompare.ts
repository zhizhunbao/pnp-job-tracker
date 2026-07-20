// 多雇主对比服务端聚合(D3 / E5-06,2026-07-20 Frank「三问按推荐,开工」)。
// 零新抓取:companies(LMIA/行业/知名/K 调查)+ jobs 聚合 + stats.difficulty(E12-07)+ lib/match(与我的匹配)。
// Pro gate 在页面层(免费不调本函数,示例值硬编码前端);红线:摆事实不下结论、LMIA=历史事实≠担保(措辞在 i18n)。
import { getPayload } from 'payload'
import config from '@/payload.config'
import { match, normalizeProfile, hasProfile, type MatchDims, type MatchJob, type MatchProfile } from './match'
import { CMP_MAX, type CompareRow } from './employerCompareShared'

export { CMP_MAX }
export type { CompareRow }

const teerOf = (noc: string) => (noc && noc.length === 5 && /\d/.test(noc[1]) ? Number(noc[1]) : null)

export async function compareEmployers(names: string[], profileRaw: unknown, dims: MatchDims | null): Promise<CompareRow[]> {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, CMP_MAX)
  if (clean.length < 2) return []
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const lower = clean.map((n) => n.toLowerCase())

  const { rows: cos } = await pool.query(
    `SELECT id, name, industry, alias_zh, alias_ko, wiki_url, website, ai_brief, ai_website,
            lmia_positions, lmia_positions_skilled, lmia_last_quarter
       FROM companies WHERE lower(name) = ANY($1)`, [lower])
  const p = normalizeProfile(profileRaw as any)
  const withMatch = !!dims && hasProfile(p)

  const out: CompareRow[] = []
  for (const name of clean) {
    const c = cos.find((x: any) => String(x.name).toLowerCase() === name.toLowerCase())
    if (!c) continue   // 不在库的名字直接跳过(入口只来自库内行,正常不会发生)
    // 在库开放岗聚合 + 匹配用字段(封顶 400 行,防超大雇主拖垮)
    const { rows: js } = await pool.query(
      `SELECT noc, province, pnp_eligible, pnp_stream, ee_category, salary_annual, wage_med_annual, score, aip
         FROM jobs WHERE company_id = $1 AND status != 'closed' LIMIT 400`, [c.id])
    const provCount: Record<string, number> = {}
    let named = 0, aip = false
    const scores: number[] = [], sals: number[] = []
    let high = 0, mid = 0
    for (const j of js) {
      if (j.province) provCount[j.province] = (provCount[j.province] || 0) + 1
      if (j.pnp_stream) named++
      if (j.aip) aip = true
      if (j.score != null) scores.push(Number(j.score))
      if (j.salary_annual != null) sals.push(Number(j.salary_annual))
      if (withMatch) {
        const mj: MatchJob = {
          noc: j.noc || '', teer: teerOf(j.noc || ''), province: j.province || '', pnpEligible: !!j.pnp_eligible,
          pnpStream: j.pnp_stream || '', eeCategory: j.ee_category || '', salaryAnnual: j.salary_annual == null ? null : Number(j.salary_annual),
          wageMedAnnual: j.wage_med_annual == null ? null : Number(j.wage_med_annual),
        }
        const m = match(p as MatchProfile, mj, dims!)
        if (m.level === 'high') high++
        else if (m.level === 'mid') mid++
      }
    }
    const mainProvince = Object.entries(provCount).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    sals.sort((a, b) => a - b)
    out.push({
      name: c.name, industry: c.industry || '', aliasZh: c.alias_zh || '', aliasKo: c.alias_ko || '',
      wiki: c.wiki_url || '', website: c.website || c.ai_website || '', aiBrief: c.ai_brief || '',
      lmiaPositions: c.lmia_positions == null ? null : Number(c.lmia_positions),
      lmiaPositionsSkilled: c.lmia_positions_skilled == null ? null : Number(c.lmia_positions_skilled),
      lmiaLastQuarter: c.lmia_last_quarter || '',
      aip,
      openJobs: js.length, avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      namedJobs: named, medSalary: sals.length ? Math.round(sals[Math.floor(sals.length / 2)]) : null,
      mainProvince, diffTier: null,
      matchHigh: withMatch ? high : null, matchMid: withMatch ? mid : null,
    })
  }
  // 主要省难度档(E12-07 stats.difficulty 同源)
  const provs = [...new Set(out.map((r) => r.mainProvince).filter(Boolean))]
  if (provs.length) {
    const { rows: ds } = await pool.query(
      `SELECT province, difficulty FROM stats WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND province = ANY($1) AND difficulty IS NOT NULL`, [provs])
    for (const r of out) {
      const d = ds.find((x: any) => x.province === r.mainProvince)?.difficulty
      const obj = typeof d === 'string' ? JSON.parse(d || 'null') : d
      r.diffTier = obj?.tier || null
    }
  }
  return out
}
