/**
 * 分值域的桶 —— **浏览器也能跑的那半**:算分器全是纯函数,不碰库。
 *
 * 门里只有转发,一个函数都没有。要连库的那半(官方分值表与抽选记录的取数与缓存)在 `./server`。
 *
 * @author Frank
 * @time 2026-08-20 22:15:00
 */

export {
  EDU_KEYS, bonusPoints, defaultProfile, gridStreamOf, isAboveLine, isBelowLine, lineStateOf, marginOf, scoreProvince,
  streamMatches, systemShort,
} from './core'
export type {
  EduKey, LineState, ProvinceScore, ScoreFactor, ScoreOverride, ScorePart, ScoreSource, ScoreVsLine, SelfProfile,
} from './core'
export { estimateCrs, estimateFsw67 } from './federal'
export type { CrsProfile, EeGridRow, EstimateItem, EstimateResult } from './federal'
export { estimateMbEoi } from './provinces'
export type { MbEduKey, MbEoiScore, MbProfile } from './provinces'
export type { DrawRow, OverviewDraw, ProvCompetition } from './tables'
