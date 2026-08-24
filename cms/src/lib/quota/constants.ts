/**
 * 配额域的死值:免费/Pro 各项上限(E3-05,决策 D4 —— 边界细节公测后可调,一律 env 可覆盖,
 * 改分层只动这里,不动逻辑;env 读数进 constants 照 llm/constants 先例)+ 计数键词头与闸文案。
 * gate 一律服务端执行(advisor/jobtext 402、page.tsx 列与匹配范围),前端只做展示引导。
 *
 * ⚠️ 客户端(PricingModal 等)拿到的是**构建期的默认值**;哪天真用 env 改分层数字,
 * 记得 NEXT_PUBLIC 化或改走 props。
 *
 * @author Frank
 * @time 2026-08-22 18:00:00
 */

/**
 * 免费登录用户全站每日池(#124 统一免费额度池,2026-07-21 Frank「统一一个不就完事了,
 * 整这么多用户不会嫌烦吗」):jobtext / advisor / resume 共用一个每日池,用户全站只看一个数。
 * 单价一律 1 次/调用(顾问已切朋友模型 #105,按成本分池的老理由不再成立);
 * 超池 → 402 升级提示;未登录走 IP 限流不进这里。
 */
export const FREE_DAILY_TRIES = Number(process.env.FREE_DAILY_TRIES || 20)

/**
 * advisor 每日试用 = 统一池别名(#124;定价页/弹窗显示处自动一致)。
 */
export const FREE_ADVISOR_TRIES = FREE_DAILY_TRIES

/**
 * jobtext(JD 摘录)每日试用 = 统一池别名(#124)。
 */
export const FREE_JOBTEXT_TRIES = FREE_DAILY_TRIES

/**
 * 匿名(未登录)IP 每日池。🔴 必须低于登录额度 —— 倒挂劝退注册(第 2 轮 #5 教训)。
 */
export const ANON_DAILY_TRIES = Number(process.env.ANON_DAILY_TRIES || 10)

/**
 * Pro 用户 advisor 个人日上限(防滥用,不是卖点限制)。
 */
export const PRO_ADVISOR_DAILY = Number(process.env.PRO_ADVISOR_DAILY || 200)

/**
 * Pro 用户对话个人日上限(2026-08-18 Frank「chat 部分,每个用户给限额」)。
 * 免费与匿名早就有帽(freeGate:登录 FREE_DAILY_TRIES / 匿名 ANON_DAILY_TRIES),
 * **只有 Pro 是敞开的** —— 而 chat 每轮都真调模型(合成 + 可能的兜底解析),
 * 敞着就是敞着一条花钱的路。同 advisor 的口径:防滥用,不是卖点。
 */
export const PRO_CHAT_DAILY = Number(process.env.PRO_CHAT_DAILY || 200)

/**
 * 免费层档案匹配:每日仅列表前 N 岗出匹配(激活钩子,E5-00)。
 */
export const FREE_MATCH_JOBS_PER_DAY = Number(process.env.FREE_MATCH_JOBS_PER_DAY || 10)

/**
 * Pro 保存筛选上限(E5-03;D1 2026-07-19 拍板降免费 —— 留存钩不设 Pro 闸,
 * 闸改在「更多保存位」:免费 2 / Pro 5)。
 */
export const PRO_SAVED_SEARCHES = Number(process.env.PRO_SAVED_SEARCHES || 5)

/**
 * 免费保存筛选上限(同上拍板)。
 */
export const FREE_SAVED_SEARCHES = Number(process.env.FREE_SAVED_SEARCHES || 2)

/**
 * 我的求职收藏上限(E9-01;免费开放,防灌爆)。
 */
export const SAVED_JOBS_CAP = Number(process.env.SAVED_JOBS_CAP || 200)

/**
 * 匹配版提醒:达到该 level 才进邮件(E5-03;high=规则分≥60,见 lib/jobs 匹配引擎)。
 * env 只认这两个值,`as` 是 env 串 → 联合的收窄(llm/constants 同款先例)。
 */
export const ALERT_MATCH_LEVEL = (process.env.ALERT_MATCH_LEVEL || 'high') as 'high' | 'mid'

/**
 * 登录用户免费池的计数键词头(后接用户 id)。
 */
export const KEY_FREE_USER = 'free:u:'

/**
 * 匿名 IP 池的计数键词头(后接 IP)。
 */
export const KEY_FREE_IP = 'free:'

/**
 * 放行时带给前端的剩余次数响应头。
 */
export const HDR_FREE_LEFT = 'X-Free-Left'

/**
 * 反代注入的客户端 IP 头(caddy;首跳=真实客户端)。
 */
export const HDR_FWD = 'x-forwarded-for'

/**
 * 取不到转发头时的 IP 兜底值。
 */
export const IP_LOCAL = 'local'

/**
 * 转发头里多跳 IP 的分隔符。
 */
export const COMMA = ','

/**
 * 拦截判定字面量:免费池用完(402 素材在 denyBodyOf)。
 */
export const DENY_USER = 'user402'

/**
 * 拦截判定字面量:匿名 IP 池超限。
 */
export const DENY_IP = 'ip429'

/**
 * 402 拦截响应的正文(前端据此弹升级卡)。
 */
export const TEXT_UPGRADE = 'upgrade required'

/**
 * 429 拦截响应的正文。
 */
export const TEXT_RATE_LIMITED = 'rate limited'
