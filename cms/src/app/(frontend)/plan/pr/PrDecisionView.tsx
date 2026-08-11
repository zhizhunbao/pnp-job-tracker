'use client'
// 决策页视图(判定合一批1):答题为主干,顾问只是出口(2026-08-10 Frank 拍板)。
// 渐进展开(Frank「排版太乱」整改):答题卡默认收起一行入口,不逼人考试;抽选事实表在主干之后。
// 测分工具不上页面(Frank「测分数完全不用显示」)—— 答案落档喂判定核,
// 各省分数归判定卡个人条件(付费实底,批2 接 pnpSelfScore)。
// 区块序:H1 → 答题 → [带岗]岗位三项判定 / [无岗]挑岗 → 抽选表 → 钩子。
// 判定/分数全来自确定性层,本页不算一个数。
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'

import { streamDisplay } from '../../jobs/i18n'
import { useLang } from '../../LangProvider'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { quizToProfile } from '../../quiz/EntryQuiz'
import { OccPicker } from '../../quiz/OccPicker'
import { ProvincePicker } from '../../quiz/ProvincePicker'
import { POPULAR_NOCS } from '../../account/profileOptions'
import { QuizStyle, QuizTitle, pickL, type L } from '../../quiz/QuizUI'
import { QuizForm } from '../QuizForm'
import { BANNER_IMGS, PageBanner, PageShell, UI } from '../../ui/primitives'
import { TripleVerdictPanel } from '../../jobs/TripleVerdictModal'
import { PnpScoreCard } from '../../jobs/PnpScoreCard'
import { EMPTY, clearAnswers, readAnswers, toEngineAnswers, writeAnswers, type Answers } from '@/lib/answers'
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

type ProfilePath = {
  key: string
  province: string
  verdict: 'open' | 'needs-info'
  tier: 0 | 1 | 2 | 3 | null
  availability: string
  /** 被攒时间补不了的门槛卡住(语言差档 / 自雇不计经验)—— 排在能走的后面,标签也另写 */
  blockedBy?: 'language' | 'selfEmployed' | null
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
  const [provinceStep, setProvinceStep] = useState(false)
  const [scoreStep, setScoreStep] = useState(false)
  const [scoreProgress, setScoreProgress] = useState({ done: 0, total: 0 })
  const [formAtEnd, setFormAtEnd] = useState(false)
  const [ready, setReady] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [verdictNonce, setVerdictNonce] = useState(0)
  const [occTitles, setOccTitles] = useState<Record<string, string>>({})
  const [profilePaths, setProfilePaths] = useState<ProfilePath[] | null>(null)
  // 答题卡默认收起(Frank「上来有必要让人测分数吗」——不逼人考试,一行入口自愿点开);
  // 「开始评估/继续作答/改答案」展开,答完自动收回
  const [quizOpen, setQuizOpen] = useState(false)
  const quizRef = useRef<HTMLDivElement | null>(null)
  const hasShownQuizStep = useRef(false)

  useEffect(() => {
    const a = readAnswers()
    setBands(a)
    setNoc(a.nocs[0] || '')
    const baseFields = fieldsOf('pr', 'basic')
    const baseComplete = missingFields(baseFields, a).length === 0
    const complete = a.nocs.length > 0 && baseComplete && a.provs.length > 0
    // 空白或未完成的问卷默认直接展开；只有完整资料才收成摘要。已有职业时续答缺失题,
    // 不把用户无意义地送回第一题。?quiz=1 仍可强制展开完整资料的编辑态。
    setQuizOpen(!complete || new URLSearchParams(window.location.search).get('quiz') === '1')
    setOccStep(a.nocs.length === 0)
    setProvinceStep(a.nocs.length > 0 && baseComplete && a.provs.length === 0)
    setReady(true)
    track('dp-open', { job: tvJob ? '1' : '0' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stepNames = fieldsOf('pr', 'basic')
  const stepTotal = stepNames.length + 2
  const stepDone = stepNames.length - missingFields(stepNames, bands).length + (noc ? 1 : 0) + (bands.provs.length ? 1 : 0)
  // 计数**分两段**,不合成一条(08-10 Frank 拍板):第一段是「关于你」的 6 项,答完就够出方案;
  // 第二段是各省官方分值表的条件,自愿进入。合成一条的话,点完省份那一刻总数会从 6 跳到 22 ——
  // 说好 6 题的问卷突然变 22 题,人就走了。段内总数恒定,全程一个数都不跳。
  // 数的还是**答过几项**,不是翻到第几页(先前用页码:一进第 1 题就写「已答 1/6」,其实一题没答)。
  const scoring = quizOpen && scoreStep
  const shownStep = scoring ? scoreProgress.done : stepDone
  const shownTotal = scoring ? scoreProgress.total : stepTotal
  const scoreLeft = scoreProgress.total - scoreProgress.done
  // 从长的职业页翻到短题时,页面可能还停在职业页的下半段 —— 把题区顶回视口。
  useLayoutEffect(() => {
    if (!quizOpen) { hasShownQuizStep.current = false; return }
    const pad = quizRef.current?.querySelector<HTMLElement>('.plQuizPad')
    if (!pad) return
    // 首次展开保持页面原本位置；只有用户主动翻题时才统一对齐，避免一进页面就自动跳过 banner。
    // 题区已经整个在视口里就**别再滚**(08-10 Frank「不要闪烁」):每翻一题再 scrollIntoView 一次
    // 只会把页面又拽一下,看着就是闪。
    const box = pad.getBoundingClientRect()
    if (hasShownQuizStep.current && (box.top < 0 || box.bottom > window.innerHeight)) {
      pad.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
    hasShownQuizStep.current = true
  }, [quizOpen, shownStep, occStep, provinceStep, scoreStep])
  // 分值卡门控:基本卷答满才渲(渐进展开 —— 落地页面只有 H1 + 答题,别一屏摊开所有机器)
  const quizComplete = ready && !!noc && bands.provs.length > 0 && missingFields(stepNames, bands).length === 0

  // 基础问卷本身就足够做“人 → 通道”的初筛，不应强迫用户先找一份具体岗位。
  // 岗位与雇主只在第二层三项判定里使用。输入键用于修改答案后原地重算。
  const pathInputKey = JSON.stringify([
    bands.nocs, bands.status, bands.clbBand, bands.totalExpBand, bands.expBand, bands.provs,
  ])
  useEffect(() => {
    if (!quizComplete) { setProfilePaths(null); return }
    const ctrl = new AbortController()
    setProfilePaths(null)
    fetch('/api/profile-pathways', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ answers: toEngineAnswers(bands) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!ctrl.signal.aborted) setProfilePaths(Array.isArray(d?.rows) ? d.rows : []) })
      .catch(() => { if (!ctrl.signal.aborted) setProfilePaths([]) })
    return () => ctrl.abort()
    // pathInputKey 是刻意收窄的重算边界；bands 对象每次写答案都会换引用，不能直接作为依赖。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizComplete, pathInputKey])

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
    [t('dp.sum.prov'), bands.provs.map((code) => t('prov.' + code)).join(lang === 'zh' ? '、' : ', ')],
  ]

  // 用户在问卷里直接多选具体省份。共用条件交给一张 PnpScoreCard 只问一次，省独有条件按所选省追加。
  const factorProvinces = Array.from(new Set(scoreFactors.map((f) => f.province).filter(Boolean)))
  const selectedProvinces = tvJob?.province ? [tvJob.province] : bands.provs
  const scoredProvinces = selectedProvinces.filter((province) => factorProvinces.includes(province))
  const unscoredProvinces = selectedProvinces.filter((province) => !factorProvinces.includes(province))
  const targetFactors = scoreFactors.filter((f) => scoredProvinces.includes(f.province))
  const scoreContextProvince = tvJob?.province || scoredProvinces[0] || selectedProvinces[0] || ''
  const targetTeer = tvJob?.teer ?? (/^\d{5}$/.test(noc) ? Number(noc[1]) : null)
  const hasSplitWork = targetFactors.some((f) => f.factor === 'work5' || f.factor === 'work610')
  // 基础卷问的是**区间**(CLB 6-7、1-3 年),官方分值表按精确值分档 —— 所以精确题只在这个区间里出选项,
  // 区间里只剩一个值(「还没考」「CLB 10 以上」「5 年以上」)就整题不问:同一件事不问第二遍。
  const CLB_RANGE = [[], [0], [4, 5], [6, 7], [8, 9], [10]]
  const TOTAL_EXP_RANGE = [[], [0], [0], [1, 2, 3], [3, 4, 5], [5]]
  const clbRange = CLB_RANGE[bands.clbBand] ?? []
  const totalRange = TOTAL_EXP_RANGE[bands.totalExpBand] ?? []
  const clbLower = clbRange[0] ?? 0
  const totalExpLower = totalRange[0] ?? 0
  // SK 把经验拆成「近 5 年 / 6-10 年」,总经验推不出分段,只能让用户自己答 —— 但仍受总经验封顶。
  const splitCap = totalRange.length ? [0, 1, 2, 3, 4, 5].filter((n) => n <= totalRange[totalRange.length - 1]) : []
  const scoreLimits = {
    clb1: clbRange.length ? clbRange : undefined,
    expRecent: (hasSplitWork ? splitCap : totalRange).length ? (hasSplitWork ? splitCap : totalRange) : undefined,
    expOlder: hasSplitWork && splitCap.length ? splitCap : undefined,
  }
  const scoreInitial: Partial<SelfProfile> = {
    clb1: clbLower,
    // BC/MB 的 work 是总经验,可直接复用基础题;SK 按时间段拆分,必须让用户另答,不能猜最近几年。
    expRecent: hasSplitWork ? 0 : totalExpLower,
    expOlder: 0,
  }
  // 只有不拆“近 5 年/6-10 年”的表才隐藏第二段经验，并把第一格当总经验使用。
  const hiddenScoreInputs: (keyof SelfProfile)[] = hasSplitWork ? [] : ['expOlder']
  const scoreKey = `${tvJob?.id ?? 'profile'}:${scoredProvinces.join(',')}:${bands.clbBand}:${bands.totalExpBand}:${targetFactors.map((f) => f.guideEffective).join(',')}`

  // 答完基本卷:落档(登录才写,quizToProfile 内部自判;失败不拦页面)→ 收起答题卡。
  // 页面不出任何分数 —— 答案的消费方是判定核(个人条件),不是本页
  const onQuizDone = useCallback(() => {
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
    setScoreStep(false)
    setQuizOpen(false)
  }, [])

  const onScoreProgress = useCallback((progress: { done: number; total: number }) => setScoreProgress(progress), [])

  const onScoreComplete = useCallback(() => {
    track('dp-score-done')
    setScoreStep(false)
    onQuizDone()
  }, [onQuizDone])

  // 估分是自愿的第二段:第一屏往回退 = 退出估分回到方案页(答过的题留着,再点入口能接着答)
  const onScoreBack = useCallback(() => {
    setScoreStep(false)
    setQuizOpen(false)
  }, [])

  const openScoreStep = useCallback(() => {
    track('dp-score-start')
    setOccStep(false); setProvinceStep(false); setFormAtEnd(false)
    setScoreStep(true); setQuizOpen(true)
  }, [])

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
    setProvinceStep(false); setScoreStep(false); setFormAtEnd(false)
    setQuizOpen(true)
    setTimeout(() => quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="pathways" />
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <div style={{ width: '100%' }}>
            {/* PR 评估是顶栏一级页:banner 与全部卡片统一使用 PageShell 1320px 页面轨,不放历史返回按钮。 */}
            <PageBanner module="pathways" title={t('plan.pr.title')} sub={t('dp.sub')} images={BANNER_IMGS.pathways} />

            {/* 答题卡(主干,唯一采集面;题目不进对话——顾问只答疑)。
                答完=一行摘要+改答案(整卡铺开就是「太乱」的病根之一);改答案从职业页重新走 */}
            <div ref={quizRef} style={{ ...CARD, padding: quizOpen ? '14px 20px 18px' : '14px 16px' }}>
              <QuizStyle />
              <style>{`.dpConditionSummary{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:640px){.dpConditionSummary{grid-template-columns:repeat(2,minmax(0,1fr))}.dpConditionValue{white-space:normal!important}}`}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ ...H2, margin: 0 }}>{t('dp.quiz')}</h2>
                {ready && <span style={{ borderRadius: 999, padding: '2px 8px', background: shownStep === shownTotal ? '#eff6ff' : UI.bg,
                  color: shownStep === shownTotal ? UI.primary : UI.text3, fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {t(scoring ? 'dp.scoreCount' : 'dp.basicCount', { done: shownStep, total: shownTotal })}
                </span>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {quizOpen ? (
                    <button onClick={() => {
                      setBands(clearAnswers()); setNoc(''); setResetNonce((n) => n + 1); setOccStep(true); setProvinceStep(false); setScoreStep(false); setScoreProgress({ done: 0, total: 0 }); setFormAtEnd(false)
                      track('dp-quiz-reset')
                    }} style={BTN}>
                      {t('plan.reset')}
                    </button>
                  ) : (
                    // 一行入口:没答过=开始评估;答了一半=继续作答;答完=改答案(蓝底主按钮只给「开始」)
                    <button onClick={() => { setQuizOpen(true); setOccStep(true); setProvinceStep(false); setScoreStep(false); setFormAtEnd(false); track('dp-quiz-edit') }}
                      style={stepDone === 0
                        ? { ...BTN, background: UI.primary, color: '#fff', border: `1px solid ${UI.primary}`, fontWeight: 600 }
                        : BTN}>
                      {t(quizComplete ? 'plan.back' : stepDone > 0 ? 'dp.resume' : 'dp.start')}
                    </button>
                  )}
                </span>
              </div>
              {quizOpen && ready && (
                <div aria-label={`${shownStep}/${shownTotal}`} style={{ height: 4, borderRadius: 999, background: UI.hairline, overflow: 'hidden', margin: '11px 0 18px' }}>
                  <div style={{ width: `${Math.round((shownStep / Math.max(shownTotal, 1)) * 100)}%`, height: '100%', borderRadius: 999,
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
              {quizOpen && !scoreStep && (<>
                {!ready ? null : (occStep || !noc) ? (
                  <div className="plQuizPad">
                    <QuizTitle>{t('quiz.q2')}</QuizTitle>
                    <div style={{ fontSize: 12.5, color: UI.text3, margin: '-10px 0 13px', lineHeight: 1.55 }}>{t('quiz.q2sub')}</div>
                    <OccPicker key={resetNonce} inline t={t} lang={lang} initial={bands.nocs} doneLabel={t('plan.next')}
                      onChange={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || '') }}
                      onDone={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || ''); setOccStep(false); setProvinceStep(false); setFormAtEnd(false) }} />
                  </div>
                ) : provinceStep ? (
                  <div className="plQuizPad">
                    {/* 省份是基础卷最后一题:答完立刻收卷出方案。各省估分是自愿的第二段,
                        由方案上的入口进入 —— 不把 16 道官方表的题横在结论前面 */}
                    <ProvincePicker key={`${resetNonce}:provinces`} t={t} initial={bands.provs}
                      onChange={(provs) => setBands(writeAnswers({ provs }))}
                      onBack={() => { setProvinceStep(false); setFormAtEnd(true) }}
                      onDone={(provs) => { setBands(writeAnswers({ provs })); onQuizDone() }} />
                  </div>
                ) : (
                  <div className="plQuizPad">
                    <QuizForm key={`${resetNonce}:${formAtEnd ? 'end' : 'auto'}`} decision="pr" stage="basic" lang={lang} t={t} answers={bands} doneKey="plan.next" startAtEnd={formAtEnd}
                      onBack={() => { setOccStep(true); setFormAtEnd(false) }}
                      onPatch={(patch) => setBands(writeAnswers(patch))}
                      onComplete={() => { setProvinceStep(true); setFormAtEnd(false) }} />
                  </div>
                )}
              </>)}

              {/* 选完省份后继续在同一问卷里回答官方分值表需要的条件。组件始终挂载在同一位置：
                  答完收起时保留刚才的答案并原地显示各省结果，避免第二套“补充条件”流程。
                  display 只在收起时写 none:写死 block 会盖掉 .qzFill 的 flex,动作条就落不到题区底了。 */}
              {quizComplete && targetFactors.length > 0 && (
                <div className={quizOpen && scoreStep ? 'plQuizPad' : undefined}
                  style={{ display: quizOpen && !scoreStep ? 'none' : undefined, margin: quizOpen ? 0 : '14px 0 0' }}>
                  <PnpScoreCard key={scoreKey} t={t} lang={lang}
                    ctx={{ noc: tvJob?.noc || noc, teer: targetTeer, province: scoreContextProvince, city: tvJob?.city || '' }}
                    factors={targetFactors} draws={scoreDraws}
                    streams={tvJob && tvJob.pnpStream ? { [scoreContextProvince]: tvJob.pnpStream } : {}}
                    initial={scoreInitial} hiddenProfileInputs={hiddenScoreInputs} limits={scoreLimits} targetMode
                    questionnaireActive={quizOpen && scoreStep}
                    onQuestionnaireProgress={onScoreProgress}
                    onQuestionnaireComplete={onScoreComplete}
                    onQuestionnaireBack={onScoreBack} />
                </div>
              )}

              {/* 各省估分 = 自愿的第二段。题数写在入口上(点之前就看得见成本),不是点完才蹦出来。
                  答过一半再退出的,入口写的是**剩下几题**,接着答不用重来。 */}
              {quizComplete && !quizOpen && scoreLeft > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${UI.hairline}` }}>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', color: '#111827', fontSize: 13.5, fontWeight: 700, lineHeight: 1.45 }}>{t('dp.scoreEntry')}</span>
                    <span style={{ display: 'block', color: UI.text3, fontSize: 12, lineHeight: 1.45 }}>{t('dp.scoreEntryHint', { n: scoreLeft })}</span>
                  </span>
                  <button onClick={openScoreStep} style={PRIMARY_BTN}>{t('dp.scoreStart')}</button>
                </div>
              )}
            </div>

            {/* 问卷完成即给个人路径方案。它回答“先走哪条路”；具体岗位验证是后续可选动作。 */}
            {quizComplete && !quizOpen && (
              <div style={{ ...CARD, padding: '16px' }}>
                <h2 style={{ ...H2, marginBottom: 4 }}>{t('dp.planTitle')}</h2>
                <div style={{ fontSize: 13, color: UI.text2, lineHeight: 1.65, marginBottom: 12 }}>{t('dp.planHint')}</div>
                {profilePaths === null ? (
                  <div style={{ height: 58, borderRadius: 9, background: UI.bg }} />
                ) : profilePaths.length > 0 ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {profilePaths.slice(0, 3).map((row, index) => {
                      const routeName = t(`jpw.p.${row.key}`)
                      const province = row.key === 'AIP'
                        ? t('dp.atlantic')
                        : row.key === 'RCIP'
                          ? t('dp.ruralCommunities')
                          : row.province === 'FED' ? t('dp.federal') : provDisp(row.province)
                      const stateKey = row.availability !== 'ok'
                        ? 'dp.planDataGap'
                        : row.blockedBy
                          ? `dp.planBlocked.${row.blockedBy}`
                          : row.verdict === 'needs-info'
                            ? 'dp.planNeedInfo'
                            : `dp.planTier${row.tier ?? 0}`
                      return (
                        <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${UI.hairline}`, borderRadius: 10, background: index === 0 && !row.blockedBy ? '#f8fbff' : '#fff' }}>
                          <span style={{ width: 24, height: 24, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0, background: index === 0 && !row.blockedBy ? UI.primary : UI.bg, color: index === 0 && !row.blockedBy ? '#fff' : UI.text2, fontSize: 12, fontWeight: 700 }}>{index + 1}</span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ display: 'block', color: '#111827', fontSize: 13.5, fontWeight: 700, lineHeight: 1.45 }}>{routeName}</span>
                            <span style={{ display: 'block', color: UI.text3, fontSize: 12, lineHeight: 1.45 }}>{province}</span>
                          </span>
                          <span style={{ color: row.verdict === 'open' && row.availability === 'ok' && !row.blockedBy ? UI.ok : '#92400e', background: row.verdict === 'open' && row.availability === 'ok' && !row.blockedBy ? '#ecfdf5' : '#fffbeb', borderRadius: 999, padding: '4px 9px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{t(stateKey)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: UI.text2, lineHeight: 1.65 }}>{t('dp.planEmpty')}</div>
                )}
                {profilePaths && profilePaths.length > 0 && (
                  <button onClick={() => {
                    track('dp-plan-ask')
                    window.dispatchEvent(new CustomEvent('o2p:chat-open', { detail: { prefill: t('dp.planAsk') } }))
                  }} style={{ ...PRIMARY_BTN, marginTop: 12 }}>{t('dp.planAskCta')}</button>
                )}
              </div>
            )}

            {/* 带岗进入后,三项判定就是本页结果,不再自动套一层弹窗。条件在上、结果在下,修改后原地重算。
                **必须等 ready**:quizOpen 初值是 false,不等读完 localStorage 就渲染的话,新用户首帧先看到
                这块判定面板、水合后又被答题卡顶掉 —— 闪一下不说,还白打一次 tv-open + 一次
                /api/triple-verdict 请求,把「有多少人真看了判定」这个数顶虚(2026-08-11 umami session 实录)。 */}
            {ready && tvJob && !quizOpen && <TripleVerdictPanel job={tvJob} lang={lang} profileComplete={quizComplete} refreshKey={verdictNonce}
              onBuildProfile={() => {
                setQuizOpen(true); setOccStep(true); setProvinceStep(false); setScoreStep(false); setFormAtEnd(false); track('tv-build-profile')
                setTimeout(() => quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
              }} />}

            {quizComplete && !quizOpen && unscoredProvinces.length > 0 && (
              <div style={CARD}>
                <h2 style={H2}>{t('ps.unscoredTitle')}</h2>
                <div style={{ fontSize: 13, color: UI.text2, lineHeight: 1.65 }}>{t('ps.unscoredHint', { provs: unscoredProvinces.map(provDisp).join(lang === 'zh' ? '、' : ', ') })}</div>
              </div>
            )}

            {/* 具体岗位判定是方案后的可选验证，不再作为问卷结果的前置门槛。 */}
            {quizComplete && !quizOpen && !tvJob && (
              <div style={CARD}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{t('dp.verifyJobTitle')}</div>
                <div style={{ fontSize: 13, color: UI.text2, marginBottom: 10 }}>{t('dp.verifyJobHint')}</div>
                <a href={noc ? `/jobs?q=${encodeURIComponent(noc)}` : '/jobs'} onClick={() => track('dp-pick-job')}
                  style={{ display: 'inline-block', background: UI.primary, color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  {t('dp.verifyJob')}
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
