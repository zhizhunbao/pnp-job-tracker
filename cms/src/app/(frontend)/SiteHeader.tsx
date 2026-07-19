'use client'
// 全站唯一顶栏(#65 header 合一,Frank 2026-07-18 拍板:「header 合一也做」「为什么不一样宽」):
// /jobs 的内联头已退役,全部页面用本组件,**头轨统一 1320px**(跟最宽的职位板走;各页正文轨可窄但 header 一致)。
// /jobs 特有件走 props:matchButton(「我的匹配」切换态)/accountArea(带 plan 的完整账户下拉)/sticky。
// 二级页缺省:matchButton 不传=链接 /?view=match;accountArea 不传=AccountLite(登录=头像药丸,未登录=登录/注册)。
import { useEffect, useRef, useState } from 'react'
import { LANGS, type Lang, type TFn } from './jobs/i18n'
import { Avatar } from './Avatar'
import { IconTarget, IconChart, IconCompass, IconMapPin, IconNews, IconUser, IconUsers } from './Icons'

type AcctState = { state: 'loading' | 'out' | 'in'; u: { email: string; displayName: string | null; avatar: string | null; pro: boolean } }

function AccountLite({ t, acct }: { t: TFn; acct: AcctState }) {
  const { state, u } = acct
  if (state === 'loading') return <span style={{ width: 32 }} />
  if (state === 'in') {
    // #63b(Frank「像 Google 那样只显示图标」):纯头像圆钮,名字/Pro 态挂 title
    return (
      <a href="/account" title={(u.displayName?.trim() || u.email.split('@')[0]) + (u.pro ? ' · Pro' : '')}
        style={{ display: 'inline-flex', padding: 2, borderRadius: '50%', textDecoration: 'none' }}>
        <Avatar src={u.avatar} name={u.displayName || u.email} email={u.email} size={28} />
      </a>
    )
  }
  // Pro 钮不进 header(Frank 2026-07-18:「没有意义」——定价入口=/pricing 与升级卡)
  return (
    <>
      <a href="/?login=1" style={{ fontSize: 12.5, color: '#2563eb', textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('nav.login')}</a>
      <a href="/?signup=1" style={{ background: '#2563eb', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('nav.register')}</a>
    </>
  )
}

export function SiteHeader({ lang, setLang, t, active, sticky, matchButton, accountArea, loggedIn }: {
  lang: Lang; setLang: (l: Lang) => void; t: TFn
  active?: 'rank' | 'stats' | 'account' | 'pathways' | 'news' | 'employers'
  sticky?: boolean
  matchButton?: { active: boolean; onClick: () => void }
  accountArea?: React.ReactNode
  loggedIn?: boolean   // 宿主已知登录态时传入(/jobs 走 plan);不传=本组件自查 /api/users/me
}) {
  // 登录态上提(2026-07-19 Frank:「我的账户模块应该是登录之后才显示」)——原 AccountLite 私有 fetch
  // 提到 header 级,导航「我的账户」与右端账户区共用;loading 期间按未登录处理(不闪入口)
  const [acct, setAcct] = useState<AcctState>({
    state: loggedIn === undefined ? 'loading' : loggedIn ? 'in' : 'out',
    u: { email: '', displayName: null, avatar: null, pro: false },
  })
  useEffect(() => {
    if (loggedIn !== undefined || accountArea) return   // 宿主自带账户区(/jobs)时由 loggedIn prop 定导航显隐
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.email) {
          setAcct({ state: 'in', u: { email: d.user.email, displayName: d.user.displayName ?? null, avatar: d.user.avatar ?? null, pro: !!(d.user.proUntil && new Date(d.user.proUntil) > new Date()) } })
        } else setAcct((a) => ({ ...a, state: 'out' }))
      })
      .catch(() => setAcct((a) => ({ ...a, state: 'out' })))
  }, [loggedIn, accountArea])
  const showAcctTab = loggedIn !== undefined ? loggedIn : acct.state === 'in'
  // 资料库下拉(方案 A):点开/点外关
  const [lib, setLib] = useState(false)
  const libRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!lib) return
    const h = (e: MouseEvent) => { if (libRef.current && !libRef.current.contains(e.target as Node)) setLib(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [lib])
  const nav: React.CSSProperties = { textDecoration: 'none', fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', ...(sticky && { position: 'sticky', top: 0, zIndex: 30 }) }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <a href="/" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none', whiteSpace: 'nowrap' }}>🍁 Offer2PR</a>
          <span className="shTagline" style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('tagline')}</span>
        </div>
        {/* 方案 A(2026-07-17 用户拍板,与 /jobs 顶栏同款):导航/操作两组+竖线分隔;窄屏竖线隐藏。
            副标语 <1350px 隐藏(Frank 2026-07-18「长度自己换行了」——先牺牲标语保导航一行) */}
        <style>{`@media (max-width:640px){.shDivider{display:none}}
          @media (max-width:1350px){.shTagline{display:none}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: '100%', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {matchButton
              ? <button onClick={matchButton.onClick} style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, color: matchButton.active ? '#2563eb' : '#6b7280', fontWeight: matchButton.active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}><IconTarget /> {t('mv.entry')}</button>
              : <a href="/?view=match" style={nav}><IconTarget /> {t('mv.entry')}</a>}
            <a href="/pathways" style={{ ...nav, color: active === 'pathways' ? '#2563eb' : '#6b7280', fontWeight: active === 'pathways' ? 700 : 400 }}><IconCompass /> {t('pw.entry')}</a>
            <a href="/rankings/weekly-top" style={{ ...nav, color: active === 'rank' ? '#2563eb' : '#6b7280', fontWeight: active === 'rank' ? 700 : 400 }}><IconChart /> {t('rank.entry')}</a>
            {/* 资料库 ▾(2026-07-19 Frank 批提案方案 A):名录类归一处,顶栏不再涨;时间线归移民动态 tab */}
            <span ref={libRef} style={{ position: 'relative', display: 'inline-flex' }}>
              <button onClick={() => setLib((o) => !o)}
                style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap', color: active === 'employers' ? '#2563eb' : '#6b7280', fontWeight: active === 'employers' ? 700 : 400 }}>
                <IconUsers /> {t('nav.library')} <span style={{ fontSize: 10, color: '#9ca3af' }}>▾</span>
              </button>
              {lib && (
                <span style={{ position: 'absolute', top: 'calc(100% + 6px)', left: -10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: '4px 0', zIndex: 40, minWidth: 168, display: 'block' }}>
                  <a href="/employers" style={{ display: 'block', padding: '6px 14px', fontSize: 12.5, color: '#374151', textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('dir.title')}</a>
                  <a href="/occupations" style={{ display: 'block', padding: '6px 14px', fontSize: 12.5, color: '#374151', textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('dir.occ.title')}</a>
                  {/* 「学校名录(规划中)」灰项已摘(2026-07-19 Frank「不完美的先关」)——B4 二期做完再挂真链 */}
                </span>
              )}
            </span>
            <a href="/stats" style={{ ...nav, color: active === 'stats' ? '#2563eb' : '#6b7280', fontWeight: active === 'stats' ? 700 : 400 }}><IconMapPin /> {t('stats.entry')}</a>
            {/* 移民动态=顶栏第 6 项(E12-06 拍板);窄屏随 flexWrap 自动折行 */}
            <a href="/news" style={{ ...nav, color: active === 'news' ? '#2563eb' : '#6b7280', fontWeight: active === 'news' ? 700 : 400 }}><IconNews /> {t('news.entry')}</a>
            {/* 我的账户=独立选项卡(2026-07-16 拍板);2026-07-19 Frank:未登录不显示(登录入口=右端登录/注册钮) */}
            {showAcctTab && (active === 'account'
              ? <span style={{ ...nav, color: '#2563eb', fontWeight: 700 }}><IconUser /> {t('nav.acctTab')}</span>
              : <a href="/account" style={nav}><IconUser /> {t('nav.acctTab')}</a>)}
          </div>
          <span className="shDivider" style={{ width: 1, height: 16, background: '#e5e7eb' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{ border: 'none', padding: '3px 9px', fontSize: 12.5, cursor: 'pointer', background: lang === l.code ? '#2563eb' : '#fff', color: lang === l.code ? '#fff' : '#6b7280' }}>{l.label}</button>
              ))}
            </div>
            {accountArea ?? <AccountLite t={t} acct={acct} />}
          </div>
        </div>
      </div>
    </header>
  )
}
