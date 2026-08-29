/**
 * 常见案例索引(SEO 落地页)的门:16 个真实处境一页列全,做了事实层的带完整案例
 * 链接。内链职责从 /plan/pr 挪来(2026-08-13):处境详情页要被爬到,靠这一页 +
 * 顶栏资料库入口。2026-08-27 cases 样张单:壳件(Header/Footer)拼装收回本门
 * (Frank 新令「组装只许在 (frontend) 页面门里」;Header/Footer 语言自理,
 * 服务端门直接拼)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Cases, CasesShell } from '@/components/cases'
import { makeT } from '@/lib/i18n'
import { CASES } from '@/lib/ruling'

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

/**
 * 索引页的门:JSON-LD + 外框里拼壳与正文。
 *
 * @returns 整页。
 */
export default function CasesIndexPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    <CasesShell>
      <Header />
      <Cases />
      <Footer />
    </CasesShell>
  </>
}
