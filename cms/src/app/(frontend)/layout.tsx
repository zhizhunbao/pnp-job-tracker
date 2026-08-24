import React from 'react'
import './main.css'
import { LangProvider } from '@/components/i18n'
import { SessionProvider } from '@/components/auth'
import { ChatLauncher } from './chat/ChatLauncher'
import { ssrLang } from '@/lib/i18n/server'
import { ssrHasSession } from '@/lib/auth/server'

// 站点默认 metadata(各页 generateMetadata 覆盖);E7-02:umami 轻量 analytics(无 cookie,env 未设=本地不注入)
export const metadata = {
  // E13-01:不设 metadataBase 时 og:image 按请求 HOST 拼 URL,Render 容器内 HOST=localhost:10000,
  // 分享卡全挂;fallback 必须=正式域(⚠️ Docker 构建拿不到 Render env,robots.ts 同款惯例)
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com'),
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
  // 界面语言在这里读**一次**(cookie → Accept-Language),往下靠 LangProvider 的 context 分发:
  // 各页 page.tsx 不必传 prop,各视图不必自己读 localStorage —— 首帧就是对的语言,不再闪一下中文。
  const lang = await ssrLang()
  // 登录态同样在这里读**一次**(cookie 里有没有会话票据),往下靠 SessionProvider 分发:
  // header 的账户区首帧就按终态占宽,不再「先 32px 占位、水合后撑到 84px」把导航拽偏。
  const hasSession = await ssrHasSession()

  return (
    // html lang 原来写死 'en':页面出中韩文时对搜索引擎/读屏器都是错的语种声明,跟着一起修
    <html lang={lang}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />
        {umamiSrc && umamiId ? <script defer src={umamiSrc} data-website-id={umamiId} /> : null}
      </head>
      <body>
        <LangProvider initial={lang}>
          <SessionProvider initial={hasSession}>
            <main>{children}</main>
            {/* 右下角对话挂件:挂在 layout = 全站可用(67.5% 的会话只看一页,入口=出口=职位详情页,
                把对话放到流量真正在的地方)。放在 <main> 外:它是浮层不是页面内容,读屏器按顺序读到最后;
                在 LangProvider 内:壳文案跟全站同一份语言状态。/start 自己判断不显示(那页有内联 ChatBox)。 */}
            <ChatLauncher />
          </SessionProvider>
        </LangProvider>
      </body>
    </html>
  )
}
