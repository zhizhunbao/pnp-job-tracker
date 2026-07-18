// 移民路径页(E12-01):SSR 取档案 × 维度 → 引擎 → 方案卡。匿名=通用路径信息(SEO 落地页)+建档 CTA;
// 登录建档=个性化命中/缺口。计算全在 lib/pathways.ts(规则单一来源),本页零业务逻辑。
import { headers } from 'next/headers'
import { getUser } from '@/lib/entitlement'
import { normalizeProfile, hasProfile } from '@/lib/match'
import { loadMatchDims } from '@/lib/matchDims'
import { evalPathways } from '@/lib/pathways'
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
  const evals = evalPathways(profile, dims)
  return <PathwaysView evals={evals} loggedIn={!!user} profileOk={hasProfile(profile)} />
}
