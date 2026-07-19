'use client'
// 登录/注册共享表单 + 弹框(E3-02;#54 改版 2026-07-19:careerbeacon 骨架——大标题文案+社交钮在上+
// 「或用邮箱」分隔+单列表单+底部切换,分段 tab 退役;Google 钮 env 门控(NEXT_PUBLIC_GOOGLE_CLIENT_ID,
// E11-03 后端凭据到位并实测后才配 env → 钮自动亮,只上 Google 一枚,LinkedIn/FB 不做)。
// 全走 Payload 自带 REST(httpOnly cookie),特权字段由 Users collection 字段级锁保护。
import { useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'

const GOOGLE_ON = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const GoogleG = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden style={{ verticalAlign: '-0.155em' }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

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

// E3-07:新增 forgot(找回密码,输邮箱)/ reset(邮件链接落地,设新密码)两态;
// forgot 防枚举=无论邮箱存在与否一律同一提示;reset 成功即登录态(Payload set-cookie),onDone 整页刷新。
export function AuthForm({ t, onDone, initialMode, resetToken }: { t: TFn; onDone: () => void; initialMode?: 'login' | 'register' | 'reset'; resetToken?: string }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode ?? 'login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      if (mode === 'forgot') {
        await fetch('/api/users/forgot-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
        }).catch(() => {})
        setSent(true)   // 防枚举:不看响应,一律「若已注册则已发出」
        return
      }
      if (mode === 'reset') {
        if (pw.length < 8) { setErr(t('acct.err.weakPw')); return }
        const r = await fetch('/api/users/reset-password', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken || '', password: pw }),
        })
        if (!r.ok) { setErr(t('acct.resetBad')); return }
        setPw(''); onDone(); return
      }
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

  return (
    <div>
      <style>{`.authIn:focus{border-color:#3b82f6 !important;background:#fff !important;box-shadow:0 0 0 3px rgba(59,130,246,.12)}`}</style>
      {/* 品牌头(拍板保留:登录弹框=品牌触点)+ 大标题文案(#54:careerbeacon 式价值前置) */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 26, lineHeight: 1 }}>🍁</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 4 }}>Offer2PR</div>
      </div>
      {(mode === 'login' || mode === 'register') && (<>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.4, marginBottom: 16 }}>
          {t(mode === 'login' ? 'acct.hero.login' : 'acct.hero.reg')}
        </div>
        {/* 社交在上(#54 骨架):Google 一枚,env 未配(后端未上线)不渲染 */}
        {GOOGLE_ON && (<>
          <a href="/api/auth/google" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: '10px 0', fontSize: 14, fontWeight: 600, color: '#374151', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 9, textDecoration: 'none' }}>
            <GoogleG /> {t('acct.google')}
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', color: '#9ca3af', fontSize: 11.5 }}>
            <span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />{t('acct.orEmail')}<span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>
        </>)}
      </>)}
      {mode === 'reset' && <div style={{ fontSize: 14.5, fontWeight: 600, color: '#111827', marginBottom: 14, textAlign: 'center' }}>{t('acct.resetTitle')}</div>}
      {mode === 'forgot' && sent ? (
        <div>
          <div style={{ background: '#ecfdf5', color: '#047857', fontSize: 13, padding: '10px 12px', borderRadius: 8 }}>{t('acct.forgotSent')}</div>
          <button type="button" onClick={() => { setMode('login'); setSent(false); setErr('') }}
            style={{ border: 'none', background: 'none', padding: 0, color: '#2563eb', fontSize: 12.5, cursor: 'pointer', marginTop: 12 }}>{t('acct.backLogin')}</button>
        </div>
      ) : (
      <form onSubmit={submit}>
        {mode !== 'reset' && (
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block' }}>{t('acct.email')}
            <input className="authIn" style={inputS} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
          </label>
        )}
        {mode !== 'forgot' && (<>
        {mode !== 'reset' && <div style={{ height: 12 }} />}
        <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block' }}>{t('acct.password')}
          {/* minLength 管注册与重置(都是设新密码);登录挂长度校验会把老短密码账号整个拦在门外(2026-07-16 用户实测) */}
          <input className="authIn" style={inputS} type="password" required minLength={mode === 'login' ? undefined : 8} value={pw} onChange={(e) => setPw(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" />
        </label>
        </>)}
        {(mode === 'register' || mode === 'reset') && pw && (() => {
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
          {busy ? '…' : mode === 'login' ? t('acct.login') : mode === 'register' ? t('acct.submitReg') : mode === 'forgot' ? t('acct.forgotSend') : t('acct.resetBtn')}
        </button>
      </form>
      )}
      {/* 页脚:登录↔注册切换(#54:底部单行取代分段 tab)+ 忘记密码;找回/重置态=返回登录 */}
      {(mode === 'login' || mode === 'register') && (
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}
          style={{ display: 'block', margin: '14px auto 0', border: 'none', background: 'none', padding: 0, fontSize: 12.5, color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>
          {t(mode === 'login' ? 'acct.toReg' : 'acct.toLogin')}
        </button>
      )}
      {mode === 'login' && (
        <button type="button" onClick={() => { setMode('forgot'); setErr('') }}
          style={{ display: 'block', margin: '10px auto 0', border: 'none', background: 'none', padding: 0, fontSize: 11.5, color: '#9ca3af', cursor: 'pointer', textDecoration: 'underline' }}>
          {t('acct.forgot')}
        </button>
      )}
      {(mode === 'reset' || (mode === 'forgot' && !sent)) && (
        <button type="button" onClick={() => { setMode('login'); setErr('') }}
          style={{ display: 'block', margin: '14px auto 0', border: 'none', background: 'none', padding: 0, fontSize: 11.5, color: '#9ca3af', cursor: 'pointer' }}>
          {t('acct.backLogin')}
        </button>
      )}
    </div>
  )
}

// mode:入口决定初始 tab(注册 CTA 直达注册,用户定「注册也要弹框」;默认登录;reset=邮件链接落地设新密码)
// 壳统一走 Modal(sm);品牌头保留(用户拍板:登录弹框是品牌触点,仅 chrome 对齐规范)
export function AuthModal({ t, onClose, onDone, mode, resetToken, z }: { t: TFn; onClose: () => void; onDone: () => void; mode?: 'login' | 'register' | 'reset'; resetToken?: string; z?: number }) {
  return (
    <Modal onClose={onClose} size="sm" z={z}>
      <AuthForm t={t} onDone={onDone} initialMode={mode} resetToken={resetToken} />
    </Modal>
  )
}
