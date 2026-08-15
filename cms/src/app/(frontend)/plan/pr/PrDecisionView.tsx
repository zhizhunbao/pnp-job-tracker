'use client'
// 决策页视图(判定合一批1):答题为主干,顾问只是出口(2026-08-10 Frank 拍板)。
// 渐进展开(Frank「排版太乱」整改):答题卡默认收起一行入口,不逼人考试;抽选事实表在主干之后。
// 测分工具不上页面(Frank「测分数完全不用显示」)—— 答案落档喂判定核,
// 各省分数归判定卡个人条件(付费实底,批2 接 pnpSelfScore)。
// 区块序:H1 → 答题 → [带岗]岗位三项判定 / [无岗]挑岗 → 抽选表 → 钩子。
// 判定/分数全来自确定性层,本页不算一个数。
import { Fragment, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'

import { dropProvPrefix, streamDisplay } from '../../jobs/i18n'
import { useLang } from '../../LangProvider'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { quizToProfile } from '../../quiz/EntryQuiz'
import { AuthModal } from '../../jobs/AuthForm'
import { OccPicker } from '../../quiz/OccPicker'
import { ProvincePicker } from '../../quiz/ProvincePicker'
import { POPULAR_NOCS } from '../../account/profileOptions'
import { QuizStyle, QuizTitle, pickL, type L } from '../../quiz/QuizUI'
import { QuizForm } from '../QuizForm'
import { BANNER_IMGS, PageBanner, PageShell, UI } from '../../ui/primitives'
import { DataTable } from '../../ui/DataTable'
import { TripleVerdictPanel } from '../../jobs/TripleVerdictModal'
import { ConditionGrid } from '../../jobs/ConditionGrid'
import { PnpScoreCard } from '../../jobs/PnpScoreCard'
import { iconBtnS, SCRIM, CARD as OVERLAY_CARD, useIsNarrow } from '../../jobs/Modal'
import { IconRefresh } from '../../Icons'
import { EMPTY, clearAnswers, readAnswers, toEngineAnswers, writeAnswers, type Answers } from '@/lib/answers'
import { fieldsOf, missingFields } from '@/lib/decisions'
import { FIELDS } from '@/lib/fields'
import { pickName } from '@/lib/occName'
import { track } from '@/lib/track'
import type { DrawRow, ScoreFactor, SelfProfile } from '@/lib/pnpSelfScore'
import type { ProvCompetition } from '@/lib/scoreTables'
import type { OccCompetitionRow } from '@/app/api/occ-competition/route'

/** 形状与 `lib/scoreTables.ts` 的同名类型对齐(那边是产出方,这里是消费方) */
export type OverviewDraw = { province: string; drawDate: string; stream: string; score: number | null; invitations: number | null }
/** 热门职业一行(与 lib/jobsSql.fetchTopNocs 的返回对齐) */
export type TopNoc = {
  noc: string; title: string; titleZh: string; titleZhShort: string; titleKoShort: string
  titleEnShort: string; broad: string; open: number; eligible: number; medianSalary: number | null
}
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
  blockedBy?: 'language' | 'selfEmployed' | 'offer' | 'statusInCanada' | 'credentialCanada' | null
  /** 该省名额竞争度(临时居民存量 ÷ 当年省提名名额,IRCC 开放数据);联邦线为 null */
  competition?: { ratio: number; tier: string; pool: number; quota: number; quotaYear: number } | null
  /** 反事实(L2-09):拿到该省 offer 之后这条路的判定;只有被 offer 卡住的行才带 */
  afterOffer?: { verdict: 'open' | 'needs-info' | 'excluded'; blockedBy: string | null; tier: 0 | 1 | 2 | 3 | null } | null
  /** 打分制通道估分与官方线;belowLine=估分<最近线(服务端已沉队尾,门槛列写数字) */
  score?: { value: number; ceiling: number | null; refLine: number | null } | null
  belowLine?: boolean
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

export function PrDecisionView({ overview, competition = [], tvJob, topNocs, initialVerdict }: {
  overview: OverviewDraw[]; tvJob: TvJob | null
  /** 各省名额竞争(松→紧);与抽选表并列的第二条免费硬事实 */
  competition?: ProvCompetition[]
  /** 服务端取好的热门职业榜(noc_openings 直出)→ 选职业控件一次成型,不再分段刷 */
  topNocs?: TopNoc[]
  /** 服务端先算好的判定卡(首屏不出骨架);客户端带本地答案再刷一次 */
  initialVerdict?: unknown
}) {
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
  // 分值表逐题答案回显(分值卡上抛):与基础 8 项同摆一片格子(2026-08-13 Frank「全都算成基本信息」)
  const [scoreEcho, setScoreEcho] = useState<{ key: string; prov: string; label: string; value: string; filled: boolean }[]>([])
  // 点条件格直达那道题:基础题记字段名(换 key 重挂 QuizForm);分值题记 {key,nonce} 传给分值卡
  const [quizFocus, setQuizFocus] = useState('')
  const [scoreFocus, setScoreFocus] = useState<{ key: string; nonce: number } | null>(null)
  const [formAtEnd, setFormAtEnd] = useState(false)
  const [ready, setReady] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [verdictNonce, setVerdictNonce] = useState(0)
  const [occTitles, setOccTitles] = useState<Record<string, string>>({})
  const [profilePaths, setProfilePaths] = useState<ProfilePath[] | null>(null)
  // 官方分值表 + 抽选记录:不再随页面下发(192 行 ≈ 88KB 塞给每个访客),答完题按所选省现取。
  // null = 还没取到,此时既不出估分区也不敢说「这些省本站没有表」——那两句都得等表到手才算数。
  const [scoreTables, setScoreTables] = useState<ScoreTables | null>(null)
  // 该职业分省竞争面:按 NOC 懒取(省级那张表随页面 SSR,这张要等他答完职业才知道查谁)
  const [occComp, setOccComp] = useState<OccCompetitionRow[] | null>(null)
  // 分省竞争表的职业切换(2026-08-14 Frank「需要分职业吧」):默认第一职业,选了就看谁;
  // 只切这张表的查询,不动全页 noc(分值卡/判定的职业语境不跟着跳)
  const [occNoc, setOccNoc] = useState('')
  // 竞争卡年份筛选(2026-08-14 Frank「加上年份筛选」「看 2024 2025 2026 不同年份」):
  // ''=现行口径(今天这张表);选了年 → 存量/名额/新发学签列切到该年,官方缺位的格显「—」不编
  // 默认停在 2025(2026-08-15 Frank「默认选择 2025 吧」):最近一个名额+流量齐的年份;
  // 再点一次 2025 可回「现行口径」(最新存量÷当年名额的比值表)
  const [compYear, setCompYear] = useState('2025')
  // 答题闸门(2026-08-14 Frank「答题之前还是需要用户先注册」):未登录先注册/登录再答,
  // 答案从第一题起就有档可落。null=还没问回来(闸先关,加载区占位,不闪答题卡)
  const [me, setMe] = useState<boolean | null>(null)
  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' }).then((r) => r.json())
      .then((d) => setMe(!!d?.user?.id)).catch(() => setMe(false))
  }, [])
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
    setProvinceStep(a.nocs.length > 0 && baseComplete && a.provs.length === 0 && !a.provsAny)
    setReady(true)
    track('dp-open', { job: tvJob ? '1' : '0' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const target = occNoc || noc
    if (!target) { setOccComp(null); return }
    const ctrl = new AbortController()
    fetch(`/api/occ-competition?noc=${encodeURIComponent(target)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!ctrl.signal.aborted) setOccComp(Array.isArray(d?.rows) ? d.rows : []) })
      .catch(() => { if (!ctrl.signal.aborted) setOccComp([]) })
    return () => ctrl.abort()
  }, [noc, occNoc])

  const stepNames = fieldsOf('pr', 'basic')
  const stepTotal = stepNames.length + 2
  // 目标省「还不确定」是**答过的**(Frank 2026-08-12:「很多人不知道去哪个省,比如国内的厨师」)——
  // 它跟「没答」不是一回事:前者=不限省、13 条通道全判一遍;后者=还没走到这一步。
  const provAnswered = bands.provs.length > 0 || !!bands.provsAny
  const stepDone = stepNames.length - missingFields(stepNames, bands).length + (noc ? 1 : 0) + (provAnswered ? 1 : 0)
  // 计数**合成一条**(2026-08-13 Frank:「就是要合并成 17,估分功能去掉,全都算成基本信息」——
  // 明确推翻 08-10 的两段计数):基础 8 项 + 分值表逐题,一枚胶囊报总账。分值表题数要等
  // 选完省、分值卡挂载后才报上来,所以总数会从 8 涨到 17 —— 这是拍板接受的代价。
  // 数的还是**答过几项**,不是翻到第几页(先前用页码:一进第 1 题就写「已答 1/6」,其实一题没答)。
  const scoreDone = scoreProgress?.done ?? 0
  const scoreTotal = scoreProgress?.total ?? 0
  const scoreLeft = scoreTotal - scoreDone
  // 估分段还有没答的题(题数由分值卡挂载后回报;没报上来=还不知道,不算「有欠账」)
  const scorePending = !!scoreProgress && scoreLeft > 0
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
  }, [quizOpen, stepDone, occStep, provinceStep])
  // 分值卡门控:基本卷答满才渲(渐进展开 —— 落地页面只有 H1 + 答题,别一屏摊开所有机器)
  const quizComplete = ready && !!noc && provAnswered && missingFields(stepNames, bands).length === 0
  // 整份问卷(基础段+估分段)全答完才算「修改条件」;有欠账就是「继续作答」
  const allDone = quizComplete && !scorePending

  // 基础问卷本身就足够做“人 → 通道”的初筛，不应强迫用户先找一份具体岗位。
  // 岗位与雇主只在第二层三项判定里使用。输入键用于修改答案后原地重算。
  const pathInputKey = JSON.stringify([
    bands.nocs, bands.status, bands.clbBand, bands.totalExpBand, bands.expBand, bands.provs,
  ])
  useEffect(() => {
    // 职业档粗筛(2026-08-15):有职业就跑 —— 引擎对没答的题落「判不了」不当障碍,答满后同一请求自动升级个人档
    if (!ready || !noc) { setProfilePaths(null); return }
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
  }, [ready, noc, pathInputKey])

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
  const occName = (code: string): string => {
    const popular = POPULAR_NOCS.find((x) => x.noc === code)
    if (popular) return t(popular.key)
    // 名字还没到手(或这个码压根查不到名字)时退回码本身:用户明明选过职业,这一格不能写「待填写」
    return occTitles[`${lang}:${code}`] || NOC_TITLE_CACHE[`${lang}:${code}`] || `NOC ${code}`
  }
  const occText = bands.nocs.map(occName).filter(Boolean).join(lang === 'zh' ? '、' : ', ')
  const unparsed = lang === 'zh' ? '待填写' : 'Not completed'
  // key = 点这格该落到哪道题:'occ'/'prov' 是专属页,基础题用字段名,分值题用分值卡的题 key(带冒号);
  // prov=''为全省共用,其余按省分 tab(ConditionGrid)
  type SummaryRow = { key: string; prov: string; label: string; value: string; filled: boolean; warn?: string }
  // 带岗态的不匹配小标(2026-08-14 Frank「加个图标标一下 职业不匹配」「省份不匹配」):
  // 岗位职业不在档案职业里 / 岗位省不在目标省里 → 对应格挂 ⚠ 胶囊,长句不要
  const occMismatch = !!tvJob?.noc && bands.nocs.length > 0 && !bands.nocs.includes(tvJob.noc)
  const provMismatch = !!tvJob && !bands.provsAny && bands.provs.length > 0 && !bands.provs.includes(tvJob.province)
  const conditionSummary: SummaryRow[] = [
    { key: 'occ', prov: '', label: t('dp.sum.occ'), value: occText || unparsed, filled: !!occText,
      ...(occMismatch ? { warn: t('dp.warnOcc') } : {}) },
    { key: 'status', prov: '', label: t('dp.sum.status'), value: choiceText('status') || unparsed, filled: !!choiceText('status') },
    { key: 'clbBand', prov: '', label: t('dp.sum.clb'), value: choiceText('clbBand') || unparsed, filled: !!choiceText('clbBand') },
    { key: 'totalExpBand', prov: '', label: t('dp.sum.totalExp'), value: choiceText('totalExpBand') || unparsed, filled: !!choiceText('totalExpBand') },
    { key: 'expBand', prov: '', label: t('dp.sum.canExp'), value: choiceText('expBand') || unparsed, filled: !!choiceText('expBand') },
    { key: 'prov', prov: '', label: t('dp.sum.prov'), value: bands.provs.length ? bands.provs.map((code) => t('prov.' + code)).join(lang === 'zh' ? '、' : ', ')
      : bands.provsAny ? t('quiz.provAnyShort') : unparsed, filled: provAnswered,
      ...(provMismatch ? { warn: t('dp.warnProv') } : {}) },
    // 2026-08-12 加的两题也要回显 —— 卡头写着「已答 6/8」而下面只摆 6 格,数和格子对不上
    { key: 'offerBand', prov: '', label: t('dp.sum.offer'), value: choiceText('offerBand') || unparsed, filled: !!choiceText('offerBand') },
    { key: 'canadaEduBand', prov: '', label: t('dp.sum.canadaEdu'), value: choiceText('canadaEduBand') || unparsed, filled: !!choiceText('canadaEduBand') },
    // 分值表的题一视同仁逐格回显(合并成 17 的另一半:计数合了,格子也得合,数和格子才对得上)
    ...scoreEcho.map((r): SummaryRow => ({ key: r.key, prov: r.prov, label: r.label, value: r.value || unparsed, filled: r.filled })),
  ]

  // 用户在问卷里直接多选具体省份。共用条件交给一张 PnpScoreCard 只问一次，省独有条件按所选省追加。
  const selectedProvinces = tvJob?.province ? [tvJob.province] : bands.provs
  const factorProvinces = scoreTables?.factorProvinces ?? []
  const scoredProvinces = selectedProvinces.filter((province) => factorProvinces.includes(province))
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
  // 语言与总经验在基础卷都已问**精确档**(2026-08-13/14 合一)——范围恒为单值,
  // 分值卡对应的追问题整题不再出;总经验「不清楚」(9)落空数组 = 不限,分值段照问。
  // SK 按「近 5 年/6-10 年」拆段的省仍要拆段追问:那不是重复,是官方口径不同。
  const CLB_RANGE = [[], [0], [4], [5], [6], [7], [8], [9], [10]]
  const TOTAL_EXP_RANGE = [[], [0], [0], [1], [2], [3], [4], [5]]
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
  // 基础卷的 offer 答案 → 分值卡语境:有=true;面试中/没有/自雇=false(都还没有 offer);
  // 不清楚/没答=undefined,分值段照问。答过就不再问第二遍(2026-08-14 offer 合一)。
  const ctxHasOffer = bands.offerBand === 1 ? true : [2, 3, 4].includes(bands.offerBand) ? false : undefined
  const scoreKey = `${tvJob?.id ?? 'profile'}:${scoredProvinces.join(',')}:${bands.clbBand}:${bands.totalExpBand}:${bands.offerBand}:${targetFactors.map((f) => f.guideEffective).join(',')}`

  // 关整个问卷弹框(基础段与估分段共用一个框,2026-08-13 Frank:「开始估分不应该和申请人条件
  // 合并到一起吗?为什么单独一个弹框」)
  const closeQuiz = useCallback(() => { setQuizOpen(false); setScoreStep(false) }, [])

  // 答完基本卷:落档(登录才写,quizToProfile 内部自判;失败不拦页面)。
  // 页面不出任何分数 —— 答案的消费方是判定核(个人条件),不是本页。
  // 合并动线:省份答完**不关框**,直接翻进同一弹框的估分段 —— 估分题就是这份问卷的后半截,
  // 不另设入口(2026-08-13 Frank:「只要一个修改按钮继续行了吧」)。全卷早已答满的,估分段
  // 自带「完成」旁路钮一点即收;所选省没表/没题的,兜底 effect 与分值卡自己会收框。
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
    setOccStep(false); setProvinceStep(false); setScoreStep(true)
  }, [])

  const onScoreProgress = useCallback((progress: { done: number; total: number }) => setScoreProgress(progress), [])
  const onScoreAnswers = useCallback((rows: { key: string; prov: string; label: string; value: string; filled: boolean }[]) => setScoreEcho(rows), [])

  // 估分答完 = 整卷答完,收框显示各省结果(结果在「申请人条件」卡内)
  const onScoreComplete = useCallback(() => {
    track('dp-score-done')
    setScoreStep(false)
    setQuizOpen(false)
  }, [])

  // 估分段第一屏的「返回」= 回到上一步(省份页),同一弹框内往回翻,不是退出
  const onScoreBack = useCallback(() => { setScoreStep(false); setOccStep(false); setProvinceStep(true); setFormAtEnd(false) }, [])

  // 基础卷的「完成」旁路(2026-08-13 Frank:「这个加一个完成按钮」——改一个答案不用再翻完全卷):
  // 落档 + 刷判定 + 收框,与走完省份的收卷动作同源,只是不再逼人把答过的页翻一遍
  const finishQuiz = () => {
    track('dp-quiz-done')
    quizToProfile(readAnswers())
      .catch(() => { /* 匿名或网络失败:答案仍在 localStorage */ })
      .finally(() => setVerdictNonce((n) => n + 1))
    closeQuiz()
  }

  // 打开问卷弹框、直接落在估分段(基础卷答满、只欠估分题时的落点)
  const openScoreStep = useCallback(() => {
    track('dp-score-start')
    setQuizOpen(true); setOccStep(false); setProvinceStep(false); setScoreStep(true)
  }, [])

  // **唯一入口按钮**(2026-08-13 Frank:「只要一个修改按钮继续行了吧」):不带 key 时落在
  // 第一道没答的题 —— 基础段有空题按旧口径落基础段;基础段答满、分值题还有欠账的直接落分值题;
  // 全答满 = 从头复查,省份翻过去接着是分值题,「完成」一点即收。
  // 带 key = 点了哪个条件格就直达那道题(2026-08-13 Frank 实拍「点哪个框都弹学历」——
  // 之前 17 个格子全走同一个落点):'occ'/'prov' 开专属页,基础字段落 QuizForm 对应题,
  // 分值题 key(带冒号)开分值段并定位。
  const startQuiz = (key?: string) => {
    track('dp-quiz-edit')
    setFormAtEnd(false)
    if (key && key.includes(':')) {
      setQuizFocus('')
      setScoreFocus((f) => ({ key, nonce: (f?.nonce ?? 0) + 1 }))
      setQuizOpen(true); setOccStep(false); setProvinceStep(false); setScoreStep(true)
      return
    }
    if (key === 'occ') { setQuizFocus(''); setQuizOpen(true); setOccStep(true); setProvinceStep(false); setScoreStep(false); return }
    if (key === 'prov') { setQuizFocus(''); setQuizOpen(true); setOccStep(false); setProvinceStep(true); setScoreStep(false); return }
    if (key) {
      setQuizFocus(key)
      setQuizOpen(true); setOccStep(false); setProvinceStep(false); setScoreStep(false)
      return
    }
    setQuizFocus('')
    // 未登录不抄近道进估分段:先落在基础流,让注册闸接住(闸只渲在 !scoreStep 分支)
    if (me === true && quizComplete && scorePending) { openScoreStep(); return }
    const resuming = stepDone > 0 && stepDone < stepTotal
    const baseDone = missingFields(stepNames, bands).length === 0
    setQuizOpen(true)
    setOccStep(!resuming || !noc)
    setProvinceStep(resuming && !!noc && baseDone && !provAnswered)
    setScoreStep(false)
  }

  // 弹框壳的 Esc 退出与统一壳同款(基础段与估分段一体,关的是整个框)
  const narrow = useIsNarrow()
  useEffect(() => {
    if (!quizOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeQuiz() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [quizOpen, closeQuiz])

  // 估分段兜底收框:表到手了、但所选省一张官方表都没有 —— 段里没有任何题可出,停着就是白框。
  //(有表但零题的情况由分值卡自己报 onQuestionnaireComplete 收框)
  useEffect(() => {
    if (quizOpen && scoreStep && scoreTables && targetFactors.length === 0) closeQuiz()
  }, [quizOpen, scoreStep, scoreTables, targetFactors.length, closeQuiz])
  // 同一情形下清掉分值卡的残留上报:组件都不挂了,计数还写着 n/17、格子还摆着上一轮的题,
  // 数和格子就跟人对不上(改省份改成全是没表的省时实撞)
  useEffect(() => {
    if (scoreTables && targetFactors.length === 0) { setScoreProgress(null); setScoreEcho([]) }
  }, [scoreTables, targetFactors.length])

  const provDisp = (code: string) => { const full = t('prov.' + code); return full === 'prov.' + code ? code : full }

  // 唯一一枚计数胶囊:基础 8 项 + 分值表逐题合报一个数(2026-08-13 Frank「合并成 17」)。
  // 摘要卡头、带岗态判定卡②、问卷弹框头共用同一份。
  const doneAll = stepDone + scoreDone
  const totalAll = stepTotal + scoreTotal
  const countPills = ready ? (
    <span style={{ ...COUNT_PILL, background: doneAll === totalAll ? '#eff6ff' : UI.bg,
      color: doneAll === totalAll ? UI.primary : UI.text3 }}>
      {t('dp.basicCount', { done: doneAll, total: totalAll })}
    </span>
  ) : null

  // 「你的初步方案」整块抽出来:带岗态它是判定卡的**第三张卡**
  //(Frank 2026-08-12 定的卡序:① 这份工作 ② 你的条件 ③ 你的初步方案 ④⑤⑥ 三关 ⑦ 付费),
  // 无岗态原地摆在答题卡下面。
  // 省份消歧(审计 A4 / 设计 B3):这张表按**档案里的目标省**算,带岗时岗位省未必在里面 ——
  // 一张 PE 的岗上摆着 NS/NL 的通道,不说一句就是让人自己去猜(Frank 实拍:「爱德华王子岛还走 RCIP 还走 EE?」)。
  // **不是警告是消歧**:说清主语,并给一键对齐;不替他改答案。
  const jobProvOutside = !!tvJob && !bands.provsAny && bands.provs.length > 0 && !bands.provs.includes(tvJob.province)
  const addJobProv = () => {
    if (!tvJob) return
    const next = writeAnswers({ provs: [...bands.provs, tvJob.province] })
    setBands(next); setVerdictNonce((n) => n + 1); track('dp-add-job-prov', { prov: tvJob.province })
  }

  // 注册闸(2026-08-14 Frank「答题之前还是需要用户先注册」;二改「怎么把登录内嵌到答题弹框了」):
  // 未登录点任何答题入口 → 答题壳不换皮,弹**标准 AuthModal**(与顶栏同一个,08-09「别跳页」拍板);
  // 注册/登录完成 → 落档浏览器里已答的旧答案,原地接着开答题,不刷新页面不丢状态。
  const quizShow = quizOpen && me === true
  // 职业档粗筛(2026-08-15 Frank「立即出」):只答了职业也出初评 —— 同一引擎(profile-pathways
  // 没答的题=判不了,不当障碍),同一张卡,答满 8 题原地升级成个人档,不是两张卡
  const planCoarse = !quizComplete
  const planCard = noc && !quizOpen ? (
    <div style={{ ...CARD, padding: '16px' }}>
                  <h2 style={{ ...H2, marginBottom: planCoarse ? 4 : 10 }}>{t('dp.planTitle')}
                    {planCoarse ? <span style={{ color: UI.text3, fontSize: 12, fontWeight: 400, marginLeft: 8 }}>{t('dp.planCoarse')}</span> : null}
                  </h2>
                  {planCoarse ? <div style={{ fontSize: 12.5, color: UI.text2, margin: '0 0 10px' }}>{t('dp.planCoarseSub', { occ: occText })}</div> : null}
                  {/* 不匹配动作条(2026-08-14 Frank:「不需要这么多文字描述」「给个按钮重新跳过去选职位」)——
                      长句撤掉,⚠ 小标挂在条件格上;这里只留动作:省不匹配可一键并省,或跳回职位板重选 */}
                  {(jobProvOutside || occMismatch) && tvJob ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {jobProvOutside ? <button onClick={addJobProv} style={BTN}>{t('dp.provAdd', { jobProv: provDisp(tvJob.province) })}</button> : null}
                      <a href={`/jobs?pnp=yes${bands.provs.length === 1 ? `&prov=${bands.provs[0]}` : ''}`}
                        onClick={() => track('dp-repick-job')} style={{ ...BTN, textDecoration: 'none', display: 'inline-block' }}>
                        {t('dp.repick')}
                      </a>
                    </div>
                  ) : null}
                              {profilePaths === null ? (
                    <div style={{ height: 58, borderRadius: 9, background: UI.bg }} />
                  ) : profilePaths.length > 0 ? (() => {
                    // 表格化(2026-08-15 Frank「这个也改成表格。手机改成卡片」「手机端很多重复文字」):
                    // 标签进表头一次;门槛全行同值 → 收脚注一次不占列;「看该省在招岗」并进在招列=数字即链接。
                    // 职业档(planCoarse)不出门槛列 —— 没答条件,判定本来就出不来,摆一列「判不了」是噪音
                    // 排序补岗数信号(2026-08-15 Frank「1 个岗位能排第一?」):引擎序=门槛档→竞争比,
                    // 但 NL 7.9:1 全省只挂 1 岗,排第一=劝人押空盘。规则:**同档内**在招 <10 岗
                    // (不够一页投递量级,阈值可调)沉档尾按岗数多→少,足量的仍按竞争比松→紧;
                    // 门槛档仍是第一主键(引擎原序),岗数不跨档翻盘 —— 不合成分数,只是降档规则
                    // belowLine 进 band 首位:服务端已把够不着线的沉队尾,客户端岗数重排不许把它捞回前排
                    const bandOf = (row: ProfilePath) => `${row.belowLine ? 'z' : 'a'}|${row.verdict}|${row.blockedBy ?? ''}|${row.tier ?? ''}`
                    const jobsOf = (row: ProfilePath) => (/^[A-Z]{2}$/.test(row.province) && occComp
                      ? (occComp.find((o) => o.province === row.province)?.openJobs ?? 0) : null)
                    const bandRank = new Map<string, number>()
                    profilePaths.forEach((row) => { if (!bandRank.has(bandOf(row))) bandRank.set(bandOf(row), bandRank.size) })
                    const resorted = profilePaths.map((row, i) => ({ row, i, band: bandRank.get(bandOf(row)) ?? 0, n: jobsOf(row) }))
                    resorted.sort((a, b) => {
                      if (a.band !== b.band) return a.band - b.band
                      const aThin = a.n != null && a.n < 10, bThin = b.n != null && b.n < 10
                      if (aThin !== bThin) return aThin ? 1 : -1
                      if (aThin && bThin && a.n !== b.n) return (b.n ?? 0) - (a.n ?? 0)
                      return a.i - b.i                     // 足量组保持引擎序(竞争比松→紧);null(联邦/AIP)随原序
                    })
                    const shown = resorted.map((x) => x.row).slice(0, planCoarse ? 6 : 3)
                    const rows = shown.map((row, index) => {
                      const province = row.key === 'AIP'
                        ? t('dp.atlantic')
                        : row.key === 'RCIP'
                          ? t('dp.ruralCommunities')
                          : row.province === 'FED' ? t('dp.federal') : provDisp(row.province)
                      // 走查 #293:省名单独一列灰字,通道名里的省前缀摘掉,名字短一截。
                      // dropProvPrefix 只认全名,「纽芬兰省 国际毕业生类别」这类**短省名**前缀漏网 →
                      // 中文再剥一层「X省 」;剥空说明整名就是省名,保底不剥
                      const dropped = dropProvPrefix(t(`jpw.p.${row.key}`), province)
                      const short = lang === 'zh' ? dropped.replace(/^[一-龥]{1,4}省\s+/, '') : dropped
                      const routeName = short.trim() || dropped
                      const isOffer = row.blockedBy === 'offer'
                      const ao = isOffer ? row.afterOffer : null
                      // offer 行门槛 = 反事实结论;答不全(needs-info)时不敢承诺,维持「至少还差 offer」
                      const stateKey = row.availability !== 'ok'
                        ? 'dp.planDataGap'
                        : isOffer
                          ? (ao?.verdict === 'open'
                              // AIP/RCIP 不说「本省」:AIP 是大西洋四省指定雇主,RCIP 是试点社区,各用各的说法
                              ? (ao.tier ? `dp.planAfterOfferTier${ao.tier}`
                                  : row.key === 'AIP' ? 'dp.planAfterOfferOkAip'
                                    : row.key === 'RCIP' ? 'dp.planAfterOfferOkRcip' : 'dp.planAfterOfferOk')
                              : ao?.blockedBy ? `dp.planAfterOfferGap.${ao.blockedBy}` : 'dp.planBlocked.offer')
                          : row.blockedBy
                            ? `dp.planBlocked.${row.blockedBy}`
                            : row.verdict === 'needs-info'
                              ? 'dp.planNeedInfo'
                              : `dp.planTier${row.tier ?? 0}`
                      // 「拿到本省 offer 即可申请」是信息态不是达标态 → 蓝,不抢 open 的绿
                      const afterOk = isOffer && ao?.verdict === 'open' && !ao.tier && row.availability === 'ok'
                      // 估分<线的行不许亮绿(2026-08-15「够不到就排后面」):门槛列直接写数字
                      const openOk = row.verdict === 'open' && row.availability === 'ok' && !row.blockedBy && !row.belowLine
                      // 在招岗数(该省该职业本站在招;查无该省 = 0,0 必须显式写出,空着会被读成「没数据」):
                      // 数字本身就是直达链接;AIP 走指定雇主筛选无职业数,RCIP/联邦无岗位级标记 → 「—」
                      const provincial = /^[A-Z]{2}$/.test(row.province)
                      // RCIP 看岗链接(L2-09 尾巴):jobs.pilot 已落地(E6-11)。URL 用 filters.shared 短名;
                      // 旧值「1」不匹配谓词的 yes|no(=无效参数),顺手全修成 yes
                      const jobsHref = row.key === 'AIP' ? '/jobs?aip=yes'
                        : row.key === 'RCIP' ? '/jobs?pilot=RCIP'
                          : provincial ? `/jobs?prov=${row.province}&pnp=yes` : null
                      const jobsN = provincial && occComp ? (occComp.find((o) => o.province === row.province)?.openJobs ?? 0) : null
                      // 制度归属灰标(2026-08-14 Frank「通道要标明哪些是 pnp aip 或者 rcip」;08-15 实拍再确认):
                      // key 即真相 —— FED-EE=EE、AIP/RCIP 自名,其余全是省提名
                      const program = row.key === 'FED-EE' ? 'EE' : row.key === 'AIP' ? 'AIP' : row.key === 'RCIP' ? 'RCIP' : 'PNP'
                      // 门槛文案:够不着线的写数字(估分 X < 线 Y),数字是官方事实,结论用户自己得
                      const stateText = row.belowLine && row.score?.refLine != null
                        ? t('dp.planBelowLine', { v: row.score.value, line: row.score.refLine })
                        : t(stateKey)
                      return { rowKey: row.key, index, province, routeName, program, top: index === 0 && !row.blockedBy && !row.belowLine,
                        ratio: row.competition?.ratio ?? null, stateText, afterOk, openOk, jobsHref, jobsN }
                    })
                    // 门槛全行同值(常见:全被 offer 卡住)→ 一句脚注,不铺一整列同一句话
                    const gates = Array.from(new Set(rows.map((r) => r.stateText)))
                    const gateUniform = !planCoarse && gates.length === 1
                    type PlanRow = (typeof rows)[number]
                    const rank = (r: PlanRow) => (
                      <span style={{ width: 24, height: 24, borderRadius: 999, display: 'grid', placeItems: 'center', background: r.top ? UI.primary : UI.bg, color: r.top ? '#fff' : UI.text2, fontSize: 12, fontWeight: 700 }}>{r.index + 1}</span>
                    )
                    const gatePill = (r: PlanRow) => (
                      <span style={{ color: r.openOk ? UI.ok : r.afterOk ? '#1d4ed8' : '#92400e', background: r.openOk ? '#ecfdf5' : r.afterOk ? '#eff6ff' : '#fffbeb', borderRadius: 999, padding: '3px 9px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.stateText}</span>
                    )
                    const jobsCell = (r: PlanRow) => (
                      r.jobsN == null && !r.jobsHref ? <span style={{ color: UI.text3 }}>—</span>
                        : r.jobsHref ? (
                          <a href={r.jobsHref} onClick={() => track('dp-offer-jobs', { key: r.rowKey })}
                            style={{ color: UI.primary, textDecoration: 'none', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {r.jobsN == null ? t(r.rowKey === 'RCIP' ? 'dp.planSeeJobsPilot' : 'dp.planSeeJobsAip') : t('dp.planJobsN', { n: r.jobsN })} ›
                          </a>
                        ) : <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t('dp.planJobsN', { n: r.jobsN ?? 0 })}</span>
                    )
                    return (
                      <>
                        {/* display 走 CSS 类不走内联(2026-08-15 实撞:内联 display:grid 压过媒体查询的
                            display:none,桌面上卡片藏不掉 → 表格+卡片双份渲染) */}
                        <style>{`.dpPlanCards{display:grid;gap:8px}@media(max-width:640px){.dpPlanTbl{display:none}}@media(min-width:641px){.dpPlanCards{display:none}}`}</style>
                        <div className="dpPlanCards">
                          {rows.map((r) => (
                            <div key={r.rowKey} style={{ border: `1px solid ${UI.hairline}`, borderRadius: 10, padding: '10px 12px', background: r.top ? '#f8fbff' : '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                                <span style={{ fontSize: 12, color: UI.text3, fontVariantNumeric: 'tabular-nums' }}>{r.index + 1}</span>
                                <b style={{ fontSize: 13.5, color: '#111827', minWidth: 0 }}>{r.routeName}</b>
                                <span style={{ color: UI.text3, fontSize: 10.5, border: `1px solid ${UI.hairline}`, borderRadius: 4, padding: '0 4px', flexShrink: 0 }}>{r.program}</span>
                                <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{r.ratio == null ? '—' : `${r.ratio}:1`}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11.5, color: UI.text3 }}>{r.province}</span>
                                {!planCoarse && !gateUniform ? gatePill(r) : null}
                                <span style={{ marginLeft: 'auto', fontSize: 12.5 }}>{jobsCell(r)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="dpPlanTbl">
                          <DataTable<PlanRow> rows={rows} rowKey={(r) => r.rowKey} bare
                            cols={[
                              { key: 'rank', label: '#', width: '6%', render: rank },
                              { key: 'path', label: t('dp.planPath'), width: planCoarse || gateUniform ? '54%' : '34%', render: (r) => (
                                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                                  <b style={{ color: '#111827', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.routeName}</b>
                                  <span style={{ color: UI.text3, fontSize: 10.5, border: `1px solid ${UI.hairline}`, borderRadius: 4, padding: '0 4px', flexShrink: 0 }}>{r.program}</span>
                                  <span style={{ color: UI.text3, fontSize: 11.5, flexShrink: 0 }}>{r.province}</span>
                                </span>
                              ) },
                              ...(!planCoarse && !gateUniform
                                ? [{ key: 'gate', label: t('dp.planGate'), width: '20%', render: gatePill } as const]
                                : []),
                              { key: 'ratio', label: t('dp.compCol'), width: '20%', align: 'right', sort: (r) => r.ratio,
                                render: (r) => (r.ratio == null ? <span style={{ color: UI.text3 }}>—</span> : <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.ratio}:1</span>) },
                              { key: 'jobs', label: t('dp.planOpen'), width: '20%', align: 'right', sort: (r) => r.jobsN, render: jobsCell },
                            ]} />
                        </div>
                        {gateUniform ? (
                          <div style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.6, marginTop: 8 }}>{t('dp.planGateSame', { s: gates[0] })}</div>
                        ) : null}
                        {planCoarse ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                            <button onClick={() => startQuiz()}
                              style={{ ...BTN, background: '#fff', color: UI.primary, border: `1px solid ${UI.primary}`, fontWeight: 600, padding: '7px 16px', fontSize: 13 }}>
                              {t(stepDone > 0 ? 'dp.resume' : 'dp.start')}
                            </button>
                            <span style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.6 }}>{t('dp.planCoarseNote')}</span>
                          </div>
                        ) : null}
                      </>
                    )
                  })() : (
                    <div style={{ fontSize: 13, color: UI.text2, lineHeight: 1.65 }}>{t('dp.planEmpty')}</div>
                  )}
                </div>
  ) : null

  // 各省名额竞争(Frank 2026-08-12:「很多人不知道竞争激烈程度,我们有这个数据并且是最新的」)。
  // 9 省同口径、来源同一份 IRCC 开放数据 —— 所以敢横着比、敢排序。
  // 无岗态摆在「可行通道初评」**上面**(2026-08-13 Frank:「竞争对初评也有影响吧」——
  // 初评的排序就带竞争度,先看松紧再看结论);带岗态留在页尾事实区。
  // 同列同口径的日期不逐行重复(2026-08-14 Frank「年份月份要拆出来吧」):存量快照月与学签最新月
  // 全表一致 → 挪进**表头**灰字(拆独立列会得到一整列同一个值);名额年度逐省不同(ON/BC/AB/SK/MB/NS
  // 2026、NB/NL/PE 2025)→ 必须留在行内;「本站更新」整列同一天 → 撤列并进脚注。
  const poolAsOf = competition.find((r) => r.poolYear)?.poolYear
  const flowPeriod = competition.find((r) => r.flow)?.flow?.period
  const compGen = competition[0]?.generated
  // 存量拆成学签/工签两列(2026-08-14 Frank;访客旅游签从不在 pool 里)。
  // 旧库行还没带拆分字段 → 回退单列合计,seed 刷新后自动变两列
  const hasSplit = competition.some((r) => r.poolStudy != null && r.poolWork != null)
  const thSub = (main: React.ReactNode, sub?: string | null) => (
    <span>{main}{sub ? <span style={{ color: UI.text3, fontSize: 11, fontWeight: 400, marginLeft: 5 }}>{sub}</span> : null}</span>
  )
  // 年份视图取数:格值与排序共用一套(缺位 null → 显「—」、排序沉底)
  const yStock = (r: ProvCompetition, k: 'study' | 'work') => r.series?.stocks?.[compYear]?.[k] ?? null
  // 存量快照月随数据走(方案C:StatCan 季度口径,年末=Y-12、进行年=最新季度月如 2026-04,不再硬拼 -12)
  const yStockAsOf = compYear
    ? (competition.find((r) => r.series?.stocks?.[compYear]?.asOf)?.series?.stocks?.[compYear]?.asOf ?? `${compYear}-12`)
    : null
  const yQuota = (r: ProvCompetition) => (compYear === '2024' ? r.series?.quota.y2024 : compYear === '2025' ? r.series?.quota.y2025 : compYear === '2026' ? r.series?.quota.y2026 : null) ?? null
  const yFlow = (r: ProvCompetition) => r.series?.flow?.[compYear]?.n ?? null
  // 年份视图竞争比:**三列同年齐才算**(存量学+工 ÷ 该年名额,舍入口径与 04e 一致)。
  // 方案C 后三个年份的存量全有(StatCan 季度),该年名额在的行都能算;NB/PE 缺名额年份自动「—」
  const yRatio = (r: ProvCompetition) => {
    const s = yStock(r, 'study'), w = yStock(r, 'work'), q = yQuota(r)
    return s != null && w != null && q ? Math.round(((s + w) / q) * 10) / 10 : null
  }
  const numOrDash = (v: number | null) => (v == null ? <span style={{ color: UI.text3 }}>—</span> : <span>{v.toLocaleString('en-CA')}</span>)
  const yFlowPeriod = compYear ? competition.find((r) => r.series?.flow?.[compYear])?.series?.flow?.[compYear]?.period : undefined
  const competitionCard = competition.length > 0 ? (
    <div style={CARD}>
      <h2 style={H2}>{t('dp.compTitle')}</h2>
      {/* 年份筛选 chips:点选切年,再点取消回现行口径(现行=存量最新+当年名额的比值表) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '2px 0 10px' }}>
        {['2024', '2025', '2026'].map((y) => (
          <button key={y} type="button" onClick={() => setCompYear(compYear === y ? '' : y)}
            style={{ ...BTN, ...(compYear === y ? { borderColor: UI.primary, color: UI.primary, background: '#eff6ff', fontWeight: 600 } : {}) }}>
            {y}
          </button>
        ))}
      </div>
      <style>{`@media(max-width:640px){.dpCompTbl{display:none}}@media(min-width:641px){.dpCompCards{display:none}}`}</style>
      <div className="dpCompCards">
        {competition.map((r) => (
          <div key={r.province} style={{ borderTop: `1px solid ${UI.hairline}`, padding: '8px 0', display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 13.5, color: '#111827' }}>{provDisp(r.province)}</b>
            <span style={{ color: UI.text3, fontSize: 11.5 }}>{r.province}</span>
            <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.ratio}:1</span>
            <span style={{ width: '100%', color: UI.text3, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>
              {compYear ? (
                <>
                  {t('dp.compStudy')} {yStock(r, 'study')?.toLocaleString('en-CA') ?? '—'}　{t('dp.compWork')} {yStock(r, 'work')?.toLocaleString('en-CA') ?? '—'}
                  　{t('dp.compFlow')} {yFlow(r)?.toLocaleString('en-CA') ?? '—'}
                </>
              ) : (
                // ÷ 算式与「截至…累计」不逐行念(2026-08-15 Frank「计算公式不用每个卡片都算一遍」):
                // 公式、存量快照月、累计口径都在脚注写一次,行内只留带短标签的值;名额年份逐省不同留行内
                <>
                  {t('dp.compPool')} {r.pool.toLocaleString('en-CA')}　{t('dp.compQuota')} {r.quota.toLocaleString('en-CA')} {r.quotaYear || ''}
                  {r.flow ? `　${t('dp.compFlow')} ${r.flow.n.toLocaleString('en-CA')}` : ''}
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="dpCompTbl">
        <DataTable<ProvCompetition> rows={competition} rowKey={(r) => r.province} bare
          cols={[
            { key: 'province', label: t('dp.prov'), width: '24%', sort: (r) => provDisp(r.province), render: (r) => (
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provDisp(r.province)}</span>
                <span style={{ color: UI.text3, fontSize: 11.5, flexShrink: 0 }}>{r.province}</span>
              </span>
            ) },
            // 存量快照月全表一致 → 表头灰字(写到月:与学签的月度粒度对齐,光写年份会误导粒度);
            // 拆分态两列共享同一快照月,月份落脚注不逐列重复。
            // 年份视图(compYear):三列数字切到该年,官方缺位显「—」(存量停在 2024,25/26 无年末数)
            ...(hasSplit
              ? [
                  { key: 'poolStudy', label: thSub(t('dp.compStudy'), yStockAsOf), width: '14%', align: 'right' as const,
                    sort: (r: ProvCompetition) => (compYear ? yStock(r, 'study') : r.poolStudy),
                    render: (r: ProvCompetition) => (compYear ? numOrDash(yStock(r, 'study')) : <span>{r.poolStudy!.toLocaleString('en-CA')}</span>) },
                  { key: 'poolWork', label: thSub(t('dp.compWork'), yStockAsOf), width: '14%', align: 'right' as const,
                    sort: (r: ProvCompetition) => (compYear ? yStock(r, 'work') : r.poolWork),
                    render: (r: ProvCompetition) => (compYear ? numOrDash(yStock(r, 'work')) : <span>{r.poolWork!.toLocaleString('en-CA')}</span>) },
                ]
              : [
                  { key: 'pool', label: thSub(t('dp.compPool'), poolAsOf || null), width: '20%', align: 'right' as const, sort: (r: ProvCompetition) => r.pool,
                    render: (r: ProvCompetition) => <span>{r.pool.toLocaleString('en-CA')}</span> },
                ]),
            // 名额年度**逐省不同**(ON/BC/AB/SK/MB/NS 2026、NB/NL/PE 2025)—— 现行视图留行内;年份视图切该年配额
            { key: 'quota', label: thSub(t('dp.compQuota'), compYear || null), width: '18%', align: 'right',
              sort: (r) => (compYear ? yQuota(r) : r.quota),
              render: (r) => (compYear
                ? numOrDash(yQuota(r))
                : <span>{r.quota.toLocaleString('en-CA')}<span style={{ color: UI.text3, fontSize: 11.5, marginLeft: 5 }}>{r.quotaYear || ''}</span></span>) },
            // 竞争比:现行口径用 04e 算好的 r.ratio;年份视图三列同年齐才现算(yRatio),缺存量的年份「—」不硬算
            { key: 'ratio', label: t('dp.compCol'), width: '14%', align: 'right', sort: (r) => (compYear ? yRatio(r) : r.ratio),
              render: (r) => { const v = compYear ? yRatio(r) : r.ratio; return v == null ? <span style={{ color: UI.text3 }}>—</span> : <b>{v}:1</b> } },
            // 流量列:存量停在 2024,这是唯一反映当期的官方数字。**不参与比值**,页脚点明
            // 「2026-05」裸挂会被读成单月数(2026-08-14 Frank 实问)——它是**年初至今累计**(source: throughMonth)
            { key: 'flow', label: thSub(t('dp.compFlow'), compYear
                ? (yFlowPeriod && yFlowPeriod.includes('-') ? t('dp.compFlowP', { p: yFlowPeriod }) : compYear)
                : flowPeriod ? t('dp.compFlowP', { p: flowPeriod }) : null), width: '22%', align: 'right',
              sort: (r) => (compYear ? yFlow(r) : r.flow?.n ?? null),
              render: (r) => (compYear
                ? numOrDash(yFlow(r))
                : r.flow ? <span>{r.flow.n.toLocaleString('en-CA')}</span> : <span style={{ color: UI.text3 }}>—</span>) },
          ]} />
      </div>
      {/* 口径脚注一行说完(2026-08-13 Frank:「改成一行」);本站更新整列同一天 → 撤列并进这行 */}
      <div style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.6, marginTop: 8 }}>{t('dp.compNoteShort', { d: compGen ?? '', m: poolAsOf ?? '', p: flowPeriod ?? '' })}</div>
    </div>
  ) : null

  // 问卷 = **一个弹框、两段**(2026-08-13 Frank:「开始估分不应该和申请人条件合并到一起吗?
  // 为什么单独一个弹框」):基础段(职业/8 项/省份)答完直接翻进估分段,不关框、不换框。
  // 两段计数拍板(08-10)不动:段内各自报数(已答 n/8 → 估分 n/9),谁的总数都不跳。
  // 弹框壳**不能用 <Modal>**:分值卡的答案与结果都在它的本地 state,同一个实例既要在框里出题、
  // 又要在收框后于「申请人条件」卡内出结果 —— 搬容器 = React 重挂 = 答案清零。所以这里不搬树,
  // 只**就地换皮**:同一对 div,quizOpen 时套统一壳的遮罩/白卡 token(SCRIM/CARD 同源),
  // 收框时退回普通块。Esc/点遮罩退出与统一壳同款;手机全屏,.quizBar 固定在视口底。
  // 无岗态本段长在条件摘要卡尾部;带岗态经 scoreSlot 长在判定卡②「你的条件」尾部 —— 两态互斥。
  const quizSection = (
    // 卡内不再有任何估分入口行(2026-08-13 Frank:「只要一个修改按钮」)——收框态这里只剩
    // 「各省估分」结果(答满才有),分隔线也只在那时画
    <div style={!quizShow && scoreProgress && scoreLeft === 0 ? { marginTop: 14, paddingTop: 12, borderTop: `1px solid ${UI.hairline}` } : undefined}>
      <QuizStyle />
      {/* 未登录拦在壳外:标准 AuthModal(与顶栏同款),关掉=放弃答题,完成=原地接开答题 */}
      {quizOpen && me === false ? (
        <AuthModal t={t} mode="register" hero={t('dp.authGate')} onClose={() => setQuizOpen(false)}
          onDone={() => { setMe(true); quizToProfile(readAnswers()) }} />
      ) : null}
      <div onClick={quizShow ? closeQuiz : undefined}
        style={quizShow ? { ...SCRIM, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: narrow ? 0 : 16 } : undefined}>
        <div onClick={quizShow ? (e) => e.stopPropagation() : undefined}
          style={quizShow ? (narrow
            ? { ...OVERLAY_CARD, borderRadius: 0, width: '100%', height: '100%', maxHeight: '100vh', overflowY: 'auto', padding: '20px 14px 16px' }
            : { ...OVERLAY_CARD, width: 'min(760px, 100%)', maxHeight: '85vh', overflowY: 'auto', padding: '24px 24px 20px' }) : undefined}>
          {quizShow ? (
            <>
              {/* 右上角:重置 + 关闭(重置沿用 IconRefresh 同款,2026-08-12 Frank「改成图标和右上角对齐」) */}
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, zIndex: 20 }}>
                <button type="button" style={iconBtnS} title={t('plan.reset')} aria-label={t('plan.reset')}
                  onClick={() => {
                    setBands(clearAnswers()); setNoc(''); setResetNonce((n) => n + 1); setOccStep(true); setProvinceStep(false); setScoreStep(false); setScoreProgress(null); setScoreEcho([]); setFormAtEnd(false)
                    track('dp-quiz-reset')
                  }}><IconRefresh /></button>
                <button onClick={closeQuiz} aria-label="close" style={iconBtnS}>×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 84, marginBottom: 12 }}>
                <h2 style={{ ...H2, margin: 0 }}>{t('dp.quiz')}</h2>
                {countPills}
              </div>
              {/* 进度条归弹框头,一条杠走完 17 项(分值卡自己不画) */}
              <div aria-label={`${doneAll}/${totalAll}`}
                style={{ height: 4, borderRadius: 999, background: UI.hairline, overflow: 'hidden', margin: '0 0 18px' }}>
                <div style={{ width: `${Math.round((doneAll / Math.max(totalAll, 1)) * 100)}%`,
                  height: '100%', borderRadius: 999, background: UI.primary, transition: 'width .2s' }} />
              </div>
            </>
          ) : null}
          {quizShow && !scoreStep ? (
            <div ref={quizRef}>
              {(occStep || !noc) ? (
                <div className="plQuizPad">
                  <QuizTitle>{t('quiz.q2')}</QuizTitle>
                  <div style={{ fontSize: 12.5, color: UI.text3, margin: '-10px 0 13px', lineHeight: 1.55 }}>{t('quiz.q2sub')}</div>
                  {/* initialTop:服务端已按在招量取好的热门榜 → 控件首帧即终态,一个请求都不发 */}
                  <OccPicker key={resetNonce} inline t={t} lang={lang} initial={bands.nocs} doneLabel={t('plan.next')} initialTop={topNocs}
                    onChange={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || '') }}
                    onDone={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || ''); setOccStep(false); setProvinceStep(false); setFormAtEnd(false) }} />
                </div>
              ) : provinceStep ? (
                <div className="plQuizPad">
                  {/* 省份是基础段最后一题:答完由 onQuizDone 决定 —— 还有估分题就翻进估分段,答满才收框 */}
                  <ProvincePicker key={`${resetNonce}:provinces`} t={t} initial={bands.provs} unsure={bands.provsAny}
                    onChange={(provs) => setBands(writeAnswers({ provs }))}
                    onBack={() => { setProvinceStep(false); setFormAtEnd(true) }}
                    onDone={(provs, any) => { setBands(writeAnswers({ provs, provsAny: !!any })); onQuizDone() }} />
                </div>
              ) : (
                <div className="plQuizPad">
                  <QuizForm key={`${resetNonce}:${formAtEnd ? 'end' : quizFocus ? `f:${quizFocus}` : 'auto'}`} decision="pr" stage="basic" lang={lang} t={t} answers={bands} doneKey="plan.next" startAtEnd={formAtEnd} startAt={quizFocus || undefined}
                    finishLabel={quizComplete ? t('ps.finish') : undefined} onFinish={finishQuiz}
                    onBack={() => { setOccStep(true); setFormAtEnd(false) }}
                    onPatch={(patch) => setBands(writeAnswers(patch))}
                    onComplete={() => { setProvinceStep(true); setFormAtEnd(false) }} />
                </div>
              )}
            </div>
          ) : null}
          {/* 估分段还在等分值表(答完省份的那一两拍):加载区必占位 */}
          {quizShow && scoreStep && quizComplete && !scoreTables ? (
            <div aria-hidden style={{ height: 120, borderRadius: 9, background: UI.bg }} />
          ) : null}
          {/* 分值卡**常驻**(答案/结果全在它的本地 state):基础段答题时只藏不卸载;
              收框后它就地变回卡内的「各省估分」结果区 */}
          <div className={quizShow && scoreStep ? 'plQuizPad' : undefined}
            style={quizOpen && !(quizShow && scoreStep) ? { display: 'none' } : undefined}>
            {quizComplete && targetFactors.length > 0 ? (
              <PnpScoreCard key={scoreKey} t={t} lang={lang}
                ctx={{ noc: tvJob?.noc || noc, teer: targetTeer, province: scoreContextProvince, city: tvJob?.city || '', hasOffer: ctxHasOffer }}
                factors={targetFactors} draws={scoreDraws}
                streams={tvJob && tvJob.pnpStream ? { [scoreContextProvince]: tvJob.pnpStream } : {}}
                initial={scoreInitial} hiddenProfileInputs={hiddenScoreInputs} limits={scoreLimits} targetMode
                questionnaireActive={quizShow && scoreStep}
                focusQuestion={scoreFocus}
                onQuestionnaireProgress={onScoreProgress}
                onQuestionnaireAnswers={onScoreAnswers}
                onQuestionnaireComplete={onScoreComplete}
                onQuestionnaireBack={onScoreBack} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="pathways" />
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <div style={{ width: '100%' }}>
            {/* PR 评估是顶栏一级页:banner 与全部卡片统一使用 PageShell 1320px 页面轨,不放历史返回按钮。 */}
            <PageBanner module="pathways" title={t('plan.pr.title')} sub={t('dp.sub')} images={BANNER_IMGS.pathways} />

            {/* 我的评估条件摘要卡片。
                **带岗进来时整张不出**(2026-08-12 B2/A3,Frank 实拍指「重复」):判定卡里已经有
                「按你答的 n/N 项判定 · 改答案」那一行,同屏再摆一张「你的条件」就是两个输入面
                —— 设计 §5「输入面只留一个,多一个就又是两套主语」。无岗态照旧。 */}
            {!tvJob && (
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {/* 标题永不折行(英文态 375 上「Your details」被计数胶囊挤成两行);
                      真放不下时让胶囊换行,标题保持一行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h2 style={{ ...H2, margin: 0, whiteSpace: 'nowrap' }}>{t('dp.quiz')}</h2>
                    {countPills}
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
                  <button onClick={() => startQuiz()}
                    style={stepDone === 0
                      ? { ...BTN, background: UI.primary, color: '#fff', border: `1px solid ${UI.primary}`, fontWeight: 600, padding: '6px 16px', fontSize: 13 }
                      : { ...BTN, background: !allDone ? '#eff6ff' : '#fff', color: !allDone ? UI.primary : UI.text, border: `1px solid ${!allDone ? UI.primary : UI.border}`, fontWeight: 600 }}>
                    {t(allDone ? 'plan.back' : stepDone > 0 ? 'dp.resume' : 'dp.start')}
                  </button>
                </span>
              </div>
              {/* 每格可点、直达那道题;省专属题按省分 tab(ConditionGrid,与带岗态判定卡②共用) */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${UI.hairline}` }}>
                <ConditionGrid rows={conditionSummary} provLabel={provDisp} ariaLabel={t('dp.prov')} idPrefix="dpCond"
                  onTile={(key) => startQuiz(key)} />
              </div>
              {quizSection}
            </div>
            )}

            {/* 卡序:初评在前、竞争表随后(2026-08-14 Frank:「这个放到各省竞争名额上面吧」——
                结论先行,支撑它的竞争数据紧跟其后;此前一日的「竞争在初评上面」被本条取代) */}
            {!tvJob && planCard}
            {!tvJob && competitionCard}

            {/* 带岗进入后,三项判定就是本页结果,不再自动套一层弹窗。条件在上、结果在下,修改后原地重算。
                **必须等 ready**:quizOpen 初值是 false,不等读完 localStorage 就渲染的话,新用户首帧先看到
                这块判定面板、水合后又被答题卡顶掉 —— 闪一下不说,还白打一次 tv-open + 一次
                /api/triple-verdict 请求,把「有多少人真看了判定」这个数顶虚(2026-08-11 umami session 实录)。 */}
            {/* 服务端已经把判定算好了(initialVerdict)就**不必等 ready**:ready 那道闸是为了防
                「首帧先渲判定、水合后被答题卡顶掉」的闪烁,而带岗态如今根本不摆答题卡,顶不掉。
                有 initialVerdict = 这一段真的进 SSR HTML,首屏不再是空白 + 骨架。 */}
            {/* 面板**常驻不卸载**(问卷弹框的壳与分值卡如今都并在判定卡②里,scoreSlot):
                开弹框时不藏面板 —— 藏了连弹框一起看不见,遮罩本来就盖在它上面。
                顺带修掉旧行为里每开关一次弹窗就重挂面板、重打一次 tv-open + /api/triple-verdict 的毛病。 */}
            {(ready || !!initialVerdict) && tvJob && <div><TripleVerdictPanel job={tvJob} lang={lang} profileComplete={quizComplete} refreshKey={verdictNonce}
              initial={initialVerdict}
              countPills={countPills}
              answerList={conditionSummary}
              planSlot={planCard} scoreSlot={quizSection}
              onBuildProfile={() => {
                // 弹窗自己就在视口正中,不用再滚页面(内联时代的 scrollIntoView 已撤)
                setQuizOpen(true); setOccStep(true); setProvinceStep(false); setScoreStep(false); setFormAtEnd(false); track('tv-build-profile')
              }}
              // 「修改」= 与摘要卡同一颗唯一入口:落在第一道没答的题(估分有欠账直接落估分段)
              onEditAnswers={startQuiz} /></div>}

            {/* 「其余所选省份」卡 2026-08-13 Frank 拍板删除(「我觉得没必要吧」):
                估分结果的省份 tabs 自己就说明了覆盖哪几个省,单独一张卡交代「哪些省没表」是重。 */}

            {/* 「已有 offer 或看中的岗位?」CTA 卡 2026-08-13 Frank 拍板删除(「这个也删了吧」)——
                挑岗入口顶栏职位板本来就有,单独一张卡在决策页上是重复入口。 */}
            {/* 常见案例卡 2026-08-13 Frank 迁出(「放到其他页面比较好」):16 条处境挪到 /cases 索引页
                (顶栏资料库入口),决策页收窄成动线。行形态与四刀终态原样在那边保留。 */}

            {/* 带岗态:名额竞争留在事实区(判定卡流里插九省大表会把结论挤走);
                无岗态它已上移到「可行通道初评」上面 */}
            {tvJob ? competitionCard : null}

            {/* 该职业分省竞争(Frank 2026-08-12:「还需要加相关职业各省市的竞争比」)。
                🔴 职业级的「几人抢一个」**没有任何官方源发布**,本站不编 —— 这里摆三个实数:
                在招岗数、近 30 天新增、平均在招天数(挂多久被撤:越短越抢手),外加该省的名额竞争。
                四列不合成分数:合成就是替用户拿主意,而且没有官方口径支持那种合成。 */}
            {noc && occComp && occComp.length > 0 && (
              <div style={CARD}>
                <h2 style={H2}>{t('dp.occCompTitle')}</h2>
                {/* 职业切换(2026-08-14 Frank「需要分职业吧」):选了几个职业就给几个 chip,
                    单职业不渲——一颗孤 chip 只是噪音 */}
                {bands.nocs.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '2px 0 10px' }}>
                    {bands.nocs.map((code) => {
                      const active = (occNoc || noc) === code
                      return (
                        <button key={code} type="button" onClick={() => setOccNoc(code)}
                          style={{ ...BTN, ...(active ? { borderColor: UI.primary, color: UI.primary, background: '#eff6ff', fontWeight: 600 } : {}) }}>
                          {occName(code)}
                        </button>
                      )
                    })}
                  </div>
                )}
                <style>{`@media(max-width:640px){.dpOccTbl{display:none}}@media(min-width:641px){.dpOccCards{display:none}}`}</style>
                <div className="dpOccCards">
                  {occComp.map((r) => (
                    <div key={r.province} style={{ borderTop: `1px solid ${UI.hairline}`, padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <b style={{ fontSize: 13.5, color: '#111827' }}>{provDisp(r.province)}</b>
                        <span style={{ color: UI.text3, fontSize: 11.5 }}>{r.province}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.openJobs}</span>
                      </div>
                      {/* 竞争比不再第三处重复(2026-08-15 随初评表格化):初评与竞争卡已各有一份 */}
                      <div style={{ color: UI.text3, fontSize: 11.5, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                        {t('dp.occNew30')} {r.new30d ?? '—'}　{t('dp.occDays')} {r.avgDaysOpen ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="dpOccTbl">
                  <DataTable<OccCompetitionRow> rows={occComp} rowKey={(r) => r.province} bare
                    cols={[
                      { key: 'province', label: t('dp.prov'), width: '28%', sort: (r) => provDisp(r.province), render: (r) => (
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provDisp(r.province)}</span>
                          <span style={{ color: UI.text3, fontSize: 11.5, flexShrink: 0 }}>{r.province}</span>
                        </span>
                      ) },
                      { key: 'open', label: t('stats.openJobs'), width: '18%', align: 'right', sort: (r) => r.openJobs, render: (r) => <b>{r.openJobs.toLocaleString('en-CA')}</b> },
                      { key: 'new30', label: t('dp.occNew30'), width: '18%', align: 'right', sort: (r) => r.new30d, render: (r) => r.new30d == null ? '—' : r.new30d.toLocaleString('en-CA') },
                      { key: 'days', label: t('dp.occDays'), width: '18%', align: 'right', sort: (r) => r.avgDaysOpen, render: (r) => r.avgDaysOpen == null ? '—' : r.avgDaysOpen },
                    ]} />
                </div>
                <div style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.6, marginTop: 8 }}>{t('dp.occCompNote')}</div>
              </div>
            )}

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
                      { key: 'prov', label: t('dp.prov'), width: '24%', sort: (r) => provDisp(r.province), render: (r) => (
                        <span title={provDisp(r.province)} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provDisp(r.province)}</span>
                          <span style={{ color: UI.text3, fontSize: 11.5, flexShrink: 0 }}>{r.province}</span>
                        </span>
                      ) },
                      { key: 'date', label: t('rpt.s.d.date'), width: '20%', nowrap: true, sort: (r) => r.drawDate, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', color: UI.text2, fontSize: 12.5 }}>{r.drawDate}</span> },
                      // 走查 #297:官方通道名截断(「Alberta Express Entry Stream – Priority Sectors (Constructio…」)。
                      // 英文界面拿到的就是官方原名,我们**没有权力**给它编个短名 —— 放不下就换行,不截。
                      { key: 'stream', label: t('rpt.s.d.stream'), width: '32%', render: (r) => (
                        <span style={{ display: 'block', color: UI.text2, overflowWrap: 'anywhere' }}>{streamDisplay(t, r.stream)}</span>
                      ) },
                      // 邀请数:这张表的入选条件是「有分数线**或**有邀请数」—— 只摆分数线的话,
                      // 靠邀请数入选的行(NL/MB/NB)整行都是「—」,把它入选的那个事实藏了
                      { key: 'inv', label: t('rpt.s.d.inv'), width: '12%', align: 'right', nowrap: true, sort: (r) => r.invitations,
                        render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', color: UI.text2 }}>{r.invitations ?? '—'}</span> },
                      { key: 'score', label: t('rpt.s.d.score'), width: '12%', align: 'right', sort: (r) => r.score, render: (r) => <>{r.score ?? '—'}</> },
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
