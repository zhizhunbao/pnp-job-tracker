/**
 * 数据库层的纯函数:从 payload 结构里摸池。
 *
 * 行相关的两样(默认值词汇表、`queryRows` 管道)2026-08-22 挪进 `./rows.ts`
 * (十件套的第十个抽屉);本文件只剩与「行」无关的纯函数。
 *
 * 🔵 **本文件不沾 payload 运行时,浏览器也能打包** —— 真去连库的那半在 `./pool.ts`。
 *
 * @author Frank
 * @time 2026-08-21 15:20:30
 *
 * 尾段注(rows 抽屉 2026-08-23 撤编并入):词汇表(2026-08-21 Frank 拍板)是
 * 「每条 SQL 一个行映射函数」的用词表 —— 每格空值决策用词的选择说话,review 时
 * 看词就知道对错,红线 greppable。封口:要加新词,先回答它的空值语义与已有的
 * 哪里不同,写进默认值架构卷宗的表格再加。
 */

import { dbPoolError } from '../error'
import { DB_LOG, log } from '../log'
import type { DbPool, PayloadWithPool, QueryRowsIn } from './types'

/**
 * 从已有的 payload 实例取池。取不到直接抛 —— 60 个调用点里只有 4 个做了 `if (!pool)` 兜底,
 * 其余 56 个是「拿到就 query」,池若为空它们会炸在 `Cannot read property 'query' of undefined`,
 * 谁也看不出是数据库没连上。宁可抛一句人话(2026-08-26 造错收编 lib/error 的 dbPoolError,话术不变)。
 * 入参同 poolOf 收 `PayloadWithPool`(结构类型,Payload 实例天然满足),unknown 退役。
 * (原住 server.ts;2026-08-21「门里只许转发」闸立起后搬来 —— 它不沾 payload 运行时,住得进纯函数抽屉。)
 *
 * @param payload payload 实例(只认摸池那一格的形状)。
 * @returns 连接池;取不到抛人话。
 */
export function dbOf(payload: PayloadWithPool): DbPool {
  const pool = poolOf(payload)
  if (pool == null) {
    throw dbPoolError()
  }
  return pool
}

/**
 * 从 payload 形状的对象里摸池。入参必须是真实例(调用方手里若可能没有,先自己判);
 * 回 null 只表示一件事:这个实例不是 postgres adapter、身上没有池 —— 抛不抛人话
 * 由调用方(上面的 `dbOf`)决定,本函数不造错。
 *
 * @param payload payload 实例(只认摸池那一格的形状)。
 * @returns 连接池;不是 postgres adapter 是 null。
 */
export function poolOf(payload: PayloadWithPool): DbPool | null {
  if (payload.db == null || payload.db.pool == null) {
    return null
  }
  return payload.db.pool
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * 库里的脏字符串 → 干净字符串,空值落空串。显示与拼接的兜底,永远无害。
 * 入参收显式联合不收 unknown(2026-08-21 Frank 抓包):行形状(XxxDbRow)落地后
 * 调用方全是类型化的列值,unknown 只剩「把整个对象塞进来」这种错没人拦。
 * 联合带 boolean 是因为库标量整格(ruling 的 Cell)就含它 —— String(true)='true' 无害;
 * 真想显示布尔列先问自己要显示什么词。
 *
 * @param x 库回的标量格。
 * @returns 字符串;空值是空串。
 */
// eslint-disable-next-line local/no-undefined-type -- 消化点:行/袋索引缺席就是 undefined,照实收、就地兑换(开灯批 2026-08-26)
export function text(x: string | number | boolean | null | undefined): string {
  if (x == null) {
    return ''
  }
  return String(x)
}

/**
 * 计数 → 数字,空值落 0。**只给「个数」类的列用** —— 「一个都没有」本身就是答案,0 无害。
 * 收 `string` 是因为 pg 的 numeric/bigint 按字符串交回来。
 *
 * @param x 库回的计数格。
 * @returns 数字;空值是 0。
 */
// eslint-disable-next-line local/no-undefined-type -- 消化点:同 text(开灯批)
export function count(x: number | string | boolean | null | undefined): number {
  if (x == null) {
    return 0
  }
  return Number(x)
}

/**
 * 🔴 官方可空的数值 → 保 null。隐私抑制值(「Less than 10」)、没公布的分数线、
 * `rule` 行的阈值 —— 折成 0 就是替官方编数。这类列上看见 `count()` 就是 bug。
 * 收 `string` 同 `count`:pg 的 numeric/bigint 按字符串交回来。
 * 空串与解析不出的一并落 null(2026-08-21 收拢 ruling 的 numOf 时抓到的岔:
 * `Number('')` 是 **0** —— 空串折成 0 正是这个词要防的「替官方编数」)。
 *
 * @param x 库回的数值格。
 * @returns 数字;空/解析不出保 null。
 */
// eslint-disable-next-line local/no-undefined-type -- 消化点:同 text(开灯批)
export function numOrNull(x: number | string | boolean | null | undefined): number | null {
  if (x == null || x === '') {
    return null
  }
  const n = Number(x)
  if (Number.isFinite(n)) {
    return n
  }
  return null
}

/**
 * 🔴 官方可空的文字 → 保 null。`text` 的 null-保留配对(和 `numOrNull` 之于 `count` 同构):
 * scale(分制名)这类「官方没写就是没写」的列,折成空串会和「写了空」混掉。
 * (2026-08-21 收拢 ruling 词对时补的第五个词;语义表见默认值架构卷宗。)
 *
 * @param x 库回的文字格。
 * @returns 字符串;空值保 null。
 */
// eslint-disable-next-line local/no-undefined-type -- 消化点:同 text(开灯批)
export function textOrNull(x: string | number | boolean | null | undefined): string | null {
  if (x == null) {
    return null
  }
  return String(x)
}

/**
 * 出边界:干净的可空数值 → 显示串,null → ''。它是 `numOrNull` 的显示端配对 ——
 * 「没公布」显示成空,由消费端拿官方原文补位;**不是**入边界收窄,别拿它洗脏行。
 * (2026-08-21 加第四个词的理由:闸抓到 `pointsFacts` 的 `points == null ? '' : String(points)`,
 * 语义与前三个词都不同 —— 前三个收进来,这个送出去。)
 *
 * @param x 干净的可空数值。
 * @returns 显示串;null 显示成空。
 */
export function show(x: number | null): string {
  if (x == null) {
    return ''
  }
  return String(x)
}

/**
 * **行级接缝词**:行清单 → 首行;零行 = null。前面的词管「格」的空值,这个管「行」的
 * 缺席 —— 数组下标是语言接缝(缺席是 undefined),这个词把它兑换成 null(我们的「没有」)。
 * ⚠️ 对「必须恰一行」的断言场景别用它:那是吞错,该让零行炸响。
 * (开灯批 2026-08-26 进表:noUncheckedIndexedAccess 揭出全站几十处 `rows[0]` 手写判空,
 * 语义表见默认值架构卷宗 §2.1。)
 *
 * @param rows 行清单。
 * @returns 首行;零行 null。
 */
export function firstOf<T>(rows: T[]): T | null {
  const first = rows[0]
  if (first == null) {
    return null
  }
  return first
}

/**
 * 行清单 → 首行;零行折默认值。🔴 只给「缺行 = 中性默认」的查询(计数聚合的 0、
 * 空壳兜底行);「官方可空」的行拿它折默认 = 编数,同 `count` 的禁区(2026-08-26 进表)。
 * 双参是 `firstOf` 的带默认变体,与 sort 比较器同理由:第二参就是这个词的语义本体。
 *
 * @param rows 行清单。
 * @param or 零行时的默认值(必须「中性」,不许拿它编造官方没给的行)。
 * @returns 首行或默认值。
 */
export function firstOr<T>(rows: T[], or: T): T {
  const first = rows[0]
  if (first == null) {
    return or
  }
  return first
}

/**
 * 🔴 json 格词汇:jsonb 驱动交**对象**照放,文本列绕行交**字符串**当场 JSON.parse,
 * 解析不出**留痕落 null**(不静默、不编数)。`R` 由那一格在行形状(XxxDbRow)上声明的
 * 对象形状推出,体内 `as R` 是跨边界断言:JSON.parse 的返回没有形状,形状由 ETL 写入方保证。
 * 2026-08-22 Frank 两问「透传函数有什么意义」后定型:此前各域为 json 列各写一份
 * 解析接缝 + 一只恒等 map 凑管道合同 —— 解析收成这一个词、就地进行构造器,恒等函数退役。
 *
 * @param x 库回的 json 格(对象 / JSON 串 / null)。
 * @returns 解析好的对象;没有或坏的是 null。
 */
// eslint-disable-next-line local/no-undefined-type -- 消化点:同 text(开灯批)
export function jsonOrNull<R>(x: R | string | null | undefined): R | null {
  if (x == null) {
    return null
  }
  if (typeof x !== 'string') {
    return x
  }
  try {
    return JSON.parse(x) as R
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: DB_LOG.tag, text: `${DB_LOG.jsonParseFailed}${why}` })
    return null
  }
}

/**
 * `queryRows` 的吞错版:**查不动回空数组,不抛**,但必须留痕 —— 选它 = 选了
 * 「缺一张表按『本站未收录』降级,不把整页拖成 500」这条口径(判定层的底表就是这么用的)。
 * 「这张表没数据」和「这条 SQL 一直在报错」在日志里分得开,靠的就是这行留痕。
 *
 * @param input 能查的东西、SQL、绑定参数与行映射函数。
 * @returns 映射完的行;查不动是空数组。
 */
export async function queryRowsOrEmpty<R>(input: QueryRowsIn<R>): Promise<R[]> {
  try {
    return await queryRows(input)
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: DB_LOG.tag, text: `${DB_LOG.rowsQueryFailed}${why}` })
    return []
  }
}

/**
 * 跑一条语句并把**每一行**过一遍映射函数 —— 返回的数组就是干净的 `R[]`,
 * 每格的 null/空串在映射里(用词汇表)已经处理完,调用端直接用,不再各自兜底。
 *
 * 🔴 泛型 `R` 由 `map` 的返回类型推出来,**不是**「传个 type 进来」:类型参数在运行时不存在,
 * 光标注保证不了任何一格 —— 运行时的保证只能来自那只映射函数(2026-08-21 Frank 提「query 泛型化」
 * 时定的形态:传的是函数,类型跟着函数走,本层不撒谎)。
 *
 * @param input 能查的东西、SQL、绑定参数与行映射函数。
 * @returns 映射完的行。
 */
export async function queryRows<R>(input: QueryRowsIn<R>): Promise<R[]> {
  const res = await input.db.query(input.sql, input.params)
  const out: R[] = []
  for (const row of res.rows) {
    out.push(input.map(row))
  }
  return out
}
