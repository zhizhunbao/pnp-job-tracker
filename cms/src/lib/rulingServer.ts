/**
 * 判定域在本站的**服务端接线**:连接池、两份底数的进程内 TTL 缓存、当前这个人。
 *
 * 判定域自己只声明「我需要一份底表 / 一个能 query 的东西 / 一个按省取名录的函数」,
 * 谁去把它们凑齐,是这一层的事。
 *
 * 🔴 **为什么它不在 `lib/ruling/` 里**:缓存要连 `payload` 才能拿到连接池,而判定域的
 * `functions.ts` 一行 `payload` 都不许 import(否则连接池会被打进浏览器包,tsc 全绿、build 才炸)。
 * 宪法把这种东西判给路由层:「带 `payload` 的进程内缓存不属于域 —— 那是路由层的基建
 * (跨路由单件、TTL)」。判定域只声明「我需要一份底表 / 一个按省取名录的函数」,谁去取由这里管。
 *
 * 🔴 **必须是跨路由单件**,不是每个 route 模块各存一份 —— 那是两倍的整库扫描
 * (详情页是全站流量最大的页,判定底表禁每请求现算,prod-pool-wedge 教训)。
 * 模块级可变状态在别处是禁的,这里是它存在的唯一理由,所以特批并写明。
 *
 * @author Frank
 * @time 2026-08-20 18:20:00
 */

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import * as SQL from './db/sql'
import { getUser, isPro } from './quota/server'
import { buildTripleWire, loadVerdictTables } from './ruling/server'
import type {
  AnswerBag, ClientAnswers, DesignatedEmployerRow, Queryable, TripleWireResult, VerdictData,
} from './ruling/server'

/**
 * 缓存活多久。Render 单实例,重启即失效;与 `/api/quiz` 的 topCache 同手法。
 */
const TTL = 10 * 60_000

/**
 * 日期列只取到日(`YYYY-MM-DD`)。
 */
const DATE_LEN = 10

/**
 * 六张判定底表的那一份缓存。**跨路由单件**,见文件头。
 */
let tables: { at: number; data: VerdictData } | null = null

/**
 * 指定雇主名录按省的缓存。查失败**不写进来** —— 不把一次抖动钉死 10 分钟。
 */
const byProvince = new Map<string, { at: number; rows: DesignatedEmployerRow[] }>()

/**
 * 拿连接池。判定域的取数函数都收它当参数,由这里注进去。
 *
 * `payload.db` 的公开类型里没有 `pool`(适配器各家不同),这是**跨边界的形状** ——
 * 断言留着,理由写在这一行上方(宪法「跨边界的断言留着,并写清为什么」)。
 *
 * @returns 能打 SQL 的东西。
 */
export async function getPool(): Promise<Queryable> {
  const payload = await getPayload({ config: await config })
  // 跨边界:Postgres 适配器实际挂着 pg 的连接池,但它不在 payload 的公开类型里
  const holder = payload.db as unknown as { pool: Queryable }
  return holder.pool
}

/**
 * 六张判定底表。TTL 内直接给缓存那一份。
 *
 * @returns 六张底表。
 */
export async function getVerdictData(): Promise<VerdictData> {
  if (!tables || Date.now() - tables.at > TTL) {
    tables = { at: Date.now(), data: await loadVerdictTables(await getPool()) }
  }
  return tables.data
}

/**
 * 指定雇主名录**按省**的全量行(判定卡的雇主名字匹配用;`matchDesignation` 是纯函数,候选由这里喂)。
 *
 * 🔴 不能改用 `VerdictData.designatedEmployers` —— 那一份是 **NL 专用**(判定核拿它当
 * 「NL 名录里有几家申报过这个 NOC」的分母),扩成四省会把那个分母一起改掉。
 *
 * 单省最大 NS 1,574 行约 60KB,四省全热也就约 200KB。查失败返回空 →
 * 判定落「名录没认出」= **本站的缺口**,不写「未被指定」。
 *
 * @param province 两位省码。
 * @returns 该省的名录行;省码为空或查失败则空。
 */
export async function getDesignatedEmployers(province: string): Promise<DesignatedEmployerRow[]> {
  const prov = (province || '').trim()
  if (!prov) return []
  const hit = byProvince.get(prov)
  if (hit && Date.now() - hit.at <= TTL) return hit.rows

  const db = await getPool()
  const res = await db.query(SQL.DESIGNATED_BY_PROV, [prov]).catch(nullResult)
  if (!res) return []

  const rows: DesignatedEmployerRow[] = []
  for (const d of res.rows) rows.push(designatedRow(d))
  byProvince.set(prov, { at: Date.now(), rows })
  return rows
}

/**
 * 查挂了交回 null —— 给 `.catch()` 用的具名函数。**不缓存失败**。
 *
 * @returns null。
 */
function nullResult(): null {
  return null
}

/**
 * 库里一行名录 → 判定认的那一行。
 *
 * @param d 库里那一行。
 * @returns 判定认的那一行。
 */
function designatedRow(d: Record<string, string | number | boolean | null>): DesignatedEmployerRow {
  return {
    name: String(d.name ?? ''),
    province: String(d.province ?? ''),
    location: String(d.location ?? ''),
    isTech: !!d.is_tech,
    source: String(d.source ?? ''),
    nocs: String(d.nocs ?? ''),
    url: d.url ? String(d.url) : undefined,
    fetched: d.fetched ? String(d.fetched).slice(0, DATE_LEN) : undefined,
  }
}

/**
 * 判定卡的下行数据 —— `/api/triple-verdict` 与 `/plan/pr?job=` 的 SSR 首屏共用这一条口径。
 *
 * 这一层只负责把判定域要的东西凑齐:连接池、六张底表、按省取名录的函数,以及**当前这个人**
 * (登录态与 Pro 与否)。付费闸在判定域里,两处调用都走同一道闸,SSR 不会多漏一行。
 *
 * @param id 岗位号。
 * @param answers 浏览器本地那份答案;SSR 时传 null(服务端读不到 localStorage)。
 * @returns 整张卡,或一句错误加 HTTP 码。
 */
export async function tripleWireOf(id: number, answers: ClientAnswers): Promise<TripleWireResult> {
  const user = await getUser(await headers()).catch(nullUser)
  // 跨边界:Users 集合上挂着 profile 组,但 getUser 的返回类型只声明了鉴权要的那几格
  const holder = user as { profile?: AnswerBag } | null
  return buildTripleWire({
    db: await getPool(),
    id: id,
    answers: answers,
    profile: holder?.profile ?? {},
    loggedIn: !!user,
    pro: isPro(user),
    data: await getVerdictData(),
    designatedOf: getDesignatedEmployers,
  })
}

/**
 * 解不出登录态时当没登录 —— 给 `.catch()` 用的具名函数。
 *
 * @returns null。
 */
function nullUser(): null {
  return null
}
