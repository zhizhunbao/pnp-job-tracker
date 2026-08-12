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
import { getDesignatedEmployers, getVerdictData } from '@/lib/verdictCache'
import { matchDesignation } from '@/lib/designationMatch'
import { tripleVerdict, type TripleCompany, type TripleJob, type TripleProfile } from '@/lib/tripleVerdict'
import type { EmployerFacts } from '@/lib/employerVerdict'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 档案 currentStatus → VerdictProfile.status。**不补默认**:对不上就 null(needs-info 是实话,
 * verdictProfileOf 同款铁律)。pgwpMonthsLeft>0 是最强信号 —— 答了 PGWP 倒数的人持有的就是 PGWP。
 */
const STATUS_OF: Record<string, string> = {
  pgwp: 'pgwp', study: 'study', worker: 'worker', other: 'other',
  studying: 'study', working: 'worker', pr: 'other', overseas: 'other',
}

/** 档案里的数字槽:非有限数一律当没答(null),**不拿 0 冒充「答过是 0」** */
const numOrNull = (v: unknown): number | null => (v != null && Number.isFinite(Number(v)) ? Number(v) : null)

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

  // 指定雇主名录名字匹配(全站唯一一处):口径 = designationMatch 的**完全匹配**
  // (规范化后公司名 == 名录名的任一 o/a 名段)。旧口径是双向子串包含,会把 `Esso` 匹进
  // `Wheeler Accessories`、`ARMS Ltd` 匹进 `Wohlgemuth Farms Ltd`(2026-08-09 全量审计坐实)。
  // 候选行走 getDesignatedEmployers 的按省 TTL 缓存(详情页流量最大,名录扫描不每请求现算)。
  // 认不出 = designation:null + matches:0 → tv.emp.designationUnknown(本站缺口,不写「未被指定」);
  // 多配 = designation:null + matches:N → tv.emp.designatedMulti(只报家数,不点名加盟法人)。
  const dir = companyName && job.province ? await getDesignatedEmployers(job.province) : []
  const hit = matchDesignation(companyName, dir)

  const company: TripleCompany = {
    id: r.company_id == null ? 0 : Number(r.company_id),
    name: companyName, facts, lmiaNocs,
    designation: hit.row, designationMatches: hit.count, designationSource: hit.source,
  }

  const user = await getUser(await headers()).catch(() => null)
  const pro = isPro(user)
  const up = (user as any)?.profile ?? {}
  const noc0 = Array.isArray(up.nocCodes) && up.nocCodes.length ? String(up.nocCodes[0]) : null
  const permitLeft = up.pgwpMonthsLeft != null && Number.isFinite(Number(up.pgwpMonthsLeft)) ? Number(up.pgwpMonthsLeft) : null
  const profile: TripleProfile = {
    age: null, married: null,
    clb: up.clb != null && Number.isFinite(Number(up.clb)) ? Number(up.clb) : null,
    edu: null, eduYears: null,
    canadaStudy: typeof up.canadaStudy === 'boolean' ? up.canadaStudy : null,
    studyProvince: null,
    noc: noc0, teer: null,
    // 2026-08-12:这几样先前一律硬写 null —— 于是 experience/income 行恒 unknown、
    // 「最快通道」也判不出来,「个人条件」整段对含 Pro 在内的任何人都只出「判不了」。
    // 现在读落档的真值(quizToProfile 已把答题的全套答案写进 profile)。
    expCanadaMonths: numOrNull(up.expCanadaMonths),
    expForeignMonths: numOrNull(up.expForeignMonths),
    foreignExpSelfEmployed: null,
    hasOffer: typeof up.hasOffer === 'boolean' ? up.hasOffer : null,
    // 「人在不在境内」由既有的分型槽推,不另存一列(与 /api/profile-pathways 同一口径)
    inCanada: up.currentStatus ? String(up.currentStatus) !== 'overseas' : null,
    status: permitLeft != null && permitLeft > 0 ? 'pgwp' : (STATUS_OF[String(up.currentStatus ?? '')] ?? null),
    province: null,
    permitMonthsLeft: permitLeft,
    targetProvinces: Array.isArray(up.targetProvinces) ? up.targetProvinces.map(String) : [],
    familySize: numOrNull(up.familySize),
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
