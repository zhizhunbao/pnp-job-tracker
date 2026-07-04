// 读「真实抓取的职位描述文本」:从 DB jobs.description 取(mart 按 applyUrl 灌入)。
// 给前端「职位描述」弹框用。只读、无大模型、不再扫 .md 文件(去掉运行时文件依赖)。
import { NextRequest } from 'next/server'
import { jobDescription } from '@/lib/jobDescription'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // 按 IP 日限(纯 DB 读,配额给宽;E2-02 公网防刷)
  if (!checkLimit([[`jd:${ipOf(req)}`, Number(process.env.JOBTEXT_IP_DAILY || 200)]])) {
    return new Response('rate limited', { status: 429 })
  }
  const url = req.nextUrl.searchParams.get('url')?.trim()
  if (!url) return new Response('', { status: 400 })
  const body = await jobDescription(url)
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
