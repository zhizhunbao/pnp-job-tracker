/**
 * 全站骨架:`<html>` / `<head>` / `<body>` 三层外框 + 三个 Provider + 右下角对话挂件。
 * 2026-08-29 形制批:品牌词 JSON-LD 那份死值下沉 components/shell 的 SITE_JSON_LD,
 * 门里只剩拼装。
 *
 * @author Frank
 * @time 2026-06-20 19:10:41
 */
import React from 'react'
import './main.css'
import { LangProvider } from '@/components/i18n'
import { SessionProvider } from '@/components/auth'
import { ChatLauncher } from '@/components/chat'
import { JsonLd } from '@/components/jsonld'
import { SITE_JSON_LD } from '@/components/shell'
import { headers } from 'next/headers'
import { ssrLang } from '@/lib/i18n/server'
import { ssrSessionSeed } from '@/lib/auth/server'
import { getUserOrNull } from '@/lib/quota/server'

/**
 * 站点默认 metadata(各页 generateMetadata 覆盖)。
 */
export const metadata = {
  /**
   * E13-01:不设 metadataBase 时 og:image 按请求 HOST 拼 URL,Render 容器内 HOST=localhost:10000,
   * 分享卡全挂;fallback 必须=正式域(⚠️ Docker 构建拿不到 Render env,robots.ts 同款惯例)。
   */
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com'),

  /**
   * 首页与无自设标题的页共用的标题。
   */
  title: 'Offer2PR — Canadian jobs with an immigration-value lens',

  /**
   * 同上,搜索结果里那段摘要。
   */
  description: 'Daily-updated Canada-wide job board: PNP streams, EE categories, wages vs median, profile matching. 每日更新的全加拿大职位板,带移民价值视角。',

  /**
   * GSC 站点所有权(E7-03;验证后不可删)。
   */
  verification: { google: 'zm002EQ20ckam-N3hvapv6J3YeF_ebKfv7_UymszCA4' },
}

/**
 * 全站骨架的门。
 *
 * E7-02:umami 轻量 analytics(无 cookie,env 未设=本地不注入)。
 *
 * html lang 原来写死 'en':页面出中韩文时对搜索引擎/读屏器都是错的语种声明,跟着一起修。
 *
 * 右下角对话挂件(ChatLauncher):挂在 layout = 全站可用(67.5% 的会话只看一页,
 * 入口=出口=职位详情页,把对话放到流量真正在的地方)。放在 `<main>` 外:它是浮层不是页面内容,
 * 读屏器按顺序读到最后;在 LangProvider 内:壳文案跟全站同一份语言状态。
 * /start 自己判断不显示(那页有内联 ChatBox)。
 *
 * 下面两条是 2026-08-29 形制批从体内原样上提的记录(闸 local/no-comment-in-function:
 * 门里不留函数体注释),一句未删。
 *
 * 界面语言在这里读**一次**(cookie → Accept-Language),往下靠 LangProvider 的 context 分发:
 * 各页 page.tsx 不必传 prop,各视图不必自己读 localStorage —— 首帧就是对的语言,不再闪一下中文。
 *
 * 登录态同样在这里读**一次**(cookie 里有没有会话票据),往下靠 SessionProvider 分发:
 * header 的账户区首帧就按终态占宽,不再「先 32px 占位、水合后撑到 84px」把导航拽偏。
   * 2026-08-29 从布尔升格成身份种子(有票据才认人,匿名零开销):二级页头像原先要等
   * /api/users/me,切页先画占位点再换字母(Frank「来回闪」实拍),SSR 首帧直接带字母。
 *
 * @param props children = 各路由的页面。
 * @returns 整份文档。
 */
export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_ID

  const lang = await ssrLang()
  const session = await ssrSessionSeed({ headers: await headers(), loadUser: getUserOrNull })

  return (
    <html lang={lang}>
      <head>
        <JsonLd json={JSON.stringify(SITE_JSON_LD)} />
        {umamiSrc && umamiId ? <script defer src={umamiSrc} data-website-id={umamiId} /> : null}
      </head>
      <body>
        <LangProvider initial={lang}>
          <SessionProvider initial={session}>
            <main>{children}</main>
            <ChatLauncher />
          </SessionProvider>
        </LangProvider>
      </body>
    </html>
  )
}
