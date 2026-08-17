// 数据库连接的唯一入口。
//
// ⚠️ **本模块不创建连接池**,只负责「怎么拿到那一个池」。池归 Payload 的 postgres adapter 管
//    (`payload.db.pool`)。自己再 `new Pool()` = 同一个库上并存两套连接 —— 那正是把生产打成 500
//    的那条路(踩过:多开一个 dev 实例就够把池子打爆)。要改池参数去 payload.config,别在这儿开第二个。
//
// 08-17 之前,取池这句散在 **60 处**各写各的,其中 **50 处是 `payload.db as any`**:
// 类型一 any,列名写错、参数个数对不上、把 rows 当别的用——TS 全程不吭声,只能等生产报错。
// 收成这里之后,那句 cast 只剩本文件这一处,别处一律走下面的函数。
//
// 类型是**结构类型**不是 pg 的 Pool:pg 不是本项目的直接依赖(经 @payloadcms/db-postgres 传递进来),
// @types/pg 也没装。只声明我们真用到的那点面,零新依赖。
import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * 能执行 SQL 的连接。
 *
 * **故意不做成泛型方法**:写成 `query<R>(…): Promise<{rows: R[]}>` 等于承诺「你挑 R,我还你 R[]」,
 * 那么单测里那种固定形状的假池(`() => ({ rows: Record<string, unknown>[] })`)就永远满足不了它 ——
 * 实测 employersBoard 单测直接编不过。要按查询定行类型,用下面的 query() 助手,别动这个接口。
 *
 * rows 是 any[]:现有 146 处调用全按 `r.name` 这样直接点属性写的。收严是另一件事,
 * 该在 sql.ts 收查询时**逐条**补返回类型(一条查询一个类型,补得准也验得动),
 * 不该跟「统一连接」混一批 —— 混了出问题没法二分。
 * rowCount 可选:真 pg 结果一定带,但只读 rows 的调用点与假池不该被逼着造一个;
 * 唯一的消费者 seed/route 本来就写的是 `r.rowCount ?? 0`。
 */
export type Db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>
}

/** 查一次直接给行,顺带按查询声明行类型:`await query<JobRow>(db, sql, params)`。sql.ts 的公共出口。 */
export async function query<R = Record<string, unknown>>(db: Db, sql: string, params?: unknown[]): Promise<R[]> {
  return (await db.query(sql, params)).rows as R[]
}
/** 事务用的独占连接。**用完必须 release** —— 别自己 connect,走 withTransaction。 */
export type DbClient = Db & { release: () => void }
/** 连接池:能直接查,也能借出独占连接。 */
export type DbPool = Db & { connect: () => Promise<DbClient> }

/** payload 实例 → 池。分开写是因为绝大多数调用点手里已经有 payload 了,不该为拿个池再要一次。 */
function poolOf(payload: unknown): DbPool | null {
  const db = (payload as { db?: { pool?: DbPool } } | null)?.db
  return db?.pool ?? null
}

/**
 * 从已有的 payload 实例取池。取不到直接抛 —— 60 个调用点里只有 4 个做了 `if (!pool)` 兜底,
 * 其余 56 个是「拿到就 query」,池若为空它们会炸在 `Cannot read property 'query' of undefined`,
 * 谁也看不出是数据库没连上。宁可抛一句人话。要兜底的用 dbOrNull。
 */
export function dbOf(payload: unknown): DbPool {
  const pool = poolOf(payload)
  if (!pool) throw new Error('database: payload.db.pool 不存在 —— 数据库没连上,或 payload 用的不是 postgres adapter')
  return pool
}

/** 同上但取不到给 null:留给「查不到就退空态」的少数调用点(占卜类聚合、可降级的侧栏)。 */
export function dbOrNull(payload: unknown): DbPool | null {
  return poolOf(payload)
}

/**
 * 手里没有 payload 实例时用这个。
 * getPayload 自身按 config 记忆化,重复调用拿的是同一个实例、同一个池,不会多开连接。
 */
export async function getDb(): Promise<DbPool> {
  return dbOf(await getPayload({ config: await config }))
}

/**
 * 单连接 + 单事务:回调抛错整体 ROLLBACK,**连接一定归还**(finally release)。
 * seed 灌库靠它保证原子性 —— 老逐行版没有事务,失败会留半写状态。
 */
export async function withTransaction<T>(fn: (client: DbClient) => Promise<T>, pool?: DbPool): Promise<T> {
  const p = pool ?? (await getDb())
  const client = await p.connect()
  try {
    await client.query('BEGIN')
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (e) {
    await client.query('ROLLBACK').catch(() => { /* 回滚都失败:原错更重要,别用它盖掉 */ })
    throw e
  } finally {
    client.release()
  }
}
