/**
 * 分值域的桶 —— **浏览器也能跑的那半**:算分器全是纯函数,不碰库。
 *
 * 门里只有转发,一个函数都没有。要连库的那半(官方分值表与抽选记录的取数与缓存)在 `./server`。
 *
 * @author Frank
 * @time 2026-08-20 22:15:00
 */

export {
  EDU_KEYS,
} from './constants'

export {
  bonusPoints, defaultProfile, estimateCrs, estimateFsw67, estimateMbEoi, gridStreamOf, isAboveLine,
  isBelowLine, lineStateOf, marginOf, scoreProvince, streamMatches, systemShort,
} from './functions'

export type {
  CrsProfile, DrawRow, EduKey, EeGridRow, EstimateItem, EstimateResult, LineState,
  MbEduKey, MbEoiScore, MbProfile, ProvinceScore, ScoreVsLine,
  ScoreFactor, ScoreOverride, ScorePart, ScoreSource, SelfProfile,
} from './types'
