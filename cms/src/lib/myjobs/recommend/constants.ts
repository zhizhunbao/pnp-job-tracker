/**
 * 我的岗位域子桶 recommend 的死值:今日推荐的推荐指数 —— 目标、硬性条件判定、打分权重与分数线、结论与说明的词条键尾。
 * 2026-11-11 任务书第 41 到 46 条立;父桶 functions 过 1000 行闸,这一族切成子桶(父桶 → 子桶单向,常量各自抄)。
 *
 * @author Frank
 * @time 2026-11-11 23:00:00
 */

/**
 * 空串。
 */
export const TEXT_NONE = ''

// =========================================================================
// 推荐指数(2026-11-11 任务书第 41 到 46 条;权重与分数线 Frank 定、先拟,和第 48 条的数据一起上,跑一两周再校)
// =========================================================================

/**
 * 档案「目标」题里「拿 PR」那一档的值(lib/quiz 的 FIELD_SPECS.goalBand:1 = 容易拿身份;2 = 先找到工作;0 = 没答)。
 */
export const GOAL_PR_BAND = 1

/**
 * 目标:拿 PR。
 */
export const GOAL_PR = 'pr'

/**
 * 目标:找工作(没答目标也按它,任务书第 41 条的默认)。
 */
export const GOAL_JOB = 'job'

/**
 * 拿 PR 要补的档案项:身份。
 */
export const NEED_WHO = 'who'

/**
 * 拿 PR 要补的档案项:语言成绩。
 */
export const NEED_CLB = 'clb'

/**
 * 拿 PR 要补的档案项:工作年限。
 */
export const NEED_EXP = 'exp'

/**
 * 语言档「没答」。
 */
export const CLB_BAND_NONE = 0

/**
 * 语言档「还没考」(lib/quiz 的 FIELD_SPECS.clbBand:1 = 还没考,2 = CLB 4,…,8 = CLB 10 以上)。
 */
export const CLB_BAND_UNTESTED = 1

/**
 * 语言档 → CLB 级数要加的数(档 2 = CLB 4)。
 */
export const CLB_BAND_OFFSET = 2

/**
 * 没考语言时的 CLB(0 = 任何带数字的要求都不够)。
 */
export const CLB_NONE = 0

/**
 * 同职业总经验档 → 月数(lib/quiz 的 FIELD_SPECS.totalExpBand;「不到 1 年」按 6 个月算;0 没答与 9 不清楚不在表里 = 要补)。
 */
export const EXP_BAND_MONTHS: Record<number, number> = {
  /**
   * 没有。
   */
  1: 0,

  /**
   * 不到 1 年。
   */
  2: 6,

  /**
   * 1 年。
   */
  3: 12,

  /**
   * 2 年。
   */
  4: 24,

  /**
   * 3 年。
   */
  5: 36,

  /**
   * 4 年。
   */
  6: 48,

  /**
   * 5 年以上。
   */
  7: 60,
}

/**
 * 门槛行的项:语言。
 */
export const FACTOR_LANG = 'language'

/**
 * 门槛行的单位:年(工作经验行有按年登的,换成月再比)。
 */
export const UNIT_YEARS = 'years'

/**
 * 一年几个月。
 */
export const MONTHS_PER_YEAR = 12

/**
 * 门槛行里 TEER、职业码清单的分隔符。
 */
export const LIST_SEP = ','

/**
 * 工作经验行里档案分不出的限定(同一雇主在职、本省、魁北克省内、毕业工签、本省毕业、执照):带这些的行不拿来判过与不过,
 * 只当「还有别的路」,标需自行核对(2026-11-11 Frank「这个门槛是最麻烦的」→ 只做粗判)。
 */
export const BASIS_UNSURE_RE = /employerTenure|inProvince|inQuebec|pgwp|provGraduate|licence/

/**
 * 语言本站没收到数字、先标「需自行核对」的通道(2026-11-11 Frank「先标核对」):阿省科技、阿省警务走联邦 EE,
 * 省里只写 CRS;萨省现有工签的语言行 9 月 29 日起特意没入门槛表(etl/pnp 的 OUT_SK_REQ 注)。
 */
export const CHECK_LANG_KEYS = ['ab-accelerated-tech', 'ab-law-enforcement', 'sk-existing-work-permit']

/**
 * 工作经验本站没收到数字、先标「需自行核对」的通道(同上):再加 BC 卫生局(由卫生局定)、爱德华王子岛在需职业(同一个入表的坑)。
 */
export const CHECK_WORK_KEYS = [
  'ab-accelerated-tech', 'ab-law-enforcement', 'sk-existing-work-permit', 'bc-health-authority', 'pe-occupations-in-demand',
]

/**
 * 推荐指数的档:高。
 */
export const LEVEL_HIGH = 'high'

/**
 * 推荐指数的档:中。
 */
export const LEVEL_MID = 'mid'

/**
 * 推荐指数的档:低(默认不推,高中都没有时才出)。
 */
export const LEVEL_LOW = 'low'

/**
 * 高档的分数线(总分与各分项同用;先拟)。
 */
export const LEVEL_HIGH_MIN = 70

/**
 * 中档的分数线(先拟)。
 */
export const LEVEL_MID_MIN = 40

/**
 * 找工作的权重(百分):匹配第一、薪资第二、地点第三,不看雇主信号(任务书第 43 条;先拟)。
 */
export const WEIGHTS_JOB = {
  /**
   * 匹配(简历;没有简历时按想做和做过的工作)。
   */
  match: 60,

  /**
   * 雇主信号。
   */
  emp: 0,

  /**
   * 薪资。
   */
  pay: 25,

  /**
   * 地点。
   */
  place: 15,
}

/**
 * 拿 PR 过了硬性条件之后的权重(百分):匹配、雇主信号、薪资、地点(任务书第 42 条;先拟)。
 */
export const WEIGHTS_PR = {
  /**
   * 匹配。
   */
  match: 45,

  /**
   * 雇主信号。
   */
  emp: 25,

  /**
   * 薪资。
   */
  pay: 15,

  /**
   * 地点。
   */
  place: 15,
}

/**
 * 分项满分。
 */
export const SCORE_MAX = 100

/**
 * 分项零分。
 */
export const SCORE_MIN = 0

/**
 * 薪资分:和中位持平、或缺薪资 / 中位数据时的分。
 */
export const PAY_BASE = 50

/**
 * 薪资分:高出中位每 1% 加几分(高 20% 满分,低 20% 零分)。
 */
export const PAY_SLOPE = 2.5

/**
 * 地点分:同省不同城。
 */
export const PLACE_PROV = 60

/**
 * 雇主信号分:有 LMIA 获批名额(AIP / 社区试点指定雇主给满分)。
 */
export const EMP_LMIA = 70

/**
 * 匹配分(没有简历时):和收藏或投过的岗同职业(档案想做 / 做过的工作命中给满分)。
 */
export const OCC_SIMILAR = 60

/**
 * 语言档、总经验档、目标档「没答」。
 */
export const BAND_NONE = 0

/**
 * 结论胶囊:符合。
 */
export const TAG_PASS = 'pass'

/**
 * 结论胶囊:需自行核对。
 */
export const TAG_CHECK = 'check'

/**
 * 结论:不符合(这一岗不推,不下发)。
 */
export const TAG_FAIL = 'fail'

/**
 * 结论胶囊:未知(缺数据)。
 */
export const TAG_NONE = 'none'

/**
 * 一项结论的身份:身份。
 */
export const LINE_WHO = 'who'

/**
 * 一项结论的身份:学历。
 */
export const LINE_EDU = 'edu'

/**
 * 一项结论的身份:语言。
 */
export const LINE_LANG = 'lang'

/**
 * 一项结论的身份:工作经验。
 */
export const LINE_WORK = 'work'

/**
 * 一项结论的身份:全职长期。
 */
export const LINE_TERM = 'term'

/**
 * 一项结论的身份:省提名抽选。
 */
export const LINE_DRAW = 'draw'

/**
 * 一项结论的身份:职业对口(没有简历时的匹配项)。
 */
export const LINE_OCC = 'occ'

/**
 * 一项结论的身份:薪资。
 */
export const LINE_PAY = 'pay'

/**
 * 一项结论的身份:地点。
 */
export const LINE_PLACE = 'place'

/**
 * 一项结论的身份:雇主信号。
 */
export const LINE_EMP = 'emp'

/**
 * 说明一句:要求的数字够了。
 */
export const NOTE_PASS = 'pass'

/**
 * 说明一句:官方写明这一档不要求。
 */
export const NOTE_FREE = 'free'

/**
 * 说明一句:官方要求原文,需自行核对。
 */
export const NOTE_TEXT = 'text'

/**
 * 说明一句:本站没收到这条通道的数字,需自行核对。
 */
export const NOTE_SELF = 'self'

/**
 * 说明一句:通道对院校有条件,档案没填教育经历。
 */
export const NOTE_BLANK = 'blank'

/**
 * 说明一句(职业对口):档案想做 / 做过的工作命中。
 */
export const NOTE_WANT = 'want'

/**
 * 说明一句(职业对口):和收藏或投过的岗同职业。
 */
export const NOTE_SIMILAR = 'similar'

/**
 * 说明一句(薪资):高于中位。
 */
export const NOTE_UP = 'up'

/**
 * 说明一句(薪资):低于中位。
 */
export const NOTE_DOWN = 'down'

/**
 * 说明一句(薪资):和中位持平。
 */
export const NOTE_SAME = 'same'

/**
 * 说明一句:缺数据。
 */
export const NOTE_NONE = 'none'

/**
 * 说明一句(地点):同城。
 */
export const NOTE_CITY = 'city'

/**
 * 说明一句(地点):同省。
 */
export const NOTE_PROV = 'prov'

/**
 * 说明一句(地点):别的省。
 */
export const NOTE_OTHER = 'other'

/**
 * 说明一句(雇主信号):AIP 或社区试点指定雇主。
 */
export const NOTE_DESIGNATED = 'designated'

/**
 * 说明一句(雇主信号):有 LMIA 获批名额。
 */
export const NOTE_LMIA = 'lmia'

/**
 * 一项结论的身份:简历匹配(有可用的简历正文时的匹配项,替掉职业对口)。
 */
export const LINE_RESUME = 'resume'

/**
 * 说明一句(简历匹配):职位描述的词有几个出现在简历里。
 */
export const NOTE_HIT = 'hit'

/**
 * 简历匹配满分的命中率(职位描述的词干里出现在简历里的比例到这个数就满分;实测不对口的简历 10% 到 39%、对口的 36% 到 43%,
 * 原拟 0.35 时对口的全是满分拉不开,同日改 0.5;先拟,跑一两周再校)。
 */
export const MATCH_FULL_RATIO = 0.5

/**
 * 简历至少要切出多少个英文词干才算可用(中文简历、扫描件切不出来,退回按职业判)。
 */
export const RESUME_LEX_MIN = 30
