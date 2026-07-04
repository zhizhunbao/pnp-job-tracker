// AI 顾问代理:把前端请求转发到本地 Ollama,流式返回中文解读。
// 密钥/地址只在服务端;同一职位/公司只生成一次(内存缓存)。
// 职位描述基于抓取的真实 JD(.md)总结,不让模型凭空猜。
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { jobDescription } from '@/lib/jobDescription'
import { checkLimit, ipOf } from '@/lib/rateLimit'
import { streamChat, LlmError, type ChatMessage } from '@/lib/llm'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_ADVISOR_TRIES, PRO_ADVISOR_DAILY } from '@/lib/plan'
import { match, normalizeProfile, hasProfile, reasonEn, type MatchDims, type MatchJob } from '@/lib/match'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 进程内缓存(dev 下随热重载清空,够用;以后可换持久化)
const cache = new Map<string, string>()

// 匹配用维度(pnp/ee 清单)进程内缓存 1h —— 档案事实注入(E5-00)要按岗 join,不能每请求回表
let dimsCache: { at: number; dims: MatchDims } | null = null
async function loadMatchDims(): Promise<MatchDims> {
  if (dimsCache && Date.now() - dimsCache.at < 3600_000) return dimsCache.dims
  const payload = await getPayload({ config: await config })
  const [pnp, ee] = await Promise.all([
    payload.find({ collection: 'pnp-occupations', limit: 5000, depth: 0 }),
    payload.find({ collection: 'ee-categories', limit: 2000, depth: 0 }),
  ])
  const dims: MatchDims = {
    pnpOccupations: pnp.docs.map((r: any) => ({ province: r.province, label: r.label, type: r.type, noc: r.noc, url: r.url, fetched: r.fetched })),
    eeCategories: ee.docs.map((r: any) => ({ category: r.category, label: r.label, noc: r.noc, drawCrs: typeof r.drawCrs === 'number' ? r.drawCrs : null, drawDate: r.drawDate ?? '', url: r.url, fetched: r.fetched })),
  }
  dimsCache = { at: Date.now(), dims }
  return dims
}

// Pro 档案事实(E5-00 §3.5):自报档案 + 本岗匹配结论(与 UI 同一 match() 输出,数字一致)。
// grounded 契约不变:注进 facts 当事实用,问到档案没有的信息照样直说未提供。
function profileFacts(profileRaw: any, j: Job, dims: MatchDims): string {
  const p = normalizeProfile(profileRaw)
  if (!hasProfile(p)) return ''
  const mj: MatchJob = {
    noc: j.noc || '', teer: teerOf(j.noc), province: j.province || '', pnpEligible: !!j.pnpEligible,
    pnpStream: j.pnpStream || '', eeCategory: j.eeCategory || '', salaryAnnual: j.salaryAnnual ?? null, wageMedAnnual: j.wageMedAnnual ?? null,
  }
  const m = match(p, mj, dims)
  return [
    `\nUser immigration profile (self-reported): NOC ${p.nocCodes.join('/') || '—'}; CLB ${p.clb ?? '—'}; CRS ${p.crs ?? 'not reported'}; target provinces ${p.targetProvinces.join('/') || '—'}; PGWP months left ${p.pgwpMonthsLeft ?? '—'}.`,
    `Profile-match for THIS job: ${m.level} (score ${m.score}). Findings:`,
    ...m.reasons.map((r) => `- ${reasonEn(r)}`),
    'State list/draw comparisons factually; NEVER tell the user they can or cannot immigrate.',
  ].join('\n')
}

// JD 正文从 DB jobs.description 取(mart 灌入),不再扫 .md 文件;模型基于真实 JD 总结,不凭空猜。
async function loadJD(url?: string): Promise<string> {
  return (await jobDescription((url || '').trim())).slice(0, 2200) // 截断,控制 prompt 长度
}

type Lang = 'zh' | 'en' | 'ko'
const LANG_NAME: Record<Lang, string> = { zh: '简体中文', en: 'English', ko: '한국어' }
const SYSTEM = (lang: Lang) =>
  'You are an immigration-focused job advisor for international students / PGWP holders in Canada aiming for the employer-offer → PNP route. ' +
  `Reply in ${LANG_NAME[lang]}, objective and information-dense; no pleasantries, no disclaimers, no markdown code blocks. ` +
  'Use 【Heading】 brackets for each section with 2–3 sentences under each. Clearly mark uncertain content as speculation.'

type Job = {
  title?: string; company?: string; noc?: string; province?: string
  city?: string; district?: string; address?: string; officialUrl?: string; applyUrl?: string
  score?: number | null; category?: string; accessibility?: string
  pnpEligible?: boolean; pnpStream?: string; eeCategory?: string; aip?: boolean; salary?: string; salaryAnnual?: number | null
  wageMedHourly?: number | null; wageMedAnnual?: number | null
  source?: string; sourceLabel?: string; origin?: string
  datePosted?: string; lastSeen?: string; status?: string
}

const BROAD: Record<string, string> = {
  '0': '管理', '1': '商务', '2': 'IT', '3': '医疗', '4': '教育',
  '5': '文体', '6': '服务', '7': '技工', '8': '资源', '9': '制造',
}
const teerOf = (noc?: string) => (noc && noc.length === 5 && /\d/.test(noc[1]) ? Number(noc[1]) : null)
const catOf = (noc?: string) => {
  if (!noc || !/^\d/.test(noc)) return '未分类'
  if (noc[0] === '2' && /^21[345]/.test(noc)) return '工程'
  if (noc[0] === '7' && noc[1] === '3') return '运输'
  return BROAD[noc[0]] || '未分类'
}

// 评分明细(与 etl/08_score.py 的 score() 一致)——喂进 prompt 让模型用准确数字解释。
// +12 是「省具名通道命中」(NAMED_STREAM_NOCS_BY_PROV),用 pnpStream(非空=命中具名通道)作信号,
// 不是写死的低TEER集合(旧版那样会对不上库里分数)。
const TEER_BASE: Record<number, number> = { 0: 54, 1: 56, 2: 52, 3: 46, 4: 28, 5: 20 }
const INDEMAND2 = new Set(['21', '22', '31', '32', '72', '73', '42'])
const ACC_PTS: Record<string, number> = { 'co-op': 6, junior: 6, intermediate: 4, senior: 2, unknown: 3 }
const AGENCY_RE = /recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad/i
function scoreFacts(j: Job): string {
  const noc = j.noc || ''
  const teer = teerOf(noc)
  const base = teer == null ? 18 : (TEER_BASE[teer] ?? 18)
  const indemand = noc && INDEMAND2.has(noc.slice(0, 2)) ? 10 : 0
  const named = j.pnpStream ? 12 : 0
  const direct = AGENCY_RE.test(j.company || '') ? 0 : 12
  const acc = ACC_PTS[j.accessibility || 'unknown'] ?? 3
  const prov = j.province && j.province !== 'ON' ? -6 : 0
  const total = Math.max(0, Math.min(100, base + indemand + named + direct + acc + prov))
  return `Score breakdown — baseline(${teer == null ? 'unclassified' : 'TEER ' + teer}): ${base}; in-demand group: ${indemand}; named PNP stream: ${named}; direct employer: ${direct}; experience(${j.accessibility || 'unknown'}): ${acc}; province(${j.province || '—'}): ${prov}; total: ${total}${j.score != null && j.score !== total ? ` (stored ${j.score})` : ''}`
}
function jobFacts(j: Job): string {
  const t = teerOf(j.noc)
  return [
    `Title: ${j.title || '—'}`, `Company: ${j.company || '—'}`,
    `NOC: ${j.noc || '—'} (TEER ${t ?? '—'}, ${catOf(j.noc)})`,
    `Location: ${[j.district, j.city, j.province].filter(Boolean).join(', ') || '—'}`,
    `Score: ${j.score ?? '—'}/100; PNP-eligible: ${j.pnpEligible ? 'yes' : 'no'}; Federal EE category: ${j.eeCategory || 'none'}; AIP designated: ${j.aip ? 'yes' : 'no'}; experience: ${j.accessibility || '—'}`,
    `Salary: ${j.salary || '—'}${j.salaryAnnual != null ? ` (~$${Math.round(j.salaryAnnual / 1000)}K/yr)` : ''}`,
    j.wageMedAnnual != null ? `NOC local median: $${j.wageMedHourly}/hr (~$${Math.round(j.wageMedAnnual / 1000)}K/yr)` : '',
    `Source: ${j.sourceLabel || j.source || '—'} (origin ${j.origin || '—'}); posted ${(j.datePosted || '').slice(0, 10) || '—'}; last seen ${(j.lastSeen || '').slice(0, 10) || '—'}; status ${j.status || 'open'}`,
  ].filter(Boolean).join('\n')
}
// 各字段的解释要点(英文指令,输出按所选语言)
const ASK: Record<string, string> = {
  score: "Explain this job's immigration-value score: what it means and what drives it, using the exact numbers in the score breakdown.",
  pnp: 'Explain whether and why this job fits the employer-offer → PNP route, plus caveats (each province has its own occupation lists / language / wage rules; this is a rough signal, not a ruling; QC is separate).',
  ee: 'Explain Express Entry category-based selection: this is a FEDERAL pathway, SEPARATE from PNP — which category this job\'s NOC falls into and what that means (IRCC holds CRS-based draws prioritizing these categories; often no job offer needed). Make clear it differs from the provincial PNP route.',
  aip: 'Explain the AIP (Atlantic Immigration Program) designated-employer status and what it means; note it only applies to the four Atlantic provinces and is a rough name match.',
  noc: 'Explain the NOC code and its TEER level, and how NOC is used by PNP / Express Entry.',
  teer: 'Explain the TEER level and what it means for skilled-worker immigration.',
  broad: 'Explain this occupation major group and its immigration relevance.',
  mid: 'Explain this occupation sub-group.', fine: 'Explain this specific occupation (unit group).',
  salary: 'Explain the salary versus the local NOC median and what it means.',
  salaryYr: 'Explain the annualized salary versus the local NOC median.',
  wageMedHr: 'Explain the local NOC median hourly wage (ESDC data) and how this job compares.',
  wageMedYr: 'Explain the local NOC median annual wage and how this job compares.',
  vsMedian: "Explain how this job's pay compares to the local NOC median (the percentage) and what it means for the applicant.",
  accessibility: 'Explain the experience level and what it means for new grads / PGWP applicants.',
  country: 'Explain the location and the relevant provincial nominee pathway.',
  province: 'Explain the province and its PNP pathway.', city: 'Explain the city/location.',
  district: 'Explain the district/area (note Ottawa communities are part of the amalgamated city).', address: 'Explain the location.',
  source: 'Explain the data source and posting channel (first-party vs aggregated repost) and why it matters.',
  direct: 'Explain first-party vs aggregated repost and why it matters for PNP (avoid agencies).',
  origin: 'Explain the data channel (jobbank / ats / directory).',
  datePosted: 'Explain the posting date and its relevance (freshness, expiry).',
  lastSeen: 'Explain the last-seen time and what it indicates.',
  status: 'Explain the job status (open/closed) and how it is determined.',
}
// 简单字段:一句话即可,不要过度解读;其余(移民价值相关)走多段分析
const SIMPLE = new Set(['datePosted', 'lastSeen', 'closedAt', 'status', 'country', 'city', 'district', 'address', 'source', 'origin', 'direct', 'wageMedHr', 'wageMedYr'])

const HEADINGS: Record<Lang, { company: string; title: string }> = {
  zh: {
    company: '【公司是做什么的】【主要产品 / 项目】【主要竞品公司】【发展前景与对求职者的意义】',
    title: '【这个职位做什么】【需要哪些技能 / 背景】【怎么准备(简历 / 作品 / 面试)】',
  },
  en: {
    company: '【What the company does】【Main products / projects】【Main competitors】【Outlook & what it means for job-seekers】',
    title: '【What this role does】【Skills / background needed】【How to prepare (resume / portfolio / interview)】',
  },
  ko: {
    company: '【회사가 하는 일】【주요 제품 / 프로젝트】【주요 경쟁사】【전망과 구직자에게의 의미】',
    title: '【이 직무가 하는 일】【필요한 기술 / 배경】【준비 방법 (이력서 / 포트폴리오 / 면접)】',
  },
}

function buildPrompt(field: string, j: Job, jd: string, lang: Lang, pf = ''): string {
  const loc = j.address || [j.city, j.province].filter(Boolean).join(', ') || '—'
  const t = teerOf(j.noc)
  const nocLine = j.noc ? `NOC ${j.noc} (TEER ${t ?? '—'}, ${catOf(j.noc)})` : 'NOC not identified'
  const H = HEADINGS[lang]
  const inLang = `keep the 【】 brackets, write the content in ${LANG_NAME[lang]}`
  if (field === 'company') {
    return `Company: ${j.company || '—'}\nLocation: ${loc}\nWebsite: ${j.officialUrl || 'unknown'}\n\n` +
      `Based on what you know about this company, explain under these headings (${inLang}):\n${H.company}`
  }
  if (field !== 'title') {
    // 其它字段:把该岗事实(评分字段附明细)喂进去,模型只负责按所选语言解释,数字用我们给的
    const ask = ASK[field] || `Explain the "${field}" field for this job.`
    const facts = jobFacts(j) + (field === 'score' ? '\n' + scoreFacts(j) : '') + pf
    const reader = 'The reader is an international student / PGWP holder aiming for employer-offer → PNP in Canada.'
    if (SIMPLE.has(field)) {
      // 简单字段:一句话,不分段、不过度解读
      return `${ask}\n${reader}\n\nJob facts:\n${facts}\n\nAnswer in ONE concise sentence in ${LANG_NAME[lang]}. No headings, no preamble, no disclaimer. Use the exact numbers above.`
    }
    return `${ask}\n${reader}\n\nJob facts:\n${facts}\n\nWrite 2–3 short sections, each starting with a 【heading】, content in ${LANG_NAME[lang]}. Use the exact numbers above; do not invent data.`
  }
  const base = `Role: ${j.title || '—'}\nCompany: ${j.company || '—'}\n${nocLine}\nLocation: ${loc}\n`
  const instr = `Explain under these headings (${inLang}):\n${H.title}`
  if (jd) {
    return base + `\nHere is the real job posting (summarize strictly from it, do not invent anything not in it; it may be in English but answer in ${LANG_NAME[lang]}):\n"""\n${jd}\n"""\n\n` +
      instr + `\nFor "how to prepare" you may add general advice for this NOC.`
  }
  return base + `\n(No detailed posting was scraped; infer reasonably from the title and NOC.)\n\n` + instr
}

// 对话(下半):基于上半事实的多轮追问。system 始终带整条岗位事实 + grounding 铁律 —— 防止多轮放开后退回"编"。
type ChatMsg = { role: 'user' | 'assistant'; content: string }
function chatSystem(job: Job, jd: string, lang: Lang, pf = ''): string {
  const facts = jobFacts(job) + '\n' + scoreFacts(job) + pf + (jd ? `\n\nReal job posting excerpt:\n"""\n${jd}\n"""` : '')
  return SYSTEM(lang) +
    '\n\nYou are answering follow-up questions about ONE specific job. These verified facts are your ONLY source of truth:\n' + facts +
    `\n\nGround every answer ONLY in these facts and the conversation so far. If the user asks about something the facts do not cover, say plainly in ${LANG_NAME[lang]} that you do not have that data — do NOT invent, guess, or use outside knowledge. Answer concisely; 【headings】 are optional for chat replies. Always tie the answer back to what it means for the reader's job/immigration decision.`
}

export async function POST(req: NextRequest) {
  let body: { field?: string; id?: string; job?: Job; lang?: string; messages?: ChatMsg[] }
  try { body = await req.json() } catch { return new Response('bad json', { status: 400 }) }
  const field = body.field || 'title'
  const lang: Lang = body.lang === 'en' ? 'en' : body.lang === 'ko' ? 'ko' : 'zh'
  const job = body.job || {}
  // 下半对话:带 messages[](user/assistant 交替)→ 多轮 grounded chat;否则一次性初判
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m): m is ChatMsg => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
  const isChat = messages.length > 0

  // 分层 gate(E3-05,一律服务端):免费登录用户 = 每日试用次数,超 → 402(前端渲升级卡);
  // 试用计「功能使用次数」,缓存命中也算 —— 付费卖的是功能不是 token。
  const user = await getUser(req.headers)
  const pro = isPro(user)
  if (user && !pro && !checkLimit([[`adv:u:${user.id}`, FREE_ADVISOR_TRIES]])) {
    return new Response('upgrade required', { status: 402 })
  }

  // Pro 档案感知(E5-00):自报档案 + 本岗匹配结论注入 facts;个性化内容缓存按人隔离
  const pf = pro && user ? profileFacts((user as any).profile, job, await loadMatchDims()) : ''

  // 缓存键含 字段+标识+语言(公司按公司名,其余按 id);带档案的初判按人隔离;对话不缓存(每轮唯一)
  const keyId = field === 'company' ? (job.company || '').toLowerCase() : (body.id || job.title || '')
  const key = `${field}:${keyId}:${lang}${pf ? `:p${user!.id}` : ''}`

  if (!isChat) {
    const cached = cache.get(key)
    if (cached) return new Response(cached, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'hit' } })
  }

  // 成本限流(真调 LLM 才计,放缓存之后):全局日上限兜底;Pro 个人日限(防滥用);未登录沿用 IP 限(E2-02)
  const quotas: [string, number][] = [['adv:__global__', Number(process.env.ADVISOR_DAILY_CAP || 1000)]]
  if (pro && user) quotas.push([`adv:pro:${user.id}`, PRO_ADVISOR_DAILY])
  if (!user) quotas.push([`adv:${ipOf(req)}`, Number(process.env.ADVISOR_IP_DAILY || 40)])
  if (!checkLimit(quotas)) return new Response('rate limited', { status: 429 })

  // 职位/对话:读取抓到的真实 JD 作 grounding(基于它总结,不凭空猜);公司初判暂无正文,靠模型知识
  const jd = (field === 'title' || isChat) ? await loadJD(job.applyUrl) : ''

  const ollamaMessages = isChat
    ? [{ role: 'system', content: chatSystem(job, jd, lang, pf) }, ...messages]
    : [{ role: 'system', content: SYSTEM(lang) }, { role: 'user', content: buildPrompt(field, job, jd, lang, pf) }]
  const numPredict = isChat ? 500 : (SIMPLE.has(field) ? 120 : (field === 'company' ? 480 : 420))

  // provider 抽象(E2-03):ollama(本地 dev)/anthropic(线上 Haiku),见 lib/llm.ts
  let upstream: ReadableStream<Uint8Array>
  try {
    upstream = await streamChat(ollamaMessages as ChatMessage[], { maxTokens: numPredict })
  } catch (e) {
    return new Response(e instanceof LlmError ? e.message : '大模型不可用。', { status: 502 })
  }

  // 透传文本增量,顺便累积进缓存(初判才缓存,对话每轮唯一)
  const dec = new TextDecoder()
  let full = ''
  const stream = upstream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) { full += dec.decode(chunk, { stream: true }); controller.enqueue(chunk) },
    flush() { if (!isChat && full.trim()) cache.set(key, full) },
  }))

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'miss', 'X-JD': jd ? 'yes' : 'no' } })
}
