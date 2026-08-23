/**
 * 档案域的死值:collection 里声明过的 profile 键(单一来源:`collections/Users.ts` 的
 * profile group;加键先在那边声明、再手写 docs/sql 加列,最后进这张白名单)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * profile group 的合法键。
 */
export const PROFILE_KEYS = [
  'currentStatus',
  'nocCodes',
  'clb',
  'crs',
  'targetProvinces',
  'pgwpMonthsLeft',
  'profileUpdatedAt',
  'resumeText',
  'resumeSavedAt',
  'matchUses',
] as const

/**
 * 目标 collection 名(patch 只写用户表)。
 */
export const USERS = 'users'
