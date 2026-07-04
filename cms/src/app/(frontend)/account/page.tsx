'use client'
// 账户状态页(E3-02):已登录=账户态(Pro 到期/登出;Stripe 回跳落点);未登录=复用共享 AuthForm。
// 顶栏登录走弹框(AuthModal),本页保留给直接访问/回跳场景。
// E3-03:时长包购买入口(30/90 天)——前端只拿 Checkout URL 跳转,回跳 ?ok=1 提示(到期日由 webhook 拨)。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { AuthForm } from '../jobs/AuthForm'

type Me = { id: string | number; email: string; role?: string; proUntil?: string | null } | null

const card: React.CSSProperties = { maxWidth: 400, margin: '3rem auto', padding: '1.75rem', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }
const btn: React.CSSProperties = { width: '100%', padding: '9px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 14 }

export default function AccountPage() {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const t = makeT(lang)

  const [me, setMe] = useState<Me>(null)
  const [checked, setChecked] = useState(false)
  const [payOk, setPayOk] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyErr, setBuyErr] = useState('')
  useEffect(() => { setPayOk(new URLSearchParams(window.location.search).get('ok') === '1') }, [])

  const refresh = () => fetch('/api/users/me', { credentials: 'include' })
    .then((r) => r.json()).then((d) => setMe(d?.user ?? null))
    .catch(() => setMe(null)).finally(() => setChecked(true))
  useEffect(() => { refresh() }, [])

  const logout = async () => {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
    await refresh()
  }

  const buy = async (plan: '30' | '90') => {
    setBuying(true); setBuyErr('')
    try {
      const r = await fetch('/api/billing/checkout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.url) { setBuyErr(t('acct.payErr')); return }
      window.location.href = d.url   // 跳 Stripe Checkout,成功回跳 /account?ok=1
    } catch { setBuyErr(t('acct.payErr')) } finally { setBuying(false) }
  }

  const pro = !!me?.proUntil && new Date(me.proUntil) > new Date()

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/jobs" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none' }}>🍁 PNP Job Tracker</a>
          <a href="/jobs" style={{ fontSize: 12.5, color: '#6b7280', textDecoration: 'none' }}>{t('acct.back')}</a>
        </div>
      </header>

      {!checked ? null : me ? (
        <div style={card}>
          <h1 style={{ fontSize: 18, margin: '0 0 14px' }}>{t('acct.title')}</h1>
          {payOk && <div style={{ background: '#ecfdf5', color: '#047857', fontSize: 13, padding: '8px 10px', borderRadius: 6, marginBottom: 12 }}>{t('acct.payOk')}</div>}
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div>👤 {me.email}</div>
            <div>{pro
              ? <span style={{ color: '#b45309', fontWeight: 600 }}>⭐ {t('acct.plan.pro', { d: (me.proUntil || '').slice(0, 10) })}</span>
              : <span style={{ color: '#6b7280' }}>{t('acct.plan.free')}</span>}
            </div>
          </div>
          {/* 时长包购买(E3-03):Pro 也可续买,到期日顺延 */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>{t('acct.buyTitle')}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => buy('30')} disabled={buying} style={{ ...btn, background: '#2563eb', color: '#fff', opacity: buying ? 0.6 : 1 }}>{t('acct.buy30')}</button>
              <button onClick={() => buy('90')} disabled={buying} style={{ ...btn, background: '#1d4ed8', color: '#fff', opacity: buying ? 0.6 : 1 }}>{t('acct.buy90')}</button>
            </div>
            {buyErr && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{buyErr}</div>}
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>{t('acct.buyNote')}</div>
          </div>
          <button onClick={logout} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>{t('acct.logout')}</button>
        </div>
      ) : (
        <div style={card}>
          <AuthForm t={t} onDone={refresh} />
        </div>
      )}
    </div>
  )
}
