/**
 * 政策时间线页(C6-01)的门:SSR 三查合并(照 rankings 模式)→ 拼组件;SEO 走 generateMetadata。
 * 2026-08-28 换装批:壳件拼装收进门里(Frank「组装只许在 (frontend) 页面门里」,样张 companies)
 * —— 整页外框走 shell 桶的通用件 Frame,顶栏与页脚在这里拼,Timeline 只出 Shell 轨往下的视图。
 *
 * @author Frank
 * @time 2026-07-19 12:42:23
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { Timeline } from '@/components/timeline'
import { dbOf } from '@/lib/db/server'
import { fetchTimeline } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

/**
 * 这页的 SEO 头(时间线是全站唯一一处把省抽选、联邦 EE 抽选与官方政策公告排在一条轴上的页面,
 * 描述里把这三路与「历史统计、不预测」的口径一并说清)。
 *
 * @returns 标题与描述。
 */
export async function generateMetadata() {
  return {
    title: 'Canada immigration timeline — PNP & Express Entry draws, policy updates | Offer2PR',
    description:
      'One timeline of provincial nominee draws (BC/AB/MB, with provincial scales), federal Express Entry category draws, and official policy announcements across Canada — with draw cadence stats (days since last draw, average interval). Historical facts with sources, no predictions. 加拿大移民时间线:省抽选+联邦 EE 抽选+官方政策公告,含抽选节奏统计。',
  }
}

/**
 * 时间线页的门:一次取数(三查合并在 lib/plan 里)+ 大写组件的拼装,没有别的。
 *
 * @returns 整页。
 */
export default async function TimelinePage() {
  const payload = await getPayload({ config: await config })
  const data = await fetchTimeline(dbOf(payload))
  return (
    <Frame>
      <Header active="news" />
      <Timeline events={data.events} cadence={data.cadence} eeCadence={data.eeCadence} />
      <Footer />
    </Frame>
  )
}
