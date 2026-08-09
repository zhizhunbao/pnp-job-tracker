/**
 * GET /api/triple-verdict?job=<id> — #287 一键三合一判定卡(批D)。
 * 服务端组装四入参调 tripleVerdict 纯函数(零判定逻辑在此层);
 * 付费闸在服务端:非 Pro 的 paid 行只下发 gate/tier/key —— 锁合成不锁事实,
 * params/quote/evidence 根本不出服务器(照 /api/report gateReport 口径,不许先发再用 CSS 遮)。
 * 数据面 = getVerdictData 跨路由单件缓存(与 /api/pathways 同一份,prod-pool-wedge 教训)。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { getVerdictData } from '@/lib/verdictCache'
import { tripleVerdict, type TripleCompany, type TripleJob, type TripleProfile } from '@/lib/tripleVerdict'
import type { DesignatedEmployerRow } from '@/lib/pathVerdict'
import type { EmployerFacts } from '@/lib/employerVerdict'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** ILIKE 通配转义(公司名要进模式串;默认转义符 '\') */
const esc = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c)

/**
 * 档案 currentStatus → VerdictProfile.status。**不补默认**:对不上就 null(needs-info 是实话,
 * verdictProfileOf 同款铁律)。pgwpMonthsLeft>0 是最强信号 —— 答了 PGWP 倒数的人持有的就是 PGWP。
 */
const STATUS_OF: Record<string, string> = {
  pgwp: 'pgwp', study: 'study', worker: 'worker', other: 'other',
  studying: 'study', working: 'worker', pr: 'other', overseas: 'other',
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const id = Number(sp.get('job'))
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: 'job required' }, { status: 400 })

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool

  const { rows: jr } = await pool.query(
    `SELECT j.id, j.title, j.noc, j.teer, j.province, j.city, j.pnp_eligible, j.pnp_stream,
            j.ee_category, j.aip, j.employment_term, j.employment_hours, j.company_id,
            c.name AS company_name, nd.title AS noc_title
       FROM jobs j
       LEFT JOIN companies c ON c.id = j.company_id
       LEFT JOIN noc_descriptions nd ON nd.noc = j.noc
      WHERE j.id = $1 LIMIT 1`,
    [id],
  )
  const r = jr[0]
  if (!r) return Response.json({ error: 'not found' }, { status: 404 })

  const job: TripleJob = {
    id: Number(r.id), title: r.title ?? '', noc: r.noc ?? null, nocName: r.noc_title ?? null,
    teer: r.teer == null ? null : Number(r.teer), province: r.province ?? '', city: r.city ?? '',
    pnpEligible: !!r.pnp_eligible, pnpStream: r.pnp_stream ?? '', eeCategory: r.ee_category ?? '',
    aip: !!r.aip, employmentTerm: r.employment_term ?? '', employmentHours: r.employment_hours ?? '',
  }

  // 公司事实(B3 五列可能不在 → 整查询失败折全 null,employerVerdict 落 unknown 不编;
  // lmia_nocs 单独一查,列缺不拖垮主体 —— jobsSql 同款容错)
  const companyName: string = r.company_name ?? ''
  let facts: EmployerFacts = { foundedYear: null, registryStatus: null, staffEst: null, staffEstSrc: null, sector: null }
  let lmiaNocs: Record<string, number> | null = null
  if (r.company_id != null) {
    const fr = await pool.query(
      `SELECT founded_year, registry_status, staff_est, staff_est_src, sector FROM companies WHERE id = $1`,
      [r.company_id],
    ).catch(() => ({ rows: [] as any[] }))
    const f = fr.rows[0]
    if (f) {
      facts = {
        foundedYear: f.founded_year == null ? null : Number(f.founded_year),
        registryStatus: f.registry_status ?? null,
        staffEst: f.staff_est == null ? null : Number(f.staff_est),
        staffEstSrc: f.staff_est_src ?? null,
        sector: f.sector ?? null,
      }
    }
    const nr = await pool.query(`SELECT lmia_nocs FROM companies WHERE id = $1`, [r.company_id])
      .catch(() => ({ rows: [] as any[] }))
    const raw = nr.rows[0]?.lmia_nocs
    try {
      const dict = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (dict && typeof dict === 'object') {
        lmiaNocs = {}
        for (const [k, v] of Object.entries(dict)) {
          if (/^\d{5}$/.test(k) && Number(v) > 0) lmiaNocs[k] = Number(v)
        }
      }
    } catch { /* 列值坏 = 未回填同款:null → lmiaKnown=false,渲染层必须区分「0 次」与「没数据」 */ }
  }

  // 指定雇主名录名字匹配(全站第一处):名录名多为法定全称带 o/a 别名(如
  // 'Grand View Manor Continuing Care Community o/a Grand View Manor'),精确相等必漏 → 双向包含。
  // 认不出 = designation:null → tv.emp.designationUnknown(本站缺口,不写「未被指定」)。
  let designation: DesignatedEmployerRow | null = null
  if (companyName && job.province) {
    const dr = await pool.query(
      `SELECT name, province, location, is_tech, source, nocs, url, fetched
         FROM designated_employers
        WHERE province = $1 AND (name ILIKE '%' || $2 || '%' OR $3 ILIKE '%' || name || '%')
        ORDER BY length(name) LIMIT 1`,
      [job.province, esc(companyName), companyName],
    ).catch(() => ({ rows: [] as any[] }))
    const d = dr.rows[0]
    if (d) {
      designation = {
        name: d.name, province: d.province, location: d.location ?? '', isTech: !!d.is_tech,
        source: d.source ?? '', nocs: d.nocs ?? '',
        ...(d.url ? { url: d.url } : {}), ...(d.fetched ? { fetched: String(d.fetched).slice(0, 10) } : {}),
      }
    }
  }

  const company: TripleCompany = {
    id: r.company_id == null ? 0 : Number(r.company_id),
    name: companyName, facts, designation, lmiaNocs,
  }

  const user = await getUser(await headers()).catch(() => null)
  const pro = isPro(user)
  const up = (user as any)?.profile ?? {}
  const noc0 = Array.isArray(up.nocCodes) && up.nocCodes.length ? String(up.nocCodes[0]) : null
  const permitLeft = up.pgwpMonthsLeft != null && Number.isFinite(Number(up.pgwpMonthsLeft)) ? Number(up.pgwpMonthsLeft) : null
  const profile: TripleProfile = {
    age: null, married: null,
    clb: up.clb != null && Number.isFinite(Number(up.clb)) ? Number(up.clb) : null,
    edu: null, eduYears: null, canadaStudy: null, studyProvince: null,
    noc: noc0, teer: null,
    expCanadaMonths: null, expForeignMonths: null, foreignExpSelfEmployed: null,
    status: permitLeft != null && permitLeft > 0 ? 'pgwp' : (STATUS_OF[String(up.currentStatus ?? '')] ?? null),
    province: null,
    permitMonthsLeft: permitLeft,
    targetProvinces: Array.isArray(up.targetProvinces) ? up.targetProvinces.map(String) : [],
    familySize: null,
  }
  // 有没有够格的档案:任一核心槽答过才算(全空档案跑个人关只会满屏 unknown,不如引导建档)
  const hasProfile = !!user && (profile.clb != null || profile.status != null || noc0 != null)

  const data = await getVerdictData()
  const card = tripleVerdict(job, company, profile, data)

  // 付费闸:paid 行对非 Pro 只留 gate/tier/key(行数与关别可见 = 让用户看见锁了几行什么结论)
  const rows = card.rows.map((row) =>
    row.tier === 'free' || pro
      ? {
          gate: row.gate, tier: row.tier, key: row.key, state: row.state, params: row.params,
          ...(row.quote ? { quote: row.quote } : {}),
          ...(row.evidence ? { evidence: row.evidence } : {}),
          ...(row.followups ? { followups: row.followups } : {}),
        }
      : { gate: row.gate, tier: row.tier, key: row.key, locked: true as const },
  )

  return Response.json({
    ok: true,
    jobId: card.jobId, noc: card.noc, nocName: card.nocName, teer: card.teer, province: card.province,
    availability: card.availability,
    loggedIn: !!user, pro, hasProfile,
    rows,
  })
}
