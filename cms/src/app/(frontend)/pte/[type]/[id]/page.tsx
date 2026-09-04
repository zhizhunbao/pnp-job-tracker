/**
 * /pte/[type]/[id] 单题页的门(id = `源-源内id`,如 /pte/wfd/ynwac-11):取参 + 取池 + 三发取数 +
 * 拼组件。查无此题走 notFound。评论 SSR 带下(过审的考试记录与留言)。
 * 2026-09-03 批二新立(设计稿 docs/design/PTE刷题-20260903.md,效果图 img/PTE单题*-*)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { PteItem, loadPteComments, loadPteItem, loadPteNavRows, loadPteTypes, pteItemMetaOf, typeAt } from '@/components/pte'
import { Frame } from '@/components/shell'
import { getDb } from '@/lib/db/server'
import { getUser, isPro } from '@/lib/quota/server'

export const dynamic = 'force-dynamic'

/**
 * 单题页的 SEO 头:标题带英文题型名、题号与题面首句;查无此题禁收录。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题、描述与 robots。
 */
export async function generateMetadata({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params
  const db = await getDb()
  const types = await loadPteTypes({ db })
  const item = await loadPteItem({ db, type, id })
  return pteItemMetaOf({ item, type: typeAt({ types, code: type.toUpperCase() }) })
}

/**
 * 单题页的门:取参、取池、三发取数、拼壳与正文,没有别的。
 *
 * @param props Next 传进来的路由段。
 * @returns 整页。
 */
export default async function PteItemPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params
  const db = await getDb()
  const item = await loadPteItem({ db, type, id })
  if (item == null) notFound()
  const types = await loadPteTypes({ db })
  const comments = await loadPteComments({ db, qid: item.q.qid })
  const rowsByType = await loadPteNavRows({ db, types })
  const user = await getUser(await headers())
  return (
    <Frame>
      <Header loggedIn={!!user} />
      <PteItem types={types} item={item} comments={comments} loggedIn={!!user} pro={isPro(user)}
        rowsByType={rowsByType} />
      <Footer />
    </Frame>
  )
}
