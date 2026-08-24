'use client'
// 定价页视图(E5-01):对照表与按钮三态在 jobs/PricingModal.tsx 的 PricingCard(单一来源,弹窗/页面共用);
// 本页只是 SEO/直链/Stripe 回跳用的页面壳(E8-02 拍板:站内入口一律开定价弹窗)。caps 由服务端 plan.ts 传入。
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { AuthModal } from '@/components/auth'
import { PricingCard, type PriceCaps } from '../jobs/PricingModal'
import { Header } from '../Header'
import { Footer } from '@/components/footer'
import { Shell } from '@/components/ui'
import { track } from '@/lib/track'

// 来路白名单(低基数,与 lib/funnel 的 PROP_OK 同口径):报告锁区 CTA 带 ?from=rpt-<卡>,其余算直达
const FROM_OK = /^[a-z0-9-]{1,24}$/

export function Pricing({ loggedIn, pro, caps }: { loggedIn: boolean; pro: boolean; caps: PriceCaps }) {
  const [lang, setLangSaved, t] = useLang()   // 语言/文案:全站一处(LangProvider),初值由服务端 cookie 定
  // 漏斗第 4 步(2026-08-03 量数才发现):这一页**从来没有发过 `pricing-open`** ——
  // 先前只有 PricingModal/UpgradeModal 在 mount 时发,而站内唯一直链 /pricing 的入口正是
  // 报告锁区那个 CTA。于是「报告 → 定价」这条**主转化边整条不计数**,面板上第 4 步恒为 0:
  // 那个 0 是量不到,不是没人点。跟 08-02 抓到的「jd-open 从来没有调用点」是同一类洞,往下挪了一格。
  // 带上来路 → 面板能分开看「从报告来的」与「从别处来的」,M3 分叉才有得分。
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('from') ?? ''
    track('pricing-open', { kind: FROM_OK.test(raw) ? raw : 'direct' })
  }, [])
  const [auth, setAuth] = useState(false)

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 全站共享顶栏/页脚(2026-07-16 用户拍板统一 header/footer) */}
      <Header lang={lang} setLang={setLangSaved} t={t} />

      {/* #67 宽度统一:外轨 Shell 1320;三卡内容轨 1000 居中(#64 三卡比旧对照表宽,760 挤不下) */}
      <Shell pad="2.5rem 1.25rem 32px">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{ fontSize: 24, margin: 0, textAlign: 'center' }}>{t('price.title')}</h1>
          <p style={{ fontSize: 13.5, color: '#6b7280', textAlign: 'center', margin: '8px 0 24px' }}>{t('price.sub')}</p>
          {/* B3(蓝图 §2):第一卖点 price.pA「担保雇主名单」配真图;货架页 08-08 下架 → 点图落把脉页橱窗;
              只挂页面壳,PricingCard(弹窗共用)不动 */}
          <a href="/start" onClick={() => track('pricing-se-img')} style={{ display: 'block', margin: '0 0 24px' }}>
            <img src={lang === 'zh' ? '/pricing-se-zh.webp' : '/pricing-se-en.webp'} alt={t('se.title')}
              style={{ width: '100%', borderRadius: 12, border: '1px solid #e5e7eb', display: 'block' }} />
          </a>
          <PricingCard t={t} loggedIn={loggedIn} pro={pro} caps={caps} onRegister={() => setAuth(true)} />
        </div>
      </Shell>
      {auth && <AuthModal t={t} mode="register" onClose={() => setAuth(false)} onDone={() => window.location.reload()} />}
      <Footer t={t} />
    </div>
  )
}
