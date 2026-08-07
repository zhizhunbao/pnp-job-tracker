// B3 担保雇主名单导出(docs/implementation/在招担保雇主/03_B3):付费层=按当前筛选出全量 CSV。
// 事实免费结论收费:浏览/筛选在 /employers 免费,**成文件带走的名单**是付费交付物。
// 红线:CSV 只含库内可核验事实列,无任何「好签/成功率」字样(凭证=粗筛信号非担保承诺)。
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { applySponsorFilters, fetchSponsorEmployers } from '@/lib/sponsorEmployers'

export const dynamic = 'force-dynamic'

const PROV_OK = new Set(['NS', 'NB', 'NL', 'PE', 'ON', 'BC', 'AB', 'SK', 'MB', 'QC'])
// CSV 字段转义:含逗号/引号/换行才加引号(Excel 兼容;BOM 让中文别名不乱码)
const esc = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: Request) {
  const user = await getUser(await headers()).catch(() => null)
  if (!user || !isPro(user)) return Response.json({ error: 'pro' }, { status: 402 })

  const sp = new URL(req.url).searchParams
  const one = (k: string) => (sp.get(k) || '').trim()
  const fRaw = one('f')
  const filters = {
    f: (fRaw === 'aip' || fRaw === 'lmia' || fRaw === 'named' ? fRaw : '') as '' | 'aip' | 'lmia' | 'named',
    prov: PROV_OK.has(one('prov').toUpperCase()) ? one('prov').toUpperCase() : '',
    noc: /^\d{5}$/.test(one('noc')) ? one('noc') : '',
    q: one('q').slice(0, 80),
    sort: (one('sort') === 'skilled' ? 'skilled' : 'open') as 'open' | 'skilled',
  }
  const payload = await getPayload({ config: await config })
  const rows = applySponsorFilters(await fetchSponsorEmployers((payload.db as any).pool), filters)

  const head = ['employer', 'aip_designated', 'lmia_positions_2yr', 'lmia_skilled', 'lmia_last_quarter', 'pnp_in_demand_hit', 'open_jobs', 'provinces', 'city']
  const body = rows.map((r) => [
    esc(r.name), r.aip ? 'yes' : '', r.lmiaPositions || '', r.lmiaPositionsSkilled ?? '', esc(r.lmiaLastQuarter),
    r.named ? 'yes' : '', r.openJobs, esc(r.provs.join('|')), esc(r.city),
  ].join(','))
  const csv = '﻿' + head.join(',') + '\n' + body.join('\n') + '\n'
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sponsor-employers.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
