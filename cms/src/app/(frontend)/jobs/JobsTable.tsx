'use client'

import { useMemo, useState } from 'react'

export type JobRow = {
  id: string | number
  title: string
  company: string
  source: string
  province: string
  city: string
  address: string
  noc: string
  category: string
  accessibility: string
  score: number | null
  officialUrl: string
  applyUrl: string
  datePosted: string
  lastSeen: string
}

const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort()
const accLabel: Record<string, string> = {
  'co-op': 'co-op', junior: '初级', intermediate: '中级', senior: '高级', unknown: '—',
}
const catColor: Record<string, string> = {
  'TEER 0': '#dbeafe;#1e40af', 'TEER 1': '#dbeafe;#1e40af', 'TEER 2': '#dcfce7;#166534',
  'TEER 3': '#fef9c3;#854d0e', 'TEER 4': '#ffedd5;#9a3412', 'TEER 5': '#f3f4f6;#6b7280', 未分类: '#fafafa;#9ca3af',
}
const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

export default function JobsTable({ jobs, updatedAt }: { jobs: JobRow[]; updatedAt?: string }) {
  const [q, setQ] = useState('')
  const [source, setSource] = useState('')
  const [province, setProvince] = useState('')
  const [category, setCategory] = useState('')

  const sources = useMemo(() => uniq(jobs.map((j) => j.source)), [jobs])
  const provinces = useMemo(() => uniq(jobs.map((j) => j.province)), [jobs])
  const categories = useMemo(() => uniq(jobs.map((j) => j.category)), [jobs])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return jobs.filter(
      (j) =>
        (!source || j.source === source) &&
        (!province || j.province === province) &&
        (!category || j.category === category) &&
        (!term || `${j.title} ${j.company}`.toLowerCase().includes(term)),
    )
  }, [jobs, q, source, province, category])

  return (
    <div style={{ background: '#fff', color: '#1f2937', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <h1 style={{ margin: '0 0 2px', color: '#111827' }}>Jobs</h1>
        <p style={{ color: '#6b7280', marginTop: 0, fontSize: 14 }}>
          {rows.length} / {jobs.length} 个职位 · 按移民评分排序{updatedAt ? ` · 数据更新于 ${updatedAt.slice(0, 16).replace('T', ' ')}` : ''}
        </p>
        <p style={{ color: '#9ca3af', marginTop: -6, fontSize: 12 }}>评分按职业分类各自标准 · 点职位名→投递 · 点公司名→官网 · 点地点→地图</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '1rem 0' }}>
          <input placeholder="搜索职位 / 公司…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...ctrl, flex: '1 1 220px' }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={ctrl}>
            <option value="">全部分类</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} style={ctrl}>
            <option value="">全部来源</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={province} onChange={(e) => setProvince(e.target.value)} style={ctrl}>
            <option value="">全部省份</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {(q || source || province || category) && (
            <button onClick={() => { setQ(''); setSource(''); setProvince(''); setCategory('') }} style={{ ...ctrl, cursor: 'pointer', background: '#f3f4f6' }}>清除</button>
          )}
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['评分', '分类', '职位', '公司', 'NOC', '经验级别', '地点', '来源', '发布时间', '更新时间'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', color: '#374151', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((j, i) => {
                const locStr = j.address || [j.city, j.province].filter(Boolean).join(', ')
                const [bg, fg] = (catColor[j.category] || '#f3f4f6;#374151').split(';')
                return (
                  <tr key={j.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 ? '#fcfcfd' : '#fff' }}>
                    <td style={{ ...td, fontWeight: 600, color: scoreColor(j.score) }}>{j.score ?? '—'}</td>
                    <td style={td}>{j.category ? <span style={{ ...tag, background: bg, color: fg }}>{j.category}</span> : '—'}</td>
                    <td style={{ ...td, ...cap(380) }} title={j.title}>
                      {j.applyUrl ? <a href={j.applyUrl} target="_blank" rel="noreferrer" style={link}>{j.title}</a> : j.title}
                    </td>
                    <td style={{ ...td, ...cap(190) }} title={j.company}>
                      {j.officialUrl ? <a href={j.officialUrl} target="_blank" rel="noreferrer" style={link}>{j.company}</a> : j.company}
                    </td>
                    <td style={td}>{j.noc || '—'}</td>
                    <td style={td}>{accLabel[j.accessibility] ?? '—'}</td>
                    <td style={{ ...td, ...cap(210) }} title={locStr}>
                      {locStr ? <a href={mapsUrl(locStr)} target="_blank" rel="noreferrer" style={link}>{locStr}</a> : '—'}
                    </td>
                    <td style={td}><span style={tag}>{j.source}</span></td>
                    <td style={{ ...td, color: '#6b7280', fontSize: 12.5 }}>{j.datePosted ? j.datePosted.slice(0, 10) : '—'}</td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: 12.5 }}>{j.lastSeen ? j.lastSeen.slice(0, 10) : '—'}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>无匹配职位</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const scoreColor = (s: number | null) => (s == null ? '#9ca3af' : s >= 75 ? '#15803d' : s >= 50 ? '#b45309' : '#6b7280')
const ctrl: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#1f2937', background: '#fff' }
const td: React.CSSProperties = { padding: '7px 12px', whiteSpace: 'nowrap', verticalAlign: 'middle' }
const cap = (w: number): React.CSSProperties => ({ maxWidth: w, overflow: 'hidden', textOverflow: 'ellipsis' })
const tag: React.CSSProperties = { background: '#eef2ff', color: '#3730a3', padding: '2px 8px', borderRadius: 10, fontSize: 12 }
const link: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
