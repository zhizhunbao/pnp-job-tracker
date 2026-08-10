'use client'
// #287 批D · 一键三合一判定区(设计 docs/design/一键三合一判定-20260809.md §5;
// 2026-08-10 并入 /plan/pr 主页面,不再在页面上自动套第二层弹窗。版式沿用三项文字胶囊条、免费行 ✓+官方 quote+出处日期、
// 锁区=行名可见值打码+ProCard、无档案态=行名+「—」+建档 CTA+预填问句、入口卡=标题+按钮零解释。
//
// 分层不在这里:付费闸在服务端(/api/triple-verdict 只给非 Pro 下发 gate/tier/key),
// 本组件拿到什么渲什么 —— locked 行天然没有 params,想漏都没得漏。
// 文案四闸:零逗号标题 / 无解释句 / 术语=职业匹配·雇主资质·个人条件 / 值一行放下。
import { useEffect, useRef, useState } from 'react'

import { AuthModal } from './AuthForm'
import { makeT, streamDisplay, type Lang, type TFn } from './i18n'
import { UpgradeModal } from './UpgradeModal'
import { ProCard } from '../ui/primitives'
import { track } from '@/lib/track'

// ── wire(与 /api/triple-verdict 的响应一一对应)─────────────────────────────
type TvEv = { url?: string; fetched?: string; label?: string }
type TvRow = {
  gate: 'occupation' | 'employer' | 'person'
  tier: 'free' | 'paid'
  key: string
  locked?: boolean
  state?: 'pass' | 'gap' | 'excluded' | 'unknown' | 'info'
  params?: Record<string, string | number | boolean | string[]>
  quote?: string
  evidence?: TvEv
  followups?: string[]
}
type TvWire = {
  ok: boolean
  noc: string | null
  nocName: string | null
  province: string
  availability: string
  loggedIn: boolean
  pro: boolean
  hasProfile: boolean
  rows: TvRow[]
}

// ── 入口件(四处共用;版式 = se287 拍板稿)────────────────────────────────────
/** 职位板胶囊排尾的入口 pill(蓝系,与判定胶囊同排但按钮感明显) */
export const TV_PILL: React.CSSProperties = {
  border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 12px', fontSize: 12,
  background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
}

/** 弹框/详情页的入口卡:标题(详情页)或卡头(弹框)+ 主按钮,零解释句 */
export function TvEntryCard({ t, lg, onOpen }: { t: TFn; lg?: boolean; onOpen: () => void }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: lg ? '14px 16px' : '12px 16px', margin: lg ? '12px 0 0' : '0 0 14px' }}>
      <div style={{ fontSize: lg ? 14.5 : 13.5, fontWeight: 700, color: '#111827', marginBottom: lg ? 10 : 8 }}>
        {t(lg ? 'tv.entryTitle' : 'tv.head')}
      </div>
      <button onClick={onOpen} style={{
        background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
        padding: lg ? '11px 20px' : '7px 16px', fontSize: lg ? 14 : 13, fontWeight: 600, whiteSpace: 'nowrap',
      }}>{t('tv.cta')}</button>
    </div>
  )
}

// ── 行渲染(key+params → 三语文案;与 tripleVerdict §6.1 行清单一一对应)───────
const P = (v: unknown): string => (v == null ? '' : String(v))

function provDisp(t: TFn, code: string): string {
  const full = t('prov.' + code)
  return full === 'prov.' + code ? code : full
}

/** 免费/Pro 行 → {main, sub?}。unknown 的段落语义照组装器:判不了就说判不了,不编。 */
function rowText(t: TFn, row: TvRow): { main: string; sub?: string } | null {
  const p = row.params ?? {}
  const prov = provDisp(t, P(p.prov))
  switch (true) {
    case row.key === 'tv.occ.listed':
      return { main: t('tv.occ.listed', { list: streamDisplay(t, P(p.list)) }) }
    case row.key === 'tv.occ.excluded':
      return { main: t('tv.occ.excluded', { list: streamDisplay(t, P(p.list)) }) }
    case row.key === 'tv.occ.notListed':
      return { main: t('tv.occ.notListed', { prov }) }
    case row.key === 'tv.occ.teer':
      return row.state === 'unknown' ? { main: t('tv.occ.teerNa') }
        : { main: t(row.state === 'pass' ? 'tv.occ.teerPass' : 'tv.occ.teerGap', { teer: P(p.teer), prov }) }
    case row.key === 'tv.emp.designated':
      return { main: t('tv.emp.designated', { program: P(p.program) }), sub: t('tv.emp.listedAs', { name: P(p.name) }) }
    // 多配:名录里同名法人多家(连锁加盟),只报家数不点名——点名等于替用户认了一家不可证的雇主
    case row.key === 'tv.emp.designatedMulti':
      return { main: t('tv.emp.desigMulti', { program: P(p.program) || 'AIP', count: P(p.count) }), sub: t('tv.emp.desigMultiSub') }
    case row.key === 'tv.emp.designationUnknown':
      return { main: t('tv.emp.desigNa') }
    case row.key === 'tv.emp.years':
      return row.state === 'unknown'
        ? { main: t('tv.emp.yearsNa', { need: P(p.need), prov }) }
        : { main: t('tv.emp.yearsHave', { have: P(p.have) }), sub: t('tv.emp.yearsNeed', { need: P(p.need), prov }) }
    case row.key === 'tv.emp.staff':
      return row.state === 'unknown'
        ? { main: t('tv.emp.staffNa', { need: P(p.need), prov }) }
        : { main: t('tv.emp.staffHave', { have: P(p.have) }), sub: t('tv.emp.staffNeed', { need: P(p.need), prov }) }
    case row.key === 'tv.emp.staffFact':
      return { main: t('tv.emp.staffFact', { staff: P(p.staff) }), sub: t('tv.emp.estimate') }
    case row.key === 'tv.emp.publicSector':
      return { main: t('tv.emp.public') }
    case row.key === 'tv.person.language':
      return row.state === 'unknown' ? { main: t('tv.pe.langNa', { need: P(p.need) }) }
        : { main: t(row.state === 'pass' ? 'tv.pe.langPass' : 'tv.pe.langGap', { need: P(p.need), have: P(p.have) }) }
    case row.key === 'tv.person.experience':
      return row.state === 'unknown' ? { main: t('tv.pe.expNa', { need: P(p.need) }) }
        : { main: t(row.state === 'pass' ? 'tv.pe.expPass' : 'tv.pe.expGap', { need: P(p.need), have: P(p.have), short: P(p.short) }) }
    case row.key.startsWith('tv.person.'):
      // 其余 factor(income/funds…)通用句:need+unit 全来自官方行,不硬翻单位
      return row.state === 'unknown' ? { main: t('tv.pe.genNa', { need: P(p.need), unit: P(p.unit) }) }
        : { main: t(row.state === 'pass' ? 'tv.pe.genPass' : 'tv.pe.genGap', { need: P(p.need), unit: P(p.unit), have: P(p.have) }) }
    case row.key === 'tv.time.permit':
      return row.state === 'unknown' ? { main: t('tv.time.na') } : { main: t('tv.time.months', { months: P(p.months) }) }
    case row.key === 'tv.compare.listed':
      return { main: t('tv.cmp.listed', { prov, list: streamDisplay(t, P(p.list)) }), sub: t('tv.cmp.basis', { prov: provDisp(t, P(p.basisProv)) }) }
    case row.key === 'tv.compare.notListed':
      return { main: t('tv.cmp.notListed', { prov }) }
    case row.key === 'tv.compare.noTarget':
      return { main: t('tv.cmp.noTarget') }
    case row.key === 'tv.route.fastest': {
      if (row.state === 'unknown') return { main: t('tv.route.na') }
      const keys = Array.isArray(p.keys) ? (p.keys as string[]) : []
      const names = keys.map((k) => t('jpw.p.' + k))
      return keys.length > 1
        ? { main: t('tv.route.tied', { routes: names.join(t('sep')) }) }
        : { main: t('tv.route.one', { route: names[0] ?? '' }) }
    }
    case row.key === 'tv.next.employer': {
      if (row.state === 'unknown') return { main: t('tv.next.na') }
      const lmiaKnown = p.lmiaKnown === true
      const n = Number(p.lmiaSameNoc ?? 0)
      const sub = lmiaKnown ? (n > 0 ? t('tv.next.lmiaN', { n }) : t('tv.next.lmia0')) : t('tv.next.lmiaNa')
      return p.program ? { main: t('tv.next.viaProgram', { program: P(p.program) }), sub } : { main: sub }
    }
    default:
      return null
  }
}

/** 付费行显示顺序(效果图定稿:语言→经验→其余个人→时间窗→换省→比路→雇主下一步) */
const PAID_ORDER = (key: string): number =>
  key === 'tv.person.language' ? 1 : key === 'tv.person.experience' ? 2 : key.startsWith('tv.person.') ? 3
  : key === 'tv.time.permit' ? 4 : key.startsWith('tv.compare.') ? 5 : key === 'tv.route.fastest' ? 6 : 7

/** 锁行/无档案行的行名(付费行只带 key 时的关别标签) */
function lockLabel(t: TFn, key: string): string {
  if (key === 'tv.person.language') return t('tv.k.language')
  if (key === 'tv.person.experience') return t('tv.k.experience')
  if (key.startsWith('tv.person.')) return t('tv.k.person')
  if (key === 'tv.time.permit') return t('tv.k.permit')
  if (key.startsWith('tv.compare.')) return t('tv.k.compare')
  if (key === 'tv.route.fastest') return t('tv.k.route')
  if (key === 'tv.next.employer') return t('tv.k.next')
  return t('tv.k.person')
}

// ── 样式(token 与 JobsTable MODAL_CARD / primitives 同源)────────────────────
const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }
const CARD_HEAD: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }
const ICON: Record<string, { bg: string; fg: string; ch: string }> = {
  pass: { bg: '#dcfce7', fg: '#15803d', ch: '✓' },
  gap: { bg: '#fef3c7', fg: '#b45309', ch: '!' },
  excluded: { bg: '#fee2e2', fg: '#b91c1c', ch: '✗' },
  unknown: { bg: '#f3f4f6', fg: '#6b7280', ch: '?' },
  info: { bg: '#eff6ff', fg: '#1e40af', ch: 'i' },
}
const PILL_S: React.CSSProperties = { display: 'inline-block', padding: '1px 10px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }

function GateChip({ tone, children }: { tone: 'ok' | 'warn' | 'ready' | 'na'; children: React.ReactNode }) {
  const c = tone === 'ok' ? { bg: '#dcfce7', fg: '#15803d' }
    : tone === 'warn' ? { bg: '#fef3c7', fg: '#b45309' }
    : tone === 'ready' ? { bg: '#eff6ff', fg: '#1d4ed8' }
    : { bg: '#f3f4f6', fg: '#6b7280' }
  return <span style={{ ...PILL_S, background: c.bg, color: c.fg }}>{children}</span>
}

function VRow({ state, main, sub, quote, ev, t }: { state: string; main: string; sub?: string; quote?: string; ev?: TvEv; t: TFn }) {
  const ic = ICON[state] ?? ICON.info
  const host = ev?.url ? ev.url.replace(/^https?:\/\//, '').split('/')[0] : ''
  return (
    <div style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, background: ic.bg, color: ic.fg }}>{ic.ch}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: '#111827', lineHeight: 1.55 }}>{main}</div>
        {sub ? <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginTop: 1 }}>{sub}</div> : null}
        {quote ? <div style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.55, marginTop: 3 }}>{quote}</div> : null}
        {ev?.url ? (
          <div style={{ fontSize: 11.5, marginTop: 2 }}>
            <a href={ev.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{host} ↗</a>
            {ev.fetched ? <span style={{ color: '#9ca3af', marginLeft: 8 }}>{ev.fetched}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── 主组件 ──────────────────────────────────────────────────────────────────
export function TripleVerdictPanel({ job, lang, profileComplete = false, refreshKey = 0, onBuildProfile }: {
  job: { id: string | number; title: string; company: string; city: string; province: string }
  lang: Lang
  profileComplete?: boolean
  refreshKey?: number
  onBuildProfile?: () => void
}) {
  const t = makeT(lang)
  const [d, setD] = useState<TvWire | null>(null)
  const [err, setErr] = useState(false)
  const [up, setUp] = useState<false | 'up' | 'auth'>(false)
  const lockSeen = useRef(false)

  useEffect(() => {
    track('tv-open')
    let dead = false
    fetch('/api/triple-verdict?job=' + encodeURIComponent(String(job.id)), { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => { if (!dead) { if (x?.ok) setD(x) ; else setErr(true) } })
      .catch(() => { if (!dead) setErr(true) })
    return () => { dead = true }
  }, [job.id, refreshKey])

  const free = d?.rows.filter((r) => r.tier === 'free') ?? []
  const occRows = free.filter((r) => r.gate === 'occupation')
  const empRows = free.filter((r) => r.gate === 'employer')
  const paid = (d?.rows.filter((r) => r.tier === 'paid') ?? []).slice().sort((a, b) => PAID_ORDER(a.key) - PAID_ORDER(b.key))
  // 锁区一行一个关别标签(compare 可多行 → 去重;计数用去重后的行数,与显示一致)
  const paidLabels = Array.from(new Set(paid.map((r) => lockLabel(t, r.key))))
  const hasProfile = !!d?.hasProfile || profileComplete

  // 付费位曝光(漏斗:锁区/建档位第一次渲染记一次)
  useEffect(() => {
    if (d && paid.length && !lockSeen.current) { lockSeen.current = true; track('tv-lock-seen', { kind: d.pro ? 'pro' : hasProfile ? 'locked' : 'noprofile' }) }
  }, [d, hasProfile, paid.length])

  // 三项胶囊:职业/雇主由免费行算,个人条件锁态灰
  const occTone = occRows.some((r) => r.state === 'excluded') ? 'warn' : occRows.some((r) => r.state === 'pass') ? 'ok' : 'na'
  const empTone = empRows.some((r) => r.state === 'pass') ? 'ok' : 'na'
  const youRows = paid.filter((r) => !r.locked)
  const youTone = !hasProfile ? 'na' : !d?.pro ? 'ready'
    : youRows.some((r) => r.state === 'gap' || r.state === 'excluded') ? 'warn'
    : youRows.some((r) => r.state === 'unknown') ? 'na' : 'ok'

  const askChat = () => {
    track('tv-build-profile')
    window.dispatchEvent(new CustomEvent('o2p:chat-open', { detail: { prefill: t('tv.ask', { co: job.company }) } }))
  }

  return (
    <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{t('tv.head')}</div>
        <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 44 }}>{job.title}</h3>
        <div style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0' }}>{job.company} {job.city} {provDisp(t, job.province)}</div>
      </div>
      <div style={{ padding: '10px 20px 20px' }}>
        {/* 三项胶囊条 */}
        {d ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 12px' }}>
            <GateChip tone={occTone}>{t('tv.g.occ')}{occTone === 'ok' ? ' ✓' : ''}</GateChip>
            <GateChip tone={empTone}>{t('tv.g.emp')}{empTone === 'ok' ? ' ✓' : ''}</GateChip>
            <GateChip tone={youTone}>{t('tv.g.you')}{youTone === 'ok' ? ' ✓' : youTone === 'ready' ? ` · ${t('tv.filled')}` : ''}</GateChip>
          </div>
        ) : null}

        {/* 加载占位(铁律:加载区必占位)/ 拿不到数照实说 */}
        {!d && !err ? (
          <div aria-hidden>
            {[0, 1, 2].map((i) => <div key={i} style={{ height: 12, borderRadius: 4, background: '#f1f3f5', margin: '14px 0' }} />)}
          </div>
        ) : null}
        {err ? <div style={{ fontSize: 13, color: '#6b7280' }}>{t('tv.err')}</div> : null}

        {/* 职业匹配(免费) */}
        {occRows.length ? (
          <section style={{ padding: '12px 0 2px', borderTop: '1px solid #e5e7eb' }}>
            <div style={CARD_HEAD}>{t('tv.g.occ')}</div>
            {occRows.map((r, i) => {
              const v = rowText(t, r)
              return v ? <VRow key={r.key + i} state={r.state ?? 'info'} main={v.main} sub={v.sub} quote={r.quote} ev={r.evidence} t={t} /> : null
            })}
          </section>
        ) : null}

        {/* 雇主资质(免费;tv.next.employer 是 paid 不在这) */}
        {empRows.length ? (
          <section style={{ padding: '14px 0 2px', borderTop: '1px solid #e5e7eb', marginTop: 10 }}>
            <div style={CARD_HEAD}>{t('tv.g.emp')}</div>
            {empRows.map((r, i) => {
              const v = rowText(t, r)
              return v ? <VRow key={r.key + i} state={r.state ?? 'info'} main={v.main} sub={v.sub} quote={r.quote} ev={r.evidence} t={t} /> : null
            })}
          </section>
        ) : null}

        {/* 个人条件(付费位):Pro+有档案=直渲;非 Pro=锁区;无档案=建档引导 */}
        {d && paid.length ? (
          <section style={{ padding: '14px 0 2px', borderTop: '1px solid #e5e7eb', marginTop: 10 }}>
            <div style={CARD_HEAD}>{t('tv.g.youCard')}</div>
            {d.pro && d.hasProfile ? (
              <>
                {paid.map((r, i) => {
                  const v = rowText(t, r)
                  return v ? <VRow key={r.key + i} state={r.state ?? 'info'} main={v.main} sub={v.sub} quote={r.quote} ev={r.evidence} t={t} /> : null
                })}
                {paid.some((r) => (r.followups ?? []).length) ? (
                  <button onClick={askChat} style={{ marginTop: 10, border: '1px solid #e5e7eb', borderRadius: 999, padding: '6px 14px', fontSize: 12.5, color: '#374151', background: '#f9fafb', cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t('tv.ask', { co: job.company })}
                  </button>
                ) : null}
              </>
            ) : !hasProfile ? (
              <>
                {paidLabels.map((k) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{k}</span>
                    <span style={{ fontSize: 13.5, color: '#9ca3af' }}>—</span>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <button onClick={onBuildProfile ?? askChat} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('tv.build')}</button>
                  <div style={{ marginTop: 8 }}>
                    <button onClick={askChat} style={{ border: '1px solid #e5e7eb', borderRadius: 999, padding: '6px 14px', fontSize: 12.5, color: '#374151', background: '#f9fafb', cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t('tv.ask', { co: job.company })}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ position: 'relative', marginTop: 6 }}>
                {paidLabels.map((k, i) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{k}</span>
                    {/* 打码占位:纹理假(真内容服务端没下发),LockedRows 同款手法 */}
                    <span aria-hidden style={{ fontSize: 13.5, color: '#9ca3af', filter: 'blur(5px)', userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {['结论文字在这一行', '差值与结论在此行', '一行结论文字示例'][i % 3]}
                    </span>
                  </div>
                ))}
                <ProCard overlay={paidLabels.length >= 4} text={t('tv.lockN', { n: paidLabels.length })} cta={t('pro.unlock')}
                  onClick={() => { track('tv-pro-click'); setUp(d.loggedIn ? 'up' : 'auth') }} />
              </div>
            )}
          </section>
        ) : null}

        {d ? <div style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.6 }}>{t('jpw.foot')}</div> : null}
      </div>

      {up === 'up' && <UpgradeModal t={t} reason={t('tv.lockN', { n: paidLabels.length })} onClose={() => setUp(false)} />}
      {up === 'auth' && <AuthModal t={t} mode="register" onClose={() => setUp(false)} onDone={() => window.location.reload()} />}
    </div>
  )
}
