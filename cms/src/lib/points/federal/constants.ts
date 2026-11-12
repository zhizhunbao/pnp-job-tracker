/**
 * points 域的子桶 federal 的常量 —— 联邦两套表(CRS 与联邦技工 67 分)共用的部分:联邦区间解析、学历档、needsInfoOf / pickEduRow / sumPoints。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

// =========================================================================
// 1. 联邦表:从官方标签解析区间
// =========================================================================

/**
 * 年龄「Under 18」。
 */
export const EE_AGE_UNDER = /^under\s+(?<n>\d+)/i

/**
 * 年龄「18 years of age or less」。
 */
export const EE_AGE_OR_LESS = /^(?<n>\d+)\s*years of age or less$/i

/**
 * 年龄「45 years of age or more」。
 */
export const EE_AGE_OR_MORE = /^(?<n>\d+)\s*years of age or more$/i

/**
 * 年龄「47 and older」(FSW67 的写法)。
 */
export const EE_AGE_AND_OLDER = /^(?<n>\d+)\s*and older$/i

/**
 * 年龄「20 to 29 years of age」/「18-35」。
 */
export const EE_AGE_RANGE = /^(?<low>\d+)\s*(?:to|[-–—])\s*(?<high>\d+)/i

/**
 * 年龄「40 years of age」。
 */
export const EE_AGE_EXACT = /^(?<n>\d+)\s*years of age$/i

/**
 * 年龄只写一个数字「36」。
 */
export const EE_AGE_BARE = /^(?<n>\d+)$/

/**
 * 年龄区间的上界哨兵。
 */
export const EE_AGE_MAX = 200

/**
 * CLB「Less than CLB 4」/「Below CLB level 7」。
 */
export const EE_CLB_BELOW = /(?:less than|below)\s*clb\s*(?:level\s*)?(?<n>\d+)/i

/**
 * CLB「CLB 10 or more」/「CLB level 9 or higher」。
 */
export const EE_CLB_OR_MORE = /(?:at least\s*)?clb\s*(?:level\s*)?(?<n>\d+)\s*or\s*(?:more|higher)/i

/**
 * CLB「At least CLB 5 in all of the 4 abilities」。
 */
export const EE_CLB_AT_LEAST = /^at least clb\s*(?<n>\d+)/i

/**
 * CLB「CLB 4 or less」。
 */
export const EE_CLB_OR_LESS = /clb\s*(?<n>\d+)\s*or less/i

/**
 * CLB「CLB 4 or 5」/「CLB level 7 to 9」。
 */
export const EE_CLB_RANGE = /clb\s*(?:level\s*)?(?<low>\d+)\s*(?:to|or|[-–—])\s*(?<high>\d+)/i

/**
 * CLB「CLB 6」。
 */
export const EE_CLB_ONE = /clb\s*(?:level\s*)?(?<n>\d+)/i

/**
 * CLB 区间的上界哨兵。
 */
export const EE_CLB_MAX = 99

/**
 * 年数「None or less than a year」/「No foreign work experience」。
 */
export const EE_YEARS_NONE = /no(?:ne)? (?:foreign work experience|or less than a year)/i

/**
 * 年数「2-3 years」/「2 to 3 years」。
 */
export const EE_YEARS_RANGE = /^(?<low>\d+)\s*(?:to|[-–—])\s*(?<high>\d+)\s*years?/i

/**
 * 年数「4 or 5 years」。
 */
export const EE_YEARS_OR = /^(?<low>\d+)\s*or\s*(?<high>\d+)\s*years?/i

/**
 * 年数「5 years or more」/「6 or more years」。
 */
export const EE_YEARS_OR_MORE = /^(?<n>\d+)\s*years?\s*or more/i

/**
 * 年数「1 year」。
 */
export const EE_YEARS_ONE = /^(?<n>\d+)\s*years?$/i

/**
 * 年数区间的上界哨兵。
 */
export const EE_YEARS_MAX = 999

// =========================================================================
// 2. 联邦表:分表、分节与列
// =========================================================================

/**
 * 官方两张联邦表。**分值一分都不许在代码里编**,全部来自 `ee_points_grid`。
 */
export const GRID = {
  /**
   * 排名分(Comprehensive Ranking System)。
   */
  crs: 'CRS',

  /**
   * 资格分(Federal Skilled Worker,67/100)。
   */
  fsw67: 'FSW67',
} as const

/**
 * CRS / FSW67 的因素名 —— 官方表 `factor` 列的原文。
 */
export const EE_FACTOR = {
  /**
   * 年龄。
   */
  age: 'Age',

  /**
   * CRS 的学历。
   */
  crsEdu: 'Level of Education',

  /**
   * CRS 的语言(按四项分档)。
   */
  crsLang: 'Canadian Language Benchmark (CLB) level per ability',

  /**
   * CRS 的加拿大工作经验。
   *
   * 2026-11-12:官方页 2026-11-03 改版,A 节新立「Labour Market Integration factor」,
   * 这张年数表的因素名从「Canadian work experience」改成「Length of Canadian work experience」
   * (分值没变);旧名对不上行,估分器把这一项静默落成「缺信息」。旧名留在 crsCanadaExpOld。
   */
  crsCanadaExp: 'Length of Canadian work experience',

  /**
   * CRS 的加拿大工作经验,官方页 2026-11-03 改版前的因素名。
   *
   * 2026-11-12:代码换版与灌库不同步,库里还是旧版行时照样认;库换成新版后这个名字不再命中任何行。
   */
  crsCanadaExpOld: 'Canadian work experience',

  /**
   * CRS 组合分:学历 × 语言。
   */
  crsComboEduLang: 'With good official language proficiency (Canadian Language Benchmark Level [CLB] 7 or higher) and a post-secondary degree',

  /**
   * CRS 组合分:学历 × 加拿大经验。
   */
  crsComboEduExp: 'With Canadian work experience and a post-secondary degree',

  /**
   * FSW67 的学历。
   */
  fswEdu: 'Education',

  /**
   * FSW67 的第一官方语言。
   */
  fswLang: 'First official language',

  /**
   * FSW67 的工作经验。
   */
  fswExp: 'Experience',

  /**
   * FSW67 的适应性。
   */
  fswAdapt: 'Adaptability',
} as const

// =========================================================================
// 3. 联邦表:学历档与组合分门槛
// =========================================================================

/**
 * 联邦估分逐项的人话短名。
 *
 * ⚠️ **技术债**:给人看的字本该只有 `lib/i18n` 一个家,这里留着是因为它随
 * `breakdown[].label` 一路下发给消费端,搬进 i18n 要连消费端一起改口径 ——
 * 那是另一个批次的事。搬家时**不许顺手改字**:金标断言的就是这些字。
 */
export const EE_LABEL = {
  /**
   * 年龄。
   */
  age: '年龄',

  /**
   * 学历。
   */
  edu: '学历',

  /**
   * 第一官方语言,四项同档合成。
   */
  clb: '语言(CLB,四项合成)',

  /**
   * 第二官方语言 —— 档案里没有这一格。
   */
  clb2: '第二官方语言(档案未提供)',

  /**
   * 加拿大工作经验。
   */
  expCanada: '加拿大工作经验',

  /**
   * 加拿大学习加分。
   */
  canadaStudyBonus: '加拿大学习加分',

  /**
   * 技能可转移:学历 × 语言。
   */
  eduLangCombo: '技能可转移:学历×语言',

  /**
   * 技能可转移:学历 × 加拿大经验。
   */
  eduExpCombo: '技能可转移:学历×加拿大经验',

  /**
   * 技能可转移:海外经验 × 语言。
   */
  foreignLangCombo: '技能可转移:海外经验×语言',

  /**
   * 技能可转移:海外经验 × 加拿大经验。
   */
  foreignExpCombo: '技能可转移:海外经验×加拿大经验',

  /**
   * FSW67 的技术工作经验(不分境内境外)。
   */
  exp: '技术工作经验',

  /**
   * 适应性:加拿大学习经历。
   */
  adaptStudy: '适应性:加拿大学习经历',

  /**
   * 适应性:加拿大工作经历。
   */
  adaptWork: '适应性:加拿大工作经历',

  /**
   * 适应性:配偶语言 —— 档案里没有这一格。
   */
  adaptSpouseLang: '适应性:配偶语言(档案未提供)',

  /**
   * 适应性:配偶加拿大学习经历 —— 档案里没有这一格。
   */
  adaptSpouseStudy: '适应性:配偶加拿大学习经历(档案未提供)',

  /**
   * 适应性:预安排就业 —— 档案里没有这一格。
   */
  adaptArrangedEmployment: '适应性:预安排就业(档案未提供)',

  /**
   * 适应性:加拿大亲属 —— 档案里没有这一格。
   */
  adaptRelatives: '适应性:加拿大亲属(档案未提供)',
} as const

/**
 * 联邦估分逐项的内部键 —— 与 `EE_LABEL` 一一对应,上游靠它反问缺哪一格。
 */
export const EE_KEY = {
  /**
   * 年龄。
   */
  age: 'age',

  /**
   * 学历。
   */
  edu: 'edu',

  /**
   * 第一官方语言。
   */
  clb: 'clb',

  /**
   * 第二官方语言。
   */
  clb2: 'clb2',

  /**
   * 加拿大工作经验。
   */
  expCanada: 'expCanada',

  /**
   * 加拿大学习加分。
   */
  canadaStudyBonus: 'canadaStudyBonus',

  /**
   * 学历 × 语言。
   */
  eduLangCombo: 'eduLangCombo',

  /**
   * 学历 × 加拿大经验。
   */
  eduExpCombo: 'eduExpCombo',

  /**
   * 海外经验 × 语言。
   */
  foreignLangCombo: 'foreignLangCombo',

  /**
   * 海外经验 × 加拿大经验。
   */
  foreignExpCombo: 'foreignExpCombo',

  /**
   * FSW67 的技术工作经验。
   */
  exp: 'exp',

  /**
   * 适应性:加拿大学习。
   */
  adaptStudy: 'adaptStudy',

  /**
   * 适应性:加拿大工作。
   */
  adaptWork: 'adaptWork',

  /**
   * 适应性:配偶语言。
   */
  adaptSpouseLang: 'adaptSpouseLang',

  /**
   * 适应性:配偶加拿大学习。
   */
  adaptSpouseStudy: 'adaptSpouseStudy',

  /**
   * 适应性:预安排就业。
   */
  adaptArrangedEmployment: 'adaptArrangedEmployment',

  /**
   * 适应性:加拿大亲属。
   */
  adaptRelatives: 'adaptRelatives',
} as const

/**
 * 命中不了官方档时写进 `matched` 的那几句留痕。
 *
 * ⚠️ 同上,**技术债**:它们也是给人看的字,而且金标逐字断言过。
 */
export const EE_NOTE = {
  /**
   * 没有加拿大学历。
   */
  noCanadaStudy: '(无加拿大学历)',

  /**
   * 组合分的门槛一档都够不到。
   */
  belowTier: '(门槛未达标)',

  /**
   * FSW67 经验不足一年。
   */
  underOneYear: '(不足 1 年,未达最低档)',

  /**
   * FSW67 适应性:加拿大学习未满两学年。
   */
  underTwoStudyYears: '(未满 2 学年全日制)',

  /**
   * FSW67 适应性:加拿大工作未满一年。
   */
  underOneWorkYear: '(未满 1 年)',
} as const

/**
 * 逐项的判定态。
 */
export const ITEM_STATUS = {
  /**
   * 命中官方档且分数大于 0。
   */
  matched: 'matched',

  /**
   * 命中但官方档就是 0,或确定不适用 —— **这是硬结论,不是没查到**。
   */
  zero: 'zero',

  /**
   * 缺输入,或查不到能用的行 —— 上游据此反问。
   */
  needsInfo: 'needs-info',
} as const

/**
 * 语言按四项同档合成 —— 官方给的是每项的分,乘以项数。
 */
export const LANG_ABILITIES = 4

// =========================================================================
// 4. 拼留痕用的连接符与几个学历档常量
// =========================================================================

/**
 * 学历档的取值 —— 与 `EDU_KEYS` 同一套,单列出来给比较用。
 */
export const EDU = {
  /**
   * 博士。
   */
  doctorate: 'doctorate',

  /**
   * 硕士。
   */
  master: 'master',

  /**
   * 学士。
   */
  bachelor: 'bachelor',

  /**
   * 技工证书。
   */
  tradeCert: 'tradeCert',

  /**
   * 两年文凭。
   */
  diploma2y: 'diploma2y',

  /**
   * 一年证书。
   */
  cert1y: 'cert1y',

  /**
   * 高中。
   */
  highschool: 'highschool',
} as const

/**
 * 学制年数的几档 —— 官方学历标签里读出来的就是这几个数。
 */
export const PROGRAM_YEARS = {
  /**
   * 一年制。
   */
  one: 1,

  /**
   * 两年制。
   */
  two: 2,

  /**
   * 三年制(含学士)。
   */
  three: 3,

  /**
   * 四年制。
   */
  four: 4,
} as const
