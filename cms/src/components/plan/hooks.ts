'use client'
/**
 * plan 域(/plan/pr 决策页)的状态机器:登录闸、答案态、问卷动线、估分段、
 * 冷门职业名补全、初评取数、分值表懒取、职业竞争取数、年份筛选,以及把它们装成
 * 一台整机的 useDecisionPage。体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂里
 * (注释即它们的 JSDoc),这里只剩 useState、具名 effect 壳与工厂装配
 * (形制同 news 的 useNewsDetail 与 account 的 useAccountPage)。
 * 2026-08-28 换装批自 Decision.tsx 的组件体收进来。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { EMPTY, readAnswers, readScoreAnswers } from '@/lib/quiz'
import { COMP_YEAR_DEFAULT, KEY_JOIN_SEP, TEXT_NONE } from './constants'
import {
  actsOf, baseDoneOf, bumpNonce, firstNocOf, ignoreFailure, makeCloseQuiz, makeEscEffect, makeFocusBump,
  makeMeEffect, makeMountEffect, makeNocTitlesEffect, makeOccCompEffect, makePathsEffect, makePullEffect,
  makeScrollEffect, makeTablesEffect, makeYearPickOf, occTargetOf, pathInputKeyOf, planViewOf, progressOf,
  provAnsweredOf,
  emptyByProv, firstUnansweredOf, hasSplitWorkOf, healedExtraOf, initialAreaOf, initialHasOfferOf,
  initialOfferTouchedOf, initialProfileOf, initialRowAnswersOf, initialTicksOf, initialWageOf, makeByProvEffect,
  makeScorePullEffect, questionIndexOf, scoreActsOf, scoreCardInitialOf, scoreCardLimitsOf, scoreCardMachineOf,
  scoreFocusOf, scoreHiddenOf, scoreNocOf, scoreProfileClbOf, writeScoreStore,
} from './functions'
import type {
  AnswerStatePanel, AuthGatePanel, CompYearPanel, DecisionPageIn, DecisionPanel, NocTitlesIn, NocTitlesPanel,
  OccCompIn, OccCompPanel, OutsidePath, PathsIn, PathsPanel, PlanAnswers, PlanLang, PlanOccComp, ProfilePath,
  QuizChromeEscIn, QuizChromeIn, QuizFlowPanel, QuizPadPanel, ScoreEchoRow, ScoreFocus, ScoreProgress, ScoreRowsAnswer,
  ScoreStatePanel,
  ScoreTables, ScoreTablesIn, MountSyncIn,
  PlanJobCount, PlanSelfProfile, PnpScoreCardIn, ScoreAnswerPanel, ScoreAnswerStateIn, ScoreCardEchoRow,
  ScoreCardPanel, ScoreEchoIn, ScorePagerIn, ScoreProfilePanel, ScoreProfileStateIn, ScoreSyncIn,
} from './types'

/**
 * 答题闸(2026-08-14 Frank「答题之前还是需要用户先注册」):未登录先注册/登录再答,
 * 答案从第一题起就有档可落。null = 还没问回来 —— 闸先关,加载区占位,不闪答题卡。
 *
 * @returns 登录了没有 + 就地放行的口子。
 */
export function useAuthGate(): AuthGatePanel {
  const [me, setMe] = useState<boolean | null>(null)
  const panel: AuthGatePanel = { me, setMe }
  useEffect(function loadMe() {
    makeMeEffect({ auth: panel })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载问一次登录态;setMe 稳定,panel 每渲染重建但只用它的 setMe
  }, [])
  return panel
}

/**
 * 答案态:答案唯一来源是 lib/quiz 的答案档,这里只是它在页面上的投影。
 * 本地答案 → 页面状态的重建(挂载、服务端档拉回、注册闸放行三处共用一套,不许各抄一份)。
 *
 * @returns 答案档、当前职业、两个分页开关、就绪位与重建口。
 */
export function useAnswerState(): AnswerStatePanel {
  const [bands, setBands] = useState<PlanAnswers>(EMPTY)
  const [noc, setNoc] = useState(TEXT_NONE)
  const [occStep, setOccStep] = useState(true)
  const [provinceStep, setProvinceStep] = useState(false)
  const [ready, setReady] = useState(false)
  const refresh = useCallback(function refreshFromStore(): PlanAnswers {
    const a = readAnswers()
    setBands(a)
    setNoc(firstNocOf(a))
    setOccStep(a.nocs.length === 0)
    setProvinceStep(a.nocs.length > 0 && baseDoneOf(a) && provAnsweredOf(a) === false)
    return a
  }, [])
  return { bands, setBands, noc, setNoc, occStep, setOccStep, provinceStep, setProvinceStep, ready, setReady, refresh }
}

/**
 * 问卷动线:答题卡默认收起(Frank「上来有必要让人测分数吗」——不逼人考试,一行入口自愿点开);
 * 「开始评估/继续作答/改答案」展开,答完自动收回。
 *
 * @returns 开关、段落、落点、两枚重挂序号与两个量尺。
 */
export function useQuizFlowState(): QuizFlowPanel {
  const [open, setOpen] = useState(false)
  const [scoreStep, setScoreStep] = useState(false)
  const [focus, setFocus] = useState(TEXT_NONE)
  const [atEnd, setAtEnd] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [verdictNonce, setVerdictNonce] = useState(0)
  const bumpReset = useCallback(function bumpReset(): void {
    setResetNonce(bumpNonce)
  }, [])
  const bumpVerdict = useCallback(function bumpVerdict(): void {
    setVerdictNonce(bumpNonce)
  }, [])
  return {
    open,
setOpen,
scoreStep,
setScoreStep,
focus,
setFocus,
atEnd,
setAtEnd,
    resetNonce,
    bumpReset,
    verdictNonce,
    bumpVerdict,
  }
}

/**
 * 题区的两把量尺。**单独一台**,不混进问卷动线:ref 不是渲染要用的值,
 * 与状态混在一个对象里,读它旁边那格状态都会被 react-hooks/refs 判成「渲染期读 ref」。
 *
 * @returns 题区容器与「这一轮对齐过没有」。
 */
export function useQuizPad(): QuizPadPanel {
  const padRef = useRef<HTMLDivElement | null>(null)
  const shownRef = useRef(false)
  return { padRef, shownRef }
}

/**
 * 估分段:分值卡回报的题数与逐题答案、它本地存档里的勾选与直选档位、当前页签省、
 * 分值题落点,以及懒取回来的官方分值表。
 *
 * @returns 估分段的全部状态与写口。
 */
export function useScoreState(): ScoreStatePanel {
  const [progress, setProgress] = useState<ScoreProgress | null>(null)
  const [echo, setEcho] = useState<ScoreEchoRow[]>([])
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [rowsAns, setRowsAns] = useState<ScoreRowsAnswer>({ rowAnswers: {} })
  const [prov, setProv] = useState(TEXT_NONE)
  const [focus, setFocus] = useState<ScoreFocus | null>(null)
  const [tables, setTables] = useState<ScoreTables | null>(null)
  const bumpFocus = useCallback(function bumpFocus(key: string): void {
    setFocus(makeFocusBump({ key }))
  }, [])
  return {
    progress,
setProgress,
echo,
setEcho,
ticks,
setTicks,
rowsAns,
setRowsAns,
    prov,
setProv,
focus,
bumpFocus,
tables,
setTables,
  }
}

/**
 * 冷门职业名按码补全。
 *
 * @param x 职业码清单与界面语言。
 * @returns 已经补全到手的名字。
 */
export function useNocTitles(x: NocTitlesIn): NocTitlesPanel {
  const [titles, setTitles] = useState<Record<string, string>>({})
  useEffect(function loadTitles() {
    return makeNocTitlesEffect({ nocs: x.nocs, lang: x.lang, setTitles })()
  }, [x.nocs, x.lang])
  return { titles }
}

/**
 * 初评取数:输入键刻意收窄成引擎真正消费的那几格,改答案后原地重算。
 *
 * @param x 就绪位、职业码、答案档、勾选与直选档位。
 * @returns 通道行与省外提示。
 */
export function usePaths(x: PathsIn): PathsPanel {
  const [paths, setPaths] = useState<ProfilePath[] | null>(null)
  const [outside, setOutside] = useState<OutsidePath | null>(null)
  const key = [String(x.ready), x.noc, pathInputKeyOf(x)].join(KEY_JOIN_SEP)
  const [seen, setSeen] = useState(key)
  if (key !== seen) {
    setSeen(key)
    setPaths(null)
  }
  useEffect(function loadPaths() {
    if (x.ready === false || x.noc === TEXT_NONE) {
      return ignoreFailure
    }
    return makePathsEffect({ bands: x.bands, ticks: x.ticks, rowsAns: x.rowsAns, setPaths, setOutside })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key 是刻意收窄的重算边界;bands 每写一次答案就换引用,不能直接当依赖
  }, [key])
  return { paths, outside }
}

/**
 * 分值表懒取 + 两处兜底清账:省码串空了(目标省答的是「还不确定」)就把表清回「还没取到」。
 *
 * @param x 估分段、省码串、门控与带岗那份工作。
 * @returns 无(写进估分段)。
 */
export function useScoreTablesSync(x: ScoreTablesIn): void {
  const off = x.provKey === TEXT_NONE || (x.quizComplete === false && x.tvJob == null)
  const [seen, setSeen] = useState(off)
  if (off !== seen) {
    setSeen(off)
    if (off) {
      x.score.setTables(null)
    }
  }
  const setTables = x.score.setTables
  useEffect(function loadTables() {
    if (off) {
      return ignoreFailure
    }
    return makeTablesEffect({ provKey: x.provKey, setTables })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 与原口径同:省码串、门控、带岗三样任一变就重取
  }, [x.provKey, x.quizComplete, x.tvJob])
}

/**
 * 该职业分省竞争取数(2026-08-14 Frank「需要分职业吧」):默认第一职业,选了就看谁。
 *
 * @param x 全页当前职业码。
 * @returns 分省竞争行与这张表自己的职业开关。
 */
export function useOccComp(x: OccCompIn): OccCompPanel {
  const [rows, setRows] = useState<PlanOccComp[] | null>(null)
  const [noc, setNoc] = useState(TEXT_NONE)
  const target = occTargetOf({ noc: x.noc, occNoc: noc })
  const [seen, setSeen] = useState(target)
  if (target !== seen) {
    setSeen(target)
    if (target === TEXT_NONE) {
      setRows(null)
    }
  }
  useEffect(function loadOccComp() {
    if (target === TEXT_NONE) {
      return ignoreFailure
    }
    return makeOccCompEffect({ noc: target, setRows })()
  }, [target])
  return { rows, noc, setNoc }
}

/**
 * 竞争卡的年份筛选。默认停在 2025(2026-08-15 Frank「默认选择 2025 吧」);
 * 再点一次 2025 可回「现行口径」。
 *
 * @returns 当前年份与点击手柄工厂。
 */
export function useCompYear(): CompYearPanel {
  const [year, setYear] = useState(COMP_YEAR_DEFAULT)
  return { year, pickOf: makeYearPickOf({ year, setYear }) }
}

/**
 * 挂载与登录态同步:挂载读本地答案并记一次进页面;真登录了就无条件拉服务端答案档。
 *
 * @param x 登录闸、答案态、问卷动线、估分段与带岗那份工作。
 * @returns 无。
 */
export function useMountSync(x: MountSyncIn): void {
  useEffect(function mount() {
    makeMountEffect(x)()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载跑一次:读本地答案、抹掉一次性参数、记一次进页面
  }, [])
  useEffect(function pullAfterLogin() {
    if (x.auth.me !== true) {
      return
    }
    makePullEffect({ answers: x.answers, score: x.score })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 登录态一变就拉一次,别的依赖变了不该重拉
  }, [x.auth.me])
}

/**
 * 弹框外壳行为:Esc 退出、翻题时把题区顶回视口,以及估分段出不了题时的两处兜底 ——
 * 别把人晾在空框里(2026-08-15 Frank「回答完 8 个题目怎么变成白板了」实拍),
 * 组件都不挂了就把它的计数与格子一并清掉(不然数和格子跟人对不上)。
 *
 * @param x 问卷动线、估分段、两段计数、答案态、省码串与当前页签省的官方因素行。
 * @returns 无。
 */
export function useQuizChrome(x: QuizChromeIn): void {
  const close = makeCloseQuiz({ flow: x.flow })
  const stepEmpty = x.provKey === TEXT_NONE || (x.score.tables != null && x.factors.length === 0)
  const stuck = x.flow.open && x.flow.scoreStep && stepEmpty
  const [stuckSeen, setStuckSeen] = useState(stuck)
  if (stuck !== stuckSeen) {
    setStuckSeen(stuck)
    if (stuck) {
      close()
    }
  }
  const gone = x.score.tables != null && x.factors.length === 0
  const [goneSeen, setGoneSeen] = useState(gone)
  if (gone !== goneSeen) {
    setGoneSeen(gone)
    if (gone) {
      x.score.setProgress(null)
      x.score.setEcho([])
    }
  }
  useEscExit({ flow: x.flow })
  useLayoutEffect(function alignPad() {
    makeScrollEffect({ open: x.flow.open, pad: x.pad })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 估分题已不在弹窗里,题区那时是 null,滚也滚不到,所以段落开关不进依赖
  }, [x.flow.open, x.progress.stepDone, x.answers.occStep, x.answers.provinceStep])
}

/**
 * 弹框壳的 Esc 退出(基础段与估分段一体,关的是整个框)。
 *
 * @param x 问卷动线。
 * @returns 无。
 */
export function useEscExit(x: QuizChromeEscIn): void {
  const open = x.flow.open
  const flow = x.flow
  useEffect(function listenEsc() {
    if (open === false) {
      return ignoreFailure
    }
    return makeEscEffect({ close: makeCloseQuiz({ flow }) })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只跟着开关走;flow 每渲染重建但用到的只有两个稳定 setter
  }, [open])
}

/**
 * 决策页整机:把各分机器并到一起,再把派生视图与手柄一次算好交出去。
 *
 * @param x 带岗那份工作、SSR 直出的三份事实与更新时刻。
 * @returns 整机面板。
 */
export function useDecisionPage(x: DecisionPageIn): DecisionPanel {
  const [lang, , t] = useLang()
  const auth = useAuthGate()
  const answers = useAnswerState()
  const flow = useQuizFlowState()
  const pad = useQuizPad()
  const score = useScoreState()
  const titles = useNocTitles({ nocs: answers.bands.nocs, lang })
  const paths = usePaths({
    ready: answers.ready, noc: answers.noc, bands: answers.bands, ticks: score.ticks, rowsAns: score.rowsAns,
  })
  const occComp = useOccComp({ noc: answers.noc })
  const compYear = useCompYear()
  const progress = progressOf({ answers, score })
  const view = planViewOf({
    t,
lang: lang as PlanLang,
answers,
score,
titles,
paths,
occComp,
compYear,
progress,
    tvJob: x.tvJob,
overview: x.overview,
drawsRecent: x.drawsRecent,
competition: x.competition,
  })
  useScoreTablesSync({ score, provKey: view.prov.provKey, quizComplete: progress.quizComplete, tvJob: x.tvJob })
  useMountSync({ auth, answers, flow, score, tvJob: x.tvJob })
  useQuizChrome({
    flow, pad, score, progress, answers, provKey: view.prov.provKey, factors: view.prov.targetFactors,
  })
  const acts = actsOf({ auth, answers, flow, score, progress, tvJob: x.tvJob, outside: paths.outside })
  return {
    t,
    lang: lang as PlanLang,
    auth,
    answers,
    flow,
    pad,
    score,
    titles,
    paths,
    occComp,
    compYear,
    progress,
    acts,
    view,
    tvJob: x.tvJob,
    updatedAt: x.updatedAt,
  }
}

/**
 * 分值卡「你的条件」的状态格。存档优先于预填(2026-08-15 Frank「选的是本科一刷新就变成高中」
 * 根治):值与「已答」标记必须同存同取,缺一样都是在替他编答案。
 *
 * @param x 基础卷 CLB、答案预填与选项范围。
 * @returns 状态格。
 */
export function useScoreProfileState(x: ScoreProfileStateIn): ScoreProfilePanel {
  const [profile, setProfile] = useState<PlanSelfProfile>(function initProfile(): PlanSelfProfile {
    return initialProfileOf({
      profileClb: x.profileClb, initial: x.initial, limits: x.limits, stored: readScoreAnswers().profile,
    })
  })
  const [profAns, setProfAns] = useState<Partial<PlanSelfProfile>>(function initAnswered(): Partial<PlanSelfProfile> {
    return readScoreAnswers().profile
  })
  return { profile, setProfile, profAns, setProfAns }
}

/**
 * 分值卡逐题答案的状态格。九格全部从 localStorage 起手(2026-08-15 Frank
 * 「学历以下的字段都有这个问题」):此前几个 map 只活在 state,刷新全丢。
 *
 * @param x 岗位语境与拆段开关。
 * @returns 状态格。
 */
export function useScoreAnswerState(x: ScoreAnswerStateIn): ScoreAnswerPanel {
  const [ticks, setTicks] = useState<Record<string, boolean>>(initialTicksOf)
  const [rowAnswers, setRowAnswers] = useState<Record<string, number>>(initialRowAnswersOf)
  const [extraAnswered, setExtraAnswered] = useState<Record<string, boolean>>(function initHealed() {
    return healedExtraOf({ stored: readScoreAnswers(), splitWork: x.splitWork })
  })
  const [wage, setWage] = useState<number>(function initWage(): number {
    return initialWageOf(x.ctx)
  })
  const [areaI, setAreaI] = useState<number>(function initArea(): number {
    return initialAreaOf(x.ctx)
  })
  const [hasOffer, setHasOffer] = useState<boolean>(function initOffer(): boolean {
    return initialHasOfferOf(x.ctx)
  })
  const [offerTouched, setOfferTouched] = useState<boolean>(initialOfferTouchedOf)
  const [at, setAt] = useState(0)
  const [openProv, setOpenProv] = useState<string | null>(null)
  return {
    ticks,
    setTicks,
    rowAnswers,
    setRowAnswers,
    extraAnswered,
    setExtraAnswered,
    wage,
    setWage,
    areaI,
    setAreaI,
    hasOffer,
    setHasOffer,
    offerTouched,
    setOfferTouched,
    at,
    setAt,
    openProv,
    setOpenProv,
  }
}

/**
 * 换省事实:同职业在各省的在招数(/api/quiz?noc= 已有,免费事实,不新增端点)。
 *
 * @param noc 5 位职业码;'' = 无岗态,不查。
 * @returns 按省的在招数。
 */
export function useScoreByProv(noc: string): Record<string, PlanJobCount> {
  const [byProv, setByProv] = useState<Record<string, PlanJobCount>>(emptyByProv)
  useEffect(function loadByProv() {
    return makeByProvEffect({ noc, setByProv })()
  }, [noc])
  return byProv
}

/**
 * 分值卡答案的落档与上行。存档回写在前、拉服务端档在后:同内容回写不记时刻
 * (writeScoreAnswers 语义比对),拉档才不会被挂载即写误判成「本地更新」。
 *
 * @param x 两个状态格、岗位语境与拆段开关。
 */
export function useScoreSync(x: ScoreSyncIn): void {
  useEffect(function saveScore() {
    writeScoreStore({ profile: x.profile, answers: x.answers })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖只列真会变的那几格;两个状态格对象每渲染重建,进依赖就是每帧回写
  }, [x.answers.ticks, x.answers.rowAnswers, x.answers.extraAnswered, x.profile.profAns,
    x.answers.wage, x.answers.areaI, x.answers.hasOffer, x.answers.offerTouched])
  useEffect(function pullScore() {
    makeScorePullEffect(x)()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 挂载时一次:拉档是登录态的到店动作,不是数据依赖
  }, [])
}

/**
 * 三个上抛口:逐题进度、逐题答案回显、题单空了就直接收卷。回显用签名串做依赖 ——
 * 回显数组每轮渲染都是新数组,直接进依赖就是每帧给父级 setState 一次,循环重渲。
 *
 * @param x 回显、两段计数、出题态与三个上抛口。
 */
export function useScoreEcho(x: ScoreEchoIn): void {
  const onProgress = x.onProgress
  const onAnswers = x.onAnswers
  const onComplete = x.onComplete
  const sig = JSON.stringify(x.rows)
  useEffect(function reportProgress() {
    if (onProgress != null) {
      onProgress({ done: x.done, total: x.total })
    }
  }, [x.done, x.total, onProgress])
  useEffect(function reportRows() {
    if (onAnswers != null) {
      const rows: ScoreCardEchoRow[] = JSON.parse(sig)
      onAnswers(rows)
    }
  }, [sig, onAnswers])
  useEffect(function reportEmpty() {
    if (x.showQuestionnaire && x.total === 0 && onComplete != null) {
      onComplete()
    }
  }, [x.total, onComplete, x.showQuestionnaire])
}

/**
 * 答题段的两处「进段就对位」。中途退出再进来落在**第一道没答的题**,不让人从头再翻一遍;
 * 点条件格直达那道题,只认 nonce —— 题单每轮渲染都是新引用,进依赖就成了每帧重定位。
 * 🔴 焦点这一段**必须排在「第一道没答的题」之后**:两者常在同一次提交里都触发
 * (点格子 = 开段 + 定位),同序执行时后声明的赢 —— 反过来就是「点哪格都落第一道没答的」。
 *
 * @param x 出题态、题单、已答标记、待跳的格与题序写回。
 */
export function useScorePager(x: ScorePagerIn): void {
  const [prevShown, setPrevShown] = useState(false)
  if (prevShown !== x.showQuestionnaire) {
    setPrevShown(x.showQuestionnaire)
    if (x.showQuestionnaire) {
      const first = firstUnansweredOf({ questions: x.questions, answered: x.extraAnswered })
      if (first > 0) {
        x.setAt(first)
      }
    }
  }
  const [prevNonce, setPrevNonce] = useState<number | null>(null)
  let nonce: number | null = null
  if (x.focus != null) {
    nonce = x.focus.nonce
  }
  if (prevNonce !== nonce) {
    setPrevNonce(nonce)
    if (x.focus != null) {
      const i = questionIndexOf({ questions: x.questions, key: x.focus.key })
      if (i >= 0) {
        x.setAt(i)
      }
    }
  }
}

/**
 * 分值卡的整机:两个状态格 + 落格总口 + 换省事实,装成各内件消费的一个对象,
 * 再挂上落档、上抛与对位三组 effect。
 *
 * @param props 组件收到的 props。
 * @returns 整机。
 */
export function usePnpScoreCard(props: PnpScoreCardIn): ScoreCardPanel {
  const limits = scoreCardLimitsOf(props)
  const splitWork = hasSplitWorkOf(props.factors)
  const profile = useScoreProfileState({
    profileClb: scoreProfileClbOf(props), initial: scoreCardInitialOf(props), limits,
  })
  const answers = useScoreAnswerState({ ctx: props.ctx, splitWork })
  const acts = scoreActsOf({ profile, answers })
  const byProv = useScoreByProv(scoreNocOf(props.ctx))
  const machine = scoreCardMachineOf({
    props, profile, answers, acts, byProv, hidden: scoreHiddenOf(props), limits, splitWork,
  })
  useScoreSync({ profile, answers, ctx: props.ctx, splitWork })
  useScoreEcho({
    rows: machine.echo,
    done: machine.done,
    total: machine.total,
    showQuestionnaire: machine.showQuestionnaire,
    onProgress: props.onQuestionnaireProgress,
    onAnswers: props.onQuestionnaireAnswers,
    onComplete: props.onQuestionnaireComplete,
  })
  useScorePager({
    showQuestionnaire: machine.showQuestionnaire,
    questions: machine.questions,
    extraAnswered: answers.extraAnswered,
    focus: scoreFocusOf(props),
    setAt: answers.setAt,
  })
  return machine.panel
}
