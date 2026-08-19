// 配额域的桶 —— **客户端也安全的那半**:只有数字。
//
// 这个域装的是「一次调用要不要放行」这一件事的四个零件,名字并排读就是分工:
//    · caps.ts        **数字**   —— 免费/Pro 各项上限,一律 env 可覆盖。只有常量,不连库不判断
//    · entitlement.ts **你是谁** —— 从 payload-token cookie 解出用户、`isPro` 判 Pro 期
//    · rateLimit.ts   **数得清** —— IP/用户维度的今日用量
//    · freeQuota.ts   **闸**     —— `freeGate` 把上面三个串起来:放行 / 402 / 429
//
// 2026-08-19:`caps.ts` 就是当天从 `lib/plan.ts` 改名来的那个文件(旧名和路径规划的 plan 撞车)。
// 进了 `quota/` 之后它不该再叫 quota —— 域名已经说了「配额」,文件名要说的是**在这个域里它是哪一件**。
//
// 🔴 **判断与取数那半在 `./server`**(entitlement 连库、freeQuota/rateLimit 要请求上下文)。
//    `PricingModal.tsx` 是 `'use client'` 且取的是**值**(FREE_ADVISOR_TRIES 等),
//    混一个桶就会把连接池整条链拉进浏览器包 —— tsc 全绿,build 才炸(lib/jobs 08-18 实撞)。
//    ⚠️ 客户端拿到的是**构建期的默认值**;哪天真用 env 改分层数字,记得 NEXT_PUBLIC 化或改走 props。

export {
  ALERT_MATCH_LEVEL, FREE_ADVISOR_TRIES, FREE_DAILY_TRIES, FREE_JOBTEXT_TRIES,
  FREE_MATCH_JOBS_PER_DAY, FREE_SAVED_SEARCHES, PRO_ADVISOR_DAILY, PRO_CHAT_DAILY,
  PRO_SAVED_SEARCHES, SAVED_JOBS_CAP,
} from './caps'
