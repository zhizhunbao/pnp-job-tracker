'use client'
// 账户页(E3-02):注册/登录/账户状态三合一。全部走 Payload 自带 REST(httpOnly cookie 会话),零自研鉴权。
// role/proUntil 等特权字段由 Users collection 字段级 access 锁死,前端只做展示。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'

type Me = { id: string | number; email: string; role?: string; proUntil?: string | null } | null

const card: React.CSSProperties = { maxWidth: 400, margin: '3rem auto', padding: '1.75rem', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, marginTop: 4 }
const btn: React.CSSProperties = { width: '100%', padding: '9px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', marginTop: 14 }

export default function AccountPage() {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const t = makeT(lang)

  const [me, setMe] = useState<Me>(null)
  const [checked, setChecked] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const refresh = () => fetch('/api/users/me', { credentials: 'include' })
    .then((r) => r.json()).then((d) => setMe(d?.user ?? null))
    .catch(() => setMe(null)).finally(() => setChecked(true))
  useEffect(() => { refresh() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      if (mode === 'register') {
        const r = await fetch('/api/users', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pw }),
        })
        if (!r.ok) { setErr(t(r.status === 400 ? 'acct.err.exists' : 'acct.err.generic')); return }
      }
      const r2 = await fetch('/api/users/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw }),
      })
      if (!r2.ok) { setErr(t('acct.err.cred')); return }
      setPw(''); await refresh()
    } catch { setErr(t('acct.err.generic')) } finally { setBusy(false) }
  }

  const logout = async () => {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
    await refresh()
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
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div>👤 {me.email}</div>
            <div>{pro
              ? <span style={{ color: '#b45309', fontWeight: 600 }}>⭐ {t('acct.plan.pro', { d: (me.proUntil || '').slice(0, 10) })}</span>
              : <span style={{ color: '#6b7280' }}>{t('acct.plan.free')}</span>}
            </div>
          </div>
          <button onClick={logout} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>{t('acct.logout')}</button>
        </div>
      ) : (
        <div style={card}>
          <h1 style={{ fontSize: 18, margin: '0 0 14px' }}>{mode === 'login' ? t('acct.login') : t('acct.register')}</h1>
          <form onSubmit={submit}>
            <label style={{ fontSize: 13, color: '#374151' }}>{t('acct.email')}
              <input style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <div style={{ height: 10 }} />
            <label style={{ fontSize: 13, color: '#374151' }}>{t('acct.password')}
              <input style={input} type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </label>
            {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{err}</div>}
            <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
              {busy ? '…' : mode === 'login' ? t('acct.login') : t('acct.submitReg')}
            </button>
          </form>
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}
            style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', marginTop: 12, padding: 0 }}>
            {mode === 'login' ? t('acct.toReg') : t('acct.toLogin')}
          </button>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>{t('acct.forgot')}</div>
        </div>
      )}
    </div>
  )
}
