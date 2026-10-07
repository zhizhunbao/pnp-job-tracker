// 只到月的抽选行(NS 每月从 EOI 池选取人数,drawDate = 'YYYY-MM')在省提名弹框之外三处消费端的口径
// (2026-09-26 lead 定,Frank 批的「补完整」范围:新数据下一轮 build 进库,消费端必须同步正确)。
// ① /timeline 节奏统计只收日期齐到日的抽选 —— 到月的行不算「距今 N 天 / 平均间隔 / 拖长了」,照旧进事件流、日期原样到月;
// ② 时间线事件、/plan/pr「各省最近抽选」、/start 近期抽选:NS 的人数写「入选」(复用 pnpfacts.selPeople / selected),别的省照旧「邀请」。
// 2026-09-30 Frank「把脉页那几处 NS 也改成读数据吧」:三处改认抽选行的 unit 格(selection = 入选),不再按省码判;夹具照真数据带 unit。
// ③ /start 近期抽选只列按日期的前 N 轮,没挤进去的省各补最近一轮、排在表尾(2026-09-30 Frank「可以,补上吧」:
// 当天前 50 轮全在 08-26 ~ 09-29,NS 排第 123、ON 排第 198,一行都不露)。
// 金标手写:NS 取官网 liveinnovascotia.com/eoi-selection 2026 年 5-7 月三个月的选取人数,阿省取机会通道 09-01、09-23 两轮。
// 探针:同样的 NS 行换成带日的日期,就进节奏统计 —— 分界是日期形,不是省码;把 unit 换成 invitation,人数就写回「邀请」
// (2026-09-30 起分界是 unit 格,也不是省码:阿省的行标成 selection 照样写「入选」)。
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { SQL } from '@/lib/db'
import type { Db } from '@/lib/db'
import { makeT } from '@/lib/i18n'
import { fetchTimeline } from '@/lib/plan/functions'
import { invTextOf } from '@/components/timeline/functions'
import type { EventRow } from '@/components/timeline/types'
import { toDrawCellRow as toPlanDrawRow } from '@/components/plan/functions'
import { toDrawCellRow as toStartDrawRow, toPulseDraws } from '@/components/start/functions'
import type { PulseDraw } from '@/components/start/types'

/** 假库:抽选那条查询给定的行,别的查询给空 */
function fakeDb(draws: Record<string, unknown>[]): Db {
  return { query: async (sql: string) => ({ rows: sql === SQL.PNP_DRAWS_ALL ? draws : [] }) } as unknown as Db
}

/** NS 一个月的选取人数(pnp_draws 原样行) */
const ns = (date: string, n: number) => ({
  province: 'NS', kind: 'draw', draw_date: date, stream: 'Monthly EOI selections', score: null, scale: null, invitations: n,
  note: '', label: 'NSNP + AIP', url: 'https://liveinnovascotia.com/eoi-selection', unit: 'selection',
})

/** 阿省机会通道一轮(pnp_draws 原样行) */
const ab = (date: string) => ({
  province: 'AB', kind: 'draw', draw_date: date, stream: 'Alberta Opportunity Stream', score: 58, scale: 'WEOI', invitations: 113,
  note: '', label: 'AAIP', url: '', unit: 'invitation',
})

describe('① 时间线节奏:只到月的行不进统计', () => {
  it('NS 三个月:事件流照出(日期到月),节奏统计里没有 NS;阿省照常(两轮、间隔 22 天)', async () => {
    const out = await fetchTimeline(fakeDb([ab('2026-09-23'), ab('2026-09-01'), ns('2026-07', 671), ns('2026-06', 531), ns('2026-05', 789)]))
    expect(out.cadence.map((c) => c.prov)).toEqual(['AB'])
    expect(out.cadence[0]).toMatchObject({ stream: 'AAIP', last: '2026-09-23', avgGapDays: 22, draws: 2 })
    expect(out.events.filter((e) => e.prov === 'NS').map((e) => e.date)).toEqual(['2026-07', '2026-06', '2026-05'])
    // 事件带上 unit 格(时间线写「人入选」读它)
    expect(out.events.filter((e) => e.prov === 'NS').map((e) => e.unit)).toEqual(['selection', 'selection', 'selection'])
  })

  it('探针:同样的 NS 行换成带日的日期,就进节奏统计', async () => {
    const out = await fetchTimeline(fakeDb([ns('2026-07-15', 671), ns('2026-06-15', 531)]))
    expect(out.cadence.map((c) => c.prov)).toEqual(['NS'])
    expect(out.cadence[0]).toMatchObject({ last: '2026-07-15', avgGapDays: 30, draws: 2 })
  })
})

describe('② NS 的人数写「入选」,别的省照旧「邀请」', () => {
  const zh = makeT('zh')
  const en = makeT('en')
  const ko = makeT('ko')

  it('时间线事件', () => {
    const row: EventRow = {
      date: '2026-07', prov: 'NS', kind: 'draw', title: 'NSNP + AIP', score: null, scale: '', invitations: 671, note: '',
      unit: 'selection',
    }
    expect(invTextOf({ t: zh, row })).toBe('671 人入选')
    expect(invTextOf({ t: en, row })).toBe('671 selected')
    expect(invTextOf({ t: ko, row })).toBe('671명 선정')
    expect(invTextOf({ t: zh, row: { ...row, prov: 'AB', invitations: 113, unit: 'invitation' } })).toBe('邀请 113 人')
    expect(invTextOf({ t: zh, row: { ...row, invitations: null } })).toBe('')
    // 探针:认的是 unit 格不是省码 —— NS 标成 invitation 写「邀请」,阿省标成 selection 写「入选」
    expect(invTextOf({ t: zh, row: { ...row, unit: 'invitation' } })).toBe('邀请 671 人')
    expect(invTextOf({ t: zh, row: { ...row, prov: 'AB', unit: 'selection' } })).toBe('671 人入选')
  })

  it('/plan/pr 各省最近抽选:桌面格写「N 人入选」、手机卡标换「入选」,日期原样到月', () => {
    const provDisp = (code: string) => code
    const nsR = { province: 'NS', drawDate: '2026-07', stream: 'Monthly EOI selections', score: null, invitations: 671, unit: 'selection' }
    const nsRow = toPlanDrawRow({ t: zh, provDisp, r: nsR })
    expect(nsRow).toMatchObject({ date: '2026-07', invCell: '671 人入选', inv: '671', invLabel: '入选' })
    const abRow = toPlanDrawRow({
      t: zh, provDisp,
      r: { province: 'AB', drawDate: '2026-09-23', stream: 'Alberta Opportunity Stream', score: 58, invitations: 113, unit: 'invitation' },
    })
    expect(abRow).toMatchObject({ date: '2026-09-23', invCell: '113', inv: '113', invLabel: '邀请' })
    // 探针:认的是 unit 格不是省码
    expect(toPlanDrawRow({ t: zh, provDisp, r: { ...nsR, unit: 'invitation' } })).toMatchObject({ invCell: '671', invLabel: '邀请' })
  })

  it('/start 近期抽选:桌面格写「N 人入选」、手机卡与门槛弹框的标换「入选」,日期原样到月', () => {
    const base: PulseDraw = {
      date: '2026-07', province: 'NS', stream: 'Monthly EOI selections', streamZh: '', label: 'NSNP + AIP', score: null,
      invitations: 671, url: '', note: '', checklist: null, unit: 'selection',
    }
    const onRules = () => undefined
    const nsRow = toStartDrawRow({ r: base, i: 0, t: zh, tEn: en, lang: 'zh', onRules })
    expect(nsRow).toMatchObject({ date: '2026-07', invCell: '671 人入选', invitations: '671', invLabel: '入选' })
    const abRow = toStartDrawRow({
      r: { ...base, province: 'AB', date: '2026-09-23', score: 58, invitations: 113, unit: 'invitation' }, i: 1, t: zh, tEn: en,
      lang: 'zh', onRules,
    })
    expect(abRow).toMatchObject({ date: '2026-09-23', invCell: '113', invitations: '113', invLabel: '邀请' })
    expect(toStartDrawRow({ r: base, i: 0, t: en, tEn: en, lang: 'en', onRules })).toMatchObject({
      invCell: '671 selected', invLabel: 'Selected',
    })
    // 探针:认的是 unit 格不是省码
    expect(toStartDrawRow({ r: { ...base, unit: 'invitation' }, i: 0, t: zh, tEn: en, lang: 'zh', onRules })).toMatchObject({
      invCell: '671', invLabel: '邀请',
    })
  })
})

describe('③ /start 近期抽选:前 N 轮之外,没挤进去的省各补最近一轮', () => {
  // 金标手写:NS 取官网 7、6 月选取人数;ON 取 ontario.ca 邀请页外国劳工通道 04-30(57 分 786 份)、04-23(63 分 318 份)两轮。
  const on = (date: string, score: number, n: number) => ({
    province: 'ON', kind: 'draw', draw_date: date, stream: 'Employer Job Offer: Foreign Worker stream', score, scale: null,
    invitations: n, note: '', label: 'OINP', url: '', unit: 'invitation',
  })
  // 已按日期降序(同 PNP_DRAWS_RECENT)
  const rows = [
    ab('2026-09-23'), ab('2026-09-01'), ns('2026-07', 671), ns('2026-06', 531), on('2026-04-30', 57, 786),
    on('2026-04-23', 63, 318), ab('2026-03-05'),
  ]
  const pick = (limit: number) => toPulseDraws({ rows, limit }).map((d) => `${d.province} ${d.date} ${d.invitations}`)

  it('前 N 轮原样在前;NS、ON 各补一行,取的是它们最近那轮,排在表尾', () => {
    expect(pick(2)).toEqual(['AB 2026-09-23 113', 'AB 2026-09-01 113', 'NS 2026-07 671', 'ON 2026-04-30 786'])
  })

  it('性质(N 从 0 到全表):前 N 轮原样;缺席的省各补一行且是剩下行里最近那轮;条数 = N + 缺席省数;日期整体降序', () => {
    for (let limit = 0; limit <= rows.length; limit += 1) {
      const out = toPulseDraws({ rows, limit })
      expect(out.slice(0, limit).map((d) => `${d.province} ${d.date}`))
        .toEqual(rows.slice(0, limit).map((r) => `${r.province} ${r.draw_date}`))
      const head = new Set(rows.slice(0, limit).map((r) => r.province))
      const missing = [...new Set(rows.map((r) => r.province))].filter((p) => !head.has(p))
      const tail = out.slice(limit)
      expect(tail.map((d) => d.province)).toEqual(missing)
      for (const d of tail) {
        expect(d.date).toBe(rows.slice(limit).find((r) => r.province === d.province)?.draw_date)
      }
      const dates = out.map((d) => d.date)
      expect(dates).toEqual([...dates].sort().reverse())
    }
  })

  it('探针:N 盖住 NS 那行就不再补 NS;N = 0 每省一行;N 盖住全表原样不重复', () => {
    expect(pick(3)).toEqual(['AB 2026-09-23 113', 'AB 2026-09-01 113', 'NS 2026-07 671', 'ON 2026-04-30 786'])
    expect(pick(0)).toEqual(['AB 2026-09-23 113', 'NS 2026-07 671', 'ON 2026-04-30 786'])
    expect(pick(rows.length)).toHaveLength(rows.length)
  })
})
