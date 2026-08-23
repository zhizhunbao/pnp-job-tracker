/**
 * 配额域的**服务端**门 —— 认人、数用量、下闸(getUser 连库,浏览器不该拿到)。
 * 门里只有转发(闸 door-forward-only)。
 *
 * 🔴 端点闸统一走 `freeGate`,别在路由里自己拼 isPro + checkLimit —— 那是三处各写一遍的老路。
 *
 * @author Frank
 * @time 2026-08-22 18:00:00
 */

export { checkLimit, freeGate, getUser, getUserOrNull, ipOf, isPro, usedToday } from './functions'
export type { MaybeUser, SessionUser } from './types'
