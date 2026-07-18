'use client'
// 二级页(榜单/统计/动态)共享顶栏——与 /jobs 顶栏统一(Frank 2026-07-18:「所有页面都是同一个 header」):
// 品牌+标语 / 六入口导航 / 方框语言切换 / 账户区(登录=头像+昵称药丸进 /account;未登录=登录/注册/Pro,
// 登录注册走 /?login=1 与 /?signup=1 落 /jobs 弹框,Pro 链 /pricing)。登录态客户端拉 /api/users/me。
import { useEffect, useState } from 'react'
import { LANGS, type Lang, type TFn } from './jobs/i18n'
import { Avatar } from './Avatar'
import { IconTarget, IconChart, IconCompass, IconMapPin, IconNews, IconStar, IconUser } from './Icons'

function AccountLite({ t }: { t: TFn }) {
  const [state, setState] = useState<'loading' | 'out' | 'in'>('loading')
  const [u, setU] = useState<{ email: string; displayName: string | null; avatar: string | null; pro: boolean }>({ email: '', displayName: null, avatar: null, pro: false })
  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.email) {
          setU({ email: d.user.email, displayName: d.user.displayName ?? null, avatar: d.user.avatar ?? null, pro: !!(d.user.proUntil && new Date(d.user.proUntil) > new Date()) })
          setState('in')
        } else setState('out')
      })
      .catch(() => setState('out'))
  }, [])
  if (state === 'loading') return <span style={{ width: 120 }} />
  if (state === 'in') {
    return (
      <a href="/account" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', borderRadius: 999, padding: '2px 10px 2px 3px', fontSize: 12.5, color: '#2563eb', textDecoration: 'none', whiteSpace: 'nowrap' }}>
        <Avatar src={u.avatar} name={u.displayName || u.email} email={u.email} size={22} />
        {u.displayName?.trim() || u.email.split('@')[0]}{u.pro && <IconStar style={{ color: '#b45309' }} />}
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

export function SiteHeader({ lang, setLang, t, active }: { lang: Lang; setLang: (l: Lang) => void; t: TFn; active?: 'rank' | 'stats' | 'account' | 'pathways' | 'news' }) {
  const nav: React.CSSProperties = { textDecoration: 'none', fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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
            <a href="/?view=match" style={nav}><IconTarget /> {t('mv.entry')}</a>
            <a href="/pathways" style={{ ...nav, color: active === 'pathways' ? '#2563eb' : '#6b7280', fontWeight: active === 'pathways' ? 700 : 400 }}><IconCompass /> {t('pw.entry')}</a>
            <a href="/rankings/weekly-top" style={{ ...nav, color: active === 'rank' ? '#2563eb' : '#6b7280', fontWeight: active === 'rank' ? 700 : 400 }}><IconChart /> {t('rank.entry')}</a>
            <a href="/stats" style={{ ...nav, color: active === 'stats' ? '#2563eb' : '#6b7280', fontWeight: active === 'stats' ? 700 : 400 }}><IconMapPin /> {t('stats.entry')}</a>
            {/* 移民动态=顶栏第 6 项(E12-06 拍板);窄屏随 flexWrap 自动折行 */}
            <a href="/news" style={{ ...nav, color: active === 'news' ? '#2563eb' : '#6b7280', fontWeight: active === 'news' ? 700 : 400 }}><IconNews /> {t('news.entry')}</a>
            {/* 我的账户=独立选项卡(2026-07-16 用户拍板),与三入口同级;当前页高亮不链自己 */}
            {active === 'account'
              ? <span style={{ ...nav, color: '#2563eb', fontWeight: 700 }}><IconUser /> {t('nav.acctTab')}</span>
              : <a href="/account" style={nav}><IconUser /> {t('nav.acctTab')}</a>}
          </div>
          <span className="shDivider" style={{ width: 1, height: 16, background: '#e5e7eb' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{ border: 'none', padding: '3px 9px', fontSize: 12.5, cursor: 'pointer', background: lang === l.code ? '#2563eb' : '#fff', color: lang === l.code ? '#fff' : '#6b7280' }}>{l.label}</button>
              ))}
            </div>
            <AccountLite t={t} />
          </div>
        </div>
      </div>
    </header>
  )
}
