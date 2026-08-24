'use client'
// 账户头像下拉 = 全站单一来源(2026-08-15 Frank「登录之后点这个应该还是下拉啊,怎么变成跳页面了」)。
// 先前只有 /jobs 的 AccountArea 有下拉,二级页的 AccountLite 是 `<a href="/account">` 直达 ——
// 同一个头像在两类页面上两种行为。收敛成一个组件而不是照着再抄一份:抄一份就等着两边菜单条目慢慢走散。
//
// 组件只管**按钮 + 菜单**;登录/注册弹框、定价弹框仍归各自调用方(两边的上下文不同,
// /jobs 那边还挂着 reset token 落地等一串自己的事)。升级入口用回调抛出去,不在这里开框。
import { useEffect, useRef, useState } from 'react'

import { Avatar } from './Avatar'
import { IconClipboard, IconCompass, IconSave, IconSettings, IconStar, IconTarget, IconUser } from '@/components/ui'
import type { TFn } from '@/lib/i18n'

/** 账户区定宽槽:与 Header 的 ACCT_SLOT_W 同值。两处差 1px,登录态导航整排就平移 1px
 *  (2026-07-31 实撞过 52px 错位)—— 常量留在 Header,这里按值对齐避免循环 import。 */
const SLOT_W = 32

const menuItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '4px 12px', fontSize: 12.5, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', boxSizing: 'border-box', lineHeight: 1.7 }
const menuSect: React.CSSProperties = { fontSize: 10, color: '#9ca3af', letterSpacing: 0.5, padding: '3px 12px 0' }

export function AccountMenu({ t, email, displayName, avatar, isPro, proUntil, onPricing }: {
  t: TFn
  email: string | null
  displayName: string | null
  avatar: string | null
  isPro: boolean
  proUntil?: string        // Pro 到期日(YYYY-MM-DD),免费号不传
  /** 「升级 Pro」点击:调用方开自己的定价框。不传 = 不显这一条 */
  onPricing?: () => void
}) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])
  // Esc 关菜单:弹层的通用出口,鼠标点外面与键盘各有一条(键盘用户没有「点外面」)
  useEffect(() => {
    if (!menu) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [menu])

  const logout = async () => {
    try { await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    window.location.reload()
  }

  return (
    <span ref={menuRef} style={{ position: 'relative', display: 'inline-flex', minWidth: SLOT_W, justifyContent: 'flex-end' }}>
      {/* #63b(Frank「像 Google 那样只显示图标」):按钮=纯头像圆钮,名字/Pro 态挂 title */}
      <button onClick={() => setMenu((o) => !o)} title={displayName?.trim() || email || undefined}
        aria-haspopup="menu" aria-expanded={menu}
        style={{ display: 'inline-flex', border: 'none', background: 'none', padding: 2, cursor: 'pointer', borderRadius: '50%', boxShadow: menu ? '0 0 0 2px #bfdbfe' : 'none' }}>
        <Avatar src={avatar} name={displayName || email} email={email} size={28} />
      </button>
      {menu && (
        <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: '3px 0', zIndex: 30, minWidth: 185 }}>
          {/* 身份头:昵称+邮箱+Free/Pro 两行紧凑版 */}
          <a href="/account" style={{ display: 'block', padding: '7px 12px', textDecoration: 'none', borderBottom: '1px solid #f3f4f6', marginBottom: 2 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName?.trim() || (email ? email.split('@')[0] : '—')}
              <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{isPro
                ? <span style={{ color: '#b45309', fontWeight: 600 }}>Pro{proUntil ? ` · ${proUntil}` : ''}</span>
                : <span style={{ color: '#9ca3af' }}>{t('acct.plan.free')}</span>}</span>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          </a>
          <div style={menuSect}>{t('menu.sect.job')}</div>
          <a href="/?view=match" style={menuItem}><IconTarget /> {t('mv.entry')}</a>
          <a href="/plan/pr" style={menuItem}><IconCompass /> {t('plan.pr.title')}</a>
          <a href="/account?sec=favs" style={menuItem}><IconStar /> {t('fav.title')}</a>
          <a href="/account?sec=sjobs" style={menuItem}><IconClipboard /> {t('sj.title')}</a>
          <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
          <div style={menuSect}>{t('menu.sect.manage')}</div>
          <a href="/account?sec=profile" style={menuItem}><IconUser /> {t('prof.title')}</a>
          <a href="/account?sec=saved" style={menuItem}><IconSave /> {t('ss.title')}</a>
          <a href="/account" style={menuItem}><IconSettings /> {t('nav.acctTab')}</a>
          {!isPro && onPricing && (
            <button onClick={() => { setMenu(false); onPricing() }} style={{ ...menuItem, color: '#b45309', fontWeight: 600 }}>
              <IconStar /> {t('up.cta2')}
            </button>
          )}
          <div style={{ borderTop: '1px solid #f3f4f6', margin: '2px 0' }} />
          <button onClick={logout} style={{ ...menuItem, color: '#9ca3af' }}>{t('acct.logout')}</button>
        </div>
      )}
    </span>
  )
}
