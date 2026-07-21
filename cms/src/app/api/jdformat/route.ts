/**
 * POST /api/jdformat {url} — JD 五节整理版懒生成(J2,2026-07-19 Frank 批)。
 * 命中 jobs.jd_formatted 直接回;缺则调朋友模型(friendChat)按五节标记整理 → 校验 → 存列=永久缓存。
 * 顺带补字段:同一次输出捎带 [TERM]/[WORKHOURS],岗位缺 employment_term/hours 时就地补上(622 缺失岗兜底)。
 * 红线:只搬运不发挥——输出里的多位数字必须在原文出现,否则整条拒收;原文永不覆盖;掉线/超时静默 204。
 */
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { friendChat, friendLlmReady } from '@/lib/friendLlm'
import { jobDescription, scrubPii } from '@/lib/jobDescription'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const JD_MARKS = ['ROLE', 'REQS', 'PAY', 'WORKHOURS', 'APPLY'] as const
const TERM_ENUM = new Set(['permanent', 'term', 'casual', 'seasonal'])
const HOURS_ENUM = new Set(['full', 'part'])

const PROMPT_HEAD = `You are reorganizing a job posting into fixed sections. STRICT RULES:
- Only move and lightly condense sentences from the posting. NEVER invent facts, numbers, requirements or benefits not present in it.
- Output plain text with EXACTLY these section markers, each on its own line: [ROLE] [REQS] [PAY] [WORKHOURS] [APPLY]
- Under [ROLE]: 1-2 sentences, what the job does. Under [REQS]: bullet lines starting with "- ", hard requirements only.
- Under [PAY]: bullet lines for pay and benefits. Under [WORKHOURS]: bullet lines for schedule, employment type, location type.
- Under [APPLY]: 1 line how to apply. If the posting says nothing for a section, write exactly: (not stated)
- Keep the posting's original language. No markdown besides "- " bullets. No section other than the five.
- Finally, on two extra lines output: [TERM]=permanent|term|casual|seasonal|unknown and [HRS]=full|part|unknown (from the posting).
Posting follows:
`

// 校验:五节标记齐 + 输出多位数字必须来自原文(防幻觉)+ 长度合理
function validate(out: string, src: string): boolean {
  for (const m of JD_MARKS) if (!out.includes(`[${m}]`)) return false
  if (out.length < 60 || out.length > Math.max(2000, src.length * 1.5)) return false
  const srcDigits = new Set((src.match(/\d{2,}/g) || []))
  for (const d of out.replace(/\[(TERM|HRS)\]=[^\n]*/g, '').match(/\d{2,}/g) || []) {
    if (!srcDigits.has(d)) return false
  }
  return true
}

// 同岗并发去重:同一 apply_url 的生成只跑一份,后到者等同一个 Promise
const inflight = new Map<string, Promise<string | null>>()

// #123d:朋友 API prompt 硬上限 6000 字符(FastAPI 实测回「prompt too long (max 6000 chars)」)——
// 原截 12000 对长帖必 400(JB 直发帖 2-4k 从没撞过,#123 懒抓原站 11k+ 一来就撞,整理版永远生成不了)。
// 正文预算=上限-提示头;超长帖截前段,尾部缺节由 (not stated)+前端帖面薪资/官方原帖链兜底(#123c)。
const PROMPT_BUDGET = 6000 - PROMPT_HEAD.length - 20

async function generate(pool: any, row: { id: number; description: string; employment_term: string | null; employment_hours: string | null }, url: string): Promise<string | null> {
  const src = row.description
  const r = await friendChat({ prompt: PROMPT_HEAD + src.slice(0, PROMPT_BUDGET), timeoutMs: 90_000 })
  if (!r) return null
  let out = r.answer
  // 抽尾部字段行再从正文剥掉
  const term = out.match(/\[TERM\]=\s*(\w+)/)?.[1]?.toLowerCase()
  const hrs = out.match(/\[HRS\]=\s*(\w+)/)?.[1]?.toLowerCase()
  out = out.replace(/\[(TERM|HRS)\]=[^\n]*/g, '').trim()
  if (!validate(out, src)) return null
  out = scrubPii(out)
  await pool.query('UPDATE jobs SET jd_formatted = $1, jd_formatted_at = now() WHERE id = $2', [out, row.id])
  // 顺带补缺失的职位类型字段(只补空,不覆盖官方标注)
  if (term && TERM_ENUM.has(term) && !row.employment_term) {
    await pool.query('UPDATE jobs SET employment_term = $1 WHERE id = $2 AND (employment_term IS NULL OR employment_term = \'\')', [term, row.id])
  }
  if (hrs && HOURS_ENUM.has(hrs) && !row.employment_hours) {
    await pool.query('UPDATE jobs SET employment_hours = $1 WHERE id = $2 AND (employment_hours IS NULL OR employment_hours = \'\')', [hrs, row.id])
  }
  return out
}

export async function POST(req: NextRequest) {
  if (!friendLlmReady()) return new Response(null, { status: 204 })
  let url = ''
  try { url = String((await req.json())?.url || '').trim() } catch { /* fallthrough */ }
  if (!url) return new Response('', { status: 400 })
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  // #139(Frank「有的 job details 太长 AI 整理会失败」根因):原先这里 SQL 硬要 description IS NOT NULL,
  // 但打开职位时 jobtext(懒抓,几秒)与本端点是**并发**的——懒抓帖第一次打开时这里读到的还是 NULL → 204,
  // 整理版永远不生成。而懒抓帖正是长帖(原站正文 8-11k,JB 直发帖只有 2-4k),于是表现为「长的会失败」。
  // 修:改走 jobDescription 同一入口(内含懒抓;lazyFetchJd 有单飞,与并发的 jobtext 共用一次抓取不重复打原站)。
  const { rows } = await pool.query(
    'SELECT id, employment_term, employment_hours, jd_formatted FROM jobs WHERE apply_url = $1 LIMIT 1', [url])
  const row = rows[0]
  if (!row) return new Response(null, { status: 204 })
  if (row.jd_formatted) return new Response(row.jd_formatted, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  row.description = await jobDescription(url)
  if (!row.description) return new Response(null, { status: 204 })   // 真没正文(抓不到)→ 静默,前端空态照旧
  // 生成走 IP 日限(缓存命中不计;生成在朋友盒子上跑,别被刷)
  if (!checkLimit([[`jdf:${ipOf(req)}`, Number(process.env.JDFORMAT_IP_DAILY || 40)]])) return new Response(null, { status: 204 })
  let p = inflight.get(url)
  if (!p) {
    p = generate(pool, row, url).finally(() => inflight.delete(url))
    inflight.set(url, p)
  }
  const out = await p
  if (!out) return new Response(null, { status: 204 })
  return new Response(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
