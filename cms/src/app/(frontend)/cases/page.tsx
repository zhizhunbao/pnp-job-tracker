// 常见案例索引(SEO 落地页):16 个真实处境一页列全,做了事实层的带完整案例链接。
// 内链职责从 /plan/pr 挪来(2026-08-13):处境详情页要被爬到,靠这一页 + 顶栏资料库入口。
import { makeT } from '@/lib/i18n'
import type { Metadata } from 'next'
import { CASES } from '@/lib/ruling'
import { Cases } from '@/components/cases'

export const metadata: Metadata = {
  title: '加拿大移民常见案例 — 真实处境与判定结论 | Offer2PR',
  description:
    '安省毕业木匠、海外厨师 CLB 5、PGWP 只剩 8 个月……16 个真实移民处境,每条给官方数据支撑的判定。Common Canadian immigration cases with data-backed verdicts.',
}

const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: CASES.filter((c) => c.page).map((c, i) => ({
    '@type': 'ListItem', position: i + 1, name: makeT('zh')(`case.${c.id}.label`), url: `https://offer2pr.com/cases/${c.page}`,
  })),
}

export default function CasesIndexPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    <Cases />
  </>
}
