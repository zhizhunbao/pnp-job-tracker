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
 * 🔴 本文件是服务端半边(payload 接缝),只从 `./server` 门出。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { getPayload } from 'payload'

import config from '@/payload.config'
import { log, PROFILE_LOG } from '../log'
import { PROFILE_KEYS, USERS } from './constants'
import type { PatchCell, PatchedOut, PatchProfileIn } from './types'

/**
 * 局部更新某个用户的 profile:只写 patch 里给到的键,其余 profile 字段保持原值(见头部证据 1-4)。
 * 未在 collection 声明的键会被丢掉并留痕 —— 静默丢弃是当初修的那颗雷,不能再重演。
 * 失败抛出,由调用点决定吞还是回错。体内 `as` 是跨边界断言:payload.update 的 data
 * 泛型跟 collection 生成型走,本域只保证键在 PROFILE_KEYS 白名单内。
 *
 * @param input 用户 id 与要写的键。
 * @returns 无(失败抛)。
 */
export async function patchProfile(input: PatchProfileIn): PatchedOut {
  for (const given of Object.keys(input.patch)) {
    if ((PROFILE_KEYS as readonly string[]).includes(given) === false) {
      log({ tag: PROFILE_LOG.tag, text: PROFILE_LOG.dropKey + given })
    }
  }
  const data: Record<string, PatchCell> = {}
  for (const k of PROFILE_KEYS) {
    const v = input.patch[k]
    if (typeof v === 'undefined') {
      continue
    }
    data[k] = v
  }
  if (Object.keys(data).length === 0) {
    return
  }
  const payload = await getPayload({ config: await config })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload.update 的 data 泛型由 collection 生成型定,patch 形状由本域白名单保证
  await payload.update({ collection: USERS, id: input.userId, data: { profile: data } as any })
}
