/**
 * ops 域的桶 —— 管理员运维页的数据(2026-11-08 Frank「把管理员队列页重构成运维页」):页面清单、按页取数、线格式。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
export {
  ROLE_ADMIN, SECS, SEC_ALIAS, SEC_APPLY, SEC_BUDGET, SEC_CHANNELS, SEC_COST, SEC_DEFAULT, SEC_EVALS, SEC_FRESH, SEC_INCIDENTS, SEC_KEYS, SEC_NAME,
  SEC_REPORT, SEC_ROUTES, SEC_RULES, SEC_SCHEDULE, SEC_SITES, SEC_USAGE,
} from './constants'
export { loadOpsBoard } from './functions'
