/**
 * 分值域的**服务端**门 —— 决策页官方表包的取数(要连库,浏览器不该拿到)。
 * 门里只有转发(闸 door-forward-only);连接池由调用方注进来(拍板③:路由/页面自己
 * `getDb()` 再传,本域不 import payload)。
 *
 * 🔴 为什么与 `index.ts` 分开(照 lib/jobs 08-18 实撞的教训):`PnpScoreCard.tsx` /
 * `ScoreLineCard.tsx` 是 `'use client'` 组件、只要算分那半;两半混一个桶,
 * 打包器会把服务端链路拉进**浏览器**包(tsc 全绿、build 才炸)。
 *
 * @author Frank
 * @time 2026-08-22 12:10:00
 */

export { getScoreTables } from './functions'
