'use client'
// 登录/注册共享表单 + 弹框(E3-02;B6 视觉翻新:分段切换 + 聚焦态 + 品牌头)。
// 全走 Payload 自带 REST(httpOnly cookie),特权字段由 Users collection 字段级锁保护。
import { useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'

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

// 密码强度(注册时实时提示):0=太短(<8,不可提交) 1=弱 2=中 3=强。
// 服务端只强制长度,强度条是引导不是闸门——只有「太短」拦提交,避免误伤转化。
function pwStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length
  if (classes >= 3 || (classes >= 2 && pw.length >= 12)) return 3
  if (classes >= 2) return 2
  return 1
}
const PW_METER = [
  { key: 'acct.pw.short', color: '#dc2626', fill: 0 },
  { key: 'acct.pw.weak', color: '#f59e0b', fill: 1 },
  { key: 'acct.pw.medium', color: '#eab308', fill: 2 },
  { key: 'acct.pw.strong', color: '#16a34a', fill: 3 },
] as const

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
        if (pw.length < 8) { setErr(t('acct.err.weakPw')); return }
        const r = await fetch('/api/users', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pw }),
        })
        if (!r.ok) {
          // 分开报错:Payload 400 响应体带字段级错误——email 相关=已注册,password 相关=密码不合格
          let body = ''
          try { body = JSON.stringify(await r.json()) } catch { /* 非 JSON 响应,走 generic */ }
          if (r.status === 400 && /email|already|registered|exist/i.test(body)) setErr(t('acct.err.exists'))
          else if (r.status === 400 && /password/i.test(body)) setErr(t('acct.err.weakPw'))
          else setErr(t('acct.err.generic'))
          return
        }
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
          {/* minLength 只管注册:登录挂长度校验会把老短密码账号(admin 建的 6 位等)整个拦在门外(2026-07-16 用户实测) */}
          <input className="authIn" style={inputS} type="password" required minLength={mode === 'register' ? 8 : undefined} value={pw} onChange={(e) => setPw(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" />
        </label>
        {mode === 'register' && pw && (() => {
          const lv = pwStrength(pw)
          const m = PW_METER[lv]
          return (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= m.fill ? m.color : '#e5e7eb', transition: 'background .2s' }} />
                ))}
              </div>
              <div style={{ fontSize: 11.5, marginTop: 4, color: m.color }}>
                {t(m.key)}{lv > 0 && lv < 3 ? <span style={{ color: '#9ca3af' }}> · {t('acct.pw.hint')}</span> : null}
              </div>
            </div>
          )
        })()}
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
// 壳统一走 Modal(sm);品牌头保留(用户拍板:登录弹框是品牌触点,仅 chrome 对齐规范)
export function AuthModal({ t, onClose, onDone, mode, z }: { t: TFn; onClose: () => void; onDone: () => void; mode?: 'login' | 'register'; z?: number }) {
  return (
    <Modal onClose={onClose} size="sm" z={z}>
      <AuthForm t={t} onDone={onDone} initialMode={mode} />
    </Modal>
  )
}
