'use client'
// 卡②「拿 PR」两态页(L2-01/L2-02:答题与看报告是两个界面,互跳靠一个按钮)。
// 答题态=SurveyJS(2026-07-31 Frank「用框架吧」):题库=lib/questions.ts 纯 JSON 配置,一屏一题/
// 进度条/上一题下一题/多语全由框架出;点选自动进下一题,答完 Complete=出报告。
// 报告态=结论/缺口/下一步/备选(/api/report → rpt.* 三语渲染),与引擎契约同构。
// 跨卡复用铁律:currentStatus/目标省/职业从三问预填(答过的不重新问,预填可改);职业用三问的 nocs[0],
// 没答过 → 页内拉起 EntryQuiz(同一组件不复制)。答案存 localStorage,改答案 → 报告立刻重算。
import { useEffect, useMemo, useState } from 'react'
import { Model, surveyLocalization } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/survey-core.css'
import 'survey-core/i18n/simplified-chinese'
import 'survey-core/i18n/korean'

import { initialLang, makeT, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { EntryQuiz, readQuiz, shortOcc } from '../quiz/EntryQuiz'
import { Button, Notice, PageShell, Tag, UI } from '../ui/primitives'
import { PR_BASIC_SURVEY, PR_EXPLORE_SURVEY, SURVEY_THEME } from '@/lib/questions'
import { track } from '@/lib/track'

// 框架中文进度条误译修正:questionsProgressText 原文是 "Answered {0}/{1} questions",
// zh-cn 包译成「第 {0}/{1} 题」—— 第一题时显示「第 0/4 题」,读起来像页码且是错的。
// 改回「已答」语义(页内不再另写一份计数,进度只此一处)。
surveyLocalization.locales['zh-cn'].questionsProgressText = '已答 {0}/{1} 题'

const KEY = 'plan_pr_v1'
type Bands = { status: string; clbBand: number; expBand: number; provBand: number; crsBand: number; pgwpBand: number }
const CLB = [0, 5, 7, 9, 0]            // 档→CLB(a4 还没考=null 走 0 哨兵)
const EXP = [0, 0, 6, 18, 30]          // 档→月数(a1 没有=0 个月,是答案不是缺答)
const PROVS: string[][] = [[], ['BC'], ['ON'], ['AB', 'SK', 'MB'], []]   // a4 先看哪个够得着=不限省
const CRS = [0, 0, 380, 425, 480]      // 探索题:档→CRS(a1 没算过=不传,引擎照旧出「没填 CRS」)
const PGWP = [0, 4, 9, 18, 30]         // 探索题:档→签证剩余月数(解锁时间窗结论)

type RptLine = { key: string; params: Record<string, string | number>; verdict?: string; source?: { label: string; url: string; fetched: string }; url?: string }
type Lane = { kind: 'prov' | 'ee' | 'alts'; verdict?: string; key: string; params: Record<string, string | number> }
type Rpt = {
  noc: string; title: string; conclusions: RptLine[]; gaps: RptLine[]; nextSteps: RptLine[]; alternatives: RptLine[]
  confidence: 'low' | 'mid' | 'high'; asOf: string
  lanes: Lane[]; hint?: RptLine; locked: string[]; pro: boolean   // 付费闸(服务端已裁剪,locked 只有类别键没有正文)
}

const V_DOT: Record<string, string> = { pass: UI.ok, warn: '#b45309', fail: '#b91c1c', na: '#9ca3af' }
const V_CHIP: Record<string, { bg: string; fg: string }> = {
  pass: { bg: '#dcfce7', fg: '#166534' }, warn: { bg: '#fef3c7', fg: '#92400e' },
  fail: { bg: '#fee2e2', fg: '#991b1b' }, na: { bg: '#f3f4f6', fg: '#6b7280' },
}
const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '12px 16px', margin: '10px 0' }

// 尾链一律右对齐成一列(2026-07-31 Frank「不要在文字后面直接加链接,乱得很」):
// 句子长短不一 → 紧跟文末的链接横向位置全是随机的;抽到右轨后是一条竖直的链列,与全站表格对齐口径一致。
const TAIL: React.CSSProperties = { flexShrink: 0, marginLeft: 12, fontSize: 12, color: UI.text3, textDecoration: 'none', whiteSpace: 'nowrap' }

// 职业 chip:答题态常驻;报告态**没职业时**也出(空报告说「先选职业」却没有入口=死路,2026-07-31 实拍抓到)
function OccChip({ noc, nocTitle, t, onPick }: { noc: string; nocTitle: string; t: TFn; onPick: () => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', maxWidth: '100%', fontSize: 12.5, color: UI.text2, background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 999, padding: '5px 12px' }}>
      <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{t('plan.occ')}</span>
      {noc
        ? <b style={{ color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortOcc(nocTitle || noc)}</b>
        : <span style={{ color: '#b45309', whiteSpace: 'nowrap' }}>{t('plan.occ.none')}</span>}
      <button onClick={onPick} style={{ border: 'none', background: 'none', color: UI.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t('plan.occ.pick')}</button>
    </span>
  )
}

function Line({ l, t }: { l: RptLine; t: TFn }) {
  const body = t(l.key, l.params)
  return (
    <li style={{ margin: '7px 0', lineHeight: 1.7, listStyle: 'none', display: 'flex', gap: 9, alignItems: 'baseline' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: V_DOT[l.verdict ?? 'na'], position: 'relative', top: -1 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        {l.url ? <a href={l.url} style={{ color: UI.primary, textDecoration: 'none' }}>{body}</a> : body}
      </span>
      {l.source?.url && (
        <a href={l.source.url} target="_blank" rel="noreferrer" title={`${l.source.label}${l.source.fetched ? ` · ${l.source.fetched}` : ''}`}
          style={TAIL}>{t('rpt.src')} ↗</a>
      )}
    </li>
  )
}

// ① hero:大数字取自首条结论的真数(命中具名 named/open;不公布清单的省只有 open),
// 取不出数就退成纯文本行 —— 不发明合成分(65/100 式移民可行度总分是伪权威)。
function Hero({ r, t }: { r: Rpt; t: TFn }) {
  const c = r.conclusions[0]
  const big = c?.key === 'rpt.c.listedHit' ? { n: c.params.named, of: c.params.open, cap: t('rpt.hero.hit', { prov: c.params.prov }) }
    : c?.key === 'rpt.c.screenPass' ? { n: c.params.open, of: null, cap: t('rpt.hero.open', { prov: c.params.prov }) }
    : null
  if (!big && !r.hint && !c) return null
  return (
    <div className="rptHero" style={{ background: 'linear-gradient(180deg,#eff6ff,#e0edff)', border: '1px solid #dbeafe', borderRadius: 12, padding: '16px 18px', margin: '10px 0' }}>
      <div style={{ flexShrink: 0 }}>
        {big ? (
          <>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: UI.primary, letterSpacing: -1 }}>{big.n}</span>
              {big.of != null && <span style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>/{big.of}</span>}
            </div>
            <div style={{ fontSize: 12.5, color: '#3b82f6', marginTop: 5 }}>{big.cap}</div>
          </>
        ) : c ? (
          <div style={{ fontSize: 15, fontWeight: 600, color: UI.primaryDeep, lineHeight: 1.6 }}>{t(c.key, c.params)}</div>
        ) : null}
      </div>
      {r.hint && (
        <div style={{ fontSize: 14.5, fontWeight: 700, color: UI.primaryDeep, lineHeight: 1.6 }}>
          {t(r.hint.key, r.hint.params)}
          {r.hint.source?.url && (
            <a href={r.hint.source.url} target="_blank" rel="noreferrer" title={r.hint.source.label}
              style={{ marginLeft: 6, color: UI.primary, textDecoration: 'none', fontWeight: 600 }}>↗</a>
          )}
        </div>
      )}
    </div>
  )
}

// ② 三卡(Resume Worded 范式:维度名 + 判定词 + 状态章)。判定词是事实,免费;数字在锁区。
function Lanes({ lanes, t }: { lanes: Lane[]; t: TFn }) {
  const NAME: Record<string, string> = { prov: 'rpt.lane.t.prov', ee: 'rpt.lane.t.ee', alts: 'rpt.lane.t.alts' }
  return (
    <div className="rptLanes">
      {lanes.map((l) => {
        const chip = V_CHIP[l.verdict ?? 'na']
        return (
          <div key={l.kind} style={{ ...CARD, margin: 0, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: UI.text2 }}>{t(NAME[l.kind], l.params)}</div>
            <div style={{ fontSize: 17, fontWeight: 700, margin: '6px 0 7px', color: V_DOT[l.verdict ?? 'na'] }}>{t(l.key, l.params)}</div>
            <span style={{ background: chip.bg, color: chip.fg, borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 }}>{t(l.key + '.b')}</span>
          </div>
        )
      })}
    </div>
  )
}

const readBands = (): Bands => {
  const q = readQuiz()
  let saved: Partial<Bands> = {}
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { /* ignore */ }
  return {
    status: saved.status || q?.status || '',
    clbBand: saved.clbBand || 0, expBand: saved.expBand || 0,
    crsBand: saved.crsBand || 0, pgwpBand: saved.pgwpBand || 0,
    // 目标省预填:三问选过省 → 映射到最近的档(单选 BC/ON 精确档;别的组合走「先看哪个够得着」)
    provBand: saved.provBand || (q?.provs?.length ? (q.provs.length === 1 && q.provs[0] === 'BC' ? 1 : q.provs.length === 1 && q.provs[0] === 'ON' ? 2 : 4) : 0),
  }
}

export function PlanPrView() {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { setLang(initialLang()) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])

  const [bands, setBands] = useState<Bands>({ status: '', clbBand: 0, expBand: 0, provBand: 0, crsBand: 0, pgwpBand: 0 })
  const [noc, setNoc] = useState('')
  const [nocTitle, setNocTitle] = useState('')
  const [quizOpen, setQuizOpen] = useState(false)
  const [view, setView] = useState<'quiz' | 'report'>('quiz')
  const [stage, setStage] = useState<'basic' | 'explore'>('basic')   // 探索卷=报告 hook 的落点(基本 4 题满才进得来)
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
  const gotoQuiz = (to: 'basic' | 'explore' = 'basic') => {
    setStage(to)
    setView('quiz')
    try { window.history.replaceState(null, '', window.location.pathname) } catch { /* ignore */ }
  }

  // SurveyJS 模型:题库 JSON → Model;预填=survey.data;答案变更实时落 localStorage(改答案立刻重算的底座)。
  // ready 后才建(要先读回预填);lang / stage 切换重建(换语言或换卷),当前答案原样带回。
  const survey = useMemo(() => {
    if (!ready || view !== 'quiz') return null
    const explore = stage === 'explore'
    const m = new Model(explore ? PR_EXPLORE_SURVEY : PR_BASIC_SURVEY)
    m.applyTheme(SURVEY_THEME as any)
    m.locale = lang === 'zh' ? 'zh-cn' : lang === 'ko' ? 'ko' : 'en'
    const b = readBands()
    const names = explore ? (['crsBand', 'pgwpBand'] as const) : (['status', 'clbBand', 'expBand', 'provBand'] as const)
    m.data = Object.fromEntries(names.map((n) => [n, b[n]]).filter(([, v]) => v))
    // 起步落在第一道没答的题(答过的不重走,上一题仍可回去改)。
    // v2 的 questionPerPage 模式导航不走 currentPageNo,走 currentSingleQuestion(实撞:设页号被无视)
    const firstUnanswered = names.map((n) => b[n]).findIndex((v) => !v)
    if (firstUnanswered > 0) {
      const target = m.getQuestionByName(names[firstUnanswered])
      if (target) m.currentSingleQuestion = target
    }
    // 只合并本卷答到的字段(两卷共用一个 KEY,整体覆盖会把另一卷的答案抹掉)
    m.onValueChanged.add((s) => {
      const d = s.data as Partial<Bands>
      setBands((prev) => {
        const next = { ...prev, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v)) } as Bands
        try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
        return next
      })
    })
    m.onComplete.add(() => gotoReport())
    return m
  }, [ready, view, stage, lang])   // eslint-disable-line react-hooks/exhaustive-deps

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
        crs: CRS[b.crsBand] || undefined,
        // 境外没有加拿大签证,「还剩多久」对他无意义 —— 不拿档位硬造时间窗
        pgwpMonthsLeft: b.status === 'overseas' ? undefined : PGWP[b.pgwpBand] || undefined,
      } }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => setRpt(d?.report ?? null))
      .catch(() => { if (!ctrl.signal.aborted) setRpt(null) })
    return () => ctrl.abort()
  }, [view, ready])

  const secH: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, margin: '16px 0 4px', color: '#111827' }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="start" />
      {/* 外轨=PageShell 1320(全站统一容器铁律,2026-07-18 拍板「新页面按这个宽度套壳」——
          本页初版自造 760 main 违规,2026-07-31 Frank 点名纠正);答题/报告列 760 居中保行长可读(news 阅读页先例) */}
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, margin: '6px 0 4px' }}>{t('plan.pr.title')}</h1>

        {view === 'quiz' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: UI.text3, margin: '2px 0 14px' }}>
              <span>{t(stage === 'explore' ? 'plan.explore.sub' : 'plan.pr.sub')}</span>
              {stage === 'explore' && (
                <button onClick={() => setStage('basic')} style={{ border: 'none', background: 'none', color: UI.primary, fontSize: 12, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t('plan.explore.basic')}</button>
              )}
            </div>
            {/* 职业 chip 常驻(非四题之一):三问答过直接用,没答→页内拉起 EntryQuiz */}
            <div style={{ marginBottom: 6 }}><OccChip noc={noc} nocTitle={nocTitle} t={t} onPick={() => setQuizOpen(true)} /></div>
            {/* 框架容器贴站底色(默认奶白与页面灰打架);题库/进度/导航/多语全在框架里 */}
            <style>{`.plSurvey .sd-root-modern{background:transparent}.plSurvey .sd-body{padding-left:0 !important;padding-right:0 !important}`}</style>
            <div className="plSurvey">{survey && <Survey model={survey} />}</div>
          </>
        ) : (
          <>
            {/* v2c 五段:① hero 大数字 ② 三卡判定 ③ 结论/缺口 ④ 编号下一步 ⑤ 锁区+CTA+hook */}
            <style>{`.rptHero{display:flex;flex-direction:column;gap:10px}
.rptLanes{display:grid;gap:10px;grid-template-columns:repeat(3,1fr)}
@media(max-width:640px){.rptHero{gap:8px}.rptLanes{grid-template-columns:repeat(2,1fr)}.rptLanes>:first-child{grid-column:1/-1}}
@media(min-width:641px){.rptHero{flex-direction:row;align-items:center;gap:30px}}`}</style>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '2px 0 10px' }}>
              {/* 人话名优先(nocTitle 走 /api/quiz 出中文名),代码作灰字小注 */}
              {rpt && rpt !== 'loading' && (rpt.noc
                ? <span style={{ fontSize: 15, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortOcc(nocTitle || rpt.title)}<span style={{ color: UI.text3, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{rpt.noc}</span></span>
                : <OccChip noc="" nocTitle="" t={t} onPick={() => setQuizOpen(true)} />)}
              <button onClick={() => gotoQuiz()} style={{ marginLeft: 'auto', border: `1px solid ${UI.border}`, background: '#fff', color: UI.text, borderRadius: 8, padding: '5px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>{t('plan.back')}</button>
            </div>
            {rpt === 'loading' || rpt === null ? (
              <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, minHeight: 220 }} />
            ) : (
              <>
                <Hero r={rpt} t={t} />
                {rpt.lanes.length > 0 && <Lanes lanes={rpt.lanes} t={t} />}

                {/* ③ 结论(免费两条)+ 缺口;分隔线代替小标题(卡片自解释,不写废话) */}
                {(rpt.conclusions.length > 0 || rpt.gaps.length > 0) && (
                  <div style={CARD}>
                    <ul style={{ margin: 0, padding: 0 }}>{rpt.conclusions.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</ul>
                    {rpt.conclusions.length > 0 && rpt.gaps.length > 0 && <div style={{ borderTop: `1px solid ${UI.hairline}`, margin: '8px 0' }} />}
                    <ul style={{ margin: 0, padding: 0 }}>{rpt.gaps.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</ul>
                  </div>
                )}

                {/* ④ 下一步:编号 1/2/3 + 尾链 */}
                {rpt.nextSteps.length > 0 && (
                  <div style={CARD}>
                    {rpt.nextSteps.map((s, i) => (
                      <div key={s.key + i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', margin: '7px 0', lineHeight: 1.7 }}>
                        <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: '#eff6ff', color: UI.primary, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>{t(s.key, s.params)}</span>
                        {s.url && (
                          <a href={s.url} target={s.url.startsWith('http') ? '_blank' : undefined} rel={s.url.startsWith('http') ? 'noreferrer' : undefined}
                            style={TAIL}>{t(s.key + '.go')} ↗</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pro:备选省完整对照(免费端服务端已清空) */}
                {rpt.alternatives.length > 0 && (
                  <div style={CARD}>
                    <div style={secH}>{t('rpt.sec.a')}</div>
                    <ul style={{ margin: 0, padding: 0 }}>{rpt.alternatives.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</ul>
                  </div>
                )}

                {/* ⑤ 锁区:只有类别标题(正文服务端就没下发)+ CTA(价格归 /pricing 不硬编)+ 答题 hook */}
                {rpt.locked.length > 0 && (
                  <div style={CARD}>
                    {rpt.locked.map((k) => (
                      <div key={k} style={{ display: 'flex', gap: 9, alignItems: 'center', margin: '9px 0' }}>
                        <span style={{ flexShrink: 0 }}>🔒</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: UI.text, minWidth: 0 }}>{t('rpt.lock.' + k)}</span>
                        <span style={{ marginLeft: 'auto' }}><Tag variant="pro">{t('rpt.pro')}</Tag></span>
                      </div>
                    ))}
                  </div>
                )}
                {/* CTA 只在真锁住了东西时才出(2026-07-31 实拍抓到:没选职业的空报告什么都算不出,
                    却照样挂「完整报告 + 30 天全站 Pro」—— 那是卖不存在的东西,红线) */}
                {!rpt.pro && rpt.locked.length > 0 && (
                  <Notice kind="warn" lead={t('rpt.cta.t')} style={{ margin: '10px 0' }}
                    action={<span onClick={() => track('plan-pr-cta')}><Button kind="pro" href="/pricing">{t('rpt.cta.btn')}</Button></span>}>
                    <span style={{ display: 'block', fontSize: 12 }}>{t('rpt.cta.s')}</span>
                  </Notice>
                )}
                {/* 同理:没职业时探索两题也改不了任何结论,不劝答 */}
                {!rpt.pro && rpt.noc && (!bands.crsBand || !bands.pgwpBand) && (
                  <div style={{ textAlign: 'center', fontSize: 12.5, color: UI.text2, margin: '10px 0 0' }}>
                    {t('rpt.hook')}
                    <button onClick={() => gotoQuiz('explore')} style={{ marginLeft: 8, border: 'none', background: 'none', color: UI.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>{t('rpt.hook.go')} →</button>
                  </div>
                )}
                {/* 数据诚实脚注:置信度与数据日期(v2c 头部只留职业,这两项挪到脚注不丢) */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.5, color: UI.text3, margin: '12px 0 0' }}>
                  <span>{t('rpt.conf')}:{t('rpt.conf.' + rpt.confidence)}</span>
                  {rpt.asOf && <span>{t('rpt.asOf', { d: rpt.asOf })}</span>}
                </div>
              </>
            )}
          </>
        )}
          </div>
        </PageShell>
      </div>
      <SiteFooter t={t} />
      {quizOpen && (
        <EntryQuiz t={t} lang={lang} initial={(() => { const q = readQuiz(); return q ? { status: q.status, nocs: q.nocs, provs: q.provs } : null })()}
          onClose={() => { setQuizOpen(false); const q = readQuiz(); setNoc(q?.nocs?.[0] || '') }}
          onApply={() => { const q = readQuiz(); setNoc(q?.nocs?.[0] || ''); setQuizOpen(false) }}
          onRegister={() => { window.location.href = '/?signup=1' }} />
      )}
    </div>
  )
}
