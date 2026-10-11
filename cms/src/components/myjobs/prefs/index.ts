/**
 * myjobs 子桶 prefs 的门(父桶 hooks / push 卡经这里取)(2026-10-10 批 2「新岗推送」卡:拉 / 存「把推荐和收藏动态发到邮箱」的频率与收件邮箱)。
 * 父桶 functions.ts 逼近 1000 行闸,按关注点切出这一族(照 apply/letter 子桶首例);依赖只许父桶 → 子桶(经本目录 index.ts),
 * 子桶不取父桶任何东西,要用的常量各自抄、形状本桶自声明。卡本身(push.tsx)仍住父桶(拼父桶的分区卡与样式)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */

export { makeFreqLabel, makeLoadPush, makeSavePush } from './functions'
