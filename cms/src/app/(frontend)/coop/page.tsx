/**
 * 校内板的门(/coop;2026-09-13 立域,设计稿 docs/design/coop域-20260913.md 第五轮):
 * Frank「在一级 title 上加呢」「那就不需要分 tab 了」「照着 jobs 的 table 来做,只是不需要那么多列」。
 * 帖在 jobs 表里 status=campus(第三态,只这一页读;职位板 / 统计不看它),点职位落职位详情页。
 * 门只拼装:取数(db 注入)→ 壳 + 顶栏 + 正文 + 页脚。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { Coop, COOP_META } from '@/components/coop'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { loadCoopJobs } from '@/lib/coop/server'
import { getDb } from '@/lib/db/server'
import { checkedAt } from '@/lib/jobs/server'

export const dynamic = 'force-dynamic'

/**
 * 本页的 SEO 头(静态 B 形:内容住桶 constants 的 COOP_META,门里一行转发)。
 */
export const metadata = COOP_META

/**
 * 校内板的门。
 *
 * @returns 整页。
 */
export default async function CoopPage() {
  const db = await getDb()
  const rows = await loadCoopJobs({ db })
  const updatedAt = await checkedAt(db)
  return (
    <Frame>
      <Header />
      <Coop rows={rows} updatedAt={updatedAt} />
      <Footer />
    </Frame>
  )
}
