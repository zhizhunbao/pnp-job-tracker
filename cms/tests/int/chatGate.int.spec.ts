/**
 * 编排闸门与槽回填(批A · D1/D2/D3;设计 docs/design/对话闭环总设计-20260809.md §2)。
 *
 * 三道断点各有生产实录,金标输入**一律抄自 chat_logs 原文**,不是想出来的句子:
 *   D1 `err='noOcc'` #51/#53/#55「LMIA 获批雇主的表对我找工作移民有什么用?」、
 *      #54「AIP 指定雇主是什么?对我有用吗?」—— 自家 /start 的「问一句」CTA 预填句撞自家闸;
 *   D2 `err='tooShort'` #52「没工作」(紧跟在 #51 后面的那一轮:上一句是我们问的);
 *   D3 抽到的槽从不回写 users.profile。
 *
 * 真组件:orchestrate 全链(抽槽归一 / resolveNoc / 用法分支 / 出口检查)、profileFill、
 *        以及 **api/chat 路由本体**(D3 的登录判定与尾行都长在它身上)。
 * fixture 边界:数据库返回行、LLM I/O、payload 实例与鉴权 —— 判定逻辑一行都没复刻。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Lang } from '@/lib/i18n'

// ── fixture 边界 ────────────────────────────────────────────────────────────
const H = vi.hoisted(() => ({
  /** 抽槽 fixture:按 NOW 的原话给槽。默认空槽(= 模型也没听出职业),各用例自行改写。 */
  slots: (_now: string, _earlier: string): Record<string, unknown> => ({
    occ_en: '', noc: null, provs: [], exp_months: null, status: null, claims: [],
  }),
  user: null as null | Record<string, unknown>,
  patch: vi.fn(async () => {}),
}))

vi.mock('@/lib/llm', () => ({
  completeText: vi.fn(async ({ messages }: { messages: { content: string }[] }) => {
    const system = messages[0]?.content ?? ''
    const user = messages.at(-1)?.content ?? ''
    if (system.includes('You turn one message from a would-be immigrant into slots')) {
      const now = user.slice(user.lastIndexOf('NOW: ') + 5)
      return JSON.stringify(H.slots(now, user.includes('EARLIER:') ? user : ''))
    }
    return '按这条职业继续核对官方门槛。'   // 合成 fixture:不带任何数字,出口检查照常跑
  }),
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', () => ({
  getPayload: async () => ({ db: { pool: new FakePool() }, create: async () => ({}) }),
}))
vi.mock('@/lib/quota/entitlement', () => ({
  getUser: async () => H.user,
  isPro: () => false,
}))
vi.mock('@/lib/profile', () => ({ patchProfile: H.patch }))

import { chatProfileContext, mergeRememberedSlots } from '@/lib/chat/answer'
import { slotAskOptions } from '@/lib/chat/cards'
import { buildFollowups, profileFill } from '@/lib/chat/followups'
import { ChatError, orchestrate } from '@/lib/chat/orchestrate'
import { type MetaTopic, isUsageQuestion, metaTopicOf, normalizeSlots } from '@/lib/chat/slots'
import { isFollowupTurn } from '@/lib/chat/steps'
import type { ChatTurn, Slots } from '@/lib/chat/types'
import { findForeignScript, findLeaks, findWordNumbers } from '@/lib/chat/guards'
import { findShoutedWords } from '@/lib/chat/traces'
import { completeText } from '@/lib/llm'
import { POST } from '@/app/api/chat/route'

/** 只回「官方行」,一条判定逻辑都不复刻(同 chatContext.int.spec.ts 的手法)。 */
class FakePool {
  calls: string[] = []
  async query(sql: string, params: unknown[] = []) {
    this.calls.push(sql)
    if (sql.includes('similarity(j.title, $1)')) return { rows: String(params[0]).includes('carpenter') ? [{ noc: '72310' }] : [] }
    if (sql.includes('SELECT noc FROM noc_descriptions WHERE similarity')) return { rows: [] }
    if (sql.includes('SELECT title FROM noc_descriptions WHERE noc = $1')) return { rows: [{ title: 'Carpenters' }] }
    if (sql.includes("COALESCE(s.title_en, d.title, '') title")) return { rows: [{ title: 'Carpenters', teer: 2 }] }
    if (sql.includes('SELECT last_seed FROM etl_heartbeat')) return { rows: [{ last_seed: '2026-08-09T05:49:00Z' }] }
    return { rows: [] }
  }
}

const emptySlots = (over: Partial<Slots> = {}): Slots =>
  ({ noc: null, occText: '', provs: [], expMonths: null, status: null, claims: [], ...over })

beforeEach(() => {
  vi.mocked(completeText).mockClear()
  H.patch.mockClear()
  H.user = null
  H.slots = () => ({ occ_en: '', noc: null, provs: [], exp_months: null, status: null, claims: [] })
})

// ── D1:CTA 用法类问句不再撞 noOcc ──────────────────────────────────────────
describe('D1 用法类问句(chat_logs 实录原文)', () => {
  // /start 三张表的「问一句」CTA 预填句(i18n `se.ask.lmia|named|aip` 三语)。
  // 前两句带 ✅ 的正是生产实录里抛 noOcc 的那两条原文。
  const CTA: [Lang, string][] = [
    ['zh', 'LMIA 获批雇主的表对我找工作移民有什么用?'],          // ✅ chat_logs #51/#53/#55
    ['zh', 'AIP 指定雇主是什么?对我有用吗?'],                    // ✅ chat_logs #54
    ['zh', '在招岗命中紧缺清单的雇主,对我意味着什么?'],
    ['en', 'How does the LMIA-approved employer table help my immigration job search?'],
    ['en', 'What does an employer with jobs on a shortage list mean for me?'],
    ['en', 'What is an AIP designated employer? Is it useful to me?'],
    ['ko', 'LMIA 승인 고용주 표가 제 이민 구직에 어떤 도움이 되나요?'],
    ['ko', '구인 직종이 수요 목록에 오른 고용주는 저에게 어떤 의미인가요?'],
    ['ko', 'AIP 지정 고용주란 무엇인가요? 저에게 도움이 되나요?'],
  ]

  it('九句 CTA 预填句全部认得出(判据两半都要中)', () => {
    for (const [, text] of CTA) expect(isUsageQuestion(text), text).toBe(true)
  })

  it('只中一半的照旧不算:问候语、问钱、问怎么找雇主', () => {
    for (const text of [
      'hello there, anyone here?', '你好啊', '안녕하세요',
      '雇主担保移民要多少钱?',            // 主语中了,意图没中
      '怎么找到愿意担保我的雇主?',        // 同上:「怎么」不等于「怎么用」
      '我想移民,有什么办法?',            // 意图中了,主语没中
      'I want to immigrate, what should I do?',
      '',
    ]) expect(isUsageQuestion(text), text).toBe(false)
  })

  it('真实 orchestrate:CTA 预填句回 guide 型答复,不抛 noOcc、不查工具、不进合成', async () => {
    for (const [lang, text] of CTA) {
      const pool = new FakePool()
      vi.mocked(completeText).mockClear()
      const r = await orchestrate(pool, { text, lang })
      expect(r.answer.length, `${lang} ${text}`).toBeGreaterThan(30)
      expect(r.slots.noc, '这一轮确实没认出职业,不许假装认出来').toBeNull()
      expect(r.facts, '一个工具都没查就不该有出处').toEqual([])
      // 只调了抽槽那一次:没有第二次(合成)= 这段话是我们自己写死的,不过模型
      expect(vi.mocked(completeText).mock.calls).toHaveLength(1)
      // 见客文案照旧过静态四查(和 askOccupation 那组断言同一套标尺)
      expect(findLeaks(r.answer), `${text} 泄露内部码`).toEqual([])
      expect(findWordNumbers(r.answer, lang), `${text} 中文数字`).toEqual([])
      expect(findShoutedWords(r.answer), `${text} 裸大写`).toEqual([])
      if (lang === 'en') expect(findForeignScript(r.answer, 'en'), `${text} 掺了非英文`).toEqual([])
    }
  })

  it('答复里既说清这张表是什么,也把话头递回职业', async () => {
    const zh = await orchestrate(new FakePool(), { text: CTA[0][1], lang: 'zh' })
    expect(zh.answer).toContain('LMIA')
    expect(zh.answer).toContain('NOC')          // 递回职业那一句
    const aip = await orchestrate(new FakePool(), { text: CTA[1][1], lang: 'zh' })
    expect(aip.answer).toContain('AIP')
    expect(aip.answer).not.toContain('LMIA')    // 认的是哪张表就答哪张表
  })

  it('问候语照旧 noOcc(这条改动不许把死路变成瞎猜)', async () => {
    await expect(orchestrate(new FakePool(), { text: '你好啊,在吗', lang: 'zh' }))
      .rejects.toMatchObject({ code: 'noOcc' })
  })

  it('说得出职业的用法问句走正常查询,连用法分支都不判', async () => {
    H.slots = () => ({ occ_en: 'carpenter', noc: null, provs: [], exp_months: null, status: null, claims: [] })
    const r = await orchestrate(new FakePool(), { text: '我是木匠,LMIA 获批雇主的表有什么用?', lang: 'zh' })
    expect(r.slots.noc).toBe('72310')
    expect(vi.mocked(completeText).mock.calls.length, '走到合成 = 没被用法分支截胡').toBeGreaterThan(1)
  })
})

// ── meta:问对话本身的话也不撞 noOcc ────────────────────────────────────────
describe('meta 问句(chat_logs #160「为什么没有选项给我」)', () => {
  const META: [Lang, string, MetaTopic][] = [
    ['zh', '为什么没有选项给我', 'options'],                     // ✅ chat_logs #160 原文
    ['zh', '选项呢', 'options'],
    ['zh', '你能做什么', 'capability'],
    ['zh', '这个网站可以帮我什么', 'capability'],
    ['zh', '这个怎么用', 'howto'],
    ['zh', '我该问什么', 'howto'],
    ['en', 'why are there no options for me', 'options'],
    ['en', 'what can you do', 'capability'],
    ['en', 'how do i use this', 'howto'],
    ['ko', '선택지가 왜 없나요', 'options'],
    ['ko', '무엇을 할 수 있나요', 'capability'],
    ['ko', '어떻게 사용하나요', 'howto'],
  ]

  it('三格都认得出,且认到哪一格就是哪一格', () => {
    for (const [, text, topic] of META) expect(metaTopicOf(text), text).toBe(topic)
  })

  it('不该算 meta 的一条都不许中:问候、问钱、真业务问句', () => {
    for (const text of [
      '你好啊', 'hello there', '안녕하세요',
      '雇主担保移民要多少钱?',
      '我是木匠,想知道哪些省有戏',
      '现在哪个省这个职业的在招岗位最多?',
      'which province has the most cook jobs',
      '',
    ]) expect(metaTopicOf(text), text).toBeNull()
  })

  it('真实 orchestrate:回 guide 型答复,不抛 noOcc、不查工具、不进合成', async () => {
    for (const [lang, text] of META) {
      const pool = new FakePool()
      vi.mocked(completeText).mockClear()
      const r = await orchestrate(pool, { text, lang })
      expect(r.answer.length, `${lang} ${text}`).toBeGreaterThan(30)
      expect(r.slots.noc, '这一轮确实没认出职业,不许假装认出来').toBeNull()
      expect(r.facts, '一个工具都没查就不该有出处').toEqual([])
      expect(vi.mocked(completeText).mock.calls, '只调了抽槽那一次 = 这段话是写死的').toHaveLength(1)
      expect(findLeaks(r.answer), `${text} 泄露内部码`).toEqual([])
      expect(findWordNumbers(r.answer, lang), `${text} 中文数字`).toEqual([])
      expect(findShoutedWords(r.answer), `${text} 裸大写`).toEqual([])
      if (lang === 'en') expect(findForeignScript(r.answer, 'en'), `${text} 掺了非英文`).toEqual([])
    }
  })

  it('三格各答各的,都把话头递回职业(一个数字都不出现)', async () => {
    for (const topic of ['options', 'capability', 'howto'] as MetaTopic[]) {
      const text = META.find((m) => m[2] === topic && m[0] === 'zh')![1]
      const r = await orchestrate(new FakePool(), { text, lang: 'zh' })
      expect(r.answer, topic).toContain('NOC')
      expect(r.answer, `${topic} 没查工具却报了数`).not.toMatch(/\d/)
    }
  })

  it('主语是我们那几张表的归 usage,不落到 meta', async () => {
    expect(isUsageQuestion('LMIA 获批雇主的表怎么用?')).toBe(true)
    const r = await orchestrate(new FakePool(), { text: 'LMIA 获批雇主的表怎么用?', lang: 'zh' })
    expect(r.answer, 'usage 那份文案').toContain('劳动力市场影响评估')
  })

  it('说得出职业的 meta 问句走正常查询,连 meta 分支都不判', async () => {
    H.slots = () => ({ occ_en: 'carpenter', noc: null, provs: [], exp_months: null, status: null, claims: [] })
    const r = await orchestrate(new FakePool(), { text: '我是木匠,这个怎么用?', lang: 'zh' })
    expect(r.slots.noc).toBe('72310')
    expect(vi.mocked(completeText).mock.calls.length, '走到合成 = 没被 meta 截胡').toBeGreaterThan(1)
  })
})

// ── D2:追问轮短答放行 ──────────────────────────────────────────────────────
describe('D2 追问轮短答(chat_logs #52「没工作」)', () => {
  const guide: ChatTurn[] = [
    { role: 'user', content: 'LMIA 获批雇主的表对我找工作移民有什么用?' },
    { role: 'assistant', content: '告诉我你的职业或 NOC 码,我按这个职业查哪些雇主在招。' },
  ]

  it('首轮闸:英文短句/空串照旧 tooShort;CJK ≥2 字放行进抽槽(08-09 Frank 实撞「护士」被回「你做什么工作」)', async () => {
    for (const text of ['a', 'hi', '   ', '']) {
      await expect(orchestrate(new FakePool(), { text, lang: 'zh' }), text)
        .rejects.toMatchObject({ code: 'tooShort' })
    }
    // 🔵 改判(2026-08-09):四字门原按英文字符数定,中文双字就是完整职业(护士/厨师/木匠)。
    //    短 CJK 首轮改走抽槽 —— fixture 里查不出职业,落 noOcc 反问「说说你做什么工作」,
    //    这比 tooShort 对题(「没工作」冷启动时问他职业正是该问的)。「你好」多烧一次抽槽,
    //    由 IP 日限兜底;深修(短文本先查职业候选,零 LLM)记对话病系统批。
    for (const text of ['护士', '没工作', '你好']) {
      await expect(orchestrate(new FakePool(), { text, lang: 'zh' }), text)
        .rejects.toMatchObject({ code: 'noOcc' })
    }
    // 历史里只有用户自己的话 ≠ 我们问过一句(isFollowupTurn 语义不随 CJK 改判变)
    expect(isFollowupTurn([])).toBe(false)
    expect(isFollowupTurn([guide[0]])).toBe(false)
    expect(isFollowupTurn(guide)).toBe(true)
    expect(isFollowupTurn([{ role: 'assistant', content: '  ' }])).toBe(false)
  })

  it('我们刚问完一句 → 短答放行,而且照样抽得出槽', async () => {
    // 追问轮:NOW 只有「没工作」,职业由 SLOT_SYSTEM 的 EARLIER 接力规则从历史里接回来
    H.slots = (now, earlier) => (earlier && now.startsWith('没工作')
      ? { occ_en: 'carpenter', noc: null, provs: [], exp_months: 0, status: 'graduated', claims: [] }
      : { occ_en: '', noc: null, provs: [], exp_months: null, status: null, claims: [] })
    const r = await orchestrate(new FakePool(), { text: '没工作', lang: 'zh', history: guide })
    expect(r.slots.expMonths, '短答的内容要真进抽槽').toBe(0)
    expect(r.slots.noc).toBe('72310')
    expect(r.answer.length).toBeGreaterThan(0)
  })

  it('空串在追问轮也拦:那不是短答,是没答', async () => {
    await expect(orchestrate(new FakePool(), { text: '  ', lang: 'zh', history: guide }))
      .rejects.toMatchObject({ code: 'tooShort' })
  })
})

// ── D3:槽 → 档案,只补空 ───────────────────────────────────────────────────
describe('D3 profileFill(只补空 + 尾行)', () => {
  const full = emptySlots({ noc: '33102', clb: 6, provs: ['BC'], status: 'student' })

  it('空档案:高置信槽全补上,尾行逐项点名', () => {
    const r = profileFill(full, {}, 'zh')!
    expect(r.patch).toEqual({ nocCodes: ['33102'], clb: 6, targetProvinces: ['BC'], currentStatus: 'studying' })
    expect(r.tail).toBe('已存入档案:职业 NOC 33102、CLB 6、目标省 BC、身份 在读(账户页可改)')
    expect(r.tail.split('\n')).toHaveLength(1)         // 一行
    expect(r.tail).not.toContain('·')                  // 全站禁「·」
  })

  it('已有值一个都不覆盖(手填优先)', () => {
    const cur = { nocCodes: ['12345'], clb: 8, targetProvinces: ['ON'], currentStatus: 'pr' }
    expect(profileFill(full, cur, 'zh')).toBeNull()
    // 只空一格 → 只补那一格
    const r = profileFill(full, { ...cur, clb: null }, 'zh')!
    expect(r.patch).toEqual({ clb: 6 })
    expect(r.tail).toBe('已存入档案:CLB 6(账户页可改)')
  })

  it('空数组/空串算空,0 与 false 不算空', () => {
    const r = profileFill(full, { nocCodes: [], targetProvinces: [], currentStatus: '' }, 'zh')!
    expect(r.patch).toMatchObject({ nocCodes: ['33102'], targetProvinces: ['BC'], currentStatus: 'studying' })
    expect(profileFill(emptySlots({ clb: 6 }), { clb: 0 }, 'zh'), 'CLB 0 是他填过的值').toBeNull()
  })

  it('低置信的一律不写:主张里的省、认不准的身份、没有对应槽的字段', () => {
    // 「中介说曼省有合作公司」→ provs 里的 MB 是别人提的地方,不是他的目标省
    const withClaim = emptySlots({ provs: ['MB'], claims: [{ text: '中介说曼省有合作公司', topic: 'private-promise', province: 'MB' }] })
    expect(profileFill(withClaim, {}, 'zh')).toBeNull()
    for (const status of ['graduated', 'visitor', 'working']) {
      const r = profileFill(emptySlots({ status }), {}, 'zh')
      if (status === 'working') expect(r!.patch).toEqual({ currentStatus: 'working' })
      else expect(r, `${status} 落哪个分型都是猜`).toBeNull()
    }
    // 对话里根本没有 crs / pgwpMonthsLeft 这两个槽
    expect(Object.keys(profileFill(full, {}, 'zh')!.patch)).not.toContain('crs')
    expect(Object.keys(profileFill(full, {}, 'zh')!.patch)).not.toContain('pgwpMonthsLeft')
  })

  it('没有可补的就返回 null(尾行只在真写了的时候出现)', () => {
    expect(profileFill(emptySlots(), {}, 'zh')).toBeNull()
    expect(profileFill(emptySlots(), null, 'en')).toBeNull()
  })

  it('尾行三语都成句,不夹杂另一种文字', () => {
    const zh = profileFill(full, {}, 'zh')!.tail
    const en = profileFill(full, {}, 'en')!.tail
    const ko = profileFill(full, {}, 'ko')!.tail
    expect(en).toBe('Saved to your profile: occupation NOC 33102, CLB 6, target province BC, status studying (editable in your account).')
    expect(ko).toContain('프로필에 저장했습니다')
    expect(findForeignScript(en, 'en'), '英文尾行掺了非英文').toEqual([])
    expect(findWordNumbers(zh, 'zh')).toEqual([])
    expect(findLeaks(zh)).toEqual([])
    expect(findLeaks(ko)).toEqual([])
  })
})

describe('Memory:登录档案跨会话回读', () => {
  it('只映射 Slots 真有对应项的高置信字段，未知分型/CRS/PGWP 不硬塞', () => {
    expect(chatProfileContext({
      currentStatus: 'studying', nocCodes: ['33102', 'bad'], clb: 6, crs: 451,
      targetProvinces: ['bc', 'NS', 'bad'], pgwpMonthsLeft: 18,
    })).toMatchObject({ noc: '33102', provs: ['BC', 'NS'], status: 'student', clb: 6 })
    expect(chatProfileContext({ currentStatus: 'jobhunting', crs: 451, pgwpMonthsLeft: 18 }))
      .toMatchObject({ noc: null, provs: [], status: null, clb: null })
  })

  it('优先级固定为本轮 > 会话上一轮 > 登录档案', () => {
    const profile = chatProfileContext({ currentStatus: 'studying', nocCodes: ['33102'], clb: 6, targetProvinces: ['BC'] })
    const session = emptySlots({ noc: '72200', provs: ['ON'], clb: 7, status: 'working' })
    const current = normalizeSlots({ noc: '72310', provs: ['NS'], clb: 8, status: 'abroad', claims: [] })
    expect(mergeRememberedSlots(current, session, profile, '我现在改做木匠,目标新省')).toMatchObject({
      noc: '72310', provs: ['NS'], clb: 8, status: 'abroad',
    })

    const empty = normalizeSlots({ claims: [] })
    expect(mergeRememberedSlots(empty, session, profile, '按我的情况看看')).toMatchObject({
      noc: '72200', provs: ['ON'], clb: 7, status: 'working',
    })
    expect(mergeRememberedSlots(empty, null, profile, '按我的情况看看')).toMatchObject({
      noc: '33102', provs: ['BC'], clb: 6, status: 'student',
    })
  })

  it('首轮没重说职业时，登录档案的 NOC 直接进入工具链，不再误报 noOcc', async () => {
    H.slots = () => ({ occ_en: '', noc: null, provs: [], exp_months: null, status: null, claims: [] })
    const r = await orchestrate(new FakePool(), {
      text: '按我的情况看看哪些省有戏', lang: 'zh',
      profileContext: chatProfileContext({ nocCodes: ['33102'], targetProvinces: ['BC'], clb: 6 }),
    })
    expect(r.slots.noc).toBe('33102')
    expect(r.slots.provs).toEqual(['BC'])
    expect(r.slots.clb).toBe(6)
  })
})

// ── D3':路由本体 —— 登录才写、写了才说 ─────────────────────────────────────
describe('D3 api/chat 路由:匿名不写、登录只补空、尾行接在定稿答复上', () => {
  const ask = (text = '我是木匠,在 BC,CLB 6,还在读书,能走哪条路?') =>
    POST(new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.9' },
      body: JSON.stringify({ text, lang: 'zh' }),
    }))
  /** SSE / JSON 两种传输都取那条**定稿** {answer,…}(前端也是以它为准)。 */
  const finalAnswer = async (res: Response): Promise<string> => {
    if ((res.headers.get('content-type') || '').includes('json')) return (await res.json()).answer
    const body = await res.text()
    for (const line of body.split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
      const e = JSON.parse(line.slice(6))
      if (typeof e.answer === 'string') return e.answer
    }
    return ''
  }
  beforeEach(() => {
    H.slots = () => ({ occ_en: 'carpenter', noc: null, provs: ['BC'], exp_months: null, status: 'student', clb: 6, claims: [] })
  })

  it('匿名:一个字都不存,答复里没有尾行', async () => {
    H.user = null
    const answer = await finalAnswer(await ask())
    expect(H.patch).not.toHaveBeenCalled()
    expect(answer).not.toContain('已存入档案')
  })

  it('登录 + 空档案:写进 profile 并更 profileUpdatedAt,尾行接在定稿答复末尾', async () => {
    H.user = { id: 'u-empty', email: 'a@test.local', profile: {} }
    const answer = await finalAnswer(await ask())
    expect(H.patch).toHaveBeenCalledTimes(1)
    const [uid, patch] = H.patch.mock.calls[0] as unknown as [string, Record<string, unknown>]
    expect(uid).toBe('u-empty')
    expect(patch).toMatchObject({ nocCodes: ['72310'], clb: 6, targetProvinces: ['BC'], currentStatus: 'studying' })
    expect(typeof patch.profileUpdatedAt).toBe('string')
    expect(answer).toContain('已存入档案')
    expect(answer.trim().endsWith('(账户页可改)')).toBe(true)
  })

  it('登录 + 已有档案:一次库都不写,答复里也没有尾行', async () => {
    H.user = {
      id: 'u-filled', email: 'b@test.local',
      profile: { nocCodes: ['33102'], clb: 8, targetProvinces: ['ON'], currentStatus: 'jobhunting' },
    }
    const answer = await finalAnswer(await ask())
    expect(H.patch).not.toHaveBeenCalled()
    expect(answer).not.toContain('已存入档案')
  })
})

// ── 接着问织槽(2026-08-09 Frank:「接着问怎么也是固定的」)────────────────────
describe('buildFollowups 织入用户自己的职业叫法(确定性个性化,不是 LLM 现编)', () => {
  const factsWith = (tool: string): Parameters<typeof buildFollowups>[0] =>
    [{ tool, label: 'x', value: 7, valueText: '', unit: 'jobs', evidence: { url: '/x', fetched: '' }, cited: false }] as never

  it('有职业词 → 模板里出现他的叫法;无职业词 → 通用句原样', () => {
    const withOcc = buildFollowups(factsWith('lookupJobs'), 'zh', '', '护士')
    expect(withOcc[0]).toBe('现在哪个省护士的在招岗位最多?')
    const noOcc2 = buildFollowups(factsWith('lookupJobs'), 'zh', '')
    expect(noOcc2[0]).toBe('现在哪个省这个职业的在招岗位最多?')
    expect(buildFollowups(factsWith('lookupJobs'), 'en', '', 'PSW')[0])
      .toBe('Which province has the most open postings for PSW?')
  })

  it('职业词超长(>20)或空白 → 回落通用句,不把一句话撑破', () => {
    const long = 'Registered nurses and registered psychiatric nurses'
    expect(buildFollowups(factsWith('lookupJobs'), 'en', '', long)[0])
      .toBe('Which province has the most open postings for this occupation?')
    expect(buildFollowups(factsWith('lookupJobs'), 'zh', '', '  ')[0])
      .toBe('现在哪个省这个职业的在招岗位最多?')
  })

  it('刚问过的那句照旧不重复推(织槽不破坏 asked 去重)', () => {
    const q = buildFollowups(factsWith('lookupJobs'), 'zh', '', '护士')[0]
    expect(buildFollowups(factsWith('lookupJobs'), 'zh', q, '护士')).toHaveLength(0)
  })
})

// ── 建档点选卡(2026-08-09 Frank:「做,能让用户手点就别用手输入」)────────────
describe('slotAskOptions 建档点选卡:一轮一张,档案已有的槽不问', () => {
  const jobsFact = (prov: string, n: number): never => ({
    tool: 'lookupJobs', label: `${prov} open postings right now (NOC 33102)`, value: n,
    valueText: '', unit: 'jobs', evidence: { url: '/x', fetched: '' }, cited: false,
  }) as never

  it('status 缺 → 身份卡;三个 sendText 都落在 profileFill 认的三档(student/working/abroad)', () => {
    const card = slotAskOptions(emptySlots(), [], 'zh')
    expect(card?.slotKey).toBe('status')
    expect(card?.items).toHaveLength(3)
    expect(card?.items.map((i) => i.sendText)).toEqual(['我还在读书(持学签)', '我持工签在加拿大', '我人还在境外'])
  })

  it('status 已知 → 省卡:只摆这轮真查到在招数据的省,按岗位数降序,QC 永不进卡', () => {
    const facts = [jobsFact('QC', 99), jobsFact('BC', 20), jobsFact('ON', 65), jobsFact('NS', 7)]
    const card = slotAskOptions(emptySlots({ status: 'working' }), facts, 'zh')
    expect(card?.slotKey).toBe('prov')
    expect(card?.items.map((i) => i.label)).toEqual(['安大略(在招 65 岗)', '不列颠哥伦比亚(在招 20 岗)', '新斯科舍(在招 7 岗)'])
    expect(card?.items[0].sendText).toBe('我的目标省是安大略')
  })

  it('省数据不足两个 → 跳过省卡落 CLB 卡;前三张收齐 → 卡链接着问学历(08-09 卡链延长)', () => {
    const one = slotAskOptions(emptySlots({ status: 'working' }), [jobsFact('BC', 5)], 'en')
    expect(one?.slotKey).toBe('clb')
    expect(one?.items.map((i) => i.label)).toEqual(['CLB 5', 'CLB 6', 'CLB 7'])
    const next = slotAskOptions(emptySlots({ status: 'working', provs: ['BC'], clb: 6 }), [], 'zh')
    expect(next?.slotKey).toBe('edu')
  })

  it('卡链全序:edu→expMonths→married→canadaStudy,能点的槽全收齐才不出卡', () => {
    const base: Partial<Slots> = { status: 'working', provs: ['BC'], clb: 6 }
    expect(slotAskOptions(emptySlots({ ...base, edu: 'bachelor' }), [], 'zh')?.slotKey).toBe('expMonths')
    expect(slotAskOptions(emptySlots({ ...base, edu: 'bachelor', expMonths: 12 }), [], 'zh')?.slotKey).toBe('married')
    expect(slotAskOptions(emptySlots({ ...base, edu: 'bachelor', expMonths: 12, married: false }), [], 'zh')?.slotKey).toBe('canadaStudy')
    // 0/false 都算有值(判定不是缺失),与 filledProfileSlots 同口径
    const full = slotAskOptions(emptySlots({ ...base, edu: 'bachelor', expMonths: 0, married: false, canadaStudy: false }), [], 'zh')
    expect(full).toBeUndefined()
  })

  it('档案已有的槽不追问(手填优先):known 逐槽跳,全 known 不出卡', () => {
    const card = slotAskOptions(emptySlots(), [], 'zh', { status: true, provs: true })
    expect(card?.slotKey).toBe('clb')
    const afterClb = slotAskOptions(emptySlots(), [], 'zh', { status: true, provs: true, clb: true })
    expect(afterClb?.slotKey).toBe('edu')
    const full = slotAskOptions(emptySlots(), [], 'zh', { status: true, provs: true, clb: true, edu: true, expMonths: true, married: true, canadaStudy: true })
    expect(full).toBeUndefined()
  })

  it('真实 orchestrate 普通轮:木匠答完垫身份卡(裁决没触发也有点选)', async () => {
    H.slots = () => ({ occ_en: 'carpenter', noc: null, provs: [], exp_months: null, status: null, claims: [] })
    const r = await orchestrate(new FakePool(), { text: '我是木匠,想知道哪些省有戏', lang: 'zh' })
    expect(r.options?.slotKey).toBe('status')
    // 前三槽全知 → 卡链接着收学历(08-09「每次都要显示四选一的问题」);全链 known 才不出卡
    const r2 = await orchestrate(new FakePool(), {
      text: '我是木匠,想知道哪些省有戏', lang: 'zh',
      profileKnown: { status: true, provs: true, clb: true },
    })
    expect(r2.options?.slotKey).toBe('edu')
    const r3 = await orchestrate(new FakePool(), {
      text: '我是木匠,想知道哪些省有戏', lang: 'zh',
      profileKnown: { status: true, provs: true, clb: true, edu: true, expMonths: true, married: true, canadaStudy: true },
    })
    expect(r3.options).toBeUndefined()
  })
})
