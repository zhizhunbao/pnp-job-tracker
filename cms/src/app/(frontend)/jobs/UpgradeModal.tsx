'use client'
// 升级 Pro 专用弹框(用户定:注册弹框与购买弹框分离,升级入口不再跳 /account)。
// 仅在已登录上下文渲染(未登录的升级入口先走 AuthModal 注册)。
// 价格展示走 NEXT_PUBLIC_PRICE_DISPLAY(与 /pricing 同源,构建期内联);Checkout 复用 /api/billing/checkout。
import { useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'
import { IconStar } from '../Icons'
import { PricingModal, PRICE } from './PricingModal'
import { AuthModal } from './AuthForm'
import { Button } from '../ui/primitives'

// 统一升级钮 UpgradeCta(⓪ 2026-07-19 Frank 批「升级 Pro 按钮单独设计」):⭐ 实心棕 pro 型,
// 全站升级入口从裸文字链换装到这;已登录=开升级弹框,未登录=开注册框(行为与原各处一致)。
export function UpgradeCta({ t, loggedIn, sm = true, reason, label, style }: {
  t: TFn; loggedIn: boolean; sm?: boolean; reason?: string; label?: string; style?: React.CSSProperties
}) {
  const [open, setOpen] = useState<false | 'up' | 'auth'>(false)
  return (
    <>
      <Button kind="pro" sm={sm} style={style} onClick={() => setOpen(loggedIn ? 'up' : 'auth')}><IconStar /> {label || t('up.cta2')}</Button>
      {open === 'up' && <UpgradeModal t={t} reason={reason} onClose={() => setOpen(false)} />}
      {open === 'auth' && <AuthModal t={t} mode="register" onClose={() => setOpen(false)} onDone={() => window.location.reload()} />}
    </>
  )
}

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
      {/* #74 随 #64 换装:90 天钮补「省 N%」徽标,两钮补每天单价(数学与 PricingCard 同源 PRICE) */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={() => buy('30')} disabled={busy} style={{ ...btn, background: '#2563eb' }}>
          <div>{t('acct.buy30')} · {PRICE.p30}</div>
          <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>{t('price.perDay', { v: PRICE.perDay(PRICE.p30, 30) })}</div>
        </button>
        <button onClick={() => buy('90')} disabled={busy} style={{ ...btn, background: '#b45309', position: 'relative' }}>
          <span style={{ position: 'absolute', top: -9, right: 8, background: '#f59e0b', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{t('price.save', { p: PRICE.savePct })}</span>
          <div>{t('acct.buy90')} · {PRICE.p90}</div>
          <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>{t('price.perDay', { v: PRICE.perDay(PRICE.p90, 90) })}</div>
        </button>
      </div>
      {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 10px' }}>{err}</div>}
      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 12 }}>{t('acct.buyNote')}</div>
      <button onClick={() => setCompare(true)} style={{ display: 'block', marginTop: 10, fontSize: 12.5, color: '#2563eb', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}>{t('up.compare')} →</button>
      {/* 本弹框只出现在已登录未 Pro 上下文(见文件头注释) */}
      {compare && <PricingModal t={t} loggedIn pro={false} z={70} onClose={() => setCompare(false)} />}
    </Modal>
  )
}
