// 对话模块的桶 —— **对外只有这些**。
//
// 为什么单独存在:这一簇 4700 行 15 个文件,而生产侧真正要的是一小撮接口:
// `/api/chat` 的编排入口、`lib/i18n/chat` 反向取的 5 个类型、三个判定层要的证据类型。
// 桶写的这份就是「对外是什么」;绕过它直接点文件,这份声明当场作废,
// 而编译器不会有任何意见 —— 所以另有 eslint 的边界闸守着。
//
// 🔴 **测试不走这里。** 判定层的测试要测的就是模块内部的判定件(穷举输入断言性质),
//    它们直接点文件(`@/lib/chat/guards`),边界闸对 `tests/**` 开了口子。
//    反过来做 —— 为了让测试能 import 而把 60 多个内部件挂上桶 —— 桶就废了。


// ── 编排入口:/api/chat 的全部所需 ──────────────────────────────────────────
export { chatProfileContext } from './answer'
export { profileFill } from './followups'
export { logChat, threadId } from './log'
export { ChatError, orchestrate } from './orchestrate'
export type { ChatStep } from './steps'
export type { ChatResult, ChatTurn } from './types'

// ── 反向取:lib/i18n/chat 的三语字典按这几个键分叉(全 type-only,运行时无环)──
export type { FollowKey } from './followups'
export type { MetaTopic, OccOption, ProfileSlot, UsageTopic } from './slots'

// ── 证据契约:pathVerdict / planTimeline / tripleVerdict / verdictCache 要的 ──
export { loadVerdictData } from './tools'
export type { Availability, DrawsResult, Evidence, OpsResult, PlanResult, ProvThresholds, ThresholdRow, ThresholdsResult } from './tools'
