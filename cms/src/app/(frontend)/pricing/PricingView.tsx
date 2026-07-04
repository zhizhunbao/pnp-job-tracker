'use client'
// 定价页视图(E5-01):对照表数值由服务端 plan.ts 传入(单一来源);按钮三态(未登录→注册/已登录→Checkout/已 Pro→账户)。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, LANGS, type Lang } from '../jobs/i18n'
import { AuthModal } from '../jobs/AuthForm'

type Caps = { advisor: number; jobtext: number; match: number; proAdvisor: number }

export function PricingView({ loggedIn, pro, price30, price90, caps }: { loggedIn: boolean; pro: boolean; price30: string; price90: string; caps: Caps }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  const [auth, setAuth] = useState(false)
  const [busy, setBusy] = useState(false)

  const buy = async (plan: '30' | '90') => {
    if (!loggedIn) { setAuth(true); return }
    setBusy(true)
    try {
      const r = await fetch('/api/billing/checkout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }),
      })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.url) window.location.href = d.url
      else setBusy(false)
    } catch { setBusy(false) }
  }

  // 对照表行:标签键 × [免费值, Pro 值](值=渲染好的字符串)
  const rows: [string, string, string][] = [
    ['price.f1', t('price.yes'), t('price.yes')],
    ['price.f2', t('price.yes'), t('price.yes')],
    ['price.f3', t('price.firstN', { n: caps.match }), t('price.unlimited')],
    ['price.f4', t('price.dayN', { n: caps.advisor }), t('price.fairN', { n: caps.proAdvisor })],
    ['price.f5', t('price.dayN', { n: caps.jobtext }), t('price.unlimited')],
    ['price.f6', t('price.no'), t('price.yes')],
    ['price.f7', t('price.no'), t('price.yes')],
  ]
  const btn: React.CSSProperties = { width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/jobs" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none' }}>🍁 PNP Job Tracker</a>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLangSaved(l.code)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, padding: '0 4px', color: lang === l.code ? '#2563eb' : '#9ca3af', fontWeight: lang === l.code ? 700 : 400 }}>{l.label}</button>
              ))}
            </span>
            <a href="/jobs" style={{ fontSize: 12.5, color: '#6b7280', textDecoration: 'none' }}>{t('acct.back')}</a>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '2.5rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: 24, margin: 0, textAlign: 'center' }}>{t('price.title')}</h1>
        <p style={{ fontSize: 13.5, color: '#6b7280', textAlign: 'center', margin: '8px 0 24px' }}>{t('price.sub')}</p>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}></th>
                <th style={{ padding: '12px 16px', fontWeight: 700, width: 150 }}>{t('price.free')}<div style={{ fontSize: 16, marginTop: 4 }}>{t('price.freePrice')}</div></th>
                <th style={{ padding: '12px 16px', fontWeight: 700, width: 200, color: '#b45309' }}>⭐ {t('price.pro')}
                  <div style={{ fontSize: 16, marginTop: 4, color: '#111827' }}>{price30} <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400 }}>{t('price.per30')}</span></div>
                  <div style={{ fontSize: 16, color: '#111827' }}>{price90} <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400 }}>{t('price.per90')}</span></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, f, p]) => (
                <tr key={k} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', color: '#374151' }}>{t(k)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: f === t('price.no') ? '#d1d5db' : '#4b5563' }}>{f}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: '#15803d', fontWeight: 500 }}>{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '16px', borderTop: '1px solid #f3f4f6' }}>
            {pro ? (
              <a href="/account" style={{ ...btn, display: 'block', textAlign: 'center', background: '#fef3c7', color: '#92400e', textDecoration: 'none' }}>{t('price.cta.acct')}</a>
            ) : loggedIn ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => buy('30')} disabled={busy} style={{ ...btn, background: '#2563eb', color: '#fff', opacity: busy ? 0.6 : 1 }}>{t('price.cta.buy30')} · {price30}</button>
                <button onClick={() => buy('90')} disabled={busy} style={{ ...btn, background: '#1d4ed8', color: '#fff', opacity: busy ? 0.6 : 1 }}>{t('price.cta.buy90')} · {price90}</button>
              </div>
            ) : (
              <button onClick={() => setAuth(true)} style={{ ...btn, background: '#2563eb', color: '#fff' }}>{t('price.cta.reg')}</button>
            )}
            <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>
              {t('price.note')} <a href="/legal/terms" style={{ color: '#6b7280' }}>{t('foot.terms')}</a>
            </div>
          </div>
        </div>
      </div>
      {auth && <AuthModal t={t} onClose={() => setAuth(false)} onDone={() => window.location.reload()} />}
    </div>
  )
}
