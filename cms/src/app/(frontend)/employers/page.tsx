/**
 * 雇主板的门(2026-09-13 雇主板批二:/employers/designated 与 /employers/hiring 两个入口 301 合到这一块板,
 * 板读雇主池,组 × 省切面)。入口契约不断:`/employers?prov=SK&noc=72310`(决策页「查雇主」)直达并预置筛选,
 * noc 由装配函数换算成行业组;`/employers?sort=designated&program=AIP` 同理。
 *
 * @author Frank
 * @time 2026-09-13 18:30:00
 */
import { employersBoardProps } from '@/lib/employers/server'
import { getDb } from '@/lib/db/server'
import { checkedAt } from '@/lib/jobs/server'
import { cookies, headers } from 'next/headers'
import { Employers, employersColsCookieOf, employersMetaOf } from '@/components/employers'
import { Footer } from '@/components/footer'
import { toJobPlan } from '@/components/jobs'
import { hasProfile, normalizeProfile, type ProfileJson } from '@/lib/jobs'
import { getUser, isPro } from '@/lib/quota/server'
import type { SessionUser } from '@/components/jobs'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'

export const dynamic = 'force-dynamic'

/**
 * 雇主板的 metadata:标题按省码加范围前缀,直达链接进来时标题就说清看的是哪一省。
 * 拼装在 components/employers 的 employersMetaOf 里(2026-08-29 Frank
 * 「generateMetadata 体内只许一行 return 调桶的函数」),门里只剩取参。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题与描述。
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ prov?: string }> }) {
  const sp = await searchParams
  return employersMetaOf(sp)
}

/**
 * 雇主板的门:一行装配(employersBoardProps,db 注入)+ 拼壳与正文。
 *
 * @param x Next 递来的查询参数。
 * @returns 整页。
 */
export default async function EmployersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const db = await getDb()
  const props = await employersBoardProps({ sp: await searchParams, db })
  const updatedAt = await checkedAt(db)
  const user = await getUser(await headers())
  const profile = normalizeProfile(user?.profile as ProfileJson | null)
  const plan = toJobPlan({
    user: user as SessionUser | null, pro: isPro(user), profile, profileOk: hasProfile(profile),
  })
  return (
    <Frame>
      <Header />
      <Employers initial={props.initial}
        initialFilters={props.initialFilters}
        updatedAt={updatedAt}
        initialCols={employersColsCookieOf(await cookies())}
        plan={plan} />
      <Footer />
    </Frame>
  )
}
