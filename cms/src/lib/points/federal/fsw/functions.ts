/**
 * points 域的子桶 federal/fsw 的函数 —— FSW67(Federal Skilled Worker 67 分资格分)估分 estimateFsw67。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

import { MATCHED_NONE, MONTHS_PER_YEAR, SEP } from '../../core'
import type { LabelIn } from '../../core'
import {
  eeAgeRangeOf, eeClbRangeOf, eeEvidenceOf, eeYearsRangeOf, estimateItem, hitItem, needsInfoItem, needsInfoOf,
  pickByRange, pickEduRow, sumPoints,
} from '../functions'
import {
  EDU, EE_FACTOR, EE_KEY, EE_LABEL, EE_NOTE, GRID, ITEM_STATUS, LANG_ABILITIES, PROGRAM_YEARS,
} from '../constants'
import type { EduSpecialOfIn, EduSpecialOfOut, EduYearsOut, EstimateIn, EstimateItemOut, EstimateOut } from '../types'
import {
  EE_COL_SPEAKING, EE_CRIT_PAST_STUDY, EE_CRIT_PAST_WORK, FSW_ADAPT_STUDY_YEARS, FSW_ADAPT_WORK_MONTHS, FSW_EDU_PLUS,
  FSW_EDU_SPECIAL, FSW_EDU_YEARS, MATCHED_MAX,
} from './constants'
import type { AdaptItemIn, AdaptOut, EeGridRow, EstimateItem, FswPickerIn, FswRowsOfIn, FswRowsOfOut } from './types'

// =========================================================================
// 1. FSW67(资格分)
// =========================================================================

/**
 * FSW67 学历档里能读出「几年制」的那几条。
 *
 * 🔴 **排除「… plus a …」双证书组合行** —— 档案没有「第二证书」这一格,不猜那一档。
 *
 * @param criterion 官方原文。
 * @returns 年数;这一条不按年数认则 null。
 */
function fswEduYearsOf(criterion: LabelIn): EduYearsOut {
  if (FSW_EDU_PLUS.test(criterion)) {
    return null
  }
  if (FSW_EDU_YEARS.one.test(criterion)) {
    return PROGRAM_YEARS.one
  }
  if (FSW_EDU_YEARS.two.test(criterion)) {
    return PROGRAM_YEARS.two
  }
  if (FSW_EDU_YEARS.three.test(criterion)) {
    return PROGRAM_YEARS.three
  }
  if (FSW_EDU_YEARS.four.test(criterion)) {
    return PROGRAM_YEARS.four
  }
  return null
}

/**
 * FSW67 学历档里按学位名认的那三档。
 *
 * @param input 学历档。
 * @returns 匹配式;这一档不按学位名认则 null。
 */
function fswEduSpecial(input: EduSpecialOfIn): EduSpecialOfOut {
  if (input.edu === EDU.doctorate) {
    return FSW_EDU_SPECIAL.doctorate
  }
  if (input.edu === EDU.master) {
    return FSW_EDU_SPECIAL.master
  }
  if (input.edu === EDU.highschool) {
    return FSW_EDU_SPECIAL.highschool
  }
  return null
}

/**
 * 档案 → FSW67 估分(联邦技术工人 67/100 资格分)。
 *
 * 🔴 与 CRS 排名分**不可相加**,是两把尺。
 * FSW67 官方表不分有无配偶,`withSpouse` 只是原样回传供上游标注,不参与查表。
 *
 * @param input 档案与官方联邦表全部行。
 * @returns 合计、逐项、有无配偶与判不了的那几项。
 */
export function estimateFsw67(input: EstimateIn): EstimateOut {
  const rows: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.grid === GRID.fsw67) {
      rows.push(r)
    }
  }
  const one: FswPickerIn = { rows: rows, profile: input.profile }

  const breakdown: EstimateItem[] = [
    pickAgeFsw(one),
    pickEduFsw(one),
    pickLang1Fsw(one),
    needsInfoItem({ factor: EE_KEY.clb2, label: EE_LABEL.clb2 }),
    pickExpFsw(one),
  ]
  for (const item of pickAdaptabilityFsw(one)) {
    breakdown.push(item)
  }
  return {
    total: sumPoints({ breakdown: breakdown }), breakdown: breakdown,
    withSpouse: input.profile.married === true,
    needsInfo: needsInfoOf({ breakdown: breakdown }),
  }
}

/**
 * FSW67 年龄分。
 *
 * @param input FSW67 全部行与档案。
 * @returns 那一项。
 */
function pickAgeFsw(input: FswPickerIn): EstimateItemOut {
  const age = input.profile.age
  if (age == null) {
    return needsInfoItem({ factor: EE_KEY.age, label: EE_LABEL.age })
  }
  const cand = fswRowsOf({ rows: input.rows, factor: EE_FACTOR.age })
  const hit = pickByRange({ rows: cand, want: age, rangeOf: eeAgeRangeOf })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.age, label: EE_LABEL.age })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.age, label: EE_LABEL.age, r: hit, points: pts,
    matched: hit.criterion,
  })
}

/**
 * FSW67 学历分。
 *
 * @param input FSW67 全部行与档案。
 * @returns 那一项。
 */
function pickEduFsw(input: FswPickerIn): EstimateItemOut {
  const edu = input.profile.edu
  if (edu == null) {
    return needsInfoItem({ factor: EE_KEY.edu, label: EE_LABEL.edu })
  }
  const cand = fswRowsOf({ rows: input.rows, factor: EE_FACTOR.fswEdu })
  const hit = pickEduRow({
    cand: cand, edu: edu, eduYears: input.profile.eduYears,
    specialOf: fswEduSpecial, yearsOf: fswEduYearsOf, trimCriterion: true,
  })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.edu, label: EE_LABEL.edu })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.edu, label: EE_LABEL.edu, r: hit, points: pts,
    matched: hit.criterion,
  })
}

/**
 * FSW67 首官方语言分:官方四项同档,取「Speaking」那一列 × 四项。
 *
 * @param input FSW67 全部行与档案。
 * @returns 那一项。
 */
function pickLang1Fsw(input: FswPickerIn): EstimateItemOut {
  const clb = input.profile.clb
  if (clb == null) {
    return needsInfoItem({ factor: EE_KEY.clb, label: EE_LABEL.clb })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.factor === EE_FACTOR.fswLang && r.columnLabel === EE_COL_SPEAKING) {
      cand.push(r)
    }
  }
  const hit = pickByRange({ rows: cand, want: clb, rangeOf: eeClbRangeOf })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.clb, label: EE_LABEL.clb })
  }
  let per = 0
  if (hit.points != null) {
    per = hit.points
  }
  let status: EstimateItem['status'] = ITEM_STATUS.zero
  if (per > 0) {
    status = ITEM_STATUS.matched
  }
  return estimateItem({
    factor: EE_KEY.clb, label: EE_LABEL.clb, points: per * LANG_ABILITIES,
    matched: `${hit.criterion}${SEP.timesAbilities}`, evidence: eeEvidenceOf({ r: hit }),
    status: status,
  })
}

/**
 * FSW67 工作经验分:官方**不分境内境外**,合计年数一次查表。
 *
 * 查不到档 = 不足一年,那是**硬结论 0**,不是判不了。
 *
 * @param input FSW67 全部行与档案。
 * @returns 那一项。
 */
function pickExpFsw(input: FswPickerIn): EstimateItemOut {
  const can = input.profile.expCanadaMonths
  const foreign = input.profile.expForeignMonths
  if (can == null || foreign == null) {
    return needsInfoItem({ factor: EE_KEY.exp, label: EE_LABEL.exp })
  }
  const years = Math.floor((can + foreign) / MONTHS_PER_YEAR)
  const cand = fswRowsOf({ rows: input.rows, factor: EE_FACTOR.fswExp })
  const hit = pickByRange({ rows: cand, want: years, rangeOf: eeYearsRangeOf })
  if (hit == null) {
    return estimateItem({
      factor: EE_KEY.exp, label: EE_LABEL.exp, points: 0, matched: EE_NOTE.underOneYear,
      evidence: null, status: ITEM_STATUS.zero,
    })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.exp, label: EE_LABEL.exp, r: hit, points: pts,
    matched: hit.criterion,
  })
}

/**
 * FSW67 适应性:档案只覆盖「加拿大学习」与「加拿大工作」两项。
 *
 * 配偶语言 / 配偶学习 / 预安排就业 / 加拿大亲属**档案里没有对应字段,恒判不了** —— 不猜。
 *
 * @param input FSW67 全部行与档案。
 * @returns 适应性那六项。
 */
function pickAdaptabilityFsw(input: FswPickerIn): AdaptOut {
  const cand = fswRowsOf({ rows: input.rows, factor: EE_FACTOR.fswAdapt })
  let studyRow: EeGridRow | null = null
  let workRow: EeGridRow | null = null
  for (const r of cand) {
    if (studyRow == null && EE_CRIT_PAST_STUDY.test(r.criterion.trim())) {
      studyRow = r
    }
    if (workRow == null && EE_CRIT_PAST_WORK.test(r.criterion.trim())) {
      workRow = r
    }
  }
  return [
    adaptStudyItem({ row: studyRow, profile: input.profile }),
    adaptWorkItem({ row: workRow, profile: input.profile }),
    needsInfoItem({ factor: EE_KEY.adaptSpouseLang, label: EE_LABEL.adaptSpouseLang }),
    needsInfoItem({ factor: EE_KEY.adaptSpouseStudy, label: EE_LABEL.adaptSpouseStudy }),
    needsInfoItem({
      factor: EE_KEY.adaptArrangedEmployment, label: EE_LABEL.adaptArrangedEmployment,
    }),
    needsInfoItem({ factor: EE_KEY.adaptRelatives, label: EE_LABEL.adaptRelatives }),
  ]
}

/**
 * 按官方因素名挑行。
 *
 * @param input FSW67 全部行与官方因素名。
 * @returns 那几行,保持原序。
 */
function fswRowsOf(input: FswRowsOfIn): FswRowsOfOut {
  const out: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.factor === input.factor) {
      out.push(r)
    }
  }
  return out
}

/**
 * 适应性:加拿大学习经历那一项 —— 要满两学年全日制。
 *
 * @param input 官方那一行与档案。
 * @returns 那一项。
 */
function adaptStudyItem(input: AdaptItemIn): EstimateItemOut {
  const key = EE_KEY.adaptStudy
  const label = EE_LABEL.adaptStudy
  const p = input.profile
  const row = input.row
  if (p.canadaStudy == null || p.eduYears == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  if (p.canadaStudy === false || p.eduYears < FSW_ADAPT_STUDY_YEARS || row == null) {
    let matched = MATCHED_NONE
    if (row != null) {
      matched = EE_NOTE.underTwoStudyYears
    }
    return estimateItem({
      factor: key, label: label, points: 0, matched: matched,
      evidence: null, status: ITEM_STATUS.zero,
    })
  }
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  return hitItem({
    factor: key, label: label, r: row, points: pts,
    matched: row.criterion.slice(0, MATCHED_MAX),
  })
}

/**
 * 适应性:加拿大工作经历那一项 —— 要满一年。
 *
 * @param input 官方那一行与档案。
 * @returns 那一项。
 */
function adaptWorkItem(input: AdaptItemIn): EstimateItemOut {
  const key = EE_KEY.adaptWork
  const label = EE_LABEL.adaptWork
  const months = input.profile.expCanadaMonths
  const row = input.row
  if (months == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  if (months < FSW_ADAPT_WORK_MONTHS || row == null) {
    let matched = MATCHED_NONE
    if (row != null) {
      matched = EE_NOTE.underOneWorkYear
    }
    return estimateItem({
      factor: key, label: label, points: 0, matched: matched,
      evidence: null, status: ITEM_STATUS.zero,
    })
  }
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  return hitItem({
    factor: key, label: label, r: row, points: pts,
    matched: row.criterion.slice(0, MATCHED_MAX),
  })
}
