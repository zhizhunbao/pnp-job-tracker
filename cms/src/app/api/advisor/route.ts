// AI 顾问代理:把前端请求转发到本地 Ollama,流式返回中文解读。
// 密钥/地址只在服务端;同一职位/公司只生成一次(内存缓存)。
// 职位描述基于抓取的真实 JD(.md)总结,不让模型凭空猜。
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b'
const DATA_ROOT = path.resolve(process.cwd(), '..', 'data')

// 进程内缓存(dev 下随热重载清空,够用;以后可换持久化)
const cache = new Map<string, string>()

// url → .md 路径索引(懒加载一次)。两类详情:Job Bank + 各公司 ATS 岗位
let jdIndex: Map<string, string> | null = null
function buildJdIndex(): Map<string, string> {
  const idx = new Map<string, string>()
  // 递归收集所有 .md(Job Bank 详情是平铺;公司岗位较深:companies/<region>/<slug>/jobs/*.md)
  const walk = (dir: string) => {
    let entries: fs.Dirent[] = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.md')) registerMd(idx, p)
    }
  }
  walk(path.join(DATA_ROOT, 'raw', 'ontario', 'ottawa', 'jobbank', 'details'))
  walk(path.join(DATA_ROOT, 'processed', 'ontario', 'ottawa', 'kanata-north', 'companies'))
  return idx
}
function registerMd(idx: Map<string, string>, file: string) {
  try {
    const head = fs.readFileSync(file, 'utf8').slice(0, 600)
    const m = head.match(/^url:\s*(.+)$/m)
    if (m) idx.set(m[1].trim(), file)
  } catch { /* ignore */ }
}
function readJD(file?: string): string | null {
  if (!file) return null // url 不在索引里
  try {
    const raw = fs.readFileSync(file, 'utf8')
    return raw.replace(/^---[\s\S]*?\n---\s*/m, '').trim().slice(0, 2200) // 去 frontmatter + 截断
  } catch { return null } // 文件已被改名/移动 → 索引过期
}
// 读出某 url 对应 JD 正文。索引未命中或文件已移动时,重建索引重试一次
// (重抓后 .md 会改名/新增,不必重启服务)。
function loadJD(url?: string): string {
  if (!url) return ''
  const u = url.trim()
  if (!jdIndex) jdIndex = buildJdIndex()
  let body = readJD(jdIndex.get(u))
  if (body === null) {
    jdIndex = buildJdIndex()
    body = readJD(jdIndex.get(u))
  }
  return body ?? ''
}

const SYSTEM =
  '你是加拿大移民求职顾问,服务对象是想走「雇主 offer → 省提名(PNP)」路线的留学生 / PGWP 求职者。' +
  '用简体中文,客观专业、信息密度高,不要客套话、不要免责声明、不要 markdown 代码块。' +
  '每个小标题用「【标题】」格式,标题下 2–3 句话。不确定的内容明确标注是推测。'

type Job = {
  title?: string; company?: string; noc?: string; province?: string
  city?: string; address?: string; officialUrl?: string; applyUrl?: string
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

function buildPrompt(field: string, j: Job, jd: string): string {
  const loc = j.address || [j.city, j.province].filter(Boolean).join(', ') || '—'
  const t = teerOf(j.noc)
  const nocLine = j.noc ? `NOC ${j.noc}(TEER ${t ?? '—'},${catOf(j.noc)})` : '未识别 NOC'
  if (field === 'company') {
    return (
      `公司:${j.company || '—'}\n所在地:${loc}\n官网:${j.officialUrl || '未知'}\n\n` +
      '请基于你对该公司的了解,按以下四个小标题说明:\n' +
      '【公司是做什么的】【主要产品 / 项目】【主要竞品公司】【发展前景与对求职者的意义】'
    )
  }
  // 职位:有抓到的真实 JD 就基于它总结,没有才靠 NOC/标题泛化
  const base = `职位:${j.title || '—'}\n公司:${j.company || '—'}\n${nocLine}\n地点:${loc}\n`
  const headings = '请按以下三个小标题说明:\n【这个职位做什么】【需要哪些技能 / 背景】【怎么准备(简历 / 作品 / 面试)】'
  if (jd) {
    return (
      base + `\n以下是该岗位的真实招聘描述(请严格基于它总结,不要编造描述里没有的内容;描述若是英文也用中文回答):\n"""\n${jd}\n"""\n\n` +
      headings + '\n「怎么准备」一项可结合该 NOC 的通用建议。'
    )
  }
  return base + '\n(未抓到该岗详细描述,请基于职位名与 NOC 合理推断)\n\n' + headings
}

export async function POST(req: NextRequest) {
  let body: { field?: string; id?: string; job?: Job }
  try { body = await req.json() } catch { return new Response('bad json', { status: 400 }) }
  const field = body.field === 'company' ? 'company' : 'title'
  const job = body.job || {}
  // 公司描述按公司名缓存(同公司多个岗位共用);职位按 id 缓存
  const key = field === 'company' ? `company:${(job.company || '').toLowerCase()}` : `title:${body.id || job.title}`

  const cached = cache.get(key)
  if (cached) return new Response(cached, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'hit' } })

  // 职位:读取抓到的真实 JD(基于它总结,缓存未命中才扫);公司:暂无正文,靠模型知识
  const jd = field === 'title' ? loadJD(job.applyUrl) : ''

  let upstream: Response
  try {
    upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        think: false,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt(field, job, jd) },
        ],
        options: { temperature: 0.4, num_predict: field === 'company' ? 480 : 420 },
      }),
    })
  } catch {
    return new Response('无法连接本地大模型(Ollama),请确认服务在线。', { status: 502 })
  }
  if (!upstream.ok || !upstream.body) {
    return new Response(`大模型返回错误(${upstream.status})。`, { status: 502 })
  }

  // 把 Ollama 的 NDJSON 流转成纯文本增量流,顺便累积进缓存
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buf = ''
  let full = ''

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        if (full.trim()) cache.set(key, full)
        controller.close()
        return
      }
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const piece = JSON.parse(line)
          const delta = piece?.message?.content || ''
          if (delta) { full += delta; controller.enqueue(encoder.encode(delta)) }
        } catch { /* 跳过不完整行 */ }
      }
    },
    cancel() { reader.cancel().catch(() => {}) },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'miss', 'X-JD': jd ? 'yes' : 'no' } })
}
