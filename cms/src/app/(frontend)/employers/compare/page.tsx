// 多雇主对比页(D3 / E5-06):SSR gate——Pro 才聚合真值;免费/匿名=示例模糊态(真数据不出服务端)。
// 入口=名录行/公司弹框「+ 对比」(localStorage 选择,URL ?names=a|b|c 落地);sitemap 不收录(Pro 页无 SEO 价值)。
import { headers } from 'next/headers'
import { getUser, isPro } from '@/lib/quota/server'
import { loadMatchDims } from '@/lib/jobs/server'
import type { CompareRow } from '@/lib/employers'
import { compareEmployers } from '@/lib/employers/server'
import { getDb } from '@/lib/db/server'
import { hasProfile, normalizeProfile } from '@/lib/jobs'
import { Compare } from './Compare'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Compare employers — LMIA record, AIP status & immigration signals side by side | Offer2PR',
  robots: { index: false },
}

export default async function CompareEmployersPage({ searchParams }: { searchParams: Promise<{ names?: string }> }) {
  const sp = await searchParams
  const names = String(sp?.names || '').split('|').map((s) => s.trim()).filter(Boolean)
  const user = await getUser(await headers())
  const pro = isPro(user)
  let rows: CompareRow[] = []
  if (pro && names.length >= 2) {
    const dims = await loadMatchDims(await getDb()).catch(() => null)
    const p = normalizeProfile((user as any)?.profile)
    rows = await compareEmployers({ db: await getDb(), names, profile: hasProfile(p) ? p : null, dims })
  }
  return <Compare names={names} rows={rows} pro={pro} loggedIn={!!user} />
}
