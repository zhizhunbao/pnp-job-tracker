/**
 * gate 桶的子桶 school —— 教育经历那一段「搜学校」的行为与它要的常量(父桶 hooks 与教育经历一段的件经这里取)。
 * 2026-11-12:依赖只许父桶 → 子桶,子桶不取父桶任何东西。
 *
 * @author Frank
 * @time 2026-11-12 19:30:00
 */

export { SCHOOL_AT_NONE } from './constants'
export { makeSchoolPickOf, makeSchoolSearch, makeSchoolTypeOf, schoolQOf, schoolSubOf } from './functions'
