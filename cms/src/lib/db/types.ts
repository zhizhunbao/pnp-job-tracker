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
 * 一次查询的结果面。
 */
export type QueryResult = {
  /**
   * 行。any 是照实说:运行时保证只能靠域里的行映射函数,泛型装不出来。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[]

  /**
   * 命中行数。可选:真 pg 结果一定带,但只读 rows 的调用点与单测假池不该被逼着造一个。
   */
  rowCount?: number | null
}

/**
 * payload 实例在本层眼里的最小形状 —— 只为摸到池,别的字段一概不认识。
 */
export type PayloadWithPool = {
  /**
   * payload 的 db adapter。
   */
  db?: {
    /**
     * postgres adapter 挂的连接池。用别的 adapter 时没有这一格 —— dbOf 会抛人话。
     */
    pool?: DbPool
  }
}

/**
 * 一个绑定参数($1…)。只列我们真往库里递的几种:文本、数字、布尔、null,
 * 以及 `= ANY($n)` 用的文本/数字数组。想递别的(对象、Date)先问自己为什么 ——
 * 原先这里是 `unknown[]`,什么都塞得进去,2026-08-21 Frank 抓包后收窄。
 */
export type SqlParam = string | number | boolean | null | string[] | number[]

/**
 * 能执行 SQL 的连接。
 *
 * **故意不做成泛型方法**:写成 `query<R>(…): Promise<{rows: R[]}>` 等于承诺「你挑 R,我还你 R[]」,
 * 那么单测里固定形状的假池(`() => ({ rows: Record<string, unknown>[] })`)就永远满足不了它 ——
 * 实测 employersBoard 单测直接编不过。行的形状与默认值按「一条 SQL 一个行形状 + 一个映射函数」
 * 在消费它的域里收(docs/implementation/默认值架构-20260821.md),本层不撒谎也不代劳。
 */
export type Db = {
  /**
   * 跑一条语句。params 可省是 db 边界豁免:三分之一的语句是零参固定文本,
   * pg 自己的签名也是这个形状。
   */
  query: (sql: string, params?: SqlParam[]) => Promise<QueryResult>
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
