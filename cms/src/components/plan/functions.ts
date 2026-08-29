/**
 * plan 域(/plan/pr 决策页)的函数:答题器取值、通道与省份取名、条件格清单、
 * 「事实行 → 展示行」的四张洗行器(初评 / 名额竞争 / 职业竞争 / 抽选)、四组列声明,
 * 以及状态机器要用的手柄工厂与在途工作者。零 JSX 零 hook —— 排版归各件的 tsx,
 * 状态归 hooks.ts,死值归 constants.ts。
 * 🔴 判定与算分一格都不在这里:门槛、档位、排序、分数全由 lib/ruling、lib/pathways、
 * lib/points 下发,本文件只把它们的结论洗成能渲的字(「本页不算一个数」)。
 * 2026-08-27 建档时只装答题器的取值判定;2026-08-28 换装批把 Decision.tsx 的
 * 组件体与模块级散件全数收进来。
 *
 * @author Frank
 * @time 2026-08-27 04:30:00
 */
import { createElement } from 'react'
import { dropProvPrefix, streamDisplay } from '@/lib/jobs'
import {
  CLB, NCLC, clearAnswers, fieldsOf, getFields, missingFields, pullAndMerge, readAnswers, readScoreAnswers,
  toEngineAnswers, writeAnswers, writeScoreAnswers,
} from '@/lib/quiz'
import { gateOf, regionProvincesOf, uiOf } from '@/lib/pathways'
import { pickName, type OccNameRow } from '@/lib/noc'
import { EDU_KEYS, defaultProfile, lineStateOf, scoreProvince, streamMatches } from '@/lib/points'
import { officialLabel } from '@/lib/official'
import { track } from '@/lib/track'
import { ymd } from '@/lib/time'
import { pickL, quizToProfile, type L } from '@/components/quiz'
import { POPULAR_NOCS } from '@/components/profile'
import { cssOf } from '@/components/css'
import { overlayCls } from '@/components/modal'
import { CompProvCell } from './compprovcell'
import { DrawDateCell } from './drawdatecell'
import { DrawInvCell } from './drawinvcell'
import { DrawProvCell } from './drawprovcell'
import { DrawStreamCell } from './drawstreamcell'
import { HeadSub } from './headsub'
import { JobProvTag } from './jobprovtag'
import { LineCutCell } from './linecutcell'
import { LineDateCell } from './linedatecell'
import { PathCell } from './pathcell'
import { PlanActCell } from './planactcell'
import { PlanCardActs } from './plancardacts'
import { PlanCardChips } from './plancardchips'
import { PlanCompCell } from './plancompcell'
import { PlanGapCell } from './plangapcell'
import { PlanJobsCell } from './planjobscell'
import { PlanTimeCell } from './plantimecell'
import { QuotaCell } from './quotacell'
import { RankCell } from './rankcell'
import { makeBoldCell } from './makeboldcell'
import { makeCompCell } from './makecompcell'
import { CACHE } from './variables'
import {
  AGE_OF, ALIGN_RIGHT, AVAIL_OK, BAND_UNKNOWN, BAR_SEP, BLOCK_OFFER, CACHE_KEY_SEP, CLB_RANGE, CLS_SEP, COL_ACT,
  COL_DAYS, COL_DRAW_DATE, COL_DRAW_INV, COL_DRAW_PROV, COL_DRAW_SCORE, COL_DRAW_STREAM, COL_FLOW, COL_GAP, COL_JOBS,
  COL_LINE_CUT, COL_LINE_DATE, COL_LINE_STREAM, COL_LINE_YOU, COL_NEW30, COL_OPEN, COL_PATH, COL_POOL, COL_POOL_STUDY,
  COL_POOL_WORK, COL_PROVINCE, COL_QUOTA, COL_RANK, COL_RANK_LABEL, COL_RATIO, COL_TIME, CRED_INCLUDE, DATE_SEP,
  DECISION_PR, DRAW_KIND_NOTICE, EDU_OF, EV_KEYDOWN, FACTOR_WORK5, FACTOR_WORK610, FORM_KEY_AUTO, FORM_KEY_END,
  FORM_KEY_FOCUS_HEAD, GAP_FULL, GAP_KEY_RE, GATE_KEY_SEP, GATE_NEED_REQUIRED, GATE_STATUS, GROUP_ORDER, GUIDE_SEP,
  HDR_CONTENT_TYPE, INTERNAL_PATH_RE, KEY_AFTER_OFFER_GAP, KEY_AFTER_OFFER_OK, KEY_AFTER_OFFER_TIER, KEY_BELOW_LINE,
  KEY_BLOCKED, KEY_BLOCKED_OFFER, KEY_BTN_BACK, KEY_BTN_RESUME, KEY_BTN_START, KEY_DATA_GAP, KEY_ESC, KEY_FEDERAL,
  KEY_GAP_HEAD, KEY_INPUT_AGE, KEY_INPUT_CLB2, KEY_INPUT_EDU, KEY_INPUT_EXP_OLDER, KEY_JOBS_N, KEY_NEED_INFO,
  KEY_PATH_NAME, KEY_PLAN_TIER, KEY_PROV, KEY_QUIZ_TITLE, KEY_SCORE_TITLE, KEY_TIER_FULLTIME, KEY_TIER_GRAD,
  KEY_TILE_OCC, KEY_TILE_PROV, KEY_WAIT_TIER, KEY_WHY_FIELD, LANG_ZH, LINE_ABOVE, LINE_BELOW, LINE_DRAWS_MAX,
  LINE_ROW_KEY_SEP, LOCALE_CA, METHOD_POST, MIME_JSON, NOC_CODE_RE, NOC_LABEL_HEAD, NOC_SEP, OFFER_HAS,
  OFFER_NONE_BANDS, PARAM_NOC, PARAM_NOC_SINGLE, PARAM_PROV, PAREN_EN_CLOSE, PAREN_EN_OPEN, PAREN_ZH_CLOSE,
  PAREN_ZH_OPEN, PERCENT_MAX, PERCENT_SIGN, PLAN_ROWS_COARSE, PLAN_ROWS_FULL, PROFILE_FACTOR, PROGRAM_AIP,
  PROGRAM_FCIP, PROGRAM_PAREN_HEAD, PROGRAM_PAREN_TAIL, PROGRAM_RCIP, PROV_CODE_RE, PROV_KEY_SEP, PROV_SHOWN_MAX,
  PROV_STEP_KEY, P_NEXT, P_QUIZ, P_QUIZ_ON, QUERY_HEAD, QUIZ_PAD_CLS, QUIZ_PAD_SEL, RANK_EXTRA_MARK, RANK_NUM_SEP,
  RATIO_ROUND, RATIO_TAIL, SCORE_KEY_PROFILE, SCORE_KEY_SEP, SCROLL_BEHAVIOR_AUTO, SCROLL_BLOCK_START, SEP_EN, SEP_ZH,
  SIGN_MINUS, SIGN_PLUS, SLOT_FIELD_MATCH, SPLIT_YEARS, STAGE_BASIC, STAGE_EXPLORE, STEP_EXTRA, STOCK_MONTH_TAIL,
  STOCK_STUDY, STOCK_WORK, SUMMARY_FIELDS_HEAD, SUMMARY_FIELDS_TAIL, TEER_POS, TEXT_DASH, TEXT_NONE, TEXT_SPACE,
  TEXT_UNPARSED_EN, TEXT_UNPARSED_ZH, TICK_AREA, TICK_WAGE, TIER_AFTER_STUDY, TONE_INFO, TONE_MUTE, TONE_OK, TONE_WARN,
  TOTAL_EXP_RANGE, TRACK_ACT_EMP, TRACK_ACT_JOBS, TRACK_ADD_JOB_PROV, TRACK_ADD_OUTSIDE_PROV, TRACK_BUILD_PROFILE,
  TRACK_FLAG_OFF, TRACK_FLAG_ON, TRACK_OPEN, TRACK_QUIZ_DONE, TRACK_QUIZ_EDIT, TRACK_QUIZ_RESET, TRACK_SCORE_DONE,
  TRACK_SCORE_START, URL_EMP_DESIGNATED_HEAD, URL_EMP_HIRING_HEAD, URL_JOBS_HEAD, URL_JOBS_PNP, URL_JOBS_PROV_HEAD,
  URL_ME, URL_OCC_COMPETITION_HEAD, URL_POINTS_FACTORS_HEAD, URL_QUIZ_NOC_HEAD, URL_RULING_PROFILE, VERDICT_NEEDS_INFO,
  VERDICT_VIABLE, W_COMP_FLOW, W_COMP_POOL, W_COMP_PROV, W_COMP_QUOTA, W_COMP_RATIO, W_COMP_STUDY, W_COMP_WORK,
  W_DRAW_DATE, W_DRAW_INV, W_DRAW_PROV, W_DRAW_SCORE, W_DRAW_STREAM, W_LINE_CUT, W_LINE_DATE, W_LINE_STREAM,
  W_LINE_YOU, W_OCC_DAYS, W_OCC_NEW30, W_OCC_OPEN, W_OCC_PROV, W_PLAN_ACT_COARSE, W_PLAN_ACT_FULL, W_PLAN_GAP,
  W_PLAN_JOBS, W_PLAN_PATH_COARSE, W_PLAN_PATH_FULL, W_PLAN_RANK, W_PLAN_RATIO, W_PLAN_TIME, YEAR_2024, YEAR_2025,
  YEAR_2026, ZH_PROV_PREFIX_RE,
  AGE_BAND_LAST, AGE_BAND_STEPS, AGE_OPTIONS, ANOTHER_PROV_RE, AREA2_CITIES, AREA_MVRD, AREA_NEAR, AREA_REST,
  AUTO_FACTORS, BILINGUAL_RE, BONUS_CHUNK_MAX, BONUS_KEY_PARTS, CANADA_EDU_HAS, CANADA_EDU_NONE, CHOICE_NO,
  CHOICE_YES, EDU_KEY_BAND, EXP_BAND_NONE, FACTOR_AGE, FACTOR_AREA, FACTOR_EDUCATION, FACTOR_EDU_LOCATION,
  FACTOR_LANGUAGE, FACTOR_LANGUAGE1, FACTOR_LANGUAGE2, FACTOR_OCC_CAT, FACTOR_OFFER, FACTOR_TEER_CAT, FACTOR_WAGE,
  FACTOR_WORK, FACTOR_WORK_LOCATION, KEY_PS_EDU_HEAD, KEY_PS_FACTOR_HEAD, KEY_SCORE_PROFILE_HEAD, KIND_BONUS,
  KIND_ROW, KIND_RULE, LABEL_DIGIT_RE, LABEL_NUM_RE, LABEL_OVER_RE, LABEL_UNDER_RE, LANG_THRESHOLD_RE, MAPPED_FACTORS,
  MVRD_CITIES, OFFER_PREMISE_FACTORS, PROV_BC, PROV_CLOSED, RATE_HEAD, RATE_TAIL, RULE_EMPTY, SYSTEM_STREAM_RE,
  TICK_KEY_FACTOR_POS, WAGE_CAP_DEFAULT, WAGE_FLOOR_DEFAULT, WAGE_POINTS_MAX, WAGE_POINT_BASE,
  CLB_LABEL_HEAD, CLB_VALUES, CLS_QUIZ_FILL, EXP_YEARS_MAX, FIELD_SELECT, INPUT_NUMBER, KEY_INPUT_CLB1,
  KEY_INPUT_EXP_RECENT, SOURCE_JOB, SOURCE_PROFILE, SOURCE_TICK,
} from './constants'
import type {
  ActTrackIn, ActiveProvIn, ActsIn, ActsPanel, AddProvIn, AnswerBag, AnswersIn, AuthIn, AuthSyncIn, BandPickFn, BarIn,
  BasicRowIn, BasicRowsIn, ChoiceMatchIn, ChoiceOption, ChoicePatchIn, ChoiceTextIn, CleanupFn, ClickFn, CoarseIn,
  CompCellRow, CompCellRowIn, CompColsIn, CompMetaIn, CompView, CompViewIn, CondView, CondViewIn, DrawCellRow,
  DrawCellRowIn, DrawColsIn, DrawView, DrawViewIn, EchoFn, EditFn, EffectFn, EmpHrefIn, EmpHrefIn2, EscIn,
  FieldRowsIn, FieldTitleIn, FieldVisibleIn, FinishLabelIn, FlowIn, FlowSubIn, FocusIn, FocusKeyIn, FormKeyIn,
  GapKeyIn, GapPillsIn, GateChipIn, GridProvIn, GroupCompareIn, HeadSubIn, HolderClsIn, JobProvExtraIn, JobsHrefIn,
  JobsOfIn, JoinClsIn, KeyedRow, LineAnsweredIn, LineClearsIn, LineColsIn, LineDraw, LineGapIn, LineGapMakeIn,
  LineListIn, LineMainActIn, LineMainBtnIn, LineMainLabelIn, LineProvIn, LineRefIn, LineRowKeyIn, LineScoreIn,
  LineSortFn, LineStateIn, LineStreamMatchIn, LineStreamTextIn, LineSubTextIn, LineTabItem, LineTabItemsIn, LineTone,
  LineVerdict, MaybePathScore, MismatchIn, MountSyncIn, NoGridTextIn, NocTitleIn, NocsFn, NonceIn, OccCellRow,
  OccCellRowIn, OccColsIn, OccEffectIn, OccNameIn, OccPickIn, OccTargetIn, OccTextIn, OccView, OccViewIn, OrderedRow,
  OutsidePath, OutsideTextIn, OverlayClickIn, PadIn, PatchFn, PathInputKeyIn, PathRowsIn, PathScore, PathsEffectIn,
  PendingOfIn, PickPlainIn, PickYearIn, PickedIn, PickerStepIn, Pill, PlanAnswers, PlanBandValue, PlanBoardView,
  PlanBoardViewIn, PlanCardRowIn, PlanCellRow, PlanCellRowIn, PlanCellRowsIn, PlanCol, PlanColsIn, PlanCompText,
  PlanCompetition, PlanDraw, PlanEduBand, PlanLang, PlanOccComp, PlanRowFacts, PlanRowText, PlanRowTextIn,
  PlanScoreFactor, PlanScoreStore, PlanSelfProfile, PlanView, PlanViewIn, ProfilePath, ProgramParenIn, ProgressFn,
  ProgressIn, ProgressPanel, ProvCountFn, ProvDispFn, ProvDispIn, ProvDispMakeIn, ProvRenderIn, ProvValueIn, ProvView,
  ProvViewIn, ProvsAnyFn, ProvsFn, PushGapIn, QuizChoiceRow, QuizChoicesIn, QuizNextIn, QuizNextLabelIn, QuizPrevIn,
  RangeAtIn, RecentDrawsIn, RecentRangeIn, RepickIn, ResetQuizIn, RouteNameIn, ScoreCardView, ScoreCardViewIn,
  ScoreContext, ScoreCtxIn, ScoreEchoRow, ScoreFocus, ScoreFocusIn, ScoreIn, ScoreInitialIn, ScoreKeyIn, ScoreLimits,
  ScoreLimitsIn, ScoreProgress, ScoreRowsAnswer, ScoreShownIn, ScoreTables, SectionClsIn, SetStepIn, SharedFactorIn,
  ShownIn, SplitRowsIn, StartIndexIn, StartQuizIn, StateKeyIn, StateTextIn, StepBackIn, StepFlagIn, StepIn,
  StepIndexFn, StockAsOfIn, StreamsIn, SummaryGroups, SummaryRow, SummaryRowsIn, SyncIn, TFn, TablesEffectIn,
  TablesPendingIn, TierBand, TileRowsIn, TitlesEffectIn, TitlesIn, TopEmptyIn, TvJob, WriteNocsIn, YearPickIn,
  YearRowIn, YearStockIn,
  ActiveScoreProvIn, AreaIndexIn, BonusChunkIn, BonusGroupIn, BonusListIn, BoolSetFn, ByProvEffectIn, ByProvWire,
  ChoiceScreenIn, ClampRangeIn, ClusterIn, DeriveBonusIn, DerivedEchoIn, EchoLabelIn, EchoRowsIn,
  EchoValueIn, EffTicksIn, ExtraCheck, ExtraChoice, ExtraNavMakeIn, ExtraNumberMakeIn, ExtraPickFn, ExtraPickMakeIn,
  ExtraQuestion, ExtraQuestionsIn, FieldPickMakeIn, HealedExtraIn, InRangeIn, InitialProfileIn, LineNoteIn,
  ManualQuestion, ManualQuestionsIn, MergeProfAnsIn, MergeProfileIn, NearestAgeIn, NumberPickMakeIn,
  OfferAnswerMakeIn, OfferGainIn, OverrideRowIn, OverridesIn, PlanEduKey, PlanJobCount, PlanProvinceScore,
  PlanScoreOverride, PlanScorePart, ProfilePickMakeIn, ProvBonusIn, ProvOfKeyIn, ProvinceScoresIn, RowAppliesIn,
  RowFieldPickMakeIn, RowOptionsIn, RowPickMakeIn, RowRuleJson, ScoreActs, ScoreActsIn, ScoreAnchor, ScoreAnchorIn,
  ScoreBuild, ScoreBuildIn, ScoreCardEchoRow, ScoreCardLimits, ScoreChangeFn, ScoreField, ScoreFieldPickFn,
  ScoreFieldPushIn, ScoreFieldsIn, ScoreGapIn, ScoreGapTextIn, ScoreLimitKey, ScoreOption,
  ScorePartIn, ScoreProvincesIn, ScoreStoreIn, ScoreSyncIn, SiblingsIn, StoredPatchIn, TickKeyIn, TickPickIn,
  TickSetMakeIn, WageRowIn, WithFlagIn, WithRowIn, BonusScreenKeyIn,
  AreaChoicesIn, DrawRange, ExtraKeptIn, LineTextIn, ManualAskedIn, NumChoicesIn, NumPatchIn, NumTextIn,
  OverridePushIn, PrefillOkIn, ProfileAskedIn, ProfileFilledIn, ProvFactorKeyIn, ProvFactorsIn, RowChoicesIn,
  RowsOfFactorIn, SwitchTotalIn, TargetFirstIn,
  AreaOptionsIn, BonusChecksIn, BonusGroupRowsIn, BonusRowsIn, DigitOverrideIn, ExtraActiveIn, ExtraHintIn,
  ExtraLabelIn, FactorTitleIn, HitLabelsIn, ManualWageSkipIn, NumChoiceTextIn, NumOptionsIn, NumberFieldPickIn,
  SameForRowsIn, ScoreSourcesIn, ScoreTabItem, ScoreTitleIn, TickToggleMakeIn, WagePointsIn, YesNoChoicesIn,
  MarkAnsweredFn, ProfilePickFn, RowPickFn, RowPickIn, ScoreSourceIn, TickPickFn, WageRowHitIn, WageRuleJson,
  AnsweredCountIn, PanelBuildIn, PnpScoreCardIn, QuestionAtIn, QuestionIndexIn, ScoreCardBuildIn, ScoreCardCore,
  ScoreCardMachine, ScoreCardPanel, ShowResultsIn,
  BonusTickRow, BonusTicksMakeIn, CheckChangeIn, OfferTickRowIn, ScoreCheckChangeFn, ScoreChoiceRow,
  ScoreSelectChangeFn, SelectChangeIn, StreamOfProvIn, SwitchTextIn,
  EmptyJobRows, PlanWire, RaceTimer, RaceWireIn, SsrWireIn,
} from './types'
import css from './plan.module.css'

/**
 * 答案档里一道题那一格的值(可能还没答)。形状本域自己声明:值的种类照 Answers
 * 里真有的那几类写全(职业码数组、加分项勾选表这些归 object),不用 any 把整格类型丢掉。
 */
type AnswerCell = string | number | boolean | object | undefined

/**
 * 单选题此刻选中的值。选项的值只有档位数字与省码/身份码字符串两种,
 * 别的种类(职业码数组、加分项勾选表)压根不是单选题的答案,对选项比对来说等于没选。
 * @param cell 答案档里这道题那一格
 * @returns 能跟选项比对的值;比不了就是没选
 */
export function pickedOf(cell: AnswerCell): string | number | undefined {
  if (typeof cell === 'string') {
    return cell
  }
  if (typeof cell === 'number') {
    return cell
  }
  return undefined
}

/**
 * 题级显隐:不该问的人不见这道题,条件格也不摆(境外用户没有「持什么许可/人在哪个省」可答)。
 *
 * @param x 题名与答案档。
 * @returns 这道题该不该出现。
 */
export function fieldVisibleOf(x: FieldVisibleIn): boolean {
  const field = getFields()[x.name]
  if (field == null) {
    return false
  }
  if (field.visible == null) {
    return false
  }
  return field.visible(x.bands)
}

/**
 * 找出当前选中的那个选项的谓词工厂(`Array.prototype.find` 的签名由语言定死,
 * 闭包变量改走显式入参)。
 *
 * @param x 这道题此刻的值。
 * @returns 判一个选项是不是选中的那个。
 */
export function makeChoiceMatch(x: ChoiceMatchIn) {
  return function isPicked(choice: ChoiceOption): boolean {
    return choice.value === x.value
  }
}

/**
 * 一道基础题此刻的答案文案。`choice.text` 在字段库里是三语表,pickL 要的正是那个形状 ——
 * 断言只住这一处(字段库的值类型比三语表宽,窄化在取词这一步做完)。
 *
 * @param x 答案档、题名与界面语言。
 * @returns 答案文案;没答给空串。
 */
export function choiceTextOf(x: ChoiceTextIn): string {
  const field = getFields()[x.name]
  if (field == null) {
    return TEXT_NONE
  }
  const bag: AnswerBag = x.bands
  const choice = field.q.choices.find(makeChoiceMatch({ value: bag[x.name] }))
  if (choice == null) {
    return TEXT_NONE
  }
  return pickL(choice.text as L, x.lang)
}

/**
 * 省码 → 显示省名;词表里查不到就退回省码本身(不编一个省名出来)。
 *
 * @param x 取词函数与省码。
 * @returns 显示省名。
 */
export function provDispOf(x: ProvDispIn): string {
  const key = KEY_PROV + x.code
  const full = x.t(key)
  if (full === key) {
    return x.code
  }
  return full
}

/**
 * 省名取名函数的工厂(条件格网格与估分线卡都收这一形)。
 *
 * @param x 取词函数。
 * @returns 省码 → 显示省名。
 */
export function makeProvDisp(x: ProvDispMakeIn): ProvDispFn {
  return function provDisp(code: string): string {
    return provDispOf({ t: x.t, code })
  }
}

/**
 * 加拿大身份闸按 asks 细分文案键(2026-08-15 拆闸):判的是工签就说工签,
 * 不再统称「加拿大身份」。未标注(如 AIP/RCIP 这类本无此闸的 key)回落通用键。
 *
 * @param x 通道 key 与被卡住的闸名。
 * @returns 细分后的闸名(直接拼进文案键)。
 */
export function gateChipOf(x: GateChipIn): string {
  if (x.blocked !== GATE_STATUS) {
    return x.blocked
  }
  const r = gateOf({ key: x.pathKey, gate: GATE_STATUS })
  if (r.need === GATE_NEED_REQUIRED && r.asks != null) {
    return GATE_STATUS + GATE_KEY_SEP + r.asks
  }
  return GATE_STATUS
}

/**
 * 通道短名(走查 #293 的两步剥省名),初评表行与省外提示行共用一份。
 *
 * @param x 取词函数、界面语言、通道 key 与显示省名。
 * @returns 剥完省名的通道名。
 */
export function routeNameOf(x: RouteNameIn): string {
  const dropped = dropProvPrefix({ name: x.t(KEY_PATH_NAME + x.key), prov: x.provinceLabel })
  let short = dropped
  if (x.lang === LANG_ZH) {
    short = dropped.replace(ZH_PROV_PREFIX_RE, TEXT_NONE)
  }
  const trimmed = short.trim()
  if (trimmed === TEXT_NONE) {
    return dropped
  }
  return trimmed
}

/**
 * 制度名并进通道名尾巴的小括号(2026-08-15 Frank「把 pnp rcip 这种标签去掉
 * 统一改成后面小括号那种」):边框小标撤销;名字里已自带的(中文态 EE/AIP/RCIP 自名)
 * 不重复追加;中文全角括号,其余半角带空格。
 *
 * @param x 界面语言、剥完省名的通道名与制度名。
 * @returns 带制度名的通道全名。
 */
export function programParenOf(x: ProgramParenIn): string {
  const has = new RegExp(PROGRAM_PAREN_HEAD + x.program + PROGRAM_PAREN_TAIL)
  if (has.test(x.base)) {
    return x.base
  }
  if (x.lang === LANG_ZH) {
    return x.base + PAREN_ZH_OPEN + x.program + PAREN_ZH_CLOSE
  }
  return x.base + PAREN_EN_OPEN + x.program + PAREN_EN_CLOSE
}

/**
 * 通道全名 = 剥完省名的短名 + 制度小括号。制度归属 2026-08-15 起写在策略文件里,
 * 这里只取 —— 前端读字段不认 key。
 *
 * @param x 取词函数、界面语言、通道 key 与显示省名。
 * @returns 通道全名。
 */
export function routeNameFullOf(x: RouteNameIn): string {
  const base = routeNameOf(x)
  return programParenOf({ lang: x.lang, base, program: uiOf(x.key).program })
}

/**
 * 一个职业码的显示名:常用职业走已有字典,冷门职业用按码补全到手的名字;
 * 名字还没到手(或这个码压根查不到名字)时退回码本身 ——
 * 用户明明选过职业,这一格不能写「待填写」。
 *
 * @param x 取词函数、界面语言、职业码与已补全的名字表。
 * @returns 职业显示名。
 */
export function occNameOf(x: OccNameIn): string {
  for (const item of POPULAR_NOCS) {
    if (item.noc === x.code) {
      return x.t(item.key)
    }
  }
  const hit = x.titles[x.lang + CACHE_KEY_SEP + x.code]
  if (hit != null && hit !== TEXT_NONE) {
    return hit
  }
  return NOC_LABEL_HEAD + x.code
}

/**
 * 档案里全部职业的显示名连起来(中文顿号,其余逗号)。
 *
 * @param x 取词函数、界面语言、职业码清单与已补全的名字表。
 * @returns 连起来的职业名;一个都没选给空串。
 */
export function occTextOf(x: OccTextIn): string {
  const names: string[] = []
  for (const code of x.nocs) {
    const name = occNameOf({ t: x.t, lang: x.lang, code, titles: x.titles })
    if (name !== TEXT_NONE) {
      names.push(name)
    }
  }
  return names.join(sepOf(x.lang))
}

/**
 * 枚举分隔(中文顿号,其余逗号 —— 全站禁「·」杂糅)。
 *
 * @param lang 界面语言。
 * @returns 分隔记号。
 */
export function sepOf(lang: PlanLang): string {
  if (lang === LANG_ZH) {
    return SEP_ZH
  }
  return SEP_EN
}

/**
 * 没答那一格的占位文案。上线以来就是内联死值,收进三语词表归 i18n 批。
 *
 * @param lang 界面语言。
 * @returns 占位文案。
 */
export function unparsedOf(lang: PlanLang): string {
  if (lang === LANG_ZH) {
    return TEXT_UNPARSED_ZH
  }
  return TEXT_UNPARSED_EN
}

/**
 * 条件格的五个小类别(2026-08-16 Frank「分一下小类别,不然看着太乱,而且没有排序」)。
 * 组序 = 这里的书写顺序,组内 = 题序;两者都不随答案变动而跳。
 *
 * @param t 取词函数。
 * @returns 五个类别名。
 */
export function groupsOf(t: TFn): SummaryGroups {
  return {
    who: t('dp.grp.who'),
    edu: t('dp.grp.edu'),
    lang: t('dp.grp.lang'),
    work: t('dp.grp.work'),
    goal: t('dp.grp.goal'),
  }
}

/**
 * 条件格的组序:固定成「身份 → 教育 → 语言 → 职业经验 → 目标」,不跟着题序跑
 * (组内仍按题序,稳定排序)。
 *
 * @param groups 五个类别名。
 * @returns 按组序排好的类别名。
 */
export function groupOrderOf(groups: SummaryGroups): string[] {
  const out: string[] = []
  for (const key of GROUP_ORDER) {
    const name = groups[key]
    if (name != null) {
      out.push(name)
    }
  }
  return out
}

/**
 * 一道基础题的条件格(题名同时也是这一格的 key:点它直达那道题)。
 *
 * @param x 取词函数、界面语言、答案档、题名、小类别与题面键。
 * @returns 一格。
 */
export function basicRowOf(x: BasicRowIn): SummaryRow {
  const value = choiceTextOf({ bands: x.bands, name: x.name, lang: x.lang })
  let shown = value
  if (value === TEXT_NONE) {
    shown = unparsedOf(x.lang)
  }
  return {
    key: x.name,
    prov: TEXT_NONE,
    group: x.group,
    label: x.t(x.labelKey),
    value: shown,
    filled: value !== TEXT_NONE,
  }
}

/**
 * 目标省那一格的值。选多了就缩写(2026-08-16 Frank「这个要对齐」):十个省名全列会把
 * 这一格撑成三行,同排另外两格只有一行 —— 格子高度被它带跑,一排看着就是歪的。
 * 铁律见 copy-no-wrap-no-filler:值折行 = 文案太长,删到一行,而不是让版式迁就它。
 *
 * @param x 取词函数、界面语言与答案档。
 * @returns 目标省的显示值。
 */
export function provValueOf(x: ProvValueIn): string {
  const provs = x.bands.provs
  if (provs.length === 0) {
    if (x.bands.provsAny === true) {
      return x.t('quiz.provAnyShort')
    }
    return unparsedOf(x.lang)
  }
  const [first, second] = provs
  if (provs.length > PROV_SHOWN_MAX && first != null && second != null) {
    return x.t('dp.sum.provN', { first: x.t(KEY_PROV + first), second: x.t(KEY_PROV + second), n: provs.length })
  }
  const names: string[] = []
  for (const code of provs) {
    names.push(x.t(KEY_PROV + code))
  }
  return names.join(sepOf(x.lang))
}

/**
 * 目标省答过没有。「还不确定」是**答过的**(Frank 2026-08-12:「很多人不知道去哪个省,
 * 比如国内的厨师」)—— 它跟「没答」不是一回事:前者 = 不限省、13 条通道全判一遍;
 * 后者 = 还没走到这一步。
 *
 * @param bands 答案档。
 * @returns 答过没有。
 */
export function provAnsweredOf(bands: PlanAnswers): boolean {
  if (bands.provs.length > 0) {
    return true
  }
  return bands.provsAny === true
}

/**
 * 全部条件格(基础题 + 估分题)。带岗态判定卡要整份,摘要卡与估分卡各取一半。
 * 计数与格子必须对得上 —— 卡头写着「已答 6/8」而下面只摆 6 格,数和格子就跟人对不上。
 *
 * @param x 取词函数、界面语言、答案档、职业名表、带岗那份工作与估分题回显。
 * @returns 按题序排好的全部条件格。
 */
export function summaryRowsOf(x: SummaryRowsIn): SummaryRow[] {
  const groups = groupsOf(x.t)
  const rows: SummaryRow[] = [occSummaryRowOf(x)]
  for (const row of fieldSummaryRowsOf({ t: x.t, lang: x.lang, bands: x.bands, groups, specs: SUMMARY_FIELDS_HEAD })) {
    rows.push(row)
  }
  rows.push(provSummaryRowOf(x))
  for (const row of fieldSummaryRowsOf({ t: x.t, lang: x.lang, bands: x.bands, groups, specs: SUMMARY_FIELDS_TAIL })) {
    rows.push(row)
  }
  for (const e of x.echo) {
    let value = e.value
    if (value === TEXT_NONE) {
      value = unparsedOf(x.lang)
    }
    rows.push({ key: e.key, prov: e.prov, label: e.label, value, filled: e.filled })
  }
  return rows
}

/**
 * 按题单摆出一批基础题的条件格(带题级显隐的那几道,不该问的人不摆一个永远「待填写」的格)。
 *
 * @param x 取词函数、界面语言、答案档、类别名与题单。
 * @returns 这一批的条件格。
 */
export function fieldSummaryRowsOf(x: FieldRowsIn): SummaryRow[] {
  const rows: SummaryRow[] = []
  for (const spec of x.specs) {
    if (spec.gated === true && fieldVisibleOf({ name: spec.name, bands: x.bands }) === false) {
      continue
    }
    let group = TEXT_NONE
    const hit = x.groups[spec.group]
    if (hit != null) {
      group = hit
    }
    rows.push(basicRowOf({ t: x.t, lang: x.lang, bands: x.bands, name: spec.name, group, labelKey: spec.label }))
  }
  return rows
}

/**
 * 职业那一格。带岗态职业不匹配时挂 ⚠ 胶囊(2026-08-14 Frank「加个图标标一下 职业不匹配」),
 * 长句不要。
 *
 * @param x 同 summaryRowsOf。
 * @returns 职业那一格。
 */
export function occSummaryRowOf(x: SummaryRowsIn): SummaryRow {
  const groups = groupsOf(x.t)
  const text = occTextOf({ t: x.t, lang: x.lang, nocs: x.bands.nocs, titles: x.titles })
  let value = text
  if (text === TEXT_NONE) {
    value = unparsedOf(x.lang)
  }
  const row: SummaryRow = {
    key: KEY_TILE_OCC, prov: TEXT_NONE, group: groups.work, label: x.t('dp.sum.occ'), value, filled: text !== TEXT_NONE,
  }
  if (occMismatchOf({ tvJob: x.tvJob, bands: x.bands })) {
    row.warn = x.t('dp.warnOcc')
  }
  return row
}

/**
 * 目标省那一格。带岗态省份不匹配时挂 ⚠ 胶囊(2026-08-14 Frank「省份不匹配」)。
 *
 * @param x 同 summaryRowsOf。
 * @returns 目标省那一格。
 */
export function provSummaryRowOf(x: SummaryRowsIn): SummaryRow {
  const groups = groupsOf(x.t)
  const row: SummaryRow = {
    key: KEY_TILE_PROV,
    prov: TEXT_NONE,
    group: groups.goal,
    label: x.t('dp.sum.prov'),
    value: provValueOf({ t: x.t, lang: x.lang, bands: x.bands }),
    filled: provAnsweredOf(x.bands),
  }
  if (provMismatchOf({ tvJob: x.tvJob, bands: x.bands })) {
    row.warn = x.t('dp.warnProv')
  }
  return row
}

/**
 * 岗位职业不在档案职业里(带岗态才判)。
 *
 * @param x 带岗那份工作与答案档。
 * @returns 对不对得上。
 */
export function occMismatchOf(x: MismatchIn): boolean {
  if (x.tvJob == null || x.tvJob.noc === TEXT_NONE) {
    return false
  }
  if (x.bands.nocs.length === 0) {
    return false
  }
  return x.bands.nocs.includes(x.tvJob.noc) === false
}

/**
 * 岗位省不在目标省里(带岗态才判;答了「还不确定」= 不限省,不算不匹配)。
 *
 * @param x 带岗那份工作与答案档。
 * @returns 对不对得上。
 */
export function provMismatchOf(x: MismatchIn): boolean {
  if (x.tvJob == null || x.bands.provsAny === true) {
    return false
  }
  if (x.bands.provs.length === 0) {
    return false
  }
  return x.bands.provs.includes(x.tvJob.province) === false
}

/**
 * 估分段的条件格:**凡是分值卡回报的都是估分题**,归估分卡(2026-08-16 合卡)——
 * 不只省专属那批。共用估分题(学历/年龄这类,prov='')先前混在基础卷格子里,
 * 于是「申请人条件」卡里冒出一格谁也不知道从哪来的「学历」。
 *
 * @param x 全部条件格与估分题回显。
 * @returns 估分段的条件格。
 */
export function scoreSummaryRowsOf(x: SplitRowsIn): SummaryRow[] {
  const keys = echoKeysOf(x.echo)
  const out: SummaryRow[] = []
  for (const r of x.rows) {
    if (keys.has(r.key)) {
      out.push(r)
    }
  }
  return out
}

/**
 * 基础段的条件格,按小类别稳定排序(组序固定成「身份 → 教育 → 语言 → 职业经验 → 目标」,
 * 不跟着题序跑;组内仍按题序)。
 *
 * @param x 全部条件格、估分题回显与类别名。
 * @returns 排好序的基础段条件格。
 */
export function basicSummaryRowsOf(x: BasicRowsIn): SummaryRow[] {
  const keys = echoKeysOf(x.echo)
  const pairs: OrderedRow[] = []
  let i = 0
  for (const r of x.rows) {
    if (keys.has(r.key) === false) {
      pairs.push({ r, i })
    }
    i += 1
  }
  pairs.sort(makeGroupCompare({ order: x.order }))
  const out: SummaryRow[] = []
  for (const p of pairs) {
    out.push(p.r)
  }
  return out
}

/**
 * 估分题回显的题 key 集合(基础段与估分段就靠它一刀切开)。
 *
 * @param echo 估分题回显。
 * @returns 题 key 集合。
 */
export function echoKeysOf(echo: ScoreEchoRow[]): Set<string> {
  const keys = new Set<string>()
  for (const e of echo) {
    keys.add(e.key)
  }
  return keys
}

/**
 * 按小类别排序的比较器工厂:先比组序,同组按原题序(稳定)。
 *
 * @param x 组序。
 * @returns 比较器。
 */
export function makeGroupCompare(x: GroupCompareIn) {

  return function byGroup(a: OrderedRow, b: OrderedRow): number {
    let ga = TEXT_NONE
    if (a.r.group != null) {
      ga = a.r.group
    }
    let gb = TEXT_NONE
    if (b.r.group != null) {
      gb = b.r.group
    }
    const delta = x.order.indexOf(ga) - x.order.indexOf(gb)
    if (delta !== 0) {
      return delta
    }
    return a.i - b.i
  }
}

/**
 * 该省还欠几道估分题(估分线卡的页签角标)。
 *
 * @param x 估分题的条件格与省码。
 * @returns 欠几道。
 */
export function pendingOfProv(x: PendingOfIn): number {
  let n = 0
  for (const r of x.rows) {
    if (r.prov === x.province && r.filled === false) {
      n += 1
    }
  }
  return n
}

/**
 * 共用估分题该不该在这个省下出现:BC 没有 language2,就不该问第二语言
 * (2026-08-16 Frank 实拍:共用题先前在每个省页签下都摆)。
 *
 * @param x 题 key、省码与官方分值表逐行。
 * @returns 出不出。
 */
export function sharedFactorShownOf(x: SharedFactorIn): boolean {
  const want = PROFILE_FACTOR[x.key]
  if (want == null) {
    return true
  }
  for (const f of x.factors) {
    if (f.province === x.province && want.includes(f.factor)) {
      return true
    }
  }
  return false
}

/**
 * 一行的门槛状态取键。判据顺序即优先级:本站没条文 → 差 offer(看反事实)→ 被别的闸卡住
 * → 该答的题还没答 → 还要攒几档。
 *
 * @param x 服务端下发的这一条通道与它的「拿到 offer 即可申请」说法。
 * @returns 门槛状态的文案键。
 */
export function stateKeyOf(x: StateKeyIn): string {
  const row = x.row
  if (row.availability !== AVAIL_OK) {
    return KEY_DATA_GAP
  }
  if (row.blockedBy === BLOCK_OFFER) {
    return afterOfferKeyOf(x)
  }
  if (row.blockedBy != null) {
    return KEY_BLOCKED + gateChipOf({ pathKey: row.key, blocked: row.blockedBy })
  }
  if (row.verdict === VERDICT_NEEDS_INFO) {
    return KEY_NEED_INFO
  }
  let tier = 0
  if (row.tier != null) {
    tier = row.tier
  }
  return KEY_PLAN_TIER + tier
}

/**
 * 差 offer 那一行的门槛状态取键 = 反事实结论。「拿到 offer 即可申请」各家说法不同
 * (AIP=指定雇主、RCIP=社区雇主、AB 官方还要求已在阿省全职在岗)→ 话术住在策略文件里,
 * 这里只取;答不全(needs-info)时不敢承诺,维持「至少还差 offer」。
 *
 * @param x 同 stateKeyOf。
 * @returns 门槛状态的文案键。
 */
export function afterOfferKeyOf(x: StateKeyIn): string {
  const ao = x.row.afterOffer
  if (ao != null && ao.verdict === VERDICT_VIABLE) {
    if (ao.tier != null && ao.tier !== 0) {
      return KEY_AFTER_OFFER_TIER + ao.tier
    }
    if (x.afterOfferOkKey != null) {
      return x.afterOfferOkKey
    }
    return KEY_AFTER_OFFER_OK
  }
  if (ao != null && ao.blockedBy != null) {
    return KEY_AFTER_OFFER_GAP + gateChipOf({ pathKey: x.row.key, blocked: ao.blockedBy })
  }
  return KEY_BLOCKED_OFFER
}

/**
 * 门槛文案:够不着线的写数字(估分 X < 线 Y),数字是官方事实,结论用户自己得。
 *
 * @param x 取词函数与服务端下发的这一条通道。
 * @returns 门槛状态的成句。
 */
export function stateTextOf(x: StateTextIn): string {
  const score = x.row.score
  if (x.row.belowLine === true && score != null && score.refLine != null) {
    return x.t(KEY_BELOW_LINE, { v: score.value, line: score.refLine })
  }
  return x.t(stateKeyOf({ row: x.row, afterOfferOkKey: uiOf(x.row.key).afterOfferOkKey }))
}

/**
 * 在招岗数以服务端下发的 jobsN 为准(与排序同源);旧响应没带这个字段时退回本地那份
 * 职业分省竞争查一次(查无该省 = 0,0 必须显式写出,空着会被读成「没数据」)。
 *
 * @param x 服务端下发的这一条通道与本地那份职业分省竞争。
 * @returns 在招岗数;null = 无岗位级口径。
 */
export function jobsOfRow(x: JobsOfIn): number | null {
  if (x.row.jobsN !== undefined) {
    return x.row.jobsN
  }
  if (PROV_CODE_RE.test(x.row.province) === false || x.occComp == null) {
    return null
  }
  for (const o of x.occComp) {
    if (o.province === x.row.province) {
      return o[uiOf(x.row.key).jobsSource]
    }
  }
  return 0
}

/**
 * 「查岗位」的去处:筛选参数归策略文件(AIP=指定雇主、RCIP=试点社区、其余=该省 pnp)。
 * 2026-08-16「查岗位应该带着条件查」「在招是显示多少就查多少」:职业走 noc= 多值参数、
 * 档案选了几个就带几个、不再加 pnp=yes(那不在「在招」的口径里,加了两边数字就对不上)。
 *
 * @param x 服务端下发的这一条通道与档案里的职业码。
 * @returns 去处;null = 这条线没有岗位级口径。
 */
export function jobsHrefOf(x: JobsHrefIn): string | null {
  const provincial = PROV_CODE_RE.test(x.row.province)
  let nocParam = TEXT_NONE
  if (x.planNocs.length > 0) {
    nocParam = PARAM_NOC + x.planNocs.join(NOC_SEP)
  }
  let provParam = TEXT_NONE
  if (provincial) {
    provParam = PARAM_PROV + x.row.province
  }
  const query = uiOf(x.row.key).jobsQuery
  if (query != null) {
    return URL_JOBS_HEAD + query + provParam + nocParam
  }
  if (provincial) {
    return URL_JOBS_PROV_HEAD + x.row.province + nocParam
  }
  return null
}

/**
 * 「查雇主」的去处。两种口径不混:指定雇主是硬门槛的制度(AIP/RCIP/FCIP)给官方指定名录;
 * 普通省提名给该省该职业**在招**的雇主(本站职位库)—— 那才是他要投的人。
 * 普通省提名没有「指定雇主」这回事,给了等于凭空发明一道门槛。
 *
 * @param x 服务端下发的这一条通道与当前职业码。
 * @returns 去处;null = 这条线不给雇主入口。
 */
export function empHrefOf(x: EmpHrefIn): string | null {
  const program = uiOf(x.row.key).program
  const provincial = PROV_CODE_RE.test(x.row.province)
  if (program === PROGRAM_AIP || program === PROGRAM_RCIP || program === PROGRAM_FCIP) {
    let provParam = TEXT_NONE
    if (provincial) {
      provParam = PARAM_PROV + x.row.province
    }
    return URL_EMP_DESIGNATED_HEAD + program + provParam
  }
  if (provincial && x.noc !== TEXT_NONE) {
    return URL_EMP_HIRING_HEAD + x.row.province + PARAM_NOC_SINGLE + x.noc
  }
  return null
}

/**
 * 还要攒多久:被 offer 卡住的看反事实 tier(拿到 offer 之后还差几个月),其余行看本行 tier。
 * 2026-08-15 实撞:AB 机会通道被工签闸挡着,tier 只挂在本行上,先前只读反事实 tier
 * → 那行的 24 个月经验缺口整个不出现,却还挂着「其余门槛已达标」= 睁眼说瞎话。
 *
 * @param row 服务端下发的这一条通道。
 * @returns 还要攒几档;0 = 不用攒或攒不出来。
 */
export function waitTierOf(row: ProfilePath): TierBand {
  if (row.blockedBy === BLOCK_OFFER) {
    const ao = row.afterOffer
    if (ao != null && ao.verdict === VERDICT_VIABLE && ao.tier != null) {
      return ao.tier
    }
    return 0
  }
  if (row.tier != null) {
    return row.tier
  }
  return 0
}

/**
 * 差的那一样(offer 按通道分:AIP=指定雇主、RCIP=社区雇主 —— 三者要的不是同一种 offer)。
 *
 * @param row 服务端下发的这一条通道。
 * @returns 缺口键。
 */
export function gapKeyOf(row: ProfilePath): string {
  const offerGapKey = uiOf(row.key).offerGapKey
  if (row.blockedBy === BLOCK_OFFER && offerGapKey != null) {
    return offerGapKey
  }
  let blocked = TEXT_NONE
  if (row.blockedBy != null) {
    blocked = row.blockedBy
  }
  return gateChipOf({ pathKey: row.key, blocked })
}

/**
 * 一行的判定事实(话怎么说、色用哪档,都从这几格推出来)。
 * 「拿到本省 offer 即可申请」是信息态不是达标态 → 蓝,不抢 open 的绿;
 * 估分 < 线的行不许亮绿(2026-08-15「够不到就排后面」)。
 *
 * @param x 取词函数与服务端下发的这一条通道。
 * @returns 判定事实。
 */
export function toPlanRowFacts(x: StateTextIn): PlanRowFacts {
  const row = x.row
  const ao = row.afterOffer
  const isOffer = row.blockedBy === BLOCK_OFFER
  let afterOk = false
  if (isOffer && ao != null && ao.verdict === VERDICT_VIABLE && ao.tier == null && row.availability === AVAIL_OK) {
    afterOk = true
  }
  let missing: string[] = []
  if (row.missingSlots != null) {
    missing = row.missingSlots
  }
  let gaps: string[] = []
  if (row.gaps != null) {
    gaps = row.gaps
  }
  return {
    stateText: stateTextOf(x),
    blocked: row.blockedBy != null && row.belowLine !== true,
    dataGap: row.availability !== AVAIL_OK,
    gapKey: gapKeyOf(row),
    gapsAll: gaps,
    fieldUnknown: missing.includes(SLOT_FIELD_MATCH),
    waitTier: waitTierOf(row),
    waitAfterOffer: isOffer,
    afterStudy: row.tierBasis === TIER_AFTER_STUDY,
    fullTime: row.tierFullTime === true,
    afterOk,
    openOk: row.verdict === VERDICT_VIABLE && row.availability === AVAIL_OK
      && row.blockedBy == null && row.belowLine !== true,
  }
}

/**
 * 「还差」列的缺口胶囊(2026-08-15 Frank「改成推荐原因吧,然后用胶囊 bullets」)。
 * 一句话拆成几枚 ——「为什么它排在这」本来就是两件事:其余门槛已经达标、还差这一样。
 * 竞争度与在招数各有自己的列,这里不重复(文案四闸:不重复)。
 * 「有明确缺口」与「本站没收录条文」是两件事,可以同时成立(FCIP 实拍:法语已判出缺口、
 * 门槛行却还没入库)—— 所以这里不拿 availability 卡它,两枚并排说。
 *
 * @param x 取词函数与这一行的判定事实。
 * @returns 缺口胶囊(可能一枚都没有)。
 */
export function gapPillsOf(x: GapPillsIn): Pill[] {
  const tail: Pill[] = []
  if (x.f.dataGap) {
    tail.push({ text: x.f.stateText, tone: TONE_MUTE })
  }
  if (x.f.fieldUnknown) {
    tail.push({ text: x.t(KEY_WHY_FIELD), tone: TONE_MUTE })
  }
  if (x.f.blocked === false) {
    return tail
  }
  const out: Pill[] = []
  pushGapPill({ t: x.t, out, gate: x.f.gapKey })
  for (const k of x.f.gapsAll) {
    pushGapPill({ t: x.t, out, gate: gateOfGapKey({ key: k, offerGate: x.f.gapKey }) })
  }
  if (x.f.waitAfterOffer && x.f.waitTier === 0 && x.f.afterOk === false && x.f.dataGap === false) {
    out.push({ text: x.f.stateText, tone: TONE_WARN })
  }
  return out.concat(tail)
}

/**
 * 全部缺口键(#324 的 `pv.gate.<闸名>.gap` 形)里那个闸名;offer 那一格换成本行的
 * 专门化 offer 缺口键(要的不是同一种 offer)。
 *
 * @param x 一条缺口键与本行的 offer 缺口键。
 * @returns 闸名;形状对不上就给空串(空串不推胶囊)。
 */
export function gateOfGapKey(x: GapKeyIn): string {
  const m = GAP_KEY_RE.exec(x.key)
  if (m == null || m.groups == null) {
    return TEXT_NONE
  }
  const gate = m.groups.gate
  if (gate == null) {
    return TEXT_NONE
  }
  if (gate === BLOCK_OFFER) {
    return x.offerGate
  }
  return gate
}

/**
 * 往缺口胶囊里推一枚:普通「差 offer」跳过(2026-08-16 Frank「这个需要 offer 也是废话」——
 * 每条省提名都要 offer,逐行重复一遍零信息,找 offer 本来就是操作列那件事);
 * 空闸名跳过;同名的不重复推。
 *
 * @param x 取词函数、已收集的胶囊与闸名。
 * @returns 无(就地推进去)。
 */
export function pushGapPill(x: PushGapIn): void {
  if (x.gate === BLOCK_OFFER || x.gate === TEXT_NONE) {
    return
  }
  const text = x.t(KEY_GAP_HEAD + x.gate)
  for (const p of x.out) {
    if (p.text === text) {
      return
    }
  }
  x.out.push({ text, tone: TONE_WARN })
}

/**
 * 「还要多久」列的那一枚胶囊:差 offer 行从拿到 offer 起算;在读学生(#319)换
 * 「毕业拿工签后」变体。
 *
 * @param x 取词函数与这一行的判定事实。
 * @returns 这一枚胶囊;null = 这一格不出。
 */
export function timePillOf(x: GapPillsIn): Pill | null {
  const f = x.f
  if (f.dataGap && f.blocked === false) {
    return null
  }
  if (f.openOk) {
    return { text: f.stateText, tone: TONE_OK }
  }
  if (f.blocked === false) {
    if (f.afterOk) {
      return { text: f.stateText, tone: TONE_INFO }
    }
    return { text: f.stateText, tone: TONE_WARN }
  }
  if (f.waitTier !== 0) {
    return { text: x.t(waitKeyOf(f)), tone: TONE_INFO }
  }
  if (f.afterOk) {
    return { text: f.stateText, tone: TONE_INFO }
  }
  return null
}

/**
 * 「还要多久」的文案键:起算点与「要不要全职」都照条文说(2026-08-16 Frank 两问)——
 * 在读学生用毕业后变体,官方原文写了 full-time 才敢写「全职」
 * (NS 那条写的是 paid work,就只说「工作」)。
 *
 * @param f 这一行的判定事实。
 * @returns 文案键。
 */
export function waitKeyOf(f: PlanRowFacts): string {
  if (f.afterStudy) {
    let ft = TEXT_NONE
    if (f.fullTime) {
      ft = KEY_TIER_FULLTIME
    }
    return KEY_TIER_GRAD + ft + f.waitTier
  }
  if (f.waitAfterOffer) {
    return KEY_WAIT_TIER + f.waitTier
  }
  return KEY_PLAN_TIER + f.waitTier
}

/**
 * 一行展示行的各格成句。
 *
 * @param x 取词函数、这一条通道、名次、补充行标记、通道名与在招岗数。
 * @returns 各格成句。
 */
export function toPlanRowText(x: PlanRowTextIn): PlanRowText {
  let rank = String(x.index + 1)
  let extraLabel = TEXT_NONE
  let cardTitle = String(x.index + 1) + RANK_NUM_SEP + x.routeName
  if (x.extra) {
    rank = RANK_EXTRA_MARK
    extraLabel = x.t('dp.planJobProvRow')
    cardTitle = x.routeName
  }
  let jobs = TEXT_NONE
  let openNum = TEXT_DASH
  if (x.jobsN != null) {
    jobs = x.t(KEY_JOBS_N, { n: x.jobsN })
    openNum = jobs
  }
  const comp = toPlanCompText({ t: x.t, row: x.row })
  return {
    rank,
    extraLabel,
    comp: comp.main,
    compSub: comp.sub,
    jobs,
    cardTitle,
    openLine: x.t('dp.planOpen') + TEXT_SPACE + openNum,
    actGo: x.t('dp.actGo'),
    actEmp: x.t('dp.actEmp'),
  }
}

/**
 * 竞争格的两行字。试点行(RCIP/FCIP)无 EOI 池,原「—」换社区名额状态
 * (2026-08-16 Frank「不是有比名额竞争更准确的数据吗」);两件事都要说
 * (同日「RCIP 先到先得的列哪去了」):发放规则做主文案、官网公布的数字做灰字小注 ——
 * 先前按优先级只显一个,ON 有 153 个剩余名额就把「先到先得」顶没了,
 * 而那正是决定「要不要马上投」的那条规则。
 *
 * @param x 取词函数与这一条通道。
 * @returns 主文案与灰字小注(空串 = 那一格不出)。
 */
export function toPlanCompText(x: StateTextIn): PlanCompText {
  const comp = x.row.competition
  if (comp != null) {
    return { main: comp.ratio + RATIO_TAIL, sub: TEXT_NONE }
  }
  const q = x.row.pilotQuota
  let numText = TEXT_NONE
  if (q != null && q.remainingSum != null) {
    numText = x.t('dp.pq.remaining', { n: q.remainingSum })
  } else if (q != null && q.perIntakeSum != null) {
    numText = x.t('dp.pq.perIntake', { n: q.perIntakeSum })
  }
  const firstCome = q != null && q.firstComeN > 0
  if (firstCome === false) {
    return { main: numText, sub: TEXT_NONE }
  }
  return { main: x.t('dp.pq.firstCome'), sub: numText }
}

/**
 * 洗一行初评展示行。AIP/RCIP 拆省后 province 是省码 → 显省名;区域名走通道自己的区域标,
 * 拿不到就落联邦。区域线拆省后同 key 多行 → 行身份带省码去重。
 *
 * @param x 取词函数、界面语言、这一条通道、名次、职业竞争退路、职业码与补充行标记。
 * @returns 展示行。
 */
export function toPlanCellRow(x: PlanCellRowIn): PlanCellRow {
  const row = x.row
  const ui = uiOf(row.key)
  const provincial = PROV_CODE_RE.test(row.province)
  let province = x.t(KEY_FEDERAL)
  if (provincial) {
    province = provDispOf({ t: x.t, code: row.province })
  } else if (ui.regionLabelKey != null) {
    province = x.t(ui.regionLabelKey)
  }
  let rowKey = row.key
  if (regionProvincesOf(row.key) != null && provincial) {
    rowKey = row.key + SCORE_KEY_SEP + row.province
  }
  const routeName = routeNameFullOf({ t: x.t, lang: x.lang, key: row.key, provinceLabel: province })
  const facts = toPlanRowFacts({ t: x.t, row })
  const jobsN = jobsOfRow({ row, occComp: x.occComp })
  let ratio: number | null = null
  if (row.competition != null) {
    ratio = row.competition.ratio
  }
  return {
    rowKey,
    index: x.index,
    extra: x.extra,
    top: x.index === 0 && row.blockedBy == null && row.belowLine !== true,
    province,
    routeName,
    ratio,
    jobsN,
    text: toPlanRowText({ t: x.t, row, index: x.index, extra: x.extra, routeName, jobsN }),
    pills: { gaps: gapPillsOf({ t: x.t, f: facts }), time: timePillOf({ t: x.t, f: facts }) },
    links: { jobs: jobsHrefOf({ row, planNocs: x.planNocs }), emp: empHrefOf({ row, noc: x.noc }) },
    acts: {
      go: makeActTrack({ event: TRACK_ACT_JOBS, rowKey }),
      emp: makeActTrack({ event: TRACK_ACT_EMP, rowKey }),
    },
  }
}

/**
 * 洗整张初评展示表。排序已单源化(#307,住 lib/planRank,服务端排完下发)——
 * **这里只渲染不重排**,一处改处处同。
 * 带岗态(#325):初评按档案不按岗,但看着这份岗的人至少要看得到**岗位所在省**的最优行 ——
 * 不在前几名就补一行,标「本岗所在省」,不冒充名次。
 *
 * @param x 取词函数、界面语言、通道行、带岗那份工作、粗筛态、职业竞争退路与职业码。
 * @returns 展示行。
 */
export function toPlanCellRows(x: PlanCellRowsIn): PlanCellRow[] {
  let limit = PLAN_ROWS_FULL
  if (x.coarse) {
    limit = PLAN_ROWS_COARSE
  }
  const shownBase = x.paths.slice(0, limit)
  const extraRow = jobProvExtraOf({ paths: x.paths, tvJob: x.tvJob, shownBase })
  const shown = shownBase.slice(0)
  if (extraRow != null) {
    shown.push(extraRow)
  }
  const out: PlanCellRow[] = []
  let index = 0
  for (const row of shown) {
    out.push(toPlanCellRow({
      t: x.t,
lang: x.lang,
row,
index,
occComp: x.occComp,
      planNocs: x.planNocs,
noc: x.noc,
extra: row === extraRow,
    }))
    index += 1
  }
  return out
}

/**
 * 带岗态要补的那一行:岗位所在省的最优通道,前几名里没有它才补。
 *
 * @param x 全部通道行、带岗那份工作与已经进前几名的那几行。
 * @returns 要补的那一行;null = 不用补。
 */
export function jobProvExtraOf(x: JobProvExtraIn): ProfilePath | null {
  if (x.tvJob == null || PROV_CODE_RE.test(x.tvJob.province) === false) {
    return null
  }
  for (const r of x.shownBase) {
    if (r.province === x.tvJob.province) {
      return null
    }
  }
  for (const r of x.paths) {
    if (r.province === x.tvJob.province) {
      return r
    }
  }
  return null
}

/**
 * 榜首 0 岗(「0 不是少,是没有」);数据缺失(null)同句提示。
 *
 * @param x 全部通道行与职业竞争退路。
 * @returns 要不要出那句实话。
 */
export function topEmptyOf(x: TopEmptyIn): boolean {
  if (x.paths == null) {
    return false
  }
  const [head] = x.paths
  if (head == null) {
    return false
  }
  const n = jobsOfRow({ row: head, occComp: x.occComp })
  if (n == null) {
    return true
  }
  return n === 0
}

/**
 * 表头的灰字小注是一个节点不是一段字,而 functions.ts 不写 JSX —— 所以这里用
 * createElement 造元素,长相全在 HeadSub 里。
 *
 * @param x 主表头词与灰字小注。
 * @returns 表头节点。
 */
export function headLabelOf(x: HeadSubIn): React.ReactNode {
  return createElement(HeadSub, x)
}

/**
 * 初评表的列组。前提拆两列(2026-08-16 Frank「显示的内容也不是推荐原因啊」
 * 「可以拆成两个列吧」):还差 = 缺口;还要多久 = 时长 —— 各说各的,不再混在一格。
 * 职业档粗筛不出这两列 —— 没答条件,判定本来就出不来,摆一列「判不了」是噪音。
 *
 * @param x 取词函数与粗筛态。
 * @returns 列组。
 */
export function planColsOf(x: PlanColsIn): PlanCol<PlanCellRow>[] {
  let wPath = W_PLAN_PATH_FULL
  let wAct = W_PLAN_ACT_FULL
  if (x.coarse) {
    wPath = W_PLAN_PATH_COARSE
    wAct = W_PLAN_ACT_COARSE
  }
  const cols: PlanCol<PlanCellRow>[] = [
    { key: COL_RANK, label: COL_RANK_LABEL, width: W_PLAN_RANK, render: RankCell },
    { key: COL_PATH, label: x.t('dp.planPath'), width: wPath, render: PathCell },
    {
      key: COL_RATIO,
      label: x.t('dp.compCol'),
      width: W_PLAN_RATIO,
      align: ALIGN_RIGHT,
      sort: planRatioSortOf,
      render: PlanCompCell,
    },
    {
      key: COL_JOBS,
      label: x.t('dp.planOpen'),
      width: W_PLAN_JOBS,
      align: ALIGN_RIGHT,
      sort: planJobsSortOf,
      render: PlanJobsCell,
    },
  ]
  if (x.coarse === false) {
    cols.push({ key: COL_GAP, label: x.t('dp.planGapCol'), width: W_PLAN_GAP, align: ALIGN_RIGHT, render: PlanGapCell })
    cols.push({
      key: COL_TIME,
      label: x.t('dp.planTimeCol'),
      width: W_PLAN_TIME,
      align: ALIGN_RIGHT,
      render: PlanTimeCell,
    })
  }
  cols.push({ key: COL_ACT, label: x.t('dp.act'), width: wAct, align: ALIGN_RIGHT, render: PlanActCell })
  return cols
}

/**
 * 初评表按竞争度排序的取值器。
 *
 * @param r 这一行展示行。
 * @returns 竞争比;null 沉底。
 */
export function planRatioSortOf(r: PlanCellRow): number | null {
  return r.ratio
}

/**
 * 初评表按在招数排序的取值器。
 *
 * @param r 这一行展示行。
 * @returns 在招岗数;null 沉底。
 */
export function planJobsSortOf(r: PlanCellRow): number | null {
  return r.jobsN
}

/**
 * 初评表的行身份。
 *
 * @param r 这一行展示行。
 * @returns 行键。
 */
export function planRowKeyOf(r: PlanCellRow): string {
  return r.rowKey
}

/**
 * 数字 → 千分位成句;null 给空串(那一格由单元格渲成灰横杠 —— 我们没有这个数)。
 *
 * @param v 数;null = 官方缺位。
 * @returns 成句;空串 = 这一格没有数据。
 */
export function numTextOf(v: number | null): string {
  if (v == null) {
    return TEXT_NONE
  }
  return v.toLocaleString(LOCALE_CA)
}

/**
 * 数字 → 成句;null 给那根横杠(这一列历来把横杠当普通字渲,不出灰底)。
 *
 * @param v 数;null = 官方缺位。
 * @returns 成句。
 */
export function dashTextOf(v: number | null): string {
  if (v == null) {
    return TEXT_DASH
  }
  return String(v)
}

/**
 * 按年取某个省的存量(方案C:StatCan 季度口径)。
 *
 * @param x 这一行事实、年份与学签/工签。
 * @returns 存量;null = 官方缺位。
 */
export function yearStockOf(x: YearStockIn): number | null {
  const series = x.r.series
  if (series == null || series.stocks == null) {
    return null
  }
  const year = series.stocks[x.year]
  if (year == null) {
    return null
  }
  const v = year[x.kind]
  if (v == null) {
    return null
  }
  return v
}

/**
 * 按年取某个省的名额。
 *
 * @param x 这一行事实与年份。
 * @returns 名额;null = 官方缺位(NB/PE 那几年就没有)。
 */
export function yearQuotaOf(x: YearRowIn): number | null {
  const series = x.r.series
  if (series == null) {
    return null
  }
  if (x.year === YEAR_2024) {
    return series.quota.y2024
  }
  if (x.year === YEAR_2025) {
    return series.quota.y2025
  }
  if (x.year === YEAR_2026) {
    return series.quota.y2026
  }
  return null
}

/**
 * 按年取某个省的流量(年初至今累计,不是单月数)。
 *
 * @param x 这一行事实与年份。
 * @returns 流量;null = 官方缺位。
 */
export function yearFlowOf(x: YearRowIn): number | null {
  const series = x.r.series
  if (series == null || series.flow == null) {
    return null
  }
  const year = series.flow[x.year]
  if (year == null) {
    return null
  }
  return year.n
}

/**
 * 年份视图的竞争比:**三列同年齐才算**(存量学 + 工 ÷ 该年名额,舍入口径与 04e 一致)。
 * 缺存量或缺名额的年份一律不硬算 —— 编一个比值出来比留白危险得多。
 *
 * @param x 这一行事实与年份。
 * @returns 竞争比;null = 三列不齐。
 */
export function yearRatioOf(x: YearRowIn): number | null {
  const study = yearStockOf({ r: x.r, year: x.year, kind: STOCK_STUDY })
  const work = yearStockOf({ r: x.r, year: x.year, kind: STOCK_WORK })
  const quota = yearQuotaOf({ r: x.r, year: x.year })
  if (study == null || work == null || quota == null || quota === 0) {
    return null
  }
  return Math.round(((study + work) / quota) * RATIO_ROUND) / RATIO_ROUND
}

/**
 * 竞争手机卡第二行的明细整句。÷ 算式与「截至…累计」不逐行念(2026-08-15 Frank
 * 「计算公式不用每个卡片都算一遍」):公式、存量快照月、累计口径都在脚注写一次,
 * 行内只留带短标签的值;名额年份逐省不同留行内。
 *
 * @param x 取词函数、这一行事实与年份。
 * @returns 明细整句。
 */
export function compMetaOf(x: CompMetaIn): string {
  if (x.year !== TEXT_NONE) {
    const study = dashTextOf(yearStockOf({ r: x.r, year: x.year, kind: STOCK_STUDY }))
    const work = dashTextOf(yearStockOf({ r: x.r, year: x.year, kind: STOCK_WORK }))
    const flow = dashTextOf(yearFlowOf({ r: x.r, year: x.year }))
    return x.t('dp.compStudy') + TEXT_SPACE + study + GAP_FULL
      + x.t('dp.compWork') + TEXT_SPACE + work + GAP_FULL
      + x.t('dp.compFlow') + TEXT_SPACE + flow
  }
  let quotaYear = TEXT_NONE
  if (x.r.quotaYear !== 0) {
    quotaYear = String(x.r.quotaYear)
  }
  let flowPart = TEXT_NONE
  if (x.r.flow != null) {
    flowPart = GAP_FULL + x.t('dp.compFlow') + TEXT_SPACE + x.r.flow.n.toLocaleString(LOCALE_CA)
  }
  return x.t('dp.compPool') + TEXT_SPACE + x.r.pool.toLocaleString(LOCALE_CA) + GAP_FULL
    + x.t('dp.compQuota') + TEXT_SPACE + x.r.quota.toLocaleString(LOCALE_CA) + TEXT_SPACE + quotaYear + flowPart
}

/**
 * 洗一行竞争展示行:现行口径读库行算好的那几格,年份视图切到该年的系列
 * (官方缺位一律留空,由单元格渲成横杠)。
 *
 * @param x 取词函数、省名取名函数、这一行事实与年份。
 * @returns 展示行。
 */
export function toCompCellRow(x: CompCellRowIn): CompCellRow {
  const r = x.r
  const yearOn = x.year !== TEXT_NONE
  const study = pickYearNum({ r, year: x.year, yearOn, plain: r.poolStudy, kind: STOCK_STUDY })
  const work = pickYearNum({ r, year: x.year, yearOn, plain: r.poolWork, kind: STOCK_WORK })
  const quota = pickQuotaNum({ r, year: x.year, yearOn })
  const ratio = pickRatioNum({ r, year: x.year, yearOn })
  const flow = pickFlowNum({ r, year: x.year, yearOn })
  let quotaNote = TEXT_NONE
  if (yearOn === false && r.quotaYear !== 0) {
    quotaNote = String(r.quotaYear)
  }
  let ratioText = TEXT_NONE
  if (ratio != null) {
    ratioText = ratio + RATIO_TAIL
  }
  return {
    key: r.province,
    provName: x.provDisp(r.province),
    provCode: r.province,
    ratioMain: r.ratio + RATIO_TAIL,
    meta: compMetaOf({ t: x.t, r, year: x.year }),
    study: numTextOf(study),
    studySort: study,
    work: numTextOf(work),
    workSort: work,
    pool: numTextOf(r.pool),
    poolSort: r.pool,
    quota: numTextOf(quota),
    quotaNote,
    quotaSort: quota,
    ratio: ratioText,
    ratioSort: ratio,
    flow: numTextOf(flow),
    flowSort: flow,
  }
}

/**
 * 存量那一格取哪个数:年份视图取该年系列,现行口径取库行自带的拆分列。
 *
 * @param x 这一行事实、年份、年份视图开关、库行自带值与学签/工签。
 * @returns 数;null = 官方缺位。
 */
export function pickYearNum(x: PickYearIn): number | null {
  if (x.yearOn) {
    return yearStockOf({ r: x.r, year: x.year, kind: x.kind })
  }
  return x.plain
}

/**
 * 名额那一格取哪个数。
 *
 * @param x 这一行事实、年份与年份视图开关。
 * @returns 名额;null = 官方缺位。
 */
export function pickQuotaNum(x: PickPlainIn): number | null {
  if (x.yearOn) {
    return yearQuotaOf({ r: x.r, year: x.year })
  }
  return x.r.quota
}

/**
 * 竞争比那一格取哪个数:现行口径用 04e 算好的比值;年份视图三列同年齐才现算。
 *
 * @param x 这一行事实、年份与年份视图开关。
 * @returns 竞争比;null = 不齐或官方缺位。
 */
export function pickRatioNum(x: PickPlainIn): number | null {
  if (x.yearOn) {
    return yearRatioOf({ r: x.r, year: x.year })
  }
  return x.r.ratio
}

/**
 * 流量那一格取哪个数。存量停在过去,这是唯一反映当期的官方数字,**不参与比值**。
 *
 * @param x 这一行事实、年份与年份视图开关。
 * @returns 流量;null = 官方缺位。
 */
export function pickFlowNum(x: PickPlainIn): number | null {
  if (x.yearOn) {
    return yearFlowOf({ r: x.r, year: x.year })
  }
  if (x.r.flow == null) {
    return null
  }
  return x.r.flow.n
}

/**
 * 存量快照月随数据走(方案C:StatCan 季度口径,年末 = Y-12、进行年 = 最新季度月,
 * 不再硬拼 -12)。
 *
 * @param x 各省名额竞争行与年份。
 * @returns 快照月;null = 现行口径(那一格的月份走库行自带的 poolYear)。
 */
export function stockAsOfOf(x: StockAsOfIn): string | null {
  if (x.year === TEXT_NONE) {
    return null
  }
  for (const r of x.competition) {
    const series = r.series
    if (series != null && series.stocks != null) {
      const year = series.stocks[x.year]
      if (year != null && year.asOf != null && year.asOf !== TEXT_NONE) {
        return year.asOf
      }
    }
  }
  return x.year + STOCK_MONTH_TAIL
}

/**
 * 年份视图的流量区间(官方把它记成「年初至今累计」,所以要把区间摆到表头 ——
 * 「2026-05」裸挂会被读成单月数)。
 *
 * @param x 各省名额竞争行与年份。
 * @returns 流量区间;null = 该年没有区间。
 */
export function yearFlowPeriodOf(x: StockAsOfIn): string | null {
  if (x.year === TEXT_NONE) {
    return null
  }
  for (const r of x.competition) {
    const series = r.series
    if (series != null && series.flow != null) {
      const year = series.flow[x.year]
      if (year != null && year.period != null && year.period !== TEXT_NONE) {
        return year.period
      }
    }
  }
  return null
}

/**
 * 流量列表头的灰字小注:年份视图给该年的区间(拿不到就退回年份本身),
 * 现行口径给库行自带的区间。
 *
 * @param x 取词函数、年份、两处区间。
 * @returns 灰字小注;null = 不出小注。
 */
export function flowSubOf(x: FlowSubIn): string | null {
  if (x.year !== TEXT_NONE) {
    if (x.yearFlowPeriod != null && x.yearFlowPeriod.includes(DATE_SEP)) {
      return x.t('dp.compFlowP', { p: x.yearFlowPeriod })
    }
    return x.year
  }
  if (x.flowPeriod != null && x.flowPeriod !== TEXT_NONE) {
    return x.t('dp.compFlowP', { p: x.flowPeriod })
  }
  return null
}

/**
 * 竞争表的列组。存量快照月全表一致 → 表头灰字(写到月:与学签的月度粒度对齐,
 * 光写年份会误导粒度);名额年度**逐省不同**(ON/BC/AB/SK/MB/NS 2026、NB/NL/PE 2025)——
 * 现行视图留行内,年份视图切该年配额。
 * 旧库行还没带拆分字段 → 回退单列合计,seed 刷新后自动变两列。
 *
 * @param x 取词函数、省名取名函数、年份、拆分开关与三处口径日期。
 * @returns 列组。
 */
export function competitionColsOf(x: CompColsIn): PlanCol<CompCellRow>[] {
  const cols: PlanCol<CompCellRow>[] = [
    { key: COL_PROVINCE, label: x.t('dp.prov'), width: W_COMP_PROV, sort: compProvSortOf, render: CompProvCell },
  ]
  for (const col of poolColsOf(x)) {
    cols.push(col)
  }
  cols.push({
    key: COL_QUOTA,
    label: headLabelOf({ main: x.t('dp.compQuota'), sub: blankToNull(x.year) }),
    width: W_COMP_QUOTA,
    align: ALIGN_RIGHT,
    sort: compQuotaSortOf,
    render: QuotaCell,
  })
  cols.push({
    key: COL_RATIO,
    label: x.t('dp.compCol'),
    width: W_COMP_RATIO,
    align: ALIGN_RIGHT,
    sort: compRatioSortOf,
    render: makeBoldCell({ pick: compRatioTextOf }),
  })
  cols.push({
    key: COL_FLOW,
    label: headLabelOf({ main: x.t('dp.compFlow'), sub: flowSubOf(x) }),
    width: W_COMP_FLOW,
    align: ALIGN_RIGHT,
    sort: compFlowSortOf,
    render: makeCompCell({ pick: compFlowTextOf }),
  })
  return cols
}

/**
 * 存量那一段的列:带拆分字段就出学签/工签两列,否则退回单列合计。
 * 拆分态两列共享同一快照月,月份落脚注不逐列重复。
 *
 * @param x 同 competitionColsOf。
 * @returns 存量那一段的列。
 */
export function poolColsOf(x: CompColsIn): PlanCol<CompCellRow>[] {
  if (x.hasSplit === false) {
    return [{
      key: COL_POOL,
      label: headLabelOf({ main: x.t('dp.compPool'), sub: x.poolAsOf }),
      width: W_COMP_POOL,
      align: ALIGN_RIGHT,
      sort: compPoolSortOf,
      render: makeCompCell({ pick: compPoolTextOf }),
    }]
  }
  return [
    {
      key: COL_POOL_STUDY,
      label: headLabelOf({ main: x.t('dp.compStudy'), sub: x.stockAsOf }),
      width: W_COMP_STUDY,
      align: ALIGN_RIGHT,
      sort: compStudySortOf,
      render: makeCompCell({ pick: compStudyTextOf }),
    },
    {
      key: COL_POOL_WORK,
      label: headLabelOf({ main: x.t('dp.compWork'), sub: x.stockAsOf }),
      width: W_COMP_WORK,
      align: ALIGN_RIGHT,
      sort: compWorkSortOf,
      render: makeCompCell({ pick: compWorkTextOf }),
    },
  ]
}

/**
 * 空串换 null(表头小注的口径:空串是「有这一格但没内容」,null 才是「这一格不出」)。
 *
 * @param v 一段字。
 * @returns 原样;空串给 null。
 */
export function blankToNull(v: string): string | null {
  if (v === TEXT_NONE) {
    return null
  }
  return v
}

/**
 * 竞争表按省名排序的取值器(按显示名排,不按省码)。
 *
 * @param r 这一行展示行。
 * @returns 省全名。
 */
export function compProvSortOf(r: CompCellRow): string {
  return r.provName
}

/**
 * 竞争表学签存量列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句;空串 = 官方缺位。
 */
export function compStudyTextOf(r: CompCellRow): string {
  return r.study
}

/**
 * 竞争表学签存量列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 存量;null 沉底。
 */
export function compStudySortOf(r: CompCellRow): number | null {
  return r.studySort
}

/**
 * 竞争表工签存量列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句;空串 = 官方缺位。
 */
export function compWorkTextOf(r: CompCellRow): string {
  return r.work
}

/**
 * 竞争表工签存量列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 存量;null 沉底。
 */
export function compWorkSortOf(r: CompCellRow): number | null {
  return r.workSort
}

/**
 * 竞争表存量合计列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句。
 */
export function compPoolTextOf(r: CompCellRow): string {
  return r.pool
}

/**
 * 竞争表存量合计列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 存量合计。
 */
export function compPoolSortOf(r: CompCellRow): number | null {
  return r.poolSort
}

/**
 * 竞争表名额列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 名额;null 沉底。
 */
export function compQuotaSortOf(r: CompCellRow): number | null {
  return r.quotaSort
}

/**
 * 竞争表竞争比列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句;空串 = 三列不齐,不硬算。
 */
export function compRatioTextOf(r: CompCellRow): string {
  return r.ratio
}

/**
 * 竞争表竞争比列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 竞争比;null 沉底。
 */
export function compRatioSortOf(r: CompCellRow): number | null {
  return r.ratioSort
}

/**
 * 竞争表流量列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句;空串 = 官方缺位。
 */
export function compFlowTextOf(r: CompCellRow): string {
  return r.flow
}

/**
 * 竞争表流量列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 流量;null 沉底。
 */
export function compFlowSortOf(r: CompCellRow): number | null {
  return r.flowSort
}

/**
 * 竞争表与职业竞争表共用的行身份。
 *
 * @param r 这一行展示行。
 * @returns 行键(两位省码)。
 */
export function provRowKeyOf(r: KeyedRow): string {
  return r.key
}

/**
 * 洗一行职业竞争展示行。🔴 职业级的「几人抢一个」**没有任何官方源发布**,本站不编 ——
 * 这里摆三个实数:在招岗数、近 30 天新增、平均在招天数(挂多久被撤:越短越抢手)。
 * 四列不合成分数:合成就是替用户拿主意,而且没有官方口径支持那种合成。
 *
 * @param x 取词函数、省名取名函数与这一行事实。
 * @returns 展示行。
 */
export function toOccCellRow(x: OccCellRowIn): OccCellRow {
  const r = x.r
  return {
    key: r.province,
    provName: x.provDisp(r.province),
    provCode: r.province,
    provSort: x.provDisp(r.province),
    open: r.openJobs.toLocaleString(LOCALE_CA),
    openSort: r.openJobs,
    openMain: String(r.openJobs),
    new30: dashTextOf(r.new30d),
    new30Sort: r.new30d,
    days: dashTextOf(r.avgDaysOpen),
    daysSort: r.avgDaysOpen,
    meta: x.t('dp.occNew30') + TEXT_SPACE + dashTextOf(r.new30d) + GAP_FULL
      + x.t('dp.occDays') + TEXT_SPACE + dashTextOf(r.avgDaysOpen),
  }
}

/**
 * 职业竞争表按省名排序的取值器。
 *
 * @param r 这一行展示行。
 * @returns 省全名。
 */
export function occProvSortOf(r: OccCellRow): string {
  return r.provSort
}

/**
 * 职业竞争表在招列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句。
 */
export function occOpenTextOf(r: OccCellRow): string {
  return r.open
}

/**
 * 职业竞争表在招列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 在招岗数。
 */
export function occOpenSortOf(r: OccCellRow): number {
  return r.openSort
}

/**
 * 职业竞争表近 30 天新增列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句(官方缺位就是那根横杠)。
 */
export function occNew30TextOf(r: OccCellRow): string {
  return r.new30
}

/**
 * 职业竞争表近 30 天新增列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 新增数;null 沉底。
 */
export function occNew30SortOf(r: OccCellRow): number | null {
  return r.new30Sort
}

/**
 * 职业竞争表平均在招天数列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句(官方缺位就是那根横杠)。
 */
export function occDaysTextOf(r: OccCellRow): string {
  return r.days
}

/**
 * 职业竞争表平均在招天数列的排序取值器。
 *
 * @param r 这一行展示行。
 * @returns 天数;null 沉底。
 */
export function occDaysSortOf(r: OccCellRow): number | null {
  return r.daysSort
}

/**
 * 职业竞争表的列组(竞争比不在这里第三处重复 —— 初评与竞争卡已各有一份)。
 *
 * @param x 取词函数。
 * @returns 列组。
 */
export function occCompColsOf(x: OccColsIn): PlanCol<OccCellRow>[] {
  return [
    { key: COL_PROVINCE, label: x.t('dp.prov'), width: W_OCC_PROV, sort: occProvSortOf, render: CompProvCell },
    {
      key: COL_OPEN,
      label: x.t('stats.openJobs'),
      width: W_OCC_OPEN,
      align: ALIGN_RIGHT,
      sort: occOpenSortOf,
      render: makeBoldCell({ pick: occOpenTextOf }),
    },
    {
      key: COL_NEW30,
      label: x.t('dp.occNew30'),
      width: W_OCC_NEW30,
      align: ALIGN_RIGHT,
      sort: occNew30SortOf,
      render: occNew30TextOf,
    },
    {
      key: COL_DAYS,
      label: x.t('dp.occDays'),
      width: W_OCC_DAYS,
      align: ALIGN_RIGHT,
      sort: occDaysSortOf,
      render: occDaysTextOf,
    },
  ]
}

/**
 * 洗一行抽选展示行。这张表的入选条件是「有分数线**或**有邀请数」—— 只摆分数线的话,
 * 靠邀请数入选的行(NL/MB/NB)整行都是「—」,把它入选的那个事实藏了。
 *
 * @param x 取词函数、省名取名函数与这一行事实。
 * @returns 展示行。
 */
export function toDrawCellRow(x: DrawCellRowIn): DrawCellRow {
  const r = x.r
  return {
    key: r.province,
    provName: x.provDisp(r.province),
    provCode: r.province,
    date: r.drawDate,
    stream: streamDisplay({ t: x.t, label: r.stream }),
    inv: dashTextOf(r.invitations),
    invSort: r.invitations,
    score: dashTextOf(r.score),
    scoreSort: r.score,
    invLabel: x.t('rpt.s.d.inv'),
  }
}

/**
 * 抽选表按省名排序的取值器。
 *
 * @param r 这一行展示行。
 * @returns 省全名。
 */
export function drawProvSortOf(r: DrawCellRow): string {
  return r.provName
}

/**
 * 抽选表按日期排序的取值器。
 *
 * @param r 这一行展示行。
 * @returns 抽选日期。
 */
export function drawDateSortOf(r: DrawCellRow): string {
  return r.date
}

/**
 * 抽选表按邀请数排序的取值器。
 *
 * @param r 这一行展示行。
 * @returns 邀请数;null 沉底。
 */
export function drawInvSortOf(r: DrawCellRow): number | null {
  return r.invSort
}

/**
 * 抽选表按分数线排序的取值器。
 *
 * @param r 这一行展示行。
 * @returns 分数线;null 沉底。
 */
export function drawScoreSortOf(r: DrawCellRow): number | null {
  return r.scoreSort
}

/**
 * 抽选表分数线列的取字器。
 *
 * @param r 这一行展示行。
 * @returns 成句(官方缺位就是那根横杠)。
 */
export function drawScoreTextOf(r: DrawCellRow): string {
  return r.score
}

/**
 * 抽选表的列组。2026-08-11(Frank「都改成一套」)自造裸 table 换成公共 Table;
 * 列宽照旧写死,省名可截断而灰码永不截的处理留在单元格里。
 * 走查 #297:官方通道名不许截断 —— 英文界面拿到的就是官方原名,我们**没有权力**
 * 给它编个短名,放不下就换行。
 *
 * @param x 取词函数。
 * @returns 列组。
 */
export function drawColsOf(x: DrawColsIn): PlanCol<DrawCellRow>[] {
  return [
    { key: COL_DRAW_PROV, label: x.t('dp.prov'), width: W_DRAW_PROV, sort: drawProvSortOf, render: DrawProvCell },
    {
      key: COL_DRAW_DATE,
      label: x.t('rpt.s.d.date'),
      width: W_DRAW_DATE,
      nowrap: true,
      sort: drawDateSortOf,
      render: DrawDateCell,
    },
    { key: COL_DRAW_STREAM, label: x.t('rpt.s.d.stream'), width: W_DRAW_STREAM, render: DrawStreamCell },
    {
      key: COL_DRAW_INV,
      label: x.t('rpt.s.d.inv'),
      width: W_DRAW_INV,
      align: ALIGN_RIGHT,
      nowrap: true,
      sort: drawInvSortOf,
      render: DrawInvCell,
    },
    {
      key: COL_DRAW_SCORE,
      label: x.t('rpt.s.d.score'),
      width: W_DRAW_SCORE,
      align: ALIGN_RIGHT,
      sort: drawScoreSortOf,
      render: drawScoreTextOf,
    },
  ]
}

/**
 * 基础卷学历档 → 分值卡口径。常量表只装 JSON 装得下的东西(no-import-in-leaf),
 * 所以窄化收在这一处:EDU_OF 的值域就是 PlanEduBand 那五个字面量。
 *
 * @param band 基础卷的学历档。
 * @returns 分值卡口径的学历;null = 没答。
 */
export function eduBandOf(band: number): PlanEduBand | null {
  const v = EDU_OF[band]
  if (v == null) {
    return null
  }
  return v as PlanEduBand
}

/**
 * 目标 TEER:带岗态取岗位的,否则从 5 位职业码的第 2 位读。
 *
 * @param x 带岗那份工作与当前职业码。
 * @returns TEER;null = 未分类的岗、也推不出来。
 */
export function targetTeerOf(x: EmpHrefIn2): number | null {
  if (x.tvJob != null && x.tvJob.teer != null) {
    return x.tvJob.teer
  }
  if (NOC_CODE_RE.test(x.noc)) {
    return Number(x.noc.charAt(TEER_POS))
  }
  return null
}

/**
 * 这批官方表有没有把经验拆成「近 5 年 / 6-10 年」。SK 那类拆段的省要让用户自己答 ——
 * 总经验推不出分段,不能猜最近几年。
 *
 * @param factors 当前页签省的官方因素行。
 * @returns 拆没拆。
 */
export function hasSplitWorkOf(factors: PlanScoreFactor[]): boolean {
  for (const f of factors) {
    if (f.factor === FACTOR_WORK5 || f.factor === FACTOR_WORK610) {
      return true
    }
  }
  return false
}

/**
 * 分值卡的选项范围。语言与总经验在基础卷都已问**精确档**(2026-08-13/14 合一)——
 * 范围恒为单值,分值卡对应的追问题整题不再出;总经验「不清楚」落空数组 = 不限,
 * 分值段照问。SK 按「近 5 年 / 6-10 年」拆段的省仍要拆段追问:那不是重复,是官方口径不同,
 * 但仍受总经验封顶。
 *
 * @param x 答案档与拆段开关。
 * @returns 选项范围。
 */
export function scoreLimitsOf(x: ScoreLimitsIn): ScoreLimits {
  const clbRange = rangeAt({ table: CLB_RANGE, band: x.bands.clbBand })
  const totalRange = rangeAt({ table: TOTAL_EXP_RANGE, band: x.bands.totalExpBand })
  const out: ScoreLimits = {}
  if (clbRange.length > 0) {
    out.clb1 = clbRange
  }
  const recent = recentRangeOf({ totalRange, hasSplitWork: x.hasSplitWork })
  if (recent.length > 0) {
    out.expRecent = recent
  }
  const cap = splitCapOf(totalRange)
  if (x.hasSplitWork && cap.length > 0) {
    out.expOlder = cap
  }
  return out
}

/**
 * 档 → 值域(档超出表就是不限)。
 *
 * @param x 值域表与档。
 * @returns 值域;空数组 = 不限。
 */
export function rangeAt(x: RangeAtIn): number[] {
  const hit = x.table[x.band]
  if (hit == null) {
    return []
  }
  return hit
}

/**
 * 近段经验的可选值域:拆段省用总经验封顶后的全集,不拆段的直接用总经验的值域。
 *
 * @param x 总经验值域与拆段开关。
 * @returns 值域。
 */
export function recentRangeOf(x: RecentRangeIn): number[] {
  if (x.hasSplitWork) {
    return splitCapOf(x.totalRange)
  }
  return x.totalRange
}

/**
 * 拆段追问的可选年数:仍受总经验上界封顶(总经验没答就不限)。
 *
 * @param totalRange 总经验值域。
 * @returns 可选年数。
 */
export function splitCapOf(totalRange: number[]): number[] {
  if (totalRange.length === 0) {
    return []
  }
  let cap = 0
  const last = totalRange[totalRange.length - 1]
  if (last != null) {
    cap = last
  }
  const out: number[] = []
  for (const n of SPLIT_YEARS) {
    if (n <= cap) {
      out.push(n)
    }
  }
  return out
}

/**
 * 分值卡的答案预填:同一个条件不问两遍。学历/年龄 2026-08-16 收回基础卷,值由这里
 * 带进分值卡;第二语言分档由法语题提供(官方 language2 的档位按同数值可比);
 * BC/MB 的 work 是总经验可直接复用,SK 按时间段拆分必须让用户另答,不能猜最近几年。
 *
 * @param x 答案档与拆段开关。
 * @returns 预填值。
 */
export function scoreInitialOf(x: ScoreInitialIn): Partial<PlanSelfProfile> {
  const clbRange = rangeAt({ table: CLB_RANGE, band: x.bands.clbBand })
  const totalRange = rangeAt({ table: TOTAL_EXP_RANGE, band: x.bands.totalExpBand })
  let recent = firstOf(totalRange)
  if (x.hasSplitWork) {
    recent = 0
  }
  const out: Partial<PlanSelfProfile> = { clb1: firstOf(clbRange), expRecent: recent, expOlder: 0 }
  const edu = eduBandOf(x.bands.eduBand)
  if (edu != null) {
    out.edu = edu
  }
  const age = AGE_OF[x.bands.ageBand]
  if (age != null) {
    out.age = age
  }
  if (frenchAnsweredOf(x.bands.frenchBand)) {
    out.clb2 = nclcOf(x.bands.frenchBand)
  }
  return out
}

/**
 * 值域的下界(空值域按 0 —— 那一档本来就是「没有成绩 / 没有年数」)。
 *
 * @param range 值域。
 * @returns 下界。
 */
export function firstOf(range: number[]): number {
  const [head] = range
  if (head == null) {
    return 0
  }
  return head
}

/**
 * 法语那道题答没答出一个能用的档(0 = 没答,「不清楚」= 不限,两者都不带进分值卡)。
 *
 * @param band 法语档。
 * @returns 答没答。
 */
export function frenchAnsweredOf(band: number): boolean {
  return band !== 0 && band !== BAND_UNKNOWN
}

/**
 * 法语档 → 第二语言 CLB(NCLC 与 CLB 按同数值可比)。
 *
 * @param band 法语档。
 * @returns CLB 值;表里没有就按 0。
 */
export function nclcOf(band: number): number {
  const v = NCLC[band]
  if (v == null) {
    return 0
  }
  return v
}

/**
 * 分值段不再问的那几项:答过的题重复出现,人会以为自己答错了(而且两处答案会打架)。
 * 不拆「近 5 年 / 6-10 年」的表隐藏第二段经验,并把第一格当总经验使用。
 *
 * @param x 答案档与拆段开关。
 * @returns 要藏起来的题。
 */
export function hiddenScoreInputsOf(x: ScoreInitialIn): (keyof PlanSelfProfile)[] {
  const out: (keyof PlanSelfProfile)[] = []
  if (x.hasSplitWork === false) {
    out.push(KEY_INPUT_EXP_OLDER)
  }
  if (x.bands.eduBand !== 0) {
    out.push(KEY_INPUT_EDU)
  }
  if (x.bands.ageBand !== 0) {
    out.push(KEY_INPUT_AGE)
  }
  if (frenchAnsweredOf(x.bands.frenchBand)) {
    out.push(KEY_INPUT_CLB2)
  }
  return out
}

/**
 * 基础卷的 offer 答案 → 分值卡语境:有 = true;面试中 / 没有 / 自雇 = false(都还没有 offer);
 * 不清楚 / 没答 = 这一格不给(缺席 = 分值段照问)。2026-08-14 offer 合一:答过就不再问第二遍。
 *
 * @param band 基础卷的 offer 档。
 * @returns 有没有 offer;null = 这一格不给。
 */
export function ctxHasOfferOf(band: number): boolean | null {
  if (band === OFFER_HAS) {
    return true
  }
  if (OFFER_NONE_BANDS.includes(band)) {
    return false
  }
  return null
}

/**
 * 分值卡的岗位语境。
 *
 * @param x 答案档、带岗那份工作、当前职业码与这一批题算的省。
 * @returns 岗位语境。
 */
export function scoreCtxOf(x: ScoreCtxIn): ScoreContext {
  let noc = x.noc
  let city = TEXT_NONE
  if (x.tvJob != null) {
    city = x.tvJob.city
    if (x.tvJob.noc !== TEXT_NONE) {
      noc = x.tvJob.noc
    }
  }
  const ctx: ScoreContext = {
    noc,
    teer: targetTeerOf({ tvJob: x.tvJob, noc: x.noc }),
    province: x.province,
    city,
  }
  const hasOffer = ctxHasOfferOf(x.bands.offerBand)
  if (hasOffer != null) {
    ctx.hasOffer = hasOffer
  }
  return ctx
}

/**
 * 分值卡的重挂键。键一变 = React 重挂 = 答案清零,所以只放真该重来的那几格:
 * 换了岗、换了省、换了语言/经验/offer 档,或者官方表本身换了版。
 *
 * @param x 带岗那份工作、有表的省、答案档与当前页签省的官方因素行。
 * @returns 重挂键。
 */
export function scoreKeyOf(x: ScoreKeyIn): string {
  let head = SCORE_KEY_PROFILE
  if (x.tvJob != null) {
    head = String(x.tvJob.id)
  }
  const guides: string[] = []
  for (const f of x.factors) {
    guides.push(f.guideEffective)
  }
  const parts = [
    head,
    x.provinces.join(PROV_KEY_SEP),
    String(x.bands.clbBand),
    String(x.bands.totalExpBand),
    String(x.bands.offerBand),
    guides.join(GUIDE_SEP),
  ]
  return parts.join(SCORE_KEY_SEP)
}

/**
 * 分值卡的四样入参一次备齐。
 *
 * @param x 答案档、带岗那份工作、当前职业码与省语境。
 * @returns 四样入参。
 */
export function scoreCardViewOf(x: ScoreCardViewIn): ScoreCardView {
  const hasSplitWork = hasSplitWorkOf(x.prov.targetFactors)
  const contextProvince = contextProvinceOf(x)
  return {
    key: scoreKeyOf({ tvJob: x.tvJob, provinces: x.prov.scored, bands: x.bands, factors: x.prov.targetFactors }),
    ctx: scoreCtxOf({ bands: x.bands, tvJob: x.tvJob, noc: x.noc, province: contextProvince }),
    contextProvince,
    initial: scoreInitialOf({ bands: x.bands, hasSplitWork }),
    limits: scoreLimitsOf({ bands: x.bands, hasSplitWork }),
    hidden: hiddenScoreInputsOf({ bands: x.bands, hasSplitWork }),
  }
}

/**
 * 这一批题算的是哪个省:带岗态用岗位省,否则用第一个有表的省,再退回第一个所选省。
 *
 * @param x 同 scoreCardViewOf。
 * @returns 省码;'' = 一个省都没有。
 */
export function contextProvinceOf(x: ScoreCardViewIn): string {
  if (x.tvJob != null && x.tvJob.province !== TEXT_NONE) {
    return x.tvJob.province
  }
  const [scored] = x.prov.scored
  if (scored != null) {
    return scored
  }
  const [selected] = x.prov.selected
  if (selected != null) {
    return selected
  }
  return TEXT_NONE
}

/**
 * 只把**用户真答过**的那几样交出去(2026-08-16 实撞:时薪与地区在卡里还写着「待填写」,
 * 服务端却按默认值 $0/大温 算出了 45 分 —— 默认值当答案就是替他编分,CLAUDE.md 红线)。
 * 分值卡自己有 extraAnswered 标记谁答过,这里照它过滤。
 *
 * @param a 分值卡的 localStorage 存档。
 * @returns 能上行的那几样。
 */
export function pickAnsweredOf(a: PlanScoreStore): ScoreRowsAnswer {
  const out: ScoreRowsAnswer = { rowAnswers: a.rowAnswers }
  if (a.extraAnswered[TICK_WAGE] === true) {
    out.wage = a.wage
  }
  if (a.extraAnswered[TICK_AREA] === true) {
    out.areaI = a.areaI
  }
  return out
}

/**
 * 初评的重算边界。bands 对象每次写答案都会换引用,不能直接作依赖 —— 这里刻意收窄成
 * 引擎真正消费的那几格:少一格就是「答了初评也不动」(2026-08-15 学历持久化、
 * 08-15 拆闸两题与专业对口两题、08-16 加分项各栽过一次)。
 *
 * @param x 答案档、加分项勾选与直选档位。
 * @returns 重算边界键。
 */
export function pathInputKeyOf(x: PathInputKeyIn): string {
  const b = x.bands
  const ticks: string[] = []
  for (const k of Object.keys(x.ticks)) {
    if (x.ticks[k] === true) {
      ticks.push(k)
    }
  }
  ticks.sort()
  return JSON.stringify([
    b.nocs, b.status, b.clbBand, b.totalExpBand, b.expBand, b.provs,
    b.eduBand, b.ageBand, b.offerBand, b.canadaEduBand,
    b.permitBand, b.resProv,
    b.fieldMatchBand, b.eduProv,
    ticks.join(GUIDE_SEP), JSON.stringify([x.rowsAns.rowAnswers, x.rowsAns.wage, x.rowsAns.areaI]),
  ])
}

/**
 * 基础卷的题名清单(按题级显隐过滤;答处境题时清单会当场增减)。
 *
 * @param bands 答案档。
 * @returns 题名清单。
 */
export function stepNamesOf(bands: PlanAnswers): string[] {
  return fieldsOf(DECISION_PR, STAGE_BASIC, 0, bands)
}

/**
 * 基础卷答满了没有(职业 + 全部基础题;目标省另算)。
 *
 * @param bands 答案档。
 * @returns 答满没有。
 */
export function baseDoneOf(bands: PlanAnswers): boolean {
  return missingFields(stepNamesOf(bands), bands).length === 0
}

/**
 * 条件格与职业语境。
 *
 * @param x 取词函数、界面语言、答案档、职业名表、估分题回显与带岗那份工作。
 * @returns 条件格与职业语境。
 */
export function condViewOf(x: CondViewIn): CondView {
  const summary = summaryRowsOf({
    t: x.t, lang: x.lang, bands: x.bands, titles: x.titles, tvJob: x.tvJob, echo: x.echo,
  })
  const groups = groupsOf(x.t)
  const order = groupOrderOf(groups)
  const planNocs: string[] = []
  for (const code of x.bands.nocs) {
    if (NOC_CODE_RE.test(code)) {
      planNocs.push(code)
    }
  }
  const provMismatch = provMismatchOf({ tvJob: x.tvJob, bands: x.bands })
  return {
    summaryRows: summary,
    basicRows: basicSummaryRowsOf({ rows: summary, echo: x.echo, order }),
    scoreRows: scoreSummaryRowsOf({ rows: summary, echo: x.echo }),
    planNocs,
    occMismatch: occMismatchOf({ tvJob: x.tvJob, bands: x.bands }),
    needJobProv: provMismatch || provAnsweredOf(x.bands) === false,
  }
}

/**
 * 省与分值表语境。用户在问卷里直接多选具体省份;带岗态只看岗位省。
 * 页签 = 用户选的每一个省(2026-08-16 Frank「这个缺省份」):没分值表的省照样给页签,
 * 点进去如实说明是「官方不打分」还是「本站未收录」—— 选了却不见,看着像我们漏了。
 * 线优先用懒取的全量(答满题后有),没有就用 SSR 那份近 6 轮 —— 两者形状同源,前端不区分。
 *
 * @param x 答案档、分值表、当前页签省、带岗那份工作与 SSR 那份近 6 轮抽选。
 * @returns 省与分值表语境。
 */
export function provViewOf(x: ProvViewIn): ProvView {
  let selected = x.bands.provs
  if (x.tvJob != null && x.tvJob.province !== TEXT_NONE) {
    selected = [x.tvJob.province]
  }
  let factorProvinces: string[] = []
  let factors: PlanScoreFactor[] = []
  let scoreDraws: PlanDraw[] = []
  if (x.tables != null) {
    factorProvinces = x.tables.factorProvinces
    factors = x.tables.factors
    scoreDraws = x.tables.draws
  }
  const scored: string[] = []
  const rest: string[] = []
  for (const p of selected) {
    if (factorProvinces.includes(p)) {
      scored.push(p)
    } else {
      rest.push(p)
    }
  }
  const active = activeProvOf({ scored, prov: x.activeProv })
  const targetFactors: PlanScoreFactor[] = []
  for (const f of factors) {
    if (f.province === active) {
      targetFactors.push(f)
    }
  }
  let lineDraws = x.drawsRecent
  if (scoreDraws.length > 0) {
    lineDraws = scoreDraws
  }
  return {
    selected,
    scored,
    factorProvinces,
    targetFactors,
    allFactors: factors,
    scoreDraws,
    lineDraws,
    lineProvinces: scored.concat(rest),
    provKey: selected.join(PROV_KEY_SEP),
  }
}

/**
 * 估分卡当前算哪个省的题:页签省还在有表的省里就用它,否则退回第一个有表的省。
 * 2026-08-16 Frank「后面三个弹框为什么是曼尼托巴的问题」:分值卡先前按**所有**有表的省
 * 出题,于是在 BC 页签点「算分」,答完 BC 接着弹 AB/MB。估分卡已经有省页签,题就该跟着它走。
 *
 * @param x 有表的省与当前页签省。
 * @returns 省码;'' = 一个有表的省都没有。
 */
export function activeProvOf(x: ActiveProvIn): string {
  if (x.scored.includes(x.prov)) {
    return x.prov
  }
  const [head] = x.scored
  if (head == null) {
    return TEXT_NONE
  }
  return head
}

/**
 * 初评表的派生视图。
 *
 * @param x 取词函数、界面语言、通道行、带岗那份工作、门控、职业竞争退路与职业码。
 * @returns 初评表的派生视图。
 */
export function planBoardViewOf(x: PlanBoardViewIn): PlanBoardView {
  const coarse = x.quizComplete === false
  let rows: PlanCellRow[] | null = null
  if (x.paths != null) {
    rows = toPlanCellRows({
      t: x.t,
lang: x.lang,
paths: x.paths,
tvJob: x.tvJob,
coarse,
      occComp: x.occComp,
planNocs: x.planNocs,
noc: x.noc,
    })
  }
  return { coarse, rows, topEmpty: topEmptyOf({ paths: x.paths, occComp: x.occComp }) }
}

/**
 * 各省名额竞争表的派生视图。同列同口径的日期不逐行重复(2026-08-14 Frank「年份月份要拆出来吧」):
 * 存量快照月与学签最新月全表一致 → 挪进表头灰字;名额年度逐省不同 → 必须留在行内;
 * 「本站更新」整列同一天 → 撤列并进脚注。
 *
 * @param x 取词函数、省名取名函数、竞争行与年份。
 * @returns 竞争表的派生视图。
 */
export function compViewOf(x: CompViewIn): CompView {
  const rows: CompCellRow[] = []
  let hasSplit = false
  for (const r of x.competition) {
    rows.push(toCompCellRow({ t: x.t, provDisp: x.provDisp, r, year: x.year }))
    if (r.poolStudy != null && r.poolWork != null) {
      hasSplit = true
    }
  }
  return {
    rows,
    hasSplit,
    stockAsOf: stockAsOfOf({ competition: x.competition, year: x.year }),
    poolAsOf: firstPoolYearOf(x.competition),
    flowPeriod: firstFlowPeriodOf(x.competition),
    yearFlowPeriod: yearFlowPeriodOf({ competition: x.competition, year: x.year }),
    generated: firstGeneratedOf(x.competition),
  }
}

/**
 * 现行口径的存量快照月(全表一致,取第一个有值的)。
 *
 * @param competition 竞争行。
 * @returns 快照月;null = 一行都没写。
 */
export function firstPoolYearOf(competition: PlanCompetition[]): string | null {
  for (const r of competition) {
    if (r.poolYear !== TEXT_NONE) {
      return r.poolYear
    }
  }
  return null
}

/**
 * 现行口径的流量区间(全表一致,取第一个有值的)。
 *
 * @param competition 竞争行。
 * @returns 流量区间;null = 一行都没写。
 */
export function firstFlowPeriodOf(competition: PlanCompetition[]): string | null {
  for (const r of competition) {
    if (r.flow != null) {
      return r.flow.period
    }
  }
  return null
}

/**
 * 本站这批数据的生成日(整列同一天,撤列并进脚注)。
 *
 * @param competition 竞争行。
 * @returns 生成日;一行都没有就给空串。
 */
export function firstGeneratedOf(competition: PlanCompetition[]): string {
  const [head] = competition
  if (head == null) {
    return TEXT_NONE
  }
  return head.generated
}

/**
 * 该职业分省竞争表的派生视图。
 *
 * @param x 取词函数、省名取名函数与分省竞争行。
 * @returns 职业竞争表的派生视图。
 */
export function occViewOf(x: OccViewIn): OccView {
  const rows: OccCellRow[] = []
  if (x.occComp != null) {
    for (const r of x.occComp) {
      rows.push(toOccCellRow({ t: x.t, provDisp: x.provDisp, r }))
    }
  }
  return { rows }
}

/**
 * 各省最近抽选表的派生视图。
 *
 * @param x 取词函数、省名取名函数与抽选行。
 * @returns 抽选表的派生视图。
 */
export function drawViewOf(x: DrawViewIn): DrawView {
  const rows: DrawCellRow[] = []
  for (const r of x.overview) {
    rows.push(toDrawCellRow({ t: x.t, provDisp: x.provDisp, r }))
  }
  return { rows }
}

/**
 * 各块的派生视图一次算完。
 *
 * @param x 各分机器与 SSR 直出的三份事实。
 * @returns 派生视图。
 */
export function planViewOf(x: PlanViewIn): PlanView {
  const provDisp = makeProvDisp({ t: x.t })
  const cond = condViewOf({
    t: x.t, lang: x.lang, bands: x.answers.bands, titles: x.titles.titles, echo: x.score.echo, tvJob: x.tvJob,
  })
  const prov = provViewOf({
    bands: x.answers.bands,
tables: x.score.tables,
activeProv: x.score.prov,
    tvJob: x.tvJob,
drawsRecent: x.drawsRecent,
  })
  return {
    cond,
    prov,
    plan: planBoardViewOf({
      t: x.t,
lang: x.lang,
paths: x.paths.paths,
tvJob: x.tvJob,
quizComplete: x.progress.quizComplete,
      occComp: x.occComp.rows,
planNocs: cond.planNocs,
noc: x.answers.noc,
    }),
    comp: compViewOf({ t: x.t, provDisp, competition: x.competition, year: x.compYear.year }),
    occ: occViewOf({ t: x.t, provDisp, occComp: x.occComp.rows }),
    draws: drawViewOf({ t: x.t, provDisp, overview: x.overview }),
    scoreCard: scoreCardViewOf({ bands: x.answers.bands, tvJob: x.tvJob, noc: x.answers.noc, prov }),
  }
}

/**
 * 落档失败的静默出口:匿名或网络失败时答案仍在 localStorage,页面不拦。
 *
 * @returns 无。
 */
export function ignoreFailure(): void {
  return undefined
}

/**
 * 关整个问卷弹框(基础段与估分段共用一个框,2026-08-13 Frank:「开始估分不应该和申请人条件
 * 合并到一起吗?为什么单独一个弹框」)。
 *
 * @param x 问卷动线。
 * @returns 手柄。
 */
export function makeCloseQuiz(x: FlowIn): ClickFn {
  return function closeQuiz(): void {
    x.flow.setOpen(false)
    x.flow.setScoreStep(false)
  }
}

/**
 * **唯一入口按钮**(2026-08-13 Frank:「只要一个修改按钮继续行了吧」):不带 key 时落在
 * 第一道没答的题 —— 基础段有空题按旧口径落基础段;全答满 = 从头复查。
 * 带 key = 点了哪个条件格就直达那道题(2026-08-13 Frank 实拍「点哪个框都弹学历」——
 * 之前 17 个格子全走同一个落点)。
 * 2026-08-16 Frank「我点击 继续作答 为什么会弹出来 曼尼托巴的问题」:这里原先有条近道 ——
 * 基础卷答满且估分有欠账就直接跳估分段。那是「唯一入口按钮」时代(08-13)的设计,
 * 两张卡拆开之后它就错位了:申请人条件卡的按钮只管基础卷,估分段有它自己的「算分」。
 *
 * @param x 答案态、问卷动线、估分段与两段计数。
 * @returns 手柄。
 */
export function makeStartQuiz(x: StartQuizIn): EditFn {
  return function startQuiz(key?: string): void {
    track(TRACK_QUIZ_EDIT)
    x.flow.setAtEnd(false)
    if (key != null && key.includes(SCORE_KEY_SEP)) {
      openScoreFocus({ flow: x.flow, score: x.score, key })
      return
    }
    if (key === KEY_TILE_OCC || key === KEY_TILE_PROV) {
      openPickerStep({ flow: x.flow, answers: x.answers, key })
      return
    }
    if (key != null && key !== TEXT_NONE) {
      x.flow.setFocus(key)
      setStep({ flow: x.flow, answers: x.answers, occ: false, prov: false, score: false })
      return
    }
    x.flow.setFocus(TEXT_NONE)
    resumeStep(x)
  }
}

/**
 * 点了分值题的条件格:先把段落切到那道题所在的省,再定位。
 * 2026-08-16 Frank「为什么点哪个弹框都弹出第一个问题」:分值卡如今只出**当前页签省**的题,
 * 点的若是别省的格子,那道题根本不在题单里 → 落空 → 停在第一题。
 *
 * @param x 问卷动线、估分段与分值题 key。
 * @returns 无。
 */
export function openScoreFocus(x: ScoreFocusIn): void {
  const [head] = x.key.split(SCORE_KEY_SEP)
  if (head != null && PROV_CODE_RE.test(head)) {
    x.score.setProv(head)
  }
  x.flow.setFocus(TEXT_NONE)
  x.score.bumpFocus(x.key)
  x.flow.setOpen(true)
  x.flow.setScoreStep(true)
}

/**
 * 点了职业格或目标省格:开那一页专属挑选器。
 *
 * @param x 问卷动线、答案态与条件格 key。
 * @returns 无。
 */
export function openPickerStep(x: PickerStepIn): void {
  x.flow.setFocus(TEXT_NONE)
  setStep({
    flow: x.flow,
    answers: x.answers,
    occ: x.key === KEY_TILE_OCC,
    prov: x.key === KEY_TILE_PROV,
    score: false,
  })
}

/**
 * 不带 key 的落点:答过一半的接着答(已经选过职业就跳过职业页,基础题都答满、
 * 只差目标省的直接开省份页);一题没答与全答满的照旧从职业页起。
 *
 * @param x 同 makeStartQuiz。
 * @returns 无。
 */
export function resumeStep(x: StartQuizIn): void {
  const resuming = x.progress.stepDone > 0 && x.progress.stepDone < x.progress.stepTotal
  const hasNoc = x.answers.noc !== TEXT_NONE
  const baseDone = missingFields(x.progress.stepNames, x.answers.bands).length === 0
  setStep({
    flow: x.flow,
    answers: x.answers,
    occ: resuming === false || hasNoc === false,
    prov: resuming && hasNoc && baseDone && x.progress.provAnswered === false,
    score: false,
  })
}

/**
 * 开框并把三段开关一次摆好(开框永远是同一个动作,段落只是它的三个开关)。
 *
 * @param x 问卷动线、答案态与三段开关。
 * @returns 无。
 */
export function setStep(x: SetStepIn): void {
  x.flow.setOpen(true)
  x.answers.setOccStep(x.occ)
  x.answers.setProvinceStep(x.prov)
  x.flow.setScoreStep(x.score)
}

/**
 * 打开问卷弹框、直接落在估分段(基础卷答满、只欠估分题时的落点)。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeOpenScoreStep(x: StepIn): ClickFn {
  return function openScoreStep(): void {
    track(TRACK_SCORE_START)
    setStep({ flow: x.flow, answers: x.answers, occ: false, prov: false, score: true })
  }
}

/**
 * 基础卷的「完成」旁路(2026-08-13 Frank:「这个加一个完成按钮」—— 改一个答案不用再翻完全卷):
 * 落档 + 刷判定 + 收框,与走完省份的收卷动作同源,只是不再逼人把答过的页翻一遍。
 *
 * @param x 问卷动线。
 * @returns 手柄。
 */
export function makeFinishQuiz(x: FlowIn): ClickFn {
  return function finishQuiz(): void {
    track(TRACK_QUIZ_DONE)
    quizToProfile(readAnswers()).catch(ignoreFailure).finally(function refresh() {
      x.flow.bumpVerdict()
    })
    makeCloseQuiz(x)()
  }
}

/**
 * 答完基本卷:落档(登录才写,quizToProfile 内部自判;失败不拦页面),然后直接翻进
 * 同一弹框的估分段 —— 估分题就是这份问卷的后半截,不另设入口(2026-08-13 Frank:
 * 「只要一个修改按钮继续行了吧」)。页面不出任何分数 —— 答案的消费方是判定核,不是本页。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeQuizDone(x: StepIn): ClickFn {
  return function onQuizDone(): void {
    track(TRACK_QUIZ_DONE)
    quizToProfile(readAnswers()).catch(ignoreFailure).finally(function land() {
      x.flow.bumpVerdict()
      landAfterQuiz()
    })
    x.answers.setOccStep(false)
    x.answers.setProvinceStep(false)
    x.flow.setScoreStep(true)
  }
}

/**
 * 收卷之后的落点:`next=` 带来的站内地址优先(只认站内路径);否则把一次性入口参数
 * 从地址栏抹掉 —— 它留在那儿会每次刷新都重弹。
 *
 * @returns 无。
 */
export function landAfterQuiz(): void {
  const sp = new URLSearchParams(window.location.search)
  let next = sp.get(P_NEXT)
  if (next == null) {
    next = TEXT_NONE
  }
  if (INTERNAL_PATH_RE.test(next)) {
    window.location.assign(next)
    return
  }
  if (sp.has(P_QUIZ)) {
    sp.delete(P_QUIZ)
    sp.delete(P_NEXT)
    window.history.replaceState(null, TEXT_NONE, window.location.pathname + queryTailOf(sp))
  }
}

/**
 * 查询串的尾巴(一个参数都不剩时连问号也不留)。
 *
 * @param sp 查询串。
 * @returns 尾巴;空串 = 没有参数。
 */
export function queryTailOf(sp: URLSearchParams): string {
  const text = sp.toString()
  if (text === TEXT_NONE) {
    return TEXT_NONE
  }
  return QUERY_HEAD + text
}

/**
 * 清空全部答案并回到第一页。
 *
 * @param x 答案态、问卷动线与估分段。
 * @returns 手柄。
 */
export function makeResetQuiz(x: ResetQuizIn): ClickFn {
  return function resetQuiz(): void {
    x.answers.setBands(clearAnswers())
    x.answers.setNoc(TEXT_NONE)
    x.flow.bumpReset()
    x.answers.setOccStep(true)
    x.answers.setProvinceStep(false)
    x.flow.setScoreStep(false)
    x.score.setProgress(null)
    x.score.setEcho([])
    x.flow.setAtEnd(false)
    track(TRACK_QUIZ_RESET)
  }
}

/**
 * 把某个省并进目标省。省份消歧(审计 A4 / 设计 B3)**不是警告是消歧**:说清主语,
 * 并给一键对齐;不替他改答案。
 *
 * @param x 答案态、问卷动线、省码与埋点名。
 * @returns 手柄。
 */
export function makeAddProv(x: AddProvIn): ClickFn {
  return function addProv(): void {
    x.answers.setBands(writeAnswers({ provs: x.answers.bands.provs.concat([x.province]) }))
    x.flow.bumpVerdict()
    track(x.event, { prov: x.province })
  }
}

/**
 * 收分值卡的题数回报。
 *
 * @param x 估分段。
 * @returns 手柄。
 */
export function makeScoreProgress(x: ScoreIn): ProgressFn {
  return function onScoreProgress(progress: ScoreProgress): void {
    x.score.setProgress(progress)
  }
}

/**
 * 收分值卡的答案回显,顺带把统一答案读回页面 —— 分值卡答学历/年龄会写回答案档
 * (单一来源),不同步的话重算边界不变,初评拿不到新答案(2026-08-15 学历持久化根治同批);
 * 勾选与直选档位也一起同步上来(2026-08-16),不同步 = 用户答满了初评那张表的分还是老样子。
 *
 * @param x 答案态与估分段。
 * @returns 手柄。
 */
export function makeScoreAnswers(x: SyncIn): EchoFn {
  return function onScoreAnswers(rows: ScoreEchoRow[]): void {
    x.score.setEcho(rows)
    x.answers.setBands(readAnswers())
    syncScoreStore({ score: x.score })
  }
}

/**
 * 把分值卡的本地存档同步到页面(加分项勾选 + 真答过的直选档位与时薪)。
 *
 * @param x 估分段。
 * @returns 无。
 */
export function syncScoreStore(x: ScoreIn): void {
  const a = readScoreAnswers()
  x.score.setTicks(a.ticks)
  x.score.setRowsAns(pickAnsweredOf(a))
}

/**
 * 估分答完 = 整卷答完,收框显示各省结果(结果在「估分与抽选线」卡内)。
 *
 * @param x 问卷动线。
 * @returns 手柄。
 */
export function makeScoreComplete(x: FlowIn): ClickFn {
  return function onScoreComplete(): void {
    track(TRACK_SCORE_DONE)
    x.flow.setScoreStep(false)
    x.flow.setOpen(false)
  }
}

/**
 * 估分段第一屏的「返回」= 回到上一步(省份页),同一弹框内往回翻,不是退出。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeScoreBack(x: StepIn): ClickFn {
  return function onScoreBack(): void {
    x.flow.setScoreStep(false)
    x.answers.setOccStep(false)
    x.answers.setProvinceStep(true)
    x.flow.setAtEnd(false)
  }
}

/**
 * 注册/登录完成 → 就地放行并落档浏览器里已答的旧答案,原地接着开答题,不刷新页面不丢状态。
 * onDone 前 AuthForm 已 pullAndMerge 过:这里读到的是合并后的答案,老用户换浏览器登录
 * 直接接着上次的进度答,不从第一题重来。
 *
 * @param x 登录闸与答案态。
 * @returns 手柄。
 */
export function makeAuthDone(x: AuthSyncIn): ClickFn {
  return function onAuthDone(): void {
    x.auth.setMe(true)
    quizToProfile(x.answers.refresh()).catch(ignoreFailure)
  }
}

/**
 * 关掉注册弹框 = 放弃答题。
 *
 * @param x 问卷动线。
 * @returns 手柄。
 */
export function makeAuthClose(x: FlowIn): ClickFn {
  return function onAuthClose(): void {
    x.flow.setOpen(false)
  }
}

/**
 * 带岗态判定卡里的「建档案」:弹窗自己就在视口正中,不用再滚页面。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeBuildProfile(x: StepIn): ClickFn {
  return function onBuildProfile(): void {
    setStep({ flow: x.flow, answers: x.answers, occ: true, prov: false, score: false })
    x.flow.setAtEnd(false)
    track(TRACK_BUILD_PROFILE)
  }
}

/**
 * 选职业控件的逐次变更:写档 + 同步当前职业码。
 *
 * @param x 答案态。
 * @returns 手柄。
 */
export function makeOccChange(x: AnswersIn): NocsFn {
  return function onOccChange(nocs: string[]): void {
    writeNocs({ answers: x.answers, nocs })
  }
}

/**
 * 选职业控件的收页:写档之后翻到基础题。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeOccDone(x: StepIn): NocsFn {
  return function onOccDone(nocs: string[]): void {
    writeNocs({ answers: x.answers, nocs })
    x.answers.setOccStep(false)
    x.answers.setProvinceStep(false)
    x.flow.setAtEnd(false)
  }
}

/**
 * 写职业档并把当前职业码切到档案里的第一个。
 *
 * @param x 答案态与职业码清单。
 * @returns 无。
 */
export function writeNocs(x: WriteNocsIn): void {
  const a = writeAnswers({ nocs: x.nocs })
  x.answers.setBands(a)
  const [head] = a.nocs
  if (head == null) {
    x.answers.setNoc(TEXT_NONE)
    return
  }
  x.answers.setNoc(head)
}

/**
 * 基础题第一题的「上一题」出口 = 回选职业页。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeQuizBack(x: StepIn): ClickFn {
  return function onQuizBack(): void {
    x.answers.setOccStep(true)
    x.flow.setAtEnd(false)
  }
}

/**
 * 基础题的逐题写答案。
 *
 * @param x 答案态。
 * @returns 手柄。
 */
export function makeQuizPatch(x: AnswersIn): PatchFn {
  return function onQuizPatch(patch: Partial<PlanAnswers>): void {
    x.answers.setBands(writeAnswers(patch))
  }
}

/**
 * 基础题答完 → 翻到选目标省页(省份是基础段最后一题)。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeQuizComplete(x: StepIn): ClickFn {
  return function onQuizComplete(): void {
    x.answers.setProvinceStep(true)
    x.flow.setAtEnd(false)
  }
}

/**
 * 选目标省控件的逐次变更。
 *
 * @param x 答案态。
 * @returns 手柄。
 */
export function makeProvChange(x: AnswersIn): ProvsFn {
  return function onProvChange(provs: string[]): void {
    x.answers.setBands(writeAnswers({ provs }))
  }
}

/**
 * 选目标省控件的「完成」旁路:写档之后走收卷动作。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeProvFinish(x: StepIn): ProvsAnyFn {
  return function onProvFinish(provs: string[], any?: boolean): void {
    x.answers.setBands(writeAnswers({ provs, provsAny: any === true }))
    makeFinishQuiz({ flow: x.flow })()
  }
}

/**
 * 选目标省控件的收页:写档之后由收卷动作决定 —— 还有估分题就翻进估分段,答满才收框。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeProvDone(x: StepIn): ProvsAnyFn {
  return function onProvDone(provs: string[], any?: boolean): void {
    x.answers.setBands(writeAnswers({ provs, provsAny: any === true }))
    makeQuizDone(x)()
  }
}

/**
 * 选目标省页的「上一题」= 回到基础题最后一题。
 *
 * @param x 答案态与问卷动线。
 * @returns 手柄。
 */
export function makeProvBack(x: StepIn): ClickFn {
  return function onProvBack(): void {
    x.answers.setProvinceStep(false)
    x.flow.setAtEnd(true)
  }
}

/**
 * 估分线卡的「改答案」:答满基础卷就直接落估分段,否则回基础段。
 *
 * @param x 答案态、问卷动线、估分段与两段计数。
 * @returns 手柄。
 */
export function makeScoreEdit(x: StartQuizIn): ClickFn {
  return function onScoreEdit(): void {
    if (x.progress.quizComplete) {
      makeOpenScoreStep({ answers: x.answers, flow: x.flow })()
      return
    }
    makeStartQuiz(x)()
  }
}

/**
 * 估分线卡的「选省份」(2026-08-16 Frank「这个部分加一个按钮,选省份吧?可以多选」)——
 * 落的是基础卷同一道省份题(字段单一来源),不新开一份省份答案。
 *
 * @param x 同 makeScoreEdit。
 * @returns 手柄。
 */
export function makePickProv(x: StartQuizIn): ClickFn {
  return function onPickProv(): void {
    makeStartQuiz(x)(KEY_TILE_PROV)
  }
}

/**
 * 竞争卡年份筛选的点击手柄工厂:点选切年,再点同一个年份回现行口径
 * (现行 = 存量最新 + 当年名额的比值表)。
 *
 * @param x 当前年份与写年份的口子。
 * @returns 年份 → 手柄。
 */
export function makeYearPickOf(x: YearPickIn): (year: string) => ClickFn {
  return function pickOf(year: string): ClickFn {
    return function pickYear(): void {
      if (x.year === year) {
        x.setYear(TEXT_NONE)
        return
      }
      x.setYear(year)
    }
  }
}

/**
 * 职业竞争卡切换职业的手柄工厂(2026-08-14 Frank「需要分职业吧」)——
 * 只切这张表的查询,不动全页职业语境(分值卡/判定的职业不跟着跳)。
 *
 * @param x 职业竞争面板。
 * @returns 职业码 → 手柄。
 */
export function makeOccPickOf(x: OccPickIn): (code: string) => ClickFn {
  return function pickOf(code: string): ClickFn {
    return function pickOcc(): void {
      x.setNoc(code)
    }
  }
}

/**
 * /api/users/me 的响应形状(只读身份那一格)。
 */
type MeWire = {
  /**
   * 当前用户;缺席 = 没登录。
   */
  user?: {
    /**
     * 用户 id。
     */
    id?: string | number
  }
}

/**
 * /api/ruling/profile 的响应形状。
 */
type PathsWire = {
  /**
   * 服务端排好序的通道行。
   */
  rows?: ProfilePath[]

  /**
   * 省外更优的那一条。
   */
  outside?: OutsidePath
}

/**
 * /api/points/factors 的响应形状。
 */
type TablesWire = {
  /**
   * 本站有官方分值表的省。
   */
  factorProvinces?: string[]

  /**
   * 官方分值表逐行。
   */
  factors?: PlanScoreFactor[]

  /**
   * 该批省的抽选记录。
   */
  draws?: PlanDraw[]
}

/**
 * /api/jobs/competition 的响应形状。
 */
type OccWire = {
  /**
   * 该职业的分省竞争行。
   */
  rows?: PlanOccComp[]
}

/**
 * /api/quiz 按码取名的响应形状。
 */
type NocWire = {
  /**
   * 名字行;缺席或 null = 这个码查不到名字。
   */
  facts?: OccNameRow | null
}


/**
 * 登录态真相:pullAndMerge 无参调用受「登录迹象 cookie」那道闸限制,而那枚 cookie
 * 由同步层自己维护,换浏览器/清过站点数据就没有 —— 缓存撤掉之后没有本地档兜底,
 * 一缺就永远读不到自己的答案(2026-08-16 实撞:Frank 本地登录着,页面却「已答 0/11」)。
 *
 * @param x 登录闸。
 * @returns 在途工作者。
 */
export function makeMeEffect(x: AuthIn): CleanupFn {
  return function loadMe(): void {
    fetch(URL_ME, { credentials: CRED_INCLUDE })
      .then(function toJson(r: Response) {
        return r.json()
      })
      .then(function apply(d: MeWire) {
        x.auth.setMe(hasUserOf(d))
      })
      .catch(function offline() {
        x.auth.setMe(false)
      })
  }
}

/**
 * 响应里有没有一个真用户。
 *
 * @param d /api/users/me 的响应。
 * @returns 登录了没有。
 */
export function hasUserOf(d: MeWire): boolean {
  if (d == null || d.user == null) {
    return false
  }
  const id = d.user.id
  if (id == null || id === TEXT_NONE || id === 0) {
    return false
  }
  return true
}

/**
 * 真登录了就**无条件**拉服务端答案档;拉回来有变化才重建页面状态。
 *
 * @param x 答案态与估分段。
 * @returns 在途工作者。
 */
export function makePullEffect(x: SyncIn): CleanupFn {
  return function pullAfterLogin(): void {
    pullAndMerge(true).then(makeMergeApply(x)).catch(ignoreFailure)
  }
}

/**
 * 服务端档拉回后的重建:没变化就什么都不做(重建一次要重渲整页)。
 *
 * @param x 答案态与估分段。
 * @returns 收 pullAndMerge 结果的回调。
 */
export function makeMergeApply(x: SyncIn): (changed: boolean) => void {
  return function applyMerged(changed: boolean): void {
    if (changed === false) {
      return
    }
    x.answers.refresh()
    syncScoreStore({ score: x.score })
  }
}

/**
 * 挂载:读本地答案 → 决定要不要自动唤起问卷 → 放行判定面板 → 同步分值卡存档 →
 * 记一次进页面 → 登录态拉服务端答案档(清了浏览器/换设备答案还在;未登录 401 无感)。
 * 改为弹窗形态后默认收起,只有 URL 带 `quiz=1` 时才自动唤起;而它是处境页那条入口带来的
 * 一次性入口,留在地址栏后**每次刷新都重弹**(2026-08-16 Frank「已经选完了,每次刷新
 * 不要再弹框了」)—— 答满了就不弹,并把这个参数从地址栏抹掉。
 *
 * @param x 答案态、问卷动线、估分段与带岗那份工作。
 * @returns 在途工作者。
 */
export function makeMountEffect(x: MountSyncIn): CleanupFn {
  return function mount(): void {
    const a = x.answers.refresh()
    const wantQuiz = new URLSearchParams(window.location.search).get(P_QUIZ) === P_QUIZ_ON
    const basicDone = a.nocs.length > 0 && baseDoneOf(a)
    x.flow.setOpen(wantQuiz && basicDone === false)
    if (wantQuiz) {
      dropQuizParam()
    }
    x.answers.setReady(true)
    syncScoreStore({ score: x.score })
    track(TRACK_OPEN, { job: jobFlagOf(x.tvJob) })
    pullAndMerge().then(makeMergeApply({ answers: x.answers, score: x.score })).catch(ignoreFailure)
  }
}

/**
 * 把一次性的自动唤起参数从地址栏抹掉(它不该变成常驻状态)。
 *
 * @returns 无。
 */
export function dropQuizParam(): void {
  const u = new URL(window.location.href)
  u.searchParams.delete(P_QUIZ)
  window.history.replaceState(null, TEXT_NONE, u.pathname + u.search + u.hash)
}

/**
 * 进页面埋点里的「带没带岗」。
 *
 * @param tvJob 带岗那份工作;null = 无岗态。
 * @returns 埋点值。
 */
export function jobFlagOf(tvJob: TvJob | null): string {
  if (tvJob == null) {
    return TRACK_FLAG_OFF
  }
  return TRACK_FLAG_ON
}

/**
 * 职业档粗筛(2026-08-15 Frank「立即出」):有职业就跑 —— 引擎对没答的题落「判不了」
 * 不当障碍,答满 8 题原地升级成个人档,同一张卡不是两张。
 * 加分项勾选与直选档位随请求上行(2026-08-16 Frank 拍第 1 条「把加分项做成正式答案字段」):
 * 勾了不上行 = 用户勾满了分数纹丝不动。
 *
 * @param x 门控、职业码、答案档、勾选、直选档位与两个写口。
 * @returns 在途工作者(返回中止函数)。
 */
export function makePathsEffect(x: PathsEffectIn): EffectFn {
  return function loadPaths(): CleanupFn {
    const ctrl = new AbortController()
    fetch(URL_RULING_PROFILE, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      signal: ctrl.signal,
      body: JSON.stringify({
        answers: toEngineAnswers(x.bands),
        ticks: x.ticks,
        rows: x.rowsAns.rowAnswers,
        wage: x.rowsAns.wage,
        areaI: x.rowsAns.areaI,
      }),
    })
      .then(okJsonOf)
      .then(function apply(d: PathsWire | null) {
        if (ctrl.signal.aborted) {
          return
        }
        x.setPaths(rowsOfWire(d))
        x.setOutside(outsideOfWire(d))
      })
      .catch(function fallback() {
        if (ctrl.signal.aborted === false) {
          x.setPaths([])
          x.setOutside(null)
        }
      })
    return function abort(): void {
      ctrl.abort()
    }
  }
}

/**
 * 响应不 ok 就当没有(拿不到就当「本站没有」落地,不编数据)。
 *
 * @param r 响应。
 * @returns 解析好的 JSON;不 ok 给 null。
 */
export function okJsonOf(r: Response) {
  if (r.ok === false) {
    return null
  }
  return r.json()
}

/**
 * 初评响应里的通道行(形状对不上就当空表)。
 *
 * @param d 响应。
 * @returns 通道行。
 */
export function rowsOfWire(d: PathsWire | null): ProfilePath[] {
  if (d == null || Array.isArray(d.rows) === false || d.rows == null) {
    return []
  }
  return d.rows
}

/**
 * 初评响应里的省外提示(两格身份齐了才算数)。
 *
 * @param d 响应。
 * @returns 省外提示;null = 没有。
 */
export function outsideOfWire(d: PathsWire | null): OutsidePath | null {
  if (d == null || d.outside == null) {
    return null
  }
  if (typeof d.outside.key !== 'string' || typeof d.outside.province !== 'string') {
    return null
  }
  return d.outside
}

/**
 * 官方分值表按所选省懒取:答完题(或带岗进来)才发这一次请求,没答的人一个字节都不用背。
 * 服务端有 10 分钟单件缓存,这里不做客户端缓存 —— 一次页面生命周期最多问一次。
 * 拿不到就当「本站没有表」落地:估分区不出,不编分数(与表空时的既定口径一致)。
 *
 * @param x 省码串与写口。
 * @returns 在途工作者(返回中止函数)。
 */
export function makeTablesEffect(x: TablesEffectIn): EffectFn {
  return function loadTables(): CleanupFn {
    const ctrl = new AbortController()
    fetch(URL_POINTS_FACTORS_HEAD + encodeURIComponent(x.provKey), { signal: ctrl.signal })
      .then(okJsonOf)
      .then(function apply(d: TablesWire | null) {
        if (ctrl.signal.aborted) {
          return
        }
        x.setTables(tablesOfWire(d))
      })
      .catch(function fallback() {
        if (ctrl.signal.aborted === false) {
          x.setTables(emptyTables())
        }
      })
    return function abort(): void {
      ctrl.abort()
    }
  }
}

/**
 * 分值表响应 → 页面状态(形状对不上就当「本站没有表」)。
 *
 * @param d 响应。
 * @returns 分值表。
 */
export function tablesOfWire(d: TablesWire | null): ScoreTables {
  if (d == null || Array.isArray(d.factors) === false || d.factors == null) {
    return emptyTables()
  }
  let provinces: string[] = []
  if (d.factorProvinces != null) {
    provinces = d.factorProvinces
  }
  let draws: PlanDraw[] = []
  if (d.draws != null) {
    draws = d.draws
  }
  return { factorProvinces: provinces, factors: d.factors, draws }
}

/**
 * 「本站没有表」的那一份:三张表都空。它与 null 不是一回事 ——
 * null 是还没取到,这一份是取到了、结论是没有。
 *
 * @returns 空表。
 */
export function emptyTables(): ScoreTables {
  return { factorProvinces: [], factors: [], draws: [] }
}

/**
 * 该职业分省竞争按 NOC 懒取(省级那张表随页面 SSR,这张要等他答完职业才知道查谁)。
 *
 * @param x 职业码与写口。
 * @returns 在途工作者(返回中止函数)。
 */
export function makeOccCompEffect(x: OccEffectIn): EffectFn {
  return function loadOccComp(): CleanupFn {
    const ctrl = new AbortController()
    fetch(URL_OCC_COMPETITION_HEAD + encodeURIComponent(x.noc), { signal: ctrl.signal })
      .then(okJsonOf)
      .then(function apply(d: OccWire | null) {
        if (ctrl.signal.aborted === false) {
          x.setRows(occRowsOfWire(d))
        }
      })
      .catch(function fallback() {
        if (ctrl.signal.aborted === false) {
          x.setRows([])
        }
      })
    return function abort(): void {
      ctrl.abort()
    }
  }
}

/**
 * 职业竞争响应里的行(形状对不上就当空表)。
 *
 * @param d 响应。
 * @returns 分省竞争行。
 */
export function occRowsOfWire(d: OccWire | null): PlanOccComp[] {
  if (d == null || Array.isArray(d.rows) === false || d.rows == null) {
    return []
  }
  return d.rows
}

/**
 * 冷门职业名按码异步补全:常用职业名同步取已有字典,其余按码问一次,结果进模块级缓存。
 *
 * @param x 职业码清单、界面语言与写口。
 * @returns 在途工作者(返回熄火开关)。
 */
export function makeNocTitlesEffect(x: TitlesEffectIn): EffectFn {
  return function loadTitles(): CleanupFn {
    const missing = missingNocsOf({ nocs: x.nocs, lang: x.lang })
    if (missing.length === 0) {
      return ignoreFailure
    }
    for (const code of missing) {
      CACHE.tried.add(x.lang + CACHE_KEY_SEP + code)
    }
    const live = { on: true }
    const jobs: Promise<void>[] = []
    for (const code of missing) {
      jobs.push(fetchNocTitle({ code, lang: x.lang }))
    }
    Promise.all(jobs).then(function apply() {
      if (live.on) {
        x.setTitles(Object.assign({}, CACHE.titles))
      }
    }).catch(ignoreFailure)
    return function stop(): void {
      live.on = false
    }
  }
}

/**
 * 还没问过名字的那几个码(问过没问过记在缓存的 tried 里,失败不重试)。
 *
 * @param x 职业码清单与界面语言。
 * @returns 要问的码。
 */
export function missingNocsOf(x: TitlesIn): string[] {
  const out: string[] = []
  for (const code of x.nocs) {
    if (isPopularNoc(code) === false && CACHE.tried.has(x.lang + CACHE_KEY_SEP + code) === false) {
      out.push(code)
    }
  }
  return out
}

/**
 * 这个码在不在常用职业表里(在的话名字同步就有,不用问)。
 *
 * @param code 5 位职业码。
 * @returns 在不在。
 */
export function isPopularNoc(code: string): boolean {
  for (const item of POPULAR_NOCS) {
    if (item.noc === code) {
      return true
    }
  }
  return false
}

/**
 * 问一个码的名字并写进缓存;问不到就算了(下次也不再问)。
 *
 * @param x 职业码与界面语言。
 * @returns 问完为止。
 */
export function fetchNocTitle(x: NocTitleIn): Promise<void> {
  return fetch(URL_QUIZ_NOC_HEAD + encodeURIComponent(x.code))
    .then(function toJson(r: Response) {
      return r.json()
    })
    .then(function keep(d: NocWire) {
      let row: OccNameRow | null = null
      if (d != null && d.facts != null) {
        row = d.facts
      }
      const name = pickName({ row, lang: x.lang })
      if (name !== TEXT_NONE) {
        CACHE.titles[x.lang + CACHE_KEY_SEP + x.code] = name
      }
    })
    .catch(ignoreFailure)
}

/**
 * 弹框壳的 Esc 退出与统一壳同款(基础段与估分段一体,关的是整个框)。
 *
 * @param x 关框手柄。
 * @returns 在途工作者(返回摘监听器)。
 */
export function makeEscEffect(x: EscIn): EffectFn {
  return function listenEsc(): CleanupFn {
    function onKey(e: KeyboardEvent): void {
      if (e.key === KEY_ESC) {
        x.close()
      }
    }
    window.addEventListener(EV_KEYDOWN, onKey)
    return function drop(): void {
      window.removeEventListener(EV_KEYDOWN, onKey)
    }
  }
}

/**
 * 从长的职业页翻到短题时,页面可能还停在职业页的下半段 —— 把题区顶回视口。
 * 首次展开保持页面原本位置;题区已经整个在视口里就**别再滚**(08-10 Frank「不要闪烁」):
 * 每翻一题再滚一次只会把页面又拽一下,看着就是闪。
 *
 * @param x 问卷动线。
 * @returns 在途工作者。
 */
export function makeScrollEffect(x: PadIn): CleanupFn {
  return function alignPad(): void {
    if (x.open === false) {
      x.pad.shownRef.current = false
      return
    }
    const host = x.pad.padRef.current
    if (host == null) {
      return
    }
    const pad = host.querySelector<HTMLElement>(QUIZ_PAD_SEL)
    if (pad == null) {
      return
    }
    const box = pad.getBoundingClientRect()
    if (x.pad.shownRef.current && (box.top < 0 || box.bottom > window.innerHeight)) {
      pad.scrollIntoView({ block: SCROLL_BLOCK_START, behavior: SCROLL_BEHAVIOR_AUTO })
    }
    x.pad.shownRef.current = true
  }
}

/**
 * 两个类名拼一起(DOM 的 class 属性按空白切词,换别的记号会被当成一整个类名,整条样式静默失效)。
 *
 * @param x 底座类与叠加类。
 * @returns 拼好的 className。
 */
export function joinCls(x: JoinClsIn): string {
  return cssOf(x.base) + CLS_SEP + cssOf(x.more)
}

/**
 * 初评卡标题行的类:粗筛态底下紧跟着一句职业小注,间距收窄;个人档态底下直接是表。
 *
 * @param x 粗筛态。
 * @returns className。
 */
export function planHeadClsOf(x: CoarseIn): string {
  if (x.coarse) {
    return joinCls({ base: css.planHead, more: css.planHeadTight })
  }
  return joinCls({ base: css.planHead, more: css.planHeadLoose })
}

/**
 * 摘要卡入口钮的类:一题没答是本页唯一的主行动(蓝实底),有欠账用浅蓝底,答满退回素钮。
 *
 * @param progress 两段计数与门控。
 * @returns className。
 */
export function entryBtnClsOf(progress: ProgressPanel): string {
  if (progress.stepDone === 0) {
    return joinCls({ base: css.btn, more: css.btnStart })
  }
  if (progress.allDone === false) {
    return joinCls({ base: css.btn, more: css.btnResume })
  }
  return joinCls({ base: css.btn, more: css.btnEdit })
}

/**
 * 摘要卡入口钮的文案键:「开始评估」(一题没答)/「继续作答」(答过一半)/「改答案」(答满)。
 *
 * @param progress 两段计数与门控。
 * @returns 文案键。
 */
export function entryKeyOf(progress: ProgressPanel): string {
  if (progress.allDone) {
    return KEY_BTN_BACK
  }
  if (progress.stepDone > 0) {
    return KEY_BTN_RESUME
  }
  return KEY_BTN_START
}

/**
 * chips 的类(年份与职业两处共用):选中态叠蓝描边蓝字浅蓝底。
 *
 * @param x 选中没有。
 * @returns className。
 */
export function chipClsOf(x: PickedIn): string {
  if (x.picked) {
    return joinCls({ base: css.btn, more: css.btnPicked })
  }
  return cssOf(css.btn)
}

/**
 * 年份 chip 的类。
 *
 * @param x 选中没有。
 * @returns className。
 */
export function yearChipClsOf(x: PickedIn): string {
  return chipClsOf(x)
}

/**
 * 职业 chip 的类。
 *
 * @param x 选中没有。
 * @returns className。
 */
export function occChipClsOf(x: PickedIn): string {
  return chipClsOf(x)
}

/**
 * 职业竞争表当前看哪个职业:这张表自己选过就看它,否则跟着全页当前职业。
 *
 * @param x 全页当前职业码与这张表自己的职业码。
 * @returns 职业码;'' = 还没选职业。
 */
export function occTargetOf(x: OccTargetIn): string {
  if (x.occNoc !== TEXT_NONE) {
    return x.occNoc
  }
  return x.noc
}

/**
 * 「重挑岗位」的去处:通道筛选 + 只选了一个省时带上省筛选。
 *
 * @param x 答案档。
 * @returns 职位板地址。
 */
export function repickHrefOf(x: RepickIn): string {
  const [only] = x.bands.provs
  if (x.bands.provs.length === 1 && only != null) {
    return URL_JOBS_PNP + PARAM_PROV + only
  }
  return URL_JOBS_PNP
}

/**
 * 点钮时记一次埋点的手柄工厂(钮本身是链接,点了照常跳)。
 *
 * @param x 埋点名与行身份。
 * @returns 手柄。
 */
export function makeActTrack(x: ActTrackIn): ClickFn {
  return function hitAct(): void {
    track(x.event, { key: x.rowKey })
  }
}

/**
 * 省外更优提示的措辞:与主排序同一把尺,竞争比并排给,搬省的账用户自己算 ——
 * 不再裸称「更优」。目标省内一条都没有时换另一句(没有可对照的行)。
 *
 * @param x 取词函数、界面语言与省外更优的那一条。
 * @returns 提示文案。
 */
export function outsideTextOf(x: OutsideTextIn): string {
  const prov = provDispOf({ t: x.t, code: x.outside.province })
  const name = routeNameFullOf({ t: x.t, lang: x.lang, key: x.outside.key, provinceLabel: prov })
  const r1 = ratioTextOf(x.outside.ratio)
  if (x.outside.inside == null) {
    return x.t('dp.planOutsideNoInside', { prov, name, r1 })
  }
  return x.t('dp.planOutside2', { prov, name, r1, r2: ratioTextOf(x.outside.inside.ratio) })
}

/**
 * 竞争比的成句;官方缺位给那根横杠(这一处是插进整句里的字,不是单元格)。
 *
 * @param v 竞争比;null = 官方缺位。
 * @returns 成句。
 */
export function ratioTextOf(v: number | null): string {
  if (v == null) {
    return TEXT_DASH
  }
  return v + RATIO_TAIL
}

/**
 * null 换空串(插值位要的是字,不是「这一格不出」)。
 *
 * @param v 一段字;null = 没有。
 * @returns 字;没有给空串。
 */
export function blankOf(v: string | null): string {
  if (v == null) {
    return TEXT_NONE
  }
  return v
}

/**
 * 手机卡发布时间槽:补充行摆「本岗所在省」标,其余行这一槽整个不给
 * (给个空壳会让职位卡多渲一层空 span)。functions 不写 JSX,所以用 createElement 造元素。
 *
 * @param r 这一行展示行。
 * @returns 标;不是补充行就不给。
 */
export function planDateSlotOf(r: PlanCellRow): React.ReactNode {
  if (r.text.extraLabel === TEXT_NONE) {
    return undefined
  }
  return createElement(JobProvTag, { text: r.text.extraLabel })
}

/**
 * 手机卡胶囊排槽:粗筛态与一枚胶囊都没有时整槽不给。
 *
 * @param x 这一行展示行与粗筛态。
 * @returns 胶囊排;不出时不给。
 */
export function planChipsSlotOf(x: PlanCardRowIn): React.ReactNode {
  if (x.coarse) {
    return undefined
  }
  if (x.r.pills.gaps.length === 0 && x.r.pills.time == null) {
    return undefined
  }
  return createElement(PlanCardChips, x)
}

/**
 * 手机卡动作行槽:两个去处都没有时整槽不给。
 *
 * @param r 这一行展示行。
 * @returns 动作行;不出时不给。
 */
export function planActsSlotOf(r: PlanCellRow): React.ReactNode {
  if (r.links.jobs == null && r.links.emp == null) {
    return undefined
  }
  return createElement(PlanCardActs, { r })
}

/**
 * 弹框标题的文案键:基础段 = 申请人条件,估分段 = 估分与抽选线。
 *
 * @param x 在不在估分段。
 * @returns 文案键。
 */
export function quizTitleKeyOf(x: StepFlagIn): string {
  if (x.scoreStep) {
    return KEY_SCORE_TITLE
  }
  return KEY_QUIZ_TITLE
}

/**
 * 进度条的无障碍名(当前段的已答/总数)。
 *
 * @param x 两段计数与在不在估分段。
 * @returns 无障碍名。
 */
export function barLabelOf(x: BarIn): string {
  if (x.scoreStep) {
    return x.progress.scoreDone + BAR_SEP + x.progress.scoreTotal
  }
  return x.progress.stepDone + BAR_SEP + x.progress.stepTotal
}

/**
 * 进度条填充的宽度:当前段的已答比例。总数为 0 时按 1 兜(除零会得到 NaN,条子直接消失)。
 *
 * @param x 两段计数与在不在估分段。
 * @returns 只有宽度一格的运行时样式。
 */
export function barStyleOf(x: BarIn): React.CSSProperties {
  let done = x.progress.stepDone
  let total = x.progress.stepTotal
  if (x.scoreStep) {
    done = x.progress.scoreDone
    total = x.progress.scoreTotal
  }
  const pct = Math.round((done / Math.max(total, 1)) * PERCENT_MAX)
  return { width: pct + PERCENT_SIGN }
}

/**
 * 旁路收卷钮的文案:整卷答满才给(何时给由调用方定,点了直接收卷,不走剩余页)。
 *
 * @param x 取词函数与答满没有。
 * @returns 钮文案;没答满就不给这颗钮。
 */
export function finishLabelOf(x: FinishLabelIn): string | undefined {
  if (x.done) {
    return x.t('ps.finish')
  }
  return undefined
}

/**
 * 基础题的起步落点:点条件格进来时直达那道题,否则落第一道没答的题。
 *
 * @param x 落点题名;'' = 不指定。
 * @returns 题名;不指定就不给。
 */
export function startAtOf(x: FocusIn): string | undefined {
  if (x.focus === TEXT_NONE) {
    return undefined
  }
  return x.focus
}

/**
 * 选目标省页的重挂键(清空答案时换 key 重挂控件)。
 *
 * @param x 重挂序号。
 * @returns 重挂键。
 */
export function provStepKeyOf(x: NonceIn): string {
  return x.nonce + SCORE_KEY_SEP + PROV_STEP_KEY
}

/**
 * 基础题页的重挂键:清空答案、从后面返回、点条件格直达三种情形各换一次 key。
 *
 * @param x 重挂序号、起步位与落点。
 * @returns 重挂键。
 */
export function formStepKeyOf(x: FormKeyIn): string {
  if (x.atEnd) {
    return x.nonce + SCORE_KEY_SEP + FORM_KEY_END
  }
  if (x.focus !== TEXT_NONE) {
    return x.nonce + SCORE_KEY_SEP + FORM_KEY_FOCUS_HEAD + x.focus
  }
  return x.nonce + SCORE_KEY_SEP + FORM_KEY_AUTO
}

/**
 * 分值卡容器的类:在估分段时它是题区,开着框但不在估分段时整块藏起来(**只藏不卸载** ——
 * 卸载 = 答案清零),收框后退回普通块。
 *
 * @param x 问卷动线与登录闸。
 * @returns className;收框态不给类。
 */
export function scoreHolderClsOf(x: HolderClsIn): string | undefined {
  const shown = x.open && x.me === true
  if (shown && x.scoreStep) {
    return QUIZ_PAD_CLS
  }
  if (x.open) {
    return cssOf(css.hidden)
  }
  return undefined
}

/**
 * 分值卡该不该挂:基本卷答满且这个省真有题才渲(渐进展开 —— 落地页面只有 H1 + 答题,
 * 别一屏摊开所有机器)。
 *
 * @param x 两段计数与省语境。
 * @returns 挂不挂。
 */
export function scoreShownOf(x: ScoreShownIn): boolean {
  return x.progress.quizComplete && x.prov.targetFactors.length > 0
}

/**
 * 分值卡的「省 → 你的职业命中的具名通道名」:带岗且岗位命中了具名通道才给
 * (抽选线按通道对照,对不上就不给差分结论)。
 *
 * @param x 带岗那份工作与这一批题算的省。
 * @returns 通道表;没有就给空表。
 */
export function streamsOf(x: StreamsIn): Record<string, string> {
  if (x.tvJob == null || x.tvJob.pnpStream === TEXT_NONE) {
    return {}
  }
  const out: Record<string, string> = {}
  out[x.province] = x.tvJob.pnpStream
  return out
}

/**
 * 问卷整段外层的类:收框态且估分题答满时,这里就地变成卡内的「各省估分」结果区,
 * 上面画一道分隔线;别的时候不画。
 *
 * @param x 开着没有、两段计数与估分段。
 * @returns className;不画线就不给类。
 */
export function quizSectionClsOf(x: SectionClsIn): string | undefined {
  if (x.shown === false && x.score.progress != null && x.progress.scoreLeft === 0) {
    return cssOf(css.quizResult)
  }
  return undefined
}

/**
 * 遮罩层的类:开框才换皮(半透黑来自 modal 域的同一份,本页只补层级与窄屏贴边)。
 *
 * @param x 开着没有。
 * @returns className;收框态不给类。
 */
export function overlayClsOf(x: ShownIn): string | undefined {
  if (x.shown === false) {
    return undefined
  }
  return overlayCls() + CLS_SEP + cssOf(css.quizOverlay)
}

/**
 * 白卡的类:开框才换皮,收框时退回普通块。
 *
 * @param x 开着没有。
 * @returns className;收框态不给类。
 */
export function cardClsOf(x: ShownIn): string | undefined {
  if (x.shown === false) {
    return undefined
  }
  return cssOf(css.quizCard)
}

/**
 * 点遮罩关框的手柄:收框态这一层只是普通块,不许挂关框。
 *
 * @param x 开着没有与关框手柄。
 * @returns 手柄;收框态不给。
 */
export function overlayClickOf(x: OverlayClickIn): ClickFn | undefined {
  if (x.shown === false) {
    return undefined
  }
  return x.close
}

/**
 * 卡内点击不许冒到遮罩,否则点哪都算点外面关框。
 *
 * @param e 鼠标事件。
 * @returns 无。
 */
export function stopClick(e: React.MouseEvent): void {
  e.stopPropagation()
}

/**
 * 卡内停传的手柄:收框态这一层只是普通块,不用停传。
 *
 * @param x 开着没有。
 * @returns 手柄;收框态不给。
 */
export function stopClickOf(x: ShownIn): ((e: React.MouseEvent) => void) | undefined {
  if (x.shown === false) {
    return undefined
  }
  return stopClick
}

/**
 * 估分段还在等分值表的那一两拍(答完省份之后)——加载区必占位。
 *
 * @param x 两段计数与估分段。
 * @returns 等不等。
 */
export function tablesPendingOf(x: TablesPendingIn): boolean {
  return x.progress.quizComplete && x.score.tables == null
}

/**
 * 估分线卡的「有表的省」:表还没取到就给 null —— 没有它就分不清「本站没有这个省的表」
 * 和「你还没答完基础卷」,而那两句话在用户那儿意思相反。
 *
 * @param x 估分段与省语境。
 * @returns 有表的省;null = 表还没取到。
 */
export function gridProvincesOf(x: GridProvIn): string[] | null {
  if (x.score.tables == null) {
    return null
  }
  return x.prov.factorProvinces
}

/**
 * 估分线卡要的通道行(每省取分最高的一行代表由它自己挑);还没回来时给空表。
 *
 * @param x 通道行;null = 还没回来。
 * @returns 通道行。
 */
export function pathRowsOf(x: PathRowsIn): ProfilePath[] {
  if (x.paths == null) {
    return []
  }
  return x.paths
}

/**
 * 估分线卡页签角标的取数口。
 *
 * @param x 决策页整机。
 * @returns 省码 → 该省还欠几道估分题。
 */
export function makePendingOf(x: ProvRenderIn): ProvCountFn {
  return function pendingOf(province: string): number {
    return pendingOfProv({ rows: x.d.view.cond.scoreRows, province })
  }
}

/**
 * 某个省该摆哪几格估分题:省专属题按省对上,共用题只在**真要它**的省下出现。
 *
 * @param x 估分题条件格、省码与官方分值表逐行。
 * @returns 该摆的格。
 */
export function scoreTileRowsOf(x: TileRowsIn): SummaryRow[] {
  const out: SummaryRow[] = []
  for (const r of x.rows) {
    if (r.prov !== TEXT_NONE) {
      if (r.prov === x.province) {
        out.push(r)
      }
    } else if (sharedFactorShownOf({ key: r.key, province: x.province, factors: x.factors })) {
      out.push(r)
    }
  }
  return out
}

/**
 * 档案里的第一个职业码(当前职业语境跟着它走)。
 *
 * @param a 答案档。
 * @returns 职业码;一个都没选给空串。
 */
export function firstNocOf(a: PlanAnswers): string {
  const [head] = a.nocs
  if (head == null) {
    return TEXT_NONE
  }
  return head
}

/**
 * 重挂序号自增(React 的 setState 更新式)。
 *
 * @param n 现在的序号。
 * @returns 下一个序号。
 */
export function bumpNonce(n: number): number {
  return n + 1
}

/**
 * 分值题落点自增的更新式:只传 key 的话,点同一格第二次就不动了,所以要带序号。
 *
 * @param x 分值题 key。
 * @returns React 的 setState 更新式。
 */
export function makeFocusBump(x: FocusKeyIn): (f: ScoreFocus | null) => ScoreFocus {
  return function bump(f: ScoreFocus | null): ScoreFocus {
    if (f == null) {
      return { key: x.key, nonce: 1 }
    }
    return { key: x.key, nonce: f.nonce + 1 }
  }
}

/**
 * 两段计数与门控。计数数的是**答过几项**,不是翻到第几页(先前用页码:一进第 1 题就写
 * 「已答 1/6」,其实一题没答)。基础卷自己的计数与估分段各算各的(2026-08-16 拆 section 后)——
 * 合并成一个数时看不出人是卡在基础题还是估分题,而那正是要改哪一边的唯一依据;
 * 两段合计那一份留给带岗态判定卡②(2026-08-13 Frank「合并成 17」)。
 *
 * @param x 答案态与估分段。
 * @returns 两段计数与门控。
 */
export function progressOf(x: ProgressIn): ProgressPanel {
  const bands = x.answers.bands
  const stepNames = stepNamesOf(bands)
  const provAnswered = provAnsweredOf(bands)
  const missing = missingFields(stepNames, bands).length
  let nocDone = 0
  if (x.answers.noc !== TEXT_NONE) {
    nocDone = 1
  }
  let provDone = 0
  if (provAnswered) {
    provDone = 1
  }
  const stepDone = stepNames.length - missing + nocDone + provDone
  const stepTotal = stepNames.length + STEP_EXTRA
  const score = x.score.progress
  let scoreDone = 0
  let scoreTotal = 0
  if (score != null) {
    scoreDone = score.done
    scoreTotal = score.total
  }
  const scoreLeft = scoreTotal - scoreDone
  const quizComplete = x.answers.ready && x.answers.noc !== TEXT_NONE && provAnswered && missing === 0
  const scorePending = score != null && scoreLeft > 0
  return {
    stepNames,
    stepTotal,
    stepDone,
    provAnswered,
    scoreDone,
    scoreTotal,
    scoreLeft,
    scorePending,
    quizComplete,
    allDone: quizComplete && scorePending === false,
    doneAll: stepDone + scoreDone,
    totalAll: stepTotal + scoreTotal,
  }
}

/**
 * 全页手柄一次装配好(每一枚的口径见它自己的工厂)。
 *
 * @param x 各分机器、带岗那份工作与省外更优的那一条。
 * @returns 手柄面板。
 */
export function actsOf(x: ActsIn): ActsPanel {
  const step = { answers: x.answers, flow: x.flow }
  const start = { answers: x.answers, flow: x.flow, score: x.score, progress: x.progress }
  let outsideProv = TEXT_NONE
  if (x.outside != null) {
    outsideProv = x.outside.province
  }
  let jobProv = TEXT_NONE
  if (x.tvJob != null) {
    jobProv = x.tvJob.province
  }
  return {
    closeQuiz: makeCloseQuiz({ flow: x.flow }),
    startQuiz: makeStartQuiz(start),
    openQuiz: makeOpenQuiz(start),
    openScoreStep: makeOpenScoreStep(step),
    finishQuiz: makeFinishQuiz({ flow: x.flow }),
    onQuizDone: makeQuizDone(step),
    resetQuiz: makeResetQuiz({ answers: x.answers, flow: x.flow, score: x.score }),
    addJobProv: makeAddProv({ answers: x.answers, flow: x.flow, province: jobProv, event: TRACK_ADD_JOB_PROV }),
    addOutsideProv: makeAddProv({
      answers: x.answers, flow: x.flow, province: outsideProv, event: TRACK_ADD_OUTSIDE_PROV,
    }),
    onScoreProgress: makeScoreProgress({ score: x.score }),
    onScoreAnswers: makeScoreAnswers({ answers: x.answers, score: x.score }),
    onScoreComplete: makeScoreComplete({ flow: x.flow }),
    onScoreBack: makeScoreBack(step),
    onAuthDone: makeAuthDone({ auth: x.auth, answers: x.answers }),
    onAuthClose: makeAuthClose({ flow: x.flow }),
    onBuildProfile: makeBuildProfile(step),
    onOccChange: makeOccChange({ answers: x.answers }),
    onOccDone: makeOccDone(step),
    onQuizBack: makeQuizBack(step),
    onProvChange: makeProvChange({ answers: x.answers }),
    onProvFinish: makeProvFinish(step),
    onProvDone: makeProvDone(step),
    onProvBack: makeProvBack(step),
    onQuizPatch: makeQuizPatch({ answers: x.answers }),
    onQuizComplete: makeQuizComplete(step),
    onScoreEdit: makeScoreEdit(start),
    onPickProv: makePickProv(start),
  }
}

/**
 * 不带 key 的入口钮手柄(钮的 onClick 会把鼠标事件当第一个实参递进来,
 * 而 startQuiz 的第一个参数是条件格 key —— 直接接上去会把事件当 key 用)。
 *
 * @param x 同 makeStartQuiz。
 * @returns 手柄。
 */
export function makeOpenQuiz(x: StartQuizIn): ClickFn {
  return function openQuiz(): void {
    makeStartQuiz(x)()
  }
}

/**
 * 该省近几轮**有分数线**的抽选(日期倒序)。没有分数线的轮次与只发通知的轮次都不进 ——
 * 拿它当 0 比就是编。洗完这一步之后分数线一定有值,下游不必再逐处判空。
 *
 * @param x 抽选记录全量与省码。
 * @returns 这个省最近那几轮。
 */
export function recentDrawsOf(x: RecentDrawsIn): LineDraw[] {
  const out: LineDraw[] = []
  for (const d of x.draws) {
    if (d.province !== x.province) {
      continue
    }
    if (typeof d.score !== 'number') {
      continue
    }
    if (d.kind === DRAW_KIND_NOTICE) {
      continue
    }
    out.push({ drawDate: d.drawDate, stream: d.stream, score: d.score, streamZh: d.streamZh })
  }
  out.sort(byLineDateDesc)
  return out.slice(0, LINE_DRAWS_MAX)
}

/**
 * 抽选按日期倒序(最近的在最前)。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 排序名次。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死(宪法钦定的豁免形态)
export function byLineDateDesc(a: LineDraw, b: LineDraw): number {
  return b.drawDate.localeCompare(a.drawDate)
}

/**
 * 对照线出自哪条通道;空串 = 该省不按通道设线(如 AB),那时全部轮次都拿来对照。
 *
 * @param x 这个省的估分。
 * @returns 通道原名;空串 = 不按通道设线。
 */
export function lineRefStreamOf(x: LineRefIn): string {
  if (x.score == null) {
    return TEXT_NONE
  }
  if (x.score.refStream == null) {
    return TEXT_NONE
  }
  return x.score.refStream
}

/**
 * 只列**对得上的那条通道**(2026-08-16 Frank「我的职业是 it 有必要 对比 其他通道的 分数吗」):
 * BC 现行按通道分别设线,一个 IT 的分对着 Care: Childcare 的 102 比就是错的对照。
 * 判定层挑对照线时早就按通道匹配过(refDraw),这里跟它同一条。
 * 拿不到通道名(该省不按通道设线)或这个通道一轮都没抽过 → 照旧全列。
 *
 * @param x 抽选记录全量、省码与这个省的估分。
 * @returns 这张卡要摆的那几轮。
 */
export function lineListOf(x: LineListIn): LineDraw[] {
  if (x.province === TEXT_NONE) {
    return []
  }
  const all = recentDrawsOf({ draws: x.draws, province: x.province })
  const ref = lineRefStreamOf({ score: x.score })
  if (ref === TEXT_NONE) {
    return all
  }
  const same = all.filter(makeLineStreamMatch({ refStream: ref }))
  if (same.length === 0) {
    return all
  }
  return same
}

/**
 * 同通道判定器的工厂(`Array.prototype.filter` 的签名由语言定死,闭包变量改走显式入参)。
 *
 * @param x 对照线出自哪条通道。
 * @returns 判一轮抽选是不是同一条通道。
 */
export function makeLineStreamMatch(x: LineStreamMatchIn) {
  return function isSameStream(draw: LineDraw): boolean {
    return draw.stream === x.refStream
  }
}

/**
 * 这个省此刻摆得出的那一格估分:通道行里第一条真有分的。没有省、没有行、行上没分都给 null。
 *
 * @param x 通道行与省码。
 * @returns 估分;null = 这一刻没有分可摆。
 */
export function lineScoreOf(x: LineScoreIn): MaybePathScore {
  if (x.province === TEXT_NONE) {
    return null
  }
  for (const r of x.rows) {
    if (r.province !== x.province) {
      continue
    }
    if (r.score == null) {
      continue
    }
    return r.score
  }
  return null
}

/**
 * 页签省序里的第一个省(估分线卡的初始页签)。
 *
 * @param provinces 页签省序。
 * @returns 省码;一个省都没有给空串。
 */
export function firstLineProvOf(provinces: string[]): string {
  const [head] = provinces
  if (head == null) {
    return TEXT_NONE
  }
  return head
}

/**
 * 当前真正生效的页签省:用户点中的那个若已不在省序里(改了目标省之后),回落第一个。
 *
 * @param x 页签省序与用户点中的省。
 * @returns 省码;一个省都没有给空串。
 */
export function activeLineProvOf(x: LineProvIn): string {
  if (x.provinces.includes(x.active)) {
    return x.active
  }
  return firstLineProvOf(x.provinces)
}

/**
 * 估分线卡的省页签清单。角标只在真欠题时才挂 —— 欠 0 道也摆一个「0」,
 * 会被读成「这里有个数要看」。
 *
 * @param x 页签省序、省名取名函数与欠题数取数口。
 * @returns 页签清单。
 */
export function lineTabItemsOf(x: LineTabItemsIn): LineTabItem[] {
  const out: LineTabItem[] = []
  for (const p of x.provinces) {
    const item: LineTabItem = { key: p, label: x.provDisp(p) }
    if (x.pendingOf != null) {
      const pending = x.pendingOf(p)
      if (pending > 0) {
        item.badge = pending
      }
    }
    out.push(item)
  }
  return out
}

/**
 * 估分段答满了没有。一道题都没有(total 为 0)不算答满 —— 那是「还没取到题」。
 *
 * @param x 两个计数。
 * @returns 答满了没有。
 */
export function lineAnsweredOf(x: LineAnsweredIn): boolean {
  return x.total > 0 && x.done >= x.total
}

/**
 * 估分卡主动作钮的类:主钮随态走 —— 没选省先选省、选了省先算分,两态都是本段的主行动
 * (蓝实底);答满了退回素钮(那时它只是「改答案」)。
 *
 * @param x 当前页签省与估分段的两个计数。
 * @returns className。
 */
export function lineMainBtnClsOf(x: LineMainBtnIn): string {
  if (x.prov !== TEXT_NONE && lineAnsweredOf({ done: x.done, total: x.total })) {
    return cssOf(css.lineMainBtn)
  }
  return joinCls({ base: css.lineMainBtn, more: css.lineMainBtnOn })
}

/**
 * 估分卡主动作钮的文案:没选省 → 先选省;选了省还有欠账 → 算我的分;答满 → 改答案。
 *
 * @param x 取词函数、当前页签省与估分段的两个计数。
 * @returns 钮上的字。
 */
export function lineMainLabelOf(x: LineMainLabelIn): string {
  if (x.prov === TEXT_NONE) {
    return x.t('sl.pickProv')
  }
  if (lineAnsweredOf({ done: x.done, total: x.total })) {
    return x.t('sl.edit')
  }
  return x.t('sl.check')
}

/**
 * 估分卡主动作钮的手柄:一个省都没选时,主行动是「先去选省」而不是「去答题」。
 *
 * @param x 当前页签省与两个出口。
 * @returns 手柄。
 */
export function lineMainActOf(x: LineMainActIn): ClickFn {
  if (x.prov === TEXT_NONE) {
    return x.onPickProv
  }
  return x.onEdit
}

/**
 * 够得着 / 够不着 / 取决于加分项。判定整条来自 lib/points,本页不算一个数。
 *
 * @param score 这个省的估分与官方线。
 * @returns 三态之一。
 */
export function lineVerdictOf(score: PathScore): LineVerdict {
  return lineStateOf(score)
}

/**
 * 结论框的色档:只有真够得着才染绿。「够不着」刻意留素色 ——
 * 加分项还没勾满时那个数随时会变,染红等于替用户下结论。
 *
 * @param x 三态。
 * @returns 色档。
 */
export function lineToneOf(x: LineStateIn): LineTone {
  if (x.state === LINE_ABOVE) {
    return TONE_OK
  }
  return TONE_MUTE
}

/**
 * 结论第一行的类(达标染深绿,其余主文字色)。
 *
 * @param x 三态。
 * @returns className。
 */
export function lineYoursClsOf(x: LineStateIn): string {
  if (x.state === LINE_ABOVE) {
    return joinCls({ base: css.lineYours, more: css.lineYoursOk })
  }
  return joinCls({ base: css.lineYours, more: css.lineYoursPlain })
}

/**
 * 结论第二行的类(达标染墨绿,其余二级文字色)。
 *
 * @param x 三态。
 * @returns className。
 */
export function lineSubClsOf(x: LineStateIn): string {
  if (x.state === LINE_ABOVE) {
    return joinCls({ base: css.lineSub, more: css.lineSubOk })
  }
  return joinCls({ base: css.lineSub, more: css.lineSubPlain })
}

/**
 * 摆出来的这几轮里,你的分够得着几轮。通道对不上的轮次不计 ——
 * 拿别的通道的线比你的分是错的对照。
 *
 * @param x 这个省的估分与要摆的那几轮。
 * @returns 够得着几轮。
 */
export function lineClearsOf(x: LineClearsIn): number {
  const ref = lineRefStreamOf({ score: x.score })
  let n = 0
  for (const d of x.list) {
    if (d.score > x.score.value) {
      continue
    }
    if (ref !== TEXT_NONE && d.stream !== ref) {
      continue
    }
    n += 1
  }
  return n
}

/**
 * 够不着时还差多少分:拿**上界**去比线(上界都够不着才算真够不着),算不出上界就用下界。
 * 官方没收录线时按 0 算,差值收敛到 0 —— 不许算出一个负的「还差」。
 *
 * @param score 这个省的估分与官方线。
 * @returns 还差几分。
 */
export function lineGapToLineOf(score: PathScore): number {
  let top = score.value
  if (score.ceiling != null) {
    top = score.ceiling
  }
  let line = 0
  if (score.refLine != null) {
    line = score.refLine
  }
  return Math.max(0, line - top)
}

/**
 * 结论行的第二句。三态各说各的,**不混着说**:够得着说清够几轮、够不着说清还差几分、
 * 说不好就说它取决于加分项(算不出上界时连这句都不说,只说本站没有可对照的线)。
 * 🔴 只到「够不够线」为止 —— 不许延伸成「多久能被捞」「概率多大」(禁概率红线)。
 *
 * @param x 取词函数、三态、这个省的估分与要摆的那几轮。
 * @returns 第二句。
 */
export function lineSubTextOf(x: LineSubTextIn): string {
  if (x.state === LINE_ABOVE) {
    return x.t('sl.aboveSub', { k: lineClearsOf({ score: x.score, list: x.list }), n: x.list.length })
  }
  if (x.state === LINE_BELOW) {
    return x.t('sl.belowSub', { gap: lineGapToLineOf(x.score) })
  }
  if (x.score.ceiling != null) {
    return x.t('sl.dependsSub', { top: x.score.ceiling })
  }
  return x.t('sl.noLineSub', { top: 0 })
}

/**
 * 「你」那一格给不给差值。通道对不上不给 —— 线是事实照摆,但「你」那一栏留空,
 * 拿别的通道的线比你的分是错的对照。
 *
 * @param x 这个省的估分与这一轮抽选。
 * @returns 给不给。
 */
export function lineGapShownOf(x: LineGapIn): boolean {
  if (x.score == null) {
    return false
  }
  const ref = lineRefStreamOf({ score: x.score })
  if (ref === TEXT_NONE) {
    return true
  }
  if (x.draw.stream === TEXT_NONE) {
    return true
  }
  return x.draw.stream === ref
}

/**
 * 你的分高出这条线多少(负数 = 还差)。没有分时给 0,那时这一格根本不渲染。
 *
 * @param x 这个省的估分与这一轮抽选。
 * @returns 差值。
 */
export function lineGapOf(x: LineGapIn): number {
  if (x.score == null) {
    return 0
  }
  return x.score.value - x.draw.score
}

/**
 * 「你」那一格的字:正负号 + 绝对值。负号用 U+2212 真减号,等宽数字里才对得齐。
 *
 * @param x 这个省的估分与这一轮抽选。
 * @returns 带符号的差值。
 */
export function lineGapTextOf(x: LineGapIn): string {
  const gap = lineGapOf(x)
  if (gap >= 0) {
    return SIGN_PLUS + String(Math.abs(gap))
  }
  return SIGN_MINUS + String(Math.abs(gap))
}

/**
 * 「你」那一格的类:够得着染深绿,差着的用三级灰(不染红 —— 加分项还没勾满时它随时会变)。
 *
 * @param x 这个省的估分与这一轮抽选。
 * @returns className。
 */
export function lineGapClsOf(x: LineGapIn): string {
  if (lineGapOf(x) >= 0) {
    return joinCls({ base: css.lineGap, more: css.lineGapOk })
  }
  return joinCls({ base: css.lineGap, more: css.lineGapBad })
}

/**
 * 通道名的中文灰注出不出。**只在 zh 界面出** —— 官方原名是事实,译名是辅助,
 * 不能反过来盖掉原名;这条通道还没译时也不出。
 *
 * @param x 界面语与这一轮抽选。
 * @returns 出不出。
 */
export function streamZhShownOf(x: LineStreamTextIn): boolean {
  if (x.lang !== LANG_ZH) {
    return false
  }
  if (x.draw.streamZh == null) {
    return false
  }
  return x.draw.streamZh !== TEXT_NONE
}

/**
 * 抽选线表按日期排序的取值键。
 *
 * @param draw 这一轮抽选。
 * @returns 抽选日。
 */
export function lineDateSortOf(draw: LineDraw): string {
  return draw.drawDate
}

/**
 * 抽选线表按分数线排序的取值键。
 *
 * @param draw 这一轮抽选。
 * @returns 分数线。
 */
export function lineCutSortOf(draw: LineDraw): number {
  return draw.score
}

/**
 * 「你」那一列的排序取值器工厂(签名由 table 域的列声明定死,估分改走显式入参)。
 *
 * @param x 这个省的估分。
 * @returns 排序取值器;还没有分时整列不可比,一律沉底。
 */
export function makeLineGapSort(x: LineGapMakeIn): LineSortFn {
  return function gapSort(draw: LineDraw): number | null {
    if (x.score == null) {
      return null
    }
    return x.score.value - draw.score
  }
}

/**
 * 抽选线表的列组。列宽写死百分比,永不横滚;官方通道名不许截断(走查 #297),
 * 放不下就换行,所以宽度大头全给通道列。
 * 通道格与差值格由调用方注进来:它们产 JSX 所以住 tsx,本文件反过来 import 会成环。
 *
 * @param x 取词函数、这个省的估分与两个注进来的渲染口。
 * @returns 列组。
 */
export function lineColsOf(x: LineColsIn): PlanCol<LineDraw>[] {
  return [
    {
      key: COL_LINE_DATE,
      label: x.t('sl.date'),
      width: W_LINE_DATE,
      nowrap: true,
      sort: lineDateSortOf,
      render: LineDateCell,
    },
    {
      key: COL_LINE_STREAM,
      label: x.t('sl.stream'),
      width: W_LINE_STREAM,
      render: x.streamCell,
    },
    {
      key: COL_LINE_CUT,
      label: x.t('sl.cutoff'),
      width: W_LINE_CUT,
      align: ALIGN_RIGHT,
      sort: lineCutSortOf,
      render: LineCutCell,
    },
    {
      key: COL_LINE_YOU,
      label: x.t('sl.you'),
      width: W_LINE_YOU,
      align: ALIGN_RIGHT,
      nowrap: true,
      sort: makeLineGapSort({ score: x.score }),
      render: x.gapCell,
    },
  ]
}

/**
 * 抽选线一行的行身份。同一天可能有多轮,光靠日期分不开,所以带上它在这一屏里的序号。
 *
 * @param x 抽选日与序号。
 * @returns 行身份。
 */
export function lineRowKeyOf(x: LineRowKeyIn): string {
  return x.date + LINE_ROW_KEY_SEP + String(x.i)
}

/**
 * 抽选线表的行身份取值器。
 *
 * @param draw 这一轮抽选。
 * @param i 它在这一屏里的序号。
 * @returns 行身份。
 */
// eslint-disable-next-line local/one-parameter -- 签名由 table 域的 rowKey 定死(一行 + 它的序号)
export function lineRowKey(draw: LineDraw, i: number): string {
  return lineRowKeyOf({ date: draw.drawDate, i })
}

/**
 * 该省没有分值表时那句说明的取字口。举证口径见 CLAUDE.md「官方不公布是需要举证的断言」:
 * 调用方给得出带出处的那句就用它,给不出只能落一句「本站未收录」——
 * 两句话在用户那儿意思相反,不许混用。
 *
 * @param x 取词函数、省码与调用方那句带举证的说明。
 * @returns 那句说明。
 */
export function noGridTextOf(x: NoGridTextIn): React.ReactNode {
  if (x.noGridNote == null) {
    return x.t('sl.noTable')
  }
  return x.noGridNote(x.prov)
}

/**
 * 这一格算不算答过(「下一题」钮的放行判据):没答、空串、0 都不算,
 * 而布尔 false 算 —— 它是一个真答案(「否」),不是缺答。
 *
 * @param cell 答案档里这道题那一格。
 * @returns 答过没有。
 */
export function answeredOf(cell: AnswerCell): boolean {
  if (cell == null) {
    return false
  }
  if (cell === TEXT_NONE) {
    return false
  }
  return cell !== 0
}

/**
 * 这一格算不算答过(**起步落点**的判据)。比上面那条严一格:布尔 false 也当没答 ——
 * 起步要停在第一道「还没填出内容」的题上,而 false 在答题器里是没被点过的默认态。
 *
 * @param cell 答案档里这道题那一格。
 * @returns 答过没有。
 */
export function startAnsweredOf(cell: AnswerCell): boolean {
  if (answeredOf(cell) === false) {
    return false
  }
  return cell !== false
}

/**
 * 一道题的题干,已按当前语言取过。
 *
 * @param x 题名与界面语。
 * @returns 题干;题名认不出给空串。
 */
export function fieldTitleOf(x: FieldTitleIn): string {
  const field = getFields()[x.name]
  if (field == null) {
    return TEXT_NONE
  }
  return pickL(field.q.title as L, x.lang)
}

/**
 * 一道单选题此刻该摆的选项,文案已按当前语言取过。选项过滤目前只有一条
 * (加拿大经验不得超过总经验)—— 先前是 SurveyJS 的字符串表达式
 * `{totalExpBand} = 0 or {item} <= {totalExpBand}`,现在是字段库里的普通判定函数,少一门 DSL。
 * 断言只住这一处(字段库的值类型比三语表宽,窄化在取词这一步做完)。
 *
 * @param x 题名、全卷答案与界面语。
 * @returns 该摆的选项。
 */
export function quizChoicesOf(x: QuizChoicesIn): QuizChoiceRow[] {
  const field = getFields()[x.name]
  if (field == null) {
    return []
  }
  const out: QuizChoiceRow[] = []
  for (const c of field.q.choices) {
    if (field.q.choiceVisible != null && field.q.choiceVisible(x.bands, c.value) === false) {
      continue
    }
    out.push({ value: c.value, text: pickL(c.text as L, x.lang) })
  }
  return out
}

/**
 * 一道题的写答案手柄工厂。题名要到运行时才从字段库拿到,而答案档没有索引签名 ——
 * 所以先落进同形的字典再交出去,断言只住这一处(不用 any 把整格类型丢掉)。
 *
 * @param x 题名与逐题写答案的出口。
 * @returns 手柄。
 */
export function makeChoicePatch(x: ChoicePatchIn): BandPickFn {
  return function onPick(value: PlanBandValue): void {
    const bag: AnswerBag = {}
    bag[x.name] = value
    x.onPatch(bag as Partial<PlanAnswers>)
  }
}

/**
 * 起步落在第几题:点条件格进来的直达那道题;从后续步骤返回的落在最后一题;
 * 其余落在第一道没答的题(答过的不重走,上一题仍可回去改)。
 *
 * @param x 题名清单、全卷答案与两个落点开关。
 * @returns 题序。
 */
export function startIndexOf(x: StartIndexIn): number {
  if (x.startAt != null && x.names.includes(x.startAt)) {
    return x.names.indexOf(x.startAt)
  }
  if (x.startAtEnd) {
    return Math.max(x.names.length - 1, 0)
  }
  const bag: AnswerBag = x.bands
  let i = 0
  for (const n of x.names) {
    if (startAnsweredOf(bag[n]) === false) {
      return i
    }
    i += 1
  }
  return 0
}

/**
 * 起步题序的惰性初值工厂。只在挂载时算一次 —— 之后题序归用户的「上一题/下一题」管,
 * 答完当前题不该自己往前跳。
 *
 * @param x 同 startIndexOf。
 * @returns 惰性初值。
 */
export function makeStartIndex(x: StartIndexIn): StepIndexFn {
  return function startIndex(): number {
    return startIndexOf(x)
  }
}

/**
 * 往前翻一题的手柄工厂。
 *
 * @param x 当前题序与翻页写回口。
 * @returns 手柄。
 */
export function makeStepBack(x: StepBackIn): ClickFn {
  return function onPrev(): void {
    x.setIdx(x.at - 1)
  }
}

/**
 * 「上一题」的手柄。上一题恒在且靠左下(2026-08-10 Frank「这个没有上一题,并且上一题
 * 放到左下角」):第一题的上一题 = 调用方给的出口(决策页 = 回选职业页);不给就没有上一题。
 *
 * @param x 当前题序、翻页写回口与第一题的出口。
 * @returns 手柄;缺席 = 这一题没有上一题。
 */
export function makeQuizPrev(x: QuizPrevIn): ClickFn | undefined {
  if (x.at > 0) {
    return makeStepBack({ at: x.at, setIdx: x.setIdx })
  }
  return x.onBack
}

/**
 * 「下一题」的手柄:最后一题走整卷答完的出口,其余往后翻一题。
 *
 * @param x 当前题序、是不是最后一题、翻页写回口与答完的出口。
 * @returns 手柄。
 */
export function makeQuizNext(x: QuizNextIn): ClickFn {
  return function onNext(): void {
    if (x.last) {
      x.onComplete()
      return
    }
    x.setIdx(x.at + 1)
  }
}

/**
 * 「下一题」钮上的字:最后一题按调用方给的键取(决策页 = 看分数),
 * 没给就按段落回落(探索卷 = 更新报告,基础卷 = 出报告)。
 *
 * @param x 取词函数、是不是最后一题、调用方给的键与题单段落。
 * @returns 钮上的字。
 */
export function quizNextLabelOf(x: QuizNextLabelIn): string {
  if (x.last === false) {
    return x.t('plan.next')
  }
  if (x.doneKey != null && x.doneKey !== TEXT_NONE) {
    return x.t(x.doneKey)
  }
  if (x.stage === STAGE_EXPLORE) {
    return x.t('plan.reportUpd')
  }
  return x.t('plan.toReport')
}

/**
 * 字段库里认不认得这个题名。认不出就整题不渲染 —— 摆一个没题干没选项的空壳,
 * 比什么都不出更让人摸不着头脑。
 *
 * @param name 题名。
 * @returns 认不认得。
 */
export function fieldKnownOf(name: string): boolean {
  return getFields()[name] != null
}

/**
 * BC 工作地区档:按用户填的城市落档。大温成员市镇 → Area 1、紧邻的几个 → Area 2、其余 → Area 3。
 * 🔴 保守默认:不知道城市就落 Area 1(0 分)—— 不许用有利默认把分数吹上去。
 *
 * @param x 用户填的城市。
 * @returns 官方档位表里的档序。
 */
export function areaIndexOf(x: AreaIndexIn): number {
  const city = x.city.toLowerCase()
  for (const m of MVRD_CITIES) {
    if (city.includes(m)) {
      return AREA_MVRD
    }
  }
  for (const m of AREA2_CITIES) {
    if (city.includes(m)) {
      return AREA_NEAR
    }
  }
  return AREA_REST
}

/**
 * 存档里的一个数字格 → 能用的数。localStorage 与服务端档都可能被改坏,
 * 坏值宁可丢弃回预填,不能让一个字符串炸掉打分。
 *
 * @param v 存档里的值。
 * @returns 数;null = 这一格没存或存坏了。
 */
export function finiteOf(v: number | undefined): number | null {
  if (typeof v !== 'number') {
    return null
  }
  if (Number.isFinite(v) === false) {
    return null
  }
  return v
}

/**
 * 字符串 → 本站认的学历档。认不出就不落格(不拿默认档冒充他的答案)。
 *
 * @param value 下拉给回来的值。
 * @returns 学历档;null = 认不出。
 */
export function eduKeyOf(value: string): PlanEduKey | null {
  for (const k of EDU_KEYS) {
    if (k === value) {
      return k
    }
  }
  return null
}

/**
 * 存档里那套条件 → 只收合法值的补丁。
 *
 * @param x 存档里的那套条件。
 * @returns 能盖上去的那几格。
 */
export function storedPatchOf(x: StoredPatchIn): Partial<PlanSelfProfile> {
  const out: Partial<PlanSelfProfile> = {}
  const edu = x.stored.edu
  if (edu != null && EDU_KEYS.includes(edu)) {
    out.edu = edu
  }
  const expRecent = finiteOf(x.stored.expRecent)
  if (expRecent != null) {
    out.expRecent = expRecent
  }
  const expOlder = finiteOf(x.stored.expOlder)
  if (expOlder != null) {
    out.expOlder = expOlder
  }
  const clb1 = finiteOf(x.stored.clb1)
  if (clb1 != null) {
    out.clb1 = clb1
  }
  const clb2 = finiteOf(x.stored.clb2)
  if (clb2 != null) {
    out.clb2 = clb2
  }
  const age = finiteOf(x.stored.age)
  if (age != null) {
    out.age = age
  }
  return out
}

/**
 * 把一份补丁盖到一套条件上(逐格写,不用对象展开)。
 *
 * @param x 底子与要盖上去的那几格。
 * @returns 新的一套条件。
 */
export function mergeProfile(x: MergeProfileIn): PlanSelfProfile {
  const p = x.profile
  const out: PlanSelfProfile = {
    edu: p.edu,
    expRecent: p.expRecent,
    expOlder: p.expOlder,
    clb1: p.clb1,
    clb2: p.clb2,
    age: p.age,
  }
  const patch = x.patch
  if (patch.edu != null) {
    out.edu = patch.edu
  }
  if (patch.expRecent != null) {
    out.expRecent = patch.expRecent
  }
  if (patch.expOlder != null) {
    out.expOlder = patch.expOlder
  }
  if (patch.clb1 != null) {
    out.clb1 = patch.clb1
  }
  if (patch.clb2 != null) {
    out.clb2 = patch.clb2
  }
  if (patch.age != null) {
    out.age = patch.age
  }
  return out
}

/**
 * 把一份补丁盖到「他亲口答过的那几格」上。这一份才是入档的答案 ——
 * 预填是推出来的初值,写进档会以「新者胜」的名义把服务端档顶掉。
 *
 * @param x 已经答过的那几格与这次新答的那一格。
 * @returns 新的已答格。
 */
export function mergeProfAns(x: MergeProfAnsIn): Partial<PlanSelfProfile> {
  const out: Partial<PlanSelfProfile> = {}
  const a = x.answered
  if (a.edu != null) {
    out.edu = a.edu
  }
  if (a.expRecent != null) {
    out.expRecent = a.expRecent
  }
  if (a.expOlder != null) {
    out.expOlder = a.expOlder
  }
  if (a.clb1 != null) {
    out.clb1 = a.clb1
  }
  if (a.clb2 != null) {
    out.clb2 = a.clb2
  }
  if (a.age != null) {
    out.age = a.age
  }
  return mergeProfAnsPatch({ answered: out, patch: x.patch })
}

/**
 * 把这次新答的那一格盖到已答格上。
 *
 * @param x 已答格与这次新答的那一格。
 * @returns 新的已答格。
 */
export function mergeProfAnsPatch(x: MergeProfAnsIn): Partial<PlanSelfProfile> {
  const out = x.answered
  const patch = x.patch
  if (patch.edu != null) {
    out.edu = patch.edu
  }
  if (patch.expRecent != null) {
    out.expRecent = patch.expRecent
  }
  if (patch.expOlder != null) {
    out.expOlder = patch.expOlder
  }
  if (patch.clb1 != null) {
    out.clb1 = patch.clb1
  }
  if (patch.clb2 != null) {
    out.clb2 = patch.clb2
  }
  if (patch.age != null) {
    out.age = patch.age
  }
  return out
}

/**
 * 一格数字条件 → 补丁。
 *
 * @param x 要落的那一格与它的值。
 * @returns 补丁。
 */
export function numPatchOf(x: NumPatchIn): Partial<PlanSelfProfile> {
  const out: Partial<PlanSelfProfile> = {}
  if (x.key === KEY_INPUT_EXP_RECENT) {
    out.expRecent = x.value
  }
  if (x.key === KEY_INPUT_EXP_OLDER) {
    out.expOlder = x.value
  }
  if (x.key === KEY_INPUT_CLB1) {
    out.clb1 = x.value
  }
  if (x.key === KEY_INPUT_CLB2) {
    out.clb2 = x.value
  }
  if (x.key === KEY_INPUT_AGE) {
    out.age = x.value
  }
  return out
}

/**
 * 受 limits 收窄的那四道精确题的题名。
 *
 * @returns 题名清单。
 */
export function scoreLimitKeys(): ScoreLimitKey[] {
  return [KEY_INPUT_CLB1, KEY_INPUT_CLB2, KEY_INPUT_EXP_RECENT, KEY_INPUT_EXP_OLDER]
}

/**
 * 勾选表落一格(同簇的其余条一并放下)。
 *
 * @param x 现有勾选表、要改的那一格与同簇的其余条。
 * @returns 新的勾选表。
 */
export function withFlag(x: WithFlagIn): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const k of Object.keys(x.map)) {
    out[k] = x.map[k] === true
  }
  out[x.key] = x.on
  if (x.on) {
    for (const s of x.off) {
      out[s] = false
    }
  }
  return out
}

/**
 * 直选表落一格;seq 给 null 就把这一格撤回(空值 = 未回答 = 0 分,不在前端另造规则)。
 *
 * @param x 现有直选表、题 key 与选中的官方行序号。
 * @returns 新的直选表。
 */
export function withRow(x: WithRowIn): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of Object.keys(x.map)) {
    const v = x.map[k]
    if (v != null) {
      out[k] = v
    }
  }
  if (x.seq == null) {
    delete out[x.key]
    return out
  }
  out[x.key] = x.seq
  return out
}

/**
 * 预填年龄吸附到下拉选项。答题档位给的是 33 这类档中值,不在选项表里 select 会显示成第一项,
 * 显示与打分口径就分叉了 —— 吸最近项,显示 = 实际用的值。
 *
 * @param x 预填给的年龄。
 * @returns 选项表里最近的那一档。
 */
export function nearestAgeOf(x: NearestAgeIn): number {
  let best = x.age
  let gap = -1
  for (const a of AGE_OPTIONS) {
    const d = Math.abs(a - x.age)
    if (gap < 0 || d < gap) {
      gap = d
      best = a
    }
  }
  return best
}

/**
 * 分值卡初始的那一套条件:默认档 → 基础卷 CLB → 答案预填(年龄吸附)→ 存档 → 范围收窄。
 * 存档优先于预填(2026-08-15 Frank「选的是本科一刷新就变成高中」):预填是推出来的初值,
 * 存档是他亲口答的。
 *
 * @param x 基础卷 CLB、答案预填、选项范围与分值卡存档。
 * @returns 初始条件。
 */
export function initialProfileOf(x: InitialProfileIn): PlanSelfProfile {
  let p: PlanSelfProfile = defaultProfile()
  if (x.profileClb != null) {
    p = mergeProfile({ profile: p, patch: { clb1: x.profileClb } })
  }
  p = mergeProfile({ profile: p, patch: x.initial })
  if (x.initial.age != null) {
    p = mergeProfile({ profile: p, patch: { age: nearestAgeOf({ age: x.initial.age }) } })
  }
  p = mergeProfile({ profile: p, patch: storedPatchOf({ stored: x.stored }) })
  return clampToRange({ profile: p, limits: x.limits })
}

/**
 * 范围外的预填吸回范围内。范围只剩一个值时这一题不会再问,所以这里必须已经是那个值。
 *
 * @param x 当前这一套条件与选项范围。
 * @returns 落在范围内的条件。
 */
export function clampToRange(x: ClampRangeIn): PlanSelfProfile {
  let p = x.profile
  for (const key of scoreLimitKeys()) {
    const allowed = x.limits[key]
    if (allowed == null || allowed.length === 0) {
      continue
    }
    const first = allowed[0]
    if (first == null) {
      continue
    }
    if (allowed.includes(p[key])) {
      continue
    }
    p = mergeProfile({ profile: p, patch: numPatchOf({ key, value: first }) })
  }
  return p
}

/**
 * 存档里的一格 profile 条件填没填过。
 *
 * @param x 存档里的那套条件与要看的那一格。
 * @returns 填没填过。
 */
export function profileFilledOf(x: ProfileFilledIn): boolean {
  const p = x.profile
  if (x.key === KEY_INPUT_EDU) {
    return p.edu != null
  }
  if (x.key === KEY_INPUT_EXP_RECENT) {
    return p.expRecent != null
  }
  if (x.key === KEY_INPUT_EXP_OLDER) {
    return p.expOlder != null
  }
  if (x.key === KEY_INPUT_CLB1) {
    return p.clb1 != null
  }
  if (x.key === KEY_INPUT_CLB2) {
    return p.clb2 != null
  }
  if (x.key === KEY_INPUT_AGE) {
    return p.age != null
  }
  return false
}

/**
 * 这一格没存值时,预填还给不给得出正确值。clb1 恒有基础卷预填;
 * expRecent/expOlder 在不拆段(非 SK)的表里 = 基础卷总经验 —— 这两类显示是对的,已答标记留着。
 *
 * @param x profile 那一格的键与拆段开关。
 * @returns 预填给不给得出。
 */
export function prefillOkOf(x: PrefillOkIn): boolean {
  if (x.key === KEY_INPUT_CLB1) {
    return true
  }
  if (x.splitWork) {
    return false
  }
  if (x.key === KEY_INPUT_EXP_RECENT) {
    return true
  }
  return x.key === KEY_INPUT_EXP_OLDER
}

/**
 * 这条已答标记留不留。修复前丢了值的 profile 题(标了「已答」却没存值、预填也给不出正确值的)
 * 摘掉标记 —— 宁可回「待填写」请他重答一次,也不拿默认档冒充他的答案。
 *
 * @param x 已答标记的键、分值卡存档与拆段开关。
 * @returns 留不留。
 */
export function extraKeptOf(x: ExtraKeptIn): boolean {
  if (x.key.startsWith(KEY_SCORE_PROFILE_HEAD) === false) {
    return true
  }
  const key = x.key.slice(KEY_SCORE_PROFILE_HEAD.length)
  if (profileFilledOf({ profile: x.stored.profile, key })) {
    return true
  }
  return prefillOkOf({ key, splitWork: x.splitWork })
}

/**
 * 旧档自愈(初始挂载与拉服务端档共用同一把)。
 *
 * @param x 分值卡存档与拆段开关。
 * @returns 自愈后的已答标记。
 */
export function healedExtraOf(x: HealedExtraIn): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const key of Object.keys(x.stored.extraAnswered)) {
    if (extraKeptOf({ key, stored: x.stored, splitWork: x.splitWork })) {
      out[key] = x.stored.extraAnswered[key] === true
    }
  }
  return out
}

/**
 * 岗位语境里的职业码;'' = 无岗态拿不到。
 *
 * @param ctx 岗位语境。
 * @returns 5 位职业码;'' = 不知道。
 */
export function scoreNocOf(ctx: ScoreContext): string {
  if (ctx.noc == null) {
    return TEXT_NONE
  }
  return ctx.noc
}

/**
 * 岗位语境里的目标省;'' = 无岗态拿不到。
 *
 * @param ctx 岗位语境。
 * @returns 两位省码;'' = 不知道。
 */
export function scoreTargetProvOf(ctx: ScoreContext): string {
  if (ctx.province == null) {
    return TEXT_NONE
  }
  return ctx.province
}

/**
 * 加分项的勾选键。
 *
 * @param x 省码、因素名与官方行序号。
 * @returns 勾选键。
 */
export function tickKeyOf(x: TickKeyIn): string {
  return x.prov + SCORE_KEY_SEP + x.factor + SCORE_KEY_SEP + String(x.seq)
}

/**
 * 直选档位那道题的题 key。
 *
 * @param x 省码与因素名。
 * @returns 题 key。
 */
export function provFactorKeyOf(x: ProvFactorKeyIn): string {
  return x.prov + SCORE_KEY_SEP + x.factor
}

/**
 * 一屏加分题的题 key(省码:因素:批)。
 *
 * @param x 省码、因素名与这一屏从第几条起。
 * @returns 题 key。
 */
export function bonusScreenKeyOf(x: BonusScreenKeyIn): string {
  return x.prov + SCORE_KEY_SEP + x.factor + SCORE_KEY_SEP + String(x.at)
}

/**
 * 勾选键里的因素名。
 *
 * @param key 勾选键。
 * @returns 因素名;'' = 这个键不成形。
 */
export function tickFactorOf(key: string): string {
  const factor = key.split(SCORE_KEY_SEP)[TICK_KEY_FACTOR_POS]
  if (factor == null) {
    return TEXT_NONE
  }
  return factor
}

/**
 * 时薪的回显文字。
 *
 * @param wage 时薪。
 * @returns 「$28/hr」这样的一句。
 */
export function rateTextOf(wage: number): string {
  return RATE_HEAD + String(wage) + RATE_TAIL
}

/**
 * 有官方分值表的省。有表的省由数据层决定,加省不用改这里;目标省排第一列,
 * 其余省作「换省」对照。
 *
 * @param x 官方分值表与目标省。
 * @returns 省码清单。
 */
export function scoreProvincesOf(x: ScoreProvincesIn): string[] {
  const out: string[] = []
  for (const f of x.factors) {
    if (f.province === TEXT_NONE) {
      continue
    }
    if (out.includes(f.province)) {
      continue
    }
    out.push(f.province)
  }
  out.sort(makeTargetFirst({ province: x.province }))
  return out
}

/**
 * 省序比较器:目标省在最前,其余按省码字母序。
 *
 * @param x 目标省。
 * @returns 比较器。
 */
export function makeTargetFirst(x: TargetFirstIn) {
  return function byTargetFirst(a: string, b: string): number {
    if (a === x.province) {
      return -1
    }
    if (b === x.province) {
      return 1
    }
    if (a < b) {
      return -1
    }
    return 1
  }
}

/**
 * 这个省的官方分值行。
 *
 * @param x 官方分值表与省码。
 * @returns 该省的行。
 */
export function provFactorsOf(x: ProvFactorsIn): PlanScoreFactor[] {
  const out: PlanScoreFactor[] = []
  for (const f of x.factors) {
    if (f.province === x.prov) {
      out.push(f)
    }
  }
  return out
}

/**
 * 这个省有档位行的那几个因素名(去重,保持官方表的出现顺序)。
 *
 * @param x 官方分值表与省码。
 * @returns 因素名清单。
 */
export function factorNamesOf(x: ProvFactorsIn): string[] {
  const out: string[] = []
  for (const f of x.factors) {
    if (f.province !== x.prov) {
      continue
    }
    if (f.kind !== KIND_ROW) {
      continue
    }
    if (out.includes(f.factor)) {
      continue
    }
    out.push(f.factor)
  }
  return out
}

/**
 * 这个省这个因素的全部官方档位行。
 *
 * @param x 官方分值表、省码与因素名。
 * @returns 档位行。
 */
export function rowsOfFactorOf(x: RowsOfFactorIn): PlanScoreFactor[] {
  const out: PlanScoreFactor[] = []
  for (const f of x.factors) {
    if (f.province !== x.prov) {
      continue
    }
    if (f.factor !== x.name) {
      continue
    }
    if (f.kind !== KIND_ROW) {
      continue
    }
    out.push(f)
  }
  return out
}

/**
 * 这个因素要不要用户自己直选档位。已有 profile / 岗位映射的一律不问 ——
 * 岗位语境给得出 TEER 与职业大类时也不问,那是把同一件事问第二遍。
 *
 * @param x 因素名、省码与岗位语境。
 * @returns 问不问。
 */
export function manualAskedOf(x: ManualAskedIn): boolean {
  if (AUTO_FACTORS.includes(x.name)) {
    return false
  }
  if (x.name === FACTOR_AREA && x.prov === PROV_BC) {
    return false
  }
  if (x.name === FACTOR_TEER_CAT && x.ctx.teer != null) {
    return false
  }
  return (x.name === FACTOR_OCC_CAT && NOC_CODE_RE.test(scoreNocOf(x.ctx))) === false
}

/**
 * 官方表里没有通用自动映射、要用户自己直选档位的那几道题。
 *
 * @param x 有表的省、官方分值表与岗位语境。
 * @returns 逐题。
 */
export function manualQuestionsOf(x: ManualQuestionsIn): ManualQuestion[] {
  const out: ManualQuestion[] = []
  for (const prov of x.provinces) {
    for (const name of factorNamesOf({ factors: x.factors, prov })) {
      if (manualAskedOf({ name, prov, ctx: x.ctx }) === false) {
        continue
      }
      out.push({
        prov,
        name,
        key: provFactorKeyOf({ prov, factor: name }),
        rows: rowsOfFactorOf({ factors: x.factors, prov, name }),
      })
    }
  }
  return out
}

/**
 * 行级适用范围:官方给了 NOC 清单的行,不在清单里就**不问**。实例:BC「执业资格 +5」
 * 原文写明只对 11 类职业成立(牙助/幼教/护理助理/技工…),干软件的被问到这一条既多点一次、
 * 又误导(2026-08-11 Frank 点名)。清单在数据层展开好,这里只做集合判断 ——
 * 规则串坏了就照问,宁可多问一句,不静默吞掉用户可能有的 5 分。
 *
 * @param x 官方表的一行与职业码。
 * @returns 这一行对这个职业成不成立。
 */
export function rowAppliesOf(x: RowAppliesIn): boolean {
  if (x.row.rule === TEXT_NONE) {
    return true
  }
  let list: Record<string, string> | null = null
  try {
    const parsed: RowRuleJson = JSON.parse(x.row.rule)
    if (parsed.appliesNoc != null) {
      list = parsed.appliesNoc
    }
  } catch {
    return true
  }
  if (list == null) {
    return true
  }
  const hit = list[x.noc]
  if (hit == null) {
    return false
  }
  return hit !== ''
}

/**
 * 基础卷答过范围的条件,精确题只在范围内给选项。
 *
 * @param x 选项范围、题名与全部候选值。
 * @returns 可选值。
 */
export function inRangeOf(x: InRangeIn): number[] {
  const allowed = x.limits[x.key]
  if (allowed == null) {
    return x.all
  }
  const out: number[] = []
  for (const n of x.all) {
    if (allowed.includes(n)) {
      out.push(n)
    }
  }
  return out
}

/**
 * 官方档位文字里的所有数字(TEER 档与职业大类那两行按数字集合判命中)。
 *
 * @param label 官方原文标签。
 * @returns 数字。
 */
export function digitsOf(label: string): number[] {
  const out: number[] = []
  const found = label.match(LABEL_DIGIT_RE)
  if (found == null) {
    return out
  }
  for (const s of found) {
    out.push(Number(s))
  }
  return out
}

/**
 * 一条官方时薪档位行是不是命中这个时薪。官方档位文字自己写着区间
 * (「Less than $20」「$20 to $24.99」「$40 per hour or higher」),按它读。
 *
 * @param x 官方的一条档位行与时薪。
 * @returns 命不命中。
 */
export function wageRowHitOf(x: WageRowHitIn): boolean {
  const nums: number[] = []
  const found = x.row.label.match(LABEL_NUM_RE)
  if (found != null) {
    for (const s of found) {
      nums.push(Number(s))
    }
  }
  const [lo, hi] = nums
  if (lo == null) {
    return false
  }
  if (LABEL_UNDER_RE.test(x.row.label)) {
    return x.wage < lo
  }
  if (LABEL_OVER_RE.test(x.row.label)) {
    return x.wage >= lo
  }
  if (hi == null) {
    return false
  }
  return x.wage >= lo && x.wage <= hi
}

/**
 * 用户填的时薪落在哪一行。**读不出或读出多行就返回 null**,那就照旧问用户 ——
 * 前端不替官方编档。
 *
 * @param x 该省时薪因素的全部档位行与时薪。
 * @returns 命中的那一行;null = 落不出唯一一档。
 */
export function wageRowAt(x: WageRowIn): PlanScoreFactor | null {
  const hits: PlanScoreFactor[] = []
  for (const r of x.rows) {
    if (wageRowHitOf({ row: r, wage: x.wage })) {
      hits.push(r)
    }
  }
  if (hits.length !== 1) {
    return null
  }
  const [only] = hits
  if (only == null) {
    return null
  }
  return only
}

/**
 * 分制全名结尾括号里自报的通道名。声明了通道的省只认同一条通道的抽选 ——
 * ON 已公布的分数线全是改制前已关停通道的 EOI 分,与新通道不是同一套分制,拿来对照就是错的锚。
 *
 * @param system 分制全名。
 * @returns 通道名;'' = 这个省不按通道设线。
 */
export function gridStreamOfSystem(system: string): string {
  const hit = SYSTEM_STREAM_RE.exec(system)
  if (hit == null) {
    return TEXT_NONE
  }
  const groups = hit.groups
  if (groups == null) {
    return TEXT_NONE
  }
  const stream = groups.stream
  if (stream == null) {
    return TEXT_NONE
  }
  return stream
}

/**
 * 抽选按日期倒序(最近的在最前)。
 *
 * @param a 前一轮。
 * @param b 后一轮。
 * @returns 排序名次。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死(宪法钦定的豁免形态)
export function byDrawDateDesc(a: PlanDraw, b: PlanDraw): number {
  return b.drawDate.localeCompare(a.drawDate)
}

/**
 * 近期各通道分数线的区间。
 *
 * @param scored 有分数线的那几轮。
 * @returns 区间。
 */
export function drawRangeOf(scored: PlanDraw[]): DrawRange {
  let lo = 0
  let hi = 0
  let seen = false
  for (const d of scored) {
    if (d.score == null) {
      continue
    }
    if (seen === false) {
      lo = d.score
      hi = d.score
      seen = true
      continue
    }
    if (d.score < lo) {
      lo = d.score
    }
    if (d.score > hi) {
      hi = d.score
    }
  }
  return { lo, hi, n: scored.length }
}

/**
 * 对照锚,按可信度排序:①本岗所在通道的最近一次抽选;②官方申请门槛;
 * ③都没有 → 只摆近期各通道分数线区间,**不给差分结论**(拿别的通道的线判你差多少分是编)。
 *
 * @param x 这个省的估分、抽选记录与你的职业命中的通道名。
 * @returns 对照锚。
 */
export function scoreAnchorOf(x: ScoreAnchorIn): ScoreAnchor {
  const gridStream = gridStreamOfSystem(x.score.system)
  const all: PlanDraw[] = []
  for (const d of x.draws) {
    if (d.province !== x.score.province || d.kind === DRAW_KIND_NOTICE || d.score == null) {
      continue
    }
    all.push(d)
  }
  const scored: PlanDraw[] = []
  for (const d of all) {
    if (gridStream === TEXT_NONE || streamMatches({ drawStream: d.stream, gridStream })) {
      scored.push(d)
    }
  }
  scored.sort(byDrawDateDesc)
  let latest: PlanDraw | null = null
  for (const d of scored) {
    if (latest == null && streamMatches({ drawStream: d.stream, gridStream: x.matchedStream })) {
      latest = d
    }
  }
  let line = x.score.passMark
  if (latest != null && latest.score != null) {
    line = latest.score
  }
  let range: DrawRange | null = null
  if (line == null && scored.length > 0) {
    range = drawRangeOf(scored)
  }
  return { scored, latest, line, hasOtherStreamDraws: scored.length === 0 && all.length > 0, range }
}

/**
 * 一组加分项行 → 逐行同一个结论(推得出「全否」时用)。
 *
 * @param x 这一组的行与要落的结论。
 * @returns 逐行结论。
 */
export function sameForRowsOf(x: SameForRowsIn): Record<number, boolean> {
  const out: Record<number, boolean> = {}
  for (const r of x.rows) {
    out[r.seq] = x.on
  }
  return out
}

/**
 * 学历完成地(#305):canadaEduBand=2(无加拿大学历)→ 本省/外省两行皆否;
 * =1 且 eduProv 已答 → eduProv 是本省命中「本省完成」行,否则命中「外省完成」行
 * (按行文 another province 识别行,不赌行序);没答/不清楚 → 推不出。
 *
 * @param x 基础卷答案、省码与这一组的行。
 * @returns 逐行结论;null = 推不出,照旧出题。
 */
export function deriveEduLocationOf(x: DeriveBonusIn): Record<number, boolean> | null {
  if (x.basics.canadaEduBand === CANADA_EDU_NONE) {
    return sameForRowsOf({ rows: x.rows, on: false })
  }
  if (x.basics.canadaEduBand !== CANADA_EDU_HAS || x.basics.eduProv === TEXT_NONE) {
    return null
  }
  const out: Record<number, boolean> = {}
  for (const r of x.rows) {
    if (ANOTHER_PROV_RE.test(r.label)) {
      out[r.seq] = x.basics.eduProv !== x.prov
      continue
    }
    out[r.seq] = x.basics.eduProv === x.prov
  }
  return out
}

/**
 * 双语加分(#305):行文含 both English and French,门槛分从官方行文解析(如 AB 的 4)。
 * 法语侧由 frenchBand 判 —— 2026-08-16 起它是**档位**(NCLC 等级),直接与门槛比;
 * 不会或不到门槛按不满足计(硬约束:不许用有利默认把分数吹上去)。
 * 英语侧由基础卷精确 CLB 档判(「还没考」= CLB 0)。任一侧没答或门槛解析不出 → 推不出。
 *
 * @param x 基础卷答案与这一组的行。
 * @returns 逐行结论;null = 推不出,照旧出题。
 */
export function deriveBilingualOf(x: DeriveBonusIn): Record<number, boolean> | null {
  const [langRow] = x.rows
  if (x.rows.length !== 1 || langRow == null || BILINGUAL_RE.test(langRow.label) === false) {
    return null
  }
  const hit = LANG_THRESHOLD_RE.exec(langRow.label)
  if (hit == null || hit.groups == null || hit.groups.n == null) {
    return null
  }
  const need = Number(hit.groups.n)
  if (x.basics.frenchBand === 0 || x.basics.frenchBand === BAND_UNKNOWN) {
    return null
  }
  const out: Record<number, boolean> = {}
  if (nclcLevelOf(x.basics.frenchBand) < need) {
    out[langRow.seq] = false
    return out
  }
  if (x.basics.clbBand === 0) {
    return null
  }
  out[langRow.seq] = clbLevelOf(x.basics.clbBand) >= need
  return out
}

/**
 * 法语档 → NCLC 等级;档超出表就当没有(不许用有利默认把分数吹上去)。
 *
 * @param band 基础卷的法语档。
 * @returns NCLC 等级。
 */
export function nclcLevelOf(band: number): number {
  const level = NCLC[band]
  if (level == null) {
    return 0
  }
  return level
}

/**
 * 英语档 → CLB 等级;档超出表就当没有。
 *
 * @param band 基础卷的语言档。
 * @returns CLB 等级。
 */
export function clbLevelOf(band: number): number {
  const level = CLB[band]
  if (level == null) {
    return 0
  }
  return level
}

/**
 * #305:能从基础卷答案推导的加分项不再出题 —— 返回 null = 推不出(照旧出题);
 * 返回逐行结论 = 直接进算分并回显为已填。
 * 加拿大经验所在地(workLocationCanada):expBand=1(加拿大经验「没有」= 0 个月)→
 * 「本省/外省 ≥6 个月加拿大经验」必然全否;有经验时不知道攒在哪省、够不够 6 个月 → 推不出。
 *
 * @param x 基础卷答案、省码、因素名与这一组的行。
 * @returns 逐行结论;null = 推不出。
 */
export function deriveBonusOf(x: DeriveBonusIn): Record<number, boolean> | null {
  if (x.factor === FACTOR_EDU_LOCATION) {
    return deriveEduLocationOf(x)
  }
  if (x.factor === FACTOR_WORK_LOCATION) {
    if (x.basics.expBand === EXP_BAND_NONE) {
      return sameForRowsOf({ rows: x.rows, on: false })
    }
    return null
  }
  if (x.factor === FACTOR_LANGUAGE) {
    return deriveBilingualOf(x)
  }
  return null
}

/**
 * 推导格的回显:单行组 = 官方行文 + 是/否;多行组 = 组名 + 命中的官方行文。
 * 格式与答过的题一致;点它不再有题可进,改答案回基础卷改。
 *
 * @param x 取词函数、界面语、省码、因素名、这一组的行与推导结论。
 * @returns 回显一行。
 */
export function derivedEchoOf(x: DerivedEchoIn): ScoreCardEchoRow {
  const hit: PlanScoreFactor[] = []
  for (const r of x.rows) {
    if (x.derived[r.seq] === true) {
      hit.push(r)
    }
  }
  const key = bonusScreenKeyOf({ prov: x.prov, factor: x.factor, at: 0 })
  const [only] = x.rows
  if (x.rows.length === 1 && only != null) {
    let value = x.t('ps.no')
    if (hit.length > 0) {
      value = x.t('ps.yes')
    }
    return { key, prov: x.prov, label: officialLabel({ raw: only.label, lang: x.lang }), value, filled: true }
  }
  return {
    key,
    prov: x.prov,
    label: factorTitleOf({ t: x.t, factor: x.factor }),
    value: hitLabelsOf({ lang: x.lang, t: x.t, rows: hit }),
    filled: true,
  }
}

/**
 * 命中的那几条官方行文连成一句;一条都没命中就是「否」。
 *
 * @param x 界面语、取词函数与命中的那几条。
 * @returns 一句话。
 */
export function hitLabelsOf(x: HitLabelsIn): string {
  if (x.rows.length === 0) {
    return x.t('ps.no')
  }
  const texts: string[] = []
  for (const r of x.rows) {
    texts.push(officialLabel({ raw: r.label, lang: x.lang }))
  }
  return texts.join(sepOf(x.lang))
}

/**
 * 官方因素名 → 题干。文案表没收录就退回因素名本身(空标题比原文更让人摸不着头脑)。
 *
 * @param x 取词函数与因素名。
 * @returns 题干。
 */
export function factorTitleOf(x: FactorTitleIn): string {
  const text = x.t(KEY_PS_FACTOR_HEAD + x.factor)
  if (text === TEXT_NONE) {
    return x.factor
  }
  return text
}

/**
 * 学历档 → 字段库 eduBand;认不出就当没答。
 *
 * @param edu 学历档。
 * @returns 字段库的学历档值。
 */
export function eduKeyBandOf(edu: string): number {
  const band = EDU_KEY_BAND[edu]
  if (band == null) {
    return 0
  }
  return band
}

/**
 * 年龄 → 字段库 ageBand。
 *
 * @param age 年龄。
 * @returns 字段库的年龄档值。
 */
export function ageBandOfAge(age: number): number {
  for (const step of AGE_BAND_STEPS) {
    if (age <= step.max) {
      return step.band
    }
  }
  return AGE_BAND_LAST
}

/**
 * 字段库有对应档位的写回统一答案(单一来源)。判定引擎(profile-pathways)只认
 * eduBand/ageBand —— 不写回 = 答了白答(CRS 三件套 age/clb/edu 永远凑不齐,估分出不来)。
 *
 * @param patch 这次落的那一格。
 */
export function writeProfileBands(patch: Partial<PlanSelfProfile>): void {
  if (patch.edu != null) {
    writeAnswers({ eduBand: eduKeyBandOf(patch.edu) })
  }
  if (patch.age != null) {
    writeAnswers({ ageBand: ageBandOfAge(patch.age) })
  }
}

/**
 * 「你的条件」一项落格的手柄。
 *
 * @param x 两个状态格。
 * @returns 手柄。
 */
export function makeProfileAct(x: ScoreActsIn): ProfilePickFn {
  return function onProfile(patch: Partial<PlanSelfProfile>): void {
    x.profile.setProfile(function nextProfile(p: PlanSelfProfile): PlanSelfProfile {
      return mergeProfile({ profile: p, patch })
    })
    x.profile.setProfAns(function nextAnswered(m: Partial<PlanSelfProfile>): Partial<PlanSelfProfile> {
      return mergeProfAns({ answered: m, patch })
    })
    writeProfileBands(patch)
  }
}

/**
 * 官方档位直选落格的手柄。
 *
 * @param x 两个状态格。
 * @returns 手柄。
 */
export function makeRowAct(x: ScoreActsIn): RowPickFn {
  return function onRow(p: RowPickIn): void {
    x.answers.setRowAnswers(function nextRows(m: Record<string, number>): Record<string, number> {
      return withRow({ map: m, key: p.key, seq: p.seq })
    })
  }
}

/**
 * 加分项勾选落格的手柄。
 *
 * @param x 两个状态格。
 * @returns 手柄。
 */
export function makeTickAct(x: ScoreActsIn): TickPickFn {
  return function onTick(p: TickPickIn): void {
    x.answers.setTicks(function nextTicks(m: Record<string, boolean>): Record<string, boolean> {
      return withFlag({ map: m, key: p.key, on: p.on, off: p.siblings })
    })
  }
}

/**
 * 「答过了」标记的手柄。
 *
 * @param x 两个状态格。
 * @returns 手柄。
 */
export function makeMarkAnsweredAct(x: ScoreActsIn): MarkAnsweredFn {
  return function onMark(key: string): void {
    x.answers.setExtraAnswered(function nextAnswered(m: Record<string, boolean>): Record<string, boolean> {
      return withFlag({ map: m, key, on: true, off: [] })
    })
  }
}

/**
 * 分值卡的落格总口 —— 出题机器与结果区共用这一副手柄,答案只有一处写入。
 *
 * @param x 两个状态格。
 * @returns 落格总口。
 */
export function scoreActsOf(x: ScoreActsIn): ScoreActs {
  return {
    pickProfile: makeProfileAct(x),
    pickWage: x.answers.setWage,
    pickArea: x.answers.setAreaI,
    pickRow: makeRowAct(x),
    pickTick: makeTickAct(x),
    markAnswered: makeMarkAnsweredAct(x),
  }
}

/**
 * 分值卡存档回写。offer 没真答过就不入档(理由见 ScoreAnswerPanel.offerTouched)。
 *
 * @param x 两个状态格。
 */
export function writeScoreStore(x: ScoreStoreIn): void {
  const out: PlanScoreStore = {
    ticks: x.answers.ticks,
    rowAnswers: x.answers.rowAnswers,
    extraAnswered: x.answers.extraAnswered,
    profile: x.profile.profAns,
    wage: x.answers.wage,
    areaI: x.answers.areaI,
  }
  if (x.answers.offerTouched) {
    out.hasOffer = x.answers.hasOffer
  }
  writeScoreAnswers(out)
}

/**
 * 选中一档的手柄(选中**不自动跳** —— 2026-07-31 拍板,全站答题同一条规矩:
 * 自动跳会在选中的瞬间换掉整屏,看着就是「闪一下」,也没法改主意)。
 *
 * @param x 落格总口与要落的那一格。
 * @returns 手柄。
 */
export function makeProfilePick(x: ProfilePickMakeIn): ClickFn {
  return function onPick(): void {
    x.acts.pickProfile(x.patch)
  }
}

/**
 * 直选一个官方档位的手柄。
 *
 * @param x 落格总口、题 key 与官方行序号。
 * @returns 手柄。
 */
export function makeRowPick(x: RowPickMakeIn): ClickFn {
  return function onPick(): void {
    x.acts.pickRow({ key: x.key, seq: x.seq })
  }
}

/**
 * 落一个数(时薪、地区档)的手柄。
 *
 * @param x 要落的值与落格口。
 * @returns 手柄。
 */
export function makeNumberPick(x: NumberPickMakeIn): ClickFn {
  return function onPick(): void {
    x.set(x.value)
  }
}

/**
 * 把一条加分项按死勾上或放下的手柄(单条组退回是/否单选时用)。
 *
 * @param x 落格总口、勾选键、同簇的其余条与要落的态。
 * @returns 手柄。
 */
export function makeTickSet(x: TickSetMakeIn): ClickFn {
  return function onPick(): void {
    x.acts.pickTick({ key: x.key, on: x.on, siblings: x.siblings })
  }
}

/**
 * 一条加分项的勾选手柄。
 *
 * @param x 落格总口、勾选键与同簇的其余条。
 * @returns 手柄。
 */
export function makeTickToggle(x: TickToggleMakeIn): BoolSetFn {
  return function onToggle(on: boolean): void {
    x.acts.pickTick({ key: x.key, on, siblings: x.siblings })
  }
}

/**
 * 一屏内的二选一簇号。官方原文「…, or」= 与上一条二选一(xorPrev),把连成一串的
 * xor 归成同一簇 —— 勾上一条就把同簇的另一条放下:算分本来就只取簇内最大的那条,
 * UI 放任两个都勾等于显示与口径分叉(用户勾了 8 和 6,以为 14,实际只算 8)。
 *
 * @param x 这一屏的那几条。
 * @returns 逐条的簇号。
 */
export function clusterOf(x: ClusterIn): number[] {
  const out: number[] = []
  for (let i = 0; i < x.chunk.length; i += 1) {
    if (i === 0) {
      out.push(0)
      continue
    }
    let base = 0
    const prev = out[i - 1]
    if (prev != null) {
      base = prev
    }
    const row = x.chunk[i]
    if (row != null && row.xorPrev) {
      out.push(base)
      continue
    }
    out.push(base + 1)
  }
  return out
}

/**
 * 同簇的其余条的勾选键。
 *
 * @param x 这一屏的那几条、逐条簇号、当前这一条的屏内序号与省码。
 * @returns 勾选键。
 */
export function siblingsOf(x: SiblingsIn): string[] {
  const out: string[] = []
  const mine = x.cluster[x.at]
  for (let i = 0; i < x.chunk.length; i += 1) {
    if (i === x.at || x.cluster[i] !== mine) {
      continue
    }
    const row = x.chunk[i]
    if (row != null) {
      out.push(tickKeyOf({ prov: x.prov, factor: row.factor, seq: row.seq }))
    }
  }
  return out
}

/**
 * 只有一个选项的题不占一屏 —— 基础卷已经把范围收到只剩这一个值,再问一遍
 * 是在请人推翻自己刚给的答案。
 *
 * @param x 正在攒的产物、题 key、题干、选项与条件格回显用的短名。
 */
export function pushChoiceScreen(x: ChoiceScreenIn): void {
  if (x.choices.length <= 1) {
    return
  }
  const q: ExtraQuestion = { key: x.key, title: x.title, choices: x.choices }
  if (x.echoLabel != null) {
    q.echoLabel = x.echoLabel
  }
  x.build.questions.push(q)
}

/**
 * 这一格 profile 条件问不问:决策页已经问过的不问,官方表用不着的也不问。
 *
 * @param x 已问过的那几项、这一格的键、官方分值表与要它的那几个因素名。
 * @returns 问不问。
 */
export function profileAskedOf(x: ProfileAskedIn): boolean {
  if (x.hidden.includes(x.field)) {
    return false
  }
  for (const f of x.factors) {
    if (x.names.includes(f.factor)) {
      return true
    }
  }
  return false
}

/**
 * 经验年数的选项文字:顶档说「5 年及以上」,其余说年数。
 *
 * @param x 取词函数与这一档的值。
 * @returns 选项文字。
 */
export function yearTextOf(x: NumTextIn): string {
  if (x.n === EXP_YEARS_MAX) {
    return x.t('ps.yr5')
  }
  return x.t('ps.yr', { n: x.n })
}

/**
 * CLB 的选项文字:0 = 还没考(不是「零分」,是没成绩)。
 *
 * @param x 取词函数与这一档的值。
 * @returns 选项文字。
 */
export function clbTextOf(x: NumTextIn): string {
  if (x.n === 0) {
    return x.t('ps.clbNone')
  }
  return CLB_LABEL_HEAD + String(x.n)
}

/**
 * 数字档的选项文字:语言走 CLB、年龄走年龄句、其余走年数。
 *
 * @param x 取词函数、这一档的值与这一格对应 profile 的哪个键。
 * @returns 选项文字。
 */
export function numChoiceTextOf(x: NumChoiceTextIn): string {
  if (x.field === KEY_INPUT_CLB1 || x.field === KEY_INPUT_CLB2) {
    return clbTextOf({ t: x.t, n: x.n })
  }
  if (x.field === KEY_INPUT_AGE) {
    return x.t('ps.age.v', { n: x.n })
  }
  return yearTextOf({ t: x.t, n: x.n })
}

/**
 * 一道数字档单选题的选项。
 *
 * @param x 取词函数、候选值、当前值、这一格的键与落格总口。
 * @returns 选项。
 */
export function numChoicesOf(x: NumChoicesIn): ExtraChoice[] {
  const out: ExtraChoice[] = []
  for (const n of x.values) {
    out.push({
      key: String(n),
      text: numChoiceTextOf({ t: x.t, n, field: x.field }),
      active: x.current === n,
      apply: makeProfilePick({ acts: x.acts, patch: numPatchOf({ key: x.field, value: n }) }),
    })
  }
  return out
}

/**
 * 学历那道题的选项。
 *
 * @param x 要看的全部事实与落格口。
 * @returns 选项。
 */
export function eduChoicesOf(x: ExtraQuestionsIn): ExtraChoice[] {
  const out: ExtraChoice[] = []
  for (const k of EDU_KEYS) {
    out.push({
      key: k,
      text: x.t(KEY_PS_EDU_HEAD + k),
      active: x.profile.edu === k,
      apply: makeProfilePick({ acts: x.acts, patch: { edu: k } }),
    })
  }
  return out
}

/**
 * 学历那一屏。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushEduScreen(b: ScoreBuildIn): void {
  const x = b.x
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_EDU, factors: x.factors, names: [FACTOR_EDUCATION] })) {
    pushChoiceScreen({
      build: b.build,
      key: KEY_SCORE_PROFILE_HEAD + KEY_INPUT_EDU,
      title: x.t('ps.f.education'),
      choices: eduChoicesOf(x),
    })
  }
}

/**
 * 近段经验那一屏。不拆段的表里它就是总经验,题干跟着换。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushExpRecentScreen(b: ScoreBuildIn): void {
  const x = b.x
  const names = [FACTOR_WORK, FACTOR_WORK5]
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_EXP_RECENT, factors: x.factors, names }) === false) {
    return
  }
  let title = x.t('ps.f.expTotal')
  if (x.splitWork) {
    title = x.t('ps.f.expRecent')
  }
  pushChoiceScreen({
    build: b.build,
    key: KEY_SCORE_PROFILE_HEAD + KEY_INPUT_EXP_RECENT,
    title,
    choices: numChoicesOf({
      t: x.t,
      acts: x.acts,
      field: KEY_INPUT_EXP_RECENT,
      current: x.profile.expRecent,
      values: inRangeOf({ limits: x.limits, key: KEY_INPUT_EXP_RECENT, all: SPLIT_YEARS }),
    }),
  })
}

/**
 * 远段经验(6-10 年前)那一屏。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushExpOlderScreen(b: ScoreBuildIn): void {
  const x = b.x
  const names = [FACTOR_WORK, FACTOR_WORK610]
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_EXP_OLDER, factors: x.factors, names }) === false) {
    return
  }
  pushChoiceScreen({
    build: b.build,
    key: KEY_SCORE_PROFILE_HEAD + KEY_INPUT_EXP_OLDER,
    title: x.t('ps.f.expOlder'),
    choices: numChoicesOf({
      t: x.t,
      acts: x.acts,
      field: KEY_INPUT_EXP_OLDER,
      current: x.profile.expOlder,
      values: inRangeOf({ limits: x.limits, key: KEY_INPUT_EXP_OLDER, all: SPLIT_YEARS }),
    }),
  })
}

/**
 * 第一语言那一屏。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushClb1Screen(b: ScoreBuildIn): void {
  const x = b.x
  const names = [FACTOR_LANGUAGE, FACTOR_LANGUAGE1]
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_CLB1, factors: x.factors, names }) === false) {
    return
  }
  pushChoiceScreen({
    build: b.build,
    key: KEY_SCORE_PROFILE_HEAD + KEY_INPUT_CLB1,
    title: x.t('ps.f.clb1'),
    choices: numChoicesOf({
      t: x.t,
      acts: x.acts,
      field: KEY_INPUT_CLB1,
      current: x.profile.clb1,
      values: inRangeOf({ limits: x.limits, key: KEY_INPUT_CLB1, all: CLB_VALUES }),
    }),
  })
}

/**
 * 第二语言那一屏。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushClb2Screen(b: ScoreBuildIn): void {
  const x = b.x
  const names = [FACTOR_LANGUAGE2]
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_CLB2, factors: x.factors, names }) === false) {
    return
  }
  pushChoiceScreen({
    build: b.build,
    key: KEY_SCORE_PROFILE_HEAD + KEY_INPUT_CLB2,
    title: x.t('ps.f.clb2'),
    choices: numChoicesOf({
      t: x.t,
      acts: x.acts,
      field: KEY_INPUT_CLB2,
      current: x.profile.clb2,
      values: inRangeOf({ limits: x.limits, key: KEY_INPUT_CLB2, all: CLB_VALUES }),
    }),
  })
}

/**
 * 年龄那一屏。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushAgeScreen(b: ScoreBuildIn): void {
  const x = b.x
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_AGE, factors: x.factors, names: [FACTOR_AGE] }) === false) {
    return
  }
  pushChoiceScreen({
    build: b.build,
    key: KEY_SCORE_PROFILE_HEAD + KEY_INPUT_AGE,
    title: x.t('ps.f.age'),
    choices: numChoicesOf({
      t: x.t,
      acts: x.acts,
      field: KEY_INPUT_AGE,
      current: x.profile.age,
      values: AGE_OPTIONS,
    }),
  })
}

/**
 * 「你的条件」那几屏。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushProfileScreens(b: ScoreBuildIn): void {
  pushEduScreen(b)
  pushExpRecentScreen(b)
  pushExpOlderScreen(b)
  pushClb1Screen(b)
  pushClb2Screen(b)
  pushAgeScreen(b)
}

/**
 * 时薪那道题归哪个省(按官方规则行算分的那个省)。
 *
 * @param factors 官方分值表。
 * @returns 两位省码;'' = 这批表里没有时薪规则。
 */
export function wageProvinceOf(factors: PlanScoreFactor[]): string {
  for (const f of factors) {
    if (f.factor === FACTOR_WAGE && f.kind === KIND_RULE) {
      return f.province
    }
  }
  return TEXT_NONE
}

/**
 * BC 工作地区的官方档位行。
 *
 * @param factors 官方分值表。
 * @returns 档位行。
 */
export function bcAreaRowsOf(factors: PlanScoreFactor[]): PlanScoreFactor[] {
  return rowsOfFactorOf({ factors, prov: PROV_BC, name: FACTOR_AREA })
}

/**
 * BC 工作地区那道题的选项。
 *
 * @param x 要看的事实与官方档位行。
 * @returns 选项。
 */
export function areaChoicesOf(x: AreaChoicesIn): ExtraChoice[] {
  const out: ExtraChoice[] = []
  for (let i = 0; i < x.rows.length; i += 1) {
    const r = x.rows[i]
    if (r == null) {
      continue
    }
    out.push({
      key: String(r.seq),
      text: officialLabel({ raw: r.label, lang: x.x.lang }),
      active: x.x.areaI === i,
      apply: makeNumberPick({ value: i, set: x.x.acts.pickArea }),
    })
  }
  return out
}

/**
 * 岗位事实那两屏(时薪、BC 工作地区)。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushJobScreens(b: ScoreBuildIn): void {
  const x = b.x
  if (x.wageProvince !== TEXT_NONE) {
    b.build.questions.push({
      key: TICK_WAGE,
      title: x.t('ps.in.wage'),
      number: { value: x.wage, set: x.acts.pickWage },
    })
  }
  const rows = bcAreaRowsOf(x.factors)
  if (rows.length > 0) {
    pushChoiceScreen({ build: b.build, key: TICK_AREA, title: x.t('ps.in.area'), choices: areaChoicesOf({ x, rows }) })
  }
}

/**
 * 一道直选档位题的选项。
 *
 * @param x 要看的事实、题 key 与官方档位行。
 * @returns 选项。
 */
export function rowChoicesOf(x: RowChoicesIn): ExtraChoice[] {
  const out: ExtraChoice[] = []
  for (const r of x.rows) {
    out.push({
      key: String(r.seq),
      text: officialLabel({ raw: r.label, lang: x.x.lang }),
      active: x.x.rowAnswers[x.key] === r.seq,
      apply: makeRowPick({ acts: x.x.acts, key: x.key, seq: r.seq }),
    })
  }
  return out
}

/**
 * 时薪那道档位题跳不跳过。时薪已经用数字问过一遍(BC 按每整元计分),别再让人从档位里挑
 * 同一个数 —— 落哪一档由官方档位文字自己说了算(只认唯一命中,读不出区间就照旧问)。
 *
 * @param x 要看的事实与这道题。
 * @returns 跳不跳过。
 */
export function manualWageSkippedOf(x: ManualWageSkipIn): boolean {
  if (x.q.name !== FACTOR_WAGE || x.x.wageProvince === TEXT_NONE) {
    return false
  }
  return wageRowAt({ rows: x.q.rows, wage: x.x.wage }) != null
}

/**
 * 直选档位那几屏。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushManualScreens(b: ScoreBuildIn): void {
  const x = b.x
  for (const q of x.manual) {
    if (manualWageSkippedOf({ x, q })) {
      continue
    }
    pushChoiceScreen({
      build: b.build,
      key: q.key,
      title: x.t(KEY_PS_FACTOR_HEAD + q.name),
      choices: rowChoicesOf({ x, key: q.key, rows: q.rows }),
    })
  }
}

/**
 * 这个省要出的加分项行。「手上的 offer」只归基础卷问(2026-08-15 #304):
 * 答「有」→ offer 行直接计分;答「没有」或没答 → 不计分也不再追问 —— 没答不等于有。
 * offer 前提族同闸:关闸时整族不出题,分母(已答 n/N)随之变小。
 *
 * @param x 官方分值表、省码、offer 闸与岗位语境。
 * @returns 加分项行。
 */
export function bonusRowsOf(x: BonusRowsIn): PlanScoreFactor[] {
  const out: PlanScoreFactor[] = []
  for (const f of x.factors) {
    if (f.province !== x.prov || f.kind !== KIND_BONUS) {
      continue
    }
    if (rowAppliesOf({ row: f, noc: scoreNocOf(x.ctx) }) === false) {
      continue
    }
    if (x.offerYes === false && OFFER_PREMISE_FACTORS.includes(f.factor)) {
      continue
    }
    out.push(f)
  }
  return out
}

/**
 * 加分项行里出现过的因素名(组名,保持官方表的出现顺序)。
 *
 * @param bonus 加分项行。
 * @returns 因素名。
 */
export function bonusFactorNamesOf(bonus: PlanScoreFactor[]): string[] {
  const out: string[] = []
  for (const f of bonus) {
    if (out.includes(f.factor) === false) {
      out.push(f.factor)
    }
  }
  return out
}

/**
 * 一组加分项的行。
 *
 * @param x 加分项行与组名。
 * @returns 这一组的行。
 */
export function bonusGroupRowsOf(x: BonusGroupRowsIn): PlanScoreFactor[] {
  const out: PlanScoreFactor[] = []
  for (const f of x.bonus) {
    if (f.factor === x.factor) {
      out.push(f)
    }
  }
  return out
}

/**
 * 单条组退回是/否单选的两颗选项。只有一条的组不摆一个孤零零的勾选框 ——
 * 标题就是那一条,两颗钮已经是「是/否」。
 *
 * @param x 这一屏、这一条与逐条簇号。
 * @returns 两颗选项。
 */
export function yesNoChoicesOf(x: YesNoChoicesIn): ExtraChoice[] {
  const c = x.c
  const key = tickKeyOf({ prov: c.prov, factor: x.row.factor, seq: x.row.seq })
  const on = c.x.ticks[key] === true
  const siblings = siblingsOf({ chunk: c.chunk, cluster: x.cluster, at: c.chunk.indexOf(x.row), prov: c.prov })
  return [
    {
      key: CHOICE_YES,
      text: c.x.t('ps.yes'),
      active: on,
      apply: makeTickSet({ acts: c.x.acts, key, siblings, on: true }),
    },
    {
      key: CHOICE_NO,
      text: c.x.t('ps.no'),
      active: on === false,
      apply: makeTickSet({ acts: c.x.acts, key, siblings, on: false }),
    },
  ]
}

/**
 * 一屏多选题的各条。
 *
 * @param x 这一屏与逐条簇号。
 * @returns 各条。
 */
export function bonusChecksOf(x: BonusChecksIn): ExtraCheck[] {
  const c = x.c
  const out: ExtraCheck[] = []
  for (let i = 0; i < c.chunk.length; i += 1) {
    const r = c.chunk[i]
    if (r == null) {
      continue
    }
    const key = tickKeyOf({ prov: c.prov, factor: r.factor, seq: r.seq })
    out.push({
      key,
      text: officialLabel({ raw: r.label, lang: c.x.lang }),
      pts: r.points,
      on: c.x.ticks[key] === true,
      toggle: makeTickToggle({
        acts: c.x.acts,
        key,
        siblings: siblingsOf({ chunk: c.chunk, cluster: x.cluster, at: i, prov: c.prov }),
      }),
    })
  }
  return out
}

/**
 * 一屏加分题。加分项**一屏一组、每屏 ≤4 条**(2026-08-11 Frank「一页问题小于等于 4,
 * 太多看麻了,而且要相关」)。组 = 官方表自己的因素(经验 / 学历 / 语言 / 地区),
 * 不是随手划的 —— 一省七条摊一屏时标题只能写成「以下哪些符合你的情况」,**这个问句没有主语**。
 *
 * @param c 要看的事实、正在攒的产物、省码、组名、这一屏的那几条与它从第几条起。
 */
export function pushBonusChunk(c: BonusChunkIn): void {
  const cluster = clusterOf({ chunk: c.chunk })
  const key = bonusScreenKeyOf({ prov: c.prov, factor: c.factor, at: c.at })
  const [only] = c.chunk
  if (c.chunk.length === 1 && only != null) {
    const condition = officialLabel({ raw: only.label, lang: c.x.lang })
    pushChoiceScreen({
      build: c.build,
      key,
      title: c.x.t('ps.q.meet', { condition }),
      choices: yesNoChoicesOf({ c, row: only, cluster }),
      echoLabel: condition,
    })
    return
  }
  c.build.questions.push({
    key,
    title: factorTitleOf({ t: c.x.t, factor: c.factor }),
    checks: bonusChecksOf({ c, cluster }),
  })
}

/**
 * 一组加分题。#305:推得出的因子不出题 —— 推导值进算分,条件格回显为已填。
 *
 * @param g 要看的事实、正在攒的产物、省码、组名与这一组的行。
 */
export function pushBonusGroup(g: BonusGroupIn): void {
  const derived = deriveBonusOf({ basics: g.x.basics, prov: g.prov, factor: g.factor, rows: g.rows })
  if (derived != null) {
    for (const seq of Object.keys(derived)) {
      g.build.derivedTicks[g.prov + SCORE_KEY_SEP + g.factor + SCORE_KEY_SEP + seq] = derived[Number(seq)] === true
    }
    g.build.derivedEcho.push(derivedEchoOf({
      t: g.x.t, lang: g.x.lang, prov: g.prov, factor: g.factor, rows: g.rows, derived,
    }))
    return
  }
  for (let i = 0; i < g.rows.length; i += BONUS_CHUNK_MAX) {
    pushBonusChunk({
      x: g.x,
      build: g.build,
      prov: g.prov,
      factor: g.factor,
      chunk: g.rows.slice(i, i + BONUS_CHUNK_MAX),
      at: i,
    })
  }
}

/**
 * 一个省的加分题。
 *
 * @param p 要看的事实、正在攒的产物与省码。
 */
export function pushProvBonus(p: ProvBonusIn): void {
  const bonus = bonusRowsOf({ factors: p.x.factors, prov: p.prov, offerYes: p.x.offerYes, ctx: p.x.ctx })
  for (const factor of bonusFactorNamesOf(bonus)) {
    pushBonusGroup({
      x: p.x,
      build: p.build,
      prov: p.prov,
      factor,
      rows: bonusGroupRowsOf({ bonus, factor }),
    })
  }
}

/**
 * 全部加分题。
 *
 * @param b 要看的事实与正在攒的产物。
 */
export function pushBonusScreens(b: ScoreBuildIn): void {
  for (const prov of b.x.provinces) {
    pushProvBonus({ x: b.x, build: b.build, prov })
  }
}

/**
 * 逐屏出题。官方分值表要的条件走答题壳的同一副皮(题干 / 选项卡片 / 底部动作条)。
 * 题目**不带小注**:2026-08-16 Frank「为什么显示两个阿尔伯塔」+「加分项 去掉」——
 * 弹框头已经写着段落名与省名,题目小注再写一遍省名或「加分项」就是重复;
 * 需要语境时看头部。
 *
 * @param x 出题要看的全部事实与落格口。
 * @returns 题单 + 推导出来的勾选 + 推导格的回显。
 */
export function extraQuestionsOf(x: ExtraQuestionsIn): ScoreBuild {
  const build: ScoreBuild = { questions: [], derivedTicks: {}, derivedEcho: [] }
  pushProfileScreens({ x, build })
  pushJobScreens({ x, build })
  pushManualScreens({ x, build })
  pushBonusScreens({ x, build })
  return build
}

/**
 * 每题归属的省('' = 全省共用):页面按省分 tab 摆格子(2026-08-13 Frank「按省份划分,
 * tab 切换」)。省码从题 key 派生:profile 段共用;时薪与 BC 地区是岗位事实题,归各自的省;
 * 其余 key 首段就是省码。
 *
 * @param x 题 key 与时薪那道题归哪个省。
 * @returns 两位省码;'' = 全省共用。
 */
export function provOfKeyOf(x: ProvOfKeyIn): string {
  if (x.key.startsWith(KEY_SCORE_PROFILE_HEAD)) {
    return TEXT_NONE
  }
  if (x.key === TICK_WAGE) {
    return x.wageProvince
  }
  if (x.key === TICK_AREA) {
    return PROV_BC
  }
  const [head] = x.key.split(SCORE_KEY_SEP)
  if (head == null) {
    return TEXT_NONE
  }
  return head
}

/**
 * 这道题的答案回显。
 *
 * @param x 取词函数、界面语与这一道题。
 * @returns 答案;'' = 这道题还没答。
 */
export function echoValueOf(x: EchoValueIn): string {
  const q = x.question
  if (q.choices != null) {
    for (const c of q.choices) {
      if (c.active) {
        return c.text
      }
    }
    return TEXT_NONE
  }
  if (q.checks != null) {
    const texts: string[] = []
    for (const c of q.checks) {
      if (c.on) {
        texts.push(c.text)
      }
    }
    if (texts.length === 0) {
      return x.t('ps.no')
    }
    return texts.join(sepOf(x.lang))
  }
  if (q.number != null) {
    return rateTextOf(q.number.value)
  }
  return TEXT_NONE
}

/**
 * 这道题在条件格里的短名。
 *
 * @param q 这一道题。
 * @returns 短名。
 */
export function echoShortOf(q: ExtraQuestion): string {
  if (q.echoLabel != null) {
    return q.echoLabel
  }
  return q.title
}

/**
 * 这是不是一道加分题(bonus 题的 key 恒为 省:因素:批 三段)。
 *
 * @param key 题 key。
 * @returns 是不是。
 */
export function bonusKeyOf(key: string): boolean {
  return key.split(SCORE_KEY_SEP).length === BONUS_KEY_PARTS
}

/**
 * 「加分项」这个词(取自带省名插值的那条文案,省名留空后去掉首尾空格)。
 *
 * @param t 取词函数。
 * @returns 这个词。
 */
export function bonusWordOf(t: TFn): string {
  return t('ps.bonusOf', { prov: TEXT_NONE }).trim()
}

/**
 * 这道题在条件格里的题面。省名不再拼进标签(tab 上就是省名);「加分项」前缀 2026-08-16
 * Frank 让去掉 —— 但**同名时必须留**:MB 的风险评估既是档位题又是加分勾选,
 * 去了前缀两个格子一模一样。所以只在同省内真撞名时才加。
 *
 * @param x 取词函数、这一道题、全部题、这道题归哪个省与时薪那道题归哪个省。
 * @returns 题面。
 */
export function echoLabelOf(x: EchoLabelIn): string {
  const short = echoShortOf(x.question)
  if (bonusKeyOf(x.question.key) === false) {
    return short
  }
  for (const o of x.questions) {
    if (bonusKeyOf(o.key)) {
      continue
    }
    if (provOfKeyOf({ key: o.key, wageProvince: x.wageProvince }) !== x.prov) {
      continue
    }
    if (echoShortOf(o) === short) {
      return bonusWordOf(x.t) + TEXT_SPACE + short
    }
  }
  return short
}

/**
 * 逐题答案回显。#305 推导出的因子不占题,但格子照摆、恒为已填 ——
 * 值来自基础卷答案,已填态与答过的题同一副样式;标 noQuestion,展示层据此不给点。
 *
 * @param x 取词函数、界面语、全部题、已答标记、时薪归属省与推导格。
 * @returns 逐行回显。
 */
export function echoRowsOf(x: EchoRowsIn): ScoreCardEchoRow[] {
  const out: ScoreCardEchoRow[] = []
  for (const q of x.questions) {
    const filled = x.extraAnswered[q.key] === true
    let value = TEXT_NONE
    if (filled) {
      value = echoValueOf({ t: x.t, lang: x.lang, question: q })
    }
    const prov = provOfKeyOf({ key: q.key, wageProvince: x.wageProvince })
    const label = echoLabelOf({ t: x.t, question: q, questions: x.questions, prov, wageProvince: x.wageProvince })
    out.push({ key: q.key, prov, label, value, filled })
  }
  for (const r of x.derivedEcho) {
    out.push({ key: r.key, prov: r.prov, label: r.label, value: r.value, filled: true, noQuestion: true })
  }
  return out
}

/**
 * 算分用的**有效**勾选:#305 推导值优先于存量勾选(推导来自基础卷答案 = 他亲口答的);
 * #304 关闸时 offer 前提族的勾选一律不计分 —— 存量不删,只是不参与,基础卷改回「有」就恢复。
 *
 * @param x 存量勾选、推导勾选与 offer 闸。
 * @returns 有效勾选。
 */
export function effTicksOf(x: EffTicksIn): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const k of Object.keys(x.ticks)) {
    out[k] = x.ticks[k] === true
  }
  for (const k of Object.keys(x.derivedTicks)) {
    out[k] = x.derivedTicks[k] === true
  }
  if (x.offerYes) {
    return out
  }
  for (const k of Object.keys(out)) {
    if (OFFER_PREMISE_FACTORS.includes(tickFactorOf(k))) {
      out[k] = false
    }
  }
  return out
}

/**
 * 官方行的分;官方没给分就是 0。
 *
 * @param row 官方表的一行。
 * @returns 分。
 */
export function pointsOrZeroOf(row: PlanScoreFactor): number {
  if (row.points == null) {
    return 0
  }
  return row.points
}

/**
 * BC 时薪按官方规则算的分:每整元 1 分,起算与封顶从官方规则串读,读不出按官方默认。
 *
 * @param x 官方规则行与时薪。
 * @returns 分。
 */
export function wagePointsOf(x: WagePointsIn): number {
  let cfg: WageRuleJson = {}
  try {
    let raw = x.rule.rule
    if (raw === TEXT_NONE) {
      raw = RULE_EMPTY
    }
    cfg = JSON.parse(raw)
  } catch {
    cfg = {}
  }
  let floorAt = WAGE_FLOOR_DEFAULT
  if (cfg.floorAt != null) {
    floorAt = cfg.floorAt
  }
  let capAt = WAGE_CAP_DEFAULT
  if (cfg.capAt != null) {
    capAt = cfg.capAt
  }
  if (x.wage < floorAt) {
    return 0
  }
  let max = WAGE_POINTS_MAX
  if (x.rule.factorMax != null) {
    max = x.rule.factorMax
  }
  return Math.min(Math.floor(Math.min(x.wage, capAt)) - WAGE_POINT_BASE, max)
}

/**
 * 时薪那一项的分(按官方规则行算)。
 *
 * @param p 攒到一半的 overrides 与要看的那些事实。
 */
export function pushWageOverride(p: OverridePushIn): void {
  let rule: PlanScoreFactor | null = null
  for (const f of p.x.mine) {
    if (rule == null && f.factor === FACTOR_WAGE && f.kind === KIND_RULE) {
      rule = f
    }
  }
  if (rule == null) {
    return
  }
  p.out[FACTOR_WAGE] = {
    pts: wagePointsOf({ rule, wage: p.x.wage }),
    matched: rateTextOf(p.x.wage),
    source: SOURCE_JOB,
  }
}

/**
 * BC 工作地区那一项的分(取用户选的档)。areaIndexOf 只描述 BC 的三片区 ——
 * ON 的地区档完全不同,必须由用户按官方档位选择,所以这一格只对 BC 生效。
 *
 * @param p 攒到一半的 overrides 与要看的那些事实。
 */
export function pushAreaOverride(p: OverridePushIn): void {
  if (p.x.prov !== PROV_BC) {
    return
  }
  const rows = rowsOfFactorOf({ factors: p.x.mine, prov: p.x.prov, name: FACTOR_AREA })
  if (rows.length === 0) {
    return
  }
  const row = rows[Math.min(p.x.areaI, rows.length - 1)]
  let pts = 0
  let matched = TEXT_NONE
  if (row != null) {
    pts = pointsOrZeroOf(row)
    matched = row.label
  }
  p.out[FACTOR_AREA] = { pts, matched, source: SOURCE_JOB }
}

/**
 * offer 那一项的分。#304:offer 行只认基础卷的「有」;没答或答没有 → 0 分,不再有自问兜底。
 *
 * @param p 攒到一半的 overrides 与要看的那些事实。
 */
export function pushOfferOverride(p: OverridePushIn): void {
  const [head] = rowsOfFactorOf({ factors: p.x.mine, prov: p.x.prov, name: FACTOR_OFFER })
  if (head == null) {
    return
  }
  let pts = 0
  if (p.x.offerYes) {
    pts = pointsOrZeroOf(head)
  }
  p.out[FACTOR_OFFER] = { pts, matched: head.label, source: SOURCE_TICK }
}

/**
 * 按官方档位文字里的数字落档(TEER 档与职业大类走这一把,岗位事实给得出就不问人)。
 *
 * @param x 攒到一半的 overrides、要看的事实、因素名与要命中的那个数。
 */
export function pushDigitOverride(x: DigitOverrideIn): void {
  for (const f of rowsOfFactorOf({ factors: x.x.mine, prov: x.x.prov, name: x.name })) {
    if (digitsOf(f.label).includes(x.digit)) {
      x.out[x.name] = { pts: pointsOrZeroOf(f), matched: f.label, source: SOURCE_JOB }
      return
    }
  }
}

/**
 * 时薪档位那一项:已经用数字问过就按数字落档(问卷里同步跳过了这一题),不靠用户再选一次。
 * 只在这个省自己没有规则行、而这批表里别的省有规则行时才落。
 *
 * @param r 攒到一半的 overrides、要看的事实与因素名。
 * @returns 落没落。
 */
export function pushWageRowOverride(r: OverrideRowIn): boolean {
  if (r.name !== FACTOR_WAGE) {
    return false
  }
  if (wageProvinceOf(r.x.mine) !== TEXT_NONE || wageProvinceOf(r.x.factors) === TEXT_NONE) {
    return false
  }
  const rows = rowsOfFactorOf({ factors: r.x.mine, prov: r.x.prov, name: FACTOR_WAGE })
  const hit = wageRowAt({ rows, wage: r.x.wage })
  if (hit == null) {
    return false
  }
  r.out[r.name] = { pts: pointsOrZeroOf(hit), matched: hit.label, source: SOURCE_JOB }
  return true
}

/**
 * 用户直选的那一档。空值 = 未回答 = 0 分,不在前端另造规则。
 *
 * @param r 攒到一半的 overrides、要看的事实与因素名。
 */
export function pushAnswerOverride(r: OverrideRowIn): void {
  const answer = r.x.rowAnswers[provFactorKeyOf({ prov: r.x.prov, factor: r.name })]
  if (answer == null) {
    return
  }
  for (const f of rowsOfFactorOf({ factors: r.x.mine, prov: r.x.prov, name: r.name })) {
    if (f.seq === answer) {
      r.out[r.name] = { pts: pointsOrZeroOf(f), matched: f.label, source: SOURCE_PROFILE }
      return
    }
  }
}

/**
 * 一个因素的 override:已有 profile / 岗位映射的跳过,其余由岗位事实或用户直选落档。
 *
 * @param r 攒到一半的 overrides、要看的事实与因素名。
 */
export function pushRowOverride(r: OverrideRowIn): void {
  if (MAPPED_FACTORS.includes(r.name)) {
    return
  }
  if (r.name === FACTOR_AREA && r.x.prov === PROV_BC) {
    return
  }
  if (r.name === FACTOR_TEER_CAT && r.x.ctx.teer != null) {
    pushDigitOverride({ out: r.out, x: r.x, name: r.name, digit: r.x.ctx.teer })
    return
  }
  const noc = scoreNocOf(r.x.ctx)
  if (r.name === FACTOR_OCC_CAT && NOC_CODE_RE.test(noc)) {
    pushDigitOverride({ out: r.out, x: r.x, name: r.name, digit: Number(noc.charAt(0)) })
    return
  }
  if (pushWageRowOverride(r)) {
    return
  }
  pushAnswerOverride(r)
}

/**
 * 一个省的 override 表(手动 / 自动项的分数,由本页构造后喂给算分器)。
 *
 * @param x 该省的官方行、全表、省码、时薪、地区档、offer 闸、直选表与岗位语境。
 * @returns override 表。
 */
export function scoreOverridesOf(x: OverridesIn): Record<string, PlanScoreOverride> {
  const out: Record<string, PlanScoreOverride> = {}
  pushWageOverride({ out, x })
  pushAreaOverride({ out, x })
  pushOfferOverride({ out, x })
  for (const name of factorNamesOf({ factors: x.mine, prov: x.prov })) {
    pushRowOverride({ out, x, name })
  }
  return out
}

/**
 * 各省估分。分值全部来自官方分值表,前端一分都不许自己编;用户只填**一套条件**,
 * 各省按各自官方表折算。
 *
 * @param x 有表的省、官方分值表、条件、有效勾选、时薪、地区档、offer 闸、直选表与岗位语境。
 * @returns 各省估分。
 */
export function provinceScoresOf(x: ProvinceScoresIn): PlanProvinceScore[] {
  const out: PlanProvinceScore[] = []
  for (const prov of x.provinces) {
    const mine = provFactorsOf({ factors: x.factors, prov })
    const overrides = scoreOverridesOf({
      mine,
      factors: x.factors,
      prov,
      wage: x.wage,
      areaI: x.areaI,
      offerYes: x.offerYes,
      rowAnswers: x.rowAnswers,
      ctx: x.ctx,
    })
    const one = scoreProvince({ factors: x.factors, province: prov, profile: x.profile, overrides, ticks: x.effTicks })
    if (one != null) {
      out.push(one)
    }
  }
  return out
}

/**
 * 结果区要摆的加分勾选清单,与算分同口径:#304 关闸时 offer 前提族不摆(勾了也不计分 =
 * 摆着骗人);#305 推导出的因子不摆(值由基础卷答案定,勾选框改不动它)。
 *
 * @param x 官方分值表、省码、offer 闸与推导勾选。
 * @returns 要摆的加分项行。
 */
export function bonusListOf(x: BonusListIn): PlanScoreFactor[] {
  const out: PlanScoreFactor[] = []
  for (const f of x.factors) {
    if (f.province !== x.prov || f.kind !== KIND_BONUS) {
      continue
    }
    if (x.offerYes === false && OFFER_PREMISE_FACTORS.includes(f.factor)) {
      continue
    }
    if (tickKeyOf({ prov: x.prov, factor: f.factor, seq: f.seq }) in x.derivedTicks) {
      continue
    }
    out.push(f)
  }
  return out
}

/**
 * 当前摊开的那个省。目标省默认开;哨兵 `__closed` = 全收起,那时退回第一个省。
 *
 * @param x 各省估分、用户点过的省与目标省。
 * @returns 两位省码;'' = 一个省都没有。
 */
export function activeScoreProvOf(x: ActiveScoreProvIn): string {
  const [head] = x.scores
  let fallback = TEXT_NONE
  if (head != null) {
    fallback = head.province
  }
  if (x.openProv === PROV_CLOSED) {
    return fallback
  }
  if (x.openProv != null) {
    return x.openProv
  }
  for (const s of x.scores) {
    if (s.province === x.target) {
      return x.target
    }
  }
  return fallback
}

/**
 * 省页签。选项卡上只放省名 —— 合计分在选中省的面板里就是最大的那个数,
 * 标签上再挂一遍是同一件事说两遍。
 *
 * @param x 取词函数与各省估分。
 * @returns 页签。
 */
export function scoreTabItemsOf(x: ScoreSourcesIn): ScoreTabItem[] {
  const out: ScoreTabItem[] = []
  for (const s of x.scores) {
    let label = x.t(KEY_PROV + s.province)
    if (label === TEXT_NONE) {
      label = s.province
    }
    out.push({ key: s.province, label })
  }
  return out
}

/**
 * 学历那一格的下拉选项。
 *
 * @param t 取词函数。
 * @returns 选项。
 */
export function eduOptionsOf(t: TFn): ScoreOption[] {
  const out: ScoreOption[] = []
  for (const k of EDU_KEYS) {
    out.push({ value: k, text: t(KEY_PS_EDU_HEAD + k) })
  }
  return out
}

/**
 * 数字档那几格的下拉选项。
 *
 * @param x 取词函数、候选值与这一格的键。
 * @returns 选项。
 */
export function numOptionsOf(x: NumOptionsIn): ScoreOption[] {
  const out: ScoreOption[] = []
  for (const n of x.values) {
    out.push({ value: String(n), text: numChoiceTextOf({ t: x.t, n, field: x.field }) })
  }
  return out
}

/**
 * 官方档位直选那一格的下拉选项(首项是「还没选」)。分值跟在官方原文后面,
 * 好让用户核对我们匹的是哪一档。
 *
 * @param x 取词函数、界面语与官方档位行。
 * @returns 选项。
 */
export function rowOptionsOf(x: RowOptionsIn): ScoreOption[] {
  const out: ScoreOption[] = [{ value: TEXT_NONE, text: x.t('ps.choose') }]
  for (const r of x.rows) {
    const text = officialLabel({ raw: r.label, lang: x.lang })
      + PAREN_EN_OPEN + String(pointsOrZeroOf(r)) + PAREN_EN_CLOSE
    out.push({ value: String(r.seq), text })
  }
  return out
}

/**
 * BC 工作地区那一格的下拉选项(值是档序)。
 *
 * @param x 界面语与官方档位行。
 * @returns 选项。
 */
export function areaOptionsOf(x: AreaOptionsIn): ScoreOption[] {
  const out: ScoreOption[] = []
  for (let i = 0; i < x.rows.length; i += 1) {
    const r = x.rows[i]
    if (r != null) {
      out.push({ value: String(i), text: officialLabel({ raw: r.label, lang: x.lang }) })
    }
  }
  return out
}

/**
 * 「你的条件」一格 profile 下拉的落格手柄。
 *
 * @param x 落格总口与这一格的键。
 * @returns 手柄。
 */
export function makeFieldPick(x: FieldPickMakeIn): ScoreFieldPickFn {
  return function onPick(value: string): void {
    if (x.field === KEY_INPUT_EDU) {
      const edu = eduKeyOf(value)
      if (edu == null) {
        return
      }
      x.acts.pickProfile({ edu })
      return
    }
    x.acts.pickProfile(numPatchOf({ key: x.field, value: Number(value) }))
  }
}

/**
 * 「你的条件」一格数字输入(时薪、地区档)的落格手柄。
 *
 * @param x 落格口。
 * @returns 手柄。
 */
export function makeNumberFieldPick(x: NumberFieldPickIn): ScoreFieldPickFn {
  return function onPick(value: string): void {
    x.set(Number(value))
  }
}

/**
 * 「你的条件」一格官方档位下拉的落格手柄。空值 = 撤回这一格的答案。
 *
 * @param x 落格总口与题 key。
 * @returns 手柄。
 */
export function makeRowFieldPick(x: RowFieldPickMakeIn): ScoreFieldPickFn {
  return function onPick(value: string): void {
    if (value === '') {
      x.acts.pickRow({ key: x.key, seq: null })
      return
    }
    x.acts.pickRow({ key: x.key, seq: Number(value) })
  }
}

/**
 * 「你的条件」里 profile 那几格。
 *
 * @param p 攒到一半的那几格与要看的事实。
 */
export function pushProfileFields(p: ScoreFieldPushIn): void {
  const x = p.x
  pushEduField(p)
  pushExpFields(p)
  pushClbFields(p)
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_AGE, factors: x.factors, names: [FACTOR_AGE] })) {
    p.out.push({
      key: KEY_INPUT_AGE,
      label: x.t('ps.f.age'),
      kind: FIELD_SELECT,
      value: String(x.profile.age),
      options: numOptionsOf({ t: x.t, values: AGE_OPTIONS, field: KEY_INPUT_AGE }),
      onPick: makeFieldPick({ acts: x.acts, field: KEY_INPUT_AGE }),
    })
  }
}

/**
 * 「你的条件」里学历那一格。
 *
 * @param p 攒到一半的那几格与要看的事实。
 */
export function pushEduField(p: ScoreFieldPushIn): void {
  const x = p.x
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_EDU, factors: x.factors, names: [FACTOR_EDUCATION] })) {
    p.out.push({
      key: KEY_INPUT_EDU,
      label: x.t('ps.f.education'),
      kind: FIELD_SELECT,
      value: x.profile.edu,
      options: eduOptionsOf(x.t),
      onPick: makeFieldPick({ acts: x.acts, field: KEY_INPUT_EDU }),
    })
  }
}

/**
 * 「你的条件」里两段经验那两格。不拆段的表里近段就是总经验,标签跟着换。
 *
 * @param p 攒到一半的那几格与要看的事实。
 */
export function pushExpFields(p: ScoreFieldPushIn): void {
  const x = p.x
  const recent = [FACTOR_WORK, FACTOR_WORK5]
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_EXP_RECENT, factors: x.factors, names: recent })) {
    let label = x.t('ps.f.expTotal')
    if (x.splitWork) {
      label = x.t('ps.f.expRecent')
    }
    p.out.push({
      key: KEY_INPUT_EXP_RECENT,
      label,
      kind: FIELD_SELECT,
      value: String(x.profile.expRecent),
      options: numOptionsOf({ t: x.t, values: SPLIT_YEARS, field: KEY_INPUT_EXP_RECENT }),
      onPick: makeFieldPick({ acts: x.acts, field: KEY_INPUT_EXP_RECENT }),
    })
  }
  const older = [FACTOR_WORK, FACTOR_WORK610]
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_EXP_OLDER, factors: x.factors, names: older })) {
    p.out.push({
      key: KEY_INPUT_EXP_OLDER,
      label: x.t('ps.f.expOlder'),
      kind: FIELD_SELECT,
      value: String(x.profile.expOlder),
      options: numOptionsOf({ t: x.t, values: SPLIT_YEARS, field: KEY_INPUT_EXP_OLDER }),
      onPick: makeFieldPick({ acts: x.acts, field: KEY_INPUT_EXP_OLDER }),
    })
  }
}

/**
 * 「你的条件」里两门语言那两格。
 *
 * @param p 攒到一半的那几格与要看的事实。
 */
export function pushClbFields(p: ScoreFieldPushIn): void {
  const x = p.x
  const first = [FACTOR_LANGUAGE, FACTOR_LANGUAGE1]
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_CLB1, factors: x.factors, names: first })) {
    p.out.push({
      key: KEY_INPUT_CLB1,
      label: x.t('ps.f.clb1'),
      kind: FIELD_SELECT,
      value: String(x.profile.clb1),
      options: numOptionsOf({ t: x.t, values: CLB_VALUES, field: KEY_INPUT_CLB1 }),
      onPick: makeFieldPick({ acts: x.acts, field: KEY_INPUT_CLB1 }),
    })
  }
  if (profileAskedOf({ hidden: x.hidden, field: KEY_INPUT_CLB2, factors: x.factors, names: [FACTOR_LANGUAGE2] })) {
    p.out.push({
      key: KEY_INPUT_CLB2,
      label: x.t('ps.f.clb2'),
      kind: FIELD_SELECT,
      value: String(x.profile.clb2),
      options: numOptionsOf({ t: x.t, values: CLB_VALUES, field: KEY_INPUT_CLB2 }),
      onPick: makeFieldPick({ acts: x.acts, field: KEY_INPUT_CLB2 }),
    })
  }
}

/**
 * 「你的条件」里时薪那一格(BC 按每整元计分,不能粗暴切区间,所以是数字输入)。
 *
 * @param p 攒到一半的那几格与要看的事实。
 */
export function pushWageField(p: ScoreFieldPushIn): void {
  const x = p.x
  if (wageProvinceOf(x.factors) === TEXT_NONE) {
    return
  }
  p.out.push({
    key: TICK_WAGE,
    label: x.t('ps.in.wage'),
    kind: INPUT_NUMBER,
    value: String(x.wage),
    options: [],
    onPick: makeNumberFieldPick({ set: x.acts.pickWage }),
  })
}

/**
 * 「你的条件」里 BC 工作地区那一格。只在它真进了 BC 的分项时才摆。
 *
 * @param p 攒到一半的那几格与要看的事实。
 */
export function pushAreaField(p: ScoreFieldPushIn): void {
  const x = p.x
  if (areaShownOf(x.scores) === false) {
    return
  }
  p.out.push({
    key: TICK_AREA,
    label: x.t('ps.in.area'),
    kind: FIELD_SELECT,
    value: String(x.areaI),
    options: areaOptionsOf({ lang: x.lang, rows: bcAreaRowsOf(x.factors) }),
    onPick: makeNumberFieldPick({ set: x.acts.pickArea }),
  })
}

/**
 * BC 地区那一格摆不摆:该省的地区因素真进了分项才摆。
 *
 * @param scores 各省估分。
 * @returns 摆不摆。
 */
export function areaShownOf(scores: PlanProvinceScore[]): boolean {
  for (const s of scores) {
    if (s.province !== PROV_BC) {
      continue
    }
    for (const p of s.parts) {
      if (p.factor === FACTOR_AREA) {
        return true
      }
    }
  }
  return false
}

/**
 * 「你的条件」里官方档位直选那几格。
 *
 * @param p 攒到一半的那几格与要看的事实。
 */
export function pushManualFields(p: ScoreFieldPushIn): void {
  const x = p.x
  for (const q of x.manual) {
    let value = TEXT_NONE
    const picked = x.rowAnswers[q.key]
    if (picked != null) {
      value = String(picked)
    }
    p.out.push({
      key: q.key,
      label: x.t(KEY_PS_FACTOR_HEAD + q.name),
      kind: FIELD_SELECT,
      value,
      options: rowOptionsOf({ t: x.t, lang: x.lang, rows: q.rows }),
      onPick: makeRowFieldPick({ acts: x.acts, key: q.key }),
    })
  }
}

/**
 * 「你的条件」网格的各格。一套答案,各省按各自官方表折算。
 *
 * @param x 取词函数、界面语、官方分值表、各省估分、直选题、已问过的项、拆段开关、
 *   当前条件、直选表、时薪、地区档与落格总口。
 * @returns 各格。
 */
export function scoreFieldsOf(x: ScoreFieldsIn): ScoreField[] {
  const out: ScoreField[] = []
  pushProfileFields({ out, x })
  pushWageField({ out, x })
  pushAreaField({ out, x })
  pushManualFields({ out, x })
  return out
}

/**
 * 你离这个省的对照线还差几分。
 *
 * @param x 对照线与你的合计分。
 * @returns 差几分(≤0 = 够了);null = 该省没有可用的线。
 */
export function scoreGapOf(x: ScoreGapIn): number | null {
  if (x.line == null) {
    return null
  }
  return x.line - x.total
}

/**
 * 差距那一句。通道对不上就不给差分结论 —— 拿别的通道的线判你差多少分是编。
 *
 * @param x 取词函数、对照线与你的合计分。
 * @returns 一句话。
 */
export function scoreGapTextOf(x: ScoreGapTextIn): string {
  const gap = scoreGapOf({ line: x.line, total: x.total })
  if (gap == null) {
    return x.t('ps.noCompareLine')
  }
  if (gap <= 0) {
    return x.t('ps.met')
  }
  return x.t('ps.under', { n: gap })
}

/**
 * 差距那一句的类。
 *
 * @param x 对照线与你的合计分。
 * @returns 类名。
 */
export function scoreGapClsOf(x: ScoreGapIn): string {
  const gap = scoreGapOf(x)
  if (gap == null) {
    return cssOf(css.psGap) + CLS_SEP + cssOf(css.psGapNone)
  }
  if (gap <= 0) {
    return cssOf(css.psGap) + CLS_SEP + cssOf(css.psGapOk)
  }
  return cssOf(css.psGap) + CLS_SEP + cssOf(css.psGapWarn)
}

/**
 * 对照结论块的类:没有线 = 灰、够得着 = 绿、够不着 = 琥珀。
 *
 * @param x 取词函数、这个省的估分与对照锚。
 * @returns 类名。
 */
export function lineNoteClsOf(x: LineNoteIn): string {
  const base = cssOf(css.psLineNote)
  if (x.anchor.line == null) {
    return base + CLS_SEP + cssOf(css.psLineNone)
  }
  if (x.score.total - x.anchor.line >= 0) {
    return base + CLS_SEP + cssOf(css.psLineOk)
  }
  return base + CLS_SEP + cssOf(css.psLineBad)
}

/**
 * 没有对照线时说的那一句:摆得出区间就摆近期各通道的区间;该省有线但全是别的通道的
 * (ON 旧通道已关停)就说清楚为什么这里没有线,而不是含糊说「未公布」。
 *
 * @param x 取词函数与对照锚。
 * @returns 一句话。
 */
export function lineEmptyTextOf(x: LineTextIn): string {
  const range = x.anchor.range
  if (range != null) {
    return x.t('ps.range', { lo: range.lo, hi: range.hi, n: range.n })
  }
  if (x.anchor.hasOtherStreamDraws) {
    return x.t('ps.noLineStream')
  }
  return x.t('ps.noLine')
}

/**
 * 对照线那一句:有真实抽选就说那一轮,只有官方门槛就说门槛。
 *
 * @param x 取词函数与对照锚。
 * @returns 一句话。
 */
export function lineCutTextOf(x: LineTextIn): string {
  const latest = x.anchor.latest
  if (latest != null && latest.score != null) {
    return x.t('ps.cut', { n: latest.score, date: ymd(latest.drawDate), stream: latest.stream })
  }
  let line = 0
  if (x.anchor.line != null) {
    line = x.anchor.line
  }
  return x.t('ps.pass', { n: line })
}

/**
 * 你比这条线高几分 / 差几分那一句。
 *
 * @param x 取词函数、这个省的估分与对照锚。
 * @returns 一句话。
 */
export function lineMarginTextOf(x: LineNoteIn): string {
  let line = 0
  if (x.anchor.line != null) {
    line = x.anchor.line
  }
  const gap = x.score.total - line
  if (gap >= 0) {
    return x.t('ps.over', { n: gap })
  }
  return x.t('ps.under', { n: Math.abs(gap) })
}

/**
 * 「换省」这一步具体怎么走:该省官方给雇主 offer 记多少分 —— 拿到就 +N。
 * 目标省自己不谈换省;已经有 offer 分的也不谈(那一步他已经走完了)。
 *
 * @param x 这个省的估分、官方分值表与这个省是不是换省对照。
 * @returns 能加几分;0 = 不出这一句。
 */
export function offerGainOf(x: OfferGainIn): number {
  if (x.switchable === false) {
    return 0
  }
  let row: PlanScoreFactor | null = null
  for (const f of x.factors) {
    if (row == null && f.province === x.score.province && f.factor === FACTOR_OFFER && f.kind === KIND_ROW) {
      row = f
    }
  }
  if (row == null) {
    return 0
  }
  for (const p of x.score.parts) {
    if (p.factor === FACTOR_OFFER && p.pts !== 0) {
      return 0
    }
  }
  return pointsOrZeroOf(row)
}

/**
 * 拿到 offer 之后的合计分(官方公布了满分就按满分封顶)。
 *
 * @param x 这个省的估分与能加几分。
 * @returns 合计分。
 */
export function switchTotalOf(x: SwitchTotalIn): number {
  if (x.score.maxTotal > 0) {
    return Math.min(x.score.total + x.gain, x.score.maxTotal)
  }
  return x.score.total + x.gain
}

/**
 * 分项那一行的悬停提示:命中的官方原文标签,好让用户核对我们选对了没有。
 *
 * @param x 界面语与这一块分。
 * @returns 提示文字;'' = 这一块没匹到官方行。
 */
export function partTitleOf(x: ScorePartIn): string {
  if (x.part.matched === TEXT_NONE) {
    return TEXT_NONE
  }
  return officialLabel({ raw: x.part.matched, lang: x.lang })
}

/**
 * 分项那一行的上限格。「12 / 40」是两个事实,斜杠自成一列,数字才跨行对齐。
 *
 * @param part 这一块分。
 * @returns 「/ 40」这样一格。
 */
export function partMaxTextOf(part: PlanScorePart): string {
  return BAR_SEP + TEXT_SPACE + String(part.max)
}

/**
 * 合计分后面的满分格。**只在官方公布了总分上限时才出**:ON 的 OINP EOI 页只印各项分值、
 * 不印总分,拿各项相加冒充官方总分就是编数(BC 200 / SK 110 都是官方白纸黑字印着的)。
 *
 * @param score 这个省的估分。
 * @returns 「 / 200」这样一格。
 */
export function totalMaxTextOf(score: PlanProvinceScore): string {
  return TEXT_SPACE + BAR_SEP + TEXT_SPACE + String(score.maxTotal)
}

/**
 * 官方出处链接上的字。
 *
 * @param x 取词函数与这个省的估分。
 * @returns 链接文字。
 */
export function sourceLabelOf(x: ScoreSourceIn): string {
  return x.s.province + TEXT_SPACE + x.t('ps.official')
}

/**
 * 官方出处后面的日期灰注。生效日期并进出处那一行,不单占一行
 * (2026-08-16 Frank「这部分废话删掉」:「按官方分值表自算,非资格认定」撤 ——
 * 卡名与官方出处链接本来就说明了它是自算)。
 *
 * @param x 取词函数与这个省的估分。
 * @returns 日期灰注。
 */
export function sourceDateTextOf(x: ScoreSourceIn): string {
  if (x.s.guideEffective !== TEXT_NONE) {
    return TEXT_SPACE + x.t('ps.eff', { d: x.s.guideEffective })
  }
  return TEXT_SPACE + x.t('ps.asof', { d: x.s.fetched })
}

/**
 * 同职业各省在招数的响应 → 按省的表。事实拿不到就不显示,不编。
 *
 * @param d 响应;null = 这次没拿到。
 * @returns 按省的在招数。
 */
export function byProvOf(d: ByProvWire | null): Record<string, PlanJobCount> {
  const out: Record<string, PlanJobCount> = {}
  if (d == null || d.facts == null || d.facts.byProv == null) {
    return out
  }
  for (const r of d.facts.byProv) {
    out[r.province] = { n: r.n, eligible: r.eligible }
  }
  return out
}

/**
 * 换省事实的在途工作者:同职业在各省的在招数(/api/quiz?noc= 已有,免费事实,不新增端点)。
 *
 * @param x 职业码与在招数写回。
 * @returns 在途工作者。
 */
export function makeByProvEffect(x: ByProvEffectIn): EffectFn {
  return function loadByProv(): CleanupFn {
    let alive = true
    if (x.noc !== TEXT_NONE) {
      fetch(URL_QUIZ_NOC_HEAD + x.noc).then(okJsonOf).then(function take(d: ByProvWire | null): void {
        if (alive) {
          x.setByProv(byProvOf(d))
        }
      }).catch(ignoreFailure)
    }
    return function stopByProv(): void {
      alive = false
    }
  }
}

/**
 * 拉回服务端档之后的重建:答案 state 全量重建(含 profile 的值),照旧防抖同步。
 *
 * @param x 两个状态格、岗位语境与拆段开关。
 * @returns 重建口。
 */
export function makeScoreMerge(x: ScoreSyncIn) {
  return function applyPulled(changed: boolean): void {
    if (changed === false) {
      return
    }
    const s = readScoreAnswers()
    x.answers.setTicks(s.ticks)
    x.answers.setRowAnswers(s.rowAnswers)
    x.answers.setExtraAnswered(healedExtraOf({ stored: s, splitWork: x.splitWork }))
    x.profile.setProfAns(s.profile)
    x.profile.setProfile(function mergePulled(p: PlanSelfProfile): PlanSelfProfile {
      return mergeProfile({ profile: p, patch: storedPatchOf({ stored: s.profile }) })
    })
    if (x.ctx.hasOffer == null && typeof s.hasOffer === 'boolean') {
      x.answers.setHasOffer(s.hasOffer)
      x.answers.setOfferTouched(true)
    }
  }
}

/**
 * 答案档入库的在途工作者(2026-08-15):挂载时拉服务端档合并(新者胜;未登录 401 无感)。
 * 必须排在存档回写之后:同内容回写不记时刻(writeScoreAnswers 语义比对),
 * 拉档才不会被挂载即写误判成「本地更新」。
 *
 * @param x 两个状态格、岗位语境与拆段开关。
 * @returns 在途工作者。
 */
export function makeScorePullEffect(x: ScoreSyncIn): CleanupFn {
  return function pullScore(): void {
    pullAndMerge().then(makeScoreMerge(x)).catch(ignoreFailure)
  }
}

/**
 * offer 勾选的手柄:点过就算真答过,可以入档。
 *
 * @param x offer 写回与真答过标记写回。
 * @returns 手柄。
 */
export function makeOfferAnswer(x: OfferAnswerMakeIn): BoolSetFn {
  return function onOffer(on: boolean): void {
    x.setHasOffer(on)
    x.setOfferTouched(true)
  }
}

/**
 * 单选题选中的手柄。选中**不自动跳**(2026-07-31 拍板,全站答题同一条规矩):
 * 自动跳会在选中的瞬间换掉整屏,看着就是「闪一下」,也没法改主意。
 *
 * @param x 当前这一屏的题与落格总口。
 * @returns 手柄。
 */
export function makeExtraPick(x: ExtraPickMakeIn): ExtraPickFn {
  return function onPick(key: string): void {
    const q = x.question
    if (q == null || q.choices == null) {
      return
    }
    for (const c of q.choices) {
      if (c.key === key) {
        c.apply()
        x.acts.markAnswered(q.key)
        return
      }
    }
  }
}

/**
 * 数字题的手柄。
 *
 * @param x 当前这一屏的题。
 * @returns 手柄。
 */
export function makeExtraNumber(x: ExtraNumberMakeIn): ScoreChangeFn {
  return function onChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const q = x.question
    if (q == null || q.number == null) {
      return
    }
    q.number.set(Number(e.target.value))
  }
}

/**
 * 「下一题」的手柄:最后一题走收卷出口,其余往后翻一题。翻过就算答过。
 *
 * @param x 题序、题数、题序写回、当前这一屏的题、落格总口与两个出口。
 * @returns 手柄。
 */
export function makeExtraNext(x: ExtraNavMakeIn): ClickFn {
  return function onNext(): void {
    if (x.question != null) {
      x.acts.markAnswered(x.question.key)
    }
    if (x.at < x.total - 1) {
      x.setAt(x.at + 1)
      return
    }
    if (x.onComplete != null) {
      x.onComplete()
    }
  }
}

/**
 * 「上一题」的手柄。第一屏的上面没有题了 —— 它退回的是结果页,所以走调用方给的返回口。
 *
 * @param x 题序、题数、题序写回、当前这一屏的题、落格总口与两个出口。
 * @returns 手柄;不给 = 连返回口都没有。
 */
export function makeExtraPrev(x: ExtraNavMakeIn): ClickFn | undefined {
  if (x.at > 0) {
    return makeStepBack({ at: x.at, setIdx: x.setAt })
  }
  return x.onBack
}

/**
 * 「上一题」钮上的字。
 *
 * @param x 取词函数、题序与题数。
 * @returns 钮上的字。
 */
export function extraPrevLabelOf(x: ExtraLabelIn): string {
  if (x.at > 0) {
    return x.t('plan.prev')
  }
  return x.t('ps.back')
}

/**
 * 「下一题」钮上的字。
 *
 * @param x 取词函数、题序与题数。
 * @returns 钮上的字。
 */
export function extraNextLabelOf(x: ExtraLabelIn): string {
  if (x.at < x.total - 1) {
    return x.t('plan.next')
  }
  return x.t('ps.finish')
}

/**
 * 旁路收卷钮的字。「下一题」旁边**恒**给一颗「完成」直接收卷(2026-08-15 Frank
 * 「这些弹框回答也需要一个完成按钮」—— 从条件格点进来常常只想答一格,格子里还有一堆
 * 「待填写」时先前不给这颗钮,人被扣在卷子里只能一路翻到底);最后一题的主钮本来就是
 * 「完成」,不重复给。答不满照样能收:没答的题在引擎那儿本来就是「判不了」,收卷不等于替他填。
 *
 * @param x 取词函数、题序与题数。
 * @returns 钮上的字;不给 = 最后一题,不重复摆。
 */
export function extraDoneLabelOf(x: ExtraLabelIn): string | undefined {
  if (x.at < x.total - 1) {
    return x.t('ps.finish')
  }
  return undefined
}

/**
 * 多选题底下那句灰字(可多选);单选与数字题不出。
 *
 * @param x 取词函数与当前这一屏的题。
 * @returns 灰字;不给 = 不是多选题。
 */
export function extraHintOf(x: ExtraHintIn): string | undefined {
  if (x.question != null && x.question.checks != null) {
    return x.t('ps.q.multiHint')
  }
  return undefined
}

/**
 * 当前这一屏答过没有(「下一题」置灰按它)。数字题与多选题不拦:它们没有「必须选一个」。
 *
 * @param x 当前这一屏的题与已答标记。
 * @returns 答过没有。
 */
export function extraActiveAnsweredOf(x: ExtraActiveIn): boolean {
  if (x.question == null) {
    return false
  }
  if (x.question.choices == null) {
    return true
  }
  return x.answered[x.question.key] === true
}

/**
 * 当前这一屏单选题的选中值。没答过就不给 —— 预填的「当前值」不是他的答案。
 *
 * @param x 当前这一屏的题与已答标记。
 * @returns 选中值;不给 = 还没答。
 */
export function extraPickedOf(x: ExtraActiveIn): string | undefined {
  const q = x.question
  if (q == null || q.choices == null || x.answered[q.key] !== true) {
    return undefined
  }
  for (const c of q.choices) {
    if (c.active) {
      return c.key
    }
  }
  return undefined
}

/**
 * 结果区的标题。带岗态只评当前职位所在省,标题改成「补充条件」的口径,
 * 不再暗示跨省排行榜。
 *
 * @param x 取词函数与只评一省的开关。
 * @returns 标题。
 */
export function scoreTitleOf(x: ScoreTitleIn): string {
  if (x.targetMode) {
    return x.t('ps.resultTitle')
  }
  return x.t('ps.title')
}

/**
 * 卡内出不出「你的条件」下拉。缺省出,保 /pathways 现行为;决策页传 false ——
 * 那里答题是唯一输入面,分数由答案自动算。
 *
 * @param p 组件收到的 props。
 * @returns 出不出。
 */
export function inputsOf(p: PnpScoreCardIn): boolean {
  return p.inputs !== false
}

/**
 * 是不是只评当前职位所在省。
 *
 * @param p 组件收到的 props。
 * @returns 是不是。
 */
export function targetModeOf(p: PnpScoreCardIn): boolean {
  return p.targetMode === true
}

/**
 * 这一刻在不在出题。调用方没表态时按「只评一省」回落。
 *
 * @param p 组件收到的 props。
 * @returns 在不在。
 */
export function showQuestionnaireOf(p: PnpScoreCardIn): boolean {
  if (p.questionnaireActive != null) {
    return p.questionnaireActive
  }
  return targetModeOf(p)
}

/**
 * 结果区出不出。**答完之前整块不出**:各省估分是自愿的第二段,没答就该只留外层那个入口,
 * 不许剩一个「各省估分」的空标题在那儿(标题在、内容不在 = 看着像加载坏了)。
 *
 * @param x props、出题态与两段计数。
 * @returns 出不出。
 */
export function showResultsOf(x: ShowResultsIn): boolean {
  if (targetModeOf(x.p) === false) {
    return true
  }
  return x.showQuestionnaire === false && x.done === x.total
}

/**
 * 省 → 通道名的表;调用方没给就当空表。
 *
 * @param p 组件收到的 props。
 * @returns 通道表。
 */
export function scoreStreamsOf(p: PnpScoreCardIn): Record<string, string> {
  if (p.streams == null) {
    return {}
  }
  return p.streams
}

/**
 * 决策页已经问过、这里不再问的条件;调用方没给就当空。
 *
 * @param p 组件收到的 props。
 * @returns 那几项。
 */
export function scoreHiddenOf(p: PnpScoreCardIn): (keyof PlanSelfProfile)[] {
  if (p.hiddenProfileInputs == null) {
    return []
  }
  return p.hiddenProfileInputs
}

/**
 * 选项范围;调用方没给就当不限。
 *
 * @param p 组件收到的 props。
 * @returns 选项范围。
 */
export function scoreCardLimitsOf(p: PnpScoreCardIn): ScoreCardLimits {
  if (p.limits == null) {
    return {}
  }
  return p.limits
}

/**
 * 答案预填;调用方没给就当没有。
 *
 * @param p 组件收到的 props。
 * @returns 预填。
 */
export function scoreCardInitialOf(p: PnpScoreCardIn): Partial<PlanSelfProfile> {
  if (p.initial == null) {
    return {}
  }
  return p.initial
}

/**
 * 基础卷答过的第一语言 CLB;没答过就是 null。
 *
 * @param p 组件收到的 props。
 * @returns CLB;null = 没答过。
 */
export function scoreProfileClbOf(p: PnpScoreCardIn): number | null {
  if (p.profileClb == null) {
    return null
  }
  return p.profileClb
}

/**
 * 待跳的那一格;没有就是 null。
 *
 * @param p 组件收到的 props。
 * @returns 待跳的格;null = 没有。
 */
export function scoreFocusOf(p: PnpScoreCardIn): ScoreFocus | null {
  if (p.focusQuestion == null) {
    return null
  }
  return p.focusQuestion
}

/**
 * 分值卡的初始时薪。存档优先于岗位语境:用户自己填过就以他的为准(岗位时薪只是没填时的预填)。
 *
 * @param ctx 岗位语境。
 * @returns 时薪。
 */
export function initialWageOf(ctx: ScoreContext): number {
  const stored = readScoreAnswers().wage
  if (stored != null) {
    return stored
  }
  if (ctx.hourly == null) {
    return 0
  }
  return Math.round(ctx.hourly)
}

/**
 * 分值卡的初始工作地区档。同上:存档 > 按岗位城市猜;两样都没有就落保守默认(0 分那一档)。
 *
 * @param ctx 岗位语境。
 * @returns 档序。
 */
export function initialAreaOf(ctx: ScoreContext): number {
  const stored = readScoreAnswers().areaI
  if (stored != null) {
    return stored
  }
  if (ctx.city == null || ctx.city === '') {
    return AREA_MVRD
  }
  return areaIndexOf({ city: ctx.city })
}

/**
 * 分值卡的初始 offer 态。基础卷答过(ctx.hasOffer 有值)以基础卷为准;
 * 存档兜底只剩历史答案(#304 起分值卡不再自问)。
 *
 * @param ctx 岗位语境。
 * @returns 有没有。
 */
export function initialHasOfferOf(ctx: ScoreContext): boolean {
  if (ctx.hasOffer != null) {
    return ctx.hasOffer
  }
  const stored = readScoreAnswers().hasOffer
  if (stored == null) {
    return false
  }
  return stored
}

/**
 * offer 这一格存档里真答过没有。
 *
 * @returns 真答过没有。
 */
export function initialOfferTouchedOf(): boolean {
  return readScoreAnswers().hasOffer != null
}

/**
 * 分值卡存档里的加分项勾选。
 *
 * @returns 勾选表。
 */
export function initialTicksOf(): Record<string, boolean> {
  return readScoreAnswers().ticks
}

/**
 * 分值卡存档里的官方档位直选。
 *
 * @returns 直选表。
 */
export function initialRowAnswersOf(): Record<string, number> {
  return readScoreAnswers().rowAnswers
}

/**
 * 同职业各省在招数的初值(还没查回来就是空表)。
 *
 * @returns 空表。
 */
export function emptyByProv(): Record<string, PlanJobCount> {
  return {}
}

/**
 * 已答几题(翻过 / 选过才算答了)。
 *
 * @param x 逐屏的题与已答标记。
 * @returns 几题。
 */
export function answeredCountOf(x: AnsweredCountIn): number {
  let n = 0
  for (const q of x.questions) {
    if (x.answered[q.key] === true) {
      n += 1
    }
  }
  return n
}

/**
 * 这一屏的题;没题可出就给 null。
 *
 * @param x 逐屏的题与题序。
 * @returns 这一屏的题;null = 没题。
 */
export function questionAt(x: QuestionAtIn): ExtraQuestion | null {
  const q = x.questions[x.at]
  if (q == null) {
    return null
  }
  return q
}

/**
 * 第一道没答的题在第几屏。中途退出再进来落在这里,不让人从头再翻一遍答过的。
 *
 * @param x 逐屏的题与已答标记。
 * @returns 题序;-1 = 全答完了。
 */
export function firstUnansweredOf(x: AnsweredCountIn): number {
  for (let i = 0; i < x.questions.length; i += 1) {
    const q = x.questions[i]
    if (q != null && x.answered[q.key] !== true) {
      return i
    }
  }
  return -1
}

/**
 * 这道题在第几屏。
 *
 * @param x 逐屏的题与要找的题 key。
 * @returns 题序;-1 = 没这道题。
 */
export function questionIndexOf(x: QuestionIndexIn): number {
  for (let i = 0; i < x.questions.length; i += 1) {
    const q = x.questions[i]
    if (q != null && q.key === x.key) {
      return i
    }
  }
  return -1
}

/**
 * 装配整机时算一遍就够的几样事实:有表的省、直选题、时薪归属省、offer 闸、
 * 题单与推导、有效勾选、各省估分。
 *
 * @param x props、两个状态格、落格总口与几样算好的事实。
 * @returns 那几样事实。
 */
export function scoreCardCoreOf(x: ScoreCardBuildIn): ScoreCardCore {
  const p = x.props
  const provinces = scoreProvincesOf({ factors: p.factors, province: scoreTargetProvOf(p.ctx) })
  const manual = manualQuestionsOf({ provinces, factors: p.factors, ctx: p.ctx })
  const wageProvince = wageProvinceOf(p.factors)
  const offerYes = p.ctx.hasOffer === true && x.answers.hasOffer
  const build = extraQuestionsOf({
    t: p.t,
    lang: p.lang,
    ctx: p.ctx,
    factors: p.factors,
    provinces,
    manual,
    hidden: x.hidden,
    limits: x.limits,
    splitWork: x.splitWork,
    profile: x.profile.profile,
    rowAnswers: x.answers.rowAnswers,
    ticks: x.answers.ticks,
    wage: x.answers.wage,
    areaI: x.answers.areaI,
    offerYes,
    basics: readAnswers(),
    wageProvince,
    acts: x.acts,
  })
  const effTicks = effTicksOf({ ticks: x.answers.ticks, derivedTicks: build.derivedTicks, offerYes })
  const scores = provinceScoresOf({
    provinces,
    factors: p.factors,
    profile: x.profile.profile,
    effTicks,
    wage: x.answers.wage,
    areaI: x.answers.areaI,
    offerYes,
    rowAnswers: x.answers.rowAnswers,
    ctx: p.ctx,
  })
  return { provinces, manual, wageProvince, offerYes, build, effTicks, scores }
}

/**
 * 各内件消费的整机。
 *
 * @param y 装配入参、算好的事实与两段计数。
 * @returns 整机。
 */
export function scoreCardPanelOf(y: PanelBuildIn): ScoreCardPanel {
  const x = y.x
  const p = x.props
  const core = y.core
  const at = Math.min(x.answers.at, Math.max(y.total - 1, 0))
  const question = questionAt({ questions: core.build.questions, at })
  const label: ExtraLabelIn = { t: p.t, at, total: y.total }
  const nav: ExtraNavMakeIn = {
    at,
    total: y.total,
    setAt: x.answers.setAt,
    question,
    acts: x.acts,
    onComplete: p.onQuestionnaireComplete,
    onBack: p.onQuestionnaireBack,
  }
  const active: ExtraActiveIn = { question, answered: x.answers.extraAnswered }
  return {
    t: p.t,
    lang: p.lang,
    ctx: p.ctx,
    factors: p.factors,
    draws: p.draws,
    streams: scoreStreamsOf(p),
    targetMode: targetModeOf(p),
    asking: inputsOf(p) && targetModeOf(p) && y.showQuestionnaire,
    showResults: showResultsOf({ p, showQuestionnaire: y.showQuestionnaire, done: y.done, total: y.total }),
    inputsShown: inputsOf(p) && targetModeOf(p) === false,
    title: scoreTitleOf({ t: p.t, targetMode: targetModeOf(p) }),
    question,
    answered: extraActiveAnsweredOf(active),
    picked: extraPickedOf(active),
    prevLabel: extraPrevLabelOf(label),
    nextLabel: extraNextLabelOf(label),
    doneLabel: extraDoneLabelOf(label),
    hint: extraHintOf({ t: p.t, question }),
    onPrev: makeExtraPrev(nav),
    onNext: makeExtraNext(nav),
    onDone: p.onQuestionnaireComplete,
    onPick: makeExtraPick({ question, acts: x.acts }),
    onNumber: makeExtraNumber({ question }),
    fields: scoreFieldsOf({
      t: p.t,
      lang: p.lang,
      factors: p.factors,
      scores: core.scores,
      manual: core.manual,
      hidden: x.hidden,
      splitWork: x.splitWork,
      profile: x.profile.profile,
      rowAnswers: x.answers.rowAnswers,
      wage: x.answers.wage,
      areaI: x.answers.areaI,
      acts: x.acts,
    }),
    scores: core.scores,
    activeProv: activeScoreProvOf({
      scores: core.scores, openProv: x.answers.openProv, target: scoreTargetProvOf(p.ctx),
    }),
    onProv: x.answers.setOpenProv,
    byProv: x.byProv,
    ticks: x.answers.ticks,
    derivedTicks: core.build.derivedTicks,
    offerYes: core.offerYes,
    hasOffer: x.answers.hasOffer,
    onOffer: makeOfferAnswer({ setHasOffer: x.answers.setHasOffer, setOfferTouched: x.answers.setOfferTouched }),
    acts: x.acts,
  }
}

/**
 * 分值卡的整机与它上抛要用的几个量。
 *
 * @param x props、两个状态格、落格总口与几样算好的事实。
 * @returns 整机与上抛量。
 */
export function scoreCardMachineOf(x: ScoreCardBuildIn): ScoreCardMachine {
  const p = x.props
  const core = scoreCardCoreOf(x)
  const total = core.build.questions.length
  const done = answeredCountOf({ questions: core.build.questions, answered: x.answers.extraAnswered })
  const showQuestionnaire = showQuestionnaireOf(p)
  const echo = echoRowsOf({
    t: p.t,
    lang: p.lang,
    questions: core.build.questions,
    extraAnswered: x.answers.extraAnswered,
    wageProvince: core.wageProvince,
    derivedEcho: core.build.derivedEcho,
  })
  return {
    panel: scoreCardPanelOf({ x, core, total, done, showQuestionnaire }),
    questions: core.build.questions,
    echo,
    done,
    total,
    showQuestionnaire,
  }
}

/**
 * 分值卡最外层的类。答题态撑满题卡;结果态是普通块 —— 卡壳(边框/圆角/内边距)由外层
 * 弹框壳提供,这里再画一层就是卡中卡。
 *
 * @param d 分值卡整机。
 * @returns 类名;不给 = 结果态,不加类。
 */
export function scoreRootClsOf(d: ScoreCardPanel): string | undefined {
  if (d.asking) {
    return CLS_QUIZ_FILL
  }
  return undefined
}

/**
 * 一道单选题交给答题壳的选项行。
 *
 * @param choices 这道题的选项。
 * @returns 选项行。
 */
export function quizChoiceListOf(choices: ExtraChoice[]): ScoreChoiceRow[] {
  const out: ScoreChoiceRow[] = []
  for (const c of choices) {
    out.push({ value: c.key, text: c.text })
  }
  return out
}

/**
 * 你的职业在这个省命中的具名通道名。
 *
 * @param x 通道表与省码。
 * @returns 通道名;'' = 对不上通道。
 */
export function streamOfProv(x: StreamOfProvIn): string {
  const hit = x.streams[x.prov]
  if (hit == null) {
    return TEXT_NONE
  }
  return hit
}

/**
 * 结果区那颗 offer 勾选框。#304:只在基础卷答了「有 offer」时摆
 * (闸门与算分同口径,没答不等于有)。
 *
 * @param x 分值卡整机与省码。
 * @returns 这一条;null = 不摆。
 */
export function offerTickRowOf(x: OfferTickRowIn): BonusTickRow | null {
  if (x.d.ctx.hasOffer !== true) {
    return null
  }
  for (const f of x.d.factors) {
    if (f.province === x.prov && f.factor === FACTOR_OFFER && f.kind === KIND_ROW) {
      return {
        key: FACTOR_OFFER,
        text: officialLabel({ raw: f.label, lang: x.d.lang }),
        pts: f.points,
        on: x.d.hasOffer,
        toggle: x.d.onOffer,
      }
    }
  }
  return null
}

/**
 * 结果区加分项网格的各条(offer 那一条排在最前)。
 *
 * @param x 分值卡整机与这个省的估分。
 * @returns 各条。
 */
export function bonusTicksOf(x: BonusTicksMakeIn): BonusTickRow[] {
  const out: BonusTickRow[] = []
  const offer = offerTickRowOf({ d: x.d, prov: x.s.province })
  if (offer != null) {
    out.push(offer)
  }
  const list = bonusListOf({
    factors: x.d.factors, prov: x.s.province, offerYes: x.d.offerYes, derivedTicks: x.d.derivedTicks,
  })
  for (const b of list) {
    const key = tickKeyOf({ prov: x.s.province, factor: b.factor, seq: b.seq })
    out.push({
      key,
      text: officialLabel({ raw: b.label, lang: x.d.lang }),
      pts: b.points,
      on: x.d.ticks[key] === true,
      toggle: makeTickToggle({ acts: x.d.acts, key, siblings: [] }),
    })
  }
  return out
}

/**
 * 加分项的分值文字。MB 有负分 bonus(Risk Assessment -100):符号跟着分值走,
 * 别拼出「+-100」;官方没给分的那一条整格不出。
 *
 * @param pts 该条的分值;null = 官方没给分。
 * @returns 分值文字;'' = 不出这一格。
 */
export function ptsSignTextOf(pts: number | null): string {
  if (pts == null) {
    return TEXT_NONE
  }
  if (pts >= 0) {
    return SIGN_PLUS + String(pts)
  }
  return String(pts)
}

/**
 * 「换省」那一句:该省官方给雇主 offer 记多少分 —— 拿到就 +N,直接说出合计。
 *
 * @param x 取词函数、这个省的估分与能加几分。
 * @returns 一句话。
 */
export function switchTextOf(x: SwitchTextIn): string {
  let prov = x.t(KEY_PROV + x.score.province)
  if (prov === TEXT_NONE) {
    prov = x.score.province
  }
  return x.t('ps.switch', { prov, n: x.gain, total: switchTotalOf({ score: x.score, gain: x.gain }) })
}

/**
 * 勾选框的变更手柄。
 *
 * @param x 勾选落格。
 * @returns 手柄。
 */
export function makeCheckChange(x: CheckChangeIn): ScoreCheckChangeFn {
  return function onChange(e: React.ChangeEvent<HTMLInputElement>): void {
    x.toggle(e.target.checked)
  }
}

/**
 * 「你的条件」一格下拉的变更手柄。
 *
 * @param x 这一格的落格。
 * @returns 手柄。
 */
export function makeSelectChange(x: SelectChangeIn): ScoreSelectChangeFn {
  return function onChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.onPick(e.target.value)
  }
}

/**
 * 「你的条件」一格数字输入的变更手柄。
 *
 * @param x 这一格的落格。
 * @returns 手柄。
 */
export function makeInputChange(x: SelectChangeIn): ScoreChangeFn {
  return function onChange(e: React.ChangeEvent<HTMLInputElement>): void {
    x.onPick(e.target.value)
  }
}

/**
 * 岗位轻查挂掉时的空结果面。`?job=` 那条查询是锦上添花:挂了就当没带岗,
 * 页面照常出 —— 宁可少一块,不许整页跟着倒。
 *
 * @returns 零行的结果面。
 */
export function emptyJobRows(): EmptyJobRows {
  return { rows: [], rowCount: null }
}

/**
 * 认人挂了 = 当匿名。SSR 这一版本来就按「登录档案 / 无本地答案」算,
 * 认不出人只是少了档案那一半,判定照跑。
 *
 * @returns 没有登录用户。
 */
export function nullUser(): null {
  return null
}

/**
 * 判定挂了的空值:SSR 这一版拿不到就当没有,客户端挂载后自己再取一次。
 *
 * @returns 没有。
 */
export function nullWire(): null {
  return null
}

/**
 * 判定卡**服务端先算一版**(2026-08-12):先前整张卡都在客户端取,一进页面先盯 ~1.5s 的骨架条。
 * 服务端读不到 localStorage,所以这一版按「登录档案 / 无本地答案」算;客户端拿到本地答案后再刷一次。
 * 认人与判定两支都由页面门注进来(本桶一个 `/server` 门都不 import,浏览器照样打包得动),
 * 用的仍是同一支 tripleWireOf,与 `/api/ruling/verdict` 一条口径(付费闸也在里面,SSR 不会多漏一行)。
 *
 * @param x 岗位号、请求头那只 promise,以及注进来的认人 / Pro 判定 / 三项判定。
 * @returns 判定线格。
 */
export async function ssrWireOf(x: SsrWireIn): Promise<PlanWire> {
  const user = await x.loadUser(await x.head).catch(nullUser)
  return x.judge({ id: x.id, answers: null, user, pro: x.pro(user) })
}

/**
 * 让判定和一只计时器赛跑:谁先回谁算,回来后照旧把定时器清掉。
 * 计时器句柄挂在一个本地容器上,而不是给 `let` 重新赋值 —— 后者被
 * react-hooks/immutability 判成「渲染完成后改变量」。
 *
 * @param x 在跑的那件事与等它的上限。
 * @returns 判定线格;计时器先到就是 null。
 */
export async function raceWire(x: RaceWireIn): Promise<PlanWire | null> {
  const timer: RaceTimer = { handle: null }
  const wire = await Promise.race([
    x.task,
    new Promise<null>(function arm(resolve) {
      timer.handle = setTimeout(function fire() {
        resolve(null)
      }, x.ms)
    }),
  ])
  if (timer.handle) {
    clearTimeout(timer.handle)
  }
  return wire
}
