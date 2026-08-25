/**
 * 量尺域的常量:官方枚举的行政区名单、因素/口径/单位的取值,以及几个推理用的边界数。
 *
 * 🔴 **阈值一个都不许写在这里** —— 全部来自 `pnp_requirements`(官方页抓取入库)。
 * 这里只有「官方把地名分成哪几档」这类**枚举**,以及代码自己要用的取值名。
 *
 * @author Frank
 * @time 2026-08-20 21:10:00
 */

// =========================================================================
// 1. 官方枚举的行政区
// =========================================================================

/**
 * ON 的 GTA:多伦多市 + Durham / Halton / Peel / York 四个区域自治体(OINP 雇主指南原文)。
 *
 * 🔴 这是**官方自己枚举的**,不是本站的判断。条目写的是 `normalizeName` 之后的形态。
 */
export const GTA = [
  'toronto', 'scarborough', 'north york', 'etobicoke', 'east york', 'york',            // 多伦多市及其区
  'ajax', 'brock', 'clarington', 'oshawa', 'pickering', 'scugog', 'uxbridge', 'whitby', // Durham
  'burlington', 'halton hills', 'milton', 'oakville', 'georgetown', 'acton',            // Halton
  'brampton', 'caledon', 'mississauga', 'bolton',                                       // Peel
  'aurora', 'east gwillimbury', 'georgina', 'king', 'markham', 'newmarket',             // York
  'richmond hill', 'vaughan', 'whitchurchstouffville', 'stouffville', 'thornhill', 'maple', 'woodbridge', 'unionville', 'keswick',
] as const

/**
 * 官方点名的 14 个普查区 → 我们认得出的主城(认不全,认不出就退 unknown 那档)。
 *
 * 认不出就说认不出(返回空),不硬塞档位:**档位说低了比不说更糟**。
 */
export const ON_LISTED = [
  'ottawa', 'nepean', 'kanata', 'orleans', 'gloucester', 'stittsville', 'barrhaven',    // Ottawa
  'waterloo', 'kitchener', 'cambridge', 'woolwich', 'wilmot', 'north dumfries', 'wellesley', // Waterloo
  'hamilton', 'stoney creek', 'ancaster', 'dundas', 'waterdown', 'flamborough',         // Hamilton
  'barrie', 'orillia', 'bradford', 'innisfil', 'collingwood', 'midland', 'wasaga beach',
  'alliston', 'new tecumseth', 'penetanguishene', 'ramara', 'springwater',              // Simcoe
  'london', 'strathroy',                                                                // Middlesex
  'st catharines', 'niagara falls', 'welland', 'grimsby', 'fort erie', 'thorold', 'niagaraonthelake',
  'port colborne', 'lincoln', 'pelham', 'wainfleet', 'west lincoln',                    // Niagara
  'windsor', 'leamington', 'lasalle', 'tecumseh', 'amherstburg', 'kingsville', 'essex', 'lakeshore', // Essex
  'guelph', 'fergus', 'elora',                                                          // Wellington
  'sudbury', 'greater sudbury',                                                         // Greater Sudbury
  'kingston',                                                                           // Frontenac
  'brantford', 'paris',                                                                 // Brant
  'peterborough',                                                                       // Peterborough
  'belleville', 'trenton', 'quinte west',                                               // Hastings
  'thunder bay',                                                                        // Thunder Bay
] as const

/**
 * BC 的 Metro Vancouver Regional District 成员市(BC PNP 指南 6.8 用同一条界线)。
 */
export const METRO_VAN = [
  'vancouver', 'surrey', 'burnaby', 'richmond', 'coquitlam', 'port coquitlam', 'port moody',
  'new westminster', 'delta', 'ladner', 'tsawwassen', 'north vancouver', 'west vancouver',
  'langley', 'maple ridge', 'pitt meadows', 'white rock', 'bowen island', 'anmore', 'belcarra', 'lions bay',
] as const

/**
 * NL 的圣约翰都会区。
 *
 * NL 官方雇主门槛写「In St. John's area」但没给区界 —— 按 StatCan 圣约翰斯 CMA 组成取
 * (`METRO_VAN` 手工集同一先例);认不出地名照旧返回空,宁缺不猜。
 *
 * ⚠️ 条目写的是 `normalizeName` 之后的形态:撇号/句点/连字符都被剥掉
 * (`St. John's` → `st johns`,`Portugal Cove-St. Philip's` → `portugal covest philips`)。
 */
export const ST_JOHNS = [
  'st johns', 'saint johns', 'mount pearl', 'paradise', 'conception bay south',
  'portugal covest philips', 'portugal cove', 'torbay', 'logy baymiddle coveouter cove', 'flatrock',
  'pouch cove', 'bauline', 'petty harbourmaddox cove', 'petty harbour', 'bay bulls', 'witless bay',
] as const

// =========================================================================
// 2. 分档区域的键
// =========================================================================

/**
 * 官方分档区域键 —— 与 `pnp_requirements.appliesArea` 同一套值。
 */
export const AREA = {
  /**
   * ON:大多伦多地区内。
   */
  gta: 'gta',

  /**
   * ON:官方另点名的普查区/县。
   */
  onListedCd: 'on-listed-cd',

  /**
   * ON:大多伦多地区外。
   */
  outsideGta: 'outside-gta',

  /**
   * BC:大温地区。
   */
  metroVancouver: 'metro-vancouver',

  /**
   * BC:其余地区。
   */
  restOfBc: 'rest-of-bc',

  /**
   * NL:圣约翰都会区。
   */
  stJohns: 'st-johns',

  /**
   * NL:其余地区。
   */
  restOfNl: 'rest-of-nl',

  /**
   * 认不出 —— **不是一个档**,是「我们不知道」。上游据此只摆能确定的那半。
   */
  unknown: '',
} as const

/**
 * 按地名分档的三个省。别的省要么不分区,要么本站还没收录它的分档表。
 */
export const AREA_PROV = {
  /**
   * 安大略。
   */
  on: 'ON',

  /**
   * 不列颠哥伦比亚。
   */
  bc: 'BC',

  /**
   * 纽芬兰与拉布拉多。
   */
  nl: 'NL',
} as const

// =========================================================================
// 3. 门槛行上的取值
// =========================================================================

/**
 * 门槛行说的是谁 —— 申请人侧还是雇主侧。
 */
export const SUBJECT = {
  /**
   * 申请人本人要满足的。
   */
  applicant: 'applicant',

  /**
   * 雇主要满足的(经营年限、营业额、雇员数)。
   */
  employer: 'employer',
} as const

/**
 * 本域认得的门槛因素。库里还有别的,认不得的一律不出行 —— 不猜。
 */
export const FACTOR = {
  /**
   * 语言。
   */
  language: 'language',

  /**
   * 语言免考条款(ON:指定安省学历免考)。
   */
  languageExempt: 'languageExempt',

  /**
   * 最低家庭收入。
   */
  income: 'income',

  /**
   * 工作经验。
   */
  experience: 'experience',

  /**
   * 工资档。
   */
  wage: 'wage',

  /**
   * 雇主经营年限。
   */
  empYears: 'empYears',

  /**
   * 雇主营业额。
   */
  empRevenue: 'empRevenue',

  /**
   * 雇主全职雇员数。
   */
  empStaff: 'empStaff',
} as const

/**
 * 雇主侧那两个**分档**因素 —— 按阈值大小取高低档,不认省专有的区域名。
 */
export const EMP_TIERED = [FACTOR.empRevenue, FACTOR.empStaff] as const

/**
 * 门槛行的比较符里,本域要单独认的那一个。
 */
export const OP = {
  /**
   * **官方明说这档不设门槛** —— 与「没查到门槛」是两件事,前者是这条通道最值钱的性质。
   */
  none: 'none',
} as const

/**
 * 阈值的口径 —— 不是绝对数时,说清按什么算。
 */
export const BASIS = {
  /**
   * 阈值 = 该职业该地区的官方中位工资(ON 工资档)。
   */
  occMedian: 'occMedian',

  /**
   * 阈值量的是「在**这家**雇主连续全职干了多久」(MB SWM)——
   * **不是**本站问的同职业总经验。
   */
  employerTenure: 'employerTenure',
} as const

/**
 * 单位里本域要换算的那一个。
 */
export const UNIT = {
  /**
   * 月。SK 官方原文用月,统一换算成年。
   */
  months: 'months',
} as const

/**
 * 一条门槛的判定三态。
 */
export const ITEM = {
  /**
   * 达标。
   */
  pass: 'pass',

  /**
   * 不达标。
   */
  fail: 'fail',

  /**
   * **判不了** —— 门槛没收录,或答案不足以判定。一等公民,不猜、不按别省推。
   */
  unknown: 'unknown',
} as const

// =========================================================================
// 4. 推理用的边界数
// =========================================================================

/**
 * 一年几个月 —— SK 的经营年限官方原文用月,换算成年。
 */
export const MONTHS_PER_YEAR = 12

/**
 * 家庭人数不知道时用哪一档:**1 人**,官方收入表里最低的一档。
 *
 * 低于它 = 任何家庭人数都低于 → fail 是确定的;高于它只能说「1 人家庭达标」,
 * 人多了门槛更高 → unknown。
 */
export const DEFAULT_FAMILY_SIZE = 1

/**
 * NOC 前缀匹配「不适用」的分数。命中长度即「有多具体」,-1 = 这一行挑不出来。
 */
export const NOC_MISS = -1

/**
 * NOC 前缀匹配「通用条款」的分数 —— 不分职业 = 最不具体。
 */
export const NOC_GENERIC = 0

/**
 * 地名规范化时要抹掉的字符:小写之后,非字母非空格的一律去掉。
 */
export const NON_LETTERS = /[^a-z ]/g

/**
 * 门槛行里逗号分隔的列表(`appliesTeer` / `appliesNoc` / `excludesNoc`)的分隔符。
 */
export const LIST_SEP = ','

/**
 * 地名是空的时候拿它顶上:空串。签名上收的是 string,但地名一路从库里过来,
 * 空(以及类型挡不住的 null)是常态 —— 这一格保的是「拿到空的也照样走完这条链」:
 * 小写 → 抹掉非字母 → 去首尾空白,出来仍是空串,链子前面不必先判一次空。
 * 而空串跟官方枚举表里的任何一条都比不上,「不知道」于是自动落进「认不出」那一档 ——
 * 认不出就说认不出,不硬塞档位(档位说低了比不说更糟)。
 */
export const NAME_NONE = ''

/**
 * `NON_LETTERS` 的替换串:空串 = **删掉**匹配到的字符,不是换成别的。
 * 换成空格会把 `niagara-on-the-lake` 变成 `niagara on the lake`,
 * 而官方枚举表里存的是 `niagaraonthelake`(见 ON_LISTED)—— 只有直接删,两边才是同一把尺。
 */
export const NON_LETTERS_REPL = ''

/**
 * 门槛行的职业清单列(`appliesNoc` / `excludesNoc`)没写时的占位。
 * 逗号切出来是**空清单**,而空的适用清单在 nocScore 里正是「通用条款」——
 * 官方没点名职业 = 这一行不分职业都算数,不是「谁都不算」。两者反着,不能拿 null 含混过去。
 * 排除清单那一格反过来读:空 = 一个都不排除,nocScore 的前缀循环空转直接放行。
 * 同一个空串在两格上各读各的(「谁都算」与「谁都不排」),合起来才是「这行对所有职业生效」。
 */
export const LIST_NONE = ''

/**
 * 门槛行的 `appliesCondition` 没写时的档名:空串。
 * 两档并列时档名是给人看的分档标签,官方没给条件名就留空 ——
 * 不许在这里编一个:编出来的档名会被下游当成官方原文读。
 */
export const COND_NONE = ''
