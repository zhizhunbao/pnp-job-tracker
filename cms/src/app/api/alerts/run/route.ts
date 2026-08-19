// 匹配版邮件提醒(E5-03):日更 seed 成功后由 auto_update 触发(x-seed-token 鉴权)。
// 两类信 + 抽选段:
//   A 档案匹配 —— Pro 且建档用户:first_seen > lastAlertAt 的新岗跑 match(),level 达标(plan.ALERT_MATCH_LEVEL)
//     的前 10 条进信;当日有新抽选且用户报了 CRS → 附「上次抽选 vs 你的 CRS 差 X 分」段。发信后回写 lastAlertAt。
//   B saved search —— 每条保存的筛选:first_seen > lastNotifiedAt 且命中 filters(lib/jobs/queries fetchAlertHits)→ 发信,
//     回写 lastNotifiedAt。同一岗不重复通知(游标语义)。
// RESEND_API_KEY 未设 = dry-run:照常计算返回计数,不发信不回写(端到端可演练)。?dry=1 强制 dry-run。
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { fetchAlertHits, loadMatchDims, match, normalizeProfile, hasProfile, type MatchJob } from '@/lib/jobs'
import { sendMail, MAIL_ENABLED, unsubToken } from '@/lib/mailer'
import { ALERT_MATCH_LEVEL } from '@/lib/plan'
import * as SQL from '@/lib/db/sql'   // SQL 文本全在那儿,本文件只管取数与组装

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
// 2026-08-03 Frank:提醒信一律英文(88% 流量是英文;zh/ko 文案在 git 历史里,要恢复翻回来即可)
const T = {
  subject: (n: number) => `${n} new jobs match your saved search — Offer2PR`,
  matchSubject: (n: number) => `${n} new jobs match your immigration path — Offer2PR`,
  hi: 'New jobs relevant to you (click a title for details):',
  drawGapAbove: (c: string, crs: number, dr: number, d: number) => `New draw: "${c}" cutoff ${dr} — your CRS ${crs} is ${d} above`,
  drawGapBelow: (c: string, crs: number, dr: number, d: number) => `New draw: "${c}" cutoff ${dr} — your CRS ${crs} is ${d} below`,
  open: 'Open job board', unsub: 'Delete the saved search on your account page to stop alerts',
}

// 链接落本站详情页(2026-08-03 Frank:原先直跳 Job Bank 原帖=流量白送;详情页有翻译/报告/官方原帖入口)
function jobsTable(rows: any[]): string {
  const tr = rows.map((j) => `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee"><a href="${j.id != null ? `${SITE}/jobs/${j.id}` : SITE}" style="color:#2563eb;text-decoration:none">${j.title}</a></td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${j.company_name || ''}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${[j.city, j.province].filter(Boolean).join(', ')}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${j.salary_text || ''}</td>
  </tr>`).join('')
  return `<table style="border-collapse:collapse;font-size:13px;font-family:system-ui,sans-serif">${tr}</table>`
}
function emailHtml(rows: any[], drawLines: string[]): string {
  return `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
    <p>🍁 <strong>Offer2PR</strong></p>
    ${drawLines.map((l) => `<p style="background:#fef3c7;padding:8px 12px;border-radius:8px">${l}</p>`).join('')}
    <p>${T.hi}</p>${jobsTable(rows)}
    <p style="margin-top:14px"><a href="${SITE}" style="color:#2563eb">${T.open}</a></p>
    <p style="color:#9ca3af;font-size:12px">${T.unsub}</p></div>`
}

// ── C 免费周报(E9-02b):zh+en 双语一封(免费用户多无档案语言偏好,不猜) ──
function weeklyHtml(rows: { title: string; company: string; open: boolean }[], newN: number, dims: string, unsubUrl: string): string {
  const tr = rows.map((r) => `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.title}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">${r.company}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.open
      ? '<span style="color:#15803d">在招 open</span>'
      : '<span style="color:#9ca3af">已下架 closed</span>'}</td>
  </tr>`).join('')
  return `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
    <p>🍁 <strong>Offer2PR</strong> · 每周求职看板摘要 / Weekly saved-jobs digest</p>
    <table style="border-collapse:collapse;font-size:13px">${tr}</table>
    ${newN > 0 ? `<p>你的方向(${dims})近 7 天新增 <strong>${newN}</strong> 岗 / ${newN} new jobs this week in your saved directions — <a href="${SITE}" style="color:#2563eb">看新岗 View →</a></p>` : ''}
    <p><a href="${SITE}/account" style="color:#2563eb">建档案,看每岗与你的匹配度 / Build a profile for per-job match</a></p>
    <p style="color:#9ca3af;font-size:12px">状态以官方原帖为准 · Status per official posting ·
      <a href="${unsubUrl}" style="color:#9ca3af">退订本摘要 Unsubscribe</a> · <a href="${SITE}/account" style="color:#9ca3af">账户设置 Settings</a></p></div>`
}

// ── C2 档案版周报(E5-07,Frank 2026-07-27「用户点进来能留住」):
// 原周报要求「有收藏」,刚答完入口三问、还没收藏任何岗的新用户一封都收不到 —— 那批人正是最该被叫回来的。
// 没收藏就按**档案里的职业 + 目标省**发:本周新增多少岗、其中多少可提名、最高年薪多少 + 三条真岗。
// 一个字都不编:数字全来自库内当周真实新增。
// 文案按 locale 出单语;locale 为空(老用户、Google 注册)才回双语 —— 不猜语言,也不让人读半篇看不懂的字。
const WK = {
  zh: { head: (d: string, n: number, e: number, m: string) => `${d} 本周新增 <strong>${n}</strong> 个岗,其中 <strong>${e}</strong> 个可提名,中位年薪 <strong>${m}</strong>`,
    cta: (n: number) => `看这 ${n} 个新岗`, foot: '数据来自官方公开发布,状态以原帖为准', unsub: '退订本摘要', settings: '账户设置' },
  en: { head: (d: string, n: number, e: number, m: string) => `<strong>${n}</strong> new jobs this week in ${d} · <strong>${e}</strong> PNP-eligible · median <strong>${m}</strong>`,
    cta: (n: number) => `View these ${n} jobs`, foot: 'Official public data; status per the original posting', unsub: 'Unsubscribe', settings: 'Settings' },
  ko: { head: (d: string, n: number, e: number, m: string) => `${d} 이번 주 신규 <strong>${n}</strong>건 · 지명 가능 <strong>${e}</strong>건 · 중위 연봉 <strong>${m}</strong>`,
    cta: (n: number) => `신규 ${n}건 보기`, foot: '공식 공개 데이터이며 상태는 원문 공고 기준입니다', unsub: '수신 거부', settings: '계정 설정' },
} as const

function weeklyProfileHtml(
  rows: { title: string; company: string; sal: string }[],
  stat: { newN: number; eligN: number; medSal: number | null },
  dimsOf: (L: 'zh' | 'en' | 'ko') => string, unsubUrl: string, locale: string,
): string {
  const tr = rows.map((r) => `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.title}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">${r.company}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#15803d">${r.sal}</td>
  </tr>`).join('')
  const k = (n: number | null) => (n == null ? '—' : `$${Math.round(n / 1000)}K`)
  const langs: ('zh' | 'en' | 'ko')[] = locale === 'en' ? ['en'] : locale === 'ko' ? ['ko'] : locale === 'zh' ? ['zh'] : ['zh', 'en']
  const heads = langs.map((L, i) => `<p style="${i ? 'color:#6b7280;margin-top:-6px' : ''}">${WK[L].head(dimsOf(L), stat.newN, stat.eligN, k(stat.medSal))}</p>`).join('')
  const F = WK[langs[0]]
  return `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
    <p>🍁 <strong>Offer2PR</strong></p>
    ${heads}
    <table style="border-collapse:collapse;font-size:13px">${tr}</table>
    <p style="margin-top:14px"><a href="${SITE}" style="color:#2563eb">${F.cta(stat.newN)}</a></p>
    <p style="color:#9ca3af;font-size:12px">${F.foot} ·
      <a href="${unsubUrl}" style="color:#9ca3af">${F.unsub}</a> · <a href="${SITE}/account" style="color:#9ca3af">${F.settings}</a></p></div>`
}

export async function GET(req: NextRequest) {
  if (!process.env.SEED_TOKEN || req.headers.get('x-seed-token') !== process.env.SEED_TOKEN) {
    return new Response('unauthorized', { status: 401 })
  }
  const dry = !MAIL_ENABLED || req.nextUrl.searchParams.get('dry') === '1'
  // ?preview=weekly:只渲染第一封档案版周报的 HTML 返回,不发信不写库 —— 走查时能直接看邮件长什么样
  const preview = req.nextUrl.searchParams.get('preview') || ''
  // 静默时段(2026-08-16 Frank「晚上不要给我用户发邮件」):多伦多时间 20:00–08:00 之外整轮不发、
  // **游标不回写**(lastAlertAt/lastNotifiedAt 原地不动)→ 下一个白天窗口的触发自然补发,一封不丢。
  // 用户主要在加拿大,东部时间当全体近似;窗口可用 ALERT_QUIET_START/END(小时,ET)覆盖;?force=1 走查用
  const qs = Number(process.env.ALERT_QUIET_START ?? 20)   // 起=晚上 8 点
  const qe = Number(process.env.ALERT_QUIET_END ?? 8)      // 止=早上 8 点
  const etHour = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', hour12: false }).format(new Date()))
  const inQuiet = qs > qe ? (etHour >= qs || etHour < qe) : (etHour >= qs && etHour < qe)
  if (inQuiet && !dry && !preview && req.nextUrl.searchParams.get('force') !== '1') {
    return NextResponse.json({ ok: true, deferred: true, quietHours: `${qs}:00–${qe}:00 America/Toronto`, etHour })
  }
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const now = new Date().toISOString()
  // 第25轮 #116:sendFails 计数——发送失败原先只落 Render console(看不到的地方),现随响应进 build 日志
  const out = { dryRun: dry, matchEmails: 0, searchEmails: 0, weeklyEmails: 0, sendFails: 0, usersChecked: 0, searchesChecked: 0, weeklyChecked: 0, skippedFilters: [] as string[] }

  // ── A 档案匹配提醒(Pro + 建档 + 有邮箱) ──
  const dims = await loadMatchDims()
  // 当日新抽选(drawDate=近 2 天)去重按类别
  const today = new Date(); const cut = new Date(today.getTime() - 2 * 86400_000).toISOString().slice(0, 10)
  const newDraws = [...new Map(dims.eeCategories.filter((c) => c.drawCrs != null && (c.drawDate || '') >= cut).map((c) => [c.label, c])).values()]

  const users = await payload.find({
    collection: 'users', limit: 1000, depth: 0, overrideAccess: true,
    where: { proUntil: { greater_than: now } },
  })
  for (const u of users.docs as any[]) {
    const profile = normalizeProfile(u.profile)
    if (!u.email || !hasProfile(profile)) continue
    out.usersChecked++
    const since = u.lastAlertAt || new Date(Date.now() - 36 * 3600_000).toISOString()  // 首轮只回看 36h,不倒灌历史
    const { rows } = await pool.query(
      SQL.ALERT_JOBS, [since])
    // 目标省的岗排前面(2026-08-03 Frank「该按用户地理推」):偏好不是资格(07-21 拍板),
    // 外省对口岗不排除,只往后放;stable sort 保住组内原 score 序
    const inTarget = (j: any) => (profile.targetProvinces.includes((j.province || '').toUpperCase()) ? 0 : 1)
    const hits = rows.filter((j: any) => {
      const mj: MatchJob = { noc: j.noc ?? '', teer: j.teer == null ? null : Number(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible, pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: j.salary_annual == null ? null : Number(j.salary_annual), wageMedAnnual: j.wage_med_annual == null ? null : Number(j.wage_med_annual) }
      const m = match(profile, mj, dims)
      return m.level === 'high' || (ALERT_MATCH_LEVEL === 'mid' && m.level === 'mid')
    })
    if (profile.targetProvinces.length) hits.sort((a: any, b: any) => inTarget(a) - inTarget(b))
    const top = hits.slice(0, 10)
    const drawLines = profile.crs != null ? newDraws.map((d) => {
      const diff = profile.crs! - (d.drawCrs as number)
      return diff >= 0 ? T.drawGapAbove(d.label, profile.crs!, d.drawCrs as number, diff) : T.drawGapBelow(d.label, profile.crs!, d.drawCrs as number, -diff)
    }) : []
    if (!top.length && !drawLines.length) continue
    if (!dry) {
      const ok = await sendMail(u.email, T.matchSubject(top.length), emailHtml(top, drawLines))
      if (ok) {
        out.matchEmails++
        await payload.update({ collection: 'users', id: u.id, overrideAccess: true, data: { lastAlertAt: now } })
      } else out.sendFails++
    } else if (top.length) out.matchEmails++
  }

  // ── B saved search 提醒 ──
  const searches = await payload.find({ collection: 'saved-searches', limit: 1000, depth: 1, overrideAccess: true })
  for (const sdoc of searches.docs as any[]) {
    out.searchesChecked++
    const owner = typeof sdoc.user === 'object' ? sdoc.user : null
    if (!owner?.email) continue
    const since = sdoc.lastNotifiedAt || new Date(Date.now() - 36 * 3600_000).toISOString()
    const { rows, skipped } = await fetchAlertHits(pool, (sdoc.filters as Record<string, unknown>) || {}, since)
    out.skippedFilters.push(...skipped)
    if (!rows.length) continue
    if (!dry) {
      const ok = await sendMail(owner.email, T.subject(rows.length), emailHtml(rows, []))
      if (ok) {
        out.searchEmails++
        await payload.update({ collection: 'saved-searches', id: sdoc.id, overrideAccess: true, data: { lastNotifiedAt: now } })
      } else out.sendFails++
    } else out.searchEmails++
  }

  // ── C 免费周报(E9-02b):免费 × 未退订 × 距上次 ≥7 天 × 有收藏;滚动游标,单轮 ≤200 封防超时 ──
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const cut7 = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
  const freeUsers = await payload.find({
    collection: 'users', limit: 1000, depth: 0, overrideAccess: true,
    where: { and: [
      { or: [{ proUntil: { exists: false } }, { proUntil: { less_than: now } }] },
      { or: [{ weeklyOptOut: { not_equals: true } }, { weeklyOptOut: { exists: false } }] },
      { or: [{ lastWeeklyAt: { exists: false } }, { lastWeeklyAt: { less_than: weekAgo } }] },
    ] },
  })
  for (const u of freeUsers.docs as any[]) {
    if (out.weeklyEmails >= 200) break                    // 防超时上限;游标语义下一轮自动续
    if (!u.email) continue
    const sj = await payload.find({ collection: 'saved-jobs', limit: 200, depth: 0, overrideAccess: true, where: { user: { equals: u.id } } })
    if (!sj.docs.length) {
      // 没收藏 → 走档案分支(E5-07);档案也空就真的没内容可发,保持「不硬发」
      const nocs = Array.isArray(u.profile?.nocCodes) ? u.profile.nocCodes.filter((x: any) => /^\d{5}$/.test(String(x))) : []
      const provs = Array.isArray(u.profile?.targetProvinces) ? u.profile.targetProvinces.filter((x: any) => typeof x === 'string' && x.length === 2) : []
      if (!nocs.length) continue
      out.weeklyChecked++
      const provCond = provs.length ? ' AND j.province = ANY($3)' : ''
      const params: any[] = provs.length ? [cut7, nocs, provs] : [cut7, nocs]
      const { rows: agg } = await pool.query(
        SQL.alertOccStats(provCond), params)
      const st = { newN: agg[0]?.n || 0, eligN: agg[0]?.elig || 0, medSal: agg[0]?.med == null ? null : Number(agg[0].med) }
      if (!st.newN) continue                               // 本周零新增=没内容,不硬发
      const { rows: top3 } = await pool.query(
        SQL.alertSampleJobs(provCond), params)
      const { rows: nameRows } = await pool.query(
        SQL.ALERT_NOC_TITLE, [nocs])
      // 职业名与范围按**邮件语言**取 —— 英文/韩文邮件里塞中文职业名,与 #216 是同一类漏
      const dimsOf = (L: 'zh' | 'en' | 'ko') => {
        const names = nameRows.map((r: any) => (L === 'zh' ? r.zh || r.en : r.en || r.zh)).filter(Boolean)
        const occ = names.join(L === 'zh' ? '、' : ', ') || (L === 'zh' ? `${nocs.length} 个职业` : `${nocs.length} occupations`)
        if (provs.length) return L === 'zh' ? `${provs.join('、')} 的${occ}` : `${occ} (${provs.join(', ')})`
        return L === 'zh' ? `${occ}(全国)` : L === 'ko' ? `${occ}(전국)` : `${occ} (Canada-wide)`
      }
      const uLoc = typeof u.locale === 'string' ? u.locale : ''
      const subject = uLoc === 'en' ? `${st.newN} new jobs in your direction (${st.eligN} PNP-eligible) — Offer2PR`
        : uLoc === 'ko' ? `이번 주 신규 ${st.newN}건(지명 가능 ${st.eligN}건) — Offer2PR`
        : `你的方向本周新增 ${st.newN} 个岗(${st.eligN} 个可提名) — Offer2PR`
      if (preview === 'weekly') {
        return new Response(weeklyProfileHtml(top3 as any, st, dimsOf, `${SITE}/api/alerts/unsub?u=0&t=preview`, req.nextUrl.searchParams.get('lang') || uLoc),
          { headers: { 'content-type': 'text/html; charset=utf-8' } })
      }
      if (!dry) {
        const unsubUrl = `${SITE}/api/alerts/unsub?u=${u.id}&t=${unsubToken(u.id)}`
        const ok = await sendMail(u.email, subject, weeklyProfileHtml(top3 as any, st, dimsOf, unsubUrl, uLoc))
        if (ok) {
          out.weeklyEmails++
          await payload.update({ collection: 'users', id: u.id, overrideAccess: true, data: { lastWeeklyAt: now } })
        } else out.sendFails++
      } else out.weeklyEmails++
      continue
    }
    out.weeklyChecked++
    const ids = sj.docs.map((d: any) => (typeof d.job === 'object' ? d.job?.id : d.job)).filter((x: any) => x != null)
    const { rows: jrows } = ids.length
      ? await pool.query(SQL.ALERT_JOBS_BY_IDS, [ids])
      : { rows: [] as any[] }
    const st = new Map<string, { status?: string; province?: string; broad?: string }>(jrows.map((r: any) => [String(r.id), r]))
    const items = sj.docs.slice(0, 20).map((d: any) => {
      const j = st.get(String(typeof d.job === 'object' ? d.job?.id : d.job))
      return { title: d.title || '—', company: d.company || '', open: (j?.status || 'closed') === 'open' }
    })
    // 收藏画像 = 收藏岗的 (省, 大类) 去重对;近 7 天新增按对精确计数
    const pairs = [...new Map(jrows.filter((r: any) => r.province && r.broad).map((r: any) => [`${r.province}|${r.broad}`, r])).values()]
    let newN = 0
    if (pairs.length) {
      const conds = pairs.map((_: any, i: number) => `(province = $${i * 2 + 2} AND broad = $${i * 2 + 3})`).join(' OR ')
      const params = [cut7, ...pairs.flatMap((r: any) => [r.province, r.broad])]
      const { rows: cr } = await pool.query(SQL.alertNewCount(conds), params)
      newN = cr[0]?.n || 0
    }
    const openN = items.filter((x) => x.open).length
    const dims = pairs.slice(0, 3).map((r: any) => `${r.province}·${r.broad}`).join(' / ')
    const subject = `你收藏的 ${sj.docs.length} 个岗:${openN} 在招 · ${items.length - openN} 已下架 — Offer2PR`
    if (!dry) {
      const unsubUrl = `${SITE}/api/alerts/unsub?u=${u.id}&t=${unsubToken(u.id)}`
      const ok = await sendMail(u.email, subject, weeklyHtml(items, newN, dims, unsubUrl))
      if (ok) {
        out.weeklyEmails++
        await payload.update({ collection: 'users', id: u.id, overrideAccess: true, data: { lastWeeklyAt: now } })
      } else out.sendFails++
    } else out.weeklyEmails++
  }

  return NextResponse.json(out)
}
