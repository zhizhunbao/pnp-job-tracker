'use client'
// 地区统计视图集(E5-04):全部零计算,渲染 ETL 预聚合行。
// E8-02 弹窗化:每级拆「*Content 内容组件」(页面壳与 /jobs 统计弹窗共用,不许 fork);
// 内容里的 <a href="/stats/..."> 保持原样 —— 页面自然跳转,弹窗端由 StatsModal 点击拦截转 state 导航。
import { useMemo, useState } from 'react'
import { StatsShell, MetricCards, CaliberLine, useLang } from './ui'
import { IconMapPin, IconScale, IconStar, IconTarget } from '../Icons'
import { BROAD_SLUGS, PROV_NAME, type StatRow, type SrcRow } from './shared'
import { PricingModal } from '../jobs/PricingModal'
import type { TFn } from '../jobs/i18n'

const money = (v: number | null) => (v != null ? `$${Math.round(v / 1000)}K` : '—')
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: 12.5, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties = { padding: '8px 12px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }

function TopCities({ raw, t }: { raw: string; t: TFn }) {
  const cities = useMemo(() => { try { return JSON.parse(raw) as { city: string; n: number }[] } catch { return [] } }, [raw])
  if (!cities.length) return null
  return (
    <div style={{ margin: '8px 0', fontSize: 12.5, color: '#6b7280' }}>
      {t('stats.topCities')}:{cities.map((c) => <span key={c.city} style={{ background: '#eef2ff', color: '#3730a3', borderRadius: 6, padding: '2px 8px', marginLeft: 6 }}>{c.city} · {c.n}</span>)}
    </div>
  )
}

// ── 省份索引(broad='all' 各省卡)──────────────────────────────
export function StatsIndexContent({ rows, srcs, t }: { rows: StatRow[]; srcs: SrcRow[]; t: TFn }) {
  return (
    <>
      <h1 style={{ fontSize: 22, margin: 0 }}><IconMapPin /> {t('stats.provIndex')}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, margin: '16px 0' }}>
        {rows.map((r) => (
          <a key={r.province} href={`/stats/${r.province.toLowerCase()}`}
            style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', textDecoration: 'none', color: '#1f2937' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{PROV_NAME[r.province] || r.province} <span style={{ color: '#9ca3af', fontWeight: 400 }}>{r.province}</span></div>
            <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 8, lineHeight: 1.9 }}>
              {t('stats.openJobs')}:<strong style={{ color: '#111827' }}> {r.openJobs}</strong><br />
              {t('stats.medWage')}: {money(r.medianWageAnnual)}<br />
              {t('stats.named')}: {r.namedJobs ? <span style={{ color: '#b45309', fontWeight: 600 }}>{r.namedJobs}</span> : <span style={{ color: '#9ca3af' }}>—</span>}
            </div>
          </a>
        ))}
      </div>
      <a href="/stats/compare" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}><IconScale /> {t('stats.compare')} →</a>
      <CaliberLine t={t} srcs={srcs} fetched={rows[0]?.fetched || ''} />
    </>
  )
}
export function StatsIndexView({ rows, srcs }: { rows: StatRow[]; srcs: SrcRow[] }) {
  const [lang, setLang, t] = useLang()
  return <StatsShell lang={lang} setLang={setLang} t={t}><StatsIndexContent rows={rows} srcs={srcs} t={t} /></StatsShell>
}

// ── 省级(汇总指标 + 按大类表)────────────────────────────────
export function StatsProvContent({ prov, rows, srcs, t }: { prov: string; rows: StatRow[]; srcs: SrcRow[]; t: TFn }) {
  const all = rows.find((r) => r.broad === 'all')
  const cats = BROAD_SLUGS.map(([slug, broad]) => ({ slug, broad, row: rows.find((r) => r.broad === broad) })).filter((x) => x.row)
  const broadLabel = (b: string) => (b === '未分类' ? t('cell.uncat') : t('broad.' + b))
  return (
    <>
      <div style={{ fontSize: 12.5, marginBottom: 6 }}><a href="/stats" style={{ color: '#2563eb', textDecoration: 'none' }}>← {t('stats.provIndex')}</a></div>
      <h1 style={{ fontSize: 22, margin: 0 }}>{t('stats.title', { prov: PROV_NAME[prov] || prov })}</h1>
      {all && <MetricCards r={all} t={t} />}
      {all && <TopCities raw={all.topCities} t={t} />}
      <h2 style={{ fontSize: 15.5, margin: '18px 0 8px' }}>{t('stats.byCat')}</h2>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>{t('filter.cat')}</th><th style={th}>{t('stats.openJobs')}</th><th style={th}>{t('stats.new7d')}</th><th style={th}>{t('stats.medWage')}</th><th style={th}>{t('stats.named')}</th><th style={th}></th></tr></thead>
          <tbody>
            {cats.map(({ slug, broad, row }) => (
              <tr key={slug}>
                <td style={{ ...td, fontWeight: 600 }}><a href={`/stats/${prov.toLowerCase()}/${slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{broadLabel(broad)}</a></td>
                <td style={td}>{row!.openJobs}</td>
                <td style={td}>{row!.new7d}</td>
                <td style={td}>{money(row!.medianWageAnnual)}</td>
                <td style={{ ...td, ...(row!.namedJobs ? { color: '#b45309', fontWeight: 600 } : { color: '#9ca3af' }) }}>{row!.namedJobs || '—'}</td>
                <td style={td}><a href={`/jobs?prov=${prov}&broad=${encodeURIComponent(broad)}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12.5 }}>{t('stats.toJobs')}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CaliberLine t={t} srcs={srcs} fetched={all?.fetched || ''} />
    </>
  )
}
export function StatsProvView({ prov, rows, srcs }: { prov: string; rows: StatRow[]; srcs: SrcRow[] }) {
  const [lang, setLang, t] = useLang()
  return <StatsShell lang={lang} setLang={setLang} t={t}><StatsProvContent prov={prov} rows={rows} srcs={srcs} t={t} /></StatsShell>
}

// ── 省×大类详情 ──────────────────────────────────────────────
export function StatsCatContent({ prov, row, srcs, t }: { prov: string; row: StatRow; srcs: SrcRow[]; t: TFn }) {
  const broadLabel = row.broad === '未分类' ? t('cell.uncat') : t('broad.' + row.broad)
  return (
    <>
      <div style={{ fontSize: 12.5, marginBottom: 6 }}><a href={`/stats/${prov.toLowerCase()}`} style={{ color: '#2563eb', textDecoration: 'none' }}>← {t('stats.title', { prov: PROV_NAME[prov] || prov })}</a></div>
      <h1 style={{ fontSize: 22, margin: 0 }}>{t('stats.catTitle', { prov: PROV_NAME[prov] || prov, cat: broadLabel })}</h1>
      <MetricCards r={row} t={t} />
      {row.streamLabels && (
        <div style={{ margin: '8px 0', fontSize: 12.5, color: '#6b7280' }}>
          {t('stats.streams')}:{row.streamLabels.split('、').map((s2) => <span key={s2} style={{ background: '#fef3c7', color: '#b45309', borderRadius: 6, padding: '2px 8px', marginLeft: 6, fontWeight: 500 }}>{s2}</span>)}
        </div>
      )}
      <TopCities raw={row.topCities} t={t} />
      <a href={`/jobs?prov=${prov}&broad=${encodeURIComponent(row.broad)}`}
        style={{ display: 'inline-block', marginTop: 10, background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
        {t('stats.toJobs')}
      </a>
      <CaliberLine t={t} srcs={srcs} fetched={row.fetched} />
    </>
  )
}
export function StatsCatView({ prov, row, srcs }: { prov: string; row: StatRow; srcs: SrcRow[]; catSlug?: string }) {
  const [lang, setLang, t] = useLang()
  return <StatsShell lang={lang} setLang={setLang} t={t}><StatsCatContent prov={prov} row={row} srcs={srcs} t={t} /></StatsShell>
}

// ── Pro 跨省对比(E5-04 §3.4):选 2-4 省并排;已建档用户按「我的 NOC」预选大类并高亮 ──
const NOC_FIRST_TO_BROAD: Record<string, string> = { '0': '管理', '1': '商务', '2': '科技', '3': '医疗', '4': '教育', '5': '文体', '6': '服务', '7': '技工', '8': '资源', '9': '制造' }
export function CompareContent({ rows, srcs, isPro, loggedIn, myNocs, t }: { rows: StatRow[]; srcs: SrcRow[]; isPro: boolean; loggedIn: boolean; myNocs: string[]; t: TFn }) {
  const myBroad = myNocs.length ? NOC_FIRST_TO_BROAD[myNocs[0][0]] || 'all' : 'all'
  const [broad, setBroad] = useState<string>(myBroad)
  const [picked, setPicked] = useState<string[]>(['ON', 'BC'])
  const [pricing, setPricing] = useState(false)  // 升级 CTA 开定价弹窗(E8-02:站内不跳页)
  const provs = [...new Set(rows.map((r) => r.province))]
  const toggle = (p: string) => setPicked((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : cur.length >= 4 ? cur : [...cur, p])
  const broadLabel = (b: string) => (b === 'all' ? t('fields.all') : b === '未分类' ? t('cell.uncat') : t('broad.' + b))

  if (!isPro) {
    return (
      <>
        <h1 style={{ fontSize: 22, margin: 0 }}><IconScale /> {t('stats.compare')}</h1>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', margin: '16px 0', fontSize: 13.5 }}>
          <span style={{ fontWeight: 600, color: '#92400e' }}><IconStar /> {t('up.title')}</span>
          <button onClick={() => setPricing(true)} style={{ marginLeft: 10, color: '#2563eb', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>{t('up.cta')}</button>
        </div>
        {pricing && <PricingModal t={t} loggedIn={loggedIn} pro={false} z={60} onClose={() => setPricing(false)} />}
      </>
    )
  }
  const metrics: [string, (r: StatRow) => React.ReactNode][] = [
    [t('stats.openJobs'), (r) => r.openJobs],
    [t('stats.new7d'), (r) => r.new7d],
    [t('stats.medWage'), (r) => money(r.medianWageAnnual)],
    [t('stats.medSalary'), (r) => money(r.medianSalaryAnnual)],
    [t('stats.named'), (r) => (r.namedJobs ? <span style={{ color: '#b45309', fontWeight: 600 }}>{r.namedJobs}</span> : <span style={{ color: '#9ca3af' }}>—</span>)],
    [t('stats.aip'), (r) => r.aipJobs],
    [t('stats.streams'), (r) => r.streamLabels || '—'],
  ]
  return (
    <>
      <h1 style={{ fontSize: 22, margin: 0 }}><IconScale /> {t('stats.compare')}</h1>
      <div style={{ margin: '12px 0', fontSize: 12.5, color: '#6b7280' }}>{t('stats.pickProv')}{myNocs.length ? <span style={{ marginLeft: 10, color: '#3730a3' }}><IconTarget /> {t('stats.myNoc')}:NOC {myNocs.join('/')} → {broadLabel(myBroad)}</span> : null}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {provs.map((p) => (
          <button key={p} onClick={() => toggle(p)}
            style={{ border: picked.includes(p) ? '1px solid #2563eb' : '1px solid #d1d5db', background: picked.includes(p) ? '#eff6ff' : '#fff', color: picked.includes(p) ? '#1d4ed8' : '#6b7280', borderRadius: 6, padding: '4px 10px', fontSize: 12.5, cursor: 'pointer' }}>{p}</button>
        ))}
        <select value={broad} onChange={(e) => setBroad(e.target.value)} style={{ marginLeft: 10, fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', color: '#374151' }}>
          <option value="all">{broadLabel('all')}</option>
          {BROAD_SLUGS.map(([, b]) => <option key={b} value={b}>{broadLabel(b)}</option>)}
        </select>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}></th>{picked.map((p) => <th key={p} style={{ ...th, fontSize: 14 }}>{PROV_NAME[p] || p}</th>)}</tr></thead>
          <tbody>
            {metrics.map(([label, get]) => (
              <tr key={label}>
                <td style={{ ...td, color: '#9ca3af', whiteSpace: 'nowrap' }}>{label}</td>
                {picked.map((p) => {
                  const r = rows.find((x) => x.province === p && x.broad === broad)
                  return <td key={p} style={{ ...td, fontWeight: 500 }}>{r ? get(r) : '—'}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CaliberLine t={t} srcs={srcs} fetched={rows[0]?.fetched || ''} />
    </>
  )
}
export function CompareView({ rows, srcs, isPro, loggedIn, myNocs }: { rows: StatRow[]; srcs: SrcRow[]; isPro: boolean; loggedIn: boolean; myNocs: string[] }) {
  const [lang, setLang, t] = useLang()
  return <StatsShell lang={lang} setLang={setLang} t={t}><CompareContent rows={rows} srcs={srcs} isPro={isPro} loggedIn={loggedIn} myNocs={myNocs} t={t} /></StatsShell>
}
