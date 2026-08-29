// 多雇主对比页(D3 / E5-06):SSR gate——Pro 才聚合真值;免费/匿名=示例模糊态(真数据不出服务端)。
// 入口=名录行/公司弹框「+ 对比」(localStorage 选择,URL ?names=a|b|c 落地);sitemap 不收录(Pro 页无 SEO 价值)。
import { headers } from 'next/headers'
import { getUser, isPro } from '@/lib/quota/server'
import { loadMatchDims } from '@/lib/jobs/server'
import type { CompareRow } from '@/lib/employers'
import { compareEmployers } from '@/lib/employers/server'
import { getDb } from '@/lib/db/server'
import { hasProfile, normalizeProfile, type ProfileJson } from '@/lib/jobs'
import { Compare } from '@/components/employers'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'

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
    /**
     * 跨域形状接缝:quota 域声明的 users.profile 允许嵌套对象,jobs 域的 ProfileJson 只到扁平格
     * (两域各自声明自己的形状,不互相取 —— 宪法)。断言只住这一处,收窄由 normalizeProfile 逐格做。
     */
    const p = normalizeProfile(user?.profile as ProfileJson | null)
    rows = await compareEmployers({ db: await getDb(), names, profile: hasProfile(p) ? p : null, dims })
  }
  return (
    <Frame>
      <Header active="employers" />
      <Compare rows={rows} pro={pro} loggedIn={!!user} />
      <Footer />
    </Frame>
  )
}
