/**
 * 给上层复述用的字(C3 §四):basis/why 是**算术的说明**、notes 是口径说明 ——
 * 喂措辞层(渲染 / LLM 复述)的原料,不是给用户读的成品文案,所以不进 i18n(设计原文:
 * 「所有 basis/why 字段是算术的说明,不是给用户读的成品文案」)。
 * 🔴 本文件只装**字**(带 `{slot}` 槽位的模板串);填充在 functions.ts 走 `lib/template` 的 fill。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

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
 * 整份方案的口径说明(复述层照此措辞,不是成品文案)。
 */
export const PLAN_NOTES = [
  '月数只包含本站有官方出处的段;标 partial 的路径有一段算不了,它的数是**下界**,不是总数',
  '抽选段回答的是「官方多久开一轮」,不是「你要等几轮才被抽中」—— 池子构成与你的排位本站不知道',
  '官方规费与他人报价是两个口径,本层并列摆出、不相减',
  '门槛判定沿用 rules.ts:pass/fail/unknown 三态,unknown 进 unresolved,不计月数',
]
