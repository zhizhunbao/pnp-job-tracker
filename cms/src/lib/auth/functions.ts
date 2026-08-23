/**
 * 会话域的行为:「这个请求有没有会话身份」这一件事。
 * 认「人是谁」(解 token → 用户)在 quota 的 getUser —— 那是连库的事;
 * 本域只看票据在不在,首帧 SSR 用它决定渲染登录态壳还是匿名壳,零连库。
 * (2026-08-23 Frank 拍板单独立域:auth 不并进 quota —— 配额是「放不放行」,会话是「是谁来了」。)
 *
 * @author Frank
 * @time 2026-08-23 00:10:00
 */

import { cookies } from 'next/headers'
import { SSR_TOKEN_COOKIE } from './constants'
import type { HasSessionOut } from './types'

/**
 * 首帧有没有会话票据。取不到 cookie 的极端情形按匿名占位 ——
 * 匿名是绝大多数流量,猜错的代价最小。
 *
 * @returns 有票据 true。
 */
export async function ssrHasSession(): HasSessionOut {
  try {
    const hit = (await cookies()).get(SSR_TOKEN_COOKIE)
    if (hit == null || hit.value === '') {
      return false
    }
    return true
  } catch {
    return false
  }
}
