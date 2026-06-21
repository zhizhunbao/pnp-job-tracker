'use client'

import { useMemo, useState } from 'react'

// 统一字段（与 jobs collection 对齐）
export type JobRow = {
  id: string | number
  title: string
  company: string
  source: string
  province: string
  city: string
  noc: string
  accessibility: string
  score: number | null
  officialUrl: string
  applyUrl: string
  datePosted: string
}

const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort()
const accLabel: Record<string, string> = {
  'co-op': 'co-op', junior: '初级', intermediate: '中级', senior: '高级', unknown: '—',
}
const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

export default function JobsTable({ jobs, updatedAt }: { jobs: JobRow[]; updatedAt?: string }) {
  const [q, setQ] = useState('')
  const [source, setSource] = useState('')
  const [province, setProvince] = useState('')

  const sources = useMemo(() => uniq(jobs.map((j) => j.source)), [jobs])
  const provinces = useMemo(() => uniq(jobs.map((j) => j.province)), [jobs])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return jobs.filter(
      (j) =>
        (!source || j.source === source) &&
        (!province || j.province === province) &&
        (!term || `${j.title} ${j.company}`.toLowerCase().includes(term)),
    )
  }, [jobs, q, source, province])

  return (
    <div style={{ background: '#fff', color: '#1f2937', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <h1 style={{ margin: '0 0 2px', color: '#111827' }}>Jobs</h1>
        <p style={{ color: '#6b7280', marginTop: 0, fontSize: 14 }}>
          {rows.length} / {jobs.length} 个职位 · 按移民评分排序{updatedAt ? ` · 数据更新于 ${updatedAt.slice(0, 16).replace('T', ' ')}` : ''} · 第一方来源(公司 ATS)
        </p>
        <p style={{ color: '#9ca3af', marginTop: -6, fontSize: 12 }}>
          点职位名 → 投递页 · 点公司名 → 官网 · 点地点 → 地图
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '1rem 0' }}>
          <input placeholder="搜索职位 / 公司…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...ctrl, flex: '1 1 240px' }} />
          <select value={source} onChange={(e) => setSource(e.target.value)} style={ctrl}>
            <option value="">全部来源</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={province} onChange={(e) => setProvince(e.target.value)} style={ctrl}>
            <option value="">全部省份</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {(q || source || province) && (
            <button onClick={() => { setQ(''); setSource(''); setProvince('') }} style={{ ...ctrl, cursor: 'pointer', background: '#f3f4f6' }}>清除</button>
          )}
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['评分', '职位', '公司', 'NOC', '应届', '地点', '来源'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', color: '#374151', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((j, i) => {
                const locStr = [j.city, j.province].filter(Boolean).join(', ')
                return (
                  <tr key={j.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 ? '#fcfcfd' : '#fff' }}>
                    <td style={{ ...td, fontWeight: 600, color: scoreColor(j.score) }}>{j.score ?? '—'}</td>
                    <td style={{ ...td, ...cap(420) }} title={j.title}>
                      {j.applyUrl ? <a href={j.applyUrl} target="_blank" rel="noreferrer" style={link}>{j.title}</a> : j.title}
                    </td>
                    <td style={{ ...td, ...cap(200) }} title={j.company}>
                      {j.officialUrl ? <a href={j.officialUrl} target="_blank" rel="noreferrer" style={link}>{j.company}</a> : j.company}
                    </td>
                    <td style={td}>{j.noc || '—'}</td>
                    <td style={td}>{accLabel[j.accessibility] ?? '—'}</td>
                    <td style={{ ...td, ...cap(220) }} title={locStr}>
                      {locStr ? <a href={mapsUrl(locStr)} target="_blank" rel="noreferrer" style={link}>{locStr}</a> : '—'}
                    </td>
                    <td style={td}><span style={tag}>{j.source}</span></td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>无匹配职位</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const scoreColor = (s: number | null) => (s == null ? '#9ca3af' : s >= 85 ? '#15803d' : s >= 60 ? '#b45309' : '#6b7280')
const ctrl: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#1f2937', background: '#fff' }
const td: React.CSSProperties = { padding: '7px 12px', whiteSpace: 'nowrap', verticalAlign: 'middle' }
const cap = (w: number): React.CSSProperties => ({ maxWidth: w, overflow: 'hidden', textOverflow: 'ellipsis' })
const tag: React.CSSProperties = { background: '#eef2ff', color: '#3730a3', padding: '2px 8px', borderRadius: 10, fontSize: 12 }
const link: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
