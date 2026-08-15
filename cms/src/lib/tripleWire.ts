/**
 * 判定卡的**下行数据**(wire)——同一份,给两处用:
 *   · `/api/triple-verdict`(客户端带本地答案时的实时判定)
 *   · `/plan/pr?job=` 的 SSR 首屏(2026-08-12:先前整张卡在客户端取,一进页面先看骨架 ~1.5s)
 *
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
import {
  tripleVerdict,
  type TripleCard, type TripleCompany, type TripleJob, type TripleProfile,
} from '@/lib/tripleVerdict'
import type { EmployerFacts } from '@/lib/employerVerdict'

/** 下行行:免费行给全,付费行对非 Pro 只留 gate/tier/key */
export type TripleWireRow = {
  gate: string
  tier: string
  key: string
  locked?: true
  state?: string
  params?: Record<string, string | number | boolean | string[]>
  quote?: string
  evidence?: { url?: string; fetched?: string; label?: string }
  followups?: string[]
}
export type TripleWire = {
  ok: true
  jobId: number
  noc: string | null
  nocName: string | null
  teer: number | null
  province: string
  conclusion: TripleCard['conclusion']
  availability: string
  loggedIn: boolean
  pro: boolean
  hasProfile: boolean
  rows: TripleWireRow[]
}

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

// 引擎答案(toEngineAnswers 的形状)。匿名用户没有服务端档案,把本地答案带上来即可 ——
// **付费闸与它无关**:锁不锁看的是登录用户是不是 Pro,答案只决定「判得出来还是判不了」。
export type ClientAnswers = Record<string, unknown> | null

/**
 * 匿名可用(2026-08-12 Frank「匿名也可以访问」):`answers` 是浏览器本地那份答案。
 * 登录用户的服务端档案**逐槽优先**,答案只补它缺的那几样 —— 落过档的不被本地旧答案覆盖。
 * SSR 调用时 answers 传 null(服务端读不到 localStorage),客户端拿到本地答案后再刷一次。
 */
export async function buildTripleWire(id: number, answers: ClientAnswers): Promise<TripleWire | { error: string; status: number }> {
  if (!Number.isInteger(id) || id <= 0) return { error: 'job required', status: 400 }

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
  if (!r) return { error: 'not found', status: 404 }

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
  // 逐槽合并:**服务端档案优先,本地答案只补它缺的那几样**。落过档的不该被本地旧答案覆盖;
  // 匿名用户没有档案,整份就用本地答案 —— 功能不再以登录为前提(Frank 2026-08-12「匿名也可以访问」)。
  const a = answers ?? {}
  const nOf = (fromProfile: unknown, fromAnswers: unknown): number | null => numOrNull(fromProfile) ?? numOrNull(fromAnswers)
  const bOf = (fromProfile: unknown, fromAnswers: unknown): boolean | null =>
    typeof fromProfile === 'boolean' ? fromProfile : typeof fromAnswers === 'boolean' ? fromAnswers : null
  const sOf = (fromProfile: unknown, fromAnswers: unknown): string =>
    String(fromProfile ?? '') || String(fromAnswers ?? '')

  const nocList = Array.isArray(up.nocCodes) && up.nocCodes.length ? up.nocCodes
    : Array.isArray(a.nocs) ? a.nocs : []
  const noc0 = nocList.length ? String(nocList[0]) : (typeof a.noc === 'string' && a.noc ? a.noc : null)
  const permitLeft = nOf(up.pgwpMonthsLeft, a.pgwpMonthsLeft)
  const statusRaw = sOf(up.currentStatus, a.currentStatus)
  const totalExp = numOrNull(a.totalExpMonths)
  const canExpA = numOrNull(a.canadianExpMonths)
  const provs = Array.isArray(up.targetProvinces) && up.targetProvinces.length ? up.targetProvinces
    : Array.isArray(a.targetProvinces) ? a.targetProvinces : []

  const profile: TripleProfile = {
    age: null, married: null,
    clb: nOf(up.clb, a.clb),
    edu: null, eduYears: null,
    canadaStudy: bOf(up.canadaStudy, a.canadaStudy),
    // 学历所在省 / 专业对口(2026-08-15 新题,与 /api/profile-pathways 同一口径)
    studyProvince: /^([A-Z]{2}|TERR)$/.test(String(a.studyProvince ?? '')) ? String(a.studyProvince) : null,
    fieldMatch: typeof a.fieldMatch === 'boolean' ? a.fieldMatch : null,
    // teer 由 NOC 第二位推(全站同一条口径:profile-pathways / employerCompare / reportFacts 都这么算)。
    // 先前硬写 null → pathVerdict 的 pickGate 按 teerHit 挑行时,**凡是分 TEER 的经验门槛行一条都挑不到**
    // → gate.picked=null → availability='not-collected'。于是 PE 这类只有一条 `applies_teer=0,1,2,3`
    // 经验行的省,答没答题都恒报「本站未收录」——把用户没答说成我们没数据,正是三值折叠要拆开的那两件事。
    noc: noc0, teer: noc0 && /^\d{5}$/.test(noc0) ? Number(noc0[1]) : null,
    // 2026-08-12:这几样先前一律硬写 null —— 于是 experience/income 行恒 unknown、
    // 「最快通道」也判不出来,「个人条件」整段对含 Pro 在内的任何人都只出「判不了」。
    expCanadaMonths: nOf(up.expCanadaMonths, canExpA),
    // 官方口径的海外经验 = 总经验 − 加拿大经验(本地答案里只有总数,这里现算)
    expForeignMonths: numOrNull(up.expForeignMonths)
      ?? (totalExp == null ? null : Math.max(0, totalExp - (canExpA ?? 0))),
    foreignExpSelfEmployed: null,
    hasOffer: bOf(up.hasOffer, a.hasJobOffer),
    // 「人在不在境内」由既有的分型槽推,不另存一列(与 /api/profile-pathways 同一口径)
    inCanada: statusRaw ? statusRaw !== 'overseas' : null,
    status: permitLeft != null && permitLeft > 0 ? 'pgwp' : (STATUS_OF[statusRaw] ?? null),
    // 现居省/许可(2026-08-15 拆闸批,与 /api/profile-pathways 同一口径):来自问卷答案,没答留 null
    province: /^([A-Z]{2}|TERR)$/.test(String(a.residenceProvince ?? '')) ? String(a.residenceProvince) : null,
    permit: (['study', 'pgwp', 'work', 'none'] as const).find((k) => k === String(a.permit ?? '')) ?? null,
    permitMonthsLeft: permitLeft,
    targetProvinces: provs.map(String),
    familySize: nOf(up.familySize, a.familySize),
  }
  // 有没有够格的档案:任一核心槽答过才算(全空档案跑个人关只会满屏 unknown,不如引导建档)
  // 「够格的档案」不再以登录为前提:本地答案带上来同样算(否则匿名带了答案,面板还在劝他建档)
  const hasProfile = profile.clb != null || profile.status != null || noc0 != null

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

  return {
    ok: true,
    jobId: card.jobId, noc: card.noc, nocName: card.nocName, teer: card.teer, province: card.province,
    // 结论句恒免费:它与同一页上免费的「你的初步方案」同源(都来自 pathVerdict),
    // 锁在这里等于把已经免费给出的东西再收一次钱。逐项差值仍走 paid 行的锁。
    conclusion: card.conclusion,
    availability: card.availability,
    loggedIn: !!user, pro, hasProfile,
    rows,
  }
}
