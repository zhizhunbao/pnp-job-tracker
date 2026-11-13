/**
 * gate 桶的子桶 work —— 档案表单「做过的工作」几段的行为与它要的常量(父桶 hooks / functions / 工作经历一段的件经这里取)。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填」:依赖只许父桶 → 子桶,子桶不取父桶任何东西。
 * 工作经历题的两个 tsx(GateWork / GateWorkLine)仍住父桶(它们拼父桶的整机与样式)。
 *
 * @author Frank
 * @time 2026-11-12 16:00:00
 */

export {
  WORK_AT_NONE, WORK_F_CITY, WORK_F_DESC, WORK_F_FROM, WORK_F_ORG, WORK_F_TITLE, WORK_F_TO, WORK_DESC_LEN,
  WORK_LINE_LEN, WORK_ROWS_MAX, WORK_YM_LEN,
} from './constants'
export {
  makeWorkAdd, makeWorkCell, makeWorkOcc, makeWorkOccClose, makeWorkOccOpenOf, makeWorkRemove, workFilledOf,
  workFormRowsOf,
  workLinesOf, workListOf, workMarkedOf, workNamesOf, workNocsOf, workRowsFromCodes,
} from './functions'
