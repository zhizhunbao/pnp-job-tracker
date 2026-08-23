/**
 * 职位域的桶 —— **客户端也安全的那半**:匹配引擎、来源标签、全部形状。
 * `Table.tsx` / `Pnp.tsx` / `OnboardingWizard.tsx` 是 `'use client'` 且取的是**值**(match / source),
 * 混进服务端依赖会把连接池整条链拉进浏览器包(tsc 全绿,build 才炸 —— 2026-08-18 实撞,dev 白屏)。
 * functions.ts 不 import payload(池由调用方注进来),所以这里可以放心转发它的纯函数。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

export { NO_LIST_PROVINCES } from './constants'
export { nocLabels } from './constants'
export { drawStreamNote, dropProvPrefix, eeDisplay, eeKeyDisplay, reqStreamDisplay, streamDisplay } from './functions'
export {
  blockedSrc, hasProfile, isDirect, match, matchRank, normalizeProfile, provListCoverage, reasonEn,
  sourceLabel, statusEn,
} from './functions'
export type {
  BroadNoc, CityCard, CoGradeDetail, ColKey, DesigEmp, Dims, EeCat, EeOcc, FieldGroup, FieldSource, JobRow, JsonCell, JsonObj, MatchDims, MatchJob, NocOpenCount, ProvCard, QuizFacts, TopNoc,
  OccCompetitionRow,
  ProfileJson,
  MatchProfile, MatchReason, MatchResult, NewsSlim, NocDesc, Plan, PnpDraw, PnpOcc, PnpStream, ProvInfo, ProvListCoverage,
} from './types'
