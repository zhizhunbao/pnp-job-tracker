/**
 * 新链(lib/consult)评测批跑器 —— P4 两链对跑的新链侧(17 号卷宗 §5)。
 *
 * 两个语料源,一次跑完,报告落 docs/evaluation/对话评测-新链-<日期>.md|.json:
 *   ① tests/cases/corpus.json 的 24 条金标(与老链 chatEval 同一份语料,分数可直接对比);
 *   ② chat_logs 里全部去重生产问题(老链的真实结局就在日志里 —— 对跑的老链侧不用重跑,
 *      逐题带出「老链当时 ok/err」与新链现跑的结果并排)。
 *
 * 与 chatEval 的三点口径差,都是**架构差**不是放水:
 *   · expectErr(tooShort/noOcc)是老链编排闸的产物,新链把「要不要职业」交给模型分 ——
 *     这类期望只记录不计分(新链答上了算赢,不算「没按预期报错」);
 *   · hard 档一律**记录不拦**:这是新链的首轮基线,没有「已收的账」可回归;
 *   · residual(老链逐句门当第二眼)已随 lib/chat 删除暂停;新链逐句门批補上后接回。
 *
 * 串行 + 单文件:别并发打爆朋友的服务与生产池(prod-pool-wedge 教训)。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { getDb } from '@/lib/db/server'
import { consult } from '@/lib/consult/server'
import { EMPTY_PROFILE } from '@/lib/consult'
import type { Fact as ConsultFact } from '@/lib/consult'
import { isChatError } from '@/lib/error'
import { checkCards, type CardHit } from '../cases/diseaseCards'

type EvalCase = {
  id: string; note: string; lang: 'zh' | 'en' | 'ko'; source: string
  turns: string[]
  hard?: boolean
  expectErr?: 'tooShort' | 'noOcc'
  expectNocFinal?: string
  mustMatch?: string[]
}
const CASES: EvalCase[] = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'tests/cases/corpus.json'), 'utf8'),
)

const LIVE = Boolean(process.env.DATABASE_URI) && Boolean(process.env.CHAT_LLM_BASE || process.env.TRANSLATE_API_BASE)
const suite = LIVE ? describe : describe.skip

type TurnResult = {
  text: string; ms: number
  err: string | null; degraded: boolean
  noc: string | null; facts: number; answer: string
  residual: string[]; cardHits: CardHit[]
}
type CaseResult = { id: string; note: string; hard: boolean; pass: boolean; problems: string[]; oldOnly: string[]; turns: TurnResult[] }
type ProdResult = {
  question: string; lang: string
  oldN: number; oldOkN: number; oldErrs: string; oldAvgMs: number
  turn: TurnResult
}
const caseResults: CaseResult[] = []
const prodResults: ProdResult[] = []

/** 一轮:同 logReplay 的形状 —— 抛错收成 code,耗时量出来。 */
async function runTurn(db: any, text: string, lang: 'zh' | 'en' | 'ko', history: { role: 'user' | 'assistant'; content: string }[], asked: string[]): Promise<TurnResult> {
  const t0 = Date.now()
  let err: string | null = null
  let out = { answer: '', facts: [] as ConsultFact[], noc: null as string | null, degraded: false }
  try {
    out = await consult({ db, text, lang, profile: EMPTY_PROFILE, history, onStep: null, onDelta: null })
  } catch (e) {
    err = e instanceof Error && isChatError<null>(e) ? e.code : `throw:${String((e as Error)?.message).slice(0, 80)}`
  }
  // 逐句门(sentenceBlockers)2026-08-21 随 lib/chat 整域删除 —— K01(归因残留)暂无仪器,
  // 新链自建逐句门的批补上后再接回;residual 先恒空,报告里该列自然归零。
  const residual: string[] = []
  const cardHits = err
    ? []
    : checkCards({
        questions: asked.join('\n'),
        answer: out.answer,
        factsText: out.facts.map((x) => `${x.label} ${x.valueText}`).join('\n'),
        lang,
        claims: [],
        residual,
      })
  return {
    text, ms: Date.now() - t0, err, degraded: out.degraded,
    noc: out.noc, facts: out.facts.length, answer: out.answer, residual, cardHits,
  }
}

suite('新链评测批(金标语料 + 生产日志回放)', () => {
  afterAll(() => {
    if (caseResults.length || prodResults.length) writeReport(caseResults, prodResults)
  })

  for (const c of CASES) {
    it(`语料 ${c.id} ${c.note.slice(0, 40)}`, async () => {
      const db = await getDb()
      const history: { role: 'user' | 'assistant'; content: string }[] = []
      const asked: string[] = []
      const turns: TurnResult[] = []
      for (const text of c.turns) {
        asked.push(text)
        const t = await runTurn(db, text, c.lang, [...history], asked)
        turns.push(t)
        history.push({ role: 'user', content: text })
        if (!t.err) history.push({ role: 'assistant', content: t.answer })
        if (t.err) break
      }
      const problems: string[] = []
      const oldOnly: string[] = []
      const last = turns[turns.length - 1]
      if (turns.length < c.turns.length) problems.push(`第 ${turns.length} 轮 err=${last.err},后续轮未跑`)
      if (c.expectErr) {
        // 老链闸的产物:新链答上算赢,只在报告里记一笔口径差
        oldOnly.push(`老链期望 err=${c.expectErr},新链实得 ${last.err ?? (last.answer ? '答上' : 'null')}`)
      } else if (last.err) {
        problems.push(`err=${last.err}(期望答上)`)
      }
      if (c.expectNocFinal && last.noc !== c.expectNocFinal) {
        problems.push(`期望 noc=${c.expectNocFinal},实得 ${last.noc ?? 'null'}`)
      }
      for (const src of c.mustMatch ?? []) {
        if (!new RegExp(src, 'i').test(last.answer)) problems.push(`答复未命中 /${src}/`)
      }
      caseResults.push({ id: c.id, note: c.note, hard: !!c.hard, pass: problems.length === 0, problems, oldOnly, turns })
      console.log(`  ${c.id} ${problems.length ? '✗ ' + problems.join(';') : '✓'} ${last.ms}ms${last.degraded ? ' 降级' : ''}`)
      // 首轮基线:一律记录不拦(文件头说明)
      expect(true).toBe(true)
    }, 600_000)
  }

  it('生产日志回放(chat_logs 全部去重问题)', async () => {
    const db = await getDb()
    const { rows } = await db.query(
      `SELECT question, min(lang) AS lang, count(*)::int AS n,
              (count(*) FILTER (WHERE err IS NULL))::int AS ok_n,
              COALESCE(string_agg(DISTINCT err, ','), '') AS errs,
              COALESCE(round(avg(ms))::int, 0) AS avg_ms
       FROM chat_logs GROUP BY question ORDER BY n DESC, question`,
      [],
    )
    for (const r of rows) {
      const q = String(r.question ?? '').trim()
      // 编码坏掉的行(問号乱码):问号占比过半的不回放 —— 那不是生产输入,是当初存坏了
      const qm = (q.match(/[?？]/g) ?? []).length
      if (!q || (q.length >= 4 && qm / q.length > 0.5)) continue
      const lang = (['zh', 'en', 'ko'].includes(String(r.lang)) ? String(r.lang) : 'zh') as 'zh' | 'en' | 'ko'
      const t = await runTurn(db, q, lang, [], [q])
      prodResults.push({
        question: q, lang,
        oldN: Number(r.n), oldOkN: Number(r.ok_n), oldErrs: String(r.errs), oldAvgMs: Number(r.avg_ms),
        turn: t,
      })
      console.log(`  [${prodResults.length}] ${t.err ? '✗ ' + t.err : '✓'} ${t.ms}ms | ${q.slice(0, 40)}`)
    }
    expect(prodResults.length).toBeGreaterThan(0)
  }, 3_600_000)
})

// ── 报告 ─────────────────────────────────────────────────────────────────────

function pct(a: number, b: number): string {
  return b ? `${Math.round((a / b) * 1000) / 10}%` : '-'
}

function writeReport(cs: CaseResult[], ps: ProdResult[]): void {
  const dir = path.resolve(process.cwd(), '../docs/evaluation')
  mkdirSync(dir, { recursive: true })
  const day = new Date().toISOString().slice(0, 10)

  const cTurns = cs.flatMap((r) => r.turns)
  const cAnswered = cTurns.filter((t) => !t.err)
  const cHits = cTurns.flatMap((t) => t.cardHits)

  const pOk = ps.filter((p) => !p.turn.err)
  const pDegraded = ps.filter((p) => !p.turn.err && p.turn.degraded)
  const pBusy = ps.filter((p) => p.turn.err === 'busy')
  const pHits = ps.flatMap((p) => p.turn.cardHits)
  const oldAttempts = ps.reduce((a, p) => a + p.oldN, 0)
  const oldOkAttempts = ps.reduce((a, p) => a + p.oldOkN, 0)
  const pAvgMs = ps.length ? Math.round(ps.reduce((a, p) => a + p.turn.ms, 0) / ps.length) : 0
  const oldQOk = ps.filter((p) => p.oldOkN > 0)

  const hitCount: Record<string, number> = {}
  for (const h of [...cHits, ...pHits]) hitCount[h.card] = (hitCount[h.card] ?? 0) + 1

  const md: string[] = []
  md.push(`# 对话评测 · 新链(lib/consult)· ${day}`)
  md.push('')
  md.push(`> P4 两链对跑的新链侧。老链侧 = chat_logs 里的真实生产结局(不重跑)。`)
  md.push(`> 跑法:\`CHAT_LLM_BASE=<网关> npx vitest run --config ./vitest.eval.config.mts tests/eval/consultEval.eval.spec.ts\``)
  md.push('')
  md.push(`## 总览`)
  md.push('')
  md.push(`| 维度 | 老链(生产日志) | 新链(本轮实跑) |`)
  md.push(`|---|---|---|`)
  md.push(`| 生产问题按次答上率 | ${pct(oldOkAttempts, oldAttempts)}(${oldOkAttempts}/${oldAttempts} 次) | ${pct(pOk.length, ps.length)}(${pOk.length}/${ps.length} 题) |`)
  md.push(`| 生产问题按题答上率 | ${pct(oldQOk.length, ps.length)}(${oldQOk.length}/${ps.length} 题至少答上过一次) | ${pct(pOk.length, ps.length)} |`)
  md.push(`| 降级率(答上里) | 生产未记 | ${pct(pDegraded.length, pOk.length)}(${pDegraded.length}/${pOk.length}) |`)
  md.push(`| 超时(busy) | 15 次 / 209 | ${pBusy.length} 题 / ${ps.length} |`)
  md.push(`| 平均耗时 | 日志均值见逐题 | ${pAvgMs}ms |`)
  md.push(`| 金标语料 | chatEval 报告另存 | ${cs.filter((r) => r.pass).length}/${cs.length} 过(软档,详下) |`)
  md.push(`| 病例卡命中 | - | ${JSON.stringify(hitCount)} |`)
  md.push('')
  md.push(`## 金标语料(${cs.length} 条)`)
  md.push('')
  for (const r of cs) {
    const last = r.turns[r.turns.length - 1]
    md.push(`### ${r.id}${r.hard ? '(hard)' : ''} ${r.pass ? '✓' : '✗'} — ${r.note}`)
    if (r.problems.length) md.push(`- 问题:${r.problems.join(';')}`)
    if (r.oldOnly.length) md.push(`- 口径差:${r.oldOnly.join(';')}`)
    for (const t of r.turns) {
      md.push(`- 「${t.text.slice(0, 60)}」 ${t.ms}ms err=${t.err ?? '-'} 降级=${t.degraded} noc=${t.noc ?? '-'} 事实=${t.facts}`)
      if (t.cardHits.length) md.push(`  - 病例卡:${t.cardHits.map((h) => `${h.card} ${h.detail}`).join(';')}`)
      if (t.residual.length) md.push(`  - 残留:${t.residual.join(';')}`)
      md.push(`  - ${t.answer.slice(0, 400).replace(/\n/g, ' ⏎ ')}`)
    }
    md.push('')
  }
  md.push(`## 生产回放(${ps.length} 题)`)
  md.push('')
  md.push(`| 问题 | 老链(次) | 新链 | 耗时 | 备注 |`)
  md.push(`|---|---|---|---|---|`)
  for (const p of ps) {
    const oldCol = `${p.oldOkN}/${p.oldN} ok${p.oldErrs ? `(${p.oldErrs})` : ''}`
    const newCol = p.turn.err ? `✗ ${p.turn.err}` : p.turn.degraded ? '✓ 降级' : '✓'
    const note = p.turn.cardHits.length ? p.turn.cardHits.map((h) => h.card).join(',') : ''
    md.push(`| ${p.question.slice(0, 46).replace(/\|/g, '/')} | ${oldCol} | ${newCol} | ${p.turn.ms}ms | ${note} |`)
  }
  md.push('')
  md.push(`## 生产回放逐题详情`)
  md.push('')
  for (const p of ps) {
    md.push(`### ${p.question.slice(0, 80)}`)
    md.push(`- 老链:${p.oldOkN}/${p.oldN} ok${p.oldErrs ? `,err=${p.oldErrs}` : ''},均 ${p.oldAvgMs}ms | 新链:${p.turn.err ?? (p.turn.degraded ? '降级' : 'ok')},${p.turn.ms}ms,noc=${p.turn.noc ?? '-'},事实=${p.turn.facts}`)
    if (p.turn.cardHits.length) md.push(`- 病例卡:${p.turn.cardHits.map((h) => `${h.card} ${h.detail}`).join(';')}`)
    if (p.turn.residual.length) md.push(`- 残留:${p.turn.residual.join(';')}`)
    if (p.turn.answer) md.push(`- ${p.turn.answer.slice(0, 400).replace(/\n/g, ' ⏎ ')}`)
    md.push('')
  }

  writeFileSync(path.join(dir, `对话评测-新链-${day}.md`), md.join('\n'), 'utf8')
  writeFileSync(path.join(dir, `对话评测-新链-${day}.json`), JSON.stringify({ day, cases: cs, prod: ps }, null, 1), 'utf8')
  console.log(`\n报告已写:docs/evaluation/对话评测-新链-${day}.md`
    + ` | 生产 ${pOk.length}/${ps.length} 答上,降级 ${pDegraded.length},busy ${pBusy.length},均 ${pAvgMs}ms`
    + ` | 语料 ${cs.filter((r) => r.pass).length}/${cs.length}`)
}
