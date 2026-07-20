// #124 统一免费额度池(2026-07-21 Frank「统一一个不就完事了,整这么多用户不会嫌烦吗」):
// jobtext / advisor / scoredetail / resume 四端点共用**一个每日池**——用户全站只看一个数。
// 单价一律 1 次/调用(顾问已切朋友模型 #105,按成本分池的老理由不再成立);Pro 不限(advisor 全局帽/Pro 日帽照旧)。
// 匿名=IP 池且低于登录额度(匿名不得高于免费注册额度,倒挂劝退注册——第 2 轮 #5 教训)。
// 旧分池常量(FREE_ADVISOR_TRIES 等)在 lib/plan 收敛为本池别名,定价页数字自动一致。
import { checkLimit, ipOf, usedToday } from './rateLimit'
import { isPro } from './entitlement'
import { FREE_DAILY_TRIES } from './plan'

export const ANON_DAILY_TRIES = Number(process.env.ANON_DAILY_TRIES || 10)

/** 统一闸:免费登录超池 → 402(前端升级卡);匿名超 IP 池 → 429;放行时给剩余数(headers 直接展开进响应)。 */
export function freeGate(user: any, req: { headers: Headers }): { block?: Response; left: number | null; headers: Record<string, string> } {
  const pro = isPro(user)
  if (user && !pro && !checkLimit([[`free:u:${user.id}`, FREE_DAILY_TRIES]])) {
    return { block: new Response('upgrade required', { status: 402 }), left: 0, headers: {} }
  }
  if (!user && !checkLimit([[`free:${ipOf(req as any)}`, ANON_DAILY_TRIES]])) {
    return { block: new Response('rate limited', { status: 429 }), left: null, headers: {} }
  }
  const left = user && !pro ? Math.max(0, FREE_DAILY_TRIES - usedToday(`free:u:${user.id}`)) : null
  return { left, headers: left != null ? { 'X-Free-Left': String(left) } : {} }
}
