'use client'
// 决策页视图(判定合一批1):答题为主干,顾问只是出口(2026-08-10 Frank 拍板)。
// 渐进展开(Frank「排版太乱」整改):答题卡默认收起一行入口,不逼人考试;抽选事实表在主干之后。
// 测分工具不上页面(Frank「测分数完全不用显示」)—— 答案落档喂判定核,
// 各省分数归判定卡个人条件(付费实底,批2 接 pnpSelfScore)。
// 区块序:H1 → 答题 → [带岗]岗位三项判定 / [无岗]挑岗 → 抽选表 → 钩子。
// 判定/分数全来自确定性层,本页不算一个数。
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'

import { dropProvPrefix, streamDisplay } from '../../jobs/i18n'
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
import { DataTable } from '../../ui/DataTable'
import { TripleVerdictPanel } from '../../jobs/TripleVerdictModal'
import { PnpScoreCard } from '../../jobs/PnpScoreCard'
import { Modal } from '../../jobs/Modal'
import { EMPTY, clearAnswers, readAnswers, toEngineAnswers, writeAnswers, type Answers } from '@/lib/answers'
import { fieldsOf, missingFields } from '@/lib/decisions'
import { FIELDS } from '@/lib/fields'
import { CASES, type L3 } from '@/lib/caseLibrary'
import { pickName } from '@/lib/occName'
import { track } from '@/lib/track'
import type { DrawRow, ScoreFactor, SelfProfile } from '@/lib/pnpSelfScore'

/** 形状与 `lib/scoreTables.ts` 的同名类型对齐(那边是产出方,这里是消费方) */
export type OverviewDraw = { province: string; drawDate: string; stream: string; score: number | null; invitations: number | null }
export type TvJob = {
  id: number; title: string; company: string; city: string; province: string
  noc: string; teer: number | null; pnpStream: string
}

/** /api/score-factors 的响应:官方分值表按省过滤后的行 + 本站有表的省清单 */
type ScoreTables = { factorProvinces: string[]; factors: ScoreFactor[]; draws: DrawRow[] }

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
const COUNT_PILL: React.CSSProperties = { borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }

// 冷门职业名按码补全的结果缓存,键 = `${lang}:${noc}`。**必须挂在模块级**:写在组件体内的话每次渲染
// 重建一个空对象,既缓存不到东西,又会让「拿不到名字」的码永远进不了已办清单 —— 配上以 occTitles 为
// 依赖的 effect 就是死循环(名字查不到 → setState 造新对象 → 依赖变 → 再查),浏览器持续轰 /api/quiz。
const NOC_TITLE_CACHE: Record<string, string> = {}
// 已经问过的码(不论问到没问到)。失败不重试:同一个码问一次拿不到名字,再问十次也一样。
const NOC_TITLE_TRIED = new Set<string>()

export function PrDecisionView({ overview, tvJob }: { overview: OverviewDraw[]; tvJob: TvJob | null }) {
  const [lang, setLangSaved, t] = useLang()

  // 答题态(wiring 同 PlanPrView 基本卷:职业=第 1 页,其余翻页;答案唯一来源 lib/answers)
  const [bands, setBands] = useState<Answers>(EMPTY)
  const [noc, setNoc] = useState('')
  const [occStep, setOccStep] = useState(true)
  const [provinceStep, setProvinceStep] = useState(false)
  const [scoreStep, setScoreStep] = useState(false)
  // null = 分值卡还没报过题数(它挂载后第一个 effect 才报)。不能用 {0,0} 兜底:那和「一道题都没有」
  // 长得一样,入口卡会在第一帧闪一下空白再冒出来。
  const [scoreProgress, setScoreProgress] = useState<{ done: number; total: number } | null>(null)
  const [formAtEnd, setFormAtEnd] = useState(false)
  const [ready, setReady] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [verdictNonce, setVerdictNonce] = useState(0)
  const [occTitles, setOccTitles] = useState<Record<string, string>>({})
  const [profilePaths, setProfilePaths] = useState<ProfilePath[] | null>(null)
  // 官方分值表 + 抽选记录:不再随页面下发(192 行 ≈ 88KB 塞给每个访客),答完题按所选省现取。
  // null = 还没取到,此时既不出估分区也不敢说「这些省本站没有表」——那两句都得等表到手才算数。
  const [scoreTables, setScoreTables] = useState<ScoreTables | null>(null)
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
    // 改为弹窗形态后默认收起弹窗,避免刚进页面就强插弹窗遮罩。只有 URL 带 ?quiz=1 时才自动唤起弹窗。
    setQuizOpen(new URLSearchParams(window.location.search).get('quiz') === '1')
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
  // 弹窗只装基础卷,估分整段留在方案下面那个 section(它自带计数与进度条)——
  // 所以弹窗上的计数从此只报基础卷,一个数都不会跳。
  const shownStep = stepDone
  const shownTotal = stepTotal
  const scoreDone = scoreProgress?.done ?? 0
  const scoreTotal = scoreProgress?.total ?? 0
  const scoreLeft = scoreTotal - scoreDone
  // 入口行:题数报上来了、还没答完、且不在答题态。分值卡在这三种态之外自己什么都不渲
  // (PnpScoreCard 的 showResults:targetMode 下没答完就整块不出),所以两者不会打架。
  const showScoreEntry = !!scoreProgress && !scoreStep && scoreLeft > 0
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
    // scoreStep 不再进依赖:估分题已经不在弹窗里了,quizRef 那时是 null,滚也滚不到
  }, [quizOpen, shownStep, occStep, provinceStep])
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

  // 常用职业名同步取已有字典;冷门职业按码异步补全中文/英文名称,结果进模块级缓存。
  // 「问过没问过」记在 NOC_TITLE_TRIED,不看 occTitles —— 查不到名字的码不会写进 occTitles,
  // 拿它当判据的话这个码每轮都还在待办里,而 setOccTitles 又每次造新对象,就转不出来了。
  useEffect(() => {
    const missingCodes = bands.nocs.filter((code) =>
      !POPULAR_NOCS.some((x) => x.noc === code) && !NOC_TITLE_TRIED.has(`${lang}:${code}`))
    if (!missingCodes.length) return
    missingCodes.forEach((code) => NOC_TITLE_TRIED.add(`${lang}:${code}`))
    let dead = false
    Promise.all(missingCodes.map((code) => fetch(`/api/quiz?noc=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => {
        const name = pickName(d?.facts, lang)
        if (name) NOC_TITLE_CACHE[`${lang}:${code}`] = name
        return [`${lang}:${code}`, name] as [string, string]
      })
      .catch(() => [`${lang}:${code}`, ''] as [string, string])))
      .then((rows) => {
        if (dead) return
        const fresh = Object.fromEntries(rows.filter(([, v]) => !!v))
        if (Object.keys(fresh).length) setOccTitles((m) => ({ ...m, ...fresh }))
      })
    return () => { dead = true }
  }, [bands.nocs, lang])

  const choiceText = (name: string): string => {
    const value = (bands as unknown as Record<string, string | number>)[name]
    const choice = FIELDS[name]?.q.choices.find((x) => x.value === value)
    return choice ? pickL(choice.text as L, lang) : ''
  }
  const occText = bands.nocs.map((code) => {
    const popular = POPULAR_NOCS.find((x) => x.noc === code)
    if (popular) return t(popular.key)
    // 名字还没到手(或这个码压根查不到名字)时退回码本身:用户明明选过职业,这一格不能写「待填写」
    return occTitles[`${lang}:${code}`] || NOC_TITLE_CACHE[`${lang}:${code}`] || `NOC ${code}`
  }).filter(Boolean).join(lang === 'zh' ? '、' : ', ')
  const unparsed = lang === 'zh' ? '待填写' : 'Not completed'
  const conditionSummary: [string, string, boolean][] = [
    [t('dp.sum.occ'), occText || unparsed, !!occText],
    [t('dp.sum.status'), choiceText('status') || unparsed, !!choiceText('status')],
    [t('dp.sum.clb'), choiceText('clbBand') || unparsed, !!choiceText('clbBand')],
    [t('dp.sum.totalExp'), choiceText('totalExpBand') || unparsed, !!choiceText('totalExpBand')],
    [t('dp.sum.canExp'), choiceText('expBand') || unparsed, !!choiceText('expBand')],
    [t('dp.sum.prov'), bands.provs.length ? bands.provs.map((code) => t('prov.' + code)).join(lang === 'zh' ? '、' : ', ') : unparsed, bands.provs.length > 0],
    // 2026-08-12 加的两题也要回显 —— 卡头写着「已答 6/8」而下面只摆 6 格,数和格子对不上
    [t('dp.sum.offer'), choiceText('offerBand') || unparsed, !!choiceText('offerBand')],
    [t('dp.sum.canadaEdu'), choiceText('canadaEduBand') || unparsed, !!choiceText('canadaEduBand')],
  ]

  // 用户在问卷里直接多选具体省份。共用条件交给一张 PnpScoreCard 只问一次，省独有条件按所选省追加。
  const selectedProvinces = tvJob?.province ? [tvJob.province] : bands.provs
  const factorProvinces = scoreTables?.factorProvinces ?? []
  const scoredProvinces = selectedProvinces.filter((province) => factorProvinces.includes(province))
  const unscoredProvinces = selectedProvinces.filter((province) => !factorProvinces.includes(province))
  const scoreFactors = scoreTables?.factors ?? []
  const scoreDraws = scoreTables?.draws ?? []
  const targetFactors = scoreFactors.filter((f) => scoredProvinces.includes(f.province))
  const scoreContextProvince = tvJob?.province || scoredProvinces[0] || selectedProvinces[0] || ''
  // 分值表按所选省懒取:答完题(或带岗进来)才发这一次请求,没答的人一个字节都不用背。
  // 服务端 getScoreTables 有 10 分钟单件缓存,这里不做客户端缓存 —— 一次页面生命周期最多问一次。
  const provKey = selectedProvinces.join(',')
  useEffect(() => {
    if (!provKey || (!quizComplete && !tvJob)) { setScoreTables(null); return }
    const ctrl = new AbortController()
    fetch(`/api/score-factors?provs=${encodeURIComponent(provKey)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ctrl.signal.aborted) return
        // 拿不到就当「本站没有表」落地:估分区不出,不编分数(与表空时的既定口径一致)
        setScoreTables(d && Array.isArray(d.factors)
          ? { factorProvinces: d.factorProvinces ?? [], factors: d.factors, draws: d.draws ?? [] }
          : { factorProvinces: [], factors: [], draws: [] })
      })
      .catch(() => { if (!ctrl.signal.aborted) setScoreTables({ factorProvinces: [], factors: [], draws: [] }) })
    return () => ctrl.abort()
  }, [provKey, quizComplete, tvJob])
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

  // 估分答完:就地收题显示各省结果。不再连带 onQuizDone —— 那是基础卷的收卷动作
  //(落档 + 跳 next),估分是自愿的第二段,答完不该把人踢走。
  const onScoreComplete = useCallback(() => {
    track('dp-score-done')
    setScoreStep(false)
  }, [])

  // 估分是自愿的第二段:第一屏往回退 = 退出估分回到入口行(答过的题留着,再点入口能接着答 ——
  // 分值卡从头到尾只有这一个实例,不卸载,所以答案还在)
  const onScoreBack = useCallback(() => setScoreStep(false), [])

  const openScoreStep = useCallback(() => {
    track('dp-score-start')
    setScoreStep(true)
  }, [])

  const provDisp = (code: string) => { const full = t('prov.' + code); return full === 'prov.' + code ? code : full }
  const pickL3 = (l: L3) => l[lang as keyof L3] || l.zh

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="pathways" />
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <div style={{ width: '100%' }}>
            {/* PR 评估是顶栏一级页:banner 与全部卡片统一使用 PageShell 1320px 页面轨,不放历史返回按钮。 */}
            <PageBanner module="pathways" title={t('plan.pr.title')} sub={t('dp.sub')} images={BANNER_IMGS.pathways} />

            {/* 我的评估条件摘要卡片 */}
            <div style={CARD}>
              <QuizStyle />
              <style>{`.dpConditionSummary{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:640px){.dpConditionSummary{grid-template-columns:repeat(2,minmax(0,1fr))}.dpConditionValue{white-space:normal!important}}`}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {/* 标题永不折行(英文态 375 上「Your details」被计数胶囊挤成两行);
                      真放不下时让胶囊换行,标题保持一行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h2 style={{ ...H2, margin: 0, whiteSpace: 'nowrap' }}>{t('dp.quiz')}</h2>
                    {ready && (
                      <span style={{ ...COUNT_PILL, background: shownStep === shownTotal ? '#eff6ff' : UI.bg,
                        color: shownStep === shownTotal ? UI.primary : UI.text3 }}>
                        {t('dp.basicCount', { done: shownStep, total: shownTotal })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: UI.text3, marginTop: 4, lineHeight: 1.4 }}>
                    {lang === 'zh' ? '包含目标职业、身份、语言、工作经验及目标省份' : 'Covers occupation, status, CLB, experience & provinces'}
                  </div>
                </div>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
                  {/* 「继续作答」= 落在**第一道没答的题**,不把人送回第一页(2026-08-12 Frank 实拍:
                      加了两题之后,答过 6 项的人点「继续作答」又从选职业开始重走一遍)。
                      已经选过职业就跳过职业页,QuizForm 自己会定位到第一道空题;基础题都答满、
                      只差目标省的直接开省份页。「开始评估」(一题没答)与「改答案」(已答满)照旧从职业页起。 */}
                  <button onClick={() => {
                    const resuming = stepDone > 0 && stepDone < stepTotal
                    const baseDone = missingFields(stepNames, bands).length === 0
                    setQuizOpen(true)
                    setOccStep(!resuming || !noc)
                    setProvinceStep(resuming && !!noc && baseDone && bands.provs.length === 0)
                    setScoreStep(false); setFormAtEnd(false); track('dp-quiz-edit')
                  }}
                    style={stepDone === 0
                      ? { ...BTN, background: UI.primary, color: '#fff', border: `1px solid ${UI.primary}`, fontWeight: 600, padding: '6px 16px', fontSize: 13 }
                      : { ...BTN, background: stepDone < stepTotal ? '#eff6ff' : '#fff', color: stepDone < stepTotal ? UI.primary : UI.text, border: `1px solid ${stepDone < stepTotal ? UI.primary : UI.border}`, fontWeight: 600 }}>
                    {t(quizComplete ? 'plan.back' : stepDone > 0 ? 'dp.resume' : 'dp.start')}
                  </button>
                </span>
              </div>
              <div className="dpConditionSummary" style={{ display: 'grid', gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${UI.hairline}` }}>
                {conditionSummary.map(([label, value, filled]) => (
                  <div key={label} style={{
                    minWidth: 0,
                    background: filled ? '#f8fafc' : '#fafafa',
                    border: `1px ${filled ? 'solid' : 'dashed'} ${filled ? UI.hairline : '#cbd5e1'}`,
                    borderRadius: 9,
                    padding: '8px 10px',
                  }}>
                    <div style={{ color: UI.text3, fontSize: 11.5, lineHeight: 1.35, marginBottom: 2 }}>{label}</div>
                    <div className="dpConditionValue" title={value} style={{
                      color: filled ? UI.text : '#94a3b8',
                      fontSize: 13,
                      fontWeight: filled ? 600 : 400,
                      lineHeight: 1.45,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 弹框问卷:只装基础卷(职业 / 四题 / 省份)。各省估分不进这里 —— 它要的那个分值卡
                必须常驻在页面上,一卸载答案就没了(它的勾选全是组件本地 state)。
                表头右侧留 84:Modal 自带的「全屏/关闭」两颗钮固定在 top12/right12,占掉约 78px,
                只留 40 的话重置钮会压在全屏钮上。draggable 关掉:答题不需要拖窗,按住空白就把窗拖走更碍事。 */}
            {quizOpen && ready && (
              <Modal onClose={() => setQuizOpen(false)} size="lg" pad z={60} draggable={false}>
                <div ref={quizRef}>
                  <QuizStyle />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 84, marginBottom: 12 }}>
                    <h2 style={{ ...H2, margin: 0 }}>{t('dp.quiz')}</h2>
                    <span style={{ ...COUNT_PILL, background: shownStep === shownTotal ? '#eff6ff' : UI.bg,
                      color: shownStep === shownTotal ? UI.primary : UI.text3 }}>
                      {t('dp.basicCount', { done: shownStep, total: shownTotal })}
                    </span>
                    <button onClick={() => {
                      setBands(clearAnswers()); setNoc(''); setResetNonce((n) => n + 1); setOccStep(true); setProvinceStep(false); setScoreStep(false); setScoreProgress(null); setFormAtEnd(false)
                      track('dp-quiz-reset')
                    }} style={{ ...BTN, marginLeft: 'auto' }}>
                      {t('plan.reset')}
                    </button>
                  </div>
                  <div aria-label={`${shownStep}/${shownTotal}`} style={{ height: 4, borderRadius: 999, background: UI.hairline, overflow: 'hidden', margin: '0 0 18px' }}>
                    <div style={{ width: `${Math.round((shownStep / Math.max(shownTotal, 1)) * 100)}%`, height: '100%', borderRadius: 999,
                      background: UI.primary, transition: 'width .2s' }} />
                  </div>
                  {(occStep || !noc) ? (
                    <div className="plQuizPad">
                      <QuizTitle>{t('quiz.q2')}</QuizTitle>
                      <div style={{ fontSize: 12.5, color: UI.text3, margin: '-10px 0 13px', lineHeight: 1.55 }}>{t('quiz.q2sub')}</div>
                      <OccPicker key={resetNonce} inline t={t} lang={lang} initial={bands.nocs} doneLabel={t('plan.next')}
                        onChange={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || '') }}
                        onDone={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || ''); setOccStep(false); setProvinceStep(false); setFormAtEnd(false) }} />
                    </div>
                  ) : provinceStep ? (
                    <div className="plQuizPad">
                      {/* 省份是基础卷最后一题:答完立刻收卷关弹窗出方案。各省估分是自愿的第二段,
                          由方案下面那张卡的入口进入 —— 不把 16 道官方表的题横在结论前面 */}
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
                </div>
              </Modal>
            )}

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
                      const province = row.key === 'AIP'
                        ? t('dp.atlantic')
                        : row.key === 'RCIP'
                          ? t('dp.ruralCommunities')
                          : row.province === 'FED' ? t('dp.federal') : provDisp(row.province)
                      // 走查 #293:省名在灰字那行已经写了,通道名里再带一遍 =「Saskatchewan Employment Offer /
                      // Saskatchewan」。摘掉前缀,顺带让名字短一截、少折一行。
                      const routeName = dropProvPrefix(t(`jpw.p.${row.key}`), province)
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
              </div>
            )}

            {/* 各省估分 = 自愿的第二段,**摆在方案之后**(Frank 2026-08-11:「单独一个 section 放到初步方案下面」)——
                先给方案再谈加题,不拿 16 道官方表的题横在结论前面。题数写在入口上(点之前就看得见成本);
                答过一半再退出的,入口写的是**剩下几题**,接着答不用重来。
                入口、题目、结果**三样同处这一张卡**,靠的是分值卡从头到尾只有这一个实例:
                它的勾选全是组件本地 state,搬进弹窗或换个位置重挂 = 答案清零,而且题数也得靠它挂载后
                回报(onQuestionnaireProgress)才知道 —— 入口的「还有 N 题」正是这么来的。
                所以这块**常驻**:没答完且不在答题态时它自己什么都不渲(targetMode 下 showResults=false),
                卡里就只剩入口行;进答题态出题;答完出各省结果。 */}
            {quizComplete && targetFactors.length > 0 && (
              // 开着弹窗时只**藏**不卸载(display 只在收起时写 none,写死 block 会盖掉 .qzFill 的 flex):
              // 点「改答案」看一眼又关掉的人,估分答过的题不该因此清零
              <div style={quizOpen ? { display: 'none' } : scoreProgress ? CARD : undefined}>
                {(showScoreEntry || scoreStep) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', color: '#111827', fontSize: 13.5, fontWeight: 700, lineHeight: 1.45 }}>{t('dp.scoreEntry')}</span>
                      {!scoreStep && <span style={{ display: 'block', color: UI.text3, fontSize: 12, lineHeight: 1.45 }}>{t('dp.scoreEntryHint', { n: scoreLeft })}</span>}
                    </span>
                    {scoreStep ? (
                      <span style={{ ...COUNT_PILL, background: UI.bg, color: UI.text3 }}>{t('dp.scoreCount', { done: scoreDone, total: scoreTotal })}</span>
                    ) : (
                      <button onClick={openScoreStep} style={PRIMARY_BTN}>{t('dp.scoreStart')}</button>
                    )}
                  </div>
                )}
                {/* 答题态才给进度条(分值卡自己不画:题卡外层有一条就够了) */}
                {scoreStep && (
                  <div aria-label={`${scoreDone}/${scoreTotal}`} style={{ height: 4, borderRadius: 999, background: UI.hairline, overflow: 'hidden', margin: '11px 0 18px' }}>
                    <div style={{ width: `${Math.round((scoreDone / Math.max(scoreTotal, 1)) * 100)}%`, height: '100%', borderRadius: 999, background: UI.primary, transition: 'width .2s' }} />
                  </div>
                )}
                {/* 题区在**页内卡片**里,不是全屏弹窗 —— 手机上 .quizBar 默认 position:fixed 钉在视口底
                    (那是给全屏弹窗写的),放到页内就会一直浮在案例、抽选表上面。这里把它收回卡内:
                    改 sticky、去掉给固定条让位的 78px 底衬。桌面态照旧(sticky + 题区 560 最小高)。 */}
                <style>{`@media(max-width:640px){.dpScorePad .quizBar{position:sticky;left:auto;right:auto;margin:18px 0 0;padding:10px 0 8px;box-shadow:none;border-top:1px solid ${UI.hairline};z-index:2}.dpScorePad{padding-bottom:0}}`}</style>
                <div className={scoreStep ? 'plQuizPad dpScorePad' : undefined}>
                  <PnpScoreCard key={scoreKey} t={t} lang={lang}
                    ctx={{ noc: tvJob?.noc || noc, teer: targetTeer, province: scoreContextProvince, city: tvJob?.city || '' }}
                    factors={targetFactors} draws={scoreDraws}
                    streams={tvJob && tvJob.pnpStream ? { [scoreContextProvince]: tvJob.pnpStream } : {}}
                    initial={scoreInitial} hiddenProfileInputs={hiddenScoreInputs} limits={scoreLimits} targetMode
                    questionnaireActive={scoreStep}
                    onQuestionnaireProgress={onScoreProgress}
                    onQuestionnaireComplete={onScoreComplete}
                    onQuestionnaireBack={onScoreBack} />
                </div>
              </div>
            )}

            {/* 带岗进入后,三项判定就是本页结果,不再自动套一层弹窗。条件在上、结果在下,修改后原地重算。
                **必须等 ready**:quizOpen 初值是 false,不等读完 localStorage 就渲染的话,新用户首帧先看到
                这块判定面板、水合后又被答题卡顶掉 —— 闪一下不说,还白打一次 tv-open + 一次
                /api/triple-verdict 请求,把「有多少人真看了判定」这个数顶虚(2026-08-11 umami session 实录)。 */}
            {ready && tvJob && !quizOpen && <TripleVerdictPanel job={tvJob} lang={lang} profileComplete={quizComplete} refreshKey={verdictNonce}
              onBuildProfile={() => {
                // 弹窗自己就在视口正中,不用再滚页面(内联时代的 scrollIntoView 已撤)
                setQuizOpen(true); setOccStep(true); setProvinceStep(false); setScoreStep(false); setFormAtEnd(false); track('tv-build-profile')
              }} />}

            {/* 「本站没有这些省的分值表」是个断言,**表到手了才敢说** —— 懒取还没回来时
                factorProvinces 是空的,不加这道门就会先闪一句「哪个省都没有」。 */}
            {quizComplete && !quizOpen && scoreTables && unscoredProvinces.length > 0 && (
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
            {/* 常见案例(08-10 Frank「直接使用我那 16 个 case」)。2026-08-11 Frank 连拍四刀,最后成这样:
                ①「按这个条件代入」连 preset 数据一起撤(它把案例主人公的画像写进用户自己的答案);
                ②「问 AI 顾问」撤(拿别人的原话去问,答的还是别人的事);
                ③**折叠撤掉**——「隐藏小字有必要吗,不如把标题写清楚」:原话小字并进标题,一行一条不再点开;
                ④出口改成行尾按钮「完整案例」,做了事实层的那条才有(真 <a>,内链要被爬到)。
                **答不了就不假装能答**:15 条只摆标题,谁的事实层补上了谁才有按钮。 */}
            <div style={CARD}>
              <h2 style={H2}>{t('dp.cases')}</h2>
              {CASES.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  borderTop: `1px solid ${UI.hairline}`, padding: '10px 0' }}>
                  <span style={{ minWidth: 0, flex: 1, fontSize: 13.5, fontWeight: 600, color: '#111827', lineHeight: 1.5 }}>
                    {pickL3(c.label)}
                  </span>
                  {c.page && (
                    <a href={`/cases/${c.page}`} onClick={() => track('dp-case-page', { id: c.id })}
                      style={{ ...PRIMARY_BTN, textDecoration: 'none', display: 'inline-block' }}>{t('dp.caseAnswer')}</a>
                  )}
                </div>
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
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: UI.text3, marginTop: 2 }}>
                        <span>{t('rpt.s.d.inv')}</span>
                        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{r.invitations ?? '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: UI.text2, marginTop: 2 }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{r.drawDate}</span>
                        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{streamDisplay(t, r.stream)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* 2026-08-11(Frank「都改成一套」):自造裸 <table> → 公共 DataTable(bare=已在 CARD 内)。
                    列宽照旧写死(27/27/30/16),省名可截断而灰码永不截的处理留在 render 里 */}
                <div className="dpDrawTbl">
                  <DataTable<typeof overview[number]> rows={overview} rowKey={(r) => r.province} bare
                    cols={[
                      { key: 'prov', label: t('dp.prov'), width: '24%', render: (r) => (
                        <span title={provDisp(r.province)} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provDisp(r.province)}</span>
                          <span style={{ color: UI.text3, fontSize: 11.5, flexShrink: 0 }}>{r.province}</span>
                        </span>
                      ) },
                      { key: 'date', label: t('rpt.s.d.date'), width: '20%', nowrap: true, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', color: UI.text2, fontSize: 12.5 }}>{r.drawDate}</span> },
                      // 走查 #297:官方通道名截断(「Alberta Express Entry Stream – Priority Sectors (Constructio…」)。
                      // 英文界面拿到的就是官方原名,我们**没有权力**给它编个短名 —— 放不下就换行,不截。
                      { key: 'stream', label: t('rpt.s.d.stream'), width: '32%', render: (r) => (
                        <span style={{ display: 'block', color: UI.text2, overflowWrap: 'anywhere' }}>{streamDisplay(t, r.stream)}</span>
                      ) },
                      // 邀请数:这张表的入选条件是「有分数线**或**有邀请数」—— 只摆分数线的话,
                      // 靠邀请数入选的行(NL/MB/NB)整行都是「—」,把它入选的那个事实藏了
                      { key: 'inv', label: t('rpt.s.d.inv'), width: '12%', align: 'right', nowrap: true,
                        render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', color: UI.text2 }}>{r.invitations ?? '—'}</span> },
                      { key: 'score', label: t('rpt.s.d.score'), width: '12%', align: 'right', render: (r) => <>{r.score ?? '—'}</> },
                    ]} />
                </div>
              </div>
            )}

            {/* 2026-08-11 Frank 撤:页尾「看在招岗 / 问 AI 顾问」两个钮,与方案卡的「查看详细行动方案」一起。
                顾问不再从本页导流(见记忆 advisor-quality-gate);看在招岗的入口在方案卡下面的「验证具体岗位」。 */}
          </div>
        </PageShell>
      </div>
      <SiteFooter t={t} />
    </div>
  )
}
