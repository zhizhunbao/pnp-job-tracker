// 数据库层:连接 + **通用** CRUD。
//
// 本文件的铁律:**不认识任何一张表,不含一句业务 SQL**。
// 它只提供「怎么执行」的能力(拿连接、跑语句、开事务、批量插入);
// 「执行什么」全在 ./sql.ts。想在这儿看到 `FROM jobs` 就是放错地方了。
//
// ⚠️ **不创建连接池**,只负责「怎么拿到那一个池」。池归 Payload 的 postgres adapter(`payload.db.pool`)。
//    自己再 new 一个 = 同一个库上并存两套连接 —— 那正是把生产打成 500 的那条路
//    (踩过:多开一个 dev 实例就够把池子打爆)。要改池参数去 payload.config,别在这儿开第二个。
//
// 08-17 之前,取池那句散在 **60 处**各写各的,其中 **50 处是 `payload.db as any`**:
// 类型一 any,列名写错、参数个数对不上,TS 全程不吭声,只能等生产报错。收成这里之后只剩本文件一处。
//
// 类型是**结构类型**不是 pg 的 Pool:pg 不是本项目的直接依赖(经 @payloadcms/db-postgres 传递进来),
// @types/pg 也没装。只声明我们真用到的那点面,零新依赖。
import { getPayload } from 'payload'

import config from '@/payload.config'

// ── 连接 ────────────────────────────────────────────────────────────────────

/**
 * 能执行 SQL 的连接。
 *
 * **故意不做成泛型方法**:写成 `query<R>(…): Promise<{rows: R[]}>` 等于承诺「你挑 R,我还你 R[]」,
 * 那么单测里固定形状的假池(`() => ({ rows: Record<string, unknown>[] })`)就永远满足不了它 ——
 * 实测 employersBoard 单测直接编不过。要按查询定行类型,用下面 select<R>() 那组助手。
 *
 * rowCount 可选:真 pg 结果一定带,但只读 rows 的调用点与假池不该被逼着造一个。
 */
export type Db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>
}
/** 事务用的独占连接。**用完必须 release**(先例:seed/route.ts 的事务体,BEGIN/COMMIT/ROLLBACK + finally release)。 */
export type DbClient = Db & { release: () => void }
/** 连接池:能直接查,也能借出独占连接。 */
type DbPool = Db & { connect: () => Promise<DbClient> }

function poolOf(payload: unknown): DbPool | null {
  const db = (payload as { db?: { pool?: DbPool } } | null)?.db
  return db?.pool ?? null
}

/**
 * 从已有的 payload 实例取池。取不到直接抛 —— 60 个调用点里只有 4 个做了 `if (!pool)` 兜底,
 * 其余 56 个是「拿到就 query」,池若为空它们会炸在 `Cannot read property 'query' of undefined`,
 * 谁也看不出是数据库没连上。宁可抛一句人话。
 */
export function dbOf(payload: unknown): DbPool {
  const pool = poolOf(payload)
  if (!pool) throw new Error('database: payload.db.pool 不存在 —— 数据库没连上,或 payload 用的不是 postgres adapter')
  return pool
}

/**
 * 手里没有 payload 实例时用这个。
 * getPayload 自身按 config 记忆化,重复调用拿的是同一个实例、同一个池,不会多开连接。
 */
export async function getDb(): Promise<DbPool> {
  return dbOf(await getPayload({ config: await config }))
}

// ── 通用 CRUD ───────────────────────────────────────────────────────────────
// 一律「语句 + 参数」进,结果出。语句从 ./sql.ts 拿,本区不生产业务 SQL。
// db 省略 = 自己 getDb();页面/路由手里已有池时传进来,省一次 getPayload。

