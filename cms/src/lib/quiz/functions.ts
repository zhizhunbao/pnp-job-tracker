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
 */
import { fetchTopNocs } from '../jobs/server'
import type { Db } from '../db'
import {
  ANSWERS_KEY, CLB_V2_MAP, CRED_INCLUDE, DECISIONS, EMPTY, EV_PAGEHIDE, EV_VISIBILITY, JSON_MIME, LI_RE,
  LI_SET_OFF, LI_SET_ON, META_KEY, METHOD_PUT, OLD_PR, OLD_QUIZ, SCORE_ANSWERS_KEY, SCORE_EMPTY, STAGE_BASIC,
  STATE_HIDDEN, TIER_FREE, TTL, URL_ANSWERS,
} from './constants'
import { FIELDS, arr, bandFromProvs, normalize, normalizeScore, num, provsFromBand, str, totalV2 } from './rows'
import { CACHE } from './variables'
import type {
  Answers, AnswersPatch, DropFn, FieldNames, FirstStoreFn, MaybeAnswers, MaybeRawDoc, NameFilter, PulledOut,
  PushedOut, RawCell, RawDoc, RawText, ScoreAnswers, Stage, StoreFn, TopOut, TopRows, UnflagFn,
} from './types'

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
  let status = ''
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
  let before = ''
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
      method: METHOD_PUT, credentials: CRED_INCLUDE, headers: { 'Content-Type': JSON_MIME },
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
    const def = FIELDS[n]
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
  const def = FIELDS[names[0]]
  if (def == null) {
    return false
  }
  return def.tier === TIER_FREE
}

/**
 * 热门职业清单,SWR:命中(含过期)立即返回;过期后台刷。只有整个进程生涯的第一请求真等查询
 * (判定合一批3 前置。为什么在本域:route 的模块级 Map 只有 route 自己够得着,instrumentation
 * 预热填不进去 —— 冷启动后的第一位访客实测吃 8.4s(08-10 生产探针),预热必须和请求路径写
 * 同一份缓存)。
 *
 * @param pool 能查的连接(池由调用方注进来)。
 * @param n 清单条数。
 * @returns 热门职业清单(可能是过期缓存,后台刷新中)。
 */
// eslint-disable-next-line local/one-parameter -- 既有门面:route 与 instrumentation 两个调用点的形态(连接 + 条数)定死在此
export async function getTopNocsCached(pool: Db, n: number): TopOut {
  const hit = CACHE.top.get(n)
  if (hit != null) {
    if (Date.now() - hit.at >= TTL && hit.refreshing === false) {
      hit.refreshing = true
      fetchTopNocs({ db: pool, limit: n }).then(makeStore(n)).catch(makeUnflag(n))
    }
    return hit.rows
  }
  const inFlight = CACHE.topPending.get(n)
  if (inFlight != null) {
    return inFlight
  }
  const task = fetchTopNocs({ db: pool, limit: n }).then(makeFirstStore(n)).finally(makeDrop(n))
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
