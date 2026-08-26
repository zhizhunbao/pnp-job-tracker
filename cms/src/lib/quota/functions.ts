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

import { PAYMENT_REQUIRED, TOO_MANY } from '../http'
import { text } from '../db'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { DENY_IP, DENY_USER,
  ANON_DAILY_TRIES, COMMA, FREE_DAILY_TRIES, HDR_FREE_LEFT, HDR_FWD, IP_LOCAL, KEY_FREE_IP, KEY_FREE_USER,
  TEXT_RATE_LIMITED, TEXT_UPGRADE,
} from './constants'
import { CACHE } from './variables'
import type { MaybeDenyBody, FreeGated, FreeGateIn, MaybeRawUser, MaybeUser, QuotaPairs, ReqHeaders, ReqLike, UserOut } from './types'

/**
 * 同 getUser，但鉴权层抛错当未登录（查挂不该把业务端点打成 500；
 * 匿名可用的端点落到匿名帽）。原先三个路由各自写 catch 具名函数，
 * 同一个决定拄了三遍 —— 2026-08-23 收进本域。
 *
 * @param headers 请求头。
 * @returns 会话用户；未登录或鉴权层抛错都是 null。
 */
export async function getUserOrNull(headers: ReqHeaders): UserOut {
  try {
    return await getUser(headers)
  } catch {
    return null
  }
}

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
 * 客户端 IP(caddy 反代注入的转发头,首跳=真实客户端;取不到给兜底值)。
 *
 * @param req 请求。
 * @returns IP 串。
 */
export function ipOf(req: ReqLike): string {
  return ipOfHeaders(req.headers)
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
    return { deny: DENY_USER, left: 0, headers: {} }
  }
  if (user == null && checkLimit([[KEY_FREE_IP + ipOfHeaders(input.headers), ANON_DAILY_TRIES]]) === false) {
    return { deny: DENY_IP, left: null, headers: {} }
  }
  let left: number | null = null
  if (user != null && pro === false) {
    left = Math.max(0, FREE_DAILY_TRIES - usedToday(KEY_FREE_USER + String(user.id)))
  }
  if (left != null) {
    return { deny: null, left: left, headers: { [HDR_FREE_LEFT]: String(left) } }
  }
  return { deny: null, left: null, headers: {} }
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
  for (const [i, q] of quotas.entries()) {
    const c = cur[i]
    if (c != null && c >= q[1]) {
      return false
    }
  }
  for (const [i, q] of quotas.entries()) {
    let c = 0
    const seen = cur[i]
    if (seen != null) {
      c = seen
    }
    CACHE.buckets.set(q[0], { day: today, n: c + 1 })
  }
  return true
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
 * 拦截判定 → 响应素材(纯映射;路由层拿它去 http 叶的 textResponseOf 拼 Response)。
 *
 * @param gate freeGate 的裁决。
 * @returns 素材;放行 null。
 */
export function denyBodyOf(gate: FreeGated): MaybeDenyBody {
  if (gate.deny === DENY_USER) {
    return { status: PAYMENT_REQUIRED, text: TEXT_UPGRADE }
  }
  if (gate.deny === DENY_IP) {
    return { status: TOO_MANY, text: TEXT_RATE_LIMITED }
  }
  return null
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
  const head = fwd.split(COMMA)[0]
  if (head == null) {
    return IP_LOCAL
  }
  const first = head.trim()
  if (first === '') {
    return IP_LOCAL
  }
  return first
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * 词汇:今天的 ISO 日期(计数桶按它分日)。
 *
 * @returns 'YYYY-MM-DD'。
 */
export function day(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * payload.auth 的用户 → 会话用户(缺席格 undefined 在这儿 `== null` 一网收成 null;
 * 没登录照旧 null)。
 *
 * 值级清洗走 db 词汇表(2026-08-21 定的四个词),不手搓:
 * `text()` = 「文本格空值折空串」,口径全站一份。手写成 `let email = ''` 加一段 if
 * 是把同一个决定又抄一遍 —— 抄一遍就多一处会走散的口径。
 * role / proUntil / profile 直接透传:它们的 `| null` 是**真的没有**(库里就可空),
 * 折成别的值等于替库编事实。
 *
 * @param u payload 交回来的用户。
 * @returns 会话用户;没登录是 null。
 */
export function toSessionUser(u: MaybeRawUser): MaybeUser {
  if (u == null) {
    return null
  }
  return { id: u.id, email: text(u.email), role: u.role, proUntil: u.proUntil, profile: u.profile }
}
