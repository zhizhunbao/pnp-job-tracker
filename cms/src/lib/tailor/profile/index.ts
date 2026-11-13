/**
 * tailor 域的子桶 profile —— 用档案生成基础简历的纯函数、提示词与参数(父桶 routes.ts 的 tailorProfileRoute 经这里取)。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」。
 * 依赖只许父桶 → 子桶,子桶不取父桶任何东西。
 *
 * @author Frank
 * @time 2026-11-12 17:00:00
 */

export {
  E_NEED, PROFILE_FEATURE, PROFILE_FILE_TAIL, PROFILE_TOKENS_MAX, PROFILE_USER_DAILY, PROFILE_USER_PREFIX, TPL_MODERN,
} from './constants'
export {
  isProfileReady, latinOf, profileDraftOf, profileFactsOf, profileRefOf, profileSchemaOf, profileUserOf, toProfileOut,
} from './functions'
export { PROFILE_SYSTEM } from './prompts'
