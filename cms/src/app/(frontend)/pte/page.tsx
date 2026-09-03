/**
 * /pte 题单页的门(默认题型 WFD —— Frank 故事一「默认 WFD」):取池 + 两发取数 + 拼组件。
 * 一页一型的正门在 /pte/[type],本门只是默认型那一页。
 * 2026-09-03 批二新立(设计稿 docs/design/PTE刷题-20260903.md)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { headers } from 'next/headers'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { PTE_DEFAULT_TYPE, PTE_META, Pte, loadPteList, loadPteTypes } from '@/components/pte'
import { Frame } from '@/components/shell'
import { getDb } from '@/lib/db/server'
import { getUser } from '@/lib/quota/server'

export const dynamic = 'force-dynamic'

/**
 * 本页的 SEO 头(内容住桶 constants 的 PTE_META,门里只一行转发)。
 */
export const metadata = PTE_META

/**
 * 题单页(默认型)的门:取池、两发取数、拼壳与正文,没有别的。
 *
 * @returns 整页。
 */
export default async function PtePage() {
  const db = await getDb()
  const types = await loadPteTypes({ db })
  const rows = await loadPteList({ db, type: PTE_DEFAULT_TYPE })
  const user = await getUser(await headers())
  return (
    <Frame>
      <Header loggedIn={!!user} />
      <Pte types={types} type={PTE_DEFAULT_TYPE} rows={rows} />
      <Footer />
    </Frame>
  )
}
