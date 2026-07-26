'use client'
// 入口三问(付费漏斗重设计-20260726,Frank「用户一访问页面就应该弹出一些问题,吸引用户填,然后最终拿结果付费」)。
// 四步:问 → 免费结果 → 注册保存 → 付费清单(付费包下一阶段)。本组件负责前两步 + 把注册接出去。
//
// 硬约束(写死在这,别再放宽):
//   ① 三题封顶、每题一屏、进度条可见;「先随便看看 ×」永远在;只弹一次(localStorage)。
//   ② 答完**立刻**出结果——结果来自 /api/quiz 的库内聚合(毫秒级),不碰 AI、不转圈。
//   ③ 跳过的人照常进职位板,不再骚扰。
//   ④ 匿名答案存 localStorage,注册后由调用方落库成档案(不让用户填两遍)。
import { useEffect, useMemo, useRef, useState } from 'react'

import { POPULAR_NOCS } from '../account/profileOptions'
import { Button, chipStyle } from '../ui/primitives'
import { track } from '@/lib/track'
import type { TFn } from './i18n'

export const QUIZ_KEY = 'jobs_quiz_v1'   // 记忆键(单一来源;JobsTable 判定是否弹也用它)

export type QuizAnswers = { status: string; nocs: string[]; provs: string[] }
export type QuizFacts = {
  noc: string; teer: number | null; title: string
  titleZh: string
  open: number; eligible: number; named: number
  streams: { stream: string; n: number }[]
  byProv: { province: string; n: number; eligible: number }[]
  medianSalary: number | null
}

const STATUS_SLUGS = ['overseas', 'studying', 'working', 'jobhunting'] as const
const PROVS = ['ON', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE']

export function readQuiz(): (QuizAnswers & { done?: boolean }) | null {
  try { const s = localStorage.getItem(QUIZ_KEY); return s ? JSON.parse(s) : null } catch { return null }
}

export function EntryQuiz({ t, lang, onClose, onRegister, onApply, initial, startAt }: {
  t: TFn
  lang: string
  onClose: () => void                      // 关闭/跳过:置位不再弹
  onRegister: (a: QuizAnswers) => void     // 结果页「注册保存」:交给宿主开注册框并落库
  onApply: (a: QuizAnswers) => void        // 结果页「看这些岗」:把答案套进列表筛选
  initial?: QuizAnswers | null             // 重答:预填上次答案(填错/跳过了都能回来改)
  startAt?: 0 | 3                          // 3=直接落结果页(「看上次结果」入口)
}) {
  const [step, setStep] = useState<number>(startAt ?? 0)   // 0/1/2 = 三题;3 = 结果
  const [status, setStatus] = useState(initial?.status || '')
  const [nocs, setNocs] = useState<string[]>(initial?.nocs || [])
  const [provs, setProvs] = useState<string[]>(initial?.provs || [])
  const [q, setQ] = useState('')
  const [cands, setCands] = useState<{ noc: string; title: string; titleZh: string }[]>([])
  // Frank 2026-07-26「这个弹框看着还是太单薄了」:热门职业按钮挂**真在招数** —— 光一排职业名
  // 既没信息也没说服力,挂上库里的数才是这个站与普通问卷的差别。一次拿全,不逐个查。
  const [counts, setCounts] = useState<Record<string, { open: number; eligible: number }>>({})
  const [nocTitle, setNocTitle] = useState('')   // 已选职业名(第 3 题顶部回显,让用户看见自己答到哪了)
  const [facts, setFacts] = useState<QuizFacts | null | 'loading'>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { track('quiz-open', { mode: startAt === 3 ? 'result' : initial ? 'redo' : 'first' }) }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (startAt !== 3) return
    const noc = (initial?.nocs || [])[0]
    if (!noc) { setFacts(null); return }
    setFacts('loading')
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`)
      .then((r) => r.json()).then((d) => setFacts(d?.facts ?? null)).catch(() => setFacts(null))
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`/api/quiz?counts=${POPULAR_NOCS.map((p) => p.noc).join(',')}`)
      .then((r) => r.json()).then((d) => setCounts(d?.counts || {})).catch(() => { /* 没数就不显示,不挡答题 */ })
  }, [])

  // 进第 3 题即预取该职业事实:省按钮直接挂「该省多少岗」(Frank「弹框太单薄」——
  // 让用户在**选省的当下**就看见各省行情,而不是答完才知道;端点与结果页同一个,结果页因此也秒开)
  useEffect(() => {
    const noc = nocs[0]
    if (step !== 2 || !noc || facts) return
    setFacts('loading')
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`)
      .then((r) => r.json()).then((d) => setFacts(d?.facts ?? null)).catch(() => setFacts(null))
  }, [step, nocs, facts])

  // 第 2 题搜索:250ms 防抖,≥2 字才打后端(库内 ILIKE,≤8 条)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setCands([]); return }
    timer.current = setTimeout(() => {
      fetch(`/api/quiz?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json()).then((d) => setCands(Array.isArray(d?.candidates) ? d.candidates : []))
        .catch(() => setCands([]))
    }, 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q])

  const answers = useMemo<QuizAnswers>(() => ({ status, nocs, provs }), [status, nocs, provs])
  const save = (done: boolean) => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify({ ...answers, done })) } catch { /* ignore */ } }

  const toResult = () => {
    save(true); track('quiz-done', { step: '3' })
    setStep(3)
    const noc = nocs[0]
    if (!noc) { setFacts(null); return }
    if (facts && facts !== 'loading' && facts.noc === noc) return   // 第 3 题已预取,别再打一次
    setFacts('loading')
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`)
      .then((r) => r.json()).then((d) => setFacts(d?.facts ?? null))
      .catch(() => setFacts(null))
  }

  const skip = () => { save(false); track('quiz-skip', { step: String(step) }); onClose() }
  // Escape 关框(与站内其他弹框同款;漏了它 → 用户按 Esc 以为关了,其实遮罩还在挡点击)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') skip() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  })
  const next = () => {
    track('quiz-step', { step: String(step) })
    if (step >= 2) toResult(); else setStep(step + 1)
  }

  const sheet: React.CSSProperties = {
    background: '#fff', width: '100%', maxWidth: 520, borderRadius: 16, padding: '16px 16px 20px',
    boxShadow: '0 -8px 30px rgba(0,0,0,.18)', maxHeight: '86vh', overflowY: 'auto',
  }
  const opt = (on: boolean): React.CSSProperties => ({
    border: `1px solid ${on ? '#2563eb' : '#e5e7eb'}`, background: on ? '#eff6ff' : '#fff',
    color: on ? '#1d4ed8' : '#1f2937', fontWeight: on ? 600 : 400,
    borderRadius: 10, padding: '12px 14px', fontSize: 14.5, marginBottom: 8, cursor: 'pointer', width: '100%', textAlign: 'left',
  })
  const pickedChip: React.CSSProperties = { fontSize: 11.5, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 9px' }
  const provName = (p: string) => t('prov.' + p) !== 'prov.' + p ? t('prov.' + p) : p

  return (
    <div onClick={skip} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.35)', zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <style>{'@media (min-width:641px){.eqSheet{margin-bottom:6vh}}'}</style>
      <div className="eqSheet" onClick={(e) => e.stopPropagation()} style={sheet}>
        {step < 3 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#9ca3af', marginBottom: 10 }}>
              <span>{step + 1} / 3</span>
              <span style={{ flex: 1, height: 4, background: '#eef2ff', borderRadius: 999, overflow: 'hidden' }}>
                <i style={{ display: 'block', height: '100%', width: `${((step + 1) / 3) * 100}%`, background: '#2563eb' }} />
              </span>
            </div>
            {/* Frank「弹框太单薄」二:把已答的两题回显出来 —— 三步问答只给一句话时,用户看不见自己的进展 */}
            {step > 0 && (status || nocTitle) ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {status ? <span style={pickedChip}>{t('quiz.st.' + status)}</span> : null}
                {nocTitle ? <span style={pickedChip}>{nocTitle}</span> : null}
              </div>
            ) : null}
            {step === 0 && (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, margin: '2px 0 4px' }}>{t('quiz.q1')}</div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 12 }}>{t('quiz.lead')}</div>
                {STATUS_SLUGS.map((s) => (
                  <button key={s} onClick={() => { setStatus(s); track('quiz-step', { step: '0' }); setStep(1) }} style={opt(status === s)}>{t('quiz.st.' + s)}</button>
                ))}
                {initial && <div onClick={() => setStep(1)} style={{ textAlign: 'center', fontSize: 12.5, color: '#2563eb', marginTop: 6, cursor: 'pointer' }}>{t('quiz.keep')}</div>}
              </>
            )}
            {step === 1 && (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, margin: '2px 0 4px' }}>{t('quiz.q2')}</div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 12 }}>{t('quiz.q2sub')}</div>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('quiz.q2ph')} enterKeyHint="search"
                  style={{ width: '100%', boxSizing: 'border-box', height: 42, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14.5, background: '#fafafa', marginBottom: 10 }} />
                {cands.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {cands.map((c) => (
                      <button key={c.noc} onClick={() => { setNocs([c.noc]); setNocTitle(lang === 'zh' && c.titleZh ? c.titleZh : c.title); setQ(''); setCands([]); track('quiz-step', { step: '1' }); setStep(2) }} style={opt(nocs[0] === c.noc)}>
                        {lang === 'zh' && c.titleZh ? c.titleZh : c.title}
                        <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>{c.noc}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {POPULAR_NOCS.map((p) => {
                    const c = counts[p.noc]
                    return (
                      <button key={p.noc} onClick={() => { setNocs([p.noc]); setNocTitle(t(p.key)); track('quiz-step', { step: '1' }); setStep(2) }}
                        style={{ ...chipStyle(nocs[0] === p.noc), display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                        {t(p.key)}
                        {c ? <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{t('quiz.openN', { n: c.open.toLocaleString('en-CA') })}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, margin: '2px 0 4px' }}>{t('quiz.q3')}</div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 12 }}>{t('quiz.q3sub')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                  {PROVS.map((p) => {
                    const on = provs.includes(p)
                    const n = facts && facts !== 'loading' ? facts.byProv.find((r) => r.province === p)?.n : undefined
                    return (
                      <button key={p} onClick={() => setProvs(on ? provs.filter((x) => x !== p) : [...provs, p])}
                        style={{ ...chipStyle(on), display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                        {provName(p)}
                        {n ? <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{t('quiz.jobsN', { n })}</span> : null}
                      </button>
                    )
                  })}
                </div>
                <Button kind="primary" onClick={next} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
                  {provs.length ? t('quiz.see') : t('quiz.seeAny')}
                </Button>
              </>
            )}
            {/* Frank「弹框太单薄」三:说清答完能拿到什么(库内真数,不是承诺) */}
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{t('quiz.payoff')}</div>
            <div onClick={skip} style={{ textAlign: 'center', fontSize: 12.5, color: '#9ca3af', marginTop: 10, cursor: 'pointer' }}>{t('quiz.skip')}</div>
          </>
        ) : (
          <QuizResult t={t} lang={lang} answers={answers} facts={facts} provName={provName}
            onRegister={() => { track('quiz-register'); onRegister(answers) }}
            onApply={() => { track('quiz-apply'); onApply(answers) }}
            onClose={() => { save(true); onClose() }} />
        )}
      </div>
    </div>
  )
}

// ── 免费结果页:只报库里查得到的事实,一个字都不许编 ────────────────────────────
function QuizResult({ t, lang, answers, facts, provName, onRegister, onApply, onClose }: {
  t: TFn; lang: string; answers: QuizAnswers; facts: QuizFacts | null | 'loading'
  provName: (p: string) => string
  onRegister: () => void; onApply: () => void; onClose: () => void
}) {
  useEffect(() => { if (facts && facts !== 'loading') track('quiz-result', { noc: facts.noc }) }, [facts])
  if (facts === 'loading') return <div style={{ padding: '30px 0', textAlign: 'center', color: '#6b7280', fontSize: 13.5 }}>{t('loading')}</div>
  if (!facts) {
    // 选了职业但当前零在招,或跳过了职业题 —— 说实话,不编数字
    return (
      <>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{t('quiz.noData')}</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 14 }}>{t('quiz.noDataSub')}</div>
        <Button kind="primary" onClick={onClose} style={{ width: '100%', padding: '12px 0' }}>{t('quiz.browse')}</Button>
      </>
    )
  }
  const title = lang === 'zh' && facts.titleZh ? facts.titleZh : (facts.title || facts.noc)
  const picked = answers.provs.length ? facts.byProv.filter((r) => answers.provs.includes(r.province)) : []
  const rest = facts.byProv.filter((r) => !picked.includes(r)).slice(0, 4 - Math.min(picked.length, 2))
  const rows = [...picked, ...rest].slice(0, 5)
  const kv = (k: React.ReactNode, v: React.ReactNode, dim = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', lineHeight: 2, opacity: dim ? .65 : 1 }}>
      <span>{k}</span><span>{v}</span>
    </div>
  )
  return (
    <>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '13px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: '#1e40af' }}>{title}</div>
        {answers.provs.length > 0 && (
          <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>{t('quiz.target', { p: answers.provs.map(provName).join('、') })}</div>
        )}
        <div style={{ height: 6 }} />
        <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.75 }}>
          {t('quiz.sum', { open: facts.open.toLocaleString('en-CA'), elig: facts.eligible.toLocaleString('en-CA') })}
          {facts.named > 0 && facts.streams[0] ? ' ' + t('quiz.sumNamed', { n: facts.named, s: facts.streams[0].stream }) : ''}
          {/* 原来这里挂一句「TEER x —— 多数省提名通道门槛卡在 TEER 0-3」:与本人无关的通用科普,
              且上一句「其中 N 个可提名」已经回答了同一个问题(Frank 2026-07-26「这种都属于废话」)→ 删 */}
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{t('quiz.byProv')}</div>
        {rows.map((r) => kv(provName(r.province),
          <span><b style={{ color: '#111827', fontSize: 15 }}>{r.n}</b> {t('quiz.jobs')}
            {/* 「·」禁用(no-dot-separator 铁律)——第二个事实用括号收,不用点号杂糅 */}
            {r.eligible > 0 ? <span style={{ color: '#15803d', fontWeight: 700 }}>({t('quiz.eligN', { n: r.eligible })})</span> : null}</span>,
          !answers.provs.includes(r.province)))}
        {facts.medianSalary != null && (
          <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 6 }}>
            {t('quiz.med', { v: '$' + Math.round(facts.medianSalary / 1000) + 'K' })}
          </div>
        )}
      </div>
      <Button kind="primary" onClick={onApply} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>{t('quiz.seeJobs')}</Button>
      <button onClick={onRegister} style={{ width: '100%', marginTop: 8, padding: '12px 0', fontSize: 14, fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, cursor: 'pointer' }}>
        {t('quiz.save')}
      </button>
      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 8, lineHeight: 1.6 }}>{t('quiz.foot')}</div>
    </>
  )
}
