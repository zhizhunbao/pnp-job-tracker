// 题库域的**服务端**入口 —— 热门职业清单缓存,要连库,只能在服务端跑。
//
// 🔴 为什么和 `index.ts` 分开:`quizTop` 的依赖链上挂着 `../jobs/server`(连接池、集合配置),
//    而题库的字段/答案/判定那三支是纯数据,`'use client'` 组件也在用。
//    混一个桶就会把连接池整条链拉进浏览器包(tsc 全绿,build 才炸,lib/jobs 08-18 实撞)。
//
// `quizTop` 2026-08-19 从 lib/ 顶层收编进来:它本来就是 quiz route 的缓存,放错了层。

export { getTopNocsCached } from './quizTop'
