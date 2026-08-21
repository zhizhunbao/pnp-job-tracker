// 数据库层:**怎么拿到那一个连接池**。
//
// 本文件的铁律:**不认识任何一张表,不含一句业务 SQL**。
// 它只提供「怎么执行」的能力(拿连接、跑语句、开事务、批量插入);
// 「执行什么」全在 ./sql.ts。想在这儿看到 `FROM jobs` 就是放错地方了。
//
// ⚠️ **不创建连接池**,只负责「怎么拿到那一个池」。池归 Payload 的 postgres adapter(`payload.db.pool`)。
//    自己再 new 一个 = 同一个库上并存两套连接 —— 那正是把生产打成 500 的那条路
//    (踩过:多开一个 dev 实例就够把池子打爆)。要改池参数去 payload.config,别在这儿开第二个。
//
// 🔴 **这次收拢只做完了一半 —— 别照着旧注释以为已经收完了**(2026-08-18 复核):
//    · SQL 文本那一半**做成了**:45 个文件从 ./sql.ts 取语句;
//    · 取池那一半**没迁**:`dbOf`/`getDb` 全站只有 2 个运行时消费者(seed 开事务、instrumentation),
//      而 `(payload.db as any).pool` 仍在 **40 个文件、49 处**(08-17 立项时数的是 60 处、其中 50 处 as any)。
//    `as any` 的代价照旧:列名写错、参数个数对不上,TS 全程不吭声,只能等生产报错。
//    ⚠️ 先前这里还有一组 `select<R>()` / `selectOne` / `dbOrNull` 助手,在第 2 批死代码清除(`ba057f84`)里
//    按「零消费者」删掉了 —— **零消费者的原因正是调用点从没迁过来**。要补就连调用点一起补,别只把它们加回来。
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
 * 实测 employersBoard 单测直接编不过。要按查询定行类型,就在域文件里就地断言(`rows as JobRow[]`)——
 * 本文件**不再提供** `select<R>()` 那组助手(为什么,见文件头)。
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

// ── 行值收窄:默认值词汇表(2026-08-21 Frank 立)────────────────────────────
// 行映射函数里每一格的空值决策用**词的选择**说话,不再散写 `String(x ?? '')` 三元:
// 哪格用哪个词是一格一判的语义决定,review 时看词就知道对错,红线变成 greppable。

/**
 * 库里的脏字符串 → 干净字符串,空值落空串。显示与拼接的兜底,永远无害。
 */
export function text(x: unknown): string {
  return x == null ? '' : String(x)
}

/**
 * 计数 → 数字,空值落 0。**只给「个数」类的列用** —— 「一个都没有」本身就是答案,0 无害。
 */
export function count(x: unknown): number {
  return x == null ? 0 : Number(x)
}

/**
 * 🔴 官方可空的数值 → 保 null。隐私抑制值(「Less than 10」)、没公布的分数线、
 * `rule` 行的阈值 —— 折成 0 就是替官方编数。这类列上看见 `count()` 就是 bug。
 */
export function numOrNull(x: unknown): number | null {
  return x == null ? null : Number(x)
}

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
