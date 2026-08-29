/**
 * 紧缺职业清单页(B4-01)的门:SSR 直查 pnp_occupations(183 行,一页展示);
 * SEO 主体 = generateMetadata。2026-08-28 换装批:壳件(整页外框 / 顶栏 / 页脚)
 * 拼装收回本门(Frank「组装只许在 (frontend) 页面门里」,样张 companies),
 * Occupations 只出 Shell 轨往下的正文。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Occupations } from '@/components/occupations'
import { Frame } from '@/components/shell'
import { loadOccupations } from '@/lib/employers/server'
import { dbOf } from '@/lib/db/server'

export const dynamic = 'force-dynamic'

/**
 * 本页的 SEO 头(清单页是收录主体:标题带「省提名通道紧缺职业清单」,
 * 描述里先说清「命中 = 粗筛信号,非资格认定」)。
 *
 * @returns 页面元数据。
 */
export async function generateMetadata() {
  return {
    title: 'Provincial in-demand occupation lists (PNP named streams) | Offer2PR',
    description:
      'Named occupation lists of provincial nominee streams across Canada, refreshed weekly from official pages, with NOC codes and official source links. Being listed is a rough signal, not an eligibility decision. 各省省提名通道紧缺职业清单,NOC 码+官方来源链,周更。',
  }
}

/**
 * 清单页的门:取库 → 拼壳与正文。
 *
 * @returns 整页。
 */
export default async function OccupationsPage() {
  const payload = await getPayload({ config: await config })
  const rows = await loadOccupations(dbOf(payload))
  return (
    <Frame>
      <Header active="employers" />
      <Occupations rows={rows} />
      <Footer />
    </Frame>
  )
}
