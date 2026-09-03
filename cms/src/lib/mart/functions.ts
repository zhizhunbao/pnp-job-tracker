/**
 * 交接域的行为:mart 文件布局的单一来源(门禁、目录链、`__meta` 分片选路、表级哈希、
 * 形态切换的残留清理)+ **seed 灌库的芯**(2026-08-26 形制批自 routes.ts 迁入,
 * routes 只剩 HTTP 皮;池由路由经 runSeed 注入 —— 方案 A,本文件不碰 db/server)。
 *
 * seed 的设计史(原 seed 文件头,随芯迁入):
 * 纯加载器 v2(批量 SQL)—— 只读 data/mart/(etl/09 产出的最终表)直接灌库,
 * 拼装/清洗/评分关联/中介过滤/去重全在 ETL 完成,这里不做。
 * v2 改批量的原因:原 Payload 逐行管线(12k 岗 × find+update ≈ 数万次 DB 往返)在
 * Render Free 0.1 vCPU 上一轮 ~40 分钟,还必撞代理 ~100s 超时(客户端记失败、服务端继续跑)。
 * 分批 upsert(INSERT … ON CONFLICT)后整轮秒级,且全程单事务 —— 失败回滚,不再有半写状态。
 * 代价(认账,同「/jobs 读走原始 SQL」老坑 5):列名耦合 Payload snake_case,
 * 改 collection 字段必须同步 constants 里的列白名单。语义与 v1 完全一致:
 * token 鉴权 / ?reset=1 全清重建 / 增量 upsert / lastSeen=抓取时间(mart 透传,缺则不动旧值)/
 * 「本次未见且发布超 30 天」才下架。
 *
 * 分片存在的意义:512MB 实例整文件 parse 27k 行 jobs 会 OOM(实撞),
 * 大表(>6MB)由 etl/upload_mart.py 分片上传(`name__part0..N-1` + `name__meta` 声明片数,
 * meta 最后传 = 提交语义),seed 逐片 parse→入库→释放。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { martMetaError, martShardError, martSourceError } from '@/lib/error'
import { DAY_MS } from '@/lib/time'
import { SQL, type DbClient, type SqlParam } from '../db'
import {
  BATCH_ROWS, COLS_CITIES, COLS_COMPANIES, COLS_COMPANIES_COALESCE, COLS_COMPANIES_PLAIN, COLS_DEAD_EXT,
  COLS_DESIGNATED_EMPLOYERS, COLS_DISTRICTS, COLS_DLI, COLS_EE_CATEGORIES, COLS_EE_POINTS_GRID,
  COLS_EXPERIENCE_LEVELS, COLS_FIELD_SOURCES, COLS_JOBS, COLS_JOBS_COALESCE, COLS_JOBS_FIXED, COLS_NEWS,
  COLS_NEWS_CACHE, COLS_NOC_CATEGORIES, COLS_NOC_DESCRIPTIONS, COLS_NOC_OPENINGS, COLS_PILOT_COMMUNITIES,
  COLS_PILOT_OCCUPATIONS, COLS_PILOT_QUOTA, COLS_PNP_DRAWS, COLS_PTE_AUDIO, COLS_PTE_DICT, COLS_PTE_QUESTIONS, COLS_PTE_TYPES, COLS_PNP_OCCUPATIONS, COLS_PNP_OPS_STATS,
  COLS_PNP_REQUIREMENTS, COLS_PNP_SCORE_FACTORS, COLS_PROVINCES, COLS_RANKINGS, COLS_ROW_TS, COLS_SOURCES,
  COLS_STATS, COLS_STATS_CITY, COLS_STATS_DAILY, COLS_STATS_OCCUPATION, COUNT_NO_TABLE, COUNT_NO_UPLOAD,
  COUNT_UNCHANGED, EXPIRE_DAYS, HDR_SEED_TOKEN, HEX, JSON_EXT, LOCAL_MART_REL, MART_CLOSED_JOBS, MART_DIR_NAME,
  MART_SEEN_IDS, MD5, META_SUFFIX, MID_ALL, PART_INFIX, PG_UNDEFINED_TABLE, PROGRAM_PNP, SHARD_SEP, STATUS_OPEN,
  SUFFIX_NONE, TEXT_EMPTY,
  TBL_CITIES, TBL_COMPANIES, TBL_DESIGNATED_EMPLOYERS, TBL_DISTRICTS, TBL_DLI, TBL_DEAD_EXT, TBL_EE_CATEGORIES,
  TBL_EE_POINTS_GRID, TBL_EXPERIENCE_LEVELS, TBL_FIELD_SOURCES, TBL_JOBS, TBL_NEWS, TBL_NOC_CATEGORIES,
  TBL_NOC_DESCRIPTIONS, TBL_NOC_OPENINGS, TBL_PILOT_COMMUNITIES, TBL_PILOT_OCCUPATIONS, TBL_PILOT_QUOTA, TBL_PTE_AUDIO, TBL_PTE_DICT, TBL_PTE_QUESTIONS, TBL_PTE_TYPES,
  TBL_PNP_DRAWS, TBL_PNP_OCCUPATIONS, TBL_PNP_OPS_STATS, TBL_PNP_REQUIREMENTS, TBL_PNP_SCORE_FACTORS,
  TBL_PROVINCES, TBL_RANKINGS, TBL_SOURCES, TBL_STATS, TBL_STATS_CITY, TBL_STATS_DAILY, TBL_STATS_OCCUPATION,
  UTF8,
} from './constants'
import type {
  BoolOut, CaughtError, CloseDeadIn, CloseStaleIn, CompanyIdsOut, CountOut, DimSpecs, DoneOut, InsertBatchIn,
  MartCell, MartDirsOut, MartPathsOut, MartRow, MartRows, MartValue, MaybeCode, MaybeCounterpart, PgCoded,
  RunSeedIn, RunSeedOut, SeedCompaniesIn, SeedDimsIn, SeedHashes, SeedHashesOut, SeedJobsIn, SeedNewsIn,
  SeedStatsDailyIn, SeenPool, SeenPoolOut, TableExistsIn, ToCompanyIn, ToJobIn, ToNewsIn, ToStatsDailyIn,
  TokenGateIn,
} from './types'

// =========================================================================
// 1. 门禁与文件布局
// =========================================================================

/**
 * 门禁:SEED_TOKEN 已设置则必须匹配(生产必设 —— ?reset=1 可清库,公网裸奔 = 事故;
 * 本地 dev 未设则放行)。upload 与 /seed 同一把钥匙、同一段判定。
 *
 * @param input 请求与查询参数里的 token(upload 传 null)。
 * @returns 放不放行。
 */
export function seedTokenOk(input: TokenGateIn): boolean {
  const token = process.env.SEED_TOKEN
  if (token == null || token === '') {
    return true
  }
  if (input.req.headers.get(HDR_SEED_TOKEN) === token) {
    return true
  }
  return input.queryToken === token
}

/**
 * 表级内容哈希(裸字节,parse 前;#118):与上轮一致的表整表跳过不重灌,
 * 压 seed 耗时出代理 ~100s 危险区。哈希存 seed_state 表,随事务提交,回滚不留脏哈希。
 *
 * @param name 表名。
 * @returns 该表全部分片按序的 md5。
 */
export function martHash(name: string): string {
  const h = crypto.createHash(MD5)
  for (const p of martPaths(name)) {
    h.update(fs.readFileSync(p))
  }
  return h.digest(HEX)
}

/**
 * 一张表本轮的有序文件清单(`__meta` 分片形制的读侧单一来源)。
 * 2026-07-11 事故防线(22c8d6a)语义:上游读失败绝不能当空表 ——
 * 两目录都不存在 = 本轮上传丢失(如部署重启清 /tmp)→ 抛错让整事务回滚;
 * 有目录而单表文件缺 = 表确实不存在 → 返回 []。
 * meta 声明的片缺失 = 半程上传 → 抛错整事务回滚。
 *
 * @param name 表名。
 * @returns 有序文件清单;该表没上传是空表。
 */
export function martPaths(name: string): MartPathsOut {
  const dirs = martDirs()
  for (const dir of [dirs.tmp, dirs.local]) {
    if (fs.existsSync(dir) === false) {
      continue
    }
    const metaP = path.join(dir, name + META_SUFFIX + JSON_EXT)
    if (fs.existsSync(metaP)) {
      const parts = metaParts(fs.readFileSync(metaP, UTF8))
      if (parts < 1) {
        throw martMetaError({ file: name + META_SUFFIX })
      }
      const out: string[] = []
      for (let k = 0; k < parts; k++) {
        const p = path.join(dir, name + PART_INFIX + k + JSON_EXT)
        if (fs.existsSync(p) === false) {
          throw martShardError({ name: name, k: k + 1, parts: parts })
        }
        out.push(p)
      }
      return out
    }
    const single = path.join(dir, name + JSON_EXT)
    if (fs.existsSync(single)) {
      return [single]
    }
  }
  if (fs.existsSync(dirs.tmp) === false && fs.existsSync(dirs.local) === false) {
    throw martSourceError({ tmp: dirs.tmp, local: dirs.local })
  }
  return []
}

/**
 * 形态切换要清的残留文件(写侧;`__meta` 形制的另一半):seed 按「有 __meta 走分片,
 * 否则走单文件」选路,旧形态文件留着会被误读 —— 单文件落地删同表旧 meta;
 * meta 落地(分片集提交)删同表旧单文件;part 分片自身不清对方。
 *
 * @param name 本次落地的文件名(不含扩展名)。
 * @returns 该删的对方文件的绝对路径;不需要清是 null。
 */
export function martCounterpart(name: string): MaybeCounterpart {
  const dir = martTmpDir()
  if (name.endsWith(META_SUFFIX)) {
    return path.join(dir, name.slice(0, name.length - META_SUFFIX.length) + JSON_EXT)
  }
  if (name.includes(SHARD_SEP)) {
    return null
  }
  return path.join(dir, name + META_SUFFIX + JSON_EXT)
}

/**
 * seed 的读取目录链:upload 落的 tmpdir 优先(Render 生产),回退本地 ../data/mart
 * (本地 dev / compose 直读 ETL 产物)。
 *
 * @returns 两级目录(具名,按优先级)。
 */
function martDirs(): MartDirsOut {
  return { tmp: martTmpDir(), local: path.resolve(process.cwd(), LOCAL_MART_REL) }
}

/**
 * upload 的落盘目录(tmpdir 下;/tmp 随部署即弃无妨 —— 上传与 seed 前后脚,
 * 若恰逢重启丢文件,seed 读不到会响亮失败不空灌)。
 *
 * @returns 绝对路径(不保证存在,写侧自建)。
 */
export function martTmpDir(): string {
  return path.join(os.tmpdir(), MART_DIR_NAME)
}

/**
 * `__meta` 文件正文 → 声明的片数(形状:`[{ parts: N }]`,取首元素;
 * 解析不出或不是正整数给 0,由调用方按 invalid 抛)。
 *
 * @param text meta 文件原文。
 * @returns 片数;解析不出是 0。
 */
function metaParts(text: string): number {
  const meta: MartValue = JSON.parse(text)
  if (Array.isArray(meta) === false) {
    return 0
  }
  for (const head of meta) {
    if (head != null && typeof head === 'object' && Array.isArray(head) === false) {
      const p = head.parts
      if (typeof p === 'number' && Number.isInteger(p)) {
        return p
      }
    }
    return 0
  }
  return 0
}

// =========================================================================
// 2. 值词(mart 归一前形状 → 库值;undefined 语言接缝在这五个词里消化干净)
// =========================================================================

/**
 * 缺席折 null(原 `?? null` 与裸透传的统一形:JSON 无 undefined,
 * 缺席即没记录,写库同灌 NULL —— 官方可空列靠它保住「没有」,禁折默认值)。
 *
 * @param x mart 格。
 * @returns 值或 null。
 */
function cellOf(x: MartCell): MartValue {
  if (x == null) {
    return null
  }
  return x
}

/**
 * 缺席折空串(原 `?? ''`:展示型文本列的缺省)。
 *
 * @param x mart 格。
 * @returns 值或空串。
 */
function textOf(x: MartCell): MartValue {
  if (x == null) {
    return TEXT_EMPTY
  }
  return x
}

/**
 * 真值才序列化成 JSON 串(原 `x ? JSON.stringify(x) : null`:jsonb 列的 pg 参数
 * 须传字符串),否则 null。
 *
 * @param x mart 格(对象/数组)。
 * @returns JSON 串或 null。
 */
function jsonTextOf(x: MartCell): MartValue {
  if (truthyOf(x) === false) {
    return null
  }
  return JSON.stringify(x)
}

/**
 * JS 真值判定的显式形(原 `!!x` 与 `x || y` 的判定半:null/undefined/false/0/空串为假;
 * JSON 里没有 NaN,不判)。
 *
 * @param x mart 格。
 * @returns 真值性。
 */
function truthyOf(x: MartCell): boolean {
  if (x == null) {
    return false
  }
  if (x === false || x === 0 || x === '') {
    return false
  }
  return true
}

/**
 * 日期串规整成 ISO(解析不了给 null —— 宁可留空不瞎猜)。
 *
 * @param x mart 格。
 * @returns ISO 串或 null。
 */
function isoDateOf(x: MartCell): MartValue {
  if (typeof x !== 'string' || x === '') {
    return null
  }
  const d = new Date(x)
  if (isNaN(d.getTime())) {
    return null
  }
  return d.toISOString()
}

// =========================================================================
// 3. 行构造器(to*:mart camelCase 行 → 库行;键序 = 列白名单序,martSpec 锁)
// =========================================================================

/**
 * provinces 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toProvince(r: MartRow): MartRow {
  return { code: cellOf(r.code), name: cellOf(r.name), info: cellOf(r.info) }
}

/**
 * cities 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toCity(r: MartRow): MartRow {
  return { name: cellOf(r.name), province: cellOf(r.province), name_zh: cellOf(r.nameZh), name_ko: cellOf(r.nameKo) }
}

/**
 * districts 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toDistrict(r: MartRow): MartRow {
  return { name: cellOf(r.name), city: cellOf(r.city), province: cellOf(r.province) }
}

/**
 * designated_employers 行(AIP 指定雇主)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toDesignatedEmployer(r: MartRow): MartRow {
  return {
    name: cellOf(r.name), province: cellOf(r.province), location: cellOf(r.location), is_tech: cellOf(r.isTech),
    source: cellOf(r.source), nocs: textOf(r.nocs), url: textOf(r.url), fetched: textOf(r.fetched),
  }
}

/**
 * pilot_communities 行(E6-11 试点社区)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPilotCommunity(r: MartRow): MartRow {
  return {
    name: cellOf(r.name), province: cellOf(r.province), type: textOf(r.type), cities: textOf(r.cities),
    url: textOf(r.url), fetched: textOf(r.fetched),
  }
}

/**
 * pilot_occupations 行(E6-11 批B 社区 × 职业)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPilotOccupation(r: MartRow): MartRow {
  return {
    community: cellOf(r.community), province: textOf(r.province), type: textOf(r.type), noc: textOf(r.noc),
    title: textOf(r.title), sector_only: truthyOf(r.sectorOnly), url: textOf(r.url), fetched: textOf(r.fetched),
  }
}

/**
 * pilot_quota 行(社区名额状态)。⚠️ first_come/per_intake/remaining 走 cellOf 保 null ——
 * 空 = 官网没写,不是 0/false。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPilotQuota(r: MartRow): MartRow {
  return {
    community: cellOf(r.community), province: textOf(r.province), type: textOf(r.type), noc: textOf(r.noc),
    status: textOf(r.status),
    first_come: cellOf(r.firstCome), first_come_quote: textOf(r.firstComeQuote), first_come_url: textOf(r.firstComeUrl),
    per_intake: cellOf(r.perIntake), per_intake_quote: textOf(r.perIntakeQuote), per_intake_url: textOf(r.perIntakeUrl),
    remaining: cellOf(r.remaining), remaining_quote: textOf(r.remainingQuote), remaining_url: textOf(r.remainingUrl),
    quote: textOf(r.quote), url: textOf(r.url), as_of: textOf(r.asOf),
  }
}

/**
 * noc_openings 行(职业在招量聚合)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toNocOpening(r: MartRow): MartRow {
  return {
    noc: cellOf(r.noc), open: cellOf(r.open), eligible: cellOf(r.eligible), median_salary: cellOf(r.medianSalary),
    broad: cellOf(r.broad), title: cellOf(r.title), title_zh: cellOf(r.titleZh), title_zh_short: cellOf(r.titleZhShort),
    title_ko_short: cellOf(r.titleKoShort), title_en_short: cellOf(r.titleEnShort),
  }
}

/**
 * noc_categories 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toNocCategory(r: MartRow): MartRow {
  return {
    broad: cellOf(r.broad), mid: cellOf(r.mid), fine: cellOf(r.fine), teer: cellOf(r.teer),
    broad_en: cellOf(r.broadEn), broad_ko: cellOf(r.broadKo), mid_en: cellOf(r.midEn), mid_ko: cellOf(r.midKo),
    fine_en: cellOf(r.fineEn), fine_ko: cellOf(r.fineKo),
  }
}

/**
 * sources 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toSource(r: MartRow): MartRow {
  return { name: cellOf(r.name) }
}

/**
 * experience_levels 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toExperienceLevel(r: MartRow): MartRow {
  return { name: cellOf(r.name) }
}

/**
 * pnp_occupations 行(program 缺席按 PNP 计 —— 老数据没这一列)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPnpOccupation(r: MartRow): MartRow {
  let program: MartValue = PROGRAM_PNP
  if (truthyOf(r.program)) {
    program = cellOf(r.program)
  }
  return {
    province: cellOf(r.province), stream: cellOf(r.stream), label: cellOf(r.label), type: cellOf(r.type),
    program: program, noc: cellOf(r.noc), name: cellOf(r.name), gta_restricted: cellOf(r.gtaRestricted),
    applies_to: textOf(r.appliesTo), url: cellOf(r.url), fetched: cellOf(r.fetched),
  }
}

/**
 * pnp_draws 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPnpDraw(r: MartRow): MartRow {
  return {
    province: cellOf(r.province), kind: cellOf(r.kind), draw_date: cellOf(r.drawDate), stream: cellOf(r.stream),
    stream_zh: cellOf(r.streamZh), score: cellOf(r.score), scale: cellOf(r.scale), invitations: cellOf(r.invitations),
    note: cellOf(r.note), label: cellOf(r.label), url: cellOf(r.url), fetched: cellOf(r.fetched),
  }
}

/**
 * pnp_score_factors 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPnpScoreFactor(r: MartRow): MartRow {
  return {
    province: cellOf(r.province), system: cellOf(r.system), factor: cellOf(r.factor), kind: cellOf(r.kind),
    seq: cellOf(r.seq), label: cellOf(r.label), points: cellOf(r.points), xor_prev: cellOf(r.xorPrev),
    rule: cellOf(r.rule), factor_max: cellOf(r.factorMax), factor_group: cellOf(r.factorGroup),
    group_max: cellOf(r.groupMax), pass_mark: cellOf(r.passMark), max_total: cellOf(r.maxTotal),
    guide_effective: cellOf(r.guideEffective), url: cellOf(r.url), fetched: cellOf(r.fetched),
  }
}

/**
 * pnp_requirements 行(E13-01;applies_family_size 的 mart 键叫 familySize)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPnpRequirement(r: MartRow): MartRow {
  return {
    province: cellOf(r.province), program: cellOf(r.program), stream: cellOf(r.stream), subject: cellOf(r.subject),
    factor: cellOf(r.factor), op: cellOf(r.op), value: cellOf(r.value), value_text: cellOf(r.valueText),
    unit: cellOf(r.unit), applies_teer: cellOf(r.appliesTeer), applies_noc: cellOf(r.appliesNoc),
    excludes_noc: cellOf(r.excludesNoc), applies_area: cellOf(r.appliesArea),
    applies_condition: cellOf(r.appliesCondition), applies_family_size: cellOf(r.familySize), basis: cellOf(r.basis),
    label: cellOf(r.label), section: cellOf(r.section), seq: cellOf(r.seq), effective: cellOf(r.effective),
    url: cellOf(r.url), page_url: cellOf(r.pageUrl), fetched: cellOf(r.fetched),
  }
}

/**
 * pnp_ops_stats 行(G5)。⚠️ value 走 cellOf 保 null —— 官方隐私抑制值与不适用
 * 一律 null + value_text 存原文,禁折 0。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPnpOpsStat(r: MartRow): MartRow {
  return {
    province: cellOf(r.province), program: cellOf(r.program), metric: cellOf(r.metric), scope: cellOf(r.scope),
    scope_kind: cellOf(r.scopeKind), stream_key: cellOf(r.streamKey), label: cellOf(r.label), value: cellOf(r.value),
    value_text: cellOf(r.valueText), unit: cellOf(r.unit), as_of: cellOf(r.asOf), period: cellOf(r.period),
    url: cellOf(r.url), fetched: cellOf(r.fetched), section: cellOf(r.section), seq: cellOf(r.seq),
  }
}

/**
 * ee_categories 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toEeCategory(r: MartRow): MartRow {
  return {
    category: cellOf(r.category), label: cellOf(r.label), noc: cellOf(r.noc), teer: cellOf(r.teer),
    title: cellOf(r.title), url: cellOf(r.url), fetched: cellOf(r.fetched), draw_crs: cellOf(r.drawCrs),
    draw_date: cellOf(r.drawDate), draw_size: cellOf(r.drawSize),
  }
}

/**
 * ee_points_grid 行(G9)。⚠️ points 走 cellOf 保 null —— 官方「n/a」一律
 * null + points_text 存原文,禁折 0。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toEePointsGrid(r: MartRow): MartRow {
  return {
    grid: cellOf(r.grid), section: cellOf(r.section), section_label: cellOf(r.sectionLabel), kind: cellOf(r.kind),
    table_no: cellOf(r.tableNo), heading: cellOf(r.heading), factor: cellOf(r.factor), criterion: cellOf(r.criterion),
    column_label: cellOf(r.columnLabel), points: cellOf(r.points), points_text: cellOf(r.pointsText),
    seq: cellOf(r.seq), url: cellOf(r.url), fetched: cellOf(r.fetched),
  }
}

/**
 * noc_descriptions 行。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toNocDescription(r: MartRow): MartRow {
  return {
    noc: cellOf(r.noc), title: cellOf(r.title), title_zh: cellOf(r.titleZh), title_zh_short: cellOf(r.titleZhShort),
    title_ko: cellOf(r.titleKo), title_ko_short: cellOf(r.titleKoShort), title_en_short: cellOf(r.titleEnShort),
    duties: cellOf(r.duties), requirements: cellOf(r.requirements), fetched: cellOf(r.fetched),
  }
}

/**
 * dli 行(E12-03)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toDli(r: MartRow): MartRow {
  return {
    province: cellOf(r.province), name: cellOf(r.name), dli_number: cellOf(r.dliNumber), city: cellOf(r.city),
    campuses: cellOf(r.campuses), is_public: cellOf(r.isPublic), grad_program: cellOf(r.gradProgram),
    url: cellOf(r.url), fetched: cellOf(r.fetched),
  }
}

/**
 * pte_types 行(2026-09-03 pte 域升产品域)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPteType(r: MartRow): MartRow {
  return {
    code: cellOf(r.code), section: cellOf(r.section), seq: cellOf(r.seq),
    name_zh: cellOf(r.nameZh), name_en: cellOf(r.nameEn), name_ko: cellOf(r.nameKo), audio: cellOf(r.audio),
    weight: cellOf(r.weight),
  }
}

/**
 * pte_questions 行(2026-09-03;可空格全 cellOf 保 null —— votes/freq/seen 空 = 该源没有,不是 0)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPteQuestion(r: MartRow): MartRow {
  return {
    qid: cellOf(r.qid), source: cellOf(r.source), type: cellOf(r.type), num: cellOf(r.num), title: cellOf(r.title),
    text: cellOf(r.text), answer: cellOf(r.answer), audio_url: cellOf(r.audioUrl), audio_file: cellOf(r.audioFile),
    image_url: cellOf(r.imageUrl), predicted: cellOf(r.predicted), seen: cellOf(r.seen), seen_n: cellOf(r.seenN),
    votes: cellOf(r.votes), freq: cellOf(r.freq), fetched: cellOf(r.fetched),
  }
}

/**
 * pte_audio 行(2026-09-03 批三;b64 是整段音频的 base64,只过手不解)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPteAudio(r: MartRow): MartRow {
  return { qid: cellOf(r.qid), mime: cellOf(r.mime), b64: cellOf(r.b64), voice: cellOf(r.voice) }
}

/**
 * pte_dict 行(2026-09-04 字典自托管;释义整段过手)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toPteDict(r: MartRow): MartRow {
  return { word: cellOf(r.word), phonetic: cellOf(r.phonetic), translation: cellOf(r.translation), lemma: cellOf(r.lemma) }
}

/**
 * field_sources 行(E4-04)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toFieldSource(r: MartRow): MartRow {
  return {
    field: cellOf(r.field), kind: cellOf(r.kind), publisher: cellOf(r.publisher), url: cellOf(r.url),
    title: cellOf(r.title), description: cellOf(r.description), status: cellOf(r.status), fetched: cellOf(r.fetched),
    note: cellOf(r.note),
  }
}

/**
 * rankings 行(E5-02)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toRanking(r: MartRow): MartRow {
  return {
    slug: cellOf(r.slug), rank: cellOf(r.rank), kind: cellOf(r.kind), external_id: cellOf(r.externalId),
    title: cellOf(r.title), company: cellOf(r.company), company_slug: cellOf(r.companySlug), city: cellOf(r.city),
    province: cellOf(r.province), noc: cellOf(r.noc), teer: cellOf(r.teer), score: cellOf(r.score),
    salary_text: cellOf(r.salaryText), salary_annual: cellOf(r.salaryAnnual), pnp_stream: cellOf(r.pnpStream),
    ee_category: cellOf(r.eeCategory), date_posted: cellOf(r.datePosted), apply_url: cellOf(r.applyUrl),
    official_url: cellOf(r.officialUrl), open_jobs: cellOf(r.openJobs), named_jobs: cellOf(r.namedJobs),
    avg_score: cellOf(r.avgScore), lmia_positions: cellOf(r.lmiaPositions), lmia_quarter: cellOf(r.lmiaQuarter),
  }
}

/**
 * stats_occupation 行(E8-14;列变更史见 COLS_STATS_OCCUPATION 的 JSDoc)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toStatsOccupation(r: MartRow): MartRow {
  return {
    noc: cellOf(r.noc), province: cellOf(r.province), title_zh: cellOf(r.titleZh),
    title_zh_short: cellOf(r.titleZhShort), title_en: cellOf(r.titleEn), teer: cellOf(r.teer), broad: cellOf(r.broad),
    mid: cellOf(r.mid), fine: cellOf(r.fine), open_jobs: cellOf(r.openJobs), new7d: cellOf(r.new7d),
    median_wage_annual: cellOf(r.medianWageAnnual), wage_low_annual: cellOf(r.wageLowAnnual),
    wage_high_annual: cellOf(r.wageHighAnnual), median_salary_annual: cellOf(r.medianSalaryAnnual),
    salary_n: cellOf(r.salaryN), named_jobs: cellOf(r.namedJobs), fetched: cellOf(r.fetched),
    new30d: cellOf(r.new30d), new30d_prev: cellOf(r.new30dPrev), mom30d: cellOf(r.mom30d), new14d: cellOf(r.new14d),
    new14d_prev: cellOf(r.new14dPrev), mom14d: cellOf(r.mom14d), closed30d: cellOf(r.closed30d),
    net30d: cellOf(r.net30d), avg_days_open: cellOf(r.avgDaysOpen), pulse_score: cellOf(r.pulseScore),
    pnp_provs: cellOf(r.pnpProvs), channel_tier: cellOf(r.channelTier), dead_provs: cellOf(r.deadProvs),
    pnp_provs_cond: cellOf(r.pnpProvsCond), sponsor_pos_q: cellOf(r.sponsorPosQ),
    sponsor_pos_skilled_q: cellOf(r.sponsorPosSkilledQ), jvws_vac_q: cellOf(r.jvwsVacQ),
    sponsor_rate: cellOf(r.sponsorRate), sponsor_evidence: cellOf(r.sponsorEvidence),
  }
}

/**
 * stats_city 行(E8-14)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toStatsCity(r: MartRow): MartRow {
  return {
    city: cellOf(r.city), province: cellOf(r.province), open_jobs: cellOf(r.openJobs), new7d: cellOf(r.new7d),
    median_wage_annual: cellOf(r.medianWageAnnual), median_salary_annual: cellOf(r.medianSalaryAnnual),
    salary_n: cellOf(r.salaryN), named_jobs: cellOf(r.namedJobs), fetched: cellOf(r.fetched),
  }
}

/**
 * stats 行(E5-04;broad 汇总行没有 mid,按 all 记)。
 *
 * @param r mart 行。
 * @returns 库行。
 */
function toStat(r: MartRow): MartRow {
  let mid: MartValue = MID_ALL
  if (r.mid != null) {
    mid = r.mid
  }
  return {
    province: cellOf(r.province), broad: cellOf(r.broad), mid: mid, open_jobs: cellOf(r.openJobs),
    new7d: cellOf(r.new7d), median_wage_annual: cellOf(r.medianWageAnnual),
    median_salary_annual: cellOf(r.medianSalaryAnnual), named_jobs: cellOf(r.namedJobs),
    stream_labels: cellOf(r.streamLabels), aip_jobs: cellOf(r.aipJobs), top_cities: cellOf(r.topCities),
    fetched: cellOf(r.fetched), difficulty: cellOf(r.difficulty),
  }
}

/**
 * companies 行(name 缺席回落 slug;E12-08 两档列缺键由 UPSERT 侧 COALESCE 保旧值)。
 *
 * @param x mart 行与本轮时间戳。
 * @returns 库行(含时间戳)。
 */
export function toCompany(x: ToCompanyIn): MartRow {
  let name: MartValue = cellOf(x.r.slug)
  if (x.r.name != null) {
    name = x.r.name
  }
  return {
    slug: cellOf(x.r.slug), name: name, website: cellOf(x.r.website), website_source: cellOf(x.r.websiteSource),
    email: cellOf(x.r.email), region: cellOf(x.r.region), sectors: cellOf(x.r.sectors), address: cellOf(x.r.address),
    description: cellOf(x.r.description), source: cellOf(x.r.source), lmia_positions: cellOf(x.r.lmiaPositions),
    lmia_lmias: cellOf(x.r.lmiaLmias), lmia_last_quarter: cellOf(x.r.lmiaLastQuarter),
    lmia_streams: cellOf(x.r.lmiaStreams), lmia_positions_skilled: cellOf(x.r.lmiaPositionsSkilled),
    lmia_positions_4q: cellOf(x.r.lmiaPositions4q), lmia_positions_2q: cellOf(x.r.lmiaPositions2q),
    lmia_positions_1q: cellOf(x.r.lmiaPositions1q), lmia_nocs: cellOf(x.r.lmiaNocs),
    sponsor_grade: cellOf(x.r.sponsorGrade), score_detail: jsonTextOf(x.r.scoreDetail),
    created_at: x.now, updated_at: x.now,
  }
}

/**
 * news 行(E12-06;懒翻译/速读缓存列不在此 —— seed 不碰,UPSERT 侧按 body_en 变更清)。
 *
 * @param x mart 行与本轮时间戳。
 * @returns 库行(含时间戳)。
 */
export function toNews(x: ToNewsIn): MartRow {
  return {
    region: cellOf(x.r.region), title: cellOf(x.r.title), title_zh: cellOf(x.r.titleZh), date: cellOf(x.r.date),
    slug: cellOf(x.r.slug), url: cellOf(x.r.url), og_image: cellOf(x.r.ogImage), excerpt: cellOf(x.r.excerpt),
    importance: cellOf(x.r.importance), importance_note: cellOf(x.r.importanceNote), body_en: cellOf(x.r.bodyEn),
    citation: cellOf(x.r.citation), fetched: cellOf(x.r.fetched), created_at: x.now, updated_at: x.now,
  }
}

/**
 * stats_daily 行(趋势图唯一数据来源)。
 *
 * @param x mart 行与本轮时间戳。
 * @returns 库行(含时间戳)。
 */
export function toStatsDaily(x: ToStatsDailyIn): MartRow {
  return {
    date: cellOf(x.r.date), province: cellOf(x.r.province), broad: cellOf(x.r.broad),
    open_jobs: cellOf(x.r.openJobs), new7d: cellOf(x.r.new7d),
    median_salary_annual: cellOf(x.r.medianSalaryAnnual), named_jobs: cellOf(x.r.namedJobs),
    closed: cellOf(x.r.closed), created_at: x.now, updated_at: x.now,
  }
}

/**
 * jobs 行。插入分支语义:status=open、closed_at 空、first_seen=本轮、
 * last_seen=抓取时间(mart 透传,缺就留空 —— 宁可留空,下轮抓到自然回填);
 * B1-3:apprentice_friendly = 官方标「不要经验/带训」或学徒标题(05e);
 * certificates 是 jsonb,pg 参数须传 JSON 字符串(E6-06/E6-07A)。
 *
 * @param x mart 行、本轮时间戳与 slug→公司 id 表。
 * @returns 库行(含状态与时间戳)。
 */
export function toJob(x: ToJobIn): MartRow {
  let companyId: MartValue = null
  const slug = x.r.companySlug
  if (typeof slug === 'string') {
    const got = x.idBySlug[slug]
    if (got != null) {
      companyId = got
    }
  }
  return {
    external_id: cellOf(x.r.externalId), company_id: companyId, title: textOf(x.r.title), noc: cellOf(x.r.noc),
    category: cellOf(x.r.category), teer: cellOf(x.r.teer), broad: cellOf(x.r.broad), mid: cellOf(x.r.mid),
    fine: cellOf(x.r.fine), description: cellOf(x.r.description), country: cellOf(x.r.country),
    province: cellOf(x.r.province), city: cellOf(x.r.city), district: cellOf(x.r.district),
    address: cellOf(x.r.address), apply_url: cellOf(x.r.applyUrl), official_url: cellOf(x.r.officialUrl),
    salary: cellOf(x.r.salary), salary_annual: cellOf(x.r.salaryAnnual), salary_text: cellOf(x.r.salaryText),
    wage_med_hourly: cellOf(x.r.wageMedHourly), wage_med_annual: cellOf(x.r.wageMedAnnual),
    wage_low_hourly: cellOf(x.r.wageLowHourly), wage_low_annual: cellOf(x.r.wageLowAnnual),
    wage_high_hourly: cellOf(x.r.wageHighHourly), wage_high_annual: cellOf(x.r.wageHighAnnual),
    wage_year: cellOf(x.r.wageYear), date_posted: isoDateOf(x.r.datePosted), source: cellOf(x.r.source),
    source_label: cellOf(x.r.sourceLabel), origin: cellOf(x.r.origin), accessibility: cellOf(x.r.accessibility),
    score: cellOf(x.r.score), grade_channel: cellOf(x.r.gradeChannel), score_detail: jsonTextOf(x.r.scoreDetail),
    pnp_eligible: truthyOf(x.r.pnpEligible), pnp_stream: cellOf(x.r.pnpStream), ee_category: cellOf(x.r.eeCategory),
    aip: truthyOf(x.r.aip), pilot: textOf(x.r.pilot), pilot_community: textOf(x.r.pilotCommunity),
    pilot_employer: truthyOf(x.r.pilotEmployer), pilot_occ: textOf(x.r.pilotOcc),
    apprentice_friendly: truthyOf(x.r.apprenticeFriendly), employment_term: cellOf(x.r.employmentTerm),
    employment_hours: cellOf(x.r.employmentHours), certificates: jsonTextOf(x.r.certificates),
    education: cellOf(x.r.education), eligibility_flag: cellOf(x.r.eligibilityFlag),
    eligibility_quote: cellOf(x.r.eligibilityQuote), status: STATUS_OPEN, closed_at: null, first_seen: x.now,
    last_seen: cellOf(x.r.lastSeen), created_at: x.now, updated_at: x.now,
  }
}

// =========================================================================
// 4. 装载规格(维度表:每次全量重建;表序即灌库序)
// =========================================================================

/**
 * 全部维度表的装载规格。原 routes.ts 的四元组表,2026-08-26 形制批拆成
 * 列白名单(constants)+ 具名映射器(上一段)在此配对 ——
 * ⚠️ 配对错位不会报错,tests/int/martSpec 逐条锁「cols === toRow 输出键」。
 * E12-06:news 不在此 —— 懒翻译缓存是线上按需写入的,DELETE+重灌每小时抹一次缓存
 * (P1f 实撞发现),它走 seedNews 的专用 upsert。
 *
 * @returns 规格清单(灌库按此顺序)。
 */
export function dimSpecs(): DimSpecs {
  return [
    { table: TBL_PROVINCES, cols: COLS_PROVINCES, toRow: toProvince },
    { table: TBL_CITIES, cols: COLS_CITIES, toRow: toCity },
    { table: TBL_DISTRICTS, cols: COLS_DISTRICTS, toRow: toDistrict },
    { table: TBL_DESIGNATED_EMPLOYERS, cols: COLS_DESIGNATED_EMPLOYERS, toRow: toDesignatedEmployer },
    { table: TBL_PILOT_COMMUNITIES, cols: COLS_PILOT_COMMUNITIES, toRow: toPilotCommunity },
    { table: TBL_PILOT_OCCUPATIONS, cols: COLS_PILOT_OCCUPATIONS, toRow: toPilotOccupation },
    { table: TBL_PILOT_QUOTA, cols: COLS_PILOT_QUOTA, toRow: toPilotQuota },
    { table: TBL_NOC_OPENINGS, cols: COLS_NOC_OPENINGS, toRow: toNocOpening },
    { table: TBL_NOC_CATEGORIES, cols: COLS_NOC_CATEGORIES, toRow: toNocCategory },
    { table: TBL_SOURCES, cols: COLS_SOURCES, toRow: toSource },
    { table: TBL_EXPERIENCE_LEVELS, cols: COLS_EXPERIENCE_LEVELS, toRow: toExperienceLevel },
    { table: TBL_PNP_OCCUPATIONS, cols: COLS_PNP_OCCUPATIONS, toRow: toPnpOccupation },
    { table: TBL_PNP_DRAWS, cols: COLS_PNP_DRAWS, toRow: toPnpDraw },
    { table: TBL_PNP_SCORE_FACTORS, cols: COLS_PNP_SCORE_FACTORS, toRow: toPnpScoreFactor },
    { table: TBL_PNP_REQUIREMENTS, cols: COLS_PNP_REQUIREMENTS, toRow: toPnpRequirement },
    { table: TBL_PNP_OPS_STATS, cols: COLS_PNP_OPS_STATS, toRow: toPnpOpsStat },
    { table: TBL_EE_CATEGORIES, cols: COLS_EE_CATEGORIES, toRow: toEeCategory },
    { table: TBL_EE_POINTS_GRID, cols: COLS_EE_POINTS_GRID, toRow: toEePointsGrid },
    { table: TBL_NOC_DESCRIPTIONS, cols: COLS_NOC_DESCRIPTIONS, toRow: toNocDescription },
    { table: TBL_DLI, cols: COLS_DLI, toRow: toDli },
    { table: TBL_PTE_TYPES, cols: COLS_PTE_TYPES, toRow: toPteType },
    { table: TBL_PTE_QUESTIONS, cols: COLS_PTE_QUESTIONS, toRow: toPteQuestion },
    { table: TBL_PTE_AUDIO, cols: COLS_PTE_AUDIO, toRow: toPteAudio },
    { table: TBL_PTE_DICT, cols: COLS_PTE_DICT, toRow: toPteDict },
    { table: TBL_FIELD_SOURCES, cols: COLS_FIELD_SOURCES, toRow: toFieldSource },
    { table: TBL_RANKINGS, cols: COLS_RANKINGS, toRow: toRanking },
    { table: TBL_STATS_OCCUPATION, cols: COLS_STATS_OCCUPATION, toRow: toStatsOccupation },
    { table: TBL_STATS_CITY, cols: COLS_STATS_CITY, toRow: toStatsCity },
    { table: TBL_STATS, cols: COLS_STATS, toRow: toStat },
  ]
}

// =========================================================================
// 5. 灌库(runSeed 主干 → 各阶段;单连接单事务,任一步失败整体回滚)
// =========================================================================

/**
 * seed 一轮:维度表全量重建 → stats_daily 追加 → news upsert →(reset 时清事实表)→
 * companies/jobs 批量 upsert → 实测判死下架 → 「本次未见 + 超 30 天」下架 → 重复标记 → 心跳。
 * 全程单事务:任一步失败整体回滚,不再有半写状态(老逐行版没有原子性)。
 *
 * @param x 连接池与 reset 开关(池由路由注入)。
 * @returns /seed 的响应体。
 */
export async function runSeed(x: RunSeedIn): RunSeedOut {
  const now = new Date().toISOString()
  const counts: Record<string, number> = {}
  let closed = 0
  let closedDead = 0
  const client = await x.db.connect()
  try {
    await client.query(SQL.TX_BEGIN)
    await client.query(SQL.SEED_STATE_CREATE)
    const prevHash = await loadSeedState(client)
    await seedDims({ client: client, now: now, prevHash: prevHash, counts: counts })
    await seedStatsDaily({ client: client, now: now, counts: counts })
    await seedNews({ client: client, now: now, prevHash: prevHash, counts: counts })
    if (x.reset) {
      await resetFacts(client)
    }
    const companies = await seedCompanies({ client: client, now: now, counts: counts })
    const seen = await seedJobs({ client: client, now: now, idBySlug: companies.idBySlug, counts: counts })
    if (x.reset === false) {
      closedDead = await closeDeadJobs({ client: client, now: now })
    }
    unionSeenIds(seen)
    counts[MART_SEEN_IDS] = seen.ids.length
    if (x.reset === false && seen.ids.length > 0) {
      closed = await closeStaleJobs({ client: client, now: now, ids: seen.ids })
    }
    await client.query(SQL.MARK_DUPS)
    await client.query(SQL.CLEAR_DUPS_CLOSED)
    await writeHeartbeat(client)
    await client.query(SQL.TX_COMMIT)
  } catch (e) {
    await rollbackQuietly(client)
    throw e
  } finally {
    client.release()
  }
  return { ok: true, reset: x.reset, counts: counts, closed: closed, closedDead: closedDead, updatedAt: now }
}

/**
 * seed_state 全量读出(#118 表级哈希态;-1/-2/-3 哨兵语义见 constants)。
 *
 * @param client 事务连接。
 * @returns 表 → 上轮哈希。
 */
async function loadSeedState(client: DbClient): SeedHashesOut {
  const out: SeedHashes = {}
  const res = await client.query(SQL.SEED_STATE_ALL)
  for (const row of res.rows) {
    if (typeof row.name === 'string' && typeof row.hash === 'string') {
      out[row.name] = row.hash
    }
  }
  return out
}

/**
 * 维度表:清空 + 批量插入(先清 locked_documents_rels 关联列,B7 教训:漏了会整事务炸)。
 * 三道跳闸依次判:文件缺失 -1(E12-03 防线:不再「清空+重灌 0 行」,要真清空 =
 * 上传内容为 [] 的文件)→ 表未建 -3 → 内容与上轮一致 -2。
 * 全空行(每格都是 null/空串)不入库 —— 与老版 filter 口径逐字一致。
 *
 * @param x 连接、时刻、上轮哈希与计数板。
 * @returns 无(计数就地记)。
 */
async function seedDims(x: SeedDimsIn): DoneOut {
  for (const spec of dimSpecs()) {
    if (martPaths(spec.table).length === 0) {
      x.counts[spec.table] = COUNT_NO_UPLOAD
      continue
    }
    const live = await tableExists({ client: x.client, table: spec.table })
    if (live === false) {
      x.counts[spec.table] = COUNT_NO_TABLE
      continue
    }
    const hash = martHash(spec.table)
    if (x.prevHash[spec.table] === hash) {
      x.counts[spec.table] = COUNT_UNCHANGED
      continue
    }
    const rows: MartRow[] = []
    for (const raw of martRows(spec.table)) {
      const row = spec.toRow(raw)
      if (emptyRow(row)) {
        continue
      }
      row.created_at = x.now
      row.updated_at = x.now
      rows.push(row)
    }
    await x.client.query(SQL.clearLockedRels(spec.table))
    await x.client.query(SQL.deleteAll(spec.table))
    await insertBatch({ client: x.client, table: spec.table, cols: spec.cols.concat(COLS_ROW_TS), rows: rows, suffix: SUFFIX_NONE })
    await x.client.query(SQL.SEED_STATE_UPSERT, [spec.table, hash])
    x.counts[spec.table] = rows.length
  }
}

/**
 * E8-14 stats_daily:**只追加,永不清空**。趋势图的唯一数据来源 —— ETL 每轮只产出
 * 当天的行,按 (date,province,broad) UPSERT:一天多跑几轮只更新今天这批,往前的日期
 * 一律不动;走 dims 的「清空+重灌」会把历史抹掉,所以单独一段。
 * 不做表级哈希跳过 —— 行数很小(百来行),而且 date 每天都变,跳过没意义。
 *
 * @param x 连接、时刻与计数板。
 * @returns 无。
 */
async function seedStatsDaily(x: SeedStatsDailyIn): DoneOut {
  if (martPaths(TBL_STATS_DAILY).length === 0) {
    return
  }
  const rows: MartRow[] = []
  for (const r of martRows(TBL_STATS_DAILY)) {
    const row = toStatsDaily({ r: r, now: x.now })
    if (truthyOf(row.date) === false || truthyOf(row.province) === false) {
      continue
    }
    rows.push(row)
  }
  await insertBatch({ client: x.client, table: TBL_STATS_DAILY, cols: COLS_STATS_DAILY, rows: rows, suffix: SQL.STATS_DAILY_UPSERT })
  x.counts[TBL_STATS_DAILY] = rows.length
}

/**
 * news:按 slug upsert(E12-06 P1f)。懒翻译/速读缓存列由 /api/news/translate、
 * /api/news/summarize 线上写入,seed 不许碰 —— 除非该条 body_en 变了(重抽正文)
 * 才连带清缓存(防错位陈译)。滚出 60 条窗口的行删除;mart 缺文件=跳过(与 dims 同防线)。
 * 预翻批若恢复(budget&gt;0)需同步调整此块。
 *
 * @param x 连接、时刻、上轮哈希与计数板。
 * @returns 无。
 */
async function seedNews(x: SeedNewsIn): DoneOut {
  if (martPaths(TBL_NEWS).length === 0) {
    x.counts[TBL_NEWS] = COUNT_NO_UPLOAD
    return
  }
  const hash = martHash(TBL_NEWS)
  if (x.prevHash[TBL_NEWS] === hash) {
    x.counts[TBL_NEWS] = COUNT_UNCHANGED
    return
  }
  const rows: MartRow[] = []
  const slugs: string[] = []
  for (const r of martRows(TBL_NEWS)) {
    const slug = r.slug
    if (typeof slug !== 'string' || slug === '') {
      continue
    }
    slugs.push(slug)
    rows.push(toNews({ r: r, now: x.now }))
  }
  await x.client.query(SQL.NEWS_UNLOCK_ALL)
  if (rows.length > 0) {
    await x.client.query(SQL.NEWS_DELETE_MISSING, [slugs])
  }
  await insertBatch({
    client: x.client, table: TBL_NEWS, cols: COLS_NEWS, rows: rows,
    suffix: SQL.newsUpsertSuffix({ cols: COLS_NEWS, cache: COLS_NEWS_CACHE }),
  })
  await x.client.query(SQL.SEED_STATE_UPSERT, [TBL_NEWS, hash])
  x.counts[TBL_NEWS] = rows.length
}

/**
 * ?reset=1:清空 jobs/companies 全量重建(先解锁 Payload 文档锁)。
 * ⚠️ 碰生产的破坏性操作 —— 开关在 URL 上,token 门在入口。
 *
 * @param client 事务连接。
 * @returns 无。
 */
async function resetFacts(client: DbClient): DoneOut {
  await client.query(SQL.RESET_UNLOCK_JOBS_COMPANIES)
  await client.query(SQL.RESET_DELETE_JOBS)
  await client.query(SQL.RESET_DELETE_COMPANIES)
}

/**
 * companies 批量 upsert(按 slug;同一语句撞唯一键会整批报错,JS 侧兜底去重)。
 * 被「未变行跳过」的行不进 RETURNING → slug→id 映射改为 upsert 后单独 SELECT
 * 全量取(一条语句,秒级)。
 *
 * @param x 连接、时刻与计数板。
 * @returns slug → 公司 id。
 */
async function seedCompanies(x: SeedCompaniesIn): CompanyIdsOut {
  const seenSlug = new Set<string>()
  const rows: MartRow[] = []
  for (const r of martRows(TBL_COMPANIES)) {
    const s = r.slug
    if (typeof s !== 'string' || s === '' || seenSlug.has(s)) {
      continue
    }
    seenSlug.add(s)
    rows.push(toCompany({ r: r, now: x.now }))
  }
  await insertBatch({
    client: x.client, table: TBL_COMPANIES, cols: COLS_COMPANIES, rows: rows,
    suffix: SQL.companiesUpsertSuffix({ plain: COLS_COMPANIES_PLAIN, coalesce: COLS_COMPANIES_COALESCE }),
  })
  const idBySlug: Record<string, number> = {}
  const res = await x.client.query(SQL.COMPANIES_IDS_BY_SLUGS, [Array.from(seenSlug)])
  for (const row of res.rows) {
    if (typeof row.slug === 'string' && typeof row.id === 'number') {
      idBySlug[row.slug] = row.id
    }
  }
  x.counts[TBL_COMPANIES] = rows.length
  return { idBySlug: idBySlug }
}

/**
 * jobs 批量 upsert(按 external_id)。逐片处理:一片 parse→映射→入库→引用释放,
 * 内存峰值=单片而非全量(27k 行整解析在 512MB 实例 OOM 实撞)。
 * 更新分支不碰 first_seen/created_at;last_seen=抓取时间(mart 透传),没给则保留旧值。
 *
 * @param x 连接、时刻、slug→id 表与计数板。
 * @returns 本轮见过的 external_id 池(下架对账用)。
 */
async function seedJobs(x: SeedJobsIn): SeenPoolOut {
  const seen: SeenPool = { ext: new Set(), ids: [] }
  const suffix = SQL.jobsUpsertSuffix({ cols: COLS_JOBS, fixed: COLS_JOBS_FIXED, coalesce: COLS_JOBS_COALESCE })
  let total = 0
  for (const shard of martPaths(TBL_JOBS)) {
    const list: MartRow[] = JSON.parse(fs.readFileSync(shard, UTF8))
    const rows: MartRow[] = []
    for (const j of list) {
      const ext = j.externalId
      if (typeof ext !== 'string' || ext === '' || seen.ext.has(ext)) {
        continue
      }
      seen.ext.add(ext)
      seen.ids.push(ext)
      rows.push(toJob({ r: j, now: x.now, idBySlug: x.idBySlug }))
    }
    await insertBatch({ client: x.client, table: TBL_JOBS, cols: COLS_JOBS, rows: rows, suffix: suffix })
    total = total + rows.length
  }
  x.counts[TBL_JOBS] = total
  return seen
}

/**
 * 实测判死 → 立即下架(2026-08-03),不受「本次未见+30天」那条规则约束。
 * 为什么单开一条:老规则的保守是给「本次没抓到」这种**推断**兜底的(805 误杀教训);
 * 而 closed_jobs 是 verify_expired 逐帖 GET 拿到 410/「Job posting expired」的**事实**,
 * 不需要拿 30 天去对冲。之前只把死帖剔出 mart,遇上 28 天前就死掉的岗,要再等两天才下架
 * —— 这两天里用户点申请全撞过期页(Fort Qu'Appelle 那位从 Google 招聘富结果进来、
 * 注册、点了两次申请)。closedAt 用判死时刻,详情页 JSON-LD 的 validThrough 直接吃它,
 * 过期岗才不会继续以「有效招聘」的身份喂给 Google。
 *
 * @param x 连接与时刻。
 * @returns 立即下架的条数。
 */
async function closeDeadJobs(x: CloseDeadIn): CountOut {
  if (martPaths(MART_CLOSED_JOBS).length === 0) {
    return 0
  }
  const seen = new Set<string>()
  const rows: MartRow[] = []
  const list: (MartRow | null)[] = martRows(MART_CLOSED_JOBS)
  for (const r of list) {
    if (r == null) {
      continue
    }
    const ext = r.externalId
    if (typeof ext !== 'string' || ext === '' || seen.has(ext)) {
      continue
    }
    seen.add(ext)
    let closedAt: MartValue = x.now
    if (truthyOf(r.closedAt)) {
      closedAt = cellOf(r.closedAt)
    }
    rows.push({ external_id: ext, closed_at: closedAt })
  }
  if (rows.length === 0) {
    return 0
  }
  await x.client.query(SQL.TEMP_DEAD_EXT)
  await insertBatch({ client: x.client, table: TBL_DEAD_EXT, cols: COLS_DEAD_EXT, rows: rows, suffix: SUFFIX_NONE })
  await x.client.query(SQL.ANALYZE_DEAD_EXT)
  const res = await x.client.query(SQL.CLOSE_DEAD_EXT, [x.now])
  if (res.rowCount != null) {
    return res.rowCount
  }
  return 0
}

/**
 * 「本轮见过」名单并集(2026-08-04 数据销毁修)。
 * 病根:seenIds 原来 = mart.jobs 的 externalId,而 mart.jobs 已被 09 的**展示去重**
 * (company|title,不含城市)砍过一刀;被砍掉的帖因此退出「见过」集,满 30 天被下架规则
 * 静默 closed —— 可它们在官方仍在招(抽样 60%),在 DB 里也不算重复(DB 判重是
 * company×title×city)。展示去重与下架对账从此解耦:09 另出一张 seen_ids
 * (本轮源数据里真实见到、未判死的全部 posting id)。
 * ⚠️ 防线(最危险的回归:名单缺失把全库下架):**只做并集,不做替换** ——
 * ① seen_ids 文件缺失/为空 → 集合退回等于 mart.jobs 的 id(= 修改前的老行为),不会变空;
 * ② seen_ids 在 → 集合是老行为的超集,只可能少下架、绝不可能多下架;
 * ③ 集合为空仍走调用方 `length &gt; 0` 的老闸门,直接跳过下架。
 * 任何一步读文件失败都会抛错 → 整事务回滚(martPaths 对「目录都不存在」也是抛错不是空表)。
 *
 * @param seen jobs 分片收集出的见过池(就地并入)。
 * @returns 无。
 */
function unionSeenIds(seen: SeenPool): void {
  for (const p of martPaths(MART_SEEN_IDS)) {
    const ids: (string | null)[] = JSON.parse(fs.readFileSync(p, UTF8))
    for (const id of ids) {
      if (id != null && id !== '' && seen.ext.has(id) === false) {
        seen.ext.add(id)
        seen.ids.push(id)
      }
    }
  }
}

/**
 * 下架(非 reset):只下架「本次未见 且 发布已超 EXPIRE_DAYS 天」的岗。
 * 不用「本次没出现就 closed」对账:增量抓取只含最近几天,会误杀仍在招的旧岗
 * (实测 805,见 docs/source-framework.md)。
 * 本次见到的 external_id 灌进带主键的临时表,下架走 NOT EXISTS 反连接 ——
 * 原 `NOT (external_id = ANY($seenIds))`:5.2 万元素数组对每个候选行线性搜
 * (≈ 待检行 × 5.2万),库涨到 5 万岗后超线性变慢 → seed 整轮撞 180s 超时
 * (mart 已传但灌不进库);临时表主键让反连接走索引/哈希探测,下架从超时降到秒级,
 * ON COMMIT DROP 随本事务清理。单列表灌 5 万行走 unnest 一条语句
 * (原 insertBatch 300 行/句 ≈ 164 次往返;并入 seen_ids 后名单从 3.4 万涨到 4.9 万,
 * 别把往返数也一起涨);数组参数只占 1 个占位符,不碰 65535 上限。
 *
 * @param x 连接、时刻与本轮见过的 id 清单(非空)。
 * @returns 下架条数。
 */
async function closeStaleJobs(x: CloseStaleIn): CountOut {
  const cutoff = new Date(Date.now() - EXPIRE_DAYS * DAY_MS).toISOString()
  await x.client.query(SQL.TEMP_SEEN_EXT)
  await x.client.query(SQL.SEEN_EXT_INSERT, [x.ids])
  await x.client.query(SQL.ANALYZE_SEEN_EXT)
  const res = await x.client.query(SQL.CLOSE_STALE, [x.now, cutoff])
  if (res.rowCount != null) {
    return res.rowCount
  }
  return 0
}

/**
 * ETL 心跳(2026-07-26):每轮 seed 成功都写一笔,前端「最近核对」读它
 * (docs/sql/etl-heartbeat.sql)。与 max(last_seen) 的区别:数据没变也照样动,
 * 回答的是「刚核对过官方来源」而不是「数据变过」。
 * 表未落地(部署时序)→ 42P01 忽略,不能让心跳把整轮灌库回滚。
 *
 * @param client 事务连接。
 * @returns 无。
 */
async function writeHeartbeat(client: DbClient): DoneOut {
  try {
    await client.query(SQL.HEARTBEAT_UPSERT)
  } catch (e) {
    if (e instanceof Error && pgCodeOf(e) === PG_UNDEFINED_TABLE) {
      return
    }
    throw e
  }
}

/**
 * 回滚且吞掉回滚自身的次生错(连接已断时 ROLLBACK 也会抛)——
 * 主错误在调用方 rethrow,别让次生错把它盖住;这是全域唯一一处静默 catch。
 *
 * @param client 事务连接。
 * @returns 无。
 */
async function rollbackQuietly(client: DbClient): DoneOut {
  try {
    await client.query(SQL.TX_ROLLBACK)
  } catch {
    return
  }
}

/**
 * 一张表的 mart 行全量读出(分片按序拼接;jobs 不走它 —— 逐片流式,见 seedJobs)。
 *
 * @param name 表名。
 * @returns 行清单。
 */
function martRows(name: string): MartRows {
  const out: MartRow[] = []
  for (const p of martPaths(name)) {
    const rows: MartRow[] = JSON.parse(fs.readFileSync(p, UTF8))
    for (const row of rows) {
      out.push(row)
    }
  }
  return out
}

/**
 * 全空行判定(每格都是 null/空串的行不入库;与老版 filter 口径逐字一致 ——
 * false/0 是有效值,保留)。
 *
 * @param row 库行。
 * @returns 是不是全空。
 */
function emptyRow(row: MartRow): boolean {
  for (const v of Object.values(row)) {
    if (v !== null && v !== '') {
      return false
    }
  }
  return true
}

/**
 * 分批多行 INSERT(可带 ON CONFLICT 后缀)。语句文本由 SQL.insertRows 拼版,
 * 这里只按 行 × 列 铺平参数(缺格灌 NULL)。
 * 跨边界断言(params as SqlParam[]):jsonb 列的绑定值是对象/数组,不在 SqlParam 的
 * 标量联合里 —— pg 会按列类型序列化收下;SqlParam 不为 seed 一个调用方扩容,
 * 断言留在边界这一行。
 *
 * @param x 连接、表、列、行与后缀。
 * @returns 无。
 */
async function insertBatch(x: InsertBatchIn): DoneOut {
  for (let i = 0; i < x.rows.length; i += BATCH_ROWS) {
    const chunk = x.rows.slice(i, i + BATCH_ROWS)
    const params: MartValue[] = []
    for (const row of chunk) {
      for (const col of x.cols) {
        let v: MartValue = null
        const got = row[col]
        if (got != null) {
          v = got
        }
        params.push(v)
      }
    }
    const stmt = SQL.insertRows({ table: x.table, cols: x.cols, rowCount: chunk.length, suffix: x.suffix })
    await x.client.query(stmt, params as SqlParam[])
  }
}

/**
 * 表存在探针(to_regclass 查不到只返回 null,不抛错、也不污染事务)。
 *
 * @param x 连接与表名。
 * @returns 存在与否。
 */
async function tableExists(x: TableExistsIn): BoolOut {
  const res = await x.client.query(SQL.TABLE_EXISTS, [x.table])
  for (const row of res.rows) {
    if (truthyOf(row.t)) {
      return true
    }
    return false
  }
  return false
}

/**
 * pg 错误码读出(pg 把五位错误码挂在 Error 的 code 上;PgCoded 是外部库定死的形状,
 * 单断言过桥 —— Error 与它结构重叠,编译器仍在查)。
 *
 * @param e 捕到的错误(调用方已收窄成 Error)。
 * @returns 错误码;没有是 null。
 */
function pgCodeOf(e: CaughtError): MaybeCode {
  const coded = e as Error & PgCoded
  const c = coded.code
  if (typeof c === 'string') {
    return c
  }
  return null
}
