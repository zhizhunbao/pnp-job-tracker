/**
 * 队列域(lib/queue)的常量:调度单元上报的口径(2026-11-05 Frank「我能看到所有在排队的任务」「其他账号看不到」)。
 *
 * @author Frank
 * @time 2026-11-05 23:10:00
 */

/**
 * 调度单元的三种状态(与 etl/sched 的 STATE_ 三词同值):正在跑 / 等下一轮 / 等 LLM 盒子。
 */
export const UNIT_STATES = ['run', 'wait', 'llm'] as const

/**
 * 单元名最长几个字(域名 / 役名都是短词;超长当坏体)。
 */
export const NAME_LEN_MAX = 64

/**
 * 单元名只许小写字母、数字、下划线(与 etl 域 META 的 name 同形)。
 */
export const NAME_RE = /^[a-z0-9_]+$/
