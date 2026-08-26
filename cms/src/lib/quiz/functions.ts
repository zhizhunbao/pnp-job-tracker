/**
 * 答题域的行为:答案门面(唯一读写口,页面不直接碰 localStorage)、旧档搬家、
 * 服务端档同步、判定清单取用、热门职业 SWR 缓存。
 *
 * 答案门面(设计:docs/design/统一题库与付费面-20260731.md §3/§6):收敛前处境与目标省被
 * 两个旧 key 各存一份、各问一遍 —— 重复的根不是 UI,是没有字段单一来源。
 * 老答案是用户唯一的资产,丢了等于让他重答 —— 首次读盘把两个旧 key 合并进新 key 再删旧 key。
 *
 * 服务端档同步(2026-08-16 重做,Frank「用缓存就是这么麻烦」):**服务端 users.answers 是
 * 唯一真相**,浏览器只剩内存运行态。丢答案的两个窗口在这里正面堵死:
 *   ① PUT 失败 → 退避重试(2/6/18s),不再「等用户下次改动」
 *   ② 防抖窗口内离开页面 → pagehide/隐藏时 sendBeacon 强推(与埋点同一招)
 * 未登录不发请求(答题必须先登录,注册闸 2026-08-14 起就在);登录成功那一刻若内存里已有答案,
 * 拉档时发现服务端空 → 立即推上去,注册闸承诺的「答案自动存档」照旧兑现。
 *
 * 本文件的静默 catch 全在浏览器存储/网络接缝上(localStorage 配额、beacon、fetch),
 * 失败路径各自有兜底(退避重试/下次改动再推),留痕只会刷屏 —— 同 track 的埋点吞错先例。
 *
 * @author Frank
 * @time 2026-08-18 04:36:46
 *
 * 2026-08-25:字段库的**数据半**已搬进 constants.ts 的 FIELD_SPECS(宪法「functions.ts
 * 顶层只许有 function」),这里只剩装配(getFields)与行为半(fieldBehaviorOf)。
 * 原尾段注:字段库(FIELDS)住尾段 —— 题面是数据、
 * 换算是行映射,一题一行放一起,拆开就得靠名字对齐两张表(设计:
 * docs/design/统一题库与付费面-20260731.md §1/§3)。铁律:挂不上任何结论的字段不入库。
 * 2026-08-03:题面原先是 SurveyJS 的题 JSON(type/name/isRequired 全是给框架看的),
 * 撤掉框架后收成本站自己的最小形状 —— 全部是必答单选,类型与必答不用逐题再声明一遍。
 */
import {
  AGE,
  ANSWERS_KEY,
  CLB,
  CLB_V2_MAP,
  COLLECTION_USERS,
  CRED_INCLUDE,
  CRS,
  DECISIONS,
  EDU,
  EDU_YEARS,
  EMPTY,
  EV_PAGEHIDE,
  EV_VISIBILITY,
  EXP,
  FACTS_CACHE_MAX,
  FIELD_SPECS,
  FRENCH_V2_MAP,
  IN_CANADA,
  JSON_MIME,
  LI_RE,
  LI_SET_OFF,
  LI_SET_ON,
  META_KEY,
  METHOD_PUT,
  NCLC,
  OLD_PR,
  OLD_QUIZ,
  PERMIT,
  PGWP,
  PREV_JSON_NONE,
  PROVS,
  SCORE_ANSWERS_KEY,
  SCORE_EMPTY,
  STAGE_BASIC,
  STATE_HIDDEN,
  STATUS_NONE,
  STUDY_LEVEL,
  STUDY_MONTHS,
  TIER_FREE,
  TOTAL_EXP,
  TOTAL_V2_MAP,
  TTL,
  UNSURE_BAND,
  URL_ANSWERS,
} from './constants'
import { CACHE } from './variables'
import type {
  Answers,
  AnswersDoc,
  AnswersOut,
  AnswersPatch,
  BandValue,
  DropFn,
  EngineAnswers,
  EngineValue,
  FactsStoreFn,
  FieldBehavior,
  FieldMap,
  FieldNames,
  FirstStoreFn,
  L,
  LoadAnswersIn,
  MaybeAnswers,
  MaybeProvList,
  MaybeRawDoc,
  NameFilter,
  ProvList,
  PulledOut,
  PushedOut,
  RawAnswersSource,
  RawCell,
  RawDoc,
  RawField,
  RawScoreSource,
  RawText,
  SaveAnswersIn,
  SaveAnswersOut,
  ScoreAnswers,
  Stage,
  StoreFn,
  Tier,
  TopCachedIn,
  TopOut,
  TopRows,
  UnflagFn,
} from './types'
import { HDR_CONTENT_TYPE } from '../http'

/**
 * localStorage 里的 json → 档对象(真会抛的 JSON.parse 接缝;坏的/空的给 null,
 * 不抛 —— 旧档解析失败按没有算)。
 *
 * @param s 存储原文。
 * @returns 档对象或 null。
 */
function parse(s: RawText): MaybeRawDoc {
  try {
    if (s == null || s === '') {
      return null
    }
    const doc: RawCell = JSON.parse(s)
    if (doc != null && typeof doc === 'object' && Array.isArray(doc) === false) {
      return doc as RawDoc
    }
    return null
  } catch {
    return null
  }
}

/**
 * 迁移:两个旧 key → 新 key。处境两处都有 → 以答得更细的拿 PR 那份优先;
 * 目标省两种表示互补(三问存省份数组、答题存档位),缺哪边就从另一边推出来。
 *
 * @returns 合并档;没有旧档给 null。
 */
function migrate(): MaybeAnswers {
  if (typeof localStorage === 'undefined') {
    return null
  }
  const q = parse(localStorage.getItem(OLD_QUIZ))
  const p = parse(localStorage.getItem(OLD_PR))
  if (q == null && p == null) {
    return null
  }
  let provs: string[] = []
  if (q != null) {
    provs = arr(q.provs)
  }
  let provBand = 0
  if (p != null) {
    provBand = num(p.provBand)
  }
  if (provBand === 0) {
    provBand = bandFromProvs(provs)
  }
  const merged: Answers = Object.assign({}, EMPTY)
  let status = STATUS_NONE
  if (p != null && str(p.status) !== '') {
    status = str(p.status)
  } else if (q != null && str(q.status) !== '') {
    status = str(q.status)
  }
  merged.status = status
  if (q != null) {
    merged.nocs = arr(q.nocs)
    if (q.done === true) {
      merged.done = true
    }
  }
  if (provs.length > 0) {
    merged.provs = provs
  } else {
    merged.provs = provsFromBand(provBand)
  }
  merged.provBand = provBand
  if (p != null) {
    let clb = CLB_V2_MAP[num(p.clbBand)]
    if (clb == null) {
      clb = 0
    }
    merged.clbBand = clb
    merged.expBand = num(p.expBand)
    merged.totalExpBand = totalV2(num(p.totalExpBand))
    merged.crsBand = num(p.crsBand)
    merged.pgwpBand = num(p.pgwpBand)
  }
  try {
    localStorage.removeItem(OLD_QUIZ)
    localStorage.removeItem(OLD_PR)
  } catch {}
  return merged
}

/**
 * 丢掉手上这份运行态。**换账号必须调** —— 内存是模块级的,不清就会把上一个人的答案
 * 带给下一个登录的人(先前 localStorage 时代同病,只是没人注意)。测试也用它隔离用例。
 *
 * @returns 无。
 */
export function resetAnswersMemory(): void {
  CACHE.mem = null
  CACHE.memScore = null
  CACHE.dirty = false
  CACHE.retryN = 0
  CACHE.hydrated = false
}

/**
 * 写运行态,语义真变了才排同步(逐字节比 normalize 后的 json)。
 *
 * @param a 新档。
 * @returns 无。
 */
function save(a: Answers): void {
  let before = PREV_JSON_NONE
  if (CACHE.mem != null) {
    before = JSON.stringify(normalize(CACHE.mem))
  }
  CACHE.mem = a
  if (JSON.stringify(normalize(a)) !== before) {
    touched()
  }
}

/**
 * 读全卷(运行态 → 浏览器里待搬家的旧档 → 两个更旧的 key → 空卷)。
 *
 * @returns 全字段对齐的全卷。
 */
export function readAnswers(): Answers {
  if (CACHE.mem != null) {
    return normalize(CACHE.mem)
  }
  let legacy: RawDoc | null = null
  if (typeof localStorage !== 'undefined') {
    legacy = parse(localStorage.getItem(ANSWERS_KEY))
  }
  if (legacy != null) {
    return normalize(legacy)
  }
  const old = migrate()
  if (old != null) {
    return normalize(old)
  }
  return Object.assign({}, EMPTY)
}

/**
 * 写全卷(局部)。写入即同步目标省的两种表示 —— 只写一边会让另一个入口重新问一遍
 * (那正是收敛掉的病)。
 *
 * @param patch 要改的格。
 * @returns 写后的全卷。
 */
export function writeAnswers(patch: AnswersPatch): Answers {
  const next: Answers = Object.assign({}, readAnswers(), patch)
  if (patch.provBand != null && patch.provs == null) {
    next.provs = provsFromBand(patch.provBand)
  }
  if (patch.provs != null && patch.provBand == null) {
    next.provBand = bandFromProvs(patch.provs)
  }
  save(next)
  return next
}

/**
 * 重置(Frank 2026-07-31「答题给一个重置的功能」):把这份答案整份丢掉,回到从没答过的状态。
 * 连 done 一起清 —— 留着它职位板就不再问三问了,那不叫重置。
 * 重置立即推空档,不走防抖 —— 换页就丢的话,下次拉档旧答案又回来了(重置=没重置)。
 *
 * @returns 空卷。
 */
export function clearAnswers(): Answers {
  CACHE.mem = Object.assign({}, EMPTY)
  CACHE.memScore = Object.assign({}, SCORE_EMPTY)
  dropLegacy()
  if (CACHE.loggedIn === true) {
    void pushToServer()
  }
  return Object.assign({}, EMPTY)
}

/**
 * 读分值卡档(运行态 → 浏览器里待搬家的旧档 → 空档)。
 *
 * @returns 全字段对齐的分值卡档。
 */
export function readScoreAnswers(): ScoreAnswers {
  if (CACHE.memScore != null) {
    return normalizeScore(CACHE.memScore)
  }
  let legacy: RawDoc | null = null
  if (typeof localStorage !== 'undefined') {
    legacy = parse(localStorage.getItem(SCORE_ANSWERS_KEY))
  }
  return normalizeScore(legacy)
}

/**
 * 写分值卡档,语义真变了才排同步。
 *
 * @param a 新档。
 * @returns 无。
 */
export function writeScoreAnswers(a: ScoreAnswers): void {
  const before = JSON.stringify(readScoreAnswers())
  CACHE.memScore = a
  if (JSON.stringify(normalizeScore(a)) !== before) {
    touched()
  }
}

/**
 * 答过三问没有(职位板判断弹不弹、拿 PR 判断要不要拉起选职业)。
 *
 * @param a 全卷。
 * @returns 答过 true。
 */
export function answeredBasics(a: Answers): boolean {
  return Boolean(a.done || a.status || a.nocs.length || a.provs.length)
}

/**
 * 有没有登录迹象 cookie。
 *
 * @returns 有 true。
 */
function hasLoginTrace(): boolean {
  try {
    return typeof document !== 'undefined' && LI_RE.test(document.cookie)
  } catch {
    return false
  }
}

/**
 * 置位/清除登录迹象 cookie。
 *
 * @param on 置位 true,清除 false。
 * @returns 无。
 */
function setLoginTrace(on: boolean): void {
  let cookie = LI_SET_OFF
  if (on) {
    cookie = LI_SET_ON
  }
  try {
    document.cookie = cookie
  } catch {}
}

/**
 * 浏览器里的旧档:搬完家就删,此后一个字节都不再往里写。
 *
 * @returns 无。
 */
function dropLegacy(): void {
  try {
    localStorage.removeItem(ANSWERS_KEY)
    localStorage.removeItem(SCORE_ANSWERS_KEY)
    localStorage.removeItem(META_KEY)
  } catch {}
}

/**
 * 同步载荷(基础卷 + 分值卡整份上行)。
 *
 * @returns json 串。
 */
function payload(): string {
  return JSON.stringify({ basic: readAnswers(), score: readScoreAnswers() })
}

/**
 * 写档触点:排一次短防抖(连点选项时不至于每答一下发一次),并挂上离开页面的兜底。
 * 还没拉过档的改动不算用户改动 —— 那是页面在自我初始化。
 *
 * @returns 无。
 */
function touched(): void {
  if (CACHE.hydrated === false) {
    return
  }
  CACHE.dirty = true
  if (CACHE.loggedIn !== true || typeof window === 'undefined') {
    return
  }
  armLeaveGuard()
  if (CACHE.syncTimer != null) {
    clearTimeout(CACHE.syncTimer)
  }
  CACHE.syncTimer = setTimeout(firePush, 800)
}

/**
 * 防抖到点:清定时器句柄并推档。
 *
 * @returns 无。
 */
function firePush(): void {
  CACHE.syncTimer = null
  void pushToServer()
}

/**
 * 离开页面/切后台时把没推成功的改动用 sendBeacon 强推
 * (sendBeacon 只能 POST —— 端点同时收 PUT 与 POST,见 api/account/answers)。
 *
 * @returns 无。
 */
function flushOnLeave(): void {
  if (CACHE.dirty === false || CACHE.loggedIn !== true) {
    return
  }
  try {
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(URL_ANSWERS, new Blob([payload()], { type: JSON_MIME }))
    }
  } catch {}
}

/**
 * 页面切到不可见时的兜底触发。
 *
 * @returns 无。
 */
function flushOnHidden(): void {
  if (document.visibilityState === STATE_HIDDEN) {
    flushOnLeave()
  }
}

/**
 * 挂上离开页面的兜底(pagehide + visibilitychange,只挂一次)。
 *
 * @returns 无。
 */
function armLeaveGuard(): void {
  if (CACHE.guarded || typeof window === 'undefined') {
    return
  }
  CACHE.guarded = true
  window.addEventListener(EV_PAGEHIDE, flushOnLeave)
  document.addEventListener(EV_VISIBILITY, flushOnHidden)
}

/**
 * 推档(PUT)。401 = 会话没了,清迹象;非 2xx/网络错 = 退避重试。
 *
 * @returns 无(结果反映在 CACHE.loggedIn/dirty/retryN 上)。
 */
async function pushToServer(): PushedOut {
  if (hasLoginTrace() === false) {
    return
  }
  if (CACHE.hydrated === false) {
    return
  }
  try {
    const r = await fetch(URL_ANSWERS, {
      method: METHOD_PUT, credentials: CRED_INCLUDE, headers: { [HDR_CONTENT_TYPE]: JSON_MIME },
      body: payload(),
    })
    if (r.status === 401) {
      CACHE.loggedIn = false
      setLoginTrace(false)
      CACHE.dirty = false
      return
    }
    if (r.ok === false) {
      scheduleRetry()
      return
    }
    CACHE.loggedIn = true
    setLoginTrace(true)
    CACHE.dirty = false
    CACHE.retryN = 0
    dropLegacy()
  } catch {
    scheduleRetry()
  }
}

/**
 * 退避重试:2s → 6s → 18s,三次不成就等下次改动(再拖下去也多半是会话没了)。
 *
 * @returns 无。
 */
function scheduleRetry(): void {
  if (CACHE.retryN >= 3 || CACHE.retryTimer != null) {
    return
  }
  const wait = 2000 * 3 ** CACHE.retryN
  CACHE.retryN += 1
  CACHE.retryTimer = setTimeout(fireRetry, wait)
}

/**
 * 重试到点:清句柄再推。
 *
 * @returns 无。
 */
function fireRetry(): void {
  CACHE.retryTimer = null
  void pushToServer()
}

/**
 * 拉服务端档(登录成功回调、消费页挂载时调)。返回 true = 内存被服务端档换过,调用方需重建
 * state。不再「合并」——服务端就是真相;只有两种例外会反向推:服务端空档、或本地还有没搬家的
 * 旧档。afterLogin=true 给 AuthForm 登录成功后那一调:此刻迹象 cookie 还没置位,必须绕过迹象闸。
 * 拉档途中用户又答了题 → 以他刚答的为准,这轮不覆盖(touched 已排好同步;dirty 只在 hydrated
 * 之后才置位,所以「挂载时的初始化写」不会误伤这一判断)。
 *
 * @param afterLogin 登录成功后的那一调传 true(绕过迹象闸)。
 * @returns 内存被服务端档换过 true。
 */
// eslint-disable-next-line local/typed-signature -- 带默认值的参数注解挂在 AssignmentPattern 上,规则读不到;boolean=false 是 AuthForm 登录回调的既有门面
export async function pullAndMerge(afterLogin: boolean = false): PulledOut {
  if (typeof window === 'undefined') {
    return false
  }
  if (afterLogin === false && hasLoginTrace() === false) {
    return false
  }
  try {
    const r = await fetch(URL_ANSWERS, { credentials: CRED_INCLUDE })
    if (r.status === 401) {
      CACHE.loggedIn = false
      setLoginTrace(false)
      return false
    }
    if (r.ok === false) {
      return false
    }
    CACHE.loggedIn = true
    setLoginTrace(true)
    armLeaveGuard()
    const body: RawCell = await r.json().catch(nullBody)
    let doc: RawDoc | null = null
    if (body != null && typeof body === 'object' && Array.isArray(body) === false) {
      const cell = (body as RawDoc).answers
      if (cell != null && typeof cell === 'object' && Array.isArray(cell) === false) {
        doc = cell as RawDoc
      }
    }
    let serverHas = false
    if (doc != null && (doc.basic != null || doc.score != null)) {
      serverHas = true
    }
    if (serverHas === false) {
      const local = readAnswers()
      const localScore = readScoreAnswers()
      if (answeredBasics(local) || Object.keys(localScore.extraAnswered).length > 0) {
        CACHE.mem = local
        CACHE.memScore = localScore
        CACHE.hydrated = true
        await pushToServer()
      } else {
        CACHE.hydrated = true
      }
      return false
    }
    if (CACHE.dirty) {
      CACHE.hydrated = true
      return false
    }
    let basic: RawDoc = {}
    if (doc != null && doc.basic != null && typeof doc.basic === 'object' && Array.isArray(doc.basic) === false) {
      basic = doc.basic as RawDoc
    }
    let score: RawDoc = {}
    if (doc != null && doc.score != null && typeof doc.score === 'object' && Array.isArray(doc.score) === false) {
      score = doc.score as RawDoc
    }
    CACHE.mem = normalize(basic)
    CACHE.memScore = normalizeScore(score)
    CACHE.hydrated = true
    dropLegacy()
    return true
  } catch {
    return false
  }
}

/**
 * r.json() 解析失败的兜底(响应体不是 json 按没有档处理)。
 *
 * @param _e 捕到的错误(不用)。
 * @returns null。
 */
function nullBody(_e: Error): null {
  return null
}

/**
 * 一个决定在某段/某批要问的字段名。传了答案就按题级显隐过滤(rows.ts 各题 visible):
 * 问题清单与完整度计数必须同源 —— 一边把题藏了、另一边还按全量计数,「已答 8/10」就永远到不了满。
 *
 * @param decision 决定名。
 * @param stage 基本卷还是探索批。
 * @param batch 探索批序号(基本卷不看)。
 * @param a 全卷答案;不传就不做题级显隐过滤。
 * @returns 字段名清单。
 */
// eslint-disable-next-line local/one-parameter, local/no-optional, local/typed-signature -- 既有门面:四参里后两个可省,12 个调用点的形态定死在此;带默认值的参数注解挂在 AssignmentPattern 上,规则读不到
export function fieldsOf(decision: string, stage: Stage, batch: number = 0, a?: Answers): FieldNames {
  const d = DECISIONS[decision]
  if (d == null) {
    return []
  }
  let names: string[]
  if (stage === STAGE_BASIC) {
    names = d.basic
  } else {
    const hit = d.explore[batch]
    if (hit != null) {
      names = hit
    } else {
      names = []
    }
  }
  if (a == null) {
    return names
  }
  return names.filter(makeVisibleFilter(a))
}

/**
 * 题级显隐过滤器(filter 传具名函数;闭包住这份答案;没 visible 的题恒显)。
 *
 * @param a 全卷答案。
 * @returns 「这道题该显示吗」判定函数。
 */
function makeVisibleFilter(a: Answers): NameFilter {
  return function visibleOf(n: string): boolean {
    const def = getFields()[n]
    if (def == null || def.visible == null) {
      return true
    }
    return def.visible(a)
  }
}

/**
 * 只问缺的(字段属于用户,不属于页面)。
 *
 * @param names 候选字段名。
 * @param a 全卷答案。
 * @returns 还没答的字段名。
 */
// eslint-disable-next-line local/one-parameter -- 既有门面:「候选清单 + 全卷」这对语义定死两参
export function missingFields(names: FieldNames, a: Answers): FieldNames {
  return names.filter(makeMissingFilter(a))
}

/**
 * 缺答判定器(filter 传具名函数;0/空串/空缺都算没答)。
 *
 * @param a 全卷答案。
 * @returns 「这道题缺答吗」判定函数。
 */
function makeMissingFilter(a: Answers): NameFilter {
  return function missingOf(n: string): boolean {
    const v = a[n as keyof Answers]
    if (v == null || v === 0 || v === '') {
      return true
    }
    return false
  }
}

/**
 * 规则:每批探索题第一道必须是 free 题 —— 先兑现一次再谈钱,一整批全是 pro 题
 * = 用户答完什么都没多看到。新加批次必须守;PR 批 1 是历史偏差(见 KNOWN_NO_FREE_LEAD),
 * 不许再加第二个。
 *
 * @param names 一批字段名。
 * @returns 批首是 free 题 true。
 */
export function batchLeadsFree(names: FieldNames): boolean {
  const def = getFields()[names[0]]
  if (def == null) {
    return false
  }
  return def.tier === TIER_FREE
}

/**
 * 取本人答案档(2026-08-15 Frank「答案入库绑账号」;Payload 句柄由路由注进来)。
 * payload.auth 的 user 走 JWT 策略不保证带全字段 —— 档案按 id 回表取,别信缓存形状。
 * 查挂视作无档(答案档丢一次拉取无害,前端本地档兜底,不 500)。
 * 体内 `raw as AnswersDoc` 是跨边界断言:生成的 User 型没收 docs/sql 手写加的
 * answers 列,形状声明在 `AnswersDoc`。
 *
 * @param input Payload 句柄与本人 id。
 * @returns 答案档 json;没档/查挂是 null。
 */
export async function loadAnswers(input: LoadAnswersIn): AnswersOut {
  const raw = await input.payload
    .findByID({ collection: COLLECTION_USERS, id: input.userId, depth: 0 })
    .catch(nullAnswersDoc)
  if (raw == null) {
    return null
  }
  const doc = raw as AnswersDoc
  if (doc.answers == null) {
    return null
  }
  return doc.answers
}

/**
 * 查挂时的空档兜底(catch 传具名函数)。
 *
 * @param _e 捕到的错。
 * @returns null(视作无档)。
 */
function nullAnswersDoc(_e: Error): null {
  return null
}

/**
 * 整档覆盖答案(合并判新旧在客户端,本函数只做存;updatedAt 由路由补,服务端时刻为准)。
 *
 * @param input Payload 句柄、本人 id、两份答案档与更新时刻。
 * @returns 落库即返。
 */
export async function saveAnswers(input: SaveAnswersIn): SaveAnswersOut {
  await input.payload.update({
    collection: COLLECTION_USERS,
    id: input.userId,
    data: { answers: { basic: input.basic, score: input.score, updatedAt: input.updatedAt } },
  })
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * 档里的一格 → 数字(不是有限数字给 0)。
 *
 * @param v 原料格。
 * @returns 数字。
 */
export function num(v: RawField): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v
  }
  return 0
}

/**
 * 档里的一格 → 字符串数组(不是数组给空;数组里只留字符串)。
 *
 * @param v 原料格。
 * @returns 字符串数组。
 */
export function arr(v: RawField): ProvList {
  if (Array.isArray(v)) {
    return v.filter(isStr)
  }
  return []
}

/**
 * 档里的一格 → 字符串(不是字符串给空串)。
 *
 * @param v 原料格。
 * @returns 字符串。
 */
export function str(v: RawField): string {
  if (typeof v === 'string') {
    return v
  }
  return ''
}

/**
 * 档里的一格 → 对象(不是对象给空对象)。
 *
 * @param v 原料格。
 * @returns 对象。
 */
export function rec(v: RawField): RawDoc {
  if (v != null && typeof v === 'object' && Array.isArray(v) === false) {
    return v as RawDoc
  }
  return {}
}

/**
 * 数组过滤用的字符串判定(filter 传具名函数)。
 *
 * @param x 数组一格。
 * @returns 是字符串 true。
 */
function isStr(x: RawCell): x is string {
  return typeof x === 'string'
}

/**
 * 人在不在加拿大境内(境内三种处境;permitBand/resProv 的题级显隐都用它)。
 *
 * @param a 全卷答案。
 * @returns 境内 true。
 */
export function inCanada(a: Answers): boolean {
  return IN_CANADA.includes(a.status)
}

/**
 * 档位数字收窄(BandValue 可能是省码字符串;数字题的换算先过这一格)。
 *
 * @param v 选项值。
 * @returns 数字档;不是数字给 0。
 */
function band(v: BandValue): number {
  if (typeof v === 'number') {
    return v
  }
  return 0
}

/**
 * 处境:'unsure' → undefined,引擎拿 null 落「判不了」,不替他猜
 * (2026-08-12 Frank「每个选项都应该给一个不清楚的」)。
 *
 * @param v 处境码。
 * @returns 引擎处境;不清楚不传。
 */
function statusAnswer(v: BandValue): EngineValue {
  if (typeof v === 'string' && v !== '' && v !== 'unsure') {
    return v
  }
  return undefined
}

/**
 * 许可档 → 许可码(境外不传;不清楚不传)。
 *
 * @param v 档位。
 * @param all 全卷答案。
 * @returns 许可码或不传。
 */
// eslint-disable-next-line local/one-parameter -- FieldDef.toAnswer 的形状定死两参(见 types.ts 的特批)
function permitAnswer(v: BandValue, all: Answers): EngineValue {
  const b = band(v)
  if (inCanada(all) && b !== 0 && b !== UNSURE_BAND) {
    return PERMIT[b]
  }
  return undefined
}

/**
 * 现居省(境外不传)。
 *
 * @param v 省码。
 * @param all 全卷答案。
 * @returns 省码或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function resProvAnswer(v: BandValue, all: Answers): EngineValue {
  if (inCanada(all) && typeof v === 'string' && v !== '') {
    return v
  }
  return undefined
}

/**
 * 学历档 → 学历码(0 档/超界不传)。
 *
 * @param v 档位。
 * @returns 学历码或不传。
 */
function eduAnswer(v: BandValue): EngineValue {
  return EDU[band(v)] || undefined
}

/**
 * 年龄档 → 区间中点(0 档不传)。
 *
 * @param v 档位。
 * @returns 年龄或不传。
 */
function ageAnswer(v: BandValue): EngineValue {
  return AGE[band(v)] || undefined
}

/**
 * 总经验档 → 月数(不清楚不传;「没有」= 0 是答案)。
 *
 * @param v 档位。
 * @returns 月数或不传。
 */
function totalExpAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0 && b !== UNSURE_BAND) {
    return TOTAL_EXP[b]
  }
  return undefined
}

/**
 * 英语档 → CLB(「还没考」不传)。
 *
 * @param v 档位。
 * @returns CLB 或不传。
 */
function clbAnswer(v: BandValue): EngineValue {
  return CLB[band(v)] || undefined
}

/**
 * 加拿大经验档 → 月数(不清楚不传)。
 *
 * @param v 档位。
 * @returns 月数或不传。
 */
function expAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0 && b !== UNSURE_BAND) {
    return EXP[b]
  }
  return undefined
}

/**
 * 加拿大经验的选项过滤:「其中」是真的其中 —— 加拿大经验选不出比总经验更长的档
 * (2026-08-02 实撞:总经验答「没有」、加拿大答「2 年以上」,引擎取大的那个,句子写成
 * 「你填的 30 个月」,看着就像胡说)。2026-08-14 起总经验是精确档,两套序号不再对齐 ——
 * 改按**月数**比(总经验「不清楚」不设限)。
 *
 * @param a 全卷答案。
 * @param v 候选档位。
 * @returns 该选项可见 true。
 */
// eslint-disable-next-line local/one-parameter -- FieldDef.choiceVisible 的形状定死两参(见 types.ts 的特批)
function expChoiceVisible(a: Answers, v: BandValue): boolean {
  if (a.totalExpBand === 0 || a.totalExpBand === UNSURE_BAND) {
    return true
  }
  let cand = 0
  const e = EXP[band(v)]
  if (e != null) {
    cand = e
  }
  let cap = 999
  const t = TOTAL_EXP[a.totalExpBand]
  if (t != null) {
    cap = t
  }
  return cand <= cap
}

/**
 * 目标省档 → 省码组(超界给空 = 不限省)。
 *
 * @param v 档位。
 * @returns 省码组。
 */
function provAnswer(v: BandValue): EngineValue {
  const hit = PROVS[band(v)]
  if (hit != null) {
    return hit
  }
  return []
}

/**
 * 诉求档 → 目标函数码。
 *
 * @param v 档位。
 * @returns 'pr' / 'work' 或不传。
 */
function goalAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b === 1) {
    return 'pr'
  }
  if (b === 2) {
    return 'work'
  }
  return undefined
}

/**
 * offer 档 → 有无 offer(「面试中/自雇」都按「还没有」算,不含糊;不清楚不传)。
 *
 * @param v 档位。
 * @returns 布尔或不传。
 */
function offerAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0 && b !== UNSURE_BAND) {
    return b === 1
  }
  return undefined
}

/**
 * 有无加拿大学历(不清楚不传)。
 *
 * @param v 档位。
 * @returns 布尔或不传。
 */
function canadaEduAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0 && b !== UNSURE_BAND) {
    return b === 1
  }
  return undefined
}

/**
 * 有加拿大学历的人才见的题(fieldMatchBand/eduProv/eduYearsBand 三题同闸)。
 *
 * @param a 全卷答案。
 * @returns 可见 true。
 */
function hasCanadaEdu(a: Answers): boolean {
  return a.canadaEduBand === 1
}

/**
 * 专业对口档 → 布尔(只对有加拿大学历的人传;不清楚不传)。
 *
 * @param v 档位。
 * @param all 全卷答案。
 * @returns 布尔或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function fieldMatchAnswer(v: BandValue, all: Answers): EngineValue {
  const b = band(v)
  if (all.canadaEduBand === 1 && b !== 0 && b !== UNSURE_BAND) {
    return b === 1
  }
  return undefined
}

/**
 * 学历所在省(只对有加拿大学历的人传)。
 *
 * @param v 省码。
 * @param all 全卷答案。
 * @returns 省码或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function eduProvAnswer(v: BandValue, all: Answers): EngineValue {
  if (all.canadaEduBand === 1 && typeof v === 'string' && v !== '') {
    return v
  }
  return undefined
}

/**
 * 学制年数档 → 整年数(只对有加拿大学历的人传;不清楚不传)。
 *
 * @param v 档位。
 * @param all 全卷答案。
 * @returns 整年数或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function eduYearsAnswer(v: BandValue, all: Answers): EngineValue {
  const b = band(v)
  if (all.canadaEduBand === 1 && b !== 0 && b !== UNSURE_BAND) {
    return EDU_YEARS[b]
  }
  return undefined
}

/**
 * 法语档 → 「够不够 NCLC 5」:≥5 为 true;不会/NCLC 4 为 false;不清楚不传(判不了)。
 *
 * @param v 档位。
 * @returns 布尔或不传。
 */
function frenchAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b === UNSURE_BAND) {
    return undefined
  }
  if (b >= 1) {
    return NCLC[b] >= 5
  }
  return undefined
}

/**
 * CRS 档 → 分数下界(「没算过」不传)。
 *
 * @param v 档位。
 * @returns 分数或不传。
 */
function crsAnswer(v: BandValue): EngineValue {
  return CRS[band(v)] || undefined
}

/**
 * 签证剩余档 → 月数。境外不传:没有加拿大签证,拿档位造时间窗=编数。
 *
 * @param v 档位。
 * @param all 全卷答案。
 * @returns 月数或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function pgwpAnswer(v: BandValue, all: Answers): EngineValue {
  if (all.status === 'overseas') {
    return undefined
  }
  return PGWP[band(v)] || undefined
}

/**
 * 课程时长档 → 月数下界(0 档不传;「不到 8 个月」给 4 只为让引擎判「不足 8 个月无 PGWP」)。
 *
 * @param v 档位。
 * @returns 月数或不传。
 */
function studyMonthsAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0) {
    return STUDY_MONTHS[b]
  }
  return undefined
}

/**
 * 课程层级档 → 层级码(0 档不传)。
 *
 * @param v 档位。
 * @returns 层级码或不传。
 */
function studyLevelAnswer(v: BandValue): EngineValue {
  return STUDY_LEVEL[band(v)] || undefined
}

/**
 * 装配好的题库(数据半 FIELD_SPECS + 行为半接回来)。
 * 首次调用装配一次并记进 CACHE —— 纯数据加固定函数引用,进程内不会变。
 *
 * @returns 字段名 → 完整定义。
 */
export function getFields(): FieldMap {
  const hit = CACHE.fields
  if (hit != null) {
    return hit
  }
  const out: FieldMap = {}
  for (const key of Object.keys(FIELD_SPECS)) {
    const spec = FIELD_SPECS[key as keyof typeof FIELD_SPECS]
    const beh = fieldBehaviorOf(key)
    out[key] = {
      engineKey: spec.engineKey,
      unlocks: spec.unlocks,
      tier: spec.tier as Tier,
      q: { title: spec.q.title, choices: spec.q.choices, choiceVisible: beh.choiceVisible },
      toAnswer: beh.toAnswer,
      visible: beh.visible,
    }
  }
  CACHE.fields = out
  return out
}

/**
 * 一个字段的行为半:换算 / 题级显隐 / 选项过滤。
 * 用 switch 而不是一张表:表就是 functions.ts 里的变量(那归 constants/variables),
 * 而这三样都是函数引用,constants 装不下(它只到 JSON)。
 *
 * @param key 字段名。
 * @returns 该字段的三个行为(没有的给 null)。
 */
function fieldBehaviorOf(key: string): FieldBehavior {
  switch (key) {
    case 'status': return { toAnswer: statusAnswer, visible: null, choiceVisible: null }
    case 'permitBand': return { toAnswer: permitAnswer, visible: inCanada, choiceVisible: null }
    case 'resProv': return { toAnswer: resProvAnswer, visible: inCanada, choiceVisible: null }
    case 'eduBand': return { toAnswer: eduAnswer, visible: null, choiceVisible: null }
    case 'ageBand': return { toAnswer: ageAnswer, visible: null, choiceVisible: null }
    case 'totalExpBand': return { toAnswer: totalExpAnswer, visible: null, choiceVisible: null }
    case 'clbBand': return { toAnswer: clbAnswer, visible: null, choiceVisible: null }
    case 'expBand': return { toAnswer: expAnswer, visible: null, choiceVisible: expChoiceVisible }
    case 'provBand': return { toAnswer: provAnswer, visible: null, choiceVisible: null }
    case 'goalBand': return { toAnswer: goalAnswer, visible: null, choiceVisible: null }
    case 'offerBand': return { toAnswer: offerAnswer, visible: null, choiceVisible: null }
    case 'canadaEduBand': return { toAnswer: canadaEduAnswer, visible: null, choiceVisible: null }
    case 'fieldMatchBand': return { toAnswer: fieldMatchAnswer, visible: hasCanadaEdu, choiceVisible: null }
    case 'eduProv': return { toAnswer: eduProvAnswer, visible: hasCanadaEdu, choiceVisible: null }
    case 'eduYearsBand': return { toAnswer: eduYearsAnswer, visible: hasCanadaEdu, choiceVisible: null }
    case 'frenchBand': return { toAnswer: frenchAnswer, visible: null, choiceVisible: null }
    case 'crsBand': return { toAnswer: crsAnswer, visible: null, choiceVisible: null }
    case 'pgwpBand': return { toAnswer: pgwpAnswer, visible: null, choiceVisible: null }
    case 'studyMonthsBand': return { toAnswer: studyMonthsAnswer, visible: null, choiceVisible: null }
    case 'studyLevelBand': return { toAnswer: studyLevelAnswer, visible: null, choiceVisible: null }
  }
  return { toAnswer: null, visible: null, choiceVisible: null }
}


/**
 * 目标省档 → 省码组(与 bandFromProvs 互推:三问存省份数组、答题存档位,
 * 两种表示必须互推,否则「问过的不再问」是假的)。
 *
 * @param b 档位。
 * @returns 省码组。
 */
export function provsFromBand(b: number): ProvList {
  const hit = PROVS[b]
  if (hit != null) {
    return hit
  }
  return []
}

/**
 * 省码组 → 目标省档(provsFromBand 的反向)。
 *
 * @param provs 省码组;没答过是 undefined。
 * @returns 档位(空=0,单 BC=1,单 ON=2,其余=4 不限省)。
 */
export function bandFromProvs(provs: MaybeProvList): number {
  if (provs == null || provs.length === 0) {
    return 0
  }
  if (provs.length === 1 && provs[0] === 'BC') {
    return 1
  }
  if (provs.length === 1 && provs[0] === 'ON') {
    return 2
  }
  return 4
}

/**
 * 任意来源的档(内存/旧档/服务端)→ 全字段对齐的 Answers。逐字段重建的清单必须与 Answers
 * 全量对齐(2026-08-15 Frank 实拍「学历下面的内容填完一刷新就没了」:studyMonths/studyLevel
 * 写入一直正常,是**读取路径漏了字段** → 每次刷新被归零)。
 * 三处 v2 迁移都在这(值域重叠的靠标记区分,不靠值本身猜 —— 见 FRENCH_V2_MAP 的注释)。
 *
 * @param cur 原料档。
 * @returns 洗净的全卷。
 */
export function normalize(cur: RawAnswersSource): Answers {
  const raw = cur as RawDoc
  let clbBand: number
  if (raw.bandsV2 === true) {
    clbBand = num(raw.clbBand)
  } else {
    let mapped = CLB_V2_MAP[num(raw.clbBand)]
    if (mapped == null) {
      mapped = 0
    }
    clbBand = mapped
  }
  let totalExpBand: number
  if (raw.bandsV2 === true) {
    totalExpBand = num(raw.totalExpBand)
  } else {
    totalExpBand = totalV2(num(raw.totalExpBand))
  }
  let frenchBand: number
  if (raw.frenchV2 === true) {
    frenchBand = num(raw.frenchBand)
  } else {
    let mapped = FRENCH_V2_MAP[num(raw.frenchBand)]
    if (mapped == null) {
      mapped = 0
    }
    frenchBand = mapped
  }
  const out: Answers = {
    status: str(raw.status), nocs: arr(raw.nocs), provs: arr(raw.provs),
    clbBand: clbBand, bandsV2: true,
    expBand: num(raw.expBand), provBand: num(raw.provBand),
    crsBand: num(raw.crsBand), pgwpBand: num(raw.pgwpBand),
    eduBand: num(raw.eduBand), ageBand: num(raw.ageBand),
    totalExpBand: totalExpBand,
    offerBand: num(raw.offerBand), goalBand: num(raw.goalBand), canadaEduBand: num(raw.canadaEduBand),
    permitBand: num(raw.permitBand), resProv: str(raw.resProv),
    fieldMatchBand: num(raw.fieldMatchBand), eduProv: str(raw.eduProv), eduYearsBand: num(raw.eduYearsBand),
    frenchBand: frenchBand, frenchV2: true,
    studyMonthsBand: num(raw.studyMonthsBand), studyLevelBand: num(raw.studyLevelBand),
  }
  if (raw.done === true) {
    out.done = true
  }
  if (typeof raw.provsAny === 'boolean') {
    out.provsAny = raw.provsAny
  }
  return out
}

/**
 * 总经验档迁移(9=不清楚原样保留,超界落 0)。
 *
 * @param b 旧档。
 * @returns 新档。
 */
export function totalV2(b: number): number {
  if (b === 9) {
    return 9
  }
  const hit = TOTAL_V2_MAP[b]
  if (hit != null) {
    return hit
  }
  return 0
}

/**
 * 任意来源的分值卡档 → 全字段对齐的 ScoreAnswers(可选格只在原档真有时带上)。
 * 体内四个 `as` 是跨边界断言:ticks/rowAnswers/extraAnswered/profile 的值形状由写入端
 * (本门面)保证,读回来只收「是对象」这一层 —— 逐键再验类型就是把校验做两遍。
 *
 * @param cur 原料档。
 * @returns 洗净的分值卡档。
 */
export function normalizeScore(cur: RawScoreSource): ScoreAnswers {
  if (cur == null || typeof cur !== 'object') {
    return { ticks: {}, rowAnswers: {}, extraAnswered: {}, profile: {} }
  }
  const raw = cur as RawDoc
  const out: ScoreAnswers = {
    ticks: rec(raw.ticks) as Record<string, boolean>,
    rowAnswers: rec(raw.rowAnswers) as Record<string, number>,
    extraAnswered: rec(raw.extraAnswered) as Record<string, boolean>,
    profile: rec(raw.profile) as ScoreAnswers['profile'],
  }
  if (typeof raw.hasOffer === 'boolean') {
    out.hasOffer = raw.hasOffer
  }
  if (typeof raw.wage === 'number' && Number.isFinite(raw.wage)) {
    out.wage = raw.wage
  }
  if (typeof raw.areaI === 'number' && Number.isFinite(raw.areaI)) {
    out.areaI = raw.areaI
  }
  return out
}

/**
 * 档位 → /api/report 的 answers。换算全在上面的字段库里,这里只做遍历与职业。
 * `noc` 保留单值是为了老前端与 advisor 不受影响(2026-08-02),引擎按 `nocs` 一个职业一份报告 ——
 * 两个职业的清单命中/门槛/抽选线不能合起来算。
 * 新问卷直接多选具体省份;provBand 只保留给旧答案和其它页面兼容,不能反过来把精确数组覆盖掉。
 *
 * 体内的 `as` 是跨边界断言:字段名就是 Answers 的键(字段库与 Answers 同源维护),
 * 值域收窄到题的两种存值。
 *
 * @param a 全卷。
 * @returns 引擎入参对象(undefined 的键被 JSON.stringify 抹掉 = 不传)。
 */
export function toEngineAnswers(a: Answers): EngineAnswers {
  const out: EngineAnswers = { noc: a.nocs[0] || '', nocs: a.nocs }
  for (const [name, def] of Object.entries(getFields())) {
    const cell = a[name as keyof Answers] as string | number
    let v: EngineValue = cell
    if (def.toAnswer != null) {
      v = def.toAnswer(cell, a)
    }
    if (typeof v !== 'undefined') {
      let key = name
      if (def.engineKey != null) {
        key = def.engineKey
      }
      out[key] = v
    }
  }
  if (a.provs.length > 0) {
    out.targetProvinces = a.provs
  }
  return out
}

// =========================================================================
// SWR 缓存件(2026-08-23 批②并入自 routes.ts;判定合一批3 的冷启动预热背景见
// getTopNocsCached 的 JSDoc,取数走注入)
// =========================================================================

/**
 * 事实卡后台刷成功的落格(then 传具名函数;闭包住 noc)。
 *
 * @param noc 职业码。
 * @returns 落格函数。
 */
export function makeFactsStore(noc: string): FactsStoreFn {
  return function factsStore(facts) {
    if (CACHE.factsBy.size < FACTS_CACHE_MAX) {
      CACHE.factsBy.set(noc, { at: Date.now(), facts: facts })
    }
  }
}

/**
 * 事实卡后台刷失败的收尾:旧格已删,这次不落,下次请求重查(与热门清单的 makeUnflag
 * 同款静默口径 —— 后台刷失败无损可见行为)。
 *
 * @param _e 捕到的错。
 * @returns 无。
 */
export function swallowFactsError(_e: Error): void {
  return
}

/**
 * 热门职业清单,SWR:命中(含过期)立即返回;过期后台刷。只有整个进程生涯的第一请求真等查询
 * (判定合一批3 前置。为什么在本域:route 的模块级 Map 只有 route 自己够得着,instrumentation
 * 预热填不进去 —— 冷启动后的第一位访客实测吃 8.4s(08-10 生产探针),预热必须和请求路径写
 * 同一份缓存)。
 *
 * 2026-08-23 批②注入化:取数函数(jobs 的 loadTopNocs)由调用方注进来 ——
 * functions 不借 server 门,门面收单参,route 与 instrumentation 两个调用点同步换形。
 *
 * @param input 连接、条数与注入的取数函数。
 * @returns 热门职业清单(可能是过期缓存,后台刷新中)。
 */
export async function getTopNocsCached(input: TopCachedIn): TopOut {
  const n = input.n
  const hit = CACHE.top.get(n)
  if (hit != null) {
    if (Date.now() - hit.at >= TTL && hit.refreshing === false) {
      hit.refreshing = true
      input.load({ db: input.db, limit: n }).then(makeStore(n)).catch(makeUnflag(n))
    }
    return hit.rows
  }
  const inFlight = CACHE.topPending.get(n)
  if (inFlight != null) {
    return inFlight
  }
  const task = input.load({ db: input.db, limit: n }).then(makeFirstStore(n)).finally(makeDrop(n))
  CACHE.topPending.set(n, task)
  return task
}

/**
 * 后台刷成功的落格(then 传具名函数;闭包住条数)。
 *
 * @param n 条数。
 * @returns 落格函数。
 */
function makeStore(n: number): StoreFn {
  return function store(rows: TopRows): void {
    CACHE.top.set(n, { at: Date.now(), rows: rows, refreshing: false })
  }
}

/**
 * 后台刷失败的收尾:旧值继续顶,下次再试(闭包住条数)。
 *
 * @param n 条数。
 * @returns 收尾函数。
 */
function makeUnflag(n: number): UnflagFn {
  return function unflag(_e: Error): void {
    const hit = CACHE.top.get(n)
    if (hit != null) {
      hit.refreshing = false
    }
  }
}

/**
 * 首查成功的落格 + 透传(闭包住条数)。
 *
 * @param n 条数。
 * @returns 落格函数。
 */
function makeFirstStore(n: number): FirstStoreFn {
  return function firstStore(rows: TopRows): TopRows {
    CACHE.top.set(n, { at: Date.now(), rows: rows, refreshing: false })
    return rows
  }
}

/**
 * 首查收尾:清在途标记(成败都清;闭包住条数)。
 *
 * @param n 条数。
 * @returns 收尾函数。
 */
function makeDrop(n: number): DropFn {
  return function drop(): void {
    CACHE.topPending.delete(n)
  }
}
