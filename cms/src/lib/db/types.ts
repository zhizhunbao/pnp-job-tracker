/**
 * 数据库层的形状。**只有类型,一个运行时值都没有。**
 *
 * 类型是**结构类型**不是 pg 的 Pool:pg 不是本项目的直接依赖(经 @payloadcms/db-postgres
 * 传递进来),@types/pg 也没装。只声明我们真用到的那点面,零新依赖。
 *
 * @author Frank
 * @time 2026-08-21 15:20:00
 */

/**
 * 能执行 SQL 的连接。
 *
 * **故意不做成泛型方法**:写成 `query<R>(…): Promise<{rows: R[]}>` 等于承诺「你挑 R,我还你 R[]」,
 * 那么单测里固定形状的假池(`() => ({ rows: Record<string, unknown>[] })`)就永远满足不了它 ——
 * 实测 employersBoard 单测直接编不过。行的形状与默认值按「一条 SQL 一个行形状 + 一个映射函数」
 * 在消费它的域里收(docs/implementation/默认值架构-20260821.md),本层不撒谎也不代劳。
 *
 * rowCount 可选:真 pg 结果一定带,但只读 rows 的调用点与假池不该被逼着造一个。
 */
export type Db = {
  /**
   * 跑一条语句。rows 是 any:运行时保证只能靠域里的行映射函数,泛型装不出来。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>
}

/**
 * 事务用的独占连接。**用完必须 release**(先例:seed/route.ts 的事务体,
 * BEGIN/COMMIT/ROLLBACK + finally release)。
 */
export type DbClient = Db & {
  /**
   * 归还连接。漏掉它,池子迟早被借空(生产 500 那条老路)。
   */
  release: () => void
}

/**
 * 连接池:能直接查,也能借出独占连接。
 */
export type DbPool = Db & {
  /**
   * 借一个独占连接(事务用)。
   */
  connect: () => Promise<DbClient>
}
