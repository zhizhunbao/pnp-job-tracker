'use client'
// 升级 Pro 专用弹框(用户定:注册弹框与购买弹框分离,升级入口不再跳 /account)。
// 仅在已登录上下文渲染(未登录的升级入口先走 AuthModal 注册)。
// 价格展示走 NEXT_PUBLIC_PRICE_DISPLAY(与 /pricing 同源,构建期内联);Checkout 复用 /api/billing/checkout。
import { useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'
import { IconStar } from '../Icons'
import { PricingModal } from './PricingModal'

const [P30, P90] = (process.env.NEXT_PUBLIC_PRICE_DISPLAY || 'CA$19,CA$39').split(',').map((s) => s.trim())

export function UpgradeModal({ t, onClose, reason }: { t: TFn; onClose: () => void; reason?: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [compare, setCompare] = useState(false)  // 对比表开定价弹窗(E8-02:站内不跳页)
  const buy = async (plan: '30' | '90') => {
    setBusy(true); setErr('')
    try { (window as any).umami?.track('checkout', { plan }) } catch { /* E7-02:Checkout 发起事件 */ }
    try {
      const r = await fetch('/api/billing/checkout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }),
      })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.url) { window.location.href = d.url; return }
      setErr(t('acct.err.generic')); setBusy(false)
    } catch { setErr(t('acct.err.generic')); setBusy(false) }
  }
  const btn: React.CSSProperties = {
    flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 9,
    color: '#fff', cursor: 'pointer', opacity: busy ? 0.6 : 1,
  }
  return (
    <Modal onClose={onClose} size="sm" z={60}>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: '#92400e', paddingRight: 36 }}><IconStar /> {t('acct.buyTitle')}</div>
      {reason && <div style={{ fontSize: 13, color: '#78716c', marginTop: 8 }}>{reason}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={() => buy('30')} disabled={busy} style={{ ...btn, background: '#2563eb' }}>{t('acct.buy30')} · {P30}</button>
        <button onClick={() => buy('90')} disabled={busy} style={{ ...btn, background: '#1d4ed8' }}>{t('acct.buy90')} · {P90}</button>
      </div>
      {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 10px' }}>{err}</div>}
      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 12 }}>{t('acct.buyNote')}</div>
      <button onClick={() => setCompare(true)} style={{ display: 'block', marginTop: 10, fontSize: 12.5, color: '#2563eb', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}>{t('up.compare')} →</button>
      {/* 本弹框只出现在已登录未 Pro 上下文(见文件头注释) */}
      {compare && <PricingModal t={t} loggedIn pro={false} z={70} onClose={() => setCompare(false)} />}
    </Modal>
  )
}
