'use client'
/**
 * advisor 域的状态机器:内嵌初判段的流式生成、额度回传与重试;浮层整机(拖动/拉伸/
 * 全屏/尺寸记忆)、JD 正文取数、点了才生成的 AI 段、职责译文、地点两级取数与弹框整台。
 * 体内不留注释 —— 带口径的步骤在 ./functions 的对应函数上(注释即它们的 JSDoc)。
 * 2026-08-28 拆域批随 JdAdvisorSection 自 components/jobs/Jd.tsx 迁入;
 * 同日换装批把 Advisor.tsx 的六台机器(原先摊在组件体里)收进本抽屉。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { useEffect, useRef, useState } from 'react'
import { useIsNarrow } from '@/components/modal'
import { makeT } from '@/lib/i18n'
import { track } from '@/lib/track'
import {
  ADV_DONE, ADV_ERROR, ADV_IDLE, ADV_LIMITED, ADV_LOADING, ADV_STREAMING, ADV_UPGRADE, AI_ADVISOR_ON,
  GROUP_COMPANY, GROUP_IMMIGRATION, LEVEL_PROVINCE, PANEL_POS_X0, PANEL_POS_Y0, TEXT_NONE, TRACK_IMM_TRANSLATE,
  TRACK_KIND_MODAL, TRACK_MODAL_HEAD, TRACK_MODAL_JD, TRACK_P_FIELD, TRACK_P_KIND, TRANS_IDLE, TYPE_TICK_MS,
} from './constants'
import {
  advisorKeyOf, centerPosOf, makeDragStart, makeLoadCity, makeLoadCompanyJobs, makeLoadJobText, makeLoadNocTrans,
  makeLoadProv, makeResizeStart, makeRunAiRead, makeRunLongAdvisor, panelStyleOf, readPrefOf, savePrefOf,
  streamAdvisor, tickTypewriter,
} from './functions'
import type {
  ActModalPanel, AdvisorCtaIn, AdvisorHeadIn, AdvisorJob, AdvisorLeftIn, AdvisorLongIn, AdvisorLongPanel,
  AdvisorModalHookIn,
  AdvisorModalPanel, AdvisorPanel, AdvisorReadStatus, AdvisorSectionIn, AdvisorStatus, AiReadIn, AiReadPanel,
  CityFact, DeadFlag, FloatPanelHookIn, FloatPanelOut, JobTextIn, JobTextPanel, LocationDataIn, LocationDataPanel,
  NocTrans, NocTransIn, NocTransPanel, PanelPos, PanelSize, PointerHandlerFn, ProvFact, TransStatus,
} from './types'
import { CACHE } from './variables'

/**
 * 内嵌初判段的整台:打开即自动流式生成,同岗会话内缓存(⚠️ 写读键不一致的老行为见
 * variables.ts 的注释),失败可重试(2026-07-25 用户:解析失败要能重试)。
 *
 * @param x 这一岗、界面语言、档、段标题与分层态。
 * @returns 段面板。
 */
export function useAdvisorSection(x: AdvisorSectionIn): AdvisorPanel {
  const t = makeT(x.lang)
  const ck = advisorKeyOf({ field: x.field, id: x.job.id })
  const [text, setText] = useState(cachedOf(ck))
  const [status, setStatus] = useState<AdvisorStatus>(initialStatusOf(ck))
  const [freeLeft, setFreeLeft] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const job = x.job
  const lang = x.lang
  const field = x.field
  useEffect(function loadAdvisor() {
    if (CACHE.jdAdvisor.has(ck)) {
      return
    }
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 这一发流式请求的开场:清正文、挂 loading,必须与开请求同一拍
    setText(TEXT_NONE)
    setStatus(ADV_LOADING)
    streamAdvisor({ job, lang, field, signal: ctrl.signal, onChunk: setText, onFreeLeft: setFreeLeft })
      .then(function onDone(got) {
        setStatus(got.status)
        if (got.status === ADV_DONE) {
          setText(got.body)
        }
      })
      .catch(function onFail() {
        if (ctrl.signal.aborted === false) {
          setStatus(ADV_ERROR)
        }
      })
    return function stopAdvisor() {
      ctrl.abort()
    }
  }, [ck, field, job, lang, tick])
  return {
    t,
    text,
    status,
    head: headOf({ title: x.title, fallback: t('advisor.tag') }),
    leftText: leftTextOf({ t, freeLeft }),
    loadingText: t('advisor.loading'),
    failText: t('advisor.unavail'),
    retryText: t('ai.retry'),
    limitMsg: t('advisor.limit429'),
    limitCta: limitCtaOf({ t, loggedIn: x.plan.loggedIn }),
    upgrade: status === ADV_UPGRADE,
    limited: status === ADV_LIMITED,
    loading: status === ADV_LOADING,
    failed: status === ADV_ERROR,
    hasBody: status === ADV_STREAMING || status === ADV_DONE,
    onRetry: function retry(): void {
      setTick(tick + 1)
    },
  }
}

/**
 * 缓存里已有的那份正文。
 *
 * @param ck 缓存键。
 * @returns 正文;没有给空串。
 */
function cachedOf(ck: string): string {
  const hit = CACHE.jdAdvisor.get(ck)
  if (hit == null) {
    return TEXT_NONE
  }
  return hit
}

/**
 * 首帧的状态:缓存里有就直接是「出完了」。
 *
 * @param ck 缓存键。
 * @returns 状态档。
 */
function initialStatusOf(ck: string): AdvisorStatus {
  if (CACHE.jdAdvisor.has(ck)) {
    return ADV_DONE
  }
  return ADV_LOADING
}

/**
 * 段标题:调用方给了就用它(如「AI 速读」),没给用「AI 顾问」。
 *
 * @param x 调用方给的标题与兜底。
 * @returns 段标题。
 */
function headOf(x: AdvisorHeadIn): string {
  if (x.title == null || x.title === TEXT_NONE) {
    return x.fallback
  }
  return x.title
}

/**
 * 剩余次数灰注(拿到才出)。
 *
 * @param x 取词函数与剩余次数。
 * @returns 灰注;还没拿到给空串。
 */
function leftTextOf(x: AdvisorLeftIn): string {
  if (x.freeLeft == null) {
    return TEXT_NONE
  }
  return x.t('advisor.left', { n: x.freeLeft })
}

/**
 * 429 锁行上的引导:匿名才引导去注册(登录态额度更高)。
 *
 * @param x 取词函数与登录态。
 * @returns 引导文案;已登录给空串。
 */
function limitCtaOf(x: AdvisorCtaIn): string {
  if (x.loggedIn) {
    return TEXT_NONE
  }
  return x.t('advisor.limitCta')
}

/**
 * 浮层整机(标题栏拖动 / 八向拉伸 / 全屏 / 尺寸记忆)—— 顾问弹框与职位描述弹框共用。
 * 窄屏(E8-03)强制全屏,禁拖拽/拉伸/全屏切换钮。位置每次打开居中不记忆:
 * 记了位置,窗口一缩小上次那个坐标就在屏外,弹框打开即消失。
 *
 * @param x 记忆键与默认宽高。
 * @returns 浮层机器面板。
 */
export function useFloatPanel(x: FloatPanelHookIn): FloatPanelOut {
  const narrow = useIsNarrow()
  const [fullPref, setFullPref] = useState(false)
  const [size, setSize] = useState<PanelSize>({ w: x.defW, h: x.defH })
  const [pos, setPos] = useState<PanelPos>(function initPos(): PanelPos {
    if (typeof window === 'undefined') {
      return { x: PANEL_POS_X0, y: PANEL_POS_Y0 }
    }
    return centerPosOf({ w: x.defW, h: x.defH })
  })
  const sizeRef = useRef<PanelSize>(size)
  const full = fullPref || narrow
  const prefKey = x.prefKey

  useEffect(function loadPref() {
    const p = readPrefOf(prefKey)
    if (p.full) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 故意分两步:localStorage 在用户浏览器里,服务端画首帧读不到,页面活过来后再补真实偏好
      setFullPref(true)
    }
    if (p.w != null && p.h != null) {
      setSize({ w: p.w, h: p.h })
      setPos(centerPosOf({ w: p.w, h: p.h }))
    }
  }, [prefKey])

  function toggleFull(): void {
    const next = fullPref === false
    savePrefOf({ key: prefKey, patch: { full: next, w: null, h: null } })
    setFullPref(next)
  }

  function onEdgeDown(dir: string): PointerHandlerFn {
    return makeResizeStart({ full, prefKey, size, pos, sizeRef, setSize, setPos, dir })
  }

  return {
    narrow,
    full,
    toggleFull,
    panelStyle: panelStyleOf({ full, pos, size }),
    onHeadDown: makeDragStart({ full, pos, setPos }),
    onEdgeDown,
  }
}

/**
 * 详情页 JD 正文的取数机器(打开职位弹框即取,换岗重取,拆卸时掐掉在途请求)。
 *
 * @param x 这一岗。
 * @returns 正文与「被防滥用闸挡下」的旗标。
 */
export function useJobText(x: JobTextIn): JobTextPanel {
  const [text, setText] = useState<string | null>(null)
  const [limited, setLimited] = useState(false)
  const job = x.job

  useEffect(function loadText() {
    const ctrl = new AbortController()
    makeLoadJobText({ applyUrl: job.applyUrl, signal: ctrl.signal, setText, setLimited })()
    return function stop(): void {
      ctrl.abort()
    }
  }, [job])

  return { text, limited }
}

/**
 * 点了才生成的那类 AI 段的机器(分类速读 / 地点解读共用)。
 * #183 同款(Frank「点完按钮怎么没了」):折叠开关常驻,点开点收都是它;
 * 内容留在 state,收起再开不重烧 —— 也就是说一次会话里每个主体最多烧一次额度。
 *
 * @param x 档、主体标识、界面语言与埋点名。
 * @returns AI 段面板。
 */
export function useAiRead(x: AiReadIn): AiReadPanel {
  const [on, setOn] = useState(false)
  const [status, setStatus] = useState<AdvisorReadStatus>(ADV_IDLE)
  const [text, setText] = useState(TEXT_NONE)

  function onToggle(): void {
    if (status === ADV_IDLE) {
      makeRunAiRead({ field: x.field, id: x.id, lang: x.lang, setStatus, setText })()
    }
    if (on === false && x.trackName !== TEXT_NONE) {
      track(x.trackName)
    }
    setOn(on === false)
  }

  return { on, status, text, onToggle }
}

/**
 * 职责/要求中文对照的机器:首次点才调翻译,拿到后前端存一份,切换英/中零延迟。
 *
 * @param x 五位码与界面语言。
 * @returns 对照面板。
 */
export function useNocTrans(x: NocTransIn): NocTransPanel {
  const [showTrans, setShow] = useState(false)
  const [status, setStatus] = useState<TransStatus>(TRANS_IDLE)
  const [trans, setTrans] = useState<NocTrans | null>(null)

  function onToggle(): void {
    if (trans != null) {
      setShow(showTrans === false)
      return
    }
    makeLoadNocTrans({ noc: x.noc, lang: x.lang, setTrans, setShow, setStatus })()
  }

  return { showTrans, status, trans, onToggle }
}

/**
 * 地点面板的取数机器:点省取省级事实,点市/区取市级事实(区级把区带上)。
 * 换层级时上一级那份当场作废 —— 别拿省的数字去配市的标题。
 *
 * @param x 这一岗、市区名与层级。
 * @returns 两级取数(各自 null = 不是这一级或还没回来)。
 */
export function useLocationData(x: LocationDataIn): LocationDataPanel {
  const [provState, setProv] = useState<ProvFact | null>(null)
  const [cityState, setCityInfo] = useState<CityFact | null>(null)
  const isProvLevel = x.level === LEVEL_PROVINCE
  const province = x.job.province
  const city = x.city
  const district = x.district
  const level = x.level

  useEffect(function loadProv() {
    const flag: DeadFlag = { dead: false }
    if (isProvLevel && province !== TEXT_NONE) {
      makeLoadProv({ province, setProv })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [isProvLevel, province])

  useEffect(function loadCity() {
    const flag: DeadFlag = { dead: false }
    if (isProvLevel === false && city !== TEXT_NONE && province !== TEXT_NONE) {
      makeLoadCity({ city, province, district, level, setCityInfo })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [isProvLevel, level, city, district, province])

  let prov = provState
  if (isProvLevel === false || province === TEXT_NONE) {
    prov = null
  }
  let cityInfo = cityState
  if (isProvLevel || city === TEXT_NONE || province === TEXT_NONE) {
    cityInfo = null
  }
  return { prov, cityInfo }
}

/**
 * 顾问长文的机器:流式取数 + 打字机 + 额度可见化 + 重试。
 * 打字机是用户拍板的形态(AI 内容必须流式感,不许整段蹦出来):网络块先进待吐队列,
 * 固定节奏吐字,口径见 functions 的 tickTypewriter。
 * 总开关关着时(走查#15)不发请求 —— 不烧额度、不占朋友那台 qwen、不让用户干等;
 * 状态直接落「出完了」、正文空,调用方那张卡因此不渲,免得出一张空卡孤儿标题。
 * ⚠️ 建议问题(#36:初判结尾那句 → 传给对话框做首个 chip)现在落格但没有消费者,
 * 对话框接上之前先留着这一格,别把摘取那一步一起删了。
 *
 * @param x 分组、这一岗与界面语言。
 * @returns 长文面板。
 */
export function useAdvisorLong(x: AdvisorLongIn): AdvisorLongPanel {
  const t = makeT(x.lang)
  const aiOn = x.group === GROUP_IMMIGRATION && AI_ADVISOR_ON
  const [textState, setText] = useState(TEXT_NONE)
  const [statusState, setStatus] = useState<AdvisorStatus>(ADV_LOADING)
  const [freeLeft, setFreeLeft] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const [, setSug] = useState(TEXT_NONE)
  const pending = useRef(TEXT_NONE)
  const mirror = useRef(TEXT_NONE)
  const done = useRef(false)
  const group = x.group
  const job = x.job
  const lang = x.lang
  const company = x.job.company
  const unavailText = t('advisor.unavail')
  const offlineText = t('advisor.offline')

  useEffect(function typewriter() {
    const id = setInterval(function step(): void {
      tickTypewriter({ pending, done, mirror, setText, setStatus, setSug, company, lang })
    }, TYPE_TICK_MS)
    return function stop(): void {
      clearInterval(id)
    }
  }, [company, lang])

  useEffect(function loadLong() {
    if (aiOn === false) {
      return
    }
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 这一发长文请求的开场:清三格、挂 loading,必须与开请求同一拍
    setText(TEXT_NONE)
    setStatus(ADV_LOADING)
    setSug(TEXT_NONE)
    pending.current = TEXT_NONE
    mirror.current = TEXT_NONE
    done.current = false
    makeRunLongAdvisor({
      group, job, lang, signal: ctrl.signal, unavailText, offlineText, setFreeLeft, setStatus, setText, pending, done,
    })()
    return function stop(): void {
      ctrl.abort()
    }
  }, [aiOn, group, job, lang, tick, unavailText, offlineText])

  function onRetry(): void {
    setTick(tick + 1)
  }

  let text = textState
  let status = statusState
  if (aiOn === false) {
    status = ADV_DONE
    text = TEXT_NONE
  }
  return { text, status, freeLeft, aiOn, onRetry }
}

/**
 * 顾问弹框的整台:长文机器 + 打开埋点(#129 功能级埋点:四类弹框打开各记一事件,
 * field = 入口格)+ 同公司在榜岗 + 清单译名开关(2026-07-25 Frank「和上面的中文翻译
 * 按钮联动」;Frank 走查:中文对照默认关,点了才显/才翻 —— 原先中文界面一打开就是
 * 对照态,当天推翻)。
 *
 * @param x 分组、入口格、这一岗与界面语言。
 * @returns 弹框整台面板。
 */
export function useAdvisorModal(x: AdvisorModalHookIn): AdvisorModalPanel {
  const long = useAdvisorLong({ group: x.group, job: x.job, lang: x.lang })
  const [showZh, setShowZh] = useState(false)
  const [companyJobsState, setCompanyJobs] = useState<AdvisorJob[]>([])
  const isCompanyGroup = x.group === GROUP_COMPANY
  const group = x.group
  const field = x.field
  const company = x.job.company

  useEffect(function trackOpen() {
    track(TRACK_MODAL_HEAD + group, { [TRACK_P_FIELD]: field })
  }, [group, field])

  useEffect(function loadCompanyJobs() {
    const flag: DeadFlag = { dead: false }
    if (isCompanyGroup && company !== TEXT_NONE) {
      makeLoadCompanyJobs({ company, setJobs: setCompanyJobs })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [isCompanyGroup, company])

  function onToggleZh(): void {
    if (showZh === false) {
      track(TRACK_IMM_TRANSLATE)
    }
    setShowZh(showZh === false)
  }

  let companyJobs = companyJobsState
  if (isCompanyGroup === false || company === TEXT_NONE) {
    companyJobs = []
  }
  return {
    text: long.text,
    status: long.status,
    freeLeft: long.freeLeft,
    aiOn: long.aiOn,
    showZh,
    onToggleZh,
    onRetry: long.onRetry,
    companyJobs,
  }
}

/**
 * 职位描述弹框的整台:额度可见化(第 5 轮 #16:JobBody 回传 X-Free-Left,
 * 免费用户看得见剩几次,402 不再是惊吓)+ 打开埋点(#129,kind 分开弹框与整页;
 * 它同时是漏斗第 1 步)。
 *
 * @returns 剩余次数与它的落格。
 */
export function useActModal(): ActModalPanel {
  const [freeLeft, setFreeLeft] = useState<number | null>(null)

  useEffect(function trackOpen() {
    track(TRACK_MODAL_JD, { [TRACK_P_KIND]: TRACK_KIND_MODAL })
  }, [])

  return { freeLeft, onFreeLeft: setFreeLeft }
}
