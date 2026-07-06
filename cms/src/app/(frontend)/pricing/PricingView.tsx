'use client'
// 定价页视图(E5-01):对照表与按钮三态在 jobs/PricingModal.tsx 的 PricingCard(单一来源,弹窗/页面共用);
// 本页只是 SEO/直链/Stripe 回跳用的页面壳(E8-02 拍板:站内入口一律开定价弹窗)。caps 由服务端 plan.ts 传入。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, LANGS, type Lang } from '../jobs/i18n'
import { AuthModal } from '../jobs/AuthForm'
import { PricingCard, type PriceCaps } from '../jobs/PricingModal'

export function PricingView({ loggedIn, pro, caps }: { loggedIn: boolean; pro: boolean; caps: PriceCaps }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  const [auth, setAuth] = useState(false)

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/jobs" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none' }}>🍁 PNP Job Tracker</a>
          <span>
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLangSaved(l.code)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, padding: '0 4px', color: lang === l.code ? '#2563eb' : '#9ca3af', fontWeight: lang === l.code ? 700 : 400 }}>{l.label}</button>
            ))}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '2.5rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: 24, margin: 0, textAlign: 'center' }}>{t('price.title')}</h1>
        <p style={{ fontSize: 13.5, color: '#6b7280', textAlign: 'center', margin: '8px 0 24px' }}>{t('price.sub')}</p>
        <PricingCard t={t} loggedIn={loggedIn} pro={pro} caps={caps} onRegister={() => setAuth(true)} />
      </div>
      {auth && <AuthModal t={t} mode="register" onClose={() => setAuth(false)} onDone={() => window.location.reload()} />}
    </div>
  )
}
