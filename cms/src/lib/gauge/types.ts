/**
 * 量尺域的形状 —— **本域自己声明,不从别的域取**。
 *
 * 只声明本域真正读的那几格:下层多一个字段不必跟着改,真读不到会当场 tsc 红。
 *
 * @author Frank
 * @time 2026-08-20 21:20:00
 */

// =========================================================================
// 1. 门槛行、档案、判定结果
// =========================================================================

/**
 * 一条门槛说的是谁。
 */
export type ReqSubject = 'applicant' | 'employer'

/**
 * 官方门槛的一行 —— 全部来自 `pnp_requirements`(官方页抓取入库)。
 *
 * 🔴 **阈值一个都不许写在代码里**,只能从这里来。
 */
export type Requirement = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 项目名(官方叫法)。
   */
  program: string

  /**
   * 通道名(官方叫法)。
   */
  stream: string

  /**
   * 这条说的是申请人还是雇主。
   */
  subject: ReqSubject

  /**
   * 门槛因素:language / income / experience / empYears / empStaff …
   */
  factor: string

  /**
   * 比较符:`>=` / `<=` / `in` / `none`(none = **官方明说这档不要求**)。
   */
  op: string

  /**
   * 阈值;没有数字的条款为 null。
   */
  value: number | null

  /**
   * 阈值的官方原文写法(有些条款没有数字,只有一句话)。
   */
  valueText: string

  /**
   * 单位。
   */
  unit: string

  /**
   * 适用哪几档 TEER,逗号分隔如 `2,3,4,5`;空 = 不分 TEER。
   */
  appliesTeer: string

  /**
   * NOC 码前缀白名单(ON 技工低档语言门槛);空串 = 不分职业(2026-08-21 四禁:`?` 退役,缺席显式)。
   */
  appliesNoc: string

  /**
   * NOC 码前缀排除表(官方原文的 excluding Sub-Major Group …);空串 = 不排除。
   */
  excludesNoc: string

  /**
   * 适用哪个官方分档区域;空 = 全省。
   */
  appliesArea: string

  /**
   * 非地域的适用条件(MB SWM 的 `grad-other-province` = 「在加拿大其他省/地区读的书」那一档)。
   *
   * 空 = 该条对谁都适用。与 `appliesArea` 分开,是因为那一列存的是**官方枚举的行政区**;
   * 混一个非地理值进去,按区域挑行的收入表 / 雇主雇员数迟早挑到不该挑的行。
   * 本站题库还没问「你在哪个省读的书」→ 引擎不拿它做判定,只把两档一起摆出来。
   */
  appliesCondition: string

  /**
   * 最低收入表专用:这一行对应几口之家。
   */
  familySize: number | null

  /**
   * 阈值的**口径**(不是绝对数时说清按什么算)。见 `BASIS`。
   */
  basis: string

  /**
   * 官方原文。
   */
  label: string

  /**
   * 官方节号。
   */
  section: string

  /**
   * 生效日。
   */
  effective: string

  /**
   * 官方原文所在地址。
   */
  url: string

  /**
   * 该条款所属页面的地址。
   */
  pageUrl: string

  /**
   * 本站抓取日。
   */
  fetched: string
}

/**
 * 引擎吃的「用户情况」。
 *
 * 🔴 全部可为空 —— **空就是 unknown,不填默认值**。
 */
export type RuleProfile = {
  /**
   * 职业码;没答就 null(2026-08-21 四禁:`?` 与 undefined 不进契约,缺席显式写)。
   * 判「这个职业算不算官方列的技工」用(ON 语言分档)。
   */
  noc: string | null

  /**
   * TEER。分 TEER 的门槛行靠它挑。
   */
  teer: number | null

  /**
   * 语言:四项中的最低档(站内 clb 口径)。
   */
  clb: number | null

  /**
   * 加拿大境内工作经验月数。
   */
  canadianExpMonths: number | null

  /**
   * 同职业总经验月数(含海外)—— 官方 experience 要的就是这个口径。
   */
  totalExpMonths: number | null

  /**
   * 家庭人数。暂未入题库 → 多数为 null,按「1 人档」做下界推理。
   */
  familySize: number | null

  /**
   * 该职业在该省的中位年薪(岗位自带的事实,不问用户)。
   */
  annualIncome: number | null

  /**
   * 上面那个数是不是「职业中位」—— 措辞要说清这不是他本人的工资。
   */
  incomeIsOccMedian: boolean

  /**
   * 官方分档区域键;不知道就 null。
   */
  area: string | null
}

/**
 * 一条门槛的判定三态。
 */
export type RuleVerdict = 'pass' | 'fail' | 'unknown'

/**
 * 一条门槛的判定结果。
 */
export type RuleResult = {
  /**
   * 门槛因素。
   */
  factor: string

  /**
   * 这条说的是谁。
   */
  subject: ReqSubject

  /**
   * 阈值口径(原样带出 `Requirement.basis`;多数行为空)。
   *
   * 🔴 消费端**必须**看这一格:同一个 `factor='experience'`,`basis='employerTenure'`
   * 量的是「在这家雇主干了多久」,拿「N 个月技术工作经验(境内外都算)」那套话术去讲它,
   * 句子本身就是假的。没有口径标注就 null(2026-08-21 四禁:`?` 退役,缺席显式)。
   */
  basis: string | null

  /**
   * 达标 / 不达标 / 判不了。
   */
  verdict: RuleVerdict

  /**
   * 官方阈值。
   */
  need: number | null

  /**
   * 同一因素有两档时的低档(如收入表大温 / BC 其余)。
   */
  needLow: number | null

  /**
   * 用户侧或职业侧的值。
   */
  have: number | null

  /**
   * 差多少(只有 fail 才有;免费层不下发)。
   */
  short: number | null

  /**
   * 单位。
   */
  unit: string

  /**
   * 分档因素的完整档位(ON 营业额 GTA / 指定普查区 / 其余三档)。
   *
   * 区域名各省各叫各的,**原样带出去**给显示层。不分档就 null。
   */
  tiers: AreaTier[] | null

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 一个档位:哪个区域、阈值多少。
 */
export type AreaTier = {
  /**
   * 区域名(或非地域的适用条件名)。原样带出,本域不翻译。
   */
  area: string

  /**
   * 该档的阈值。
   */
  value: number | null
}

/**
 * 一条门槛的出处 —— 判定里每个数字都要能指回官方原文。
 */
export type Evidence = {
  /**
   * 官方原文。
   */
  label: string

  /**
   * 官方原文所在地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 官方节号。
   */
  section: string

  /**
   * 生效日。
   */
  effective: string
}

/**
 * 雇主侧的三个门槛值 —— 认不出区域时留空,**宁缺不猜**。
 */
export type EmployerBar = {
  /**
   * 经营年限(年)。
   */
  years: number | null

  /**
   * 营业额。
   */
  revenue: number | null

  /**
   * 全职雇员数。
   */
  staff: number | null
}

// =========================================================================
// 2. 各函数的入参与返回(`XxxIn` / `XxxOut`)
// =========================================================================

/**
 * `normalizeName` 的入参:一个地名。
 */
export type NormalizeNameIn = string

/**
 * `normalizeName` 的返回:小写、只剩字母与空格、去掉首尾空白。
 */
export type NormalizeNameOut = string

/**
 * `areaOfPlace` 的入参。
 */
export type AreaOfPlaceIn = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 城市名。
   */
  city: string

  /**
   * 区名(大渥太华那种社区);没有就传空。
   */
  district: string
}

/**
 * `areaOfPlace` 的返回:官方分档区域键;认不出则空。
 */
export type AreaOfPlaceOut = string

/**
 * `matchesAny` 的入参。
 */
export type MatchesAnyIn = {
  /**
   * 已规范化的候选地名(区名在前、城市名在后)。
   */
  names: string[]

  /**
   * 官方枚举的那张名单。
   */
  list: readonly string[]
}

/**
 * `matchesAny` 的返回。
 */
export type MatchesAnyOut = boolean

/**
 * `placeNames` 的入参。
 */
export type PlaceNamesIn = {
  /**
   * 城市名。
   */
  city: string

  /**
   * 区名。
   */
  district: string
}

/**
 * `placeNames` 的返回:规范化且去空的候选名,**区名在前** —— 区比城市具体。
 */
export type PlaceNamesOut = string[]

/**
 * `employerBar` 的入参。
 */
export type EmployerBarIn = {
  /**
   * 门槛行(可以是全量,本函数自己按省与 subject 筛)。
   */
  reqs: Requirement[]

  /**
   * 两位省码。
   */
  province: string

  /**
   * 官方分档区域键;认不出传空。
   */
  area: string
}

/**
 * `employerBar` 的返回。
 */
export type EmployerBarOut = EmployerBar

/**
 * `barRow` 的入参。
 */
export type BarRowIn = {
  /**
   * 该省的雇主侧门槛行。
   */
  rows: Requirement[]

  /**
   * 门槛因素。
   */
  factor: string

  /**
   * 优先挑哪几个区域;空数组 = 只回落通用行。
   */
  areas: string[]
}

/**
 * `barRow` 的返回:挑中的那一行;没有则 null。
 */
export type BarRowOut = Requirement | null

/**
 * `staffAreas` / `revenueAreas` 的入参。
 */
export type AreasForIn = {
  /**
   * 官方分档区域键。
   */
  area: string
}

/**
 * `staffAreas` / `revenueAreas` 的返回:该因素要按哪几个区域挑行。
 */
export type AreasForOut = string[]

/**
 * `yearsOf` 的入参。
 */
export type YearsOfIn = {
  /**
   * 经营年限那一行;没有则 null。
   */
  row: Requirement | null
}

/**
 * `yearsOf` 的返回:年;没有则 null。
 */
export type YearsOfOut = number | null

/**
 * `teerHit` 的入参。
 */
export type TeerHitIn = {
  /**
   * 门槛行。
   */
  r: Requirement

  /**
   * 他的 TEER;不知道则 null。
   */
  teer: number | null
}

/**
 * `teerHit` 的返回。
 */
export type TeerHitOut = boolean

/**
 * `nocScore` 的入参。
 */
export type NocScoreIn = {
  /**
   * 门槛行。
   */
  r: Requirement

  /**
   * 他的职业码;不知道则不传。
   */
  noc: string | null
}

/**
 * `nocScore` 的返回:命中长度即「有多具体」;`NOC_MISS` = 不适用。
 */
export type NocScoreOut = number

/**
 * `prefixList` 的入参。
 */
export type PrefixListIn = {
  /**
   * 逗号分隔的 NOC 码前缀清单。
   */
  text: string
}

/**
 * `prefixList` 的返回。
 */
export type PrefixListOut = string[]

/**
 * `evidenceOf` 的入参。
 */
export type EvidenceOfIn = {
  /**
   * 门槛行。
   */
  r: Requirement
}

/**
 * `evidenceOf` 的返回。
 */
export type EvidenceOfOut = Evidence

/**
 * `evaluateRequirements` 的入参。
 */
export type EvaluateRequirementsIn = {
  /**
   * **已按省筛过**的门槛行 —— 引擎不查库、不认省名。
   */
  reqs: Requirement[]

  /**
   * 他的情况。
   */
  profile: RuleProfile
}

/**
 * `evaluateRequirements` 的返回:一组判定,顺序固定。
 */
export type EvaluateRequirementsOut = RuleResult[]

/**
 * 各因素判定函数共用的入参。
 */
export type FactorIn = {
  /**
   * **已按省筛过**的门槛行。
   */
  reqs: Requirement[]

  /**
   * 他的情况。
   */
  profile: RuleProfile
}

/**
 * 只出一行的因素判定函数的返回:那一行;不出则 null。
 */
export type FactorOneOut = RuleResult | null

/**
 * 可能出多行的因素判定函数的返回。
 */
export type FactorManyOut = RuleResult[]

/**
 * `rowsOfFactor` 的入参。
 */
export type RowsOfFactorIn = {
  /**
   * **已按省筛过**的门槛行。
   */
  reqs: Requirement[]

  /**
   * 门槛因素。
   */
  factor: string

  /**
   * 这条说的是谁。
   */
  subject: ReqSubject
}

/**
 * `rowsOfFactor` 的返回。
 */
export type RowsOfFactorOut = Requirement[]

/**
 * `pickLanguageRow` 的入参。
 */
export type PickLanguageRowIn = {
  /**
   * 语言那几行。
   */
  rows: Requirement[]

  /**
   * 他的情况。
   */
  profile: RuleProfile
}

/**
 * `pickLanguageRow` 的返回:最具体的那一行;挑不出则 null。
 */
export type PickLanguageRowOut = Requirement | null

/**
 * 一行门槛配上它的「有多具体」—— 只为挑行活着。
 */
export type ScoredRow = {
  /**
   * 那一行。
   */
  r: Requirement

  /**
   * NOC 前缀命中长度。
   */
  s: number
}

/**
 * `pickIncomeRow` 的入参。
 */
export type PickIncomeRowIn = {
  /**
   * 收入表的那几行。
   */
  rows: Requirement[]

  /**
   * 官方分档区域键。
   */
  area: string

  /**
   * 家庭人数(不知道时已折成 1)。
   */
  size: number
}

/**
 * `pickIncomeRow` 的返回。
 */
export type PickIncomeRowOut = Requirement | null

/**
 * `incomeVerdict` 的入参。
 */
export type IncomeVerdictIn = {
  /**
   * 他的年收入;没有则 null。
   */
  have: number | null

  /**
   * 高档阈值(区域已知 = 该区域档;未知 = 高档)。
   */
  hi: number | null

  /**
   * 低档阈值(区域未知时才有)。
   */
  lo: number | null

  /**
   * 家庭人数答没答。
   */
  sizeKnown: boolean
}

/**
 * `incomeVerdict` 的返回:判定与差额。
 */
export type IncomeVerdictOut = {
  /**
   * 达标 / 不达标 / 判不了。
   */
  verdict: RuleVerdict

  /**
   * 差多少;只有 fail 才有。
   */
  short: number | null
}

/**
 * `experienceVerdict` 的入参。
 */
export type ExperienceVerdictIn = {
  /**
   * 取到的经验月数;两个都答就取大的。
   */
  have: number | null

  /**
   * 官方阈值。
   */
  need: number

  /**
   * 总经验答没答 —— **只答了加拿大经验且不够,仍是判不了**(海外那截没问)。
   */
  totalAnswered: boolean
}

/**
 * `experienceVerdict` 的返回。
 */
export type ExperienceVerdictOut = RuleVerdict

/**
 * `expMonths` 的入参。
 */
export type ExpMonthsIn = {
  /**
   * 他的情况。
   */
  profile: RuleProfile
}

/**
 * `expMonths` 的返回:两个都答就取大的(加拿大经验是总经验的子集);都没答则 null。
 */
export type ExpMonthsOut = number | null

/**
 * `pushOne` 的入参。
 */
export type PushOneIn = {
  /**
   * 收集器 —— **就地 push**,因为判定的行序是固定的,收集比拼接更直白。
   */
  out: RuleResult[]

  /**
   * 那一行;不出行则 null。
   */
  row: RuleResult | null
}

/**
 * `pushOne` 没有返回值。
 */
export type PushOneOut = void

/**
 * `tiersOfCondition` / `tiersOfArea` 的入参。
 */
export type TiersOfIn = {
  /**
   * 那几行,已排好序。
   */
  rows: Requirement[]
}

/**
 * `tiersOfCondition` / `tiersOfArea` 的返回。
 */
export type TiersOfOut = AreaTier[]

/**
 * `noExperienceBar` 的入参。
 */
export type NoExperienceBarIn = {
  /**
   * `op='none'` 的那一行。
   */
  row: Requirement

  /**
   * 他的情况。
   */
  profile: RuleProfile
}

/**
 * `noExperienceBar` 的返回。
 */
export type NoExperienceBarOut = RuleResult
