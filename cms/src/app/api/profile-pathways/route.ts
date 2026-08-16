/**
 * POST /api/profile-pathways — PR 问卷完成后的个人路径初筛。
 *
 * 这里只把统一题库答案翻成 VerdictProfile，再调用判定层 pathVerdict；不依赖具体职位或雇主。
 * 具体岗位判定仍走 /api/triple-verdict，作为用户已有 offer/看中岗位后的第二层验证。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fetchOccCompetition } from '@/lib/occCompetition'
import { fetchPilotQuota, type PilotQuotaAgg } from '@/lib/pilotQuota'
import { pathVerdict, type VerdictProfile } from '@/lib/pathVerdict'
import { regionProvincesOf, uiOf } from '@/lib/pathways'
import { pickOutside, rankRows, type RankCtx } from '@/lib/planRank'
import { isAboveLine, isBelowLine } from '@/lib/scoreLine'
import { getVerdictData } from '@/lib/verdictCache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUS: Record<string, string> = {
  overseas: 'other', studying: 'study', working: 'worker', jobhunting: 'other',
}

// 区域线覆盖哪几个省 2026-08-15 搬进策略文件(lib/pathways/<通道>.ts 的 regionProvinces)——
// 「AIP 管哪四个省」是 AIP 自己的事,不该住在某个路由里
export const pathwayMatchesTargets = (key: string, province: string, targets: string[]): boolean => {
  if (!targets.length) return true
  if (province !== 'FED') return targets.includes(province)
  const regionalTargets = regionProvincesOf(key)
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
    const provs = regionProvincesOf(row.key)
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
  const body = await req.json().catch(() => null) as {
    answers?: Record<string, unknown>; ticks?: Record<string, unknown>
    rows?: Record<string, unknown>; wage?: unknown; areaI?: unknown
  } | null
  const answers = body?.answers
  if (!answers || typeof answers !== 'object') return Response.json({ error: 'answers required' }, { status: 400 })

  // 加分项勾选(2026-08-16):`省:因素:批` 三段键,值是布尔。**信任边界校验**:形状不对的丢掉,
  // 总量封顶 —— 它直接进分值计算,放任自由文本进来等于让请求方自己写分。
  // 只收 true 的键;没勾的一律不算(与「value 是下界」那条口径一致)。
  const TICK_KEY = /^[A-Z]{2}:[A-Za-z][A-Za-z0-9]{0,23}:\d{1,2}$/
  const ticks: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(body?.ticks ?? {})) {
    if (v !== true || !TICK_KEY.test(k)) continue
    ticks[k] = true
    if (Object.keys(ticks).length >= 64) break
  }

  // 用户在分值卡上直选的官方档位(2026-08-16):键 `省:因素`,值 = 该档的 seq。
  // 同一条信任边界:形状不对丢掉、总量封顶 —— 它直接决定得几分,放任自由文本进来等于让请求方写分。
  const ROW_KEY = /^[A-Z]{2}:[A-Za-z][A-Za-z0-9]{0,23}$/
  const scoreRows: Record<string, number> = {}
  for (const [k, v] of Object.entries(body?.rows ?? {})) {
    const n = Number(v)
    if (!ROW_KEY.test(k) || !Number.isInteger(n) || n < 0 || n > 99) continue
    scoreRows[k] = n
    if (Object.keys(scoreRows).length >= 64) break
  }
  const wageNum = Number(body?.wage)
  const wage = Number.isFinite(wageNum) && wageNum > 0 && wageNum < 1000 ? wageNum : null
  const areaNum = Number(body?.areaI)
  const areaI = Number.isInteger(areaNum) && areaNum >= 0 && areaNum <= 20 ? areaNum : null

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
    // eduYears(#316):基础卷新题「学制年数」,单位=年;此前写死 null → 安省毕业生 3 个月档
    // 恒判不了、曼省 2 年制学历恒按 1 年算
    clb: finite(answers.clb), edu, eduYears: finite(answers.eduYears),
    // 学历所在省(2026-08-15 新题):NL 专业对口的例外按它分档,MB/ON 两条既有条款也吃它
    studyProvince: /^([A-Z]{2}|TERR)$/.test(String(answers.studyProvince ?? '')) ? String(answers.studyProvince) : null,
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
    // 专业对口(同批新题):没答留 null → 该闸判不了,不许当成对口
    fieldMatch: typeof answers.fieldMatch === 'boolean' ? answers.fieldMatch : null,
    // 法语(FCIP 的定义性门槛):没答留 null → 判不了,不拿英语 CLB 折算
    frenchOk: typeof answers.frenchOk === 'boolean' ? answers.frenchOk : null,
    // 门槛清单三类闸(2026-08-12):没答就是 null → 引擎落「判不了」,**不许**当成没有障碍。
    hasOffer: typeof answers.hasJobOffer === 'boolean' ? answers.hasJobOffer : null,
    // 「人在不在境内」不另开一题:既有的「你现在的情况」已经把 overseas 与另外三个境内选项分开了
    inCanada: answers.currentStatus ? String(answers.currentStatus) !== 'overseas' : null,
    canadaStudy: typeof answers.canadaStudy === 'boolean' ? answers.canadaStudy : null,
    // 用户勾中的加分项(2026-08-16):进 provinceGridScore 的 now 那一侧。校验过的键才到这
    scoreTicks: ticks,
    // 用户直选的官方档位 + 时薪 + BC 地区档:先前服务端一律收不到,于是 BC 这类
    // 「必答档位要岗位侧数据」的省整省算不出分(页面上明明算得出)
    scoreRows, wage, areaI,
  }

  const [data, comp, occRows, pilotQuota] = await Promise.all([getVerdictData(), competitionByProvince(), fetchOccCompetition(nocs.length ? nocs : [noc]), fetchPilotQuota()])
  // RCIP/FCIP 名额状态(2026-08-16 Frank「不是有比名额竞争更准确的数据吗」):社区官网 quote-anchored,
  // 按 省×制度 聚合,挂给区域线行 —— 展示层用语义单一的 remainingSum/perIntakeSum,不上混算的 quotaSum
  const quotaByKey = new Map<string, PilotQuotaAgg>(pilotQuota.map((q) => [`${q.province}|${q.type}`, q]))
  const all = pathVerdict(profile, data)
  // 反事实(L2-09):明确没 offer 的档案,把 hasOffer=true 代入重跑一次 —— 被 offer 卡住的行
  // 附上「拿到该省 offer 之后的世界」:立刻分出「即可申请」和「拿了 offer 还差语言/学历」的省,
  // 这是「该押哪个省找工作」的直接依据。答案缺 offer(null)不算「没有」,不跑。
  const afterByKey = profile.hasOffer === false
    ? new Map(pathVerdict({ ...profile, hasOffer: true }, data).map((v) => [v.key, v]))
    : null

  // 2026-08-15 Frank「能够得到就排前面,够不到就排后面」:估分与最近抽选线比,够得着的提前、
  // 够不着的沉队尾。比较双方都是官方事实(估分=官方分值表,线=官方抽选史),不碰禁概率红线。
  //
  // 2026-08-16 口径纠正(Frank「如果用户分数达标 就等着被捞」):原来两头都拿 `value` 判、
  // 又把 partial 整个排除掉 —— 结果是**两头都没生效**(AB 表带 12 条加分项 → 恒 partial →
  // 沉底永不触发;够得着更是压根没算过)。partial 的含义是 value=**下界**、ceiling=**上界**,
  // 于是两个方向各用各的那一侧才是硬结论:
  //   · 够得着 aboveLine = **下界** ≥ 线 —— 加分项只会更高,partial 与否都成立
  //   · 够不着 belowLine = **上界** < 线 —— 加分项全按满分也摸不到线才叫够不着
  // 中间那段(下界<线≤上界)两头都不占:如实留白,由展示层说「取决于加分项」。
  // 判定本体在 lib/scoreLine(纯函数 + 单测);这里只负责挂到行上
  const aboveLine = (row: (typeof all)[number]) => isAboveLine(row.score)
  const belowLine = (row: (typeof all)[number]) => isBelowLine(row.score)

  // ── 排序(#307 单源化):拆省在先(每个省级行按自己的在招/竞争排),planRank 一把尺排完再下发;
  //    客户端只渲染不再重排 —— 此前引擎/服务端/客户端三处口径并存,#302 的「省外提示与排序
  //    不是同一把尺」就是分叉的直接后果。
  type SplitRow = (typeof all)[number] & { belowLine: boolean; aboveLine: boolean; competition: { ratio: number } & Record<string, unknown> | null }
  const decorateSplit = (rows: typeof all, targets: string[]): SplitRow[] =>
    splitRegionalByProvince(rows.map((row) => ({ ...row })), targets).map((row) => ({
      ...row,
      belowLine: belowLine(row),
      aboveLine: aboveLine(row),
      // AIP/RCIP/FCIP 无 EOI 池 → competition 保持 null,不许拿该省 PNP 名额竞争比充数
      competition: regionProvincesOf(row.key) ? null : (comp[row.province] ?? null),
    }))
  // 该省该职业在招岗数,按通道口径取列(AIP=指定雇主∩职业、RCIP/FCIP=试点∩职业、其余=全省)。
  // 查无该省 = 0(occ 查询只回有岗的省);非省级行 = null
  const jobsOf: RankCtx['jobsOf'] = (row) => {
    if (!/^[A-Z]{2}$/.test(row.province)) return null
    const o = occRows.find((x) => x.province === row.province)
    return o?.[uiOf(row.key).jobsSource] ?? 0
  }
  // 本省 = 现居省 ∪ 学历省(#302:地理成本进服务端,与客户端展示同一把尺)
  const homeProvs = new Set([profile.province, profile.studyProvince].filter((p): p is string => !!p && /^[A-Z]{2}$/.test(p)))
  const ctx: RankCtx = { jobsOf, homeProvs }

  const scoped = all.filter((row) => pathwayMatchesTargets(row.key, row.province, targetProvinces))
  const ranked = rankRows(decorateSplit(scoped.filter((row) => row.verdict !== 'excluded'), targetProvinces), ctx)

  const wireOf = (row: SplitRow) => {
    const after = row.blockedBy === 'offer' ? afterByKey?.get(row.key) : undefined
    return {
      key: row.key,
      province: row.province,
      verdict: row.verdict,
      tier: row.tier,
      availability: row.availability,
      // 被硬门槛卡住时,方案卡不能再写「优先核对」——那等于让人拿着不够的语言分去核对
      blockedBy: row.blockedBy ?? null,
      /** tier 的起算点(#319):在读学生的经验型 tier 要等毕业拿工签才起算;引擎侧字段,缺省 now */
      tierBasis: (row as { tierBasis?: 'now' | 'after-study' }).tierBasis ?? 'now',
      /** 这段等待要不要全职(取自官方条文行;2026-08-16「而且需要全职的吗?」) */
      tierFullTime: (row as { tierFullTime?: boolean }).tierFullTime ?? false,
      /** 全部缺口闸(#324 原因列要逐行差异,单一 blockedBy 不够):gap 类理由的闸键列表 */
      gaps: Array.from(new Set((row.reasons ?? [])
        .filter((r) => r.kind === 'gap' && r.key)
        .map((r) => String(r.key)))),
      /** 判不了是因为**他还没答**哪几道题(展示层据此挂提醒,而不是笼统写「判不了」) */
      missingSlots: row.missingSlots ?? [],
      /** 该省名额竞争度(联邦口径,9 省可比);联邦区域线为 null */
      competition: row.competition,
      /** 该省该职业在招岗数(服务端与排序同源,#307;客户端不再自取自排) */
      jobsN: jobsOf(row),
      /** RCIP/FCIP 社区名额状态(省×制度聚合;非试点行 null) */
      pilotQuota: (row.key === 'RCIP' || row.key === 'FCIP') && /^[A-Z]{2}$/.test(row.province)
        ? quotaByKey.get(`${row.province}|${row.key}`) ?? null
        : null,
      /** 反事实:拿到该省 offer 之后这条路的判定(只给被 offer 卡住的行) */
      afterOffer: after ? { verdict: after.verdict, blockedBy: after.blockedBy ?? null, tier: after.tier } : null,
      /** 打分制通道的估分与官方线。三态互斥,两头都是硬结论、中间如实留白(2026-08-16):
       *  aboveLine=下界≥线(够得着,提前);belowLine=上界<线(够不着,沉底);都 false=取决于加分项。
       *  partial=true 表示 value 是下界(加分项按 0 记),展示层据此决定说不说「取决于加分项」 */
      score: row.score ? { value: row.score.value, ceiling: row.score.ceiling, refLine: row.score.refLine,
        partial: (row.score as { partial?: boolean }).partial ?? false } : null,
      belowLine: row.belowLine,
      aboveLine: row.aboveLine,
    }
  }
  const rows = ranked.map(wireOf)

  // ── 已排除通道(#318):excluded 不再整条隐身 —— 「联邦 EE 走不了,因为加拿大经验 0」正是
  //    最常被问的结论,滤掉等于把答案藏起来。单列一组,带第一条排除理由(措辞层键+参数,quote 随行)
  const excluded = decorateSplit(scoped.filter((row) => row.verdict === 'excluded'), targetProvinces)
    .map((row) => {
      const r = (row.reasons ?? []).find((x) => x.kind === 'excluded') ?? (row.reasons ?? [])[0]
      return {
        key: row.key,
        province: row.province,
        reason: r ? { key: r.key ?? null, params: r.params ?? null, text: r.text, quote: r.quote ?? null } : null,
      }
    })

  // ── 省外提示(#302/#303):与主排序共用 planRank 同一把尺(含 0 岗/thin/本省/竞争比)。
  //    措辞层拿 insideBest 摆对照(两边竞争比与档位如实并排),不再裸称「更优」。
  const allSplit = decorateSplit(all.filter((row) => row.verdict !== 'excluded'), [])
  const picked = pickOutside(allSplit, targetProvinces, ctx)
  const outside = picked ? {
    key: picked.row.key,
    province: picked.row.province,
    ratio: picked.row.competition?.ratio ?? null,
    tier: picked.row.tier,
    blockedBy: picked.row.blockedBy ?? null,
    inside: picked.insideBest ? {
      key: picked.insideBest.key,
      province: picked.insideBest.province,
      ratio: picked.insideBest.competition?.ratio ?? null,
      tier: picked.insideBest.tier,
      blockedBy: picked.insideBest.blockedBy ?? null,
    } : null,
  } : null

  // nocs 全量回传(2026-08-16「要支持多个职位类别」):展示层的「查岗位」要按档案里的全部职业深链
  return Response.json({ noc, nocs: nocs.length ? nocs : [noc], rows, excluded, outside })
}
