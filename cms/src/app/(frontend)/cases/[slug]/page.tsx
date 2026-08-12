// 处境页(SEO 落地页,样板 C01)。设计:docs/design/案例库-问题与结果先行-20260803.md §1。
//
// 只给**有事实层**的处境出页(CASE_PAGES 白名单)—— 剩下 15 条只有问题、没有事实,
// 出成页就是空壳,被索引反而拉低整站质量。有一条算一条。
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { CASES, type L3 } from '@/lib/caseLibrary'
import { CASE_PAGES, caseAnswer } from '@/lib/caseFacts'
import { ssrLang } from '@/lib/lang.server'
import { getVerdictData } from '@/lib/verdictCache'
import { CaseView } from './CaseView'

// 🔴 **不要加回 generateStaticParams**(2026-08-11 实撞):它与 force-dynamic 同时存在时,
// 这一页会在**构建期**被预渲染,之后无论库里怎么变、页面都停在部署那一刻 ——
// 实证:库里 MPNP 提名已是 2,673,生产页仍渲 2,670,而响应头是 no-store(不是 CDN 缓存)。
// 这一页的每个数字都来自库(提名量、名额、在招岗数、判定核),冻住 = 对用户撒谎。
// 处境页总共就几条,没有预渲染的必要;SEO 靠 SSR 一样吃得到。
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const spec = CASE_PAGES[slug]
  const entry = spec && CASES.find((c) => c.id === spec.caseId)
  if (!entry) return {}
  // 标题用**用户原话**,不用我们的行话 —— 这一页要接的就是照着这句话搜过来的人。
  // 语言跟站里同一套判据(cookie → Accept-Language):爬虫不带 cookie、Accept-Language 多为 en,
  // 正是本站 88% 的流量所在,标题写死中文等于把英文搜索结果拱手让人。
  const lang = await ssrLang()
  const t = (l: L3) => l[lang] || l.zh
  return { title: `${t(entry.q)} | Offer2PR`, description: `${t(entry.label)}。${t(entry.q)}` }
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

  // 三语原样传下去,由视图按当前语言取 —— 服务端这里定死一种,切语言就切不动了
  return <CaseView caseId={entry.id} label={entry.label} question={entry.q} answer={answer} />
}
