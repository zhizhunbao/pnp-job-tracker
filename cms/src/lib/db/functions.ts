/**
 * 数据库层的纯函数:从 payload 结构里摸池。
 *
 * 行相关的两样(默认值词汇表、`queryRows` 管道)2026-08-22 挪进 `./rows.ts`
 * (十件套的第十个抽屉);本文件只剩与「行」无关的纯函数。
 *
 * 🔵 **本文件不沾 payload 运行时,浏览器也能打包** —— 真去连库的那半在 `./pool.ts`。
 *
 * @author Frank
 * @time 2026-08-21 15:20:30
 */

import type { DbPool, PayloadWithPool } from './types'

/**
 * 从 payload 形状的对象里摸池。入参必须是真实例(调用方手里若可能没有,先自己判);
 * 回 null 只表示一件事:这个实例不是 postgres adapter、身上没有池 —— 抛不抛人话
 * 由调用方(下面的 `dbOf`)决定,本函数不造错。
 */
export function poolOf(payload: PayloadWithPool): DbPool | null {
  if (payload.db == null || payload.db.pool == null) {
    return null
  }
  return payload.db.pool
}

/**
 * 从已有的 payload 实例取池。取不到直接抛 —— 60 个调用点里只有 4 个做了 `if (!pool)` 兜底,
 * 其余 56 个是「拿到就 query」,池若为空它们会炸在 `Cannot read property 'query' of undefined`,
 * 谁也看不出是数据库没连上。宁可抛一句人话。
 * 入参同 poolOf 收 `PayloadWithPool`(结构类型,Payload 实例天然满足),unknown 退役。
 * (原住 server.ts;2026-08-21「门里只许转发」闸立起后搬来 —— 它不沾 payload 运行时,住得进纯函数抽屉。)
 */
export function dbOf(payload: PayloadWithPool): DbPool {
  const pool = poolOf(payload)
  if (pool == null) {
    throw new Error('database: payload.db.pool 不存在 —— 数据库没连上,或 payload 用的不是 postgres adapter')
  }
  return pool
}
