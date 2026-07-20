'use client'
// 移民档案表单(E5-00 §3.2 + E11-05 ① §3.4 大白话零打字改造):
// 职业=热门 chips 一点即选(只显示职位名藏码)+ 搜索兜底;英语/EE分/工签=区间单选;分型=E11-04 单选;目标省=chips。
// 保存走 Payload 自带 REST PATCH /api/users/:id(update 已限 selfOrAdmin;profile 无字段锁=本人可改)。
// 数据完整性:返回用户已填精确值(clb/crs/pgwp)未主动改档时原值保留(state 初值=精确值,不点不覆盖)。
import { useEffect, useMemo, useState } from 'react'
import type { TFn } from '../jobs/i18n'
import { IconCheck, IconTarget } from '../Icons'
import { Button } from '../ui/primitives'
import { POPULAR_NOCS, CLB_OPTS, CRS_OPTS, PGWP_OPTS, clbActive, crsActive, pgwpActive, type Opt } from './profileOptions'

type NocOpt = { noc: string; title: string }
export type ProfileValue = {
  currentStatus?: string | null
  nocCodes?: string[] | null
  clb?: number | null
  crs?: number | null
  targetProvinces?: string[] | null
  pgwpMonthsLeft?: number | null
}

const PROVS = ['ON', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE'] // QC 走自己的体系,不进目标省
// 分型(E11-04):slug 单一来源在 lib/match.ts;这里只列 UI 顺序(§2.5 A–E),标签走 i18n prof.st.*
const STATUS_SLUGS = ['overseas', 'studying', 'working', 'jobhunting', 'pr'] as const

const inputS: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: 13.5, border: '1px solid #d1d5db', borderRadius: 6, marginTop: 4 }
const lbl: React.CSSProperties = { fontSize: 13, color: '#374151', display: 'block', marginTop: 14 }
// 统一点选 chip 样式(省份/分型/职业/区间共用)
const chip = (on: boolean): React.CSSProperties => ({
  border: on ? '1px solid #2563eb' : '1px solid #d1d5db', background: on ? '#eff6ff' : '#fff',
  color: on ? '#1d4ed8' : '#6b7280', borderRadius: 6, padding: '4px 10px', fontSize: 12.5, cursor: 'pointer',
})

export function ProfileForm({ t, userId, initial, onSaved }: { t: TFn; userId: string | number; initial: ProfileValue | null; onSaved?: () => void }) {
  const [status, setStatus] = useState<string>(initial?.currentStatus ?? '')
  const [nocs, setNocs] = useState<string[]>(initial?.nocCodes?.filter(Boolean) ?? [])
  const [clb, setClb] = useState<number | null>(initial?.clb ?? null)
  const [crs, setCrs] = useState<number | null>(initial?.crs ?? null)
  const [crsCalc, setCrsCalc] = useState<boolean>(initial?.crs != null)   // 算过 EE 分?(两段式)
  const [provs, setProvs] = useState<string[]>(initial?.targetProvinces?.filter(Boolean) ?? [])
  const [pgwp, setPgwp] = useState<number | null>(initial?.pgwpMonthsLeft ?? null)
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<NocOpt[]>([])
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<'' | 'saved' | 'err'>('')

  // NOC 选项:noc-descriptions 维度一次拉取(397 行;登录用户过 Payload 默认 read 权限)—— 搜索兜底 + 标题解析
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
  // 职位名解析(§3.4 藏码):noc-descriptions 官方名优先 → 热门大白话标签 → 兜底码
  const nocTitle = (code: string): string => {
    const o = opts.find((x) => x.noc === code)
    if (o?.title) return o.title
    const p = POPULAR_NOCS.find((x) => x.noc === code)
    return p ? t(p.key) : code
  }

  const save = async () => {
    setBusy(true); setState('')
    try {
      const r = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: {
          currentStatus: status || null,
          nocCodes: nocs, clb, crs: crsCalc ? crs : null,
          targetProvinces: provs, pgwpMonthsLeft: pgwp,
          profileUpdatedAt: new Date().toISOString(),
        } }),
      })
      setState(r.ok ? 'saved' : 'err')
      if (r.ok) onSaved?.()
    } catch { setState('err') } finally { setBusy(false) }
  }

  // 区间单选行(clb/pgwp;crs 两段式单独渲染)。active=当前值归属哪档;点 null 值档=清空该字段
  const BucketRow = ({ opts: os, active, onPick }: { opts: Opt[]; active: number | null; onPick: (v: number | null) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {os.map((o) => {
        const on = o.value === null ? active === null : active === o.value
        return <button key={o.key} type="button" onClick={() => onPick(o.value)} style={chip(on)}>{t(o.key)}</button>
      })}
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}><IconTarget /> {t('prof.title')}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{t('prof.hint')}</div>

      {/* 分型(E11-04):第一问,零打字单选;可不选,点同一项=取消 */}
      <div style={lbl}>{t('prof.status')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {STATUS_SLUGS.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(status === s ? '' : s)} style={chip(status === s)}>{t(`prof.st.${s}`)}</button>
        ))}
      </div>

      {/* 职业(§3.4):热门 chips 一点即选(藏码)+ 搜索兜底。分类下钻留 wizard(E11-05b) */}
      <div style={lbl}>{t('prof.noc')}</div>
      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>{t('prof.jobPopular')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {POPULAR_NOCS.map((p) => {
          const on = nocs.includes(p.noc)
          return <button key={p.noc} type="button" onClick={() => (on ? setNocs(nocs.filter((x) => x !== p.noc)) : addNoc(p.noc))} style={chip(on)}>{t(p.key)}</button>
        })}
      </div>
      <input style={{ ...inputS, marginTop: 8 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('prof.nocSearch')}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (/^\d{5}$/.test(q.trim())) addNoc(q.trim()); else if (hits[0]) addNoc(hits[0].noc) } }} />
      {hits.length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 2, maxHeight: 180, overflowY: 'auto', background: '#fff' }}>
          {hits.map((o) => (
            <div key={o.noc} onClick={() => addNoc(o.noc)}
              style={{ padding: '6px 10px', fontSize: 12.5, cursor: 'pointer', borderBottom: '1px solid #f9fafb', color: '#374151' }}>
              {o.title || o.noc}
            </div>
          ))}
        </div>
      )}
      {nocs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {nocs.map((c) => (
            <span key={c} style={{ background: '#eef2ff', color: '#3730a3', fontSize: 12.5, padding: '3px 8px', borderRadius: 6 }}>
              {nocTitle(c)}
              <button onClick={() => setNocs(nocs.filter((x) => x !== c))}
                style={{ border: 'none', background: 'none', color: '#6366f1', cursor: 'pointer', marginLeft: 4, padding: 0, fontSize: 12.5 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* 英语水平(§3.4):初级/中级/流利/高分 → 幕后 CLB */}
      <div style={lbl}>{t('prof.clb')}</div>
      <BucketRow opts={CLB_OPTS} active={clbActive(clb)} onPick={(v) => setClb(v)} />

      {/* EE 分(§3.4):两段式,没算过=跳过 / 算过→区间(存下界) */}
      <div style={lbl}>{t('prof.crs')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        <button type="button" onClick={() => { setCrsCalc(false); setCrs(null) }} style={chip(!crsCalc)}>{t('prof.crsCalc.no')}</button>
        <button type="button" onClick={() => setCrsCalc(true)} style={chip(crsCalc)}>{t('prof.crsCalc.yes')}</button>
      </div>
      {crsCalc && <BucketRow opts={CRS_OPTS} active={crsActive(crs)} onPick={(v) => setCrs(v)} />}

      {/* 工签剩余(§3.4):区间单选。诚实注:match v1 不消费 PGWP */}
      <div style={lbl}>{t('prof.pgwp')}</div>
      <BucketRow opts={PGWP_OPTS} active={pgwpActive(pgwp)} onPick={(v) => setPgwp(v)} />
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{t('prof.pgwpNote')}</div>

      {/* 目标省(§3.4:省份多选 chips) */}
      <div style={lbl}>{t('prof.prov')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {PROVS.map((p) => {
          const on = provs.includes(p)
          {/* #58 零黑话:chip 显示省全名(三语),值仍存两字码 */}
          return <button key={p} type="button" onClick={() => setProvs(on ? provs.filter((x) => x !== p) : [...provs, p])} style={chip(on)}>{t('pr.' + p)}</button>
        })}
      </div>

      {/* 组件统一 P2(#113):保存钮换 primitives.Button(primary 通栏;禁用=内置浅蓝) */}
      <Button lg onClick={save} disabled={busy} style={{ width: '100%', marginTop: 16, textAlign: 'center', padding: '9px 0' }}>
        {busy ? '…' : t('prof.save')}
      </Button>
      {state === 'saved' && <div style={{ color: '#047857', fontSize: 13, marginTop: 8 }}><IconCheck /> {t('prof.saved')}</div>}
      {state === 'err' && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{t('prof.err')}</div>}
    </div>
  )
}
