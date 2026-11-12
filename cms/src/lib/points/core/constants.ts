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
// 6. 联邦表:学历档与组合分门槛
// =========================================================================

/**
 * 命中原文的「没有」:这一项**没有命中任何官方行** —— 输入缺(判不了)、
 * 或者查到的是零分档而官方没有一句可抄的原文。留痕位空着,UI 就不印那行灰字小注。
 * 🔴 不许拿一句自造的话填它:`matched` 摆出来就是给用户核对官方原文用的,
 * 填了自己编的字,核对这件事当场作废(硬约束③:官方原文标签必须原样显出来)。
 */
export const MATCHED_NONE = ''

// =========================================================================
// 7. 估分 × 抽选线
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
// 8. 拼留痕用的连接符与几个学历档常量
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
