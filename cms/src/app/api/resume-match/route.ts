/**
 * POST /api/resume-match — 简历对照 JD(G3,设计 docs/design/G3-简历对照JD-20260803.md)。
 * body: { jobId, jd, resume, lang, save }
 * 铁律:① 简历**默认不落库**(内存里比完即弃,日志只记长度);只有 body.save===true(用户勾了
 * 「存进档案」)才写 profile.resumeText —— 存档设计见 docs/implementation/E11-用户身份与分型引导/08_简历存档与多岗复用.md;
 * ② 免费/付费闸在服务端(锁区正文不下发,lockedN=真实剩余行数,前端打几行码看它);③ 双闸控成本
 * (#102 账单教训):登录墙 + 每账号每天 DAILY_FREE 次(Pro 不限,计数落 users.profile.matchUses —— 该列
 * 由 docs/sql/resume-archive.sql 手写添加;E11-08 之前这键没在 collection 声明,写了被静默丢弃,闸门一直失效)
 * + 输入两侧截断 + 免费不生成 rewrite。
 * JD 文本由前端传(它已经渲染着;只影响该用户自己的结果,服务端只截断不信任)。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/quota/server'
import { jobDescription } from '@/lib/jobs/server'
import { isLlmError } from '@/lib/error'
import { completeText } from '@/lib/llm'
import { patchProfile, type ProfilePatch } from '@/lib/profile'
import { DAILY_FREE, gateMatch, matchPrompt, MIN_RESUME, normalizeRows, parseLlmJson } from '@/lib/resume'
import { SQL } from '@/lib/db'   // SQL 文本全在那儿,本文件只管取数与组装

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: any = null
  try { body = await req.json() } catch { /* 落到下面的校验 */ }
  const resume = typeof body?.resume === 'string' ? body.resume.trim() : ''
  let jd = typeof body?.jd === 'string' ? body.jd.trim() : ''
  const lang = typeof body?.lang === 'string' ? body.lang : 'en'
  const save = body?.save === true   // 存档只在用户显式勾选时发生(默认不存是红线,别用真值判断)

  const user = await getUser(await headers()).catch(() => null)
  if (!user) return Response.json({ error: 'auth' }, { status: 401 })
  const pro = isPro(user)

  if (resume.length < MIN_RESUME) return Response.json({ error: 'tooShort' }, { status: 400 })
  // 前端没带 JD(弹框场景 JD 可能没渲/没抓)→ 服务端按 jobId 走统一入口兜一次(库内 description
  // ∪ #123 懒抓;2026-08-03 Frank 实撞 noJd 被报成「稍后再试」)。兜不到才真 noJd。
  if (jd.length < 40 && body?.jobId != null) {
    try {
      const payload = await getPayload({ config: await config })
      const { rows } = await (payload.db as any).pool.query(SQL.JOB_APPLY_URL_BY_ID, [body.jobId])
      if (rows[0]?.apply_url) jd = (await jobDescription(rows[0].apply_url)).trim()
    } catch { /* 兜底失败走 noJd */ }
  }
  if (jd.length < 40) return Response.json({ error: 'noJd' }, { status: 400 })

  // 日限(非 Pro):users.profile.matchUses = "YYYY-MM-DD:N"(跨日自动清零;E11-08 起该字段真在 collection 里声明了,闸门才真生效)
  const today = new Date().toISOString().slice(0, 10)
  const prof = ((user as any).profile ?? {}) as Record<string, unknown>
  const [d, nRaw] = String(prof.matchUses ?? '').split(':')
  const used = d === today ? Number(nRaw) || 0 : 0
  if (!pro && used >= DAILY_FREE) return Response.json({ error: 'limit', left: 0 }, { status: 429 })

  // 真实错误只回 @test.local(standalone-dynamic-loads 探针惯例);错误码归一(旧版把 LlmError
  // 中文消息塞进 error 字段,前端匹配不上还泄内部话术)
  const dbg = String((user as any).email || '').endsWith('@test.local')
  let text: string
  // 上游缓存/链路痕迹:串答事故(2026-08-04)只能靠它发现,必须进日志。
  // xCache 是新端点 `x-cache: HIT|MISS` 响应头原值(不再靠我们自己推断);via=legacy 说明当时回退了旧链。
  let meta: { cached: boolean; via: string; xCache: string | null } = { cached: false, via: '-', xCache: null }
  try {
    // 通道定向 friend(2026-08-03 Frank「不用 Haiku 用朋友的大模型」):挂了就按错误码报,不静默切云烧钱。
    // ✅ 2026-08-04:撤掉 JD 2800 / 简历 3100 的切法 —— 那是上游 6000 字符上限时代的止血
    //    (Frank 真简历实测必败的根因)。新端点上限 20000,预算见 resumeMatch 顶部,这里按 CLAMP 走。
    // temperature 压到 0.1:要的是稳定的 JSON 与可复现的判定,不要发挥。
    text = await completeText({
      messages: matchPrompt(jd, resume, lang, pro),
      maxTokens: pro ? 1600 : 900, provider: 'friend', temperature: 0.1,
      onMeta: (m) => { meta = m },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const code = e instanceof Error && isLlmError(e) ? e.code : undefined
    // 错误码各说各话(2026-08-03 Frank 实撞「什么都报稍后再试」):
    // tooLong = 用户输入太长,重试没用要删内容;busy = 上游超时,重试有用;llm = 其余(含鉴权/请求格式,
    // 都是我们这侧的运维问题,对用户统一说「稍后再试」,细节只进日志)。
    const mapped = code === 'tooLong' ? { error: 'tooLong', status: 400 }
      : code === 'timeout' ? { error: 'busy', status: 504 }
        : { error: 'llm', status: 502 }
    console.log(`[resume-match] llm fail user=${(user as any).id} code=${code ?? '-'} → ${mapped.error} jd=${jd.length}ch resume=${resume.length}ch: ${msg.slice(0, 200)}`)
    return Response.json({ error: mapped.error, ...(dbg ? { detail: msg.slice(0, 300) } : {}) }, { status: mapped.status })
  }
  const parsed = parseLlmJson(text)
  const rows = normalizeRows(parsed)
  if (!rows) {
    console.log(`[resume-match] parse fail user=${(user as any).id} jd=${jd.length}ch resume=${resume.length}ch via=${meta.via} x-cache=${meta.xCache ?? '-'} raw=${text.slice(0, 200)}`)
    return Response.json({ error: 'parse', ...(dbg ? { detail: text.slice(0, 300) } : {}) }, { status: 502 })
  }

  // 记账 + 存档:一次 patchProfile 写完(别写两次库)。记账只对非 Pro、且只在成功后计次
  // —— 模型抽风不该消耗用户额度;存档只在 save===true 时发生(不勾一个字都不存)。
  let saved = false
  const patch: ProfilePatch = {}
  if (!pro) patch.matchUses = `${today}:${used + 1}`
  if (save) {
    patch.resumeText = resume.slice(0, 20000)   // 与 collection 的 maxLength 对齐,服务端截断不信前端
    patch.resumeSavedAt = new Date()
  }
  if (Object.keys(patch).length > 0) {
    try {
      await patchProfile((user as any).id, patch)
      saved = save
    } catch (e) {
      // 记账/存档失败都不挡结果(记账最坏多送一次,存档下次再存);但必须留痕 —— 裸 catch 是老教训。
      // 日志只记长度不记内容(简历是 PII)。
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`[resume-match] profile write fail user=${(user as any).id} save=${save} resume=${save ? resume.length : 0}ch: ${msg.slice(0, 200)}`)
    }
  }

  const gated = gateMatch(rows, pro)
  const rewrite = pro && typeof parsed?.rewrite === 'string' ? parsed.rewrite.trim().slice(0, 1200) : undefined
  console.log(`[resume-match] ok user=${(user as any).id} rows=${rows.length} pro=${pro} jd=${jd.length}ch resume=${resume.length}ch via=${meta.via} x-cache=${meta.xCache ?? '-'} saved=${saved}`)
  return Response.json({
    ...gated, ...(rewrite ? { rewrite } : {}),
    left: pro ? null : Math.max(0, DAILY_FREE - used - 1),
    saved,   // 前端据此显示「已存进档案」(勾了但写库失败 = false,不骗用户)
  })
}
