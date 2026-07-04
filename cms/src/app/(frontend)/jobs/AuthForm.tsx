'use client'
// 登录/注册共享表单 + 弹框(E3-02 修订:顶栏登录走弹框不跳页;/account 页复用同一表单)。
// 全走 Payload 自带 REST(httpOnly cookie),特权字段由 Users collection 字段级锁保护。
import { useState } from 'react'
import type { TFn } from './i18n'

const inputS: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, marginTop: 4 }
const btnS: React.CSSProperties = { width: '100%', padding: '9px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', marginTop: 14 }

export function AuthForm({ t, onDone }: { t: TFn; onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

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
      setPw(''); onDone()
    } catch { setErr(t('acct.err.generic')) } finally { setBusy(false) }
  }

  return (
    <div>
      <h2 style={{ fontSize: 17, margin: '0 0 14px', color: '#111827' }}>{mode === 'login' ? t('acct.login') : t('acct.register')}</h2>
      <form onSubmit={submit}>
        <label style={{ fontSize: 13, color: '#374151' }}>{t('acct.email')}
          <input style={inputS} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <div style={{ height: 10 }} />
        <label style={{ fontSize: 13, color: '#374151' }}>{t('acct.password')}
          <input style={inputS} type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{err}</div>}
        <button type="submit" disabled={busy} style={{ ...btnS, opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : mode === 'login' ? t('acct.login') : t('acct.submitReg')}
        </button>
      </form>
      <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}
        style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', marginTop: 12, padding: 0 }}>
        {mode === 'login' ? t('acct.toReg') : t('acct.toLogin')}
      </button>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>{t('acct.forgot')}</div>
    </div>
  )
}

export function AuthModal({ t, onClose, onDone }: { t: TFn; onClose: () => void; onDone: () => void }) {
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: 'min(380px, 100%)', background: '#fff', borderRadius: 10, padding: '1.5rem 1.5rem 1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
        <button onClick={onClose} aria-label="close"
          style={{ position: 'absolute', top: 8, right: 10, border: 'none', background: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
        <AuthForm t={t} onDone={onDone} />
      </div>
    </div>
  )
}
