// 读「真实抓取的职位描述文本」:从 DB jobs.description 取(mart 按 applyUrl 灌入)。
// 给前端「职位描述」弹框用。只读、无大模型、不再扫 .md 文件(去掉运行时文件依赖)。
import { NextRequest } from 'next/server'
import { jobDescription } from '@/lib/jobDescription'
import { checkLimit, ipOf } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// #201(#96 整改,Frank「付费墙守着免费报纸」):JD 摘录=通用商品(原文一键可达),
// **退出统一付费额度池** —— 不再打码、不再「Pro 200/天」框架。付费墙只守护城河(AI 移民判断/匹配/vs 中位)。
// 仅保留一道**宽松**防滥用闸(懒抓 miss 会触发外站请求,属信任边界):按 IP 日限,超了给素 429,不做升级引流。
const JD_DAILY = Number(process.env.JD_DAILY || 150)

export async function GET(req: NextRequest) {
  if (!checkLimit([[`jd:${ipOf(req)}`, JD_DAILY]])) return new Response('', { status: 429 })
  const url = req.nextUrl.searchParams.get('url')?.trim()
  if (!url) return new Response('', { status: 400 })
  const body = await jobDescription(url)
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
