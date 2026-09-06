// 站内向导域(lib/guide)纯函数回归:目录一致性、URL 拼装穷举、回包校验金标 + 变异探针、JSON 收口、
// 请求体校验。不连库、不打模型 —— 模型与检索都是注入的,这里只验「模型给什么我们认什么」。
// 设计稿 docs/design/顾问改向导-20260904.md §2 §3。
import { describe, expect, it } from 'vitest'
import { DEST_ROUTE, DEST_SUB, DEST_URL_KEYS } from '@/lib/guide'
import type { ResolvedSlots } from '@/lib/guide'
import { DEST_DESC, SUB_DESC } from '@/lib/guide/prompts'
import {
  answer, answerSystemOf, answerTextOf, jobsProvLineOf, jobsTotalsLineOf, jsonOf, lmiaLineOf, messagesOf, reqLineOf,
  resolveSlots, systemOf, toEmailInput, toInput, toJobsTotalsFact, toLmiaFact, toModelReply, toReqFact, toTurns, urlOf,
} from '@/lib/guide/functions'

const EMPTY: ResolvedSlots = { noc: null, prov: null, city: null, q: null, sub: null }

describe('目录一致性', () => {
  it('prompts 的说明表与 constants 的路由表键集相等(模型看到的每个键都有页,每页都有说明)', () => {
    expect(Object.keys(DEST_DESC).sort()).toEqual(Object.keys(DEST_ROUTE).sort())
  })

  it('参数表与子路径表只对目录里的键开', () => {
    for (const k of Object.keys(DEST_URL_KEYS)) {
      expect(DEST_ROUTE[k]).toBeDefined()
    }
    for (const k of Object.keys(DEST_SUB)) {
      expect(DEST_ROUTE[k]).toBeDefined()
      expect(DEST_SUB[k]!.length).toBeGreaterThan(0)
    }
  })
})

describe('urlOf —— 穷举每个目的地', () => {
  it('每个键都以自己的路由开头;有子路径的落清单第一项', () => {
    for (const [k, route] of Object.entries(DEST_ROUTE)) {
      const u = urlOf({ dest: k, slots: EMPTY })
      expect(u.startsWith(route)).toBe(true)
      const subs = DEST_SUB[k]
      if (subs != null) {
        expect(u).toBe(`${route}/${subs[0]}`)
      } else {
        expect(u).toBe(route)
      }
    }
  })

  it('职位板带职业码与省,顺序按参数表', () => {
    expect(urlOf({ dest: 'jobs', slots: { noc: '72310', prov: 'BC', city: null, q: null, sub: null } })).toBe('/jobs?noc=72310&prov=BC')
  })

  it('该页不收的槽位丢弃(把脉页只收省)', () => {
    expect(urlOf({ dest: 'pulse', slots: { noc: '72310', prov: 'ON', city: 'Ottawa', q: 'x', sub: null } })).toBe('/start?prov=ON')
  })

  it('不带参数表的页忽略一切槽位', () => {
    expect(urlOf({ dest: 'news', slots: { noc: '72310', prov: 'ON', city: 'Ottawa', q: 'x', sub: null } })).toBe('/news')
  })

  it('PTE 子路径在清单里就用,不在就落 ra', () => {
    expect(urlOf({ dest: 'pte', slots: { noc: null, prov: null, city: null, q: null, sub: 'wfd' } })).toBe('/pte/wfd')
    expect(urlOf({ dest: 'pte', slots: { noc: null, prov: null, city: null, q: null, sub: 'nope' } })).toBe('/pte/ra')
  })

  it('关键词按 URL 编码', () => {
    expect(urlOf({ dest: 'jobs', slots: { noc: null, prov: null, city: null, q: 'truck driver', sub: null } })).toBe('/jobs?q=truck+driver')
  })
})

describe('toModelReply —— 金标', () => {
  it('带路:四格照收,省码大写', () => {
    const r = toModelReply({ kind: 'nav', dest: 'jobs', occupation: 'carpenter', prov: 'bc', city: null, q: null, sub: null, say: '职位板。' })
    expect(r).toEqual({ kind: 'nav', dest: 'jobs', occupation: 'carpenter', prov: 'BC', city: null, q: null, sub: null, topic: null, say: '职位板。' })
  })

  it('问题与建议:dest 清空、say 清空', () => {
    expect(toModelReply({ kind: 'question', dest: 'jobs', occupation: null, prov: null, city: null, q: null, sub: null, say: 'x' }).dest).toBe(null)
    expect(toModelReply({ kind: 'question', dest: null, occupation: null, prov: null, city: null, q: null, sub: null, say: 'x' }).say).toBe('')
    expect(toModelReply({ kind: 'suggestion', dest: null, occupation: null, prov: null, city: null, q: null, sub: null, say: 'x' }).say).toBe('')
  })

  it('闲聊:say 保留', () => {
    expect(toModelReply({ kind: 'chat', dest: null, occupation: null, prov: null, city: null, q: null, sub: null, say: 'hi' }).say).toBe('hi')
  })
})

describe('toModelReply —— 变异探针', () => {
  it('类别不认 → 问题', () => {
    expect(toModelReply({ kind: 'answer', say: 'x' }).kind).toBe('question')
    expect(toModelReply({}).kind).toBe('question')
    expect(toModelReply({ kind: 42 }).kind).toBe('question')
  })

  it('nav 但目的地不在目录 → 问题,dest null,say 清空', () => {
    const r = toModelReply({ kind: 'nav', dest: 'google', say: 'go' })
    expect(r.kind).toBe('question')
    expect(r.dest).toBe(null)
    expect(r.say).toBe('')
  })

  it('省不是两位字母 → null;空串 → null', () => {
    expect(toModelReply({ kind: 'nav', dest: 'jobs', prov: 'British Columbia' }).prov).toBe(null)
    expect(toModelReply({ kind: 'nav', dest: 'jobs', prov: '' }).prov).toBe(null)
    expect(toModelReply({ kind: 'nav', dest: 'jobs', prov: 'on' }).prov).toBe('ON')
  })

  it('say 截到 400,槽位截到 80', () => {
    const long = 'a'.repeat(1000)
    const r = toModelReply({ kind: 'nav', dest: 'jobs', occupation: long, say: long })
    expect(r.say.length).toBe(400)
    expect(r.occupation!.length).toBe(80)
  })

  it('非字符串格一律 null', () => {
    const r = toModelReply({ kind: 'nav', dest: 'jobs', occupation: 5, city: ['x'], q: { a: 1 }, sub: true })
    expect([r.occupation, r.city, r.q, r.sub]).toEqual([null, null, null, null])
  })
})

describe('jsonOf —— 模型原文收口', () => {
  it('纯 JSON、围栏、前后带话都取得出;数组与垃圾是 null', () => {
    expect(jsonOf('{"kind":"nav"}')).toEqual({ kind: 'nav' })
    expect(jsonOf('```json\n{"kind":"nav"}\n```')).toEqual({ kind: 'nav' })
    expect(jsonOf('Sure! {"kind":"nav","say":"a {b} c"} done')).toEqual({ kind: 'nav', say: 'a {b} c' })
    expect(jsonOf('[1,2]')).toBe(null)
    expect(jsonOf('nothing here')).toBe(null)
    expect(jsonOf('{"kind":')).toBe(null)
  })
})

describe('systemOf / messagesOf', () => {
  it('system 含目录每个键、语种名与当前页;没路径就不提当前页', () => {
    const s = systemOf({ lang: 'zh', path: '/jobs/123' })
    for (const k of Object.keys(DEST_ROUTE)) {
      expect(s).toContain(`${k} — `)
    }
    expect(s).toContain('Chinese')
    expect(s).toContain('/jobs/123')
    expect(systemOf({ lang: 'en', path: '' })).not.toContain('currently on this page')
  })

  it('消息顺序:system → 历史 → 本轮', () => {
    const m = messagesOf({ system: 'S', text: 'Q', history: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] })
    expect(m.map((x) => x.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(m[3]!.content).toBe('Q')
  })
})

describe('toInput / toTurns / toEmailInput —— 请求体校验', () => {
  it('body 不是 JSON:正文空、语种回落 en、路径空、历史空', () => {
    expect(toInput(null)).toEqual({ text: '', lang: 'en', path: '', history: [] })
  })

  it('语种不认回落;路径不以 / 开头丢弃;正文 trim', () => {
    const r = toInput({ text: '  hi ', lang: 'fr', path: 'https://evil', history: [] })
    expect(r).toEqual({ text: 'hi', lang: 'en', path: '', history: [] })
    expect(toInput({ text: 'x', lang: 'ko', path: '/pte/ra' }).lang).toBe('ko')
  })

  it('历史:角色不认的丢,只留最近 6 轮', () => {
    const wire = []
    for (let i = 0; i < 10; i++) {
      wire.push({ role: 'user', content: String(i) })
    }
    wire.push({ role: 'system', content: 'x' })
    wire.push({ role: 'user' })
    const t = toTurns(wire)
    expect(t.length).toBe(6)
    expect(t[0]!.content).toBe('4')
  })

  it('留邮箱:三格都对才收', () => {
    expect(toEmailInput({ id: 12, thread: 'a'.repeat(16), email: 'a@b.co' })).toEqual({ id: 12, thread: 'a'.repeat(16), email: 'a@b.co' })
    expect(toEmailInput({ id: '12', thread: 'a'.repeat(16), email: ' a@b.co ' })).toEqual({ id: 12, thread: 'a'.repeat(16), email: 'a@b.co' })
    expect(toEmailInput({ id: 0, thread: 'a'.repeat(16), email: 'a@b.co' })).toBe(null)
    expect(toEmailInput({ id: 1, thread: 'short', email: 'a@b.co' })).toBe(null)
    expect(toEmailInput({ id: 1, thread: 'a'.repeat(16), email: 'not-an-email' })).toBe(null)
    expect(toEmailInput(null)).toBe(null)
  })
})

// ---- 2026-09-06 答题批:题目校验、q 过滤项目名、PTE 子项带分部、FACTS 行、答案收口(模型仍是注入的假函数) ----

describe('toModelReply —— topic(答题批)', () => {
  it('question 带合法题目照收;不合法 → null', () => {
    expect(toModelReply({ kind: 'question', topic: 'pnp', prov: 'on' }).topic).toBe('pnp')
    expect(toModelReply({ kind: 'question', topic: 'weather' }).topic).toBe(null)
    expect(toModelReply({ kind: 'question' }).topic).toBe(null)
  })

  it('非 question 一律 null(带路 / 建议 / 闲聊不取事实)', () => {
    expect(toModelReply({ kind: 'nav', dest: 'jobs', topic: 'jobs' }).topic).toBe(null)
    expect(toModelReply({ kind: 'suggestion', topic: 'pnp' }).topic).toBe(null)
    expect(toModelReply({ kind: 'chat', topic: 'lmia' }).topic).toBe(null)
  })
})

describe('resolveSlots —— 关键词里的项目名整格丢弃', () => {
  const reply = { kind: 'nav' as const, dest: 'employers_hiring', occupation: null, prov: null, city: null, sub: null, topic: null, say: '' }
  async function noNoc(): Promise<never[]> {
    return []
  }

  it('LMIA / PNP / express entry 大小写都丢;真关键词留', async () => {
    for (const bad of ['LMIA', 'lmia', 'PNP', 'Express Entry', 'ee ']) {
      const s = await resolveSlots({ reply: { ...reply, q: bad }, resolveNoc: noNoc })
      expect(s.q).toBe(null)
    }
    const s = await resolveSlots({ reply: { ...reply, q: 'truck driver' }, resolveNoc: noNoc })
    expect(s.q).toBe('truck driver')
  })
})

describe('目录 —— PTE 子项带题型与分部', () => {
  it('SUB_DESC 覆盖 DEST_SUB 每个子项,system 里 sst 标成 Listening、ra 标成 Speaking', () => {
    for (const [dest, subs] of Object.entries(DEST_SUB)) {
      for (const sub of subs) {
        expect(SUB_DESC[dest]?.[sub]).toBeDefined()
      }
    }
    const sys = systemOf({ lang: 'zh', path: '' })
    expect(sys).toContain('sst (Summarize Spoken Text, Listening)')
    expect(sys).toContain('ra (Read Aloud, Speaking)')
    expect(sys).toContain('TOPIC.')
  })
})

describe('FACTS 行 —— 数字原样、空格保 null', () => {
  it('门槛行:通道 — 条文,雇主侧带标记,没通道就只剩条文', () => {
    expect(reqLineOf({ stream: 'OINP Workforce Priority', employerSide: false, label: 'CLB 6 in all four' })).toBe('- OINP Workforce Priority — CLB 6 in all four')
    expect(reqLineOf({ stream: '', employerSide: true, label: 'revenue $1,000,000' })).toBe('- revenue $1,000,000 (employer-side)')
  })

  it('LMIA 雇主行:skilled 为 null 就不写那段(不折 0)', () => {
    expect(lmiaLineOf({ name: 'Acme', positions: 30, skilled: 12, quarter: '2026Q1', openJobs: 5 }))
      .toBe('- Acme: 12 skilled LMIA positions, 30 LMIA positions in total, latest quarter 2026Q1, 5 open postings on this site')
    expect(lmiaLineOf({ name: 'Acme', positions: 30, skilled: null, quarter: '', openJobs: 0 }))
      .toBe('- Acme: 30 LMIA positions in total, 0 open postings on this site')
  })

  it('职业行:中位薪资算不出写 not available;省分布空是空串', () => {
    expect(jobsTotalsLineOf({ noc: '72310', fact: { open: 120, eligible: 80, median: 61234.6 } }))
      .toBe('- 120 open postings for NOC 72310, 80 flagged PNP-eligible, median salary CAD 61235')
    expect(jobsTotalsLineOf({ noc: '72310', fact: { open: 1, eligible: 0, median: null } })).toContain('median salary not available')
    expect(jobsProvLineOf([])).toBe('')
    expect(jobsProvLineOf([{ province: 'ON', n: 50 }, { province: 'BC', n: 20 }])).toBe('- by province: ON: 50, BC: 20')
  })

  it('行构造器:空格与 NULL 走词汇表', () => {
    expect(toReqFact({ stream: null, subject: 'employer', label: null })).toEqual({ stream: '', employerSide: true, label: '' })
    expect(toLmiaFact({ name: 'A', lmia_positions: '3', lmia_positions_skilled: null, lmia_last_quarter: null, open_jobs: 2 }))
      .toEqual({ name: 'A', positions: 3, skilled: null, quarter: '', openJobs: 2 })
    expect(toJobsTotalsFact({ open: '7', eligible: null, med: null })).toEqual({ open: 7, eligible: 0, median: null })
  })
})

describe('answer —— 第二次调用的收口', () => {
  it('system 含铁律、FACTS 与语种;答案去空行、最多 6 行', async () => {
    const sys = answerSystemOf({ lang: 'ko', facts: ['- a', '- b'] })
    expect(sys).toContain('FACTS:\n- a\n- b')
    expect(sys).toContain('Korean')
    expect(sys).toContain('empty string')
    async function fake(): Promise<string> {
      return '\n- 1\n\n- 2\n- 3\n- 4\n- 5\n- 6\n- 7\n'
    }
    const a = await answer({ text: 'q', lang: 'zh', facts: ['- a'], complete: fake })
    expect(a.err).toBe(null)
    expect(a.say.split('\n')).toEqual(['- 1', '- 2', '- 3', '- 4', '- 5', '- 6'])
  })

  it('模型挂了:say 空串 + err=answer(不抛,退回「记下」)', async () => {
    async function boom(): Promise<string> {
      throw new Error('down')
    }
    const a = await answer({ text: 'q', lang: 'en', facts: ['- a'], complete: boom })
    expect(a).toEqual({ say: '', err: 'answer' })
  })

  it('模型回空串:say 空串(事实不够答就退回「记下」)', () => {
    expect(answerTextOf('   \n  ')).toBe('')
  })
})
