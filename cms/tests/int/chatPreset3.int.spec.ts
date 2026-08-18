/**
 * 首页预设问题 3 的三语回归。
 *
 * 这里走的是真 makeT → orchestrate → normalizeSlots / resolveNoc → collectFacts / checkClaims
 * → synthMessages → 出口校验；只把数据库返回行和两次 LLM I/O 做成 fixture。测试不连接数据库，
 * 也不静态复刻职业解析、私人承诺识别、事实装配或出口校验。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROMISE_WHY } from '@/lib/i18n'

vi.mock('@/lib/llm', () => ({
  LlmError: class LlmError extends Error {},
  completeText: vi.fn(async (messages: { role: string; content: string }[]) => {
    const system = messages[0]?.content ?? ''
    const user = messages.at(-1)?.content ?? ''
    if (system.includes('turn one message')) {
      if (/에이전트|매니토바/.test(user)) {
        return JSON.stringify({
          occ_en: 'carpenter', noc: null, provs: ['MB'], exp_months: null, status: null,
          claims: [{
            text: '에이전트가 매니토바 목수 오퍼와 주정부 지명을 보장한다고 합니다',
            topic: 'other', province: 'MB',
          }],
        })
      }
      if (/agent|Manitoba/i.test(user)) {
        return JSON.stringify({
          occ_en: 'carpenter', noc: null, provs: ['MB'], exp_months: null, status: null,
          claims: [{
            text: 'An agent says they can guarantee a Manitoba carpenter offer and nomination',
            topic: 'other', province: 'MB',
          }],
        })
      }
      return JSON.stringify({
        occ_en: 'carpenter', noc: null, provs: ['MB'], exp_months: null, status: null,
        claims: [{ text: '中介说能包曼省木匠 offer 和省提名', topic: 'other', province: 'MB' }],
      })
    }
    if (user.startsWith('Reply language: Korean')) {
      return [
        '이런 사적인 약속은 공식 보장이 아닙니다. 아래의 공식 목록과 요건을 확인해야 합니다.',
        '',
        '- 매니토바 공식 직업 목록에는 목수 직종인 NOC 72310이 포함됩니다.',
        '- 직업 목록의 목수 언어 기준은 CLB 5입니다.',
        '- Skilled Worker in Manitoba 경로는 같은 고용주 밑에서 6개월 동안 연속으로 정규직 근무해야 합니다.',
        '- 별도 EDI 경로에서는 고용주가 3년 동안 사업을 운영해야 하며, 이 조건을 다른 경로에 합치면 안 됩니다.',
      ].join('\n')
    }
    if (user.startsWith('Reply language: English')) {
      return [
        'A private promise is not an official guarantee; check the published lists and requirements below instead.',
        '',
        "- Manitoba's official occupation list includes carpenter, NOC 72310.",
        '- The occupation list sets CLB 5 for carpenter.',
        '- Skilled Worker in Manitoba requires 6 months of continuous full-time work with that employer.',
        '- Separately, EDI requires the employer to have operated for 3 years; that must not be merged into another pathway.',
      ].join('\n')
    }
    return [
      '这类私人承诺不能当作官方保证;真正可核的是下面的官方清单和门槛。',
      '',
      '- 曼省官方职业清单收录了木匠 NOC 72310。',
      '- 职业清单给木匠标出的语言门槛是 CLB 5。',
      '- Skilled Worker in Manitoba 路径要求在同一雇主处连续全职工作满 6 个月。',
      '- 另一个 EDI 路径要求雇主经营满 3 年，不能把它并进前一条路径。',
    ].join('\n')
  }),
}))

import { makeT, type Lang } from '@/lib/i18n'
import { checkClaims, type Claim } from '@/lib/chat/tools'
import { guardAnswer } from '@/lib/chat/guards'
import { orchestrate } from '@/lib/chat/orchestrate'
import { normalizeSlots } from '@/lib/chat/slots'
import type { ChatResult } from '@/lib/chat/types'
import { completeText } from '@/lib/llm'

const IDOL = 'https://immigratemanitoba.com/mpnp/idol/'
const SWM = 'https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility'
const EDI = 'https://immigratemanitoba.com/employer-services/edi/'
const FETCHED = '2026-08-05'

const requirement = (
  factor: string, value: number, unit: string, subject: 'applicant' | 'employer',
  stream: string, url: string, basis = '',
) => ({
  province: 'MB', program: 'MPNP', stream, subject, factor, op: '>=', value,
  value_text: `${factor} official threshold`, unit, applies_teer: '', applies_noc: '', excludes_noc: '',
  applies_area: '', applies_condition: '', applies_family_size: null, basis,
  label: `${stream}: ${factor} official threshold`, section: 'Eligibility', effective: '', url,
  page_url: '', fetched: FETCHED,
})

/** SQL 只是边界 fixture；每个分支都由真实 lookup/assembleReportFacts 消费。未知查询直接报错，防漏测。 */
class PresetPool {
  calls: { sql: string; params: unknown[] }[] = []

  async query(sql: string, params: unknown[] = []) {
    this.calls.push({ sql, params })
    if (sql.includes('similarity(j.title, $1)')) return { rows: [{ noc: '72310' }] }
    if (sql.includes('SELECT title FROM noc_descriptions')) return { rows: [{ title: 'Carpenters' }] }
    if (sql.includes("LEFT JOIN stats_occupation s ON s.noc = d.noc")) {
      return { rows: [{ title: 'Carpenters', teer: 2 }] }
    }
    if (sql.includes('count(*)::int open')) {
      return { rows: [{ province: 'MB', open: 14, named: 4, apprentice: 2 }] }
    }
    if (sql.includes('FROM pnp_requirements q')) {
      return { rows: [
        requirement('language', 5, 'CLB', 'applicant', 'MPNP In-Demand Occupations List', IDOL),
        requirement('experience', 6, 'months', 'applicant', 'Skilled Worker in Manitoba', SWM, 'employerTenure'),
        requirement('empYears', 3, 'years', 'employer', 'Employer Direct Initiative', EDI),
      ] }
    }
    if (sql.includes('FROM pnp_occupations')) {
      return { rows: [{
        province: 'MB', stream: 'MPNP In-Demand Occupations List', label: 'MB 在需职业',
        type: 'indemand', noc: '72310', url: IDOL, fetched: FETCHED,
      }] }
    }
    if (sql.includes('FROM ee_categories')) return { rows: [] }
    if (sql.includes('FROM pnp_draws WHERE province = $1')) return { rows: [] }
    if (sql.includes('FROM pnp_ops_stats')) return { rows: [] }
    if (sql.includes('FROM pnp_draws')) return { rows: [] }
    if (sql.includes('FROM pnp_score_factors')) return { rows: [] }
    if (sql.includes('median_wage_annual')) return { rows: [] }
    if (sql.includes('FROM stats')) return { rows: [] }
    if (sql.includes('FROM etl_heartbeat')) return { rows: [{ last_seed: `${FETCHED}T12:00:00Z` }] }
    if (sql.includes('SELECT max(last_seen)')) return { rows: [{ upd: `${FETCHED}T12:00:00Z` }] }
    throw new Error(`unexpected fixture query: ${sql.replace(/\s+/g, ' ').slice(0, 140)}`)
  }
}

const forbiddenAmount = /(?:2\s*万|20\s*k|20[,.]?000|2만)/iu
const expectedClaim: Record<Lang, string> = {
  zh: '中介说能包曼省木匠 offer 和省提名',
  en: 'An agent says they can guarantee a Manitoba carpenter offer and nomination',
  ko: '에이전트가 매니토바 목수 오퍼와 주정부 지명을 보장한다고 합니다',
}
const forbiddenEmptyAnswer: Record<Lang, RegExp> = {
  zh: /官方不公布|全部.{0,12}无法核实|这两项.{0,12}无法核实|谁也核不了/,
  en: /government does not publish|everything.{0,20}(?:cannot be verified|is unverifiable)|nobody can check/i,
  ko: /정부가 공개하지|전부.{0,20}확인할 수 없|아무도 확인할 수 없/,
}

describe('首页预设问题 3（三语真实编排 + fixture I/O）', () => {
  beforeEach(() => { vi.mocked(completeText).mockClear() })

  it.each(['zh', 'en', 'ko'] as const)('%s：预设不编报价，原话归入 private-promise 且工具层为 not-applicable', async (lang) => {
    const preset = makeT(lang)('chat.ex3')
    expect(preset).not.toMatch(forbiddenAmount)

    // 故意模拟模型错判成 other：应由真实 normalizeSlots 按原话纠正，而不是相信 fixture topic。
    const normalized = normalizeSlots({
      occ_en: 'carpenter', provs: ['MB'],
      claims: [{ text: expectedClaim[lang], topic: 'other', province: 'MB' }],
    })
    expect(normalized.claims).toEqual([{ text: expectedClaim[lang], topic: 'private-promise', province: 'MB' }])

    const checked = await checkClaims(new PresetPool(), {
      noc: '72310', claims: normalized.claims as Claim[],
    })
    expect(checked.checked).toHaveLength(0)
    expect(checked.uncheckable).toHaveLength(1)
    expect(checked.uncheckable[0]).toMatchObject({
      bucket: 'uncheckable', availability: 'not-applicable',
      claim: { topic: 'private-promise' },
    })
  })

  it.each(['zh', 'en', 'ko'] as const)('%s：预设完整经过编排、事实装配、合成与出口', async (lang) => {
    const preset = makeT(lang)('chat.ex3')
    const pool = new PresetPool()
    const result: ChatResult = await orchestrate(pool, { text: preset, lang: lang as Lang })

    expect(result.degraded).not.toBe(true)
    expect(result.slots).toMatchObject({ noc: '72310', provs: ['MB'] })
    expect(result.slots.claims).toHaveLength(1)
    expect(result.slots.claims[0]).toMatchObject({ topic: 'private-promise', province: 'MB' })

    const claimFacts = result.facts.filter((fact) => fact.tool === 'checkClaims' && fact.unit === 'claim')
    expect(claimFacts).toHaveLength(1)
    expect(claimFacts[0].label).toContain(PROMISE_WHY[lang])
    expect(claimFacts[0].label).not.toMatch(forbiddenEmptyAnswer[lang])
    expect(result.answer.match(new RegExp(PROMISE_WHY[lang].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
    const promiseWords = lang === 'zh' ? /私人承诺/g : lang === 'en' ? /private promise/gi : /사적인 약속/g
    expect(result.answer.match(promiseWords), `同一条私人承诺被重复解释:\n${result.answer}`).toHaveLength(1)
    expect(result.answer).not.toMatch(forbiddenEmptyAnswer[lang])
    expect(result.answer).not.toMatch(forbiddenAmount)

    const mbList = result.facts.find((fact) => fact.tool === 'lookupCoverage' && fact.label.startsWith('MB '))
    expect(mbList, '真实 lookupCoverage 没把 MB 清单命中装进 facts').toBeTruthy()
    expect(mbList?.evidence).toEqual(expect.objectContaining({ url: IDOL, fetched: FETCHED }))
    expect(result.answer).toMatch(lang === 'zh' ? /清单/ : lang === 'en' ? /list/i : /목록/)

    const mbThresholds = result.facts.filter((fact) => fact.tool === 'lookupThresholds' && fact.label.startsWith('MB '))
    expect(mbThresholds.map((fact) => fact.value)).toEqual(expect.arrayContaining([3, 5, 6]))
    expect(mbThresholds.map((fact) => fact.label)).toEqual(expect.arrayContaining([
      expect.stringContaining('MPNP In-Demand Occupations List'),
      expect.stringContaining('Skilled Worker in Manitoba'),
      expect.stringContaining('Employer Direct Initiative'),
    ]))
    expect(mbThresholds.map((fact) => fact.evidence.url)).toEqual(expect.arrayContaining([IDOL, SWM, EDI]))
    for (const value of [3, 5, 6]) expect(result.answer).toContain(String(value))

    expect(guardAnswer(result.answer, result.facts, preset)).toEqual({ ok: true, bad: [] })
    expect(pool.calls.some(({ sql }) => sql.includes('similarity(j.title, $1)'))).toBe(true)
    expect(pool.calls.some(({ sql }) => sql.includes('FROM pnp_occupations'))).toBe(true)
    expect(pool.calls.some(({ sql }) => sql.includes('FROM pnp_requirements q'))).toBe(true)

    // 两次真实模型边界调用：第一遍抽槽位，第二遍由真实 synthMessages 生成提示并进入出口。
    const calls = vi.mocked(completeText).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][0][0].content).toContain('turn one message')
    expect(calls[1][0][1].content).toContain('CLAIM LINES')
    expect(calls[1][0][1].content).toContain('NOC 72310')
  })
})
