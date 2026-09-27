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
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import {
  allGroupsLabelOf, channelsOf, drawCardOf, drawsFormOf, factCardOf, hasProvDraws, monthRowsOf,
  pnpDrawGroupsOf, pnpFactsIndexOf, pnpFactsShownOf, pnpMatchOf, shownStreamsOf,
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
    note: '', label: '', url: '', ...p,
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
  const index = pre ?? pnpFactsIndexOf({ occ: o, draws: d })
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
    const card = drawCardOf({ t: zh, lang: 'zh', province: 'AB', draws: ab, hitStreams: [AOS] })
    expect(card?.title).toBe('本省最近抽选')
    expect(card?.label).toBe('AAIP')
    expect(card?.total).toBe(2)
    expect(card?.hits.map(headOf)).toEqual([[AOS, true, '最低 58 分', '2026-09-23', '5 轮']])
    expect(card?.hits[0]?.rows.length).toBe(5)
    expect(card?.others.map(headOf)).toEqual([['Rural Renewal Stream', false, '最低 51 分', '2026-08-11', '1 轮']])
    expect(card?.source).toEqual({ label: '来源', text: 'alberta.ca ↗', href: AB_SRC })
    const e = drawCardOf({ t: en, lang: 'en', province: 'AB', draws: ab, hitStreams: [AOS] })
    expect(e?.hits.map(headOf)).toEqual([[AOS, true, 'min 58', '2026-09-23', '5 rounds']])
    expect(e?.source).toEqual({ label: 'Source', text: 'alberta.ca ↗', href: AB_SRC })
    expect(drawCardOf({ t: ko, lang: 'ko', province: 'AB', draws: ab, hitStreams: [AOS] })?.source?.label).toBe('출처')
  })

  it('开关文案:收着「查看全省 N 组」,开着「收起」;对不上本岗那一组时没有命中行,来源照旧', () => {
    expect(allGroupsLabelOf({ t: zh, open: false, total: 13, label: 'AAIP' })).toBe('查看全省 13 组 ▾')
    expect(allGroupsLabelOf({ t: en, open: false, total: 13, label: 'AAIP' })).toBe('All 13 AAIP streams ▾')
    expect(allGroupsLabelOf({ t: zh, open: true, total: 13, label: 'AAIP' })).toBe('收起 ▴')
    const none = drawCardOf({ t: zh, lang: 'zh', province: 'AB', draws: ab, hitStreams: [] })
    expect(none?.hits).toEqual([])
    expect(none?.others.length).toBe(2)
    expect(none?.source?.href).toBe(AB_SRC)
  })

  it('没公布分的本岗那组:组头写那一轮的人数(AIP 写份申请入选),标命中;认不出站名不出来源', () => {
    const one = [draw({ province: 'NB', stream: 'AIP', drawDate: '2026-09-10', score: null, invitations: 40 })]
    const aipZh = drawCardOf({ t: zh, lang: 'zh', province: 'NB', draws: one, hitStreams: ['AIP'] })
    expect(aipZh?.hits.map(headOf)).toEqual([['AIP', true, '40 份申请入选', '2026-09-10', '1 轮']])
    expect(aipZh?.hits[0]?.noScore).toBe(true)
    expect(aipZh?.source).toBeNull()
    const aipEn = drawCardOf({ t: en, lang: 'en', province: 'NB', draws: one, hitStreams: ['AIP'] })
    expect(aipEn?.hits.map(headOf)).toEqual([['AIP', true, '40 selected', '2026-09-10', '1 round']])
  })

  it('NS 按月选取人数:日期到月、写「入选」、人数没公布的月不列;不进分组(不按「轮」统计)', () => {
    const src = 'https://liveinnovascotia.com/eoi-selection'
    const month = (drawDate: string, invitations: number | null) => draw({
      province: 'NS', label: 'NSNP + AIP', stream: 'Monthly EOI selections', drawDate, score: null, invitations, url: src,
    })
    const ns = [month('2026-06', 531), month('2026-07', 671), month('2026-08', null)]
    expect(drawsFormOf({ province: 'NS', draws: ns })).toBe('monthly')
    expect(monthRowsOf({ province: 'NS', draws: ns }).map((d) => d.drawDate)).toEqual(['2026-07', '2026-06'])
    expect(pnpDrawGroupsOf({ t: zh, lang: 'zh', province: 'NS', draws: ns, hitStreams: [] })).toEqual([])
    const card = factCardOf({ t: zh, province: 'NS', draws: ns })
    expect(card?.title).toBe('本省最近抽选')
    expect(card?.cells.map((c) => [c.k, c.v])).toEqual([['2026-07', '671 人入选'], ['2026-06', '531 人入选']])
    expect(card?.source).toEqual({ label: '来源', text: 'liveinnovascotia.com ↗', href: src })
    expect(factCardOf({ t: en, province: 'NS', draws: ns })?.cells[0]?.v).toBe('671 selected')
    // 探针:同一省换成带日的轮次就走分组形 —— 按月与分组的分界是日期形,不是省码
    const daily = [draw({ province: 'NS', stream: 'Monthly EOI selections', drawDate: '2026-07-15', score: null, invitations: 5 })]
    expect(drawsFormOf({ province: 'NS', draws: daily })).toBe('groups')
    expect(factCardOf({ t: zh, province: 'NS', draws: daily })).toBeNull()
  })

  // 同日 lead 定:那一行的标签用通用的「最新公告」(复用 tl.tabNews),不写「EOI 注册开放」—— 公告行是更新页的最新一条,会换
  it('安省改制现状:最新公告 = 改制后公告日(悬停出原句),改制后没抽选写「暂无」;有了就写那一轮的日期', () => {
    const note = 'portal now open to Ontario Workforce Priority Stream expressions of interest'
    const url = 'https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp-invitations-apply'
    const on = [
      draw({ province: 'ON', label: 'OINP', drawDate: '2026-04-23', stream: 'Employer Job Offer: Foreign Worker stream', url }),
      draw({ province: 'ON', label: 'OINP', kind: 'notice', drawDate: '2026-08-04', stream: '', score: null, invitations: null, note, url }),
    ]
    const card = factCardOf({ t: zh, province: 'ON', draws: on })
    expect(card?.title).toBe('本省最近抽选')
    expect(card?.cells.map((c) => [c.k, c.v])).toEqual([['最新公告', '2026-08-04'], ['已发邀请', '暂无']])
    expect(card?.source).toEqual({ label: '来源', text: 'ontario.ca ↗', href: url })
    expect(card?.cells[0]?.tip).toBe(note)
    expect(factCardOf({ t: en, province: 'ON', draws: on })?.cells.slice(0, 2).map((c) => [c.k, c.v]))
      .toEqual([['Latest updates', '2026-08-04'], ['Invitations issued', 'None yet']])
    expect(factCardOf({ t: ko, province: 'ON', draws: on })?.cells.slice(0, 2).map((c) => [c.k, c.v]))
      .toEqual([['최신 공지', '2026-08-04'], ['초청 발급', '아직 없음']])
    const after = [...on, draw({ province: 'ON', label: 'OINP', drawDate: '2026-10-01', stream: 'Ontario Workforce Priority' })]
    expect(factCardOf({ t: zh, province: 'ON', draws: after })?.cells[1]).toMatchObject({ v: '2026-10-01' })
  })

  it('魁省 PSTQ:抽选卡哪一形都不出,格子不可点', () => {
    const qc = [draw({ province: 'QC', label: 'PSTQ', stream: 'Stream 1', drawDate: '2026-09-24', score: 634, invitations: 86 })]
    expect(drawsFormOf({ province: 'QC', draws: qc })).toBe('none')
    expect(factCardOf({ t: zh, province: 'QC', draws: qc })).toBeNull()
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
      for (const g of pnpDrawGroupsOf({ t: zh, lang: 'zh', province, draws: d, hitStreams: [] })) {
        for (const r of g.rows) {
          expect(r.date.length).toBe(10)
        }
      }
    }), { numRuns: 1000 })
  })

  it('通道卡:具名先、可提名退通用名;领地、魁省、不可提名不列;英文主文案 + 界面语言灰字', () => {
    const at = (j: PnpJob, lang: 'zh' | 'en' | 'ko', showZh = true) =>
      channelsOf({ t: makeT(lang), tEn: en, lang, showZh, job: j })
    expect(at(job({ province: 'AB' }), 'zh')).toEqual([{ key: 'pnp.gen.AB', name: 'Alberta Opportunity Stream', sub: 'AB 机会通道' }])
    expect(at(job({ province: 'AB' }), 'en')).toEqual([{ key: 'pnp.gen.AB', name: 'Alberta Opportunity Stream', sub: '' }])
    expect(at(job({ province: 'AB' }), 'zh', false)[0]?.sub).toBe('')
    expect(at(job({ province: 'AB', pnpStream: 'AB 医疗' }), 'zh')).toEqual([{ key: 'AB 医疗', name: 'Dedicated Health Care Pathway', sub: 'AB 医疗' }])
    expect(at(job({ province: 'SK', pnpStream: 'SK 现有工签' }), 'zh')[0]?.name).toBe('SK Existing Work Permit')
    expect(at(job({ province: 'NT' }), 'zh')).toEqual([])
    expect(at(job({ province: 'QC', pnpStream: 'X' }), 'zh')).toEqual([])
    expect(at(job({ province: 'AB', pnpEligible: false }), 'zh')).toEqual([])
  })

  it('data/mart 真数据:魁省不出卡,NS 按月,安省现状,阿省分组', () => {
    const d = mart<PnpDraw>('pnp_draws')
    expect(drawsFormOf({ province: 'QC', draws: d })).toBe('none')
    expect(drawsFormOf({ province: 'NS', draws: d })).toBe('monthly')
    expect(drawsFormOf({ province: 'ON', draws: d })).toBe('status')
    expect(drawsFormOf({ province: 'AB', draws: d })).toBe('groups')
  })
})
