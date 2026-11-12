/**
 * 我的岗位域子桶 recommend 的函数:今日推荐的推荐指数 —— 读档案与门槛行,判硬性条件,打分、分档、排序。
 * 2026-11-11 任务书第 41 到 46 条立(目标是第一优先级):拿 PR 先过硬性条件再排,找工作只按匹配、薪资、地点排。
 * 父桶 functions 过 1000 行闸,这一族切成子桶;父桶 → 子桶单向,连接由调用方注入。
 *
 * @author Frank
 * @time 2026-11-11 23:00:00
 */
import { count, firstOf, numOrNull, queryRows, SQL, text } from '../../db'
import { eduRowsOf, keepStreamOf } from '../../pathways'
import {
  BAND_NONE, BASIS_UNSURE_RE, CHECK_LANG_KEYS, CHECK_WORK_KEYS, CLB_BAND_OFFSET, CLB_BAND_UNTESTED, CLB_NONE,
  EMP_LMIA, EXP_BAND_MONTHS, LINE_RESUME, MATCH_FULL_RATIO, NOTE_HIT, RESUME_LEX_MIN, FACTOR_LANG, GOAL_JOB, GOAL_PR, GOAL_PR_BAND, LEVEL_HIGH, LEVEL_HIGH_MIN, LEVEL_LOW,
  LEVEL_MID, LEVEL_MID_MIN, LINE_DRAW, LINE_EDU, LINE_EMP, LINE_LANG, LINE_OCC, LINE_PAY, LINE_PLACE, LINE_TERM,
  LINE_WHO, LINE_WORK, LIST_SEP, MONTHS_PER_YEAR, NEED_CLB, NEED_EXP, NEED_WHO, NOTE_BLANK, NOTE_CITY,
  NOTE_DESIGNATED, NOTE_DOWN, NOTE_FREE, NOTE_LMIA, NOTE_NONE, NOTE_OTHER, NOTE_PASS, NOTE_PROV, NOTE_SAME,
  NOTE_SELF, NOTE_SIMILAR, NOTE_TEXT, NOTE_UP, NOTE_WANT, OCC_SIMILAR, PAY_BASE, PAY_SLOPE, PLACE_PROV, SCORE_MAX,
  SCORE_MIN, TAG_CHECK, TAG_FAIL, TAG_NONE, TAG_PASS, TEXT_NONE, UNIT_YEARS, WEIGHTS_JOB, WEIGHTS_PR,
} from './constants'
import type {
  DbIn, EduLineIn, FitIn, MatchDbRow, MatchFact, MatchOfIn, MatchesIn, MatchesOut, MaybeMatch, FitLine, FitLines, HardIn, InsertIn, MaybeFitLine, MaybeFitLines, MaybeNum, MaybePickFit,
  MaybeWay, Needs, Part, PathwayFitDbRow, PathwayFitFact, PathwayFitsOut, PickProfile, PickProfileDbRow,
  PickProfileOut, PlaceIn, ProfileIn, RankIn, RankOut, RankRow, Ranked, RankedList, ReqDbRow, ReqFact, ReqFacts, ReqHitIn,
  ReqLineIn, ReqsOut, SoftIn, SoftOut, Strs, WayIn, WayReqsIn, Weights,
} from './types'

// =========================================================================
// 推荐指数:硬性条件、打分、分档、排序(2026-11-11 任务书第 41 到 46 条)
// =========================================================================

/**
 * 今日推荐要的本人档案几格。
 *
 * @param x 连接与用户 id。
 * @returns 档案;没这个人按全没答。
 */
export async function loadPickProfile(x: ProfileIn): PickProfileOut {
  const got = firstOf(await queryRows({ db: x.db, sql: SQL.MYJOBS_PICK_PROFILE, params: [x.userId], map: toPickProfile }))
  if (got == null) {
    return {
      who: TEXT_NONE, edu: [], goal: BAND_NONE, clb: BAND_NONE, totalExp: BAND_NONE, prov: TEXT_NONE, city: TEXT_NONE,
      hasOcc: false,
    }
  }
  return got
}

/**
 * 判硬性条件要的门槛行(申请人侧的语言与工作经验)。
 *
 * @param x 连接。
 * @returns 门槛行。
 */
export async function loadReqs(x: DbIn): ReqsOut {
  return queryRows({ db: x.db, sql: SQL.MYJOBS_REQS, params: [], map: toReq })
}

/**
 * 目标档 → 目标:答了「拿 PR」才是拿 PR,答了「找工作」与没答都按找工作(任务书第 41 条的默认)。
 *
 * @param band 目标档。
 * @returns pr / job。
 */
export function goalOf(band: number): string {
  if (band === GOAL_PR_BAND) {
    return GOAL_PR
  }
  return GOAL_JOB
}

/**
 * 这个目标是不是拿 PR(父桶按它取候选池、决定要不要查档案缺项)。
 *
 * @param goal 目标(pr / job)。
 * @returns true = 拿 PR。
 */
export function isPrGoal(goal: string): boolean {
  return goal === GOAL_PR
}

/**
 * 拿 PR 要补的档案项:身份、语言成绩、工作年限里没答(或答了不清楚)的(任务书第 42 条「档案缺项判不了的不推,提示补哪几项」)。
 *
 * @param p 本人档案。
 * @returns 要补的项;都答了给空列。
 */
export function needOf(p: PickProfile): Needs {
  const out: Needs = []
  if (p.who === TEXT_NONE) {
    out.push(NEED_WHO)
  }
  if (p.clb === BAND_NONE) {
    out.push(NEED_CLB)
  }
  if (EXP_BAND_MONTHS[p.totalExp] == null) {
    out.push(NEED_EXP)
  }
  return out
}

/**
 * 语言档 → CLB 级数(还没考 = 0)。
 *
 * @param band 语言档。
 * @returns CLB 级数。
 */
export function clbOf(band: number): number {
  if (band === CLB_BAND_UNTESTED) {
    return CLB_NONE
  }
  return band + CLB_BAND_OFFSET
}

/**
 * 同职业总经验档 → 月数(表里没有的档按 0)。
 *
 * @param band 总经验档。
 * @returns 月数。
 */
export function monthsOf(band: number): number {
  const m = EXP_BAND_MONTHS[band]
  if (m == null) {
    return SCORE_MIN
  }
  return m
}

/**
 * 候选池判硬性条件、打分、分档、排序:拿 PR 时硬性条件不过的岗去掉;按总分从高到低(同分保持候选池的先后);
 * 高、中档都没有才出低档(lowOnly;任务书第 46 条)。
 *
 * @param x 候选池、各通道对照、门槛行、档案、目标与所在省。
 * @returns 排好的行(各行在候选池里的位置与推荐指数)与出的是不是低档。
 */
export function rankPicksOf(x: RankIn): RankOut {
  let top: Ranked[] = []
  let low: Ranked[] = []
  let at = -1
  for (const row of x.rows) {
    at = at + 1
    const fit = fitOf({
      row, ways: x.ways, reqs: x.reqs, profile: x.profile, goal: x.goal, matches: x.matches, prov: x.prov,
    })
    if (fit == null) {
      continue
    }
    if (fit.level === LEVEL_LOW) {
      low = insertByScoreOf({ rows: low, one: { at, fit } })
    } else {
      top = insertByScoreOf({ rows: top, one: { at, fit } })
    }
  }
  if (top.length > 0) {
    return { rows: top, lowOnly: false }
  }
  return { rows: low, lowOnly: low.length > 0 }
}

/**
 * 把一行插进按总分从高到低排好的行里(同分排在已有的后面)。
 *
 * @param x 排好的行与要插的一行。
 * @returns 插好的行。
 */
export function insertByScoreOf(x: InsertIn): RankedList {
  const out: Ranked[] = []
  let placed = false
  for (const r of x.rows) {
    if (placed === false && r.fit.score < x.one.fit.score) {
      out.push(x.one)
      placed = true
    }
    out.push(r)
  }
  if (placed === false) {
    out.push(x.one)
  }
  return out
}

/**
 * 一行的推荐指数:拿 PR 先判硬性条件(不过 = 这一岗不推),再算匹配情况与总分、分档。
 *
 * @param x 这一岗、各通道对照、门槛行、档案、目标与所在省。
 * @returns 推荐指数;不推给 null。
 */
export function fitOf(x: FitIn): MaybePickFit {
  let hard: FitLines = []
  if (x.goal === GOAL_PR) {
    const got = hardLinesOf({ row: x.row, ways: x.ways, reqs: x.reqs, profile: x.profile })
    if (got == null) {
      return null
    }
    hard = got
  }
  const match = matchOf({ matches: x.matches, id: x.row.id })
  const soft = softOf({ row: x.row, goal: x.goal, match, prov: x.prov, city: x.profile.city })
  return { level: levelOf(soft.score), goal: x.goal, score: soft.score, hard, soft: soft.lines }
}

/**
 * 分数 → 档(总分与各分项同一把尺)。
 *
 * @param score 分数。
 * @returns high / mid / low。
 */
export function levelOf(score: number): string {
  if (score >= LEVEL_HIGH_MIN) {
    return LEVEL_HIGH
  }
  if (score >= LEVEL_MID_MIN) {
    return LEVEL_MID
  }
  return LEVEL_LOW
}

/**
 * 拿 PR 的硬性条件各项(任务书第 42 条;2026-11-11 Frank「这个门槛是最麻烦的」→ 只做粗判):
 * 找不到通道、通道没登身份对照、身份或院校条件走不了(lib/pathways 的 keepStreamOf,和「我的通道」同一个判定)→ 不推;
 * 语言纯比数字;工作经验只比总月数,够最低一档就过,不够又没有别的路才不推;档案分不出的限定标需自行核对。
 * 全职长期、所在省近 90 天抽过由推荐 SQL 保证,这里只出结论。
 *
 * @param x 这一岗、各通道对照、门槛行与档案。
 * @returns 各项结论;这一岗不推给 null。
 */
export function hardLinesOf(x: HardIn): MaybeFitLines {
  const way = wayOfPick({ row: x.row, ways: x.ways })
  if (way == null || way.fits == null) {
    return null
  }
  const filter = { who: x.profile.who, edu: eduRowsOf(x.profile.edu) }
  if (keepStreamOf({ fits: way.fits, province: x.row.province, filter }) === false) {
    return null
  }
  const lang = langLineOf({
    reqs: wayReqsOf({ way, reqs: x.reqs, row: x.row, lang: true }),
    mine: clbOf(x.profile.clb),
    check: CHECK_LANG_KEYS.includes(way.key),
  })
  const work = workLineOf({
    reqs: wayReqsOf({ way, reqs: x.reqs, row: x.row, lang: false }),
    mine: monthsOf(x.profile.totalExp),
    check: CHECK_WORK_KEYS.includes(way.key),
  })
  const out: FitLines = [{ key: LINE_WHO, tag: TAG_PASS, note: NOTE_PASS, vars: {} }, eduLineOf({ way, profile: x.profile })]
  for (const line of [lang, work]) {
    if (line == null) {
      continue
    }
    if (line.tag === TAG_FAIL) {
      return null
    }
    out.push(line)
  }
  out.push({ key: LINE_TERM, tag: TAG_PASS, note: NOTE_PASS, vars: {} })
  out.push({ key: LINE_DRAW, tag: TAG_PASS, note: NOTE_PASS, vars: { d: x.row.drawLast } })
  return out
}

/**
 * 学历一项:这个身份在这条通道有院校条件、而档案一段院校所在地都没填 → 需自行核对;其余(没有院校条件,或填了且合上,
 * 合不上的 keepStreamOf 已经去掉)→ 符合。
 *
 * @param x 这一岗走的通道与档案。
 * @returns 结论。
 */
export function eduLineOf(x: EduLineIn): FitLine {
  let schools = 0
  if (x.way.fits != null) {
    const cell = x.way.fits[x.profile.who]
    if (cell != null && cell.schools != null) {
      schools = cell.schools.length
    }
  }
  let filled = 0
  for (const r of eduRowsOf(x.profile.edu)) {
    if (r.prov !== TEXT_NONE) {
      filled = filled + 1
    }
  }
  if (schools > 0 && filled === 0) {
    return { key: LINE_EDU, tag: TAG_CHECK, note: NOTE_BLANK, vars: {} }
  }
  return { key: LINE_EDU, tag: TAG_PASS, note: NOTE_PASS, vars: {} }
}

/**
 * 这条通道对这一岗适用的门槛行:省与流名对上通道,再按岗位的 TEER 与职业码挑;语言行与工作经验行分开要。
 *
 * @param x 通道、全部门槛行、这一岗与要哪一类。
 * @returns 适用的行。
 */
export function wayReqsOf(x: WayReqsIn): ReqFacts {
  const out: ReqFacts = []
  for (const req of x.reqs) {
    if (req.lang === x.lang && req.province === x.way.province && x.way.reqStreams.includes(req.stream)
      && reqHitOf({ req, row: x.row })) {
      out.push(req)
    }
  }
  return out
}

/**
 * 一行门槛对这一岗适不适用:行上限了 TEER 就要岗位的 TEER 在内;限了职业码(整码或码头)就要岗位的职业码对上其一。
 *
 * @param x 门槛行与这一岗。
 * @returns true = 适用。
 */
export function reqHitOf(x: ReqHitIn): boolean {
  if (x.req.teers.length > 0 && (x.row.teer == null || x.req.teers.includes(String(x.row.teer)) === false)) {
    return false
  }
  if (x.req.nocs.length === 0) {
    return true
  }
  for (const n of x.req.nocs) {
    if (x.row.noc.startsWith(n)) {
      return true
    }
  }
  return false
}

/**
 * 语言一项:要求的 CLB 取适用行里的最高值,点了职业码的行优先于只按 TEER 的行(安省技工类比同 TEER 低一级、阿省护工高两级,
 * 都是点职业码的那行说了算);官方写明这一档不要求 → 符合;没有适用行 → 这一格不出(本站没收到数字的通道标需自行核对)。
 *
 * @param x 适用的语言行、本人的 CLB 与是不是先标核对的通道。
 * @returns 结论;不出给 null;不够给 fail。
 */
export function langLineOf(x: ReqLineIn): MaybeFitLine {
  const need = needClbOf(x.reqs)
  if (need == null) {
    if (x.check) {
      return { key: LINE_LANG, tag: TAG_CHECK, note: NOTE_SELF, vars: {} }
    }
    return null
  }
  if (need === CLB_NONE) {
    return { key: LINE_LANG, tag: TAG_PASS, note: NOTE_FREE, vars: {} }
  }
  if (x.mine >= need) {
    return { key: LINE_LANG, tag: TAG_PASS, note: NOTE_PASS, vars: { n: String(need) } }
  }
  return { key: LINE_LANG, tag: TAG_FAIL, note: NOTE_PASS, vars: {} }
}

/**
 * 适用的语言行里要求的 CLB(点了职业码的行优先;写明不要求的行按 0)。
 *
 * @param reqs 适用的语言行。
 * @returns CLB 级数;一行都没有给 null。
 */
export function needClbOf(reqs: ReqFacts): MaybeNum {
  let byNoc: MaybeNum = null
  let any: MaybeNum = null
  for (const r of reqs) {
    let v = CLB_NONE
    if (r.value != null) {
      v = r.value
    }
    if (r.nocs.length > 0 && (byNoc == null || v > byNoc)) {
      byNoc = v
    }
    if (any == null || v > any) {
      any = v
    }
  }
  if (byNoc != null) {
    return byNoc
  }
  return any
}

/**
 * 工作经验一项(粗判):档案分得出的行(只有月数,或再带「近几年内」「同职业」)里取最低月数,总月数够就符合;
 * 不够、但还有档案分不出的路(同一雇主在职、本省经验、应届例外…)→ 需自行核对,带那一行的官方原文;
 * 不够又没有别的路 → 不推;一行都没有 → 这一格不出(本站没收到数字的通道标需自行核对)。
 *
 * @param x 适用的工作经验行、本人的总月数与是不是先标核对的通道。
 * @returns 结论;不出给 null;不够给 fail。
 */
export function workLineOf(x: ReqLineIn): MaybeFitLine {
  let need: MaybeNum = null
  let alt = TEXT_NONE
  for (const r of x.reqs) {
    if (r.value == null) {
      continue
    }
    if (r.unsure) {
      if (alt === TEXT_NONE) {
        alt = r.label
      }
      continue
    }
    if (need == null || r.value < need) {
      need = r.value
    }
  }
  if (need != null && x.mine >= need) {
    return { key: LINE_WORK, tag: TAG_PASS, note: NOTE_PASS, vars: { n: String(need) } }
  }
  if (alt !== TEXT_NONE) {
    return { key: LINE_WORK, tag: TAG_CHECK, note: NOTE_TEXT, vars: { text: alt } }
  }
  if (need != null) {
    return { key: LINE_WORK, tag: TAG_FAIL, note: NOTE_PASS, vars: {} }
  }
  if (x.check) {
    return { key: LINE_WORK, tag: TAG_CHECK, note: NOTE_SELF, vars: {} }
  }
  return null
}

/**
 * 匹配情况各项与总分:找工作 = 匹配、薪资、地点;拿 PR 再加雇主信号(排在匹配后面)。总分 = 各分项按目标的权重加权。
 * 匹配项:有可用的简历正文按简历对职位描述(任务书第 44 条);没有就退回按想做和做过的工作判(职业对口,第 45 条)。
 *
 * @param x 这一岗、目标、本人所在省与城市。
 * @returns 各项与总分。
 */
export function softOf(x: SoftIn): SoftOut {
  let w: Weights = WEIGHTS_JOB
  if (x.goal === GOAL_PR) {
    w = WEIGHTS_PR
  }
  let occ = occPartOf(x.row)
  if (x.match != null) {
    occ = resumePartOf(x.match)
  }
  const emp = empPartOf(x.row)
  const pay = payPartOf(x.row.abovePct)
  const place = placePartOf({ row: x.row, prov: x.prov, city: x.city })
  const lines: FitLines = [occ.line]
  if (x.goal === GOAL_PR) {
    lines.push(emp.line)
  }
  lines.push(pay.line)
  lines.push(place.line)
  const sum = occ.score * w.match + emp.score * w.emp + pay.score * w.pay + place.score * w.place
  return { lines, score: Math.round(sum / SCORE_MAX) }
}

/**
 * 候选岗的简历匹配:一行都没有 = 没有可用的简历正文(没传、提取不出、切不出够多的英文词干)。
 *
 * @param x 连接、用户 id 与候选岗的 id。
 * @returns 逐岗的命中数与总数。
 */
export async function loadMatches(x: MatchesIn): MatchesOut {
  if (x.ids.length === 0) {
    return []
  }
  return queryRows({ db: x.db, sql: SQL.MYJOBS_RESUME_MATCH, params: [x.userId, x.ids, RESUME_LEX_MIN], map: toMatch })
}

/**
 * 这一岗的简历匹配。
 *
 * @param x 几岗的简历匹配与职位 id。
 * @returns 匹配;没有给 null。
 */
export function matchOf(x: MatchOfIn): MaybeMatch {
  for (const m of x.matches) {
    if (m.id === x.id) {
      return m
    }
  }
  return null
}

/**
 * 匹配分项(有可用的简历正文时):职位描述的词干里出现在简历里的比例,到 MATCH_FULL_RATIO 满分,按比例折算。
 *
 * @param m 这一岗的简历匹配。
 * @returns 分数与结论。
 */
export function resumePartOf(m: MatchFact): Part {
  let score = SCORE_MIN
  if (m.total > 0) {
    score = Math.min(SCORE_MAX, Math.round(m.hit / m.total / MATCH_FULL_RATIO * SCORE_MAX))
  }
  const vars = { hit: String(m.hit), all: String(m.total) }
  return { score, line: { key: LINE_RESUME, tag: levelOf(score), note: NOTE_HIT, vars } }
}

/**
 * 匹配分项(没有简历时):档案想做 / 做过的工作命中满分,和收藏或投过的岗同职业次之。
 *
 * @param row 这一岗。
 * @returns 分数与结论。
 */
export function occPartOf(row: RankRow): Part {
  if (row.occWant) {
    return { score: SCORE_MAX, line: { key: LINE_OCC, tag: LEVEL_HIGH, note: NOTE_WANT, vars: {} } }
  }
  if (row.occSimilar) {
    return { score: OCC_SIMILAR, line: { key: LINE_OCC, tag: levelOf(OCC_SIMILAR), note: NOTE_SIMILAR, vars: {} } }
  }
  return { score: SCORE_MIN, line: { key: LINE_OCC, tag: LEVEL_LOW, note: NOTE_NONE, vars: {} } }
}

/**
 * 雇主信号分项:AIP 或社区试点的指定雇主满分;有 LMIA 获批名额次之;都没有 0 分。
 *
 * @param row 这一岗。
 * @returns 分数与结论。
 */
export function empPartOf(row: RankRow): Part {
  if (row.designated) {
    return { score: SCORE_MAX, line: { key: LINE_EMP, tag: LEVEL_HIGH, note: NOTE_DESIGNATED, vars: {} } }
  }
  if (row.lmiaPositions > 0) {
    const vars = { n: String(row.lmiaPositions) }
    return { score: EMP_LMIA, line: { key: LINE_EMP, tag: levelOf(EMP_LMIA), note: NOTE_LMIA, vars } }
  }
  return { score: SCORE_MIN, line: { key: LINE_EMP, tag: LEVEL_LOW, note: NOTE_NONE, vars: {} } }
}

/**
 * 薪资分项:按高出本省同职业中位的幅度(高 20% 满分、持平一半、低 20% 零分);缺薪资或中位按一半、结论写未知。
 *
 * @param pct 高出中位的百分比;没有 = null。
 * @returns 分数与结论。
 */
export function payPartOf(pct: MaybeNum): Part {
  if (pct == null) {
    return { score: PAY_BASE, line: { key: LINE_PAY, tag: TAG_NONE, note: NOTE_NONE, vars: {} } }
  }
  const score = Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(PAY_BASE + pct * PAY_SLOPE)))
  let note = NOTE_SAME
  if (pct > 0) {
    note = NOTE_UP
  } else if (pct < 0) {
    note = NOTE_DOWN
  }
  return { score, line: { key: LINE_PAY, tag: levelOf(score), note, vars: { pct: String(Math.abs(pct)) } } }
}

/**
 * 地点分项:同城满分、同省次之、别的省 0 分;不知道本人在哪个省按同省的分、结论写未知。
 *
 * @param x 这一岗与本人所在省、城市。
 * @returns 分数与结论。
 */
export function placePartOf(x: PlaceIn): Part {
  if (x.prov === TEXT_NONE) {
    return { score: PLACE_PROV, line: { key: LINE_PLACE, tag: TAG_NONE, note: NOTE_NONE, vars: {} } }
  }
  if (x.row.province !== x.prov) {
    return { score: SCORE_MIN, line: { key: LINE_PLACE, tag: LEVEL_LOW, note: NOTE_OTHER, vars: {} } }
  }
  if (x.city !== TEXT_NONE && x.row.city.toLowerCase() === x.city.toLowerCase()) {
    return { score: SCORE_MAX, line: { key: LINE_PLACE, tag: LEVEL_HIGH, note: NOTE_CITY, vars: {} } }
  }
  return { score: PLACE_PROV, line: { key: LINE_PLACE, tag: levelOf(PLACE_PROV), note: NOTE_PROV, vars: {} } }
}

/**
 * 逗号分隔的清单 → 几项(去空白;空串给空列)。
 *
 * @param s 清单串。
 * @returns 几项。
 */
export function listOf(s: string): Strs {
  const out: string[] = []
  for (const part of s.split(LIST_SEP)) {
    const v = part.trim()
    if (v !== TEXT_NONE) {
      out.push(v)
    }
  }
  return out
}

/**
 * 在开通道的身份对照(按「我的通道」筛推荐用;2026-10-13)。
 *
 * @param x 连接。
 * @returns 各通道的省码、职位板标签、是否省默认与对照。
 */
export async function loadPathwayFits(x: DbIn): PathwayFitsOut {
  return queryRows({ db: x.db, sql: SQL.MYJOBS_PATHWAY_FITS, params: [], map: toPathwayFit })
}

/**
 * 库行 → 通道身份对照。
 *
 * @param r 库行。
 * @returns 对照。
 */
export function toPathwayFit(r: PathwayFitDbRow): PathwayFitFact {
  let reqStreams: string[] = []
  if (Array.isArray(r.req_streams)) {
    reqStreams = r.req_streams
  }
  return {
    key: r.key, reqStreams, province: r.province, label: text(r.board_label), isDefault: r.is_default === true, fits: r.fits,
  }
}

/**
 * 一行推荐走的通道:有具名通道按职位板标签对;没有、但可提名就是本省省默认通道(同职位板通道格的判据);都不是给 null。
 * (2026-10-13 立时叫 fitsOfPick、只回身份对照;2026-11-11 判语言与工作经验还要通道键和门槛流名,改回整条通道。)
 *
 * @param x 推荐一行与各通道对照。
 * @returns 通道;没有给 null。
 */
export function wayOfPick(x: WayIn): MaybeWay {
  for (const w of x.ways) {
    if (x.row.pnpStream !== TEXT_NONE && w.label === x.row.pnpStream) {
      return w
    }
    if (x.row.pnpStream === TEXT_NONE && x.row.pnpEligible && w.isDefault && w.province === x.row.province) {
      return w
    }
  }
  return null
}

// =========================================================================
// 行构造器
// =========================================================================

/**
 * 档案库行 → 本人档案(空格按没答)。
 *
 * @param r 库行。
 * @returns 档案。
 */
export function toPickProfile(r: PickProfileDbRow): PickProfile {
  let edu: string[] = []
  if (Array.isArray(r.edu)) {
    edu = r.edu
  }
  return {
    who: text(r.who), edu, goal: count(r.goal), clb: count(r.clb), totalExp: count(r.total_exp),
    prov: text(r.res_prov), city: text(r.res_city), hasOcc: r.has_occ === true,
  }
}

/**
 * 门槛库行 → 门槛行:按年登的工作经验换成月;官方写明不要求(op = none)数值给 null;带适用情形、或口径里有档案分不出的限定记 unsure。
 *
 * @param r 库行。
 * @returns 门槛行。
 */
export function toReq(r: ReqDbRow): ReqFact {
  let value = numOrNull(r.value)
  if (value != null && text(r.unit) === UNIT_YEARS) {
    value = value * MONTHS_PER_YEAR
  }
  return {
    province: r.province,
    stream: r.stream,
    lang: r.factor === FACTOR_LANG,
    value,
    teers: listOf(text(r.applies_teer)),
    nocs: listOf(text(r.applies_noc)),
    unsure: text(r.applies_condition) !== TEXT_NONE || BASIS_UNSURE_RE.test(text(r.basis)),
    label: text(r.label),
  }
}

/**
 * 简历匹配库行 → 一岗的简历匹配(空格按 0)。
 *
 * @param r 库行。
 * @returns 匹配。
 */
export function toMatch(r: MatchDbRow): MatchFact {
  return { id: count(r.id), hit: count(r.hit), total: count(r.total) }
}
