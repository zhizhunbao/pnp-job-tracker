'use client'
/**
 * 职位板的顶栏。顶栏本身是全站统一 Header(#65 header 合一,2026-07-18 Frank 拍板;
 * 内联头退役,1320 头轨全站一致),/jobs 特有的两件走 props:「我的匹配」切换态与完整账户区。
 * active:首页就是职位板 —— 原来不传,于是「职位」那项永远不亮(2026-08-17 Frank
 * 「切换到职位的时候,职位没有高亮」);板内切到匹配视图时才改标 match。
 * 差异认账:未登录点「我的账户」由弹框改为 /account 302 回 /?login=1(终点同为登录框)。
 * 2026-08-28 换装批提出成文件 —— 页面门只许拼大写组件,而这颗匹配钮要带三态闸,
 * 所以顶栏连它的闸一起成件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Header } from '@/components/header'
import { useLang } from '@/components/i18n'
import { headerActiveOf } from './functions'
import { useMatchGate } from './hooks'
import { AccountArea } from './accountarea'
import { MatchGate } from './matchgate'
import type { JobsHeaderIn } from './types'

/**
 * 渲染职位板顶栏。
 *
 * @param props 分层态与是不是直链进的匹配视图。
 * @returns 顶栏 + 它的三态闸弹框层。
 */
export function JobsHeader({ plan, matchView }: JobsHeaderIn) {
  const [, , t] = useLang()
  const gate = useMatchGate({ plan, matchView, t })
  return (
    <>
      <Header sticky loggedIn={plan.loggedIn}
        active={headerActiveOf(matchView)}
        matchButton={{ active: matchView, onClick: gate.onToggle }}
        accountArea={<AccountArea t={t} plan={plan} />} />
      <MatchGate g={gate} />
    </>
  )
}
