// Pro 跨省对比(E5-04 §3.4):服务端校验 isPro;已建档用户按「我的 NOC」预选大类并高亮。
import { headers } from 'next/headers'
import { getUser, isPro } from '@/lib/entitlement'
import { normalizeProfile } from '@/lib/match'
import { loadStats, loadStatSources } from '../lib'
import { CompareView } from '../views'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Compare provinces — jobs, wages & PNP streams side by side | PNP Job Tracker', description: 'Pro: compare 2–4 provinces side by side on open jobs, wages and provincial named streams. 跨省并排对比(Pro)。' }
}

export default async function ComparePage() {
  const user = await getUser(await headers())
  const pro = isPro(user)
  const profile = normalizeProfile((user as any)?.profile)
  const rows = pro ? await loadStats() : []
  const srcs = pro ? await loadStatSources() : []
  return <CompareView rows={rows} srcs={srcs} isPro={pro} loggedIn={!!user} myNocs={profile.nocCodes} />
}
