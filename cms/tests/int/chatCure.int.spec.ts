/**
 * 治病批 K05/K03/K08(docs/implementation/对话闭环-批AB/08)。
 *
 * 金标全部来自**基线批跑命中句与 chat_logs 实录**,不是想出来的句子:
 *   K05 「我持有有效的 PGWP 工签」(基线 R11:建档点选卡 sendText 被抽成 claim)/「手里的 PGWP 还有效」(#29);
 *   K03 基线 R08 答复凭空冒 NB;STATUS 实录「新不伦瑞克省 NL NLPNP International Graduate」;
 *   K08 「33102 (PSW) — does this have a shot in British Columbia?」被抄成 31102(chat_logs #94 / 基线 R18)。
 * 真组件:isSelfStatement/normalizeSlots、findAlienProvinces/sentenceBlockers、bareNocCandidates、
 * orchestrate 全链(重试→降级)。fixture 只有 DB 行与 LLM I/O(chatPreset1 纪律)。
 */
import { describe, expect, it, vi } from 'vitest'

const H = vi.hoisted(() => ({ slots: '{}', answer: '' }))
vi.mock('@/lib/llm', () => ({
  completeText: vi.fn(async ({ messages }: { messages: { content: string }[] }) =>
    (messages[0]?.content?.includes('You turn one message') ? H.slots : H.answer)),
}))

import { isSelfStatement } from '@/lib/chat/federal'
import { findAlienProvinces } from '@/lib/chat/guards'
import { orchestrate } from '@/lib/chat/orchestrate'
import { bareNocCandidates, normalizeSlots } from '@/lib/chat/slots'
import { sentenceBlockers } from '@/lib/chat/stream'
import type { Fact, Slots } from '@/lib/chat/types'

const f = (over: Partial<Fact>): Fact => ({
  tool: 'lookupJobs', label: 'NL 在招岗位', value: 3, valueText: '', unit: 'jobs',
  evidence: { url: 'https://x', fetched: '2026-08-09' }, ...over,
})

/** fixture 池:只喂 DB 行(职名相似度/NOC 标题/裸码验真),其余一律空行。 */
class Pool {
  constructor(private confirmedNocs: string[] = []) {}
  async query(sql: string, params?: unknown[]) {
    if (sql.includes('similarity(j.title, $1)')) return { rows: [{ noc: '63200' }] }
    if (sql.includes('SELECT title FROM noc_descriptions WHERE noc = $1')) return { rows: [{ title: 'Cooks' }] }
    if (sql.includes("COALESCE(s.title_en, d.title, '') title")) return { rows: [{ title: 'Cooks', teer: 3 }] }
    if (sql.includes('SELECT last_seed FROM etl_heartbeat')) return { rows: [{ last_seed: '2026-08-09T05:49:00Z' }] }
    if (sql.includes('noc = ANY')) {
      const asked = (params?.[0] as string[]) ?? []
      return { rows: this.confirmedNocs.filter((n) => asked.includes(n)).map((noc) => ({ noc })) }
    }
    return { rows: [] }
  }
}

describe('K05 自述身份不进 claims', () => {
  it('金标两句判自述(基线 R11 / chat_logs #29)', () => {
    expect(isSelfStatement('我持有有效的 PGWP 工签')).toBe(true)
    expect(isSelfStatement('手里的 PGWP 还有效')).toBe(true)
  })

  it('真主张一条不误伤:转述豁免/无证件词照旧;家庭滤原语义保持', () => {
    expect(isSelfStatement('中介说我的工签没问题'), '转述标记豁免').toBe(false)
    expect(isSelfStatement('曼省有合作公司'), '无证件词与它无关').toBe(false)
    expect(isSelfStatement('朋友说萨省两个月就下来了')).toBe(false)
    expect(isSelfStatement('老婆和两个孩子一起过来'), '家庭自述原判据不动').toBe(true)
  })

  it('normalizeSlots:金标句混进 claims 也被机械滤掉,真主张活着', () => {
    const r = normalizeSlots({ occ_en: 'carpenter', claims: [
      { text: '我持有有效的 PGWP 工签', topic: 'other' },
      { text: '手里的 PGWP 还有效', topic: 'other' },
      { text: '中介说能包曼省 offer', topic: 'private-promise' },
    ] })
    expect(r.claims.map((c) => c.text)).toEqual(['中介说能包曼省 offer'])
  })
})

describe('K03 省名串台闸(findAlienProvinces)', () => {
  const facts = [f({}), f({ tool: 'lookupCoverage', label: 'NL 清单命中', unit: 'list' })]

  it('金标两形拦下并点名是哪个省', () => {
    // STATUS 实录形:NB 的名字焊在 NL 的项目上(NLPNP 里的 NL 不算词界命中,报的是新不伦瑞克)
    expect(findAlienProvinces('新不伦瑞克省 NL NLPNP International Graduate 也可以考虑。', facts, '我是木匠', { provs: [] })[0]).toMatch(/^NB:/)
    // 基线 R08 形:答复凭空冒出 facts 里没有的省(英文全名)
    expect(findAlienProvinces('New Brunswick also lists this occupation.', facts, 'carpenter with no experience', { provs: [] })[0]).toMatch(/^NB:/)
  })

  it('有底的省全放行:facts 码/中文全名值面/用户自己点名/slots.provs', () => {
    expect(findAlienProvinces('纽芬兰的门槛最低。', facts, '', { provs: [] })).toEqual([])
    expect(findAlienProvinces('曼省有 3 个岗位在招。', facts, '曼省和萨省哪个好走?', { provs: [] })).toEqual([])
    expect(findAlienProvinces('SK is also an option.', facts, '', { provs: ['SK'] })).toEqual([])
    const namedFact = [f({ label: '对比', valueText: '不列颠哥伦比亚、新斯科舍' })]
    expect(findAlienProvinces('BC 与 NS 都有记录。', namedFact, '', { provs: [] })).toEqual([])
  })

  it('英文小写 on/普通句不误伤(省码判据区分大小写)', () => {
    expect(findAlienProvinces('You can rely on the NL stream.', facts, '', { provs: [] })).toEqual([])
    expect(findAlienProvinces('这条路走得通。', facts, '', { provs: [] })).toEqual([])
  })

  it('逐句门接上了:同一句在流里也发不出去', () => {
    const hit = sentenceBlockers('新不伦瑞克省 NL NLPNP International Graduate。', facts, 'zh', '', { provs: [] } as Partial<Slots>)
    expect(hit.some((x) => x.startsWith('NB:')), JSON.stringify(hit)).toBe(true)
  })

  it('整段两犯 → 降级成事实清单,串台省名一个字不见客(真 orchestrate)', async () => {
    H.slots = JSON.stringify({ occ_en: 'cook', noc: null, provs: ['NL'], exp_months: null, status: null, claims: [] })
    H.answer = '新不伦瑞克省的项目也值得考虑。'
    const r = await orchestrate(new Pool(), { text: '我是厨师,NL 这条路走得通吗?', lang: 'zh' })
    expect(r.degraded, '撞了 provDrift 两次 → 降级').toBe(true)
    expect(r.answer).not.toContain('新不伦瑞克')
  })
})

describe('K08 裸码库验(bareNocCandidates + orchestrate 接线)', () => {
  it('金标句出候选;金额/年薪/长数字语境不出', () => {
    expect(bareNocCandidates('33102 (PSW) — does this have a shot in British Columbia?')).toEqual(['33102'])
    expect(bareNocCandidates('salary is $31264 a year'), '金额前缀').toEqual([])
    expect(bareNocCandidates('31264 a year sounds low'), '年薪后缀').toEqual([])
    expect(bareNocCandidates('年薪 45000 元'), '中文金额后缀').toEqual([])
    expect(bareNocCandidates('makes 45,000 dollars'), '千分位断开无五连').toEqual([])
    expect(bareNocCandidates('order #123456'), '六位串不是码').toEqual([])
  })

  it('#94 病灶全链:模型抄成 31102,裸码库验后压回 33102', async () => {
    H.slots = JSON.stringify({ occ_en: 'PSW', noc: '31102', provs: ['BC'], exp_months: null, status: null, claims: [] })
    H.answer = 'This occupation has openings in British Columbia.'
    const r = await orchestrate(new Pool(['33102']), { text: '33102 (PSW) — does this have a shot in British Columbia?', lang: 'en' })
    expect(r.slots.noc, '原话里的码压过模型抄错的那个').toBe('33102')
  })

  it('库不认的五位数(工资样)不覆盖:相似度路径照旧', async () => {
    H.slots = JSON.stringify({ occ_en: 'cook', noc: null, provs: ['BC'], exp_months: null, status: null, claims: [] })
    H.answer = 'BC has records for this occupation.'
    const r = await orchestrate(new Pool([]), { text: 'I make 51234 in BC as a cook, can I stay?', lang: 'en' })
    expect(r.slots.noc, '51234 不在 noc_descriptions → 走 resolveNoc 相似度').toBe('63200')
  })

  it('显式 NOC 打头路径零改动(literalNoc 先手,不进裸码分支)', async () => {
    H.slots = JSON.stringify({ occ_en: 'cook', noc: null, provs: [], exp_months: null, status: null, claims: [] })
    H.answer = 'There are records for this occupation.'
    const r = await orchestrate(new Pool([]), { text: 'NOC 63200 走哪条路?', lang: 'zh' })
    expect(r.slots.noc).toBe('63200')
  })
})
