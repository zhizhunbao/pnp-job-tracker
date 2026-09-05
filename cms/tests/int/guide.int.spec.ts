// 站内向导域(lib/guide)纯函数回归:目录一致性、URL 拼装穷举、回包校验金标 + 变异探针、JSON 收口、
// 请求体校验。不连库、不打模型 —— 模型与检索都是注入的,这里只验「模型给什么我们认什么」。
// 设计稿 docs/design/顾问改向导-20260904.md §2 §3。
import { describe, expect, it } from 'vitest'
import {
  DEST_DESC, DEST_ROUTE, DEST_SUB, DEST_URL_KEYS, jsonOf, messagesOf, systemOf, toEmailInput, toInput, toModelReply,
  toTurns, urlOf,
} from '@/lib/guide'
import type { ResolvedSlots } from '@/lib/guide'

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
    expect(r).toEqual({ kind: 'nav', dest: 'jobs', occupation: 'carpenter', prov: 'BC', city: null, q: null, sub: null, say: '职位板。' })
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
