// 省提名弹框「有没有卡可出」与格子「可不可点」同一判据(components/pnp 的 pnpFactsIndexOf / pnpFactsShownOf;2026-09-26 /fe 首页 Frank)。
// 来由:清单与抽选两张整表改成弹框打开才懒取,首屏只带事实索引;格子凭索引判可不可点 —— 索引判的必须与弹框拿整表自己出卡一字不差,
// 否则就是「看着能点、点开只有标题」(改前 20,809 条)或「弹框明明有卡却点不开」。
// 性质:① 任意清单 / 抽选 / 岗位:索引判「有卡」⇔ 弹框整表判「有卡」(本省抽选卡 hasProvDraws,或清单卡 shownStreamsOf 非空);
//       ② data/mart 真数据两表上,逐个真实(省, 职业, 通道标签)同上;③ 服务端压的排除键装回集合 = 整表现算;
//       ④ boardDimsOf 除两张整表外逐格原样(同一引用)。
// 金标(手写,每条对着 09-26 /fe 首页的实查):NS 木匠格子写「NS 建筑」、弹框原先展开「NS 紧缺空缺」;安省改制不出抽选卡且无清单;
// MB 在需是参考信号清单、不当命中清单;SK 排除清单点名的岗弹框出那张排除清单;SK 现有工签既无清单也无抽选;魁省什么都不出。
// 探针:旧命中规则(按职业码找、取最后一个命中)在 NS 金标上给出另一张清单 —— 金标分得开新旧两版,不是恒真断言。
// 另:英文轮数单复数(eecmp.roundsOne)。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import {
  hasProvDraws, pnpDrawGroupsOf, pnpFactsIndexOf, pnpFactsShownOf, pnpMatchOf, shownStreamsOf,
} from '@/components/pnp/functions'
import type { PnpDraw, PnpFactsIndex, PnpJob, PnpOcc, PnpStream } from '@/components/pnp/types'
import { blockedKeysOf, blockedSetsOf, boardDimsOf, boardPnpOf } from '@/components/jobs/functions'
import type { JobDims } from '@/components/jobs/types'
import { makeT } from '@/lib/i18n'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mart = <T>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/mart/${name}.json`), 'utf8'))

function job(p: Partial<PnpJob>): PnpJob {
  return {
    id: 1, province: '', noc: '', teer: 1, pnpEligible: true, pnpStream: '', eeCategory: '', company: '', aip: false,
    salaryAnnual: null, wageMedAnnual: null, lmiaPositions: null, lmiaPositionsSkilled: null, lmiaLastQuarter: '',
    ...p,
  }
}

function occ(p: Partial<PnpOcc>): PnpOcc {
  return {
    province: '', stream: '', label: '', type: 'indemand', program: 'PNP', noc: '', name: '', gtaRestricted: false,
    url: '', fetched: '', ...p,
  }
}

function draw(p: Partial<PnpDraw>): PnpDraw {
  return {
    province: '', kind: 'draw', drawDate: '2026-09-01', stream: 'S', streamZh: '', score: 60, invitations: 10,
    note: '', label: '', ...p,
  }
}

/** 弹框拿整表自己出卡:本省抽选卡,或清单卡(与 PnpListSection 的两道判据逐字同一组函数) */
function modalHasCards(j: PnpJob, o: PnpOcc[], d: PnpDraw[]): boolean {
  const cards = shownStreamsOf({ match: pnpMatchOf({ job: j, occ: o }), noc: j.noc })
  return hasProvDraws({ province: j.province, draws: d }) || cards.length > 0
}

/** 格子凭首屏事实索引判(职位板 pnpActiveOf 里的第二道);索引可预先算好传进来 */
function cellSaysCards(j: PnpJob, o: PnpOcc[], d: PnpDraw[], pre?: PnpFactsIndex): boolean {
  const index = pre ?? pnpFactsIndexOf({ occ: o, draws: d })
  return pnpFactsShownOf({ province: j.province, noc: j.noc, stream: j.pnpStream, index })
}

/** 旧命中规则(改判前的 pnpMatchOf):按职业码找,取最后一个命中,不跳过参考信号清单 —— 只给探针用 */
function oldMatchedLabel(j: PnpJob, o: PnpOcc[]): string {
  let hit = ''
  for (const s of pnpMatchOf({ job: { ...j, pnpStream: '' }, occ: o }).streams) {
    if (s.type !== 'ineligible' && s.occupations.some((x) => x.noc === j.noc)) {
      hit = s.label
    }
  }
  return hit
}

const PROVS = ['ON', 'NS', 'SK', 'MB', 'BC', 'QC', '']
const LABELS = ['L1', 'L2', 'L3', 'X 排除', '']
const NOCS = ['11111', '22222', '33333', '44444']

const occArb = fc.record({
  province: fc.constantFrom(...PROVS),
  label: fc.constantFrom(...LABELS),
  type: fc.constantFrom('indemand', 'ineligible'),
  program: fc.constantFrom('PNP', 'AIP', ''),
  noc: fc.constantFrom(...NOCS),
}).map((r) => occ(r))

const drawArb = fc.record({
  province: fc.constantFrom(...PROVS, 'FED'),
  kind: fc.constantFrom('draw', 'notice'),
  drawDate: fc.constantFrom('', '2026-01-15', '2026-07-01'),
  stream: fc.constantFrom('A', 'B'),
}).map((r) => draw(r))

const jobArb = fc.record({
  province: fc.constantFrom(...PROVS),
  noc: fc.constantFrom(...NOCS),
  pnpStream: fc.constantFrom(...LABELS),
  pnpEligible: fc.boolean(),
}).map((r) => job(r))

describe('索引判「有卡」⇔ 弹框整表判「有卡」', () => {
  it('任意清单 / 抽选 / 岗位', () => {
    fc.assert(fc.property(fc.array(occArb, { maxLength: 30 }), fc.array(drawArb, { maxLength: 20 }), jobArb, (o, d, j) => {
      expect(cellSaysCards(j, o, d)).toBe(modalHasCards(j, o, d))
    }), { numRuns: 3000 })
  })

  it('data/mart 真数据:逐个真实(省, 职业, 通道标签)', () => {
    const o = mart<PnpOcc>('pnp_occupations')
    const d = mart<PnpDraw>('pnp_draws')
    expect(o.length).toBeGreaterThan(100)
    expect(d.length).toBeGreaterThan(50)
    const index = pnpFactsIndexOf({ occ: o, draws: d })
    // 数据口径:真数据里「按清单行算的排除键」(格子红字)与「按弹框分组算的排除键」(弹框排除清单卡)一个不差 ——
    // 哪天出了同名清单混两种类型的行,这一条先红。
    expect(new Set(index.excluded)).toEqual(blockedKeysOf(o).pnp)
    const provs = [...new Set(o.map((r) => r.province)), 'ON', 'QC', 'NT', '']
    const nocs = [...new Set(o.map((r) => r.noc)), '99999']
    let checked = 0
    let shown = 0
    for (const province of provs) {
      const labels = [...new Set(o.filter((r) => r.province === province).map((r) => r.label)), '', 'SK 现有工签', 'NS 建筑']
      for (const noc of nocs) {
        for (const pnpStream of labels) {
          const j = job({ province, noc, pnpStream })
          const want = modalHasCards(j, o, d)
          expect(cellSaysCards(j, o, d, index)).toBe(want)
          checked += 1
          if (want) {
            shown += 1
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(5000)
    expect(shown).toBeGreaterThan(0)
    expect(shown).toBeLessThan(checked)
  }, 120000)
})

describe('服务端压的键与整表现算一致', () => {
  it('排除键装回集合 = blockedKeysOf 现算', () => {
    fc.assert(fc.property(fc.array(occArb, { maxLength: 40 }), fc.array(drawArb, { maxLength: 10 }), (o, d) => {
      const dims = { pnpOccupations: o, pnpDraws: d } as unknown as JobDims
      const got = blockedSetsOf(boardPnpOf(dims))
      const want = blockedKeysOf(o)
      expect([...got.pnp].sort()).toEqual([...want.pnp].sort())
      expect([...got.aip].sort()).toEqual([...want.aip].sort())
      expect(boardPnpOf(dims).index).toEqual(pnpFactsIndexOf({ occ: o, draws: d }))
    }), { numRuns: 500 })
  })

  it('boardDimsOf 只把两张整表换成空表,其余逐格同一引用', () => {
    const full = {
      provinces: [{}], cities: [{}], districts: [{}], nocCategories: [{}], sources: [{}], experienceLevels: [{}],
      pnpOccupations: [occ({ province: 'SK' })], pnpDraws: [draw({ province: 'BC' })], eeCategories: [{}], eeBroads: [{}],
      designatedEmployers: [{}], nocDescriptions: [{}], occupations: [{}], fieldSources: [{}], news: [{}],
    } as unknown as JobDims
    const slim = boardDimsOf(full)
    expect(Object.keys(slim).sort()).toEqual(Object.keys(full).sort())
    for (const k of Object.keys(full) as (keyof JobDims)[]) {
      if (k === 'pnpOccupations' || k === 'pnpDraws') {
        expect(slim[k]).toEqual([])
      } else {
        expect(slim[k]).toBe(full[k])
      }
    }
  })
})

describe('金标', () => {
  const nsLists = [
    occ({ province: 'NS', label: 'NS 建筑', noc: '72310' }),
    occ({ province: 'NS', label: 'NS 建筑', noc: '72311' }),
    occ({ province: 'NS', label: 'NS 紧缺空缺', noc: '72310' }),
    occ({ province: 'NS', label: 'NS 毕业生', noc: '21231' }),
  ]

  it('NS 木匠:弹框展开格子写的那张(NS 建筑),不是参考信号清单', () => {
    const carpenter = job({ province: 'NS', noc: '72310', pnpStream: 'NS 建筑' })
    const m = pnpMatchOf({ job: carpenter, occ: nsLists })
    expect(m.matched?.label).toBe('NS 建筑')
    expect(shownStreamsOf({ match: m, noc: '72310' }).map((s: PnpStream) => s.label)).toEqual(['NS 建筑'])
    expect(cellSaysCards(carpenter, nsLists, [])).toBe(true)
  })

  it('探针:旧规则在同一金标上展开的是另一张 —— 金标分得开新旧', () => {
    const carpenter = job({ province: 'NS', noc: '72310', pnpStream: 'NS 建筑' })
    expect(oldMatchedLabel(carpenter, nsLists)).toBe('NS 紧缺空缺')
    expect(pnpMatchOf({ job: carpenter, occ: nsLists }).matched?.label).not.toBe(oldMatchedLabel(carpenter, nsLists))
  })

  it('NS 通用岗(只在参考信号清单上):弹框无卡,格子不可点', () => {
    const general = job({ province: 'NS', noc: '72310', pnpStream: '' })
    expect(pnpMatchOf({ job: general, occ: nsLists }).matched).toBeNull()
    expect(modalHasCards(general, nsLists, [])).toBe(false)
    expect(cellSaysCards(general, nsLists, [])).toBe(false)
  })

  it('安省改制:有 4 月的旧抽选也不出抽选卡,没有清单 → 无卡', () => {
    const draws = [draw({ province: 'ON', drawDate: '2026-04-23' }), draw({ province: 'ON', kind: 'notice', drawDate: '2026-08-04' })]
    const on = job({ province: 'ON', noc: '21231', pnpStream: '' })
    expect(hasProvDraws({ province: 'ON', draws })).toBe(false)
    expect(cellSaysCards(on, [], draws)).toBe(false)
  })

  it('MB 在需(参考信号清单):不当命中清单,但本省有抽选卡 → 有卡', () => {
    const o = [occ({ province: 'MB', label: 'MB 在需职业', noc: '65200' })]
    const d = [draw({ province: 'MB', drawDate: '2026-09-24', stream: 'Skilled Worker in Manitoba' })]
    const mb = job({ province: 'MB', noc: '65200', pnpStream: '' })
    expect(pnpMatchOf({ job: mb, occ: o }).matched).toBeNull()
    expect(shownStreamsOf({ match: pnpMatchOf({ job: mb, occ: o }), noc: '65200' })).toEqual([])
    expect(cellSaysCards(mb, o, d)).toBe(true)
  })

  it('SK 排除清单点名:弹框出那张排除清单 → 有卡;SK 现有工签:无清单无抽选 → 无卡', () => {
    const o = [occ({ province: 'SK', label: 'SK 主线不合格清单', type: 'ineligible', noc: '65201' })]
    const excluded = job({ province: 'SK', noc: '65201', pnpStream: '', pnpEligible: false })
    const ewp = job({ province: 'SK', noc: '73300', pnpStream: 'SK 现有工签' })
    expect(shownStreamsOf({ match: pnpMatchOf({ job: excluded, occ: o }), noc: '65201' }).map((s) => s.label))
      .toEqual(['SK 主线不合格清单'])
    expect(cellSaysCards(excluded, o, [])).toBe(true)
    expect(cellSaysCards(ewp, o, [])).toBe(false)
  })

  it('魁省:什么卡都不出', () => {
    const o = [occ({ province: 'QC', label: 'QC 清单', type: 'ineligible', noc: '11111' })]
    const qc = job({ province: 'QC', noc: '11111', pnpStream: 'QC 清单' })
    expect(modalHasCards(qc, o, [draw({ province: 'QC' })])).toBe(false)
    expect(cellSaysCards(qc, o, [draw({ province: 'QC' })])).toBe(false)
  })
})

describe('英文轮数单复数(eecmp.roundsOne)', () => {
  it('一轮写 round,两轮写 rounds;中文照旧「轮」', () => {
    const one = [draw({ province: 'BC', stream: 'A', drawDate: '2026-09-01' })]
    const two = [draw({ province: 'BC', stream: 'A', drawDate: '2026-09-01' }), draw({ province: 'BC', stream: 'A', drawDate: '2026-08-01' })]
    const rounds = (lang: 'en' | 'zh' | 'ko', draws: PnpDraw[]) =>
      pnpDrawGroupsOf({ t: makeT(lang), lang, province: 'BC', draws, hitStreams: [] }).map((g) => g.rounds)
    expect(rounds('en', one)).toEqual(['1 round'])
    expect(rounds('en', two)).toEqual(['2 rounds'])
    expect(rounds('zh', one)).toEqual(['1 轮'])
    expect(rounds('zh', two)).toEqual(['2 轮'])
    expect(rounds('ko', one)).toEqual(['1회'])
  })
})
