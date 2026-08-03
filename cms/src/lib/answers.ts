// 答案存储 = 一个 key、一个门面(设计:docs/design/统一题库与付费面-20260731.md §3/§6)。
// 收敛前:处境与目标省被 jobs_quiz_v1(三问)和 plan_pr_v1(拿 PR 基本题)各存一份、各问一遍 ——
// 重复的根不是 UI,是没有字段单一来源。这里是唯一的读写口:页面不再直接碰 localStorage。
// 老答案是用户唯一的资产,丢了等于让他重答 —— 所以首次读盘时把两个旧 key 合并进新 key 再删旧 key。
import { FIELDS, bandFromProvs, provsFromBand } from './fields'

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
  // B1-4 PGWP(20260803,拿 PR 探索批 2):计划读的课程时长档 + 层级档
  studyMonthsBand: number
  studyLevelBand: number
}

// 空答案(页面初始 state 也用它:再抄一份就会漏掉新字段)
export const EMPTY: Answers = {
  status: '', nocs: [], provs: [],
  clbBand: 0, expBand: 0, provBand: 0, crsBand: 0, pgwpBand: 0,
  eduBand: 0, ageBand: 0, totalExpBand: 0, offerBand: 0,
  studyMonthsBand: 0, studyLevelBand: 0,
}

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
    clbBand: num(p?.clbBand), expBand: num(p?.expBand), provBand,
    crsBand: num(p?.crsBand), pgwpBand: num(p?.pgwpBand),
  }
  save(merged)
  try { localStorage.removeItem(OLD_QUIZ); localStorage.removeItem(OLD_PR) } catch { /* ignore */ }
  return merged
}

function save(a: Answers): void {
  try { localStorage.setItem(ANSWERS_KEY, JSON.stringify(a)) } catch { /* 无痕模式写不进也不能崩页面 */ }
}

export function readAnswers(): Answers {
  if (typeof localStorage === 'undefined') return { ...EMPTY }
  const cur = parse(localStorage.getItem(ANSWERS_KEY))
  if (cur) {
    return {
      ...EMPTY, ...cur,
      nocs: arr(cur.nocs), provs: arr(cur.provs),
      clbBand: num(cur.clbBand), expBand: num(cur.expBand), provBand: num(cur.provBand),
      crsBand: num(cur.crsBand), pgwpBand: num(cur.pgwpBand),
      eduBand: num(cur.eduBand), ageBand: num(cur.ageBand), totalExpBand: num(cur.totalExpBand), offerBand: num(cur.offerBand),
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
  try { localStorage.removeItem(ANSWERS_KEY) } catch { /* ignore */ }
  return { ...EMPTY }
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
  return out
}
