// 判定矩阵穷举测试(Frank 2026-08-15 夜「需要穷举一下所有情况,测试用例放到一个文件里」)。
//
// 为什么**不是**把「5 类闸 × 3 态 × 处境 × 现居省 × 学历省 × TEER × 14 条通道」逐格填期望值:
// 那是 60 万格,每格的「正确答案」只有两个来源 —— 手写(写不完,也没人复核得了),或者拿引擎自己
// 跑出来当基准(快照测试:引擎错了就把错的固化下来,红了也只会去改快照)。两条都不是测试。
// 所以这里**穷举的是输入,断言的是性质**(metamorphic relation / invariant):不需要知道「正确答案
// 是什么」,也能判出引擎违没违规。Frank 那四条铁律本来就是性质,不是期望值:
//   ① 没答 ≠ 没有障碍   → 每道 required 闸在任何输入下都必须表态(met/gap/unknown 三选一);
//                          落 unknown 就必须 needs-info + missingSlots 点名,不许静默放行成 open。
//   ② 本站未收录 ≠ 官方不要求 → availability 只许由「收没收录条文」决定:摇遍五类闸的答案,它必须纹丝不动;
//                          反过来,说了 not-collected 就必须点得出是哪一条没收录。
//   ③ 措辞层与引擎兜底文案逐字一致 → 整张矩阵产出的每条 reason 都过一遍三语措辞层。
//   ④ 选配闸不许误伤   → 某条通道没声明的闸,它读的那几个档案字段怎么摇,判定必须逐字节不变。
//
// 三层,各司其职:
//   ① 覆盖数组枚举(确定性,CI 稳定)—— 每条通道只摇**它自己声明的闸读得到**的字段;组数一多就走
//      两两覆盖(NIST 的实证:多数缺陷由 ≤2 个参数交互触发),把组合爆炸压回几百格。
//      闸判据本身是三四元交互的地方(statusInCanada 的四种问法、fieldMatch 的例外)另外全量枚举。
//   ② fast-check 随机性质 —— 摇整个空间,失败自动 shrink 成最小反例(手写笛卡尔炸出来是满字段现场)。
//   ③ 手写金标(文件末尾)—— **唯一**写「期望答案」的地方,每条对着官方条文或当晚实拍的 bug 核过。
//      少了它这一层不成立:一个「永远返回 needs-info」的引擎能通过上面所有性质。
//
// 🔴 这个文件**发现不了**「条文没读到 / 拿错尺子量」那类规格 bug(当晚四个 bug 里有三个是)——
//    引擎不知道 NL 要求专业对口,把输入摇烂它也不会知道。它守的是另一半:规则一旦编码进来,
//    没有任何输入组合能让它被静默绕过。前一半的杠杆是逐通道的条文覆盖清单,不是测试。
// 🔴 当晚第四个 bug(「其余门槛已达标」对 0 经验的人是假话)在展示层 PrDecisionView.tsx,
//    不在判定层,这个文件管不着。
// 🔴 坑:`evaluateOne` 开头有早退 —— 库里没有该通道的门槛行就直接 needs-info + not-collected,
//    闸循环压根不跑。「加了闸却判不动」八成是这个,所以下面第一条就钉死它(是数据问题不是代码问题)。
//
// fixture 同 pathVerdict.int.spec:直接读 data/mart 真数据,不手抄。
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { makeT } from '@/app/(frontend)/jobs/i18n'
import {
  blockCost, pathVerdict,
  type DesignatedEmployerRow, type OccupationRow, type PathwayVerdict,
  type VerdictData, type VerdictDrawRow, type VerdictProfile,
} from '@/lib/pathVerdict'
import { gateOf, PATHWAYS, type PathwayStrategy } from '@/lib/pathways'
import type { GateKey, StatusAsk } from '@/lib/gateManifest'
import type { Requirement } from '@/lib/rules'
import type { EduKey, ScoreFactor } from '@/lib/pnpSelfScore'
import type { EeGridRow } from '@/lib/crsEstimate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mart = <T>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/mart/${name}.json`), 'utf8'))

const data: VerdictData = {
  requirements: mart<Requirement>('pnp_requirements'),
  occupations: mart<OccupationRow>('pnp_occupations'),
  draws: mart<VerdictDrawRow>('pnp_draws'),
  scoreFactors: mart<ScoreFactor>('pnp_score_factors'),
  eeGrid: mart<EeGridRow>('ee_points_grid'),
  designatedEmployers: mart<DesignatedEmployerRow>('designated_employers'),
}

// ── 词汇 ────────────────────────────────────────────────────────────────────

const GATES: GateKey[] = ['offer', 'statusInCanada', 'credentialCanada', 'fieldMatch', 'french']

/** 这条通道**声明为 required** 的闸(策略层的声明,不是算法的复制品) */
const requiredGates = (key: string): GateKey[] => GATES.filter((g) => gateOf(key, g).need === 'required')

/** required 的 statusInCanada 闸问的是哪一种官方要求 */
const askOf = (key: string): StatusAsk | null => {
  const rule = gateOf(key, 'statusInCanada')
  return rule.need === 'required' ? (rule.asks ?? null) : null
}

type GateState = 'met' | 'gap' | 'unknown' | 'notCollected'
const GATE_KEY_RE = /^pv\.gate\.(offer|statusInCanada|credentialCanada|fieldMatch|french)(?:\.(\w+))?\.(met|gap|unknown|notCollected)$/

/** 从 reasons 里读回「每道闸表了什么态」。读引擎的**产出**,不重算一遍判据 ——
 *  重算等于再写一份实现,bug 只是搬了个家。 */
const gateStatesOf = (v: PathwayVerdict): Partial<Record<GateKey, GateState>> => {
  const out: Partial<Record<GateKey, GateState>> = {}
  for (const r of v.reasons) {
    const m = r.key ? GATE_KEY_RE.exec(r.key) : null
    if (m) out[m[1] as GateKey] = m[3] as GateState
  }
  return out
}

/** 库里没有该通道的门槛行时引擎的早退形态(见文件头「坑」) */
const isNoReqStub = (v: PathwayVerdict): boolean => v.reasons.length === 1 && v.reasons[0].key === 'pv.noReq'

/** 判定的逐字节指纹,**去掉 tierBasis**。
 *  tierBasis(#319)按设计就是 `status` 的函数:在读学生的「再攒 N 个月」要等毕业拿到工签才开始走,
 *  所以每条有经验/在职门槛的通道都读 status —— 拿它去测「不相干输入零影响」会把设计当成 bug。
 *  它自己的判据由本文件末尾的 tierBasis 专节盯着(性质 + 金标),这里只把它排除在指纹之外。 */
const fingerprint = (v: PathwayVerdict): string => {
  const { tierBasis: _drop, ...rest } = v
  return JSON.stringify(rest)
}

const byKey = (list: PathwayVerdict[], key: string): PathwayVerdict => {
  const hit = list.find((v) => v.key === key)
  expect(hit, `注册表里没有 ${key}`).toBeTruthy()
  return hit as PathwayVerdict
}

// ── 基准档案:各槽都「答了且达标」,枚举只在它上面摇轴 ─────────────────────────
// 之所以从「全达标」出发:性质测试要的是**摇动**,基线本身取哪一份不重要;取全达标的那份,
// 一旦某道闸被静默放行,met 与 gap 的边界最容易被摇出来。
const BASE: VerdictProfile = {
  age: 30, married: false, clb: 7, edu: 'diploma2y', eduYears: 2,
  canadaStudy: true, studyProvince: 'ON', noc: '72310', teer: 2,
  expCanadaMonths: 12, expForeignMonths: 0, foreignExpSelfEmployed: false,
  hasOffer: true, inCanada: true, status: 'worker', province: 'ON', permit: 'work',
  fieldMatch: true, frenchOk: true,
}

type Frag = Partial<VerdictProfile>
const withFrags = (...frags: Frag[]): VerdictProfile => Object.assign({}, BASE, ...frags)

// ── 覆盖数组:两两覆盖(pairwise)────────────────────────────────────────────
// 全笛卡尔积在 NL 那条要 8505 格(4 组闸 × 各自的取值),两两覆盖压到 ~1400 —— 保证**任意两组的
// 任意取值组合都至少出现一次**,这正是 NIST 那份实证给的性价比拐点。三元以上的交互不靠它:
// 闸判据自己那几组(statusInCanada 四种问法、fieldMatch 例外)在下面单独全量枚举。
function pairwise(groups: Frag[][]): Frag[] {
  const live = groups.filter((g) => g.length > 0)
  if (!live.length) return [{}]
  if (live.length === 1) return live[0]
  const out: Frag[] = []
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      for (let a = 0; a < live[i].length; a++) {
        for (let b = 0; b < live[j].length; b++) {
          const merged: Frag = {}
          live.forEach((g, k) => {
            Object.assign(merged, k === i ? live[i][a] : k === j ? live[j][b] : g[(a + b + k) % g.length])
          })
          out.push(merged)
        }
      }
    }
  }
  return out
}

/** 全笛卡尔积(只用在「必须穷举」的那几组小空间上) */
function product(groups: Frag[][]): Frag[] {
  return groups.reduce<Frag[]>((acc, g) => acc.flatMap((a) => g.map((b) => ({ ...a, ...b }))), [{}])
}

// ── 轴 ──────────────────────────────────────────────────────────────────────

const IN_CANADA: Frag[] = [{ inCanada: true }, { inCanada: false }, { inCanada: null }]
const PERMIT: Frag[] = (['study', 'pgwp', 'work', 'none', null] as const).map((permit) => ({ permit }))
const STATUS: Frag[] = ['worker', 'study', 'pgwp', 'other', null].map((status) => ({ status }))
const HAS_OFFER: Frag[] = [{ hasOffer: true }, { hasOffer: false }, { hasOffer: null }]
const CANADA_STUDY: Frag[] = [{ canadaStudy: true }, { canadaStudy: false }, { canadaStudy: null }]
const FIELD_MATCH: Frag[] = [{ fieldMatch: true }, { fieldMatch: false }, { fieldMatch: null }]
const FRENCH: Frag[] = [{ frenchOk: true }, { frenchOk: false }, { frenchOk: null }]
const TEER: Frag[] = [0, 1, 2, 3, 4, 5, null].map((teer) => ({ teer }))
const EXP: Frag[] = [0, 12, 24, null].map((expCanadaMonths) => ({ expCanadaMonths }))
/** 现居省 / 学历省按「本省 / 外省 / 没答」摇(外省取一个确定的别省,不摇遍 13 个省:
 *  判据只看「等不等于本省」,摇遍别省是重复劳动) */
const provAxis = (own: string, field: 'province' | 'studyProvince'): Frag[] =>
  [own, own === 'ON' ? 'BC' : 'ON', null].map((v) => ({ [field]: v }) as Frag)

/** 某条通道的闸读得到哪几个字段(用于「无关输入零影响」性质)。
 *  只列**这道闸独占**的字段:canadaStudy/province/studyProvince 还喂估分器、条件行、居住门槛,
 *  它们变了判定跟着变是应该的,不进这张表。 */
const readableFields = (spec: PathwayStrategy): Set<keyof VerdictProfile> => {
  const out = new Set<keyof VerdictProfile>()
  const req = requiredGates(spec.key)
  if (req.includes('offer')) out.add('hasOffer')
  if (req.includes('fieldMatch')) out.add('fieldMatch')
  if (req.includes('french')) out.add('frenchOk')
  const ask = askOf(spec.key)
  if (req.includes('statusInCanada')) {
    out.add('inCanada')
    if (ask === 'workPermit' || ask === 'pgwp') { out.add('permit'); out.add('status') }
    if (ask === 'provEmployment') out.add('status')
    if (ask == null) { out.add('permit'); out.add('status') }   // 未标注 = 旧口径兜底,按最宽算
  }
  return out
}

/** 闸独占字段的全集(「零影响」性质只摇这几个,别的字段本来就该影响判定) */
const EXCLUSIVE_FIELDS: { field: keyof VerdictProfile; values: Frag[] }[] = [
  { field: 'hasOffer', values: HAS_OFFER },
  { field: 'inCanada', values: IN_CANADA },
  { field: 'permit', values: PERMIT },
  { field: 'status', values: STATUS },
  { field: 'fieldMatch', values: FIELD_MATCH },
  { field: 'frenchOk', values: FRENCH },
]

// ── 矩阵 ────────────────────────────────────────────────────────────────────

function casesFor(spec: PathwayStrategy): Frag[] {
  const own = spec.reqProvince
  const req = requiredGates(spec.key)
  const ask = askOf(spec.key)
  const groups: Frag[][] = []
  if (req.includes('offer')) groups.push(HAS_OFFER)
  if (req.includes('credentialCanada')) groups.push(CANADA_STUDY)
  if (req.includes('french')) groups.push(FRENCH)
  if (req.includes('fieldMatch')) { groups.push(FIELD_MATCH); groups.push(provAxis(own, 'studyProvince')); groups.push(TEER) }
  if (req.includes('statusInCanada')) {
    groups.push(IN_CANADA)
    if (ask === 'workPermit' || ask === 'pgwp' || ask == null) { groups.push(PERMIT); groups.push(STATUS) }
    if (ask === 'provResidence') groups.push(provAxis(own, 'province'))
    if (ask === 'provEmployment') { groups.push(provAxis(own, 'province')); groups.push(STATUS); groups.push(EXP) }
  }
  const out = pairwise(groups)

  // 闸判据自己是三四元交互 → 那几组单独**全量**枚举(其余字段停在 BASE):
  // 「学签在读被 AB 的工签闸放行」正是 inCanada × permit × status 的三元组合,
  // 两两覆盖保证不了它一定出现。
  if (ask === 'workPermit' || ask === 'pgwp') out.push(...product([IN_CANADA, PERMIT, STATUS]))
  if (ask === 'provResidence') out.push(...product([IN_CANADA, provAxis(own, 'province')]))
  if (ask === 'provEmployment') out.push(...product([IN_CANADA, provAxis(own, 'province'), STATUS, EXP]))
  // 专业对口的例外是「本省院校 + TEER 档」的三元规则 → 全量
  if (req.includes('fieldMatch')) out.push(...product([FIELD_MATCH, provAxis(own, 'studyProvince'), TEER]))
  return out
}

const CASES: VerdictProfile[] = (() => {
  const seen = new Set<string>()
  const out: VerdictProfile[] = []
  const push = (frag: Frag) => {
    const p = withFrags(frag)
    const sig = JSON.stringify(p)
    if (seen.has(sig)) return
    seen.add(sig)
    out.push(p)
  }
  // 四个布尔闸答案的全量交叉(与通道无关的那一层:一条通道加了闸,别条不许跟着变)
  for (const f of product([HAS_OFFER, CANADA_STUDY, FIELD_MATCH, FRENCH])) push(f)
  for (const spec of PATHWAYS) for (const f of casesFor(spec)) push(f)
  return out
})()

/** 整张矩阵只算一次(每格 = 一份档案 × 14 条通道的判定) */
const MATRIX: { p: VerdictProfile; list: PathwayVerdict[] }[] = CASES.map((p) => ({ p, list: pathVerdict(p, data) }))

const sig = (p: VerdictProfile, extra?: string) =>
  `offer=${p.hasOffer} inCanada=${p.inCanada} permit=${p.permit} status=${p.status} prov=${p.province} ` +
  `study=${p.canadaStudy}/${p.studyProvince} field=${p.fieldMatch} fr=${p.frenchOk} teer=${p.teer} exp=${p.expCanadaMonths}` +
  (extra ? ` ${extra}` : '')

// ── 0. 矩阵自身的体检 ───────────────────────────────────────────────────────

describe('矩阵体检', () => {
  it('规模在预算内,且 14 条通道都真的有门槛行(早退 = 数据问题,不是代码问题)', () => {
    expect(CASES.length).toBeGreaterThan(500)
    expect(CASES.length).toBeLessThan(4000)
    // 库里没有该通道的门槛行 → evaluateOne 早退,闸循环压根不跑。这条炸 = 去补 mart,别改代码。
    const stub = new Set<string>()
    for (const { list } of MATRIX) for (const v of list) if (isNoReqStub(v)) stub.add(v.key)
    expect([...stub]).toEqual([])
  })

  it('每一道 required 闸的 met / gap / unknown 三态都被真的踩到(否则这张矩阵是空跑)', () => {
    const seen = new Set<string>()
    for (const { list } of MATRIX) {
      for (const v of list) {
        for (const r of v.reasons) if (r.key && GATE_KEY_RE.test(r.key)) seen.add(`${v.key} ${r.key}`)
      }
    }
    const missing: string[] = []
    for (const spec of PATHWAYS) {
      const ask = askOf(spec.key)
      for (const g of requiredGates(spec.key)) {
        const mid = g === 'statusInCanada' && ask ? `.${ask}` : ''
        for (const state of ['met', 'gap', 'unknown']) {
          const k = `${spec.key} pv.gate.${g}${mid}.${state}`
          if (!seen.has(k)) missing.push(k)
        }
      }
    }
    expect(missing).toEqual([])
  })
})

// ── 铁律 ①:没答 ≠ 没有障碍 ─────────────────────────────────────────────────

describe('铁律①:没答 ≠ 没有障碍', () => {
  it('每道 required 闸在任何输入下都必须表态(met/gap/unknown),不许沉默', () => {
    const silent: string[] = []
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        const st = gateStatesOf(v)
        for (const g of requiredGates(v.key)) if (!st[g]) silent.push(`${v.key} 缺 ${g} 的表态 ← ${sig(p)}`)
      }
    }
    expect(silent.slice(0, 10)).toEqual([])
  })

  // 🔴 「无障碍」在这一层是 **verdict='viable' 且没挂 blockedBy**,不是 verdict='viable' 本身。
  //    引擎是四档不是三档:verdict 只回答「判不判得了」,「答了、但没有」那类缺口由 blockedBy 承载
  //    (pathVerdict.ts §⑤ `void manifestGap`,排序层把挂了 blockedBy 的 open 排在无障碍 open 之后)。
  //    2026-08-15 夜首次写这条断言时按「open = 能走」下的手,12 条红 —— 查引擎后确认是断言写错了档:
  //    真正该守的是下面两条(无障碍必须逐闸有正面证据 + 有缺口必须挂得住标签),而不是把 gap 也压成 needs-info。
  it('verdict=open 且没挂 blockedBy(=无障碍能走)⇒ 每道 required 闸都有 met 的正面证据', () => {
    const bad: string[] = []
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        if (v.verdict !== 'viable' || v.blockedBy) continue
        const st = gateStatesOf(v)
        for (const g of requiredGates(v.key)) if (st[g] !== 'met') bad.push(`${v.key} 无障碍 open 但 ${g}=${st[g]} ← ${sig(p)}`)
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('任一 required 闸落 gap ⇒ 必须挂 blockedBy,且报的那道不比它好拆(缺口不许被静默吞掉)', () => {
    const bad: string[] = []
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        if (v.verdict === 'excluded') continue                 // 硬伤时 blockedBy 按设计不挂
        const st = gateStatesOf(v)
        for (const g of requiredGates(v.key)) {
          if (st[g] !== 'gap') continue
          if (!v.blockedBy) { bad.push(`${v.key} ${g}=gap 却没挂 blockedBy ← ${sig(p)}`); continue }
          if (blockCost(v.blockedBy) < blockCost(g)) {
            bad.push(`${v.key} ${g}=gap 但 blockedBy=${v.blockedBy} 更好拆 ← ${sig(p)}`)
          }
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('闸落 unknown ⇒ verdict=needs-info 且 missingSlots 点名这道闸', () => {
    const bad: string[] = []
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        if (v.verdict === 'excluded') continue      // 硬伤已判死,闸判不判得了不改变结论
        const st = gateStatesOf(v)
        for (const g of GATES) {
          if (st[g] !== 'unknown') continue
          if (v.verdict !== 'needs-info') bad.push(`${v.key} ${g}=unknown 却 verdict=${v.verdict} ← ${sig(p)}`)
          if (!v.missingSlots?.includes(g)) bad.push(`${v.key} ${g}=unknown 却没进 missingSlots ← ${sig(p)}`)
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('missingSlots 里的闸名 ⇒ 该闸确实判不了(不许拿别人的缺口点名)', () => {
    const bad: string[] = []
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        const st = gateStatesOf(v)
        for (const g of GATES) {
          if (!v.missingSlots?.includes(g)) continue
          if (st[g] !== 'unknown') bad.push(`${v.key} missingSlots 有 ${g} 但它是 ${st[g]} ← ${sig(p)}`)
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })
})

// ── 铁律 ②:本站未收录 ≠ 官方不要求 ─────────────────────────────────────────

describe('铁律②:availability 只由「收没收录条文」决定', () => {
  it('摇遍五类闸的答案,availability 纹丝不动(其余字段固定)', () => {
    // 只摇**闸独占**的六个字段:它们不喂估分器、不喂条件行、不喂居住门槛,
    // 所以「答案变了 → availability 变了」只可能是把我们的窟窿说成了用户的问题。
    const bad: string[] = []
    for (const { field, values } of EXCLUSIVE_FIELDS) {
      for (const base of [BASE, { ...BASE, teer: 5, noc: '65100' }, { ...BASE, canadaStudy: false, studyProvince: null }]) {
        const seen = new Map<string, Map<string, string>>()
        for (const frag of values) {
          for (const v of pathVerdict({ ...base, ...frag } as VerdictProfile, data)) {
            if (!seen.has(v.key)) seen.set(v.key, new Map())
            seen.get(v.key)!.set(JSON.stringify(frag), v.availability)
          }
        }
        for (const [key, m] of seen) {
          const vals = new Set(m.values())
          if (vals.size > 1) bad.push(`${key} 的 availability 随 ${String(field)} 变了:${[...m].map(([k, a]) => `${k}→${a}`).join(' ')}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('说了 not-collected 就必须点得出是哪一条没收录', () => {
    const bad: string[] = []
    const NOT_COLLECTED_KEYS = /^pv\.(noReq|noExpReq|noLangReq|noLangReqSoft|gate\..*\.notCollected)$/
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        if (v.availability !== 'not-collected') continue
        if (!v.reasons.some((r) => r.key && NOT_COLLECTED_KEYS.test(r.key))) {
          bad.push(`${v.key} 说 not-collected 却没有一条「未收录」的理由 ← ${sig(p)}`)
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('闸的条文缺(gate.*.notCollected)⇒ availability=not-collected,不许降级成「你没答」', () => {
    const bad: string[] = []
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        if (v.verdict === 'excluded') continue
        const hole = v.reasons.some((r) => r.key?.endsWith('.notCollected'))
        if (hole && v.availability !== 'not-collected') bad.push(`${v.key} 有闸缺条文却 availability=${v.availability} ← ${sig(p)}`)
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })
})

// ── 铁律 ③:措辞层与引擎兜底文案逐字一致 ────────────────────────────────────

describe('铁律③:整张矩阵的措辞都过三语措辞层', () => {
  // 去重后逐条比:同一个 key+params 只验一次(矩阵有几十万条 reason,不去重纯烧时间)
  const uniq = (() => {
    const m = new Map<string, { key: string; params?: Record<string, string | number>; text: string; from: string }>()
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        for (const r of v.reasons) {
          if (!r.key) { m.set(`naked:${v.key}:${r.text}`, { key: '', text: r.text, from: `${v.key} ← ${sig(p)}` }); continue }
          const k = `${r.key}|${JSON.stringify(r.params ?? {})}`
          if (!m.has(k)) m.set(k, { key: r.key, params: r.params, text: r.text, from: `${v.key} ← ${sig(p)}` })
        }
      }
    }
    return [...m.values()]
  })()

  it('每条 reason 都挂了 pv.* 键', () => {
    expect(uniq.filter((u) => !u.key).map((u) => `${u.from}:${u.text}`)).toEqual([])
  })

  it('中文经措辞层渲染 = reason.text 逐字相同', () => {
    const tZh = makeT('zh')
    const drift = uniq.filter((u) => u.key && tZh(u.key, u.params) !== u.text)
      .map((u) => `${u.key}\n  text: ${u.text}\n  i18n: ${tZh(u.key, u.params)}\n  ← ${u.from}`)
    expect(drift).toEqual([])
  })

  it('三语都查得到键,英文态不残留中文与中文标点', () => {
    const leaked: string[] = []
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const t = makeT(lang)
      for (const u of uniq) {
        if (!u.key) continue
        if (t(u.key, u.params) === u.key) leaked.push(`${lang} 查不到 ${u.key}`)
      }
    }
    const tEn = makeT('en')
    for (const u of uniq) {
      if (!u.key) continue
      const s = tEn(u.key, u.params)
      if (/[一-鿿]/.test(s)) leaked.push(`en 残留中文 ${u.key} → ${s}`)
      if (/[　-〿·＀-￯]/.test(s)) leaked.push(`en 残留中文标点 ${u.key} → ${s}`)
    }
    expect([...new Set(leaked)]).toEqual([])
  })
})

// ── 铁律 ④:选配闸不许误伤 ─────────────────────────────────────────────────

describe('铁律④:通道没声明的闸,它读的字段怎么摇都不许影响判定', () => {
  it('逐通道 × 逐字段:不相干的输入 ⇒ 判定逐字节不变', () => {
    const bad: string[] = []
    for (const spec of PATHWAYS) {
      const reads = readableFields(spec)
      for (const { field, values } of EXCLUSIVE_FIELDS) {
        if (reads.has(field)) continue                       // 这道闸真读它 → 变了是应该的
        const shots = values.map((frag) => {
          const v = byKey(pathVerdict(withFrags(frag), data), spec.key)
          return { frag: JSON.stringify(frag), json: fingerprint(v) }
        })
        const first = shots[0]
        for (const s of shots.slice(1)) {
          if (s.json !== first.json) bad.push(`${spec.key} 不该读 ${String(field)},但 ${first.frag} 与 ${s.frag} 判定不同`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('新加一类闸不许把没声明它的通道集体拖成判不了', () => {
    // 2026-08-15 踩过:fieldMatch 一立,另外 13 条全变「判不了」。选配闸没声明 = 没扫过这类条款 →
    // 跳过不判,既不放行也不判死。这里钉的是:这 13 条的 reasons 里根本不该出现 fieldMatch / french。
    const bad: string[] = []
    for (const { p, list } of MATRIX) {
      for (const v of list) {
        const declared = new Set(GATES.filter((g) => gateOf(v.key, g).need !== 'unknown'))
        for (const g of ['fieldMatch', 'french'] as GateKey[]) {
          if (declared.has(g)) continue
          const st = gateStatesOf(v)[g]
          if (st) bad.push(`${v.key} 没声明 ${g} 却判了它(${st}) ← ${sig(p)}`)
          if (v.missingSlots?.includes(g)) bad.push(`${v.key} 没声明 ${g} 却点名要它 ← ${sig(p)}`)
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })
})

// ── tier 的起算点(#319)────────────────────────────────────────────────────
//
// 性质而不是期望值:不需要知道「这条通道应该是几个月」,也能判出引擎有没有把在读学生的
// 等待期说成从今天起算。判据全部读引擎自己的产出(reasons 的 pv.* 键),不重算一遍门槛。

/** 这条通道**还没达标**的经验/在职门槛(含 #317 的省外毕业生那条) */
const UNMET_EXP = /^pv\.(exp\.\w+\.(need|short|unknown)|oopGrad\.(need|short|unknown|condUnknown))$/
/** 还没达标的居住门槛(搬过去当天就在计时,不吃「毕业后才起算」) */
const UNMET_RES = /^pv\.res(Need|Short|Unknown)$/
/** 只认**还没达标**的那几条(键名对得上 + kind 不是 met:res 那几个键在达标时也在用) */
const hasKey = (v: PathwayVerdict, re: RegExp) =>
  v.reasons.some((r) => !!r.key && re.test(r.key) && r.kind !== 'met')
/** 学签在读:不许全职上班 ⇒ 攒经验的钟还没开始走 */
const isStudying = (p: VerdictProfile) => p.status === 'study' && (p.permit == null || p.permit === 'study')

const tierBasisProps = (p: VerdictProfile, list: PathwayVerdict[], bad: string[]) => {
  for (const v of list) {
    if (v.tierBasis !== 'now' && v.tierBasis !== 'after-study') { bad.push(`${v.key} tierBasis=${v.tierBasis}`); continue }
    if (v.tierBasis === 'after-study') {
      if (!isStudying(p)) bad.push(`${v.key} 不在读却 after-study ← ${sig(p)}`)
      if (!((v.tier ?? 0) > 0)) bad.push(`${v.key} tier=${v.tier} 却 after-study ← ${sig(p)}`)
      if (v.verdict === 'excluded') bad.push(`${v.key} 已判死却谈起算点 ← ${sig(p)}`)
      if (!hasKey(v, UNMET_EXP)) bad.push(`${v.key} after-study 却没有未达标的经验门槛 ← ${sig(p)}`)
    }
    // 反向:在读 + 有等待期 + 挡着的只有经验门槛(没有居住门槛)⇒ 必须是 after-study,不许漏
    if (isStudying(p) && v.verdict !== 'excluded' && (v.tier ?? 0) > 0 && hasKey(v, UNMET_EXP) && !hasKey(v, UNMET_RES)) {
      if (v.tierBasis !== 'after-study') bad.push(`${v.key} 在读却说从今天起算 ← ${sig(p)}`)
    }
  }
}

describe('#319 tierBasis:等待期的起算点', () => {
  it('整张矩阵:after-study 只出现在「在读 + 经验型等待期」上,且一格不漏', () => {
    const bad: string[] = []
    for (const { p, list } of MATRIX) tierBasisProps(p, list, bad)
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('非在读档案(在职 / PGWP / 找工作 / 没答)的每一条通道都是 now', () => {
    const bad: string[] = []
    for (const status of ['worker', 'pgwp', 'other', null]) {
      for (const permit of ['work', 'pgwp', 'none', null] as const) {
        for (const exp of [0, 12, null]) {
          const p = withFrags({ status, permit, expCanadaMonths: exp })
          for (const v of pathVerdict(p, data)) {
            if (v.tierBasis !== 'now') bad.push(`${v.key} ${status}/${permit}/exp=${exp} → ${v.tierBasis}`)
          }
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })

  it('单调性:在读改成在职,起算点只会从 after-study 变 now,不会反过来', () => {
    const bad: string[] = []
    for (const { p, list } of MATRIX) {
      if (!isStudying(p)) continue
      const after = pathVerdict({ ...p, status: 'worker', permit: 'work' }, data)
      for (const v of list) {
        const w = byKey(after, v.key)
        if (w.tierBasis === 'after-study') bad.push(`${v.key} 在职了还说毕业后起算 ← ${sig(p)}`)
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })
})

// ── fast-check:摇整个空间,失败自动收缩成最小反例 ──────────────────────────

describe('随机性质(fast-check,失败会 shrink 出最小反例)', () => {
  const arbProfile: fc.Arbitrary<VerdictProfile> = fc.record({
    age: fc.constantFrom<number | null>(22, 30, 40, 47, null),
    married: fc.constantFrom<boolean | null>(true, false, null),
    clb: fc.constantFrom<number | null>(4, 5, 6, 7, 9, null),
    edu: fc.constantFrom<EduKey | null>('master', 'bachelor', 'diploma2y', 'cert1y', 'highschool', null),
    eduYears: fc.constantFrom<number | null>(1, 2, 4, null),
    canadaStudy: fc.constantFrom<boolean | null>(true, false, null),
    studyProvince: fc.constantFrom<string | null>('ON', 'NL', 'MB', 'AB', null),
    noc: fc.constantFrom<string | null>('72310', '63200', '31301', '65100', null),
    teer: fc.constantFrom<number | null>(0, 1, 2, 3, 4, 5, null),
    expCanadaMonths: fc.constantFrom<number | null>(0, 6, 12, 24, null),
    expForeignMonths: fc.constantFrom<number | null>(0, 24, null),
    foreignExpSelfEmployed: fc.constantFrom<boolean | null>(true, false, null),
    status: fc.constantFrom<string | null>('worker', 'study', 'pgwp', 'other', null),
    province: fc.constantFrom<string | null>('ON', 'MB', 'NB', 'NL', 'AB', 'PE', 'BC', 'TERR', null),
    hasOffer: fc.constantFrom<boolean | null>(true, false, null),
    inCanada: fc.constantFrom<boolean | null>(true, false, null),
    fieldMatch: fc.constantFrom<boolean | null>(true, false, null),
    frenchOk: fc.constantFrom<boolean | null>(true, false, null),
    permit: fc.constantFrom<VerdictProfile['permit']>('study', 'pgwp', 'work', 'none', null),
  })

  it('任何档案:无障碍 ⇒ 每道 required 闸 met;unknown ⇒ needs-info + 点名', () => {
    fc.assert(fc.property(arbProfile, (p) => {
      for (const v of pathVerdict(p, data)) {
        const st = gateStatesOf(v)
        for (const g of requiredGates(v.key)) {
          expect(st[g], `${v.key}/${g} 没表态`).toBeTruthy()
          if (v.verdict === 'viable' && !v.blockedBy) expect(st[g], `${v.key} 无障碍 open 却 ${g} 不是 met`).toBe('met')
          if (st[g] === 'gap' && v.verdict !== 'excluded') expect(v.blockedBy, `${v.key} ${g}=gap 却没挂 blockedBy`).toBeTruthy()
        }
        if (v.verdict === 'excluded') continue
        for (const g of GATES) {
          if (st[g] !== 'unknown') continue
          expect(v.verdict, `${v.key} ${g}=unknown 却 ${v.verdict}`).toBe('needs-info')
          expect(v.missingSlots ?? [], `${v.key} ${g}=unknown 没点名`).toContain(g)
        }
      }
    }), { numRuns: 400 })
  })

  it('单调性:把某道闸的答案改成「达标」,该闸必转 met,且判定不许变差', () => {
    // metamorphic relation:不需要知道正确答案,只需要「补上一项达标的信息不许让结论更糟」。
    // 只挑**闸独占**的布尔槽(hasOffer/fieldMatch/frenchOk):canadaStudy 还喂 CRS 估分、
    // inCanada/permit 的「更好」不是单一方向,混进来就不是单调性了。
    const rank = { viable: 0, 'needs-info': 1, excluded: 2 } as const
    const FIELDS = ['hasOffer', 'fieldMatch', 'frenchOk'] as const
    const GATE_OF: Record<(typeof FIELDS)[number], GateKey> = { hasOffer: 'offer', fieldMatch: 'fieldMatch', frenchOk: 'french' }
    fc.assert(fc.property(arbProfile, fc.constantFrom(...FIELDS), (p, field) => {
      const before = pathVerdict(p, data)
      const after = pathVerdict({ ...p, [field]: true }, data)
      for (const v0 of before) {
        const v1 = byKey(after, v0.key)
        const g = GATE_OF[field]
        if (requiredGates(v0.key).includes(g) && v1.verdict !== 'excluded') {
          expect(gateStatesOf(v1)[g], `${v0.key} 答了达标 ${field} 却不是 met`).toBe('met')
          expect(v1.missingSlots ?? [], `${v0.key} 答了 ${field} 还在点名要它`).not.toContain(g)
        }
        expect(rank[v1.verdict], `${v0.key} 补上 ${field}=达标 反而更糟(${v0.verdict}→${v1.verdict})`)
          .toBeLessThanOrEqual(rank[v0.verdict])
      }
    }), { numRuns: 300 })
  })

  it('tierBasis:随机档案下也守「在读 + 经验型等待期」这一条', () => {
    fc.assert(fc.property(arbProfile, (p) => {
      const bad: string[] = []
      tierBasisProps(p, pathVerdict(p, data), bad)
      expect(bad.join(' / ')).toBe('')          // join 而不是 toEqual([]):反例内容要能直接读出来
    }), { numRuns: 400 })
  })

  it('无关输入零影响:通道没声明的闸,字段怎么摇判定都逐字节相同', () => {
    fc.assert(fc.property(arbProfile, fc.constantFrom(...EXCLUSIVE_FIELDS), arbProfile, (p, axis, q) => {
      const moved = { ...p, [axis.field]: q[axis.field] }
      const a = pathVerdict(p, data)
      const b = pathVerdict(moved, data)
      for (const spec of PATHWAYS) {
        if (readableFields(spec).has(axis.field)) continue
        expect(fingerprint(byKey(b, spec.key)), `${spec.key} 不该读 ${String(axis.field)}`)
          .toBe(fingerprint(byKey(a, spec.key)))
      }
    }), { numRuns: 300 })
  })
})

// ── 金标:唯一写「期望答案」的地方,每条对着官方条文或当晚实拍的 bug 核过 ─────────
//
// 性质测得再狠也证明不了「这条规则本身对不对」——「永远返回 needs-info」能通过上面全部性质。
// 所以这一节逐条钉死判据。改这里之前先查引擎与官方条文:金标变了要在注释里写清为什么行为变了。

type Golden = { name: string; path: string; gate: GateKey; want: GateState; p: Frag }

const GOLDEN: Golden[] = [
  // ① statusInCanada 拆四问(2026-08-15 拆闸,Frank 两次实拍)
  //    AB/PE 官方要的是**有效工签**,不是「人在加拿大」。
  { name: '学签在读 ≠ 有工签(AB 放行过学生的那个 bug)', path: 'AB-opportunity', gate: 'statusInCanada', want: 'gap',
    p: { province: 'AB', inCanada: true, permit: 'study', status: 'study' } },
  { name: '持工签 ⇒ AB 工签闸达标', path: 'AB-opportunity', gate: 'statusInCanada', want: 'met',
    p: { province: 'AB', inCanada: true, permit: 'work', status: 'worker' } },
  { name: '没答许可但处境是「在工作」⇒ 持某种工签,达标', path: 'AB-opportunity', gate: 'statusInCanada', want: 'met',
    p: { province: 'AB', inCanada: true, permit: null, status: 'worker' } },
  { name: '没答许可、处境是「找工作」⇒ 判不了,不许放行', path: 'AB-opportunity', gate: 'statusInCanada', want: 'unknown',
    p: { province: 'AB', inCanada: true, permit: null, status: 'other' } },
  { name: '访客/过期(permit=none)⇒ 没有工签', path: 'PE-sw', gate: 'statusInCanada', want: 'gap',
    p: { province: 'PE', inCanada: true, permit: 'none', status: 'other' } },
  { name: '人在境外 ⇒ 四种问法一律没有', path: 'PE-sw', gate: 'statusInCanada', want: 'gap',
    p: { province: null, inCanada: false, permit: null, status: 'other' } },
  //    NL 指名 PGWP:封闭/开放工签都不是 PGWP,不许充数。
  { name: '普通工签 ≠ PGWP', path: 'NL-intl-grad', gate: 'statusInCanada', want: 'gap',
    p: { inCanada: true, permit: 'work', status: 'worker' } },
  { name: '持 PGWP ⇒ NL 达标', path: 'NL-intl-grad', gate: 'statusInCanada', want: 'met',
    p: { inCanada: true, permit: 'pgwp', status: 'pgwp' } },
  { name: '没答许可、处境=PGWP ⇒ 由处境推得达标', path: 'NL-intl-grad', gate: 'statusInCanada', want: 'met',
    p: { inCanada: true, permit: null, status: 'pgwp' } },
  { name: '没答许可、处境=在工作 ⇒ 说不清是不是 PGWP,判不了', path: 'NL-intl-grad', gate: 'statusInCanada', want: 'unknown',
    p: { inCanada: true, permit: null, status: 'worker' } },
  //    MB 要「在曼省在职」、NB 要「住在纽宾士域」—— 拿 inCanada 判,外省居民全被放行。
  { name: '安省居民过不了曼省的「在曼省在职」闸(实拍 bug)', path: 'MB-swm', gate: 'statusInCanada', want: 'gap',
    p: { province: 'ON', inCanada: true, status: 'worker' } },
  { name: '人在曼省且在职 ⇒ 达标', path: 'MB-swm', gate: 'statusInCanada', want: 'met',
    p: { province: 'MB', inCanada: true, status: 'worker' } },
  { name: '人在曼省但在读书 ⇒ 明说不在职', path: 'MB-swm', gate: 'statusInCanada', want: 'gap',
    p: { province: 'MB', inCanada: true, status: 'study' } },
  { name: '人在曼省、处境=PGWP、没答本省经验月数 ⇒ 判不了', path: 'MB-swm', gate: 'statusInCanada', want: 'unknown',
    p: { province: 'MB', inCanada: true, status: 'pgwp', expCanadaMonths: null } },
  { name: '人在曼省、处境=PGWP、攒过本省经验 ⇒ 在职过', path: 'MB-swm', gate: 'statusInCanada', want: 'met',
    p: { province: 'MB', inCanada: true, status: 'pgwp', expCanadaMonths: 24 } },
  { name: '住在纽宾士域 ⇒ 居住闸达标', path: 'NB-sw', gate: 'statusInCanada', want: 'met',
    p: { province: 'NB', inCanada: true } },
  { name: '住在外省 ⇒ 居住闸不达标', path: 'NB-sw', gate: 'statusInCanada', want: 'gap',
    p: { province: 'ON', inCanada: true } },
  { name: '没答现居省 ⇒ 居住闸判不了', path: 'NB-sw', gate: 'statusInCanada', want: 'unknown',
    p: { province: null, inCanada: true } },

  // ② 专业对口闸 + 本省院校例外(NL,2026-08-15 新立)
  { name: '没答对不对口 ⇒ 判不了,不许默认放行', path: 'NL-intl-grad', gate: 'fieldMatch', want: 'unknown',
    p: { inCanada: true, permit: 'pgwp', fieldMatch: null } },
  { name: '省外院校毕业 + 不对口 ⇒ 缺口(官方明写要直接相关)', path: 'NL-intl-grad', gate: 'fieldMatch', want: 'gap',
    p: { inCanada: true, permit: 'pgwp', fieldMatch: false, studyProvince: 'ON', teer: 2 } },
  { name: 'NL 本省院校 + TEER 2 ⇒ 例外放行', path: 'NL-intl-grad', gate: 'fieldMatch', want: 'met',
    p: { inCanada: true, permit: 'pgwp', fieldMatch: false, studyProvince: 'NL', teer: 2 } },
  { name: 'NL 本省院校 + TEER 4 ⇒ 要对紧缺清单,本站判不了(不放行)', path: 'NL-intl-grad', gate: 'fieldMatch', want: 'unknown',
    p: { inCanada: true, permit: 'pgwp', fieldMatch: false, studyProvince: 'NL', teer: 4 } },
  { name: 'NL 本省院校 + TEER 5 ⇒ 同上,判不了', path: 'NL-intl-grad', gate: 'fieldMatch', want: 'unknown',
    p: { inCanada: true, permit: 'pgwp', fieldMatch: false, studyProvince: 'NL', teer: 5 } },
  { name: '不对口但没答在哪读的书 ⇒ 判不了', path: 'NL-intl-grad', gate: 'fieldMatch', want: 'unknown',
    p: { inCanada: true, permit: 'pgwp', fieldMatch: false, studyProvince: null } },

  // ③ 法语闸(FCIP,NCLC 5)—— 站里的语言题问的是 CLB(英语尺子),不许折算
  { name: 'CLB 9 也换不出 NCLC 5:没答法语 ⇒ 判不了', path: 'FCIP', gate: 'french', want: 'unknown',
    p: { clb: 9, frenchOk: null } },
  { name: '答了不会法语 ⇒ 缺口', path: 'FCIP', gate: 'french', want: 'gap', p: { clb: 4, frenchOk: false } },
  { name: '答了法语达标 ⇒ 达标', path: 'FCIP', gate: 'french', want: 'met', p: { clb: 4, frenchOk: true } },

  // ④ offer 闸(每条省提名都要,联邦 EE 不要)
  { name: '没答有没有 offer ⇒ 判不了', path: 'SK-offer', gate: 'offer', want: 'unknown', p: { hasOffer: null } },
  { name: '答了没有 offer ⇒ 缺口', path: 'SK-offer', gate: 'offer', want: 'gap', p: { hasOffer: false } },

  // ⑤ 加拿大学历闸(NL 由 PGWP 反推)
  { name: '没答有没有加拿大学历 ⇒ 判不了', path: 'NL-intl-grad', gate: 'credentialCanada', want: 'unknown',
    p: { inCanada: true, permit: 'pgwp', canadaStudy: null } },
]

describe('金标:逐条钉死判据', () => {
  for (const g of GOLDEN) {
    it(`${g.path} · ${g.name}`, () => {
      const v = byKey(pathVerdict(withFrags(g.p), data), g.path)
      expect(gateStatesOf(v)[g.gate], `${g.gate} 应为 ${g.want}`).toBe(g.want)
      if (g.want === 'unknown' && v.verdict !== 'excluded') {
        expect(v.verdict).toBe('needs-info')
        expect(v.missingSlots ?? []).toContain(g.gate)
      }
      // 「答了、但没有」不降 verdict,挂 blockedBy(四档设计见上文);报的那道不许比这道更好拆
      if (g.want === 'gap' && v.verdict !== 'excluded') {
        expect(v.blockedBy, `${g.gate}=gap 却没挂 blockedBy`).toBeTruthy()
        expect(blockCost(v.blockedBy)).toBeGreaterThanOrEqual(blockCost(g.gate))
      }
    })
  }

  it('联邦 EE:五类闸的答案怎么摇,判定逐字节不变(三类明写不要求 + 两类选配没声明)', () => {
    const shots = product([HAS_OFFER, FIELD_MATCH, FRENCH, IN_CANADA]).map((f) =>
      JSON.stringify(byKey(pathVerdict(withFrags(f), data), 'FED-EE')))
    expect(new Set(shots).size).toBe(1)
  })

  it('一个从没来过加拿大、没有 offer 的人:没有一条通道是「无障碍能走」', () => {
    // 这份档案正是 gateManifest 立项时的病灶画像(「从没来过加拿大的海外护士 → NLPNP 排进前三」)。
    // 判据用**无障碍**:每条通道要么被判死、要么判不了、要么挂着 blockedBy,没有一条干干净净。
    const overseas = withFrags({
      inCanada: false, permit: null, status: 'other', province: null, hasOffer: false,
      canadaStudy: false, studyProvince: null, fieldMatch: null, frenchOk: null,
      expCanadaMonths: 0, expForeignMonths: 60, foreignExpSelfEmployed: false,
    })
    const list = pathVerdict(overseas, data)
    expect(list.filter((v) => v.verdict === 'viable' && !v.blockedBy).map((v) => v.key)).toEqual([])
    // 而且每条「open」都得说得出被什么挡着 —— 挡他的是 offer 与境内身份,不是别的
    for (const v of list.filter((x) => x.verdict === 'viable')) {
      expect(['offer', 'statusInCanada', 'credentialCanada'], `${v.key} 的 blockedBy`).toContain(v.blockedBy)
    }
  })
})
