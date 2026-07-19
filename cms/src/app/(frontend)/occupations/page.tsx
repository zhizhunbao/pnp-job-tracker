// 紧缺职业清单页(B4-01):SSR 直查 pnp_occupations(183 行,一页展示);SEO 主体=generateMetadata。
import { getPayload } from 'payload'
import config from '@/payload.config'
import { OccupationsView } from './OccupationsView'
import { fetchOccupations } from '@/lib/directory'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Provincial in-demand occupation lists (PNP named streams) | Offer2PR',
    description:
      'Named occupation lists of provincial nominee streams across Canada, refreshed weekly from official pages, with NOC codes and official source links. Being listed is a rough signal, not an eligibility decision. 各省省提名通道紧缺职业清单,NOC 码+官方来源链,周更。',
  }
}

export default async function OccupationsPage() {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const rows = await fetchOccupations(pool)
  return <OccupationsView rows={rows} />
}
