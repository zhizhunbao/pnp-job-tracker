'use client'
// 账户状态页(E3-02):仅已登录态(Pro 到期/档案/购买/登出;Stripe 回跳落点)。
// 登录入口全站只有一个 = /jobs 顶栏弹框(用户定):未登录访问本页 → 跳回 /jobs?login=1 自动弹框。
// E3-03:时长包购买入口(30/90 天)——前端只拿 Checkout URL 跳转,回跳 ?ok=1 提示(到期日由 webhook 拨)。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { IconCheckCircle, IconStar, IconUser } from '../Icons'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { ProfileForm, type ProfileValue } from './ProfileForm'
import { SavedSearchList } from './SavedSearchList'

type Me = { id: string | number; email: string; role?: string; proUntil?: string | null; profile?: ProfileValue | null } | null

function RedirectToLogin() {
  useEffect(() => { window.location.replace('/jobs?login=1') }, [])
  return null
}

const card: React.CSSProperties = { padding: '1.6rem 1.9rem', border: '1px solid #eef0f3', borderRadius: 16, background: '#fff', boxShadow: '0 8px 30px rgba(17,24,39,.06)' }
const btn: React.CSSProperties = { width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 9, cursor: 'pointer', marginTop: 14 }

export default function AccountPage() {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
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
    <div style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#eef2ff 55%,#f8fafc 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 全站共享顶栏/页脚(2026-07-16 用户拍板统一 header/footer);账户在本页为当前态不再链自己 */}
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="account" />

      {!checked ? null : me ? (
        // 四张独立卡(2026-07-16 用户反馈「信息不应杂糅在一起」):账户 / 移民档案 / 已保存筛选 / 升级 Pro
        <div style={{ maxWidth: 420, width: '100%', margin: '2.5rem auto', display: 'grid', gap: 14, boxSizing: 'border-box', padding: '0 1rem' }}>
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
            <button onClick={logout} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>{t('acct.logout')}</button>
          </div>
          {/* 移民档案(E5-00):匹配层输入;key 按 id 防换号残留 */}
          <div style={card}>
            <ProfileForm key={String(me.id)} t={t} userId={me.id} initial={me.profile ?? null} />
          </div>
          {/* 已保存筛选(E5-03):邮件提醒管理 */}
          <div style={card}>
            <SavedSearchList t={t} />
          </div>
          {/* 时长包购买(E3-03):Pro 也可续买,到期日顺延 */}
          <div style={card}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>{t('acct.buyTitle')}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => buy('30')} disabled={buying} style={{ ...btn, background: '#2563eb', color: '#fff', opacity: buying ? 0.6 : 1 }}>{t('acct.buy30')}</button>
              <button onClick={() => buy('90')} disabled={buying} style={{ ...btn, background: '#1d4ed8', color: '#fff', opacity: buying ? 0.6 : 1 }}>{t('acct.buy90')}</button>
            </div>
            {buyErr && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{buyErr}</div>}
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>{t('acct.buyNote')}</div>
          </div>
        </div>
      ) : (
        // 未登录:回首页弹登录框(不渲染独立登录页)
        <RedirectToLogin />
      )}
      <SiteFooter t={t} />
    </div>
  )
}
