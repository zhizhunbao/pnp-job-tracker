'use client'

import { useMemo, useState } from 'react'

export type JobRow = {
  id: string | number
  title: string
  company: string
  source: string
  province: string
  city: string
  noc: string
  score: number | null
  applyUrl: string
  datePosted: string
}

const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort()

export default function JobsTable({ jobs }: { jobs: JobRow[] }) {
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
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <h1 style={{ margin: '0 0 2px', color: '#111827' }}>Jobs</h1>
        <p style={{ color: '#6b7280', marginTop: 0, fontSize: 14 }}>
          {rows.length} / {jobs.length} 个职位 · 第一方来源(公司 ATS)
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '1rem 0' }}>
          <input
            placeholder="搜索职位 / 公司…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ ...ctrl, flex: '1 1 240px' }}
          />
          <select value={source} onChange={(e) => setSource(e.target.value)} style={ctrl}>
            <option value="">全部来源</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={province} onChange={(e) => setProvince(e.target.value)} style={ctrl}>
            <option value="">全部省份</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {(q || source || province) && (
            <button onClick={() => { setQ(''); setSource(''); setProvince('') }} style={{ ...ctrl, cursor: 'pointer', background: '#f3f4f6' }}>
              清除
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['职位', '公司', '来源', '地点', 'NOC', '评分', '投递'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', color: '#374151', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((j, i) => (
                <tr key={j.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 ? '#fcfcfd' : '#fff' }}>
                  <td style={td}>{j.title}</td>
                  <td style={td}>{j.company}</td>
                  <td style={td}><span style={tag}>{j.source}</span></td>
                  <td style={td}>{[j.city, j.province].filter(Boolean).join(', ') || '—'}</td>
                  <td style={td}>{j.noc || '—'}</td>
                  <td style={td}>{j.score ?? '—'}</td>
                  <td style={td}>
                    {j.applyUrl ? (
                      <a href={j.applyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                        投递 ↗
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>无匹配职位</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const ctrl: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#1f2937', background: '#fff' }
const td: React.CSSProperties = { padding: '7px 12px', whiteSpace: 'nowrap', verticalAlign: 'middle' }
const tag: React.CSSProperties = { background: '#eef2ff', color: '#3730a3', padding: '2px 8px', borderRadius: 10, fontSize: 12 }
