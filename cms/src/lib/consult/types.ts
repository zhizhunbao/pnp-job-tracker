/**
 * 对话域的形状。
 *
 * 🔴 **本文件只放类型,一个运行时值都不许有** —— 它被本域每个文件共用,
 * 一旦出现常量就会把初始化顺序拖进赌局(旧链实撞过两次:`PNP_PROVINCES` 初始化时是 undefined)。
 *
 * @author Frank
 * @time 2026-08-19 22:40:12
 */

import type { AgentMessage, AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core'
import type { Model, Static, TSchema } from '@earendil-works/pi-ai'
import type { Requirement, RuleResult } from '../gauge'
import type { Db } from '../db'
import type { Lang } from '../i18n'
import type { PathwayVerdict, VerdictProfile } from '../ruling'
import type { CLAIMS_PARAMS, CRS_PARAMS, NOC_PARAMS, NOC_PROVS_PARAMS, PERMIT_PARAMS, PROV_PARAMS, SEARCH_PARAMS, VERDICT_PARAMS } from './schemas'

// =========================================================================
// 1. 事实(工具产出的唯一形态)
// =========================================================================

/**
 * 一条事实的出处。**没有出处的数字不许见客** —— 这是这个产品和普通聊天机器人的分界。
 */
export type Evidence = {
  /**
   * 官方页面地址。算出来的派生值没有自己的出处,留空而不是借一个。
   */
  url: string

  /**
   * 我们抓到它的日期。用户判断新鲜度靠它。
   */
  fetched: string
}

/**
 * 这条信息为什么没有值 —— **四态,一步都不许合并**。
 *
 * `not-published` 和 `not-collected` 在用户那里意思相反:前者是**官方的问题**
 * (他该警惕任何敢承诺的人),后者是**我们的问题**(他该去官网看)。
 * 合并成「没有数据」= 拿假前提教用户防中介。
 */
export type Availability = 'ok' | 'not-published' | 'not-collected' | 'not-applicable'

/**
 * 一条事实。工具产出它,出口闸拿它回读比对,前端拿它出出处。
 */
export type Fact = {
  /**
   * 哪把工具产的。日志与前端分组按它。
   */
  tool: string

  /**
   * 这条讲的是什么。**给模型看的英文**,不是见客文案 —— 见客那句由模型按用户语种写。
   */
  label: string

  /**
   * 数值。出口闸的数字回读只认它;没有数值的事实(四态行)是 null。
   */
  value: number | null

  /**
   * 数值的展示形态,含单位与千分位。模型抄的是它。
   */
  valueText: string

  /**
   * 单位。`claim` 与 `status` 是两个特殊值:前者是主张行,后者是四态行。
   */
  unit: string

  /**
   * 官方原文。**这一句可以见客**(它是引文,不是我们的话);`label` 是给模型看的内部说明,永不见客。
   *
   * 🔴 降级成事实清单时**只许用它,不许用 label** —— 2026-08-04 的事故就是兜底把英文内部标签
   * 原样吐给了用户。降级分支是所有红线的后门,它必须自带一条见客口径。
   */
  quote: string

  /**
   * 出处。
   */
  evidence: Evidence

  /**
   * 没有值时,四态里的哪一种;有值时 null。
   */
  availability: Availability | null

  /**
   * 答复真的用到了这条吗(citeFacts 回读打的标);还没回读时 null。前端出处区只列 true 的。
   */
  cited: boolean | null
}

// =========================================================================
// 2. 取数的返回
// =========================================================================

/**
 * 一个省的在招岗位数。
 */
export type JobsRow = {
  /**
   * 两位省码。
   */
  prov: string

  /**
   * 在招总数。**0 也要给出来** —— 「这个省一个都没有」本身就是答案。
   */
  open: number

  /**
   * 其中挂着省提名通道标记的。
   */
  named: number
}

/**
 * 在招岗位的查询结果。
 */
export type JobsResult = {
  /**
   * 查的哪个职业码。
   */
  noc: string

  /**
   * 职业名(英文)。
   */
  title: string

  /**
   * 这个职业的 TEER。门槛与裁决按它挑行。
   */
  teer: number | null

  /**
   * 各省一行,按在招数从多到少。
   */
  rows: JobsRow[]
}

/**
 * 一个省的清单收录情况。
 */
export type CoverageRow = {
  /**
   * 两位省码。
   */
  prov: string

  /**
   * 收录它的通道名,可能不止一条。
   */
  streams: string[]

  /**
   * 被明确排除的通道名。收录与排除**同时存在是正常的**(不同通道各有各的清单)。
   */
  excluded: string[]

  /**
   * 这个省的信息状态。
   */
  availability: Availability

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 清单收录的查询结果。
 */
export type CoverageResult = {
  /**
   * 查的哪个职业码。
   */
  noc: string

  /**
   * 各省一行。**没收录的省也要在**,否则模型只看得见好消息。
   */
  rows: CoverageRow[]
}

/**
 * 一轮抽选。省级 EOI 与联邦 Express Entry 共这一个形状,分制不同靠 `scale` 说话。
 */
export type DrawRow = {
  /**
   * 两位省码;联邦轮次是 `FED`。
   */
  prov: string

  /**
   * 抽选日期,`YYYY-MM-DD`。
   */
  date: string

  /**
   * 官方轮次名(CEC / French / 省级通道名)。
   */
  stream: string

  /**
   * 分制名。**FED 是 CRS,各省的 SIRS/EOI 与它互不相通** —— 摆分数必须带上它。
   */
  scale: string

  /**
   * 这一轮的分数线。官方没公布分数的轮次是 null,不许折成 0。
   */
  score: number | null

  /**
   * 邀请人数。官方没公布时是 null。
   */
  invitations: number | null

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 抽选记录的查询结果。
 */
export type DrawsResult = {
  /**
   * 查的哪个省;联邦是 `FED`。
   */
  prov: string

  /**
   * 近几轮,按日期从新到旧,已截到 `DRAW_LIMIT`。空数组 = 本站没收录这个省的抽选。
   */
  rows: DrawRow[]
}

/**
 * 一条官方运营统计(处理时长 / 配额 / 池内人数……)。
 */
export type OpsRow = {
  /**
   * 指标名(ETL 词表:processing_weeks / allocation / sirs_pool …)。内部码,不见客。
   */
  key: string

  /**
   * 适用范围(通道名 / 行业 / 分数段;省级为空串)。
   */
  scope: string

  /**
   * 官方原文。
   */
  label: string

  /**
   * 数值。**官方的隐私抑制值(「Less than 10」)与纯文本游标恒 null,不许折成 0** ——
   * 折成 0 就是替官方编了个数字。
   */
  value: number | null

  /**
   * value 为 null 时的官方原文;有值时是它的展示形态。
   */
  valueText: string

  /**
   * 官方发布的单位,**不换算**(SK 发周、BC 发月、MB 发天)。
   */
  unit: string

  /**
   * 官方口径日;没有就空串。
   */
  asOf: string

  /**
   * 统计期(如 `2026Q2`);没有就空串。
   */
  period: string

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 运营统计的查询结果。
 */
export type OpsResult = {
  /**
   * 查的哪个省。
   */
  prov: string

  /**
   * 库里有出处的每一行。空数组 = 本站未收录,**不是「官方不公布」**。
   */
  rows: OpsRow[]
}

/**
 * 一条 EE 类别命中:这个职业在哪个类别抽选清单里,该类别最近一轮长什么样。
 */
export type EeRow = {
  /**
   * 类别键(ETL 归好的:health / trade / french …)。
   */
  category: string

  /**
   * 类别的官方名。
   */
  label: string

  /**
   * 该类别最近一次类别抽选的最低 CRS;本站无该类别抽选记录时 null。
   */
  drawCrs: number | null

  /**
   * 那一轮的日期;没有就空串。
   */
  drawDate: string

  /**
   * 那一轮邀请了多少人;没有就 null。
   */
  drawSize: number | null

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * EE 类别的查询结果。
 */
export type EeResult = {
  /**
   * 查的哪个职业码。
   */
  noc: string

  /**
   * 命中的类别。**空数组 = 查过全表、不在任何类别里** —— 这是结论不是缺数,
   * 事实层要把这句话摆出来,不许让「没有行」被读成「没查到」。
   */
  rows: EeRow[]
}

/**
 * 一条联邦项目规则(PGWP 时长分档 / CEC 经验要求……)。
 */
export type PermitRow = {
  /**
   * 项目名(PGWP / CEC / FSW / FST)。
   */
  program: string

  /**
   * 官方分档(masters / short / long …);空串 = 不分档的通则。
   */
  stream: string

  /**
   * 因素名(pgwpLength / pgwpCombine …)。内部码,不见客。
   */
  factor: string

  /**
   * 比较符;`rule` = 这是条规则不是道门槛,别拿 value 去比大小。
   */
  op: string

  /**
   * 阈值。`rule` 行与「跟课程一样长」这类没有绝对数的行恒 null,**不许 `?? 0`**。
   */
  value: number | null

  /**
   * 官方原句(quote-anchored,ETL 每轮验证它仍在页面上)。引用一律用这句。
   */
  valueText: string

  /**
   * 单位(months / days / CLB …)。
   */
  unit: string

  /**
   * 口径速记。说这一行之前先看它 —— 口径不同,话就是假的。
   */
  basis: string

  /**
   * 这条规则管什么(官方页面上的条目名)。
   */
  label: string

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 联邦规则的查询结果。
 */
export type PermitResult = {
  /**
   * 查的哪个项目。
   */
  program: string

  /**
   * 库里有出处的每一行。空数组 = 本站未收录这个项目的条款。
   */
  rows: PermitRow[]
}

/**
 * 官方计分表的一行(一档几分)。
 */
export type PointsRow = {
  /**
   * 哪套分(CRS / FSW67)。**两套官方定义的分,不许混、不许相加。**
   */
  grid: string

  /**
   * 节号。
   */
  section: string

  /**
   * 节名(官方原文)。
   */
  sectionLabel: string

  /**
   * summary(小结行)还是 detail(逐档行)。
   */
  kind: string

  /**
   * 表头(官方原文)。
   */
  heading: string

  /**
   * 因素名。
   */
  factor: string

  /**
   * 档位描述(官方原文,如年龄段)。
   */
  criterion: string

  /**
   * 列名(单身/已婚两列这类)。
   */
  columnLabel: string

  /**
   * 这一档的分。官方写 n/a / Not eligible 时恒 null,原文在 pointsText,**不许折成 0**。
   */
  points: number | null

  /**
   * points 为 null 时的官方原文;有值时是它的展示形态。
   */
  pointsText: string

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * 计分表的查询结果。
 */
export type PointsResult = {
  /**
   * 哪套分。
   */
  grid: string

  /**
   * 取回的档位行。空数组 = 这组筛选下本站没有行。
   */
  rows: PointsRow[]
}

// =========================================================================
// 3. 工具循环
// =========================================================================

/**
 * 库里真有在招岗位的一个职业候选。
 */
export type Candidate = {
  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  title: string
}

/**
 * 🔵 **收件箱** —— 本域唯一特批的共享可变状态。
 *
 * 理由:pi 的工具 `execute` 是**库调我们**,返回值只回给库,我们自己要的东西没有别的路带出来。
 * 同 `lib/agent/types.ts` 的 `Inbox`,那儿写了同一条特批。
 */
export type Inbox = {
  /**
   * 这一趟攒下的全部事实。
   */
  facts: Fact[]

  /**
   * 检索真返回过的候选。采信拿它当白名单:不在里面的码一律不认。
   */
  candidates: Candidate[]

  /**
   * 已经采信的职业码。
   */
  noc: string | null

  /**
   * 已经采信的职业名。
   */
  title: string

  /**
   * 这个职业的 TEER。
   */
  teer: number | null
}

/**
 * pi 认的工具回执。`details` 是给我们自己读的,不进模型上下文。
 */
export type Reply = AgentToolResult<ReplyDetails>

/**
 * 工具回执里给我们自己读的那部分。**不进模型上下文** —— 它只用来记账与调试。
 */
export type ReplyDetails = {
  /**
   * 这一把工具真的攒进收件箱几条事实。0 = 查到了但一条都没有,或者被 `MAX_FACTS` 挡住了。
   */
  n: number
}

/**
 * 本域的一把工具:参数 schema 各不相同,回执形状统一。
 *
 * 每把工具**各带自己的 schema 泛型**,这样工具表数组本身就合法,不必拿断言去顶。
 */
export type Tool<P extends TSchema> = AgentTool<P, ReplyDetails>

/**
 * 跑一趟循环要的东西。
 */
export type RunIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 用户这一句。
   */
  text: string

  /**
   * 回复语种。
   */
  lang: Lang

  /**
   * 用户自己说过的档案。**只用来「别重复问」,不当数据用。**
   */
  profile: Profile

  /**
   * 前面几轮。
   */
  history: Turn[]

  /**
   * 工具轨迹回调;不要就显式给 null(禁 `?`:缺席也要写出来)。
   */
  onStep: ((text: string) => void) | null

  /**
   * 正文增量回调;null = 整段落地才给。
   */
  onDelta: ((chunk: string) => void) | null
}

/**
 * 一轮对话。
 */
export type Turn = {
  /**
   * 谁说的。
   */
  role: 'user' | 'assistant'

  /**
   * 说了什么。
   */
  content: string
}

/**
 * 用户自己说过的档案。**每格必填、可空显式 null**(2026-08-21 Frank 禁 `?`):
 * 「不知道」也要逐格写 null —— 缺一个 ≠ 有一个默认值(「按单身算」会直接换一张 CRS 分表),
 * 现在连「忘了写」这条路也焊死了。一无所知的档案用 `EMPTY_PROFILE`。
 */
export type Profile = {
  /**
   * 五位职业码;没说就 null。
   */
  noc: string | null

  /**
   * 他自己说的职业名;没说就 null。
   */
  occText: string | null

  /**
   * 他提过的省份,两位码;没提就空数组。
   */
  provs: string[]

  /**
   * 工作经验月数;没说就 null。
   */
  expMonths: number | null

  /**
   * 现在的身份;没说就 null。
   */
  status: string | null
}

/**
 * 跑完一趟的产出。
 */
export type RunOut = {
  /**
   * 过完出口闸的答复。
   */
  answer: string

  /**
   * 这一趟攒下的事实,`cited` 已经标好。
   */
  facts: Fact[]

  /**
   * 采信下来的职业码。
   */
  noc: string | null

  /**
   * 答复是不是降级来的(出口闸两次没过 → 直接给事实清单)。
   */
  degraded: boolean
}

// =========================================================================
// 4. 出口闸
// =========================================================================

/**
 * 一道闸的判定结果。
 */
export type GateHit = {
  /**
   * 哪一道闸。日志按它具名 —— 「撞了」看得见,「撞的是谁」也要看得见。
   */
  gate: string

  /**
   * 撞到的具体内容,给重试时当黑名单。
   */
  hits: string[]
}

// =========================================================================
// 5. 门槛条文
// =========================================================================

/**
 * 一个省的门槛判定。
 */
export type ThresholdsRow = {
  /**
   * 两位省码。
   */
  prov: string

  /**
   * 这个省的信息状态。**一条门槛行都没有 = 本站没收录**,不是「官方没有门槛」。
   */
  availability: Availability

  /**
   * 逐条判定(语言 / 收入 / 经验 / 雇主侧),顺序由 `lib/rules` 定死,不随库里行序漂。
   */
  results: RuleResult[]
}

/**
 * 门槛条文的查询结果。
 */
export type ThresholdsResult = {
  /**
   * 查的哪个职业码。
   */
  noc: string

  /**
   * 按它挑的行。TEER 不知道时,分 TEER 的条款一条都挑不出来 —— 那是实话,不是缺陷。
   */
  teer: number | null

  /**
   * 各省一行。
   */
  rows: ThresholdsRow[]
}

/**
 * 检索候选查询(`SQL.NOC_LIST_WITH_TITLES`)的一行原始列。
 *
 * 🔴 行形状的通则(2026-08-21 Frank 拍板「query 该返回处理完默认值的 type 对象」):
 * **每条 SQL 一个行形状 + 一个映射函数**,收窄与默认值只在映射函数里做一次,
 * 调用处拿到的就是干净对象。默认值逐格判 —— 脏字符串收成空串可以,
 * **官方可空的数值必须保 null**(隐私抑制值、没公布的分数,折成 0 就是替官方编数)。
 * 列全声明成可空,因为库里就可空;`Db.query` 本身不加泛型 —— TS 类型运行时不存在,
 * 编解码只能靠映射函数这种真代码。
 */
export type NocSearchRow = {
  /**
   * 五位职业码。
   */
  noc: string | null

  /**
   * 职业名。
   */
  title: string | null

  /**
   * 在招岗位数(排序与噪音过滤按它)。
   */
  n: number | string | null
}

/**
 * 各省在招数查询(`SQL.PROV_OPEN_BY_PROV`)的一行原始列。
 */
export type ProvOpenRow = {
  /**
   * 两位省码。
   */
  province: string | null

  /**
   * 在招总数。
   */
  open: number | string | null

  /**
   * 其中带省提名通道标记的。
   */
  named: number | string | null
}

/**
 * 职业名与 TEER 查询(`SQL.NOC_TITLE_TEER`)的一行原始列。
 * 三处消费(lookupJobs / nocOf / boxFor)共用同一个映射,口径不再各写各的。
 */
export type TitleTeerRow = {
  /**
   * 职业名。
   */
  title: string | null

  /**
   * TEER。**库里没有就是 null,不猜**(分 TEER 的条款那时一条都挑不出来,那是实话)。
   */
  teer: number | string | null
}

/**
 * 清单收录查询(`SQL.PNP_OCCUPATIONS_FLAT`)的一行原始列。
 */
export type OccFlatRow = {
  /**
   * 两位省码。
   */
  province: string | null

  /**
   * 五位职业码。
   */
  noc: string | null

  /**
   * 官方通道名。
   */
  stream: string | null

  /**
   * 本站短名(通道名缺失时的兜底显示)。
   */
  label: string | null

  /**
   * 收录类型;`ineligible` = 明确排除。
   */
  type: string | null

  /**
   * 出处页。
   */
  url: string | null

  /**
   * 本站抓取日。
   */
  fetched: string | null
}

/**
 * 抽选记录查询(`SQL.PNP_DRAWS_BY_PROV`)的一行原始列。
 */
export type DrawDbRow = {
  /**
   * 两位省码;联邦是 `FED`。
   */
  province: string | null

  /**
   * 抽选日期(库里带时间尾巴,映射时截到十位)。
   */
  draw_date: string | null

  /**
   * 官方轮次名。
   */
  stream: string | null

  /**
   * 分制名。
   */
  scale: string | null

  /**
   * 分数线。**官方没公布就是 null,不折 0。**
   */
  score: number | string | null

  /**
   * 邀请人数。**官方没公布就是 null,不折 0。**
   */
  invitations: number | string | null

  /**
   * 出处页。
   */
  url: string | null

  /**
   * 本站抓取日。
   */
  fetched: string | null
}

/**
 * 运营统计查询(`SQL.PNP_OPS_METRICS`)的一行原始列。
 */
export type OpsDbRow = {
  /**
   * 指标名(ETL 词表)。
   */
  metric: string | null

  /**
   * 适用范围。
   */
  scope: string | null

  /**
   * 官方原文。
   */
  label: string | null

  /**
   * 数值。**官方的隐私抑制值与纯文本游标就是 null,不折 0** —— 原文在 value_text。
   */
  value: number | string | null

  /**
   * value 为 null 时的官方原文。
   */
  value_text: string | null

  /**
   * 官方发布的单位,不换算。
   */
  unit: string | null

  /**
   * 官方口径日。
   */
  as_of: string | null

  /**
   * 统计期。
   */
  period: string | null

  /**
   * 出处页。
   */
  url: string | null

  /**
   * 本站抓取日。
   */
  fetched: string | null
}

/**
 * EE 类别查询(`SQL.EE_CATEGORIES_BY_NOC`)的一行原始列。
 */
export type EeDbRow = {
  /**
   * 类别键。
   */
  category: string | null

  /**
   * 类别官方名。
   */
  label: string | null

  /**
   * 该类别最近一轮的最低 CRS。**本站无记录就是 null,不折 0。**
   */
  draw_crs: number | string | null

  /**
   * 那一轮的日期。
   */
  draw_date: string | null

  /**
   * 那一轮邀请人数。**没有就是 null。**
   */
  draw_size: number | string | null

  /**
   * 出处页。
   */
  url: string | null

  /**
   * 本站抓取日。
   */
  fetched: string | null
}

/**
 * 联邦规则查询(`SQL.PERMIT_RULES`)的一行原始列。
 */
export type PermitDbRow = {
  /**
   * 项目名。
   */
  program: string | null

  /**
   * 官方分档。
   */
  stream: string | null

  /**
   * 因素名。
   */
  factor: string | null

  /**
   * 比较符;`rule` = 是条规则不是道门槛。
   */
  op: string | null

  /**
   * 阈值。**`rule` 行与没有绝对数的行就是 null,不折 0。**
   */
  value: number | string | null

  /**
   * 官方原句(quote-anchored)。
   */
  value_text: string | null

  /**
   * 单位。
   */
  unit: string | null

  /**
   * 口径速记。
   */
  basis: string | null

  /**
   * 条目名。
   */
  label: string | null

  /**
   * 条文页。
   */
  url: string | null

  /**
   * 所属页面(url 缺失时的出处兜底)。
   */
  page_url: string | null

  /**
   * 本站抓取日。
   */
  fetched: string | null
}

/**
 * 计分表查询(`SQL.EE_POINTS_GRID`)的一行原始列。
 */
export type PointsDbRow = {
  /**
   * 哪套分。
   */
  grid: string | null

  /**
   * 节号。
   */
  section: string | null

  /**
   * 节名。
   */
  section_label: string | null

  /**
   * summary 还是 detail。
   */
  kind: string | null

  /**
   * 表头。
   */
  heading: string | null

  /**
   * 因素名。
   */
  factor: string | null

  /**
   * 档位描述。
   */
  criterion: string | null

  /**
   * 列名。
   */
  column_label: string | null

  /**
   * 这一档的分。**官方写 n/a 就是 null,原文在 points_text,不折 0。**
   */
  points: number | string | null

  /**
   * points 为 null 时的官方原文。
   */
  points_text: string | null

  /**
   * 出处页。
   */
  url: string | null

  /**
   * 本站抓取日。
   */
  fetched: string | null
}

/**
 * 库里一行门槛条文的原始形状(`SQL.PNP_REQUIREMENTS_ALL` 的列)。
 *
 * 🔴 **每一列都写出来,不用 `Record<string, unknown>`** —— 那等于把「这张表有哪些列」
 * 藏进运行时,列名改了没人提醒。列全是可空的,因为它们在库里就可空。
 */
export type ReqRow = {
  /**
   * 两位省码;联邦规则那批是 `FED`。
   */
  province: string | null

  /**
   * 项目名。
   */
  program: string | null

  /**
   * 通道名。
   */
  stream: string | null

  /**
   * 这条要求管的是申请人还是雇主。
   */
  subject: string | null

  /**
   * 因素:language / income / experience / empYears / empStaff …
   */
  factor: string | null

  /**
   * 比较符;`none` = 官方明说这档不作要求。
   */
  op: string | null

  /**
   * 阈值。
   */
  value: number | string | null

  /**
   * 官方给的阈值原文(有些档没有数,只有一句话)。
   */
  value_text: string | null

  /**
   * 单位。
   */
  unit: string | null

  /**
   * 适用的 TEER,逗号分隔;空 = 不分 TEER。
   */
  applies_teer: string | null

  /**
   * 适用的 NOC 前缀白名单;空 = 不分职业。
   */
  applies_noc: string | null

  /**
   * 排除的 NOC 前缀。
   */
  excludes_noc: string | null

  /**
   * 适用地区(官方枚举的行政区);空 = 全省。
   */
  applies_area: string | null

  /**
   * 非地域的适用条件。与地区分开存,免得按区域挑行时挑到不该挑的。
   */
  applies_condition: string | null

  /**
   * 家庭人数,最低收入表专用。
   */
  applies_family_size: number | string | null

  /**
   * 阈值的口径(不是绝对数时说清按什么算)。
   */
  basis: string | null

  /**
   * 官方原文。
   */
  label: string | null

  /**
   * 官方节号。
   */
  section: string | null

  /**
   * 生效日期。
   */
  effective: string | null

  /**
   * 条文所在页。
   */
  url: string | null

  /**
   * 所属页面。
   */
  page_url: string | null

  /**
   * 我们抓到它的日期。
   */
  fetched: string | null
}

/**
 * `take` 的入参。
 */
export type TakeIn = {
  /**
   * 这一趟的收件箱。
   */
  box: Inbox

  /**
   * 这一把工具产出的事实。
   */
  facts: Fact[]
}

/**
 * `makeTools` 的入参。
 */
export type MakeToolsIn = {
  /**
   * 跑这一趟要的东西。
   */
  run: RunIn

  /**
   * 这一趟的收件箱。
   */
  box: Inbox
}

/**
 * `draftOnce` 的入参。
 */
export type DraftOnceIn = {
  /**
   * 跑这一趟要的东西。
   */
  run: RunIn

  /**
   * 这一趟的收件箱。
   */
  box: Inbox

  /**
   * 重试时追加给模型的那段话(点名上一稿撞了什么);第一稿是空串。
   */
  extra: string
}

// =========================================================================
// 6. 各函数的入参(宪法:一个函数一个参数,入参与返回值都用自己的 type)
// =========================================================================

/**
 * `searchOccupations` 的入参。
 */
export type SearchOccupationsIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 模型拼的检索词,已经截过长。
   */
  query: string
}

/**
 * 只要「库 + 职业码」的那几个取数函数共用的入参。
 */
export type NocQueryIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 五位职业码,已经过采信。
   */
  noc: string
}

/**
 * `lookupThresholds` 的入参。
 */
export type LookupThresholdsIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 五位职业码,已经过采信。
   */
  noc: string

  /**
   * 这个职业的 TEER。**不知道就传 null** —— 分 TEER 的条款那时一条都挑不出来,那是实话不是缺陷。
   */
  teer: number | null

  /**
   * 要看哪几个省;空数组 = 全部省。
   */
  provs: string[]

  /**
   * 用户说过的工作经验月数,没说就是 null。
   */
  expMonths: number | null
}

/**
 * `fact` 的入参。
 */
export type FactIn = {
  /**
   * 哪把工具产的。
   */
  tool: string

  /**
   * 给模型看的英文说明。
   */
  label: string

  /**
   * 可以见客的官方原文。
   */
  quote: string

  /**
   * 数值,没有就是 null。
   */
  value: number | null

  /**
   * 数值的展示形态。
   */
  valueText: string

  /**
   * 单位。
   */
  unit: string

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * `statusFact` 的入参。
 */
export type StatusFactIn = {
  /**
   * 哪把工具产的。
   */
  tool: string

  /**
   * 给模型看的英文说明。
   */
  label: string

  /**
   * 可以见客的官方原文。
   */
  quote: string

  /**
   * 四态里的哪一种。
   */
  availability: Availability

  /**
   * 出处。
   */
  evidence: Evidence
}

/**
 * `allowedNumbers` 与 `findUngroundedNumbers` 的入参。
 */
export type NumberCheckIn = {
  /**
   * 待查的答复。`allowedNumbers` 用不上它,但两个函数共用一个形状省得两处对不上。
   */
  answer: string

  /**
   * 这一趟的事实。
   */
  facts: Fact[]

  /**
   * 用户自己写过的话 —— 他写的数字算有出处。
   */
  echo: string

  /**
   * 我们自己给过模型的码(职业码、TEER、候选码)。它们有出处,不是模型编的。
   */
  codes: string[]
}

/**
 * `findEnglishUnits` 与 `clampAnswer` 的入参。
 */
export type AnswerLangIn = {
  /**
   * 待查/待截的答复。
   */
  answer: string

  /**
   * 回复语种。
   */
  lang: Lang
}

/**
 * `runGates` 的入参。
 */
export type RunGatesIn = {
  /**
   * 待查的答复。
   */
  answer: string

  /**
   * 这一趟的事实。
   */
  facts: Fact[]

  /**
   * 用户自己写过的话。
   */
  echo: string

  /**
   * 回复语种。
   */
  lang: Lang

  /**
   * 我们自己给过模型的码。
   */
  codes: string[]
}

/**
 * `citeFacts` 的入参。
 */
export type CiteFactsIn = {
  /**
   * 已经定稿的答复。
   */
  answer: string

  /**
   * 这一趟的事实。
   */
  facts: Fact[]
}

/**
 * `onEvent` 的入参:pi 的事件。
 *
 * 只声明我们真的读的那两格 —— pi 的事件是个大联合(10 种),
 * 整个搬进来就等于把库的形状焊进本域,库一升级签名就红。
 */
export type OnEventIn = {
  /**
   * 事件种类。我们只认 `message_update`。
   */
  type: string

  /**
   * 那一刻的助手消息(累积形态),只有部分事件带它。
   */
  // eslint-disable-next-line local/no-optional -- pi 的事件形状:缺席字段由库定,不是我们的契约
  message?: AgentMessage
}

/**
 * `makeTools` 的返回:交给模型的工具表。
 *
 * 每把工具的参数 schema 各不相同,所以这里是个联合数组,不是同一个 `Tool<P>`。
 */
export type MakeToolsOut = (
  | Tool<typeof SEARCH_PARAMS>
  | Tool<typeof NOC_PARAMS>
  | Tool<typeof NOC_PROVS_PARAMS>
  | Tool<typeof PROV_PARAMS>
  | Tool<typeof PERMIT_PARAMS>
  | Tool<typeof CRS_PARAMS>
  | Tool<typeof VERDICT_PARAMS>
  | Tool<typeof CLAIMS_PARAMS>
)[]

// =========================================================================
// 严格签名:每个函数的入参与返回都要有自己的名字(2026-08-20 Frank 拍板)
// =========================================================================

/**
 * `jobsFacts` 的返回。
 */
export type JobsFactsOut = Fact[]

/**
 * `coverageFacts` 的返回。
 */
export type CoverageFactsOut = Fact[]

/**
 * `thresholdsFacts` 的返回。
 */
export type ThresholdsFactsOut = Fact[]

/**
 * `findUngroundedNumbers` 的返回。
 */
export type FindUngroundedNumbersOut = string[]

/**
 * `findInternalWords` 的返回。
 */
export type FindInternalWordsOut = string[]

/**
 * `findEnglishUnits` 的返回。
 */
export type FindEnglishUnitsOut = string[]

/**
 * `findRawMarkup` 的返回。
 */
export type FindRawMarkupOut = string[]

/**
 * `runGates` 的返回。
 */
export type RunGatesOut = GateHit[]

/**
 * `factSheet` 的入参。
 */
export type FactSheetIn = Fact[]

/**
 * `codesOf` 的返回。
 */
export type CodesOfOut = string[]

/**
 * `citeFacts` 的返回。
 */
export type CiteFactsOut = Fact[]

/**
 * `isUserTurn` 的入参。
 */
export type IsUserTurnIn = RunIn['history'][number]

/**
 * `contentOf` 的入参。
 */
export type ContentOfIn = RunIn['history'][number]

/**
 * `retryNote` 的入参。
 */
export type RetryNoteIn = GateHit[]

// =========================================================================
// 严格签名:每个函数的入参与返回都要有自己的名字(2026-08-20 Frank 拍板)
// =========================================================================

/**
 * `model` 的返回。
 */
export type ModelOut = Model<'openai-completions'>

/**
 * `searchOccupations` 的返回。
 */
export type SearchOccupationsOut = Promise<Candidate[]>

/**
 * `lookupJobs` 的返回。
 */
export type LookupJobsOut = Promise<JobsResult>

/**
 * `lookupCoverage` 的返回。
 */
export type LookupCoverageOut = Promise<CoverageResult>

/**
 * `lookupThresholds` 的返回。
 */
export type LookupThresholdsOut = Promise<ThresholdsResult>

/**
 * `allowedNumbers` 的返回。
 */
export type AllowedNumbersOut = Set<string>

/**
 * `nocOf` 的返回。
 */
export type NocOfOut = Promise<string | null>

/**
 * `execSearch` 的入参。
 */
export type ExecSearchIn = Static<typeof SEARCH_PARAMS>

/**
 * `execSearch` 的返回。
 */
export type ExecSearchOut = Promise<Reply>

/**
 * `execJobs` 的入参。
 */
export type ExecJobsIn = Static<typeof NOC_PARAMS>

/**
 * `execJobs` 的返回。
 */
export type ExecJobsOut = Promise<Reply>

/**
 * `execCoverage` 的入参。
 */
export type ExecCoverageIn = Static<typeof NOC_PARAMS>

/**
 * `execCoverage` 的返回。
 */
export type ExecCoverageOut = Promise<Reply>

/**
 * `execThresholds` 的入参。
 */
export type ExecThresholdsIn = Static<typeof NOC_PROVS_PARAMS>

/**
 * `execThresholds` 的返回。
 */
export type ExecThresholdsOut = Promise<Reply>

/**
 * 一条检索命中(映射完默认值的干净行):候选 + 它的在招数(噪音过滤按 n)。
 */
export type NocHit = {
  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  title: string

  /**
   * 在招岗位数。
   */
  n: number
}

/**
 * 职业名与 TEER(映射完默认值的干净行)。
 */
export type TitleTeer = {
  /**
   * 职业名;库里没有就空串。
   */
  title: string

  /**
   * TEER;库里没有就 null,不猜。
   */
  teer: number | null
}

/**
 * 一条清单收录记录(映射完默认值的干净行)。
 */
export type OccFlat = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 通道名(官方名缺失时落到本站短名)。
   */
  stream: string

  /**
   * 收录类型;`ineligible` = 明确排除。
   */
  type: string

  /**
   * 出处页。
   */
  url: string

  /**
   * 本站抓取日。
   */
  fetched: string
}

/**
 * `toTitleTeer` 的入参:整个结果集。零行由映射显式落空 —— 原先收 `TitleTeerRow | undefined`
 * 让数组越界的 undefined 流进契约,2026-08-21 Frank 抓包后改收数组,undefined 不再出现。
 */
export type ToTitleTeerIn = TitleTeerRow[]

/**
 * `seg` 的入参:一段可选文案。
 */
export type SegIn = {
  /**
   * 出不出这一段。条件由调用方**显式写**(`x !== ''` / `x !== null`),不靠隐式真值。
   */
  when: boolean

  /**
   * 出的话是什么。**只许纯拼接**:文本里不能有「条件不成立就会炸」的取值
   * (`.join`、按索引取)—— 那种去写 if,`seg` 是拼字的不是守门的。
   */
  text: string
}

/**
 * `orNone` 与 `orNone2` 的入参:官方可空的那一格。
 */
export type OrNoneIn = string | number | null

/**
 * `orNone2` 的入参。
 */
export type OrNone2In = {
  /**
   * 那一格的值。
   */
  v: OrNoneIn

  /**
   * 占位词。
   */
  fallback: string
}

/**
 * `orNone` 与 `orNone2` 的返回:值本身或占位词。
 */
export type OrNoneOut = string | number

/**
 * `subjectOf` 的入参:库里的 subject 列。
 */
export type SubjectOfIn = string | null

/**
 * `subjectOf` 的返回:两个合法值之一。
 */
export type SubjectOfOut = 'applicant' | 'employer'

/**
 * `statusWordOf` 的返回:引擎词表里的词;不在表里就 null。
 */
export type StatusWordOfOut = string | null

/**
 * `provOf` 的返回:白名单里的省码(或 FED);认不出就 null(显式「没有」,不用空串当暗号)。
 */
export type ProvOfOut = string | null

/**
 * `lookupDraws` 的入参。
 */
export type LookupDrawsIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 两位省码或 `FED`,已过白名单。
   */
  prov: string
}

/**
 * `lookupDraws` 的返回。
 */
export type LookupDrawsOut = Promise<DrawsResult>

/**
 * `drawsFacts` 的返回。
 */
export type DrawsFactsOut = Fact[]

/**
 * `execDraws` 的入参。
 */
export type ExecDrawsIn = Static<typeof PROV_PARAMS>

/**
 * `execDraws` 的返回。
 */
export type ExecDrawsOut = Promise<Reply>

/**
 * `lookupOps` 的入参。
 */
export type LookupOpsIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 两位省码,已过白名单。
   */
  prov: string
}

/**
 * `lookupOps` 的返回。
 */
export type LookupOpsOut = Promise<OpsResult>

/**
 * `opsFacts` 的返回。
 */
export type OpsFactsOut = Fact[]

/**
 * `execOps` 的入参。
 */
export type ExecOpsIn = Static<typeof PROV_PARAMS>

/**
 * `execOps` 的返回。
 */
export type ExecOpsOut = Promise<Reply>

/**
 * `lookupEe` 的返回。
 */
export type LookupEeOut = Promise<EeResult>

/**
 * `eeFacts` 的返回。
 */
export type EeFactsOut = Fact[]

/**
 * `execEe` 的入参。
 */
export type ExecEeIn = Static<typeof NOC_PARAMS>

/**
 * `execEe` 的返回。
 */
export type ExecEeOut = Promise<Reply>

/**
 * `lookupPermit` 的入参。
 */
export type LookupPermitIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 项目名,schema 已收窄到四个联邦项目。
   */
  program: string
}

/**
 * `lookupPermit` 的返回。
 */
export type LookupPermitOut = Promise<PermitResult>

/**
 * `permitFacts` 的返回。
 */
export type PermitFactsOut = Fact[]

/**
 * `execPermit` 的入参。
 */
export type ExecPermitIn = Static<typeof PERMIT_PARAMS>

/**
 * `execPermit` 的返回。
 */
export type ExecPermitOut = Promise<Reply>

/**
 * `lookupPoints` 的入参。
 */
export type LookupPointsIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 哪套分,schema 已收窄到 CRS / FSW67。
   */
  grid: string

  /**
   * 只看某一节;空串 = 不筛节(CRS 那时只取 summary 行)。
   */
  section: string
}

/**
 * `lookupPoints` 的返回。
 */
export type LookupPointsOut = Promise<PointsResult>

/**
 * `pointsFacts` 的返回。
 */
export type PointsFactsOut = Fact[]

/**
 * `execPoints` 的入参。
 */
export type ExecPointsIn = Static<typeof CRS_PARAMS>

/**
 * `execPoints` 的返回。
 */
export type ExecPointsOut = Promise<Reply>

/**
 * `verdictProfileOf` 的入参。
 */
export type VerdictProfileOfIn = {
  /**
   * 这一趟的收件箱 —— 职业码与 TEER 从这儿取(已过采信)。
   */
  box: Inbox

  /**
   * 调用方给的档案。**只搬真有的槽,缺的原样 null** —— 缺一个槽 ≠ 有一个默认值。
   */
  profile: Profile
}

/**
 * `verdictFacts` 的入参:裁决引擎排好序的通道判定。
 */
export type VerdictFactsIn = PathwayVerdict[]

/**
 * `verdictFacts` 的返回。
 */
export type VerdictFactsOut = Fact[]

/**
 * `execVerdict` 的入参(空对象 —— 这把工具不收参数,档案从收件箱与档案槽闭包取)。
 */
export type ExecVerdictIn = Static<typeof VERDICT_PARAMS>

/**
 * `execVerdict` 的返回。
 */
export type ExecVerdictOut = Promise<Reply>

/**
 * `execClaims` 的入参。
 */
export type ExecClaimsIn = Static<typeof CLAIMS_PARAMS>

/**
 * `execClaims` 的返回。
 */
export type ExecClaimsOut = Promise<Reply>

/**
 * `draftOnce` 的返回。
 */
export type DraftOnceOut = Promise<string>

/**
 * `lastDraftOf` 的入参。
 */
export type LastDraftOfIn = {
  /**
   * 循环跑完后的整串消息。
   */
  messages: AgentMessage[]

  /**
   * 这一趟是不是被超时掐断的 —— pi 掐断时正常返回,只能靠这一格认出来。
   */
  aborted: boolean
}

/**
 * `boxFor` 的入参。
 */
export type BoxForIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 调用方给的档案 —— 只读 `noc` 那一格。
   */
  profile: Profile
}

/**
 * `boxFor` 的返回:这一趟的收件箱。
 */
export type BoxForOut = Promise<Inbox>

/**
 * `consult` 的返回。
 */
export type ConsultOut = Promise<RunOut>

/**
 * `findRestatedOpening` 的入参。
 */
export type FindRestatedOpeningIn = {
  /**
   * 模型写出来的整段答复。
   */
  answer: string
}

/**
 * `findRestatedOpening` 的返回:撞到的毛病;第一句没问题则空。
 */
export type FindRestatedOpeningOut = string[]

/**
 * `firstLineOf` 的入参。
 */
export type FirstLineOfIn = {
  /**
   * 整段答复。
   */
  answer: string
}

/**
 * `hardHits` 的入参。
 */
export type HardHitsIn = {
  /**
   * 这一轮撞到的全部闸。
   */
  fired: GateHit[]
}

/**
 * `hardHits` 的返回:其中拦「假话」的那几道。
 */
export type HardHitsOut = GateHit[]

/**
 * `makeToolGates` 的入参。
 */
export type MakeToolGatesIn = {
  /**
   * 这一趟的收件箱 —— **每请求一个**,闭包在挂点里。
   *
   * 🔴 它**不许**挪进 `variables.ts`:那儿装的是进程级单件,两个人同时提问会串号,
   * 而出口闸只查「这个数在不在 facts 里」,查不出「这个 facts 是不是这个人的」。
   */
  box: Inbox
}

/**
 * `makeToolGates` 的返回:pi 要的那几个挂点。
 */
export type MakeToolGatesOut = {
  /**
   * 工具调用发出之前过一道。
   */
  beforeToolCall: (ctx: BeforeToolCallIn) => BeforeToolCallOut
}

/**
 * `beforeToolCall` 的入参 —— **形状由 pi 定死**,本域只声明真读的那两格。
 */
export type BeforeToolCallIn = {
  /**
   * 校验过的工具入参。
   *
   * 🔴 这里的 `unknown` 是**信任边界上收进来的**,不是往下传的:pi 不认识我们的 schema,
   * 它就是这么交过来的,而**逆变让我们没法要求更窄**(声明成 `ToolArgs` 时,函数根本装不进
   * pi 的 config —— 2026-08-20 tsc 当场拦下)。挂点在第一行就把它收窄成 `ToolArgs`,
   * 真不是这个形状,读到的是 undefined,照样放行。
   */
  // eslint-disable-next-line local/no-unknown-type -- pi 定死交过来就是 unknown;逆变不许我们要求更窄,收窄在挂点第一行
  args: unknown
}

/**
 * 拦下一次工具调用时给 pi 的回执。
 */
export type ToolBlock = {
  /**
   * 拦不拦。给 true 这次调用就不发生。
   */
  block: boolean

  /**
   * 为什么拦 —— **回给模型看的**,要说清该怎么办。
   */
  reason: string
}

/**
 * `beforeToolCall` 的返回:要拦就给回执;放行给 undefined。
 */
// eslint-disable-next-line local/no-undefined-type -- pi 的钩子契约:放行 = undefined,库定的不是我们的
export type BeforeToolCallOut = Promise<ToolBlock | undefined>

/**
 * 工具入参里本域真正要查的那一格。
 */
export type ToolArgs = {
  /**
   * 模型填的职业码;这把工具不带码时没有这一格。
   */
  // eslint-disable-next-line local/no-optional -- 模型经 pi 交来的工具入参:带不带码由那把工具的 schema 定
  noc?: string
}

/**
 * `stepOccLineOf` 的入参(2026-08-22 轨迹文案按域迁回时立)。
 */
export type StepOccLineIn = {
  /**
   * 界面语言(run.lang)。
   */
  lang: 'zh' | 'en' | 'ko'

  /**
   * 采信出的职业名。
   */
  occ: string
}
