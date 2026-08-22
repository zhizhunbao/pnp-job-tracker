/**
 * 统计域的行为:slug 映射(浏览器也用)+ 六个取数(E5-04 地区统计 / E8-14 主图 / 批B 省卡)。
 * 取数只做「SELECT → 行映射」,零计算,页面只渲染;SQL 文本全在 `lib/db/sql`。
 * 池由调用方注进来(拍板③),本文件不 import payload。
 *
 * 2026-08-22 十件套定型时的两处收窄:`loadStats` 的 where/params 两个参数
 * 全站调用从来都是空 —— 收成 `{db, withMid}`;`loadCityStats` 的 limit 全站只用默认 400 ——
 * 收成常量 `CITY_LIMIT`。要变的那天再还给入参,别让没人用的自由度撑着签名。
 *
 * @author Frank
 * @time 2026-08-22 14:00:00
 */

import { queryRows, queryRowsOrEmpty, SQL } from '../db'
import type { Db } from '../db'
import {
  BROAD_SLUGS, CITY_LIMIT, OCC_COL_PREFIX, OCC_EXTRA_COLUMNS, PG_UNDEFINED_COLUMN, PG_UNDEFINED_TABLE,
  STAT_SOURCE_FIELDS,
} from './constants'
import { toCityRow, toColumnName, toNocCode, toOccRow, toSrcRow, toStatProvDiffFact, toStatProvInfoFact, toStatRow } from './rows'
import type {
  CaughtError, ChannelNocsOut, ChannelNocsQueryIn, CityRowsOut, MaybeStr, OccRowsOut,
  PgFailure, ProvExtraMap, ProvExtraOut, SrcRowsOut,
  StatsIn, StatsOut, StrList, StrListOut,
} from './types'

/**
 * URL slug → 本站大类(数据值);认不出 null。
 *
 * @param slug 大类的 URL slug(如 'healthcare')。
 * @returns 大类中文数据值;认不出是 null。
 */
export function slugToBroad(slug: string): MaybeStr {
  for (const [k, v] of BROAD_SLUGS) {
    if (k === slug) {
      return v
    }
  }
  return null
}

/**
 * pg 错误码(pg 的错误对象带 code;不是它的错空串)。体内那一步 `as PgFailure` 是跨边界断言:
 * code 是 pg 挂上去的,TS 看不见 —— 形状声明在 types 的 `PgFailure`。
 *
 * @param e 捕到的错误。
 * @returns pg 错误码;不是 pg 的错是空串。
 */
function pgCodeOf(e: CaughtError): string {
  const withCode = e as PgFailure
  if (typeof withCode.code === 'string') {
    return withCode.code
  }
  return ''
}

/**
 * 地区统计行(stats 表)。withMid=true 才带中类行(仅图表下钻用);默认只回大类层 ——
 * 既有页面(省页/对比/表格)口径不变不重复计数。
 * 缺列容错(E12-06 教训):mid 列 DDL 未落地时自动降级为无 mid 查询,行回退 mid='all',页面照常;
 * 其余错误照抛(调用方各自 .catch 决定丢哪块)。
 *
 * @param input 连接与粒度开关。
 * @returns 统计行。
 */
export async function loadStats(input: StatsIn): StatsOut {
  let sql = SQL.STATS_BROAD_ROWS
  if (input.withMid) {
    sql = SQL.STATS_WITH_MID
  }
  try {
    return await queryRows({ db: input.db, sql: sql, params: [], map: toStatRow })
  } catch (e) {
    if (e instanceof Error && pgCodeOf(e) === PG_UNDEFINED_COLUMN) {
      return queryRows({ db: input.db, sql: SQL.STATS_FALLBACK_BROAD, params: [], map: toStatRow })
    }
    throw e
  }
}

/**
 * 省卡 IRCC 体量 + 难度档(批B #133):info=provinces.info jsonb(学签/工签/PR,
 * scrape_ircc_stats 产),tier=stats.difficulty(broad=all 行)的 tier 字段;
 * 两者与 E8-12 省弹框同源,不另造口径。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 省码 → 省卡增补。
 */
export async function loadProvExtra(db: Db): ProvExtraOut {
  const [infoRows, diffRows] = await Promise.all([
    queryRows({ db: db, sql: SQL.PROVINCES_INFO, params: [], map: toStatProvInfoFact }),
    queryRows({ db: db, sql: SQL.PROV_DIFFICULTY, params: [], map: toStatProvDiffFact }),
  ])
  const out: ProvExtraMap = {}
  for (const r of infoRows) {
    out[r.code] = { info: r.info, tier: null }
  }
  for (const r of diffRows) {
    const hit = out[r.province]
    if (hit != null) {
      hit.tier = r.tier
    } else {
      out[r.province] = { info: null, tier: r.tier }
    }
  }
  return out
}

/**
 * citation 来源(复用 E4-04 field-sources 维度):岗量=Job Bank、薪资=ESDC、通道=省清单。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 来源行。
 */
export async function loadStatSources(db: Db): SrcRowsOut {
  return queryRows({ db: db, sql: SQL.STAT_FIELD_SOURCES, params: [STAT_SOURCE_FIELDS], map: toSrcRow })
}

/**
 * E8-14 统计主图·职业粒度(mart 算好,这里只 SELECT)。
 * 派生列**逐列探测**而不是整句 try/catch:E13-02 的 DDL 分批落库,少一列不该把其余几列
 * 一起打回 null —— 探到哪列就 SELECT 哪列,没探到的映射层给 null(前端「null=整块不渲」照旧)。
 * 缺表容错(同 loadStats 的 42703 先例):DDL 未落地时回空数组,主图整块不渲,页面照常。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 职业统计行。
 */
export async function loadOccStats(db: Db): OccRowsOut {
  const have = await queryRowsOrEmpty({ db: db, sql: SQL.STATS_OCC_HAS_COLUMNS, params: [OCC_EXTRA_COLUMNS], map: toColumnName })
  let extra = ''
  for (const c of have) {
    if (c !== '') {
      extra += OCC_COL_PREFIX + c
    }
  }
  try {
    return await queryRows({ db: db, sql: SQL.statsOccupations(extra), params: [], map: toOccRow })
  } catch (e) {
    if (e instanceof Error) {
      const code = pgCodeOf(e)
      if (code === PG_UNDEFINED_TABLE || code === PG_UNDEFINED_COLUMN) {
        return []
      }
    }
    throw e
  }
}

/**
 * E8-14 统计主图·城市粒度(城市译名借 cities 维度表:48 个主要城市有中/韩名,
 * 小镇留空 → 前端回退英文原名)。缺表容错同 loadOccStats。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 城市统计行(按在招量取前 CITY_LIMIT)。
 */
export async function loadCityStats(db: Db): CityRowsOut {
  try {
    return await queryRows({ db: db, sql: SQL.CITY_STATS, params: [CITY_LIMIT], map: toCityRow })
  } catch (e) {
    if (e instanceof Error) {
      const code = pgCodeOf(e)
      if (code === PG_UNDEFINED_TABLE || code === PG_UNDEFINED_COLUMN) {
        return []
      }
    }
    throw e
  }
}

/**
 * 单条通道码清单(缺表/缺列回空,其余照抛 —— 与 loadOccStats 同一容缺口径)。
 *
 * @param input 连接与语句。
 * @returns 去空后的职业码清单。
 */
async function channelNocsOf(input: ChannelNocsQueryIn): StrListOut {
  try {
    const rows = await queryRows({ db: input.db, sql: input.sql, params: [], map: toNocCode })
    const out: StrList = []
    for (const n of rows) {
      if (n !== '') {
        out.push(n)
      }
    }
    return out
  } catch (e) {
    if (e instanceof Error) {
      const code = pgCodeOf(e)
      if (code === PG_UNDEFINED_TABLE || code === PG_UNDEFINED_COLUMN) {
        return []
      }
    }
    throw e
  }
}

/**
 * E8-14 ⑥ 通道筛选(Frank 2026-07-28:「哪些能走 ee pnp aip qc 的单独通道也需要筛选」):
 * 只取**职业粒度能判定**的两条 —— 省提名具名清单(pnp_occupations)与联邦 EE 类别(ee_categories)。
 * AIP 只有雇主级名单(职业粒度要先给统计表补列),QC 数据层没有职业清单 —— 两者不在此列,不假装能筛。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 两条通道的职业码清单。
 */
export async function loadChannelNocs(db: Db): ChannelNocsOut {
  const [pnp, ee] = await Promise.all([
    channelNocsOf({ db: db, sql: SQL.PNP_NOCS_DISTINCT }),
    channelNocsOf({ db: db, sql: SQL.EE_NOCS_DISTINCT }),
  ])
  return { pnp: pnp, ee: ee }
}
