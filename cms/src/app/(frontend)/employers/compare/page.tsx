// 多雇主对比页(D3 / E5-06):SSR gate——Pro 才聚合真值;免费/匿名=示例模糊态(真数据不出服务端)。
// 入口=名录行/公司弹框「+ 对比」(localStorage 选择,URL ?names=a|b|c 落地);sitemap 不收录(Pro 页无 SEO 价值)。
import { headers } from 'next/headers'
import { getUser, isPro } from '@/lib/entitlement'
import { loadMatchDims } from '@/lib/matchDims'
import { compareEmployers, type CompareRow } from '@/lib/employerCompare'
import { CompareEmployersView } from './CompareEmployersView'

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
    const dims = await loadMatchDims().catch(() => null)
    rows = await compareEmployers(names, (user as any)?.profile, dims)
  }
  return <CompareEmployersView names={names} rows={rows} pro={pro} loggedIn={!!user} />
}
