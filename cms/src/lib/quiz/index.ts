/**
 * 答题域的桶(浏览器安全的那半)。门里只有转发(闸 door-forward-only)。
 *
 * 2026-08-23 Frank「还是需要按规范命名」:题/答/判三文件收进十件套 ——
 * 题面表+换算住 rows(值级清洗的家)、梯子/清单/键住 constants、形状住 types、
 * 可变状态收进 variables 的 CACHE、门面与同步住 functions。
 *
 * 边界:
 *   - `profile` 域不在这个簇里(2026-08-18 Frank 点名):它是账号档案,不是答题。
 *   - 给人看的题面文案仍归 `lib/i18n/`;这里的 `L` 只是题面的三语**形状**,不是文案本身。
 *
 * @author Frank
 * @time 2026-08-18 04:36:46
 */

export type { Answers, L, ScoreAnswers, Stage } from './types'
export { ANSWERS_KEY, CLB, DECISIONS, EMPTY, KNOWN_NO_FREE_LEAD, NCLC } from './constants'
export { getFields, toEngineAnswers } from './functions'
export {
  answeredBasics, batchLeadsFree, clearAnswers, fieldsOf, missingFields, pullAndMerge,
  readAnswers, readScoreAnswers, resetAnswersMemory, writeAnswers, writeScoreAnswers,
} from './functions'
