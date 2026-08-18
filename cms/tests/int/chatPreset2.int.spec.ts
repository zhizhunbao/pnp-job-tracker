/**
 * 首页预设问题 2（三语）端到端回归。
 *
 * 真组件：i18n 的真实预设、orchestrate、normalizeSlots、resolveNoc、collectFacts、
 * lookupJobs/lookupCoverage/lookupThresholds/checkClaims、合成出口与数字 guard。
 * fixture 边界：数据库返回行与两次 LLM I/O；不连接 DATABASE_URI，不执行真实 SQL。
 * fixture 只提供官方行，不复刻任何槽位归一、职业解析、四态或事实装配逻辑。
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/llm', () => ({
  LlmError: class LlmError extends Error {},
  completeText: vi.fn(async (messages: { role: string; content: string }[]) => {
    const system = messages[0]?.content ?? ''
    const user = messages[1]?.content ?? ''
    if (system.includes('You turn one message from a would-be immigrant into slots')) {
      const text = user.replace(/^NOW:\s*/, '')
      const zh = /[\u3400-\u9fff]/.test(text)
      const ko = /[\uac00-\ud7af]/.test(text)
      // 故意把“老板帮办”错标 other：验证真实 normalizeSlots 是否能按原话兜底，
      // 而不是让 fixture 替被测组件做正确分类。
      const claim = zh ? '老板说帮我办'
        : ko ? '고용주가 주정부 지명을 도와준다고 합니다'
          : 'the employer says it will help with the nomination'
      return JSON.stringify({
        occ_en: 'cook', noc: null, provs: ['NS'], exp_months: null, status: null,
        claims: [{ text: claim, topic: 'other', province: 'NS' }],
      })
    }

    // 合成 I/O fixture 只把真实编排已经生成的 claim 成品句与官方数字改写成人话；
    // 后续仍须通过 orchestrate 的真实出口检查，违规数字会被 guard 拦下。
    const claim = user.match(/CLAIM LINES[\s\S]*?\n- (.+?)(?:\n\n|$)/)?.[1] ?? ''
    if (user.includes('Reply language: Simplified Chinese')) {
      return `${claim}。\n\n- 申请人的语言门槛是 5 CLB，相关带薪经验门槛是 12 个月。\n`
        + '- 雇主必须在新斯科舍经营满 2 年。'
    }
    if (user.includes('Reply language: Korean')) {
      return `${claim}.\n\n- 신청자 언어 기준은 CLB 5이고 관련 유급 경력 기준은 12개월입니다.\n`
        + '- 고용주는 노바스코샤에서 2년 이상 운영했어야 합니다.'
    }
    return `${claim}.\n\n- The applicant language threshold is CLB 5 and the related paid experience threshold is 12 months.\n`
      + '- The employer must have operated in Nova Scotia for 2 years.'
  }),
}))

import { makeT, type Lang } from '@/lib/i18n'
import { guardAnswer } from '@/lib/chat/guards'
import { orchestrate } from '@/lib/chat/orchestrate'

const NS_GUIDE = 'https://liveinnovascotia.com/sites/default/files/2026-02/Guide-NSNP-Skilled-Worker-English.pdf'
const NS_LIST = 'https://liveinnovascotia.com/critical-vacancies'
const FETCHED = '2026-08-05'

const requirement = (over: Record<string, unknown>) => ({
  province: 'NS', program: 'PNP', stream: 'Nova Scotia Nominee Program — Skilled Worker stream',
  subject: 'applicant', factor: 'language', op: '>=', value: 5, value_text: '', unit: 'CLB',
  applies_teer: '0,1,2,3', applies_noc: '', excludes_noc: '', applies_area: '', applies_condition: '',
  applies_family_size: null, basis: '', label: 'CLB or NCLC Level 5 or higher for NOC TEER 0, 1, 2 and 3',
  section: 'Language — NOC TEER 0, 1, 2 and 3', effective: 'July 2026',
  url: NS_GUIDE, page_url: 'https://liveinnovascotia.com/skilled-worker', fetched: FETCHED,
  ...over,
})

class Preset2Pool {
  calls: { sql: string; params: unknown[] }[] = []
  unexpected: string[] = []

  async query(sql: string, params: unknown[] = []) {
    this.calls.push({ sql, params })
    if (sql.includes('max(similarity(j.title, $1))')) return { rows: [{ noc: '63200', sim: 0.98, n: 4 }] }
    if (sql.includes('SELECT title FROM noc_descriptions WHERE noc = $1')) return { rows: [{ title: 'Cooks' }] }
    if (sql.includes("COALESCE(s.title_en, d.title, '') title")) return { rows: [{ title: 'Cooks', teer: 3 }] }
    if (sql.includes('FROM jobs WHERE') && sql.includes('GROUP BY province')) {
      return { rows: [{ province: 'NS', open: 0, named: 0, apprentice: 0 }] }
    }
    if (sql.includes('FROM pnp_requirements q ORDER BY province, seq')) {
      return { rows: [
        requirement({}),
        requirement({ value: 4, applies_teer: '4,5', label: 'CLB or NCLC Level 4 or higher for NOC TEER 4 and 5' }),
        requirement({ factor: 'experience', value: 12, unit: 'months', applies_teer: '',
          label: '12 complete calendar months of paid work related to the job being offered',
          section: 'Skilled Workers — work experience' }),
        requirement({ subject: 'employer', factor: 'empYears', value: 2, unit: 'years', applies_teer: '',
          label: 'The employer must have operated in Nova Scotia for at least 2 years',
          section: 'Core Requirements — employer' }),
      ] }
    }
    if (sql.includes('FROM pnp_occupations')) {
      // 真实政策形状：NS 有专项 Critical Vacancies 清单，但 cook 63200 不在这张具名清单；
      // Skilled Worker 主线按 offer/TEER，不得把“未命中”说成私人承诺“官方不公布”。
      return { rows: [{
        province: 'NS', stream: 'Nova Scotia Critical Vacancies', label: 'NS 紧缺空缺', type: 'indemand',
        noc: '72310', url: NS_LIST, fetched: FETCHED,
      }] }
    }
    if (sql.includes('FROM pnp_draws') || sql.includes('FROM pnp_score_factors')
      || sql.includes('FROM stats_occupation WHERE') || (sql.includes('FROM stats') && sql.includes('difficulty'))
      || sql.includes('FROM ee_categories') || sql.includes('FROM pnp_ops_stats')) return { rows: [] }
    if (sql.includes('SELECT last_seed FROM etl_heartbeat')) return { rows: [{ last_seed: `${FETCHED}T12:00:00Z` }] }

    this.unexpected.push(sql)
    return { rows: [] }
  }
}

const PRESETS: { lang: Lang; expected: string }[] = [
  { lang: 'zh', expected: '新斯科舍的餐厅给了我厨师 offer,老板说帮我办,可信吗?' },
  { lang: 'en', expected: 'A Nova Scotia restaurant gave me a cook offer and says it will help with the nomination. Can I trust that?' },
  { lang: 'ko', expected: '노바스코샤 식당에서 요리사 오퍼를 받았고 고용주가 주정부 지명을 도와준다고 합니다. 믿어도 될까요?' },
]

describe('首页预设问题 2（三语真实编排 + fixture I/O）', () => {
  it.each(PRESETS)('$lang 预设保留同一件事：cook offer + 老板帮办 + 可信度', ({ lang, expected }) => {
    expect(makeT(lang)('chat.ex2')).toBe(expected)
  })

  it.each(PRESETS)('$lang 从真实预设走完整编排，认出 cook/NS、纠正帮办主张并给可核门槛', async ({ lang }) => {
    const question = makeT(lang)('chat.ex2')
    const pool = new Preset2Pool()
    const result = await orchestrate(pool, { text: question, lang })

    // 真实槽位归一与职业解析，不让 fixture 直接塞 NOC。
    expect(result.slots.noc).toBe('63200')
    expect(result.slots.provs).toEqual(['NS'])
    expect(result.slots.claims).toHaveLength(1)
    expect(result.slots.claims[0].topic).toBe('private-promise')

    // “老板帮办”是私人承诺，不是一项政府数据；不得套“官方不公布”。
    const claimFacts = result.facts.filter((f) => f.tool === 'checkClaims' && f.unit === 'claim')
    expect(claimFacts).toHaveLength(1)
    expect(`${claimFacts[0].label} ${claimFacts[0].valueText}`).not.toMatch(
      /官方不公布|government does not publish|정부가 공개하지/,
    )

    // NS 主线无 cook 具名命中时，也不能把无命中状态借给“老板帮办”或作为无出处的“不公布”见客。
    const coverage = result.facts.filter((f) => f.tool === 'lookupCoverage' && /NS/.test(f.label))
    expect(coverage.every((f) => !/官方不公布|government does not publish|정부가 공개하지/
      .test(`${f.label} ${f.valueText}`))).toBe(true)

    // 真 lookupThresholds + rules 引擎：TEER 3 取 CLB 5（不是 TEER 4/5 的 CLB 4），
    // 并带出相关经验与雇主经营年限；每个数字都挂官方 URL + 抓取日。
    const thresholds = result.facts.filter((f) => f.tool === 'lookupThresholds')
    expect(thresholds.map((f) => [f.value, f.unit])).toEqual(expect.arrayContaining([
      [5, 'CLB'], [12, 'months'], [2, 'years'],
    ]))
    expect(thresholds.map((f) => f.value)).not.toContain(4)
    expect(thresholds.every((f) => f.evidence.url === NS_GUIDE && f.evidence.fetched === FETCHED)).toBe(true)

    // 出口成品第一句先回答“可信不可信”，不是先念表；三条真正可核条件都进入答案。
    const first = result.answer.split(/(?<=[。.!?])/)[0]
    expect(first).toMatch(lang === 'zh' ? /不能当作官方保证/ : lang === 'ko' ? /공식 보장이 아닙니다/ : /not an official guarantee/i)
    expect(result.answer).toContain('5')
    expect(result.answer).toContain('12')
    expect(result.answer).toContain('2')
    expect(result.answer).not.toMatch(/全部无法核实|均无法核实|cannot verify (?:all|both)|모두 확인할 수 없/)
    expect(result.answer).not.toMatch(/官方不公布|government does not publish|정부가 공개하지/)
    expect(guardAnswer(result.answer, result.facts, question).ok).toBe(true)

    // fixture pool 覆盖了真实编排发出的每一种查询，没有静态绕开任何未识别 SQL。
    expect(pool.unexpected).toEqual([])
    expect(pool.calls.some((c) => c.sql.includes('max(similarity(j.title, $1))'))).toBe(true)
    expect(pool.calls.some((c) => c.sql.includes('FROM pnp_requirements q'))).toBe(true)
    expect(pool.calls.some((c) => c.sql.includes('FROM pnp_occupations'))).toBe(true)
  })
})
