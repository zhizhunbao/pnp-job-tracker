// 配额域的**服务端**入口 —— 认人、数用量、下闸。三支都要请求上下文,`entitlement` 还要连库。
//
// 🔴 为什么和 `index.ts` 分开:`entitlement` 的依赖链上挂着 `payload` 与 `@/payload.config`,
//    而 `PricingModal.tsx` 是 `'use client'`、只要几个数字。混一个桶就把连接池打进浏览器包
//    (tsc 全绿,build 才炸,lib/jobs 08-18 实撞)。服务端要数字时照旧从 `@/lib/quota` 取。
//
// 🔴 端点闸统一走 `freeGate`,别在路由里自己拼 isPro + checkLimit —— 那是三处各写一遍的老路。

export { getUser, isPro } from './entitlement'
export { freeGate } from './freeQuota'
export { checkLimit, ipOf, usedToday } from './rateLimit'
