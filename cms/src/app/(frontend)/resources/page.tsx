// 官方资源导航页(E4-05):SEO 落地页 + 把散落全站的官方链接归拢一页。纯静态 curated,零业务逻辑。
import type { Metadata } from 'next'
import { RES } from './data'
import { ResourcesView } from './ResourcesView'

export const metadata: Metadata = {
  title: '加拿大移民官方资源导航 — IRCC/省提名/工资/LMIA 官方入口 | Offer2PR',
  description:
    '加拿大移民官方资源一页汇总:IRCC 快速通道与 CRS、各省提名(PNP)、Job Bank 工资、LMIA/AIP 雇主担保、处理时间与费用、持牌顾问核验。Official Canadian immigration resources in one place.',
}

// ItemList JSON-LD(rich result):用 data.ts 单一来源,名称+官方 URL。
const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: RES.flatMap((g) => g.items).map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.name, url: it.url,
  })),
}

export default function ResourcesPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    <ResourcesView />
  </>
}
