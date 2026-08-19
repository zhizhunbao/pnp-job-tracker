/**
 * 组稿闸门批:闸A 归因闸 + 闸B 派生数单位闸(2026-08-09)。
 *
 * 金标是 **Lead 生产链路实测 33102 锚号三轮的原句**,不是想出来的句子:
 *   ① `…which your previous message indicates you do not` —— 用户没说过经验(expMonths=null),
 *      组稿把「缺槽」编成「你说过没有」;
 *   ② `You are currently short by 6 months on this requirement` —— 6 = 24 − 18,把 PGWP 剩 18 个月
 *      当经验做减法;6 还借用户原话里的「CLB 6」骗过了数字闸;
 *   ③ `…cutoff scores up to 475 CRS, which is higher than your current score` —— 槽里根本没有 CRS。
 * ①③一个数字都不用编,②的数字在 echo 里出现过 —— 三句**全部过得了** guardAnswer,这就是这批要补的洞。
 *
 * 真组件:两道闸的判定本体、`sentenceBlockers` 逐句门集合、以及 `orchestrate` 全链(整段校验路径 →
 * 撞了硬拦 → 重试 → 仍犯则降级成事实清单)。fixture 只有数据库行与 LLM I/O。
 */
import { describe, expect, it, vi } from 'vitest'

const H = vi.hoisted(() => ({
  slots: '{}',
  answer: '',
}))
vi.mock('@/lib/llm', () => ({
  completeText: vi.fn(async ({ messages }: { messages: { content: string }[] }) =>
    (messages[0]?.content?.includes('You turn one message') ? H.slots : H.answer)),
}))

import { findUngroundedClaims, findUnitMismatch, guardAnswer } from '@/lib/chat/guards'
import { orchestrate } from '@/lib/chat/orchestrate'
import { sentenceBlockers } from '@/lib/chat/stream'
import type { Fact, Slots } from '@/lib/chat/types'

const emptySlots = (over: Partial<Slots> = {}): Slots =>
  ({ noc: '33102', occText: 'nurse aide', provs: [], expMonths: null, status: null, claims: [], ...over })

const f = (over: Partial<Fact>): Fact => ({
  tool: 'lookupThresholds', label: 'NS requirement experience (applicant)', value: 24, valueText: '', unit: 'months',
  evidence: { url: 'https://novascotia.ca/x', fetched: '2026-08-09' }, ...over,
})

// ── 生产实测三句原句(①的省略号按当时上下文补全成整句,补的是门槛那半截,断言点在后半句)──
const BAD1 = 'The specific eligibility requirement is 24 months of paid work experience, which your previous message indicates you do not have.'
const BAD2 = 'You are currently short by 6 months on this requirement.'
const BAD3 = 'The latest draws show cutoff scores up to 475 CRS, which is higher than your current score.'

describe('闸A 归因闸(第二人称陈述态 + 手上没有值的属性)', () => {
  const facts = [f({}), f({ tool: 'lookupDraws', label: 'NS latest draw cutoff', value: 475, unit: 'points' })]

  it('三句生产原句全部拦下,并点名是哪个属性', () => {
    const empty = emptySlots()
    expect(findUngroundedClaims(BAD1, empty)[0]).toMatch(/^exp:/)
    expect(findUngroundedClaims(BAD2, empty)[0]).toMatch(/^exp:/)
    expect(findUngroundedClaims(BAD3, empty)[0]).toMatch(/^crs:/)
    // 🔴 病根实证:同样这三句,数字闸(facts 里有 24 与 475、echo 里有 6)一句都拦不下
    expect(guardAnswer(BAD1, facts, 'CLB 6').ok).toBe(true)
    expect(guardAnswer(BAD2, facts, 'CLB 6').ok).toBe(true)
    expect(guardAnswer(BAD3, facts, 'CLB 6').ok).toBe(true)
  })

  it('中文态两查(07 评测批补):同病同拦,经验/CRS 的中文句式也在判据面内', () => {
    const empty = emptySlots()
    expect(findUngroundedClaims('你的经验还差 6 个月才满足这条线。', empty)[0]).toMatch(/^exp:/)
    expect(findUngroundedClaims('你的 CRS 分数还不够这轮抽选。', empty)[0]).toMatch(/^crs:/)
  })

  it('要求态是门槛转述,一句都不许拦', () => {
    const empty = emptySlots()
    for (const s of [
      'BC Skilled Worker requires you to have 24 months of experience.',
      'You need 24 months of paid work experience for this stream.',
      'If you have 24 months of experience, this stream opens up.',
      'Do you have any Canadian work experience?',
      'BC SW 线要求你有 24 个月经验。',
      '你需要 CLB 7 才够这条线。',
      '如果你的经验满 24 个月,这条线就能走。',
      '你有没有加拿大经验?',
    ]) expect(findUngroundedClaims(s, empty), s).toEqual([])
  })

  it('属性有底就放行:槽里有值(含 0 与 false)、或他自己这轮说过', () => {
    // 槽里有值
    expect(findUngroundedClaims('你的 CLB 是 6,已过这条线。', emptySlots({ clb: 6 }))).toEqual([])
    expect(findUngroundedClaims('You have no paid work experience yet.', emptySlots({ expMonths: 0 })),
      'expMonths=0 是判定不是缺失').toEqual([])
    expect(findUngroundedClaims('You are a student in Canada.', emptySlots({ status: 'student' }))).toEqual([])
    // 同样的句子,槽是空的 → 拦(证明放行来自槽,不是正则恰好没命中)
    expect(findUngroundedClaims('你的 CLB 是 6,已过这条线。', emptySlots())[0]).toMatch(/^clb:/)
    expect(findUngroundedClaims('You have no paid work experience yet.', emptySlots())[0]).toMatch(/^exp:/)
    // 他自己这轮提过(CRS 在 Slots 里根本没有格子,只能靠 echo 兜底)
    expect(findUngroundedClaims(BAD3, emptySlots(), 'my CRS is 480, is that enough?')).toEqual([])
    expect(findUngroundedClaims(BAD2, emptySlots(), 'I have 18 months of experience')).toEqual([])
  })

  it('没有第二人称、或没提到属性 → 与它无关', () => {
    const empty = emptySlots()
    expect(findUngroundedClaims('The stream requires 24 months of paid work experience.', empty)).toEqual([])
    expect(findUngroundedClaims('You are looking at the Nova Scotia stream.', empty)).toEqual([])
    expect(findUngroundedClaims('曼省有 3 个岗位在招。', empty)).toEqual([])
  })

  it('不给 slots = 这道闸整个不生效(没有输入就不判,绝不把「不知道」当「他没说」)', () => {
    expect(findUngroundedClaims(BAD1)).toEqual([])
    expect(findUngroundedClaims(BAD1, null)).toEqual([])
    // 旧四参调用:闸A 一条都不报(闸B 与数字闸照旧管数字 —— 它们不需要槽)
    expect(sentenceBlockers(BAD1, [], 'en', '').filter((x) => /^(?:exp|crs|clb|age|edu|status):/.test(x))).toEqual([])
  })
})

describe('闸B 派生数单位闸(数字对了,单位是编的)', () => {
  const facts = [
    f({ value: 24, unit: 'months' }),
    f({ tool: 'lookupJobs', label: 'NS open postings for NOC 33102', value: 3, unit: 'jobs' }),
    f({ tool: 'lookupDraws', label: 'NS latest draw cutoff 2026-07-30', value: 475, unit: 'points' }),
  ]

  it('病灶 ②:echo 的「CLB 6」不给「6 months」背书', () => {
    expect(findUnitMismatch(BAD2, facts, 'CLB 6, PGWP 剩 18 个月')).toEqual(['6:mo'])
    expect(findUnitMismatch('Your language level is CLB 6.', facts, 'CLB 6'), '同一个 6 换回语言类就合法').toEqual([])
  })

  it('facts 里真有的数字带对单位一律放行(含月↔年整除互认、三语单位写法)', () => {
    expect(findUnitMismatch('The requirement is 24 months of paid work.', facts, '')).toEqual([])
    expect(findUnitMismatch('该门槛是 24 个月。', facts, '')).toEqual([])
    expect(findUnitMismatch('요건은 24개월입니다.', facts, '')).toEqual([])
    expect(findUnitMismatch('That is 2 years of experience.', facts, ''), '24 个月 = 2 年').toEqual([])
    expect(findUnitMismatch('NS 有 3 个岗位在招,最近一次抽选线是 475 分。', facts, '')).toEqual([])
  })

  it('裸数、年份、日期、NOC 码一律不判(窄口径:只对带单位词的数字生效)', () => {
    expect(findUnitMismatch('NOC 33102 属于 TEER 3。', facts, '')).toEqual([])
    expect(findUnitMismatch('最近一次抽选是 2026 年 7 月 30 日。', facts, '')).toEqual([])
    expect(findUnitMismatch('The latest draw was on 2026-07-30.', facts, '')).toEqual([])
    expect(findUnitMismatch('2026 年的名额还没公布。', facts, ''), '四位年份豁免').toEqual([])
    expect(findUnitMismatch('7 月的抽选还没出。', facts, ''), '中文「N 月」是日历月不是时长').toEqual([])
  })

  it('单位类不认识的(invitations / spots)两边都不产对,自然不判', () => {
    const inv = [f({ tool: 'lookupEe', label: 'EE invitations', value: 5432, unit: 'invitations' })]
    expect(findUnitMismatch('这一轮发出 5432 个邀请。', inv, '')).toEqual([])
  })

  it('编出来的单位数照拦', () => {
    expect(findUnitMismatch('处理大约需要 14 周。', facts, '')).toEqual(['14:wk'])
    expect(findUnitMismatch('时薪 $45 起。', facts, '')).toEqual(['45:money'])
  })
})

describe('逐句门与整段校验都接上了(真 orchestrate)', () => {
  class Pool {
    async query(sql: string) {
      if (sql.includes('similarity(j.title, $1)')) return { rows: [{ noc: '33102' }] }
      if (sql.includes('SELECT title FROM noc_descriptions WHERE noc = $1')) return { rows: [{ title: 'Nurse aides' }] }
      if (sql.includes("COALESCE(s.title_en, d.title, '') title")) return { rows: [{ title: 'Nurse aides', teer: 3 }] }
      if (sql.includes('SELECT last_seed FROM etl_heartbeat')) return { rows: [{ last_seed: '2026-08-09T05:49:00Z' }] }
      return { rows: [] }
    }
  }
  const SLOTS = JSON.stringify({
    occ_en: 'nurse aide', noc: null, provs: ['NS'], exp_months: null, status: null, claims: [],
  })

  it('两稿都说「你说过你没有经验」→ 两次硬拦 → 降级成事实清单,一个字都不见客', async () => {
    H.slots = SLOTS
    H.answer = BAD1
    const r = await orchestrate(new Pool(), { text: 'NS 的护理助理这条路走得通吗?', lang: 'en' })
    expect(r.degraded, '撞了硬拦两次 → 降级').toBe(true)
    expect(r.answer).not.toContain('your previous message')
  })

  it('逐句门:同一句在流里也发不出去(blocked 非空 = 停流)', () => {
    const facts = [f({})]
    expect(sentenceBlockers(BAD1, facts, 'en', '', emptySlots()).length).toBeGreaterThan(0)
    expect(sentenceBlockers(BAD2, facts, 'en', 'CLB 6', emptySlots()).length).toBeGreaterThan(0)
    // 门槛转述照旧放行(逐句门只加闸不减闸,正常答复一句都不该被它拦)
    expect(sentenceBlockers('This stream requires 24 months of paid work experience.', facts, 'en', '', emptySlots()))
      .toEqual([])
  })
})
