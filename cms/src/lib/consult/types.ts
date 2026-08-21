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
import type { Model, Static } from '@earendil-works/pi-ai'
import type { Requirement } from '../gauge'
import type { TSchema } from '@earendil-works/pi-ai'
import type { Db } from '../db/database'
import type { RuleResult } from '../gauge'
import type { Lang } from '../i18n'
import type { NOC_PARAMS, NOC_PROVS_PARAMS, SEARCH_PARAMS } from './schemas'

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
   * 没有值时,四态里的哪一种。有值时不填。
   */
  availability?: Availability

  /**
   * 答复真的用到了这条吗(答复落地后回读打的标)。前端出处区只列 true 的。
   */
  cited?: boolean
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
   * 工具轨迹回调,不传就不发。
   */
  onStep?: (text: string) => void

  /**
   * 正文增量回调,不传就整段落地才给。
   */
  onDelta?: (chunk: string) => void
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
 * 用户自己说过的档案。**每一项都可选且默认不存在** ——
 * 缺一个 ≠ 有一个默认值(「按单身算」会直接换一张 CRS 分表)。
 */
export type Profile = {
  /**
   * 五位职业码。
   */
  noc?: string | null

  /**
   * 他自己说的职业名。
   */
  occText?: string | null

  /**
   * 他提过的省份,两位码。
   */
  provs?: string[]

  /**
   * 工作经验月数。
   */
  expMonths?: number | null

  /**
   * 现在的身份。
   */
  status?: string | null
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
  message?: AgentMessage
}

/**
 * `makeTools` 的返回:交给模型的工具表。
 *
 * 每把工具的参数 schema 各不相同,所以这里是个联合数组,不是同一个 `Tool<P>`。
 */
export type MakeToolsOut = (Tool<typeof SEARCH_PARAMS> | Tool<typeof NOC_PARAMS> | Tool<typeof NOC_PROVS_PARAMS>)[]

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
 * `byOpenDesc` 的返回。
 */
export type ByOpenDescOut = number

/**
 * `blankCoverage` 的入参。
 */
export type BlankCoverageIn = string

/**
 * `tierText` 的返回。
 */
export type TierTextOut = string

/**
 * `normNum` 的入参。
 */
export type NormNumIn = string

/**
 * `normNum` 的返回。
 */
export type NormNumOut = string

/**
 * `blankIfNumbered` 的入参。
 */
export type BlankIfNumberedIn = string

/**
 * `blankIfNumbered` 的返回。
 */
export type BlankIfNumberedOut = string

/**
 * `findInternalWords` 的入参。
 */
export type FindInternalWordsIn = string

/**
 * `findRawMarkup` 的入参。
 */
export type FindRawMarkupIn = string

/**
 * `clampAnswer` 的返回。
 */
export type ClampAnswerOut = string

/**
 * `factSheet` 的返回。
 */
export type FactSheetOut = string

/**
 * `say` 的入参。
 */
export type SayIn = string

/**
 * `step` 的入参。
 */
export type StepIn = string

/**
 * `step` 的返回。
 */
export type StepOut = void

/**
 * `nocOf` 的入参。
 */
export type NocOfIn = string

/**
 * `systemOf` 的返回。
 */
export type SystemOfOut = string

/**
 * `textOf` 的返回。
 */
export type TextOfOut = string

/**
 * `onTimeout` 的返回。
 */
export type OnTimeoutOut = void

/**
 * `onEvent` 的返回。
 */
export type OnEventOut = void

/**
 * `isUserTurn` 的返回。
 */
export type IsUserTurnOut = boolean

/**
 * `contentOf` 的返回。
 */
export type ContentOfOut = string

/**
 * `gateLabel` 的返回。
 */
export type GateLabelOut = string

/**
 * `retryNote` 的返回。
 */
export type RetryNoteOut = string

/**
 * `model` 的返回。
 */
export type ModelOut = Model<'openai-completions'>

/**
 * `searchOccupations` 的返回。
 */
export type SearchOccupationsOut = Promise<Candidate[]>

/**
 * `lookupJobs` 的入参。
 */
export type LookupJobsIn = NocQueryIn

/**
 * `lookupJobs` 的返回。
 */
export type LookupJobsOut = Promise<JobsResult>

/**
 * `byOpenDesc` 的入参。
 */
export type ByOpenDescIn = JobsRow

/**
 * `lookupCoverage` 的入参。
 */
export type LookupCoverageIn = NocQueryIn

/**
 * `lookupCoverage` 的返回。
 */
export type LookupCoverageOut = Promise<CoverageResult>

/**
 * `blankCoverage` 的返回。
 */
export type BlankCoverageOut = CoverageRow

/**
 * `toRequirement` 的入参。
 */
export type ToRequirementIn = ReqRow

/**
 * `toRequirement` 的返回。
 */
export type ToRequirementOut = Requirement

/**
 * `lookupThresholds` 的返回。
 */
export type LookupThresholdsOut = Promise<ThresholdsResult>

/**
 * `fact` 的返回。
 */
export type FactOut = Fact

/**
 * `statusFact` 的返回。
 */
export type StatusFactOut = Fact

/**
 * `jobsFacts` 的入参。
 */
export type JobsFactsIn = JobsResult

/**
 * `coverageFacts` 的入参。
 */
export type CoverageFactsIn = CoverageResult

/**
 * `tierText` 的入参。
 */
export type TierTextIn = RuleResult

/**
 * `thresholdsFacts` 的入参。
 */
export type ThresholdsFactsIn = ThresholdsResult

/**
 * `allowedNumbers` 的入参。
 */
export type AllowedNumbersIn = NumberCheckIn

/**
 * `allowedNumbers` 的返回。
 */
export type AllowedNumbersOut = Set<string>

/**
 * `codesOf` 的入参。
 */
export type CodesOfIn = Inbox

/**
 * `take` 的返回。
 */
export type TakeOut = Reply

/**
 * `say` 的返回。
 */
export type SayOut = Reply

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
 * `firstPrompt` 的入参。
 */
export type FirstPromptIn = RunIn

/**
 * `firstPrompt` 的返回。
 */
export type FirstPromptOut = AgentMessage

/**
 * `textOf` 的入参。
 */
export type TextOfIn = AgentMessage

/**
 * `draftOnce` 的返回。
 */
export type DraftOnceOut = Promise<string>

/**
 * `consult` 的入参。
 */
export type ConsultIn = RunIn

/**
 * `consult` 的返回。
 */
export type ConsultOut = Promise<RunOut>

/**
 * `gateLabel` 的入参。
 */
export type GateLabelIn = GateHit
