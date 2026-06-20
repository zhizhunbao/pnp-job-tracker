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
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 4 }}>Jobs</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        {rows.length} / {jobs.length} 个职位 · 第一方来源(公司 ATS)
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '1rem 0' }}>
        <input
          placeholder="搜索职位 / 公司…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: '1 1 220px', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
        />
        <select value={source} onChange={(e) => setSource(e.target.value)} style={selStyle}>
          <option value="">全部来源</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={province} onChange={(e) => setProvince(e.target.value)} style={selStyle}>
          <option value="">全部省份</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {(q || source || province) && (
          <button onClick={() => { setQ(''); setSource(''); setProvince('') }} style={btnStyle}>
            清除
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #333' }}>
              {['职位', '公司', '来源', '地点', 'NOC', '评分', '投递'].map((h) => (
                <th key={h} style={{ padding: '8px 10px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{j.title}</td>
                <td style={td}>{j.company}</td>
                <td style={td}><span style={tag}>{j.source}</span></td>
                <td style={td}>{[j.city, j.province].filter(Boolean).join(', ')}</td>
                <td style={td}>{j.noc || '—'}</td>
                <td style={td}>{j.score ?? '—'}</td>
                <td style={td}>
                  {j.applyUrl ? (
                    <a href={j.applyUrl} target="_blank" rel="noreferrer">投递 ↗</a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  无匹配职位
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const selStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }
const btnStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: '#f5f5f5' }
const td: React.CSSProperties = { padding: '8px 10px', verticalAlign: 'top' }
const tag: React.CSSProperties = { background: '#eef', color: '#334', padding: '2px 8px', borderRadius: 10, fontSize: 12 }
