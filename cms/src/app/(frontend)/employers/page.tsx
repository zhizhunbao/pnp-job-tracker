// 雇主名录页(B4-01):SSR 直查维度表(照 rankings 页模式);SEO 主体=generateMetadata。
// 免费引流面(C7 头号痛点)——「哪个雇主真的雇过外国人」browse+搜索;转化钩=行内深链职位板。
import { getPayload } from 'payload'
import config from '@/payload.config'
import { EmployersView } from './EmployersView'
import { fetchAipEmployers, fetchLmiaEmployers } from '@/lib/directory'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Employer directory — AIP designated employers & LMIA-approved records | Offer2PR',
    description:
      'Browse Atlantic Immigration Program designated employers (NS/NB/NL official lists) and employers with approved LMIA positions in the past two years (ESDC open data, skilled streams). Historical facts with sources — not a sponsorship promise. 雇主名录:AIP 指定雇主官方名单 + 近两年 LMIA 获批记录雇主,全部官方公开数据。',
  }
}

export default async function EmployersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ''
  const type = one(sp.type) === 'aip' ? 'aip' as const : 'lmia' as const
  const q = one(sp.q).slice(0, 80)
  const prov = ['NS', 'NB', 'NL'].includes(one(sp.prov).toUpperCase()) ? one(sp.prov).toUpperCase() : ''
  const page = Math.max(0, Math.min(500, parseInt(one(sp.page), 10) || 0))

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  // tab 徽标计数(无筛)与当前 tab 数据并行拉
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
