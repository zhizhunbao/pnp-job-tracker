/**
 * 量尺域的桶 —— 纯函数、无 IO、前后端同构,所以**只有这一个门**(没有 `server`)。
 *
 * 门里只有转发,一个函数都没有。
 *
 * @author Frank
 * @time 2026-08-20 21:45:00
 */

export {
  areaOfPlace, employerBar, evaluateRequirements, teerHit,
} from './functions'

export type {
  AreaTier, Evidence, EmployerBar, ReqSubject, Requirement, RuleProfile, RuleResult, RuleVerdict,
} from './types'
