/**
 * advisor 域评测批 —— 新链(lib/advisor,pi 循环)× 老链(api/advisor,streamChat)对拍。
 * 质量关(设计文档「五」):探针全绿 + Frank 抽读三语各 2 篇点头,才切换、才删老 route。
 *
 * 语料 = 生产库现查的真岗(最近在招,含一个海洋省岗若有):
 *   新链:场景网格(初判/评分/薪资/职业速读/省速读/市速读/帖速读/公司速读/公司初判)× zh/en/ko;
 *   老链:初判(title)三语对拍 —— Frank 抽读的六篇并排放报告里。
 * 三类探针(20 轮措辞红线断言化,#46/#50/#126/#133/#161/#162/#167):
 *   ① 禁令:X/5 与 0-100 总分、繁体字(zh)、资格判定/死胡同措辞、无中位时编造中位数;
 *   ② 形状:分段【标题】、结尾 ❓ 建议行(短、单问、无尾巴)、简单场景不分段;
 *   ③ 接地:答案里的 $ 金额必须能在喂进去的事实块里找到。
 * 探针一律**记录不拦**(首轮基线,报告里红绿说话);报告落 docs/evaluation/。
 * 两链都走真 HTTP handler(闸/缓存/流全链);匿名闸用逐请求换 X-Forwarded-For 绕开
 * (评测自己的免费池,不是生产旁路)。串行单文件,别打爆朋友的服务与生产池。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { afterAll, describe, expect, it } from 'vitest'

import { getDb } from '@/lib/db/server'
import { advisorRoute } from '@/lib/advisor/server'
import { toAdvisorJob, provFactsOf, cityFactsOf, promptOf, type AdvisorJob } from '@/lib/advisor'
import { normalizeProfile } from '@/lib/jobs'
import type { JobRow } from '@/lib/jobs'
import { fetchJobById, jobDescription, loadCityCard, loadProvinceCard } from '@/lib/jobs/server'
import { loadNocDuties } from '@/lib/noc/server'
import { POST as oldAdvisorPost } from '@/app/api/advisor/route'

const LIVE = Boolean(process.env.DATABASE_URI) && Boolean(process.env.CHAT_LLM_BASE || process.env.TRANSLATE_API_BASE)
const suite = LIVE ? describe : describe.skip

type Lang = 'zh' | 'en' | 'ko'
const LANGS: Lang[] = ['zh', 'en', 'ko']
// 新链全网格的场景(chat 休眠场景另用一条冒烟);老链只对拍 title(Frank 抽读的六篇)
const FIELDS = ['title', 'score', 'salary', 'occRead', 'provRead', 'cityRead', 'jdRead', 'coRead', 'company']

type Probe = { kind: string; detail: string }
type GenResult = {
  chain: 'new' | 'old'; field: string; lang: Lang; jobId: string; title: string
  status: number; ms: number; text: string; probes: Probe[]
}
const results: GenResult[] = []
let ipSeq = 0

/** 逐请求换 IP 绕匿名池(评测自己的闸);两链同一手法。 */
function nextIp(): string {
  ipSeq += 1
  return `10.99.${Math.floor(ipSeq / 250)}.${(ipSeq % 250) + 1}`
}

async function callNew(body: Record<string, unknown>): Promise<{ status: number; text: string; ms: number }> {
  const t0 = Date.now()
  const req = new Request('http://local/api/advisor', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': nextIp() },
    body: JSON.stringify(body),
  })
  const res = await advisorRoute(req)
  let text = ''
  try { text = await res.text() } catch (e) { text = `<<stream error: ${String((e as Error)?.message).slice(0, 120)}>>` }
  return { status: res.status, text, ms: Date.now() - t0 }
}

async function callOld(body: Record<string, unknown>): Promise<{ status: number; text: string; ms: number }> {
  const t0 = Date.now()
  const req = new NextRequest('http://local/api/advisor', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': nextIp() },
    body: JSON.stringify(body),
  })
  const res = await oldAdvisorPost(req)
  let text = ''
  try { text = await res.text() } catch (e) { text = `<<stream error: ${String((e as Error)?.message).slice(0, 120)}>>` }
  return { status: res.status, text, ms: Date.now() - t0 }
}

// ── 探针(记录不拦)────────────────────────────────────────────────────────
const TRAD_RE = /[聯優勢證據國際實務歷經濟臺灣後來時間問題點擊處體驗學藝術醫護資訊為]/
const GRADE_RE = /\b[0-9]\s*\/\s*5\b|X out of 5|[0-9]{1,3}\s*\/\s*100|0-100/i
const VERDICT_RE = /dead end|not viable|impossible to immigrate|无法(作为|成为).{0,12}(通道|途径)|(此路|该路径|这条路).{0,6}(不通|死胡同)|不具备移民资格|cannot immigrate/i
const MONEY_RE = /\$\s?\d[\d,]*(?:\.\d+)?\s*K?/g
const SIMPLE_SET = new Set(['datePosted', 'lastSeen', 'status', 'country', 'city', 'district', 'address', 'source', 'origin', 'direct', 'wageMedHr', 'wageMedYr'])

function probeText(input: { field: string; lang: Lang; text: string; facts: string; hasMedian: boolean }): Probe[] {
  const { field, lang, text, facts, hasMedian } = input
  const out: Probe[] = []
  if (text.length < 40) { out.push({ kind: 'shape/太短', detail: `len=${text.length}` }); return out }
  if (GRADE_RE.test(text)) out.push({ kind: '禁令/数字档', detail: (text.match(GRADE_RE) ?? [''])[0] })
  if (lang === 'zh' && TRAD_RE.test(text)) out.push({ kind: '禁令/繁体', detail: (text.match(TRAD_RE) ?? [''])[0] })
  if (VERDICT_RE.test(text)) out.push({ kind: '禁令/资格判定', detail: (text.match(VERDICT_RE) ?? [''])[0] })
  const heads = (text.match(/【[^】]{1,40}】/g) ?? []).length
  if (SIMPLE_SET.has(field)) {
    if (heads > 0) out.push({ kind: 'shape/简单场景分段', detail: `${heads} 个标题` })
  } else if (heads < 2) {
    out.push({ kind: 'shape/缺分段', detail: `${heads} 个标题` })
  }
  const qi = text.lastIndexOf('❓')
  if (qi < 0) {
    out.push({ kind: 'shape/缺建议行', detail: '无 ❓' })
  } else {
    const tail = text.slice(qi + 1).trim()
    if (tail.length > 80) out.push({ kind: 'shape/建议行超长', detail: `${tail.length} 字` })
    if (tail.includes('\n')) out.push({ kind: 'shape/建议行后有尾巴', detail: tail.slice(0, 40) })
  }
  // 接地:答案里的 $ 金额要能在事实块找到 —— 数值化比对:facts 里的 "$34K" 展开成
  // 34000,答案 "$34,000" 归一后按 ±2% 容差找(年化/中位换算的舍入差放行);
  // 找不到的(如模型自算的差值 $1,000)照报,人工复核减法是否合法。
  const factNums = new Set<number>()
  for (const f of facts.replace(/,/g, '').match(/\$?\d+(?:\.\d+)?K?/gi) ?? []) {
    const k = /K$/i.test(f)
    const n = Number(f.replace(/^\$/, '').replace(/K$/i, ''))
    if (Number.isFinite(n)) factNums.add(k ? n * 1000 : n)
  }
  for (const m of text.match(MONEY_RE) ?? []) {
    const norm = m.replace(/[\s,$]/g, '')
    const k = /K$/i.test(norm)
    const v0 = Number(norm.replace(/K$/i, ''))
    const v = k ? v0 * 1000 : v0
    if (Number.isFinite(v) === false) continue
    let hit = false
    for (const fn of factNums) {
      if (fn === v || (fn > 0 && Math.abs(fn - v) / fn <= 0.02)) { hit = true; break }
    }
    if (!hit) out.push({ kind: '接地/金额无出处', detail: m })
  }
  if (hasMedian === false && field === 'salary' && /median|中位|중앙값/i.test(text) && (text.match(MONEY_RE) ?? []).length > 1) {
    out.push({ kind: '禁令/疑似编中位', detail: '无中位喂入但答案多处金额' })
  }
  return out
}

// ── 语料:生产库现查真岗 ─────────────────────────────────────────────────
type Picked = { id: string; row: JobRow; job: AdvisorJob }

async function pickJobs(): Promise<Picked[]> {
  const db = await getDb()
  const { rows } = await db.query(
    `SELECT id, province FROM jobs WHERE status IS DISTINCT FROM 'closed' AND noc <> '' ORDER BY id DESC LIMIT 60`, [],
  )
  const ids: number[] = []
  const atl = rows.find((r: { province: string }) => ['NL', 'PE', 'NS', 'NB'].includes(String(r.province)))
  if (atl) ids.push(Number(atl.id))
  for (const r of rows) {
    if (ids.length >= 2) break
    if (Number(r.id) !== ids[0]) ids.push(Number(r.id))
  }
  const out: Picked[] = []
  for (const id of ids) {
    const row = await fetchJobById({
      db, id, pro: true, profile: normalizeProfile(null), profileOk: false,
      matchDims: { pnpOccupations: [], eeCategories: [] },
    })
    if (row) out.push({ id: String(id), row, job: toAdvisorJob(row) })
  }
  return out
}

/** 场景 → 请求体(新链 id 制;provRead/cityRead 的 id 用老前端同款拼法)。 */
function bodyOf(field: string, p: Picked, lang: Lang): Record<string, unknown> {
  if (field === 'occRead') return { field, id: p.job.noc ?? '', lang }
  if (field === 'provRead') return { field, id: p.job.province ?? '', lang }
  if (field === 'cityRead') return { field, id: [p.job.city ?? '', p.job.province ?? '', ''].join('|'), lang }
  return { field, id: p.id, lang }
}

/** 老链请求体:job 整包照老前端(row 即 JobRow,老 Job 形状同名字段的超集)。 */
async function oldBodyOf(field: string, p: Picked, lang: Lang): Promise<Record<string, unknown>> {
  const db = await getDb()
  if (field === 'occRead') {
    const d = await loadNocDuties({ db, noc: p.job.noc ?? '' })
    return { field, id: p.job.noc ?? '', lang, job: { noc: p.job.noc, duties: d?.duties, requirements: d?.requirements } }
  }
  if (field === 'provRead') {
    const code = (p.job.province ?? '').toUpperCase()
    const card = await loadProvinceCard({ db, code })
    const facts = card ? provFactsOf({ code, card }) : ''
    return { field, id: code, lang, job: { province: code, locationFacts: facts } }
  }
  if (field === 'cityRead') {
    const city = p.job.city ?? ''
    const prov = (p.job.province ?? '').toUpperCase()
    const card = await loadCityCard({ db, city, prov, district: '' })
    return { field, id: [city, prov, ''].join('|'), lang, job: { province: prov, locationFacts: cityFactsOf({ city, prov, district: '', card }) } }
  }
  return { field, id: p.id, lang, job: p.row }
}

/** 探针接地用的事实底料(该场景喂进模型的数字来源;带 JD 场景连原文一起 ——
 * 首轮误报教训:签约奖金 $750/里程 $0.45 都写在 JD 里,底料不带 JD 全成「无出处」)。 */
async function factsOf(field: string, p: Picked, lang: Lang): Promise<string> {
  const db = await getDb()
  if (field === 'provRead') {
    const code = (p.job.province ?? '').toUpperCase()
    const card = await loadProvinceCard({ db, code })
    return card ? provFactsOf({ code, card }) : ''
  }
  if (field === 'cityRead') {
    const city = p.job.city ?? ''
    const prov = (p.job.province ?? '').toUpperCase()
    const card = await loadCityCard({ db, city, prov, district: '' })
    return cityFactsOf({ city, prov, district: '', card })
  }
  let jd = ''
  if (field === 'title' || field === 'jdRead') {
    jd = (await jobDescription({ db, applyUrl: (p.job.applyUrl ?? '').trim() })).slice(0, 2200)
  }
  // 岗位场景:直接用新链的提示词整文当底料(含 jobFacts 的全部数字)
  return promptOf({ field, job: p.job, jd, lang, pf: '', web: null })
}

suite('advisor 评测批(新链网格 + 老链初判对拍)', () => {
  let picked: Picked[] = []

  afterAll(() => {
    if (results.length) writeReport(results)
  })

  it('语料:生产库取 2 个真岗', async () => {
    picked = await pickJobs()
    console.log(`  岗:${picked.map((p) => `#${p.id} ${p.row.title}(${p.row.province})`).join(' | ')}`)
    expect(picked.length).toBeGreaterThan(0)
  }, 120_000)

  for (const field of FIELDS) {
    it(`新链 ${field} × 三语 × 2 岗`, async () => {
      for (const p of picked) {
        for (const lang of LANGS) {
          const r = await callNew(bodyOf(field, p, lang))
          const facts = await factsOf(field, p, lang)
          const probes = r.status === 200
            ? probeText({ field, lang, text: r.text, facts, hasMedian: p.job.wageMedAnnual != null })
            : [{ kind: `http/${r.status}`, detail: r.text.slice(0, 120) }]
          results.push({ chain: 'new', field, lang, jobId: p.id, title: p.row.title, status: r.status, ms: r.ms, text: r.text, probes })
          console.log(`  new ${field}/${lang}/#${p.id} ${r.status} ${r.ms}ms ${probes.length ? '✗ ' + probes.map((x) => x.kind).join(',') : '✓'}`)
        }
      }
      expect(true).toBe(true)
    }, 1_800_000)
  }

  it('老链 title 三语对拍(Frank 抽读的六篇)', async () => {
    for (const p of picked) {
      for (const lang of LANGS) {
        const r = await callOld(await oldBodyOf('title', p, lang))
        const facts = await factsOf('title', p, lang)
        const probes = r.status === 200
          ? probeText({ field: 'title', lang, text: r.text, facts, hasMedian: p.job.wageMedAnnual != null })
          : [{ kind: `http/${r.status}`, detail: r.text.slice(0, 120) }]
        results.push({ chain: 'old', field: 'title', lang, jobId: p.id, title: p.row.title, status: r.status, ms: r.ms, text: r.text, probes })
        console.log(`  old title/${lang}/#${p.id} ${r.status} ${r.ms}ms ${probes.length ? '✗ ' + probes.map((x) => x.kind).join(',') : '✓'}`)
      }
    }
    expect(true).toBe(true)
  }, 1_800_000)

  it('新链 chat 冒烟(休眠场景不失守)', async () => {
    const p = picked[0]
    const r = await callNew({ field: 'title', id: p.id, lang: 'zh', messages: [{ role: 'user', content: '这个岗对 PGWP 快到期的人合适吗?' }] })
    results.push({ chain: 'new', field: 'chat', lang: 'zh', jobId: p.id, title: p.row.title, status: r.status, ms: r.ms, text: r.text, probes: r.status === 200 && r.text.length > 20 ? [] : [{ kind: `http/${r.status}`, detail: r.text.slice(0, 120) }] })
    console.log(`  new chat/zh/#${p.id} ${r.status} ${r.ms}ms len=${r.text.length}`)
    expect(true).toBe(true)
  }, 300_000)
})

// ── 报告 ─────────────────────────────────────────────────────────────────────

function writeReport(rs: GenResult[]): void {
  const dir = path.resolve(process.cwd(), '../docs/evaluation')
  mkdirSync(dir, { recursive: true })
  const day = new Date().toISOString().slice(0, 10)
  const news = rs.filter((r) => r.chain === 'new')
  const olds = rs.filter((r) => r.chain === 'old')
  const green = news.filter((r) => r.probes.length === 0)
  const kinds: Record<string, number> = {}
  for (const r of rs) for (const pr of r.probes) kinds[pr.kind] = (kinds[pr.kind] ?? 0) + 1

  const md: string[] = []
  md.push(`# advisor 评测 · 新链(lib/advisor · pi)× 老链(api/advisor)· ${day}`)
  md.push('')
  md.push(`> 质量关:探针全绿 + Frank 抽读「初判对拍」三语各 2 篇点头 → 切换壳 → 观察一轮 → 删老 route。`)
  md.push(`> 跑法:\`npx vitest run --config ./vitest.eval.config.mts tests/eval/advisorEval.eval.spec.ts\``)
  md.push('')
  md.push(`## 总览`)
  md.push('')
  md.push(`| 维度 | 值 |`)
  md.push(`|---|---|`)
  md.push(`| 新链探针绿 | ${green.length}/${news.length} |`)
  md.push(`| 新链平均耗时 | ${news.length ? Math.round(news.reduce((a, r) => a + r.ms, 0) / news.length) : 0}ms |`)
  md.push(`| 老链平均耗时(title) | ${olds.length ? Math.round(olds.reduce((a, r) => a + r.ms, 0) / olds.length) : 0}ms |`)
  md.push(`| 探针命中分布 | ${JSON.stringify(kinds)} |`)
  md.push('')
  md.push(`## 初判对拍(Frank 抽读区:同岗同语,老链在前新链在后)`)
  md.push('')
  for (const o of olds) {
    const n = news.find((r) => r.field === 'title' && r.lang === o.lang && r.jobId === o.jobId)
    md.push(`### #${o.jobId} ${o.title} · ${o.lang}`)
    md.push('')
    md.push(`**老链**(${o.ms}ms${o.probes.length ? ',探针:' + o.probes.map((x) => x.kind).join(',') : ''}):`)
    md.push('')
    md.push('```')
    md.push(o.text)
    md.push('```')
    md.push('')
    if (n) {
      md.push(`**新链**(${n.ms}ms${n.probes.length ? ',探针:' + n.probes.map((x) => x.kind).join(',') : ''}):`)
      md.push('')
      md.push('```')
      md.push(n.text)
      md.push('```')
      md.push('')
    }
  }
  md.push(`## 新链全网格逐条`)
  md.push('')
  md.push(`| 场景 | 语 | 岗 | 状态 | 耗时 | 探针 |`)
  md.push(`|---|---|---|---|---|---|`)
  for (const r of news) {
    md.push(`| ${r.field} | ${r.lang} | #${r.jobId} | ${r.status} | ${r.ms}ms | ${r.probes.length ? r.probes.map((x) => `${x.kind}(${x.detail.slice(0, 24)})`).join(';') : '✓'} |`)
  }
  md.push('')
  md.push(`## 探针命中详情(非绿逐条)`)
  md.push('')
  for (const r of rs.filter((x) => x.probes.length)) {
    md.push(`### ${r.chain} ${r.field}/${r.lang}/#${r.jobId}`)
    for (const pr of r.probes) md.push(`- ${pr.kind}:${pr.detail}`)
    md.push(`- 摘录:${r.text.slice(0, 300).replace(/\n/g, ' ⏎ ')}`)
    md.push('')
  }

  writeFileSync(path.join(dir, `advisor评测-${day}.md`), md.join('\n'), 'utf8')
  writeFileSync(path.join(dir, `advisor评测-${day}.json`), JSON.stringify({ day, results: rs }, null, 1), 'utf8')
  console.log(`\n报告已写:docs/evaluation/advisor评测-${day}.md | 新链绿 ${green.length}/${news.length} | 探针分布 ${JSON.stringify(kinds)}`)
}
