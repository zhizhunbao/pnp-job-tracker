'use client'
// 账户状态页(E3-02):仅已登录态(Pro 到期/档案/购买/登出;Stripe 回跳落点)。
// 登录入口全站只有一个 = /jobs 顶栏弹框(用户定):未登录访问本页 → 跳回 /jobs?login=1 自动弹框。
// E3-03:时长包购买入口(30/90 天)——前端只拿 Checkout URL 跳转,回跳 ?ok=1 提示(到期日由 webhook 拨)。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { IconCheckCircle, IconStar, IconUser } from '../Icons'
import { ProfileForm, type ProfileValue } from './ProfileForm'
import { SavedSearchList } from './SavedSearchList'

type Me = { id: string | number; email: string; role?: string; proUntil?: string | null; profile?: ProfileValue | null } | null

function RedirectToLogin() {
  useEffect(() => { window.location.replace('/jobs?login=1') }, [])
  return null
}

const card: React.CSSProperties = { maxWidth: 420, margin: '3rem auto', padding: '2rem 1.9rem 1.6rem', border: '1px solid #eef0f3', borderRadius: 16, background: '#fff', boxShadow: '0 8px 30px rgba(17,24,39,.06)' }
const btn: React.CSSProperties = { width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 9, cursor: 'pointer', marginTop: 14 }

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
    try { (window as any).umami?.track('checkout', { plan }) } catch { /* E7-02:Checkout 发起事件 */ }
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
    <div style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#eef2ff 55%,#f8fafc 100%)', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <header style={{ background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(6px)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/jobs" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none' }}>🍁 PNP Job Tracker</a>
          <a href="/jobs" style={{ fontSize: 12.5, color: '#6b7280', textDecoration: 'none' }}>{t('acct.back')}</a>
        </div>
      </header>

      {!checked ? null : me ? (
        <div style={card}>
          <h1 style={{ fontSize: 18, margin: '0 0 14px' }}>{t('acct.title')}</h1>
          {payOk && <div style={{ background: '#ecfdf5', color: '#047857', fontSize: 13, padding: '8px 10px', borderRadius: 6, marginBottom: 12 }}><IconCheckCircle /> {t('acct.payOk')}</div>}
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div><IconUser /> {me.email}</div>
            <div>{pro
              ? <span style={{ color: '#b45309', fontWeight: 600 }}><IconStar /> {t('acct.plan.pro', { d: (me.proUntil || '').slice(0, 10) })}</span>
              : <span style={{ color: '#6b7280' }}>{t('acct.plan.free')}</span>}
            </div>
          </div>
          {/* 移民档案(E5-00):匹配层输入;key 按 id 防换号残留 */}
          <ProfileForm key={String(me.id)} t={t} userId={me.id} initial={me.profile ?? null} />
          {/* 已保存筛选(E5-03):邮件提醒管理 */}
          <SavedSearchList t={t} />
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
        // 未登录:回首页弹登录框(不渲染独立登录页)
        <RedirectToLogin />
      )}
    </div>
  )
}
