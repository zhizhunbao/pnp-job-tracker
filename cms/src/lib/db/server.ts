/**
 * 数据库层的**服务端**门:怎么拿到那一个连接池。沾 payload,浏览器包一碰就炸,
 * `'use client'` 文件只许对本门 `import type`(闸在 eslint.config.mjs)。
 *
 * ⚠️ **不创建连接池**,只负责「怎么拿到那一个池」。池归 Payload 的 postgres adapter
 * (`payload.db.pool`)。自己再 new 一个 = 同一个库上并存两套连接 —— 那正是把生产
 * 打成 500 的那条路(踩过:多开一个 dev 实例就够把池子打爆)。要改池参数去
 * payload.config,别在这儿开第二个。
 *
 * 🔴 **取池的收拢只做完了一半 —— 别照着旧注释以为已经收完了**(2026-08-18 复核):
 *    · SQL 文本那一半**做成了**:40+ 个文件从 `./sql.ts` 取语句;
 *    · 取池那一半**没迁**:`(payload.db as any).pool` 仍在 40 个文件、49 处。
 *      `as any` 的代价照旧:列名写错、参数个数对不上,TS 全程不吭声,只能等生产报错。
 *      迁移=默认值架构批 ②(2026-08-21 立项),迁完删这段。
 *    ⚠️ 先前这里还有一组 `select<R>()` / `selectOne` / `dbOrNull` 助手,在第 2 批死代码
 *    清除(`ba057f84`)里按「零消费者」删掉了 —— 要补就连调用点一起补,别只把它们加回来。
 *
 * @author Frank
 * @time 2026-08-21 15:21:00
 */

import { getPayload } from 'payload'

import config from '@/payload.config'
import { poolOf } from './functions'
import type { DbPool, PayloadWithPool } from './types'

/**
 * 从已有的 payload 实例取池。取不到直接抛 —— 60 个调用点里只有 4 个做了 `if (!pool)` 兜底,
 * 其余 56 个是「拿到就 query」,池若为空它们会炸在 `Cannot read property 'query' of undefined`,
 * 谁也看不出是数据库没连上。宁可抛一句人话。
 * 入参同 poolOf 收 `PayloadWithPool`(结构类型,Payload 实例天然满足),unknown 退役。
 */
export function dbOf(payload: PayloadWithPool): DbPool {
  const pool = poolOf(payload)
  if (!pool) {
throw new Error('database: payload.db.pool 不存在 —— 数据库没连上,或 payload 用的不是 postgres adapter')
}
  return pool
}

/**
 * 手里没有 payload 实例时用这个。
 * getPayload 自身按 config 记忆化,重复调用拿的是同一个实例、同一个池,不会多开连接。
 */
export async function getDb(): Promise<DbPool> {
  return dbOf(await getPayload({ config: await config }))
}
