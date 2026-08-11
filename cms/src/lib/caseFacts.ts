// 处境页的答案层(样板:C01 木匠 —— 安省毕业、零加拿大经验、中介推曼省)。
//
// 页面结构由 Frank 2026-08-11 定死:**先回答他问的那个省 → 说清为什么 → 再按由易到难给替代 → 最后给第一步**。
// 上一版做成了「四块无主的事实」,被点名「列一堆信息,用户看了有什么用」—— 摆事实不等于给答案。
//
// 红线照旧不破:**一句结论都不是手写的**。排序、档位、理由、官方原句全部来自判定核
// (`pathVerdict`),这里只负责挑出「他问的那条」、按 tier 分档、把带训岗位数查出来当第一步。
// 案例库 `caseLibrary.ts` 里仍然只有画像与问题。
import { pathVerdict, type PathwayVerdict, type VerdictData, type VerdictProfile } from './pathVerdict'

export type CaseAnswer = {
  /** 他点名问的那条通道(中介推的那个省)—— 摆在最前面 */
  asked: PathwayVerdict | null
  /** 其余通道按「offer 到手后还需积累多久」分档,由易到难 */
  tiers: { tier: 0 | 1 | 2 | 3; rows: PathwayVerdict[] }[]
  /** 现在走不通的(判定核给 excluded,必带官方原句) */
  excluded: PathwayVerdict[]
  /** 第一步:这个职业「提供带训 / 不要经验」的在招岗按省分布 */
  trainable: { province: string; n: number }[]
  trainableTotal: number
  /** 每个省官方公布的运营数字(名额/提名/拒签/池子)—— 只按时长排序会假设各省一样挤,
      而这几个数正是「挤不挤」。各省公布的口径不同,**不硬凑成一个统一比值**,谁公布什么就摆什么。 */
  ops: Record<string, OpsFacts>
}

export type OpsFacts = {
  allocation?: number        // 本年名额
  nominated?: number         // 已提名(年内至今)
  refused?: number           // 已拒签(年内至今)
  invited?: number           // 已发邀请
  received?: number          // 已收到申请
  poolTotal?: number         // 池子里有多少人(只有 AB/BC 公布)
  /** 期间**按指标各记各的**:名额是全年(2026),提名/拒签是年内至今(2026 Jan-Jun)——
      共用一个 period 会把上半年的数标成全年的(2026-08-11 实撞) */
  allocPeriod?: string
  ytdPeriod?: string
  url?: string
}

type Sql = (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>

/** 有答案层的处境。画像取自案例自己的事实档,**不是** caseLibrary 里那份给答题预填用的残缺 preset。 */
export const CASE_PAGES: Record<string, {
  caseId: string
  /** 中介/朋友推的那个省 —— 页面第一段就回答它 */
  askedKey: string
  /** 完整画像:docs/design/案例C01-马龙木匠路径-事实档-20260805.md §一(逐项列了来源) */
  profile: VerdictProfile
}> = {
  'carpenter-ontario-graduate-manitoba-agent': {
    caseId: 'C01',
    askedKey: 'MB-swm',
    profile: {
      age: 40,
      married: false,              // 配偶在中国、不随行 → CRS 走单身表(事实档 §一)
      clb: 6,
      edu: 'diploma2y', eduYears: 2, canadaStudy: true, studyProvince: 'ON',
      noc: '72310', teer: 2,
      expCanadaMonths: 0,
      expForeignMonths: 0,         // 海外经历全是自雇 → 可计月数 0
      foreignExpSelfEmployed: true,
      status: 'pgwp', province: 'ON',
    } as VerdictProfile,
  },
}

export async function caseAnswer(slug: string, data: VerdictData, sql: Sql): Promise<CaseAnswer | null> {
  const spec = CASE_PAGES[slug]
  if (!spec) return null

  const all = pathVerdict(spec.profile, data)
  const asked = all.find((v) => v.key === spec.askedKey) ?? null
  const rest = all.filter((v) => v.key !== spec.askedKey && v.verdict !== 'excluded')
  const tiers: CaseAnswer['tiers'] = []
  for (const t of [0, 1, 2, 3] as const) {
    const rows = rest.filter((v) => v.tier === t)
    if (rows.length) tiers.push({ tier: t, rows })
  }

  // 第一步:零经验的人先要的是「谁肯带」,不是选省。apprentice_friendly = 官方标了带训/不要经验(05e)
  const trainable = await sql(
    `SELECT province, count(*)::int n FROM jobs
     WHERE noc = $1 AND apprentice_friendly = true AND status <> 'closed'
     GROUP BY province ORDER BY n DESC`, [spec.profile.noc],
  ).then((r) => r.rows as { province: string; n: number }[]).catch(() => [])

  return {
    asked,
    tiers,
    excluded: all.filter((v) => v.verdict === 'excluded'),
    trainable,
    trainableTotal: trainable.reduce((a, x) => a + Number(x.n), 0),
    ops: await opsByProvince(sql),
  }
}

/**
 * 各省官方运营数字。**省级口径不统一是事实**:AB 两头都有(池子 36948 / 剩余名额 2711),
 * BC 只给池子分数段、不给名额,SK/MB/ON 只给名额与提名量。硬算一个「几人抢一个」要么少一头、
 * 要么把不同口径混成一个数 —— 那是编。这里谁公布什么就取什么,显示层分别标注。
 * 取每省最近一期的**全省合计**行(scope 为空 = 不分通道的总数)。
 */
async function opsByProvince(sql: Sql): Promise<Record<string, OpsFacts>> {
  const rows = await sql(
    `SELECT DISTINCT ON (province, metric) province, metric, value, period, as_of, url
     FROM pnp_ops_stats
     WHERE metric IN ('allocation','nominations_ytd','refusals_ytd','laa_ytd','applications_received_ytd','eoi_pool_total')
       AND (scope IS NULL OR scope = '' OR scope = 'Skilled Worker')
     ORDER BY province, metric, COALESCE(as_of, period) DESC`,
  ).then((r) => r.rows as { province: string; metric: string; value: number | null; period: string; as_of: string; url: string }[])
    .catch(() => [] as { province: string; metric: string; value: number | null; period: string; as_of: string; url: string }[])

  const out: Record<string, OpsFacts> = {}
  const KEY: Record<string, keyof OpsFacts> = {
    allocation: 'allocation', nominations_ytd: 'nominated', refusals_ytd: 'refused',
    laa_ytd: 'invited', applications_received_ytd: 'received', eoi_pool_total: 'poolTotal',
  }
  for (const r of rows) {
    const k = KEY[r.metric]
    if (!k || r.value == null) continue
    const cur = out[r.province] ?? (out[r.province] = {})
    ;(cur[k] as number) = Number(r.value)
    const per = r.period || r.as_of
    if (r.metric === 'allocation' || r.metric === 'eoi_pool_total') cur.allocPeriod = cur.allocPeriod || per
    else cur.ytdPeriod = cur.ytdPeriod || per
    cur.url = cur.url || r.url
  }
  return out
}
