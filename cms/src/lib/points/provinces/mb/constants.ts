/**
 * points 域的子桶 provinces/mb 的常量 —— 曼尼托巴 MPNP EOI 估分 estimateMbEoi(通用省表装不下,手写)。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

// =========================================================================
// 1. 曼省 EOI
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
// 2. 拼留痕用的连接符与几个学历档常量
// =========================================================================

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
