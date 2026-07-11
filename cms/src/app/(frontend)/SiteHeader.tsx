'use client'
// 二级页(榜单/统计)共享顶栏(2026-07-11 用户指出子页 header 与 /jobs 样式不一致):
// 与 /jobs 顶栏同款视觉——品牌+标语 / 三入口导航 / 方框语言切换 / 账户入口。
// plan 分层态不在二级页拉取,账户入口统一链 /account(该页自会按登录态分流)。
import { LANGS, type Lang, type TFn } from './jobs/i18n'
import { IconTarget, IconChart, IconMapPin } from './Icons'

export function SiteHeader({ lang, setLang, t, active }: { lang: Lang; setLang: (l: Lang) => void; t: TFn; active?: 'rank' | 'stats' }) {
  const nav: React.CSSProperties = { textDecoration: 'none', fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <a href="/jobs" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none', whiteSpace: 'nowrap' }}>🍁 PNP Job Tracker</a>
          <span style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('tagline')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: '100%', flexWrap: 'wrap' }}>
          <a href="/jobs?view=match" style={nav}><IconTarget /> {t('mv.entry')}</a>
          <a href="/rankings/weekly-top" style={{ ...nav, color: active === 'rank' ? '#2563eb' : '#6b7280', fontWeight: active === 'rank' ? 700 : 400 }}><IconChart /> {t('rank.entry')}</a>
          <a href="/stats" style={{ ...nav, color: active === 'stats' ? '#2563eb' : '#6b7280', fontWeight: active === 'stats' ? 700 : 400 }}><IconMapPin /> {t('stats.entry')}</a>
          <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                style={{ border: 'none', padding: '3px 9px', fontSize: 12.5, cursor: 'pointer', background: lang === l.code ? '#2563eb' : '#fff', color: lang === l.code ? '#fff' : '#6b7280' }}>{l.label}</button>
            ))}
          </div>
          <a href="/account" style={nav}>{t('nav.account')}</a>
        </div>
      </div>
    </header>
  )
}
