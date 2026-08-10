'use client'
// 决策页视图(判定合一批1):答题为主干,顾问只是出口(2026-08-10 Frank 拍板)。
// 渐进展开(Frank「排版太乱」整改):答题卡默认收起一行入口,不逼人考试;抽选事实表在主干之后。
// 测分工具不上页面(Frank「测分数完全不用显示」)—— 答案落档喂判定核,
// 各省分数归判定卡个人条件(付费实底,批2 接 pnpSelfScore)。
// 区块序:H1 → 答题 → [带岗]岗位三项判定 / [无岗]挑岗 → 抽选表 → 钩子。
// 判定/分数全来自确定性层,本页不算一个数。
import { useState, useEffect, useRef } from 'react'

import { streamDisplay } from '../../jobs/i18n'
import { useLang } from '../../LangProvider'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { goBackOr } from '../../BackLink'
import { quizToProfile } from '../../quiz/EntryQuiz'
import { OccPicker } from '../../quiz/OccPicker'
import { POPULAR_NOCS } from '../../account/profileOptions'
import { QuizStyle, QuizTitle, pickL, type L } from '../../quiz/QuizUI'
import { QuizForm } from '../QuizForm'
import { BANNER_IMGS, PageBanner, PageShell, UI } from '../../ui/primitives'
import { TripleVerdictPanel } from '../../jobs/TripleVerdictModal'
import { PnpScoreCard } from '../../jobs/PnpScoreCard'
import { EMPTY, clearAnswers, readAnswers, writeAnswers, type Answers } from '@/lib/answers'
import { fieldsOf, missingFields } from '@/lib/decisions'
import { FIELDS } from '@/lib/fields'
import { CASES, type CaseEntry, type L3 } from '@/lib/caseLibrary'
import { pickName } from '@/lib/occName'
import { track } from '@/lib/track'
import type { DrawRow, ScoreFactor, SelfProfile } from '@/lib/pnpSelfScore'

export type OverviewDraw = { province: string; drawDate: string; stream: string; score: number | null }
export type TvJob = {
  id: number; title: string; company: string; city: string; province: string
  noc: string; teer: number | null; pnpStream: string
}

const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '14px 16px', margin: '0 0 10px' }
const BTN: React.CSSProperties = { border: `1px solid ${UI.border}`, background: '#fff', color: UI.text, borderRadius: 8, padding: '5px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }
const H2: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 10px' }
const PRIMARY_BTN: React.CSSProperties = { background: UI.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }

export function PrDecisionView({ overview, tvJob, scoreFactors, scoreDraws }: {
  overview: OverviewDraw[]; tvJob: TvJob | null; scoreFactors: ScoreFactor[]; scoreDraws: DrawRow[]
}) {
  const [lang, setLangSaved, t] = useLang()

  // 答题态(wiring 同 PlanPrView 基本卷:职业=第 1 页,其余翻页;答案唯一来源 lib/answers)
  const [bands, setBands] = useState<Answers>(EMPTY)
  const [noc, setNoc] = useState('')
  const [occStep, setOccStep] = useState(true)
  const [ready, setReady] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [verdictNonce, setVerdictNonce] = useState(0)
  const [occTitles, setOccTitles] = useState<Record<string, string>>({})
  // 答题卡默认收起(Frank「上来有必要让人测分数吗」——不逼人考试,一行入口自愿点开);
  // 「开始评估/继续作答/改答案」展开,答完自动收回
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizPosition, setQuizPosition] = useState(1)
  const quizRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const a = readAnswers()
    setBands(a)
    setNoc(a.nocs[0] || '')
    if (new URLSearchParams(window.location.search).get('quiz') === '1') setQuizOpen(true)
    setReady(true)
    track('dp-open', { job: tvJob ? '1' : '0' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!resetArmed) return
    const id = setTimeout(() => setResetArmed(false), 8000)
    return () => clearTimeout(id)
  }, [resetArmed])

  const stepNames = fieldsOf('pr', 'basic')
  const stepTotal = stepNames.length + 1
  const stepDone = stepNames.length - missingFields(stepNames, bands).length + (noc ? 1 : 0)
  // 收起时显示资料完成度；展开修改时显示当前所在题，避免旧答案让进度一直停在 6/6。
  const shownStep = quizOpen ? quizPosition : stepDone
  // 分值卡门控:基本卷答满才渲(渐进展开 —— 落地页面只有 H1 + 答题,别一屏摊开所有机器)
  const quizComplete = ready && !!noc && missingFields(stepNames, bands).length === 0

  // 完成态直接回显六项条件。热门职业名同步取已有字典;冷门职业才按码补一次名字,
  // 不让整张摘要为了一个可选请求卡住。
  useEffect(() => {
    if (!quizComplete) return
    const codes = bands.nocs.filter((code) => !POPULAR_NOCS.some((x) => x.noc === code))
    if (!codes.length) { setOccTitles({}); return }
    let dead = false
    setOccTitles({})
    Promise.all(codes.map((code) => fetch(`/api/quiz?noc=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => [code, pickName(d?.facts, lang)] as [string, string])
      .catch(() => [code, ''] as [string, string])))
      .then((rows) => { if (!dead) setOccTitles(Object.fromEntries(rows)) })
    return () => { dead = true }
  }, [bands.nocs, lang, quizComplete])

  const choiceText = (name: string): string => {
    const value = (bands as unknown as Record<string, string | number>)[name]
    const choice = FIELDS[name]?.q.choices.find((x) => x.value === value)
    return choice ? pickL(choice.text as L, lang) : ''
  }
  const occText = bands.nocs.map((code) => {
    const popular = POPULAR_NOCS.find((x) => x.noc === code)
    return popular ? t(popular.key) : occTitles[code] || `NOC ${code}`
  }).join(lang === 'zh' ? '、' : ', ')
  const conditionSummary = [
    [t('dp.sum.occ'), occText],
    [t('dp.sum.status'), choiceText('status')],
    [t('dp.sum.clb'), choiceText('clbBand')],
    [t('dp.sum.totalExp'), choiceText('totalExpBand')],
    [t('dp.sum.canExp'), choiceText('expBand')],
    [t('dp.sum.prov'), choiceText('provBand')],
  ]

  // 带职位时按职位所在省;登录后直接进问卷、尚未选职位时,BC/ON 这种单省答案也能继续补问。
  // 草原三省/海洋四省是组合答案,没让用户选具体省前不擅自挑一个。
  const targetProvince = tvJob?.province || (bands.provs.length === 1 ? bands.provs[0] : '')
  const targetFactors = targetProvince ? scoreFactors.filter((f) => f.province === targetProvince) : []
  const targetTeer = tvJob?.teer ?? (/^\d{5}$/.test(noc) ? Number(noc[1]) : null)
  const hasSplitWork = targetFactors.some((f) => f.factor === 'work5' || f.factor === 'work610')
  const clbLower = [0, 0, 4, 6, 8, 10][bands.clbBand] ?? 0
  const totalExpLower = [0, 0, 0, 1, 3, 5][bands.totalExpBand] ?? 0
  const scoreInitial: Partial<SelfProfile> = {
    clb1: clbLower,
    // BC/MB 的 work 是总经验,可直接复用基础题;SK 按时间段拆分,必须让用户另答,不能猜最近几年。
    expRecent: hasSplitWork ? 0 : totalExpLower,
    expOlder: 0,
  }
  const hiddenScoreInputs: (keyof SelfProfile)[] = ['clb1']
  if (!hasSplitWork) hiddenScoreInputs.push('expRecent', 'expOlder')
  const scoreKey = `${tvJob?.id ?? 'profile'}:${targetProvince}:${bands.clbBand}:${bands.totalExpBand}:${targetFactors[0]?.guideEffective ?? ''}`

  // 答完基本卷:落档(登录才写,quizToProfile 内部自判;失败不拦页面)→ 收起答题卡。
  // 页面不出任何分数 —— 答案的消费方是判定核(个人条件),不是本页
  const onQuizDone = () => {
    track('dp-quiz-done')
    quizToProfile(readAnswers())
      .catch(() => { /* 匿名或网络失败:答案仍在 localStorage */ })
      .finally(() => {
        setVerdictNonce((n) => n + 1)
        const sp = new URLSearchParams(window.location.search)
        const next = sp.get('next') || ''
        if (/^\/(?!\/)/.test(next)) { window.location.assign(next); return }
        if (sp.has('quiz')) {
          sp.delete('quiz'); sp.delete('next')
          window.history.replaceState(null, '', window.location.pathname + (sp.toString() ? `?${sp}` : ''))
        }
      })
    setQuizOpen(false)
  }

  const provDisp = (code: string) => { const full = t('prov.' + code); return full === 'prov.' + code ? code : full }
  const pickL3 = (l: L3) => l[lang as keyof L3] || l.zh

  // 一键代入:案例画像写进答案(只覆盖案例明说的字段)→ 展开答题从第一道没答的题接着走
  const applyCase = (c: CaseEntry) => {
    track('dp-case', { id: c.id })
    if (!c.preset) return
    const a = writeAnswers(c.preset)
    setBands(a); setNoc(a.nocs[0] || '')
    setResetNonce((n) => n + 1)
    setOccStep(!a.nocs.length)
    setQuizOpen(true)
    setTimeout(() => quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="pathways" />
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <PageBanner module="pathways" title={t('plan.pr.title')} sub={t('dp.sub')} images={BANNER_IMGS.pathways}
            right={<button className="noPrint" onClick={() => goBackOr('/')} style={{ ...BTN, border: 'none' }}>{t('detail.back')}</button>} />
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            {/* 一级页统一用 pathways 图片 banner;正文继续保持 860px 阅读宽度。 */}

            {/* 答题卡(主干,唯一采集面;题目不进对话——顾问只答疑)。
                答完=一行摘要+改答案(整卡铺开就是「太乱」的病根之一);改答案从职业页重新走 */}
            <div ref={quizRef} style={{ ...CARD, padding: quizOpen ? '14px 20px 18px' : '14px 16px' }}>
              <QuizStyle />
              <style>{`.dpConditionSummary{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:640px){.dpConditionSummary{grid-template-columns:repeat(2,minmax(0,1fr))}.dpConditionValue{white-space:normal!important}}`}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ ...H2, margin: 0 }}>{t('dp.quiz')}</h2>
                {ready && <span style={{ borderRadius: 999, padding: '2px 8px', background: stepDone === stepTotal ? '#eff6ff' : UI.bg,
                  color: stepDone === stepTotal ? UI.primary : UI.text3, fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {t('dp.basicCount', { done: shownStep, total: stepTotal })}
                </span>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {quizOpen ? (
                    <button onClick={() => {
                      if (!resetArmed) { setResetArmed(true); return }
                      setBands(clearAnswers()); setNoc(''); setResetArmed(false); setResetNonce((n) => n + 1); setOccStep(true); setQuizPosition(1)
                      track('dp-quiz-reset')
                    }} style={{ ...BTN, ...(resetArmed ? { color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 600 } : {}) }}>
                      {t(resetArmed ? 'plan.reset.ok' : 'plan.reset')}
                    </button>
                  ) : (
                    // 一行入口:没答过=开始评估;答了一半=继续作答;答完=改答案(蓝底主按钮只给「开始」)
                    <button onClick={() => { setQuizOpen(true); setOccStep(true); setQuizPosition(1); track('dp-quiz-edit') }}
                      style={stepDone === 0
                        ? { ...BTN, background: UI.primary, color: '#fff', border: `1px solid ${UI.primary}`, fontWeight: 600 }
                        : BTN}>
                      {t(quizComplete ? 'plan.back' : stepDone > 0 ? 'dp.resume' : 'dp.start')}
                    </button>
                  )}
                </span>
              </div>
              {quizOpen && ready && (
                <div aria-label={`${shownStep}/${stepTotal}`} style={{ height: 4, borderRadius: 999, background: UI.hairline, overflow: 'hidden', margin: '11px 0 18px' }}>
                  <div style={{ width: `${Math.round((shownStep / Math.max(stepTotal, 1)) * 100)}%`, height: '100%', borderRadius: 999,
                    background: UI.primary, transition: 'width .2s' }} />
                </div>
              )}
              {!quizOpen && quizComplete && (
                <div className="dpConditionSummary" style={{ display: 'grid', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${UI.hairline}` }}>
                  {conditionSummary.map(([label, value]) => (
                    <div key={label} style={{ minWidth: 0, background: UI.bg, border: `1px solid ${UI.hairline}`, borderRadius: 9, padding: '8px 10px' }}>
                      <div style={{ color: UI.text3, fontSize: 11.5, lineHeight: 1.35, marginBottom: 2 }}>{label}</div>
                      <div className="dpConditionValue" title={value} style={{ color: UI.text, fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
              {quizOpen && (<>
                {!ready ? null : (occStep || !noc) ? (
                  <div className="plQuizPad" style={{ maxWidth: 600, margin: '0 auto' }}>
                    <QuizTitle>{t('quiz.q2')}</QuizTitle>
                    <div style={{ fontSize: 12.5, color: UI.text3, margin: '-10px 0 13px', lineHeight: 1.55 }}>{t('quiz.q2sub')}</div>
                    <OccPicker inline t={t} lang={lang} initial={bands.nocs} doneLabel={t('plan.next')}
                      onChange={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || '') }}
                      onDone={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || ''); setOccStep(false); setQuizPosition(2) }} />
                  </div>
                ) : (
                  <div className="plQuizPad" style={{ maxWidth: 600, margin: '0 auto' }}>
                    <QuizForm key={resetNonce} decision="pr" stage="basic" lang={lang} t={t} answers={bands} doneKey="dp.toScore" onBack={() => { setOccStep(true); setQuizPosition(1) }}
                      onStepChange={(index) => setQuizPosition(index + 2)}
                      onPatch={(patch) => setBands(writeAnswers(patch))} onComplete={onQuizDone} />
                  </div>
                )}
              </>)}
            </div>

            {/* 带岗进入后,三项判定就是本页结果,不再自动套一层弹窗。条件在上、结果在下,修改后原地重算。 */}
            {tvJob && <TripleVerdictPanel job={tvJob} lang={lang} profileComplete={quizComplete} refreshKey={verdictNonce}
              onBuildProfile={() => {
                setQuizOpen(true); setOccStep(true); track('tv-build-profile')
                setTimeout(() => quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
              }} />}

            {/* 只在基础条件完成后追问目标省缺少的计分项。语言/总经验复用上方答案,不让用户重复填。 */}
            {quizComplete && targetFactors.length > 0 && (
              <div style={CARD}>
                <PnpScoreCard key={scoreKey} t={t} lang={lang}
                  ctx={{ noc: tvJob?.noc || noc, teer: targetTeer, province: targetProvince, city: tvJob?.city || '' }}
                  factors={targetFactors} draws={scoreDraws}
                  streams={tvJob?.pnpStream ? { [targetProvince]: tvJob.pnpStream } : {}}
                  initial={scoreInitial} hiddenProfileInputs={hiddenScoreInputs} targetMode />
              </div>
            )}
            {tvJob && quizComplete && targetFactors.length === 0 && (
              <div style={CARD}>
                <h2 style={H2}>{t('ps.extraTitle')}</h2>
                <div style={{ fontSize: 13, color: UI.text2, lineHeight: 1.65 }}>{t('ps.notReady', { prov: provDisp(tvJob.province) })}</div>
              </div>
            )}

            {/* 无岗:三项判定去职位板带岗回来(判定要具体的岗和雇主,页上没有) */}
            {!tvJob && (
              <div style={CARD}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{t('tv.head')}</div>
                <div style={{ fontSize: 13, color: UI.text2, marginBottom: 10 }}>{t('dp.needJob')}</div>
                <a href={noc ? `/jobs?q=${encodeURIComponent(noc)}` : '/jobs'} onClick={() => track('dp-pick-job')}
                  style={{ display: 'inline-block', background: UI.primary, color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  {t('dp.pickJob')}
                </a>
              </div>
            )}
            {/* 常见处境(08-10 Frank「直接使用我那 16 个 case」):案例库 C01-C16 一键代入 ——
                点开=用户原话问题 + 两个动作:按画像代入答题(只填案例明说的字段)/ 带原话问顾问。
                画像与问题不是结论;结论仍由判定核按用户自己的答案算。原生 <details>,SSR 可爬。 */}
            <div style={CARD}>
              <h2 style={H2}>{t('dp.cases')}</h2>
              {CASES.map((c) => (
                <details key={c.id} style={{ borderTop: `1px solid ${UI.hairline}` }}>
                  <summary style={{ padding: '9px 0', fontSize: 13.5, fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                    {pickL3(c.label)}
                  </summary>
                  <div style={{ padding: '0 0 12px' }}>
                    <div style={{ fontSize: 13, color: UI.text2, lineHeight: 1.7, marginBottom: 8 }}>「{pickL3(c.q)}」</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {c.preset && (
                        <button onClick={() => applyCase(c)} style={PRIMARY_BTN}>{t('dp.caseApply')}</button>
                      )}
                      <button onClick={() => {
                        track('dp-case-ask', { id: c.id })
                        window.dispatchEvent(new CustomEvent('o2p:chat-open', { detail: { prefill: pickL3(c.q) } }))
                      }} style={BTN}>{t('dp.hookAdvisor')}</button>
                    </div>
                  </div>
                </details>
              ))}
            </div>

            {/* SSR 事实区:各省最近一轮抽选(纯事实;爬虫不看顺序,人看时它只是参考,放主干之后) */}
            {overview.length > 0 && (
              <div style={CARD}>
                <h2 style={H2}>{t('dp.draws')}</h2>
                {/* 手机=卡片式(08-10 Frank),桌面=表格;CSS 二选一渲染,SSR 两份都在 DOM */}
                <style>{`@media(max-width:640px){.dpDrawTbl{display:none}}@media(min-width:641px){.dpDrawCards{display:none}}`}</style>
                <div className="dpDrawCards">
                  {overview.map((r) => (
                    <div key={r.province} style={{ borderTop: `1px solid ${UI.hairline}`, padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <b style={{ fontSize: 13.5, color: '#111827' }}>{provDisp(r.province)}</b>
                        <span style={{ color: UI.text3, fontSize: 11.5 }}>{r.province}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.score ?? '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: UI.text2, marginTop: 2 }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{r.drawDate}</span>
                        <span title={streamDisplay(t, r.stream)} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamDisplay(t, r.stream)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <table className="dpDrawTbl" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: UI.text3, fontSize: 12, textAlign: 'left' }}>
                      <th style={{ fontWeight: 400, padding: '0 8px 6px 0', width: '27%' }}>{t('dp.prov')}</th>
                      <th style={{ fontWeight: 400, padding: '0 8px 6px 0', width: '27%' }}>{t('rpt.s.d.date')}</th>
                      <th style={{ fontWeight: 400, padding: '0 8px 6px 0', width: '30%' }}>{t('rpt.s.d.stream')}</th>
                      <th style={{ fontWeight: 400, padding: '0 0 6px', width: '16%' }}>{t('rpt.s.d.score')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.map((r) => (
                      <tr key={r.province} style={{ borderTop: `1px solid ${UI.hairline}` }}>
                        {/* 省名可截断,灰码永不截(flex:名字弹性省略,码 flexShrink 0)—— 375 下长省名靠码认省 */}
                        <td style={{ padding: '7px 8px 7px 0' }} title={provDisp(r.province)}>
                          <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provDisp(r.province)}</span>
                            <span style={{ color: UI.text3, fontSize: 11.5, flexShrink: 0 }}>{r.province}</span>
                          </span>
                        </td>
                        <td style={{ padding: '7px 6px 7px 0', fontVariantNumeric: 'tabular-nums', color: UI.text2, whiteSpace: 'nowrap', fontSize: 12.5 }}>{r.drawDate}</td>
                        <td title={streamDisplay(t, r.stream)} style={{ padding: '7px 8px 7px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: UI.text2 }}>
                          {streamDisplay(t, r.stream)}
                        </td>
                        <td style={{ padding: '7px 0', fontVariantNumeric: 'tabular-nums' }}>{r.score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 出口钩子:看在招岗(q 搜索列含 NOC 码)/ 问顾问(唤起全站挂件,顾问只答疑) */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* 蓝底白字与页内主按钮一致(08-10 Frank 截图点名) */}
              <a href={noc ? `/jobs?q=${encodeURIComponent(noc)}` : '/jobs'} onClick={() => track('dp-hook-jobs')}
                style={{ ...PRIMARY_BTN, textDecoration: 'none', display: 'inline-block' }}>{t('dp.hookJobs')}</a>
              <button onClick={() => {
                track('dp-ask-chat')
                window.dispatchEvent(new CustomEvent('o2p:chat-open', { detail: { prefill: t('dp.ask') } }))
              }} style={PRIMARY_BTN}>{t('dp.hookAdvisor')}</button>
            </div>
          </div>
        </PageShell>
      </div>
      <SiteFooter t={t} />
    </div>
  )
}
