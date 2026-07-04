// 匹配规则快照测试(E5-00 §3.6):固定 fixture 档案 × 抽样岗位,锁死 level/score/依据链。
// 规则改动 → 这里必然红 → 有意识地更新快照,不静默漂移。纯函数,不需要 DB。
import { describe, it, expect } from 'vitest'
import { match, normalizeProfile, hasProfile, matchRank, type MatchDims, type MatchJob } from '@/lib/match'

// ── fixture 维度(形状与 page.tsx dims 一致,数据虚构但结构真实) ──
const dims: MatchDims = {
  pnpOccupations: [
    { province: 'ON', label: 'OINP 紧缺技能', type: 'indemand', noc: '33102', url: 'https://ontario.ca/x', fetched: '2026-06-28' },
    { province: 'ON', label: 'OINP 科技', type: 'indemand', noc: '21232', url: 'https://ontario.ca/tech', fetched: '2026-06-28' },
    { province: 'AB', label: 'AAIP 排除清单', type: 'ineligible', noc: '65200', url: 'https://alberta.ca/x', fetched: '2026-06-28' },
  ],
  eeCategories: [
    { category: 'stem', label: 'STEM', noc: '21232', drawCrs: 491, drawDate: '2026-06-04', url: 'https://canada.ca/ee', fetched: '2026-06-28' },
    { category: 'health', label: 'Healthcare', noc: '33102', drawCrs: 422, drawDate: '2026-05-13', url: 'https://canada.ca/ee', fetched: '2026-06-28' },
  ],
}

const job = (o: Partial<MatchJob>): MatchJob => ({
  noc: '', teer: null, province: '', pnpEligible: false, pnpStream: '', eeCategory: '',
  salaryAnnual: null, wageMedAnnual: null, ...o,
})

// 档案 fixture:软件开发者,CRS 480,目标 ON/BC
const dev = normalizeProfile({ nocCodes: ['21232'], clb: 9, crs: 480, targetProvinces: ['on', 'BC'], pgwpMonthsLeft: 14 })
// 护理助理,无 CRS,目标 AB
const psw = normalizeProfile({ nocCodes: ['33102'], clb: 7, crs: null, targetProvinces: ['AB'], pgwpMonthsLeft: 30 })

describe('normalizeProfile / hasProfile', () => {
  it('normalizes loose json shapes', () => {
    expect(dev.targetProvinces).toEqual(['ON', 'BC'])
    expect(normalizeProfile(null).nocCodes).toEqual([])
    expect(hasProfile(normalizeProfile({}))).toBe(false)
    expect(hasProfile(dev)).toBe(true)
  })
})

describe('match rules v1', () => {
  it('unclassified job → na (不硬塞)', () => {
    const r = match(dev, job({ noc: '' }), dims)
    expect(r.level).toBe('na')
    expect(r.reasons[0].key).toBe('match.r.noc.jobUncat')
  })

  it('dev × ON tech job:NOC 对口 + 省具名 + EE 差 11 分 → high,依据链指回维度', () => {
    const r = match(dev, job({ noc: '21232', teer: 1, province: 'ON', pnpEligible: true, pnpStream: 'ON 科技', eeCategory: 'STEM', salaryAnnual: 95000, wageMedAnnual: 91000 }), dims)
    expect(r.level).toBe('high')
    expect(r.score).toBe(40 + 30 + 0 + 10 + 5) // noc.exact + prov.named + ee.below(0) + teer.channel? teer=1→ok + wage.above
    const ee = r.reasons.find((x) => x.rule === 'ee')!
    expect(ee.key).toBe('match.r.ee.below')
    expect(ee.params).toMatchObject({ crs: 480, draw: 491, gap: 11, date: '2026-06-04' })
    expect(ee.source?.url).toBe('https://canada.ca/ee')
    const prov = r.reasons.find((x) => x.rule === 'prov')!
    expect(prov.key).toBe('match.r.prov.named')
    expect(prov.source?.url).toBe('https://ontario.ca/tech')
  })

  it('dev × 非目标省(SK)同岗:目标省警示扣分但仍可 mid+', () => {
    const r = match(dev, job({ noc: '21232', teer: 1, province: 'SK', pnpEligible: true, eeCategory: 'STEM' }), dims)
    expect(r.reasons.find((x) => x.key === 'match.r.prov.notTarget')).toBeTruthy()
    expect(r.score).toBe(40 - 10 + 15 + 0 + 10) // exact - notTarget + generic + ee.below(0) + teer.ok
    expect(r.level).toBe('mid')
  })

  it('psw × AB 排除清单岗:excluded fail + TEER5 无通道 → low', () => {
    const r = match(psw, job({ noc: '65200', teer: 5, province: 'AB', pnpEligible: true }), dims)
    const prov = r.reasons.find((x) => x.rule === 'prov')!
    expect(prov.key).toBe('match.r.prov.excluded')
    expect(r.reasons.find((x) => x.key === 'match.r.teer.low')).toBeTruthy()
    expect(r.level).toBe('low')
  })

  it('psw × ON 护理岗:同小类 NOC 33103→33102?否——完全一致才 exact;无 CRS → ee.noCrs 提示', () => {
    const r = match(psw, job({ noc: '33102', teer: 3, province: 'ON', pnpEligible: true, eeCategory: 'Healthcare' }), dims)
    expect(r.reasons.find((x) => x.key === 'match.r.noc.exact')).toBeTruthy()
    expect(r.reasons.find((x) => x.key === 'match.r.prov.named')).toBeTruthy()
    expect(r.reasons.find((x) => x.key === 'match.r.ee.noCrs')).toBeTruthy()
    expect(r.reasons.find((x) => x.key === 'match.r.prov.notTarget')).toBeTruthy() // 目标 AB,岗在 ON
    expect(r.level).toBe('high') // 40+30-10+10 = 70
  })

  it('QC 岗:省规则 na(魁省自有体系)', () => {
    const r = match(dev, job({ noc: '21232', teer: 1, province: 'QC' }), dims)
    expect(r.reasons.find((x) => x.key === 'match.r.prov.qc')).toBeTruthy()
  })

  it('同小类 NOC 记 minor 分', () => {
    const r = match(dev, job({ noc: '21233', teer: 1, province: 'BC', pnpEligible: true }), dims)
    expect(r.reasons.find((x) => x.key === 'match.r.noc.minor')).toBeTruthy()
    expect(r.score).toBe(25 + 15 + 10) // minor + generic + teer.ok
  })

  it('措辞红线:所有 reason 键都不含承诺性词(能/不能移民)——键名审计', () => {
    // reason 只允许出现在这份白名单里;新增键必须过这里(=有意识地过一遍措辞)
    const allowed = new Set([
      'match.r.noc.jobUncat', 'match.r.noc.noProfile', 'match.r.noc.exact', 'match.r.noc.minor', 'match.r.noc.none',
      'match.r.prov.qc', 'match.r.prov.notTarget', 'match.r.prov.named', 'match.r.prov.excluded', 'match.r.prov.generic', 'match.r.prov.none',
      'match.r.ee.none', 'match.r.ee.noDraw', 'match.r.ee.noCrs', 'match.r.ee.above', 'match.r.ee.below',
      'match.r.teer.ok', 'match.r.teer.channel', 'match.r.teer.low',
      'match.r.wage.above', 'match.r.wage.near', 'match.r.wage.below', 'match.r.wage.na',
    ])
    const jobs: MatchJob[] = [
      job({ noc: '21232', teer: 1, province: 'ON', pnpEligible: true, eeCategory: 'STEM', salaryAnnual: 60000, wageMedAnnual: 90000 }),
      job({ noc: '65200', teer: 5, province: 'AB', pnpEligible: false }),
      job({ noc: '99999', teer: 4, province: 'NS', pnpEligible: false, salaryAnnual: 50000, wageMedAnnual: 52000 }),
      job({ noc: '' }),
    ]
    for (const p of [dev, psw]) for (const j of jobs) for (const r of match(p, j, dims).reasons) {
      expect(allowed.has(r.key), r.key).toBe(true)
    }
  })

  it('matchRank 排序序:high>mid>low>na>null', () => {
    expect(matchRank('high')).toBeGreaterThan(matchRank('mid'))
    expect(matchRank('mid')).toBeGreaterThan(matchRank('low'))
    expect(matchRank('low')).toBeGreaterThan(matchRank('na'))
    expect(matchRank(null)).toBe(-1)
  })
})
