// E12-09 ② · 省提名自评打分引擎(纯函数,无 React)。
// 2026-08-01 从 app/(frontend)/jobs/ 搬到 lib/:换省对照节(L2-08)让报告引擎也消费它,
// 两个消费方(/pathways 打分卡 与 lib/report.ts)都在这层之上 —— 引擎不该住在某个页面目录里。
//
// 为什么要这层:两个省的官方分值表结构完全不同(BC SIRS 200 分制有时薪/地区,SK SINP 110 分制有年龄/二语),
// 但用户只想填**一套**自己的条件,然后看「哪个省更快」。所以这里做的是
//   一套用户条件(SelfProfile) → 各省官方档位(ScoreFactor 行) → 各省估分。
//
// 硬约束(别放宽):
//   ① **分值一分都不许前端编** —— 全部来自 pnp_score_factors(官方分值表抓取入库);
//      这里只负责「你选的条件对应官方表的哪一行」,分数照抄那一行的 points;
//   ② 匹配尽量**从官方标签自身解析数字**(年数、CLB、年龄区间),不写死分值表内容 ——
//      官方改版加一档,这里自动跟着走;
//   ③ 学历没有数字可解析,用关键词阶梯定级(下面 EDU_LADDER)。这是**显示层映射**,
//      所以 UI 必须把命中的官方原文标签显出来,让用户自己核对;
//   ④ 组上限(SK FACTOR I=80 / II=30)按官方封顶,任何勾选组合都不会算出超过官方的分。

// 官方分值表一行(pnp_score_factors 维度表)。**类型定在这里**,不从 JobsTable 取 ——
// 打分是「关于你这个人」的功能(挂在 /pathways),跟职位板没有依赖关系。
export type ScoreFactor = {
  province: string; system: string; factor: string; kind: string; seq: number
  label: string; points: number | null; xorPrev: boolean; rule: string
  factorMax: number | null; factorGroup: string; groupMax: number | null; passMark: number | null
  maxTotal: number | null; guideEffective: string; fetched: string; url: string
}
// 省抽选事实(pnp_draws 的用得着的几列;与 JobsTable.PnpDraw 结构兼容)
export type DrawRow = { province: string; kind: string; drawDate: string; stream: string; score: number | null }


// 抽选线要对得上通道:BC 现行是**按通道分别设线**(近 12 次里 Build 97 / Care: Health 96 / Innovate 132 /
// 偏远医疗 50),拿最近一次的 50 去比一个木匠的分是错的对照。所以先按通道名匹配,匹配不上就不给差分结论。
// 通道名两边写法不同(岗位侧「BC PNP Build: construction trades targeted ITA」/ 抽选侧「Build: Construction Trades」)
// → 取实词做子集判断,不做字面相等。
// 2026-08-01 从 PnpScoreCard 提到这层:换省对照节(L2-08)也要守这条红线,规则只许有一份。
const STREAM_STOP = new Set(['bc', 'pnp', 'the', 'and', 'targeted', 'ita', 'stream', 'authority', 'initiative', 'only', 'all'])
const streamWords = (s: string) => (s || '').toLowerCase().replace(/[^a-z]+/g, ' ').split(' ').filter((w) => w.length > 2 && !STREAM_STOP.has(w))
export const streamMatches = (drawStream: string, gridStream: string): boolean => {
  const a = streamWords(drawStream), b = new Set(streamWords(gridStream))
  return a.length > 0 && b.size > 0 && a.every((w) => b.has(w))
}
/** 打分表自报的通道名:`system` 结尾括号里那段(如「OINP EOI points (Ontario Workforce Priority stream)」)*/
export const gridStreamOf = (system: string): string => /\(([^)]+)\)\s*$/.exec(system)?.[1] ?? ''
/** 显示用的分制短名:去掉自报通道的括号(整串印在句子里太长) */
export const systemShort = (system: string): string => system.replace(/\s*\([^)]*\)\s*$/, '')

export type EduKey = 'doctorate' | 'master' | 'bachelor' | 'tradeCert' | 'diploma2y' | 'cert1y' | 'highschool'
export const EDU_KEYS: EduKey[] = ['doctorate', 'master', 'bachelor', 'tradeCert', 'diploma2y', 'cert1y', 'highschool']
const EDU_RANK: Record<EduKey, number> = { doctorate: 6, master: 5, bachelor: 4, tradeCert: 3.5, diploma2y: 3, cert1y: 2, highschool: 1 }

// 官方学历标签 → 阶梯档。一条标签命中多个关键词时取**最低**的那档
// (SK 的「Master's or Doctorate degree」是硕博同一行,硕士就该能选中它)。
const EDU_LADDER: [RegExp, number][] = [
  [/doctor/i, 6],
  [/master/i, 5],
  [/post-?graduate/i, 4.5],
  [/bachelor|three-year/i, 4],
  [/trade certification|journeyperson/i, 3.5],
  [/associate/i, 3],
  [/diploma/i, 3],
  [/certificate|semesters/i, 2],
  [/secondary school|high school/i, 1],
]

export type SelfProfile = {
  edu: EduKey
  expRecent: number   // 近 5 年内同职业全职年数(0-5)
  expOlder: number    // 再往前(6-10 年前)的年数(0-5)
  clb1: number        // 首考语言 CLB(0 = 没有成绩)
  clb2: number        // 第二官方语言 CLB(0 = 没有)
  age: number
}

export const DEFAULT_PROFILE: SelfProfile = { edu: 'bachelor', expRecent: 3, expOlder: 0, clb1: 7, clb2: 0, age: 30 }

// ── 从官方标签里解析可比较的数字 ────────────────────────────────────────────────
/**
 * 年数档:「5 or more years」5 /「At least 4 but less than 5 years」4 /「4 years」4 /「Less than 1 year」0
 * ⚠️ 顺序不能调:「At least 3 but less than 4 years」里有两个数字,先跑通用正则会取到 4(实撞过,
 * 3 年经验被判成 2-3 年那档少算 4 分)—— 必须先认「At least N」。
 */
const yearsOf = (label: string): number | null => {
  if (/no experience/i.test(label)) return 0
  if (/^less than/i.test(label)) return 0
  const at = /^at least (\d+)/i.exec(label)
  if (at) return Number(at[1])
  const m = /(\d+)\s*(?:\+|or more)?\s*years?/i.exec(label)
  return m ? Number(m[1]) : null
}

/** CLB 档:「9+」9 /「CLB 8 and higher」8 /「8」8 /「Below 4…」「Not Applicable」「without language test」0 */
const clbOf = (label: string): number | null => {
  if (/below|not applicable|without language test/i.test(label)) return 0
  const m = /(\d+)\s*\+?/.exec(label)
  return m ? Number(m[1]) : null
}

/** 年龄区间:「Less than 18 years」[0,17] /「22 – 34 years」[22,34] /「More than 50 years」[51,200] */
const ageRangeOf = (label: string): [number, number] | null => {
  let m = /less than (\d+)/i.exec(label)
  if (m) return [0, Number(m[1]) - 1]
  m = /more than (\d+)/i.exec(label)
  if (m) return [Number(m[1]) + 1, 200]
  m = /(\d+)\s*[–—-]\s*(\d+)/.exec(label)
  if (m) return [Number(m[1]), Number(m[2])]
  m = /^(\d+)\s*years?/i.exec(label)
  return m ? [Number(m[1]), Number(m[1])] : null
}

const eduRankOf = (label: string): number | null => {
  const hits = EDU_LADDER.filter(([re]) => re.test(label)).map(([, r]) => r)
  return hits.length ? Math.min(...hits) : null
}

/** 在档位里选「阈值 ≤ 你的值」中最高的那条;全都比你高(例如学历不够任何一档)→ 取阈值最低的那条 */
function pickByThreshold(rows: ScoreFactor[], thresholdOf: (l: string) => number | null, want: number): ScoreFactor | null {
  const scored = rows.map((r) => ({ r, th: thresholdOf(r.label) })).filter((x) => x.th != null) as { r: ScoreFactor; th: number }[]
  if (!scored.length) return null
  const ok = scored.filter((x) => x.th <= want)
  if (ok.length) return ok.reduce((a, b) => (b.th > a.th ? b : a)).r
  return scored.reduce((a, b) => (b.th < a.th ? b : a)).r
}

function pickByAge(rows: ScoreFactor[], age: number): ScoreFactor | null {
  for (const r of rows) {
    const range = ageRangeOf(r.label)
    if (range && age >= range[0] && age <= range[1]) return r
  }
  return null
}

// ── 每个官方因素怎么从 SelfProfile 取值 ─────────────────────────────────────────
// key = pnp_score_factors.factor(官方表的小节)。没登记的因素 → 由调用方当「手动/自动项」处理。
const AUTO_PICK: Record<string, (rows: ScoreFactor[], p: SelfProfile) => ScoreFactor | null> = {
  // BC 的 work 是「同职业总年数」;SK 拆成近 5 年与 6-10 年两块相加
  work: (rows, p) => pickByThreshold(rows, yearsOf, p.expRecent + p.expOlder),
  work5: (rows, p) => pickByThreshold(rows, yearsOf, p.expRecent),
  work610: (rows, p) => pickByThreshold(rows, yearsOf, p.expOlder),
  education: (rows, p) => pickByThreshold(rows, eduRankOf, EDU_RANK[p.edu]),
  language: (rows, p) => pickByThreshold(rows, clbOf, p.clb1),
  language1: (rows, p) => pickByThreshold(rows, clbOf, p.clb1),
  language2: (rows, p) => pickByThreshold(rows, clbOf, p.clb2),
  age: (rows, p) => pickByAge(rows, p.age),
}

export type ScorePart = {
  factor: string
  pts: number
  max: number
  matched: string        // 命中的官方原文标签(UI 必须显出来,好让用户核对)
  group: string
  source: 'profile' | 'job' | 'tick'   // 分数从哪来:你填的条件 / 本岗自动算 / 你自己勾的
}

export type ProvinceScore = {
  province: string
  system: string
  maxTotal: number
  passMark: number | null
  url: string
  guideEffective: string
  fetched: string
  parts: ScorePart[]
  total: number
}

/**
 * 算一个省的估分。
 * @param overrides 手动/自动项的分数(BC 的时薪与地区、SK 的雇主 offer 等),由 UI 传进来
 * @param ticks     加分项勾选状态,key = `${factor}:${seq}`
 * @param only      自动匹配的**白名单**(L2-08 换省对照节):只有这些因素拿 profile 去匹官方档位,
 *                  其余一律当「未答」(0 分、matched 空)。缺省=不限,老调用方(/pathways 打分卡)行为不变。
 *                  为什么需要它:报告只问了语言与加拿大经验,若让缺答的字段照常匹配,
 *                  「没考语言」会被 pickByThreshold 兜到最低档白捡分 —— 那是编数。
 */
export function scoreProvince(
  factors: ScoreFactor[], province: string, profile: SelfProfile,
  overrides: Record<string, { pts: number; matched: string; source: ScorePart['source'] }> = {},
  ticks: Record<string, boolean> = {},
  only?: Set<string>,
): ProvinceScore | null {
  const all = factors.filter((f) => f.province === province)
  if (!all.length) return null
  const head = all[0]
  const names = Array.from(new Set(all.map((f) => f.factor)))

  const parts: ScorePart[] = names.map((name) => {
    const mine = all.filter((f) => f.factor === name)
    const rows = mine.filter((f) => f.kind === 'row')
    const bonusRows = mine.filter((f) => f.kind === 'bonus')
    const group = mine[0]?.factorGroup || ''
    const max = mine[0]?.factorMax ?? 0

    const ov = overrides[name]
    let pts = 0
    let matched = ''
    let source: ScorePart['source'] = 'profile'
    if (ov) {
      pts = ov.pts; matched = ov.matched; source = ov.source
    } else if (AUTO_PICK[name] && rows.length && (!only || only.has(name))) {
      const hit = AUTO_PICK[name](rows, profile)
      pts = hit?.points ?? 0
      matched = hit?.label ?? ''
    } else if (rows.length) {
      source = 'tick'   // 没登记映射的档位块 → 全交给 UI 勾(不猜)
    }
    if (bonusRows.length) { pts += bonusPoints(bonusRows, `${province}:${name}`, ticks); source = ov ? source : 'tick' }
    return { factor: name, pts: Math.min(pts, max || pts), max, matched, group, source }
  })

  // 组上限:官方给了 FACTOR I/II 各自的 Max(SK)→ 组内相加后封顶;没分组的省(BC)按因素直接相加
  const groups = new Map<string, number>()
  let total = 0
  for (const p of parts) {
    if (!p.group) { total += p.pts; continue }
    groups.set(p.group, (groups.get(p.group) ?? 0) + p.pts)
  }
  for (const [g, sum] of groups) {
    const cap = all.find((f) => f.factorGroup === g)?.groupMax ?? null
    total += cap == null ? sum : Math.min(sum, cap)
  }

  return {
    province, system: head.system, maxTotal: head.maxTotal ?? 0, passMark: head.passMark ?? null,
    url: head.url, guideEffective: head.guideEffective, fetched: head.fetched,
    parts, total: Math.min(total, head.maxTotal ?? total),
  }
}

/**
 * 加分项求和:官方原文「…, or」标成 xorPrev 的相邻项是**二选一**,组内只算最大的一条。
 * @param prefix 勾选状态的 key 前缀 = `${省}:${因素}`(省内因素同名也不会串,例如两省都有 education 加分)
 */
export function bonusPoints(list: ScoreFactor[], prefix: string, ticks: Record<string, boolean>): number {
  let sum = 0, groupBest = 0, inGroup = false
  list.forEach((b, i) => {
    const on = !!ticks[`${prefix}:${i}`]
    const next = list[i + 1]
    if (next?.xorPrev) { inGroup = true; groupBest = Math.max(groupBest, on ? (b.points ?? 0) : 0); return }
    if (b.xorPrev) {
      groupBest = Math.max(groupBest, on ? (b.points ?? 0) : 0)
      sum += groupBest; groupBest = 0; inGroup = false
      return
    }
    if (inGroup) { sum += groupBest; groupBest = 0; inGroup = false }
    if (on) sum += b.points ?? 0
  })
  return sum + groupBest
}
