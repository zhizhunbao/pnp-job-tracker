/**
 * myjobs 子桶 thread 的门(父桶 hooks / 只读投递框经这里取;收件箱桶经父桶门取开框函数)(2026-10-10 批 3「点已投行『打开』」)。
 * 父桶 functions.ts 逼近 1000 行闸,按关注点切出这一族(照 apply/letter、myjobs/prefs 子桶);依赖只许父桶 → 子桶(经本目录 index.ts),
 * 子桶不取父桶任何东西。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

export { bindAppHost, closeAppView, makeLoadThread, openAppView } from './functions'
export type { ThreadMsg, ThreadReply, ThreadView } from './types'
