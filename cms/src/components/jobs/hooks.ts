'use client'
/**
 * jobs 页面域的状态机器:列宽的量与分、顶栏账户区、「我的匹配」三态闸、职位板整台、
 * JD 正文身体、投递栏。体内不留注释 —— 带口径的步骤全在 ./functions 的具名函数里
 * (注释即它们的 JSDoc),这里只剩 useState、具名 effect 壳与装配
 * (形制同 news 的 useNewsDetail 与 account 的 useAccountPage)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { goBackOr } from '@/components/button'
import { useLang } from '@/components/i18n'
import { useIsNarrow } from '@/components/modal'
import { quizToProfile, readQuiz } from '@/components/quiz'
import { makeT } from '@/lib/i18n'
import { hasProfile, normalizeProfile } from '@/lib/jobs'
import { mapQuery, mapsUrl } from '@/lib/location'
import { registerCatLabels } from '@/lib/noc'
import { ymd } from '@/lib/time'
import { track } from '@/lib/track'
import {
  APPLY_AUTH, APPLY_IDLE, APPLY_INTENT, APPLY_RESUME_KEY, APPLY_RESUME_SEP, APPLY_RESUME_TTL_MS, AUTH_LOGIN,
  AUTH_REGISTER, BOARD_FILTERS_KEY, CELL_PAD, COL_FLOOR, COMMA, CREDENTIALS_INCLUDE, DIR_DESC, DIRECT_URL_KEY,
  DISPOSITION_MAP, DISPOSITION_NONE, EMPTY_DIMS, EV_KEY_DOWN, EV_MOUSE_DOWN, EV_RESIZE, FIELD_GROUP, FK, FK_DIRECT,
  FMT_FAIL, FMT_NOTEXT, FMT_QUOTA, FREE_PLAN, HDR_CONTENT_TYPE, HTTP_NO_CONTENT, HTTP_OK, HTTP_PAYMENT,
  HTTP_TOO_MANY, JB_POSTING_RE, JD_DONE, JD_EMPTY, JD_LIMITED, JD_LOADING, KEY_ESCAPE, LIMIT_RE,
  METHOD_DELETE, METHOD_PATCH, METHOD_POST, MIME_JSON, P_BACK, P_VIEW, QS_HEAD, SAVE_ERR, SAVE_LIMIT, SAVE_OK,
  SAVED_STATUS_APPLIED, SAVED_STATUS_WISH, SLASH, SORT_DEFAULT, SORT_MATCH, TABLE_WRAP_SEL, TARGET_BLANK, TEXT_NONE,
  TEXT_STATUS, TRACK_AI_READ_JD, TRACK_APPLY, TRACK_JD_MATCH_OPEN, TRACK_JD_OPEN, TRACK_JD_TRANSLATE, TRACK_KEY_KIND,
  TRACK_KEY_MODE, TRACK_KIND_PAGE, TRACK_MATCH_VIEW, TRACK_MATCH_VIEW_QUIZ, TRACK_MODE_EMAIL, TRACK_MODE_WEB,
  TRACK_SAVE_JOB, TRACK_SAVE_SEARCH, TRANS_ERROR, TRANS_IDLE, TRANS_LOADING, UPSELL_LOCK, UPSELL_LOGIN, UPSELL_SS,
  URL_API_APPLY_HOW, URL_API_JD_FORMAT, URL_API_JD_TRANSLATE, URL_API_JOBS, URL_API_JOBS_DIMS,
  URL_API_SAVED_JOB_BY_JOB, URL_API_SAVED_JOB_BY_JOB_TAIL, URL_API_SAVED_JOBS, URL_API_SAVED_JOBS_LIST,
  URL_API_SAVED_SEARCHES, URL_API_USERS_ME, URL_BOARD, URL_BOARD_BACK, URL_BOARD_MATCH, URL_TO_FILTER, VAL_MATCH,
  VAL_ON, WIDTH_FULL, WINDOW_FEATURES,
} from './constants'
import {
  allocateColWidths, anyFilterOf, applyEmailOf, applyFiltersTo, authFromUrl, blockedKeysOf, clearFiltersIn,
  colsKeyOf, colWidthSeedValue, curFiltersOf, dataKeyOf, defaultColsOf, emptyLinkOf, emptyTextOf, fetchJobText,
  filterOptsOf, filterSig, foldActiveOf, frozenKeysOf, hasQuizNocs, initialColsOf, initialFiltersOf, jobDetailViewOf,
  jobsQueryOf, keysOf, lastOf, mailtoOf, makeColResize, makeColWidth, makeNocName, markObSeen, matchHrefOf,
  measureColWidths, nextSortOf, nocLabelOf, obSeen, pageSigOf, pickedShownOf, readColsPref, replaceQuery, savedMapOf,
  saveFiltersOf,
  seedFilter, setterOf, shownColsOf, slotOf, stickyOffsetsOf, strOf, strOrNull, togglableColsOf, updatedTextOf,
  widthsKeyOf, writeColsCookie, writeColsPref, writeColWidthCookie,
} from './functions'
import type {
  AccountAreaPanel, Alloc, AllocOfIn, AppendRowsIn, ApplyBarIn, ApplyBarPanel, ApplyEmailPickIn, ApplyHowJson,
  ApplyHowPanel, ApplyResumeIn, ApplyStage, AuthDoneIn, BlockedKeys, BoardColsHookIn, BoardColsPanel,
  BoardDataHookIn, BoardDataPanel, BoardFiltersHookIn, BoardFiltersHookOut, ColMeasure, ColsToggleIn, ColWidthSeed,
  ColWidthsIn, ColWidthsPanel, ColWidthsPanelIn, DimsJson, EscCloseIn, FieldRouterIn, FilterState, FmtWhy, FontsDoc,
  FrozenHookIn, FrozenPanel, HydrateIn, IntentProfileIn, JdFormatPanel, JdStatus, JdTextHookIn, JdTextPanel,
  JdTransHookIn, JdTransPanel, JobBodyIn, JobBodyPanel, JobColKey, JobDetailPanel, JobDims, JobFact, JobFilters,
  JobIn, JobPlan, JobsBoardPanel, JobsIn, JobsPageJson, MatchGateHookIn, MatchGatePanel, MatchProfileFact,
  MatchTotals, MeJson, ModalsHookIn, ModalsHookOut, NeedIntentIn, OpenApplyIn, OpenMatchIn, OutsideCloseIn,
  PopupState, ProfileJsonFact, ProofCount, SavedAddIn, SavedEditIn, SavedEntry, SavedHookIn, SavedListJson,
  SavedPanel, SavedPostJson, SaveSearchIn, SeedCookieIn, SortState, TableWidthIn, TransJson, TranslateIn,
  TransStatus, UmamiWindow, UpsellKind, WrapWidthIn,
} from './types'

/**
 * 读 localStorage 偏好(列/语言)要在「绘制前」生效,避免 SSR 默认值闪一下再切到保存值。
 * SSR 端 useLayoutEffect 无效且会告警 → 服务端退化成 useEffect。
 */
let useIsoLayoutEffect = useEffect
if (typeof window !== 'undefined') {
  useIsoLayoutEffect = useLayoutEffect
}

/**
 * 职位表列宽:**唯一控制点**(Frank 2026-08-03「宽度控制放到一个地方」)。
 * 刷新页面 / 查完筛选 / 拖列竖线 —— 三条触发全走这一个 hook,不再有第二套分支。
 * 规则、历史教训与两个纯算法都在 ./functions(measureColWidths / allocateColWidths / resizeColWidths)。
 *
 * 触发点一:首屏/刷新、换列、换语言、筛选换数据 —— 全靠 dataKey。**量到了才记 key**:
 * 首帧还没数据时量不到,下一帧继续试(老版本在这儿把 key 提前记死,于是线上永远停在
 * 「没量到」的均分状态)。触发点二见 useWrapWidth,触发点三见 makeColResize。
 * 换列集 → 手动宽作废(新列在固定布局里会塌成 0)。
 *
 * @param x 列集、表头锚点、数据指纹、格内边距与 cookie 种子。
 * @returns 列宽面板。
 */
export function useColWidths(x: ColWidthsIn): ColWidthsPanel {
  const [measured, setMeasured] = useState<Record<string, ColMeasure>>({})
  const [wrapW, setWrapW] = useState(0)
  const [manual, setManual] = useState<Record<string, number>>({})
  const doneKey = useRef(TEXT_NONE)
  const keysKey = x.keys.join(COMMA)
  const keysRef = useRef(x.keys)
  const measuredRef = useRef(measured)
  useEffect(function syncLiveRefs() {
    keysRef.current = x.keys
    measuredRef.current = measured
  })
  const headRowRef = x.headRowRef
  const pad = x.pad
  const dataKey = x.dataKey
  useIsoLayoutEffect(function remeasureOnDataKey() {
    if (doneKey.current === dataKey) {
      return
    }
    const got = measureColWidths({ keys: keysRef.current, head: headRowRef.current, pad })
    if (got == null) {
      return
    }
    setMeasured(got.measured)
    setWrapW(got.wrapW)
    doneKey.current = dataKey
  })
  useFontRemeasure(doneKey)
  useWrapWidth({ headRowRef, keysKey, setWrapW })
  const [prevKeysKey, setPrevKeysKey] = useState(keysKey)
  if (prevKeysKey !== keysKey) {
    setPrevKeysKey(keysKey)
    setManual({})
  }
  return useColWidthsPanel({
    keys: x.keys,
    keysKey,
    seed: x.seed,
    measured,
    wrapW,
    manual,
    setManual,
    keysRef,
    measuredRef,
  })
}

/**
 * 字体加载完再量一次(首帧用兜底字体量出来的宽度会偏,中文字形差异尤其大)。
 * 清掉「已量到的那份指纹」即可:下一帧的重量 effect 自会再跑一遍。
 *
 * @param doneKey 「已量到的那份指纹」的活引用。
 * @returns 无。
 */
function useFontRemeasure(doneKey: React.RefObject<string>): void {
  const [, setTick] = useState(0)
  useEffect(function remeasureAfterFonts() {
    const f = fontFacesOf()
    if (f == null) {
      return
    }
    let alive = true
    function bump(n: number): number {
      return n + 1
    }
    f.then(function onFontsReady() {
      if (alive) {
        doneKey.current = TEXT_NONE
        setTick(bump)
      }
    })
    return function stopFontWatch() {
      alive = false
    }
  }, [doneKey])
}

/**
 * 字体加载完成的信号(老浏览器没有 document.fonts,那就不重量)。
 *
 * @returns 加载完成的承诺;拿不到给 null。
 */
function fontFacesOf(): Promise<unknown> | null {
  const doc: FontsDoc = document
  if (doc.fonts == null || doc.fonts.ready == null) {
    return null
  }
  return doc.fonts.ready
}

/**
 * 触发点二:容器宽变了(窗口缩放/侧栏开合)—— 内容自然宽不变,只要重分即可。
 *
 * @param x 表头锚点、列集签名与容器宽的写口。
 * @returns 无。
 */
function useWrapWidth(x: WrapWidthIn): void {
  const setWrapW = x.setWrapW
  const headRowRef = x.headRowRef
  useEffect(function watchWrapWidth() {
    const head = headRowRef.current
    if (head == null || typeof ResizeObserver === 'undefined') {
      return
    }
    const wrap = head.closest(TABLE_WRAP_SEL) as HTMLElement | null
    if (wrap == null) {
      return
    }
    const ro = new ResizeObserver(function onWrapResize() {
      setWrapW(wrap.clientWidth)
    })
    ro.observe(wrap)
    setWrapW(wrap.clientWidth)
    return function stopWrapWatch() {
      ro.disconnect()
    }
  }, [headRowRef, setWrapW, x.keysKey])
}

/**
 * 分宽并装配列宽面板。可分宽度 = 容器 clientWidth,**不要再减边框**:clientWidth 本来就不含
 * border(减了就凭空少 2px)。少这 2px 的后果不是「窄一点」,是**假横滚**:拖列时所有列都按
 * 实宽钉住,minTotal = wrapW > avail = wrapW-2 → overflow 判真 → 固定左列开 sticky →
 * 偏移量一旦跟不上拖动就把隔壁列盖住(2026-08-16 Frank 实拍「穿透了职位列」)。
 * 种子只在「还没量到 + 列集对得上」时顶班:量到了立刻换成像素(同一批数据,差几像素看不出来)。
 *
 * @param x 列集、种子、量宽结果、容器宽与手动宽。
 * @returns 列宽面板。
 */
function useColWidthsPanel(x: ColWidthsPanelIn): ColWidthsPanel {
  const cols: Alloc[] = []
  let minTotal = 0
  for (const k of x.keys) {
    const one = allocOf({ k, m: x.measured[k], pinned: x.manual[k] })
    cols.push(one)
    minTotal = minTotal + floorOf(one)
  }
  const avail = x.wrapW
  const overflow = avail > 0 && minTotal > avail
  const px = allocateColWidths({ cols, avail: Math.max(avail, minTotal) })
  let total = 0
  for (const k of x.keys) {
    total = total + numOf(px[k])
  }
  const measuredReady = avail > 0 && Object.keys(x.measured).length > 0
  useSeedCookie({ measuredReady, keysKey: x.keysKey, px, total, keys: x.keys })
  const useSeed = measuredReady === false && x.seed != null && x.seed.keys === x.keysKey
  const setManual = x.setManual
  function autoFit(): void {
    setManual({})
  }
  return {
    ready: measuredReady || useSeed,
    width: makeColWidth({ measuredReady, px, useSeed, seed: x.seed, keys: x.keys }),
    tableWidth: tableWidthOf({ measuredReady, overflow, total }),
    overflow: measuredReady && overflow,
    startResize: makeColResize({ keysRef: x.keysRef, measuredRef: x.measuredRef, setManual }),
    autoFit,
    hasManual: Object.keys(x.manual).length > 0,
    reset: autoFit,
  }
}

/**
 * 一列的分宽输入(量不到就用下限兜)。
 *
 * @param x 列键、量宽结果与钉死的宽。
 * @returns 分宽输入。
 */
function allocOf(x: AllocOfIn): Alloc {
  const one: Alloc = { key: x.k, head: COL_FLOOR, word: 0, p90: COL_FLOOR, max: COL_FLOOR }
  if (x.m != null) {
    one.head = x.m.head
    one.word = x.m.word
    one.p90 = x.m.p90
    one.max = x.m.max
  }
  if (x.pinned != null) {
    one.pinned = x.pinned
  }
  return one
}

/**
 * 这一列最少要占多宽(钉死的按钉死算,其余按表头不折行算)。
 *
 * @param c 分宽输入。
 * @returns 最小宽。
 */
function floorOf(c: Alloc): number {
  if (c.pinned != null) {
    return c.pinned
  }
  return Math.max(COL_FLOOR, c.head, c.word)
}

/**
 * 缺席的数按 0 算。
 *
 * @param v 读到的值。
 * @returns 数。
 */
function numOf(v: number | null | undefined): number {
  if (v == null) {
    return 0
  }
  return v
}

/**
 * table 的 width:不溢出时交给浏览器(百分比),溢出时给总像素。
 *
 * @param x 量到没、溢出没与总宽。
 * @returns 表宽。
 */
function tableWidthOf(x: TableWidthIn): string | number {
  if (x.measuredReady && x.overflow) {
    return x.total
  }
  return WIDTH_FULL
}

/**
 * 首屏不抻:把算好的**比例**记进 cookie,下次刷新服务端就能把 colgroup 一起渲出来。
 * 只在比例真的变了时写,避免每次重分都碰 document.cookie。
 * ⚠️ 依赖数组故意不写:自己比对上一次写过的值去重,写依赖反而容易漏写一项。
 *
 * @param x 量到没、列集签名、各列像素、总宽与列集。
 * @returns 无。
 */
function useSeedCookie(x: SeedCookieIn): void {
  const seedOut = useRef(TEXT_NONE)
  useEffect(function writeSeedCookie() {
    if (x.measuredReady === false) {
      return
    }
    const val = colWidthSeedValue({ keysKey: x.keysKey, px: x.px, total: x.total, keys: x.keys })
    if (val === TEXT_NONE || val === seedOut.current) {
      return
    }
    seedOut.current = val
    writeColWidthCookie(val)
  })
}

/**
 * 顶栏账户区(E8-01,2026-07-06 归组拍板:登录/注册/Pro 一处)。
 * #84:身份四件以 SSR plan 为初值(刷新零闪);fetch 兜底只在 SSR 没给时跑(老调用方兼容)——
 * SSR 已给身份则不再拉,那正是拉回前的紫「?」闪烁根因。
 * 地址栏参数(?login=1 / ?signup=1 / ?reset=<token>)开框后立刻洗掉,见 authFromUrl。
 * 登录成功整页刷新让 SSR 分层态(匹配列等)生效。
 *
 * @param plan 分层态。
 * @returns 账户区面板。
 */
export function useAccountArea(plan: JobPlan): AccountAreaPanel {
  const [email, setEmail] = useState(plan.email)
  const [proUntil, setProUntil] = useState(plan.proUntil)
  const [displayName, setDisplayName] = useState(plan.displayName)
  const [avatar, setAvatar] = useState(plan.avatar)
  const [auth, setAuth] = useState<AccountAreaPanel['auth']>(false)
  const [resetTok, setResetTok] = useState(TEXT_NONE)
  const [pricing, setPricing] = useState(false)
  useEffect(function loadIdentity() {
    if (plan.loggedIn === false || plan.email != null) {
      return
    }
    fetch(URL_API_USERS_ME, { credentials: CREDENTIALS_INCLUDE })
      .then(readMe)
      .then(function onMe(d: MeJson | null) {
        setEmail(strOrNull(d?.user?.email))
        setProUntil(ymd(strOf(d?.user?.proUntil)))
        setDisplayName(strOrNull(d?.user?.displayName))
        setAvatar(strOrNull(d?.user?.avatar))
      })
      .catch(swallow)
  }, [plan.loggedIn, plan.email])
  useEffect(function openFromUrl() {
    const opened = authFromUrl()
    if (opened.mode !== false) {
      setResetTok(opened.token)
      setAuth(opened.mode)
    }
  }, [])
  return {
    email,
    displayName,
    avatar,
    proUntil,
    auth,
    resetTok,
    pricing,
    onLogin: function openLogin(): void {
      setAuth(AUTH_LOGIN)
    },
    onRegister: function openRegister(): void {
      setAuth(AUTH_REGISTER)
    },
    onAuthClose: function closeAuth(): void {
      setAuth(false)
    },
    onAuthDone: reloadBoard,
    onPricing: function openPricing(): void {
      setPricing(true)
    },
    onPricingClose: function closePricing(): void {
      setPricing(false)
    },
  }
}

/**
 * 「我的匹配」三态闸(2026-07-11 用户拍板):进出匹配视图 = 整页跳(URL 即状态,可分享可回退;
 * 2026-07-17 根域直出后职位板 = 根路径)。未登录直接弹登录框(同日用户:「不要先跳转页面再弹窗」),
 * 已登录未建档才开引导 wizard(E11-05②,原直跳 /account)。
 * 2026-08-04:手里没有职业答案的先去 /account 建档 —— 原先送去 /plan/job 答题(答题卡已摘入口),
 * 而匹配吃的就是档案里的职业/目标省,建档是保留下来的那条路;有答案的照旧弹登录。
 * 🔴 2026-08-29 Frank 令改判:**匿名点它一律就地弹登录框**,那条「没答案 → 跳 /account」的支路撤销 ——
 * 它把 2026-07-11「不要先跳转页面再弹窗」那条拍板在半边人身上又踩了一遍(/account 落地照样弹框,
 * 只是先白跳一次页)。埋点仍按有没有职业答案分两个 tag 记,好继续看这两拨人的转化差。
 * 登录成功后的去处不动(returnTo = 匹配视图)。
 *
 * @param x 分层态、当前视图与取词函数。
 * @returns 三态闸面板。
 */
export function useMatchGate(x: MatchGateHookIn): MatchGatePanel {
  const [wizard, setWizard] = useState(false)
  const [login, setLogin] = useState(false)
  const loggedIn = x.plan.loggedIn
  const profileOk = x.plan.profileOk
  const matchView = x.matchView
  const onToggle = useCallback(function toggleMatchView(): void {
    if (loggedIn === false) {
      if (hasQuizNocs() === false) {
        track(TRACK_MATCH_VIEW_QUIZ)
      }
      setLogin(true)
      return
    }
    if (profileOk === false) {
      setWizard(true)
      return
    }
    if (matchView === false) {
      track(TRACK_MATCH_VIEW)
    }
    window.location.href = matchHrefOf(matchView)
  }, [loggedIn, profileOk, matchView])
  const onClose = useCallback(function closeGate(): void {
    setWizard(false)
    setLogin(false)
  }, [])
  return { onToggle, wizard, login, onClose, profile: x.plan.profile, t: x.t, onDone: makeUpsellDone(UPSELL_LOGIN) }
}

/**
 * 我的求职(E9-01):已收藏映射 岗位号 → 收藏行;匿名点收藏 → 注册框(转化钩子)。
 *
 * @param x 分层态与匿名时的去处。
 * @returns 收藏映射与开关。
 */
function useSavedJobs(x: SavedHookIn): SavedPanel {
  const [saved, setSaved] = useState<Record<string, SavedEntry>>({})
  const loggedIn = x.plan.loggedIn
  const onAnon = x.onAnon
  useEffect(function loadSaved() {
    if (loggedIn === false) {
      return
    }
    fetch(URL_API_SAVED_JOBS_LIST, { credentials: CREDENTIALS_INCLUDE })
      .then(readSavedList)
      .then(function onSavedList(d: SavedListJson | null) {
        setSaved(savedMapOf(d))
      })
      .catch(swallow)
  }, [loggedIn])
  function onSave(j: JobFact): void {
    if (loggedIn === false) {
      onAnon()
      return
    }
    const key = String(j.id)
    const cur = saved[key]
    if (cur != null) {
      setSaved(dropped({ saved, key }))
      fetch(URL_API_SAVED_JOBS + SLASH + String(cur.id), {
        method: METHOD_DELETE, credentials: CREDENTIALS_INCLUDE,
      }).catch(swallow)
      return
    }
    track(TRACK_SAVE_JOB)
    postSavedJob(j).then(function onSavedOne(id: string | number | null) {
      if (id != null) {
        setSaved(added({ saved, key, id }))
      }
    }).catch(swallow)
  }
  return { saved, onSave }
}

/**
 * 新建一条收藏(心愿单档)。
 *
 * @param j 这一岗。
 * @returns 新建出来的行号;失败给 null。
 */
async function postSavedJob(j: JobFact): Promise<string | number | null> {
  const res = await fetch(URL_API_SAVED_JOBS, {
    method: METHOD_POST,
    credentials: CREDENTIALS_INCLUDE,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({ job: j.id, title: j.title, company: j.company, status: SAVED_STATUS_WISH }),
  }).catch(nullOf)
  if (res == null) {
    return null
  }
  const d: SavedPostJson | null = await res.json().catch(nullOf)
  if (d == null || d.doc == null || d.doc.id == null) {
    return null
  }
  return d.doc.id
}

/**
 * 摘掉一条收藏后的映射。
 *
 * @param x 当前映射与要摘的键。
 * @returns 新映射。
 */
function dropped(x: SavedEditIn): Record<string, SavedEntry> {
  const next: Record<string, SavedEntry> = {}
  for (const [k, v] of Object.entries(x.saved)) {
    if (k !== x.key) {
      next[k] = v
    }
  }
  return next
}

/**
 * 添一条收藏后的映射。
 *
 * @param x 当前映射、键与新行号。
 * @returns 新映射。
 */
function added(x: SavedAddIn): Record<string, SavedEntry> {
  const next: Record<string, SavedEntry> = {}
  for (const [k, v] of Object.entries(x.saved)) {
    next[k] = v
  }
  next[x.key] = { id: x.id, status: SAVED_STATUS_WISH }
  return next
}

/**
 * 筛选的唯一出口:一张 fState 表喂五处 —— URL 写、URL 读(兜底)、快照写、快照回放、请求参数。
 * 键 = 筛选键(= buildJobsWhere 的键 = /api/jobs 参数名);URL 短名的映射在 constants(与 SSR 共用)。
 * 筛选初值来自服务端(page.tsx 已按 URL 解析并据此查过库)→ 首帧下拉就是选中的那项、
 * 行就是筛选后的行,水合零差异,不再「先抖一下全部」。没参数进来就是干净板,行为与以前一致。
 * 国家/TEER 下拉已删(2026-07-07 文案审计);来源/状态/经验/评分下拉已下架(2026-07-16 拍板只留薪资)——
 * 它们的 state 与谓词保留 = URL 深链与老保存筛选照常生效。
 *
 * @param initialFilters 初始筛选。
 * @returns 筛选各格的读写口。
 */
function useFilterSlots(initialFilters: JobFilters): FilterState {
  const [q, setQ] = useState(seedFilter({ f: initialFilters, k: FK.q }))
  const [fNoc, setFNoc] = useState(seedFilter({ f: initialFilters, k: FK.noc }))
  const [fCountry, setFCountry] = useState(seedFilter({ f: initialFilters, k: FK.country }))
  const [fProv, setFProv] = useState(seedFilter({ f: initialFilters, k: FK.prov }))
  const [fCity, setFCity] = useState(seedFilter({ f: initialFilters, k: FK.city }))
  const [fDistrict, setFDistrict] = useState(seedFilter({ f: initialFilters, k: FK.district }))
  const [fBroad, setFBroad] = useState(seedFilter({ f: initialFilters, k: FK.broad }))
  const [fMid, setFMid] = useState(seedFilter({ f: initialFilters, k: FK.mid }))
  const [fFine, setFFine] = useState(seedFilter({ f: initialFilters, k: FK.fine }))
  const [fTeer, setFTeer] = useState(seedFilter({ f: initialFilters, k: FK.teer }))
  const [fSource, setFSource] = useState(seedFilter({ f: initialFilters, k: FK.source }))
  const [fAcc, setFAcc] = useState(seedFilter({ f: initialFilters, k: FK.acc }))
  const [fPnp, setFPnp] = useState(seedFilter({ f: initialFilters, k: FK.pnp }))
  const [fAip, setFAip] = useState(seedFilter({ f: initialFilters, k: FK.aip }))
  const [fPilot, setFPilot] = useState(seedFilter({ f: initialFilters, k: FK.pilot }))
  const [fStatus, setFStatus] = useState(seedFilter({ f: initialFilters, k: FK.status }))
  const [fOrigin, setFOrigin] = useState(seedFilter({ f: initialFilters, k: FK.origin }))
  const [fScore, setFScore] = useState(seedFilter({ f: initialFilters, k: FK.score }))
  const [fSal, setFSal] = useState(seedFilter({ f: initialFilters, k: FK.sal }))
  const [fVs, setFVs] = useState(seedFilter({ f: initialFilters, k: FK.vs }))
  const [fEmp, setFEmp] = useState(seedFilter({ f: initialFilters, k: FK.emp }))
  const [fElig, setFElig] = useState(seedFilter({ f: initialFilters, k: FK.elig }))
  return {
    [FK.q]: { v: q, set: setQ },
    [FK.noc]: { v: fNoc, set: setFNoc },
    [FK.country]: { v: fCountry, set: setFCountry },
    [FK.prov]: { v: fProv, set: setFProv },
    [FK.city]: { v: fCity, set: setFCity },
    [FK.district]: { v: fDistrict, set: setFDistrict },
    [FK.broad]: { v: fBroad, set: setFBroad },
    [FK.mid]: { v: fMid, set: setFMid },
    [FK.fine]: { v: fFine, set: setFFine },
    [FK.teer]: { v: fTeer, set: setFTeer },
    [FK.source]: { v: fSource, set: setFSource },
    [FK.acc]: { v: fAcc, set: setFAcc },
    [FK.pnp]: { v: fPnp, set: setFPnp },
    [FK.aip]: { v: fAip, set: setFAip },
    [FK.pilot]: { v: fPilot, set: setFPilot },
    [FK.status]: { v: fStatus, set: setFStatus },
    [FK.origin]: { v: fOrigin, set: setFOrigin },
    [FK.score]: { v: fScore, set: setFScore },
    [FK.sal]: { v: fSal, set: setFSal },
    [FK.vs]: { v: fVs, set: setFVs },
    [FK.emp]: { v: fEmp, set: setFEmp },
    [FK.elig]: { v: fElig, set: setFElig },
  }
}

/**
 * 筛选整台:各格 + 联动选项 + 对这套条件的操作(清除、保存)。
 * 「更多筛选」折叠恢复(2026-07-11 用户二次拍板:五行常驻太占竖向空间,恢复默认收起);
 * 2026-08-16 PNP/年薪 从常用一行下沉进折叠区(方案 B),一并进徽标计数,否则选了却看不出来。
 * useDeferredValue 让搜索输入跟手(cur 滞后一帧触发重拉);URL 与快照走**未防抖**的 snap。
 * 保存此筛选(E5-03;D1 2026-07-19 降免费):登录即可存,免费 2 / Pro 5 —— 免费触上限才弹升级。
 * 2026-08-16 Frank「保存此筛选没有必要吧」→ 留:它是「简化操作才收费」那条定价原则的落点。
 *
 * @param x 初始筛选、维度表、界面语言、取词函数、分层态与触上限时的去处。
 * @returns 筛选面板与内部要用的几样。
 */
function useBoardFilters(x: BoardFiltersHookIn): BoardFiltersHookOut {
  const fState = useFilterSlots(x.initialFilters)
  const [directOnly, setDirectOnly] = useState(x.initialFilters[FK_DIRECT] === true)
  const [fold, setFold] = useState(false)
  const q = slotOf({ fState, k: FK.q })
  const dq = useDeferredValue(q)
  const prov = slotOf({ fState, k: FK.prov })
  const city = slotOf({ fState, k: FK.city })
  const broad = slotOf({ fState, k: FK.broad })
  const mid = slotOf({ fState, k: FK.mid })
  const dims = x.dims
  const opts = useMemo(function buildOpts() {
    return filterOptsOf({ dims, prov, city, broad, mid })
  }, [dims, prov, city, broad, mid])
  const nameOf = makeNocName({ dims, lang: x.lang })
  const anyFilter = anyFilterOf({ fState, directOnly })
  const nocLabel = nocLabelOf({ fNoc: slotOf({ fState, k: FK.noc }), nameOf, lang: x.lang })
  const t = x.t
  const onLimit = x.onLimit
  const lang = x.lang
  async function onSaveSearch(): Promise<void> {
    const name = window.prompt(t('ss.name'))
    if (name == null || name === TEXT_NONE) {
      return
    }
    track(TRACK_SAVE_SEARCH)
    const hit = await postSavedSearch({ name, filters: saveFiltersOf({ fState, directOnly }), lang })
    if (hit === SAVE_OK) {
      window.alert(t('ss.saved'))
      return
    }
    if (hit === SAVE_LIMIT && x.plan.isPro === false) {
      onLimit()
      return
    }
    window.alert(t('ss.err'))
  }
  return {
    panel: {
      fState,
      opts,
      anyFilter,
      showPicked: pickedShownOf({ anyFilter, nocLabel, loggedIn: x.plan.loggedIn }),
      foldActive: foldActiveOf({ fState, directOnly }),
      fold,
      onFold: function toggleFold(): void {
        setFold(fold === false)
      },
      directOnly,
      onDirect: setDirectOnly,
      nocLabel,
      onNocClear: function clearNoc(): void {
        setterOf({ fState, k: FK.noc })(TEXT_NONE)
      },
      onClear: function clearAll(): void {
        clearFiltersIn({ fState, setDirect: setDirectOnly })
      },
      onSaveSearch,
    },
    q,
    setQ: setterOf({ fState, k: FK.q }),
    cur: curFiltersOf({ fState, q: dq, directOnly }),
    snap: curFiltersOf({ fState, q, directOnly }),
    setDirect: setDirectOnly,
  }
}

/**
 * 存一套筛选。免费位用满时服务端回一个带 limit 字样的错 —— 那时才弹升级框「Pro 可存 5 个」。
 *
 * @param x 名字、条件与界面语言。
 * @returns 成 / 触上限 / 其它失败。
 */
async function postSavedSearch(x: SaveSearchIn): Promise<string> {
  const res = await fetch(URL_API_SAVED_SEARCHES, {
    method: METHOD_POST,
    credentials: CREDENTIALS_INCLUDE,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({ name: x.name, filters: x.filters, lang: x.lang }),
  }).catch(nullOf)
  if (res == null) {
    return SAVE_ERR
  }
  if (res.ok) {
    return SAVE_OK
  }
  const body = await res.json().catch(nullOf)
  if (body != null && LIMIT_RE.test(JSON.stringify(body))) {
    return SAVE_LIMIT
  }
  return SAVE_ERR
}

/**
 * 列整台:显示哪几列、多宽、固定哪几列。
 * 初始列来自服务端 cookie 解析(initialCols)→ SSR 与客户端首帧一致(零闪);无则用默认。
 * 迁移:老用户有 localStorage 列偏好但还没 cookie(本次改动前设的)→ 应用 + 补写 cookie(一次性);
 * 有 cookie 时服务端已渲对的列、initialCols 已传入 → 直接 return,不进迁移。
 * 换列集 → useColWidths 自己重量重分(手动宽同时作废)。
 *
 * @param x cookie 列集与列宽种子、界面语言与当前这批行。
 * @returns 列面板。
 */
function useBoardCols(x: BoardColsHookIn): BoardColsPanel {
  const [visible, setVisible] = useState<JobColKey[]>(initialColsOf(x.initialCols))
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const headRowRef = useRef<HTMLTableRowElement>(null)
  const initialCols = x.initialCols
  useIsoLayoutEffect(function migrateColsPref() {
    if (initialCols != null && initialCols.length > 0) {
      return
    }
    const keys = readColsPref()
    if (keys.length > 0) {
      setVisible(keys)
      writeColsCookie(keys)
    }
  }, [initialCols])
  function closePanel(): void {
    setOpen(false)
  }
  useOutsideClose({ boxRef, open, onClose: closePanel })
  function save(next: JobColKey[]): void {
    writeColsCookie(next)
    writeColsPref(next)
    setVisible(next)
  }
  const shown = shownColsOf(visible)
  const shownKey = colsKeyOf(shown)
  const cw = useColWidths({
    keys: keysOf(shown),
    headRowRef,
    dataKey: dataKeyOf({ shownKey, lang: x.lang, rows: x.rows }),
    pad: CELL_PAD,
    seed: x.initialColW,
  })
  const frozen = useFrozenCols({ shown, headRowRef, cw, shownKey })
  return {
    shown,
    visible,
    open,
    boxRef,
    headRowRef,
    cw,
    onOpen: function togglePanel(): void {
      setOpen(open === false)
    },
    onCol: function toggleCol(k: JobColKey): void {
      save(colsAfterToggle({ visible, k }))
    },
    onMain: function mainCols(): void {
      save(defaultColsOf())
    },
    onAll: function allCols(): void {
      save(togglableColsOf())
    },
    onInvert: function invertCols(): void {
      save(colsInverted(visible))
    },
    stickyLeft: frozen.stickyLeft,
    frozenSet: frozen.frozenSet,
    lastFrozen: frozen.lastFrozen,
  }
}

/**
 * 勾/取消一列之后的列集(按列序归位,不按点击先后堆)。
 *
 * @param x 当前勾选与点的那一列。
 * @returns 新列集。
 */
function colsAfterToggle(x: ColsToggleIn): JobColKey[] {
  const next: JobColKey[] = []
  for (const k of x.visible) {
    if (k !== x.k) {
      next.push(k)
    }
  }
  if (x.visible.includes(x.k) === false) {
    next.push(x.k)
  }
  return next
}

/**
 * 反选:可勾选列里没勾的那些。
 *
 * @param visible 当前勾选。
 * @returns 新列集。
 */
function colsInverted(visible: JobColKey[]): JobColKey[] {
  const next: JobColKey[] = []
  for (const k of togglableColsOf()) {
    if (visible.includes(k) === false) {
      next.push(k)
    }
  }
  return next
}

/**
 * 固定左列:先量固定列实宽 → 算累计 left,再贴 sticky(先计算再显示)。
 * 列宽变了必须重量的理由见 stickyOffsetsOf 的 JSDoc。
 *
 * @param x 当前列、表头锚点、列宽机器与列集签名。
 * @returns 冻结集、累计偏移与最后一枚固定列。
 */
function useFrozenCols(x: FrozenHookIn): FrozenPanel {
  const frozenKeys = frozenKeysOf(x.shown)
  const [stickyLeft, setStickyLeft] = useState<Record<string, number>>({})
  const headRowRef = x.headRowRef
  const frozenKey = frozenKeys.join(COMMA)
  const colwKey = widthsKeyOf({ shown: x.shown, cw: x.cw })
  const overflow = x.cw.overflow
  useIsoLayoutEffect(function measureSticky() {
    setStickyLeft(stickyOffsetsOf({ head: headRowRef.current, frozenKeys: splitKeys(frozenKey) }))
  }, [headRowRef, frozenKey, overflow, colwKey])
  useEffect(function watchWindowResize() {
    function onResize(): void {
      setStickyLeft(stickyOffsetsOf({ head: headRowRef.current, frozenKeys: splitKeys(frozenKey) }))
    }
    window.addEventListener(EV_RESIZE, onResize)
    return function stopResizeWatch() {
      window.removeEventListener(EV_RESIZE, onResize)
    }
  }, [headRowRef, frozenKey])
  return { stickyLeft, frozenSet: new Set(frozenKeys), lastFrozen: lastOf(frozenKeys) }
}

/**
 * 逗号签名 → 列键(空签名给空数组,别拆出一个空串键)。
 *
 * @param key 逗号连接的列键。
 * @returns 列键。
 */
function splitKeys(key: string): string[] {
  if (key === TEXT_NONE) {
    return []
  }
  return key.split(COMMA)
}

/**
 * 数据整台(E10-01 P3:筛选/搜索/排序/翻页全部打 /api/jobs,服务端 WHERE + 分页;
 * 旧 20k blob 已废)。reqSeq 丢弃晚到的旧响应;网络失败留现有行(首屏 50 行仍可用)。
 * 首屏 page0 非匹配、且筛选与 SSR 那次完全一致 = 服务端已经给过这批行 → 跳过首次重复拉取(不闪);
 * 无筛选时两边都是空签名,与改造前的「没筛选就不拉」等价。
 * 大维度独立加载(cities/districts/designatedEmployers/nocDescriptions),不再随职位 blob。
 *
 * @param x props、当前筛选、排序与匹配视图。
 * @returns 数据面板。
 */
function useBoardData(x: BoardDataHookIn): BoardDataPanel {
  const [rows, setRows] = useState<JobFact[]>(x.props.jobs)
  const [total, setTotal] = useState(totalOf(x.props))
  const [updatedAt, setUpdatedAt] = useState(strOf(x.props.updatedAt))
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [matchTotals, setMatchTotals] = useState<MatchTotals | null>(null)
  const reqSeq = useRef(0)
  const firstFetch = useRef(true)
  const ssrSig = useRef(filterSig(initialFiltersOf(x.props.initialFilters)))
  const pageSig = pageSigOf({ cur: x.cur, sort: x.sort, matchView: x.matchView })
  const [prevPageSig, setPrevPageSig] = useState(pageSig)
  if (prevPageSig !== pageSig) {
    setPrevPageSig(pageSig)
    setPage(0)
  }
  const fresh = page === 0
  const query = jobsQueryOf({ cur: x.cur, sort: x.sort, matchView: x.matchView, page })
  const skipFirst = firstFetch.current && fresh && x.matchView === false && filterSig(x.cur) === ssrSig.current
  useEffect(function loadPage() {
    firstFetch.current = false
    if (skipFirst) {
      return
    }
    const seq = reqSeq.current + 1
    reqSeq.current = seq
    setLoading(true)
    fetch(URL_API_JOBS + query, { credentials: CREDENTIALS_INCLUDE })
      .then(readJobsPage)
      .then(function onPage(d: JobsPageJson | null) {
        if (seq !== reqSeq.current || d == null) {
          return
        }
        setTotal(numOf(d.total))
        if (d.updatedAt != null) {
          setUpdatedAt(d.updatedAt)
        }
        setMatchTotals(matchTotalsOf(d))
        setRows(appendedRows({ d, fresh }))
      })
      .catch(swallow)
      .finally(function endLoad() {
        if (seq === reqSeq.current) {
          setLoading(false)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只跟「查询串变了」走;skipFirst 是首帧一次性判据,进依赖会多打一次
  }, [query])
  return {
    rows,
    total,
    updatedAt,
    dims: x.dims,
    loading,
    matchTotals,
    swapping: loading && fresh,
    onMore: function loadMore(): void {
      setPage(page + 1)
    },
  }
}

/**
 * 维度表整台:首屏那份(SSR 瘦身后 cities/districts/designatedEmployers/nocDescriptions 是空表)
 * + /api/jobs/dims 补回来的四张大表。
 * 🔴 2026-08-29 Frank 实拍「更多筛选里全部市/全部区两只下拉没数据」的病灶就在这一格的归属:
 * 08-28 拆件时这份 state 落在 useBoardData 里,而 useBoardFilters 只能拿到 props 的那份(空表),
 * 于是市/区选项永远是空 —— 省/大类看着正常,是因为 provinces/nocCategories 随 SSR 一起来。
 * 两个 hook 又不能互相取(data 要 filters.cur 算查询串),所以把这一格提到整台的最上面,
 * 两边都收它当入参(与拆件前的单份 state 同源)。
 *
 * @param props 组件收到的 props(首屏那份维度)。
 * @returns 合并后的维度表。
 */
function useBoardDims(props: JobsIn): JobDims {
  const [dims, setDims] = useState(dimsOf(props))
  useBigDims(setDims)
  return dims
}

/**
 * 大维度独立加载(cities/districts/designatedEmployers/nocDescriptions),不再随职位 blob。
 *
 * @param setDims 维度表的写口。
 * @returns 无。
 */
function useBigDims(setDims: (f: (prev: JobDims) => JobDims) => void): void {
  useEffect(function loadBigDims() {
    let dead = false
    fetch(URL_API_JOBS_DIMS)
      .then(readDims)
      .then(function onDims(d: DimsJson | null) {
        if (dead === false && d != null && d.dims != null) {
          setDims(mergedDims(d.dims))
        }
      })
      .catch(swallow)
    return function stopDims() {
      dead = true
    }
  }, [setDims])
}

/**
 * 这一页回来的行怎么并:第 0 页整表换血,其余页往后追加。
 *
 * @param x 响应与是不是第 0 页。
 * @returns 交给 setState 的新值或合并函数。
 */
function appendedRows(x: AppendRowsIn): JobFact[] | ((prev: JobFact[]) => JobFact[]) {
  const got = pageRowsOf(x.d)
  if (x.fresh) {
    return got
  }
  return function append(prev: JobFact[]): JobFact[] {
    return prev.concat(got)
  }
}

/**
 * 响应里的行(缺席按空算)。
 *
 * @param d 响应。
 * @returns 行。
 */
function pageRowsOf(d: JobsPageJson): JobFact[] {
  if (d.rows == null) {
    return []
  }
  return d.rows
}

/**
 * 全量匹配计数(FOMO「你今日共 X 个高匹配」):match 视图端点才返回。
 *
 * @param d 响应。
 * @returns 计数;不是匹配视图给 null。
 */
function matchTotalsOf(d: JobsPageJson): MatchTotals | null {
  if (typeof d.matchHigh !== 'number') {
    return null
  }
  return { high: d.matchHigh, mid: numOf(d.matchMid) }
}

/**
 * 独立加载回来的大维度并进现有维度(只补这几张表,其余不动)。
 *
 * @param got 独立加载回来的那几张。
 * @returns 合并函数(交给 setState)。
 */
function mergedDims(got: Partial<JobDims>): (prev: JobDims) => JobDims {
  return function merge(prev: JobDims): JobDims {
    return Object.assign({}, prev, got)
  }
}

/**
 * 首屏总数:库内真实总数(第 15 轮 #34);筛选态由服务端给命中数(第 17 轮 #42)。
 *
 * @param props 组件收到的 props。
 * @returns 总数。
 */
function totalOf(props: JobsIn): number {
  if (props.totalCount == null) {
    return props.jobs.length
  }
  return props.totalCount
}

/**
 * 首屏维度(props 没给就用空维度,随后由 /api/jobs/dims 补)。
 *
 * @param props 组件收到的 props。
 * @returns 维度表。
 */
function dimsOf(props: JobsIn): JobDims {
  if (props.dims == null) {
    return EMPTY_DIMS
  }
  return props.dims
}

/**
 * 弹框层整台:字段弹框(E8-10:存**分组**不再存字段,24 → 3;srcField 只用于打开时锚到哪一节,
 * 不参与内容分支)、职位描述弹框(C1 走查拍板 2026-07-07:删两套公司弹窗,ActModal 只剩 JD 快看)、
 * 首访引导、升级/登录弹框。
 * E11-05②:首访自动弹引导(登录且无档案且没弹过);关/完成置 OB_SEEN 不再自动弹。
 * 三问弹框已退役(2026-07-31 Frank「不需要弹框答题了,统一一下答题功能」):答题只剩 /plan/* 的
 * 答题器,职位板只读答案做回显与筛选;自动弹窗(#237 的排队逻辑)随之删掉。Esc 关弹框。
 *
 * @param x 分层态。
 * @returns 弹框层面板与三个开口。
 */
function useBoardModals(x: ModalsHookIn): ModalsHookOut {
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [descJob, setDescJob] = useState<JobFact | null>(null)
  const [wizard, setWizard] = useState(false)
  const [upsell, setUpsell] = useState<UpsellKind>(false)
  const loggedIn = x.plan.loggedIn
  const profileOk = x.plan.profileOk
  useEffect(function autoOpenWizard() {
    if (loggedIn === false || profileOk || obSeen()) {
      return
    }
    setWizard(true)
  }, [loggedIn, profileOk])
  function closeBoth(): void {
    setPopup(null)
    setDescJob(null)
  }
  useEscClose({ open: popup != null || descJob != null, onClose: closeBoth })
  return {
    panel: {
      popup,
      descJob,
      wizard,
      upsell,
      onPopupClose: function closePopup(): void {
        setPopup(null)
      },
      onDescClose: function closeDesc(): void {
        setDescJob(null)
      },
      onWizardClose: function closeWizard(): void {
        markObSeen()
        setWizard(false)
      },
      onUpsellClose: function closeUpsell(): void {
        setUpsell(false)
      },
      onUpsellDone: makeUpsellDone(upsell),
    },
    setPopup,
    setDescJob,
    setUpsell,
  }
}

/**
 * 匿名注册/登录成功之后的落点。注册成功就把本地答案落成档案(不让用户填两遍);答案来自
 * 统一存储,不再靠弹框回传。E9-04b:'login' 目前只有「我的匹配」入口在用 —— 登录成功
 * 直接落匹配视图(邮箱路径走这里,Google 路径走 returnTo),不再回列表让用户再点一次
 * (Frank「点我的匹配也一样」)。
 *
 * @param upsell 这次弹框的由头。
 * @returns 完成回调。
 */
function makeUpsellDone(upsell: UpsellKind): () => Promise<void> {
  return async function onUpsellDone(): Promise<void> {
    await saveQuizAnswers()
    if (upsell === UPSELL_LOGIN) {
      window.location.href = URL_BOARD_MATCH
      return
    }
    window.location.reload()
  }
}

/**
 * Esc 关弹框。
 *
 * @param x 开着没与关的动作。
 * @returns 无。
 */
function useEscClose(x: EscCloseIn): void {
  const onClose = x.onClose
  const open = x.open
  useEffect(function watchEsc() {
    if (open === false) {
      return
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === KEY_ESCAPE) {
        onClose()
      }
    }
    window.addEventListener(EV_KEY_DOWN, onKey)
    return function stopEscWatch() {
      window.removeEventListener(EV_KEY_DOWN, onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose 每渲一次都是新函数,只跟开合走
  }, [open])
}

/**
 * 点其它地方关掉浮层(字段面板)。
 *
 * @param x 浮层外框、开着没与关的动作。
 * @returns 无。
 */
function useOutsideClose(x: OutsideCloseIn): void {
  const boxRef = x.boxRef
  const onClose = x.onClose
  const open = x.open
  useEffect(function watchOutside() {
    if (open === false) {
      return
    }
    function onDown(e: MouseEvent): void {
      const box = boxRef.current
      if (box != null && box.contains(e.target as Node) === false) {
        onClose()
      }
    }
    document.addEventListener(EV_MOUSE_DOWN, onDown)
    return function stopOutsideWatch() {
      document.removeEventListener(EV_MOUSE_DOWN, onDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose 每渲一次都是新函数,只跟开合走
  }, [open, boxRef])
}

/**
 * 职位板整台。首屏拆分:SSR 带最近 50 行秒开,筛选/搜索/翻页由取数 effect 打 /api/jobs 分页。
 * 排序默认「发布时间最新在前」(#127 拍板;旧 0-100 分不再参与任何排序);直链进匹配视图时
 * 默认按匹配度排(2026-07-21 Frank:横幅写「按匹配度排序」得名副其实,原默认发布时间序把
 * 非今日的高匹配全压在今日中匹配下面)。
 * 「我的匹配」视图(E5-05,D1 = B):只看命中我档案的岗;URL ?view=match 可分享可回退。
 * 分类维表随维度一起登记给 catName —— 名字住 noc_categories(broad_en/broad_ko),
 * 分类换一版就不必再往 i18n 里手加 17×3 个键(#256 那类事故的同一个根)。
 *
 * @param props 服务端门算好的全部输入。
 * @returns 职位板面板。
 */
export function useJobsBoard(props: JobsIn): JobsBoardPanel {
  const [lang, , t] = useLang()
  const plan = planOf(props)
  const matchRequested = props.initialMatchView === true && plan.loggedIn && plan.profileOk
  const [matchView, setMatchView] = useState(matchRequested)
  const [sort, setSort] = useState<SortState>(initialSortOf(matchRequested))
  const modals = useBoardModals({ plan })
  const setUpsell = modals.setUpsell
  function onUpsellLock(): void {
    setUpsell(UPSELL_LOCK)
  }
  function onUpsellSs(): void {
    setUpsell(UPSELL_SS)
  }
  const dims = useBoardDims(props)
  const filters = useBoardFilters({
    initialFilters: initialFiltersOf(props.initialFilters),
    dims,
    lang,
    t,
    plan,
    onLimit: onUpsellSs,
  })
  const data = useBoardData({ props, dims, cur: filters.cur, sort, matchView })
  const cols = useBoardCols({
    initialCols: props.initialCols,
    initialColW: colwSeedOf(props),
    lang,
    rows: data.rows,
  })
  useCatLabels(data.dims)
  useBoardHydrate({ fState: filters.panel.fState, setDirect: filters.setDirect, props, plan, setMatchView, setSort })
  useBoardUrlSync(filters.snap)
  const saved = useSavedJobs({ plan, onAnon: onUpsellLock })
  const blocked = useBlockedKeys(data.dims)
  return {
    t,
    lang,
    plan,
    data,
    filters: filters.panel,
    cols,
    modals: modals.panel,
    sort,
    onSort: function onSort(k: JobColKey): void {
      setSort(nextSortOf({ sort, key: k, fallback: fallbackSortOf(matchView) }))
    },
    matchView,
    gate: useMatchGate({ plan, matchView, t }),
    saved: saved.saved,
    onSave: saved.onSave,
    onField: makeFieldRouter({ setPopup: modals.setPopup }),
    onDesc: modals.setDescJob,
    onUpsellLock,
    blocked,
    cellCtx: { t, plan, blocked, eeCats: data.dims.eeCategories },
    q: filters.q,
    onQ: filters.setQ,
    updatedText: updatedTextOf({ t, updatedAt: data.updatedAt }),
    emptyText: emptyTextOf({ t, matchView }),
    emptyLink: emptyLinkOf({ t, matchView }),
    allShownText: t('allShown', { total: data.total }),
    moreText: t('loadMore', { n: data.total - data.rows.length }),
    proof: proofOf(props),
  }
}

/**
 * 分层态:props 没给就按匿名免费算(老调用方兼容)。
 *
 * @param props 组件收到的 props。
 * @returns 分层态。
 */
function planOf(props: JobsIn): JobPlan {
  if (props.plan == null) {
    return FREE_PLAN
  }
  return props.plan
}

/**
 * cookie 里的列宽种子(props 没给就是没有)。
 *
 * @param props 组件收到的 props。
 * @returns 种子;没有给 null。
 */
function colwSeedOf(props: JobsIn): ColWidthSeed | null {
  if (props.initialColW == null) {
    return null
  }
  return props.initialColW
}

/**
 * 首屏排序:直链进匹配视图按匹配度,否则按发布时间。
 *
 * @param matchRequested 直链进的是不是匹配视图。
 * @returns 排序态。
 */
function initialSortOf(matchRequested: boolean): SortState {
  if (matchRequested) {
    return { key: SORT_MATCH, dir: DIR_DESC }
  }
  return { key: SORT_DEFAULT, dir: DIR_DESC }
}

/**
 * 第三下取消排序时回哪一列(匹配视图 = 匹配度,普通视图 = 发布时间)。
 *
 * @param matchView 匹配视图开着没。
 * @returns 默认排序列。
 */
function fallbackSortOf(matchView: boolean): JobColKey {
  if (matchView) {
    return SORT_MATCH
  }
  return SORT_DEFAULT
}

/**
 * 官方具名排除清单:整表算一次 `省码|NOC` 命中集,逐行 O(1) 查。
 *
 * @param dims 维度表。
 * @returns 两套键集。
 */
function useBlockedKeys(dims: JobDims): BlockedKeys {
  const rows = dims.pnpOccupations
  return useMemo(function buildBlocked() {
    return blockedKeysOf(rows)
  }, [rows])
}

/**
 * 分类维表登记给 catName:中/小类的英韩名也在这张表里,一并登记。
 *
 * @param dims 维度表。
 * @returns 无。
 */
function useCatLabels(dims: JobDims): void {
  const nc = dims.nocCategories
  useMemo(function registerLabels() {
    registerCatLabels(nc)
  }, [nc])
}

/**
 * 单一路由:查 FIELD_GROUP 决定开哪个弹框 / 跳地图 / 什么都不做。两处调用方(表格行、手机卡)
 * 共用,不再各自 setPopup —— 2026-07-19 那天的三个 bug 全出在「按字段特判散落各处」。
 * 各字段只查自己那一级(与「一格一事」同一原则):点省看省、点市看市、点区/地址才到街号;
 * 查询串统一走 mapQuery(与表格格 href、手机卡同源;省用全称消歧)。
 *
 * @param x 字段弹框的开口。
 * @returns 点一格时的路由函数。
 */
function makeFieldRouter(x: FieldRouterIn): (k: JobColKey, j: JobFact, title: string) => void {
  return function openField(k: JobColKey, j: JobFact, title: string): void {
    const d = FIELD_GROUP[k]
    if (d == null || d === DISPOSITION_NONE) {
      return
    }
    if (d === DISPOSITION_MAP) {
      const q = mapQuery({ field: k, job: j })
      if (q !== TEXT_NONE) {
        window.open(mapsUrl(q), TARGET_BLANK, WINDOW_FEATURES)
      }
      return
    }
    x.setPopup({ group: d, srcField: k, job: j, title })
  }
}

/**
 * 水合时的两件事:返回保筛选(2026-07-25)—— 详情整页右上角 × 带 ?back=1 回流 → 回放快照,
 * 只在 back=1 时回放(直接访问仍是干净板),回放后立刻洗掉参数(同 ?login=1 惯例);
 * 以及 URL 里的筛选(stats/rankings 回流、stats L2 下钻 mid、详情页小类 fine)——
 * 它已由服务端解析成 initialFilters 当了 state 初值,这里再读一遍只作兜底(值相同,React 自会跳过重渲)。
 * E5-05 直链回流:?view=match 且已登录已建档 → 进匹配视图并按匹配度排。
 *
 * @param x 筛选各格、只看直发的写口、props、分层态与两个视图写口。
 * @returns 无。
 */
function useBoardHydrate(x: HydrateIn): void {
  const fState = x.fState
  const setDirect = x.setDirect
  const props = x.props
  const plan = x.plan
  const setMatchView = x.setMatchView
  const setSort = x.setSort
  useIsoLayoutEffect(function hydrateFromUrl() {
    const sp = readSearch()
    if (sp.get(P_BACK) === VAL_ON) {
      applyFiltersTo({ fState, f: readSnapshot(), setDirect })
      sp.delete(P_BACK)
      replaceQuery(sp)
    }
    applyFiltersTo({ fState, f: initialFiltersOf(props.initialFilters), setDirect })
    if (sp.get(P_VIEW) === VAL_MATCH && plan.loggedIn && plan.profileOk) {
      setMatchView(true)
      setSort({ key: SORT_MATCH, dir: DIR_DESC })
    }
  }, [])
}

/**
 * 地址栏查询参数(拿不到就当空)。
 *
 * @returns 查询参数。
 */
function readSearch(): URLSearchParams {
  try {
    return new URLSearchParams(window.location.search)
  } catch {
    return new URLSearchParams()
  }
}

/**
 * 返回保筛选的快照(脏数据一律当没有)。
 *
 * @returns 快照;没有给空对象。
 */
function readSnapshot(): JobFilters {
  try {
    const raw = localStorage.getItem(BOARD_FILTERS_KEY)
    if (raw == null) {
      return {}
    }
    const s: unknown = JSON.parse(raw)
    if (s == null || typeof s !== 'object') {
      return {}
    }
    return s as JobFilters
  } catch {
    return {}
  }
}

/**
 * 筛选 → URL(刷新保选项)+ localStorage 快照(返回保筛选的数据面):都只记非默认值,
 * 全默认就把参数/快照清掉,不留陈年状态。URL 只动自己管的那几个 key,别人的参数(view 等)
 * 原样留着。Frank 2026-08-03「右键一刷新,之前的选项也没有保持」→ 筛选进 URL:刷新能复原、
 * 链接能分享,而搜索引擎进来的干净 /jobs 依旧是干净板(没参数就没筛选,不会替陌生人预设条件)。
 *
 * @param snap 当前非默认筛选(关键词未防抖)。
 * @returns 无。
 */
function useBoardUrlSync(snap: JobFilters): void {
  const sig = filterSig(snap)
  const hydrated = useRef(false)
  useEffect(function syncUrlAndSnapshot() {
    if (hydrated.current) {
      writeFiltersToUrl(snap)
    }
    hydrated.current = true
    writeSnapshot(snap)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 签名变了才同步(snap 每渲一次都是新对象)
  }, [sig])
}

/**
 * 把当前筛选写回地址栏(只动自己管的那几个 key)。
 *
 * @param snap 当前非默认筛选。
 * @returns 无。
 */
function writeFiltersToUrl(snap: JobFilters): void {
  try {
    const u = new URL(window.location.href)
    for (const [urlKey, fKey] of Object.entries(URL_TO_FILTER)) {
      const v = snap[fKey]
      if (typeof v === 'string' && v !== TEXT_NONE) {
        u.searchParams.set(urlKey, v)
      } else {
        u.searchParams.delete(urlKey)
      }
    }
    if (snap[FK_DIRECT] === true) {
      u.searchParams.set(DIRECT_URL_KEY, VAL_ON)
    } else {
      u.searchParams.delete(DIRECT_URL_KEY)
    }
    replaceIfChanged(u)
  } catch {
    return
  }
}

/**
 * 地址真的变了才写(免得每次重渲都往历史里塞一条)。
 *
 * @param u 算好的地址。
 * @returns 无。
 */
function replaceIfChanged(u: URL): void {
  let tail = TEXT_NONE
  const qs = u.searchParams.toString()
  if (qs !== TEXT_NONE) {
    tail = QS_HEAD + qs
  }
  const next = u.pathname + tail + u.hash
  const now = window.location.pathname + window.location.search + window.location.hash
  if (next !== now) {
    window.history.replaceState(null, TEXT_NONE, next)
  }
}

/**
 * 快照:有筛选就存,全默认就清。
 *
 * @param snap 当前非默认筛选。
 * @returns 无。
 */
function writeSnapshot(snap: JobFilters): void {
  try {
    if (Object.keys(snap).length > 0) {
      localStorage.setItem(BOARD_FILTERS_KEY, JSON.stringify(snap))
      return
    }
    localStorage.removeItem(BOARD_FILTERS_KEY)
  } catch {
    return
  }
}

/**
 * 响应 → 身份 JSON(拉失败给 null)。
 *
 * @param r 响应。
 * @returns 身份;失败给 null。
 */
function readMe(r: Response): Promise<MeJson | null> {
  return r.json().catch(nullOf)
}

/**
 * 响应 → 收藏列表(拉失败给 null)。
 *
 * @param r 响应。
 * @returns 收藏列表;失败给 null。
 */
function readSavedList(r: Response): Promise<SavedListJson | null> {
  return r.json().catch(nullOf)
}

/**
 * 2xx 才解职位分页(非 2xx 一律当没拿到,不把错误体当数据用)。
 *
 * @param r 响应。
 * @returns 这一页;非 2xx 或失败给 null。
 */
function readJobsPage(r: Response): Promise<JobsPageJson | null> {
  if (r.ok === false) {
    return Promise.resolve(null)
  }
  return r.json().catch(nullOf)
}

/**
 * 2xx 才解大维度。
 *
 * @param r 响应。
 * @returns 维度;非 2xx 或失败给 null。
 */
function readDims(r: Response): Promise<DimsJson | null> {
  if (r.ok === false) {
    return Promise.resolve(null)
  }
  return r.json().catch(nullOf)
}

/**
 * 2xx 才解投递方式。
 *
 * @param r 响应。
 * @returns 投递方式;非 2xx 或失败给 null。
 */
function readApplyHow(r: Response): Promise<ApplyHowJson | null> {
  if (r.ok === false) {
    return Promise.resolve(null)
  }
  return r.json().catch(nullOf)
}

/**
 * 出错时给 null(catch 的落点)。
 *
 * @returns null。
 */
function nullOf(): null {
  return null
}

/**
 * 网络失败:留现有行,不动状态(首屏 50 行仍可用)。
 *
 * @returns 无。
 */
function swallow(): void {
  return
}

/**
 * 登录成功:洗掉地址栏参数并整页刷新,让 SSR 分层态(匹配列等)生效。
 *
 * @returns 无。
 */
function reloadBoard(): void {
  try {
    window.history.replaceState(null, TEXT_NONE, URL_BOARD)
  } catch {
    window.location.reload()
    return
  }
  window.location.reload()
}

/**
 * 注册成功就把本地答案落成档案(不让用户填两遍);没答过就什么都不做。
 *
 * @returns 无。
 */
async function saveQuizAnswers(): Promise<void> {
  const a = readQuiz()
  if (a == null || a.nocs == null || a.nocs.length === 0) {
    return
  }
  await quizToProfile({ status: a.status, nocs: a.nocs, provs: a.provs })
}

/**
 * JD 正文身体的整台(详情页与弹框同一副身体)。正文一律懒取(fetchJobText 带同岗会话缓存),
 * 原站拦抓取的走空态说事实,不绕过访问控制。
 * J3(2026-07-19 Frank 批):AI 五节整理版懒生成 —— undefined = 整理中,null = 没有(降级原文),
 * string = 整理版;与原文并行拉,命中缓存秒回,首次生成慢(模型现算)期间正文照常显示原文。
 * 第 25 轮 #114:失败态拆三种 —— quota = 额度用完(重试无用不给钮)/ fail = 生成失败(可重试)/
 * notext = 无正文(不显示失败行)。#201:JD 已免费,付费墙态退役;limited = 宽松防滥用闸偶发。
 *
 * @param x 本岗、界面语言、分层态与额度回传。
 * @returns JD 身体面板。
 */
export function useJobBody(x: JobBodyIn): JobBodyPanel {
  const t = makeT(x.lang)
  const jd = useJdText({ job: x.job, onFreeLeft: x.onFreeLeft })
  const fmt = useJdFormat(x.job)
  const trans = useJdTrans({ job: x.job, lang: x.lang, resetKey: fmt.resetKey })
  const apply = useApplyHow(x.job)
  const [showOrig, setShowOrig] = useState(false)
  const [aiOn, setAiOn] = useState(false)
  useEffect(function resetToggles() {
    setShowOrig(false)
    setAiOn(false)
  }, [fmt.resetKey])
  return {
    t,
    text: jd.text,
    status: jd.status,
    fmt: fmt.fmt,
    fmtWhy: fmt.fmtWhy,
    showOrig,
    onToggleOrig: function toggleOrig(): void {
      setShowOrig(showOrig === false)
    },
    onRetryFmt: fmt.onRetry,
    aiOn,
    onToggleAi: function toggleAi(): void {
      if (aiOn === false) {
        track(TRACK_AI_READ_JD)
      }
      setAiOn(aiOn === false)
    },
    showTrans: trans.showTrans,
    trans: trans.trans,
    transStatus: trans.transStatus,
    onToggleTrans: trans.onToggle,
    applyEmail: applyEmailPick({ jb: apply.email, text: jd.text }),
    applyDone: apply.done,
  }
}

/**
 * 投递邮箱:Job Bank 岗懒查来的优先,其次从正文正则兜底。「怎么投」节与投递栏共用同一份结果。
 *
 * @param x 懒查来的邮箱与正文。
 * @returns 邮箱;都没有给空串。
 */
function applyEmailPick(x: ApplyEmailPickIn): string {
  if (x.jb !== TEXT_NONE) {
    return x.jb
  }
  return applyEmailOf(x.text)
}

/**
 * 懒取 JD 正文(#126 同岗会话缓存);额度可见化回传(弹框页眉;页面不挂)。
 *
 * @param x 本岗与额度回传。
 * @returns 正文与取数态。
 */
function useJdText(x: JdTextHookIn): JdTextPanel {
  const [text, setText] = useState(TEXT_NONE)
  const [status, setStatus] = useState<JdStatus>(JD_LOADING)
  const url = strOf(x.job.applyUrl)
  const onFreeLeft = x.onFreeLeft
  useEffect(function loadJdText() {
    const ctrl = new AbortController()
    setStatus(JD_LOADING)
    setText(TEXT_NONE)
    fetchJobText(url, ctrl.signal)
      .then(function onText(r) {
        if (r.freeLeft != null && onFreeLeft != null) {
          onFreeLeft(r.freeLeft)
        }
        if (r.status === TEXT_STATUS.limited) {
          setStatus(JD_LIMITED)
          return
        }
        setText(r.text)
        setStatus(jdStatusOf(r.text))
      })
      .catch(function onTextFail() {
        if (ctrl.signal.aborted === false) {
          setStatus(JD_EMPTY)
        }
      })
    return function stopJdText() {
      ctrl.abort()
    }
  }, [url, onFreeLeft])
  return { text, status }
}

/**
 * 拿到正文没:空正文与拿到正文是两种态(空态自己解释,不谎报成失败)。
 *
 * @param text 正文。
 * @returns 取数态。
 */
function jdStatusOf(text: string): JdStatus {
  if (text === TEXT_NONE) {
    return JD_EMPTY
  }
  return JD_DONE
}

/**
 * AI 五节整理版(J3)。2026-07-25 用户「有时候 AI 解析会失败,需要有重试按钮」:
 * 拉取抽成一次性动作,失败态(fmt = null)挂重试钮。
 *
 * @param job 本岗。
 * @returns 整理版、失败由头与重试。
 */
function useJdFormat(job: JobFact): JdFormatPanel {
  const [fmt, setFmt] = useState<string | null | undefined>(undefined)
  const [fmtWhy, setFmtWhy] = useState<FmtWhy>(FMT_FAIL)
  const [tick, setTick] = useState(0)
  const url = strOf(job.applyUrl)
  useEffect(function loadFmt() {
    const ctrl = new AbortController()
    setFmt(undefined)
    fetch(URL_API_JD_FORMAT, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ url }),
      signal: ctrl.signal,
    })
      .then(function onFmtRes(r: Response) {
        setFmtWhy(fmtWhyOf(r.status))
        if (r.status === HTTP_OK) {
          return r.text()
        }
        return TEXT_NONE
      })
      .then(function onFmtText(tx: string) {
        setFmt(fmtOrNull(tx))
      })
      .catch(function onFmtFail() {
        if (ctrl.signal.aborted === false) {
          setFmtWhy(FMT_FAIL)
          setFmt(null)
        }
      })
    return function stopFmt() {
      ctrl.abort()
    }
  }, [url, tick])
  return {
    fmt,
    fmtWhy,
    resetKey: url + APPLY_RESUME_SEP + String(tick),
    onRetry: function retryFmt(): void {
      setTick(tick + 1)
    },
  }
}

/**
 * 整理版失败的由头。
 *
 * @param status 响应码。
 * @returns 由头。
 */
function fmtWhyOf(status: number): FmtWhy {
  if (status === HTTP_PAYMENT || status === HTTP_TOO_MANY) {
    return FMT_QUOTA
  }
  if (status === HTTP_NO_CONTENT) {
    return FMT_NOTEXT
  }
  return FMT_FAIL
}

/**
 * 整理版正文:空白一律当「没有」(降级原文)。
 *
 * @param tx 响应正文。
 * @returns 整理版;没有给 null。
 */
function fmtOrNull(tx: string): string | null {
  if (tx.trim() === TEXT_NONE) {
    return null
  }
  return tx
}

/**
 * 中文对照(参考分类弹框):整理版逐句翻(行位保真);拿到后前端存一份,切换零延迟。
 * #129:首次拉取才计埋点(纯开合不计)。
 *
 * @param x 本岗、界面语言与换岗信号。
 * @returns 对照态与开关。
 */
function useJdTrans(x: JdTransHookIn): JdTransPanel {
  const [showTrans, setShowTrans] = useState(false)
  const [trans, setTrans] = useState<string | null>(null)
  const [transStatus, setTransStatus] = useState<TransStatus>(TRANS_IDLE)
  const url = strOf(x.job.applyUrl)
  const lang = x.lang
  useEffect(function resetTrans() {
    setShowTrans(false)
    setTrans(null)
    setTransStatus(TRANS_IDLE)
  }, [x.resetKey])
  async function onToggle(): Promise<void> {
    if (trans != null) {
      setShowTrans(showTrans === false)
      return
    }
    track(TRACK_JD_TRANSLATE)
    setTransStatus(TRANS_LOADING)
    const got = await postTranslate({ url, lang })
    if (got === TEXT_NONE) {
      setTransStatus(TRANS_ERROR)
      return
    }
    setTrans(got)
    setShowTrans(true)
    setTransStatus(TRANS_IDLE)
  }
  return { showTrans, trans, transStatus, onToggle }
}

/**
 * 拉一份同结构译文。
 *
 * @param x 原帖链接与界面语言。
 * @returns 译文;失败给空串。
 */
async function postTranslate(x: TranslateIn): Promise<string> {
  const res = await fetch(URL_API_JD_TRANSLATE, {
    method: METHOD_POST,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({ url: x.url, lang: x.lang }),
  }).catch(nullOf)
  if (res == null) {
    return TEXT_NONE
  }
  const d: TransJson | null = await res.json().catch(nullOf)
  if (d == null || d.ok !== true || d.text == null) {
    return TEXT_NONE
  }
  return d.text
}

/**
 * 投递邮箱(E9-04,dd24-#110 从投递栏上提):JB 岗藏在「Show how to apply」的 JSF 后面 →
 * 懒查 /api/jobs/applyhow;非 JB 岗正文常直接带邮箱,由正则兜底(见 applyEmailPick)。
 * done 出结果(成败都算):OAuth 回跳续投要等它,别把邮箱岗投成外跳。
 *
 * @param job 本岗。
 * @returns 邮箱与查完没。
 */
function useApplyHow(job: JobFact): ApplyHowPanel {
  const [email, setEmail] = useState(TEXT_NONE)
  const [done, setDone] = useState(false)
  const url = strOf(job.applyUrl)
  useEffect(function loadApplyHow() {
    setEmail(TEXT_NONE)
    if (JB_POSTING_RE.test(url) === false) {
      setDone(true)
      return
    }
    setDone(false)
    const ctrl = new AbortController()
    fetch(URL_API_APPLY_HOW + encodeURIComponent(url), { signal: ctrl.signal })
      .then(readApplyHow)
      .then(function onHow(d: ApplyHowJson | null) {
        if (d != null && d.email != null) {
          setEmail(d.email)
        }
      })
      .catch(swallow)
      .finally(function endHow() {
        if (ctrl.signal.aborted === false) {
          setDone(true)
        }
      })
    return function stopHow() {
      ctrl.abort()
    }
  }, [url])
  return { email, done }
}

/**
 * 投递栏(E9-04,B11 2026-07-24 拍板:详情底部常驻;注册闸设在投递 = 全站意愿最强瞬间)。
 * 邮箱岗 → mailto 预填;无邮箱 → 外跳原帖。未登录 → 注册框 → 求职意向(复用引导表单,
 * 不新造表单;跳过/关闭都继续投递,投递必须丝滑)。首版 = 替他备好一切他自己发,不代发。
 * 整页窄屏投递栏跑偏(Frank 2026-08-05 实拍):sticky bottom 只在**父容器盒内**吸底,
 * 整页版的父级是白卡,卡下面还有 ~150px 页脚 —— 滚进页脚段栏就跟着卡边上滑;窄屏整页改
 * fixed 常驻视口底,占位补回文档流高度;桌面整页维持 sticky 原样。
 * dd24-#108:先落库再唤邮件 —— mailto 触发的导航态会掐死在途 fetch,「已投」记录曾竞态丢失。
 *
 * @param x 本岗、投递邮箱、查完没、取词函数、分层态与在不在整页里。
 * @returns 投递栏面板。
 */
export function useApplyBar(x: ApplyBarIn): ApplyBarPanel {
  const [stage, setStage] = useState<ApplyStage>(APPLY_IDLE)
  const [matchJd, setMatchJd] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)
  const [freshProfile, setFreshProfile] = useState<MatchProfileFact | null>(null)
  const narrow = useIsNarrow()
  const job = x.job
  const email = x.email
  const plan = x.plan
  async function launch(): Promise<void> {
    clearApplyIntent()
    trackApply(email)
    await recordApplied(job)
    openApply({ job, email })
  }
  function onApply(): void {
    if (plan.loggedIn === false && authed === false) {
      markApplyIntent(job)
      setStage(APPLY_AUTH)
      return
    }
    if (needIntent({ plan, authed })) {
      setStage(APPLY_INTENT)
      return
    }
    launch()
  }
  useApplyResume({ job, plan, emailDone: x.emailDone, setStage, launch })
  return {
    stage,
    fixedBar: x.onPage && narrow,
    matchJd,
    onMatch: makeOpenMatch({ job, setMatchJd }),
    onMatchClose: function closeMatch(): void {
      setMatchJd(null)
    },
    onApply,
    authed,
    onAuthClose: function closeAuth(): void {
      setStage(APPLY_IDLE)
    },
    onAuthDone: makeAuthDone({ setAuthed, setFreshProfile, setStage, launch }),
    intentProfile: intentProfileOf({ fresh: freshProfile, plan }),
    onIntentDone: function finishIntent(): void {
      setStage(APPLY_IDLE)
      launch()
    },
  }
}

/**
 * 要不要先过求职意向表单:没建档就要,除非引导已经弹过、或者刚在流程里注册完(onDone 已走过)。
 *
 * @param x 分层态与流程内登录态。
 * @returns 要 = true。
 */
function needIntent(x: NeedIntentIn): boolean {
  if (x.plan.profileOk || x.authed) {
    return false
  }
  return obSeen() === false
}

/**
 * G3 简历对照(设计 docs/design/G3-简历对照JD-20260803.md):JD 文本走既有懒抓缓存,
 * 拿不到全文就不开弹框空转 —— 给空串,由视图提示。
 *
 * @param x 本岗与对照文本的写口。
 * @returns 点击手柄。
 */
function makeOpenMatch(x: OpenMatchIn): () => Promise<void> {
  return async function openMatch(): Promise<void> {
    track(TRACK_JD_MATCH_OPEN)
    const r = await fetchJobText(strOf(x.job.applyUrl)).catch(nullOf)
    if (r == null) {
      x.setMatchJd(TEXT_NONE)
      return
    }
    x.setMatchJd(r.text)
  }
}

/**
 * 注册闸放行前拉一次真实档案:老用户流程内登录时 SSR 分层态还是匿名态,直接弹向导会以空
 * initial 覆盖已有档案(跳过 = 存空档)→ 有档案直接投,没档案才进向导;拉不到按无档案走,不卡投递。
 *
 * @param x 三个写口与投递动作。
 * @returns 注册成功回调。
 */
function makeAuthDone(x: AuthDoneIn): () => Promise<void> {
  return async function onAuthDone(): Promise<void> {
    x.setAuthed(true)
    const p = await loadFreshProfile()
    if (p != null && hasProfile(p)) {
      x.setStage(APPLY_IDLE)
      x.launch()
      return
    }
    if (p != null) {
      x.setFreshProfile(p)
    }
    x.setStage(APPLY_INTENT)
  }
}

/**
 * 流程内登录后拉到的真实档案。
 *
 * @returns 档案;拉不到给 null。
 */
async function loadFreshProfile(): Promise<MatchProfileFact | null> {
  const res = await fetch(URL_API_USERS_ME, { credentials: CREDENTIALS_INCLUDE }).catch(nullOf)
  if (res == null) {
    return null
  }
  const d: MeJson | null = await res.json().catch(nullOf)
  if (d == null) {
    return null
  }
  return normalizeProfile(profileJsonOf(d) as Parameters<typeof normalizeProfile>[0])
}

/**
 * 响应里的档案 JSON(缺席给 null)。跨域形状接缝:lib/jobs 的 ProfileJson 是它自己声明的
 * 扁平格,本域只当它是一份不透明的东西原样透传 —— 断言只住这一处。
 *
 * @param d 身份响应。
 * @returns 档案 JSON。
 */
function profileJsonOf(d: MeJson): ProfileJsonFact | null {
  if (d.user == null || d.user.profile == null) {
    return null
  }
  return d.user.profile
}

/**
 * 求职意向表单的初始档案:流程内拉到的优先,否则用 SSR 那份。
 *
 * @param x 流程内档案与分层态。
 * @returns 初始档案。
 */
function intentProfileOf(x: IntentProfileIn): MatchProfileFact | null {
  if (x.fresh != null) {
    return x.fresh
  }
  return x.plan.profile
}

/**
 * OAuth 回跳续投:登录态 + 落地意图是本岗 + 10 分钟内 → 接着走意向表单/直接投,
 * 不让用户再点一次。Google 登录 = 整页 OAuth 跳转,组件状态全丢,所以投递意图要落地。
 *
 * @param x 本岗、分层态、投递方式查完没、段写口与投递动作。
 * @returns 无。
 */
function useApplyResume(x: ApplyResumeIn): void {
  const job = x.job
  const loggedIn = x.plan.loggedIn
  const profileOk = x.plan.profileOk
  const emailDone = x.emailDone
  const setStage = x.setStage
  const launch = x.launch
  useEffect(function resumeApply() {
    if (loggedIn === false || emailDone === false) {
      return
    }
    if (applyIntentIsFresh(job) === false) {
      return
    }
    clearApplyIntent()
    if (profileOk === false && obSeen() === false) {
      setStage(APPLY_INTENT)
      return
    }
    launch()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在「登录态 + 投递方式查完」这一刻跑一次
  }, [loggedIn, emailDone])
}

/**
 * 落地的投递意图是不是本岗、且还没过期。
 *
 * @param job 本岗。
 * @returns 是 = true。
 */
function applyIntentIsFresh(job: JobFact): boolean {
  try {
    const raw = localStorage.getItem(APPLY_RESUME_KEY)
    if (raw == null) {
      return false
    }
    const [id, ts] = raw.split(APPLY_RESUME_SEP)
    if (String(id) !== String(job.id)) {
      return false
    }
    return Date.now() - Number(ts) <= APPLY_RESUME_TTL_MS
  } catch {
    return false
  }
}

/**
 * 记下投递意图(Google 登录整页跳转前落地)。
 *
 * @param job 本岗。
 * @returns 无。
 */
function markApplyIntent(job: JobFact): void {
  try {
    localStorage.setItem(APPLY_RESUME_KEY, String(job.id) + APPLY_RESUME_SEP + String(Date.now()))
  } catch {
    return
  }
}

/**
 * 原地流程走完 = 意图清账,防下次进页误续投。
 *
 * @returns 无。
 */
function clearApplyIntent(): void {
  try {
    localStorage.removeItem(APPLY_RESUME_KEY)
  } catch {
    return
  }
}

/**
 * E9-04 投递事件(走环境注入的统计对象,没注入就不发)。
 *
 * @param email 投递邮箱;'' = 外跳原帖。
 * @returns 无。
 */
function trackApply(email: string): void {
  try {
    const w = window as UmamiWindow
    if (w.umami != null) {
      w.umami.track(TRACK_APPLY, { [TRACK_KEY_MODE]: applyModeOf(email) })
    }
  } catch {
    return
  }
}

/**
 * 这一次是邮件投还是外跳。
 *
 * @param email 投递邮箱;'' = 外跳原帖。
 * @returns 方式名。
 */
function applyModeOf(email: string): string {
  if (email === TEXT_NONE) {
    return TRACK_MODE_WEB
  }
  return TRACK_MODE_EMAIL
}

/**
 * 已投递记录:已有收藏行 → 状态改 applied,没有 → 新建;失败不打扰投递。
 *
 * @param job 本岗。
 * @returns 无。
 */
async function recordApplied(job: JobFact): Promise<void> {
  const cur = await findSavedRow(job)
  if (cur != null) {
    await fetch(URL_API_SAVED_JOBS + SLASH + String(cur), {
      method: METHOD_PATCH,
      credentials: CREDENTIALS_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ status: SAVED_STATUS_APPLIED }),
    }).catch(nullOf)
    return
  }
  await fetch(URL_API_SAVED_JOBS, {
    method: METHOD_POST,
    credentials: CREDENTIALS_INCLUDE,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({
      job: job.id, title: job.title, company: job.company, status: SAVED_STATUS_APPLIED,
    }),
  }).catch(nullOf)
}

/**
 * 本岗已有的收藏行号。
 *
 * @param job 本岗。
 * @returns 行号;没有给 null。
 */
async function findSavedRow(job: JobFact): Promise<string | number | null> {
  const url = URL_API_SAVED_JOB_BY_JOB + String(job.id) + URL_API_SAVED_JOB_BY_JOB_TAIL
  const res = await fetch(url, { credentials: CREDENTIALS_INCLUDE }).catch(nullOf)
  if (res == null) {
    return null
  }
  const d: SavedListJson | null = await res.json().catch(nullOf)
  if (d == null || d.docs == null) {
    return null
  }
  const first = d.docs[0]
  if (first == null || first.id == null) {
    return null
  }
  return first.id
}

/**
 * 唤起投递:有邮箱走 mailto 预填,没有就外跳原帖。
 *
 * @param x 本岗与投递邮箱。
 * @returns 无。
 */
function openApply(x: OpenApplyIn): void {
  if (x.email !== TEXT_NONE) {
    window.location.href = mailtoOf({ email: x.email, job: x.job })
    return
  }
  if (x.job.applyUrl !== TEXT_NONE) {
    window.open(x.job.applyUrl, TARGET_BLANK, WINDOW_FEATURES)
  }
}

/**
 * 职位详情页的整台。
 * 漏斗第 1 步(主线 M2 收口 2026-08-02):这个页面一直没有第一方浏览埋点 —— 于是库里只有
 * 第 3 步「锁区曝光」有数,分母是空的,M3 的两种分叉(锁的东西不值钱 / 根本没人看见)
 * 照样分不开。30 天数据里入口 = 出口就是本页,它才是漏斗真正的第一格(列表页弹框另计 kind=modal)。
 * 列表页会注册整张分类维表;详情页直入也必须注册本岗这一行,否则英/韩界面会回退中文分类名。
 * 返回(Frank 走查#18):2026-07-25 用户「点击要有动画,不然不知道点没点,跳页有延迟」——
 * 按下即置忙态(变灰 + 降透明),导航期间可感。
 *
 * @param x 本岗、分层态、页面维度与相似职位。
 * @returns 详情页面板。
 */
export function useJobDetail(x: JobIn): JobDetailPanel {
  const [lang, , t] = useLang()
  const [leaving, setLeaving] = useState(false)
  const cats = x.dims.nocCategories
  useEffect(function trackOpen() {
    track(TRACK_JD_OPEN, { [TRACK_KEY_KIND]: TRACK_KIND_PAGE })
  }, [])
  useMemo(function registerDetailLabels() {
    registerCatLabels(cats)
  }, [cats])
  return {
    t,
    lang,
    leaving,
    view: jobDetailViewOf({ job: x.job, dims: x.dims, lang, t, related: x.related }),
    onBack: function goBack(): void {
      setLeaving(true)
      goBackOr(URL_BOARD_BACK)
    },
  }
}

/**
 * 证言数字(props 没给就当零,横幅那一句自会不出)。
 *
 * @param props 组件收到的 props。
 * @returns 两个数。
 */
function proofOf(props: JobsIn): ProofCount {
  if (props.proof == null) {
    return { named: 0, lmia: 0 }
  }
  return props.proof
}
