/**
 * points 域的子桶 core 的桶门 —— 各打分机制共用的部分:通道名匹配、从官方标签里读数字、挑档、通用省算分(scoreProvince)、估分对抽选线。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 * 门里只有转发。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

export { EDU_KEYS, KIND, MATCHED_NONE, MONTHS_PER_YEAR, SEP, TICK_SEP } from './constants'
export {
  bonusPoints, defaultProfile, gridStreamOf, isAboveLine, isBelowLine, lineStateOf, marginOf, oneGroupOf, rangeGroupOf,
  scoreProvince, streamMatches, systemShort,
} from './functions'
export type {
  EduKey, LabelIn, LineState, MatchIn, ProvinceScore, RowsOfOut, ScoreFactor, ScoreOverride, ScorePart, ScoreSource,
  ScoreVsLine, SelfProfile,
} from './types'
