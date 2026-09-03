/**
 * 在招雇主入口的门(2026-08-16 重做:与 `/employers/designated` 合并成同一块**雇主板**,
 * 口径作筛选项之一)。入口契约不变:`/employers/hiring?prov=SK&noc=72310` 仍直达并预置筛选
 * (初评表「查雇主」的落点)。口径:该省该职业正在招人的雇主,来自本站每日职位库
 * (不是官方名录)。
 *
 * @author Frank
 * @time 2026-08-16 01:28:24
 */
import { employersBoardProps } from '@/lib/employers/server'
import { getDb } from '@/lib/db/server'
import { checkedAt } from '@/lib/jobs/server'
import { Employers, MODE_HIRING, hiringMetaOf } from '@/components/employers'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'

export const dynamic = 'force-dynamic'

/**
 * 在招页的 metadata:标题按省码加范围前缀,直达链接进来时标题就说清看的是哪一省。
 * 拼装在 components/employers 的 hiringMetaOf 里(2026-08-29 Frank
 * 「generateMetadata 体内只许一行 return 调桶的函数」),门里只剩取参。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题与描述。
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ prov?: string }> }) {
  const sp = await searchParams
  return hiringMetaOf(sp)
}

/**
 * 在招页的门:一行装配(employersBoardProps,db 注入)+ 拼壳与正文;
 * 雇主板视图与 `/employers/designated` 同一件,靠 mode 分口径。
 *
 * @param x Next 递来的查询参数。
 * @returns 整页。
 */
export default async function HiringEmployersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const db = await getDb()
  const props = await employersBoardProps({ sp: await searchParams, mode: MODE_HIRING, db })
  const updatedAt = await checkedAt(db)
  return (
    <Frame>
      <Header />
      <Employers initial={props.initial} initialFilters={props.initialFilters} updatedAt={updatedAt} />
      <Footer />
    </Frame>
  )
}
