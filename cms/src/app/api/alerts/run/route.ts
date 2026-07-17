// 匹配版邮件提醒(E5-03):日更 seed 成功后由 auto_update 触发(x-seed-token 鉴权)。
// 两类信 + 抽选段:
//   A 档案匹配 —— Pro 且建档用户:first_seen > lastAlertAt 的新岗跑 match(),level 达标(plan.ALERT_MATCH_LEVEL)
//     的前 10 条进信;当日有新抽选且用户报了 CRS → 附「上次抽选 vs 你的 CRS 差 X 分」段。发信后回写 lastAlertAt。
//   B saved search —— 每条保存的筛选:first_seen > lastNotifiedAt 且命中 filters(lib/jobsQuery 解释)→ 发信,
//     回写 lastNotifiedAt。同一岗不重复通知(游标语义)。
// RESEND_API_KEY 未设 = dry-run:照常计算返回计数,不发信不回写(端到端可演练)。?dry=1 强制 dry-run。
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { buildJobsWhere } from '@/lib/jobsQuery'
import { sendMail, MAIL_ENABLED, unsubToken } from '@/lib/mailer'
import { loadMatchDims } from '@/lib/matchDims'
import { match, normalizeProfile, hasProfile, type MatchJob } from '@/lib/match'
import { ALERT_MATCH_LEVEL } from '@/lib/plan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
type Lang = 'zh' | 'en' | 'ko'
const T: Record<Lang, { subject: (n: number) => string; matchSubject: (n: number) => string; hi: string; drawGapAbove: (cat: string, crs: number, draw: number, d: number) => string; drawGapBelow: (cat: string, crs: number, draw: number, d: number) => string; open: string; unsub: string }> = {
  zh: {
    subject: (n) => `你保存的筛选有 ${n} 个新职位 — Offer2PR`,
    matchSubject: (n) => `${n} 个新职位命中你的移民路径 — Offer2PR`,
    hi: '以下新职位与你相关(点击职位看官方原帖):',
    drawGapAbove: (c, crs, dr, d) => `新抽选:「${c}」抽到 ${dr} 分 —— 你自报 CRS ${crs},高出 ${d} 分`,
    drawGapBelow: (c, crs, dr, d) => `新抽选:「${c}」抽到 ${dr} 分 —— 你自报 CRS ${crs},还差 ${d} 分`,
    open: '打开职位板', unsub: '在账户页可删除保存的筛选以停止提醒',
  },
  en: {
    subject: (n) => `${n} new jobs match your saved search — Offer2PR`,
    matchSubject: (n) => `${n} new jobs match your immigration path — Offer2PR`,
    hi: 'New jobs relevant to you (click a title for the official posting):',
    drawGapAbove: (c, crs, dr, d) => `New draw: "${c}" cutoff ${dr} — your CRS ${crs} is ${d} above`,
    drawGapBelow: (c, crs, dr, d) => `New draw: "${c}" cutoff ${dr} — your CRS ${crs} is ${d} below`,
    open: 'Open job board', unsub: 'Delete the saved search on your account page to stop alerts',
  },
  ko: {
    subject: (n) => `저장한 필터에 새 공고 ${n}건 — Offer2PR`,
    matchSubject: (n) => `이민 경로에 맞는 새 공고 ${n}건 — Offer2PR`,
    hi: '나와 관련된 새 공고(제목 클릭 시 공식 공고):',
    drawGapAbove: (c, crs, dr, d) => `새 추첨: "${c}" 커트라인 ${dr} — 내 CRS ${crs}, ${d}점 높음`,
    drawGapBelow: (c, crs, dr, d) => `새 추첨: "${c}" 커트라인 ${dr} — 내 CRS ${crs}, ${d}점 부족`,
    open: '채용 보드 열기', unsub: '계정 페이지에서 저장 필터를 삭제하면 알림이 중지됩니다',
  },
}

function jobsTable(rows: any[]): string {
  const tr = rows.map((j) => `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee"><a href="${j.apply_url || SITE}" style="color:#2563eb;text-decoration:none">${j.title}</a></td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${j.company_name || ''}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${[j.city, j.province].filter(Boolean).join(', ')}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">${j.salary_text || ''}</td>
  </tr>`).join('')
  return `<table style="border-collapse:collapse;font-size:13px;font-family:system-ui,sans-serif">${tr}</table>`
}
function emailHtml(lang: Lang, rows: any[], drawLines: string[]): string {
  const t = T[lang]
  return `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
    <p>🍁 <strong>Offer2PR</strong></p>
    ${drawLines.map((l) => `<p style="background:#fef3c7;padding:8px 12px;border-radius:8px">${l}</p>`).join('')}
    <p>${t.hi}</p>${jobsTable(rows)}
    <p style="margin-top:14px"><a href="${SITE}" style="color:#2563eb">${t.open} →</a></p>
    <p style="color:#9ca3af;font-size:12px">${t.unsub}</p></div>`
}
const langOf = (v: unknown): Lang => (v === 'en' || v === 'ko' ? v : 'zh')

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
    <p><a href="${SITE}/account" style="color:#2563eb">建档案,看每岗与你的匹配度 / Build a profile for per-job match →</a></p>
    <p style="color:#9ca3af;font-size:12px">状态以官方原帖为准 · Status per official posting ·
      <a href="${unsubUrl}" style="color:#9ca3af">退订本摘要 Unsubscribe</a> · <a href="${SITE}/account" style="color:#9ca3af">账户设置 Settings</a></p></div>`
}

export async function GET(req: NextRequest) {
  if (!process.env.SEED_TOKEN || req.headers.get('x-seed-token') !== process.env.SEED_TOKEN) {
    return new Response('unauthorized', { status: 401 })
  }
  const dry = !MAIL_ENABLED || req.nextUrl.searchParams.get('dry') === '1'
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const now = new Date().toISOString()
  const out = { dryRun: dry, matchEmails: 0, searchEmails: 0, weeklyEmails: 0, usersChecked: 0, searchesChecked: 0, weeklyChecked: 0, skippedFilters: [] as string[] }

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
      `SELECT j.title, j.city, j.province, j.salary_text, j.apply_url, j.noc, j.teer, j.pnp_eligible, j.pnp_stream,
              j.ee_category, j.salary_annual, j.wage_med_annual, j.score, c.name AS company_name
       FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
       WHERE j.status = 'open' AND j.first_seen > $1 ORDER BY j.score DESC NULLS LAST LIMIT 2000`, [since])
    const hits = rows.filter((j: any) => {
      const mj: MatchJob = { noc: j.noc ?? '', teer: j.teer == null ? null : Number(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible, pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: j.salary_annual == null ? null : Number(j.salary_annual), wageMedAnnual: j.wage_med_annual == null ? null : Number(j.wage_med_annual) }
      const m = match(profile, mj, dims)
      return m.level === 'high' || (ALERT_MATCH_LEVEL === 'mid' && m.level === 'mid')
    }).slice(0, 10)
    const drawLines = profile.crs != null ? newDraws.map((d) => {
      const diff = profile.crs! - (d.drawCrs as number)
      const t = T[langOf(u.profileLang)]
      return diff >= 0 ? t.drawGapAbove(d.label, profile.crs!, d.drawCrs as number, diff) : t.drawGapBelow(d.label, profile.crs!, d.drawCrs as number, -diff)
    }) : []
    if (!hits.length && !drawLines.length) continue
    if (!dry) {
      const lang = langOf(u.profileLang)
      const ok = await sendMail(u.email, T[lang].matchSubject(hits.length), emailHtml(lang, hits, drawLines))
      if (ok) {
        out.matchEmails++
        await payload.update({ collection: 'users', id: u.id, overrideAccess: true, data: { lastAlertAt: now } })
      }
    } else if (hits.length) out.matchEmails++
  }

  // ── B saved search 提醒 ──
  const searches = await payload.find({ collection: 'saved-searches', limit: 1000, depth: 1, overrideAccess: true })
  for (const sdoc of searches.docs as any[]) {
    out.searchesChecked++
    const owner = typeof sdoc.user === 'object' ? sdoc.user : null
    if (!owner?.email) continue
    const since = sdoc.lastNotifiedAt || new Date(Date.now() - 36 * 3600_000).toISOString()
    const w = buildJobsWhere((sdoc.filters as Record<string, unknown>) || {}, 2)
    out.skippedFilters.push(...w.skipped)
    const { rows } = await pool.query(
      `SELECT j.title, j.city, j.province, j.salary_text, j.apply_url, c.name AS company_name
       FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
       WHERE j.status = 'open' AND j.first_seen > $1 AND ${w.sql}
       ORDER BY j.score DESC NULLS LAST LIMIT 20`, [since, ...w.params])
    if (!rows.length) continue
    if (!dry) {
      const lang = langOf(sdoc.lang)
      const ok = await sendMail(owner.email, T[lang].subject(rows.length), emailHtml(lang, rows, []))
      if (ok) {
        out.searchEmails++
        await payload.update({ collection: 'saved-searches', id: sdoc.id, overrideAccess: true, data: { lastNotifiedAt: now } })
      }
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
    if (!sj.docs.length) continue                          // 无收藏=没内容,不硬发
    out.weeklyChecked++
    const ids = sj.docs.map((d: any) => (typeof d.job === 'object' ? d.job?.id : d.job)).filter((x: any) => x != null)
    const { rows: jrows } = ids.length
      ? await pool.query(`SELECT id, status, province, broad FROM jobs WHERE id = ANY($1::int[])`, [ids])
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
      const { rows: cr } = await pool.query(`SELECT count(*)::int AS n FROM jobs WHERE status = 'open' AND date_posted >= $1 AND (${conds})`, params)
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
      }
    } else out.weeklyEmails++
  }

  return NextResponse.json(out)
}
