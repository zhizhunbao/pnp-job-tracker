/**
 * gate 桶的子桶 cv —— 修改面板末段「生成简历」的行为与它要的常量(父桶 hooks 与两个件经这里取)。
 * 2026-11-12 Frank「最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」:依赖只许父桶 → 子桶。
 * 两个 tsx(GateCvGen / GateCvPreview)仍住父桶(它们拼父桶的整机与样式)。
 *
 * @author Frank
 * @time 2026-11-12 18:00:00
 */

export {
  CV_PV_H, CV_PV_PREF, CV_PV_W, EV_RESUME, LEFT_NONE, MSG_INFO, TPL_CLASSIC, TPL_MODERN,
} from './constants'
export { loadCvLeft, makeCvDocClose, makeCvDownload, makeCvGen, makeCvSet } from './functions'
