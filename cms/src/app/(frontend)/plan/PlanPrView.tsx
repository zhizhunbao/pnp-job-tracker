'use client'
// 卡②「拿 PR」两态页(L2-01/L2-02:答题与看报告是两个界面,互跳靠一个按钮)。
// 答题态=SurveyJS(2026-07-31 Frank「用框架吧」):题库=lib/questions.ts 纯 JSON 配置,一屏一题/
// 进度条/上一题下一题/多语全由框架出;点选自动进下一题,答完 Complete=出报告。
// 报告态=结论/缺口/下一步/备选(/api/report → rpt.* 三语渲染),与引擎契约同构。
// 跨卡复用铁律:currentStatus/目标省/职业从三问预填(答过的不重新问,预填可改);职业用三问的 nocs[0],
// 没答过 → 页内拉起 EntryQuiz(同一组件不复制)。答案存 localStorage,改答案 → 报告立刻重算。
import { useEffect, useMemo, useState } from 'react'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/survey-core.css'
import 'survey-core/i18n/simplified-chinese'
import 'survey-core/i18n/korean'

import { initialLang, makeT, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { EntryQuiz, readQuiz, shortOcc } from '../quiz/EntryQuiz'
import { UI } from '../ui/primitives'
import { PR_BASIC_SURVEY, SURVEY_THEME } from '@/lib/questions'
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

const readBands = (): Bands => {
  const q = readQuiz()
  let saved: Partial<Bands> = {}
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { /* ignore */ }
  return {
    status: saved.status || q?.status || '',
    clbBand: saved.clbBand || 0, expBand: saved.expBand || 0,
    // 目标省预填:三问选过省 → 映射到最近的档(单选 BC/ON 精确档;别的组合走「先看哪个够得着」)
    provBand: saved.provBand || (q?.provs?.length ? (q.provs.length === 1 && q.provs[0] === 'BC' ? 1 : q.provs.length === 1 && q.provs[0] === 'ON' ? 2 : 4) : 0),
  }
}

export function PlanPrView() {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { setLang(initialLang()) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])

  const [bands, setBands] = useState<Bands>({ status: '', clbBand: 0, expBand: 0, provBand: 0 })
  const [noc, setNoc] = useState('')
  const [nocTitle, setNocTitle] = useState('')
  const [quizOpen, setQuizOpen] = useState(false)
  const [view, setView] = useState<'quiz' | 'report'>('quiz')
  const [ready, setReady] = useState(false)
  const [rpt, setRpt] = useState<Rpt | null | 'loading'>(null)

  useEffect(() => {
    setBands(readBands())
    setNoc(readQuiz()?.nocs?.[0] || '')
    if (new URLSearchParams(window.location.search).get('view') === 'report') setView('report')
    setReady(true)
    track('plan-pr-open')
  }, [])
  // 职业名回显(代码不裸奔):/api/quiz?noc 与三问结果页同端点
  useEffect(() => {
    if (!noc) { setNocTitle(''); return }
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`).then((r) => r.json())
      .then((d) => setNocTitle(lang === 'zh' && d?.facts?.titleZh ? d.facts.titleZh : d?.facts?.title || noc))
      .catch(() => setNocTitle(noc))
  }, [noc, lang])

  const gotoReport = () => {
    track('plan-pr-report')
    setView('report')
    try { window.history.replaceState(null, '', '?view=report') } catch { /* ignore */ }
  }
  const gotoQuiz = () => {
    setView('quiz')
    try { window.history.replaceState(null, '', window.location.pathname) } catch { /* ignore */ }
  }

  // SurveyJS 模型:题库 JSON → Model;预填=survey.data;答案变更实时落 localStorage(改答案立刻重算的底座)。
  // ready 后才建(要先读回预填);lang 切换重建换语言,当前答案原样带回。
  const survey = useMemo(() => {
    if (!ready || view !== 'quiz') return null
    const m = new Model(PR_BASIC_SURVEY)
    m.applyTheme(SURVEY_THEME as any)
    m.locale = lang === 'zh' ? 'zh-cn' : lang === 'ko' ? 'ko' : 'en'
    const b = readBands()
    m.data = {
      ...(b.status ? { status: b.status } : {}),
      ...(b.clbBand ? { clbBand: b.clbBand } : {}),
      ...(b.expBand ? { expBand: b.expBand } : {}),
      ...(b.provBand ? { provBand: b.provBand } : {}),
    }
    // 起步落在第一道没答的题(答过的不重走,上一题仍可回去改)。
    // v2 的 questionPerPage 模式导航不走 currentPageNo,走 currentSingleQuestion(实撞:设页号被无视)
    const names = ['status', 'clbBand', 'expBand', 'provBand'] as const
    const firstUnanswered = [b.status, b.clbBand, b.expBand, b.provBand].findIndex((v) => !v)
    if (firstUnanswered > 0) {
      const target = m.getQuestionByName(names[firstUnanswered])
      if (target) m.currentSingleQuestion = target
    }
    m.onValueChanged.add((s) => {
      const d = s.data as Partial<Bands>
      const next: Bands = { status: d.status || '', clbBand: d.clbBand || 0, expBand: d.expBand || 0, provBand: d.provBand || 0 }
      setBands(next)
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
    })
    m.onComplete.add(() => gotoReport())
    return m
  }, [ready, view, lang])   // eslint-disable-line react-hooks/exhaustive-deps

  // 报告态进入即拉(改答案回来再进=重算;答案是幂等输入)
  useEffect(() => {
    if (view !== 'report' || !ready) return
    setRpt('loading')
    const b = readBands()
    const ctrl = new AbortController()
    fetch('/api/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: ctrl.signal,
      body: JSON.stringify({ goal: 'pr', answers: {
        noc: readQuiz()?.nocs?.[0] || '',
        currentStatus: b.status || undefined,
        clb: CLB[b.clbBand] || undefined,
        canadianExpMonths: b.expBand ? EXP[b.expBand] : undefined,
        targetProvinces: PROVS[b.provBand],
      } }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => setRpt(d?.report ?? null))
      .catch(() => { if (!ctrl.signal.aborted) setRpt(null) })
    return () => ctrl.abort()
  }, [view, ready])

  const answered = [bands.status, bands.clbBand, bands.expBand, bands.provBand].filter(Boolean).length
  const secH: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, margin: '16px 0 4px', color: '#111827' }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="start" />
      <main style={{ flex: '1 0 auto', width: '100%', maxWidth: 760, margin: '1rem auto 2.5rem', padding: '0 1.25rem', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 22, margin: '6px 0 4px' }}>{t('plan.pr.title')}</h1>

        {view === 'quiz' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: UI.text3, margin: '2px 0 14px' }}>
              <span>{t('plan.pr.sub')}</span><span style={{ whiteSpace: 'nowrap' }}>{t('plan.answered', { n: answered })}</span>
            </div>
            {/* 职业 chip 常驻(非四题之一):三问答过直接用,没答→页内拉起 EntryQuiz */}
            <div style={{ marginBottom: 6 }}>
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', maxWidth: '100%', fontSize: 12.5, color: UI.text2, background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 999, padding: '5px 12px' }}>
                <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{t('plan.occ')}</span>
                {noc
                  ? <b style={{ color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortOcc(nocTitle || noc)}</b>
                  : <span style={{ color: '#b45309', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('plan.occ.none')}</span>}
                <button onClick={() => setQuizOpen(true)} style={{ border: 'none', background: 'none', color: UI.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t('plan.occ.pick')}</button>
              </span>
            </div>
            {/* 框架容器贴站底色(默认奶白与页面灰打架);题库/进度/导航/多语全在框架里 */}
            <style>{`.plSurvey .sd-root-modern{background:transparent}.plSurvey .sd-body{padding-left:0 !important;padding-right:0 !important}`}</style>
            <div className="plSurvey">{survey && <Survey model={survey} />}</div>
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
