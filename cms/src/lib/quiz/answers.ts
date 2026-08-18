// 答案存储 = 一个 key、一个门面(设计:docs/design/统一题库与付费面-20260731.md §3/§6)。
// 收敛前:处境与目标省被 jobs_quiz_v1(三问)和 plan_pr_v1(拿 PR 基本题)各存一份、各问一遍 ——
// 重复的根不是 UI,是没有字段单一来源。这里是唯一的读写口:页面不再直接碰 localStorage。
// 老答案是用户唯一的资产,丢了等于让他重答 —— 所以首次读盘时把两个旧 key 合并进新 key 再删旧 key。
import { FIELDS, bandFromProvs, provsFromBand } from './fields'
import type { SelfProfile } from '../pnpSelfScore'

export const ANSWERS_KEY = 'o2p_answers_v1'
const OLD_QUIZ = 'jobs_quiz_v1'      // 三问:{ status, nocs, provs, done }
const OLD_PR = 'plan_pr_v1'          // 拿 PR 基本/探索题:六个档位

export type Answers = {
  status: string
  nocs: string[]
  provs: string[]
  done?: boolean                     // 三问答完过(职位板据此判断还弹不弹)
  clbBand: number
  expBand: number
  provBand: number
  crsBand: number
  pgwpBand: number
  // 题库扩充 20260802:官方分值表本来就要的三样(先前引擎写死 → 每个省都少算十几分)
  eduBand: number
  ageBand: number
  totalExpBand: number
  offerBand: number       // 已有字段(卡③专属题),类型里先前漏声明
  canadaEduBand: number   // 有没有加拿大学历(2026-08-12 门槛清单三类闸之一)
  // statusInCanada 拆闸(2026-08-15):持的许可档 + 现居省(省码字符串,'TERR'=领地)。
  // 只对境内处境显示(fields.ts visible),境外用户这两格保持空
  permitBand: number
  resProv: string
  // 专业对口拆闸(2026-08-15):对口档 + 加拿大学历所在省(省码,'TERR'=领地)。
  // 只对「有加拿大学历」的人显示(fields.ts visible)
  fieldMatchBand: number
  eduProv: string
  /** 法语是否达 NCLC 5 四项(2026-08-15,FCIP 的定义性门槛;不由 clbBand 折算) */
  frenchBand: number
  /** 法语题已是档位版(2026-08-16)。没有这个标记的是旧「是/否」答案,读时迁移 */
  frenchV2?: boolean
  provsAny?: boolean      // 目标省「还不确定」——**答过了**,只是不限省(与「没答」不同)
  /** 档位 v2 标记(2026-08-13/14 语言+经验合一):clbBand 从区间档改成精确档(2=CLB4…8=CLB10+),
   *  totalExpBand 从区间档改成整年档(3=1年…7=5年+,9=不清楚不变)。没打标的旧答案读取时按
   *  旧引擎月数/下界迁移 —— 同一个 band 数字两套语义,不迁移就是静默改答案。 */
  bandsV2?: boolean
  // B1-4 PGWP(20260803,拿 PR 探索批 2):计划读的课程时长档 + 层级档
  studyMonthsBand: number
  studyLevelBand: number
}

// 空答案(页面初始 state 也用它:再抄一份就会漏掉新字段)
export const EMPTY: Answers = {
  status: '', nocs: [], provs: [],
  clbBand: 0, expBand: 0, provBand: 0, crsBand: 0, pgwpBand: 0,
  eduBand: 0, ageBand: 0, totalExpBand: 0, offerBand: 0, canadaEduBand: 0,
  permitBand: 0, resProv: '', fieldMatchBand: 0, eduProv: '', frenchBand: 0,
  studyMonthsBand: 0, studyLevelBand: 0, bandsV2: true,
}

// 旧区间档 → 新精确档(index=旧 band):与旧 toAnswer 的引擎数字逐值一致(CLB=[0,0,4,6,8,10]、
// TOTAL_EXP=[0,0,6,24,48,60] 月),判定核收到的数字前后不变 —— 迁移只影响「格子里显示哪一档」
// 与「还要不要再追问精确题」。总经验 9(不清楚)原样保留。
const CLB_V2_MAP = [0, 1, 2, 4, 6, 8]
// 法语旧答案(1=是 / 2=否 / 9=不清楚)→ 新档位(3=NCLC5 / 1=没到 / 9=不清楚)
const FRENCH_V2_MAP: Record<number, number> = { 0: 0, 1: 3, 2: 1, 9: 9 }
const TOTAL_V2_MAP = [0, 1, 2, 4, 6, 7]
const totalV2 = (b: number) => (b === 9 ? 9 : TOTAL_V2_MAP[b] ?? 0)

const parse = (s: string | null): any => { try { return s ? JSON.parse(s) : null } catch { return null } }
const num = (v: any): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const arr = (v: any): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])

// 迁移:两个旧 key → 新 key。处境两处都有 → 以答得更细的拿 PR 那份优先;
// 目标省两种表示互补(三问存省份数组、答题存档位),缺哪边就从另一边推出来。
function migrate(): Answers | null {
  if (typeof localStorage === 'undefined') return null
  const q = parse(localStorage.getItem(OLD_QUIZ))
  const p = parse(localStorage.getItem(OLD_PR))
  if (!q && !p) return null
  const provs = arr(q?.provs)
  const provBand = num(p?.provBand) || bandFromProvs(provs)
  const merged: Answers = {
    ...EMPTY,
    status: (typeof p?.status === 'string' && p.status) || (typeof q?.status === 'string' && q.status) || '',
    nocs: arr(q?.nocs),
    provs: provs.length ? provs : provsFromBand(provBand),
    ...(q?.done ? { done: true } : {}),
    clbBand: CLB_V2_MAP[num(p?.clbBand)] ?? 0, expBand: num(p?.expBand), provBand,
    totalExpBand: totalV2(num(p?.totalExpBand)),
    crsBand: num(p?.crsBand), pgwpBand: num(p?.pgwpBand),
  }
  try { localStorage.removeItem(OLD_QUIZ); localStorage.removeItem(OLD_PR) } catch { /* ignore */ }
  return merged
}

// 运行态住内存(2026-08-16 Frank「用缓存就是这么麻烦」——**服务端 users.answers 是唯一真相**)。
// 先前本地一份、服务端一份,靠 updatedAt 比新旧裁决,出问题时说不清是哪份在起作用
// (Frank 实撞:填了时薪刷新回 $0)。现在浏览器里只留一份**待搬家的旧档**,搬完即删。
let mem: Answers | null = null
let memScore: ScoreAnswers | null = null

/** 丢掉手上这份运行态。**换账号必须调** —— 内存是模块级的,不清就会把上一个人的答案
 *  带给下一个登录的人(先前 localStorage 时代同病,只是没人注意)。测试也用它隔离用例。 */
export function resetAnswersMemory(): void { mem = null; memScore = null; dirty = false; retryN = 0; hydrated = false }

function save(a: Answers): void {
  const before = mem ? JSON.stringify(normalize(mem)) : ''
  mem = a
  if (JSON.stringify(normalize(a)) !== before) touched()      // 语义真变了才排同步
}

function normalize(cur: any): Answers {
  return {
    ...EMPTY, ...cur,
    nocs: arr(cur.nocs), provs: arr(cur.provs),
    clbBand: cur.bandsV2 ? num(cur.clbBand) : (CLB_V2_MAP[num(cur.clbBand)] ?? 0), bandsV2: true,
    expBand: num(cur.expBand), provBand: num(cur.provBand),
    crsBand: num(cur.crsBand), pgwpBand: num(cur.pgwpBand),
    eduBand: num(cur.eduBand), ageBand: num(cur.ageBand),
    totalExpBand: cur.bandsV2 ? num(cur.totalExpBand) : totalV2(num(cur.totalExpBand)),
    offerBand: num(cur.offerBand), canadaEduBand: num(cur.canadaEduBand),
    permitBand: num(cur.permitBand), resProv: typeof cur.resProv === 'string' ? cur.resProv : '',
    fieldMatchBand: num(cur.fieldMatchBand), eduProv: typeof cur.eduProv === 'string' ? cur.eduProv : '',
    // 法语档位化迁移:旧 1(是,四项 NCLC 5+)→ 新 3(NCLC 5);旧 2(不会/没到)→ 新 1;9 不清楚不变。
    // 新旧值域重叠(旧 1 = 是,新 1 = 不会),所以只能靠 frenchV2 标记区分,不能靠值本身猜
    frenchBand: cur.frenchV2 ? num(cur.frenchBand) : FRENCH_V2_MAP[num(cur.frenchBand)] ?? 0,
    frenchV2: true,
    // 2026-08-15 Frank 实拍「学历下面的内容填完一刷新就没了」:这俩跟进题(就读时长/层级)
    // 写入一直正常,是**读取路径漏了字段** → 每次刷新被归零。逐字段重建的清单必须与 Answers 全量对齐
    studyMonthsBand: num(cur.studyMonthsBand), studyLevelBand: num(cur.studyLevelBand),
  }
}

export function readAnswers(): Answers {
  if (mem) return normalize(mem)
  // 还没拉过服务端档 → 看浏览器里有没有待搬家的旧档(老用户平滑过渡;搬家在 pullAndMerge 里做)
  const legacy = typeof localStorage !== 'undefined' ? parse(localStorage.getItem(ANSWERS_KEY)) : null
  if (legacy) return normalize(legacy)
  const old = typeof localStorage !== 'undefined' ? migrate() : null
  return old ? normalize(old) : { ...EMPTY }
}

// 写入即同步目标省的两种表示 —— 只写一边会让另一个入口重新问一遍(那正是收敛掉的病)
export function writeAnswers(patch: Partial<Answers>): Answers {
  const next: Answers = { ...readAnswers(), ...patch }
  if (patch.provBand != null && patch.provs == null) next.provs = provsFromBand(patch.provBand)
  if (patch.provs != null && patch.provBand == null) next.provBand = bandFromProvs(patch.provs)
  save(next)
  return next
}

// 重置(Frank 2026-07-31「答题给一个重置的功能」):把这份答案整份丢掉,回到从没答过的状态。
// 连 done 一起清 —— 留着它职位板就不再问三问了,那不叫重置。
export function clearAnswers(): Answers {
  mem = { ...EMPTY }
  memScore = { ...SCORE_EMPTY }
  dropLegacy()
  // 重置立即推空档,不走防抖 —— 换页就丢的话,下次拉档旧答案又回来了(重置=没重置)
  if (loggedIn === true) void pushToServer()
  return { ...EMPTY }
}

// ── 分值卡(估分段)答案(2026-08-15 Frank「学历以下的字段都有这个问题」)────────────────
// 基础 8 题一直走上面的 ANSWERS_KEY,而分值卡的勾选/逐题答案只活在组件 state → 刷新全丢。
// 同一原则:这里是唯一读写口。键是 `${prov}:${factor}` / tick 的 `${factor}:${seq}`,
// 都是用户自身条件(外省经历/亲属/本省学历…),跨岗位跨页面通用,与具体职位无关。
const SCORE_ANSWERS_KEY = 'o2p_score_answers_v1'
export type ScoreAnswers = {
  ticks: Record<string, boolean>
  rowAnswers: Record<string, number>
  extraAnswered: Record<string, boolean>
  /** 「你的条件」逐项的**值**(学历/年龄/同职业经验/更早经验/第二语言分…)。
   *  2026-08-15 Frank 实拍「选的是本科一刷新就变成高中」:extraAnswered 只记了「答过」,
   *  值却只活在组件 state → 刷新回 DEFAULT_PROFILE(edu='highschool')还顶着已答标记。
   *  值必须与标记同存同取,缺一样都是在替他编答案。 */
  profile: Partial<SelfProfile>
  /** 基础卷没答 offer 时分值卡自问的那道;基础卷答过(ctx.hasOffer 有值)以基础卷为准 */
  hasOffer?: boolean
  /** 时薪(加元/小时)与 BC 工作地区档。2026-08-16 补:先前只活在分值卡的 state 里,
   *  刷新即丢,更谈不上上行 —— 而 BC SIRS 200 分里这两样占 80 分,服务端拿不到就整省算不出。 */
  wage?: number
  areaI?: number
}
const SCORE_EMPTY: ScoreAnswers = { ticks: {}, rowAnswers: {}, extraAnswered: {}, profile: {} }

function normalizeScore(cur: any): ScoreAnswers {
  if (!cur || typeof cur !== 'object') return { ...SCORE_EMPTY }
  const rec = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, never>) : {})
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
  return {
    ticks: rec(cur.ticks), rowAnswers: rec(cur.rowAnswers), extraAnswered: rec(cur.extraAnswered),
    profile: rec(cur.profile) as Partial<SelfProfile>,
    ...(typeof cur.hasOffer === 'boolean' ? { hasOffer: cur.hasOffer } : {}),
    ...(n(cur.wage) !== undefined ? { wage: n(cur.wage) } : {}),
    ...(n(cur.areaI) !== undefined ? { areaI: n(cur.areaI) } : {}),
  }
}

export function readScoreAnswers(): ScoreAnswers {
  if (memScore) return normalizeScore(memScore)
  const legacy = typeof localStorage !== 'undefined' ? parse(localStorage.getItem(SCORE_ANSWERS_KEY)) : null
  return normalizeScore(legacy)
}

export function writeScoreAnswers(a: ScoreAnswers): void {
  const before = JSON.stringify(readScoreAnswers())
  memScore = a
  if (JSON.stringify(normalizeScore(a)) !== before) touched()  // 语义真变了才排同步
}

// 答过三问没有(职位板判断弹不弹、拿 PR 判断要不要拉起选职业)
export const answeredBasics = (a: Answers): boolean => Boolean(a.done || a.status || a.nocs.length || a.provs.length)

// 档位 → /api/report 的 answers。换算全在字段库的 toAnswer 里,这里只做遍历与职业。
export function toEngineAnswers(a: Answers): Record<string, unknown> {
  // 选了几个职业就报几个(2026-08-02):`noc` 保留单值是为了老前端与 advisor 不受影响,
  // 引擎按 `nocs` 一个职业一份报告 —— 两个职业的清单命中/门槛/抽选线不能合起来算。
  const out: Record<string, unknown> = { noc: a.nocs[0] || '', nocs: a.nocs }
  for (const [name, def] of Object.entries(FIELDS)) {
    const v = def.toAnswer ? def.toAnswer((a as any)[name], a) : (a as any)[name]
    if (v !== undefined) out[def.engineKey ?? name] = v
  }
  // 新问卷直接多选具体省份；provBand 只保留给旧答案和其它页面兼容，不能反过来把精确数组覆盖掉。
  if (a.provs.length) out.targetProvinces = a.provs
  return out
}

// ── 服务端答案档同步 ────────────────────────────────────────────────────────
// 2026-08-16 重做(Frank「用缓存就是这么麻烦」):**服务端 users.answers 是唯一真相**,
// 浏览器只剩内存运行态。先前是本地一份、服务端一份靠 updatedAt 比新旧,合并规则本身成了 bug 源。
//
// 丢答案的两个窗口(先前靠 localStorage 兜)在这里正面堵死:
//   ① PUT 失败 → 退避重试(2/6/18s),不再「等用户下次改动」
//   ② 防抖窗口内离开页面 → pagehide/隐藏时 sendBeacon 强推(与埋点同一招,页面跳走也送得出去)
// 未登录不发请求(答题必须先登录,注册闸 2026-08-14 起就在);登录成功那一刻若内存里已有答案,
// 拉档时发现服务端空 → 立即推上去,注册闸承诺的「答案自动存档」照旧兑现。

// #311 登录迹象:payload-token 是 httpOnly,前端读不到 —— 由同步这层维护一枚 JS 可读的伴随 cookie。
// 置位 = 任一同步请求 200;清除 = 吃到 401。没有迹象 → 挂载不发请求(匿名零 401)。
const LI_COOKIE = 'o2p_li'               // 改名要连 api/auth/google/callback 的 Set-Cookie 一起改
const hasLoginTrace = (): boolean => {
  try { return typeof document !== 'undefined' && new RegExp(`(?:^|;\s*)${LI_COOKIE}=1`).test(document.cookie) } catch { return false }
}
const setLoginTrace = (on: boolean): void => {
  try { document.cookie = `${LI_COOKIE}=${on ? '1' : ''}; path=/; max-age=${on ? 31536000 : 0}; samesite=lax` } catch { /* ignore */ }
}

let loggedIn: boolean | null = null      // null=登录态未知(push 不发);拉档探明后才开闸
let syncTimer: ReturnType<typeof setTimeout> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryN = 0
let dirty = false                        // 有改动还没推成功 —— 离开页面时靠它决定要不要 beacon
// 🔴 拉过服务端档没有。**没拉过就一个字节都不许推** —— 内存此刻是空的,推上去等于拿空档
// 覆盖用户真答过的整份档案(2026-08-16 实撞:Frank 刷新后页面 0/11,而库里 845 字节完好,
// 差一步就被空档盖掉)。同理没拉过档时不许让「挂载写默认值」算成用户改动。
let hydrated = false

/** 浏览器里的旧档:搬完家就删,此后一个字节都不再往里写 */
function dropLegacy(): void {
  try {
    localStorage.removeItem(ANSWERS_KEY); localStorage.removeItem(SCORE_ANSWERS_KEY)
    localStorage.removeItem('o2p_answers_meta_v1')
  } catch { /* ignore */ }
}

const payload = () => JSON.stringify({ basic: readAnswers(), score: readScoreAnswers() })

// 写档触点:排一次短防抖(连点选项时不至于每答一下发一次),并挂上离开页面的兜底
function touched(): void {
  if (!hydrated) return                  // 还没拉过档:这不是用户的改动,是页面在自我初始化
  dirty = true
  if (loggedIn !== true || typeof window === 'undefined') return
  armLeaveGuard()
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => { syncTimer = null; void pushToServer() }, 800)
}

let guarded = false
function armLeaveGuard(): void {
  if (guarded || typeof window === 'undefined') return
  guarded = true
  const flush = () => {
    if (!dirty || loggedIn !== true) return
    // sendBeacon 只能 POST —— 端点同时收 PUT 与 POST(见 api/account/answers)
    try { navigator.sendBeacon?.('/api/account/answers', new Blob([payload()], { type: 'application/json' })) } catch { /* ignore */ }
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
}

async function pushToServer(): Promise<void> {
  if (!hasLoginTrace()) return
  if (!hydrated) return                  // 见 hydrated 处的红字:没拉过档不许推
  try {
    const r = await fetch('/api/account/answers', {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: payload(),
    })
    if (r.status === 401) { loggedIn = false; setLoginTrace(false); dirty = false; return }
    if (!r.ok) { scheduleRetry(); return }
    loggedIn = true
    setLoginTrace(true)
    dirty = false
    retryN = 0
    dropLegacy()                          // 服务端已收下 → 浏览器里那份旧档再无用处
  } catch { scheduleRetry() }
}

/** 退避重试:2s → 6s → 18s,三次不成就等下次改动(再拖下去也多半是会话没了) */
function scheduleRetry(): void {
  if (retryN >= 3 || retryTimer) return
  const wait = 2000 * 3 ** retryN
  retryN += 1
  retryTimer = setTimeout(() => { retryTimer = null; void pushToServer() }, wait)
}

/** 拉服务端档(登录成功回调、消费页挂载时调)。返回 true = 内存被服务端档换过,调用方需重建 state。
 *  不再「合并」——服务端就是真相;只有两种例外会反向推:服务端空档、或本地还有没搬家的旧档。
 *  afterLogin=true 给 AuthForm 登录成功后那一调:此刻迹象 cookie 还没置位,必须绕过迹象闸。 */
export async function pullAndMerge(afterLogin = false): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!afterLogin && !hasLoginTrace()) return false
  try {
    const r = await fetch('/api/account/answers', { credentials: 'include' })
    if (r.status === 401) { loggedIn = false; setLoginTrace(false); return false }
    if (!r.ok) return false
    loggedIn = true
    setLoginTrace(true)
    armLeaveGuard()
    const doc = (await r.json().catch(() => null))?.answers
    const serverHas = !!(doc && typeof doc === 'object' && (doc.basic || doc.score))
    // 服务端还没有档:把手上这份(内存里刚答的 / 浏览器里待搬家的旧档)立刻送上去 ——
    // 注册闸承诺「注册后答案自动存档」,等防抖的话跳页就丢
    if (!serverHas) {
      const local = readAnswers(); const localScore = readScoreAnswers()
      if (answeredBasics(local) || Object.keys(localScore.extraAnswered).length) {
        mem = local; memScore = localScore
        hydrated = true                  // 手上这份就是真相 → 开闸,把它送上去
        await pushToServer()
      } else {
        hydrated = true
      }
      return false
    }
    // 拉档途中用户又答了题 → 以他刚答的为准,这轮不覆盖(touched 已排好同步)。
    // 注意 dirty 只在 hydrated 之后才置位,所以「挂载时的初始化写」不会误伤这一判断
    if (dirty) { hydrated = true; return false }
    mem = normalize(doc.basic ?? {})
    memScore = normalizeScore(doc.score ?? {})
    hydrated = true
    dropLegacy()
    return true
  } catch { return false }
}
