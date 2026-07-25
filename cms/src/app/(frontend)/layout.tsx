import React from 'react'
import './styles.css'

// 站点默认 metadata(各页 generateMetadata 覆盖);E7-02:umami 轻量 analytics(无 cookie,env 未设=本地不注入)
export const metadata = {
  title: 'Offer2PR — Canadian jobs with an immigration-value lens',
  description: 'Daily-updated Canada-wide job board: PNP streams, EE categories, wages vs median, profile matching. 每日更新的全加拿大职位板,带移民价值视角。',
  verification: { google: 'zm002EQ20ckam-N3hvapv6J3YeF_ebKfv7_UymszCA4' }, // GSC 站点所有权(E7-03;验证后不可删)
}

// #135 品牌词 SEO:WebSite/Organization JSON-LD 帮 Google 建品牌实体,alternateName 收「offer to pr」分词形态
const siteJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Offer2PR',
    alternateName: ['offer to pr', 'offer 2 pr', 'Offer to PR'],
    url: 'https://offer2pr.com',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Offer2PR',
    url: 'https://offer2pr.com',
  },
]

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_ID

  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />
        {umamiSrc && umamiId ? <script defer src={umamiSrc} data-website-id={umamiId} /> : null}
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
