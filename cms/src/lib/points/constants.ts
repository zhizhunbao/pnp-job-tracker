/**
 * 分值域的常量:解析官方标签的正则、学历阶梯、几个封顶与默认档。
 *
 * 🔴 **分值一分都不许写在这里** —— 全部来自 `pnp_score_factors` / `ee_points_grid`
 * (官方分值表抓取入库)。这里只有「怎么从官方标签里读出可比较的数字」这类**解析规则**,
 * 以及代码自己要用的取值名。
 *
 * @author Frank
 * @time 2026-08-20 21:55:00
 */

// =========================================================================
// 1. 通道名匹配
// =========================================================================

/**
 * 通道名里的虚词 —— 比对时一律丢掉。
 *
 * 抽选线要对得上通道:BC 现行是**按通道分别设线**,拿最近一次的分去比另一条通道是错的对照。
 * 两边写法不同(岗位侧「BC PNP Build: construction trades targeted ITA」/
 * 抽选侧「Build: Construction Trades」)→ 取实词做子集判断,不做字面相等。
 */
export const STREAM_STOP = [
  'bc', 'pnp', 'the', 'and', 'targeted', 'ita', 'stream', 'authority', 'initiative', 'only', 'all',
] as const

/**
 * 通道名切词:非字母一律当分隔符。
 */
export const NON_ALPHA = /[^a-z]+/g

/**
 * 实词的最短长度 —— 两个字母以下的一律不算实词。
 */
export const STREAM_WORD_MIN = 2

/**
 * 打分表自报的通道名:`system` 结尾括号里那一段
 * (如「OINP EOI points (Ontario Workforce Priority stream)」)。
 */
export const GRID_STREAM = /\((?<n>[^)]+)\)\s*$/

/**
 * 显示用的分制短名:把自报通道的那个括号整段去掉(整串印在句子里太长)。
 */
export const SYSTEM_TAIL = /\s*\([^)]*\)\s*$/

/**
 * `SYSTEM_TAIL` 的替换串:空串 = 把匹配到的那一段**删掉**(不是留个空格)。
 * `replace` 没有「删除」这个动作,删就是替换成空 —— 正则两端已经把空白吃进去了,
 * 这里再补空格反而会在短名尾巴上留个白。
 */
export const SYSTEM_TAIL_CUT = ''

/**
 * 通道名的「没有」:抽选行没写通道、分制名里没有自报的那个括号,都归它。
 * 空串切出**零个实词**,`streamMatches` 当场判不匹配 —— 这正是要的:
 * BC 现行按通道分别设线,通道对不上就不给差分结论(拿别的通道的线去比是错的对照)。
 */
export const STREAM_NONE = ''

// =========================================================================
// 2. 从官方标签里解析数字
// =========================================================================

/**
 * 「no experience」= 0 年。
 */
export const NO_EXPERIENCE = /no experience/i

/**
 * 「Less than …」开头 = 该档下界为 0。
 */
export const LESS_THAN_HEAD = /^less than/i

/**
 * 「At least N …」—— **必须先认它**。
 *
 * ⚠️ 顺序不能调:「At least 3 but less than 4 years」里有两个数字,先跑通用正则会取到 4
 * (实撞过,3 年经验被判成 2-3 年那档少算 4 分)。
 */
export const AT_LEAST = /^at least (?<n>\d+)/i

/**
 * 通用年数档:「5 or more years」/「4 years」。
 */
export const YEARS_ANY = /(?<n>\d+)\s*(?:\+|or more)?\s*years?/i

/**
 * 「less than」出现在标签任意位置(月数档用)。
 */
export const LESS_THAN_ANY = /less than/i

/**
 * 月数档(AB EOI 按月计经验):「12 or more months」/「6-11 months」。
 */
export const MONTHS_ANY = /(?<n>\d+)\s*(?:-\d+)?\s*(?:or more\s*)?months?/i

/**
 * CLB 的零档:「Below 4…」「Not Applicable」「without language test」。
 */
export const CLB_ZERO = /below|not applicable|without language test/i

/**
 * CLB 档:「9+」/「CLB 8 and higher」/「8」。
 */
export const CLB_ANY = /(?<n>\d+)\s*\+?/

/**
 * 年龄「Less than 18 years」。
 */
export const AGE_LESS_THAN = /less than (?<n>\d+)/i

/**
 * 年龄「50 years and older」(AB EOI 的写法,2026-08-14)。
 */
export const AGE_AND_OLDER = /(?<n>\d+)\s*years?\s*and\s*(?:older|over|above)/i

/**
 * 年龄「More than 50 years」。
 */
export const AGE_MORE_THAN = /more than (?<n>\d+)/i

/**
 * 年龄区间「22 – 34 years」。破折号三种写法都认。
 */
export const AGE_RANGE = /(?<low>\d+)\s*[–—-]\s*(?<high>\d+)/

/**
 * 年龄单点「30 years」。
 */
export const AGE_ONE = /^(?<n>\d+)\s*years?/i

/**
 * 年龄区间的上界哨兵 —— 「and older」没有上界,拿一个谁也够不到的数封口。
 */
export const AGE_MAX = 200

// =========================================================================
// 3. 学历
// =========================================================================

/**
 * 本站认的学历档,由高到低。
 */
export const EDU_KEYS = [
  'doctorate', 'master', 'bachelor', 'tradeCert', 'diploma2y', 'cert1y', 'highschool',
] as const

/**
 * 学历档 → 可比较的等级。
 */
export const EDU_RANK = {
  /**
   * 博士。
   */
  doctorate: 6,

  /**
   * 硕士。
   */
  master: 5,

  /**
   * 学士。
   */
  bachelor: 4,

  /**
   * 技工证书 —— 卡在学士与两年文凭之间,所以是半档。
   */
  tradeCert: 3.5,

  /**
   * 两年文凭。
   */
  diploma2y: 3,

  /**
   * 一年证书。
   */
  cert1y: 2,

  /**
   * 高中。
   */
  highschool: 1,
} as const

/**
 * 官方学历标签 → 阶梯档。
 *
 * 🔴 一条标签命中多个关键词时取**最低**的那档 —— SK 的「Master's or Doctorate degree」
 * 是硕博同一行,硕士就该能选中它。
 *
 * 学历没有数字可解析,只能用关键词定级。这是**显示层映射**,所以 UI 必须把命中的
 * 官方原文标签显出来,让用户自己核对。
 */
export const EDU_LADDER = [
  { re: /less than (?:college|.*trade)|secondary school|high school/i, rank: 1 },
  { re: /doctor/i, rank: 6 },
  { re: /master/i, rank: 5 },
  { re: /post-?graduate/i, rank: 4.5 },
  { re: /bachelor|three-year/i, rank: 4 },
  { re: /trade certification|trades? certificate|apprenticeship|journeyperson/i, rank: 3.5 },
  { re: /associate/i, rank: 3 },
  { re: /diploma/i, rank: 3 },
  { re: /certificate|semesters/i, rank: 2 },
] as const

// =========================================================================
// 4. 档案默认值
// =========================================================================

/**
 * 没答的项一律从**最低档**起算。
 *
 * 🔴 旧默认值(本科、3 年经验、CLB 7、30 岁)会让刚打开页面的用户平白多出一截分数,
 * 与「自报条件 → 官方表」的口径相反。
 */
export const DEFAULT_SELF = {
  /**
   * 学历:高中。
   */
  edu: 'highschool',

  /**
   * 近 5 年内同职业全职年数。
   */
  expRecent: 0,

  /**
   * 再往前(6-10 年前)的年数。
   */
  expOlder: 0,

  /**
   * 首考语言 CLB;0 = 没有成绩。
   */
  clb1: 0,

  /**
   * 第二官方语言 CLB;0 = 没有。
   */
  clb2: 0,

  /**
   * 年龄 —— 取官方年龄表的**最低分档**,不是一个真人的年龄。
   */
  age: 52,
} as const

// =========================================================================
// 5. 官方分值表上的取值
// =========================================================================

/**
 * 分值表一行是哪一种。
 */
export const KIND = {
  /**
   * 档位行 —— 一个因素里选一档。
   */
  row: 'row',

  /**
   * 加分项 —— 勾了才算。
   */
  bonus: 'bonus',

  /**
   * 规则行 —— 官方写的约束,不直接给分。
   */
  rule: 'rule',
} as const

/**
 * 一份分数从哪来。
 */
export const SOURCE = {
  /**
   * 你填的条件匹上了官方档位。
   */
  profile: 'profile',

  /**
   * 本岗自动算出来的(时薪、地区…)。
   */
  job: 'job',

  /**
   * 你自己勾的。
   */
  tick: 'tick',
} as const

/**
 * 因素分组的「没有」:官方表没给这个因素划分组时,`factorGroup` 那一格是空。
 * 分组只用来算组上限(SK 的 FACTOR I=80 / II=30),没分组 = 这个因素单独封顶,
 * 不受任何组上限管 —— 所以空串不是缺数据,是「官方本来就没分组」。
 */
export const GROUP_NONE = ''

/**
 * 本域认得的官方因素名 —— 键是 `pnp_score_factors.factor`(官方表的小节)。
 *
 * 没登记的因素由调用方当「手动 / 自动项」处理:**不猜**。
 */
export const AUTO_FACTOR = {
  /**
   * BC 的 work 是「同职业总年数」。
   */
  work: 'work',

  /**
   * SK 拆出来的近 5 年。
   */
  work5: 'work5',

  /**
   * SK 拆出来的 6-10 年。
   */
  work610: 'work610',

  /**
   * AB EOI 的总经验按**月**分档。
   */
  workMonths: 'workMonths',

  /**
   * 学历。
   */
  education: 'education',

  /**
   * 语言(不分一二语的省)。
   */
  language: 'language',

  /**
   * 第一语言。
   */
  language1: 'language1',

  /**
   * 第二语言。
   */
  language2: 'language2',

  /**
   * 年龄。
   */
  age: 'age',
} as const

/**
 * 一年几个月 —— AB EOI 按月分档,而档案存的是年。
 *
 * 年取的是下界,换算后仍然保守。
 */
export const MONTHS_PER_YEAR = 12

/**
 * 勾选状态的键分隔符 —— `省:因素:序号`。
 *
 * 省内因素同名也不会串(例如两省都有 education 加分)。
 */
export const TICK_SEP = ':'

// =========================================================================
// 6. 联邦表:从官方标签解析区间
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
// 7. 联邦表:分表、分节与列
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
 * 官方表里的行类别 —— 只有明细行参与查表。
 */
export const EE_KIND_DETAIL = 'detail'

/**
 * CRS 的分节。
 */
export const EE_SECTION = {
  /**
   * A:核心人力资本。
   */
  core: 'A',

  /**
   * C:技能可转移性(组合分)。
   */
  combo: 'C',

  /**
   * D:附加分(加拿大学习等)。
   */
  extra: 'D',
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
   */
  crsCanadaExp: 'Canadian work experience',

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

/**
 * FSW67 语言只取「Speaking」那一列 —— 官方四项同档,取一列 × 4。
 */
export const EE_COL_SPEAKING = 'Speaking'

/**
 * 有配偶随行那一列。
 */
export const EE_COL_WITH_SPOUSE = /^with a spouse/i

/**
 * 无配偶随行那一列。
 */
export const EE_COL_WITHOUT_SPOUSE = /^without a spouse/i

/**
 * CRS 语言那几行里,第一官方语言那一块。
 */
export const EE_HEAD_FIRST_LANG = /first official language/i

/**
 * CRS 组合分里「海外工作经验」那一块。
 */
export const EE_HEAD_FOREIGN_EXP = 'foreign work experience'

/**
 * CRS 组合分:海外经验 × 语言那一块的标题片段。
 */
export const EE_HEAD_GOOD_LANG = 'good official language'

/**
 * CRS 组合分:海外经验 × 加拿大经验那一块的标题片段。
 */
export const EE_HEAD_CANADA_EXP = 'canadian work experience'

/**
 * CRS 加拿大学习加分那几行。
 */
export const EE_CRIT_CANADA_STUDY = /post-secondary education in canada/i

/**
 * CRS 加拿大学习加分:三年及以上那一档。
 */
export const EE_CRIT_STUDY_LONG = /three years or longer/i

/**
 * CRS 加拿大学习加分:一到两年那一档。
 */
export const EE_CRIT_STUDY_SHORT = /one or two years/i

/**
 * FSW67 适应性:加拿大学习那一行。
 */
export const EE_CRIT_PAST_STUDY = /^your past studies in canada/i

/**
 * FSW67 适应性:加拿大工作那一行。
 */
export const EE_CRIT_PAST_WORK = /^your past work in canada/i

// =========================================================================
// 8. 联邦表:学历档与组合分门槛
// =========================================================================

/**
 * CRS 学历档里能读出「几年制」的那几条。
 */
export const CRS_EDU_YEARS = {
  /**
   * 一年制。
   */
  one: /^one-year degree/i,

  /**
   * 两年制。
   */
  two: /^two-year program/i,

  /**
   * 学士或三年及以上。
   */
  three: /bachelor's degree or a three or more year program/i,
} as const

/**
 * CRS 学历档里**不按年数**、按学位名认的那几条。
 */
export const CRS_EDU_SPECIAL = {
  /**
   * 博士。
   */
  doctorate: /^doctoral level/i,

  /**
   * 硕士。
   */
  master: /^master's degree/i,

  /**
   * 高中。
   */
  highschool: /^secondary diploma/i,
} as const

/**
 * FSW67 学历档里的「… plus a …」双证书组合行 —— 档案没有「第二证书」字段,**不猜那一档**。
 */
export const FSW_EDU_PLUS = /plus a/i

/**
 * FSW67 学历档里能读出「几年制」的那几条。
 */
export const FSW_EDU_YEARS = {
  /**
   * 一年制。
   */
  one: /^one-year/i,

  /**
   * 两年制。
   */
  two: /^two-year/i,

  /**
   * 三年制。
   */
  three: /^three-year/i,

  /**
   * 四年制。
   */
  four: /^four-year/i,
} as const

/**
 * FSW67 学历档里按学位名认的那几条。
 */
export const FSW_EDU_SPECIAL = {
  /**
   * 博士。
   */
  doctorate: /^doctorate \(ph\.?d\.?\)$/i,

  /**
   * 硕士。
   */
  master: /^master's degree$/i,

  /**
   * 高中。
   */
  highschool: /^secondary school diploma$/i,
} as const

/**
 * CRS 组合分里,按学历分的那几档门槛写法。
 */
export const CRS_COMBO_TIER = {
  /**
   * 博士档。
   */
  doctorate: /doctoral level/i,

  /**
   * 硕士档。
   */
  master: /master's level/i,

  /**
   * 高中及以下档。
   */
  highschool: /secondary school \(high school\) credential or less/i,

  /**
   * 其余一律走「一年及以上专上」那一档。
   */
  other: /^post-secondary program credential of one year or longer$/i,
} as const

/**
 * CRS 组合分的子档门槛 —— 列名里带 CLB9 / CLB7 / 2 years or more / 1 year。
 */
export const CRS_SUB_TIER = {
  /**
   * CLB 9。
   */
  clb9: /clb\s*9/i,

  /**
   * CLB 7。
   */
  clb7: /clb\s*7/i,

  /**
   * 两年及以上。
   */
  years2: /2\s*years?\s*or more/i,

  /**
   * 一年。
   */
  year1: /\b1\s*year\b/i,
} as const

/**
 * CRS 组合分子档的分值(**是门槛不是分**:分照抄官方行)。
 */
export const SUB_TIER_VALUE = {
  /**
   * CLB 9 档。
   */
  clb9: 9,

  /**
   * CLB 7 档。
   */
  clb7: 7,

  /**
   * 两年档。
   */
  years2: 2,

  /**
   * 一年档。
   */
  year1: 1,
} as const

/**
 * FSW67 适应性:加拿大学习要满几个学年。
 */
export const FSW_ADAPT_STUDY_YEARS = 2

/**
 * FSW67 适应性:加拿大工作要满几个月。
 */
export const FSW_ADAPT_WORK_MONTHS = 12

/**
 * CRS 加拿大学习加分:三年及以上那一档的年数门槛。
 */
export const CRS_STUDY_LONG_YEARS = 3

/**
 * CRS 加拿大学习加分:一到两年那一档的年数门槛。
 */
export const CRS_STUDY_SHORT_YEARS = 1

/**
 * 命中标签在留痕里截断到几个字。
 */
export const MATCHED_MAX = 40

/**
 * 命中原文的「没有」:这一项**没有命中任何官方行** —— 输入缺(判不了)、
 * 或者查到的是零分档而官方没有一句可抄的原文。留痕位空着,UI 就不印那行灰字小注。
 * 🔴 不许拿一句自造的话填它:`matched` 摆出来就是给用户核对官方原文用的,
 * 填了自己编的字,核对这件事当场作废(硬约束③:官方原文标签必须原样显出来)。
 */
export const MATCHED_NONE = ''

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
// 9. 估分 × 抽选线
// =========================================================================

/**
 * 估分与线比出来的三态。
 */
export const LINE = {
  /**
   * 够得着 —— **下界** ≥ 线。加分项只会让分更高,所以这是不会翻案的硬结论。
   */
  above: 'above',

  /**
   * 够不着 —— **上界** < 线。加分项全按满分也摸不到线。
   */
  below: 'below',

  /**
   * 说不好 —— 下界 < 线 ≤ 上界,或者缺分缺线。**如实留白,不许归到任何一头。**
   */
  unknown: 'unknown',
} as const

// =========================================================================
// 10. 曼省 EOI
// =========================================================================

/**
 * 曼省 EOI 的省码。**这一套制度只有曼省用**,所以写死在这里而不是当参数传。
 */
export const MB = 'MB'

/**
 * 曼省 EOI 的因素名 —— 键是 `pnp_score_factors.factor`。
 */
export const MB_FACTOR = {
  /**
   * 语言 —— **四项各自查表相加**,不是查一次总分。
   */
  language: 'language',

  /**
   * 年龄。
   */
  age: 'age',

  /**
   * 工作年限。
   */
  work: 'work',

  /**
   * 学历。
   */
  education: 'education',

  /**
   * 适应性:与曼省的关系(可叠加,自己封顶)。
   */
  adaptConnection: 'adaptConnection',

  /**
   * 适应性:曼省需求(0 / 满分两档)。
   */
  adaptDemand: 'adaptDemand',

  /**
   * 适应性:定居温尼伯以外。
   */
  adaptRegional: 'adaptRegional',

  /**
   * 风险扣分 —— **负分**,`factorMax` 是下限不是上限。
   */
  risk: 'risk',

  /**
   * 合并出来的适应性那一块(不是官方因素名,是本域摆给消费端看的名字)。
   */
  adaptability: 'adaptability',
} as const

/**
 * 曼省语言档的阈值写在标签里的「CLB N」。
 */
export const MB_CLB = /CLB\s*(?<n>\d+)/i

/**
 * 曼省年龄档「50 or older」。
 */
export const MB_AGE_OR_OLDER = /(?<n>\d+)\s*or older/i

/**
 * 曼省年龄档「21 to 45」。
 */
export const MB_AGE_RANGE = /(?<low>\d+)\s*to\s*(?<high>\d+)/i

/**
 * 曼省年龄档裸数字「18」。
 */
export const MB_AGE_BARE = /^(?<n>\d+)$/

/**
 * 曼省工作年限「Less than one year」。
 */
export const MB_WORK_LESS = /less than one/i

/**
 * 曼省工作年限用**拼写数字**开头(One / Two / Three / Four)。
 */
export const MB_WORK_WORD = /^(?<word>one|two|three|four)\b/i

/**
 * 拼写数字 → 数。曼省表不用阿拉伯数字,通用的年数解析器一条都吃不进。
 */
export const WORD_NUM = {
  /**
   * 一。
   */
  one: 1,

  /**
   * 二。
   */
  two: 2,

  /**
   * 三。
   */
  three: 3,

  /**
   * 四。
   */
  four: 4,
} as const

/**
 * 曼省学历档 → 官方标签的匹配式。
 *
 * 曼省用「两个 2 年制」「一个 3 年制」这类计数 + 学制的组合短语,与通用学历阶梯完全不搭。
 */
export const MB_EDU_RE = {
  /**
   * 硕士或博士。
   */
  masterOrDoctorate: /master|doctorate/i,

  /**
   * 两个两年及以上的专上项目。
   */
  twoPrograms2yPlus: /two post-secondary programs/i,

  /**
   * 一个三年及以上的专上项目。
   */
  oneProgram3yPlus: /one post-secondary program of three years or more/i,

  /**
   * 一个两年的专上项目。
   */
  oneProgram2y: /one post-secondary program of two years/i,

  /**
   * 一年制专上项目。
   */
  oneYearProgram: /one-year post-secondary program/i,

  /**
   * 技工证书。
   */
  tradeCert: /trade certificate/i,

  /**
   * 没有正式专上学历。
   */
  none: /no formal post-secondary/i,
} as const

/**
 * 曼省适应性里各条加分的官方标签匹配式。
 */
export const MB_ADAPT_RE = {
  /**
   * 曼省有直系亲属。
   */
  closeRelative: /close relative in manitoba/i,

  /**
   * 曾在曼省合法工作满 6 个月。
   */
  priorWork: /previous authorized work experience/i,

  /**
   * 在曼省读完两年及以上。
   */
  edu2y: /completed post-secondary program in manitoba \(two years or more\)/i,

  /**
   * 在曼省读完一年。
   */
  edu1y: /completed post-secondary program in manitoba \(one year\)/i,

  /**
   * 曼省有好友或远亲。
   */
  friend: /close friend or distant relative/i,
} as const

/**
 * 曼省风险扣分两条的官方标签匹配式。
 */
export const MB_RISK_RE = {
  /**
   * 有外省工作经历。
   */
  foreignWork: /work experience in another province/i,

  /**
   * 有外省学习经历。
   */
  foreignStudy: /studies in another province/i,
} as const

/**
 * 曼省适应性 / 风险那两块的留痕短语。
 *
 * ⚠️ **技术债**:给人看的字本该只有 `lib/i18n` 一个家;它随 `parts[].matched` 下发,
 * 搬家要连消费端一起改口径。**搬时不许顺手改字**。
 */
export const MB_NOTE = {
  /**
   * 曼省需求那一档。
   */
  demand: 'Manitoba Demand',

  /**
   * 有外省工作经历。
   */
  foreignWork: 'Work experience in another province',

  /**
   * 有外省学习经历。
   */
  foreignStudy: 'Studies in another province',
} as const

/**
 * 曼省 EOI 留痕拼接用的连接符。
 */
export const MB_JOIN = {
  /**
   * 语言那一块的「× 项数」。
   */
  times: ' × ',

  /**
   * 加号(带空格)。
   */
  plus: ' + ',

  /**
   * 分号(带空格)。
   */
  semi: '; ',
} as const

/**
 * 曼省留痕里**这一段不加**:加分项没勾中(二语、雇主认可执照、需求档、温尼伯以外)
 * 时,那一小段留痕就是空串 —— 拼接位上空串等于没拼,不必为「加没加」再写一支分支。
 */
export const MB_NOTE_NONE = ''

/**
 * 曼省留痕里**没有档名可印**:一档都没命中(语言那一块四项全落空)时没有官方标签,
 * 空着印。与 MB_NOTE_NONE 不同 —— 那个是「有名字但这次不加这一段」,这个是「压根没取到名字」。
 */
export const MB_LABEL_NONE = ''

/**
 * 曼省错误信息里的因素与取值之间的分隔。
 */
export const MB_CTX_SEP = ':'

/**
 * 曼省语言按四项算 —— 单一数字表示四项同档。
 */
export const MB_LANG_BANDS = 4

/**
 * 曼省在读年数档:读满两年。
 */
export const MB_EDU_TWO_YEARS = 2

/**
 * 曼省在读年数档:读满一年。
 */
export const MB_EDU_ONE_YEAR = 1

// =========================================================================
// 11. 拼留痕用的连接符与几个学历档常量
// =========================================================================

/**
 * 拼留痕用的连接符。**它们随 `matched` 一路下发给消费端**,金标逐字断言过。
 */
export const SEP = {
  /**
   * 空格。
   */
  space: ' ',

  /**
   * 破折号(两侧带空格)—— 官方原文与分数写法之间。
   */
  dash: ' — ',

  /**
   * 斜杠(两侧带空格)—— 官方原文与列名之间。
   */
  slash: ' / ',

  /**
   * 「× 4 abilities」—— 语言按四项同档合成。
   */
  timesAbilities: ' × 4 abilities',

  /**
   * 「× 4 abilities / 」—— CRS 那边后面还要接列名。
   */
  timesAbilitiesSlash: ' × 4 abilities / ',
} as const

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
 * 曼省学历档的取值。
 */
export const MB_EDU = {
  /**
   * 硕士或博士。
   */
  masterOrDoctorate: 'masterOrDoctorate',

  /**
   * 两个两年及以上的专上项目。
   */
  twoPrograms2yPlus: 'twoPrograms2yPlus',

  /**
   * 一个三年及以上的专上项目。
   */
  oneProgram3yPlus: 'oneProgram3yPlus',

  /**
   * 一个两年的专上项目。
   */
  oneProgram2y: 'oneProgram2y',

  /**
   * 一年制专上项目。
   */
  oneYearProgram: 'oneYearProgram',

  /**
   * 技工证书。
   */
  tradeCert: 'tradeCert',

  /**
   * 没有正式专上学历。
   */
  none: 'none',
} as const

/**
 * 曼省适应性各条的报错上下文名 —— 官方表少了那一行时,报出来的就是它。
 */
export const MB_CTX = {
  /**
   * 曼省有直系亲属。
   */
  closeRelative: 'closeRelative',

  /**
   * 曾在曼省合法工作。
   */
  priorWork: 'priorWork',

  /**
   * 在曼省读完两年及以上。
   */
  edu2y: 'edu2y',

  /**
   * 在曼省读完一年。
   */
  edu1y: 'edu1y',

  /**
   * 曼省有好友或远亲。
   */
  friend: 'friend',
} as const

/**
 * 曼省工作年限的拼写数字取值。
 */
export const WORD = {
  /**
   * 一。
   */
  one: 'one',

  /**
   * 二。
   */
  two: 'two',

  /**
   * 三。
   */
  three: 'three',
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

/**
 * 通道名切词后,实词最少要有几个才算数得上一次比对。
 */
export const STREAM_MIN_WORDS = 1

// =========================================================================
// 12. 决策页官方表包(2026-08-22 自 lib/score 并入)
// =========================================================================

/**
 * 表包缓存时长(10 分钟)。为什么要缓存见 variables.ts 头注(2026-08-12 立,
 * prod-pool-wedge 教训:站级聚合禁每请求现算)。
 */
export const SCORE_TTL_MS = 600_000

/**
 * drawsRecent 每省最多取几轮有分数的抽选(9 省 × 6 ≈ 54 行,随 SSR 走)。
 */
export const RECENT_ROUNDS = 6

/**
 * 只收 13 省区码 —— pnp_draws 里还有联邦轮(province='FED'),那是 EE 不是省提名,
 * 不进 overview 与竞争表。
 */
export const PNP_PROV_CODES = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU']

/**
 * difficulty json 里名额竞争因子的 key。
 */
export const COMP_KEY = 'comp'

/**
 * flow 口径期里年与月的拼接符('YYYY-MM')。
 */
export const PERIOD_SEP = '-'

/**
 * 英文月份缩写 → 两位月数(IRCC 月度表的 throughMonth 用)。
 */
export const MONTH_NUM: Record<string, string> = {
  /**
   * 一月。
   */
  Jan: '01',

  /**
   * 二月。
   */
  Feb: '02',

  /**
   * 三月。
   */
  Mar: '03',

  /**
   * 四月。
   */
  Apr: '04',

  /**
   * 五月。
   */
  May: '05',

  /**
   * 六月。
   */
  Jun: '06',

  /**
   * 七月。
   */
  Jul: '07',

  /**
   * 八月。
   */
  Aug: '08',

  /**
   * 九月。
   */
  Sep: '09',

  /**
   * 十月。
   */
  Oct: '10',

  /**
   * 十一月。
   */
  Nov: '11',

  /**
   * 十二月。
   */
  Dec: '12',
}

/**
 * /api/points/factors 的省清单参数名。
 */
export const P_PROVS = 'provs'

/**
 * provs 参数**没带**时的原始串:空串切出零个合法省码,路由据此只回「有表的省清单」,
 * 不回任何一张分值表。不写成 null 是为了让下一行的 split 一视同仁 —— 带不带参数,
 * 解析路径只有一条。
 */
export const PROVS_NONE = ''

/**
 * 省清单的分隔符。
 */
export const PROV_SEP = ','

/**
 * 合法省码形状(两位大写)。
 */
export const PROV_CODE_RE = /^[A-Z]{2}$/
