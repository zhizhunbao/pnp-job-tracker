// E9-04 投递方式懒查(B11):Job Bank 把投递邮箱藏在「Show how to apply」的 JSF 局部提交后面——
// 初始 HTML 和 ETL 存的 description 里都没有。打开投递栏时现场两跳:GET 取 seekeractivity 表单 →
// 复刻 JSF partial POST(render=@all)→ 从 How to apply 块抽邮箱。进程内缓存,零批量预抓(lazy-first)。
// 只认 jobbank.gc.ca 职位页(白名单防 SSRF);其他来源(ATS 原站)邮箱走前端对 jobtext 的正则,不进这里。
import { NextRequest } from 'next/server'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DAILY = Number(process.env.APPLYHOW_DAILY || 60)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const NEG_TTL = 10 * 60_000
const JB_POSTING_RE = /^https:\/\/www\.jobbank\.gc\.ca\/jobsearch\/jobposting\/\d+([/?#]|$)/

const cache = new Map<string, string>()       // 规范化 url → email(空串=确认无邮箱,同样缓存)
const failed = new Map<string, number>()      // 抓取失败负缓存(有邮箱与否未知,到期重试)

const MAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const pickMail = (s: string): string => {
  for (const m of s.match(MAIL_RE) || []) {
    const d = (m.split('@')[1] || '').toLowerCase()
    if (d && !d.includes('jobbank') && !d.endsWith('gc.ca') && !d.endsWith('canada.ca')) return m
  }
  return ''
}

async function fetchApplyEmail(postingUrl: string): Promise<string | null> {
  const first = await fetch(postingUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(8000) }).catch(() => null)
  if (!first?.ok) return null
  // JSF 会话贴在 action 的 jsessionid 上,cookie 一并带上双保险
  const cookies = (first.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
  const html = await first.text()
  const action = /<form id="seekeractivity"[^>]*action="([^"]+)"/.exec(html)?.[1]
  const jid = /id="seekeractivity:jobid"[^>]*value="(\d+)"/.exec(html)?.[1]
  if (!action || !jid) return ''   // 页面在但没有投递表单(下架/改版)= 确认无
  const body = new URLSearchParams({
    'jakarta.faces.partial.ajax': 'true',
    'jakarta.faces.source': 'seekeractivity',
    'jakarta.faces.partial.execute': 'seekeractivity:jobid',
    'jakarta.faces.partial.render': '@all',
    'jakarta.faces.behavior.event': 'action',
    action: 'applynowbutton',
    jsJobId: jid,
    seekeractivity_SUBMIT: '1',
    'seekeractivity:jobid': jid,
    'jakarta.faces.ViewState': 'stateless',
  })
  const r2 = await fetch('https://www.jobbank.gc.ca' + action.replace(/&amp;/g, '&'), {
    method: 'POST',
    headers: {
      'User-Agent': UA, Accept: '*/*', Referer: postingUrl,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Faces-Request': 'partial/ajax',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: body.toString(),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!r2?.ok) return null
  const out = await r2.text()
  const i = out.search(/how to apply/i)
  return pickMail(i >= 0 ? out.slice(i, i + 4000) : out)
}

export async function GET(req: NextRequest) {
  if (!checkLimit([[`ah:${ipOf(req)}`, DAILY]])) return Response.json({ email: '' }, { status: 429 })
  const raw = req.nextUrl.searchParams.get('url')?.trim() || ''
  if (!JB_POSTING_RE.test(raw)) return Response.json({ email: '' })
  const key = raw.split(/[?#]/)[0]
  const hit = cache.get(key)
  if (hit !== undefined) return Response.json({ email: hit })
  const neg = failed.get(key)
  if (neg && Date.now() - neg < NEG_TTL) return Response.json({ email: '' })
  const email = await fetchApplyEmail(key)
  if (email === null) {
    failed.set(key, Date.now())
    if (failed.size > 500) failed.clear()
    return Response.json({ email: '' })
  }
  cache.set(key, email)
  if (cache.size > 5000) cache.clear()
  return Response.json({ email })
}
