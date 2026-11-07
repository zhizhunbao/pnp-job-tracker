// 「我的求职」今日推荐(2026-10-10 批 2,docs/design/我的/我的求职-20261009.md 第 3 节 15b / 16c / 16d;lib/myjobs 的推荐段 +
// myjobs 组件桶的 Picks)。dev 直连生产库不碰库:SQL 只核文本,组件用 fetch 桩。
// 性质:① 理由只放真的:在「投过同组 × 收藏同组 × 能走省提名 × 高于中位 × 省」全格上穷举 —— 投过同组出 occ、否则收藏同组出 saved
//          (两枚不同时出)、能走省提名且省有 PNP 简称才出 pnp(QC / 空省不出)、高于中位才出 wage,顺序固定;
//       ② 免费号:看得见前 3 条,「更多」= 其余条数,锁住的最多 2 条且**只有** title / reasons / program 三键(公司、地址、薪资、职位号
//          一概不下发);Pro:全给,更多 0、锁住空 —— 在 0~12 条的全长度上穷举;
//       ③ 今天新碰过的岗从缓存的推荐里剔掉,其余顺序不变;
//       ④ 地点一行照 Indeed:有精确地址用它,没有写「市, 省码」,只有一样写那一样;
//       ⑤ SQL:硬条件(在架、有投递邮箱、没碰过、没退信、30 天同邮箱)都在;排序键依次 = 能走省提名 → 通道档 → 发布日期 → 高于中位;
//       ⑥ 组件:免费号推荐多时出「更多推荐」卡(锁住那条的职位名看得见,假字纹理不是任何真公司名);Pro 不出;理由胶囊按码出字,
//          认不得的码不出;接口失败出「刷新再试」。
// 2026-10-11 Frank「OINP 很长时间没有捞人了」→「90 天可以」:① 再穷举「档案想做的工作同组 × 本省 offer 类通道近 90 天抽过」——
//          想做的工作同组也出 occ;过了 90 天的省不出 pnp;⑤ 能走省提名 / 通道档两个排序键都只对没过期的省生效(stale 子查询),
//          天数 = PICKS_DRAW_DAYS(90)作 $4 交给库;⑦ 答过档案后重拉带 fresh=1(不吃当天缓存)。
// 2026-10-11 晚 Frank「可以,按你说的改」(草稿被当成投过):① 改成档案命中出 occ、否则收藏命中出 saved、否则真发出去的投递命中出 applied,
//          一岗只出一枚;④ 地点一行的金标搬去 placeLine.int.spec.ts(placeLineOf 收进 lib/location);
//          ⑧ SQL:档案答了就不按收藏 / 投递选岗(两组套 cardinality(want.g) = 0)、投递只算 sent / replied、比对完整 5 位 NOC(不再 left(noc, 4))。
// 探针:reasonsOf 去掉 else(occ 与 saved 同出)→ ① 红;picksViewOf 锁住行抄整行 → ②「只有三键」红;dropTouchedOf 不剔 → ③ 红;
//       ORDER BY 里 date_posted 挪到 pnp_eligible 前 → ⑤ 红;Picks 对 Pro 也出更多卡 → ⑥ 红。
// 2026-11-07 「我的」新域重写(docs/design/我的/我的框架-20261107.md;myjobs 桶 → me 桶子桶 jobs / recommend / sub):
//       今日推荐从单独一张卡(Picks)变成「我的求职」整页正文 JobsBody 的默认页签 —— ⑥ 卡头「mj.picks + 数字」改断言页签字;
//       效果图撤推荐表的发布日期列(⑥ 原「出 2026-10-10」改断言「不出」);一行只留「投递」,「删除」(不再推)撤 —— ⑥ 加一条断言钮恰好一颗;
//       新岗推送(Push)挪进「我的订阅」(子桶 sub 的 SubBody / useSub);重拉从「按 gen 整卡重挂」改成「gen 变了推荐与我的投递重拉」(⑨ 新加)。
//       ②c 夹具对上现行 PathwayFits(原数组字面量推成联合,tsc 7 红)。lib 层(①~⑤⑧)不动。
//       探针:usePicks 依赖里漏 gen → ⑨ 红;useJobs 把 gen 也递给我的收藏 → ⑨ 红;pickColsOf 加回发布日期列 → ⑥ 红;
//       pickRowOf 的 act 拿 jobId 以外的号 → ⑥「投递」那条红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { JobsBody } from '@/components/me/jobs'
import { SubBody, useSub } from '@/components/me/sub'
import { SQL } from '@/lib/db'
import { PICKS_DRAW_DAYS, PICKS_FREE, PICKS_LOCKED_SHOW, PICKS_SWAP_FREE } from '@/lib/myjobs/constants'
// 测试例外:域内函数直接点文件(server 门只放路由与注入件)
import { batchOf, dropTouchedOf, fitsOfPick, keepFitPicksOf, loadPicks, picksViewOf, reasonsOf } from '@/lib/myjobs/functions'
import type { PathwayFitFact, PathwayFits, PickRow } from '@/lib/myjobs/types'

const PROVS = ['ON', 'BC', 'QC', ''] as const
const BOOLS = [true, false] as const

function row(id: number): PickRow {
  return {
    id, title: 'job ' + id, titleZh: '', titleKo: '', company: 'Secret Co ' + id, companyZh: '', companyKo: '',
    companySlug: 'secret-co-' + id, address: '1 Hidden St ' + id, city: 'Toronto', cityZh: '', cityKo: '', province: 'ON',
    salary: '$' + id + '/hr', datePosted: '2026-10-10T00:00:00.000Z', reasons: ['pnp'], program: 'OINP', hours: 'full',
    term: 'permanent', validThrough: '', pnpStream: '', pnpEligible: true, provDefault: true, abovePct: null,
    lmiaPositions: 0, eeCategory: '', drawLast: '', pilot: '',
  }
}

describe('推荐理由', () => {
  it('① 只放真的,全格穷举', () => {
    // 2026-10-12「整点有吸引力的 bullets」:多 lmia / ee / aip 三格,顺序改成 省提名 → 薪资 → LMIA → EE → AIP → 职业三选一 → 全职长期
    for (const occApplied of BOOLS) {
      for (const occSaved of BOOLS) {
        for (const occWant of BOOLS) {
          for (const pnp of BOOLS) {
            for (const offerActive of BOOLS) {
              for (const aboveMed of BOOLS) {
                for (const province of PROVS) {
                  {
                    for (const lmia of BOOLS) {
                      for (const ee of BOOLS) {
                        for (const aip of BOOLS) {
                          for (const pilot of BOOLS) {
                          for (const known of BOOLS) {
                          const r = reasonsOf({
                            occApplied, occSaved, occWant, pnp, offerActive, aboveMed, province, lmia, ee, aip,
                            pilot, known,
                          })
                          const want: string[] = []
                          if (pnp && offerActive && (province === 'ON' || province === 'BC')) {
                            want.push('pnp')
                          }
                          if (aboveMed) {
                            want.push('wage')
                          }
                          if (lmia) {
                            want.push('lmia')
                          }
                          if (ee) {
                            want.push('ee')
                          }
                          if (aip) {
                            want.push('aip')
                          }
                          if (pilot) {
                            want.push('pilot')
                          }
                          if (known) {
                            want.push('known')
                          }
                          if (occWant) {
                            want.push('occ')
                          } else if (occSaved) {
                            want.push('saved')
                          } else if (occApplied) {
                            want.push('applied')
                          }
                          expect(r).toEqual(want)
                          expect(r.filter((c) => c === 'occ' || c === 'saved' || c === 'applied').length <= 1).toBe(true)
                          }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  it('金标(2026-10-11):ON 能走省提名、但 offer 类通道 90 天没抽 → 不出 pnp;BC 抽过 → 出', () => {
    const base = { occApplied: false, occSaved: false, occWant: false, pnp: true, aboveMed: false, lmia: false, ee: false, aip: false, pilot: false, known: false }
    expect(reasonsOf({ ...base, province: 'ON', offerActive: false })).toEqual([])
    expect(reasonsOf({ ...base, province: 'BC', offerActive: true })).toEqual(['pnp'])
  })
})

describe('免费 / Pro 切分', () => {
  it('② 免费号:前 3 条 + 更多条数 + 锁住的只有三键;Pro 全给', () => {
    for (let n = 0; n <= 12; n++) {
      const rows = Array.from({ length: n }, (_, i) => row(i + 1))
      const free = picksViewOf({ rows, pro: false, batch: 0 })
      expect(free.picks).toEqual(rows.slice(0, PICKS_FREE))
      expect(free.more).toBe(Math.max(0, n - PICKS_FREE))
      expect(free.locked).toHaveLength(Math.min(PICKS_LOCKED_SHOW, Math.max(0, n - PICKS_FREE)))
      for (const l of free.locked) {
        expect(Object.keys(l).sort()).toEqual(
          ['pnpEligible', 'pnpStream', 'program', 'provDefault', 'province', 'reasons', 'title', 'titleKo', 'titleZh'],
        )
        const wire = JSON.stringify(l)
        expect(wire).not.toContain('Secret Co')
        expect(wire).not.toContain('Hidden St')
        expect(wire).not.toContain('/hr')
      }
      const pro = picksViewOf({ rows, pro: true, batch: 0 })
      expect(pro).toEqual({ picks: rows, more: 0, locked: [] })
    }
  })

  it('②b 换一批:每批看得见的不重样、条数守恒;换过头从头接;免费号批号夹到 PICKS_SWAP_FREE', () => {
    for (let n = 1; n <= 12; n++) {
      const rows = Array.from({ length: n }, (_, i) => row(i + 1))
      for (let b = 0; b <= 6; b++) {
        const free = picksViewOf({ rows, pro: false, batch: b })
        const start = (b * PICKS_FREE) % n
        expect(free.picks[0]).toEqual(rows[start])
        expect(free.picks.length + free.more).toBe(n)
        const pro = picksViewOf({ rows, pro: true, batch: b })
        expect(pro.picks.map((r) => r.id).sort((x, y) => x - y)).toEqual(rows.map((r) => r.id))
      }
    }
    const seen = new Set<number>()
    const twelve = Array.from({ length: 12 }, (_, i) => row(i + 1))
    for (let b = 0; b <= PICKS_SWAP_FREE; b++) {
      for (const r of picksViewOf({ rows: twelve, pro: false, batch: b }).picks) {
        expect(seen.has(r.id)).toBe(false)
        seen.add(r.id)
      }
    }
    const u = 'https://x.test/api/myjobs/picks?batch='
    expect(batchOf({ url: u + '2', pro: false })).toBe(2)
    expect(batchOf({ url: u + '99', pro: false })).toBe(PICKS_SWAP_FREE)
    expect(batchOf({ url: u + '99', pro: true })).toBe(99)
    for (const bad of ['-1', '1.5', 'abc', '']) {
      expect(batchOf({ url: u + bad, pro: false })).toBe(0)
    }
    expect(batchOf({ url: 'https://x.test/api/myjobs/picks', pro: true })).toBe(0)
  })

  it('②c 按「我的通道」筛(2026-10-13):具名通道对职位板标签、可提名没具名的对本省默认通道;走不了的去掉,院校条件看教育经历,没答身份 / 找不到通道照留', () => {
    // 2026-11-07 夹具对上现行形状:三条通道各自注解成 PathwayFitFact(原先一个数组字面量推成联合,与 PathwayFits 对不上、tsc 7 红)
    const ab: PathwayFitFact = { province: 'AB', label: 'AB 科技', isDefault: false, fits: { pgwp: { can: 'no' }, open: { can: 'yes' } } }
    const on: PathwayFitFact = { province: 'ON', label: '', isDefault: true, fits: { pgwp: { can: 'yes', schools: [{ prov: 'own' }] } } }
    const bcWay: PathwayFitFact = { province: 'BC', label: '', isDefault: true, fits: null }
    const ways: PathwayFits = [ab, on, bcWay]
    const named = { ...row(1), province: 'AB', pnpStream: 'AB 科技' }
    const onDefault = { ...row(2), province: 'ON' }
    const bc = { ...row(3), province: 'BC' }
    const notPnp = { ...row(4), province: 'ON', pnpEligible: false }
    const unknown = { ...row(5), province: 'AB', pnpStream: 'AB 没登的' }
    expect(fitsOfPick({ row: named, ways })).toEqual(ab.fits)
    expect(fitsOfPick({ row: onDefault, ways })).toEqual(on.fits)
    expect(fitsOfPick({ row: notPnp, ways })).toBeNull()
    expect(fitsOfPick({ row: unknown, ways })).toBeNull()
    const rows = [named, onDefault, bc, notPnp, unknown]
    const ids = (f: { who: string, edu: string[] }) => keepFitPicksOf({ rows, ways, filter: f }).map((r) => r.id)
    // 毕业工签、安省读的书:AB 科技走不了去掉;安省默认通道要本省院校 —— 对上了留
    expect(ids({ who: 'pgwp', edu: ['ON.public.y1'] })).toEqual([2, 3, 4, 5])
    // 毕业工签、外省读的书:安省默认通道的本省院校条件对不上也去掉
    expect(ids({ who: 'pgwp', edu: ['BC.public.y2'] })).toEqual([3, 4, 5])
    // 教育经历没填:院校条件不筛(同「我的通道」卡)
    expect(ids({ who: 'pgwp', edu: [] })).toEqual([2, 3, 4, 5])
    // 开放工签:对照里有这一格且能走
    expect(ids({ who: 'open', edu: [] })).toEqual([1, 2, 3, 4, 5])
    // 没答身份:一条不筛
    expect(ids({ who: '', edu: [] })).toEqual([1, 2, 3, 4, 5])
  })

  it('③ 今天新碰过的岗剔掉,其余顺序不变', () => {
    const rows = [row(5), row(3), row(9), row(1)]
    expect(dropTouchedOf({ rows, touched: [3, 1, 77] }).map((r) => r.id)).toEqual([5, 9])
    expect(dropTouchedOf({ rows, touched: [] })).toEqual(rows)
  })
})

describe('推荐 SQL', () => {
  it('⑤ 硬条件都在,排序键次序固定', () => {
    const q = SQL.MYJOBS_PICKS
    for (const must of [
      "j.status = 'open'", "COALESCE(j.apply_email, '') <> ''", 'a.user_id = $1 AND a.job_id = j.id', 'bounced_emails',
      "interval '30 days'", "NULLIF(u.answers->'basic'->>'resProv', '')", 'LIMIT $3',
    ]) {
      expect(q).toContain(must)
    }
    const order = q.slice(q.indexOf('ORDER BY'))
    const keys = ['j.pnp_eligible', 'j.grade_channel', 'j.date_posted', 'j.salary_annual > j.wage_med_annual']
    const at = keys.map((k) => order.indexOf(k))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('⑤ 金标(2026-10-11):过期省不加分 —— 两个省提名排序键都套 stale 守卫;过期 = offerDrawLast 早于今天减 $4 天;缺这一格不算过期', () => {
    const q = SQL.MYJOBS_PICKS
    const order = q.slice(q.indexOf('ORDER BY'))
    expect(order).toContain('(j.pnp_eligible AND st.code IS NULL) DESC')
    expect(order).toContain('CASE WHEN st.code IS NULL THEN j.grade_channel END DESC')
    expect(q).toContain("info->>'offerDrawLast' IS NOT NULL AND (info->>'offerDrawLast')::date < current_date - $4::int")
    expect(q).toContain('LEFT JOIN stale st ON st.code = j.province')
    expect(q).toContain('(st.code IS NULL) AS offer_active')
    expect(q).toContain("u.answers->'basic'->'nocs'")
  })

  it('⑧ 金标(2026-10-11 晚):档案答了只按它选岗;投递只算真发出去的;完整 5 位 NOC 比对', () => {
    const q = SQL.MYJOBS_PICKS
    expect(q).not.toContain('left(')
    expect(q).toContain('WHERE length(w) = 5')
    const saved = q.slice(q.indexOf('FROM saved_jobs'), q.indexOf('AS saved_g'))
    expect(saved).toContain('cardinality(want.g) = 0')
    const applied = q.slice(q.indexOf('FROM applications a JOIN jobs aj'), q.indexOf('AS applied_g'))
    expect(applied).toContain("a.status IN ('sent', 'replied')")
    expect(applied).toContain('cardinality(want.g) = 0')
    expect(applied).not.toContain('draft')
    expect(q).toContain('j.noc = ANY(me.saved_g || me.applied_g || me.want_g)')
    expect(q).toContain('(j.noc = ANY(me.want_g)) AS occ_want')
  })

  it('⑧ 金标:三种理由各自命中(档案 = 职业对口、收藏 = 和你收藏的同类、投递 = 和你投过的同类)', () => {
    const base = {
      occApplied: false, occSaved: false, occWant: false, pnp: false, offerActive: true, aboveMed: false, province: 'ON',
      lmia: false, ee: false, aip: false, pilot: false, known: false,
    }
    expect(reasonsOf({ ...base, occWant: true })).toEqual(['occ'])
    expect(reasonsOf({ ...base, occSaved: true })).toEqual(['saved'])
    expect(reasonsOf({ ...base, occApplied: true })).toEqual(['applied'])
  })

  it('⑤ 天数 90 作 $4 交给库;库行的 offer_active / occ_want 落到理由上', async () => {
    expect(PICKS_DRAW_DAYS).toBe(90)
    const seen: unknown[][] = []
    const dbRow = {
      id: 1, title: 'cook', province: 'ON', city: 'Toronto', pnp_eligible: true, above_med: false,
      occ_applied: false, occ_saved: false, occ_want: true, offer_active: false,
    }
    const db = {
      query: async (_sql: string, params: unknown[]) => {
        seen.push(params)
        return { rows: [dbRow, { ...dbRow, id: 2, province: 'BC', occ_want: false, offer_active: true }] }
      },
    }
    const rows = await loadPicks({ db: db as never, userId: 5, prov: 'ON' })
    expect(seen[0]).toEqual([5, 'ON', 50, 90])
    expect(rows.map((r) => r.reasons)).toEqual([['occ'], ['pnp']])
  })
})

const t = (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v))

// jsdom 没有 matchMedia(清单按它判手机卡 / 网页表格);给一个「不是窄屏」的桩 → 走网页端表格
window.matchMedia = ((q: string) => ({
  matches: false, media: q, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined,
  addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

function stub(reply: { status: number, body: object }) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).startsWith('/api/myjobs/picks')) {
      return { status: reply.status, ok: reply.status < 300, json: async () => reply.body }
    }
    return new Promise(() => undefined)
  }))
}

async function flush() {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

// 2026-11-07「我的」新域重写:今日推荐不再是单独一张卡(Picks),是「我的求职」整页正文 JobsBody 的默认页签
type BodyProps = { pro: boolean, gen: number, asked: number }

function body(p: BodyProps) {
  return createElement(JobsBody, {
    t, pro: p.pro, plan: {}, gen: p.gen, asked: p.asked, onAsked: () => undefined, openApp: () => undefined,
  })
}

async function mount(pro: boolean) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(body({ pro, gen: 0, asked: 0 }))
  })
  await flush()
  return el
}

// 今日推荐那一枚页签(Tabs 桶 role=tab,id 尾是页签身份)
function picksTab(el: HTMLElement) {
  return el.querySelector('[role="tab"][id$="picks"]') as HTMLElement
}

const PICK = {
  id: 7, title: 'administrative assistant', titleZh: '行政助理', titleKo: '', company: 'B. M. Optical Lab Limited', companyZh: '',
  companyKo: '', companySlug: '', address: '1 Bowes Rd, Concord, ON L4K 1H4', city: 'Concord', cityZh: '', cityKo: '', province: 'ON',
  salary: '$24/hr', datePosted: '2026-10-10T00:00:00.000Z', reasons: ['occ', 'pnp', 'nope'], program: 'OINP',
  hours: 'part', term: 'seasonal', validThrough: '2026-11-09T00:00:00.000Z',
  pnpStream: '', pnpEligible: true, provDefault: true, abovePct: null, lmiaPositions: 0, eeCategory: '', drawLast: '', pilot: '',
}
const LOCKED = {
  title: 'medical office assistant', titleZh: '', titleKo: '', reasons: ['pnp', 'wage'], program: 'OINP', province: 'ON',
  pnpStream: '', pnpEligible: true, provDefault: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  // 2026-11-07:「投递」往地址栏推 `?apply=`,每条用例从干净地址起
  window.history.replaceState(null, '', '/account')
})

describe('今日推荐卡', () => {
  it('⑥ 免费号:推荐行 + 通道列 + 「显示更多」点开出锁住的(职位名看得见)', async () => {
    stub({ status: 200, body: { picks: [PICK], more: 7, locked: [LOCKED] } })
    const el = await mount(false)
    // 2026-11-07:卡头撤,标题与数字挂到页签上(数字 = 看得见的 1 + 锁住的 7),进页默认落这一枚
    expect(picksTab(el).textContent).toBe('mj.tab.picks8')
    expect(picksTab(el).getAttribute('aria-selected')).toBe('true')
    expect(el.textContent).toContain('administrative assistant')
    expect(el.textContent).toContain('$24/hr')
    expect(el.textContent).not.toContain('2026-10-10')   // 2026-11-07 效果图:推荐表撤发布日期列
    expect(el.textContent).toContain('2026-11-09')   // 截止日期列
    expect(el.textContent).not.toContain('Part-time')   // 2026-10-12 推荐表不出工时 / 雇佣期两列
    expect(el.textContent).not.toContain('Seasonal')
    expect(el.textContent).toContain('pnp.gen.ON')   // 通道列:可提名 + 本省有省默认通道 = 那条省默认通道(取词桩原样回键)
    expect(el.textContent).not.toContain('mj.why.occ')   // 2026-10-12 Frank「职业对口 也是废话」:不出
    expect(el.textContent).not.toContain('mj.why.pnp')   // 2026-10-12 项目总名不是通道名、与通道列重复:不出
    expect(el.textContent).not.toContain('nope')
    expect(el.textContent).not.toContain('medical office assistant')   // 没点「显示更多」锁住的不出
    expect(el.textContent).toContain('mj.swap')   // 推荐总条数(看得见 + 锁住)多于先列的 3 条:出「换一批」
    expect(el.textContent).toContain('loadMore{"n":7,"left":7}')
    await act(async () => {
      Array.from(el.querySelectorAll('button')).find((x) => x.textContent === 'loadMore{"n":7,"left":7}')?.click()
    })
    expect(el.textContent).toContain('medical office assistant')
    expect(el.textContent).toContain('mj.unlock')
    // 2026-10-13 展开着「显示更多」的位置换成「收起」,点了回到先列的那几条
    expect(el.textContent).not.toContain('loadMore{"n":7,"left":7}')
    await act(async () => {
      Array.from(el.querySelectorAll('button')).find((x) => x.textContent === 'fold.up')?.click()
    })
    expect(el.textContent).not.toContain('medical office assistant')
    expect(el.textContent).toContain('loadMore{"n":7,"left":7}')
    const addr = Array.from(el.querySelectorAll('a')).find((a) => a.textContent === PICK.address)
    expect(addr?.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(PICK.address))
  })

  it('⑥ 一行只有一颗「投递」,点了就地弹投递框;「删除」(不再推)撤(2026-11-07)', async () => {
    stub({ status: 200, body: { picks: [PICK], more: 0, locked: [] } })
    const el = await mount(false)
    const row = Array.from(el.querySelectorAll('tr')).find((r) => r.textContent?.includes(PICK.title)) as HTMLElement
    expect(Array.from(row.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['mj.apply'])
    await act(async () => {
      row.querySelector('button')?.click()
    })
    expect(new URLSearchParams(window.location.search).get('apply')).toBe('7')
  })

  it('⑥ Pro 不出锁住的与「升级 Pro」;多于 3 条先列 3 条,「显示更多」列全', async () => {
    const many = [1, 2, 3, 4, 5].map((i) => ({ ...PICK, id: i, title: 'job ' + i }))
    stub({ status: 200, body: { picks: many, more: 0, locked: [] } })
    const el = await mount(true)
    expect(picksTab(el).textContent).toBe('mj.tab.picks5')
    expect(el.textContent).toContain('job 3')
    expect(el.textContent).not.toContain('job 4')
    expect(el.textContent).toContain('mj.swap')   // 多于先列的 3 条才出「换一批」
    await act(async () => {
      Array.from(el.querySelectorAll('button')).find((x) => x.textContent === 'loadMore{"n":2,"left":2}')?.click()
    })
    expect(el.textContent).toContain('job 5')
    expect(el.textContent).not.toContain('mj.unlock')
  })

  it('⑥ 零条出一行空态;失败出刷新再试', async () => {
    stub({ status: 200, body: { picks: [], more: 0, locked: [] } })
    const empty = await mount(false)
    expect(empty.textContent).toContain('mj.picksEmpty')
    expect(empty.textContent).not.toContain('mj.swap')   // 不多于先列的 3 条:不出「换一批」
    document.body.innerHTML = ''
    stub({ status: 500, body: {} })
    const el = await mount(false)
    expect(el.textContent).toContain('mj.fail')
    expect(el.textContent).not.toContain('mj.picksEmpty')
    expect(picksTab(el).textContent).toBe('mj.tab.picks')   // 没拉到不挂计数
  })
})

// 新岗推送卡(Push;2026-10-10 批 2):设置拉回来才出;频率 weekly 回显、「不发」是空值档;保存发 POST { freq, email },
// 回 pending 出「点 X 收到的链接后生效」;拉失败出刷新再试。探针:freqOutOf 不把空串折 off → POST 体那条红。
// 2026-10-11 批 5「提示统一 + 顶栏铃铛」:存完那一句改右上角提示(toast 总线),pending = 「确认信已发出」+ 灰字副行;卡里不再出。
// 2026-11-07「我的」新域重写:新岗推送挪进「我的订阅」页(me 桶子桶 sub,SubBody 的「新岗推送」分区卡 SubPush,状态在 useSub)——
//       挂 useSub + SubBody 整页正文,断言收在卡头 mj.push 那一张卡里;「拉失败」那条只让推送设置接口失败(付款记录照常回零条),
//       免得付款卡的同一句「刷新再试」冒充推送卡的。
type SubProps = { t: typeof t }

function SubPage(p: SubProps) {
  return createElement(SubBody, { s: useSub({ t: p.t }), t: p.t })
}

async function mountSub() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  await act(async () => {
    createRoot(el).render(createElement(SubPage, { t }))
  })
  await flush()
  return el
}

// 卡头是 mj.push 的那一张分区卡
function pushCard(el: HTMLElement) {
  return Array.from(el.querySelectorAll('section')).find((s) => s.firstElementChild?.textContent === 'mj.push') as HTMLElement
}

describe('新岗推送卡', () => {
  it('回显、保存、待确认那一句', async () => {
    const posts: string[] = []
    const toasts: unknown[] = []
    function onToast(e: Event) {
      toasts.push((e as CustomEvent).detail)
    }
    window.addEventListener('offer2pr:toast', onToast)
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && String(url) === '/api/alerts/prefs') {
        posts.push(String(init.body))
        return { status: 200, ok: true, json: async () => ({ result: 'pending' }) }
      }
      if (String(url) === '/api/alerts/prefs') {
        return { status: 200, ok: true, json: async () => ({ freq: 'weekly', email: 'me@x.com', pending: '' }) }
      }
      return new Promise(() => undefined)
    }))
    const el = pushCard(await mountSub())
    const sel = el.querySelector('select') as HTMLSelectElement
    expect(sel.value).toBe('weekly')
    expect(Array.from(sel.options).map((o) => o.value)).toEqual(['', 'daily', 'weekly'])
    const input = el.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('me@x.com')
    await act(async () => {
      sel.value = ''
      sel.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'mj.pushSave')?.click()
    })
    await flush()
    expect(posts).toEqual([JSON.stringify({ freq: 'off', email: 'me@x.com' })])
    expect(toasts).toEqual([{ kind: 'ok', title: 'mj.pushMailSent', detail: 'mj.pushPending{"e":"me@x.com"}' }])
    expect(el.textContent).not.toContain('mj.pushPending')
    window.removeEventListener('offer2pr:toast', onToast)
  })

  it('拉失败出刷新再试', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url) === '/api/stripe/payments') {
        return { status: 200, ok: true, json: async () => ({ items: [] }) }
      }
      return { status: 500, ok: false, json: async () => ({}) }
    }))
    const el = await mountSub()
    expect(pushCard(el).textContent).toContain('mj.fail')
    expect(pushCard(el).querySelector('select')).toBeNull()   // 设置没拉到不出表单
    expect(el.textContent).toContain('sub.noPay')   // 付款卡照常(不是整页一起失败)
  })
})

describe('答完档案重拉', () => {
  it('⑦ asked 0 不带 fresh;asked 变 1 重拉一次且带 fresh=1', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).startsWith('/api/myjobs/picks')) {
        return { status: 200, ok: true, json: async () => ({ picks: [], more: 0, locked: [] }) }
      }
      return new Promise(() => undefined)
    }))
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    await act(async () => {
      root.render(body({ pro: false, gen: 0, asked: 0 }))
    })
    await act(async () => {
      root.render(body({ pro: false, gen: 0, asked: 1 }))
    })
    const picks = urls.filter((u) => u.startsWith('/api/myjobs/picks'))
    expect(picks).toHaveLength(2)
    expect(picks[0]).not.toContain('fresh=1')
    expect(picks[1]).toContain('&fresh=1')
  })

  it('⑨ 投出一封(gen 变了):今日推荐与我的投递各重拉一次,我的收藏不重拉(2026-11-07 改:原按 key 整卡重挂)', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      return new Promise(() => undefined)
    }))
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    await act(async () => {
      root.render(body({ pro: false, gen: 0, asked: 0 }))
    })
    await act(async () => {
      root.render(body({ pro: false, gen: 1, asked: 0 }))
    })
    function count(head: string) {
      return urls.filter((u) => u.startsWith(head)).length
    }
    expect(count('/api/myjobs/picks')).toBe(2)
    expect(count('/api/myjobs/applied')).toBe(2)
    expect(count('/api/myjobs/saved')).toBe(1)
    expect(urls.filter((u) => u.startsWith('/api/myjobs/picks')).every((u) => u.includes('fresh=1') === false)).toBe(true)
  })
})
