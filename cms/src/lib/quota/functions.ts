/**
 * 配额域的行为:「一次调用要不要放行」这一件事的三个零件 ——
 * 认人(getUser/isPro)、数得清(ipOf/usedToday/checkLimit)、下闸(freeGate)。
 *
 * 🔴 本文件是**服务端半边**(getUser 是 payload 鉴权的接缝,依赖链上有连接池),
 * 只从 `./server` 门出;`index.ts` 只转发 constants 的数字(浏览器安全的那半)。
 * 🔴 端点闸统一走 `freeGate`,别在路由里自己拼 isPro + checkLimit —— 那是三处各写一遍的老路。
 *
 * @author Frank
 * @time 2026-08-22 18:00:00
 */

import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  ANON_DAILY_TRIES, COMMA, FREE_DAILY_TRIES, HDR_FREE_LEFT, HDR_FWD, IP_LOCAL, KEY_FREE_IP, KEY_FREE_USER,
  TEXT_RATE_LIMITED, TEXT_UPGRADE,
} from './constants'
import { day, toSessionUser } from './rows'
import { CACHE } from './variables'
import type { FreeGated, FreeGateIn, MaybeRawUser, MaybeUser, QuotaPairs, ReqHeaders, ReqLike, UserOut } from './types'

/**
 * 从请求 headers(httpOnly payload-token cookie)解出当前用户;未登录 null。
 * 体内 `as` 是跨边界断言:payload.auth 的用户形状由 payload 定,本域只读 RawUser 那几格,
 * 缺席格在 rows 的 toSessionUser 里当场收。
 *
 * @param headers 请求头。
 * @returns 会话用户;未登录是 null。
 */
export async function getUser(headers: ReqHeaders): UserOut {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })
  return toSessionUser(user as MaybeRawUser)
}

/**
 * 时长包语义:到期日在未来 = Pro。没有订阅状态机。
 *
 * @param user 会话用户(未登录 null)。
 * @returns 是否 Pro 期内。
 */
export function isPro(user: MaybeUser): boolean {
  if (user == null || user.proUntil == null) {
    return false
  }
  return new Date(user.proUntil) > new Date()
}

/**
 * 客户端 IP(caddy 反代注入的转发头,首跳=真实客户端;取不到给兜底值)。
 *
 * @param req 请求。
 * @returns IP 串。
 */
export function ipOf(req: ReqLike): string {
  return ipOfHeaders(req.headers)
}

/**
 * 今日已用次数(只读):试用额度可见化用(第 5 轮 #16)——
 * 用户该知道还剩几次,而不是突然 402。
 *
 * @param key 计数键。
 * @returns 今日次数;没记录是 0。
 */
export function usedToday(key: string): number {
  const b = CACHE.buckets.get(key)
  if (b != null && b.day === day()) {
    return b.n
  }
  return 0
}

/**
 * 多配额位「全有余量才放行并各自 +1」(单线程事件循环内 check+increment 无竞态)。
 *
 * @param quotas 配额位清单(计数键 + 上限)。
 * @returns 放行 true;任一位到顶 false(全体都不 +1)。
 */
export function checkLimit(quotas: QuotaPairs): boolean {
  const today = day()
  const cur: number[] = []
  for (const [key] of quotas) {
    const b = CACHE.buckets.get(key)
    if (b != null && b.day === today) {
      cur.push(b.n)
    } else {
      cur.push(0)
    }
  }
  for (let i = 0; i < quotas.length; i++) {
    if (cur[i] >= quotas[i][1]) {
      return false
    }
  }
  for (let i = 0; i < quotas.length; i++) {
    CACHE.buckets.set(quotas[i][0], { day: today, n: cur[i] + 1 })
  }
  return true
}

/**
 * 统一闸(#124 统一免费额度池):免费登录超池 → 402(前端升级卡);
 * 匿名超 IP 池 → 429;放行时给剩余数(headers 直接展开进响应)。
 * Pro 不限(advisor 全局帽/Pro 日帽照旧,由各路由自己叠)。
 *
 * @param input 当前用户与请求头。
 * @returns 裁决(block 非 null 就直接返回它)。
 */
export function freeGate(input: FreeGateIn): FreeGated {
  const user = input.user
  const pro = isPro(user)
  if (user != null && pro === false && checkLimit([[KEY_FREE_USER + String(user.id), FREE_DAILY_TRIES]]) === false) {
    // eslint-disable-next-line local/no-http-in-functions -- 存量特批：freeGate 的 402/429 拦截体是既有契约（十路由直铺）；改成判定产物由 routes 拼响应，归 api 批②
    return { block: new Response(TEXT_UPGRADE, { status: 402 }), left: 0, headers: {} }
  }
  if (user == null && checkLimit([[KEY_FREE_IP + ipOfHeaders(input.headers), ANON_DAILY_TRIES]]) === false) {
    // eslint-disable-next-line local/no-http-in-functions -- 存量特批：freeGate 的 402/429 拦截体是既有契约（十路由直铺）；改成判定产物由 routes 拼响应，归 api 批②
    return { block: new Response(TEXT_RATE_LIMITED, { status: 429 }), left: null, headers: {} }
  }
  let left: number | null = null
  if (user != null && pro === false) {
    left = Math.max(0, FREE_DAILY_TRIES - usedToday(KEY_FREE_USER + String(user.id)))
  }
  if (left != null) {
    return { block: null, left: left, headers: { [HDR_FREE_LEFT]: String(left) } }
  }
  return { block: null, left: null, headers: {} }
}

/**
 * `ipOf` 的 headers 版(freeGate 只拿得到请求头,不造整个 Request)。
 *
 * @param headers 请求头。
 * @returns IP 串。
 */
function ipOfHeaders(headers: ReqHeaders): string {
  const fwd = headers.get(HDR_FWD)
  if (fwd == null) {
    return IP_LOCAL
  }
  const first = fwd.split(COMMA)[0].trim()
  if (first === '') {
    return IP_LOCAL
  }
  return first
}
