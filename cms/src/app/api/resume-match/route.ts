/**
 * POST /api/resume-match — 简历对照 JD(G3,设计 docs/design/G3-简历对照JD-20260803.md)。
 * body: { jobId, jd, resume, lang }
 * 铁律:① 简历不落库(内存里比完即弃,日志只记长度);② 免费/付费闸在服务端(锁区正文不下发,
 * lockedN=真实剩余行数,前端打几行码看它);③ 双闸控成本(#102 账单教训):登录墙 + 每账号每天
 * DAILY_FREE 次(Pro 不限,计数挂 users.profile json,无需加列)+ 输入两侧截断 + 免费不生成 rewrite。
 * JD 文本由前端传(它已经渲染着;只影响该用户自己的结果,服务端只截断不信任)。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { jobDescription } from '@/lib/jobDescription'
import { completeText, LlmError } from '@/lib/llm'
import { CLAMP, DAILY_FREE, gateMatch, matchPrompt, MIN_RESUME, normalizeRows, parseLlmJson } from '@/lib/resumeMatch'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: any = null
  try { body = await req.json() } catch { /* 落到下面的校验 */ }
  const resume = typeof body?.resume === 'string' ? body.resume.trim() : ''
  let jd = typeof body?.jd === 'string' ? body.jd.trim() : ''
  const lang = typeof body?.lang === 'string' ? body.lang : 'en'

  const user = await getUser(await headers()).catch(() => null)
  if (!user) return Response.json({ error: 'auth' }, { status: 401 })
  const pro = isPro(user)

  if (resume.length < MIN_RESUME) return Response.json({ error: 'tooShort' }, { status: 400 })
  // 前端没带 JD(弹框场景 JD 可能没渲/没抓)→ 服务端按 jobId 走统一入口兜一次(库内 description
  // ∪ #123 懒抓;2026-08-03 Frank 实撞 noJd 被报成「稍后再试」)。兜不到才真 noJd。
  if (jd.length < 40 && body?.jobId != null) {
    try {
      const payload = await getPayload({ config: await config })
      const { rows } = await (payload.db as any).pool.query('SELECT apply_url FROM jobs WHERE id = $1 LIMIT 1', [body.jobId])
      if (rows[0]?.apply_url) jd = (await jobDescription(rows[0].apply_url)).trim()
    } catch { /* 兜底失败走 noJd */ }
  }
  if (jd.length < 40) return Response.json({ error: 'noJd' }, { status: 400 })

  // 日限(非 Pro):users.profile.matchUses = "YYYY-MM-DD:N"(挂 json 档案,无需加列;跨日自动清零)
  const today = new Date().toISOString().slice(0, 10)
  const prof = ((user as any).profile ?? {}) as Record<string, unknown>
  const [d, nRaw] = String(prof.matchUses ?? '').split(':')
  const used = d === today ? Number(nRaw) || 0 : 0
  if (!pro && used >= DAILY_FREE) return Response.json({ error: 'limit', left: 0 }, { status: 429 })

  // 真实错误只回 @test.local(standalone-dynamic-loads 探针惯例);错误码归一(旧版把 LlmError
  // 中文消息塞进 error 字段,前端匹配不上还泄内部话术)
  const dbg = String((user as any).email || '').endsWith('@test.local')
  let text: string
  try {
    // 通道定向 friend(2026-08-03 Frank「不用 Haiku 用朋友的大模型」):挂了就报 rm.err,不静默切云烧钱。
    // ⚠️ 朋友服务 prompt 上限 6000 字符(实测 400「prompt too long」;system 不占额)——
    // CLAMP 8000 是给云通道的,这里必须按 6000 预算切:JD 2800 + 简历 3100 + 标签 23 ≈ 5.9k。
    // Frank 真简历实测就是这么撞的:小输入全通、真简历+真 JD 一合计秒 400。
    text = await completeText(matchPrompt(jd.slice(0, 2800), resume.slice(0, 3100), lang, pro), { maxTokens: pro ? 1600 : 900, provider: 'friend' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`[resume-match] llm fail user=${(user as any).id}: ${msg.slice(0, 200)}`)
    return Response.json({ error: 'llm', ...(dbg ? { detail: msg.slice(0, 300) } : {}) }, { status: 502 })
  }
  const parsed = parseLlmJson(text)
  const rows = normalizeRows(parsed)
  if (!rows) {
    console.log(`[resume-match] parse fail user=${(user as any).id} jd=${jd.length}ch resume=${resume.length}ch raw=${text.slice(0, 200)}`)
    return Response.json({ error: 'parse', ...(dbg ? { detail: text.slice(0, 300) } : {}) }, { status: 502 })
  }

  // 记账(成功才计次;Pro 不计)。失败不扣次数 —— 模型抽风不该消耗用户额度
  if (!pro) {
    try {
      const payload = await getPayload({ config: await config })
      await payload.update({ collection: 'users', id: (user as any).id, data: { profile: { ...prof, matchUses: `${today}:${used + 1}` } } as any })
    } catch { /* 记账失败不挡结果;下次重读还是旧数,最坏多送一次 */ }
  }

  const gated = gateMatch(rows, pro)
  const rewrite = pro && typeof parsed?.rewrite === 'string' ? parsed.rewrite.trim().slice(0, 1200) : undefined
  console.log(`[resume-match] ok user=${(user as any).id} rows=${rows.length} pro=${pro} jd=${jd.length}ch resume=${resume.length}ch`)
  return Response.json({
    ...gated, ...(rewrite ? { rewrite } : {}),
    left: pro ? null : Math.max(0, DAILY_FREE - used - 1),
  })
}
