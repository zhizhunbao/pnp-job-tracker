/**
 * 交接域的形状 —— 本域自己声明。
 * mart 文件是**归一前形状**(ETL 产 JSON,schema 归 ETL 管):值一律 MartValue,
 * 索引访问经 noUncheckedIndexedAccess 长出的 undefined 收在 MartCell 一个名字下。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

// db 的池/连接形状:基础设施叶子的特批(2026-08-25 Frank 落锤:lib/**/types.ts
// 仅剩 ../db 与 payload 库形状两类特批,形状不自抄 —— 池是 db 的本业)。
import type { DbClient, DbPool } from '../db'

/**
 * mart 文件里一格的值:JSON 放得下的任意形(jsonb 列真会是对象/数组)。
 * 本域是 raw JSON → DB 的边界,值的真形状就是 JSON(2026-08-21 禁 unknown 后照实声明)。
 */
export type MartValue = string | number | boolean | null | MartValue[] | { [k: string]: MartValue }

/**
 * mart 文件里的一行。
 */
export type MartRow = Record<string, MartValue>

/**
 * MartRow 按键取格的结果:noUncheckedIndexedAccess 给索引访问加的 undefined 是
 * **语言接缝**,不是我们的契约 —— 收在这一个名字下,值词(cellOf/textOf/…)统一消化,
 * 别的签名不再出现 undefined。
 */
// eslint-disable-next-line local/no-undefined-type -- noUncheckedIndexedAccess 语言接缝:索引访问天生带 undefined,全域只在这一个名字里出现
export type MartCell = MartValue | undefined

/**
 * 行映射器:mart 的 camelCase 行 → 库行(snake_case)。
 * 输出键的**内容与顺序**必须与该表的列白名单逐字一致(martSpec 测试锁)。
 */
export type MartRowFn = (r: MartRow) => MartRow

/**
 * 一张维度表的装载规格:表名(=mart 文件名=响应计数键)+ 列白名单 + 行映射器。
 * 原 routes.ts 的四元组里 mart 文件名与库表名 25 条全部相同(2026-08-26 形制批核对),
 * 两格并成一格。⚠️ cols 与 toRow 输出键必须逐字逐序对齐 —— 对不上不报错:
 * 白名单多的列静默写 NULL,映射器多的键静默丢掉(martSpec 测试锁这条不变量)。
 */
export type DimSpec = {
  /**
   * 库表名,同时是 mart 文件名与响应计数键。
   */
  table: string

  /**
   * 列白名单(snake_case,与库列逐字对齐;不含 created_at/updated_at,灌库时统一补)。
   */
  cols: readonly string[]

  /**
   * 行映射器(键序 = cols 序)。
   */
  toRow: MartRowFn
}

/**
 * `seedTokenOk` 的入参。
 */
export type TokenGateIn = {
  /**
   * 请求(读 x-seed-token 头)。
   */
  req: Request

  /**
   * 查询参数里的 token 值(/seed 额外认;upload 传 null)。
   */
  queryToken: string | null
}

/**
 * `martPaths` 的返回:该表本轮的有序文件清单(分片按 0..N-1;单文件一条;没上传空表)。
 */
export type MartPathsOut = string[]

/**
 * `martCounterpart` 的返回:该删的对方文件的绝对路径;不需要清是 null。
 */
export type MaybeCounterpart = string | null

/**
 * `dimSpecs` 的返回:全部维度表的装载规格(灌库按此顺序)。
 */
export type DimSpecs = DimSpec[]

/**
 * `martDirs` 的返回:读取目录链(2026-08-26 由位置数组改具名两格 —— 按位置取目录
 * 读不出「哪个是回退」)。
 */
export type MartDirsOut = {
  /**
   * upload 落盘的 tmpdir 目录(Render 生产,优先)。
   */
  tmp: string

  /**
   * 本地回退目录(本地 dev / compose 直读 ETL 产物)。
   */
  local: string
}

/**
 * upload 路由的第二参(形状 Next 定:动态段参数挂在 Promise 里)。
 */
export type UploadCtx = {
  /**
   * 路由参数(表名)。
   */
  params: Promise<UploadParams>
}

/**
 * upload 路由的动态段参数。
 */
export type UploadParams = {
  /**
   * 目标表名(TABLE_NAME_RE 把关)。
   */
  name: string
}

/**
 * `runSeed` 的入参。
 */
export type RunSeedIn = {
  /**
   * 连接池(路由用 getDb 拿到后注进来 —— 方案 A,functions 不碰 db/server)。
   */
  db: DbPool

  /**
   * ?reset=1:清空 jobs/companies 全量重建(⚠️ 碰生产的破坏性操作)。
   */
  reset: boolean
}

/**
 * `runSeed` 的返回(/seed 的响应体,形状与老版逐字段一致)。
 */
export type SeedOut = {
  /**
   * 走到 COMMIT 即 true(失败直接抛,由入口的错误处理接)。
   */
  ok: boolean

  /**
   * 本轮是不是 reset 全清重建。
   */
  reset: boolean

  /**
   * 表 → 灌入行数;负数是哨兵:-1 本轮无上传跳过、-2 内容与上轮一致跳过、-3 表还没建。
   */
  counts: SeedCounts

  /**
   * 「本次未见且发布超 30 天」下架的条数。
   */
  closed: number

  /**
   * 实测判死立即下架的条数(与 closed 分开计,好在响应里看清谁在干活)。
   */
  closedDead: number

  /**
   * 本轮时间戳(created_at/updated_at/closed_at 同源)。
   */
  updatedAt: string
}

/**
 * 表 → 行数/哨兵 的计数板(键 = 库表名)。
 */
export type SeedCounts = Record<string, number>

/**
 * 表 → 上轮内容哈希(seed_state 读出;#118 表级跳过的对照面)。
 */
export type SeedHashes = Record<string, string>

/**
 * `seedDims` 的入参。
 */
export type SeedDimsIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 本轮时间戳。
   */
  now: string

  /**
   * 上轮各表哈希。
   */
  prevHash: SeedHashes

  /**
   * 计数板(本函数就地记)。
   */
  counts: SeedCounts
}

/**
 * `seedStatsDaily` 的入参。
 */
export type SeedStatsDailyIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 本轮时间戳。
   */
  now: string

  /**
   * 计数板。
   */
  counts: SeedCounts
}

/**
 * `seedNews` 的入参。
 */
export type SeedNewsIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 本轮时间戳。
   */
  now: string

  /**
   * 上轮各表哈希(news 也走表级跳过)。
   */
  prevHash: SeedHashes

  /**
   * 计数板。
   */
  counts: SeedCounts
}

/**
 * `seedCompanies` 的入参。
 */
export type SeedCompaniesIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 本轮时间戳。
   */
  now: string

  /**
   * 计数板。
   */
  counts: SeedCounts
}

/**
 * `seedCompanies` 的返回。
 */
export type SeedCompaniesOut = {
  /**
   * slug → 公司 id(jobs 建关联用;upsert 后单独 SELECT 全量取 ——
   * 被「未变行跳过」的行不进 RETURNING)。
   */
  idBySlug: Record<string, number>
}

/**
 * `seedJobs` 的入参。
 */
export type SeedJobsIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 本轮时间戳。
   */
  now: string

  /**
   * slug → 公司 id。
   */
  idBySlug: Record<string, number>

  /**
   * 计数板。
   */
  counts: SeedCounts
}

/**
 * 「本轮见过」名单(jobs 分片收集,seen_ids 文件并集;下架对账的唯一依据)。
 */
export type SeenPool = {
  /**
   * 已见 external_id 集(去重判据)。
   */
  ext: Set<string>

  /**
   * 已见 external_id 有序清单(灌临时表用)。
   */
  ids: string[]
}

/**
 * `closeDeadJobs` 的入参。
 */
export type CloseDeadIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 本轮时间戳(closedAt 缺席时的兜底判死时刻)。
   */
  now: string
}

/**
 * `closeStaleJobs` 的入参。
 */
export type CloseStaleIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 本轮时间戳。
   */
  now: string

  /**
   * 本轮见过的全部 external_id(非空才会走到这一步)。
   */
  ids: string[]
}

/**
 * `insertBatch` 的入参。
 */
export type InsertBatchIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 目标表。
   */
  table: string

  /**
   * 列清单(占位符与参数按它逐列铺)。
   */
  cols: readonly string[]

  /**
   * 待插的行(键 ⊇ cols;缺格灌 NULL)。
   */
  rows: MartRow[]

  /**
   * ON CONFLICT 等后缀;无后缀传空串。
   */
  suffix: string
}

/**
 * `tableExists` 的入参。
 */
export type TableExistsIn = {
  /**
   * 事务连接。
   */
  client: DbClient

  /**
   * 要探的表名。
   */
  table: string
}

/**
 * `toCompany` 的入参。
 */
export type ToCompanyIn = {
  /**
   * mart 行。
   */
  r: MartRow

  /**
   * 本轮时间戳(created_at/updated_at)。
   */
  now: string
}

/**
 * `toNews` 的入参。
 */
export type ToNewsIn = {
  /**
   * mart 行。
   */
  r: MartRow

  /**
   * 本轮时间戳。
   */
  now: string
}

/**
 * `toStatsDaily` 的入参。
 */
export type ToStatsDailyIn = {
  /**
   * mart 行。
   */
  r: MartRow

  /**
   * 本轮时间戳。
   */
  now: string
}

/**
 * `toJob` 的入参。
 */
export type ToJobIn = {
  /**
   * mart 行。
   */
  r: MartRow

  /**
   * 本轮时间戳(first_seen/created_at/updated_at)。
   */
  now: string

  /**
   * slug → 公司 id(company_id 关联;查不到灌 NULL)。
   */
  idBySlug: Record<string, number>
}

/**
 * pg 错误对象在 Error 上挂的 code 格(外部库定死的形状 —— `?:` 三处许可里的
 * 「外部库形状」:真错误对象上这一格可能压根不在)。
 */
export type PgCoded = {
  /**
   * pg 的五位错误码(如 42P01 = 表不存在)。
   */
  code?: string | null
}

/**
 * 捕到的错误(库类型起本地名:catch 的 unknown 由调用方 instanceof 收窄后交进来)。
 */
export type CaughtError = Error

/**
 * pg 错误码;没有是 null。
 */
export type MaybeCode = string | null

/**
 * 一批 mart 行。
 */
export type MartRows = MartRow[]

/**
 * `runSeed` 的异步返回。
 */
export type RunSeedOut = Promise<SeedOut>

/**
 * `loadSeedState` 的异步返回。
 */
export type SeedHashesOut = Promise<SeedHashes>

/**
 * 只干活不回值的灌库阶段的异步返回。
 */
export type DoneOut = Promise<void>

/**
 * `seedCompanies` 的异步返回。
 */
export type CompanyIdsOut = Promise<SeedCompaniesOut>

/**
 * `seedJobs` 的异步返回(见过池)。
 */
export type SeenPoolOut = Promise<SeenPool>

/**
 * 下架阶段的异步返回(条数)。
 */
export type CountOut = Promise<number>

/**
 * `tableExists` 的异步返回。
 */
export type BoolOut = Promise<boolean>
