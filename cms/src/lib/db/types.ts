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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 行的真形状只有运行时的映射函数能保证,标注装不出来(见上句)
  rows: any[]

  /**
   * 命中行数。null 是 pg 定的(部分语句它就给 null);原先还挂着 `?` 让这格「可以不存在」,
   * 两种「没有」并存 —— 2026-08-21 Frank 抓包后摘掉:假池也逐格交代,写 `rowCount: null`。
   */
  rowCount: number | null
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
 * 能执行 SQL 的连接 —— **原语,不是正门**。
 *
 * 取行走 `queryRows`(SQL + 行映射进,干净的 `R[]` 出,2026-08-21 Frank 定):`query` 本体
 * 保持无类型是因为泛型参数在运行时不存在,标在它头上保证不了任何一格(本层不撒谎);
 * 它留着给 `queryRows` 当脚下原语,以及事务体(seed 的 BEGIN/COMMIT)这类不取行的语句用。
 * 行形状与默认值的设计见 docs/implementation/默认值架构-20260821.md。
 */
export type Db = {
  /**
   * 跑一条语句。params 可省是 db 边界豁免:三分之一的语句是零参固定文本,
   * pg 自己的签名也是这个形状。
   */
  // eslint-disable-next-line local/no-optional -- pg 的签名形状:零参语句不传第二参,跟 pg 保持同形
  query: (sql: string, params?: SqlParam[]) => Promise<QueryResult>
}

/**
 * `queryRows` 的入参:一条 SQL + 它的行映射函数。泛型 `R` 由 `map` 的返回类型定。
 */
export type QueryRowsIn<R> = {
  /**
   * 能查的东西(池或独占连接)。
   */
  db: Db

  /**
   * 固定语句(来自 `./sql`)。
   */
  sql: string

  /**
   * 绑定参数;零参语句显式给空数组(本层自己的契约不留 `?`)。
   */
  params: SqlParam[]

  /**
   * 行映射函数:一行原始行 → 一行干净的 `R`。默认值决策全在它体内(用词汇表),
   * 这就是「返回即可用」的运行时保证。
   */
  map: (row: QueryResult['rows'][number]) => R
}

/**
 * `sql.insertRows` 的入参(seed 批量 INSERT 的拼版面;2026-08-26 mart 形制批)。
 */
export type SqlInsertRowsIn = {
  /**
   * 目标表名。
   */
  table: string

  /**
   * 列清单(占位符按 行数 × 列数 铺开)。
   */
  cols: readonly string[]

  /**
   * 本批行数。
   */
  rowCount: number

  /**
   * ON CONFLICT 等后缀;无后缀传空串。
   */
  suffix: string
}

/**
 * `sql.newsUpsertSuffix` 的入参。
 */
export type SqlNewsUpsertIn = {
  /**
   * news 全列清单(slug/created_at 不参与更新)。
   */
  cols: readonly string[]

  /**
   * 懒翻译/速读缓存列(按「body_en 真变了才清」处理)。
   */
  cache: readonly string[]
}

/**
 * `sql.companiesUpsertSuffix` 的入参。
 */
export type SqlCompaniesUpsertIn = {
  /**
   * 按 EXCLUDED 直写、且参与「真变了才写」比较的列。
   */
  plain: readonly string[]

  /**
   * 走 COALESCE 保旧值的列。
   */
  coalesce: readonly string[]
}

/**
 * `sql.jobsUpsertSuffix` 的入参。
 */
export type SqlJobsUpsertIn = {
  /**
   * jobs 全列清单。
   */
  cols: readonly string[]

  /**
   * 更新分支不碰的列(身份键与首见/末见/建档时刻)。
   */
  fixed: readonly string[]

  /**
   * 走 COALESCE 保旧值的列。
   */
  coalesce: readonly string[]
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
