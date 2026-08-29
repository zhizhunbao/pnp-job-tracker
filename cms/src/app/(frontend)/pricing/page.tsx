/**
 * 定价页(E5-01)的门:服务端认人 + 读 lib/quota 的档位数 → 拼组件。
 * 对照表与分层的单一来源就是 lib/quota 的那几个常量,别在别处再写一份岔开的数字。
 * 展示价走 env NEXT_PUBLIC_PRICE_DISPLAY("CA$19,CA$39",构建期内联进 PricingCard),
 * 改价 = 换 Stripe Price + env,零代码。
 * 档位数**从服务端随 props 下发**:客户端直接 import lib/quota 拿到的是构建期默认值,
 * env 改了不跟着走(lib/quota 的桶注释里记着这条)。
 * 2026-08-28 换装批:页面改造成「纯拼装门」(闸 local/page-compose-only + page-no-logic)
 * —— 排版全部下沉进 components/pricing/,壳件(整页外框 Frame / 顶栏 / 页脚)拼装收回
 * 本门(Frank「组装只许在 (frontend) 页面门里」,样张 account/companies/news)。
 *
 * @author Frank
 * @time 2026-08-28 12:45:00
 */
import { headers } from 'next/headers'
import { FREE_ADVISOR_TRIES, FREE_JOBTEXT_TRIES, FREE_MATCH_JOBS_PER_DAY, PRO_ADVISOR_DAILY } from '@/lib/quota'
import { getUser, isPro } from '@/lib/quota/server'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Pricing } from '@/components/pricing'
import { Frame } from '@/components/shell'

export const dynamic = 'force-dynamic'

/**
 * 定价页的门:认人 + 档位数拼装,没有别的。
 *
 * @returns 整页。
 */
export default async function PricingPage() {
  const user = await getUser(await headers())
  return (
    <Frame>
      <Header />
      <Pricing loggedIn={user != null}
        pro={isPro(user)}
        caps={{
          advisor: FREE_ADVISOR_TRIES,
          jobtext: FREE_JOBTEXT_TRIES,
          match: FREE_MATCH_JOBS_PER_DAY,
          proAdvisor: PRO_ADVISOR_DAILY,
        }} />
      <Footer />
    </Frame>
  )
}
