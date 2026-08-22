/**
 * 外部原料 → 本域形状(第十抽屉)。quota 没有 SQL —— 这个域的「原始行」是
 * payload.auth 交回来的用户对象;值级判空住这儿,functions 拿到的入参一律已有效
 * (2026-08-22 Frank 拍板)。
 *
 * @author Frank
 * @time 2026-08-22 18:00:00
 */

import type { MaybeRawUser, MaybeUser } from './types'

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
 * @param u payload 交回来的用户。
 * @returns 会话用户;没登录是 null。
 */
export function toSessionUser(u: MaybeRawUser): MaybeUser {
  if (u == null) {
    return null
  }
  let email = ''
  if (u.email != null) {
    email = u.email
  }
  let role: string | null = null
  if (u.role != null) {
    role = u.role
  }
  let proUntil: string | null = null
  if (u.proUntil != null) {
    proUntil = u.proUntil
  }
  let profile = null
  if (u.profile != null) {
    profile = u.profile
  }
  return { id: u.id, email: email, role: role, proUntil: proUntil, profile: profile }
}
