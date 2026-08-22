/**
 * 数据库层的纯函数:从 payload 结构里摸池。
 *
 * 行相关的两样(默认值词汇表、`queryRows` 管道)2026-08-22 挪进 `./rows.ts`
 * (十件套的第十个抽屉);本文件只剩与「行」无关的纯函数。
 *
 * 🔵 **本文件不沾 payload 运行时,浏览器也能打包** —— 真去连库的那半在 `./server.ts`。
 *
 * @author Frank
 * @time 2026-08-21 15:20:30
 */

import type { DbPool, PayloadWithPool } from './types'

/**
 * 从 payload 形状的对象里摸池。入参必须是真实例(调用方手里若可能没有,先自己判);
 * 回 null 只表示一件事:这个实例不是 postgres adapter、身上没有池 —— 抛不抛人话
 * 由调用方(`server.ts` 的 dbOf)决定,本文件是纯函数不造错。
 */
export function poolOf(payload: PayloadWithPool): DbPool | null {
  if (payload.db == null || payload.db.pool == null) {
    return null
  }
  return payload.db.pool
}
