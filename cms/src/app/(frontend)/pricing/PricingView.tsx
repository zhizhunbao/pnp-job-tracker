'use client'
// 定价页视图(E5-01):对照表与按钮三态在 jobs/PricingModal.tsx 的 PricingCard(单一来源,弹窗/页面共用);
// 本页只是 SEO/直链/Stripe 回跳用的页面壳(E8-02 拍板:站内入口一律开定价弹窗)。caps 由服务端 plan.ts 传入。
import { useEffect, useState } from 'react'
import { initialLang, makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { AuthModal } from '../jobs/AuthForm'
import { PricingCard, type PriceCaps } from '../jobs/PricingModal'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageShell } from '../ui/primitives'
import { track } from '@/lib/track'

// 来路白名单(低基数,与 lib/funnel 的 PROP_OK 同口径):报告锁区 CTA 带 ?from=rpt-<卡>,其余算直达
const FROM_OK = /^[a-z0-9-]{1,24}$/

export function PricingView({ loggedIn, pro, caps }: { loggedIn: boolean; pro: boolean; caps: PriceCaps }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { setLang(initialLang()) }, [])
  // 漏斗第 4 步(2026-08-03 量数才发现):这一页**从来没有发过 `pricing-open`** ——
  // 先前只有 PricingModal/UpgradeModal 在 mount 时发,而站内唯一直链 /pricing 的入口正是
  // 报告锁区那个 CTA。于是「报告 → 定价」这条**主转化边整条不计数**,面板上第 4 步恒为 0:
  // 那个 0 是量不到,不是没人点。跟 08-02 抓到的「jd-open 从来没有调用点」是同一类洞,往下挪了一格。
  // 带上来路 → 面板能分开看「从报告来的」与「从别处来的」,M3 分叉才有得分。
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('from') ?? ''
    track('pricing-open', { kind: FROM_OK.test(raw) ? raw : 'direct' })
  }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  const [auth, setAuth] = useState(false)

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 全站共享顶栏/页脚(2026-07-16 用户拍板统一 header/footer) */}
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} />

      {/* #67 宽度统一:外轨 PageShell 1320;三卡内容轨 1000 居中(#64 三卡比旧对照表宽,760 挤不下) */}
      <PageShell pad="2.5rem 1.25rem 32px">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{ fontSize: 24, margin: 0, textAlign: 'center' }}>{t('price.title')}</h1>
          <p style={{ fontSize: 13.5, color: '#6b7280', textAlign: 'center', margin: '8px 0 24px' }}>{t('price.sub')}</p>
          <PricingCard t={t} loggedIn={loggedIn} pro={pro} caps={caps} onRegister={() => setAuth(true)} />
        </div>
      </PageShell>
      {auth && <AuthModal t={t} mode="register" onClose={() => setAuth(false)} onDone={() => window.location.reload()} />}
      <SiteFooter t={t} />
    </div>
  )
}
