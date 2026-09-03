/**
 * /pte/[type] 题单页的门(一页一型:/pte/wfd、/pte/ra …):取参 + 取池 + 两发取数 + 拼组件。
 * 查无此型走 notFound(路由段拼错)。
 * 2026-09-03 批二新立(设计稿 docs/design/PTE刷题-20260903.md)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Pte, loadPteList, loadPteTypes, pteListMetaOf, typeAt } from '@/components/pte'
import { Frame } from '@/components/shell'
import { getDb } from '@/lib/db/server'
import { checkedAt } from '@/lib/jobs/server'
import { getUser } from '@/lib/quota/server'

export const dynamic = 'force-dynamic'

/**
 * 题单页的 SEO 头:标题带英文题型名与题数;查无此型禁收录。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题、描述与 robots。
 */
export async function generateMetadata({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const db = await getDb()
  const types = await loadPteTypes({ db })
  const rows = await loadPteList({ db, type })
  return pteListMetaOf({ type: typeAt({ types, code: type.toUpperCase() }), n: rows.length })
}

/**
 * 题单页的门:取参、取池、两发取数、拼壳与正文,没有别的。
 *
 * @param props Next 传进来的路由段。
 * @returns 整页。
 */
export default async function PteTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const db = await getDb()
  const types = await loadPteTypes({ db })
  const code = type.toUpperCase()
  if (typeAt({ types, code }) == null) notFound()
  const rows = await loadPteList({ db, type })
  const updatedAt = await checkedAt(db)
  const user = await getUser(await headers())
  return (
    <Frame>
      <Header loggedIn={!!user} />
      <Pte types={types} type={code} rows={rows} loggedIn={!!user} updatedAt={updatedAt} />
      <Footer />
    </Frame>
  )
}
