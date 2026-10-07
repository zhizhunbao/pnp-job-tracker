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
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { storedTitleOf, useTitleTrans } from '@/components/jobtitle'
import { useLang } from '@/components/i18n'
import { useLayerStack } from '@/components/modal'
import { quizToProfile, readQuiz } from '@/components/quiz'
import { makeT } from '@/lib/i18n'
import { hasProfile, normalizeProfile } from '@/lib/jobs'
import { mapQuery, mapsUrl } from '@/lib/location'
import { JOBS_LOG, log } from '@/lib/log'
import { isGateSignedIn, markSeenJob } from '@/lib/guest'
import { registerCatLabels } from '@/lib/noc'
import { ymd } from '@/lib/time'
import { track } from '@/lib/track'
import {
  APPLY_AUTH, APPLY_EMAIL, APPLY_ERR, APPLY_IDLE, APPLY_INTENT, APPLY_LIMIT, APPLY_LOGIN, APPLY_RESUME_KEY,
  APPLY_RESUME_SEP, APPLY_RESUME_TTL_MS, APPLY_STATUS_NET, HTTP_UNAUTHORIZED,
  AUTH_LOGIN, AUTH_REGISTER, BOARD_FILTERS_KEY, CELL_PAD, COL_FLOOR, COMMA, CREDENTIALS_INCLUDE,
  DIR_DESC, DISPOSITION_MAP, DISPOSITION_NONE, EMPTY_DIMS, EV_MOUSE_DOWN, EV_RESIZE, FIELD_GROUP, FK,
  HOME_GATE_OFF,
  FILTER_Q, FMT_FAIL, FMT_NOTEXT, FMT_QUOTA, FREE_PLAN, HDR_CONTENT_TYPE, HTTP_NO_CONTENT, HTTP_OK, HTTP_PAYMENT,
  HOLD_MAX_MS, HTTP_NOT_FOUND, HTTP_TOO_MANY, JD_DONE, JD_EMPTY, JD_LIMITED, JD_LOADING, KEY_ENTER,
  LANG_EN, LIMIT_RE, METHOD_DELETE,
  METHOD_PATCH, METHOD_POST, MIME_JSON, P_BACK, P_OAUTH,
  QS_HEAD, Q_URL_SETTLE_MS, SAVED_STATUS_APPLIED, SAVED_STATUS_WISH,
  SAVE_ERR, SAVE_LIMIT, SAVE_OK, SAVE_RESUME_KEY, SAVE_RESUME_TTL_MS, SLASH, SORT_DEFAULT, TARGET_BLANK, TEXT_NONE,
  TEXT_STATUS, TRACK_APPLY, TRACK_JD_MATCH_OPEN, TRACK_JD_OPEN, TRACK_JD_TRANSLATE, TRACK_KEY_KIND,
  TRACK_KEY_MODE, TRACK_KIND_PAGE, TRACK_MODE_EMAIL,
  TRACK_APPLY_CLICK, TRACK_SAVE_JOB, TRACK_SAVE_SEARCH, TRANS_ERROR, TRANS_IDLE, TRANS_LOADING, UPSELL_LOCK, UPSELL_SS,
  URL_API_APPLY_HOW, URL_API_APPLY_HOW_ID, URL_API_JD_FORMAT, URL_API_JD_TRANSLATE,
  URL_API_JOB_RELATED,
  URL_API_JOBS, URL_API_JOBS_DIMS,
  URL_API_SAVED_JOBS,
  URL_API_SAVED_JOBS_LIST, URL_API_SAVED_JOB_BY_JOB, URL_API_SAVED_JOB_BY_JOB_TAIL, URL_API_SAVED_SEARCHES,
  URL_API_USERS_ME, URL_BOARD, URL_TO_FILTER, VAL_ON, WIDTH_FULL,
  TITLE_TRANS_GEN, WINDOW_FEATURES,
} from './constants'
import {
  allocateColWidths, anyFilterOf, applyEmailOf, applyFiltersTo, applyHomeProvince, authFromUrl, blockedSetsOf,
  dropUrlParam,
  homeGateAfterOf, homeGateInitOf, hydratingClientOf, hydratingServerOf, subscribeNever,
  clearFiltersIn, colsKeyOf, colWidthSeedValue, curFiltersOf, dataKeyOf, defaultColsOf,
  fetchJobText, filterOptsOf, filterSig, foldActiveNarrowOf, foldActiveOf, frozenKeysOf, homeProvPickOf, initialColsOf,
  initialFiltersOf, userFilterOf,
  jobDetailViewOf, jobsQueryOf, keysOf, lastOf, makeColWidth, makeGatedFilters, makeGatedProvChange, makeOccName,
  makePopupToCo,
  makePushCoLayer, makePushJobLayer, markObSeen,
  measureColWidths, nextSortOf, nocLabelOf, obSeen, pageSigOf, pickedShownOf, readColsPref, replaceQuery, savedMapOf,
  saveFiltersOf, seedFilter, setterOf, shownColsOf, slotOf, stickyOffsetsOf, strOf, strOrNull, togglableColsOf,
  toRelatedJobs, chipNocOf, occGroupsOf, occSlotOf, tableWrapOf,
  widthsKeyOf, writeColsCookie, writeColsPref, writeColWidthCookie,
  jobDatesOf, ssrTransOf,
} from './functions'
import type {
  AccountAreaPanel, Alloc, AllocOfIn, AppendRowsIn, ApplyBarIn, ApplyBarPanel, ApplyHowJson, ApplyMailOut, ApplyMissIn,
  ApplyResumeIn, ApplyStage, AuthDoneIn, BlockedKeys, BoardColsHookIn, BoardColsOut, BoardColsPanel,
  BoardDataHookIn, BoardDataOut, BoardDataPanel, BoardFiltersHookIn, BoardFiltersHookOut, BoardPnpFacts, BoxRef,
  ClickFn, ColMeasure,
  ColsToggleIn, ColWidthSeed, ColWidthsIn, ColWidthsPanel, ColWidthsPanelIn, DimsJson,
  FieldRouterIn, FilterState, FmtLoad, FmtLoadIn, FmtWhy, FontsDoc, FrozenHookIn, FrozenPanel, HeadRowRef, HomeGate,
  FilterGateDoneIn, HydrateIn, CopyEmailIn,
  JobPeekPanel,
  IntentProfileIn,
  JdFormatHookIn, JdFormatPanel, JdStatus, JdTextHookIn, JdTextPanel, JdTransHookIn, JdTransPanel, JobBodyHookIn,
  JobBodyPanel, JobColKey, JobDetailPanel, JobDims, JobFact, JobFilters, JobIn, JobPlan, JobsBoardOut, JobsBoardPanel,
  JobsIn, JobsPageJson,
  MatchProfileFact, MeJson, ModalsHookIn, ModalsHookOut, NeedIntentIn,
  OpenMatchIn, OutsideCloseIn, PeekLayer, PopupState, ProfileJsonFact, ProofCount, QKeyEvent, QKeyFn,
  RelatedJobs,
  RelatedJson, RelatedOfHookIn, SaveGateDoneIn, SaveIntentIn, SaveIntentJson, SaveJobFact, SavedAddIn, SavedEditIn,
  SavedLoadIn,
  SavedEntry, SavedHookIn, SavedListJson, SavedPanel, SavedPostJson, SaveSearchIn, SeedCookieIn, SortState,
  TableWidthIn, TransJson, TranslateIn, TransStatus, UnseenRowsIn, UpsellKind, UrlSettleIn, WrapWidthIn,
  JobDateCell, JobDatesIn,
  ImmPopupPanel,
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
 * 2026-09-23 拖列整功能撤(Frank「拖动功能去掉吧」,线上拖了没反应):触发点三、手动宽与
 * resizeColWidths 一并删,只剩前两条触发。
 * 2026-10-06 Frank「我把 EE 取消掉,在加回来 就这样了」:换列后每列拿到右边那列的宽 —— 同步列名单的 effect
 * 是普通 effect,晚于下面的 layout 量宽,量宽拿旧名单按位置对新表头,错开一位。同步改 layout effect、排在量宽前面。
 *
 * @param headRowRef 表头锚点(单独一格收,理由见 types.ts 的 `HeadRowRef`)。
 * @param x 列集、数据指纹、格内边距与 cookie 种子。
 * @returns 列宽面板。
 */
// eslint-disable-next-line local/one-parameter -- 第二个参数是 ref:react-hooks/refs 闸不许 ref 裹进 XxxIn
export function useColWidths(headRowRef: HeadRowRef, x: ColWidthsIn): ColWidthsPanel {
  const [measured, setMeasured] = useState<Record<string, ColMeasure>>({})
  const [wrapW, setWrapW] = useState(0)
  const doneKey = useRef(TEXT_NONE)
  const keysKey = x.keys.join(COMMA)
  const keysRef = useRef(x.keys)
  useIsoLayoutEffect(function syncLiveRefs() {
    keysRef.current = x.keys
  })
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
  useWrapWidth(headRowRef, { keysKey, setWrapW })
  return useColWidthsPanel({
    keys: x.keys,
    keysKey,
    seed: x.seed,
    measured,
    wrapW,
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
 * @param headRowRef 表头锚点(单独一格收,理由见 types.ts 的 `HeadRowRef`)。
 * @param x 列集签名与容器宽的写口。
 * @returns 无。
 */
// eslint-disable-next-line local/one-parameter -- 第二个参数是 ref:react-hooks/refs 闸不许 ref 裹进 XxxIn
function useWrapWidth(headRowRef: HeadRowRef, x: WrapWidthIn): void {
  const setWrapW = x.setWrapW
  useEffect(function watchWrapWidth() {
    const head = headRowRef.current
    if (head == null || typeof ResizeObserver === 'undefined') {
      return
    }
    const wrap = tableWrapOf(head)
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
 * @param x 列集、种子、量宽结果与容器宽。
 * @returns 列宽面板。
 */
function useColWidthsPanel(x: ColWidthsPanelIn): ColWidthsPanel {
  const cols: Alloc[] = []
  let minTotal = 0
  for (const k of x.keys) {
    const one = allocOf({ k, m: x.measured[k] })
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
  return {
    ready: measuredReady || useSeed,
    width: makeColWidth({ measuredReady, px, useSeed, seed: x.seed, keys: x.keys }),
    tableWidth: tableWidthOf({ measuredReady, overflow, total }),
    overflow: measuredReady && overflow,
  }
}

/**
 * 一列的分宽输入(量不到就用下限兜)。
 *
 * @param x 列键与量宽结果。
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
  return one
}

/**
 * 这一列最少要占多宽(钉死的按钉死算,其余按表头不折行算)。
 * 2026-09-23 拖列撤,不再有钉死的宽,一律按表头不折行算。
 *
 * @param c 分宽输入。
 * @returns 最小宽。
 */
function floorOf(c: Alloc): number {
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
 * 2026-10-03 付费闭环批 A1 本地测试(Frank「已经登录 为什么还显示没有登录成功」):已登录时地址栏的开框参数只洗不开,
 * 连 ?oauth=fail 一起洗 —— 同一次 Google 登录两条回调一成一败时,成功的会话已种上,失败那条把人带回 ?login=1&oauth=fail。
 * 登录成功整页刷新让 SSR 分层态(匹配列等)生效。
 * 2026-10-04 Frank「升级 Pro 这个删了,放到 我的 模块里」:账户下拉的「升级 Pro」撤,本区定价框(唯一开口就是那一项)
 * 的开合态与两只手柄随之撤。
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
    if (opened.mode !== false && plan.loggedIn) {
      dropUrlParam(P_OAUTH)
      return
    }
    if (opened.mode !== false) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 服务端首帧读不到地址栏,先按不开框画;活过来才能读参数、洗参数
      setResetTok(opened.token)
      setAuth(opened.mode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时读一次 URL,依赖列表空是本意
  }, [])
  return {
    email,
    displayName,
    avatar,
    proUntil,
    auth,
    resetTok,
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
  }
}

/**
 * 我的求职(E9-01):已收藏映射 岗位号 → 收藏行;匿名点收藏 → 注册框(转化钩子)。
 * 2026-10-03 付费闭环批 A1:匿名点收藏改开访客向导(带上那一岗),注册完由 saveNow 补收 ——
 * 那一刻分层态还是匿名(软刷没回来),不能再走 onSave 的登录判。
 * 同日审查后补:开向导那一刻把那一岗落成收藏意图(Google 整页登录回跳后,拉清单前先补收;× 关掉即撤);
 * 向导里刚登录过的(软刷没回来)直接收,不再弹一次向导;落库 / 拉清单挂了经 lib/log 留痕。
 *
 * @param x 分层态与匿名时的去处。
 * @returns 收藏映射与开关。
 */
function useSavedJobs(x: SavedHookIn): SavedPanel {
  const [saved, setSaved] = useState<Record<string, SavedEntry>>({})
  const router = useRouter()
  const loggedIn = x.plan.loggedIn
  const onAnon = x.onAnon
  useEffect(function loadSaved() {
    if (loggedIn === false) {
      return
    }
    loadSavedResuming({ setSaved }).catch(logSavedFailed)
  }, [loggedIn])
  function onSave(j: JobFact): void {
    if (loggedIn === false && isGateSignedIn() === false) {
      markSaveIntent(j)
      onAnon(j)
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
    saveNow(j).catch(logSavedFailed)
  }
  async function saveNow(j: JobFact): Promise<void> {
    track(TRACK_SAVE_JOB)
    const id = await postSavedJob(j)
    if (id != null) {
      setSaved(added({ saved, key: String(j.id), id }))
    }
  }
  return {
    saved,
    onSave,
    onGateDone: makeSaveGateDone({ job: x.gate, saveNow, close: x.onGateClose, refresh: router.refresh }),
  }
}

/**
 * 拉收藏清单进映射;收藏那一路的访客向导走 Google 整页登录回跳回来、还留着没过期的收藏意图,先补收再拉
 * (先落库再拉,拉回来的清单里才有这一条)。2026-10-03 付费闭环批 A1 审查补:原先 Google 那条路回跳后那次收藏丢了。
 *
 * @param x 收藏映射落格。
 * @returns 无(结果落在映射上)。
 */
async function loadSavedResuming(x: SavedLoadIn): Promise<void> {
  const pending = takeSaveIntent()
  if (pending != null) {
    track(TRACK_SAVE_JOB)
    await postSavedJob(pending)
  }
  const res = await fetch(URL_API_SAVED_JOBS_LIST, { credentials: CREDENTIALS_INCLUDE })
  x.setSaved(savedMapOf(await readSavedList(res)))
}

/**
 * 收藏落库 / 拉清单挂了:留一行,页面照常往下走(补收那一路之后照样软刷)。
 *
 * @param e 抛出来的错。
 * @returns 无。
 */
function logSavedFailed(e: Error): void {
  log({ tag: JOBS_LOG.tag, text: JOBS_LOG.savedFailed + String(e) })
}

/**
 * 记下收藏意图(收藏那一路的访客向导开出来那一刻;Google 整页登录跳走前落地,回跳后凭它补收)。
 * 存那一岗落库要的三格与时间戳;写抛了留痕。
 *
 * @param j 要收的那一岗。
 * @returns 无。
 */
function markSaveIntent(j: JobFact): void {
  try {
    const row = { id: j.id, title: j.title, company: j.company, at: Date.now() }
    localStorage.setItem(SAVE_RESUME_KEY, JSON.stringify(row))
  } catch (e) {
    log({ tag: JOBS_LOG.tag, text: JOBS_LOG.saveIntent + String(e) })
  }
}

/**
 * 撤收藏意图(× 关掉收藏那一路的向导、或向导里当场注册完由页内接手时)。撤抛了留痕。
 *
 * @returns 无。
 */
function clearSaveIntent(): void {
  try {
    localStorage.removeItem(SAVE_RESUME_KEY)
  } catch (e) {
    log({ tag: JOBS_LOG.tag, text: JOBS_LOG.saveIntent + String(e) })
  }
}

/**
 * 取收藏意图(读完即撤):还在有效期内交回那一岗的三格,否则 null;读抛了(含原文不是 json)留痕按没有算。
 *
 * @returns 要补收的那一岗;没有 = null。
 */
function takeSaveIntent(): SaveJobFact | null {
  try {
    const raw = localStorage.getItem(SAVE_RESUME_KEY)
    localStorage.removeItem(SAVE_RESUME_KEY)
    return toSaveIntent({ raw, now: Date.now() })
  } catch (e) {
    log({ tag: JOBS_LOG.tag, text: JOBS_LOG.saveIntent + String(e) })
    return null
  }
}

/**
 * 收藏意图原文 → 那一岗的三格(行构造器):不是对象、三格或时间戳类型不对、落在将来、过了 SAVE_RESUME_TTL_MS
 * 都给 null。原文不是 json 时 JSON.parse 会抛,由调用方的 catch 收。
 *
 * @param x 原文与此刻。
 * @returns 那一岗的三格;作废 = null。
 */
function toSaveIntent(x: SaveIntentIn): SaveJobFact | null {
  if (x.raw == null || x.raw === '') {
    return null
  }
  const d: SaveIntentJson = JSON.parse(x.raw)
  if (d == null || typeof d !== 'object') {
    return null
  }
  if (typeof d.id !== 'string' && typeof d.id !== 'number') {
    return null
  }
  if (typeof d.title !== 'string' || typeof d.company !== 'string' || typeof d.at !== 'number') {
    return null
  }
  if (d.at > x.now || x.now - d.at > SAVE_RESUME_TTL_MS) {
    return null
  }
  return { id: d.id, title: d.title, company: d.company }
}

/**
 * 新建一条收藏(心愿单档)。只读那一岗的号、标题、公司三格(Google 回跳补收时手里只有落地的这三格)。
 *
 * @param j 这一岗。
 * @returns 新建出来的行号;失败给 null。
 */
async function postSavedJob(j: SaveJobFact): Promise<string | number | null> {
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
  const [fEe, setFEe] = useState(seedFilter({ f: initialFilters, k: FK.ee }))
  const [fStatus, setFStatus] = useState(seedFilter({ f: initialFilters, k: FK.status }))
  const [fOrigin, setFOrigin] = useState(seedFilter({ f: initialFilters, k: FK.origin }))
  const [fScore, setFScore] = useState(seedFilter({ f: initialFilters, k: FK.score }))
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
    [FK.ee]: { v: fEe, set: setFEe },
    [FK.status]: { v: fStatus, set: setFStatus },
    [FK.origin]: { v: fOrigin, set: setFOrigin },
    [FK.score]: { v: fScore, set: setFScore },
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
 * 2026-09-26 /fe 首页 Frank 看效果图点头:记下进板时预选的省(写口交给水合那一步),面板多两格 ——
 * 用户自己设没设过筛选(窄屏「清除筛选」看它)、窄屏折叠区徽标计数(EE 类别在手机上收进了折叠区)。
 * 2026-10-04 收口审查(设计稿 10-04「关掉后…筛选…一律再弹」):面板里的筛选表与搜索框写口换成过闸的那份(makeGatedFilters)——
 * 访客动筛选 / 搜索开访客向导、值不动;登录用户一点不变。原表另交出去给板内自己写(水合预选本省、地址栏 / 快照回放);
 * 清除(全部 / 职业)只会放宽条件,照旧写原表。
 * 2026-10-04 收口:省下拉的换值口单出一格 onProv —— 「记下所选省 + 换省 + 清市 / 区」整套包一层过闸(makeGatedProvChange);
 * 原先省下拉拿过闸的表调 makeProvChange,cookie 在闸前照记,访客关掉向导、刷新就落到所选省。
 *
 * @param x 初始筛选、维度表、界面语言、取词函数、分层态、触上限时与访客动筛选时的去处。
 * @returns 筛选面板与内部要用的几样。
 */
function useBoardFilters(x: BoardFiltersHookIn): BoardFiltersHookOut {
  const fState = useFilterSlots(x.initialFilters)
  const gated = makeGatedFilters({ fState, loggedIn: x.plan.loggedIn, signedIn: isGateSignedIn, onGate: x.onGate })
  const [fold, setFold] = useState(false)
  const [homeProv, setHomeProv] = useState(TEXT_NONE)
  const q = slotOf({ fState, k: FK.q })
  const dq = useDeferredValue(q)
  const prov = slotOf({ fState, k: FK.prov })
  const city = slotOf({ fState, k: FK.city })
  const broad = slotOf({ fState, k: FK.broad })
  const ee = slotOf({ fState, k: FK.ee })
  const dims = x.dims
  const opts = useMemo(function buildOpts() {
    return filterOptsOf({ dims, prov, city, broad, ee })
  }, [dims, prov, city, broad, ee])
  const nameOf = makeOccName({ rows: dims.nocDescriptions, lang: x.lang })
  const groups = useMemo(function buildOccGroups() {
    return occGroupsOf(dims)
  }, [dims])
  const anyFilter = anyFilterOf({ fState })
  const nocLabel = nocLabelOf({ fNoc: chipNocOf({ fState, groups }), nameOf, lang: x.lang, t: x.t })
  const t = x.t
  const onLimit = x.onLimit
  const lang = x.lang
  async function onSaveSearch(): Promise<void> {
    const name = window.prompt(t('ss.name'))
    if (name == null || name === TEXT_NONE) {
      return
    }
    track(TRACK_SAVE_SEARCH)
    const hit = await postSavedSearch({ name, filters: saveFiltersOf({ fState }), lang })
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
      fState: gated,
      onProv: makeGatedProvChange({ fState, loggedIn: x.plan.loggedIn, signedIn: isGateSignedIn, onGate: x.onGate }),
      opts,
      anyFilter,
      userFilter: userFilterOf({ fState, homeProv }),
      showPicked: pickedShownOf({ anyFilter, nocLabel, loggedIn: x.plan.loggedIn }),
      foldActive: foldActiveOf({ fState }),
      foldActiveNarrow: foldActiveNarrowOf({ fState }),
      fold,
      onFold: function toggleFold(): void {
        setFold(fold === false)
      },
      nocLabel,
      occName: nameOf,
      occValue: occSlotOf({ fState, groups }),
      onNocClear: function clearNoc(): void {
        setterOf({ fState, k: FK.noc })(TEXT_NONE)
      },
      onClear: function clearAll(): void {
        clearFiltersIn({ fState })
      },
      onSaveSearch,
    },
    rawFState: fState,
    q,
    setQ: setterOf({ fState: gated, k: FK.q }),
    cur: curFiltersOf({ fState, q: dq }),
    snap: curFiltersOf({ fState, q }),
    setHomeProv,
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
 * 两个 DOM 锚点(字段浮层外框、表头 `<tr>`)不进面板,跟着面板一起当**独立的返回格**交出去 ——
 * 理由见 types.ts 的 `HeadRowRef`:ref 裹进面板,面板在组件里就一格都读不了。
 *
 * @param x cookie 列集与列宽种子、界面语言与当前这批行。
 * @returns 列面板、字段浮层外框与表头锚点三格。
 */
function useBoardCols(x: BoardColsHookIn): BoardColsOut {
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
  useOutsideClose(boxRef, { open, onClose: closePanel })
  function save(next: JobColKey[]): void {
    writeColsCookie(next)
    writeColsPref(next)
    setVisible(next)
  }
  const shown = shownColsOf(visible)
  const shownKey = colsKeyOf(shown)
  const cw = useColWidths(headRowRef, {
    keys: keysOf(shown),
    dataKey: dataKeyOf({ shownKey, lang: x.lang, rows: x.rows }),
    pad: CELL_PAD,
    seed: x.initialColW,
  })
  const frozen = useFrozenCols(headRowRef, { shown, cw, shownKey })
  const panel: BoardColsPanel = {
    shown,
    visible,
    open,
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
  return [panel, boxRef, headRowRef]
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
 * @param headRowRef 表头锚点(单独一格收,理由见 types.ts 的 `HeadRowRef`)。
 * @param x 当前列、列宽机器与列集签名。
 * @returns 冻结集、累计偏移与最后一枚固定列。
 */
// eslint-disable-next-line local/one-parameter -- 第二个参数是 ref:react-hooks/refs 闸不许 ref 裹进 XxxIn
function useFrozenCols(headRowRef: HeadRowRef, x: FrozenHookIn): FrozenPanel {
  const frozenKeys = frozenKeysOf(x.shown)
  const [stickyLeft, setStickyLeft] = useState<Record<string, number>>({})
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
 * 2026-09-23「我的匹配」整拆:取数不再分匹配视图,首屏跳过判据只看筛选签名。
 * 2026-09-26 /fe 首页 Frank「首屏整表替换」:首屏本省闸住在这一台 —— 初值按 URL 定(homeGateInitOf),
 * 水合那一步按预选结果落 on / off(写口交出去),第 0 页落地(成败都算)就放开。
 *
 * @param x props、当前筛选与排序。
 * @returns 数据面板与首屏本省闸的写口。
 */
function useBoardData(x: BoardDataHookIn): BoardDataOut {
  const [rows, setRows] = useState<JobFact[]>(x.props.jobs)
  const [total, setTotal] = useState(totalOf(x.props))
  const [updatedAt, setUpdatedAt] = useState(strOf(x.props.updatedAt))
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [gate, setGate] = useState<HomeGate>(homeGateInitOf(initialFiltersOf(x.props.initialFilters)))
  const reqSeq = useRef(0)
  const firstFetch = useRef(true)
  const ssrSig = useRef(filterSig(initialFiltersOf(x.props.initialFilters)))
  const pageSig = pageSigOf({ cur: x.cur, sort: x.sort })
  const [prevPageSig, setPrevPageSig] = useState(pageSig)
  if (prevPageSig !== pageSig) {
    setPrevPageSig(pageSig)
    setPage(0)
  }
  const fresh = page === 0
  const query = jobsQueryOf({ cur: x.cur, sort: x.sort, page })
  const curSig = filterSig(x.cur)
  useEffect(function loadPage() {
    const skipFirst = firstFetch.current && fresh && curSig === ssrSig.current
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
        setRows(appendedRows({ d, fresh }))
      })
      .catch(swallow)
      .finally(function endLoad() {
        if (seq === reqSeq.current) {
          setLoading(false)
          setGate(HOME_GATE_OFF)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只跟「查询串变了」走;skipFirst 是首帧一次性判据,进依赖会多打一次
  }, [query])
  const panel: BoardDataPanel = {
    rows,
    total,
    updatedAt,
    dims: x.dims,
    loading,
    swapping: loading && fresh,
    gate,
    onMore: function loadMore(): void {
      setPage(page + 1)
    },
  }
  return [panel, setGate]
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
    return prev.concat(unseenRowsOf({ prev, got }))
  }
}

/**
 * 这一页里表上还没有的行(2026-10-02 Frank 截图 dev 报「Encountered two children with the same key, 77504377」):
 * 按偏移翻页,首屏与后几页不是同一刻取的 —— 中间小时更新插进新岗,整体往后挪,下一页开头就是已露过的行。
 * 按岗位号去重(比字符串 —— 键就是它的字符串形),先露的那条留着。
 *
 * @param x 表上已有的行与这一页的行。
 * @returns 这一页里没露过的行(保持原序)。
 */
function unseenRowsOf(x: UnseenRowsIn): JobFact[] {
  const seen = new Set<string>()
  for (const r of x.prev) {
    seen.add(String(r.id))
  }
  const out: JobFact[] = []
  for (const r of x.got) {
    if (seen.has(String(r.id)) === false) {
      seen.add(String(r.id))
      out.push(r)
    }
  }
  return out
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
 * 2026-09-21 Frank「点公司就弹公司的框?然后还能点回来」:职位描述弹框与公司弹框并进弹框栈(modal 域 useLayerStack),
 * 一层层叠、只关最上面一层,栈自己管 Esc;这里的 Esc 只剩「栈空了再关字段弹框」—— 原先 closeBoth 一按全关。
 * 2026-09-28 并壳(Frank「别并存啊」):字段弹框也套 modal 桶的 Modal 了,Esc 由 Modal 按打开先后排号接(最上面那个关),
 * 这里那份「栈空了再关字段弹框」的 Esc 随之撤 —— 栈里有层时最上面的是栈顶,栈空了最上面的就是字段弹框,排号天然如此。
 * 2026-10-04 收口审查:收藏那一路旁边多一路筛选的访客向导(访客关掉进站向导后动筛选 / 搜索再弹;设计稿 10-04),
 * 开口交给筛选面板过闸的写口;× 关掉那一下筛选作罢,注册完收起 + 软刷(同收藏那一路,只是没有要补的那一下)。
 *
 * @param x 分层态。
 * @returns 弹框层面板与三个开口。
 */
function useBoardModals(x: ModalsHookIn): ModalsHookOut {
  const [popup, setPopup] = useState<PopupState | null>(null)
  const stack = useLayerStack<PeekLayer>()
  const [wizard, setWizard] = useState(false)
  const [upsell, setUpsell] = useState<UpsellKind>(false)
  const [saveGate, setSaveGate] = useState<JobFact | null>(null)
  const [filterGate, setFilterGate] = useState(false)
  const router = useRouter()
  const loggedIn = x.plan.loggedIn
  const profileOk = x.plan.profileOk
  useEffect(function autoOpenWizard() {
    if (loggedIn === false || profileOk || obSeen()) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 服务端首帧读不到 localStorage,先按不开引导画;活过来再看弹过没
    setWizard(true)
  }, [loggedIn, profileOk])
  function closePopup(): void {
    setPopup(null)
  }
  function closeFilterGate(): void {
    setFilterGate(false)
  }
  return {
    panel: {
      popup,
      wizard,
      upsell,
      onPopupClose: closePopup,
      stack,
      onPeekCo: makePopupToCo({ setPopup, stack }),
      onWizardClose: function closeWizard(): void {
        markObSeen()
        setWizard(false)
      },
      onUpsellClose: function closeUpsell(): void {
        setUpsell(false)
      },
      onUpsellDone: upsellDone,
      saveGate,
      onSaveGateClose: function closeSaveGate(): void {
        clearSaveIntent()
        setSaveGate(null)
      },
      filterGate,
      onFilterGateClose: closeFilterGate,
      onFilterGateDone: makeFilterGateDone({ close: closeFilterGate, refresh: router.refresh }),
    },
    setPopup,
    onOpenJob: makePushJobLayer(stack),
    setUpsell,
    setSaveGate,
    openFilterGate: function openFilterGate(): void {
      setFilterGate(true)
    },
  }
}

/**
 * 收藏那一路的访客向导注册完之后(2026-10-03 付费闭环批 A1):收起向导(顺手撤收藏意图,页内接手)、
 * 补上那次收藏(此刻已登录,直接落库),落完再软刷让页面拿到登录态 —— 先落库再软刷,软刷后重拉的收藏清单里才有这一条。
 * 同日审查:补收挂了留痕,且不论成败都软刷(人已经注册了,页面不许停在匿名态)。
 *
 * @param x 那一岗、补收、收起与软刷。
 * @returns 注册完的回调。
 */
function makeSaveGateDone(x: SaveGateDoneIn): () => void {
  return function doneSaveGate(): void {
    x.close()
    if (x.job == null) {
      x.refresh()
      return
    }
    x.saveNow(x.job).catch(logSavedFailed).finally(x.refresh)
  }
}

/**
 * 筛选那一路的访客向导注册完之后(2026-10-04 收口审查;照 makeSaveGateDone,没有要补的那一下):收起向导、软刷让页面拿到登录态。
 * 那一下筛选不替他补 —— 向导一路走完他未必还想要那一格,登录后筛选框随手可点。
 *
 * @param x 收起与软刷。
 * @returns 注册完的回调。
 */
function makeFilterGateDone(x: FilterGateDoneIn): () => void {
  return function doneFilterGate(): void {
    x.close()
    x.refresh()
  }
}

/**
 * 匿名注册/登录成功之后的落点。注册成功就把本地答案落成档案(不让用户填两遍);答案来自
 * 统一存储,不再靠弹框回传。E9-04b:'login' 目前只有「我的匹配」入口在用 —— 登录成功
 * 直接落匹配视图(邮箱路径走这里,Google 路径走 returnTo),不再回列表让用户再点一次
 * (Frank「点我的匹配也一样」)。
 * 2026-09-23「我的匹配」整拆:'login' 那一档随入口撤,不再按由头分去处,一律落回原页。
 *
 * @returns 无。
 */
async function upsellDone(): Promise<void> {
  await saveQuizAnswers()
  window.location.reload()
}

/**
 * 点其它地方关掉浮层(字段面板)。
 *
 * @param boxRef 浮层外框(单独一格收,理由见 types.ts 的 `BoxRef`)。
 * @param x 开着没与关的动作。
 * @returns 无。
 */
// eslint-disable-next-line local/one-parameter -- 第一个参数是 ref:react-hooks/refs 闸不许 ref 裹进 XxxIn
function useOutsideClose(boxRef: BoxRef, x: OutsideCloseIn): void {
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
 * 2026-09-23「我的匹配」整拆(Frank「我觉得 我的匹配 功能也可以去掉。让用户自己筛 职位 直接 收藏」):
 * 匹配视图、它的三态闸与按匹配度排序一并撤,排序初值与取消排序后的回落恒为发布时间。
 *
 * 两个 DOM 锚点(表头 `<tr>`、字段浮层外框)跟面板并列交出去,由页面件一路 props 递给
 * 真正挂 `ref={}` 的那两件 —— 理由见 types.ts 的 `HeadRowRef`。
 *
 * @param props 服务端门算好的全部输入。
 * @returns 职位板面板、表头锚点与字段浮层外框三格。
 */
export function useJobsBoard(props: JobsIn): JobsBoardOut {
  const [lang, , t] = useLang()
  const plan = planOf(props)
  const [sort, setSort] = useState<SortState>({ key: SORT_DEFAULT, dir: DIR_DESC })
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
    onGate: modals.openFilterGate,
  })
  const [data, setGate] = useBoardData({ props, dims, cur: filters.cur, sort })
  const [cols, boxRef, headRowRef] = useBoardCols({
    initialCols: props.initialCols, initialColW: colwSeedOf(props), lang, rows: data.rows,
  })
  useCatLabels(data.dims)
  useBoardHydrate({ fState: filters.rawFState, props, setGate, setHomeProv: filters.setHomeProv })
  const onQCommit = useBoardUrlSync(filters.snap)
  const saved = useSavedJobs({
    plan, onAnon: modals.setSaveGate, gate: modals.panel.saveGate, onGateClose: modals.panel.onSaveGateClose,
  })
  const blocked = useBlockedKeys(props.pnpFacts)
  const hydrating = useHydrating()
  const panel: JobsBoardPanel = {
    t,
    lang,
    plan,
    data,
    filters: filters.panel,
    cols,
    modals: modals.panel,
    sort,
    onSort: function onSort(k: JobColKey): void {
      setSort(nextSortOf({ sort, key: k, fallback: SORT_DEFAULT }))
    },
    saved: saved.saved,
    onSave: saved.onSave,
    onField: makeFieldRouter({ setPopup: modals.setPopup }),
    onDesc: modals.onOpenJob,
    onUpsellLock,
    onSaveGateDone: saved.onGateDone,
    blocked,
    cellCtx: {
      t,
      plan,
      blocked,
      pnpIndex: props.pnpFacts.index,
      eeCats: data.dims.eeCategories,
      occName: makeOccName({ rows: data.dims.nocDescriptions, lang }),
      lang,
    },
    q: filters.q,
    onQ: filters.setQ,
    onQCommit,
    onQKey: makeQKey(onQCommit),
    allShownText: t('allShown', { total: data.total }),
    moreText: t('loadMore', { n: data.total - data.rows.length }),
    proof: proofOf(props),
    hydrating,
  }
  return [panel, headRowRef, boxRef]
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
 * 官方具名排除清单:整表算一次 `省码|NOC` 命中集,逐行 O(1) 查。
 * 2026-09-26 /fe 首页 Frank:清单整表不再随首屏内联(弹框打开才懒取),键由服务端 boardPnpOf 压好随板下发,
 * 这里只把两串键装成集合。
 *
 * @param facts 随首屏下发的省提名事实。
 * @returns 两套键集。
 */
function useBlockedKeys(facts: BoardPnpFacts): BlockedKeys {
  return useMemo(function buildBlocked() {
    return blockedSetsOf(facts)
  }, [facts])
}

/**
 * 还在水合没:服务端渲与水合那一遍给 true,水合完、或客户端跳转进来的新挂载给 false
 * (2026-09-26 首屏本省闸的首帧脚本只渲在这一段里 —— 见 subscribeNever)。
 *
 * @returns 在水合 = true。
 */
function useHydrating(): boolean {
  return useSyncExternalStore(subscribeNever, hydratingClientOf, hydratingServerOf)
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
 * 2026-09-23「我的匹配」整拆,那条直链回流随之撤;「只看直发」的写口也随勾选框一起撤。
 * 2026-09-26 /fe 首页 Frank「首屏整表替换」:预选完按结果落首屏本省闸 —— 预选了省就关着等本省那一页,没预选当场放开。
 * 这一步在绘制前跑:客户端跳转进板(没有首帧脚本)时,全国过渡态一帧都不画出来。
 * 2026-09-26 /fe 首页 Frank 看效果图点头:同一步记下预选的是哪一省(与落格同一个 homeProvPickOf),窄屏「清除筛选」不算它。
 *
 * @param x 筛选各格、props、首屏本省闸与预选省的两个写口。
 * @returns 无。
 */
function useBoardHydrate(x: HydrateIn): void {
  const fState = x.fState
  const props = x.props
  const setGate = x.setGate
  const setHomeProv = x.setHomeProv
  useIsoLayoutEffect(function hydrateFromUrl() {
    const sp = readSearch()
    if (sp.get(P_BACK) === VAL_ON) {
      applyFiltersTo({ fState, f: readSnapshot() })
      sp.delete(P_BACK)
      replaceQuery(sp)
    }
    applyFiltersTo({ fState, f: initialFiltersOf(props.initialFilters) })
    setHomeProv(homeProvPickOf(initialFiltersOf(props.initialFilters)))
    setGate(homeGateAfterOf(applyHomeProvince({ fState, initial: initialFiltersOf(props.initialFilters) })))
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
 * 2026-09-26 /fe Frank:搜索框每敲一个字 replaceState 一次,Umami 把 q=o、q=ot、q=otta……每个中间态
 * 都记成一次浏览 → 只有关键词在变时,地址栏等停手 Q_URL_SETTLE_MS 再写;回车 / 失焦用交回的手柄当场写。
 * 别的筛选格一变照旧当场写(连同当时的关键词一起,排着的那次随 effect 清理作废);快照照旧每次都写。
 * 排着的那次到点时先核对路径,切走了就不写(卸载时 effect 清理也会把它作废)。
 * (导出只给 tests/int/boardUrlSync 直接点文件锁这套时序;桶不出,生产消费方只有 useJobsBoard。)
 *
 * @param snap 当前非默认筛选(关键词未防抖)。
 * @returns 当场把当前筛选写进地址栏的手柄(回车 / 失焦用)。
 */
export function useBoardUrlSync(snap: JobFilters): ClickFn {
  const sig = filterSig(snap)
  const restSig = filterSig(restFiltersOf(snap))
  const hydrated = useRef(false)
  const rest = useRef(restSig)
  useEffect(function syncUrlAndSnapshot() {
    writeSnapshot(snap)
    if (hydrated.current === false) {
      hydrated.current = true
      return
    }
    if (restSig !== rest.current) {
      rest.current = restSig
      writeFiltersToUrl(snap)
      return
    }
    const path = window.location.pathname
    const settle = window.setTimeout(function writeSettledQ() {
      writeFiltersIfStill({ snap, path })
    }, Q_URL_SETTLE_MS)
    return function dropSettledQ() {
      window.clearTimeout(settle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 签名变了才同步(snap 每渲一次都是新对象)
  }, [sig])
  return makeUrlCommit(snap)
}

/**
 * 关键词以外的那几格筛选(比签名用:只有它们变了,地址栏才不等停手)。
 *
 * @param snap 当前非默认筛选。
 * @returns 去掉关键词后的筛选。
 */
function restFiltersOf(snap: JobFilters): JobFilters {
  const rest: JobFilters = {}
  for (const [k, v] of Object.entries(snap)) {
    if (k !== FILTER_Q) {
      rest[k] = v
    }
  }
  return rest
}

/**
 * 停手后那一次写:路径还是排定时那一页才写(到点前已经切走 = 这次作废)。
 *
 * @param x 排定时的筛选与路径。
 * @returns 无。
 */
function writeFiltersIfStill(x: UrlSettleIn): void {
  if (window.location.pathname !== x.path) {
    return
  }
  writeFiltersToUrl(x.snap)
}

/**
 * 造「当场写回地址栏」的手柄(回车 / 失焦;排着的那次到点再写一遍同样的地址,replaceIfChanged 不重复写)。
 *
 * @param snap 当前非默认筛选。
 * @returns 手柄。
 */
function makeUrlCommit(snap: JobFilters): ClickFn {
  return function commitUrl(): void {
    writeFiltersToUrl(snap)
  }
}

/**
 * 造搜索框按键手柄:回车当场写回地址栏;输入法合成中的回车是在选字,不算。
 *
 * @param commit 当场写回的手柄。
 * @returns 按键手柄。
 */
function makeQKey(commit: ClickFn): QKeyFn {
  return function onQKey(e: QKeyEvent): void {
    if (e.key !== KEY_ENTER || e.nativeEvent.isComposing === true) {
      return
    }
    commit()
  }
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
 * 2xx 才解相关职位(2026-09-21)。
 *
 * @param r 响应。
 * @returns 相关职位的线格式;非 2xx / 解不开给 null。
 */
function readRelated(r: Response): Promise<RelatedJson | null> {
  if (r.ok === false) {
    return Promise.resolve(null)
  }
  return r.json().catch(nullOf)
}

/**
 * 2xx 才解投递方式。
 * 2026-10-03 付费闭环批 B1 收口:非 2xx(含每 IP 日限 429)与回包解不出都经 applyHowFailed 留痕 ——
 * 外链投递撤了以后,查失败 = 在架岗投递栏不出,不能再无声。
 *
 * @param r 响应。
 * @returns 投递方式;非 2xx 或失败给 null。
 */
function readApplyHow(r: Response): Promise<ApplyHowJson | null> {
  if (r.ok === false) {
    return Promise.resolve(applyHowFailed(String(r.status)))
  }
  return r.json().catch(function badApplyHowJson(e: Error): null {
    return applyHowFailed(String(e))
  })
}

/**
 * 投递邮箱懒查挂了(非 2xx / 网络断 / 回包解不出):留一行,按没查到算。
 *
 * @param why 状态码或错误。
 * @returns null(没查到)。
 */
function applyHowFailed(why: string): null {
  log({ tag: JOBS_LOG.tag, text: JOBS_LOG.applyHowFailed + why })
  return null
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
 * 换岗 / 点重试(resetKey 变了)时两颗开关归零:**在渲染期就地比对上一次的 resetKey**,
 * 不挂 effect —— effect 会先拿旧开关态渲一帧再纠正(展开着原文切下一个岗会闪一下),
 * 而这正是 React 官方 you-might-not-need-an-effect 里「跟着 prop 变化调状态」的形制;
 * 本文件的 useColWidths(换列集清手动宽)与 useBoardData(换页签回第 0 页)是同一副写法。
 *
 * @param x 本岗、界面语言、分层态与额度回传。
 * @returns JD 身体面板。
 */
export function useJobBody(x: JobBodyHookIn): JobBodyPanel {
  const t = makeT(x.lang)
  const jd = useJdText({ job: x.job, onFreeLeft: x.onFreeLeft, jdText: x.jdText })
  const fmt = useJdFormat({ job: x.job, jdFormatted: x.jdFormatted })
  const [showOrig, setShowOrig] = useState(false)
  const trans = useJdTrans({
    job: x.job,
    lang: x.lang,
    resetKey: fmt.resetKey,
    fmtReady: fmt.fmt != null && showOrig === false,
    initial: ssrTransOf({ ssr: x.jdTrans, lang: x.lang }),
  })
  const [prevResetKey, setPrevResetKey] = useState(fmt.resetKey)
  if (prevResetKey !== fmt.resetKey) {
    setPrevResetKey(fmt.resetKey)
    setShowOrig(false)
  }
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
    showTrans: trans.showTrans,
    trans: trans.trans,
    transStatus: trans.transStatus,
    pending: fmt.pending,
    applyEmail: applyEmailOf(jd.text),
  }
}

/**
 * 懒取 JD 正文(#126 同岗会话缓存);额度可见化回传(弹框页眉;页面不挂)。
 * 2026-09-14 职位正文直出批:页面门 SSR 已把库里的正文传下来时,初态就是「拿到了」,
 * effect 不清态不发请求 —— 服务端 HTML 与首帧一字不差(零水合差异),爬虫拿到的就是正文;
 * 传空串(弹框、库里没有)照旧懒取。
 *
 * @param x 本岗、SSR 正文与额度回传。
 * @returns 正文与取数态。
 */
function useJdText(x: JdTextHookIn): JdTextPanel {
  const [text, setText] = useState(x.jdText)
  const [status, setStatus] = useState<JdStatus>(jdInitStatusOf(x.jdText))
  const url = strOf(x.job.applyUrl)
  const jobId = x.job.id
  const onFreeLeft = x.onFreeLeft
  const ssrText = x.jdText
  useEffect(function loadJdText() {
    if (ssrText !== TEXT_NONE) {
      return
    }
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 拉正文前的起手式:换岗先清上一岗的文,清和拉必须同一拍
    setStatus(JD_LOADING)
    setText(TEXT_NONE)
    fetchJobText({ applyUrl: url, id: jobId, signal: ctrl.signal })
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
  }, [url, jobId, onFreeLeft, ssrText])
  return { text, status }
}

/**
 * SSR 正文决定的初态:传了正文就是「拿到了」,没传就是「在途」(等 effect 去懒取)。
 *
 * @param ssrText 页面门传下来的正文。
 * @returns 初始取数态。
 */
function jdInitStatusOf(ssrText: string): JdStatus {
  if (ssrText === TEXT_NONE) {
    return JD_LOADING
  }
  return JD_DONE
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
 * 2026-09-15:页面门 SSR 传了整理版就当初态,首次不发请求(服务端 HTML 里直接有整理版,爬虫看得到);
 * 点重试(tick 变)照旧重生成。
 *
 * @param x 本岗与 SSR 整理版。
 * @returns 整理版、失败由头与重试。
 */
function useJdFormat(x: JdFormatHookIn): JdFormatPanel {
  const [fmt, setFmt] = useState<string | null | undefined>(fmtInitOf(x.jdFormatted))
  const [fmtWhy, setFmtWhy] = useState<FmtWhy>(FMT_FAIL)
  const [pending, setPending] = useState(false)
  const [tick, setTick] = useState(0)
  const url = strOf(x.job.applyUrl)
  const jobId = x.job.id
  const ssrFmt = x.jdFormatted
  useEffect(function loadFmt() {
    if (ssrFmt != null && tick === 0) {
      return
    }
    const ctrl = new AbortController()
    const storedOnly = tick === 0
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 拉整理版前的起手式:undefined = 整理中,换岗或点重试先回这一态
    setFmt(undefined)
    setPending(storedOnly)
    const cap = window.setTimeout(function capFmtHold() {
      setPending(false)
    }, HOLD_MAX_MS)
    fmtLoadOf({ url, id: jobId, storedOnly, signal: ctrl.signal })
      .then(function onStored(r: FmtLoad): Promise<FmtLoad | null> {
        setPending(false)
        if (r.found) {
          setFmtWhy(r.why)
          setFmt(r.fmt)
          return Promise.resolve(null)
        }
        return fmtLoadOf({ url, id: jobId, storedOnly: false, signal: ctrl.signal })
      })
      .then(function onGenerated(r: FmtLoad | null) {
        if (r != null) {
          setFmtWhy(r.why)
          setFmt(r.fmt)
        }
      })
      .catch(function onFmtFail() {
        if (ctrl.signal.aborted === false) {
          setPending(false)
          setFmtWhy(FMT_FAIL)
          setFmt(null)
        }
      })
    return function stopFmt() {
      window.clearTimeout(cap)
      ctrl.abort()
    }
  }, [url, jobId, tick, ssrFmt])
  return {
    fmt,
    fmtWhy,
    resetKey: url + APPLY_RESUME_SEP + String(tick),
    onRetry: function retryFmt(): void {
      setTick(tick + 1)
    },
    pending,
  }
}

/**
 * 拉一次整理版。2026-09-16 Frank「点开的时候,如果有整理版,直接显示整理版,不要有跳跃」:开框首拍只查库(storedOnly),
 * 404 = 没存(found = false,调用方先铺原帖再另起一次生成);其余状态都是定论(200 整理版 / 204 无正文 / 402 429 额度 / 503 失败)。
 *
 * @param x 原帖链接、只不只查库与中止信号。
 * @returns 有没有答案、整理版与由头。
 */
async function fmtLoadOf(x: FmtLoadIn): Promise<FmtLoad> {
  const r = await fetch(URL_API_JD_FORMAT, {
    method: METHOD_POST,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({ url: x.url, id: x.id, storedOnly: x.storedOnly }),
    signal: x.signal,
  })
  if (x.storedOnly && r.status === HTTP_NOT_FOUND) {
    return { found: false, fmt: null, why: FMT_FAIL }
  }
  let tx = TEXT_NONE
  if (r.status === HTTP_OK) {
    tx = await r.text()
  }
  return { found: true, fmt: fmtOrNull(tx), why: fmtWhyOf(r.status) }
}

/**
 * SSR 整理版决定的初态:传了就是「整理好了」,没传就是 undefined(整理中,等 effect 去懒生成)。
 *
 * @param ssrFmt 页面门传下来的整理版。
 * @returns 整理版初态。
 */
function fmtInitOf(ssrFmt: string | null): string | undefined {
  if (ssrFmt == null) {
    return undefined
  }
  return ssrFmt
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
 * 换岗信号变了就把对照三格归零:同 useJobBody,**渲染期就地比对**不挂 effect,
 * 免得上一岗的译文在新岗上多显示一帧。
 * 2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:中 / 韩界面整理版一就绪照旧在后台拉对照(先只查库,没存再现翻),
 * 但**到了不再自动拨开开关**(09-16「默认自动翻译」那次的 setShowTrans(true) 撤),用户拨开即显。
 * 随之 hold / pending 撤:开关默认关,正文区没必要再为「只查库」那一拍留白。后台在译时开关本体不显「翻译中…」
 * (transStatus 交回前按开关遮罩,见 transStatusShownOf);拨开时后台那一次还没回就接着等它,不再另起一次。
 * 2026-09-19 Frank「中文和韩语场景都自动整理自动翻译吧,这两个都删掉吧」「开关都撤了,就自动翻译」**改判** 09-16 / 09-17 两版:
 * 「中文对照」开关撤 —— 中 / 韩界面对照恒显(译文到了就铺在整理版下面),英文界面恒不显;showTrans 不再是状态,onToggle 与开关遮罩随之撤。
 * 2026-10-06 Frank「登录之后,会先刷整个页面,然后出这个条数数字,之后才是刷出文字」:整页版的页面门 SSR 带来库里已存的译文(initial),
 * 首屏就铺,不发请求;换了界面语言按那一语的 SSR 值重铺(渲染期比对)。弹框与库里没存的照旧后台拉。
 *
 * @param x 本岗、界面语言与换岗信号。
 * @returns 对照态与开关。
 */
function useJdTrans(x: JdTransHookIn): JdTransPanel {
  const showTrans = x.lang !== LANG_EN
  const [trans, setTrans] = useState<string | null>(x.initial)
  const [transStatus, setTransStatus] = useState<TransStatus>(TRANS_IDLE)
  const initial = x.initial
  const [prevLang, setPrevLang] = useState(x.lang)
  if (prevLang !== x.lang) {
    setPrevLang(x.lang)
    setTrans(x.initial)
  }
  const jobId = x.job.id
  const lang = x.lang
  const auto = x.fmtReady && lang !== LANG_EN
  const resetKey = x.resetKey
  const [prevResetKey, setPrevResetKey] = useState(x.resetKey)
  if (prevResetKey !== x.resetKey) {
    setPrevResetKey(x.resetKey)
    setTrans(x.initial)
    setTransStatus(TRANS_IDLE)
  }
  useEffect(function autoTrans() {
    if (auto === false || initial != null) {
      return
    }
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 后台拉对照的起手式:整段在途都算 loading,拨开开关时不另起一次
    setTransStatus(TRANS_LOADING)
    track(TRACK_JD_TRANSLATE)
    postTranslate({ id: jobId, lang, storedOnly: true, signal: ctrl.signal })
      .then(function onStored(got: string): Promise<string> {
        if (got !== TEXT_NONE) {
          return Promise.resolve(got)
        }
        return postTranslate({ id: jobId, lang, storedOnly: false, signal: ctrl.signal })
      })
      .then(function onGot(got: string) {
        if (ctrl.signal.aborted) {
          return
        }
        if (got === TEXT_NONE) {
          setTransStatus(TRANS_ERROR)
          return
        }
        setTrans(got)
        setTransStatus(TRANS_IDLE)
      })
    return function stopTrans() {
      ctrl.abort()
    }
  }, [auto, jobId, lang, resetKey, initial])
  return { showTrans, trans, transStatus }
}

/**
 * 拉一份同结构译文。2026-09-16 storedOnly = 只查缓存与库(开框首拍),没存与失败都给空串。
 *
 * @param x 原帖链接、界面语言、只不只查库与中止信号。
 * @returns 译文;失败给空串。
 */
async function postTranslate(x: TranslateIn): Promise<string> {
  const res = await fetch(URL_API_JD_TRANSLATE, {
    method: METHOD_POST,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({ id: x.id, lang: x.lang, storedOnly: x.storedOnly }),
    signal: x.signal,
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
 * 投递栏(E9-04,B11 2026-07-24 拍板:详情底部常驻;注册闸设在投递 = 全站意愿最强瞬间)。
 * 邮箱岗 → mailto 预填;无邮箱 → 外跳原帖。未登录 → 注册框 → 求职意向(复用引导表单,
 * 不新造表单;跳过/关闭都继续投递,投递必须丝滑)。首版 = 替他备好一切他自己发,不代发。
 * 整页窄屏投递栏跑偏(Frank 2026-08-05 实拍):sticky bottom 只在**父容器盒内**吸底,
 * 整页版的父级是白卡,卡下面还有 ~150px 页脚 —— 滚进页脚段栏就跟着卡边上滑;窄屏整页改
 * fixed 常驻视口底,占位补回文档流高度;桌面整页维持 sticky 原样。
 * 2026-09-27 手机职位页水合报 React #418(本机器首帧用 useIsNarrow 读 matchMedia 判窄屏,服务端首帧没有窗口):
 * 窄屏那一档改由 CSS 断点切(整页恒渲占位、恒挂 fixed 那一档的类,见 applybar 头注),本机器不再判窄屏、不再交 fixedBar。
 * dd24-#108:先落库再唤邮件 —— mailto 触发的导航态会掐死在途 fetch,「已投」记录曾竞态丢失。
 * 2026-10-03 付费闭环批 A1:未登录点投递先打一个 apply-click(先前这一下不计数),再弹访客向导(四道题 + 注册,
 * 投递栏里接 makeAuthDone 照旧往下投);Google 整页登录仍靠落地的投递意图由 useApplyResume 续投。
 * 2026-10-03 付费闭环批 B1:外链投递撤(站上在架岗都有投递邮箱)—— launch 没邮箱不再外跳原帖、不记投递,
 * 投递事件 mode 只剩 email;查完仍没邮箱由投递栏不出钮。
 * 同日收口审查:邮箱还在查时点投递(手机从 Google 落地后马上点)原先什么都不发生 —— 改记「在等」,
 * 查完由 useApplyPending 接着投;查完仍没有就作罢(投递栏随之整栏不出)。
 * 2026-10-04 改判(Frank「照这样改」):邮箱只给登录用户、点了才查 —— launch 自己现查(loadApplyEmail),查到才记投递、
 * 弹邮件投递框;查不到留痕作罢(钮留着,这一下不外跳)。上一条的「在等」随之撤(useApplyPending 删),
 * 邮箱由本台持有(不再从外面递进来)。
 * 同日收口审查三处:① 未登录判定补认「这个页面里刚在访客向导里登录过」(isGateSignedIn,同收藏那一路)——
 * 开职位弹框先弹向导、注册完软刷还没回来时点投递,原先会再弹一次投递向导;② launch 加在途闸:Job Bank 现抓要几秒,
 * 连点原先重复查邮箱(吃每人日限)、「已投」可能双插、apply 埋点虚高 —— 在途时钮挂 busy(禁用 + 转圈,点不动),
 * launch 自己也认 busy(在途时再进来一律忽略);③ × 关掉投递向导时撤落地的投递意图(同收藏那一路的 closeSaveGate)——
 * 原先关掉后 10 分钟内从别处登录再回到本岗,useApplyResume 会替他记「已投」并弹邮件框。
 * 2026-10-04 二轮收口审查:点了投递没拿到邮箱不再无声作罢(钮转一圈什么都不发生)—— 按回包状态码分流(showApplyMiss):
 * 401(页面还当已登录、会话已过期)记投递意图、弹登录框,登录完照注册闸那一路接着投;429 弹一行「今天次数用完了」;
 * 其余(网络断、别的非 2xx、查完没有)弹一行「投递失败」。上文「查不到留痕作罢」改读作「留痕并提示」。
 *
 * @param x 本岗、取词函数、分层态与在不在整页里。
 * @returns 投递栏面板。
 */
export function useApplyBar(x: ApplyBarIn): ApplyBarPanel {
  const [stage, setStage] = useState<ApplyStage>(APPLY_IDLE)
  const [matchJd, setMatchJd] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)
  const [freshProfile, setFreshProfile] = useState<MatchProfileFact | null>(null)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState(TEXT_NONE)
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const job = x.job
  const plan = x.plan
  async function launch(): Promise<void> {
    if (busy) {
      return
    }
    setBusy(true)
    clearApplyIntent()
    const got = await loadApplyEmail(job)
    if (got.email !== TEXT_NONE) {
      setEmail(got.email)
      trackApply()
      await recordApplied(job)
      setCopied(false)
      setStage(APPLY_EMAIL)
    } else {
      showApplyMiss({ status: got.status, job, setStage })
    }
    setBusy(false)
  }
  function onApply(): void {
    if (plan.loggedIn === false && authed === false && isGateSignedIn() === false) {
      track(TRACK_APPLY_CLICK)
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
  useApplyResume({ job, plan, setStage, launch })
  return {
    stage,
    email,
    matchJd,
    onMatch: makeOpenMatch({ job, setMatchJd }),
    onMatchClose: function closeMatch(): void {
      setMatchJd(null)
    },
    onApply,
    busy,
    authed,
    onAuthClose: function closeAuth(): void {
      clearApplyIntent()
      setStage(APPLY_IDLE)
    },
    onAuthDone: makeAuthDone({ setAuthed, setFreshProfile, setStage, launch, refresh: router.refresh }),
    intentProfile: intentProfileOf({ fresh: freshProfile, plan }),
    onIntentDone: function finishIntent(): void {
      setStage(APPLY_IDLE)
      launch()
    },
    onEmailClose: function closeEmail(): void {
      setStage(APPLY_IDLE)
    },
    onNoteClose: function closeNote(): void {
      setStage(APPLY_IDLE)
    },
    copied,
    onCopyEmail: makeCopyEmail({ email, setCopied }),
  }
}

/**
 * 投递邮箱(E9-04,dd24-#110 从投递栏上提):JB 岗藏在「Show how to apply」的 JSF 后面 →
 * 懒查 /api/jobs/applyhow;非 JB 岗正文常直接带邮箱,由正则兜底(见 applyEmailPick)。
 * 2026-09-27 Frank「CareerBeacon 渠道的职位 全是前往投递」:库里存着 CareerBeacon 等来源抽好的邮箱(492 条 CareerBeacon),
 * 这里原先只对 JB 链接发问、别的来源当场收工,存好的邮箱从没用上。改成每岗都问(带岗位号,服务端按岗位号取;
 * JB 存的没有才现抓),正则兜底照旧。
 * done 出结果(成败都算):OAuth 回跳续投要等它,别把邮箱岗投成外跳。
 * 2026-10-03 付费闭环批 B1 收口:网络断原先走 swallow 无声吞掉,改经 applyHowFailed 留痕(换岗 / 卸载的中止不算失败)。
 * 2026-10-04 改判(Frank「照这样改」):邮箱只给登录用户、点了才查 —— 打开职位 / 正文到手时不再查(原 useApplyHow 一台撤),
 * 改成登录用户点投递(launch)时现查一次;查挂了(含未登录 401、每人日限 429)与查完没有都留痕交回空串。
 * 「怎么投」节不再拿查来的邮箱,只用正文里正则抽到的(见 useJobBody)。
 * 同日收口审查:上文「由正则兜底(见 applyEmailPick)」「正则兜底照旧」「OAuth 回跳续投要等它」三句作废 ——
 * applyEmailPick 随 useApplyHow 撤,投递不再拿正文邮箱兜底(查不到就作罢),续投由 launch 自己查、不再等。
 * 挪到 useApplyBar 之后(报纸式排序:被调的排在首个调用者后面)。
 * 2026-10-04 二轮收口审查:交回邮箱 + 回包状态码(没拿到响应记 APPLY_STATUS_NET)—— 原先只交回空串,
 * 会话过期、次数用完、网络断与查完没有分不开,launch 没法分流提示;留痕照旧。
 *
 * @param job 本岗。
 * @returns 投递邮箱(没有给空串)与回包状态码。
 */
async function loadApplyEmail(job: JobFact): Promise<ApplyMailOut> {
  let d: ApplyHowJson | null = null
  let status = APPLY_STATUS_NET
  try {
    const res = await fetch(URL_API_APPLY_HOW + encodeURIComponent(strOf(job.applyUrl)) + URL_API_APPLY_HOW_ID
      + String(job.id))
    status = res.status
    d = await readApplyHow(res)
  } catch (e) {
    applyHowFailed(String(e))
    return { email: TEXT_NONE, status }
  }
  if (d == null) {
    return { email: TEXT_NONE, status }
  }
  if (d.email == null || d.email === TEXT_NONE) {
    log({ tag: JOBS_LOG.tag, text: JOBS_LOG.applyHowNone + String(job.id) })
    return { email: TEXT_NONE, status }
  }
  return { email: d.email, status }
}

/**
 * 点了投递没拿到邮箱时落哪一段(2026-10-04 二轮收口审查,原先无声作罢):401 = 页面还当已登录、会话已过期 ——
 * 记投递意图(Google 整页登录回跳后由 useApplyResume 续投)、弹登录框;429 = 今天查邮箱的次数用完了;
 * 其余(网络断、别的非 2xx、回包解不出、查完没有)= 投递失败。留痕在 loadApplyEmail / readApplyHow 里已经落过。
 *
 * @param x 回包状态码、本岗与段写口。
 * @returns 无。
 */
function showApplyMiss(x: ApplyMissIn): void {
  if (x.status === HTTP_UNAUTHORIZED) {
    markApplyIntent(x.job)
    x.setStage(APPLY_LOGIN)
    return
  }
  if (x.status === HTTP_TOO_MANY) {
    x.setStage(APPLY_LIMIT)
    return
  }
  x.setStage(APPLY_ERR)
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
    const r = await fetchJobText({ applyUrl: strOf(x.job.applyUrl), id: x.job.id, signal: null }).catch(nullOf)
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
 * 2026-09-22 Frank「登录了没有刷新 header」:流程内登录不整页刷(会丢投递流程),改软刷(router.refresh)——
 * 服务端组件重渲、layout 的会话种子更新,页顶 header 变成已登录,弹框等客户端状态原地保留。
 * 2026-10-03 付费闭环批 A1 审查:第一步先撤落地的投递意图 —— 流程内登录由本回调接着投,意图留着的话
 * 软刷带回登录态后 useApplyResume 会再投一次(访客向导记了「引导弹过」后它直接 launch,同一岗投两次)。
 * 同日 lead 收口:刚在访客向导里答完四题注册的,不再弹六步意向表,直接投 —— 与 Google 回跳那条路
 * (useApplyResume 认「引导弹过」直接投)一致;四题已经问过,第一封投递前再塞六题是重复的摩擦。
 *
 * @param x 三个写口、投递动作与软刷。
 * @returns 注册成功回调。
 */
function makeAuthDone(x: AuthDoneIn): () => Promise<void> {
  return async function onAuthDone(): Promise<void> {
    clearApplyIntent()
    x.refresh()
    x.setAuthed(true)
    if (isGateSignedIn()) {
      x.setStage(APPLY_IDLE)
      x.launch()
      return
    }
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
 * 邮件投递框里「复制邮箱」的手柄:复制成了钮面换「已复制」,没成(剪贴板被拒)维持原样。
 * 2026-10-04 二轮收口审查自 useApplyBar 体内提出(那一台加了没拿到邮箱的分流,超了函数行数闸),行为一字不改。
 *
 * @param x 要复制的邮箱与「复制过没」的写口。
 * @returns 点击手柄。
 */
function makeCopyEmail(x: CopyEmailIn): ClickFn {
  return function copyEmail(): void {
    navigator.clipboard.writeText(x.email).then(function markCopied(): void {
      x.setCopied(true)
    }).catch(function copyFailed(): void {
      x.setCopied(false)
    })
  }
}

/**
 * OAuth 回跳续投:登录态 + 落地意图是本岗 + 10 分钟内 → 接着走意向表单/直接投,
 * 不让用户再点一次。Google 登录 = 整页 OAuth 跳转,组件状态全丢,所以投递意图要落地。
 * 2026-10-04 邮箱改成 launch 自己现查,不再等「投递方式查完」,登录态一到就续。
 *
 * @param x 本岗、分层态、段写口与投递动作。
 * @returns 无。
 */
function useApplyResume(x: ApplyResumeIn): void {
  const job = x.job
  const loggedIn = x.plan.loggedIn
  const profileOk = x.plan.profileOk
  const setStage = x.setStage
  const launch = x.launch
  useEffect(function resumeApply() {
    if (loggedIn === false) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在登录态到手这一刻跑一次
  }, [loggedIn])
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
 * 2026-09-26 /fe Frank:改走统一上报门 lib/track(umami + 第一方漏斗)—— 原先只直调 umami,
 * 被拦截器挡掉就没了;投递方式记成第一方的低基数分组,邮箱本身永不上报。
 * 2026-10-03 付费闭环批 B1:外链投递撤,mode 只剩 email(applyModeOf 与 web 档撤;库里 web 历史行不动)。
 *
 * @returns 无。
 */
function trackApply(): void {
  track(TRACK_APPLY, { [TRACK_KEY_MODE]: TRACK_MODE_EMAIL })
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
 * 职位详情页的整台。
 * 漏斗第 1 步(主线 M2 收口 2026-08-02):这个页面一直没有第一方浏览埋点 —— 于是库里只有
 * 第 3 步「锁区曝光」有数,分母是空的,M3 的两种分叉(锁的东西不值钱 / 根本没人看见)
 * 照样分不开。30 天数据里入口 = 出口就是本页,它才是漏斗真正的第一格(列表页弹框另计 kind=modal)。
 * 列表页会注册整张分类维表;详情页直入也必须注册本岗这一行,否则英/韩界面会回退中文分类名。
 * 返回(Frank 走查#18)的在途态(2026-07-25 用户「点击要有动画,不然不知道点没点,跳页有延迟」:
 * 按下即置忙态变灰降透明)与落点 2026-09-03 随「返回钮全站一件」一起搬进 button 桶的 BackButton,
 * 本台不再管返回。
 *
 * 2026-09-23 标题下那条灰字改成标题译名(Frank「统一成标题译名」「应该优先使用详情下的翻译 更准吧」):这一岗库里存好的直接出,
 * 没有就按岗懒翻一次(与职位弹框同一台 useTitleTrans;歧义标题带正文翻、只写回这一岗)。
 * 2026-10-03 付费闭环批 A1:整页打开记一笔浏览(访客向导的计数),但整页永远不弹向导、不盖正文 ——
 * Google 招聘规则:不登录也要能看职位详情。
 *
 * @param x 本岗、分层态、页面维度与相似职位。
 * @returns 详情页面板。
 */
export function useJobDetail(x: JobIn): JobDetailPanel {
  const [lang, , t] = useLang()
  const cats = x.dims.nocCategories
  const trans = useTitleTrans({
    title: x.job.title, id: x.job.id, lang, cached: storedTitleOf({ row: x.job, lang }), gen: TITLE_TRANS_GEN,
  })
  useEffect(function trackOpen() {
    track(TRACK_JD_OPEN, { [TRACK_KEY_KIND]: TRACK_KIND_PAGE })
  }, [])
  useEffect(function markSeen() {
    markSeenJob({ id: x.job.id, noc: x.job.noc })
  }, [x.job.id, x.job.noc])
  useMemo(function registerDetailLabels() {
    registerCatLabels(cats)
  }, [cats])
  return {
    t,
    lang,
    view: jobDetailViewOf({ job: x.job, dims: x.dims, lang, t, related: x.related, trans }),
  }
}

/**
 * 职位名下那行日期(2026-09-26;详情页与职位弹框同一台):「此刻」在首渲那一拍取一次 ——
 * 截止格按天判过期,渲染之间不必再读时钟(与 advisor 时间事实块 useState(Date.now) 同款)。
 *
 * @param x 本岗与取词函数。
 * @returns 0 ~ 2 格,发布在前。
 */
export function useJobDates(x: JobDatesIn): JobDateCell[] {
  const [now] = useState(Date.now)
  return jobDatesOf({ job: x.job, t: x.t, now })
}

/**
 * 详情页上叠开的职位描述弹框(2026-09-19:下架岗的相似职位点了不跳走)。Esc 关。
 * 2026-09-21 改成弹框栈(Frank「点公司就弹公司的框?然后还能点回来」):相关职位卡点一行、公司信息卡点公司名都往上叠,
 * 只关最上面一层;Esc 由栈自己管(也只关最上面一层)。
 *
 * @returns 弹框栈与点相关职位 / 点公司名两个手柄。
 */
export function useJobPeek(): JobPeekPanel {
  const stack = useLayerStack<PeekLayer>()
  return { stack, onOpenJob: makePushJobLayer(stack), onOpenCompany: makePushCoLayer(stack) }
}

/**
 * 职位描述弹框下面的相关职位(2026-09-21 Frank「参考一下公司弹框」):按岗位号现取(弹框走客户端,手里只有岗位号);
 * 换了岗位当场清空重取。没取到就一直是 null(卡不出)。
 *
 * @param x 岗位号。
 * @returns 相关职位;null = 还没到 / 没取到。
 */
export function useRelatedOf(x: RelatedOfHookIn): RelatedJobs | null {
  const [related, setRelated] = useState<RelatedJobs | null>(null)
  const [prevId, setPrevId] = useState(x.id)
  if (prevId !== x.id) {
    setPrevId(x.id)
    setRelated(null)
  }
  const id = x.id
  useEffect(function loadRelated() {
    let dead = false
    fetch(URL_API_JOB_RELATED + String(id))
      .then(readRelated)
      .then(function onRelated(j: RelatedJson | null) {
        if (dead === false) {
          setRelated(toRelatedJobs(j))
        }
      })
      .catch(swallow)
    return function stopRelated() {
      dead = true
    }
  }, [id])
  return related
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

/**
 * 职位页移民相关卡的弹框状态(2026-10-02:三行点开职位板同一个弹框;一次只开一个)。
 *
 * @returns 开着的列与开 / 关两个口。
 */
export function useImmPopup(): ImmPopupPanel {
  const [col, setCol] = useState<JobColKey | null>(null)
  function open(k: JobColKey): void {
    setCol(k)
  }
  function close(): void {
    setCol(null)
  }
  return { col, open, close }
}
