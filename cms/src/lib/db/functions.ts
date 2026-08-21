/**
 * 数据库层的纯函数:默认值词汇表 + 从 payload 结构里摸池。
 *
 * 🔵 **本文件不沾 payload,浏览器也能打包** —— 真去连库的那半在 `./server.ts`。
 * 词汇表(2026-08-21 Frank 拍板)是「每条 SQL 一个行映射函数」的用词表:
 * 每格空值决策用词的选择说话,review 时看词就知道对错,红线 greppable。
 * 封口:要加新词,先回答它的空值语义与已有的哪里不同,写进默认值架构卷宗的表格再加。
 *
 * @author Frank
 * @time 2026-08-21 15:20:30
 */

import type { DbPool, PayloadWithPool } from './types'

/**
 * 库里的脏字符串 → 干净字符串,空值落空串。显示与拼接的兜底,永远无害。
 * 入参收显式联合不收 unknown(2026-08-21 Frank 抓包):行形状(XxxDbRow)落地后
 * 调用方全是类型化的列值,unknown 只剩「把整个对象塞进来」这种错没人拦。
 * 联合带 boolean 是因为库标量整格(ruling 的 Cell)就含它 —— String(true)='true' 无害;
 * 真想显示布尔列先问自己要显示什么词。
 */
export function text(x: string | number | boolean | null): string {
  return x == null ? '' : String(x)
}

/**
 * 计数 → 数字,空值落 0。**只给「个数」类的列用** —— 「一个都没有」本身就是答案,0 无害。
 * 收 `string` 是因为 pg 的 numeric/bigint 按字符串交回来。
 */
export function count(x: number | string | boolean | null): number {
  return x == null ? 0 : Number(x)
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
  return x == null ? '' : String(x)
}

/**
 * 从 payload 形状的对象里摸池。入参必须是真实例(调用方手里若可能没有,先自己判);
 * 回 null 只表示一件事:这个实例不是 postgres adapter、身上没有池 —— 抛不抛人话
 * 由调用方(`server.ts` 的 dbOf)决定,本文件是纯函数不造错。
 */
export function poolOf(payload: PayloadWithPool): DbPool | null {
  if (payload.db == null || payload.db.pool == null) {
    return null
  }
  return payload.db.pool
}
