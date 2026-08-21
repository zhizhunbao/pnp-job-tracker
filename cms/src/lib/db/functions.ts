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

import type { DbPool } from './types'

/**
 * 库里的脏字符串 → 干净字符串,空值落空串。显示与拼接的兜底,永远无害。
 */
export function text(x: unknown): string {
  return x == null ? '' : String(x)
}

/**
 * 计数 → 数字,空值落 0。**只给「个数」类的列用** —— 「一个都没有」本身就是答案,0 无害。
 */
export function count(x: unknown): number {
  return x == null ? 0 : Number(x)
}

/**
 * 🔴 官方可空的数值 → 保 null。隐私抑制值(「Less than 10」)、没公布的分数线、
 * `rule` 行的阈值 —— 折成 0 就是替官方编数。这类列上看见 `count()` 就是 bug。
 */
export function numOrNull(x: unknown): number | null {
  return x == null ? null : Number(x)
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
 * 从 payload 形状的对象里摸池;摸不到回 null,抛不抛由调用方(`server.ts` 的 dbOf)决定。
 */
export function poolOf(payload: unknown): DbPool | null {
  const db = (payload as { db?: { pool?: DbPool } } | null)?.db
  return db?.pool ?? null
}
