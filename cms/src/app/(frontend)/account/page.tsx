'use client'
// 账户状态页(E3-02):已登录=账户态(Pro 到期/登出;Stripe 回跳落点);未登录=复用共享 AuthForm。
// 顶栏登录走弹框(AuthModal),本页保留给直接访问/回跳场景。
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

  const refresh = () => fetch('/api/users/me', { credentials: 'include' })
    .then((r) => r.json()).then((d) => setMe(d?.user ?? null))
    .catch(() => setMe(null)).finally(() => setChecked(true))
  useEffect(() => { refresh() }, [])

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
          <AuthForm t={t} onDone={refresh} />
        </div>
      )}
    </div>
  )
}
