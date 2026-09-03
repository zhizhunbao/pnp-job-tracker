/**
 * /pte 门厅的门(2026-09-03 晚 Frank「参考 ynwac 首页」→ 门厅三卡:开始练习 / 总体进度 / 最近考了):
 * 取池 + 三发取数 + 拼组件。题单住 /pte/[type],题型清单在顶栏下拉。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { headers } from 'next/headers'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { PTE_META, PteHome, loadPteRecent, loadPteStats } from '@/components/pte'
import { Frame } from '@/components/shell'
import { getDb } from '@/lib/db/server'
import { checkedAt } from '@/lib/jobs/server'
import { getUser } from '@/lib/quota/server'

export const dynamic = 'force-dynamic'

/**
 * 本页的 SEO 头(内容住桶 constants 的 PTE_META,门里只一行转发)。
 */
export const metadata = PTE_META

/**
 * 门厅的门:取池、三发取数、拼壳与正文,没有别的。
 *
 * @returns 整页。
 */
export default async function PtePage() {
  const db = await getDb()
  const stats = await loadPteStats({ db })
  const recent = await loadPteRecent({ db })
  const updatedAt = await checkedAt(db)
  const user = await getUser(await headers())
  return (
    <Frame>
      <Header loggedIn={!!user} />
      <PteHome stats={stats} recent={recent} loggedIn={!!user} updatedAt={updatedAt} />
      <Footer />
    </Frame>
  )
}
