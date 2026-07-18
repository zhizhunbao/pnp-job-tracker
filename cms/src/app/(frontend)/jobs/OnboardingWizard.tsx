'use client'
// 分型分叉 onboarding wizard(E11-05 ②,§2.5 分叉 + §3.4 零打字 + §7 触点)。
// 弹框·首访自动弹:登录后无档案首次到 /jobs 弹一次(可关/不再弹);横幅「建档案」也手动开。
// 一步一问、零打字点选(复用 account/profileOptions)、每项可跳过、进度可见、价值前置;末步保存→整页跳 ?view=match 让 SSR 亮匹配。
import { useEffect, useMemo, useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'
import { hasProfile, normalizeProfile, type MatchProfile } from '@/lib/match'
import {
  POPULAR_NOCS, CLB_OPTS, CRS_OPTS, PGWP_OPTS, clbActive, crsActive, pgwpActive, type Opt,
} from '../account/profileOptions'

// 首访自动弹一次的记忆键(单一来源;JobsTable 也用它判定+置位)
export const OB_SEEN_KEY = 'jobs_onboarding_v1'

const STATUS_SLUGS = ['overseas', 'studying', 'working', 'jobhunting', 'pr'] as const
const PROVS = ['ON', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE']

type Field = 'noc' | 'clb' | 'crs' | 'prov' | 'pgwp'
// §2.5 分叉:分型 → 该型只问这几个字段(第 1 步永远是分型本身)
const BRANCH: Record<string, Field[]> = {
  overseas: ['noc', 'clb', 'crs', 'prov'],   // A 海外直申:不问工签
  studying: ['prov', 'noc'],                 // B 在加留学(毕业时间/专业无真收字段,略)
  working: ['noc', 'prov', 'pgwp'],          // C 工签在职
  jobhunting: ['noc', 'clb', 'prov', 'pgwp'],// D 在加找工作
  pr: ['noc', 'prov'],                       // E 已 PR/纯找工:移民信号弱化
}

const chip = (on: boolean): React.CSSProperties => ({
  border: on ? '1px solid #2563eb' : '1px solid #d1d5db', background: on ? '#eff6ff' : '#fff',
  color: on ? '#1d4ed8' : '#6b7280', borderRadius: 6, padding: '5px 11px', fontSize: 13, cursor: 'pointer',
})
const navBtn = (primary: boolean): React.CSSProperties => ({
  border: primary ? 'none' : '1px solid #d1d5db', background: primary ? '#2563eb' : '#fff',
  color: primary ? '#fff' : '#6b7280', fontWeight: primary ? 600 : 400,
  borderRadius: 7, padding: '8px 18px', fontSize: 13.5, cursor: 'pointer',
})

export function OnboardingWizard({ t, initial, onClose }: { t: TFn; initial: MatchProfile | null; onClose: () => void }) {
  const seed = normalizeProfile(initial)
  const [uid, setUid] = useState<string | number | null>(null)
  const [status, setStatus] = useState<string>(seed.currentStatus ?? '')
  const [nocs, setNocs] = useState<string[]>(seed.nocCodes)
  const [clb, setClb] = useState<number | null>(seed.clb)
  const [crs, setCrs] = useState<number | null>(seed.crs)
  const [crsCalc, setCrsCalc] = useState<boolean>(seed.crs != null)
  const [provs, setProvs] = useState<string[]>(seed.targetProvinces)
  const [pgwp, setPgwp] = useState<number | null>(seed.pgwpMonthsLeft)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json()).then((d) => setUid(d?.user?.id ?? null)).catch(() => {})
  }, [])

  const steps = useMemo<(Field | 'status')[]>(() => ['status', ...(BRANCH[status] || [])], [status])
  const total = steps.length
  const cur = steps[Math.min(step, total - 1)]
  const isLast = step >= total - 1

  const draft = () => ({
    currentStatus: status || null, nocCodes: nocs, clb, crs: crsCalc ? crs : null,
    targetProvinces: provs, pgwpMonthsLeft: pgwp, profileUpdatedAt: new Date().toISOString(),
  })

  const finish = async () => {
    try { localStorage.setItem(OB_SEEN_KEY, '1') } catch { /* ignore */ }  // 完成即标记已弹,防跳转后重弹(保存失败/空档同理)
    if (uid != null) {
      setSaving(true)
      try {
        await fetch(`/api/users/${uid}`, {
          method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: draft() }),
        })
      } catch { /* 保存失败也放行,不卡住用户 */ }
    }
    const p = { ...draft(), targetProvinces: provs, nocCodes: nocs } as Partial<MatchProfile>
    // 有档案 → 整页跳匹配视图(SSR 重算 profileOk 亮 match);否则回职位板。根域直出=职位板在根路径(同 toggleMatchView)
    window.location.href = hasProfile(p) ? '/?view=match' : '/'
  }

  const next = () => { if (isLast) finish(); else setStep((s) => Math.min(s + 1, total - 1)) }
  const back = () => setStep((s) => Math.max(0, s - 1))

  const Chips = ({ opts, active, onPick }: { opts: Opt[]; active: number | null; onPick: (v: number | null) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {opts.map((o) => {
        const on = o.value === null ? active === null : active === o.value
        return <button key={o.key} type="button" onClick={() => onPick(o.value)} style={chip(on)}>{t(o.key)}</button>
      })}
    </div>
  )

  const body = () => {
    if (cur === 'status') return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {STATUS_SLUGS.map((s) => <button key={s} type="button" onClick={() => setStatus(status === s ? '' : s)} style={chip(status === s)}>{t(`prof.st.${s}`)}</button>)}
      </div>
    )
    if (cur === 'noc') return (<>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>{t('prof.jobPopular')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {POPULAR_NOCS.map((p) => {
          const on = nocs.includes(p.noc)
          return <button key={p.noc} type="button" onClick={() => (on ? setNocs(nocs.filter((x) => x !== p.noc)) : setNocs([...nocs, p.noc]))} style={chip(on)}>{t(p.key)}</button>
        })}
      </div>
      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 10 }}>{t('ob.nocHint')}</div>
    </>)
    if (cur === 'clb') return <Chips opts={CLB_OPTS} active={clbActive(clb)} onPick={setClb} />
    if (cur === 'crs') return (<>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <button type="button" onClick={() => { setCrsCalc(false); setCrs(null) }} style={chip(!crsCalc)}>{t('prof.crsCalc.no')}</button>
        <button type="button" onClick={() => setCrsCalc(true)} style={chip(crsCalc)}>{t('prof.crsCalc.yes')}</button>
      </div>
      {crsCalc && <Chips opts={CRS_OPTS} active={crsActive(crs)} onPick={setCrs} />}
    </>)
    if (cur === 'prov') return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {PROVS.map((p) => { const on = provs.includes(p); return <button key={p} type="button" onClick={() => setProvs(on ? provs.filter((x) => x !== p) : [...provs, p])} style={chip(on)}>{p}</button> })}
      </div>
    )
    // pgwp
    return <Chips opts={PGWP_OPTS} active={pgwpActive(pgwp)} onPick={setPgwp} />
  }

  const qKey = cur === 'status' ? 'prof.status' : `prof.${cur}`

  return (
    <Modal onClose={onClose} size="md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', paddingRight: 40 }}>
        <span>{t('ob.step', { i: step + 1, n: total })}</span>
      </div>
      <div style={{ height: 5, background: '#eef2ff', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(((step + 1) / total) * 100)}%`, height: '100%', background: '#2563eb', transition: 'width .2s' }} />
      </div>
      <div style={{ fontSize: 12, color: '#2563eb', marginTop: 10 }}>{t('ob.value')}</div>

      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 14 }}>{t(qKey)}</div>
      {body()}
      {/* 已选职业回显(noc 步) */}
      {cur === 'noc' && nocs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {nocs.map((c) => {
            const p = POPULAR_NOCS.find((x) => x.noc === c)
            return <span key={c} style={{ background: '#eef2ff', color: '#3730a3', fontSize: 12.5, padding: '3px 8px', borderRadius: 6 }}>{p ? t(p.key) : c}<button onClick={() => setNocs(nocs.filter((x) => x !== c))} style={{ border: 'none', background: 'none', color: '#6366f1', cursor: 'pointer', marginLeft: 4, padding: 0, fontSize: 12.5 }}>×</button></span>
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
        <button type="button" onClick={next} style={{ border: 'none', background: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', padding: 0 }}>{t('ob.skip')}</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && <button type="button" onClick={back} style={navBtn(false)}>{t('ob.back')}</button>}
          <button type="button" onClick={next} disabled={saving} style={{ ...navBtn(true), opacity: saving ? 0.6 : 1 }}>{isLast ? t('ob.finish') : t('ob.next')}</button>
        </div>
      </div>
    </Modal>
  )
}
