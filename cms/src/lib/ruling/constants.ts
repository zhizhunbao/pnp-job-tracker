/**
 * 判定域的参数与字面量。
 *
 * 🔵 这里只放 JSON 装得下的东西 —— 标量、字符串表、正则。判定在 `functions.ts`,形状在 `types.ts`。
 *
 * @author Frank
 * @time 2026-08-20 02:05:00
 */

import type { GateKey } from '../gateManifest'

// =========================================================================
// 1. 库里的枚举值
// =========================================================================

/**
 * 门槛条文里「这条管谁」。**两个搞混,句子本身就是假的**
 * (「你要开满一年」vs「雇主要开满一年」)。
 */
export const SUBJECT = {
  /**
   * 管申请人。
   */
  applicant: 'applicant',

  /**
   * 管雇主。
   */
  employer: 'employer',
} as const

/**
 * 打分因素行的默认种类。库里没写就是普通一行。
 */
export const FACTOR_ROW = 'row'

// =========================================================================
// 2. 名录匹配
// =========================================================================

/**
 * 名录名里分隔「法定名 / 营业名」的写法。官方登记用 `o/a`,少数写 `dba`。
 */
export const OA_SPLIT = /\s+(?:o\/a|d\/b\/a|dba|operating\s+as|carrying\s+on\s+business\s+as)\s+/gi

/**
 * `&` 归一成这个词 —— 「A & B」与「A and B」是同一家。
 */
export const AND_WORD = ' and '

/**
 * 归一时保留的字符:字母、数字、汉字。其余(标点、多空格)一律压成单空格。
 */
export const NAME_KEEP = /[^a-z0-9一-鿿]+/g

/**
 * 上面那条压完之后填进去的分隔。
 */
export const SPACE = ' '

/**
 * `&` 本身。
 */
export const AMP = /&/g

// =========================================================================
// 3. 雇主侧判定
// =========================================================================

/**
 * 雇主侧的三个因素。**营业额恒旁证** —— 本站从无私企财务来源。
 */
export const EMP_FACTOR = {
  /**
   * 经营年限。
   */
  years: 'empYears',

  /**
   * 雇员数。
   */
  staff: 'empStaff',

  /**
   * 营业额。
   */
  revenue: 'empRevenue',
} as const

/**
 * 公共部门(卫生局 / 市政 / 学区)。**不在企业注册库里,整体旁路,不与私企同一套门槛硬判。**
 */
export const SECTOR_PUBLIC = 'public'

/**
 * 一年几个月。官方原文单位不统一(SK 用月、其余用年),换算成年再比。
 */
export const MONTHS_PER_YEAR = 12

/**
 * 各项的单位。
 */
export const EMP_UNIT = {
  /**
   * 经营年限。
   */
  years: 'years',

  /**
   * 雇员数。
   */
  employees: 'employees',

  /**
   * 营业额。
   */
  revenue: 'CAD/yr',
} as const

/**
 * 官方原文里「月」这个单位。年限门槛 SK 用月、其余用年,比之前先统一。
 */
export const MONTHS = 'months'

/**
 * 单项判定的三态。
 */
export const ITEM = {
  /**
   * 达标。
   */
  pass: 'pass',

  /**
   * 没达标。
   */
  fail: 'fail',

  /**
   * **判不了** —— 不是「不满足」。「我们查不到」和「不够」是两句完全不同的话。
   */
  unknown: 'unknown',
} as const

/**
 * 公司侧那个值的证据性质。**估计的不许当官方说。**
 */
export const EVIDENCE_KIND = {
  /**
   * 官方公布的。
   */
  official: 'official',

  /**
   * 估算出来的(懒查 AI / Wikidata),措辞层要说清它是估的。
   */
  estimate: 'estimate',

  /**
   * 查不到。
   */
  missing: 'missing',
} as const

/**
 * 雇主整体判定的四态。
 */
export const EMP_STATE = {
  /**
   * 各项都达标。
   */
  met: 'met',

  /**
   * 有项没达标。
   */
  short: 'short',

  /**
   * 有项判不了。
   */
  unknown: 'unknown',

  /**
   * 公共部门,整体旁路。
   */
  public: 'public',
} as const

/**
 * 雇主判定里三个因素的键。
 */
export const EMP_KEY = {
  /**
   * 经营年限。
   */
  years: 'years',

  /**
   * 雇员数。
   */
  staff: 'staff',

  /**
   * 营业额。
   */
  revenue: 'revenue',
} as const

// =========================================================================
// 4. 通道判定的闸与代价
// =========================================================================

export const GATE_KEYS: GateKey[] = ['offer', 'statusInCanada', 'credentialCanada', 'fieldMatch', 'french']

/** **选配闸**:没在策略文件里声明 = 这条通道**没扫过这类条款**,跳过不判 —— 与前三类闸相反。
 *  前三类是**每条通道都逐页读过**的(读了没有就记 basis:'absent'),所以「没登记」只能是本站未收录,
 *  该落 unknown 把通道拖成「判不了」。fieldMatch 是 2026-08-15 才立的第四类,现只有 NL 举证过;
 *  若照前三类的规矩办,另外 12 条会因为「没登记」集体判不了 —— 那不是如实,是拿新立的闸反咬旧结论。
 *  🔴 欠账:另外 12 条通道有没有专业对口条款**尚未逐页核**(与 NL 同样的取证方式),核完再决定
 *     是补声明还是把它升格成普适闸。在那之前这里如实跳过,不假装「官方不要求」。 */
export const OPT_IN_GATES = new Set<GateKey>(['fieldMatch', 'french'])

/** 一道闸有多难拆:offer 最好拆(本站正业就是帮人找到 offer)→ 人挪进境内 → 自雇经历 →
 *  重考语言(几个月)→ 加拿大学历(几年)。裁决挑标签、排序定次序,共用这一份口径。 */
export const BLOCK_COST: Record<string, number> = {
  // fieldMatch 用小数插在自雇与语言之间(2026-08-15 新增):它比重考语言好拆(换一份对口的 offer
  // 就行),比自雇经历难(那是既成事实)。用小数是为了**不动**其余四项的既有数值 ——
  // 它们被排序、测试与另一处 RANK 表咬着,重新编号等于顺手改了别的通道的次序。
  // french 与 language 同级(都是重考一门试),排在 language 之后一点点:法语从零学起比重考雅思难
  offer: 0, statusInCanada: 1, selfEmployed: 2, fieldMatch: 2.5, language: 3, french: 3.5, credentialCanada: 4,
}
/** 导出给判定卡的结论句用:「差最难拆的那一项」必须与这里的次序同一把尺子,不许另立一份 */

/**
 * 不认识的闸算多难拆 —— 排到最后,**不假装它好拆**。
 */
export const UNKNOWN_BLOCK_COST = 9

/**
 * 压根没有闸 —— 排在最前。
 */
export const NO_BLOCK_COST = -1

// =========================================================================
// 5. 判定的枚举值
// =========================================================================

/**
 * 一条理由是哪一类。**`needs-info` 与 `excluded` 不许混** —— 前者他一步能补,后者官方明说不行。
 */
export const REASON = {
  /**
   * 官方明说走不通。**必带官方原句。**
   */
  excluded: 'excluded',

  /**
   * 差一截,攒时间或考试能补。
   */
  gap: 'gap',

  /**
   * 已满足。
   */
  met: 'met',

  /**
   * 判不了 —— 缺档案槽。
   */
  needsInfo: 'needs-info',
} as const

/**
 * 一条通道的结论。`viable` **只表示「没有判不了的项」**,差一道闸也是它
 * (2026-08-15 #308 改名:原值 `open` 人人误读成「能走」)—— 还要看 `blockedBy` / `tier` 才知道差什么。
 */
export const VERDICT = {
  /**
   * 官方明说不行。
   */
  excluded: 'excluded',

  /**
   * 没有判不了的项。
   */
  viable: 'viable',

  /**
   * 缺档案槽,判不了。
   */
  needsInfo: 'needs-info',
} as const

/**
 * `tier` 的起算点。**在读学生的等待期一天都还没开始** —— 写成从今天起算是假话。
 */
export const TIER_BASIS = {
  /**
   * 从今天起算。
   */
  now: 'now',

  /**
   * 毕业拿到工签之后才开始算。
   */
  afterStudy: 'after-study',
} as const

/**
 * 门槛条文里的因素名。
 */
export const FACTOR = {
  /**
   * 语言。
   */
  language: 'language',

  /**
   * 经验。
   */
  experience: 'experience',

  /**
   * 居住。**搬过去当天就在计时**,所以它的等待没有「起算点」问题。
   */
  residence: 'residence',

  /**
   * 学历。
   */
  education: 'education',

  /**
   * 年龄。
   */
  age: 'age',

  /**
   * 工作。
   */
  work: 'work',

  /**
   * 工作月数。
   */
  workMonths: 'workMonths',

  /**
   * 加分项。
   */
  bonus: 'bonus',

  /**
   * 抽选。
   */
  draw: 'draw',

  /**
   * 岗位。
   */
  job: 'job',
} as const

/**
 * 阈值的口径。**`employerTenure` 量的是「在这家雇主连续干了多久」**,不是同职业总经验 ——
 * 拿总经验那套话讲它,句子本身就是假的。
 */
export const BASIS = {
  /**
   * 在同一家雇主连续在职时长(MB SWM)。
   */
  employerTenure: 'employerTenure',

  /**
   * 该职业该地区的官方中位工资。
   */
  occMedian: 'occMedian',
} as const

/**
 * 非地域的适用条件。
 */
export const CONDITION = {
  /**
   * 在加拿大其他省/地区读的书(MB SWM 那一档)。
   */
  gradOtherProvince: 'grad-other-province',
} as const

/**
 * 只认本省经验的那条通道。
 */
export const AB_LOCAL_EXP = 'ab-local-experience'

/**
 * 清单行里「在需 / 定向」那一类。
 */
export const INDEMAND = 'indemand'

/**
 * 联邦那一批门槛行的省码 —— 它不是省。
 */
export const FED = 'FED'

/**
 * 打分表里的两套官方分。
 */
export const GRID = {
  /**
   * 进池后的排名分。
   */
  crs: 'CRS',

  /**
   * 够不够资格进池的 67 分选择因素。
   */
  fsw67: 'FSW67',
} as const

/**
 * 持的许可。
 */
export const PERMIT = {
  /**
   * 学签。
   */
  study: 'study',

  /**
   * 毕业工签。
   */
  pgwp: 'pgwp',

  /**
   * 其他工签。
   */
  work: 'work',

  /**
   * 访客或已过期。
   */
  none: 'none',
} as const

/**
 * 判定理由的 i18n 键。**本层不写死任何见客句子** —— 显示端 `t(key, params)` 自己拼。
 *
 * 收在一处的理由:同一个键在判定与测试两头都要用,各写各的迟早对不上。
 */
export const PV_KEY = {
  /**
   * `pv.condUnknown`
   */
  condUnknown: 'pv.condUnknown',

  /**
   * `pv.drawLine`
   */
  drawLine: 'pv.drawLine',

  /**
   * `pv.drawLineScaled`
   */
  drawLineScaled: 'pv.drawLineScaled',

  /**
   * `pv.expNone`
   */
  expNone: 'pv.expNone',

  /**
   * `pv.fedLangGap`
   */
  fedLangGap: 'pv.fedLangGap',

  /**
   * `pv.fedLangOk`
   */
  fedLangOk: 'pv.fedLangOk',

  /**
   * `pv.langGap`
   */
  langGap: 'pv.langGap',

  /**
   * `pv.langNone`
   */
  langNone: 'pv.langNone',

  /**
   * `pv.langOk`
   */
  langOk: 'pv.langOk',

  /**
   * `pv.langUnknown`
   */
  langUnknown: 'pv.langUnknown',

  /**
   * `pv.mbScore`
   */
  mbScore: 'pv.mbScore',

  /**
   * `pv.mbStudyDeduct`
   */
  mbStudyDeduct: 'pv.mbStudyDeduct',

  /**
   * `pv.mbWorkDeduct`
   */
  mbWorkDeduct: 'pv.mbWorkDeduct',

  /**
   * `pv.nlDesignated`
   */
  nlDesignated: 'pv.nlDesignated',

  /**
   * `pv.noExpReq`
   */
  noExpReq: 'pv.noExpReq',

  /**
   * `pv.noLangReq`
   */
  noLangReq: 'pv.noLangReq',

  /**
   * `pv.noLangReqSoft`
   */
  noLangReqSoft: 'pv.noLangReqSoft',

  /**
   * `pv.noReq`
   */
  noReq: 'pv.noReq',

  /**
   * `pv.noScoreBand`
   */
  noScoreBand: 'pv.noScoreBand',

  /**
   * `pv.occIneligible`
   */
  occIneligible: 'pv.occIneligible',

  /**
   * `pv.occListed`
   */
  occListed: 'pv.occListed',

  /**
   * `pv.occNotOnList`
   */
  occNotOnList: 'pv.occNotOnList',

  /**
   * `pv.resNeed`
   */
  resNeed: 'pv.resNeed',

  /**
   * `pv.resShort`
   */
  resShort: 'pv.resShort',

  /**
   * `pv.resUnknown`
   */
  resUnknown: 'pv.resUnknown',

  /**
   * `pv.scoreGulf`
   */
  scoreGulf: 'pv.scoreGulf',

  /**
   * `pv.selfEmp`
   */
  selfEmp: 'pv.selfEmp',

}
