// 分层常量(E3-05,决策 D4):边界细节公测后可调,一律 env/常量化 —— 改分层只动这里,不动逻辑。
// gate 一律服务端执行(advisor/jobtext 402、page.tsx 列与匹配范围),前端只做展示引导。

// 免费登录用户:advisor 每日试用次数(超 → 402 升级提示;未登录走 IP 限流不进这里)
export const FREE_ADVISOR_TRIES = Number(process.env.FREE_ADVISOR_TRIES || 8)
// 免费登录用户:jobtext(JD 摘录)每日试用次数
export const FREE_JOBTEXT_TRIES = Number(process.env.FREE_JOBTEXT_TRIES || 20)
// Pro 用户:advisor 个人日上限(防滥用,不是卖点限制)
export const PRO_ADVISOR_DAILY = Number(process.env.PRO_ADVISOR_DAILY || 200)
// 免费层档案匹配:每日仅列表前 N 岗出匹配(激活钩子,E5-00)
export const FREE_MATCH_JOBS_PER_DAY = Number(process.env.FREE_MATCH_JOBS_PER_DAY || 10)

// Pro 专属列(服务端 SELECT 源头裁掉,数据不到浏览器;前端在这些列位显示锁标+升级引导)
// match=与我的匹配(E5-00 头牌);vs 中位三件套=移民价值对比维度
export const PRO_COLUMNS = ['match', 'vsMedian', 'wageMedHr', 'wageMedYr'] as const
export type ProColumn = (typeof PRO_COLUMNS)[number]
export const isProColumn = (k: string): boolean => (PRO_COLUMNS as readonly string[]).includes(k)

// 简历解析次数/日(E11-07;解析免费=转化杠杆,限次防滥用——付费仍在匹配列,不在这)
export const FREE_RESUME_TRIES = Number(process.env.FREE_RESUME_TRIES || 5)

// E12-08 评分拆解弹框次数/日(Frank「都是先试用再付费」:档位数字全免费,拆解明细试用额度制)
export const FREE_SCOREDETAIL_TRIES = Number(process.env.FREE_SCOREDETAIL_TRIES || 5)
// 保存筛选上限(E5-03;D1 2026-07-19 拍板降免费——留存钩不设 Pro 闸,闸改在「更多保存位」:免费 2 / Pro 5)
export const PRO_SAVED_SEARCHES = Number(process.env.PRO_SAVED_SEARCHES || 5)
export const FREE_SAVED_SEARCHES = Number(process.env.FREE_SAVED_SEARCHES || 2)
// 我的求职收藏上限(E9-01;免费开放,防灌爆)
export const SAVED_JOBS_CAP = Number(process.env.SAVED_JOBS_CAP || 200)
// 匹配版提醒:达到该 level 才进邮件(E5-03;high=规则分≥60,见 lib/match.ts)
export const ALERT_MATCH_LEVEL = (process.env.ALERT_MATCH_LEVEL || 'high') as 'high' | 'mid'
