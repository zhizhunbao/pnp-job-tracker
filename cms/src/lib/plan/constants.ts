/**
 * 路径规划域的死值:换算常量、排序阈值、不可换算清单,以及 basis/why 的模板串。
 * 🔴 模板串住这儿不住 prompts(Frank 2026-08-22 拍板:prompts 只放与 AI 交互的内容)——
 * basis/why 喂的是「渲染层或 LLM 复述」的混合受众,是字符串表,归常量。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

/**
 * 月长(365.25/12):周 → 月、天 → 月都走它。四舍五入到 0.1 个月,精度到此为止 ——
 * 官方给的就是「2 weeks」「每两周一轮」这种颗粒度,算到小数点后两位是假精确。
 */
export const DAYS_PER_MONTH = 30.4375

/*
 * (MS_PER_DAY 2026-08-24 撤编:天毫秒收进 lib/time 的 DAY_MS —— 原先本域、
 * lib/stripe 与四处裸 86400000 各写各的)
 */

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
 * 档位键里 blockedBy / tier 这两格**没有值**时占的空位:两个分隔符之间空着,
 * 就是「这行没有这一格」。不填 'none' 之类的假值 —— 键只用来把同类行归堆,
 * 一旦填了字,「没有障碍」就会和某个真叫 none 的障碍归进同一档。
 */
export const BAND_NONE = ''

/**
 * 一个空格(processing 段 period 槽的前导)。
 */
export const SPACE = ' '

/**
 * 方案计算器各段的算术说明与「为什么算不出」模板(槽位值由 functions 算好填入)。
 */
export const PLAN_TEXT = {
  /**
   * gap 段:差值算术原文(have 槽由调用方把 null 折成 0 展示 —— 只是展示,算术早已判过)。
   */
  gapBasis: '官方要 {need} {unit},已有 {have} {unit} → 差 {short} {unit}',

  /**
   * gap 段:单位换算不了。
   */
  gapUnitWhy: '差值单位「{unit}」不能换算成月,不猜',

  /**
   * 出处闸:数字没有出处判不可用。
   */
  noEvidenceWhy: '{factor}:这个数字在本站没有出处,不能用(出处缺失 → 判不可用)',

  /**
   * draw 段:官方明示不进池。
   */
  noDrawBasis: '该通道官方明示不递 EOI、不进池 → 没有「等抽选」这一步',

  /**
   * draw 段:只有一轮记录。
   */
  oneRoundWhy: '{province} 本站只有 1 轮记录,算不出开轮间隔',

  /**
   * draw 段:未收录 ≠ 没有抽选。
   */
  noRoundsWhy: '本站未收录 {province} 的抽选记录 —— 不等于该省没有抽选',

  /**
   * draw 段:节奏算术原文。
   */
  cadenceBasis: '{from} 起 {rounds} 轮,平均间隔 {avgDays} 天 = 官方开一轮的周期(不是「你要等几轮」)',

  /**
   * processing 段:官方口径原文(period 槽由调用方连头部空格一起给,没有则空串)。
   */
  processingBasis: '官方{period}「{label}」{value} {unit}',

  /**
   * processing 段:该省运营统计里没有处理时长这一项。
   */
  processingMissingWhy: '{province} 官方运营统计里没有处理时长这一项(本站收录的其他指标不含它)',

  /**
   * processing 段:本站没有该省处理时长。
   */
  processingNoneWhy: '本站没有 {province} 的官方处理时长',

  /**
   * processing 段:指明的口径不存在。
   */
  scopeMissWhy: '{province} 官方处理时长里没有「{scope}」这条口径',

  /**
   * processing 段:多条口径不替你挑。
   */
  scopeManyWhy: '{province} 官方按 {n} 条通道分别公布处理时长,没指明走哪条 —— 不替你挑',

  /**
   * processing 段:官方那一格不是可用周数(text 槽由调用方把空串折成「空」展示)。
   */
  valueNaWhy: '官方这一格是「{text}」,不是一个可用的周数',

  /**
   * blocker:雇主侧事实缺。
   */
  employerBlockerWhy: '雇主侧事实本站没有,要雇主出材料',

  /**
   * blocker:申请人侧信息缺。
   */
  applicantBlockerWhy: '本站不知道你这一项的情况,判不了',

  /**
   * 快慢差(exact)算术原文。
   */
  exactBasis: '{slowProv} {slow} 个月 − {fastProv} {fast} 个月(两条都全段有官方数据)',

  /**
   * 快慢差(atLeast)算术原文。
   */
  atLeastBasis: '{slowProv} 光已确定的段就 {slowLow} 个月(还有 {unknownN} 段本站算不了,真实值只会更大)− {fastProv} 全段合计 {fast} 个月',
} as const

/**
 * valueNaWhy 的 text 槽在官方原文为空串时的展示字。
 */
export const NA_TEXT = '空'

/**
 * 一段**没有算术原文**。basis 与 why 是分工:basis 说「这个数是怎么算出来的」,
 * why 说「为什么算不出数」—— 算不出的段(出处闸降级、单位换算不了、抽选记录不够)
 * basis 一律空,话全写在 why。不塞「暂无」之类的字:渲染层看见空串才知道这一格根本不出现。
 */
export const BASIS_NONE = ''

/**
 * 一段**没有「为什么算不出」可写**。与 BASIS_NONE 互补:一段要么算出来了(有 basis)、
 * 要么算不出(有 why),不会两样都有,也不会两样都没有。
 */
export const WHY_NONE = ''

/**
 * 模板槽位**没有数**时填的空串(gapBasis 的 need / short、processingBasis 的 period)。
 * 官方那一格没数就空着印,**不折成 0** —— 折 0 = 替官方编一个数;
 * 这些槽只管展示,能不能算早由 months 判过了。
 * 对 period 这种可选前缀,空串还有第二层意思:这一段不加(纯拼接,拼上空等于没拼)。
 */
export const SLOT_NONE = ''

/**
 * 出库那一格**库里没值**时对外给的空串:路径的 stream、门槛的 note、抽选的通道名 /
 * 省码 / 规模、EE 的 category 都走它。这些字段对外声明成 string 而不是 `string | null`,
 * 本域在边界上把 null 收成空串,渲染层只管印字,不必再判一次「有没有」。
 * ⚠️ 只对**字**这么干:数字一格永远保 null(折 0 = 替官方编数)。
 */
export const TEXT_NONE = ''

/**
 * 整份方案的口径说明(复述层照此措辞,不是成品文案)。
 */
export const PLAN_NOTES = [
  '月数只包含本站有官方出处的段;标 partial 的路径有一段算不了,它的数是**下界**,不是总数',
  '抽选段回答的是「官方多久开一轮」,不是「你要等几轮才被抽中」—— 池子构成与你的排位本站不知道',
  '官方规费与他人报价是两个口径,本层并列摆出、不相减',
  '门槛判定沿用 rules.ts:pass/fail/unknown 三态,unknown 进 unresolved,不计月数',
]
