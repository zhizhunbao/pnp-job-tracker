'use client'
/**
 * 职位板的顶栏。顶栏本身是全站统一 Header(#65 header 合一,2026-07-18 Frank 拍板;
 * 内联头退役,1320 头轨全站一致),/jobs 特有的两件走 props:「我的匹配」切换态与完整账户区。
 * 高亮 2026-08-29 起由 Header 按 pathname 自判(active prop 退役;此前 2026-08-17
 * Frank「切换到职位的时候,职位没有高亮」由本件手标,match/jobs 本就同亮一盏灯)。
 * 差异认账:未登录点「我的账户」由弹框改为 /account 302 回 /?login=1(终点同为登录框)。
 * 2026-08-28 换装批提出成文件 —— 页面门只许拼大写组件,而这颗匹配钮要带三态闸,
 * 所以顶栏连它的闸一起成件。
 * 2026-09-23「我的匹配」整拆(Frank「我觉得 我的匹配 功能也可以去掉。让用户自己筛 职位 直接 收藏」):
 * 匹配钮与它的三态闸随之撤,本件只剩账户区一件特有 prop。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Header } from '@/components/header'
import { useLang } from '@/components/i18n'
import { AccountArea } from './accountarea'
import type { JobsHeaderIn } from './types'

/**
 * 渲染职位板顶栏。
 *
 * @param props 分层态。
 * @returns 顶栏。
 */
export function JobsHeader({ plan }: JobsHeaderIn) {
  const [, , t] = useLang()
  return (
    <Header sticky loggedIn={plan.loggedIn} accountArea={<AccountArea t={t} plan={plan} />} />
  )
}
