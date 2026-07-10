// 读「真实抓取的职位描述文本」:从 DB jobs.description 取(mart 按 applyUrl 灌入)。
// 给前端「职位描述」弹框用。只读、无大模型、不再扫 .md 文件(去掉运行时文件依赖)。
import { NextRequest } from 'next/server'
import { jobDescription } from '@/lib/jobDescription'
import { checkLimit, ipOf } from '@/lib/rateLimit'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_JOBTEXT_TRIES } from '@/lib/plan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // 分层 gate(E3-05):免费登录用户每日试用次数,超 → 402 升级卡;Pro 不限次
  const user = await getUser(req.headers)
  if (user && !isPro(user) && !checkLimit([[`jd:u:${user.id}`, FREE_JOBTEXT_TRIES]])) {
    return new Response('upgrade required', { status: 402 })
  }
  // 未登录按 IP 日限;匿名不得高于免费注册额度(20/日),否则倒挂劝退注册(第 2 轮随 #5)
  if (!user && !checkLimit([[`jd:${ipOf(req)}`, Number(process.env.JOBTEXT_IP_DAILY || 20)]])) {
    return new Response('rate limited', { status: 429 })
  }
  const url = req.nextUrl.searchParams.get('url')?.trim()
  if (!url) return new Response('', { status: 400 })
  const body = await jobDescription(url)
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
