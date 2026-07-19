'use client'
// 定价页视图(E5-01):对照表与按钮三态在 jobs/PricingModal.tsx 的 PricingCard(单一来源,弹窗/页面共用);
// 本页只是 SEO/直链/Stripe 回跳用的页面壳(E8-02 拍板:站内入口一律开定价弹窗)。caps 由服务端 plan.ts 传入。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { AuthModal } from '../jobs/AuthForm'
import { PricingCard, type PriceCaps } from '../jobs/PricingModal'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageShell } from '../ui/primitives'

export function PricingView({ loggedIn, pro, caps }: { loggedIn: boolean; pro: boolean; caps: PriceCaps }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
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
