'use client'
// 榜单视图(E5-02):纯渲染(计算在 ETL);三语壳;岗位行链官方原帖,公司行链官网。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, LANGS, type Lang } from '../jobs/i18n'

export type RankRow = {
  rank: number; kind: string; externalId: string
  title: string; company: string; city: string; province: string
  noc: string; teer: number | null; score: number | null
  salaryText: string; salaryAnnual: number | null
  pnpStream: string; eeCategory: string; datePosted: string
  applyUrl: string; officialUrl: string
  openJobs: number | null; namedJobs: number | null; avgScore: number | null
}

const th: React.CSSProperties = { textAlign: 'left', padding: '9px 12px', fontSize: 12.5, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties = { padding: '9px 12px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }

export function RankingView({ slug, items }: { slug: string; items: RankRow[] }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  const isCompany = slug === 'sponsor-likely'
  const updated = items.find((i) => i.datePosted)?.datePosted?.slice(0, 10) || new Date().toISOString().slice(0, 10)

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/jobs" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none' }}>🍁 PNP Job Tracker</a>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLangSaved(l.code)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, padding: '0 4px', color: lang === l.code ? '#2563eb' : '#9ca3af', fontWeight: lang === l.code ? 700 : 400 }}>{l.label}</button>
              ))}
            </span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>{t('rank.title.' + slug)}</h1>
        <div style={{ fontSize: 12.5, color: '#9ca3af', margin: '6px 0 4px' }}>{t('rank.updated', { d: updated })}</div>
        <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 16 }}>{t('rank.note.' + slug)}</div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              {isCompany ? (
                <tr><th style={th}>#</th><th style={th}>{t('rank.col.company')}</th><th style={th}>{t('col.province')}</th><th style={th}>{t('rank.col.namedJobs')}</th><th style={th}>{t('rank.col.openJobs')}</th><th style={th}>{t('rank.col.avgScore')}</th><th style={th}></th></tr>
              ) : (
                <tr><th style={th}>#</th><th style={th}>{t('col.title')}</th><th style={th}>{t('col.company')}</th><th style={th}>{t('col.city')}</th><th style={th}>{t('col.salary')}</th><th style={th}>PNP/EE</th><th style={th}>{t('col.score')}</th><th style={th}>{t('col.datePosted')}</th></tr>
              )}
            </thead>
            <tbody>
              {items.map((r) => isCompany ? (
                <tr key={r.rank}>
                  <td style={{ ...td, color: '#9ca3af' }}>{r.rank}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.officialUrl ? <a href={r.officialUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.company} ↗</a> : r.company}</td>
                  <td style={td}>{r.province}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#b45309' }}>{r.namedJobs}</td>
                  <td style={td}>{r.openJobs}</td>
                  <td style={td}>{r.avgScore ?? '—'}</td>
                  <td style={td}><a href={`/jobs?q=${encodeURIComponent(r.company)}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a></td>
                </tr>
              ) : (
                <tr key={r.rank}>
                  <td style={{ ...td, color: '#9ca3af' }}>{r.rank}</td>
                  <td style={{ ...td, fontWeight: 600, maxWidth: 320 }}>{r.applyUrl ? <a href={r.applyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.title} ↗</a> : r.title}</td>
                  <td style={td}>{r.company}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{[r.city, r.province].filter(Boolean).join(', ')}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: '#15803d' }}>{r.salaryText || '—'}</td>
                  <td style={{ ...td, fontSize: 12 }}>{[r.pnpStream, r.eeCategory].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.score ?? '—'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: '#9ca3af', fontSize: 12.5 }}>{(r.datePosted || '').slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14, fontSize: 12.5 }}>
          <a href="/rankings/weekly-top" style={{ color: slug === 'weekly-top' ? '#111827' : '#2563eb', textDecoration: 'none', marginRight: 14, fontWeight: slug === 'weekly-top' ? 700 : 400 }}>{t('rank.title.weekly-top')}</a>
          <a href="/rankings/sponsor-likely" style={{ color: slug === 'sponsor-likely' ? '#111827' : '#2563eb', textDecoration: 'none', fontWeight: slug === 'sponsor-likely' ? 700 : 400 }}>{t('rank.title.sponsor-likely')}</a>
        </div>
      </div>
    </div>
  )
}
