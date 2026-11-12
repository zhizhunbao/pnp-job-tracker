/**
 * points 域的子桶 federal/crs 的函数 —— CRS(Comprehensive Ranking System,快速通道排名分)估分 estimateCrs。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

import { SEP } from '../../core'
import type { LabelIn } from '../../core'
import {
  eeAgeRangeOf, eeClbRangeOf, eeEvidenceOf, eeYearsRangeOf, estimateItem, hitItem, monthsToYears, needsInfoItem,
  needsInfoOf, pickBestTier, pickByRange, pickEduRow, sumPoints,
} from '../functions'
import {
  EDU, EE_FACTOR, EE_KEY, EE_LABEL, EE_NOTE, GRID, ITEM_STATUS, LANG_ABILITIES, PROGRAM_YEARS,
} from '../constants'
import type {
  EduSpecialOfIn, EduSpecialOfOut, EduYearsOut, EstimateIn, EstimateItem, EstimateItemOut, EstimateOut, PickByRangeOut,
} from '../types'
import {
  CRS_COMBO_TIER, CRS_EDU_SPECIAL, CRS_EDU_YEARS, CRS_STUDY_LONG_YEARS, CRS_STUDY_SHORT_YEARS, CRS_SUB_TIER,
  EE_COL_WITHOUT_SPOUSE, EE_COL_WITH_SPOUSE, EE_CRIT_CANADA_STUDY, EE_CRIT_STUDY_LONG, EE_CRIT_STUDY_SHORT,
  EE_HEAD_CANADA_EXP, EE_HEAD_FIRST_LANG, EE_HEAD_FOREIGN_EXP, EE_HEAD_GOOD_LANG, EE_KIND_DETAIL, EE_SECTION,
  SUB_TIER_VALUE,
} from './constants'
import type {
  ComboItemIn, ComboSubTierIn, ComboSubTierOut, ComboTierOfIn, ComboTierOfOut, EduComboIn, EeGridRow, ForeignComboIn,
  PickStudyTierIn, PickerIn, TierRow,
} from './types'

// =========================================================================
// 1. CRS(排名分)
// =========================================================================

/**
 * CRS 学历档里能读出「几年制」的那几条。
 *
 * 只覆盖不带博士 / 硕士 / 高中字样的「N-year program」系列 —— 那三档按学位名认,见 `crsEduSpecial`。
 *
 * @param criterion 官方原文。
 * @returns 年数;这一条不按年数认则 null。
 */
function crsEduYearsOf(criterion: LabelIn): EduYearsOut {
  if (CRS_EDU_YEARS.one.test(criterion)) {
    return PROGRAM_YEARS.one
  }
  if (CRS_EDU_YEARS.two.test(criterion)) {
    return PROGRAM_YEARS.two
  }
  if (CRS_EDU_YEARS.three.test(criterion)) {
    return PROGRAM_YEARS.three
  }
  return null
}

/**
 * CRS 学历档里按学位名认的那三档。
 *
 * @param input 学历档。
 * @returns 匹配式;这一档不按学位名认则 null。
 */
function crsEduSpecial(input: EduSpecialOfIn): EduSpecialOfOut {
  if (input.edu === EDU.doctorate) {
    return CRS_EDU_SPECIAL.doctorate
  }
  if (input.edu === EDU.master) {
    return CRS_EDU_SPECIAL.master
  }
  if (input.edu === EDU.highschool) {
    return CRS_EDU_SPECIAL.highschool
  }
  return null
}

/**
 * 档案 → CRS 估分。
 *
 * 配偶随行走「with a spouse」那张表,单身或配偶不随行走「without a spouse」。
 *
 * @param input 档案与官方联邦表全部行。
 * @returns 合计、逐项、走的哪张表与判不了的那几项。
 */
export function estimateCrs(input: EstimateIn): EstimateOut {
  const p = input.profile
  const withSpouse = p.married === true
  let spouseCol = EE_COL_WITHOUT_SPOUSE
  if (withSpouse) {
    spouseCol = EE_COL_WITH_SPOUSE
  }
  const rows: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.grid === GRID.crs) {
      rows.push(r)
    }
  }
  const one: PickerIn = { rows: rows, profile: p, spouseCol: spouseCol }

  const breakdown: EstimateItem[] = [
    pickAgeCrs(one),
    pickEduCrs(one),
    pickLang1Crs(one),
    needsInfoItem({ factor: EE_KEY.clb2, label: EE_LABEL.clb2 }),
    pickCanadaExpCrs(one),
    pickCanadaStudyBonus(one),
    pickEduComboCrs({
      rows: rows, edu: p.edu, factor: EE_FACTOR.crsComboEduLang, want: p.clb,
      key: EE_KEY.eduLangCombo, label: EE_LABEL.eduLangCombo,
    }),
    pickEduComboCrs({
      rows: rows, edu: p.edu, factor: EE_FACTOR.crsComboEduExp,
      want: monthsToYears(p.expCanadaMonths), key: EE_KEY.eduExpCombo, label: EE_LABEL.eduExpCombo,
    }),
    pickForeignComboCrs({
      rows: rows, headingHas: EE_HEAD_GOOD_LANG, expForeignMonths: p.expForeignMonths,
      want: p.clb, key: EE_KEY.foreignLangCombo, label: EE_LABEL.foreignLangCombo,
    }),
    pickForeignComboCrs({
      rows: rows, headingHas: EE_HEAD_CANADA_EXP, expForeignMonths: p.expForeignMonths,
      want: monthsToYears(p.expCanadaMonths), key: EE_KEY.foreignExpCombo,
      label: EE_LABEL.foreignExpCombo,
    }),
  ]
  return {
    total: sumPoints({ breakdown: breakdown }), breakdown: breakdown, withSpouse: withSpouse,
    needsInfo: needsInfoOf({ breakdown: breakdown }),
  }
}

/**
 * CRS 年龄分。
 *
 * @param input CRS 全部行、档案与有无配偶那一列。
 * @returns 那一项。
 */
function pickAgeCrs(input: PickerIn): EstimateItemOut {
  const age = input.profile.age
  if (age == null) {
    return needsInfoItem({ factor: EE_KEY.age, label: EE_LABEL.age })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.core && r.factor === EE_FACTOR.age && r.kind === EE_KIND_DETAIL
      && input.spouseCol.test(r.columnLabel)) {
      cand.push(r)
    }
  }
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
    matched: `${hit.criterion}${SEP.slash}${hit.columnLabel}`,
  })
}

/**
 * CRS 学历分:博士 / 硕士 / 高中按学位名认,其余按学制年数取「不超过你的最高档」。
 *
 * @param input CRS 全部行、档案与有无配偶那一列。
 * @returns 那一项。
 */
function pickEduCrs(input: PickerIn): EstimateItemOut {
  const edu = input.profile.edu
  if (edu == null) {
    return needsInfoItem({ factor: EE_KEY.edu, label: EE_LABEL.edu })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.core && r.factor === EE_FACTOR.crsEdu && r.kind === EE_KIND_DETAIL
      && input.spouseCol.test(r.columnLabel)) {
      cand.push(r)
    }
  }
  const hit = pickEduRow({
    cand: cand, edu: edu, eduYears: input.profile.eduYears,
    specialOf: crsEduSpecial, yearsOf: crsEduYearsOf, trimCriterion: false,
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
    matched: `${hit.criterion}${SEP.slash}${hit.columnLabel}`,
  })
}

/**
 * CRS 首官方语言分:单项 CLB 命中一行 × 四项(四项同档口径)。
 *
 * 二语没有对应档案字段,恒判不了 —— 那一项在 `estimateCrs` 里单独摆。
 *
 * @param input CRS 全部行、档案与有无配偶那一列。
 * @returns 那一项。
 */
function pickLang1Crs(input: PickerIn): EstimateItemOut {
  const clb = input.profile.clb
  if (clb == null) {
    return needsInfoItem({ factor: EE_KEY.clb, label: EE_LABEL.clb })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.core && r.factor === EE_FACTOR.crsLang && r.kind === EE_KIND_DETAIL
      && EE_HEAD_FIRST_LANG.test(r.heading) && input.spouseCol.test(r.columnLabel)) {
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
    matched: `${hit.criterion}${SEP.timesAbilitiesSlash}${hit.columnLabel}`,
    evidence: eeEvidenceOf({ r: hit }),
    status: status,
  })
}

/**
 * CRS 加拿大工作经验分。
 *
 * @param input CRS 全部行、档案与有无配偶那一列。
 * @returns 那一项。
 */
function pickCanadaExpCrs(input: PickerIn): EstimateItemOut {
  const months = input.profile.expCanadaMonths
  if (months == null) {
    return needsInfoItem({ factor: EE_KEY.expCanada, label: EE_LABEL.expCanada })
  }
  let years = 0
  const yearsOrNull = monthsToYears(months)
  if (yearsOrNull != null) {
    years = yearsOrNull
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.core
      && (r.factor === EE_FACTOR.crsCanadaExp || r.factor === EE_FACTOR.crsCanadaExpOld)
      && r.kind === EE_KIND_DETAIL && input.spouseCol.test(r.columnLabel)) {
      cand.push(r)
    }
  }
  const hit = pickByRange({ rows: cand, want: years, rangeOf: eeYearsRangeOf })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.expCanada, label: EE_LABEL.expCanada })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.expCanada, label: EE_LABEL.expCanada, r: hit, points: pts,
    matched: `${hit.criterion}${SEP.slash}${hit.columnLabel}`,
  })
}

/**
 * CRS 加拿大学习加分(D 节,不分有无配偶)。
 *
 * 一到两年学制一档、三年及以上一档。**没有加拿大学历是硬结论 0**,不是判不了。
 *
 * @param input CRS 全部行、档案与有无配偶那一列(这一项用不上)。
 * @returns 那一项。
 */
function pickCanadaStudyBonus(input: PickerIn): EstimateItemOut {
  const key = EE_KEY.canadaStudyBonus
  const label = EE_LABEL.canadaStudyBonus
  const study = input.profile.canadaStudy
  if (study == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  if (study === false) {
    return estimateItem({
      factor: key, label: label, points: 0, matched: EE_NOTE.noCanadaStudy, evidence: null,
      status: ITEM_STATUS.zero,
    })
  }
  const years = input.profile.eduYears
  if (years == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.extra && r.kind === EE_KIND_DETAIL
      && EE_CRIT_CANADA_STUDY.test(r.criterion)) {
      cand.push(r)
    }
  }
  const hit = pickStudyTier({ cand: cand, years: years })
  if (hit == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({ factor: key, label: label, r: hit, points: pts, matched: hit.criterion })
}

/**
 * 加拿大学习加分挑档:三年及以上一档,一到两年一档,不足一年没有档。
 *
 * @param input 候选行与学制年数。
 * @returns 那一行;没有则 null。
 */
function pickStudyTier(input: PickStudyTierIn): PickByRangeOut {
  if (input.years >= CRS_STUDY_LONG_YEARS) {
    for (const r of input.cand) {
      if (EE_CRIT_STUDY_LONG.test(r.criterion)) {
        return r
      }
    }
    return null
  }
  if (input.years >= CRS_STUDY_SHORT_YEARS) {
    for (const r of input.cand) {
      if (EE_CRIT_STUDY_SHORT.test(r.criterion)) {
        return r
      }
    }
    return null
  }
  return null
}

/**
 * C 节:学历 ×(语言或加拿大经验)组合分。
 *
 * 🔴 缺输入 → 判不了;**输入给了但一档都够不到 → 确定的 0**,两者不能混为一谈。
 *
 * @param input CRS 全部行、学历、官方因素名、比门槛的那个值与键名。
 * @returns 那一项。
 */
function pickEduComboCrs(input: EduComboIn): EstimateItemOut {
  if (input.edu == null) {
    return needsInfoItem({ factor: input.key, label: input.label })
  }
  if (input.want == null) {
    return needsInfoItem({ factor: input.key, label: input.label })
  }
  const tierRe = comboTierOf({ edu: input.edu })
  const scored: TierRow[] = []
  for (const r of input.rows) {
    if (r.section !== EE_SECTION.combo || r.kind !== EE_KIND_DETAIL) {
      continue
    }
    if (r.factor !== input.factor || tierRe.test(r.criterion) === false) {
      continue
    }
    const th = comboSubTier({ columnLabel: r.columnLabel })
    if (th != null) {
      scored.push({ r: r, th: th })
    }
  }
  return comboItem({ scored: scored, want: input.want, key: input.key, label: input.label })
}

/**
 * 该学历在 C 节组合分表里对应哪一档。
 *
 * @param input 学历档。
 * @returns 匹配式。
 */
function comboTierOf(input: ComboTierOfIn): ComboTierOfOut {
  if (input.edu === EDU.doctorate) {
    return CRS_COMBO_TIER.doctorate
  }
  if (input.edu === EDU.master) {
    return CRS_COMBO_TIER.master
  }
  if (input.edu === EDU.highschool) {
    return CRS_COMBO_TIER.highschool
  }
  return CRS_COMBO_TIER.other
}

/**
 * C 节:海外经验 ×(语言或加拿大经验)组合分。
 *
 * @param input CRS 全部行、小节标题片段、海外经验月数、比门槛的那个值与键名。
 * @returns 那一项。
 */
function pickForeignComboCrs(input: ForeignComboIn): EstimateItemOut {
  if (input.expForeignMonths == null) {
    return needsInfoItem({ factor: input.key, label: input.label })
  }
  if (input.want == null) {
    return needsInfoItem({ factor: input.key, label: input.label })
  }
  let years = 0
  const yearsOrNull = monthsToYears(input.expForeignMonths)
  if (yearsOrNull != null) {
    years = yearsOrNull
  }
  const scored: TierRow[] = []
  for (const r of input.rows) {
    if (r.section !== EE_SECTION.combo || r.kind !== EE_KIND_DETAIL) {
      continue
    }
    const head = r.heading.toLowerCase()
    if (head.includes(EE_HEAD_FOREIGN_EXP) === false || head.includes(input.headingHas) === false) {
      continue
    }
    const rg = eeYearsRangeOf(r.criterion)
    if (rg == null || years < rg.from || years > rg.to) {
      continue
    }
    const th = comboSubTier({ columnLabel: r.columnLabel })
    if (th != null) {
      scored.push({ r: r, th: th })
    }
  }
  return comboItem({ scored: scored, want: input.want, key: input.key, label: input.label })
}

/**
 * C 节(技能可转移性)的子档门槛 —— 列名里带 CLB9 / CLB7 / 2 years or more / 1 year。
 *
 * @param input 列名原文。
 * @returns 门槛;读不出则 null。
 */
function comboSubTier(input: ComboSubTierIn): ComboSubTierOut {
  const s = input.columnLabel
  if (CRS_SUB_TIER.clb9.test(s)) {
    return SUB_TIER_VALUE.clb9
  }
  if (CRS_SUB_TIER.clb7.test(s)) {
    return SUB_TIER_VALUE.clb7
  }
  if (CRS_SUB_TIER.years2.test(s)) {
    return SUB_TIER_VALUE.years2
  }
  if (CRS_SUB_TIER.year1.test(s)) {
    return SUB_TIER_VALUE.year1
  }
  return null
}

/**
 * 组合分定档:门槛不超过他的值里最高的那一档。
 *
 * 🔴 **一档都够不到是确定的 0,不是判不了** —— 缺输入才是判不了,那一步在调用方就挡掉了。
 * 两个组合分(学历×、海外经验×)挑候选行的方式不同,但**定档与出行的方式一模一样**,
 * 所以收在这儿(2026-08-20:dupcheck 报出这 8 行逐字重复才抽的,不是先设计出来的)。
 *
 * @param input 带门槛的候选行、他的值与键名。
 * @returns 那一项。
 */
function comboItem(input: ComboItemIn): EstimateItemOut {
  const hit = pickBestTier({ scored: input.scored, want: input.want })
  if (hit == null) {
    return estimateItem({
      factor: input.key, label: input.label, points: 0, matched: EE_NOTE.belowTier,
      evidence: null, status: ITEM_STATUS.zero,
    })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: input.key, label: input.label, r: hit, points: pts,
    matched: `${hit.criterion}${SEP.slash}${hit.columnLabel}`,
  })
}
