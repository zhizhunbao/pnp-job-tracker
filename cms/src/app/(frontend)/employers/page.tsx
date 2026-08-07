// B2 在招担保雇主页(docs/implementation/在招担保雇主/02_B2):
// 默认视图=在招×凭证聚合(进程内 TTL 缓存,lib/sponsorEmployers);
// 旧名录视图保留在 ?type=aip|lmia 下原样渲染(已收录 SEO 页不断链,B4-01 原实现未动)。
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { normalizeProfile } from '@/lib/match'
import { EmployersView } from './EmployersView'
import { SponsorEmployersView } from './SponsorEmployersView'
import { fetchAipEmployers, fetchLmiaEmployers } from '@/lib/directory'
import { fetchSponsorEmployers, filterSponsorEmployers, type SponsorFilters } from '@/lib/sponsorEmployers'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Sponsor employers hiring now — AIP designated & LMIA-approved | Offer2PR',
    description:
      'Employers hiring right now with sponsorship track records: AIP designated employers (official NS/NB/NL lists), employers with approved LMIA positions in the past two years (ESDC open data), and employers hiring occupations on provincial in-demand lists. Historical facts with sources — not a sponsorship promise. 在招担保雇主:AIP 指定 / 近两年 LMIA 获批 / 紧缺清单命中,全部官方公开数据。',
  }
}

const PROV_OK = new Set(['NS', 'NB', 'NL', 'PE', 'ON', 'BC', 'AB', 'SK', 'MB', 'QC'])

// 职业筛选候选(Frank 08-08「还需要加上职业筛选」):datalist 检索用,~500 行,1h 进程缓存
let occCache: { ts: number; rows: { noc: string; title: string; titleZh: string }[] } | null = null
async function occOptions(pool: any) {
  if (occCache && Date.now() - occCache.ts < 3600_000) return occCache.rows
  const { rows } = await pool.query(`SELECT noc, title, COALESCE(title_zh, '') AS title_zh FROM noc_descriptions ORDER BY title`).catch(() => ({ rows: [] }))
  occCache = { ts: Date.now(), rows: rows.map((r: any) => ({ noc: r.noc, title: r.title ?? '', titleZh: r.title_zh ?? '' })) }
  return occCache.rows
}

export default async function EmployersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ''

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool

  // ── 旧名录视图(?type=aip|lmia):B4-01 原样(SEO 兼容)──
  const legacy = one(sp.type)
  if (legacy === 'aip' || legacy === 'lmia') {
    const type = legacy === 'aip' ? 'aip' as const : 'lmia' as const
    const q = one(sp.q).slice(0, 80)
    const prov = ['NS', 'NB', 'NL', 'PE'].includes(one(sp.prov).toUpperCase()) ? one(sp.prov).toUpperCase() : ''   // B4:PE 名录已入(Wayback 官方页)
    const page = Math.max(0, Math.min(500, parseInt(one(sp.page), 10) || 0))
    const [aipAll, lmiaAll, cur] = await Promise.all([
      fetchAipEmployers(pool, { q: '', prov: '', page: 0 }).then((r) => r.total),
      fetchLmiaEmployers(pool, { q: '', page: 0 }).then((r) => r.total),
      type === 'aip' ? fetchAipEmployers(pool, { q, prov, page }) : fetchLmiaEmployers(pool, { q, page }),
    ])
    return (
      <EmployersView type={type} q={q} prov={prov} page={page}
        aip={type === 'aip' ? (cur.items as any) : null}
        lmia={type === 'lmia' ? (cur.items as any) : null}
        counts={{ aip: aipAll, lmia: lmiaAll, pageTotal: cur.total }} />
    )
  }

  // ── B2 默认视图:在招担保雇主 ──
  const fRaw = one(sp.f)
  const filters: SponsorFilters = {
    f: fRaw === 'aip' || fRaw === 'lmia' || fRaw === 'named' ? fRaw : '',
    prov: PROV_OK.has(one(sp.prov).toUpperCase()) ? one(sp.prov).toUpperCase() : '',
    city: one(sp.city).slice(0, 60),
    noc: /^\d{5}$/.test(one(sp.noc)) ? one(sp.noc) : '',
    q: one(sp.q).slice(0, 80),
    sort: one(sp.sort) === 'skilled' ? 'skilled' : 'open',
    page: Math.max(0, Math.min(500, parseInt(one(sp.page), 10) || 0)),
  }
  // 职业输入框(datalist 值形如「Cooks(63200)」):抓 5 位码覆盖 noc
  const occDigits = one(sp.occ).match(/\d{5}/)
  if (occDigits) filters.noc = occDigits[0]
  // B3:Pro 态(导出钮直链/去定价)+ 档案一键筛(nocCodes/targetProvinces 有值才出 chip)
  const [all, occTitle, user, occs] = await Promise.all([
    fetchSponsorEmployers(pool),
    filters.noc
      ? pool.query(`SELECT title FROM noc_descriptions WHERE noc = $1 LIMIT 1`, [filters.noc])
          .then((r: any) => r.rows[0]?.title ?? '').catch(() => '')
      : Promise.resolve(''),
    getUser(await headers()).catch(() => null),
    occOptions(pool),
  ])
  const prof = normalizeProfile((user as any)?.profile)
  const myNoc = prof.nocCodes.find((n) => /^\d{5}$/.test(n)) ?? ''
  const myProv = prof.targetProvinces.find((p) => PROV_OK.has(p)) ?? ''
  const { items, total } = filterSponsorEmployers(all, filters)
  // 三级联动候选:选了省才给市(该省雇主的城市按出现雇主数排,前 60;全国态不出市级)
  const cityOptions = filters.prov
    ? (() => {
        const cnt = new Map<string, number>()
        for (const r of all) if (r.provs.includes(filters.prov)) for (const c of r.cities) cnt.set(c, (cnt.get(c) ?? 0) + 1)
        return [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([c]) => c).sort()
      })()
    : []
  return <SponsorEmployersView query={filters} items={items} total={total} occTitle={occTitle}
    pro={!!user && isPro(user)} myFilter={myNoc || myProv ? { noc: myNoc, prov: myProv } : null} cityOptions={cityOptions} occOptions={occs} />
}
