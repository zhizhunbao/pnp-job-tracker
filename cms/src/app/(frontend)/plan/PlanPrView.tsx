'use client'
// 卡②「拿 PR」两态页(L2-01/L2-02 拍板:答题与看报告是两个界面,互跳靠一个按钮)。
// 答题态=只有题与进度(基本 4 题,四选一含兜底);报告态=只有结论与依据(/api/report → rpt.* 三语渲染)。
// 跨卡复用铁律:currentStatus/目标省从三问预填(答过的不重新问,预填可改);职业直接用三问的 nocs[0],
// 没答过职业 → 页内拉起 EntryQuiz(同一组件不复制)。答案存 localStorage,改答案 → 报告立刻重算。
import { useEffect, useMemo, useState } from 'react'

import { initialLang, makeT, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { EntryQuiz, readQuiz, shortOcc } from '../quiz/EntryQuiz'
import { Button, UI } from '../ui/primitives'
import { track } from '@/lib/track'

const KEY = 'plan_pr_v1'
type Bands = { status: string; clbBand: number; expBand: number; provBand: number }
const CLB = [0, 5, 7, 9, 0]            // 档→CLB(a4 还没考=null 走 0 哨兵)
const EXP = [0, 0, 6, 18, 30]          // 档→月数(a1 没有=0 个月,是答案不是缺答)
const PROVS: string[][] = [[], ['BC'], ['ON'], ['AB', 'SK', 'MB'], []]   // a4 先看哪个够得着=不限省

type RptLine = { key: string; params: Record<string, string | number>; verdict?: string; source?: { label: string; url: string; fetched: string }; url?: string }
type Rpt = { noc: string; title: string; conclusions: RptLine[]; gaps: RptLine[]; nextSteps: RptLine[]; alternatives: RptLine[]; confidence: 'low' | 'mid' | 'high'; asOf: string }

const V_DOT: Record<string, string> = { pass: UI.ok, warn: '#b45309', fail: '#b91c1c', na: '#9ca3af' }

function Line({ l, t }: { l: RptLine; t: TFn }) {
  const body = t(l.key, l.params)
  return (
    <li style={{ margin: '7px 0', lineHeight: 1.7, listStyle: 'none', display: 'flex', gap: 9, alignItems: 'baseline' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: V_DOT[l.verdict ?? 'na'], position: 'relative', top: -1 }} />
      <span style={{ minWidth: 0 }}>
        {l.url ? <a href={l.url} style={{ color: UI.primary, textDecoration: 'none' }}>{body}</a> : body}
        {l.source?.url && (
          <a href={l.source.url} target="_blank" rel="noreferrer" title={`${l.source.label}${l.source.fetched ? ` · ${l.source.fetched}` : ''}`}
            style={{ marginLeft: 6, fontSize: 12, color: UI.text3, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('rpt.src')} ↗</a>
        )}
      </span>
    </li>
  )
}

export function PlanPrView() {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { setLang(initialLang()) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])

  // 答案(答题态的全部状态):status 复用三问;clb/exp/prov 三档本页收
  const [bands, setBands] = useState<Bands>({ status: '', clbBand: 0, expBand: 0, provBand: 0 })
  const [noc, setNoc] = useState('')
  const [nocTitle, setNocTitle] = useState('')
  const [quizOpen, setQuizOpen] = useState(false)
  const [view, setView] = useState<'quiz' | 'report'>('quiz')
  const [step, setStep] = useState(0)   // 一屏一题(2026-07-31 Frank「一次只显示一个题,上一题下一题那种」)
  const [rpt, setRpt] = useState<Rpt | null | 'loading'>(null)

  useEffect(() => {
    const q = readQuiz()
    let saved: Partial<Bands> = {}
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { /* ignore */ }
    const b: Bands = {
      status: saved.status || q?.status || '',
      clbBand: saved.clbBand || 0, expBand: saved.expBand || 0,
      // 目标省预填:三问选过省 → 映射到最近的档(单选 BC/ON 精确档;别的组合走「先看哪个够得着」)
      provBand: saved.provBand || (q?.provs?.length ? (q.provs.length === 1 && q.provs[0] === 'BC' ? 1 : q.provs.length === 1 && q.provs[0] === 'ON' ? 2 : 4) : 0),
    }
    setBands(b)
    // 起步落在第一道没答的题上(答过的不重走,上一题仍可回去改)
    const firstUnanswered = [!!b.status, !!b.clbBand, !!b.expBand, !!b.provBand].indexOf(false)
    setStep(firstUnanswered === -1 ? 3 : firstUnanswered)
    setNoc(q?.nocs?.[0] || '')
    if (new URLSearchParams(window.location.search).get('view') === 'report') setView('report')
    track('plan-pr-open')
  }, [])
  // 职业名回显(代码不裸奔):/api/quiz?noc 与三问结果页同端点
  useEffect(() => {
    if (!noc) { setNocTitle(''); return }
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`).then((r) => r.json())
      .then((d) => setNocTitle(lang === 'zh' && d?.facts?.titleZh ? d.facts.titleZh : d?.facts?.title || noc))
      .catch(() => setNocTitle(noc))
  }, [noc, lang])

  const save = (b: Bands) => { setBands(b); try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* ignore */ } }
  const answered = [bands.status, bands.clbBand, bands.expBand, bands.provBand].filter(Boolean).length

  const gotoReport = () => {
    track('plan-pr-report', { answered })
    setView('report')
    try { window.history.replaceState(null, '', '?view=report') } catch { /* ignore */ }
  }
  const gotoQuiz = () => {
    setView('quiz')
    try { window.history.replaceState(null, '', window.location.pathname) } catch { /* ignore */ }
  }
  // 报告态进入即拉(改答案回来再进=重算;答案是幂等输入,不需要防抖)
  useEffect(() => {
    if (view !== 'report') return
    setRpt('loading')
    const ctrl = new AbortController()
    fetch('/api/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: ctrl.signal,
      body: JSON.stringify({ goal: 'pr', answers: {
        noc,
        currentStatus: bands.status || undefined,
        clb: CLB[bands.clbBand] || undefined,
        canadianExpMonths: bands.expBand ? EXP[bands.expBand] : undefined,
        targetProvinces: PROVS[bands.provBand],
      } }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => setRpt(d?.report ?? null))
      .catch(() => { if (!ctrl.signal.aborted) setRpt(null) })
    return () => ctrl.abort()
  }, [view])   // eslint-disable-line react-hooks/exhaustive-deps

  const secH: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, margin: '16px 0 4px', color: '#111827' }
  // 一屏一题(2026-07-31 Frank「一次只显示一个题,上一题下一题那种」「参考其他答题网站」——
  // Typeform 范式照效果图落:连续进度条、第 N 题计数、大题干、字母章选项大卡、点选自动进下一题):
  // 四题统一配置;status 复用 quiz.st.*(跨卡复用),其余三题 plan.* 四选一含兜底
  const QUESTIONS: { title: string; labels: string[]; value: () => number; pick: (i: number) => Bands }[] = [
    { title: 'quiz.q1', labels: ['quiz.st.overseas', 'quiz.st.studying', 'quiz.st.working', 'quiz.st.jobhunting'],
      value: () => ['overseas', 'studying', 'working', 'jobhunting'].indexOf(bands.status) + 1,
      pick: (i) => ({ ...bands, status: ['overseas', 'studying', 'working', 'jobhunting'][i - 1] }) },
    { title: 'plan.q.clb', labels: [1, 2, 3, 4].map((i) => `plan.clb.a${i}`), value: () => bands.clbBand, pick: (i) => ({ ...bands, clbBand: i }) },
    { title: 'plan.q.exp', labels: [1, 2, 3, 4].map((i) => `plan.exp.a${i}`), value: () => bands.expBand, pick: (i) => ({ ...bands, expBand: i }) },
    { title: 'plan.q.prov', labels: [1, 2, 3, 4].map((i) => `plan.prov.a${i}`), value: () => bands.provBand, pick: (i) => ({ ...bands, provBand: i }) },
  ]
  const q = QUESTIONS[step]
  const pickOpt = (i: number) => {
    save(q.pick(i))
    if (step < 3) setTimeout(() => setStep(step + 1), 200)   // 点选即进下一题(200ms 留选中反馈)
  }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="start" />
      <main style={{ flex: '1 0 auto', width: '100%', maxWidth: 760, margin: '1rem auto 2.5rem', padding: '0 1.25rem', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 22, margin: '6px 0 4px' }}>{t('plan.pr.title')}</h1>

        {view === 'quiz' ? (
          <>
            {/* 换题淡入(题卡 key=step 触发);选项 hover=卡 token 同族 */}
            <style>{`@keyframes plFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
              .plQ{animation:plFade .22s ease}
              .plOpt:hover{border-color:#bfdbfe !important;background:#f8faff !important;filter:none}`}</style>
            {/* 连续进度条(答一题涨 1/4)+ 计数 */}
            <div style={{ height: 6, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden', marginTop: 6 }}>
              <span style={{ display: 'block', height: '100%', width: `${answered * 25}%`, background: UI.primary, borderRadius: 999, transition: 'width .25s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: UI.text3, margin: '6px 0 18px' }}>
              <span>{t('plan.pr.sub')}</span><span style={{ whiteSpace: 'nowrap', marginLeft: 12 }}>{t('plan.answered', { n: answered })}</span>
            </div>
            {/* 职业 chip 常驻(非四题之一):三问答过直接用,没答→页内拉起 EntryQuiz */}
            <div style={{ marginBottom: 22 }}>
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', maxWidth: '100%', fontSize: 12.5, color: UI.text2, background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 999, padding: '5px 12px' }}>
                <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{t('plan.occ')}</span>
                {noc
                  ? <b style={{ color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortOcc(nocTitle || noc)}</b>
                  : <span style={{ color: '#b45309', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('plan.occ.none')}</span>}
                <button onClick={() => setQuizOpen(true)} style={{ border: 'none', background: 'none', color: UI.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t('plan.occ.pick')}</button>
              </span>
            </div>

            {/* 一屏一题:题号 → 大题干 → 字母章选项卡 */}
            <div key={step} className="plQ">
              <div style={{ fontSize: 13, color: UI.primary, fontWeight: 700, marginBottom: 6 }}>{t('plan.qn', { n: step + 1 })}</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 18px', color: '#111827' }}>{t(q.title)}</h2>
              {q.labels.map((lb, i) => {
                const on = q.value() === i + 1
                return (
                  <button key={lb} onClick={() => pickOpt(i + 1)} className="plOpt"
                    style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: 15, cursor: 'pointer', marginBottom: 10, borderRadius: 12, padding: '14px 16px', border: `1px solid ${on ? UI.primary : UI.border}`, background: on ? '#eff6ff' : '#fff', color: on ? '#1d4ed8' : '#1f2937', fontWeight: on ? 600 : 400 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${on ? UI.primary : '#d1d5db'}`, color: on ? '#fff' : UI.text2, background: on ? UI.primary : '#fff', fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{'ABCD'[i]}</span>
                    {t(lb)}
                  </button>
                )
              })}
            </div>

            {/* 上一题/下一题(Typeform 成对导航);最后一题主按钮=出报告 */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 22 }}>
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} style={{ border: 'none', background: 'none', color: UI.text2, fontSize: 13.5, cursor: 'pointer', padding: '8px 0', fontFamily: 'inherit' }}>← {t('plan.prev')}</button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} disabled={!q.value()}
                  style={{ marginLeft: 'auto', border: 'none', borderRadius: 10, background: q.value() ? UI.primary : '#e5e7eb', color: q.value() ? '#fff' : '#9ca3af', fontSize: 14.5, fontWeight: 600, padding: '12px 26px', cursor: q.value() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>{t('plan.next')} →</button>
              ) : (
                <Button kind="primary" onClick={gotoReport} style={{ marginLeft: 'auto', padding: '12px 26px', fontSize: 14.5 }}>{t('plan.toReport')}</Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '2px 0 10px' }}>
              {rpt && rpt !== 'loading' && rpt.title && <span style={{ fontSize: 14, fontWeight: 600 }}>{shortOcc(rpt.title)}<span style={{ color: UI.text3, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{rpt.noc}</span></span>}
              {rpt && rpt !== 'loading' && (
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 10px', borderRadius: 999, background: rpt.confidence === 'high' ? '#dcfce7' : rpt.confidence === 'mid' ? '#fef9c3' : '#f3f4f6', color: rpt.confidence === 'high' ? '#166534' : rpt.confidence === 'mid' ? '#854d0e' : '#6b7280' }}>
                  {t('rpt.conf')}:{t('rpt.conf.' + rpt.confidence)}
                </span>
              )}
              {rpt && rpt !== 'loading' && rpt.asOf && <span style={{ fontSize: 11.5, color: UI.text3 }}>{t('rpt.asOf', { d: rpt.asOf })}</span>}
              <button onClick={gotoQuiz} style={{ marginLeft: 'auto', border: `1px solid ${UI.border}`, background: '#fff', color: UI.text, borderRadius: 8, padding: '5px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>{t('plan.back')}</button>
            </div>
            {rpt === 'loading' || rpt === null ? (
              <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, minHeight: 220 }} />
            ) : (
              <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '6px 18px 14px' }}>
                {([['rpt.sec.c', rpt.conclusions], ['rpt.sec.g', rpt.gaps], ['rpt.sec.n', rpt.nextSteps], ['rpt.sec.a', rpt.alternatives]] as [string, RptLine[]][])
                  .filter(([, ls]) => ls.length > 0)
                  .map(([k, ls]) => (
                    <div key={k}>
                      <div style={secH}>{t(k)}</div>
                      <ul style={{ margin: 0, padding: 0 }}>{ls.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</ul>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter t={t} maxWidth={760} />
      {quizOpen && (
        <EntryQuiz t={t} lang={lang} initial={(() => { const q = readQuiz(); return q ? { status: q.status, nocs: q.nocs, provs: q.provs } : null })()}
          onClose={() => { setQuizOpen(false); const q = readQuiz(); setNoc(q?.nocs?.[0] || '') }}
          onApply={() => { const q = readQuiz(); setNoc(q?.nocs?.[0] || ''); setQuizOpen(false) }}
          onRegister={() => { window.location.href = '/?signup=1' }} />
      )}
    </div>
  )
}
