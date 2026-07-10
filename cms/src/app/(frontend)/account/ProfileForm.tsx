'use client'
// 移民档案表单(E5-00 §3.2):NOC 搜索下拉(noc-descriptions 维度,码+官方名)+ CLB/CRS/目标省/PGWP。
// 保存走 Payload 自带 REST PATCH /api/users/:id(update 已限 selfOrAdmin;profile 无字段锁=本人可改)。
// 匹配列在 /jobs 服务端算 —— 存好档案后刷新列表页生效。
import { useEffect, useMemo, useState } from 'react'
import type { TFn } from '../jobs/i18n'
import { IconCheck, IconTarget } from '../Icons'

type NocOpt = { noc: string; title: string }
export type ProfileValue = {
  nocCodes?: string[] | null
  clb?: number | null
  crs?: number | null
  targetProvinces?: string[] | null
  pgwpMonthsLeft?: number | null
}

const PROVS = ['ON', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE'] // QC 走自己的体系,不进目标省
const inputS: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: 13.5, border: '1px solid #d1d5db', borderRadius: 6, marginTop: 4 }
const lbl: React.CSSProperties = { fontSize: 13, color: '#374151', display: 'block', marginTop: 12 }

export function ProfileForm({ t, userId, initial, onSaved }: { t: TFn; userId: string | number; initial: ProfileValue | null; onSaved?: () => void }) {
  const [nocs, setNocs] = useState<string[]>(initial?.nocCodes?.filter(Boolean) ?? [])
  const [clb, setClb] = useState(initial?.clb != null ? String(initial.clb) : '')
  const [crs, setCrs] = useState(initial?.crs != null ? String(initial.crs) : '')
  const [provs, setProvs] = useState<string[]>(initial?.targetProvinces?.filter(Boolean) ?? [])
  const [pgwp, setPgwp] = useState(initial?.pgwpMonthsLeft != null ? String(initial.pgwpMonthsLeft) : '')
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<NocOpt[]>([])
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<'' | 'saved' | 'err'>('')

  // NOC 选项:noc-descriptions 维度一次拉取(397 行;登录用户过 Payload 默认 read 权限)
  useEffect(() => {
    fetch('/api/noc-descriptions?limit=1000&depth=0', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setOpts((d?.docs ?? []).map((x: any) => ({ noc: x.noc, title: x.title || '' })).filter((x: NocOpt) => x.noc)))
      .catch(() => {})
  }, [])

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return opts.filter((o) => !nocs.includes(o.noc) && (o.noc.startsWith(s) || o.title.toLowerCase().includes(s))).slice(0, 8)
  }, [q, opts, nocs])

  const addNoc = (code: string) => { if (code && !nocs.includes(code)) setNocs([...nocs, code]); setQ('') }
  const numOrNull = (s: string) => { const n = Number(s); return s.trim() !== '' && Number.isFinite(n) ? n : null }

  const save = async () => {
    setBusy(true); setState('')
    try {
      const r = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: {
          nocCodes: nocs, clb: numOrNull(clb), crs: numOrNull(crs),
          targetProvinces: provs, pgwpMonthsLeft: numOrNull(pgwp),
          profileUpdatedAt: new Date().toISOString(),
        } }),
      })
      setState(r.ok ? 'saved' : 'err')
      if (r.ok) onSaved?.()
    } catch { setState('err') } finally { setBusy(false) }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}><IconTarget /> {t('prof.title')}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{t('prof.hint')}</div>

      <label style={lbl}>{t('prof.noc')}
        <input style={inputS} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('prof.nocSearch')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (/^\d{5}$/.test(q.trim())) addNoc(q.trim()); else if (hits[0]) addNoc(hits[0].noc) } }} />
      </label>
      {hits.length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 2, maxHeight: 180, overflowY: 'auto', background: '#fff' }}>
          {hits.map((o) => (
            <div key={o.noc} onClick={() => addNoc(o.noc)}
              style={{ padding: '6px 10px', fontSize: 12.5, cursor: 'pointer', borderBottom: '1px solid #f9fafb', color: '#374151' }}>
              <span style={{ fontWeight: 600 }}>{o.noc}</span> {o.title}
            </div>
          ))}
        </div>
      )}
      {nocs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {nocs.map((c) => (
            <span key={c} style={{ background: '#eef2ff', color: '#3730a3', fontSize: 12.5, padding: '3px 8px', borderRadius: 6 }}>
              {c}{opts.find((o) => o.noc === c)?.title ? ` · ${opts.find((o) => o.noc === c)!.title}` : ''}
              <button onClick={() => setNocs(nocs.filter((x) => x !== c))}
                style={{ border: 'none', background: 'none', color: '#6366f1', cursor: 'pointer', marginLeft: 4, padding: 0, fontSize: 12.5 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ ...lbl, flex: 1 }}>{t('prof.clb')}
          <input style={inputS} type="number" min={1} max={12} value={clb} onChange={(e) => setClb(e.target.value)} />
        </label>
        <label style={{ ...lbl, flex: 1 }}>{t('prof.crs')}
          <input style={inputS} type="number" min={0} max={1200} value={crs} onChange={(e) => setCrs(e.target.value)} />
        </label>
        <label style={{ ...lbl, flex: 1 }}>{t('prof.pgwp')}
          <input style={inputS} type="number" min={0} max={60} value={pgwp} onChange={(e) => setPgwp(e.target.value)} />
          {/* 诚实注(第 5 轮 #22):match v1 不消费此字段,别让用户以为填了会进匹配 */}
          <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 400, marginTop: 2 }}>{t('prof.pgwpNote')}</span>
        </label>
      </div>

      <div style={lbl}>{t('prof.prov')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {PROVS.map((p) => {
          const on = provs.includes(p)
          return (
            <button key={p} onClick={() => setProvs(on ? provs.filter((x) => x !== p) : [...provs, p])}
              style={{ border: on ? '1px solid #2563eb' : '1px solid #d1d5db', background: on ? '#eff6ff' : '#fff', color: on ? '#1d4ed8' : '#6b7280', borderRadius: 6, padding: '4px 10px', fontSize: 12.5, cursor: 'pointer' }}>
              {p}
            </button>
          )
        })}
      </div>

      <button onClick={save} disabled={busy}
        style={{ width: '100%', padding: '9px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 14, background: '#2563eb', color: '#fff', opacity: busy ? 0.6 : 1 }}>
        {busy ? '…' : t('prof.save')}
      </button>
      {state === 'saved' && <div style={{ color: '#047857', fontSize: 13, marginTop: 8 }}><IconCheck /> {t('prof.saved')}</div>}
      {state === 'err' && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{t('prof.err')}</div>}
    </div>
  )
}
