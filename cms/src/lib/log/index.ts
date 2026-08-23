/**
 * 留痕域的桶(2026-08-23 自 lib/log.ts 升目录,按十件套分抽屉;`../log` 与 `@/lib/log`
 * 的既有 import 经本桶原样续命)。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-19 07:41:03
 */

export type { LogIn, LogOut } from './types'
export {
  AGENT_FN, AGENT_LOG, CHAT_FN, CHAT_LOG, DB_LOG, EMP_LOG, GATE_LOG, JOBS_LOG, LLM_FN, LLM_LOG,
  LOG_MSG_MAX, MAILER_LOG, PROFILE_LOG, RESUME_LOG, RULING_LOG,
} from './constants'
export { log } from './functions'
