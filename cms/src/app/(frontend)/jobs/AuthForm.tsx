'use client'
// 登录/注册共享表单 + 弹框(E3-02;B6 视觉翻新:分段切换 + 聚焦态 + 品牌头)。
// 全走 Payload 自带 REST(httpOnly cookie),特权字段由 Users collection 字段级锁保护。
import { useState } from 'react'
import type { TFn } from './i18n'
import { useOverlayClose } from './overlay'

const inputS: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14,
  border: '1.5px solid #e5e7eb', borderRadius: 9, marginTop: 6, background: '#fafafa',
  outline: 'none', transition: 'border-color .15s, background .15s, box-shadow .15s',
}
const btnS: React.CSSProperties = {
  width: '100%', padding: '11px 0', fontSize: 14.5, fontWeight: 600, border: 'none', borderRadius: 9,
  background: 'linear-gradient(180deg,#3b82f6,#2563eb)', color: '#fff', cursor: 'pointer', marginTop: 18,
  boxShadow: '0 2px 8px rgba(37,99,235,.35)',
}

export function AuthForm({ t, onDone, initialMode }: { t: TFn; onDone: () => void; initialMode?: 'login' | 'register' }) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode ?? 'login')
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
        try { (window as any).umami?.track('signup') } catch { /* E7-02:注册成功事件 */ }
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

  const seg = (m: 'login' | 'register', label: string) => (
    <button type="button" onClick={() => { setMode(m); setErr('') }}
      style={{
        flex: 1, padding: '8px 0', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: 8,
        background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#1d4ed8' : '#6b7280',
        boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition: 'all .15s',
      }}>
      {label}
    </button>
  )

  return (
    <div>
      <style>{`.authIn:focus{border-color:#3b82f6 !important;background:#fff !important;box-shadow:0 0 0 3px rgba(59,130,246,.12)}`}</style>
      {/* 品牌头 */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 30, lineHeight: 1 }}>🍁</div>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: '#111827', marginTop: 6 }}>PNP Job Tracker</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{t('tagline')}</div>
      </div>
      {/* 登录/注册 分段切换 */}
      <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {seg('login', t('acct.login'))}
        {seg('register', t('acct.register'))}
      </div>
      <form onSubmit={submit}>
        <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block' }}>{t('acct.email')}
          <input className="authIn" style={inputS} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        </label>
        <div style={{ height: 12 }} />
        <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block' }}>{t('acct.password')}
          <input className="authIn" style={inputS} type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" />
        </label>
        {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 10px' }}>{err}</div>}
        <button type="submit" disabled={busy} style={{ ...btnS, opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : mode === 'login' ? t('acct.login') : t('acct.submitReg')}
        </button>
      </form>
      <div style={{ fontSize: 11.5, color: '#c4c4c8', marginTop: 14, textAlign: 'center' }}>{t('acct.forgot')}</div>
    </div>
  )
}

// mode:入口决定初始 tab(注册 CTA 直达注册,用户定「注册也要弹框」;默认登录)
export function AuthModal({ t, onClose, onDone, mode }: { t: TFn; onClose: () => void; onDone: () => void; mode?: 'login' | 'register' }) {
  const ov = useOverlayClose(onClose)
  return (
    <div {...ov}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(17,24,39,.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: 'min(390px, 100%)', background: '#fff', borderRadius: 16, padding: '1.75rem 1.75rem 1.4rem', boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
        <button onClick={onClose} aria-label="close"
          style={{ position: 'absolute', top: 10, right: 12, border: 'none', background: '#f3f4f6', borderRadius: 8, width: 28, height: 28, fontSize: 15, color: '#6b7280', cursor: 'pointer', lineHeight: 1 }}>×</button>
        <AuthForm t={t} onDone={onDone} initialMode={mode} />
      </div>
    </div>
  )
}
