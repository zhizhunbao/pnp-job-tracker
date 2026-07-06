// 定价页(E5-01):服务端读 plan.ts 常量与登录态 → 对照表与分层单一来源,别写岔;
// 展示价走 env NEXT_PUBLIC_PRICE_DISPLAY("CA$19,CA$39",构建期内联进 PricingCard),改价 = 换 Stripe Price + env,零代码。
import { headers } from 'next/headers'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_ADVISOR_TRIES, FREE_JOBTEXT_TRIES, FREE_MATCH_JOBS_PER_DAY, PRO_ADVISOR_DAILY } from '@/lib/plan'
import { PricingView } from './PricingView'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const user = await getUser(await headers())
  return (
    <PricingView
      loggedIn={!!user}
      pro={isPro(user)}
      caps={{ advisor: FREE_ADVISOR_TRIES, jobtext: FREE_JOBTEXT_TRIES, match: FREE_MATCH_JOBS_PER_DAY, proAdvisor: PRO_ADVISOR_DAILY }}
    />
  )
}
