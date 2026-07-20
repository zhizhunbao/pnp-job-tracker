'use client'
// 地区统计共享 UI(E5-04):壳(顶栏+语言)+ slug 映射 + 指标卡/口径行。页面零计算,只渲染 stats 行。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { IconPaperclip } from '../Icons'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import type { StatRow, SrcRow } from './shared'
export type { StatRow, SrcRow } from './shared'

export function useLang(): [Lang, (l: Lang) => void, TFn] {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const set = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  return [lang, set, makeT(lang)]
}

export function StatsShell({ lang, setLang, t, children }: { lang: Lang; setLang: (l: Lang) => void; t: TFn; children: React.ReactNode }) {
  // 顶栏换全站共享 SiteHeader(2026-07-11 用户指出子页 header 与 /jobs 样式不一致)
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLang} t={t} active="stats" />
      {/* #67 宽度统一(2026-07-19):1100 → 1320 与头轨/职位板同宽 */}
      <div style={{ maxWidth: 1320, margin: '2rem auto', padding: '0 1.25rem', width: '100%', boxSizing: 'border-box' }}>{children}</div>
      <SiteFooter t={t} />
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
    [t('stats.named'), r.namedJobs || '—'],   // 0 → —(C4:0 是政策现实非缺数,口径说明里有脚注)
    [t('stats.aip'), r.aipJobs || '—'],
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
        <IconPaperclip /> {t('stats.caliber')} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div style={{ marginTop: 6, lineHeight: 1.7 }}>
          {t('stats.caliberText')}
          <div>
            {srcs.map((s) => (
              <a key={s.field} href={s.url} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none', marginRight: 12 }}>{s.publisher} ↗</a>
            ))}
            {fetched ? <span>· {t('src.fetched', { d: fetched })}</span> : null}
          </div>
        </div>
      )}
    </div>
  )
}
