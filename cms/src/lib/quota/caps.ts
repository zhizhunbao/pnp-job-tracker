// 分层常量(E3-05,决策 D4):边界细节公测后可调,一律 env/常量化 —— 改分层只动这里,不动逻辑。
// gate 一律服务端执行(advisor/jobtext 402、page.tsx 列与匹配范围),前端只做展示引导。
//
// 2026-08-19 由 `plan.ts` 改名而来:装的是**配额**,和 planRank/planTimeline(路径规划)无关,
// 旧名让「plan 到底是哪个 plan」每次都要点进来看。配额这件事分在三个文件,分工别搞混:
//   · 本文件 quota.ts   —— **数字**(免费/Pro 各项上限,env 可覆盖)。只有常量,不连库不判断。
//   · entitlement.ts    —— **你是谁**(从 payload-token cookie 解出用户、`isPro` 判 Pro 期)。
//   · freeQuota.ts      —— **闸**(`freeGate`:查今日用量 → 放行/402/429;它吃前两个)。
// 三者合并是独立小批次,先看调用方再定;在那之前,加数字只动本文件,加判断别写进来。

// 免费登录用户:advisor 每日试用次数(超 → 402 升级提示;未登录走 IP 限流不进这里)
// #124 统一免费额度池(Frank「统一一个不就完事了」):全站一个每日池,下述旧分池常量=同池别名
// (定价页/弹窗显示处自动一致;端点闸统一走 lib/freeQuota.freeGate)
export const FREE_DAILY_TRIES = Number(process.env.FREE_DAILY_TRIES || 20)
export const FREE_ADVISOR_TRIES = FREE_DAILY_TRIES
// 免费登录用户:jobtext(JD 摘录)每日试用次数
export const FREE_JOBTEXT_TRIES = FREE_DAILY_TRIES
// Pro 用户:advisor 个人日上限(防滥用,不是卖点限制)
export const PRO_ADVISOR_DAILY = Number(process.env.PRO_ADVISOR_DAILY || 200)
// Pro 用户:对话个人日上限(2026-08-18 Frank「chat 部分,每个用户给限额」)。
// 免费与匿名早就有帽(freeGate:登录 FREE_DAILY_TRIES / 匿名 ANON_DAILY_TRIES),**只有 Pro 是敞开的**——
// 而 chat 每轮都真调模型(合成 + 可能的兜底解析),敞着就是敞着一条花钱的路。同 advisor 的口径:防滥用,不是卖点。
export const PRO_CHAT_DAILY = Number(process.env.PRO_CHAT_DAILY || 200)
// 免费层档案匹配:每日仅列表前 N 岗出匹配(激活钩子,E5-00)
export const FREE_MATCH_JOBS_PER_DAY = Number(process.env.FREE_MATCH_JOBS_PER_DAY || 10)

// 保存筛选上限(E5-03;D1 2026-07-19 拍板降免费——留存钩不设 Pro 闸,闸改在「更多保存位」:免费 2 / Pro 5)
export const PRO_SAVED_SEARCHES = Number(process.env.PRO_SAVED_SEARCHES || 5)
export const FREE_SAVED_SEARCHES = Number(process.env.FREE_SAVED_SEARCHES || 2)
// 我的求职收藏上限(E9-01;免费开放,防灌爆)
export const SAVED_JOBS_CAP = Number(process.env.SAVED_JOBS_CAP || 200)
// 匹配版提醒:达到该 level 才进邮件(E5-03;high=规则分≥60,见 lib/jobs/match.ts)
export const ALERT_MATCH_LEVEL = (process.env.ALERT_MATCH_LEVEL || 'high') as 'high' | 'mid'
