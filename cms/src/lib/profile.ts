/**
 * users.profile(Payload `type:'group'`)的唯一写入口(E11-08 §3 ②)。
 * 调用点不再自己拼整组 —— 旧写法 `data:{ profile:{ ...prof, x } }` 靠展开保命,
 * 任何一次给 `getUser` 加 select 都会顺手清空用户档案。
 *
 * ## 结论:group 里「未出现在 data 的字段」是被**跳过**,不是被置 NULL
 * (2026-08-04 读 node_modules 源码确认,所以 patch **不需要先取全量再合并**,直接写这几个键就安全。)
 *
 * 证据(版本随 lockfile,升级 Payload 时重验这四处):
 * 1. `payload/dist/fields/hooks/beforeChange/index.js` — `beforeChange` 返回的是 incomingData 的深拷贝,
 *    **不从 originalDoc 回填**(defaultValue 也只在 create 生效)→ 到 DB 的就是这份 patch 本身;
 * 2. `@payloadcms/drizzle/dist/transform/write/traverseFields.js:184` — group 分支按 **schema 声明的字段**
 *    去 data 里取值(`fields: field.flattenedFields`),不是遍历 data 的键 → 未声明的键静默丢弃、不报错
 *    (这就是 `matchUses` 之前恒 undefined、免费日限闸门形同虚设的根因);
 * 3. 同文件 ~L598 `if (typeof formattedValue !== 'undefined')` 才写进 row → data 里没有的字段根本不进 row;
 * 4. `@payloadcms/drizzle/dist/upsertRow/index.js:157` — update 走 `onConflictDoUpdate: { set: rowToInsert.row }`,
 *    SET 只列 row 里存在的列 → 其余 `profile_*` 列原值不动。
 *
 * 成败语义:helper **抛**,调用点自己决定吞不吞(路由按现有语义 catch + 留痕)。
 */
import { getPayload } from 'payload'

import config from '@/payload.config'

/** collection 里声明过的 profile 键(单一来源:`collections/Users.ts` 的 profile group)。 */
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

export type ProfilePatch = {
  currentStatus?: string | null
  nocCodes?: string[] | null
  clb?: number | null
  crs?: number | null
  targetProvinces?: string[] | null
  pgwpMonthsLeft?: number | null
  profileUpdatedAt?: Date | string | null
  resumeText?: string | null
  resumeSavedAt?: Date | string | null
  matchUses?: string | null
}

/**
 * 局部更新某个用户的 profile:只写 patch 里给到的键,其余 profile 字段保持原值(见顶部证据 1-4)。
 * 未在 collection 声明的键会被丢掉并留痕 —— 静默丢弃是本批修的那颗雷,不能再重演。
 * 失败抛出,由调用点决定吞还是回错。
 */
export async function patchProfile(userId: string | number, patch: ProfilePatch): Promise<void> {
  const allowed = PROFILE_KEYS as readonly string[]
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (allowed.includes(k)) data[k] = v
    else console.log(`[patchProfile] 丢弃未声明的 profile 键 "${k}"(先在 collections/Users.ts 声明,再手写 docs/sql 加列)`)
  }
  if (Object.keys(data).length === 0) return

  const payload = await getPayload({ config: await config })
  await payload.update({ collection: 'users', id: userId, data: { profile: data } as any })
}
