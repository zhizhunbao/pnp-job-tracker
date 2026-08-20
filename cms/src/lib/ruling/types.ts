/**
 * 判定域的形状 —— 通道结论、雇主判定、三合一卡、案例事实档,以及底表的取数形状。
 *
 * 🔴 **本文件只放类型,一个运行时值都不许有。**
 *
 * 🔵 `Evidence` 与 `Availability` **在本域自己声明**,不从对话域借 ——
 * 判定域比对话域活得久,借过来就是「幸存的依赖将死的」(宪法「新建域 / 替换域」)。
 * 两处的字段今天逐字相同,但它们回答的是不同的问题:那边是「一条事实的出处」,
 * 这边是「一条判定理由的出处」,同形不同源,各自声明才不会被对方的改动牵着走。
 *
 * @author Frank
 * @time 2026-08-20 01:40:00
 */

import type { EduKey, EeGridRow, ScoreFactor } from '../score'
import type { Requirement } from '../rules'
import type { SelfProfile } from '../score'
import type { PathwayStrategy } from '../pathways'
import type { GateKey } from '../gateManifest'

// =========================================================================
// 0. 事实的出处与四态(本域自己的一份)
// =========================================================================

/**
 * 一条判定理由的出处。**没有出处的结论不许见客。**
 */
export type Evidence = {
  /**
   * 官方页面地址。
   */
  url: string


  /**
   * 本站抓取日(**不是「今天」**)—— 用户判断新鲜度靠它。
   */
  fetched: string


  /**
   * 官方原文 / 清单名。
   */
  label?: string


  /**
   * 官方节号。
   */
  section?: string


  /**
   * 官方生效日。
   */
  effective?: string
}

/**
 * 这条信息为什么没有值 —— **四态,一步都不许合并**。
 *
 * `not-published` 和 `not-collected` 在用户那里意思相反:前者是**官方的问题**,
 * 后者是**我们的问题**。合并成「没有数据」= 拿假前提教用户防中介。
 */
export type Availability = 'ok' | 'not-published' | 'not-collected' | 'not-applicable'

// =========================================================================
// 0b. 取数的形状
// =========================================================================

/**
 * 能查的东西。**不收 `Pool`,只收「能 query 的东西」** —— 判定域不认识连接池是谁家的。
 */
export type Queryable = {
  /**
   * 打一条 SQL。
   */
  /**
   * 打一条 SQL。参数是库标量数组 —— 形状与 `Row` 的值域一致。
   */
  query: (sql: string, params?: Cell[]) => Promise<SqlResult>
}

/**
 * 库里一格的值域:文本 / 数字 / 布尔 / 空。
 *
 * 写成这个联合而不是 `unknown`:列的值域本来就是确定的,写 `unknown` 等于把
 * 「取值前先收窄」推给每一个调用点,而那正是 `strOf` / `numOf` 存在的理由。
 */
export type Cell = string | number | boolean | null

/**
 * 库里的一行。键是 snake_case 的列名,值是库标量 —— **不用 `unknown`**:
 * 列的值域是确定的(文本/数字/布尔/空),写 `unknown` 等于把「取值前先收窄」推给每个调用点。
 */
export type Row = Record<string, Cell>


// =========================================================================
// 1. 判定核:档案、理由、通道结论
// =========================================================================

/**
 * 判定要的那份档案。**每一项都可为 null,null = 没答,不是默认值** —— 缺一个槽就判不了那道闸,替他填一个等于替他编答案。
 */
export type VerdictProfile = {
  /**
   * 年龄。CRS 与各省年龄档按它挑行;**不猜**,没答就是 null。
   */
  age: number | null

  /**
   * 配偶是否随行申请(CRS 单身/已婚两套表)
   */
  married: boolean | null

  /**
   * 四项最低(站内口径,同 RuleProfile.clb)
   */
  clb: number | null

  /**
   * 沿用 pnpSelfScore 阶梯
   */
  edu: EduKey | null

  /**
   * 学制年数(2 年制 → PGWP 3 年)
   */
  eduYears: number | null

  /**
   * 有无加拿大学历
   */
  canadaStudy: boolean | null
  /**
   * 在哪个省读的书,两位省码。有的通道只认本省学历。
   */
  studyProvince: string | null
  /**
   * 五位职业码。拿不到就判不了职业相关的闸 —— **绝不猜**。
   */
  noc: string | null
  /**
   * 这个职业的 TEER。分 TEER 的条款靠它挑行;不知道就一条都挑不出来,那是实话。
   */
  teer: number | null

  /**
   * 同职业加拿大受雇经验(自雇不计的口径由通道规则判)
   */
  expCanadaMonths: number | null
  /**
   * 海外同职业经验月数。**与加拿大经验分开存** —— 多数通道只认加拿大的,合并会把海外申请人的路凭空判开。
   */
  expForeignMonths: number | null

  /**
   * 海外经验是否全为自雇(C01:开商店=自雇→多通道记 0)
   */
  foreignExpSelfEmployed: boolean | null

  /**
   * pgwp / study / worker / other
   */
  status: string | null

  /**
   * 现居省(问卷「你现在人在哪个省」;'TERR'=三个领地)
   */
  province: string | null
  // ── 门槛清单三类闸的答案(2026-08-12,设计 §3.2)。null = 没答 → 该闸 unknown → 判不了,
  //    **不许**当成「没有障碍」——那正是「没有行 ⇒ 没有闸 ⇒ open」的同一个病。
  /**
   * 手上有没有 job offer
   */
  hasOffer: boolean | null

  /**
   * 人是否已在加拿大境内(由「你现在的情况」推出)
   */
  inCanada: boolean | null
  /** 加拿大学历的专业与目标职业对不对口(2026-08-15 新题)。null = 没答 → 该闸判不了,
   *  **不许**当成对口 —— NL 国际毕业生官方要求岗位与所学专业相关,猜一个等于替他编答案。 */
  fieldMatch: boolean | null
  /** 法语是否达到 FCIP 要的 NCLC 5 四项(2026-08-15 新题)。**不许**拿 clb 折算 ——
   *  那是英语的尺子,换算过去就是替他编一个法语成绩。null = 没答 → 判不了。 */
  frenchOk: boolean | null
  /** 持的许可(2026-08-15 statusInCanada 拆闸):study=学签 / pgwp / work=其他工签 / none=访客或已过期。
   *  null = 没答 → 工签/PGWP 类闸落「判不了」,不拿 inCanada 冒充有工签(学签在读被 AB 放行的那个病)。 */
  /**
   * 持的是哪种许可。`none` = 访客或已过期;null = 没答,该闸判不了。
   */
  permit: 'study' | 'pgwp' | 'work' | 'none' | null
  /** 用户在分值卡上答过的**条件值**(近 5 年经验 / 6-10 年经验 / 第二语言 CLB…)。
   *  档案只问了总经验、只问了第一语言 —— 拆分与第二语言**不许由档案推**(那是编数);
   *  但用户自己答了就该用。**只收他真答过的项**(调用方按 extraAnswered 过滤)。 */
  /**
   * 打分制要的那半档案(与判定档案字段不同,所以单独一格)。
   */
  scoreProfile?: Partial<SelfProfile>
  /** 用户在分值卡上**直选的官方档位**,键 `省:因素` → 该档 seq(2026-08-16)。
   *  没有它,凡是「必答档位喂不出档案」的省(BC 的工作地区、ON 的年收入…)一律整省不接 ——
   *  可用户明明在页面上答了,只是从没上行过。 */
  /**
   * 用户在打分表上逐项选的档(因素键 → 选中的分)。
   */
  scoreRows?: Record<string, number>

  /**
   * 时薪(加元/小时):BC SIRS 按整元计分(floor-15),满分 55,占 200 分里的大头
   */
  wage?: number | null

  /**
   * BC 工作地区档(0=大温 / 1=Squamish 等 / 2=其余):官方 area 行的下标
   */
  areaI?: number | null
  /** 用户在分值卡上勾中的加分项,键 `省:因素:批`(2026-08-16 Frank「把加分项做成正式答案字段」)。
   *  先前这一侧恒空 ⇒ 带加分项的省估分永远是「全 0 下界」⇒ 恒落「取决于加分项」。
   *  没勾的仍按 0 —— value 因此**仍是下界**,「够得着」照旧是不会翻案的硬结论。 */
  /**
   * 打分表上的勾选项(因素键 → 勾没勾)。
   */
  scoreTicks?: Record<string, boolean>
}

/**
 * 一条判定理由。**`excluded` 必带官方原句** —— 结论可以是我们的,依据必须是官方的。
 */
export type VerdictReason = {
  /**
   * 这条理由是哪一类:被排除 / 差一截 / 已满足 / 判不了。
   * **`needs-info` 与 `excluded` 不许混** —— 前者他一步能补,后者是官方明说不行。
   */
  kind: 'excluded' | 'gap' | 'met' | 'needs-info'

  /**
   * 中文成句。**留着不动**:lib/chat/facts 拿它喂模型(zhOnly),多处测试也钉着这些措辞。
   */
  text: string
  /** 措辞层(2026-08-11):`pv.*` i18n 键 + 参数,显示端 `t(key, params)` 自己拼。
      为什么不直接把 text 翻三份:这些句子是**按数据拼出来的**(门槛几个月、差几档、清单叫什么),
      翻译必须发生在有参数的地方。形态照 `tripleVerdict.ts` 那套现成的,不新发明。
      官方原句 `quote` **永不翻** —— 那是引用,翻了就不是原句。 */
  key?: string

  /**
   * 填进那句三语文案的变量(门槛几个月、差几档、清单叫什么)。
   */
  params?: Record<string, string | number>

  /**
   * 官方原句(excluded 必带)
   */
  quote?: string

  /**
   * 出处。**没有出处的判定不许见客** —— 有 `quote` 就必须有它。
   */
  /**
   * 出处。**没有出处的判定不许见客。**
   */
  evidence?: Evidence
}

/**
 * 一条通道的判定结论。顺序即通道注册表原序,**本层不重排** —— 编个次序出来等于替用户拿主意。
 */
export type PathwayVerdict = {
  /**
   * 'FED-EE' / 'ON-workforce' / 'MB-swm' / 'SK-offer' / 'AIP' / ...
   */
  /**
   * i18n 键。本层不写死任何见客句子。
   */
  key: string

  /**
   * 'FED' 或省码
   */
  province: string

  /**
   * 官方通道名
   */
  stream: string

  /** #308(2026-08-15 深夜改名):原值 'viable' 人人误读成「能走」—— 它只表示「没有判不了的项」,
   *  差一道闸也是它(靠 blockedBy 区分)。改 'viable'(仍需看 blockedBy/tier 才知道差什么) */
  verdict: 'excluded' | 'viable' | 'needs-info'

  /**
   * offer 后等多久:0=Day0 / 1=3-6月 / 2=12月 / 3=24月;excluded=null
   */
  tier: 0 | 1 | 2 | 3 | null

  /**
   * tier 的**起算点**(2026-08-15 #319)。`now` = 从今天起算;`after-study` = 毕业拿到工签之后才开始算。
   * 在读学生(学签)不许全职上班 —— 他的「再攒 12 个月经验」一天都还没开始,写成从今天起算是假话。
   * 引擎判据:处境=在读 且 该通道的 tier 来自**经验/在职**门槛(居住门槛不算:搬过去当天就在计时)。
   * excluded / tier=0 一律 `now`(没有等待期就没有起算点问题)。
   * 消费端契约:随行下发,措辞层自己决定怎么说(「毕业后再 12 个月」vs「12 个月」)。
   */
  tierBasis: 'now' | 'after-study'

  /**
   * 这段等待要的是**全职**经验吗(取自选中门槛行的官方原文,不手写);居住类等待不带此标
   */
  tierFullTime?: boolean
  /** 被**攒时间补不了**的门槛卡住(语言差档 / 自雇经历不计 / 门槛清单里明确不满足的那类闸)。
   *  不是 excluded —— 考一次试、找一份 offer 就能过,但**现在**走不了。先前这类缺口只生成一条理由、
   *  不进 gaps,于是 tier=0 + verdict=open,CLB 4 的厨师也能把联邦 EE 顶到方案第一位
   *  (2026-08-11 Frank 两次实拍点名)。排序与标签都要看它。
   *  2026-08-12 扩:offer / statusInCanada / credentialCanada 三类闸来自 gateManifest。 */
  blockedBy?: 'language' | 'selfEmployed' | GateKey

  /**
   * 判不了时**缺的是哪几个档案槽**(clb / expCanadaMonths / province / noc / 三类闸的键)。
   * 只装「他一步能补的」—— 条文缺(我们的窟窿)走 availability='not-collected',两者不许混
   * (2026-08-12 三值折叠的同一条规矩)。判定卡的结论句「判不了:还缺 X」点名就取这里。
   */
  missingSlots?: string[]
  /**
   * 逐条理由。**每条 excluded 必带官方原句** —— 结论可以是我们的,依据必须是官方的。
   */
  reasons: VerdictReason[]

  /**
   * 这条通道的打分结果(有打分制的省才有)。
   */
  score?: PathwayScore
  /**
   * 这一格的信息状态。**四态不许合并。**
   */
  availability: Availability
}

// =========================================================================
// 1b. mart 行类型(按 data/mart/*.json 的实况字段声明,不多不少)
// =========================================================================

/**
 * data/mart/pnp_occupations.json(630 行)。type: 'ineligible' | 'indemand';appliesTo 空=该省全通道。
 */
export type OccupationRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 官方清单名(如 'SINP Occupations In-Demand / Express Entry')
   */
  stream: string

  /**
   * 本站中文短名(**不是官方原文**,永不进 quote)
   */
  label: string

  /**
   * 所属项目(一个省可能有多个项目各自带清单)。
   */
  program: string

  /**
   * 这一行是收录还是排除:`ineligible` = 明确排除,其余为收录。
   * **收录与排除同时存在是正常的** —— 不同通道各有各的清单。
   */
  type: string

  /**
   * 官方清单页地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * '' | 'OID/EE' | 'Employment Offer'
   */
  appliesTo: string

  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 官方 NOC 职业名
   */
  name: string

  /**
   * 这一条在大多伦多区内是否受限(ON 专有)。
   */
  gtaRestricted: boolean
}

/**
 * data/mart/pnp_draws.json(145 行)。pnpSelfScore.DrawRow 的超集(结构兼容,可直接喂 streamMatches)。
 */
export type VerdictDrawRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 本站给这一轮抽选起的中文短名。**不是官方原文**,永不进引文。
   */
  label: string

  /**
   * 分数用的是哪把尺(各省的打分系统不同名);官方没说就是 null。
   */
  scale: string | null

  /**
   * 官方抽选页地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string

  /**
   * 这一轮的种类(定向 / 全类别 / 专项)。各省叫法不同,原样带出。
   */
  kind: string

  /**
   * 抽选日期,`YYYY-MM-DD`。库里可能带时分秒,取前十位。
   */
  drawDate: string

  /**
   * 这一轮抽的哪条通道。
   */
  stream: string

  /**
   * 分数线。**官方没公布分数的轮次是 null,不折成 0** —— 那会让「没公布」看起来像「0 分就能进」。
   */
  score: number | null

  /**
   * 发了多少份邀请。同上,没公布就是 null。
   */
  invitations: number | null

  /**
   * 官方在这一轮上挂的备注。
   */
  note: string
}

/**
 * data/mart/designated_employers.json(3476 行)。
 * ⚠️ 数据缺口(2026-08-06 实测):mart 行**不带 url / fetched**(raw/pnp/nl-employers.json 里有,
 * 09_build_mart 没带出来)。所以「NL 有 N 家指定雇主申报过该 NOC」这条 supporting fact 目前挂不上 evidence ——
 * 本文件如实不挂,并在句子里点明出处是本站名录;url/fetched 一旦补进 mart,这里自动开始挂(可选字段)。
 */
export type DesignatedEmployerRow = {
  /**
   * 雇主名,官方名录上的原样。匹配前会先规范化(去掉 o/a、d/b/a 这类别名段)。
   */
  name: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 官方名录上写的地点。
   */
  location: string

  /**
   * 是不是科技类通道的名录(有的省把科技单列)。
   */
  isTech: boolean

  /**
   * 这一行来自哪份名录。同一个省可能有多份。
   */
  source: string

  /**
   * 逗号分隔的 NOC 码。
   */
  nocs: string

  /**
   * 官方名录页地址。有的名录只有 PDF,没有稳定地址,所以可选。
   */
  /**
   * 官方页地址。
   */
  url?: string

  /**
   * 本站抓取日。
   */
  fetched?: string
}

/**
 * 判定层的六张底表。一次拉全,判定核不碰库。
 */
export type VerdictData = {
  /**
   * 各省门槛条文。判定按 TEER 与 NOC 前缀挑最具体的那条。
   */
  requirements: Requirement[]

  /**
   * 各省清单收录与排除。
   */
  occupations: OccupationRow[]

  /**
   * 历轮抽选记录。
   */
  draws: VerdictDrawRow[]

  /**
   * 各省打分系统的因素表。
   */
  scoreFactors: ScoreFactor[]

  /**
   * EE 的两套官方分表(CRS 与 FSW67)。
   */
  eeGrid: EeGridRow[]

  /**
   * 指定雇主名录。**这一份是 NL 专用**(判定拿它当「NL 名录里有几家申报过这个 NOC」的分母),
   * 别拿它当全省名录用 —— 扩成四省会把那个分母一起改掉。
   */
  designatedEmployers: DesignatedEmployerRow[]
}

// =========================================================================
// 1c. 杠杆(PathwayVerdict 形状是定稿,不往里塞字段)
// =========================================================================

/**
 * 一根「杠杆」:改一件事能换来什么。**只说查得到的**,不预测。
 */
export type VerdictLever = {
  /**
   * 'teer-downgrade' | 'clb-boost'
   */
  key: string

  /**
   * 中文成句。**留着不动**:多处测试钉着这些措辞。
   */
  text: string

  /**
   * 受影响的通道 key(teer-downgrade:接 TEER 5 岗后判定会掉档的通道)
   */
  affected?: string[]

  /**
   * 查表得出的分数增量(clb-boost)
   */
  gains?: LeverGain[]

  /**
   * 拉这根杠杆的依据。同 `PathwayVerdict.reasons`,官方原句照带。
   */
  reasons?: VerdictReason[]
}


/**
 * data/mart/pnp_occupations.json(630 行)。type: 'ineligible' | 'indemand';appliesTo 空=该省全通道。
 */

/**
 * data/mart/pnp_draws.json(145 行)。pnpSelfScore.DrawRow 的超集(结构兼容,可直接喂 streamMatches)。
 */

/**
 * data/mart/designated_employers.json(3476 行)。
 * ⚠️ 数据缺口(2026-08-06 实测):mart 行**不带 url / fetched**(raw/pnp/nl-employers.json 里有,
 * 09_build_mart 没带出来)。所以「NL 有 N 家指定雇主申报过该 NOC」这条 supporting fact 目前挂不上 evidence ——
 * 本文件如实不挂,并在句子里点明出处是本站名录;url/fetched 一旦补进 mart,这里自动开始挂(可选字段)。
 */



export type PathwaySpec = PathwayStrategy

/**
 * 一道闸的评估中间态:挑了哪几行、最终按哪行判、差多少。
 */
export type GateEval = {
  /**
   * 参与判定的门槛行(可能两行:ON 的 6 月 + 毕业生 3 月)
   */
  rows: Requirement[]

  /**
   * 最终按哪一行判(最具体的那行)
   */
  picked: Requirement | null

  /**
   * 官方要求的月数;挑不到行时是 null。
   */
  need: number | null

  /**
   * 他手上有的月数;没答就是 null。
   */
  have: number | null

  /**
   * null = 判不了
   */
  gap: number | null

  /**
   * 这道闸量的是不是「同雇主连续在职时长」(MB SWM),而不是同职业总经验。
   * **口径不同,句子就不同** —— 拿总经验那套话讲它,句子本身就是假的。
   */
  tenure: boolean

  /**
   * 条件判不了的行(缺槽)
   */
  unknownCond: Requirement[]
  /** 挑不到行的原因是**他没答职业**(库里有按 TEER 分档的行,只是不知道他哪一档)——
   *  这与「库里根本没有这条通道的经验门槛行」是两件事:前者他一步能补,后者是我们的窟窿。
   *  混成一件事,PE 这种只有一条 `applies_teer=0,1,2,3` 的省就会对没答题的人恒报「本站未收录」。 */
  teerUnknown: boolean
}

/**
 * 一份岗对一条通道的粗筛结果(信号,**不是资格认定**)。
 */
export type JobPathwayRow = {
  /**
   * 这条通道的稳定标识。
   */
  key: string

  /**
   * `FED` 或两位省码。
   */
  province: string

  /**
   * 官方通道名。
   */
  stream: string

  /**
   * 经验门槛月数(无条件档里最低的一档;op='none'=0)。null 仅当 availability≠ok
   */
  months: number | null

  /**
   * true = 门槛量的是「同雇主连续在职时长」(MB SWM),不是同职业总经验 —— 口径必须标出
   */
  tenure: boolean

  /**
   * 官方在需/定向清单点名本职业(信号,不是资格认定)
   */
  listedIn: boolean

  /**
   * 清单型硬伤:排除清单命中,或明文要求在清单而本职业不在(PE OID)
   */
  excludedByList: boolean

  /**
   * 这条通道的信息状态。**一条门槛行都没有 = 本站未收录**,不是「官方没有门槛」。
   */
  availability: Availability
}

// =========================================================================
// 2. 雇主侧判定
// =========================================================================

/**
 * 雇主侧的事实(公司行 + 名录命中行)。多数字段查不到是常态。
 */
export type EmployerFacts = {
  /**
   * 成立年份。**多数雇主查不到**(08-10 实测三路皆无源,已结案)—— 查不到就是 null,判定落 unknown。
   */
  foundedYear: number | null

  /**
   * 在册状态:现时仅透传展示,判定不吃它(§1 红线只列年限/雇员数/营业额三项)
   */
  registryStatus: string | null
  /**
   * 雇员数估计。同上,多数查不到 —— **估计值不许当官方数用**,措辞层要说清它是估的。
   */
  staffEst: number | null

  /**
   * 估算来源(懒查 AI / Wikidata),只用于标注证据性质,不进判定
   */
  staffEstSrc: string | null

  /**
   * 'public' = 公共部门,直接整体旁路,不与私企同一套门槛硬判
   */
  sector: string | null
}

/**
 * 这条依据的来源:官方 / 估计 / 查不到。**估计的不许当官方说。**
 */
export type EvidenceKind = 'official' | 'estimate' | 'missing'

/**
 * 单项判定。`unknown` = 判不了,不是不满足。
 */
export type ItemVerdict = 'pass' | 'fail' | 'unknown'

/**
 * 雇主判定量哪一样。
 */
export type EmployerVerdictFactor = 'years' | 'staff'

/**
 * 雇主判定里的一项(成立年数 / 雇员数 / 营业额)。
 */
export type EmployerVerdictItem = {
  /**
   * 这一项量的是雇主的什么:成立年数 / 雇员数 / 营业额。
   */
  factor: EmployerVerdictFactor | 'revenue'
  /**
   * 这一项的判定。`unknown` = 判不了,**不是「不满足」**。
   */
  verdict: ItemVerdict

  /**
   * 官方门槛(来自 pnp_requirements,恒 official,已换算成统一单位)
   */
  need: number | null

  /**
   * 公司侧的值
   */
  have: number | null

  /**
   * verdict='fail' 才有:差多少(need - have)
   */
  short: number | null
  /**
   * 阈值的单位,官方原样。
   */
  unit: string

  /**
   * 公司侧这个值的证据性质;have=null 时恒 'missing'
   */
  evidence: EvidenceKind
}

/**
 * 雇主侧的判定。`unknown` **不是「不满足」**,是我们查不到。
 */
export type EmployerVerdict = {
  /**
   * 整体判定。`public` = 上市公司这类公开信息足够、不必逐项核。
   * `unknown` **不是「不满足」** —— 是我们查不到。
   */
  state: 'met' | 'short' | 'unknown' | 'public'

  /**
   * 参与整体判定的项(年限/雇员数),只含该省真收录了门槛的
   */
  items: EmployerVerdictItem[]

  /**
   * 营业额:恒旁证,不进 state(§1 红线②)
   */
  revenue: EmployerVerdictItem | null

  /**
   * state='short' 时点名哪几项没达标
   */
  failed: EmployerVerdictFactor[]

  /**
   * state='unknown' 时点名判不了的是哪几项(空=该省压根没收录雇主侧门槛)
   */
  missing: EmployerVerdictFactor[]
}

// =========================================================================
// 3. 名录匹配
// =========================================================================

/**
 * 名录匹配的结果:命中几家、是哪一家。
 */
export type DesignationMatch<T> = {
  /**
   * 唯一命中的那一行;**null = 没认出(count=0)或多配(count≥2,不点名法人)**
   */
  row: T | null

  /**
   * 完全匹配的法人数:0 / 1 / N
   */
  count: number

  /**
   * 命中行的名录名(AIP…);count=0 或多配行 source 不一致 → ''
   */
  source: string
}

// =========================================================================
// 4. 三合一判定卡
// =========================================================================

/**
 * 一份 offer 的事实(jobs 行,08_score 口径;调用方按 API 侧现成读法喂进来,本层不查库)
 */
export type TripleJob = {
  /**
   * 岗位在本站的主键。
   */
  id: number

  /**
   * 岗位标题,雇主写的原样。
   */
  title: string

  /**
   * 五位职业码。**未分类的岗是 null** —— 不硬塞一个码,塞错了后面每条判定都在答另一个人的问题。
   */
  noc: string | null

  /**
   * 官方 NOC 职业名(noc_descriptions.title)——「代码不裸奔」,params 里跟着 noc 一起走
   */
  nocName: string | null

  /**
   * 这个职业的 TEER。门槛按它挑行;没分类就是 null。
   */
  teer: number | null

  /**
   * 两位省码。
   */
  province: string

  /**
   * 城市。大渥太华的社区统一归 Ottawa,区另存(见 `lib/location`)。
   */
  city: string

  /**
   * 08_score 口径的粗筛信号(≠ 资格认定)
   */
  pnpEligible: boolean

  /**
   * 命中的本站具名清单短名(pnp_occupations.label,如「NS 紧缺空缺」);'' = 没命中具名清单
   */
  pnpStream: string

  /**
   * 命中的 EE 类别定向抽选(如医疗、技工);没命中是空串。
   */
  eeCategory: string

  /**
   * 08_score 口径:这份岗在大西洋四省且职业不在排除清单。**不代表雇主被指定**(那是 designation)
   */
  aip: boolean

  /**
   * 雇佣期限(长期 / 定期)。官方门槛里有「必须是长期全职」这类条款,判定要读它。
   */
  employmentTerm: string

  /**
   * 工时(全职 / 兼职)。同上。
   */
  employmentHours: string
}

/**
 * 雇主事实(companies 行 + 名录命中行)
 */
export type TripleCompany = {
  /**
   * 公司在本站的主键。
   */
  id: number

  /**
   * 公司名,岗位上写的原样。名录匹配前会先规范化。
   */
  name: string

  /**
   * employerVerdict 的入参形状,原样复用
   */
  facts: EmployerFacts

  /**
   * designated_employers 名录里**唯一**命中的行(口径=designationMatch 的完全匹配,见该文件抬头)。
   * **null = 没认出 或 多配**,两种情形由 designationMatches 区分:
   *   0 → 本站没在名录里认出这家(认不出 ≠ 官方没指定)→ 判定落 unknown,不写「未被指定」
   *   ≥2 → 同名/同链法人多家(连锁加盟:20 家 `… o/a Tim Hortons` 全是合法完全匹配),
   *        「哪一家是你这份岗的雇主」不可证 → 只报家数不点名(tv.emp.designatedMulti)
   */
  designation: DesignatedEmployerRow | null

  /**
   * 名录里完全匹配到的法人数(0 / 1 / N);designation 为 null 时靠它区分「没认出」与「多配」
   */
  designationMatches: number

  /**
   * 多配时仍说得清是哪个名录(AIP…);没认出或多配行 source 不一致 → ''
   */
  designationSource: string

  /**
   * companies.lmia_nocs(#286,近两年窗口的获批职业拆分);null = 该列未回填
   */
  lmiaNocs: Record<string, number> | null
}

/**
 * 档案:pathVerdict 的 VerdictProfile + 判定卡多要的三个槽(时间窗 / 换省对照 / AIP 资金档)
 */
export type TripleProfile = VerdictProfile & {
  /**
   * 当前工签/学签剩余月数(PGWP 倒数);null = 未答
   */
  permitMonthsLeft: number | null

  /**
   * 档案填的目标省(换省对照行);[] = 未答
   */
  targetProvinces: string[]

  /**
   * 随行家庭人数(AIP 资金档 / BC 最低收入表);null = 未答
   */
  familySize: number | null
}

/**
 * 三道闸:职业 / 雇主 / 人。
 */
export type TripleGate = 'occupation' | 'employer' | 'person'

/**
 * design §5:三关事实 free,比路结论+差值+下一步 paid
 */
type TripleTier = 'free' | 'paid'

/**
 * pass=达标 / gap=差某项 / excluded=硬伤 / unknown=判不了(缺槽或库缺行) / info=摆事实不判定
 */
type TripleState = 'pass' | 'gap' | 'excluded' | 'unknown' | 'info'

/**
 * 判定卡上的一行。
 */
export type TripleRow = {
  /**
   * 这一行属于三道闸的哪一道:职业 / 雇主 / 人。
   */
  gate: TripleGate

  /**
   * 免费层还是付费层。免费层给事实与结论,付费层给「怎么办」。
   */
  tier: TripleTier

  /**
   * i18n 键(批D 配三语文案);本层不写死任何 UI 句子
   */
  key: string
  /**
   * 填进三语文案的变量。**只放值,不放句子** —— 句子在 `lib/i18n`。
   */
  params: Record<string, string | number | boolean | string[]>

  /**
   * 这一行的判定态。`info` 是纯陈述(既不是通过也不是卡住)。
   */
  state: TripleState

  /**
   * 英文调试串(金标可读用),**不是** UI 文案
   */
  label: string

  /**
   * 判不了时点名缺哪个档案槽(TripleProfile 的字段名)
   */
  followups?: string[]

  /**
   * 官方原句:只来自数据行,永不手写
   */
  quote?: string
  /**
   * 出处。**没有出处的判定不许见客。**
   */
  evidence?: Evidence
}

/**
 * 比路一行:为什么这条线在比路里 + pathVerdict 给它的裁决
 */
type TripleCompareRole = 'current' | 'aip' | 'target'

/**
 * 通道对照表的一行。
 */
export type TripleCompareRow = {
  /**
   * 这条通道的稳定标识。
   */
  key: string

  /**
   * 两位省码。
   */
  province: string

  /**
   * 通道名。
   */
  stream: string

  /**
   * 这一行在对照表里的身份:他现在这份岗 / AIP 那条 / 目标那条。
   */
  role: TripleCompareRole

  /**
   * 判定结论,原样取自 `pathVerdict`,本层不重判。
   */
  verdict: PathwayVerdict['verdict']

  /**
   * 「offer 到手后还要攒多久」的档位,同上不重算。
   */
  tier: PathwayVerdict['tier']

  /**
   * 这条通道的信息状态。四态不许合并。
   */
  availability: Availability

  /**
   * pathVerdict 返回序里的名次(排序语义原样复用,本层不重排)
   */
  rank: number

  /**
   * tier 最小的可判通道(并列时多条同时为 true —— 并列就说并列,不替用户挑)
   */
  fastest: boolean
}

/**
 * 一句可复述的结论(设计 PR评估页三步重设计-20260812.md §2「跨步规矩 B3」)。
 *
 * 🔴 **由确定性层拼,不新增判定、不让 LLM 合成**(工具层红线)。原料只有两样,都是这张卡已经算出来的:
 *    ① 职业关的官方排除清单命中(硬伤);② `pathVerdict` 对**这份岗所在省**那几条通道的裁决。
 *    「差哪一项」的次序共用 pathVerdict 的 `blockCost`(offer 最好拆 → … → 加拿大学历最难),
 *    不另立一把尺子 —— 裁决、排序、结论句三处同源。
 * 🔴 免费/付费口径**没有变**:这几条通道的裁决在同一页的「你的初步方案」上本来就是免费的,
 *    这里只是把「这份岗所在省那条」摘出来说成一句人话。逐项差值(差几分/差几个月)仍在付费位。
 */
type TripleConclusionKind = 'ok' | 'blocked' | 'needs-info' | 'excluded' | 'not-collected'

/**
 * 一句可复述的结论。
 */
export type TripleConclusion = {
  /**
   * 结论的种类。`not-collected` 是**我们的缺口**,不是「走不通」。
   */
  kind: TripleConclusionKind

  /**
   * i18n 键。本层不写死任何见客句子。
   */
  key: string

  /**
   * 填进三语文案的变量。
   */
  params: Record<string, string | number | boolean | string[]>

  /**
   * 结论锚在哪条通道(能走的那条 / 被卡住的那条);not-collected 时为空
   */
  pathway?: string

  /**
   * blocked 时:最难拆的那道闸(offer / statusInCanada / credentialCanada / language / selfEmployed)
   */
  gate?: string

  /**
   * 英文调试串,**不是** UI 文案
   */
  label: string
}

/**
 * 一整张三合一判定卡。
 */
export type TripleCard = {
  /**
   * 这张卡是给哪份岗算的。
   */
  jobId: number

  /**
   * 一句可复述的结论(见 TripleConclusion)
   */
  conclusion: TripleConclusion

  /**
   * 五位职业码;未分类的岗是 null。
   */
  noc: string | null

  /**
   * 官方职业名 —— **代码不裸奔**,码走到哪儿人话跟到哪儿。
   */
  nocName: string | null

  /**
   * 这个职业的 TEER。
   */
  teer: number | null

  /**
   * 两位省码。
   */
  province: string

  /**
   * 三道闸逐行的判定。顺序即呈现序,本层定死,前端不重排。
   */
  rows: TripleRow[]

  /**
   * 通道对照表(他现在这条 / AIP / 目标)。
   */
  compare: TripleCompareRow[]

  /**
   * 原件输出照带,批D 要渲染细项(reasons / items)时不必二次查库
   */
  employer: EmployerVerdict

  /**
   * 各通道的判定原件。同上照带,免得渲染细项时二次查库。
   */
  pathways: PathwayVerdict[]

  /**
   * 全卡去重后的缺槽点名
   */
  followups: string[]

  /**
   * 整张卡的信息状态。**四态不许合并** —— `not-collected` 是我们的缺口,不是「走不通」。
   */
  availability: Availability
}

/**
 * 一条通道**本站收录的门槛行**覆盖了哪几档 TEER(按 pnp_requirements.appliesTeer 聚合)。
 * 🔴 这是**收录范围的下界**,不是官方受理范围的全集 —— 所以它只有一个用途:
 *    否掉粗筛的对错符号(「我们有行的那条通道并不收这一档」),**永不**拿来下「你不行」的结论。
 *    (开放世界的表做封闭世界推理,正是 2026-08-12 判定口径根治要根治的那个病。)
 */
export type TeerScope = {
  /**
   * 官方通道名。
   */
  stream: string

  /**
   * 这条通道认哪几档 TEER。
   */
  teers: number[]

  /**
   * 得出这个档位的那一行门槛条文 —— 出处跟着走,不另起。
   */
  row: Requirement
}

/**
 * 该省的**具名(定向)清单**:一张清单一条,带它绑的官方通道名与清单里的职业数。
 */
export type NamedList = {
  /**
   * 本站中文短名。**不是官方原文**,永不进引文。
   */
  label: string

  /**
   * 官方清单名。
   */
  stream: string

  /**
   * 这份清单上有多少个职业。
   */
  count: number

  /**
   * 官方清单页地址。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string
}

// =========================================================================
// 5. 三合一接线
// =========================================================================

/**
 * 下行行:免费行给全,付费行对非 Pro 只留 gate/tier/key
 */
type TripleWireRow = {
  /**
   * 这一行属于三道闸的哪一道。接线层发出去时已经是字符串。
   */
  gate: string
  /**
   * 免费层还是付费层。
   */
  tier: string
  /**
   * i18n 键。本层不写死任何见客句子。
   */
  key: string
  /**
   * 这一行对当前用户锁着(付费层给未订阅的人)。**锁着也要让他看见有这一行** ——
   * 藏起来他就不知道自己少了什么。
   */
  locked?: true
  /**
   * 判定态。锁着的行不下发它。
   */
  state?: string
  /**
   * 填进三语文案的变量。
   */
  params?: Record<string, string | number | boolean | string[]>
  /**
   * 官方原句。**只来自数据行,永不手写。**
   */
  quote?: string
  /**
   * 出处。发给前端时只留这三格 —— 节号与生效日前端用不上。
   */
  evidence?: TripleWireEvidence
  /**
   * 判不了时点名缺哪几个档案槽。只装「他一步能补的」。
   */
  followups?: string[]
}

/**
 * 发给前端的整张卡。
 */
export type TripleWire = {
  /**
   * 恒为 true。写成字面量类型,好让调用方靠它和错误体做联合窄化。
   */
  ok: true

  /**
   * 这张卡是给哪份岗算的。
   */
  jobId: number

  /**
   * 五位职业码;未分类的岗是 null。
   */
  noc: string | null

  /**
   * 官方职业名(英文)。
   */
  nocName: string | null

  /**
   * NOC 职业名的中译(`noc_descriptions.title_zh`)。
   *
   * #326:zh 界面「职位名」瓦片的主文案用它,帖面英文原名降成灰注 ——
   * 帖面标题没有逐帖译文,而职业官方名是库里现成的三语,能用人话就别让代码裸奔。
   */
  nocTitleZh: string | null

  /**
   * 同上的韩译。
   */
  nocTitleKo: string | null

  /**
   * 这个职业的 TEER。
   */
  teer: number | null

  /**
   * 两位省码。
   */
  province: string

  /**
   * 一句可复述的结论,原样取自判定卡。
   */
  conclusion: TripleCard['conclusion']

  /**
   * 整张卡的信息状态。接线层发出去时已经是字符串。
   */
  availability: string

  /**
   * 这次请求登没登录。**匿名一个字都不存**,但要据此决定给不给建档入口。
   */
  loggedIn: boolean

  /**
   * 是不是 Pro。付费层的行只对它开。
   */
  pro: boolean

  /**
   * 档案填没填过。没填时判定多半落 needs-info,前端据此引导去答题。
   */
  hasProfile: boolean

  /**
   * 逐行的判定,已经按登录态与付费态裁过。
   */
  rows: TripleWireRow[]
}

// 引擎答案(toEngineAnswers 的形状)。匿名用户没有服务端档案,把本地答案带上来即可 ——
// **付费闸与它无关**:锁不锁看的是登录用户是不是 Pro,答案只决定「判得出来还是判不了」。
/**
 * 前端回传的答案。**不可信**,进判定前一律收窄。
 */
export type ClientAnswers = Record<string, Cell | Cell[]> | null

// =========================================================================
// 6. 案例事实档
// =========================================================================

/**
 * 一个案例的事实档。
 */
export type CaseAnswer = {
  /**
   * 他点名问的那条通道(中介推的那个省)—— 摆在最前面
   */
  asked: PathwayVerdict | null

  /**
   * 其余通道按「offer 到手后还需积累多久」分档,由易到难
   */
  tiers: CaseTier[]

  /**
   * 现在走不通的(判定核给 excluded,必带官方原句)
   */
  excluded: PathwayVerdict[]

  /**
   * 第一步:这个职业「提供带训 / 不要经验」的在招岗按省分布
   */
  trainable: TrainableRow[]
  /**
   * 全部省加起来多少个。**0 也要给出来** —— 「一个都没有」本身就是答案。
   */
  trainableTotal: number
  /** 各省该职业的在招岗数(n=全部,t=其中标了带训)。2026-08-11 Frank:
      「每个省的推荐不单要看时长条件,还有竞争程度和工作机会」——
      **工作机会先落地**:这个数全国同一口径、来自本站自己的库、天天更新,同档内拿它排序。
      竞争程度暂不进排序:各省公布口径不同(AB 给池子+名额、BC 只给分数段、SK/MB/ON 只给名额),
      硬凑一个跨省可比的「几人抢一个」= 编数(见 STATUS 记账②,池子公不公布还没查证)。 */
  openings: Record<string, OpeningCount>
  /** 每个省官方公布的运营数字(名额/提名/拒签/池子)—— 只按时长排序会假设各省一样挤,
      而这几个数正是「挤不挤」。各省公布的口径不同,**不硬凑成一个统一比值**,谁公布什么就摆什么。 */
  ops: Record<string, OpsFacts>
}

/**
 * 官方运营数据(池子、名额、年初至今)。**官方不公布的一律留空,不猜。**
 */
export type OpsFacts = {
  /**
   * 本年名额
   */
  allocation?: number

  /**
   * 已提名(年内至今)
   */
  nominated?: number

  /**
   * 已拒签(年内至今)
   */
  refused?: number

  /**
   * 已发邀请
   */
  invited?: number

  /**
   * 已收到申请
   */
  received?: number

  /**
   * 池子里有多少人(AB 实时 / BC 分数段 / MB 年报年度快照)
   */
  poolTotal?: number
  /** 池子那个数的期次。**AB 是实时的、MB 是年报里的年末快照**——不标期次就会被读成一样新鲜,
      而两者差着一年。有期次就用带期次的那句文案(2026-08-11 接 MB 年报 §10 时补)。 */
  poolPeriod?: string
  /** 期间**按指标各记各的**:名额是全年(2026),提名/拒签是年内至今(2026 Jan-Jun)——
      共用一个 period 会把上半年的数标成全年的(2026-08-11 实撞) */
  allocPeriod?: string
  /**
   * 年初至今那个数的统计期,官方原样。
   */
  ytdPeriod?: string
  /**
   * 官方页地址。
   */
  url?: string
}

/**
 * 能打 SQL 的东西。判定域不认识连接池是谁家的。
 */
export type Sql = (q: string, v?: Cell[]) => Promise<SqlResult>

/**
 * 一次查询的回包。只声明我们真读的那一格。
 */
export type SqlResult = {
  /**
   * 行。列名是 snake_case,值都可空。
   */
  rows: Row[]
}

// =========================================================================
// 7. 案例清单
// =========================================================================

/**
 * 案例清单里的一条。
 */
export type CaseEntry = {
  /**
   * 案例的稳定标识,进 URL。
   */
  id: string
  /** 处境页 slug —— 只有做了事实层的才填。**这里是 slug 的唯一来源**:
      服务端 `caseFacts.CASE_PAGES` 按它建白名单,决策页按它决定给不给「完整案例」钮。
      填了但事实层没跟上 = 死链,所以两边共用这一个字段,不各写一份。 */
  /**
   * 这个案例有没有独立页;没有就只在清单里露一行。
   */
  page?: string
}

// =========================================================================
// 8. 上面几处从内联拆出来的形状(内联对象挂不上注释,拆出来才说得清)
// =========================================================================

/**
 * 案例事实档里的一档:同一个「offer 后还要攒多久」的通道归一堆。
 */
export type CaseTier = {
  /**
   * 档位:0=Day0 / 1=3-6 月 / 2=12 月 / 3=24 月。
   */
  tier: 0 | 1 | 2 | 3

  /**
   * 这一档里的通道,顺序即判定核的返回序,本层不重排。
   */
  rows: PathwayVerdict[]
}

/**
 * 「提供带训 / 不要经验」的在招岗按省一行。
 */
export type TrainableRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 这个省有多少个。**0 也要给出来** —— 「这个省一个都没有」本身就是答案。
   */
  n: number
}

/**
 * 一个省的在招计数。
 */
export type OpeningCount = {
  /**
   * 在招总数。
   */
  n: number

  /**
   * 其中「提供带训 / 不要经验」的那部分。
   */
  t: number
}

/**
 * 拉一根杠杆能换来的分数增量(clb-boost 那类)。
 */
export type LeverGain = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 哪一套打分制 —— 各省的尺不同,拿别人的尺量就是错的。
   */
  system: string

  /**
   * 现在这一档的分。
   */
  from: number

  /**
   * 拉完杠杆那一档的分。
   */
  to: number

  /**
   * 差额。**查表得出,不是算出来的** —— 官方分表里两档相减。
   */
  delta: number

  /**
   * 出处:分表那一页。
   */
  evidence: Evidence
}

/**
 * 一条通道的打分结果(有打分制的省才有)。
 */
export type PathwayScore = {
  /**
   * 哪一套打分制 —— 各省的尺不同,名字要跟着分走。
   */
  system: string

  /**
   * 按他的档案查表得出的分。
   */
  value: number

  /**
   * 这套制度的满分;官方没说就是 null。
   */
  ceiling: number | null

  /**
   * 拿来对照的那条线(最近一轮抽选的分数线);没有可对照的轮次就是 null。
   */
  refLine: number | null

  /**
   * 那条线是哪一轮 —— **不报「你差几分」而报「和哪一轮比」**,因为下一轮的线不可预测。
   */
  refLabel: string

  /**
   * 出处:那一轮的抽选页。
   */
  evidence: Evidence

  /**
   * 对照的那一轮属于哪条通道(BC 按通道分别设线;拿别的通道的线比就是错的对照)。
   * 没有可对照的轮次就是 null。
   */
  refStream?: string | null
}

/**
 * 发给前端的那份出处。**比内部的 `Evidence` 少两格** —— 节号与生效日前端用不上,
 * 少发一格就少一格被误用的机会。
 */
export type TripleWireEvidence = {
  /**
   * 官方页地址。
   */
  url?: string

  /**
   * 本站抓取日。
   */
  fetched?: string

  /**
   * 官方原文 / 清单名。
   */
  label?: string
}

// =========================================================================
// 9. 取数层各函数的入参与返回
// =========================================================================

/**
 * `numOf` 的入参:库里那一格。
 */
export type NumOfIn = Cell

/**
 * `numOf` 的返回:数字,或者 null(**不折成 0** —— 官方的 n/a 与「0 分」是两回事)。
 */
export type NumOfOut = number | null

/**
 * `strOf` 的入参:库里那一格。
 */
export type StrOfIn = Cell

/**
 * `strOf` 的返回:字符串,空回空串。
 */
export type StrOfOut = string

/**
 * `rowsOf` 的入参。
 */
export type RowsOfIn = {
  /**
   * 能查的东西。
   */
  db: Queryable

  /**
   * 要打的那条 SQL,文本来自 `lib/db/sql`。
   */
  sql: string
}

/**
 * `rowsOf` 的返回:行;查不动是空数组。
 */
export type RowsOfOut = Promise<Row[]>

/**
 * `swallow` 的返回:恒为 null。
 */
export type SwallowOut = null

/**
 * 各个 `toXxx` 映射函数的入参:库里的一行。
 */
export type ToRowIn = Row

/**
 * `toRequirement` 的返回。
 */
export type ToRequirementOut = Requirement

/**
 * `toOccupation` 的返回。
 */
export type ToOccupationOut = OccupationRow

/**
 * `toDraw` 的返回。
 */
export type ToDrawOut = VerdictDrawRow

/**
 * `toScoreFactor` 的返回。
 */
export type ToScoreFactorOut = ScoreFactor

/**
 * `toEeGrid` 的返回。
 */
export type ToEeGridOut = EeGridRow

/**
 * `toDesignated` 的返回。
 */
export type ToDesignatedOut = DesignatedEmployerRow

/**
 * `loadVerdictTables` 的入参:能查的东西。
 */
export type LoadVerdictTablesIn = Queryable

/**
 * `loadVerdictTables` 的返回:判定层六张底表。
 */
export type LoadVerdictTablesOut = Promise<VerdictData>

// =========================================================================
// 10. 名录匹配
// =========================================================================

/**
 * `normalizeEmployerName` 的入参:待归一的名字。
 */
export type NormalizeEmployerNameIn = string

/**
 * `normalizeEmployerName` 的返回:归一后的名字。
 */
export type NormalizeEmployerNameOut = string

/**
 * `employerNameSegments` 的入参:名录上那个名字。
 */
export type EmployerNameSegmentsIn = string

/**
 * `employerNameSegments` 的返回:可比的名段。
 */
export type EmployerNameSegmentsOut = string[]

/**
 * 名录里可比的一行。**只要这两格** —— 判定不关心名录行还有什么。
 */
export type NameRow = {
  /**
   * 名录上的名字,可能是「法定全称 o/a 营业名」。
   */
  name: string

  /**
   * 这一行来自哪份名录。
   */
  source?: string
}

/**
 * `matchDesignation` 的入参。
 */
export type MatchDesignationIn = {
  /**
   * 岗位上挂的公司名。
   */
  companyName: string

  /**
   * **已按省筛过**的名录行 —— 跨省同名是两家公司,本层不管省。
   */
  rows: readonly NameRow[]
}

/**
 * `matchDesignation` 的返回。
 */
export type MatchDesignationOut = {
  /**
   * 唯一命中的那一行。**null = 没认出(count=0)或多配(count≥2,不点名法人)。**
   */
  row: NameRow | null

  /**
   * 完全匹配的法人数:0 / 1 / N。
   */
  count: number

  /**
   * 命中行的名录名;count=0 或多配行 source 不一致 → 空串。
   */
  source: string
}

// =========================================================================
// 11. 雇主侧判定的入参与返回
// =========================================================================

/**
 * `employerVerdict` 的入参。
 */
export type EmployerVerdictIn = {
  /**
   * 公司事实。
   */
  facts: EmployerFacts

  /**
   * 两位省码。
   */
  province: string

  /**
   * 门槛行。**未按省筛**,函数内部自己筛。
   */
  reqs: Requirement[]

  /**
   * 当前年份。单测拿它锁「N 年前成立」这类相对时间的用例。
   */
  nowYear: number
}

/**
 * `employerVerdict` 的返回。
 */
export type EmployerVerdictOut = EmployerVerdict

/**
 * `empRowsOf` 的入参。
 */
export type EmpRowsOfIn = {
  /**
   * 全部门槛行。
   */
  reqs: Requirement[]

  /**
   * 两位省码。
   */
  province: string

  /**
   * 要哪一个因素。
   */
  factor: string
}

/**
 * `empRowsOf` 的返回:该省该因素的雇主侧门槛行。
 */
export type EmpRowsOfOut = Requirement[]

/**
 * `pushItem` 的入参。
 */
export type PushItemIn = {
  /**
   * 攒结果的那三个数组。
   */
  acc: EmpAcc

  /**
   * 哪一个因素。
   */
  factor: EmployerVerdictFactor

  /**
   * 官方门槛;挑不到行就是 null。
   */
  need: number | null

  /**
   * 公司侧的值;查不到就是 null。
   */
  have: number | null

  /**
   * 单位。
   */
  unit: string

  /**
   * 公司侧这个值的证据性质。
   */
  evidence: EvidenceKind
}

/**
 * `pushItem` 没有返回值 —— 它往收集器里写。
 */
export type PushItemOut = void

/**
 * 判定过程里的收集器。**只在一次调用内活着**,不是共享状态。
 */
export type EmpAcc = {
  /**
   * 参与整体判定的项。
   */
  items: EmployerVerdictItem[]

  /**
   * 没达标的因素。
   */
  failed: EmployerVerdictFactor[]

  /**
   * 判不了的因素。
   */
  missing: EmployerVerdictFactor[]
}

/**
 * `universalValue` 的入参:同一因素的门槛行。
 */
export type UniversalValueIn = Requirement[]

/**
 * `universalValue` 的返回:通用档的阈值;分档省份没有这一档就是 null。
 */
export type UniversalValueOut = number | null

/**
 * `blockCost` 的入参:闸的名字;没有闸就是 undefined。
 */
export type BlockCostIn = string | undefined

/**
 * `blockCost` 的返回:这道闸有多难拆。
 */
export type BlockCostOut = number
