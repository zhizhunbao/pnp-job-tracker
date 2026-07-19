// 政策时间线页(C6-01):SSR 三查合并(照 rankings 模式);SEO=generateMetadata。
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TimelineView } from './TimelineView'
import { fetchTimeline } from '@/lib/timeline'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Canada immigration timeline — PNP & Express Entry draws, policy updates | Offer2PR',
    description:
      'One timeline of provincial nominee draws (BC/AB/MB, with provincial scales), federal Express Entry category draws, and official policy announcements across Canada — with draw cadence stats (days since last draw, average interval). Historical facts with sources, no predictions. 加拿大移民时间线:省抽选+联邦 EE 抽选+官方政策公告,含抽选节奏统计。',
  }
}

export default async function TimelinePage() {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const data = await fetchTimeline(pool)
  return <TimelineView {...data} />
}
