/**
 * 兜底解析层测试:采信校验(穷举 + 变异探针)与收件箱机制(工具怎么把结果交回来)。
 *
 * 不连库 —— 假 pool 就够:这一层要测的是「模型说什么我们收不收」,不是库里真有什么
 * (库里有什么归 chatTools 那组连生产只读的测)。
 *
 * 🔴 收件箱那组是这一层的命门:pi 的 `execute` 是**库调我们**,返回值只回给模型,
 *    结果只能从收件箱出来。这组就是照 pi 的调用形状 `execute(toolCallId, args)` 手动调一遍 ——
 *    2026-08-19 换掉取结果机制时,正是这条路没有任何测试盖着。
 */
import { describe, expect, it } from 'vitest'

import { acceptNoc, cleanProvs, makeTools } from '@/lib/agent/functions'
import { TOOLS } from '@/lib/agent/constants'
import type { Candidate, Inbox } from '@/lib/agent/types'
import { ALL_PROVS } from '@/lib/location'

const CARPENTER = '72310'
const DEV = '21232'
const HITS: Candidate[] = [{ noc: CARPENTER, title: 'Carpenters' }, { noc: DEV, title: 'Software developers' }]

function emptyInbox(): Inbox {
  return { candidates: [], claim: null, gaveUp: false }
}

// 假池:只回喂进去的行,不碰库。
function poolOf(rows: Record<string, unknown>[]) {
  return { query: async () => ({ rows }) }
}

// ── 1. 省码采信:认得出的留下,认不出的丢掉 ──────────────────────────────────
describe('cleanProvs', () => {
  it('九省 + QC 一个不漏,大小写与空格都规范化', () => {
    for (const prov of ALL_PROVS) {
      expect(cleanProvs({ raw: [prov] })).toEqual([prov])
      expect(cleanProvs({ raw: [` ${prov.toLowerCase()} `] })).toEqual([prov])
    }
  })

  it('认不出的一律丢掉,不猜', () => {
    expect(cleanProvs({ raw: ['XX', 'ZZ', '', 'British Columbia'] })).toEqual([])
  })

  it('混着给:只留认得出的那些,顺序不变', () => {
    expect(cleanProvs({ raw: ['bc', 'XX', 'on'] })).toEqual(['BC', 'ON'])
  })

  it('压根没给 → 空数组,不报错', () => {
    expect(cleanProvs({ raw: undefined })).toEqual([])
  })

  it('性质:输出永远是省码表的子集', () => {
    const noise = ['A', 'BCD', '12', 'bc', 'nb ', '', 'ON', 'qc']
    for (const p of cleanProvs({ raw: noise })) expect(ALL_PROVS.has(p)).toBe(true)
  })
})

// ── 2. NOC 采信:只认搜索真实返回过的码 ─────────────────────────────────────
describe('acceptNoc', () => {
  it('候选里出现过 → 收', () => {
    expect(acceptNoc({ raw: CARPENTER, candidates: HITS })).toBe(CARPENTER)
  })

  it('🔴 变异探针:把候选里的码改一位 → 不收', () => {
    for (let i = 0; i < CARPENTER.length; i++) {
      const digit = CARPENTER[i] === '9' ? '8' : String(Number(CARPENTER[i]) + 1)
      const mutated = CARPENTER.slice(0, i) + digit + CARPENTER.slice(i + 1)
      expect(acceptNoc({ raw: mutated, candidates: HITS })).toBeNull()
    }
  })

  it('形状不对的一律不收:四位、六位、带字母、带空格、空串', () => {
    for (const bad of ['7231', '723100', '7231a', '723 10', '', '  ']) {
      expect(acceptNoc({ raw: bad, candidates: HITS })).toBeNull()
    }
  })

  it('模型没给码(null)→ 不收,也不报错', () => {
    expect(acceptNoc({ raw: null, candidates: HITS })).toBeNull()
  })

  it('一次都没搜过 → 白名单是空的,什么码都不收', () => {
    expect(acceptNoc({ raw: CARPENTER, candidates: [] })).toBeNull()
  })

  it('前后空格不影响采信(先 trim 再比)', () => {
    expect(acceptNoc({ raw: ` ${DEV} `, candidates: HITS })).toBe(DEV)
  })
})

// ── 3. 收件箱:三把工具怎么把结果交回来 ─────────────────────────────────────
describe('收件箱机制', () => {
  it('三把工具的名字与 constants 里那份逐字相同(提示词按这个名字点名)', () => {
    const tools = makeTools({ pool: poolOf([]), out: emptyInbox() })
    expect(tools.map((t) => t.name)).toEqual([TOOLS.search.name, TOOLS.setSlots.name, TOOLS.giveUp.name])
  })

  it('search:候选进收件箱,回执里也带一份;不收工', async () => {
    const out = emptyInbox()
    const rows = [{ noc: CARPENTER, title: 'Carpenters', n: 112 }]
    const [search] = makeTools({ pool: poolOf(rows), out })
    const res = await search.execute('call-1', { query: 'carpenter' })
    expect(out.candidates).toEqual([{ noc: CARPENTER, title: 'Carpenters' }])
    expect(res.details).toEqual({ candidates: [{ noc: CARPENTER, title: 'Carpenters' }] })
    expect(res.terminate).toBe(false)
  })

  it('set_slots:模型填的原样进收件箱(**不在这里采信**),并收工', async () => {
    const out = emptyInbox()
    const tools = makeTools({ pool: poolOf([]), out })
    const args = { noc: CARPENTER, provinces: ['ON'], reason: 'graduated in carpentry' }
    const res = await tools[1].execute('call-2', args)
    expect(out.claim).toEqual(args)
    expect(out.gaveUp).toBe(false)
    expect(res.terminate).toBe(true)
  })

  it('set_slots:连编造的码也照记 —— 拦它是入口的事,不是回调的事', async () => {
    const out = emptyInbox()
    const tools = makeTools({ pool: poolOf([]), out })
    await tools[1].execute('call-3', { noc: '99999' })
    expect(out.claim?.noc).toBe('99999')
    expect(acceptNoc({ raw: out.claim?.noc ?? null, candidates: out.candidates })).toBeNull()
  })

  it('give_up:标记进收件箱并收工,槽位保持空', async () => {
    const out = emptyInbox()
    const tools = makeTools({ pool: poolOf([]), out })
    const res = await tools[2].execute('call-4', { reason: 'no plausible occupation' })
    expect(out.gaveUp).toBe(true)
    expect(out.claim).toBeNull()
    expect(res.terminate).toBe(true)
  })

  it('每趟一个收件箱:两趟工具互不串台', async () => {
    const a = emptyInbox()
    const b = emptyInbox()
    await makeTools({ pool: poolOf([]), out: a })[2].execute('call-5', {})
    expect(a.gaveUp).toBe(true)
    expect(b.gaveUp).toBe(false)
  })
})

// ── 4. 候选查询:噪音按相对量砍,不按绝对量 ─────────────────────────────────
describe('候选噪音过滤', () => {
  it('榜首 10% 以下的丢掉(「读 IT」连带命中的那类)', async () => {
    const out = emptyInbox()
    const rows = [
      { noc: DEV, title: 'Software developers', n: 112 },
      { noc: '12111', title: 'Library assistants', n: 8 },
    ]
    const [search] = makeTools({ pool: poolOf(rows), out })
    await search.execute('call-6', { query: 'IT' })
    expect(out.candidates.map((c) => c.noc)).toEqual([DEV])
  })

  it('冷门职业整行都小也留得住 —— 判据是相对量', async () => {
    const out = emptyInbox()
    const rows = [
      { noc: '63201', title: 'Butchers', n: 7 },
      { noc: '65202', title: 'Meat cutters', n: 6 },
    ]
    const [search] = makeTools({ pool: poolOf(rows), out })
    await search.execute('call-7', { query: 'butcher' })
    expect(out.candidates.map((c) => c.noc)).toEqual(['63201', '65202'])
  })

  it('查不动(库抛错)→ 当没候选,不抛给调用方', async () => {
    const out = emptyInbox()
    const broken = { query: async () => { throw new Error('connection terminated') } }
    const [search] = makeTools({ pool: broken, out })
    const res = await search.execute('call-8', { query: 'carpenter' })
    expect(out.candidates).toEqual([])
    expect(res.details).toEqual({ candidates: [] })
  })
})
