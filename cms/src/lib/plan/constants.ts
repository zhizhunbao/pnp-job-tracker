/**
 * 路径规划域的死值:换算常量、排序阈值、不可换算清单。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

/**
 * 月长(365.25/12):周 → 月、天 → 月都走它。四舍五入到 0.1 个月,精度到此为止 ——
 * 官方给的就是「2 weeks」「每两周一轮」这种颗粒度,算到小数点后两位是假精确。
 */
export const DAYS_PER_MONTH = 30.4375

/**
 * 一天的毫秒数(日期差用)。
 */
export const MS_PER_DAY = 86400000

/**
 * 薄盘线:在招 < 这个数(或无数)沉同档尾。
 */
export const THIN_MIN = 10

/**
 * 两字省码(排序里判「省级行」)。
 */
export const PROV_RE = /^[A-Z]{2}$/

/**
 * 🔴 这些门槛差值**不许换算成月**,列在这里是为了让「为什么不换算」可被审。
 * language:考到 CLB X 要多久,取决于起点、学习强度、考位 —— **本站没有任何官方数据**,
 *          随便给个「3 个月」就是编(红线①)。差几个 CLB 照说,月数留 null。
 * income / wage:钱和时间不是一回事,涨薪要多久没人公布。
 */
export const NOT_TIME_CONVERTIBLE: Record<string, string> = {
  /**
   * 语言差档不换算。
   */
  language: '语言差 N 个档要考多久,本站没有官方数据,不换算成月(差几档见 short)',

  /**
   * 收入差额不是时间。
   */
  income: '收入差额不是时间,不换算成月',

  /**
   * 工资差额不是时间。
   */
  wage: '工资差额不是时间,不换算成月',
}

/**
 * 单位词头(monthsFromUnit 认得出的四种;认不出返回 null,宁缺不猜)。
 */
export const UNIT_HEADS = {
  /**
   * 月。
   */
  month: 'month',

  /**
   * 年。
   */
  year: 'year',

  /**
   * 周。
   */
  week: 'week',

  /**
   * 天。
   */
  day: 'day',
} as const

/**
 * 处理时长的指标键(ops 里挑这一条)。
 */
export const PROCESSING_KEY = 'processing_weeks'

/**
 * draw 段的因素名。
 */
export const CADENCE_FACTOR = 'cadence'

/**
 * 时间线:联邦省码值(draws 表里 FED 行另走 eeCadence,不混省节奏)。
 */
export const PROV_FED = 'FED'

/**
 * 时间线:news 的联邦地区值(两种写法都归 '' 联邦)。
 */
export const REGION_FEDERAL = 'FEDERAL'

/**
 * 时间线:news 的国家码写法。
 */
export const REGION_CA = 'CA'

/**
 * 时间线:通告类抽选行的 kind 值。
 */
export const KIND_NOTICE = 'notice'

/**
 * 节奏分组键的分隔符。
 */
export const GROUP_SEP = '|'


/**
 * 四态字面量(值域与 Availability 联合逐字对齐)。
 */
export const AV = {
  /**
   * 有数。
   */
  ok: 'ok',

  /**
   * 官方不公布。
   */
  notPublished: 'not-published',

  /**
   * 本站未收录。
   */
  notCollected: 'not-collected',

  /**
   * 不适用。
   */
  notApplicable: 'not-applicable',
} as const

/**
 * 段类字面量(值域与 PlanStepKind 联合逐字对齐)。
 */
export const STEP = {
  /**
   * 还缺什么。
   */
  gap: 'gap',

  /**
   * 等抽选。
   */
  draw: 'draw',

  /**
   * 官方处理。
   */
  processing: 'processing',
} as const

/**
 * 时间线确定性字面量。
 */
export const CERT = {
  /**
   * 全段确定。
   */
  complete: 'complete',

  /**
   * 含未知段。
   */
  partial: 'partial',
} as const

/**
 * 快慢差性质字面量。
 */
export const CMP = {
  /**
   * 两条都全段确定。
   */
  exact: 'exact',

  /**
   * 下界已超,至少差这么多。
   */
  atLeast: 'atLeast',
} as const

/**
 * 门槛三态字面量(值域与 ThresholdRow.verdict 联合逐字对齐)。
 */
export const TV = {
  /**
   * 达标。
   */
  pass: 'pass',

  /**
   * 有缺口。
   */
  fail: 'fail',

  /**
   * 判不了。
   */
  unknown: 'unknown',
} as const

/**
 * 雇主侧主体值(blocker 话术分岔用)。
 */
export const SUBJECT_EMPLOYER = 'employer'

/**
 * 档位键的三个占位符:正常位。
 */
export const BAND_A = 'a'

/**
 * 档位键:availability 非 ok 位。
 */
export const BAND_Y = 'y'

/**
 * 档位键:belowLine 位。
 */
export const BAND_Z = 'z'

/**
 * 一个空格(processing 段 period 槽的前导)。
 */
export const SPACE = ' '
