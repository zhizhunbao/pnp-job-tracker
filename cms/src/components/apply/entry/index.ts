/**
 * apply 桶的子桶 entry —— 投递框开在哪一屏(2026-11-09 Frank 定的投递动线:先查基础简历和额度再决定开什么)。
 * 父桶 functions.ts 贴着 1000 行,新关注点照 letter 的形开子桶;依赖只许父桶 → 子桶。
 *
 * @author Frank
 * @time 2026-11-09 23:30:00
 */

export { MODE_BASE, MODE_CHOOSE, MODE_TAILOR } from './constants'
export {
  baseLetterOf, baseStepOf, isMemberOf, isOutOf, leftAfterOf, makeMode, outReasonOf, startModeOf,
} from './functions'
