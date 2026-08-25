/**
 * 判定域的参数与字面量。
 *
 * 🔵 这里只放 JSON 装得下的东西 —— 标量、字符串表、正则。判定在 `functions.ts`,形状在 `types.ts`。
 *
 * @author Frank
 * @time 2026-08-20 02:05:00
 */


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

/**
 * 判定要逐条问过的四类闸(加 offer 共五把)。
 *
 * 顺序即**呈现顺序**:结论卡与门槛清单都按这个次序列,别在消费端另排一份。
 */
export const GATE_KEYS = ['offer', 'statusInCanada', 'credentialCanada', 'fieldMatch', 'french'] as const

/**
 * **选配闸**:没在策略文件里声明 = 这条通道**没扫过这类条款**,跳过不判 —— 与前三类闸相反。
 *  前三类是**每条通道都逐页读过**的(读了没有就记 basis:'absent'),所以「没登记」只能是本站未收录,
 *  该落 unknown 把通道拖成「判不了」。fieldMatch 是 2026-08-15 才立的第四类,现只有 NL 举证过;
 *  若照前三类的规矩办,另外 12 条会因为「没登记」集体判不了 —— 那不是如实,是拿新立的闸反咬旧结论。
 *  🔴 欠账:另外 12 条通道有没有专业对口条款**尚未逐页核**(与 NL 同样的取证方式),核完再决定
 *     是补声明还是把它升格成普适闸。在那之前这里如实跳过,不假装「官方不要求」。
 */
export const OPT_IN_GATES = new Set(['fieldMatch', 'french'])

/**
 * 一道闸有多难拆:offer 最好拆(本站正业就是帮人找到 offer)→ 人挪进境内 → 自雇经历 →
 * 重考语言(几个月)→ 加拿大学历(几年)。裁决挑标签、排序定次序,共用这一份口径。
 *
 * 判定卡的结论句用的也是它:「差最难拆的那一项」必须与这里的次序同一把尺子,不许另立一份。
 */
export const BLOCK_COST: Record<string, number> = {
  /**
   * 拿到一份 offer —— 最好拆,本站的正业就是帮人找到它。
   */
  offer: 0,

  /**
   * 人挪进境内(拿到某种境内身份)。
   */
  statusInCanada: 1,

  /**
   * 那段经历是自雇 —— 既成事实,拆不动。
   */
  selfEmployed: 2,

  /**
   * 专业对口。用小数插在自雇与语言之间(2026-08-15 新增):它比重考语言好拆(换一份对口的
   * offer 就行),比自雇经历难(那是既成事实)。用小数是为了**不动**其余四项的既有数值 ——
   * 它们被排序、测试与另一处 RANK 表咬着,重新编号等于顺手改了别的通道的次序。
   */
  fieldMatch: 2.5,

  /**
   * 重考语言 —— 几个月的事。
   */
  language: 3,

  /**
   * 法语。与 language 同级(都是重考一门试),排在它之后一点点:法语从零学起比重考雅思难。
   */
  french: 3.5,

  /**
   * 加拿大学历 —— 要读几年,最难拆。
   */
  credentialCanada: 4,
}

/**
 * 一条通道排第几档 —— 数越小越靠前。
 *
 * 与 `BLOCK_COST` 是两把不同的尺:那把量「这道闸多难拆」,这把量「这条通道整体排在哪」,
 * 所以它多出 none / unknown / excluded 三档。两张表的**相对次序必须一致**,改一张要回头对另一张。
 */
export const RANK: Record<string, number> = {
  /**
   * 一道闸都不差 —— 现在就能走。
   */
  none: 0,

  /**
   * 只差一份 offer。
   */
  offer: 1,

  /**
   * 差境内身份(人还没挪进来)。
   */
  statusInCanada: 2,

  /**
   * 卡在自雇经历上 —— 既成事实,拆不动。
   */
  selfEmployed: 3,

  /**
   * 卡在专业对口上(换一份对口的 offer 就行,比重考语言好拆)。
   */
  fieldMatch: 3.5,

  /**
   * 判不了 —— 落在「境内身份」与「重考语言」之间:连判都判不了,不该压过一条已知只差 offer 的路。
   */
  unknown: 4,

  /**
   * 差语言档(几个月的事)。
   */
  language: 5,

  /**
   * 差法语 —— 与 language 同级,略靠后:从零学起比重考雅思难。
   */
  french: 5.5,

  /**
   * 差加拿大学历 —— 要读几年,最难拆。
   */
  credentialCanada: 6,

  /**
   * 硬伤排除 —— 沉底。
   */
  excluded: 9,
}

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

/**
 * 联邦语言门槛行里「按 TEER 分档」的子通道名,如 `teer-0-3`。
 *
 * 认不出这个形状的行(`first-official` / `speaking-listening` / `reading-writing`)是**该子通道通用**,
 * 一律适用;认得出但不知道 TEER,则一条都挑不出来 —— 那是实话,不是缺陷。
 */
export const TEER_STREAM = /^teer-([\d-]+)$/

// =========================================================================
// 6. 通道判定的档案映射
// =========================================================================

/**
 * 把可计经验限制在**本省攒的**那些条件(挑中这类行时,境外经验不进分子)。
 *
 * 与 `conditionHolds` 里对应分支成对出现:那边判「这行适不适用」,这边定「用哪把尺子量」。
 */
export const PROVINCE_LOCAL_EXP = new Set<string>([AB_LOCAL_EXP])

/**
 * 能从 `VerdictProfile` 无损喂出来的官方因素(值仍由 pnpSelfScore 按官方标签解析)。
 */
export const GRID_AUTO_FACTORS = new Set([FACTOR.education, FACTOR.language, 'language1', FACTOR.age, 'work', FACTOR.workMonths])

/**
 * 「档案推不出、但用户可以自己答」的因素 → 它要的那一槽。
 *
 * 答了就交给 AUTO_PICK 按官方档位匹配;没答仍整省不接 —— 拆分经验/第二语言由档案推就是编数
 * (SK/NL 的 work5+work610、ON/SK 的 language2 卡的都是这一条)。
 */
export const ASKABLE_FACTORS = {
  /**
   * 近 5 年的经验 → 档案里的 expRecent 槽。
   */
  work5: 'expRecent',

  /**
   * 6-10 年前的经验 → 档案里的 expOlder 槽。
   */
  work610: 'expOlder',

  /**
   * 第二官方语言 → 档案里的 clb2 槽。
   */
  language2: 'clb2',
} as const

// =========================================================================
// 7. 库列值、闸名与档位(判定里逐字比对的那些字面量)
// =========================================================================

/**
 * 判定里点名比对的省码。
 *
 * 只放**代码里真的写死过**的那几个:官方在这几省有专条(MB 的 EOI、NL 的名录、
 * ON 的语言分行、BC 的地区档)。其余省一律由数据驱动,不进这张表。
 */
export const PROV = {
  /**
   * BC —— 地区档由 areaI 直接给下标,只有这一省这么算。
   */
  BC: 'BC',

  /**
   * MB —— 有专用 EOI 估分器与三条 warning。
   */
  MB: 'MB',

  /**
   * NL —— 指定雇主名录那条 supporting fact。
   */
  NL: 'NL',

  /**
   * ON —— 语言杠杆按它的官方分行查两次。
   */
  ON: 'ON',
} as const

/**
 * 四态里的两个:数据到位 / 本站未收录。
 *
 * ⚠️ `not-collected` 是**我们的窟窿**,不是「官方没有」——两句在用户那里意思相反。
 */
export const AVAIL = {
  /**
   * 门槛行在库里,判得了。
   */
  ok: 'ok',

  /**
   * 本站没收录这条通道的门槛条文。
   */
  notCollected: 'not-collected',
} as const

/**
 * 一条理由的状态,进 i18n key 的最后一段。
 */
export const STATE = {
  /**
   * 达标。
   */
  ok: 'ok',

  /**
   * 一点没攒(差的就是门槛本身那个数)。
   */
  need: 'need',

  /**
   * 攒了一部分,还差一截。
   */
  short: 'short',

  /**
   * 判不了 —— 档案缺这一格。
   */
  unknown: 'unknown',

  /**
   * 条件本身判不了(如不知道在哪读的书)。
   */
  condUnknown: 'condUnknown',
} as const

/**
 * 策略文件里一道闸的声明状态(`gateManifest`)。
 *
 * 🔴 `unknown` = **本站未收录**,不是「官方不要求」——把它读成后者就是拿缺口当结论。
 */
export const GATE_NEED = {
  /**
   * 官方明写要这一样。
   */
  required: 'required',

  /**
   * 官方明写不要 —— 没这道闸。
   */
  notRequired: 'notRequired',

  /**
   * 本站还没收录这条通道的这类条款。
   */
  unknown: 'unknown',
} as const

/**
 * 「境内身份」这道闸底下的四种官方问法(2026-08-15 拆闸)。
 *
 * 拿 inCanada 一把尺量四种要求,学签在读会被工签闸放行、安省居民会被本省闸放行。
 */
export const GATE_ASK = {
  /**
   * 要一张工签(PGWP 或普通工签都算)。
   */
  workPermit: 'workPermit',

  /**
   * 要住在本省。
   */
  provResidence: 'provResidence',

  /**
   * 要受雇于本省。
   */
  provEmployment: 'provEmployment',
} as const

/**
 * `blockedBy` 会落到的两个非闸名值。
 *
 * 其余取值就是 `GATE_KEYS` 里的闸名本身。
 */
export const BLOCKED_BY = {
  /**
   * 差境内身份 —— 也是一道闸的名字。
   */
  statusInCanada: 'statusInCanada',

  /**
   * 卡在自雇经历上 —— 既成事实,不是一道能补的闸。
   */
  selfEmployed: 'selfEmployed',
} as const

/**
 * 档案里的槽名 —— 判不了时点名让他补哪一格(`missingSlots`)。
 */
export const SLOT = {
  /**
   * 职业(NOC 码)。
   */
  noc: 'noc',

  /**
   * 语言成绩。
   */
  clb: 'clb',

  /**
   * 加拿大工作经验月数。
   */
  expCanadaMonths: 'expCanadaMonths',

  /**
   * 现居省。
   */
  province: 'province',

  /**
   * 在哪个省读的书。
   */
  studyProvince: 'studyProvince',
} as const

/**
 * 档案里的「处境」取值 —— 只有这两个在判定里被点名比过。
 */
export const STATUS = {
  /**
   * 在工作 —— 处境明说在职。
   */
  worker: 'worker',

  /**
   * 在找工作/其他 —— 明说不在职。
   */
  other: 'other',
} as const

/**
 * `pnp_requirements.factor` 里几个不在 `FACTOR` 表中的取值。
 */
export const REQ_FACTOR = {
  /**
   * 自雇经历不计入经验的那类行。
   */
  workSelfEmployed: 'workSelfEmployed',

  /**
   * 明写哪类经历不计的那类行。
   */
  experienceExcluded: 'experienceExcluded',

  /**
   * 按小时数写的工作门槛(1,560 小时那种)。
   */
  workHours: 'workHours',
} as const

/**
 * `pnp_score_factors.factor` 里判定要点名的几个。
 */
export const SCORE_FACTOR = {
  /**
   * offer 那一格 —— 由档案直接定,不走档位匹配。
   */
  offer: 'offer',

  /**
   * 时薪 —— BC 的纯规则因素(每整元 1 分)。
   */
  wage: 'wage',

  /**
   * 工作地区 —— BC 由 areaI 直接给下标。
   */
  area: 'area',

  /**
   * MPNP 的倒扣项(外省学习/外省工作)。
   */
  risk: 'risk',
} as const

/**
 * 门槛行的单位。月用的是上面的 `MONTHS`(它还被雇主侧共用),这里只补另外两个。
 */
export const REQ_UNIT = {
  /**
   * 按年写的门槛。
   */
  years: 'years',

  /**
   * 按小时写的门槛 —— 换算不靠除工时,查 `minYears`。
   */
  hours: 'hours',
} as const

/**
 * 本站学历档里判定要单独看年数的那两档,外加估分兜底用的最低档。
 */
export const EDU = {
  /**
   * 本科。
   */
  bachelor: 'bachelor',

  /**
   * 高中 —— 通用省估分在「没答学历」时的保守兜底档(gridSelfProfile),不用于判定。
   */
  highschool: 'highschool',

  /**
   * 2 年制文凭。
   */
  diploma2y: 'diploma2y',
} as const

/**
 * MPNP EOI 的学历档 —— 按年数重挑时用得着的三档。
 */
export const MB_EDU = {
  /**
   * 硕士或博士 —— MPNP 不再往上分。
   */
  masterOrDoctorate: 'masterOrDoctorate',

  /**
   * 技工证。
   */
  tradeCert: 'tradeCert',

  /**
   * 单一 3 年以上课程。
   */
  oneProgram3yPlus: 'oneProgram3yPlus',

  /**
   * 单一 2 年课程。
   */
  oneProgram2y: 'oneProgram2y',

  /**
   * 一年制课程。
   */
  oneYearProgram: 'oneYearProgram',
} as const

/**
 * 本站学历档 → MPNP EOI 学历档。
 *
 * 两个按年数分档的(diploma2y / bachelor)这里只给「问不到年数」时的落点,
 * 问得到年数时由 `mbEduOf` 按年数重挑 —— 表里不写第二份口径。
 */
export const EDU_TO_MB = {
  /**
   * 博士 → MPNP 的「硕士或博士」档。
   */
  doctorate: MB_EDU.masterOrDoctorate,

  /**
   * 硕士 → 同上,MPNP 不再往上分。
   */
  master: MB_EDU.masterOrDoctorate,

  /**
   * 本科 → 「单一 3 年以上课程」档(问得到年数时改按年数挑)。
   */
  bachelor: MB_EDU.oneProgram3yPlus,

  /**
   * 技工证 → MPNP 的技工证档。
   */
  tradeCert: MB_EDU.tradeCert,

  /**
   * 2 年制文凭 → 「单一 2 年课程」档(问得到年数时改按年数挑)。
   */
  diploma2y: MB_EDU.oneProgram2y,

  /**
   * 1 年制证书 → 「一年制课程」档。
   */
  cert1y: MB_EDU.oneYearProgram,

  /**
   * 高中 → MPNP 学历分一格不给。
   */
  highschool: PERMIT.none,
} as const

/**
 * 经验门槛的两种口径,进 i18n key 的中段。
 *
 * 两者量的**不是同一件事**:在职门槛量「在这家雇主干了多久」,经验门槛量同职业总经验。
 */
export const EXP_BASIS = {
  /**
   * 同雇主在职时长。
   */
  tenure: 'tenure',

  /**
   * 工作经验。
   */
  work: 'work',
} as const

/**
 * 两根杠杆的 key。
 */
export const LEVER = {
  /**
   * 接一个 TEER 更低的岗会毁掉哪些通道。
   */
  teerDowngrade: 'teer-downgrade',

  /**
   * 语言提档能多拿多少分。
   */
  clbBoost: 'clb-boost',
} as const

/**
 * 拼 i18n key 的前缀 —— 与 `PV_KEY` 同一套命名空间,只是这几条要接变量。
 */
export const KEY_PREFIX = {
  /**
   * 闸类的句子:`pv.gate.<闸><.问法?>.<状态>`。
   */
  gate: 'pv.gate.',

  /**
   * 经验类的句子:`pv.exp.<口径>.<状态>`。
   */
  exp: 'pv.exp.',

  /**
   * 省外院校那一档:`pv.oopGrad.<状态>`。
   */
  oopGrad: 'pv.oopGrad.',
} as const

/**
 * 闸类句子里「本站未收录这条条文」那一档的 key 尾巴。
 */
export const KEY_SUFFIX_NOT_COLLECTED = '.notCollected'

/**
 * 职业清单里的「不合格」那一类 —— 命中即硬伤。
 */
export const OCC_INELIGIBLE = 'ineligible'

/**
 * 职业清单行的 `appliesTo` 里点名 Employment Offer 子类的写法。
 *
 * SK 那 152 条只服务 OID/EE 子类,管不着 Employment Offer —— 靠这个词分流。
 */
export const APPLIES_OFFER = 'employment offer'

/**
 * 「近期安省毕业生」那类条件行的条件名。
 */
export const RECENT_ON_GRADUATE = 'recent-on-graduate'

/**
 * 分值行的 kind:纯规则(BC 时薪那种),不是档位行也不是加分项。
 */
export const KIND_RULE = 'rule'

/**
 * 一格 override 的来源:由档案推出来的(offer 那一格)。
 */
export const SOURCE_PROFILE = 'profile'

/**
 * 口径串里「官方自己写的年数」那个键。
 *
 * 1,560 小时 = 官方自己写的「1 年」—— 拿小时数除工时是猜,这里只认它自己写的数。
 */
export const BASIS_MIN_YEARS = 'minYears'

/**
 * 「接一个 TEER 5 的岗」这根杠杆默认拿哪个 NOC 试(75110 建筑普工)。
 *
 * 只是个**场景参数**:掉不掉档由重跑一遍注册表判出来,不是写死的结论。
 */
export const TEER5_NOC = '75110'

/**
 * 规则串坏了时拿来兜底的空 JSON —— 解析不出就按官方默认。
 */
export const EMPTY_JSON = '{}'

/**
 * CRS 官方分值表那一行的出处标签。
 */
export const CRS_GRID_LABEL = 'Comprehensive Ranking System(官方分值表)'

/**
 * NL 指定雇主名录那条 supporting fact 的出处标签。
 */
export const NL_DESIGNATED_LABEL = 'NLPNP designated employers'

// =========================================================================
// 8. 排版片段(拼句子用,本身不是内容)
// =========================================================================

/**
 * 拼句子的标点与连接符。
 *
 * 🔴 进三语句子的分隔符必须是**语言中立**的半角符号:原来用「、」和「·」,
 * 英文态就成了「632(2026-07-30 · Draw #276)、825(…)」这种半中半英(2026-08-11 生产实拍)。
 */
export const SEP = {
  /**
   * 半角冒号 —— 拼 i18n key 与「省:通道」那类前缀。
   */
  colon: ':',

  /**
   * 半角逗号。
   */
  comma: ',',

  /**
   * 逗号加空格 —— 抽选行之间的分隔。
   */
  commaSpace: ', ',

  /**
   * 分号 —— 口径串里各段之间。
   */
  semicolon: ';',

  /**
   * 等号 —— 口径串里键与值之间。
   */
  eq: '=',

  /**
   * 点 —— 拼 i18n key 的分段。
   */
  dot: '.',

  /**
   * 连字符 —— TEER 区间那种写法。
   */
  hyphen: '-',

  /**
   * 半角左括号。
   */
  parenL: '(',

  /**
   * 半角右括号。
   */
  parenR: ')',

  /**
   * 钱号 —— 时薪。
   */
  dollar: '$',

  /**
   * 每小时 —— 时薪的单位。
   */
  perHour: '/hr',

  /**
   * 加号 —— 杠杆的分数增量。
   */
  plus: ' +',

  /**
   * 破折号 —— 数字缺位时的占位符(不写 0,那是假事实)。
   */
  emDash: '—',

  /**
   * 两边带空格的破折号 —— 标签里的分隔。
   */
  spacedDash: ' — ',

  /**
   * 间隔号 —— 抽选行的备注。
   */
  midDot: ' · ',

  /**
   * 顿号 —— 中文枚举(只在中文串里用)。
   */
  enumComma: '、',
} as const

// =========================================================================
// 9. 判定成句片段(🔴 技术债:该住 lib/i18n)
// =========================================================================

/**
 * 判定理由的中文成句片段。
 *
 * 🔴 **技术债(2026-08-20 记)**:这些是给人看的字,按宪法该住 `lib/i18n` ——
 * 但多处测试钉着这些措辞,这一轮**只收位置不搬文案**(照 14 号处理 `FRIEND_MSG` 的先例)。
 * 搬进 i18n 是另一批的活:那边靠类型强制三语对齐,en/ko 要逐句译过才编译得过。
 *
 * 命名口径:`Head` = 句首、`Mid` = 变量之间、`Tail` = 句尾,不带后缀的是整句。
 */
export const PV_TEXT = {
  /**
   * 「达标」两个字,单独成句时用。
   */
  met: '达标',

  /**
   * 句尾的「 达标」。
   */
  metTail: ' 达标',

  /**
   * 「 个月」。
   */
  months: ' 个月',

  /**
   * 「 个月 达标」。
   */
  monthsMet: ' 个月 达标',

  /**
   * 「 个月,差 」——**已经攒了一部分**时才说差额。
   */
  monthsShort: ' 个月,差 ',

  /**
   * 经验门槛判不了。
   */
  monthsNoExp: ' 个月,档案缺经验月数',

  /**
   * 居住门槛判不了。
   */
  monthsNoResidence: ' 个月,档案缺居住时长',

  /**
   * 省外院校那一档判不了。
   */
  monthsNoLocalTenure: ' 个月,档案缺本省在职月数',

  /**
   * 「 分」。
   */
  points: ' 分',

  /**
   * 「 档」—— 语言差几档。
   */
  bands: ' 档',

  /**
   * 「,差 」。
   */
  shortBy: ',差 ',

  /**
   * 「 的」—— 接闸名。
   */
  of: ' 的',

  /**
   * 「 的 」—— 接分数。
   */
  ofSpaced: ' 的 ',

  /**
   * op=none:官方明说这条通道不设经验门槛(**不是**没查到)。
   */
  noExpReq: '不要工作经验',

  /**
   * 官方明说这一档不要求语言成绩。
   */
  noLangScore: '不要语言成绩',

  /**
   * 经验门槛的名字。
   */
  expGate: '工作经验门槛',

  /**
   * 在职门槛的名字 —— 与经验门槛量的不是同一件事。
   */
  tenureGate: '同雇主在职门槛',

  /**
   * 省提名语言门槛句首。
   */
  langReqHead: '语言门槛 CLB ',

  /**
   * 联邦子通道语言门槛的中段(前面接子通道名)。
   */
  fedLangMid: ' 语言门槛 CLB ',

  /**
   * 语言判不了。
   */
  langUnknown: '语言门槛判不了,档案缺 CLB 成绩',

  /**
   * 居住门槛句首。
   */
  residenceHead: '居住门槛 ',

  /**
   * 条件行判不了。
   */
  condUnknown: '另有一档门槛判不了,档案缺判定所需信息',

  /**
   * 自雇那条。
   */
  selfEmpExcluded: '自雇经历不计入工作经验',

  /**
   * 「本站尚未收录 」—— 后面接通道名。
   */
  notCollectedHead: '本站尚未收录 ',

  /**
   * 「门槛条文」—— 接在闸名后面。
   */
  reqDoc: '门槛条文',

  /**
   * 「 的门槛条文」。
   */
  reqTail: ' 的门槛条文',

  /**
   * 「 的工作经验门槛条文」。
   */
  expReqTail: ' 的工作经验门槛条文',

  /**
   * 「 的语言门槛条文」。
   */
  langReqTail: ' 的语言门槛条文',

  /**
   * 省提名那一版:没收录**不等于**官方不要求。
   */
  langReqSoftTail: ' 的语言门槛条文 —— 不等于这条通道不要求语言',

  /**
   * 「 在「」—— 清单名的前引号。
   */
  onListMid: ' 在「',

  /**
   * 「」清单上」。
   */
  listedTail: '」清单上',

  /**
   * 「」这张不合格清单上」。
   */
  ineligibleTail: '」这张不合格清单上',

  /**
   * 「 不在 」。
   */
  notOnListMid: ' 不在 ',

  /**
   * PE OID 子通道那条。
   */
  oidClosedTail: ' 清单上,12 个月子通道对本职业关闭',

  /**
   * 省外院校那一档的句首。
   */
  oopGradHead: '省外院校毕业:先在本省全职工作满 ',

  /**
   * 省外院校那一档的条件判不了。
   */
  oopCondUnknown: '省外院校毕业生另有一档在职门槛,档案缺学习省份',

  /**
   * 「估分 」。
   */
  scoreHead: '估分 ',

  /**
   * 「,语言拉满上界 」。
   */
  ceilingMid: ',语言拉满上界 ',

  /**
   * 「,对照 」—— 报「和哪一轮比」,不报「你差几分」。
   */
  comparedWith: ',对照 ',

  /**
   * 「,最近抽选 」。
   */
  recentDraws: ',最近抽选 ',

  /**
   * 「最近一轮 」。
   */
  latestDrawHead: '最近一轮 ',

  /**
   * 抽选线那条的中段。
   */
  drawLineMid: ' 最近一轮最低邀请分 ',

  /**
   * 「 分制」—— 该省的分制。
   */
  scaleTail: ' 分制',

  /**
   * 「 人)」—— 邀请人数。
   */
  peopleTail: ' 人)',

  /**
   * 没有可对照的轮次。
   */
  noRefLine: '本站未收录可对照的抽选线',

  /**
   * 档案落在官方表的档位之外 —— 不编一个分出来。
   */
  noScoreBand: '本站估分器挑不出官方档位,不给估分',

  /**
   * 通用省估分的参照标签句首。
   */
  gridRefHead: '本站问得到的因子算出的估分(加分项未计);对照最近一轮 ',

  /**
   * 通用省估分、但没有可对照的轮次。
   */
  gridRefNone: '本站问得到的因子算出的估分(加分项未计);本站未收录可对照的抽选线',

  /**
   * MPNP 的参照标签句首。
   */
  mbRefHead: '攒够门槛后的估分;对照最近一轮有分线的抽选 ',

  /**
   * MPNP、但没有可对照的轮次。
   */
  mbRefNone: '攒够门槛后的估分;本站未收录可对照的抽选线',

  /**
   * MPNP 外省学习倒扣句首。
   */
  mbStudyDeductHead: '外省学习倒扣 ',

  /**
   * MPNP 外省学习倒扣的中段。
   */
  mbStudyDeductMid: ' 分,全国唯一,已计入 ',

  /**
   * MPNP 外省工作倒扣句首。
   */
  mbWorkDeductHead: '外省工作经历再扣 ',

  /**
   * MPNP 外省工作倒扣的中段。
   */
  mbWorkDeductMid: ' 分,降至 ',

  /**
   * 闸缺口句首。
   */
  gateGapHead: '这条通道要求',

  /**
   * 闸缺口句尾。
   */
  gateGapTail: ',你现在没有',

  /**
   * 闸判不了。
   */
  gateUnknownTail: '判不了,档案缺这一项',

  /**
   * NL 名录那条的中段。
   */
  nlDesignatedMid: ' 家 NL 指定雇主中 ',

  /**
   * NL 名录那条的第二段。
   */
  nlDeclaredMid: ' 家申报过 ',

  /**
   * 掉档杠杆句首。
   */
  switchToHead: '换成 ',

  /**
   * 掉档杠杆的中段。
   */
  teerDownMid: ' TEER 5 的岗位后,',

  /**
   * 掉档杠杆的第二段。
   */
  pathsDroppedMid: ' 条通道掉档:',

  /**
   * 掉档理由里那句「只认 TEER」。
   */
  teerOnlyMid: ':该门槛只认 TEER ',

  /**
   * 语言杠杆句首。
   */
  clbFromHead: '语言从 CLB ',

  /**
   * 语言杠杆的中段。
   */
  clbToMid: ' 提到 CLB ',
} as const

// =========================================================================
// 10. 从官方文本里认东西的正则
// =========================================================================

/**
 * 官方标签里的 CLB 档位:`CLB 7` / `CLB level 7` 都认。
 *
 * 档位**从官方标签自己解析**,不写死 —— 各省的写法不一样,写死一份等于替官方定标准。
 */
export const CLB_IN_LABEL = /clb\s*(?:level\s*)?(\d+)/i

/**
 * 职业清单行的 `appliesTo` 里点名 Employment Offer 子类。
 *
 * 与 `APPLIES_OFFER` 是一对:那个用来看**清单行**写没写这四个字,这个用来看**通道名**是不是那条线。
 * SK 那 152 条只服务 OID/EE 子类,管不着 Employment Offer —— 靠这一对分流。
 */
export const EMPLOYMENT_OFFER_STREAM = /employment offer/i

/**
 * EE 分值表里「首项官方语言」那一段的表头。
 */
export const FIRST_OFFICIAL_LANGUAGE = /first official language/i

/**
 * MPNP 倒扣项:外省**学习**经历(全国唯一的一条 −100)。
 */
export const MB_RISK_STUDY = /studies in another province/i

/**
 * MPNP 倒扣项:外省**工作**经历(再叠一条 −100)。
 */
export const MB_RISK_WORK = /work experience in another province/i

/**
 * 门槛行的官方原文里写没写「全职」。
 *
 * 判据取官方原文,代码里不写死 —— AB/ON/SK/MB 的行都明写 full-time,
 * NS 写的是「paid work + 1,560 小时」不含全职字样,那就不算。
 */
export const FULL_TIME_IN_LABEL = /full[\s-]?time/i

/**
 * MPNP 的 Skilled Worker in Manitoba 那条线(杠杆查它的经验门槛)。
 */
export const MB_SWM_STREAM = /skilled worker in manitoba/i

// =========================================================================
// 11. 判定里的数(裸着看不出它是什么)
// =========================================================================

/**
 * 日期串只留前 10 位 = `YYYY-MM-DD`。库里的 `draw_date` 带时分秒,判定与展示都只用到日期。
 */
export const DATE_LEN = 10

/**
 * offer 到手后还要等多久 —— 四档本身。
 */
export const TIER = {
  /**
   * Day0:现在就能走。
   */
  now: 0,

  /**
   * 3-6 个月。
   */
  months6: 1,

  /**
   * 一年上下。
   */
  months12: 2,

  /**
   * 更久(两年那一档)。
   */
  beyond: 3,
} as const

/**
 * 四档之间的月数分界线。
 */
export const TIER_BOUND = {
  /**
   * 到这儿为止算「3-6 个月」。
   */
  months6: 6,

  /**
   * 到这儿为止算「一年上下」。
   */
  months12: 12,
} as const

/**
 * ON 近期毕业生那条要 **2 年制以上**的文凭/研究生证书/硕博。
 */
export const ON_GRAD_MIN_YEARS = 2

/**
 * BC 时薪那条纯规则的**官方默认**——分值行自己写了就用它写的,没写才落这几个数。
 *
 * 口径是「每整元 1 分」:低于 floorAt 一分不给,capAt 以上不再加,分数 = 时薪 − base,再由 factorMax 封顶。
 */
export const WAGE_RULE_DEFAULT = {
  /**
   * 低于这个时薪一分不给。
   */
  floorAt: 16,

  /**
   * 高于这个时薪不再往上加。
   */
  capAt: 70,

  /**
   * 每整元 1 分的起算点(时薪减掉它就是分)。
   */
  base: 15,

  /**
   * 这一项的封顶分。
   */
  factorMax: 55,
} as const

/**
 * MPNP 学历按**学制年数**重挑时的两条线。
 */
export const MB_EDU_YEARS = {
  /**
   * 满 3 年 → 单一 3 年以上课程档。
   */
  threeYear: 3,

  /**
   * 满 2 年 → 单一 2 年课程档;不满则一年制档。
   */
  twoYear: 2,
} as const

/**
 * MPNP adapt 里「在曼省读的书」记几分档:满 2 年记 2,不满记 1。
 */
export const MB_ADAPT_EDU_YEARS = 2

/**
 * `teer-0-3` 这种子通道名里的 TEER **区间**只有两个端点;端点数不是 2 就按枚举读。
 */
export const TEER_RANGE_PARTS = 2

/**
 * 职业级通道行排第几档(见 `jobRowRank`)。
 */
export const JOB_ROW_RANK = {
  /**
   * 门槛行在库里、月数也算得出 —— 可判的排最前。
   */
  ok: 0,

  /**
   * 门槛未收录。
   */
  notCollected: 1,

  /**
   * 被清单判死 —— 沉底。
   */
  excludedByList: 2,
} as const

/**
 * 排序时的**沉底值**:比任何真值都大,好让「没有这一格」的排到最后。
 */
export const SINK = {
  /**
   * 没有 tier(库缺行被抹成 null 的那种)。
   */
  tier: 9,

  /**
   * 没有门槛月数。
   */
  months: 99,
} as const

/**
 * 换职业前后对比时,一条通道的裁决排第几档(见 `verdictRank`,越小越好)。
 */
export const VERDICT_RANK = {
  /**
   * 能走,而且一道障碍都不差。
   */
  open: 0,

  /**
   * 能走,但被某道闸卡着。
   */
  blocked: 1,

  /**
   * 判不了。
   */
  needsInfo: 2,

  /**
   * 排除。
   */
  excluded: 3,

  /**
   * 那一头压根没有这条通道 —— 沉底。
   */
  absent: 9,
} as const

/**
 * 「接一个 TEER 更低的岗」那根杠杆问的就是 **TEER 5**(与 `TEER5_NOC` 配套)。
 */
export const TEER_LOWEST = 5

/**
 * 掉档理由最多摆几条 —— 再多就成了刷屏,通道名那一串已经把话说清了。
 */
export const TEER_REASONS_SHOWN = 4

/**
 * 语言目标档默认 8:雅思一次提两档是最常见的可行目标。**分值仍全部查表**,这里只决定问哪一档。
 */
export const CLB_TARGET_DEFAULT = 8

// =========================================================================
// 12. 案例库
// =========================================================================

/**
 * 案例库 C01-C16 → 决策页「常见案例」(来源:docs/design/案例库-问题与结果先行-20260803.md)。
 *
 * 每条 = 标题一行(画像 + 他要判的那件事)+ 用户原话问题;**文案在 `lib/i18n`,这里只有 id 与 slug**。
 *
 * 🔴 红线:这里只有画像与问题,**没有任何结论** —— 结论永远由判定核算出来,
 * 出口只有做了事实层的那几个处境页。
 *
 * `page` 是处境页 slug 的**唯一来源**:服务端按它建出页白名单,决策页按它决定给不给
 * 「完整案例」钮。填了但事实层没跟上 = 死链,所以两边共用这一个字段,不各写一份。
 * 空串 = 还没做处境页(原来写成可选字段,改成恒有是因为常量文件不许 import 类型)。
 *
 * 2026-08-11 Frank 二拍撤掉 `preset`(一键代入):它把案例主人公的画像写进用户自己的答案,
 * 答过题的人一点就丢。要恢复看那次提交的父版本。
 *
 * C01 的 slug 里那句「中介」是真人原话(2026-08-11 Frank 更正:中介说的不是收费,是
 * 「80% 概率拿 PR + 我给你介绍雇主」)—— 记错一个字,整页答的就是另一个问题。
 */
export const CASES = [
  { id: 'C01', page: 'carpenter-ontario-graduate-manitoba-agent' },
  { id: 'C02', page: '' },
  { id: 'C03', page: '' },
  { id: 'C04', page: '' },
  { id: 'C05', page: '' },
  { id: 'C06', page: '' },
  { id: 'C07', page: '' },
  { id: 'C08', page: '' },
  { id: 'C09', page: '' },
  { id: 'C10', page: '' },
  { id: 'C11', page: '' },
  { id: 'C12', page: '' },
  { id: 'C13', page: '' },
  { id: 'C14', page: '' },
  { id: 'C15', page: '' },
  { id: 'C16', page: '' },
]

// =========================================================================
// 13. 三合一判定卡
// =========================================================================

/**
 * 判定引擎的三态 → 判定卡三态。
 *
 * `fail` 在卡这一层叫 `gap`(与雇主侧的 `short` 同义):卡要说的是「还差多少」,
 * 不是「你失败了」——同一个判定,措辞的立场不一样。
 */
export const STATE_OF_RULE = {
  /**
   * 达标。
   */
  pass: 'pass',

  /**
   * 没达标 —— 卡上说成「差多少」。
   */
  fail: 'gap',

  /**
   * 判不了。
   */
  unknown: 'unknown',
} as const

/**
 * 判不了某个因素时该点名问哪几个档案槽。
 *
 * 🔴 **只在判不了时挂** —— 达标 / 差多少都已经判出来了,再问一遍是骚扰。
 */
export const SLOTS_OF_FACTOR: Record<string, string[]> = {
  /**
   * 语言判不了 → 问语言成绩。
   */
  language: ['clb'],

  /**
   * 经验判不了 → 境内境外两格都要。
   */
  experience: ['expCanadaMonths', 'expForeignMonths'],

  /**
   * 收入门槛判不了 → 问家庭人数(最低收入表按它分档)。
   */
  income: ['familySize'],
}

/**
 * 有大西洋试点(AIP)的四个省 —— 只有它们才谈「指定雇主名录」。
 */
export const AIP_PROVINCES = new Set(['NS', 'NB', 'PE', 'NL'])

/**
 * 收入门槛那一档的因素名(`pnp_requirements.factor`)。
 */
export const FACTOR_INCOME = 'income'

/**
 * 家庭人数那一槽 —— 最低收入表按它分档,判不了时点名问它。
 */
export const SLOT_FAMILY_SIZE = 'familySize'

/**
 * 判定卡上一行属于哪一关。
 */
export const GATE_OF = {
  /**
   * 职业关:清单命中与粗筛档,零新判定,全是查表。
   */
  occupation: 'occupation',

  /**
   * 雇主关:公司事实 × 官方雇主侧门槛。
   */
  employer: 'employer',

  /**
   * 个人关:他自己的档案。
   */
  person: 'person',
} as const

/**
 * 这一行免费看还是付费看。
 */
export const TIER_OF = {
  /**
   * 免费 —— 事实与结论都免费(2026-08-14 拍板:收费买的是代劳与自动化)。
   */
  free: 'free',

  /**
   * 付费。
   */
  paid: 'paid',
} as const

/**
 * 判定卡上一行的状态。
 */
export const CARD_STATE = {
  /**
   * 达标。
   */
  pass: 'pass',

  /**
   * 差多少 —— 可积累。
   */
  gap: 'gap',

  /**
   * 硬伤。
   */
  excluded: 'excluded',

  /**
   * 判不了。
   */
  unknown: 'unknown',

  /**
   * 只是一条事实,**不给对错符号**(粗筛与适用范围走这一档)。
   */
  info: 'info',
} as const

/**
 * 职业关那几行的 i18n key。
 */
export const TV_OCC = {
  /**
   * 在该省的不合格清单上 —— 硬伤。
   */
  excluded: 'tv.occ.excluded',

  /**
   * 在某张具名(定向)清单上。
   */
  listed: 'tv.occ.listed',

  /**
   * 该省**官方就没有**定向清单(要举证,见 `OCC_LIST_NONE`)。
   */
  noList: 'tv.occ.noList',

  /**
   * 未命中该省任何具名清单 —— 必须带适用范围,不是判死。
   */
  notListed: 'tv.occ.notListed',

  /**
   * TEER 粗筛档。
   */
  teer: 'tv.occ.teer',
} as const

/**
 * **官方就没有定向清单**的省 —— 这是要举证的断言,不是默认值。
 *
 * 「本站未收录」与「官方没有」在用户那里意思相反:前者他该去官网找,后者他该警惕任何
 * 拿清单说事的人。2026-08-14 Frank 实拍 NL:一句「本站未收录 NL 的定向清单」
 * 让用户去官网找一份**不存在的清单**。
 *
 * 举证 = 一个 URL + 官方原句。举不出来的省一律落「本站未收录」,不进这张表。
 */
export const OCC_LIST_NONE = {
  /**
   * NL:资格页逐条只有 offer / 身份 / 语言 / 经验,无职业清单条目。
   * (nl-priority 是「优先处理表」—— 官方明说不在表上不等于不能申请,且只给职位名无 NOC 码,
   * 不构成定向清单。)
   */
  NL: {
    url: 'https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/international-graduate',
    fetched: '2026-08-12',
  },

  /**
   * ON(2026-08-15 #322 查证,crawl 缓存举证):旧定向通道已死 ——「this stream was closed
   * as of May 30, 2026, as part of the OINP redesign」(In-Demand Skills 页);
   * 新制单一通道明写全职业 ——「…with a qualifying job offer and work experience in any
   * National Occupational Classification (NOC) occupation」。
   * 所以 ON 是「官方无定向清单」,不是「本站未收录」。
   */
  ON: {
    url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream',
    fetched: '2026-08-15',
  },
}

/**
 * 判定卡每一行的**英文留痕**(`label`)。
 *
 * 它既不是给用户看的(那是 `key` + `params` 走 i18n),也不是给模型看的 —— 是给读日志的人
 * 一眼看出这行在说什么。所以只有英文一份,不进 i18n。命名口径同 `PV_TEXT`:
 * `Head` 句首 / `Mid` 变量之间 / `Tail` 句尾。
 */
export const TV_LABEL = {
  /**
   * 「occupation 」—— 后面接 NOC 码。
   */
  occHead: 'occupation ',

  /**
   * 「 is on the ineligible list 」。
   */
  occIneligibleMid: ' is on the ineligible list ',

  /**
   * 「 is named on 」。
   */
  occListedMid: ' is named on ',

  /**
   * 该省官方无定向清单那一行(前面接省码)。
   */
  occNoListTail: ' employer-offer streams set no occupation list (eligibility pages enumerate offer/status/language only)',

  /**
   * 「 is not on any of the 」。
   */
  occNotOnMid: ' is not on any of the ',

  /**
   * 「 named list(s) of 」。
   */
  occNamedListsMid: ' named list(s) of ',

  /**
   * 「 — named lists bind only their own stream」—— 定向清单只绑它自己那条通道。
   */
  occBindTail: ' — named lists bind only their own stream',

  /**
   * 该省一张具名清单都没收录。
   */
  occNoListOnFileHead: 'no named occupation list on file for ',

  /**
   * 「TEER 」。
   */
  teerHead: 'TEER ',

  /**
   * 「 coarse screen 」。
   */
  coarseMid: ' coarse screen ',

  /**
   * 粗筛没排除他。
   */
  coarsePass: 'not ruled out',

  /**
   * 粗筛排除了他。
   */
  coarseFail: 'ruled out',

  /**
   * 「; on file: 」—— 后面接本站收录的那条通道。
   */
  onFileMid: '; on file: ',

  /**
   * 「 covers TEER 」。
   */
  coversMid: ' covers TEER ',

  /**
   * 值缺位时的占位符(`?`)—— 留痕里不写 0,那会读成「TEER 0」。
   */
  unknownValue: '?',
  /**
   * 「 is on the 」—— 前接公司名、后接名录来源。
   */
  empDesignatedMid: ' is on the ',

  /**
   * 「 designated employer list 」。
   */
  empDesignatedTail: ' designated employer list ',

  /**
   * 出处标签的尾巴。
   */
  empDesignatedSuffix: ' designated employers',

  /**
   * 「 designated employers in 」。
   */
  empMultiMid: ' designated employers in ',

  /**
   * 「 match the name "」。
   */
  empMultiName: ' match the name "',

  /**
   * 「链在名录上,这一家不可证」。
   */
  empMultiTail: '" — chain is listed, this employer is unproven',

  /**
   * 名录里没认出 —— **本站的窟窿**,不是「官方没指定」。
   */
  empUnmatchedTail: ' not matched in the designated employer list — site gap, not proof of non-designation',

  /**
   * 「employer 」—— 后接因素名。
   */
  empHead: 'employer ',

  /**
   * 「: need 」。
   */
  empNeedMid: ': need ',

  /**
   * 「, has 」。
   */
  empHasMid: ', has ',

  /**
   * 「 → 」—— 后接判定。
   */
  empArrow: ' → ',

  /**
   * 营业额那一行的句首。
   */
  empRevenueHead: 'employer revenue: need ',

  /**
   * 营业额无源 —— 2026-08-10 拍板永久结案,不重启抓数。
   */
  empRevenueTail: ' CAD/yr, company revenue permanently uncollected',

  /**
   * 雇员数旁证的句首。
   */
  empStaffHead: 'employer size estimate: ',

  /**
   * 「 employees (no 」。
   */
  empStaffMid: ' employees (no ',

  /**
   * 「 staff threshold on file)」。
   */
  empStaffTail: ' staff threshold on file)',

  /**
   * 公营部门 —— 私企门槛整段旁路。
   */
  empPublicTail: ' is a public-sector employer — private-company thresholds bypassed',

  /**
   * 「下一步怎么谈」那一行的句首。
   */
  nextHead: 'next step with ',

  /**
   * 「: designation=」。
   */
  nextDesignation: ': designation=',

  /**
   * 「, LMIA approvals for 」。
   */
  nextLmiaMid: ', LMIA approvals for ',

  /**
   * 「=」。
   */
  nextEq: '=',
  /**
   * 个人关那一行的「: need 」。
   */
  personNeedMid: ': need ',

  /**
   * 「, you 」—— 后接他自己的值。
   */
  personYouMid: ', you ',

  /**
   * 他没答这一格 —— 留痕里写成 unanswered,不写 0。
   */
  unanswered: 'unanswered',

  /**
   * 时间窗那一行的句首。
   */
  permitHead: 'permit runway: ',

  /**
   * 「 months left」。
   */
  permitMonthsTail: ' months left',

  /**
   * 「 (status=」。
   */
  permitStatusMid: ' (status=',

  /**
   * 右括号。
   */
  parenRight: ')',

  /**
   * 一个目标省都没答。
   */
  compareNoTarget: 'no target province on file — nothing to compare against',

  /**
   * 换省对照那一行的句首。
   */
  targetHead: 'target ',

  /**
   * 目标省没有这个职业的清单。
   */
  targetNotListedMid: ' is not on any named list there',

  /**
   * 目标省有这个职业的清单。
   */
  targetListedMid: ' is named on ',

  /**
   * 「 — offer in hand is in 」。
   */
  targetOfferTail: ' — offer in hand is in ',

  /**
   * 判定仍按手上这份岗算 —— 目标省只摆事实作对照。
   */
  targetVerdictTail: ', verdict still runs on this job',
  /**
   * 结论句「排除」的句首。
   */
  sumExcludedHead: 'excluded: ',

  /**
   * 「 is on 」。
   */
  sumOnMid: ' is on ',

  /**
   * 「 in 」。
   */
  sumInMid: ' in ',

  /**
   * 结论句「能走」的句首。
   */
  sumOkHead: 'ok: ',

  /**
   * 「 open (tier 」。
   */
  sumOpenMid: ' open (tier ',

  /**
   * 「 pathway(s) clear」。
   */
  sumClearTail: ' pathway(s) clear',

  /**
   * 结论句「被卡住」的句首。
   */
  sumBlockedHead: 'blocked: ',

  /**
   * 「 needs 」。
   */
  sumNeedsMid: ' needs ',

  /**
   * 「 (CLB 」。
   */
  sumClbHead: ' (CLB ',

  /**
   * 结论句「判不了」的句首。
   */
  sumNeedsInfoHead: 'needs-info: ',

  /**
   * 「 undecidable, missing 」。
   */
  sumUndecidableMid: ' undecidable, missing ',

  /**
   * 结论句「一条可判的都没有」。
   */
  sumNotCollectedHead: 'not-collected: no judgeable pathway in ',

  /**
   * 「 compared)」。
   */
  sumComparedTail: ' compared)',

  /**
   * 「最快」那一行的句首。
   */
  fastestHead: 'fastest after offer: ',

  /**
   * 「 (tier 」。
   */
  fastestTierMid: ' (tier ',

  /**
   * 并列。
   */
  fastestTied: ', tied',

  /**
   * 一条可判的都没有。
   */
  fastestNoneHead: 'no judgeable pathway among ',

  /**
   * 门槛没收录 —— 不给结论。
   */
  fastestNoneTail: ' compared — thresholds not on file, no conclusion offered',

  /**
   * 「你这边」那一行的句首。
   */
  youHead: 'you: ',

  /**
   * 「 is blocked by 」。
   */
  youBlockedMid: ' is blocked by ',

  /**
   * 「本站没收录」那一行的句首。
   */
  notOnFileHead: 'not on file: ',

  /**
   * 「 thresholds not collected」。
   */
  notOnFileTail: ' thresholds not collected',
} as const

/**
 * 雇主关那几行的 i18n key。
 */
export const TV_EMP = {
  /**
   * 这家在指定雇主名录上。
   */
  designated: 'tv.emp.designated',

  /**
   * 名录里同名多配 —— 链在名录上,这一家不可证。
   */
  designatedMulti: 'tv.emp.designatedMulti',

  /**
   * 名录里没认出 —— **本站的窟窿**,不是「官方没指定」。
   */
  designationUnknown: 'tv.emp.designationUnknown',

  /**
   * 年营业额那一行(恒 unknown,见 `functions` 里的理由)。
   */
  revenue: 'tv.emp.revenue',

  /**
   * 雇员数旁证 —— 该省没收录门槛但本站有估算时摆一条事实。
   */
  staffFact: 'tv.emp.staffFact',

  /**
   * 公营部门 —— 私企门槛整段旁路。
   */
  publicSector: 'tv.emp.publicSector',
} as const

/**
 * 「下一步怎么谈」那几行的 i18n key(付费位)。
 */
export const TV_NEXT = {
  /**
   * 对这家雇主怎么谈。
   */
  employer: 'tv.next.employer',
} as const

/**
 * 雇主侧逐项门槛那一行的 key 前缀(后面接 `years` / `staff`)。
 */
export const TV_EMP_PREFIX = 'tv.emp.'

/**
 * 名录里同名命中到几家就算「多配」—— 两家起,「这一家就是你那份岗的雇主」就不可证了。
 */
export const DESIGNATION_MULTI = 2

/**
 * 个人关 / 时间窗 / 换省对照那几行的 i18n key。
 */
export const TV_PERSON = {
  /**
   * 许可还剩多久(时间窗)。
   */
  permit: 'tv.time.permit',

  /**
   * 一个目标省都没答 —— 没得对照。
   */
  noTarget: 'tv.compare.noTarget',

  /**
   * 目标省没有这个职业的具名清单。
   */
  compareNotListed: 'tv.compare.notListed',

  /**
   * 目标省有这个职业的具名清单。
   */
  compareListed: 'tv.compare.listed',
} as const

/**
 * 个人关逐条门槛那一行的 key 前缀(后面接因素名)。
 */
export const TV_PERSON_PREFIX = 'tv.person.'

/**
 * 判不了时点名要补的两个档案槽 —— 它们不在 `SLOT` 表里(那张只管判定核用的)。
 */
export const CARD_SLOT = {
  /**
   * 许可还剩几个月。
   */
  permitMonthsLeft: 'permitMonthsLeft',

  /**
   * 想去哪几个省。
   */
  targetProvinces: 'targetProvinces',
} as const

/**
 * 比路里一条线的身份。
 */
export const COMPARE_ROLE = {
  /**
   * 手上这份岗所在省的通道。
   */
  current: 'current',

  /**
   * AIP 线(雇主已被名录指定时才进)。
   */
  aip: 'aip',

  /**
   * 目标省的通道 —— **只摆事实作对照,不参与「最快」评比**。
   */
  target: 'target',
} as const

/**
 * 结论句那几行的 i18n key。
 */
export const TV_SUM = {
  /**
   * 职业被官方排除。
   */
  excluded: 'tv.sum.excluded',

  /**
   * 有能走的。
   */
  ok: 'tv.sum.ok',

  /**
   * 被某道闸卡住。
   */
  blocked: 'tv.sum.blocked',

  /**
   * 判不了 —— 点名缺哪一槽。
   */
  needsInfo: 'tv.sum.needsInfo',

  /**
   * 一条可判通道都没有 —— **本站的窟窿**。
   */
  notCollected: 'tv.sum.notCollected',
} as const

/**
 * 「你这边」与「最快」那几行的 i18n key。
 */
export const TV_YOU = {
  /**
   * offer 到手后哪条线最快。
   */
  fastest: 'tv.route.fastest',

  /**
   * 你被哪道闸卡住(免费裁决行,与结论句同源)。
   */
  gate: 'tv.you.gate',

  /**
   * 这份岗所在省有哪几条通道**本站没收录门槛** —— 不许静默丢掉。
   */
  notCollected: 'tv.you.notCollected',
} as const

/**
 * AIP 名录的来源名 —— 比路里只有它算「已确证的 AIP 线」。
 */
export const AIP_SOURCE = 'AIP'

/**
 * 语言差档那条理由的 i18n key —— 结论句要从它身上取官方门槛值。
 */
export const PV_KEY_LANG_GAP = 'pv.langGap'

/**
 * 结论句的五档 —— 它与卡片行的 `CARD_STATE` 是两把尺:那把说一行的状态,这把说整张卡的结论。
 */
export const SUM_KIND = {
  /**
   * 有能走的。
   */
  ok: 'ok',

  /**
   * 被某道闸卡住。
   */
  blocked: 'blocked',

  /**
   * 判不了。
   */
  needsInfo: 'needs-info',

  /**
   * 职业被官方排除。
   */
  excluded: 'excluded',

  /**
   * 一条可判通道都没有 —— 本站的窟窿。
   */
  notCollected: 'not-collected',
} as const

// =========================================================================
// 14. 判定卡的下行数据
// =========================================================================

/**
 * 档案里的「当前处境」→ 判定核认的 `status`。
 *
 * 🔴 **不补默认**:对不上就 null(needs-info 是实话)。
 */
export const STATUS_OF: Record<string, string> = {
  /**
   * 持 PGWP。
   */
  pgwp: 'pgwp',

  /**
   * 在读。
   */
  study: 'study',

  /**
   * 在工作。
   */
  worker: 'worker',

  /**
   * 其他。
   */
  other: 'other',

  /**
   * 老问卷的写法:在读。
   */
  studying: 'study',

  /**
   * 老问卷的写法:在工作。
   */
  working: 'worker',

  /**
   * 已是 PR —— 判定核里归「其他」。
   */
  pr: 'other',

  /**
   * 人在境外 —— 判定核里归「其他」。
   */
  overseas: 'other',
} as const

/**
 * 人在境外那个处境值 —— 「在不在境内」由它推,不另存一列。
 */
export const STATUS_OVERSEAS = 'overseas'

/**
 * 省码/地区码的形状(两位大写,或 `TERR`)—— 答案里对不上这个形状的一律当没答。
 */
export const PROVINCE_CODE = /^([A-Z]{2}|TERR)$/

/**
 * NOC 码的形状(五位数字)。
 */
export const NOC_CODE = /^\d{5}$/

/**
 * TEER 在 NOC 码里的位置 —— 第二位。全站同一条口径。
 */
export const TEER_DIGIT = 1

/**
 * 许可的四个取值 —— 答案里对不上就当没答。
 */
export const PERMIT_KINDS = ['study', 'pgwp', 'work', 'none'] as const

/**
 * 下行数据的两句错误。**只有这两种**:参数不成立、这份岗不存在。
 */
export const WIRE_ERR = {
  /**
   * 没给岗位号,或给的不是正整数。
   */
  jobRequired: 'job required',

  /**
   * 库里没有这份岗。
   */
  notFound: 'not found',
} as const

/**
 * 下行数据要用到的两个 HTTP 码。
 */
export const HTTP = {
  /**
   * 参数不成立。
   */
  badRequest: 400,

  /**
   * 这份岗不存在。
   */
  notFound: 404,
} as const

// =========================================================================
// 15. 处境页的事实层
// =========================================================================

/**
 * C01(马龙 · 木匠)的事实档 —— 逐项来源见
 * `docs/design/案例C01-马龙木匠路径-事实档-20260805.md` §一。
 *
 * 🔴 **这不是 caseLibrary 里那份答题预填用的残缺 preset**:那份是给页面预填答案的,
 * 缺项由用户补;这份是**已经核过的事实**,判定核直接拿它出结论。两份混用 = 拿半个档案下结论。
 */
export const CASE_C01 = {
  /**
   * 中介/朋友推的那个省的通道 —— 页面第一段就回答它。
   */
  askedKey: 'MB-swm',

  /**
   * 年龄。
   */
  age: 40,

  /**
   * 配偶在中国、不随行 → CRS 走单身表(事实档 §一)。
   */
  married: false,

  /**
   * 语言(CLB)。
   */
  clb: 6,

  /**
   * 学历档。
   */
  edu: 'diploma2y',

  /**
   * 学制年数。
   */
  eduYears: 2,

  /**
   * 加拿大境内读的书。
   */
  canadaStudy: true,

  /**
   * 在哪个省读的。
   */
  studyProvince: 'ON',

  /**
   * 职业码(木匠)。
   */
  noc: '72310',

  /**
   * TEER。
   */
  teer: 2,

  /**
   * 加拿大经验月数。
   */
  expCanadaMonths: 0,

  /**
   * 海外可计经验月数 —— **海外经历全是自雇 → 可计月数 0**。
   */
  expForeignMonths: 0,

  /**
   * 海外经历是自雇。
   */
  foreignExpSelfEmployed: true,

  /**
   * 当前处境。
   */
  status: 'pgwp',

  /**
   * 现居省。
   */
  province: 'ON',

  /**
   * 持的许可。
   */
  permit: 'pgwp',

  /**
   * 手上有没有 offer。
   *
   * 事实档 §一**没写这四格**,老代码靠一个 `as VerdictProfile` 把它们整个略过去 ——
   * 于是判定核读到的是 `undefined`。这里改成显式 `null`(= 没答,判不了),
   * 语义与「略过去」一致,但不再靠断言把编译器关掉(2026-08-20 搬家时补)。
   */
  hasOffer: null,

  /**
   * 人在不在境内。事实档没写 → 没答。
   */
  inCanada: null,

  /**
   * 专业对不对口。事实档没写 → 没答。
   */
  fieldMatch: null,

  /**
   * 法语到没到 NCLC 5。事实档没写 → 没答。
   */
  frenchOk: null,
} as const

/**
 * 案例编号 —— 事实层目前只有这一条。
 */
export const CASE_ID = {
  /**
   * 马龙 · 木匠。
   */
  c01: 'C01',
} as const

/**
 * 处境页要摆的四档 —— 与 `TIER` 同一把尺,这里只是「要遍历哪几档」。
 */
export const CASE_TIERS = [0, 1, 2, 3] as const

/**
 * 跨省通道(AIP / RCIP / 联邦)没有单一省份,拿这个数排到最后面。
 */
export const NO_PROVINCE_RANK = -1

/**
 * 官方运营数据的指标名 —— 库里 `metric` 列的取值。
 */
export const OPS_METRIC = {
  /**
   * 本年名额。
   */
  allocation: 'allocation',

  /**
   * 已提名(年内至今)。
   */
  nominated: 'nominations_ytd',

  /**
   * 已拒签(年内至今)。
   */
  refused: 'refusals_ytd',

  /**
   * 已发邀请(年内至今)。
   */
  invited: 'laa_ytd',

  /**
   * 已收到申请(年内至今)。
   */
  received: 'applications_received_ytd',

  /**
   * 池子里有多少人。
   */
  poolTotal: 'eoi_pool_total',
} as const

// =========================================================================
// 16. 取数与缓存
// =========================================================================

/**
 * 进程内缓存活多久。Render 单实例,重启即失效;与 `/api/quiz` 的 topCache 同手法。
 */
export const TTL = 10 * 60_000

/**
 * 日期列只取到日(`YYYY-MM-DD`)。
 */
export const DATE_LEN_DAY = 10

/**
 * /api/ruling/verdict 的岗位 id 参数名。
 */
export const P_JOB = 'job'

/**
 * /api/ruling/pathways 的职业码参数名。
 */
export const P_NOC = 'noc'

/**
 * /api/ruling/pathways 的 TEER 参数名。
 */
export const P_TEER = 'teer'

/**
 * TEER 档上限（0..5）。
 */
export const TEER_MAX = 5

/**
 * 五位职业码的形状（pathways 的 noc 参数验形）。
 */
export const NOC5_RE = /^\d{5}$/

/**
 * 错误体：noc 参数缺位或非法。
 */
export const E_NOC_REQUIRED = 'noc required'

/**
 * 问卷「你现在的情况」→ 引擎 status 词（引擎只认 other/study/worker）。
 */
export const STATUS_MAP: Record<string, string> = {
  /**
   * 人在海外。
   */
  overseas: 'other',

  /**
   * 在读学生。
   */
  studying: 'study',

  /**
   * 在职工签。
   */
  working: 'worker',

  /**
   * 境内找工作。
   */
  jobhunting: 'other',
}

/**
 * 加分项勾选键的形状（省:因素:批 三段；信任边界校验 —— 它直接进分值
 * 计算，放任自由文本进来等于让请求方自己写分）。
 */
export const TICK_KEY_RE = /^[A-Z]{2}:[A-Za-z][A-Za-z0-9]{0,23}:\d{1,2}$/

/**
 * 官方档位直选键的形状（省:因素；同一条信任边界）。
 */
export const ROW_KEY_RE = /^[A-Z]{2}:[A-Za-z][A-Za-z0-9]{0,23}$/

/**
 * 勾选/档位总量封顶。
 */
export const TICKS_N_MAX = 64

/**
 * 档位 seq 上限。
 */
export const ROW_SEQ_MAX = 99

/**
 * 时薪上限（超出 = 不是时薪）。
 */
export const WAGE_MAX = 1000

/**
 * BC 地区档上限。
 */
export const AREA_I_MAX = 20

/**
 * 两位省码形状。
 */
export const PROV2_RE = /^[A-Z]{2}$/

/**
 * 省码或北地区（学历省/现居省两题的取值域）。
 */
export const PROV_OR_TERR_RE = /^([A-Z]{2}|TERR)$/

/**
 * 学历白名单（fields.ts engineKey 送来的 edu；与 points 的 EduBand 逐字对齐 ——
 * 2026-08-15「EE 为什么还会排在前面」溯源：此前路由写死 null，CRS 估分永远算不出）。
 */
export const EDU_KEY_VALUES: string[] = ['doctorate', 'master', 'bachelor', 'tradeCert', 'diploma2y', 'cert1y', 'highschool']

/**
 * 持照白名单（AB/PE 工签闸、NL 的 PGWP 闸靠它；没答留 null 不猜）。
 */
export const PERMIT_VALUES: string[] = ['study', 'pgwp', 'work', 'none']

/**
 * 错误体：答案包没带。
 */
export const E_ANSWERS_REQUIRED = 'answers required'

/**
 * 被 offer 闸卡住的 blockedBy 值（反事实只给这档）。
 */
export const GATE_OFFER = 'offer'

/**
 * 理由行的 gap 档（原因列逐行差异用）。
 */
export const REASON_GAP = 'gap'

/**
 * 理由行的 excluded 档。
 */
export const REASON_EXCLUDED = 'excluded'

/**
 * 难度 json 里名额竞争因子的 key（口径与 points/rows 的 COMP_KEY 同源；
 * 形状/常量重复先忍着，行为不开叉）。
 */
export const COMP_KEY = 'comp'

/**
 * 试点名额聚合的键分隔（省|制度）。
 */
export const PILOT_KEY_SEP = '|'

/**
 * RCIP 的通道 key（试点名额只挂这两条的省级行）。
 */
export const KEY_RCIP = 'RCIP'

/**
 * FCIP 的通道 key。
 */
export const KEY_FCIP = 'FCIP'

/**
 * 引擎判定档里的排除档（#318：单列一组不隐身）。
 */
export const VERDICT_EXCLUDED = 'excluded'

/**
 * 从五位职业码里抽 TEER（第二位；具名捕获组，不按位取值）。
 */
export const NOC_TEER_RE = /^\d(?<teer>\d)\d{3}$/

// =========================================================================
// 17. 空文本的含义(判定域里的 `''` 各代表什么)
// =========================================================================

/**
 * 上游那一格没有文本 —— 库里那列是 null、json 里那格不是标量、请求没带这个参数,
 * 都先收成这个值再往下算。
 *
 * 不为它分叉出一条 null 路径,是因为紧跟着的都是**对空串有定义**的操作:
 * `.trim()` 回空串、`.split()` 切出一个空段、正则 `exec` 匹配不上回 null ——
 * 多写一条 null 分支只会把同一件事写两遍,而两遍迟早对不上。
 *
 * ⚠️ 反过来读要小心:判定结果里的空文本一律是「**本站没有这个值**」,
 * 不是「官方不要求」。后者是要举证的断言(见 `OCC_LIST_NONE`),举不出来只能落「本站未收录」。
 */
export const NO_TEXT = ''

/**
 * i18n 插值参数那一格没有值 —— 判定卡行(`TripleRow` 的 `params`)与判定理由
 * (`VerdictReason` 的 `params`)共用这一个。
 *
 * 三语句子由 `lib/i18n` 按 key 取模板、拿 `params` 填空,填进去的空串等于**那处不出字**。
 * 所以这一格不能改填 0(替官方编数),也不能填「未知」那句人话 —— 人话归 `label` 那一路:
 * 同一个函数里 `xxxParam` 与 `xxxLabel` 成对出现就是这个分工,
 * **参数给机器填空,label 给人读**,两者缺位时的写法本来就不一样。
 */
export const NO_PARAM = ''

/**
 * 拼句子或拼 i18n key 时的可选片段:这一段不加。
 *
 * 用在「先假定不加,条件成立才赋上真片段」的位置(`let tail = NO_SEGMENT`)。
 * 片段自己带前导的标点或空格(`SEP.midDot + note`、`` `${SEP.dot}${asks}` ``),
 * 所以不加时必须是**空**而不是一个空格 —— 补空格会在句尾留下看不见的尾巴,
 * 三语切换后更难对齐(宪法「一行放得下就不折行,不写废话」)。
 */
export const NO_SEGMENT = ''

/**
 * AIP 指定雇主名录没认出来源(`matchDesignation` 的 `source` 一格)。
 *
 * 名录行自带 source(哪个省的哪一份名录)。同名连锁多配时几家的 source 可能不一致,
 * **不一致就留空** —— 挑一个写上去等于替用户认定他的雇主是哪一家。
 *
 * ⚠️ 空在这里读作「**本站的名录没认出**」,不是「这家雇主未被指定」:
 * `getDesignatedEmployers` 查失败时也落这一格,那是本站的缺口,不是官方的结论。
 */
export const NO_SOURCE = ''

/**
 * 没有出处 —— `Evidence` 的 url 与抓取日两格都用它。
 *
 * 判定的举证标准是「官方原句 + URL + 抓取日」。拿不到出处时留空而**不是整个省掉
 * evidence**:那一行照样要显示(结论本身是算得出来的),只是不给链接 ——
 * 用户看到的是一条**明说没出处**的结论,而不是一条看起来有据的。
 */
export const NO_EVIDENCE = ''

/**
 * 档案里那一格没答。
 *
 * 与 `NO_TEXT` 分开是因为**读法不同**:上游缺那一格叫「本站没收到」,
 * 而这里是「**用户还没答**」—— 判定层据此挂 followups 去点名要这一格(`CARD_SLOT` 的那些槽),
 * 让人补上就能往下判。
 *
 * ⚠️ 判定层永远不把「没答」折成「否」:折了就是替用户编答案,
 * 而这张卡是付费信任的地基(同 `matchDesignation` 那条「不点名法人」的道理)。
 */
export const NO_ANSWER = ''

/**
 * 「人在不在加拿大」这道闸的键。它是通道判定里被单独问及的一格 ——
 * 用它反查该闸问的是不是工签,以决定要不要把工签追问挂出来。
 */
export const GATE_KEY_STATUS_IN_CANADA = 'statusInCanada'
