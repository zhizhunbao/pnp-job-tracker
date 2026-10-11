/**
 * 配额域的**服务端**门 —— 认人、数用量、下闸(getUser 连库,浏览器不该拿到)。
 * 门里只有转发(闸 door-forward-only)。
 * 2026-10-10 Frank「删吧」(「今日待投 / 智能投递」整条撤):AI 写信试用账那组(loadTrial / markTrial / 三判)最后的消费者是智能投递,随之删;
 * ai_trials 表与数据不动。
 *
 * 🔴 端点闸统一走 `freeGate`,别在路由里自己拼 isPro + checkLimit —— 那是三处各写一遍的老路。
 *
 * @author Frank
 * @time 2026-08-22 18:00:00
 */

export { checkLimit, denyBodyOf, freeGate, getUser, getUserOrNull, ipOf, isAdmin, isPro, usedToday } from './functions'
export type { MaybeUser, SessionUser } from './types'
