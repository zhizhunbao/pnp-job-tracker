/**
 * 就业把脉七页共用的布局门(2026-11-07 Frank「切换的时候不要刷页面,只有中间的 table 在动」):
 * 全站外框 + 顶栏 + 就业把脉外框(banner、数字卡、侧栏)+ 页脚住这里,七页之间切换不卸载;
 * 各页门只给自己那一段表。取数照原 /start 门:首屏四格走 getHomeCore(10 分钟进程内缓存,带单飞)。
 *
 * @author Frank
 * @time 2026-11-07 23:50:00
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { PulseShell, emptyText, homeStatsOf } from '@/components/start'
import { getHomeCore } from '@/components/start/server'
import { dbOf } from '@/lib/db/server'
import { checkedAt } from '@/lib/jobs/server'

/**
 * 每次请求现取(与原 /start 门同)。
 */
export const dynamic = 'force-dynamic'

/**
 * 就业把脉布局。
 *
 * @param props 这一页的内容(Next 规定的形)。
 * @returns 整页外框。
 */
export default async function PulseLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config: await config })
  const db = dbOf(payload)
  const core = await getHomeCore(db)
  const upd = await checkedAt(db).catch(emptyText)
  return (
    <Frame>
      <Header />
      <PulseShell stats={homeStatsOf({ core, checkedAt: upd })}>{children}</PulseShell>
      <Footer />
    </Frame>
  )
}
