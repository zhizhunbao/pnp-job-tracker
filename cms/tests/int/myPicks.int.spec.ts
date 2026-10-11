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
// 探针:reasonsOf 去掉 else(occ 与 saved 同出)→ ① 红;picksViewOf 锁住行抄整行 → ②「只有三键」红;dropTouchedOf 不剔 → ③ 红;
//       ORDER BY 里 date_posted 挪到 pnp_eligible 前 → ⑤ 红;Picks 对 Pro 也出更多卡 → ⑥ 红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Picks, Push } from '@/components/myjobs'
import { SQL } from '@/lib/db'
import { PICKS_FREE, PICKS_LOCKED_SHOW } from '@/lib/myjobs/constants'
// 测试例外:域内函数直接点文件(server 门只放路由与注入件)
import { addressOf, dropTouchedOf, picksViewOf, reasonsOf } from '@/lib/myjobs/functions'
import type { PickRow } from '@/lib/myjobs/types'

const PROVS = ['ON', 'BC', 'QC', ''] as const
const BOOLS = [true, false] as const

function row(id: number): PickRow {
  return {
    id, title: 'job ' + id, titleZh: '', titleKo: '', company: 'Secret Co ' + id, companyZh: '', companyKo: '',
    companySlug: 'secret-co-' + id, address: '1 Hidden St ' + id, city: 'Toronto', cityZh: '', cityKo: '', province: 'ON',
    salary: '$' + id + '/hr', datePosted: '2026-10-10T00:00:00.000Z', reasons: ['pnp'], program: 'OINP', hours: 'full',
    term: 'permanent', validThrough: '',
  }
}

describe('推荐理由', () => {
  it('① 只放真的,全格穷举', () => {
    for (const occApplied of BOOLS) {
      for (const occSaved of BOOLS) {
        for (const pnp of BOOLS) {
          for (const aboveMed of BOOLS) {
            for (const province of PROVS) {
              const r = reasonsOf({ occApplied, occSaved, pnp, aboveMed, province })
              const want: string[] = []
              if (occApplied) {
                want.push('occ')
              } else if (occSaved) {
                want.push('saved')
              }
              if (pnp && (province === 'ON' || province === 'BC')) {
                want.push('pnp')
              }
              if (aboveMed) {
                want.push('wage')
              }
              expect(r).toEqual(want)
              expect(r.includes('occ') && r.includes('saved')).toBe(false)
            }
          }
        }
      }
    }
  })
})

describe('免费 / Pro 切分', () => {
  it('② 免费号:前 3 条 + 更多条数 + 锁住的只有三键;Pro 全给', () => {
    for (let n = 0; n <= 12; n++) {
      const rows = Array.from({ length: n }, (_, i) => row(i + 1))
      const free = picksViewOf({ rows, pro: false })
      expect(free.picks).toEqual(rows.slice(0, PICKS_FREE))
      expect(free.more).toBe(Math.max(0, n - PICKS_FREE))
      expect(free.locked).toHaveLength(Math.min(PICKS_LOCKED_SHOW, Math.max(0, n - PICKS_FREE)))
      for (const l of free.locked) {
        expect(Object.keys(l).sort()).toEqual(['program', 'reasons', 'title'])
        const wire = JSON.stringify(l)
        expect(wire).not.toContain('Secret Co')
        expect(wire).not.toContain('Hidden St')
        expect(wire).not.toContain('/hr')
      }
      const pro = picksViewOf({ rows, pro: true })
      expect(pro).toEqual({ picks: rows, more: 0, locked: [] })
    }
  })

  it('③ 今天新碰过的岗剔掉,其余顺序不变', () => {
    const rows = [row(5), row(3), row(9), row(1)]
    expect(dropTouchedOf({ rows, touched: [3, 1, 77] }).map((r) => r.id)).toEqual([5, 9])
    expect(dropTouchedOf({ rows, touched: [] })).toEqual(rows)
  })

  it('④ 地点一行照 Indeed', () => {
    expect(addressOf({ address: '1 Bowes Rd, Concord, ON L4K 1H4', city: 'Concord', province: 'ON' })).toBe('1 Bowes Rd, Concord, ON L4K 1H4')
    expect(addressOf({ address: '', city: 'Concord', province: 'ON' })).toBe('Concord, ON')
    expect(addressOf({ address: '', city: '', province: 'ON' })).toBe('ON')
    expect(addressOf({ address: '', city: 'Concord', province: '' })).toBe('Concord')
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

async function mount(pro: boolean) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(createElement(Picks, { t, pro, gen: 0 }))
  })
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
  return el
}

const PICK = {
  id: 7, title: 'administrative assistant', titleZh: '行政助理', titleKo: '', company: 'B. M. Optical Lab Limited', companyZh: '',
  companyKo: '', companySlug: '', address: '1 Bowes Rd, Concord, ON L4K 1H4', city: 'Concord', cityZh: '', cityKo: '', province: 'ON',
  salary: '$24/hr', datePosted: '2026-10-10T00:00:00.000Z', reasons: ['occ', 'pnp', 'nope'], program: 'OINP',
  hours: 'part', term: 'seasonal', validThrough: '2026-11-09T00:00:00.000Z',
}
const LOCKED = { title: 'medical office assistant', reasons: ['pnp', 'wage'], program: 'OINP' }

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('今日推荐卡', () => {
  it('⑥ 免费号:推荐行 + 理由胶囊 + 更多推荐卡(锁住的职位名看得见)', async () => {
    stub({ status: 200, body: { picks: [PICK], more: 7, locked: [LOCKED] } })
    const el = await mount(false)
    expect(el.textContent).toContain('mj.picks')
    expect(el.textContent).toContain('administrative assistant')
    expect(el.textContent).toContain('$24/hr')
    expect(el.textContent).toContain('2026-10-10')
    expect(el.textContent).toContain('2026-11-09')   // 截止日期列
    expect(el.textContent).toContain('Part-time')
    expect(el.textContent).toContain('Seasonal')
    expect(el.textContent).toContain('mj.why.occ')
    expect(el.textContent).toContain('mj.why.pnp{"p":"OINP"}')
    expect(el.textContent).not.toContain('nope')
    expect(el.textContent).toContain('mj.more7')
    expect(el.textContent).toContain('medical office assistant')
    expect(el.textContent).toContain('mj.why.wage')
    expect(el.textContent).toContain('mj.upgrade')
    const addr = Array.from(el.querySelectorAll('a')).find((a) => a.textContent === PICK.address)
    expect(addr?.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(PICK.address))
  })

  it('⑥ Pro 不出更多推荐卡', async () => {
    stub({ status: 200, body: { picks: [PICK], more: 0, locked: [] } })
    const el = await mount(true)
    expect(el.textContent).toContain('administrative assistant')
    expect(el.textContent).not.toContain('mj.more')
  })

  it('⑥ 零条出一行空态;失败出刷新再试', async () => {
    stub({ status: 200, body: { picks: [], more: 0, locked: [] } })
    expect((await mount(false)).textContent).toContain('mj.picksEmpty')
    document.body.innerHTML = ''
    stub({ status: 500, body: {} })
    const el = await mount(false)
    expect(el.textContent).toContain('mj.fail')
    expect(el.textContent).not.toContain('mj.picksEmpty')
  })
})

// 新岗推送卡(Push;2026-10-10 批 2):设置拉回来才出;频率 weekly 回显、「不发」是空值档;保存发 POST { freq, email },
// 回 pending 出「点 X 收到的链接后生效」;拉失败出刷新再试。探针:freqOutOf 不把空串折 off → POST 体那条红。
describe('新岗推送卡', () => {
  it('回显、保存、待确认那一句', async () => {
    const posts: string[] = []
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
    const el = document.createElement('div')
    document.body.appendChild(el)
    await act(async () => {
      createRoot(el).render(createElement(Push, { t }))
    })
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.resolve()
      })
    }
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
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.resolve()
      })
    }
    expect(posts).toEqual([JSON.stringify({ freq: 'off', email: 'me@x.com' })])
    expect(el.textContent).toContain('mj.pushPending{"e":"me@x.com"}')
  })

  it('拉失败出刷新再试', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 500, ok: false, json: async () => ({}) })))
    const el = document.createElement('div')
    document.body.appendChild(el)
    await act(async () => {
      createRoot(el).render(createElement(Push, { t }))
    })
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.resolve()
      })
    }
    expect(el.textContent).toContain('mj.fail')
  })
})
