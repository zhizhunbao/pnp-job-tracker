// E12-08 评分拆解(1-5 档三维明细):档位数字(通道 X/5)随列表免费展示;「为什么是这个档」= 本端点,
// 试用额度制(Frank「都是先试用再付费」)——免费登录 5 次/日超额 402 升级卡,匿名按 IP 日限 429,Pro 不限。
// 明细不随列表行下发(服务端真闸,不是前端装样子);jobtext 同族范式(checkLimit/X-Free-Left)。
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkLimit, ipOf, usedToday } from '@/lib/rateLimit'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_SCOREDETAIL_TRIES } from '@/lib/plan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getUser(req.headers)
  if (user && !isPro(user) && !checkLimit([[`sd:u:${user.id}`, FREE_SCOREDETAIL_TRIES]])) {
    return new Response('upgrade required', { status: 402 })
  }
  if (!user && !checkLimit([[`sd:${ipOf(req)}`, Number(process.env.SCOREDETAIL_IP_DAILY || 5)]])) {
    return new Response('rate limited', { status: 429 })
  }
  const { id } = await req.json().catch(() => ({}))
  if (!Number.isFinite(Number(id))) return new Response('', { status: 400 })
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const { rows } = await pool.query(
    `SELECT j.score_detail AS detail, j.grade_channel, c.sponsor_grade, c.score_detail AS company_detail
     FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`, [Number(id)])
  if (!rows.length) return new Response('', { status: 404 })
  const freeLeft = user && !isPro(user) ? String(Math.max(0, FREE_SCOREDETAIL_TRIES - usedToday(`sd:u:${user.id}`))) : null
  return Response.json(
    { detail: rows[0].detail || null, sponsorGrade: rows[0].sponsor_grade ?? null, companyDetail: rows[0].company_detail || null },
    { headers: { ...(freeLeft != null ? { 'X-Free-Left': freeLeft } : {}) } })
}
