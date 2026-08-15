/**
 * POST /api/profile-pathways — PR 问卷完成后的个人路径初筛。
 *
 * 这里只把统一题库答案翻成 VerdictProfile，再调用判定层 pathVerdict；不依赖具体职位或雇主。
 * 具体岗位判定仍走 /api/triple-verdict，作为用户已有 offer/看中岗位后的第二层验证。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { pathVerdict, type VerdictProfile } from '@/lib/pathVerdict'
import { getVerdictData } from '@/lib/verdictCache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUS: Record<string, string> = {
  overseas: 'other', studying: 'study', working: 'worker', jobhunting: 'other',
}

const REGIONAL_FEDERAL_PATHWAYS: Record<string, readonly string[]> = {
  AIP: ['NB', 'NS', 'PE', 'NL'],
  RCIP: ['BC', 'AB', 'SK', 'MB', 'ON', 'NS'],
}

export const pathwayMatchesTargets = (key: string, province: string, targets: string[]): boolean => {
  if (!targets.length) return true
  if (province !== 'FED') return targets.includes(province)
  const regionalTargets = REGIONAL_FEDERAL_PATHWAYS[key]
  return !regionalTargets || regionalTargets.some((provinceCode) => targets.includes(provinceCode))
}

/**
 * 联邦区域线按省拆行(2026-08-15 Frank「aip 别四个省放一起了。还是分开来算吧」+「rcip 也需要拆」):
 * 判定是联邦一份(区域内同一套门槛),但在招岗/指定雇主/试点社区是省的事 —— 一行「大西洋地区」
 * 既没数字也分不出该押哪个省。拆成 目标省∩区域省 各一行(不限省 = 全拆),判定字段原样复制;
 * competition 保持 null —— AIP/RCIP 都没有 EOI 池,**不许**拿该省 PNP 的名额竞争比充数。
 */
export const splitRegionalByProvince = <T extends { key: string; province: string }>(rows: T[], targets: string[]): T[] =>
  rows.flatMap((row) => {
    const provs = REGIONAL_FEDERAL_PATHWAYS[row.key]
    if (!provs) return [row]
    return provs.filter((p) => !targets.length || targets.includes(p)).map((p) => ({ ...row, province: p }))
  })

/**
 * 各省名额竞争度(E12-07 `stats.difficulty`,来源 IRCC 开放数据):
 *   value = 该省临时居民存量 ÷ 该省当年省提名名额,例 BC 84.2 / SK 9.0。
 *
 * 🔴 它与 2026-08-11 结案的「各省 EOI 池不可比」**不是一回事**:那个是各省自己公布的池子
 *    (AB 实时 / MB 年报 / SK·ON 不发),口径各异不能横比;这个是**联邦一个源**算出来的比值,
 *    9 个省同口径 —— 所以它可以排序,也应该排序(Frank 2026-08-12:「竞争肯定是要排序的」
 *    「很多人不知道竞争激烈程度,我们有这个数据并且是最新的就有这个能力」)。
 */
export type ProvinceCompetition = { ratio: number; tier: string; pool: number; quota: number; quotaYear: number }

async function competitionByProvince(): Promise<Record<string, ProvinceCompetition>> {
  const out: Record<string, ProvinceCompetition> = {}
  try {
    const payload = await getPayload({ config: await config })
    const pool = (payload.db as { pool?: { query: (q: string) => Promise<{ rows: Record<string, unknown>[] }> } }).pool
    if (!pool) return out
    const { rows } = await pool.query(
      `SELECT province, difficulty FROM stats
        WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`,
    )
    for (const r of rows) {
      const raw = r.difficulty
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw
      const f = Array.isArray(d?.factors) ? d.factors.find((x: { key?: string }) => x?.key === 'comp') : null
      const ratio = Number(f?.value)
      if (!Number.isFinite(ratio)) continue
      out[String(r.province)] = {
        ratio, tier: String(d?.tier ?? ''),
        pool: Number(f?.pool) || 0, quota: Number(f?.quota) || 0, quotaYear: Number(f?.quotaYear) || 0,
      }
    }
  } catch { /* 列缺/值坏 = 这一维不出,方案照常给 —— 竞争度是加分项不是前置条件 */ }
  return out
}

const finite = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { answers?: Record<string, unknown> } | null
  const answers = body?.answers
  if (!answers || typeof answers !== 'object') return Response.json({ error: 'answers required' }, { status: 400 })

  const nocs = Array.isArray(answers.nocs) ? answers.nocs.map(String).filter((n) => /^\d{5}$/.test(n)) : []
  const noc = nocs[0] || (/^\d{5}$/.test(String(answers.noc ?? '')) ? String(answers.noc) : '')
  if (!noc) return Response.json({ error: 'noc required' }, { status: 400 })

  const targetProvinces = Array.isArray(answers.targetProvinces)
    ? answers.targetProvinces.map(String).filter((p) => /^[A-Z]{2}$/.test(p))
    : []
  const totalExp = finite(answers.totalExpMonths)
  const canadaExp = finite(answers.canadianExpMonths)
  const teer = Number(noc[1])

  // 学历接线(2026-08-15 Frank「EE 为什么还会排在前面」溯源):客户端一直在送 edu(fields.ts engineKey),
  // 此前路由写死 null → CRS 估分永远算不出,「够不着线沉队尾」无从触发。白名单校验按 EduKey 集合
  const EDU_KEYS = new Set(['doctorate', 'master', 'bachelor', 'tradeCert', 'diploma2y', 'cert1y', 'highschool'])
  const edu = EDU_KEYS.has(String(answers.edu ?? '')) ? String(answers.edu) as VerdictProfile['edu'] : null
  const profile: VerdictProfile = {
    age: finite(answers.age), married: null,
    clb: finite(answers.clb), edu, eduYears: null,
    studyProvince: null,
    noc, teer: Number.isInteger(teer) && teer >= 0 && teer <= 5 ? teer : null,
    expCanadaMonths: canadaExp,
    expForeignMonths: totalExp == null ? null : Math.max(0, totalExp - (canadaExp ?? 0)),
    foreignExpSelfEmployed: null,
    status: STATUS[String(answers.currentStatus ?? '')] ?? null,
    // 现居省(2026-08-15 拆闸批新题「你现在人在哪个省」):NB/MB 的「住在/受雇于该省」闸靠它判。
    // 目标省不是现居省 —— 没答仍留 null,引擎如实标 needs-info
    province: /^([A-Z]{2}|TERR)$/.test(String(answers.residenceProvince ?? '')) ? String(answers.residenceProvince) : null,
    // 持的许可(同批新题):AB/PE 的工签闸、NL 的 PGWP 闸靠它判;没答留 null → 判不了,不猜
    permit: (['study', 'pgwp', 'work', 'none'] as const).find((k) => k === String(answers.permit ?? '')) ?? null,
    // 门槛清单三类闸(2026-08-12):没答就是 null → 引擎落「判不了」,**不许**当成没有障碍。
    hasOffer: typeof answers.hasJobOffer === 'boolean' ? answers.hasJobOffer : null,
    // 「人在不在境内」不另开一题:既有的「你现在的情况」已经把 overseas 与另外三个境内选项分开了
    inCanada: answers.currentStatus ? String(answers.currentStatus) !== 'overseas' : null,
    canadaStudy: typeof answers.canadaStudy === 'boolean' ? answers.canadaStudy : null,
  }

  const [data, comp] = await Promise.all([getVerdictData(), competitionByProvince()])
  const all = pathVerdict(profile, data)
  // 反事实(L2-09):明确没 offer 的档案,把 hasOffer=true 代入重跑一次 —— 被 offer 卡住的行
  // 附上「拿到该省 offer 之后的世界」:立刻分出「即可申请」和「拿了 offer 还差语言/学历」的省,
  // 这是「该押哪个省找工作」的直接依据。答案缺 offer(null)不算「没有」,不跑。
  const afterByKey = profile.hasOffer === false
    ? new Map(pathVerdict({ ...profile, hasOffer: true }, data).map((v) => [v.key, v]))
    : null
  const scoped = all.filter((row) => pathwayMatchesTargets(row.key, row.province, targetProvinces))
  // 方案区只推荐仍可推进或待补资料的路径；硬排除项不包装成“方案”。
  const open = scoped.filter((row) => row.verdict !== 'excluded')

  // 排序:**门槛难度仍是第一主键**(pathVerdict 的原序:能走的在前、被卡住的在后、判不了沉底),
  // 竞争度只在**同一障碍档内**做次级排序 —— 同样是「至少还差 offer」,SK(9.0)该排在 BC(84.2)前面。
  // 拿竞争度盖过门槛就是本末倒置:再松的省,门槛不满足也走不了。
  const bandOf = (row: (typeof open)[number]) => `${row.verdict}|${row.blockedBy ?? ''}|${row.tier ?? ''}`
  // 2026-08-15 Frank「能够得到就排前面,够不到就排后面——毕竟大家都要找工作的」:
  // 分数线才是 EE 的真门槛。**估分 < 最近抽选线 → 沉到全队尾**(省线好歹拿到 offer 就能走);
  // 线/估分未知不动(不拿缺数据当降档理由)。比较双方都是官方事实(估分=官方分值表,线=官方抽选史),不碰禁概率红线
  const belowLine = (row: (typeof open)[number]) =>
    row.score?.refLine != null && row.score.value != null && row.score.value < row.score.refLine
  const ranked = open.map((row, i) => ({ row, i, band: bandOf(row), c: comp[row.province] }))
  ranked.sort((a, b) => {
    const ab = belowLine(a.row) ? 1 : 0, bb = belowLine(b.row) ? 1 : 0
    if (ab !== bb) return ab - bb                           // 够不着线的沉底,先于一切档位比较
    if (a.band !== b.band) return a.i - b.i                 // 不同档:原序(门槛难度)
    // 联邦线没有省级竞争度 → 沉在同档末尾,不拿 0 冒充「最松」
    const ar = a.c?.ratio ?? Number.POSITIVE_INFINITY
    const br = b.c?.ratio ?? Number.POSITIVE_INFINITY
    return ar === br ? a.i - b.i : ar - br
  })

  // 全量返回不截断(2026-08-15 RCIP 拆省时实撞:此前 slice(0,6) 在拆省前砍行,RCIP 排第 7
  // 整条到不了客户端 —— 客户端要按在招岗数降档重排,喂残缺候选集等于把重排废了;行数上限
  // 13 条拆完 ≤ 21,负载可忽略,展示条数由客户端自己截)
  const rows = ranked.map(({ row, c }) => {
    const after = row.blockedBy === 'offer' ? afterByKey?.get(row.key) : undefined
    return {
      key: row.key,
      province: row.province,
      verdict: row.verdict,
      tier: row.tier,
      availability: row.availability,
      // 被硬门槛卡住时,方案卡不能再写「优先核对」——那等于让人拿着不够的语言分去核对
      blockedBy: row.blockedBy ?? null,
      /** 该省名额竞争度(联邦口径,9 省可比);联邦线为 null */
      competition: c ?? null,
      /** 反事实:拿到该省 offer 之后这条路的判定(只给被 offer 卡住的行) */
      afterOffer: after ? { verdict: after.verdict, blockedBy: after.blockedBy ?? null, tier: after.tier } : null,
      /** 打分制通道的估分与官方线(EE);belowLine=估分<最近线(已沉队尾,前端门槛列写明数字) */
      score: row.score ? { value: row.score.value, ceiling: row.score.ceiling, refLine: row.score.refLine } : null,
      belowLine: belowLine(row),
    }
  })

  // ── 省外更优提示(2026-08-15 Frank「用户随便选了一个目标省…其他省更合适。这个怎么解决」)──
  // 目标省是硬过滤,随手选的省会把按条件更优的通道整条滤没且无声。判据只看**档位**
  // (belowLine → verdict|blockedBy|tier,与上面 bandOf 同一把尺):省外档位严格优于场内第一名才提示;
  // 竞争比不参与升降 —— 再松的省,档位不如场内也轮不到它。只提省级通道:AIP/RCIP 这类联邦区域线
  // 没有单一省可「一键加入」。展示层给一行 + 一键并省,不替他改答案(消歧不警告,同 addJobProv)。
  let outside: { key: string; province: string } | null = null
  if (targetProvinces.length) {
    const openAll = all.filter((row) => row.verdict !== 'excluded')
    const orderedAll = openAll.map((row, i) => ({ row, i }))
      .sort((a, b) => ((belowLine(a.row) ? 1 : 0) - (belowLine(b.row) ? 1 : 0)) || a.i - b.i)
    const bandK = (row: (typeof openAll)[number]) => `${belowLine(row) ? 'z' : 'a'}|${bandOf(row)}`
    const bandRank = new Map<string, number>()
    for (const { row } of orderedAll) if (!bandRank.has(bandK(row))) bandRank.set(bandK(row), bandRank.size)
    const insideBest = ranked[0]?.row
    const insideRank = insideBest ? bandRank.get(bandK(insideBest)) ?? Infinity : Infinity
    const cand = orderedAll
      .filter(({ row }) => /^[A-Z]{2}$/.test(row.province) && !targetProvinces.includes(row.province))
      .filter(({ row }) => (bandRank.get(bandK(row)) ?? Infinity) < insideRank)
      .sort((a, b) => (bandRank.get(bandK(a.row))! - bandRank.get(bandK(b.row))!)
        || ((comp[a.row.province]?.ratio ?? Infinity) - (comp[b.row.province]?.ratio ?? Infinity))
        || a.i - b.i)
    outside = cand.length ? { key: cand[0].row.key, province: cand[0].row.province } : null
  }

  return Response.json({ noc, rows: splitRegionalByProvince(rows, targetProvinces), outside })
}
