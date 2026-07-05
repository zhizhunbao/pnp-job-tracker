'use client'
// 地区统计共享 UI(E5-04):壳(顶栏+语言)+ slug 映射 + 指标卡/口径行。页面零计算,只渲染 stats 行。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, LANGS, type Lang, type TFn } from '../jobs/i18n'
import type { StatRow, SrcRow } from './shared'
export type { StatRow, SrcRow } from './shared'

export function useLang(): [Lang, (l: Lang) => void, TFn] {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const set = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  return [lang, set, makeT(lang)]
}

export function StatsShell({ lang, setLang, t, children }: { lang: Lang; setLang: (l: Lang) => void; t: TFn; children: React.ReactNode }) {
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/jobs" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none' }}>🍁 PNP Job Tracker</a>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, padding: '0 4px', color: lang === l.code ? '#2563eb' : '#9ca3af', fontWeight: lang === l.code ? 700 : 400 }}>{l.label}</button>
              ))}
            </span>
            <a href="/jobs" style={{ fontSize: 12.5, color: '#6b7280', textDecoration: 'none' }}>{t('acct.back')}</a>
          </div>
        </div>
      </header>
      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1rem' }}>{children}</div>
    </div>
  )
}

export function MetricCards({ r, t }: { r: StatRow; t: TFn }) {
  const money = (v: number | null) => (v != null ? `$${Math.round(v / 1000)}K` : '—')
  const cards: [string, React.ReactNode][] = [
    [t('stats.openJobs'), r.openJobs ?? '—'],
    [t('stats.new7d'), r.new7d ?? '—'],
    [t('stats.medWage'), money(r.medianWageAnnual)],
    [t('stats.medSalary'), money(r.medianSalaryAnnual)],
    [t('stats.named'), r.namedJobs ?? '—'],
    [t('stats.aip'), r.aipJobs ?? '—'],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, margin: '14px 0' }}>
      {cards.map(([k, v]) => (
        <div key={k} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{k}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 4 }}>{v}</div>
        </div>
      ))}
    </div>
  )
}

// 口径说明 + citation 来源行(复用 field-sources 维度,E4-04)
export function CaliberLine({ t, srcs, fetched }: { t: TFn; srcs: SrcRow[]; fetched: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ fontSize: 11.5, color: '#9ca3af', margin: '10px 0' }}>
      <button onClick={() => setOpen(!open)} style={{ border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, fontSize: 11.5 }}>
        📎 {t('stats.caliber')} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div style={{ marginTop: 6, lineHeight: 1.7 }}>
          {t('stats.caliberText')}
          <div>
            {srcs.map((s) => (
              <a key={s.field} href={s.url} target="_blank" rel="noreferrer" style={{ color: '#6b7280', marginRight: 12 }}>{s.publisher} ↗</a>
            ))}
            {fetched ? <span>· {t('src.fetched', { d: fetched })}</span> : null}
          </div>
        </div>
      )}
    </div>
  )
}
