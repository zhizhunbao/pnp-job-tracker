// 估分域的**服务端**入口 —— 抽选线表与职业竞争度,它们要连库,只能在服务端跑。
//
// 🔴 为什么必须和 `index.ts` 分开(照 lib/jobs 08-18 实撞的教训):
//    `scoreTables` / `occCompetition` 的依赖链上挂着 `payload` 与 `@/payload.config`(连接池、集合配置),
//    而 `PnpScoreCard.tsx` / `ScoreLineCard.tsx` 是 `'use client'` 组件、只要算分那半。
//    一旦它们从同一个桶取,打包器会把整条链拉进**浏览器**包 ——
//    `Can't resolve 'fs/promises' / 'net' / 'tls'` 一屏,页面渲不出来(tsc 全绿,build 才炸)。
//    服务端要另一半时照旧从 `@/lib/score` 取,两边不重复导出。

export { getScoreTables } from './scoreTables'
export type { ProvCompetition } from './scoreTables'
export { fetchOccCompetition } from './occCompetition'
