'use client'
// 定价弹窗(E8-02,2026-07-06 用户拍板「定价也是弹窗」):对照表+按钮三态与 /pricing 页同一份代码
// (PricingCard,不许 fork)。/pricing 页保留供直链/SEO/Stripe 回跳,站内入口一律开本弹窗。
// caps 用 lib/plan.ts 常量(客户端 bundle 取默认值;若哪天用 env 改分层数字,记得 NEXT_PUBLIC 化或改走 props)。
import { useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'
import { Button } from '../ui/primitives'
import { IconCheck, IconStar } from '../Icons'
import { AuthModal } from './AuthForm'
import { FREE_ADVISOR_TRIES, FREE_JOBTEXT_TRIES, FREE_MATCH_JOBS_PER_DAY, PRO_ADVISOR_DAILY } from '@/lib/plan'

export type PriceCaps = { advisor: number; jobtext: number; match: number; proAdvisor: number }
export const CLIENT_CAPS: PriceCaps = { advisor: FREE_ADVISOR_TRIES, jobtext: FREE_JOBTEXT_TRIES, match: FREE_MATCH_JOBS_PER_DAY, proAdvisor: PRO_ADVISOR_DAILY }
const [P30, P90] = (process.env.NEXT_PUBLIC_PRICE_DISPLAY || 'CA$19,CA$39').split(',').map((s) => s.trim())

// #74:价格锚点数学单一来源(PricingCard 与 UpgradeModal 共用,不许 fork)
const num = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0
const cur = P30.replace(/[\d.,]+.*$/, '')                         // "CA$19" → "CA$"
export const PRICE = {
  p30: P30, p90: P90,
  perDay: (p: string, d: number) => `${cur}${(num(p) / d).toFixed(2)}`,
  savePct: num(P30) > 0 ? Math.round((1 - num(P90) / 90 / (num(P30) / 30)) * 100) : 0,
}

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
  // ═══ #64 定价卡片式 v3(Supabase 参考图,效果图 v3 定稿):免费/Pro30/Pro90 三卡取代 10 行对照表。
  // 90 天卡=「更划算·省 N%」徽标+每天单价(随 NEXT_PUBLIC_PRICE_DISPLAY 动态算,改价零代码);
  // 「当前方案」态;清单一行只说一件事(PNP/EE/AIP 拆三行=全站通用原则);图标全 Icons.tsx SVG。
  const { perDay, savePct } = PRICE
  const btn: React.CSSProperties = { width: '100%', padding: '8px 0', fontSize: 13.5, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }
  const Li = ({ dim, children }: { dim?: boolean; children: React.ReactNode }) => (
    <li style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12.8, color: dim ? '#6b7280' : '#374151', lineHeight: 1.55 }}>
      <IconCheck style={{ color: '#15803d', marginTop: 4, flexShrink: 0 }} />
      <span>{children}</span>
    </li>
  )
  const cardS = (hot?: boolean): React.CSSProperties => ({
    position: 'relative', background: '#fff', border: hot ? '1.5px solid #f59e0b' : '1px solid #e5e7eb',
    borderRadius: 12, padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
  })
  // 第 22 轮 dd 抓的当晚回归:nowrap 价格行在 375px 把页面撑出横向溢出、useIsNarrow 时序下三卡挤三窄列
  // → 价格行允许换行;栅格改纯 CSS auto-fit(≤单卡宽自然堆叠,不依赖 JS 宽度探测)
  const priceLine = (p: string, per: string) => (
    <div>
      <span style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{p}</span>
      <span style={{ fontSize: 11.5, color: '#9ca3af' }}> {per}</span>
    </div>
  )
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
        {/* 免费卡 */}
        <div style={cardS()}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{t('price.free')}</div>
          {priceLine(t('price.freePrice'), '')}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <Li>{t('price.f1')}</Li>
            <Li>{t('price.f2a')}</Li>
            <Li>{t('price.f2b')}</Li>
            <Li>{t('price.f2c')}</Li>
            {/* 匹配全放开(Frank 2026-07-21):免费即全量匹配,不再「每日前 N 岗」——收费差异改由 f6 工资中位列承担 */}
            <Li>{t('price.f3')}</Li>
            <Li>{t('price.f4')}({t('price.dayN', { n: caps.advisor })})</Li>
            {/* #201(#96):JD 摘录=通用商品,免费不限——退出付费额度池,不再列日限也不再是 Pro 差异项 */}
            <Li>{t('price.f5')}</Li>
          </ul>
          {pro ? <div style={{ ...btn, textAlign: 'center', background: '#f9fafb', color: '#d1d5db', cursor: 'default' }}>—</div>
            : loggedIn ? <div style={{ ...btn, textAlign: 'center', background: '#f3f4f6', color: '#6b7280', cursor: 'default' }}><IconCheck /> {t('price.cur')}</div>
            // 组件统一 P2(#113):免费注册钮=secondary(购买双钮按 A规格拍板保持现状不并入)
            : <Button kind="secondary" onClick={onRegister} style={{ width: '100%', padding: '8px 0', textAlign: 'center', fontSize: 13.5 }}>{t('price.regFree')}</Button>}
        </div>
        {/* Pro 30 天卡 */}
        <div style={cardS()}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#b45309' }}><IconStar /> {t('price.pro')} 30</div>
          {priceLine(P30, `${t('price.per30')}　${t('price.perDay', { v: perDay(P30, 30) })}`)}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <Li dim>{t('price.plusFree')}</Li>
            {/* 匹配已免费(含在「免费版全部功能」里)→ Pro 卡不再单列匹配;Pro 差异=f6 工资中位列 + 顾问额度等 */}
            <Li>{t('price.f4')}({t('price.fairN', { n: caps.proAdvisor })})</Li>
            <Li>{t('price.f6')}</Li>
            <Li>{t('price.f7')}</Li>
            <Li>{t('price.f8')}</Li>
            <Li>{t('price.f9')}</Li>
            <Li>{t('price.f10')}</Li>
          </ul>
          <button onClick={() => buy('30')} disabled={busy} style={{ ...btn, background: '#2563eb', color: '#fff', opacity: busy ? 0.6 : 1 }}>{t('price.cta.buy30')}　{P30}</button>
        </div>
        {/* Pro 90 天卡(更划算) */}
        <div style={cardS(true)}>
          <span style={{ position: 'absolute', top: -10, right: 12, background: '#f59e0b', color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{t('price.save', { p: savePct })}</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#b45309' }}><IconStar /> {t('price.pro')} 90</div>
          {priceLine(P90, `${t('price.per90')}　${t('price.perDay', { v: perDay(P90, 90) })}`)}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <Li dim>{t('price.same90')}</Li>
          </ul>
          <button onClick={() => buy('90')} disabled={busy} style={{ ...btn, background: '#b45309', color: '#fff', opacity: busy ? 0.6 : 1 }}>{t('price.cta.buy90')}　{P90}</button>
        </div>
      </div>
      {/* 价值锚(第 5 轮 #18):v2 定位对标顾问咨询费;措辞循红线(不构成建议) */}
      <div style={{ fontSize: 11.5, color: '#78716c', marginTop: 10, textAlign: 'center', lineHeight: 1.4 }}>{t('price.anchor')}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'center', lineHeight: 1.4 }}>
        {t('price.note')} <a href="/legal/terms" target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{t('foot.terms')}</a>
        {pro && <>{'　'}<a href="/account" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('price.cta.acct')}</a></>}
      </div>
    </div>
  )
}

export function PricingModal({ t, loggedIn, pro, onClose, z = 50 }: { t: TFn; loggedIn: boolean; pro: boolean; onClose: () => void; z?: number }) {
  const [auth, setAuth] = useState(false)
  return (
    // vh=94:对照表 10 行是站内最长弹框,85vh 在普通笔记本必出滚动条(2026-07-17 用户「不要有滚动框」)
    <Modal onClose={onClose} size="lg" z={z} vh={94}>
      <h3 style={{ margin: 0, fontSize: 18, color: '#111827', textAlign: 'center' }}>{t('price.title')}</h3>
      <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', margin: '4px 0 10px' }}>{t('price.sub')}</p>
      <PricingCard t={t} loggedIn={loggedIn} pro={pro} caps={CLIENT_CAPS} onRegister={() => setAuth(true)} />
      {auth && <AuthModal t={t} mode="register" z={z + 10} onClose={() => setAuth(false)} onDone={() => window.location.reload()} />}
    </Modal>
  )
}
