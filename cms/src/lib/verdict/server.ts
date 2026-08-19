// 判定域的**服务端**入口 —— 三合一接线、判定底表缓存、报告事实、案例事实档;它们要连库,只能在服务端跑。
//
// 🔴 为什么必须和 `index.ts` 分开(照 lib/jobs 08-18 实撞的教训):
//    这四支的依赖链上挂着 `payload` 与 `@/payload.config`(连接池、集合配置),
//    而 `Cases.tsx` / `Case.tsx` 是 `'use client'` 组件、只要判定核与案例清单。
//    一旦它们从同一个桶取,打包器会把整条链拉进**浏览器**包 ——
//    `Can't resolve 'fs/promises' / 'net' / 'tls'` 一屏,页面渲不出来(tsc 全绿,build 才炸)。
//    服务端要另一半时照旧从 `@/lib/verdict` 取,两边不重复导出。

export { buildTripleWire } from './tripleWire'
export type { ClientAnswers, TripleWire } from './tripleWire'
export { getVerdictData } from './verdictCache'
// 🔴 reportFacts **不在这个桶里,现在住 `lib/chat/reportFacts.ts`**(2026-08-19 实撞后定案):
//    它唯一的消费者是 `lib/chat/tools.ts`,而本桶里的 `verdictCache` 反过来要 chat 的
//    `loadVerdictData`(值,不是类型)—— 两者同桶就把「chat → verdict → chat」焊成一个运行时环,
//    表现是 `chat/normalize.ts` 初始化时 `PNP_PROVINCES is not iterable`(同 lib/chat/types.ts 记的那次)。
//    搬到消费者身边则一条新边都不加。**这条教训通用:桶的边界要看运行时值依赖的方向,不只看域归属。**
export { CASE_PAGES, caseAnswer } from './caseFacts'
export type { CaseAnswer, OpsFacts } from './caseFacts'
