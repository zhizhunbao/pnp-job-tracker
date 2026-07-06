'use client'
// 定价弹窗(E8-02,2026-07-06 用户拍板「定价也是弹窗」):对照表+按钮三态与 /pricing 页同一份代码
// (PricingCard,不许 fork)。/pricing 页保留供直链/SEO/Stripe 回跳,站内入口一律开本弹窗。
// caps 用 lib/plan.ts 常量(客户端 bundle 取默认值;若哪天用 env 改分层数字,记得 NEXT_PUBLIC 化或改走 props)。
import { useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'
import { IconCheck, IconStar } from '../Icons'
import { AuthModal } from './AuthForm'
import { FREE_ADVISOR_TRIES, FREE_JOBTEXT_TRIES, FREE_MATCH_JOBS_PER_DAY, PRO_ADVISOR_DAILY } from '@/lib/plan'

export type PriceCaps = { advisor: number; jobtext: number; match: number; proAdvisor: number }
export const CLIENT_CAPS: PriceCaps = { advisor: FREE_ADVISOR_TRIES, jobtext: FREE_JOBTEXT_TRIES, match: FREE_MATCH_JOBS_PER_DAY, proAdvisor: PRO_ADVISOR_DAILY }
const [P30, P90] = (process.env.NEXT_PUBLIC_PRICE_DISPLAY || 'CA$19,CA$39').split(',').map((s) => s.trim())

/** 对照表 + CTA 三态(未登录→注册/已登录→Checkout/已 Pro→账户)。页面版与弹窗版共用。 */
export function PricingCard({ t, loggedIn, pro, caps, onRegister }: { t: TFn; loggedIn: boolean; pro: boolean; caps: PriceCaps; onRegister: () => void }) {
  const [busy, setBusy] = useState(false)
  const buy = async (plan: '30' | '90') => {
    if (!loggedIn) { onRegister(); return }
    setBusy(true)
    try { (window as any).umami?.track('checkout', { plan }) } catch { /* E7-02:Checkout 发起事件 */ }
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
  const yes = <IconCheck />
  const no = t('price.no')
  const rows: [string, React.ReactNode, React.ReactNode][] = [
    ['price.f1', yes, yes],
    ['price.f2', yes, yes],
    ['price.f3', t('price.firstN', { n: caps.match }), t('price.unlimited')],
    ['price.f4', t('price.dayN', { n: caps.advisor }), t('price.fairN', { n: caps.proAdvisor })],
    ['price.f5', t('price.dayN', { n: caps.jobtext }), t('price.unlimited')],
    ['price.f6', no, yes],
    ['price.f7', no, yes],
  ]
  const btn: React.CSSProperties = { width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}></th>
            <th style={{ padding: '12px 16px', fontWeight: 700, width: 150 }}>{t('price.free')}<div style={{ fontSize: 16, marginTop: 4 }}>{t('price.freePrice')}</div></th>
            <th style={{ padding: '12px 16px', fontWeight: 700, width: 200, color: '#b45309' }}><IconStar /> {t('price.pro')}
              <div style={{ fontSize: 16, marginTop: 4, color: '#111827' }}>{P30} <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400 }}>{t('price.per30')}</span></div>
              <div style={{ fontSize: 16, color: '#111827' }}>{P90} <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400 }}>{t('price.per90')}</span></div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, f, p]) => (
            <tr key={k} style={{ borderTop: '1px solid #f3f4f6' }}>
              <td style={{ padding: '10px 16px', color: '#374151' }}>{t(k)}</td>
              <td style={{ padding: '10px 16px', textAlign: 'center', color: f === no ? '#d1d5db' : '#4b5563' }}>{f}</td>
              <td style={{ padding: '10px 16px', textAlign: 'center', color: '#15803d', fontWeight: 500 }}>{p}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '16px', borderTop: '1px solid #f3f4f6' }}>
        {pro ? (
          <a href="/account" style={{ ...btn, display: 'block', textAlign: 'center', background: '#fef3c7', color: '#92400e', textDecoration: 'none' }}><IconStar /> {t('price.cta.acct')}</a>
        ) : loggedIn ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => buy('30')} disabled={busy} style={{ ...btn, background: '#2563eb', color: '#fff', opacity: busy ? 0.6 : 1 }}>{t('price.cta.buy30')} · {P30}</button>
            <button onClick={() => buy('90')} disabled={busy} style={{ ...btn, background: '#1d4ed8', color: '#fff', opacity: busy ? 0.6 : 1 }}>{t('price.cta.buy90')} · {P90}</button>
          </div>
        ) : (
          <button onClick={onRegister} style={{ ...btn, background: '#2563eb', color: '#fff' }}>{t('price.cta.reg')}</button>
        )}
        <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>
          {t('price.note')} <a href="/legal/terms" target="_blank" rel="noreferrer" style={{ color: '#6b7280' }}>{t('foot.terms')}</a>
        </div>
      </div>
    </div>
  )
}

export function PricingModal({ t, loggedIn, pro, onClose, z = 50 }: { t: TFn; loggedIn: boolean; pro: boolean; onClose: () => void; z?: number }) {
  const [auth, setAuth] = useState(false)
  return (
    <Modal onClose={onClose} size="lg" z={z}>
      <h3 style={{ margin: 0, fontSize: 18, color: '#111827', textAlign: 'center' }}>{t('price.title')}</h3>
      <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', margin: '6px 0 16px' }}>{t('price.sub')}</p>
      <PricingCard t={t} loggedIn={loggedIn} pro={pro} caps={CLIENT_CAPS} onRegister={() => setAuth(true)} />
      {auth && <AuthModal t={t} mode="register" z={z + 10} onClose={() => setAuth(false)} onDone={() => window.location.reload()} />}
    </Modal>
  )
}
