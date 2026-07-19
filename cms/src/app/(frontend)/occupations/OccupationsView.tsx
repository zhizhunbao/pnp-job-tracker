'use client'
// 紧缺职业清单视图(B4-01):183 行按 省→通道 分组一页展示;行级官方来源链+抓取日(既有 url/fetched 列)。
// 口径红线:清单命中=粗筛信号,非资格认定(dir.occ.note)。
import { useEffect, useState } from 'react'
import { makeT, streamDisplay, LANG_KEY, type Lang } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageBanner, PageShell, SectionTitle, Tag, UI } from '../ui/primitives'
import { IconClipboard } from '../Icons'
import type { OccRow } from '@/lib/directory'

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: 12.5, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties = { padding: '8px 12px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }

export function OccupationsView({ rows }: { rows: OccRow[] }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)

  // 省→通道 两级分组(数据已按 province/stream/noc 排序)
  const provs: { prov: string; streams: { stream: string; label: string; url: string; fetched: string; occ: OccRow[] }[] }[] = []
  for (const r of rows) {
    let p = provs[provs.length - 1]
    if (!p || p.prov !== r.province) { p = { prov: r.province, streams: [] }; provs.push(p) }
    let s = p.streams[p.streams.length - 1]
    if (!s || s.stream !== r.stream) { s = { stream: r.stream, label: r.label, url: r.url, fetched: r.fetched, occ: [] }; p.streams.push(s) }
    s.occ.push(r)
  }

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} />
      <PageShell pad="2rem 1.25rem 32px">
        <PageBanner module="jobs" icon={<IconClipboard />} title={t('dir.occ.title')} sub={t('dir.occ.sub')} />
        <div style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 6px', lineHeight: 1.6 }}>{t('dir.occ.note')}</div>
        {/* 省锚点导航 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '0 0 8px', fontSize: 12.5 }}>
          {provs.map((p) => <a key={p.prov} href={`#prov-${p.prov}`} style={{ color: UI.primary, textDecoration: 'none' }}>{t('pr.' + p.prov)}</a>)}
        </div>
        {provs.map((p) => (
          <section key={p.prov} id={`prov-${p.prov}`}>
            <SectionTitle>{t('pr.' + p.prov)} <Tag variant="region">{p.prov}</Tag></SectionTitle>
            {p.streams.map((s) => (
              <div key={s.stream} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'auto', margin: '0 0 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', padding: '10px 12px 6px' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{streamDisplay(t, s.stream) || s.label || s.stream}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{s.occ.length} NOC</span>
                  {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: 12, color: UI.primary, textDecoration: 'none' }}>{t('dir.occ.src')}</a>}
                  {s.fetched && <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{t('dir.occ.fetched', { d: s.fetched })}</span>}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>{t('dir.occ.colNoc')}</th><th style={th}>{t('dir.occ.colName')}</th><th style={th}></th></tr></thead>
                  <tbody>
                    {s.occ.map((r) => (
                      <tr key={r.noc}>
                        <td style={{ ...td, color: '#9ca3af', whiteSpace: 'nowrap' }}>{r.noc}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{r.name || '—'}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}><a href={`/?q=${encodeURIComponent(r.noc)}`} style={{ color: UI.primary, textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        ))}
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
