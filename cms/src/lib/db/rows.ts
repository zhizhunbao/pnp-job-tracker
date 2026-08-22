/**
 * 行的出生:默认值词汇表(行格的词)+ `queryRows`(行的管道)。
 *
 * rows.ts 是十件套的第十个抽屉(2026-08-21 Frank 立):各域的 rows.ts 装「SQL 原始行 →
 * 本域形状」的 to* 构造器;db 域没有业务行,它的 rows 装的是构造器们共用的**词**与**管道**。
 * 词汇表(2026-08-21 Frank 拍板)是「每条 SQL 一个行映射函数」的用词表:
 * 每格空值决策用词的选择说话,review 时看词就知道对错,红线 greppable。
 * 封口:要加新词,先回答它的空值语义与已有的哪里不同,写进默认值架构卷宗的表格再加。
 *
 * 🔵 本文件不沾 payload,浏览器也能打包 —— 真去连库的那半在 `./server.ts`。
 *
 * @author Frank
 * @time 2026-08-21 20:56:11
 */

import { DB_LOG, log } from '../log'
import type { QueryRowsIn } from './types'

/**
 * 库里的脏字符串 → 干净字符串,空值落空串。显示与拼接的兜底,永远无害。
 * 入参收显式联合不收 unknown(2026-08-21 Frank 抓包):行形状(XxxDbRow)落地后
 * 调用方全是类型化的列值,unknown 只剩「把整个对象塞进来」这种错没人拦。
 * 联合带 boolean 是因为库标量整格(ruling 的 Cell)就含它 —— String(true)='true' 无害;
 * 真想显示布尔列先问自己要显示什么词。
 */
export function text(x: string | number | boolean | null): string {
  if (x == null) {
    return ''
  }
  return String(x)
}

/**
 * 计数 → 数字,空值落 0。**只给「个数」类的列用** —— 「一个都没有」本身就是答案,0 无害。
 * 收 `string` 是因为 pg 的 numeric/bigint 按字符串交回来。
 */
export function count(x: number | string | boolean | null): number {
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
 */
export function numOrNull(x: number | string | boolean | null): number | null {
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
 */
export function textOrNull(x: string | number | boolean | null): string | null {
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
 */
export function show(x: number | null): string {
  if (x == null) {
    return ''
  }
  return String(x)
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
export function jsonOrNull<R>(x: R | string | null): R | null {
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
