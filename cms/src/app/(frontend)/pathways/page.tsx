// 移民路径页(E12-01):SSR 取档案 × 维度 → 引擎 → 方案卡。匿名=通用路径信息(SEO 落地页)+建档 CTA;
// 登录建档=个性化命中/缺口。计算全在 lib/pathways.ts(规则单一来源),本页零业务逻辑。
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/entitlement'
import { normalizeProfile, hasProfile } from '@/lib/match'
import { loadMatchDims } from '@/lib/matchDims'
import { evalPathways, type DliStats } from '@/lib/pathways'
import { PathwaysView } from './PathwaysView'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Immigration pathways to PR in Canada — employer offer → PNP, caregiver, health & trades | Offer2PR',
  description:
    'Structured, source-linked pathway information: direct employment → employer support → provincial nomination, plus lower-barrier routes (home care worker pilots, health occupations with credential steps, skilled trades). Information with official sources, not advice. 移民路径信息版:不留学·雇主担保→省提名,及护工/医护/技工低门槛通道,全部带官方出处。',
}

export default async function PathwaysPage() {
  const user = await getUser(await headers())
  const profile = normalizeProfile((user as { profile?: unknown } | null)?.profile)
  const dims = await loadMatchDims()

  // 学校数据(E12-03):dli 维度(PGWP 可申子集,295 行级)聚合成统计 + AIP 指定雇主计数。表空=不出学校信号(宁可留空)。
  const payload = await getPayload({ config: await config })
  // 护栏:dli 表缺/空 → 不出学校信号(宁可留空),页面不因此 500
  const [dliRes, desigRes] = await Promise.all([
    payload.find({ collection: 'dli', limit: 2000, depth: 0 }).catch(() => ({ docs: [] as any[] })),
    payload.count({ collection: 'designated-employers' }).catch(() => ({ totalDocs: 0 })),
  ])
  let dliStats: DliStats | undefined
  if (dliRes.docs.length > 0) {
    const byProv: Record<string, number> = {}
    const atlantic: string[] = []
    let total = 0
    for (const d of dliRes.docs as any[]) {
      if (!d.isPublic) continue                       // 统计口径=公立(旗舰②话术围绕公立院校)
      total++
      byProv[d.province] = (byProv[d.province] ?? 0) + 1
      if (['NS', 'NB', 'PE', 'NL'].includes(d.province)) atlantic.push(d.name)
    }
    const first = dliRes.docs[0] as any
    dliStats = { byProv, atlantic: atlantic.sort(), total, url: first.url || '', fetched: first.fetched || '' }
  }

  // E12-09 省提名自评打分(Frank 2026-07-27 拍板落在本页):官方分值表 + 抽选事实 +
  // 「你的职业命中了哪条具名通道」—— 抽选线必须按通道对照(BC 是按通道分别设线的),对不上就不给差分结论。
  const [sfRes, drawRes] = await Promise.all([
    payload.find({ collection: 'pnp-score-factors', limit: 300, depth: 0, sort: 'seq' }).catch(() => ({ docs: [] as any[] })),
    payload.find({ collection: 'pnp-draws', limit: 200, depth: 0, sort: '-drawDate' }).catch(() => ({ docs: [] as any[] })),
  ])
  const scoreFactors = (sfRes.docs as any[]).map((r) => ({
    province: r.province ?? '', system: r.system ?? '', factor: r.factor ?? '', kind: r.kind ?? '',
    seq: typeof r.seq === 'number' ? r.seq : 0, label: r.label ?? '',
    points: typeof r.points === 'number' ? r.points : null, xorPrev: !!r.xorPrev, rule: r.rule ?? '',
    factorMax: typeof r.factorMax === 'number' ? r.factorMax : null, factorGroup: r.factorGroup ?? '',
    groupMax: typeof r.groupMax === 'number' ? r.groupMax : null, passMark: typeof r.passMark === 'number' ? r.passMark : null,
    maxTotal: typeof r.maxTotal === 'number' ? r.maxTotal : null,
    guideEffective: r.guideEffective ?? '', fetched: r.fetched ?? '', url: r.url ?? '',
  }))
  const draws = (drawRes.docs as any[]).map((r) => ({
    province: r.province ?? '', kind: r.kind ?? '', drawDate: r.drawDate ?? '',
    stream: r.stream ?? '', score: typeof r.score === 'number' ? r.score : null,
  }))
  const streams: Record<string, string> = {}
  if (profile.nocCodes.length && scoreFactors.length) {
    const occ = await payload.find({
      collection: 'pnp-occupations', limit: 300, depth: 0,
      where: { noc: { in: profile.nocCodes } },
    }).catch(() => ({ docs: [] as any[] }))
    for (const r of occ.docs as any[]) {
      // 只认 inclusion 的具名通道(排除清单是「不可」的意思,不能拿来对抽选线);AIP 是另一条路
      if (r.type === 'ineligible' || (r.program && r.program !== 'PNP')) continue
      if (!streams[r.province]) streams[r.province] = r.stream || ''
    }
  }

  const evals = evalPathways(profile, dims, { dli: dliStats, desigEmployers: desigRes.totalDocs || 0 })
  return <PathwaysView evals={evals} loggedIn={!!user} profileOk={hasProfile(profile)}
    scoreFactors={scoreFactors} draws={draws} streams={streams}
    ctx={{ noc: profile.nocCodes[0] || '', province: profile.targetProvinces[0] || '' }} clb={profile.clb} />
}
