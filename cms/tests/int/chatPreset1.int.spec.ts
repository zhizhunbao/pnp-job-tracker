/**
 * 首页预设问题一（三语）回归。
 *
 * 被测链路是真实 orchestrate -> normalizeSlots -> resolveNoc -> collectFacts -> synth/出口校验；
 * 只有数据库返回行和 LLM 输入/输出使用 fixture。本文件不复制槽位归一、职业解析、事实组装或数字守卫逻辑。
 * fake LLM 会故意把用户问句塞进 claims，并在第一稿编出 77%，用来证明真实组件会过滤问句、拦截数字并重写。
 * 全组不读取 DATABASE_URI、不连接数据库，也不执行真实 SQL。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  presets: {
    zh: '安省大专毕业,做软件开发,还没工作,毕业后能留下吗?',
    en: 'Ontario college grad, software dev, no job yet — can I stay?',
    ko: '온타리오 컬리지 졸업, 소프트웨어 개발자, 아직 무직인데 남을 수 있나요?',
  },
  safe: {
    zh: '目前仍有继续核对留下路径的空间，但仅凭毕业和尚未就业还不能确定结果。',
    en: 'Staying remains an open possibility; graduation and having no job do not settle the outcome by themselves.',
    ko: '졸업했고 아직 취업하지 않았다는 사실만으로 체류 가능 여부가 결정되지는 않습니다.',
  },
  synthPrompts: [] as string[],
  synthAttempts: new Map<string, number>(),
}))

vi.mock('@/lib/llm', () => ({
  LlmError: class LlmError extends Error {},
  completeText: vi.fn(async (messages: { role: string; content: string }[]) => {
    const system = messages[0]?.content ?? ''
    const user = messages[1]?.content ?? ''
    if (system.includes('You turn one message from a would-be immigrant into slots.')) {
      const question = Object.values(fixture.presets).find((q) => user.includes(q)) ?? user
      return JSON.stringify({
        occ_en: 'software developer', noc: null, provs: ['ON'], exp_months: 0, status: 'graduated',
        // 模拟真实失败形态：模型把用户自己的问句误当作“别人说的话”。
        claims: [{ text: question, topic: 'other', province: 'ON' }],
      })
    }

    fixture.synthPrompts.push(`${system}\n${user}`)
    const lang = (Object.keys(fixture.presets) as Array<keyof typeof fixture.presets>)
      .find((key) => user.includes(`QUESTION: ${fixture.presets[key]}`))
    if (!lang) throw new Error('synthesis prompt did not contain a preset question')
    const attempt = (fixture.synthAttempts.get(lang) ?? 0) + 1
    fixture.synthAttempts.set(lang, attempt)
    // 第一稿故意编数字；真实 guardAnswer 应拦住并把 77 加入第二稿禁用清单。
    if (attempt === 1) return lang === 'zh' ? '你留下的成功率是 77%。' : lang === 'ko' ? '체류 성공률은 77%입니다.' : 'Your chance of staying is 77%.'
    return fixture.safe[lang]
  }),
}))

import { makeT, type Lang } from '@/app/(frontend)/jobs/i18n'
import { guardAnswer, orchestrate } from '@/lib/chatOrchestrate'

const NOC = '21232'
const TITLE = 'Software developers and programmers'

class FakePool {
  calls: { sql: string; params: unknown[] }[] = []

  async query(sql: string, params: unknown[] = []) {
    this.calls.push({ sql, params })
    if (sql.includes('similarity(j.title, $1)')) return { rows: [{ noc: NOC, sim: 0.92, n: 8 }] }
    if (sql.includes('SELECT title FROM noc_descriptions WHERE noc = $1')) return { rows: [{ title: TITLE }] }
    if (sql.includes("count(*) FILTER (WHERE apprentice_friendly)")) {
      return { rows: [{ province: 'ON', open: 6, named: 1, apprentice: 2 }] }
    }
    if (sql.includes("COALESCE(s.title_en, d.title, '') title")) return { rows: [{ title: TITLE, teer: 1 }] }
    if (sql.includes('SELECT last_seed FROM etl_heartbeat')) return { rows: [{ last_seed: '2026-08-05T12:00:00Z' }] }
    // 其余真实工具仍然执行自己的查询与四态归一；fixture 用空行表达“边界未提供记录”。
    return { rows: [] }
  }
}

const cases: Array<{ lang: Lang; preset: string; safe: string }> = [
  { lang: 'zh', preset: fixture.presets.zh, safe: fixture.safe.zh },
  { lang: 'en', preset: fixture.presets.en, safe: fixture.safe.en },
  { lang: 'ko', preset: fixture.presets.ko, safe: fixture.safe.ko },
]

describe('首页预设问题一（三语，真实编排组件 + fixture I/O）', () => {
  beforeEach(() => {
    fixture.synthPrompts.length = 0
    fixture.synthAttempts.clear()
  })

  it.each(cases)('$lang：预设原文进入真实编排，识别软件开发且不把问句当 claim', async ({ lang, preset, safe }) => {
    expect(makeT(lang)('chat.ex1')).toBe(preset)
    const pool = new FakePool()

    const result = await orchestrate(pool, { text: preset, lang })

    expect(result.slots).toMatchObject({
      noc: NOC,
      occText: 'software developer',
      provs: ['ON'],
      expMonths: 0,
      status: 'graduated',
      claims: [],
    })
    expect(pool.calls.some((call) => call.sql.includes('similarity(j.title, $1)') && call.params[0] === 'software developer')).toBe(true)
    expect(result.facts.some((fact) => fact.tool === 'lookupJobs' && fact.label.includes(NOC))).toBe(true)
    expect(result.facts.filter((fact) => fact.value != null).every((fact) => Boolean(fact.evidence.url))).toBe(true)

    // 第一稿的编造数字不在 facts/question，真实出口守卫必须触发第二稿且绝不见客。
    expect(fixture.synthAttempts.get(lang)).toBe(2)
    expect(result.answer).toBe(safe)
    expect(result.answer).not.toContain('77')
    expect(guardAnswer(result.answer, result.facts, preset).ok).toBe(true)
    expect(result.degraded).not.toBe(true)

    // 第一整句直接回答“能不能留下”；零经验不得被写成资格判死。
    expect(result.answer.startsWith(safe)).toBe(true)
    expect(result.answer).not.toMatch(/不能留下|不够格|cannot stay|not qualified|체류할 수 없|자격이 없/iu)

    const prompts = fixture.synthPrompts.filter((prompt) => prompt.includes(`QUESTION: ${preset}`))
    expect(prompts).toHaveLength(2)
    expect(prompts[0]).toContain('This person has no work experience yet: that is a matter of timing, never of eligibility.')
    expect(prompts[1]).toContain('Banned numbers (not in FACTS, rewrite without them): 77')
    expect(prompts[0]).toContain(`Occupation: ${TITLE} (NOC ${NOC})`)
  })
})
