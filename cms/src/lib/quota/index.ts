/**
 * 配额域的桶 —— **客户端也安全的那半:只有数字**(免费/Pro 各项上限)。
 * 门里只有转发(闸 door-forward-only)。
 *
 * 🔴 判断与取数那半在 `./server`(getUser 连库、freeGate/rateLimit 要请求上下文)。
 * `PricingModal.tsx` 是 `'use client'` 且取的是**值**,混一个桶就会把连接池整条链
 * 拉进浏览器包 —— tsc 全绿,build 才炸(lib/jobs 08-18 实撞)。
 * ⚠️ 客户端拿到的是**构建期的默认值**;真用 env 改分层数字时记得 NEXT_PUBLIC 化或改走 props。
 *
 * @author Frank
 * @time 2026-08-22 18:00:00
 */

export type { DenyBody, FreeGated, MaybeUser, SessionUser } from './types'
export {
  ALERT_MATCH_LEVEL, FREE_ADVISOR_TRIES, FREE_DAILY_TRIES, FREE_JOBTEXT_TRIES,
  FREE_MATCH_JOBS_PER_DAY, FREE_SAVED_SEARCHES, PRO_ADVISOR_DAILY, PRO_CHAT_DAILY,
  PRO_SAVED_SEARCHES, SAVED_JOBS_CAP,
} from './constants'
