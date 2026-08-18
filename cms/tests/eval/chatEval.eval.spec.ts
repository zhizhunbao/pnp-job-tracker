/**
 * 对话评测批跑器(docs/implementation/对话闭环-批AB/07_对话评测批.md §3.3)。
 *
 * 真库 + 真模型(friend provider),重放 tests/cases/corpus.json(金标预设 × 生产语料脱敏),
 * 每轮出口把 sentenceBlockers 复跑一遍当「残留计数器」,再过 diseaseCards.checkCards,
 * afterAll 把报告写到 docs/evaluation/(md 给人读、json 给机器比对上一轮)。
 *
 * 🔴 退出码语义(别松):`hard: true` 的 case(确定性路径:D1 用法分支/首轮 tooShort)红=非零退出,
 * 回归即拦收口;其余 case 与病例卡检查器**只记录不拦**——「允许红」只给探索面,不给已收的账。
 * 本层不进 CI(vitest.eval.config.mts 独立 include),门禁看恒绿网,决策看这里的数。
 *
 * K09 前缀缓存:本 runner 不改用户原文、不加 cache-buster——改了原文,测的就不是生产输入。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ChatError, orchestrate } from '@/lib/chat/orchestrate'
import { sentenceBlockers } from '@/lib/chat/stream'
import type { ChatResult, ChatTurn } from '@/lib/chat/types'
import { friendLlmReady } from '@/lib/friendLlm'
import { checkCards, DISEASE_CARDS, type CardHit } from '../cases/diseaseCards'

type EvalCase = {
  id: string; note: string; lang: 'zh' | 'en' | 'ko'; source: string
  turns: string[]
  hard?: boolean
  expectErr?: 'tooShort' | 'noOcc'
  expectNocFinal?: string
  mustMatch?: string[]
}
// cwd = cms(pnpm script 从包根跑;__dirname 在 ESM 下没有,别用)
const CASES: EvalCase[] = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'tests/cases/corpus.json'), 'utf8'),
)

const URI = process.env.DATABASE_URI || ''
const suite = URI && friendLlmReady() ? describe : describe.skip

type TurnResult = {
  text: string; ms: number
  err: string | null; degraded: boolean
  noc: string | null; answer: string
  residual: string[]; cardHits: CardHit[]
}
type CaseResult = { id: string; note: string; hard: boolean; pass: boolean; problems: string[]; turns: TurnResult[] }
const results: CaseResult[] = []

suite('对话评测批跑(答上率/降级率/病例卡)', () => {
  let pool: pg.Pool
  beforeAll(() => { pool = new pg.Pool({ connectionString: URI, max: 3 }) })
  afterAll(async () => {
    await pool?.end()
    if (results.length) writeReport(results)
  })

  for (const c of CASES) {
    it(`${c.id} ${c.note}`, async () => {
      const history: ChatTurn[] = []
      const turns: TurnResult[] = []
      const askedSoFar: string[] = []
      for (const text of c.turns) {
        askedSoFar.push(text)
        const t0 = Date.now()
        let r: ChatResult | null = null
        let err: string | null = null
        try {
          r = await orchestrate(pool, { text, lang: c.lang, ...(history.length ? { history: [...history] } : {}) })
        } catch (e) {
          err = e instanceof ChatError ? e.code : `throw:${String((e as Error)?.message).slice(0, 80)}`
        }
        const residual = r ? sentenceBlockers(r.answer, r.facts, c.lang, text, r.slots) : []
        const cardHits = r
          ? checkCards({
              questions: askedSoFar.join('\n'),
              answer: r.answer,
              factsText: r.facts.map((x) => `${x.label} ${x.valueText}`).join('\n'),
              lang: c.lang,
              claims: r.slots.claims,
              residual,
            })
          : []
        turns.push({
          text, ms: Date.now() - t0, err, degraded: !!r?.degraded,
          noc: r?.slots.noc ?? null, answer: r?.answer ?? '', residual, cardHits,
        })
        history.push({ role: 'user', content: text })
        if (r) history.push({ role: 'assistant', content: r.answer })
        if (err) break // 一轮死了,后续轮的 history 就不是生产形状了——如实截断,报告里看得见
      }

      // 期望核对(case 级,对最后一轮)
      const problems: string[] = []
      const last = turns[turns.length - 1]
      if (turns.length < c.turns.length) problems.push(`第 ${turns.length} 轮 err=${last.err},后续轮未跑`)
      if (c.expectErr) {
        if (last.err !== c.expectErr) problems.push(`期望 err=${c.expectErr},实得 ${last.err ?? 'null'}`)
      } else if (last.err) {
        problems.push(`err=${last.err}(期望答上)`)
      }
      if (c.expectNocFinal && last.noc !== c.expectNocFinal) {
        problems.push(`期望 noc=${c.expectNocFinal},实得 ${last.noc ?? 'null'}`)
      }
      for (const src of c.mustMatch ?? []) {
        if (!new RegExp(src, 'i').test(last.answer)) problems.push(`答复未命中 /${src}/`)
      }

      const pass = problems.length === 0
      results.push({ id: c.id, note: c.note, hard: !!c.hard, pass, problems, turns })
      // 硬档:确定性路径的回归 = 非零退出;软档只记录(见文件头)
      if (c.hard) expect(problems, `${c.id} 硬档回归:\n${problems.join('\n')}\n${last.answer}`).toEqual([])
    }, 600_000)
  }
})

// ── 报告 ─────────────────────────────────────────────────────────────────────

function writeReport(rs: CaseResult[]) {
  const dir = path.resolve(process.cwd(), '../docs/evaluation')
  mkdirSync(dir, { recursive: true })
  const day = new Date().toISOString().slice(0, 10)

  const allTurns = rs.flatMap((r) => r.turns)
  const answered = allTurns.filter((t) => !t.err)
  const errCount: Record<string, number> = {}
  for (const t of allTurns) if (t.err) errCount[t.err] = (errCount[t.err] ?? 0) + 1
  const hits = allTurns.flatMap((t) => t.cardHits)
  const byCard: Record<string, string[]> = {}
  for (const h of hits) (byCard[h.card] ??= []).push(h.detail)
  const residualTurns = allTurns.filter((t) => t.residual.length)

  const summary = {
    date: day,
    cases: rs.length,
    turns: allTurns.length,
    answeredTurns: answered.length,
    degradedTurns: allTurns.filter((t) => t.degraded).length,
    errCount,
    residualTurns: residualTurns.length,
    hardFails: rs.filter((r) => r.hard && !r.pass).map((r) => r.id),
    softFails: rs.filter((r) => !r.hard && !r.pass).map((r) => r.id),
    cardHits: Object.fromEntries(Object.entries(byCard).map(([k, v]) => [k, v.length])),
    avgMs: Math.round(allTurns.reduce((a, t) => a + t.ms, 0) / Math.max(1, allTurns.length)),
  }

  writeFileSync(path.join(dir, `对话评测-${day}.json`), JSON.stringify({ summary, results: rs }, null, 1), 'utf8')

  const md: string[] = []
  md.push(`# 对话评测批跑报告(${day})`, '')
  md.push(`> runner=tests/eval/chatEval.eval.spec.ts;真库+真模型(friend);口径说明:本报告报**答上率/降级率/病例卡命中**,`)
  md.push(`> 不是 Case-Harness D2 的逐句复现率(那要 Fact.code,记账未做)。C02 那次 12/36 与此处数字不可直接比。`, '')
  md.push(`## 总览`, '')
  md.push(`| 指标 | 值 |`, `|---|---|`)
  md.push(`| case / 轮次 | ${summary.cases} / ${summary.turns} |`)
  md.push(`| 答上轮(err=null) | ${summary.answeredTurns}/${summary.turns} |`)
  md.push(`| 降级轮(factSheet) | ${summary.degradedTurns} |`)
  md.push(`| err 分布 | ${Object.entries(errCount).map(([k, v]) => `${k}=${v}`).join(',') || '无'} |`)
  md.push(`| 出口残留(sentenceBlockers 复跑>0) | ${summary.residualTurns} 轮 |`)
  md.push(`| 硬档失败 | ${summary.hardFails.join(',') || '0'} |`)
  md.push(`| 软档未达期望 | ${summary.softFails.join(',') || '0'} |`)
  md.push(`| 病例卡命中 | ${Object.entries(summary.cardHits).map(([k, v]) => `${k}×${v}`).join(',') || '无'} |`)
  md.push(`| 平均轮耗时 | ${summary.avgMs}ms |`, '')

  md.push(`## 病例卡命中明细`, '')
  if (!hits.length) md.push('(无)', '')
  for (const [card, details] of Object.entries(byCard)) {
    const meta = DISEASE_CARDS.find((d) => d.id === card)
    md.push(`### ${card}(${meta?.status ?? '?'})${meta ? ' ' + meta.symptom.slice(0, 40) : ''}`, '')
    for (const d of details) md.push(`- ${d}`)
    md.push('')
  }

  md.push(`## 逐 case`, '')
  for (const r of rs) {
    md.push(`### ${r.id} ${r.note}${r.hard ? '(硬档)' : ''} — ${r.pass ? '✅' : '❌'}`, '')
    for (const p of r.problems) md.push(`- ⚠️ ${p}`)
    r.turns.forEach((t, i) => {
      md.push(`- 轮${i + 1}「${t.text.slice(0, 40)}」 err=${t.err ?? '—'} noc=${t.noc ?? '—'} ${t.ms}ms` +
        (t.residual.length ? ` 残留=${t.residual.length}` : '') +
        (t.cardHits.length ? ` 卡=${t.cardHits.map((h) => h.card).join('/')}` : ''))
    })
    const fin = r.turns[r.turns.length - 1]
    if (fin?.answer) md.push('', '```', fin.answer, '```')
    md.push('')
  }
  writeFileSync(path.join(dir, `对话评测-${day}.md`), md.join('\n'), 'utf8')
  console.log(`[eval] ${summary.answeredTurns}/${summary.turns} answered, hardFails=${summary.hardFails.length}, ` +
    `cards=${JSON.stringify(summary.cardHits)} -> docs/evaluation/对话评测-${day}.md`)
}
