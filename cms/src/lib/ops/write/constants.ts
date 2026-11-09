/**
 * ops 子桶 write 的常量:调度单元上报与运维页删除的口径,由 lib/queue 搬来(2026-11-05 Frank「我能看到所有在排队的任务」「其他账号看不到」)。
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

/**
 * 删除的三种对象:待发投递 / 官网队列 / 译名队列。
 */
export const DEL_KINDS = ['apply', 'site', 'alias'] as const

/**
 * 删除对象:待发投递。
 */
export const DEL_APPLY = 'apply'

/**
 * 删除对象:官网队列。
 */
export const DEL_SITE = 'site'

/**
 * 删除键最长几个字(单元名 / 投递 id / 池主键;超长当坏体)。
 */
export const DEL_KEY_LEN_MAX = 300

/**
 * 报错正文最长几个字(调度器那头已截到 3000,这里兜底再截一次)。
 */
export const ROUND_ERROR_MAX = 4000
