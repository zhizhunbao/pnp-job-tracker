'use client'
// 紧缺职业清单视图(B4-01):183 行按 省→通道 分组一页展示;行级官方来源链+抓取日(既有 url/fetched 列)。
// 口径红线:清单命中=粗筛信号,非资格认定(dir.occ.note)。
import { useEffect, useState } from 'react'
import { makeT, streamDisplay, LANG_KEY, type Lang } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageBanner, PageShell, SectionTitle, Tag, UI } from '../ui/primitives'
import { DataTable } from '../ui/DataTable'
import { IconClipboard } from '../Icons'
import type { OccRow } from '@/lib/directory'

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
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="employers" />
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
              // 组件统一 P2 余批(#110):通道表换公共 DataTable(排序/拖宽/hover 同 jobs 观感),通道标题走 header 槽
              <div key={s.stream} style={{ margin: '0 0 14px' }}>
                <DataTable<OccRow> rows={s.occ} rowKey={(r) => r.noc} header={
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', padding: '10px 12px 6px' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{streamDisplay(t, s.stream) || s.label || s.stream}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{s.occ.length} NOC</span>
                    {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: 12, color: UI.primary, textDecoration: 'none' }}>{t('dir.occ.src')}</a>}
                    {s.fetched && <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{t('dir.occ.fetched', { d: s.fetched })}</span>}
                  </div>
                } cols={[
                  { key: 'noc', label: t('dir.occ.colNoc'), nowrap: true, sort: (r) => r.noc, render: (r) => <span style={{ color: '#9ca3af' }}>{r.noc}</span> },
                  { key: 'name', label: t('dir.occ.colName'), sort: (r) => r.name || null, render: (r) => <span style={{ fontWeight: 600 }}>{r.name || '—'}</span> },
                  { key: 'go', label: '', nowrap: true, render: (r) => <a href={`/?q=${encodeURIComponent(r.noc)}`} style={{ color: UI.primary, textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a> },
                ]} />
              </div>
            ))}
          </section>
        ))}
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
