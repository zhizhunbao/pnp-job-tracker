'use client'
// 决策页视图(判定合一批1):答题为主干,顾问只是出口(2026-08-10 Frank 拍板)。
// 渐进展开(Frank「排版太乱」整改):答题卡默认收起一行入口,不逼人考试;抽选事实表在主干之后。
// 测分工具不上页面(Frank「测分数完全不用显示」)—— 答案落档喂判定核,
// 各省分数归判定卡个人关(付费实底,批2 接 pnpSelfScore)。
// 区块序:H1 →(带岗:岗位+三关入口)→ 答题入口 → [无岗]挑岗 → 抽选表 → 钩子。
// 判定/分数全来自确定性层,本页不算一个数。
import { useState, useEffect } from 'react'

import { streamDisplay } from '../../jobs/i18n'
import { useLang } from '../../LangProvider'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { goBackOr } from '../../BackLink'
import { quizToProfile } from '../../quiz/EntryQuiz'
import { OccPicker } from '../../quiz/OccPicker'
import { QuizProgress, QuizStyle, QuizTitle } from '../../quiz/QuizUI'
import { QuizForm } from '../QuizForm'
import { PageShell, UI } from '../../ui/primitives'
import { TripleVerdictModal, TvEntryCard } from '../../jobs/TripleVerdictModal'
import { EMPTY, clearAnswers, readAnswers, writeAnswers, type Answers } from '@/lib/answers'
import { fieldsOf, missingFields } from '@/lib/decisions'
import { PATHWAY_RECIPES } from '@/lib/pathwayRecipes'
import { track } from '@/lib/track'

export type OverviewDraw = { province: string; drawDate: string; stream: string; score: number | null }
export type TvJob = { id: number; title: string; company: string; city: string; province: string }

const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '14px 16px', margin: '0 0 10px' }
const BTN: React.CSSProperties = { border: `1px solid ${UI.border}`, background: '#fff', color: UI.text, borderRadius: 8, padding: '5px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }
const H2: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 10px' }
const PRIMARY_BTN: React.CSSProperties = { background: UI.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }

export function PrDecisionView({ overview, tvJob }: { overview: OverviewDraw[]; tvJob: TvJob | null }) {
  const [lang, setLangSaved, t] = useLang()

  // 答题态(wiring 同 PlanPrView 基本卷:职业=第 1 页,其余翻页;答案唯一来源 lib/answers)
  const [bands, setBands] = useState<Answers>(EMPTY)
  const [noc, setNoc] = useState('')
  const [occStep, setOccStep] = useState(true)
  const [ready, setReady] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [tvOpen, setTvOpen] = useState(false)
  // 答题卡默认收起(Frank「上来有必要让人测分数吗」——不逼人考试,一行入口自愿点开);
  // 「开始评估/继续作答/改答案」展开,答完自动收回
  const [quizOpen, setQuizOpen] = useState(false)

  useEffect(() => {
    const a = readAnswers()
    setBands(a)
    setNoc(a.nocs[0] || '')
    setReady(true)
    track('dp-open', { job: tvJob ? '1' : '0' })
    // 带岗进来三关直接开(设计 §3.3);track 键沿用 tv-entry,kind=dp 与职位侧四入口区分
    if (tvJob) { setTvOpen(true); track('tv-entry', { kind: 'dp' }) }
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
  // 分值卡门控:基本卷答满才渲(渐进展开 —— 落地页面只有 H1 + 答题,别一屏摊开所有机器)
  const quizComplete = ready && !!noc && missingFields(stepNames, bands).length === 0

  // 答完基本卷:落档(登录才写,quizToProfile 内部自判;失败不拦页面)→ 收起答题卡。
  // 页面不出任何分数 —— 答案的消费方是判定核(个人关),不是本页
  const onQuizDone = () => {
    track('dp-quiz-done')
    quizToProfile(readAnswers()).catch(() => { /* 匿名或网络失败:答案仍在 localStorage */ })
    setQuizOpen(false)
  }

  const provDisp = (code: string) => { const full = t('prov.' + code); return full === 'prov.' + code ? code : full }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="pathways" />
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ fontSize: 12, color: UI.text2, marginBottom: 8, lineHeight: 1.7 }}>
              <a href="/start" style={{ color: UI.primary, textDecoration: 'none' }}>{t('home.entry')}</a>
              {' › '}{t('plan.pr.title')}
            </div>

            {/* H1 卡(骨架照职位详情页:白卡 + 右上返回) */}
            <div style={{ ...CARD, position: 'relative' }}>
              <div className="noPrint" style={{ position: 'absolute', top: 12, right: 12 }}>
                <button onClick={() => goBackOr('/')} style={BTN}>{t('detail.back')}</button>
              </div>
              <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.35, color: '#111827', paddingRight: 90 }}>{t('plan.pr.title')}</h1>
              <div style={{ fontSize: 13, color: UI.text2, marginTop: 4 }}>{t('dp.sub')}</div>
            </div>

            {/* 带岗进来:岗位上下文+三关入口放最上(它就是来意);弹框已自动开,这里是关掉后的重开入口 */}
            {tvJob && (
              <div style={CARD}>
                <div style={{ fontSize: 13.5, color: UI.text2, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <b style={{ color: '#111827' }}>{tvJob.title}</b>
                  <span style={{ marginLeft: 8 }}>{tvJob.company}</span>
                  <span style={{ marginLeft: 8 }}>{tvJob.city ? `${tvJob.city}, ` : ''}{provDisp(tvJob.province)}</span>
                </div>
                <TvEntryCard t={t} onOpen={() => { track('tv-entry', { kind: 'dp-reopen' }); setTvOpen(true) }} />
              </div>
            )}

            {/* 答题卡(主干,唯一采集面;题目不进对话——顾问只答疑)。
                答完=一行摘要+改答案(整卡铺开就是「太乱」的病根之一);改答案从职业页重新走 */}
            <div style={{ ...CARD, padding: quizOpen ? '14px 20px 18px' : '14px 16px' }}>
              <QuizStyle />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...(quizOpen ? { paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${UI.hairline}` } : {}) }}>
                <h2 style={{ ...H2, margin: 0 }}>{t('dp.quiz')}</h2>
                {!quizOpen && stepDone > 0 && <span style={{ fontSize: 12.5, color: UI.text3, fontVariantNumeric: 'tabular-nums' }}>{stepDone}/{stepTotal}</span>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {quizOpen ? (
                    <button onClick={() => {
                      if (!resetArmed) { setResetArmed(true); return }
                      setBands(clearAnswers()); setNoc(''); setResetArmed(false); setResetNonce((n) => n + 1); setOccStep(true)
                      track('dp-quiz-reset')
                    }} style={{ ...BTN, ...(resetArmed ? { color: '#b91c1c', borderColor: '#fecaca', fontWeight: 600 } : {}) }}>
                      {t(resetArmed ? 'plan.reset.ok' : 'plan.reset')}
                    </button>
                  ) : (
                    // 一行入口:没答过=开始评估;答了一半=继续作答;答完=改答案(蓝底主按钮只给「开始」)
                    <button onClick={() => { setQuizOpen(true); setOccStep(true); track('dp-quiz-edit') }}
                      style={stepDone === 0
                        ? { ...BTN, background: UI.primary, color: '#fff', borderColor: UI.primary, fontWeight: 600 }
                        : BTN}>
                      {t(quizComplete ? 'plan.back' : stepDone > 0 ? 'dp.resume' : 'dp.start')}
                    </button>
                  )}
                </span>
              </div>
              {quizOpen && (<>
                {ready && <div style={{ maxWidth: 600, margin: '0 auto' }}><QuizProgress lang={lang} done={stepDone} total={stepTotal} /></div>}
                {!ready ? null : (occStep || !noc) ? (
                  <div className="plQuizPad" style={{ maxWidth: 600, margin: '0 auto' }}>
                    <QuizTitle>{t('quiz.q2')}</QuizTitle>
                    <OccPicker inline t={t} lang={lang} initial={bands.nocs} doneLabel={t('plan.next')}
                      onChange={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || '') }}
                      onDone={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || ''); setOccStep(false) }} />
                  </div>
                ) : (
                  <div className="plQuizPad" style={{ maxWidth: 600, margin: '0 auto' }}>
                    <QuizForm key={resetNonce} decision="pr" stage="basic" lang={lang} t={t} answers={bands} doneKey="dp.toScore" onBack={() => setOccStep(true)}
                      onPatch={(patch) => setBands(writeAnswers(patch))} onComplete={onQuizDone} />
                  </div>
                )}
              </>)}
            </div>

            {/* 无岗:三关判定去职位板带岗回来(判定要具体的岗和雇主,页上没有) */}
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
            {tvOpen && tvJob && <TripleVerdictModal job={tvJob} lang={lang} onClose={() => setTvOpen(false)} />}

            {/* 移民路径配方(批2:/pathways 301 并入,evalPathways 退役后配方作静态信息卡)。
                原生 <details>:SSR 全量在 DOM(爬虫可见),人看默认收成一行一条 —— 渐进展开同页规矩。
                措辞红线沿用:摆步骤与出处,不下结论;政策数值不写死,指官方页。 */}
            <div style={CARD}>
              <h2 style={H2}>{t('pw.title')}</h2>
              {PATHWAY_RECIPES.map((r) => (
                <details key={r.id} style={{ borderTop: `1px solid ${UI.hairline}` }}>
                  <summary style={{ padding: '9px 0', fontSize: 13.5, fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                    {t(`pw.${r.id}.name`)}
                  </summary>
                  <div style={{ padding: '0 0 10px' }}>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                      {r.steps.map((s) => (
                        <li key={s.key} style={{ fontSize: 13, color: UI.text2, lineHeight: 1.7 }}>{t(s.key)}</li>
                      ))}
                    </ol>
                    <div style={{ fontSize: 11.5, color: UI.text3, marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      <span>{t('pw.sources')}:</span>
                      {r.sources.map((s) => <span key={s.url}>{s.label}</span>)}
                      <span>{t('pw.reviewed', { d: r.lastReviewed })}</span>
                    </div>
                  </div>
                </details>
              ))}
            </div>

            {/* SSR 事实区:各省最近一轮抽选(纯事实;爬虫不看顺序,人看时它只是参考,放主干之后) */}
            {overview.length > 0 && (
              <div style={CARD}>
                <h2 style={H2}>{t('dp.draws')}</h2>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 13 }}>
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
