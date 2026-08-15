// 答案存储 = 一个 key、一个门面(设计:docs/design/统一题库与付费面-20260731.md §3/§6)。
// 收敛前:处境与目标省被 jobs_quiz_v1(三问)和 plan_pr_v1(拿 PR 基本题)各存一份、各问一遍 ——
// 重复的根不是 UI,是没有字段单一来源。这里是唯一的读写口:页面不再直接碰 localStorage。
// 老答案是用户唯一的资产,丢了等于让他重答 —— 所以首次读盘时把两个旧 key 合并进新 key 再删旧 key。
import { FIELDS, bandFromProvs, provsFromBand } from './fields'
import type { SelfProfile } from './pnpSelfScore'

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
  permitBand: 0, resProv: '', fieldMatchBand: 0, eduProv: '',
  studyMonthsBand: 0, studyLevelBand: 0, bandsV2: true,
}

// 旧区间档 → 新精确档(index=旧 band):与旧 toAnswer 的引擎数字逐值一致(CLB=[0,0,4,6,8,10]、
// TOTAL_EXP=[0,0,6,24,48,60] 月),判定核收到的数字前后不变 —— 迁移只影响「格子里显示哪一档」
// 与「还要不要再追问精确题」。总经验 9(不清楚)原样保留。
const CLB_V2_MAP = [0, 1, 2, 4, 6, 8]
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
  save(merged)
  try { localStorage.removeItem(OLD_QUIZ); localStorage.removeItem(OLD_PR) } catch { /* ignore */ }
  return merged
}

function save(a: Answers): void {
  try {
    const s = JSON.stringify(a)
    // 内容没变不算「新答案」:不记时刻不排同步 —— 挂载即写的 effect 若把本地时间戳
    // 顶到最新,另一台设备答的服务端档就永远拉不回来(新者胜的「新」必须是真改动)
    if (localStorage.getItem(ANSWERS_KEY) === s) return
    localStorage.setItem(ANSWERS_KEY, s)
    touched()
  } catch { /* 无痕模式写不进也不能崩页面 */ }
}

export function readAnswers(): Answers {
  if (typeof localStorage === 'undefined') return { ...EMPTY }
  const cur = parse(localStorage.getItem(ANSWERS_KEY))
  if (cur) {
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
      // 2026-08-15 Frank 实拍「学历下面的内容填完一刷新就没了」:这俩跟进题(就读时长/层级)
      // 写入一直正常,是**读取路径漏了字段** → 每次刷新被归零。逐字段重建的清单必须与 Answers 全量对齐
      studyMonthsBand: num(cur.studyMonthsBand), studyLevelBand: num(cur.studyLevelBand),
    }
  }
  return migrate() ?? { ...EMPTY }
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
  try { localStorage.removeItem(ANSWERS_KEY); localStorage.removeItem(SCORE_ANSWERS_KEY) } catch { /* ignore */ }
  // 重置也是一次「新答案」:记时刻并立即推空档 —— 走防抖的话换页就丢,下次拉档旧答案
  // 又回来了(重置=没重置)。未登录照旧只动浏览器。
  writeMeta(new Date().toISOString())
  if (loggedIn === true) void pushToServer()
  return { ...EMPTY }
}

// ── 分值卡(估分段)答案(2026-08-15 Frank「学历以下的字段都有这个问题」)────────────────
// 基础 8 题一直走上面的 ANSWERS_KEY,而分值卡的勾选/逐题答案只活在组件 state → 刷新全丢。
// 同一原则:这里是唯一读写口。键是 `${prov}:${factor}` / tick 的 `${factor}:${seq}`,
// 都是用户自身条件(外省经历/亲属/本省学历…),跨岗位跨页面通用,与具体职位无关。
export const SCORE_ANSWERS_KEY = 'o2p_score_answers_v1'
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
}
const SCORE_EMPTY: ScoreAnswers = { ticks: {}, rowAnswers: {}, extraAnswered: {}, profile: {} }

export function readScoreAnswers(): ScoreAnswers {
  if (typeof localStorage === 'undefined') return { ...SCORE_EMPTY }
  const cur = parse(localStorage.getItem(SCORE_ANSWERS_KEY))
  if (!cur || typeof cur !== 'object') return { ...SCORE_EMPTY }
  const rec = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, never>) : {})
  return {
    ticks: rec(cur.ticks), rowAnswers: rec(cur.rowAnswers), extraAnswered: rec(cur.extraAnswered),
    profile: rec(cur.profile) as Partial<SelfProfile>,
    ...(typeof cur.hasOffer === 'boolean' ? { hasOffer: cur.hasOffer } : {}),
  }
}

export function writeScoreAnswers(a: ScoreAnswers): void {
  try {
    const s = JSON.stringify(a)
    if (localStorage.getItem(SCORE_ANSWERS_KEY) === s) return   // 同 save():没变不记时刻
    // schema 升级的挂载写(旧档补上空 profile 等新字段)不算「新答案」:按归一化读数再比一道,
    // 语义没变就只落盘不记时刻 —— 记了,这台设备的旧答案会以「更新」的名义顶掉服务端档
    const before = JSON.stringify(readScoreAnswers())
    localStorage.setItem(SCORE_ANSWERS_KEY, s)
    if (JSON.stringify(readScoreAnswers()) === before) return
    touched()
  } catch { /* 无痕模式写不进也不能崩页面 */ }
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

// ── 服务端答案档同步(2026-08-15 答案入库绑账号)──────────────────────────────
// dp.authGate 承诺「注册后答案自动存档」,这一层把它变成真的:登录态每次真改动防抖 2s
// 推 /api/account/answers;登录成功/消费页挂载时拉服务端档与本地合并 —— 谁的 updatedAt
// 新听谁的,本地无档直接取服务端。未登录一切照旧只写浏览器:loggedIn 只有摸过服务端
// (pullAndMerge / push 的响应)才置位,匿名用户不多发一次请求。写失败静默,下次改动自然重试。
const META_KEY = 'o2p_answers_meta_v1'   // { updatedAt: ISO } = 本地档最后真改动时刻(合并比新旧用)

let loggedIn: boolean | null = null      // null=登录态未知(push 不发);pullAndMerge 探明后才开闸
let syncTimer: ReturnType<typeof setTimeout> | null = null

const readMetaAt = (): number => {
  if (typeof localStorage === 'undefined') return 0
  const t = Date.parse(parse(localStorage.getItem(META_KEY))?.updatedAt ?? '')
  return Number.isFinite(t) ? t : 0
}
function writeMeta(iso: string): void {
  try { localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: iso })) } catch { /* ignore */ }
}

// 写档触点(save / writeScoreAnswers 内容真变时调):记时刻 + 排防抖同步
function touched(): void {
  writeMeta(new Date().toISOString())
  if (loggedIn !== true || typeof window === 'undefined') return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => { syncTimer = null; void pushToServer() }, 2000)
}

async function pushToServer(): Promise<void> {
  try {
    const r = await fetch('/api/account/answers', {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ basic: readAnswers(), score: readScoreAnswers() }),
    })
    if (r.status === 401) { loggedIn = false; return }
    if (!r.ok) return                     // 静默:答案还在本地,下次改动重试
    loggedIn = true
    const d = await r.json().catch(() => null)
    // 与服务端对表:本地时刻换成服务端 updatedAt,此后拉档不会把同一份内容再覆一遍
    if (typeof d?.updatedAt === 'string') writeMeta(d.updatedAt)
  } catch { /* 网络失败静默,下次改动重试 */ }
}

// 服务端档 → 本地(直写 localStorage,不走 save 的 touched:拉回来的不是「新答案」)。
// 形状不在这归一 —— readAnswers/readScoreAnswers 的读侧防御本来就要兜坏数据。
function applyServer(doc: { basic?: unknown; score?: unknown; updatedAt: string }): void {
  try {
    if (doc.basic && typeof doc.basic === 'object') localStorage.setItem(ANSWERS_KEY, JSON.stringify({ ...EMPTY, ...doc.basic }))
    if (doc.score && typeof doc.score === 'object') localStorage.setItem(SCORE_ANSWERS_KEY, JSON.stringify(doc.score))
    writeMeta(doc.updatedAt)
  } catch { /* ignore */ }
}

/** 拉服务端档并与本地合并(登录成功回调、消费页挂载时调)。返回 true = 本地被服务端覆盖,
 *  调用方需重建 state。未登录(401)/失败一律 false,页面行为与从前完全一致。 */
export async function pullAndMerge(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const localAt = readMetaAt()
    const r = await fetch('/api/account/answers', { credentials: 'include' })
    if (r.status === 401) { loggedIn = false; return false }
    if (!r.ok) return false
    loggedIn = true
    const doc = (await r.json().catch(() => null))?.answers
    const serverAt = typeof doc?.updatedAt === 'string' ? (Date.parse(doc.updatedAt) || 0) : 0
    // 拉档途中用户又答了题 → 本地为准,这轮不覆盖(touched 已排好同步)
    if (readMetaAt() !== localAt) return false
    const hasLocal = !!(localStorage.getItem(ANSWERS_KEY) || localStorage.getItem(SCORE_ANSWERS_KEY))
    if (!serverAt) {
      // 服务端无档:把浏览器里已答的旧答案立即送上去(注册闸兑现;等防抖的话跳页就丢)
      if (hasLocal) await pushToServer()
      return false
    }
    // 新者胜:本地无档/从没记过时刻 → localAt=0,自然落进「服务端新」;
    // 重置过(键已删但 meta 更新)→ localAt 更新,走下面的推平,不许旧档还魂
    if (serverAt > localAt) { applyServer(doc); return true }
    if (localAt > serverAt) await pushToServer()   // 本地新(如另一台答的还没同步):推平
    return false
  } catch { return false }
}
