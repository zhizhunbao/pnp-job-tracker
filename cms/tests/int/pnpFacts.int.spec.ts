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
// 2026-09-26 同日「止血 + 补完整」(Frank 看过效果图点头)追加:抽选卡三种形(分组 / NS 按月选取人数 / 安省改制现状,drawsFormOf)
// 都算「有卡」;排除清单卡只给不可提名的岗(SK 主线不合格表是参考信号表);顶上「本岗能走的通道」卡只是抬头,单独不算「有卡」。
// 金标跟着改的两条:安省改制后有官方公告 → 出现状卡(原「无卡」);其余照旧。新金标:阿省机会通道本岗那一组三格 + 近 90 天 4 轮、
// 合计 2,264 人(手写自 09-26 实查的五轮);NS 按月「671 人入选」、日期到月;魁省 PSTQ 哪一形都不出;通道卡的名字口径同 PNP 格。
// 探针:把排除卡的可提名闸拿掉,SK 可提名岗就又出排除卡;把只到月的行放进分组,NS 就会被按「轮」统计 —— 两处金标都分得开。
// 同日 lead 定:安省现状卡那一行改通用的「最新公告」(tl.tabNews),金标随之改。
// 同日晚 Frank「上面这个高亮是不是格式改成和下面的一样的」:本岗那一组改成与其余组同一种组头行(三格、近 90 天统计与窗口起点撤,
// 那三条金标随之删);「来源是不是也放到条上」→ 标题那一行右端,三种卡同一条、取本省抽选页。新金标:阿省机会通道那组排最前、
// 组头「最低 58 分 / 2026-09-23 / 5 轮」、开关收起也在;没公布分的 AIP 那组组头写「40 份申请入选」;来源三语一条。
// 2026-09-27 Frank「NS 这个省 弹框怎么都是汇总数据」「还是横着排的」:NS 按月那一形改走分组卡的组头行(官方只发月度总数,
// 一组;组头 = 最近一个月「671 人入选」、计数写「2 个月」不写「2 轮」、点开逐月一行),本岗在 NS 可提名时标命中;事实卡只剩安省。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import {
  allGroupsLabelOf, channelsOf, drawCardOf, drawGroupsShownOf, drawHitStreamsOf, drawsFormOf, hasProvDraws, monthRowsOf,
  quotaCardOf, gateCardOf, drawOpenInitOf, pnpBlockOf, pnpCellActiveOf, gateChannelOf,
  pnpDrawGroupsOf, pnpFactsIndexOf, pnpFactsShownOf, pnpMatchOf, shownStreamsOf,
  pnpBlockedKeysOf, pnpChannelKeyOf, pnpChannelOf, genDrawOf, quotaKeyOf, pnpDefaultProvsOf,
} from '@/components/pnp/functions'
import type { PnpDraw, PnpFactsIndex, PnpJob, PnpOcc, PnpOps, PnpPathway, PnpReq, PnpStream } from '@/components/pnp/types'
import { blockedSetsOf, boardDimsOf, boardPnpOf } from '@/components/jobs/functions'
import type { JobDims } from '@/components/jobs/types'
import { makeT } from '@/lib/i18n'
import { isOfferList } from '@/lib/jobs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mart = <T>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/mart/${name}.json`), 'utf8'))

/**
 * 全国通道对照(data/mart 真表;2026-09-28 通道表批二起前端五张对照常量退役,抽选高亮 / 门槛流 / 配额键 / 省默认通道都读这张表)。
 */
const PATHWAYS = mart<PnpPathway>('pathways')

/** 有省默认通道的省码(职位板从事实索引拿、弹框从通道表现算的那一份) */
const DEFAULTS = pnpDefaultProvsOf(PATHWAYS)

/** 本岗走的那条通道(与 PnpListSection 同一条路) */
function chanOf(j: PnpJob): PnpPathway | null {
  return pnpChannelOf({ job: j, pathways: PATHWAYS })
}

/** 本岗对应的抽选组(先认本岗通道,再取它的 drawStreams) */
function hitsOf(j: PnpJob): string[] {
  return drawHitStreamsOf(chanOf(j))
}

function job(p: Partial<PnpJob>): PnpJob {
  return {
    id: 1, province: '', noc: '', teer: 1, pnpEligible: true, pnpStream: '', pnpBlock: '', eeCategory: '', company: '',
    aip: false,
    salaryAnnual: null, wageMedAnnual: null, lmiaPositions: null, lmiaPositionsSkilled: null, lmiaLastQuarter: '',
    ...p,
  }
}

function occ(p: Partial<PnpOcc>): PnpOcc {
  return {
    province: '', stream: '', label: '', type: 'indemand', program: 'PNP', noc: '', name: '', gtaRestricted: false,
    url: '', fetched: '', appliesTo: '', ...p,
  }
}

function draw(p: Partial<PnpDraw>): PnpDraw {
  return {
    province: '', kind: 'draw', drawDate: '2026-09-01', stream: 'S', streamZh: '', score: 60, invitations: 10,
    note: '', label: '', url: '', selection: '', ...p,
  }
}

/**
 * 弹框拿整表自己出卡:本省抽选卡(三种形之一),或清单卡(与 PnpListSection 的两道判据逐字同一组函数;
 * 「本岗能走的通道」卡只是抬头,不算)
 */
function modalHasCards(j: PnpJob, o: PnpOcc[], d: PnpDraw[]): boolean {
  const cards = shownStreamsOf({ match: pnpMatchOf({ job: j, occ: o }), noc: j.noc, eligible: j.pnpEligible })
  return hasProvDraws({ province: j.province, draws: d }) || cards.length > 0
}

/** 格子凭首屏事实索引判(职位板 pnpActiveOf 里的第二道);索引可预先算好传进来 */
function cellSaysCards(j: PnpJob, o: PnpOcc[], d: PnpDraw[], pre?: PnpFactsIndex): boolean {
  const index = pre ?? pnpFactsIndexOf({ occ: o, draws: d, pathways: PATHWAYS })
  return pnpFactsShownOf({ province: j.province, noc: j.noc, stream: j.pnpStream, eligible: j.pnpEligible, index })
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
  appliesTo: fc.constantFrom('', 'OID/EE', 'Employment Offer'),
}).map((r) => occ(r))

// 2026-09-26 加一个只到月的日期('2026-07',NS 月度选取人数那种行):按月形与分组形的分界也进性质检查
const drawArb = fc.record({
  province: fc.constantFrom(...PROVS, 'FED'),
  kind: fc.constantFrom('draw', 'notice'),
  drawDate: fc.constantFrom('', '2026-01-15', '2026-07-01', '2026-07'),
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
    const index = pnpFactsIndexOf({ occ: o, draws: d, pathways: PATHWAYS })
    // 数据口径:真数据里「按清单行算的排除键」(格子红字)与「按弹框分组算的排除键」(弹框排除清单卡)一个不差 ——
    // 哪天出了同名清单混两种类型的行,这一条先红。
    expect(new Set(index.excluded)).toEqual(pnpBlockedKeysOf(o).pnp)
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
  it('排除键装回集合 = pnpBlockedKeysOf 现算', () => {
    fc.assert(fc.property(fc.array(occArb, { maxLength: 40 }), fc.array(drawArb, { maxLength: 10 }), (o, d) => {
      const dims = { pnpOccupations: o, pnpDraws: d, pathways: PATHWAYS } as unknown as JobDims
      const got = blockedSetsOf(boardPnpOf(dims))
      const want = pnpBlockedKeysOf(o)
      expect([...got.pnp].sort()).toEqual([...want.pnp].sort())
      expect([...got.aip].sort()).toEqual([...want.aip].sort())
      expect(boardPnpOf(dims).index).toEqual(pnpFactsIndexOf({ occ: o, draws: d, pathways: PATHWAYS }))
    }), { numRuns: 500 })
  })

  it('boardDimsOf 只把三张整表换成空表(清单、抽选,2026-09-28 起加通道对照),其余逐格同一引用', () => {
    const full = {
      provinces: [{}], cities: [{}], districts: [{}], nocCategories: [{}], sources: [{}], experienceLevels: [{}],
      pnpOccupations: [occ({ province: 'SK' })], pnpDraws: [draw({ province: 'BC' })], pathways: PATHWAYS, eeCategories: [{}], eeBroads: [{}],
      designatedEmployers: [{}], nocDescriptions: [{}], occupations: [{}], fieldSources: [{}], news: [{}],
    } as unknown as JobDims
    const slim = boardDimsOf(full)
    expect(Object.keys(slim).sort()).toEqual(Object.keys(full).sort())
    for (const k of Object.keys(full) as (keyof JobDims)[]) {
      if (k === 'pnpOccupations' || k === 'pnpDraws' || k === 'pathways') {
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
    expect(shownStreamsOf({ match: m, noc: '72310', eligible: true }).map((s: PnpStream) => s.label)).toEqual(['NS 建筑'])
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

  // 2026-09-26 同日「补完整」改判:安省改制后有官方公告 → 出现状卡(最新公告 / 已发邀请),原先这里「无卡」;
  // 改制后一条公告都没有照旧无卡,旧通道的 4 月抽选照旧不列
  it('安省改制:旧抽选不列;改制后有公告 → 现状卡(有卡),没有公告 → 无卡', () => {
    const old = draw({ province: 'ON', drawDate: '2026-04-23' })
    const draws = [old, draw({ province: 'ON', kind: 'notice', drawDate: '2026-08-04' })]
    const on = job({ province: 'ON', noc: '21231', pnpStream: '' })
    expect(drawsFormOf({ province: 'ON', draws })).toBe('status')
    expect(hasProvDraws({ province: 'ON', draws })).toBe(true)
    expect(cellSaysCards(on, [], draws)).toBe(true)
    expect(drawsFormOf({ province: 'ON', draws: [old] })).toBe('none')
    expect(cellSaysCards(on, [], [old])).toBe(false)
  })

  it('MB 在需(参考信号清单):不当命中清单,但本省有抽选卡 → 有卡', () => {
    const o = [occ({ province: 'MB', label: 'MB 在需职业', noc: '65200' })]
    const d = [draw({ province: 'MB', drawDate: '2026-09-24', stream: 'Skilled Worker in Manitoba' })]
    const mb = job({ province: 'MB', noc: '65200', pnpStream: '' })
    expect(pnpMatchOf({ job: mb, occ: o }).matched).toBeNull()
    expect(shownStreamsOf({ match: pnpMatchOf({ job: mb, occ: o }), noc: '65200', eligible: true })).toEqual([])
    expect(cellSaysCards(mb, o, d)).toBe(true)
  })

  it('SK 排除清单点名(不可提名的岗):弹框出那张排除清单 → 有卡;SK 现有工签:无清单无抽选 → 无卡', () => {
    const o = [occ({ province: 'SK', label: 'SK 主线不合格清单', type: 'ineligible', noc: '65201' })]
    const excluded = job({ province: 'SK', noc: '65201', pnpStream: '', pnpEligible: false })
    const ewp = job({ province: 'SK', noc: '73300', pnpStream: 'SK 现有工签' })
    expect(shownStreamsOf({ match: pnpMatchOf({ job: excluded, occ: o }), noc: '65201', eligible: false }).map((s) => s.label))
      .toEqual(['SK 主线不合格清单'])
    expect(cellSaysCards(excluded, o, [])).toBe(true)
    expect(cellSaysCards(ewp, o, [])).toBe(false)
  })

  // 2026-09-27 九省体检:SK 主线不合格表只管 OID / EE(appliesTo),兼职 / 合同这类不可提名的 SK 岗原先把它当排除原因(255 条)
  it('SK 主线不合格表只管 OID / EE:不可提名的岗也不拿它当排除原因,格子与弹框同一把尺子;Job Offer 表照挡', () => {
    const oid = occ({ province: 'SK', label: 'SK 主线不合格清单', type: 'ineligible', noc: '64100', appliesTo: 'OID/EE' })
    const offer = occ({ province: 'SK', label: 'SK Job Offer 不合格清单', type: 'ineligible', noc: '65201',
      appliesTo: 'Employment Offer' })
    const part = job({ province: 'SK', noc: '64100', pnpStream: '', pnpEligible: false })
    expect(shownStreamsOf({ match: pnpMatchOf({ job: part, occ: [oid, offer] }), noc: '64100', eligible: false })).toEqual([])
    expect(cellSaysCards(part, [oid, offer], [])).toBe(false)
    const cook = job({ province: 'SK', noc: '65201', pnpStream: '', pnpEligible: false })
    expect(shownStreamsOf({ match: pnpMatchOf({ job: cook, occ: [oid, offer] }), noc: '65201', eligible: false })
      .map((s) => s.label)).toEqual(['SK Job Offer 不合格清单'])
    expect([...pnpBlockedKeysOf([oid, offer]).pnp]).toEqual(['SK|65201'])
    expect([isOfferList(''), isOfferList('Employment Offer'), isOfferList('OID/EE')]).toEqual([true, true, false])
    // 同批:NS 建筑那组(按月选取,NSNP 各流与 AIP 同一个 EOI 池)原先没登记,点进来不高亮
    expect(hitsOf(job({ province: 'NS', noc: '72310', pnpStream: 'NS 建筑' }))).toEqual(['Monthly EOI selections'])
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
      pnpDrawGroupsOf({ t: makeT(lang), lang, province: 'BC', draws, hitStreams: [], genDraw: genDrawOf({ province: 'BC', pathways: PATHWAYS }) }).map((g) => g.rounds)
    expect(rounds('en', one)).toEqual(['1 round'])
    expect(rounds('en', two)).toEqual(['2 rounds'])
    expect(rounds('zh', one)).toEqual(['1 轮'])
    expect(rounds('zh', two)).toEqual(['2 轮'])
    expect(rounds('ko', one)).toEqual(['1회'])
  })

  // 2026-09-27 九省体检:轮数原先数行 —— MB Skilled Worker in Manitoba 9 期数成 19 轮、BC Innovate 10 次数成 20 轮
  it('轮数数不同的抽选日期:同一天分几行记的算一轮;各行照旧逐行列出,人数带千分位', () => {
    const sw = 'Skilled Worker in Manitoba'
    const d = [draw({ province: 'MB', stream: sw, drawDate: '2026-09-24', score: null, invitations: 16 }),
      draw({ province: 'MB', stream: sw, drawDate: '2026-09-24', score: 760, invitations: 417 }),
      draw({ province: 'MB', stream: sw, drawDate: '2026-09-24', score: null, invitations: 1 }),
      draw({ province: 'MB', stream: sw, drawDate: '2026-09-10', score: null, invitations: 1874 })]
    const g = pnpDrawGroupsOf({ t: makeT('zh'), lang: 'zh', province: 'MB', draws: d, hitStreams: [], genDraw: genDrawOf({ province: 'MB', pathways: PATHWAYS }) })
    expect(g.map((x) => x.rounds)).toEqual(['2 轮'])
    expect(g[0]?.rows.map((r) => r.inv).sort()).toEqual(['1 份邀请', '1,874 份邀请', '16 份邀请', '417 份邀请'])
    const en = pnpDrawGroupsOf({ t: makeT('en'), lang: 'en', province: 'MB', draws: d.slice(0, 3), hitStreams: [], genDraw: genDrawOf({ province: 'MB', pathways: PATHWAYS }) })
    expect(en.map((x) => x.rounds)).toEqual(['1 round'])
  })
})

describe('补完整(2026-09-26):抽选卡三种形、本岗那一组、排除卡只给不可提名、通道卡', () => {
  const zh = makeT('zh')
  const en = makeT('en')
  const ko = makeT('ko')
  const AOS = 'Alberta Opportunity Stream'
  // 手写金标:09-26 实查 data/mart/pnp_draws.json 阿省机会通道最近五轮(06-17 那轮在 90 天窗口外)
  // 09-26 晚窗口统计撤,五轮仍是组头(最近一轮带分的)与轮数的金标;来源 = 阿省抽选页(阿省 80 轮同这一页)
  const AB_SRC = 'https://www.alberta.ca/aaip-processing-information'
  const ab = [
    draw({ province: 'AB', label: 'AAIP', stream: AOS, drawDate: '2026-09-23', score: 58, invitations: 113, url: AB_SRC }),
    draw({ province: 'AB', label: 'AAIP', stream: AOS, drawDate: '2026-09-01', score: 56, invitations: 575, url: AB_SRC }),
    draw({ province: 'AB', label: 'AAIP', stream: AOS, drawDate: '2026-08-14', score: 58, invitations: 743, url: AB_SRC }),
    draw({ province: 'AB', label: 'AAIP', stream: AOS, drawDate: '2026-07-15', score: 53, invitations: 833, url: AB_SRC }),
    draw({ province: 'AB', label: 'AAIP', stream: AOS, drawDate: '2026-06-17', score: 58, invitations: 720, url: AB_SRC }),
    draw({ province: 'AB', label: 'AAIP', stream: 'Rural Renewal Stream', drawDate: '2026-08-11', score: 51, invitations: 30, url: AB_SRC }),
  ]
  const headOf = (g: { key: string, hit: boolean, score: string, date: string, rounds: string }) =>
    [g.key, g.hit, g.score, g.date, g.rounds]

  it('阿省机会通道(本岗那一组):与其余组同一种组头行,排最前、标命中;来源在标题右端(三语一条)', () => {
    const card = drawCardOf({ t: zh, lang: 'zh', province: 'AB', draws: ab, hitStreams: [AOS], genDraw: genDrawOf({ province: 'AB', pathways: PATHWAYS }) })
    expect(card?.title).toBe('本省抽选')
    expect(card?.label).toBe('AAIP')
    expect(card?.total).toBe(2)
    expect(card?.hits.map(headOf)).toEqual([[AOS, true, '最低 58 分', '2026-09-23', '5 轮']])
    expect(card?.hits[0]?.rows.length).toBe(5)
    // 2026-09-27 Frank 选「不拆,去重复」:组里各轮是同一个流,组头已写,展开行不再逐行重复通道名
    expect(card?.hits[0]?.rows.map((r) => r.stream)).toEqual(['', '', '', '', ''])
    expect(card?.others.map(headOf)).toEqual([['Rural Renewal Stream', false, '最低 51 分', '2026-08-11', '1 轮']])
    expect(card?.source).toEqual({ text: '来源 ↗', href: AB_SRC })
    const e = drawCardOf({ t: en, lang: 'en', province: 'AB', draws: ab, hitStreams: [AOS], genDraw: genDrawOf({ province: 'AB', pathways: PATHWAYS }) })
    expect(e?.hits.map(headOf)).toEqual([[AOS, true, 'min 58', '2026-09-23', '5 rounds']])
    expect(e?.source).toEqual({ text: 'Source ↗', href: AB_SRC })
    expect(drawCardOf({ t: ko, lang: 'ko', province: 'AB', draws: ab, hitStreams: [AOS], genDraw: genDrawOf({ province: 'AB', pathways: PATHWAYS }) })?.source?.text).toBe('출처 ↗')
  })

  it('开关文案:收着「查看全省 N 组」,开着「收起」;对不上本岗那一组时没有命中行,来源照旧', () => {
    expect(allGroupsLabelOf({ t: zh, open: false, total: 13, label: 'AAIP' })).toBe('查看全省 13 组 ▾')
    expect(allGroupsLabelOf({ t: en, open: false, total: 13, label: 'AAIP' })).toBe('All 13 AAIP streams ▾')
    expect(allGroupsLabelOf({ t: zh, open: true, total: 13, label: 'AAIP' })).toBe('收起 ▴')
    const none = drawCardOf({ t: zh, lang: 'zh', province: 'AB', draws: ab, hitStreams: [], genDraw: genDrawOf({ province: 'AB', pathways: PATHWAYS }) })
    expect(none?.hits).toEqual([])
    expect(none?.others.length).toBe(2)
    expect(none?.source?.href).toBe(AB_SRC)
  })

  it('没公布分的本岗那组:组头写那一轮的人数(AIP 写份申请入选),标命中;认不出站名不出来源', () => {
    const one = [draw({ province: 'NB', stream: 'AIP', drawDate: '2026-09-10', score: null, invitations: 40 })]
    const aipZh = drawCardOf({ t: zh, lang: 'zh', province: 'NB', draws: one, hitStreams: ['AIP'], genDraw: genDrawOf({ province: 'NB', pathways: PATHWAYS }) })
    expect(aipZh?.hits.map(headOf)).toEqual([['AIP', true, '40 份申请入选', '2026-09-10', '1 轮']])
    expect(aipZh?.hits[0]?.noScore).toBe(true)
    expect(aipZh?.source).toBeNull()
    const aipEn = drawCardOf({ t: en, lang: 'en', province: 'NB', draws: one, hitStreams: ['AIP'], genDraw: genDrawOf({ province: 'NB', pathways: PATHWAYS }) })
    expect(aipEn?.hits.map(headOf)).toEqual([['AIP', true, '40 selected', '2026-09-10', '1 round']])
  })

  it('NS 按月选取人数:日期到月、写「入选」、人数没公布的月不列;不进按轮分组,自成按月一组(计数写「个月」)', () => {
    const src = 'https://liveinnovascotia.com/eoi-selection'
    const month = (drawDate: string, invitations: number | null) => draw({
      province: 'NS', label: 'NSNP + AIP', stream: 'Monthly EOI selections', drawDate, score: null, invitations, url: src,
    })
    const ns = [month('2026-06', 531), month('2026-07', 671), month('2026-08', null)]
    expect(drawsFormOf({ province: 'NS', draws: ns })).toBe('monthly')
    expect(monthRowsOf({ province: 'NS', draws: ns }).map((d) => d.drawDate)).toEqual(['2026-07', '2026-06'])
    expect(pnpDrawGroupsOf({ t: zh, lang: 'zh', province: 'NS', draws: ns, hitStreams: [], genDraw: genDrawOf({ province: 'NS', pathways: PATHWAYS }) })).toEqual([])
    const hitNs = hitsOf(job({ province: 'NS', noc: '72310', pnpEligible: true }))
    expect(hitNs).toEqual(['Monthly EOI selections'])
    const card = drawCardOf({ t: zh, lang: 'zh', province: 'NS', draws: ns, hitStreams: hitNs, genDraw: genDrawOf({ province: 'NS', pathways: PATHWAYS }) })
    expect(card?.title).toBe('本省抽选')
    expect(card?.hits.map((g) => [g.key, g.hit, g.score, g.date, g.rounds, g.rows.length]))
      .toEqual([['Monthly EOI selections', true, '671 人入选', '2026-07', '2 个月', 2]])
    expect(card?.others).toEqual([])
    expect(card?.source).toEqual({ text: '来源 ↗', href: src })
    const en1 = drawCardOf({ t: en, lang: 'en', province: 'NS', draws: [ns[1]!], hitStreams: hitNs, genDraw: genDrawOf({ province: 'NS', pathways: PATHWAYS }) })
    expect(en1?.hits.map((g) => [g.score, g.rounds])).toEqual([['671 selected', '1 month']])
    // 不可提名的 NS 岗:同一组照出,不标命中
    const cold = drawCardOf({ t: zh, lang: 'zh', province: 'NS', draws: ns, hitStreams: [], genDraw: genDrawOf({ province: 'NS', pathways: PATHWAYS }) })
    expect(cold?.hits).toEqual([])
    expect(cold?.others.map((g) => g.hit)).toEqual([false])
    // 探针:同一省换成带日的轮次就走分组形 —— 按月与分组的分界是日期形,不是省码
    const daily = [draw({ province: 'NS', stream: 'Monthly EOI selections', drawDate: '2026-07-15', score: null, invitations: 5 })]
    expect(drawsFormOf({ province: 'NS', draws: daily })).toBe('groups')
  })

  // 同日 lead 定:那一行的标签用通用的「最新公告」(复用 tl.tabNews),不写「EOI 注册开放」—— 公告行是更新页的最新一条,会换
  // 2026-09-27 Frank 勾「安省改一行组头」:两格横排改成与其余省同一种组头行,名字 = 通道卡那个通用通道名
  it('安省改制现状:一行组头(名字同通道卡),没抽选写「暂无邀请」、日期 = 最新公告日(悬停出原句);有了写那一轮', () => {
    const note = 'portal now open to Ontario Workforce Priority Stream expressions of interest'
    const url = 'https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp-invitations-apply'
    const on = [
      draw({ province: 'ON', label: 'OINP', drawDate: '2026-04-23', stream: 'Employer Job Offer: Foreign Worker stream', url }),
      draw({ province: 'ON', label: 'OINP', kind: 'notice', drawDate: '2026-08-04', stream: '', score: null, invitations: null, note, url }),
    ]
    expect(drawsFormOf({ province: 'ON', draws: on })).toBe('status')
    expect(drawGroupsShownOf('status')).toBe(true)
    const hitOn = hitsOf(job({ province: 'ON', noc: '63200', pnpEligible: true }))
    expect(hitOn).toEqual(['Ontario Workforce Priority Stream'])
    const card = drawCardOf({ t: zh, lang: 'zh', province: 'ON', draws: on, hitStreams: hitOn, genDraw: genDrawOf({ province: 'ON', pathways: PATHWAYS }) })
    expect(card?.title).toBe('本省抽选')
    expect(card?.source).toEqual({ text: '来源 ↗', href: url })
    expect(card?.others).toEqual([])
    expect(card?.hits.map((g) => [g.name, g.sub, g.score, g.date, g.rounds, g.expandable, g.tip]))
      .toEqual([['Ontario Workforce Priority Stream', 'ON 劳动力优先', '暂无邀请', '2026-08-04', '', false, note]])
    const enCard = drawCardOf({ t: en, lang: 'en', province: 'ON', draws: on, hitStreams: hitOn, genDraw: genDrawOf({ province: 'ON', pathways: PATHWAYS }) })
    expect(enCard?.hits.map((g) => [g.name, g.sub, g.score])).toEqual([['Ontario Workforce Priority Stream', '', 'No invitations yet']])
    expect(drawCardOf({ t: ko, lang: 'ko', province: 'ON', draws: on, hitStreams: hitOn, genDraw: genDrawOf({ province: 'ON', pathways: PATHWAYS }) })?.hits[0]?.score).toBe('아직 초청 없음')
    // 改制前的旧通道轮次不出;改制后有了抽选就写那一轮
    const after = [...on, draw({ province: 'ON', label: 'OINP', drawDate: '2026-10-01', stream: 'Ontario Workforce Priority' })]
    expect(drawCardOf({ t: zh, lang: 'zh', province: 'ON', draws: after, hitStreams: hitOn, genDraw: genDrawOf({ province: 'ON', pathways: PATHWAYS }) })?.hits
      .map((g) => [g.score, g.date, g.rounds, g.rows.length])).toEqual([['最低 60 分', '2026-10-01', '1 轮', 1]])
    // 不可提名的安省岗:同一行照出,不标命中
    expect(drawCardOf({ t: zh, lang: 'zh', province: 'ON', draws: on, hitStreams: [], genDraw: genDrawOf({ province: 'ON', pathways: PATHWAYS }) })?.others.map((g) => g.hit)).toEqual([false])
  })

  // 2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」「全年已邀请合计」:手写金标 = 当天线上 pnp_ops_stats 实数
  it('「年配额」卡:只列官方有的项;阿省到通道;官方原数不自己减;截至日照写;对不上通道 / 没数据就不出', () => {
    const url = 'https://www.alberta.ca/aaip-processing-information'
    const op = (p: Partial<PnpOps>): PnpOps => ({
      province: 'AB', metric: 'allocation', scopeKind: '', streamKey: '', value: 0, asOf: '2026-09-23', period: '', url, ...p,
    })
    const aos = 'alberta opportunity stream'
    const ops = [
      op({ value: 6603 }), op({ metric: 'issued', value: 5221 }), op({ metric: 'remaining', value: 1382 }),
      op({ scopeKind: 'stream', streamKey: aos, value: 3562 }), op({ metric: 'issued', scopeKind: 'stream', streamKey: aos, value: 2911 }),
      op({ metric: 'remaining', scopeKind: 'stream', streamKey: aos, value: 651 }),
      op({ province: 'MB', value: 8000, asOf: '', period: '2026', url: 'https://immigratemanitoba.com/x' }),
      op({ province: 'MB', metric: 'nominations_ytd', value: 3777, asOf: '', period: '2026 Jan-Aug' }),
      op({ province: 'ON', value: 14119, asOf: '', period: '2026', url: 'https://www.ontario.ca/page/x' }),
    ]
    const ab = quotaCardOf({ t: zh, province: 'AB', ops, hitStreams: ['Alberta Opportunity Stream'], quotaKey: '' })
    expect(ab?.title).toBe('2026 年配额')
    expect(ab?.heads).toEqual(['总数', '已发提名', '剩余'])
    expect(ab?.rows.map((r) => [r.label, r.cells])).toEqual([
      ['全省', ['6,603', '5,221', '1,382']], ['本岗通道', ['3,562', '2,911', '651']],
    ])
    expect(ab?.asOfLines).toEqual(['截至 2026-09-23'])
    expect(ab?.source).toEqual({ text: '来源 ↗', href: url })
    const abEn = quotaCardOf({ t: en, province: 'AB', ops, hitStreams: ['Alberta Opportunity Stream'], quotaKey: '' })
    expect([abEn?.title, abEn?.heads, abEn?.asOfLines]).toEqual(['2026 allocation', ['Total', 'Nominated', 'Remaining'], ['As of 2026-09-23']])
    // 2026-09-27 九省体检:阿省医护 / 科技 / 警务三条抽选组名与配额通道名不同字,按具名通道查人工对照表(QUOTA_STREAM_KEYS)
    const dhc = 'dedicated health care pathways'
    const withDhc = [...ops, op({ scopeKind: 'stream', streamKey: dhc, value: 518 }),
      op({ metric: 'issued', scopeKind: 'stream', streamKey: dhc, value: 331 }),
      op({ metric: 'remaining', scopeKind: 'stream', streamKey: dhc, value: 187 })]
    const health = quotaCardOf({ t: zh, province: 'AB', ops: withDhc, quotaKey: quotaKeyOf(chanOf(job({ province: 'AB', pnpStream: 'AB 医疗' }))),
      hitStreams: ['Dedicated Health Care Pathway – Express Entry', 'Dedicated Health Care Pathway – non-Express Entry'] })
    expect(health?.rows.map((r) => [r.label, r.cells])).toEqual([
      ['全省', ['6,603', '5,221', '1,382']], ['本岗通道', ['518', '331', '187']],
    ])
    // 本岗那组对不上通道键(旅游酒店没有通道级行):只出全省一行,不拿近似名硬配
    expect(quotaCardOf({ t: zh, province: 'AB', ops, hitStreams: ['Tourism and Hospitality Stream'], quotaKey: '' })?.rows.length).toBe(1)
    // 曼省:总数 + 年初至今已发(另一个指标名),没有剩余就不出那一列;官方没写截至日就不出那一行
    const mb = quotaCardOf({ t: zh, province: 'MB', ops, hitStreams: [], quotaKey: '' })
    expect([mb?.heads, mb?.rows[0]?.cells, mb?.asOfLines]).toEqual([['总数', '已发提名'], ['8,000', '3,777'], []])
    // 安省:只有总数就只一列
    expect(quotaCardOf({ t: zh, province: 'ON', ops, hitStreams: [], quotaKey: '' })?.rows[0]?.cells).toEqual(['14,119'])
    expect(quotaCardOf({ t: zh, province: 'NL', ops, hitStreams: [], quotaKey: '' })).toBeNull()
  })

  // 2026-09-27 Frank「已发和总数放到一个卡片里可以吗」「你帮我弄」:抽选卡标题下那行全年合计并进配额卡当一列;金标 = 当天线上 pnp_ops_stats 实数
  it('「年配额」卡并入全年已发邀请 / 已入选:排在已有项之后;截至日跟会动的那一项;只有合计的省只一列', () => {
    const q = (p: Partial<PnpOps>): PnpOps => ({
      province: 'ON', metric: 'allocation', scopeKind: '', streamKey: '', value: 0, asOf: '', period: '2026',
      url: 'https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-allocation', ...p,
    })
    const nbUrl = 'https://www.gnb.ca/en/topic/family-home-community/immigration/invitation-selection-rounds.html'
    const ops = [
      q({ value: 14119 }), q({ metric: 'invitations_ytd', value: 13105, asOf: '2026-04-30', url: 'https://www.ontario.ca/page/x' }),
      q({ province: 'NS', value: 2344 }), q({ province: 'NS', metric: 'selections_ytd', value: 3242, asOf: '2026-07' }),
      q({ province: 'NB', metric: 'invitations_ytd', value: 3538, asOf: '2026-09-18', url: nbUrl }),
    ]
    const on = quotaCardOf({ t: zh, province: 'ON', ops, hitStreams: [], quotaKey: '' })
    // 2026-09-27 Frank「已发 提名 和 已发邀请是什么意思」:列名改「已邀请申请」
    // 2026-09-29 Frank「已邀请申请改成已发邀请吧」:改回「已发邀请」
    expect([on?.title, on?.heads, on?.rows.map((r) => r.cells), on?.asOfLines]).toEqual([
      '2026 年配额', ['总数', '已发邀请'], [['14,119', '13,105']], ['截至 2026-04-30'],
    ])
    // 来源照旧跟第一列(总数那一页);邀请合计的出处是下面抽选卡那个来源
    expect(on?.source?.href).toBe('https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-allocation')
    expect(quotaCardOf({ t: en, province: 'ON', ops, hitStreams: [], quotaKey: '' })?.heads).toEqual(['Total', 'Invited to apply'])
    expect(quotaCardOf({ t: ko, province: 'ON', ops, hitStreams: [], quotaKey: '' })?.heads).toEqual(['총', '신청 초청'])
    const ns = quotaCardOf({ t: zh, province: 'NS', ops, hitStreams: [], quotaKey: '' })
    // 2026-09-27 九省体检:NS 的已入选是 EOI 池合计(NSNP 与 AIP 同池),旁边的总数只算 NSNP —— 列名注明含 AIP
    expect([ns?.heads, ns?.rows[0]?.cells, ns?.asOfLines]).toEqual([['总数', '已入选(含 AIP)'], ['2,344', '3,242'], ['截至 2026-07']])
    // NB 没有配额只有合计:卡照出,只这一列,来源是抽选页
    const nb = quotaCardOf({ t: zh, province: 'NB', ops, hitStreams: [], quotaKey: '' })
    expect([nb?.title, nb?.heads, nb?.rows[0]?.cells, nb?.asOfLines, nb?.source?.href]).toEqual([
      '2026 年配额', ['已发邀请'], ['3,538'], ['截至 2026-09-18'], nbUrl,
    ])
  })

  // 2026-09-27 Frank「这个截止日期放到右下角呢」:曼省补上全年已邀请后两项截至日分叉(提名截至 08 月、邀请截至 09-24),逐列写;
  // 总数是全年定数,它那一格的截至日不写。金标 = 当天线上 pnp_ops_stats 实数
  it('「年配额」卡截至行:各列一致写一行;分叉逐列写「{列名}截至」;总数那一列不算', () => {
    const m = (p: Partial<PnpOps>): PnpOps => ({
      province: 'MB', metric: 'allocation', scopeKind: '', streamKey: '', value: 8000, asOf: '2026-08', period: '2026',
      url: 'https://immigratemanitoba.com/resources/data/monthly-data-2026', ...p,
    })
    const ops = [m({}), m({ metric: 'nominations_ytd', value: 3777, period: '2026 Jan-Aug' }),
      m({ metric: 'invitations_ytd', value: 6883, asOf: '2026-09-24' })]
    const zhCard = quotaCardOf({ t: zh, province: 'MB', ops, hitStreams: [], quotaKey: '' })
    expect([zhCard?.heads, zhCard?.rows[0]?.cells, zhCard?.asOfLines]).toEqual([
      ['总数', '已发提名', '已发邀请'], ['8,000', '3,777', '6,883'], ['已发提名截至 2026-08', '已发邀请截至 2026-09-24'],
    ])
    expect(quotaCardOf({ t: en, province: 'MB', ops, hitStreams: [], quotaKey: '' })?.asOfLines)
      .toEqual(['Nominated as of 2026-08', 'Invited to apply as of 2026-09-24'])
    // 同一天就只写一行(总数自己的截至日不参与)
    const same = [m({ asOf: '2026-01' }), m({ metric: 'nominations_ytd', value: 3777 }), m({ metric: 'invitations_ytd', value: 6883 })]
    expect(quotaCardOf({ t: zh, province: 'MB', ops: same, hitStreams: [], quotaKey: '' })?.asOfLines).toEqual(['截至 2026-08'])
  })

  // 2026-09-27 Frank「这个数据怎么回事」「BC 也有这个问题」「照改,加这一列」:同一组同一天几行各写是哪一项(数据层 selection 短码);
  // 组头的分数只在对整组成立时出(BC 分数档对整组成立,曼省的分只属于某大类高分者)。金标 = 线上当天 MB #280、BC 09-24、NB 路径
  it('抽选卡展开行写是哪一项选取;组头分数只在对整组成立时出;只有一种选取的组不写', () => {
    const sw = 'Skilled Worker in Manitoba'
    const mb = [draw({ province: 'MB', stream: sw, drawDate: '2026-09-24', score: null, invitations: 1, selection: 'occ' }),
      draw({ province: 'MB', stream: sw, drawDate: '2026-09-24', score: 760, invitations: 417, selection: 'top:2' }),
      draw({ province: 'MB', stream: sw, drawDate: '2026-09-24', score: null, invitations: 16, selection: 'franco' }),
      draw({ province: 'MB', stream: sw, drawDate: '2026-09-10', score: 825, invitations: 508, selection: 'grad' }),
      draw({ province: 'MB', stream: sw, drawDate: '2026-08-27', score: 731, invitations: 600, selection: 'top:72' })]
    const g = pnpDrawGroupsOf({ t: zh, lang: 'zh', province: 'MB', draws: mb, hitStreams: [sw], genDraw: genDrawOf({ province: 'MB', pathways: PATHWAYS }) })[0]
    expect(g?.score).toBe('')
    expect(g?.rows.map((r) => r.stream).sort()).toEqual(['定向职业', '曼省毕业', '法语', '高分者(技工类)', '高分者(理工类)'].sort())
    const inv = 'Innovate: High Economic Impact'
    const bc = [draw({ province: 'BC', stream: inv, drawDate: '2026-09-24', score: null, invitations: 426, selection: 'wage:52:105000' }),
      draw({ province: 'BC', stream: inv, drawDate: '2026-09-24', score: 131, invitations: 288, selection: 'points' })]
    const b = pnpDrawGroupsOf({ t: zh, lang: 'zh', province: 'BC', draws: bc, hitStreams: [inv], genDraw: genDrawOf({ province: 'BC', pathways: PATHWAYS }) })[0]
    expect(b?.score).toBe('最低 131 分')
    expect(b?.rows.map((r) => r.stream).sort()).toEqual(['按分数', '时薪 ≥ $52 且年薪 ≥ $105,000'].sort())
    const bEn = pnpDrawGroupsOf({ t: en, lang: 'en', province: 'BC', draws: bc, hitStreams: [inv], genDraw: genDrawOf({ province: 'BC', pathways: PATHWAYS }) })[0]
    expect(bEn?.rows.map((r) => r.stream).sort()).toEqual(['By score', 'Wage ≥ $52/hr and $105,000/yr'].sort())
    const nbw = 'NB Skilled Worker'
    const nb = [draw({ province: 'NB', stream: nbw, drawDate: '2026-09-18', score: null, invitations: 120, selection: 'path:exp+prio' }),
      draw({ province: 'NB', stream: nbw, drawDate: '2026-09-18', score: null, invitations: 77, selection: 'path:grad' })]
    const n = pnpDrawGroupsOf({ t: zh, lang: 'zh', province: 'NB', draws: nb, hitStreams: [], genDraw: genDrawOf({ province: 'NB', pathways: PATHWAYS }) })[0]
    expect(n?.rows.map((r) => r.stream).sort()).toEqual(['NB 工作经验、NB 优先', 'NB 毕业生'].sort())
    // 只有一种选取(BC 医疗定向那种每轮都是分数档):不写,组头分数照出
    const care = [draw({ province: 'BC', stream: 'Care: Health', drawDate: '2026-09-10', score: 76, invitations: 50, selection: 'points' }),
      draw({ province: 'BC', stream: 'Care: Health', drawDate: '2026-08-20', score: 80, invitations: 40, selection: 'points' })]
    const c = pnpDrawGroupsOf({ t: zh, lang: 'zh', province: 'BC', draws: care, hitStreams: [], genDraw: genDrawOf({ province: 'BC', pathways: PATHWAYS }) })[0]
    expect([c?.score, c?.rows.map((r) => r.stream)]).toEqual(['最低 76 分', ['', '']])
    // 认不出的短码不猜:写空;大类名词条里没有的只写「高分者」
    const odd = [draw({ province: 'MB', stream: sw, drawDate: '2026-07-01', score: null, invitations: 3, selection: 'zzz' }),
      draw({ province: 'MB', stream: sw, drawDate: '2026-07-01', score: 700, invitations: 9, selection: 'top:99' })]
    const o = pnpDrawGroupsOf({ t: zh, lang: 'zh', province: 'MB', draws: odd, hitStreams: [], genDraw: genDrawOf({ province: 'MB', pathways: PATHWAYS }) })[0]
    expect(o?.rows.map((r) => r.stream).sort()).toEqual(['', '高分者'].sort())
  })

  // 2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」:手写金标 = 当天 AB 门槛表实数(pnp ab-req.json + 汇装 offer 形态行)。
  // 同日 Frank「就门槛就只提门槛就行。不用提原文,不用提本岗」:卡上只列门槛(原句点开、本岗灰字撤)
  const AOS_URL = 'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility'
  const EMP_URL = 'https://www.alberta.ca/job-offer-and-employer-requirements'
  const req = (p: Partial<PnpReq>): PnpReq => ({
    province: 'AB', stream: 'AAIP Alberta Opportunity Stream', subject: 'applicant', factor: 'language', op: '>=',
    value: 5, unit: 'CLB', appliesTeer: '', appliesNoc: '', excludesNoc: '', appliesArea: '', appliesCondition: '', basis: '',
    url: AOS_URL,
    ...p,
  })
  const EMP = 'AAIP (job offer & employer requirements, all streams)'
  const EE = 'AAIP Alberta Express Entry Stream'
  const RR = 'AAIP Rural Renewal Stream'
  const abReqs: PnpReq[] = [
    req({ value: 5, appliesTeer: '0,1,2,3' }),
    req({ value: 4, appliesTeer: '4,5' }),
    req({ value: 7, appliesNoc: '33102' }),
    req({ factor: 'experience', value: 24, unit: 'months', basis: 'windowMonths=30' }),
    req({ factor: 'experience', value: 12, unit: 'months', appliesCondition: 'ab-local-experience', basis: 'windowMonths=18' }),
    req({ stream: EMP, subject: 'employer', factor: 'empYears', value: 2, unit: 'years', basis: 'fiscal', url: EMP_URL }),
    req({ stream: EMP, subject: 'employer', factor: 'empRevenue', value: 400000, unit: 'CAD/yr', url: EMP_URL }),
    req({ stream: EMP, subject: 'employer', factor: 'empStaff', value: 3, unit: 'employees', url: EMP_URL }),
    req({ stream: 'Job offer (all streams)', subject: 'offer', factor: 'offerForm', op: 'notIn', value: null, unit: '',
      basis: 'valueCode=part,seasonal,casual' }),
    req({ stream: EE, factor: 'eeProfile', op: 'rule', value: null, unit: '' }),
    req({ stream: EE, factor: 'eeProgram', op: 'rule', value: null, unit: '' }),
    req({ stream: EE, factor: 'crs', value: 300, unit: 'CRS' }),
    req({ stream: RR, factor: 'communityEndorsement', op: 'rule', value: null, unit: '' }),
    req({ stream: RR, factor: 'experience', value: 12, unit: 'months', basis: 'windowMonths=18' }),
    req({ stream: RR, value: 5, appliesTeer: '0,1,2,3' }),
    req({ stream: 'AAIP Tourism and Hospitality Stream', factor: 'experience', value: 6, unit: 'months', basis: 'employerTenure' }),
    req({ stream: 'AAIP Tourism and Hospitality Stream', value: 4 }),
    req({ province: 'BC', stream: 'BC PNP Skills Immigration', value: 4 }),
  ]
  const abJob = job({ province: 'AB', noc: '72310', teer: 2 })
  const gateOf = (card: ReturnType<typeof gateCardOf>) => card?.rows.map((r) => [r.label, r.lines])

  it('「本岗通道的门槛」卡:AB 机会通道四行(offer 形态 / 语言档 / 经验两款 / 雇主三项),只列门槛;来源同抽选卡的钮', () => {
    const card = gateCardOf({ t: zh, job: abJob, reqs: abReqs, channel: chanOf(abJob) })
    expect(card?.title).toBe('本岗通道的门槛')
    expect(card?.source).toEqual({ text: '来源 ↗', href: AOS_URL })
    expect(gateOf(card)).toEqual([
      ['雇主 offer', ['全职', '不收兼职、临时工、季节工']],
      ['语言', ['英语或法语每项 CLB 5']],
      ['工作经验', ['24 个月全职经验(近 30 个月内)', '或在本省 12 个月(近 18 个月内)']],
      ['雇主', ['在本省经营满 2 个财年', '年收入 ≥ $400,000', '全职员工 ≥ 3 人']],
    ])
    // 语言档:TEER 4 → CLB 4;职业码点名的 33102 → CLB 7(最具体,压过它的 TEER 3 档)
    expect(gateCardOf({ t: zh, job: job({ province: 'AB', noc: '72310', teer: 4 }), reqs: abReqs, channel: chanOf(job({ province: 'AB', noc: '72310', teer: 4 })) })?.rows[1]?.lines)
      .toEqual(['英语或法语每项 CLB 4'])
    expect(gateCardOf({ t: zh, job: job({ province: 'AB', noc: '33102', teer: 3 }), reqs: abReqs, channel: chanOf(job({ province: 'AB', noc: '33102', teer: 3 })) })?.rows[1]?.lines)
      .toEqual(['英语或法语每项 CLB 7'])
    const enCard = gateCardOf({ t: en, job: abJob, reqs: abReqs, channel: chanOf(abJob) })
    expect([enCard?.title, enCard?.rows.map((r) => r.label)]).toEqual(
      ['Stream requirements', ['Job offer', 'Language', 'Experience', 'Employer']])
    expect(enCard?.rows[0]?.lines).toEqual(['Full-time', 'Not part-time, casual, seasonal'])
    expect(enCard?.rows[3]?.lines).toEqual(['Operating in Alberta for 2+ fiscal years', 'Revenue ≥ $400,000', '≥ 3 full-time staff'])
    expect(gateCardOf({ t: ko, job: abJob, reqs: abReqs, channel: chanOf(abJob) })?.title).toBe('이 스트림의 요건')
  })

  it('门槛卡:科技专线出 EE 行、乡村振兴出社区推荐信、旅游酒店是同雇主在职;没登记对照 / 不可提名 / 本岗通道没有门槛行都不出卡', () => {
    const tech = gateCardOf({ t: zh, job: job({ ...abJob, pnpStream: 'AB 科技' }), reqs: abReqs, channel: chanOf(job({ ...abJob, pnpStream: 'AB 科技' })) })
    expect(gateOf(tech)).toEqual([
      ['雇主 offer', ['全职', '不收兼职、临时工、季节工']],
      ['EE', ['联邦 EE 档案', '符合 CEC、FSW 或 FST', 'CRS ≥ 300']],
      ['雇主', ['在本省经营满 2 个财年', '年收入 ≥ $400,000', '全职员工 ≥ 3 人']],
    ])
    const rural = gateCardOf({ t: zh, job: job({ ...abJob, pnpStream: 'AB 乡村振兴' }), reqs: abReqs, channel: chanOf(job({ ...abJob, pnpStream: 'AB 乡村振兴' })) })
    expect(rural?.rows.map((r) => r.key)).toEqual(['offer', 'lang', 'exp', 'emp', 'other'])
    expect(rural?.rows[2]?.lines).toEqual(['12 个月全职经验(近 18 个月内)'])
    expect(rural?.rows[4]?.lines).toEqual(['指定社区推荐信'])
    const tourism = gateCardOf({ t: zh, job: job({ ...abJob, teer: 5, pnpStream: 'AB 旅游酒店' }), reqs: abReqs, channel: chanOf(job({ ...abJob, teer: 5, pnpStream: 'AB 旅游酒店' })) })
    expect(tourism?.rows[1]?.lines).toEqual(['英语或法语每项 CLB 4'])
    expect(tourism?.rows[2]?.lines).toEqual(['在现雇主全职满 6 个月'])
    expect(gateCardOf({ t: zh, job: job({ province: 'BC', noc: '72310', teer: 2 }), reqs: abReqs, channel: chanOf(job({ province: 'BC', noc: '72310', teer: 2 })) })).toBeNull()
    expect(gateCardOf({ t: zh, job: job({ ...abJob, pnpEligible: false }), reqs: abReqs, channel: chanOf(job({ ...abJob, pnpEligible: false })) })).toBeNull()
    expect(gateCardOf({ t: zh, job: job({ ...abJob, pnpStream: 'BC 医疗' }), reqs: abReqs, channel: chanOf(job({ ...abJob, pnpStream: 'BC 医疗' })) })).toBeNull()
    // 登记了对照但门槛表里还没有这条流(换版窗口 / 抓挂了):只剩全省两行会读成门槛只有这些 —— 整卡不出
    expect(gateCardOf({ t: zh, job: job({ ...abJob, pnpStream: 'AB 医疗' }), reqs: abReqs, channel: chanOf(job({ ...abJob, pnpStream: 'AB 医疗' })) })).toBeNull()
    expect(gateCardOf({ t: zh, job: abJob, reqs: [], channel: chanOf(abJob) })).toBeNull()
  })

  // 2026-09-29 Frank「照这个做」(安省门槛卡,看过文字效果图):手写金标 = 当天 ON 门槛表实数(pnp on-req.json,补抓后 19 条)。
  // 通道对照表里安省还没挂门槛流(先上前端再挂),这里直接给本岗通道那一行。
  const ONW = 'Ontario Workforce Priority stream'
  const onReq = (p: Partial<PnpReq>): PnpReq => req({ province: 'ON', stream: ONW, url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream', ...p })
  const onReqs: PnpReq[] = [
    onReq({ value: 6, appliesTeer: '0,1,2,3' }),
    onReq({ value: 4, appliesTeer: '4,5' }),
    onReq({ value: 5, appliesTeer: '0,1,2,3', appliesNoc: '72,73,82,83,93,6320,62200', excludesNoc: '726,932' }),
    onReq({ factor: 'languageExempt', op: 'none', value: 3, unit: 'years', appliesTeer: '0,1,2,3' }),
    onReq({ factor: 'wage', value: null, unit: 'CAD/yr', basis: 'occMedian' }),
    onReq({ factor: 'wage', value: null, unit: 'CAD/yr', basis: 'occLow', appliesTeer: '0,1,2,3', appliesCondition: 'recent-on-graduate' }),
    onReq({ factor: 'experience', value: 6, unit: 'months', appliesTeer: '0,1,2,3', basis: 'employerTenure' }),
    onReq({ factor: 'experience', value: 3, unit: 'months', appliesTeer: '0,1,2,3', excludesNoc: '73300,73301',
      appliesCondition: 'recent-on-graduate', basis: 'employerTenure' }),
    onReq({ factor: 'experience', value: 9, unit: 'months', appliesTeer: '4,5', basis: 'employerTenure' }),
    onReq({ factor: 'experienceAlt', value: 2, unit: 'years', appliesTeer: '0,1,2,3', basis: 'sameNoc;windowYears=5' }),
    onReq({ factor: 'experienceAlt', op: 'none', value: null, unit: '', appliesTeer: '0,1,2,3', excludesNoc: '73300,73301',
      basis: 'licence' }),
    onReq({ subject: 'employer', factor: 'empYears', value: 3, unit: 'years' }),
    onReq({ subject: 'employer', factor: 'empRevenue', value: 1000000, unit: 'CAD/yr', appliesArea: 'gta' }),
    onReq({ subject: 'employer', factor: 'empRevenue', value: 500000, unit: 'CAD/yr', appliesArea: 'on-listed-cd' }),
    onReq({ subject: 'employer', factor: 'empRevenue', value: 250000, unit: 'CAD/yr', appliesArea: 'on-other' }),
    onReq({ subject: 'employer', factor: 'empStaff', value: 5, unit: 'employees', appliesArea: 'gta' }),
    onReq({ subject: 'employer', factor: 'empStaff', value: 3, unit: 'employees', appliesArea: 'outside-gta' }),
  ]
  const onChan: PnpPathway = { province: 'ON', boardLabel: null, isDefault: true, drawStreams: [], reqStreams: [ONW], quotaKey: null,
    officialName: ONW }
  const onGate = (noc: string, teer: number | null, t = zh) =>
    gateOf(gateCardOf({ t, job: job({ province: 'ON', noc, teer }), reqs: onReqs, channel: onChan }))
  const ON_EMP = ['在本省经营满 3 年', '年收入 ≥ $1,000,000(大多伦多)', '年收入 ≥ $500,000(指定地区)', '年收入 ≥ $250,000(其他地区)',
    '全职员工 ≥ 5 人(大多伦多)', '全职员工 ≥ 3 人(大多伦多以外)']

  it('门槛卡·安省:技工 TEER 2 出 CLB 5 + 免考、经验四条(6 个月 / 应届 / 同职业累计 / 执照)、工资、雇主分区各档全列', () => {
    expect(onGate('72410', 2)).toEqual([
      ['语言', ['英语或法语每项 CLB 5', '近 3 年在本省毕业免考']],
      ['工作经验', ['在现雇主全职满 6 个月', '或本省应届毕业生满 3 个月', '或同职业累计满 2 年(近 5 年内)', '或持有这份工作要求的执照']],
      ['工资', ['不低于本职业在本地区的中位工资', '或本省应届毕业生不低于低位工资']],
      ['雇主', ON_EMP],
    ])
    expect(onGate('72410', 2, en)).toEqual([
      ['Language', ['CLB 5 in each English or French skill', 'No test if you graduated in Ontario within the last 3 years']],
      ['Experience', ['6 months full-time with your current employer', 'or 3 months if you are a recent graduate in Ontario',
        'or 2 years in the same occupation (within the last 5 years)', 'or hold the licence this job requires']],
      ['Wage', ['At or above the median wage for this occupation in the region',
        'or at or above the low wage if you are a recent graduate in Ontario']],
      ['Employer', ['Operating in Ontario for 3+ years', 'Revenue ≥ $1,000,000 (GTA)', 'Revenue ≥ $500,000 (listed regions)',
        'Revenue ≥ $250,000 (other areas)', '≥ 5 full-time staff (GTA)', '≥ 3 full-time staff (outside the GTA)']],
    ])
  })

  it('门槛卡·安省按本岗挑档:TEER 5 只剩 CLB 4 与 9 个月;技工档排除的 726 退回 CLB 6;卡车司机不适用应届与执照;没分类不出经验行', () => {
    // 应届低位那行只管 TEER 0-3:TEER 5 的工资行只剩中位一句
    expect(onGate('65100', 5)).toEqual([
      ['语言', ['英语或法语每项 CLB 4']],
      ['工作经验', ['在现雇主全职满 9 个月']],
      ['工资', ['不低于本职业在本地区的中位工资']],
      ['雇主', ON_EMP],
    ])
    expect(onGate('72600', 2)?.[0]).toEqual(['语言', ['英语或法语每项 CLB 6', '近 3 年在本省毕业免考']])
    expect(onGate('73300', 3)?.[1]).toEqual(['工作经验', ['在现雇主全职满 6 个月', '或同职业累计满 2 年(近 5 年内)']])
    // 官方技工名单含 6320(厨师 / 屠宰 / 面包师)与 62200(主厨):厨师走 CLB 5;非技工的 TEER 3(行政助理)走 CLB 6
    expect(onGate('63200', 3)?.[0]).toEqual(['语言', ['英语或法语每项 CLB 5', '近 3 年在本省毕业免考']])
    expect(onGate('13110', 3)?.[0]).toEqual(['语言', ['英语或法语每项 CLB 6', '近 3 年在本省毕业免考']])
    expect(onGate('', null)?.map((r) => r[0])).toEqual(['工资', '雇主'])
    // 阿省那张卡不受影响(上面阿省金标原样过):阿省门槛行不标 TEER 档与排除职业
  })

  // 2026-09-29 Frank「有些职位不满足门槛 也要弹框 并说明」「就直接说 兼职」「单独开一个 框 说不满足」
  it('本岗不满足:原因码 → 原因词(三语),清单排除不走这条;有原因的格子可点', () => {
    const words = ['part', 'term', 'seasonal', 'casual', 'wage', 'occ'].map((c) => pnpBlockOf({ job: { pnpBlock: c }, t: zh }))
    expect(words).toEqual(['兼职', '定期合同', '季节工', '临时工', '工资低于中位', '职业不收'])
    expect(pnpBlockOf({ job: { pnpBlock: 'part' }, t: en })).toBe('Part-time')
    expect(pnpBlockOf({ job: { pnpBlock: 'part' }, t: ko })).toBe('파트타임')
    for (const c of ['', 'list', 'zzz']) {
      expect(pnpBlockOf({ job: { pnpBlock: c }, t: zh })).toBe('')
    }
    const blocked = { province: 'ON', noc: '65100', pnpEligible: false, pnpStream: '', pnpBlock: 'part' }
    const index = pnpFactsIndexOf({ occ: [], draws: [], pathways: PATHWAYS })
    expect(pnpCellActiveOf({ job: blocked, blocked: { pnp: new Set(), aip: new Set() }, index })).toBe(true)
    expect(pnpCellActiveOf({ job: { ...blocked, pnpBlock: '' }, blocked: { pnp: new Set(), aip: new Set() }, index })).toBe(false)
    // 2026-09-29 七省门槛卡:本岗通道登记了门槛也算有卡 —— 萨省普通岗(无抽选无清单)原先不可点
    const sk = { province: 'SK', noc: '21231', pnpEligible: true, pnpStream: '', pnpBlock: '' }
    const gated = { ...index, gated: ['pnp.gen.SK'] }
    expect(pnpCellActiveOf({ job: sk, blocked: { pnp: new Set(), aip: new Set() }, index: gated })).toBe(true)
    expect(pnpCellActiveOf({ job: sk, blocked: { pnp: new Set(), aip: new Set() }, index: { ...index, gated: [] } })).toBe(false)
  })

  // 2026-09-29 Frank「sk 省 没显示 门槛卡片啊」「都接上,开工吧」:七省接入前的通用件
  it('门槛卡通用件:走不了的岗按本省省默认通道出;经营年限按月写「个月」;经验近 N 年;积分行', () => {
    const blocked = job({ province: 'ON', noc: '65100', teer: 5, pnpEligible: false, pnpBlock: 'part' })
    expect(gateChannelOf({ job: blocked, pathways: PATHWAYS })?.isDefault).toBe(true)
    expect(gateChannelOf({ job: { ...blocked, pnpBlock: 'list' }, pathways: PATHWAYS })).toBeNull()
    expect(gateChannelOf({ job: { ...blocked, pnpBlock: '' }, pathways: PATHWAYS })).toBeNull()
    const skReq = (p: Partial<PnpReq>): PnpReq => req({ province: 'SK', stream: 'SK X', url: 'https://www.saskatchewan.ca/x', ...p })
    const skReqs = [
      skReq({ value: 4 }),
      skReq({ factor: 'experience', value: 12, unit: 'months', basis: 'windowYears=10' }),
      skReq({ factor: 'pointsMin', value: 60, unit: 'points' }),
      skReq({ stream: 'SK EMP', subject: 'employer', factor: 'empYears', value: 24, unit: 'months' }),
    ]
    const skChan: PnpPathway = { province: 'SK', boardLabel: null, isDefault: true, drawStreams: [], reqStreams: ['SK X', 'SK EMP'], quotaKey: null,
      officialName: 'X' }
    expect(gateOf(gateCardOf({ t: zh, job: job({ province: 'SK', noc: '21231', teer: 1 }), reqs: skReqs, channel: skChan }))).toEqual([
      ['语言', ['英语或法语每项 CLB 4']],
      ['工作经验', ['12 个月全职经验(近 10 年内)']],
      ['积分', ['本省打分表 ≥ 60 分']],
      ['雇主', ['在本省经营满 24 个月']],
    ])
  })

  // 2026-09-29 七省合并(Frank「都接上,开工吧」):子代理回报汇总出的卡片写法
  it('门槛卡七省写法:居住、在担保雇主满 N 个月、外省毕业须满 N 个月、本省院校毕业;雇主行只读登记的流;来源按登记顺序', () => {
    const nbReq = (p: Partial<PnpReq>): PnpReq => req({ province: 'NB', stream: 'NB A', url: 'https://nb.example/a', ...p })
    const rows = [
      nbReq({ value: 4 }),
      nbReq({ factor: 'experience', value: 6, unit: 'months', basis: 'employerTenure' }),
      nbReq({ factor: 'experience', value: 12, unit: 'months', basis: 'employerTenure', appliesCondition: 'grad-other-province' }),
      nbReq({ stream: 'NB B', url: 'https://nb.example/b', factor: 'experienceAlt', op: 'none', value: 6, unit: 'months',
        basis: 'employerTenure' }),
      nbReq({ stream: 'NB B', url: 'https://nb.example/b', factor: 'experienceAlt', op: 'none', value: null, unit: '',
        basis: 'provGraduate' }),
      nbReq({ factor: 'residence', value: 6, unit: 'months' }),
      nbReq({ stream: 'NB EDI', subject: 'employer', factor: 'empYears', value: 3, unit: 'years' }),
    ]
    const chan: PnpPathway = { province: 'NB', boardLabel: null, isDefault: true, drawStreams: [], reqStreams: ['NB B', 'NB A'],
      quotaKey: null, officialName: 'NB' }
    const card = gateCardOf({ t: zh, job: job({ province: 'NB', noc: '21231', teer: 1 }), reqs: rows, channel: chan })
    expect(gateOf(card)).toEqual([
      ['语言', ['英语或法语每项 CLB 4']],
      ['工作经验', ['在现雇主全职满 6 个月', '外省毕业的须满 12 个月', '或在现雇主全职满 6 个月', '或本省院校毕业']],
      ['居住', ['近 6 个月住在本省']],
    ])
    // 雇主行只读本通道登记的流:没登记的 EDI 那行不上卡(曼省实撞);来源按登记先后取 —— NB B 先登记
    expect(card?.source?.href).toBe('https://nb.example/b')
    const withEmp = { ...chan, reqStreams: ['NB A', 'NB EDI'] }
    const card2 = gateCardOf({ t: zh, job: job({ province: 'NB', noc: '21231', teer: 1 }), reqs: rows, channel: withEmp })
    expect(card2?.rows.map((r) => r.label)).toContain('雇主')
    expect(card2?.source?.href).toBe('https://nb.example/a')
    expect(gateOf(gateCardOf({ t: en, job: job({ province: 'NB', noc: '21231', teer: 1 }), reqs: rows, channel: chan }))?.[2])
      .toEqual(['Residence', ['Lived in New Brunswick for the last 6 months']])
  })

  it('分区雇主门槛:数据里出现的区码三语都有区名(zonedLinesOf 查不到词条那区不出,这里先红)', () => {
    const areas = new Set<string>()
    for (const r of mart<PnpReq>('pnp_requirements')) {
      if (r.subject === 'employer' && (r.factor === 'empRevenue' || r.factor === 'empStaff') && r.appliesArea) {
        areas.add(r.appliesArea)
      }
    }
    expect(areas.size).toBeGreaterThan(0)
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const t = makeT(lang)
      for (const a of areas) {
        expect(t('pnpgate.area.' + a), lang + ':' + a).not.toBe('pnpgate.area.' + a)
      }
    }
  })

  // 2026-09-28 Frank「如果是不符合清单的。本省抽选默认折叠」:可提名照旧全展开(09-26「默认也别合并啊」),不可提名默认折叠
  it('本省抽选卡开合初值:可提名展开全省各组,不可提名折叠', () => {
    expect([...drawOpenInitOf(job({ province: 'AB', pnpEligible: true }))]).toEqual(['__all'])
    expect([...drawOpenInitOf(job({ province: 'AB', pnpEligible: false }))]).toEqual([])
  })

  it('魁省 PSTQ:抽选卡哪一形都不出,格子不可点', () => {
    const qc = [draw({ province: 'QC', label: 'PSTQ', stream: 'Stream 1', drawDate: '2026-09-24', score: 634, invitations: 86 })]
    expect(drawsFormOf({ province: 'QC', draws: qc })).toBe('none')
    expect(drawGroupsShownOf('none')).toBe(false)
    expect(cellSaysCards(job({ province: 'QC', noc: '21231' }), [], qc)).toBe(false)
  })

  it('SK 主线不合格表(参考信号):可提名的岗不出排除卡、格子也不凭它可点;探针:拿掉可提名闸就又出', () => {
    const o = [occ({ province: 'SK', label: 'SK 主线不合格清单', type: 'ineligible', noc: '41200' })]
    const ok = job({ province: 'SK', noc: '41200', pnpStream: '', pnpEligible: true })
    const m = pnpMatchOf({ job: ok, occ: o })
    expect(shownStreamsOf({ match: m, noc: '41200', eligible: true })).toEqual([])
    expect(cellSaysCards(ok, o, [])).toBe(false)
    expect(shownStreamsOf({ match: m, noc: '41200', eligible: false }).map((s) => s.label)).toEqual(['SK 主线不合格清单'])
  })

  it('性质:排除清单卡只出现在不可提名的岗上;只到月的行永远不进分组', () => {
    fc.assert(fc.property(fc.array(occArb, { maxLength: 30 }), jobArb, (o, j) => {
      const shown = shownStreamsOf({ match: pnpMatchOf({ job: j, occ: o }), noc: j.noc, eligible: j.pnpEligible })
      if (shown.some((s) => s.type === 'ineligible')) {
        expect(j.pnpEligible).toBe(false)
      }
    }), { numRuns: 2000 })
    fc.assert(fc.property(fc.array(drawArb, { maxLength: 20 }), fc.constantFrom(...PROVS), (d, province) => {
      for (const g of pnpDrawGroupsOf({ t: zh, lang: 'zh', province, draws: d, hitStreams: [], genDraw: genDrawOf({ province, pathways: PATHWAYS }) })) {
        for (const r of g.rows) {
          expect(r.date.length).toBe(10)
        }
      }
    }), { numRuns: 1000 })
  })

  // 2026-09-28 Frank「这个要不要把灰字去掉」「先弄安省的」:主文案改界面语言直白名,灰字改官方英文原名(非英文界面才出)
  // 2026-09-29 下午 Frank「这种上下对不上的?应该是默认显示英文,灰字中文」:翻回官方英文原名主文案 + 界面语言名灰字
  it('通道卡:具名先、可提名退通用名;领地、魁省、不可提名不列;官方英文原名主文案 + 界面语言灰字', () => {
    const at = (j: PnpJob, lang: 'zh' | 'en' | 'ko', showZh = true) =>
      channelsOf({ t: makeT(lang), tEn: en, lang, showZh, job: j, defaults: DEFAULTS, pathways: PATHWAYS })
    expect(at(job({ province: 'ON' }), 'zh')).toEqual([{ key: 'pnp.gen.ON', name: 'Ontario Workforce Priority stream', sub: 'ON 劳动力优先' }])
    expect(at(job({ province: 'ON' }), 'en')).toEqual([{ key: 'pnp.gen.ON', name: 'Ontario Workforce Priority stream', sub: '' }])
    expect(at(job({ province: 'AB' }), 'zh')).toEqual([{ key: 'pnp.gen.AB', name: 'Alberta Opportunity Stream', sub: 'AB 机会通道' }])
    expect(at(job({ province: 'AB' }), 'en')).toEqual([{ key: 'pnp.gen.AB', name: 'Alberta Opportunity Stream', sub: '' }])
    expect(at(job({ province: 'AB' }), 'zh', false)[0]?.sub).toBe('')
    expect(at(job({ province: 'AB', pnpStream: 'AB 医疗' }), 'zh')).toEqual([{ key: 'AB 医疗', name: 'Dedicated Health Care Pathway', sub: 'AB 医疗' }])
    expect(at(job({ province: 'SK', pnpStream: 'SK 现有工签' }), 'zh')[0]?.name).toBe('Skilled Worker With Existing Work Permit')
    expect(at(job({ province: 'NT' }), 'zh')).toEqual([])
    expect(at(job({ province: 'QC', pnpStream: 'X' }), 'zh')).toEqual([])
    expect(at(job({ province: 'AB', pnpEligible: false }), 'zh')).toEqual([])
  })

  it('通道对照表的省默认通道与三语词条一一对上(2026-09-28 起读 pathways,原 GEN_CHANNEL_PROVS 九省表);格子与通道卡写同一条(2026-09-28 两种判法并成 pnpChannelKeyOf)', () => {
    // 原先职位板格子认 jobs 的九省表、弹框通道卡认「英文词条查不查得到」—— 并成一张表后,这条锁住表与三语词条不脱节
    // (加一省通用通道只写了词条没进表,或反过来,这里先红)。
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const t = makeT(lang)
      for (const p of ['AB', 'BC', 'SK', 'MB', 'ON', 'QC', 'NS', 'NB', 'PE', 'NL', 'YT', 'NT', 'NU']) {
        expect(t('pnp.gen.' + p) !== 'pnp.gen.' + p, lang + ':' + p).toBe(DEFAULTS.includes(p))
      }
    }
    fc.assert(fc.property(
      fc.constantFrom('AB', 'BC', 'SK', 'NS', 'ON', 'YT', 'QC', ''), fc.boolean(), fc.constantFrom('', 'AB 医疗', 'NS 建筑'),
      (province, pnpEligible, pnpStream) => {
        const j = job({ province, pnpEligible, pnpStream })
        const key = pnpChannelKeyOf({ job: j, defaults: DEFAULTS })
        const card = channelsOf({ t: makeT('zh'), tEn: en, lang: 'zh', showZh: true, job: j, defaults: DEFAULTS, pathways: PATHWAYS })
        if (province === 'QC' || province === '' || key === '') {
          expect(card).toEqual([])
        } else {
          expect(card.map((c) => c.key)).toEqual([key])
        }
      }), { numRuns: 200 })
  })

  it('data/mart 真数据:魁省不出卡,NS 按月,安省现状,阿省分组', () => {
    const d = mart<PnpDraw>('pnp_draws')
    expect(drawsFormOf({ province: 'QC', draws: d })).toBe('none')
    expect(drawsFormOf({ province: 'NS', draws: d })).toBe('monthly')
    expect(drawsFormOf({ province: 'ON', draws: d })).toBe('status')
    expect(drawsFormOf({ province: 'AB', draws: d })).toBe('groups')
  })
})
