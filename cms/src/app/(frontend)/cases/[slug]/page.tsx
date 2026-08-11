// 处境页(SEO 落地页,样板 C01)。设计:docs/design/案例库-问题与结果先行-20260803.md §1。
//
// 只给**有事实层**的处境出页(CASE_PAGES 白名单)—— 剩下 15 条只有问题、没有事实,
// 出成页就是空壳,被索引反而拉低整站质量。有一条算一条。
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { CASES } from '@/lib/caseLibrary'
import { CASE_PAGES, caseAnswer } from '@/lib/caseFacts'
import { getVerdictData } from '@/lib/verdictCache'
import { CaseView } from './CaseView'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return Object.keys(CASE_PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const spec = CASE_PAGES[slug]
  const entry = spec && CASES.find((c) => c.id === spec.caseId)
  if (!entry) return {}
  // 标题用**用户原话**,不用我们的行话 —— 这一页要接的就是照着这句话搜过来的人
  return { title: `${entry.q.zh} | Offer2PR`, description: `${entry.label.zh}。${entry.q.zh} 按官方数据逐条摆事实,每条带出处。` }
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const spec = CASE_PAGES[slug]
  const entry = spec && CASES.find((c) => c.id === spec.caseId)
  if (!entry) notFound()

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } }).pool
  const sql = pool
    ? (q: string, v?: unknown[]) => pool.query(q, v)
    : async () => ({ rows: [] as Record<string, unknown>[] })

  // 结论全部来自判定核;算不出来就不出页(空壳页不该被索引)
  const data = await getVerdictData()
  const answer = await caseAnswer(slug, data, sql).catch(() => null)
  if (!answer) notFound()

  return <CaseView caseId={entry.id} label={entry.label.zh} question={entry.q.zh} answer={answer} />
}
